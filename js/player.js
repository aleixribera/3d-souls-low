'use strict';
// ============================================================================
// 5. Player
// ============================================================================
// Inventory: { itemId: { count, max } }, created from the player definition.
const makeInventory = list => Object.fromEntries(list.map(it => [it.item, { count: it.count, max: it.max }]));

class Player {
  constructor(def, x, z, yaw, y = 0) {
    this.def = def;
    this.rig = new Rig(def.look);
    this.radius = def.radius; this.height = BODY_HEIGHT * def.look.scale;
    this.maxHp = def.stats.maxHp; this.maxStamina = def.stats.maxStamina; this.maxPoise = def.stats.maxPoise;
    this.inventory = makeInventory(def.inventory);
    this.x = x; this.y = y; this.z = z; this.yaw = yaw;
    this.vx = this.vy = this.vz = 0; this.kx = this.kz = 0;
    this.grounded = true; this.peak = y; this.fallHeight = 0; this.inPit = false;   // see integrateBody
    this.hp = this.maxHp; this.stamina = this.maxStamina; this.poise = this.maxPoise;
    this.staminaDelay = 0; this.poiseTimer = 0; this.tint = 0; this.flash = 0; this.brace = 0; this.walkPhase = 0;
    this.riposte = 0;      // timer: > 0 while a riposte is available after a successful parry
    this.rollQueue = 0;    // timer: > 0 while a roll pressed during a busy state is waiting to come out
    this.state = PS.IDLE; this.stateTime = 0;
    this.attack = null; this.payload = null; this.hitbox = null; this.stunTime = 0; this.usingItem = null;
    this.activeAt = Infinity; this.landTime = 0; this.landHit = false;
    this.savePrev();
  }
  alive() { return this.state !== PS.DEAD; }
  in(group) { return PLAYER_GROUPS[group].has(this.state); }
  isFree() { return this.in('free'); }
  isAttacking() { return this.in('attacking'); }
  savePrev() { this.px = this.x; this.py = this.y; this.pz = this.z; this.pyaw = this.yaw; }
  setState(s) { this.state = s; this.stateTime = 0; }
  spend(amount) { this.stamina = Math.max(0, this.stamina - amount); this.staminaDelay = CONFIG.player.staminaDelay; }
  attackPhase() { return attackTimeline(this.attack, this.stateTime).phase; }
  invulnerable() { return this.state === PS.ROLL && this.stateTime < CONFIG.player.rollIFrames; }
  // A swing already out is not interrupted by hits.
  isCommitted() {
    return (this.state === PS.ATTACK && this.attackPhase() === PHASE.ACTIVE) || (this.state === PS.JUMP_ATTACK && !!this.hitbox);
  }
  item(id) { return this.inventory[id] || { count: 0, max: 0 }; }
  refillItems() { for (const [id, it] of Object.entries(this.inventory)) if (ITEMS[id].refillOnRest) it.count = it.max; }

