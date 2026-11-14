'use strict';
// ============================================================================
// 5. Player
// ============================================================================
// Inventory: { itemId: { count, max } }, created from the player definition.
const makeInventory = list => Object.fromEntries(list.map(it => [it.item, { count: it.count, max: it.max }]));

class Player {
  constructor(def, x, z, yaw, y = 0) {
    this.def = def;
    this.ctl = typeof input !== 'undefined' ? input : null;   // where presses come from: the keyboard/pad, or a bot's hands (js/bot.js)
    this.rig = new Rig(def.look);
    this.radius = def.radius; this.height = BODY_HEIGHT * def.look.scale;
    this.maxHp = def.stats.maxHp; this.maxStamina = def.stats.maxStamina; this.maxPoise = def.stats.maxPoise;
    this.inventory = makeInventory(def.inventory);
    this.x = x; this.y = y; this.z = z; this.yaw = yaw;
    this.vx = this.vy = this.vz = 0; this.kx = this.kz = 0;
    this.grounded = true; this.peak = y; this.fallHeight = 0; this.inPit = false;   // see integrateBody
    this.hp = this.maxHp; this.stamina = this.maxStamina; this.poise = this.maxPoise;
    this.exhausted = false; this.sinceExhausted = Infinity;   // see spend and canAct
    this.staminaDelay = 0; this.poiseTimer = 0; this.tint = 0; this.flash = 0; this.brace = 0; this.walkPhase = 0;
    this.riposte = 0;      // timer: > 0 while a riposte is available after a successful parry
    this.state = PS.IDLE; this.stateTime = 0;
    this.attack = null; this.payload = null; this.hitbox = null; this.stunTime = 0; this.usingItem = null;
    this.activeAt = Infinity; this.landTime = 0; this.landHit = false;
    // Ground attacks run on their own clock (attackT), which stops while a heavy is held to charge (chargeT s so far).
    this.attackT = 0; this.chargeT = 0; this.charge = 0;   // charge: 0 not yet, 1 holding, 2 released (or none)
    this.buffer = null;   // { action, time }: the one remembered press (Souls-style; see bufferInputs)
    this.comboFrom = null; this.comboTimer = 0;   // the attack just finished, whose `next` a quick press still follows
    this.exec = null; this.execGrace = 0;   // a running execution (js/execution.js), and the untouchable time after one
    this.doomTime = 0; this.doomDrain = 0;   // Destined Death (v5.8): s left of the health cut, and HP still to drain
    // Boss Rush's abilities (js/abilities.js): the kit they make, its perks' clocks, and who settles its powers (a
    // server bot's own; unset, abilityReport finds it). lastHp: the health last step, so losing any is noticed.
    this.kit = NO_KIT; this.perk = abilityPerkState(); this.onAbility = null; this.lastHp = this.hp; this.lowReported = false;
    this.rent = 0; this.rentTime = 0; this.rentBy = null;   // a rend (pass 48): pieces torn off the bar, s until it closes, who holds them
    this.savePrev();
  }
  // Boss Rush's abilities (ABILITIES): the kit of the ids held (one per pick, repeated by upgrades), with the health
  // and stamina it gives, both full. Called once, on a fresh body.
  grantAbilities(ids) {
    this.kit = abilityKit(ids);
    const S = this.def.stats, m = this.kit.mods;
    this.maxHp = S.maxHp * (1 + m.maxHp); this.maxStamina = S.maxStamina * (1 + m.maxStamina);
    this.hp = this.lastHp = this.maxHp; this.stamina = this.maxStamina;
  }
  // Last Breath (a `low/freeStamina` perk): this low, rolls and attacks cost nothing.
  freeStamina() { const v = this.kit.perks['low/freeStamina']; return !!v && this.hp > 0 && this.hp <= this.maxHp * v.below; }
  // A flask drunk this many times as fast (Quick Draught).
  drinkRate() { return 1 + (this.kit ? this.kit.mods.flaskSpeed : 0); }
  alive() { return this.state !== PS.DEAD; }
  in(group) { return PLAYER_GROUPS[group].has(this.state); }
  isFree() { return this.in('free'); }
  isAttacking() { return this.in('attacking'); }
  savePrev() { this.px = this.x; this.py = this.y; this.pz = this.z; this.pyaw = this.yaw; }
  setState(s) { if (s !== PS.FALL) this.dropped = false; this.state = s; this.stateTime = 0; }
  // Emptying the bar exhausts the player (CONFIG.player.exhaustDelay, exhaustRecover): a longer wait before it refills,
  // and no stamina action until it is back to exhaustRecover.
  spend(amount) {
    this.stamina = Math.max(0, this.stamina - amount); this.staminaDelay = CONFIG.player.staminaDelay;
    if (amount > 0 && this.stamina <= 0) { this.exhausted = true; this.staminaDelay = CONFIG.player.exhaustDelay; }
  }
  // May start a roll, attack, parry or jump: any stamina at all (one emergency roll or swing), unless exhausted.
  canAct() {
    if (this.exhausted && this.stamina >= CONFIG.player.exhaustRecover) this.exhausted = false;
    return this.stamina > 0 && !this.exhausted;
  }
  // A stamina action pressed while exhausted: swallowed, and announced so the HUD can say why nothing happened.
  refuseIfExhausted(actions) {
    if (this.canAct() || !actions.some(a => this.ctl.consume(a))) return;
    events.emit('staminaDenied', { player: this });
  }
  attackPhase() { return attackTimeline(this.attack, this.attackT).phase; }
  // Rolling (its i-frames), or executing and just after (every source: blows, bolts, shockwaves).
  // The health ceiling: the maximum, less Destined Death's cut while it lasts (CONFIG.bossPowers.destined).
  // Less, too, every piece a rending hook holds of it (CONFIG.rend, Player.rend).
  hpCap() {
    const doom = this.doomTime > 0 ? CONFIG.bossPowers.destined.cut : 0;
    return this.maxHp * Math.max(0.05, 1 - doom - this.rent * CONFIG.rend.cut);
  }
  invulnerable() { return (this.state === PS.ROLL && this.stateTime < CONFIG.player.rollIFrames * (1 + (this.kit?.mods.rollIFrames || 0))) || this.state === PS.EXECUTE || this.execGrace > 0; }
  // A swing already out is not interrupted by hits.
  isCommitted() {
    return (this.state === PS.ATTACK && this.attackPhase() === PHASE.ACTIVE) || (this.state === PS.JUMP_ATTACK && !!this.hitbox);
  }
  item(id) { return this.inventory[id] || { count: 0, max: 0 }; }
  refillItems() { for (const [id, it] of Object.entries(this.inventory)) if (ITEMS[id].refillOnRest) it.count = it.max; }

