'use strict';
// Replays of multiplayer Boss Rush runs (PLAN.md "replays"): the server keeps what it already has, as state, never
// video or inputs. A run is one file of JSON lines, gzipped in batches (one gzip member per batch, appended), so the
// server's worn SSD sees a write every `batchSeconds`, not every frame:
//   {k:'run', v, id, mode, name, version, build, startedAt}      the header
//   {k:'start', t, fight, session, roster}                         a fight begins (a chapter)
//   {k:'f', t, m}                                                  a snapshot: the delta a client would get (FrameEncoder)
//   {k:'roster', t, players}                                       names and looks changed
//   {k:'mark', t, type, ...}                                       fight won, down, death, revive, Finishing Blow, pick
//   {k:'end', t, outcome, summary}                                 how it ended, with the end screen's totals
// `t` is seconds from the run's start, on the simulation's own clock within a fight. Content is named by string id
// (AGENTS.md rule 4), so an old replay still plays after the game's data changes.
// One small index (index.json) holds every run's card: who, when, how far, how it ended, its summary, star and notes.
// Every file access is wrapped: replays that cannot be written never stop the lobby.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { randomBytes } = require('node:crypto');
const { StringDecoder } = require('node:string_decoder');
const net = require('../js/net-protocol.js');

const FORMAT = 1, DAY = 86400000;
const round = n => Math.round(n * 1000) / 1000;
const NOTE = 500, NOTES = 200;   // a note's characters; notes per run
const SYNC = { finishFlush: zlib.constants.Z_SYNC_FLUSH };
// What can be read of a run's file: every whole gzip member up to the first that is not (a torn write, a bad disk).
function readable(buf) {
  try { return { text: zlib.gunzipSync(buf).toString('utf8'), whole: true }; } catch {}
  // Member by member: zlib's plain 10-byte header, the deflate data (its length told by the inflater), an 8-byte trailer.
  const parts = [];
  for (let at = 0; at + 18 <= buf.length && buf[at] === 0x1f && buf[at + 1] === 0x8b && buf[at + 2] === 8 && buf[at + 3] === 0;) {
    try {
      const { buffer, engine } = zlib.inflateRawSync(buf.subarray(at + 10), { info: true });
      const next = at + 10 + engine.bytesWritten + 8;
      if (next > buf.length) break;
      parts.push(buffer); at = next;
    } catch { break; }
  }
  return { text: Buffer.concat(parts).toString('utf8'), whole: false };
}

