'use strict';
// ============================================================================
// The Finishing Blow (pass 100): the reward for countering, in place of the posture bar and executions
// ============================================================================
// Each counter (a riposte's blow: after an opening deflect or a perfect dodge) that lands cracks the foe's guard
// (crackGuard, from Enemy.takeHit). The cracks stay until the Finishing Blow spends them (no timer), or the foe walks home. The
// counter that lands on a guard cracked CONFIG.finisher.cracks times is the Finishing Blow: its striker runs the
// `finisher` attack (js/data/player.js) on the same four-phase clock as every attack:
//   wind-up   time stops for the foe (ES.EXECUTED: no AI, no hitbox, blows pass through); the striker flash-steps through
//             it `steps` times, each step ending `past` m beyond the far edge of its body (moved by the body physics, so
//             walls and ledges stop it);
//   active    every cut opens at once: damage, the heal, hitstop, shake;
//   follow, recovery   the stance held, then back to guard. A blow that would empty a bar leaves 1 hp until the attack
//             ends; the death, phase change or retreat follows it, and a survivor reels (ES.STAGGER).
// The striker is untouchable throughout (Player.invulnerable) and `grace` s after. In a party anyone's counters crack the
// guard and the one landing the last gets the blow: the server counts the cracks and grants it (Simulation.hit).
// Events (the look listens to these: js/finisher-fx.js, js/audio.js, js/ultra-fx.js, js/afterimage.js):
//   guardCrack { enemy, cracks, by }         the crack level changed (0: spent by a Finishing Blow, or the foe went home)
//   finisherStart { player, enemy, time }    time stops for the foe; `time` s until the cuts open
//   finisherStep { player, enemy, i, from, to }   one flash step through it
//   finisher { player, enemy, damage, lethal, at, exit }   the cuts open
//   finisherEnd { player, enemy }            the striker is back in control
const finisher = (() => {
  const isBossLike = e => e.isBoss();
  const SWALLOWED = ['roll', 'parry', 'jump', 'light', 'heavy', 'flask', 'rest'];
  const net = () => typeof multiplayer !== 'undefined' && multiplayer.active();

  // `more`: the striker's Headsman ability (its kit's `finisher`).
  function damageFor(e, more = 0) {
    const D = CONFIG.finisher.damage, boss = isBossLike(e);
    // `critMul` (v5.5, opt-in per def): a foe that shrugs off part of a critical blow (the Crucible Knight, 0.7).
    const dmg = D.base * (boss ? D.bossMul : D.mul) * (e.def.critMul ?? 1);
    return (boss ? Math.min(dmg, e.def.hp * D.bossCap) : dmg) * (1 + more);   // e.def: a boss's current phase, so its current bar
  }

  // The whole blow, s of sim time: the striker's control comes back the moment it ends (hitstop adds its own freeze).
  const duration = a => a.hits.reduce((n, h) => n + h.startup + h.active + (h.follow || 0), 0) + a.recovery;

  // Where the flash steps end: round the foe, each through it from the side the last ended on.
  function stepPoints(p, e) {
    const C = CONFIG.finisher, R = e.radius + p.radius + C.past, out = [];
    let a = Math.atan2(p.x - e.x, p.z - e.z);
    for (let i = 0; i < C.steps; i++) {
      a += Math.PI + (i % 2 ? -0.5 : 0.5);   // a little off the centre line each time, so the cuts cross
      out.push({ x: e.x + Math.sin(a) * R, z: e.z + Math.cos(a) * R });
    }
    return out;
  }

  // Start the Finishing Blow on `e` (solo: the counter's hit reported it; online: the server granted it).
  function start(p, e) {
    if (net() && multiplayer.grantedEnemy !== e.netId) return;   // online only the server grants it
    if (!p.alive() || p.state === PS.HELD || !e.alive()) return;
    p.buffer = null; p.comboFrom = null; p.chainPose = null; p.hitbox = null;
    p.attack = p.def.moveset.attacks.finisher; p.attackT = 0; p.charge = 2; p.closeCounter();
    p.vx = p.vz = p.kx = p.kz = 0;
    p.exec = { enemy: e, impact: false, lethal: false, resolved: false, step: -1, duration: duration(p.attack),
               from: { x: p.x, z: p.z }, steps: stepPoints(p, e) };
    e.hitbox = null; e.vx = e.vz = e.kx = e.kz = 0; e.exec = p.exec;
    e.setState(ES.EXECUTED);
    p.setState(PS.EXECUTE);
    if (!net()) p.gainCharge(CONFIG.abilities.press.gain.finisher + abilityKeysFor(p.kit, 'finisher'));   // the number keys fill, Tithe's too (online, the server counts it)
    if (p.kit.perks['finisher/keys'] && Object.keys(p.kit.pressed).length) events.emit('abilityPerk', { body: p, perk: 'finisher/keys', target: e });
    events.emit('finisherStart', { player: p, enemy: e, time: p.attack.hits[0].startup, duration: p.exec.duration });
  }

  // The blow is over: its result. A lethal one kills (or starts the next bar, or the retreat); a survivor reels away,
  // its guard whole again. Online the server resolves it (Simulation.finishFinisher).
  function resolve(X) {
    const e = X.enemy, C = CONFIG.finisher;
    if (X.resolved) return;
    X.resolved = true; e.exec = null;
    if (net()) return;
    if (e.cracks) { e.cracks = 0; events.emit('guardCrack', { enemy: e, cracks: 0 }); }
    if (e.state !== ES.EXECUTED) return;
    if (X.lethal) { e.hp = 0; if (!e.outlast()) e.die(); return; }
    e.poise = e.def.poise;
    e.kx -= Math.sin(e.yaw) * C.push; e.kz -= Math.cos(e.yaw) * C.push;
    e.setState(ES.STAGGER);
  }

  function impact(p, X) {
    const e = X.enemy, C = CONFIG.finisher, dmg = damageFor(e, p.kit.mods.finisher);
    X.impact = true;
    X.lethal = e.hp - dmg <= 0;
    if (!net()) e.hp = Math.max(1, e.hp - dmg);   // the bar empties only when the attack lets it
    e.tint = 1; e.crack = 1;
    Game.hitstop = Math.max(Game.hitstop, C.hitstop);
    if (p.alive()) p.hp = Math.min(p.hpCap(), p.hp + p.maxHp * C.heal);
    const y = e.y + e.height * 0.55, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    events.emit('finisher', { player: p, enemy: e, damage: dmg, lethal: X.lethal,
      at: { x: e.x, y, z: e.z }, exit: { x: e.x + fx * e.radius, y, z: e.z + fz * e.radius } });
    const feast = p.kit && p.kit.perks['finisher/heal'];   // Grave Feast (a crate's)
    if (feast) abilityHeal(p, feast.heal, 'finisher/heal', e);
  }

  // One fixed step of PS.EXECUTE (from Player.update).
  function update(p, dt) {
    const X = p.exec, e = X.enemy, a = p.attack, C = CONFIG.finisher;
    for (const action of SWALLOWED) p.ctl.consume(action);   // dodge, attack and the rest wait until it is over
    const t0 = p.attackT;
    p.attackT += dt;
    emitAttackEvents(p, a, t0, p.attackT);
    const held = e.state === ES.EXECUTED, wind = a.hits[0].startup;
    if (t0 < wind && held) {   // the flash steps: a velocity, so the body physics keeps it out of walls and off edges
      const span = wind / C.steps, i = Math.min(C.steps - 1, Math.floor(t0 / span));
      if (i !== X.step) {
        X.step = i;
        const from = i ? X.steps[i - 1] : X.from, to = X.steps[i];
        X.leg = { from: { x: p.x, z: p.z }, to };
        p.yaw = Math.atan2(to.x - from.x, to.z - from.z);
        events.emit('finisherStep', { player: p, enemy: e, i, from: X.leg.from, to });
      }
      const w = EASE.outCubic(Math.min(1, (p.attackT - i * span) / (span * 0.45)));
      p.vx = (lerp(X.leg.from.x, X.leg.to.x, w) - p.x) / dt; p.vz = (lerp(X.leg.from.z, X.leg.to.z, w) - p.z) / dt;
      p.phasing = true;   // through the held body and anyone else's (separatePair)
    } else p.vx = p.vz = 0;
    if (!held && !X.resolved) {   // it died or left from something else: straight to the end of the stance
      X.resolved = true; e.exec = null;
      p.attackT = Math.max(p.attackT, phaseSpan(a, 'recovery')[0]);
    }
    const tl = attackTimeline(a, p.attackT);
    if (!X.impact && held && tl.phase !== PHASE.STARTUP) impact(p, X);
    if (tl.done) finish(p);
  }
  function finish(p) {
    const X = p.exec;
    p.exec = null; p.execGrace = CONFIG.finisher.grace;
    p.setState(PS.IDLE);
    events.emit('finisherEnd', { player: p, enemy: X.enemy });
    resolve(X);   // its death, next bar or retreat starts only now, with the player back in control
  }

  // The striker died mid-blow (Destined Death's drain can kill through the untouchable frames): the foe never stays
  // held in stopped time. Its result resolves at once, as the end would have.
  function abandon(p) {
    const X = p.exec;
    if (!X) return;
    p.exec = null;
    events.emit('finisherEnd', { player: p, enemy: X.enemy, abandoned: true });   // online: the server lets the foe go now
    resolve(X);
  }
  // Camera: 0..1, how far the push toward a Finishing Blow has gone (smoothed both ways).
  function cameraWeight(game, dt, snap) {
    const want = game.player.state === PS.EXECUTE ? 1 : 0, c = game.cam;
    c.execK = snap || c.execK === undefined ? want : c.execK + (want - c.execK) * (1 - Math.exp(-CONFIG.finisher.camera.rate * dt));
    return c.execK;
  }

  // Developer builds (#dev): F4 cracks the guard of the nearest enemy all the way, so its next counter is the blow.
  function crackNearest() {
    const p = Game.player;
    if (!p) return null;
    let best = null, bd = Infinity;
    for (const e of Game.enemies) {
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (e.alive() && !e.training && !e.invulnerable() && d < bd) { bd = d; best = e; }
    }
    if (!best) return null;
    best.cracks = CONFIG.finisher.cracks; best.crackTime = 0; best.crack = 1;
    events.emit('guardCrack', { enemy: best, cracks: best.cracks, by: p });
    return best;
  }
  if (DEV) window.addEventListener('keydown', ev => { if (ev.code === 'F4' && Game.mode === 'play') { ev.preventDefault(); crackNearest(); } });

  return { start, update, abandon, cameraWeight, damageFor, isBossLike, crackNearest, stepPoints, duration };
})();

