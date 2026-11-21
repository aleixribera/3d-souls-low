'use strict';
// ============================================================================
// The beast summons, drawn: the Grave Hound (pass 61) and the Cinder Fox (pass 141). Drawing only: the summons themselves
// (where they run, their bites and slashes, the boss they draw) are the engine's (js/abilities.js); this listens to their
// `abilityPower` events, the server's for everyone online.
// ============================================================================
// Each is its own Blender model (tools/blender/hound.py, js/baked/hound.js; tools/blender/cinder_fox.py,
// js/baked/cinder-fox.js): one rigid piece per joint, hung here on pivots (BEAST_JOINTS, each script's JOINT) and moved
// by hand: a gallop while it runs, a prowl while it waits, a lunge with its jaws snapping on each bite (the fox's a passing
// slash), its head thrown back in a howl (the fox's a yip) when it draws the boss's eye.
// Cel-shaded (pass 141, design/abilities/STYLE.md): black ink in two flat bands under a hard blue rim, its bright slot
// (the hound's bone, the fox's flame) blue at its edges and white-hot inside, an ink outline round every piece. It climbs
// out of a pool of ink at its holder's feet and burns away from the head down. The hound's bites stamp a crescent of
// tooth marks; the fox lays a ring of flame tongues on the floor as it laps the boss and its slashes leave three claw
// lines. It runs by the engine's rule (summonStep, its own clock `age` turning the fox round the boss) where it is drawn,
// and each strike's event pulls it to the engine's place. Four of each in the pool (one a player), made at attach and
// warmed like the rest; nothing allocated per frame. Tuning: VIS.abilityFx.<kind>.
// The joints (absolute rest places, game axes, nose +z) and each one's parent: the same numbers as the Blender scripts.
const BEAST_JOINTS = {
  hound: {
    body: [[0, 0.74, 0], null], neck: [[0, 0.9, 0.4], 'body'], head: [[0, 1.08, 0.66], 'neck'], jaw: [[0, 1.03, 0.74], 'head'],
    tail: [[0, 0.86, -0.6], 'body'],
    fLu: [[0.15, 0.84, 0.3], 'body'], fLl: [[0.15, 0.48, 0.27], 'fLu'], fRu: [[-0.15, 0.84, 0.3], 'body'], fRl: [[-0.15, 0.48, 0.27], 'fRu'],
    hLu: [[0.15, 0.8, -0.48], 'body'], hLl: [[0.16, 0.27, -0.6], 'hLu'], hRu: [[-0.15, 0.8, -0.48], 'body'], hRl: [[-0.16, 0.27, -0.6], 'hRu'],
  },
  fox: {
    body: [[0, 0.42, 0], null], neck: [[0, 0.5, 0.2], 'body'], head: [[0, 0.6, 0.33], 'neck'], jaw: [[0, 0.565, 0.38], 'head'],
    tail: [[0, 0.47, -0.26], 'body'], tail2: [[0, 0.43, -0.52], 'tail'], tail3: [[0, 0.42, -0.78], 'tail2'],
    fLu: [[0.07, 0.46, 0.16], 'body'], fLl: [[0.07, 0.26, 0.15], 'fLu'], fRu: [[-0.07, 0.46, 0.16], 'body'], fRl: [[-0.07, 0.26, 0.15], 'fRu'],
    hLu: [[0.075, 0.45, -0.2], 'body'], hLl: [[0.08, 0.17, -0.28], 'hLu'], hRu: [[-0.075, 0.45, -0.2], 'body'], hRl: [[-0.08, 0.17, -0.28], 'hRu'],
  },
};
const BEAST_PREFIX = { hound: 'hound:', fox: 'fox:' };
const BEAST_EYES = { hound: [[0.055, 1.13, 0.8], [-0.055, 1.13, 0.8]], fox: [[0.032, 0.62, 0.38], [-0.032, 0.62, 0.38]] };
// Each leg's place in the gallop (a fraction of a stride) and whether it is a hind leg.
const BEAST_LEGS = [['fL', 0, false], ['fR', 0.12, false], ['hL', 0.55, true], ['hR', 0.67, true]];
const summonBeasts = (() => {
  const KINDS = Object.keys(BEAST_JOINTS), beasts = [];
  const vertex = `
    varying vec3 vN; varying vec3 vV; varying vec3 vW; varying float vY;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0), mv = viewMatrix * world;
      vN = normalize(normalMatrix * normal); vW = normalize(mat3(modelMatrix) * normal); vV = -mv.xyz; vY = world.y;
      gl_Position = projectionMatrix * mv;
    }`;
  // Flat cel bands: ink in shade, a lighter ink in the light, a hard rim of blue; the bright slot white inside a blue edge.
  // The part past the cut (above it, uFrom 1) isn't there, and a hard white seam runs along the cut.
  const fragment = `
    uniform vec3 uInk; uniform vec3 uLit; uniform vec3 uColor; uniform vec3 uCore; uniform float uCut; uniform float uFrom;
    uniform float uTime; uniform float uBoost; uniform float uBright; uniform float uFlicker;
    varying vec3 vN; varying vec3 vV; varying vec3 vW; varying float vY;
    void main() {
      float edge = (vY - uCut) * uFrom;
      if (edge > 0.0) discard;
      float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
      float flick = uFlicker * sin(uTime * 11.0 + vY * 13.0) * sin(uTime * 6.1 - vY * 5.3);
      vec3 c;
      if (uBright > 0.5) c = mix(uCore, uColor, step(0.5 + flick, rim)) * uBoost;
      else {
        c = mix(uInk, uLit, step(0.3, dot(normalize(vW), vec3(0.35, 0.85, 0.4))));
        c = mix(c, uColor * uBoost, step(0.62 - flick * 0.5, rim));
      }
      gl_FragColor = vec4(mix(c, uCore, step(-0.04, edge)), 1.0);
    }`;
  // The ink outline: each piece again, pushed out along its normals and drawn from behind.
  const outlineVertex = `
    uniform float uWidth; varying float vY;
    void main() {
      vec4 world = modelMatrix * vec4(position + normal * uWidth, 1.0); vY = world.y;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`;
  const outlineFragment = `
    uniform vec3 uInk; uniform float uCut; uniform float uFrom; varying float vY;
    void main() { if ((vY - uCut) * uFrom > 0.0) discard; gl_FragColor = vec4(uInk, 1.0); }`;
  function material(F, shared, bright) {
    return new THREE.ShaderMaterial({ uniforms: { ...shared, uBright: { value: bright ? 1 : 0 } }, vertexShader: vertex, fragmentShader: fragment });
  }
  const geos = {};   // kind -> [part, slot, geometry] (shared by the pool)
  function parts(kind) {
    if (!geos[kind]) {
      geos[kind] = [];
      const pre = BEAST_PREFIX[kind];
      for (const name of Object.keys(BAKED)) {
        if (!name.startsWith(pre)) continue;
        const [part, slot] = name.slice(pre.length).split('__');
        geos[kind].push([part, slot.split('.')[0], bakedGeometry(name)]);
      }
    }
    return geos[kind];
  }
  const EYE = new THREE.SphereGeometry(0.026, 10, 6);
  function make(kind) {
    const F = VIS.abilityFx[kind], J = BEAST_JOINTS[kind];
    const shared = { uInk: { value: new THREE.Color(F.ink) }, uLit: { value: new THREE.Color(F.lit) }, uColor: { value: new THREE.Color(F.color) },
      uCore: { value: new THREE.Color(F.core) }, uCut: { value: 0 }, uFrom: { value: 1 }, uTime: { value: 0 }, uBoost: { value: 1 }, uFlicker: { value: F.flicker } };
    const dark = material(F, shared, false), bright = material(F, shared, true);
    const outline = new THREE.ShaderMaterial({ uniforms: { uInk: shared.uInk, uCut: shared.uCut, uFrom: shared.uFrom, uWidth: { value: F.outline } },
      vertexShader: outlineVertex, fragmentShader: outlineFragment, side: THREE.BackSide });
    const eyes = new THREE.MeshBasicMaterial({ color: F.eye, toneMapped: false });
    const root = new THREE.Group(), pivots = {};
    for (const [name, [at, parent]] of Object.entries(J)) {
      const g = new THREE.Group(), from = parent ? J[parent][0] : [0, 0, 0];
      g.position.set(at[0] - from[0], at[1] - from[1], at[2] - from[2]);
      pivots[name] = g;
    }
    for (const [name, [, parent]] of Object.entries(J)) (parent ? pivots[parent] : root).add(pivots[name]);
    for (const [part, slot, geo] of parts(kind)) {
      const at = J[part][0];
      for (const m of [new THREE.Mesh(geo, slot === F.bright ? bright : dark), new THREE.Mesh(geo, outline)]) {
        m.position.set(-at[0], -at[1], -at[2]); m.castShadow = m.receiveShadow = false;
        pivots[part].add(m);
      }
    }
    const head = J.head[0];
    for (const e of BEAST_EYES[kind]) { const m = new THREE.Mesh(EYE, eyes); m.scale.setScalar(F.size); m.position.set(e[0] - head[0], e[1] - head[1], e[2] - head[2]); pivots.head.add(m); }
    // The ink pool it climbs out of: flat on the floor, under it at the call.
    const pool = new THREE.Mesh(FLOOR, new THREE.MeshBasicMaterial({ map: tex().pool, transparent: true, depthWrite: false, opacity: 0 }));
    pool.rotation.x = -Math.PI / 2; pool.renderOrder = 1; pool.visible = false; scene.add(pool); pooledFx.push(pool);
    root.traverse(o => { o.userData.warmUp = true; });
    root.visible = false; scene.add(root);
    return { kind, F, J, root, pivots, shared, eyes, pool, poolAge: Infinity, body: null, enemy: null, x: 0, y: 0, z: 0, yaw: 0, age: 0, shown: 0, left: 0, time: 1,
      speed: 0, stride: 0, lunge: Infinity, howl: Infinity, mote: 0, trail: 0, gone: false, enemies: null };
  }
  // ---- Cel marks on the floor and on the boss (pooled, shared by every beast) -------------------------------------------
  const FLOOR = new THREE.PlaneGeometry(1, 1);
  let TEX = null;
  function tex() {
    if (TEX) return TEX;
    const canvas = (w, h, draw) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    const INK = '#0b0d12', BLUE = '#8fb8dc', CORE = '#f2f6fa';
    const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    TEX = {
      pool: canvas(128, 128, (g, w) => {   // a pool of ink, its edge ragged, a thin blue rim
        const m = w / 2, pts = [];
        for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, r = m * (0.78 + 0.12 * Math.sin(i * 2.3) + 0.06 * Math.sin(i * 7.1)); pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); }
        poly(g, pts); g.lineWidth = 4; g.strokeStyle = BLUE; g.stroke(); g.fillStyle = INK; g.fill();
      }),
      tongue: canvas(64, 128, (g, w, h) => {   // a flat flame tongue, its root at the bottom: ink edge, blue, a white tip
        const shape = k => poly(g, [[w * (0.5 - 0.4 * k), h - 2], [w * (0.5 - 0.3 * k), h * 0.55], [w * 0.5, h * (0.06 + 0.3 * (1 - k))], [w * (0.5 + 0.3 * k), h * 0.5], [w * (0.5 + 0.4 * k), h - 2]]);
        shape(1); g.fillStyle = INK; g.fill(); shape(0.8); g.fillStyle = BLUE; g.fill(); shape(0.4); g.fillStyle = CORE; g.fill();
      }),
      teeth: canvas(128, 64, (g, w, h) => {   // a crescent of tooth marks: white wedges, ink edges
        g.lineJoin = 'round';
        for (let i = 0; i < 7; i++) {
          const a = Math.PI * (0.15 + 0.7 * i / 6), cx = w / 2 - Math.cos(a) * w * 0.4, cy = h * 0.1 + Math.sin(a) * h * 0.7, s = i % 3 === 0 ? 11 : 7;
          poly(g, [[cx - s * 0.6, cy - s], [cx + s * 0.6, cy - s], [cx, cy + s]]); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); g.fillStyle = CORE; g.fill();
        }
      }),
      claws: canvas(128, 128, (g, w, h) => {   // three claw lines raked across: ink, blue, a white core
        for (const [lw, c] of [[11, INK], [6, BLUE], [2.5, CORE]]) {
          g.lineWidth = lw; g.strokeStyle = c; g.lineCap = 'round';
          for (let i = 0; i < 3; i++) { const o = (i - 1) * w * 0.2; g.beginPath(); g.moveTo(w * 0.2 + o, h * 0.15); g.quadraticCurveTo(w * 0.5 + o, h * 0.45, w * 0.75 + o, h * 0.88); g.stroke(); }
        }
      }),
    };
    return TEX;
  }
  // Flame tongues laid flat on the floor by the fox's paws, each a quad turned along its run.
  const TONGUES = 48, tongues = [], MARKS = 8, marks = [];
  let tongueAt = 0, markAt = 0;
  function makeMarks() {
    for (let i = 0; i < TONGUES; i++) {
      const m = new THREE.Mesh(FLOOR, new THREE.MeshBasicMaterial({ map: tex().tongue, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      m.rotation.order = 'YXZ'; m.renderOrder = 2; m.visible = false; scene.add(m); pooledFx.push(m);
      tongues.push({ m, age: Infinity, life: 1, size: 1 });
    }
    for (let i = 0; i < MARKS; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex().teeth, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
      s.renderOrder = 14; s.visible = false; scene.add(s); pooledFx.push(s);
      marks.push({ s, age: Infinity, life: 0.6, size: 1 });
    }
  }
  function layTongue(h) {
    const R = h.F.ring, q = tongues[tongueAt++ % TONGUES];
    q.age = 0; q.life = R.life; q.size = R.width * (0.8 + Math.random() * 0.5);
    q.m.position.set(h.x + (Math.random() - 0.5) * 0.15, h.y + 0.03, h.z + (Math.random() - 0.5) * 0.15);
    q.m.rotation.set(-Math.PI / 2, h.yaw + Math.PI / 2 + (Math.random() - 0.5) * 0.6, 0);   // lying flat, pointing back along the run
    q.m.visible = true;
  }
  function stamp(at, map, size, life) {
    const q = marks[markAt++ % MARKS];
    q.age = 0; q.life = life; q.size = size; q.s.material.map = map; q.s.position.set(at.x, at.y, at.z);
    q.s.material.rotation = (Math.random() - 0.5) * 0.8; q.s.visible = true;
  }
  function ageMarks(dt) {
    const still = reducedMotion();
    for (const q of tongues) {
      if (q.age === Infinity) continue;
      q.age += dt; const p = q.age / q.life;
      if (p >= 1) { q.age = Infinity; q.m.visible = false; continue; }
      // Hard flames: up at once, a flicker of height (held still in reduced motion), shrinking into the floor at the end.
      const k = (p < 0.08 ? p / 0.08 : 1) * (p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1), f = still ? 1 : 1 + 0.18 * Math.sin(q.age * 31 + q.size * 50);
      q.m.scale.set(q.size, q.size * 2 * k * f, 1);
    }
    for (const q of marks) {
      if (q.age === Infinity) continue;
      q.age += dt; const p = q.age / q.life;
      if (p >= 1) { q.age = Infinity; q.s.visible = false; continue; }
      q.s.scale.setScalar(q.size * (p < 0.1 ? 0.6 + 4 * p : 1)); q.s.material.opacity = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
    }
  }
  const at = { x: 0, y: 0, z: 0 }, MOTES = { r: 0.25, speed: 0.3, lift: 0.9, life: [0.35, 0.8], up: 1, size: 0.7 };
  const near = (x, z) => Game.player && Math.hypot(Game.player.x - x, Game.player.z - z) < VIS.abilityFx.near;
  const light = (p, color, k, range) => effectLighting.flash(p, color, k * (reducedMotion() ? 0.5 : 1), range);
  const mine = d => beasts.find(q => q.kind === d.then && q.body && q.body === d.body);
  function call(d) {
    let h = mine(d);
    const F = VIS.abilityFx[d.then], body = d.body;
    const renew = !!h && h.left > F.fade;   // one fading away comes again fresh, as the engine's does
    h = h || beasts.find(q => q.kind === d.then && !q.body) || beasts.filter(q => q.kind === d.then).reduce((a, b) => (a.left < b.left ? a : b));
    h.body = body; h.enemy = d.enemy; h.left = d.v.time; h.enemies = Game.enemies;
    if (renew) { h.time = d.v.time + F.rise; h.gone = false; return; }   // risen already: it stays up
    h.time = d.v.time; h.gone = false; h.lunge = h.howl = Infinity; h.speed = 0; h.age = 0; h.trail = 0;
    const from = body || d;
    h.x = from.x; h.z = from.z; h.y = ground(h.x, h.z, from.y); h.yaw = body ? body.yaw || 0 : 0;
    // A pool of ink spreads at its holder's feet and it climbs out of it.
    h.poolAge = 0; h.pool.position.set(h.x, h.y + 0.025, h.z); h.pool.visible = true;
    at.x = h.x; at.y = h.y + 0.4 * F.size; at.z = h.z;
    spawnBurst(at, F.burst); ultraFx.sparkBurst(at, 12, 'lunar', [0, 1, 0], 0.6, 0.7);
    ultraFx.moteBurst(at, 20, F.color, { r: 0.5 * F.size, speed: 0.9, lift: 1.6, life: [0.5, 1.1], up: 1 }); light(at, F.color, 6, 8);
    if (near(h.x, h.z)) Game.addShake(F.shake[0], F.shake[1]);
  }
  function ground(x, z, y) { const g = world.groundAt(x, z, y + 0.5); return Number.isFinite(g) ? g : y; }
  function bite(d) {
    const h = mine(d);
    if (!h) return;
    // The engine's place, where the blow was: pulled toward it, at once if it is far off.
    const off = Math.hypot(d.x - h.x, d.z - h.z), k = off > h.F.snap ? 1 : 0.5;
    h.x += (d.x - h.x) * k; h.z += (d.z - h.z) * k; if (d.enemy) h.enemy = d.enemy;
    h.lunge = 0;
  }
  function howl(d) {
    const h = mine(d);
    if (!h) return;
    h.howl = 0;
    const F = h.F;
    at.x = h.x; at.y = h.y + 1.2 * F.size; at.z = h.z;
    groundFx.ring(h.x, h.z, 2.6 * F.size + 0.6, F.color, 0.7, h.y);
    ultraFx.moteBurst(at, 16, F.color, { r: 0.3, speed: 1.6, lift: 2.2, life: [0.5, 1.1], up: 1 }); light(at, F.color, 5, 8);
  }
  // The blow lands, as the jaws close (or the claws pass): blue sparks and a mark on the enemy's side facing the beast.
  function snapAt(h) {
    const e = h.enemy;
    if (!e || !e.alive()) return;
    const F = h.F, dx = h.x - e.x, dz = h.z - e.z, l = Math.hypot(dx, dz) || 1, r = (e.radius || 1) * 0.9;
    at.x = e.x + dx / l * r; at.y = e.y + Math.min(1.1, (e.height || 1.8) * 0.4) * (F.size < 1 ? 0.5 : 1); at.z = e.z + dz / l * r;
    ultraFx.sparkBurst(at, 8, 'lunar', [dx / l, 0.3, dz / l], 0.5, 0.7);
    stamp(at, h.F.ring ? tex().claws : tex().teeth, h.F.ring ? 0.9 : 0.7, 0.6);
    spawnBurst(at, F.hitBurst); light(at, F.color, 3, 5);
  }
  const ease = t => t * t * (3 - 2 * t);
  // One beast's pose this frame: where it is, its stride, and the lunge or howl on top. `size` scales the hound's lifts.
  function pose(h, dt, now) {
    const F = h.F, P = h.pivots, z = F.size, run = clamp01(h.speed / F.gallopAt), prowl = 1 - run;
    h.stride = (h.stride + dt * (F.strideRate * run + F.prowlRate * prowl)) % 1;
    const tau = Math.PI * 2, s = h.stride * tau;
    // Lunge: 0..`lunge` s; the jaws snap at `snapAt` of it.
    const L = h.lunge < F.lunge ? h.lunge / F.lunge : 1, reach = L < 1 ? Math.sin(Math.PI * Math.min(1, L * 1.4)) : 0;
    const open = L < 1 ? (L < F.snapAt ? ease(L / F.snapAt) : 1 - ease(clamp01((L - F.snapAt) / 0.2))) : 0;
    // Howl: head thrown back and held, jaws open, `howlTime` s.
    const W = h.howl < F.howlTime ? h.howl / F.howlTime : 1, up = W < 1 ? Math.sin(Math.PI * Math.min(1, W * 1.2)) : 0;
    // The body: a gallop's rise and pitch, a prowl's low crouch, the lunge's dive.
    P.body.position.y = h.J.body[0][1] + z * (run * Math.abs(Math.sin(s)) * 0.07 - prowl * 0.08 - reach * 0.06 + up * 0.04);
    P.body.position.z = reach * 0.45 * z;
    P.body.rotation.x = run * Math.sin(s) * 0.12 + reach * 0.22 - up * 0.3;
    P.body.rotation.z = prowl * Math.sin(s) * 0.04;
    P.neck.rotation.x = 0.15 * prowl + run * Math.sin(s + 1) * 0.1 + reach * 0.35 - up * 0.95;
    P.head.rotation.x = -0.1 * prowl + reach * 0.15 - up * 0.45 + Math.sin(now * 2.3) * 0.03;
    P.head.rotation.y = prowl * Math.sin(now * 0.9) * 0.15;
    P.jaw.rotation.x = Math.max(open * 0.75, up * 0.6, 0.06 + prowl * 0.06 * (0.5 + 0.5 * Math.sin(now * 3)));
    P.tail.rotation.x = -0.25 + run * Math.sin(s * 2) * 0.25 + up * 0.4;
    P.tail.rotation.y = Math.sin(now * 2.1 + s) * (0.3 * prowl + 0.15);
    // A long tail (the fox's) streams flat behind a run, each segment trailing the last.
    if (P.tail2) { P.tail.rotation.x = -0.05 - run * 0.1 + Math.sin(s * 2) * 0.08 + up * 0.3;
      P.tail2.rotation.x = Math.sin(s * 2 - 0.8) * 0.1 * (0.4 + run); P.tail2.rotation.y = Math.sin(now * 3.1 + s - 0.6) * 0.2;
      P.tail3.rotation.x = Math.sin(s * 2 - 1.6) * 0.14 * (0.4 + run); P.tail3.rotation.y = Math.sin(now * 3.1 + s - 1.2) * 0.3; }
    for (const [leg, off, hind] of BEAST_LEGS) {
      const a = (h.stride + off) * tau, swing = Math.sin(a), lift = Math.max(0, Math.cos(a));
      const amp = run * (hind ? 0.75 : 0.85) + prowl * 0.22;
      const u = P[leg + 'u'], l = P[leg + 'l'];
      // Forward is a negative turn about x. A hind leg pushes back through the lunge; a fore leg reaches.
      u.rotation.x = -swing * amp + (hind ? reach * 0.5 : -reach * 0.6) + (hind ? up * 0.3 : -up * 0.2) - (hind ? 0 : P.body.rotation.x * 0.5);
      l.rotation.x = (hind ? -1 : 1) * lift * (run * 0.9 + prowl * 0.3) + (hind ? 0 : reach * 0.4);
    }
    h.root.position.set(h.x, h.y, h.z); h.root.rotation.y = h.yaw;
  }
  function draw() {
    const dt = effectSlots.dt(), now = effectSlots.time();
    ageMarks(dt);
    for (const h of beasts) {
      if (h.poolAge !== Infinity) {   // the ink pool spreads in 0.25 s, lies under the climb, and drains by 1.2 s
        h.poolAge += dt; const p = h.poolAge, sz = h.F.pool * (p < 0.25 ? ease(p / 0.25) : 1);
        h.pool.scale.set(sz, sz, 1); h.pool.material.opacity = p < 0.8 ? 0.92 : Math.max(0, 0.92 * (1 - (p - 0.8) / 0.4));
        if (p > 1.2) { h.poolAge = Infinity; h.pool.visible = false; }
      }
      if (!h.body) continue;
      const F = h.F, b = h.body, alive = b.alive ? b.alive() : true;
      if (alive) h.left -= dt; else h.left = Math.min(h.left, F.fade);
      if (h.left <= 0 || h.enemies !== Game.enemies) { h.body = null; h.root.visible = false; continue; }   // a new fight ends it too
      // Runs by the engine's rule, round the enemy it hunts (else the nearest to its holder).
      let e = h.enemy && h.enemy.alive() && Game.enemies.includes(h.enemy) ? h.enemy : null;
      if (!e) { let best = CONFIG.abilities.summons.near; for (const o of Game.enemies) if (o.alive()) { const d = Math.hypot(o.x - b.x, o.z - b.z); if (d < best) { best = d; e = o; } } h.enemy = e; }
      const x0 = h.x, z0 = h.z, yaw0 = h.yaw;
      h.age += dt;
      if (h.age > F.climb) summonStep(h, e, alive ? b : null, dt);   // climbs out first
      const moved = Math.hypot(h.x - x0, h.z - z0) / Math.max(dt, 1e-4);
      h.speed += (moved - h.speed) * (1 - Math.exp(-8 * dt));
      h.yaw = yaw0 + angDiff(h.yaw, yaw0) * (1 - Math.exp(-F.turn * dt));
      h.y += (ground(h.x, h.z, e ? e.y : b.y) - h.y) * (1 - Math.exp(-12 * dt));
      // Lunge and howl clocks; the jaws close on the bite at `snapAt`.
      if (h.lunge !== Infinity) { const was = h.lunge; h.lunge += dt; if (was < F.lunge * F.snapAt && h.lunge >= F.lunge * F.snapAt) snapAt(h); if (h.lunge > F.lunge) h.lunge = Infinity; }
      if (h.howl !== Infinity) { h.howl += dt; if (h.howl > F.howlTime) h.howl = Infinity; }
      pose(h, dt, now);
      // Rising from the feet up out of its pool; burning away from the head down.
      const rising = clamp01((h.time - h.left) / F.rise), fading = clamp01(h.left / F.fade), tall = 1.5 * F.size, u = h.shared;
      u.uFrom.value = 1; u.uCut.value = h.y - 0.1 + tall * (fading < 1 ? fading : rising < 1 ? rising : 9);
      u.uTime.value = now;
      u.uBoost.value = 1 + (h.lunge !== Infinity ? F.biteBoost * (1 - h.lunge / F.lunge) : 0) + (h.howl !== Infinity ? F.biteBoost * 0.6 : 0);
      h.eyes.visible = rising > 0.6 && fading > 0.3;
      if (fading < 1 && !h.gone) { h.gone = true; at.x = h.x; at.y = h.y + 0.8 * F.size; at.z = h.z; ultraFx.moteBurst(at, 24, F.color, { r: 0.5 * F.size, speed: 0.9, lift: 2, life: [0.5, 1.1], up: 1 }); }
      if ((h.mote -= dt) <= 0) { h.mote = F.motes * (h.speed > 2 ? 0.5 : 1); at.x = h.x; at.y = h.y + (0.3 + Math.random() * 0.6) * F.size; at.z = h.z; ultraFx.moteBurst(at, 2, F.color, MOTES); }
      if (F.ring && rising >= 1 && fading >= 1 && h.speed > 1 && (h.trail -= dt) <= 0) { h.trail = F.ring.every; layTongue(h); }
      h.root.visible = true;
    }
  }
  events.on('abilityPower', d => {
    if (!BEAST_JOINTS[d.then]) return;
    if (d.draw) howl(d);
    else if (d.strike) bite(d);
    else call(d);
  });
  function clear() {
    for (const h of beasts) { h.body = null; h.root.visible = false; h.poolAge = Infinity; h.pool.visible = false; }
    for (const q of tongues) { q.age = Infinity; q.m.visible = false; }
    for (const q of marks) { q.age = Infinity; q.s.visible = false; }
  }
  return {
    attach() {
      if (!beasts.length) { makeMarks(); for (const k of KINDS) for (let i = 0; i < 4; i++) beasts.push(make(k)); }
      Game.renderHooks.push(draw); visuals.hooks.stage.push(clear);
    },
    clear, info: () => beasts.filter(h => h.body).map(h => ({ kind: h.kind, x: h.x, z: h.z, speed: h.speed, lunge: h.lunge !== Infinity, howl: h.howl !== Infinity,
      tongues: h.F.ring ? tongues.filter(q => q.age !== Infinity).length : 0 })),
  };
})();
