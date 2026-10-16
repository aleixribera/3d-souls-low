'use strict';
// ============================================================================
// 11. Game
// ============================================================================
const Game = {
  mode: 'menu',          // 'menu' | 'play' | 'pause'
  screen: 'start',       // menu screen: 'start' (the notice shown once per page load) | 'main' | 'levels' | 'enemies' | 'pause' | 'options'
  kind: 'arena',         // what is being played: 'arena' (single duel) | 'level'
  level: null,           // the level (or ARENA) being played
  duelId: null, duel: null,   // arena opponent
  tut: null,             // tutorial progress: { index, flags, dist, doneTimer, completeTimer, hint, hintTimer }
  selected: 0,
  player: null, enemies: [], zones: [], hitstop: 0, shake: 0, shakeDur: 1, shakeAmp: 0, complete: false,
  lock: null, lockLost: 0, lockHidden: 0, restartArm: 0,
  retarget: true,        // always-retarget lock-on (see updateLock): off once Q lets go of a lock
  spawn: null, deathTimer: 0,
  zoomTarget: CONFIG.zoom.default, zoomRepeat: 0, mouseHold: 0,
  cam: { yaw: 0, pitch: 0, zoom: CONFIG.zoom.default, pos: new THREE.Vector3(), look: new THREE.Vector3(),
         prevPos: new THREE.Vector3(), prevLook: new THREE.Vector3() },

  isTutorial() { return this.kind === 'level' && this.level.script === 'tutorial'; },
  duelWon() { return this.kind === 'arena' && !!this.duel && !this.duel.alive(); },

  // ---- menus -----------------------------------------------------------------------------------
  screens() {
    const onOff = v => v ? 'On' : 'Off';
    return {
      // Shown once, as the page loads: any key, click or gamepad button moves on to the main menu (leaveStartNotice).
      start: { title: 'COMBAT ARENA 3D', sub: '', items: [], hint: 'Press any key or button to continue',
        notice: 'Best played with a controller.\nPlug in a gamepad for the full experience.' },
      main: { title: 'COMBAT ARENA 3D', sub: '', items: [
        { name: 'Levels', desc: 'Learn the controls, then fight your way through each level.', go: () => this.showMenu('levels') },
        { name: 'Enemies', desc: 'Duel a single opponent in the arena.', go: () => this.showMenu('enemies') },
        ...(DEV ? [{ name: 'Test Grounds', desc: 'Developer rooms for trying out mechanics.', go: () => this.showMenu('tests') }] : []),
      ] },
      tests: { title: 'COMBAT ARENA 3D', sub: 'TEST GROUNDS', back: 'main',
        items: [...TEST_LEVELS.map(l => ({ name: l.name, desc: l.description, go: () => this.startLevel(l.id) })),
                ...TEST_DEFS.map(d => ({ name: `Duel: ${d.name}`, desc: d.description, go: () => this.startFight(d.id) }))] },
      levels: { title: 'COMBAT ARENA 3D', sub: 'LEVELS', back: 'main',
        items: LEVELS.map(l => ({ name: l.name, desc: l.description, go: () => this.startLevel(l.id) })) },
      enemies: { title: 'COMBAT ARENA 3D', sub: 'CHOOSE YOUR OPPONENT', back: 'main',
        items: ENEMY_DEFS.map(d => ({ name: d.name, desc: d.description, go: () => this.startFight(d.id) })) },
      pause: { title: 'PAUSED', sub: '', overlay: true, items: [
        { name: 'Resume', desc: '', go: () => this.resume() },
        { name: 'Options', desc: '', go: () => this.showMenu('options') },
        { name: 'Back to Menu', desc: 'Abandons the current fight or level.', cue: 'menuBack', go: () => { this.reset(); this.showMenu('main'); } },
      ] },
      options: { title: 'OPTIONS', sub: 'LEFT / RIGHT TO ADJUST', overlay: true, back: 'pause', items: [
        { name: `Mouse sensitivity: ${settings.sensitivity}`, desc: 'Camera turn speed with the mouse or right stick (lock-on off).',
          adjust: d => { settings.sensitivity = clamp(settings.sensitivity + d, 1, 10); } },
        { name: `Camera invert: ${onOff(settings.invert)}`, desc: 'Flips vertical camera movement.', adjust: () => { settings.invert = !settings.invert; } },
        { name: `Show hitboxes: ${onOff(settings.hitboxes)}`, desc: 'Default for the F1 hitbox display.', adjust: () => { settings.hitboxes = !settings.hitboxes; } },
        { name: `HUD scale: ${Math.round(settings.hudScale * 100)}%`, desc: 'Size of bars and text.',
          adjust: d => { settings.hudScale = clamp(Math.round((settings.hudScale + d * 0.1) * 10) / 10, 0.7, 1.5); } },
        { name: `Sound volume: ${settings.volume}`, desc: 'Master volume of effects and menu sounds.',
          adjust: d => { settings.volume = clamp(Math.round(Number(settings.volume)) + d, 0, 10); } },
        { name: `Graphics: ${visuals.qualityLabel(settings.graphics)}`, desc: 'High: bloom, vignette, grain, light shafts. Low: faster, plainer.',
          adjust: d => { settings.graphics = visuals.nextQuality(settings.graphics, d); } },
        { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('pause') },
      ] },
    };
  },
  showMenu(screen, keepSelection) {
    const s = this.screens()[screen], list = $('menuList');
    const inGame = screen === 'pause' || screen === 'options';
    if (!inGame) {
      this.mode = 'menu';
      this.zoomTarget = this.cam.zoom = CONFIG.zoom.default;   // zoom resets when returning to the menu
      this.cam.pitch = 0;
    } else this.mode = 'pause';
    this.screen = screen; input.clear(); this.setLock(null);
    if (document.pointerLockElement) document.exitPointerLock();
    $('menu').classList.remove('hidden'); $('menu').classList.toggle('overlay', !!s.overlay);
    hud.root.classList.toggle('hidden', !inGame);
    $('menuTitle').textContent = s.title; $('menuSub').textContent = s.sub; $('menuNotice').textContent = s.notice || '';
    this.showMenuHint();
    list.textContent = '';
    s.items.forEach((it, i) => {
      const b = document.createElement('button');
      b.className = 'menuBtn';
      b.innerHTML = `<div class="n"></div><div class="d"></div>`;
      b.children[0].textContent = it.name; b.children[1].textContent = it.desc;
      b.addEventListener('click', () => { this.select(i); if (it.go) { events.emit(it.cue || 'menuConfirm'); it.go(); } else this.adjust(1); });
      b.addEventListener('mouseenter', () => { if (this.selected !== i) events.emit('menuMove'); this.select(i); });
      list.appendChild(b);
    });
    this.select(keepSelection ? this.selected : 0);
  },
  // Key or button names follow the device used last, so this is redone when it changes.
  showMenuHint() {
    const screen = this.screen, own = this.screens()[screen].hint;
    if (own) { $('menuHint').textContent = own; return; }
    $('menuHint').textContent = `${menuLabel('up')} · ${menuLabel('down')} to select · ${menuLabel('confirm')} to confirm` +
      (screen === 'options' ? ` · ${menuLabel('left')} · ${menuLabel('right')} to adjust` : '') +
      (screen === 'main' ? '' : ` · ${menuLabel('back')} to go back`);
  },
  // One step of directional menu input (keys, D-pad or stick).
  menuStep(dir) {
    if (dir === 'up' || dir === 'down') { events.emit('menuMove'); this.select(this.selected + (dir === 'up' ? -1 : 1)); }
    else this.adjust(dir === 'left' ? -1 : 1);
  },
  select(i) {
    const n = $('menuList').children.length;
    this.selected = n ? (i + n) % n : 0;
    [...$('menuList').children].forEach((b, k) => b.classList.toggle('sel', k === this.selected));
  },
  confirm() { const it = this.screens()[this.screen].items[this.selected]; if (it.go) { events.emit(it.cue || 'menuConfirm'); it.go(); } else this.adjust(1); },
  adjust(d) {
    const it = this.screens()[this.screen].items[this.selected];
    if (!it.adjust) return;
    it.adjust(d); saveSettings(); applySettings();
    events.emit('menuAdjust', { dir: d });
    this.showMenu(this.screen, true);
  },
  // The start notice: any key, click or gamepad button moves on to the main menu (and does nothing else).
  onStartNotice() { return this.mode === 'menu' && this.screen === 'start'; },
  leaveStartNotice() { if (this.onStartNotice()) { events.emit('menuConfirm'); this.showMenu('main'); } },
  menuBack() {
    const s = this.screens()[this.screen];
    if (this.screen === 'pause') this.resume();
    else if (s.back) { events.emit('menuBack'); this.showMenu(s.back); }
  },
  // fromPointer: triggered by losing mouse capture rather than by the pause key.
  pause(fromPointer) {
    if (this.mode !== 'play' || !this.player.alive()) return;   // no pausing during the death sequence
    // Tutorial: the pause key leaves to the Levels list (and restarts), except on the pause step itself.
    if (this.isTutorial() && !this.tutorialAllowsPause()) { if (!fromPointer) this.leaveTutorial(); return; }
    this.showMenu('pause');
    events.emit('pause');
  },
  resume() {
    this.mode = 'play'; input.clear();
    $('menu').classList.add('hidden'); hud.root.classList.remove('hidden');
    events.emit('resume');
  },
  enterPlay() {
    this.mode = 'play';
    $('menu').classList.add('hidden'); hud.root.classList.remove('hidden');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },
  // A duel. Most are fought in the arena; a test enemy can name a room level (`arena`) and starts for both sides there.
  startFight(id) {
    const d = ENEMY_BY_ID[id], L = d.arena && ALL_LEVELS.find(l => l.id === d.arena);
    this.kind = 'arena'; this.duelId = id;
    this.level = L ? { ...L, playerStart: d.playerStart, enemyStart: d.enemyStart } : ARENA;
    this.enterPlay(); this.reset();
  },
  startLevel(id) { this.kind = 'level'; this.level = ALL_LEVELS.find(l => l.id === id); this.enterPlay(); this.reset(); },
  leaveTutorial() { this.reset(); this.showMenu('levels'); },
  // R: instant on the death, win or level-complete screens; otherwise press twice.
  requestRestart() {
    if (!this.player.alive() || this.duelWon() || this.complete || this.restartArm > 0) { this.reset(); return; }
    this.restartArm = CONFIG.restartConfirmTime;
  },

  // ---- setup -----------------------------------------------------------------------------------
  clearActors() {
    if (this.player) this.player.rig.dispose();
    for (const e of this.enemies) e.rig.dispose();
    this.player = null; this.enemies = []; this.zones = []; this.duel = null;
    for (const p of particles) { p.life = 0; p.mesh.visible = false; }
    groundFx.clear(); swordTrail.clear(); projectiles.clear();
  },
  // Spawn options for a level entry: the one place placement rules live. Every placement stands on the
  // floor under it: the top-most one, or the highest at or below its `y` when it gives one.
  spawnSpec(entry, behavior) {
    const spec = this.placement(entry, behavior);
    return { ...spec, y: world.floorY(spec.x, spec.z, spec.y) };
  },
  placement(entry, behavior) {
    const L = this.level, V = CONFIG.level;
    const base = { behavior, notice: CONFIG.notice[behavior], leash: V.leash, homeLeash: V.homeLeash };
    if (behavior === 'ambush') {
      const a = L.alcoves.find(al => al.id === entry.alcove);
      return { ...base, x: a.x, z: a.side * (L.halfZ + L.alcoveDepth * V.ambushDepth), yaw: a.side > 0 ? Math.PI : 0 };
    }
    if (behavior === 'patrol') return { ...base, x: entry.path[0], y: entry.y, z: entry.z, yaw: entry.yaw ?? Math.PI / 2, path: entry.path };
    if (behavior === 'gated') return { ...base, ...entry.spawn };
    return { ...base, x: entry.x, y: entry.y, z: entry.z, yaw: entry.yaw };
  },
  makeEnemies() {
    if (this.kind === 'arena') {
      const s = this.level.enemyStart;
      this.duel = new Enemy(ENEMY_BY_ID[this.duelId], { ...s, y: world.floorY(s.x, s.z, s.y), behavior: 'arena', notice: CONFIG.notice.arena });
      return [this.duel];
    }
    // A dispersed enemy tied to a zone (`zone`) is not brought back once that zone's gate is open: its area is won.
    const won = s => s.zone && this.zones.some(z => z.id === s.zone && z.gate.open);
    return this.level.dispersed.filter(s => !won(s)).map(s => new Enemy(ENEMY_BY_ID[s.enemy], this.spawnSpec(s, s.behavior)));
  },
  // Full restart of the current fight or level.
  reset() {
    this.clearActors();
    input.pressed.clear();
    this.hitstop = 0; this.shake = 0; this.complete = false; this.deathTimer = 0; this.restartArm = 0; this.nextTimer = 0;
    $('fade').classList.remove('show');   // fades back in after a level transition
    this.setLock(null); this.retarget = true; this.tut = null; crowd.reset();
    const def = this.level;
    world = makeWorld(def, loadStage(def));
    const start = def.playerStart || def.start;
    this.spawn = { x: start.x, y: start.y, z: start.z, yaw: start.yaw };
    // A zone fights one enemy (`enemy` + `spawn`) or several (`enemies`); `members` lists them either way.
    this.zones = this.kind !== 'level' ? [] : (def.gated || []).map(g => ({ ...g, members: g.enemies || [{ enemy: g.enemy, spawn: g.spawn }],
      spawned: false, actors: [], gate: world.gates.find(w => w.id === g.id) }));   // a duel on a level fights no zones
    this.spawnPlayer();
    hud.reset(this);
    visuals.warmUp(this.cam);   // every pooled effect drawn once, so none stalls the first time it shows
    if (this.isTutorial()) {
      this.tut = { index: 0, flags: {}, dist: 0, doneTimer: 0, completeTimer: 0, hint: '', hintTimer: 0 };
      this.setupTutorialStep();
      return;
    }
    this.enemies = this.makeEnemies();
    if (this.kind === 'level') for (const z of this.zones) this.spawnZone(z);
  },
  // A fresh player at the respawn point: full health and full flasks, after a death too.
  spawnPlayer() {
    if (this.player) this.player.rig.dispose();
    const s = this.spawn, y = world.floorY(s.x, s.z, s.y);
    this.player = new Player(PLAYER_DEF, s.x, s.z, s.yaw, Number.isFinite(y) ? y : 0);
    this.cam.yaw = this.player.yaw;
    this.updateCamera(0, true);
    canvas.classList.remove('dying');
  },

  // ---- bonfires, death -------------------------------------------------------------------------
  nearBonfire() {
    const p = this.player;
    return world.bonfires.find(b => Math.hypot(b.x - p.x, b.z - p.z) < CONFIG.rest.range
      && Math.abs(world.floorY(b.x, b.z, b.y) - p.y) < CONFIG.height.reach) || null;
  },
  // The bonfire the player could rest at right now, or null (none near, or an enemy is closing in).
  canRest() {
    const p = this.player, b = this.nearBonfire();
    if (!b) return null;
    const threatened = this.enemies.some(e => !e.training && e.alive() && e.awake() && !e.in('unaware') &&
      Math.hypot(e.x - p.x, e.z - p.z) < CONFIG.rest.blockRange && !gateBetween(e, p));
    return threatened ? null : b;
  },
  tryRest() {
    const p = this.player, b = this.canRest();
    if (!b || !p.isFree()) return;
    p.hp = p.maxHp; p.stamina = p.maxStamina; p.vx = p.vz = 0;
    p.setState(PS.REST);
    p.refillItems();
    const off = CONFIG.rest.respawnOffset;
    this.spawn = b.spawn ? { ...b.spawn }
      : { x: b.x + (b.x > p.x ? -off : off), z: b.z, yaw: this.level.start ? this.level.start.yaw : p.yaw };
    if (!this.isTutorial()) this.respawnEnemies();
    this.setLock(null); this.retarget = true;
    hud.showRested();
    events.emit('rest', { bonfire: b });
  },
  // Rest: every enemy returns at full HP except those whose gates are already open.
  respawnEnemies() {
    const keep = new Set(this.zones.filter(z => z.gate.open).flatMap(z => z.actors));
    for (const e of this.enemies) if (!keep.has(e)) e.rig.dispose();
    for (const z of this.zones) if (!z.gate.open) { z.spawned = false; z.actors = []; }
    this.enemies = [...keep, ...this.makeEnemies()];
    for (const z of this.zones) if (!z.gate.open) this.spawnZone(z);
  },
  // Zone enemies stand at their posts from the start (visible down the hall), and wait there until they notice the player.
  spawnZone(z) {
    z.spawned = true;
    z.actors = z.members.map(m => new Enemy(ENEMY_BY_ID[m.enemy], this.spawnSpec({ ...m, ...m.spawn }, m.behavior || 'gated')));
    this.enemies.push(...z.actors);
  },
  onPlayerDeath() {
    const p = this.player;
    this.deathTimer = 0; this.setLock(null);
    canvas.classList.add('dying');
    events.emit('playerDeath', { player: p });
  },

  // ---- lock-on -----------------------------------------------------------------------------------
  setLock(e) { this.lock = e; this.lockLost = 0; this.lockHidden = 0; },
  addShake(time, amp) {
    if (amp * time < this.shakeAmp * this.shake) return;   // keep the stronger shake
    this.shake = this.shakeDur = time; this.shakeAmp = amp;
  },
  inView(e) {
    const v = new THREE.Vector3(e.x, e.y + e.height * 0.5, e.z).project(camera);
    return v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 ? v : null;
  },
  // Valid targets: in lock range, and on screen or in front of the player. `v`: where on screen (null if off it).
  lockable() {
    const p = this.player;
    return findEnemies(p, this.enemies, { range: CONFIG.lock.range })
      .map(c => ({ ...c, v: this.inView(c.e) }))
      .filter(c => c.v || isInFront(p, c.e.x, c.e.z));
  },
  // Lock-on: the valid targets ordered by closeness to the screen centre, then distance.
  lockCandidates() {
    return this.lockable().sort((a, b) => ((a.v ? Math.abs(a.v.x) : 2) - (b.v ? Math.abs(b.v.x) : 2)) || a.d - b.d).map(c => c.e);
  },
  // Tab: the valid targets nearest first (the camera keeps the target centred, so screen order would jump past it).
  switchCandidates() { return this.lockable().sort((a, b) => a.d - b.d).map(c => c.e); },
  // The on-screen target nearest to the current one in direction `dir` (-1 left, 1 right), or null.
  sideTarget(dir) {
    const cur = this.inView(this.lock), x0 = cur ? cur.x : 0;
    let best = null, bestD = Infinity;
    for (const { e } of findEnemies(this.player, this.enemies, { range: CONFIG.lock.range })) {
      const v = e !== this.lock && this.inView(e), d = v ? (v.x - x0) * dir : 0;
      if (d > 0 && d < bestD) { bestD = d; best = e; }
    }
    return best;
  },
  // Always-retarget's pick: the enemy fighting the player (it has noticed the player; never a training dummy) with the
  // lowest score, its distance from the middle of the screen (0 middle, 1 edge) plus its distance from the player per
  // `retargetDistance` m. Archers only within `autoRange`, or when nothing else is fighting.
  retargetPick() {
    const L = CONFIG.lock;
    const fighting = this.lockable().filter(({ e }) => e.fightingPlayer());
    const melee = fighting.filter(c => !c.e.ranged || c.d <= L.autoRange), pool = melee.length ? melee : fighting;
    const score = c => (c.v ? Math.abs(c.v.x) : L.offScreenScore) + c.d / L.retargetDistance;
    let best = null;
    for (const c of pool) if (!best || score(c) < score(best)) best = c;
    return best ? best.e : null;
  },
  // Lock-on. While `retarget` is on (from every level start, rest and death, and each Q lock-on) a lost or dead target
  // is replaced at once by retargetPick; releasing the lock with Q turns it off, leaving the one-time lock on each
  // enemy's first encounter and the next target after a kill (nearest the middle of the screen).
  updateLock(dt) {
    const p = this.player;
    if (input.consume('lock')) {
      if (this.lock) { this.setLock(null); this.retarget = false; }
      else {
        this.retarget = true;
        const c = this.lockCandidates(); if (c.length) { this.setLock(c[0]); events.emit('lock'); }
      }
    }
    // Switch target: Tab steps to the next candidate further away, wrapping round (from a target that is not a
    // candidate, to the nearest); a right-stick flick picks the nearest one on that side of the screen.
    const flick = { PadFlickL: -1, PadFlickR: 1 }[input.pressedCode('switchTarget')] || 0;
    if (input.consume('switchTarget') && this.lock) {
      const prev = this.lock;
      if (flick) { const e = this.sideTarget(flick); if (e) this.setLock(e); }
      else {
        const c = this.switchCandidates();
        if (c.length) this.setLock(c[(c.indexOf(this.lock) + 1) % c.length]);
      }
      if (this.lock !== prev) events.emit('switchTarget');
    }
    // Auto lock-on (retarget off): the first time each enemy comes into range (and into view), lock onto it
    // unless already locked. An enemy is only ever auto-locked once.
    if (p.alive()) {
      for (const { e } of findEnemies(p, this.enemies, { range: CONFIG.lock.autoRange })) {
        if (e.discovered || (!this.inView(e) && !isInFront(p, e.x, e.z))) continue;
        e.discovered = true;
        if (!this.lock && !this.retarget) this.setLock(e);
      }
    }
    const t = this.lock;
    if (t && !t.alive() && p.alive()) {   // the target fell: move straight on to the next one in reach, if any
      this.setLock(this.retarget ? null : this.lockCandidates().find(e => e !== t) || null);
    } else if (t) {
      if (!t.alive() || !p.alive() || closedGateBetween(p, t) || Math.hypot(t.x - p.x, t.z - p.z) > CONFIG.lock.breakRange) this.setLock(null);
      else {
        // Off screen, or hidden behind cover (walls, pillars, props, floors): let go only once it has lasted a while.
        this.lockLost = this.inView(t) ? 0 : this.lockLost + dt;
        this.lockHidden = gateBetween(p, t) ? this.lockHidden + dt : 0;
        if (this.lockLost > CONFIG.lock.lostTime || this.lockHidden > CONFIG.lock.coverTime) this.setLock(null);
      }
    }
    if (this.retarget && !this.lock && p.alive()) { const e = this.retargetPick(); if (e) this.setLock(e); }
  },

  // ---- tutorial ---------------------------------------------------------------------------------
  // Each step: prompt text (labels from the live bindings), which dummies it needs, whether it starts locked on
  // to its dummy (`lockOn`: once, as it starts), optional setup, and how it completes: on(type, data, t, game) for
  // events and/or check(game, t) polled each step. Returning true from either advances the tutorial.
  tutorialSteps() {
    const B = bindLabel;
    const byPlayer = (d, g) => d.attacker === g.player;
    const byDummy = (d, g) => d.attacker === g.enemies[0];
    return [
      { id: 'move', text: () => `Walk around ${moveLabel()}`, check: (g, t) => t.dist >= 5 },
      { id: 'jump', text: () => `Jump ${B('jump')}`, check: g => g.player.state === PS.JUMP },
      { id: 'roll', text: () => `Roll ${B('roll')}: a quick dodge, briefly invulnerable`, check: g => g.player.state === PS.ROLL },
      { id: 'light', dummies: 'one', text: () => `Hit the dummy with a light attack ${B('light')}`,
        on: (type, d, t, g) => type === 'strike' && byPlayer(d, g) && d.strike.attackId === 'light' },
      { id: 'heavy', dummies: 'one', text: () => `Hit the dummy with a heavy attack ${B('heavy')}: slower, stronger`,
        on: (type, d, t, g) => type === 'strike' && byPlayer(d, g) && d.strike.attackId === 'heavy' },
      { id: 'jumpAttack', dummies: 'one', text: () => `Jump ${B('jump')}, then attack in the air ${B('light')} or ${B('heavy')} to hit the dummy`,
        on: (type, d, t, g) => { if (type === 'strike' && byPlayer(d, g) && d.strike.air) t.flags.airHit = true; },
        check: (g, t) => t.flags.airHit && g.player.state !== PS.JUMP_ATTACK && g.player.state !== PS.LAND },   // after the landing
      { id: 'block', dummies: 'sparring', lockOn: true, text: () => `Hold block ${B('block')} and take the dummy's swing on your guard`,
        on: (type, d, t, g) => type === 'strike' && d.target === g.player && d.blocked },
      { id: 'parry', dummies: 'sparring', lockOn: true, text: () => `Parry ${B('parry')} just before the dummy's swing lands`,
        on: type => type === 'parry' },
      // Done on one roll through the swing. A swing that ends without one shows why: hit after rolling during it, its
      // invulnerability over before the swing landed (too early), hit without having rolled (too late), or rolled clear
      // of it (`swing`: this swing so far; a roll that starts in the step a hit lands is invulnerable, so it never counts).
      { id: 'dodge', dummies: 'dodge', lockOn: true,
        text: () => `Blue strikes can't be blocked or parried, only rolled. Roll ${B('roll')} into the dummy's swing just as it lands`,
        on: (type, d, t, g) => {
          if (type === 'attackStart' && d.enemy === g.enemies[0]) t.flags.swing = { rolled: false, hit: null };
          if (type === 'strike' && byDummy(d, g) && t.flags.swing) t.flags.swing.hit = t.flags.swing.rolled ? 'Too early' : 'Too late';
          return type === 'dodge' && byDummy(d, g);
        },
        check: (g, t) => {
          const e = g.enemies[0], s = t.flags.swing;
          if (s && g.player.state === PS.ROLL && (e.state === ES.WINDUP || e.state === ES.ACTIVE)) s.rolled = true;
          if (s && e.state === ES.RECOVER) {
            const hint = s.hit || (s.rolled ? 'Roll into the swing' : null);
            if (hint) g.tutorialHint(hint);
            t.flags.swing = null;
          }
          return false;
        } },
      { id: 'flask', text: () => `You're hurt. Drink from your flask ${B('flask')}`,
        setup: g => { const it = g.player.item('flask'); g.player.hp = Math.min(g.player.hp, 55); if (g.player.inventory.flask) it.count = Math.max(it.count, 1); },
        on: (type, d, t) => { if (type === 'itemUsed' && d.item === 'flask') t.flags.drank = true; },
        check: (g, t) => t.flags.drank && g.player.state !== PS.USE_ITEM },
      { id: 'rest', text: () => `Walk to the bonfire and rest ${B('rest')}`, on: type => type === 'rest' },
      { id: 'lock', dummies: 'one', text: () => `Lock on to the dummy ${B('lock')}`, on: type => type === 'lock' },
      { id: 'switch', dummies: 'pair', text: () => `Lock on ${B('lock')}, then switch target ${B('switchTarget')}`,
        on: type => type === 'switchTarget' },
      { id: 'zoom', text: () => `Zoom the camera in ${B('zoomIn', 'Wheel up')} and out ${B('zoomOut', 'Wheel down')}`,
        on: (type, d, t) => { if (type === 'zoom') t.flags[d.dir < 0 ? 'zoomIn' : 'zoomOut'] = true; return t.flags.zoomIn && t.flags.zoomOut; } },
      { id: 'pause', text: () => `Open the pause menu ${systemLabel('pause')}, then close it again ${systemLabel('pause')}`,
        on: (type, d, t) => { if (type === 'pause') t.flags.paused = true; return type === 'resume' && t.flags.paused; } },
    ];
  },
  currentStep() { return this.tut ? this.tutorialSteps()[this.tut.index] || null : null; },
  tutorialAllowsPause() { const s = this.currentStep(); return !!s && s.id === 'pause' && this.tut.doneTimer <= 0; },
  // Fresh dummies for the step (this is also how a dummy "resets").
  setupTutorialStep() {
    const T = this.level.training, L = this.level, t = this.tut, s = this.currentStep(), p = this.player;
    for (const e of this.enemies) e.rig.dispose();
    this.enemies = []; this.setLock(null);
    t.flags = {}; t.dist = 0; t.hint = ''; t.hintTimer = 0;
    if (!s) return;
    const dir = p.x + T.pairAhead < L.length - 3 ? 1 : -1;   // place ahead, or behind near the far wall
    const spot = ahead => ({ x: clamp(p.x + dir * ahead, 2, L.length - 2), z: clamp(p.z, -L.halfZ + 2, L.halfZ - 2) });
    const add = (id, behavior, at) => {
      this.enemies.push(new Enemy(ENEMY_BY_ID[id], { x: at.x, z: at.z, yaw: Math.atan2(p.x - at.x, p.z - at.z), behavior, notice: CONFIG.notice[behavior] }));
    };
    if (s.dummies === 'one') add(T.dummy, 'dummy', spot(T.dummyAhead));
    else if (s.dummies === 'sparring') add(T.sparring, 'sparring', spot(T.attackerAhead));
    else if (s.dummies === 'dodge') add(T.dodge, 'sparring', spot(T.attackerAhead));
    else if (s.dummies === 'pair') {
      const c = spot(T.pairAhead);
      for (const side of [-1, 1]) add(T.dummy, 'dummy', { x: c.x, z: clamp(c.z + side * T.pairSpread, -L.halfZ + 1.5, L.halfZ - 1.5) });
    }
    if (s.lockOn) this.setLock(this.enemies[0]);   // set once: let go, it stays off (dummies never auto lock-on)
    if (s.setup) s.setup(this, t);
  },
  completeStep() { this.tut.doneTimer = CONFIG.tutorial.doneTime; },
  // A short hint under the prompt (CONFIG.tutorial.hintTime), replacing any shown.
  tutorialHint(text) { this.tut.hint = text; this.tut.hintTimer = CONFIG.tutorial.hintTime; },
  onTutorialEvent(type, data) {
    const t = this.tut, s = this.currentStep();
    if (!this.isTutorial() || !t || !s || t.doneTimer > 0 || !s.on) return;
    if (s.on(type, data, t, this)) this.completeStep();
  },
  updateTutorial(dt) {
    const t = this.tut, p = this.player;
    if (t.completeTimer > 0) {   // all steps done: show the message, then back to the Levels list
      t.completeTimer -= dt;
      if (t.completeTimer <= 0) this.leaveTutorial();
      return;
    }
    const s = this.currentStep();
    if (!s) return;
    t.hintTimer = Math.max(0, t.hintTimer - dt);
    if (t.doneTimer > 0) {   // brief confirmation before the next prompt replaces this one
      t.doneTimer -= dt;
      if (t.doneTimer <= 0) {
        t.index++;
        if (this.currentStep()) this.setupTutorialStep();
        else { for (const e of this.enemies) e.rig.dispose(); this.enemies = []; t.completeTimer = CONFIG.tutorial.completeTime; }
      }
      return;
    }
    if (p.state === PS.WALK) t.dist += Math.hypot(p.x - p.px, p.z - p.pz);
    if (s.check && s.check(this, t)) this.completeStep();
  },

  // ---- level -------------------------------------------------------------------------------------
  // Gated zones: spawn on entry, lift the gate when all the zone's enemies fall. Complete when all gates are open.
  // Shortcut gates (`opensFrom`) open for good once the player reaches their far side, on the gate's floor; sealed
  // gates never open. Traps: standing on the trap's floor in its trigger starts the warning; when the warning runs
  // out, its collapse area becomes a hole for good (through resting and dying, like an opened shortcut).
  updateLevel(dt) {
    const p = this.player, V = CONFIG.level;
    for (const z of this.zones) {
      const entered = typeof z.trigger === 'number' ? p.x > z.trigger : inArea(z.trigger, p.x, p.z);
      if (!z.spawned && entered && p.alive()) this.spawnZone(z);   // normally already standing there since the start
      if (z.actors.length && z.actors.every(a => !a.alive()) && !z.gate.open) {
        z.gate.open = true;
        events.emit('gateOpened', { gate: z.gate });
      }
    }
    for (const g of world.gates) {
      if (g.opensFrom && !g.open && p.alive() && inRect(g.opensFrom, p.x, p.z) && Math.abs(p.y - g.y) <= CONFIG.height.reach) {
        g.open = true;
        events.emit('gateOpened', { gate: g, shortcut: true });
      }
      if (g.open) g.lift = Math.min(1, g.lift + dt / V.gateLiftTime);
    }
    for (const t of world.traps) {
      if (t.state === 'set' && p.alive() && p.grounded && inRect(t.trigger, p.x, p.z) && Math.abs(p.y - t.y) < CONFIG.height.stepUp) {
        t.state = 'warning'; t.timer = 0;
        events.emit('trapWarning', { trap: t });
      } else if (t.state === 'warning') t.timer += dt;
      else if (t.state === 'sprung') t.dropTime += dt;
      if (t.state === 'warning' && t.timer >= t.warning - 1e-9) {
        t.state = 'sprung'; world.openHole(t.region, t.collapse);
        events.emit('trapSprung', { trap: t });
      }
    }
    if (!this.complete && this.zones.length && this.zones.every(z => z.gate.open)) {
      this.complete = true;
      events.emit('levelComplete');
    }
    // Carry straight on into the next level: wait, fade to black, then load it.
    if (this.complete && this.level.next && p.alive()) {
      const N = CONFIG.nextLevel;
      this.nextTimer += dt;
      if (this.nextTimer >= N.delay) $('fade').classList.add('show');
      if (this.nextTimer >= N.delay + N.fadeTime) this.startLevel(this.level.next);
    }
  },

  // Alert (levels with `alert`): each enemy that just noticed the player wakes unaware enemies near it
  // with a clear line between them; the woken pass it on. `was`: enemies unaware before this step.
  spreadAlert(was) {
    const R = CONFIG.alert.radius;
    const queue = this.enemies.filter(e => was.has(e) && e.alive() && !e.in('unaware') && e.state !== ES.DORMANT);
    for (const e of queue) events.emit('alert', { enemy: e });
    while (queue.length) {
      const a = queue.shift();
      for (const e of this.enemies) {
        if (e === a || Math.hypot(e.x - a.x, e.z - a.z) > R || gateBetween(a, e)) continue;
        if (e.wake()) { events.emit('alert', { enemy: e, by: a }); queue.push(e); }
      }
    }
  },

  // HUD/camera target: the locked target, else the closest awake enemy within range
  // (the arena duel always shows its opponent).
  target() {
    if (this.lock) return this.lock;
    if (this.kind === 'arena') return this.duel;
    let best = null;
    for (const c of findEnemies(this.player, this.enemies, { range: CONFIG.level.targetRange, deadFor: CONFIG.fx.deadTargetTime }))
      if (!best || c.d < best.d) best = c;
    return best ? best.e : null;
  },

  // Movement input: relative to the target when locked on, otherwise to the camera's heading.
  // Keys give full speed; the gamepad's left stick is analog (length 0..1), so a slight tilt walks slowly.
  moveInput() {
    let ix = (input.isHeld('right') ? 1 : 0) - (input.isHeld('left') ? 1 : 0);
    let iy = (input.isHeld('up') ? 1 : 0) - (input.isHeld('down') ? 1 : 0), mag = 1;
    if (!ix && !iy) { ix = gamepad.move.x; iy = gamepad.move.y; mag = Math.min(1, Math.hypot(ix, iy)); }
    if (!ix && !iy) return { x: 0, z: 0, has: false };
    const p = this.player, yaw = this.lock ? Math.atan2(this.lock.x - p.x, this.lock.z - p.z) : this.cam.yaw;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const x = fx * iy - fz * ix, z = fz * iy + fx * ix, l = Math.hypot(x, z);
    return { x: x / l * mag, z: z / l * mag, has: true };
  },

  stepZoom(dir) {
    const Z = CONFIG.zoom;
    this.zoomTarget = clamp(this.zoomTarget + dir * Z.step, Z.min, Z.max);
    events.emit('zoom', { dir });
  },
  updateZoomKeys(dt) {
    const dir = (input.isHeld('zoomOut') ? 1 : 0) - (input.isHeld('zoomIn') ? 1 : 0);
    if (input.consume('zoomIn')) { this.stepZoom(-1); this.zoomRepeat = CONFIG.zoom.repeatDelay; }
    if (input.consume('zoomOut')) { this.stepZoom(1); this.zoomRepeat = CONFIG.zoom.repeatDelay; }
    if (!dir) return;
    this.zoomRepeat -= dt;
    if (this.zoomRepeat <= 0) { this.stepZoom(dir); this.zoomRepeat = CONFIG.zoom.repeat; }
  },
  mouseLook(dx, dy) {
    if (this.mode !== 'play' || this.lock) return;   // no mouse camera while locked on
    const M = CONFIG.mouse, s = settings.sensitivity;
    this.cam.yaw -= dx * M.yawPerPx * s;
    this.cam.pitch = clamp(this.cam.pitch + dy * M.pitchPerPx * s * (settings.invert ? -1 : 1), M.pitchMin, M.pitchMax);
    this.mouseHold = M.holdTime;
  },

  // Right stick (x, y in -1..1, y down), once per rendered frame: turns the camera like the mouse.
  stickLook(x, y, dt) {
    if (this.mode !== 'play' || this.lock) return;
    const G = CONFIG.gamepad, M = CONFIG.mouse, s = settings.sensitivity / 5;
    this.cam.yaw -= x * G.lookYaw * s * dt;
    this.cam.pitch = clamp(this.cam.pitch + y * G.lookPitch * s * dt * (settings.invert ? -1 : 1), M.pitchMin, M.pitchMax);
    this.mouseHold = M.holdTime;
  },

  // Room levels: the fraction (0..1) of the segment from (x, y, z) by (dx, dy, dz) that stays clear of walls,
  // pillars, ledges, floors, roofs and closed gates (rails are low enough to look over). Props count without the
  // margin, so a low one (a cart, a well) right behind the player never snaps the camera onto the player's head.
  boomFit(x, y, z, dx, dy, dz) {
    const m = CONFIG.camera.wallMargin;
    let f = 1;
    for (const s of world.solids) if (!s.low) f = Math.min(f, segBox3(x, y, z, dx, dy, dz, s, s.kind === 'prop' ? 0 : m));
    for (const s of world.slabs) f = Math.min(f, segBox3(x, y, z, dx, dy, dz, s, m));
    for (const g of world.gates) if (!g.open) f = Math.min(f, segBox3(x, y, z, dx, dy, dz, g.box, m));
    return f;
  },
  // A camera height at (x, z): above the floor there and under the roof (or walkway) over the player's head.
  camY(x, z, y, base) {
    const K = CONFIG.camera, floor = world.groundAt(x, z, y), ceil = world.ceilingAt(x, z, base + K.lookHeight);
    return Math.min(Math.max(y, (floor > -Infinity ? floor : base) + K.floor), ceil - K.ceilingMargin);
  },
  updateCamera(dt, snap) {
    const K = CONFIG.camera, Z = CONFIG.zoom, Lk = CONFIG.lock, W = world, p = this.player, c = this.cam;
    const k = snap ? 1 : 1 - Math.exp(-K.followRate * dt);
    c.zoom += (this.zoomTarget - c.zoom) * (snap ? 1 : 1 - Math.exp(-Z.rate * dt));
    // Ground reference: follows the floor the player stands on (stairs, drops) but not the rise of a jump,
    // which lifts the camera only half as much.
    const ref = p.grounded ? p.y : Math.min(c.ref ?? p.y, p.y);
    c.ref = snap || c.ref === undefined ? ref : c.ref + (ref - c.ref) * (1 - Math.exp(-K.refRate * dt));
    const base = c.ref + (p.y - c.ref) * 0.5;
    let dist = c.zoom, pitch = c.pitch;
    const look = new THREE.Vector3(p.x, base + K.lookHeight, p.z);
    const lock = this.lock;
    if (lock) {
      // Behind the player, aimed between player and target; pull back for big or distant targets.
      const dx = lock.x - p.x, dz = lock.z - p.z, sep = Math.hypot(dx, dz);
      // Loose yaw: inside the slack the camera barely drifts, so circling the target leaves it
      // off to one side (seeing both); only the part beyond the slack is followed firmly.
      const off = angDiff(Math.atan2(dx, dz), c.yaw);
      const excess = Math.sign(off) * Math.max(0, Math.abs(off) - Lk.slack);
      if (snap) c.yaw += off;
      else c.yaw += excess * (1 - Math.exp(-Lk.camYawRate * dt)) + (off - excess) * Lk.drift * dt;
      look.x += dx * Lk.frame; look.z += dz * Lk.frame;
      look.y = lerp(look.y, lock.y + lock.height * 0.55, Lk.frame);
      dist += Math.min(Lk.maxExtra, Math.max(0, lock.height - 1.6) * Lk.sizeDist + sep * Lk.sepDist);
      pitch = Math.max(0, pitch) * 0.5 + Math.max(0, lock.height - 2) * 0.05;
    } else {
      // Swing behind the player's facing; no pull when the player runs straight at the camera.
      this.mouseHold = Math.max(0, this.mouseHold - dt);
      if (this.mouseHold <= 0) c.yaw += Math.sin(angDiff(p.yaw, c.yaw)) * K.yawFollow * dt;
      const e = this.target();
      if (e && e.alive()) {
        const dx = e.x - p.x, dz = e.z - p.z;
        const w = ease(1 - Math.hypot(dx, dz) / K.leanRange);
        look.x += dx * K.leanAmount * w; look.z += dz * K.leanAmount * w;
        dist += K.leanPullback * w; pitch += K.leanRaise * w / dist;
      }
    }
    const height = dist * (Z.heightRatio + pitch);
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    // Keep the camera inside the walls and on the player's side of closed gates:
    // shorten the boom from the player until it fits.
    const loX = W.minX + K.wallMargin, hiX = W.maxX - K.wallMargin, limZ = W.halfZ - K.wallMargin;
    const ox = -fx * dist, oz = -fz * dist, head = base + K.lookHeight;
    let t = 1;
    const fit = (from, off, lim, above) => { if (above ? from + off > lim : from + off < lim) t = Math.min(t, (lim - from) / off); };
    if (W.solids) {   // room levels: stop short of any wall, ledge, floor, roof or closed gate, in 3D
      const ty = this.camY(p.x + ox, p.z + oz, base + height, base);
      t = this.boomFit(p.x, head, p.z, ox, ty - head, oz);
    } else {
      fit(p.x, ox, hiX, true); fit(p.x, ox, loX, false); fit(p.z, oz, limZ, true); fit(p.z, oz, -limZ, false);
      for (const g of W.gates) {
        if (g.open) continue;
        if (p.x < g.x) fit(p.x, ox, g.x - K.gateMargin, true); else fit(p.x, ox, g.x + K.gateMargin, false);
      }
    }
    t = Math.max(0, t);
    const wx = p.x + ox * t, wz = p.z + oz * t;
    const want = new THREE.Vector3(wx, this.camY(wx, wz, base + height * Math.max(t, 0.5) + (1 - t) * K.closeRaise, base), wz);
    c.pos.lerp(want, k); c.look.lerp(look, k);
    if (W.solids) {
      // The smoothed position can cut a corner: pull it back along the line from the player if it would.
      const dx = c.pos.x - p.x, dz = c.pos.z - p.z, f = this.boomFit(p.x, head, p.z, dx, c.pos.y - head, dz);
      if (f < 1) { c.pos.x = p.x + dx * f; c.pos.z = p.z + dz * f; }
    } else { c.pos.x = clamp(c.pos.x, loX, hiX); c.pos.z = clamp(c.pos.z, -limZ, limZ); }
    c.pos.y = this.camY(c.pos.x, c.pos.z, c.pos.y, base);   // never through floor or ceiling
    if (snap) { c.prevPos.copy(c.pos); c.prevLook.copy(c.look); }
  },

  // Culled levels: an unaware enemy far from the player sleeps (no update, not drawn) until the player comes
  // near or an alert wakes it. Enemies that are fighting, reeling or dying always run.
  sleeps(e) {
    e.asleep = this.kind === 'level' && !!this.level.cull && e.alive() && (e.in('unaware') || e.state === ES.DORMANT)
      && Math.hypot(e.x - this.player.x, e.z - this.player.z) > CONFIG.cull.enemyRange;
    return e.asleep;
  },
  // One fixed step. Order: death sequence or hit-pause (and stop), lock-on, rest, player, enemies,
  // body separation, combat, deaths, level gates or tutorial, camera.
  update(dt) {
    const p = this.player, c = this.cam;
    p.savePrev(); for (const e of this.enemies) e.savePrev();
    c.prevPos.copy(c.pos); c.prevLook.copy(c.look);
    this.restartArm = Math.max(0, this.restartArm - dt);
    this.updateZoomKeys(dt);
    if (!p.alive()) {
      // Death: the world slows to a stop, then the player returns to the last rested bonfire.
      this.deathTimer += dt;
      if (this.deathTimer >= CONFIG.death.respawnDelay) {   // back at the bonfire; the world resets as when resting
        this.spawnPlayer(); this.setLock(null); this.retarget = true;
        if (!this.isTutorial()) this.respawnEnemies();
        return;
      }
      const slow = clamp(1 - this.deathTimer / CONFIG.death.slowTime, 0, 1);
      if (slow > 0) for (const e of this.enemies) if (!this.sleeps(e)) e.update(dt * slow, p);
      if (slow > 0) projectiles.update(this, dt * slow);
      p.update(dt, { x: 0, z: 0, has: false }, [], null);
      this.updateCamera(dt, false);
      return;
    }
    if (this.hitstop > 0) { this.hitstop -= dt; input.hold(dt); return; }   // hit-pause: both sides freeze
    this.updateLock(dt);
    if (input.consume('rest')) this.tryRest();
    const live = this.enemies.filter(e => e.alive());
    const alerting = this.kind === 'level' && this.level.alert;
    const unaware = alerting ? new Set(live.filter(e => e.in('unaware') || e.state === ES.DORMANT)) : null;
    p.update(dt, this.moveInput(), live, this.lock);
    crowd.update(this, dt);
    for (const e of this.enemies) if (!this.sleeps(e)) e.update(dt, p);
    separateBodies(p, this.enemies);
    resolveCombat(this);
    projectiles.update(this, dt);
    if (alerting) this.spreadAlert(unaware);
    for (const e of this.enemies) if (!e.alive() && !e.rewarded) { e.rewarded = true; events.emit('enemyDeath', { enemy: e }); }
    if (!p.alive() && this.isTutorial()) {   // nothing can kill you in the tutorial
      p.hp = 1; p.stunTime = CONFIG.player.hurtTime; p.setState(PS.HURT);
    }
    if (!p.alive()) this.onPlayerDeath();
    if (this.isTutorial()) this.updateTutorial(dt);
    else if (this.kind === 'level') this.updateLevel(dt);
    this.updateCamera(dt, false);
  },

  render(alpha, frameDt) {
    const p = this.player, c = this.cam, t = performance.now() / 1000;
    const frozen = this.hitstop > 0, sub = frozen ? 0 : alpha * CONFIG.step;
    const at = b => ({ x: lerp(b.px, b.x, alpha), y: lerp(b.py, b.y, alpha), z: lerp(b.pz, b.z, alpha),
                       yaw: b.pyaw + angDiff(b.yaw, b.pyaw) * alpha });
    const placed = [p, ...this.enemies].map(b => [b, at(b)]);
    for (const [b, q] of placed) {
      if (b.asleep) { b.rig.root.visible = b.rig.shadow.visible = false; continue; }
      b.rig.place(q.x, q.y, q.z, q.yaw, world.groundAt(q.x, q.z, q.y + 0.05));
      b.pose(b.stateTime + sub, { t, dt: frameDt, yaw: q.yaw, px: p.x, pz: p.z });
    }
    camera.position.lerpVectors(c.prevPos, c.pos, alpha);
    if (this.shake > 0) {
      const a = this.shakeAmp * this.shake / this.shakeDur;
      camera.position.x += rand(-a, a); camera.position.y += rand(-a, a); camera.position.z += rand(-a, a);
      this.shake = Math.max(0, this.shake - frameDt);
    }
    camera.lookAt(new THREE.Vector3().lerpVectors(c.prevLook, c.look, alpha));
    projectiles.render(frozen ? 1 : alpha);
    const lockAt = this.lock && placed.find(([b]) => b === this.lock);
    lockMarker.visible = !!lockAt;
    if (lockAt) {
      const q = lockAt[1];
      lockMarker.position.set(q.x, q.y + this.lock.height + CONFIG.lock.markerGap, q.z);
      lockMarker.rotation.y = t * 2.5;
    }
    for (const g of world.gates) placeGate(g);
    for (const t of world.traps) placeTrap(t);
    // Irregular, subtle flicker in brightness and warmth.
    flames.forEach((f, i) => {
      const s = f.seed;
      const k = Math.sin(t * 11 + s) * 0.45 + Math.sin(t * 23.7 + s * 1.3) * 0.25 + Math.sin(t * 5.3 + s * 0.7) * 0.35 + Math.sin(t * 37.1 + i) * 0.1;
      if (f.light) {
        f.light.intensity = f.base * (1 + k * 0.1);
        f.light.color.copy(f.color).offsetHSL(k * 0.008, 0, k * 0.02);
      }
      f.mesh.scale.set(1 + k * 0.08, 1 + k * 0.16, 1 + k * 0.08); f.mesh.rotation.y = t * 2;
    });
    updateDust(t);
    swordTrail.update(p.state === PS.JUMP_ATTACK, p.rig);
    groundFx.update(frameDt);
    updateParticles(frameDt);
    updateDebug(this, hud.showHitboxes(), placed);
    hud.update(this, frameDt);
    visuals.render(this, t, frameDt);
  },
};