// A counter landed on `e` from `from` (Enemy.takeHit; online on the server only). Cracks its guard, or, with
// CONFIG.finisher.cracks cracks already in it, returns true: the Finishing Blow is due.
// Hitboxes and server spent openings prevent duplicate counter contacts.
function crackGuard(e, from) {
  const C = CONFIG.finisher, who = from && from.id != null ? from.id : from;
  if (e.training || e.state === ES.EXECUTED) return false;
  if (e.cracks >= C.cracks) return true;
  e.cracks++; e.crackTime = 0; e.crackBy = who; e.crack = 1;
  events.emit('guardCrack', { enemy: e, cracks: e.cracks, by: from });
  return false;
}

// The striker's pose through the Finishing Blow (from Player.pose): the `finisher` key poses. Visual only.
function executePose(r, p, at) {
  return poseAttackKeys(r, p.attack, at);
}

// The held foe (ES.EXECUTED, drawn from Enemy.pose; pass 103): frozen in the pose it was caught in (js/finisher-fx.js
// keeps it), a tremor through the stopped time, then a jolt as the cuts open and a sag, or a boss's own `brokenPose`
// (the King's Blade's refusal). Without a kept pose (another player's blow seen online), a set stance stands in.
// Times follow the `finisher` attack. Visual only.
let finisherCutAt = -1;   // when the cuts open, s into the blow (worked out once: no allocation per frame)
function executedPose(r, e, tt) {
  if (finisherCutAt < 0) finisherCutAt = phaseSpan(PLAYER_DEF.moveset.attacks.finisher, 'active', 0)[0];
  const cut = finisherCutAt, kept = typeof finisherFx !== 'undefined' && finisherFx.hold(r, e);
  const k = ease(clamp(tt / 0.1, 0, 1));
  if (!kept) { r.lean(0.08 * k); r.armR.rotation.x = -0.6 * k; r.armL.rotation.x = -0.3 * k; }
  if (tt < cut) { r.spin.rotation.z += Math.sin(tt * 31) * 0.012 * k; return; }
  const jolt = Math.exp(-(tt - cut) * 8), sag = ease(clamp((tt - cut) / 0.4, 0, 1));
  r.tip.rotation.x -= 0.35 * jolt;
  if (e.def.brokenPose) { applyKeyPose(r, e.def.brokenPose, sag); return; }
  if (kept) {   // the cuts throw it back, then it folds over them, sinking
    r.lean(0.5 * sag); r.spin.rotation.x -= 0.4 * jolt; r.head.rotation.x += 0.6 * sag - 0.5 * jolt;
    r.armR.rotation.x += 0.7 * sag; r.armL.rotation.x += 0.5 * sag; r.weapon.rotation.x += 0.9 * sag;
    if (r.crouch) r.crouch(0.3 * sag);
    return;
  }
  r.lean(0.25 * sag); r.head.rotation.x = 0.45 * sag - 0.5 * jolt;
  r.armR.rotation.x = -0.6 + 0.7 * sag; r.weapon.rotation.x = 0.5 + 0.8 * sag;
}
