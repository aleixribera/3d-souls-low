'use strict';
// ============================================================================
// Friendly bots (v7.11)
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
  const firstStartup = new WeakMap(), reactStartup = new WeakMap();
  const attacksOf = e => (e.def.attacks || e.baseDef.attacks).map(a => typeof a === 'string' ? e.baseDef.attacks.find(x => x.id === a) : a).filter(Boolean);
  function quickest(e) {   // the fastest blow this enemy (its current phase) can open with
    const list = e.def.attacks || e.baseDef.attacks;
    if (!firstStartup.has(list)) firstStartup.set(list, Math.min(...attacksOf(e).map(a => a.hits[0].startup)));
    return firstStartup.get(list);
  }
  // The fastest reaction (an attack's `when`: struck, behind, flank...) it can answer with whatever its cooldown.
  function quickestReaction(e) {
    const list = e.def.attacks || e.baseDef.attacks;
    if (!reactStartup.has(list)) reactStartup.set(list, Math.min(Infinity, ...attacksOf(e).filter(a => a.when && a.when !== 'healing').map(a => a.hits[0].startup)));
    return reactStartup.get(list);
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
  function opening(e, me) {
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
      case ES.HURT: return Math.max(0, d.flinchTime - st) + Math.min(cool + quick, quickestReaction(e));
      case ES.BROKEN: return Math.max(0, (d.posture || d.guard || d.stagger).breakTime - st) + base + quick;
      case ES.EXECUTED: case ES.PHASE: return Infinity;
      default: return Math.min(cool + quick + walk, quickestReaction(e) + walk);
    }
  }
  // On its floor (a leaping enemy is in the air above it, and still coming).
  const level = (e, me) => e.leaping || Math.abs(e.y - me.y) <= CONFIG.height.reach + 1;
  const attackable = e => e.alive() && !e.invulnerable() && !ENEMY_GROUPS.hidden.has(e.state);

  function create(profile, rng = Math.random) {
    const hands = new BotHands(), C = B();
    const seen = new WeakMap();   // enemy -> { key, at, plan, done }: what was decided about its current blow
    let target = null, side = profile.side, sideTimer = span(C.strafeSwitch, rng), heavyHold = 0, jumpPlan = 0;
    let wasAlive = new WeakSet(), cheer = 0;

    function chooseTarget(me, enemies) {
      const C = B();
      let best = null, bestScore = Infinity;
      for (const e of enemies) {
        if (!e.alive() || ENEMY_GROUPS.hidden.has(e.state) || Math.abs(e.y - me.y) > CONFIG.height.reach + 1 || gateBetween(me, e)) continue;
        const d = Math.hypot(e.x - me.x, e.z - me.z);
        const awake = !(e.in && (e.in('unaware') || e.state === ES.DORMANT));
        if (d > (awake ? C.engageRange : C.wakeRange)) continue;
        const score = d - (e === target ? 2 : 0) - (e.netTarget && e.netTarget === me.botId ? 1.5 : 0);
        if (score < bestScore) { bestScore = score; best = e; }
      }
      return best;
    }
    // The decision about a blow is made once, the first time it is noticed: parry it or roll it.
    function plan(e, blow, me) {
      const key = `${e.netAttack ?? ''}/${blow.attack.id}/${blow.index}`;
      let s = seen.get(e);
      if (!s || s.key !== key) {
        const P = CONFIG.parry, b = blow.attack.box;
        const near = Math.hypot(e.x - me.x, e.z - me.z) <= b.fwd + b.d / 2 + me.radius + P.reach - 0.15;
        const parry = canParryAttack(blow.attack) && near && !blow.hit.leap && !blow.hit.blink && rng() < profile.parry;
        s = { key, at: hands.time + span(C.notice, rng), plan: parry ? 'parry' : 'roll', done: false,
              lead: parry ? span(C.parryLead, rng) : span(C.rollLead, rng) };
        seen.set(e, s);
      }
      return s;
    }
    // Where to roll: across the blow, a little away; the bot's favourite side first.
    // Where to roll: out of the blow's box by its nearest side, or straight away from a ring or a breath.
    function rollDir(me, e, blow) {
      const to = flat(e.x - me.x, e.z - me.z), b = blow.hit.box || blow.attack.box;
      if (b.ring) return rot(to, side * 0.35);   // through the spreading ring as it passes, not running with it
      if (blow.attack.breath || blow.attack.sphere) return rot(to, Math.PI - side * 0.6);
      const s = Math.sin(e.yaw), c = Math.cos(e.yaw), dx = me.x - e.x, dz = me.z - e.z;
      const lz = dx * s + dz * c, lx = dz * s - dx * c;   // its forward, and its left
      const sideways = b.w / 2 - Math.abs(lx), ahead = b.fwd + b.d / 2 - lz;
      if (sideways < ahead + 0.5) {   // across its facing, toward the nearer edge (the favourite side when square on)
        const dir = Math.abs(lx) > 0.3 ? Math.sign(lx) : side;
        return { x: -c * dir, z: s * dir };
      }
      return { x: s, z: c };   // out past the far end of its reach
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
      const C = B(), P = CONFIG.player;
      hands.tick(dt);
      const idle = { x: 0, z: 0, has: false };
      if (!me.alive()) { hands.clear(); return { mv: idle, lock: null }; }
      if ((sideTimer -= dt) <= 0) { sideTimer = span(C.strafeSwitch, rng); if (rng() < 0.6) side = -side; }
      // Flair: a hop when a foe it fought falls.
      for (const e of enemies) {
        if (e.alive()) wasAlive.add(e);
        else if (wasAlive.has(e)) { wasAlive.delete(e); if (e === target) cheer = 0.5 + rng() * 0.4; }
      }
      target = chooseTarget(me, enemies);
      if (!target) {
        hands.hold('block', false); hands.hold('heavy', false);
        if (cheer > 0 && (cheer -= dt) <= 0.2 && me.isFree() && me.canAct()) { hands.press('jump'); cheer = 0; }
        return { mv: followParty(me, allies), lock: null };
      }
      const e = target, to = flat(e.x - me.x, e.z - me.z), gap = edge(me, e);

      // ---- 1. Defence: the most urgent blow (from any enemy) that can land on it ----
      let urgent = null;
      for (const o of enemies) {
        if (!o.alive() || !level(o, me) || gateBetween(o, me)) continue;
        const blow = nextBlow(o, me);
        if (!blow || Math.hypot(o.x - me.x, o.z - me.z) > reach(o, blow.attack, blow.hit, me)) continue;
        const s = plan(o, blow, me);
        if (s.done || hands.time < s.at) continue;
        if (!urgent || blow.eta < urgent.blow.eta) urgent = { enemy: o, blow, s };
      }
      hands.hold('block', false);
      const bolt = incoming(me, bolts);
      if (bolt && bolt.eta <= 0.14) {
        if (me.canAct() && (me.isFree() || me.state === PS.ATTACK)) { hands.press('roll'); return { mv: { ...bolt.dir, has: true }, lock: e }; }
        if (me.isFree()) { hands.hold('block', true); return { mv: idle, lock: e }; }
      }
      if (urgent) {
        const { blow, s, enemy } = urgent;
        const iFrames = P.rollIFrames - 0.02, lead = Math.max(0.01, Math.min(s.lead, iFrames - (blow.end - blow.eta)));
        if (s.plan === 'parry' && me.canAct() && blow.eta <= s.lead) {
          if (me.isFree() || me.state === PS.BLOCK) { hands.press('parry'); s.done = true; return { mv: idle, lock: enemy }; }
          if (blow.eta < 0) s.plan = 'roll';   // caught busy: fall back to whatever still works
        }
        if (s.plan === 'roll' && blow.eta <= lead) {
          if (me.canAct()) { const d = rollDir(me, enemy, blow); hands.press('roll'); s.done = true; heavyHold = 0; hands.hold('heavy', false); return { mv: { ...d, has: true }, lock: enemy }; }
          if (!blow.attack.rollOnly && me.in('free')) { hands.hold('block', true); return { mv: idle, lock: enemy }; }   // no stamina: guard
        }
        // A blow is coming soon: hold off new swings and keep it in front.
        if (blow.eta < 0.9) return { mv: strafe(me, to, gap, C.spacing + 0.6, 1), lock: enemy };
      }

      // ---- 2. The window: how long until any nearby enemy could hurt it ----
      let window = Infinity;
      for (const o of enemies) if (o.alive() && level(o, me) && !gateBetween(o, me)) window = Math.min(window, opening(o, me));
      if (bolt) window = Math.min(window, bolt.eta);

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
      const flask = me.item('flask');
      if (me.hp < me.maxHp * C.healBelow && flask.count > 0) {
        if (me.isFree() && window > ITEMS.flask.useTime + C.safety + 0.5 && (window > C.healWindow + ITEMS.flask.useTime || gap > C.healGap)) {
          hands.press('flask'); return { mv: idle, lock: e };
        }
        if (window < C.healWindow + ITEMS.flask.useTime) return { mv: strafe(me, to, gap, C.healGap + 2, 0.3), lock: e };
      }

      // ---- 4. Offence ----
      const reserve = window > 2.5 ? P.rollCost + 2 : C.reserve;
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
        if (next && tl.phase !== PHASE.STARTUP && window > left + commit(next) + C.safety && can(next.cost) && rng() < 0.35 + profile.aggression * 0.6) hands.press('light');
        return { mv: idle, lock: e };
      }
      if (me.isFree()) {
        const light = A()[me.def.moveset.ground.light];
        const ready = window > commit(light) + C.safety;
        if (inReach && ready) {
          const rip = me.riposte > 0;
          if (window > C.chargeWindow + commit(heavy) && can(heavy.cost) && (rip || rng() < profile.heavy)) {
            hands.press('heavy'); hands.hold('heavy', true); heavyHold = rip ? 0.1 : heavy.charge.hold * (0.5 + 0.5 * rng());
            return { mv: idle, lock: e };
          }
          if ((rip || rng() < profile.heavy) && window > commit(heavy) + C.safety && can(heavy.cost)) { hands.press('heavy'); return { mv: idle, lock: e }; }
          if (can(light.cost)) { hands.press('light'); return { mv: idle, lock: e }; }
        }
        // Flair: from a step or two out, a long opening can take a leaping heavy.
        const jh = A().jumpHeavy;
        if (!inReach && gap < 3.2 && window > 2.0 && can(P.jumpCost + jh.cost) && rng() < profile.jump * dt * 14) {
          hands.press('jump'); jumpPlan = 1.2; return { mv: { ...to, has: true }, lock: e };
        }
        // Close in when the opening is long enough to cross the gap and swing; otherwise keep a wary distance.
        const travel = Math.max(0, gap - C.closeGap) / P.walkSpeed;
        const go = window > travel + commit(light) + C.safety && (rng() < profile.aggression || window > 2.5);
        return { mv: strafe(me, to, gap, go ? C.closeGap : C.spacing, go ? 0.15 : 1), lock: e };
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
    return { hands, think, profile, get target() { return target; } };
  }
  return { create, nextBlow, opening, reach };
})();
