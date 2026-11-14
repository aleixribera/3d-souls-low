'use strict';
// ============================================================================
// Boss Rush's legendaries, drawn (v7.75.0): drawing only
// ============================================================================
// Each legendary ability's power (js/abilities.js, event `abilityPower`, the server's for everyone online) gets its own
// look, on every preset; High and Ultra add sparks, embers and lights from js/ultra-fx.js on top:
//   Meteor Fall    a column of fire falls with the jump, a white-hot burst, a shock ring as wide as the blast hits and a
//                  molten crater that cools.
//   Storm King     a dragon of lightning tears out of the holder's blade, climbs and coils down onto the boss as the
//                  first bolt lands; then a jagged bolt from the sky for each strike, a scorch ring and a blue flash.
//   Time Rift      a violet wave out to the rift's reach, then each stopped enemy (its `frozen`) sits in a slow bubble
//                  with a clock turning backwards under it, tinted, until it shatters.
//   Thousand Blades  ghost copies of the holder's own sword fall on the boss, one each `every` s, for `time` s.
//   Blood Moon     a red moon over the holder for its time, a crimson aura, and a red slash on each of their blows.
//   Ember Twin     the first summon: a twin of the holder in embers (js/rig.js's figure, posed as they are) rises at
//                  the boss's far side; each blow it echoes cuts an ember slash. Burns away when its time is up.
//   Gale Crescent  a crescent of wind as tall as a house flies from the holder through the boss.
//   Pyre           a pillar of fire stands under the broken boss for its time.
// The rares' powers, smaller: Counterflame's burst of fire, Static Edge's spark (a short bolt).
// The rares' small cues (event `abilityPerk`, the local player's): a flare, motes or a ring. Every mesh is pooled and
// made at load (warmed by visuals.warmUp); nothing is allocated per frame. Flashes stay under 3 Hz. Tuning:
// VIS.abilityFx.
const abilityFx = (() => {
  const F = VIS.abilityFx;
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
      const p = list[i], w = width * (1 - 0.5 * i / n), o = i * 12;
      a[o] = p.x - w; a[o + 1] = p.y; a[o + 2] = p.z; a[o + 3] = p.x + w; a[o + 4] = p.y; a[o + 5] = p.z;
      a[o + 6] = p.x; a[o + 7] = p.y; a[o + 8] = p.z - w; a[o + 9] = p.x; a[o + 10] = p.y; a[o + 11] = p.z + w;
    }
    m.geometry.attributes.position.needsUpdate = true; m.geometry.computeBoundingSphere();
  }
  // The same ribbon along any path (the dragon's): its two strips stand across the path, one level, one upright, and
  // thin from `width` at the first point to `width * end` at the last.
  const tan = new THREE.Vector3(), flatSide = new THREE.Vector3(), upSide = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function tube(m, list, n, width, end) {
    const a = m.geometry.attributes.position.array;
    for (let i = 0; i < n; i++) {
      const p = list[i], w = width * lerp(1, end, i / (n - 1)), o = i * 12;
      tan.subVectors(list[Math.min(i + 1, n - 1)], list[Math.max(i - 1, 0)]);
      flatSide.crossVectors(tan, UP); if (flatSide.lengthSq() < 1e-6) flatSide.set(1, 0, 0);
      flatSide.normalize(); upSide.crossVectors(flatSide, tan).normalize();
      a[o] = p.x - flatSide.x * w; a[o + 1] = p.y - flatSide.y * w; a[o + 2] = p.z - flatSide.z * w;
      a[o + 3] = p.x + flatSide.x * w; a[o + 4] = p.y + flatSide.y * w; a[o + 5] = p.z + flatSide.z * w;
      a[o + 6] = p.x - upSide.x * w; a[o + 7] = p.y - upSide.y * w; a[o + 8] = p.z - upSide.z * w;
      a[o + 9] = p.x + upSide.x * w; a[o + 10] = p.y + upSide.y * w; a[o + 11] = p.z + upSide.z * w;
    }
    m.geometry.attributes.position.needsUpdate = true; m.geometry.computeBoundingSphere();
  }
  const bolts = Array.from({ length: 3 }, () => {
    const core = ribbon(SEGS, S.core), glow = ribbon(SEGS, S.color), branch = ribbon(BRANCH, S.color), scorch = mesh(RING, S.color);
    for (const m of [core, glow, branch, scorch]) put(m);
    return { core, glow, branch, scorch, t: Infinity };
  });
  // `small`: Static Edge's spark, a short jump from just over the boss, not a bolt from the sky.
  function bolt(d, e, small = false) {
    // From the sky down through the boss's front (the side the player sees) into the floor, jagged, wider apart higher up.
    const b = bolts.reduce((a, c) => (a.t > c.t ? a : c)), p = Game.player || e, far = Math.hypot(p.x - e.x, p.z - e.z) || 1;
    const fx = e.x + (p.x - e.x) / far * (e.radius || 1) * 0.7, fz = e.z + (p.z - e.z) / far * (e.radius || 1) * 0.7, foot = e.y + 0.05, top = foot + (e.height || 2) + (small ? F.spark.height : S.height);
    b.t = 0;
    for (let i = 0; i < SEGS; i++) {
      const k = i / (SEGS - 1), j = (1 - k * 0.8) * S.jitter * (i && i < SEGS - 1 ? 1 : 0.3);
      pts[i].set(fx + (rnd() - 0.5) * j, lerp(top, foot, k), fz + (rnd() - 0.5) * j);
    }
    const width = small ? S.width * F.spark.width : S.width;
    shape(b.core, pts, SEGS, width); shape(b.glow, pts, SEGS, width * 4);
    const from = pts[3], dir = rnd() < 0.5 ? -1 : 1;
    for (let i = 0; i < BRANCH; i++) pts[i].set(from.x + dir * i * 0.7 + (rnd() - 0.5) * 0.6, from.y - i * 1.1, from.z + (rnd() - 0.5) * 1.4);
    shape(b.branch, pts, BRANCH, width * 1.6);
    const scorch = small ? S.scorch * 0.6 : S.scorch;
    b.scorch.position.set(fx, foot, fz); b.scorch.scale.set(scorch, 1, scorch);
    for (const m of [b.core, b.glow, b.branch, b.scorch]) m.visible = true;
    const c = chestOf(e);
    if (small) { spawnBurst(c, F.spark.burst); ultraFx.sparkBurst(c, 16, 'storm', null, 0, 0.9); light(c, S.color, 7, 10); return; }
    spawnBurst(c, S.burst); ultraFx.sparkBurst(c, 34, 'storm', null, 0, 1.2); ultraFx.flashAt(c, S.color, 40, 22);
    light(c, S.color, 18, 20); shake(S.shake, e.x, e.z);
  }
  // The dragon: out of the holder's blade, up `rise` m over the way to the boss, then coiling `turns` times round it
  // and down into its chest, in the `lead` s the first bolt takes. Its head leads; a body `length` of the path long
  // writhes behind it, crackling every frame; its head has open jaws and two whiskers trailing back.
  const DG = S.dragon, DSEGS = 28, WSEGS = 6;
  const dragons = Array.from({ length: 2 }, () => {
    const core = ribbon(DSEGS, S.core), glow = ribbon(DSEGS, DG.color), whiskers = [ribbon(WSEGS, DG.color), ribbon(WSEGS, DG.color)];
    const jaws = [ribbon(WSEGS, S.core), ribbon(WSEGS, S.core)], head = mesh(SPHERE, S.core), halo = mesh(SPHERE, DG.color);
    const parts = [core, glow, ...whiskers, ...jaws, head, halo];
    for (const m of parts) put(m);
    return { core, glow, whiskers, jaws, head, halo, parts, t: Infinity, time: 1, e: null, from: new THREE.Vector3(), a0: 0, side: 1, mote: 0 };
  });
  const dpts = Array.from({ length: DSEGS }, () => new THREE.Vector3()), wpts = Array.from({ length: WSEGS }, () => new THREE.Vector3());
  const hd = new THREE.Vector3(), back = new THREE.Vector3(), headAt = { x: 0, y: 0, z: 0 };
  const DRAGON_MOTES = { r: 0.25, speed: 1.2, lift: 0.3, life: [0.2, 0.5], size: 0.8 };
  function dragon(d, e) {
    const g = dragons.reduce((a, c) => (a.t > c.t ? a : c)), b = d.body;
    g.t = 0; g.time = d.v.lead; g.e = e; g.side = rnd() < 0.5 ? -1 : 1; g.mote = 0;
    if (b) g.from.set(b.x + Math.sin(b.yaw || 0) * 0.9, b.y + (b.height || 1.8) * 0.75, b.z + Math.cos(b.yaw || 0) * 0.9);   // the blade, raised
    else g.from.set(e.x, e.y + (e.height || 2) + S.height, e.z);   // a holder out of sight: down from the sky
    g.a0 = Math.atan2(g.from.z - e.z, g.from.x - e.x);
    for (const m of g.parts) m.visible = false;   // shown from its first drawn frame, shaped
    const c = { x: g.from.x, y: g.from.y, z: g.from.z };
    ultraFx.sparkBurst(c, 28, 'storm', null, 0, 1); ultraFx.flashAt(c, S.color, 26, 12); light(c, S.color, 12, 12);
  }
  // A point `s` (0 the blade, 1 the boss's chest) along a dragon's path at time `now`, into `out`.
  function path(g, s, now, out) {
    const e = g.e, chest = e.y + (e.height || 2) * 0.6, r0 = (e.radius || 1) + DG.coil, top = Math.max(g.from.y, chest) + DG.rise;
    const ax = e.x + Math.cos(g.a0) * r0, az = e.z + Math.sin(g.a0) * r0;   // where the climb ends and the coil begins
    if (s < 0.45) {   // the climb: a curve up from the blade to over the coil's start
      const k = s / 0.45, i = 1 - k, mx = (g.from.x + ax) / 2, mz = (g.from.z + az) / 2;
      out.set(i * i * g.from.x + 2 * i * k * mx + k * k * ax, i * i * g.from.y + 2 * i * k * (top + DG.rise * 0.3) + k * k * top, i * i * g.from.z + 2 * i * k * mz + k * k * az);
    } else {   // the coil: round the boss, closing in and coming down
      const k = (s - 0.45) / 0.55, a = g.a0 + g.side * k * DG.turns * Math.PI * 2, r = r0 * (1 - k * k);
      out.set(e.x + Math.cos(a) * r, lerp(top, chest, Math.pow(k, 1.4)), e.z + Math.sin(a) * r);
    }
    const w = DG.wave * Math.sin(s * 22 - now * 14) * (1 - s * s);   // the writhe, across the way it goes
    out.y += w; out.x -= Math.sin(g.a0) * w * 0.6; out.z += Math.cos(g.a0) * w * 0.6;
    return out;
  }
  function drawDragons(dt) {
    const now = effectSlots.time();
    for (const g of dragons) {
      if (g.t === Infinity) continue;
      g.t += dt;
      if (g.t >= g.time + DG.linger || !g.e) { g.t = Infinity; g.e = null; for (const m of g.parts) m.visible = false; continue; }
      const k = clamp01(g.t / g.time), h = k * (2 - k);   // fast out of the blade, slowing as it coils
      const landed = g.t >= g.time, gone = landed ? clamp01((g.t - g.time) / DG.linger) : 0, fade = 1 - gone * gone;
      const len = DG.length * (1 - gone) + 0.001;   // landed, the tail runs in after the head
      for (let i = 0; i < DSEGS; i++) {
        path(g, Math.max(0, h - len * i / (DSEGS - 1)), now, dpts[i]);
        if (i) { dpts[i].x += (rnd() - 0.5) * DG.jitter; dpts[i].y += (rnd() - 0.5) * DG.jitter; dpts[i].z += (rnd() - 0.5) * DG.jitter; }
      }
      tube(g.core, dpts, DSEGS, DG.width * 0.4, 0.15); tube(g.glow, dpts, DSEGS, DG.width * 1.8, 0.25);
      g.core.material.opacity = 0.9 * fade; g.glow.material.opacity = 0.6 * fade;
      // The head, and its whiskers swept back and out from it.
      hd.copy(dpts[0]); back.subVectors(dpts[0], dpts[2]);
      if (back.lengthSq() < 1e-8) back.set(0, -1, 0); back.normalize();
      flatSide.crossVectors(back, UP); if (flatSide.lengthSq() < 1e-6) flatSide.set(1, 0, 0); flatSide.normalize();
      for (let n = 0; n < 2; n++) {
        const out = n ? 1 : -1, wm = g.whiskers[n];
        for (let i = 0; i < WSEGS; i++) {
          const q = i / (WSEGS - 1), sway = Math.sin(now * 16 + q * 4 + n * 2) * 0.25 * q;
          wpts[i].copy(hd).addScaledVector(back, -q * DG.head * 2.6).addScaledVector(flatSide, out * (0.15 + q * DG.head * 1.1)).addScaledVector(UP, 0.1 + q * 0.35 + sway);
        }
        tube(wm, wpts, WSEGS, DG.width * 0.35, 0.1); wm.material.opacity = 0.8 * fade;
        // A jaw: forward out of the head, the upper one up, the lower one down, opening and snapping a little.
        const jm = g.jaws[n], gape = (0.35 + 0.15 * Math.sin(now * 22)) * out;
        for (let i = 0; i < WSEGS; i++) {
          const q = i / (WSEGS - 1);
          wpts[i].copy(hd).addScaledVector(back, q * DG.head * 1.7).addScaledVector(UP, gape * q * DG.head * 1.4 * (1 - 0.35 * q));
        }
        tube(jm, wpts, WSEGS, DG.width * 0.45, 0.2); jm.material.opacity = fade;
      }
      const pulse = 1 + 0.12 * Math.sin(now * 40);
      g.head.position.copy(hd); g.head.scale.setScalar(DG.head * 0.3 * pulse * (1 - gone) + 0.001); g.head.material.opacity = fade;
      g.halo.position.copy(hd); g.halo.scale.setScalar(DG.head * 0.8 * pulse); g.halo.material.opacity = 0.25 * fade;
      for (const m of g.parts) m.visible = true;
      if (!landed && (g.mote -= dt) <= 0) { g.mote = 0.03; headAt.x = hd.x; headAt.y = hd.y; headAt.z = hd.z; ultraFx.moteBurst(headAt, 3, DG.color, DRAGON_MOTES); }
    }
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
  function bubbleOf(e) { for (const b of bubbles) if (b.e === e) return b; return null; }   // null: a free one
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
      let b = bubbleOf(e);
      if (!b && e.frozen > 0 && e.alive()) { b = bubbleOf(null); if (b) { b.e = e; b.k = 0; b.broke = false; } }
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
  const moteAt = { x: 0, y: 0, z: 0 }, MOON_MOTES = { r: 0.6, speed: 0.3, lift: 1.8, life: [0.6, 1.2], up: 1 };
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
      if ((m.mote -= dt) <= 0) { m.mote = MO.motes; moteAt.x = b.x; moteAt.y = b.y + 0.2; moteAt.z = b.z; ultraFx.moteBurst(moteAt, 5, MO.color, MOON_MOTES); }
      if (b.rig) b.rig.setTint(moonTint, MO.tint * k);
    }
    for (const s of slashes) {
      if (s.t === Infinity) continue;
      s.t += dt; const k = s.t / MO.slash;
      if (k >= 1) { s.t = Infinity; s.m.visible = false; continue; }
      s.m.material.opacity = 0.95 * (1 - k); s.m.scale.setScalar(MO.slashSize * (1 + 0.25 * k));
    }
  }

  // ---- Ember Twin (the first summon) ----------------------------------------------------------------------------
  // A twin of its holder (their own figure, js/rig.js, posed by their own pose every frame) made of embers: bright at
  // its edges, dim through its middle, flickering, rising out of the floor from the feet up and burning away from
  // the head down. It stands at the boss's far side, facing it, so the two of them strike together from both sides;
  // each of its blows (the server's echo, `strike`) cuts an ember slash where it lands. No boss near: at its holder's
  // side. Two in the pool, made in attach() (the holder's figure needs the game's models) and warmed like the rest.
  const T = F.twin, twins = [];
  const emberVertex = `
    #include <common>
    #include <skinning_pars_vertex>
    varying vec3 vN; varying vec3 vV; varying float vY;
    void main() {
      #include <skinbase_vertex>
      #include <beginnormal_vertex>
      #include <skinnormal_vertex>
      #include <begin_vertex>
      #include <skinning_vertex>
      vec4 world = modelMatrix * vec4(transformed, 1.0), mv = viewMatrix * world;
      vN = normalize(normalMatrix * objectNormal); vV = -mv.xyz; vY = world.y;
      gl_Position = projectionMatrix * mv;
    }`;
  const emberFragment = `
    uniform vec3 uColor; uniform vec3 uCore; uniform float uOpacity; uniform float uCut; uniform float uFrom; uniform float uTime; uniform float uBoost;
    uniform float uRim; uniform float uBody; uniform float uFlicker;
    varying vec3 vN; varying vec3 vV; varying float vY;
    void main() {
      float edge = (vY - uCut) * uFrom;   // rising: the part below the cut is there; burning away: the part above it
      if (edge > 0.0) discard;
      float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
      float flick = 1.0 + uFlicker * sin(uTime * 13.0 + vY * 9.0) * sin(uTime * 7.3 - vY * 4.1);
      float seam = smoothstep(-0.25, 0.0, edge);   // the line it is rising or burning at glows white-hot
      vec3 c = mix(uColor, uCore, rim * 0.6 + seam) * (uBody + rim * uRim) * flick * uBoost;
      gl_FragColor = vec4(c, uOpacity * (0.35 + 0.65 * rim + seam));
    }`;
  function emberMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(T.color) }, uCore: { value: new THREE.Color(T.core) }, uOpacity: { value: 0 }, uCut: { value: 0 },
        uFrom: { value: 1 }, uTime: { value: 0 }, uBoost: { value: 1 }, uRim: { value: T.rim }, uBody: { value: T.body }, uFlicker: { value: T.flicker } },
      vertexShader: emberVertex, fragmentShader: emberFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  }
  function makeTwins() {
    if (twins.length) return;
    for (let i = 0; i < 2; i++) {
      const rig = new Rig(PLAYER_DEF.look), mat = emberMaterial();
      rig.root.traverse(o => { o.userData.warmUp = true; if (o.isMesh) { o.material = mat; o.castShadow = o.receiveShadow = false; } });
      rig.root.visible = rig.shadow.visible = false; made.push(rig.root);
      twins.push({ rig, mat, body: null, left: 0, time: 1, x: 0, y: 0, z: 0, yaw: 0, placed: false, mote: 0, boost: 0, gone: false, enemy: null });
    }
  }
  const twinAt = { x: 0, y: 0, z: 0 }, twinPose = { t: 0, dt: 0, yaw: 0, px: 0, pz: 0 }, TWIN_MOTES = { r: 0.35, speed: 0.4, lift: 1.4, life: [0.4, 0.9], up: 1, size: 0.8 };
  function twin(d) {
    const body = d.body;
    if (!body || !twins.length) return;
    const t = twins.find(q => q.body === body) || twins.find(q => !q.body) || twins.reduce((a, b) => (a.left < b.left ? a : b));
    const renew = t.body === body && t.left > 0 && !t.gone;
    t.body = body; t.left = t.time = d.v.time; t.placed = renew && t.placed; t.boost = 0; t.gone = false; t.enemies = Game.enemies; t.enemy = d.enemy || null;
    place(t, 0);
    const c = { x: t.x, y: t.y + 1, z: t.z };
    groundFx.ring(t.x, t.z, 1.8, T.color, 0.8, t.y); spawnBurst(c, T.burst);
    ultraFx.moteBurst(c, 50, T.color, { r: 0.5, speed: 1.2, lift: 3, life: [0.6, 1.4], up: 1 }); ultraFx.sparkBurst(c, 24, 'ember', [0, 1, 0], 0.6, 0.9);
    light(c, T.color, 10, 12); shake(T.shake, t.x, t.z);
  }
  // Where the twin goes this frame: by the engine's rule (summonStep, js/abilities.js), round the enemy it was called on
  // while that one lives, else the nearest live one to its holder (facing it), else at their side; it appears there at once.
  const twinStep = { kind: 'twin', x: 0, z: 0, yaw: 0 };
  function place(t, dt) {
    const b = t.body;
    let foe = t.enemy && t.enemy.alive() && Game.enemies.includes(t.enemy) ? t.enemy : null, best = CONFIG.abilities.summons.near;
    if (!foe) { for (const e of Game.enemies) if (e.alive()) { const dd = Math.hypot(e.x - b.x, e.z - b.z); if (dd < best) { best = dd; foe = e; } } t.enemy = foe; }
    twinStep.x = t.placed ? t.x : b.x; twinStep.z = t.placed ? t.z : b.z; twinStep.yaw = t.yaw;
    summonStep(twinStep, foe, b, t.placed ? dt : 60);
    t.x = twinStep.x; t.z = twinStep.z; t.yaw += angDiff(foe ? twinStep.yaw : b.yaw, t.yaw) * (t.placed ? 1 - Math.exp(-T.turn * dt) : 1);
    t.y = world.groundAt(t.x, t.z, b.y + 0.5); if (!Number.isFinite(t.y)) t.y = b.y;
    t.placed = true;
  }
  function drawTwins(dt) {
    const now = effectSlots.time();
    for (const t of twins) {
      if (!t.body) continue;
      const b = t.body, alive = b.alive ? b.alive() : true;
      if (alive) t.left -= dt; else t.left = Math.min(t.left, T.fade);
      if (t.left <= 0 || !b.rig || t.enemies !== Game.enemies) { t.body = null;   // a new fight (a new set of enemies) ends it too
        t.rig.root.visible = false; continue; }
      place(t, dt);
      const height = (b.height || 1.8) * 1.15, rising = clamp01((t.time - t.left) / T.rise), fading = clamp01(t.left / T.fade);
      const u = t.mat.uniforms;
      if (fading < 1) { u.uFrom.value = -1; u.uCut.value = t.y + height * (1 - fading); }   // burning away, from the head down
      else { u.uFrom.value = 1; u.uCut.value = t.y - 0.1 + (height + 0.2) * rising; }     // rising, from the feet up
      if (fading < 1 && !t.gone) { t.gone = true; twinAt.x = t.x; twinAt.y = t.y + 1; twinAt.z = t.z; ultraFx.moteBurst(twinAt, 40, T.color, { r: 0.5, speed: 1, lift: 2.4, life: [0.6, 1.3], up: 1 }); }
      t.boost = Math.max(0, t.boost - dt / T.strikeGlow);
      u.uOpacity.value = 0.9 * Math.min(1, rising * 3); u.uTime.value = now; u.uBoost.value = 1 + t.boost * T.strikeBoost;
      t.rig.root.visible = true;
      t.rig.place(t.x, t.y, t.z, t.yaw, -Infinity);
      const real = b.rig;   // the holder's own pose, on the twin's figure
      b.rig = t.rig;
      twinPose.t = now; twinPose.dt = dt; twinPose.yaw = t.yaw; twinPose.px = b.x; twinPose.pz = b.z;
      try { b.pose(b.stateTime, twinPose); } finally { b.rig = real; }
      t.rig.shadow.visible = false; if (t.rig.warnGlow) t.rig.warnGlow.visible = false;
      if ((t.mote -= dt) <= 0) { t.mote = T.motes; twinAt.x = t.x; twinAt.y = t.y + height * 0.5; twinAt.z = t.z; ultraFx.moteBurst(twinAt, 3, T.color, TWIN_MOTES); }
    }
  }
  const emberSlashes = Array.from({ length: 4 }, () => ({ m: put(mesh(PLANE, T.color, SLASH)), t: Infinity }));
  function twinStrike(d, e) {
    const t = twins.find(q => q.body && q.body === d.body);
    if (t) t.boost = 1;
    // Its slash lands on the enemy's side facing the twin.
    const c = chestOf(e), from = t || d.body || e, dx = from.x - e.x, dz = from.z - e.z, l = Math.hypot(dx, dz) || 1, r = (e.radius || 1) * 0.8;
    const at = { x: e.x + dx / l * r, y: c.y, z: e.z + dz / l * r };
    const s = emberSlashes.reduce((a, b) => (a.t > b.t ? a : b));
    s.t = 0; s.m.visible = true; s.m.position.set(at.x, at.y, at.z); s.m.rotation.set(0, Math.atan2(dx, dz), (rnd() - 0.5) * 1.8);
    ultraFx.sparkBurst(at, 18, 'ember', [dx / l, 0.2, dz / l], 0.5, 0.9); ultraFx.moteBurst(at, 10, T.color, { r: 0.2, speed: 2, lift: 0.6, life: [0.3, 0.7] });
    spawnBurst(at, T.hitBurst); light(at, T.color, 5, 8);
  }
  // It draws the boss's eye: a ring of fire round its feet and a flare at its chest, its embers flaring up.
  function twinDraws(d) {
    const t = twins.find(q => q.body && q.body === d.body);
    if (!t) return;
    t.boost = 1.6; if (d.enemy) t.enemy = d.enemy;
    const c = { x: t.x, y: t.y + 1.2, z: t.z };
    groundFx.ring(t.x, t.z, 2.4, T.color, 0.75, t.y); ultraFx.flare(c, T.color, 2.4);
    ultraFx.moteBurst(c, 26, T.color, { r: 0.4, speed: 1.4, lift: 2, life: [0.5, 1.1], up: 1 }); light(c, T.color, 6, 9);
  }
  function drawEmberSlashes(dt) {
    for (const s of emberSlashes) {
      if (s.t === Infinity) continue;
      s.t += dt; const k = s.t / T.slash;
      if (k >= 1) { s.t = Infinity; s.m.visible = false; continue; }
      s.m.material.opacity = 0.95 * (1 - k); s.m.scale.setScalar(T.slashSize * (1 + 0.3 * k));
    }
  }

  // ---- Gale Crescent ----------------------------------------------------------------------------------------------
  // A crescent of wind as tall as a house leaves the holder's blade, flies through the boss and on, `reach` m in all,
  // shedding pale motes; where it cuts the boss, a white burst. Seen from behind it is the crescent's whole curve.
  const G = F.gale;
  const gales = Array.from({ length: 2 }, () => {
    const g = new THREE.Group(), glow = mesh(PLANE, G.color, SLASH), core = mesh(PLANE, G.core, SLASH);
    core.scale.setScalar(0.62); core.position.z = 0.02; g.add(glow, core);
    return { g: put(g), glow, core, t: Infinity, life: 1, x: 0, y: 0, z: 0, ux: 0, uz: 0, reach: 1, e: null, cut: false, mote: 0 };
  });
  const galeAt = { x: 0, y: 0, z: 0 }, GALE_MOTES = { r: 0.6, speed: 0.8, lift: 0.3, life: [0.3, 0.7], size: 0.9 };
  function gale(d, e) {
    const from = d.body || e, dx = e.x - from.x, dz = e.z - from.z, l = Math.hypot(dx, dz) || 1;
    const s = gales.reduce((a, b) => (a.t > b.t ? a : b));
    s.t = 0; s.ux = dx / l; s.uz = dz / l; s.reach = d.v.reach; s.life = s.reach / G.speed; s.e = e; s.cut = false;
    s.x = from.x + s.ux * 0.8; s.z = from.z + s.uz * 0.8; s.y = (from.y || e.y) + G.lift;
    s.g.rotation.set(0, Math.atan2(s.ux, s.uz), (rnd() - 0.5) * G.roll); s.g.scale.setScalar(G.size * (d.v.width / 1.6)); s.g.visible = true;
    galeAt.x = s.x; galeAt.y = s.y; galeAt.z = s.z;
    ultraFx.moteBurst(galeAt, 24, G.color, { r: 0.6, speed: 3, lift: 0.4, life: [0.3, 0.7] }); light(galeAt, G.color, 8, 10); shake(G.shake, s.x, s.z);
  }
  function drawGales(dt) {
    for (const s of gales) {
      if (s.t === Infinity) continue;
      s.t += dt;
      const k = s.t / s.life, out = clamp01((s.t - s.life) / G.fade);
      if (out >= 1) { s.t = Infinity; s.g.visible = false; continue; }
      const go = Math.min(1, k) * s.reach, x = s.x + s.ux * go, z = s.z + s.uz * go;
      s.g.position.set(x, s.y, z);
      s.glow.material.opacity = 0.55 * (1 - out) * Math.min(1, s.t / 0.05); s.core.material.opacity = 0.95 * (1 - out) * Math.min(1, s.t / 0.05);
      if ((s.mote -= dt) <= 0 && out <= 0) { s.mote = 0.025; galeAt.x = x; galeAt.y = s.y; galeAt.z = z; ultraFx.moteBurst(galeAt, 4, G.color, GALE_MOTES); }
      const e = s.e;
      if (!s.cut && e && (x - e.x) * s.ux + (z - e.z) * s.uz >= 0) {   // it reaches the boss
        s.cut = true; const c = chestOf(e);
        ultraFx.sparkBurst(c, 40, 'parry', [s.ux, 0.1, s.uz], 0.6, 1.2); spawnBurst(c, G.burst); ultraFx.flashAt(c, G.color, 26, 14);
        light(c, G.color, 12, 14); groundFx.ring(e.x, e.z, (e.radius || 1) + 1.2, G.color, 0.6, e.y);
      }
    }
  }

  // ---- Pyre -------------------------------------------------------------------------------------------------------
  // A pillar of fire bursts up under the broken boss and burns as long as the power does, following it: a wide glow
  // round a white-hot core, flickering, a burning ring on the floor and embers pouring up.
  const PY = F.pyre;
  const pyres = Array.from({ length: 2 }, () => {
    const g = new THREE.Group(), glow = mesh(COLUMN, PY.color, FADE), core = mesh(COLUMN, PY.core, FADE), ring = mesh(RING, PY.color), floor = mesh(DISC, PY.color, CRATER);
    ring.position.y = 0.05; floor.position.y = 0.04; g.add(glow, core, ring, floor);
    return { g: put(g), glow, core, ring, floor, e: null, t: 0, time: 1, r: 1, mote: 0, pulse: 0 };
  });
  const pyreAt = { x: 0, y: 0, z: 0 }, PYRE_MOTES = { r: 0.8, speed: 1, lift: 4, life: [0.5, 1.1], up: 1, size: 1.1 };
  function pyre(d, e) {
    const s = pyres.find(q => q.e === e) || pyres.find(q => !q.e) || pyres[0];
    s.e = e; s.t = 0; s.time = d.v.time; s.r = (e.radius || 1) + PY.pad; s.pulse = 0; s.g.visible = true; s.floor.rotation.y = rnd() * Math.PI * 2;
    const c = chestOf(e);
    groundFx.spawn(e.x, e.z, { ring: s.r * 1.4, crack: s.r * 0.5, dust: 10 }, e.y);
    spawnBurst(c, PY.burst); ultraFx.sparkBurst(c, 40, 'ember', [0, 1, 0], 0.7, 1.3); ultraFx.flashAt(c, PY.color, 30, 16);
    light(c, PY.color, 14, 16); shake(PY.shake, e.x, e.z);
  }
  function drawPyres(game, dt) {
    const now = effectSlots.time();
    for (const s of pyres) {
      if (!s.e) continue;
      s.t += dt;
      const e = s.e, end = s.time + PY.fade;
      if (s.t >= end || !game.enemies.includes(e)) { s.e = null; s.g.visible = false; continue; }
      const up = clamp01(s.t / PY.rise), k = Math.min(up, clamp01((end - s.t) / PY.fade)), flick = 1 + 0.08 * Math.sin(now * 23) + 0.05 * Math.sin(now * 37 + 1);
      s.g.position.set(e.x, e.y, e.z);
      s.glow.scale.set(s.r * flick, PY.height * up, s.r * flick); s.glow.material.opacity = 0.5 * k;
      s.core.scale.set(s.r * 0.42 * flick, PY.height * 0.85 * up, s.r * 0.42 * flick); s.core.material.opacity = 0.9 * k;
      s.ring.scale.set(s.r * 1.15, 1, s.r * 1.15); s.ring.material.opacity = 0.8 * k;
      s.floor.scale.set(s.r * 1.2, 1, s.r * 1.2); s.floor.material.opacity = 0.9 * k; s.floor.rotation.y += dt * 0.4;
      if ((s.mote -= dt) <= 0 && k > 0.3) { s.mote = PY.motes; pyreAt.x = e.x; pyreAt.y = e.y + 0.4; pyreAt.z = e.z; ultraFx.moteBurst(pyreAt, 6, PY.color, PYRE_MOTES); }
      if ((s.pulse -= dt) <= 0 && s.t < s.time) { s.pulse = PY.lightEvery; light(chestOf(e), PY.color, 6, 12); }
    }
  }

  // ---- The rares' powers: Counterflame and Static Edge ------------------------------------------------------------
  // Smaller than a legendary's: fire bursting on the parried boss; a short spark of lightning jumping onto it.
  const FL = F.flare;
  function flareOn(e) {
    const c = chestOf(e);
    ultraFx.flare(c, FL.color, FL.size); spawnBurst(c, FL.burst); ultraFx.sparkBurst(c, 26, 'ember', null, 0, 1);
    ultraFx.moteBurst(c, 18, FL.color, { r: 0.4, speed: 2.4, lift: 1.2, life: [0.4, 0.9] });
    groundFx.ring(e.x, e.z, (e.radius || 1) + 0.8, FL.color, 0.55, e.y); light(c, FL.color, 7, 9);
  }

  // ---- The rares' small cues (the local player's own) --------------------------------------------------------------
  function perk(d) {
    const p = d.body;
    if (!p || p !== Game.player) return;
    const c = chestOf(p), P = F.perks;
    if (d.perk === 'empower' && d.target) { const at = chestOf(d.target); ultraFx.flare(at, P.empower, 2.2); spawnBurst(at, P.empowerBurst); }
    else if (d.perk === 'execute/heal') { ultraFx.moteBurst(c, 34, P.heal, { r: 0.6, speed: 1, lift: 1.9, life: [0.8, 1.4] }); groundFx.ring(p.x, p.z, 2, P.heal, 0.6, p.y); }
    else if (d.perk === 'parry/heal') { ultraFx.moteBurst(c, 14, P.heal, { r: 0.4, speed: 0.7, lift: 1.2, life: [0.5, 0.9] }); groundFx.ring(p.x, p.z, 1.3, P.heal, 0.45, p.y); }
    else if (d.perk === 'streak/heal') { ultraFx.moteBurst(c, 26, P.heal, { r: 0.5, speed: 0.8, lift: 1.6, life: [0.7, 1.3] }); groundFx.ring(p.x, p.z, 1.6, P.heal, 0.5, p.y); }
    else if (d.perk === 'parry/stamina') groundFx.ring(p.x, p.z, 1.8, P.stamina, 0.55, p.y);
    else if (d.perk === 'dodge/riposte') groundFx.ring(p.x, p.z, 1.5, P.riposte, 0.5, p.y);
    else if (d.perk === 'flask/stamina') { ultraFx.moteBurst(c, 20, P.stamina, { r: 0.5, speed: 0.6, lift: 1.4, life: [0.6, 1.1] }); groundFx.ring(p.x, p.z, 1.8, P.stamina, 0.55, p.y); }
    else if (d.perk === 'block/charge') { ultraFx.sparkBurst(c, 16, 'gold', null, 0, 0.7); groundFx.ring(p.x, p.z, 1.4, P.charge, 0.5, p.y); }
  }

  events.on('abilityPower', d => {
    const e = d.enemy;
    if (d.then === 'blast') meteor(d);
    else if (d.then === 'lightning' && e && d.strike) bolt(d, e);
    else if (d.then === 'lightning' && e) dragon(d, e);
    else if (d.then === 'freeze') rift(d);
    else if (d.then === 'blades' && e) blades(d, e);
    else if (d.then === 'bloodMoon') bloodMoon(d);
    else if (d.then === 'twin' && d.strike && e) twinStrike(d, e);
    else if (d.then === 'twin' && d.draw) twinDraws(d);
    else if (d.then === 'twin') twin(d);
    else if (d.then === 'gale' && e) gale(d, e);
    else if (d.then === 'pyre' && e) pyre(d, e);
    else if (d.then === 'flare' && e) flareOn(e);
    else if (d.then === 'spark' && e) bolt(d, e, true);
  });
  events.on('abilityPerk', perk);
  events.on('abilityPicked', d => {
    const p = Game.player, color = F.perks.picked[d.rarity];
    if (!p || color === undefined) return;
    const c = chestOf(p), big = d.rarity === 'legendary' ? 1.6 : d.rarity === 'rare' ? 1.25 : 1;
    groundFx.ring(p.x, p.z, 1.6 * big, color, 0.6, p.y);
    ultraFx.moteBurst(c, Math.round(18 * big), color, { r: 0.5, speed: 1, lift: 1.6 * big, life: [0.6, 1.3] });
  });
  events.on('strike', slash);
  function render(game) {
    const dt = effectSlots.dt();
    drawMeteors(dt); drawDragons(dt); drawBolts(dt); drawRift(game, dt); drawBlades(game, dt); drawMoons(game, dt);
    drawTwins(dt); drawEmberSlashes(dt); drawGales(dt); drawPyres(game, dt);
  }
  function clear() {
    for (const o of made) o.visible = false;
    for (const s of [...meteors, ...bolts, ...dragons, ...waves, ...slashes, ...swords, ...emberSlashes, ...gales]) s.t = Infinity;
    for (const t of twins) t.body = null;
    for (const s of pyres) s.e = null;
    for (const g of dragons) g.e = null;
    for (const b of bubbles) b.e = null;
    for (const r of rains) r.e = null;
    for (const m of moons) m.body = null;
  }
  const moonTrail = [MO.color, CONFIG.VISUALS.ultra.trails.playerBoost * MO.trail];   // the holder's blade trail runs red
  function trail(b) { for (const m of moons) if (m.body === b && m.left > 0) return moonTrail; return null; }
  return { attach() { makeTwins(); Game.renderHooks.push(render); ultraFx.hooks.playerTrail = trail; visuals.hooks.stage.push(clear); }, clear, info: () => ({
    twins: twins.filter(t => t.body).length, gales: gales.filter(s => s.t !== Infinity).length, pyres: pyres.filter(s => s.e).length,
    meteors: meteors.filter(s => s.t !== Infinity).length, bolts: bolts.filter(b => b.t !== Infinity).length, dragons: dragons.filter(g => g.t !== Infinity).length,
    bubbles: bubbles.filter(b => b.e).length, rains: rains.filter(r => r.e).length, swords: swords.filter(s => s.t !== Infinity).length,
    moons: moons.filter(m => m.body).length, slashes: slashes.filter(s => s.t !== Infinity).length }) };
})();