  canRoll() { return this.canAct(); }
  // A roll is wanted now: a queued press, or a fresh one (only consumed if a roll is possible).
  // A queued roll that can't happen the moment it's allowed (no stamina, or exhausted) is dropped, never held.
  wantsRoll() {
    const buffered = this.buffer && this.buffer.action === 'roll';
    if (!this.canRoll()) { if (buffered) this.buffer = null; return false; }
    return buffered || this.ctl.consume('roll');
  }
  // Seconds until `action` (roll or a ground attack) could come out of the current state; Infinity if it cannot.
  untilAllowed(action) {
    const C = CONFIG.player, t = this.stateTime;
    switch (this.state) {
      case PS.ATTACK: return this.charge === 1 ? Infinity : Math.max(0, phaseSpan(this.attack, 'recovery')[0] - this.attackT);
      case PS.ROLL: return C.rollTime - t;
      case PS.LAND: return action === 'roll' ? Math.max(0, this.attack.air.impactTime - t) : this.landTime - t;
      case PS.HURT: case PS.STAGGER: return this.stunTime - t;
      case PS.PARRY: return CONFIG.parry.time - t;
      case PS.USE_ITEM: return (this.usingItem.useTime - t * this.drinkRate()) / this.drinkRate();
      default: return Infinity;
    }
  }
  // Souls-style input buffer: while busy, a roll or attack press is remembered only if it comes within bufferWindow s
  // of the moment that action becomes possible (earlier presses, mashing, are dropped). One slot: the latest press
  // replaces the one before. It comes out at the first frame the action is allowed.
  bufferInputs() {
    const C = CONFIG.player;
    if (this.buffer && (this.buffer.time -= CONFIG.step) <= 0) this.buffer = null;
    if (!this.in('buffers')) return;
    for (const action of ['roll', ...Object.keys(this.def.moveset.ground)]) {
      if (!this.ctl.consume(action)) continue;
      const wait = this.untilAllowed(action);
      if (wait <= C.bufferWindow) this.buffer = { action, time: wait + C.bufferGrace };
    }
  }
  startRoll(mv) {
    this.buffer = null;
    if (mv.has) this.yaw = Math.atan2(mv.x, mv.z);
    const cost = CONFIG.player.rollCost * (1 - this.kit.mods.rollCost);   // Light Step
    if (!this.freeStamina()) this.spend(Math.max(cost, this.stamina - cost < 1 ? this.stamina : 0));   // (all but) empty: exhausted
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
    this.attack = a; this.attackT = 0; this.chargeT = 0; this.charge = a.charge ? 0 : 2;
    this.payload = makeStrike(a, this.riposte > 0, 0);
    if (a.charge && this.perk.bastion > 0) {   // Bastion: a blocked blow readied this heavy, fully charged at once
      this.perk.bastion = 0; this.chargeT = a.charge.hold; this.charge = 2; this.payload = makeStrike(a, this.payload.riposte, 1);
      events.emit('chargeFull', { actor: this, attack: a }); events.emit('abilityPerk', { body: this, perk: 'block/charge' });
    }
    this.riposte = 0;
    if (!this.freeStamina()) this.spend(a.cost || 0);
    this.hitbox = null;
  }
  // The attack an input starts: the follow-up of a combo still running (or just ended), else the opener.
  nextAttack(action) {
    const M = this.def.moveset, from = this.comboFrom;
    return M.attacks[(from && from.next && from.next[action]) || M.ground[action]];
  }
  startAttack(a, mv, face, enemies) {
    this.beginAttack(a, mv, face, enemies); this.setState(PS.ATTACK);
    this.buffer = null; this.comboFrom = null; this.chainPose = null;
  }
  startParry() { this.spend(CONFIG.parry.cost); this.hitbox = null; this.setState(PS.PARRY); }
  useItem(id) {
    this.inventory[id].count--;
    this.usingItem = ITEMS[id]; this.vx = this.vz = 0;
    this.setState(PS.USE_ITEM);
    events.emit('itemUsed', { item: id, player: this });
    if (id !== 'flask') return;
    const wind = this.kit.perks['flask/stamina'];   // Second Wind
    if (wind) { this.stamina = Math.min(this.maxStamina, this.stamina + this.maxStamina * wind.stamina); events.emit('abilityPerk', { body: this, perk: 'flask/stamina' }); }
    abilityReport(this, 'flask', {});   // Ember Twin
  }
  // Free on the ground: start the first action whose input is pressed. Returns true if one started.
  tryGroundAction(mv, face, enemies) {
    const C = CONFIG.player, M = this.def.moveset;
    // Light attack beside a kneeling enemy, in front of it: an execution instead of a cut (js/execution.js). It costs
    // no stamina, so it comes before the exhaustion check: even an exhausted player can execute.
    const victim = execution.target(this, enemies);
    if (victim && ((this.buffer && this.buffer.action === 'light') || this.ctl.consume('light'))) { execution.start(this, victim); return true; }
    this.refuseIfExhausted(['roll', 'parry', 'jump', ...Object.keys(M.ground)]);
    if (this.wantsRoll()) { this.startRoll(mv); return true; }
    if (this.canAct() && this.ctl.consume('parry')) { this.startParry(); return true; }
    const queued = this.buffer && this.buffer.action;
    for (const action of Object.keys(M.ground)) {
      if (this.canAct() && (queued === action || this.ctl.consume(action))) { this.startAttack(this.nextAttack(action), mv, face, enemies); return true; }
    }
    for (const [id, item] of Object.entries(ITEMS)) {
      if (this.item(id).count > 0 && this.ctl.consume(item.action)) { this.useItem(id); return true; }
    }
    if (this.canAct() && this.ctl.consume('jump')) { this.spend(C.jumpCost); this.vy = C.jumpVelocity; this.setState(PS.JUMP); return true; }
    if (this.ctl.isHeld('block')) { this.setState(PS.BLOCK); return true; }
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
    this.execGrace = Math.max(0, this.execGrace - dt);
    if (this.doomTime > 0) this.updateDoom(dt);
    if (this.rent > 0) this.updateRent(dt);
    if ((this.comboTimer -= dt) <= 0) this.comboFrom = null;
    this.bufferInputs();
    this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    this.canAct(); this.sinceExhausted = this.exhausted ? 0 : this.sinceExhausted + dt;
    if (!this.in('noRegen') && this.staminaDelay <= 0) this.stamina = Math.min(this.maxStamina, this.stamina + C.staminaRegen * (1 + this.kit.mods.staminaRegen) * dt);
    if (this.kit !== NO_KIT) this.abilityStep(dt);
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
        if (this.dropped) for (const a in M.air) this.ctl.consume(a);   // a fall from a grip: struggle presses are not plunges
        else if (this.canAct()) {
          const action = Object.keys(M.air).find(a => this.ctl.consume(a));
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
          events.emit('attackPhase', { actor: this, attack: a, phase: PHASE.ACTIVE, hitIndex: 0 });   // driving down: the swing sound
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
        if (this.stateTime >= C.rollTime) { this.vx *= C.rollExitKeep; this.vz *= C.rollExitKeep; this.setState(PS.IDLE); }
        break;
      }
      case PS.ATTACK: {
        const a = this.attack, t0 = this.attackT, ch = a.charge;
        // Heavy charge: held at `at` of the wind-up for up to `hold` s while the button stays down; released, it
        // carries on, harder by how long it was held.
        if (ch && this.charge === 1) {
          if (this.ctl.isHeld(ch.action) && this.chargeT < ch.hold) {
            this.chargeT = Math.min(ch.hold, this.chargeT + dt * (1 + this.kit.mods.chargeSpeed));   // Swift Charge
            if (this.chargeT >= ch.hold) events.emit('chargeFull', { actor: this, attack: a });
          } else { this.charge = 2; this.payload = makeStrike(a, this.payload.riposte, this.chargeT / ch.hold); }
        }
        if (this.charge !== 1) this.attackT += dt;
        if (ch && this.charge === 0 && this.attackT >= a.hits[0].startup * ch.at) {
          if (this.ctl.isHeld(ch.action)) { this.attackT = a.hits[0].startup * ch.at; this.charge = 1; } else this.charge = 2;
        }
        const tl = attackTimeline(a, this.attackT), prev = attackTimeline(a, t0);
        emitAttackEvents(this, a, t0, this.attackT);
        // Commitment: only a slight steer during the wind-up (locked on, it turns as slowly), none once the swing is out.
        if (tl.phase === PHASE.STARTUP && face === null && mv.has) this.yaw = turnToward(this.yaw, Math.atan2(mv.x, mv.z), C.attackSteer * dt);
        // A fresh hitbox (and hit list) for each strike of the attack.
        if (tl.phase === PHASE.ACTIVE && (prev.phase !== PHASE.ACTIVE || prev.hitIndex !== tl.hitIndex))
          this.hitbox = new Hitbox(this, a.box, this.payload);
        if (tl.phase !== PHASE.ACTIVE) this.hitbox = null;
        // A chargeable swing lunges only after its charge point, and a held charge plants the feet.
        const lungeFrom = ch ? Math.max(C.lungeStart, ch.at) : C.lungeStart;
        const lunging = this.charge !== 1 && (tl.phase === PHASE.ACTIVE || (tl.phase === PHASE.STARTUP && tl.p > lungeFrom));
        approachVel(this, lunging ? fx * a.lunge : 0, lunging ? fz * a.lunge : 0, C.accel * dt);
        // Recovery is the cancel point: a buffered (or fresh) roll, else a buffered attack, which chains the combo.
        if (tl.phase === PHASE.RECOVERY && this.wantsRoll()) { this.startRoll(mv); break; }
        if (tl.phase === PHASE.RECOVERY && this.buffer && this.buffer.action === 'light') {   // the combo broke its stance
          const victim = execution.target(this, enemies);
          if (victim) { execution.start(this, victim); break; }
        }
        if (tl.phase === PHASE.RECOVERY && this.buffer && this.canAct()) {
          this.comboFrom = a; this.startAttack(this.nextAttack(this.buffer.action), mv, face, enemies); this.chainPose = attackEndPose(a); break;
        }
        if (tl.done) { this.comboFrom = a; this.comboTimer = C.comboGrace; this.setState(PS.IDLE); }
        break;
      }
      case PS.BLOCK: {
        const bs = C.walkSpeed * C.blockSpeedMul;
        approachVel(this, mv.x * bs, mv.z * bs, (mv.has ? C.accel : C.decel) * dt);
        this.refuseIfExhausted(['roll']);
        if (this.wantsRoll()) { this.startRoll(mv); break; }   // roll straight out of a guard
        // Parry from block only commits if an attack is about to land; otherwise the press is ignored.
        if (this.ctl.consume('parry')) {
          if (this.canAct() && enemies.some(e => parryTiming(this, e, CONFIG.parry.arm) !== null)) { this.startParry(); break; }
        }
        if (!this.ctl.isHeld('block')) this.setState(PS.IDLE);
        break;
      }
      case PS.PARRY: {
        approachVel(this, 0, 0, C.decel * dt);
        if (this.stateTime >= CONFIG.parry.time) this.setState(PS.IDLE);   // whiffed: recovery over
        break;
      }
      case PS.USE_ITEM: {
        const I = this.usingItem, rate = this.drinkRate();   // Quick Draught: the whole drink runs faster
        approachVel(this, 0, 0, C.decel * dt);
        if (I.heal) {   // heal spread over [healStart, healStart + healDuration]
          const t0 = (this.stateTime - dt) * rate, t1 = this.stateTime * rate;
          const healed = clamp(t1 - I.healStart, 0, I.healDuration) - clamp(t0 - I.healStart, 0, I.healDuration);
          this.hp = Math.min(this.hpCap(), this.hp + I.heal * healed / I.healDuration);
        }
        if (this.stateTime * rate >= I.useTime) this.setState(PS.IDLE);
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
      case PS.EXECUTE: execution.update(this, dt); break;
      case PS.HELD: this.updateHeld(dt); break;
      case PS.DEAD: approachVel(this, 0, 0, C.decel * dt); break;
    }
    if (this.state === PS.HELD) { this.walkPhase = 0; return; }   // carried: no physics of its own
    // Locked on: keep facing the target, except while committed to a roll or a swing already released.
    const released = (this.state === PS.ATTACK && this.attackPhase() !== PHASE.STARTUP) || (this.state === PS.JUMP_ATTACK && this.hitbox);
    if (face !== null && !this.in('noLockFacing') && !released)
      this.yaw = turnToward(this.yaw, Math.atan2(lock.x - this.x, lock.z - this.z), (this.state === PS.ATTACK ? C.attackSteer : CONFIG.lock.turnRate) * dt);

    integrateBody(this, dt, C.knockFriction, this.state === PS.EXECUTE);   // an execution never slides off a ledge
    if (!this.grounded && this.in('falls')) this.setState(PS.FALL);   // walked (or was knocked) off an edge
    if (this.grounded && this.in('airborne') && this.stateTime > 0) this.setState(PS.IDLE);
    if (this.grounded && this.state === PS.JUMP_ATTACK && this.stateTime > 0) {
      // Touchdown: a swing still in wind-up strikes on impact; the hitbox lingers for impactTime.
      const a = this.attack;
      if (!this.hitbox) this.hitbox = new Hitbox(this, a.box, this.payload);
      this.landHit = false; this.landTime = a.recovery;
      this.vx *= C.landKeep; this.vz *= C.landKeep;
      this.setState(PS.LAND);
      events.emit('land', { player: this, x: this.x, y: this.y, z: this.z, fx: a.air.fx });
      abilityReport(this, 'land', { x: this.x, y: this.y, z: this.z, action: Object.keys(M.air).find(k => M.air[k] === a.id) });   // Meteor Fall
    }
    this.checkFall();
    this.walkPhase += Math.hypot(this.vx, this.vz) * dt * 2.6;
  }
  // A step of the kit's perks: health lost wakes Vengeance and resets the calm and the streak, the clocks run, and a
  // body this low first reports it (Blood Moon).
  abilityStep(dt) {
    const st = this.perk;
    if (this.hp < this.lastHp - 1e-9) abilityHurt(this.kit, st);
    this.lastHp = this.hp;
    abilityClocks(st, dt);
    if (!this.lowReported && this.alive()) for (const pw of this.kit.powers) {
      if (pw.when === 'low' && this.hp <= this.maxHp * pw.v.below) { this.lowReported = true; abilityReport(this, 'low', {}); }
    }
  }
  // Hazard floors (v7.0, a level's `hazards`: the Haligtree's scarlet rot): standing in one, on its floor, costs `dps`
  // health a second; untouchable frames (an execution, a roll's i-frames) keep it off. `timers` (a Map per body) paces
  // the `hazard` tick event. Returns true if it killed this body (`hazardDeath` then).
  standInHazards(dt, timers) {
    let died = false;
    for (const h of world.hazards) {
      const on = this.alive() && this.grounded && !this.invulnerable() && inRect(h.rect, this.x, this.z) && Math.abs(this.y - h.y) < CONFIG.height.stepUp;
      let timer = on ? (timers.get(h) || 0) + dt : 0;
      if (on) {
        this.hp = Math.max(0, this.hp - h.dps * dt);
        if (timer >= CONFIG.hazards.tick) { timer -= CONFIG.hazards.tick; this.tint = Math.max(this.tint, 0.5); events.emit('hazard', { hazard: h, player: this }); }
        if (this.hp <= 0) { this.die(); died = true; events.emit('hazardDeath', { hazard: h, player: this }); }
      }
      timers.set(h, timer);
    }
    return died;
  }
  // Every way of dying ends here (blows, falls, pits, Destined Death's drain, hazard floors): no health, no hitbox,
  // the death state. The mode that owns this body notices the change (Game.update: onPlayerDeath).
  die() { if (this.exec) execution.abandon(this); if (this.held) this.releaseHold(false); this.hp = 0; this.hitbox = null; this.setState(PS.DEAD); }
  // After moving: death in a pit, or damage from a hard landing (a brief stumble if it doesn't kill).
  checkFall() {
    if (!this.alive()) return;
    if (this.inPit) { this.die(); events.emit('fell', { body: this }); return; }
    const dmg = this.fallHeight > 0 ? fallDamage(this.fallHeight) : 0;
    if (dmg <= 0) return;
    this.hp = Math.max(0, this.hp - dmg); this.tint = 1; this.hitbox = null;
    events.emit('fallDamage', { body: this, height: this.fallHeight, damage: Math.min(dmg, this.maxHp) });
    if (this.hp <= 0) { this.die(); return; }
    this.stunTime = CONFIG.fall.hurtTime; this.setState(PS.HURT);
  }

