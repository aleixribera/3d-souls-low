'use strict';
// ============================================================================
// Strike II, the flashy ones (design/abilities BUILD-ORDER batch 7): the key-1 strikes drawn, drawing only
// ============================================================================
// The same cel look and blue ink as js/strike-fx.js (STYLE.md): flat hard-edged shapes in two or three tones with a dark
// ink outline, few big sharp particles, no light. Every mesh, sprite and figure is pooled and made at load; each ages in
// real time from the press. Tuning: VIS.abilityFx.strike2. A shape over a boss in its wind-up is drawn at half strength.
// Sounds: js/audio.js.
//   Sparrow Flurry  a fan of thrust lines held off the blade while it lasts; each thrust a tip, a streak and sparks.
//   Whirl Drill     a spiral cone of blue ink lodged in the boss's chest, spinning, throwing sparks; a burst as it goes.
//   Shadow Stitch   an ink pool under the boss, a ripple at the holder's feet; each stab a black spike from the pool.
//   Spinning Blade  a spinning disc flying out through the boss and back to the hand, a trail, a cut each way, a glint.
//   Three Shadows   three ink figures of the holder round the boss, lunging in; three cuts at once, a burst of ink.
//   Quick Draw      still flakes in the stance; at the draw a white line along the ground; a beat later the split.
const strikeFx2 = (() => {
  const K = () => VIS.abilityFx.strike2;
  const INK = '#0e1218', BLUE = '#8fb8dc', CORE = '#f2f6fa', PALE = '#cfe2f2', DEEP = '#2c5f8a';
  const C_BLUE = 0x8fb8dc, C_CORE = 0xf2f6fa, C_PALE = 0xcfe2f2, C_INK = 0x0e1218, C_DEEP = 0x2c5f8a;
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rnd = (() => { let s = 1307; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const inked = (g, path, fill, edge, ink = 7, rim = 2.5) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    path(); g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill();
    if (edge) { path(); g.lineWidth = rim; g.strokeStyle = edge; g.stroke(); }
  };
  const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  let FAN, STREAK, STAR, SPIRAL, POOL, RIPPLE, SHADOW, DISC, SLASH, SLIT, LINE, FLAKE;
  function textures() {
    FAN = canvasTex(256, 128, (g, w, h) => {   // a fan of thrust lines off the blade: from the bottom centre out, ink, blue, white tips
      const lines = [];
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i / 8 - 0.5) * 1.6 + (rnd() - 0.5) * 0.12, l = h * (0.7 + rnd() * 0.25); lines.push([a, l]); }
      for (const [lw, c] of [[9, INK], [5, BLUE], [2, CORE]]) {
        g.lineWidth = lw; g.strokeStyle = c; g.lineCap = 'round';
        for (const [a, l] of lines) { g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * h * 0.2, h - 2 + Math.sin(a) * h * 0.2); g.lineTo(w / 2 + Math.cos(a) * l, h - 2 + Math.sin(a) * l); g.stroke(); }
      }
      g.fillStyle = CORE;
      for (const [a, l] of lines) { g.beginPath(); g.arc(w / 2 + Math.cos(a) * l, h - 2 + Math.sin(a) * l, 3.5, 0, Math.PI * 2); g.fill(); }
    });
    STREAK = canvasTex(128, 32, (g, w, h) => {   // one thrust's streak, its point to the right
      inked(g, () => poly(g, [[4, h / 2], [w * 0.7, h * 0.2], [w - 3, h / 2], [w * 0.7, h * 0.8]]), BLUE, CORE, 6, 2);
      g.fillStyle = CORE; poly(g, [[w * 0.45, h / 2], [w * 0.75, h * 0.36], [w - 8, h / 2], [w * 0.75, h * 0.64]]); g.fill();
    });
    STAR = canvasTex(128, 128, (g, w) => {   // a flat white star, an ink edge
      const m = w / 2, pts = [];
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = i % 2 ? m * 0.22 : m * 0.92; pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); }
      inked(g, () => poly(g, pts), CORE, PALE, 6, 2);
    });
    SPIRAL = canvasTex(64, 128, (g, w, h) => {   // the drill's skin: blue and deep bands round it, ink between (wraps a cone)
      g.fillStyle = BLUE; g.fillRect(0, 0, w, h);
      for (let k = -2; k < 6; k++) {
        const y0 = k * h / 4;
        g.fillStyle = DEEP; poly(g, [[0, y0], [w, y0 + h / 4], [w, y0 + h / 4 + h / 10], [0, y0 + h / 10]]); g.fill();
        g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(0, y0); g.lineTo(w, y0 + h / 4); g.stroke();
        g.strokeStyle = CORE; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y0 + h / 8); g.lineTo(w, y0 + h / 4 + h / 8); g.stroke();
      }
    });
    POOL = canvasTex(128, 128, (g, w) => {   // a flat pool of ink, its edge ragged, a blue rim
      const m = w / 2, pts = [];
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r = m * (0.8 + 0.14 * Math.sin(i * 3.1) * rnd()); pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); }
      poly(g, pts); g.lineWidth = 6; g.strokeStyle = DEEP; g.stroke(); g.fillStyle = '#0b0f14'; g.fill();
    });
    RIPPLE = canvasTex(128, 128, (g, w) => {   // a ring rippling out at the holder's feet
      const m = w / 2;
      for (const [th, c] of [[10, INK], [5, BLUE], [2, PALE]]) { g.beginPath(); g.arc(m, m, m * 0.8, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
    });
    SHADOW = canvasTex(64, 192, (g, w, h) => {   // a black spike from the shadow on its base: ink, a deep face, a blue edge
      inked(g, () => poly(g, [[w * 0.1, h - 2], [w * 0.4, h * 0.45], [w * 0.5, 4], [w * 0.62, h * 0.4], [w * 0.92, h - 2]]), '#141a22', BLUE, 7, 3);
      g.fillStyle = DEEP; poly(g, [[w * 0.5, 12], [w * 0.62, h * 0.4], [w * 0.88, h - 4], [w * 0.5, h - 4]]); g.fill();
      g.strokeStyle = PALE; g.lineWidth = 2; g.beginPath(); g.moveTo(w * 0.5, h * 0.1); g.lineTo(w * 0.46, h * 0.6); g.stroke();
    });
    DISC = canvasTex(128, 128, (g, w) => {   // a four-bladed spinning disc: hooked blades, a pale face, a white hub
      const m = w / 2, pts = [];
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        pts.push([m + Math.cos(a) * m * 0.3, m + Math.sin(a) * m * 0.3], [m + Math.cos(a + 0.35) * m * 0.95, m + Math.sin(a + 0.35) * m * 0.95],
          [m + Math.cos(a + 0.9) * m * 0.42, m + Math.sin(a + 0.9) * m * 0.42]);
      }
      inked(g, () => poly(g, pts), PALE, BLUE, 7, 3);
      g.beginPath(); g.arc(m, m, m * 0.2, 0, Math.PI * 2); g.fillStyle = CORE; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    });
    SLASH = canvasTex(256, 64, (g, w, h) => {   // a straight cut, its ends tapering: ink, blue, a white core
      for (const [half, c] of [[0.42, INK], [0.3, BLUE], [0.12, CORE]]) {
        g.fillStyle = c; poly(g, [[4, h / 2], [w * 0.5, h / 2 - h * half], [w - 4, h / 2], [w * 0.5, h / 2 + h * half]]); g.fill();
      }
    });
    SLIT = canvasTex(512, 96, (g, w, h) => {   // the split: one long cut opening, white inside, shards off its edge
      for (const [half, c] of [[0.4, INK], [0.3, BLUE], [0.18, CORE]]) {
        g.fillStyle = c; poly(g, [[2, h / 2], [w * 0.35, h / 2 - h * half], [w - 2, h / 2], [w * 0.35, h / 2 + h * half]]); g.fill();
      }
      g.fillStyle = PALE;
      for (const x of [0.2, 0.42, 0.6, 0.78]) { poly(g, [[w * x, h * 0.18], [w * (x + 0.03), h * 0.02], [w * (x + 0.05), h * 0.2]]); g.fill(); }
    });
    LINE = canvasTex(64, 256, (g, w, h) => {   // the drawn line along the ground (its length down the canvas): thin, white, ends tapering
      for (let y = 0; y < h; y++) {
        const k = Math.min(1, y / (h * 0.06), (h - y) / (h * 0.06)), m = w / 2;
        for (const [half, c] of [[0.34, INK], [0.22, BLUE], [0.09, CORE]]) { g.fillStyle = c; const s = w * half * k; g.fillRect(m - s, y, s * 2, 1); }
      }
    });
    FLAKE = canvasTex(32, 32, (g, w, h) => {   // a hard shard (tinted per use)
      poly(g, [[w * 0.1, h * 0.55], [w * 0.5, h * 0.1], [w * 0.9, h * 0.4], [w * 0.45, h * 0.9]]); g.fillStyle = '#fff'; g.fill();
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

  // A shadow figure: ink in its middle, a blue rim at its edges (the cel outline seen from any side).
  function inkMaterial() {
    const m = new THREE.MeshBasicMaterial({ color: C_INK, transparent: true, opacity: 0, depthWrite: true, side: THREE.FrontSide });
    m.onBeforeCompile = sh => {
      if (!sh.vertexShader.includes('#include <project_vertex>') || !sh.fragmentShader.includes('#include <opaque_fragment>')) return;
      sh.vertexShader = 'varying vec3 vInkN, vInkV;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_SKINNING
          vInkN = transformedNormal;
        #else
          vInkN = normalMatrix * objectNormal;
        #endif
        vInkV = -mvPosition.xyz;`);
      sh.fragmentShader = 'varying vec3 vInkN, vInkV;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `float inkRim = 1.0 - abs(dot(normalize(vInkN), normalize(vInkV)));
        outgoingLight = mix(outgoingLight, vec3(${(0x8f / 255).toFixed(3)}, ${(0xb8 / 255).toFixed(3)}, ${(0xdc / 255).toFixed(3)}), step(0.62, inkRim));
        #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'strikeInkFigure';
    return m;
  }

  // ---- Pools: two of each shape (two people may press at once), one set of figures, one shared set of flakes ------------
  const SPIKES = 4, FLAKES = 64, STREAKS = 10;
  let made = false;
  const fans = [], streaks = [], stars = [], drills = [], stitches = [], discs = [], slashes = [], draws = [], figures = [], flakes = [];
  let shadows = null;   // Three Shadows' one set of figures (a second press takes it over)
  function make() {
    if (made) return;
    made = true; textures();
    const floor = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const strip = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);   // from its start along +z
    // The drill: a cone along +z (its tip at z = 1), its skin and an ink hull a little bigger, drawn inside out.
    const coneGeo = new THREE.ConeGeometry(0.5, 1, 14, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
    const spiralMat = mat(SPIRAL, { side: THREE.FrontSide, depthWrite: true }), hullMat = new THREE.MeshBasicMaterial({ color: C_INK, side: THREE.BackSide, transparent: true, fog: false });
    for (let n = 0; n < 2; n++) {
      fans.push({ s: sprite(FAN, 13, 0.5, 0), age: Infinity, life: 1, b: null, e: null, x: 0, y: 0, z: 0, holder: null });
      const g = new THREE.Group(), spin = new THREE.Group(), skin = new THREE.Mesh(coneGeo, spiralMat), hull = new THREE.Mesh(coneGeo, hullMat);
      hull.scale.setScalar(1.12); hull.position.z = -0.05; skin.renderOrder = 12; hull.renderOrder = 11; skin.frustumCulled = hull.frustumCulled = false;
      spin.add(skin, hull); g.add(spin); g.visible = false; g.userData.warmUp = true; scene.add(g);
      drills.push({ g, spin, skin, hull, age: Infinity, life: 1, lead: 0, e: null, ux: 0, uy: 0, uz: 1, side: 1, spark: 0, burst: false });
      stitches.push({ pool: mesh(floor, mat(POOL, { opacity: 0 }), 3), ripple: mesh(floor, mat(RIPPLE), 3), spikes: Array.from({ length: SPIKES }, () => ({ s: sprite(SHADOW, 13, 0.5, 0), age: Infinity, x: 0, z: 0 })),
        age: Infinity, e: null, x: 0, y: 0, z: 0, size: 2, n: 0, last: 0, holder: null });
      discs.push({ s: sprite(DISC, 14), age: Infinity, x: 0, y: 0, z: 0, ux: 0, uz: 1, len: 6, time: 0.8, passes: 2, cut: [new Set(), new Set()], trail: 0, b: null, caught: false });
      draws.push({ line: mesh(strip, mat(LINE), 4), slit: sprite(SLIT, 15), age: Infinity, holder: null, b: null, e: null, x: 0, y: 0, z: 0, drawn: -1, split: -1, mote: 0, yaw: 0, fx: 0, fz: 0, len: 1 });
    }
    for (let i = 0; i < STREAKS; i++) streaks.push({ s: sprite(STREAK, 14), age: Infinity, life: 0.14, veil: 1 });
    for (let i = 0; i < 6; i++) { const s = sprite(STAR, 15); s.material.depthTest = false; stars.push({ s, age: Infinity, life: 0.2, size: 1 }); }
    for (let i = 0; i < 6; i++) slashes.push({ s: sprite(SLASH, 15), age: Infinity, life: 0.25, size: 1 });
    const inkMat = inkMaterial(), figMat = rigidSkinning(inkMat);
    for (let i = 0; i < 3; i++) {
      const rig = new Rig(PLAYER_DEF.look);
      rig.root.traverse(o => {
        o.userData.warmUp = true;
        if (o.isSkinnedMesh) { o.material = figMat; o.castShadow = o.receiveShadow = false; o.renderOrder = 11; }
        else if (o.isMesh || o.isSprite || o.isPoints || o.isLine) o.visible = false;   // eyes, glows, glints: the body alone
      });
      rig.root.visible = rig.shadow.visible = false;
      figures.push({ rig });
    }
    shadows = { figs: figures, mat: inkMat, age: Infinity, e: null, lead: 0.3, cut: false, x: 0, y: 0, z: 0, yaw0: 0 };
    for (let i = 0; i < FLAKES; i++) flakes.push({ s: sprite(FLAKE, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, grav: 0, wait: 0 });
  }
  const density = () => (CONFIG.VISUALS.fxBudgets[visuals.quality().fxBudget] || { density: 1 }).density;
  const free = list => list.find(q => q.age === Infinity) || list.reduce((a, b) => (b.age > a.age ? b : a));
  function throwFlakes(x, y, z, n, colors, o, wait = 0) {
    const many = Math.max(1, Math.round(n * density()));
    for (let i = 0; i < many; i++) {
      const f = free(flakes), a = rnd() * Math.PI * 2, sp = o.speed * (0.6 + rnd() * 0.6);
      f.age = 0; f.wait = wait; f.life = o.life * (0.75 + rnd() * 0.5); f.x = x; f.y = y; f.z = z;
      f.vx = Math.cos(a) * sp; f.vz = Math.sin(a) * sp; f.vy = (o.up || 0) * (0.5 + rnd()); f.spin = (rnd() - 0.5) * 12; f.grav = o.grav;
      f.s.material.color.setHex(colors[i % colors.length]); f.s.material.opacity = 1; f.s.material.rotation = rnd() * 6.3;
      f.s.position.set(f.x, f.y, f.z); f.s.scale.setScalar(o.size * (0.7 + rnd() * 0.6)); f.s.visible = wait <= 0;
    }
  }
  const BLUES = [C_PALE, C_BLUE], SPARKS = [C_CORE, C_PALE, C_BLUE], INKS = [C_INK, C_DEEP, C_INK], STILL = [C_PALE, C_CORE];
  const SPARK = { speed: 3.4, up: 2.5, grav: 10, size: 0.11, life: 0.3 }, SHARDS = { speed: 1.6, up: 4, grav: 12, size: 0.13, life: 0.45 };
  const DROPS = { speed: 1.2, up: 3.5, grav: 14, size: 0.14, life: 0.55 }, BURST = { speed: 4, up: 3, grav: 9, size: 0.16, life: 0.5 };
  const MOTES = { speed: 0.3, up: 1.2, grav: -0.5, size: 0.08, life: 0.7 };
  function star(x, y, z, size, life, rot = 0) {
    const q = free(stars); q.age = 0; q.life = life; q.size = size;
    q.s.material.opacity = 1; q.s.material.rotation = rot; q.s.position.set(x, y, z); q.s.scale.setScalar(size * 0.5); q.s.visible = true;
  }
  function slash(x, y, z, rot, size, life = 0.25) {
    const q = free(slashes); q.age = 0; q.life = life; q.size = size;
    q.s.position.set(x, y, z); q.s.material.rotation = rot; q.s.scale.set(size, size * 0.25, 1); q.s.material.opacity = 1; q.s.visible = true;
  }
  // Half strength over a boss in its wind-up: the effect never hides a tell (STYLE.md rule 9).
  const veil = e => (e && e.state === ES.WINDUP ? 0.5 : 1);
  const chestY = e => e.y + (e.height || 1.8) * 0.55;
  const STAB = () => PLAYER_DEF.moveset.attacks.light4;   // the figures' lunge, held at the end of its thrust

  // ---- The cues: each from the press (t = 0), the later blows as they are told ------------------------------------------
  function power(d) {
    const R = K(), v = d.v || {}, e = d.enemy, b = d.body;
    if (!e) return;
    const x = b ? b.x : d.x, y = b ? b.y : d.y, z = b ? b.z : d.z;
    const dx = e.x - x, dz = e.z - z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, yaw = Math.atan2(ux, uz);
    switch (d.then) {
      case 'flurry': {   // the fan off the blade, held while the flurry lasts (the thrusts: strike())
        const q = free(fans);
        Object.assign(q, { age: 0, life: CONFIG.abilities.flurry.time, b, e, holder: d.holder, x: x + ux * 0.9, y: y + R.waist - 0.3, z: z + uz * 0.9 });
        q.s.position.set(q.x, q.y, q.z); q.s.scale.set(R.fan, R.fan * 0.5, 1); q.s.material.opacity = 0; q.s.visible = true;
        break;
      }
      case 'drill': {   // lodged at the chest after its lead, spinning for its time
        const q = free(drills);
        // it drives in from above and to one side, so the camera behind the holder sees its length, never only its base
        const side = (q.side = -q.side || 1) * R.drillTurn, pitch = R.drillPitch, ay = yaw + side;
        Object.assign(q, { age: 0, life: CONFIG.abilities.drill.lead + (v.time || 1.2), lead: CONFIG.abilities.drill.lead, e, spark: 0, burst: false,
          ux: Math.sin(ay) * Math.cos(pitch), uy: -Math.sin(pitch), uz: Math.cos(ay) * Math.cos(pitch) });
        q.g.rotation.set(pitch, ay, 0, 'YXZ'); q.g.scale.set(R.drill * 0.5, R.drill * 0.5, R.drill); q.g.visible = false;
        throwFlakes(x + ux * 0.8, y + R.waist, z + uz * 0.8, 6, BLUES, SPARK);
        break;
      }
      case 'stitch': {   // the pool spreads under the boss, the ripple at the feet; the spikes: strike()
        const q = free(stitches), r = (e.radius || 0.8) + 1;
        Object.assign(q, { age: 0, e, x: e.x, y: e.y, z: e.z, size: r * 2, n: 0, holder: d.holder });
        q.pool.position.set(q.x, q.y + 0.03, q.z); q.pool.scale.setScalar(0.1); q.pool.material.opacity = 0; q.pool.visible = true;
        q.ripple.position.set(x, y + 0.04, z); q.ripple.scale.setScalar(0.3); q.ripple.material.opacity = 1; q.ripple.visible = true;
        for (const s of q.spikes) { s.age = Infinity; s.s.visible = false; }
        throwFlakes(x + ux * 0.5, y + 0.1, z + uz * 0.5, 6, INKS, DROPS);
        break;
      }
      case 'boomerang': {   // out through the boss and past it, back to the hand
        const q = free(discs), B = CONFIG.abilities.boomerang;
        Object.assign(q, { age: 0, b, x, y: y + R.waist, z, ux, uz, len: l + B.past, time: B.time, passes: v.hits || 2, trail: 0, caught: false });
        q.cut[0].clear(); q.cut[1].clear();
        q.s.position.set(x, q.y, z); q.s.scale.setScalar(R.disc); q.s.material.opacity = 1; q.s.visible = true;
        slash(x + ux * 0.7, y + R.waist, z + uz * 0.7, -0.4, R.disc * 1.4, 0.15);
        break;
      }
      case 'clones': {   // three figures round the boss, each a third of the way round from the holder's side
        const S = shadows, at = Math.atan2(x - e.x, z - e.z), stab = STAB(), pose = stab.hits[0].startup + stab.hits[0].active;
        Object.assign(S, { age: 0, e, lead: CONFIG.abilities.clones.lead, cut: false, x: e.x, y: e.y, z: e.z });
        S.figs.forEach((f, i) => {
          const a = at + Math.PI / 3 + i * Math.PI * 2 / 3, d0 = (e.radius || 0.8) + R.clone;
          f.x = e.x + Math.sin(a) * d0; f.z = e.z + Math.cos(a) * d0; f.yaw = a + Math.PI;
          f.rig.reset(); poseAttackKeys(f.rig, stab, pose, 0, null, ANIM_SETTINGS.playerEase);
          f.rig.place(f.x, e.y, f.z, f.yaw, -Infinity); f.rig.root.visible = true;
          throwFlakes(f.x, e.y + 1, f.z, 6, INKS, DROPS);
        });
        S.mat.opacity = 0;
        break;
      }
      case 'iai': {   // the stance: still flakes rising round the holder
        const q = draws.find(o => o.holder === d.holder && o.age !== Infinity) || free(draws);
        Object.assign(q, { age: 0, holder: d.holder, b, e, x, y, z, drawn: -1, split: -1, mote: 0 });
        q.line.visible = false; q.slit.visible = false;
        break;
      }
    }
  }
  function strike(d) {
    const R = K(), e = d.enemy;
    switch (d.then) {
      case 'flurry': {   // a thrust: a streak into the boss, a tip, sparks
        if (!e) return;
        if (reducedMotion() && d.strike % 3 !== 1) return;   // reduced motion: one thrust in three drawn, no flicker
        const q = free(streaks), a = rnd() * Math.PI * 2, r = (e.radius || 0.8) * 0.5 * rnd(), cy = chestY(e) + Math.sin(a) * r * 0.8;
        q.age = 0; q.life = 0.14; q.s.position.set(e.x + Math.cos(a) * r * 0.6, cy, e.z); q.s.material.rotation = a + Math.PI;
        q.s.scale.set(1.3, 0.32, 1); q.veil = veil(e); q.s.material.opacity = q.veil; q.s.visible = true;
        if (d.strike % 3 === 1) star(q.s.position.x, cy, q.s.position.z, 0.7, 0.1, a);
        throwFlakes(e.x, cy, e.z, 2, SPARKS, SPARK);
        break;
      }
      case 'stitch': {   // a spike from the pool, leaning in alternately
        const q = stitches.find(o => o.holder === d.holder && o.age !== Infinity && o.e === e);
        if (!q || !e) return;
        const s = q.spikes[q.n++ % SPIKES], a = rnd() * Math.PI * 2, r = (e.radius || 0.8) * 0.6;
        s.age = 0; s.x = e.x + Math.cos(a) * r; s.z = e.z + Math.sin(a) * r;
        s.s.position.set(s.x, q.y, s.z); s.s.material.rotation = (q.n % 2 ? 0.35 : -0.35); s.s.scale.set(R.spike * 0.3, 0.01, 1); s.s.material.opacity = veil(e); s.s.visible = true;
        throwFlakes(s.x, q.y + 0.2, s.z, 5, INKS, DROPS);
        break;
      }
      case 'iai': {
        const q = draws.find(o => o.holder === d.holder && o.age !== Infinity);
        if (!q) return;
        if (d.strike === 1 && d.path && d.path.from && d.path.to) {   // the draw: the line along the ground, a glint at the hand
          const f = d.path.from, t = d.path.to, dx = t.x - f.x, dz = t.z - f.z;
          q.drawn = q.age; q.fx = f.x; q.fz = f.z; q.len = Math.max(1, Math.hypot(dx, dz)); q.yaw = Math.atan2(dx, dz);
          q.line.position.set(f.x, q.y + 0.05, f.z); q.line.rotation.set(0, q.yaw, 0); q.line.scale.set(0.5, 1, 0.01); q.line.material.opacity = 1; q.line.visible = true;
          star(f.x + Math.sin(q.yaw) * 0.7, q.y + R.waist, f.z + Math.cos(q.yaw) * 0.7, 0.8, 0.12);
        } else if (d.strike === 2) {   // the split: the long cut opens on the boss, shards fly
          q.split = q.age;
          const on = e || q.e, cy = on ? chestY(on) : q.y + R.waist, sx = on ? on.x : q.x, sz = on ? on.z : q.z;
          q.slit.position.set(sx, cy, sz); q.slit.material.rotation = 0.12; q.slit.scale.set(R.waist * 0.4, R.waist * 0.08, 1); q.slit.material.opacity = veil(on); q.slit.visible = true;
          star(sx, cy, sz, 1.4, 0.18);
          throwFlakes(sx, cy, sz, 18, SPARKS, BURST); throwFlakes(sx, cy, sz, 8, BLUES, SHARDS);
        }
        break;
      }
    }
  }
  // A flurry cut short drops its fan; a stance cut short drops all of it.
  function end(d) {
    if (d.then === 'flurry') for (const q of fans) if (q.holder === d.holder && q.age !== Infinity) { q.age = Infinity; q.s.visible = false; }
    if (d.then === 'iai') for (const q of draws) if (q.holder === d.holder && q.age !== Infinity) { q.age = Infinity; q.line.visible = false; q.slit.visible = false; }
  }

  // ---- Drawing -----------------------------------------------------------------------------------------------------------
  function render() {
    if (!made) return;
    const real = effectSlots.real(), R = K(), calm = reducedMotion();
    for (const q of fans) {   // in fast, held (a slight swell), out at its end
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life + 0.15) { q.age = Infinity; q.s.visible = false; continue; }
      const k = Math.min(1, q.age / 0.06) * (1 - clamp01((q.age - q.life) / 0.15));
      q.s.material.opacity = k * veil(q.e) * 0.9; q.s.scale.set(R.fan * (0.9 + 0.1 * k), R.fan * 0.5 * (0.9 + 0.1 * k), 1);
    }
    for (const q of streaks) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.s.visible = false; continue; }
      const k = q.age / q.life; q.s.scale.set(1.3 * (0.6 + 0.6 * k), 0.32 * (1 - k * 0.6), 1); q.s.material.opacity = q.veil * (1 - clamp01((k - 0.5) / 0.5));
    }
    for (const q of drills) {   // drives in by its lead, spins (slower in reduced motion), throws sparks, bursts as it goes
      if (q.age === Infinity) continue;
      q.age += real;
      const e = q.e;
      if (q.age > q.life + 0.15 || !e) { q.age = Infinity; q.g.visible = false; continue; }
      const L = R.drill, inK = clamp01(q.age / q.lead), out = clamp01((q.age - q.life) / 0.15), cy = chestY(e), r = (e.radius || 0.8) * 0.6;
      // its tip just inside the boss's near side: the cone's base sits `L` back toward the holder
      const tipBack = r - 0.25 + (1 - inK) * 1.5;
      q.g.position.set(e.x - q.ux * (tipBack + L), cy - q.uy * (tipBack + L), e.z - q.uz * (tipBack + L)); q.g.visible = true;
      q.spin.rotation.z += real * (calm ? 6 : 26);
      const s = 1 - out; q.g.scale.set(L * 0.5 * s, L * 0.5 * s, L); q.skin.material.opacity = veil(e); q.hull.material.opacity = veil(e);
      if (inK >= 1 && out <= 0 && (q.spark -= real) <= 0) { q.spark = 0.06; throwFlakes(e.x - q.ux * r, cy, e.z - q.uz * r, 3, SPARKS, SPARK); }
      if (!q.burst && q.age >= q.life) { q.burst = true; throwFlakes(e.x - q.ux * r, cy, e.z - q.uz * r, 16, BLUES, BURST); }
    }
    for (const q of stitches) {   // the pool spreads in 0.15 s and lies under the stabs; the ripple runs out; each spike up and down
      if (q.age === Infinity) continue;
      q.age += real;
      let live = q.age < 0.5;
      const spread = clamp01(q.age / 0.15);
      q.ripple.scale.setScalar(0.3 + 2.4 * clamp01(q.age / 0.4)); q.ripple.material.opacity = 1 - clamp01(q.age / 0.4); q.ripple.visible = q.age < 0.4;
      for (const s of q.spikes) {
        if (s.age === Infinity) continue;
        s.age += real; live = true;
        if (s.age > 0.45) { s.age = Infinity; s.s.visible = false; continue; }
        const up = 1 - (1 - clamp01(s.age / 0.06)) ** 2, down = clamp01((s.age - 0.2) / 0.25);
        s.s.scale.set(R.spike * 0.3 * (1 - down * 0.5), R.spike * up * (1 - down * 0.85), 1); s.s.material.opacity = veil(q.e) * (1 - down * down);
      }
      if (q.e && q.n < (q.e.alive() ? 6 : 0) && q.age < 1.2) live = true;   // more stabs may come
      const fade = live ? 0 : clamp01((q.age - 0.5) / 0.3);
      q.pool.scale.setScalar(q.size * (0.3 + 0.7 * spread)); q.pool.material.opacity = 0.85 * spread * (1 - fade);
      if (!live && fade >= 1) { q.age = Infinity; q.pool.visible = false; q.ripple.visible = false; }
    }
    for (const q of discs) {   // out to its far end, back to the hand; spinning; a trail; a cut star on each it passes; a glint at the catch
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.time) {
        if (!q.caught) { q.caught = true; star(q.x, q.y, q.z, 0.7, 0.14); }
        q.age = Infinity; q.s.visible = false; continue;
      }
      const k = q.age / (q.time / q.passes), p = Math.min(Math.floor(k), q.passes - 1), f = k - p, at = q.len * (p % 2 ? 1 - f : f);
      const back = p % 2 === 1, px = q.x + q.ux * at, pz = q.z + q.uz * at;   // back to where it was thrown, as it cuts
      q.s.position.set(px, q.y, pz); q.s.material.rotation -= real * (calm ? 8 : 30);
      if ((q.trail -= real) <= 0) { q.trail = 0.03; throwFlakes(px, q.y, pz, 1, BLUES, MOTES); }
      for (const e of Game.enemies) {
        const cut = q.cut[p & 1];
        if (cut.has(e) || !e.alive()) continue;
        if (Math.hypot(e.x - px, e.z - pz) > (e.radius || 0.8) + 0.4) continue;
        cut.add(e); const cy = chestY(e);
        slash(e.x, cy, e.z, back ? 0.5 : -0.5, R.disc * 2, 0.22); star(e.x, cy, e.z, 1, 0.16);
        throwFlakes(e.x, cy, e.z, 8, SPARKS, SHARDS);
      }
    }
    if (shadows && shadows.age !== Infinity) {   // the figures fade in, lunge at the lead (three cuts, ink), fade by 0.4 s after
      const S = shadows; S.age += real;
      const t = S.age - S.lead, e = S.e;
      if (t > 0.45 || !e) { S.age = Infinity; for (const f of S.figs) f.rig.root.visible = false; }
      else {
        const inK = clamp01(S.age / 0.1), out = clamp01((t - 0.1) / 0.35);
        S.mat.opacity = inK * (1 - out) * veil(e);
        for (const f of S.figs) {   // a step in toward the boss as they cut
          const go = t > 0 ? 0.6 * (1 - (1 - clamp01(t / 0.08)) ** 2) : 0;
          f.rig.place(f.x + Math.sin(f.yaw) * go, S.y, f.z + Math.cos(f.yaw) * go, f.yaw, -Infinity);
        }
        if (!S.cut && t >= 0) {
          S.cut = true; const cy = chestY(e);
          for (let i = 0; i < 3; i++) slash(e.x, cy + (i - 1) * 0.25, e.z, i * Math.PI / 3 + 0.3, 2.4, 0.3);
          star(e.x, cy, e.z, 1.3, 0.18);
          throwFlakes(e.x, cy, e.z, 22, INKS, BURST); throwFlakes(e.x, cy, e.z, 8, BLUES, SHARDS);
        }
      }
    }
    for (const q of draws) {   // the stance's motes; the line drawn out at the draw; the split's slit snapping open, gone 0.4 s on
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.drawn < 0 && q.age > CONFIG.abilities.iai.stance + 1) { q.age = Infinity; continue; }   // its draw was never told
      if (q.drawn >= 0 && q.split < 0 && q.age - q.drawn > CONFIG.abilities.iai.beat + 0.5) { q.age = Infinity; q.line.visible = false; continue; }   // its split never told
      if (q.split >= 0 && q.age - q.split > 0.45) { q.age = Infinity; q.line.visible = false; q.slit.visible = false; continue; }
      if (q.drawn < 0 && (q.mote -= real) <= 0) {
        q.mote = calm ? 0.2 : 0.07; const b = q.b, a = rnd() * Math.PI * 2;
        throwFlakes((b ? b.x : q.x) + Math.cos(a) * 0.6, q.y + 0.2, (b ? b.z : q.z) + Math.sin(a) * 0.6, 1, STILL, MOTES);
      }
      if (q.drawn >= 0) {
        const t = q.age - q.drawn, draw = clamp01(t / 0.06), fade = q.split >= 0 ? clamp01((q.age - q.split) / 0.3) : 0;
        q.line.scale.z = Math.max(0.01, q.len * draw); q.line.material.opacity = 1 - fade;
      }
      if (q.split >= 0) {
        const t = q.age - q.split, open = 1 - (1 - clamp01(t / 0.06)) ** 2, fade = clamp01((t - 0.15) / 0.3);
        q.slit.scale.set(R.waist * (0.4 + 4.6 * open), R.waist * 0.5 * (1 - fade * 0.7), 1); q.slit.material.opacity = 1 - fade;
      }
    }
    for (const q of slashes) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.s.visible = false; continue; }
      q.s.material.opacity = 1 - clamp01((q.age - q.life * 0.4) / (q.life * 0.6));
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
    for (const q of fans) { q.age = Infinity; q.e = q.b = q.holder = null; hide(q.s); }
    for (const q of drills) { q.age = Infinity; q.e = null; hide(q.g); }
    for (const q of stitches) { q.age = Infinity; q.e = q.holder = null; hide(q.pool); hide(q.ripple); for (const s of q.spikes) { s.age = Infinity; hide(s.s); } }
    for (const q of discs) { q.age = Infinity; q.b = null; q.cut[0].clear(); q.cut[1].clear(); hide(q.s); }
    for (const q of draws) { q.age = Infinity; q.e = q.b = q.holder = null; hide(q.line); hide(q.slit); }
    shadows.age = Infinity; shadows.e = null; for (const f of shadows.figs) f.rig.root.visible = false;
    for (const q of [...streaks, ...stars, ...slashes, ...flakes]) { q.age = Infinity; hide(q.s); }
  }
  // A press's power (its level has a `charge`) of these kinds is drawn here, and its later blows. Told apart by the data.
  const THENS = new Set(['flurry', 'drill', 'stitch', 'boomerang', 'clones', 'iai']);
  const mine = d => !d.draw && THENS.has(d.then) && d.v && d.v.charge > 0;
  const on = list => list.filter(q => q.age !== Infinity).length;
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.clear.push(clear);
      events.on('abilityPower', d => { if (!mine(d)) return; if (d.end) end(d); else if (d.strike) strike(d); else power(d); });
    },
    clear, mine,
    // tests: what shows now
    get state() {
      if (!made) return {};
      return { fan: fans.filter(q => q.s.visible).length, streaks: on(streaks), drill: drills.filter(q => q.g.visible).length,
        pool: stitches.filter(q => q.pool.visible).length, spikes: stitches.reduce((n, q) => n + q.spikes.filter(s => s.s.visible).length, 0),
        disc: discs.filter(q => q.s.visible).length, figures: shadows.figs.filter(f => f.rig.root.visible).length,
        stance: on(draws), line: draws.filter(q => q.line.visible).length, slit: draws.filter(q => q.slit.visible).length,
        slashes: on(slashes), stars: on(stars), flakes: on(flakes) };
    },
  };
})();
