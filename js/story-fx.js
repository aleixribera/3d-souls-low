'use strict';
// ============================================================================
// Story's four (design/abilities BUILD-ORDER batch 18): drawing only
// ============================================================================
// The abilities Story gives on its road, in the cel look (STYLE.md) and Story's own colours: the scarf's crimson and the
// oath's gold, flat inside a black ink edge. Everything is drawn from `abilityPower` and the time since it, pooled and
// made at load; nothing allocates per frame.
//   Scarlet Draw   the scarf unfurls from its holder's shoulders and whips out along the aim, waving; at the draw
//                  (`story.scarf` s) it snaps straight and stiff into a blade `reach` m long, a cream edge down it, a clap
//                  on each body it went through; then it goes slack and fades.
//   Oath Guard     a great kite shield, gold and crimson, stands before its holder for `time` s, a gold ring at its feet;
//                  each blow it turns swings it to face the blow, flares it and bashes back (a clap on the enemy).
//   The Seven      seven founders (tools/blender/seven_founder.py), each with its painted mark, rise out of the floor in a
//                  ring round the enemy (founder 1 opposite the holder); each in turn strikes (its arm down, a gold slash);
//                  at the gather every arm rises, then all strike together (the impact frame); then they sink.
//   Bell of Waking a ghost bell (tools/blender/ghost_bell.py) falls out of the sky over the enemy, its crack glowing, the
//                  world around the boss turning to ink (the grade pass's `uInk`, gold and crimson kept); the first toll a
//                  ring on the floor as the boss kneels; the second toll the bell slams down and breaks into its shards.
// Tuning: VIS.abilityFx.story, CONFIG.abilities.story (the clocks). Sounds: js/audio.js. Camera: js/camera-feel.js.
const storyFx = (() => {
  const K = () => VIS.abilityFx.story, T = () => CONFIG.abilities.story;
  const INK = '#0b0b0f', CRIMSON = '#b3262e', GOLD = '#e8c46a', CREAM = '#fff3dc';
  const C_INK = 0x0b0b0f, C_CRIMSON = 0xb3262e, C_GOLD = 0xe8c46a, C_CREAM = 0xfff3dc, C_BRONZE = 0x7a5a30, C_WOOD = 0x8a6a48, C_PAINT = 0xf0e6d0,
    C_CHEEK = 0xc85a5a, C_ROBE = 0xd9b35a, C_DARK = 0x1a1a22;
  const rnd = (() => { let s = 31337; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
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
  let SHIELD, RING, CLAP, SLASH, DROP;
  function textures() {
    SHIELD = canvasTex(256, 352, (g, w, h) => {   // a kite shield: gold rim, crimson field, a gold cross, in ink
      const kite = s => () => poly(g, [[w / 2, h * (0.03 + s)], [w * (0.95 - s), h * (0.12 + s * 0.5)], [w * (0.9 - s), h * 0.55], [w / 2, h * (0.97 - s)], [w * (0.1 + s), h * 0.55], [w * (0.05 + s), h * (0.12 + s * 0.5)]]);
      inked(g, kite(0), GOLD, 12);
      inked(g, kite(0.07), CRIMSON, 6);
      g.fillStyle = GOLD; g.fillRect(w * 0.45, h * 0.16, w * 0.1, h * 0.62); g.fillRect(w * 0.24, h * 0.34, w * 0.52, h * 0.08);
      g.lineWidth = 4; g.strokeStyle = INK; g.strokeRect(w * 0.45, h * 0.16, w * 0.1, h * 0.62); g.strokeRect(w * 0.24, h * 0.34, w * 0.52, h * 0.08);
    });
    RING = canvasTex(256, 256, (g, w) => {   // a toll's ring and the oath's: an ink circle with a gold band and ticks
      const m = w / 2;
      g.beginPath(); g.arc(m, m, m * 0.9, 0, Math.PI * 2); g.lineWidth = 16; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(m, m, m * 0.9, 0, Math.PI * 2); g.lineWidth = 7; g.strokeStyle = GOLD; g.stroke();
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.beginPath(); g.moveTo(m + Math.cos(a) * m * 0.74, m + Math.sin(a) * m * 0.74); g.lineTo(m + Math.cos(a) * m * 0.82, m + Math.sin(a) * m * 0.82); g.lineWidth = i % 3 ? 3 : 6; g.strokeStyle = i % 3 ? INK : CRIMSON; g.stroke(); }
    });
    CLAP = canvasTex(128, 128, (g, w) => {
      const m = w / 2, pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = m * (i % 2 ? 0.24 : 0.94); pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); }
      inked(g, () => poly(g, pts), CREAM, 6, GOLD, 2.5);
    });
    SLASH = canvasTex(256, 64, (g, w, h) => {   // a gold crescent slash in ink
      const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([w * (0.04 + 0.92 * t), h * (0.5 - 0.36 * Math.sin(Math.PI * t))]); }
      for (let i = 12; i >= 0; i--) { const t = i / 12; pts.push([w * (0.04 + 0.92 * t), h * (0.5 - 0.1 * Math.sin(Math.PI * t))]); }
      inked(g, () => poly(g, pts), GOLD, 6, CREAM, 2);
    });
    DROP = canvasTex(32, 32, (g, w, h) => { poly(g, [[w * 0.1, h * 0.55], [w * 0.5, h * 0.1], [w * 0.9, h * 0.4], [w * 0.45, h * 0.9]]); g.fillStyle = '#fff'; g.fill(); });
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
  const live = e => !!(e && e.alive && e.alive());

  // ---- Cel models (as js/legend-fx-5.js) ------------------------------------------------------------------------
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

  // ---- A camera-facing ribbon through `n` points, in layers (as js/legend-fx-5.js) ------------------------------
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
  const SCARF_PTS = 24, DROPS = 80, SHARDS = 16;
  let made = false, FOUNDERS = 7;
  const scarves = [], shields = [], sevens = [], bells = [], claps = [], slashes = [], drops = [];
  const M4 = new THREE.Matrix4(), M4b = new THREE.Matrix4(), Q = new THREE.Quaternion(), EUL = new THREE.Euler(0, 0, 0, 'YXZ'), POS = new THREE.Vector3(), SCL = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  const SHOULDER = [[0.42, 2.02, 0.02], [-0.42, 2.02, 0.02]];   // the founder's arms hang from here (tools/blender/seven_founder.py)
  function make() {
    if (made) return;
    made = true; textures();
    FOUNDERS = CONFIG.abilities.summons.seven.count;
    const floor = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), baked = n => bakedGeometry(n);
    for (let i = 0; i < 2; i++) {
      scarves.push({ line: ribbon(SCARF_PTS, [[C_INK, 11, 0.62], [C_CRIMSON, 12, 0.44], [C_CREAM, 13, 0.07]]), age: Infinity, snap: Infinity, h: null, b: null,
        x: 0, y: 0, z: 0, ux: 0, uz: 1, reach: 12, phase: 0 });
      shields.push({ face: mesh(new THREE.PlaneGeometry(1, 1.375), mat(SHIELD), 13), ring: mesh(floor, mat(RING), 4), age: Infinity, time: 3, h: null, b: null,
        yaw: 0, want: 0, flare: Infinity });
      // The Seven: one instanced mesh per piece (a founder each), the arms their own, each founder's mark its own mesh.
      const mats = { gold: cel(C_ROBE, C_CREAM, 1), ink: cel(C_DARK, C_GOLD, 1), crimson: cel(C_CRIMSON, C_GOLD, 0), wood: cel(C_WOOD, C_CREAM, 0), paint: cel(C_PAINT, 0xffffff, 0), cheek: cel(C_CHEEK, 0xffffff, 0) };
      const inst = (name, m) => { const im = new THREE.InstancedMesh(baked('founder:' + name), m, FOUNDERS); im.visible = false; im.frustumCulled = false; im.renderOrder = 11; im.userData.warmUp = true; scene.add(im); pooledFx.push(im); return im; };
      const body = [['robe__gold', 'gold'], ['robe__ink', 'ink'], ['lining__crimson', 'crimson'], ['face__wood', 'wood'], ['face__paint', 'paint'], ['face__cheek', 'cheek']].map(([n, m]) => inst(n, mats[m]));
      const arms = [inst('armL__gold', mats.gold), inst('armR__gold', mats.gold)];
      const marks = Array.from({ length: FOUNDERS }, (_, k) => mesh(baked(`founder:mark${k % 7}__paint`), mats.ink, 12));
      sevens.push({ body, arms, marks, inst: [...body, ...arms], every: [...body, ...arms, ...marks], mats: Object.values(mats), age: Infinity, end: Infinity, h: null, e: null, x: 0, y: 0, z: 0, start: 0, gap: 2.4,
        beat: 0, beatAt: -Infinity, rise: Array.from({ length: FOUNDERS }, (_, k) => 0.12 * k), fade: 0 });
      const gold = cel(C_GOLD, C_CREAM, 1, 0.9), bronze = cel(C_BRONZE, C_GOLD, 0, 0.9), glow = cel(C_CREAM, 0xffffff, 0, 1);
      const root = new THREE.Group(); root.visible = false; scene.add(root);
      for (const [n, m] of [['body__gold', gold], ['marks__bronze', bronze], ['crack__glow', glow]]) mesh(baked('bell:' + n), m, 11, root).visible = true;
      const shards = Array.from({ length: SHARDS }, (_, k) => {
        const geo = baked(`bell:shard${k}__gold`); geo.computeBoundingSphere();
        const c = geo.boundingSphere.center, m = mesh(geo, gold, 11);
        return { m, cx: c.x, cy: c.y, cz: c.z, vx: 0, vy: 0, vz: 0, spin: 0 };
      });
      bells.push({ root, shards, mats: [gold, bronze, glow], ring: mesh(floor, mat(RING), 5), ring2: mesh(floor, mat(RING), 5), age: Infinity, toll: Infinity, broke: Infinity,
        h: null, e: null, x: 0, y: 0, z: 0, scale: 0.5, time: 2, mine: false, sx: 0, sy: 0, sz: 0 });
    }
    for (let i = 0; i < 8; i++) claps.push({ s: sprite(CLAP, 15), age: Infinity, size: 1 });
    for (let i = 0; i < 8; i++) slashes.push({ s: sprite(SLASH, 15), age: Infinity, size: 1, rot: 0 });
    for (let i = 0; i < DROPS; i++) drops.push({ s: sprite(DROP, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grav: 0 });
  }
  function throwDrops(x, y, z, n, color, speed, up, grav, life) {
    const total = Math.max(1, Math.round(n * density()));
    for (let i = 0; i < total; i++) {
      const f = free(drops), a = rnd() * Math.PI * 2, s = speed * (0.4 + 0.6 * rnd());
      f.age = 0; f.life = life * (0.6 + 0.4 * rnd()); f.x = x; f.y = y; f.z = z; f.vx = Math.cos(a) * s; f.vz = Math.sin(a) * s; f.vy = up * (0.5 + rnd()); f.grav = grav;
      f.s.material.color.setHex(color); f.s.material.opacity = 1; f.s.scale.setScalar(0.16 + 0.14 * rnd()); f.s.position.set(x, y, z); f.s.visible = true;
    }
  }
  function clap(x, y, z, size) { const c = free(claps); c.age = 0; c.size = size; c.s.position.set(x, y, z); c.s.material.rotation = rnd() * 6.28; c.s.visible = true; }
  function slash(x, y, z, size, rot) { const c = free(slashes); c.age = 0; c.size = size; c.rot = rot; c.s.position.set(x, y, z); c.s.material.rotation = rot; c.s.visible = true; }
  const at = { x: 0, y: 0, z: 0 };
  const aim = d => {   // the engine's aim: the told yaw, else at the enemy pressed on, else the holder's facing
    if (Number.isFinite(d.yaw) && d.strike) return d.yaw;
    if (live(d.enemy)) return Math.atan2(d.enemy.x - d.x, d.enemy.z - d.z);
    return d.yaw ?? (d.body && d.body.yaw) ?? 0;
  };
  const holderBody = d => d.body || (d.holder === 'self' ? Game.player : null);
  const mineOf = d => d.body === Game.player || d.holder === 'self';
  const grade = () => visuals.passes && visuals.passes.grade && visuals.passes.grade.uniforms;
  const NDC = new THREE.Vector3(), NDC2 = new THREE.Vector3();

  // ---- Scarlet Draw -----------------------------------------------------------------------------------------------
  function scarfCall(d) {
    const q = free(scarves), b = holderBody(d), yaw = aim(d);
    q.age = 0; q.snap = Infinity; q.h = d.holder; q.b = b; q.x = d.x; q.y = d.y; q.z = d.z; q.ux = Math.sin(yaw); q.uz = Math.cos(yaw);
    q.reach = (d.v && d.v.reach) || 12; q.phase = rnd() * 6.28;
  }
  function scarfCut(d) {
    let q = scarves.find(g => g.h === d.holder && g.age !== Infinity && g.snap === Infinity);
    if (!q) { scarfCall(d); q = scarves.find(g => g.h === d.holder && g.age === 0); q.age = T().scarf; }
    q.snap = q.age; q.x = d.x; q.z = d.z; q.ux = Math.sin(d.yaw); q.uz = Math.cos(d.yaw);
    const W = T().scarfWidth / 2;
    let n = 0;
    for (const o of Game.enemies) {   // a clap on each body the blade went through (drawing only: the engine's own test)
      if (!o.alive()) continue;
      const along = (o.x - q.x) * q.ux + (o.z - q.z) * q.uz, off = Math.abs((o.x - q.x) * q.uz - (o.z - q.z) * q.ux);
      if (along < -o.radius || along > q.reach + o.radius || off > W + o.radius) continue;
      chestOf(o, at); clap(at.x, at.y, at.z, 2.4); ultraFx.sparkBurst(at, 24, 'ember', [q.ux, 0.2, q.uz], 0.5, 1.2); light(at, C_CRIMSON, 10, 12);
      throwDrops(at.x, at.y, at.z, 10, n % 2 ? C_CRIMSON : C_GOLD, 4, 2, 8, 0.6);
      if (!n++) impactFrame.hit(o.x, o.z);
    }
  }
  function drawScarves(real, now) {
    const R = K(), draw = T().scarf;
    for (const q of scarves) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, since = t - q.snap;
      if (since > 0.6 || t > draw + 1.5) { q.age = Infinity; q.b = null; hideRibbon(q.line); continue; }
      // Its root at the holder's shoulders (it follows the body until the draw), then out along the aim.
      if (q.b && since < 0) { q.x = q.b.x; q.z = q.b.z; q.y = q.b.y; }
      const P = q.line.pts, sx = -q.uz, sz = q.ux, root = R.scarfUp;
      const out = since >= 0 ? 1 : ease(t / draw), stiff = since >= 0 ? 1 - clamp01((since - 0.25) / 0.35) : ease((t - draw * 0.7) / (draw * 0.3));
      const len = q.reach * (0.25 + 0.75 * out);
      for (let i = 0; i < SCARF_PTS; i++) {
        const f = i / (SCARF_PTS - 1), s = len * f;
        const wave = reducedMotion() ? 0 : Math.sin(now * 14 + q.phase - f * 7) * f * 0.9 * (1 - stiff);
        const sag = (1 - stiff) * Math.sin(Math.PI * f) * 0.6;
        P[i * 3] = q.x + q.ux * (s + 0.3) + sx * wave; P[i * 3 + 1] = q.y + root - sag + (1 - stiff) * 0.3 * Math.sin(now * 9 + f * 5); P[i * 3 + 2] = q.z + q.uz * (s + 0.3) + sz * wave;
        q.line.taper[i] = stiff > 0.5 ? (1 - f ** 3 * 0.9) : 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, f * 1.4));
      }
      q.line.opacity = since > 0 ? 1 - clamp01((since - 0.25) / 0.35) : 1;
      drawRibbon(q.line, since >= 0 && since < 0.05 ? 1.8 : 1);
    }
  }

  // ---- Oath Guard -------------------------------------------------------------------------------------------------
  function oathCall(d) {
    const q = free(shields), b = holderBody(d);
    q.age = 0; q.flare = Infinity; q.h = d.holder; q.b = b; q.time = (d.v && d.v.time) || 3;
    q.yaw = q.want = b ? b.yaw : aim(d);
    q.face.material.opacity = 0; q.ring.material.opacity = 0;
  }
  function oathAnswer(d) {
    let q = shields.find(g => g.h === d.holder && g.age !== Infinity);
    if (!q) { oathCall(d); q = shields.find(g => g.h === d.holder && g.age === 0); q.age = 0.3; }
    const e = d.enemy, b = q.b;
    if (e && b) q.want = Math.atan2(e.x - b.x, e.z - b.z);
    q.flare = 0;
    if (e) { chestOf(e, at); clap(at.x, at.y, at.z, 2.2); ultraFx.sparkBurst(at, 20, 'ember', [0, 0.4, 0], 0.5, 1.1); light(at, C_GOLD, 10, 12); }
  }
  function drawShields(real) {
    const R = K();
    for (const q of shields) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, after = t - q.time;
      if (after > 0.4 || (q.b && q.b.alive && !q.b.alive())) { q.age = Infinity; q.b = null; q.face.visible = q.ring.visible = false; continue; }
      const b = q.b; if (!b) { q.face.visible = q.ring.visible = false; continue; }
      if (q.flare === Infinity || q.flare > 0.6) q.want = b.yaw;   // between blows it keeps to its holder's front
      let dy = q.want - q.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      q.yaw += dy * Math.min(1, real * (q.flare < 0.15 ? 40 : 10));
      if (q.flare !== Infinity) q.flare += real;
      const a = clamp01(t / 0.2) * (after > 0 ? 1 - clamp01(after / 0.4) : 1), bash = q.flare < 0.25 ? Math.sin(Math.PI * q.flare / 0.25) : 0;
      const reach = R.shieldOut + bash * 0.5, ux = Math.sin(q.yaw), uz = Math.cos(q.yaw);
      q.face.position.set(b.x + ux * reach, b.y + R.shield * 0.62, b.z + uz * reach); q.face.rotation.set(0, q.yaw, 0);
      q.face.scale.setScalar(R.shield * (0.6 + 0.4 * ease(t / 0.2)) * (1 + bash * 0.12)); q.face.material.opacity = 0.92 * a; q.face.visible = true;
      q.face.material.color.setScalar(1 + (q.flare < 0.2 ? 0.6 * (1 - q.flare / 0.2) : 0));
      q.ring.position.set(b.x, b.y + 0.05, b.z); q.ring.rotation.y = t * 0.6; q.ring.scale.setScalar(R.shield * 1.4); q.ring.material.opacity = 0.75 * a; q.ring.visible = true;
    }
  }

  // ---- The Seven --------------------------------------------------------------------------------------------------
  function sevenCall(d) {
    const q = free(sevens), e = live(d.enemy) ? d.enemy : null, b = holderBody(d), S = CONFIG.abilities.summons.seven;
    q.age = 0; q.end = (d.v && d.v.time) ? S.arrive + d.v.time : 10.3; q.h = d.holder; q.e = e; q.beat = 0; q.beatAt = -Infinity; q.fade = 0;
    q.gap = S.gap; q.x = e ? e.x : d.x; q.y = e ? e.y : d.y; q.z = e ? e.z : d.z;
    q.start = b ? Math.atan2(b.x - q.x, b.z - q.z) + Math.PI : 0;   // founder 1 stands opposite the holder
    for (let k = 0; k < FOUNDERS; k++) q.rise[k] = 0.1 * k + 0.1 * rnd();
    for (const m of q.mats) fadeCel(m, 1);
    throwDrops(q.x, q.y + 0.2, q.z, 16, C_GOLD, 4, 3, 8, 1);
  }
  function sevenBeat(d) {
    let q = sevens.find(g => g.h === d.holder && g.age !== Infinity);
    if (!q) { sevenCall(d); q = sevens.find(g => g.h === d.holder && g.age === 0); q.age = CONFIG.abilities.summons.seven.arrive + (d.strike - 1) * ((d.v && d.v.every) || 1); }
    if (live(d.enemy)) q.e = d.enemy;
    q.beat = d.strike; q.beatAt = q.age;
    const e = q.e; if (!e) return;
    chestOf(e, at);
    if (d.strike <= FOUNDERS) { slash(at.x, at.y, at.z, 2.6, rnd() * 6.28); light(at, C_GOLD, 8, 10); throwDrops(at.x, at.y, at.z, 6, C_GOLD, 3, 2, 8, 0.5); }
    else if (d.strike === FOUNDERS + 2) {
      clap(at.x, at.y, at.z, 4); for (let k = 0; k < 3; k++) slash(at.x, at.y + (k - 1) * 0.4, at.z, 4.2, k * 1.05);
      impactFrame.hit(e.x, e.z); ultraFx.sparkBurst(at, 50, 'ember', [0, 0.5, 0], 0.6, 1.5); light(at, C_CREAM, 16, 18); ultraFx.flashAt(at, C_GOLD, 24, 18);
    }
  }
  function drawSevens(real) {
    const R = K(), S = CONFIG.abilities.summons.seven;
    for (const q of sevens) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, after = t - q.end;
      if (after > R.sevenSink) { q.age = Infinity; q.e = null; for (const m of q.every) m.visible = false; continue; }
      if (live(q.e)) { q.x = q.e.x; q.y = q.e.y; q.z = q.e.z; }
      const r = ((q.e && q.e.radius) || 1) + q.gap, since = t - q.beatAt, sink = after > 0 ? ease(after / R.sevenSink) : 0;
      const gather = q.beat === FOUNDERS + 1 ? ease(since / 0.4) : q.beat === FOUNDERS + 2 ? 1 - ease(since / 0.25) : 0;
      for (let k = 0; k < FOUNDERS; k++) {
        const a = q.start + k / FOUNDERS * Math.PI * 2, fx = q.x + Math.sin(a) * r, fz = q.z + Math.cos(a) * r, yaw = Math.atan2(q.x - fx, q.z - fz);
        const rise = ease((t - q.rise[k]) / Math.max(0.2, S.arrive - q.rise[k]));
        POS.set(fx, q.y - 2.8 * (1 - rise) - 2.8 * sink, fz); EUL.set(0, yaw, 0); Q.setFromEuler(EUL); SCL.set(1, 1, 1); M4.compose(POS, Q, SCL);
        for (const m of q.body) m.setMatrixAt(k, M4);
        q.marks[k].position.copy(POS); q.marks[k].rotation.set(0, yaw, 0); q.marks[k].visible = t > q.rise[k];
        // Its arm: raised at its own beat and brought down; all raised at the gather, all down together.
        const own = q.beat === k + 1 ? since : Infinity;
        let lift = own < 0.12 ? ease(own / 0.12) : own < 0.4 ? 1 - ease((own - 0.12) / 0.28) : 0;
        lift = Math.max(lift, gather);
        for (let s = 0; s < 2; s++) {
          const [ox, oy, oz] = SHOULDER[s], swing = s === 1 ? lift : gather;
          M4b.makeTranslation(ox, oy, oz); M4b.multiply(EMPTY.makeRotationX(-Math.PI * 0.95 * swing - 0.1));
          q.arms[s].setMatrixAt(k, ARM.multiplyMatrices(M4, M4b));
        }
      }
      for (const m of q.inst) { m.instanceMatrix.needsUpdate = true; m.visible = t > 0.05; }
      const fade = 1 - sink;
      for (const m of q.mats) fadeCel(m, fade);
    }
  }
  const EMPTY = new THREE.Matrix4(), ARM = new THREE.Matrix4();

  // ---- Bell of Waking ---------------------------------------------------------------------------------------------
  function bellCall(d) {
    const q = free(bells), e = live(d.enemy) ? d.enemy : null, R = K();
    q.age = 0; q.toll = Infinity; q.broke = Infinity; q.h = d.holder; q.e = e; q.mine = mineOf(d); q.time = (d.v && d.v.time) || 2;
    q.x = e ? e.x : d.x; q.y = e ? e.y : d.y; q.z = e ? e.z : d.z;
    q.scale = Math.max(R.bellMin, (((e && e.radius) || 1) * 2 + 1.5) / 7);
    q.root.visible = true; q.root.position.set(q.x, q.y + R.bellHigh + 20, q.z); q.root.scale.setScalar(q.scale); q.root.rotation.set(0, rnd() * 6.28, 0);
    q.mats[0].uniforms.uAlpha.value = 0.9; q.mats[1].uniforms.uAlpha.value = 0.9; fadeCel(q.mats[2], 1);
    for (const s of q.shards) s.m.visible = false;
    q.ring.visible = q.ring2.visible = false;
  }
  function bellToll(d) {
    let q = bells.find(g => g.h === d.holder && g.age !== Infinity && g.broke === Infinity);
    if (!q) { bellCall(d); q = bells.find(g => g.h === d.holder && g.age === 0); q.age = T().bell; }
    if (live(d.enemy)) q.e = d.enemy;
    if (d.end) { q.broke = q.age; return; }
    const R = K();
    if (d.strike === 1) {
      q.toll = q.age;
      q.ring.position.set(q.x, q.y + 0.06, q.z); q.ring.scale.setScalar(1); q.ring.material.opacity = 1; q.ring.visible = true;
      at.x = q.x; at.y = q.y + R.bellHigh * 0.6; at.z = q.z; light(at, C_GOLD, 12, 18); impactFrame.hit(q.x, q.z);
      return;
    }
    // The second toll: down onto the boss, and broken.
    q.broke = q.age;
    q.ring2.position.set(q.x, q.y + 0.07, q.z); q.ring2.scale.setScalar(1); q.ring2.material.opacity = 1; q.ring2.visible = true;
    q.sx = q.x; q.sy = q.y; q.sz = q.z;
    for (const s of q.shards) {
      const l = Math.hypot(s.cx, s.cz) || 1, out = 3 + rnd() * 4;
      s.vx = s.cx / l * out; s.vz = s.cz / l * out; s.vy = 2 + rnd() * 4; s.spin = (rnd() - 0.5) * 6;
      s.m.position.set(q.x, q.y, q.z); s.m.scale.setScalar(q.scale); s.m.rotation.set(0, q.root.rotation.y, 0); s.m.visible = true;
    }
    q.root.visible = false;
    chestOf(q.e || q, at); clap(at.x, at.y, at.z, 4.5); impactFrame.hit(q.x, q.z);
    ultraFx.sparkBurst(at, 60, 'ember', [0, 0.6, 0], 0.7, 1.6); light(at, C_CREAM, 18, 22); ultraFx.flashAt(at, C_GOLD, 28, 22);
    throwDrops(q.x, q.y + 1, q.z, 24, C_GOLD, 6, 5, 10, 1.1);
  }
  function drawBells(real) {
    const R = K(), G = grade(), p = Game.player, bell = T().bell;
    let strength = 0, best = null;
    for (const q of bells) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, broke = t - q.broke;
      if (broke > R.shardLife || t > bell + q.time + 3) { q.age = Infinity; q.e = null; q.root.visible = q.ring.visible = q.ring2.visible = false; for (const s of q.shards) s.m.visible = false; continue; }
      if (live(q.e) && q.broke === Infinity) { q.x = q.e.x; q.y = q.e.y; q.z = q.e.z; }
      const hang = q.y + ((q.e && q.e.height) || 2) + R.bellHigh * 0.3;
      if (q.broke === Infinity) {   // falling out of the sky to hang over the boss, swinging at the toll
        const fall = ease(t / bell), swing = q.toll === Infinity ? 0 : Math.sin((t - q.toll) * 9) * 0.12 * Math.exp(-(t - q.toll) * 1.6);
        q.root.position.set(q.x, hang + (1 - fall) * 20, q.z); q.root.rotation.x = reducedMotion() ? 0 : swing; q.root.visible = true;
        // the crack brightens through the kneel
        q.mats[2].uniforms.uColor.value.setHex(q.toll === Infinity ? C_GOLD : C_CREAM);
      } else {
        for (const s of q.shards) {
          s.vy -= 14 * Math.min(real, 0.05);
          s.m.position.x += s.vx * Math.min(real, 0.05); s.m.position.y = Math.max(q.sy - 0.5, s.m.position.y + s.vy * Math.min(real, 0.05)); s.m.position.z += s.vz * Math.min(real, 0.05);
          s.m.rotation.x += s.spin * Math.min(real, 0.05);
        }
        fadeCel(q.mats[0], 0.9 * (1 - clamp01((broke - R.shardLife * 0.5) / (R.shardLife * 0.5))));
      }
      tollRing(q.ring, q.toll, t, R); tollRing(q.ring2, q.broke, t, R);
      // The grade: ink round the boss from the fall to the break (full for its holder, `half` for anyone near).
      const inside = p && Math.hypot(p.x - q.x, p.z - q.z) < R.inkReach;
      const k = (q.mine ? 1 : inside ? R.half : 0) * ease(t / bell) * (q.broke === Infinity ? 1 : 1 - clamp01(broke / 0.4));
      if (k > strength) { strength = k; best = q; }
    }
    if (!G || !best || strength <= 0 || strength < G.uInk.value) return;   // World of Ink's own (js/legend-fx-5.js) wins where stronger
    G.uInk.value = strength;
    NDC.set(best.x, best.y + 1, best.z).project(camera);
    NDC2.set(best.x + camera.matrixWorld.elements[0] * R.inkReach, best.y + 1 + camera.matrixWorld.elements[1] * R.inkReach, best.z + camera.matrixWorld.elements[2] * R.inkReach).project(camera);
    const r = Math.hypot((NDC2.x - NDC.x) * camera.aspect, NDC2.y - NDC.y) / 2;
    G.uInkAt.value.set((NDC.x + 1) / 2, (NDC.y + 1) / 2, NDC.z > 1 ? 10 : r * 1.25);
  }

  // A toll's ring, `from` s into the bell's life (Infinity: not yet), spreading and fading.
  function tollRing(rg, from, t, R) {
    if (from === Infinity) return;
    const k = t - from; rg.scale.setScalar(Math.max(0.01, R.tollRing * ease(k / 0.6))); rg.material.opacity = 1 - clamp01((k - 0.2) / 0.5); rg.visible = k < 0.7;
  }
  // ---- Shared bits ------------------------------------------------------------------------------------------------
  function drawBits(real) {
    for (const c of claps) {
      if (c.age === Infinity) continue;
      c.age += real;
      if (c.age > 0.2) { c.age = Infinity; c.s.visible = false; continue; }
      c.s.scale.setScalar(c.size * (0.5 + 0.5 * clamp01(c.age / 0.04))); c.s.material.opacity = 1 - clamp01((c.age - 0.1) / 0.1);
    }
    for (const c of slashes) {
      if (c.age === Infinity) continue;
      c.age += real;
      if (c.age > 0.3) { c.age = Infinity; c.s.visible = false; continue; }
      c.s.scale.set(c.size * ease(c.age / 0.06), c.size * 0.25, 1); c.s.material.opacity = 1 - clamp01((c.age - 0.15) / 0.15);
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
    drawScarves(real, clock); drawShields(real); drawSevens(real); drawBells(real); drawBits(real);
  }
  function clear() {
    if (!made) return;
    for (const q of scarves) { q.age = Infinity; q.b = null; hideRibbon(q.line); }
    for (const q of shields) { q.age = Infinity; q.b = null; q.face.visible = q.ring.visible = false; }
    for (const q of sevens) { q.age = Infinity; q.e = null; for (const m of q.every) m.visible = false; }
    for (const q of bells) { q.age = Infinity; q.e = null; q.root.visible = q.ring.visible = q.ring2.visible = false; for (const s of q.shards) s.m.visible = false; }
    for (const c of [...claps, ...slashes, ...drops]) { c.age = Infinity; c.s.visible = false; }
  }
  function power(d) {
    switch (d.then) {
      case 'scarfBlade': (d.strike ? scarfCut : scarfCall)(d); break;
      case 'oathShield': (d.strike ? oathAnswer : oathCall)(d); break;
      case 'seven': if (d.draw) break; (d.strike ? sevenBeat : sevenCall)(d); break;
      case 'bellToll': (d.strike || d.end ? bellToll : bellCall)(d); break;
    }
  }
  const POWERS = new Set(['scarfBlade', 'oathShield', 'seven', 'bellToll']);
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
      return { scarves: scarves.filter(q => q.line.meshes[0].visible).length, shields: shields.filter(q => q.face.visible).length,
        sevens: sevens.filter(q => q.body[0].visible).length, bells: bells.filter(q => q.root.visible).length,
        shards: bells.reduce((n, q) => n + q.shards.filter(s => s.m.visible).length, 0), rings: bells.reduce((n, q) => n + (q.ring.visible ? 1 : 0) + (q.ring2.visible ? 1 : 0), 0),
        claps: on(claps), slashes: on(slashes), drops: on(drops) };
    },
  };
})();
