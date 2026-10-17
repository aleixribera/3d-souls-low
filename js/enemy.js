'use strict';
// ============================================================================
// 6. Enemy
// ============================================================================
const STRONG_KINDS = ['projectile', 'dash', 'rollOnly', 'shove'];   // attack kinds with their own default chance
// An enemy attack's chance per second: its own `chance`, else CONFIG.ai.chance for its kind (the lowest of its kinds).
function attackChance(a) {
  if (a.chance !== undefined) return a.chance;
  const C = CONFIG.ai.chance, kinds = STRONG_KINDS.filter(k => a[k]);
  return kinds.length ? Math.min(...kinds.map(k => C[k])) : C.basic;
}
// A close attack reaches from the enemy itself: no `minRange`, not a gap closer or a shot.
const isClose = a => !a.minRange && !a.dash && !a.projectile;
// A basic close attack (no strong kind) never waits on its chance: it strikes as soon as the enemy may attack.
const strikesAtOnce = a => isClose(a) && !STRONG_KINDS.some(k => a[k]);
// One of `attacks`, with odds in proportion to their chances (null if they are all 0).
function pickByChance(attacks) {
  const total = attacks.reduce((s, a) => s + attackChance(a), 0);
  let r = Math.random() * total;
  return total > 0 ? attacks.find(a => (r -= attackChance(a)) < 0) || attacks[attacks.length - 1] : null;
}

// opts: x, y (the floor it stands on, default 0), z, yaw, behavior (a key of BEHAVIORS), notice, leash, homeLeash, path,
// zone (the gated zone it belongs to: an alert wakes the whole zone), key (its placement, for bonfire checkpoints)
class Enemy {
  constructor(def, opts) {
    const E = CONFIG.enemy, B = lookup(BEHAVIORS, opts.behavior, 'behaviour', 'gated');
    this.def = def;
    this.rig = new Rig({ scale: def.scale, bulk: def.bulk, color: def.color, weapon: def.weapon, offhand: def.offhand, visual: def.visual, model: def.model, variant: opts.variant });
    this.radius = def.radius; this.height = BODY_HEIGHT * def.scale;
    this.behavior = opts.behavior; this.notice = opts.notice; this.wide = !!opts.wide;   // wide: sees all round even unaware (a lookout)
    this.leash = opts.leash ?? Infinity; this.homeLeash = opts.homeLeash ?? Infinity;
    this.home = { x: opts.x, y: opts.y ?? 0, z: opts.z, yaw: opts.yaw, state: B.home };
    this.path = opts.path || null; this.pathZ = opts.z; this.pathDir = 1;
    this.zone = opts.zone ?? null; this.key = opts.key ?? null;
    this.arena = opts.arena ?? null;   // a zone member with `arena: true` (v5.1): sees the player only inside its zone's trigger
    this.lastSeen = null;                            // where it last saw the player: searching, it walks there
    this.x = opts.x; this.y = opts.y ?? 0; this.z = opts.z; this.yaw = opts.yaw;
    this.vx = this.vy = this.vz = 0; this.kx = this.kz = 0;
    this.grounded = true; this.peak = this.y; this.fallHeight = 0; this.inPit = false;   // see integrateBody
    this.unreachable = 0; this.reachable = true;    // time the player has been too far above or below to fight
    this.ranged = def.attacks.some(a => a.projectile);   // an archer: shoots from where it stands (js/projectiles.js)
    this.hp = def.hp; this.poise = def.poise; this.poiseTimer = 0; this.tint = 0; this.walkPhase = 0;
    this.posture = 0; this.chainTime = Infinity;   // boss posture and time since the last landed hit
    this.guardMeter = 0; this.guardTime = 0;         // guard or stagger meter, and time since it last filled
    this.crack = 0;                                  // visual: posture-break flash
    this.recoil = 0; this.recoilF = 0; this.recoilS = 0;   // visual: knockback lean in local axes
    this.seed = rand(0, 1000); this.tempo = rand(0.85, 1.2);   // idle personality offsets
    this.rewarded = false;                           // death already announced
    this.training = !!B.training;                    // tutorial dummy: rooted, never dies
    this.immovable = this.training;
    this.discovered = this.training;                 // has had its one-time auto lock-on (dummies never do)
    this.state = B.start; this.stateTime = 0;
    const fd = def.firstDelay || E.firstDelay;
    this.cooldown = rand(fd[0], fd[1]); this.attack = null; this.hitIndex = 0; this.hitbox = null;
    const ranges = def.attacks.map(a => a.range);
    // Its longest and shortest attack range, and the longest of its basic close attacks (-Infinity if it has none).
    this.attackReach = { long: Math.max(...ranges), short: Math.min(...ranges), close: Math.max(...def.attacks.filter(strikesAtOnce).map(a => a.range)) };
    this.stepIn = false;                             // stepping in to its shortest reach, until it attacks
    this.stepInNearest = Infinity;                   // the closest it has come to the player while stepping in
    this.strikeFrom = 0;                             // stepping in, its close attacks wait until the player is this close
    this.backingOff = false;                         // too close: backing off to its hold distance
    this.slot = null;                                // its place around the player (js/crowd.js)
    this.leaping = false;                            // airborne in a leaping strike (a hit's `leap`)
    // Boss phases (v4.3): an enemy def with `phases` fights through the phase ids its placement lists (`boss.phases`,
    // else the def's `defaultPhases`), one full health bar each. `boss.retreat`: when the last bar empties it leaps
    // away instead of dying (the opening of Level 5).
    this.baseDef = def; this.boss = opts.boss || null;
    this.phaseIds = def.phases ? (this.boss && this.boss.phases) || def.defaultPhases || null : null;
    this.phase = -1;
    if (this.phaseIds) this.enterPhase(0);
    this.savePrev();
  }
  // A phase's definition: the base def with the phase's own fields over it (name, hp, cooldown, speed...) and its
  // attacks picked by id. Everything that reads `this.def` (AI, HUD, timings) sees the phase.
  enterPhase(i) {
    const base = this.baseDef, P = base.phases[this.phaseIds[i]];
    this.phase = i;
    this.def = { ...base, ...P, attacks: P.attacks ? P.attacks.map(id => base.attacks.find(a => a.id === id)) : base.attacks, phaseId: this.phaseIds[i] };
    this.hp = this.def.hp; this.poise = this.def.poise; this.posture = 0;
    this.ranged = this.def.attacks.some(a => a.projectile);
    const ranges = this.def.attacks.map(a => a.range);
    this.attackReach = { long: Math.max(...ranges), short: Math.min(...ranges), close: Math.max(...this.def.attacks.filter(strikesAtOnce).map(a => a.range)) };
  }
  lastPhase() { return !this.phaseIds || this.phase >= this.phaseIds.length - 1; }
  // Its health ran out: a boss with another phase kneels into the transition, one set to retreat leaps away; both
  // stay alive (and untouchable). Returns true if it lives on.
  outlast() {
    this.hp = 0; this.hitbox = null;
    if (!this.lastPhase()) {
      const from = this.phase;
      this.enterPhase(this.phase + 1); this.hp = 0;   // the new bar fills through the transition
      this.setState(ES.PHASE);
      events.emit('bossPhase', { enemy: this, from, to: this.phase });
      return true;
    }
    if (this.boss && this.boss.retreat) {
      this.retreatFrom = { x: this.x, y: this.y, z: this.z };
      const R = this.boss.retreat;   // a far leap takes longer: at most `speed` m/s (default 24)
      this.retreatHop = Math.max(R.hop, Math.hypot(R.to[0] - this.x, R.to[2] - this.z) / (R.speed || 24));
      this.setState(ES.RETREAT);
      events.emit('bossRetreat', { enemy: this });
      return true;
    }
    return false;
  }
  // Debug (Level 5 tools): empty the current health bar at once, as if the last blow landed.
  deplete() { if (this.alive() && !this.invulnerable()) { this.hp = 0; if (!this.outlast()) this.die(); } }
  invulnerable() { return this.in('invulnerable'); }
  savePrev() { this.px = this.x; this.py = this.y; this.pz = this.z; this.pyaw = this.yaw; }
  setState(s) { this.state = s; this.stateTime = 0; this.leaping = false; }
  in(group) { return ENEMY_GROUPS[group].has(this.state); }
  alive() { return this.state !== ES.DEAD && this.state !== ES.GONE; }
  awake() { return !this.in('hidden'); }   // visible and engaged enough to be a target
  // Has noticed the player and is fighting it (alive, not a training dummy, not unaware or asleep).
  fightingPlayer() { return this.alive() && !this.training && !this.in('unaware') && this.state !== ES.DORMANT; }
  isCommitted() { return this.state === ES.ACTIVE; }
  // Shield up: guarding enemies hold it whenever they are not attacking, reeling or down.
  // The shield drops as it steps in to strike, once within a step of its shortest reach (and stays down through the swing).
  guarding() {
    if (!this.def.guard || !ENEMY_GROUPS.guarding.has(this.state)) return false;
    return !(this.state === ES.CHASE && this.stepIn && this.playerDist <= this.attackReach.short + this.def.guard.lowerReach);
  }
  // Woken by another enemy's alert (told where the player is). Returns true if this changed anything.
  wake(player) {
    if (this.training || !this.alive()) return false;
    if (this.arena && player && !inArea(this.arena, player.x, player.z)) return false;   // an alert never draws it out of its arena
    if (player) this.lastSeen = { x: player.x, z: player.z };
    const pounce = this.state === ES.LURK && this.behavior === 'perch' && this.def.attacks.find(a => a.hits[0].leap);
    if (pounce && player) { this.yaw = Math.atan2(player.x - this.x, player.z - this.z); this.beginAttack(pounce); return true; }   // a percher springs straight at them
    if (this.state === ES.SEARCH) { this.setState(ES.CHASE); return true; }
    if (this.state === ES.DORMANT) this.setState(ES.RISE);
    else if (this.in('unaware')) this.setState(ES.CHASE);
    else return false;
    return true;
  }

