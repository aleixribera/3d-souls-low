'use strict';
// ============================================================================
// 7. Hitbox helper
// ============================================================================
// What a landed attack carries, built the same way for both sides.
// charge: 0..1 of a held heavy's `charge.hold`, scaling damage, poise and posture up to `charge.mul`.
// A blessing's bonus is added when it lands, by whoever owns the enemy (blessingStrike, js/blessings.js).
function makeStrike(attack, riposte = false, charge = 0) {
  const E = CONFIG.enemy, R = (riposte && attack.riposte) || {}, Ch = attack.charge;
  const hitstop = attack.hitstop ?? clamp(E.hitstopBase + attack.damage * E.hitstopScale, 0, E.hitstopMax);
  const mul = Ch ? lerp(1, Ch.mul, charge) : 1, hsMul = Ch ? lerp(1, Ch.hitstopMul, charge) : 1;
  return {
    attackId: attack.id, air: !!attack.air, riposte, rollOnly: !!attack.rollOnly, shove: !!attack.shove, charge,
    damage: attack.damage * (R.damage || 1) * mul, poise: attack.poise * (R.poise || 1) * mul,
    knock: attack.knock, postureDmg: (attack.postureDmg || 0) * mul, destined: !!attack.destined,
    hitstop: hitstop * (riposte ? CONFIG.parry.riposteHitstop : 1) * hsMul,
  };
}
// An oriented box in the owner's frame, tested against a target's upright body cylinder.
// `anchor` (a hit's `echo`, Enemy.makeHitbox): { cut, home, time } places the box where the owner stood and faced at `cut`
// instead of where it is now; with `home` it slides from there back to the owner over `time` s of the strike.
// A `bolt` anchor (pass 48) is the same, a spot the storm strikes (Enemy.noteBolt).
// `lines` (a hit's `erupt`, Enemy.makeHitbox): the floor's open seams [{ x0, z0, x1, z1, y }], each a wall of fire
// CONFIG.seams.width wide and `height` tall along it, instead of the box.
class Hitbox {
  constructor(owner, box, payload, anchor = null, lines = null) {
    this.owner = owner; this.box = box; this.payload = payload; this.hit = new Set(); this.anchor = anchor; this.lines = lines;
    this.x = 0; this.y = 0; this.z = 0; this.yaw = 0; this.near = { x: 0, y: 0, z: 0 };
  }
  // The frame the box sits in this step (no allocation: it is read on every step).
  place() {
    const o = this.owner, A = this.anchor;
    if (!A) { this.x = o.x; this.y = o.y; this.z = o.z; this.yaw = o.yaw; return this; }
    const k = A.home ? clamp(o.stateTime / Math.max(0.01, A.time), 0, 1) : 0;
    this.x = lerp(A.cut.x, o.x, k); this.y = lerp(A.cut.y, o.y, k); this.z = lerp(A.cut.z, o.z, k); this.yaw = A.cut.yaw;
    return this;
  }
  center() {
    if (this.lines) return this.near;   // where the last seam it was tested against came nearest
    const f = this.place(), b = this.box;
    return { x: f.x + Math.sin(f.yaw) * b.fwd, y: f.y + b.y, z: f.z + Math.cos(f.yaw) * b.fwd };
  }
  overlaps(target) {
    if (this.hit.has(target)) return false;
    if (this.box.ground && !target.grounded) return false;   // a shockwave along the floor (`ground`): anyone in the air is clear of it
    if (this.lines) return this.overlapsSeams(target);
    const o = this.place(), b = this.box, s = Math.sin(o.yaw), c = Math.cos(o.yaw);
    const dx = target.x - o.x, dz = target.z - o.z;
    const lz = dx * s + dz * c - b.fwd, lx = dz * s - dx * c;
    if (b.ring) {   // an expanding ring round the box's centre: from `from` to `to` m over `time` s of the strike, `width` m thick
      const R = b.ring, r = lerp(R.from, R.to, clamp(this.owner.stateTime / R.time, 0, 1));
      if (Math.abs(Math.hypot(lx, lz) - r) > R.width / 2 + target.radius) return false;
    } else {
      const ex = lx - clamp(lx, -b.w / 2, b.w / 2), ez = lz - clamp(lz, -b.d / 2, b.d / 2);
      if (ex * ex + ez * ez > target.radius * target.radius) return false;
    }
    const y0 = o.y + b.y - b.h / 2, y1 = o.y + b.y + b.h / 2;
    return y1 > target.y && y0 < target.y + target.height;
  }
  // Any open seam whose wall of fire holds the target's body: within half its width of the line, above its floor.
  overlapsSeams(target) {
    const S = CONFIG.seams, reach = S.width / 2 + target.radius;
    for (const L of this.lines) {
      const ax = L.x1 - L.x0, az = L.z1 - L.z0, len2 = ax * ax + az * az || 1;
      const t = clamp(((target.x - L.x0) * ax + (target.z - L.z0) * az) / len2, 0, 1), px = L.x0 + ax * t, pz = L.z0 + az * t;
      if (Math.hypot(target.x - px, target.z - pz) > reach || target.y > L.y + S.height || target.y + target.height < L.y - 0.3) continue;
      this.near.x = px; this.near.y = L.y + 1; this.near.z = pz;
      return true;
    }
    return false;
  }
  markHit(target) { this.hit.add(target); }
}

