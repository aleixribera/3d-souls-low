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
// Its attack reach: longest and shortest range, and the longest basic close attack. Reactions (`when`) don't count:
// they answer a situation, not a distance.
function reachOf(attacks) {
  const list = attacks.filter(a => !a.when), ranges = list.map(a => a.range);
  return { long: Math.max(...ranges), short: Math.min(...ranges), close: Math.max(...list.filter(strikesAtOnce).map(a => a.range)) };
}
// Reactions (an attack's `when`, v5.3): the situations an enemy answers at once, whatever its cooldown or facing.
//   behind: the player stands in its rear arc;  flank: close at its left (off-hand) side;
//   healing: the player is drinking a flask or using an item;  staggered: the player reels (a broken guard);
//   shielded: its shield took a blow within CONFIG.ai.reactions.shielded s (v5.5, the Crucible Knight's counter bash).
const REACTIONS = {
  behind: (e, p, rel) => Math.abs(rel) > CONFIG.ai.reactions.behind,
  flank: (e, p, rel) => rel > CONFIG.ai.reactions.flank[0] && rel < CONFIG.ai.reactions.flank[1],
  healing: (e, p) => p.state === PS.USE_ITEM,
  staggered: (e, p) => p.state === PS.STAGGER || p.state === ES.STAGGER || p.state === ES.BROKEN,
  shielded: e => e.blockTime < CONFIG.ai.reactions.shielded,
  struck: e => e.struckTime < CONFIG.ai.reactions.struck,   // v5.9: a blow landed on it just now (Malenia's counter-kick)
  seamed: e => e.seams.length >= CONFIG.seams.callAt,   // pass 47: enough of the floor cracked open to call it up (Oswin)
  resonant: e => !!e.def.resonance && e.resonance >= e.def.resonance.max,   // pass 68: its `resonance` is full (the Bell Warden)
};
// Follow-up conditions (an attack's `followUps[].if`): where the player is as the last hit's follow-through ends.
const FOLLOW_IF = {
  any: () => true,
  far: (e, dist) => dist > e.attack.range,
  near: (e, dist) => dist <= e.attack.range,
  flank: (e, dist, rel) => REACTIONS.flank(e, null, rel) && dist <= e.attack.range + CONFIG.enemy.followReach,
  behind: (e, dist, rel) => REACTIONS.behind(e, null, rel) && dist <= e.attack.range + CONFIG.enemy.followReach,
};
// One of `attacks`, with odds in proportion to their chances (or `weight`; null if they are all 0).
function pickByChance(attacks, weight = attackChance) {
  const total = attacks.reduce((s, a) => s + weight(a), 0);
  let r = Math.random() * total;
  return total > 0 ? attacks.find(a => (r -= weight(a)) < 0) || attacks[attacks.length - 1] : null;
}
// An area attack (CONFIG.aggro, v7.35.0): a hit at least `areaWidth` m wide, or a ring round its owner. A boss facing a
// group standing together (`grouped`, set by the server) favours these.
const AREA_ATTACKS = new WeakMap();
function isAreaAttack(a) {
  if (!AREA_ATTACKS.has(a)) AREA_ATTACKS.set(a, (a.hits || []).some(h => { const b = h.box || a.box; return !!b && (!!b.ring || b.w >= CONFIG.aggro.areaWidth); }));
  return AREA_ATTACKS.get(a);
}
const groupedChance = a => attackChance(a) * (isAreaAttack(a) ? CONFIG.aggro.areaMul : 1);
// Boss Rush's pace after `won` fights (CONFIG.pace): a warm-up under every boss's own pace for the first `warm` fights,
// then rising exponentially with the fights won past it, and from fight `wall` on `wallRise` times as fast again each fight.
function rushPace(won) {
  const P = CONFIG.pace, n = Math.max(0, Number(won) || 0);
  if (n < P.warm) return P.boss * (P.warmFrom + (1 - P.warmFrom) * n / P.warm);
  const past = Math.max(0, n + 2 - P.wall);   // fight n + 1 is the first past the wall when n + 1 >= wall
  return Math.min(P.max, P.boss * (1 + P.rise * (Math.exp((n - P.warm) / P.scale) - 1)) * Math.pow(P.wallRise, past));
}
// Boss Rush's par (CONFIG.swift): the target length in whole s of a fight after `won` fights won, against `bosses` at
// once, for a party of `might` (kitMight, js/abilities.js). Never under the base pace's par for a weaker boss.
function rushPar(won, bosses = 1, might = 0) {
  const S = CONFIG.swift, base = won < CONFIG.pace.warm ? S.par : S.late;
  return Math.min(S.max, Math.round(base * Math.max(1, rushPace(won) / CONFIG.pace.boss) * (1 + S.pair * (Math.max(1, bosses) - 1)) / (1 + Math.max(0, might))));
}
// Boss Rush's health share for boss `id`: its RUSH.health share in every fight, times CONFIG.endless.pairHealth when
// `bosses` are fought at once, or its RUSH.warmHealth share alone in the warm-up (the first CONFIG.pace.warm fights).
function rushHealth(bosses, won = Infinity, id = null) {
  const own = id && Object.hasOwn(RUSH.health, id) ? RUSH.health[id] : 1;
  if (bosses > 1) return CONFIG.endless.pairHealth * own;
  return own * (won < CONFIG.pace.warm && id && Object.hasOwn(RUSH.warmHealth, id) ? RUSH.warmHealth[id] : 1);
}
// A follow-up's chance at a pace (CONFIG.pace): a faster boss strings more of its moves together.
const pacedChance = (chance, pace) => chance >= 1 || pace === 1 ? chance : 1 - Math.pow(1 - chance, pace);

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
    this.sinceBreak = Infinity;                      // time since its last posture break or execution ended
    this.breaks = 0; this.breakGrow = 0;             // posture breaks this fight; Boss Rush's CONFIG.endless.breakGrow
    this.frozen = 0;   // s left stopped in time (Time Rift, js/abilities.js): no step, no blow, hit as it stands
    this.guardMeter = 0; this.guardTime = 0;         // guard or stagger meter, and time since it last filled
    this.blockTime = Infinity;                       // time since its shield last took a blow (the `shielded` reaction)
    this.struckTime = Infinity;                      // time since a blow last landed on it (the `struck` reaction, v5.9)
    this.resonance = 0;                              // a def's `resonance` (pass 68): how full of the blows it took it is
    this.resonanceRest = 0;                          // ... and how long after its answer before blows fill it again
    this.mendPool = 0;                               // a def's `mend` (pass 75): the open wounds the Ember will close, in hp
    this.wounds = [0, 1, 2, 3].map(() => ({ who: null, pool: 0, since: 0 }));   // ... one per attacker, so each closes on its own
    this.learned = [];                               // an attack's `learns` (pass 77): the ids of the attacks it has learned, in order
    this.landed = false;                             // ... and whether the current attack has landed a blow on anyone
    this.crack = 0;                                  // visual: posture-break flash
    this.recoil = 0; this.recoilF = 0; this.recoilS = 0;   // visual: knockback lean in local axes
    this.seed = rand(0, 1000); this.tempo = rand(0.85, 1.2);   // idle personality offsets
    this.rewarded = false;                           // death already announced
    this.training = !!B.training;                    // training dummy: rooted, never dies
    this.immovable = this.training;
    this.discovered = this.training;                 // has had its one-time auto lock-on (dummies never do)
    this.state = B.start; this.stateTime = 0;
    const fd = def.firstDelay || E.firstDelay;
    this.cooldown = rand(fd[0], fd[1]); this.attack = null; this.hitIndex = 0; this.hitbox = null;
    // Its longest and shortest attack range, and the longest of its basic close attacks (-Infinity if it has none).
    this.attackReach = reachOf(def.attacks);
    this.stepIn = false;                             // stepping in to its shortest reach, until it attacks
    this.stepInNearest = Infinity;                   // the closest it has come to the player while stepping in
    this.strikeFrom = 0;                             // stepping in, its close attacks wait until the player is this close
    this.backingOff = false;                         // too close: backing off to its hold distance
    this.slot = null;                                // its place around the player (js/crowd.js)
    this.leaping = false;                            // airborne in a leaping strike (a hit's `leap`)
    this.attackNo = 0; this.cuts = [];               // attacks begun; where it stood for each hit of this one (`noteCut`, a hit's `echo`)
    this.seams = []; this.erupting = null; this.seamKey = -1; this.seamNo = 0;   // the floor it has cracked open (a hit's `seam` / `erupt`)
    this.fires = []; this.fireKey = -1; this.fireNo = 0;   // the fires it has left burning on the floor (a hit's `fire`, burnInFires)
    // Boss phases (v4.3): an enemy def with `phases` fights through the phase ids its placement lists (`boss.phases`,
    // else the def's `defaultPhases`), one full health bar each. `boss.retreat`: when the last bar empties it leaps
    // away instead of dying (the opening of Level 5).
    this.baseDef = def; this.boss = opts.boss || null;
    this.pace = this.isBoss() ? CONFIG.pace.boss : 1;   // CONFIG.pace: Boss Rush's curve raises it fight by fight
    this.rest = 1; this.chain = 1;   // an Endless modifier's (RUSH.modifiers): rests this many times faster, strings as if this much faster
    this.health = 1;   // its bars' share of its own health (setHealth: Boss Rush's pairs)
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
    if (this.health !== 1) this.def.hp = Math.round(this.def.hp * this.health);
    this.hp = this.def.hp; this.poise = this.def.poise; this.posture = 0; this.resonance = 0; this.clearWounds();   // a new phase rings from silence, unwounded
    this.ranged = this.def.attacks.some(a => a.projectile);
    this.attackReach = reachOf(this.def.attacks);
  }
  // Its bars at `share` of its own health (rushHealth): this bar and every later phase's, the health it has left kept in
  // proportion. Everything reading `def.hp` (the bar, the server's checks, phases' `at`) sees the share.
  setHealth(share) {
    const k = share > 0 ? share : 1, was = this.def.hp, B = this.baseDef;
    if (k === this.health) return;
    if (this.def === B) this.def = { ...B };   // a def without phases is shared: scale a copy
    this.health = k; this.def.hp = Math.round(((this.phaseIds && B.phases[this.def.phaseId].hp) ?? B.hp) * k);
    this.hp = Math.min(this.def.hp, this.hp * this.def.hp / was);
  }
  // A boss: a def with posture or phases (isBossDef), or any `boss` placement. The one rule for executions (a boss's result
  // waits for the pull-out), checkpoints and saves (a beaten boss stays beaten).
  isBoss() { return isBossDef(this.baseDef) || !!this.boss; }
  // How fast its wind-ups run at its pace (CONFIG.pace): 1 up to a boss's base pace, then gently quicker, to a floor.
  tellRate() {
    const P = CONFIG.pace;
    return this.pace <= P.boss ? 1 : Math.min(1 / P.tellFloor, Math.pow(this.pace / P.boss, P.tell));
  }
  lastPhase() { return !this.phaseIds || this.phase >= this.phaseIds.length - 1; }
  // A mid-bar phase (a phase with `at`, v5.3): once the health falls to `at` of the bar, the next phase begins at once,
  // on the same bar (no kneel, no refill). Its `opener` (an attack id) is the first thing it does.
  // An `alone` phase (v7.40.0, a pair of bosses) begins the same way once every other member of its group (`kin`, set
  // by Game.spawnZone and the Arena's group fight) has fallen; one fought on its own (no kin) begins it at once.
  checkPhaseAt() {
    if (!this.phaseIds || this.lastPhase() || !this.alive() || this.state === ES.PHASE || this.state === ES.EXECUTED) return;
    const next = this.baseDef.phases[this.phaseIds[this.phase + 1]];
    const due = next.alone ? (this.kin || [this]).every(k => k === this || !k.alive()) : next.at && this.hp <= this.def.hp * next.at;
    if (!due) return;
    const hp = this.hp, posture = this.posture, from = this.phase;
    this.enterPhase(this.phase + 1); this.hp = hp; this.posture = posture;
    // One fought on her own (no kin, v7.62.0) has nobody to grieve: the alone phase starts without its opener.
    const grieves = !next.alone || (this.kin && this.kin.length > 1);
    this.opener = next.opener && grieves ? this.def.attacks.find(a => a.id === next.opener) : null;
    events.emit('bossPhase', { enemy: this, from, to: this.phase, seamless: true });
  }
  // Its health ran out: a boss with another phase kneels into the transition, one set to retreat leaps away; both
  // stay alive (and untouchable). Returns true if it lives on.
  outlast() {
    this.hp = 0; this.hitbox = null;
    const next = !this.lastPhase() && this.baseDef.phases[this.phaseIds[this.phase + 1]];
    if (next && !next.at && !next.alone) {   // a mid-bar phase never refills an empty bar (nor one that waits to be left alone)
      const from = this.phase;
      this.enterPhase(this.phase + 1); this.hp = 0;   // the new bar fills through the transition
      this.setState(ES.PHASE);
      events.emit('bossPhase', { enemy: this, from, to: this.phase });
      return true;
    }
    if (this.boss && this.boss.retreat) {
      this.retreatFrom = { x: this.x, y: this.y, z: this.z };
      const R = this.boss.retreat;   // a far leap takes longer: at most `speed` m/s (default 24)
      this.retreatHop = Math.max(R.hop, Math.hypot(R.to[0] - this.x, R.to[2] - this.z) / (R.speed || CONFIG.enemy.retreatSpeed));
      this.setState(ES.RETREAT);
      events.emit('bossRetreat', { enemy: this });
      return true;
    }
    return false;
  }
  // Debug (Level 5 tools): empty the current health bar at once, as if the last blow landed.
  // Lifesteal (def `lifesteal: { flat, pct }`, v5.9, Malenia): each blow that connects heals `flat` + `pct` of the bar.
  lifesteal() {
    const L = this.def.lifesteal;
    if (!this.alive() || this.state === ES.PHASE || this.state === ES.EXECUTED) return;
    const heal = Math.min(this.def.hp - this.hp, L.flat + L.pct * this.def.hp);
    if (heal <= 0) return;
    this.hp += heal;
    events.emit('lifesteal', { enemy: this, amount: heal });
  }
  deplete() { if (this.alive() && !this.invulnerable()) { this.hp = 0; if (!this.outlast()) this.die(); } }
  // An attack with `invulnerable` (v5.4, Godrick's arm chop) is untouchable through its wind-ups and strikes, not its recovery.
  // Under the floor in a hit's `burrow` (pass 50): from its `from` of the wind-up until it rises (js/root-heave.js).
  burrowed() {
    const h = this.attack && this.state === ES.WINDUP ? this.attack.hits[this.hitIndex] : null;
    return !!(h && h.burrow && this.stateTime >= h.startup * h.burrow.from);
  }
  invulnerable() { return this.in('invulnerable') || this.blinkLeft > 0 || this.burrowed() || (!!this.attack && !!this.attack.invulnerable && (this.state === ES.WINDUP || this.state === ES.ACTIVE)); }
  savePrev() { this.px = this.x; this.py = this.y; this.pz = this.z; this.pyaw = this.yaw; }
  setState(s) { this.state = s; this.stateTime = 0; this.leaping = false; this.blinkLeft = 0; this.markerSeen = null; if (s !== ES.CHASE) this.cued = null; }
  in(group) { return ENEMY_GROUPS[group].has(this.state); }
  alive() { return this.state !== ES.DEAD && this.state !== ES.GONE; }
  isAttacking() { return this.in('attacking'); }
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

  // Local presentation timers also run when multiplayer owns the enemy simulation.
  updateFeedback(dt) {
    this.tint = Math.max(0, this.tint - dt / CONFIG.fx.tintTime);
    this.crack = Math.max(0, this.crack - dt / CONFIG.fx.crackTime);
    this.recoil = Math.max(0, this.recoil - dt / CONFIG.fx.recoilTime);
  }

  // Where it is in its attack's marker clock: the phase name, hit and seconds into that phase (null when not attacking).
  markerClock() {
    const a = this.attack;
    if (!a || !a.markers || !this.in('attacking')) return null;
    const h = a.hits[this.hitIndex], t = this.stateTime;
    if (this.state === ES.WINDUP) return { a, at: 'windup', hit: this.hitIndex, t };
    if (this.state === ES.ACTIVE) return t < h.active ? { a, at: 'active', hit: this.hitIndex, t } : { a, at: 'follow', hit: this.hitIndex, t: t - h.active };
    if (this.state === ES.RECOVER) return { a, at: 'recovery', hit: a.hits.length - 1, t };
    return null;
  }
  // Attack markers (`sound`, `shake`) crossed this step, as the player's attacks announce theirs (js/attack-anim.js):
  // the Bell Warden's tolls and the Toll Wisp's chime pace their roll-only moves. Glints are drawn, not announced.
  // `markerSeen`: the clock already announced up to (reset by every state change), so an attack begun outside the
  // enemy's own step (an alert's pounce, a test) still sounds its opening marker, and none sounds twice.
  emitMarkers() {
    const now = this.markerClock(), was = this.markerSeen;
    this.markerSeen = now;
    if (!now) return;
    const same = was && was.a === now.a && was.at === now.at && was.hit === now.hit;
    const len = now.at === 'windup' ? now.a.hits[now.hit].startup : now.at === 'active' ? now.a.hits[now.hit].active
      : now.at === 'follow' ? now.a.hits[now.hit].follow || 0 : now.a.recovery;
    for (const m of now.a.markers) {
      if (m.event === 'glint' || (m.at || 'windup') !== now.at || (m.hit ?? 0) !== now.hit) continue;
      const T = len * (m.t ?? 0);
      if (T <= now.t && (!same || T > was.t)) events.emit('attackMarker', { actor: this, attack: now.a, marker: m });
    }
  }
  update(dt, player) {
    if (this.frozen > 0) { this.frozen = Math.max(0, this.frozen - dt); this.updateFeedback(dt); return; }
    this.step(dt, player);
    this.emitMarkers();
  }
  step(dt, player) {
    this.checkPhaseAt();
    const d = this.def, E = CONFIG.enemy;
    // A faster pace (CONFIG.pace) cuts recoveries short and, past a boss's base pace, quickens its wind-ups a little.
    this.stateTime += this.state === ES.RECOVER ? dt * this.pace : this.state === ES.WINDUP ? dt * this.tellRate() : dt;
    this.updateFeedback(dt);
    this.chainTime += dt; this.blockTime += dt; this.struckTime += dt;
    this.sinceBreak = this.state === ES.BROKEN || this.state === ES.EXECUTED ? 0 : this.sinceBreak + dt;   // CONFIG.enemy.postureRest
    // A def's `resonance` (pass 68): it fades once no blow has landed for `delay` s, and a break empties it (the opening is yours).
    if (this.resonanceRest > 0) this.resonanceRest -= dt;
    // Learned forms (pass 77): a break or an execution makes it forget everything it learned (a client's list is the server's).
    if (this.learned.length && this.sinceBreak === 0) this.learned.length = 0;
    if (d.resonance) this.resonance = this.sinceBreak === 0 ? 0 : this.struckTime > d.resonance.delay ? Math.max(0, this.resonance - d.resonance.decay * dt) : this.resonance;
    // A def's `mend` (pass 75, Aldric): a break or an execution seals his open wounds; once the one who opened a wound has
    // landed no blow for `delay` s the Ember closes it again, `rate` of his bar a second in all. Each attacker's wound is
    // its own, so in co-op the one who stops pressing loses theirs while the others keep theirs open.
    const Mn = d.mend;
    if (Mn && this.mendPool > 0 && this.wounds.some(w => w.pool > 0)) {   // a client's pool comes from the server's snapshot
      if (this.sinceBreak === 0) this.clearWounds();
      else if (this.alive()) {
        let budget = Mn.rate * d.hp * dt, sum = 0;
        for (const w of this.wounds) {
          w.since += dt;
          if (w.pool > 0 && w.since > Mn.delay && budget > 0) { const h = Math.min(w.pool, budget, d.hp - this.hp); this.hp += h; w.pool -= h; budget -= h; }
          sum += w.pool;
        }
        this.mendPool = sum;
      }
    }
    if (this.state === ES.EXECUTED) { this.vx = this.vz = this.kx = this.kz = 0; return; }   // held on the blade (js/execution.js)
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
    this.huntTime = Math.max(0, (this.huntTime || 0) - dt);   // v7.0: woken into its own zone's fight (wakeZones): leashes wait
    const hunting = this.huntTime > 0;
    const toPlayer = Math.atan2(dx, dz);
    this.playerRel = angDiff(toPlayer, this.yaw);   // where the player stands round it (rad, + at its left)
    const playerAlive = player.alive();
    // Unaware, it sees only in a cone ahead (CONFIG.vision); fighting or searching, all round.
    const V = CONFIG.vision, inCone = Game.level?.fullTracking || this.wide || !this.in('narrowSight') || dist < V.near || Math.abs(angDiff(toPlayer, this.yaw)) <= V.cone;
    const inArena = !this.arena || inArea(this.arena, player.x, player.z);   // e.g. the Bell Warden: the bonfire before its arena is safe
    const sees = playerAlive && inArena && dist < trackingRange(this.notice) && inCone && !gateBetween(this, player);
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
        if (!playerAlive || (!hunting && playerFromHome > this.homeLeash) || this.stateTime > S.max) { this.setState(ES.RETURN); break; }
        if (!sightLost(this, player) && dist <= this.leash && (reach || this.ranged)) { this.setState(ES.CHASE); break; }
        const g = this.lastSeen || this.home, gx = g.x - this.x, gz = g.z - this.z, gd = Math.hypot(gx, gz);
        if (gd < S.arrive || this.searchLook > 0) {   // there: look about a while
          this.searchLook += dt;
          this.yaw += Math.sin(this.searchLook * S.lookRate) * d.turnRate * S.lookTurn * dt;
          if (this.searchLook > S.look) this.setState(ES.RETURN);
          break;
        }
        const sp = d.speed * (hunting ? 1 : S.speedMul);   // hunting in its own fight: at full pace, not a wary prowl
        tx = gx / gd * sp; tz = gz / gd * sp;
        this.yaw = turnToward(this.yaw, Math.atan2(gx, gz), d.turnRate * dt);
        break;
      }
      case ES.CHASE: {
        this.unreachable = reach || this.ranged ? 0 : this.unreachable + dt;
        if (!playerAlive || (!hunting && (dist > this.leash || playerFromHome > this.homeLeash)) || this.unreachable > CONFIG.height.giveUp) {
          this.unreachable = 0; this.stepIn = false; this.setState(ES.RETURN); break;
        }
        if (sightLost(this, player)) { this.stepIn = false; this.searchLook = 0; this.setState(ES.SEARCH); break; }
        this.lastSeen = { x: player.x, z: player.z };
        this.yaw = turnToward(this.yaw, toPlayer, d.turnRate * dt);
        this.cooldown -= dt * crowd.cooldownRate(this) * this.pace * this.rest;   // slower while other enemies are mid-attack
        if (!reach) {   // too far above or below: an archer shoots from where it stands, the rest go to the brink and wait
          this.cued = null;   // a kin's cue goes stale
          const shot = this.ranged && this.chooseAttack(dist, toPlayer, dt, true);
          if (shot) this.beginAttack(shot);
          else if (!this.ranged) { tx = dx / dist * d.speed; tz = dz / dist * d.speed; }
          break;
        }
        if (this.opener) { const o = this.opener; this.opener = null; this.yaw = toPlayer; this.beginAttack(o); break; }   // a mid-bar phase's first move
        if (this.cued && (this.cued.left -= dt) <= 0) {   // a kin's `cue`: her answering move, if the player is still in its range
          const a = this.def.attacks.find(x => x.id === this.cued.attack); this.cued = null;
          if (a && dist >= (a.minRange || 0) && dist <= a.range) { this.beginAttack(a); break; }
        }
        const a = !this.cued && (this.react(player, dist, toPlayer, dt) || this.chooseAttack(dist, toPlayer, dt));   // a cued one waits for her cue
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
        if (hit.bolt) this.noteBolt(player);
        // Tracking attacks keep turning for the whole wind-up; others stop part way, so a late dodge works.
        // Delayed attack: at `hold.at` of the wind-up it may freeze, clearly still, for a while before carrying on.
        if (hit.hold && this.holdLeft === null && this.stateTime >= hit.startup * hit.hold.at)
          this.holdLeft = Math.random() < hit.hold.chance ? rand(hit.hold.time[0], hit.hold.time[1]) : 0;
        if (this.holdLeft > 0) { this.holdLeft -= dt; this.stateTime = Math.min(this.stateTime, hit.startup * hit.hold.at); }
        if (this.isTracking()) this.yaw = turnToward(this.yaw, toPlayer, ((a.tracking && a.tracking.rate) || a.track || d.trackRate) * dt);
        // A hit's `step` (v5.4, Godrick's rampage): from `from` of its wind-up (not while held) it closes in at `speed` m/s
        // (stopping once the strike would reach) and drifts `side` m/s sideways (+ to its left): a stride into each cut.
        if (hit.step && this.stateTime >= hit.startup * hit.step.from && !(this.holdLeft > 0)) {
          const S = hit.step, fwd = dist > a.box.fwd + a.box.d * 0.25 + player.radius ? S.speed : 0;
          tx = Math.sin(this.yaw) * fwd + Math.cos(this.yaw) * S.side; tz = Math.cos(this.yaw) * fwd - Math.sin(this.yaw) * S.side;
        }
        // A hit's `abort` (v5.3): at `at` of the wind-up, a player who backed beyond `beyond` m turns it into `into`.
        if (hit.abort && this.stateTime >= hit.startup * hit.abort.at && !(this.holdLeft > 0) && dist > hit.abort.beyond) {
          this.beginAttack(this.attackById(hit.abort.into)); break;
        }
        // Gap closer: rush forward late in the wind-up, stopping once the strike would reach.
        if (a.dash && this.hitIndex === 0 && this.stateTime >= hit.startup * a.dash.from && dist > a.box.fwd + a.box.d * 0.25 + player.radius) {
          tx = this.vx = Math.sin(this.yaw) * a.dash.speed; tz = this.vz = Math.cos(this.yaw) * a.dash.speed;   // full speed at once
        }
        // Leaping strike (a hit's `leap`): at `from` of the wind-up (after its aim has locked) it jumps along its facing
        // toward where the player stands then (at most `max` m, stopping `short` m short), landing as the strike opens.
        if (hit.leap && !this.leaping && this.leapHit !== this.hitIndex && this.stateTime >= hit.startup * hit.leap.from) this.launchLeap(hit, dist);
        if (this.leaping && this.grounded && this.vy <= 0 && this.stateTime > hit.startup * hit.leap.from + 0.1) { this.leaping = false; this.vx = this.vz = 0; }   // landed early
        if (this.leaping) { tx = this.vx; tz = this.vz; }
        // A hit's `blink` (v5.7, Radagon's teleport): at `from` of its wind-up it vanishes and rushes, unseen and untouchable,
        // in `time` s to `dist` m in front of the player (or `back` m away from them), facing them as it reappears.
        // A fast move, not a jump cut, so walls and ledges stop it like any step (integrateBody).
        if (hit.blink && this.blinkHit !== this.hitIndex && this.stateTime >= hit.startup * hit.blink.from) {
          const B = hit.blink, T = B.time ?? CONFIG.bossPowers.holy.blinkTime, far = B.back ? -B.back : Math.max(0, dist - B.dist);
          this.yaw = toPlayer; this.blinkHit = this.hitIndex; this.blinkLeft = T;
          this.vx = Math.sin(toPlayer) * far / T; this.vz = Math.cos(toPlayer) * far / T;
          events.emit('enemyBlink', { enemy: this, out: true });
        }
        if (this.blinkLeft > 0) {
          tx = this.vx; tz = this.vz; this.blinkLeft -= dt;
          if (this.blinkLeft <= 0) { this.blinkLeft = 0; this.vx = this.vz = 0; this.yaw = toPlayer; events.emit('enemyBlink', { enemy: this, out: false }); }
        }
        // A hit's `burrow` (pass 50, the Kindling Tree): from `from` of its wind-up it is under the floor and cannot be
        // touched; the heave of its root runs through the floor after the player at `speed` m/s, turning at most `turn`
        // rad/s, until `lock` of the wind-up. There it holds still while the floor swells over it (step off it), and it
        // rises as the hit strikes. A walk under the floor like any step, so walls and ledges stop it (integrateBody).
        if (hit.burrow && this.stateTime >= hit.startup * hit.burrow.from) {
          const B = hit.burrow;
          if (this.burrowHit !== this.hitIndex) { this.burrowHit = this.hitIndex; this.burrowYaw = toPlayer; }
          // Its own pace at once, and dead still once it stops: no run-up and no slide (the tell is where it stopped).
          // It stops `near` m short of the player's body, so it rises beside them (the ring still takes them), never in them.
          const sp = this.stateTime < hit.startup * B.lock && dist > this.radius + player.radius + CONFIG.burrow.near ? B.speed : 0;
          if (sp) this.burrowYaw = turnToward(this.burrowYaw, toPlayer, B.turn * dt);
          tx = this.vx = Math.sin(this.burrowYaw) * sp; tz = this.vz = Math.cos(this.burrowYaw) * sp;
        }
        if (this.stateTime >= hit.startup) this.strike(player);
        break;
      }
      case ES.ACTIVE: {   // the strike, then (hitbox closed) its follow-through
        if (this.isTracking()) this.yaw = turnToward(this.yaw, toPlayer, this.attack.track * dt);
        const striking = this.stateTime < this.attack.hits[this.hitIndex].active;
        if (!striking) this.hitbox = null;
        if (striking && !this.attack.hits[this.hitIndex].echo) { tx = Math.sin(this.yaw) * this.attack.lunge; tz = Math.cos(this.yaw) * this.attack.lunge; }
        this.endStrikeWhenDone();
        break;
      }
      case ES.RECOVER:
        if (this.stateTime >= this.attack.recovery) {   // attack over: cool down
          this.learn();
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
        const T = d.transition || CONFIG.enemy.transition;
        const top = d.hp * (d.fill ?? 1);   // a phase's `fill` (v5.9, Malenia): the new bar refills only to that fraction
        this.hp = top * clamp((this.stateTime - T * 0.35) / (T * 0.5), 0, 1);
        this.yaw = turnToward(this.yaw, toPlayer, d.turnRate * 0.25 * dt);
        if (this.stateTime >= T) {
          this.hp = top; this.cooldown = d.cooldown[0]; this.setState(ES.CHASE);
          if (d.opener) this.opener = d.attacks.find(a => a.id === d.opener) || null;   // a refilled phase may open with a move too
        }
        break;
      }
      case ES.DEAD: break;
    }

    if (this.state === ES.CHASE) [tx, tz] = steerAroundProps(this, tx, tz, dist);
    else if (this.state === ES.RETURN) [tx, tz] = steerAroundProps(this, tx, tz, Math.hypot(this.home.x - this.x, this.home.z - this.z));
    else if (this.state === ES.SEARCH && this.lastSeen) [tx, tz] = steerAroundProps(this, tx, tz, Math.hypot(this.lastSeen.x - this.x, this.lastSeen.z - this.z));
    approachVel(this, tx, tz, E.accel * dt);
    integrateBody(this, dt, E.knockFriction, true);   // never walks off an edge; knockback can still push it over
    if (d.tether) this.keepTether(d.tether);
    this.checkFall();
    this.walkPhase += Math.hypot(this.vx, this.vz) * dt * 2.6 / d.scale;
  }
  // A phase's `tether` (pass 42, the Ringer): it cannot go more than that many m from its home (where it was placed),
  // whatever moves it (steps, lunges, leaps, knockback); pressed against the edge it slides along it.
  keepTether(r) {
    const dx = this.x - this.home.x, dz = this.z - this.home.z, d = Math.hypot(dx, dz);
    if (d <= r) return;
    const nx = dx / d, nz = dz / d, out = this.vx * nx + this.vz * nz;
    this.x = this.home.x + nx * r; this.z = this.home.z + nz * r;
    if (out > 0) { this.vx -= out * nx; this.vz -= out * nz; }
  }
  // Still turning to follow the player (the F7 debug colours show it). With `tracking`, only until its commit point
  // in each wind-up, then locked: the strike goes where it was aimed. Legacy: the early wind-up, or all of a `track` attack.
  isTracking() {
    const a = this.attack;
    if (!a || (this.state !== ES.WINDUP && this.state !== ES.ACTIVE)) return false;
    if (a.hits[this.hitIndex].echo) return false;   // the gilt cuts where it hangs: he does not turn
    if (a.hits[this.hitIndex].still) return false;   // pass 50: a blow that falls where the last one was aimed (a mark that burns)
    if (a.tracking) return this.state === ES.WINDUP && this.stateTime < a.hits[this.hitIndex].startup * a.tracking.commit;
    if (a.track) return true;
    return this.state === ES.WINDUP && this.stateTime < a.hits[this.hitIndex].startup * CONFIG.enemy.windupTrack;
  }
  // A leaping strike leaves the ground: the speed that covers the distance in the rest of the wind-up, and the upward
  // speed that brings it down just as the strike opens.
  launchLeap(hit, dist) {
    const L = hit.leap, T = Math.max(0.2, hit.startup * (1 - L.from)), far = L.back ? -L.back : clamp(dist - (L.short || 0), 0, L.max);   // `back`: a leap away (m)
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
  die() { this.hitbox = null; this.seams.length = 0; this.erupting = null; this.fires.length = 0; this.setState(ES.DEAD); }
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
    const inReach = this.def.attacks.filter(a => !a.when && !a.learned && !this.spent(a) && (!shotsOnly || a.projectile) && dist >= (a.minRange || 0) && dist <= a.range
      && (!a.hpBelow || this.hp <= this.def.hp * a.hpBelow));   // `hpBelow` (v5.9): only once its health is that low
    const close = inReach.filter(isClose);
    const chance = this.grouped ? groupedChance : attackChance;
    if (close.some(strikesAtOnce) && !(this.stepIn && dist > this.strikeFrom)) return pickByChance(close, chance);
    const mul = crowd.chanceMul(this);
    for (const a of inReach) if (!strikesAtOnce(a) && Math.random() < chance(a) * (a.projectile ? 1 : mul) * dt) return a;
    return null;
  }
  // Reactions (`when`, v5.3): an attack whose situation holds and whose range window holds the player rolls its chance
  // per second, cooldown and facing aside (a tail swipe at someone behind, a dagger at someone drinking). Null if none.
  react(player, dist, toPlayer, dt) {
    if (!crowd.mayStart()) return null;
    const rel = angDiff(toPlayer, this.yaw);
    for (const a of this.def.attacks) if (a.when && !a.learned && !this.spent(a) && dist >= (a.minRange || 0) && dist <= a.range && REACTIONS[a.when](this, player, rel)
      && Math.random() < attackChance(a) * dt) return a;
    return null;
  }
  // `noRepeat` (v7.20): after that many of the same move in a row, it must pick another.
  spent(a) { return !!this.def.noRepeat && a.id === this.lastMove && this.moveRun >= this.def.noRepeat; }
  beginAttack(attack) {
    const base = attack;   // an attack it has learned comes as its learned form (`learns`), counted as the attack it learned
    if (attack.learns && this.learned.includes(attack.id)) attack = this.attackById(attack.learns);
    if (attack.cue) this.cueKin(attack.cue);
    this.moveRun = base.id === this.lastMove ? (this.moveRun || 0) + 1 : 1; this.lastMove = base.id; this.landed = false;
    this.attack = attack; this.hitIndex = 0; this.stepIn = false; this.holdLeft = null; this.leapHit = -1; this.blinkHit = -1; this.burrowHit = -1; this.setState(ES.WINDUP);
    this.attackNo++;
    if (attack.when === 'resonant') { this.resonance = 0; this.resonanceRest = this.def.resonance ? this.def.resonance.rest || 0 : 0; }   // the answer gives the ringing back
    crowd.started(this);
    events.emit('attackStart', { enemy: this, attack: this.attack });
    if (this.attack.rollOnly) events.emit('perilous', { enemy: this, attack: this.attack });
  }
  // A cue (`cue: { attack, delay, chance, near }`, v7.62.0, a pair of bosses): as this attack starts, each other living
  // member of its group that is chasing within `near` m of its own target and has that attack in its current phase may
  // (`chance`) answer with it `delay` s later, cooldown and the crowd's gap aside: two bodies, one fight. The answer is
  // dropped if she leaves the chase first (any other move, a flinch), or if the player is out of its range by then.
  cueKin(c) {
    for (const k of this.kin || []) {
      if (k === this || !k.alive() || k.state !== ES.CHASE || k.cued || !(k.playerDist <= c.near) || !k.def.attacks.some(a => a.id === c.attack)) continue;
      if (Math.random() < c.chance) k.cued = { attack: c.attack, left: c.delay };
    }
  }
  // The strike timeline shared by all enemies: windup -> active (per hit) -> recover. A bow looses a bolt
  // at the target instead of opening a hitbox.
  strike(target) {
    // A hit may bring its own `box` (with `ring`: an expanding ring round the owner) and its own `impact`.
    const hit = this.attack.hits[this.hitIndex], box = hit.box || this.attack.box, impact = hit.impact || this.attack.impact;
    if (this.attack.projectile && target) { this.hitbox = null; projectiles.fire(this, this.attack, target); }
    else this.hitbox = this.makeHitbox();
    if (this.leaping) { this.vx = this.vz = 0; }
    if (impact) {   // a blow that strikes the ground: a ring, a crack and a jolt where it lands
      const c = this.hitbox ? this.hitbox.center() : { x: this.x + Math.sin(this.yaw) * box.fwd, z: this.z + Math.cos(this.yaw) * box.fwd };   // where the hitbox is centred
      events.emit('impact', { x: c.x, y: this.y, z: c.z, fx: impact, enemy: this });
    }
    this.setState(ES.ACTIVE);
    events.emit('attackPhase', { actor: this, attack: this.attack, phase: PHASE.ACTIVE, hitIndex: this.hitIndex });   // the swing sound
  }
  // The current hit's hitbox (a hit's own `box` and `damage`, v5.9), as its strike opens: here, and on a client for the
  // server's enemies (js/multiplayer.js). Notes where it stands first (`noteCut`).
  // A hit's `echo` (pass 44, the Regent Hollis): the gilt his blade left in the air cuts again. Its box is placed where he
  // stood and faced as hit `echo.of` of this same attack struck, not where he is now (he neither turns nor lunges through
  // an echo); with `home` it is drawn back to him over its `active` s. js/gilt-echo.js draws it hanging there. An echo
  // whose cut was never seen (a client that missed it) cuts nothing: never an unwarned blow at his feet.
  makeHitbox() {
    const hit = this.attack.hits[this.hitIndex], box = hit.box || this.attack.box;
    this.noteCut();
    if (hit.erupt) {   // every seam it opened erupts at once; none open, nothing happens
      const lines = this.erupting && this.erupting.length ? this.erupting : null;
      if (!lines) return null;
      const hb = new Hitbox(this, box, { ...makeStrike(this.attack), ...(hit.damage ? { damage: hit.damage } : {}), rollOnly: true }, null, lines);   // fire: no guard holds it
      hb.near.x = this.x; hb.near.y = this.y; hb.near.z = this.z;   // until it finds someone: at his feet (where its impact lands)
      return hb;
    }
    const strike = makeStrike(this.attack);
    if (hit.damage) strike.damage = hit.damage;
    if (hit.pull) { strike.pull = hit.pull; strike.rollOnly = true; }   // pass 63: the hook drags you in to this far from him (Player.takeHit); no guard holds it
    if (hit.seize) { strike.seize = hit.seize; strike.seizeBy = this; strike.seizeAttack = this.attack.id; strike.rollOnly = true; }   // pass 72: a hand that closes on you (Player.seize); no guard holds it
    if (!hit.bolt && !this.attack.projectile && (this.attack.rend ?? this.def.rend)) { strike.rend = true; strike.rendBy = this; }   // pass 48: the hook keeps what it tears
    if (hit.bolt) {   // the storm strikes where its mark lay; a mark never seen strikes nothing
      const B = this.bolt;
      if (!B || B.key !== this.attackNo * 64 + this.hitIndex) return null;
      return new Hitbox(this, box, { ...strike, rollOnly: true }, { cut: B, home: false, time: hit.active, bolt: true });
    }
    const cut = hit.echo && this.cutOf(hit.echo.of);
    if (hit.echo && !cut) return null;
    return new Hitbox(this, box, strike, cut ? { cut, home: !!hit.echo.home, time: hit.active } : null);
  }
  // A hit's `bolt` (pass 48, Mother Agathe's storm): lightning out of the storm onto the spot its target stands on. The mark
  // follows the target through the first `lock` of the wind-up (the attack's tracking commit, else CONFIG.storm.lock), then
  // holds still until the strike: step off it. Here on the server or alone, from the target it fights; on a client from
  // the target the snapshot names (js/multiplayer.js). Drawn by js/storm-rend.js.
  noteBolt(target) {
    const a = this.attack, hit = a && a.hits[this.hitIndex];
    if (!hit || !hit.bolt || this.state !== ES.WINDUP || !target) return;
    const key = this.attackNo * 64 + this.hitIndex, lock = hit.bolt.lock ?? (a.tracking ? a.tracking.commit : CONFIG.storm.lock);
    const B = this.bolt || (this.bolt = { x: 0, y: 0, z: 0, yaw: 0, key: -1, locked: false });
    if (B.key === key && this.stateTime >= hit.startup * lock) { B.locked = true; return; }
    B.x = target.x; B.y = this.y; B.z = target.z; B.yaw = this.yaw; B.key = key; B.locked = false;
  }
  noteCut() {
    const c = this.cuts[this.hitIndex] || (this.cuts[this.hitIndex] = { x: 0, y: 0, z: 0, yaw: 0, no: -1 });
    c.x = this.x; c.y = this.y; c.z = this.z; c.yaw = this.yaw; c.no = this.attackNo;
    this.noteSeams(); this.noteFires();
  }
  // A hit's `fire` (pass 63, the Pillager Captain): as it strikes it leaves fires burning on the floor, one per `at`
  // [fwd, side] (m ahead of him, m to his left) where he stands and faces, each `r` m across, for `time` s, burning
  // `dps` a second from anyone standing in it once it has caught (CONFIG.groundFire.kindle; burnInFires). The oldest goes out
  // past CONFIG.groundFire.max. Once per hit: a client lays them the first time it sees the hit strike. Drawn by
  // js/ground-fire.js.
  noteFires() {
    const hit = this.attack && this.attack.hits[this.hitIndex], key = this.attackNo * 64 + this.hitIndex;
    if (!hit || !hit.fire || this.fireKey === key) return;
    this.fireKey = key;
    const F = hit.fire, s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    for (const [fwd, side] of F.at) {
      this.fires.push({ x: this.x + s * fwd + c * side, y: this.y, z: this.z + c * fwd - s * side, r: F.r, time: F.time, dps: F.dps, age: 0, no: ++this.fireNo });
      if (this.fires.length > CONFIG.groundFire.max) this.fires.shift();
    }
  }
  // A hit's `seam` (pass 47, Oswin): as it strikes, the floor cracks open along a line ahead of it (`from` m out, `len` m
  // long, once per angle of `spread`), and stays open, glowing, the oldest closing past CONFIG.seams.max. A hit's `erupt`
  // takes every open seam (`keep`: leaves them open for another eruption) for its walls of fire (Enemy.makeHitbox,
  // Hitbox.lines); drawn by js/ember-seams.js. Once per hit: a client notes it the first time it sees the hit strike.
  noteSeams() {
    const hit = this.attack && this.attack.hits[this.hitIndex], key = this.attackNo * 64 + this.hitIndex;
    if (!hit || (!hit.seam && !hit.erupt) || this.seamKey === key) return;
    this.seamKey = key;
    if (hit.seam) for (const a of hit.seam.spread || [0]) {
      const s = Math.sin(this.yaw + a), c = Math.cos(this.yaw + a), F = hit.seam.from || 0, x0 = this.x + s * F, z0 = this.z + c * F;
      this.seams.push({ x0, z0, x1: x0 + s * hit.seam.len, z1: z0 + c * hit.seam.len, y: this.y, no: ++this.seamNo });
      if (this.seams.length > CONFIG.seams.max) this.seams.shift();
    }
    if (hit.erupt) { this.erupting = this.seams.slice(); if (!hit.erupt.keep) this.seams.length = 0; }
  }
  // Where hit i of the current attack struck, or null if it has not yet (this attack).
  cutOf(i) { const c = this.cuts[i]; return c && c.no === this.attackNo ? c : null; }
  endStrikeWhenDone() {
    const h = this.attack.hits[this.hitIndex];
    if (this.stateTime < h.active + (h.follow || 0)) return;
    this.hitbox = null;
    if (this.hitIndex + 1 < this.attack.hits.length) { this.hitIndex++; this.holdLeft = null; this.setState(ES.WINDUP); }
    else if (!this.followUp()) this.setState(ES.RECOVER);
  }
  // Follow-ups (an attack's `followUps`, v5.3): as the last hit's follow-through ends, the first entry whose condition
  // (`if`, FOLLOW_IF) holds and whose `chance` rolls starts at once instead of the recovery: a combo that branches.
  followUp() {
    for (const f of this.attack.followUps || []) {
      if (!FOLLOW_IF[f.if || 'any'](this, this.playerDist, this.playerRel) || this.spent(this.attackById(f.attack)) || Math.random() >= pacedChance(f.chance, this.pace * this.chain)) continue;
      this.learn(); this.beginAttack(this.attackById(f.attack));   // the attack it chains from is over: escaped, it is learned
      return true;
    }
    return false;
  }
  // An attack's `learns` (pass 77, the Antlered Hunger): an attack that ends (or is parried) without landing a blow on
  // anyone (`landed`: js/combat.js, or a player's claim on the server) is learned, and from then on comes as the learned
  // form it names. A break or an execution makes it forget them all (Enemy.step). js/finale.js lights the model's `marks`.
  learn() {
    const a = this.attack;
    if (a && a.learns && !this.landed && this.alive() && !this.learned.includes(a.id)) {
      this.learned.push(a.id);
      events.emit('enemyLearned', { enemy: this, attack: a });
    }
  }
  // An attack by id: the current phase's, else the base def's (a phase may branch into a move it doesn't choose itself).
  attackById(id) { return this.def.attacks.find(a => a.id === id) || this.baseDef.attacks.find(a => a.id === id); }
  // Training dummies stay rooted. The sparring variant loops one slow, telegraphed swing.
  updateTraining(dt) {
    const R = this.def.refill;   // emptied: it holds at nothing for `delay` s, then fills over `time` s
    if (R && this.emptyTime > 0) {
      this.emptyTime += dt;
      this.hp = Math.min(this.def.hp, Math.max(0, (this.emptyTime - R.delay) / R.time) * this.def.hp);
      if (this.hp >= this.def.hp) this.emptyTime = 0;
    }
    if (!this.def.attacks.length) return;
    switch (this.state) {
      case ES.IDLE: if (this.stateTime >= this.def.restTime) this.beginAttack(this.def.attacks[0]); break;
      case ES.WINDUP: if (this.stateTime >= this.attack.hits[this.hitIndex].startup) this.strike(); break;
      case ES.ACTIVE: this.endStrikeWhenDone(); break;
      case ES.RECOVER: if (this.stateTime >= this.attack.recovery) this.setState(ES.IDLE); break;
      case ES.PARRIED: if (this.stateTime >= this.def.parriedTime) this.setState(ES.IDLE); break;
      case ES.BROKEN: if (this.stateTime >= this.def.stagger.breakTime) { this.guardMeter = 0; this.setState(ES.IDLE); } break;
    }
  }

  // Boss posture: add, and break when full. Returns true if this broke the posture.
  addPosture(amount) {
    const P = this.def.posture;
    if (!P || this.state === ES.BROKEN) return false;
    const R = CONFIG.enemy.postureRest;
    this.posture = Math.min(P.max, this.posture + amount * (this.sinceBreak < R.time ? R.mul : 1) / (1 + this.breakGrow * this.breaks));
    if (this.posture < P.max) return false;
    this.hitbox = null; this.crack = 1; this.breaks++;
    this.setState(ES.BROKEN);
    return true;
  }
  // A hit's `counter` (pass 55): what a blow from `from` with the player's attack `attackId` does to this wind-up:
  // 'turn' (turned and answered), 'break' (a breaker: the stance breaks) or null (no stance, or not from its front).
  // multiplayer.hit asks the same, so the striker's own client shows a turned blow as blocked.
  counterAgainst(from, attackId) {
    const W = this.state === ES.WINDUP && this.attack ? this.attack.hits[this.hitIndex] : null;
    if (!W || !W.counter || this.stateTime < W.startup * (W.counter.from || 0)
        || Math.abs(angDiff(Math.atan2(from.x - this.x, from.z - this.z), this.yaw)) >= (W.counter.arc ?? CONFIG.enemy.counterArc)) return null;
    const G = this.def.guard || this.baseDef.guard;   // a phase that drops the guard mid-wind-up keeps its breakers
    return (W.counter.breakers || (G && G.breakers) || []).includes(attackId) ? 'break' : 'turn';
  }
  // Broken at once, its posture full (a counter stance broken, a faltering wind-up). Returns true (it broke).
  breakNow() {
    if (this.def.posture) this.posture = this.def.posture.max;
    this.hitbox = null; this.crack = 1; this.breaks++; this.setState(ES.BROKEN);
    return true;
  }
  // A successful parry ends the current attack and leaves the enemy open. Returns true on a posture break.
  getParried() {
    this.hitbox = null;
    this.learn();   // a parried attack was answered: it learns it (a break below makes it forget at once)
    if (this.def.posture) {
      this.chainTime = 0;   // a parry starts a hit chain: the riposte builds posture straight away
      if (this.addPosture(this.def.posture.parry)) return true;
    }
    this.setState(ES.PARRIED);
    return false;
  }

  // One strike from `from`. Returns { broke (posture), died }.
  // Seal every open wound (a break, an execution, a new phase).
  clearWounds() { for (const w of this.wounds) { w.pool = 0; w.who = null; } this.mendPool = 0; }

  takeHit(strike, from) {
    this.hitK = clamp(strike.damage / CONFIG.fx.flinchRef, 0.5, 1.6);   // how big the flinch looks
    const dx = this.x - from.x, dz = this.z - from.z, d = Math.hypot(dx, dz) || 1;
    const kx = dx / d * strike.knock, kz = dz / d * strike.knock;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    this.recoil = 1; this.recoilF = (dx * s + dz * c) / d; this.recoilS = (dz * s - dx * c) / d;
    this.tint = 1;
    if (this.training) {   // flash and recoil only; a dummy with a stagger meter (the execution dummy) fills it
      // A dummy with a `refill` runs down to empty and takes nothing more until it is full again (updateTraining).
      if (!this.emptyTime) this.hp = Math.max(this.def.refill ? 0 : 1, this.hp - strike.damage);
      if (this.def.refill && this.hp <= 0 && !this.emptyTime) this.emptyTime = 1e-6;
      const broke = !!this.def.stagger && this.state !== ES.BROKEN && this.state !== ES.EXECUTED && this.fillMeter(this.def.stagger, strike.attackId);
      return { broke, died: false };
    }
    if (this.invulnerable()) return { broke: false, died: false };
    const def = this.def, P = def.posture;
    // A hit's `counter` (pass 55, the King's Blade): through its wind-up (from `from` of it) it stands behind its shield;
    // a blow from within `arc` of its front is turned and answered at once with the attack `answer`, and a heavy blow
    // (the guard's breakers) breaks the stance: the blow lands and it is open (BROKEN). Behind its arc, blows land.
    // Just up from a break (CONFIG.enemy.postureRest), a breaking blow only lands: a break is a moment, not a loop.
    const W = this.state === ES.WINDUP ? this.attack.hits[this.hitIndex] : null, C = this.counterAgainst(from, strike.attackId);
    if (C === 'break' && this.sinceBreak >= CONFIG.enemy.postureRest.time) {
      this.hp = Math.max(0, this.hp - strike.damage); this.struckTime = 0;
      if (this.hp <= 0 && this.outlast()) return { broke: false, died: false };
      if (this.hp <= 0) { this.hitbox = null; this.setState(ES.DEAD); return { broke: false, died: true }; }
      return { broke: this.breakNow(), died: false };
    }
    if (C === 'turn') {
      this.kx += kx * 0.2; this.kz += kz * 0.2; this.tint = 0.3; this.blockTime = 0;
      events.emit('enemyCounter', { enemy: this, attack: this.attack });
      this.beginAttack(this.attackById(W.counter.answer));
      return { broke: false, died: false, blocked: true };
    }
    if (this.guarding() && Math.abs(angDiff(Math.atan2(from.x - this.x, from.z - this.z), this.yaw)) < def.guard.arc)
      return this.blockHit(strike, kx, kz);
    this.hp = Math.max(0, this.hp - strike.damage);   // v5.2: no bonus while kneeling; the reward is the execution
    this.struckTime = 0;   // the `struck` reaction (v5.9)
    // A def's `resonance` (pass 68): each blow that lands fills it (a heavy one more), except while it lies open (parried,
    // broken: the riposte and the execution are yours). Full, its `when: 'resonant'` answer is due (REACTIONS).
    const R = def.resonance;
    if (R && this.state !== ES.PARRIED && this.state !== ES.BROKEN && !(this.resonanceRest > 0)) this.resonance = Math.min(R.max, this.resonance + (R.breakers.includes(strike.attackId) ? R.heavy : R.light));
    // A def's `mend` (pass 75): `share` of the blow opens a wound the Ember will close (at most `cap` of the bar open at
    // once), except while he lies open (parried, broken): the riposte and the execution stay.
    const Mn = def.mend;
    // Whose wound: a body's own, by its id where it has one (the server rebuilds a player's proxy at every pose), else the
    // body itself (the solo player); a bolt's or a power's `from` is a new point each time, so those share one wound.
    const who = !Mn || !from ? null : from.id != null ? from.id : 'hp' in from ? from : null;
    if (Mn && this.state !== ES.PARRIED && this.state !== ES.BROKEN && this.hp > 0) {
      let w = this.wounds.find(o => o.who === who && o.pool > 0) || this.wounds.find(o => o.pool <= 0);
      if (!w) w = this.wounds.reduce((a, b) => (b.since > a.since ? b : a));   // all four open: the one left alone longest
      const add = Math.max(0, Math.min(Mn.cap * def.hp, this.mendPool + strike.damage * Mn.share, def.hp - this.hp) - this.mendPool);
      w.who = who; w.pool += add; w.since = 0; this.mendPool += add;
    } else if (Mn) {   // a riposte opens none but keeps the striker's own wound open
      const w = this.wounds.find(o => o.who === who && o.pool > 0); if (w) w.since = 0;
    }
    if (!this.def.rooted) { this.kx += kx; this.kz += kz; }   // a rooted phase (pass 50) is not knocked back either
    if (this.hp <= 0 && this.outlast()) return { broke: false, died: false };   // a boss with another bar, or retreating
    if (this.hp <= 0) { this.hitbox = null; this.setState(ES.DEAD); return { broke: false, died: true }; }
    if (P) {
      // Bosses ignore interrupts. Every landed hit builds posture; one within `chainGap` s of the last builds `chainMul` times more.
      const chained = this.chainTime <= P.chainGap;
      this.chainTime = 0;
      // A hit's `falter` (pass 55, the King's Blade): `hits` blows landed through its wind-up and it breaks off, open.
      if (W && W.falter) {
        const key = this.attackNo * 64 + this.hitIndex;
        if (this.falterKey !== key) { this.falterKey = key; this.falterHits = 0; }
        if (++this.falterHits >= W.falter.hits && this.sinceBreak >= CONFIG.enemy.postureRest.time) return { broke: this.breakNow(), died: false };
      }
      if (this.in('unaware') || this.state === ES.DORMANT) this.setState(ES.CHASE);
      return { broke: this.addPosture(strike.postureDmg * (chained ? P.chainMul : 1)), died: false };
    }
    if (this.state === ES.BROKEN) return { broke: false, died: false };   // a broken guard: no flinch
    const M = def.stagger || def.guard;
    // Stagger/guard meter instead of poise: hits never interrupt until the meter fills. A riposte on a parried enemy
    // fills it too (v5.2: it used to be shrugged off with the other no-reaction states).
    if (M && this.state === ES.PARRIED) return { broke: this.fillMeter(M, strike.attackId), died: false };
    if (this.in('shrugsHits')) return { broke: false, died: false };
    if (this.state === ES.DORMANT) this.setState(ES.RISE);
    const unaware = this.in('unaware');
    if (M) {
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
    this.tint = 0.3; this.blockTime = 0;
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
        if (this.state === ES.WINDUP && !a.hits[this.hitIndex].echo) warn = clamp(tt / CONFIG.fx.windupGlowTime, 0, 1);   // an echo's tell is the gilt's own (js/gilt-echo.js)
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
        // Sinks to one knee, club on the floor, then hauls itself back up; a boss's own `brokenPose` (pass 55) instead.
        const T = (d.posture || d.guard || d.stagger).breakTime, k = ease(tt / 0.4) * (1 - ease((tt - T + 0.6) / 0.6));
        if (d.brokenPose) { applyKeyPose(r, d.brokenPose, k); break; }
        r.kneel(k); r.lean(0.3 * k);
        r.armR.rotation.x = lerp(-0.4, 0.1, k); r.weapon.rotation.x = lerp(0.5, 1.4, k); r.head.rotation.x = 0.4 * k;
        r.spin.rotation.z = Math.sin(tt * 5) * 0.04 * k; break;
      }
      case ES.PHASE: {   // sinks to a knee, head bowed, then rises as the new bar fills
        const T = d.transition || CONFIG.enemy.transition, k = ease(clamp(tt / 0.6, 0, 1)) * (1 - ease(clamp((tt - T * 0.62) / (T * 0.3), 0, 1)));
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
      case ES.EXECUTED: executedPose(r, this, tt); break;   // js/execution.js
      case ES.GONE: r.setOpacity(0); r.root.visible = false; break;
      case ES.DEAD: { const fade = d.deathFade || E.deathFade; deathPose(r, tt, fade); r.root.visible = tt < fade; break; }
    }
    if (this.guarding()) {   // shield held up in front: a model's own `guardArm` (pass 55), or the old raised arm
      if (r.guardArm) for (const b in r.guardArm) { const g = r.guardArm[b], bone = r.bones ? r.bones[b] : r[b]; if (bone) bone.rotation.set(g[0], g[1], g[2]); }
      else { r.armL.rotation.x = -0.75; r.armL.rotation.z = -0.25; }
    }
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
    if (r.grip) {   // a two-handed haft (pass 53): held as the key poses say while she stands, walks and fights; let go to the old pose when thrown about
      r.haftW += ((HAFT_HELD[this.state] ? 1 : 0) - r.haftW) * (1 - Math.exp(-CONFIG.fx.haftBlendRate * ctx.dt));
      r.holdHaft(r.haftW);
    }
    r.setWarning(warn, canParryHit(a, this.hitIndex) ? WARN_COLOR : ROLL_ONLY_COLOR, warn > 0 && a.hits[this.hitIndex].tell || null);   // red: parryable; blue: cannot be parried (this hit); on the shield, claw or foot when that strikes
    if (this.crack > 0) r.setTint(CRACK_COLOR, this.crack * 1.6);
    else if (this.execReady && this.state === ES.BROKEN) r.setTint(EXEC_CUE_COLOR, CONFIG.execution.cueGlow * (0.6 + 0.4 * Math.sin(ctx.t * Math.PI * 2 * CONFIG.execution.cuePulse)));   // can be executed
    else r.setTint(HIT_COLOR, this.tint * 0.8);
    if (r.hum) { const R = this.def.resonance, f = R && this.alive() ? Math.min(1, this.resonance / R.max) : 0;   // pass 68: his bronze glows as the blows fill it
      r.hum.opacity = f * f * (0.75 + 0.25 * Math.sin(ctx.t * (6 + 10 * f))); }
  }
}