  // Any stamina allows one emergency roll; a roll that empties the bar leaves the player winded:
  // no more rolls until stamina is back to a full roll's cost.
  canRoll() {
    if (this.winded && this.stamina >= CONFIG.player.rollCost) this.winded = false;
    return this.stamina > 0 && !this.winded;
  }
  // A roll is wanted now: a queued press, or a fresh one (only consumed if a roll is possible).
  // A queued roll that can't happen the moment it's allowed (no stamina, or winded) is dropped, never held.
  wantsRoll() {
    if (!this.canRoll()) { this.rollQueue = 0; return false; }
    return this.rollQueue > 0 || input.consume('roll');
  }
  startRoll(mv) {
    this.rollQueue = 0;
    if (mv.has) this.yaw = Math.atan2(mv.x, mv.z);
    if (this.stamina - CONFIG.player.rollCost < 1) this.winded = true;   // the bar is (all but) empty after this roll
    this.spend(CONFIG.player.rollCost);
    this.hitbox = null; this.setState(PS.ROLL);
  }
  // Heading toward the best nearby enemy in the direction the player means to swing, or null.
  autoAim(mv, enemies) {
    const A = CONFIG.player.autoTarget, want = mv.has ? Math.atan2(mv.x, mv.z) : this.yaw;
    let best = null, bestScore = Infinity;
    for (const c of findEnemies(this, enemies, { range: A.range, cone: A.cone, yaw: want, surface: true })) {
      const score = c.d + c.ang * A.angleWeight;
      if (score < bestScore) { bestScore = score; best = c.dir; }
    }
    return best;
  }
  // Shared by ground and jump attacks: aim, riposte bonus, stamina.
  beginAttack(a, mv, face, enemies) {
    const auto = face === null ? this.autoAim(mv, enemies) : null;
    if (face !== null) this.yaw = face;                // locked on: always aim at the target
    else if (auto !== null) this.yaw = auto;           // near an enemy: aim at it
    else if (mv.has) this.yaw = Math.atan2(mv.x, mv.z);
    this.attack = a;
    this.payload = makeStrike(a, this.riposte > 0);
    this.riposte = 0;
    this.spend(a.cost || 0);
    this.hitbox = null;
  }
  startParry() { this.spend(CONFIG.parry.cost); this.hitbox = null; this.setState(PS.PARRY); }
  useItem(id) {
    this.inventory[id].count--;
    this.usingItem = ITEMS[id]; this.vx = this.vz = 0;
    this.setState(PS.USE_ITEM);
    events.emit('itemUsed', { item: id, player: this });
  }
  // Free on the ground: start the first action whose input is pressed. Returns true if one started.
  tryGroundAction(mv, face, enemies) {
    const C = CONFIG.player, M = this.def.moveset;
    if (this.wantsRoll()) { this.startRoll(mv); return true; }
    if (this.stamina > 0 && input.consume('parry')) { this.startParry(); return true; }
    for (const [action, id] of Object.entries(M.ground)) {
      if (this.stamina > 0 && input.consume(action)) { this.beginAttack(M.attacks[id], mv, face, enemies); this.setState(PS.ATTACK); return true; }
    }
    for (const [id, item] of Object.entries(ITEMS)) {
      if (this.item(id).count > 0 && input.consume(item.action)) { this.useItem(id); return true; }
    }
    if (this.stamina > 0 && input.consume('jump')) { this.spend(C.jumpCost); this.vy = C.jumpVelocity; this.setState(PS.JUMP); return true; }
    if (input.isHeld('block')) { this.setState(PS.BLOCK); return true; }
    return false;
  }

