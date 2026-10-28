'use strict';
// ============================================================================
// Procedural animation layers for modelled characters (the `anim` block in js/data/models.js)
// ============================================================================
// Runs after the base pose each frame and only ADDS to bone rotations (tables in js/data/animations.js), so attack
// timings, hitboxes and AI are untouched. Layers: breathing and idle drift, walk follow-through, attack wind-up /
// strike / recovery weight shifts, hit flinch and stagger, death collapse, and spring-driven hanging cloth.
// update() serves enemies, updatePlayer() the player; both share the layers below.
class ModelAnimator {
  constructor(rig, A) {
    this.rig = rig; this.A = A; this.walkW = 0; this.glintK = 0; this.ashT = 0; this.seed = Math.random() * 100; this.lastYaw = undefined;
    this.cloth = (A.cloth || []).map(c => ({ bone: rig.bones[c.bone], c, a: 0, va: 0, s: 0, vs: 0, seed: Math.random() * 10 }));
  }
  add(name, v, w = 1) {
    if (!v || !w) return;
    const r = this.rig.bones[name].rotation; r.x += v[0] * w; r.y += v[1] * w; r.z += v[2] * w;
  }
  // The extra pose of an attack: coil through the wind-up, drive through the strike, ease out in recovery.
  attackLayer(a, phase, p, hitIndex) {
    const S = ANIM_SECONDARY[a.anim] || ANIM_SECONDARY.default, mir = hitIndex % 2 ? -1 : 1, mul = this.A.attackMul ?? 1;
    let wk = 0, sk = 0;
    if (phase === PHASE.STARTUP) { wk = ease(clamp(p, 0, 1)); this.glintK = Math.pow(clamp((p - 0.75) / 0.25, 0, 1), 2); }   // a flash runs along the blade as the wind-up ends
    else if (phase === PHASE.ACTIVE) { const q = ease(clamp(p, 0, 1)); wk = 1 - q; sk = q; this.glintK = 1 - q; }
    else sk = 1 - ease(clamp(p, 0, 1));
    for (const bone of new Set([...Object.keys(S.windup), ...Object.keys(S.strike)])) {
      const w = S.windup[bone] || [0, 0, 0], s = S.strike[bone] || [0, 0, 0];
      this.add(bone, [w[0] * wk + s[0] * sk, (w[1] * wk + s[1] * sk) * mir, (w[2] * wk + s[2] * sk) * mir], mul);
    }
  }
  // Per-frame extras shared by enemies and the player: the weapon glint, the aura of a stronger variant, and the
  // ash that rises while a body dissolves.
  finish(actor, ctx, dt, dead) {
    const r = this.rig, g = r.glint;
    if (g) {
      const k = this.glintK * r.alphaK; g.sprite.visible = k > 0.01; g.sprite.material.opacity = k * 0.9; g.sprite.scale.setScalar(g.size * (0.6 + 0.8 * this.glintK));
    }
    this.glintK = 0;
    if (r.aura) r.aura.sprite.material.opacity = r.aura.base * r.alphaK * (0.8 + 0.2 * Math.sin(ctx.t * 2.1 + this.seed));
    if (dead && r.dissolve.value > 0.02 && r.dissolve.value < 0.98) {
      this.ashT -= dt;
      if (this.ashT <= 0) {
        this.ashT = 0.035;
        const p = particles[particleCursor++ % particles.length], root = r.root.position, s = r.root.scale.y;
        p.vx = rand(-0.25, 0.25); p.vy = rand(0.4, 1.3); p.vz = rand(-0.25, 0.25); p.gm = -0.04;
        p.life = CONFIG.fx.particleLife * rand(1.2, 2.4);
        const ember = Math.random() < 0.45;
        p.mesh.material.color.set(ember ? (this.A.ember ?? 0xff8a30) : 0x6a655e);
        p.mesh.position.set(root.x + rand(-0.35, 0.35) * s, root.y + rand(0.2, 1.7) * s, root.z + rand(-0.35, 0.35) * s); p.mesh.visible = true;
      }
    }
  }
  // Breathing and idle drift: always on, nobody stands perfectly still. w: how idle the body is (0..1).
  idleLayer(t, w) {
    const r = this.rig, I = this.A.idle;
    if (!I) return;
    const b = Math.sin(t * I.breathRate);
    r.chest.rotation.x += b * I.breath;
    r.chest.scale.set(1 + b * I.breath * 0.35, 1 + b * I.breath * 0.6, 1 + b * I.breath * 0.35);
    r.neck.rotation.x += Math.sin(t * I.breathRate * 0.5 + 1) * I.breath * 0.8;
    r.head.rotation.z += Math.sin(t * 0.43) * I.headDrift * w; r.head.rotation.x += Math.sin(t * 0.31 + 2) * I.headDrift * 0.6 * w;
    r.armL.rotation.z += (0.04 + Math.sin(t * 0.6) * I.sway) * w; r.elbowL.rotation.x -= Math.max(0, Math.sin(t * 0.77)) * I.sway * 4 * w;
    if (I.twitch) {
      const tw = Math.pow(Math.max(0, Math.sin(t * 1.9)), 14) * I.twitch * w;   // a sudden jerk of the head
      r.head.rotation.y += Math.sin(t * 23) * tw; r.neck.rotation.x -= tw * 0.6;
    }
  }
  // Walk follow-through, faded in and out with `walking`.
  walkLayer(phase, walking, dt) {
    const r = this.rig, W = this.A.walk, G = ANIM_SETTINGS;
    this.walkW += ((walking ? 1 : 0) - this.walkW) * (1 - Math.exp(-G.walkBlendRate * dt));
    if (!W || this.walkW < 0.002) return;
    const k = this.walkW, s = Math.sin(phase);
    r.chest.rotation.y += s * W.twist * k; r.chest.rotation.z += Math.cos(phase) * W.roll * k;
    r.neck.rotation.x += Math.cos(phase * 2) * W.headNod * k; r.head.rotation.y -= s * W.twist * 0.5 * k;
    r.elbowL.rotation.x -= (0.5 + 0.5 * s) * W.elbow * k; r.elbowR.rotation.x -= (0.5 - 0.5 * s) * W.elbow * 0.4 * k;
    if (W.drag) { r.kneeL.rotation.x *= 1 - W.drag * k; r.kneeR.rotation.x *= 1 - W.drag * k; }   // feet scuff along the ground
  }
  // A short hit reaction. kind: 'hurt' (arc 0..1 through it) or 'stagger' (arc and the stagger clock).
  flinchLayer(kind, arc, tt) {
    const F = this.A.flinch || {};
    if (kind === 'hurt') {
      this.add('head', [-0.7, 0, 0.2], arc * (F.head ?? 1)); this.add('neck', [-0.4, 0, 0], arc * (F.head ?? 1)); this.add('chest', [-0.35, 0, 0.1], arc * (F.chest ?? 1));
      this.add('elbowL', [-0.5, 0, 0], arc * (F.arms ?? 1)); this.add('elbowR', [0.3, 0, 0], arc * (F.arms ?? 1));
    } else {
      const wob = Math.sin(tt * 8.5);
      this.add('head', [-0.35, wob * 0.35, wob * 0.2], arc + 0.3); this.add('chest', [-0.2, 0, wob * 0.14], arc + 0.2);
      this.add('elbowL', [-0.5, 0, 0], arc * (F.arms ?? 1)); this.add('elbowR', [-0.3, 0, 0], arc * (F.arms ?? 1));
    }
  }
  // The knees give way and the body slumps while the base pose topples it.
  deathLayer(tt) {
    const r = this.rig, D = this.A.death || {}, b = ease(clamp(tt / ANIM_SETTINGS.deathBuckleTime, 0, 1)), bk = D.buckle ?? 1, sl = D.slump ?? 1;
    r.kneeL.rotation.x += 1.15 * b * bk; r.kneeR.rotation.x += 0.9 * b * bk;
    r.legL.rotation.x -= 0.5 * b * bk; r.legR.rotation.x -= 0.4 * b * bk;
    this.add('chest', [0.35, 0, 0.1], b * sl); this.add('neck', [0.35, 0, 0], b * sl); this.add('head', [0.3, 0, 0], b * sl);
    this.add('elbowL', [-0.7, 0, 0], b); this.add('elbowR', [-0.5, 0, 0], b);
  }

