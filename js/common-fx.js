'use strict';
// ============================================================================
// The blade's commons drawn (design/abilities, BUILD-ORDER batch 2): drawing only
// ============================================================================
// Six commons are small strikes of their own (js/abilities.js, `abilityPower` with a common's id). Each is drawn here in
// the commons' bone ink, in the cel look the game is moving to (pass 108, Aleix's pick): flat hard-edged shapes in two
// or three tones with a dark ink outline, few big sharp particles, a peak within 0.1 s and gone by 0.6 s, no light, no
// camera kick (js/camera-feel.js skips commons). Everyone sees everyone's. Every mesh and sprite is pooled and made at
// load; each ages in real time (it runs through hit-pause). Tuning: VIS.abilityFx.common. Sounds: js/audio.js.
//   spark       Spark Step: a zigzag line on the ground along the dash, snapping into a star on the enemy's flank.
//   lick        Ember Lick: one flame tongue licking off the fourth cut, embers off its tip.
//   molten      Hot Iron: a white-hot star at the impact and a fan of molten drops cooling as they fall.
//   lateCut     Petal Cut: a thin cut line hangs across the enemy, then (its `strike`) splits open and sheds petals.
//   afterimage  Echo Step: where the dodge was, a brush-stroke crescent swings at the enemy (its `strike`) and the
//               copy's ink flakes away. The copy itself is js/afterimage.js's perfect-dodge figure.
//   whirl       Dust Devil: a spiral of dust winds round the take-off, cut lines flicking inside it, grit thrown out.
// Static Edge's spark (a rare's) is js/ability-fx.js's: this file draws only a common's.
// Batch 3, the guard and the run (pass 114), the same ink:
//   thorns      Thorn Guard: a cluster of bone thorns pops out of the attacker's flank facing the guard.
//   burnHits    Bitter Draught: the flask lights an ember ring at the drinker's feet; each burning blow licks a flame.
//   shards      Shatter Guard: the crack throws bone chips; a beat later the shards burst on the boss with a star.
//   reflect     Mirror Shard (pass 117): a star where the bolt meets the blade; the bolt, bone white in an ink outline,
//               flies back into the shooter's chest shedding mirror shards (a bright face, a dark one), a star there.
//               Its holder's own is drawn at once (`shotDeflected`); everyone else's from the server's power.
//   The commons' perks (`abilityPerk`, the holder's own): Ringing Steel and Hunter's Pace a bone ring at the feet (Hunter's
//   wider, with grit), a banked dash spent a small one; Ash Veil a veil of ash wisps round its holder while it holds, torn
//   to flakes as it takes a blow; Grit an iron ring and grey flakes (the body's iron tint: js/player-pose.js), a glance a
//   small star; Kindling and Tithe motes rising (the key caps flare: js/hud.js); Glint's spent blow a star on the boss
//   (its waiting blade glints: js/player-pose.js). Kindred Ember: an ember ring where the friend rises.
const commonFx = (() => {
  const K = () => VIS.abilityFx.common;
  const isCommon = d => !!(ABILITY_BY_ID[d.power] && ABILITY_BY_ID[d.power].rarity === 'common');
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rnd = (() => { let s = 23; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();   // the same drawings every load
  const INK = '#16130f', BONE = '#cfc8b6', CORE = '#f4f1e8';
  // An ink-outlined shape: drawn thick in ink, then filled, then a thinner pass of its edge colour.
  const inked = (g, path, fill, edge, ink = 7, rim = 2.5) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    path(); g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill();
    if (edge) { path(); g.lineWidth = rim; g.strokeStyle = edge; g.stroke(); }
  };
  let ZIG, STAR, TONGUE, LENS, CRESCENT, BAND, CUTS, FLAKE, PETAL, THORN, RING, VEIL;
  function textures() {
    THORN = canvasTex(128, 128, (g, w) => {   // seven bone thorns fanned from the base, inked
      const m = w / 2;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.36 + (rnd() - 0.5) * 0.12, r = m * (0.62 + rnd() * 0.3), s = 0.13;
        const path = () => { g.beginPath(); g.moveTo(m + Math.cos(a - s) * m * 0.12, w * 0.9 + Math.sin(a - s) * m * 0.12);
          g.lineTo(m + Math.cos(a) * r, w * 0.9 + Math.sin(a) * r); g.lineTo(m + Math.cos(a + s) * m * 0.12, w * 0.9 + Math.sin(a + s) * m * 0.12); g.closePath(); };
        inked(g, path, BONE, CORE, 6, 1.5);
      }
    });
    RING = canvasTex(256, 256, (g, w) => {   // a flat ring: ink under bone, a white core, eight ticks out of it
      const m = w / 2, arc = (th, c) => { g.beginPath(); g.arc(m, m, m * 0.78, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); };
      arc(22, INK); arc(13, BONE); arc(4, CORE);
      g.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + 0.2;
        for (const [th, c] of [[9, INK], [4, BONE]]) { g.beginPath(); g.moveTo(m + Math.cos(a) * m * 0.84, m + Math.sin(a) * m * 0.84); g.lineTo(m + Math.cos(a) * m * 0.97, m + Math.sin(a) * m * 0.97); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
      }
    });
    VEIL = canvasTex(256, 128, (g, w, h) => {   // ash wisps rising, pale grey with ink edges, gaps between
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.2 + rnd() * 0.5) * w / 9, sway = (rnd() - 0.5) * 18, path = () => { g.beginPath(); g.moveTo(x, h);
          g.bezierCurveTo(x + sway, h * 0.65, x - sway, h * 0.35, x + sway * 0.5, h * 0.05); g.lineTo(x + sway * 0.5 + 6, h * 0.08);
          g.bezierCurveTo(x - sway + 8, h * 0.35, x + sway + 10, h * 0.65, x + 12, h); g.closePath(); };
        inked(g, path, i % 2 ? '#b9b2a2' : '#8c877b', null, 3);
      }
    });
    ZIG = canvasTex(512, 64, (g, w, h) => {   // a zigzag bolt along the strip: ink, bone edge, white core
      const pts = [[4, h / 2]];
      for (let x = 30, up = true; x < w - 20; x += 26 + rnd() * 18, up = !up) pts.push([x, h / 2 + (up ? -1 : 1) * (8 + rnd() * 12)]);
      pts.push([w - 4, h / 2]);
      const line = (width, color) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts) g.lineTo(...p); g.lineWidth = width; g.strokeStyle = color; g.stroke(); };
      g.lineJoin = 'miter'; g.lineCap = 'round';
      line(15, INK); line(9, BONE); line(3.5, CORE);
    });
    STAR = canvasTex(128, 128, (g, w) => {   // a hard four-point star: ink outline, bone points, white core
      const m = w / 2, path = () => {
        g.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? m * 0.16 : (i % 4 ? m * 0.5 : m * 0.9); const px = m + Math.cos(a) * r, py = m + Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.closePath();
      };
      inked(g, path, BONE, null, 8);
      g.beginPath(); g.arc(m, m, m * 0.18, 0, Math.PI * 2); g.fillStyle = CORE; g.fill();
    });
    TONGUE = canvasTex(256, 128, (g, w, h) => {   // one flame tongue, base left, curling up at its tip: pale body, dark red inner lines
      const path = () => { g.beginPath(); g.moveTo(8, h * 0.62); g.bezierCurveTo(w * 0.35, h * 0.95, w * 0.75, h * 0.85, w * 0.9, h * 0.45);
        g.quadraticCurveTo(w * 0.98, h * 0.2, w * 0.86, h * 0.06); g.quadraticCurveTo(w * 0.8, h * 0.4, w * 0.6, h * 0.5);
        g.bezierCurveTo(w * 0.4, h * 0.58, w * 0.2, h * 0.5, 8, h * 0.62); g.closePath(); };
      inked(g, path, '#ece2cc', BONE, 8, 3);
      g.strokeStyle = '#7a1e14'; g.lineWidth = 3.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(w * 0.25, h * 0.66); g.bezierCurveTo(w * 0.5, h * 0.78, w * 0.72, h * 0.7, w * 0.83, h * 0.42); g.stroke();
      g.beginPath(); g.moveTo(w * 0.45, h * 0.64); g.quadraticCurveTo(w * 0.66, h * 0.66, w * 0.76, h * 0.5); g.stroke();
    });
    LENS = canvasTex(256, 64, (g, w, h) => {   // a cut: a lens tapering to points, ink shadow under a bone edge and a white core
      const lens = (k) => { g.beginPath(); g.moveTo(4, h / 2); g.quadraticCurveTo(w / 2, h / 2 - h * 0.46 * k, w - 4, h / 2); g.quadraticCurveTo(w / 2, h / 2 + h * 0.46 * k, 4, h / 2); g.closePath(); };
      lens(1); g.fillStyle = INK; g.fill();
      lens(0.72); g.fillStyle = BONE; g.fill();
      lens(0.38); g.fillStyle = CORE; g.fill();
    });
    CRESCENT = canvasTex(256, 256, (g, w, h) => {   // a brush crescent: dry-brush ink ends, bone edge, white core
      g.translate(w / 2, h * 0.72);
      const arc = (rx, ry, th, color) => { g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = th; g.strokeStyle = color; g.lineCap = 'butt'; g.stroke(); };
      arc(w * 0.4, h * 0.5, 30, INK); arc(w * 0.4, h * 0.5, 20, BONE); arc(w * 0.4, h * 0.5, 9, CORE);
      for (let i = 0; i < 14; i++) {   // the bristles at both ends
        const end = i % 2 ? 1.06 + rnd() * 0.06 : 1.88 + rnd() * 0.06, a = Math.PI * end, r = 1 + (rnd() - 0.5) * 0.16;
        g.beginPath(); g.arc(Math.cos(a) * w * 0.4 * r, Math.sin(a) * h * 0.5 * r, 2 + rnd() * 3, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
      }
    });
    BAND = canvasTex(256, 128, (g, w, h) => {   // the whirl's band: diagonal strips of two-tone dust with ink edges, gaps between
      for (let i = -2; i < 7; i++) {
        const x = i * w / 5, path = () => { g.beginPath(); g.moveTo(x, h); g.lineTo(x + w * 0.12, h); g.lineTo(x + w * 0.42, 0); g.lineTo(x + w * 0.28, 0); g.closePath(); };
        inked(g, path, i % 2 ? '#8c877b' : '#4a4740', BONE, 5, 2);
      }
    });
    CUTS = canvasTex(256, 64, (g, w, h) => {   // four short bone-white cut strokes spaced round the band
      g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const x = (i + 0.3) * w / 4;
        for (const [th, c] of [[9, INK], [5, BONE], [2, CORE]]) { g.beginPath(); g.moveTo(x, h * 0.8); g.lineTo(x + w * 0.12, h * 0.2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
      }
    });
    FLAKE = canvasTex(32, 32, (g, w, h) => {   // a hard shard of ink or grit (tinted per use)
      g.beginPath(); g.moveTo(w * 0.1, h * 0.55); g.lineTo(w * 0.5, h * 0.1); g.lineTo(w * 0.9, h * 0.4); g.lineTo(w * 0.45, h * 0.9); g.closePath(); g.fillStyle = '#fff'; g.fill();
    });
    PETAL = canvasTex(32, 32, (g, w, h) => {   // a petal: pale face, a shaded side
      g.beginPath(); g.moveTo(w * 0.5, h * 0.05); g.quadraticCurveTo(w * 0.95, h * 0.5, w * 0.5, h * 0.95); g.quadraticCurveTo(w * 0.05, h * 0.5, w * 0.5, h * 0.05); g.closePath();
      g.fillStyle = '#ece6d8'; g.fill();
      g.beginPath(); g.moveTo(w * 0.5, h * 0.05); g.quadraticCurveTo(w * 0.95, h * 0.5, w * 0.5, h * 0.95); g.closePath(); g.fillStyle = '#8c877b'; g.fill();
    });
  }
  const mat = (map, opts = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, ...opts });
  const sprite = (map, order = 13, over = false) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: !over, fog: false }));
    s.visible = false; s.renderOrder = order; scene.add(s); pooledFx.push(s); return s;
  };
  const mesh = (geo, material, order = 12) => {
    const m = new THREE.Mesh(geo, material); m.visible = false; m.renderOrder = order; m.frustumCulled = false; scene.add(m); pooledFx.push(m); return m;
  };
  // One of each shape (a common fires at most once a second, or once a string or a charge); flakes and petals share a pool.
  let line, star, tongue, lens, crescent, band, cuts, thorn, veil, mirror, made = false;
  const flakes = [], rings = [];
  const SHED = { map: null, speed: 0.5, up: 0.3, grav: 3, size: 0.12, life: 0.5 }, SHED_BRIGHT = [0xf4f1e8], SHED_DARK = [0x8c877b];   // a mirror shard shed
  function make() {
    if (made) return;
    made = true; textures();
    const strip = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);   // flat, from its start along +x
    line = { m: mesh(strip, mat(ZIG), 3), age: Infinity, len: 1 };
    star = { s: sprite(STAR, 14), age: Infinity, x: 0, y: 0, z: 0, size: 1, peak: 0.1 };
    tongue = { s: sprite(TONGUE, 14), age: Infinity, x: 0, y: 0, z: 0, flip: 1 };
    tongue.s.center.set(0, 0.5);   // it licks out from its base
    lens = { s: sprite(LENS, 14, true), age: Infinity, open: Infinity, enemy: null, holder: null, x: 0, y: 0, z: 0, rot: 0, len: 1.6 };
    crescent = { s: sprite(CRESCENT, 14), age: Infinity, x: 0, y: 0, z: 0, rot: 0 };
    const cone = new THREE.CylinderGeometry(1, 0.5, 1, 28, 1, true).translate(0, 0.5, 0);
    band = { m: mesh(cone, mat(BAND), 11), age: Infinity };
    cuts = { m: mesh(cone, mat(CUTS), 12), age: Infinity };
    thorn = { s: sprite(THORN, 14), age: Infinity, x: 0, y: 0, z: 0 };
    thorn.s.center.set(0.5, 0.1);   // it grows out of the body
    veil = { m: mesh(new THREE.CylinderGeometry(1, 0.8, 1, 24, 1, true).translate(0, 0.5, 0), mat(VEIL), 12), body: null, age: Infinity };
    const disc = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < 3; i++) rings.push({ m: mesh(disc, mat(RING), 3), age: Infinity, life: 1, from: 1, to: 2, x: 0, y: 0, z: 0 });
    {   // the returning bolt: a bone shaft and head inside an inked hull (back faces, a little larger)
      const g = new THREE.Group(), M = K().mirror;
      const bone = new THREE.MeshBasicMaterial({ color: 0xf4f1e8, fog: false }), head = new THREE.MeshBasicMaterial({ color: 0xcfc8b6, fog: false });
      const ink = new THREE.MeshBasicMaterial({ color: 0x16130f, side: THREE.BackSide, fog: false });
      const shaft = new THREE.BoxGeometry(M.width, M.width, M.length), tip = new THREE.ConeGeometry(M.width * 1.6, M.length * 0.3, 4).rotateX(Math.PI / 2).translate(0, 0, M.length * 0.62);
      for (const [geo, m] of [[shaft, bone], [tip, head]]) {
        g.add(new THREE.Mesh(geo, m));
        const hull = new THREE.Mesh(geo, ink); hull.scale.setScalar(M.ink); hull.scale.z = 1 + (M.ink - 1) * 0.25; g.add(hull);
      }
      g.visible = false; scene.add(g);   // its meshes warm up with their group's (userData.warmUp), not as pooled sprites
      g.userData.warmUp = true; for (const m of g.children) m.renderOrder = 12;
      mirror = { g, age: Infinity, flight: 0.3, x0: 0, y0: 0, z0: 0, enemy: null, tx: 0, ty: 0, tz: 0, shed: 0 };
    }
    for (let i = 0; i < 24; i++) flakes.push({ s: sprite(FLAKE, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, size: 0.1, grav: 0 });
  }
  const freeFlake = () => flakes.find(f => f.age === Infinity) || flakes.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
  // `n` flat flakes from (x, y, z): `color`, `map` (FLAKE or PETAL), thrown out at `speed` (biased along dir), falling by `grav`.
  function throwFlakes(x, y, z, n, color, opt) {
    const many = Math.max(1, Math.round(n * (CONFIG.VISUALS.fxBudgets[visuals.quality().fxBudget] || { density: 1 }).density));
    for (let i = 0; i < many; i++) {
      const f = freeFlake(), a = rnd() * Math.PI * 2, sp = opt.speed * (0.5 + rnd() * 0.6), d = opt.dir;
      f.age = 0; f.life = opt.life * (0.75 + rnd() * 0.5); f.x = x; f.y = y; f.z = z;
      f.vx = Math.cos(a) * sp + (d ? d.x * opt.speed : 0); f.vz = Math.sin(a) * sp + (d ? d.z * opt.speed : 0); f.vy = (opt.up || 0) * (0.5 + rnd());
      f.spin = (rnd() - 0.5) * 12; f.size = opt.size * (0.7 + rnd() * 0.6); f.grav = opt.grav;
      f.s.material.map = opt.map; f.s.material.color.setHex(color[i % color.length]); f.s.material.opacity = 1; f.s.material.rotation = rnd() * 6.3;
      f.s.position.set(x, y, z); f.s.scale.setScalar(f.size); f.s.visible = true;
    }
  }
  const bright = (at, n, kind, dir = null, bias = 0, speed = 0.8) => {
    if (typeof ultraFx !== 'undefined' && ultraFx.on()) ultraFx.sparkBurst(at, n, kind, dir, bias, speed);
    else spawnBurst(at, { color: kind === 'ember' ? 0xe0a050 : 0xf4f1e8, count: Math.max(2, Math.round(n / 2)), speed: 5 * speed });
  };
  const spot = { x: 0, y: 0, z: 0 };
  // A flat ring at (x, y, z) growing from `from` to `to` m across in `life` s, tinted `color`.
  function ring(x, y, z, from, to, life, color = 0xffffff) {
    const r = rings.find(q => q.age === Infinity) || rings.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
    r.age = 0; r.life = life; r.from = from; r.to = reducedMotion() ? from + (to - from) * 0.6 : to; r.x = x; r.y = y + 0.05; r.z = z;
    r.m.material.color.setHex(color); r.m.material.opacity = 1; r.m.position.set(r.x, r.y, r.z); r.m.scale.set(from, 1, from); r.m.visible = true;
  }
  const chest = (b, h = 0.6) => { spot.x = b.x; spot.y = b.y + (b.height || 1.8) * h; spot.z = b.z; return spot; };
  // A common's perk on its holder (js/abilities.js COMMON_PERKS): drawn on the holder's own screen.
  function perk(d) {
    const b = d.body, C = K(), R = C.ring;
    if (!b || !COMMON_PERKS.has(d.perk)) return;
    switch (d.perk) {
      case 'parry/freeDash': ring(b.x, b.y, b.z, R.ringFrom, R.ringTo * 0.7, R.life); break;
      case 'freeDash/spent': ring(b.x, b.y, b.z, R.dash, R.ringFrom * 1.6, R.life * 0.6); break;
      case 'fightStart/freeDash':
        ring(b.x, b.y, b.z, R.start, R.ringTo, R.life * 1.4);
        throwFlakes(b.x, b.y + 0.15, b.z, 10, [0xcfc8b6, 0x8c877b], { map: FLAKE, speed: 3, up: 0.6, grav: 5, size: 0.08, life: 0.45 });
        break;
      case 'low/veil': veil.body = b; veil.age = 0; veil.m.material.opacity = 0; veil.m.visible = true; break;
      case 'veil/spent': {
        veil.body = null; veil.age = Infinity; veil.m.visible = false;
        const at = chest(b, 0.5);
        throwFlakes(at.x, at.y, at.z, C.veil.ash, [0xb9b2a2, 0x8c877b, 0x16130f], { map: FLAKE, speed: 2.4, up: 1, grav: 1.2, size: 0.12, life: 0.6 });
        break;
      }
      case 'hurt/ironSkin': {
        ring(b.x, b.y, b.z, R.ringFrom, R.ringTo * 0.6, R.life, 0x8c8a86);
        const at = chest(b, 0.55);
        throwFlakes(at.x, at.y, at.z, 6, [0x5c5952, 0x8c8a86], { map: FLAKE, speed: 1.6, up: 0.4, grav: 4, size: 0.09, life: 0.35 });
        break;
      }
      case 'ironSkin/glance': { const at = chest(b, 0.6); star.age = 0; star.x = at.x; star.y = at.y; star.z = at.z; star.size = 0.4; star.peak = 0; break; }
      case 'parry/keys': case 'finisher/keys': bright(chest(b, 0.4), C.motes, 'bone', [0, 1, 0], 0.8, 0.5); break;
      case 'glint/spent': {
        const e = d.target; if (!e) break;
        const at = flank(e, b.x, b.z, 0.6); star.age = 0; star.x = at.x; star.y = at.y; star.z = at.z; star.size = C.spark.star * 1.2; star.peak = 0;
        break;
      }
    }
  }
  // A point on the enemy's body facing (x, z), at `h` of its height.
  function flank(e, x, z, h) {
    const dx = x - e.x, dz = z - e.z, l = Math.hypot(dx, dz) || 1, r = (e.radius || 0.6) * 0.85;
    spot.x = e.x + dx / l * r; spot.y = e.y + (e.height || 1.8) * h; spot.z = e.z + dz / l * r; return spot;
  }

  // Mirror Shard's bolt turns at (x, y, z) and flies back into `e` for `flight` s.
  function reflect(e, x, y, z, flight) {
    if (!e) return;
    const M = K().mirror;
    star.age = 0; star.x = x; star.y = y; star.z = z; star.size = M.star; star.peak = 0;
    mirror.age = 0; mirror.flight = Math.max(0.05, flight || 0.3); mirror.enemy = e; mirror.shed = 0;
    mirror.x0 = x; mirror.y0 = y; mirror.z0 = z; mirror.g.position.set(x, y, z); mirror.g.visible = true;
  }
  function fire(d) {
    const e = d.enemy, C = K();
    if (d.then === 'reflect') {   // the holder's own was drawn as it turned (shotDeflected); its landing is the bolt's own
      if (!d.strike && e && d.body !== Game.player) { const b = d.body ? chest(d.body, 0.6) : d; reflect(e, b.x, b.y, b.z, d.flight); }
      return;
    }
    if (d.then === 'spark' && d.path && e) {
      const P = d.path, dx = P.to.x - P.from.x, dz = P.to.z - P.from.z, len = Math.hypot(dx, dz);
      if (!(len > 0.3)) return;
      line.age = 0; line.len = len; line.m.position.set(P.from.x, d.y + 0.04, P.from.z); line.m.rotation.y = Math.atan2(-dz, dx);
      line.m.scale.set(reducedMotion() ? len : 0.01, 1, C.spark.width); line.m.material.opacity = 1; line.m.visible = true;
      // the star snaps on the flank nearest the path
      const t = clamp(((e.x - P.from.x) * dx + (e.z - P.from.z) * dz) / (len * len), 0, 1), at = flank(e, P.from.x + dx * t, P.from.z + dz * t, 0.45);
      star.s.visible = false; star.age = -C.spark.snapAt; star.x = at.x; star.y = at.y; star.z = at.z; star.size = C.spark.star; star.peak = C.spark.snapAt;
    } else if (d.then === 'lick' && e) {
      const b = d.body || e, at = flank(e, b.x, b.z, 0.55);
      tongue.age = 0; tongue.x = at.x; tongue.y = at.y; tongue.z = at.z; tongue.flip = rnd() < 0.5 ? 1 : -1;
      tongue.s.material.opacity = 1; tongue.s.visible = true;
      bright(at, C.lick.embers, 'ember', [0, 1, 0], 0.6, 0.6);
    } else if (d.then === 'molten' && e) {
      const b = d.body || e, at = flank(e, b.x, b.z, 0.5), dx = e.x - b.x, dz = e.z - b.z, l = Math.hypot(dx, dz) || 1;
      star.age = 0; star.x = at.x; star.y = at.y; star.z = at.z; star.size = C.molten.star; star.peak = 0;
      bright(at, C.molten.drops, 'ember', [dx / l, 0.7, dz / l], 0.55, 0.9);
    } else if (d.then === 'lateCut' && e && !d.strike) {
      const b = d.body || e, at = flank(e, b.x, b.z, 0.55);
      lens.age = 0; lens.open = Infinity; lens.enemy = e; lens.holder = d.holder; lens.x = at.x; lens.y = at.y; lens.z = at.z;
      lens.rot = (rnd() - 0.5) * 0.9; lens.len = C.cut.length * Math.max(1, (e.radius || 0.6) / 0.8) ** 0.5;
      lens.s.material.rotation = lens.rot; lens.s.material.opacity = 1; lens.s.material.color.setScalar(1); lens.s.visible = true;
    } else if (d.then === 'lateCut' && e) {   // the late cut lands: its line opens (drawn now if its hanging was missed)
      if (lens.enemy !== e || lens.age === Infinity) { const at = flank(e, e.x + 1, e.z, 0.55); lens.x = at.x; lens.y = at.y; lens.z = at.z; lens.len = C.cut.length; lens.rot = 0.3; lens.s.material.rotation = 0.3; lens.s.visible = true; }
      lens.enemy = e; lens.age = 0; lens.open = 0;
      throwFlakes(lens.x, lens.y, lens.z, C.cut.petals, [0xffffff], { map: PETAL, speed: 1.4, up: 0.8, grav: 2.2, size: 0.16, life: 0.6 });
    } else if (d.then === 'afterimage' && e && d.strike) {   // the copy left at the dodge swings at the enemy
      const dx = e.x - d.x, dz = e.z - d.z, l = Math.hypot(dx, dz) || 1, reach = Math.min(l * 0.55, 1.4);
      crescent.age = 0; crescent.x = d.x + dx / l * reach; crescent.y = d.y + C.image.height; crescent.z = d.z + dz / l * reach;
      crescent.rot = (rnd() - 0.5) * 0.8; crescent.s.material.rotation = crescent.rot; crescent.s.material.opacity = 1; crescent.s.visible = true;
      throwFlakes(d.x, d.y + 1, d.z, C.image.flakes, [0x4a4740, 0x16130f, 0x16130f, 0xcfc8b6], { map: FLAKE, speed: 1.2, dir: { x: -dx / l * 0.6, z: -dz / l * 0.6 }, up: 0.4, grav: 1.6, size: 0.12, life: 0.55 });
    } else if (d.then === 'thorns' && e) {
      const b = d.body || e, at = flank(e, b.x, b.z, 0.5);
      thorn.age = 0; thorn.x = at.x; thorn.y = at.y; thorn.z = at.z; thorn.s.material.opacity = 1; thorn.s.material.rotation = (rnd() - 0.5) * 0.6; thorn.s.visible = true;
      const dx = at.x - e.x, dz = at.z - e.z, l = Math.hypot(dx, dz) || 1;
      throwFlakes(at.x, at.y, at.z, C.thorns.flakes, [0xcfc8b6, 0x16130f], { map: FLAKE, speed: 1.8, dir: { x: dx / l, z: dz / l }, up: 0.6, grav: 4, size: 0.09, life: 0.35 });
    } else if (d.then === 'burnHits' && !d.strike) {   // the flask: an ember ring at the drinker's feet
      const b = d.body; if (!b) return;
      ring(b.x, b.y, b.z, C.ring.ringFrom, C.ring.ringTo * 0.6, C.ring.life, 0xffb070);
      bright(chest(b, 0.3), C.burn, 'ember', [0, 1, 0], 0.7, 0.5);
    } else if (d.then === 'burnHits' && e) {   // a burning blow: a flame licks off it
      const b = d.body || e, at = flank(e, b.x, b.z, 0.5);
      tongue.age = 0; tongue.x = at.x; tongue.y = at.y; tongue.z = at.z; tongue.flip = rnd() < 0.5 ? 1 : -1; tongue.s.material.opacity = 1; tongue.s.visible = true;
      bright(at, C.burn, 'ember', [0, 1, 0], 0.6, 0.6);
    } else if (d.then === 'shards' && e) {
      const b = d.body || e, at = flank(e, b.x, b.z, 0.6), dx = at.x - e.x, dz = at.z - e.z, l = Math.hypot(dx, dz) || 1;
      if (!d.strike) throwFlakes(at.x, at.y, at.z, 5, [0xcfc8b6, 0xf4f1e8], { map: FLAKE, speed: 1.2, dir: { x: dx / l, z: dz / l }, up: 0.5, grav: 5, size: 0.08, life: 0.3 });
      else {
        star.age = 0; star.x = at.x; star.y = at.y; star.z = at.z; star.size = C.shards.star; star.peak = 0;
        throwFlakes(at.x, at.y, at.z, C.shards.count, [0xcfc8b6, 0xf4f1e8, 0x16130f], { map: FLAKE, speed: 3.4, dir: { x: dx / l * 0.5, z: dz / l * 0.5 }, up: 1, grav: 7, size: 0.13, life: 0.45 });
      }
    } else if (d.then === 'whirl') {
      band.age = 0; cuts.age = 0;
      for (const w of [band, cuts]) { w.m.position.set(d.x, d.y + 0.02, d.z); w.m.rotation.y = 0; w.m.material.opacity = 1; w.m.visible = true; }
      throwFlakes(d.x, d.y + 0.3, d.z, C.whirl.grit, [0x8c877b, 0x4a4740], { map: FLAKE, speed: 3.2, up: 1.2, grav: 6, size: 0.09, life: 0.45 });
    }
  }

  function render(game) {
    if (!made) return;
    const real = effectSlots.real(), C = K(), calm = reducedMotion();
    if (line.age !== Infinity) {   // draws itself start to end, then fades
      line.age += real;
      const S = C.spark;
      if (line.age > S.life) { line.age = Infinity; line.m.visible = false; }
      else { line.m.scale.x = line.len * (calm ? 1 : Math.min(1, line.age / S.draw)); line.m.material.opacity = 1 - clamp01((line.age - S.fadeAt) / (S.life - S.fadeAt)); }
    }
    if (star.age !== Infinity) {   // waits for its snap (a spark's), pops open, fades
      star.age += real;
      const life = 0.25;
      if (star.age > life) { star.age = Infinity; star.s.visible = false; }
      else if (star.age >= 0) {
        if (!star.s.visible && star.peak > 0) { spot.x = star.x; spot.y = star.y; spot.z = star.z; bright(spot, C.spark.sparks, 'bone', null, 0, 0.8); }
        const pop = Math.min(1, star.age / 0.04), out = clamp01((star.age - 0.1) / (life - 0.1));
        star.s.position.set(star.x, star.y, star.z); star.s.scale.setScalar(star.size * (0.5 + 0.5 * pop) * (1 - 0.3 * out));
        star.s.material.rotation = calm ? 0 : star.age * 2; star.s.material.opacity = 1 - out; star.s.visible = true;
      }
    }
    if (tongue.age !== Infinity) {   // sweeps out along its length, then thins from its base
      tongue.age += real;
      const L = C.lick;
      if (tongue.age > L.life) { tongue.age = Infinity; tongue.s.visible = false; }
      else {
        const k = Math.min(1, tongue.age / L.sweep), out = clamp01((tongue.age - L.sweep) / (L.life - L.sweep));
        tongue.s.position.set(tongue.x, tongue.y, tongue.z);
        tongue.s.scale.set(tongue.flip * L.length * (0.3 + 0.7 * k), L.length * 0.5 * (1 - 0.7 * out), 1);
        tongue.s.material.rotation = 0.35 * tongue.flip; tongue.s.material.opacity = 1 - out * out;
      }
    }
    if (lens.age !== Infinity) {   // held thin until it opens, then a lens that brightens and closes; it gives up if never opened
      lens.age += real;
      const T = C.cut;
      if (lens.open === Infinity && lens.age > T.wait) { lens.age = Infinity; lens.s.visible = false; lens.enemy = null; }
      else if (lens.open !== Infinity && lens.age > T.show) { lens.age = Infinity; lens.s.visible = false; lens.enemy = null; }
      else {
        let w, l = lens.len;
        if (lens.open === Infinity) { w = T.thin; l *= Math.min(1, lens.age / 0.05); lens.s.material.color.setScalar(1); }
        else {
          const o = Math.min(1, lens.age / T.widen), f = clamp01((lens.age - T.widen) / (T.show - T.widen));
          w = lerp(T.thin, T.wide, o) * (1 - f); l *= 1 + 0.12 * o;
          lens.s.material.color.setScalar(calm ? 1 : 1 + 0.6 * (1 - Math.min(1, lens.age / 0.05)));
        }
        lens.s.position.set(lens.x, lens.y, lens.z); lens.s.scale.set(l, Math.max(0.005, w), 1);
      }
    }
    if (crescent.age !== Infinity) {   // one swing: sweeps open, then fades
      crescent.age += real;
      const I = C.image;
      if (crescent.age > I.life) { crescent.age = Infinity; crescent.s.visible = false; }
      else {
        const k = Math.min(1, crescent.age / 0.06), out = clamp01((crescent.age - 0.1) / (I.life - 0.1));
        crescent.s.position.set(crescent.x, crescent.y, crescent.z); crescent.s.scale.setScalar(I.size * (0.6 + 0.4 * k));
        crescent.s.material.rotation = crescent.rot + (calm ? 0 : -0.5 * k); crescent.s.material.opacity = 1 - out;
      }
    }
    if (band.age !== Infinity) {   // winds up one and a half turns, widening, then thins away
      band.age += real; cuts.age = band.age;
      const W = C.whirl, r = CONFIG.abilities.commons.whirlRadius * W.reach;
      if (band.age > W.life) { band.age = cuts.age = Infinity; band.m.visible = cuts.m.visible = false; }
      else {
        const k = Math.min(1, band.age / W.spin), out = clamp01((band.age - W.spin) / (W.life - W.spin)), turn = calm ? 0 : W.turns * Math.PI * 2 * (1 - (1 - k) ** 2);
        const rr = lerp(0.5, r, calm ? 1 : k);
        band.m.scale.set(rr, W.height * (1 - 0.5 * out), rr); band.m.rotation.y = -turn; band.m.material.opacity = 1 - out;
        cuts.m.scale.set(rr * 0.92, W.height * 0.8, rr * 0.92); cuts.m.rotation.y = -turn * 1.4;
        cuts.m.material.opacity = band.age < 0.05 || band.age > 0.3 ? 0 : 1;
      }
    }
    if (thorn.age !== Infinity) {   // pops out, holds, fades
      thorn.age += real;
      const T = C.thorns;
      if (thorn.age > T.life) { thorn.age = Infinity; thorn.s.visible = false; }
      else {
        const k = calm ? 1 : Math.min(1, thorn.age / 0.05), out = clamp01((thorn.age - 0.12) / (T.life - 0.12));
        thorn.s.position.set(thorn.x, thorn.y, thorn.z); thorn.s.scale.setScalar(T.size * (0.4 + 0.6 * k)); thorn.s.material.opacity = 1 - out;
      }
    }
    if (veil.body) {   // stands round its holder while the veil holds (it goes with them, or with the next fight)
      const b = veil.body, V = C.veil;
      if (!b.alive() || !b.perk || b.perk.veil !== 1 || (game && game.player !== b)) { veil.body = null; veil.age = Infinity; veil.m.visible = false; }
      else {
        veil.age += real;
        veil.m.position.set(b.x, b.y, b.z); veil.m.scale.set(V.width / 2, V.height, V.width / 2);
        veil.m.rotation.y = calm ? 0 : veil.age * V.turn; veil.m.material.opacity = V.opacity * Math.min(1, veil.age / 0.2);
      }
    }
    if (mirror.age !== Infinity) {   // flies from the clash to the shooter's chest (it follows them), shedding shards
      mirror.age += real;
      const M = C.mirror, e = mirror.enemy, k = Math.min(1, mirror.age / mirror.flight);
      if (e) { mirror.tx = e.x; mirror.ty = e.y + (e.height || 1.8) * 0.6; mirror.tz = e.z; }
      const x = lerp(mirror.x0, mirror.tx, k), y = lerp(mirror.y0, mirror.ty, k), z = lerp(mirror.z0, mirror.tz, k);
      mirror.g.position.set(x, y, z); spot.x = mirror.tx; spot.y = mirror.ty; spot.z = mirror.tz; mirror.g.lookAt(spot.x, spot.y, spot.z);
      while (mirror.shed < M.shards * k) {   // one shard each 1/shards of the way, turning as it falls
        mirror.shed++;
        SHED.map = FLAKE; SHED.life = M.shardLife;
        throwFlakes(x, y, z, 1, mirror.shed % 2 ? SHED_BRIGHT : SHED_DARK, SHED);
      }
      if (k >= 1) {
        mirror.age = Infinity; mirror.g.visible = false; mirror.enemy = null;
        star.age = 0; star.x = mirror.tx; star.y = mirror.ty; star.z = mirror.tz; star.size = M.star * 1.4; star.peak = 0;
      }
    }
    for (const r of rings) {
      if (r.age === Infinity) continue;
      r.age += real;
      if (r.age > r.life) { r.age = Infinity; r.m.visible = false; continue; }
      const k = r.age / r.life, s = lerp(r.from, r.to, 1 - (1 - k) * (1 - k));
      r.m.scale.set(s, 1, s); r.m.material.opacity = 1 - k * k;
    }
    for (const f of flakes) {
      if (f.age === Infinity) continue;
      f.age += real;
      if (f.age > f.life) { f.age = Infinity; f.s.visible = false; continue; }
      const dt = Math.min(real, 0.05);
      f.vy -= f.grav * dt; f.vx *= 1 - 1.5 * dt; f.vz *= 1 - 1.5 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      f.s.position.set(f.x, f.y, f.z); f.s.material.rotation += f.spin * dt;
      f.s.material.opacity = 1 - clamp01((f.age / f.life - 0.6) / 0.4);
    }
  }
  function clear() {
    if (!made) return;
    for (const q of [line, band, cuts]) { q.age = Infinity; q.m.visible = false; }
    for (const q of [star, tongue, lens, crescent, thorn]) { q.age = Infinity; q.s.visible = false; }
    lens.enemy = null; veil.body = null; veil.age = Infinity; veil.m.visible = false;
    mirror.age = Infinity; mirror.g.visible = false; mirror.enemy = null;
    for (const r of rings) { r.age = Infinity; r.m.visible = false; }
    for (const f of flakes) { f.age = Infinity; f.s.visible = false; }
  }
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.stage.push(clear);
      events.on('abilityPower', d => { if (isCommon(d)) fire(d); });
      events.on('abilityPerk', perk);
      events.on('shotDeflected', d => reflect(d.enemy, d.x, d.y, d.z, d.flight));
      events.on('revive', d => { if (d.kindred) { const R = K().ring; ring(d.x, d.y, d.z, R.ringFrom, R.kindred, R.life * 1.6, 0xffb070); spot.x = d.x; spot.y = d.y + 0.8; spot.z = d.z; bright(spot, K().motes, 'ember', [0, 1, 0], 0.8, 0.6); } });
    },
    clear,
    // tests: what shows now
    get state() {
      if (!made) return {};
      return { line: line.age !== Infinity, star: star.age !== Infinity, tongue: tongue.age !== Infinity, lens: lens.age !== Infinity ? (lens.open === Infinity ? 'hanging' : 'open') : null,
        crescent: crescent.age !== Infinity, whirl: band.age !== Infinity, flakes: flakes.filter(f => f.age !== Infinity).length,
        thorns: thorn.age !== Infinity, veil: !!veil.body, mirror: mirror.age !== Infinity, rings: rings.filter(r => r.age !== Infinity).length };
    },
  };
})();