  // Destined Death (v5.8): the health ceiling stays cut while it lasts, and the drain runs out over `drainTime`.
  updateDoom(dt) {
    const D = CONFIG.bossPowers.destined;
    this.doomTime = Math.max(0, this.doomTime - dt);
    if (!this.alive()) return;
    if (this.doomDrain > 0) {
      const d = Math.min(this.doomDrain, this.maxHp * D.drain / D.drainTime * dt);
      this.doomDrain -= d; this.hp -= d;
    }
    this.hp = Math.min(this.hp, this.hpCap());
    if (this.hp <= 0) this.die();
  }
  // A rend (pass 48, Mother Agathe; an attack's `rend` or her phase's): an unblocked blow of the hook tears a piece off the
  // health bar (CONFIG.rend.cut of the maximum, at most `max` pieces) and she keeps it on the hook. Every blow landed on
  // her tears one back, as health (Player.reclaim); left there, the wound closes after `time` s from the last tear and the
  // bar comes back empty. When she falls, everything she held comes back as health.
  rend(by) {
    const R = CONFIG.rend;
    if (this.rentBy && this.rentBy !== by) this.closeRent();   // one holder at a time
    this.rentBy = by; this.rentTime = R.time;
    if (this.rent < R.max) { this.rent++; events.emit('rend', { body: this, enemy: by, piece: this.rent }); }
    this.hp = Math.min(this.hp, this.hpCap());
  }
  reclaim(all = false) {
    if (this.rent <= 0) return;
    const n = all ? this.rent : 1, by = this.rentBy;
    this.rent -= n;
    if (this.alive()) this.hp = Math.min(this.hpCap(), this.hp + n * CONFIG.rend.cut * this.maxHp);
    events.emit('reclaim', { body: this, enemy: by, pieces: n, left: this.rent });
    if (this.rent <= 0) { this.rentBy = null; this.rentTime = 0; }
  }
  closeRent() {
    if (this.rent > 0) events.emit('rentClosed', { body: this, enemy: this.rentBy, pieces: this.rent });
    this.rent = 0; this.rentTime = 0; this.rentBy = null;
  }
  updateRent(dt) {
    const by = this.rentBy;
    if (!this.alive()) { this.closeRent(); return; }
    if (!by || !by.alive()) { this.reclaim(true); return; }   // she fell: all of it comes back
    if ((this.rentTime -= dt) <= 0) this.closeRent();
  }
  // A seize (pass 72, the Giant Skeleton's hand; a hit's `seize`): caught, you are carried from where you stood to `at`
  // ([side, up, fwd] m from him, along his facing) over `lift` s and held there, burning `dps` a second, for at most `time`
  // s. Every strike, roll or parry pressed in his grip wins back `escape` s. The grip breaks too when he stops the attack
  // that holds you (a break of his posture, a parry, a phase, his death): a friend can free you. Out of it, you are flung
  // `throw` m/s away from him and fall.
  seize(by, S, attackId) {
    if (this.exec) execution.abandon(this);
    const yaw = by.yaw, s = Math.sin(yaw), c = Math.cos(yaw), dx = this.x - by.x, dz = this.z - by.z;
    // Where you were caught, in his frame: the carry starts there.
    this.held = { by, S, attackId, left: S.time, from: [dx * c - dz * s, this.y - by.y, dx * s + dz * c] };
    this.hitbox = null; this.buffer = null; this.vx = this.vy = this.vz = 0; this.kx = this.kz = 0;
    this.setState(PS.HELD);
    events.emit('seized', { body: this, enemy: by });
  }
  // The hold, one step: carried, burned and struggling; out of it once the time is up or his attack ends.
  updateHeld(dt) {
    const H = this.held;
    if (!H) { this.setState(PS.FALL); return; }   // a body told it is held with no grip on it (a stale frame)
    const by = H.by, S = H.S;
    for (const a of ['light', 'heavy', 'roll', 'parry']) if (this.ctl && this.ctl.consume(a)) { H.left -= S.escape; events.emit('struggle', { body: this, enemy: by }); }
    H.left -= dt;
    this.hp = Math.max(0, this.hp - S.dps * dt);
    if (this.hp <= 0) { this.held = null; this.die(); return; }
    const gripping = by.alive() && (by.state === ES.ACTIVE || by.state === ES.RECOVER) && by.attack && by.attack.id === H.attackId;
    if (H.left <= 0 || !gripping) { this.releaseHold(gripping && this.stateTime >= S.time - 1e-6); return; }   // thrown only when he lets go himself
    const k = S.lift > 0 ? Math.min(1, this.stateTime / S.lift) : 1, e = 1 - (1 - k) * (1 - k) * (1 - k);   // out-cubic
    const lx = H.from[0] + (S.at[0] - H.from[0]) * e, ly = H.from[1] + (S.at[1] - H.from[1]) * e, lz = H.from[2] + (S.at[2] - H.from[2]) * e;
    const s = Math.sin(by.yaw), c = Math.cos(by.yaw);
    this.x = by.x + lx * c + lz * s; this.z = by.z - lx * s + lz * c; this.y = by.y + ly;
    this.clampFrom(by);
    this.yaw = by.yaw + Math.PI;   // facing him
    this.vx = this.vy = this.vz = 0; this.kx = this.kz = 0; this.grounded = false; this.peak = this.y;
  }
  // Kept in the world as if moved there from his body: his hand never carries you through a closed gate or a wall
  // (the world's clamp decides the side of a gate from where you were).
  clampFrom(by) {
    const ox = this.px, oz = this.pz; this.px = by.x; this.pz = by.z;
    clampToWorld(this);
    this.px = ox; this.pz = oz;
  }
  // Out of a grip, falling from where he held you: `thrown` (he let go himself) flung away from him, else only dropped.
  releaseHold(thrown) {
    const H = this.held; this.held = null;
    if (!H) return;
    const dx = this.x - H.by.x, dz = this.z - H.by.z, d = Math.hypot(dx, dz) || 1, t = thrown ? H.S.throw : 0;
    this.kx = dx / d * t; this.kz = dz / d * t;
    this.clampFrom(H.by);
    this.grounded = false; this.peak = this.y; this.vy = 0;
    this.setState(PS.FALL); this.dropped = true;
    events.emit('seizeEnd', { body: this, enemy: H.by, thrown });
  }
  // Damage, block, guard break, hurt and stagger from one strike. Returns { blocked, died }.
  takeHit(strike, from) {
    const B = CONFIG.block, C = CONFIG.player;
    this.hitK = clamp(strike.damage / CONFIG.fx.flinchRef, 0.5, 1.6);   // how big the flinch looks
    const dx = this.x - from.x, dz = this.z - from.z, d = Math.hypot(dx, dz) || 1;
    let damage = strike.damage, poise = strike.poise, knock = strike.shove ? strike.knock : Math.min(strike.knock, C.knockCap);
    let blocked = false, guardBroken = false;
    if (this.state === PS.BLOCK && !strike.rollOnly && isInFront(this, from.x, from.z)) {   // roll-only goes through the guard
      this.spend(B.staminaBase + strike.damage * B.staminaPerDamage);
      if (this.stamina <= 0) guardBroken = true;
      else { blocked = true; damage *= B.damageMul; poise *= B.poiseMul; knock *= B.knockMul; }
    }
    this.hp = Math.max(0, this.hp - damage);
    if (this.state === PS.HELD) {   // already in a grip: the blow hurts, but nothing throws you out of it
      this.tint = 1;
      if (this.hp <= 0) { this.die(); return { blocked: false, died: true }; }
      return { blocked: false };
    }
    if (strike.seize && !blocked && strike.seizeBy && this.hp > 0) { this.tint = 1; this.seize(strike.seizeBy, strike.seize, strike.seizeAttack); return { blocked: false }; }
    if (strike.pull && !blocked) {   // pass 63, a hook: dragged in to `pull` m from him instead of thrown back (the knock glides knock / friction m)
      const k = Math.max(0, d - strike.pull) * C.knockFriction;
      this.kx = -dx / d * k; this.kz = -dz / d * k;
    } else { this.kx += dx / d * knock; this.kz += dz / d * knock; }
    if (blocked) this.brace = 1; else this.tint = 1;
    if (this.hp <= 0) { this.die(); return { blocked, died: true }; }
    if (strike.rend && !blocked && strike.rendBy) this.rend(strike.rendBy);
    if (strike.destined && !blocked) {   // a new hit restarts the cut (it never stacks) and the drain
      const D = CONFIG.bossPowers.destined;
      this.doomTime = D.time; this.doomDrain = this.maxHp * D.drain; this.hp = Math.min(this.hp, this.hpCap());
      events.emit('destinedDeath', { body: this });
    }
    if (guardBroken) { this.hitbox = null; this.stunTime = B.breakTime; this.poise = this.maxPoise; this.setState(PS.STAGGER); return { blocked: false }; }
    if (blocked) {
      const bastion = this.kit.perks['block/charge'];
      if (bastion) this.perk.bastion = bastion.window;
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
    let glint = -1; this.chargeGlow = 0;   // set by a key-posed attack; -1 leaves the animator's own glint
    r.reset(); r.setOpacity(1);
    switch (this.state) {
      case PS.IDLE: r.spin.scale.y = 1 + Math.sin(ctx.t * 1.6) * 0.012; r.armL.rotation.z = 0.04; r.weightLean(this.vx, this.vz, ctx.yaw, ctx.dt); break;
      case PS.WALK: r.walk(this.walkPhase, 0.6); r.weightLean(this.vx, this.vz, ctx.yaw, ctx.dt); break;
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
        const at = this.charge === 1 ? this.attackT : this.attackT + (tt - this.stateTime), ch = this.attack.charge;
        if (this.attack.pose) {   // four-phase key poses (js/attack-anim.js)
          const k = ch ? this.chargeT / ch.hold : 0;
          glint = poseAttackKeys(r, this.attack, at, k, this.chainPose);
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
      case PS.PARRY: {
        // Quick outward deflection, then an exposed recovery.
        const out = ease(tt / 0.12), back = ease((tt - 0.12) / (CONFIG.parry.time - 0.12));
        const k = out * (1 - back);
        r.armR.rotation.set(lerp(-0.4, -1.7, k), 0, -0.6 * k); r.spin.rotation.y = 0.9 * k;
        r.weapon.rotation.set(lerp(0.5, 0.1, k), 0, 1.0 * k); r.armL.rotation.x = -0.6 * k;
        break;
      }
      case PS.USE_ITEM: {
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
    if (r.anim) r.anim.updatePlayer(this, tt, ctx, glint);   // a modelled body's secondary motion (js/animator.js), visual only
    r.applyLag(ctx.yaw, Math.hypot(this.vx, this.vz), ctx.dt);
    if (this.state === PS.JUMP_ATTACK && !this.hitbox) r.setWarning(1);   // same telegraph colour as enemy wind-ups
    else r.setFlash(Math.max(this.flash, this.riposte > 0 ? 0.3 : 0, this.chargeGlow));
    r.setTint(HURT_COLOR, this.tint * 0.9);
  }
}