  // lock: the locked-on enemy or null.
  update(dt, mv, enemies, lock) {
    const C = CONFIG.player, M = this.def.moveset;
    this.stateTime += dt;
    this.tint = Math.max(0, this.tint - dt / CONFIG.fx.tintTime);
    this.flash = Math.max(0, this.flash - dt / CONFIG.parry.flashTime);
    this.brace = Math.max(0, this.brace - dt / C.braceTime);
    this.riposte = Math.max(0, this.riposte - dt);
    this.rollQueue = Math.max(0, this.rollQueue - dt);
    if (this.in('queuesRoll') && !(this.state === PS.ATTACK && this.attackPhase() === PHASE.RECOVERY) && input.consume('roll'))
      this.rollQueue = C.rollQueueTime;
    this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    if (!this.in('noRegen') && this.staminaDelay <= 0) this.stamina = Math.min(this.maxStamina, this.stamina + C.staminaRegen * dt);
    tickPoise(this, dt, C.poiseResetTime, this.maxPoise);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const face = lock ? Math.atan2(lock.x - this.x, lock.z - this.z) : null;

    switch (this.state) {
      case PS.IDLE:
      case PS.WALK: {
        if (this.tryGroundAction(mv, face, enemies)) break;
        if (mv.has && face === null) this.yaw = turnToward(this.yaw, Math.atan2(mv.x, mv.z), C.turnRate * dt);
        approachVel(this, mv.x * C.walkSpeed, mv.z * C.walkSpeed, (mv.has ? C.accel : C.decel) * dt);
        const next = mv.has ? PS.WALK : PS.IDLE;
        if (next !== this.state) this.setState(next);
        break;
      }
      case PS.JUMP:
      case PS.FALL: {
        if (this.stamina > 0) {
          const action = Object.keys(M.air).find(a => input.consume(a));
          if (action) {
            this.beginAttack(M.attacks[M.air[action]], mv, face, enemies);
            this.activeAt = Infinity;   // stateTime when the hitbox opened
            this.setState(PS.JUMP_ATTACK);
            break;
          }
        }
        if (mv.has) {
          if (face === null) this.yaw = turnToward(this.yaw, Math.atan2(mv.x, mv.z), C.turnRate * C.airTurnMul * dt);
          approachVel(this, mv.x * C.walkSpeed, mv.z * C.walkSpeed, C.airControl * dt);
        }
        if (this.state === PS.JUMP && this.vy <= 0) this.setState(PS.FALL);
        break;
      }
      case PS.JUMP_ATTACK: {
        // Momentum carries; steering is weaker than a normal jump.
        if (mv.has) approachVel(this, mv.x * C.walkSpeed, mv.z * C.walkSpeed, C.airControl * C.jumpAttackAirControl * dt);
        const a = this.attack;
        if (!this.hitbox && this.stateTime >= a.hits[0].startup && this.vy <= 0) {
          this.hitbox = new Hitbox(this, a.box, this.payload); this.activeAt = this.stateTime;
        }
        break;
      }
      case PS.LAND: {
        // Committed landing: no block, parry or attack until it ends. Once the impact is over and the
        // feet are down, it can be rolled out of (like a ground attack's recovery).
        const a = this.attack, air = a.air;
        approachVel(this, 0, 0, C.decel * dt);
        if (this.hitbox && this.hitbox.hit.size > 0 && !this.landHit) {   // connected: hop and recover a bit sooner
          this.landHit = true; this.vy = air.hop; this.landTime = a.recovery * air.hitRecoveryMul;
        }
        if (this.hitbox && this.stateTime >= air.impactTime) this.hitbox = null;
        if (!this.hitbox && this.grounded && this.wantsRoll()) { this.startRoll(mv); break; }
        if (this.stateTime >= this.landTime && this.grounded) this.setState(PS.IDLE);
        break;
      }
      case PS.ROLL: {
        const p = this.stateTime / C.rollTime;
        const sp = C.rollSpeed * (1 - C.rollSlow * p * p);
        this.vx = fx * sp; this.vz = fz * sp;
        // Chain rolls: only a press in the last rollChainWindow s is queued; earlier presses (mashing) are dropped.
        if (input.consume('roll') && this.stateTime >= C.rollTime - C.rollChainWindow) this.rollQueue = C.rollQueueTime;
        if (this.stateTime >= C.rollTime) { this.vx *= C.rollExitKeep; this.vz *= C.rollExitKeep; this.setState(PS.IDLE); }
        break;
      }
      case PS.ATTACK: {
        const a = this.attack, tl = attackTimeline(a, this.stateTime), prev = attackTimeline(a, this.stateTime - dt);
        // A fresh hitbox (and hit list) for each strike of the attack.
        if (tl.phase === PHASE.ACTIVE && (prev.phase !== PHASE.ACTIVE || prev.hitIndex !== tl.hitIndex))
          this.hitbox = new Hitbox(this, a.box, this.payload);
        if (tl.phase !== PHASE.ACTIVE) this.hitbox = null;
        const lunging = tl.phase === PHASE.ACTIVE || (tl.phase === PHASE.STARTUP && tl.p > C.lungeStart);
        approachVel(this, lunging ? fx * a.lunge : 0, lunging ? fz * a.lunge : 0, C.accel * dt);
        // Roll out of a swing: a press during wind-up or strike is kept and fires as recovery begins.
        if (tl.phase === PHASE.RECOVERY && this.wantsRoll()) { this.startRoll(mv); break; }
        if (tl.done) this.setState(PS.IDLE);
        break;
      }
      case PS.BLOCK: {
        const bs = C.walkSpeed * C.blockSpeedMul;
        approachVel(this, mv.x * bs, mv.z * bs, (mv.has ? C.accel : C.decel) * dt);
        if (this.wantsRoll()) { this.startRoll(mv); break; }   // roll straight out of a guard
        // Parry from block only commits if an attack is about to land; otherwise the press is ignored.
        if (input.consume('parry')) {
          if (this.stamina > 0 && enemies.some(e => parryTiming(this, e, CONFIG.parry.arm) !== null)) { this.startParry(); break; }
        }
        if (!input.isHeld('block')) this.setState(PS.IDLE);
        break;
      }
      case PS.PARRY: {
        approachVel(this, 0, 0, C.decel * dt);
        if (this.stateTime >= CONFIG.parry.time) this.setState(PS.IDLE);   // whiffed: recovery over
        break;
      }
      case PS.USE_ITEM: {
        const I = this.usingItem;
        approachVel(this, 0, 0, C.decel * dt);
        if (I.heal) {   // heal spread over [healStart, healStart + healDuration]
          const t0 = this.stateTime - dt, t1 = this.stateTime;
          const healed = clamp(t1 - I.healStart, 0, I.healDuration) - clamp(t0 - I.healStart, 0, I.healDuration);
          this.hp = Math.min(this.maxHp, this.hp + I.heal * healed / I.healDuration);
        }
        if (this.stateTime >= I.useTime) this.setState(PS.IDLE);
        break;
      }
      case PS.REST: {
        approachVel(this, 0, 0, C.decel * dt);
        if (this.stateTime >= CONFIG.rest.time) this.setState(PS.IDLE);
        break;
      }
      case PS.HURT:
      case PS.STAGGER: {
        approachVel(this, 0, 0, C.decel * dt);
        if (this.stateTime >= this.stunTime) {
          if (this.state === PS.STAGGER) this.poise = this.maxPoise;
          this.setState(PS.IDLE);
        }
        break;
      }
      case PS.DEAD: approachVel(this, 0, 0, C.decel * dt); break;
    }
    // Locked on: keep facing the target, except while committed to a roll or a swing already released.
    const released = (this.state === PS.ATTACK && this.attackPhase() !== PHASE.STARTUP) || (this.state === PS.JUMP_ATTACK && this.hitbox);
    if (face !== null && !this.in('noLockFacing') && !released)
      this.yaw = turnToward(this.yaw, Math.atan2(lock.x - this.x, lock.z - this.z), CONFIG.lock.turnRate * dt);

    integrateBody(this, dt, C.knockFriction);
    if (!this.grounded && this.in('falls')) this.setState(PS.FALL);   // walked (or was knocked) off an edge
    if (this.grounded && this.in('airborne') && this.stateTime > 0) this.setState(PS.IDLE);
    if (this.grounded && this.state === PS.JUMP_ATTACK && this.stateTime > 0) {
      // Touchdown: a swing still in wind-up strikes on impact; the hitbox lingers for impactTime.
      const a = this.attack;
      if (!this.hitbox) this.hitbox = new Hitbox(this, a.box, this.payload);
      this.landHit = false; this.landTime = a.recovery;
      this.vx *= C.landKeep; this.vz *= C.landKeep;
      this.setState(PS.LAND);
      events.emit('land', { x: this.x, y: this.y, z: this.z, fx: a.air.fx });
    }
    this.checkFall();
    this.walkPhase += Math.hypot(this.vx, this.vz) * dt * 2.6;
  }
  // After moving: death in a pit, or damage from a hard landing (a brief stumble if it doesn't kill).
  checkFall() {
    if (!this.alive()) return;
    if (this.inPit) { this.hp = 0; this.hitbox = null; this.setState(PS.DEAD); events.emit('fell', { body: this }); return; }
    const dmg = this.fallHeight > 0 ? fallDamage(this.fallHeight) : 0;
    if (dmg <= 0) return;
    this.hp = Math.max(0, this.hp - dmg); this.tint = 1; this.hitbox = null;
    events.emit('fallDamage', { body: this, height: this.fallHeight, damage: Math.min(dmg, this.maxHp) });
    if (this.hp <= 0) { this.setState(PS.DEAD); return; }
    this.stunTime = CONFIG.fall.hurtTime; this.setState(PS.HURT);
  }

