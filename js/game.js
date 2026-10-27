'use strict';
// ============================================================================
// 11. Game
// ============================================================================
const Game = {
  mode: 'menu',          // 'menu' | 'play' | 'pause'
  screen: 'main',        // menu screen: 'main' | 'story' | 'arena' | 'levels' | 'enemies' | 'bosses' | 'pause' | 'options' | ...
  kind: 'arena',         // what is being played: 'arena' (single duel) | 'level'
  story: false,          // Story mode (js/story.js): levels chain through STORY's chapters and progress is saved
  level: null,           // the level (or ARENA) being played
  duelId: null, duel: null,   // arena opponent
  duelPartners: [],           // further arena opponents fought at once (online boss groups)
  eldenBoss: null,       // Elden Ring Bosses mode (js/elden.js): the ELDEN_BOSSES entry being fought, else null
  selected: 0,
  companion: null,       // optional local campaign ally (js/companions.js)
  allies() { return companions.actors(this); },
  player: null, enemies: [], zones: [], renderHooks: [], timeScale: 1, hitstop: 0, shake: 0, shakeDur: 1, shakeAmp: 0, complete: false,
  lock: null, lockLost: 0, lockHidden: 0, restartArm: 0,
  retarget: true,        // always-retarget lock-on (see updateLock): off once Q lets go of a lock
  spawn: null, deathTimer: 0,
  hazardTimers: new Map(),   // the human's hazard-floor tick clocks (Player.standInHazards)
  cleared: new Set(),    // checkpoints: keys of the enemies killed before the last rest (they stay dead until a restart)
  loading: 0,            // s the loading screen still holds the world (CONFIG.loading)
  zoomTarget: CONFIG.zoom.default, mouseHold: 0,
  cam: { yaw: 0, pitch: 0, zoom: CONFIG.zoom.default, pos: new THREE.Vector3(), look: new THREE.Vector3(),
         prevPos: new THREE.Vector3(), prevLook: new THREE.Vector3() },

  duelWon() { return this.kind === 'arena' && !!this.duel && this.enemies.every(e => !e.alive()); },

  // ---- setup -----------------------------------------------------------------------------------
  // A placement's checkpoint key: what it is and where it stands (bonfire checkpoints remember enemies by it).
  placementKey(entry, prefix = '') {
    const at = entry.alcove ?? (entry.path ? `${entry.path.join('-')}/${entry.z}` : `${entry.x},${entry.y ?? 0},${entry.z}`);
    return `${prefix}${entry.behavior || ''}:${entry.enemy}@${at}`;
  },
  clearActors(retainPrograms = false) {
    const retired = [...this.allies(), ...this.enemies];
    for (const b of retired) {
      if (retainPrograms) scene.remove(b.rig.root, b.rig.shadow);
      else b.rig.dispose();
    }
    this.player = null; this.companion = null; companions.hide(); this.enemies = []; this.zones = []; this.duel = null;
    for (const p of particles) { p.life = 0; p.mesh.visible = false; }
    particleBatch.visible = false; particleBatch.count = 0;
    groundFx.clear(); swordTrail.clear(); projectiles.clear();
    return retired;
  },
  // Spawn options for a level entry: the one place placement rules live. Every placement stands on the
  // floor under it: the top-most one, or the highest at or below its `y` when it gives one.
  spawnSpec(entry, behavior) {
    const spec = this.placement(entry, behavior);
    return { ...spec, y: world.floorY(spec.x, spec.z, spec.y) };
  },
  placement(entry, behavior) {
    const L = this.level, V = CONFIG.level;
    const base = { behavior, notice: entry.notice ?? CONFIG.notice[behavior], leash: entry.leash ?? V.leash, homeLeash: entry.homeLeash ?? V.homeLeash, variant: entry.variant, wide: entry.wide };   // a placement may set its own notice and leashes (a boss)
    if (behavior === 'ambush') {
      const a = L.alcoves.find(al => al.id === entry.alcove);
      return { ...base, x: a.x, z: a.side * (L.halfZ + L.alcoveDepth * V.ambushDepth), yaw: a.side > 0 ? Math.PI : 0 };
    }
    if (behavior === 'patrol') return { ...base, x: entry.path[0], y: entry.y, z: entry.z, yaw: entry.yaw ?? Math.PI / 2, path: entry.path };
    if (behavior === 'gated') return { ...base, ...entry.spawn };
    return { ...base, x: entry.x, y: entry.y, z: entry.z, yaw: entry.yaw };
  },
  makeEnemies() {
    if (this.kind === 'bossBattle') return bossBattle.spawn(this);
    if (this.kind === 'arena') {
      const s = this.level.enemyStart, ids = [this.duelId, ...this.duelPartners];
      // A group stands in a line across the arena, `groupSpacing` apart, kept within `groupWidth`.
      const L = this.level, n = ids.length, gap = n > 1 ? Math.min(L.groupSpacing ?? ARENA.groupSpacing, (L.groupWidth ?? ARENA.groupWidth) / (n - 1)) : 0;
      const list = ids.map((id, i) => {
        const z = s.z + (i - (n - 1) / 2) * gap;
        return new Enemy(ENEMY_BY_ID[id], { ...s, z, y: world.floorY(s.x, z, s.y), behavior: 'arena', notice: CONFIG.notice.arena });
      });
      this.duel = list[0];
      return list;
    }
    // A dispersed enemy tied to a zone (`zone`) is not brought back once that zone's gate is open: its area is won.
    const won = s => s.zone && this.zones.some(z => z.id === s.zone && z.gate.open);
    return this.level.dispersed.map(s => [s, this.placementKey(s)]).filter(([s, key]) => !won(s) && !this.cleared.has(key))
      .map(([s, key]) => new Enemy(ENEMY_BY_ID[s.enemy], { ...this.spawnSpec(s, s.behavior), zone: s.zone, key }));
  },
  // Full restart of the current fight or level.
  reset() {
    if (this.kind === 'bossBattle') bossBattle.reset();
    // Keep the old materials alive only until the replacement rigs are prepared: disposing them first evicts
    // their shared WebGL programs and makes retries compile the same shaders again. Nothing survives this load.
    const retired = this.clearActors(true);
    try {
      input.pressed.clear();
      this.hitstop = 0; this.shake = 0; this.complete = false; this.deathTimer = 0; this.restartArm = 0; this.nextTimer = 0;
      $('fade').classList.remove('show');   // fades back in after a level transition
      this.setLock(null); this.retarget = true; crowd.reset(); this.cleared = new Set(); this.hazardTimers = new Map();
      const def = this.level;
      world = makeWorld(def, loadStage(def));
      const start = def.playerStart || def.start;
      this.spawn = { x: start.x, y: start.y, z: start.z, yaw: start.yaw };
      // A zone fights one enemy (`enemy` + `spawn`) or several (`enemies`); `members` lists them either way.
      this.zones = this.kind !== 'level' ? [] : (def.gated || []).map(g => ({ ...g, members: g.enemies || [{ enemy: g.enemy, spawn: g.spawn }],
        spawned: false, actors: [], gate: world.gates.find(w => w.id === g.id) }));   // a duel on a level fights no zones
      this.spawnPlayer();
      hud.reset(this);
      finale.reset(this);   // the last level's own script (js/finale.js): nothing on other levels
      lore.reset(this);     // the NPC, inscriptions and scenes of a story level (js/lore.js)
      if (typeof lessons !== 'undefined') lessons.reset(this);   // the level's lesson cards (js/lessons.js; not on the server)
      this.enemies = this.makeEnemies();
      if (this.kind === 'bossBattle') this.updateCamera(0, true);
      if (this.kind === 'level') for (const z of this.zones) this.spawnZone(z);
      visuals.warmUp(this.cam);   // include enemies: prepare their shadows and materials behind the loading screen
    } finally { for (const b of retired) b.rig.dispose(); }
  },
  // A fresh player at the respawn point: full health and full flasks, after a death too.
  spawnPlayer() {
    if (this.player) this.player.rig.dispose();
    const s = this.spawn, y = world.floorY(s.x, s.z, s.y);
    this.player = new Player(PLAYER_DEF, s.x, s.z, s.yaw, Number.isFinite(y) ? y : 0);
    story.applyProgress(this.player);   // Story mode: carried capacities (nothing otherwise)
    // v7.0: a level may grant more flasks (`flasks`: at least this many, the Lands Between's ramp); a carried larger stock stays.
    const fl = this.kind === 'level' && this.level.flasks, it = fl && this.player.inventory.flask;
    if (it && it.max < fl) it.max = it.count = fl;
    companions.reset(this);
    this.deathTimer = 0; this.hitstop = 0; this.hazardTimers.clear();   // a new body: no death sequence or hit-pause carries over
    this.cam.yaw = this.player.yaw;
    this.updateCamera(0, true);
    canvas.classList.remove('dying');
  },

  // ---- bonfires, death -------------------------------------------------------------------------
  // A bonfire with `litBy` (a zone id) is cold and unusable until that zone is won.
  bonfireLit(b) {
    if (!b.litBy) return true;
    const z = this.zones.find(q => q.id === b.litBy);
    return !!z && z.gate.open;
  },
  nearBonfire() {
    const p = this.player;
    return world.bonfires.find(b => this.bonfireLit(b) && Math.hypot(b.x - p.x, b.z - p.z) < CONFIG.rest.range
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
  // Rest and Talk share a key: the bonfire wins when it can be used and is no farther than the speaker or inscription.
  restWins() {
    const p = this.player, b = this.canRest();
    if (!b) return false;
    return Math.hypot(b.x - p.x, b.z - p.z) <= (this.kind === 'level' ? lore.nearDist(p) : Infinity);
  },
  tryRest() {
    const p = this.player, b = this.canRest();
    if (!b || !p.isFree()) return;
    if (typeof multiplayer !== 'undefined' && multiplayer.active()) { multiplayer.rest(b); return; }
    p.hp = p.maxHp; p.stamina = p.maxStamina; p.vx = p.vz = 0;
    p.setState(PS.REST);
    p.refillItems();
    const off = CONFIG.rest.respawnOffset;
    this.spawn = b.spawn ? { ...b.spawn }
      : { x: b.x + (b.x > p.x ? -off : off), z: b.z, yaw: this.level.start ? this.level.start.yaw : p.yaw };
    for (const e of this.enemies) if (!e.alive() && e.key) this.cleared.add(e.key);   // a checkpoint: everything beaten so far stays beaten
    this.respawnEnemies();
    companions.reset(this);
    this.setLock(null); this.retarget = true;
    hud.showRested();
    events.emit('rest', { bonfire: b });
  },
  // Rest or death: every enemy returns at full HP except those killed before the last rest (`cleared`: confirmed at a
  // bonfire) and beaten bosses (a boss stays beaten; v5.1). A won zone's gate stays open, but its other fighters killed
  // since the last rest stand at their posts again: a bonfire is a checkpoint, not a pile of accumulated kills.
  respawnEnemies() {
    const beatenBoss = a => !a.alive() && a.isBoss();
    const keep = new Set(this.zones.filter(z => z.gate.open).flatMap(z => z.actors.filter(beatenBoss)));
    for (const e of this.enemies) if (!keep.has(e)) e.rig.dispose();
    this.enemies = [...keep, ...this.makeEnemies()];
    for (const z of this.zones) { const kept = z.actors.filter(a => keep.has(a)); z.actors = []; this.spawnZone(z, kept); }
  },
  // Zone enemies stand at their posts from the start (visible down the hall), and wait there until they notice the player.
  // kept: beaten bosses of the zone that stay as they are (respawnEnemies).
  spawnZone(z, kept = []) {
    z.spawned = true;
    const fresh = z.members.map(m => [m, this.placementKey({ ...m, ...m.spawn }, z.id + '/')])
      .filter(([, key]) => !this.cleared.has(key) && !kept.some(a => a.key === key))
      .map(([m, key]) => new Enemy(ENEMY_BY_ID[m.enemy], { ...this.spawnSpec({ ...m, ...m.spawn }, m.behavior || 'gated'), zone: z.id, key, boss: m.boss,
        arena: m.arena ? z.trigger : null }));
    z.actors = [...kept, ...fresh];
    z.beaten = z.members.length > 0 && fresh.length === 0;   // every member beaten (before a rest, or a boss): its gate opens
    this.enemies.push(...fresh);
  },
  onPlayerDeath() {
    const p = this.player;
    this.deathOf = p;   // this body's death sequence has started (once per body)
    this.deathTimer = 0; this.setLock(null);
    if (this.nextTimer > 0) { this.nextTimer = 0; $('fade').classList.remove('show'); }   // died during the level-complete fade: lift it
    canvas.classList.add('dying');
    events.emit('playerDeath', { player: p });
  },

  // Culled levels: an unaware enemy far from the player sleeps (no update, not drawn) until the player comes
  // near or an alert wakes it. Enemies that are fighting, reeling or dying always run.
  sleeps(e) {
    const p = this.player, ally = this.companion && this.companion.body, range = Math.max(CONFIG.cull.enemyRange, e.notice + CONFIG.cull.noticeMargin);
    e.asleep = this.kind === 'level' && !!this.level.cull && !e.boss && e.alive() && (e.in('unaware') || e.state === ES.DORMANT)   // a boss placement never sleeps
      && Math.hypot(e.x - p.x, e.z - p.z) > range && (!ally || !ally.alive() || Math.hypot(e.x - ally.x, e.z - ally.z) > range);   // a far-sighted placement stays awake to see
    return e.asleep;
  },
  // One fixed step. Order: death sequence or hit-pause (and stop), lock-on, rest, player, enemies,
  // body separation, combat, deaths, level gates, camera, then the lesson cards (which only read).
  update(dt) {
    if (typeof multiplayer !== 'undefined' && multiplayer.active()) { multiplayer.update(dt); if (typeof lessons !== 'undefined') lessons.update(this, dt); return; }
    if (this.kind === 'bossBattle') { bossBattle.update(this, dt); return; }
    const p = this.player, c = this.cam;
    for (const a of this.allies()) a.savePrev(); for (const e of this.enemies) e.savePrev();
    c.prevPos.copy(c.pos); c.prevLook.copy(c.look);
    this.restartArm = Math.max(0, this.restartArm - dt);
    if (!p.alive() && this.deathOf !== p) this.onPlayerDeath();   // died outside the step (a script, a test): the sequence still starts
    if (!p.alive()) {
      // Death: the world slows to a stop, then the player returns to the last rested bonfire.
      this.deathTimer += dt; this.hitstop = Math.max(0, this.hitstop - dt);   // the killing blow's hit-pause still ends
      if (this.eldenBoss && elden.onDeath(this)) return;   // Elden Ring Bosses: Retry / Boss select instead of the respawn
      if (this.deathTimer >= CONFIG.death.respawnDelay) {   // back at the bonfire; the world resets as when resting
        this.spawnPlayer(); this.setLock(null); this.retarget = true;
        this.respawnEnemies();
        events.emit('respawn', { player: this.player });
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
    if (input.peek('rest') && this.restWins()) { input.consume('rest'); this.tryRest(); }   // else the press is Talk / Read (same key, js/lore.js)
    const live = this.enemies.filter(e => e.alive());
    const alerting = this.kind === 'level' && this.level.alert;
    const unaware = alerting ? new Set(live.filter(e => e.in('unaware') || e.state === ES.DORMANT)) : null;
    p.update(dt, this.moveInput(), live, this.lock);
    companions.update(this, dt);
    if (this.companion) companions.updateEnemies(this, dt);
    else {
      crowd.update(this, dt);
      for (const e of this.enemies) if (!this.sleeps(e)) e.update(dt, p);
    }
    separateBodies(p, this.enemies);
    resolveCombat(this);
    companions.resolve(this);
    execution.mark(p, this.enemies);   // the kneeling enemy an execution would take (the cue)
    projectiles.update(this, dt);
    if (alerting) this.spreadAlert(unaware);
    for (const e of this.enemies) if (!e.alive() && !e.rewarded) { e.rewarded = true; events.emit('enemyDeath', { enemy: e }); }
    if (this.kind === 'level') { this.updateLevel(dt); finale.update(this, dt); lore.update(this, dt); }
    else if (this.eldenBoss) elden.update(this, dt);
    // Last, so a death from any cause this step (a blow, a fall, Destined Death, a hazard floor) starts the death sequence.
    if (!p.alive() && this.deathOf !== p) this.onPlayerDeath();
    this.updateCamera(dt, false);
    if (typeof lessons !== 'undefined') lessons.update(this, dt);   // reads only: which card to show (js/lessons.js)
  },

  render(alpha, frameDt = CONFIG.step) {
    this.renderDt = Math.max(0, frameDt);
    const p = this.player, c = this.cam, t = performance.now() / 1000;
    const frozen = this.hitstop > 0, sub = frozen ? 0 : alpha * CONFIG.step;
    // Every body at its interpolated place, as [body, { x, y, z, yaw }] pairs reused frame to frame (no garbage per frame).
    const pool = this.placedPool || (this.placedPool = []), placed = this.placed || (this.placed = []);
    placed.length = 0;
    const put = b => {
      const pair = pool[placed.length] || (pool[placed.length] = [null, { x: 0, y: 0, z: 0, yaw: 0 }]), q = pair[1];
      pair[0] = b; q.x = lerp(b.px, b.x, alpha); q.y = lerp(b.py, b.y, alpha); q.z = lerp(b.pz, b.z, alpha); q.yaw = b.pyaw + angDiff(b.yaw, b.pyaw) * alpha;
      placed.push(pair);
    };
    for (const b of this.allies()) put(b);
    for (const b of this.enemies) put(b);
    for (const [b, q] of placed) {
      if (b === p && this.kind === 'bossBattle') { b.rig.root.visible = b.rig.shadow.visible = false; continue; }
      if (b.asleep) { b.rig.root.visible = b.rig.shadow.visible = false; continue; }
      b.rig.place(q.x, q.y, q.z, q.yaw, world.groundAt(q.x, q.z, q.y + 0.05));
      const looking = this.kind === 'bossBattle' && b.battleTarget || companions.focus(this, b);
      b.pose(b.stateTime + sub, { t, dt: frameDt, yaw: q.yaw, px: looking.x, pz: looking.z });
    }
    camera.position.lerpVectors(c.prevPos, c.pos, alpha);
    if (this.shake > 0) {
      const a = settings.cameraMotion === false ? 0 : this.shakeAmp * this.shake / this.shakeDur;
      camera.position.x += rand(-a, a); camera.position.y += rand(-a, a); camera.position.z += rand(-a, a);
      this.shake = Math.max(0, this.shake - frameDt);
    }
    camera.lookAt((this.lookAt || (this.lookAt = new THREE.Vector3())).lerpVectors(c.prevLook, c.look, alpha));
    if (typeof multiplayer !== 'undefined' && multiplayer.active()) multiplayer.applySpectatorView();
    projectiles.render(frozen ? 1 : alpha);
    const lockAt = this.lock && placed.find(([b]) => b === this.lock);
    lockMarker.visible = !!lockAt;
    if (lockAt) {
      const q = lockAt[1];
      lockMarker.position.set(q.x, q.y + this.lock.height + CONFIG.lock.markerGap, q.z);
      lockMarker.rotation.y = t * 2.5;
    }
    for (const g of world.gates) placeGate(g);
    for (const f of stage.bonfireFires || []) { const lit = this.bonfireLit(f.bonfire); f.group.visible = lit; f.flame.base = lit ? f.base : 0; }   // cold until lit
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
    swordTrail.update(!visuals.quality().combatFx && (p.state === PS.JUMP_ATTACK || (p.state === PS.ATTACK && !!p.hitbox)), p.rig);
    groundFx.update(frameDt);
    updateParticles(frameDt);
    updateDebug(this, hud.showHitboxes(), placed);
    for (const hook of this.renderHooks) {   // drawing-only hooks (effects, developer overlays): one failing never stops the frame
      try { hook(this, placed); } catch (e) { warnOnce(`Render hook ${hook.name || 'anonymous'} failed: ${e && e.message}`); }
    }
    if (typeof multiplayer !== 'undefined') multiplayer.captureView();
    hud.update(this, frameDt);
    companions.draw(this);
    visuals.render(this, t, frameDt);
  },
};
