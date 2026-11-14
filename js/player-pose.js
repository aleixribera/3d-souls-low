'use strict';
// ============================================================================
// How the player looks moving (drawing only; PLAN.md item 3c, track A)
// ============================================================================
// Player.pose: each frame, the body's pose for its state (the key poses of attacks are js/attack-anim.js's), then the
// animator's secondary motion, the weapon's lag, the deflect's own pose, and Rig.settle, which blends one move into the
// next so nothing snaps. What each move does and when is js/player.js's; nothing here changes game state.

// The deflect's own pose (pass 91; the whole body since pass 92): a press snaps the blade across the body, the hips
// drop into a braced stance and hold it a beat; a blow turned aside rocks the body back, a foot steps out and the free
// arm flares. Visual clocks live on the rig: `dfAge` since the last press, `clAge` since the last deflected blow.
// A key pose's weight at `age` s: snapped in over `rise`, held `hold`, let go over `fall` (s).
function deflectEnvelope(age, D) {
  if (!(age >= 0)) return 0;
  if (age < D.rise) return EASE.outCubic(age / D.rise);
  if (age < D.rise + D.hold) return 1;
  return 1 - EASE.inOutSine(clamp((age - D.rise - D.hold) / D.fall, 0, 1));
}
// The dash (pass 101; hand-set key poses on the hip and knee joints until pass 99): a clip authored in Blender
// (ANIM_SETTINGS.dash.clip, js/baked/clips.js), played over the dash's length. `u` is the share of the dash gone.
function dashPose(r, tt, rollTime) { playClip(r, CLIPS[ANIM_SETTINGS.dash.clip], clamp(tt / rollTime, 0, 1)); }
// A baked clip at `u` (0 to 1) of its length: each bone's local turn, eased between the two nearest frames, and the hips
// moved by the clip's offset (a lower body bends from there for a later crouch() this frame). Allocates nothing.
const CLIP_QA = new THREE.Quaternion(), CLIP_QB = new THREE.Quaternion();
function playClip(r, C, u) {
  const names = C.names || (C.names = Object.keys(C.bones));
  const x = u * (C.frames - 1), i = Math.min(Math.floor(x), C.frames - 2), s = x - i;
  for (let n = 0; n < names.length; n++) {
    const bone = r[names[n]] || (r.bones && r.bones[names[n]]), q = C.bones[names[n]], a = i * 4;
    if (!bone) continue;
    CLIP_QA.set(q[a], q[a + 1], q[a + 2], q[a + 3]); CLIP_QB.set(q[a + 4], q[a + 5], q[a + 6], q[a + 7]);
    bone.quaternion.copy(CLIP_QA).slerp(CLIP_QB, s);
  }
  const h = C.hip, a = i * 3, dy = lerp(h[a + 1], h[a + 4], s);
  r.spin.position.x += lerp(h[a], h[a + 3], s); r.spin.position.y += dy; r.spin.position.z += lerp(h[a + 2], h[a + 5], s);
  r.crouchDrop += Math.max(0, -dy);
}
// A landing with weight (pass 92): the knees give under the fall and come back up (visual clock `ldAge` on the rig).
function landPose(p, r, dt) {
  const L = ANIM_SETTINGS.land, air = p.state === PS.JUMP || p.state === PS.FALL || p.state === PS.JUMP_ATTACK;
  if (air) { r.ldVy = Math.min(r.ldVy ?? 0, p.vy); r.ldAge = undefined; return; }
  if (r.ldVy !== undefined && r.ldVy < 0) { r.ldK = p.state === PS.LAND ? 0 : clamp(-r.ldVy / L.ref, L.min, 1); r.ldAge = 0; }   // a jump attack's landing has its own pose
  else if (r.ldAge !== undefined) r.ldAge += dt;
  r.ldVy = undefined;
  if (p.state !== PS.IDLE && p.state !== PS.WALK && p.state !== PS.BLOCK) return;
  const k = deflectEnvelope(r.ldAge, L) * (r.ldK || 0);
  if (k > 0.001) { r.crouch(L.drop * k); r.lean(L.lean * k); r.head.rotation.x -= L.lean * 0.6 * k; }
}
function poseToward(r, pose, k) {
  if (!(k > 0.001)) return;
  for (const name in pose) {
    const bone = r[name] || (r.bones && r.bones[name]), v = pose[name];
    if (!bone) continue;
    bone.rotation.set(lerp(bone.rotation.x, v[0], k), lerp(bone.rotation.y, v[1], k), lerp(bone.rotation.z, v[2], k));
  }
}
function deflectPose(p, r, dt, yaw) {
  const D = ANIM_SETTINGS.deflect;
  if (r.dfLast === undefined) { r.dfLast = p.deflect; r.clBlow = p.deflectedBlow; }   // a new rig (a twin's) starts at rest
  if (p.deflect > (r.dfLast ?? 0) + 1e-6) r.dfAge = 0;                       // a fresh press arms the deflect
  else if (r.dfAge !== undefined) r.dfAge += dt;
  r.dfLast = p.deflect;
  const R = D.clang.rebound;
  if (p.deflectedBlow && p.deflectedBlow !== r.clBlow) {   // a blow turned aside; one still rebounding fades out under it
    r.rbFrom = r.clAge === undefined ? 0 : deflectEnvelope(r.clAge - R.delay, R); r.clBlow = p.deflectedBlow; r.clAge = 0;
  }
  else if (r.clAge !== undefined) r.clAge += dt;
  if (p.state !== PS.IDLE && p.state !== PS.WALK && p.state !== PS.BLOCK) return;   // any other move takes the body (Rig.settle blends it)
  const c = deflectEnvelope(r.clAge, D.clang), k = Math.max(deflectEnvelope(r.dfAge, D), c);
  // Pass 99 (a fresh judge: "the body below the arms never reacts"): after the blow kicks blade and shoulders back, the
  // body rebounds into it, chest over the blade and the hips held in a braced crouch, then settles.
  const b = r.clAge === undefined ? 0 : Math.max(deflectEnvelope(r.clAge - R.delay, R), (r.rbFrom || 0) * clamp(1 - r.clAge / R.delay, 0, 1));
  poseToward(r, D.pose, k);
  poseToward(r, D.clang.pose, c);
  poseToward(r, R.pose, b);
  if (k > 0.001 || b > 0.001) r.crouch(lerp(D.drop, D.clang.drop, c) * k + R.drop * b);   // the hips drop with it; the feet stay planted
  if (c > 0.001) {   // a blow turned aside: the whole body steps off its line (to its left and back), then back in
    const side = D.clang.step[0] * c, back = D.clang.step[1] * c, sy = Math.sin(yaw), cy = Math.cos(yaw);
    const dx = cy * side - sy * back, dz = -sy * side - cy * back;   // drawing only: Rig.place puts the root back next frame
    r.root.position.x += dx; r.root.position.z += dz;
    if (r.shadow) { r.shadow.position.x += dx; r.shadow.position.z += dz; }
  }
}