  // glint: as updatePlayer (a key-posed attack's own blade flash replaces the secondary attack layer).
  // clipped: an authored clip drives the body (js/glb.js); it already breathes, walks, swings and flinches, so only the
  // glint, the hit recoil, cloth and the finishing touches are added.
  update(e, tt, ctx, glint = -1, clipped = false) {   // an enemy
    const r = this.rig, st = e.state, t = ctx.t + this.seed, dt = Math.min(ctx.dt || 0, 0.1), dead = st === ES.DEAD;
    if (clipped) {
      if (glint >= 0) this.glintK = glint;
      if (e.recoil > 0) { const k = Math.sin(e.recoil * Math.PI); this.add('head', [-0.45 * e.recoilF, 0.3 * e.recoilS, 0], k); this.add('chest', [-0.2 * e.recoilF, 0, 0.12 * e.recoilS], k); }
      this.updateCloth(e, ctx, dt); this.finish(e, ctx, dt, dead);
      return;
    }
    if (!dead) this.idleLayer(t, r.idleW);
    this.walkLayer(e.walkPhase, ANIM_SETTINGS.walkStates.includes(st), dt);
    if (glint >= 0) this.glintK = glint;
    else if (e.attack && (st === ES.WINDUP || st === ES.ACTIVE || st === ES.RECOVER)) {
      const a = e.attack, h = a.hits[e.hitIndex];
      if (st === ES.WINDUP) this.attackLayer(a, PHASE.STARTUP, tt / h.startup, e.hitIndex);
      else if (st === ES.ACTIVE) this.attackLayer(a, PHASE.ACTIVE, tt / h.active, e.hitIndex);
      else this.attackLayer(a, PHASE.RECOVERY, tt / a.recovery, e.hitIndex);
    }
    if (st === ES.HURT) this.flinchLayer('hurt', Math.sin(clamp(tt / e.def.flinchTime, 0, 1) * Math.PI), tt);
    else if (st === ES.STAGGER) this.flinchLayer('stagger', Math.sin(clamp(tt / e.def.staggerTime, 0, 1) * Math.PI), tt);
    else if (st === ES.PARRIED) {
      const k = 1 - ease((tt - e.def.parriedTime * 0.6) / (e.def.parriedTime * 0.4));
      this.add('chest', [-0.35, 0, 0], k); this.add('head', [-0.5, 0, 0], k); this.add('neck', [-0.3, 0, 0], k); this.add('elbowR', [-0.3, 0, 0], k);
    } else if (st === ES.BROKEN) { this.add('neck', [0.3, 0, 0]); this.add('head', [0.3, 0, 0]); }
    if (e.recoil > 0) {   // knocked by a hit: the head and chest kick the other way
      const k = Math.sin(e.recoil * Math.PI);
      this.add('head', [-0.45 * e.recoilF, 0.3 * e.recoilS, 0], k); this.add('chest', [-0.2 * e.recoilF, 0, 0.12 * e.recoilS], k);
    }
    if (dead) this.deathLayer(tt);
    this.updateCloth(e, ctx, dt);
    this.finish(e, ctx, dt, dead);
  }