  update(dt, player) {
    const d = this.def, E = CONFIG.enemy;
    this.stateTime += dt;
    this.tint = Math.max(0, this.tint - dt / CONFIG.fx.tintTime);
    this.crack = Math.max(0, this.crack - dt / CONFIG.fx.crackTime);
    this.recoil = Math.max(0, this.recoil - dt / CONFIG.fx.recoilTime);
    this.chainTime += dt;
    if (this.training) { this.updateTraining(dt); return; }
    if (this.state === ES.GONE) return;
    if (this.state === ES.RETREAT) { this.updateRetreat(player); return; }   // scripted flight: no physics
    const M = d.guard || d.stagger;
    if (M && this.state !== ES.BROKEN && (this.guardTime += dt) > M.decayDelay)
      this.guardMeter = Math.max(0, this.guardMeter - M.decay * dt);
    tickPoise(this, dt, E.poiseResetTime, d.poise);
    // Posture drains only after `chainGap` s without a landed hit (and never while the player swings), and
    // holds while the boss is open from a parry, so the riposte window can build on it.
    if (d.posture && this.state !== ES.BROKEN && this.state !== ES.PARRIED && this.chainTime > d.posture.chainGap && !player.isAttacking())
      this.posture = Math.max(0, this.posture - d.posture.decay * dt);
    const dx = player.x - this.x, dz = player.z - this.z, dist = Math.hypot(dx, dz) || 1e-6;
    this.playerDist = dist;
    const toPlayer = Math.atan2(dx, dz);
    const playerAlive = player.alive();
    // Unaware, it sees only in a cone ahead (CONFIG.vision); fighting or searching, all round.
    const V = CONFIG.vision, inCone = this.wide || !this.in('narrowSight') || dist < V.near || Math.abs(angDiff(toPlayer, this.yaw)) <= V.cone;
    const inArena = !this.arena || inArea(this.arena, player.x, player.z);   // e.g. the Bell Warden: the bonfire before its arena is safe
    const sees = playerAlive && inArena && dist < this.notice && inCone && !gateBetween(this, player);
    // Its leash is measured from home to the player, so chasing toward the line never flickers.
    const playerFromHome = Math.hypot(player.x - this.home.x, player.z - this.home.z);
    // Too far above or below to fight (a walkway, a drop): it notices but won't come for the player.
    const reach = this.reachable = Math.abs(player.y - this.y) <= CONFIG.height.reach;
    // An archer takes aim at a player it can't walk to. Never one past its leash: it would give up at once and flicker.
    const engage = sees && (reach || this.ranged) && dist <= this.leash;
    let tx = 0, tz = 0;

    switch (this.state) {
      case ES.IDLE:
        if (engage) this.setState(ES.CHASE);
        break;
      case ES.PATROL: {
        if (engage) { this.setState(ES.CHASE); break; }
        const goal = this.path[this.pathDir > 0 ? 1 : 0], gx = goal - this.x, gz = this.pathZ - this.z, gd = Math.hypot(gx, gz);
        if (gd < 0.3) this.pathDir *= -1;
        else {
          const sp = d.speed * E.patrolSpeedMul;
          tx = gx / gd * sp; tz = gz / gd * sp;
          this.yaw = turnToward(this.yaw, Math.atan2(gx, gz), d.turnRate * dt);
        }
        break;
      }
      case ES.LURK:   // hidden in an alcove (or perched) until the player passes close
        if (sees && dist <= this.leash && this.behavior === 'perch' && d.attacks.some(a => a.hits[0].leap)) {   // even down off its ledge   // a percher pounces with its leaping attack
          this.yaw = toPlayer; this.cooldown = 0; this.beginAttack(d.attacks.find(a => a.hits[0].leap)); break;
        }
        if (engage) {
          this.yaw = toPlayer; this.vy = E.leapVelocity;
          this.vx = dx / dist * E.leapSpeed; this.vz = dz / dist * E.leapSpeed;
          this.setState(ES.LEAP);
        }
        break;
      case ES.LEAP:
        tx = this.vx; tz = this.vz;
        if (this.stateTime >= E.leapTime && this.grounded) { this.cooldown = d.cooldown[0]; this.setState(ES.CHASE); }
        break;
      case ES.DORMANT:   // lying on the floor
        if (engage) this.setState(ES.RISE);
        break;
      case ES.RISE:
        if (this.stateTime >= E.riseTime) { this.cooldown = d.cooldown[0]; this.setState(ES.CHASE); }
        break;
      case ES.RETURN: {   // lost the player: walk back home, then resume the home behaviour
        const hx = this.home.x - this.x, hz = this.home.z - this.z, hd = Math.hypot(hx, hz);
        // Back to the chase only well inside its leash (else it flickers in place, alerting every step).
        if (engage && playerFromHome <= this.homeLeash * CONFIG.ai.leashResume) { this.setState(ES.CHASE); break; }
        if (hd < E.homeArrive) { this.yaw = this.home.yaw; this.setState(this.home.state); break; }
        const sp = d.speed * E.returnSpeedMul;
        tx = hx / hd * sp; tz = hz / hd * sp;
        this.yaw = turnToward(this.yaw, Math.atan2(hx, hz), d.turnRate * dt);
        break;
      }
      case ES.SEARCH: {   // lost sight of the player: walk to where it was last seen, look round, then go home
        const S = CONFIG.ai.search;
        if (!playerAlive || playerFromHome > this.homeLeash || this.stateTime > S.max) { this.setState(ES.RETURN); break; }
        if (!sightLost(this, player) && dist <= this.leash && (reach || this.ranged)) { this.setState(ES.CHASE); break; }
        const g = this.lastSeen || this.home, gx = g.x - this.x, gz = g.z - this.z, gd = Math.hypot(gx, gz);
        if (gd < S.arrive || this.searchLook > 0) {   // there: look about a while
          this.searchLook += dt;
          this.yaw += Math.sin(this.searchLook * 1.6) * d.turnRate * 0.25 * dt;
          if (this.searchLook > S.look) this.setState(ES.RETURN);
          break;
        }
        const sp = d.speed * S.speedMul;
        tx = gx / gd * sp; tz = gz / gd * sp;
        this.yaw = turnToward(this.yaw, Math.atan2(gx, gz), d.turnRate * dt);
        break;
      }
      case ES.CHASE: {
        this.unreachable = reach || this.ranged ? 0 : this.unreachable + dt;
        if (!playerAlive || dist > this.leash || playerFromHome > this.homeLeash || this.unreachable > CONFIG.height.giveUp) {
          this.unreachable = 0; this.stepIn = false; this.setState(ES.RETURN); break;
        }
        if (sightLost(this, player)) { this.stepIn = false; this.searchLook = 0; this.setState(ES.SEARCH); break; }
        this.lastSeen = { x: player.x, z: player.z };
        this.yaw = turnToward(this.yaw, toPlayer, d.turnRate * dt);
        this.cooldown -= dt * crowd.cooldownRate(this);   // slower while other enemies are mid-attack
        if (!reach) {   // too far above or below: an archer shoots from where it stands, the rest go to the brink and wait
          const shot = this.ranged && this.chooseAttack(dist, toPlayer, dt, true);
          if (shot) this.beginAttack(shot);
          else if (!this.ranged) { tx = dx / dist * d.speed; tz = dz / dist * d.speed; }
          break;
        }
        const a = this.chooseAttack(dist, toPlayer, dt);
        if (a) { this.beginAttack(a); break; }
        if (this.stepIn) {   // stepping in: back to holding at its longer range once the player gets well away
          this.stepInNearest = Math.min(this.stepInNearest, dist);
          if (dist > Math.max(this.stepInNearest, this.attackReach.short) + CONFIG.ai.stepOut) this.stepIn = false;
        } else if (this.cooldown <= 0 && dist <= this.attackReach.close + CONFIG.ai.commitReach) {
          this.stepIn = true; this.stepInNearest = dist; this.strikeFrom = this.attackReach.close;   // the player came just short of its close reach: commit
        } else if (this.cooldown <= 0 && dist <= this.holdReach() && Math.random() < (d.approach ?? CONFIG.ai.approach) * dt) {
          this.stepIn = true; this.stepInNearest = dist; this.strikeFrom = this.attackReach.short;   // holding, ready to strike: now and then it steps in
        }
        [tx, tz] = this.holdVelocity(player, dist);
        break;
      }
      case ES.WINDUP: {
        const a = this.attack, hit = a.hits[this.hitIndex];
        // Tracking attacks keep turning for the whole wind-up; others stop part way, so a late dodge works.
        // Delayed attack: at `hold.at` of the wind-up it may freeze, clearly still, for a while before carrying on.
        if (hit.hold && this.holdLeft === null && this.stateTime >= hit.startup * hit.hold.at)
          this.holdLeft = Math.random() < hit.hold.chance ? rand(hit.hold.time[0], hit.hold.time[1]) : 0;
        if (this.holdLeft > 0) { this.holdLeft -= dt; this.stateTime = Math.min(this.stateTime, hit.startup * hit.hold.at); }
        if (this.isTracking()) this.yaw = turnToward(this.yaw, toPlayer, ((a.tracking && a.tracking.rate) || a.track || d.trackRate) * dt);
        // Gap closer: rush forward late in the wind-up, stopping once the strike would reach.
        if (a.dash && this.hitIndex === 0 && this.stateTime >= hit.startup * a.dash.from && dist > a.box.fwd + a.box.d * 0.25 + player.radius) {
          tx = this.vx = Math.sin(this.yaw) * a.dash.speed; tz = this.vz = Math.cos(this.yaw) * a.dash.speed;   // full speed at once
        }
        // Leaping strike (a hit's `leap`): at `from` of the wind-up (after its aim has locked) it jumps along its facing
        // toward where the player stands then (at most `max` m, stopping `short` m short), landing as the strike opens.
        if (hit.leap && !this.leaping && this.leapHit !== this.hitIndex && this.stateTime >= hit.startup * hit.leap.from) this.launchLeap(hit, dist);
        if (this.leaping && this.grounded && this.vy <= 0 && this.stateTime > hit.startup * hit.leap.from + 0.1) { this.leaping = false; this.vx = this.vz = 0; }   // landed early
        if (this.leaping) { tx = this.vx; tz = this.vz; }
        if (this.stateTime >= hit.startup) this.strike(player);
        break;
      }
      case ES.ACTIVE: {   // the strike, then (hitbox closed) its follow-through
        if (this.isTracking()) this.yaw = turnToward(this.yaw, toPlayer, this.attack.track * dt);
        const striking = this.stateTime < this.attack.hits[this.hitIndex].active;
        if (!striking) this.hitbox = null;
        if (striking) { tx = Math.sin(this.yaw) * this.attack.lunge; tz = Math.cos(this.yaw) * this.attack.lunge; }
        this.endStrikeWhenDone();
        break;
      }
      case ES.RECOVER:
        if (this.stateTime >= this.attack.recovery) {   // attack over: cool down
          this.cooldown = rand(d.cooldown[0], d.cooldown[1]); this.setState(ES.CHASE); this.regroup(dist);
        }
        break;
      case ES.HURT:
        if (this.stateTime >= d.flinchTime) { this.cooldown = Math.max(this.cooldown, d.cooldown[0]); this.setState(ES.CHASE); this.regroup(dist); }
        break;
      case ES.STAGGER:
        if (this.stateTime >= d.staggerTime) { this.poise = d.poise; this.cooldown = d.cooldown[0]; this.setState(ES.CHASE); }
        break;
      case ES.PARRIED:
        if (this.stateTime >= d.parriedTime) { this.poise = d.poise; this.cooldown = d.cooldown[0]; this.setState(ES.CHASE); }
        break;
      case ES.BROKEN:
        if (this.stateTime >= (d.posture || d.guard || d.stagger).breakTime) { this.posture = 0; this.guardMeter = 0; this.cooldown = d.cooldown[0]; this.setState(ES.CHASE); }
        break;
      case ES.PHASE: {   // between two health bars: kneels, rises, the new bar fills; nothing it does can hurt
        const T = d.transition || 3;
        this.hp = d.hp * clamp((this.stateTime - T * 0.35) / (T * 0.5), 0, 1);
        this.yaw = turnToward(this.yaw, toPlayer, d.turnRate * 0.25 * dt);
        if (this.stateTime >= T) { this.hp = d.hp; this.cooldown = d.cooldown[0]; this.setState(ES.CHASE); }
        break;
      }
      case ES.DEAD: break;
    }

    if (this.state === ES.CHASE) [tx, tz] = steerAroundProps(this, tx, tz, dist);
    else if (this.state === ES.RETURN) [tx, tz] = steerAroundProps(this, tx, tz, Math.hypot(this.home.x - this.x, this.home.z - this.z));
    else if (this.state === ES.SEARCH && this.lastSeen) [tx, tz] = steerAroundProps(this, tx, tz, Math.hypot(this.lastSeen.x - this.x, this.lastSeen.z - this.z));
    approachVel(this, tx, tz, E.accel * dt);
    integrateBody(this, dt, E.knockFriction, true);   // never walks off an edge; knockback can still push it over
    this.checkFall();
    this.walkPhase += Math.hypot(this.vx, this.vz) * dt * 2.6 / d.scale;
  }
  // Still turning to follow the player (the F7 debug colours show it). With `tracking`, only until its commit point
  // in each wind-up, then locked: the strike goes where it was aimed. Legacy: the early wind-up, or all of a `track` attack.
  isTracking() {
    const a = this.attack;
    if (!a || (this.state !== ES.WINDUP && this.state !== ES.ACTIVE)) return false;
    if (a.tracking) return this.state === ES.WINDUP && this.stateTime < a.hits[this.hitIndex].startup * a.tracking.commit;
    if (a.track) return true;
    return this.state === ES.WINDUP && this.stateTime < a.hits[this.hitIndex].startup * CONFIG.enemy.windupTrack;
  }
  // A leaping strike leaves the ground: the speed that covers the distance in the rest of the wind-up, and the upward
  // speed that brings it down just as the strike opens.
  launchLeap(hit, dist) {
    const L = hit.leap, T = Math.max(0.2, hit.startup * (1 - L.from)), far = clamp(dist - (L.short || 0), 0, L.max);
    this.vx = Math.sin(this.yaw) * far / T; this.vz = Math.cos(this.yaw) * far / T; this.vy = CONFIG.gravity * T / 2;
    this.leaping = true; this.leapHit = this.hitIndex;
    events.emit('bossLeap', { enemy: this, time: T });
  }
  // The retreat (`boss.retreat`): kneels for `kneel` s, leaps in an arc onto `to` [x, y, z] (`hop` s), stands there
  // `wait` s facing the player, then leaps on to `out` (`fly` s) and is gone. Positions are set outright, like a cutscene
  // the player keeps control through; it cannot be hit.
  updateRetreat(player) {
    const R = this.boss.retreat, t = this.stateTime, F = this.retreatFrom, top = { x: R.to[0], y: R.to[1], z: R.to[2] };
    const arc = (a, b, k, h) => {
      const e = ease(k);
      this.x = lerp(a.x, b.x, e); this.z = lerp(a.z, b.z, e); this.y = lerp(a.y, b.y, k) + h * 4 * k * (1 - k);
      if (Math.hypot(b.x - a.x, b.z - a.z) > 0.1) this.yaw = turnToward(this.yaw, Math.atan2(b.x - a.x, b.z - a.z), 0.3);
    };
    this.vx = this.vy = this.vz = this.kx = this.kz = 0; this.hitbox = null;
    const hop = this.retreatHop, t1 = R.kneel, t2 = t1 + hop, t3 = t2 + R.wait, t4 = t3 + R.fly;
    if (t < t1) return;
    if (t < t2) { arc(F, top, (t - t1) / hop, R.height + hop * 2); this.grounded = false; return; }
    if (t < t3) { this.x = top.x; this.y = top.y; this.z = top.z; this.grounded = true; this.yaw = turnToward(this.yaw, Math.atan2(player.x - this.x, player.z - this.z), 0.08); return; }
    if (t < t4) { arc(top, { x: R.out[0], y: R.out[1], z: R.out[2] }, (t - t3) / R.fly, R.height * 0.6); this.grounded = false; return; }
    this.rewarded = true;   // gone, not killed: no death to announce
    this.setState(ES.GONE);
    events.emit('bossGone', { enemy: this });
  }
  die() { this.hitbox = null; this.setState(ES.DEAD); }
  // After moving: death in a pit, or damage from a hard landing (same rule as the player).
  checkFall() {
    if (!this.alive()) return;
    if (this.inPit) { this.hp = 0; this.die(); events.emit('fell', { body: this }); return; }
    const leapt = this.attack && this.in('attacking') && this.attack.hits.some(h => h.leap);   // a leaping strike lands on purpose
    const dmg = this.fallHeight > 0 && !leapt ? fallDamage(this.fallHeight) : 0;
    if (dmg <= 0) return;
    this.hp = Math.max(0, this.hp - dmg); this.tint = 1;
    events.emit('fallDamage', { body: this, height: this.fallHeight, damage: Math.min(dmg, this.def.hp) });
    if (this.hp <= 0) this.die();
  }
  // Back in the fight after an attack or a flinch with the player within its hold reach: keep its distance with chance
  // `kite` (CONFIG.ai), else step in to its shortest reach, so a ranged enemy or a boss doesn't always back away.
  regroup(dist) {
    if (dist > this.holdReach() || dist <= this.attackReach.short || Math.random() < (this.def.kite ?? CONFIG.ai.kite)) return;
    this.stepIn = true; this.stepInNearest = dist; this.strikeFrom = this.attackReach.short;
  }
  // The reach it holds at: its longest attack's, but never more than `holdMax` (an archer stays in the fight).
  holdReach() { return Math.min(this.attackReach.long, CONFIG.ai.holdMax); }
  // How far from the player it waits: `holdInset` inside its hold reach, or inside its shortest while stepping in.
  holdDistance() { return (this.stepIn ? this.attackReach.short : this.holdReach()) - CONFIG.ai.holdInset; }
  // Close in at full speed to its hold distance; once more than `holdBand` closer, back off (slower) all the way to
  // it; and circle toward its place around the player (`slot`), still facing the player. Returns the wanted velocity [x, z].
  holdVelocity(player, dist) {
    const A = CONFIG.ai, want = this.holdDistance();
    if (dist < want - A.holdBand) this.backingOff = true; else if (dist >= want) this.backingOff = false;
    const a = Math.atan2(this.x - player.x, this.z - player.z);   // bearing from the player
    const rx = Math.sin(a), rz = Math.cos(a), ux = Math.cos(a), uz = -Math.sin(a);   // outward and around (+angle)
    const out = dist > want ? -Math.min(1, (dist - want) * 1.2) : this.backingOff ? clamp((want - dist) * 1.2, 0, 1) * A.holdSpeedMul : 0;
    const along = this.slot === null ? 0 : clamp(angDiff(this.slot, a) * dist * 0.6, -1, 1) * A.holdSpeedMul;
    const vx = rx * out + ux * along, vz = rz * out + uz * along, l = Math.hypot(vx, vz);
    if (l < 0.1) return [0, 0];   // in place: stand and watch
    const sp = this.def.speed / Math.max(1, l);
    return [vx * sp, vz * sp];
  }
  // No attack is chosen in advance. Once the cooldown is over and it faces the player (and the crowd's gap after
  // another enemy's start has passed), the attacks whose range window (`minRange`, default 0, to `range`) holds the
  // player's distance decide, every step:
  //   - a basic close attack in reach means it strikes now, picking among its close attacks in reach by their
  //     chances (stepping in, only once the player is within `strikeFrom`: from holding it gets all the way in, so
  //     its longest swing doesn't always win);
  //   - otherwise each one rolls its chance per second (attackChance, times the crowd's damping, which shots ignore): gap closers,
  //     shots, and a roll-only attack or shove that reaches on its own. The first success starts.
  // Returns the attack to start now, or null. `shotsOnly`: projectiles only.
  chooseAttack(dist, toPlayer, dt, shotsOnly = false) {
    if (this.cooldown > 0 || Math.abs(angDiff(toPlayer, this.yaw)) >= CONFIG.enemy.attackFacing || !crowd.mayStart()) return null;
    const inReach = this.def.attacks.filter(a => (!shotsOnly || a.projectile) && dist >= (a.minRange || 0) && dist <= a.range);
    const close = inReach.filter(isClose);
    if (close.some(strikesAtOnce) && !(this.stepIn && dist > this.strikeFrom)) return pickByChance(close);
    const mul = crowd.chanceMul(this);
    for (const a of inReach) if (!strikesAtOnce(a) && Math.random() < attackChance(a) * (a.projectile ? 1 : mul) * dt) return a;
    return null;
  }
  beginAttack(attack) {
    this.attack = attack; this.hitIndex = 0; this.stepIn = false; this.holdLeft = null; this.leapHit = -1; this.setState(ES.WINDUP);
    crowd.started();
    events.emit('attackStart', { enemy: this, attack: this.attack });
    if (this.attack.rollOnly) events.emit('perilous', { enemy: this, attack: this.attack });
  }
  // The strike timeline shared by all enemies: windup -> active (per hit) -> recover. A bow looses a bolt
  // at the target instead of opening a hitbox.
  strike(target) {
    // A hit may bring its own `box` (with `ring`: an expanding ring round the owner) and its own `impact`.
    const hit = this.attack.hits[this.hitIndex], box = hit.box || this.attack.box, impact = hit.impact || this.attack.impact;
    if (this.attack.projectile && target) { this.hitbox = null; projectiles.fire(this, this.attack, target); }
    else this.hitbox = new Hitbox(this, box, makeStrike(this.attack));
    if (this.leaping) { this.vx = this.vz = 0; }
    if (impact) {   // a blow that strikes the ground: a ring, a crack and a jolt where it lands
      const f = box.fwd;   // where the hitbox is centred
      events.emit('impact', { x: this.x + Math.sin(this.yaw) * f, y: this.y, z: this.z + Math.cos(this.yaw) * f, fx: impact, enemy: this });
    }
    this.setState(ES.ACTIVE);
    events.emit('attackPhase', { actor: this, attack: this.attack, phase: PHASE.ACTIVE, hitIndex: this.hitIndex });   // the swing sound
  }
  endStrikeWhenDone() {
    const h = this.attack.hits[this.hitIndex];
    if (this.stateTime < h.active + (h.follow || 0)) return;
    this.hitbox = null;
    if (this.hitIndex + 1 < this.attack.hits.length) { this.hitIndex++; this.holdLeft = null; this.setState(ES.WINDUP); }
    else this.setState(ES.RECOVER);
  }
  // Training dummies stay rooted. The sparring variant loops one slow, telegraphed swing.
  updateTraining() {
    if (!this.def.attacks.length) return;
    switch (this.state) {
      case ES.IDLE: if (this.stateTime >= this.def.restTime) this.beginAttack(this.def.attacks[0]); break;
      case ES.WINDUP: if (this.stateTime >= this.attack.hits[this.hitIndex].startup) this.strike(); break;
      case ES.ACTIVE: this.endStrikeWhenDone(); break;
      case ES.RECOVER: if (this.stateTime >= this.attack.recovery) this.setState(ES.IDLE); break;
      case ES.PARRIED: if (this.stateTime >= this.def.parriedTime) this.setState(ES.IDLE); break;
    }
  }

