'use strict';
// ============================================================================
// Executions (v5.2): the reward for breaking an enemy's stance
// ============================================================================
// A full stagger, guard or posture bar sends an enemy to its knee (ES.BROKEN). While it kneels, light attack from in
// front of it (CONFIG.execution: range, cone, facing, floor) runs the player's `execute` attack (js/data/player.js,
// key poses `executeThrust`) instead of a light cut, on the same four-phase clock as every attack:
//   wind-up   the player slides into place (snapTime, moved by the body physics, so walls and ledges stop it) and coils;
//   active    the thrust: the blade goes through the chest and out of the back; damage, hitstop, shake, blood and embers;
//   follow    the hold, the blade still inside;
//   recovery  the pull-out: a normal enemy dies or is pushed back here; a boss's death, phase change or retreat waits
//             for the end of the animation (a blow that would empty a bar leaves 1 hp until then).
// The player is untouchable from the first frame to the last (Player.invulnerable) and `grace` s after; the enemy is
// held (ES.EXECUTED: no AI, no hitbox, blows pass through). Presses during it are swallowed.
// Events: executionStart { player, enemy }, execution { player, enemy, damage, at, exit }, executionPull, executionEnd.
const execution = (() => {
  const isBossLike = e => !!(e.baseDef.posture || e.baseDef.phases || e.boss);
  const SWALLOWED = ['roll', 'parry', 'jump', 'light', 'heavy', 'flask', 'rest'];

  // How well placed `p` is to execute `e` (lower is better), or null if it cannot.
  function score(p, e) {
    const C = CONFIG.execution;
    if (!e.alive() || e.state !== ES.BROKEN || Math.abs(e.y - p.y) > C.floor || gateBetween(p, e)) return null;
    const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz);
    if (dist - e.radius - p.radius > C.range) return null;
    const off = Math.abs(angDiff(Math.atan2(dx, dz), e.yaw));
    if (off > C.cone || Math.abs(angDiff(Math.atan2(-dx, -dz), p.yaw)) > C.facing) return null;
    return dist + off * C.angleWeight;
  }
  // The kneeling enemy the player would execute now: the closest and most in front of those in reach.
  function target(p, enemies) {
    let best = null, bestScore = Infinity;
    for (const e of enemies) { const s = score(p, e); if (s !== null && s < bestScore) { bestScore = s; best = e; } }
    return best;
  }
  function damageFor(e) {
    const D = CONFIG.execution.damage, boss = isBossLike(e);
    // `critMul` (v5.5, opt-in per def): a foe that shrugs off part of a critical blow (the Crucible Knight, 0.7).
    const dmg = PLAYER_DEF.moveset.attacks.light.damage * (boss ? D.bossLightMul : D.lightMul) * (e.def.critMul ?? 1);
    return boss ? Math.min(dmg, e.def.hp * D.bossCap) : dmg;   // e.def: a boss's current phase, so its current bar
  }

  function start(p, e) {
    if (typeof multiplayer !== 'undefined' && multiplayer.active() && multiplayer.grantedEnemy !== e.netId) { multiplayer.requestExecution(e); return; }
    const C = CONFIG.execution;
    const dir = Math.atan2(p.x - e.x, p.z - e.z), d = p.radius + e.radius * C.standoff + C.gap;   // from the enemy toward the player
    p.buffer = null; p.comboFrom = null; p.chainPose = null; p.hitbox = null;
    p.attack = p.def.moveset.attacks.execute; p.attackT = 0; p.charge = 2; p.riposte = 0;
    p.vx = p.vz = p.kx = p.kz = 0;
    p.exec = { enemy: e, impact: false, lethal: false, pulled: false, resolved: false,
               from: { x: p.x, z: p.z, yaw: p.yaw }, to: { x: e.x + Math.sin(dir) * d, z: e.z + Math.cos(dir) * d, yaw: dir + Math.PI },
               enemyYaw: { from: e.yaw, to: dir },
               aim: Math.atan2(e.y + e.height * C.chest - p.y - C.thrustHeight, d) };   // rad the thrust tilts up into a tall chest
    e.hitbox = null; e.vx = e.vz = e.kx = e.kz = 0; e.execReady = false; e.exec = p.exec;
    e.setState(ES.EXECUTED);
    p.setState(PS.EXECUTE);
    events.emit('executionStart', { player: p, enemy: e });
  }

  // The kneel is over: the blow's result. A lethal one kills (or starts the next bar, or the retreat); otherwise the
  // enemy is shoved back, its meters empty. A training dummy just stands up again.
  function resolve(X) {
    const e = X.enemy, C = CONFIG.execution;
    if (X.resolved) return;
    X.resolved = true; e.exec = null;
    if (typeof multiplayer !== 'undefined' && multiplayer.active()) return;   // the server resolves the reserved execution
    if (e.state !== ES.EXECUTED) return;
    if (e.training) { e.hp = e.def.hp; e.guardMeter = 0; e.setState(ES.IDLE); return; }
    if (X.lethal) { e.hp = 0; if (!e.outlast()) e.die(); return; }
    e.posture = 0; e.guardMeter = 0; e.poise = e.def.poise;
    e.kx -= Math.sin(e.yaw) * C.push; e.kz -= Math.cos(e.yaw) * C.push;
    e.setState(ES.STAGGER);
  }

  function impact(p, X) {
    const e = X.enemy, C = CONFIG.execution, dmg = damageFor(e);
    X.impact = true;
    X.lethal = !e.training && e.hp - dmg <= 0;
    if (!(typeof multiplayer !== 'undefined' && multiplayer.active())) e.hp = Math.max(1, e.hp - dmg);   // the bar empties only when the animation lets it
    e.tint = 1;
    Game.hitstop = Math.max(Game.hitstop, C.hitstop);
    const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), y = e.y + e.height * C.chest;
    events.emit('execution', { player: p, enemy: e, damage: dmg, lethal: X.lethal,
      at: { x: e.x + fx * e.radius * 0.8, y, z: e.z + fz * e.radius * 0.8 }, exit: { x: e.x - fx * e.radius * 1.1, y, z: e.z - fz * e.radius * 1.1 } });
  }

  // One fixed step of PS.EXECUTE (from Player.update).
  function update(p, dt) {
    const X = p.exec, e = X.enemy, a = p.attack, C = CONFIG.execution;
    for (const action of SWALLOWED) p.ctl.consume(action);   // dodge, attack and the rest wait until it is over
    const t0 = p.attackT;
    p.attackT += dt;
    emitAttackEvents(p, a, t0, p.attackT);
    const held = e.state === ES.EXECUTED;
    if (t0 < C.snapTime) {   // slide into place: a velocity, so the body physics keeps it out of walls and off edges
      const w = EASE.outCubic(Math.min(1, p.attackT / C.snapTime));
      p.vx = (lerp(X.from.x, X.to.x, w) - p.x) / dt; p.vz = (lerp(X.from.z, X.to.z, w) - p.z) / dt;
      p.yaw = X.from.yaw + angDiff(X.to.yaw, X.from.yaw) * w;
      if (held) e.yaw = X.enemyYaw.from + angDiff(X.enemyYaw.to, X.enemyYaw.from) * w;
    } else {
      p.vx = p.vz = 0;
      if (held) p.yaw = turnToward(p.yaw, Math.atan2(e.x - p.x, e.z - p.z), 8 * dt);   // stopped short by a wall: still aims at it
    }
    if (!held && !X.pulled) {   // it died or left from something else: go straight to the pull-out
      X.pulled = true; X.resolved = true; e.exec = null;
      p.attackT = Math.max(p.attackT, phaseSpan(a, 'recovery')[0]);
    }
    const tl = attackTimeline(a, p.attackT);
    if (!X.impact && held && tl.phase !== PHASE.STARTUP) impact(p, X);
    if (!X.pulled && tl.phase === PHASE.RECOVERY) {
      X.pulled = true;
      events.emit('executionPull', { player: p, enemy: e });
      if (!isBossLike(e)) resolve(X);   // a soldier falls (or reels away) as the blade comes out
    }
    if (tl.done) finish(p);
  }
  function finish(p) {
    const X = p.exec;
    p.exec = null; p.execGrace = CONFIG.execution.grace;
    p.setState(PS.IDLE);
    events.emit('executionEnd', { player: p, enemy: X.enemy });
    resolve(X);   // a boss: its death, next bar or retreat starts only now, with the player back in control
  }

  // Each step (Game.update): mark the one kneeling enemy the player could execute, for the cue.
  function mark(p, enemies) {
    const t = p.alive() && p.isFree() ? target(p, enemies) : null;
    for (const e of enemies) e.execReady = e === t;
    return t;
  }
  // Camera: 0..1, how far the push toward an execution has gone (smoothed both ways).
  function cameraWeight(game, dt, snap) {
    const want = game.player.state === PS.EXECUTE ? 1 : 0, c = game.cam;
    c.execK = snap || c.execK === undefined ? want : c.execK + (want - c.execK) * (1 - Math.exp(-CONFIG.execution.camera.rate * dt));
    return c.execK;
  }

  // Developer builds (#dev): F4 fills the stagger, guard or posture bar of the nearest enemy, so it kneels at once.
  function breakNearest() {
    const p = Game.player;
    if (!p) return null;
    let best = null, bd = Infinity;
    for (const e of Game.enemies) {
      const M = e.def.posture || e.def.guard || e.def.stagger, d = Math.hypot(e.x - p.x, e.z - p.z);
      if (M && e.alive() && !e.invulnerable() && e.state !== ES.BROKEN && d < bd) { bd = d; best = e; }
    }
    if (!best) return null;
    best.hitbox = null; best.crack = 1;
    best.setState(ES.BROKEN);
    events.emit('postureBreak', { enemy: best });
    return best;
  }
  if (DEV) window.addEventListener('keydown', ev => { if (ev.code === 'F4' && Game.mode === 'play') { ev.preventDefault(); breakNearest(); } });

  return { target, start, update, mark, cameraWeight, damageFor, isBossLike, breakNearest };
})();