  // glint: the blade flash of a key-posed attack (js/attack-anim.js), or -1 for none. Its whole-body pose replaces
  // the secondary attack layer.
  updatePlayer(p, tt, ctx, glint = -1) {   // the player
    const st = p.state, t = ctx.t + this.seed, dt = Math.min(ctx.dt || 0, 0.1);
    if (st !== PS.DEAD) this.idleLayer(t, st === PS.IDLE ? 1 : 0.3);
    this.walkLayer(p.walkPhase, st === PS.WALK || st === PS.BLOCK, dt);
    if (glint >= 0) this.glintK = glint;
    else if (st === PS.ATTACK) { const tl = attackTimeline(p.attack, tt); this.attackLayer(p.attack, tl.phase, tl.p, tl.hitIndex); }
    else if (st === PS.JUMP_ATTACK) {
      const a = p.attack;
      if (tt < p.activeAt) this.attackLayer(a, PHASE.STARTUP, tt / a.hits[0].startup, 0); else this.attackLayer(a, PHASE.ACTIVE, (tt - p.activeAt) / 0.2, 0);
    } else if (st === PS.HURT) this.flinchLayer('hurt', Math.sin(clamp(tt / p.stunTime, 0, 1) * Math.PI), tt);
    else if (st === PS.STAGGER) this.flinchLayer('stagger', Math.sin(clamp(tt / p.stunTime, 0, 1) * Math.PI), tt);
    else if (st === PS.BLOCK) { this.add('chest', [-0.12, 0, 0]); this.add('head', [-0.08, 0, 0]); }
    else if (st === PS.PARRY) { const k = Math.sin(clamp(tt / CONFIG.parry.time, 0, 1) * Math.PI); this.add('chest', [-0.1, 0.25, 0], k); this.add('head', [0, -0.2, 0], k); }
    else if (st === PS.DEAD) this.deathLayer(tt);
    this.updateCloth(p, ctx, dt);
    this.finish(p, ctx, dt, st === PS.DEAD);
  }

