'use strict';
// ============================================================================
// Boss Rush's legendaries, drawn (v7.70.0): drawing only
// ============================================================================
// Each legendary blessing's power (js/blessings.js, event `blessingPower`, the server's for everyone online) gets its own
// look, on every preset; High and Ultra add sparks, embers and lights from js/ultra-fx.js on top:
//   Meteor Fall    a column of fire falls with the jump, a white-hot burst, a shock ring as wide as the blast hits and a
//                  molten crater that cools.
//   Storm King     a jagged bolt from the sky onto the boss for each strike, a scorch ring and a blue flash.
//   Time Rift      a violet wave out to the rift's reach, then each stopped enemy (its `frozen`) sits in a slow bubble
//                  with a clock turning backwards under it, tinted, until it shatters.
//   Thousand Blades  ghost copies of the holder's own sword fall on the boss, one each `every` s, for `time` s.
//   Blood Moon     a red moon over the holder for its time, a crimson aura, and a red slash on each of their blows.
// The rares' small cues (event `blessingPerk`, the local player's): a flare, motes or a ring. Every mesh is pooled and
// made at load (warmed by visuals.warmUp); nothing is allocated per frame. Flashes stay under 3 Hz. Tuning:
// VIS.blessingFx.
const blessingFx = (() => {
  const F = VIS.blessingFx;
  const add = (color, map = null) => new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const flat = g => g.rotateX(-Math.PI / 2);
  const RING = flat(new THREE.RingGeometry(0.9, 1, 64)), DISC = flat(new THREE.CircleGeometry(1, 48));
  const COLUMN = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0), SPHERE = new THREE.SphereGeometry(1, 32, 16);
  const PLANE = new THREE.PlaneGeometry(1, 1);
  // Textures drawn once on a canvas: white on black, so additive blending shows only the strokes, in the mesh's colour.
  function canvasTex(size, draw) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, size, size); g.strokeStyle = g.fillStyle = '#fff'; g.lineCap = 'round';
    draw(g, size / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();   // the same drawings every load
  const CRATER = canvasTex(256, (g, h) => {   // molten cracks running out from the centre, a hot core
    const core = g.createRadialGradient(h, h, 0, h, h, h * 0.45); core.addColorStop(0, '#fff'); core.addColorStop(1, '#000');
    g.fillStyle = core; g.beginPath(); g.arc(h, h, h * 0.45, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 14; i++) {
      let a = i / 14 * Math.PI * 2 + rnd() * 0.3, r = h * 0.18, x = h + Math.cos(a) * r, y = h + Math.sin(a) * r;
      g.lineWidth = 4 + rnd() * 5; g.beginPath(); g.moveTo(x, y);
      while (r < h * (0.7 + rnd() * 0.28)) { a += (rnd() - 0.5) * 0.7; r += h * 0.08; x = h + Math.cos(a) * r; y = h + Math.sin(a) * r; g.lineTo(x, y); g.lineWidth *= 0.88; }
      g.stroke();
    }
  });
  const CLOCK = canvasTex(256, (g, h) => {   // a clock face: rings and twelve hour marks
    g.lineWidth = 3; for (const r of [0.96, 0.8, 0.34]) { g.beginPath(); g.arc(h, h, h * r, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, l = i % 3 ? 0.08 : 0.14; g.lineWidth = i % 3 ? 3 : 6;
      g.beginPath(); g.moveTo(h + Math.cos(a) * h * 0.82, h + Math.sin(a) * h * 0.82); g.lineTo(h + Math.cos(a) * h * (0.82 - l), h + Math.sin(a) * h * (0.82 - l)); g.stroke();
    }
    g.lineWidth = 5; g.beginPath(); g.moveTo(h, h); g.lineTo(h, h * 0.42); g.moveTo(h, h); g.lineTo(h + h * 0.3, h); g.stroke();
  });
  const FADE = canvasTex(64, g => {   // up a column: bright at its foot, gone at its top
    const f = g.createLinearGradient(0, 0, 0, 64); f.addColorStop(0, '#000'); f.addColorStop(0.7, '#777'); f.addColorStop(1, '#fff');
    g.fillStyle = f; g.fillRect(0, 0, 64, 64);
  });
  const MOON = canvasTex(256, (g, h) => {   // a full moon, its seas a little darker, with a soft halo
    const halo = g.createRadialGradient(h, h, h * 0.55, h, h, h); halo.addColorStop(0, '#888'); halo.addColorStop(1, '#000');
    g.fillStyle = halo; g.fillRect(0, 0, h * 2, h * 2);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(h, h, h * 0.58, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b8b8b8';
    for (const [x, y, r] of [[-0.2, -0.15, 0.16], [0.18, 0.05, 0.12], [-0.05, 0.25, 0.1], [0.25, -0.25, 0.07]]) { g.beginPath(); g.arc(h + x * h, h + y * h, r * h, 0, Math.PI * 2); g.fill(); }
  });
  const SLASH = canvasTex(256, (g, h) => {   // a crescent cut, thick in the middle
    g.beginPath(); g.arc(h, h * 1.5, h * 1.05, Math.PI * 1.22, Math.PI * 1.78); g.arc(h, h * 1.62, h * 0.98, Math.PI * 1.74, Math.PI * 1.26, true); g.closePath(); g.fill();
  });
  const made = [];   // every pooled object, for warmUp and clear()
  const put = (o, visible = false) => { o.visible = visible; o.userData.warmUp = true; scene.add(o); made.push(o); return o; };
  const mesh = (geo, color, map) => new THREE.Mesh(geo, add(color, map));
  const near = (x, z) => Game.player && Math.hypot(Game.player.x - x, Game.player.z - z) < F.near;
  const shake = ([time, amp], x, z) => { if (near(x, z)) Game.addShake(time, amp); };
  const light = (at, color, k, range) => effectLighting.flash(at, color, k * (reducedMotion() ? 0.5 : 1), range);
  const chestOf = b => ({ x: b.x, y: b.y + (b.height || 1.8) * 0.6, z: b.z });

  // ---- Meteor Fall ----------------------------------------------------------------------------------------------
  const M = F.meteor, cooled = new THREE.Color(F.cool);
  const meteors = Array.from({ length: 2 }, () => {
    const g = new THREE.Group(), column = mesh(COLUMN, M.color, FADE), core = mesh(COLUMN, M.core, FADE), burst = mesh(SPHERE, M.color), ring = mesh(RING, M.color), crater = mesh(DISC, M.color, CRATER);
    crater.position.y = 0.03; ring.position.y = 0.05; g.add(column, core, burst, ring, crater);
    return { g: put(g), column, core, burst, ring, crater, t: Infinity, r: 1 };
  });
  function meteor(d) {
    const s = meteors.reduce((a, b) => (a.t > b.t ? a : b)), at = { x: d.x, y: d.y + 0.5, z: d.z };
    s.t = 0; s.r = d.v.radius; s.g.position.set(d.x, d.y, d.z); s.g.visible = true; s.crater.rotation.y = rnd() * Math.PI * 2;
    groundFx.spawn(d.x, d.z, { ring: s.r, crack: s.r * 0.45, dust: 14 }, d.y);
    spawnBurst(at, M.burst);
    ultraFx.sparkBurst(at, 46, 'ember', null, 0, 1.3); ultraFx.chunkBurst(d.x, d.y, d.z, 14, 1.5); ultraFx.dustRing(d.x, d.y, d.z, 18, s.r);
    ultraFx.moteBurst(at, 70, M.color, { r: 1.2, speed: 3.5, lift: 2.6, life: [0.8, 2.2], size: 1.3 });
    ultraFx.flashAt(at, M.color, 34, 18); light(at, M.color, 16, 16); shake(M.shake, d.x, d.z);
  }
  function drawMeteors(dt) {
    for (const s of meteors) {
      if (s.t === Infinity) continue;
      s.t += dt; const t = s.t, fall = clamp01(t / M.fall), out = clamp01(t / M.ring);
      if (t > M.crater) { s.t = Infinity; s.g.visible = false; continue; }
      // The pillar of fire it came down in, drawn back into the ground: a wide glow round a white-hot core.
      const w = 1 - fall * 0.6, h = M.column * (1 - fall * fall);
      s.column.visible = s.core.visible = fall < 1;
      s.column.scale.set(M.width * w, h, M.width * w); s.column.material.opacity = 0.55 * (1 - fall);
      s.core.scale.set(M.width * 0.35 * w, h, M.width * 0.35 * w); s.core.material.opacity = 0.95 * (1 - fall);
      s.burst.visible = t < M.ring; s.burst.scale.set(0.5 + s.r * 0.55 * Math.sqrt(out), 0.4 + s.r * 0.3 * Math.sqrt(out), 0.5 + s.r * 0.55 * Math.sqrt(out));
      s.burst.material.opacity = 0.7 * (1 - out) ** 3;
      s.ring.visible = out < 1; const r = s.r * (0.2 + 0.8 * Math.sqrt(out)); s.ring.scale.set(r, 1, r); s.ring.material.opacity = 0.9 * (1 - out);
      const cool = clamp01((t - M.ring) / (M.crater - M.ring)), cr = s.r * 0.75;
      s.crater.scale.set(cr, 1, cr); s.crater.material.opacity = Math.min(1, t / 0.08) * (1 - cool * cool);
      s.crater.material.color.setHex(M.color).lerp(cooled, cool * 0.7).multiplyScalar(M.glow * (1 - cool * 0.5));
    }
  }

  // ---- Storm King -----------------------------------------------------------------------------------------------
  const S = F.storm, SEGS = 12, BRANCH = 6;
  // A bolt is a ribbon of two crossed strips (seen from any side) through jagged points; its positions are rewritten
  // for each bolt, in place.
  function ribbon(n, color) {
    const pos = new Float32Array(n * 4 * 3), idx = [], geo = new THREE.BufferGeometry();
    for (let i = 0; i < n - 1; i++) for (const o of [0, 2]) { const a = i * 4 + o, b = a + 4; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
    const m = mesh(geo, color); m.frustumCulled = false; return m;
  }
  const pts = Array.from({ length: SEGS }, () => new THREE.Vector3());
  function shape(m, list, n, width) {
    const a = m.geometry.attributes.position.array;
    for (let i = 0; i < n; i++) {
      const p = list[i], w = width * (1 - 0.5 * i / n);
      a.set([p.x - w, p.y, p.z, p.x + w, p.y, p.z, p.x, p.y, p.z - w, p.x, p.y, p.z + w], i * 12);
    }
    m.geometry.attributes.position.needsUpdate = true; m.geometry.computeBoundingSphere();
  }
  const bolts = Array.from({ length: 3 }, () => {
    const core = ribbon(SEGS, S.core), glow = ribbon(SEGS, S.color), branch = ribbon(BRANCH, S.color), scorch = mesh(RING, S.color);
    for (const m of [core, glow, branch, scorch]) put(m);
    return { core, glow, branch, scorch, t: Infinity };
  });
  function bolt(d, e) {
    // From the sky down through the boss's front (the side the player sees) into the floor, jagged, wider apart higher up.
    const b = bolts.reduce((a, c) => (a.t > c.t ? a : c)), p = Game.player || e, far = Math.hypot(p.x - e.x, p.z - e.z) || 1;
    const fx = e.x + (p.x - e.x) / far * (e.radius || 1) * 0.7, fz = e.z + (p.z - e.z) / far * (e.radius || 1) * 0.7, foot = e.y + 0.05, top = foot + (e.height || 2) + S.height;
    b.t = 0;
    for (let i = 0; i < SEGS; i++) {
      const k = i / (SEGS - 1), j = (1 - k * 0.8) * S.jitter * (i && i < SEGS - 1 ? 1 : 0.3);
      pts[i].set(fx + (rnd() - 0.5) * j, lerp(top, foot, k), fz + (rnd() - 0.5) * j);
    }
    shape(b.core, pts, SEGS, S.width); shape(b.glow, pts, SEGS, S.width * 4);
    const from = pts[3], dir = rnd() < 0.5 ? -1 : 1;
    for (let i = 0; i < BRANCH; i++) pts[i].set(from.x + dir * i * 0.7 + (rnd() - 0.5) * 0.6, from.y - i * 1.1, from.z + (rnd() - 0.5) * 1.4);
    shape(b.branch, pts, BRANCH, S.width * 1.6);
    b.scorch.position.set(fx, foot, fz); b.scorch.scale.set(S.scorch, 1, S.scorch);
    for (const m of [b.core, b.glow, b.branch, b.scorch]) m.visible = true;
    const c = chestOf(e);
    spawnBurst(c, S.burst); ultraFx.sparkBurst(c, 34, 'storm', null, 0, 1.2); ultraFx.flashAt(c, S.color, 40, 22);
    light(c, S.color, 18, 20); shake(S.shake, e.x, e.z);
  }
  function drawBolts(dt) {
    for (const b of bolts) {
      if (b.t === Infinity) continue;
      b.t += dt; const k = b.t / S.life;
      if (k >= 1) { b.t = Infinity; for (const m of [b.core, b.glow, b.branch, b.scorch]) m.visible = false; continue; }
      const fade = 1 - k * k;   // one bright stroke that dies away: no flicker
      b.core.material.opacity = fade; b.glow.material.opacity = 0.45 * fade; b.branch.material.opacity = 0.6 * fade * (k < 0.5 ? 1 : 0);
      b.scorch.material.opacity = 0.7 * (1 - k);
    }
  }

  // ---- Time Rift ------------------------------------------------------------------------------------------------
  const R = F.rift, riftTint = new THREE.Color(R.color);
  const waves = Array.from({ length: 2 }, () => ({ m: put(mesh(RING, R.color)), t: Infinity, r: 1 }));
  const bubbles = Array.from({ length: 4 }, () => {
    const g = new THREE.Group(), shell = mesh(SPHERE, R.color), band = mesh(RING, R.core), hoop = mesh(RING, R.color), clock = mesh(DISC, R.color, CLOCK);
    hoop.rotation.x = Math.PI / 2; clock.position.y = 0.04; g.add(shell, band, hoop, clock);
    return { g: put(g), shell, band, hoop, clock, e: null, k: 0, broke: false };
  });
  function rift(d) {
    const w = waves.reduce((a, b) => (a.t > b.t ? a : b)), at = { x: d.x, y: d.y + 1, z: d.z };
    w.t = 0; w.r = d.v.radius; w.m.position.set(d.x, d.y + 0.06, d.z); w.m.visible = true;
    ultraFx.moteBurst(at, 40, R.color, { r: 0.6, speed: 3, lift: 0.4, life: [0.6, 1.4], swirl: 2 });
    light(at, R.color, 14, 18); shake(R.shake, d.x, d.z);
  }
  function drawRift(game, dt) {
    for (const w of waves) {
      if (w.t === Infinity) continue;
      w.t += dt; const k = w.t / R.wave;
      if (k >= 1) { w.t = Infinity; w.m.visible = false; continue; }
      const r = w.r * Math.sqrt(k); w.m.scale.set(r, 1, r); w.m.material.opacity = 0.8 * (1 - k);
    }
    for (const b of bubbles) if (b.e && !game.enemies.includes(b.e)) b.e = null;
    for (const e of game.enemies) {
      let b = bubbles.find(s => s.e === e);
      if (!b && e.frozen > 0 && e.alive()) { b = bubbles.find(s => !s.e); if (b) { b.e = e; b.k = 0; b.broke = false; } }
      if (!b) continue;
      const on = e.frozen > 0 && e.alive();
      b.k = clamp01(b.k + (on ? dt / 0.25 : -dt / 0.3));
      if (!on && !b.broke) {   // time runs again: the bubble shatters
        b.broke = true; const c = chestOf(e);
        ultraFx.moteBurst(c, 50, R.core, { r: (e.radius || 1) + 0.6, speed: 4, lift: 0.5, life: [0.4, 1], size: 1.1 }); spawnBurst(c, R.burst);
      }
      if (b.k <= 0 && !on) { b.e = null; b.g.visible = false; continue; }
      const rad = (e.radius || 1) + 0.9, tall = Math.max(rad, (e.height || 2) * 0.62), now = effectSlots.time();
      b.g.visible = true; b.g.position.set(e.x, e.y, e.z);
      b.shell.scale.set(rad, tall, rad); b.shell.position.y = tall * 0.8; b.shell.material.opacity = 0.1 * b.k;
      b.band.position.y = tall * 0.8; b.band.scale.set(rad * 1.04, 1, rad * 1.04); b.band.rotation.z = Math.sin(now * 0.7) * 0.25; b.band.material.opacity = 0.55 * b.k;
      b.hoop.position.y = tall * 0.8; b.hoop.scale.set(rad * 1.02, tall * 1.02, 1); b.hoop.rotation.y = now * 0.35; b.hoop.material.opacity = 0.35 * b.k;
      b.clock.scale.set(rad * 1.3, 1, rad * 1.3); b.clock.rotation.y = now * R.turn; b.clock.material.opacity = 0.75 * b.k;
      if (on && e.rig) e.rig.setTint(riftTint, R.tint * b.k);
    }
  }

  // ---- Thousand Blades ------------------------------------------------------------------------------------------
  // Ghost copies of the player's own sword (the wanderer's kit weapon, js/kit-premium.js, KIT.weapons), each `length` m
  // long, its tip (the blade's far end, +z from the hand) at its holder's origin, pointing down: a sword stands where
  // its tip went in. Made at load and warmed like the rest.
  const BL = F.blades, rains = Array.from({ length: 2 }, () => ({ e: null, left: 0, next: 0, every: 1 })), swords = [];
  (() => {
    const M = KIT.resolve(PLAYER_DEF.look.model), W = M.weapon && KIT.weapons[M.weapon.use] ? KIT.weapons[M.weapon.use]() : null;
    if (!W) return;
    const geos = Object.values(W).flat(), box = new THREE.Box3();
    for (const g of geos) { g.computeBoundingBox(); box.union(g.boundingBox); }
    const size = box.getSize(new THREE.Vector3()), k = BL.length / (Math.max(size.x, size.y, size.z) || 1);
    for (let i = 0; i < BL.pool; i++) {
      const mat = add(BL.color), inner = new THREE.Group(), tilt = new THREE.Group(), holder = new THREE.Group();
      mat.color.multiplyScalar(BL.glow);
      for (const g of geos) inner.add(new THREE.Mesh(g, mat));
      inner.scale.setScalar(k); inner.position.set(-(box.min.x + box.max.x) / 2 * k, -(box.min.y + box.max.y) / 2 * k, -box.max.z * k);
      inner.userData.warmUp = true; tilt.rotation.x = Math.PI / 2; tilt.add(inner); holder.add(tilt);
      swords.push({ g: put(holder), mat, t: Infinity, x: 0, y: 0, z: 0, top: 0 });
    }
  })();
  function blades(d, e) {
    const r = rains.find(q => !q.e) || rains[0];
    r.e = e; r.left = Math.round(d.v.time / d.v.every); r.every = d.v.every;
    r.next = Math.max(0, r.every - BL.fall);   // each blade lands as its blow does (the server's, every `every` s)
    light(chestOf(e), BL.color, 10, 14);
  }
  // One ghost sword falls round the boss, just outside its body (so it never hides them), driven into the floor; `t`
  // below 0 waits that long first.
  function drop(e, t) {
    const s = swords.reduce((a, b) => (a.t > b.t ? a : b), swords[0]);
    if (!s) return;
    const a = rnd() * Math.PI * 2, dist = (e.radius || 1) + 0.2 + rnd() * BL.spread;
    s.t = t; s.x = e.x + Math.cos(a) * dist; s.z = e.z + Math.sin(a) * dist; s.y = e.y - BL.sink; s.top = s.y + BL.height;
    s.g.rotation.set((rnd() - 0.5) * 0.3, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.3); s.g.visible = false;
  }
  function drawBlades(game, dt) {
    for (const r of rains) {
      if (!r.e) continue;
      if (!game.enemies.includes(r.e) || !r.e.alive() || r.left <= 0) { r.e = null; continue; }
      if ((r.next -= dt) > 0) continue;
      r.next += r.every; r.left--;
      for (let n = 0; n < BL.per; n++) drop(r.e, -n * BL.stagger);
    }
    for (const s of swords) {
      if (s.t === Infinity) continue;
      const was = s.t; s.t += dt; s.g.visible = s.t >= 0;
      const fall = clamp01(s.t / BL.fall), gone = clamp01((s.t - BL.fall) / BL.linger);
      if (gone >= 1) { s.t = Infinity; s.g.visible = false; continue; }
      s.g.position.set(s.x, lerp(s.top, s.y, fall * fall), s.z);
      s.mat.opacity = (fall < 1 ? 0.35 + 0.5 * fall : 0.85) * (1 - gone);
      if (was < BL.fall && s.t >= BL.fall) {   // it lands
        const at = { x: s.x, y: s.y + BL.sink, z: s.z };
        ultraFx.sparkBurst(at, 16, 'holy', [0, 1, 0], 0.5, 0.8); spawnBurst(at, BL.burst); groundFx.ring(s.x, s.z, 1.1, BL.color, 0.6, at.y);
      }
    }
  }

  // ---- Blood Moon -----------------------------------------------------------------------------------------------
  // The holder's own moon rises in their sky where they were looking (it stays there, a moon, as they turn); a
  // teammate's hangs over the teammate. Round the holder, a turning ring and red motes rising; their blows cut red.
  const MO = F.moon, moonTint = new THREE.Color(MO.color), look = new THREE.Vector3(), up = new THREE.Vector3(), side = new THREE.Vector3();
  const moons = Array.from({ length: 2 }, () => {
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: MOON, color: MO.color, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    return { disc: put(disc), ring: put(mesh(RING, MO.color)), body: null, left: 0, time: 1, mote: 0, sky: false };
  });
  const slashes = Array.from({ length: 6 }, () => ({ m: put(mesh(PLANE, MO.color, SLASH)), t: Infinity }));
  function bloodMoon(d) {
    const body = d.body;
    if (!body) return;
    const m = moons.find(q => q.body === body) || moons.find(q => !q.body) || moons[0];
    m.body = body; m.left = m.time = d.v.time; m.sky = body === Game.player;
    if (m.sky) {   // up and to the right of where the camera looks now, far off
      camera.updateMatrixWorld(); camera.getWorldDirection(look);
      up.setFromMatrixColumn(camera.matrixWorld, 1); side.setFromMatrixColumn(camera.matrixWorld, 0);
      const a = THREE.MathUtils.degToRad(camera.fov / 2) * MO.up;
      look.multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a)).addScaledVector(side, MO.right).normalize();
      m.disc.position.copy(camera.position).addScaledVector(look, MO.distance); m.disc.scale.setScalar(MO.skySize);
    } else m.disc.scale.setScalar(MO.size);
    const c = chestOf(body);
    ultraFx.moteBurst(c, 60, MO.color, { r: 0.8, speed: 2.5, lift: 2, life: [0.8, 1.8], swirl: 1.5 }); spawnBurst(c, MO.burst);
    light(c, MO.color, 14, 16);
  }
  function slash(d) {
    if (!moons.some(m => m.body && m.body === d.attacker && m.left > 0) || d.blocked) return;
    const s = slashes.reduce((a, b) => (a.t > b.t ? a : b)), at = d.at || chestOf(d.target);
    s.t = 0; s.m.visible = true; s.m.position.set(at.x, at.y, at.z);
    s.m.rotation.set(0, d.attacker.yaw || 0, (rnd() - 0.5) * 1.6);   // across the blow, facing whoever struck
    ultraFx.moteBurst(at, 16, MO.color, { r: 0.2, speed: 2, lift: 0.6, life: [0.4, 0.9] });
  }
  function drawMoons(game, dt) {
    const now = effectSlots.time();
    for (const m of moons) {
      if (!m.body) continue;
      m.left -= dt;
      const b = m.body, k = Math.min(clamp01((m.time - m.left) / MO.fade), clamp01(m.left / MO.fade)), alive = b.alive ? b.alive() : true;
      if (m.left <= 0 || !alive) { m.body = null; m.disc.visible = m.ring.visible = false; continue; }
      m.disc.visible = m.ring.visible = true;
      if (!m.sky) m.disc.position.set(b.x, b.y + MO.height, b.z);
      m.disc.material.opacity = 0.95 * k;
      m.ring.position.set(b.x, b.y + 0.05, b.z); m.ring.scale.set(1.3, 1, 1.3); m.ring.rotation.y = -now * 0.8; m.ring.material.opacity = 0.6 * k;
      if ((m.mote -= dt) <= 0) { m.mote = MO.motes; ultraFx.moteBurst({ x: b.x, y: b.y + 0.2, z: b.z }, 5, MO.color, { r: 0.6, speed: 0.3, lift: 1.8, life: [0.6, 1.2], up: 1 }); }
      if (b.rig) b.rig.setTint(moonTint, MO.tint * k);
    }
    for (const s of slashes) {
      if (s.t === Infinity) continue;
      s.t += dt; const k = s.t / MO.slash;
      if (k >= 1) { s.t = Infinity; s.m.visible = false; continue; }
      s.m.material.opacity = 0.95 * (1 - k); s.m.scale.setScalar(MO.slashSize * (1 + 0.25 * k));
    }
  }

  // ---- The rares' small cues (the local player's own) --------------------------------------------------------------
  function perk(d) {
    const p = d.body;
    if (!p || p !== Game.player) return;
    const c = chestOf(p), P = F.perks;
    if (d.perk === 'empower' && d.target) { const at = chestOf(d.target); ultraFx.flare(at, P.empower, 2.2); spawnBurst(at, P.empowerBurst); }
    else if (d.perk === 'streak/heal') { ultraFx.moteBurst(c, 26, P.heal, { r: 0.5, speed: 0.8, lift: 1.6, life: [0.7, 1.3] }); groundFx.ring(p.x, p.z, 1.6, P.heal, 0.5, p.y); }
    else if (d.perk === 'parry/stamina') groundFx.ring(p.x, p.z, 1.8, P.stamina, 0.55, p.y);
    else if (d.perk === 'dodge/riposte') groundFx.ring(p.x, p.z, 1.5, P.riposte, 0.5, p.y);
    else if (d.perk === 'block/charge') { ultraFx.sparkBurst(c, 16, 'gold', null, 0, 0.7); groundFx.ring(p.x, p.z, 1.4, P.charge, 0.5, p.y); }
  }

  events.on('blessingPower', d => {
    const e = d.enemy;
    if (d.then === 'blast') meteor(d);
    else if (d.then === 'lightning' && e && d.strike) bolt(d, e);
    else if (d.then === 'freeze') rift(d);
    else if (d.then === 'blades' && e) blades(d, e);
    else if (d.then === 'bloodMoon') bloodMoon(d);
  });
  events.on('blessingPerk', perk);
  events.on('strike', slash);
  function render(game) {
    const dt = effectSlots.dt();
    drawMeteors(dt); drawBolts(dt); drawRift(game, dt); drawBlades(game, dt); drawMoons(game, dt);
  }
  function clear() {
    for (const o of made) o.visible = false;
    for (const s of [...meteors, ...bolts, ...waves, ...slashes, ...swords]) s.t = Infinity;
    for (const b of bubbles) b.e = null;
    for (const r of rains) r.e = null;
    for (const m of moons) m.body = null;
  }
  const moonTrail = [MO.color, CONFIG.VISUALS.ultra.trails.playerBoost * MO.trail];   // the holder's blade trail runs red
  const trail = b => (moons.some(m => m.body === b && m.left > 0) ? moonTrail : null);
  return { attach() { Game.renderHooks.push(render); ultraFx.hooks.playerTrail = trail; visuals.hooks.stage.push(clear); }, clear, info: () => ({
    meteors: meteors.filter(s => s.t !== Infinity).length, bolts: bolts.filter(b => b.t !== Infinity).length,
    bubbles: bubbles.filter(b => b.e).length, rains: rains.filter(r => r.e).length, swords: swords.filter(s => s.t !== Infinity).length,
    moons: moons.filter(m => m.body).length, slashes: slashes.filter(s => s.t !== Infinity).length }) };
})();
