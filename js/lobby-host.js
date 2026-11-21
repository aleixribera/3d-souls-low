'use strict';
// The lobby's session: who is in it, its leader, a Boss Rush run from its start to its end screen, the ability picks
// between fights, and every player's claims checked before the simulation (js/lobby-sim.js) takes them. Transport-free:
// the Node server (server/index.cjs) gives it real sockets, the page alone (js/alone.js) gives it one in-page socket, so
// a run alone is the run online, from the same code. A socket is { readyState, bufferedAmount, send(text), close(code,
// reason) }.
(function (root) {
  const net = typeof module === 'object' && module.exports ? require('./net-protocol.js') : root.ArenaNet;
  const C = net.config, OPEN = 1;   // WebSocket.OPEN

  // Boss Rush's end screen: one title per player, the most notable thing of their run (PLAN.md track B item 4). Each
  // candidate has a weight; the heaviest wins, and two players get the same words only when their numbers tie. Alone,
  // the title is yours.
  const count = n => Number(n).toLocaleString('en-US');
  const clock = s => s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function runTitles(rows, times = [], won = false) {
    const party = rows.length > 1, fights = times.length + (won ? 0 : 1), total = rows.reduce((n, r) => n + r.damage, 0);
    const timed = times.filter(t => Number.isFinite(t.time));
    const fastest = timed.length ? timed.reduce((a, b) => b.time < a.time ? b : a) : null;
    const options = rows.map(r => {
      const list = [], add = (weight, text) => list.push({ weight, text });
      // Revives name the one brought back when it was always the same friend.
      const saved = [...new Set(r.rescued || [])].map(id => rows.find(o => o.id === id)?.name || 'a friend');
      if (r.revives) add(4 + 2 * r.revives, saved.length === 1 ? `Revived ${saved[0]}${r.revives > 1 ? ` ${r.revives} times` : ''}`
        : saved.length === r.revives ? `Revived ${r.revives} friends` : `${r.revives} revives`);
      if (r.parries >= 3) add(0.6 * r.parries, `${r.parries} perfect parries`);
      if (r.finishers >= 2) add(0.8 * r.finishers, `${r.finishers} Finishing Blows`);
      if (fastest && (party ? fastest.killer === r.id : true)) add(fastest.swift ? 3 : 1.5, `Fastest kill: ${clock(fastest.time)}`);
      if (party && r.kills >= 2) add(1.2 * r.kills, `Final blow on ${r.kills} bosses`);
      if (party && total > 0 && r.damage / total >= 1.25 / rows.length) add(1.5 * rows.length * r.damage / total, `Most damage: ${count(r.damage)}`);
      if (!r.deaths && fights >= 2) add(0.5 * fights, 'Never fell');
      add(0, `${count(r.damage)} damage dealt`);
      return list;
    });
    // Greedy over every player's options, heaviest first; a title already given goes to nobody else.
    const titles = new Map(), used = new Set();
    const all = options.flatMap((list, i) => list.map(o => ({ ...o, i }))).sort((a, b) => b.weight - a.weight);
    for (const o of all) if (!titles.has(o.i) && !used.has(o.text)) { titles.set(o.i, o.text); used.add(o.text); }
    return rows.map((r, i) => ({ ...r, title: titles.get(i) || options[i].at(-1).text }));
  }

  // `sim`: a simulation (server/headless.cjs, js/alone.js); `build`: this release's build hash; `board`: the weekly
  // board ({ current(), record(week, run) }); `token(bytes)`: random hex; `uuid()`: a player id; `byteLength(text)`:
  // for the metrics. `firstPick: false`: no free pick before fight 1 (tests that check an exact kit). The clocks
  // (`activityNow`, `loadNow`, `dateNow`) are for tests, and a constant `activityNow` keeps the player alone leading.
  function createLobby(options) {
    const { sim, build, board, capacity, uuid } = options, secret = options.token;   // `token` names a player's credential below
    const byteLength = options.byteLength || (text => text.length);
    const activityNow = options.activityNow || (() => performance.now());
    const loadNow = options.loadNow || (() => performance.now());
    const dateNow = options.dateNow || Date.now;
    // Replays (PLAN.md "replays"): `replays` (server/replays.cjs, the server only) records every Boss Rush run.
    const replays = options.replays || null;
    let recording = null;
    function endRecording(outcome, summary = null) { if (recording) { recording.end(outcome, summary); recording = null; } }
    const replayRoster = r => r.players.map(p => ({ id: p.id, name: p.name, ...(p.bot ? { bot: true } : {}) }));
    // `clients` holds players who said hello (they own a slot); `pending` sockets are still joining.
    const clients = new Map(), pending = new Set(), hellos = new Map();   // address -> { count, at } joins this minute
    const memories = new Map(); // Private browser credentials; never included in roster or pose broadcasts.
    const RESULT_TTL = 10 * 60 * 1000;
    function pendingResults(memory) {
      const now = performance.now();
      return (memory.results || []).filter(r => r.expires > now);
    }
    function retainResult(summary) {
      const participants = new Set(summary.players.filter(p => !p.bot).map(p => p.id));
      const expires = performance.now() + RESULT_TTL;
      for (const memory of memories.values()) if (participants.has(memory.id)) {
        memory.results = [...pendingResults(memory), { summary, expires }].slice(-8);
      }
    }
    const freshPose = p => p.ready && p.pose && performance.now() - p.lastPose < C.stalePlayer * 1000;
    const participating = p => p.hello && p.foreground && (p.ready && p.pose ? freshPose(p) : performance.now() - p.loadingSince < C.loadTimeout);
    function remember(p) {
      if (!p.memory) return;
      Object.assign(p.memory, { name: p.name, epoch: session?.epoch, pose: p.pose, arenaDefeated: !!p.arenaDefeated });
    }
    // A token is only worth keeping once its player actually played (`kept`, set on ready). Join spam
    // therefore evicts other never-played tokens first, never a returning player's identity.
    function forget() {
      const offline = [...memories].filter(([, value]) => !clients.has(value.id));
      const oldest = offline.find(([, value]) => !value.kept) || offline[0];
      if (oldest) memories.delete(oldest[0]);
    }
    function identify(p, memory, token) {
      if (!memory) {
        if (memories.size >= C.rememberedPlayers) forget();
        token = secret(32);
        memory = { id: p.id, name: p.name, kept: false }; memories.set(token, memory);
      } else {
        memories.delete(token); memories.set(token, memory);
        const previous = clients.get(memory.id);
        if (previous && previous !== p) { remember(previous); previous.ws.close(1008, 'You joined from another tab. Rejoin here to take over.'); }
        p.id = memory.id;
        p.name = memory.name;
        if (session && memory.epoch === session.epoch) {
          p.pose = memory.pose; p.arenaDefeated = memory.arenaDefeated;
          if (p.arenaDefeated && p.pose) sim.fall(p.id, p.pose.x, p.pose.y, p.pose.z);   // their ember comes back with them
        }
      }
      pending.delete(p); clients.set(p.id, p);
      p.memory = memory; p.token = token;
    }
    let leader = null, session = null, last = performance.now(), accumulator = 0, sinceSnapshot = 0;
    let arenaWipeFor = 0, bossStarted = false, loadStarted = 0;
    let tallied = false;   // Boss Rush: this fight's win is in the run's tally
    let abilityFor = null;   // Boss Rush, between fights: s since the abilities were offered (null: not offered)
    let abilityPickedAt = -Infinity, abilityAllChosen = false;   // abilityFor at the last pick taken (the pick holds CONFIG.abilities.pickHold s after it), and whether everyone has been told all have chosen
    const abilityRound = new Set();   // the players offered abilities this time (a late arrival is offered once)
    // Boss Rush's free pick before fight 1 (CONFIG.abilities.first): 'due' at a run's first fight until the party has
    // loaded, then 'open' while it is offered (the boss waits), null once taken or for any other fight. Never with
    // createServer({ firstPick: false }) (browser tests about later picks).
    let firstPick = null;
    let tally = null;   // Boss Rush's totals across its fights: { run, startedAt, at (the fight it is in), won, crowned, players: id -> row }
    let lastSignature = null;   // the enemies' states in the last frame sent
    let metricsAt = last, ticks = 0, payloadBytes = 0, tickTimes = [];
    let metrics = { hz: 0, tickMs: 0, bytesPerSecond: 0, websocketBytesPerSecond: 0, bufferedBytes: 0 };
    let rosterAt = -Infinity, rosterTimer = null, lastKick = -Infinity;
    const kicked = new Map();   // player id -> when the leader last removed them
    const roster = () => ({ type: 'roster', leader, capacity, session, players: [...clients.values()].map(p => ({ id: p.id, name: p.name, ready: p.ready, hp: p.pose?.hp ?? null })).concat(sim.botList()) });
    function send(p, data) {
      if (p.ws.readyState !== OPEN) return;
      if (p.ws.bufferedAmount > C.maxBuffered) { p.ws.close(1013, 'Connection too slow. Rejoin the lobby.'); return; }
      const body = JSON.stringify(data); payloadBytes += byteLength(body); p.ws.send(body);
    }
    function broadcast(data) { for (const p of clients.values()) send(p, data); }
    // Every roster is the whole current state, so chatter (ready, names, presence, joins) coalesces to one per
    // `rosterInterval`. Structural changes (start, stop, leadership notices) still send at once.
    function sendRoster(extra = {}) { rosterAt = performance.now(); const r = roster(); recording?.roster(replayRoster(r)); broadcast({ ...r, ...extra }); }
    function queueRoster() {
      if (rosterTimer) return;
      const wait = rosterAt + C.rosterInterval - performance.now();
      if (wait <= 0) { sendRoster(); return; }
      rosterTimer = setTimeout(() => { rosterTimer = null; sendRoster(); }, wait); rosterTimer.unref?.();
    }
    const isActive = (p, now) => p?.hello && p.foreground && (!session || participating(p) || now - p.lastActivity < C.leaderInputGrace) && p.ws.readyState === OPEN
      && Number.isFinite(p.lastActivity) && now - p.lastActivity < C.leaderIdle;
    function refreshLeader(reason = 'idle', now = activityNow()) {
      if (isActive(clients.get(leader), now)) return false;
      const previous = leader;
      leader = [...clients.values()].find(p => isActive(p, now))?.id || null;
      if (previous === leader) return false;
      const next = clients.get(leader);
      const prefix = previous ? reason === 'disconnect' ? 'The leader left. ' : clients.get(previous)?.foreground && (!session || participating(clients.get(previous))) ? 'The leader was inactive for five minutes. ' : 'The leader is away. ' : '';
      sendRoster({ notice: prefix + (next ? `${next.name} is now the leader.` : 'No active leader. Press a key, move the mouse or use your controller to lead.') });
      return true;
    }
    function noteActivity(p) {
      const now = activityNow();
      refreshLeader('idle', now);
      p.lastActivity = now;
      if (!leader) refreshLeader('idle', now);
    }
    const playerFrames = () => [...clients.values()].filter(p => p.foreground && freshPose(p)).map(p => {
      const pose = { ...p.pose };
      for (const key of net.pose.personal) delete pose[key];
      return { ...pose, id: p.id, name: p.name, poseSeq: p.poseSeq };
    }).concat(session ? sim.botFrames() : []);
    function sendFrame(p, frame, players) { if (p.hello && p.ready) send(p, p.encoder.encode({ ...frame, server: metrics }, players)); }
    function updateMetrics(now) {
      if (now - metricsAt < C.metricsInterval) return;
      const span = (now - metricsAt) / 1000, sorted = tickTimes.slice().sort((a, b) => a - b);
      let buffered = 0, written = 0;
      for (const p of clients.values()) {
        buffered = Math.max(buffered, p.ws.bufferedAmount);
        const bytes = p.ws._socket?.bytesWritten || 0; written += Math.max(0, bytes - p.lastWritten); p.lastWritten = bytes;
      }
      metrics = { hz: Math.round(ticks / span), tickMs: Math.round((sorted[Math.floor(sorted.length * 0.95)] || 0) * C.wirePrecision) / C.wirePrecision,
        bytesPerSecond: Math.round(payloadBytes / span), websocketBytesPerSecond: Math.round(written / span), bufferedBytes: buffered };
      metricsAt = now; ticks = 0; payloadBytes = 0; tickTimes = [];
    }
    // Pose age lets contact checks allow for movement since the last 30 Hz pose.
    const syncPlayers = () => {
      const now = performance.now();
      sim.setPlayers([...clients.values()].filter(p => p.foreground && freshPose(p)).map(p => ({ ...p.pose, id: p.id, poseAge: (now - p.lastPose) / 1000 })));
    };
    const error = (p, message) => send(p, { type: 'error', message });
    // A player's active pool (PLAN.md item 7) is locked while a run is on: a change then waits for the run's end (stop).
    function pool(p, list) {
      if (session && sim.hasGear(p.id)) { p.nextPool = list; return; }
      sim.setGear(p.id, list); p.nextPool = undefined;
    }
    // A run's end, or a new run over one (restart, start): the changes kept for it count now.
    const takePools = () => { for (const p of clients.values()) if (p.nextPool !== undefined) { sim.setGear(p.id, p.nextPool); p.nextPool = undefined; } };
    function stop(message, reason = null, extra = {}) {
      let summary = extra.summary;
      if (!summary && tally && reason !== 'error') summary = abandonedRun();
      if (summary) recordWeekly(summary);
      if (summary) retainResult(summary);
      endRecording(summary?.outcome || (reason === 'error' ? 'error' : 'left'), summary);
      session = null; abilityFor = null; abilityRound.clear(); tally = null;
      for (const p of clients.values()) { p.ready = false; p.pose = null; p.encoder.reset(); }
      takePools();
      broadcast({ type: 'stop', message, reason, ...(summary ? { summary } : {}) }); sendRoster();
    }
    // Boss Rush's end of a fight: its damage and falls join the run's totals, and a won fight counts once (a fight of two
    // bosses too: one count, the fight, pass 96), with its bosses and its time against par (CONFIG.swift); under par is a
    // swift kill.
    function tallyFight(won) {
      for (const r of sim.fightTally()) {
        const row = tally.players.get(r.id) || { id: r.id, name: r.name, bot: r.bot, damage: 0, deaths: 0, parries: 0, finishers: 0, revives: 0, rescued: [], kills: 0 };
        row.name = r.name; for (const key of ['damage', 'deaths', 'parries', 'finishers', 'revives']) row[key] += r[key] || 0;
        row.rescued = row.rescued.concat(r.rescued || []);
        tally.players.set(r.id, row);
      }
      if (!won) return;
      const g = session.gauntlet, time = Math.floor(sim.state.fought + 1e-6);   // whole seconds, as the HUD shows them
      tally.won++;
      if (g.crowned) tally.crowned++;
      const killer = sim.fightKiller, row = killer && tally.players.get(killer);
      if (row) row.kills++;
      tally.times.push({ bosses: [g.boss, ...(g.partners || [])], time, par: session.par, swift: time <= session.par, killer: row ? killer : null, ...(g.crowned ? { crowned: true } : {}) });
    }
    // What the end-of-run screen shows: the run's time in whole seconds, the fight it reached (the HUD's and the board's
    // number: the fight it ended in, or the next one when it was left after that fight's win), the fights won, the Crowned
    // ones, and each player's totals, most damage first.
    const runSummary = outcome => ({ outcome, key: tally.key, id: tally.id, name: tally.name, won: tally.won, reached: tally.at + (tallied && outcome !== 'won' ? 1 : 0),
      crowned: tally.crowned, times: tally.times,
      time: Math.round((performance.now() - tally.startedAt) / 1000),
      players: runTitles([...tally.players.values()].map(r => ({ ...r, damage: Math.round(r.damage) })).sort((a, b) => b.damage - a.damage || a.deaths - b.deaths), tally.times, outcome === 'won') });
    // The end of a weekly run goes on this week's board, once, and everyone in the lobby sees the new board. However it
    // ends counts: a wipe, a win, the leader taking everyone to the lobby, a restart or a new run.
    function recordWeekly(summary) {
      const week = tally?.run.week;
      if (!week || tally.recorded || summary.outcome === 'left' && !summary.won) return;   // given up before a win: nothing to show
      tally.recorded = true;
      if (board.record(week, { names: summary.players.filter(r => !r.bot).map(r => r.name), reached: summary.reached, time: summary.time, fights: summary.times }))
        broadcast({ type: 'board', board: board.current() });
    }
    // A Boss Rush run's end: the summary for the end screen, after a weekly run's board has it.
    function endRun(outcome) { const summary = runSummary(outcome); recordWeekly(summary); return summary; }
    function abandonedRun() {
      if (tallied) return runSummary('left');
      // Snapshot the old fight before a replacement starts. A rejected replacement leaves its live tally intact.
      const live = tally;
      tally = { ...live, times: [...live.times], players: new Map([...live.players].map(([id, row]) => [id, { ...row }])) };
      try {
        tallied = !!sim.state.complete;
        tallyFight(tallied);
        return runSummary('left');
      } finally { tally = live; tallied = false; }
    }
    // Online play is Boss Rush only (and its weekly run): one fight of `run` ({ seed, opening[, week] }, sim.calling),
    // `fight` counting from 0. `opening`: the run's start, with its intro card.
    function start(run, fight = 0, opening = false) {
      // Ids are resolved and validated before the shared simulation changes; a refused request keeps the run.
      const gauntlet = sim.calling(run, fight);
      const abandoned = fight === 0 && tally ? abandonedRun() : null;
      if (fight === 0) takePools();
      // A later fight of the run keeps the run's abilities; a new run starts without.
      try { session = sim.start('arena', gauntlet.boss, gauntlet.partners, fight > 0); } catch (e) {
        // A failure after validation leaves the simulation half-built: end the run properly for everyone.
        if (!e.rejected && session) stop('The session stopped after a server error. The leader can start another run.', 'error');
        throw e;
      }
      if (abandoned) {
        recordWeekly(abandoned);
        retainResult(abandoned);
        endRecording('left', abandoned);
        for (const p of clients.values()) if (abandoned.players.some(row => row.id === p.id))
          send(p, { type: 'runResult', summary: abandoned });
      }
      for (const p of clients.values()) if (p.hello) sim.registerPlayer(p.id, p.name);
      session.gauntlet = gauntlet;
      session.abilities = sim.abilities();   // player id -> ability ids held, for every body's kit
      const might = partyMightNow();
      session.pace = sim.setRushFight(fight, gauntlet.modifiers, might);   // the curve, the fight's modifiers, the party's kit
      session.blows = sim.rushBlows(might);   // the bosses' blows (CONFIG.endless.mightBlows): each browser's bosses strike as hard
      session.par = rushParNow();   // the HUD's par time
      // Each boss's share of its bars (rushHealth): a pair's, a warm-up boss's, its own; only those under 1.
      const shares = [gauntlet.boss, ...gauntlet.partners].map(id => [id, sim.rushHealth(1 + gauntlet.partners.length, fight, id)]).filter(([, k]) => k < 1);
      if (shares.length) session.health = Object.fromEntries(shares);
      if (fight > 0) session.drop = true;   // the next boss drops straight in: no loading card
      if (fight === 0) tally = { key: secret(8), run: gauntlet.run, id: gauntlet.id, name: gauntlet.name, startedAt: performance.now(), won: 0, crowned: 0, times: [], players: new Map() };
      tally.at = gauntlet.number;   // the fight the run is in: the HUD's number
      // The replay: a new run ends the one being recorded; each Boss Rush fight is a chapter of its own.
      if (replays && fight === 0) recording = replays.begin({ mode: gauntlet.run.week ? 'weekly' : 'boss-rush', name: gauntlet.name, version: sim.catalog().version, build });
      tallied = false;
      if (opening) session.opening = true;
      for (const p of clients.values()) { p.ready = false; p.pose = null; p.startPose = null; p.acted = false; p.arenaDefeated = false; p.revive = null; p.claims.clear(); p.lastSeq = 0; p.encoder.reset(); p.loadingSince = performance.now(); remember(p); }
      arenaWipeFor = 0; bossStarted = false; loadStarted = loadNow(); abilityFor = null; abilityRound.clear();
      firstPick = options.firstPick !== false && fight === 0 ? 'due' : null;   // firstPick: false, tests that check an exact kit
      accumulator = 0; sinceSnapshot = 0; lastSignature = null;
      recording?.chapter(session, replayRoster(roster()));
      broadcast({ type: 'start', session, opening: !!session.opening }); sendRoster();
    }
    // Boss Rush, between fights (CONFIG.abilities): once the kill moment has played, every connected player is offered
    // abilities, and the next fight waits until each has chosen or the pick time runs out (then every open offer gets its
    // first ability, someone who left included).
    // The free pick before fight 1 is the same pick, of CONFIG.abilities.first only, while the boss waits.
    function abilitiesChosen() {
      if (abilityFor === null) {
        abilityFor = 0; abilityPickedAt = -Infinity; abilityAllChosen = false;
        const ids = [...clients.values()].filter(p => p.hello).map(p => p.id);
        for (const id of ids) abilityRound.add(id);
        offerRound(ids, true, 0);
        for (const p of clients.values()) sendOffer(p);
      }
      abilityFor += 1 / C.tickRate;
      const waiting = [...clients.values()].filter(p => p.hello && sim.abilityOffer(p.id));
      if (!waiting.length && !abilityAllChosen) {   // everyone has chosen: the pick screens say so for the hold
        abilityAllChosen = true;
        for (const p of clients.values()) if (p.hello) send(p, { type: 'abilitiesChosen' });
      }
      if (abilityFor < sim.abilityPickTime && (waiting.length || abilityFor < abilityPickedAt + sim.abilityPickHold)) return false;   // everyone chose: a short hold
      sim.settleAbilities(); recording?.kit(sim.abilities());
      return true;
    }
    // Someone arriving during the pick: their open offer again, or, the first time this round, one of their own.
    function offerLate(p) {
      if (abilityFor === null) return;
      if (!abilityRound.has(p.id)) {
        abilityRound.add(p.id);
        offerRound([p.id], false, abilityRound.size);
      }
      sendOffer(p);
    }
    // This round's offers to `ids`: after a fight, its own (a swift kill's extra card, a Crowned win's legendary); before
    // fight 1, the free pick (seeded apart from the fights' offers, so the weekly run's is the same for everyone).
    function offerRound(ids, withBots, round) {
      const g = session.gauntlet, pools = !g.run?.week;   // the weekly run: one pool for everyone
      if (firstPick) sim.offerAbilities(ids, withBots, 0, 0, false, sim.offerSeed(g.run, -1, round), pools, sim.abilityFirst);
      else sim.offerAbilities(ids, withBots, swiftKill() ? sim.swiftExtra : 0, g.fight + 1, !!g.crowned, sim.offerSeed(g.run, g.fight, round), pools);
    }
    // Boss Rush's par for this fight (rushPar): its pace, its bosses and what the party holds (CONFIG.swift.might).
    const partyMightNow = () => sim.partyMight([...clients.values()].filter(p => p.hello).map(p => p.id).concat(sim.botList().map(b => b.id)));
    const rushParNow = () => sim.rushPar(session.gauntlet.fight, 1 + session.gauntlet.partners.length, partyMightNow());
    // Before fight 1 (firstPick): offered once the party has loaded; true once everyone has chosen (or the time ran
    // out). Then every body takes its kit (`firstPick`: the whole map, so a player still loading builds with it, and the
    // par that kit sets) and the boss wakes.
    function firstPickChosen() {
      if (firstPick === 'due') firstPick = 'open';
      if (!abilitiesChosen()) return false;
      firstPickDone(); return true;
    }
    function firstPickDone() {
      firstPick = null; abilityFor = null; abilityRound.clear();
      for (const p of clients.values()) { p.acted = false; p.startPose = p.pose ? { x: p.pose.x, y: p.pose.y, z: p.pose.z } : null; }
      session.abilities = sim.abilities(); session.par = rushParNow(); recording?.kit(session.abilities);
      for (const p of clients.values()) if (p.hello) send(p, { type: 'firstPick', abilities: session.abilities, par: session.par });
    }
    // This player's open offer (if any), the time left to choose, and what they hold.
    function sendOffer(p) {
      const offer = sim.abilityOffer(p.id);
      const crowned = !!session.gauntlet?.crowned;
      if (p.hello && offer) send(p, { type: 'abilities', offer, left: Math.max(0, sim.abilityPickTime - abilityFor), held: sim.abilities()[p.id] || [], swift: swiftKill() && offer.length > sim.offerSize(crowned), crowned });
    }
    // This fight was won under its par (CONFIG.swift): its ability offer has an extra choice.
    const swiftKill = () => !!tally?.times.length && tally.times[tally.times.length - 1].swift && tallied;
    // Duplicate claims (one contact per swing and enemy, one parry per attack) are dropped before any work.
    function claim(p, key) {
      if (p.claims.has(key)) return false;
      p.claims.add(key); if (p.claims.size > C.maxClaims) p.claims.delete(p.claims.values().next().value);
      return true;
    }
    function hello(p, msg) {
      if (msg.protocol !== C.protocol || msg.build !== build) { p.ws.close(1008, 'Game updated. Reload this page.'); return; }
      // Joins per address and minute are bounded, so one address cannot churn the token memory or the roster.
      if (p.address) {
        const now = performance.now(), h = hellos.get(p.address) || { count: 0, at: now };
        if (now - h.at >= 60000) { h.count = 0; h.at = now; }
        hellos.set(p.address, h);
        if (++h.count > C.hellosPerMinute) { p.ws.close(1008, 'Too many joins. Wait a minute, then rejoin.'); return; }
      }
      const token = typeof msg.token === 'string' && /^[a-f0-9]{64}$/.test(msg.token) ? msg.token : null;
      const memory = token ? memories.get(token) : null;
      // A player slot is taken at hello; replacing your own open tab needs no extra slot.
      if (clients.size >= capacity && !(memory && clients.has(memory.id))) { p.ws.close(1013, 'The lobby is full. Try again later.'); return; }
      p.name = `Player ${clients.size + 1}`;
      identify(p, memory, token);
      p.name = net.name(msg.name) || p.name; p.hello = true; p.foreground = msg.foreground !== false;
      pool(p, msg.abilities);   // their active pool (js/data/crates.js)
      p.loadingSince = performance.now(); remember(p);
      recording?.resume();
      if (session) sim.registerPlayer(p.id, p.name);
      noteActivity(p);
      p.memory.results = pendingResults(p.memory);
      const results = p.memory.results.map(r => r.summary);
      send(p, { id: p.id, token: p.token, build, catalog: sim.catalog(), board: board.current(), ...roster(), type: 'welcome', ...(results.length ? { results } : {}) });
      if (session) send(p, { type: 'start', session, resume: p.pose });
      if (session) offerLate(p);
      queueRoster();
    }
    function control(p, msg) {
      noteActivity(p);
      if (p.id !== leader) { error(p, 'Only the lobby leader can use that control.'); return; }
      if (msg.action === 'start') {
        // The lobby starts Boss Rush or the weekly run, nothing else. `opening` (optional): the first fights' bosses by
        // hand (tests, tools); the draw goes on after them. The weekly run has none: its run is this week's.
        const weekly = msg.id === C.weekly.id;
        if (msg.kind !== 'calling' || !weekly && msg.id !== C.calling.id || msg.opening !== undefined && (weekly || !Array.isArray(msg.opening) || msg.opening.length > sim.catalog().bosses.length)) return;
        try {
          const run = weekly ? sim.weeklyRun(dateNow()) : sim.newRun(msg.opening ? msg.opening.map(String) : []);
          sim.calling(run);   // refuse a bad opening before anything starts
          // Boss Rush is the party against the bosses (PLAN.md track B item 9): no bot ever fills it.
          start(run, 0, true);
        } catch (e) {
          if (!e.rejected) console.error('Start failed:', e);
          error(p, e.rejected ? e.message : 'That run could not start. Try again.');
        }
      // A weekly run restarts as this week's run (it may have begun last week); any other Boss Rush run as itself.
      } else if (msg.action === 'restart' && session) start(session.gauntlet.run.week ? sim.weeklyRun(dateNow()) : session.gauntlet.run, 0, true);
      else if (msg.action === 'lobby') {
        stop('The leader returned everyone to the lobby.');
      } else if (msg.action === 'transfer' && clients.has(msg.player) && clients.get(msg.player).hello) {
        if (!isActive(clients.get(msg.player), activityNow())) { error(p, 'That player is inactive. They must provide input before becoming leader.'); return; }
        leader = msg.player; sendRoster();
      } else if (msg.action === 'kick' && msg.player !== p.id && clients.has(msg.player)) {
        // One removal per cooldown, and a returning player is not removed again within `kickRepeat`.
        const now = performance.now();
        for (const [id, at] of kicked) if (now - at >= C.kickRepeat) kicked.delete(id);
        if (now - lastKick < C.kickCooldown || kicked.has(msg.player)) { error(p, 'Wait a moment before removing that player again.'); return; }
        lastKick = now; kicked.set(msg.player, now);
        clients.get(msg.player).ws.close(1008, 'Removed by the lobby leader.');
      }
    }
    function acceptPose(p, s) {
      const P = net.pose;
      if (!s || typeof s !== 'object' || !P.required.every(k => net.finite(s[k]))) return;
      // Whitelist fields: remote data never becomes a Player object or arbitrary properties.
      // Health within the bar this player's abilities give (Iron Blood).
      const maxHp = sim.maxHpOf(p.id) + 1e-6;
      if (!P.states.includes(s.state) || typeof s.grounded !== 'boolean' || s.hp < 0 || s.hp > maxHp || s.stateTime < 0 || s.attackT < 0) return;
      const limits = { flasks: sim.playerMaxFlasks, doomTime: C.maxCoordinate, doomDrain: maxHp };
      if (Object.entries(limits).some(([key, max]) => s[key] !== undefined && (!net.finite(s[key], max) || s[key] < 0)) ||
        s.flasks !== undefined && !Number.isInteger(s.flasks)) return;
      const resource = key => s[key] ?? p.pose?.[key] ?? (key === 'flasks' ? sim.playerMaxFlasks : 0);
      // A personal respawn cannot re-enter an ongoing boss attempt. Only a new
      // shared session clears this player's defeat, including repeated ready messages.
      const down = s.hp <= 0 || s.state === 'dead';
      if (session.teamWipeOnly && down && !p.arenaDefeated) {
        p.arenaDefeated = true; sim.noteDeath(p.id);
        // In a party, the fall leaves an ember a teammate can revive them from (CONFIG.revive). Alone, it ends the run.
        if ([...clients.values()].some(q => q !== p && q.hello && (q.arenaDefeated || participating(q)))) sim.fall(p.id, s.x, s.y, s.z);
      }
      // A revive the server granted takes hold with this player's first living pose; until then they stay down.
      let rose = 0;
      if (p.revive && !down) { rose = p.revive.hp; p.arenaDefeated = false; p.revive = null; }
      sim.notePose(p.id, s.hp);   // health lost: the perks that wait for it (Vengeance, Patience)
      p.pose = { ...Object.fromEntries(P.required.map(key => [key, s[key]])), state: s.state,
        // Only a real player attack id (own property) is relayed: peers index their attack table with it.
        attack: sim.playerAttack(s.attack), charge: Math.min(2, Math.max(0, Number(s.charge) || 0)),
        grounded: s.grounded, execEnemy: net.id(s.execEnemy) ? s.execEnemy : null,
        ...Object.fromEntries(P.motion.map(key => [key, net.finite(s[key]) ? s[key] : key === 'activeAt' ? -1 : 0])),
        ...Object.fromEntries(P.personal.map(key => [key, resource(key)])),
        view: net.cameraView(s.view) };
      if (session.teamWipeOnly && p.arenaDefeated) { p.pose.hp = 0; p.pose.state = 'dead'; p.pose.attack = null; }
      if (rose) p.pose.hp = Math.min(p.pose.hp, rose);   // up with the bar the revive gave, no more
      p.pose.vanish = Math.max(0, Math.min(p.pose.vanish, sim.vanishOf(p.id)));   // drawn faint to peers only while the server counts a vanish
      if (!p.startPose) p.startPose = { x: p.pose.x, y: p.pose.y, z: p.pose.z };
      else if (!p.acted && !firstPick && (Math.hypot(p.pose.x - p.startPose.x, p.pose.z - p.startPose.z) > 0.08
        || Math.abs(p.pose.y - p.startPose.y) > 0.08
        || (p.pose.state !== 'idle' && p.pose.state !== 'dead'))) p.acted = true;
      p.lastPose = performance.now(); p.poseSeq++; remember(p);
    }
    function message(p, msg) {
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
      if (msg.type === 'hello') { if (!p.hello) hello(p, msg); return; }
      if (!p.hello || clients.get(p.id) !== p) return;
      if (msg.type === 'presence' && typeof msg.foreground === 'boolean') {
        if (p.foreground === msg.foreground) return;   // repeats change nothing and broadcast nothing
        p.foreground = msg.foreground;
        if (!refreshLeader('presence')) queueRoster();
        return;
      }
      // Poses, transport keepalives, loading and animation clocks are not input.
      if (msg.type === 'activity') { noteActivity(p); return; }
      if (msg.type === 'gear') { pool(p, msg.abilities); return; }   // the pool changed in the lobby
      if (msg.type === 'ping') { send(p, { type: 'pong', sent: msg.sent }); return; }
      if (msg.type === 'name') {
        noteActivity(p);
        const name = net.name(msg.name) || p.name; if (name === p.name) return;
        p.name = name; remember(p); if (session) sim.registerPlayer(p.id, p.name); queueRoster(); return;
      }
      if (msg.type === 'control') { control(p, msg); return; }
      if (msg.type === 'runResultSeen') {
        p.memory.results = pendingResults(p.memory).filter(r => r.summary.key !== msg.key);
        return;
      }
      if (!session || msg.epoch !== session.epoch) return;
      if (msg.type === 'pickAbility') {   // a pick from this player's own open offer, while the offers are open
        noteActivity(p);
        if (abilityFor !== null && sim.pickAbility(p.id, msg.id)) { abilityPickedAt = abilityFor; recording?.kit(sim.abilities()); send(p, { type: 'abilities', offer: null, held: sim.abilities()[p.id] || [] }); }
        return;
      }
      if (msg.type === 'ready') {
        // A full baseline is the costly answer: a repeated ready only resynchronises once per `resyncInterval`.
        const now = performance.now(), again = p.ready;
        if (again && now - p.resyncAt < C.resyncInterval) return;
        p.ready = true; p.resyncAt = now; if (p.memory) p.memory.kept = true;
        p.encoder.reset(); sendFrame(p, sim.frame(false), playerFrames());
        if (!again) queueRoster();
        return;
      }
      if (!p.ready) return;
      if (msg.type === 'pose') { acceptPose(p, msg.pose); return; }
      if (!Number.isSafeInteger(msg.seq) || msg.seq <= p.lastSeq) return;
      p.lastSeq = msg.seq; syncPlayers();
      if (!firstPick) p.acted = true;
      if (session.teamWipeOnly && p.arenaDefeated && msg.type !== 'finisherEnd') return;
      if (msg.type === 'hit') {
        if (!net.id(msg.enemy) || !net.id(msg.swing) || !net.id(msg.attack)) return;
        if (claim(p, `${msg.swing}/${msg.enemy}`)) sim.hit(p.id, msg);
      } else if (msg.type === 'parry') {
        if (net.id(msg.enemy) && Number.isSafeInteger(msg.serial) && Number.isSafeInteger(msg.hit) &&
          claim(p, `parry/${msg.enemy}/${msg.serial}/${msg.hit}`)) sim.parry(p.id, msg);
      } else if (msg.type === 'dodged') {   // pass 85: a perfect dodge, for the counter that follows
        if (net.id(msg.enemy) && Number.isSafeInteger(msg.serial) && claim(p, `dodged/${msg.enemy}/${msg.serial}`)) sim.dodged(p.id, msg);
      } else if (msg.type === 'finisherEnd') {   // pass 100: the Finishing Blow the server granted (Simulation.hit) has ended
        if (net.id(msg.enemy)) sim.endFinisher(p.id, msg.enemy);
      } else if (msg.type === 'ability') {   // an ability's trigger only this player's browser sees (ABILITY_CLAIMS)
        if (typeof msg.when === 'string' && (msg.enemy === undefined || net.id(msg.enemy)) && (msg.action === undefined || net.id(msg.action)) &&
          (msg.key === undefined || net.id(msg.key)) &&
          claim(p, `ability/${msg.when}/${msg.enemy}/${msg.when === 'dodge' ? msg.serial ?? msg.seq : msg.seq}`)) sim.abilityClaim(p.id, msg);   // a dodge: one a blow; the rest each its own (charges and cooldowns limit them)
      } else if (msg.type === 'lifesteal') {
        if (net.id(msg.enemy) && claim(p, `heal/${msg.enemy}/${msg.serial}/${msg.hitIndex}`)) sim.lifesteal(p.id, msg);
      } else if (msg.type === 'landed') {   // pass 77: an attack the Antlered Hunger would learn struck this player
        if (net.id(msg.enemy) && claim(p, `land/${msg.enemy}/${msg.serial}/${msg.hitIndex}`)) sim.landed(p.id, msg);
      }
    }
    // A new socket: a player still joining (`address`: its own budget of joins, or null).
    function connect(ws, address = null) {
      const p = { ws, id: uuid(), name: 'Player', hello: false, ready: false, pose: null, startPose: null, acted: false, address,
        lastPose: 0, lastSeq: 0, claims: new Set(), encoder: new net.FrameEncoder(), poseSeq: 0, lastWritten: 0, resyncAt: -Infinity,
        lastActivity: null, foreground: true, loadingSince: performance.now() };
      pending.add(p);
      return p;
    }
    function receive(p, msg) {
      try { message(p, msg); } catch (e) { console.error('Lobby message failed:', e); error(p, 'The server could not process that action.'); }
    }
    function disconnect(p) {
      pending.delete(p);
      if (clients.get(p.id) !== p) return;   // a replacement connection (or nobody) owns this identity now
      remember(p); clients.delete(p.id); p.revive = null;
      if (!clients.size) recording?.pause();
      if (session) sim.dropEmber(p.id);
      if (!refreshLeader('disconnect')) queueRoster();
    }
    // Joins counted more than a minute ago are forgotten.
    function sweep() {
      const now = performance.now();
      for (const [address, h] of hellos) if (now - h.at >= 60000) hellos.delete(address);
    }
    // One step of the lobby's clock, every 1 / C.tickRate s. `paused` (the page alone, in its pause menu or hidden):
    // the run holds where it is, and the wall clocks it reads (run time, load waits, idleness) skip the held time.
    function tick(paused = false) {
      if (paused) {
        const now = performance.now(), held = now - last; last = now;
        if (tally) tally.startedAt += held;
        if (!options.loadNow) loadStarted += held;
        for (const p of clients.values()) {
          p.loadingSince += held;
          if (!options.activityNow && Number.isFinite(p.lastActivity)) p.lastActivity += held;
        }
        return;
      }
      const now = performance.now(), elapsed = Math.min((now - last) / 1000, 0.25); last = now;
      updateMetrics(now);
      refreshLeader();
      if (!session) { accumulator = 0; return; }
      syncPlayers(); accumulator += elapsed;
      try {
        while (accumulator >= 1 / C.tickRate) {
          if ((session.teamWipeOnly || session.opening) && !bossStarted) {
            // Background or stalled loaders cannot hold the run hostage. Bots need no browser loading barrier.
            const party = [...clients.values()].filter(participating);
            const allReady = loadNow() - loadStarted >= C.loadTimeout || party.every(p => p.ready && p.pose);
            // The free pick: opens as soon as everyone is loaded (no grace delay); once open, its clock runs whether or
            // not a late joiner is loaded. A fight already over (tests, tools) settles it as if time ran out.
            if (firstPick && sim.state.complete) { if (firstPick === 'open') { sim.settleAbilities(); firstPickDone(); } else firstPick = null; }
            if (firstPick === 'open' || (allReady && firstPick)) firstPickChosen();
            // Once loaded and any opening pick is done, the boss still waits until a player moves or acts (v7.160.0).
            if (!firstPick && allReady) {
              const timedOut = loadNow() - loadStarted >= C.loadTimeout && !party.some(p => p.ready && p.pose);
              const anyActed = timedOut || party.length === 0 || sim.botList().length > 0 || party.some(p => p.acted)
                || sim.inspect().Game.enemies.every(e => !e.alive());
              bossStarted = anyActed;
            }
          }
          const began = performance.now(); sim.tick(1 / C.tickRate, (session.teamWipeOnly || session.opening) && !bossStarted); ticks++;
          tickTimes.push(performance.now() - began); if (tickTimes.length > C.metricsSamples) tickTimes.shift();
          accumulator -= 1 / C.tickRate; sinceSnapshot += 1 / C.tickRate;
          if (session.teamWipeOnly) {
            // Revives finished this step: the fallen player rises at the ember with part of their bar (CONFIG.revive).
            for (const r of sim.takeRisen()) {
              const q = clients.get(r.id);
              if (q?.arenaDefeated) { const hp = sim.reviveHealth(q.id, r.by); q.revive = { ...r, hp }; send(q, { type: 'revive', epoch: session.epoch, hp, by: r.by }); }
            }
            const party = [...clients.values()].filter(p => p.hello && (p.arenaDefeated || participating(p)));
            // Active loaders get bounded time; away players do not prevent a real team defeat.
            const wiped = (party.length > 0 || sim.botList().length > 0) && party.every(p => p.ready && p.pose && p.arenaDefeated) && sim.botsDown();
            arenaWipeFor = wiped && sim.inspect().Game.enemies.some(e => e.alive()) ? arenaWipeFor + 1 / C.tickRate : 0;
            if (arenaWipeFor >= sim.arenaWipeDelay) {
              tallyFight(false);
              stop(`${party.length > 1 ? 'TEAM WIPED' : 'YOU FELL'} · The boss run ends here. Choose ${session.gauntlet.name} to try again from the start.`, 'team-wipe', { summary: endRun('wiped') });
              break;
            }
          }
          // Capture every state transition (even a short active phase) reliably. A sleeping run changes nothing.
          if (!sim.sleeping || sinceSnapshot >= 1 / C.snapshotRate - 1e-9) {
            const signature = sim.inspect().Game.enemies.map(e => `${e.state}/${e.netAttack}/${e.hitIndex}/${!!e.hitbox}/${e.phase}`).join('|');
            if (sinceSnapshot >= 1 / C.snapshotRate - 1e-9 || signature !== lastSignature) {
              sinceSnapshot = 0; lastSignature = signature;
              const frame = sim.frame(), players = playerFrames();
              for (const p of clients.values()) sendFrame(p, frame, players);
              recording?.frame(frame, players);
            }
          }
          // Boss Rush: once the kill moment has played, the fight's time is kept and the ability pick opens in the arena.
          if (sim.state.completedFor >= C.rushKillTime) {
            if (!tallied) { tallyFight(true); tallied = true; }
            if (session.gauntlet.next && !abilitiesChosen()) continue;
            // The fallen rise for the next fight with everyone else; the run ends only when everyone falls (or at
            // CONFIG.endless.longest, which no one reaches).
            if (session.gauntlet.next) start(session.gauntlet.run, session.gauntlet.next);
            else stop(`${session.gauntlet.name} COMPLETE · ${tally.won} fights won.`, 'run-complete', { summary: endRun('won') });
            break;
          }
        }
      } catch (e) {
        // Through the ordinary stop path: players lose ready/pose/encoder state and get the stop and a roster.
        console.error('Simulation stopped:', e);
        try { stop('The session stopped after a server error. The leader can start another run.', 'error'); }
        catch (err) { console.error('Stopping after a simulation error failed:', err); session = null; }
      }
    }
    return { connect, receive, disconnect, tick, sweep, close() { clearTimeout(rosterTimer); }, sim, clients, pending,
      get session() { return session; }, get leader() { return leader; }, get metrics() { return metrics; } };
  }
  const api = { createLobby, runTitles };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArenaLobby = api;
})(globalThis);
