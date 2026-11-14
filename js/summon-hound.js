'use strict';
// ============================================================================
// Grave Hound, drawn (pass 61): drawing only. The summon itself (where it runs, its bites, the boss it draws) is the
// engine's (js/abilities.js); this listens to its `abilityPower` events, the server's for everyone online.
// ============================================================================
// Its model is its own Blender model (tools/blender/hound.py, js/baked/hound.js): one rigid piece per joint, hung here
// on pivots (HOUND_JOINTS, the script's JOINT) and moved by hand: a gallop while it runs, a prowl round the boss while
// it waits, a lunge with its jaws snapping on each bite, its head thrown back in a howl when it draws the boss's eye.
// It is cold grave-fire: a fresnel shader bright at its edges and dim through its middle, its bone brighter than its
// hide, rising out of a pool of green fire at its holder's feet and burning away from the head down. It runs by the
// engine's rule (summonStep) where it is drawn, and each bite's event pulls it to the engine's place. Four in the pool
// (one a player), made at attach and warmed like the rest; nothing allocated per frame. Tuning: VIS.abilityFx.hound.
// The joints (absolute rest places, game axes, nose +z) and each one's parent: the same numbers as tools/blender/hound.py.
const HOUND_JOINTS = {
  body: [[0, 0.74, 0], null], neck: [[0, 0.9, 0.4], 'body'], head: [[0, 1.08, 0.66], 'neck'], jaw: [[0, 1.03, 0.74], 'head'],
  tail: [[0, 0.86, -0.6], 'body'],
  fLu: [[0.15, 0.84, 0.3], 'body'], fLl: [[0.15, 0.48, 0.27], 'fLu'], fRu: [[-0.15, 0.84, 0.3], 'body'], fRl: [[-0.15, 0.48, 0.27], 'fRu'],
  hLu: [[0.15, 0.8, -0.48], 'body'], hLl: [[0.16, 0.27, -0.6], 'hLu'], hRu: [[-0.15, 0.8, -0.48], 'body'], hRl: [[-0.16, 0.27, -0.6], 'hRu'],
};
const HOUND_EYES = [[0.055, 1.13, 0.8], [-0.055, 1.13, 0.8]];
// Each leg's place in the gallop (a fraction of a stride) and whether it is a hind leg.
const HOUND_LEGS = [['fL', 0, false], ['fR', 0.12, false], ['hL', 0.55, true], ['hR', 0.67, true]];
const summonHound = (() => {
  const H = VIS.abilityFx.hound, hounds = [];
  const vertex = `
    varying vec3 vN; varying vec3 vV; varying float vY;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0), mv = viewMatrix * world;
      vN = normalize(normalMatrix * normal); vV = -mv.xyz; vY = world.y;
      gl_Position = projectionMatrix * mv;
    }`;
  const fragment = `
    uniform vec3 uColor; uniform vec3 uCore; uniform float uOpacity; uniform float uCut; uniform float uFrom; uniform float uTime;
    uniform float uBoost; uniform float uRim; uniform float uBody; uniform float uFlicker;
    varying vec3 vN; varying vec3 vV; varying float vY;
    void main() {
      float edge = (vY - uCut) * uFrom;   // rising: the part below the cut is there; burning away: the part above it
      if (edge > 0.0) discard;
      float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
      float flick = 1.0 + uFlicker * sin(uTime * 11.0 + vY * 13.0) * sin(uTime * 6.1 - vY * 5.3);
      float seam = smoothstep(-0.18, 0.0, edge);
      vec3 c = mix(uColor, uCore, rim * 0.55 + seam) * (uBody + rim * uRim) * flick * uBoost;
      gl_FragColor = vec4(c, uOpacity * (0.3 + 0.7 * rim + seam));
    }`;
  function material(body) {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(H.color) }, uCore: { value: new THREE.Color(H.core) }, uOpacity: { value: 0 }, uCut: { value: 0 },
        uFrom: { value: 1 }, uTime: { value: 0 }, uBoost: { value: 1 }, uRim: { value: H.rim }, uBody: { value: body }, uFlicker: { value: H.flicker } },
      vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  }
  const eyeMat = () => new THREE.MeshBasicMaterial({ color: H.eye, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const EYE = new THREE.SphereGeometry(0.026, 10, 6);
  let geos = null;   // part -> [geometry, slot] (shared by the pool)
  function make() {
    if (!geos) {
      geos = [];
      for (const name of Object.keys(BAKED)) {
        if (!name.startsWith('hound:')) continue;
        const [part, slot] = name.slice(6).split('__');
        geos.push([part, slot.split('.')[0], bakedGeometry(name)]);
      }
    }
    const root = new THREE.Group(), pivots = {}, hide = material(H.body), bone = material(H.bone), eyes = eyeMat();
    for (const [name, [at, parent]] of Object.entries(HOUND_JOINTS)) {
      const g = new THREE.Group(), from = parent ? HOUND_JOINTS[parent][0] : [0, 0, 0];
      g.position.set(at[0] - from[0], at[1] - from[1], at[2] - from[2]);
      pivots[name] = g;
    }
    for (const [name, [, parent]] of Object.entries(HOUND_JOINTS)) (parent ? pivots[parent] : root).add(pivots[name]);
    for (const [part, slot, geo] of geos) {
      const at = HOUND_JOINTS[part][0], m = new THREE.Mesh(geo, slot === 'bone' ? bone : hide);
      m.position.set(-at[0], -at[1], -at[2]); m.castShadow = m.receiveShadow = false; m.renderOrder = 2;
      pivots[part].add(m);
    }
    const head = HOUND_JOINTS.head[0];
    for (const e of HOUND_EYES) { const m = new THREE.Mesh(EYE, eyes); m.position.set(e[0] - head[0], e[1] - head[1], e[2] - head[2]); m.renderOrder = 3; pivots.head.add(m); }
    root.traverse(o => { o.userData.warmUp = true; });
    root.visible = false; scene.add(root);
    return { root, pivots, hide, bone, mats: [hide, bone], eyes, body: null, enemy: null, kind: 'hound', x: 0, y: 0, z: 0, yaw: 0, shown: 0, left: 0, time: 1,
      speed: 0, stride: 0, lunge: Infinity, howl: Infinity, mote: 0, gone: false, enemies: null };
  }
  const at = { x: 0, y: 0, z: 0 }, MOTES = { r: 0.25, speed: 0.3, lift: 0.9, life: [0.35, 0.8], up: 1, size: 0.7 };
  const near = (x, z) => Game.player && Math.hypot(Game.player.x - x, Game.player.z - z) < VIS.abilityFx.near;
  const light = (p, color, k, range) => effectLighting.flash(p, color, k * (reducedMotion() ? 0.5 : 1), range);
  function call(d) {
    if (!hounds.length) return;
    const body = d.body;
    let h = hounds.find(q => q.body && q.body === body);
    const renew = !!h && h.left > H.fade;   // one fading away comes again fresh, as the engine's does
    h = h || hounds.find(q => !q.body) || hounds.reduce((a, b) => (a.left < b.left ? a : b));
    h.body = body; h.enemy = d.enemy; h.left = d.v.time; h.enemies = Game.enemies;
    if (renew) { h.time = d.v.time + H.rise; h.gone = false; return; }   // risen already: it stays up
    h.time = d.v.time; h.gone = false; h.lunge = h.howl = Infinity; h.speed = 0;
    const from = body || d;
    h.x = from.x; h.z = from.z; h.y = ground(h.x, h.z, from.y); h.yaw = body ? body.yaw || 0 : 0;
    // A pool of grave-fire opens at its holder's feet and it climbs out of it.
    at.x = h.x; at.y = h.y + 0.4; at.z = h.z;
    groundFx.ring(h.x, h.z, 1.5, H.color, 0.8, h.y); spawnBurst(at, H.burst);
    ultraFx.moteBurst(at, 40, H.color, { r: 0.6, speed: 0.9, lift: 1.8, life: [0.6, 1.3], up: 1 }); light(at, H.color, 8, 10);
    if (near(h.x, h.z)) Game.addShake(H.shake[0], H.shake[1]);
  }
  function ground(x, z, y) { const g = world.groundAt(x, z, y + 0.5); return Number.isFinite(g) ? g : y; }
  function bite(d) {
    const h = hounds.find(q => q.body && q.body === d.body);
    if (!h) return;
    // The engine's place, where the bite was: pulled toward it, at once if it is far off.
    const off = Math.hypot(d.x - h.x, d.z - h.z), k = off > H.snap ? 1 : 0.5;
    h.x += (d.x - h.x) * k; h.z += (d.z - h.z) * k; if (d.enemy) h.enemy = d.enemy;
    h.lunge = 0;
  }
  function howl(d) {
    const h = hounds.find(q => q.body && q.body === d.body);
    if (!h) return;
    h.howl = 0;
    at.x = h.x; at.y = h.y + 1.2; at.z = h.z;
    groundFx.ring(h.x, h.z, 2.6, H.color, 0.7, h.y);
    ultraFx.moteBurst(at, 24, H.color, { r: 0.3, speed: 1.6, lift: 2.2, life: [0.5, 1.1], up: 1 }); light(at, H.color, 6, 9);
  }
  // The bite lands: a green flash and sparks at the enemy's side facing the hound, as its jaws close.
  function snapAt(h) {
    const e = h.enemy;
    if (!e || !e.alive()) return;
    const dx = h.x - e.x, dz = h.z - e.z, l = Math.hypot(dx, dz) || 1, r = (e.radius || 1) * 0.85;
    at.x = e.x + dx / l * r; at.y = e.y + Math.min(1.1, (e.height || 1.8) * 0.4); at.z = e.z + dz / l * r;
    ultraFx.sparkBurst(at, 14, 'ember', [dx / l, 0.3, dz / l], 0.5, 0.7);
    ultraFx.moteBurst(at, 10, H.color, { r: 0.2, speed: 2, lift: 0.5, life: [0.3, 0.6] });
    spawnBurst(at, H.hitBurst); light(at, H.color, 4, 6);
  }
  const ease = t => t * t * (3 - 2 * t);
  // One hound's pose this frame: where it is, its stride, and the lunge or howl on top.
  function pose(h, dt, now) {
    const P = h.pivots, run = clamp01(h.speed / H.gallopAt), prowl = 1 - run;
    h.stride = (h.stride + dt * (H.strideRate * run + H.prowlRate * prowl)) % 1;
    const tau = Math.PI * 2, s = h.stride * tau;
    // Lunge: 0..`lunge` s; the jaws snap at `snap` of it.
    const L = h.lunge < H.lunge ? h.lunge / H.lunge : 1, reach = L < 1 ? Math.sin(Math.PI * Math.min(1, L * 1.4)) : 0;
    const open = L < 1 ? (L < H.snapAt ? ease(L / H.snapAt) : 1 - ease(clamp01((L - H.snapAt) / 0.2))) : 0;
    // Howl: head thrown back and held, jaws open, `howlTime` s.
    const W = h.howl < H.howlTime ? h.howl / H.howlTime : 1, up = W < 1 ? Math.sin(Math.PI * Math.min(1, W * 1.2)) : 0;
    // The body: a gallop's rise and pitch, a prowl's low crouch, the lunge's dive.
    P.body.position.y = 0.74 + run * Math.abs(Math.sin(s)) * 0.07 - prowl * 0.08 - reach * 0.06 + up * 0.04;
    P.body.position.z = reach * 0.45;
    P.body.rotation.x = run * Math.sin(s) * 0.12 + reach * 0.22 - up * 0.3;
    P.body.rotation.z = prowl * Math.sin(s) * 0.04;
    P.neck.rotation.x = 0.15 * prowl + run * Math.sin(s + 1) * 0.1 + reach * 0.35 - up * 0.95;
    P.head.rotation.x = -0.1 * prowl + reach * 0.15 - up * 0.45 + Math.sin(now * 2.3) * 0.03;
    P.head.rotation.y = prowl * Math.sin(now * 0.9) * 0.15;
    P.jaw.rotation.x = Math.max(open * 0.75, up * 0.6, 0.06 + prowl * 0.06 * (0.5 + 0.5 * Math.sin(now * 3)));
    P.tail.rotation.x = -0.25 + run * Math.sin(s * 2) * 0.25 + up * 0.4;
    P.tail.rotation.y = Math.sin(now * 2.1 + s) * (0.3 * prowl + 0.15);
    for (const [leg, off, hind] of HOUND_LEGS) {
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
    for (const h of hounds) {
      if (!h.body) continue;
      const b = h.body, alive = b.alive ? b.alive() : true;
      if (alive) h.left -= dt; else h.left = Math.min(h.left, H.fade);
      if (h.left <= 0 || h.enemies !== Game.enemies) { h.body = null; h.root.visible = false; continue; }   // a new fight ends it too
      // Runs by the engine's rule, round the enemy it hunts (else the nearest to its holder).
      let e = h.enemy && h.enemy.alive() && Game.enemies.includes(h.enemy) ? h.enemy : null;
      if (!e) { let best = CONFIG.abilities.summons.near; for (const o of Game.enemies) if (o.alive()) { const d = Math.hypot(o.x - b.x, o.z - b.z); if (d < best) { best = d; e = o; } } h.enemy = e; }
      const x0 = h.x, z0 = h.z, yaw0 = h.yaw;
      if (h.time - h.left > CONFIG.abilities.summons.arrive * 0.5) summonStep(h, e, alive ? b : null, dt);   // climbs out first
      const moved = Math.hypot(h.x - x0, h.z - z0) / Math.max(dt, 1e-4);
      h.speed += (moved - h.speed) * (1 - Math.exp(-8 * dt));
      h.yaw = yaw0 + angDiff(h.yaw, yaw0) * (1 - Math.exp(-H.turn * dt));
      h.y += (ground(h.x, h.z, e ? e.y : b.y) - h.y) * (1 - Math.exp(-12 * dt));
      // Lunge and howl clocks; the jaws close on the bite at `snapAt`.
      if (h.lunge !== Infinity) { const was = h.lunge; h.lunge += dt; if (was < H.lunge * H.snapAt && h.lunge >= H.lunge * H.snapAt) snapAt(h); if (h.lunge > H.lunge) h.lunge = Infinity; }
      if (h.howl !== Infinity) { h.howl += dt; if (h.howl > H.howlTime) h.howl = Infinity; }
      pose(h, dt, now);
      // Rising from the feet up out of its pool; burning away from the head down.
      const rising = clamp01((h.time - h.left) / H.rise), fading = clamp01(h.left / H.fade);
      for (const m of h.mats) {
        const u = m.uniforms;
        // The part above the cut is gone: rising, the cut climbs from the feet; fading, it sinks from the head.
        u.uFrom.value = 1; u.uCut.value = h.y - 0.1 + 1.5 * (fading < 1 ? fading : rising);
        u.uOpacity.value = 0.95 * Math.min(1, rising * 3); u.uTime.value = now;
        u.uBoost.value = 1 + (h.lunge !== Infinity ? H.biteBoost * (1 - h.lunge / H.lunge) : 0) + (h.howl !== Infinity ? H.biteBoost * 0.6 : 0);
      }
      h.eyes.opacity = Math.min(rising, fading) * (0.85 + 0.15 * Math.sin(now * 9));
      if (fading < 1 && !h.gone) { h.gone = true; at.x = h.x; at.y = h.y + 0.8; at.z = h.z; ultraFx.moteBurst(at, 30, H.color, { r: 0.5, speed: 0.9, lift: 2, life: [0.5, 1.1], up: 1 }); }
      if ((h.mote -= dt) <= 0) { h.mote = H.motes * (h.speed > 2 ? 0.5 : 1); at.x = h.x; at.y = h.y + 0.3 + Math.random() * 0.6; at.z = h.z; ultraFx.moteBurst(at, 2, H.color, MOTES); }
      h.root.visible = true;
    }
  }
  events.on('abilityPower', d => {
    if (d.then !== 'hound') return;
    if (d.draw) howl(d);
    else if (d.strike) bite(d);
    else call(d);
  });
  function clear() { for (const h of hounds) { h.body = null; h.root.visible = false; } }
  return {
    attach() { if (!hounds.length) for (let i = 0; i < 4; i++) hounds.push(make()); Game.renderHooks.push(draw); visuals.hooks.stage.push(clear); },
    clear, info: () => hounds.filter(h => h.body).map(h => ({ x: h.x, z: h.z, speed: h.speed, lunge: h.lunge !== Infinity, howl: h.howl !== Infinity })),
  };
})();