  // Hanging strips: damped springs pushed by the body's movement and turning, plus a slow flutter.
  updateCloth(e, ctx, dt) {
    if (!this.cloth.length) return;
    const G = ANIM_SETTINGS, yaw = ctx.yaw ?? e.yaw, sn = Math.sin(yaw), cs = Math.cos(yaw);
    const vx = e.vx + (e.kx || 0), vz = e.vz + (e.kz || 0), fwd = vx * sn + vz * cs, side = vx * cs - vz * sn;
    // The body's own twist and bend (an attack's coil and unwind) drive the cloth like turning and moving do.
    const r = this.rig, tw = r.spin.rotation.y + r.chest.rotation.y, bend = r.chest.rotation.x + r.tip.rotation.x;
    const twistV = this.lastTwist === undefined || dt <= 0 ? 0 : (tw - this.lastTwist) / dt, bendV = this.lastBend === undefined || dt <= 0 ? 0 : (bend - this.lastBend) / dt;
    this.lastTwist = tw; this.lastBend = bend;
    const turn = (this.lastYaw === undefined || dt <= 0 ? 0 : angDiff(yaw, this.lastYaw) / dt) + twistV * G.clothTwist; this.lastYaw = yaw;
    let left = dt;
    while (left > 1e-5) {
      const h = Math.min(left, G.maxClothDt); left -= h;
      for (const c of this.cloth) {
        const K = c.c, tx = fwd * K.gain - clamp(bendV, -8, 8) * G.clothBend + Math.sin(ctx.t * 1.3 + c.seed) * K.flutter, tz = (-side * K.gain + clamp(turn, -4, 4) * 0.08) * (K.sideways ?? 1);
        c.va += (-K.k * (c.a - tx) - K.damp * c.va) * h; c.a += c.va * h;
        c.vs += (-K.k * (c.s - tz) - K.damp * c.vs) * h; c.s += c.vs * h;
      }
    }
    for (const c of this.cloth) { c.bone.rotation.x = clamp(c.a, -G.clothClamp, G.clothClamp); c.bone.rotation.z = clamp(c.s, -G.clothClamp, G.clothClamp); }
  }
}
