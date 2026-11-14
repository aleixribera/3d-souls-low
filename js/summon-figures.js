'use strict';
// ============================================================================
// The Stone Guardian and the Lancer of Ash, drawn (pass 62): drawing only. The summons themselves (where they stand,
// their blows, the boss they draw) are the engine's (js/abilities.js); this listens to their `abilityPower` events, the
// server's for everyone online.
// ============================================================================
// Each is its own Blender model (the kind's `model`: the guardian since pass 78, tools/blender/guardian.py; the lancer
// since pass 80, tools/blender/lancer_of_ash.py), each of its material slots in its own colour of the summon's shader
// (`slots`) and its `glows` lit. Each strikes with its own `moves` (pass 81; before it, an enemy's attack), taken in turn
// by the blow's number, so online every client draws the same one: the wind-up played before each blow the engine
// lands, its key poses on the summon's own clock, then the strike, the impact (`impact`) and the recovery. The guard
// pose fades out through the wind-up and back in through the recovery, so nothing snaps.
// The guardian is lit stone with a cold glowing rim: it rises out of the floor where it will stand (`floor`), holds its
// shield up, and raises its sword in a challenge as it draws the boss. The lancer is ash and charred plate with cinders of
// violet light in it: it forms from the feet up at its holder's side, a glowing seam climbing it, charges the boss, and
// thrusts. Both crumble or burn away from the head down. Four of each in the pool (one a player), made at attach and
// warmed like the rest; nothing allocated per frame.
const summonFigures = (() => {
  const KINDS = ['guardian', 'lancer'], pool = [];
  const vertex = `
    #include <common>
    #include <skinning_pars_vertex>
    varying vec3 vN; varying vec3 vV; varying float vY; varying vec2 vUv;
    void main() {
      vUv = uv;
      #include <skinbase_vertex>
      #include <beginnormal_vertex>
      #include <skinnormal_vertex>
      #include <begin_vertex>
      #include <skinning_vertex>
      vec4 world = modelMatrix * vec4(transformed, 1.0), mv = viewMatrix * world;
      vN = normalize(normalMatrix * objectNormal); vV = -mv.xyz; vY = world.y;
      gl_Position = projectionMatrix * mv;
    }`;
  // uSolid 1: lit stone under a glowing rim; 0: a ghost of light, bright at its edges. The part past the cut (above it,
  // uFrom 1; below it, uFrom -1) isn't there, and the line it is cut at glows. uGlow 1: a slot of light (a rune, an eye).
  // uMap: the model's own texture for that slot (its carving and cracks), its brightness only; uHasMap 0 for none.
  const fragment = `
    uniform vec3 uColor; uniform vec3 uCore; uniform vec3 uStone; uniform float uSolid; uniform float uOpacity; uniform float uCut;
    uniform float uFrom; uniform float uTime; uniform float uBoost; uniform float uRim; uniform float uBody; uniform float uFlicker;
    uniform float uGlow; uniform sampler2D uMap; uniform float uHasMap;
    varying vec3 vN; varying vec3 vV; varying float vY; varying vec2 vUv;
    void main() {
      float edge = (vY - uCut) * uFrom;
      if (edge > 0.0) discard;
      vec3 n = normalize(vN);
      float rim = pow(1.0 - abs(dot(n, normalize(vV))), 2.2);
      float flick = 1.0 + uFlicker * sin(uTime * 11.0 + vY * 13.0) * sin(uTime * 6.1 - vY * 5.3);
      float seam = smoothstep(-0.18, 0.0, edge);
      if (uSolid > 0.5) {
        float lit = 0.3 + 0.7 * max(dot(n, normalize(vec3(0.35, 0.85, 0.4))), 0.0);
        float tone = mix(1.0, 2.2 * dot(texture2D(uMap, vUv).rgb, vec3(0.3, 0.59, 0.11)), uHasMap);
        vec3 c = uStone * lit * tone + mix(uColor, uCore, seam) * (pow(rim, 1.6) * uRim + seam * 1.6) * flick * uBoost;
        c = mix(c, mix(uColor, uCore, 0.6) * (1.3 + 0.5 * rim) * flick * uBoost, uGlow);
        gl_FragColor = vec4(c, 1.0);
      } else {
        vec3 c = mix(uColor, uCore, rim * 0.55 + seam) * (uBody + rim * uRim) * flick * uBoost;
        gl_FragColor = vec4(c, uOpacity * (0.3 + 0.7 * rim + seam));
      }
    }`;
  // One material per slot colour: `shared` holds the uniforms every slot of one summon moves together (the cut, the rise,
  // the strike's glow), so drawing sets them once.
  function material(F, shared, stone, glow, map = null) {
    return new THREE.ShaderMaterial({
      uniforms: { ...shared, uStone: { value: new THREE.Color(stone) }, uGlow: { value: glow ? 1 : 0 }, uMap: { value: map }, uHasMap: { value: map ? 1 : 0 } },
      vertexShader: vertex, fragmentShader: fragment, transparent: !F.solid, depthWrite: !!F.solid,
      blending: F.solid ? THREE.NormalBlending : THREE.AdditiveBlending });
  }
  function make(kind) {
    const F = VIS.abilityFx[kind];
    const rig = new Rig({ scale: F.scale, bulk: F.bulk ?? 1, model: F.model });
    const shared = { uColor: { value: new THREE.Color(F.color) }, uCore: { value: new THREE.Color(F.core) }, uSolid: { value: F.solid ? 1 : 0 },
      uOpacity: { value: 0 }, uCut: { value: 0 }, uFrom: { value: 1 }, uTime: { value: 0 }, uBoost: { value: 1 }, uRim: { value: F.rim },
      uBody: { value: F.body }, uFlicker: { value: F.flicker } };
    const mat = material(F, shared, F.stone ?? 0, false), bySlot = new Map();   // each mesh of a model: its slot's material
    if (F.slots) for (const meshes of [rig.slotMeshes, rig.weaponSlotMeshes]) for (const slot in meshes || {}) {
      const glow = (F.glows || []).includes(slot), own = meshes[slot].material;
      bySlot.set(meshes[slot], material(F, shared, glow ? 0 : F.slots[slot], glow, !glow && own && own.map || null));
    }
    rig.root.traverse(o => {
      o.userData.warmUp = true;
      if (o.isMesh) { o.material = bySlot.get(o) || mat; o.castShadow = !!F.solid; o.receiveShadow = false; o.renderOrder = F.solid ? 0 : 2; }
      else if (o.isSprite || o.isPoints) o.visible = false;   // a glint, an aura, embers: not on a summon
    });
    rig.root.visible = rig.shadow.visible = false;
    return { kind, F, rig, mat, moves: F.moves.map(timed), m: null, n: 0, mn: 0, landed: true, hop: 0,
      body: null, enemy: null, enemies: null, x: 0, y: 0, z: 0, yaw: 0, left: 0, time: 1, every: 1, speed: 0, phase: 0,
      ac: Infinity, rate: 1, next: Infinity, cry: Infinity, boost: 0, mote: 0, gone: false, guarded: Object.keys(F.guard).length > 0 };
  }
  // A move with its timeline's marks: where the blow starts (`activeAt`), where it ends (`strikeEnd`) and its last moment.
  function timed(a) {
    const activeAt = phaseSpan(a, 'active', 0)[0], last = a.hits.length - 1;
    return { a, activeAt, strikeEnd: phaseSpan(a, 'follow', last)[0], end: phaseSpan(a, 'recovery', last)[0] + a.recovery };
  }
  const moveFor = (f, n) => f.moves[(Math.max(1, n) - 1) % f.moves.length];   // blow n's move: in turn, the same for everyone
  // How much of the guard pose shows: all of it at rest, none from the end of the wind-up to the end of the follow-through.
  function guardWeight(f) {
    if (f.ac === Infinity) return 1;
    const M = f.m;
    if (f.ac < M.activeAt) return 1 - ease(f.ac / M.activeAt);
    if (f.ac < M.strikeEnd) return 0;
    return ease((f.ac - M.strikeEnd) / Math.max(1e-3, M.end - M.strikeEnd));
  }
  // A leap's height at this point of the move: up through the wind-up, down through the strike.
  function hopAt(f) {
    const M = f.m, h = M && M.a.hop;
    if (!h || f.ac === Infinity) return 0;
    if (f.ac < M.activeAt) return h * Math.sin(Math.PI / 2 * ease(f.ac / M.activeAt));
    const p = (f.ac - M.activeAt) / Math.max(1e-3, M.a.hits[0].active);
    return p >= 1 ? 0 : h * (1 - p * p);
  }
  const at = { x: 0, y: 0, z: 0 };
  const near = (x, z) => Game.player && Math.hypot(Game.player.x - x, Game.player.z - z) < VIS.abilityFx.near;
  const light = (p, color, k, range) => effectLighting.flash(p, color, k * (reducedMotion() ? 0.5 : 1), range);
  function ground(x, z, y) { const g = world.groundAt(x, z, y + 0.5); return Number.isFinite(g) ? g : y; }
  const mine = d => pool.find(f => f.kind === d.then && f.body && f.body === d.body);
  // The enemy it fights: the one it was called on while it lives, else the nearest live one to its holder.
  function foe(f, b) {
    if (f.enemy && f.enemy.alive() && Game.enemies.includes(f.enemy)) return f.enemy;
    let best = CONFIG.abilities.summons.near, e = null;
    for (const o of Game.enemies) if (o.alive()) { const dd = Math.hypot(o.x - b.x, o.z - b.z); if (dd < best) { best = dd; e = o; } }
    return (f.enemy = e);
  }
  function call(d) {
    let f = mine(d);
    const F = VIS.abilityFx[d.then], K = CONFIG.abilities.summons[d.then], renew = !!f && f.left > F.fade;   // one fading away comes again fresh, as the engine's does
    f = f || pool.find(q => q.kind === d.then && !q.body) || pool.filter(q => q.kind === d.then).reduce((p, q) => (p.left < q.left ? p : q));
    f.body = d.body; f.enemy = d.enemy || null; f.left = d.v.time; f.every = d.v.every; f.enemies = Game.enemies;
    if (renew) { f.time = d.v.time + F.rise; f.gone = false; return; }   // up already: it stays up
    f.time = d.v.time; f.gone = false; f.ac = f.cry = f.next = Infinity; f.speed = 0; f.boost = 0; f.m = null; f.n = f.mn = 0; f.landed = true; f.hop = 0;
    const from = d.body || d;
    f.x = from.x; f.z = from.z; f.yaw = d.body ? d.body.yaw || 0 : 0;
    if (K.rises) summonStep(f, foe(f, from), d.body, 60);   // it comes up where it will stand
    f.y = ground(f.x, f.z, from.y);
    at.x = f.x; at.y = f.y + 0.5; at.z = f.z;
    groundFx.ring(f.x, f.z, F.solid ? 2.2 : 1.5, F.color, 0.8, f.y); spawnBurst(at, F.burst);
    if (F.solid) ultraFx.sparkBurst(at, 22, 'ember', [0, 1, 0], 0.7, 0.8);
    ultraFx.moteBurst(at, 36, F.color, { r: 0.6, speed: 0.9, lift: 2, life: [0.6, 1.3], up: 1 }); light(at, F.color, 8, 10);
    if (near(f.x, f.z)) Game.addShake(F.shake[0], F.shake[1]);
  }
  // A blow lands (the engine's `strike`, its number n): its move's wind-up, if it wasn't already under way for this blow,
  // is caught up in `catchUp` s, and the blow is drawn as the strike begins.
  const CATCH_UP = 0.1, HOLD = 0.25;
  function strike(d) {
    const f = mine(d);
    if (!f) return;
    const off = Math.hypot(d.x - f.x, d.z - f.z);
    if (off > 2.5) { f.x = d.x; f.z = d.z; }   // the engine's place, at once if it is far off
    if (d.enemy) f.enemy = d.enemy;
    f.n = d.strike || f.n + 1; f.next = f.every;
    if (f.mn === f.n && f.ac !== Infinity && f.ac < f.m.strikeEnd) {   // this blow's move is under way
      if (f.ac < f.m.activeAt) f.rate = Math.max(1, (f.m.activeAt - f.ac) / CATCH_UP);
      return;
    }
    f.m = moveFor(f, f.n); f.mn = f.n; f.ac = 0; f.landed = false; f.rate = f.m.activeAt / CATCH_UP;
  }
  // The blow meets the enemy as the strike begins: a flash where it lands on the enemy's side facing it, and the move's
  // impact on the floor before the summon.
  function land(f) {
    f.landed = true; f.boost = 1;
    const e = f.enemy, F = f.F, I = f.m.a.impact;
    if (I) {
      const s = Math.sin(f.yaw), c = Math.cos(f.yaw), x = f.x + s * I.ahead, z = f.z + c * I.ahead, y = ground(x, z, f.y);
      groundFx.spawn(x, z, I, y); groundFx.ring(x, z, I.ring * 0.7, F.color, 0.6, y);
      if (I.chunks) ultraFx.chunkBurst(x, y, z, I.chunks, 0.8);
      at.x = x; at.y = y + 0.2; at.z = z; light(at, F.color, 5, 7);
      if (I.shake && near(f.x, f.z)) Game.addShake(F.shake[0] * I.shake, F.shake[1] * I.shake);
    }
    if (!e || !e.alive()) return;
    const dx = f.x - e.x, dz = f.z - e.z, l = Math.hypot(dx, dz) || 1, r = (e.radius || 1) * 0.85;
    at.x = e.x + dx / l * r; at.y = e.y + Math.min(1.2, (e.height || 1.8) * 0.5); at.z = e.z + dz / l * r;
    ultraFx.sparkBurst(at, 14, 'ember', [dx / l, 0.3, dz / l], 0.5, 0.8);
    ultraFx.moteBurst(at, 10, F.color, { r: 0.2, speed: 2, lift: 0.5, life: [0.3, 0.6] });
    spawnBurst(at, F.hitBurst); light(at, F.color, 4, 6);
  }
  // It draws the boss's eye: its challenge pose, a ring round its feet and a flare at its chest.
  function cry(d) {
    const f = mine(d);
    if (!f) return;
    f.cry = 0; f.boost = 1.4; if (d.enemy) f.enemy = d.enemy;
    const F = f.F;
    at.x = f.x; at.y = f.y + 1.4; at.z = f.z;
    groundFx.ring(f.x, f.z, 2.8, F.color, 0.75, f.y); ultraFx.flare(at, F.color, 2.2);
    ultraFx.moteBurst(at, 24, F.color, { r: 0.4, speed: 1.4, lift: 2, life: [0.5, 1.1], up: 1 }); light(at, F.color, 6, 9);
    if (F.solid && near(f.x, f.z)) Game.addShake(F.shake[0] * 0.6, F.shake[1] * 0.6);
  }
  const MOTES = { r: 0.35, speed: 0.4, lift: 1.4, life: [0.4, 0.9], up: 1, size: 0.8 };
  function pose(f, dt, now) {
    const r = f.rig, F = f.F, run = clamp01(f.speed / 4);
    // The next blow's wind-up starts its own length before the blow is due, once the last move is in its recovery. It
    // holds at the end of the wind-up until the engine lands the blow (a whiff if that is `HOLD` s overdue). None while
    // it is going, or with no enemy left to strike.
    if ((f.ac === Infinity || f.ac >= f.m.strikeEnd) && f.mn <= f.n && f.next <= moveFor(f, f.n + 1).activeAt && f.next > 0.05
      && f.left > f.next + F.fade && f.enemy && f.enemy.alive()) {
      f.m = moveFor(f, f.n + 1); f.mn = f.n + 1; f.ac = Math.max(0, f.m.activeAt - f.next); f.rate = 1; f.landed = false;
    }
    if (f.ac !== Infinity) {
      const M = f.m, due = f.mn <= f.n;
      f.ac += dt * (f.ac < M.activeAt ? f.rate : 1);
      if (!due && f.ac >= M.activeAt && f.next > -HOLD) f.ac = M.activeAt - 1e-4;
      if (due && !f.landed && f.ac >= M.activeAt) land(f);
      if (f.ac >= M.end) f.ac = Infinity;
    }
    // Its stance (walking, or its idle and guard) gives way to a move as the wind-up builds and comes back in the recovery.
    const w = guardWeight(f);
    r.reset();
    if (run > 0.05) { f.phase += dt * (4 + f.speed * 1.2); r.walk(f.phase, 0.55 * run * w); }
    else lookup(IDLE_STYLES, F.idle || 'none', 'idle style', 'none')(r, now * 0.9 + f.x, w);
    if (f.ac !== Infinity) poseAttackKeys(r, f.m.a, f.ac);
    f.hop = hopAt(f);
    if (f.guarded) applyKeyPose(r, F.guard, w);
    if (f.cry !== Infinity) {
      f.cry += dt;
      if (f.cry > F.cryTime) f.cry = Infinity; else applyKeyPose(r, F.cry, Math.sin(Math.PI * Math.min(1, f.cry / F.cryTime)));
    }
    if (r.grip) r.holdHaft(1);
  }
  function draw() {
    const dt = effectSlots.dt(), now = effectSlots.time(), A = CONFIG.abilities.summons;
    for (const f of pool) {
      if (!f.body) continue;
      const b = f.body, alive = b.alive ? b.alive() : true, F = f.F, K = A[f.kind];
      if (alive) f.left -= dt; else f.left = Math.min(f.left, F.fade);
      if (f.left <= 0 || f.enemies !== Game.enemies) { f.body = null; f.rig.root.visible = f.rig.shadow.visible = false; continue; }   // a new fight ends it too
      const e = foe(f, b), x0 = f.x, z0 = f.z, yaw0 = f.yaw;
      if (K.rises || f.time - f.left > A.arrive * 0.5) summonStep(f, e, alive ? b : null, dt);   // a runner climbs out first
      const moved = Math.hypot(f.x - x0, f.z - z0) / Math.max(dt, 1e-4);
      f.speed += (moved - f.speed) * (1 - Math.exp(-8 * dt));
      f.yaw = yaw0 + angDiff(f.yaw, yaw0) * (1 - Math.exp(-F.turn * dt));
      f.y += (ground(f.x, f.z, e ? e.y : b.y) - f.y) * (1 - Math.exp(-12 * dt));
      f.next -= dt;
      f.boost = Math.max(0, f.boost - dt / F.strikeGlow);
      pose(f, dt, now);
      const rising = clamp01((f.time - f.left) / F.rise), fading = clamp01(f.left / F.fade), tall = K.height + 0.3, u = f.mat.uniforms;
      let lift = 0;
      if (fading < 1) { u.uFrom.value = 1; u.uCut.value = f.y - 0.1 + (tall + 0.4) * fading; }   // crumbling or burning away from the head down
      else if (F.floor) { lift = -tall * (1 - rising) * (1 - rising); u.uFrom.value = -1; u.uCut.value = f.y; }   // stone rises out of the floor
      else { u.uFrom.value = 1; u.uCut.value = rising < 1 ? f.y - 0.1 + (tall + 0.4) * rising : f.y + 99; }   // it forms from the feet up (a crest or a raised spear over its height too)
      u.uOpacity.value = 0.92 * Math.min(1, rising * 3); u.uTime.value = now; u.uBoost.value = 1 + f.boost * F.strikeBoost;
      if (fading < 1 && !f.gone) { f.gone = true; at.x = f.x; at.y = f.y + 1; at.z = f.z; spawnBurst(at, F.burst); ultraFx.moteBurst(at, 30, F.color, { r: 0.5, speed: 0.9, lift: 2, life: [0.5, 1.1], up: 1 }); }
      if ((f.mote -= dt) <= 0) { f.mote = F.motes; at.x = f.x; at.y = f.y + 0.3 + Math.random() * K.height * 0.8; at.z = f.z; ultraFx.moteBurst(at, 2, F.color, MOTES); }
      const r = f.rig;
      r.place(f.x, f.y + lift + f.hop, f.z, f.yaw, F.solid && fading >= 1 ? f.y : -Infinity);
      r.warnGlow.visible = false; if (r.tellGlows) for (const n in r.tellGlows) r.tellGlows[n].visible = false;
      r.root.visible = true;
    }
  }
  events.on('abilityPower', d => {
    if (!KINDS.includes(d.then)) return;
    if (d.draw) cry(d);
    else if (d.strike) strike(d);
    else call(d);
  });
  function clear() { for (const f of pool) { f.body = null; f.rig.root.visible = f.rig.shadow.visible = false; } }
  return {
    attach() { if (!pool.length) for (const k of KINDS) for (let i = 0; i < 4; i++) pool.push(make(k)); Game.renderHooks.push(draw); visuals.hooks.stage.push(clear); },
    // The model lab's view (js/model-lab.js): `kind`'s move i, t s into it (past its end, standing guard). Returns its hop.
    poseAt(r, kind, i, t, now) {
      const F = VIS.abilityFx[kind], m = timed(F.moves[i]), f = { F, m, ac: t < m.end ? t : Infinity };
      const w = guardWeight(f);
      r.reset(); lookup(IDLE_STYLES, F.idle || 'none', 'idle style', 'none')(r, now * 0.9, w);
      if (f.ac !== Infinity) poseAttackKeys(r, m.a, f.ac);
      if (Object.keys(F.guard).length) applyKeyPose(r, F.guard, w);
      return hopAt(f);
    },
    clear, info: () => pool.filter(f => f.body).map(f => ({ kind: f.kind, x: f.x, z: f.z, speed: f.speed, striking: f.ac !== Infinity, move: f.ac !== Infinity ? f.m.a.pose : null, n: f.n, hop: f.hop, cry: f.cry !== Infinity })),
  };
})();