// The fires enemies leave on the floor (a hit's `fire`, Enemy.noteFires), every step: here alone (burnInFires), on a client
// for its own body (js/multiplayer.js; each client owns its health), and on the server for its bots (ageFires + fireUnder,
// server/simulation.js). They burn down; a body on the floor in one that has caught (and not untouchable: a roll's
// i-frames, an execution) loses its `dps` a second (the hottest it stands in, never the sum), with the `hazard` tick every
// CONFIG.hazards.tick s; a death in fire goes through Player.die() (`hazardDeath`).
function ageFires(game, dt) {
  for (const e of game.enemies) {
    const L = e.fires; if (!L || !L.length) continue;
    if (!e.alive()) { L.length = 0; continue; }
    for (let i = L.length - 1; i >= 0; i--) if ((L[i].age += dt) >= L[i].time) L.splice(i, 1);
  }
}
// The hottest caught fire this body stands in, or null.
function fireUnder(game, b) {
  if (!b || !b.alive() || !b.grounded || b.invulnerable()) return null;
  const G = CONFIG.groundFire; let hot = null;
  for (const e of game.enemies) {
    const L = e.fires; if (!L) continue;
    for (const f of L) {
      if (f.age < G.kindle || Math.abs(b.y - f.y) >= CONFIG.height.stepUp || Math.hypot(b.x - f.x, b.z - f.z) > f.r + b.radius * 0.5) continue;
      if (!hot || f.dps > hot.dps) hot = f;
    }
  }
  return hot;
}
function burnInFires(game, dt, body, other) {
  ageFires(game, dt);
  for (let k = 0; k < 2; k++) {
    const b = k ? other : body; if (!b) continue;
    const hot = fireUnder(game, b);
    if (!hot) { b.fireTick = 0; continue; }
    b.hp = Math.max(0, b.hp - hot.dps * dt);
    if ((b.fireTick = (b.fireTick || 0) + dt) >= CONFIG.hazards.tick) { b.fireTick -= CONFIG.hazards.tick; b.tint = Math.max(b.tint, 0.5); events.emit('hazard', { hazard: hot, player: b }); }
    if (b.hp <= 0) { b.die(); events.emit('hazardDeath', { hazard: hot, player: b }); }
  }
}
