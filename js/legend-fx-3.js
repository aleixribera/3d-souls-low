'use strict';
// ============================================================================
// Ultimates I (design/abilities BUILD-ORDER batch 15): drawing only
// ============================================================================
// Key 4's first five, each to Thunder Call's bar, in the cel look of the other legendaries (STYLE.md): flat hard-edged
// shapes in two or three tones inside a black ink outline, ember for the legendary, few big sharp particles. Everything
// is drawn from `abilityPower` (the server's word online, so a teammate's the same as your own) and the time since it,
// pooled and made at load; nothing allocates per frame. Each Ultimate's anticipation dims the world (impactFrame.dim).
//   Thunder Call     a slit opens in the sky over the boss; a lightning dragon in ink (white-violet core, violet body,
//                    ember fringe) pours out of it, coils round the boss and bites with a bolt each `every` s (the impact
//                    frame at the first), then fades into the storm.
//   Cataclysm        eight ember cracks run out from where its holder pressed; the burst: an ember dome swelling out of
//                    the ground, a shock ring as wide as the blast, six floor slabs (tools/blender/cataclysm_slabs.py)
//                    thrown up and spinning, the impact frame.
//   Heaven's Lance   a sigil turns under the boss and a hole opens in the sky; a column of white light in ink lands (the
//                    impact frame) and burns, a spark ring at each burn; see-through near the player.
//   Frozen Lotus     a frost ring grows under the boss; at the first petal a lotus of ice (tools/blender/ice_lotus.py)
//                    blooms there, each petal a spear stabbing up through the boss; at the last it shatters.
//   Tempest          clouds gather and turn over the boss; at the first tick a funnel of spiral sheets in ink with rain
//                    round its foot follows the storm's middle, a small bolt every 4th tick; after `full` s it keeps half
//                    its sheets and rain (the long-aura budget).
// Tuning: VIS.abilityFx.ults1, CONFIG.abilities.ult (the leads). Sounds: js/audio.js. Camera: js/camera-feel.js.
const legendFx3 = (() => {
  const K = () => VIS.abilityFx.ults1, U = () => CONFIG.abilities.ult;
  const INK = '#0b0b0f', EMBER = '#e59a5c', CORE = '#fff6d8', CREAM = '#fff3dc', VIOLET = '#8f7cf0', PALEV = '#ece6ff', ICE = '#cfe8f5', STORM = '#5b6577';
  const C_INK = 0x0b0b0f, C_EMBER = 0xe59a5c, C_CORE = 0xfff6d8, C_VIOLET = 0x8f7cf0, C_PALEV = 0xece6ff, C_ICE = 0xcfe8f5, C_STONE = 0x4a4540;
  const rnd = (() => { let s = 2741; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ease = x => 1 - (1 - clamp01(x)) ** 3;
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const inked = (g, path, fill, ink, edge = null, rim = 0) => {
    path(); g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill();
    if (edge) { path(); g.lineWidth = rim; g.strokeStyle = edge; g.stroke(); }
  };
  const star = (m, n, r0, r1, a0 = 0) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = a0 + i / (n * 2) * Math.PI * 2, r = m * (i % 2 ? r0 : r1); pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); } return pts; };
  let SLIT, HEAD, CRACK, RING, SIGIL, HOLE, FROST, CLOUD, SHEET, CLAP, DROP, STREAK;
  function textures() {
    SLIT = canvasTex(512, 128, (g, w, h) => {   // a lens torn in the sky: ink lips, violet light inside, a white seam
      const lens = (k) => () => { g.beginPath(); g.moveTo(8, h / 2); g.quadraticCurveTo(w / 2, h / 2 - h * 0.46 * k, w - 8, h / 2); g.quadraticCurveTo(w / 2, h / 2 + h * 0.46 * k, 8, h / 2); g.closePath(); };
      inked(g, lens(1), VIOLET, 14); g.fillStyle = PALEV; lens(0.45)(); g.fill(); g.fillStyle = '#fff'; lens(0.12)(); g.fill();
    });
    HEAD = canvasTex(256, 256, (g, w) => {   // the dragon's head side on, looking right: horns back, jaws open, a white eye
      const s = w / 256;
      g.scale(s, s);
      inked(g, () => poly(g, [[40, 120], [92, 84], [150, 78], [214, 96], [246, 112], [196, 120], [232, 150], [170, 146], [120, 160], [64, 150]]), VIOLET, 12, EMBER, 4);
      inked(g, () => poly(g, [[96, 86], [40, 40], [70, 92]]), PALEV, 9); inked(g, () => poly(g, [[124, 80], [92, 22], [112, 84]]), PALEV, 9);
      g.fillStyle = CORE; poly(g, [[150, 100], [170, 96], [166, 108]]); g.fill();
      g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(196, 120); g.lineTo(150, 124); g.stroke();
    });
    CRACK = canvasTex(256, 32, (g, w, h) => {   // a jagged crack, root at the left: ink lips round a burning seam
      const pts = [[0, h / 2]];
      for (let i = 1; i <= 10; i++) pts.push([w * i / 10, h / 2 + (i % 2 ? -1 : 1) * h * 0.18 * (1 - i / 12)]);
      g.lineWidth = 14; g.strokeStyle = INK; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.lineWidth = 6; g.strokeStyle = EMBER; g.stroke(); g.lineWidth = 2; g.strokeStyle = CORE; g.stroke();
    });
    const ring = (fill, edge) => canvasTex(128, 128, (g, w) => {
      const m = w / 2;
      for (const [r, th, c] of [[0.86, 12, INK], [0.86, 6, fill], [0.8, 2, edge]]) { g.beginPath(); g.arc(m, m, m * r, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
    });
    RING = ring(EMBER, CREAM);
    SIGIL = canvasTex(256, 256, (g, w) => {   // two rings, a six-point star between them, ticks round the outside
      const m = w / 2; g.strokeStyle = INK;
      for (const [r, th] of [[0.94, 8], [0.62, 6]]) { g.beginPath(); g.arc(m, m, m * r, 0, Math.PI * 2); g.lineWidth = th + 6; g.strokeStyle = INK; g.stroke(); g.lineWidth = th; g.strokeStyle = CREAM; g.stroke(); }
      inked(g, () => poly(g, star(m, 6, 0.32, 0.6, -Math.PI / 2)), 'rgba(229,154,92,0.35)', 6, EMBER, 2);
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.beginPath(); g.moveTo(m + Math.cos(a) * m * 0.7, m + Math.sin(a) * m * 0.7); g.lineTo(m + Math.cos(a) * m * 0.84, m + Math.sin(a) * m * 0.84); g.lineWidth = i % 2 ? 3 : 6; g.strokeStyle = EMBER; g.stroke(); }
    });
    HOLE = canvasTex(256, 256, (g, w) => {   // a hole torn in the clouds: a ragged dark rim, white-gold light inside
      const m = w / 2, rim = [], inner = [];
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; rim.push([m + Math.cos(a) * m * (0.82 + 0.14 * ((i * 7) % 3) / 2), m + Math.sin(a) * m * (0.82 + 0.14 * ((i * 5) % 3) / 2)]); inner.push([m + Math.cos(a) * m * 0.5, m + Math.sin(a) * m * 0.5]); }
      inked(g, () => poly(g, rim), '#3a3448', 10); inked(g, () => poly(g, inner), CORE, 8, EMBER, 3);
    });
    FROST = canvasTex(256, 256, (g, w) => {   // a ring of frost: pale ice in ink, crystal points out of it
      const m = w / 2;
      g.beginPath(); g.arc(m, m, m * 0.8, 0, Math.PI * 2); g.lineWidth = 22; g.strokeStyle = INK; g.stroke(); g.lineWidth = 14; g.strokeStyle = ICE; g.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); inked(g, () => poly(g, [[m + c * m * 0.74 - s * 6, m + s * m * 0.74 + c * 6], [m + c * m * 0.98, m + s * m * 0.98], [m + c * m * 0.74 + s * 6, m + s * m * 0.74 - c * 6]]), '#ffffff', 4); }
    });
    CLOUD = canvasTex(256, 256, (g, w) => {   // storm clouds turning: three dark arms in ink, violet light at the eye
      const m = w / 2;
      for (let k = 0; k < 3; k++) {
        const a0 = k / 3 * Math.PI * 2;
        inked(g, () => { g.beginPath(); for (let i = 0; i <= 12; i++) { const t = i / 12, a = a0 + t * 2.4, r = m * (0.15 + 0.8 * t); const x = m + Math.cos(a) * r, y = m + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
          for (let i = 12; i >= 0; i--) { const t = i / 12, a = a0 + t * 2.4 - 0.5 * (1 - t) - 0.3, r = m * (0.12 + 0.6 * t); g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); } g.closePath(); }, STORM, 8);
      }
      g.fillStyle = VIOLET; g.beginPath(); g.arc(m, m, m * 0.14, 0, Math.PI * 2); g.fill();
    });
    SHEET = canvasTex(256, 16, (g, w, h) => {   // a sheet of wind, across it: ink at both edges, storm grey, a pale streak
      g.fillStyle = INK; g.fillRect(0, 0, w, h); g.fillStyle = STORM; g.fillRect(w * 0.06, 0, w * 0.88, h); g.fillStyle = PALEV; g.fillRect(w * 0.3, 0, w * 0.1, h);
    });
    CLAP = canvasTex(128, 128, (g, w) => inked(g, () => poly(g, star(w / 2, 8, 0.24, 0.94)), CREAM, 6, EMBER, 2.5));
    DROP = canvasTex(32, 32, (g, w, h) => { poly(g, [[w * 0.1, h * 0.55], [w * 0.5, h * 0.1], [w * 0.9, h * 0.4], [w * 0.45, h * 0.9]]); g.fillStyle = '#fff'; g.fill(); });
    STREAK = canvasTex(8, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(w * 0.25, 0, w * 0.5, h); });
  }
  const mat = (map, opts = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, ...opts });
  const mesh = (geo, material, order = 12) => {
    const m = new THREE.Mesh(geo, material); m.visible = false; m.renderOrder = order; m.frustumCulled = false; m.userData.warmUp = true; scene.add(m); pooledFx.push(m); return m;
  };
  const sprite = (map, order = 14) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false }));
    s.visible = false; s.renderOrder = order; s.userData.warmUp = true; scene.add(s); pooledFx.push(s); return s;
  };
  const light = (at, color, k, range) => effectLighting.flash(at, color, k * (reducedMotion() ? 0.5 : 1), range);
  const density = () => (CONFIG.VISUALS.fxBudgets[visuals.quality().fxBudget] || { density: 1 }).density;
  const chestOf = (b, out) => { out.x = b.x; out.y = b.y + (b.height || 1.8) * 0.6; out.z = b.z; return out; };
  function free(list) {
    let old = list[0];
    for (const q of list) { if (q.age === Infinity) return q; if (q.age > old.age) old = q; }
    return old;
  }

  // ---- Cel models: each slot flat in its tone, lit in two bands, a rim of `uRim` and a black ink edge ----------------
  const celVertex = `
    varying vec3 vN; varying vec3 vV;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
  const celFragment = `
    uniform vec3 uColor; uniform vec3 uRim; uniform vec3 uInk; uniform float uAlpha; uniform float uRimOn;
    varying vec3 vN; varying vec3 vV;
    void main() {
      vec3 n = normalize(vN); float facing = abs(dot(n, normalize(vV)));
      float lit = step(0.2, dot(n, normalize((viewMatrix * vec4(-0.35, 0.8, 0.5, 0.0)).xyz)));
      vec3 c = uColor * mix(0.72, 1.18, lit);
      c = mix(c, uRim, step(facing, 0.34) * uRimOn);
      c = mix(c, uInk, step(facing, 0.12));
      gl_FragColor = vec4(c, uAlpha);
    }`;
  function cel(color, rim, rimOn, alpha = 1) {
    return new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(color) }, uRim: { value: new THREE.Color(rim) }, uInk: { value: new THREE.Color(C_INK) },
      uAlpha: { value: alpha }, uRimOn: { value: rimOn } }, vertexShader: celVertex, fragmentShader: celFragment, transparent: alpha < 1, depthWrite: alpha >= 1 });
  }

  // ---- A camera-facing ribbon through `n` points, in layers (ink widest, then the colours inside it), tapered -------
  const view = new THREE.Vector3();
  function ribbon(n, layers) {
    const pts = new Float32Array(n * 3), meshes = layers.map(([color, order]) => {
      const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 6), idx = [];
      for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
      return mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }), order);
    });
    return { n, pts, meshes, widths: layers.map(l => l[2]), taper: new Float32Array(n).fill(1), opacity: 1 };
  }
  function drawRibbon(r, scale = 1) {
    const n = r.n, P = r.pts;
    for (let k = 0; k < r.meshes.length; k++) {
      const m = r.meshes[k], pos = m.geometry.attributes.position.array;
      for (let i = 0; i < n; i++) {
        const w = r.widths[k] * scale * 0.5 * r.taper[i], x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        const dx = P[b * 3] - P[a * 3], dy = P[b * 3 + 1] - P[a * 3 + 1], dz = P[b * 3 + 2] - P[a * 3 + 2];
        view.set(camera.position.x - x, camera.position.y - y, camera.position.z - z);
        let sx = dy * view.z - dz * view.y, sy = dz * view.x - dx * view.z, sz = dx * view.y - dy * view.x;
        const l = Math.hypot(sx, sy, sz) || 1; sx *= w / l; sy *= w / l; sz *= w / l;
        pos[i * 6] = x - sx; pos[i * 6 + 1] = y - sy; pos[i * 6 + 2] = z - sz; pos[i * 6 + 3] = x + sx; pos[i * 6 + 4] = y + sy; pos[i * 6 + 5] = z + sz;
      }
      m.geometry.attributes.position.needsUpdate = true;
      m.material.opacity = r.opacity; m.visible = r.opacity > 0;
    }
  }
  const hideRibbon = r => { for (const m of r.meshes) m.visible = false; };

  // ---- Pools ----------------------------------------------------------------------------------------------------
  const DRAGON_PTS = 28, BOLT_PTS = 12, DROPS = 80, RAIN = 60, SLABS = 6, PETALS = 6, SPEARS = 6, SHEETS = 4;
  let made = false;
  const dims = [], dragons = [], bolts = [], quakes = [], lances = [], lotuses = [], storms = [], claps = [], pulses = [], drops = [];
  function helix(turns, base, segs = 48) {   // one spiral sheet round the funnel: a band wound up a cone a unit tall, `base` round at its foot, 1 at its top
    const pos = new Float32Array((segs + 1) * 6), uv = new Float32Array((segs + 1) * 4), idx = [];
    for (let j = 0; j <= segs; j++) {
      const t = j / segs, a = t * turns * Math.PI * 2, r = base + (1 - base) * t ** 1.3;
      for (let s = 0; s < 2; s++) { const o = (j * 2 + s) * 3; pos[o] = Math.cos(a) * r; pos[o + 1] = t + s * 0.2; pos[o + 2] = Math.sin(a) * r; uv[(j * 2 + s) * 2] = s; uv[(j * 2 + s) * 2 + 1] = t; }
      if (j < segs) { const q = j * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  function make() {
    if (made) return;
    made = true; textures();
    const floor = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), along = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
    const dome = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), column = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true).translate(0, 0.5, 0);
    const funnel = helix(2.2, K().funnelBase / K().funnelTop), baked = n => bakedGeometry(n);
    for (let i = 0; i < 4; i++) dims.push({ age: Infinity, lead: 0.5 });
    for (let i = 0; i < 2; i++) {
      const head = sprite(HEAD, 15);
      const r = ribbon(DRAGON_PTS, [[C_INK, 12, 1.3], [C_EMBER, 13, 1.06], [C_VIOLET, 14, 0.82], [C_PALEV, 15, 0.3]]);
      for (let k = 0; k < DRAGON_PTS; k++) { const t = k / (DRAGON_PTS - 1); r.taper[k] = k < 3 ? 0.7 + 0.15 * k : 1.15 * (1 - t) ** 0.8 + 0.08; }
      dragons.push({ r, head, slit: mesh(new THREE.PlaneGeometry(1, 1), mat(SLIT), 11), age: Infinity, e: null, a0: 0, side: 1, lead: 0.75, end: 3, last: 0 });
      const slabs = [];
      for (let k = 0; k < SLABS; k++) {
        const stone = mesh(baked(`slabs:slab${k}__stone`), cel(C_STONE, C_EMBER, 1), 10), ember = mesh(baked(`slabs:slab${k}__ember`), cel(C_EMBER, C_CORE, 0), 10);
        slabs.push({ stone, ember, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, sx: 0, sz: 0, down: false });
      }
      quakes.push({ cracks: Array.from({ length: 8 }, () => mesh(along, mat(CRACK), 4)), dome: mesh(dome, cel(C_EMBER, C_CORE, 1, 0.5), 11), ring: mesh(floor, mat(RING), 5),
        slabs, age: Infinity, burst: Infinity, x: 0, y: 0, z: 0, radius: 8, a0: 0 });
      const coreMat = cel(C_CORE, C_PALEV, 1, 1), outerMat = cel(0xffe2a8, C_EMBER, 1, 0.7);
      lances.push({ sigil: mesh(floor, mat(SIGIL), 5), hole: mesh(floor, mat(HOLE), 6), core: mesh(column, coreMat, 13), outer: mesh(column, outerMat, 12),
        age: Infinity, landed: Infinity, e: null, time: 2, x: 0, z: 0, y: 0 });
      const ice = cel(C_ICE, 0xffffff, 1, 0.82), edge = cel(C_EMBER, C_CORE, 0);
      lotuses.push({ frost: mesh(floor, mat(FROST), 5), crown: [mesh(baked('lotus:crown__ice'), ice, 11), mesh(baked('lotus:crown__edge'), edge, 11)],
        petals: Array.from({ length: PETALS }, () => [mesh(baked('lotus:outer__ice'), ice, 11), mesh(baked('lotus:outer__edge'), edge, 11)]),
        spears: Array.from({ length: SPEARS }, () => ({ m: [mesh(baked('lotus:spear__ice'), ice, 11), mesh(baked('lotus:spear__edge'), edge, 11)], age: Infinity, a: 0 })),
        ice, edge, age: Infinity, bloom: Infinity, broke: Infinity, e: null, x: 0, y: 0, z: 0, n: 0 });
      storms.push({ cloud: mesh(floor, mat(CLOUD), 6), sheets: Array.from({ length: SHEETS }, () => mesh(funnel, mat(SHEET, { opacity: 0.85 }), 11)), ring: mesh(floor, mat(RING, { color: 0xc8cde0 }), 5),
        rain: Array.from({ length: RAIN }, () => ({ s: sprite(STREAK, 12), x: 0, y: -1e9, z: 0 })), age: Infinity, first: Infinity, done: Infinity, e: null, x: 0, y: 0, z: 0, tx: 0, tz: 0, radius: 6 });
    }
    for (let i = 0; i < 6; i++) bolts.push({ r: ribbon(BOLT_PTS, [[C_INK, 12, 0.6], [C_VIOLET, 13, 0.4], [C_PALEV, 14, 0.14]]), age: Infinity, life: 0.16 });
    for (let i = 0; i < 4; i++) claps.push({ s: sprite(CLAP, 15), age: Infinity, size: 1 });
    for (let i = 0; i < 6; i++) pulses.push({ m: mesh(floor, mat(RING), 4), age: Infinity, r1: 2, life: 0.4 });
    for (let i = 0; i < DROPS; i++) drops.push({ s: sprite(DROP, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grav: 0 });
  }
  function throwDrops(x, y, z, n, color, speed, up, grav, life) {
    const total = Math.max(1, Math.round(n * density()));
    for (let i = 0; i < total; i++) {
      const f = free(drops), a = rnd() * Math.PI * 2, s = speed * (0.4 + 0.6 * rnd());
      f.age = 0; f.life = life * (0.6 + 0.4 * rnd()); f.x = x; f.y = y; f.z = z; f.vx = Math.cos(a) * s; f.vz = Math.sin(a) * s; f.vy = up * (0.5 + rnd()); f.grav = grav;
      f.s.material.color.setHex(color); f.s.material.opacity = 1; f.s.scale.setScalar(0.14 + 0.12 * rnd()); f.s.position.set(x, y, z); f.s.visible = true;
    }
  }
  function clap(x, y, z, size) { const c = free(claps); c.age = 0; c.size = size; c.s.position.set(x, y, z); c.s.material.rotation = rnd() * 6.28; c.s.visible = true; }
  function pulse(x, y, z, r1, life = 0.4) { const p = free(pulses); p.age = 0; p.r1 = r1; p.life = life; p.m.position.set(x, y + 0.04, z); p.m.visible = true; }
  const jag = new Float32Array(BOLT_PTS * 2);
  function bolt(fx, fy, fz, tx, ty, tz, life = K().bolt) {   // a jagged bolt from one point to another, in ink
    const b = free(bolts), P = b.r.pts;
    b.age = 0; b.life = life;
    for (let i = 0; i < BOLT_PTS; i++) {
      const t = i / (BOLT_PTS - 1), j = i && i < BOLT_PTS - 1 ? 0.9 * (1 - t * 0.5) : 0;
      jag[i * 2] = (rnd() - 0.5) * j; jag[i * 2 + 1] = (rnd() - 0.5) * j;
      P[i * 3] = fx + (tx - fx) * t + jag[i * 2]; P[i * 3 + 1] = fy + (ty - fy) * t; P[i * 3 + 2] = fz + (tz - fz) * t + jag[i * 2 + 1];
    }
    b.r.opacity = 1;
  }
  // The world dim: an Ultimate pressed near the player darkens the picture over its lead, then lets go as it lands.
  function dimFor(d, lead) {
    const p = Game.player;
    if (!p || Math.hypot(p.x - d.x, p.z - d.z) > VIS.impactFrame.near) return;
    const q = free(dims); q.age = 0; q.lead = lead;
  }
  function drawDims(real) {
    let k = 0;
    for (const q of dims) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, f = t < q.lead ? t / q.lead : 1 - (t - q.lead - 0.1) / 0.25;
      if (t > q.lead + 0.35) { q.age = Infinity; continue; }
      k = Math.max(k, clamp01(f));
    }
    impactFrame.dim(k);
  }
  const at = { x: 0, y: 0, z: 0 }, tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  // ---- Thunder Call ---------------------------------------------------------------------------------------------
  function dragonCall(d, e) {
    const q = free(dragons), v = d.v || {};
    q.age = 0; q.e = e; q.h = d.holder; q.lead = v.lead || 0.75; q.end = q.lead + (v.every || 0.3) * ((v.strikes || 7) - 1) + 0.35; q.last = 0;
    q.side = rnd() < 0.5 ? -1 : 1; q.a0 = d.body ? Math.atan2(d.body.z - e.z, d.body.x - e.x) : rnd() * Math.PI * 2;
    q.slit.position.set(e.x, e.y + K().sky, e.z); q.slit.rotation.set(-Math.PI / 2, 0, q.a0); q.slit.scale.set(0.01, K().slit * 0.3, 1); q.slit.visible = true;
    dimFor(e, q.lead);
  }
  // The head's way at `u` (0 out of the slit, 1 round the boss at the coil, on round it after), into `out`.
  function track(q, u, out) {
    const e = q.e, R = K(), ring = (e.radius || 1) + R.coil, low = e.y + R.coilUp;
    if (u < 1) {
      const k = Math.max(0, u), a = q.a0 + q.side * k * Math.PI * 1.2, r = ring * (0.25 + 0.75 * k);
      out.set(e.x + Math.cos(a) * r, e.y + R.sky - (R.sky - R.coilUp) * (1 - (1 - k) ** 2), e.z + Math.sin(a) * r);
    } else {
      const a = q.a0 + q.side * (Math.PI * 1.2 + (u - 1) * 2.4);
      out.set(e.x + Math.cos(a) * ring, low + 0.6 * Math.sin((u - 1) * 4), e.z + Math.sin(a) * ring);
    }
    out.y += 0.3 * Math.sin(u * 14);
    return out;
  }
  function dragonBite(d, e) {
    const q = dragons.find(g => g.e && g.age !== Infinity && g.h === d.holder && (g.e === e || d.strike > 1)) || null;
    chestOf(e, at);
    let fx = e.x, fy = e.y + K().sky, fz = e.z;
    if (q) { q.e = e; q.last = q.age; fx = q.r.pts[0]; fy = q.r.pts[1]; fz = q.r.pts[2]; }
    bolt(fx, fy, fz, at.x, at.y, at.z);
    clap(at.x, at.y, at.z, 1.4); throwDrops(at.x, at.y, at.z, 6, C_PALEV, 4, 2, 12, 0.4);
    ultraFx.sparkBurst(at, 24, 'storm', null, 0, 1.1); light(at, C_VIOLET, 10, 12);
    if (d.strike === 1) impactFrame.hit(e.x, e.z);
  }
  function drawDragons(real) {
    const R = K();
    for (const q of dragons) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, e = q.e;
      if (!e || t > q.end + R.fade) { q.age = Infinity; q.e = null; hideRibbon(q.r); q.head.visible = q.slit.visible = false; continue; }
      const open = ease(t / 0.3), shut = clamp01((t - q.end) / R.fade);
      q.slit.position.set(e.x, e.y + R.sky, e.z); q.slit.scale.set(Math.max(0.01, R.slit * open * (1 - shut)), R.slit * 0.3 * (1 - shut) + 0.01, 1);
      q.slit.material.opacity = 1 - shut;
      const u = t < q.lead ? t / q.lead : 1 + (t - q.lead) / q.lead, lunge = clamp01(1 - (t - q.last) / 0.15) * (q.last > 0 ? 1 : 0);
      for (let i = 0; i < DRAGON_PTS; i++) {
        track(q, u - i * 0.045, tmp);
        if (i < 4 && lunge > 0) { chestOf(e, at); tmp.x += (at.x - tmp.x) * lunge * 0.3 * (1 - i / 4); tmp.y += (at.y - tmp.y) * lunge * 0.3 * (1 - i / 4); tmp.z += (at.z - tmp.z) * lunge * 0.3 * (1 - i / 4); }
        q.r.pts[i * 3] = tmp.x; q.r.pts[i * 3 + 1] = tmp.y; q.r.pts[i * 3 + 2] = tmp.z;
      }
      q.r.opacity = 1 - shut * shut;
      drawRibbon(q.r, R.dragon / 0.8 * clamp01(t / 0.12));
      // The head: at the front, turned the way it goes on the screen.
      tmp.set(q.r.pts[0], q.r.pts[1], q.r.pts[2]); tmp2.set(q.r.pts[6], q.r.pts[7], q.r.pts[8]);
      q.head.position.copy(tmp); tmp.project(camera); tmp2.project(camera);
      const dx = tmp.x - tmp2.x, dy = (tmp.y - tmp2.y) * camera.aspect;
      q.head.material.rotation = dx < 0 ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
      q.head.scale.set((dx < 0 ? -1 : 1) * R.dragon * 2.6, R.dragon * 2.6, 1); q.head.material.opacity = 1 - shut; q.head.visible = t > 0.05;
    }
  }

  // ---- Cataclysm ------------------------------------------------------------------------------------------------
  function quakeCracks(d) {
    const q = free(quakes), v = d.v || {};
    q.age = 0; q.burst = Infinity; q.x = d.x; q.y = d.y; q.z = d.z; q.radius = v.radius || 8; q.a0 = rnd() * Math.PI;
    q.cracks.forEach((m, k) => { m.position.set(q.x, q.y + 0.03, q.z); m.rotation.set(0, -(q.a0 + k / 8 * Math.PI * 2 + (rnd() - 0.5) * 0.3), 0); m.scale.set(0.01, 1, K().crack); m.material.opacity = 1; m.visible = true; });
    for (const s of q.slabs) s.stone.visible = s.ember.visible = false;
    q.dome.visible = q.ring.visible = false;
    at.x = q.x; at.y = q.y + 0.2; at.z = q.z; ultraFx.sparkBurst(at, 14, 'ember', [0, 1, 0], 0.5, 0.8);
    dimFor(d, U().quake);
  }
  function quakeBurst(d) {
    let q = quakes.find(g => g.age !== Infinity && g.burst === Infinity && Math.hypot(g.x - d.x, g.z - d.z) < 0.5);
    if (!q) { quakeCracks(d); q = quakes.find(g => g.age === 0); q.age = U().quake; }   // the press came unseen
    q.burst = q.age;
    const R = K();
    q.slabs.forEach((s, k) => {
      const a = q.a0 + (k + 0.5) / SLABS * Math.PI * 2, r = 1.2 + rnd() * 1.8, out = R.slabOut * (0.6 + 0.6 * rnd());
      s.x = q.x + Math.cos(a) * r; s.z = q.z + Math.sin(a) * r; s.y = q.y; s.vx = Math.cos(a) * out; s.vz = Math.sin(a) * out; s.vy = R.slabUp * (0.7 + 0.5 * rnd());
      s.rx = 0; s.rz = 0; s.sx = (rnd() - 0.5) * 9; s.sz = (rnd() - 0.5) * 9; s.down = false;
      for (const m of [s.stone, s.ember]) { m.position.set(s.x, s.y, s.z); m.rotation.set(0, a, 0); m.visible = true; }
      s.stone.material.uniforms.uAlpha.value = 1;
    });
    q.dome.position.set(q.x, q.y, q.z); q.dome.scale.setScalar(0.01); q.dome.visible = true;
    q.ring.position.set(q.x, q.y + 0.05, q.z); q.ring.scale.setScalar(0.01); q.ring.material.opacity = 1; q.ring.visible = true;
    at.x = q.x; at.y = q.y + 1; at.z = q.z;
    impactFrame.hit(q.x, q.z); clap(q.x, q.y + 1.2, q.z, 3);
    throwDrops(q.x, q.y + 0.5, q.z, 24, C_EMBER, 7, 7, 18, 1.1); throwDrops(q.x, q.y + 0.5, q.z, 12, C_STONE, 5, 6, 18, 1.2);
    ultraFx.sparkBurst(at, 46, 'ember', [0, 1, 0], 0.6, 1.4); ultraFx.flashAt(at, C_EMBER, 46, 24); light(at, C_EMBER, 18, 20);
  }
  function drawQuakes(real) {
    const R = K(), lead = U().quake;
    for (const q of quakes) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, since = t - q.burst;
      if (t > lead + 3 || since > R.slabLife + R.fade) {
        q.age = Infinity; for (const m of q.cracks) m.visible = false; q.dome.visible = q.ring.visible = false;
        for (const s of q.slabs) s.stone.visible = s.ember.visible = false; continue;
      }
      const run = ease(t / lead), cool = since > 0 ? clamp01((since - 0.4) / 1.2) : 0;
      for (const m of q.cracks) { m.scale.x = Math.max(0.01, q.radius * run); m.material.opacity = 1 - cool; }
      if (since < 0) continue;
      const k = since / R.domeTime;
      q.dome.scale.set(R.dome * ease(k * 2.5), R.dome * ease(k * 2.5) * (1 - 0.6 * clamp01(k - 0.4)), R.dome * ease(k * 2.5));
      q.dome.material.uniforms.uAlpha.value = 0.5 * (1 - clamp01((k - 0.4) / 0.6)); q.dome.visible = k < 1;
      const rk = since / R.ring;
      q.ring.scale.setScalar(Math.max(0.01, 2 * q.radius * ease(rk))); q.ring.material.opacity = 1 - clamp01((rk - 0.6) / 0.8);
      const dt = Math.min(real, 0.05);
      for (const s of q.slabs) {
        if (!s.down) {
          s.vy -= 22 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.rx += s.sx * dt; s.rz += s.sz * dt;
          if (s.y <= q.y && s.vy < 0) { s.y = q.y + 0.05; s.down = true; s.rx = Math.round(s.rx / Math.PI) * Math.PI; s.rz = Math.round(s.rz / Math.PI) * Math.PI; at.x = s.x; at.y = s.y; at.z = s.z; throwDrops(s.x, s.y + 0.1, s.z, 3, C_STONE, 2, 2, 14, 0.4); }
        }
        const fade = clamp01((since - R.slabLife) / R.fade);
        for (let j = 0; j < 2; j++) { const m = j ? s.ember : s.stone; m.position.set(s.x, s.y - fade * 0.3, s.z); m.rotation.x = s.rx; m.rotation.z = s.rz; m.visible = fade < 1; }
      }
    }
  }

  // ---- Heaven's Lance -------------------------------------------------------------------------------------------
  function lanceCall(d, e) {
    const q = free(lances), v = d.v || {};
    q.age = 0; q.landed = Infinity; q.e = e; q.h = d.holder; q.time = v.time || 2; q.x = e.x; q.z = e.z; q.y = e.y;
    q.sigil.position.set(e.x, e.y + 0.04, e.z); q.sigil.scale.setScalar(0.01); q.sigil.material.opacity = 1; q.sigil.visible = true;
    q.hole.position.set(e.x, e.y + K().columnTop, e.z); q.hole.scale.setScalar(0.01); q.hole.material.opacity = 1; q.hole.visible = true;
    q.core.visible = q.outer.visible = false;
    dimFor(e, U().beam);
  }
  function lanceBurn(d, e) {
    let q = lances.find(g => g.e === e && g.h === d.holder && g.age !== Infinity);
    if (!q) { lanceCall(d, e); q = lances.find(g => g.e === e && g.h === d.holder && g.age === 0); q.age = U().beam; }
    chestOf(e, at);
    if (d.strike === 1) {
      q.landed = q.age;
      impactFrame.hit(e.x, e.z); clap(at.x, at.y, at.z, 2.2);
      ultraFx.sparkBurst(at, 40, 'gold', [0, 1, 0], 0.4, 1.3); ultraFx.flashAt(at, C_CORE, 40, 20); light(at, C_CORE, 16, 18);
    }
    pulse(e.x, e.y, e.z, (e.radius || 1) + 1.6, 0.3); throwDrops(e.x, e.y + 0.3, e.z, 5, C_CORE, 3, 5, 10, 0.5);
  }
  function drawLances(real) {
    const R = K(), lead = U().beam, p = Game.player;
    for (const q of lances) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, e = q.e, since = t - q.landed, end = q.time + 0.1;
      if (!e || t > lead + q.time + 1.5 || since > end + R.fade) { q.age = Infinity; q.e = null; q.sigil.visible = q.hole.visible = q.core.visible = q.outer.visible = false; continue; }
      if (e.alive()) { q.x = e.x; q.z = e.z; q.y = e.y; }
      const fade = since > 0 ? clamp01((since - end) / R.fade) : 0, grow = ease(t / lead);
      q.sigil.position.set(q.x, q.y + 0.04, q.z); q.sigil.scale.setScalar(R.sigil * grow); q.sigil.rotation.y = t * 1.4; q.sigil.material.opacity = 1 - fade;
      q.hole.position.set(q.x, q.y + R.columnTop, q.z); q.hole.scale.setScalar(R.column * 4 * grow); q.hole.rotation.y = -t * 0.5; q.hole.material.opacity = 1 - fade;
      if (since < 0) continue;
      const land = ease(since / 0.08), thin = 1 - 0.7 * fade, pulseK = 1 + (reducedMotion() ? 0 : 0.05 * Math.sin(since * 30));
      const see = p && Math.hypot(p.x - q.x, p.z - q.z) < R.seeNear + R.column ? 1 - R.see : 1;   // see-through near the player
      q.outer.position.set(q.x, q.y + R.columnTop * (1 - land), q.z); q.outer.scale.set(R.column * thin * pulseK, R.columnTop * land + 0.01, R.column * thin * pulseK);
      q.core.position.copy(q.outer.position); q.core.scale.set(R.column * 0.5 * thin, R.columnTop * land + 0.01, R.column * 0.5 * thin);
      q.outer.material.uniforms.uAlpha.value = 0.7 * see * (1 - fade); q.core.material.uniforms.uAlpha.value = see * (1 - fade);
      q.core.material.transparent = q.core.material.uniforms.uAlpha.value < 1;
      q.core.visible = q.outer.visible = fade < 1;
    }
  }

  // ---- Frozen Lotus ---------------------------------------------------------------------------------------------
  function lotusCall(d, e) {
    const q = free(lotuses);
    q.age = 0; q.bloom = q.broke = Infinity; q.e = e; q.h = d.holder; q.x = e.x; q.y = e.y; q.z = e.z; q.n = 0;
    q.frost.position.set(e.x, e.y + 0.04, e.z); q.frost.scale.setScalar(0.01); q.frost.material.opacity = 1; q.frost.visible = true;
    for (const m of q.crown) m.visible = false;
    for (const pm of q.petals) for (const m of pm) m.visible = false;
    for (const s of q.spears) { s.age = Infinity; for (const m of s.m) m.visible = false; }
    q.ice.uniforms.uAlpha.value = 0.82; q.edge.uniforms.uAlpha.value = 1;
    dimFor(e, U().lotus);
  }
  function lotusPetal(d, e) {
    let q = lotuses.find(g => g.e === e && g.h === d.holder && g.age !== Infinity && g.broke === Infinity);
    if (!q) { lotusCall(d, e); q = lotuses.find(g => g.e === e && g.h === d.holder && g.age === 0); q.age = U().lotus; }
    const v = d.v || {}, last = Math.round((v.time || 3) / (v.every || 0.3));
    if (d.strike === 1 || q.bloom === Infinity) {
      q.bloom = q.age; q.x = e.x; q.z = e.z; q.y = e.y;
      for (const m of q.crown) { m.position.set(q.x, q.y + 0.02, q.z); m.scale.setScalar(0.01); m.visible = true; }
      q.petals.forEach((pm, k) => { for (const m of pm) { m.position.set(q.x, q.y + 0.05, q.z); m.rotation.set(0, -(k / PETALS * Math.PI * 2), 1.3); m.visible = true; } });
      chestOf(e, at); ultraFx.sparkBurst(at, 24, 'frost', [0, 1, 0], 0.5, 1); light(at, C_ICE, 10, 12);
    }
    // A spear up through the boss, from a point round its feet, leaning in.
    const s = free(q.spears), a = (q.n++ * 2.39996) % (Math.PI * 2), r = (e.radius || 1) * 0.55;
    s.age = 0; s.a = a;
    for (const m of s.m) { m.position.set(e.x + Math.cos(a) * r, e.y - 4, e.z + Math.sin(a) * r); m.rotation.set(0, -a, 0.28); m.scale.setScalar(1.1); m.visible = true; }
    chestOf(e, at); throwDrops(at.x, at.y, at.z, 5, C_ICE, 3, 3, 12, 0.5); clap(at.x, at.y, at.z, 1);
    if (d.strike === 1) impactFrame.hit(e.x, e.z);
    if (d.strike >= last) {   // the last: it shatters
      q.broke = q.age;
      at.x = q.x; at.y = q.y + 1.2; at.z = q.z;
      throwDrops(q.x, q.y + 1, q.z, 36, C_ICE, 8, 6, 16, 1); throwDrops(q.x, q.y + 1, q.z, 10, 0xffffff, 6, 8, 16, 0.8);
      clap(q.x, q.y + 1.4, q.z, 3.2); pulse(q.x, q.y, q.z, K().frost * 0.7, 0.5);
      ultraFx.sparkBurst(at, 40, 'frost', [0, 1, 0], 0.6, 1.3); light(at, C_ICE, 14, 16);
    }
  }
  function drawLotuses(real) {
    const R = K(), lead = U().lotus;
    for (const q of lotuses) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, bloom = t - q.bloom, broke = t - q.broke;
      if (!q.e || t > lead + 6 || broke > 0.25) {
        q.age = Infinity; q.e = null; q.frost.visible = false; for (const m of q.crown) m.visible = false;
        for (const pm of q.petals) for (const m of pm) m.visible = false;
        for (const s of q.spears) { s.age = Infinity; for (const m of s.m) m.visible = false; }
        continue;
      }
      if (q.broke === Infinity && !q.e.alive()) q.broke = q.age;   // its boss died first: no last petal comes
      const gone = broke > 0 ? clamp01(broke / 0.25) : 0;
      q.frost.scale.setScalar(R.frost * ease(t / lead)); q.frost.material.opacity = 1 - gone;
      if (bloom < 0) continue;
      const open = ease(bloom / 0.25), shrink = 1 - gone;
      for (const m of q.crown) m.scale.setScalar(Math.max(0.01, open * shrink * 1.2));
      for (const pm of q.petals) for (const m of pm) { m.rotation.z = 1.3 * (1 - open) + 0.1; m.scale.setScalar(Math.max(0.01, (0.4 + 0.6 * open) * shrink)); }
      q.ice.uniforms.uAlpha.value = 0.82 * (1 - gone); q.edge.uniforms.uAlpha.value = 1 - gone; q.edge.transparent = gone > 0;
      for (const s of q.spears) {
        if (s.age === Infinity) continue;
        s.age += real;
        const up = ease(s.age / 0.07), down = clamp01((s.age - R.spearLife) / 0.15), y = -4 + 4 * up - 4 * down;
        if (s.age > R.spearLife + 0.15 && gone === 0) { s.age = Infinity; for (const m of s.m) m.visible = false; continue; }
        for (const m of s.m) { m.position.y = q.y + y; m.scale.setScalar(Math.max(0.01, 1.1 * shrink)); }
      }
    }
  }

  // ---- Tempest --------------------------------------------------------------------------------------------------
  function stormCall(d, e) {
    const q = free(storms), v = d.v || {};
    q.age = 0; q.first = q.done = Infinity; q.e = e; q.h = d.holder; q.x = q.tx = e.x; q.z = q.tz = e.z; q.y = e.y; q.radius = v.radius || 6;
    q.cloud.position.set(e.x, e.y + K().funnel, e.z); q.cloud.scale.setScalar(0.01); q.cloud.material.opacity = 1; q.cloud.visible = true;
    for (const m of q.sheets) m.visible = false;
    q.ring.visible = false;
    for (const r of q.rain) { r.s.visible = false; r.y = -1e9; }
    dimFor(e, U().tempest);
  }
  function stormTick(d, e) {
    let q = storms.find(g => g.e === e && g.h === d.holder && g.age !== Infinity && g.done === Infinity);
    if (!q) { stormCall(d, e); q = storms.find(g => g.e === e && g.h === d.holder && g.age === 0); q.age = U().tempest; q.x = d.x; q.z = d.z; }
    const v = d.v || {}, last = Math.round((v.time || 5) / (v.every || 0.25));
    q.tx = d.x; q.tz = d.z;   // the server's middle: eased to below
    if (q.first === Infinity) {
      q.first = q.age; q.x = d.x; q.z = d.z;
      at.x = d.x; at.y = q.y + 1; at.z = d.z; ultraFx.sparkBurst(at, 20, 'storm', [0, 1, 0], 0.5, 1); clap(d.x, q.y + 1.5, d.z, 2);
    }
    if (d.strike % 4 === 0) {   // a small bolt out of the funnel onto the boss
      chestOf(e, at); const a = rnd() * Math.PI * 2;
      bolt(q.x + Math.cos(a) * 2.5, q.y + K().funnel * 0.6, q.z + Math.sin(a) * 2.5, at.x, at.y, at.z, K().bolt * 0.8);
      clap(at.x, at.y, at.z, 0.9); light(at, C_VIOLET, 5, 8);
    }
    if (d.strike >= last) q.done = q.age;
  }
  function drawStorms(real) {
    const R = K(), lead = U().tempest, follow = U().follow, calm = reducedMotion(), dt = Math.min(real, 0.05);
    for (const q of storms) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, e = q.e, since = t - q.first, after = t - q.done;
      if (!e || t > lead + 12 || after > R.fade) {
        q.age = Infinity; q.e = null; q.cloud.visible = q.ring.visible = false; for (const m of q.sheets) m.visible = false;
        for (const r of q.rain) r.s.visible = false; continue;
      }
      if (q.done === Infinity && !e.alive()) q.done = q.age;   // its boss died first: no last tick comes
      if (e.alive()) { const dx = e.x - q.tx, dz = e.z - q.tz, d = Math.hypot(dx, dz), go = Math.min(d, follow * dt); if (d > 1e-6) { q.tx += dx / d * go; q.tz += dz / d * go; } }
      q.x += (q.tx - q.x) * Math.min(1, dt * 10); q.z += (q.tz - q.z) * Math.min(1, dt * 10); q.y = e.y;
      const fade = after > 0 ? clamp01(after / R.fade) : 0, spin = calm ? R.spin * 0.5 : R.spin;
      q.cloud.position.set(q.x, q.y + R.funnel, q.z); q.cloud.scale.setScalar(R.funnelTop * 3.2 * ease(t / lead)); q.cloud.rotation.y = -t * spin * 0.3; q.cloud.material.opacity = 1 - fade;
      if (since < 0) continue;
      const rise = ease(since / 0.3), half = since > R.full;   // the long-aura budget: half the sheets and the rain after `full` s
      for (let k = 0; k < SHEETS; k++) {
        const m = q.sheets[k];
        m.position.set(q.x, q.y, q.z); m.rotation.y = -t * spin * (1 + 0.15 * k) + k * Math.PI * 2 / SHEETS;
        const w = R.funnelTop * (0.85 + 0.1 * k);
        m.scale.set(w, R.funnel * rise, w); m.material.opacity = 0.85 * (1 - fade); m.visible = !(half && k % 2) && fade < 1;
      }
      q.ring.position.set(q.x, q.y + 0.05, q.z); q.ring.scale.setScalar(2 * q.radius * rise); q.ring.rotation.y = t * spin; q.ring.material.opacity = 0.7 * (1 - fade); q.ring.visible = fade < 1;
      const drops = Math.round((half ? R.rain / 2 : R.rain) * Math.max(0.3, density()));   // the rain is the storm's shape: some on every preset
      for (let i = 0; i < RAIN; i++) {
        const r = q.rain[i];
        if (i >= drops || fade >= 1) { r.s.visible = false; continue; }
        r.y -= 22 * dt;
        if (r.y < q.y) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (q.radius + 1); r.x = q.x + Math.cos(a) * d; r.z = q.z + Math.sin(a) * d; r.y = q.y + 6 + rnd() * 8; }
        r.s.position.set(r.x, r.y, r.z); r.s.scale.set(0.05, 0.9, 1); r.s.material.color.setHex(C_PALEV); r.s.material.opacity = 0.7 * (1 - fade); r.s.visible = true;
      }
    }
  }

  // ---- Shared bits ------------------------------------------------------------------------------------------------
  function drawBits(real) {
    for (const b of bolts) {
      if (b.age === Infinity) continue;
      b.age += real;
      if (b.age > b.life) { b.age = Infinity; hideRibbon(b.r); continue; }
      b.r.opacity = 1 - clamp01((b.age / b.life - 0.5) * 2); drawRibbon(b.r);
    }
    for (const c of claps) {
      if (c.age === Infinity) continue;
      c.age += real;
      if (c.age > 0.18) { c.age = Infinity; c.s.visible = false; continue; }
      c.s.scale.setScalar(c.size * (0.5 + 0.5 * clamp01(c.age / 0.04))); c.s.material.opacity = 1 - clamp01((c.age - 0.09) / 0.09);
    }
    for (const p of pulses) {
      if (p.age === Infinity) continue;
      p.age += real;
      const t = p.age / p.life;
      if (t >= 1) { p.age = Infinity; p.m.visible = false; continue; }
      p.m.scale.setScalar(Math.max(0.05, 2 * p.r1 * (1 - (1 - t) ** 2))); p.m.material.opacity = 1 - clamp01((t - 0.5) / 0.5);
    }
    for (const f of drops) {
      if (f.age === Infinity) continue;
      f.age += real;
      if (f.age > f.life) { f.age = Infinity; f.s.visible = false; continue; }
      const dt = Math.min(real, 0.05);
      f.vy -= f.grav * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      f.s.position.set(f.x, f.y, f.z); f.s.material.opacity = 1 - clamp01((f.age / f.life - 0.6) / 0.4);
    }
  }
  function render() {
    if (!made) return;
    const real = effectSlots.real();
    drawDims(real); drawDragons(real); drawQuakes(real); drawLances(real); drawLotuses(real); drawStorms(real); drawBits(real);
  }
  function clear() {
    if (!made) return;
    for (const q of dims) q.age = Infinity;
    impactFrame.dim(0);
    for (const q of dragons) { q.age = Infinity; q.e = null; hideRibbon(q.r); q.head.visible = q.slit.visible = false; }
    for (const q of quakes) { q.age = Infinity; for (const m of q.cracks) m.visible = false; q.dome.visible = q.ring.visible = false; for (const s of q.slabs) s.stone.visible = s.ember.visible = false; }
    for (const q of lances) { q.age = Infinity; q.e = null; q.sigil.visible = q.hole.visible = q.core.visible = q.outer.visible = false; }
    for (const q of lotuses) { q.age = Infinity; q.e = null; q.frost.visible = false; for (const m of q.crown) m.visible = false; for (const pm of q.petals) for (const m of pm) m.visible = false; for (const s of q.spears) { s.age = Infinity; for (const m of s.m) m.visible = false; } }
    for (const q of storms) { q.age = Infinity; q.e = null; q.cloud.visible = q.ring.visible = false; for (const m of q.sheets) m.visible = false; for (const r of q.rain) r.s.visible = false; }
    for (const b of bolts) { b.age = Infinity; hideRibbon(b.r); }
    for (const q of pulses) { q.age = Infinity; q.m.visible = false; }
    for (const q of [...claps, ...drops]) { q.age = Infinity; q.s.visible = false; }
  }
  function power(d) {
    const e = d.enemy;
    switch (d.then) {
      case 'dragon': if (e) (d.strike ? dragonBite : dragonCall)(d, e); break;
      case 'quake': (d.strike ? quakeBurst : quakeCracks)(d); break;
      case 'beam': if (e) (d.strike ? lanceBurn : lanceCall)(d, e); break;
      case 'iceLotus': if (e) (d.strike ? lotusPetal : lotusCall)(d, e); break;
      case 'tempest': if (e) (d.strike ? stormTick : stormCall)(d, e); break;
    }
  }
  const POWERS = new Set(['dragon', 'quake', 'beam', 'iceLotus', 'tempest']);
  const on = list => list.filter(q => q.age !== Infinity).length;
  const shown = list => list.filter(m => m.visible).length;
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.clear.push(clear);
      events.on('abilityPower', d => { if (POWERS.has(d.then)) power(d); });
    },
    clear,
    // tests: what shows now (`aura`: the meshes a storm draws, its rain apart)
    get state() {
      if (!made) return {};
      return { dims: on(dims), dragons: dragons.filter(q => q.r.meshes[0].visible).length, heads: dragons.filter(q => q.head.visible).length, slits: dragons.filter(q => q.slit.visible).length,
        bolts: on(bolts), quakes: on(quakes), cracks: quakes.reduce((n, q) => n + shown(q.cracks), 0), slabs: quakes.reduce((n, q) => n + q.slabs.filter(s => s.stone.visible).length, 0),
        domes: quakes.filter(q => q.dome.visible).length, lances: on(lances), columns: lances.filter(q => q.outer.visible).length, sigils: lances.filter(q => q.sigil.visible).length,
        lotuses: on(lotuses), petals: lotuses.reduce((n, q) => n + q.petals.filter(pm => pm[0].visible).length, 0), spears: lotuses.reduce((n, q) => n + q.spears.filter(s => s.m[0].visible).length, 0),
        storms: on(storms), sheets: storms.reduce((n, q) => n + shown(q.sheets), 0), rain: storms.reduce((n, q) => n + q.rain.filter(r => r.s.visible).length, 0),
        aura: storms.reduce((n, q) => n + shown(q.sheets) + (q.cloud.visible ? 1 : 0) + (q.ring.visible ? 1 : 0), 0), drops: on(drops) };
    },
  };
})();
