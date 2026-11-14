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
    // No exhaustion since the rework (pass 85): kept false, as network frames and the HUD still carry it.
    this.exhausted = false; this.sinceExhausted = Infinity;
    this.staminaDelay = 0; this.poiseTimer = 0; this.tint = 0; this.flash = 0; this.brace = 0; this.walkPhase = 0;
    this.riposte = 0; this.flashDist = 0; this.phasing = false;      // riposte: timer: > 0 while the next blow is a riposte (after a deflect that opened a foe, or a perfect dodge)
    this.dashes = CONFIG.player.dashCharges;   // dash charges held (fractional while one comes back)
    // The deflect (CONFIG.parry): s left of an armed press, s of the spam lock, and the blow deflected last ({ enemy, key }):
    // a deflected blow whose hitbox opens a moment later never lands.
    this.deflect = 0; this.deflectLock = 0; this.deflectedBlow = null;
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
  // Last Breath (a `low/freeStamina` perk): this low, dashes cost no charge.
  freeStamina() { const v = this.kit.perks['low/freeStamina']; return !!v && this.hp > 0 && this.hp <= this.maxHp * v.below; }
  // A flask drunk this many times as fast (Quick Draught).
  drinkRate() { return 1 + (this.kit ? this.kit.mods.flaskSpeed : 0); }
  alive() { return this.state !== PS.DEAD; }
  in(group) { return PLAYER_GROUPS[group].has(this.state); }
  isFree() { return this.in('free'); }
  isAttacking() { return this.in('attacking'); }
  savePrev() { this.px = this.x; this.py = this.y; this.pz = this.z; this.pyaw = this.yaw; }
  setState(s) { if (s !== PS.FALL) this.dropped = false; this.state = s; this.stateTime = 0; }
  // The guard (the `stamina` bar): only blocked blows wear it down; it refills after CONFIG.player.staminaDelay s.
  spend(amount) {
    this.stamina = Math.max(0, this.stamina - amount); this.staminaDelay = CONFIG.player.staminaDelay;
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

  // A dash needs a whole charge (Last Breath: none).
  canRoll() { return this.dashes >= 1 || this.freeStamina(); }
  // A dash is wanted now: a queued press, or a fresh one (only consumed if a dash is possible).
  // A queued dash that can't happen the moment it's allowed (no charge) is dropped, never held.
  wantsRoll() {
    const buffered = this.buffer && this.buffer.action === 'roll';
    if (!this.canRoll()) { if (buffered) this.buffer = null; return false; }
    return buffered || this.ctl.consume('roll');
  }
  // Seconds until `action` (roll or a ground attack) could come out of the current state; Infinity if it cannot.
  untilAllowed(action) {
    const C = CONFIG.player, t = this.stateTime;
    switch (this.state) {
      case PS.ATTACK: return this.charge === 1 ? Infinity : Math.max(0, (action === 'roll' ? phaseSpan(this.attack, 'follow', 0) : phaseSpan(this.attack, 'recovery'))[0] - this.attackT);   // a dash cancels once the blow is out
      case PS.ROLL: return C.rollTime - t;
      case PS.LAND: return action === 'roll' ? Math.max(0, this.attack.air.impactTime - t) : this.landTime - t;
      case PS.HURT: case PS.STAGGER: return this.stunTime - t;
      case PS.USE_ITEM: return (this.usingItem.useTime - t * this.drinkRate()) / this.drinkRate();
      default: return Infinity;
    }
  }
  // Cancels (pass 85): once an attack's blow is out (past its wind-up, and not holding a charge), a dash or a deflect
  // cuts the rest of it short.
  cancellable() { return this.state === PS.ATTACK && this.charge !== 1 && this.attackPhase() !== PHASE.STARTUP && this.attackPhase() !== PHASE.ACTIVE; }   // the blow has had its frames
  // A deflect press (block, or the old parry action a bot's hands still press): armed for CONFIG.parry.arm s, unless a
  // press that deflected nothing came within `spamLock` s before it. Returns true if a press was taken.
  pressDeflect() {
    const pressed = this.ctl.consume('block') | this.ctl.consume('parry');
    if (!pressed) return false;
    if (this.deflectLock <= 0) { this.deflect = CONFIG.parry.arm; events.emit('deflectPress', { player: this }); }
    this.deflectLock = CONFIG.parry.spamLock;
    return true;
  }
  // The deflect worked (resolveCombat): the lock clears, so the next blow of a string can be deflected too.
  deflected(enemy, key, opened) {
    this.deflect = 0; this.deflectLock = 0; this.flash = 1;
    this.deflectedBlow = { enemy, key };
    if (opened) this.openCounter(CONFIG.parry.riposteTime, 'deflect', enemy);
  }
  // A counter opens (pass 95): after a perfect dodge or a deflect that left the foe open, the next blow within `time` s is
  // the counter. A window opened fresh is announced once (`counterOpen`: its sound, slow beat, marks and key hint);
  // one opened again while open only runs longer.
  openCounter(time, from, foe) {
    const was = this.riposte;
    this.riposte = Math.max(this.riposte, time);
    if (!(was > 0)) events.emit('counterOpen', { player: this, from, foe, time: this.riposte });
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
    if (!this.freeStamina()) this.dashes = Math.max(0, this.dashes - 1);
    this.hitbox = null; this.chainPose = null; this.setState(PS.ROLL);
    events.emit('dash', { player: this });
  }
  // Dash charges come back one at a time (Light Step: faster).
  refillDashes(dt) {
    const C = CONFIG.player;
    if (this.dashes < C.dashCharges) this.dashes = Math.min(C.dashCharges, this.dashes + dt * (1 + (this.kit.mods.dashRefill || 0)) / C.dashRefill);
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
  // Shared by ground and jump attacks: aim and the riposte bonus. Attacks cost nothing.
  beginAttack(a, mv, face, enemies) {
    const auto = face === null ? this.autoAim(mv, enemies) : null;
    if (face !== null) this.yaw = face;                // locked on: always aim at the target
    else if (auto !== null) this.yaw = auto;           // near an enemy: aim at it
    else if (mv.has) this.yaw = Math.atan2(mv.x, mv.z);
    this.attack = a; this.attackT = 0; this.chargeT = 0; this.charge = a.charge ? 0 : 2;
    // The run's speed, carried forward (momentum); never more than a run, so an attack out of a dash keeps its own reach.
    this.carry = clamp(this.vx * Math.sin(this.yaw) + this.vz * Math.cos(this.yaw), 0, CONFIG.player.walkSpeed);
    this.payload = makeStrike(a, this.riposte > 0, 0);
    if (a.charge && this.perk.bastion > 0) {   // Bastion: a blocked blow readied this heavy, fully charged at once
      this.perk.bastion = 0; this.chargeT = a.charge.hold; this.charge = 2; this.payload = makeStrike(a, this.payload.riposte, 1);
      events.emit('chargeFull', { actor: this, attack: a }); events.emit('abilityPerk', { body: this, perk: 'block/charge' });
    }
    this.riposte = 0;
    this.hitbox = null;
    // A flash step (the light counter, pass 95: `flashStep`): its blow carries the body through or past the foe ahead,
    // to `past` m beyond its far side (min..max m in all). Aimed at the locked foe, else the nearest in front.
    const F = a.flashStep;
    if (F) {
      let best = null;
      for (const c of findEnemies(this, enemies, { range: F.range, cone: F.cone, yaw: this.yaw, surface: true })) if (!best || c.d < best.d) best = c;
      this.flashDist = best ? clamp(best.d + 2 * best.e.radius + this.radius + F.past, F.min, F.max) : F.min;
    }
  }
  // The attack an input starts: with a riposte open (a perfect dodge, an opening deflect), the counter; else the
  // follow-up of a combo still running (or just ended), else the opener.
  nextAttack(action) {
    const M = this.def.moveset, from = this.comboFrom;
    if (this.riposte > 0 && M.counter && M.counter[action]) return M.attacks[M.counter[action]];
    return M.attacks[(from && from.next && from.next[action]) || M.ground[action]];
  }
  // The flash step's motion: across the active phase at the one speed that covers flashDist, passing through bodies
  // (`phasing`: no body push); then out of it at no more than `exit` m/s, a skid to a stop through the follow-through.
  // The whole attack stops at a ledge (update's integrateBody).
  flashMove(F, tl, fx, fz, dt) {
    const a = this.attack;
    if (tl.phase === PHASE.ACTIVE) {
      const sp = this.flashDist / a.hits[0].active;
      this.vx = fx * sp; this.vz = fz * sp; this.phasing = true;
    } else if (tl.phase === PHASE.FOLLOW || tl.phase === PHASE.RECOVERY) {
      const v = Math.hypot(this.vx, this.vz);
      if (v > F.exit) { this.vx *= F.exit / v; this.vz *= F.exit / v; }
      if (tl.phase === PHASE.FOLLOW) approachVel(this, 0, 0, F.brake * dt);
    }
  }
  startAttack(a, mv, face, enemies) {
    this.beginAttack(a, mv, face, enemies); this.setState(PS.ATTACK);
    this.buffer = null; this.comboFrom = null; this.chainPose = null;
  }
  // Into the guard with a deflect armed (a tap: released at once, it is only the deflect).
  startGuard() { this.hitbox = null; this.buffer = null; this.comboFrom = null; this.chainPose = null; this.setState(PS.BLOCK); }
  useItem(id) {
    this.inventory[id].count--;
    this.usingItem = ITEMS[id];
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
    if (this.wantsRoll()) { this.startRoll(mv); return true; }
    if (this.pressDeflect()) { this.startGuard(); return true; }
    const queued = this.buffer && this.buffer.action;
    for (const action of Object.keys(M.ground)) {
      if (queued === action || this.ctl.consume(action)) { this.startAttack(this.nextAttack(action), mv, face, enemies); return true; }
    }
    for (const [id, item] of Object.entries(ITEMS)) {
      if (this.item(id).count > 0 && this.ctl.consume(item.action)) { this.useItem(id); return true; }
    }
    if (this.ctl.consume('jump')) { this.vy = C.jumpVelocity; this.setState(PS.JUMP); return true; }
    if (this.ctl.isHeld('block')) { this.setState(PS.BLOCK); return true; }
    return false;
  }

  // lock: the locked-on enemy or null.
  update(dt, mv, enemies, lock) {
    const C = CONFIG.player, M = this.def.moveset;
    this.stateTime += dt; this.phasing = false;
    this.tint = Math.max(0, this.tint - dt / CONFIG.fx.tintTime);
    this.flash = Math.max(0, this.flash - dt / CONFIG.parry.flashTime);
    this.brace = Math.max(0, this.brace - dt / C.braceTime);
    this.riposte = Math.max(0, this.riposte - dt);
    this.deflect = Math.max(0, this.deflect - dt); this.deflectLock = Math.max(0, this.deflectLock - dt);
    this.execGrace = Math.max(0, this.execGrace - dt);
    if (this.doomTime > 0) this.updateDoom(dt);
    if (this.rent > 0) this.updateRent(dt);
    if ((this.comboTimer -= dt) <= 0) this.comboFrom = null;
    this.bufferInputs();
    this.refillDashes(dt);
    this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    if (!this.in('noRegen') && this.staminaDelay <= 0) this.stamina = Math.min(this.maxStamina, this.stamina + C.staminaRegen * (1 + this.kit.mods.staminaRegen) * dt);
    if (this.kit !== NO_KIT) { this.abilityStep(dt); this.pressAbilities(enemies, lock); }
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
        else {
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
        // A dash attack: an attack pressed in the dash (held in the buffer) comes out of it once past dashAttackFrom;
        // after a perfect dodge in this dash, the counter instead.
        const dashAttack = this.buffer && ((this.riposte > 0 && M.counter && M.counter[this.buffer.action]) || M.dash[this.buffer.action]);
        if (dashAttack && this.stateTime >= C.dashAttackFrom && this.buffer.action === 'light') {   // a foe on its knees: the execution
          const victim = execution.target(this, enemies);
          if (victim) { execution.start(this, victim); break; }
        }
        if (dashAttack && this.stateTime >= C.dashAttackFrom) { this.startAttack(M.attacks[dashAttack], mv, face, enemies); break; }
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
        // Commitment: only a slight steer during the wind-up (locked on, it turns as slowly), none once the swing is out;
        // the light string (`flow`) steers through every phase.
        if ((a.flow || tl.phase === PHASE.STARTUP) && face === null && mv.has) this.yaw = turnToward(this.yaw, Math.atan2(mv.x, mv.z), (a.flow ? C.momentum.flowSteer : C.attackSteer) * dt);
        // A fresh hitbox (and hit list) for each strike of the attack.
        if (tl.phase === PHASE.ACTIVE && (prev.phase !== PHASE.ACTIVE || prev.hitIndex !== tl.hitIndex))
          this.hitbox = new Hitbox(this, a.box, this.payload);
        if (tl.phase !== PHASE.ACTIVE) this.hitbox = null;
        // A chargeable swing lunges only after its charge point, and a held charge plants the feet.
        const lungeFrom = ch ? Math.max(C.lungeStart, ch.at) : C.lungeStart;
        const lunging = this.charge !== 1 && (tl.phase === PHASE.ACTIVE || (tl.phase === PHASE.STARTUP && tl.p > lungeFrom));
        // The run carried in eases off over momentum.carryTime; the lunge takes over when it is the faster.
        this.carry = Math.max(0, (this.carry || 0) - C.walkSpeed / C.momentum.carryTime * dt);
        const sp = this.charge === 1 ? 0 : Math.max(lunging ? a.lunge : 0, this.carry);
        approachVel(this, fx * sp, fz * sp, C.accel * dt);
        if (a.flashStep) this.flashMove(a.flashStep, tl, fx, fz, dt);
        // Cancels: once the blow has landed (or missed), a dash or a deflect cuts the rest short. Recovery is where a buffered attack
        // chains the string (or a heavy ends it with that point's finisher).
        if (this.cancellable() && this.wantsRoll()) { this.startRoll(mv); break; }
        if (this.cancellable() && this.pressDeflect()) { this.startGuard(); break; }
        if (tl.phase === PHASE.RECOVERY && this.buffer && this.buffer.action === 'light') {   // the string broke its stance
          const victim = execution.target(this, enemies);
          if (victim) { execution.start(this, victim); break; }
        }
        if (tl.phase === PHASE.RECOVERY && this.buffer && this.buffer.action !== 'roll') {
          this.comboFrom = a; this.startAttack(this.nextAttack(this.buffer.action), mv, face, enemies); this.chainPose = attackEndPose(a); break;
        }
        // A string let go with movement held flows straight into the run (it can still be picked up: comboGrace).
        const flowOut = a.flow && mv.has && !this.buffer && tl.phase === PHASE.RECOVERY && tl.p >= C.momentum.flowOut;
        if (tl.done || flowOut) { this.comboFrom = a; this.comboTimer = C.comboGrace; this.setState(PS.IDLE); }
        break;
      }
      case PS.BLOCK: {
        const bs = C.walkSpeed * C.blockSpeedMul;
        approachVel(this, mv.x * bs, mv.z * bs, (mv.has ? C.accel : C.decel) * dt);
        if (this.wantsRoll()) { this.startRoll(mv); break; }   // dash straight out of a guard
        this.pressDeflect();   // a bot's parry press while guarding (a person's block press starts the guard)
        if (!this.ctl.isHeld('block')) this.setState(PS.IDLE);
        break;
      }
      case PS.USE_ITEM: {
        // Drunk on the move (pass 85): walking at drinkSpeedMul, turning as on foot; a landed blow ends it (takeHit).
        const I = this.usingItem, rate = this.drinkRate(), ds = C.walkSpeed * C.drinkSpeedMul;   // Quick Draught: the whole drink runs faster
        if (mv.has && face === null) this.yaw = turnToward(this.yaw, Math.atan2(mv.x, mv.z), C.turnRate * dt);
        approachVel(this, mv.x * ds, mv.z * ds, (mv.has ? C.accel : C.decel) * dt);
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

    integrateBody(this, dt, C.knockFriction, this.state === PS.EXECUTE || (this.state === PS.ATTACK && !!this.attack.flashStep));   // an execution or a flash step never slides off a ledge
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
  // The number keys (pass 87, ABILITY_KEYS): a key's ability fires when its key is pressed with its charge full, in
  // any state but held or executing. A power needing an enemy keeps its charge while none is in reach. Pressed early,
  // the key only says so (`abilityNotReady`, the HUD's slot).
  pressAbilities(enemies, lock) {
    for (let n = 0; n < ABILITY_KEYS.length; n++) {
      if (!this.ctl.consume(ABILITY_ACTIONS[n])) continue;
      const key = ABILITY_KEYS[n], slot = this.kit.pressed[key];
      if (!slot || !this.alive() || this.state === PS.HELD || this.state === PS.EXECUTE) continue;
      if (this.perk.charge[key] < slot.v.charge) { events.emit('abilityNotReady', { body: this, key }); continue; }
      const e = pressTarget(this, enemies, lock);
      if (slot.power && ON_ENEMY.has(slot.then) && !e) { events.emit('abilityNotReady', { body: this, key }); continue; }
      this.perk.charge[key] = 0;
      events.emit('abilityPress', { body: this, key, ability: slot.id });
      if (slot.power) abilityReport(this, 'press', { key, enemy: e });
      else abilityPressPerk(this, slot);
    }
  }
  // Points toward the number keys (CONFIG.abilities.press.gain): a landed blow's, a deflect's, a dodge's, an execution's.
  gainCharge(n) { if (this.kit !== NO_KIT) abilityGain(this.kit, this.perk, n); }
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
    this.hp = Math.max(0, this.hp - S.dps * (by.damageMul || 1) * dt);
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
    const drinking = this.state === PS.USE_ITEM;
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
    } else if (drinking) { this.stunTime = C.hurtTime; this.setState(PS.HURT); }   // a blow cuts a drink short
    return { blocked: false };
  }

  // pose(tt, ctx): how the body looks each frame, drawing only, lives in js/player-pose.js (track A, PLAN.md item 3c).
}
