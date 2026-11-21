'use strict';
// ============================================================================
// The Mire Serpent, drawn (pass 147, Summons III). Drawing only: the summon itself (it rides with its enemy, its
// squeezes, the boss it draws) is the engine's (js/abilities.js, its kind's `coil`); this listens to its `abilityPower`
// events, the server's for everyone online.
// ============================================================================
// Its Blender model (tools/blender/mire_serpent.py, js/baked/mire-serpent.js) is a body segment, a head and a jaw. Here
// `segs` copies of the segment lie along a helix round the enemy's body (`turns` turns from its feet up to `climb` of its
// height, `gap` m off its side), each turned along the helix and stretched to its length, narrowing toward the tail (at
// the bottom); the head rides the top end, its jaw hinged under it. Cel-shaded like the hound (summonBeasts.cel): black
// water in two bands under a hard blue rim, its spines and teeth light. It rises out of a pool of black water under the
// boss from the tail up, tightens (`squeeze`) and glows on each blow, rears its head back and opens its jaws to hiss when
// it draws the boss, and sinks from the head down. Four in the pool; nothing allocated per frame. Tuning:
// VIS.abilityFx.serpent.
const summonCoil = (() => {
  const coils = [], P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let SEG = null, HEAD = null, JAW = null, POOL_TEX = null;
  const JAW_AT = [0, -0.05, 0.06];   // the jaw's hinge in the head's frame (mire_serpent.py JAW)
  function geos() {
    if (SEG) return;
    const of = part => Object.keys(BAKED).filter(n => n.startsWith(`serpent:${part}__`)).map(n => [n.split('__')[1].split('.')[0], bakedGeometry(n)]);
    SEG = of('seg'); HEAD = of('head'); JAW = of('jaw');
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), pts = [];
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, r = 64 * (0.8 + 0.1 * Math.sin(i * 2.7) + 0.06 * Math.sin(i * 6.3)); pts.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r]); }
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.lineWidth = 4; g.strokeStyle = '#8fb8dc'; g.stroke(); g.fillStyle = '#0b0d12'; g.fill();
    POOL_TEX = new THREE.CanvasTexture(c); POOL_TEX.colorSpace = THREE.SRGBColorSpace;
  }
  function make() {
    const F = VIS.abilityFx.serpent, C = summonBeasts.cel(F);
    const mat = slot => (F.lights.includes(slot) ? C.bright : C.dark);
    const piece = (list, parent) => { for (const [slot, geo] of list) for (const m of [new THREE.Mesh(geo, mat(slot)), new THREE.Mesh(geo, C.outline)]) { m.castShadow = m.receiveShadow = false; parent.add(m); } };
    const root = new THREE.Group(), segs = [];
    for (let i = 0; i < F.segs; i++) { const g = new THREE.Group(); piece(SEG, g); root.add(g); segs.push(g); }
    const head = new THREE.Group(), jaw = new THREE.Group();
    piece(HEAD, head); jaw.position.set(JAW_AT[0], JAW_AT[1], JAW_AT[2]);
    const jawMeshes = new THREE.Group(); jawMeshes.position.set(-JAW_AT[0], -JAW_AT[1], -JAW_AT[2]); piece(JAW, jawMeshes); jaw.add(jawMeshes);
    head.add(jaw); head.scale.setScalar(F.head); root.add(head);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: POOL_TEX, transparent: true, depthWrite: false, opacity: 0 }));
    pool.rotation.x = -Math.PI / 2; pool.renderOrder = 1; pool.visible = false; scene.add(pool); pooledFx.push(pool);
    root.traverse(o => { o.userData.warmUp = true; });
    root.visible = false; scene.add(root);
    return { F, root, segs, head, jaw, pool, shared: C.shared, body: null, enemy: null, enemies: null, x: 0, y: 0, z: 0, r: 1, h: 1.8,
      left: 0, time: 1, age: 0, squeeze: Infinity, hiss: Infinity, gone: false, mote: 0 };
  }
  const at = { x: 0, y: 0, z: 0 }, MOTES = { r: 0.5, speed: 0.3, lift: 1, life: [0.4, 0.9], up: 1, size: 0.7 };
  const near = (x, z) => Game.player && Math.hypot(Game.player.x - x, Game.player.z - z) < VIS.abilityFx.near;
  const light = (p, color, k, range) => effectLighting.flash(p, color, k * (reducedMotion() ? 0.5 : 1), range);
  const mine = d => coils.find(q => q.body && q.body === d.body);
  function ground(x, z, y) { const g = world.groundAt(x, z, y + 0.5); return Number.isFinite(g) ? g : y; }
  function call(d) {
    let c = mine(d);
    const F = VIS.abilityFx.serpent, renew = !!c && c.left > F.fade;
    c = c || coils.find(q => !q.body) || coils.reduce((a, b) => (a.left < b.left ? a : b));
    c.body = d.body; c.enemy = d.enemy || c.enemy; c.left = d.v.time; c.enemies = Game.enemies;
    if (renew) { c.time = d.v.time + F.rise; c.gone = false; return; }
    c.time = d.v.time; c.gone = false; c.age = 0; c.squeeze = c.hiss = Infinity;
    const e = c.enemy || d.body || d;
    c.x = e.x; c.z = e.z; c.y = ground(c.x, c.z, e.y || 0);
    c.pool.position.set(c.x, c.y + 0.025, c.z); c.pool.visible = true;
    at.x = c.x; at.y = c.y + 0.3; at.z = c.z;
    groundFx.ring(c.x, c.z, 2.4, F.color, 0.8, c.y); spawnBurst(at, F.burst);
    ultraFx.moteBurst(at, 30, F.color, { r: 1, speed: 0.8, lift: 1.6, life: [0.5, 1.1], up: 1 }); light(at, F.color, 6, 9);
    if (near(c.x, c.z)) Game.addShake(F.shake[0], F.shake[1]);
  }
  // A squeeze (the engine's `strike`): the coil tightens and glows, sparks where it bites into the boss.
  function squeeze(d) {
    const c = mine(d);
    if (!c) return;
    if (d.enemy) c.enemy = d.enemy;
    c.squeeze = 0;
    const e = c.enemy;
    if (!e || !e.alive()) return;
    at.x = e.x; at.y = e.y + c.h * 0.35; at.z = e.z;
    ultraFx.sparkBurst(at, 12, 'lunar', [0, 0.4, 0], 0.6, 0.8); spawnBurst(at, c.F.hitBurst); light(at, c.F.color, 4, 6);
  }
  function hiss(d) {
    const c = mine(d);
    if (!c) return;
    c.hiss = 0; if (d.enemy) c.enemy = d.enemy;
    at.x = c.x; at.y = c.y + c.h * c.F.climb + 0.4; at.z = c.z;
    groundFx.ring(c.x, c.z, 3, c.F.color, 0.75, c.y); ultraFx.flare(at, c.F.color, 2);
    ultraFx.moteBurst(at, 18, c.F.color, { r: 0.3, speed: 1.4, lift: 1.5, life: [0.5, 1], up: 1 }); light(at, c.F.color, 5, 8);
  }
  const bell = t => Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
  // A point of the helix at t (0 the tail at the floor, 1 the head's neck): into `out`.
  function helix(c, t, spin, r, out) {
    const F = c.F, a = spin + t * F.turns * Math.PI * 2;
    return out.set(c.x + Math.sin(a) * r, c.y + 0.12 + t * c.h * F.climb, c.z + Math.cos(a) * r);
  }
  function draw() {
    const dt = effectSlots.dt(), now = effectSlots.time();
    for (const c of coils) {
      if (c.pool.visible) {   // the pool lies under it while it is up and dries after
        const live = c.body ? 0.85 * clamp01(c.age / 0.25) * clamp01(c.left / c.F.fade) : 0;
        c.pool.material.opacity = live; c.pool.position.set(c.x, c.y + 0.025, c.z);
        const s = (c.r + 0.6) * 2; c.pool.scale.set(s, s, 1);
        if (!c.body) c.pool.visible = false;
      }
      if (!c.body) continue;
      const F = c.F, b = c.body, alive = b.alive ? b.alive() : true;
      if (alive) c.left -= dt; else c.left = Math.min(c.left, F.fade);
      if (c.left <= 0 || c.enemies !== Game.enemies) { c.body = null; c.root.visible = false; continue; }
      const e = c.enemy && c.enemy.alive() && Game.enemies.includes(c.enemy) ? c.enemy : null;
      if (e) { c.x = e.x; c.z = e.z; c.r = (e.radius || 1) + F.gap; c.h = e.height || 1.8; c.y += (ground(c.x, c.z, e.y) - c.y) * (1 - Math.exp(-12 * dt)); }   // it rides with its enemy
      c.age += dt;
      if (c.squeeze !== Infinity) { c.squeeze += dt; if (c.squeeze > F.squeezeTime) c.squeeze = Infinity; }
      if (c.hiss !== Infinity) { c.hiss += dt; if (c.hiss > F.hissTime) c.hiss = Infinity; }
      const sq = c.squeeze !== Infinity ? bell(c.squeeze / F.squeezeTime) : 0, hs = c.hiss !== Infinity ? bell(c.hiss / F.hissTime) : 0;
      const spin = c.age * F.spin, r = c.r * (1 - F.squeeze * sq), n = c.segs.length;
      // Each segment between two points of the helix: at their middle, turned along them, stretched to their length.
      for (let i = 0; i < n; i++) {
        helix(c, i / n, spin, r, P0); helix(c, (i + 1) / n, spin, r, P1);
        const g = c.segs[i], len = P0.distanceTo(P1), thick = F.thick * (0.55 + 0.45 * (i + 1) / n) * (1 + 0.15 * sq);
        g.position.copy(P0).add(P1).multiplyScalar(0.5); g.up.copy(UP); g.lookAt(P1); g.scale.set(thick, thick, len * 1.08);
      }
      // The head: at the top end, along the helix and lifted; reared back and turned on its holder in the hiss.
      helix(c, 1, spin, r, P0); helix(c, 1 + 0.4 / n, spin, r, P1);
      P1.y += 0.25 + hs * 0.5; c.head.position.copy(P0); c.head.position.y += hs * 0.35;
      if (hs > 0 && alive) { P1.x += (b.x - P1.x) * hs * 0.5; P1.z += (b.z - P1.z) * hs * 0.5; }
      c.head.up.copy(UP); c.head.lookAt(P1);
      c.jaw.rotation.x = Math.max(hs * 0.8, sq * 0.4, 0.08 + 0.05 * Math.sin(now * 3));
      // Rising out of its pool from the tail up; sinking from the head down.
      const rising = clamp01((c.time - c.left) / F.rise), fading = clamp01(c.left / F.fade), tall = c.h * F.climb + 0.8, u = c.shared;
      u.uFrom.value = 1; u.uCut.value = c.y - 0.1 + tall * (fading < 1 ? fading : rising < 1 ? rising : 9);
      u.uTime.value = now; u.uBoost.value = 1 + F.boost * Math.max(sq, hs * 0.6);
      if (fading < 1 && !c.gone) { c.gone = true; at.x = c.x; at.y = c.y + 0.8; at.z = c.z; ultraFx.moteBurst(at, 24, F.color, { r: 0.8, speed: 0.9, lift: 1.6, life: [0.5, 1.1], up: 1 }); }
      if ((c.mote -= dt) <= 0) { c.mote = F.motes; at.x = c.x; at.y = c.y + Math.random() * c.h * F.climb; at.z = c.z; ultraFx.moteBurst(at, 2, F.color, MOTES); }
      c.root.visible = true;
    }
  }
  events.on('abilityPower', d => {
    if (d.then !== 'serpent' || d.land) return;
    if (d.draw) hiss(d);
    else if (d.strike) squeeze(d);
    else call(d);
  });
  function clear() { for (const c of coils) { c.body = null; c.root.visible = false; c.pool.visible = false; } }
  return {
    attach() {
      if (!coils.length) { geos(); for (let i = 0; i < 4; i++) coils.push(make()); }
      Game.renderHooks.push(draw); visuals.hooks.clear.push(clear);
    },
    clear, info: () => coils.filter(c => c.body).map(c => ({ x: c.x, z: c.z, r: c.r, squeeze: c.squeeze !== Infinity, hiss: c.hiss !== Infinity })),
  };
})();
