'use strict';
// ============================================================================
// Replays of multiplayer runs: the viewer (PLAN.md "replays")
// ============================================================================
// The replay door's /watch page (server/replays.cjs, tailnet only) is the game's own page with <meta name="arena-replay">:
// it boots here instead of the title. A run streams from /api/runs/<id>/stream as lines: `start` (a fight's session and
// who is there), `f` (one snapshot as the players got it: the server's state and every player's pose, delta-encoded),
// `roster`, `mark` (the timeline's moments) and `end`. Nothing is simulated: the arena is built by Game.startFight, the
// enemies are put where the snapshots say by js/net-view.js (the online client's own code), each player is a body of
// their own, and the clock is the recording's. An id this release no longer has plays as a plain stand-in.
const replayView = (() => {
  const enabled = !!document.querySelector('meta[name="arena-replay"]');
  const SPEEDS = [0.25, 0.5, 1, 2, 4, 8], KEY_EVERY = 60, FORWARD = 90, PICK_PX = 70, STAND_IN = 'hollow', SELF = '\u0000replay';
  const PREFS = 'arena-replay-prefs', SPOTS = 'arena-replay-spots', HINT = 'arena-replay-hint';
  const store = {
    get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v ?? fallback; } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private window: nothing kept */ } },
  };
  // ---- the run, as it streams in ----
  let id = null, card = null, chapters = [], marks = [], end = null, damaged = null, live = false, lines = 0, lastT = 0;
  let streaming = false, streamFailed = 0, pollTimer = null, gone = false, pulled = false;   // pulled: the first stream has ended
  // ---- playback ----
  let active = false, T = 0, Tprev = 0, playing = false, speed = 1, built = null, building = false, finished = false;
  let cur = null;   // { ch, dec, ia, a, b, decodedTo }: frames ia (a) and ia + 1 (b) decoded, around T
  let embersOf = null, stamp = 0, scrubbing = false, whoDirty = false, orbitReady = false;
  const bodies = new Map();   // player id -> { body, label, text, look, s, q, pair }
  const enemyOf = new Map();  // recorded enemy id -> the Enemy drawn for it
  const crossed = [];
  const ctx = { self: SELF, bodyOf: id => bodies.get(id)?.body || null };
  const rushView = { fight: 1, crowned: false, modifiers: [], clock: 0, par: 0 };
  // ---- camera ----
  let camMode = 'follow', followId = null;
  const orbit = { x: 0, y: 1.2, z: 0, yaw: 0, pitch: 0.42, dist: 9 };
  const chase = { pos: new THREE.Vector3(), ready: false };
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), look = new THREE.Vector3();
  const focusPoint = { x: 0, y: 0, z: 0 };

  const clock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
  const duration = () => end ? end.t : Math.max(lastT, live ? lastT : card?.duration || 0);
  const nameOf = pid => { for (let i = chapters.length - 1; i >= 0; i--) { const p = chapters[i].roster.find(r => r.id === pid); if (p) return p.name; } return bodies.get(pid)?.name || 'A player'; };
  const enemyName = def => ENEMY_BY_ID[def]?.name || String(def || '').replace(/[-_]/g, ' ');
  function attackName(key) {
    const [def, atk] = String(key).split('/'), d = ENEMY_BY_ID[def];
    const a = d && (d.attacks || []).find(x => x.id === atk);
    return { boss: enemyName(def), attack: a?.name || String(atk || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ') };
  }

  // ============================================================================ the stream
  async function pull() {
    if (streaming || gone) return;
    streaming = true; clearTimeout(pollTimer);
    let ok = false;
    try {
      const res = await fetch(`/api/runs/${encodeURIComponent(id)}/stream?from=${lines}`, { cache: 'no-store' });
      if (res.status === 404) { gone = true; return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      live = res.headers.get('X-Run-Live') === '1';
      const reader = res.body.getReader(), text = new TextDecoder();
      let rest = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        rest += text.decode(value, { stream: true });
        const parts = rest.split('\n'); rest = parts.pop();
        for (const line of parts) if (line) take(line);
        ui.changed();
      }
      rest += text.decode();
      if (rest.trim()) take(rest);
      ok = true; streamFailed = 0;
    } catch (e) {
      streamFailed++;
    } finally {
      streaming = false; pulled = true;
      ui.changed();
      if (!gone && (!ok || live && !end) && !damaged) {
        // A live run goes on arriving; a dropped connection is tried again, a little later each time.
        const wait = ok ? 3000 : Math.min(30000, 2000 * 2 ** Math.min(4, streamFailed - 1));
        pollTimer = setTimeout(() => { if (document.visibilityState === 'visible') pull(); else pollWhenSeen = true; }, wait);
      }
      if (ok && end && card?.live) refreshCard();
    }
  }
  let pollWhenSeen = false;
  document.addEventListener('visibilitychange', () => {
    if (!enabled || document.visibilityState !== 'visible') return;
    if (pollWhenSeen) { pollWhenSeen = false; pull(); }
  });
  async function refreshCard() {
    try { const res = await fetch(`/api/runs/${encodeURIComponent(id)}`, { cache: 'no-store' }); if (res.ok) { card = await res.json(); ui.changed(true); } } catch (e) { /* the old card stands */ }
  }
  function take(line) {
    let m;
    try { m = JSON.parse(line); } catch (e) { damaged = damaged || 'The rest of this run could not be read.'; return; }
    if (m.k === 'damaged') { damaged = m.error || 'The rest of this run could not be read.'; return; }
    lines++;
    if (m.k === 'start') {
      chapters.push({ fight: m.fight, t0: m.t, session: m.session || {}, roster: Array.isArray(m.roster) ? m.roster : [], frames: [], times: [], keys: [], dec: new ArenaNet.FrameDecoder(), broken: false });
      lastT = Math.max(lastT, m.t);
    } else if (m.k === 'f') {
      const ch = chapters[chapters.length - 1];
      if (!ch || ch.broken || !m.m?.frame) return;
      const i = ch.frames.length;
      // A seek restores the decoder from the nearest key at or before it: its state before that frame.
      if (i % KEY_EVERY === 0) ch.keys.push({ i, epoch: ch.dec.epoch, groups: cloneGroups(ch.dec.groups) });
      try { ch.dec.decode(m.m); } catch (e) { ch.broken = true; ch.keys.length = Math.min(ch.keys.length, Math.ceil(i / KEY_EVERY)); return; }   // the keys before the frame that failed
      // Kept as its line (parsed again when played): an hour's run stays a few tens of MB on a phone.
      ch.frames.push(line); ch.times.push(m.t);
      lastT = Math.max(lastT, m.t);
    } else if (m.k === 'roster') {
      const ch = chapters[chapters.length - 1];
      if (ch && Array.isArray(m.players)) for (const p of m.players) if (!ch.roster.some(r => r.id === p.id)) ch.roster.push(p);
    } else if (m.k === 'mark') marks.push(m);
    else if (m.k === 'end') { end = m; lastT = Math.max(lastT, m.t); }
  }
  const cloneGroups = g => { const out = {}; for (const k in g) out[k] = new Map(g[k]); return out; };

  // ============================================================================ building a fight
  function chapterAt(t) {
    let c = null;
    for (const ch of chapters) if (ch.frames.length && (ch.t0 <= t || !c)) c = ch;
    return c;
  }
  function frameIndex(ch, t) {
    let lo = 0, hi = ch.frames.length - 1;
    if (hi < 0 || ch.times[0] > t) return 0;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ch.times[mid] <= t) lo = mid; else hi = mid - 1; }
    return lo;
  }
  const known = id => ENEMY_BY_ID[id] ? id : STAND_IN;
  // The fight's arena and bosses, as the online client builds them; `drop`: at once, as Boss Rush's next boss drops in.
  function build(ch, drop) {
    const s = ch.session, ids = [s.id, ...(s.partners || [])];
    const fightName = () => `Fight ${s.gauntlet?.number ?? ch.fight + 1}: ${ids.map(x => enemyName(x)).join(' & ')}`;
    const go = () => {
      Game.startFight(known(ids[0]), ids.slice(1).map(known));
      // startFight shows a practice duel's card: the replay keeps its own over the fade.
      document.getElementById('loadName').textContent = card?.mode === 'weekly' ? 'Weekly Run' : 'Boss Rush';
      document.getElementById('loadTip').textContent = fightName();
      if (s.spawn) { Game.spawn = { ...s.spawn }; Game.spawnPlayer(); }
      const proxy = Game.player; proxy.execGrace = 1e9;   // the hidden stand-in for "the player": nothing ever strikes it
      enemyOf.clear();
      Game.enemies.forEach((e, i) => {
        e.netId = 'duel/' + (ids[i] ?? e.baseDef.id); enemyOf.set(e.netId, e);
        const k = e.isBoss() && s.health && Object.hasOwn(s.health, ids[i]) ? Number(s.health[ids[i]]) : 1;
        if (k > 0 && k < 1) e.setHealth(k);
      });
      built = ch; cur = null; embersOf = null; chase.ready = false; projectiles.clear(); revive.clear();
      for (const r of bodies.values()) r.body.savePrev();
      building = false;
      sync(false);
      if (drop) { Game.loading = 0; document.getElementById('loading').classList.remove('show'); }
      ui.changed(true);
      if (ids.some(x => !ENEMY_BY_ID[x])) ui.say("This fight's boss is no longer in the game: a stand-in plays its part.", 5000);
    };
    building = true;
    if (drop) go();
    else Game.loadingFirst(card?.mode === 'weekly' ? 'Weekly Run' : 'Boss Rush', fightName(), go);
  }

  // ============================================================================ the clock
  function packet(ch, i) { const f = JSON.parse(ch.frames[i]), p = cur.dec.decode(f.m); p.t = f.t; return p; }
  // Puts the world at T. `present`: the moments crossed since the last step are shown (blows, parries, sounds); a jump
  // shows none of them.
  function sync(present) {
    const ch = chapterAt(T);
    if (!ch) return false;
    if (ch !== built) {
      if (!building && !scrubbing) build(ch, present && !!built && Game.mode === 'play');
      return false;
    }
    const j = frameIndex(ch, T);
    crossed.length = 0;
    if (cur && cur.ch === ch && j >= cur.ia && j - cur.ia <= FORWARD) {
      while (cur.ia < j) {
        if (cur.b) { cur.a = cur.b; cur.b = null; } else cur.a = packet(ch, ++cur.decodedTo);
        cur.ia++;
        if (present) crossed.push(cur.a);
      }
    } else {
      // A jump back past a fallen boss rebuilds the fight: a death is not undone on the body that played it.
      if (cur && cur.ch === ch && j < cur.ia && Game.enemies.some(e => e.rewarded)) { build(ch, true); return false; }
      const key = ch.keys.reduce((best, k) => k.i <= j ? k : best, ch.keys[0]);
      const dec = new ArenaNet.FrameDecoder(); dec.epoch = key.epoch; dec.groups = cloneGroups(key.groups);
      cur = { ch, dec, ia: key.i, a: null, b: null, decodedTo: key.i - 1 };
      cur.a = packet(ch, ++cur.decodedTo);
      while (cur.ia < j) { cur.a = packet(ch, ++cur.decodedTo); cur.ia++; }
      embersOf = null;
    }
    if (!cur.b && cur.decodedTo + 1 < ch.frames.length && cur.decodedTo === cur.ia) cur.b = packet(ch, ++cur.decodedTo);
    apply(!present);
    for (const p of crossed) presentFrame(p);
    crossed.length = 0;
    return true;
  }
  function apply(jump) {
    const { a, b } = cur, f = b ? clamp((T - a.t) / Math.max(1e-6, b.t - a.t), 0, 1) : 0, since = Math.max(0, T - a.t);
    for (const e of Game.enemies) e.savePrev();
    for (const s of a.frame.enemies) {
      const e = enemyOf.get(s.id); if (!e) continue;
      let q = s;
      if (b) for (const x of b.frame.enemies) if (x.id === s.id) { q = x; break; }
      netView.enemy(e, s, q, f, since, ctx);
      if (jump) e.savePrev();
    }
    stamp++;
    for (const s of a.players) {
      const r = bodies.get(s.id) || addBody(s);
      let q = s;
      if (b) for (const x of b.players) if (x.id === s.id) { q = x; break; }
      r.stamp = stamp; r.s = s; r.q = q;
      r.body.savePrev();
      netView.body(r.body, s, q, f, since);
      if (jump) r.body.savePrev();
      const down = s.hp <= 0 || s.state === 'dead';
      if (r.down !== down) { r.down = down; whoDirty = true; r.label.classList.toggle('rv-name-down', down); }
      const label = s.name + (r.down ? ' · down' : '');
      if (r.text !== label) { r.text = label; r.name = s.name; r.labelText.textContent = label; r.tagW = 0; }
    }
    for (const [pid, r] of bodies) if (r.stamp !== stamp) { r.body.rig.dispose(); r.label.remove(); bodies.delete(pid); whoDirty = true; }
    if (!orbitReady) {   // the free camera's first place: over the middle of the fight
      const e = Game.enemies[0], p = Game.player;
      if (e && p) { orbit.x = (e.x + p.x) / 2; orbit.z = (e.z + p.z) / 2; orbit.y = Math.max(e.y, p.y) + 1.2; orbit.yaw = Math.atan2(p.x - e.x, p.z - e.z); orbit.dist = 13; orbitReady = true; }
    }
    if (!bodies.has(followId) && camMode === 'follow') followId = defaultFollow();
    if (a.frame.embers !== embersOf && (embersOf?.length || a.frame.embers?.length)) {
      embersOf = a.frame.embers;
      revive.set((embersOf || []).map(m => ({ ...m, saved: '', reviving: '', standIn: '' })), SELF);
    }
  }
  function presentFrame(p) {
    const fr = p.frame;
    for (const s of fr.enemies) {
      if (!enemyOf.has(s.id)) continue;
      let any = false;
      for (const d of fr.events || []) if (d.enemy === s.id) { any = true; break; }
      if (!any) for (const d of fr.shots || []) if (d.enemy === s.id) { any = true; break; }
      if (any) netView.events({ value: s, events: fr.events.filter(d => d.enemy === s.id), shots: (fr.shots || []).filter(d => d.enemy === s.id) }, ctx);
    }
    for (const d of fr.events || []) {
      if (d.type === 'abilityPower' && d.enemy == null) netView.ability(d, null, ctx);
      else if (d.type === 'revive') {
        const m = (fr.embers || []).find(m => m.id === d.player) || bodies.get(d.player)?.body;
        if (m) revive.burst(m.x, m.y, m.z);
        events.emit('revive', { x: m?.x ?? 0, y: m?.y ?? 0, z: m?.z ?? 0, self: false });
        hud.toast(`${nameOf(d.by)} revived ${nameOf(d.player)}`);
      }
    }
  }
  function addBody(s) {
    const body = new Player(PLAYER_DEF, s.x, s.z, s.yaw, s.y);
    const label = document.createElement('div'); label.className = 'online-name rv-name'; label.hidden = true;
    const labelText = document.createElement('span'); labelText.className = 'online-name-text'; label.appendChild(labelText);
    document.body.appendChild(label);
    const r = { body, label, labelText, text: '', name: s.name, s, q: s, stamp, down: false, pair: [body, { x: 0, y: 0, z: 0, yaw: 0 }] };
    bodies.set(s.id, r);
    ui.changed(true);
    return r;
  }
  const shownTags = [], byTagY = (a, b) => b.tagY - a.tagY, DOWN_TAG = 0.6;   // a downed body lies on the ground: its tag sits on it
  function clearBodies() { for (const r of bodies.values()) { r.body.rig.dispose(); r.label.remove(); } bodies.clear(); }
  function players() {
    // Everyone in the run, in the order they joined, bots last: the camera's choices.
    const seen = new Map();
    for (const ch of chapters) for (const p of ch.roster) if (!seen.has(p.id)) seen.set(p.id, p);
    return [...seen.values()].sort((a, b) => (a.bot ? 1 : 0) - (b.bot ? 1 : 0));
  }
  function defaultFollow() {
    const want = prefs.follow, list = players().filter(p => bodies.has(p.id));
    return (list.find(p => p.name === want) || list.find(p => !p.bot) || list[0])?.id || null;
  }

  function update(dt) {
    if (building || !built) { Tprev = T; return; }
    Tprev = T;
    const end1 = duration();
    if (playing && !scrubbing) {
      T = Math.min(T + dt * speed, Math.max(lastT, 0));
      if (T >= lastT - 1e-6) {
        if (end || !live && !streaming) { T = end1; if (!finished) { finished = true; playing = false; ui.finished(); } }
      }
    }
    sync(playing && !scrubbing && T - Tprev < 1);
    for (const e of Game.enemies) e.updateFeedback(dt);
    projectiles.update(Game, dt * (playing ? speed : 0));
    // The hidden stand-in for "the player" stands where the camera looks, so the lights and shadows follow the view.
    const p = Game.player, f = focus();
    if (p && f) { p.savePrev(); p.x = f.x; p.y = f.y; p.z = f.z; p.hp = p.maxHp; }
    ui.tick();
  }
  function focus() {
    if (camMode === 'follow') { const r = bodies.get(followId); if (r) return r.body; }
    focusPoint.x = orbit.x; focusPoint.y = orbit.y - 1.2; focusPoint.z = orbit.z;
    return focusPoint;
  }
  // T moves to `t` (clamped to what has arrived); `final` false while a finger drags the timeline across fights.
  // A moment still on its way (a long run streaming in) is waited for at the edge of what has arrived, then jumped to.
  let pendingT = -1;
  function seek(t, final = true) {
    const top = Math.max(0, lastT);
    pendingT = final && t > top + 0.5 && streaming ? t : -1;
    T = Tprev = clamp(t, 0, top);
    finished = false;
    if (!built || building) return;
    const ch = chapterAt(T);
    if (ch !== built && !final) { ui.changed(); return; }
    sync(false);
    ui.changed();
  }

  // ============================================================================ drawing
  function render(game, alpha, placed) {
    const p = game.player, now = performance.now() / 1000;
    if (p) p.rig.root.visible = p.rig.shadow.visible = false;
    const boss = game.enemies.find(e => e.alive()) || game.enemies[0];
    for (const r of bodies.values()) {
      const b = r.body, q = r.pair[1];
      q.x = lerp(b.px, b.x, alpha); q.y = lerp(b.py, b.y, alpha); q.z = lerp(b.pz, b.z, alpha); q.yaw = b.pyaw + angDiff(b.yaw, b.pyaw) * alpha;
      b.rig.root.visible = b.rig.shadow.visible = true;
      b.rig.place(q.x, q.y, q.z, q.yaw, world.groundAt(q.x, q.z, q.y + 0.05));
      b.pose(b.stateTime, { t: now, dt: game.renderDt || CONFIG.step, yaw: q.yaw, px: boss ? boss.x : q.x, pz: boss ? boss.z : q.z + 1 });
      placed.push(r.pair);
    }
    const Tr = Tprev + (T - Tprev) * alpha;
    placeCamera(Tr, game.renderDt || CONFIG.step);
    shownTags.length = 0;
    for (const r of bodies.values()) {
      const q = r.pair[1], v = v1.set(q.x, q.y + (r.down ? DOWN_TAG : r.body.height), q.z).project(camera);
      const hide = Game.loading > 0 || v.z < -1 || v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || camMode === 'follow' && r === bodies.get(followId) && viewing(r);
      if (r.label.hidden !== hide) r.label.hidden = hide;
      if (hide) continue;
      if (!r.tagW) { r.tagW = r.label.offsetWidth; r.tagH = r.label.offsetHeight + 2; }   // measured once per text
      r.tagX = clamp((v.x + 1) * innerWidth / 2, r.tagW / 2 + 4, innerWidth - r.tagW / 2 - 4); r.tagY = (1 - v.y) * innerHeight / 2; shownTags.push(r);
    }
    // Tags that would overlap stack upward, the lowest on screen keeping its place.
    shownTags.sort(byTagY);
    for (let i = 1; i < shownTags.length; i++) {
      const a = shownTags[i];
      for (let j = 0; j < i; j++) { const b = shownTags[j]; if (Math.abs(a.tagX - b.tagX) < (a.tagW + b.tagW) / 2 + 4 && a.tagY > b.tagY - b.tagH) a.tagY = b.tagY - b.tagH; }
    }
    for (const r of shownTags) { r.label.style.left = `${r.tagX}px`; r.label.style.top = `${r.tagY}px`; }
  }
  // Following a player whose camera was recorded (Boss Rush, alive): their own view, exactly as they saw it.
  const okView = v => v && Array.isArray(v.position) && v.position.length === 3 && Array.isArray(v.quaternion) && v.quaternion.length === 4 && Number.isFinite(v.fov);
  const viewing = r => okView(r.s.view);
  // As wide as the recorded 16:9 view on a narrower screen (a phone held upright), as js/showcase.js frames its shots.
  function setFov(v) {
    const wide = 16 / 9, fov = camera.aspect >= wide ? v : Math.min(100, 2 * Math.atan(Math.tan(v * Math.PI / 360) * wide / camera.aspect) * 180 / Math.PI);
    if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }
  function placeCamera(Tr, dt) {
    const r = camMode === 'follow' ? bodies.get(followId) : null;
    if (r && viewing(r)) {
      const av = r.s.view, bv = okView(r.q.view) ? r.q.view : av, a = cur?.a, b = cur?.b;
      const f = a && b ? clamp((Tr - a.t) / Math.max(1e-6, b.t - a.t), 0, 1) : 0;
      camera.position.fromArray(av.position).lerp(v2.fromArray(bv.position), f);
      qa.fromArray(av.quaternion).normalize(); qb.fromArray(bv.quaternion).normalize();
      camera.quaternion.copy(qa.slerp(qb, f));
      setFov(clamp(lerp(av.fov, bv.fov, f), 30, 110));
      chase.ready = false;
    } else {
      setFov(CONFIG.camera.fov);
      if (r) {
        // No recorded view (down, or a bot): a steady camera behind them.
        const q = r.pair[1];
        look.set(q.x, q.y + 1.4, q.z);
        v2.set(q.x - Math.sin(q.yaw) * 5.6, q.y + 2.6, q.z - Math.cos(q.yaw) * 5.6);
        if (!chase.ready) { chase.pos.copy(v2); chase.ready = true; } else chase.pos.lerp(v2, 1 - Math.exp(-3 * dt));
        camera.position.copy(chase.pos); camera.lookAt(look);
      } else {
        const cp = Math.cos(orbit.pitch);
        look.set(orbit.x, orbit.y, orbit.z);
        camera.position.set(orbit.x + Math.sin(orbit.yaw) * cp * orbit.dist, orbit.y + Math.sin(orbit.pitch) * orbit.dist, orbit.z + Math.cos(orbit.yaw) * cp * orbit.dist);
        camera.lookAt(look);
      }
    }
    camera.updateMatrixWorld();
    const c = Game.cam; c.pos.copy(camera.position); c.prevPos.copy(camera.position);
  }
  // Free camera from wherever the view is now: it orbits the point it was looking at.
  function toFree() {
    if (camMode === 'free') return;
    const r = bodies.get(followId);
    const t = r ? r.pair[1] : { x: orbit.x, y: orbit.y - 1.2, z: orbit.z };
    orbit.x = t.x; orbit.y = t.y + 1.2; orbit.z = t.z;
    const dx = camera.position.x - orbit.x, dy = camera.position.y - orbit.y, dz = camera.position.z - orbit.z;
    orbit.dist = clamp(Math.hypot(dx, dy, dz), 3, 40); orbit.yaw = Math.atan2(dx, dz); orbit.pitch = clamp(Math.asin(clamp(dy / Math.max(0.01, orbit.dist), -1, 1)), -0.1, 1.45);
    camMode = 'free'; savePrefs(); ui.changed(true);
  }
  function follow(pid) {
    if (!bodies.has(pid)) return;
    followId = pid; camMode = 'follow'; chase.ready = false;
    prefs.follow = bodies.get(pid).name; savePrefs(); ui.changed(true);
  }
  function cycle(dir) {
    const list = players().filter(p => bodies.has(p.id));
    if (!list.length) return;
    const at = camMode === 'follow' ? list.findIndex(p => p.id === followId) : dir > 0 ? -1 : 0;
    follow(list[(at + dir + list.length) % list.length].id);
  }

  // ============================================================================ preferences and places
  const prefs = Object.assign({ speed: 1, camera: 'follow', follow: null }, store.get(PREFS, {}));
  function savePrefs() { prefs.speed = speed; prefs.camera = camMode; store.set(PREFS, prefs); }
  let spotSaved = 0;
  function saveSpot(force) {
    const now = performance.now();
    if (!force && now - spotSaved < 1000) return;
    spotSaved = now;
    const spots = store.get(SPOTS, {});
    spots[id] = { t: Math.round(T * 10) / 10, at: Date.now() };
    const keep = Object.entries(spots).sort((a, b) => b[1].at - a[1].at).slice(0, 40);
    store.set(SPOTS, Object.fromEntries(keep));
    try { history.replaceState(null, '', `${location.pathname}${location.search}#t=${Math.round(T)}`); } catch (e) { /* a sandboxed frame */ }
  }
  function startAt() {
    const m = /(?:^#|&)t=(\d+(?:\.\d+)?)/.exec(location.hash);
    if (m) return Number(m[1]);
    const spot = store.get(SPOTS, {})[id];
    return spot && spot.t > 0 ? spot.t : live ? -1 : 0;
  }

  // ============================================================================ the page around it
  let ui = null;
  function makeUi() {
    const css = document.createElement('style');
    css.textContent = `
    body.replay-view #aTL,body.replay-view #controlsTips,body.replay-view #healingTip,body.replay-view #groupTip,body.replay-view #died,body.replay-view #won,
    body.replay-view #complete,body.replay-view #prompt,body.replay-view #talk,body.replay-view #lesson,body.replay-view #help,body.replay-view #rested,
    body.replay-view #worldHint,body.replay-view #sparCard,body.replay-view #menu,body.replay-view #version,body.replay-view #counterDim,
    body.replay-view #fpsCounter,body.replay-view #helpHint,body.replay-view #confirm,body.replay-view #loadPad{display:none!important}
    body.replay-view #aBC{bottom:calc(var(--rv-bar,150px) + 14px)}
    body.replay-view #aTC{top:calc(var(--rv-top,64px) + 6px)}
    body.replay-view canvas#view{touch-action:none;cursor:grab}
    body.replay-view canvas#view:active{cursor:grabbing}
    body.replay-view .rv-name{z-index:20;font-size:13px}
    body.replay-view .rv-name-down{color:#f3b3a3;border-color:#e0806a80}
    #rv{position:fixed;inset:0;z-index:30;pointer-events:none;font:400 var(--ui-size-text)/1.4 var(--ui-text);color:var(--ui-ink)}
    #rv button,#rv select,#rv input,#rv a{pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    #rv .rv-panel{background:#0b0e10f5;border:1px solid var(--ui-line)}
    #rvTop{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:8px;padding:10px max(12px,env(safe-area-inset-right)) 10px max(12px,env(safe-area-inset-left));
      background:linear-gradient(#080a0cf7 0%,#080a0ceb 65%,#080a0c00);pointer-events:none}
    #rvBack{color:var(--ui-ink);text-decoration:none}
    #rvLink{color:#cfc8b6}
    #rvTitle{flex:1;min-width:0;margin:0;font:400 20px/1.2 var(--ui-display);color:var(--ui-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px #000}
    #rvTitle .rv-tag{margin-left:10px;font:600 12px/1 var(--ui-text);letter-spacing:.02em;color:#cfc8b6;vertical-align:3px;text-shadow:0 1px 2px #000}
    #rvTitle .rv-live{color:#f09a86}
    #rvBar{position:absolute;left:0;right:0;bottom:0;padding:6px max(12px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));border-width:1px 0 0}
    #rvLine{position:relative;height:46px;margin:0 4px;cursor:pointer;pointer-events:auto;touch-action:none;outline:none}
    #rvLine:focus-visible{outline:1px solid var(--ui-accent);outline-offset:2px}
    #rvTrack{position:absolute;left:0;right:0;top:27px;height:6px;background:#ffffff1f}
    #rvLoaded{position:absolute;left:0;top:0;bottom:0;width:0;background:#ffffff33}
    #rvPlayed{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--ui-accent)}
    #rvThumb{position:absolute;top:22px;width:4px;height:16px;margin-left:-2px;background:var(--ui-accent-hi);box-shadow:0 0 0 2px #0b0e10}
    #rvMarks{position:absolute;left:0;right:0;top:0;height:26px}
    .rv-m{position:absolute;bottom:2px;transform:translateX(-50%);pointer-events:none}
    .rv-fight{bottom:-14px;width:1px;height:30px;background:#ffffff59;transform:none}
    .rv-fight b{position:absolute;left:4px;top:-2px;font:600 12px/1 var(--ui-text);color:#cfc8b6}
    .rv-down{width:9px;height:9px;border:2px solid var(--ui-alarm);border-radius:50%;box-sizing:border-box}
    .rv-death{width:10px;height:10px;background:var(--ui-alarm)}
    .rv-finisher{width:9px;height:9px;background:var(--ui-accent-hi);transform:translateX(-50%) rotate(45deg);bottom:4px}
    .rv-pick{width:0;height:0;border:6px solid transparent;border-bottom:10px solid #b9a2ff;border-top:0}
    .rv-note{width:3px;height:14px;background:var(--ui-ink)}
    .rv-gap{width:4px;height:10px;border-inline:1px solid var(--ui-ink)}
    #rvTip{position:absolute;bottom:50px;transform:translateX(-50%);padding:5px 9px;background:#06080af2;border:1px solid var(--ui-line-hi);font:500 13px/1.35 var(--ui-text);
      white-space:nowrap;max-width:min(320px,80vw);overflow:hidden;text-overflow:ellipsis;pointer-events:none}
    #rvRow{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
    #rv .rv-icon{min-width:44px;min-height:44px;padding:0 10px}
    #rv .rv-icon svg{width:18px;height:18px;fill:currentColor}
    #rvTime{min-width:7.5em;padding:0 6px;font:500 14px/1 var(--ui-text);font-variant-numeric:tabular-nums;color:var(--ui-muted)}
    #rvTime b{font-weight:600;color:var(--ui-ink)}
    #rvGrow{flex:1}
    #rvSpeed{min-height:44px;padding:0 10px;font:500 var(--ui-size-text)/1 var(--ui-text);color:var(--ui-ink);background:#0b0e10;border:1px solid var(--ui-line);border-radius:2px}
    #rvSpeed:focus-visible{outline:1px solid var(--ui-accent)}
    #rvWho{display:flex;gap:8px;max-width:100%;overflow-x:auto;scrollbar-width:none}
    #rvWho::-webkit-scrollbar{display:none}
    #rvWho .ui-button{min-height:44px;padding:0 12px;white-space:nowrap}
    #rvWho .ui-button[aria-pressed=true]{color:var(--ui-accent-hi);background:var(--ui-accent-wash);border-color:var(--ui-accent);box-shadow:inset 0 0 0 1px var(--ui-accent)}
    #rvWho .ui-button .rv-down-dot{width:7px;height:7px;border:2px solid var(--ui-alarm);border-radius:50%}
    #rvStatus{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--rv-bar,150px) + 12px);max-width:min(560px,calc(100vw - 32px));padding:9px 14px;
      font:500 14px/1.4 var(--ui-text);text-align:center}
    #rv [hidden]{display:none!important}
    #rvStatus .ui-key{margin:0 2px}
    #rvStatus .rv-k{white-space:nowrap}
    #rvStatus .rv-k+.rv-k:before{content:'·';margin:0 8px;color:var(--ui-muted)}
    #rv #rvSide{position:absolute;right:0;top:var(--rv-top,64px);bottom:var(--rv-bar,150px);width:min(380px,100vw);overflow-y:auto;padding:18px 20px 20px;box-sizing:border-box;border-width:1px 0 1px 1px;pointer-events:auto;overscroll-behavior:contain;background:#0b0e10}
    #rvSide h2{margin:0 0 14px;font:400 26px/1.15 var(--ui-display)}
    #rvSide h3{margin:20px 0 8px;font:600 13px/1.3 var(--ui-text);color:var(--ui-muted)}
    #rvSide table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
    #rvSide td{padding:5px 0;border-top:1px solid #ffffff12;vertical-align:middle}
    #rvSide td+td{padding-left:10px;text-align:right;white-space:nowrap}
    #rvSide td .ui-text-button{color:var(--ui-ink);text-align:left}
    #rvSide .rv-by{display:block;color:var(--ui-muted);font-size:13px}
    #rvSide .rv-person{margin:0 0 12px;padding:10px 0 0;border-top:1px solid #ffffff12}
    #rvSide .rv-person strong{font:400 19px/1.2 var(--ui-display);color:var(--ui-accent-hi)}
    #rvSide .rv-person p{margin:4px 0 0;color:var(--ui-muted)}
    #rvSide .rv-person p b{color:var(--ui-ink);font-weight:500}
    #rvSide .rv-notes li{display:flex;align-items:flex-start;gap:6px;padding:4px 0;border-top:1px solid #ffffff12}
    #rvSide .rv-notes{list-style:none;margin:0;padding:0}
    #rvSide .rv-notes .ui-text-button{min-height:44px}
    #rvSide .rv-notes .rv-note-time{font-variant-numeric:tabular-nums;color:var(--ui-accent-hi)}
    #rvSide .rv-notes span{flex:1;padding-top:11px;overflow-wrap:anywhere}
    #rvSide .rv-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
    #rvNoteForm{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--rv-bar,150px) + 12px);width:min(520px,calc(100vw - 24px));padding:12px;box-sizing:border-box;pointer-events:auto}
    #rvNoteForm label{display:block;margin:0 0 8px;color:var(--ui-muted);font-size:13px}
    #rvNoteForm div{display:flex;flex-wrap:wrap;gap:8px}
    #rvNoteText{flex:1 1 220px;min-width:0;min-height:44px;padding:0 12px;font:400 16px/1 var(--ui-text);color:var(--ui-ink);background:var(--ui-well);border:1px solid var(--ui-line-hi);border-radius:2px}
    #rvNoteText:focus{outline:1px solid var(--ui-accent)}
    #rvNoteForm .ui-primary{width:auto;min-height:44px}
    #rvGone{position:absolute;left:max(16px,8vw);top:30vh;max-width:min(460px,calc(100vw - 2 * max(16px,8vw)));box-sizing:border-box;padding:26px 28px;pointer-events:auto}
    #rvGone h2{margin:0 0 10px;font:400 30px/1.15 var(--ui-display)}
    #rvGone p{margin:0 0 20px;color:var(--ui-muted)}
    @media (max-width:640px){
      #rvTitle{font-size:17px}
      #rvTime{min-width:0;flex:1}
      #rvGrow{display:none}
      #rvWho{order:5;flex:1 1 100%;flex-wrap:wrap;overflow:visible}
      #rvSide{left:0;right:0;width:auto;border-width:1px 0}
      #rv .rv-hide-narrow,#rvTitle .rv-when,#rvTitle .rv-tag~.rv-tag{display:none}
      #rvNoteText{flex-basis:100%}
    }
    @media (max-height:480px) and (orientation:landscape){
      #rvTop{padding-top:4px;padding-bottom:4px}
      #rvTitle{font-size:16px}
      #rv .rv-hide-narrow,#rvTitle .rv-when,#rvTitle .rv-tag~.rv-tag{display:none}
      #rvWho{order:0;flex:0 1 auto}
      #rv #rvSide{width:min(400px,62vw);bottom:0;z-index:2}
    }
    @media (prefers-reduced-motion:reduce){#rv *{transition:none!important}}`;
    document.head.appendChild(css);
    const icon = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
    const PLAY = icon('M7 4.5v15l12.5-7.5z'), PAUSE = icon('M6 4.5h4.2v15H6zm7.8 0H18v15h-4.2z');
    const root = document.createElement('div'); root.id = 'rv'; root.hidden = true;
    root.innerHTML = `
      <header id="rvTop">
        <a id="rvBack" class="ui-text-button rv-icon" href="/" aria-label="All replays">${icon('M15.5 4.5 8 12l7.5 7.5 1.6-1.6L11.2 12l5.9-5.9z')}<span class="rv-hide-narrow">Replays</span></a>
        <h1 id="rvTitle"></h1>
        <button id="rvLink" class="ui-text-button rv-hide-narrow" type="button">Copy link</button>
        <button id="rvSummary" class="ui-button" type="button" aria-controls="rvSide" aria-expanded="false">Summary</button>
      </header>
      <aside id="rvSide" class="rv-panel" hidden aria-label="Run summary"></aside>
      <div id="rvStatus" class="rv-panel" role="status" aria-live="polite" hidden></div>
      <form id="rvNoteForm" class="rv-panel" hidden>
        <label for="rvNoteText" id="rvNoteLabel"></label>
        <div><input id="rvNoteText" name="note" maxlength="500" autocomplete="off" enterkeyhint="done"><button class="ui-primary" type="submit">Pin</button><button id="rvNoteCancel" class="ui-button" type="button">Cancel</button></div>
      </form>
      <section id="rvGone" class="rv-panel" hidden><h2 id="rvGoneTitle"></h2><p id="rvGoneText"></p><a class="ui-button" href="/">All replays</a></section>
      <div id="rvBar" class="rv-panel">
        <div id="rvLine" role="slider" tabindex="0" aria-label="Moment in the run" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">
          <div id="rvMarks"></div><div id="rvTrack"><div id="rvLoaded"></div><div id="rvPlayed"></div></div><div id="rvThumb"></div>
          <div id="rvTip" hidden></div>
        </div>
        <div id="rvRow">
          <button id="rvPlay" class="ui-button rv-icon" type="button" aria-label="Play">${PLAY}</button>
          <button id="rvBack5" class="ui-button rv-icon" type="button" aria-label="Back 5 seconds">${icon('M11.5 6V3L6 7.5 11.5 12V9a5 5 0 1 1-5 5H4.5a7 7 0 1 0 7-8z')}</button>
          <button id="rvFwd5" class="ui-button rv-icon" type="button" aria-label="Forward 5 seconds">${icon('M12.5 6V3L18 7.5 12.5 12V9a5 5 0 1 0 5 5h2a7 7 0 1 1-7-8z')}</button>
          <button id="rvNext" class="ui-button" type="button" aria-keyshortcuts="N">Next down</button>
          <span id="rvTime"></span>
          <span id="rvGrow"></span>
          <select id="rvSpeed" aria-label="Speed">${SPEEDS.map(s => `<option value="${s}">${s}×</option>`).join('')}</select>
          <div id="rvWho" role="group" aria-label="Camera"></div>
          <button id="rvNote" class="ui-button" type="button">Note</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    const $r = id => document.getElementById(id);
    const line = $r('rvLine'), tip = $r('rvTip'), status = $r('rvStatus'), side = $r('rvSide'), form = $r('rvNoteForm'), noteText = $r('rvNoteText');
    let statusTimer = null, shownSecond = -1, shownDur = -1, shownLoaded = -1, marksKey = '', whoKey = '', titleKey = '', wasPlaying = false;
    const pct = t => { const d = duration(); return d > 0 ? clamp(t / d, 0, 1) * 100 : 0; };
    function say(html, ms = 2600) {
      status.innerHTML = html; status.hidden = false;
      clearTimeout(statusTimer); if (ms) statusTimer = setTimeout(() => { status.hidden = true; }, ms);
    }
    function layout() {
      document.documentElement.style.setProperty('--rv-bar', $r('rvBar').offsetHeight + 'px');
      document.documentElement.style.setProperty('--rv-top', $r('rvTop').offsetHeight + 'px');
    }
    addEventListener('resize', () => { if (active) layout(); });
    // ---- what the run is ----
    function title() {
      const started = card ? new Date(card.startedAt) : null;
      const when = started ? started.toLocaleString(undefined, { ...(innerWidth > 640 ? { weekday: 'short' } : {}), day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      const name = card?.mode === 'weekly' ? 'Weekly Run' : 'Boss Rush';
      const tags = [];
      if (damaged) tags.push('<span class="rv-tag rv-live">Damaged</span>');
      if (live && !end) tags.push('<span class="rv-tag rv-live">Live</span>');
      else if (!end && card && !card.live && (card.outcome === 'cut' || !card.outcome)) tags.push('<span class="rv-tag">Cut short</span>');
      if (card?.version && card.version !== VERSION) tags.push(`<span class="rv-tag" title="Recorded on ${esc(card.version)}">${esc(card.version)}</span>`);
      const key = name + when + tags.join('');
      if (key === titleKey) return;
      titleKey = key;
      $r('rvTitle').innerHTML = `${esc(name)}<span class="rv-when">${when ? ' · ' + esc(when) : ''}</span>${tags.join('')}`;
      document.title = `${name} replay`;
    }
    function drawMarks() {
      const d = duration(), notes = card?.notes || [];
      const key = `${d.toFixed(0)}|${chapters.length}|${marks.length}|${notes.length}|${notes.map(n => n.id).join()}`;
      if (key === marksKey) return;
      marksKey = key;
      const out = [];
      for (const ch of chapters) out.push(`<i class="rv-m rv-fight" style="left:${pct(ch.t0)}%"><b>${ch.session.gauntlet?.number ?? ch.fight + 1}</b></i>`);
      for (const m of marks) {
        if (m.type === 'down' || m.type === 'death' || m.type === 'finisher') out.push(`<i class="rv-m rv-${m.type}" style="left:${pct(m.t)}%"></i>`);
        else if (m.type === 'pick' && ABILITY_BY_ID[m.ability]?.rarity === 'legendary') out.push(`<i class="rv-m rv-pick" style="left:${pct(m.t)}%"></i>`);
        else if (m.type === 'gap') out.push(`<i class="rv-m rv-gap" style="left:${pct(m.t)}%"></i>`);
      }
      for (const n of notes) out.push(`<i class="rv-m rv-note" style="left:${pct(n.t)}%"></i>`);
      $r('rvMarks').innerHTML = out.join('');
    }
    function drawWho() {
      const list = players().filter(p => bodies.has(p.id));
      const key = list.map(p => p.id + (bodies.get(p.id).down ? 'd' : '')).join() + '|' + camMode + followId;
      if (key === whoKey) return;
      whoKey = key;
      const who = $r('rvWho');
      who.innerHTML = list.map((p, i) => `<button class="ui-button" type="button" data-id="${esc(p.id)}" aria-pressed="${camMode === 'follow' && followId === p.id}"${i < 9 ? ` aria-keyshortcuts="Q E"` : ''}>${bodies.get(p.id).down ? '<i class="rv-down-dot" aria-hidden="true"></i>' : ''}${esc(p.name)}${bodies.get(p.id).down ? '<span class="ui-mirror"> (down)</span>' : ''}</button>`).join('')
        + `<button class="ui-button" type="button" data-free aria-pressed="${camMode === 'free'}" aria-keyshortcuts="F">Free camera</button>`;
    }
    function tickTime() {
      const d = duration(), sec = Math.floor(T), loadedAt = Math.floor(lastT);
      if (sec !== shownSecond || Math.floor(d) !== shownDur) {
        shownSecond = sec; shownDur = Math.floor(d);
        $r('rvTime').innerHTML = `<b>${clock(T)}</b> / ${clock(d)}`;
        line.setAttribute('aria-valuemax', String(Math.round(d))); line.setAttribute('aria-valuenow', String(sec));
        line.setAttribute('aria-valuetext', `${clock(T)} of ${clock(d)}`);
      }
      if (loadedAt !== shownLoaded) { shownLoaded = loadedAt; $r('rvLoaded').style.width = pct(lastT) + '%'; }
      const p = pct(T) + '%';
      $r('rvPlayed').style.width = p; $r('rvThumb').style.left = p;
      if (playing !== wasPlaying) {
        wasPlaying = playing;
        $r('rvPlay').innerHTML = playing ? PAUSE : PLAY; $r('rvPlay').setAttribute('aria-label', playing ? 'Pause' : 'Play');
      }
    }
    function changed(full) {
      if (!active) return;
      if (gone) { showGone('This run is gone', 'It was deleted, or it is older than 60 days and was not starred.'); return; }
      if (pulled && !chapters.some(ch => ch.frames.length) && !streaming && (end || damaged || !live)) {
        showGone(damaged ? 'This run could not be read' : 'Nothing was recorded', damaged ? 'Its file is damaged from the start.' : 'The run ended before its first fight began.');
        return;
      }
      title(); drawMarks(); drawWho(); tickTime();
      if (!built && !building && chapters.some(ch => ch.frames.length)) {
        // A link's moment, or where this run was left, once it has arrived (or all has); a live run with neither opens
        // at its live edge, once what was recorded so far has arrived.
        const want = startAt(), edge = want < 0;
        if (edge ? pulled : lastT >= want || !streaming) { T = Tprev = clamp(edge ? lastT - 4 : want, 0, Math.max(0, lastT)); finished = false; sync(false); }
      }
      if (pendingT >= 0 && built && (lastT >= pendingT || !streaming)) { const t = pendingT; pendingT = -1; seek(t); }
      if (full && !side.hidden) drawSide();
      if (damaged && !shownDamage) { shownDamage = true; say(esc(damaged) + ' What came before still plays.', 6000); }
      if (streamFailed && !shownDrop) { shownDrop = true; say('The connection dropped. Trying again…', 0); }
      if (!streamFailed && shownDrop) { shownDrop = false; status.hidden = true; }
      layout();
    }
    let shownDamage = false, shownDrop = false;
    function showGone(head, text) {
      $r('rvGoneTitle').textContent = head; $r('rvGoneText').textContent = text;
      $r('rvGone').hidden = false; $r('rvBar').hidden = true; $r('rvSummary').hidden = true; $r('rvLink').hidden = true; status.hidden = true; side.hidden = true;
      document.getElementById('loading').classList.remove('show');
      document.title = head;
    }
    // ---- the summary ----
    function outcomeLine() {
      const reached = card?.reached || chapters.length;
      if (live && !end) return `Live, fight ${reached}`;
      const o = end?.outcome || card?.outcome;
      if (o === 'won') return 'Won';
      if (o === 'wiped') return `Team wiped at fight ${reached}`;
      if (o === 'left') return `Left at fight ${reached}`;
      if (o === 'error') return `Stopped by an error at fight ${reached}`;
      return `Cut short at fight ${reached}`;
    }
    function drawSide() {
      const s = card?.summary;
      const out = [`<h2>${esc(outcomeLine())}</h2>`];
      if (!s) out.push(`<p>${live && !end ? 'The summary is written when the run ends.' : 'This run has no summary: the server stopped before it could write one.'}</p>`);
      else {
        out.push('<h3>Fights</h3><table>' + s.fights.map(f => `<tr><td><button class="ui-text-button" type="button" data-seek="${f.start}">${f.fight}. ${esc(f.bosses.map(enemyName).join(' & '))}${f.crowned ? ' (Crowned)' : ''}</button></td><td>${f.time != null ? clock(f.time) : '–'}${f.won ? '' : ' · fell'}</td></tr>`).join('') + '</table>');
        out.push(notesHtml());
        out.push('<h3>Players</h3>');
        for (const p of s.players.filter(p => !p.bot)) {
          const hit = p.hitBy[0] ? attackName(p.hitBy[0].attack) : null, downed = p.downedBy[0] ? attackName(p.downedBy[0].attack) : null;
          const parts = [`${p.downs} down${p.downs === 1 ? '' : 's'}`, `${p.deaths} death${p.deaths === 1 ? '' : 's'}`, `${p.finishers} Finishing Blow${p.finishers === 1 ? '' : 's'}`];
          out.push(`<div class="rv-person"><strong>${esc(p.name)}</strong><p>${parts.join(' · ')}</p>`
            + (downed ? `<p>Downed most by <b>${esc(downed.attack)}</b> (${esc(downed.boss)}), ${p.downedBy[0].count}×</p>` : '')
            + (hit ? `<p>Hit most by <b>${esc(hit.attack)}</b> (${esc(hit.boss)}), ${p.hitBy[0].count}×</p>` : '')
            + (p.picks.length ? `<p>Picked ${p.picks.map(a => `<b>${esc(ABILITY_BY_ID[a]?.name || a)}</b>`).join(', ')}</p>` : '') + '</div>');
        }
        if (s.attacks.length) out.push('<h3>Boss attacks that landed most</h3><table>' + s.attacks.slice(0, 6).map(a => { const n = attackName(a.attack); return `<tr><td>${esc(n.attack)}<span class="rv-by">${esc(n.boss)}</span></td><td>${a.count}</td></tr>`; }).join('') + '</table>');
      }
      if (!s) out.push(notesHtml());
      out.push(`<div class="rv-actions">${finished ? '<button class="ui-primary" type="button" data-again style="width:auto">Watch again</button>' : ''}<a class="ui-button" href="/">All replays</a></div>`);
      side.innerHTML = out.join('');
    }
    function notesHtml() {
      const notes = card?.notes || [];
      return '<h3>Notes</h3>' + (notes.length ? '<ul class="rv-notes">' + notes.map(n => `<li><button class="ui-text-button rv-note-time" type="button" data-seek="${n.t}" aria-label="Go to ${clock(n.t)}">${clock(n.t)}</button><span>${esc(n.text)}</span><button class="ui-text-button" type="button" data-unpin="${esc(n.id)}" aria-label="Remove this note">Remove</button></li>`).join('') + '</ul>'
        : '<p>None yet. Pause where something happened and press Note.</p>');
    }
    function toggleSide(open = side.hidden) {
      if (open) hideHint();
      side.hidden = !open; $r('rvSummary').setAttribute('aria-expanded', String(open));
      if (open) drawSide();
    }
    side.addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.seek !== undefined) { seek(Math.max(0, Number(b.dataset.seek) - (b.classList.contains('rv-note-time') ? 2 : 0))); if (innerWidth <= 640) toggleSide(false); }
      else if (b.dataset.unpin) unpin(b.dataset.unpin);
      else if (b.dataset.again !== undefined) { seek(0); setPlaying(true); toggleSide(false); }
    });
    // ---- notes ----
    let noteAt = 0;
    function openNote() {
      if (!form.hidden) return;
      setPlaying(false); noteAt = T; hideHint();
      $r('rvNoteLabel').textContent = `Note at ${clock(noteAt)}`;
      form.hidden = false; noteText.value = ''; noteText.focus();
    }
    function closeNote() { form.hidden = true; if (document.activeElement === noteText) noteText.blur(); }
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const text = noteText.value.trim(); if (!text) { noteText.focus(); return; }
      try {
        const res = await post(`/api/runs/${encodeURIComponent(id)}/notes`, { t: noteAt, text });
        if (!res.ok) throw new Error();
        const note = await res.json();
        card.notes = [...(card.notes || []), note].sort((a, b) => a.t - b.t);
        closeNote(); say(`Note pinned at ${clock(note.t)}.`); changed(true);
      } catch (e) { say('The note could not be saved. Try again.', 4000); }
    });
    $r('rvNoteCancel').onclick = closeNote;
    async function unpin(noteId) {
      try {
        const res = await post(`/api/runs/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`, {});
        if (!res.ok) throw new Error();
        card.notes = card.notes.filter(n => n.id !== noteId); say('Note removed.'); changed(true);
      } catch (e) { say('The note could not be removed. Try again.', 4000); }
    }
    const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    // ---- controls ----
    function setPlaying(on) {
      if (on && finished) { seek(0); }
      playing = on; if (on) closeNote();
      tickTime();
    }
    function setSpeed(s) {
      speed = SPEEDS.includes(s) ? s : 1; $r('rvSpeed').value = String(speed); savePrefs();
    }
    function nextDeath(dir = 1) {
      const list = marks.filter(m => m.type === 'down' || m.type === 'death');
      const m = dir > 0 ? list.find(m => m.t > T + 3.5) : [...list].reverse().find(m => m.t < T - 0.5);
      if (!m) { say(dir > 0 ? 'No more downs after this.' : 'No downs before this.'); return; }
      seek(Math.max(0, m.t - 3)); setPlaying(true);
      const who = nameOf(m.player), by = m.by ? attackName(m.by) : null;
      say(`${esc(who)} ${m.type === 'death' ? 'dies' : 'goes down'}${by ? ` to ${esc(by.attack)}` : ''}.`, 3500);
    }
    $r('rvPlay').onclick = () => setPlaying(!playing);
    $r('rvBack5').onclick = () => seek(T - 5);
    $r('rvFwd5').onclick = () => seek(T + 5);
    $r('rvNext').onclick = () => nextDeath(1);
    $r('rvSpeed').onchange = ev => setSpeed(Number(ev.target.value));
    $r('rvNote').onclick = openNote;
    $r('rvSummary').onclick = () => toggleSide();
    $r('rvLink').onclick = async () => {
      saveSpot(true);
      try { await navigator.clipboard.writeText(location.href); say('Link to this moment copied.'); } catch (e) { say('Copy the address bar: it opens at this moment.', 4000); }
    };
    $r('rvWho').addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.free !== undefined) toFree(); else follow(b.dataset.id);
    });
    // ---- the timeline ----
    const timeAtX = x => { const r = line.getBoundingClientRect(); return clamp((x - r.left) / Math.max(1, r.width), 0, 1) * duration(); };
    function showTip(t) {
      const d = duration(); if (!d) { tip.hidden = true; return; }
      const r = line.getBoundingClientRect(), px = 9 / Math.max(1, r.width) * d;
      let near = null, best = px;
      for (const m of marks) if (['down', 'death', 'finisher', 'pick', 'gap'].includes(m.type) && Math.abs(m.t - t) < best) { best = Math.abs(m.t - t); near = m; }
      for (const n of card?.notes || []) if (Math.abs(n.t - t) < best) { best = Math.abs(n.t - t); near = { type: 'note', t: n.t, text: n.text }; }
      const fight = chapterAt(t);
      let text = clock(near ? near.t : t);
      if (near?.type === 'down' || near?.type === 'death') text += ` · ${nameOf(near.player)} ${near.type === 'death' ? 'dies' : 'down'}${near.by ? ` (${attackName(near.by).attack})` : ''}`;
      else if (near?.type === 'finisher') text += ` · ${nameOf(near.player)}'s Finishing Blow`;
      else if (near?.type === 'pick') text += ` · ${nameOf(near.player)} picks ${ABILITY_BY_ID[near.ability]?.name || near.ability}`;
      else if (near?.type === 'note') text += ` · ${near.text}`;
      else if (near?.type === 'gap') text += ` · Lobby empty for ${clock(near.seconds)}`;
      else if (fight) text += ` · Fight ${fight.session.gauntlet?.number ?? fight.fight + 1}`;
      tip.textContent = text; tip.hidden = false;
      tip.style.left = clamp((t / d) * r.width, 60, r.width - 60) + 'px';
    }
    let dragId = null, resumeAfter = false;
    line.addEventListener('pointerdown', ev => {
      if (!duration()) return;
      dragId = ev.pointerId; line.setPointerCapture(ev.pointerId); scrubbing = true; resumeAfter = playing;
      const t = timeAtX(ev.clientX); seek(t, false); showTip(t);
    });
    line.addEventListener('pointermove', ev => {
      if (dragId === ev.pointerId) { const t = timeAtX(ev.clientX); seek(t, false); showTip(t); }
      else if (ev.pointerType === 'mouse') showTip(timeAtX(ev.clientX));
    });
    const release = ev => {
      if (dragId !== ev.pointerId) return;
      dragId = null; scrubbing = false;
      seek(timeAtX(ev.clientX), true);
      playing = resumeAfter; tip.hidden = true;
    };
    line.addEventListener('pointerup', release); line.addEventListener('pointercancel', release);
    line.addEventListener('pointerleave', ev => { if (dragId === null && ev.pointerType === 'mouse') tip.hidden = true; });
    // ---- the canvas: drag to look around, pinch or wheel to zoom, tap a player to follow ----
    const pointers = new Map();
    let gesture = null;
    canvas.addEventListener('contextmenu', ev => { if (active) ev.preventDefault(); });
    canvas.addEventListener('pointerdown', ev => {
      if (!active) return;
      canvas.setPointerCapture(ev.pointerId);
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, sx: ev.clientX, sy: ev.clientY, at: performance.now(), button: ev.button, shift: ev.shiftKey });
      gesture = pointers.size >= 2 ? { pinch: pinchOf() } : null;
    });
    function pinchOf() {
      const [a, b] = [...pointers.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    canvas.addEventListener('pointermove', ev => {
      const p = pointers.get(ev.pointerId); if (!p) return;
      const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
      p.x = ev.clientX; p.y = ev.clientY;
      if (Math.hypot(p.x - p.sx, p.y - p.sy) < 6 && !p.moved) return;
      p.moved = true;
      if (pointers.size >= 2) {
        const now = pinchOf(), was = gesture?.pinch || now;
        toFree();
        if (was.d > 0 && now.d > 0) orbit.dist = clamp(orbit.dist * was.d / now.d, 2.5, 45);
        pan(now.x - was.x, now.y - was.y);
        gesture = { pinch: now };
        return;
      }
      toFree();
      if (p.button === 2 || p.shift) pan(dx, dy);
      else { orbit.yaw -= dx * 0.006; orbit.pitch = clamp(orbit.pitch + dy * 0.005, -0.1, 1.45); }
    });
    const lift = ev => {
      const p = pointers.get(ev.pointerId); if (!p) return;
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) gesture = null;
      if (!p.moved && ev.type === 'pointerup' && performance.now() - p.at < 500) pick(ev.clientX, ev.clientY);
    };
    canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', lift);
    canvas.addEventListener('wheel', ev => {
      if (!active) return;
      ev.preventDefault(); toFree();
      orbit.dist = clamp(orbit.dist * Math.exp(ev.deltaY * 0.0012), 2.5, 45);
    }, { passive: false });
    function pan(dx, dy) {
      const k = orbit.dist * 0.0018, s = Math.sin(orbit.yaw), c = Math.cos(orbit.yaw);
      orbit.x += (-c * dx - s * dy) * k; orbit.z += (s * dx - c * dy) * k;
      const g = world.groundAt(orbit.x, orbit.z, orbit.y + 2);
      if (Number.isFinite(g)) orbit.y = Math.max(g + 0.4, orbit.y);
    }
    function pick(x, y) {
      let best = null, bestD = PICK_PX;
      for (const [pid, r] of bodies) {
        const q = r.pair[1];
        for (const h of [0.5, 1.2, 1.9]) {
          const v = v1.set(q.x, q.y + h, q.z).project(camera);
          if (v.z < -1 || v.z > 1) continue;
          const d = Math.hypot((v.x + 1) * innerWidth / 2 - x, (1 - v.y) * innerHeight / 2 - y);
          if (d < bestD) { bestD = d; best = pid; }
        }
      }
      if (best) { follow(best); say(`Following ${esc(bodies.get(best).name)}.`, 1800); }
    }
    // ---- keys (the game's own are off on this page: js/boot.js) ----
    const held = new Set();
    addEventListener('keydown', ev => {
      if (!active || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const typing = ev.target.closest?.('input,textarea,select');
      if (ev.code === 'Escape') { if (!form.hidden) closeNote(); else if (!side.hidden) toggleSide(false); return; }
      if (typing) return;
      const k = ev.code;
      if (k === 'Space' || k === 'KeyK') { if (ev.target.closest?.('button,a')) return; ev.preventDefault(); setPlaying(!playing); }
      else if (k === 'ArrowLeft' || k === 'ArrowRight') { ev.preventDefault(); seek(T + (k === 'ArrowLeft' ? -1 : 1) * (ev.shiftKey ? 30 : 5)); }
      else if (k === 'Comma' || k === 'Period') { setPlaying(false); seek(T + (k === 'Comma' ? -1 : 1) / 30); }
      else if (/^Digit[1-6]$/.test(k)) { setSpeed(SPEEDS[Number(k.slice(5)) - 1]); say(`Speed ${speed}×`, 1200); }
      else if (k === 'KeyQ' || k === 'KeyE') cycle(k === 'KeyQ' ? -1 : 1);
      else if (k === 'KeyF') toFree();
      else if (k === 'KeyN') nextDeath(ev.shiftKey ? -1 : 1);
      else if (k === 'KeyM') { ev.preventDefault(); openNote(); }
      else if (k === 'Home') seek(0);
      else if (k === 'End') seek(lastT);
      else if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown'].includes(k)) { held.add(k); if (k.startsWith('Arrow')) ev.preventDefault(); if (camMode !== 'free') toFree(); return; }
      else return;
      hideHint();
    });
    addEventListener('keyup', ev => held.delete(ev.code));
    addEventListener('blur', () => held.clear());
    function tick() {
      if (held.size && camMode === 'free') {
        // WASD walks the free camera's centre over the ground, faster when it is far out.
        const m = CONFIG.step * (4 + orbit.dist * 0.6), sn = Math.sin(orbit.yaw), cs = Math.cos(orbit.yaw);
        const fwd = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
        const right = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0);
        orbit.x += (-sn * fwd + cs * right) * m; orbit.z += (-cs * fwd - sn * right) * m;
      }
      tickTime();
      if (built && !hintTried && $r('rvGone').hidden) { hintTried = true; showHint(); }   // the keys, once there is a run to use them on
      if (playing && T > 0) saveSpot(false);
      if (whoDirty) { whoDirty = false; drawWho(); }
    }
    // ---- the keys, shown once ----
    let hintShown = false, hintTried = false;
    function showHint() {
      if (store.get(HINT, 0)) return;
      store.set(HINT, 1); hintShown = true;
      const touch = matchMedia('(pointer:coarse)').matches;
      say(touch ? 'Tap a player to follow them. Drag to look around, pinch to zoom.'
        : [['Space', 'play'], ['←→', '5 s'], ['1–6', 'speed'], ['QE', 'player'], ['F', 'free camera'], ['N', 'next down'], ['M', 'note']]
          .map(([k, what]) => `<span class="rv-k">${k.length === 2 ? [...k].map(c => `<span class="ui-key">${c}</span>`).join('') : k === '1–6' ? '<span class="ui-key">1</span>–<span class="ui-key">6</span>' : `<span class="ui-key">${k}</span>`} ${what}</span>`).join(''), 9000);
    }
    function hideHint() { if (hintShown) { hintShown = false; status.hidden = true; } }
    function finishedRun() { toggleSide(true); }
    function open() {
      root.hidden = false; setSpeed(prefs.speed); layout();
    }
    return { changed, tick, finished: finishedRun, open, say, showGone, drawWho };
  }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ============================================================================ boot
  async function boot() {
    active = true;
    document.body.classList.add('replay-view');
    document.getElementById('menu').classList.add('hidden');
    id = new URLSearchParams(location.search).get('run');
    if (!id || !/^[a-z0-9-]{8,40}$/.test(id)) { location.replace('/'); return; }
    camMode = prefs.camera === 'free' ? 'free' : 'follow';
    ui = makeUi(); ui.open();
    document.getElementById('loadName').textContent = 'Replay'; document.getElementById('loadTip').textContent = '';
    document.getElementById('loading').classList.add('show');
    try {
      const res = await fetch(`/api/runs?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      card = (await res.json()).runs?.[0] || null;
      if (!card) { gone = true; ui.changed(); return; }
    } catch (e) {
      ui.showGone('The replays could not be reached', 'Check the connection, then reload this page.');
      return;
    }
    live = !!card.live;
    playing = true;
    ui.changed(true);
    pull();
  }

  return {
    enabled, boot, update, render, seek,
    get active() { return active && built !== null; },
    get rush() {
      if (!active || !built) return null;
      const g = built.session.gauntlet; if (!g?.run) return null;
      rushView.fight = g.number; rushView.crowned = !!g.crowned; rushView.modifiers = Array.isArray(g.modifiers) ? g.modifiers : [];
      rushView.clock = cur?.a?.frame.fought || 0; rushView.par = built.session.par || 0;
      return rushView;
    },
    get listener() { return focus(); },
    // Tests and tools: where it stands.
    get info() { return { id, T, lastT, playing, speed, live, ended: !!end, damaged, gone, chapters: chapters.length, built: built ? chapters.indexOf(built) : -1,
      bodies: [...bodies.keys()], followId, camMode, frames: chapters.reduce((n, ch) => n + ch.frames.length, 0), marks: marks.length, finished }; },
    play(on = true) { playing = on; }, setSpeedForTest(s) { speed = s; }, followForTest: follow, freeForTest: toFree,
  };
})();