  // Boss posture: add, and break when full. Returns true if this broke the posture.
  addPosture(amount) {
    const P = this.def.posture;
    if (!P || this.state === ES.BROKEN) return false;
    this.posture = Math.min(P.max, this.posture + amount);
    if (this.posture < P.max) return false;
    this.hitbox = null; this.crack = 1;
    this.setState(ES.BROKEN);
    return true;
  }
  // A successful parry ends the current attack and leaves the enemy open. Returns true on a posture break.
  getParried() {
    this.hitbox = null;
    if (this.def.posture) {
      this.chainTime = 0;   // a parry starts a hit chain: the riposte builds posture straight away
      if (this.addPosture(this.def.posture.parry)) return true;
    }
    this.setState(ES.PARRIED);
    return false;
  }

  // One strike from `from`. Returns { broke (posture), died }.
  takeHit(strike, from) {
    this.hitK = clamp(strike.damage / CONFIG.fx.flinchRef, 0.5, 1.6);   // how big the flinch looks
    const dx = this.x - from.x, dz = this.z - from.z, d = Math.hypot(dx, dz) || 1;
    const kx = dx / d * strike.knock, kz = dz / d * strike.knock;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    this.recoil = 1; this.recoilF = (dx * s + dz * c) / d; this.recoilS = (dz * s - dx * c) / d;
    this.tint = 1;
    if (this.training) { this.hp = Math.max(1, this.hp - strike.damage); return { broke: false, died: false }; }   // flash and recoil only
    if (this.invulnerable()) return { broke: false, died: false };
    const def = this.def, P = def.posture;
    if (this.guarding() && Math.abs(angDiff(Math.atan2(from.x - this.x, from.z - this.z), this.yaw)) < def.guard.arc)
      return this.blockHit(strike, kx, kz);
    this.hp = Math.max(0, this.hp - strike.damage * (P && this.state === ES.BROKEN ? P.damageMul : 1));
    this.kx += kx; this.kz += kz;
    if (this.hp <= 0 && this.outlast()) return { broke: false, died: false };   // a boss with another bar, or retreating
    if (this.hp <= 0) { this.hitbox = null; this.setState(ES.DEAD); return { broke: false, died: true }; }
    if (P) {
      // Bosses ignore interrupts. Every landed hit builds posture; one within `chainGap` s of the last builds `chainMul` times more.
      const chained = this.chainTime <= P.chainGap;
      this.chainTime = 0;
      if (this.in('unaware') || this.state === ES.DORMANT) this.setState(ES.CHASE);
      return { broke: this.addPosture(strike.postureDmg * (chained ? P.chainMul : 1)), died: false };
    }
    if (this.in('shrugsHits') || this.state === ES.BROKEN) return { broke: false, died: false };   // a broken guard: no flinch
    if (this.state === ES.DORMANT) { this.setState(ES.RISE); return { broke: false, died: false }; }
    const unaware = this.in('unaware');
    const M = def.stagger || def.guard;
    if (M) {   // stagger/guard meter instead of poise: hits never interrupt until the meter fills
      if (unaware) this.setState(ES.CHASE);
      return { broke: this.fillMeter(M, strike.attackId), died: false };
    }
    const r = applyPoise(this, strike.poise, this.isCommitted(), def.poise);
    if (r === POISE.STAGGER) { this.hitbox = null; this.setState(ES.STAGGER); }
    else if (r === POISE.FLINCH && def.flinchTime > 0 && this.in('canFlinch')) this.setState(ES.HURT);
    else if (unaware) this.setState(ES.CHASE);
    return { broke: false, died: false };
  }