// ============================================================================
// 8. resolveCombat
// ============================================================================
// Seconds until enemy e's current strike goes active (negative once active) if the player could parry
// it now, allowing `extra` s of look-ahead; null if the strike is not parryable from here.
function parryTiming(p, e, extra) {
  const P = CONFIG.parry, wide = 1 + (p.kit?.mods.parryWindow || 0);   // Keen Eye widens both edges
  let rem;
  if (!canParryHit(e.attack, e.hitIndex)) return null;   // roll-only, bolts, `noParry` (blockable), a gilt echo or a wall of fire: cannot be parried
  if (e.state === ES.WINDUP) rem = e.attack.hits[e.hitIndex].startup - e.stateTime;
  else if (e.state === ES.ACTIVE) rem = -e.stateTime;
  else return null;
  if (rem > P.lead * wide + extra || rem < -P.grace * wide) return null;
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
      const broke = typeof multiplayer !== 'undefined' && multiplayer.active() ? multiplayer.parry(target) : target.getParried();
      p.stamina = Math.min(p.maxStamina, p.stamina + P.cost);   // a successful parry is free
      p.staminaDelay = 0; p.riposte = P.riposteTime; p.flash = 1;
      p.setState(PS.IDLE);
      game.hitstop = Math.max(game.hitstop, P.hitstop);
      events.emit('parry', { target, player: p });
      const breath = p.kit.perks['parry/stamina'];   // Deep Breath
      if (breath) { p.stamina = Math.min(p.maxStamina, p.stamina + p.maxStamina * breath.stamina); events.emit('blessingPerk', { body: p, perk: 'parry/stamina' }); }
      blessingReport(p, 'parry', { enemy: target });
      if (broke) { game.hitstop = Math.max(game.hitstop, target.def.posture.hitstop); events.emit('postureBreak', { enemy: target }); }
    }
  }
  // 1. Player hitboxes against enemy bodies.
  const playerHits = p.hitbox ? live.filter(e => !e.invulnerable() && p.hitbox.overlaps(e) && !gateBetween(p, e)) : [];   // a boss between phases: blows pass through
  // 2. Enemy hitboxes against the player's body.
  const enemyHits = p.alive() ? live.filter(e => e.hitbox && !(e.frozen > 0) && e.hitbox.overlaps(p) && !gateBetween(e, p)).map(e => e.hitbox) : [];   // stopped in time: harmless
  // 3. Apply damage, poise loss, knockback and stagger.
  for (const e of playerHits) {
    const base = p.hitbox.payload, strike = blessingStrike(p.kit, p.perk, e, base);   // the kit's bonus (online: the server's own)
    p.hitbox.markHit(e);
    const res = typeof multiplayer !== 'undefined' && multiplayer.active() ? multiplayer.hit(e, base) : e.takeHit(strike, p);
    game.hitstop = Math.max(game.hitstop, res.blocked ? CONFIG.block.hitstop : strike.hitstop);
    events.emit('strike', { strike, attacker: p, target: e, at: contact(p.hitbox, e), blocked: !!res.blocked });
    if (strike.empowered) events.emit('blessingPerk', { body: p, perk: 'empower', target: e });
    if (!res.blocked && p.kit !== NO_KIT) {
      blessingLanded(p, strike);
      if (strike.charge >= 1 && !strike.air) blessingReport(p, 'fullHeavy', { enemy: e });   // Storm King
    }
    if (p.rentBy === e && !res.blocked) p.reclaim();   // pass 48: every blow on her tears a piece back (Player.rend)
    if (res.broke) { game.hitstop = Math.max(game.hitstop, (e.def.posture || e.def.guard || e.def.stagger).hitstop); events.emit('postureBreak', { enemy: e }); }
  }
  for (const hb of enemyHits) {
    if (!p.alive()) continue;
    if (p.invulnerable()) {   // rolled through: announced once per hitbox, which stays live (it can catch the end of the roll)
      if (!hb.dodged && p.state === PS.ROLL) {   // an execution's untouchable time is no dodge
        hb.dodged = true; events.emit('dodge', { attacker: hb.owner, strike: hb.payload, player: p });
        const step = p.kit.perks['dodge/riposte'];   // Counterstep: the next blow is a riposte
        if (step) { p.riposte = Math.max(p.riposte, step.window); events.emit('blessingPerk', { body: p, perk: 'dodge/riposte' }); }
        blessingReport(p, 'dodge', { enemy: hb.owner });
      }
      continue;
    }
    hb.markHit(p);
    // A wall of fire pushes away from its seam, a bolt from where it fell, not from him.
    const res = p.takeHit(hb.payload, hb.lines ? hb.near : hb.anchor && hb.anchor.bolt ? hb.anchor.cut : hb.owner);
    if (hb.owner.def && hb.owner.def.lifesteal) {
      if (typeof multiplayer !== 'undefined' && multiplayer.active()) multiplayer.lifesteal(hb.owner);
      else hb.owner.lifesteal();
    }
    game.hitstop = Math.max(game.hitstop, res.blocked ? CONFIG.block.hitstop : hb.payload.hitstop);
    events.emit('strike', { strike: hb.payload, attacker: hb.owner, target: p, at: contact(hb, p), blocked: res.blocked });
  }
}

