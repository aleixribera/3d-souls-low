'use strict';
// ============================================================================
// The large beast summons, drawn (pass 147, Summons III): the Ash Bear and the Glass Mantis. Drawing only: the summons
// themselves (where they stand, their blows, the boss they draw) are the engine's (js/abilities.js); this listens to their
// `abilityPower` events, the server's for everyone online.
// ============================================================================
// Each is its own Blender model (tools/blender/ash_bear.py, js/baked/ash-bear.js; tools/blender/glass_mantis.py,
// js/baked/glass-mantis.js): one rigid piece per joint, hung here on pivots (BRUTE_JOINTS, each script's JOINT) and moved
// by hand, in the hound's cel style (summonBeasts.cel: two flat bands, a hard blue rim, an ink outline).
// The bear is ash over charred bone with embers in its cracks (`lights`): it lumbers, rears up on the engine's `flight`
// word (its swipe's wind-up, CONFIG.abilities.summons.bear.dive s) and brings both forepaws down on its `land` word, the
// floor cracking under them; it roars, head up and jaws wide, when it draws the boss. The mantis is pale glass with
// white edges and blue eyes: its scythes scissor shut on each blow, its wings fan wide when it draws the boss, and it
// shatters into glints as it goes. Both climb out of the floor from the feet up and go from the head down, and both thin
// by a dither while they stand between the camera and their boss (`see`, summonBeasts.see). Four of each in the pool,
// made at attach and warmed like the rest; nothing allocated per frame. Tuning: VIS.abilityFx.<kind>.
// The joints (absolute rest places, game axes, nose +z) and each one's parent: the same numbers as the Blender scripts.
const BRUTE_JOINTS = {
  bear: {
    body: [[0, 1.0, -0.55], null], neck: [[0, 1.3, 0.72], 'body'], head: [[0, 1.28, 1.05], 'neck'], jaw: [[0, 1.12, 1.18], 'head'],
    fLu: [[0.34, 1.18, 0.55], 'body'], fLl: [[0.36, 0.58, 0.6], 'fLu'], fRu: [[-0.34, 1.18, 0.55], 'body'], fRl: [[-0.36, 0.58, 0.6], 'fRu'],
    hLu: [[0.32, 1.02, -0.6], null], hLl: [[0.34, 0.52, -0.74], 'hLu'], hRu: [[-0.32, 1.02, -0.6], null], hRl: [[-0.34, 0.52, -0.74], 'hRu'],
  },
  mantis: {
    body: [[0, 1.0, 0], null], head: [[0, 2.12, 0.34], 'body'],
    aLu: [[0.13, 1.78, 0.26], 'body'], aLl: [[0.17, 1.4, 0.62], 'aLu'], aRu: [[-0.13, 1.78, 0.26], 'body'], aRl: [[-0.17, 1.4, 0.62], 'aRu'],
    wL: [[0.07, 1.3, -0.08], 'body'], wR: [[-0.07, 1.3, -0.08], 'body'],
    lL1: [[0.1, 1.0, 0.06], 'body'], lR1: [[-0.1, 1.0, 0.06], 'body'], lL2: [[0.1, 0.96, -0.16], 'body'], lR2: [[-0.1, 0.96, -0.16], 'body'],
  },
};
const BEAR_LEGS = [['fL', 0, false], ['fR', 0.5, false], ['hL', 0.5, true], ['hR', 0, true]];   // each leg's place in the stride
const summonBrutes = (() => {
  const KINDS = Object.keys(BRUTE_JOINTS), brutes = [];
  const geos = {};   // kind -> [part, slot, geometry] (shared by the pool)
  function parts(kind) {
    if (!geos[kind]) {
      geos[kind] = [];
      const pre = kind + ':';
      for (const name of Object.keys(BAKED)) {
        if (!name.startsWith(pre)) continue;
        const [part, slot] = name.slice(pre.length).split('__');
        geos[kind].push([part, slot.split('.')[0], bakedGeometry(name)]);
      }
    }
    return geos[kind];
  }
  function make(kind) {
    const F = VIS.abilityFx[kind], J = BRUTE_JOINTS[kind];
    const C = summonBeasts.cel(F), tones = {};
    for (const slot in F.tones || {}) tones[slot] = C.tone(F.tones[slot][0], F.tones[slot][1]);
    const root = new THREE.Group(), pivots = {};
    for (const [name, [at, parent]] of Object.entries(J)) {
      const g = new THREE.Group(), from = parent ? J[parent][0] : [0, 0, 0];
      g.position.set(at[0] - from[0], at[1] - from[1], at[2] - from[2]);
      pivots[name] = g;
    }
    for (const [name, [, parent]] of Object.entries(J)) (parent ? pivots[parent] : root).add(pivots[name]);
    for (const [part, slot, geo] of parts(kind)) {
      const at = J[part][0], m = F.lights.includes(slot) ? C.bright : tones[slot] || C.dark;
      for (const mesh of [new THREE.Mesh(geo, m), new THREE.Mesh(geo, C.outline)]) {
        mesh.position.set(-at[0], -at[1], -at[2]); mesh.castShadow = mesh.receiveShadow = false;
        pivots[part].add(mesh);
      }
    }
    root.scale.setScalar(F.size);
    // Its limbs, looked up once: the bear's legs (each one's place in the stride, hind or not), the mantis's sides.
    const legs = kind === 'bear' ? BEAR_LEGS.map(([n, off, hind]) => ({ u: pivots[n + 'u'], l: pivots[n + 'l'], off, hind, left: n === 'fL' })) : null;
    const sides = kind === 'mantis' ? [['L', 1], ['R', -1]].map(([n, k]) => ({ k, au: pivots[`a${n}u`], al: pivots[`a${n}l`], w: pivots[`w${n}`], l1: pivots[`l${n}1`], l2: pivots[`l${n}2`] })) : null;
    root.traverse(o => { o.userData.warmUp = true; });
    root.visible = false; scene.add(root);
    return { kind, F, J, root, pivots, legs, sides, shared: C.shared, body: null, enemy: null, enemies: null, x: 0, y: 0, z: 0, yaw: 0, left: 0, time: 1,
      speed: 0, stride: 0, rear: Infinity, rearFor: 0.6, swipe: Infinity, cut: Infinity, cry: Infinity, n: 0, see: 1, mote: 0, gone: false };
  }
  const at = { x: 0, y: 0, z: 0 }, MOTES = { r: 0.4, speed: 0.3, lift: 1.2, life: [0.4, 0.9], up: 1, size: 0.8 };
  const near = (x, z) => Game.player && Math.hypot(Game.player.x - x, Game.player.z - z) < VIS.abilityFx.near;
  const light = (p, color, k, range) => effectLighting.flash(p, color, k * (reducedMotion() ? 0.5 : 1), range);
  const mine = d => brutes.find(q => q.kind === d.then && q.body && q.body === d.body);
  function ground(x, z, y) { const g = world.groundAt(x, z, y + 0.5); return Number.isFinite(g) ? g : y; }
  function foe(h, b) {
    if (h.enemy && h.enemy.alive() && Game.enemies.includes(h.enemy)) return h.enemy;
    let best = CONFIG.abilities.summons.near, e = null;
    for (const o of Game.enemies) if (o.alive()) { const d = Math.hypot(o.x - b.x, o.z - b.z); if (d < best) { best = d; e = o; } }
    return (h.enemy = e);
  }
  function call(d) {
    let h = mine(d);
    const F = VIS.abilityFx[d.then], renew = !!h && h.left > F.fade;   // one fading away comes again fresh, as the engine's does
    h = h || brutes.find(q => q.kind === d.then && !q.body) || brutes.filter(q => q.kind === d.then).reduce((a, b) => (a.left < b.left ? a : b));
    h.body = d.body; h.enemy = d.enemy || null; h.left = d.v.time; h.enemies = Game.enemies;
    if (renew) { h.time = d.v.time + F.rise; h.gone = false; return; }   // up already: it stays up
    h.time = d.v.time; h.gone = false; h.rear = h.swipe = h.cut = h.cry = Infinity; h.speed = 0; h.n = 0; h.see = 1;
    const from = d.body || d;
    h.x = from.x; h.z = from.z; h.yaw = d.body ? d.body.yaw || 0 : 0;
    summonStep(h, foe(h, from), d.body, 60);   // it comes up where it will stand
    h.y = ground(h.x, h.z, from.y);
    at.x = h.x; at.y = h.y + 0.6; at.z = h.z;
    groundFx.ring(h.x, h.z, 2.4 * F.size, F.color, 0.8, h.y); spawnBurst(at, F.burst);
    ultraFx.moteBurst(at, 30, F.color, { r: 0.8, speed: 0.9, lift: 2, life: [0.6, 1.2], up: 1 }); light(at, F.color, 7, 10);
    if (near(h.x, h.z)) Game.addShake(F.shake[0], F.shake[1]);
  }
  // A blow (the engine's `strike`): the bear's is its rear (a `flight` of `dive` s before it lands), the mantis's its cut.
  function strike(d) {
    const h = mine(d);
    if (!h) return;
    if (Math.hypot(d.x - h.x, d.z - h.z) > 2.5) { h.x = d.x; h.z = d.z; }   // the engine's place, at once if it is far off
    if (d.enemy) h.enemy = d.enemy;
    h.n = d.strike || h.n + 1;
    if (d.flight !== undefined) { h.rear = 0; h.rearFor = Math.max(0.1, d.flight); h.swipe = Infinity; }
    else { h.cut = 0; hitFx(h, 0.4); }
  }
  // The bear's paws come down (the engine's `land`): the floor cracks before it, sparks on the boss.
  function land(d) {
    const h = mine(d);
    if (!h) return;
    const F = h.F, s = Math.sin(h.yaw), c = Math.cos(h.yaw), I = F.impact, x = h.x + s * I.ahead, z = h.z + c * I.ahead, y = ground(x, z, h.y);
    h.rear = Infinity; h.swipe = 0;
    groundFx.spawn(x, z, I, y); groundFx.ring(x, z, I.ring * 0.7, F.color, 0.6, y);
    if (I.chunks) ultraFx.chunkBurst(x, y, z, I.chunks, 0.8);
    at.x = x; at.y = y + 0.2; at.z = z; light(at, F.color, 6, 8);
    if (near(h.x, h.z)) Game.addShake(F.shake[0] * I.shake, F.shake[1] * I.shake);
    hitFx(h, 0.5);
  }
  function hitFx(h, up) {
    const e = h.enemy;
    if (!e || !e.alive()) return;
    const F = h.F, dx = h.x - e.x, dz = h.z - e.z, l = Math.hypot(dx, dz) || 1, r = (e.radius || 1) * 0.85;
    at.x = e.x + dx / l * r; at.y = e.y + Math.min(1.4, (e.height || 1.8) * up); at.z = e.z + dz / l * r;
    ultraFx.sparkBurst(at, 14, 'lunar', [dx / l, 0.3, dz / l], 0.6, 0.8);
    spawnBurst(at, F.hitBurst); light(at, F.color, 4, 6);
  }
  // It draws the boss's eye: the bear's roar, the mantis's wings fanned wide, a ring at its feet.
  function cry(d) {
    const h = mine(d);
    if (!h) return;
    h.cry = 0; if (d.enemy) h.enemy = d.enemy;
    const F = h.F;
    at.x = h.x; at.y = h.y + 1.6 * F.size; at.z = h.z;
    groundFx.ring(h.x, h.z, 3 * F.size, F.color, 0.75, h.y); ultraFx.flare(at, F.color, 2.4);
    ultraFx.moteBurst(at, 24, F.color, { r: 0.5, speed: 1.4, lift: 2, life: [0.5, 1.1], up: 1 }); light(at, F.color, 6, 9);
    if (near(h.x, h.z)) Game.addShake(F.shake[0] * 0.6, F.shake[1] * 0.6);
  }
  const ease = t => t * t * (3 - 2 * t), bell = t => Math.sin(Math.PI * clamp01(t));
  // The bear: a heavy four-legged walk; reared on its hind legs through the wind-up; both forepaws slammed down on the
  // swipe and eased back up; its head thrown up and jaws wide in the roar.
  function poseBear(h, dt, now) {
    const F = h.F, P = h.pivots, run = clamp01(h.speed / 3), idle = 1 - run, tau = Math.PI * 2;
    h.stride = (h.stride + dt * (F.strideRate * run + 0.25 * idle)) % 1;
    const s = h.stride * tau;
    // Rear: up through the wind-up and held at the top; the swipe drops it in its first tenth and eases back after.
    const W = h.swipe !== Infinity ? h.swipe / F.swipeTime : 1;
    const R = h.rear !== Infinity ? ease(Math.min(1, h.rear / (h.rearFor * 0.8))) : W < 0.1 ? 1 - W / 0.1 : 0;
    const down = W < 1 ? (W < 0.1 ? W / 0.1 : 1 - ease((W - 0.1) / 0.9)) : 0;
    const roar = h.cry !== Infinity ? bell(h.cry / F.cryTime) : 0;
    P.body.rotation.x = -R * 0.85 + down * 0.18 + run * Math.sin(s * 2) * 0.03 - roar * 0.2;
    P.body.position.y = h.J.body[0][1] + run * Math.abs(Math.sin(s)) * 0.04 - down * 0.08;
    P.neck.rotation.x = R * 0.35 - down * 0.1 - roar * 0.55 + Math.sin(now * 1.3) * 0.03 * idle;
    P.head.rotation.x = R * 0.2 - roar * 0.35;
    P.head.rotation.y = idle * Math.sin(now * 0.7) * 0.12;
    P.jaw.rotation.x = Math.max(roar * 0.7, R * 0.35, down * 0.3, 0.05);
    for (let i = 0; i < h.legs.length; i++) {
      const g = h.legs[i], a = (h.stride + g.off) * tau, swing = Math.sin(a), lift = Math.max(0, Math.cos(a)), u = g.u, l = g.l;
      if (g.hind) { u.rotation.x = -swing * 0.45 * run + R * 0.35; l.rotation.x = -lift * 0.5 * run - R * 0.25; continue; }
      // Reared, the forelegs reach up and out, claws high; on the swipe they come down past straight.
      u.rotation.x = -swing * 0.5 * run - R * 0.45 + down * 0.35;   // the body's pitch carries most of the reach
      u.rotation.z = (g.left ? 1 : -1) * (R * 0.35 + roar * 0.1);
      l.rotation.x = lift * 0.6 * run + R * 0.9 - down * 0.2;
    }
  }
  // The mantis: swaying on its four thin legs; its scythes open wide and scissor shut on a cut; its wings fanned in the
  // challenge.
  function poseMantis(h, dt, now) {
    const F = h.F, P = h.pivots, run = clamp01(h.speed / 3), tau = Math.PI * 2;
    h.stride = (h.stride + dt * (F.strideRate * run + 0.2)) % 1;
    const s = h.stride * tau;
    const C = h.cut !== Infinity ? h.cut / F.cutTime : 1;
    const open = C < 1 ? (C < 0.45 ? ease(C / 0.45) : 1 - ease(clamp01((C - 0.45) / 0.12))) : 0, shut = C < 1 && C >= 0.45 ? 1 - ease(clamp01((C - 0.57) / 0.43)) : 0;
    const fan = h.cry !== Infinity ? bell(h.cry / F.cryTime) : 0;
    P.body.rotation.x = Math.sin(now * 1.1) * 0.04 + open * -0.12 + shut * 0.2;
    P.body.rotation.z = Math.sin(now * 0.8) * 0.05;
    P.head.rotation.y = Math.sin(now * 0.6) * 0.25 * (1 - open);
    P.head.rotation.z = Math.sin(now * 1.7) * 0.08;
    for (let i = 0; i < h.sides.length; i++) {
      const S = h.sides[i], k = S.k;
      // Scythes: folded at rest; raised and spread on the wind-up (and the challenge); snapped down and in on the cut.
      S.au.rotation.x = -open * 1.0 + shut * 0.5 - fan * 0.9;
      S.au.rotation.z = k * (open * 0.6 - shut * 0.35 + fan * 0.4);
      S.al.rotation.x = open * 0.9 - shut * 0.6 + fan * 0.5;
      S.w.rotation.z = k * (fan * 1.1 + shut * 0.35 + open * 0.15);
      S.w.rotation.x = -fan * 0.4;
      const a1 = (h.stride + (k > 0 ? 0 : 0.25)) * tau, a2 = a1 + Math.PI;   // the middle and hind legs half a stride apart
      S.l1.rotation.x = Math.sin(a1) * 0.3 * run; S.l1.rotation.z = k * Math.max(0, Math.cos(a1)) * 0.15 * run;
      S.l2.rotation.x = Math.sin(a2) * 0.3 * run; S.l2.rotation.z = k * Math.max(0, Math.cos(a2)) * 0.15 * run;
    }
  }
  function draw() {
    const dt = effectSlots.dt(), now = effectSlots.time(), A = CONFIG.abilities.summons;
    for (const h of brutes) {
      if (!h.body) continue;
      const F = h.F, b = h.body, alive = b.alive ? b.alive() : true;
      if (alive) h.left -= dt; else h.left = Math.min(h.left, F.fade);
      if (h.left <= 0 || h.enemies !== Game.enemies) { h.body = null; h.root.visible = false; continue; }   // a new fight ends it too
      const e = foe(h, b), x0 = h.x, z0 = h.z, yaw0 = h.yaw;
      summonStep(h, e, alive ? b : null, dt);
      const moved = Math.hypot(h.x - x0, h.z - z0) / Math.max(dt, 1e-4);
      h.speed += (moved - h.speed) * (1 - Math.exp(-8 * dt));
      h.yaw = yaw0 + angDiff(h.yaw, yaw0) * (1 - Math.exp(-F.turn * dt));
      h.y += (ground(h.x, h.z, e ? e.y : b.y) - h.y) * (1 - Math.exp(-12 * dt));
      if (h.rear !== Infinity) { h.rear += dt; if (h.rear > h.rearFor + 0.4) h.rear = Infinity; }   // a landing that never came (the boss gone)
      if (h.swipe !== Infinity) { h.swipe += dt; if (h.swipe > F.swipeTime) h.swipe = Infinity; }
      if (h.cut !== Infinity) { h.cut += dt; if (h.cut > F.cutTime) h.cut = Infinity; }
      if (h.cry !== Infinity) { h.cry += dt; if (h.cry > F.cryTime) h.cry = Infinity; }
      if (h.kind === 'bear') poseBear(h, dt, now); else poseMantis(h, dt, now);
      h.root.position.set(h.x, h.y, h.z); h.root.rotation.y = h.yaw;
      // Climbing out of the floor from the feet up; going from the head down (the mantis in a shatter of glints).
      const rising = clamp01((h.time - h.left) / F.rise), fading = clamp01(h.left / F.fade), tall = (A[h.kind].height + 0.4) * F.size, u = h.shared;
      u.uFrom.value = 1; u.uCut.value = h.y - 0.1 + tall * (fading < 1 ? fading : rising < 1 ? rising : 9);
      u.uTime.value = now;
      u.uBoost.value = 1 + F.boost * Math.max(h.swipe !== Infinity ? 1 - h.swipe / F.swipeTime : 0, h.cut !== Infinity ? 1 - h.cut / F.cutTime : 0,
        h.rear !== Infinity ? 0.5 : 0, h.cry !== Infinity ? 0.6 : 0);
      h.see += (summonBeasts.see(h.x, h.z, e, F.see) - h.see) * (1 - Math.exp(-8 * dt)); u.uSee.value = h.see;
      if (fading < 1 && !h.gone) {
        h.gone = true; at.x = h.x; at.y = h.y + 1.2 * F.size; at.z = h.z;
        ultraFx.moteBurst(at, 30, F.color, { r: 0.7, speed: 1, lift: 2, life: [0.5, 1.1], up: 1 });
        if (F.shatter) ultraFx.sparkBurst(at, F.shatter, 'lunar', [0, 1, 0], 1, 1.2);
      }
      if ((h.mote -= dt) <= 0) { h.mote = F.motes; at.x = h.x; at.y = h.y + (0.3 + Math.random() * 1.4) * F.size; at.z = h.z; ultraFx.moteBurst(at, 2, F.color, MOTES); }
      h.root.visible = true;
    }
  }
  events.on('abilityPower', d => {
    if (!BRUTE_JOINTS[d.then]) return;
    if (d.land) land(d);
    else if (d.draw) cry(d);
    else if (d.strike) strike(d);
    else call(d);
  });
  function clear() { for (const h of brutes) { h.body = null; h.root.visible = false; } }
  return {
    attach() {
      if (!brutes.length) for (const k of KINDS) for (let i = 0; i < 4; i++) brutes.push(make(k));
      Game.renderHooks.push(draw); visuals.hooks.stage.push(clear);
    },
    clear, info: () => brutes.filter(h => h.body).map(h => ({ kind: h.kind, x: h.x, z: h.z, speed: h.speed, rear: h.rear !== Infinity,
      swipe: h.swipe !== Infinity, cut: h.cut !== Infinity, cry: h.cry !== Infinity, see: h.see })),
  };
})();