// The player's execution pose (from Player.pose): the `execute` key poses, tilted up (chest and sword arm) by the aim
// at the victim's chest, eased in through the wind-up and out through the pull-out. Visual only.
function executePose(r, p, at) {
  const a = p.attack, glint = poseAttackKeys(r, a, at), X = p.exec;
  if (!X || !X.aim) return glint;
  const [r0, rl] = phaseSpan(a, 'recovery'), k = ease(clamp(at / a.hits[0].startup, 0, 1)) * (1 - ease(clamp((at - r0) / rl, 0, 1)));
  if (r.chest) r.chest.rotation.x -= X.aim * 0.35 * k;
  r.armR.rotation.x -= X.aim * (r.chest ? 0.65 : 1) * k;
  return glint;
}

// The executed enemy (ES.EXECUTED, drawn from Enemy.pose): on its knee, it jolts as the blade goes in, arches round
// it through the hold, then slumps forward as it comes out. Times follow the player's `execute` attack.
function executedPose(r, e, tt) {
  const a = PLAYER_DEF.moveset.attacks.execute;
  const hit = phaseSpan(a, 'active', 0)[0], held = phaseSpan(a, 'follow', 0), out = phaseSpan(a, 'recovery');
  r.kneel(1); r.lean(0.3);
  r.armR.rotation.x = 0.1; r.weapon.rotation.x = 1.4;
  if (tt < hit) { r.head.rotation.x = 0.4; r.spin.rotation.z = Math.sin(tt * 5) * 0.04; return; }
  const jolt = Math.exp(-(tt - hit) * 9);                          // the blow lands
  const arch = ease(clamp((tt - hit) / 0.12, 0, 1)) * (1 - ease(clamp((tt - out[0]) / (out[1] * 0.6), 0, 1)));
  const slump = ease(clamp((tt - out[0]) / out[1], 0, 1));
  const shiver = Math.sin(tt * 38) * 0.035 * arch * (1 - clamp((tt - held[0]) / (held[1] + 1e-6), 0, 1) * 0.6);
  r.tip.rotation.x -= 0.3 * jolt;
  r.lean(-0.4 * arch + 0.55 * slump);
  if (r.chest) r.chest.rotation.x -= 0.35 * arch;
  r.head.rotation.x = -0.65 * arch + 0.6 * slump + shiver;
  r.armL.rotation.set(-0.35 * arch, 0, 0.7 * arch); r.armR.rotation.set(0.1 + 0.25 * arch + 0.3 * slump, 0, -0.35 * arch);   // the weapon hangs
  r.weapon.rotation.x = 1.4 + 0.3 * arch;
  r.spin.rotation.z += shiver;
}
