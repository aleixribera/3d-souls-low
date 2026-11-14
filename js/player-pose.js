'use strict';
// ============================================================================
// How the player looks moving (drawing only; PLAN.md item 3c, track A)
// ============================================================================
// Player.pose: each frame, the body's pose for its state (the key poses of attacks are js/attack-anim.js's), then the
// animator's secondary motion, the weapon's lag, the deflect's own pose, and Rig.settle, which blends one move into the
// next so nothing snaps. What each move does and when is js/player.js's; nothing here changes game state.

// The deflect's own pose (pass 91): a press snaps the blade across the body and holds it a beat; a blow turned aside
// knocks it back. Visual clocks live on the rig: `dfAge` since the last press, `clAge` since the last deflected blow.
function deflectEnvelope(age, D) {
  if (!(age >= 0)) return 0;
  if (age < D.rise) return EASE.outCubic(age / D.rise);
  if (age < D.rise + D.hold) return 1;
  return 1 - EASE.inOutSine(clamp((age - D.rise - D.hold) / D.fall, 0, 1));
}
function poseToward(r, pose, k) {
  if (!(k > 0.001)) return;
  for (const name in pose) {
    const bone = r[name] || (r.bones && r.bones[name]), v = pose[name];
    if (!bone) continue;
    bone.rotation.set(lerp(bone.rotation.x, v[0], k), lerp(bone.rotation.y, v[1], k), lerp(bone.rotation.z, v[2], k));
  }
}
function deflectPose(p, r, dt) {
  const D = ANIM_SETTINGS.deflect;
  if (r.dfLast === undefined) { r.dfLast = p.deflect; r.clBlow = p.deflectedBlow; }   // a new rig (a twin's) starts at rest
  if (p.deflect > (r.dfLast ?? 0) + 1e-6) r.dfAge = 0;                       // a fresh press arms the deflect
  else if (r.dfAge !== undefined) r.dfAge += dt;
  r.dfLast = p.deflect;
  if (p.deflectedBlow && p.deflectedBlow !== r.clBlow) { r.clBlow = p.deflectedBlow; r.clAge = 0; }   // a blow turned aside
  else if (r.clAge !== undefined) r.clAge += dt;
  if (p.state !== PS.IDLE && p.state !== PS.WALK && p.state !== PS.BLOCK) return;   // any other move takes the body (Rig.settle blends it)
  const c = deflectEnvelope(r.clAge, D.clang), k = Math.max(deflectEnvelope(r.dfAge, D), c);
  poseToward(r, D.pose, k);
  poseToward(r, D.clang.pose, c);
}