  // A strike taken on the shield: reduced damage, little push, and it fills the guard meter
  // (heavy attacks more than light ones). A full meter breaks the guard.
  blockHit(strike, kx, kz) {
    const G = this.def.guard;
    this.hp = Math.max(0, this.hp - strike.damage * G.damageMul);
    this.kx += kx * G.knockMul; this.kz += kz * G.knockMul;
    this.tint = 0.3;
    if (this.hp <= 0) { this.hitbox = null; this.setState(ES.DEAD); return { broke: false, died: true }; }
    if (this.in('unaware')) this.setState(ES.CHASE);
    if (this.fillMeter(G, strike.attackId, G.blockedMul)) return { broke: true, died: false };
    return { broke: false, died: false, blocked: true };
  }
  // Shared by the shield guard and the stagger meter (`guardMeter` holds either): heavy attacks fill
  // more than light ones; a full meter breaks the enemy (kneels, open) for M.breakTime. Returns true on a break.
  fillMeter(M, attackId, mul = 1) {
    this.guardTime = 0;
    this.guardMeter = Math.min(M.max, this.guardMeter + (M.breakers.includes(attackId) ? M.heavy : M.light) * mul);
    if (this.guardMeter < M.max - 1e-6) return false;
    this.hitbox = null; this.crack = 1;
    this.setState(ES.BROKEN);
    return true;
  }