  // Damage, block, guard break, hurt and stagger from one strike. Returns { blocked, died }.
  takeHit(strike, from) {
    const B = CONFIG.block, C = CONFIG.player;
    const dx = this.x - from.x, dz = this.z - from.z, d = Math.hypot(dx, dz) || 1;
    let damage = strike.damage, poise = strike.poise, knock = strike.shove ? strike.knock : Math.min(strike.knock, C.knockCap);
    let blocked = false, guardBroken = false;
    if (this.state === PS.BLOCK && !strike.rollOnly && isInFront(this, from.x, from.z)) {   // roll-only goes through the guard
      this.spend(B.staminaBase + strike.damage * B.staminaPerDamage);
      if (this.stamina <= 0) guardBroken = true;
      else { blocked = true; damage *= B.damageMul; poise *= B.poiseMul; knock *= B.knockMul; }
    }
    this.hp = Math.max(0, this.hp - damage);
    this.kx += dx / d * knock; this.kz += dz / d * knock;
    if (blocked) this.brace = 1; else this.tint = 1;
    if (this.hp <= 0) { this.hitbox = null; this.setState(PS.DEAD); return { blocked, died: true }; }
    if (guardBroken) { this.hitbox = null; this.stunTime = B.breakTime; this.poise = this.maxPoise; this.setState(PS.STAGGER); return { blocked: false }; }
    if (blocked) {
      if (poise > 0) { this.poise = Math.max(1, this.poise - poise); this.poiseTimer = 0; }
      return { blocked: true };
    }
    const r = applyPoise(this, poise, this.isCommitted(), this.maxPoise);
    if (r !== POISE.NONE) {   // a jump attack still in its air wind-up is cancelled too
      this.hitbox = null;
      this.stunTime = r === POISE.STAGGER ? C.staggerTime : C.hurtTime;
      this.setState(r === POISE.STAGGER ? PS.STAGGER : PS.HURT);
    }
    return { blocked: false };
  }

