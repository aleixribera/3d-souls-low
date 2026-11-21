'use strict';
// ============================================================================
// The Lantern Spirit, drawn (pass 141): drawing only. The summon itself (where it floats, its shots, the heal) is the
// engine's (js/abilities.js); this listens to its `abilityPower` events, the server's for everyone online: the call, a
// shot (its `flight` s to the boss) and a shot landing (`heal`).
// ============================================================================
// Its model is its own Blender model (tools/blender/lantern_spirit.py, js/baked/lantern-spirit.js): rigid pieces hung on
// pivots here (LANTERN_JOINTS, the script's JOINT): the lantern, the almond flame inside it that turns to watch the boss,
// and three paper streamers that sway. Cel-shaded: ink ribs, cap and base under an ink outline, the paper lit from inside
// (a deep blue across its face, a hard bright band at its silhouette), the flame white. It floats at its holder's
// shoulder by the engine's rule (summonStep: a `perch` kind), `lift` m up, bobbing. It unfolds like a fan, the flame
// lighting last; each shot it puffs out and spits a hard little fireball that flies its `flight` s and bursts on the boss;
// a shot that heals runs a thin warm line from the lantern to its holder. Leaving, it folds flat and drifts down. Four in
// the pool (one a player), made at attach and warmed like the rest; nothing allocated per frame. Tuning:
// VIS.abilityFx.lantern.
const LANTERN_JOINTS = { body: [[0, 0, 0], null], flame: [[0, 0, 0], 'body'], s1: [[0.09, -0.25, 0.02], 'body'], s2: [[-0.09, -0.25, 0.02], 'body'], s3: [[0, -0.25, -0.09], 'body'] };
const summonLantern = (() => {
  const F = VIS.abilityFx.lantern, lanterns = [], STREAMERS = ['s1', 's2', 's3'];
  const vertex = `
    varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vW = normalize(mat3(modelMatrix) * normal); vV = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`;
  // uKind 0: ink (two flat bands); 1: paper lit from inside (deep across its face, a hard bright band at the silhouette);
  // 2: the flame (white, a blue edge).
  const fragment = `
    uniform vec3 uInk; uniform vec3 uDeep; uniform vec3 uColor; uniform vec3 uCore; uniform float uKind; uniform float uGlow;
    varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main() {
      float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
      vec3 c;
      if (uKind < 0.5) c = mix(uInk, uInk * 2.6, step(0.3, dot(normalize(vW), vec3(0.35, 0.85, 0.4))));
      else if (uKind < 1.5) c = mix(uDeep, uColor, step(0.45, rim)) * uGlow;
      else c = mix(uCore, uColor, step(0.7, rim));
      gl_FragColor = vec4(c, 1.0);
    }`;
  const outlineVertex = `
    uniform float uWidth;
    void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uWidth, 1.0); }`;
  const outlineFragment = `uniform vec3 uInk; void main() { gl_FragColor = vec4(uInk, 1.0); }`;
  const KIND = { frame: 0, paper: 1, flame: 2 };
  let geos = null;
  function make() {
    if (!geos) {
      geos = [];
      for (const name of Object.keys(BAKED)) {
        if (!name.startsWith('lantern:')) continue;
        const [part, slot] = name.slice(8).split('__');
        geos.push([part, slot.split('.')[0], bakedGeometry(name)]);
      }
    }
    const glow = { value: 1 }, ink = { value: new THREE.Color(F.ink) };
    const mats = {};
    for (const slot in KIND) mats[slot] = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, side: slot === 'paper' ? THREE.DoubleSide : THREE.FrontSide,
      uniforms: { uInk: ink, uDeep: { value: new THREE.Color(F.deep) }, uColor: { value: new THREE.Color(F.color) }, uCore: { value: new THREE.Color(F.core) },
        uKind: { value: KIND[slot] }, uGlow: glow } });
    const outline = new THREE.ShaderMaterial({ vertexShader: outlineVertex, fragmentShader: outlineFragment, side: THREE.BackSide,
      uniforms: { uInk: ink, uWidth: { value: F.outline } } });
    const root = new THREE.Group(), pivots = {};
    for (const [name, [at, parent]] of Object.entries(LANTERN_JOINTS)) {
      const g = new THREE.Group(), from = parent ? LANTERN_JOINTS[parent][0] : [0, 0, 0];
      g.position.set(at[0] - from[0], at[1] - from[1], at[2] - from[2]); pivots[name] = g;
    }
    for (const [name, [, parent]] of Object.entries(LANTERN_JOINTS)) (parent ? pivots[parent] : root).add(pivots[name]);
    for (const [part, slot, geo] of geos) {
      const at = LANTERN_JOINTS[part][0], list = [new THREE.Mesh(geo, mats[slot] || mats.frame)];
      if (slot !== 'flame') list.push(new THREE.Mesh(geo, outline));   // the flame burns inside the paper: no outline
      for (const m of list) { m.position.set(-at[0], -at[1], -at[2]); m.castShadow = m.receiveShadow = false; pivots[part].add(m); }
    }
    root.traverse(o => { o.userData.warmUp = true; });
    root.visible = false; scene.add(root);
    return { root, pivots, glow, body: null, enemy: null, enemies: null, kind: 'lantern', x: 0, y: 0, z: 0, yaw: 0, age: 0, left: 0, time: 1,
      puff: Infinity, mote: 0, gone: false, vx: 0, vz: 0, fallY: 0 };
  }
  // ---- Fireballs, bursts and the warm line (pooled, shared by every lantern) -----------------------------------------
  let TEX = null;
  function tex() {
    if (TEX) return TEX;
    const canvas = (w, h, draw) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    const INK = '#0b0d12', BLUE = '#8fb8dc', CORE = '#f2f6fa';
    const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    const star = (g, m, n, r0, r1, turn = 0) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = turn + i * Math.PI / n, r = i % 2 ? r0 : r1; pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); } poly(g, pts); };
    TEX = {
      ball: canvas(64, 64, (g, w) => {   // a hard fireball: ink-edged blue tongues round a white core
        const m = w / 2;
        star(g, m, 7, m * 0.5, m * 0.94); g.fillStyle = INK; g.fill();
        star(g, m, 7, m * 0.42, m * 0.8, 0.1); g.fillStyle = BLUE; g.fill();
        g.beginPath(); g.arc(m, m, m * 0.36, 0, Math.PI * 2); g.fillStyle = CORE; g.fill();
      }),
      burst: canvas(128, 128, (g, w) => {   // a flat flame burst: an ink star, blue inside, a white heart
        const m = w / 2;
        star(g, m, 8, m * 0.35, m * 0.95); g.fillStyle = INK; g.fill();
        star(g, m, 8, m * 0.28, m * 0.8, 0.05); g.fillStyle = BLUE; g.fill();
        star(g, m, 8, m * 0.15, m * 0.45, 0.2); g.fillStyle = CORE; g.fill();
      }),
    };
    return TEX;
  }
  const BALLS = 8, TRAIL = 3, balls = [], BURSTS = 6, bursts = [];
  let ballAt = 0, burstAt = 0, warm = null;
  const sprite = (map, order) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }));
    s.renderOrder = order; s.visible = false; scene.add(s); pooledFx.push(s); return s;
  };
  function makeFx() {
    for (let i = 0; i < BALLS; i++) balls.push({ s: sprite(tex().ball, 13), trail: Array.from({ length: TRAIL }, () => sprite(tex().ball, 12)), age: Infinity, t: 1,
      x0: 0, y0: 0, z0: 0, e: null, x: 0, y: 0, z: 0 });
    for (let i = 0; i < BURSTS; i++) bursts.push({ s: sprite(tex().burst, 14), age: Infinity });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    warm = { line: new THREE.Line(geo, new THREE.LineBasicMaterial({ color: F.color, transparent: true, depthWrite: false, toneMapped: false })), age: Infinity, l: null, b: null };
    warm.line.frustumCulled = false; warm.line.renderOrder = 13; warm.line.visible = false; scene.add(warm.line); pooledFx.push(warm.line);
  }
  const at = { x: 0, y: 0, z: 0 }, MOTES = { r: 0.15, speed: 0.2, lift: 0.6, life: [0.4, 0.9], up: 1, size: 0.6 };
  const light = (p, color, k, range) => effectLighting.flash(p, color, k * (reducedMotion() ? 0.5 : 1), range);
  const mine = d => lanterns.find(q => q.body && q.body === d.body);
  function ground(x, z, y) { const g = world.groundAt(x, z, y + 0.5); return Number.isFinite(g) ? g : y; }
  const aim = e => e.y + Math.min(1.4, (e.height || 1.8) * 0.55);
  function call(d) {
    if (!lanterns.length) return;
    let h = mine(d);
    const renew = !!h && h.left > F.fade;
    h = h || lanterns.find(q => !q.body) || lanterns.reduce((a, b) => (a.left < b.left ? a : b));
    h.body = d.body; h.enemy = d.enemy; h.left = d.v.time; h.enemies = Game.enemies;
    if (renew) { h.time = d.v.time + F.rise; h.gone = false; return; }   // up already: it stays
    h.time = d.v.time; h.gone = false; h.puff = Infinity; h.age = 0; h.vx = h.vz = 0;
    const from = d.body || d;
    h.x = from.x; h.z = from.z; h.yaw = d.body ? d.body.yaw || 0 : 0;
    summonStep(h, null, d.body, 60);   // straight to its shoulder
    h.y = (from.y || 0) + CONFIG.abilities.summons.lantern.lift;
    at.x = h.x; at.y = h.y; at.z = h.z;
    ultraFx.moteBurst(at, 14, F.color, { r: 0.25, speed: 0.6, lift: 0.8, life: [0.4, 0.9], up: 1 }); light(at, F.color, 4, 6);
  }
  // A shot: it puffs out and spits a fireball, which flies its `flight` s to the boss.
  function shot(d) {
    const h = mine(d), e = d.enemy;
    if (!h || !e) return;
    h.puff = 0;
    const b = balls[ballAt++ % BALLS];
    b.age = 0; b.t = Math.max(0.05, d.flight); b.e = e;
    const yaw = h.yaw;
    b.x0 = h.x + Math.sin(yaw) * 0.25; b.y0 = h.y; b.z0 = h.z + Math.cos(yaw) * 0.25;
    b.x = b.x0; b.y = b.y0; b.z = b.z0;
    at.x = b.x0; at.y = b.y0; at.z = b.z0; light(at, F.color, 2.5, 4);
  }
  // A shot landed and healed its holder: a thin warm line from the lantern down to them.
  function healed(d) {
    const h = mine(d);
    if (!h || !h.body) return;
    warm.age = 0; warm.l = h; warm.b = h.body; warm.line.visible = true;
  }
  function land(b) {
    at.x = b.x; at.y = b.y; at.z = b.z;
    const q = bursts[burstAt++ % BURSTS]; q.age = 0; q.s.position.set(b.x, b.y, b.z); q.s.material.rotation = Math.random() * Math.PI; q.s.visible = true;
    ultraFx.sparkBurst(at, 8, 'lunar', null, 0, 0.6); spawnBurst(at, F.hitBurst); light(at, F.color, 3, 5);
    b.e = null;
  }
  function fx(dt) {
    for (const b of balls) {
      if (b.age === Infinity) continue;
      b.age += dt; const p = Math.min(1, b.age / b.t), e = b.e;
      // Toward where the boss is now (it moves while the ball flies), a little arc over the top.
      const tx = e ? e.x : b.x, ty = e ? aim(e) : b.y, tz = e ? e.z : b.z;
      b.x = b.x0 + (tx - b.x0) * p; b.z = b.z0 + (tz - b.z0) * p; b.y = b.y0 + (ty - b.y0) * p + Math.sin(Math.PI * p) * 0.4;
      b.s.position.set(b.x, b.y, b.z); b.s.scale.setScalar(F.ball); b.s.visible = true;
      for (let i = 0; i < TRAIL; i++) {   // the trail: smaller balls a little behind on the same path
        const pp = Math.max(0, p - (i + 1) * 0.06), t = b.trail[i];
        t.position.set(b.x0 + (tx - b.x0) * pp, b.y0 + (ty - b.y0) * pp + Math.sin(Math.PI * pp) * 0.4, b.z0 + (tz - b.z0) * pp);
        t.scale.setScalar(F.ball * (0.7 - i * 0.18)); t.visible = p > 0.04 * (i + 1);
      }
      if (p >= 1) { land(b); b.age = Infinity; b.s.visible = false; for (const t of b.trail) t.visible = false; }
    }
    for (const q of bursts) {
      if (q.age === Infinity) continue;
      q.age += dt; const p = q.age / 0.3;
      if (p >= 1) { q.age = Infinity; q.s.visible = false; continue; }
      q.s.scale.setScalar(F.burstSize * (p < 0.25 ? 0.5 + 2 * p : 1)); q.s.material.opacity = p > 0.5 ? 1 - (p - 0.5) / 0.5 : 1;
    }
    if (warm.age !== Infinity) {
      warm.age += dt;
      const h = warm.l, b = warm.b, p = warm.age / F.warm;
      if (p >= 1 || !h.body) { warm.age = Infinity; warm.line.visible = false; }
      else {
        const pos = warm.line.geometry.attributes.position, k = Math.min(1, p * 2);   // it runs down to them, then fades
        pos.setXYZ(0, h.x, h.y - 0.25, h.z);
        pos.setXYZ(1, h.x + (b.x - h.x) * k, h.y - 0.25 + (b.y + 1.2 - h.y + 0.25) * k, h.z + (b.z - h.z) * k);
        pos.needsUpdate = true; warm.line.material.opacity = p > 0.5 ? 1 - (p - 0.5) / 0.5 : 1;
      }
    }
  }
  const ease = t => t * t * (3 - 2 * t);
  function draw() {
    const dt = effectSlots.dt(), now = effectSlots.time();
    fx(dt);
    for (const h of lanterns) {
      if (!h.body) continue;
      const b = h.body, alive = b.alive ? b.alive() : true;
      if (alive) h.left -= dt; else h.left = Math.min(h.left, F.fade);
      if (h.left <= 0 || h.enemies !== Game.enemies) { h.body = null; h.root.visible = false; continue; }
      let e = h.enemy && h.enemy.alive() && Game.enemies.includes(h.enemy) ? h.enemy : null;
      if (!e) { let best = CONFIG.abilities.summons.near; for (const o of Game.enemies) if (o.alive()) { const d = Math.hypot(o.x - b.x, o.z - b.z); if (d < best) { best = d; e = o; } } h.enemy = e; }
      const x0 = h.x, z0 = h.z, yaw0 = h.yaw;
      h.age += dt;
      const rising = clamp01((h.time - h.left) / F.rise), fading = clamp01(h.left / F.fade);
      if (fading >= 1) {
        summonStep(h, e, alive ? b : null, dt);
        h.yaw = yaw0 + angDiff(h.yaw, yaw0) * (1 - Math.exp(-F.turn * dt));
        const want = b.y + CONFIG.abilities.summons.lantern.lift + Math.sin(now * Math.PI * 2 / F.bobTime) * F.bob * 0.5;
        h.y += (want - h.y) * (1 - Math.exp(-6 * dt)); h.fallY = h.y;
      } else h.y = h.fallY - (h.fallY - ground(h.x, h.z, b.y) - 0.05) * ease(1 - fading);   // folding, it drifts down to the floor
      h.vx += ((h.x - x0) / Math.max(dt, 1e-4) - h.vx) * (1 - Math.exp(-6 * dt)); h.vz += ((h.z - z0) / Math.max(dt, 1e-4) - h.vz) * (1 - Math.exp(-6 * dt));
      // Unfolding like a fan (wide first, then tall), the flame lit last; folding flat on the way out; a puff each shot.
      const open = Math.min(ease(rising), fading < 1 ? 0.15 + 0.85 * fading : 1);
      const puff = h.puff < F.puff ? Math.sin(Math.PI * h.puff / F.puff) : 0;
      if (h.puff !== Infinity) { h.puff += dt; if (h.puff > F.puff) h.puff = Infinity; }
      const P = h.pivots;
      P.body.scale.set((0.3 + 0.7 * Math.min(1, open * 1.6)) * (1 + puff * 0.12), Math.max(0.06, open) * (1 - puff * 0.06), (0.3 + 0.7 * Math.min(1, open * 1.6)) * (1 + puff * 0.12));
      P.body.rotation.z = fading < 1 ? (1 - fading) * 1.2 : -h.vx * 0.03;   // it tips over as it folds; leans into its drift
      P.body.rotation.x = h.vz * 0.03;
      P.flame.visible = rising > 0.7 && fading > 0.4;
      h.glow.value = (rising > 0.7 ? 1 : 0.5) * (fading < 1 ? fading : 1) * (1 + puff * 0.5) + (fading < 1 ? 0 : 0.03 * Math.sin(now * 7));
      if (e) { const a = Math.atan2(e.x - h.x, e.z - h.z) - h.yaw; P.flame.rotation.y = a; }   // the eye watches the boss
      const sway = F.sway * (reducedMotion() ? 0.5 : 1);
      for (let i = 0; i < STREAMERS.length; i++) {
        const st = P[STREAMERS[i]];
        st.rotation.x = Math.sin(now * 1.7 + i * 2.1) * sway * 0.4 + h.vz * 0.06;
        st.rotation.z = Math.sin(now * 1.3 + i * 1.4) * sway * 0.5 - h.vx * 0.06;
      }
      h.root.position.set(h.x, h.y, h.z); h.root.rotation.y = h.yaw;
      if (fading < 1 && !h.gone) { h.gone = true; at.x = h.x; at.y = h.y; at.z = h.z; ultraFx.moteBurst(at, 10, F.color, MOTES); }
      if ((h.mote -= dt) <= 0) { h.mote = F.motes; at.x = h.x; at.y = h.y - 0.1; at.z = h.z; ultraFx.moteBurst(at, 1, F.color, MOTES); }
      h.root.visible = true;
    }
  }
  events.on('abilityPower', d => {
    if (d.then !== 'lantern') return;
    if (d.heal) healed(d);
    else if (d.strike) shot(d);
    else call(d);
  });
  function clear() {
    for (const h of lanterns) { h.body = null; h.root.visible = false; }
    for (const b of balls) { b.age = Infinity; b.e = null; b.s.visible = false; for (const t of b.trail) t.visible = false; }
    for (const q of bursts) { q.age = Infinity; q.s.visible = false; }
    if (warm) { warm.age = Infinity; warm.line.visible = false; }
  }
  return {
    attach() { if (!lanterns.length) { makeFx(); for (let i = 0; i < 4; i++) lanterns.push(make()); } Game.renderHooks.push(draw); visuals.hooks.clear.push(clear); },
    clear, info: () => lanterns.filter(h => h.body).map(h => ({ kind: 'lantern', x: h.x, y: h.y, z: h.z, open: h.pivots.body.scale.y, balls: balls.filter(b => b.age !== Infinity).length,
      warm: warm.age !== Infinity })),
  };
})();
