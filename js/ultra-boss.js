'use strict';
// ============================================================================
// 9e. The Ultra preset, boss attacks: each boss's power drawn in its element (js/data/boss-fx.js)
// ============================================================================
// Drawing only. Built on js/ultra-fx.js (motes, sparks, drops, puffs, chunks, impact lights, flares) and
// js/ultra-post.js (shockwaves, lens pulses). For a boss (any enemy listed in BOSS_FX, or any boss at all in steel):
//   wind-up   heavy hits gather the element into the weapon (converging motes, a growing glow at the blade)
//   swing     the ribbon takes the element's colour; the blade sheds its motes, sparks and (black blade) smoke
//   rings     a ring hitbox draws an expanding ground ring in step with it, its edge throwing motes outward
//   leaps     the body trails the element through the air
//   ground    each impact kind its own: quake, shatter, holy pillar, fire blaze, blood geyser, rot bloom,
//             black void, storm gale, roar, bell toll
//   breath, sphere, bolts: embers along the flame jet, a vortex into Destined Death, element trails on projectiles
const ultraBoss = (() => {
  const U = VIS.ultra, BB = U.boss, fx = ultraFx, on = () => fx.on();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), col = new THREE.Color();
  const STEEL = FX_ELEMENTS.steel;
  let generation = 0;
  function later(fn, ms) {
    const owner = generation;
    setTimeout(() => { if (owner === generation && on()) fn(); }, ms);
  }

  // ---- what a boss looks like right now ------------------------------------------------------------------------------
  function look(e) {
    if (!e || !e.baseDef) return null;
    const spec = BOSS_FX[e.baseDef.id];
    if (!spec && !fx.isBoss(e)) return null;
    const a = spec && spec.attacks && e.attack ? spec.attacks[e.attack.id] : null;
    const name = (a && a.element) || (spec && spec.phases && spec.phases[e.phase]) || (spec ? spec.element : 'steel');
    return { spec, a, name, el: FX_ELEMENTS[name] || STEEL, scale: e.baseDef.scale || 1 };
  }
  fx.hooks.aura = e => {
    const L = look(e);
    if (!L || !L.spec) return null;
    if (L.a && L.a.aura) return L.a.aura;
    return L.spec.phases && L.spec.phases[e.phase] && L.spec.phases[e.phase] !== L.spec.element ? L.el.mote : L.spec.aura ?? L.el.mote;
  };
  fx.hooks.trail = b => { const L = look(b); return L ? [L.el.trail, U.trails.enemyBoost * BB.trailBoost] : null; };
  fx.hooks.bolt = bolt => {
    const L = look(bolt.owner);
    if (!L) return false;
    fx.moteBurst(bolt, 2, L.el.mote, { r: 0.08, speed: 0.3, lift: 0, life: [0.25, 0.5], size: 0.9, boost: 2.4, up: 0 });
    if (Math.random() < 0.4) fx.sparkBurst(bolt, 1, L.el.sparks, null, 0, 0.3);
    return true;
  };
  fx.hooks.impact = d => {
    const L = look(d.enemy);
    if (!L) return false;
    const kind = (L.a && L.a.impact) || L.el.impact;
    IMPACT[kind](d.x, d.y, d.z, d.fx.ring || 1, L, d.enemy);
    return true;
  };

  // ---- pooled shapes of our own: ground rings, light pillars, ground fires, blade glows ---------------------------------
  const ringMat = () => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 }, uWidth: { value: 0.1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity, uWidth; varying vec2 vP;
void main() {
  float r = length(vP), x = (r - 1.0) / uWidth;
  float band = exp(-x * x * 2.5) + 0.05 * smoothstep(0.0, 1.0, r) * step(r, 1.0);   // a bright edge, a faint wash inside
  float a = band * uOpacity; if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * (0.7 + 0.8 * exp(-x * x * 8.0)), a);
}` });
  const ringGeo = new THREE.PlaneGeometry(2.4, 2.4);   // the shader reads position.xy; the mesh lies flat, its edge at radius 1 (scaled)
  const rings = Array.from({ length: BB.rings }, () => {
    const m = new THREE.Mesh(ringGeo, ringMat());
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity, time: 1, r0: 0, r1: 1, width: 0.5, peak: 1 };
  });
  function groundRing(x, y, z, r0, r1, time, color, width = BB.ringWidth, peak = 1) {
    const R = rings.reduce((a, b) => b.age / b.time > a.age / a.time ? b : a);
    Object.assign(R, { age: 0, time, r0, r1, width, peak });
    R.m.position.set(x, y + 0.06, z); R.m.material.uniforms.uColor.value.set(color).multiplyScalar(1.6); R.m.visible = true;
  }
  const pillarMat = () => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uCore: { value: new THREE.Color() }, uOpacity: { value: 0 }, uTime: vTime },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uColor, uCore; uniform float uOpacity, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
  float h = vUv.y, streak = 0.75 + 0.25 * sin(vUv.x * 40.0 + h * 9.0 - uTime * 14.0);
  float a = edge * edge * streak * (1.0 - smoothstep(0.35, 1.0, h)) * smoothstep(0.0, 0.04, h) * uOpacity * 0.55;
  if (a < 0.003) discard;
  gl_FragColor = vec4(mix(uColor, uCore, edge * edge) * 1.5, a);
}` });
  const pillarGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true).translate(0, 0.5, 0);
  const pillars = Array.from({ length: BB.pillars }, () => {
    const m = new THREE.Mesh(pillarGeo, pillarMat());
    m.visible = false; m.renderOrder = 4; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity, r: 1, h: 1 };
  });
  function pillar(x, y, z, r, h, el) {
    const P = pillars.reduce((a, b) => b.age > a.age ? b : a);
    P.age = 0; P.r = r; P.h = h; P.m.position.set(x, y, z);
    P.m.material.uniforms.uColor.value.set(el.glow); P.m.material.uniforms.uCore.value.set(el.core); P.m.visible = true;
  }
  const fires = Array.from({ length: BB.fires }, () => {
    const m = new THREE.Mesh(fx.fireGeo, fx.fireMat(Math.random() * 40));
    m.visible = false; m.renderOrder = 3; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity, life: 1, size: 1 };
  });
  function groundFire(x, y, z, size, life = between(Math.random, BB.fireTime), tint = null) {
    const F = fires.reduce((a, b) => b.age / b.life > a.age / a.life ? b : a);
    F.age = 0; F.life = life; F.size = size; F.m.position.set(x, y, z); F.m.visible = true;
    const u = F.m.material.uniforms, Fc = U.fire;
    u.uW.value = 0.9; u.uH.value = 1.6;
    u.uCore.value.set(tint ? tint.core : Fc.core).multiplyScalar(Fc.boost); u.uMid.value.set(tint ? tint.glow : Fc.mid).multiplyScalar(Fc.boost * 0.8);
    u.uEdge.value.set(tint ? tint.glow : Fc.edge).multiplyScalar(Fc.boost * 0.5);
  }
  const glows = new Map(), glowPool = Array.from({ length: 6 }, () => {
    const s = glowSprite(0xffffff, 1, 1, 0, null); s.visible = false; s.renderOrder = 6; scene.add(s); pooledFx.push(s); return s;
  });

  // ---- ground impacts, one per kind ---------------------------------------------------------------------------------------
  const P = (x, y, z) => ({ x, y, z });
  const base = (x, y, z, s, L, chunks = 1) => {   // what every heavy blow on the ground does
    fx.chunkBurst(x, y, z, Math.round((5 + 4 * s) * chunks), 0.6 + 0.25 * s);
    fx.dustRing(x, y, z, Math.round(8 + 3 * s), s, U.puffs.dust, 0.8 + 0.25 * s);
    if (s >= 1.4) ultraPost.wave(P(x, y + 0.3, z), Math.min(1.7, s / 2.3), Math.min(2.2, s / 1.8));
  };
  const IMPACT = {
    quake(x, y, z, s, L) {
      base(x, y, z, s, L);
      fx.sparkBurst(P(x, y + 0.15, z), Math.round(12 * s), L.el.sparks, [0, 1, 0], 0.5, 0.8);
      fx.mark(x, y, z, L.el.glow, s * 1.8, 0.9, 0.6); fx.flashAt(P(x, y + 0.6, z), L.el.glow, 4 + 3 * s, 4 + 2 * s);
    },
    shatter(x, y, z, s, L) {   // the floor breaks: twice the stone, glowing cracks, a hard jolt
      base(x, y, z, s, L, 1.8);
      fx.sparkBurst(P(x, y + 0.15, z), Math.round(26 * s), L.el.sparks, [0, 1, 0], 0.35, 1.1);
      fx.mark(x, y, z, L.el.glow, s * 2.6, 1.6, 1); fx.flare(P(x, y + 0.4, z), L.el.core, 1.6 + s * 0.6, 0.3);
      fx.flashAt(P(x, y + 0.6, z), L.el.glow, 8 + 4 * s, 6 + 2 * s);
      groundRing(x, y, z, 0.3, s * 1.6, 0.45, L.el.glow, 0.35, 0.8);
    },
    pillar(x, y, z, s, L) {   // the light comes down: a column, a ring of gold rising, a blinding flash
      base(x, y, z, s, L, 0.6);
      const Pl = BB.pillar;
      pillar(x, y, z, Pl.radius * (0.6 + 0.3 * s), Pl.height * (0.7 + 0.15 * s), L.el);
      fx.moteBurst(P(x, y + 0.3, z), Math.round(50 + 25 * s), L.el.mote, { r: s * 0.7, speed: 2.5, lift: 3, life: [0.8, 1.8], size: 1.2, swirl: 1.5, up: 1.4 });
      fx.sparkBurst(P(x, y + 0.2, z), Math.round(30 * s), L.el.sparks, [0, 1, 0], 0.6, 1.2);
      fx.flare(P(x, y + 1, z), L.el.core, 2.4 + 0.6 * s, 0.45); fx.flashAt(P(x, y + 1.5, z), L.el.glow, 14 + 4 * s, 10 + 2 * s);
      fx.mark(x, y, z, L.el.glow, s * 2.4, 1.6, 1);
      groundRing(x, y, z, 0.2, s * 1.8, 0.55, L.el.glow, 0.4, 1);
      ultraPost.pulse({ flash: 0.06, color: L.el.core });
    },
    blaze(x, y, z, s, L) {   // a ring of fire bursts up and burns on a moment
      base(x, y, z, s, L, 0.7);
      const n = Math.round(6 + 4 * s), r = 0.6 + s * 0.55;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rand(-0.2, 0.2), rr = r * rand(0.6, 1.1); groundFire(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, rand(0.8, 1.4) * (0.7 + 0.2 * s), undefined, L.el); }
      groundFire(x, y, z, 1.6 + 0.3 * s, 1.2, L.el);
      fx.moteBurst(P(x, y + 0.3, z), Math.round(60 + 20 * s), L.el.mote, { r: r, speed: 2, lift: 3.2, life: [0.7, 1.6], size: 0.8, up: 1.3 });
      fx.sparkBurst(P(x, y + 0.2, z), Math.round(30 * s), L.el.sparks, [0, 1, 0], 0.5, 1.1);
      fx.flashAt(P(x, y + 0.8, z), L.el.glow, 14 + 4 * s, 9 + 2 * s); fx.mark(x, y, z, L.el.glow, s * 2.6, 1.8, 1);
      groundRing(x, y, z, 0.2, r * 1.6, 0.5, L.el.glow, 0.45, 0.9);
    },
    geyser(x, y, z, s, L) {   // blood erupts in columns
      base(x, y, z, s, L, 0.5);
      const n = 3 + Math.round(s);
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), rr = rand(0, s * 0.6);
        fx.bloodSpray(P(x + Math.cos(a) * rr, y + 0.1, z + Math.sin(a) * rr), [0, 2.2, 0], 22, 1.6, L.el.glow);
      }
      fx.moteBurst(P(x, y + 0.5, z), Math.round(50 + 20 * s), L.el.mote, { r: s * 0.6, speed: 2.5, lift: 1.4, life: [0.6, 1.4], size: 1.1, up: 1.2, boost: 2.6 });
      fx.flashAt(P(x, y + 1, z), L.el.glow, 12 + 4 * s, 8 + 2 * s); fx.mark(x, y, z, L.el.glow, s * 2.2, 1.6, 0.9);
      groundRing(x, y, z, 0.2, s * 1.5, 0.5, L.el.glow, 0.45, 1);
    },
    bloom(x, y, z, s, L) {   // the scarlet rot flowers: a great soft cloud of red, motes drifting out of it
      base(x, y, z, s, L, 0.4);
      for (let i = 0; i < 6 + 2 * s; i++) { const a = rand(0, Math.PI * 2), sp = rand(0.8, 2.4) * Math.sqrt(s); fx.puff(x, y + rand(0.2, 1.2), z, 0xb02414, 0.8, 2.6 + s, 1.8, [Math.cos(a) * sp, rand(0.3, 1), Math.sin(a) * sp], 0.42); }
      fx.moteBurst(P(x, y + 0.6, z), Math.round(90 + 30 * s), L.el.mote, { r: s * 0.8, speed: 2.2, lift: 0.9, life: [1.2, 2.6], size: 1.2, swirl: 0.8, up: 0.6, drag: 1.4 });
      fx.flare(P(x, y + 0.8, z), L.el.core, 2 + 0.5 * s, 0.4); fx.flashAt(P(x, y + 1, z), L.el.glow, 12 + 4 * s, 9 + 2 * s);
      fx.mark(x, y, z, L.el.glow, s * 3, 2.2, 1); groundRing(x, y, z, 0.3, s * 1.8, 0.7, L.el.glow, 0.6, 0.9);
    },
    void(x, y, z, s, L) {   // the Black Blade: black smoke, crimson sparks, a hard blast
      base(x, y, z, s, L, 1.2);
      for (let i = 0; i < 6 + 2 * s; i++) { const a = rand(0, Math.PI * 2), sp = rand(1, 3) * Math.sqrt(s); fx.puff(x, y + rand(0.2, 1), z, L.el.smoke || 0x100606, 0.6, 2.2 + s * 0.5, 1.4, [Math.cos(a) * sp, rand(0.4, 1.2), Math.sin(a) * sp], 0.6); }
      fx.sparkBurst(P(x, y + 0.3, z), Math.round(40 * s), L.el.sparks, [0, 1, 0], 0.4, 1.3);
      fx.flare(P(x, y + 0.6, z), L.el.core, 2 + 0.6 * s, 0.35); fx.flashAt(P(x, y + 1, z), L.el.glow, 14 + 5 * s, 9 + 2 * s);
      fx.mark(x, y, z, L.el.glow, s * 2.4, 1.6, 1); groundRing(x, y, z, 0.2, s * 1.7, 0.4, L.el.core, 0.35, 1);
    },
    gale(x, y, z, s, L) {   // a whirlwind tears out of the blow
      base(x, y, z, s, L, 0.8);
      fx.moteBurst(P(x, y + 0.4, z), Math.round(90 + 30 * s), L.el.mote, { r: s * 0.5, speed: 5, lift: 1.2, life: [0.6, 1.4], size: 0.8, swirl: 5, up: 0.5, drag: 1.8, boost: 1.8 });
      fx.dustRing(x, y, z, Math.round(14 + 4 * s), s * 1.4, U.puffs.dust, 1.1 + 0.2 * s);
      fx.sparkBurst(P(x, y + 0.2, z), Math.round(18 * s), L.el.sparks, null, 0, 1.2);
      groundRing(x, y, z, 0.3, s * 2, 0.5, L.el.glow, 0.5, 0.8); fx.flashAt(P(x, y + 1, z), L.el.glow, 6 + 3 * s, 8);
    },
    roar(x, y, z, s, L, e) {   // the air itself is struck: two great shockwaves and the dust of the whole arena
      const c = e ? fx.chest(e) : P(x, y + 1.5, z);
      base(x, y, z, s, L, 1.4);
      ultraPost.wave(c, 2, 2.4); later(() => ultraPost.wave(c, 1.4, 3), 140);
      fx.dustRing(x, y, z, 28, s * 1.8, U.puffs.dust, 1.6);
      groundRing(x, y, z, 0.5, s * 2.6, 0.7, L.el.glow, 0.7, 0.9);
    },
    toll(x, y, z, s, L) {   // the bell's note: rings of pale sound, one after another
      base(x, y, z, s, L, 0.5);
      for (let i = 0; i < 3; i++) later(() => groundRing(x, y, z, 0.3, s * (1.4 + i * 0.6), 0.8 + i * 0.15, L.el.glow, 0.45, 1 - i * 0.2), i * 130);
      fx.moteBurst(P(x, y + 0.5, z), 60, L.el.mote, { r: s * 0.5, speed: 3, lift: 0.6, life: [0.6, 1.4], size: 0.9 });
      ultraPost.wave(P(x, y + 1, z), 1.4, 2); fx.flashAt(P(x, y + 1, z), L.el.glow, 10, 10);
    },
  };

  // ---- attack moments -----------------------------------------------------------------------------------------------------
  const isHeavy = (L, a, h) => L.a && L.a.windup === 'none' ? false : (L.a && L.a.windup === 'gather') || (h.damage || a.damage || 0) >= BB.heavy
    || !!(h.hold || h.leap || h.sigil || (h.box || a.box || {}).ring || h.impact || a.impact);
  const when = (type, fn) => events.on(type, d => { if (!on()) return; try { fn(d); } catch (e) { warnOnce(`Ultra boss effect for "${type}" failed: ${e.message}`); } });
  const tip = (e, z, out) => { e.rig.weapon.updateWorldMatrix(true, false); return out.set(0, 0, z).applyMatrix4(e.rig.weapon.matrixWorld); };
  when('attackPhase', d => {
    const e = d.actor;
    if (d.phase !== PHASE.ACTIVE || !e || e === Game.player) return;
    const L = look(e);
    if (!L) return;
    const a = d.attack, h = a.hits[d.hitIndex] || a.hits[0], box = h.box || a.box, y = e.y;
    if (box && box.ring) {   // the ring hitbox, drawn as it spreads, its edge throwing the element outward
      const R = box.ring, t = R.time || 0.2;
      groundRing(e.x, y, e.z, R.from, R.to, t * 2.2, L.el.glow, Math.max(BB.ringWidth, (R.width || 0.5) * 0.8), 1);
      const n = fx.count('ring', Math.round(24 + R.to * 6));
      for (let i = 0; i < n; i++) {
        const ang = i / n * Math.PI * 2, sp = (R.to - R.from) / t * rand(0.5, 0.9), life = t * rand(1.2, 2);
        col.set(L.el.mote).multiplyScalar(2.4);
        fx.motes.spawn({ x: e.x + Math.sin(ang) * R.from, y: y + 0.25, z: e.z + Math.cos(ang) * R.from, vx: Math.sin(ang) * sp, vy: rand(0.4, 1.4), vz: Math.cos(ang) * sp,
                         drag: 2, lift: 0.4, life, max: life, s0: U.motes.size * 1.4, s1: U.motes.size * 0.4, r: col.r, g: col.g, b: col.b, fadeIn: 0.05 });
      }
      if (R.to >= 5) ultraPost.wave(fx.chest(e), Math.min(1.6, R.to / 7), Math.min(2.5, R.to / 4));
    }
    if (isHeavy(L, a, h) && !a.projectile) {   // a heavy swing cracks the air at its blade
      tip(e, 1.1, v1);
      fx.sparkBurst(v1, 14, L.el.sparks, null, 0, 0.9);
      fx.flare(v1, L.el.core, 1.2 * Math.sqrt(L.scale), 0.22);
      ultraPost.wave(v1, 0.35, 0.5);
    }
    const g = glows.get(e); if (g) { g.visible = false; glowPool.push(g); glows.delete(e); }
  });
  when('shot', d => { const L = look(d.enemy); if (L) { fx.moteBurst(d.bolt, 16, L.el.mote, { r: 0.1, speed: 2, lift: 0.2, life: [0.2, 0.5], size: 0.9 }); fx.flashAt(d.bolt, L.el.glow, 5, 5); } });
  when('bossLeap', d => { const L = look(d.enemy); if (L) fx.moteBurst(fx.chest(d.enemy), 40, L.el.mote, { r: d.enemy.radius, speed: 2, lift: 0.5, life: [0.5, 1], size: 1 }); });

  // ---- each frame: gathering, shedding, trails, breath, the sphere ----------------------------------------------------------
  const rate = new WeakMap();
  // Reused moteBurst options (it only reads them), so the per-frame shedding allocates no option objects.
  const SHED = { r: 0.05, speed: 0.6, lift: 0.3, life: [0.3, 0.7], size: 0.8, boost: 2.2, up: 0.2 };
  const LEAP = { r: 1, speed: 0.4, lift: 0, life: [0.4, 0.8], size: 1.1, up: 0 };
  const BREATH = { r: 0.2, speed: 1.2, lift: 2, life: [0.4, 0.9], size: 1.2, up: 1 };
  function clearEffects() {
    generation++;
    for (const g of glows.values()) { g.visible = false; glowPool.push(g); }
    glows.clear();
    for (const pool of [rings, pillars, fires]) for (const o of pool) { o.m.visible = false; o.age = Infinity; }
  }
  visuals.hooks.stage.push(clearEffects);
  visuals.hooks.quality.push(clearEffects);
  Game.renderHooks.push(game => {
    const dt = effectSlots.real();   // the shared effect clock (one step a frame when tests step by hand)
    if (!on()) return;
    for (const [e, g] of glows) if (!game.enemies.includes(e) || !e.alive()) { g.visible = false; glowPool.push(g); glows.delete(e); }
    for (const e of game.enemies) {
      if (!e.alive() || e.asleep || !e.rig.root.visible || !e.attack) continue;
      const L = look(e);
      if (!L) continue;
      const a = e.attack, h = a.hits[e.hitIndex] || a.hits[0], sc = Math.sqrt(L.scale);
      let acc = rate.get(e) || 0;
      if (e.state === ES.WINDUP && isHeavy(L, a, h)) {   // gather: motes pulled into the blade, a glow swelling on it
        const k = clamp(e.stateTime / Math.max(0.1, h.startup), 0, 1);
        tip(e, 1.0, v1);
        acc += BB.gather * dt * sc * (0.4 + k) * VIS.fxBudgets[visuals.quality().fxBudget].density;
        for (; acc >= 1; acc--) {
          const ux = rand(-1, 1), uy = rand(-0.6, 1), uz = rand(-1, 1), l = Math.hypot(ux, uy, uz) || 1, r = rand(0.9, 1.7) * L.scale * 0.8, life = rand(0.25, 0.45);
          const sx = v1.x + ux / l * r, sy = v1.y + uy / l * r, sz = v1.z + uz / l * r;
          col.set(L.el.mote).multiplyScalar(2.6);
          fx.motes.spawn({ x: sx, y: sy, z: sz, vx: (v1.x - sx) / life, vy: (v1.y - sy) / life, vz: (v1.z - sz) / life, drag: 0, lift: 0, life, max: life,
                           s0: U.motes.size * 1.1 * sc, s1: U.motes.size * 0.3, r: col.r, g: col.g, b: col.b, fadeIn: 0.3 });
        }
        let g = glows.get(e);
        if (!g && glowPool.length) { g = glowPool.pop(); glows.set(e, g); }
        if (g) { g.visible = true; g.position.copy(v1); g.material.color.set(L.el.glow).multiplyScalar(2); g.material.opacity = 0.25 + 0.65 * k; g.scale.setScalar((0.4 + k * BB.gatherGlow) * sc); }
      } else {
        const g = glows.get(e); if (g) { g.visible = false; glowPool.push(g); glows.delete(e); }
      }
      if (e.state === ES.ACTIVE || (e.state === ES.WINDUP && a.spectral)) {   // shed: the blade throws its element as it moves
        const n = e.state === ES.ACTIVE ? BB.shed : 1;
        SHED.size = 0.8 * sc;   // one options record for every shed mote (moteBurst only reads it)
        for (let i = 0; i < n; i++) {
          tip(e, rand(0.35, 1.25), v1);
          fx.moteBurst(v1, 1, L.el.mote, SHED);
        }
        if (e.state === ES.ACTIVE && Math.random() < 0.5) fx.sparkBurst(tip(e, 1.2, v1), 1, L.el.sparks, null, 0, 0.5);
        if (L.el.smoke && e.state === ES.ACTIVE && Math.random() < 0.6) fx.puff(tip(e, rand(0.4, 1.2), v1).x, v1.y, v1.z, L.el.smoke, 0.25, 0.9, 0.7, [0, 0.3, 0], 0.5);
      }
      if (e.leaping) {   // through the air, a trail of the element
        const c = fx.chest(e);
        LEAP.r = e.radius; LEAP.size = 1.1 * sc;
        fx.moteBurst(c, 3, L.el.mote, LEAP);
        if (Math.random() < 0.5) fx.sparkBurst(c, 1, L.el.sparks, [0, -1, 0], 0.5, 0.4);
      }
      if (a.breath && e.state === ES.ACTIVE) {   // flame breath: embers and smoke all along the jet
        const B = a.breath, s = Math.sin(e.yaw), c = Math.cos(e.yaw);
        for (let i = 0; i < 4; i++) {
          const t = rand(0.5, B.len), w = (Math.random() - 0.5) * B.width * (t / B.len);
          v2.set(e.x + s * t + c * w, e.y + rand(0.3, 1.6), e.z + c * t - s * w);
          fx.moteBurst(v2, 1, FX_ELEMENTS.fire.mote, BREATH);
        }
        if (Math.random() < 0.35) fx.puff(e.x + s * B.len * 0.6, e.y + 1.4, e.z + c * B.len * 0.6, U.puffs.smoke, 0.8, 2.4, 1.2, [s, 1, c], 0.35);
      }
      if (a.sphere && (e.state === ES.WINDUP || e.state === ES.ACTIVE)) {   // Destined Death: a vortex pulled into the sphere
        const S = a.sphere, cx = e.x + Math.sin(e.yaw) * S.fwd, cz = e.z + Math.cos(e.yaw) * S.fwd, cy = e.y + 1.2;
        const n = fx.count('sphere', 3);
        for (let i = 0; i < n; i++) {
          const ang = rand(0, Math.PI * 2), r = S.r * rand(0.9, 1.4), life = rand(0.4, 0.7), sx = cx + Math.cos(ang) * r, sz = cz + Math.sin(ang) * r, sy = cy + rand(-1, 1.2);
          col.set(L.el.mote).multiplyScalar(2.2);
          fx.motes.spawn({ x: sx, y: sy, z: sz, vx: (cx - sx) / life, vy: (cy - sy) / life, vz: (cz - sz) / life, drag: 0, lift: 0, life, max: life,
                           s0: U.motes.size * 1.2, s1: U.motes.size * 0.3, r: col.r, g: col.g, b: col.b, swirl: 3, cx, cz, fadeIn: 0.2 });
        }
      }
      rate.set(e, acc);
    }
    // the pooled shapes
    for (const R of rings) {
      if (!R.m.visible) continue;
      R.age += dt; const p = R.age / R.time;
      if (p >= 1) { R.m.visible = false; continue; }
      const r = lerp(R.r0, R.r1, 1 - (1 - p) * (1 - p)), u = R.m.material.uniforms;
      R.m.scale.setScalar(Math.max(0.05, r)); u.uWidth.value = R.width / Math.max(0.3, r); u.uOpacity.value = R.peak * (1 - p);
    }
    for (const Pl of pillars) {
      if (!Pl.m.visible) continue;
      Pl.age += dt; const p = Pl.age / BB.pillar.time;
      if (p >= 1) { Pl.m.visible = false; continue; }
      Pl.m.scale.set(Pl.r * (1 - 0.6 * p), Pl.h * Math.min(1, p * 6), Pl.r * (1 - 0.6 * p));
      Pl.m.material.uniforms.uOpacity.value = p < 0.1 ? 1 : (1 - p) / 0.9;
    }
    for (const F of fires) {
      if (!F.m.visible) continue;
      F.age += dt; const p = F.age / F.life;
      if (p >= 1) { F.m.visible = false; continue; }
      F.m.scale.setScalar(F.size * Math.min(1, p * 8) * (1 - p * p));
    }
  });

  return { look, groundRing, pillar, groundFire, IMPACT,
           info: () => ({ rings: rings.filter(r => r.m.visible).length, pillars: pillars.filter(p => p.m.visible).length, fires: fires.filter(f => f.m.visible).length, glows: glows.size }) };
})();
