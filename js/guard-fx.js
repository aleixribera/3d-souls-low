'use strict';
// ============================================================================
// Guard I, on yourself (design/abilities BUILD-ORDER batch 8): the key-2 guards drawn, drawing only
// ============================================================================
// The cel look and blue ink of the other ability effects (STYLE.md): flat hard-edged shapes in two or three tones with a
// dark ink outline, few big sharp particles, no light. Every mesh, sprite and figure is pooled and made at load; each
// ages in real time from the press and follows its holder's drawn body. Tuning: VIS.abilityFx.guard. Sounds: js/audio.js.
//   Mending         a ring rises from the feet to the head with brush strokes inside it, closes over the head; motes fall.
//   Iron Stance     a hard blue shell round the body and a ring at the feet while it lasts; each deflect a starburst.
//   Iron Root       dark iron roots with blue veins round the feet (cracking out anew when the body moves); each blow chips.
//   Unbroken        a tall blue flame over the head; a killing blow held flares it and bursts a ring along the floor.
//   Vanishing Step  the body breaks into a swirl of petals that follows it, and reforms (the body hidden: js/player-pose.js).
//   Ember Mail      plates fly onto the body and lock; each blow taken shatters the outer layer.
//   Still Water     a dark mirror of water spreads at the feet, rings crossing it; droplets rise round a body healing in it.
const guardFx = (() => {
  const K = () => VIS.abilityFx.guard;
  const INK = '#0b0d12', BLUE = '#8fb8dc', CORE = '#f2f6fa', PALE = '#cfe4f2', DEEP = '#2c5f8a', IRON = '#2a2827', WATER = '#0b1a2a';
  const C_BLUE = 0x8fb8dc, C_CORE = 0xf2f6fa, C_PALE = 0xcfe4f2, C_DEEP = 0x2c5f8a, C_STONE = 0x9a958c;
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rnd = (() => { let s = 2741; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const inked = (g, path, fill, edge, ink = 7, rim = 2.5) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    path(); g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill();
    if (edge) { path(); g.lineWidth = rim; g.strokeStyle = edge; g.stroke(); }
  };
  const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  let RING, STROKE, STAR, ROOTS, FLAME, PETAL, PLATE, POOL, FLAKE;
  function textures() {
    RING = canvasTex(128, 128, (g, w) => {   // a flat hard ring: ink outside, blue, a white inner line
      const m = w / 2;
      for (const [r, th, c] of [[0.86, 11, INK], [0.86, 6, BLUE], [0.8, 2, CORE]]) { g.beginPath(); g.arc(m, m, m * r, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
    });
    STROKE = canvasTex(32, 128, (g, w, h) => {   // a calligraphy stroke, wide at its foot, tapering to a point
      inked(g, () => poly(g, [[w * 0.2, h - 4], [w * 0.62, h * 0.35], [w * 0.5, 4], [w * 0.8, h * 0.4], [w * 0.78, h - 4]]), CORE, BLUE, 5, 2);
    });
    STAR = canvasTex(128, 128, (g, w) => {   // a starburst of hard spikes, a white core
      const m = w / 2, pts = [], core = [];
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + 0.2, r = i % 2 ? m * 0.24 : m * (0.72 + 0.22 * ((i * 7) % 3) / 2);
        pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); core.push([m + Math.cos(a) * r * 0.45, m + Math.sin(a) * r * 0.45]);
      }
      inked(g, () => poly(g, pts), BLUE, PALE, 6, 2);
      g.fillStyle = CORE; poly(g, core); g.fill();
    });
    ROOTS = canvasTex(256, 256, (g, w) => {   // iron roots branching out from the middle, a blue vein down each
      const m = w / 2, segs = [];
      const grow = (x, y, a, l, th, n) => {
        const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
        segs.push([x, y, x2, y2, th]);
        if (n > 0) { grow(x2, y2, a + (rnd() - 0.5) * 0.9, l * 0.72, th * 0.7, n - 1); if (rnd() < 0.65) grow(x2, y2, a + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.5), l * 0.6, th * 0.6, n - 2); }
      };
      for (let i = 0; i < 7; i++) grow(m, m, i / 7 * Math.PI * 2 + rnd() * 0.5, m * 0.36, 13, 3);
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const [lw, c] of [[1.6, INK], [1, IRON], [0.22, BLUE]]) {
        g.strokeStyle = c;
        for (const [x, y, x2, y2, th] of segs) { g.lineWidth = Math.max(1.2, th * lw + (lw > 1.5 ? 3 : 0)); g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); }
      }
      g.beginPath(); g.arc(m, m, 16, 0, Math.PI * 2); g.fillStyle = IRON; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
    });
    FLAME = canvasTex(128, 256, (g, w, h) => {   // a tall flame: blue tongues, white at the base, dark inner lines
      const tongue = (cx, top, half) => () => {
        g.beginPath(); g.moveTo(cx - half, h - 6);
        g.quadraticCurveTo(cx - half * 1.1, h * 0.55, cx - half * 0.15, top + h * 0.08); g.lineTo(cx, top);
        g.quadraticCurveTo(cx + half * 0.4, h * 0.45, cx + half, h - 6); g.closePath();
      };
      inked(g, tongue(w * 0.5, 6, w * 0.38), BLUE, null, 8);
      inked(g, tongue(w * 0.32, h * 0.28, w * 0.18), BLUE, null, 5);
      inked(g, tongue(w * 0.7, h * 0.22, w * 0.18), BLUE, null, 5);
      g.fillStyle = PALE; tongue(w * 0.5, h * 0.35, w * 0.22)(); g.fill();
      g.fillStyle = CORE; tongue(w * 0.5, h * 0.62, w * 0.2)(); g.fill();
      g.strokeStyle = INK; g.lineWidth = 3; g.lineCap = 'round';
      for (const [x0, y0, x1, y1] of [[0.42, 0.7, 0.46, 0.3], [0.6, 0.75, 0.56, 0.42]]) { g.beginPath(); g.moveTo(w * x0, h * y0); g.lineTo(w * x1, h * y1); g.stroke(); }
    });
    PETAL = canvasTex(32, 32, (g, w, h) => {   // a petal: blue, a white inner tone, an ink outline
      const path = () => { g.beginPath(); g.moveTo(w * 0.5, 3); g.quadraticCurveTo(w - 3, h * 0.5, w * 0.5, h - 3); g.quadraticCurveTo(3, h * 0.5, w * 0.5, 3); g.closePath(); };
      inked(g, path, BLUE, null, 4);
      g.fillStyle = CORE; g.beginPath(); g.moveTo(w * 0.5, 8); g.quadraticCurveTo(w * 0.66, h * 0.5, w * 0.5, h * 0.62); g.quadraticCurveTo(w * 0.4, h * 0.4, w * 0.5, 8); g.fill();
    });
    PLATE = canvasTex(64, 48, (g, w, h) => {   // a curved plate: deep blue, blue edges, a white-hot seam
      const path = () => { g.beginPath(); g.moveTo(5, h * 0.3); g.quadraticCurveTo(w / 2, -4, w - 5, h * 0.3); g.lineTo(w - 10, h - 5); g.quadraticCurveTo(w / 2, h * 0.7, 10, h - 5); g.closePath(); };
      inked(g, path, DEEP, BLUE, 6, 3);
      g.strokeStyle = CORE; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h * 0.12); g.lineTo(w / 2, h * 0.78); g.stroke();
    });
    POOL = canvasTex(256, 256, (g, w) => {   // still water: a dark mirror, blue light from under it, a foam-white rim
      const m = w / 2, grad = g.createRadialGradient(m, m, 0, m, m, m * 0.9);
      grad.addColorStop(0, '#24557d'); grad.addColorStop(0.55, '#123250'); grad.addColorStop(1, WATER);
      g.beginPath(); g.arc(m, m, m * 0.9, 0, Math.PI * 2); g.fillStyle = grad; g.fill();
      g.strokeStyle = '#3b6f99'; g.lineWidth = 3;   // the sky's dim reflection: two flat streaks
      for (const [y, l] of [[0.38, 0.5], [0.46, 0.32]]) { g.beginPath(); g.moveTo(m - m * l, m * y * 2 - m * 0.2); g.lineTo(m + m * l * 0.6, m * y * 2 - m * 0.28); g.stroke(); }
      for (const [r, th, c] of [[0.92, 12, INK], [0.9, 6, CORE], [0.84, 2, BLUE]]) { g.beginPath(); g.arc(m, m, m * r, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
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
  // Iron Stance's shell: the holder's body again, pushed out along its normals and drawn from behind (the cel hull).
  function shellMaterial() {
    const m = new THREE.MeshBasicMaterial({ color: C_BLUE, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false });
    m.onBeforeCompile = sh => {
      if (!sh.vertexShader.includes('#include <skinning_vertex>')) return;
      sh.vertexShader = sh.vertexShader.replace('#include <skinning_vertex>', `#include <skinning_vertex>
        #ifdef USE_SKINNING
          transformed += normalize(objectNormal) * ${K().shell.toFixed(3)};
        #endif`);
    };
    m.customProgramCacheKey = () => 'guardShell';
    return rigidSkinning(m);
  }

  // ---- Pools: two of each (two holders may press at once), four pools, a shared set of rings and flakes ----------------
  const FLAKES = 96, PULSES = 14, PETALS = 36, SLOTS = [['pl', 0.28, 1.45, 0], ['pr', -0.28, 1.45, 0], ['br', 0, 1.18, 0.17], ['vl', 0.36, 1.0, 0.1], ['vr', -0.36, 1.0, 0.1]];
  let made = false;
  const pulses = [], heals = [], shells = [], stars = [], roots = [], flames = [], swirls = [], mails = [], pools = [], flakes = [];
  function make() {
    if (made) return;
    made = true; textures();
    const floor = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < PULSES; i++) pulses.push({ m: mesh(floor, mat(RING), 4), age: Infinity, life: 1, b: null, x: 0, y: 0, z: 0, r0: 1, r1: 1, y0: 0, y1: 0, close: 0 });
    const shellMat = shellMaterial();
    for (let n = 0; n < 2; n++) {
      heals.push({ strokes: [0, 1, 2].map(() => sprite(STROKE, 13, 0.5, 0)), ring: null, age: Infinity, b: null });
      const rig = new Rig(PLAYER_DEF.look), m = shellMat.clone();
      m.onBeforeCompile = shellMat.onBeforeCompile; m.customProgramCacheKey = shellMat.customProgramCacheKey;
      rig.root.traverse(o => {
        o.userData.warmUp = true;
        if (o.isSkinnedMesh) { o.material = m; o.castShadow = o.receiveShadow = false; o.renderOrder = 11; }
        else if (o.isMesh || o.isSprite || o.isPoints || o.isLine) o.visible = false;   // eyes, glows, the blade: the body alone
      });
      rig.root.visible = rig.shadow.visible = false;
      shells.push({ rig, mat: m, ring: mesh(floor, mat(RING), 4), age: Infinity, life: 1, b: null, line: 0 });
      roots.push({ m: mesh(floor, mat(ROOTS), 3), age: Infinity, life: 1, b: null, x: 0, z: 0, grown: 0, pulse: 0 });
      flames.push({ s: sprite(FLAME, 14, 0.5, 0), age: Infinity, life: 1, b: null, flare: -1, spark: 0 });
      swirls.push({ petals: Array.from({ length: PETALS }, () => ({ s: sprite(PETAL, 14), a: 0, r: 0, h: 0, spin: 0 })), age: Infinity, life: 1, b: null, end: -1 });
      mails.push({ plates: Array.from({ length: SLOTS.length * 2 }, () => sprite(PLATE, 14)), age: Infinity, life: 1, b: null, layers: 0, ember: 0, fall: -1 });
    }
    for (let i = 0; i < 4; i++) pools.push({ m: mesh(floor, mat(POOL), 3), q: null, age: Infinity, life: 1, x: 0, y: 0, z: 0, size: 1, ring: 0, drop: 0 });
    for (let i = 0; i < 4; i++) { const s = sprite(STAR, 15); s.material.depthTest = false; stars.push({ s, age: Infinity, life: 0.2, size: 1 }); }
    for (let i = 0; i < FLAKES; i++) flakes.push({ s: sprite(FLAKE, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, grav: 0, wait: 0 });
  }
  const density = () => (CONFIG.VISUALS.fxBudgets[visuals.quality().fxBudget] || { density: 1 }).density;
  function free(list) {   // an idle one, else the oldest (a loop: called from the drawing too)
    let old = list[0];
    for (const q of list) { if (q.age === Infinity) return q; if (q.age > old.age) old = q; }
    return old;
  }
  const slotOf = (list, b) => list.find(q => q.age !== Infinity && q.b === b) || free(list);   // a holder's own, renewed
  const at = b => (b.rig && b.rig.root ? b.rig.root.position : b);   // where the body is drawn
  function throwFlakes(x, y, z, n, colors, o, wait = 0) {
    const many = Math.max(1, Math.round(n * density()));
    for (let i = 0; i < many; i++) {
      const f = free(flakes), a = rnd() * Math.PI * 2, sp = o.speed * (0.6 + rnd() * 0.6), r = (o.ring || 0) * (0.8 + rnd() * 0.3);
      f.age = 0; f.wait = wait; f.life = o.life * (0.75 + rnd() * 0.5); f.x = x + Math.cos(a) * r; f.y = y + (o.tall || 0) * rnd(); f.z = z + Math.sin(a) * r;
      f.vx = Math.cos(a) * sp; f.vz = Math.sin(a) * sp; f.vy = (o.up || 0) * (0.5 + rnd()); f.spin = (rnd() - 0.5) * 10; f.grav = o.grav;
      f.s.material.color.setHex(colors[i % colors.length]); f.s.material.opacity = 1; f.s.material.rotation = rnd() * 6.3;
      f.s.position.set(f.x, f.y, f.z); f.s.scale.setScalar(o.size * (0.7 + rnd() * 0.6)); f.s.visible = wait <= 0;
    }
  }
  const BLUES = [C_PALE, C_BLUE], SPARKS = [C_CORE, C_PALE, C_BLUE], STONES = [C_STONE, 0x6f6a62], EMBERS = [C_CORE, C_BLUE, C_PALE];
  const MOTES = { speed: 0.25, up: 0.2, grav: 0.6, size: 0.08, life: 0.8, ring: 0.5 }, SPARK = { speed: 3.2, up: 2.2, grav: 9, size: 0.1, life: 0.3 };
  const CHIPS = { speed: 1.4, up: 3.2, grav: 12, size: 0.1, life: 0.45, ring: 0.35 }, SHARDS = { speed: 2.4, up: 2.4, grav: 10, size: 0.13, life: 0.45 };
  const RISE = { speed: 0.1, up: 1.4, grav: -0.4, size: 0.06, life: 0.6 }, DROPS = { speed: 0.3, up: 2.4, grav: 9, size: 0.07, life: 0.45, ring: 0.25 };
  const SMOKE = { speed: 0.15, up: 0.8, grav: -0.3, size: 0.12, life: 0.7 }, SETTLE = { speed: 0.4, up: 0.3, grav: 1.2, size: 0.1, life: 0.6, ring: 0.4, tall: 1.2 };
  const BREAK = { ...SHARDS, tall: 0.8 }, LINE = { ...RISE, ring: 0.3, up: 2.2 }, EMBER = { ...RISE, ring: 0.3 }, FLARE = { ...SPARK, speed: 4 }, MEND = { ...MOTES, tall: 1.4 };
  const SHELLS = [C_BLUE, C_PALE], WHITES = [C_CORE, C_PALE], PETALS_C = [C_BLUE, C_CORE], DEEPS = [C_BLUE, C_DEEP];
  function pulse(x, y, z, r0, r1, life, o = {}) {
    const q = free(pulses);
    Object.assign(q, { age: 0, life, b: o.b || null, x, y, z, r0, r1, y0: o.y0 || 0, y1: o.y1 || 0, close: o.close || 0 });
    q.m.position.set(x, y + 0.05, z); q.m.scale.setScalar(r0); q.m.material.opacity = 1; q.m.visible = true;
  }
  function star(x, y, z, size, life = 0.2) {
    const q = free(stars); q.age = 0; q.life = life; q.size = size;
    q.s.material.opacity = 1; q.s.material.rotation = rnd() * 6.3; q.s.position.set(x, y, z); q.s.scale.setScalar(size * 0.5); q.s.visible = true;
  }

  // ---- The cues: each from the press (t = 0), the moments as they are told -------------------------------------------
  function perk(d) {
    const R = K(), b = d.body, v = d.v || {};
    if (d.perk === 'press/pool' && d.pool) return pool(d.pool);
    if (!b || !b.rig) return;
    const p = at(b);
    switch (d.perk) {
      case 'press/heal': {   // the ring rising from the feet, its strokes inside; motes shed from its rim
        const q = slotOf(heals, b); q.age = 0; q.b = b;
        pulse(p.x, p.y, p.z, R.mend, R.mend * 0.73, R.mendTime + 0.3, { b, y1: R.mendRise, close: R.mendTime });
        for (const s of q.strokes) { s.material.opacity = 1; s.visible = true; }
        throwFlakes(p.x, p.y + 0.3, p.z, 16, BLUES, MEND, 0.1);
        break;
      }
      case 'press/stance': { const q = slotOf(shells, b); q.age = 0; q.life = v.time || 4; q.b = b; q.line = 0; break; }
      case 'stance/deflect': {   // a starburst at the blow's contact, sparks along it
        const e = d.target, x = e ? (e.x + p.x) / 2 : p.x, z = e ? (e.z + p.z) / 2 : p.z, y = p.y + 1.2;
        star(x, y, z, R.star); throwFlakes(x, y, z, 8, SPARKS, SPARK);
        break;
      }
      case 'press/root': { const q = slotOf(roots, b); Object.assign(q, { age: 0, life: v.time || 4, b, x: p.x, z: p.z, grown: 0, pulse: 0 }); q.m.material.color.setHex(0xffffff); q.m.material.opacity = 1; q.m.visible = true; q.m.rotation.y = rnd() * 6.3; throwFlakes(p.x, p.y + 0.05, p.z, 5, STONES, CHIPS); break; }
      case 'root/bite': {   // chips jump, a hard white spark at the contact, a pulse down the veins
        const q = roots.find(q => q.b === b && q.age !== Infinity); if (q) q.pulse = 1;
        throwFlakes(p.x, p.y + 0.05, p.z, 6, STONES, CHIPS);
        const c = d.at; if (c) star((c.x + p.x) / 2, p.y + 1.1, (c.z + p.z) / 2, R.star * 0.45, 0.12);
        break;
      }
      case 'press/undying': {
        if (d.saved) {   // a killing blow held: the flame flares, a ring bursts along the floor
          const q = flames.find(q => q.b === b && q.age !== Infinity); if (q) q.flare = q.age;
          pulse(p.x, p.y, p.z, 0.4, R.flareRing, 0.45);
          throwFlakes(p.x, p.y + 1, p.z, 12, SPARKS, FLARE);
          break;
        }
        const q = slotOf(flames, b); Object.assign(q, { age: 0, life: v.time || 3, b, flare: -1, spark: 0 }); q.s.material.color.setHex(0xffffff); q.s.visible = true;
        break;
      }
      case 'press/vanish': {   // the petals break out of the body and swirl round where it is
        const q = slotOf(swirls, b); Object.assign(q, { age: 0, life: v.time || 0.6, b, end: -1 });
        const n = Math.round(PETALS * Math.max(0.55, density()));
        q.petals.forEach((f, i) => { f.a = rnd() * Math.PI * 2; f.r = 0.3 + rnd() * 0.3; f.h = 0.1 + rnd() * 1.7; f.spin = (rnd() - 0.5) * 9; f.s.visible = i < n; f.s.material.opacity = 1; });
        break;
      }
      case 'vanish/end': { const q = swirls.find(q => q.b === b && q.age !== Infinity && q.end < 0); if (q) q.end = q.age; break; }
      case 'press/armour': {   // the plates fly in and lock (two layers from two blows up)
        const q = slotOf(mails, b); Object.assign(q, { age: 0, life: v.time || 8, b, layers: Math.min(2, v.hits || 1), ember: 0, fall: -1 });
        q.plates.forEach((s, i) => { s.visible = i < q.layers * SLOTS.length; s.material.opacity = 1; s.material.color.setHex(0xffffff); });
        break;
      }
      case 'armour/crack': case 'armour/broken': {   // the outer layer (or all) cracks white and bursts outward from the blow
        const q = mails.find(q => q.b === b && q.age !== Infinity); if (!q) break;
        const lose = d.perk === 'armour/broken' ? q.layers : 1;
        for (let k = 0; k < lose && q.layers > 0; k++) { q.layers--; for (let i = 0; i < SLOTS.length; i++) hide(q.plates[q.layers * SLOTS.length + i]); }
        throwFlakes(p.x, p.y + 1.2, p.z, 12, DEEPS, SHARDS); throwFlakes(p.x, p.y + 1.2, p.z, 10, EMBERS, SPARK);
        star(p.x, p.y + 1.25, p.z, R.star * 0.7, 0.1);
        if (q.layers <= 0) q.age = Infinity;
        break;
      }
    }
  }
  function pool(src) {   // a pool told (its holder's own, or another's from the server): a disc spreading at the feet
    let q = pools.find(o => o.q === src && o.age !== Infinity) || free(pools);
    Object.assign(q, { q: src, age: 0, life: src.time, x: src.x, y: src.y, z: src.z, size: src.radius * 2, ring: 0.35, drop: 0 });
    q.m.position.set(src.x, src.y + 0.03, src.z); q.m.scale.setScalar(0.01); q.m.material.opacity = 1; q.m.visible = true;
  }

  const clamp01 = x => Math.max(0, Math.min(1, x));
  function render() {
    if (!made) return;
    const real = effectSlots.real(), R = K(), calm = reducedMotion(), me = Game.player;
    for (const q of pulses) {   // a ring growing (or rising and narrowing, then closing to a point) and fading
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.m.visible = false; continue; }
      const t = q.close ? clamp01(q.age / q.close) : clamp01(q.age / q.life), ease = 1 - (1 - t) ** 2, p = q.b ? at(q.b) : q;
      let r = q.r0 + (q.r1 - q.r0) * ease;
      if (q.close && q.age > q.close) r *= 1 - clamp01((q.age - q.close) / (q.life - q.close));
      q.m.position.set(p.x, p.y + 0.05 + (q.y1 - q.y0) * ease, p.z); q.m.scale.setScalar(Math.max(0.01, r));
      q.m.material.opacity = q.close ? 1 : 1 - clamp01((t - 0.5) / 0.5);
    }
    for (const q of heals) {   // the strokes sweep up inside the rising ring
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > R.mendTime + 0.3 || !q.b) { q.age = Infinity; q.strokes.forEach(hide); continue; }
      const p = at(q.b), t = clamp01(q.age / R.mendTime), fade = clamp01((q.age - R.mendTime) / 0.3);
      for (let i = 0; i < q.strokes.length; i++) {
        const s = q.strokes[i], a = i * 2.1 + q.age * 2, r = R.mend * 0.32;
        s.position.set(p.x + Math.cos(a) * r, p.y + R.mendRise * t * 0.35, p.z + Math.sin(a) * r);
        s.scale.set(0.12, Math.max(0.05, R.mendRise * 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.1))), 1); s.material.opacity = 1 - fade;
      }
    }
    for (const q of shells) {   // the shell on the body (its bones copied each frame), a ring at the feet, a line up it
      if (q.age === Infinity) continue;
      q.age += real;
      const b = q.b, src = b && b.rig, end = q.life;
      if (!src || q.age > end + 0.3 || (b.perk && b.perk.stance <= 0 && q.age < end && q.age > 0.2)) {   // run out, or ended early
        if (src && q.age <= end + 0.3) throwFlakes(at(b).x, at(b).y + 0.9, at(b).z, 6, SHELLS, BREAK);
        q.age = Infinity; q.rig.root.visible = false; q.ring.visible = false; continue;
      }
      const A = src.skeleton && src.skeleton.bones, B = q.rig.skeleton && q.rig.skeleton.bones;
      if (!A || !B || A.length !== B.length || !src.root.visible) { q.rig.root.visible = false; q.ring.visible = false; continue; }
      q.rig.root.position.copy(src.root.position); q.rig.root.quaternion.copy(src.root.quaternion); q.rig.root.scale.copy(src.root.scale);
      for (let i = 0; i < A.length; i++) { B[i].position.copy(A[i].position); B[i].quaternion.copy(A[i].quaternion); B[i].scale.copy(A[i].scale); }
      const snap = clamp01(q.age / 0.1), out = q.age > end ? 1 - clamp01((q.age - end) / 0.3) : 1;
      q.mat.opacity = 0.95 * snap * out; q.rig.root.visible = true;
      const p = src.root.position; q.ring.position.set(p.x, p.y + 0.04, p.z); q.ring.scale.setScalar(1.3); q.ring.material.opacity = 0.9 * out; q.ring.visible = true;
      if ((q.line -= real) <= 0 && q.age < end) { q.line = 0.8; throwFlakes(p.x, p.y + 0.1, p.z, 3, WHITES, LINE); }
    }
    for (const q of roots) {   // grown round the feet; cracking out anew a metre on; veins pulse at a blow and wane at the end
      if (q.age === Infinity) continue;
      q.age += real;
      const b = q.b;
      if (!b || q.age > q.life + 0.3) { q.age = Infinity; q.m.visible = false; continue; }
      const p = at(b);
      if (Math.hypot(p.x - q.x, p.z - q.z) > 1 && q.age < q.life) { q.x = p.x; q.z = p.z; q.grown = 0.3; q.m.rotation.y = rnd() * 6.3; throwFlakes(p.x, p.y + 0.05, p.z, 3, STONES, CHIPS); }
      q.grown = Math.min(1, q.grown + real / (q.age < 0.3 ? 0.3 : 0.2));
      const out = q.age > q.life ? 1 - clamp01((q.age - q.life) / 0.3) : 1, wane = clamp01((q.age - (q.life - 0.6)) / 0.6);
      q.pulse = Math.max(0, q.pulse - real * 4);
      const k = 1 - wane * 0.5 + q.pulse * 0.6;
      q.m.material.color.setRGB(Math.min(1.6, k), Math.min(1.6, k), Math.min(1.6, k + q.pulse * 0.3));
      q.m.position.set(q.x, p.y + 0.03, q.z); q.m.scale.setScalar(Math.max(0.01, R.roots * (1 - (1 - q.grown) ** 2) * out)); q.m.material.opacity = out;
    }
    for (const q of flames) {   // over the head: ignites, sways, throws sparks; flares at a killing blow held; gutters; out
      if (q.age === Infinity) continue;
      q.age += real;
      const b = q.b;
      if (!b || q.age > q.life + 0.3) { if (b) throwFlakes(at(b).x, at(b).y + 2, at(b).z, 4, STONES, SMOKE); q.age = Infinity; q.s.visible = false; continue; }
      const p = at(b), ign = 1 - (1 - clamp01(q.age / 0.25)) ** 2, gut = 1 - 0.55 * clamp01((q.age - (q.life - 0.6)) / 0.6);
      const out = q.age > q.life ? 1 - clamp01((q.age - q.life) / 0.3) : 1;
      let h = R.flame * ign * gut;
      if (q.flare >= 0) { const t = q.age - q.flare; h = Math.max(h, t < 0.1 ? R.flame + (R.flare - R.flame) * t / 0.1 : R.flame + (R.flare - R.flame) * (1 - clamp01((t - 0.1) / 0.5))); }
      const sway = calm ? 0 : Math.sin(q.age * 5) * 0.05;
      q.s.position.set(p.x, p.y + 1.85, p.z); q.s.scale.set(h * 0.5, h, 1); q.s.material.rotation = sway; q.s.material.opacity = out;
      const w = gut < 1 ? 0.7 + 0.3 * gut : 1; q.s.material.color.setRGB(w, w, 1);
      if ((q.spark -= real) <= 0 && q.age < q.life) { q.spark = 0.25; throwFlakes(p.x, p.y + 1.85 + h * 0.9, p.z, 1, SHELLS, RISE); }
    }
    for (const q of swirls) {   // the petals in a column round the body; reforming at the end, a few settling
      if (q.age === Infinity) continue;
      q.age += real;
      const b = q.b, end = q.end >= 0 ? q.end : q.life;
      if (!b || q.age > end + 0.15) {
        if (b) { const p = at(b); throwFlakes(p.x, p.y + 0.2, p.z, 8, PETALS_C, SETTLE); }
        q.age = Infinity; q.petals.forEach(f => hide(f.s)); continue;
      }
      const p = at(b), brk = clamp01(q.age / 0.08), pull = 1 - clamp01((q.age - end) / 0.15), speed = calm ? 2 : 4;
      for (const f of q.petals) {
        if (!f.s.visible) continue;
        const a = f.a + q.age * speed * (0.8 + f.r), r = f.r * (0.35 + 0.65 * brk) * pull;
        f.s.position.set(p.x + Math.cos(a) * r, p.y + f.h * (0.4 + 0.6 * pull), p.z + Math.sin(a) * r);
        f.s.material.rotation += f.spin * real; f.s.scale.setScalar(0.13 * (0.6 + 0.4 * Math.abs(Math.sin(q.age * 6 + f.a))));
      }
    }
    for (const q of mails) {   // the plates fly in and lock, glow, throw embers; dim and flicker in the last second; fall
      if (q.age === Infinity) continue;
      q.age += real;
      const b = q.b;
      const spent = b && b.perk && q.age > 0.3 && b.perk.mail <= 0 && q.age < q.life;   // ended early (a new run, a death)
      if (!b || q.age > q.life + 0.3 || spent) { q.age = Infinity; q.plates.forEach(hide); continue; }
      const p = at(b), yaw = b.rig.root.rotation.y, cs = Math.cos(yaw), sn = Math.sin(yaw);
      const lock = 1 - (1 - clamp01(q.age / 0.25)) ** 3, fall = q.age > q.life ? clamp01((q.age - q.life) / 0.3) : 0;
      const dim = q.age > q.life - 1 ? 0.55 + 0.45 * Math.abs(Math.cos((q.age - q.life + 1) * Math.PI)) : 1;
      for (let L = 0; L < 2; L++) for (let i = 0; i < SLOTS.length; i++) {
        const s = q.plates[L * SLOTS.length + i]; if (!s.visible) continue;
        const [, ox, oy, oz] = SLOTS[i], push = (1 + L * 0.35) * (1 + (1 - lock) * 3), lx = ox * push, lz = oz * push + (L ? 0.04 : 0);
        s.position.set(p.x + lx * cs + lz * sn, p.y + oy - fall * 0.8, p.z - lx * sn + lz * cs);
        s.scale.set(R.plate * (1 + L * 0.3), R.plate * 0.75 * (1 + L * 0.3), 1); s.material.opacity = (1 - fall) * dim;
        s.material.color.setRGB(dim, dim, 1);
      }
      if ((q.ember -= real) <= 0 && q.age < q.life) { q.ember = 0.125; throwFlakes(p.x, p.y + 1.2, p.z, 1, SHELLS, EMBER); }
    }
    for (const q of pools) {   // spreads, rings cross it, droplets round a body healing; ebbs; dries to its middle
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life + 0.4) { q.age = Infinity; q.m.visible = false; q.q = null; continue; }
      const spread = 1 - (1 - clamp01(q.age / 0.35)) ** 2, dry = q.age > q.life ? 1 - clamp01((q.age - q.life) / 0.4) : 1;
      const ebb = 1 - 0.45 * clamp01((q.age - (q.life - 0.8)) / 0.8);
      q.m.scale.setScalar(Math.max(0.01, q.size * spread * dry)); q.m.material.opacity = ebb;
      if ((q.ring -= real) <= 0 && q.age < q.life - 0.4) { q.ring = 0.8; pulse(q.x, q.y + 0.01, q.z, 0.2, q.size * 0.9, calm ? 3.2 : 1.6); }
      if (me && q.age < q.life && (q.drop -= real) <= 0 && Math.hypot(me.x - q.x, me.z - q.z) <= q.size / 2 && me.hp < me.hpCap() && me.alive()) {
        q.drop = 0.5; const p = at(me); throwFlakes(p.x, p.y + 0.05, p.z, 1, WHITES, DROPS);
      }
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
    for (const q of pulses) { q.age = Infinity; q.b = null; hide(q.m); }
    for (const q of heals) { q.age = Infinity; q.b = null; q.strokes.forEach(hide); }
    for (const q of shells) { q.age = Infinity; q.b = null; q.rig.root.visible = false; hide(q.ring); }
    for (const q of roots) { q.age = Infinity; q.b = null; hide(q.m); }
    for (const q of flames) { q.age = Infinity; q.b = null; hide(q.s); }
    for (const q of swirls) { q.age = Infinity; q.b = null; q.petals.forEach(f => hide(f.s)); }
    for (const q of mails) { q.age = Infinity; q.b = null; q.plates.forEach(hide); }
    for (const q of pools) { q.age = Infinity; q.q = null; hide(q.m); }
    for (const q of [...stars, ...flakes]) { q.age = Infinity; hide(q.s); }
  }
  const PERKS = new Set(['press/heal', 'press/stance', 'stance/deflect', 'press/root', 'root/bite', 'press/undying', 'press/vanish', 'vanish/end',
    'press/armour', 'armour/crack', 'armour/broken', 'press/pool']);
  const on = list => list.filter(q => q.age !== Infinity).length;
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.clear.push(clear);
      events.on('abilityPerk', d => { if (PERKS.has(d.perk)) perk(d); });
    },
    clear,
    // tests: what shows now
    get state() {
      if (!made) return {};
      return { pulses: on(pulses), strokes: heals.reduce((n, q) => n + q.strokes.filter(s => s.visible).length, 0),
        shell: shells.filter(q => q.rig.root.visible).length, stars: on(stars), roots: roots.filter(q => q.m.visible).length,
        flame: flames.filter(q => q.s.visible).length, flare: flames.filter(q => q.age !== Infinity && q.flare >= 0).length,
        petals: swirls.reduce((n, q) => n + q.petals.filter(f => f.s.visible).length, 0),
        plates: mails.reduce((n, q) => n + q.plates.filter(s => s.visible).length, 0), pools: pools.filter(q => q.m.visible).length, flakes: on(flakes) };
    },
  };
})();
