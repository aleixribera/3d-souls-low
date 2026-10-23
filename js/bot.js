'use strict';
// ============================================================================
// Friendly bots (v7.13.1)
// ============================================================================
// A bot is an ordinary Player whose presses come from BotHands instead of the keyboard (Player.ctl). The brain
// reads the fight the way a player watches it: each enemy's wind-up, how long until its blow opens, how far that
// blow reaches, whether it can be parried, and how long an opening lasts. Every read comes from the enemy's own
// attack data, so no enemy is special-cased. Tuning: CONFIG.bot; personalities: BOT_PROFILES (js/data/bots.js).
// The lobby server runs bots (server/simulation.js); the brain never touches game state, it only presses.

// The interface Player reads from `input`, keyed by action name. Presses age on the bot's own clock.
class BotHands {
  constructor() { this.time = 0; this.held = new Set(); this.pressed = new Map(); }
  tick(dt) { this.time += dt; }
  press(action) { this.pressed.set(action, this.time); }
  hold(action, on) { if (on) this.held.add(action); else this.held.delete(action); }
  isHeld(action) { return this.held.has(action); }
  peek(action) { return this.pressed.has(action) && this.time - this.pressed.get(action) <= CONFIG.input.buffer; }
  consume(action) { if (!this.peek(action)) return false; this.pressed.delete(action); return true; }
  pressedCode() { return null; }
  clear() { this.held.clear(); this.pressed.clear(); }
}