// The counter window, shown (pass 94, PLAN.md "Next, small" 2): while a counter is open (after a perfect dodge or a
// deflect that opened the foe) the blade burns a cold white, dimming as the window closes; a cue only. A steady glow,
// no pulse, so it needs nothing for reducedMotion. Returns its strength (0 when shut); `cwFull` is the window's length.
// Pass 95: it flares as the window opens, and the counter itself burns at full strength until its recovery.
function counterGlow(p, r) {
  const G = ANIM_SETTINGS.counterGlow;
  if (!(p.riposte > 0)) {
    r.cwFull = r.cwLeft = 0;
    if (p.state === PS.ATTACK && p.payload && p.payload.riposte && p.attack) {   // the counter swinging
      const tl = attackTimeline(p.attack, p.attackT);
      return tl.phase === PHASE.RECOVERY ? 1 - tl.p : 1;
    }
    return 0;
  }
  if (p.riposte > (r.cwLeft || 0) + 1e-6) r.cwFull = p.riposte;   // opened, or opened again
  r.cwLeft = p.riposte;
  const since = r.cwFull - p.riposte, flare = G.flare * Math.pow(clamp(1 - since / G.flareTime, 0, 1), 2);
  return G.min + (1 - G.min) * clamp(p.riposte / r.cwFull, 0, 1) + flare;
}
function drawCounterGlow(r, k) {
  if (!(k > 0)) return;
  const G = ANIM_SETTINGS.counterGlow, c = r.cwColor || (r.cwColor = new THREE.Color(G.color)), m = r.weaponMat, e = G.emissive * k;
  m.emissive.r += c.r * e; m.emissive.g += c.g * e; m.emissive.b += c.b * e;
  m.color.lerp(c, 0.5 * Math.min(1, k));
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
    case PS.ROLL: dashPose(r, tt, C.rollTime); break;   // the dash: a long, low, leaning lunge, blade trailing
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
      poseToward(r, ANIM_SETTINGS.guard.pose, 1); r.crouch(ANIM_SETTINGS.guard.drop); r.tip.rotation.x = 0.06; break;   // the blade held across the body
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
  const cw = counterGlow(this, r);
  if (r.anim) r.anim.updatePlayer(this, tt, ctx, glint, true);   // a modelled body's secondary motion (js/animator.js), visual only
  r.applyLag(ctx.yaw, Math.hypot(this.vx, this.vz), ctx.dt);
  const vdt = Game.hitstop > 0 ? 0 : Math.min(ctx.dt || 0, 0.1);   // the visual clocks hold through a hit-pause
  landPose(this, r, vdt);
  deflectPose(this, r, vdt, ctx.yaw);
  // One move into the next without a snap (a chained swing is its own move); a body back from the dead starts clean.
  r.settle(this.state, this.state === PS.ATTACK || this.state === PS.EXECUTE ? this.attack : null, tt, r.settleKey !== PS.DEAD);
  // An open counter holds a star of light on the blade, over whatever the move's own layers set (they still run).
  if (r.anim && cw > 0) r.anim.glintK = Math.max(r.anim.glintK, ANIM_SETTINGS.counterGlow.glint * Math.min(cw, 1.6));
  if (r.anim) r.anim.finishPlayer(this, ctx);   // the cloth swings from the blended body, not the snapped one
  if (this.state === PS.JUMP_ATTACK && !this.hitbox) r.setWarning(1);   // same telegraph colour as enemy wind-ups
  else { r.setFlash(Math.max(this.flash, this.chargeGlow)); drawCounterGlow(r, cw); }
  r.setTint(HURT_COLOR, this.tint * 0.9);
};
