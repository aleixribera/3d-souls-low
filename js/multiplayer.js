'use strict';
// Opt-in co-op. Solo play never opens a socket or changes simulation authority.
CONFIG.multiplayer = ArenaNet.config;
const multiplayer = (() => {
  const C = CONFIG.multiplayer;
  let socket = null, self = null, leader = null, catalog = null, session = null, connected = false;
  let loaded = false, ready = false, starting = false, seq = 0, swing = 0, playback = null, ping = null;
  let remotes = new Map(), roster = [], lastPose = 0, lastPing = 0, pendingExecution = null;
  let intentionalClose = false, grantedEnemy = null, deferredStart = null, latestFrame = null, receivedFrames = 0, lastStats = 0;
  const decoder = new ArenaNet.FrameDecoder(), tracks = new Map();
  const heldActivity = new Set();
  let activityPending = false, lastActivitySent = -Infinity;
  const hitIds = new WeakMap();
  const panel = document.createElement('section');
  panel.id = 'publicLobby'; panel.className = 'hidden'; panel.setAttribute('aria-label', 'Public lobby');
  panel.innerHTML = `<div class="lobby-card"><h1>PUBLIC LOBBY</h1><p id="lobbyStatus" role="status">Connecting…</p>
    <label>Your name <input id="lobbyName" maxlength="24" autocomplete="nickname" placeholder="Your name"></label>
    <div id="lobbyPlayers" aria-label="Players"></div>
    <div id="lobbyLeader"><label>Adventure <select id="lobbyAdventure"></select></label>
    <div class="lobby-actions"><button id="lobbyStart">Start together</button><button id="lobbyRestart">Restart level</button>
    <button id="lobbyNext">Next level</button><button id="lobbyReturn">Return everyone to lobby</button></div></div>
    <p id="lobbyNotice" role="alert"></p><div class="lobby-actions"><button id="lobbyResume">Return to game</button><button id="lobbyLeave">Leave lobby</button></div>
    <p class="lobby-hint">The full Elden Ring campaign is selected by default. Completed chapters carry everyone into the next chapter. The leader can also choose a level or arena. Leadership passes on after five minutes without input.</p></div>`;
  const style = document.createElement('style');
  style.textContent = `#publicLobby{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:#090c12eF;color:#e8dfcd;font:16px Georgia,serif;padding:24px;overflow:auto;box-sizing:border-box}
    #publicLobby.hidden{display:none}#publicLobby .lobby-card{width:min(690px,100%);max-height:90vh;overflow:auto;padding:24px;border:1px solid #6d5c3d;background:#141719;box-shadow:0 18px 70px #0008}
    #publicLobby h1{letter-spacing:.15em;font-size:24px;margin:0 0 12px}#publicLobby label{display:block;margin:16px 0 8px}
    #publicLobby input,#publicLobby select{display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:6px;background:#23282a;color:#eee6d6;border:1px solid #746448;font:inherit}
    #publicLobby button{padding:10px 14px;background:#2c302e;color:#eee6d6;border:1px solid #817047;cursor:pointer;font:inherit}#publicLobby button:hover,#publicLobby button:focus-visible{background:#474737;outline:2px solid #d1b674}
    #publicLobby button:disabled{opacity:.4;cursor:default}#publicLobby .lobby-actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}#publicLobby .lobby-player{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #393c38}
    #publicLobby .lobby-player span{flex:1}#publicLobby .lobby-player button{font-size:13px;padding:6px 9px}#lobbyNotice{color:#efd393;min-height:1.3em}#publicLobby .lobby-hint{font:13px/1.6 system-ui;color:#aaa99f}
    #onlineParty{position:fixed;right:18px;top:42px;z-index:25;max-width:240px;pointer-events:none;color:#e9e1ca;font:12px/1.7 system-ui;text-align:right;text-shadow:0 1px 3px #000;background:#10151599;padding:8px 12px;border-left:2px solid #8c7951}
    #onlineParty.hidden{display:none}.online-name{position:fixed;z-index:21;pointer-events:none;color:#ecd79b;background:#111a;padding:3px 7px;border-radius:3px;font:12px system-ui;transform:translate(-50%,-100%);white-space:nowrap}`;
  document.head.appendChild(style); document.body.appendChild(panel);
  const party = document.createElement('div'); party.id = 'onlineParty'; party.className = 'hidden'; document.body.appendChild(party);
  const el = id => document.getElementById(id);
  const notice = s => { el('lobbyNotice').textContent = s; };
  let savedName = '';
  try { savedName = localStorage.getItem('combatArena.onlineName') || ''; } catch {}
  el('lobbyName').value = savedName;
  function send(data) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); }
  function flushActivity(now) {
    if (connected && activityPending && now - lastActivitySent >= C.activityInterval) {
      activityPending = false; lastActivitySent = now; send({ type: 'activity' });
    }
  }
  function activity() {
    if (!connected || document.visibilityState === 'hidden') return;
    activityPending = true; flushActivity(performance.now());
  }
  function userActivity(ev) {
    if (!ev.isTrusted || !connected) return;
    if (ev.type === 'pointermove' && !ev.movementX && !ev.movementY) return;
    if (ev.type === 'keydown') heldActivity.add(ev.code);
    if (ev.type === 'keyup') heldActivity.delete(ev.code);
    if (ev.type === 'pointerdown') heldActivity.add('pointer/' + ev.pointerId);
    if (ev.type === 'pointerup' || ev.type === 'pointercancel') heldActivity.delete('pointer/' + ev.pointerId);
    activity();
  }
  for (const type of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'wheel'])
    window.addEventListener(type, userActivity, { capture: true, passive: true });
  window.addEventListener('blur', () => { heldActivity.clear(); activityPending = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { heldActivity.clear(); activityPending = false; } });
  function command(type, data = {}) { if (ready) send({ type, epoch: session.epoch, seq: ++seq, ...data }); }
  function control(action, data = {}) { send({ type: 'control', action, ...data }); }
  function show() {
    panel.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    input.clear();
    if (active()) Game.mode = 'pause';
    el('menu').classList.add('hidden');
    document.body.classList.remove('no-cursor');
    updateRoster();
  }
  function hide() { panel.classList.add('hidden'); if (active()) Game.resume(); }
  function active() { return connected && !!session && loaded; }
  function chapterCard(id) {
    const chapter = connected && session?.campaign && STORIES.find(s => s.id === session.campaign.id)?.chapters.find(c => c.level === id);
    return chapter ? [chapter.title, chapter.line] : null;
  }
  function clearRemotes() { for (const r of remotes.values()) { r.body.rig.dispose(); r.label.remove(); } remotes.clear(); }
  function resetStream() { tracks.clear(); decoder.reset(); latestFrame = null; receivedFrames = 0; playback = null; ready = false; lastPose = 0; pendingExecution = null; deferredStart = null; }
  function leave(message = '') {
    intentionalClose = true; socket?.close(); socket = null;
    connected = false; self = leader = null; session = null; loaded = false; starting = false; resetStream(); clearRemotes();
    finale.cancelEnding();
    heldActivity.clear(); activityPending = false; lastActivitySent = -Infinity;
    party.classList.add('hidden'); panel.classList.add('hidden');
    if (Game.player) Game.clearActors();
    Game.loading = 0; el('loading').classList.remove('show'); Game.showMenu('main');
    if (message) { show(); el('lobbyStatus').textContent = message; el('lobbyLeave').textContent = 'Back to main menu'; }
  }
  async function join() {
    if (connected) { show(); return; }
    if (starting) return;
    starting = true; intentionalClose = false; show(); notice('');
    el('lobbyStatus').textContent = 'Connecting to the public lobby…';
    el('lobbyLeave').textContent = 'Leave lobby';
    try {
      if (!/^https?:$/.test(location.protocol)) throw new Error('Open the game’s home server link to join the public lobby.');
      const response = await fetch('/api/lobby', { cache: 'no-store', signal: AbortSignal.timeout(C.connectTimeout) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('The public lobby is available on the home server link. This address only hosts solo play.');
      const info = await response.json();
      if (info.players >= info.capacity) throw new Error(`The public lobby is full (${info.capacity} players). Try again when a place opens.`);
      const pageBuild = document.querySelector('meta[name="arena-build"]')?.content;
      if (info.version !== VERSION || pageBuild !== info.build) throw new Error('The game has updated. Reload this page before joining.');
      if (!starting) return;
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${C.path}`);
      const joining = socket;
      const deadline = setTimeout(() => { if (joining === socket && !connected) { leave('The lobby did not respond. Try joining again.'); } }, C.connectTimeout);
      socket.onopen = () => { if (socket === joining) send({ type: 'hello', protocol: C.protocol, build: info.build, name: el('lobbyName').value }); };
      socket.onmessage = event => { if (socket !== joining) return; try { receive(JSON.parse(event.data)); } catch (e) { console.error('Lobby update failed', e); leave('The game could not read a lobby update. Reload and rejoin.'); } };
      socket.onclose = e => { clearTimeout(deadline); if (socket !== joining) return; if (!intentionalClose) leave(e.reason || 'Disconnected from the lobby. Rejoin to continue.'); };
      socket.onerror = () => { if (!connected) notice('Could not connect. The lobby may be full or the server may be unavailable.'); };
    } catch (e) { starting = false; el('lobbyStatus').textContent = e.message; }
  }
  function updateRoster() {
    const owner = connected && self === leader;
    if (connected) el('lobbyStatus').textContent = leader ? 'Connected. Anyone with this link can join.' : 'No active leader. Press a key, move the mouse or use your controller to lead.';
    el('lobbyLeader').hidden = !owner;
    el('lobbyResume').hidden = !active();
    el('lobbyRestart').disabled = !session;
    el('lobbyNext').disabled = !session || !!(session.campaign && (!latestFrame?.complete || !session.campaign.next));
    el('lobbyNext').textContent = session?.campaign ? 'Next chapter' : 'Next level';
    el('lobbyRestart').textContent = session?.campaign ? 'Restart chapter' : 'Restart level';
    el('lobbyReturn').disabled = !session;
    el('lobbyStart').disabled = !connected;
    el('lobbyPlayers').textContent = '';
    for (const p of roster) {
      const row = document.createElement('div'); row.className = 'lobby-player';
      const name = document.createElement('span'); name.textContent = `${p.name}${p.id === self ? ' (you)' : ''}${p.id === leader ? ' · Leader' : ''}`; row.appendChild(name);
      if (owner && p.id !== self) for (const [text, action] of [['Make leader', 'transfer'], ['Remove', 'kick']]) {
        const button = document.createElement('button'); button.textContent = text;
        button.onclick = () => control(action, { player: p.id }); row.appendChild(button);
      }
      el('lobbyPlayers').appendChild(row);
    }
    updateStatus();
  }
  function updateStatus() {
    const buffered = latestFrame && playback !== null ? Math.max(0, Math.round((latestFrame.time - playback) * 1000)) : 0;
    const road = session?.campaign;
    const chapter = road ? `\n${road.name} · Chapter ${road.number}/${road.total}${latestFrame?.complete && !road.next ? ' · Complete' : ''}` : '';
    party.textContent = `PUBLIC LOBBY · ${roster.length} players${ping === null ? '' : ` · ${ping} ms ping`}${chapter}\n${roster.map(p => p.name + (p.id === leader ? ' ♛' : '')).join(' · ')}\n${buffered} ms playback · Escape for lobby`;
    party.style.whiteSpace = 'pre-line'; party.classList.toggle('hidden', !active());
  }
  function receive(msg) {
    if (msg.type === 'welcome') {
      connected = true; starting = false; self = msg.id; leader = msg.leader; roster = msg.players; catalog = msg.catalog;
      activityPending = false; lastActivitySent = -Infinity; heldActivity.clear();
      const select = el('lobbyAdventure'); select.textContent = '';
      for (const [label, kind, entries] of [['Full campaigns', 'campaign', catalog.campaigns], ['Individual levels', 'level', catalog.levels], ['Arena opponents', 'arena', catalog.bosses]]) {
        const group = document.createElement('optgroup'); group.label = label;
        for (const entry of entries) { const option = document.createElement('option'); option.value = `${kind}/${entry.id}`; option.textContent = entry.name + (kind === 'campaign' ? ` · Full campaign (${entry.chapters} chapters)` : ''); group.appendChild(option); }
        select.appendChild(group);
      }
      select.value = `${catalog.defaultAdventure.kind}/${catalog.defaultAdventure.id}`;
      el('lobbyStatus').textContent = 'Connected. Anyone with this link can join.'; updateRoster();
    } else if (msg.type === 'roster') {
      roster = msg.players; leader = msg.leader; updateRoster();
      if (msg.notice) notice(msg.notice);
    } else if (msg.type === 'start') {
      finale.cancelEnding();
      session = msg.session; loaded = false; seq = 0; resetStream(); clearRemotes();
      const current = session;
      Game.story = false; Game.eldenBoss = null; panel.classList.add('hidden');
      const data = (session.kind === 'level' ? catalog.levels : catalog.bosses).find(x => x.id === session.id);
      el('lobbyAdventure').value = session.campaign ? `campaign/${session.campaign.id}` : `${session.kind}/${session.id}`;
      const begin = () => {
        if (session !== current || !connected) return;
        if (Game.pendingLoad) { deferredStart = begin; return; }
        Game.loadingFirst(...(chapterCard(session.id) || [data?.name || 'Public lobby', 'Playing together']), () => {
          if (session !== current || !connected) return;
          if (session.kind === 'level') Game.startLevel(session.id); else Game.startFight(session.id);
          Game.spawn = { ...session.spawn }; Game.spawnPlayer();
          for (const e of Game.enemies) e.netId = e.key || 'duel/' + e.baseDef.id;
          loaded = true; updateRoster();
        });
      };
      begin();
    } else if (msg.type === 'stop') {
      finale.cancelEnding();
      session = null; loaded = false; resetStream(); clearRemotes(); Game.loading = 0; el('loading').classList.remove('show');
      if (Game.player) Game.clearActors(); Game.showMenu('main'); show(); notice(msg.message || 'The leader returned everyone to the lobby.');
    } else if (msg.type === 'frame' && active() && ready && msg.frame.epoch === session.epoch) {
      const packet = decoder.decode(msg), frame = packet.frame;
      if (latestFrame && frame.time <= latestFrame.time) return;
      latestFrame = frame; receivedFrames++; updateRemotes(packet.players || []);
      for (const s of frame.enemies) {
        let track = tracks.get(s.id);
        if (!track) {
          track = new ArenaNet.EnemyTrack(); tracks.set(s.id, track);
          if (s.attack && [ES.WINDUP, ES.ACTIVE].includes(s.state)) {
            const e = Game.enemies.find(e => e.netId === s.id); if (e) e.netJoinSerial = s.serial;
          }
        }
        track.push({ time: frame.time, value: s, events: frame.events.filter(d => d.enemy === s.id), shots: frame.shots.filter(d => d.enemy === s.id) });
        if (track.samples.length > C.maxHistory || frame.time - track.time > C.historySeconds) { leave('Your connection fell behind. Rejoin to resume with complete attack telegraphs.'); return; }
      }
      applyProgress(frame, msg.full);
    } else if (msg.type === 'checkpoint' && active()) { session.spawn = msg.spawn; Game.spawn = { ...msg.spawn }; }
    else if (msg.type === 'execution' && active()) {
      const e = Game.enemies.find(e => e.netId === msg.enemy);
      if (msg.accepted && pendingExecution === msg.enemy && e && Game.player.alive()) {
        grantedEnemy = msg.enemy; execution.start(Game.player, e); grantedEnemy = null;
      } else if (!msg.accepted) notice('Another player took that execution, or the opening has ended.');
      pendingExecution = null;
    } else if (msg.type === 'pong') { ping = Math.max(0, Math.round(performance.now() - msg.sent)); updateStatus(); }
    else if (msg.type === 'error') notice(msg.message);
  }
  function capturePose(p) {
    return { x: p.x, y: p.y, z: p.z, yaw: p.yaw, hp: p.hp, state: p.state, stateTime: p.stateTime,
      attack: p.attack?.id || null, attackT: p.attackT, charge: p.charge, chargeT: p.chargeT,
      walkPhase: p.walkPhase, grounded: p.grounded, execEnemy: p.exec?.enemy.netId || null,
      vx: p.vx, vy: p.vy, vz: p.vz, activeAt: Number.isFinite(p.activeAt) ? p.activeAt : -1,
      landTime: p.landTime, stunTime: p.stunTime };
  }
  function heartbeat(now) {
    if (!connected) return;
    if (heldActivity.size && document.visibilityState !== 'hidden') activityPending = true;
    flushActivity(now);
    if (deferredStart && !Game.pendingLoad) { const start = deferredStart; deferredStart = null; start(); }
    if (active() && !ready && Game.loading <= 0) { ready = true; send({ type: 'ready', epoch: session.epoch }); }
    if (active() && ready && now >= lastPose) {
      const interval = 1000 / C.playerRate;
      lastPose = lastPose && lastPose + interval > now ? lastPose + interval : now + interval;
      send({ type: 'pose', epoch: session.epoch, pose: capturePose(Game.player) });
    }
    if (now - lastPing >= C.pingInterval) { lastPing = now; send({ type: 'ping', sent: now }); }
    if (now - lastStats >= C.metricsInterval) { lastStats = now; updateStatus(); }
  }
  function updateRemotes(list) {
    const ids = new Set();
    for (const s of list) {
      if (s.id === self) continue;
      ids.add(s.id);
      let r = remotes.get(s.id);
      if (!r) {
        const body = new Player(PLAYER_DEF, s.x, s.z, s.yaw, s.y), label = document.createElement('div');
        label.className = 'online-name'; document.body.appendChild(label);
        r = { body, label, samples: [] }; remotes.set(s.id, r);
      }
      if (r.poseSeq !== s.poseSeq) { r.samples.push({ ...s, at: performance.now() / 1000 }); r.poseSeq = s.poseSeq; }
      while (r.samples.length > C.maxHistory) r.samples.shift();
      r.label.textContent = s.name + (s.hp <= 0 ? ' · returning to checkpoint' : '');
    }
    for (const [id, r] of remotes) if (!ids.has(id)) { r.body.rig.dispose(); r.label.remove(); remotes.delete(id); }
  }
  function sampleEnemies(dt) {
    if (!latestFrame) return;
    let oldest = latestFrame.time;
    for (const [id, track] of tracks) {
      const view = track.advance(dt), e = Game.enemies.find(e => e.netId === id);
      if (!view || !e) continue;
      const { a, b, time, alpha } = view, s = a.value, q = b.value;
      oldest = Math.min(oldest, time);
      track.pendingEvents = (track.pendingEvents || []).concat(view.crossed);
      // Advance the stream while holding the victim locally; its death/phase
      // still cannot appear before this player's execution animation finishes.
      if (Game.player.exec?.enemy === e) { e.stateTime += dt; continue; }
      const priorState = e.state;
      if (e.phase !== s.phase && s.phase >= 0) e.enterPhase(s.phase);
      e.x = lerp(s.x, q.x, alpha); e.y = lerp(s.y, q.y, alpha); e.z = lerp(s.z, q.z, alpha);
      e.yaw = s.yaw + angDiff(q.yaw, s.yaw) * alpha;
      e.state = s.state;
      e.stateTime = s.state === q.state && s.serial === q.serial && s.hitIndex === q.hitIndex
        ? lerp(s.stateTime, q.stateTime, alpha) : s.stateTime + Math.max(0, time - a.time);
      e.holdLeft = s.holdLeft; e.retreatHop = s.retreatHop; e.blinkLeft = s.blinkLeft;
      e.vx = s.vx; e.vy = s.vy; e.vz = s.vz;
      e.hp = s.hp; e.posture = s.posture; e.guardMeter = s.guardMeter; e.poise = s.poise;
      e.attack = s.attack ? e.baseDef.attacks.find(x => x.id === s.attack) : null;
      e.hitIndex = s.hitIndex; e.netSerial = s.serial; e.netTarget = s.target; e.grounded = s.grounded;
      e.walkPhase = s.walkPhase; e.leaping = s.leaping; e.asleep = false;
      e.tint = Math.max(0, e.tint - dt / CONFIG.fx.tintTime);
      if (e.netParried === s.serial && [ES.WINDUP, ES.ACTIVE].includes(s.state)) { e.state = ES.PARRIED; e.stateTime = 0; }
      const boxKey = `${s.serial}/${s.hitIndex}`;
      if (s.hitbox && e.state === ES.ACTIVE && e.attack && e.netParried !== s.serial && e.netJoinSerial !== s.serial) {
        if (e.netBoxKey !== boxKey || !e.hitbox) {
          const hit = e.attack.hits[s.hitIndex];
          e.hitbox = new Hitbox(e, hit.box || e.attack.box, hit.damage ? { ...makeStrike(e.attack), damage: hit.damage } : makeStrike(e.attack)); e.netBoxKey = boxKey;
        }
      } else e.hitbox = null;
      if (e.state === ES.DEAD && priorState !== ES.DEAD && !e.rewarded) { e.rewarded = true; events.emit('enemyDeath', { enemy: e }); }
      for (const sample of track.pendingEvents) presentEvents(sample);
      track.pendingEvents = [];
    }
    playback = oldest;
  }
  // Progress is authoritative and immediate; it never waits behind an enemy's
  // personal presentation clock. Animate gates on every simulation step.
  function applyProgress(frame, initial) {
    for (const s of frame.gates) {
      const g = world.gates.find(g => g.id === s.id); if (!g) continue;
      const opened = g.netOpen === false && s.open; g.netOpen = s.open;
      const entry = (Game.level.sealed || []).find(x => x.id === s.id && x.fog);
      const zone = entry && Game.zones.find(z => z.id === entry.fog);
      g.open = s.open || !!(zone && !inArea(zone.trigger, Game.player.x, Game.player.z));
      if (initial) g.lift = g.open ? 1 : 0;
      if (opened && !entry) events.emit('gateOpened', { gate: g });
    }
    for (const s of frame.traps) {
      const t = world.traps.find(t => t.id === s.id); if (!t) continue;
      if (s.state === 'sprung' && t.state !== 'sprung') { world.openHole(t.region, t.collapse); events.emit('trapSprung', { trap: t }); }
      else if (s.state === 'warning' && t.state === 'set') events.emit('trapWarning', { trap: t });
      Object.assign(t, s);
    }
    if (frame.complete && !Game.complete) {
      Game.complete = true;
      if (Game.kind === 'level') events.emit('levelComplete');
      updateRoster();
      if (session.campaign) notice(session.campaign.next ? 'Chapter complete. Everyone continues to the next chapter automatically.' : session.campaign.done);
    }
  }
  function animateGates(dt) {
    for (const g of world.gates) {
      const entry = (Game.level.sealed || []).find(x => x.id === g.id && x.fog);
      const zone = entry && Game.zones.find(z => z.id === entry.fog);
      if (g.netOpen !== undefined) g.open = g.netOpen || !!(zone && !inArea(zone.trigger, Game.player.x, Game.player.z));
      g.lift = g.open ? Math.min(1, g.lift + dt / CONFIG.level.gateLiftTime)
        : Math.max(0, g.lift - dt / CONFIG.finale.fogClose);
    }
  }
  function presentEvents(sample) {
    for (const d of sample.events) {
      const e = Game.enemies.find(e => e.netId === d.enemy);
      if (d.type === 'strike' && d.player !== self && e) {
        const attacker = remotes.get(d.player)?.body;
        if (attacker) events.emit('strike', { ...d, attacker, target: e });
      } else if (d.type === 'parry' && d.player !== self && e) events.emit('parry', { target: e });
      if (['attackStart', 'attackPhase', 'bossPhase', 'bossRetreat', 'bossGone', 'enemyBlink', 'postureBreak'].includes(d.type) && e) {
        const attack = sample.value.attack ? e.baseDef.attacks.find(a => a.id === sample.value.attack) : e.attack;
        events.emit(d.type, { enemy: e, actor: e, attack, phase: PHASE.ACTIVE, hitIndex: d.hitIndex, seamless: d.seamless, out: d.out });
      } else if (d.type === 'impact') events.emit('impact', { ...d, enemy: e });
    }
    for (const shot of sample.shots) {
      const e = Game.enemies.find(e => e.netId === shot.enemy), attack = e?.baseDef.attacks.find(a => a.id === shot.attack);
      if (e && attack) projectiles.fire(e, attack, shot.target);
    }
  }

  function update(dt) {
    const p = Game.player, c = Game.cam;
    p.savePrev(); for (const e of Game.enemies) e.savePrev(); c.prevPos.copy(c.pos); c.prevLook.copy(c.look);
    sampleEnemies(dt);
    animateGates(dt);
    // Credits may outlast the replay buffer. Consume the shared stream at the
    // normal fixed step while leaving personal movement/combat at the ending.
    if (Game.mode === 'ending') return;
    if (!p.alive()) {
      Game.deathTimer += dt;
      if (Game.deathTimer >= CONFIG.death.respawnDelay) { Game.spawnPlayer(); Game.setLock(null); Game.retarget = true; events.emit('respawn', { player: Game.player }); }
      else p.update(dt, { x: 0, z: 0, has: false }, [], null);
    } else if (Game.hitstop > 0) { Game.hitstop = Math.max(0, Game.hitstop - dt); input.hold(dt); }
    else {
      if (Game.mode === 'play') Game.updateLock(dt);
      if (input.peek('rest') && Game.restWins()) { input.consume('rest'); Game.tryRest(); }
      p.update(dt, Game.mode === 'play' ? Game.moveInput() : { x: 0, z: 0, has: false }, Game.enemies.filter(e => e.alive()), Game.lock);
      // The server owns enemy positions. Other players have no body blocking.
      for (const e of Game.enemies) if (e.state !== ES.EXECUTED) separatePair(p, e, 1);
      resolveCombat(Game); execution.mark(p, Game.enemies);
      if (!p.alive()) Game.onPlayerDeath();
    }
    projectiles.update(Game, dt);
    if (Game.kind === 'level') { lore.update(Game, dt); updateHazards(dt); finale.updateOnline(Game, dt); }
    Game.updateCamera(dt, false);
    if (!Game.player.alive() && Game.deathTimer === 0) Game.onPlayerDeath();
  }
  function updateHazards(dt) {
    const p = Game.player;
    if (!p.alive() || p.invulnerable()) return;
    for (const h of world.hazards || []) if (p.grounded && inRect(h.rect, p.x, p.z) && Math.abs(p.y - h.y) <= CONFIG.height.stepUp) {
      p.hp = Math.max(0, p.hp - h.dps * dt);
      if (p.hp <= 0) { p.setState(PS.DEAD); Game.onPlayerDeath(); }
    }
  }
  function render(game, placed) {
    if (!active()) return;
    const now = performance.now() / 1000 - C.interpolation;
    for (const r of remotes.values()) {
      while (r.samples.length > 1 && r.samples[1].at <= now) r.samples.shift();
      const a = r.samples[0], b = r.samples[1] || a; if (!a) continue;
      const f = a === b ? 0 : clamp((now - a.at) / (b.at - a.at), 0, 1), p = r.body;
      p.x = lerp(a.x, b.x, f); p.y = lerp(a.y, b.y, f); p.z = lerp(a.z, b.z, f); p.yaw = a.yaw + angDiff(b.yaw, a.yaw) * f;
      p.state = a.state; p.stateTime = a.stateTime + Math.max(0, now - a.at); p.hp = a.hp; p.attackT = a.attackT + (a.charge === 1 ? 0 : Math.max(0, now - a.at));
      p.attack = PLAYER_DEF.moveset.attacks[a.attack] || null; p.charge = a.charge; p.chargeT = a.chargeT + (a.charge === 1 ? Math.max(0, now - a.at) : 0); p.walkPhase = a.walkPhase;
      p.vx = a.vx; p.vy = a.vy; p.vz = a.vz;
      p.usingItem = ITEMS.flask; p.landTime = a.landTime; p.stunTime = a.stunTime;
      p.activeAt = a.activeAt < 0 ? Infinity : a.activeAt;
      p.exec = a.execEnemy ? { enemy: Game.enemies.find(e => e.netId === a.execEnemy), aim: 0 } : null;
      if ([PS.ATTACK, PS.JUMP_ATTACK, PS.LAND, PS.EXECUTE].includes(p.state) && !p.attack) p.state = PS.IDLE;
      const visible = Math.hypot(p.x - game.player.x, p.z - game.player.z) < C.remoteRange;
      p.rig.root.visible = p.rig.shadow.visible = visible;
      if (!visible) { r.label.hidden = true; continue; }
      p.rig.place(p.x, p.y, p.z, p.yaw, world.groundAt(p.x, p.z, p.y + 0.05));
      p.pose(p.stateTime, { t: performance.now() / 1000, dt: CONFIG.step, yaw: p.yaw, px: game.player.x, pz: game.player.z });
      placed.push([p, { x: p.x, y: p.y, z: p.z, yaw: p.yaw }]);
      const v = new THREE.Vector3(p.x, p.y + p.height, p.z).project(camera);
      r.label.hidden = v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1;
      r.label.style.left = `${(v.x + 1) * innerWidth / 2}px`; r.label.style.top = `${(1 - v.y) * innerHeight / 2}px`;
    }
  }
  function hit(e, strike) {
    const hb = Game.player.hitbox;
    if (!hitIds.has(hb)) hitIds.set(hb, String(++swing));
    command('hit', { enemy: e.netId, attack: strike.attackId, swing: hitIds.get(hb), charge: strike.charge || 0, riposte: strike.riposte });
    e.tint = 1; e.recoil = 1;
    return { blocked: e.guarding() && isInFront(e, Game.player.x, Game.player.z), broke: false, died: false };
  }
  function parry(e) { command('parry', { enemy: e.netId, serial: e.netSerial }); e.netParried = e.netSerial; return e.getParried(); }
  function lifesteal(e) { command('lifesteal', { enemy: e.netId, serial: e.netSerial, hitIndex: e.hitIndex }); }
  function requestExecution(e) { if (!pendingExecution) { pendingExecution = e.netId; command('execute', { enemy: e.netId }); } }
  function rest(b) {
    const p = Game.player; p.hp = p.maxHp; p.stamina = p.maxStamina; p.refillItems(); p.vx = p.vz = 0; p.setState(PS.REST);
    command('rest', { bonfire: b.id }); hud.showRested(); events.emit('rest', { bonfire: b });
  }
  el('lobbyLeave').onclick = () => leave(); el('lobbyResume').onclick = hide;
  el('lobbyStart').onclick = () => { const value = el('lobbyAdventure').value, slash = value.indexOf('/'); control('start', { kind: value.slice(0, slash), id: value.slice(slash + 1) }); };
  el('lobbyRestart').onclick = () => control('restart'); el('lobbyReturn').onclick = () => control('lobby'); el('lobbyNext').onclick = () => control('next');
  el('lobbyName').onchange = () => { const name = ArenaNet.name(el('lobbyName').value); el('lobbyName').value = name; try { localStorage.setItem('combatArena.onlineName', name); } catch {} send({ type: 'name', name }); };
  function pad(pressed) {
    if (pressed.includes('PadB') && active()) { hide(); return; }
    const focus = document.activeElement;
    if (focus?.tagName === 'SELECT' && pressed.some(c => c === 'PadLeft' || c === 'PadRight')) {
      focus.selectedIndex = clamp(focus.selectedIndex + (pressed.includes('PadRight') ? 1 : -1), 0, focus.options.length - 1);
      return;
    }
    const controls = [...panel.querySelectorAll('button,input,select')].filter(e => !e.disabled && !e.hidden && e.offsetParent);
    const current = controls.indexOf(document.activeElement);
    if (pressed.some(c => ['PadDown', 'PadRight', 'PadUp', 'PadLeft'].includes(c))) {
      const dir = pressed.includes('PadDown') || pressed.includes('PadRight') ? 1 : -1;
      controls[(current + dir + controls.length) % controls.length]?.focus();
    }
    if (pressed.includes('PadA') && document.activeElement?.tagName === 'BUTTON') document.activeElement.click();
  }
  events.on('executionEnd', d => { if (active() && d.player === Game.player) command('executionEnd', { enemy: d.enemy.netId }); });
  Game.renderHooks.push(render);
  return { join, leave, show, hide, active, chapterCard, heartbeat, activity, update, hit, parry, lifesteal, rest, requestExecution, pad,
    get campaign() { return connected ? session?.campaign || null : null; },
    get connected() { return connected; }, get grantedEnemy() { return grantedEnemy; }, get panelOpen() { return !panel.classList.contains('hidden'); },
    get info() { return { self, leader, connected, ready, session, players: roster, ping, playback,
      frames: Math.max(0, ...[...tracks.values()].map(t => t.samples.length)), receivedFrames, remotes: remotes.size,
      playbackDelayMs: latestFrame && playback !== null ? Math.max(0, (latestFrame.time - playback) * 1000) : 0, server: latestFrame?.server }; },
  };
})();
