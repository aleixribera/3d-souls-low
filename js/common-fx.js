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
  let ZIG, STAR, TONGUE, LENS, CRESCENT, BAND, CUTS, FLAKE, PETAL;
  function textures() {
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
  let line, star, tongue, lens, crescent, band, cuts, made = false;
  const flakes = [];
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
  // A point on the enemy's body facing (x, z), at `h` of its height.
  function flank(e, x, z, h) {
    const dx = x - e.x, dz = z - e.z, l = Math.hypot(dx, dz) || 1, r = (e.radius || 0.6) * 0.85;
    spot.x = e.x + dx / l * r; spot.y = e.y + (e.height || 1.8) * h; spot.z = e.z + dz / l * r; return spot;
  }

  function fire(d) {
    const e = d.enemy, C = K();
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
    for (const q of [star, tongue, lens, crescent]) { q.age = Infinity; q.s.visible = false; }
    lens.enemy = null;
    for (const f of flakes) { f.age = Infinity; f.s.visible = false; }
  }
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.stage.push(clear);
      events.on('abilityPower', d => { if (isCommon(d)) fire(d); });
    },
    clear,
    // tests: what shows now
    get state() {
      if (!made) return {};
      return { line: line.age !== Infinity, star: star.age !== Infinity, tongue: tongue.age !== Infinity, lens: lens.age !== Infinity ? (lens.open === Infinity ? 'hanging' : 'open') : null,
        crescent: crescent.age !== Infinity, whirl: band.age !== Infinity, flakes: flakes.filter(f => f.age !== Infinity).length };
    },
  };
})();
