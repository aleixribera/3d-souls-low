'use strict';
// ============================================================================
// Ultimates III (design/abilities BUILD-ORDER batch 17): drawing only
// ============================================================================
// Key 4's last four, to Ultimates I and II's bar (js/legend-fx-3.js, -4.js) and in the cel look (STYLE.md): flat tones
// inside a black ink edge, few big sharp particles, the world dimmed through each one's anticipation. Everything is drawn
// from `abilityPower` (the server's word online) and the time since it, pooled and made at load; nothing allocates per frame.
//   World of Ink   a wash rolls out from its holder, a brushed ink circle draws itself round the boss and the picture
//                  inside it turns to ink on paper (the grade pass's `uInk`), embers and red tells left in colour; each
//                  echo an ember brush stroke and an ink splatter on the boss; the circle runs and drips away at its end.
//   Severance      a glint on the hilt in the stillness; at the draw a razor line across the arena, ink beads on it; the
//                  two halves of the picture slide apart on it (the grade pass's `uSplit`), then snap back: the seam on
//                  each enemy it cut, shards along the line, the impact frame; the line fades from its ends in.
//   Colossus       a seam cracks the floor behind its holder and a giant of ash plates and molten seams
//                  (tools/blender/colossus.py) rises out of it to the waist, its fire sword lit, its arc laid on the
//                  floor; it winds up and cuts the arc in one flat smear (the impact frame), then crumbles to embers.
//   Ash Legion     ash lifts behind its holder; ranks of riders and spearmen (tools/blender/ash_legion.py, two instanced
//                  meshes each) rise out of the floor and pour down the lane through the boss, a dust wall at their
//                  front, each crumbling to ash at the lane's end; the impact frame as the front rank hits.
// Tuning: VIS.abilityFx.ults3, CONFIG.abilities.ult (the clocks). Sounds: js/audio.js. Camera: js/camera-feel.js.
const legendFx5 = (() => {
  const K = () => VIS.abilityFx.ults3, U = () => CONFIG.abilities.ult;
  const INK = '#0b0b0f', EMBER = '#e59a5c', CREAM = '#fff3dc', PAPER = '#e9e4d8', ASH = '#6a645e';
  const C_INK = 0x0b0b0f, C_EMBER = 0xe59a5c, C_CREAM = 0xfff3dc, C_CORE = 0xfff6d8, C_PLATE = 0x2a2420, C_ASH = 0x6a645e, C_DUST = 0x5a5550, C_FIRE = 0xff8a3a;
  const rnd = (() => { let s = 17713; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
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
  let ENSO, WASH, STROKE, SPLAT, GLINT, SEAM, CRACK, ARC, DUST, TRAIL, DROP, CLAP;
  function textures() {
    ENSO = canvasTex(512, 512, (g, w) => {   // one brushed ink circle, drawn in a single stroke: thick, thinning, dry gaps, an ember bleed inside
      const m = w / 2, r = m * 0.86;
      for (let i = 0; i < 120; i++) {
        const a0 = -1.9 + i / 120 * 5.9, a1 = a0 + 5.9 / 120 + 0.01, t = i / 120;
        const th = 46 * (1 - 0.65 * t) * (0.85 + 0.15 * Math.sin(i * 1.7));
        if (t > 0.55 && (i % 9 === 3 || i % 13 === 5)) continue;   // the dry brush's gaps
        g.beginPath(); g.arc(m, m, r, a0, a1); g.lineWidth = th; g.strokeStyle = INK; g.stroke();
        g.beginPath(); g.arc(m, m, r - th * 0.5 - 4, a0, a1); g.lineWidth = 5; g.strokeStyle = EMBER; g.stroke();
      }
      for (let k = 0; k < 14; k++) { const a = -1.9 + 5.9 * (0.2 + 0.8 * ((k * 7) % 14) / 14), d = r + 26 + 18 * ((k * 3) % 5) / 5; g.beginPath(); g.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, 3 + (k % 3) * 2, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); }
    });
    WASH = canvasTex(256, 256, (g, w) => {   // the wash rolling out: a ragged ink ring, paper-grey inside
      const m = w / 2, rim = [];
      for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; rim.push([m + Math.cos(a) * m * (0.86 + 0.08 * ((i * 7) % 5) / 4), m + Math.sin(a) * m * (0.86 + 0.08 * ((i * 7) % 5) / 4)]); }
      poly(g, rim); g.fillStyle = 'rgba(233,228,216,0.35)'; g.fill(); g.lineWidth = 18; g.strokeStyle = INK; g.stroke();
    });
    STROKE = canvasTex(256, 64, (g, w, h) => {   // an ember brush stroke: thick in the middle, dry at both ends, a white core
      for (let i = 0; i < 60; i++) {
        const t = i / 59, x = w * (0.04 + 0.92 * t), th = h * 0.42 * Math.sin(Math.PI * t) ** 0.6;
        if ((t < 0.12 || t > 0.85) && i % 3 === 1) continue;
        g.beginPath(); g.moveTo(x, h / 2 - th / 2); g.lineTo(x, h / 2 + th / 2); g.lineWidth = w / 50; g.strokeStyle = INK; g.stroke();
        g.beginPath(); g.moveTo(x, h / 2 - th * 0.36); g.lineTo(x, h / 2 + th * 0.36); g.strokeStyle = EMBER; g.stroke();
        g.beginPath(); g.moveTo(x, h / 2 - th * 0.1); g.lineTo(x, h / 2 + th * 0.1); g.strokeStyle = CREAM; g.stroke();
      }
    });
    SPLAT = canvasTex(128, 128, (g, w) => {   // a small black splatter
      const m = w / 2;
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + (k % 2) * 0.3, d = m * (0.3 + 0.5 * ((k * 5) % 7) / 7); g.beginPath(); g.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, 4 + (k % 3) * 3, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); }
      g.beginPath(); g.arc(m, m, m * 0.22, 0, Math.PI * 2); g.fill();
    });
    GLINT = canvasTex(64, 64, (g, w) => inked(g, () => poly(g, [[w / 2, 2], [w * 0.56, w * 0.44], [w - 2, w / 2], [w * 0.56, w * 0.56], [w / 2, w - 2], [w * 0.44, w * 0.56], [2, w / 2], [w * 0.44, w * 0.44]]), CREAM, 4, EMBER, 1.5));
    SEAM = canvasTex(64, 256, (g, w, h) => {   // the cut opening across a body: a long bright sliver in ink
      inked(g, () => poly(g, [[w / 2, 4], [w * 0.62, h * 0.5], [w / 2, h - 4], [w * 0.38, h * 0.5]]), CREAM, 7, EMBER, 3);
    });
    CRACK = canvasTex(256, 64, (g, w, h) => {   // the floor seam the giant rises from: a jagged ember crack in ink
      const pts = []; for (let i = 0; i <= 14; i++) pts.push([w * (0.03 + 0.94 * i / 14), h / 2 + (i % 2 ? 1 : -1) * h * 0.18 * ((i * 3) % 4) / 3]);
      for (const [th, c] of [[18, INK], [9, EMBER], [3, CREAM]]) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
    });
    ARC = canvasTex(256, 256, (g, w) => {   // the giant's shadow on the floor (a sector, drawn on a ring sector's uvs): ink with an ember rim
      g.fillStyle = 'rgba(11,11,15,0.45)'; g.fillRect(0, 0, w, w);
      g.fillStyle = EMBER; g.fillRect(0, w * 0.9, w, w * 0.1); g.fillStyle = INK; g.fillRect(0, w * 0.86, w, w * 0.04);
    });
    DUST = canvasTex(128, 64, (g, w, h) => {   // the dust wall at the charge's front: a ragged band of ash in ink
      const pts = [[0, h]]; for (let i = 0; i <= 10; i++) pts.push([w * i / 10, h * (0.25 + 0.3 * ((i * 7) % 5) / 4)]); pts.push([w, h]);
      inked(g, () => poly(g, pts), 'rgba(90,85,80,0.85)', 5);
    });
    TRAIL = canvasTex(64, 256, (g, w, h) => {   // the trampled lane left on the floor: dust streaks along +v
      for (let i = 0; i < 7; i++) { const x = w * (0.1 + 0.8 * i / 6); g.beginPath(); g.moveTo(x, h); g.lineTo(x + (i % 2 ? 3 : -3), h * (0.1 + 0.3 * ((i * 3) % 4) / 3)); g.lineWidth = 5; g.strokeStyle = 'rgba(90,85,80,0.8)'; g.stroke(); }
    });
    DROP = canvasTex(32, 32, (g, w, h) => { poly(g, [[w * 0.1, h * 0.55], [w * 0.5, h * 0.1], [w * 0.9, h * 0.4], [w * 0.45, h * 0.9]]); g.fillStyle = '#fff'; g.fill(); });
    CLAP = canvasTex(128, 128, (g, w) => {
      const m = w / 2, pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = m * (i % 2 ? 0.24 : 0.94); pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); }
      inked(g, () => poly(g, pts), CREAM, 6, EMBER, 2.5);
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

  // ---- Cel models, as js/legend-fx-4.js, here with instancing for the legion ------------------------------------
  const celVertex = `
    varying vec3 vN; varying vec3 vV;
    void main() {
      vec4 p = vec4(position, 1.0); vec3 n = normal;
      #ifdef USE_INSTANCING
        p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
      #endif
      vec4 mv = modelViewMatrix * p; vN = normalize(normalMatrix * n); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
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
  const fadeCel = (m, a) => { m.uniforms.uAlpha.value = a; m.transparent = a < 1; m.depthWrite = !m.transparent; };

  // ---- A camera-facing ribbon through `n` points, in layers (as js/legend-fx-4.js) ------------------------------
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
  const LINE_PTS = 17, BEADS = 20, FLECKS = 30, DROPS = 110, STROKES = 6;
  let made = false;
  const dims = [], inks = [], strokes = [], cuts = [], giants = [], legions = [], claps = [], drops = [];
  let ARMY_R = 8, ARMY_S = 10;
  function make() {
    if (made) return;
    made = true; textures();
    const floor = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), ahead = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
    const baked = n => bakedGeometry(n), R = K();
    ARMY_R = R.riders; ARMY_S = R.spearmen;
    for (let i = 0; i < 4; i++) dims.push({ age: Infinity, lead: 0.5 });
    for (let i = 0; i < 2; i++) {
      inks.push({ enso: mesh(floor, mat(ENSO), 5), wash: mesh(floor, mat(WASH), 4), palm: sprite(GLINT, 15), age: Infinity, h: null, b: null, e: null,
        x: 0, y: 0, z: 0, fx: 0, fz: 0, time: 8, mine: false, flecks: Array.from({ length: FLECKS }, () => ({ s: sprite(DROP, 13), x: 0, y: 0, z: 0, v: 0 })) });
      const line = ribbon(LINE_PTS, [[C_EMBER, 12, 0.5], [C_CREAM, 13, 0.07]]);
      cuts.push({ line, glint: sprite(GLINT, 15), beads: Array.from({ length: BEADS }, () => ({ s: sprite(DROP, 14), along: 0 })),
        seams: Array.from({ length: 3 }, () => ({ s: sprite(SEAM, 15), e: null })), age: Infinity, snap: Infinity, h: null, b: null,
        x: 0, y: 0, z: 0, ux: 0, uz: 1, mid: 0 });
      const plate = cel(C_PLATE, C_EMBER, 1), seam = cel(C_CORE, 0xffffff, 0), fire = cel(C_EMBER, C_FIRE, 1), core = cel(C_CORE, 0xffffff, 0);
      const root = new THREE.Group(); root.rotation.order = 'YXZ'; root.visible = false; scene.add(root);
      const arms = new THREE.Group(); arms.rotation.order = 'YXZ'; root.add(arms);
      for (const [n, m] of [['body__plate', plate], ['body__seam', seam]]) mesh(baked('colossus:' + n), m, 11, root).visible = true;
      for (const [n, m] of [['arms__plate', plate], ['arms__seam', seam], ['sword__fire', fire], ['sword__core', core]]) mesh(baked('colossus:' + n), m, 11, arms).visible = true;
      const smear = mesh(new THREE.RingGeometry(3, 1, 24, 1, 0, 1).rotateX(-Math.PI / 2), mat(ARC, { color: 0xffffff }), 12);
      smear.material.map = STROKE;
      giants.push({ root, arms, mats: [plate, seam, fire, core], crack: mesh(floor, mat(CRACK), 4), arc: mesh(new THREE.RingGeometry(0.4, 1, 24, 1, 0, 1).rotateX(-Math.PI / 2), mat(ARC), 5),
        smear, age: Infinity, h: null, b: null, x: 0, y: 0, z: 0, gx: 0, gz: 0, yaw: 0, reach: 14, swung: false });
      const ash = cel(C_ASH, 0xbdb6ad, 1), ember = cel(C_EMBER, C_CREAM, 0);
      const inst = (name, m, count) => { const im = new THREE.InstancedMesh(baked(name), m, count); im.visible = false; im.frustumCulled = false; im.renderOrder = 11; im.userData.warmUp = true; scene.add(im); pooledFx.push(im); return im; };
      legions.push({ rider: [inst('legion:rider__ash', ash, ARMY_R), inst('legion:rider__ember', ember, ARMY_R)], spear: [inst('legion:spear__ash', ash, ARMY_S), inst('legion:spear__ember', ember, ARMY_S)],
        mats: [ash, ember], dust: sprite(DUST, 13), trail: mesh(ahead, mat(TRAIL), 4), band: mesh(floor, mat(WASH), 4),
        figs: Array.from({ length: ARMY_R + ARMY_S }, (_, k) => ({ rider: k < ARMY_R, slot: k < ARMY_R ? k : k - ARMY_R, s: 0, side: 0, phase: rnd() * 6.28 })),
        age: Infinity, h: null, x: 0, y: 0, z: 0, ux: 0, uz: 1, time: 2.5, front: 0 });
    }
    for (const q of legions) q.all = [...q.rider, ...q.spear];   // made once: the draw loops walk it
    for (let i = 0; i < STROKES; i++) strokes.push({ s: sprite(STROKE, 15), splat: sprite(SPLAT, 14), age: Infinity, rot: 0 });
    for (let i = 0; i < 6; i++) claps.push({ s: sprite(CLAP, 15), age: Infinity, size: 1 });
    for (let i = 0; i < DROPS; i++) drops.push({ s: sprite(DROP, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grav: 0 });
  }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), EUL = new THREE.Euler(0, 0, 0, 'YXZ'), POS = new THREE.Vector3(), SCL = new THREE.Vector3();
  function throwDrops(x, y, z, n, color, speed, up, grav, life, ux = 0, uz = 0) {
    const total = Math.max(1, Math.round(n * density()));
    for (let i = 0; i < total; i++) {
      const f = free(drops), a = rnd() * Math.PI * 2, s = speed * (0.4 + 0.6 * rnd());
      f.age = 0; f.life = life * (0.6 + 0.4 * rnd()); f.x = x; f.y = y; f.z = z; f.vx = Math.cos(a) * s + ux * speed; f.vz = Math.sin(a) * s + uz * speed; f.vy = up * (0.5 + rnd()); f.grav = grav;
      f.s.material.color.setHex(color); f.s.material.opacity = 1; f.s.scale.setScalar(0.16 + 0.14 * rnd()); f.s.position.set(x, y, z); f.s.visible = true;
    }
  }
  function clap(x, y, z, size) { const c = free(claps); c.age = 0; c.size = size; c.s.position.set(x, y, z); c.s.material.rotation = rnd() * 6.28; c.s.visible = true; }
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
  const aim = d => {   // the engine's aim: the told yaw, else at the enemy pressed on, else the holder's facing
    if (Number.isFinite(d.yaw) && d.strike) return d.yaw;
    if (d.enemy && d.enemy.alive && d.enemy.alive()) return Math.atan2(d.enemy.x - d.x, d.enemy.z - d.z);
    return d.yaw ?? (d.body && d.body.yaw) ?? 0;
  };
  const holderBody = d => d.body || (d.holder === 'self' ? Game.player : null);
  const mineOf = d => d.body === Game.player || d.holder === 'self';
  const grade = () => visuals.passes && visuals.passes.grade && visuals.passes.grade.uniforms;
  const NDC = new THREE.Vector3(), NDC2 = new THREE.Vector3();

  // ---- World of Ink ---------------------------------------------------------------------------------------------
  function inkCall(d) {
    const q = free(inks), R = K(), b = holderBody(d), e = d.enemy && d.enemy.alive && d.enemy.alive() ? d.enemy : null, yaw = aim(d);
    q.age = 0; q.h = d.holder; q.b = b; q.e = e; q.time = (d.v && d.v.time) || 8; q.mine = mineOf(d);
    q.fx = d.x; q.fz = d.z;
    q.x = e ? e.x : d.x + Math.sin(yaw) * 4; q.y = e ? e.y : d.y; q.z = e ? e.z : d.z + Math.cos(yaw) * 4;
    q.enso.position.set(q.x, q.y + 0.05, q.z); q.enso.rotation.y = rnd() * 6.28; q.enso.visible = false;
    q.wash.position.set(q.fx, q.y + 0.04, q.fz); q.wash.scale.setScalar(0.01); q.wash.visible = true;
    if (b) chestOf(b, at); else { at.x = d.x; at.y = d.y + 1.2; at.z = d.z; }
    q.palm.position.set(at.x + Math.sin(yaw) * 0.5, at.y, at.z + Math.cos(yaw) * 0.5); q.palm.scale.setScalar(0.01); q.palm.visible = true;
    for (const f of q.flecks) { const a = rnd() * 6.28, r = R.enso / 2 * Math.sqrt(rnd()); f.x = q.x + Math.cos(a) * r; f.z = q.z + Math.sin(a) * r; f.y = q.y + 1 + rnd() * 6; f.v = 0.6 + rnd() * 0.8; f.s.visible = false; }
    dimFor(d, R.close);
  }
  function inkStroke(d) {
    const e = d.enemy;
    if (!e) return;
    const s = free(strokes); chestOf(e, at);
    s.age = 0; s.rot = rnd() * Math.PI;
    s.s.position.set(at.x, at.y, at.z); s.s.material.rotation = s.rot; s.s.visible = true;
    s.splat.position.set(at.x + (rnd() - 0.5) * 0.6, at.y + (rnd() - 0.5) * 0.6, at.z + (rnd() - 0.5) * 0.6); s.splat.material.rotation = rnd() * 6.28; s.splat.visible = false;
  }
  function drawInks(real) {
    const R = K(), G = grade(), p = Game.player;
    let strength = 0, best = null;
    for (const q of inks) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, end = R.close + q.time, after = t - end;
      if (after > R.inkFade) { q.age = Infinity; q.enso.visible = q.wash.visible = q.palm.visible = false; for (const f of q.flecks) f.s.visible = false; q.e = q.b = null; continue; }
      // The palm, the wash rolling out to the circle, the circle drawing itself shut.
      q.palm.scale.setScalar(Math.max(0.01, 0.9 * ease(t / 0.15))); q.palm.material.opacity = 1 - clamp01((t - 0.35) / 0.15); q.palm.visible = t < 0.5;
      const roll = clamp01((t - 0.2) / 0.4);
      q.wash.position.set(q.fx + (q.x - q.fx) * roll, q.y + 0.04, q.fz + (q.z - q.fz) * roll);
      q.wash.scale.setScalar(Math.max(0.01, R.enso * (0.3 + 0.75 * roll))); q.wash.material.opacity = 1 - clamp01((t - 0.55) / 0.2); q.wash.visible = t < 0.75 && t > 0.2;
      const draw = clamp01((t - 0.45) / (R.close - 0.45));
      q.enso.visible = t > 0.45;
      q.enso.scale.setScalar(R.enso * (1.12 - 0.12 * ease(draw)));
      q.enso.material.opacity = (after > 0 ? 1 - clamp01(after / R.inkFade) : 1) * ease(draw);
      if (after > 0) q.enso.position.y = q.y + 0.05 - 0.4 * after;   // the ink runs down as it goes
      if (t >= R.close && t - real < R.close) { impactFrame.hit(q.x, q.z); at.x = q.x; at.y = q.y + 1; at.z = q.z; clap(q.x, q.y + 2, q.z, 3); }
      // The painting: ink flecks drifting down inside it.
      const n = Math.round(FLECKS * Math.max(0.55, density())), dt = Math.min(real, 0.05);
      for (let i = 0; i < FLECKS; i++) {
        const f = q.flecks[i];
        if (i >= n || t < R.close || after > 0) { f.s.visible = false; continue; }
        f.y -= f.v * dt; if (f.y < q.y) f.y = q.y + 6;
        f.s.position.set(f.x, f.y, f.z); f.s.material.color.setHex(C_INK); f.s.scale.setScalar(0.12); f.s.material.opacity = 0.85; f.s.visible = true;
      }
      // The grade: full for its holder, half for a viewer inside the circle, none for anyone else.
      const inside = p && Math.hypot(p.x - q.x, p.z - q.z) < R.enso / 2;
      const k = (q.mine ? 1 : inside ? R.half : 0) * (reducedMotion() ? clamp01((t - R.close) / 0.3) : t >= R.close ? 1 : 0) * (after > 0 ? 1 - clamp01(after / R.inkFade) : 1);
      if (k > strength) { strength = k; best = q; }
    }
    if (!G) return;
    G.uInk.value = strength;
    if (best && strength > 0) {   // the circle's middle on screen, its radius in screen heights (all of it with the camera inside)
      NDC.set(best.x, best.y, best.z).project(camera);
      const inCircle = Math.hypot(camera.position.x - best.x, camera.position.z - best.z) < R.enso / 2 + 2;
      NDC2.set(best.x + camera.matrixWorld.elements[0] * R.enso / 2, best.y + camera.matrixWorld.elements[1] * R.enso / 2, best.z + camera.matrixWorld.elements[2] * R.enso / 2).project(camera);
      const r = Math.hypot((NDC2.x - NDC.x) * camera.aspect, NDC2.y - NDC.y) / 2;
      G.uInkAt.value.set((NDC.x + 1) / 2, (NDC.y + 1) / 2, inCircle || NDC.z > 1 ? 10 : r * 1.25);
    }
    for (const s of strokes) {
      if (s.age === Infinity) continue;
      s.age += real;
      const t = s.age, Rr = K();
      if (t > 0.45) { s.age = Infinity; s.s.visible = s.splat.visible = false; continue; }
      const draw = ease(t / 0.08);
      s.s.scale.set(Rr.stroke * draw, Rr.stroke * 0.25, 1); s.s.material.opacity = 1 - clamp01((t - 0.25) / 0.2);
      s.splat.visible = t > 0.06; s.splat.scale.setScalar(0.9 * ease((t - 0.06) / 0.06)); s.splat.material.opacity = 1 - clamp01((t - 0.3) / 0.15);
    }
  }

  // ---- Severance --------------------------------------------------------------------------------------------------
  function cutCall(d) {
    const q = free(cuts), b = holderBody(d), yaw = aim(d);
    q.age = 0; q.snap = Infinity; q.h = d.holder; q.b = b; q.x = d.x; q.y = d.y; q.z = d.z; q.ux = Math.sin(yaw); q.uz = Math.cos(yaw);
    const e = d.enemy && d.enemy.alive && d.enemy.alive() ? d.enemy : null;
    q.mid = e ? Math.max(1, (e.x - q.x) * q.ux + (e.z - q.z) * q.uz) : 6;
    if (b) chestOf(b, at); else { at.x = d.x; at.y = d.y + 1; at.z = d.z; }
    q.glint.position.set(at.x + q.uz * 0.3, at.y - 0.3, at.z - q.ux * 0.3); q.glint.scale.setScalar(0.01); q.glint.visible = true;
    hideRibbon(q.line); for (const k of q.beads) k.s.visible = false; for (const s of q.seams) s.s.visible = false;
    dimFor(d, U().cut);
  }
  function cutSnap(d) {
    let q = cuts.find(g => g.h === d.holder && g.age !== Infinity && g.snap === Infinity);
    if (!q) { cutCall(d); q = cuts.find(g => g.h === d.holder && g.age === 0); q.age = U().cut; }
    q.snap = q.age; q.x = d.x; q.z = d.z; q.ux = Math.sin(d.yaw); q.uz = Math.cos(d.yaw);
    const L = U().cutLength, W = U().cutWidth, R = K();
    let n = 0;
    for (const o of Game.enemies) {   // the seam on each enemy the line cut (drawing only: the engine's own test)
      if (n >= q.seams.length || !o.alive()) continue;
      const along = (o.x - q.x) * q.ux + (o.z - q.z) * q.uz, off = Math.abs((o.x - q.x) * q.uz - (o.z - q.z) * q.ux);
      if (Math.abs(along) > L + o.radius || off > W + o.radius) continue;
      const s = q.seams[n++]; s.e = o; chestOf(o, at);
      s.s.position.set(at.x, at.y, at.z); s.s.material.rotation = Math.atan2(q.uz, q.ux) * 0 + 1.2; s.s.scale.set(0.5, (o.height || 2) * 1.2, 1); s.s.material.opacity = 1; s.s.visible = true;
      ultraFx.sparkBurst(at, 30, 'ember', [q.ux, 0.2, q.uz], 0.6, 1.3); light(at, C_CREAM, 14, 16);
      if (n === 1) { impactFrame.hit(o.x, o.z); clap(at.x, at.y, at.z, 3.2); }
    }
    for (let k = 0; k < 6; k++) {   // shards flying along the line from the middle
      const s = (k - 2.5) * 3 + q.mid;
      throwDrops(q.x + q.ux * s, q.y + R.cutUp, q.z + q.uz * s, 5, k % 2 ? C_EMBER : C_INK, 4, 2, 6, 0.8, q.ux * (k < 3 ? -1 : 1), q.uz * (k < 3 ? -1 : 1));
    }
    if (!n) impactFrame.hit(q.x + q.ux * q.mid, q.z + q.uz * q.mid);
  }
  function drawCuts(real) {
    const R = K(), G = grade(), draw = U().cut - 0.4;   // the draw: 0.35 s on
    let split = 0, sq = null;
    for (const q of cuts) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, since = t - q.snap;
      if (since > 0.65 || t > U().cut + 2) { q.age = Infinity; q.glint.visible = false; hideRibbon(q.line); for (const k of q.beads) k.s.visible = false; for (const s of q.seams) { s.s.visible = false; s.e = null; } continue; }
      q.glint.scale.setScalar(0.5 * ease(t / 0.2)); q.glint.material.rotation = t * 3; q.glint.visible = t < draw + 0.05;
      if (t < draw) continue;
      // The line: hair-thin and still, fading from its ends to the middle after the snap.
      const L = U().cutLength, fade = since > 0 ? clamp01(since / 0.65) : 0, P = q.line.pts;
      for (let i = 0; i < LINE_PTS; i++) {
        const s = -L + 2 * L * i / (LINE_PTS - 1);
        P[i * 3] = q.x + q.ux * s; P[i * 3 + 1] = q.y + R.cutUp; P[i * 3 + 2] = q.z + q.uz * s;
        const far = Math.abs(s - q.mid) / (L + Math.abs(q.mid));
        q.line.taper[i] = far > 1 - fade ? 0 : 1 - 0.5 * far;
      }
      q.line.opacity = 1 - fade * 0.4; drawRibbon(q.line, t - draw < 0.03 ? 3 : 1);
      // Ink beads hung along it near the middle.
      for (let k = 0; k < BEADS; k++) {
        const b = q.beads[k];
        if (k >= Math.round(BEADS * Math.max(0.55, density())) || since > 0) { b.s.visible = false; continue; }
        if (!b.s.visible) b.along = q.mid + (rnd() - 0.5) * 24;
        b.s.position.set(q.x + q.ux * b.along, q.y + R.cutUp - 0.05 - 0.15 * clamp01((t - draw) / 0.25) * ((k % 3) + 1) / 3, q.z + q.uz * b.along);
        b.s.material.color.setHex(C_INK); b.s.scale.setScalar(0.14); b.s.material.opacity = 1; b.s.visible = true;
      }
      for (const s of q.seams) if (s.s.visible) {
        if (s.e) { chestOf(s.e, at); s.s.position.set(at.x, at.y, at.z); }
        s.s.material.opacity = 1 - clamp01((since - 0.2) / 0.45);
      }
      // The split: the halves slide apart over the 0.15 s before the snap, never under reduced motion.
      const pre = U().cut - t;
      if (since < 0 && pre < R.splitTime && !reducedMotion()) { const k = 1 - pre / R.splitTime; if (k > split) { split = k; sq = q; } }
    }
    if (!G) return;
    G.uSplitW.value = 0;
    if (sq && split > 0) {   // only where the line crosses the view
      const L = U().cutLength;
      NDC.set(sq.x + sq.ux * (sq.mid - 6), sq.y + R.cutUp, sq.z + sq.uz * (sq.mid - 6)).project(camera);
      NDC2.set(sq.x + sq.ux * (sq.mid + 6), sq.y + R.cutUp, sq.z + sq.uz * (sq.mid + 6)).project(camera);
      if (NDC.z < 1 && NDC2.z < 1 && L > 0) {
        const ax = (NDC2.x - NDC.x) * camera.aspect, ay = NDC2.y - NDC.y, l = Math.hypot(ax, ay) || 1;
        G.uSplit.value.set((NDC.x + 1) / 2, (NDC.y + 1) / 2, -ay / l, ax / l);
        const px = visuals.quality().ultra ? R.split : R.splitNormal;
        G.uSplitW.value = px * ease(split) * (renderer.getPixelRatio ? renderer.getPixelRatio() : 1);
      }
    }
  }

  // ---- Colossus ---------------------------------------------------------------------------------------------------
  function giantCall(d) {
    const q = free(giants), R = K(), b = holderBody(d), yaw = aim(d), v = d.v || {};
    q.age = 0; q.h = d.holder; q.b = b; q.x = d.x; q.y = d.y; q.z = d.z; q.yaw = yaw; q.reach = v.reach || 14; q.swung = false;
    const ux = Math.sin(yaw), uz = Math.cos(yaw);
    q.gx = q.x + ux * R.giantAhead + uz * R.giantSide; q.gz = q.z + uz * R.giantAhead - ux * R.giantSide;   // ahead and beside its holder, where the camera behind it sees it
    q.root.position.set(q.gx, q.y - 12, q.gz); q.root.rotation.set(0, yaw, 0); q.root.visible = false;
    q.arms.position.set(0, R.chest, 0);
    q.crack.position.set(q.gx, q.y + 0.04, q.gz); q.crack.rotation.y = yaw + Math.PI / 2; q.crack.scale.set(0.01, 1, 2.2); q.crack.material.opacity = 1; q.crack.visible = true;
    const arc = U().giantArc * Math.PI / 180;   // the arc laid on the floor: centred on the aim (+z in the ring's frame is the aim after its turn)
    q.arc.geometry.dispose(); q.arc.geometry = new THREE.RingGeometry(0.6, q.reach, 28, 1, Math.PI / 2 - arc / 2, arc).rotateX(-Math.PI / 2);
    q.arc.position.set(q.x, q.y + 0.05, q.z); q.arc.rotation.y = yaw + Math.PI; q.arc.visible = false;
    q.smear.geometry.dispose(); q.smear.geometry = new THREE.RingGeometry(q.reach * 0.35, q.reach, 28, 1, Math.PI / 2 - arc / 2, arc).rotateX(-Math.PI / 2);
    q.smear.position.set(q.x, q.y + R.smearUp, q.z); q.smear.rotation.y = yaw + Math.PI; q.smear.visible = false;
    q.mats.forEach(m => fadeCel(m, 1));
    dimFor(d, U().giant);
  }
  function giantSwing(d) {
    let q = giants.find(g => g.h === d.holder && g.age !== Infinity && !g.swung);
    if (!q) { giantCall(d); q = giants.find(g => g.h === d.holder && g.age === 0); q.age = U().giant; }
    q.swung = true; if (Number.isFinite(d.yaw)) q.yaw = d.yaw;
    const ux = Math.sin(q.yaw), uz = Math.cos(q.yaw), mx = q.x + ux * q.reach * 0.5, mz = q.z + uz * q.reach * 0.5;
    impactFrame.hit(mx, mz);
    for (const o of Game.enemies) {   // sparks off each body the sword went through (drawing only)
      if (!o.alive() || Math.hypot(o.x - q.x, o.z - q.z) - o.radius > q.reach) continue;
      chestOf(o, at); ultraFx.sparkBurst(at, 40, 'ember', [-uz, 0.2, ux], 0.5, 1.4); clap(at.x, at.y, at.z, 2.6);
    }
    at.x = mx; at.y = q.y + 2; at.z = mz; light(at, C_FIRE, 16, 22); ultraFx.flashAt(at, C_CREAM, 30, 22);
  }
  function drawGiants(real) {
    const R = K(), lead = U().giant, p = Game.player;
    for (const q of giants) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, crumble = clamp01((t - lead - 0.3) / 0.7);
      if (t > lead + 1.1) { q.age = Infinity; q.root.visible = q.crack.visible = q.arc.visible = q.smear.visible = false; q.b = null; continue; }
      if (t > lead + 1.5 && !q.swung) q.swung = true;
      const ux = Math.sin(q.yaw), uz = Math.cos(q.yaw);
      q.crack.scale.x = Math.max(0.01, 9 * ease(t / 0.3)); q.crack.material.opacity = 1 - crumble;
      // Rising out of the seam to the waist, then sinking as it crumbles.
      const rise = ease((t - 0.2) / 0.5);
      q.root.position.y = q.y - 12 * (1 - rise) - 3 * crumble; q.root.visible = t > 0.2;
      // The arms: the stance (sword forward-high), the wind-up (behind the right shoulder), the cut across the arc, held.
      const arc = U().giantArc * Math.PI / 360;
      let ay, ap;
      if (t < 0.85) { ay = 0.5; ap = -0.35 * ease((t - 0.5) / 0.35); }
      else if (t < lead) { const k = ease((t - 0.85) / (lead - 0.85)); ay = 0.5 + (arc + 0.5) * k; ap = -0.35 + 0.35 * k; }
      else { const k = ease((t - lead) / 0.15); ay = (arc + 1) - (2 * arc + 1) * k; ap = 0.12 * k; }
      q.arms.rotation.set(ap, ay, 0);
      // Fire ignites along the sword; plates fall away as embers at the end; see-through while a foe in reach winds up.
      let near = 1;
      for (const o of Game.enemies) if (o.alive() && o.state === ES.WINDUP && Math.hypot(o.x - q.x, o.z - q.z) < q.reach + 2) { near = R.see; break; }
      const far = p && Math.hypot(p.x - q.x, p.z - q.z) > CONFIG.camera.feel.powerNear ? 0.5 : 1;
      const a = (1 - crumble) * near * far;
      fadeCel(q.mats[0], a); fadeCel(q.mats[1], a); fadeCel(q.mats[2], a * clamp01((t - 0.5) / 0.35)); fadeCel(q.mats[3], a * clamp01((t - 0.6) / 0.25));
      if (crumble > 0 && crumble < 1 && rnd() < real * 30) throwDrops(q.root.position.x + (rnd() - 0.5) * 6, q.y + 2 + rnd() * 8, q.root.position.z + (rnd() - 0.5) * 4, 2, rnd() < 0.6 ? C_EMBER : C_DUST, 1.5, 1, 4, 1);
      // Its shadow on the floor from the mirror on (the told arc), the smear burning down after the cut.
      q.arc.visible = t > 0.5 && t < lead + 0.3; q.arc.material.opacity = 0.75 * clamp01((t - 0.5) / 0.2) * (0.8 + 0.2 * Math.sin(t * 18));
      const since = t - lead;
      q.smear.visible = since >= 0 && since < 0.45; q.smear.material.opacity = 1 - clamp01((since - 0.15) / 0.3);
      if (q.smear.visible) { const k = ease(since / 0.15); q.smear.scale.set(1, 1, 1); q.smear.rotation.y = q.yaw + Math.PI + (1 - k) * arc; }
      if (t > 0.3 && t - real <= 0.3) { at.x = q.gx; at.y = q.y + 0.4; at.z = q.gz; throwDrops(at.x, at.y, at.z, 16, C_DUST, 3, 4, 10, 1); throwDrops(at.x, at.y, at.z, 10, C_EMBER, 3, 5, 10, 0.8); }
    }
  }

  // ---- Ash Legion -------------------------------------------------------------------------------------------------
  function legionCall(d) {
    const q = free(legions), R = K(), yaw = aim(d), v = d.v || {};
    q.age = 0; q.h = d.holder; q.x = d.x; q.y = d.y; q.z = d.z; q.ux = Math.sin(yaw); q.uz = Math.cos(yaw); q.time = v.time || 2.5; q.front = 0;
    // The figures in ranks behind the holder: riders first, spearmen after; each its own lateral place and stride.
    const W = U().legionWidth;
    q.figs.forEach((f, k) => {
      const rank = Math.floor(k / 3), lane = (k % 3) - 1;
      f.s = -U().legionBack - rank * R.rankGap + (rnd() - 0.5) * 0.8;
      f.side = lane * W * 0.32 + (rnd() - 0.5) * 0.6;
    });
    q.band.position.set(q.x - q.ux * 2, q.y + 0.04, q.z - q.uz * 2); q.band.scale.set(W * 1.2, 1, 3); q.band.rotation.y = yaw; q.band.material.opacity = 0.8; q.band.visible = true;
    q.trail.position.set(q.x - q.ux * U().legionBack, q.y + 0.03, q.z - q.uz * U().legionBack); q.trail.rotation.y = yaw; q.trail.scale.set(W, 1, 0.01); q.trail.visible = false;
    q.mats.forEach(m => fadeCel(m, 1));
    dimFor(d, U().legion);
  }
  function legionHit(d) {
    let q = legions.find(g => g.h === d.holder && g.age !== Infinity);
    if (!q) { legionCall(d); q = legions.find(g => g.h === d.holder && g.age === 0); q.age = U().legion + (d.strike - 1) * ((d.v && d.v.every) || 0.1); }
    if (d.strike !== 1) return;
    if (Number.isFinite(d.yaw)) { q.x = d.x; q.z = d.z; q.ux = Math.sin(d.yaw); q.uz = Math.cos(d.yaw); }   // the lane the engine struck down (its word, online)
    for (const o of Game.enemies) {   // the front rank's points on each body in the lane (drawing only)
      if (!o.alive()) continue;
      const along = (o.x - q.x) * q.ux + (o.z - q.z) * q.uz, off = Math.abs((o.x - q.x) * q.uz - (o.z - q.z) * q.ux);
      if (along < -U().legionBack - o.radius || along > U().legionLength - U().legionBack + o.radius || off > U().legionWidth / 2 + o.radius) continue;
      chestOf(o, at); ultraFx.sparkBurst(at, 30, 'ember', [q.ux, 0.3, q.uz], 0.5, 1.2); clap(at.x, at.y, at.z, 2.4); light(at, C_CREAM, 12, 16);
      throwDrops(o.x, o.y + 0.3, o.z, 14, C_DUST, 4, 3, 8, 1, q.ux, q.uz);
    }
    impactFrame.hit(q.x + q.ux * 4, q.z + q.uz * 4);
  }
  function drawLegions(real, now) {
    const R = K(), lead = U().legion, len = U().legionLength - U().legionBack, back = U().legionBack;
    for (const q of legions) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, stop = lead + q.time, after = t - stop;
      if (after > 1.2) { q.age = Infinity; for (const m of q.all) m.visible = false; q.dust.visible = q.trail.visible = q.band.visible = false; continue; }
      q.band.material.opacity = 0.8 * (1 - clamp01((t - 0.3) / 0.4)); q.band.visible = t < 0.7;
      const rise = ease((t - 0.2) / 0.35), go = Math.max(0, t - 0.3) * R.speed, yaw = Math.atan2(q.ux, q.uz);
      let front = -Infinity;
      for (let k = 0; k < q.figs.length; k++) {
        const f = q.figs[k];
        let s = f.s + go;
        // A figure past the lane's end comes round again at the back while the charge runs (the flood keeps pouring).
        const span = len + back + R.ranks * R.rankGap;
        if (t < stop - 0.6) while (s > len) s -= span;
        const shrink = clamp01((s - (len - 2)) / 2), gone = s > len, a = rise * (1 - shrink);
        front = Math.max(front, gone ? -Infinity : s);
        const bob = reducedMotion() ? 0 : Math.abs(Math.sin(now * 11 + f.phase)) * (f.rider ? 0.18 : 0.1);
        POS.set(q.x + q.ux * s + q.uz * f.side, q.y - (1 - rise) * 3 + bob, q.z + q.uz * s - q.ux * f.side);
        EUL.set(reducedMotion() ? 0 : Math.sin(now * 11 + f.phase) * 0.05, yaw, 0); Q.setFromEuler(EUL);
        SCL.set(1, Math.max(0.001, a), 1); M4.compose(POS, Q, SCL);
        for (const m of f.rider ? q.rider : q.spear) m.setMatrixAt(f.slot, M4);
        if (shrink > 0.5 && shrink < 0.6 && rnd() < real * 20) throwDrops(POS.x, POS.y + 1, POS.z, 3, C_DUST, 1.2, 1, 3, 0.9);
      }
      for (const m of q.all) { m.instanceMatrix.needsUpdate = true; m.visible = t > 0.2; }
      const fade = after > 0 ? 1 - clamp01(after / 0.6) : 1;
      fadeCel(q.mats[0], fade); fadeCel(q.mats[1], fade);
      // The dust wall with the front rank; the trampled lane behind it, settling after.
      q.front = Number.isFinite(front) ? front : q.front;
      q.dust.visible = t > 0.4 && fade > 0; q.dust.position.set(q.x + q.ux * (q.front + 1), q.y + 1.2, q.z + q.uz * (q.front + 1)); q.dust.scale.set(U().legionWidth * 1.3, 2.6, 1); q.dust.material.opacity = 0.75 * fade;
      q.trail.visible = t > 0.4; q.trail.scale.z = Math.max(0.01, Math.min(len + back, q.front + back)); q.trail.material.opacity = 0.8 * (after > 0 ? 1 - clamp01(after / 1.2) : 1);
    }
  }

  // ---- Shared bits ------------------------------------------------------------------------------------------------
  function drawBits(real) {
    for (const c of claps) {
      if (c.age === Infinity) continue;
      c.age += real;
      if (c.age > 0.2) { c.age = Infinity; c.s.visible = false; continue; }
      c.s.scale.setScalar(c.size * (0.5 + 0.5 * clamp01(c.age / 0.04))); c.s.material.opacity = 1 - clamp01((c.age - 0.1) / 0.1);
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
    drawDims(real); drawInks(real); drawCuts(real); drawGiants(real); drawLegions(real, clock); drawBits(real);
  }
  function clear() {
    if (!made) return;
    for (const q of dims) q.age = Infinity;
    for (const q of inks) { q.age = Infinity; q.e = q.b = null; q.enso.visible = q.wash.visible = q.palm.visible = false; for (const f of q.flecks) f.s.visible = false; }
    for (const s of strokes) { s.age = Infinity; s.s.visible = s.splat.visible = false; }
    for (const q of cuts) { q.age = Infinity; q.b = null; q.glint.visible = false; hideRibbon(q.line); for (const k of q.beads) k.s.visible = false; for (const s of q.seams) { s.s.visible = false; s.e = null; } }
    for (const q of giants) { q.age = Infinity; q.b = null; q.root.visible = q.crack.visible = q.arc.visible = q.smear.visible = false; }
    for (const q of legions) { q.age = Infinity; for (const m of q.all) m.visible = false; q.dust.visible = q.trail.visible = q.band.visible = false; }
    for (const c of claps) { c.age = Infinity; c.s.visible = false; }
    for (const f of drops) { f.age = Infinity; f.s.visible = false; }
    const G = grade(); if (G) { G.uInk.value = 0; G.uSplitW.value = 0; }
  }
  function power(d) {
    switch (d.then) {
      case 'inkWorld': (d.strike ? inkStroke : inkCall)(d); break;
      case 'worldCut': (d.strike ? cutSnap : cutCall)(d); break;
      case 'colossus': (d.strike ? giantSwing : giantCall)(d); break;
      case 'legion': if (d.strike) legionHit(d); else legionCall(d); break;
    }
  }
  const POWERS = new Set(['inkWorld', 'worldCut', 'colossus', 'legion']);
  const on = list => list.filter(q => q.age !== Infinity).length;
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.clear.push(clear);
      events.on('abilityPower', d => { if (POWERS.has(d.then)) power(d); });
    },
    clear,
    // tests: what shows now
    get state() {
      if (!made) return {};
      const G = grade();
      return { dims: on(dims), ensos: inks.filter(q => q.enso.visible).length, ink: G ? G.uInk.value : 0, strokes: strokes.filter(s => s.s.visible).length,
        lines: cuts.filter(q => q.line.meshes[0].visible).length, seams: cuts.reduce((n, q) => n + q.seams.filter(s => s.s.visible).length, 0), split: G ? G.uSplitW.value : 0,
        giants: giants.filter(q => q.root.visible).length, arcs: giants.filter(q => q.arc.visible).length, smears: giants.filter(q => q.smear.visible).length,
        legions: legions.filter(q => q.rider[0].visible).length, dust: legions.filter(q => q.dust.visible).length, drops: on(drops) };
    },
  };
})();