// Boss team combat uses the same hitboxes, shields, posture, damage and phase transitions as a duel.
// Capture active hitboxes before applying damage so simultaneous opposing swings can trade.
function applyEnemyStrike(game, strike, attacker, target, at, projectile = false, from = attacker) {
  const res = target.takeHit(strike, from);
  if (attacker.def.lifesteal) attacker.lifesteal();
  game.hitstop = Math.max(game.hitstop, res.blocked ? CONFIG.block.hitstop : strike.hitstop);
  events.emit('strike', { strike, attacker, target, at, blocked: !!res.blocked, projectile });
  if (res.broke) {
    game.hitstop = Math.max(game.hitstop, (target.def.posture || target.def.guard || target.def.stagger).hitstop);
    events.emit('postureBreak', { enemy: target });
  }
  return res;
}
function resolveTeamCombat(game) {
  const hits = [];
  for (const e of game.enemies) if (e.alive() && e.hitbox) {
    const hb = e.hitbox;
    for (const target of game.enemies) if (target !== e && target.team !== e.team && target.alive() &&
      !target.invulnerable() && hb.overlaps(target) && !gateBetween(e, target)) hits.push({ hb, target });
  }
  for (const { hb, target } of hits) {
    if (!target.alive() || target.invulnerable()) continue;
    hb.markHit(target);
    const c = hb.center(), at = { x: (c.x + target.x) / 2, y: clamp(c.y, target.y + 0.3, target.y + target.height - 0.2), z: (c.z + target.z) / 2 };
    applyEnemyStrike(game, hb.payload, hb.owner, target, at);
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
    if (enemies[i].state !== ES.EXECUTED) separatePair(p, enemies[i], 0.85);   // the blade's victim: the bodies overlap
    for (let j = i + 1; j < enemies.length; j++) separatePair(enemies[i], enemies[j], 0.5);
  }
}