Player.prototype.pose = function (tt, ctx) {
  const r = this.rig, C = CONFIG.player;
  let glint = -1; this.chargeGlow = 0;   // set by a key-posed attack; -1 leaves the animator's own glint
  r.reset(); r.setOpacity(1);
  switch (this.state) {
    case PS.IDLE: r.spin.scale.y = 1 + Math.sin(ctx.t * 1.6) * 0.012; r.armL.rotation.z = 0.04; r.weightLean(this.vx, this.vz, ctx.yaw, ctx.dt); break;
    case PS.WALK: r.walk(this.walkPhase, 0.6); r.weightLean(this.vx, this.vz, ctx.yaw, ctx.dt); break;
    case PS.JUMP: case PS.FALL:
      r.legL.rotation.x = -0.5; r.legR.rotation.x = 0.3; r.kneeL.rotation.x = 0.9; r.kneeR.rotation.x = 0.5; r.armL.rotation.x = -0.9; r.armR.rotation.x = -0.9; break;
    case PS.ROLL: {   // the dash: a low forward lunge, blade trailing
      const p = clamp(tt / C.rollTime, 0, 1), k = Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.5) * (1 - ease(Math.max(0, p - 0.6) / 0.4));
      r.legL.rotation.x = -0.8 * k; r.kneeL.rotation.x = 0.9 * k; r.legR.rotation.x = 0.6 * k; r.kneeR.rotation.x = 0.5 * k;
      r.armL.rotation.x = 0.7 * k; r.armR.rotation.x = 0.9 * k; r.weapon.rotation.x = 0.4 * k;
      r.crouch(0.28 * k); r.lean(0.55 * k);
      break;
    }
    case PS.ATTACK: {
      const at = this.charge === 1 ? this.attackT : this.attackT + (tt - this.stateTime), ch = this.attack.charge;
      if (this.attack.pose) {   // four-phase key poses (js/attack-anim.js)
        const k = ch ? this.chargeT / ch.hold : 0;
        glint = poseAttackKeys(r, this.attack, at, k, this.chainPose, ANIM_SETTINGS.playerEase);
        if (this.charge === 1 && k >= 1) {   // full charge: the coiled body trembles and the blade glows
          const s = Math.sin(ctx.t * 55) * C.chargeTremble; r.spin.rotation.z += s; r.head.rotation.x += s * 0.6;
          this.chargeGlow = 0.45 + 0.25 * Math.sin(ctx.t * 18);
        }
        break;
      }
      const tl = attackTimeline(this.attack, at);
      poseAttack(r, this.attack, tl.phase, tl.p, tl.hitIndex);
      break;
    }
    case PS.JUMP_ATTACK: {
      const a = this.attack;
      if (tt < this.activeAt) poseAttack(r, a, PHASE.STARTUP, tt / a.hits[0].startup);   // wind-up in the air
      else poseAttack(r, a, PHASE.ACTIVE, ease((tt - this.activeAt) / 0.2));            // driving down
      r.legL.rotation.x += -0.7; r.kneeL.rotation.x = 1.1; r.legR.rotation.x += 0.15; r.kneeR.rotation.x = 0.9;
      break;
    }
    case PS.LAND: {
      const k = 1 - ease(tt / Math.max(this.landTime, 0.01));
      poseAttack(r, this.attack, PHASE.ACTIVE, 1);
      r.crouch(0.08 + 0.3 * k); r.lean(0.3 * k);
      break;
    }
    case PS.BLOCK:
      r.walk(this.walkPhase, 0.3 * clamp(Math.hypot(this.vx, this.vz) / 2, 0, 1));   // short guarded steps
      r.armR.rotation.set(-1.45, 0, -0.5); r.weapon.rotation.set(0.2, 0, 1.2); r.armL.rotation.x = -1.3; r.tip.rotation.x = 0.06; break;
    case PS.USE_ITEM: {   // drinking on the move: the legs walk, the off hand lifts the flask
      r.walk(this.walkPhase, 0.4 * clamp(Math.hypot(this.vx, this.vz) / 2, 0, 1));
      const k = Math.sin(clamp(tt * this.drinkRate() / this.usingItem.useTime, 0, 1) * Math.PI);
      r.armL.rotation.set(-2.3 * k, 0, -0.5 * k); r.head.rotation.x = -0.4 * k; break;
    }
    case PS.REST: {
      const k = Math.sin(clamp(tt / CONFIG.rest.time, 0, 1) * Math.PI);
      r.kneel(k); r.lean(0.2 * k); r.head.rotation.x = 0.4 * k; break;
    }
    case PS.EXECUTE: glint = executePose(r, this, this.attackT + (tt - this.stateTime)); break;   // js/execution.js
    case PS.HURT: case PS.STAGGER: flinchPose(r, this.state === PS.STAGGER, tt / this.stunTime, tt, this.hitK || 1); break;
    case PS.DEAD: deathPose(r, tt, C.deathFade); break;
    case PS.HELD: {   // in a giant's fist: legs kicking, both hands pushing at the grip, head thrown back
      const k = Math.min(1, tt / 0.25), w = Math.sin(tt * 9), v = Math.sin(tt * 7 + 1.3);
      r.spin.rotation.x = -0.25 * k; if (r.chest) r.chest.rotation.x = -0.2 * k; r.head.rotation.x = -0.45 * k + 0.08 * w;
      r.armL.rotation.set((-1.9 + 0.35 * v) * k, 0, 0.35 * k); r.armR.rotation.set((-1.7 - 0.35 * v) * k, 0, -0.35 * k);
      if (r.elbowL) { r.elbowL.rotation.x = -0.9 * k; r.elbowR.rotation.x = -1.0 * k; }
      r.legL.rotation.x = (0.25 + 0.45 * w) * k; r.legR.rotation.x = (0.25 - 0.45 * w) * k;
      if (r.kneeL) { r.kneeL.rotation.x = (0.6 + 0.4 * v) * k; r.kneeR.rotation.x = (0.6 - 0.4 * v) * k; }
      break;
    }
  }
  if (this.brace > 0) { r.crouch(0.12 * this.brace); r.tip.rotation.x -= 0.14 * this.brace; }
  if (r.anim) r.anim.updatePlayer(this, tt, ctx, glint, true);   // a modelled body's secondary motion (js/animator.js), visual only
  r.applyLag(ctx.yaw, Math.hypot(this.vx, this.vz), ctx.dt);
  deflectPose(this, r, Game.hitstop > 0 ? 0 : Math.min(ctx.dt || 0, 0.1));
  // One move into the next without a snap (a chained swing is its own move); a body back from the dead starts clean.
  r.settle(this.state, this.state === PS.ATTACK || this.state === PS.EXECUTE ? this.attack : null, tt, r.settleKey !== PS.DEAD);
  if (r.anim) r.anim.finishPlayer(this, ctx);   // the cloth swings from the blended body, not the snapped one
  if (this.state === PS.JUMP_ATTACK && !this.hitbox) r.setWarning(1);   // same telegraph colour as enemy wind-ups
  else r.setFlash(Math.max(this.flash, this.riposte > 0 ? 0.3 : 0, this.chargeGlow));
  r.setTint(HURT_COLOR, this.tint * 0.9);
};
