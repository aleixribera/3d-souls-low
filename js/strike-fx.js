'use strict';
// ============================================================================
// Strike I, shapes on the ground (design/abilities BUILD-ORDER batch 6): the key-1 strikes drawn, drawing only
// ============================================================================
// In the cel look and the rares' blue ink (STYLE.md), like js/rare-strike-fx.js: flat hard-edged shapes in two or three
// tones with a dark ink outline, few big sharp particles, no light. A press's power (`abilityPower` with `v.charge`)
// is drawn here; the same power fired another way (Counterflame's flare, Gale Crescent's gale) keeps its own look.
// Every mesh and sprite is pooled and made at load; each ages in real time from the press. Tuning: VIS.abilityFx.strike.
// A shape that stands over a boss in its wind-up is drawn at half strength (a tell is never hidden). Sounds: js/audio.js.
//   Fire Burst   six flame petals rise round the boss's feet and fold shut over it in a burst of embers; a scorch ring.
//   Wind Blade   a slash off the blade throws a flat pale crescent that flies the line, tearing dust; a cut on each it passes.
//   Tidal Arc    a wide sweep (Riptide's crest, taller, is js/rare-strike-fx.js's); a foam sheet where the wave breaks.
//   Frost Spike  a frost ring at the stab, then seven ice spikes erupting in turn along the line, each taller, shards.
//   Stone Fist   dust at the punch, glowing cracks running to the boss's spot, a stone fist punching up there; rubble.
//   Rising Fang  a low-to-high slash, a line of blue fire running to the spot, a tall fang of flame erupting; embers.
//   Thunderclap  a white star at the hand, a short cone of air and four sound arcs spreading out in the cone; dust.
const strikeFx = (() => {
  const K = () => VIS.abilityFx.strike;
  const INK = '#0e1218', BLUE = '#8fb8dc', CORE = '#f2f6fa', PALE = '#cfe2f2', DEEP = '#2c5f8a', EMBER = '#c8642a';
  const C_BLUE = 0x8fb8dc, C_CORE = 0xf2f6fa, C_PALE = 0xcfe2f2, C_INK = 0x0e1218, C_EMBER = 0xc8642a, C_DUST = 0x6e6a62, C_STONE = 0x8e897e;
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rnd = (() => { let s = 131; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const inked = (g, path, fill, edge, ink = 7, rim = 2.5) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    path(); g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill();
    if (edge) { path(); g.lineWidth = rim; g.strokeStyle = edge; g.stroke(); }
  };
  // The cone's sector on its canvas: origin bottom centre, `ARC_H` px to its far edge, CONFIG.abilities.clap.angle wide.
  const ARC_W = 300, ARC_H = 250;
  let PETAL, BURST, SCORCH, CRESCENT, SWEEP, FOAM, SPIKE, FROST, CRACKS, FIST, RUN, FANG, ARC, CONE, STAR, FLAKE;
  function textures() {
    PETAL = canvasTex(64, 160, (g, w, h) => {   // a pointed flame petal: ember inside, blue edge, a white tip, dark inner lines
      const path = () => { g.beginPath(); g.moveTo(w * 0.5, 6); g.bezierCurveTo(w * 0.95, h * 0.35, w * 0.9, h * 0.8, w * 0.5, h - 4);
        g.bezierCurveTo(w * 0.1, h * 0.8, w * 0.05, h * 0.35, w * 0.5, 6); g.closePath(); };
      inked(g, path, EMBER, BLUE, 8, 5);
      g.fillStyle = CORE; g.beginPath(); g.moveTo(w * 0.5, 10); g.quadraticCurveTo(w * 0.7, h * 0.22, w * 0.5, h * 0.34); g.quadraticCurveTo(w * 0.3, h * 0.22, w * 0.5, 10); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(w * 0.5, h * 0.45); g.quadraticCurveTo(w * 0.6, h * 0.68, w * 0.5, h * 0.9); g.stroke();
    });
    BURST = canvasTex(128, 128, (g, w) => {   // a hard eight-point burst: ink, blue points, an ember ring, a white core
      const m = w / 2;
      inked(g, () => { g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? m * 0.36 : m * 0.92; const x = m + Math.cos(a) * r, y = m + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); }, BLUE, CORE, 8, 2);
      g.beginPath(); g.arc(m, m, w * 0.24, 0, Math.PI * 2); g.fillStyle = EMBER; g.fill();
      g.beginPath(); g.arc(m, m, w * 0.14, 0, Math.PI * 2); g.fillStyle = CORE; g.fill();
    });
    SCORCH = canvasTex(128, 128, (g, w) => {   // a flat scorched ring, its edge ragged
      const m = w / 2;
      g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = m * (0.86 + 0.1 * Math.sin(i * 2.7)); const x = m + Math.cos(a) * r, y = m + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath(); g.fillStyle = '#2c3a48'; g.fill();
      g.beginPath(); g.arc(m, m, m * 0.5, 0, Math.PI * 2); g.fillStyle = '#1a222c'; g.fill();
    });
    CRESCENT = canvasTex(256, 96, (g, w, h) => {   // a wide flat crescent bowed forward, its horns up: pale face, blue edge, white streaks
      const path = () => { g.beginPath(); g.moveTo(6, 8); g.quadraticCurveTo(w * 0.5, h * 1.45, w - 6, 8); g.quadraticCurveTo(w * 0.5, h * 0.75, 6, 8); g.closePath(); };
      inked(g, path, PALE, BLUE, 8, 4);
      g.strokeStyle = CORE; g.lineWidth = 3;
      for (const k of [0.3, 0.5, 0.7]) { g.beginPath(); g.moveTo(w * (k - 0.12), h * (0.52 + Math.abs(k - 0.5) * 0.2)); g.lineTo(w * (k + 0.06), h * (0.6 + Math.abs(k - 0.5) * 0.1)); g.stroke(); }
    });
    SWEEP = canvasTex(256, 128, (g, w, h) => {   // a slash arc, its ends tapering: ink, blue edge, white core
      const band = (r0, r1, c) => { g.beginPath(); g.arc(w / 2, h * 1.6, h * r1, Math.PI * 1.18, Math.PI * 1.82); g.arc(w / 2, h * 1.6, h * r0, Math.PI * 1.82, Math.PI * 1.18, true); g.closePath(); g.fillStyle = c; g.fill(); };
      band(1.2, 1.5, INK); band(1.25, 1.46, BLUE); band(1.31, 1.4, CORE);
    });
    FOAM = canvasTex(256, 256, (g, w) => {   // a flat sheet of foam breaking into rings
      const m = w / 2;
      g.beginPath(); g.arc(m, m, m * 0.62, 0, Math.PI * 2); g.fillStyle = 'rgba(143,184,220,0.45)'; g.fill();
      for (const [r, th, c] of [[0.86, 14, INK], [0.86, 8, BLUE], [0.86, 3, CORE], [0.62, 6, PALE], [0.38, 4, CORE]]) { g.beginPath(); g.arc(m, m, m * r, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
    });
    SPIKE = canvasTex(64, 192, (g, w, h) => {   // a jagged ice crystal on its base: two faceted tones, a white core line, ink
      const path = () => { g.beginPath(); g.moveTo(w * 0.12, h - 2); g.lineTo(w * 0.3, h * 0.4); g.lineTo(w * 0.52, 6); g.lineTo(w * 0.7, h * 0.34); g.lineTo(w * 0.9, h - 2); g.closePath(); };
      inked(g, path, PALE, BLUE, 7, 3);
      g.fillStyle = BLUE; g.beginPath(); g.moveTo(w * 0.52, 10); g.lineTo(w * 0.7, h * 0.34); g.lineTo(w * 0.88, h - 4); g.lineTo(w * 0.52, h - 4); g.closePath(); g.fill();
      g.strokeStyle = CORE; g.lineWidth = 2.5; g.beginPath(); g.moveTo(w * 0.5, h * 0.12); g.lineTo(w * 0.42, h * 0.8); g.stroke();
    });
    FROST = canvasTex(128, 128, (g, w) => {   // a ring of frost cracking out: pale, blue edge, short cracks
      const m = w / 2;
      for (const [th, c] of [[12, INK], [7, BLUE], [3, PALE]]) { g.beginPath(); g.arc(m, m, m * 0.7, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
      g.strokeStyle = PALE; g.lineWidth = 3;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; g.beginPath(); g.moveTo(m + Math.cos(a) * m * 0.72, m + Math.sin(a) * m * 0.72); g.lineTo(m + Math.cos(a + 0.1) * m * 0.95, m + Math.sin(a + 0.1) * m * 0.95); g.stroke(); }
    });
    CRACKS = canvasTex(256, 256, (g, w) => {   // cracks starring out from a centre, glowing blue from inside, ink
      const m = w / 2;
      const lines = [];
      for (let i = 0; i < 9; i++) {
        let a = i * Math.PI * 2 / 9 + rnd() * 0.3, x = m, y = m; const pts = [[x, y]];
        for (let s = 0; s < 4; s++) { a += (rnd() - 0.5) * 0.8; const l = m * (0.16 + rnd() * 0.1); x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); }
        lines.push(pts);
      }
      for (const [lw, c] of [[10, INK], [5, BLUE], [2, CORE]]) {
        g.lineWidth = lw; g.strokeStyle = c; g.lineJoin = 'miter'; g.lineCap = 'round';
        for (const pts of lines) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
      }
    });
    FIST = canvasTex(128, 192, (g, w, h) => {   // a rough stone fist punching up: a forearm, four knuckles, blue light in its cracks
      const arm = () => { g.beginPath(); g.moveTo(w * 0.3, h - 2); g.lineTo(w * 0.26, h * 0.5); g.lineTo(w * 0.74, h * 0.5); g.lineTo(w * 0.7, h - 2); g.closePath(); };
      inked(g, arm, '#5a5650', null, 8);
      const fist = () => { g.beginPath(); g.moveTo(w * 0.14, h * 0.56); g.lineTo(w * 0.1, h * 0.2); g.quadraticCurveTo(w * 0.12, h * 0.06, w * 0.3, h * 0.06); g.lineTo(w * 0.78, h * 0.06);
        g.quadraticCurveTo(w * 0.92, h * 0.08, w * 0.9, h * 0.24); g.lineTo(w * 0.86, h * 0.56); g.closePath(); };
      inked(g, fist, '#8e897e', null, 8);
      g.fillStyle = '#5a5650'; g.fillRect(w * 0.16, h * 0.34, w * 0.68, h * 0.2);   // the shadowed fingers' underside
      g.strokeStyle = INK; g.lineWidth = 4;
      for (const k of [0.32, 0.5, 0.68]) { g.beginPath(); g.moveTo(w * k, h * 0.07); g.lineTo(w * k, h * 0.34); g.stroke(); }
      g.beginPath(); g.moveTo(w * 0.12, h * 0.34); g.lineTo(w * 0.88, h * 0.34); g.stroke();
      g.strokeStyle = BLUE; g.lineWidth = 3;   // the glowing cracks
      for (const pts of [[[0.4, 0.62], [0.46, 0.72], [0.4, 0.84]], [[0.6, 0.58], [0.56, 0.7], [0.64, 0.8]], [[0.22, 0.14], [0.27, 0.24]]]) {
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(w * x, h * y) : g.moveTo(w * x, h * y))); g.stroke();
      }
    });
    RUN = canvasTex(64, 256, (g, w, h) => {   // a glowing line along the strip (its length down the canvas), its ends tapering
      for (let y = 0; y < h; y++) {
        const k = Math.min(1, y / (h * 0.1), (h - y) / (h * 0.1)), m = w / 2;
        for (const [half, c] of [[0.4, INK], [0.28, BLUE], [0.1, CORE]]) { g.fillStyle = c; const s = w * half * k; g.fillRect(m - s, y, s * 2, 1); }
      }
    });
    FANG = canvasTex(96, 256, (g, w, h) => {   // a tall curved fang of flame: white core, blue edge, deep inner lines, ink
      const path = () => { g.beginPath(); g.moveTo(w * 0.18, h - 2); g.bezierCurveTo(w * 0.1, h * 0.55, w * 0.4, h * 0.2, w * 0.78, 4);
        g.bezierCurveTo(w * 0.7, h * 0.3, w * 0.85, h * 0.6, w * 0.84, h - 2); g.closePath(); };
      inked(g, path, BLUE, null, 8);
      g.fillStyle = CORE; g.beginPath(); g.moveTo(w * 0.34, h - 6); g.bezierCurveTo(w * 0.3, h * 0.6, w * 0.5, h * 0.3, w * 0.74, h * 0.06); g.bezierCurveTo(w * 0.62, h * 0.35, w * 0.7, h * 0.65, w * 0.68, h - 6); g.closePath(); g.fill();
      g.strokeStyle = DEEP; g.lineWidth = 3;
      for (const k of [0.42, 0.56]) { g.beginPath(); g.moveTo(w * k, h * 0.92); g.quadraticCurveTo(w * (k + 0.02), h * 0.6, w * (k + 0.14), h * 0.36); g.stroke(); }
    });
    const sector = (g, r0, r1) => {
      const half = CONFIG.abilities.clap.angle * Math.PI / 360, ox = ARC_W / 2, oy = ARC_H, up = -Math.PI / 2;
      g.beginPath(); g.arc(ox, oy, ARC_H * r1, up - half, up + half); if (r0 > 0) g.arc(ox, oy, ARC_H * r0, up + half, up - half, true); else g.lineTo(ox, oy); g.closePath();
    };
    ARC = canvasTex(ARC_W, ARC_H, g => {   // a hard sound arc at the cone's far edge: ink, blue edge, pale face
      for (const [r0, r1, c] of [[0.84, 0.97, INK], [0.86, 0.95, BLUE], [0.885, 0.925, PALE]]) { sector(g, r0, r1); g.fillStyle = c; g.fill(); }
    });
    CONE = canvasTex(ARC_W, ARC_H, g => { sector(g, 0, 0.97); g.fillStyle = 'rgba(242,246,250,0.5)'; g.fill(); });   // the shock of air
    STAR = canvasTex(128, 128, (g, w) => {   // a flat white star, an ink edge
      const m = w / 2;
      inked(g, () => { g.beginPath(); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = i % 2 ? m * 0.22 : m * 0.92; const x = m + Math.cos(a) * r, y = m + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); }, CORE, PALE, 6, 2);
    });
    FLAKE = canvasTex(32, 32, (g, w, h) => {   // a hard shard (tinted per use)
      g.beginPath(); g.moveTo(w * 0.1, h * 0.55); g.lineTo(w * 0.5, h * 0.1); g.lineTo(w * 0.9, h * 0.4); g.lineTo(w * 0.45, h * 0.9); g.closePath(); g.fillStyle = '#fff'; g.fill();
    });
  }
  const mat = (map, opts = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, ...opts });
  const sprite = (map, order = 13, cx = 0.5, cy = 0.5) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false }));
    s.center.set(cx, cy); s.visible = false; s.renderOrder = order; scene.add(s); pooledFx.push(s); return s;
  };
  const mesh = (geo, material, order = 12) => {
    const m = new THREE.Mesh(geo, material); m.visible = false; m.renderOrder = order; m.frustumCulled = false; scene.add(m); pooledFx.push(m); return m;
  };
  const hide = o => { o.visible = false; };

  // ---- Pools: two of each shape (two people may press at once), one shared set of flakes --------------------------------
  const SPIKES = 7, FLAKES = 64;
  let made = false;
  const lotuses = [], crescents = [], sweeps = [], foams = [], scorches = [], frosts = [], lines = [], fists = [], fangs = [], claps = [], stars = [], flakes = [];
  function make() {
    if (made) return;
    made = true; textures();
    const floor = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const strip = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);   // from its start along +z
    const petalGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), petalMat = mat(PETAL);
    const sectorGeo = new THREE.PlaneGeometry(ARC_W / ARC_H, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);   // its far edge along -z
    for (let n = 0; n < 2; n++) {
      const g = new THREE.Group(), petals = [];
      for (let i = 0; i < 6; i++) {   // each petal on its own pivot at the ring, facing out, folding in about the ring's tangent
        const pivot = new THREE.Group(), m = new THREE.Mesh(petalGeo, petalMat);
        m.renderOrder = 13; m.frustumCulled = false; pivot.add(m); g.add(pivot); petals.push({ pivot, m });
      }
      g.visible = false; scene.add(g); g.userData.warmUp = true;
      lotuses.push({ g, petals, mat: petalMat, age: Infinity, e: null, x: 0, y: 0, z: 0, r: 1, h: 2.4, burst: sprite(BURST, 14), done: false });
      crescents.push({ m: mesh(new THREE.PlaneGeometry(1, 1), mat(CRESCENT), 13), age: Infinity, x: 0, y: 0, z: 0, ux: 0, uz: 1, reach: 12, life: 0.4, cut: null, dust: 0 });
      foams.push({ m: mesh(floor, mat(FOAM), 3), age: Infinity, size: 1 });
      frosts.push({ m: mesh(floor, mat(FROST), 3), age: Infinity, spikes: Array.from({ length: SPIKES }, () => ({ s: sprite(SPIKE, 13, 0.5, 0), x: 0, z: 0, at: 0, h: 1, up: false })),
        y: 0, sinkAt: 0, e: null });
      lines.push({ m: mesh(strip, mat(RUN), 4), age: Infinity, len: 1, life: 0.3, color: C_BLUE });
      fists.push({ s: sprite(FIST, 13, 0.5, 0), cracks: mesh(floor, mat(CRACKS), 3), age: Infinity, x: 0, y: 0, z: 0, e: null, rose: false });
      fangs.push({ s: sprite(FANG, 13, 0.5, 0), age: Infinity, x: 0, y: 0, z: 0, e: null, embered: false });
      claps.push({ arcs: Array.from({ length: 4 }, () => mesh(sectorGeo, mat(ARC), 12)), cone: mesh(sectorGeo, mat(CONE), 11), age: Infinity, x: 0, y: 0, z: 0, yaw: 0, reach: 7 });
    }
    for (let i = 0; i < 4; i++) scorches.push({ m: mesh(floor, mat(SCORCH, { opacity: 0 }), 2), age: Infinity, wait: 0, life: 0.6 });
    for (let i = 0; i < 3; i++) sweeps.push({ s: sprite(SWEEP, 14), age: Infinity, life: 0.2 });
    for (let i = 0; i < 6; i++) { const s = sprite(STAR, 15); s.material.depthTest = false; stars.push({ s, age: Infinity, life: 0.2, size: 1, tint: C_CORE }); }
    for (let i = 0; i < FLAKES; i++) flakes.push({ s: sprite(FLAKE, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, grav: 0, wait: 0 });
  }
  const density = () => (CONFIG.VISUALS.fxBudgets[visuals.quality().fxBudget] || { density: 1 }).density;
  const free = list => list.find(q => q.age === Infinity) || list.reduce((a, b) => (b.age > a.age ? b : a));
  // `n` flakes (by the effects budget) from (x, y, z), `wait` s from now: each flies off at `speed` m/s along `dir(i)`
  // (else any way round), `up` m/s up, falling at `grav`, gone at about `life` s.
  function throwFlakes(x, y, z, n, colors, o, dir = null, wait = 0) {
    const many = Math.max(1, Math.round(n * density()));
    for (let i = 0; i < many; i++) {
      const f = free(flakes), a = rnd() * Math.PI * 2, sp = o.speed * (0.6 + rnd() * 0.6);
      const d = dir && dir(i, many), dx = d ? d.x : Math.cos(a), dz = d ? d.z : Math.sin(a);
      f.age = 0; f.wait = wait; f.life = o.life * (0.75 + rnd() * 0.5); f.x = x + (d && d.ox || 0); f.y = y + (d && d.oy || 0); f.z = z + (d && d.oz || 0);
      f.vx = dx * sp; f.vz = dz * sp; f.vy = (o.up || 0) * (0.5 + rnd()); f.spin = (rnd() - 0.5) * 12; f.grav = o.grav;
      f.s.material.color.setHex(colors[i % colors.length]); f.s.material.opacity = 1; f.s.material.rotation = rnd() * 6.3;
      f.s.position.set(f.x, f.y, f.z); f.s.scale.setScalar(o.size * (0.7 + rnd() * 0.6)); f.s.visible = wait <= 0;
    }
  }
  const EMBERS = [C_PALE, C_EMBER, C_CORE], ICE = [C_CORE, C_PALE, C_BLUE], STONE = [C_DUST, C_STONE, C_INK], DUST = [C_DUST, C_PALE], BLUES = [C_PALE, C_BLUE];
  const UP = { speed: 2.4, up: 5, grav: 9, size: 0.14, life: 0.55 }, SHARDS = { speed: 1.6, up: 4, grav: 12, size: 0.13, life: 0.45 };
  const RUBBLE = { speed: 3.2, up: 6, grav: 14, size: 0.3, life: 0.6 }, GRIT = { speed: 3, up: 3, grav: 10, size: 0.1, life: 0.5 };
  const FLAT = { speed: 7, up: 0.4, grav: 2, size: 0.13, life: 0.45 }, FALLING = { speed: 0.8, up: 0.5, grav: 6, size: 0.12, life: 0.6 };
  function star(x, y, z, size, life, tint = C_CORE, rot = 0) {
    const q = free(stars); q.age = 0; q.life = life; q.size = size; q.tint = tint;
    q.s.material.color.setHex(tint); q.s.material.opacity = 1; q.s.material.rotation = rot; q.s.position.set(x, y, z); q.s.scale.setScalar(size * 0.5); q.s.visible = true;
  }
  function sweep(x, y, z, rot, size) {   // a slash arc off the blade, `rot` rad on screen
    const q = free(sweeps); q.age = 0; q.life = 0.2; q.s.position.set(x, y, z); q.s.material.rotation = rot; q.s.scale.set(size, size * 0.5, 1); q.s.material.opacity = 1; q.s.visible = true;
  }
  function scorch(x, y, z, size, wait, life) {
    const q = free(scorches); q.age = -wait; q.life = life; q.m.position.set(x, y + 0.03, z); q.m.scale.set(size, 1, size); q.m.material.opacity = 0; q.m.visible = false;
  }
  function runLine(fx, fy, fz, tx, tz, life, color) {   // a glowing line along the floor from (fx, fz) to (tx, tz), drawn out over `life`
    const q = free(lines), dx = tx - fx, dz = tz - fz;
    q.age = 0; q.life = life; q.len = Math.max(0.5, Math.hypot(dx, dz)); q.m.material.color.setHex(color);
    q.m.position.set(fx, fy + 0.04, fz); q.m.rotation.set(0, Math.atan2(dx, dz), 0); q.m.scale.set(0.5, 1, 0.01); q.m.material.opacity = 1; q.m.visible = true;
  }
  // Half strength over a boss in its wind-up: the effect never hides a tell (STYLE.md rule 9).
  const veil = e => (e && e.state === ES.WINDUP ? 0.5 : 1);
  const at = { x: 0, y: 0, z: 0 };
  function handOf(b, x, y, z, yaw) {   // in front of the holder at the chest: where a blade or a shield meets
    at.x = x + Math.sin(yaw) * 0.6; at.y = y + ((b && b.height) || 1.8) * 0.55; at.z = z + Math.cos(yaw) * 0.6; return at;
  }

  // ---- The cues: each from the press (t = 0) -----------------------------------------------------------------------------
  function power(d) {
    const R = K(), v = d.v || {}, e = d.enemy, b = d.body;
    const x = b ? b.x : d.x, y = b ? b.y : d.y, z = b ? b.z : d.z;
    const dx = e ? e.x - x : 0, dz = e ? e.z - z : 1, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, yaw = Math.atan2(ux, uz);
    switch (d.then) {
      case 'flare': {   // the lotus round the boss's feet
        if (!e) return;
        const q = free(lotuses);
        Object.assign(q, { age: 0, e, x: e.x, y: e.y, z: e.z, r: (e.radius || 0.8) + R.petalGap, h: R.petal, done: false });
        q.petals.forEach((p, i) => { const a = i * Math.PI / 3 + rnd() * 0.3; p.pivot.position.set(Math.sin(a) * q.r, 0, Math.cos(a) * q.r); p.pivot.rotation.set(0, a, 0, 'YXZ'); });
        q.g.position.set(q.x, q.y, q.z); q.g.visible = false; q.mat.opacity = 1;
        scorch(q.x, q.y, q.z, q.r * 2.6, 0.45, 0.45);
        break;
      }
      case 'gale': {   // the slash, then the crescent flying the line
        if (!e) return;
        const q = free(crescents), G = VIS.abilityFx.gale;
        Object.assign(q, { age: 0, x: x + ux * 0.8, y: y + R.waist, z: z + uz * 0.8, ux, uz, reach: v.reach || 12, life: (v.reach || 12) / G.speed, cut: new Set(), dust: 0 });
        q.m.rotation.set(0, yaw, 0); q.m.scale.set(R.crescent * (v.width || 1.6) / 1.6, R.crescent * 0.38, 1); q.m.material.opacity = 0; q.m.visible = false;
        const h = handOf(b, x, y, z, yaw); sweep(h.x, h.y, h.z, 0.1, R.sweep);
        break;
      }
      case 'wave': {   // the sweep; the crest is js/rare-strike-fx.js's, its foam sheet breaks where it ends
        const h = handOf(b, x, y, z, yaw); sweep(h.x, h.y - 0.2, h.z, -0.15, R.sweep * 1.4);
        const q = free(foams), reach = v.reach || 10;
        q.age = -0.55; q.size = (v.width || 3) * 2.2; q.m.position.set(x + ux * reach, (e ? e.y : y) + 0.05, z + uz * reach); q.m.visible = false;
        break;
      }
      case 'spikes': {   // a frost ring at the stab, the spikes rising in turn along the line, each taller
        if (!e) return;
        const q = free(frosts), reach = v.reach || 12, S = CONFIG.abilities.spikes;
        q.age = 0; q.y = e.y; q.e = e;
        q.m.position.set(x + ux * 0.7, y + 0.05, z + uz * 0.7); q.m.scale.setScalar(0.4); q.m.material.opacity = 1; q.m.visible = true;
        q.spikes.forEach((s, i) => {
          const k = i / (SPIKES - 1), along = 1.2 + (reach - 1.2) * k, side = (i % 2 ? 1 : -1) * 0.28 * rnd();
          s.x = x + ux * along - uz * side; s.z = z + uz * along + ux * side; s.at = 0.05 + along / S.speed; s.h = R.spike * (0.25 + 0.75 * k); s.up = false;
          s.s.position.set(s.x, q.y, s.z); s.s.scale.set(s.h * 0.34, 0.01, 1); s.s.material.opacity = 1; s.s.material.rotation = side * 0.3; s.s.visible = false;
        });
        q.sinkAt = q.spikes[SPIKES - 1].at + 0.3;
        break;
      }
      case 'fist': {   // dust at the punch, cracks running to the spot, the fist a beat later
        if (!e) return;
        const q = free(fists), F = CONFIG.abilities.fist;
        Object.assign(q, { age: 0, x: e.x, y: e.y, z: e.z, e, rose: false, delay: F.delay });
        q.s.position.set(q.x, q.y - R.fist, q.z); q.s.scale.set(R.fist * 0.66, R.fist, 1); q.s.visible = false;
        q.cracks.position.set(q.x, q.y + 0.04, q.z); q.cracks.scale.setScalar(0.1); q.cracks.material.opacity = 1; q.cracks.visible = true;
        throwFlakes(x + ux * 0.6, y + 0.1, z + uz * 0.6, 10, DUST, GRIT);
        runLine(x + ux * 0.6, y, z + uz * 0.6, q.x, q.z, F.delay, C_BLUE);
        break;
      }
      case 'risingFire': {   // the slash, fire running to the spot, the fang a beat later
        if (!e) return;
        const q = free(fangs), F = CONFIG.abilities.risingFire;
        Object.assign(q, { age: 0, x: e.x, y: e.y, z: e.z, e, embered: false, delay: F.delay });
        q.s.position.set(q.x, q.y, q.z); q.s.scale.set(R.fang * 0.38, 0.01, 1); q.s.visible = false;
        const h = handOf(b, x, y, z, yaw); sweep(h.x, h.y - 0.3, h.z, 1.1, R.sweep);
        runLine(x + ux * 0.6, y, z + uz * 0.6, q.x, q.z, F.delay, C_BLUE);
        scorch(q.x, q.y, q.z, R.fang * 0.6, F.delay + 0.05, 0.7);
        break;
      }
      case 'clap': {   // the star at the hand, the cone of air, four arcs out to its reach
        const q = free(claps), h = handOf(b, x, y, z, yaw);
        Object.assign(q, { age: 0, x: h.x, y: h.y - 0.2, z: h.z, yaw, reach: v.reach || 7 });
        for (const m of [...q.arcs, q.cone]) { m.position.set(q.x, q.y, q.z); m.rotation.set(0, yaw + Math.PI, 0); m.scale.setScalar(0.5); m.material.opacity = 0; m.visible = false; }
        star(h.x, h.y, h.z, R.clapStar, 0.12);
        const half = CONFIG.abilities.clap.angle * Math.PI / 360;
        throwFlakes(x + ux * 0.8, y + 0.15, z + uz * 0.8, 24, DUST, FLAT, (i, n) => { const a = yaw + (i / n - 0.5) * 2 * half; return { x: Math.sin(a), z: Math.cos(a) }; }, 0.05);
        break;
      }
    }
  }

  // ---- Drawing -----------------------------------------------------------------------------------------------------------
  function render() {
    if (!made) return;
    const real = effectSlots.real(), R = K(), calm = reducedMotion();
    for (const q of lotuses) {   // rise 0.05-0.3 leaning out, fold shut 0.3-0.45, burst at 0.4, fade by 0.6
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > 0.6) { q.age = Infinity; q.g.visible = false; continue; }
      const rise = clamp01((q.age - 0.05) / 0.25), shut = clamp01((q.age - 0.3) / 0.15), ease = 1 - (1 - shut) * (1 - shut);
      const lean = lerp(0.35, -Math.asin(Math.min(0.98, q.r / q.h)), ease);
      for (const p of q.petals) { p.pivot.rotation.x = lean; p.m.scale.set(q.h * 0.42, q.h * Math.max(0.01, rise), 1); }
      q.g.visible = rise > 0; q.mat.opacity = veil(q.e) * (1 - clamp01((q.age - 0.45) / 0.15));
      if (!q.done && q.age >= 0.4) {
        q.done = true; const cy = q.y + Math.min(q.h, (q.e && q.e.height) || 1.8) * 0.6;
        q.burst.position.set(q.x, cy, q.z); q.burst.scale.setScalar(R.burst * 0.5); q.burst.material.opacity = 1; q.burst.visible = true; q.burstAge = 0;
        throwFlakes(q.x, cy, q.z, 24, EMBERS, UP);
      }
    }
    for (const q of lotuses) {   // the burst: snaps out, gone by 0.25 s
      if (q.burstAge === undefined) continue;
      q.burstAge += real;
      if (q.burstAge > 0.25) { q.burstAge = undefined; q.burst.visible = false; continue; }
      const k = Math.min(1, q.burstAge / 0.05); q.burst.scale.setScalar(R.burst * (0.5 + 0.5 * k)); q.burst.material.opacity = 1 - clamp01((q.burstAge - 0.12) / 0.13);
      q.burst.material.rotation = calm ? 0 : q.burstAge * 2;
    }
    for (const q of crescents) {   // flies the line from 0.1 s at gale's speed, fades past its reach; a cut on each it passes
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age - 0.1;
      if (t > q.life + 0.3) { q.age = Infinity; q.m.visible = false; continue; }
      if (t < 0) continue;
      const go = Math.min(1, t / q.life) * q.reach, px = q.x + q.ux * go, pz = q.z + q.uz * go, out = clamp01((t - q.life) / 0.3);
      q.m.position.set(px, q.y, pz); q.m.material.opacity = (1 - out) * Math.min(1, t / 0.04); q.m.visible = true;
      if ((q.dust -= real) <= 0 && out <= 0) {   // dust torn off the floor under it, two rows
        q.dust = 0.05;
        throwFlakes(px, q.y - R.waist + 0.1, pz, 3, DUST, GRIT, (i) => ({ x: q.ux * 0.4 + (i % 2 ? q.uz : -q.uz), z: q.uz * 0.4 + (i % 2 ? -q.ux : q.ux), ox: (i % 2 ? -q.uz : q.uz) * 0.8, oz: (i % 2 ? q.ux : -q.ux) * 0.8 }));
      }
      for (const e of Game.enemies) {
        if (q.cut.has(e) || !e.alive() || (e.x - px) * q.ux + (e.z - pz) * q.uz > 0) continue;
        if (Math.abs((e.x - q.x) * q.uz - (e.z - q.z) * q.ux) > (e.radius || 1) + R.crescent * 0.5) continue;
        q.cut.add(e); const h = (e.height || 1.8) * 0.55;
        star(e.x - q.ux * (e.radius || 0.6) * 0.5, e.y + h, e.z - q.uz * (e.radius || 0.6) * 0.5, R.cutStar, 0.2, C_CORE, Math.atan2(q.ux, q.uz));
        throwFlakes(e.x, e.y + h, e.z, 6, BLUES, SHARDS);
      }
    }
    for (const q of foams) {   // the foam sheet at the wave's end, spreading and fading
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age < 0) continue;
      if (q.age > 0.45) { q.age = Infinity; q.m.visible = false; continue; }
      const k = q.age / 0.45; q.m.scale.setScalar(q.size * (0.6 + 0.5 * (1 - (1 - k) * (1 - k)))); q.m.material.opacity = 1 - k * k; q.m.visible = true;
    }
    for (const q of frosts) {   // the ring cracks out; each spike erupts at its time with shards; all sink, the last first
      if (q.age === Infinity) continue;
      const was = q.age; q.age += real;
      const ring = clamp01(q.age / 0.12); q.m.scale.setScalar(0.4 + 1.6 * ring); q.m.material.opacity = 1 - clamp01((q.age - 0.2) / 0.3); q.m.visible = q.age < 0.5;
      let live = q.age < 0.5;
      for (let i = 0; i < q.spikes.length; i++) {
        const s = q.spikes[i], sink = q.sinkAt + (SPIKES - 1 - i) * 0.05, up = clamp01((q.age - s.at) / 0.06), down = clamp01((q.age - sink) / 0.35);
        if (was < s.at && q.age >= s.at) throwFlakes(s.x, q.y + 0.1, s.z, 4, ICE, SHARDS);
        if (down >= 1 || up <= 0) { s.s.visible = false; if (down < 1) live = true; continue; }
        live = true;
        s.s.scale.set(s.h * 0.34, s.h * up * (1 - down * 0.9), 1); s.s.material.opacity = (1 - down) * veil(q.e); s.s.visible = true;
      }
      if (!live) q.age = Infinity;
    }
    for (const q of lines) {   // drawn out from the player to the spot over its life, then fades
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life + 0.25) { q.age = Infinity; q.m.visible = false; continue; }
      q.m.scale.z = Math.max(0.01, q.len * clamp01(q.age / q.life)); q.m.material.opacity = 1 - clamp01((q.age - q.life) / 0.25);
    }
    for (const q of fists) {   // cracks star out under the spot; the fist punches up at its delay, holds, crumbles back
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > 1.2) { q.age = Infinity; q.s.visible = false; q.cracks.visible = false; continue; }
      const t = q.age - q.delay, star_ = clamp01((q.age - 0.1) / 0.15);
      q.cracks.scale.setScalar(0.1 + R.fist * 0.9 * star_); q.cracks.material.opacity = 1 - clamp01((q.age - 0.8) / 0.4); q.cracks.visible = star_ > 0;
      if (t < 0) continue;
      if (!q.rose) { q.rose = true; throwFlakes(q.x, q.y + 0.2, q.z, 6, STONE, RUBBLE); throwFlakes(q.x, q.y + 0.2, q.z, 20, STONE, GRIT); }
      const up = 1 - (1 - clamp01(t / 0.15)) ** 3, sink = clamp01((t - 0.4) / 0.5);
      q.s.position.set(q.x, q.y - R.fist * (1 - up) - R.fist * sink * 0.8, q.z); q.s.material.opacity = veil(q.e) * (1 - sink * sink); q.s.visible = true;
      q.s.material.rotation = calm ? 0 : Math.sin(t * 40) * 0.03 * (1 - up);
    }
    for (const q of fangs) {   // erupts at its delay to full height in 0.08 s, holds, thins and sinks by 0.9 s; embers from its tip
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > 0.9) { q.age = Infinity; q.s.visible = false; continue; }
      const t = q.age - q.delay;
      if (t < 0) continue;
      const up = 1 - (1 - clamp01(t / 0.08)) ** 2, thin = clamp01((q.age - 0.45) / 0.45);
      q.s.scale.set(R.fang * 0.38 * (1 - 0.7 * thin), R.fang * up * (1 - 0.4 * thin), 1); q.s.material.opacity = veil(q.e) * (1 - thin * thin); q.s.visible = true;
      if (!q.embered && q.age >= 0.45) { q.embered = true; throwFlakes(q.x, q.y + R.fang * 0.8, q.z, 24, BLUES, FALLING); }
    }
    for (const q of claps) {   // the cone of air 0.03-0.2 s; four arcs leaving 0.08 s apart, out to the reach by 0.3 s each
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > 0.6) { q.age = Infinity; for (const m of q.arcs) m.visible = false; q.cone.visible = false; continue; }
      const c = clamp01((q.age - 0.03) / 0.08), cOut = clamp01((q.age - 0.12) / 0.08);
      q.cone.scale.setScalar(0.5 + q.reach * 0.35 * c); q.cone.material.opacity = c * (1 - cOut); q.cone.visible = c > 0 && cOut < 1;
      for (let i = 0; i < q.arcs.length; i++) {
        const m = q.arcs[i], t = q.age - 0.03 - i * 0.08, k = clamp01(t / 0.3), ease = 1 - (1 - k) * (1 - k);
        if (t < 0 || k >= 1) { m.visible = false; continue; }
        m.scale.setScalar(0.6 + (q.reach - 0.6) * ease); m.material.opacity = 1 - k * k; m.visible = true;
      }
    }
    for (const q of sweeps) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.s.visible = false; continue; }
      q.s.material.opacity = 1 - clamp01((q.age - 0.08) / (q.life - 0.08));
    }
    for (const q of scorches) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age < 0) continue;
      if (q.age > q.life) { q.age = Infinity; q.m.visible = false; continue; }
      q.m.visible = true; q.m.material.opacity = 0.85 * (1 - clamp01((q.age - q.life * 0.4) / (q.life * 0.6)));
    }
    for (const q of stars) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.s.visible = false; continue; }
      const k = Math.min(1, q.age / 0.04); q.s.scale.setScalar(q.size * (0.5 + 0.5 * k)); q.s.material.opacity = 1 - clamp01((q.age - q.life * 0.5) / (q.life * 0.5));
    }
    for (const f of flakes) {
      if (f.age === Infinity) continue;
      if (f.wait > 0) { f.wait -= real; if (f.wait > 0) continue; f.s.visible = true; }
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
    for (const q of lotuses) { q.age = Infinity; q.e = null; q.g.visible = false; q.burst.visible = false; q.burstAge = undefined; }
    for (const q of [...crescents, ...foams, ...lines, ...scorches]) { q.age = Infinity; hide(q.m); }
    for (const q of frosts) { q.age = Infinity; q.e = null; hide(q.m); for (const s of q.spikes) hide(s.s); }
    for (const q of fists) { q.age = Infinity; q.e = null; hide(q.s); hide(q.cracks); }
    for (const q of fangs) { q.age = Infinity; q.e = null; hide(q.s); }
    for (const q of claps) { q.age = Infinity; q.arcs.forEach(hide); hide(q.cone); }
    for (const q of [...sweeps, ...stars, ...flakes]) { q.age = Infinity; hide(q.s); }
  }
  // A press's power (its level has a `charge`) of these kinds is drawn here. Told apart by the data, never by id.
  const THENS = new Set(['flare', 'gale', 'wave', 'spikes', 'fist', 'risingFire', 'clap']);
  const mine = d => !d.strike && !d.draw && THENS.has(d.then) && d.v && d.v.charge > 0;
  const on = list => list.filter(q => q.age !== Infinity).length;
  return {
    attach() { make(); Game.renderHooks.push(render); visuals.hooks.stage.push(clear); events.on('abilityPower', d => { if (mine(d)) power(d); }); },
    clear, mine,
    // tests: what shows now
    get state() {
      if (!made) return {};
      return { lotus: on(lotuses), crescent: on(crescents), foam: on(foams), spikes: frosts.reduce((n, q) => n + q.spikes.filter(s => s.s.visible).length, 0),
        frost: on(frosts), line: on(lines), fist: fists.filter(q => q.s.visible).length, cracks: fists.filter(q => q.cracks.visible).length,
        fang: fangs.filter(q => q.s.visible).length, arcs: claps.reduce((n, q) => n + q.arcs.filter(m => m.visible).length, 0), clap: on(claps),
        sweeps: on(sweeps), scorch: on(scorches), stars: on(stars), flakes: on(flakes), burst: lotuses.some(q => q.burst.visible) };
    },
  };
})();