  pose(tt, ctx) {
    const r = this.rig, C = CONFIG.player;
    r.reset(); r.setOpacity(1);
    switch (this.state) {
      case PS.IDLE: r.spin.scale.y = 1 + Math.sin(ctx.t * 1.6) * 0.012; r.armL.rotation.z = 0.04; break;
      case PS.WALK: r.walk(this.walkPhase, 0.6); break;
      case PS.JUMP: case PS.FALL:
        r.legL.rotation.x = -0.5; r.legR.rotation.x = 0.3; r.kneeL.rotation.x = 0.9; r.kneeR.rotation.x = 0.5; r.armL.rotation.x = -0.9; r.armR.rotation.x = -0.9; break;
      case PS.ROLL: {
        const p = clamp(tt / C.rollTime, 0, 1), tuck = Math.sin(p * Math.PI);
        r.spin.rotation.x = p * Math.PI * 2;
        r.spin.scale.setScalar(1 - 0.35 * tuck); r.spin.position.y = HIP - 0.4 * tuck;
        r.legL.rotation.x = r.legR.rotation.x = -1.2 * tuck; r.kneeL.rotation.x = r.kneeR.rotation.x = 2.0 * tuck; r.armL.rotation.x = r.armR.rotation.x = -1.2 * tuck;
        break;
      }
      case PS.ATTACK: {
        const tl = attackTimeline(this.attack, tt);
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
      case PS.PARRY: {
        // Quick outward deflection, then an exposed recovery.
        const out = ease(tt / 0.12), back = ease((tt - 0.12) / (CONFIG.parry.time - 0.12));
        const k = out * (1 - back);
        r.armR.rotation.set(lerp(-0.4, -1.7, k), 0, -0.6 * k); r.spin.rotation.y = 0.9 * k;
        r.weapon.rotation.set(lerp(0.5, 0.1, k), 0, 1.0 * k); r.armL.rotation.x = -0.6 * k;
        break;
      }
      case PS.USE_ITEM: {
        const k = Math.sin(clamp(tt / this.usingItem.useTime, 0, 1) * Math.PI);
        r.armL.rotation.set(-2.3 * k, 0, -0.5 * k); r.head.rotation.x = -0.4 * k; break;
      }
      case PS.REST: {
        const k = Math.sin(clamp(tt / CONFIG.rest.time, 0, 1) * Math.PI);
        r.kneel(k); r.lean(0.2 * k); r.head.rotation.x = 0.4 * k; break;
      }
      case PS.HURT: case PS.STAGGER: flinchPose(r, this.state === PS.STAGGER, tt / this.stunTime, tt); break;
      case PS.DEAD: deathPose(r, tt, C.deathFade); break;
    }
    if (this.brace > 0) { r.crouch(0.12 * this.brace); r.tip.rotation.x -= 0.14 * this.brace; }
    if (r.anim) r.anim.updatePlayer(this, tt, ctx);   // a modelled body's secondary motion (js/animator.js), visual only
    r.applyLag(ctx.yaw, Math.hypot(this.vx, this.vz), ctx.dt);
    if (this.state === PS.JUMP_ATTACK && !this.hitbox) r.setWarning(1);   // same telegraph colour as enemy wind-ups
    else r.setFlash(Math.max(this.flash, this.riposte > 0 ? 0.3 : 0));
    r.setTint(HURT_COLOR, this.tint * 0.9);
  }
}