const bot = (() => {
  const B = () => CONFIG.bot;
  const span = ([a, b], r) => a + (b - a) * r();
  const flat = (x, z) => { const d = Math.hypot(x, z); return d > 1e-6 ? { x: x / d, z: z / d, has: true } : { x: 0, z: 0, has: false }; };
  const rot = (v, a) => ({ x: v.x * Math.cos(a) + v.z * Math.sin(a), z: -v.x * Math.sin(a) + v.z * Math.cos(a) });
  const edge = (me, e) => Math.hypot(e.x - me.x, e.z - me.z) - me.radius - e.radius;
  const A = () => PLAYER_DEF.moveset.attacks;
  // Seconds from pressing an attack until its recovery (where a roll can cancel it), with the hit-pause it lands
  // with: online, only the striker pauses while the enemies carry on.
  const commit = a => a.hits.reduce((n, h) => n + h.startup + h.active + (h.follow || 0), 0) + (a.hitstop || 0);
  const firstStartup = new WeakMap();
  const attacksOf = e => (e.def.attacks || e.baseDef.attacks).map(a => typeof a === 'string' ? e.baseDef.attacks.find(x => x.id === a) : a).filter(Boolean);
  function quickest(e) {   // the fastest blow this enemy (its current phase) can open with
    const list = e.def.attacks || e.baseDef.attacks;
    if (!firstStartup.has(list)) firstStartup.set(list, Math.min(Infinity, ...attacksOf(e).filter(a => !a.when).map(a => a.hits[0].startup)));
    return firstStartup.get(list);
  }
  // Reactions bypass cooldown, but only in their range and situation. Anticipate the counters a swing or flask
  // would trigger; an inactive rear/flank counter must not make every approach look unsafe forever.
  function quickestReaction(e, me, intent) {
    const dist = Math.hypot(e.x - me.x, e.z - me.z), rel = angDiff(Math.atan2(me.x - e.x, me.z - e.z), e.yaw);
    return Math.min(Infinity, ...attacksOf(e).filter(a => a.when && dist >= (a.minRange || 0) && dist <= a.range &&
      (REACTIONS[a.when](e, me, rel) || (intent === 'heal' ? a.when === 'healing' : a.when === 'struck' || a.when === 'shielded'))).map(a => a.hits[0].startup));
  }
  // How far (centre to body edge of `me`) a blow can land, from its box, ring, lunge, dash, step, leap or blink.
  function reach(e, a, hit, me) {
    const C = B(), b = hit.box || a.box;
    if (hit.blink) return Infinity;
    let r = b.ring ? Math.max(b.ring.from, b.ring.to) + b.ring.width / 2 + Math.hypot(b.fwd, 0) : Math.hypot(b.fwd + b.d / 2, b.w / 2);
    r += (a.lunge || 0) * C.lungeShare;
    if (a.dash && e.hitIndex === 0) r += a.dash.speed * C.dashShare;
    if (hit.step) r += hit.step.speed * hit.startup * (1 - hit.step.from);
    if (hit.leap) r += hit.leap.max || 10;
    return r + me.radius + C.threatMargin;
  }
  // The next blow of an enemy mid-attack: { attack, hit, index, eta } with eta the s until its hitbox opens (<= 0: open
  // now), or null if no blow is coming. A held (delayed) wind-up adds its hold, as a watcher sees it freeze.
  function nextBlow(e, me) {
    const a = e.attack;
    if (!a || a.projectile || (e.state !== ES.WINDUP && e.state !== ES.ACTIVE)) return null;   // a bolt is read in flight
    let i = e.hitIndex, hit = a.hits[i], eta;
    if (e.state === ES.WINDUP) eta = hit.startup - e.stateTime + (e.holdLeft > 0 ? e.holdLeft : 0);
    else if (e.hitbox) eta = -e.stateTime;
    else {
      if (i + 1 >= a.hits.length) return null;
      eta = hit.active + (hit.follow || 0) - e.stateTime + a.hits[i + 1].startup; hit = a.hits[++i];
    }
    const b = hit.box || a.box;
    if (b.ring) {   // an expanding ring reaches this body a little after it opens
      const d = Math.hypot(e.x - me.x, e.z - me.z);
      eta += b.ring.time * clamp((d - b.ring.from) / Math.max(0.01, b.ring.to - b.ring.from), 0, 1);
    }
    // Blows that follow too closely to roll twice: one roll's i-frames must span them all (`end`).
    let end = eta + hit.active, at = eta;
    for (let j = i + 1; j < a.hits.length; j++) {
      at += a.hits[j - 1].active + (a.hits[j - 1].follow || 0) + a.hits[j].startup;
      if (at > end + CONFIG.player.rollTime - CONFIG.player.rollIFrames) break;
      end = at + a.hits[j].active;
    }
    return { attack: a, hit, index: i, eta, end, active: Math.min(hit.active, b.ring ? b.ring.time : hit.active) };
  }
  // Seconds of safety this enemy grants: until a blow from it could open on `me`. Infinity when it cannot reach.
  function opening(e, me, intent = 'attack') {
    const C = B(), d = e.def, quick = quickest(e), st = e.stateTime;
    if (!e.alive() || ENEMY_GROUPS.hidden.has(e.state)) return Infinity;
    const cool = Math.max(0, e.cooldown || 0) * C.windowTrust, base = d.cooldown ? d.cooldown[0] * C.windowTrust : 0;
    // A far enemy must first walk in (its own blows' reach), unless it can dash or leap.
    const long = Math.max(...attacksOf(e).map(a => reach(e, a, a.hits[0], me)));
    const walk = Number.isFinite(long) ? Math.max(0, edge(me, e) + me.radius - long) / Math.max(0.5, d.speed || 2) : 0;
    switch (e.state) {
      case ES.WINDUP: case ES.ACTIVE: {
        const a = e.attack;
        if (a && a.projectile) {   // a bolt: until it could arrive
          const hit = a.hits[e.hitIndex], fly = Math.hypot(e.x - me.x, e.z - me.z) / a.projectile.speed;
          return Math.max(0, e.state === ES.WINDUP ? hit.startup - st + (e.holdLeft > 0 ? e.holdLeft : 0) : 0) + fly;
        }
        const blow = nextBlow(e, me);
        if (blow && edge(me, e) + me.radius + e.radius <= reach(e, blow.attack, blow.hit, me)) return Math.max(0, blow.eta);
        const left = a.hits.slice(e.hitIndex).reduce((n, h) => n + h.startup + h.active + (h.follow || 0), 0) - st;
        return Math.max(0, left) + a.recovery + base + quick + walk;
      }
      case ES.RECOVER: return Math.max(0, e.attack ? e.attack.recovery - st : 0) + base + quick + walk;
      case ES.PARRIED: return Math.max(0, d.parriedTime - st) + base + quick;
      case ES.STAGGER: return Math.max(0, d.staggerTime - st) + base + quick;
      case ES.HURT: return Math.max(0, d.flinchTime - st) + Math.min(cool + quick, quickestReaction(e, me, intent));
      case ES.BROKEN: return Math.max(0, (d.posture || d.guard || d.stagger).breakTime - st) + base + quick;
      case ES.EXECUTED: case ES.PHASE: return Infinity;
      default: return Math.min(cool + quick + walk, quickestReaction(e, me, intent) + walk);
    }
  }
  // On its floor (a leaping enemy is in the air above it, and still coming).
  const level = (e, me) => e.leaping || Math.abs(e.y - me.y) <= CONFIG.height.reach + 1;
  const attackable = e => e.alive() && !e.invulnerable() && !ENEMY_GROUPS.hidden.has(e.state);

  // A jump is a physical clearance, never invulnerability. Only a low/ground-only hit with time to land
  // before another blow is eligible; tall sweeps, gap closers and projectiles still call for a roll or space.
  function jumpLead(e, blow, me) {
    const C = B().jumpDodge, P = CONFIG.player, a = blow.attack, h = blow.hit, b = h.box || a.box;
    if (a.projectile || a.breath || a.sphere || a.dash || h.leap || h.blink || h.step || e.leaping) return null;
    const top = b.ground ? 0 : e.y + b.y + b.h / 2 - me.y;
    const need = Math.max(0, top) + C.clearance, disc = P.jumpVelocity * P.jumpVelocity - 2 * CONFIG.gravity * need;
    if (disc <= 0) return null;
    const up = (P.jumpVelocity - Math.sqrt(disc)) / CONFIG.gravity;
    const down = (P.jumpVelocity + Math.sqrt(disc)) / CONFIG.gravity;
    const arrival = b.ring ? b.ring.time * (b.ring.width / 2 + me.radius) / Math.max(0.01, Math.abs(b.ring.to - b.ring.from)) : 0;
    const low = Math.max(C.lead[0], up + arrival + C.timingMargin);
    const high = Math.min(C.lead[1], down - h.active - C.timingMargin);
    if (low > high) return null;
    const flight = 2 * P.jumpVelocity / CONFIG.gravity, guard = flight + C.followMargin + (b.ring?.time || 0);
    let next = h.active + (h.follow || 0);
    if (blow.index + 1 < a.hits.length && next + a.hits[blow.index + 1].startup < guard) return null;
    if (blow.index === a.hits.length - 1) for (const follow of a.followUps || []) {
      const move = e.baseDef.attacks.find(m => m.id === follow.attack);
      if (follow.chance > 0 && move && next + move.hits[0].startup < guard) return null;
    }
    return [low, high];
  }

  function create(profile, rng = Math.random) {
    const hands = new BotHands(), C = B();
    const seen = new WeakMap();   // enemy -> { key, at, plan, done }: what was decided about its current blow
    let target = null, side = profile.side, sideTimer = span(C.strafeSwitch, rng), heavyHold = 0, jumpPlan = 0;
    let wasAlive = new WeakSet(), cheer = 0;
    let tacticId = null, tacticTimer = 0, tacticDuration = 1, quietTime = 0, healWait = 0, lastHp = 0, lastTargetHp = 0;
    let resetLeft = 0, resetPending = false, decisionLeft = 0, punishLeft = 0, comboChoice = null;
    let lastAttacking = false, lastMove = null, lastMoveTime = 0;
    const newBurst = () => Math.floor(span([profile.burst[0], profile.burst[1] + 1], rng));
    let burstLeft = newBurst();
    let riskLeft = 0, riskWait = span(C.risk.interval, rng), aloneTime = 0, lastStand = false;

    function chooseTactic() {
      const all = Object.entries(profile.patterns).filter(([, weight]) => weight > 0);
      const choices = all.length > 1 ? all.filter(([id]) => id !== tacticId) : all;
      let roll = rng() * choices.reduce((sum, [, weight]) => sum + weight, 0);
      tacticId = (choices.find(([, weight]) => (roll -= weight) < 0) || choices[choices.length - 1])[0];
      tacticDuration = tacticTimer = span(C.tacticTime, rng);
    }

    function chooseTarget(me, enemies) {
      const C = B();
      let best = null, bestScore = Infinity;
      for (const e of enemies) {
        if (!e.alive() || ENEMY_GROUPS.hidden.has(e.state) || Math.abs(e.y - me.y) > CONFIG.height.reach + 1 || gateBetween(me, e)) continue;
        const d = Math.hypot(e.x - me.x, e.z - me.z);
        const awake = !(e.in && (e.in('unaware') || e.state === ES.DORMANT));
        if (d > trackingRange(awake ? C.engageRange : C.wakeRange)) continue;
        const score = d - (e === target ? 2 : 0) - (e.netTarget && e.netTarget === me.botId ? 1.5 : 0);
        if (score < bestScore) { bestScore = score; best = e; }
      }
      return best;
    }
    function escapeDir(me, e, blow) {
      const b = blow.hit.box || blow.attack.box, s = Math.sin(e.yaw), c = Math.cos(e.yaw);
      const dx = me.x - e.x, dz = me.z - e.z, lz = dx * s + dz * c, lx = dz * s - dx * c;
      const dir = Math.abs(lx) > 0.3 ? Math.sign(lx) : side;
      return b.w / 2 - Math.abs(lx) < b.fwd + b.d / 2 - lz + 0.5 ? { x: -c * dir, z: s * dir } : { x: s, z: c };
    }
    function clearPath(me, end) {
      if (gateBetween(me, end)) return false;
      if (!world.solids && (end.x < world.minX + me.radius || end.x > world.maxX - me.radius || Math.abs(end.z) > world.halfZ - me.radius)) return false;
      for (const at of [end, { x: (me.x + end.x) / 2, z: (me.z + end.z) / 2 }]) {
        const floor = world.floorY(at.x, at.z, me.y);
        if (!Number.isFinite(floor) || me.y - floor > CONFIG.height.stepDown || floor - me.y > CONFIG.height.stepUp) return false;
      }
      return true;
    }
    function outsideBox(me, e, blow, x = me.x, z = me.z) {
      const b = blow.hit.box || blow.attack.box;
      if (b.ring) return false;
      const s = Math.sin(e.yaw), c = Math.cos(e.yaw), lunge = (blow.attack.lunge || 0) * blow.hit.active;
      const dx = x - e.x - s * lunge, dz = z - e.z - c * lunge, forward = dx * s + dz * c, left = dz * s - dx * c;
      const margin = me.radius + C.defence.margin;
      return Math.abs(left) > b.w / 2 + margin || forward < b.fwd - b.d / 2 - margin || forward > b.fwd + b.d / 2 + margin;
    }
    function walkEscape(me, e, blow) {
      const a = blow.attack, h = blow.hit, box = h.box || a.box;
      if (box.ring || a.dash || a.breath || a.sphere || h.step || h.leap || h.blink || blow.eta < C.defence.walkLead) return null;
      const d = escapeDir(me, e, blow), travel = CONFIG.player.walkSpeed * (blow.eta - C.defence.walkMargin);
      const end = { x: me.x + d.x * travel, z: me.z + d.z * travel, y: me.y, height: me.height };
      return clearPath(me, end) && outsideBox(me, e, blow, end.x, end.z) ? d : null;
    }

    // Pick a response once per blow. Most are spacing/rolls; a rare parry or physically safe jump adds variety.
    function plan(e, blow, me, enemies, bolt) {
      const key = `${e.netAttack ?? ''}/${blow.attack.id}/${blow.index}`;
      let s = seen.get(e);
      if (!s || s.key !== key) {
        const P = CONFIG.parry, b = blow.attack.box;
        const near = Math.hypot(e.x - me.x, e.z - me.z) <= b.fwd + b.d / 2 + me.radius + P.reach - 0.15;
        const parry = canParryAttack(blow.attack) && near && !blow.hit.leap && !blow.hit.blink && rng() < profile.parry * C.parryChanceScale;
        const walk = !parry && me.isFree() && rng() < profile.evade ? walkEscape(me, e, blow) : null;
        const jump = !parry && !walk && !outsideBox(me, e, blow) && me.grounded && me.isFree() && me.stamina >= CONFIG.player.jumpCost + C.reserve &&
          (!bolt || bolt.eta > 2 * CONFIG.player.jumpVelocity / CONFIG.gravity + C.jumpDodge.followMargin) &&
          enemies.every(o => o === e || !o.alive() || !level(o, me) || gateBetween(o, me) || opening(o, me) > 2 * CONFIG.player.jumpVelocity / CONFIG.gravity + C.jumpDodge.followMargin) ?
          jumpLead(e, blow, me) : null;
        const response = parry ? 'parry' : walk ? 'space' : jump && rng() < profile.jumpDodge ? 'jump' : 'roll';
        const risky = response === 'roll' && rng() < profile.forward + (lastStand ? C.risk.lastStandBonus : 0);
        const early = risky && rng() < C.risk.earlyRollChance;
        s = { key, at: hands.time + span(C.notice, rng), plan: response, done: false, walk, risky,
          lead: response === 'parry' ? span(C.parryLead, rng) : response === 'jump' ? span(jump, rng) : span(early ? C.risk.rollLead : C.rollLead, rng) };
        seen.set(e, s);
      }
      return s;
    }
    // Ordinary rolls seek an escape. Risky ones drive forward to keep pressure, accepting body contact and
    // unsafe landing positions; real collision and the remaining attack decide whether that gamble pays off.
    // Walls and ledges still veto a path. Rings/breaths keep their appropriate directional response.
    function rollDir(me, e, blow, risky = false) {
      const C = B().roll, P = CONFIG.player, to = flat(e.x - me.x, e.z - me.z), b = blow.hit.box || blow.attack.box;
      const turn = rng() < C.reverseChance ? -side : side;
      if (b.ring) return rot(to, turn * span(C.ringAngle, rng));
      if (blow.attack.breath || blow.attack.sphere) return rot(to, Math.PI + turn * span(C.retreatAngle, rng));
      const s = Math.sin(e.yaw), c = Math.cos(e.yaw), dx = me.x - e.x, dz = me.z - e.z;
      const lz = dx * s + dz * c, lx = dz * s - dx * c;
      const sideways = b.w / 2 - Math.abs(lx), ahead = b.fwd + b.d / 2 - lz;
      const dir = Math.abs(lx) > 0.3 ? Math.sign(lx) : side;
      const escape = sideways < ahead + 0.5 ? { x: -c * dir, z: s * dir } : { x: s, z: c };
      // Integral of the player's quadratic roll slowdown, up to the end of its invulnerable part.
      const t = P.rollIFrames, travel = P.rollSpeed * (t - P.rollSlow * t * t * t / (3 * P.rollTime * P.rollTime));
      const margin = me.radius + C.margin;
      const candidates = Object.entries(profile.dodges).filter(([, weight]) => weight > 0).map(([id, weight]) => {
        const d = BOT_DODGES[id], v = rot(d.basis === 'escape' ? escape : to, d.angle * side);
        return { v, weight, inward: d.basis === 'target' && Math.cos(d.angle) > 0.01 };
      }).filter(({ v, inward }) => {
        if (risky && !inward) return false;
        const end = { ...me, x: me.x + v.x * travel, z: me.z + v.z * travel };
        // A safe escape cannot pass through a body; a forward gamble accepts that collision.
        const near = clamp(-(dx * v.x + dz * v.z), 0, travel);
        if (!risky && Math.hypot(dx + v.x * near, dz + v.z * near) < me.radius + e.radius + C.margin) return false;
        const fullTravel = P.rollSpeed * P.rollTime * (1 - P.rollSlow / 3);
        if (!clearPath(me, { x: me.x + v.x * fullTravel, z: me.z + v.z * fullTravel, y: me.y, height: me.height })) return false;
        if (risky) return true;
        const ex = end.x - e.x, ez = end.z - e.z, forward = ex * s + ez * c, left = ez * s - ex * c;
        return Math.abs(left) > b.w / 2 + margin || forward < b.fwd - b.d / 2 - margin || forward > b.fwd + b.d / 2 + margin;
      });
      if (!candidates.length) return risky ? rollDir(me, e, blow, false) : escape;
      let roll = rng() * candidates.reduce((sum, d) => sum + d.weight, 0);
      return (candidates.find(d => (roll -= d.weight) < 0) || candidates[candidates.length - 1]).v;
    }

    // The bolt in flight that will strike it soonest: { eta, dir } (dir: across its flight), or null.
    function incoming(me, bolts) {
      let best = null;
      for (const b of bolts) {
        if (b.passed && b.passed.has(me)) continue;
        const rx = me.x - b.x, rz = me.z - b.z, v2 = b.vx * b.vx + b.vz * b.vz;
        const t = v2 > 1e-6 ? (rx * b.vx + rz * b.vz) / v2 : Infinity;
        if (t < -0.05 || t > 1.5) continue;
        const mx = rx - b.vx * t, mz = rz - b.vz * t;
        if (Math.hypot(mx, mz) > me.radius + b.size + 0.35) continue;
        if (!best || t < best.eta) best = { eta: t, dir: rot(flat(b.vx, b.vz), side * Math.PI / 2) };
      }
      return best;
    }

    function think(dt, me, enemies, allies, bolts = []) {
      const C = B(), P = CONFIG.player, R = C.risk;
      hands.tick(dt);
      const idle = { x: 0, z: 0, has: false };
      if (!me.alive()) { hands.clear(); return { mv: idle, lock: null }; }
      if ((sideTimer -= dt) <= 0) { sideTimer = span(C.strafeSwitch, rng); if (rng() < 0.6) side = -side; }
      // Flair: a hop when a foe it fought falls.
      for (const e of enemies) {
        if (e.alive()) wasAlive.add(e);
        else if (wasAlive.has(e)) { wasAlive.delete(e); if (e === target) cheer = 0.5 + rng() * 0.4; }
      }
      const nextTarget = chooseTarget(me, enemies);
      if (nextTarget !== target) {
        quietTime = healWait = tacticTimer = resetLeft = decisionLeft = punishLeft = 0; tacticId = null;
        resetPending = false; burstLeft = newBurst(); comboChoice = null; lastAttacking = false;
        riskLeft = 0; riskWait = span(R.interval, rng);
        lastHp = me.hp; lastTargetHp = nextTarget?.hp;
      }
      target = nextTarget;
      if (!target) {
        aloneTime = 0; lastStand = false;
        hands.hold('block', false); hands.hold('heavy', false);
        if (cheer > 0 && (cheer -= dt) <= 0.2 && me.isFree() && me.canAct()) { hands.press('jump'); cheer = 0; }
        return { mv: followParty(me, allies), lock: null };
      }
      const e = target, to = flat(e.x - me.x, e.z - me.z), gap = edge(me, e);
      aloneTime = allies.some(a => !a.botId && a.alive()) ? 0 : aloneTime + dt;
      lastStand = aloneTime >= R.lastStandAfter;
      if ((tacticTimer -= dt) <= 0) chooseTactic();
      decisionLeft = Math.max(0, decisionLeft - dt); resetLeft = Math.max(0, resetLeft - dt); punishLeft = Math.max(0, punishLeft - dt);
      const attacking = me.isAttacking();
      if (attacking && (!lastAttacking || me.attack !== lastMove || me.attackT < lastMoveTime)) {
        comboChoice = null;
        if (--burstLeft <= 0) resetPending = true;
      }
      if (me.hp < lastHp) { riskLeft = 0; if (resetLeft <= 0) resetPending = true; }
      if (resetPending && me.isFree()) {
        resetLeft = span(profile.reset, rng) * (lastStand ? R.lastStandReset : 1); resetPending = false; burstLeft = newBurst();
      }
      lastAttacking = attacking; lastMove = me.attack; lastMoveTime = me.attackT;
      // Circling is not progress. Only an exchange (or an untouchable transition) renews its patience.
      if (!attackable(e) || e.in('attacking') || me.isAttacking() || me.state === PS.EXECUTE || me.state === PS.USE_ITEM || me.hp !== lastHp || e.hp !== lastTargetHp) quietTime = 0;
      else quietTime += dt;
      lastHp = me.hp; lastTargetHp = e.hp;
      riskLeft = Math.max(0, riskLeft - dt); riskWait = Math.max(0, riskWait - dt);
      // A single decision buys a brief greedy exchange, rather than a new coin flip on every safe frame.
      // It can spend its roll reserve, squeeze in another hit, and stay committed when the target winds up.
      if (!attackable(e)) riskLeft = 0;
      if (riskWait <= 0 && me.isFree() && me.canAct() && gap <= C.reach + C.closeGap && attackable(e)) {
        riskWait = span(R.interval, rng);
        if (rng() < profile.greed + (lastStand ? R.lastStandBonus : 0)) riskLeft = span(R.duration, rng);
      }
      const greedy = riskLeft > 0;
      const pressing = quietTime >= profile.patience * (lastStand ? R.lastStandReset : 1);
      const tactic = BOT_TACTICS[pressing || greedy ? 'pressure' : tacticId];
      const settled = 1 - tacticTimer / tacticDuration >= tactic.commitAt;
      const flask = me.item('flask'), needsHeal = me.hp < me.maxHp * C.healBelow && flask.count > 0;
      healWait = needsHeal ? healWait + dt : 0;

      // ---- 1. Defence: the most urgent blow (from any enemy) that can land on it ----
      let urgent = null;
      const bolt = incoming(me, bolts);
      for (const o of enemies) {
        if (!o.alive() || !level(o, me) || gateBetween(o, me)) continue;
        const blow = nextBlow(o, me);
        if (!blow || Math.hypot(o.x - me.x, o.z - me.z) > reach(o, blow.attack, blow.hit, me)) continue;
        const s = plan(o, blow, me, enemies, bolt);
        if (s.done || hands.time < s.at) continue;
        if (!urgent || blow.eta < urgent.blow.eta) urgent = { enemy: o, blow, s };
      }
      hands.hold('block', false);
      if (bolt && bolt.eta <= 0.14) {
        if (me.canAct() && (me.isFree() || me.state === PS.ATTACK)) { hands.press('roll'); return { mv: { ...bolt.dir, has: true }, lock: e }; }
        if (me.isFree()) { hands.hold('block', true); return { mv: idle, lock: e }; }
      }
      // Greed can trade with the target, but does not ignore another opponent or a projectile to do it.
      const trading = urgent && greedy && urgent.enemy === e &&
        (me.state === PS.ATTACK || me.isFree() && gap <= C.reach && urgent.blow.eta >= R.minWindow) &&
        (!bolt || bolt.eta > commit(A()[me.def.moveset.ground.light]) + C.safety) &&
        enemies.every(o => o === e || !o.alive() || !level(o, me) || gateBetween(o, me) || opening(o, me) > commit(A()[me.def.moveset.ground.light]) + C.safety);
      if (urgent && !trading) {
        const { blow, s, enemy } = urgent;
        const iFrames = P.rollIFrames - 0.02, lead = s.risky ? s.lead : Math.max(0.01, Math.min(s.lead, iFrames - (blow.end - blow.eta)));
        if (s.plan === 'space') {
          if (outsideBox(me, enemy, blow)) return { mv: idle, lock: enemy };
          if (me.isFree() && blow.eta > lead) return { mv: { ...s.walk, has: true }, lock: enemy };
          s.plan = 'roll';   // tracked, boxed in, or too little space: use the emergency dodge
        }
        if (s.plan === 'jump' && blow.eta <= s.lead) {
          const range = jumpLead(enemy, blow, me), flight = 2 * P.jumpVelocity / CONFIG.gravity + C.jumpDodge.followMargin;
          const safe = range && blow.eta >= range[0] && me.grounded && me.isFree() && me.canAct() &&
            me.stamina >= P.jumpCost + C.reserve && Math.hypot(me.vx, me.vz) <= C.jumpDodge.maxSpeed &&
            clearPath(me, { x: me.x + me.vx * flight, z: me.z + me.vz * flight, y: me.y, height: me.height }) &&
            (!bolt || bolt.eta > flight) && enemies.every(o => o === enemy || !o.alive() || !level(o, me) || gateBetween(o, me) || opening(o, me) > flight);
          if (safe) {
            hands.press('jump'); hands.hold('heavy', false); heavyHold = jumpPlan = 0; s.done = true;
            return { mv: idle, lock: enemy };
          }
          s.plan = 'roll';   // late notice or another threat appeared: keep the grounded response
        }
        if (s.plan === 'jump') return { mv: idle, lock: enemy };
        if (s.plan === 'parry' && me.canAct() && blow.eta <= s.lead) {
          if (me.isFree() || me.state === PS.BLOCK) { hands.press('parry'); s.done = true; return { mv: idle, lock: enemy }; }
          if (blow.eta < 0) s.plan = 'roll';   // caught busy: fall back to whatever still works
        }
        if (s.plan === 'roll' && blow.eta <= lead) {
          if (me.canAct()) { const d = rollDir(me, enemy, blow, s.risky); hands.press('roll'); s.done = true; heavyHold = 0; hands.hold('heavy', false); return { mv: { ...d, has: true }, lock: enemy }; }
          if (!blow.attack.rollOnly && me.in('free')) { hands.hold('block', true); return { mv: idle, lock: enemy }; }   // no stamina: guard
        }
        // A blow is coming soon: hold off new swings and keep it in front.
        if (blow.eta < 0.9) return { mv: strafe(me, flat(enemy.x - me.x, enemy.z - me.z), edge(me, enemy), C.spacing + 0.6, 1), lock: enemy };
      }

      // ---- 2. The window: how long until any nearby enemy could hurt it ----
      let window = Infinity, incomingWindow = Infinity, healWindow = Infinity;
      for (const o of enemies) if (o.alive() && level(o, me) && !gateBetween(o, me)) {
        const safe = opening(o, me);
        window = Math.min(window, safe);
        if (o.state === ES.WINDUP || o.state === ES.ACTIVE) incomingWindow = Math.min(incomingWindow, safe);
        if (needsHeal) healWindow = Math.min(healWindow, opening(o, me, 'heal'));
      }
      if (bolt) { window = Math.min(window, bolt.eta); incomingWindow = Math.min(incomingWindow, bolt.eta); healWindow = Math.min(healWindow, bolt.eta); }

      // A charged heavy being held: let go once charged enough, or when the window closes.
      const heavy = A().heavy;
      if (me.state === PS.ATTACK && me.attack === heavy && me.charge === 1) {
        heavyHold -= dt;
        const left = heavy.hits[0].startup * (1 - heavy.charge.at) + heavy.hits[0].active;
        if (heavyHold <= 0 || window < left + C.safety + 0.15) hands.hold('heavy', false);
        return { mv: idle, lock: e };
      }
      if (jumpPlan > 0) {   // airborne: bring the blade down
        jumpPlan -= dt;
        if (me.state === PS.JUMP || me.state === PS.FALL) { if (me.vy < 2) { hands.press('heavy'); jumpPlan = 0; } return { mv: { ...to, has: true }, lock: e }; }
      }

      // ---- 3. Heal when hurt and safe; back off first ----
      if (needsHeal) {
        if (me.isFree() && healWindow > ITEMS.flask.useTime + C.safety + 0.5 && (healWindow > C.healWindow + ITEMS.flask.useTime || gap > C.healGap)) {
          hands.press('flask'); healWait = 0; return { mv: idle, lock: e };
        }
        // A boss may never grant a drink at range. After a brief retreat, fight to earn one instead of fleeing forever.
        if (!greedy && healWait < C.healRetreatTime && healWindow < C.healWindow + ITEMS.flask.useTime) return { mv: strafe(me, to, gap, C.healGap + 2, 0.3), lock: e };
      }

      // ---- 4. Offence ----
      const T = C.tempo;
      const opportunity = me.riposte > 0 || [ES.PARRIED, ES.STAGGER, ES.BROKEN].includes(e.state) ||
        e.state === ES.RECOVER && e.attack && e.attack.recovery - e.stateTime >= T.punishRecovery && window >= T.punishWindow ||
        e.hp <= e.def.hp * T.finishBelow && window >= T.punishWindow;
      if (opportunity) punishLeft = T.punishCommit;
      const keyOpening = opportunity || punishLeft > 0 && window > commit(A()[me.def.moveset.ground.light]) + C.safety;
      const retreating = resetLeft > 0 && !keyOpening && !pressing && !greedy;
      const committed = greedy || keyOpening || pressing || !retreating && settled;
      const reserve = greedy ? R.reserve : window > 2.5 ? P.rollCost + 2 : C.reserve;
      const attackWindow = window + (greedy && window >= R.minWindow ? R.windowSlack : 0);
      const can = cost => me.canAct() && me.stamina - cost >= reserve;
      const exec = typeof execution !== 'undefined' ? execution.target(me, enemies) : null;
      if (exec && me.isFree()) { hands.press('light'); return { mv: idle, lock: exec }; }
      if (e.state === ES.BROKEN) {   // kneeling: get in front of it for the execution
        const front = { x: e.x + Math.sin(e.yaw) * (e.radius + me.radius + 0.4), z: e.z + Math.cos(e.yaw) * (e.radius + me.radius + 0.4) };
        return { mv: flat(front.x - me.x, front.z - me.z), lock: e };
      }
      if (!attackable(e)) return { mv: strafe(me, to, gap, C.spacing + 1, 1), lock: e };
      const inReach = gap <= C.reach;
      // Chain the combo: in a light's follow-through, press again if the window still holds the next swing.
      if (me.state === PS.ATTACK && me.attack && me.attack.next && inReach) {
        const next = A()[me.attack.next.light], tl = attackTimeline(me.attack, me.attackT);
        const left = commit(me.attack) - me.attackT;
        if (tl.phase !== PHASE.STARTUP && comboChoice === null)
          comboChoice = rng() < (greedy ? R.combo : keyOpening ? T.punishCombo : T.comboBase + profile.aggression * T.comboAggression);
        if (next && comboChoice && (burstLeft > 0 || keyOpening || greedy) && attackWindow > left + commit(next) + C.safety && can(next.cost)) {
          hands.press('light'); comboChoice = false;
        }
        return { mv: idle, lock: e };
      }
      if (me.isFree()) {
        const light = A()[me.def.moveset.ground.light];
        const ready = attackWindow > commit(light) + C.safety;
        // A quiet neutral opponent is a possibility, not a strike already in flight. Eventually try a single light
        // to start an exchange; actual wind-ups, other enemies, bolts and stamina still veto the commitment.
        const probe = quietTime >= profile.patience + C.probeDelay && incomingWindow > commit(light) + C.safety;
        if (inReach && (ready || probe) && (committed || probe) && (decisionLeft <= 0 || keyOpening)) {
          decisionLeft = span(profile.think, rng);
          const rip = me.riposte > 0;
          if (ready && window > C.chargeWindow + commit(heavy) && can(heavy.cost) && (rip || rng() < profile.heavy)) {
            hands.press('heavy'); hands.hold('heavy', true); heavyHold = rip ? 0.1 : heavy.charge.hold * (0.5 + 0.5 * rng());
            return { mv: idle, lock: e };
          }
          if (ready && (rip || rng() < profile.heavy) && attackWindow > commit(heavy) + C.safety && can(heavy.cost)) { hands.press('heavy'); return { mv: idle, lock: e }; }
          if (can(light.cost)) { hands.press('light'); return { mv: idle, lock: e }; }
        }
        // Flair: from a step or two out, a long opening can take a leaping heavy.
        const jh = A().jumpHeavy;
        if (!inReach && committed && !retreating && decisionLeft <= 0 && gap < 3.2 && window > 2.0 && can(P.jumpCost + jh.cost) && rng() < profile.jump * dt * 14) {
          hands.press('jump'); decisionLeft = span(profile.think, rng); jumpPlan = 1.2; return { mv: { ...to, has: true }, lock: e };
        }
        // Keep the chosen tempo even when a hypothetical opening is large: bait, flank, press, or regroup.
        // Actual punish opportunities and the bounded standoff fallback are the deliberate overrides.
        const recovering = !can(light.cost) || me.stamina < me.maxStamina * T.regroupBelow;
        const motion = recovering || retreating ? BOT_TACTICS.reset : committed ? BOT_TACTICS.pressure : tactic;
        return { mv: strafe(me, to, gap, motion.gap, motion.circle), lock: e };
      }
      return { mv: idle, lock: e };
    }
    // Walk toward a gap of `want` m, circling to the bot's current side by `circle` (0..1 of CONFIG.bot.strafe).
    function strafe(me, to, gap, want, circle) {
      const C = B(), radial = clamp((gap - want) * 1.2, -1, 1);
      const tang = rot(to, side * Math.PI / 2), k = C.strafe * circle * (Math.abs(radial) < 0.6 ? 1 : 0.4);
      return flat(to.x * radial + tang.x * k, to.z * radial + tang.z * k);
    }
    function followParty(me, allies) {
      const C = B();
      let lead = null, d = Infinity;
      for (const a of allies) { const k = Math.hypot(a.x - me.x, a.z - me.z); if (a.alive() && k < d) { d = k; lead = a; } }
      if (!lead || d < C.follow[0]) return { x: 0, z: 0, has: false };
      return d > C.follow[1] ? flat(lead.x - me.x, lead.z - me.z) : { x: 0, z: 0, has: false };
    }
    return { hands, think, profile, get target() { return target; }, get tactic() { return tacticId; }, get risking() { return riskLeft > 0; } };
  }
  return { create, nextBlow, opening, reach, jumpLead };
})();
