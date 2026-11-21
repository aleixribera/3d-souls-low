'use strict';
// ============================================================================
// The Ink Crows, drawn (pass 144, design/abilities batch 11). Drawing only: the swarm's pecks and the boss it draws are
// the engine's (js/abilities.js, its place round the boss by summonStep); this listens to its `abilityPower` events, the
// server's for everyone online.
// ============================================================================
// One Blender crow (tools/blender/ink_crows.py, js/baked/ink-crows.js) drawn `count` times per swarm in one instanced
// mesh, its wings beating in the vertex shader (each crow its own phase, the flap growing with the distance from the
// body), in the beasts' cel bands with an ink outline and two white eye points. At the call the crows pour off their
// holder one after another and ring the boss's head, each on its own circle; each peck (the engine's `strike`, numbered)
// sends one crow, in turn, darting in at the head and back; as the swarm draws the boss it tightens and flares; as it
// ends the crows scatter up and shrink into drops of ink. Four swarms (one a player); nothing allocated per frame.
// Tuning: VIS.abilityFx.crows.
const summonCrows = (() => {
  const SWARMS = 4, swarms = [];
  let N = 0, mesh = null, outline = null, eyes = null, phase = null;
  const vertex = `
    attribute float aPhase;
    uniform float uAmp;
    varying vec3 vN; varying vec3 vV; varying vec3 vW;
    vec3 flap(vec3 p) {
      float w = abs(p.x), k = smoothstep(0.035, 0.36, w);
      p.y += sin(aPhase) * k * w * uAmp;
      return p;
    }
    void main() {
      vec3 p = flap(position);
      mat4 m = modelMatrix * instanceMatrix;
      vec4 world = m * vec4(p, 1.0), mv = viewMatrix * world;
      vN = normalize(mat3(viewMatrix) * mat3(m) * normal); vW = normalize(mat3(m) * normal); vV = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`;
  const fragment = `
    uniform vec3 uInk; uniform vec3 uLit; uniform vec3 uColor;
    varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main() {
      float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
      vec3 c = mix(uInk, uLit, step(0.3, dot(normalize(vW), vec3(0.35, 0.85, 0.4))));
      gl_FragColor = vec4(mix(c, uColor, step(0.62, rim)), 1.0);
    }`;
  const outlineVertex = `
    attribute float aPhase;
    uniform float uAmp; uniform float uWidth;
    void main() {
      vec3 p = position;
      float w = abs(p.x), k = smoothstep(0.035, 0.36, w);
      p.y += sin(aPhase) * k * w * uAmp;
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p + normal * uWidth, 1.0);
    }`;
  const outlineFragment = `uniform vec3 uInk; void main() { gl_FragColor = vec4(uInk, 1.0); }`;
  function build() {
    const F = VIS.abilityFx.crows;
    N = SWARMS * F.count;
    const body = bakedGeometry('crow:body__ink').clone(), eye = bakedGeometry('crow:body__eye').clone();
    phase = new THREE.InstancedBufferAttribute(new Float32Array(N), 1); phase.setUsage(THREE.DynamicDrawUsage);
    body.setAttribute('aPhase', phase);
    const amp = { value: F.flapAmp }, ink = { value: new THREE.Color(F.ink) };
    mesh = new THREE.InstancedMesh(body, new THREE.ShaderMaterial({ uniforms: { uInk: ink, uLit: { value: new THREE.Color(F.lit) }, uColor: { value: new THREE.Color(F.color) }, uAmp: amp },
      vertexShader: vertex, fragmentShader: fragment }), N);
    outline = new THREE.InstancedMesh(body, new THREE.ShaderMaterial({ uniforms: { uInk: ink, uAmp: amp, uWidth: { value: F.outline } },
      vertexShader: outlineVertex, fragmentShader: outlineFragment, side: THREE.BackSide }), N);
    eyes = new THREE.InstancedMesh(eye, new THREE.MeshBasicMaterial({ color: F.eye, toneMapped: false }), N);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    outline.instanceMatrix = mesh.instanceMatrix; eyes.instanceMatrix = mesh.instanceMatrix;
    for (const m of [mesh, outline, eyes]) { m.frustumCulled = false; m.castShadow = m.receiveShadow = false; m.userData.warmUp = true; m.visible = false; scene.add(m); }
    for (let i = 0; i < N; i++) mesh.setMatrixAt(i, HIDE);
    for (let s = 0; s < SWARMS; s++) {
      const crows = [];
      for (let i = 0; i < F.count; i++) crows.push({ i: s * F.count + i, x: 0, y: 0, z: 0, sx: 0, sy: 0, sz: 0, yaw: 0, bank: 0, dart: Infinity, rate: 0, r: 0, lift: 0, ph: Math.random() * 6.28 });
      swarms.push({ kind: 'crows', body: null, enemy: null, enemies: null, x: 0, z: 0, yaw: 0, age: 0, left: 0, time: 1, gone: false, cry: Infinity, crows, sx: 0, sy: 0, sz: 0 });
    }
  }
  const HIDE = new THREE.Matrix4().makeScale(0, 0, 0), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ');
  const V = new THREE.Vector3(), S = new THREE.Vector3(), at = { x: 0, y: 0, z: 0 };
  const light = (p, color, k, range) => effectLighting.flash(p, color, k * (reducedMotion() ? 0.5 : 1), range);
  const mine = d => swarms.find(q => q.body && q.body === d.body);
  function foe(w, b) {
    if (w.enemy && w.enemy.alive() && Game.enemies.includes(w.enemy)) return w.enemy;
    let best = CONFIG.abilities.summons.near, e = null;
    for (const o of Game.enemies) if (o.alive()) { const dd = Math.hypot(o.x - b.x, o.z - b.z); if (dd < best) { best = dd; e = o; } }
    return (w.enemy = e);
  }
  function call(d) {
    if (!mesh) return;
    let w = mine(d);
    const F = VIS.abilityFx.crows, renew = !!w && w.left > F.fade;
    w = w || swarms.find(q => !q.body) || swarms.reduce((a, b) => (a.left < b.left ? a : b));
    w.body = d.body; w.enemy = d.enemy || null; w.left = d.v.time; w.enemies = Game.enemies;
    if (renew) { w.time = d.v.time + F.pour; w.gone = false; return; }   // in the air already: it stays
    w.time = d.v.time; w.gone = false; w.age = 0; w.cry = Infinity;
    const from = d.body || d;
    w.x = from.x; w.z = from.z; w.yaw = d.body ? d.body.yaw || 0 : 0;
    w.sx = from.x; w.sy = (from.y || 0) + 1.3; w.sz = from.z;   // they pour off their holder's back
    for (const c of w.crows) {
      c.x = c.sx = w.sx; c.y = c.sy = w.sy; c.z = c.sz = w.sz; c.dart = Infinity;
      c.rate = (F.spin + Math.random() * F.spin * 0.6) * (c.i % 2 ? 1 : -1); c.r = F.ring * (0.75 + Math.random() * 0.5); c.lift = (Math.random() - 0.5) * F.spread;
    }
    at.x = w.sx; at.y = w.sy; at.z = w.sz;
    spawnBurst(at, F.burst); ultraFx.moteBurst(at, 16, F.color, { r: 0.4, speed: 1.2, lift: 1.6, life: [0.4, 0.9], up: 1 }); light(at, F.color, 4, 7);
  }
  function peck(d) {
    const w = mine(d);
    if (!w) return;
    if (d.enemy) w.enemy = d.enemy;
    const c = w.crows[((d.strike || 1) - 1) % w.crows.length];
    c.dart = 0;
  }
  function cry(d) {
    const w = mine(d);
    if (!w) return;
    w.cry = 0;
    const e = foe(w, w.body), F = VIS.abilityFx.crows;
    if (!e) return;
    at.x = e.x; at.y = e.y + (e.height || 1.8) + 0.3; at.z = e.z;
    ultraFx.moteBurst(at, 16, F.color, { r: 0.5, speed: 1.6, lift: 1.4, life: [0.4, 0.9], up: 1 }); light(at, F.color, 4, 7);
    groundFx.ring(e.x, e.z, (e.radius || 1) + 1.6, F.color, 0.6, e.y);
  }
  const ease = t => t * t * (3 - 2 * t);
  function draw() {
    if (!mesh) return;
    const dt = effectSlots.dt(), now = effectSlots.time(), F = VIS.abilityFx.crows, still = reducedMotion();
    let any = false;
    for (const w of swarms) {
      if (!w.body) continue;
      const b = w.body, alive = b.alive ? b.alive() : true;
      if (alive) w.left -= dt; else w.left = Math.min(w.left, F.fade);
      if (w.left <= 0 || w.enemies !== Game.enemies) { w.body = null; for (const c of w.crows) mesh.setMatrixAt(c.i, HIDE); any = true; continue; }
      any = true;
      const e = foe(w, b);
      w.age += dt;
      summonStep(w, e, alive ? b : null, dt);   // the swarm's place by the engine's rule (it turns round the boss)
      if (w.cry !== Infinity && (w.cry += dt) > F.cryTime) w.cry = Infinity;
      // The ring's middle: the boss's head (else the swarm's place at head height).
      const hx = e ? e.x : w.x, hz = e ? e.z : w.z, hy = e ? e.y + (e.height || 1.8) * F.head : (b.y || 0) + 1.8;
      const hr = e ? (e.radius || 1) * 0.6 : 0.5;
      const fading = clamp01(w.left / F.fade), tight = w.cry !== Infinity ? 1 - 0.4 * Math.sin(Math.PI * w.cry / F.cryTime) : 1;
      if (fading < 1 && !w.gone) { w.gone = true; at.x = hx; at.y = hy; at.z = hz; ultraFx.moteBurst(at, 24, F.color, { r: 0.8, speed: 1, lift: 1.2, life: [0.5, 1], up: 1 }); }
      for (let k = 0; k < w.crows.length; k++) {
        const c = w.crows[k], x0 = c.x, y0 = c.y, z0 = c.z;
        // Its slot on its own circle round the head, bobbing; out and up as the swarm scatters at the end.
        const a = c.ph + w.age * c.rate, out = 1 + (1 - fading) * 3;
        let tx = hx + Math.sin(a) * (hr + c.r * tight) * out, tz = hz + Math.cos(a) * (hr + c.r * tight) * out;
        let ty = hy + c.lift + (still ? 0 : Math.sin(w.age * 3 + c.ph) * 0.12) + (1 - fading) * 2.5;
        // A dart: in at the head and back over `dart` s (out to its slot by a sine).
        if (c.dart !== Infinity) {
          const was = c.dart; c.dart += dt;
          const p = c.dart / F.dart, k2 = Math.sin(Math.PI * Math.min(1, p));
          tx += (hx - tx) * k2 * 0.85; ty += (hy + 0.1 - ty) * k2 * 0.85; tz += (hz - tz) * k2 * 0.85;
          if (was < F.dart * 0.5 && c.dart >= F.dart * 0.5 && e) { at.x = c.x; at.y = c.y; at.z = c.z; ultraFx.sparkBurst(at, 3, 'lunar', [0, 0.5, 0], 0.3, 0.4); }
          if (p >= 1) c.dart = Infinity;
        }
        // Pouring off the holder: each in turn, an arc up to its slot.
        const p = clamp01((w.age - k * F.stagger) / F.pour);
        if (p < 1) {
          const q = ease(p);
          c.x = c.sx + (tx - c.sx) * q; c.y = c.sy + (ty - c.sy) * q + Math.sin(Math.PI * p) * 1.2; c.z = c.sz + (tz - c.sz) * q;
        } else {
          const f = 1 - Math.exp(-F.follow * dt);
          c.x += (tx - c.x) * (c.dart !== Infinity ? 1 : f); c.y += (ty - c.y) * (c.dart !== Infinity ? 1 : f); c.z += (tz - c.z) * (c.dart !== Infinity ? 1 : f);
        }
        const vx = c.x - x0, vz = c.z - z0, vy = c.y - y0, sp = Math.hypot(vx, vz);
        if (sp > 1e-4) {
          const yaw = Math.atan2(vx, vz), turn = angDiff(yaw, c.yaw);
          c.yaw += turn * (1 - Math.exp(-14 * dt)); c.bank += (clamp(-turn * 4, -0.8, 0.8) - c.bank) * (1 - Math.exp(-6 * dt));
        }
        const pitch = clamp(-Math.atan2(vy, Math.max(sp, 1e-3)), -0.8, 0.8);
        phase.array[c.i] = (c.ph * 7 + now * F.flap * Math.PI * 2 * (c.dart !== Infinity ? 1.4 : 1)) % (Math.PI * 2);
        const sz = F.size * (p < 1 ? 0.4 + 0.6 * p : 1) * (fading < 1 ? fading : 1);
        E.set(pitch, c.yaw, c.bank); Q.setFromEuler(E); V.set(c.x, c.y, c.z); S.setScalar(sz);
        mesh.setMatrixAt(c.i, M.compose(V, Q, S));
      }
    }
    if (!any) { if (mesh.visible) mesh.visible = outline.visible = eyes.visible = false; return; }
    mesh.visible = outline.visible = eyes.visible = true;
    mesh.instanceMatrix.needsUpdate = true; phase.needsUpdate = true;
  }
  events.on('abilityPower', d => {
    if (d.then !== 'crows') return;
    if (d.draw) cry(d);
    else if (d.strike) peck(d);
    else call(d);
  });
  function clear() {
    for (const w of swarms) w.body = null;
    if (!mesh) return;
    for (let i = 0; i < N; i++) mesh.setMatrixAt(i, HIDE);
    mesh.instanceMatrix.needsUpdate = true; mesh.visible = outline.visible = eyes.visible = false;
  }
  return {
    attach() { if (!mesh) build(); Game.renderHooks.push(draw); visuals.hooks.stage.push(clear); },
    clear, info: () => swarms.filter(w => w.body).map(w => ({ crows: w.crows.length, darting: w.crows.filter(c => c.dart !== Infinity).length, x: w.x, z: w.z })),
  };
})();
