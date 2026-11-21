'use strict';
// ============================================================================
// Guard II, on the boss (design/abilities BUILD-ORDER batch 9): the key-2 guards that answer the boss, drawing only
// ============================================================================
// The cel look and blue ink of the other ability effects (STYLE.md): flat hard-edged shapes in two or three tones with a
// dark ink outline, few big sharp particles, no light. Every mesh, sprite and figure is pooled and made at load; each
// ages in real time and follows what it belongs to. Tuning: VIS.abilityFx.guard2. Sounds: js/audio.js.
//   Mirror Ward    a pane of glass stands before the holder while it lasts; the blow it bounces cracks and bursts it.
//   Ash Husk       an ash copy of the holder stands where it stepped from, in its pose, embers rising; a ring at its feet
//                  while it draws a blow; struck, it bursts (a star, a ring, ash flung out, a scorch); else it crumbles.
//   Moon Dome      a pale half sphere with crescents rises where it was raised; each shot or blast it stops flashes it.
//   Waiting Blade  a dial at the feet while the stance holds; the blow it answers is met by a huge white arc.
//   Hourglass      glints mark the way back, ghost copies trail the glide, a ring closes on the place it arrives at.
//   Binding Seal   a paper strip hangs on the boss until the attack it spends; then it burns away in embers and smoke.
const guardFx2 = (() => {
  const K = () => VIS.abilityFx.guard2;
  const INK = '#0b0d12', BLUE = '#8fb8dc', CORE = '#f2f6fa', PALE = '#cfe4f2', DEEP = '#2c5f8a', ASH = '#9a958c', CHAR = '#2a2827';
  const C_BLUE = 0x8fb8dc, C_CORE = 0xf2f6fa, C_PALE = 0xcfe4f2, C_DEEP = 0x2c5f8a, C_ASH = 0x9a958c, C_CHAR = 0x2a2827;
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rnd = (() => { let s = 9173; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const inked = (g, path, fill, edge, ink = 7, rim = 2.5) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    path(); g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill();
    if (edge) { path(); g.lineWidth = rim; g.strokeStyle = edge; g.stroke(); }
  };
  const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const crescent = (g, x, y, r, a) => {   // a moon crescent: ink, pale, a white inner edge
    const path = () => { g.beginPath(); g.arc(x, y, r, a - 2.2, a + 2.2); g.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.78, a + 1.9, a - 1.9, true); g.closePath(); };
    inked(g, path, PALE, CORE, 4, 1.5);
  };
  let RING, PANE, CRACK, DOME, DIAL, ARC, STRIP, STAR, FLAKE, SCORCH, GLINT;
  function textures() {
    RING = canvasTex(128, 128, (g, w) => {
      const m = w / 2;
      for (const [r, th, c] of [[0.86, 11, INK], [0.86, 6, BLUE], [0.8, 2, CORE]]) { g.beginPath(); g.arc(m, m, m * r, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
    });
    const pane = (g, w, h) => {   // a tall pane of glass: a faint pale face, ink frame, a blue rim, two white glints
      const path = () => poly(g, [[8, 10], [w - 8, 4], [w - 6, h - 10], [10, h - 4]]);
      g.lineJoin = 'round'; path(); g.fillStyle = 'rgba(207,228,242,0.32)'; g.fill();
      path(); g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); path(); g.lineWidth = 2.5; g.strokeStyle = BLUE; g.stroke();
      g.strokeStyle = CORE; g.lineCap = 'round';
      for (const [x0, y0, x1, y1, lw] of [[0.22, 0.3, 0.5, 0.12, 5], [0.24, 0.42, 0.62, 0.18, 2.5], [0.6, 0.86, 0.8, 0.72, 3]]) {
        g.lineWidth = lw; g.beginPath(); g.moveTo(w * x0, h * y0); g.lineTo(w * x1, h * y1); g.stroke();
      }
    };
    PANE = canvasTex(128, 192, pane);
    CRACK = canvasTex(128, 192, (g, w, h) => {   // the pane cracked from where it was struck: ink lines, white edges
      pane(g, w, h);
      const cx = w * 0.48, cy = h * 0.45; g.lineCap = 'round';
      for (const [lw, c] of [[5, INK], [1.8, CORE]]) {
        g.lineWidth = lw; g.strokeStyle = c;
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * Math.PI * 2 + 0.3, l = 40 + (i * 37) % 50;
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * l * 0.5, cy + Math.sin(a) * l * 0.5 + 6); g.lineTo(cx + Math.cos(a + 0.2) * l, cy + Math.sin(a + 0.2) * l); g.stroke();
        }
        g.beginPath(); g.arc(cx, cy, 16, 0, Math.PI * 2); g.stroke();
      }
    });
    DOME = canvasTex(512, 128, (g, w, h) => {   // round the half sphere (its top at the canvas's top): a faint face, crescents, a hard rim
      g.fillStyle = 'rgba(143,184,220,0.07)'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(207,228,242,0.4)'; g.lineWidth = 2;
      for (const y of [0.34, 0.62]) { g.beginPath(); g.moveTo(0, h * y); g.lineTo(w, h * y); g.stroke(); }
      for (let i = 0; i < 6; i++) crescent(g, w * (i + 0.5) / 6, h * (i % 2 ? 0.5 : 0.76), 11 + (i % 3) * 2, i * 1.3);
      g.fillStyle = INK; g.fillRect(0, h - 9, w, 9); g.fillStyle = BLUE; g.fillRect(0, h - 7, w, 4); g.fillStyle = CORE; g.fillRect(0, h - 12, w, 2);
    });
    DIAL = canvasTex(256, 256, (g, w) => {   // Waiting Blade's dial: a hard ring, twelve ticks, one long bright mark
      const m = w / 2;
      for (const [r, th, c] of [[0.88, 10, INK], [0.88, 5, DEEP], [0.7, 6, INK], [0.7, 2, BLUE]]) { g.beginPath(); g.arc(m, m, m * r, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
      g.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, long = i === 0, r0 = m * (long ? 0.5 : 0.72), r1 = m * 0.86;
        for (const [lw, c] of [[long ? 11 : 7, INK], [long ? 5 : 3, long ? CORE : PALE]]) {
          g.lineWidth = lw; g.strokeStyle = c; g.beginPath(); g.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0); g.lineTo(m + Math.cos(a) * r1, m + Math.sin(a) * r1); g.stroke();
        }
      }
    });
    ARC = canvasTex(256, 256, (g, w) => {   // the answering cut: a huge crescent, a white core, blue edge, ink outline
      const m = w / 2;
      const path = () => { g.beginPath(); g.arc(m, m, m * 0.9, -2.5, 0.9); g.quadraticCurveTo(m * 1.2, m * 1.25, m + Math.cos(-2.5) * m * 0.62, m + Math.sin(-2.5) * m * 0.62 + 10); g.closePath(); };
      inked(g, path, BLUE, PALE, 9, 3);
      g.fillStyle = CORE; g.beginPath(); g.arc(m, m, m * 0.86, -2.3, 0.7); g.quadraticCurveTo(m * 1.25, m * 1.12, m + Math.cos(-2.3) * m * 0.74, m + Math.sin(-2.3) * m * 0.74); g.closePath(); g.fill();
    });
    STRIP = canvasTex(48, 160, (g, w, h) => {   // a seal strip: pale paper, ink border, brush glyphs, a blue seal at its foot
      inked(g, () => poly(g, [[6, 4], [w - 6, 4], [w - 5, h - 8], [w / 2, h - 3], [5, h - 8]]), '#e7edf1', null, 5);
      g.strokeStyle = INK; g.lineCap = 'round';
      for (const [x0, y0, x1, y1, lw] of [[0.3, 0.12, 0.7, 0.16, 4], [0.5, 0.1, 0.48, 0.34, 3.5], [0.28, 0.28, 0.72, 0.3, 3], [0.36, 0.42, 0.66, 0.5, 4], [0.64, 0.4, 0.34, 0.56, 3]]) {
        g.lineWidth = lw; g.beginPath(); g.moveTo(w * x0, h * y0); g.lineTo(w * x1, h * y1); g.stroke();
      }
      g.beginPath(); g.arc(w / 2, h * 0.76, w * 0.24, 0, Math.PI * 2); g.fillStyle = DEEP; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      g.strokeStyle = CORE; g.lineWidth = 2; g.beginPath(); g.moveTo(w * 0.4, h * 0.72); g.lineTo(w * 0.6, h * 0.8); g.moveTo(w * 0.6, h * 0.72); g.lineTo(w * 0.4, h * 0.8); g.stroke();
    });
    STAR = canvasTex(128, 128, (g, w) => {
      const m = w / 2, pts = [], core = [];
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + 0.2, r = i % 2 ? m * 0.24 : m * (0.72 + 0.22 * ((i * 7) % 3) / 2);
        pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); core.push([m + Math.cos(a) * r * 0.45, m + Math.sin(a) * r * 0.45]);
      }
      inked(g, () => poly(g, pts), BLUE, PALE, 6, 2);
      g.fillStyle = CORE; poly(g, core); g.fill();
    });
    FLAKE = canvasTex(32, 32, (g, w, h) => { poly(g, [[w * 0.1, h * 0.55], [w * 0.5, h * 0.1], [w * 0.9, h * 0.4], [w * 0.45, h * 0.9]]); g.fillStyle = '#fff'; g.fill(); });
    SCORCH = canvasTex(128, 128, (g, w) => {   // a burst's scorch: a ragged char blot, ash at its edge
      const m = w / 2, pts = [], inner = [];
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = m * (0.62 + 0.3 * ((i * 5) % 4) / 3); pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); inner.push([m + Math.cos(a) * r * 0.6, m + Math.sin(a) * r * 0.6]); }
      inked(g, () => poly(g, pts), '#4a4743', null, 5); g.fillStyle = '#1a1918'; poly(g, inner); g.fill();
    });
    GLINT = canvasTex(32, 32, (g, w) => {   // a four-point glint
      const m = w / 2;
      inked(g, () => poly(g, [[m, 2], [m + 4, m - 4], [w - 2, m], [m + 4, m + 4], [m, w - 2], [m - 4, m + 4], [2, m], [m - 4, m - 4]]), CORE, BLUE, 3, 1.5);
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
  // A figure's material: a flat tone in its middle, another at its edges (the cel outline seen from any side).
  function rimMaterial(base, rim, key, additive) {
    const m = new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: 0, depthWrite: !additive, side: THREE.FrontSide, fog: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    const r = new THREE.Color(rim);
    m.onBeforeCompile = sh => {
      if (!sh.vertexShader.includes('#include <project_vertex>') || !sh.fragmentShader.includes('#include <opaque_fragment>')) return;
      sh.vertexShader = 'varying vec3 vRimN, vRimV;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_SKINNING
          vRimN = transformedNormal;
        #else
          vRimN = normalMatrix * objectNormal;
        #endif
        vRimV = -mvPosition.xyz;`);
      sh.fragmentShader = 'varying vec3 vRimN, vRimV;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `float rimK = 1.0 - abs(dot(normalize(vRimN), normalize(vRimV)));
        outgoingLight = mix(outgoingLight, vec3(${r.r.toFixed(3)}, ${r.g.toFixed(3)}, ${r.b.toFixed(3)}), step(0.6, rimK));
        #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => key;
    return rigidSkinning(m);
  }
  function figure(material) {
    const rig = new Rig(PLAYER_DEF.look);
    rig.root.traverse(o => {
      o.userData.warmUp = true;
      if (o.isSkinnedMesh) { o.material = material; o.castShadow = o.receiveShadow = false; o.renderOrder = 11; }
      else if (o.isMesh || o.isSprite || o.isPoints || o.isLine) o.visible = false;   // eyes, glows, the blade: the body alone
    });
    rig.root.visible = rig.shadow.visible = false;
    return rig;
  }
  function copyPose(src, rig) {   // the drawn body's pose onto a figure (bones and root); false if they differ
    const A = src.skeleton && src.skeleton.bones, B = rig.skeleton && rig.skeleton.bones;
    if (!A || !B || A.length !== B.length) return false;
    rig.root.position.copy(src.root.position); rig.root.quaternion.copy(src.root.quaternion); rig.root.scale.copy(src.root.scale);
    for (let i = 0; i < A.length; i++) { B[i].position.copy(A[i].position); B[i].quaternion.copy(A[i].quaternion); B[i].scale.copy(A[i].scale); }
    return true;
  }

  // ---- Pools: two of each holder's shape, four domes, a few ghosts, shared rings, stars and flakes --------------------
  const FLAKES = 96, PULSES = 12, GLINTS = 12, GHOSTS = 4;
  let made = false;
  const panes = [], husks = [], scorches = [], domes = [], dials = [], arcs = [], rewinds = [], ghosts = [], seals = [], pulses = [], stars = [], flakes = [];
  function make() {
    if (made) return;
    made = true; textures();
    const floor = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), upright = new THREE.PlaneGeometry(1, 1.5).translate(0, 0.75, 0);
    const half = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let i = 0; i < PULSES; i++) pulses.push({ m: mesh(floor, mat(RING), 4), age: Infinity, life: 1, x: 0, y: 0, z: 0, r0: 1, r1: 1 });
    for (let n = 0; n < 2; n++) {
      panes.push({ m: mesh(upright, mat(PANE), 12), b: null, age: Infinity, life: 1, crack: -1, end: -1 });
      const ash = rimMaterial(0x57534d, C_CHAR, 'guardAsh', false);
      husks.push({ rig: figure(ash), mat: ash, ring: mesh(floor, mat(RING), 4), holder: null, age: Infinity, life: 1, x: 0, y: 0, z: 0, end: -1, ember: 0, draw: 0 });
      scorches.push({ m: mesh(floor, mat(SCORCH), 3), age: Infinity, life: 2.5 });
      dials.push({ m: mesh(floor, mat(DIAL), 4), b: null, age: Infinity, life: 1, end: -1 });
      rewinds.push({ b: null, age: Infinity, ring: mesh(floor, mat(RING), 4), glints: Array.from({ length: GLINTS }, () => ({ s: sprite(GLINT, 14), x: 0, y: 0, z: 0 })),
        x: 0, y: 0, z: 0, ghost: 0, end: -1 });
      seals.push({ s: sprite(STRIP, 15, 0.5, 1), e: null, age: Infinity, burn: -1, idle: 0 });
    }
    for (const q of seals) q.s.material.depthTest = false;
    for (let i = 0; i < CONFIG.abilities.domes; i++) domes.push({ m: mesh(half, mat(DOME), 12), ring: mesh(floor, mat(RING), 4), d: null, age: Infinity, flash: 0, end: -1 });
    for (let i = 0; i < 3; i++) arcs.push({ s: sprite(ARC, 15), age: Infinity, life: 0.32, size: 1 });
    for (let i = 0; i < GHOSTS; i++) { const m = rimMaterial(C_DEEP, C_PALE, 'guardGhost', true); ghosts.push({ rig: figure(m), mat: m, age: Infinity, life: 0.3 }); }
    for (let i = 0; i < 5; i++) { const s = sprite(STAR, 15); s.material.depthTest = false; stars.push({ s, age: Infinity, life: 0.2, size: 1 }); }
    for (let i = 0; i < FLAKES; i++) flakes.push({ s: sprite(FLAKE, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, grav: 0 });
  }
  const density = () => (CONFIG.VISUALS.fxBudgets[visuals.quality().fxBudget] || { density: 1 }).density;
  function free(list) {
    let old = list[0];
    for (const q of list) { if (q.age === Infinity) return q; if (q.age > old.age) old = q; }
    return old;
  }
  const mineOf = (list, key, v) => { for (const q of list) if (q.age !== Infinity && q[key] === v) return q; return null; };
  const at = b => (b.rig && b.rig.root ? b.rig.root.position : b);
  const tall = b => (b.height || 1.8);
  function throwFlakes(x, y, z, n, colors, o, aim = null) {   // `aim`: a unit { x, z } the burst leans along
    const many = Math.max(1, Math.round(n * density()));
    for (let i = 0; i < many; i++) {
      const f = free(flakes), a = rnd() * Math.PI * 2, sp = o.speed * (0.6 + rnd() * 0.6), r = (o.ring || 0) * (0.8 + rnd() * 0.3);
      f.age = 0; f.life = o.life * (0.75 + rnd() * 0.5); f.x = x + Math.cos(a) * r; f.y = y + (o.tall || 0) * rnd(); f.z = z + Math.sin(a) * r;
      f.vx = Math.cos(a) * sp + (aim ? aim.x * o.speed * 1.4 : 0); f.vz = Math.sin(a) * sp + (aim ? aim.z * o.speed * 1.4 : 0);
      f.vy = (o.up || 0) * (0.5 + rnd()); f.spin = (rnd() - 0.5) * 10; f.grav = o.grav;
      f.s.material.color.setHex(colors[i % colors.length]); f.s.material.opacity = 1; f.s.material.rotation = rnd() * 6.3;
      f.s.position.set(f.x, f.y, f.z); f.s.scale.setScalar(o.size * (0.7 + rnd() * 0.6)); f.s.visible = true;
    }
  }
  const SPARKS = [C_CORE, C_PALE, C_BLUE], GLASS = [C_CORE, C_PALE, C_BLUE], ASHES = [C_ASH, C_CHAR, 0x6f6a62], EMBERS = [C_CORE, C_BLUE, C_ASH];
  const WHITES = [C_CORE, C_PALE], SMOKES = [C_CHAR, 0x4a4743];
  const SPARK = { speed: 3.2, up: 2.2, grav: 9, size: 0.1, life: 0.3 }, SHARDS = { speed: 2.6, up: 2.2, grav: 10, size: 0.14, life: 0.5, tall: 1.2 };
  const RISE = { speed: 0.12, up: 1.2, grav: -0.4, size: 0.07, life: 0.7, ring: 0.3 }, FLUNG = { speed: 5, up: 3, grav: 10, size: 0.16, life: 0.6, tall: 1.4 };
  const FALL = { speed: 0.4, up: 0.2, grav: 4, size: 0.12, life: 0.7, ring: 0.3, tall: 1.6 }, SMOKE = { speed: 0.2, up: 0.9, grav: -0.3, size: 0.14, life: 0.8 };
  const MOTES = { speed: 0.3, up: 1.6, grav: -0.2, size: 0.08, life: 0.7, ring: 0.5 };
  const SMOULDER = { ...RISE, tall: 1.2 };
  const aim = { x: 0, z: 0 };
  function aimAt(fx, fz, tx, tz) { const dx = tx - fx, dz = tz - fz, l = Math.hypot(dx, dz) || 1; aim.x = dx / l; aim.z = dz / l; return aim; }
  function pulse(x, y, z, r0, r1, life) {
    const q = free(pulses); Object.assign(q, { age: 0, life, x, y, z, r0, r1 });
    q.m.position.set(x, y + 0.05, z); q.m.scale.setScalar(r0); q.m.material.opacity = 1; q.m.visible = true;
  }
  function star(x, y, z, size, life = 0.2) {
    const q = free(stars); q.age = 0; q.life = life; q.size = size;
    q.s.material.opacity = 1; q.s.material.rotation = rnd() * 6.3; q.s.position.set(x, y, z); q.s.scale.setScalar(size * 0.5); q.s.visible = true;
  }

  // ---- The cues -----------------------------------------------------------------------------------------------------
  function crack(b, e) {   // Mirror Ward's bounce: the pane (shown at once if this browser never saw the press) cracks and bursts
    let q = mineOf(panes, 'b', b);
    if (q && q.crack >= 0 && q.age - q.crack < 0.5) return;
    if (!q) { q = free(panes); Object.assign(q, { b, age: 0, life: 0.5 }); }
    q.crack = q.age; q.end = q.age; q.m.material.map = CRACK; q.m.visible = true;
    const p = at(b), yaw = b.rig ? b.rig.root.rotation.y : 0, R = K(), fx = p.x + Math.sin(yaw) * R.paneOff, fz = p.z + Math.cos(yaw) * R.paneOff;
    star(fx, p.y + 1.1, fz, R.star);
    throwFlakes(fx, p.y + 0.3, fz, 16, GLASS, SHARDS, e ? aimAt(p.x, p.z, e.x, e.z) : null);
  }
  function perk(d) {
    const R = K(), b = d.body, v = d.v || {};
    if (d.perk === 'press/dome' && d.dome) return dome(d.dome);
    if (!b || !b.rig) return;
    const p = at(b);
    switch (d.perk) {
      case 'press/ward': {
        const q = mineOf(panes, 'b', b) || free(panes);
        Object.assign(q, { b, age: 0, life: v.time || 1.5, crack: -1, end: -1 }); q.m.material.map = PANE; q.m.material.opacity = 0; q.m.visible = true;
        break;
      }
      case 'ward/bounce': crack(b, d.target || null); break;
      case 'dome/stop': {   // where the shot or blast met the skin: a star, sparks, the dome flashing
        const q = d.dome && mineOf(domes, 'd', d.dome), c = d.at;
        if (q) q.flash = 1;
        if (c && d.dome) {
          const D = d.dome, dx = c.x - D.x, dy = Math.max(0.3, c.y - D.y), dz = c.z - D.z, l = Math.hypot(dx, dy, dz) || 1;
          const x = D.x + dx / l * D.radius, y = D.y + dy / l * D.radius, z = D.z + dz / l * D.radius;
          star(x, y, z, R.star * 0.6, 0.15); throwFlakes(x, y, z, 6, SPARKS, SPARK);
        }
        break;
      }
      case 'press/wait': { const q = mineOf(dials, 'b', b) || free(dials); Object.assign(q, { b, age: 0, life: v.time || 1.2, end: -1 }); q.m.material.opacity = 0; q.m.visible = true; break; }
      case 'wait/answer': case 'wait/end': { const q = mineOf(dials, 'b', b); if (q && q.end < 0) q.end = q.age; break; }
      case 'press/rewind': {
        const W = b.rewind;
        if (!d.to || !W || !b.trail) { throwFlakes(p.x, p.y + 1, p.z, 6, WHITES, MOTES); break; }   // nothing to go back to
        const q = mineOf(rewinds, 'b', b) || free(rewinds);
        Object.assign(q, { b, age: 0, x: d.to.x, y: d.to.y, z: d.to.z, ghost: 0, end: -1 });
        const n = Math.min(GLINTS, W.k);
        for (let i = 0; i < GLINTS; i++) {   // the way back, its kept places (nearest now first)
          const g = q.glints[i];
          if (i >= n) { g.s.visible = false; continue; }
          const t = b.trailAt(Math.max(1, Math.round((i + 1) / n * W.k)));
          g.x = t.x; g.y = t.y + 0.9; g.z = t.z; g.s.position.set(g.x, g.y, g.z); g.s.scale.setScalar(0.22); g.s.material.opacity = 1; g.s.visible = true;
        }
        q.ring.position.set(q.x, q.y + 0.05, q.z); q.ring.scale.setScalar(R.rewindRing); q.ring.material.opacity = 1; q.ring.visible = true;
        break;
      }
      case 'rewind/end': {
        const q = mineOf(rewinds, 'b', b); if (q) q.end = q.age;
        pulse(p.x, p.y, p.z, 0.4, R.rewindRing * 1.3, 0.45); throwFlakes(p.x, p.y + 0.2, p.z, 12, WHITES, MOTES);
        break;
      }
    }
  }
  function dome(D) {
    const q = mineOf(domes, 'd', D) || free(domes);
    Object.assign(q, { d: D, age: 0, flash: 0, end: -1 });
    q.m.position.set(D.x, D.y, D.z); q.m.scale.set(D.radius, 0.01, D.radius); q.m.material.opacity = 1; q.m.material.color.setHex(0xffffff); q.m.visible = true;
    q.ring.position.set(D.x, D.y + 0.04, D.z); q.ring.scale.setScalar(D.radius * 2 / 0.86); q.ring.material.opacity = 1; q.ring.visible = true;
    throwFlakes(D.x, D.y + 0.1, D.z, 10, WHITES, { ...MOTES, ring: D.radius * 0.9 });
  }
  function power(d) {
    const R = K(), e = d.enemy, b = d.body;
    switch (d.then) {
      case 'ward': {   // the bounce lands on the boss: its pane bursts (if not yet), a star on the boss
        if (b && b.rig) crack(b, e);
        if (e) star(e.x, e.y + tall(e) * 0.6, e.z, R.star * 1.2, 0.22);
        break;
      }
      case 'answer': {   // a huge white arc between the stance and the boss, a star on it
        if (b) { const q = mineOf(dials, 'b', b); if (q && q.end < 0) q.end = q.age; }
        if (!e) break;
        const f = b ? at(b) : d, x = (f.x + e.x) / 2, z = (f.z + e.z) / 2, y = Math.max(f.y, e.y) + R.waist;
        const q = free(arcs); q.age = 0; q.size = R.answer; q.s.position.set(x, y, z); q.s.material.rotation = -0.5 + rnd() * 0.3; q.s.material.opacity = 1; q.s.scale.setScalar(R.answer * 0.4); q.s.visible = true;
        star(e.x, e.y + tall(e) * 0.6, e.z, R.star * 1.3, 0.24);
        throwFlakes(e.x, e.y + tall(e) * 0.6, e.z, 12, SPARKS, SPARK, b ? aimAt(f.x, f.z, e.x, e.z) : null);
        break;
      }
      case 'husk': {
        const q = mineOf(husks, 'holder', d.holder);
        if (d.burst) {   // struck: a star, a ring the burst's size, ash flung out, a scorch left
          if (q) { q.age = Infinity; q.rig.root.visible = false; q.ring.visible = false; }
          const r = CONFIG.abilities.husk.radius;
          star(d.x, d.y + 1, d.z, R.star * 1.6, 0.26); pulse(d.x, d.y, d.z, 0.5, r, 0.4);
          throwFlakes(d.x, d.y + 0.2, d.z, 22, ASHES, FLUNG); throwFlakes(d.x, d.y + 0.8, d.z, 10, EMBERS, SPARK);
          const s = free(scorches); s.age = 0; s.m.position.set(d.x, d.y + 0.03, d.z); s.m.scale.setScalar(R.scorch); s.m.rotation.y = rnd() * 6.3; s.m.material.opacity = 1; s.m.visible = true;
        } else if (d.end) { if (q && q.end < 0) q.end = q.age; }   // crumbling: it sinks into ash
        else {   // pressed: an ash copy where its holder stood, in its pose
          const h = q || free(husks);
          Object.assign(h, { holder: d.holder, age: 0, life: d.v && d.v.time || 3, x: d.x, y: d.y, z: d.z, end: -1, ember: 0, draw: 0 });
          if (!(b && b.rig && copyPose(b.rig, h.rig))) { h.rig.root.quaternion.identity(); h.rig.root.scale.setScalar(1); }
          h.rig.root.position.set(d.x, d.y, d.z);
          if (Number.isFinite(d.yaw)) h.rig.root.rotation.set(0, d.yaw, 0);
          h.mat.opacity = 0; h.rig.root.visible = true;
          throwFlakes(d.x, d.y + 0.1, d.z, 10, ASHES, { ...RISE, ring: 0.5 });
        }
        break;
      }
      case 'seal': {
        if (!e) break;
        let q = mineOf(seals, 'e', e);
        if (d.sputter) { if (q && q.burn < 0) q.burn = q.age; else if (!q) { q = free(seals); Object.assign(q, { e, age: 0, burn: 0, idle: 0 }); q.s.visible = true; } }
        else { q = q || free(seals); Object.assign(q, { e, age: 0, burn: -1, idle: 0 }); q.s.material.color.setHex(0xffffff); q.s.material.opacity = 1; q.s.visible = true; }
        const y = e.y + tall(e) * R.sealUp;
        if (d.sputter) { throwFlakes(e.x, y - 0.3, e.z, 8, EMBERS, SPARK); throwFlakes(e.x, y, e.z, 8, SMOKES, SMOKE); }
        else star(e.x, y - 0.3, e.z, R.star * 0.8, 0.16);
        break;
      }
    }
  }

  const clamp01 = x => Math.max(0, Math.min(1, x));
  function render() {
    if (!made) return;
    const real = effectSlots.real(), R = K(), calm = reducedMotion();
    for (const q of panes) {   // before the holder, as it faces; fades in, and out when it runs out or bursts
      if (q.age === Infinity) continue;
      q.age += real;
      const b = q.b, st = b && b.perk;
      if (q.end < 0 && (q.age > q.life || (st && q.age > 0.15 && !(st.ward > 0)))) q.end = q.age;
      const out = q.end >= 0 ? clamp01((q.age - q.end) / (q.crack >= 0 ? 0.3 : 0.2)) : 0;
      if (!b || !b.rig || out >= 1) { q.age = Infinity; q.b = null; q.m.visible = false; continue; }
      const p = at(b), yaw = b.rig.root.rotation.y;
      q.m.position.set(p.x + Math.sin(yaw) * R.paneOff, p.y + 0.15, p.z + Math.cos(yaw) * R.paneOff); q.m.rotation.set(0, yaw, 0);
      const s = R.pane * (q.crack >= 0 ? 1 + out * 0.25 : 0.7 + 0.3 * (1 - (1 - clamp01(q.age / 0.12)) ** 2));
      q.m.scale.setScalar(s); q.m.material.opacity = clamp01(q.age / 0.08) * (1 - out);
    }
    for (const q of husks) {   // stands, embers rising; a ring at its feet while it draws a blow; sinks into ash at its end
      if (q.age === Infinity) continue;
      q.age += real;
      const sink = q.end >= 0 ? clamp01((q.age - q.end) / 0.6) : 0;
      if (sink >= 1 || q.age > q.life + 4) { q.age = Infinity; q.rig.root.visible = false; q.ring.visible = false; continue; }
      q.rig.root.position.y = q.y - sink * 1.6; q.mat.opacity = clamp01(q.age / 0.15) * (1 - sink);
      const h = abilityPowers.husks.get(q.holder), drawing = h ? !!(h.drawing && h.lure) : drawnTo(q.x, q.z);
      q.draw = Math.max(0, Math.min(1, q.draw + (drawing ? real : -real) * 5));
      q.ring.visible = q.draw > 0 && sink === 0;
      if (q.ring.visible) { q.ring.position.set(q.x, q.y + 0.04, q.z); q.ring.scale.setScalar(R.huskRing * (calm ? 1 : 1 + 0.08 * Math.sin(q.age * 6))); q.ring.material.opacity = q.draw; }
      if ((q.ember -= real) <= 0 && sink === 0) { q.ember = 0.2; throwFlakes(q.x, q.y + 0.4, q.z, 1, EMBERS, SMOULDER); }
      if (q.end >= 0 && q.age - q.end < real * 1.5) throwFlakes(q.x, q.y + 0.2, q.z, 14, ASHES, FALL);
    }
    for (const q of scorches) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.m.visible = false; continue; }
      q.m.material.opacity = 1 - clamp01((q.age - q.life * 0.6) / (q.life * 0.4));
    }
    for (const q of domes) {   // rises; flashes at each stop; fades in its last half second, or at once when gone
      if (q.age === Infinity) continue;
      q.age += real;
      const D = q.d, there = D && abilityDomes.list.includes(D);
      if (q.end < 0 && !there) q.end = q.age;
      const out = q.end >= 0 ? clamp01((q.age - q.end) / 0.3) : 0;
      if (!D || out >= 1) { q.age = Infinity; q.d = null; q.m.visible = false; q.ring.visible = false; continue; }
      const rise = 1 - (1 - clamp01(q.age / 0.25)) ** 3, last = there ? clamp01(D.left / 0.5) : 1;
      q.m.scale.set(D.radius, Math.max(0.01, D.radius * rise), D.radius);
      q.flash = Math.max(0, q.flash - real * 5);
      const k = 1 + q.flash * 0.8; q.m.material.color.setRGB(k, k, k);
      q.m.material.opacity = (0.6 + q.flash * 0.4) * last * (1 - out); q.ring.material.opacity = last * (1 - out);
    }
    for (const q of dials) {   // at the feet while the stance holds, turning slowly; fades at its end
      if (q.age === Infinity) continue;
      q.age += real;
      const b = q.b;
      if (q.end < 0 && (q.age > q.life + 0.1 || (b && b.rootKind !== undefined && q.age > 0.1 && (b.rootKind !== 'wait' || !(b.root > 0))))) q.end = q.age;
      const out = q.end >= 0 ? clamp01((q.age - q.end) / 0.2) : 0;
      if (!b || out >= 1) { q.age = Infinity; q.b = null; q.m.visible = false; continue; }
      const p = at(b), grow = 1 - (1 - clamp01(q.age / 0.15)) ** 2;
      q.m.position.set(p.x, p.y + 0.04, p.z); q.m.scale.setScalar(R.dial * (1.25 - 0.25 * grow)); q.m.rotation.y = calm ? 0 : -q.age * 0.6;
      q.m.material.opacity = grow * (1 - out);
    }
    for (const q of arcs) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.s.visible = false; continue; }
      q.s.scale.setScalar(q.size * (0.4 + 0.6 * clamp01(q.age / 0.06))); q.s.material.opacity = 1 - clamp01((q.age - 0.1) / (q.life - 0.1));
    }
    for (const q of rewinds) {   // ghosts left along the glide, glints gone as the body passes, the ring closing on its place
      if (q.age === Infinity) continue;
      q.age += real;
      const b = q.b, out = q.end >= 0 ? clamp01((q.age - q.end) / 0.15) : 0;
      if (!b || out >= 1 || q.age > 3) { q.age = Infinity; q.b = null; q.ring.visible = false; for (const g of q.glints) g.s.visible = false; continue; }
      const p = at(b), glide = CONFIG.abilities.rewind.glide, t = clamp01(q.age / glide);
      for (const g of q.glints) {
        if (!g.s.visible) continue;
        if (q.end >= 0 || Math.hypot(g.x - p.x, g.z - p.z) < 0.5) { g.s.visible = false; continue; }
        g.s.material.rotation += real * (calm ? 0 : 3);
      }
      q.ring.scale.setScalar(Math.max(0.05, R.rewindRing * (1 - 0.6 * t))); q.ring.material.opacity = 1 - out;
      if (b.rewind && (q.ghost -= real) <= 0) {
        q.ghost = calm ? 0.15 : 0.07;
        const g = free(ghosts);
        if (b.rig && copyPose(b.rig, g.rig)) { g.age = 0; g.mat.opacity = 0.8; g.rig.root.visible = true; }
      }
    }
    for (const g of ghosts) {
      if (g.age === Infinity) continue;
      g.age += real;
      if (g.age > g.life) { g.age = Infinity; g.rig.root.visible = false; continue; }
      g.mat.opacity = 0.8 * (1 - g.age / g.life);
    }
    for (const q of seals) {   // hangs at the boss's chest, swaying; burns from its foot up when the attack is spent
      if (q.age === Infinity) continue;
      q.age += real;
      const e = q.e;
      if (!e || !e.alive()) { q.age = Infinity; q.e = null; q.s.visible = false; continue; }
      if (q.burn < 0) {   // never left hanging: no seal held and no attack under way for a moment (the word never came)
        q.idle = !(e.sealed > 0) && !e.in('attacking') ? q.idle + real : 0;
        if (q.idle > 0.6) q.burn = q.age;
      }
      const burn = q.burn >= 0 ? clamp01((q.age - q.burn) / 0.6) : 0;
      if (burn >= 1) { q.age = Infinity; q.e = null; q.s.visible = false; continue; }
      const slap = 1 + 0.4 * (1 - clamp01(q.age / 0.1)), H = R.seal * slap;
      q.s.position.set(e.x, e.y + tall(e) * R.sealUp, e.z); q.s.scale.set(H * 0.3, H * (1 - burn), 1);
      q.s.material.rotation = calm ? 0 : Math.sin(q.age * 2.2) * 0.08;
      const c = 1 - 0.75 * clamp01(burn * 1.6); q.s.material.color.setRGB(c, c * 0.95, c * 0.9); q.s.material.opacity = 1 - clamp01((burn - 0.7) / 0.3);
      if (burn > 0 && burn < 0.9 && rnd() < real * 20) throwFlakes(e.x, e.y + tall(e) * R.sealUp - H * (1 - burn), e.z, 1, EMBERS, RISE);
    }
    for (const q of pulses) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.m.visible = false; continue; }
      const t = clamp01(q.age / q.life), ease = 1 - (1 - t) ** 2;
      q.m.scale.setScalar(Math.max(0.01, q.r0 + (q.r1 - q.r0) * ease)); q.m.material.opacity = 1 - clamp01((t - 0.5) / 0.5);
    }
    for (const q of stars) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.s.visible = false; continue; }
      const k = Math.min(1, q.age / 0.04); q.s.scale.setScalar(q.size * (0.5 + 0.5 * k)); q.s.material.opacity = 1 - clamp01((q.age - q.life * 0.5) / (q.life * 0.5));
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
    for (const q of panes) { q.age = Infinity; q.b = null; hide(q.m); }
    for (const q of husks) { q.age = Infinity; q.holder = null; q.rig.root.visible = false; hide(q.ring); }
    for (const q of domes) { q.age = Infinity; q.d = null; hide(q.m); hide(q.ring); }
    for (const q of dials) { q.age = Infinity; q.b = null; hide(q.m); }
    for (const q of rewinds) { q.age = Infinity; q.b = null; hide(q.ring); for (const g of q.glints) hide(g.s); }
    for (const q of ghosts) { q.age = Infinity; q.rig.root.visible = false; }
    for (const q of seals) { q.age = Infinity; q.e = null; hide(q.s); }
    for (const q of [...scorches, ...pulses]) { q.age = Infinity; hide(q.m); }
    for (const q of [...arcs, ...stars, ...flakes]) { q.age = Infinity; hide(q.s); }
  }
  const PERKS = new Set(['press/ward', 'ward/bounce', 'press/dome', 'dome/stop', 'press/wait', 'wait/answer', 'wait/end', 'press/rewind', 'rewind/end']);
  // Online (and Boss Rush alone, its run in a hidden frame) the page holds no husk: an enemy the snapshot shows drawn to a
  // lure where it stands is drawing a blow (`netTarget` 'summon', `netLure`, js/net-view.js).
  function drawnTo(x, z) {
    for (const e of Game.enemies) {
      const l = e.netTarget === 'summon' && e.netLure;
      if (l && e.alive() && (l.x - x) ** 2 + (l.z - z) ** 2 < 0.25) return true;
    }
    return false;
  }
  const POWERS = new Set(['ward', 'answer', 'husk', 'seal']);
  const on = list => list.filter(q => q.age !== Infinity).length;
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.stage.push(clear);
      events.on('abilityPerk', d => { if (PERKS.has(d.perk)) perk(d); });
      events.on('abilityPower', d => { if (POWERS.has(d.then)) power(d); });
    },
    clear,
    // tests: what shows now
    get state() {
      if (!made) return {};
      return { panes: panes.filter(q => q.m.visible).length, cracked: panes.filter(q => q.m.visible && q.crack >= 0).length,
        husks: husks.filter(q => q.rig.root.visible).length, drawing: husks.filter(q => q.ring.visible).length, scorches: on(scorches),
        domes: domes.filter(q => q.m.visible).length, flash: domes.filter(q => q.flash > 0).length, dials: dials.filter(q => q.m.visible).length,
        arcs: on(arcs), glints: rewinds.reduce((n, q) => n + q.glints.filter(g => g.s.visible).length, 0), rewinds: on(rewinds),
        ghosts: on(ghosts), seals: seals.filter(q => q.s.visible).length, burning: seals.filter(q => q.age !== Infinity && q.burn >= 0).length,
        pulses: on(pulses), stars: on(stars), flakes: on(flakes) };
    },
  };
})();
