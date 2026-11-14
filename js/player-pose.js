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
// The dash (pass 94; a held lunge in pass 92): it steps through its key poses (ANIM_SETTINGS.dash.keys) on a smooth
// curve through each, so the body never freezes in one pose: a loaded push-off, the back leg driving, a long low
// stride with the trailing heel kicked up and the free arm swinging through, a skid on the front heel as the dash
// slows, and up toward stance (Rig.settle carries it into the run). `u` is the share of the dash gone.
// One channel of the keys at segment `i`, `s` of the way to the next: a Catmull-Rom curve (no allocation).
function keyCurve(K, i, s, name, j) {
  const n = K.length, a = K[Math.max(i - 1, 0)][name], b = K[i][name], c = K[Math.min(i + 1, n - 1)][name], d = K[Math.min(i + 2, n - 1)][name];
  const p0 = j < 0 ? a : a[j], p1 = j < 0 ? b : b[j], p2 = j < 0 ? c : c[j], p3 = j < 0 ? d : d[j], s2 = s * s, s3 = s2 * s;
  return 0.5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (3 * p1 - p0 - 3 * p2 + p3) * s3);
}
function dashPose(r, tt, rollTime) {
  const K = ANIM_SETTINGS.dash.keys, u = clamp(tt / rollTime, 0, 1);
  let i = 0; while (i < K.length - 2 && u > K[i + 1].at) i++;
  const s = clamp((u - K[i].at) / (K[i + 1].at - K[i].at), 0, 1);
  const legLx = keyCurve(K, i, s, 'legL', 0), kneeL = keyCurve(K, i, s, 'kneeL', -1), legRx = keyCurve(K, i, s, 'legR', 0), kneeR = keyCurve(K, i, s, 'kneeR', -1);
  r.legL.rotation.set(legLx, keyCurve(K, i, s, 'legL', 1), keyCurve(K, i, s, 'legL', 2)); r.kneeL.rotation.x = kneeL;
  r.legR.rotation.set(legRx, keyCurve(K, i, s, 'legR', 1), keyCurve(K, i, s, 'legR', 2)); r.kneeR.rotation.x = kneeR;
  for (const b of DASH_LIMBS) r[b].rotation.set(keyCurve(K, i, s, b, 0), keyCurve(K, i, s, b, 1), keyCurve(K, i, s, b, 2));
  if (r.elbowL) { r.elbowL.rotation.x += keyCurve(K, i, s, 'elbowL', -1); r.elbowR.rotation.x += keyCurve(K, i, s, 'elbowR', -1); }
  // The hips sit where the lower foot meets the floor once the whole body is tipped at the feet: a split stance, not a
  // squat (Rig.crouch bends both knees alike). Pass 99: the tip counts, so the body can lean from the ankles in one
  // line from the driving foot to the head (a forward tip lifts the back foot and sinks the front one, so the hips
  // rise or drop to keep the lower foot planted) instead of folding at the waist.
  const tip = keyCurve(K, i, s, 'tip', -1), tn = Math.tan(tip);
  const drop = Math.max(-ANIM_SETTINGS.dash.lift, 2 * LEG_SEG - LEG_SEG * Math.max(footReach(legLx, kneeL, tn), footReach(legRx, kneeR, tn)));
  r.spin.position.y -= drop; r.crouchDrop += Math.max(0, drop);   // so a later crouch() this frame bends from here
  r.lean(keyCurve(K, i, s, 'lean', -1)); r.tip.rotation.x += tip; r.head.rotation.x += keyCurve(K, i, s, 'head', -1);
}
const DASH_LIMBS = ['armR', 'armL', 'weapon'];
// The hip's height over one foot, in leg segments: thigh at `a`, knee bent `k`, the body tipped by atan(tn) at the feet.
function footReach(a, k, tn) { return Math.cos(a) + Math.cos(a + k) - (Math.sin(a) + Math.sin(a + k)) * tn; }
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
// The deflected blow's keyed reaction (pass 102; ANIM_SETTINGS.deflect.clang.keys): the keys' pose at `age` s since the
// blow, written into CLANG_POSE (with its hips' drop and step share in CLANG_AT); returns how much of the body it holds.
const CLANG_BONES = ['armR', 'elbowR', 'weapon', 'armL', 'elbowL', 'chest', 'head', 'tip', 'spin', 'legL', 'kneeL', 'legR', 'kneeR'];
const CLANG_POSE = Object.fromEntries(CLANG_BONES.map(b => [b, [0, 0, 0]])), CLANG_AT = { drop: 0, step: 0 };
function clangAt(K, age) {
  if (!(age >= 0) || age >= K[K.length - 1].at) return 0;
  let i = 0; while (i < K.length - 2 && age > K[i + 1].at) i++;
  const s = clamp((age - K[i].at) / (K[i + 1].at - K[i].at), 0, 1);
  for (const b of CLANG_BONES) { const o = CLANG_POSE[b]; o[0] = keyCurve(K, i, s, b, 0); o[1] = keyCurve(K, i, s, b, 1); o[2] = keyCurve(K, i, s, b, 2); }
  CLANG_AT.drop = keyCurve(K, i, s, 'drop', -1); CLANG_AT.step = keyCurve(K, i, s, 'step', -1);
  return clamp(keyCurve(K, i, s, 'w', -1), 0, 1);
}
function deflectPose(p, r, dt, yaw) {
  const D = ANIM_SETTINGS.deflect, C = D.clang, K = C.keys;
  if (r.dfLast === undefined) { r.dfLast = p.deflect; r.clBlow = p.deflectedBlow; }   // a new rig (a twin's) starts at rest
  if (p.deflect > (r.dfLast ?? 0) + 1e-6) r.dfAge = 0;                       // a fresh press arms the deflect
  else if (r.dfAge !== undefined) r.dfAge += dt;
  r.dfLast = p.deflect;
  if (p.deflectedBlow && p.deflectedBlow !== r.clBlow) {   // a blow turned aside; one still reacting fades out under it
    r.clOld = r.clAge !== undefined && r.clAge < K[K.length - 1].at ? r.clAge : undefined; r.clBlow = p.deflectedBlow; r.clAge = 0;
  }
  else if (r.clAge !== undefined) { r.clAge += dt; if (r.clOld !== undefined) r.clOld += dt; }
  const ramp = r.clAge === undefined ? 0 : EASE.outCubic(clamp(r.clAge / C.attack, 0, 1));
  if (ramp >= 1) r.clOld = undefined;
  if (p.state !== PS.IDLE && p.state !== PS.WALK && p.state !== PS.BLOCK) return;   // any other move takes the body (Rig.settle blends it)
  const k = deflectEnvelope(r.dfAge, D);
  poseToward(r, D.pose, k);
  let drop = D.drop * k, step = 0;
  // Pass 102 (a judge: "frames 5-9 hold one crouched pose"): the blow knocks blade and shoulders back and up, then the
  // body drives forward past the guard into a knee dip and settles in smaller swings, all on one curve.
  if (r.clOld !== undefined) {
    const w = clangAt(K, r.clOld) * (1 - ramp);
    if (w > 0.001) { poseToward(r, CLANG_POSE, w); drop = lerp(drop, CLANG_AT.drop, w); step = CLANG_AT.step * w; }
  }
  const w = clangAt(K, r.clAge) * ramp;
  if (w > 0.001) { poseToward(r, CLANG_POSE, w); drop = lerp(drop, CLANG_AT.drop, w); step = lerp(step, CLANG_AT.step, w); }
  if (drop > 0.001) r.crouch(drop);   // the hips drop with it; the feet stay planted
  if (Math.abs(step) > 0.001) {   // a blow turned aside: the whole body steps off its line (to its left and back), then back in
    const side = C.step[0] * step, back = C.step[1] * step, sy = Math.sin(yaw), cy = Math.cos(yaw);
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
