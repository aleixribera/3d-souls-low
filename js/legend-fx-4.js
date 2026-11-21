'use strict';
// ============================================================================
// Ultimates II (design/abilities BUILD-ORDER batch 16): drawing only
// ============================================================================
// Key 4's next four, to Ultimates I's bar (js/legend-fx-3.js) and in its cel look (STYLE.md): flat tones inside a black
// ink edge, few big sharp particles, the world dimmed through each one's anticipation. Everything is drawn from
// `abilityPower` (the server's word online) and the time since it, pooled and made at load; nothing allocates per frame.
//   Great Wave     a wave (tools/blender/great_wave.py) rises out of the floor before its holder, leaning back; at the
//                  crash it surges the box's length, curling over and flattening, a foam sheet running out under it,
//                  spray along its front, the impact frame.
//   Sky Blade      a target ring shrinks under the boss while a sword as tall as a tower (tools/blender/sky_blade.py)
//                  forms high over it, following, a line of light from its point; it drops, lands (the impact frame,
//                  a crater, cracks), stands planted with its edges cooling from white-gold to steel, then sinks away;
//                  see-through near the player.
//   Phoenix Dive   its holder's body becomes a firebird (tools/blender/phoenix.py: body, wings and tail turned like
//                  bones), wings beating, a fire ribbon behind it; a burst at each pass, the impact frame at the last,
//                  a ring where it lands.
//   Black Star     a star kindles at its holder's chest and is thrown along a violet trail; where it lands a black sphere
//                  in a burning corona swells, streaks spiralling into it, for its hold; then it collapses: a flash, a
//                  shock ring as wide as its pull, a scorch left on the floor.
// Tuning: VIS.abilityFx.ults2, CONFIG.abilities.ult and .phoenix (the clocks). Sounds: js/audio.js. Camera: js/camera-feel.js.
const legendFx4 = (() => {
  const K = () => VIS.abilityFx.ults2, U = () => CONFIG.abilities.ult;
  const INK = '#0b0b0f', EMBER = '#e59a5c', CORE = '#fff6d8', CREAM = '#fff3dc', VIOLET = '#8f7cf0', PALEV = '#ece6ff', FOAM = '#f4f7fb', SEA = '#2c5f8a';
  const C_INK = 0x0b0b0f, C_EMBER = 0xe59a5c, C_CORE = 0xfff6d8, C_VIOLET = 0x8f7cf0, C_PALEV = 0xece6ff, C_DEEP = 0x1f2a5c, C_SEA = 0x2c5f8a,
    C_FOAM = 0xf4f7fb, C_STEEL = 0x707684, C_FIRE = 0xff8a3a, C_STAR = 0x16121f;
  const rnd = (() => { let s = 9133; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
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
  let FOAMSHEET, MARK, CRATER, RING, VRING, CLAP, VCLAP, DROP, CORONA, SCORCH, KINDLE;
  function textures() {
    FOAMSHEET = canvasTex(128, 256, (g, w, h) => {   // the foam left on the floor, along +v: broken white tongues in ink on sea blue
      g.fillStyle = 'rgba(44,95,138,0.55)'; g.fillRect(w * 0.04, 0, w * 0.92, h);
      for (let i = 0; i < 9; i++) {
        const x = w * (0.08 + 0.84 * i / 8), len = h * (0.5 + 0.45 * ((i * 5) % 4) / 3);
        inked(g, () => poly(g, [[x - 7, h], [x - 4, h - len * 0.7], [x, h - len], [x + 5, h - len * 0.6], [x + 8, h]]), FOAM, 5);
      }
      g.lineWidth = 6; g.strokeStyle = INK; g.strokeRect(w * 0.04, 0, w * 0.92, h);
    });
    MARK = canvasTex(256, 256, (g, w) => {   // where the sword will fall: a ring, four ticks pointing in, a white seam
      const m = w / 2;
      for (const [th, c] of [[18, INK], [10, EMBER], [3, CORE]]) { g.beginPath(); g.arc(m, m, m * 0.84, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a); inked(g, () => poly(g, [[m + c * m * 0.95 - s * 14, m + s * m * 0.95 + c * 14], [m + c * m * 0.55, m + s * m * 0.55], [m + c * m * 0.95 + s * 14, m + s * m * 0.95 - c * 14]]), CREAM, 6, EMBER, 2); }
    });
    CRATER = canvasTex(256, 256, (g, w) => {   // the sword's crater: a dark burnt disc, ember cracks running out of it
      const m = w / 2;
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + 0.3 * (i % 2), pts = [[m, m]];
        for (let k = 1; k <= 5; k++) { const r = m * 0.92 * k / 5, b = a + (k % 2 ? 0.08 : -0.08); pts.push([m + Math.cos(b) * r, m + Math.sin(b) * r]); }
        g.beginPath(); pts.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.lineWidth = 12; g.strokeStyle = INK; g.stroke(); g.lineWidth = 5; g.strokeStyle = EMBER; g.stroke(); g.lineWidth = 1.5; g.strokeStyle = CORE; g.stroke();
      }
      inked(g, () => { g.beginPath(); g.arc(m, m, m * 0.3, 0, Math.PI * 2); }, '#2a2420', 8, EMBER, 3);
    });
    const ring = (fill, edge) => canvasTex(128, 128, (g, w) => {
      const m = w / 2;
      for (const [r, th, c] of [[0.86, 12, INK], [0.86, 6, fill], [0.8, 2, edge]]) { g.beginPath(); g.arc(m, m, m * r, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
    });
    RING = ring(EMBER, CREAM); VRING = ring(VIOLET, PALEV);
    CLAP = canvasTex(128, 128, (g, w) => inked(g, () => poly(g, star(w / 2, 8, 0.24, 0.94)), CREAM, 6, EMBER, 2.5));
    VCLAP = canvasTex(128, 128, (g, w) => inked(g, () => poly(g, star(w / 2, 10, 0.2, 0.94)), PALEV, 6, VIOLET, 3));
    DROP = canvasTex(32, 32, (g, w, h) => { poly(g, [[w * 0.1, h * 0.55], [w * 0.5, h * 0.1], [w * 0.9, h * 0.4], [w * 0.45, h * 0.9]]); g.fillStyle = '#fff'; g.fill(); });
    CORONA = canvasTex(256, 256, (g, w) => {   // the star's corona: a ring of flame tongues in ink, violet outside, ember in
      const m = w / 2;
      inked(g, () => poly(g, star(m, 14, 0.62, 0.96, 0.1)), VIOLET, 10);
      inked(g, () => poly(g, star(m, 14, 0.56, 0.76, 0.32)), EMBER, 6);
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(m, m, m * 0.5, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'source-over';
      g.beginPath(); g.arc(m, m, m * 0.5, 0, Math.PI * 2); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
    });
    SCORCH = canvasTex(256, 256, (g, w) => {   // what the star leaves: a ragged black scorch, violet lines spiralling in
      const m = w / 2, rim = [];
      for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; rim.push([m + Math.cos(a) * m * (0.8 + 0.15 * ((i * 7) % 3) / 2), m + Math.sin(a) * m * (0.8 + 0.15 * ((i * 5) % 3) / 2)]); }
      g.globalAlpha = 0.85; inked(g, () => poly(g, rim), '#141019', 8); g.globalAlpha = 1;
      for (let k = 0; k < 5; k++) { g.beginPath(); for (let i = 0; i <= 16; i++) { const t = i / 16, a = k / 5 * Math.PI * 2 + t * 2.6, r = m * 0.75 * (1 - t); i ? g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r) : g.moveTo(m + Math.cos(a) * r, m + Math.sin(a) * r); } g.lineWidth = 3; g.strokeStyle = VIOLET; g.stroke(); }
    });
    KINDLE = canvasTex(128, 128, (g, w) => {   // the star in the hand: a black four-point star in a violet rim
      inked(g, () => poly(g, star(w / 2, 4, 0.2, 0.9, Math.PI / 4)), '#1a1424', 8, VIOLET, 4);
    });
  }
  const mat = (map, opts = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, ...opts });
  const mesh = (geo, material, order = 12, parent = scene) => {
    const m = new THREE.Mesh(geo, material); m.visible = false; m.renderOrder = order; m.frustumCulled = false; m.userData.warmUp = true; m.rotation.order = 'YXZ';
    parent.add(m); if (parent === scene) pooledFx.push(m); return m;
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

  // ---- Cel models, as js/legend-fx-3.js: each slot flat in its tone, two bands, a rim and a black ink edge -----------
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
      uAlpha: { value: alpha }, uRimOn: { value: rimOn } }, vertexShader: celVertex, fragmentShader: celFragment, transparent: alpha < 1, depthWrite: alpha >= 1, side: THREE.DoubleSide });
  }
  const fadeCel = (m, a, top = 1) => { m.uniforms.uAlpha.value = a * top; m.transparent = a * top < 1; m.depthWrite = !m.transparent; };

  // ---- A camera-facing ribbon through `n` points, in layers, tapered (as js/legend-fx-3.js) -------------------------
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
  const TRAIL_PTS = 18, THROW_PTS = 10, MOTES = 14, DROPS = 90;
  let made = false;
  const dims = [], waves = [], swords = [], birds = [], stars = [], claps = [], pulses = [], drops = [], scorches = [];
  function make() {
    if (made) return;
    made = true; textures();
    const floor = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), ahead = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
    const line = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, -0.5, 0), ball = new THREE.SphereGeometry(1, 20, 14), baked = n => bakedGeometry(n);
    for (let i = 0; i < 4; i++) dims.push({ age: Infinity, lead: 0.5 });
    for (let i = 0; i < 2; i++) {
      const deep = cel(C_DEEP, C_SEA, 1), mid = cel(C_SEA, 0x9cc8e8, 1), foam = cel(C_FOAM, 0xffffff, 0);
      waves.push({ parts: [mesh(baked('wave:body__deep'), deep, 11), mesh(baked('wave:band__mid'), mid, 11), mesh(baked('wave:foam__foam'), foam, 12)], mats: [deep, mid, foam],
        sheet: mesh(ahead, mat(FOAMSHEET), 5), age: Infinity, crash: Infinity, x: 0, y: 0, z: 0, yaw: 0, width: 10, reach: 16, sx: 0, sz: 0 });
      const steel = cel(C_STEEL, 0xd4d8e2, 1), edge = cel(C_CORE, 0xffffff, 0);
      const blade = [mesh(baked('sword:blade__steel'), steel, 11), mesh(baked('sword:blade__edge'), edge, 11)];
      swords.push({ steel: blade[0], edge: blade[1], blade, steelMat: steel, edgeMat: edge,
        mark: mesh(floor, mat(MARK), 5), crater: mesh(floor, mat(CRATER), 4), ray: mesh(line, new THREE.MeshBasicMaterial({ color: C_CORE, transparent: true, depthWrite: false, fog: false }), 10),
        age: Infinity, landed: Infinity, e: null, h: null, x: 0, y: 0, z: 0, spin: 0 });
      const root = new THREE.Group(); root.rotation.order = 'YXZ'; root.visible = false; scene.add(root);
      const ember = cel(C_EMBER, C_FIRE, 1), core = cel(C_CORE, 0xffffff, 0), part = (name, at) => {
        const g = new THREE.Group(); g.position.set(...at); root.add(g);
        mesh(baked(`phoenix:${name}__ember`), ember, 13, g).visible = true; mesh(baked(`phoenix:${name}__core`), core, 13, g).visible = true; return g;
      };
      const body = part('body', [0, 0, 0]), wingR = part('wingR', [0.42, 0.25, 0.4]), wingL = part('wingL', [-0.42, 0.25, 0.4]), tail = part('tail', [0, 0.05, -0.65]);
      const trail = ribbon(TRAIL_PTS, [[C_INK, 11, 1.4], [C_FIRE, 12, 1.1], [C_EMBER, 13, 0.75], [C_CORE, 14, 0.28]]);
      for (let k = 0; k < TRAIL_PTS; k++) trail.taper[k] = (1 - k / (TRAIL_PTS - 1)) ** 0.9;
      birds.push({ root, body, wingR, wingL, tail, ember, core, trail, ring: mesh(floor, mat(RING), 5), age: Infinity, end: 0, b: null, e: null, h: null, lx: 0, ly: 0, lz: 0, yaw: 0, hid: null, n: 0 });
      const throwR = ribbon(THROW_PTS, [[C_INK, 12, 0.7], [C_VIOLET, 13, 0.48], [C_PALEV, 14, 0.14]]);
      for (let k = 0; k < THROW_PTS; k++) throwR.taper[k] = 1 - k / THROW_PTS;
      stars.push({ kindle: sprite(KINDLE, 15), throwR, ball: mesh(ball, cel(C_STAR, C_VIOLET, 1), 13), corona: sprite(CORONA, 12), ring: mesh(floor, mat(VRING), 5),
        motes: Array.from({ length: MOTES }, () => ({ s: sprite(DROP, 14), a: 0, r: 0, y: 0 })), age: Infinity, held: Infinity, burst: Infinity, e: null, h: null, b: null,
        fx: 0, fy: 0, fz: 0, x: 0, y: 0, z: 0, radius: 5, time: 1.5 });
    }
    for (let i = 0; i < 6; i++) claps.push({ s: sprite(CLAP, 15), v: sprite(VCLAP, 15), age: Infinity, size: 1, violet: false });
    for (let i = 0; i < 6; i++) pulses.push({ m: mesh(floor, mat(RING), 4), age: Infinity, r1: 2, life: 0.4 });
    for (let i = 0; i < 3; i++) scorches.push({ m: mesh(floor, mat(SCORCH), 3), age: Infinity, life: 2.5 });
    for (let i = 0; i < DROPS; i++) drops.push({ s: sprite(DROP, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grav: 0 });
  }
  function throwDrops(x, y, z, n, color, speed, up, grav, life, ux = 0, uz = 0) {   // (ux, uz): a lean their way
    const total = Math.max(1, Math.round(n * density()));
    for (let i = 0; i < total; i++) {
      const f = free(drops), a = rnd() * Math.PI * 2, s = speed * (0.4 + 0.6 * rnd());
      f.age = 0; f.life = life * (0.6 + 0.4 * rnd()); f.x = x; f.y = y; f.z = z; f.vx = Math.cos(a) * s + ux * speed; f.vz = Math.sin(a) * s + uz * speed; f.vy = up * (0.5 + rnd()); f.grav = grav;
      f.s.material.color.setHex(color); f.s.material.opacity = 1; f.s.scale.setScalar(0.16 + 0.14 * rnd()); f.s.position.set(x, y, z); f.s.visible = true;
    }
  }
  function clap(x, y, z, size, violet = false) {
    const c = free(claps); c.age = 0; c.size = size; c.violet = violet;
    const s = violet ? c.v : c.s; (violet ? c.s : c.v).visible = false;
    s.position.set(x, y, z); s.material.rotation = rnd() * 6.28; s.visible = true;
  }
  function pulse(x, y, z, r1, life = 0.4, violet = false) {
    const p = free(pulses); p.age = 0; p.r1 = r1; p.life = life; p.m.material.map = violet ? VRING : RING; p.m.position.set(x, y + 0.04, z); p.m.visible = true;
  }
  function scorch(x, y, z, size, map, life) {
    const s = free(scorches); s.age = 0; s.life = life; s.m.material.map = map; s.m.position.set(x, y + 0.03, z); s.m.rotation.y = rnd() * 6.28; s.m.scale.setScalar(size); s.m.material.opacity = 1; s.m.visible = true;
  }
  // The world dim, as Ultimates I's: pressed near the player, the picture darkens over the lead.
  function dimFor(d, lead) {
    const p = Game.player;
    if (!p || !d || Math.hypot(p.x - d.x, p.z - d.z) > VIS.impactFrame.near) return;
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
    if (k > 0) impactFrame.dim(k);
  }
  const at = { x: 0, y: 0, z: 0 };

  // ---- Great Wave -----------------------------------------------------------------------------------------------
  // The aim as the engine takes it: at the enemy pressed on, else along the holder's facing.
  function waveCall(d) {
    const q = free(waves), v = d.v || {}, R = K();
    let yaw = d.yaw ?? (d.body && d.body.yaw) ?? 0;
    if (d.enemy && d.enemy.alive && d.enemy.alive()) yaw = Math.atan2(d.enemy.x - d.x, d.enemy.z - d.z);
    q.age = 0; q.crash = Infinity; q.x = d.x; q.y = d.y; q.z = d.z; q.yaw = yaw; q.width = v.width || 10; q.reach = v.reach || 16;
    q.sx = q.x + Math.sin(yaw) * R.waveAhead; q.sz = q.z + Math.cos(yaw) * R.waveAhead;
    for (const m of q.parts) m.visible = false;
    q.sheet.visible = false;
    q.mats.forEach(m => fadeCel(m, 1));
    throwDrops(q.sx, q.y + 0.3, q.sz, 10, C_FOAM, 3, 4, 14, 0.6);
    dimFor(d, U().wave);
  }
  function waveCrash(d) {
    let q = waves.find(g => g.age !== Infinity && g.crash === Infinity && Math.hypot(g.x - d.x, g.z - d.z) < 0.5);
    if (!q) { waveCall(d); q = waves.find(g => g.age === 0); q.age = U().wave; }   // the press came unseen
    if (Number.isFinite(d.yaw)) q.yaw = d.yaw;
    q.crash = q.age;
    q.sheet.position.set(q.x, q.y + 0.03, q.z); q.sheet.rotation.set(0, q.yaw, 0); q.sheet.scale.set(q.width, 1, 0.01); q.sheet.material.opacity = 1; q.sheet.visible = true;
    const ux = Math.sin(q.yaw), uz = Math.cos(q.yaw), mx = q.x + ux * q.reach * 0.45, mz = q.z + uz * q.reach * 0.45;
    impactFrame.hit(mx, mz); clap(mx, q.y + 2, mz, 3.2);
    for (let k = -2; k <= 2; k++) {   // spray along the whole front
      const px = mx + uz * k * q.width / 5, pz = mz - ux * k * q.width / 5;
      throwDrops(px, q.y + 1.5, pz, 6, k % 2 ? C_FOAM : 0x9cc8e8, 5, 7, 16, 1, ux * 0.6, uz * 0.6);
    }
    at.x = mx; at.y = q.y + 1.5; at.z = mz; light(at, 0x9cc8e8, 12, 18);
  }
  function drawWaves(real) {
    const R = K(), lead = U().wave;
    for (const q of waves) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, since = t - q.crash;
      if (t > lead + 3 || since > R.waveCrash + R.fade + 0.8) { q.age = Infinity; for (const m of q.parts) m.visible = false; q.sheet.visible = false; continue; }
      const ux = Math.sin(q.yaw), uz = Math.cos(q.yaw), sw = q.width / 12, h = R.waveHeight;
      let px = q.sx, pz = q.sz, sy = h * ease(t / lead), pitch = -0.35 * (1 - ease(t / lead)), sz = sw, a = 1;
      if (since >= 0) {   // the crash: surging the box's length, curling over, flattening, then gone into foam
        const f = clamp01(since / R.waveCrash), go = ease(f);
        px = q.sx + ux * (q.reach * 0.75 - R.waveAhead) * go; pz = q.sz + uz * (q.reach * 0.75 - R.waveAhead) * go;
        pitch = 0.95 * go ** 1.5; sy = h * (1 - 0.7 * go); sz = sw * (1 + 0.4 * go);
        a = 1 - clamp01((since - R.waveCrash) / R.fade);
        q.sheet.scale.z = Math.max(0.01, q.reach * go); q.sheet.material.opacity = clamp01(1.6 - since / (R.waveCrash + R.fade + 0.8) * 1.6);
      } else if (t < 0.05) a = t / 0.05;
      for (let k = 0; k < 3; k++) {
        const m = q.parts[k];
        m.position.set(px, q.y - 0.3 * (1 - a), pz); m.rotation.set(pitch, q.yaw, 0); m.scale.set(sw, Math.max(0.01, sy), sz); m.visible = a > 0;
        fadeCel(q.mats[k], a, k === 2 ? 1 : 1);
      }
    }
  }

  // ---- Sky Blade ------------------------------------------------------------------------------------------------
  function swordCall(d, e) {   // `e` null: the landing came unseen and its boss is gone (drawn at the word's place)
    const q = free(swords), o = e || d;
    q.age = 0; q.landed = Infinity; q.e = e; q.h = d.holder; q.x = o.x; q.y = o.y; q.z = o.z; q.spin = rnd() * Math.PI;
    q.mark.position.set(o.x, o.y + 0.04, o.z); q.mark.scale.setScalar(0.01); q.mark.material.opacity = 1; q.mark.visible = true;
    q.crater.visible = false; q.steel.visible = q.edge.visible = q.ray.visible = false;
    q.edgeMat.uniforms.uColor.value.setHex(C_CORE);
    dimFor(o, U().sky);
  }
  function swordLand(d) {
    let q = swords.find(g => g.h === d.holder && g.age !== Infinity && g.landed === Infinity);
    if (!q) { swordCall(d, d.enemy || null); q = swords.find(g => g.h === d.holder && g.age === 0); q.age = U().sky; }
    q.landed = q.age; q.x = d.x; q.y = d.y; q.z = d.z;
    q.mark.visible = q.ray.visible = false;
    q.crater.position.set(q.x, q.y + 0.03, q.z); q.crater.rotation.y = q.spin; q.crater.scale.setScalar(K().crater); q.crater.material.opacity = 1; q.crater.visible = true;
    impactFrame.hit(q.x, q.z); clap(q.x, q.y + 1.5, q.z, 3.6); pulse(q.x, q.y, q.z, U().skyRadius + 1, 0.45);
    throwDrops(q.x, q.y + 0.4, q.z, 26, C_EMBER, 7, 7, 18, 1.1); throwDrops(q.x, q.y + 0.4, q.z, 12, 0x4a4540, 5, 6, 18, 1.2);
    at.x = q.x; at.y = q.y + 1.2; at.z = q.z;
    ultraFx.sparkBurst(at, 44, 'gold', [0, 1, 0], 0.6, 1.4); ultraFx.flashAt(at, C_CORE, 44, 22); light(at, C_CORE, 18, 20);
  }
  function drawSwords(real) {
    const R = K(), lead = U().sky, p = Game.player;
    for (const q of swords) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, since = t - q.landed, e = q.e;
      if (t > lead + 6 || since > R.planted + R.fade) {
        q.age = Infinity; q.e = null; q.mark.visible = q.crater.visible = q.steel.visible = q.edge.visible = q.ray.visible = false; continue;
      }
      if (since < 0) {   // forming high over the boss and following it, then the drop
        if (e && e.alive()) { q.x = e.x; q.y = e.y; q.z = e.z; }
        const form = ease(t / R.form), fall = clamp01((t - (lead - R.drop)) / R.drop), y = q.y + R.skyHigh * (1 - fall * fall);
        q.mark.position.set(q.x, q.y + 0.04, q.z); q.mark.scale.setScalar(R.markSize * (1.6 - 0.6 * ease(t / lead))); q.mark.rotation.y = t * 1.2;
        for (const m of q.blade) { m.position.set(q.x, y, q.z); m.rotation.set(0, q.spin, 0); m.scale.setScalar(R.sword * (0.3 + 0.7 * form)); m.visible = true; }
        fadeCel(q.steelMat, form); fadeCel(q.edgeMat, form);
        q.ray.position.set(q.x, y, q.z); q.ray.scale.set(0.06, Math.max(0.01, y - q.y), 0.06); q.ray.material.opacity = 0.7 * form * (1 - fall); q.ray.visible = fall < 1;
        if (t > lead + 1) q.landed = q.age;   // no word of its landing came (its boss fell first, the server's word lost): it falls anyway
        continue;
      }
      // Planted: its point under the floor, edges cooling from white-gold through ember to steel, then sinking away.
      const cool = clamp01(since / R.cool), sink = clamp01((since - R.planted) / R.fade);
      const c = q.edgeMat.uniforms.uColor.value;
      if (cool < 0.5) c.setHex(C_CORE).lerp(EMBER_C, cool * 2); else c.copy(EMBER_C).lerp(STEEL_C, (cool - 0.5) * 2);
      const near = p && Math.hypot(p.x - q.x, p.z - q.z) < R.seeNear + U().skyRadius ? R.see : 1;   // see-through near the player
      for (const m of q.blade) { m.position.set(q.x, q.y - R.bury - R.sink * sink, q.z); m.visible = sink < 1; }
      fadeCel(q.steelMat, (1 - sink) * near); fadeCel(q.edgeMat, (1 - sink) * near);
      q.crater.material.opacity = 1 - sink;
    }
  }
  const EMBER_C = new THREE.Color(C_EMBER), STEEL_C = new THREE.Color(C_STEEL);

  // ---- Phoenix Dive ---------------------------------------------------------------------------------------------
  function birdCall(d, e) {
    const b = d.body;
    if (!b) return;
    const own = birds.find(g => g.b === b && g.age !== Infinity && g.age < 0.5);
    if (own) { own.h = d.holder; own.e = e; return; }   // already flying from its own press: the server's word names it
    const q = free(birds), P = CONFIG.abilities.phoenix, v = d.v || {}, n = v.strikes || 3;
    if (q.hid) showRig(q);
    q.age = 0; q.b = b; q.e = e; q.h = d.holder; q.n = n; q.end = P.burst + P.up + n * P.dive + (n - 1) * P.gap + P.land;
    q.lx = b.x; q.ly = b.y; q.lz = b.z; q.yaw = b.yaw || 0;
    for (let k = 0; k < TRAIL_PTS; k++) { q.trail.pts[k * 3] = b.x; q.trail.pts[k * 3 + 1] = b.y + 1; q.trail.pts[k * 3 + 2] = b.z; }
    q.ring.visible = false;
    at.x = b.x; at.y = b.y + 0.5; at.z = b.z; ultraFx.sparkBurst(at, 22, 'ember', [0, 1, 0], 0.6, 1); clap(b.x, b.y + 1, b.z, 1.8);
    dimFor(b, P.burst + P.up);
  }
  function birdPass(d, e) {
    const q = birds.find(g => g.h === d.holder && g.age !== Infinity);
    chestOf(e, at);
    clap(at.x, at.y, at.z, 1.8); throwDrops(at.x, at.y, at.z, 10, C_FIRE, 5, 3, 12, 0.6);
    ultraFx.sparkBurst(at, 26, 'ember', null, 0, 1.1); light(at, C_FIRE, 12, 12);
    if (d.strike === (q ? q.n : (d.v && d.v.strikes) || 3)) { impactFrame.hit(e.x, e.z); ultraFx.flashAt(at, C_EMBER, 30, 18); }
  }
  function hideRig(q) { const r = q.b && q.b.rig; if (r && r.root && r.root.visible) { r.root.visible = false; if (r.shadow) r.shadow.visible = false; q.hid = r; } }
  function showRig(q) { const r = q.hid; q.hid = null; if (r && !r.vanishHid) { r.root.visible = true; if (r.shadow) r.shadow.visible = true; } }
  function drawBirds(real, now) {
    const R = K(), P = CONFIG.abilities.phoenix;
    for (const q of birds) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, b = q.b, after = t - q.end;
      if (!b || after > R.fade + 0.3 || (b.alive && !b.alive())) { q.age = Infinity; showRig(q); q.root.visible = false; hideRibbon(q.trail); q.ring.visible = false; continue; }
      if (after > 0 && !q.ring.visible && after < 0.1) { q.ring.position.set(b.x, b.y + 0.05, b.z); q.ring.scale.setScalar(0.01); q.ring.visible = true; throwDrops(b.x, b.y + 0.2, b.z, 10, C_EMBER, 4, 3, 14, 0.5); }
      if (q.ring.visible) { const k = clamp01(after / 0.4); q.ring.scale.setScalar(Math.max(0.01, R.landRing * 2 * ease(k))); q.ring.material.opacity = 1 - k; q.ring.visible = k < 1; }
      const flying = t > P.burst * 0.6 && after < 0;
      if (flying) hideRig(q); else if (q.hid) showRig(q);
      // The bird at the body, turned along its way, banked into turns, wings beating.
      const dx = b.x - q.lx, dy = b.y - q.ly, dz = b.z - q.lz, run = Math.hypot(dx, dz);
      if (run > 1e-3) { const want = Math.atan2(dx, dz); q.yaw += angDiff(want, q.yaw) * Math.min(1, real * 18); }
      const pitch = run > 1e-3 || Math.abs(dy) > 1e-3 ? Math.max(-0.9, Math.min(0.9, -Math.atan2(dy, run + 1e-3))) : 0;
      q.lx = b.x; q.ly = b.y; q.lz = b.z;
      const grow = ease((t - P.burst * 0.6) / 0.12) * (1 - clamp01(after / 0.15));
      q.root.position.set(b.x, b.y + R.birdUp, b.z); q.root.rotation.set(pitch, q.yaw, 0); q.root.scale.setScalar(Math.max(0.01, R.bird * grow)); q.root.visible = flying || after < 0.15 && t > P.burst * 0.6;
      const beat = reducedMotion() ? 0.3 : Math.sin(now * R.flap);
      q.wingR.rotation.z = 0.15 + 0.55 * beat; q.wingL.rotation.z = -0.15 - 0.55 * beat; q.tail.rotation.x = 0.15 * Math.sin(now * R.flap * 0.5 + 1);
      // The fire ribbon: each point eases after the one ahead (no array shifting, nothing made).
      const T = q.trail.pts, follow = Math.min(1, real * 30);
      T[0] = b.x; T[1] = b.y + R.birdUp; T[2] = b.z;
      for (let k = 1; k < TRAIL_PTS; k++) for (let j = 0; j < 3; j++) T[k * 3 + j] += (T[(k - 1) * 3 + j] - T[k * 3 + j]) * follow;
      q.trail.opacity = flying ? 1 : clamp01(1 - after / R.fade);
      if (q.trail.opacity > 0 && t > P.burst) drawRibbon(q.trail, R.trail * R.bird / 0.5); else hideRibbon(q.trail);
    }
  }

  // ---- Black Star -----------------------------------------------------------------------------------------------
  function starCall(d, e) {
    const q = free(stars), v = d.v || {}, b = d.body;
    q.age = 0; q.held = q.burst = Infinity; q.e = e; q.h = d.holder; q.b = b; q.radius = v.radius || 5; q.time = v.time || 1.5;
    if (b) chestOf(b, at); else { at.x = d.x; at.y = d.y + 1; at.z = d.z; }
    q.fx = at.x; q.fy = at.y; q.fz = at.z; q.x = e.x; q.y = e.y; q.z = e.z;
    q.kindle.position.set(at.x, at.y, at.z); q.kindle.scale.setScalar(0.01); q.kindle.visible = true;
    for (let k = 0; k < THROW_PTS; k++) { q.throwR.pts[k * 3] = at.x; q.throwR.pts[k * 3 + 1] = at.y; q.throwR.pts[k * 3 + 2] = at.z; }
    q.ball.visible = q.corona.visible = q.ring.visible = false; for (const m of q.motes) m.s.visible = false;
    dimFor(e, U().star);
  }
  function starArrive(d, e) {
    let q = stars.find(g => g.h === d.holder && g.age !== Infinity && g.held === Infinity);
    if (!q) { if (!e) return; starCall(d, e); q = stars.find(g => g.h === d.holder && g.age === 0); q.age = U().star; }
    q.held = q.age; q.x = d.x; q.y = d.y; q.z = d.z;
    q.kindle.visible = false; hideRibbon(q.throwR);
    q.ball.position.set(q.x, q.y + K().starUp, q.z); q.ball.scale.setScalar(0.01); q.ball.visible = true;
    q.corona.position.copy(q.ball.position); q.corona.scale.setScalar(0.01); q.corona.material.opacity = 1; q.corona.visible = true;
    q.ring.position.set(q.x, q.y + 0.05, q.z); q.ring.scale.setScalar(2 * q.radius); q.ring.material.opacity = 0.8; q.ring.visible = true;
    for (const m of q.motes) { m.a = rnd() * Math.PI * 2; m.r = q.radius * (0.4 + 0.6 * rnd()); m.y = 0.3 + rnd() * 2.6; }
    at.x = q.x; at.y = q.y + K().starUp; at.z = q.z; clap(at.x, at.y, at.z, 2.2, true); light(at, C_VIOLET, 12, 14);
  }
  function starBurst(d) {
    const q = stars.find(g => g.h === d.holder && g.age !== Infinity && g.burst === Infinity);
    const x = q ? q.x : d.x, y = q ? q.y : d.y, z = q ? q.z : d.z, r = q ? q.radius : (d.v && d.v.radius) || 5;
    if (q) q.burst = q.age;
    at.x = x; at.y = y + K().starUp; at.z = z;
    impactFrame.hit(x, z); clap(at.x, at.y, at.z, 4, true); pulse(x, y, z, r, 0.5, true);
    scorch(x, y, z, K().scorch, SCORCH, 2.5);
    throwDrops(at.x, at.y, at.z, 24, C_VIOLET, 8, 4, 10, 0.9); throwDrops(at.x, at.y, at.z, 12, C_PALEV, 6, 5, 10, 0.7);
    ultraFx.sparkBurst(at, 40, 'storm', null, 0, 1.4); ultraFx.flashAt(at, C_PALEV, 40, 22); light(at, C_VIOLET, 18, 20);
  }
  function drawStars(real) {
    const R = K(), fly = U().star;
    for (const q of stars) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, held = t - q.held, since = t - q.burst;
      if (t > fly + q.time + 3 || since > 0.15 || (q.held === Infinity && t > fly + 1)) {
        q.age = Infinity; q.kindle.visible = q.ball.visible = q.corona.visible = q.ring.visible = false; hideRibbon(q.throwR); for (const m of q.motes) m.s.visible = false; continue;
      }
      if (held < 0) {   // kindled at the chest, then thrown along its trail to the boss
        if (q.e && q.e.alive()) { q.x = q.e.x; q.y = q.e.y; q.z = q.e.z; }
        const kin = clamp01(t / 0.08), f = ease(t / fly), tx = q.x, ty = q.y + R.starUp, tz = q.z;
        const sx = q.fx + (tx - q.fx) * f, sy = q.fy + (ty - q.fy) * f + Math.sin(Math.PI * f) * 1.2, sz = q.fz + (tz - q.fz) * f;
        q.kindle.position.set(sx, sy, sz); q.kindle.scale.setScalar(R.kindle * kin); q.kindle.material.rotation = t * 9;
        const P = q.throwR.pts; P[0] = sx; P[1] = sy; P[2] = sz;
        for (let k = 1; k < THROW_PTS; k++) for (let j = 0; j < 3; j++) P[k * 3 + j] += (P[(k - 1) * 3 + j] - P[k * 3 + j]) * Math.min(1, real * 26);
        q.throwR.opacity = 1; drawRibbon(q.throwR);
        continue;
      }
      // The hold: the sphere swells in its corona, streaks spiral in; at the burst it collapses to nothing.
      const swell = ease(held / 0.2), shut = since > 0 ? 1 - clamp01(since / 0.12) : 1, cy = q.y + R.starUp;
      q.ball.scale.setScalar(Math.max(0.01, R.sphere * swell * shut * (1 + (reducedMotion() ? 0 : 0.04 * Math.sin(held * 22)))));
      q.corona.scale.setScalar(Math.max(0.01, R.corona * swell * shut)); q.corona.material.rotation = -held * 2.2;
      q.ring.scale.setScalar(Math.max(0.01, 2 * q.radius * (1 - 0.5 * clamp01(held / q.time)) * shut)); q.ring.rotation.y = held * 1.5; q.ring.material.opacity = 0.8 * shut;
      const n = Math.round(MOTES * Math.max(0.4, density())), dt = Math.min(real, 0.05);
      for (let i = 0; i < MOTES; i++) {
        const m = q.motes[i];
        if (i >= n || since > 0) { m.s.visible = false; continue; }
        m.a += dt * (2.5 + 6 / Math.max(0.4, m.r)); m.r -= dt * (U().pull + 2.5);
        if (m.r < R.sphere * 0.8) { m.a = rnd() * Math.PI * 2; m.r = q.radius; m.y = 0.3 + rnd() * 2.6; }
        const yy = cy + (m.y - R.starUp) * clamp01(m.r / q.radius);
        m.s.position.set(q.x + Math.cos(m.a) * m.r, yy, q.z + Math.sin(m.a) * m.r); m.s.scale.set(0.12, 0.42, 1); m.s.material.rotation = m.a; m.s.material.color.setHex(i % 3 ? C_VIOLET : C_PALEV);
        m.s.material.opacity = 0.9; m.s.visible = true;
      }
    }
  }

  // ---- Shared bits ------------------------------------------------------------------------------------------------
  function drawBits(real) {
    for (const c of claps) {
      if (c.age === Infinity) continue;
      c.age += real;
      const s = c.violet ? c.v : c.s;
      if (c.age > 0.2) { c.age = Infinity; c.s.visible = c.v.visible = false; continue; }
      s.scale.setScalar(c.size * (0.5 + 0.5 * clamp01(c.age / 0.04))); s.material.opacity = 1 - clamp01((c.age - 0.1) / 0.1);
    }
    for (const p of pulses) {
      if (p.age === Infinity) continue;
      p.age += real;
      const t = p.age / p.life;
      if (t >= 1) { p.age = Infinity; p.m.visible = false; continue; }
      p.m.scale.setScalar(Math.max(0.05, 2 * p.r1 * (1 - (1 - t) ** 2))); p.m.material.opacity = 1 - clamp01((t - 0.5) / 0.5);
    }
    for (const s of scorches) {
      if (s.age === Infinity) continue;
      s.age += real;
      if (s.age > s.life) { s.age = Infinity; s.m.visible = false; continue; }
      s.m.material.opacity = 1 - clamp01((s.age / s.life - 0.5) * 2);
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
  let clock = 0;
  function render() {
    if (!made) return;
    const real = effectSlots.real();
    clock += real;
    drawDims(real); drawWaves(real); drawSwords(real); drawBirds(real, clock); drawStars(real); drawBits(real);
  }
  function clear() {
    if (!made) return;
    for (const q of dims) q.age = Infinity;
    for (const q of waves) { q.age = Infinity; for (const m of q.parts) m.visible = false; q.sheet.visible = false; }
    for (const q of swords) { q.age = Infinity; q.e = null; q.mark.visible = q.crater.visible = q.steel.visible = q.edge.visible = q.ray.visible = false; }
    for (const q of birds) { q.age = Infinity; showRig(q); q.b = q.e = null; q.root.visible = false; hideRibbon(q.trail); q.ring.visible = false; }
    for (const q of stars) { q.age = Infinity; q.e = q.b = null; q.kindle.visible = q.ball.visible = q.corona.visible = q.ring.visible = false; hideRibbon(q.throwR); for (const m of q.motes) m.s.visible = false; }
    for (const q of pulses) { q.age = Infinity; q.m.visible = false; }
    for (const q of scorches) { q.age = Infinity; q.m.visible = false; }
    for (const q of claps) { q.age = Infinity; q.s.visible = q.v.visible = false; }
    for (const q of drops) { q.age = Infinity; q.s.visible = false; }
  }
  function power(d) {
    const e = d.enemy;
    switch (d.then) {
      case 'greatWave': (d.strike ? waveCrash : waveCall)(d); break;
      case 'skyBlade': if (d.strike) swordLand(d); else if (e) swordCall(d, e); break;
      case 'phoenix': if (e) (d.strike ? birdPass : birdCall)(d, e); break;
      case 'blackStar': if (d.strike === 2) starBurst(d); else if (d.strike === 1) starArrive(d, e); else if (e) starCall(d, e); break;
    }
  }
  const POWERS = new Set(['greatWave', 'skyBlade', 'phoenix', 'blackStar']);
  const on = list => list.filter(q => q.age !== Infinity).length;
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.clear.push(clear);
      events.on('abilityPower', d => { if (POWERS.has(d.then)) power(d); });
      // This browser's own dive starts as its body takes off (Player.diveStart), not a round trip later with the server's word.
      events.on('abilityPress', d => {
        const b = ABILITY_BY_ID[d.ability];
        if (b && b.power && b.power.then === 'phoenix' && d.body === Game.player && d.body.kit) birdCall({ body: d.body, holder: 'self', v: d.body.kit.pressed.ultimate && d.body.kit.pressed.ultimate.v }, null);
      });
    },
    clear,
    // tests: what shows now
    get state() {
      if (!made) return {};
      return { dims: on(dims), waves: waves.filter(q => q.parts[0].visible).length, foam: waves.filter(q => q.sheet.visible).length,
        swords: swords.filter(q => q.steel.visible).length, marks: swords.filter(q => q.mark.visible).length, craters: swords.filter(q => q.crater.visible).length,
        birds: birds.filter(q => q.root.visible).length, trails: birds.filter(q => q.trail.meshes[0].visible).length, rigsHidden: birds.filter(q => q.hid).length,
        thrown: stars.filter(q => q.kindle.visible).length, spheres: stars.filter(q => q.ball.visible).length, motes: stars.reduce((n, q) => n + q.motes.filter(m => m.s.visible).length, 0),
        scorches: on(scorches), drops: on(drops) };
    },
  };
})();