function createReplays({ dir = null, keepDays = 60, batchSeconds = 30, now = Date.now, clock = () => performance.now() } = {}) {
  const runs = new Map();   // id -> card (the index)
  const live = new Map();   // id -> recorder still writing
  let warned = false;
  const fail = (what, e) => { if (!warned) console.error(`Replays: ${what}:`, e.message); warned = true; };
  const file = id => path.join(dir, `${id}.rec.gz`);
  const validId = id => typeof id === 'string' && /^[a-z0-9-]{8,40}$/.test(id);

  // ---- The index ----
  function load() {
    if (!dir) return;
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { fail('the folder could not be made', e); return; }
    let saved = null;
    try { saved = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT') console.error('Replays: the index could not be read; rebuilding it from the files:', e.message); }
    if (saved?.format === FORMAT && Array.isArray(saved.runs)) for (const r of saved.runs) if (validId(r?.id)) runs.set(r.id, r);
    // Files with no card (an index lost or damaged): their card comes back from the file itself.
    let names = [];
    try { names = fs.readdirSync(dir).filter(n => n.endsWith('.rec.gz')); } catch {}
    for (const name of names) {
      const id = name.slice(0, -'.rec.gz'.length);
      if (validId(id) && !runs.has(id)) { const card = rebuild(id); if (card) runs.set(id, card); }
    }
    // A run that was still being written when the server stopped (a crash, an update) was cut short: it plays what it has.
    for (const r of runs.values()) {
      if (r.live) { r.live = false; r.outcome = r.outcome || 'cut'; }
      try { r.bytes = fs.statSync(file(r.id)).size; } catch { r.missing = true; }
    }
    save();
  }
  function rebuild(id) {
    try {
      const { text, whole } = readable(fs.readFileSync(file(id)));
      const lines = text.split('\n');
      const head = JSON.parse(lines[0]);
      if (head.k !== 'run') throw new Error('no header');
      const card = blank(head);
      if (!whole) card.damaged = true;
      for (const line of lines.slice(1)) {
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.k === 'start') { card.reached = Math.max(card.reached, (m.fight ?? 0) + 1); card.duration = m.t; for (const p of m.roster || []) if (!p.bot && !card.players.includes(p.name)) card.players.push(p.name); }
        else if (typeof m.t === 'number') card.duration = m.t;
        if (m.k === 'end') { card.outcome = m.outcome; if (m.summary) card.result = m.summary; }
      }
      card.outcome = card.outcome || 'cut';
      return card;
    } catch (e) {   // unreadable from the start: listed as damaged, dated by its file, kept the usual 60 days
      let at = now(); try { at = fs.statSync(file(id)).mtimeMs; } catch {}
      return { ...blank({ id, startedAt: at }), damaged: true, outcome: 'damaged' };
    }
  }
  function blank(head) {
    return { id: head.id, mode: head.mode || 'boss-rush', name: head.name || 'BOSS RUSH', version: head.version || null, build: head.build || null,
      startedAt: head.startedAt || 0, duration: 0, players: [], reached: 0, outcome: null, live: false, starred: false, notes: [], summary: null, bytes: 0 };
  }
  let saveTimer = null;
  function save() {
    if (!dir) return;
    clearTimeout(saveTimer); saveTimer = null;
    try {
      const temp = path.join(dir, `index.json.${process.pid}.tmp`);
      fs.writeFileSync(temp, JSON.stringify({ format: FORMAT, runs: [...runs.values()] }));
      fs.renameSync(temp, path.join(dir, 'index.json'));   // whole or not at all
    } catch (e) { fail('the index could not be saved', e); }
  }
  // Changes that come in bursts (a run's live card) wait a little and are written once.
  function saveSoon() { if (!saveTimer && dir) { saveTimer = setTimeout(save, 5000); saveTimer.unref?.(); } }

  // ---- Keeping: every run 60 days, starred runs forever ----
  function prune() {
    const before = now() - keepDays * DAY;
    let changed = false;
    for (const r of [...runs.values()]) if (!r.starred && !live.has(r.id) && r.startedAt < before) { remove(r.id, false); changed = true; }
    if (changed) save();
  }
  function remove(id, write = true) {
    if (live.has(id)) return false;
    if (!runs.delete(id)) return false;
    if (dir) try { fs.unlinkSync(file(id)); } catch (e) { if (e.code !== 'ENOENT') fail('a run could not be deleted', e); }
    if (write) save();
    return true;
  }

  // ---- Recording one run ----
  // `head`: { mode, name, version, build }. Returns the recorder index.cjs feeds; null when replays are off.
  function begin(head) {
    const id = `${new Date(now()).toISOString().slice(0, 10)}-${randomBytes(5).toString('hex')}`;
    const startedAt = now(), started = clock();
    const card = { ...blank({ ...head, id, startedAt }), live: true };
    runs.set(id, card);
    const encoder = new net.FrameEncoder();
    let pending = [], flushedAt = clock(), writing = Promise.resolve(), lines = 0, ended = false;
    // The newest lines, from the last batch on disk to the ones still waiting: a live viewer's stream ends with them.
    let tailLines = [], tailStart = 0, persisted = 0;
    const written = n => {
      persisted += n;
      const drop = persisted - n - tailStart;
      if (drop > 0) { tailLines.splice(0, drop); tailStart += drop; }
    };
    let fight = -1, chapterAt = 0, chapterSim = null, lastT = 0, lastRoster = '', kit = {};
    // The summary, kept as the run goes (PLAN.md "Feedback"): what hit each player and how often, what downed them,
    // which boss attacks land most, abilities picked, time per fight. Hits are told from the players' own health in
    // their poses (each client owns its health): a drop is put on the nearest boss attack that was striking.
    const summary = { fights: [], players: {}, attacks: {} };
    const person = (id, name) => summary.players[id] || (summary.players[id] = { name, downs: 0, deaths: 0, revived: 0, finishers: 0, hitBy: {}, downedBy: {}, picks: [] });
    const lastHp = new Map(), recent = [];   // player id -> hp; recent striking moments [{ t, enemy, def, attack, x, z }]
    let alive = new Map();
    const push = obj => {
      const line = JSON.stringify(obj);
      pending.push(line); tailLines.push(line); lines++;
      if (clock() - flushedAt >= batchSeconds * 1000) flush();
    };
    // `issued`: lines handed to a write. A sync flush (the run ends, the server stops) writes every line not yet handed
    // over, batches still compressing included, and those batches then skip their own write: nothing twice, in order.
    let issued = 0;
    function flush(sync = false) {
      if (!dir) { pending = []; return; }
      if (sync) {
        const list = tailLines.slice(issued - tailStart); pending = []; flushedAt = clock();
        if (!list.length) return;
        issued = lines;
        try { fs.appendFileSync(file(id), zlib.gzipSync(list.join('\n') + '\n', { level: 9 })); card.bytes = fs.statSync(file(id)).size; written(list.length); } catch (e) { fail('a batch could not be written', e); }
        return;
      }
      if (!pending.length) return;
      const text = pending.join('\n') + '\n', n = pending.length, upto = lines; pending = []; flushedAt = clock();
      writing = writing.then(() => new Promise(resolve => zlib.gzip(text, { level: 9 }, (err, gz) => {
        if (issued >= upto) { resolve(); return; }
        if (err) { fail('a batch could not be compressed', err); resolve(); return; }
        issued = upto;
        fs.appendFile(file(id), gz, e => { if (e) fail('a batch could not be written', e); else { card.bytes += gz.length; written(n); } resolve(); });
      })));
    }
    const at = () => Math.max(lastT, round((clock() - started) / 1000));
    push({ k: 'run', v: FORMAT, id, mode: card.mode, name: card.name, version: card.version, build: card.build, startedAt });
    saveSoon();
    const rec = {
      id,
      // A fight starts: its session (bosses, modifiers, abilities held), and who is there.
      chapter(session, roster) {
        if (ended) return;
        fight = session.gauntlet?.fight ?? fight + 1;
        chapterAt = at(); chapterSim = null; lastT = chapterAt; encoder.reset(); recent.length = 0;
        lastRoster = JSON.stringify(roster);
        for (const p of roster) if (!p.bot && !card.players.includes(p.name)) card.players.push(p.name);
        card.reached = Math.max(card.reached, (session.gauntlet?.number ?? fight + 1));
        summary.fights.push({ fight: fight + 1, bosses: [session.gauntlet?.boss ?? session.id, ...(session.gauntlet?.partners || [])], crowned: !!session.gauntlet?.crowned, start: chapterAt, time: null, won: false });
        push({ k: 'start', t: chapterAt, fight, session, roster });
        rec.kit(session.abilities || {});
        saveSoon();
      },
      // One snapshot, as sent to the players (sim.frame() and the players' poses).
      frame(frame, players) {
        if (ended || fight < 0) return;
        if (chapterSim === null) chapterSim = frame.time;
        const t = lastT = Math.max(lastT, round(chapterAt + frame.time - chapterSim));
        const m = encoder.encode(frame, players); delete m.type; delete m.frame.server;
        push({ k: 'f', t, m });
        card.duration = t;
        observe(frame, players, t);
      },
      roster(players) {
        if (ended || fight < 0) return;
        const text = JSON.stringify(players); if (text === lastRoster) return;
        lastRoster = text;
        for (const p of players) if (!p.bot && !card.players.includes(p.name)) card.players.push(p.name);
        push({ k: 'roster', t: at(), players });
      },
      // What every player holds (sim.abilities()): each new one is a pick, marked on the timeline.
      kit(abilities) {
        if (ended) return;
        for (const [player, held] of Object.entries(abilities || {})) {
          const before = new Set(kit[player] || []);
          for (const ability of held || []) if (!before.has(ability)) {
            mark({ type: 'pick', player, ability });
            const row = summary.players[player]; if (row) row.picks.push(ability); else person(player, null).picks.push(ability);
          }
        }
        kit = JSON.parse(JSON.stringify(abilities || {}));
      },
      end(outcome, result) {
        if (ended) return;
        ended = true;
        const t = at();
        const open = summary.fights.at(-1); if (open && open.time === null) open.time = round(t - open.start);
        push({ k: 'end', t, outcome, summary: result || null });
        card.outcome = outcome; card.live = false; card.duration = t; card.endedAt = now();
        if (result) card.result = { reached: result.reached, won: result.won, crowned: result.crowned, time: result.time,
          players: (result.players || []).map(r => ({ name: r.name, bot: !!r.bot, damage: r.damage, deaths: r.deaths, parries: r.parries, finishers: r.finishers, revives: r.revives, title: r.title })) };
        if (result?.reached) card.reached = result.reached;
        card.summary = finish();
        flush(true); live.delete(id); save();
      },
      // Lines written so far, for a live run's viewer (the file, then what is still waiting for its batch).
      get tail() { return { start: tailStart, lines: tailLines }; },
      get lines() { return lines; },
      flush,
      writing: () => writing,
    };
    live.set(id, rec);

    function mark(m) { push({ k: 'mark', t: lastT, ...m }); }
    function observe(frame, players, t) {
      // Striking moments, kept 0.6 s: a hit shows in a pose a little after the blow.
      for (const e of frame.enemies) if (e.attack && (e.hitbox || e.state === 'active')) recent.push({ t, enemy: e.id, def: e.def, attack: e.attack, x: e.x, z: e.z });
      for (const s of frame.shots || []) { const e = frame.enemies.find(x => x.id === s.enemy); if (e) recent.push({ t, enemy: e.id, def: e.def, attack: s.attack, x: e.x, z: e.z, shot: true }); }
      while (recent.length && t - recent[0].t > 0.6) recent.shift();
      const nowAlive = new Map();
      for (const p of players) {
        const row = person(p.id, p.name); row.name = p.name; if (p.bot) row.bot = true;
        const hp = p.hp, before = lastHp.get(p.id);
        if (before !== undefined && hp < before - 0.5) {
          const blow = nearest(p);
          if (blow) { const key = `${blow.def}/${blow.attack}`; row.hitBy[key] = (row.hitBy[key] || 0) + 1; summary.attacks[key] = (summary.attacks[key] || 0) + 1; row.lastBlow = key; }
        }
        lastHp.set(p.id, hp);
        nowAlive.set(p.id, hp > 0 && p.state !== 'dead');
      }
      for (const [pid, up] of nowAlive) if (alive.get(pid) && !up) {
        const row = summary.players[pid], others = [...nowAlive].some(([o, u]) => o !== pid && u);
        const type = others ? 'down' : 'death';
        row[type === 'down' ? 'downs' : 'deaths']++;
        if (row.lastBlow) row.downedBy[row.lastBlow] = (row.downedBy[row.lastBlow] || 0) + 1;
        mark({ type, player: pid, by: row.lastBlow || null });
      }
      alive = nowAlive;
      for (const d of frame.events || []) {
        if (d.type === 'finisher') { mark({ type: 'finisher', player: d.player, enemy: d.enemy }); person(d.player, null).finishers++; }
        else if (d.type === 'revive') { mark({ type: 'revive', player: d.player, by: d.by }); person(d.player, null).revived++; }
      }
      if (frame.complete) {
        const f = summary.fights.at(-1);
        if (f && !f.won) { f.won = true; f.time = round(frame.fought ?? t - f.start); mark({ type: 'won', fight: f.fight }); }
      }
    }
    function nearest(p) {
      let best = null, bestD = Infinity;
      for (const r of recent) { const d = Math.hypot(r.x - p.x, r.z - p.z) - (r.shot ? 6 : 0); if (d < bestD) { bestD = d; best = r; } }
      return best && bestD < 14 ? best : null;
    }
    function finish() {
      const players = Object.values(summary.players).filter(r => r.name).map(r => ({ name: r.name, bot: !!r.bot, downs: r.downs, deaths: r.deaths,
        revived: r.revived, finishers: r.finishers, picks: r.picks, hitBy: top(r.hitBy), downedBy: top(r.downedBy) }));
      return { fights: summary.fights, players, attacks: top(summary.attacks, 12) };
    }
    return rec;
  }
  const top = (counts, n = 6) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([attack, count]) => ({ attack, count }));

  // ---- Reading ----
  const card = id => runs.get(id) || null;
  const list = () => [...runs.values()].sort((a, b) => b.startedAt - a.startedAt);
  // A run's lines from `from` on, decompressed: the file, then (a live run) what waits for its batch. Calls `out(text)`
  // per chunk and `done(error)` once. A damaged file gives what could be read, then the error.
  function stream(id, from, out, done) {
    const rec = live.get(id), decoder = new StringDecoder('utf8');
    let seen = 0, rest = '', over = false;
    const emitLines = list => {
      const keep = [];
      for (const line of list) if (seen++ >= from) keep.push(line);
      if (keep.length) out(keep.join('\n') + '\n');
    };
    const emit = text => { const parts = (rest + text).split('\n'); rest = parts.pop(); emitLines(parts); };
    // Every batch ends a line, so a part line at the end is a batch still being appended: the recorder has it whole.
    const finish = error => {
      if (over) return; over = true;
      if (rec && !error) { const { start, lines } = rec.tail; if (seen >= start) emitLines(lines.slice(seen - start)); }
      done(error || null);
    };
    if (!dir) { finish(); return; }
    const source = fs.createReadStream(file(id)), gunzip = zlib.createGunzip(SYNC);
    source.on('error', e => { gunzip.destroy(); finish(e.code === 'ENOENT' && rec ? null : e); });
    gunzip.on('data', chunk => emit(decoder.write(chunk)));
    gunzip.on('end', () => { emit(decoder.end()); finish(); });
    // A damaged file: what can be read, from where the stream stopped, then the error.
    gunzip.on('error', e => {
      source.destroy(); rest = '';
      fs.readFile(file(id), (err, buf) => {
        if (!err) { const all = readable(buf).text.split('\n'); all.pop(); emitLines(all.slice(seen)); }
        finish(e);
      });
    });
    source.pipe(gunzip);
  }
  function star(id, on) { const r = runs.get(id); if (!r) return null; r.starred = !!on; save(); return r; }
  function addNote(id, t, text) {
    const r = runs.get(id); if (!r) return null;
    text = typeof text === 'string' ? text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, NOTE) : '';
    if (!text || !Number.isFinite(t) || t < 0 || r.notes.length >= NOTES) return null;
    const note = { id: randomBytes(4).toString('hex'), t: round(t), text, at: now() };
    r.notes.push(note); r.notes.sort((a, b) => a.t - b.t); save();
    return note;
  }
  function removeNote(id, noteId) {
    const r = runs.get(id); if (!r) return false;
    const before = r.notes.length; r.notes = r.notes.filter(n => n.id !== noteId);
    if (r.notes.length === before) return false;
    save(); return true;
  }
  // For the loop (.claude/iterate.md "Feedback"): every note with its run and moment, and every finished run's summary.
  function feedback(since = 0) {
    const notes = [], summaries = [];
    for (const r of list()) {
      for (const n of r.notes) if (n.at >= since) notes.push({ run: r.id, t: n.t, id: n.id, text: n.text, at: n.at, players: r.players, version: r.version });
      if (r.summary && (r.endedAt || r.startedAt) >= since) summaries.push({ run: r.id, startedAt: r.startedAt, version: r.version, players: r.players, reached: r.reached, outcome: r.outcome, duration: r.duration, ...r.summary });
    }
    return { notes, summaries };
  }
  // A server going down (an update, Ctrl+C): every live run's batch goes to disk now, and its card says cut short.
  function close() {
    for (const rec of live.values()) { rec.flush(true); const r = runs.get(rec.id); if (r) { r.live = false; r.outcome = r.outcome || 'cut'; } }
    live.clear(); save();
  }

  load(); prune();
  const pruner = setInterval(prune, 6 * 3600 * 1000); pruner.unref?.();
  return { begin, list, card, stream, star, addNote, removeNote, remove, feedback, prune, close, validId, get live() { return live; }, dir,
    stop() { clearInterval(pruner); clearTimeout(saveTimer); } };
}
// The replay door (PLAN.md "Private"): its own port, which the home server serves on the tailnet only (homelab.toml
// [[serve]], never Funnel). It answers the list page (replays/), the viewer (the game's own page in replay mode, /watch)
// and the API; the public lobby's port serves none of it. `serveFile(req, res, pathname, query, replay)` is the
// lobby's static file server (index.cjs). A change is a POST from this same origin, with a JSON body; a GET never
// changes anything.
function replayDoor(replays, serveFile) {
  const json = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  const sameOrigin = req => {
    try { return new URL(req.headers.origin).host === req.headers.host; } catch { return false; }
  };
  function readBody(req, done) {
    let size = 0, chunks = [], over = false;
    req.on('data', c => { size += c.length; if (size > 4096) { over = true; req.destroy(); } else chunks.push(c); });
    req.on('end', () => { if (over) return; try { done(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { done(null); } });
  }
  return (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    let pathname, query;
    try { const url = new URL(req.url, 'http://localhost'); pathname = decodeURIComponent(url.pathname); query = url.searchParams; } catch { res.writeHead(400).end(); return; }
    if (pathname === '/healthz') { json(res, 200, { ok: true, runs: replays.list().length, live: replays.live.size }); return; }
    const api = pathname.match(/^\/api\/runs(?:\/([^/]+))?(?:\/(stream|star|notes|delete))?(?:\/([^/]+))?$/);
    if (req.method === 'POST') {
      if (!api || !api[1] || !sameOrigin(req) || !/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) { res.writeHead(403).end(); return; }
      const [, id, action, sub] = api;
      readBody(req, body => {
        if (!body || typeof body !== 'object') { json(res, 400, { error: 'Bad request' }); return; }
        if (!replays.card(id)) { json(res, 404, { error: 'No such run' }); return; }
        if (action === 'star') json(res, 200, replays.star(id, body.starred));
        else if (action === 'notes' && !sub) { const note = replays.addNote(id, Number(body.t), body.text); note ? json(res, 200, note) : json(res, 400, { error: 'A note needs words and a moment' }); }
        else if (action === 'notes' && sub) replays.removeNote(id, sub) ? json(res, 200, { ok: true }) : json(res, 404, { error: 'No such note' });
        else if (action === 'delete') replays.remove(id) ? json(res, 200, { ok: true }) : json(res, 409, { error: 'A run still being played cannot be deleted' });
        else json(res, 404, { error: 'Unknown action' });
      });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    if (api) {
      const [, id, action, sub] = api;
      if (sub || (action && action !== 'stream')) { res.writeHead(404).end(); return; }   // the rest are POSTs
      if (!id) { json(res, 200, { runs: replays.list(), now: Date.now() }); return; }
      if (id === 'feedback') { json(res, 200, replays.feedback(Number(query.get('since')) || 0)); return; }
      const card = replays.card(id);
      if (!card) { json(res, 404, { error: 'No such run' }); return; }
      if (!action) { json(res, 200, card); return; }
      // The run's lines from `from` on, as they decompress: the viewer starts on the first fight while the rest arrives.
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Run-Live': card.live ? '1' : '0' });
      if (req.method === 'HEAD') { res.end(); return; }
      const from = Math.max(0, Math.floor(Number(query.get('from')) || 0));
      replays.stream(id, from, text => res.write(text), error => {
        if (error) res.write(JSON.stringify({ k: 'damaged', error: 'The rest of this run could not be read.' }) + '\n');
        res.end();
      });
      return;
    }
    if (pathname === '/' || pathname === '/index.html') { serveFile(req, res, '/replays/index.html', query); return; }
    if (pathname === '/watch') { serveFile(req, res, '/combat-arena-3d.html', query, true); return; }
    if (pathname.startsWith('/replays/') || pathname.startsWith('/js/') || pathname.startsWith('/assets/')) { serveFile(req, res, pathname, query); return; }
    res.writeHead(404).end();
  };
}
module.exports = { createReplays, replayDoor, FORMAT };
