'use strict';
// ============================================================================
// 7. Hitbox helper
// ============================================================================
// What a landed attack carries, built the same way for both sides.
function makeStrike(attack, riposte = false) {
  const E = CONFIG.enemy, R = (riposte && attack.riposte) || {};
  const hitstop = attack.hitstop ?? clamp(E.hitstopBase + attack.damage * E.hitstopScale, 0, E.hitstopMax);
  return {
    attackId: attack.id, air: !!attack.air, riposte,
    damage: attack.damage * (R.damage || 1), poise: attack.poise * (R.poise || 1),
    knock: attack.knock, postureDmg: attack.postureDmg || 0,
    hitstop: hitstop * (riposte ? CONFIG.parry.riposteHitstop : 1),
  };
}
// An oriented box in the owner's frame, tested against a target's upright body cylinder.
class Hitbox {
  constructor(owner, box, payload) { this.owner = owner; this.box = box; this.payload = payload; this.hit = new Set(); }
  center() {
    const o = this.owner, b = this.box;
    return { x: o.x + Math.sin(o.yaw) * b.fwd, y: o.y + b.y, z: o.z + Math.cos(o.yaw) * b.fwd };
  }
  overlaps(target) {
    if (this.hit.has(target)) return false;
    const o = this.owner, b = this.box, s = Math.sin(o.yaw), c = Math.cos(o.yaw);
    const dx = target.x - o.x, dz = target.z - o.z;
    const lz = dx * s + dz * c - b.fwd, lx = dz * s - dx * c;
    const ex = lx - clamp(lx, -b.w / 2, b.w / 2), ez = lz - clamp(lz, -b.d / 2, b.d / 2);
    if (ex * ex + ez * ez > target.radius * target.radius) return false;
    const y0 = o.y + b.y - b.h / 2, y1 = o.y + b.y + b.h / 2;
    return y1 > target.y && y0 < target.y + target.height;
  }
  markHit(target) { this.hit.add(target); }
}

// ============================================================================
// 8. resolveCombat
// ============================================================================
// Seconds until enemy e's current strike goes active (negative once active) if the player could parry
// it now, allowing `extra` s of look-ahead; null if the strike is not parryable from here.
function parryTiming(p, e, extra) {
  const P = CONFIG.parry;
  let rem;
  if (e.state === ES.WINDUP) rem = e.attack.hits[e.hitIndex].startup - e.stateTime;
  else if (e.state === ES.ACTIVE) rem = -e.stateTime;
  else return null;
  if (rem > P.lead + extra || rem < -P.grace) return null;
  if (!isInFront(p, e.x, e.z) || gateBetween(p, e)) return null;   // same front rule as blocking
  const b = e.attack.box;
  if (Math.hypot(e.x - p.x, e.z - p.z) > b.fwd + b.d / 2 + p.radius + P.reach) return null;
  return rem;
}

// Order each step: parry, then player hitboxes against enemies, then enemy hitboxes against the player.
// Damage itself lives in Player.takeHit / Enemy.takeHit; effects listen to the events.
function resolveCombat(game) {
  const p = game.player, P = CONFIG.parry;
  const live = game.enemies.filter(e => e.alive());
  const contact = (hb, target) => {
    const c = hb.center();
    return { x: (c.x + target.x) / 2, y: clamp(c.y, target.y + 0.3, target.y + target.height - 0.2), z: (c.z + target.z) / 2 };
  };
  // 0. Parry, before any damage: only the strike that lands first is parried.
  if (p.state === PS.PARRY && p.stateTime <= P.arm) {
    let target = null, soonest = Infinity;
    for (const e of live) { const t = parryTiming(p, e, 0); if (t !== null && t < soonest) { soonest = t; target = e; } }
    if (target) {
      const broke = target.getParried();
      p.stamina = Math.min(p.maxStamina, p.stamina + P.cost);   // a successful parry is free
      p.staminaDelay = 0; p.riposte = P.riposteTime; p.flash = 1;
      p.setState(PS.IDLE);
      game.hitstop = Math.max(game.hitstop, P.hitstop);
      events.emit('parry', { target });
      if (broke) { game.hitstop = Math.max(game.hitstop, target.def.posture.hitstop); events.emit('postureBreak', { enemy: target }); }
    }
  }
  // 1. Player hitboxes against enemy bodies.
  const playerHits = p.hitbox ? live.filter(e => p.hitbox.overlaps(e) && !gateBetween(p, e)) : [];
  // 2. Enemy hitboxes against the player's body.
  const enemyHits = p.alive() ? live.filter(e => e.hitbox && e.hitbox.overlaps(p) && !gateBetween(e, p)).map(e => e.hitbox) : [];
  // 3. Apply damage, poise loss, knockback and stagger.
  for (const e of playerHits) {
    const strike = p.hitbox.payload;
    p.hitbox.markHit(e);
    const res = e.takeHit(strike, p);
    game.hitstop = Math.max(game.hitstop, res.blocked ? CONFIG.block.hitstop : strike.hitstop);
    events.emit('strike', { strike, attacker: p, target: e, at: contact(p.hitbox, e), blocked: !!res.blocked });
    if (res.broke) { game.hitstop = Math.max(game.hitstop, (e.def.posture || e.def.guard || e.def.stagger).hitstop); events.emit('postureBreak', { enemy: e }); }
  }
  for (const hb of enemyHits) {
    if (p.invulnerable() || !p.alive()) continue;   // a dodged swing stays live: it can catch the end of a roll
    hb.markHit(p);
    const res = p.takeHit(hb.payload, hb.owner);
    game.hitstop = Math.max(game.hitstop, res.blocked ? CONFIG.block.hitstop : hb.payload.hitstop);
    events.emit('strike', { strike: hb.payload, attacker: hb.owner, target: p, at: contact(hb, p), blocked: res.blocked });
  }
}

// Bodies cannot overlap; enemies barely give way to the player, and dummies never do.
function separatePair(a, b, shareA) {
  if (b.immovable) shareA = 1; else if (a.immovable) shareA = 0;
  if (!a.alive() || !b.alive() || Math.abs(a.y - b.y) >= Math.min(a.height, b.height)) return;
  const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz), min = a.radius + b.radius;
  if (d >= min) return;
  const nx = d > 1e-4 ? dx / d : Math.sin(b.yaw), nz = d > 1e-4 ? dz / d : Math.cos(b.yaw), push = min - d;
  a.x += nx * push * shareA; a.z += nz * push * shareA; b.x -= nx * push * (1 - shareA); b.z -= nz * push * (1 - shareA);
  clampToWorld(a); clampToWorld(b);
}
function separateBodies(p, enemies) {
  for (let i = 0; i < enemies.length; i++) {
    separatePair(p, enemies[i], 0.85);
    for (let j = i + 1; j < enemies.length; j++) separatePair(enemies[i], enemies[j], 0.5);
  }
}
