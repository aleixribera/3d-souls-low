'use strict';
// ============================================================================
// The rares' new triggers drawn (design/abilities, BUILD-ORDER batch 5): drawing only
// ============================================================================
// In the cel look and the rares' blue ink (STYLE.md), like js/rare-fx.js: flat hard-edged shapes in two or three tones
// of blue with a dark ink outline, few big sharp particles, no light. The powers are everyone's (`abilityPower`); the
// perks their holder's own. Every mesh and sprite is pooled and made at load; each ages in real time. Tuning:
// VIS.abilityFx.rareStrike. Sounds: js/audio.js.
//   Riptide       a crest of water stands up off the counter and runs along the cut to its reach, throwing spray, and
//                 breaks into a ring of foam.
//   Moonfall Cut  a tall pale crescent forms over the landing and falls through the line ahead; a cut glows on the floor.
//   Iron Cyclone  a flat ring of steel blades whips round the holder at the waist and flies out to its radius; speed lines.
//   Petal Storm   a star at the finished boss, then a two-armed spiral of blade petals whirls out to its radius and settles.
//   Ironclad      plates ripple over the drinker and settle into a faint shell while it holds; a blow glances off in sparks.
//   Hunting Call  the summon's blow stamps a chevron over the boss's head; it pulses until the holder's blow bursts it.
//   Echoing Blade a key fired: small blue glints orbit the sword hand, one for each echo armed; each echo, a translucent
//                 ink-edged copy of the sword replays the swing a beat behind, a thin blue cut opens on the boss, chips.
//   Overcharge    a key past full: small blue arcs crawl round the sword hand, more as it fills (and a second ring
//                 round its key on the HUD, js/hud.js); the press rings the technique with four hard arcs and sparks.
const rareStrikeFx = (() => {
  const K = () => VIS.abilityFx.rareStrike;
  const INK = '#0e1218', BLUE = '#8fb8dc', CORE = '#f2f6fa', PALE = '#cfe2f2', DEEP = '#2c5f8a', STEEL = '#5f86a8', PLATE = '#3d5c78';
  const C_BLUE = 0x8fb8dc, C_CORE = 0xf2f6fa, C_PALE = 0xcfe2f2, C_INK = 0x0e1218;
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rnd = (() => { let s = 97; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const inked = (g, path, fill, edge, ink = 7, rim = 2.5) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    path(); g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill();
    if (edge) { path(); g.lineWidth = rim; g.strokeStyle = edge; g.stroke(); }
  };
  let WAVE, MOON, CUT, BLADES, PETAL, SCALES, CHEVRON, STAR, RING, FLAKE, GHOST, SLASH, ARC;
  function textures() {
    WAVE = canvasTex(256, 128, (g, w, h) => {   // a breaking crest: deep blue body, a blue lip, white foam claws curling forward
      const body = () => { g.beginPath(); g.moveTo(6, h - 4); g.bezierCurveTo(w * 0.12, h * 0.55, w * 0.3, h * 0.2, w * 0.5, h * 0.18);
        g.bezierCurveTo(w * 0.7, h * 0.2, w * 0.88, h * 0.55, w - 6, h - 4); g.closePath(); };
      inked(g, body, DEEP, BLUE, 9, 5);
      g.strokeStyle = BLUE; g.lineWidth = 4; g.beginPath(); g.moveTo(w * 0.2, h * 0.8); g.bezierCurveTo(w * 0.35, h * 0.45, w * 0.65, h * 0.45, w * 0.8, h * 0.8); g.stroke();
      for (let i = 0; i < 6; i++) {   // the foam claws along the lip
        const x = w * (0.18 + i * 0.13), y = h * (0.2 + Math.abs(i - 2.5) * 0.07);
        inked(g, () => { g.beginPath(); g.moveTo(x - 12, y + 6); g.quadraticCurveTo(x, y - 18, x + 14, y - 4); g.quadraticCurveTo(x + 4, y - 4, x + 2, y + 6); g.closePath(); }, CORE, null, 5);
      }
    });
    MOON = canvasTex(128, 256, (g, w, h) => {   // a tall crescent standing on its tips: pale face, blue edge, ink
      const path = () => { g.beginPath(); g.moveTo(w * 0.55, 6); g.bezierCurveTo(w * 0.02, h * 0.25, w * 0.02, h * 0.75, w * 0.55, h - 6);
        g.bezierCurveTo(w * 0.28, h * 0.7, w * 0.28, h * 0.3, w * 0.55, 6); g.closePath(); };
      inked(g, path, '#e6eef6', BLUE, 9, 4);
    });
    CUT = canvasTex(64, 256, (g, w, h) => {   // a glowing cut along the strip (its length down the canvas), its ends tapering
      for (let y = 0; y < h; y++) {
        const k = Math.min(1, y / (h * 0.15), (h - y) / (h * 0.15)), m = w / 2;
        for (const [half, c] of [[0.45, INK], [0.32, BLUE], [0.1, CORE]]) { g.fillStyle = c; const s = w * half * k; g.fillRect(m - s, y, s * 2, 1); }
      }
    });
    BLADES = canvasTex(256, 256, (g, w) => {   // eight steel ribbon blades round a ring, each leaning with the spin
      const m = w / 2;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, path = () => {
          g.beginPath();
          const p = (r, da) => [m + Math.cos(a + da) * r, m + Math.sin(a + da) * r];
          g.moveTo(...p(m * 0.62, -0.05)); g.quadraticCurveTo(...p(m * 0.95, 0.05), ...p(m * 0.86, 0.5));
          g.quadraticCurveTo(...p(m * 0.8, 0.18), ...p(m * 0.62, -0.05)); g.closePath();
        };
        inked(g, path, STEEL, BLUE, 6, 2.5);
        const q = (r, da) => [m + Math.cos(a + da) * r, m + Math.sin(a + da) * r];
        g.strokeStyle = CORE; g.lineWidth = 2; g.beginPath(); g.moveTo(...q(m * 0.8, 0.05)); g.lineTo(...q(m * 0.86, 0.3)); g.stroke();
      }
    });
    PETAL = canvasTex(64, 64, (g, w, h) => {   // a pointed blade petal: pale face, blue edge, ink
      const path = () => { g.beginPath(); g.moveTo(w * 0.08, h * 0.5); g.quadraticCurveTo(w * 0.45, h * 0.1, w * 0.94, h * 0.5); g.quadraticCurveTo(w * 0.45, h * 0.9, w * 0.08, h * 0.5); g.closePath(); };
      inked(g, path, PALE, BLUE, 6, 3);
    });
    SCALES = canvasTex(128, 128, (g, w) => {   // blued steel plates in a round shell, ink seams
      const m = w / 2;
      g.save(); g.beginPath(); g.arc(m, m, m - 4, 0, Math.PI * 2); g.clip();
      for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
        const x = col * 20 + (row % 2) * 10 - 4, y = row * 18 - 2;
        inked(g, () => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20, y); g.lineTo(x + 20, y + 10); g.quadraticCurveTo(x + 10, y + 24, x, y + 10); g.closePath(); }, PLATE, BLUE, 3, 1.5);
      }
      g.restore();
      g.beginPath(); g.arc(m, m, m - 4, 0, Math.PI * 2); g.lineWidth = 5; g.strokeStyle = BLUE; g.stroke();
    });
    CHEVRON = canvasTex(64, 64, (g, w, h) => {   // a hard chevron pointing down, fangs at its points
      const path = () => { g.beginPath(); g.moveTo(6, 12); g.lineTo(w / 2, h - 10); g.lineTo(w - 6, 12); g.lineTo(w - 16, 12); g.lineTo(w / 2, h - 30); g.lineTo(16, 12); g.closePath(); };
      inked(g, path, CORE, BLUE, 6, 3);
    });
    STAR = canvasTex(128, 128, (g, w) => {   // a hard four-point star: ink, blue points, a white core
      const m = w / 2;
      inked(g, () => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? m * 0.16 : (i % 4 ? m * 0.5 : m * 0.92); const x = m + Math.cos(a) * r, y = m + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); }, BLUE, CORE, 8, 2);
      g.beginPath(); g.arc(m, m, w * 0.1, 0, Math.PI * 2); g.fillStyle = CORE; g.fill();
    });
    RING = canvasTex(256, 256, (g, w) => {   // a flat ring of foam: ink under blue, a white core
      const m = w / 2, arc = (th, c) => { g.beginPath(); g.arc(m, m, m * 0.8, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); };
      arc(20, INK); arc(12, BLUE); arc(4, CORE);
    });
    GHOST = canvasTex(256, 48, (g, w, h) => {   // a flat sword along u (hilt left, point right): pale blue body, white edge, ink
      const path = () => { g.beginPath(); g.moveTo(10, h * 0.5 - 7); g.lineTo(w * 0.82, h * 0.5 - 9); g.lineTo(w - 6, h * 0.5); g.lineTo(w * 0.82, h * 0.5 + 9); g.lineTo(10, h * 0.5 + 7); g.closePath(); };
      inked(g, path, 'rgba(143,184,220,0.5)', BLUE, 6, 2);
      g.strokeStyle = PALE; g.lineWidth = 1.5; g.beginPath(); g.moveTo(20, h * 0.5); g.lineTo(w * 0.8, h * 0.5); g.stroke();
    });
    SLASH = canvasTex(256, 32, (g, w, h) => {   // a thin cut, tapering at both ends: ink, blue edge, white core
      for (let x = 0; x < w; x++) {
        const k = Math.sin(Math.PI * x / w), m = h / 2;
        for (const [half, c] of [[0.42, INK], [0.3, BLUE], [0.12, CORE]]) { g.fillStyle = c; const s = h * half * k; g.fillRect(x, m - s, 1, s * 2); }
      }
    });
    ARC = canvasTex(64, 64, (g, w, h) => {   // a short hard zigzag of electricity: ink under blue, a white core
      const path = () => { g.beginPath(); g.moveTo(6, h * 0.6); g.lineTo(w * 0.3, h * 0.3); g.lineTo(w * 0.45, h * 0.62); g.lineTo(w * 0.68, h * 0.28); g.lineTo(w * 0.8, h * 0.55); g.lineTo(w - 6, h * 0.4); };
      g.lineJoin = 'miter'; g.lineCap = 'round';
      for (const [lw, c] of [[11, INK], [6, BLUE], [2.5, CORE]]) { path(); g.lineWidth = lw; g.strokeStyle = c; g.stroke(); }
    });
    FLAKE = canvasTex(32, 32, (g, w, h) => {   // a hard shard (tinted per use)
      g.beginPath(); g.moveTo(w * 0.1, h * 0.55); g.lineTo(w * 0.5, h * 0.1); g.lineTo(w * 0.9, h * 0.4); g.lineTo(w * 0.45, h * 0.9); g.closePath(); g.fillStyle = '#fff'; g.fill();
    });
  }
  const mat = (map, opts = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, ...opts });
  const sprite = (map, order = 13) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false }));
    s.visible = false; s.renderOrder = order; scene.add(s); pooledFx.push(s); return s;
  };
  const mesh = (geo, material, order = 12) => {
    const m = new THREE.Mesh(geo, material); m.visible = false; m.renderOrder = order; m.frustumCulled = false; scene.add(m); pooledFx.push(m); return m;
  };

  // ---- Pools ---------------------------------------------------------------------------------------------------------
  const PETALS = 40;
  let made = false, crest, moon, cut, cyclone, storm, shell, mark, ghost, glints, sparks;
  const pops = [], rings = [], flakes = [], slashes = [], bursts = [];
  // The holder's sword pivot over the last HIST frames (the ghost replays it a beat behind): matrices and times, made once.
  const HIST = 30, hist = { m: Array.from({ length: HIST }, () => new THREE.Matrix4()), t: new Float64Array(HIST).fill(-1), i: 0, clock: 0, body: null };
  function make() {
    if (made) return;
    made = true; textures();
    const disc = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < 4; i++) pops.push({ s: sprite(STAR, 14), age: Infinity, life: 0.25, size: 1, x: 0, y: 0, z: 0 });
    for (let i = 0; i < 3; i++) rings.push({ m: mesh(disc, mat(RING), 3), age: Infinity, life: 1, from: 1, to: 2, x: 0, y: 0, z: 0 });
    for (let i = 0; i < 48; i++) flakes.push({ s: sprite(FLAKE, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, grav: 0 });
    crest = { m: mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), mat(WAVE), 13), age: Infinity, x: 0, y: 0, z: 0, ux: 0, uz: 1, reach: 8, width: 2, tall: 1 };
    moon = { s: sprite(MOON, 14), age: Infinity, x: 0, y: 0, z: 0, ux: 0, uz: 1 };
    moon.s.center.set(0.5, 0);
    cut = { m: mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), mat(CUT), 3), age: Infinity };
    cyclone = { m: mesh(disc, mat(BLADES), 13), age: Infinity, x: 0, y: 0, z: 0, radius: 3, spin: 1 };
    storm = { age: Infinity, x: 0, y: 0, floor: 0, z: 0, radius: 5, n: PETALS,
      petals: Array.from({ length: PETALS }, (_, i) => ({ s: sprite(PETAL, 14), a: rnd() * 0.6 + (i % 2) * Math.PI, r: 0.55 + rnd() * 0.45, h: rnd(), lag: rnd() * 0.15, spin: (rnd() - 0.5) * 10 })) };
    shell = { s: sprite(SCALES, 14), age: Infinity };
    mark = { s: sprite(CHEVRON, 15), age: Infinity, e: null, from: null, keep: 0 };
    {   // Echoing Blade's ghost: two crossed planes along the weapon's local z (0.15 to 1.3 m), drawn over bodies
      const g = new THREE.Group(), geo = new THREE.PlaneGeometry(1, 1).rotateY(-Math.PI / 2).translate(0, 0, 0.72), m = mat(GHOST, { depthTest: false });
      const a = new THREE.Mesh(geo, m), b = new THREE.Mesh(geo, m); b.rotation.z = Math.PI / 2;
      for (const q of [a, b]) { q.renderOrder = 15; q.frustumCulled = false; g.add(q); }
      a.scale.set(1, 0.13, 1.15); b.scale.set(1, 0.13, 1.15);
      g.visible = false; scene.add(g); g.userData.warmUp = true;
      ghost = { g, m, age: Infinity, body: null };
    }
    for (let i = 0; i < 3; i++) { const q = { s: sprite(SLASH, 15), age: Infinity, life: 0.3 }; q.s.material.depthTest = false; slashes.push(q); }   // drawn over the boss's body
    glints = { body: null, left: 0, until: 0, list: Array.from({ length: 5 }, () => ({ s: sprite(STAR, 15), fade: 0 })) };   // one per echo armed
    sparks = { list: Array.from({ length: 3 }, () => sprite(ARC, 15)), k: 0 };   // Overcharge's crawl round the hand
    for (let i = 0; i < 2; i++) bursts.push({ list: Array.from({ length: 4 }, () => sprite(ARC, 15)), age: Infinity, x: 0, y: 0, z: 0, size: 1 });
  }
  const density = () => (CONFIG.VISUALS.fxBudgets[visuals.quality().fxBudget] || { density: 1 }).density;
  const oldest = list => list.find(q => q.age === Infinity) || list.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
  // `n` flakes (by the effects budget) from (x, y, z): each flies off at `speed` m/s along `dir(i)` (else any way round),
  // `up` m/s up, falling at `grav`, gone at about `life` s.
  function throwFlakes(x, y, z, n, colors, o, dir = null) {
    const many = Math.max(1, Math.round(n * density()));
    for (let i = 0; i < many; i++) {
      const f = oldest(flakes), a = rnd() * Math.PI * 2, sp = o.speed * (0.6 + rnd() * 0.6);
      const d = dir && dir(i, many), dx = d ? d.x : Math.cos(a), dz = d ? d.z : Math.sin(a);
      f.age = 0; f.life = o.life * (0.75 + rnd() * 0.5); f.x = x + (d && d.ox || 0); f.y = y; f.z = z + (d && d.oz || 0);
      f.vx = dx * sp; f.vz = dz * sp; f.vy = (o.up || 0) * (0.5 + rnd()); f.spin = (rnd() - 0.5) * 12; f.grav = o.grav;
      f.s.material.color.setHex(colors[i % colors.length]); f.s.material.opacity = 1; f.s.material.rotation = rnd() * 6.3;
      f.s.position.set(f.x, f.y, f.z); f.s.scale.setScalar(o.size * (0.7 + rnd() * 0.6)); f.s.visible = true;
    }
  }
  const BLUES = [C_BLUE, C_CORE, C_INK], PALES = [C_PALE, C_CORE], FOAM = [C_CORE, C_PALE];
  const SPRAY = { speed: 2.2, up: 3.2, grav: 9, size: 0.12, life: 0.5 }, FALL = { speed: 2.6, up: 1, grav: 7, size: 0.11, life: 0.4 };
  const LINES = { speed: 7, up: 0, grav: 0, size: 0.16, life: 0.3 }, SPRAY_AT = [0.12, 0.24, 0.36];   // s: the crest's spray
  function pop(x, y, z, size, life) {
    const p = oldest(pops); p.age = 0; p.life = life; p.size = size; p.x = x; p.y = y; p.z = z;
    p.s.material.opacity = 1; p.s.position.set(x, y, z); p.s.scale.setScalar(size * 0.5); p.s.visible = true;
  }
  function ring(x, y, z, from, to, life, wait = 0) {
    const r = oldest(rings); r.age = -wait; r.life = life; r.from = from; r.to = reducedMotion() ? from + (to - from) * 0.6 : to;
    r.x = x; r.y = y + 0.05; r.z = z; r.m.material.opacity = 0; r.m.position.set(r.x, r.y, r.z); r.m.scale.set(from, 1, from); r.m.visible = wait <= 0;
  }
  const spot = { x: 0, y: 0, z: 0 }, hand = new THREE.Vector3(), pivotQ = new THREE.Quaternion(), pivotS = new THREE.Vector3();
  // The sword hand of `b` (its weapon's pivot), else its chest's side.
  function handOf(b) {
    const w = b && b.rig && b.rig.weapon;
    if (w) { w.updateWorldMatrix(true, false); return hand.setFromMatrixPosition(w.matrixWorld); }
    return hand.set(b.x + Math.cos(b.yaw || 0) * 0.35, b.y + (b.height || 1.8) * 0.5, b.z - Math.sin(b.yaw || 0) * 0.35);
  }
  // The weapon pivot `ago` s back from the history (the newest one not newer than that), else null.
  function pastPivot(ago) {
    const want = hist.clock - ago;
    for (let n = 0; n < HIST; n++) {
      const i = (hist.i - 1 - n + HIST * 2) % HIST;
      if (hist.t[i] >= 0 && hist.t[i] <= want + 1e-6) return hist.m[i];
    }
    return null;
  }
  function flank(e, x, z, h) {   // a point on the body facing (x, z), at `h` of its height
    const dx = x - e.x, dz = z - e.z, l = Math.hypot(dx, dz) || 1, r = (e.radius || 0.6) * 0.85;
    spot.x = e.x + dx / l * r; spot.y = e.y + (e.height || 1.8) * h; spot.z = e.z + dz / l * r; return spot;
  }

  // ---- The cues --------------------------------------------------------------------------------------------------------
  function power(d) {
    const R = K(), v = d.v || {}, e = d.enemy;
    switch (d.then) {
      case 'wave': {   // from where the counter was thrown, through the boss and on
        if (!e) return;
        const dx = e.x - d.x, dz = e.z - d.z, l = Math.hypot(dx, dz) || 1;
        Object.assign(crest, { age: 0, x: d.x, y: e.y, z: d.z, ux: dx / l, uz: dz / l, reach: v.reach || 8, width: v.width || 2 });
        crest.tall = v.charge > 0 ? R.tide : R.crest;   // Tidal Arc's press: a whole wave, taller than Riptide's crest
        crest.m.rotation.set(0, Math.atan2(dx, dz), 0); crest.m.material.opacity = 1; crest.m.visible = true;
        break;
      }
      case 'crescent': {   // over the landing, along the holder's facing
        const b = d.body, yaw = d.yaw ?? (b ? b.yaw : 0), C = CONFIG.abilities.crescent;   // the facing it cut along (the server's)
        Object.assign(moon, { age: 0, x: d.x, y: d.y, z: d.z, ux: Math.sin(yaw), uz: Math.cos(yaw) });
        moon.s.material.opacity = 1; moon.s.visible = true;
        cut.age = 0; cut.m.position.set(d.x, d.y + 0.04, d.z); cut.m.rotation.set(0, yaw, 0); cut.m.scale.set(R.cutWidth, 1, 0.01); cut.m.material.opacity = 1; cut.m.visible = true;
        cut.reach = C.reach + 0.5;
        break;
      }
      case 'cyclone': {
        Object.assign(cyclone, { age: 0, x: d.x, y: d.y, z: d.z, radius: v.radius || 3, spin: (d.body && d.body.yaw) || 0 });
        cyclone.m.material.opacity = 1; cyclone.m.visible = true;
        ring(d.x, d.y, d.z, 1, (v.radius || 3) * 2, R.dustLife, 0.15);
        throwFlakes(d.x, d.y + R.waist, d.z, 12, PALES, LINES, (i, n) => {   // flung off tangent to the spin
          const a = i / n * Math.PI * 2; return { x: Math.cos(a), z: -Math.sin(a), ox: Math.sin(a) * 0.9, oz: Math.cos(a) * 0.9 };
        });
        break;
      }
      case 'petals': {   // round the finished boss
        const h = e ? (e.height || 1.8) : 1.8;
        Object.assign(storm, { age: 0, x: d.x, y: d.y + h * 0.5, floor: d.y, z: d.z, radius: v.radius || 5, n: Math.max(8, Math.round(PETALS * density())) });
        pop(d.x, d.y + h * 0.5, d.z, R.burst, 0.3);
        break;
      }
      case 'ghostBlade': {
        const b = d.body;
        if (!d.strike) {   // armed: a glint for each echo (the holder's own, or the latest holder seen)
          if (!b || (glints.body && glints.body !== b && b !== Game.player && glints.left > 0)) return;
          glints.body = b; glints.left = Math.min(glints.list.length, v.hits || 3); glints.until = hist.clock + CONFIG.abilities.echo.keep;
          const at = handOf(b); pop(at.x, at.y, at.z, 0.45, 0.18);
          return;
        }
        if (b === glints.body) glints.left = Math.max(0, glints.left - 1);
        if (b && b.rig && b.rig.weapon) { ghost.age = 0; ghost.body = b; }   // the copy replays the swing
        if (!e) return;
        const sl = oldest(slashes), at = flank(e, d.body ? d.body.x : d.x, d.body ? d.body.z : d.z, 0.55);
        sl.age = 0; sl.s.position.set(at.x, at.y, at.z); sl.s.material.rotation = (d.strike % 2 ? 0.6 : -0.6) + (rnd() - 0.5) * 0.4;
        sl.s.scale.set(2.2, 0.3, 1); sl.s.material.opacity = 1; sl.s.visible = true;
        throwFlakes(at.x, at.y, at.z, 6, PALES, FALL);
        break;
      }
      case 'hound': case 'guardian': case 'lancer': case 'fox': case 'lantern': case 'crows': case 'archer': case 'hawk':
      case 'ronin': case 'serpent': case 'puppet': case 'bear': case 'mantis':   // Hunting Call: its holder's own summon marked the boss
        if (d.mark && d.strike && e && d.body === Game.player) {
          mark.age = 0; mark.e = e; mark.keep = CONFIG.abilities.mark.keep; mark.s.material.opacity = 1; mark.s.visible = true;
        }
        break;
    }
  }
  function perk(d) {
    const b = d.body;
    if (!b || b !== Game.player) return;
    if (d.perk === 'flask/unshaken') { shell.age = 0; shell.s.material.opacity = 1; shell.s.visible = true; ring(b.x, b.y, b.z, 0.4, 1.6, 0.3); }
    else if (d.perk === 'unshaken/glance') {   // the blow glances off where it came from
      const at = d.at ? flank(b, d.at.x, d.at.z, 0.6) : flank(b, b.x + 1, b.z, 0.6);
      pop(at.x, at.y, at.z, 0.7, 0.18);
      throwFlakes(at.x, at.y, at.z, 12, BLUES, FALL);
    }
  }
  // Overcharge's release: four hard arcs ring where the technique starts (its enemy's chest, else its holder's), sized by the share.
  function release(b, e, over) {
    if (!(over > 0)) return;
    const at = e || b;
    if (!at) return;
    const q = bursts.find(x => x.age === Infinity) || bursts[0], h = (at.height || 1.8) * 0.55;
    q.age = 0; q.x = at.x; q.y = at.y + h; q.z = at.z; q.size = 0.6 + 0.9 * over;
    for (const s of q.list) { s.visible = true; s.material.opacity = 1; }
    throwFlakes(q.x, q.y, q.z, 12, BLUES, LINES);
  }
  function pressed(d) { if (d.body === Game.player && d.over > 0) release(d.body, null, d.over); }   // the holder's own, at once
  function strike(d) {   // Hunting Call: the holder's blow on the marked boss bursts the mark
    if (mark.age === Infinity || d.blocked || d.attacker !== Game.player || d.target !== mark.e || (d.strike && d.strike.power)) return;
    const b = Game.player, at = flank(mark.e, b.x, b.z, 0.6);
    pop(at.x, at.y, at.z, 0.9, 0.22);
    throwFlakes(at.x, at.y, at.z, 10, BLUES, FALL);
    mark.age = Infinity; mark.e = null; mark.s.visible = false;
  }

  // ---- Drawing -----------------------------------------------------------------------------------------------------------
  function render(game) {
    if (!made) return;
    const real = effectSlots.real(), R = K(), calm = reducedMotion();
    if (crest.age !== Infinity) {   // stands up, runs to its reach growing 1.3x, breaks into foam
      const was = crest.age; crest.age += real;
      const run = clamp01((crest.age - 0.05) / 0.35), ease = 1 - (1 - run) * (1 - run), out = clamp01((crest.age - 0.4) / 0.3);
      if (crest.age > 0.7) { crest.age = Infinity; crest.m.visible = false; }
      else {
        const dist = 0.6 + (crest.reach - 0.6) * ease, x = crest.x + crest.ux * dist, z = crest.z + crest.uz * dist;
        const rise = Math.min(1, crest.age / 0.06), grow = 1 + 0.3 * ease;
        crest.m.position.set(x, crest.y, z); crest.m.scale.set(crest.width * 2 * grow, crest.tall * rise * (1 - 0.8 * out), 1); crest.m.material.opacity = 1 - out * out;
        for (const t of SPRAY_AT) if (was < t && crest.age >= t)   // spray off its base as it runs
          throwFlakes(x, crest.y + 0.2, z, 6, FOAM, SPRAY, (i, n) => { const s = i / n - 0.5; return { x: crest.ux, z: crest.uz, ox: -crest.uz * s * crest.width * 2, oz: crest.ux * s * crest.width * 2 }; });
        if (was < 0.4 && crest.age >= 0.4) ring(x, crest.y, z, crest.width, crest.width * 2.6, 0.35);
      }
    }
    if (moon.age !== Infinity) {   // forms 0.1 s over the landing, falls through the line ahead in 0.12 s, fades
      moon.age += real;
      if (moon.age > 0.4) { moon.age = Infinity; moon.s.visible = false; }
      else {
        const form = Math.min(1, moon.age / 0.1), fall = clamp01((moon.age - 0.1) / 0.12), out = clamp01((moon.age - 0.25) / 0.15), C = CONFIG.abilities.crescent;
        const ahead = 0.4 + fall * C.reach * 0.6, y = moon.y + R.moonLift * (1 - fall);
        moon.s.position.set(moon.x + moon.ux * ahead, y, moon.z + moon.uz * ahead);
        moon.s.scale.set(R.moon * 0.5 * form, R.moon * form, 1); moon.s.material.rotation = calm ? 0 : -0.5 * fall; moon.s.material.opacity = 1 - out;
      }
    }
    if (cut.age !== Infinity) {   // the floor cut runs out with the fall, holds, fades
      cut.age += real;
      if (cut.age > 0.5) { cut.age = Infinity; cut.m.visible = false; }
      else {
        const draw = clamp01((cut.age - 0.08) / 0.12);
        cut.m.scale.z = Math.max(0.01, cut.reach * draw); cut.m.visible = draw > 0; cut.m.material.opacity = 1 - clamp01((cut.age - 0.25) / 0.25);
      }
    }
    if (cyclone.age !== Infinity) {   // whips round once, out to its radius, its blades thinning
      cyclone.age += real;
      if (cyclone.age > 0.55) { cyclone.age = Infinity; cyclone.m.visible = false; }
      else {
        const k = clamp01(cyclone.age / 0.35), ease = 1 - (1 - k) * (1 - k), out = clamp01((cyclone.age - 0.3) / 0.25), s = 1.2 + (cyclone.radius * 2 - 1.2) * ease;
        cyclone.m.position.set(cyclone.x, cyclone.y + R.waist, cyclone.z); cyclone.m.scale.set(s, 1, s);
        cyclone.m.rotation.set(0, cyclone.spin - (calm ? 0.5 : 1) * Math.PI * 2 * ease, 0); cyclone.m.material.opacity = 1 - out;
      }
    }
    if (storm.age !== Infinity) {   // two arms whirl out from the boss to its radius, then the petals settle on the floor
      storm.age += real;
      const done = storm.age > 1.2;
      for (let i = 0; i < storm.petals.length; i++) {
        const q = storm.petals[i];
        if (done || i >= storm.n) { q.s.visible = false; continue; }
        const t = Math.max(0, storm.age - q.lag), k = clamp01(t / 0.85), ease = 1 - (1 - k) * (1 - k) * (1 - k);
        const r = storm.radius * q.r * (0.12 + 0.88 * ease), a = q.a + (calm ? 0.5 : 1) * (R.whirl * ease + k * 1.5);
        const settle = clamp01((storm.age - 0.7) / 0.5), y = lerp(storm.y + (q.h - 0.5) * 1.2, storm.floor + 0.05, settle);
        q.s.position.set(storm.x + Math.sin(a) * r, y, storm.z + Math.cos(a) * r);
        q.s.scale.setScalar(R.petal * Math.min(1, t / 0.05)); q.s.material.rotation = (calm ? 0 : storm.age * q.spin) + a;
        q.s.material.opacity = 1 - settle * settle; q.s.visible = t > 0;
      }
      if (done) storm.age = Infinity;
    }
    const p = game && game.player, live = !!(p && p.alive && p.alive() && game.mode === 'play');
    if (shell.age !== Infinity) {   // plates ripple out over 0.3 s, then a faint shell while Ironclad holds
      shell.age += real;
      const left = live && p.perk ? p.perk.unshaken : 0;
      if (!live || (shell.age > 0.3 && left <= 0)) { shell.age = Infinity; shell.s.visible = false; }
      else {
        const k = Math.min(1, shell.age / 0.3), hold = shell.age < 0.3 ? 1 - 0.6 * k : 0.4 * Math.min(1, left / 0.5);
        shell.s.position.set(p.x, p.y + (p.height || 1.8) * 0.55, p.z); shell.s.scale.setScalar(R.shell * (0.4 + 0.6 * k)); shell.s.material.opacity = hold;
      }
    }
    // Echoing Blade: the holder's sword pivot each frame, for the ghost to replay
    hist.clock += real;
    const gb = ghost.body || glints.body, gw = gb && gb.rig && gb.rig.weapon;
    if (gb !== hist.body) { hist.t.fill(-1); hist.body = gb; }   // one history, of one body: never replay another's sword
    if (gw) { gw.updateWorldMatrix(true, false); hist.m[hist.i].copy(gw.matrixWorld); hist.t[hist.i] = hist.clock; hist.i = (hist.i + 1) % HIST; }
    if (ghost.age !== Infinity) {   // the copy, a beat behind the real swing, fading over 0.3 s
      ghost.age += real;
      const m = ghost.age < 0.3 && pastPivot(CONFIG.abilities.echo.delay);
      if (!m) { ghost.age = Infinity; ghost.g.visible = false; ghost.body = null; }
      else { m.decompose(ghost.g.position, pivotQ, pivotS); ghost.g.quaternion.copy(pivotQ); ghost.m.opacity = 0.75 * (1 - clamp01((ghost.age - 0.12) / 0.18)); ghost.g.visible = true; }
    }
    for (const sl of slashes) {
      if (sl.age === Infinity) continue;
      sl.age += real;
      if (sl.age > sl.life) { sl.age = Infinity; sl.s.visible = false; continue; }
      const k = Math.min(1, sl.age / 0.05); sl.s.scale.set(2.2 * k, 0.3 * (1 - 0.5 * clamp01(sl.age / sl.life)), 1); sl.s.material.opacity = 1 - clamp01((sl.age - 0.15) / 0.15);
    }
    {   // the glints orbit the sword hand while echoes are armed; a spent one fades out
      const b = glints.body, on = b && (!b.alive || b.alive()) && game && game.mode === 'play';
      if (!on || hist.clock > glints.until) glints.left = 0;   // gone with its holder, or unspent past their time
      const at = on ? handOf(b) : null, t = hist.clock;
      let lit = false;
      for (let i = 0; i < glints.list.length; i++) {
        const q = glints.list[i], want = i < glints.left ? 1 : 0;
        q.fade = want ? Math.min(1, q.fade + real * 8) : Math.max(0, q.fade - real * 5);
        if (q.fade > 0) lit = true;
        if (!at || q.fade <= 0) { q.s.visible = false; continue; }
        const a = (calm ? 0 : t * 4) + i * Math.PI * 2 / Math.max(1, glints.list.length), r = 0.32;
        q.s.position.set(at.x + Math.sin(a) * r, at.y + 0.08 * Math.sin(a * 2), at.z + Math.cos(a) * r);
        q.s.scale.setScalar(0.22 * q.fade); q.s.material.opacity = q.fade; q.s.visible = true;
      }
      if (!glints.left && !lit) glints.body = null;
    }
    {   // Overcharge: arcs crawl round the sword hand, one for each third of the fullest key's overcharge
      let over = 0;
      if (live && p.kit && p.kit.perks['ready/overcharge']) for (const key in p.kit.pressed) over = Math.max(over, abilityOver(p.kit, p.perk, key));
      const n = over > 0 ? Math.min(sparks.list.length, 1 + Math.floor(over * sparks.list.length * 0.999)) : 0, at = n ? handOf(p) : null;
      sparks.k += real;
      for (let i = 0; i < sparks.list.length; i++) {
        const s = sparks.list[i];
        if (i >= n) { s.visible = false; continue; }
        const a = (calm ? i * 2.1 : sparks.k * (5 + i) + i * 2.1), flick = calm ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(sparks.k * 23 + i * 5));
        s.position.set(at.x + Math.sin(a) * 0.22, at.y + Math.cos(a * 1.3) * 0.15, at.z + Math.cos(a) * 0.22);
        s.scale.setScalar(0.3 + 0.15 * over); s.material.rotation = calm ? i : a * 2; s.material.opacity = flick; s.visible = true;
      }
    }
    for (const q of bursts) {   // the release: four arcs spread round its start and gone at 0.4 s
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > 0.4) { q.age = Infinity; for (const s of q.list) s.visible = false; continue; }
      const k = 1 - (1 - Math.min(1, q.age / 0.15)) ** 2, out = clamp01((q.age - 0.2) / 0.2);
      for (let i = 0; i < 4; i++) {
        const s = q.list[i], a = i * Math.PI / 2 + Math.PI / 4 + (calm ? 0 : q.age * 2), r = q.size * (0.4 + 0.6 * k);
        s.position.set(q.x + Math.sin(a) * r, q.y + Math.cos(a) * r * 0.6, q.z + Math.cos(a) * r * 0.3);
        s.scale.setScalar(q.size * 0.7); s.material.rotation = a; s.material.opacity = 1 - out;
      }
    }
    if (mark.age !== Infinity) {   // stamped, then a slow pulse until it is spent or its time is up
      mark.age += real;
      const e = mark.e;
      if (!e || !e.alive() || mark.age > mark.keep || !p) { mark.age = Infinity; mark.e = null; mark.s.visible = false; }
      else {
        const stamp = Math.min(1, mark.age / 0.15), pulse = calm ? 1 : 1 + 0.12 * Math.sin(mark.age * Math.PI * 2);
        mark.s.position.set(e.x, e.y + (e.height || 1.8) + R.mark * 0.9 + 0.25 * (1 - stamp), e.z); mark.s.scale.setScalar(R.mark * (1.6 - 0.6 * stamp) * pulse); mark.s.material.opacity = 0.5 + 0.5 * stamp;
      }
    }
    for (const q of pops) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.s.visible = false; continue; }
      const k = Math.min(1, q.age / 0.04), out = clamp01((q.age - q.life * 0.5) / (q.life * 0.5));
      q.s.scale.setScalar(q.size * (0.5 + 0.5 * k)); q.s.material.opacity = 1 - out; q.s.material.rotation = calm ? 0 : q.age * 1.5;
    }
    for (const r of rings) {
      if (r.age === Infinity) continue;
      r.age += real;
      if (r.age < 0) continue;
      r.m.visible = true;
      if (r.age > r.life) { r.age = Infinity; r.m.visible = false; continue; }
      const q = r.age / r.life, s = lerp(r.from, r.to, 1 - (1 - q) * (1 - q));
      r.m.scale.set(s, 1, s); r.m.material.opacity = 1 - q * q;
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
    for (const q of [...pops, ...flakes]) { q.age = Infinity; q.s.visible = false; }
    for (const r of rings) { r.age = Infinity; r.m.visible = false; }
    for (const q of [crest, cut, cyclone]) { q.age = Infinity; q.m.visible = false; }
    for (const q of [moon, shell, mark]) { q.age = Infinity; q.s.visible = false; }
    for (const q of storm.petals) q.s.visible = false;
    storm.age = Infinity; mark.e = null;
    ghost.age = Infinity; ghost.g.visible = false; ghost.body = null; hist.t.fill(-1); hist.body = null;
    for (const q of slashes) { q.age = Infinity; q.s.visible = false; }
    glints.left = 0; glints.body = null; for (const q of glints.list) { q.fade = 0; q.s.visible = false; }
    for (const s of sparks.list) s.visible = false;
    for (const q of bursts) { q.age = Infinity; for (const s of q.list) s.visible = false; }
  }
  const THENS = new Set(['wave', 'crescent', 'cyclone', 'petals', 'hound', 'guardian', 'lancer', 'fox', 'lantern', 'crows', 'archer', 'hawk', 'ronin', 'serpent', 'puppet', 'bear', 'mantis', 'ghostBlade']);
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.clear.push(clear);
      events.on('abilityPower', d => {
        if (THENS.has(d.then) && !d.draw) power(d);
        if (d.over > 0 && !d.strike && d.body !== Game.player) release(d.body, d.enemy, d.over);   // another's overcharged press (the holder's own: abilityPress)
      });
      events.on('abilityPress', pressed);
      events.on('abilityPerk', perk);
      events.on('strike', strike);
    },
    clear,
    // tests: what shows now
    get state() {
      if (!made) return {};
      return { crest: crest.age !== Infinity, moon: moon.age !== Infinity, cut: cut.age !== Infinity, cyclone: cyclone.age !== Infinity,
        petals: storm.age === Infinity ? 0 : storm.petals.filter(q => q.s.visible).length, shell: shell.age !== Infinity, mark: mark.age !== Infinity,
        pops: pops.filter(q => q.age !== Infinity).length, rings: rings.filter(r => r.age !== Infinity).length, flakes: flakes.filter(f => f.age !== Infinity).length,
        ghost: ghost.age !== Infinity, slashes: slashes.filter(q => q.age !== Infinity).length, glints: glints.list.filter(q => q.s.visible).length,
        arcs: sparks.list.filter(s => s.visible).length, release: bursts.some(q => q.age !== Infinity) };
    },
  };
})();