  // Idle personality layered on top of the base pose, weighted by how idle the enemy is.
  idleLayer(r, ctx, w) {
    if (w <= 0.001) return;
    const t = ctx.t * this.tempo + this.seed;
    // Head turns toward the player now and then.
    const look = ease((Math.sin(t * 0.37) - 0.2) * 1.5);
    const rel = angDiff(Math.atan2(ctx.px - this.x, ctx.pz - this.z), this.yaw);
    r.head.rotation.y += clamp(rel, -1.0, 1.0) * look * w;
    lookup(IDLE_STYLES, this.def.idle || 'none', 'idle style', 'none')(r, t, w);
  }

  pose(tt, ctx) {
    const r = this.rig, d = this.def, E = CONFIG.enemy;
    r.reset(); r.setOpacity(1); r.root.visible = true;
    let warn = 0, glint = -1;
    const a = this.attack;
    switch (this.state) {
      case ES.CHASE: case ES.PATROL: case ES.RETURN: case ES.SEARCH: r.walk(this.walkPhase, 0.5); r.weightLean(this.vx, this.vz, ctx.yaw, ctx.dt); break;
      case ES.LURK:
        r.crouch(0.38); r.tip.rotation.x = 0.3; r.armL.rotation.x = -0.9; r.armR.rotation.x = -0.7; break;
      case ES.LEAP: r.legL.rotation.x = -0.9; r.kneeL.rotation.x = 1.2; r.legR.rotation.x = 0.4; r.kneeR.rotation.x = 0.6; r.armR.rotation.x = -2.2; r.armL.rotation.x = -1.2; r.tip.rotation.x = 0.3; break;
      case ES.DORMANT: r.tip.rotation.x = -Math.PI / 2; r.armL.rotation.x = r.armR.rotation.x = -0.3; break;
      case ES.RISE: {
        const p = ease(tt / E.riseTime);
        r.tip.rotation.x = -Math.PI / 2 * (1 - p); r.legL.rotation.x = -1.2 * Math.sin(p * Math.PI);
        r.kneeL.rotation.x = 1.6 * Math.sin(p * Math.PI); r.armR.rotation.x = lerp(-0.3, -0.4, p); break;
      }
      case ES.WINDUP: case ES.ACTIVE: case ES.RECOVER:
        if (a.pose) {   // four-phase key poses (js/attack-anim.js) on the attack's own clock
          const still = this.holdLeft > 0 ? this.stateTime : tt;   // a held wind-up is drawn perfectly still
          const at = phaseSpan(a, this.state === ES.WINDUP ? 'windup' : this.state === ES.ACTIVE ? 'active' : 'recovery', this.hitIndex)[0] + still;
          glint = poseAttackKeys(r, a, at);
        } else if (this.state === ES.WINDUP) poseAttack(r, a, PHASE.STARTUP, tt / a.hits[this.hitIndex].startup, this.hitIndex);
        else if (this.state === ES.ACTIVE) poseAttack(r, a, PHASE.ACTIVE, tt / a.hits[this.hitIndex].active, this.hitIndex);
        else poseAttack(r, a, PHASE.RECOVERY, tt / a.recovery, this.hitIndex);
        if (this.state === ES.WINDUP) warn = clamp(tt / CONFIG.fx.windupGlowTime, 0, 1);
        break;
      case ES.HURT: flinchPose(r, false, tt / d.flinchTime, tt, this.hitK || 1); break;
      case ES.STAGGER: flinchPose(r, true, tt / d.staggerTime, tt); break;
      case ES.PARRIED: {
        // Parried: the weapon flung up and wide, the torso thrown back over a stumbling back foot, wide open (riposte
        // window), then a slow haul back to guard.
        const k = ease(clamp(tt / 0.12, 0, 1)) * (1 - ease((tt - d.parriedTime * 0.6) / (d.parriedTime * 0.4)));
        r.tip.rotation.x = -0.5 * k; r.spin.rotation.y = 0.8 * k; r.spin.rotation.z = Math.sin(tt * 7) * 0.09 * k; r.crouch(0.12 * k);
        r.legR.rotation.x += 0.55 * k; r.kneeR.rotation.x += 0.4 * k; r.legL.rotation.x -= 0.25 * k;
        r.armR.rotation.set(lerp(-0.4, -2.8, k), 0, -1.1 * k); r.armL.rotation.set(lerp(-0.1, 0.6, k), 0, 0.6 * k); r.head.rotation.x = -0.4 * k; break;
      }
      case ES.BROKEN: {
        // Sinks to one knee, club on the floor, then hauls itself back up.
        const T = (d.posture || d.guard || d.stagger).breakTime, k = ease(tt / 0.4) * (1 - ease((tt - T + 0.6) / 0.6));
        r.kneel(k); r.lean(0.3 * k);
        r.armR.rotation.x = lerp(-0.4, 0.1, k); r.weapon.rotation.x = lerp(0.5, 1.4, k); r.head.rotation.x = 0.4 * k;
        r.spin.rotation.z = Math.sin(tt * 5) * 0.04 * k; break;
      }
      case ES.PHASE: {   // sinks to a knee, head bowed, then rises as the new bar fills
        const T = d.transition || 3, k = ease(clamp(tt / 0.6, 0, 1)) * (1 - ease(clamp((tt - T * 0.62) / (T * 0.3), 0, 1)));
        r.kneel(k); r.lean(0.35 * k); r.head.rotation.x = 0.55 * k;
        r.armR.rotation.x = lerp(-0.4, 0.25, k); r.weapon.rotation.x = lerp(0.5, 1.5, k);
        r.spin.rotation.z = Math.sin(tt * 3) * 0.03 * k; break;
      }
      case ES.RETREAT: {   // staggers to a knee, then crouches and springs; airborne it tucks; on the wall it stands tall
        const R = this.boss.retreat, t1 = R.kneel, t2 = t1 + this.retreatHop, t3 = t2 + R.wait;
        if (tt < t1) { const k = ease(clamp(tt / 0.4, 0, 1)); r.kneel(k * (1 - ease(clamp((tt - t1 + 0.35) / 0.35, 0, 1)) * 0.5)); r.lean(0.4 * k); r.head.rotation.x = 0.5 * k; r.armR.rotation.x = lerp(-0.4, 0.1, k); }
        else if (tt < t2 || tt >= t3) { r.legL.rotation.x = -1.1; r.kneeL.rotation.x = 1.4; r.legR.rotation.x = 0.5; r.kneeR.rotation.x = 0.9; r.armR.rotation.x = -1.6; r.armL.rotation.x = -1.0; r.tip.rotation.x = 0.35; }
        else { r.head.rotation.x = -0.15; r.armR.rotation.x = -0.25; r.weapon.rotation.x = 0.9; }
        if (tt >= t3) r.setOpacity(1 - clamp((tt - t3) / R.fly, 0, 1));   // fades as it drops out of sight beyond the wall
        break;
      }
      case ES.GONE: r.setOpacity(0); r.root.visible = false; break;
      case ES.DEAD: { const fade = d.deathFade || E.deathFade; deathPose(r, tt, fade); r.root.visible = tt < fade; break; }
    }
    if (this.guarding()) { r.armL.rotation.x = -0.75; r.armL.rotation.z = -0.25; }   // shield held up in front
    // Blend idle personality in and out so aggro never pops.
    r.idleW += ((IDLE_BLEND[this.state] || 0) - r.idleW) * (1 - Math.exp(-CONFIG.fx.idleBlendRate * ctx.dt));
    if (this.alive() && this.state !== ES.DORMANT && !this.training) this.idleLayer(r, ctx, r.idleW);
    if (this.recoil > 0) {
      const k = Math.sin(this.recoil * Math.PI) * CONFIG.fx.recoilLean;
      r.tip.rotation.x += this.recoilF * k; r.tip.rotation.z += this.recoilS * k * 0.8;
    }
    // Turning (tracking the player): the feet lead, the hips and then the chest follow a beat behind.
    if (r.lastYaw !== null && ctx.dt > 0 && this.alive()) {
      const L = ANIM_SETTINGS.turnLag, w = angDiff(ctx.yaw, r.lastYaw) / ctx.dt;
      r.spin.rotation.y -= clamp(w * L.spin, -L.max, L.max);
      if (r.chest) r.chest.rotation.y -= clamp(w * (L.chest - L.spin), -L.max, L.max);
    }
    if (r.anim) r.anim.update(this, tt, ctx, glint);   // a modelled body's secondary motion (js/animator.js), visual only
    r.applyLag(ctx.yaw, Math.hypot(this.vx, this.vz), ctx.dt);
    r.setWarning(warn, a && a.rollOnly ? ROLL_ONLY_COLOR : WARN_COLOR);   // roll-only attacks glow their own colour
    if (this.crack > 0) r.setTint(CRACK_COLOR, this.crack * 1.6);
    else r.setTint(HIT_COLOR, this.tint * 0.8);
  }
}
