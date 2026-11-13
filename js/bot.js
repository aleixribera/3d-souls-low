'use strict';
// ============================================================================
// Friendly bots (v7.15.0)
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
    // A boss late in a Boss Rush winds up faster (Enemy.tellRate), and the bot reads the quicker tell as a person would.
    if (e.state === ES.WINDUP) eta = (hit.startup - e.stateTime) / (e.tellRate ? e.tellRate() : 1) + (e.holdLeft > 0 ? e.holdLeft : 0);
    else if (e.hitbox) eta = -e.stateTime;
    else {
      if (i + 1 >= a.hits.length) return null;
      eta = hit.active + (hit.follow || 0) - e.stateTime + a.hits[i + 1].startup / (e.tellRate ? e.tellRate() : 1); hit = a.hits[++i];
    }
    const b = hit.box || a.box;
    if (b.ring) {   // an expanding ring reaches this body a little after it opens: when its outer edge touches it (pass 32: not its middle)
      const d = Math.hypot(e.x - me.x, e.z - me.z) - me.radius - b.ring.width / 2;
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
  // The follow-ups an attack may chain at once as its last hit ends (no recovery between): their moves.
  const follows = new WeakMap();
  function followsOf(e, a) {
    let list = follows.get(a);
    if (!list) follows.set(a, list = (a.followUps || []).filter(f => f.chance > 0).map(f => e.baseDef.attacks.find(m => m.id === f.attack)).filter(Boolean));
    return list;
  }
  // A string: an enemy mid-attack, with the hits it has left and the follow-ups it may chain. `more`: a blow after
  // the next one; `reach`: the farthest of them that can be outrun lands (centre to the edge of `me`, as reach()).
  // A shot's draw is no string: its wind-up stays a window to punish.
  function stringOf(e, me) {
    const a = e.attack;
    if (!a || a.projectile || (e.state !== ES.WINDUP && e.state !== ES.ACTIVE)) return null;
    const next = followsOf(e, a), from = e.state === ES.ACTIVE && !e.hitbox ? e.hitIndex + 1 : e.hitIndex;
    const most = B().string.outrun + me.radius + e.radius;   // a leap or blink that lands anywhere is no reason to back off
    let r = 0;
    for (let i = e.hitIndex; i < a.hits.length; i++) { const x = reach(e, a, a.hits[i], me); if (x <= most) r = Math.max(r, x); }
    for (const f of next) if (!f.projectile) for (const h of f.hits) { const x = reach(e, f, h, me); if (x <= most) r = Math.max(r, x); }
    return { more: a.hits.length - from > 1 || next.length > 0, reach: r };
  }
  // Seconds of safety this enemy grants: until a blow from it could open on `me`. Infinity when it cannot reach.
  function opening(e, me, intent = 'attack') {
    const C = B(), d = e.def, quick = quickest(e), st = e.stateTime;
    if (!e.alive() || ENEMY_GROUPS.hidden.has(e.state)) return Infinity;
    // A boss's pace (Enemy.pace) runs its recoveries and cooldown faster and its tell (Enemy.tellRate) its wind-ups:
    // their seconds are read in real time here.
    const pace = e.pace > 0 ? e.pace : 1, tell = e.tellRate ? e.tellRate() : 1;
    const cool = Math.max(0, e.cooldown || 0) * C.windowTrust / pace, base = d.cooldown ? d.cooldown[0] * C.windowTrust / pace : 0;
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
        const left = a.hits.slice(e.hitIndex).reduce((n, h) => n + h.startup / tell + h.active + (h.follow || 0), 0) - (e.state === ES.WINDUP ? st / tell : st);
        // A follow-up skips the recovery: its wind-up starts as the last hit ends.
        let chained = Infinity;
        for (const f of followsOf(e, a)) chained = Math.min(chained, f.hits[0].startup / tell + Math.max(0, edge(me, e) + me.radius - reach(e, f, f.hits[0], me)) / Math.max(0.5, d.speed || 2));
        return Math.max(0, left) + Math.min(a.recovery / pace + base + quick + walk, chained);
      }
      case ES.RECOVER: return Math.max(0, e.attack ? (e.attack.recovery - st) / pace : 0) + base + quick + walk;
      case ES.PARRIED: return Math.max(0, d.parriedTime - st) + base + quick;
      case ES.STAGGER: return Math.max(0, d.staggerTime - st) + base + quick;
      case ES.HURT: return Math.max(0, d.flinchTime - st) + Math.min(cool + quick, quickestReaction(e, me, intent));
      case ES.BROKEN: return Math.max(0, (d.posture || d.guard || d.stagger).breakTime - st) + base + quick;
      case ES.EXECUTED: case ES.PHASE: return Infinity;
      default: return Math.min(cool + quick + walk, quickestReaction(e, me, intent) + walk);
    }
  }
  // A blow swung at someone else, in front of the enemy while `me` stands behind it: a player watching it lets it go.
  // Only where the enemy's target is known (the server's netTarget); rings, blinks, leaps and boxes round it count.
  function aimedElsewhere(e, blow, me) {
    const b = blow.hit.box || blow.attack.box;
    if (!e.netTarget || e.netTarget === (me.id ?? me.botId) || b.ring || blow.hit.blink || blow.hit.leap || blow.attack.breath || blow.attack.sphere || b.fwd - b.d / 2 < 0) return false;
    return Math.abs(angDiff(Math.atan2(me.x - e.x, me.z - e.z), e.yaw)) > Math.PI / 2 + B().behindMargin;
  }
  // The enemy's attention is on `me`: the server's netTarget where it is known, else (a solo companion) it faces `me`
  // and nobody else is nearer to it.
  function huntedBy(e, me, allies) {
    if (e.netTarget !== undefined && e.netTarget !== null) return e.netTarget === (me.id ?? me.botId);
    const mine = Math.hypot(me.x - e.x, me.z - e.z);
    if (allies.some(a => a.alive() && Number.isFinite(a.x) && Math.hypot(a.x - e.x, a.z - e.z) < mine)) return false;
    return Math.abs(angDiff(Math.atan2(me.x - e.x, me.z - e.z), e.yaw)) < Math.PI / 4;
  }
  // Whoever the enemy is after, when it is not `me`: the server's netTarget where it is known, else (a solo companion)
  // the nearest one it faces, nearer to it than `me`.
  function quarry(e, me, allies) {
    const live = a => a.alive() && Number.isFinite(a.x);
    if (e.netTarget !== undefined && e.netTarget !== null)
      return e.netTarget === (me.id ?? me.botId) ? null : allies.find(a => live(a) && a.id === e.netTarget) || null;
    let best = null, near = Math.hypot(me.x - e.x, me.z - e.z);
    for (const a of allies) if (live(a)) { const d = Math.hypot(a.x - e.x, a.z - e.z); if (d < near) { best = a; near = d; } }
    return best && Math.abs(angDiff(Math.atan2(best.x - e.x, best.z - e.z), e.yaw)) < Math.PI / 3 ? best : null;
  }
  // The positional counters (REACTIONS behind / flank) this enemy's current moves hold.
  const sideWhens = new WeakMap();
  function sideCounters(e) {
    const list = e.def.attacks || e.baseDef.attacks;
    if (!sideWhens.has(list)) sideWhens.set(list, [...new Set(attacksOf(e).filter(a => a.when === 'behind' || a.when === 'flank').map(a => a.when))]);
    return sideWhens.get(list);
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

  function create(base, rng = Math.random) {
    const hands = new BotHands(), C = B(), navigator = BotNavigation.create();
    // `profile`: this fight's traits, the base profile scaled by the mood drawn for it (newFight).
    let profile = base, mood = null, moodId = null, spacing = 0, goIn = 0, stringSeen = -Infinity, wasString = false;
    // offered: openings left to a person; backup: s spent behind an enemy that was after someone else; drew: times it
    // pressed to draw an enemy off a hurt or drinking ally; waiting: s spent free within 3 m of a light's reach of an
    // enemy it could hit, not swinging (waiting out a string, a beat before going in, circling, baiting or regrouping).
    const tally = { waited: 0, gaps: 0, yielded: 0, executed: 0, offered: 0, backup: 0, drew: 0, waiting: 0, slips: 0 };
    let waitedThis = false, nearThis = false, yieldedThis = null, offeredThis = null, sharedThis = null, rescuing = false, unplaced = 0, flankSide = 1, quietSince = 0;
    // Edge gap it keeps from an enemy mid-string: past the reach of the blows it can outrun (at most string.outrun), else its spacing.
    function holdGap(me, o) {
      const s = stringOf(o, me);
      return Math.max(B().spacing + spacing, s ? Math.min(B().string.outrun, s.reach + spacing - me.radius - o.radius) : 0);
    }
    const pick = (weights, r) => {
      const all = Object.entries(weights).filter(([, w]) => w > 0);
      let roll = r * all.reduce((sum, [, w]) => sum + w, 0);
      return (all.find(([, w]) => (roll -= w) < 0) || all[all.length - 1])[0];
    };
    function newFight() {
      moodId = pick(base.moods, rng()); mood = BOT_MOODS[moodId];
      const patterns = {};
      for (const [id, w] of Object.entries(base.patterns)) patterns[id] = w * span(C.moodJitter, rng);
      profile = { ...base, patterns, patience: base.patience * mood.patience, greed: clamp(base.greed * mood.greed, 0, 1),
        reset: base.reset.map(x => x * mood.reset), healBelow: C.healBelow + mood.heal };
      spacing = span(mood.spacing, rng); goIn = span(mood.goIn, rng);
      side = rng() < 0.75 ? base.side : -base.side; flankSide = side;
      for (const k of Object.keys(tally)) tally[k] = 0;
    }
    function describe() {
      if (!mood) return 'no fight yet';
      const plans = Object.entries(profile.patterns).map(([id, w]) => `${id} ${w.toFixed(2)}`).join(', ');
      return `${moodId}: ${mood.gap === null ? 'waits out every string' : `swings into pauses of ${mood.gap} s or more`}, ` +
        `keeps ${spacing.toFixed(1)} m past a string's reach, goes in ${goIn.toFixed(2)} s after, patience ${profile.patience.toFixed(1)} s, ` +
        `greed ${profile.greed.toFixed(2)}, circles ${side > 0 ? 'left' : 'right'}; plans ${plans}. ` +
        `Waited out ${tally.waited} strings, swung into ${tally.gaps} pauses, left ${tally.yielded} executions and ${tally.offered} openings to a player, took ${tally.executed} executions; ` +
        `${tally.backup.toFixed(0)} s behind an enemy on someone else, drew it off a hurt ally ${tally.drew} times.`;
    }
    const seen = new WeakMap();   // enemy -> { key, at, plan, done }: what was decided about its current blow
    let target = null, side = profile.side, sideTimer = span(C.strafeSwitch, rng), heavyHold = 0, jumpPlan = 0;
    let wasAlive = new WeakSet(), cheer = 0;
    let tacticId = null, tacticTimer = 0, tacticDuration = 1, quietTime = 0, healWait = 0, lastHp = 0, lastTargetHp = 0;
    let resetLeft = 0, resetPending = false, decisionLeft = 0, punishLeft = 0, comboChoice = null;
    let lastAttacking = false, lastMove = null, lastMoveTime = 0;
    const newBurst = () => Math.floor(span([profile.burst[0], profile.burst[1] + 1], rng));
    let burstLeft = newBurst();
    let riskLeft = 0, riskWait = span(C.risk.interval, rng), wary = false, steady = false;

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
        const score = d - (e === target ? 2 : 0) - (e.netTarget && e.netTarget === (me.id ?? me.botId) ? 1.5 : 0);
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
    function outsideBox(me, e, blow, x = me.x, z = me.z, yaw = e.yaw, extra = 0) {
      const b = blow.hit.box || blow.attack.box;
      if (b.ring) return false;
      const s = Math.sin(yaw), c = Math.cos(yaw), lunge = (blow.attack.lunge || 0) * blow.hit.active;
      const dx = x - e.x - s * lunge, dz = z - e.z - c * lunge, forward = dx * s + dz * c, left = dz * s - dx * c;
      const margin = me.radius + C.defence.margin + extra;
      return Math.abs(left) > b.w / 2 + margin || forward < b.fwd - b.d / 2 - margin || forward > b.fwd + b.d / 2 + margin;
    }
    // Where an enemy can still carry a blow before it lands, summed over its hits up to that one: how far it can turn
    // (rad), and how far its steps, dash, leap, lunge and present momentum can move it along its facing (lo..hi m) and
    // sideways (side m). curve: the part of that travel that can start while it still turns, so its path can bend.
    // null for a blink, which can put it anywhere.
    function carry(e, blow) {
      const a = blow.attack, v = Math.hypot(e.vx || 0, e.vz || 0);
      // What it is moving at now runs on: an enemy only slows at CONFIG.enemy.accel (a dash slides on through its strike).
      const out = { turn: 0, lo: 0, hi: v * v / (2 * CONFIG.enemy.accel), side: 0, curve: 0 };
      for (let j = e.hitIndex; j <= blow.index; j++) {
        const h = a.hits[j], current = j === e.hitIndex, windup = !current || e.state === ES.WINDUP;
        if (h.blink) return null;
        if (windup) {
          const st = current ? e.stateTime : 0, rate = (a.tracking && a.tracking.rate) || a.track || e.def.trackRate || 0;
          const until = a.tracking ? h.startup * a.tracking.commit : a.track ? Infinity : h.startup * CONFIG.enemy.windupTrack;
          // A held wind-up turns longer: what is left of a hold, or the longest one not yet rolled.
          const rolled = current && e.holdLeft !== null, held = rolled ? Math.max(0, e.holdLeft) : h.hold ? h.hold.time[1] : 0;
          out.turn += rate * (Math.max(0, Math.min(until, h.startup) - st) + held);
          const moving = from => Math.max(0, h.startup - Math.max(st, h.startup * from));
          const go = (from, d) => { if (from < until / h.startup) out.curve += Math.abs(d); return d; };
          if (h.step) { const t = moving(h.step.from); out.hi += go(h.step.from, h.step.speed * t); out.side += Math.abs(h.step.side || 0) * t; }
          // A dash does not stop for a hold.
          if (a.dash && j === 0) out.hi += go(a.dash.from, a.dash.speed * (moving(a.dash.from) + (h.hold && h.hold.at >= a.dash.from ? held : 0)));
          if (h.leap && (!current || e.leaping || e.leapHit !== j)) { if (h.leap.back) out.lo -= go(h.leap.from, h.leap.back); else out.hi += go(h.leap.from, h.leap.max); }
        }
        const past = windup ? 0 : e.stateTime, striking = Math.max(0, h.active - past);   // already into this hit's strike or follow-through
        const lunge = Math.max(a.lunge || 0, a.dash && j === 0 ? a.dash.speed : 0) * striking;
        out.hi += lunge;
        if (a.track) {   // a tracking blow turns through its swing, lunging as it turns
          out.turn += a.track * Math.max(0, h.active + (j < blow.index ? h.follow || 0 : 0) - past);
          out.curve += lunge;
        }
      }
      return out;
    }
    // Already clear of a blow that cannot reach it: the blow's box, swept along the enemy's facing as far as its steps,
    // dash, leap and lunge can carry it, misses `me` at every angle the enemy can still turn to before it locks. A player
    // standing there lets it go by (behind a boss that swings at someone else, a breath swept past its flank) instead of
    // rolling at each hit. Exact, not sampled: the angles at which the swept box covers my distance from the enemy are
    // [inLo, inHi] (cut to where its width reaches), and the enemy can face me at any angle from |bearing| - turn to
    // |bearing| + turn. Travel that can bend while it turns (curve) widens the box by as far as the bend can carry it.
    function clearOf(me, e, blow) {
      const b = blow.hit.box || blow.attack.box, t = !b.ring && carry(e, blow);
      if (!t) return false;
      const margin = me.radius + C.defence.margin + C.defence.clear, r = Math.hypot(me.x - e.x, me.z - e.z);
      const near = b.fwd - b.d / 2 + t.lo - margin, far = b.fwd + b.d / 2 + t.hi + margin;
      const half = b.w / 2 + t.side + t.curve * Math.sin(Math.min(t.turn, Math.PI / 2)) + margin;
      if (r < 1e-3 || near > r || far < -r) return near > 0 || far < 0;   // at its centre, or nearer or farther than the box ever is
      const bearing = Math.abs(angDiff(Math.atan2(me.x - e.x, me.z - e.z), e.yaw)), turn = Math.min(Math.PI, t.turn);
      const from = Math.max(0, bearing - turn), to = Math.min(Math.PI, bearing + turn);
      const inLo = Math.acos(clamp(far / r, -1, 1)), inHi = Math.acos(clamp(near / r, -1, 1)), side = Math.asin(clamp(half / r, 0, 1));
      const overlaps = (lo, hi) => Math.max(from, inLo, lo) <= Math.min(to, inHi, hi);
      return !overlaps(0, side) && !overlaps(Math.PI - side, Math.PI);
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
        // A forward gamble trades one blow; inside a string with more to come it would only roll into the next.
        const risky = response === 'roll' && !moreAfter(e, blow) && !wary && rng() < profile.forward;
        const early = risky && rng() < C.risk.earlyRollChance;
        // A slip: now and then a roll goes too early (its i-frames run out first) or too late, as a person's would;
        // less often when badly hurt and minding every blow (CONFIG.bot.caution.slip).
        const slip = response === 'roll' && !risky && mood && rng() < mood.slip * (steady ? C.caution.slip : 1) ? (rng() < 0.6 ? span(C.slip.early, rng) : -span(C.slip.late, rng)) : null;
        s = { key, at: hands.time + span(C.notice, rng), plan: response, done: false, walk, risky, slip: slip !== null,
          lead: slip !== null ? slip : response === 'parry' ? span(C.parryLead, rng) : response === 'jump' ? span(jump, rng) : span(early ? C.risk.rollLead : C.rollLead, rng) };
        seen.set(e, s); if (s.slip) tally.slips++;
      }
      return s;
    }
    const moreAfter = (e, blow) => blow.index < blow.attack.hits.length - 1 || followsOf(e, blow.attack).length > 0;
    // Ordinary rolls seek an escape. Risky ones drive forward to keep pressure, accepting body contact and
    // unsafe landing positions; real collision and the remaining attack decide whether that gamble pays off.
    // Walls and ledges still veto a path. Rings/breaths keep their appropriate directional response.
    function rollDir(me, e, blow, risky = false) {
      const C = B().roll, P = CONFIG.player, to = flat(e.x - me.x, e.z - me.z), b = blow.hit.box || blow.attack.box;
      const turn = rng() < C.reverseChance ? -side : side;
      if (b.ring) return rot(to, turn * span(C.ringAngle, rng));
      if (blow.attack.sphere) return rot(to, Math.PI + turn * span(C.retreatAngle, rng));   // a breath is left sideways, out of its box
      const s = Math.sin(e.yaw), c = Math.cos(e.yaw), dx = me.x - e.x, dz = me.z - e.z;
      const lz = dx * s + dz * c, lx = dz * s - dx * c;
      const sideways = b.w / 2 - Math.abs(lx), ahead = b.fwd + b.d / 2 - lz;
      // Past the first blow of a string with more to come, roll away from it (a little off straight back), so the
      // next blow finds it further out rather than still inside: no roll-after-roll loop across a combo.
      const fullTravel = P.rollSpeed * P.rollTime * (1 - P.rollSlow / 3);
      const back = rot(to, Math.PI + turn * span(C.retreatAngle, rng) * 0.5);
      const clearBack = () => clearPath(me, { x: me.x + back.x * fullTravel, z: me.z + back.z * fullTravel, y: me.y, height: me.height });
      if (!risky && blow.index > 0 && moreAfter(e, blow) && clearBack()) return back;
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
        if (!clearPath(me, { x: me.x + v.x * fullTravel, z: me.z + v.z * fullTravel, y: me.y, height: me.height })) return false;
        if (risky) return true;
        const ex = end.x - e.x, ez = end.z - e.z, forward = ex * s + ez * c, left = ez * s - ex * c;
        return Math.abs(left) > b.w / 2 + margin || forward < b.fwd - b.d / 2 - margin || forward > b.fwd + b.d / 2 + margin;
      });
      if (!candidates.length) {
        if (risky) return rollDir(me, e, blow, false);
        // Nothing clears the box this roll. With more of the string to come, roll away from it rather than across,
        // so the next blow finds it further out, not still inside (the roll-after-roll loop).
        if (moreAfter(e, blow) && clearBack()) return back;
        return escape;
      }
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

    function think(dt, me, enemies, allies, bolts = [], leader = null) {
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
        // A new fight (the first opponent, or one after a quiet spell) draws a new temperament.
        if (nextTarget && (!mood || quietSince >= C.fightGap)) newFight();
        quietSince = 0; stringSeen = -Infinity; wasString = false;
        quietTime = healWait = tacticTimer = resetLeft = decisionLeft = punishLeft = 0; tacticId = null;
        resetPending = false; burstLeft = newBurst(); comboChoice = null; lastAttacking = false;
        riskLeft = 0; riskWait = span(R.interval, rng);
        lastHp = me.hp; lastTargetHp = nextTarget?.hp;
      }
      target = nextTarget;
      if (!target) {
        quietSince += dt;
        wary = steady = false;
        hands.hold('block', false); hands.hold('heavy', false);
        if (cheer > 0 && (cheer -= dt) <= 0.2 && me.isFree() && me.canAct()) { hands.press('jump'); cheer = 0; }
        const lead = leader || allies.filter(a => !a.botId && a.alive()).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
        return { mv: navigator.move(dt, me, lead), lock: null };
      }
      navigator.reset();
      const e = target, to = flat(e.x - me.x, e.z - me.z), gap = edge(me, e);
      // Caution (CONFIG.bot.caution): hurt, or out of flasks and not far from it, or the enemy's mark while someone
      // else is there to fight it. A wary bot trades nothing and goes in only for a real opening, from farther out.
      const CA = C.caution, flask = me.item('flask'), health = me.hp / me.maxHp;
      const company = allies.some(a => a.alive() && Number.isFinite(a.x) && Math.hypot(a.x - e.x, a.z - e.z) <= CA.company);
      const careful = health < CA.below || flask.count === 0 && health < CA.dry, shy = company && huntedBy(e, me, allies);
      wary = careful || shy; steady = careful;
      const roomy = (careful ? CA.spacing : 0) + (shy ? CA.hunted : 0);
      const spare = C.safety + (wary ? CA.safety : 0);   // s left over after its own swing before a blow could open
      // Support (CONFIG.bot.support): a person near this enemy sets the tempo, and whoever it is after gets backup:
      // the bot fights from their far side, and presses to draw it off them when they are hurt or drinking.
      const S = C.support, X = C.execution;
      let person = null, nearest = X.yield;
      for (const a of allies) { const d = Math.hypot(a.x - e.x, a.z - e.z); if (!a.botId && a.alive() && d <= nearest) { person = a; nearest = d; } }
      const hunted = quarry(e, me, allies), flank = behind(me, e, hunted);
      const rescue = !!hunted && !careful && (hunted.hp < (hunted.maxHp || me.maxHp) * CA.below || hunted.state === PS.USE_ITEM);
      if (rescue && !rescuing) tally.drew++;
      rescuing = rescue;
      if (flank && !flank.far && gap <= C.reach + 2) tally.backup += dt;
      const patience = profile.patience * (careful ? CA.patience : 1) * (person ? S.patience : 1);
      // Walk toward a gap of `want` m: round to the enemy's back while it is after someone else, else circling as planned.
      const orbit = (want, circle) => flank ? strafe(me, to, gap, want, flank.far ? Math.max(circle, 1) : 0, flank.dir) : strafe(me, to, gap, want, circle);
      if ((tacticTimer -= dt) <= 0) chooseTactic();
      decisionLeft = Math.max(0, decisionLeft - dt); resetLeft = Math.max(0, resetLeft - dt); punishLeft = Math.max(0, punishLeft - dt);
      const attacking = me.isAttacking();
      if (attacking && (!lastAttacking || me.attack !== lastMove || me.attackT < lastMoveTime)) {
        comboChoice = null;
        if (--burstLeft <= 0) resetPending = true;
      }
      if (me.hp < lastHp) { riskLeft = 0; if (resetLeft <= 0) resetPending = true; }
      if (resetPending && me.isFree()) {
        resetLeft = span(profile.reset, rng); resetPending = false; burstLeft = newBurst();
      }
      lastAttacking = attacking; lastMove = me.attack; lastMoveTime = me.attackT;
      // Circling is not progress. Only an exchange (or an untouchable transition) renews its patience.
      if (!attackable(e) || e.in('attacking') || me.isAttacking() || me.state === PS.EXECUTE || me.state === PS.USE_ITEM || me.hp !== lastHp || e.hp !== lastTargetHp) quietTime = 0;
      else quietTime += dt;
      lastHp = me.hp; lastTargetHp = e.hp;
      riskLeft = Math.max(0, riskLeft - dt); riskWait = Math.max(0, riskWait - dt);
      // A single decision buys a brief greedy exchange, rather than a new coin flip on every safe frame.
      // It can spend its roll reserve, squeeze in another hit, and stay committed when the target winds up.
      if (!attackable(e) || wary) riskLeft = 0;
      if (riskWait <= 0 && !wary && me.isFree() && me.canAct() && gap <= C.reach + C.closeGap && attackable(e)) {
        riskWait = span(R.interval, rng);
        if (rng() < profile.greed * (person ? S.greed : 1)) riskLeft = span(R.duration, rng);
      }
      const greedy = riskLeft > 0;
      const pressing = rescue || !shy && quietTime >= patience;   // hurt, or beside a person, it waits longer before forcing an exchange
      const tactic = BOT_TACTICS[pressing || greedy ? 'pressure' : tacticId];
      const settled = 1 - tacticTimer / tacticDuration >= tactic.commitAt;
      const needsHeal = me.hp < me.maxHp * profile.healBelow && flask.count > 0;
      healWait = needsHeal ? healWait + dt : 0;
      // The target's string: wait it out from past its reach, then go in a human beat (goIn) after it ends.
      const str = stringOf(e, me);
      if (str) {
        if (!wasString) { waitedThis = true; nearThis = false; }
        nearThis = nearThis || gap <= C.reach + 2;
        stringSeen = hands.time; wasString = true;
      } else {
        if (wasString && waitedThis && nearThis) tally.waited++;
        wasString = false;
      }
      const settling = !str && hands.time - stringSeen < goIn;

      // ---- 1. Defence: the most urgent blow (from any enemy) that can land on it ----
      let urgent = null;
      const bolt = incoming(me, bolts);
      for (const o of enemies) {
        if (!o.alive() || !level(o, me) || gateBetween(o, me)) continue;
        const blow = nextBlow(o, me);
        if (!blow || Math.hypot(o.x - me.x, o.z - me.z) > reach(o, blow.attack, blow.hit, me) || aimedElsewhere(o, blow, me) || clearOf(me, o, blow)) continue;
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
      const trading = urgent && greedy && urgent.enemy === e && !moreAfter(e, urgent.blow) && mood.gap !== null &&
        (me.state === PS.ATTACK || me.isFree() && gap <= C.reach && urgent.blow.eta >= R.minWindow) &&
        (!bolt || bolt.eta > commit(A()[me.def.moveset.ground.light]) + C.safety) &&
        enemies.every(o => o === e || !o.alive() || !level(o, me) || gateBetween(o, me) || opening(o, me) > commit(A()[me.def.moveset.ground.light]) + C.safety);
      if (urgent && !trading) {
        const { blow, s, enemy } = urgent;
        const iFrames = P.rollIFrames - 0.02, lead = s.risky || s.slip ? s.lead : Math.max(0.01, Math.min(s.lead, iFrames - (blow.end - blow.eta)));
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
        if (blow.eta < 0.9) return { mv: strafe(me, flat(enemy.x - me.x, enemy.z - me.z), edge(me, enemy), holdGap(me, enemy), 1), lock: enemy };
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
        // With the enemy on someone else, keep backing off until it grants one.
        if (!greedy && (healWait < C.healRetreatTime || company && !huntedBy(e, me, allies)) && healWindow < C.healWindow + ITEMS.flask.useTime)
          return { mv: room(me, e, allies, strafe(me, to, gap, C.healGap + 2, 0.3)), lock: e };
      }

      // ---- 4. Offence ----
      const T = C.tempo;
      // A riposte is the player's too, until late in the opening.
      const theirs = e.state === ES.PARRIED && me.riposte <= 0 && person && edge(person, e) <= CONFIG.execution.range + 1 &&
        e.def.parriedTime - e.stateTime > X.late;
      if (theirs) return { mv: room(me, e, allies, orbit(C.spacing + spacing, 1)), lock: e };   // the player's riposte
      const exec = typeof execution !== 'undefined' ? execution.target(me, enemies) : null;
      // A stagger or a long recovery with a person in reach of it is theirs first: wait off the flank, then join (once
      // they swing, or after `first` s). Not mid-swing, and never over an execution it could take.
      // A boss's recovery runs at its Boss Rush pace (Enemy.pace), so its seconds are counted in real time here.
      const pace = e.state === ES.RECOVER && e.pace > 0 ? e.pace : 1;
      const big = me.riposte <= 0 && (e.state === ES.STAGGER || e.state === ES.RECOVER && e.attack && e.attack.recovery / pace >= T.punishRecovery);
      const near = big && person && edge(person, e) <= C.reach + S.near;
      if (!big) offeredThis = sharedThis = null;
      if (near && person.isAttacking && person.isAttacking()) sharedThis = e;
      if (near && sharedThis !== e && e.stateTime / pace < S.first && me.isFree() && !exec) {
        if (offeredThis !== e) { offeredThis = e; tally.offered++; }
        return { mv: room(me, e, allies, orbit(C.reach, 0.6)), lock: e };
      }
      const opportunity = me.riposte > 0 || [ES.PARRIED, ES.STAGGER, ES.BROKEN].includes(e.state) ||
        e.state === ES.RECOVER && e.attack && (e.attack.recovery - e.stateTime) / pace >= T.punishRecovery && window >= T.punishWindow ||
        !person && e.hp <= e.def.hp * T.finishBelow && window >= T.punishWindow;   // beside a person, it does not rush the kill
      if (opportunity) punishLeft = T.punishCommit;
      const keyOpening = opportunity || punishLeft > 0 && window > commit(A()[me.def.moveset.ground.light]) + spare;
      const retreating = (resetLeft > 0 || wary) && !keyOpening && !pressing && !greedy;
      const committed = greedy || keyOpening || pressing || !retreating && settled;
      const reserve = greedy ? R.reserve : window > 2.5 ? P.rollCost + 2 : C.reserve;
      const attackWindow = window + (greedy && window >= R.minWindow ? R.windowSlack : 0);
      const can = cost => me.canAct() && me.stamina - cost >= reserve;
      // A kneeling enemy is a player's to execute: wait off its flank, and take it only near the end of the kneel.
      const leave = k => {
        const near = allies.find(a => !a.botId && a.alive() && Math.hypot(a.x - k.x, a.z - k.z) <= X.yield);
        if (!near || k.state !== ES.BROKEN) return false;
        const d = k.def, left = (d.posture || d.guard || d.stagger).breakTime - k.stateTime;
        const front = { x: k.x + Math.sin(k.yaw) * (k.radius + me.radius + 0.4), z: k.z + Math.cos(k.yaw) * (k.radius + me.radius + 0.4) };
        return left > X.late + Math.hypot(front.x - me.x, front.z - me.z) / P.walkSpeed;
      };
      if (e.state !== ES.BROKEN) yieldedThis = null;
      if (exec && me.isFree() && !leave(exec)) { hands.press('light'); tally.executed++; return { mv: idle, lock: exec }; }
      if (e.state === ES.BROKEN) {
        if (leave(e)) {
          if (yieldedThis !== e) { yieldedThis = e; tally.yielded++; }
          const a = e.yaw + side * Math.PI / 2, r = e.radius + me.radius + X.aside;
          const spot = { x: e.x + Math.sin(a) * r, z: e.z + Math.cos(a) * r }, d = Math.hypot(spot.x - me.x, spot.z - me.z);
          return { mv: d > 0.3 ? flat(spot.x - me.x, spot.z - me.z) : idle, lock: e };
        }
        // Kneeling and nobody else takes it: get in front of it for the execution.
        const front = { x: e.x + Math.sin(e.yaw) * (e.radius + me.radius + 0.4), z: e.z + Math.cos(e.yaw) * (e.radius + me.radius + 0.4) };
        return { mv: flat(front.x - me.x, front.z - me.z), lock: e };
      }
      if (!attackable(e)) return { mv: room(me, e, allies, strafe(me, to, gap, C.spacing + 1, 1)), lock: e };
      const inReach = gap <= C.reach;
      // Mid-string, only a mood that takes pauses swings: into one this long, or a greedy trade against a string's last
      // blow. After the string, a beat (goIn) before going in.
      const swingGap = !!str && mood.gap !== null && (window >= mood.gap || greedy && !str.more);
      const free = me.riposte > 0 || (str ? swingGap : !settling || [ES.PARRIED, ES.STAGGER].includes(e.state));
      // Chain the combo: in a light's follow-through, press again if the window still holds the next swing.
      if (me.state === PS.ATTACK && me.attack && me.attack.next && inReach) {
        const next = A()[me.attack.next.light], tl = attackTimeline(me.attack, me.attackT);
        const left = commit(me.attack) - me.attackT;
        if (tl.phase !== PHASE.STARTUP && comboChoice === null)
          comboChoice = rng() < (greedy ? R.combo : keyOpening ? T.punishCombo : T.comboBase + profile.aggression * T.comboAggression);
        if (next && comboChoice && (burstLeft > 0 || keyOpening || greedy) && attackWindow > left + commit(next) + spare && can(next.cost) && (!str || swingGap)) {
          hands.press('light'); comboChoice = false;
        }
        return { mv: idle, lock: e };
      }
      if (me.isFree()) {
        const light = A()[me.def.moveset.ground.light];
        const ready = attackWindow > commit(light) + spare;
        // A quiet neutral opponent is a possibility, not a strike already in flight. Eventually try a single light
        // to start an exchange; actual wind-ups, other enemies, bolts and stamina still veto the commitment.
        const probe = (rescue || !shy && quietTime >= patience + C.probeDelay) && incomingWindow > commit(light) + spare;
        // Backing someone up, it gets out of the enemy's front before it trades (a real opening is taken where it stands);
        // after `settle` s in reach without getting there (a wall at the enemy's back), it trades where it is.
        unplaced = flank && flank.off > S.reposition && inReach ? unplaced + dt : 0;
        const placed = keyOpening || !flank || flank.off <= S.reposition || unplaced >= S.settle;
        if (inReach && free && placed && (ready || probe) && (committed || probe) && (decisionLeft <= 0 || keyOpening)) {
          decisionLeft = span(profile.think, rng);
          if (str) tally.gaps++, waitedThis = false;
          const rip = me.riposte > 0;
          if (ready && !(near && !rip) && window > C.chargeWindow + commit(heavy) && can(heavy.cost) && (rip || rng() < profile.heavy)) {
            hands.press('heavy'); hands.hold('heavy', true); heavyHold = rip ? 0.1 : heavy.charge.hold * (0.5 + 0.5 * rng());
            return { mv: idle, lock: e };
          }
          if (ready && (rip || rng() < profile.heavy) && attackWindow > commit(heavy) + spare && can(heavy.cost)) { hands.press('heavy'); return { mv: idle, lock: e }; }
          if (can(light.cost)) { hands.press('light'); return { mv: idle, lock: e }; }
        }
        // Flair: from a step or two out, a long opening can take a leaping heavy.
        const jh = A().jumpHeavy;
        if (!inReach && !str && !settling && committed && !retreating && decisionLeft <= 0 && gap < 3.2 && window > 2.0 && can(P.jumpCost + jh.cost) && rng() < profile.jump * dt * 14) {
          hands.press('jump'); decisionLeft = span(profile.think, rng); jumpPlan = 1.2; return { mv: { ...to, has: true }, lock: e };
        }
        // Keep the chosen tempo even when a hypothetical opening is large: bait, flank, press, or regroup.
        // Actual punish opportunities and the bounded standoff fallback are the deliberate overrides.
        const recovering = !can(light.cost) || me.stamina < me.maxStamina * T.regroupBelow;
        const motion = recovering || retreating ? BOT_TACTICS.reset : committed ? BOT_TACTICS.pressure : tactic;
        if (gap <= C.reach + 3) tally.waiting += dt;
        if (str && !swingGap) return { mv: room(me, e, allies, orbit(Math.max(motion.gap, holdGap(me, e)) + roomy, motion.circle)), lock: e };
        if (settling) return { mv: room(me, e, allies, orbit(gap, motion.circle * 0.5)), lock: e };   // a beat before going in
        return { mv: room(me, e, allies, orbit(motion.gap + (retreating ? roomy : 0), motion.circle)), lock: e };
      }
      return { mv: idle, lock: e };
    }
    // Backup: the enemy's far side from whoever it is after: the first `support.behind` offset from straight behind it
    // that none of its counters behind or at its flank covers. { dir, off, far }: which way to circle there, how far off
    // it is (rad), and whether that is more than `slack`.
    function behind(me, e, hunted) {
      if (!hunted) return null;
      const S = B().support, back = Math.atan2(e.x - hunted.x, e.z - hunted.z), whens = sideCounters(e), mine = Math.atan2(me.x - e.x, me.z - e.z);
      // The closest to straight behind that is open; of its two sides the nearer (on a tie, the side this fight drew).
      let want = null;
      for (const d of S.behind) {
        let best = Infinity;
        for (const k of [flankSide, -flankSide]) {
          const at = back + k * d, cost = Math.abs(angDiff(at, mine)) + (k === flankSide ? 0 : S.slack);
          if (cost < best && !whens.some(w => REACTIONS[w](e, me, angDiff(at, e.yaw)))) { want = at; best = cost; }
        }
        if (best < Infinity) break;
      }
      if (want === null) return null;   // every spot is covered: no backup, it fights as it would anyway
      const off = angDiff(want, mine);
      return { dir: off > 0 ? -1 : 1, off: Math.abs(off), far: Math.abs(off) > S.slack };
    }
    // Out of the way (CONFIG.bot.room): away from a person or bot standing too close, and round the enemy out of a
    // person's lane to it, so a bot never body-blocks the player or stands in their swing.
    function room(me, e, allies, mv) {
      const R = B().room;
      let px = 0, pz = 0;
      for (const a of allies) {
        if (!a.alive() || !Number.isFinite(a.x)) continue;
        const want = (a.botId ? R.bot : R.player) + (a.radius || 0) + me.radius, dx = me.x - a.x, dz = me.z - a.z, d = Math.hypot(dx, dz);
        if (d < want && d > 1e-3) { const k = (want - d) / want; px += dx / d * k; pz += dz / d * k; }
        if (a.botId) continue;
        const theirs = Math.hypot(a.x - e.x, a.z - e.z), mine = Math.hypot(me.x - e.x, me.z - e.z);
        if (mine > theirs + R.laneDepth || theirs > B().execution.yield) continue;
        const at = Math.atan2(me.x - e.x, me.z - e.z), off = angDiff(at, Math.atan2(a.x - e.x, a.z - e.z));
        if (Math.abs(off) >= R.lane) continue;
        const s = off >= 0 ? 1 : -1, k = (R.lane - Math.abs(off)) / R.lane;   // round the enemy, away from their line
        px += Math.cos(at) * s * k; pz -= Math.sin(at) * s * k;
      }
      if (!px && !pz) return mv;
      return flat((mv.has ? mv.x : 0) + px * R.push, (mv.has ? mv.z : 0) + pz * R.push);
    }
    // Walk toward a gap of `want` m, circling to `dir` (the bot's current side) by `circle` (0..1 of CONFIG.bot.strafe).
    function strafe(me, to, gap, want, circle, dir = side) {
      const C = B(), radial = clamp((gap - want) * 1.2, -1, 1);
      const tang = rot(to, dir * Math.PI / 2), k = C.strafe * circle * (Math.abs(radial) < 0.6 ? 1 : 0.4);
      return flat(to.x * radial + tang.x * k, to.z * radial + tang.z * k);
    }
    return { hands, think, profile: base, navigator, describe, get mood() { return moodId; }, get tally() { return { ...tally }; }, get target() { return target; }, get tactic() { return tacticId; }, get risking() { return riskLeft > 0; } };
  }
  return { create, nextBlow, opening, reach, jumpLead, navigation: BotNavigation };
})();
