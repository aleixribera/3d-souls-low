'use strict';
// ============================================================================
// 11b. Game: lock-on and camera
// ============================================================================
// Lock-on targets, movement input relative to the camera, and the chase camera of the fixed step (`Game.cam`).
// Methods of `Game` (js/game.js). The drawn camera (shake, camera feel) is set in Game.render, never here.
Object.assign(Game, {
  // ---- lock-on -----------------------------------------------------------------------------------
  setLock(e) { this.lock = e; this.lockLost = 0; this.lockHidden = 0; },
  addShake(time, amp) {
    if (settings.cameraMotion === false) return;
    if (amp * time < this.shakeAmp * this.shake) return;   // keep the stronger shake
    this.shake = this.shakeDur = time; this.shakeAmp = amp;
  },
  // Lock-on looks through the simulated camera (`cam`: its position and aim at the last step), never the drawn one:
  // shake, camera-feel springs and the spectator view move only what is drawn and must not change who can be targeted.
  viewCam() {
    const v = this.simView || (this.simView = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, camera.near, camera.far)), c = this.cam;
    if (v.aspect !== camera.aspect) { v.aspect = camera.aspect; v.updateProjectionMatrix(); }
    if (!v.position.equals(c.pos) || !this.simLook || !this.simLook.equals(c.look)) {
      v.position.copy(c.pos); v.lookAt(c.look); v.updateMatrixWorld();
      (this.simLook || (this.simLook = new THREE.Vector3())).copy(c.look);
    }
    return v;
  },
  inView(e) {
    const v = new THREE.Vector3(e.x, e.y + e.height * 0.5, e.z).project(this.viewCam());
    return v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 ? v : null;
  },
  // Valid targets: in lock range, and on screen or in front of the player. `v`: where on screen (null if off it).
  lockable() {
    const p = this.player;
    return findEnemies(p, this.enemies, { range: trackingRange(CONFIG.lock.range) })
      .map(c => ({ ...c, v: this.inView(c.e) }))
      .filter(c => this.level.fullTracking || c.v || isInFront(p, c.e.x, c.e.z));
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
    for (const { e } of findEnemies(this.player, this.enemies, { range: trackingRange(CONFIG.lock.range) })) {
      const v = e !== this.lock && this.inView(e), d = v ? (v.x - x0) * dir : 0;
      if (d > 0 && d < bestD) { bestD = d; best = e; }
    }
    return best;
  },
  // Always-retarget's pick: the enemy fighting the player (it has noticed the player; never a training dummy) with the
  // lowest score, its distance from the middle of the screen (0 middle, 1 edge) plus its distance from the player per
  // `retargetDistance` m. Only enemies that opt out with autoLock:false require explicit targeting.
  retargetPick() {
    const L = CONFIG.lock;
    const pool = this.lockable().filter(({ e }) => e.def.autoLock !== false && e.fightingPlayer());
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
      for (const { e } of findEnemies(p, this.enemies, { range: trackingRange(CONFIG.lock.autoRange) })) {
        if (e.def.autoLock === false || e.discovered || (!this.level.fullTracking && !this.inView(e) && !isInFront(p, e.x, e.z))) continue;
        e.discovered = true;
        if (!this.lock && !this.retarget) this.setLock(e);
      }
    }
    const t = this.lock;
    if (t && !t.alive() && p.alive()) {   // the target fell: move straight on to the next one in reach, if any
      this.setLock(this.retarget ? null : this.lockCandidates().find(e => e !== t && e.def.autoLock !== false) || null);
    } else if (t) {
      if (!t.alive() || !t.awake() || !p.alive() || closedGateBetween(p, t) || Math.hypot(t.x - p.x, t.z - p.z) > trackingRange(CONFIG.lock.breakRange)) this.setLock(null);
      else {
        // Off screen, or hidden behind cover (walls, pillars, props, floors): let go only once it has lasted a while.
        this.lockLost = this.level.fullTracking || this.inView(t) ? 0 : this.lockLost + dt;
        this.lockHidden = gateBetween(p, t) ? this.lockHidden + dt : 0;
        if (this.lockLost > CONFIG.lock.lostTime || this.lockHidden > CONFIG.lock.coverTime) this.setLock(null);
      }
    }
    if (this.retarget && !this.lock && p.alive()) { const e = this.retargetPick(); if (e) this.setLock(e); }
  },

  // ---- camera ----------------------------------------------------------------------------------
  // HUD/camera target: the locked target, else the closest awake enemy within range
  // (the arena duel always shows its opponent).
  target() {
    if (this.lock) return this.lock;
    if (this.kind === 'arena' && !this.duelPartners.length) return this.duel;
    let best = null;
    for (const c of findEnemies(this.player, this.enemies, { range: CONFIG.level.targetRange, deadFor: CONFIG.fx.deadTargetTime }))
      if (!best || c.d < best.d) best = c;
    if (!best && this.kind === 'arena') return this.enemies.find(e => e.alive()) || this.duel;   // a group: a survivor across the arena
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
    if (this.kind === 'bossBattle') { bossBattle.updateCamera(this, dt, snap); return; }
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
    } else if (this.camFocus) {
      // A scripted moment to watch (js/finale.js sets `camFocus`, e.g. Aldric leaping onto his wall): the camera turns to
      // it and lifts its gaze; the player keeps moving freely.
      const f = this.camFocus, dx = f.x - p.x, dz = f.z - p.z, d = Math.hypot(dx, dz) || 1;
      c.yaw += angDiff(Math.atan2(dx, dz), c.yaw) * (snap ? 1 : 1 - Math.exp(-CONFIG.camera.focusRate * dt));
      const F = K.focus; look.y = lerp(look.y, f.y + F.lift, clamp(d / F.far, F.mix[0], F.mix[1])); dist += F.pull;
      this.mouseHold = 0;
    } else {
      // While the player moves (never when standing still), swing behind their facing and ease the height back to level;
      // no pull when the player runs straight at the camera. Mouse or stick input holds both off for a moment.
      this.mouseHold = Math.max(0, this.mouseHold - dt);
      const moving = clamp(Math.hypot(p.vx, p.vz) / K.moveSpeed, 0, 1);
      look.x += p.vx / K.moveSpeed * K.lead * moving; look.z += p.vz / K.moveSpeed * K.lead * moving;   // lead into the run
      if (this.mouseHold <= 0 && moving > 0) {
        c.yaw += Math.sin(angDiff(p.yaw, c.yaw)) * K.yawFollow * moving * dt;
        c.pitch += (K.levelPitch - c.pitch) * (1 - Math.exp(-K.levelRate * moving * dt));
        pitch = c.pitch;
      }
      const e = this.target();
      if (e && e.alive()) {
        const dx = e.x - p.x, dz = e.z - p.z;
        const w = ease(1 - Math.hypot(dx, dz) / K.leanRange);
        look.x += dx * K.leanAmount * w; look.z += dz * K.leanAmount * w;
        dist += K.leanPullback * w; pitch += K.leanRaise * w / dist;
      }
    }
    // An execution: the camera leans in on it, then eases back (CONFIG.execution.camera).
    const xk = execution.cameraWeight(this, dt, snap);
    if (xk > 0) { dist *= 1 - CONFIG.execution.camera.push * xk; look.y -= CONFIG.execution.camera.lower * xk; }
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
    c.pos.lerp(want, k); c.look.lerp(look, snap ? 1 : 1 - Math.exp(-K.lookRate * dt));
    if (W.solids) {
      // The smoothed position can cut a corner: pull it back along the line from the player if it would.
      const dx = c.pos.x - p.x, dz = c.pos.z - p.z, f = this.boomFit(p.x, head, p.z, dx, c.pos.y - head, dz);
      if (f < 1) { c.pos.x = p.x + dx * f; c.pos.z = p.z + dz * f; }
    } else { c.pos.x = clamp(c.pos.x, loX, hiX); c.pos.z = clamp(c.pos.z, -limZ, limZ); }
    c.pos.y = this.camY(c.pos.x, c.pos.z, c.pos.y, base);   // never through floor or ceiling
    if (snap) { c.prevPos.copy(c.pos); c.prevLook.copy(c.look); }
  },
});
