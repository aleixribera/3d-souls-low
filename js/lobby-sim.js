'use strict';
// Headless adapter over the *same* Enemy, Hitbox, makeWorld and Game placement rules.
// Only player outcomes come from browsers. Enemy choices, movement, bars and world
// progress run here, even when the lobby leader has a slow or backgrounded tab.
globalThis.host = (() => {
  let epoch = 0, time = 0, attackSerial = 0, bolts = [], eventList = [], history = [];
  let players = [], checkpoint = null;
  let completedFor = 0;
  let fought = 0;   // s of this fight played (not held for loading, not after the last enemy fell): Boss Rush's clock
  let damage = new Map(), closed = false, deaths = new Map(), fightBots = new Set();   // this fight's damage, falls and bots (`closed`: the fight is won, its numbers kept)
  // This fight's feats per player id ({ parries, finishers, revives, rescued: ids revived }, for the end screen's titles) and whose blow
  // landed last on a boss (the killing blow, once every boss is down).
  let feats = new Map(), lastHit = null, killer = null;
  // Revive (CONFIG.revive): each fallen person's ember, by owner id: where they fell, who stands on it (`by`), for how
  // long (`t` s) and with what health when last seen (a loss starts it over). `risen`: revives finished, not yet sent.
  const embers = new Map(), risen = [];
  // Bots (v7.11): real Player bodies pressing BotHands (js/bot.js), simulated here beside the shared enemies. Since
  // pass 52 no player's party gets one: they are the loop's test players (tools/bot-fights.cjs, the tests). id -> { id, name, profile, brain, body, ... }
  const bots = new Map();
  let botSerial = 0, wipeOnly = false, acting = null;
  const crowdClocks = new Map();
  // Contact plausibility state, per run: hit budgets per player/enemy and each player's last accepted parry (riposte).
  const hitBudget = new Map(), lastParry = new Map(), spentOpening = new Map();   // spentOpening: the opening a player's counter used (one counter each)
  const defended = new Map();   // recent accepted defence identities; retries cannot open another counter
  function firstDefence(kind, id, msg, hit) {
    for (const [key, at] of defended) if (time - at > C.historySeconds + C.claimWait) defended.delete(key);
    const key = JSON.stringify([kind, id, msg.enemy, msg.serial, hit]);
    if (defended.has(key)) return false;
    defended.set(key, time); return true;
  }
  // An empty, settled run sleeps (world clocks advance, enemies wait at home) until somebody returns.
  let sleeping = false, settleCheck = 0;
  // Boss Rush's abilities (CONFIG.abilities, js/abilities.js), kept across a run's fights: ids held (one per pick,
  // repeated by upgrades) and the open offer, by player id; each one's kit (kitOf); and, for people (a bot's body keeps
  // its own), the perk clocks and their last health (abilityHurt) and their last accepted perfect dodge (Counterstep).
  const owned = new Map(), offers = new Map(), gear = new Map(), kits = new Map(), perks = new Map(), lastDodge = new Map(), stepDodge = new Map(), cycloneAt = new Map(), pendingClaims = [];
  const trails = new Map();   // person id -> their recent poses' places and states: [{ t, x, y, z, state }]
  const DASH_ATTACKS = new Set(Object.values(PLAYER_DEF.moveset.dash));   // Petal Cut's dash attacks
  const AIRBORNE = new Set([PS.JUMP, PS.JUMP_ATTACK]);   // a jump's, not a fall off a ledge
  const SHOT_UNREADY = new Set([PS.ROLL, PS.HURT, PS.STAGGER, PS.HELD, PS.DEAD]);   // no deflect from these (canDeflectNow)
  const C = ArenaNet.config;
  const proxy = (s, id) => ({ ...s, id, radius: PLAYER_DEF.radius, height: BODY_HEIGHT * PLAYER_DEF.look.scale,
    alive() { return this.hp > 0 && this.state !== PS.DEAD; },
    isAttacking() { return this.state === PS.ATTACK || this.state === PS.JUMP_ATTACK; },
    // Player's own rule (roll i-frames, a Finishing Blow, and the grace after one the pose carries).
    invulnerable() { return Player.prototype.invulnerable.call(this); },
  });
  // Geometry-free equivalent of the scene builders' collision metadata.
  function collisionStage(L) {
    if (L.layout === 'arena') return { gates: [], traps: [] };
    if (L.layout !== 'rooms') return { gates: L.gated.map(g => ({ id: g.id, x: g.gateX })), traps: [] };
    const T = terrainFor(L), gh = L.gateHeight;
    const gates = [...L.gated, ...(L.shortcuts || []), ...(L.sealed || [])].map(z => {
      const g = z.gate, y = T.floorY(g.x, g.z, g.y), th = g.style === 'barricade' ? CONFIG.rooms.barricade.depth : L.gateThickness;
      const box = g.along === 'x'
        ? { x0: g.x - g.width / 2, x1: g.x + g.width / 2, z0: g.z - th / 2, z1: g.z + th / 2, y0: y, y1: y + gh }
        : { x0: g.x - th / 2, x1: g.x + th / 2, z0: g.z - g.width / 2, z1: g.z + g.width / 2, y0: y, y1: y + gh };
      return { id: z.id, x: g.x, z: g.z, y, box, opensFrom: z.opensFrom };
    });
    return { terrain: T, solids: T.solids, slabs: T.slabs, gates,
      traps: (L.traps || []).map(t => ({ ...t, y: t.y ?? 0, region: trapRoom(T, t) })) };
  }
  // A legendary's damage counts to its holder, as a blow would (a bot's own step already counts what it changed).
  abilityPowers.credit = (holder, e, amount) => { sleeping = false; if (!acting) { creditDamage(holder, amount); noteDamage(e, holder, amount); } };
  abilityPowers.bodyOf = id => players.find(p => p.id === id) || null;
  abilityPowers.perkOf = id => { const h = holderOf(id); return h ? h.perk : null; };
  // Whom an enemy fights, for the snapshot: a player's id, or `summon` and the summon's place (`lure`) while one draws it.
  const netTargetOf = e => { const d = abilityPowers.decoy(e); return d ? { target: 'summon', lure: { x: d.x, y: d.y, z: d.z } } : { target: e.netTarget }; };   // a summon follows its holder's latest pose
  const enemyId = e => e.key || 'duel/' + e.baseDef.id;
  const enemy = id => Game.enemies.find(e => e.netId === id);
  events.onAny((type, d) => {
    // A bot's own blows and parries reach the clients as a player's would.
    if (acting && type === 'strike' && d.attacker === acting.body && d.target?.netId)
      eventList.push({ type: 'strike', player: acting.id, enemy: d.target.netId, strike: d.strike, blocked: !!d.blocked, at: d.at });
    if (acting && type === 'parry' && d.target?.netId) eventList.push({ type: 'parry', player: acting.id, enemy: d.target.netId });
    if (acting && type === 'finisherStart' && d.player === acting.body) feat(acting.id).finishers++;   // a bot's Finishing Blow
    // A legendary fired or striking, for every browser to draw (js/ability-fx.js).
    if (type === 'abilityPower') eventList.push({ type, power: d.power, then: d.then, holder: d.holder, enemy: d.enemy?.netId || null,
      x: d.x, y: d.y, z: d.z, v: d.v, strike: d.strike, draw: d.draw || undefined, path: d.path, flight: d.flight, mark: d.mark || undefined, yaw: d.yaw });
    const e = d.enemy || d.actor;
    if (type === 'attackStart' && e) e.netAttack = ++attackSerial;
    if (['attackStart', 'attackPhase', 'bossPhase', 'bossRetreat', 'bossGone', 'enemyBlink', 'impact'].includes(type))
      eventList.push({ type, enemy: e && e.netId, attack: e && e.netAttack, out: d.out, seamless: d.seamless,
        x: d.x, y: d.y, z: d.z, fx: d.fx, hitIndex: e && e.hitIndex });
    // Enemy key-pose markers (tolls, chimes): the marker's index in its attack's own list.
    if (type === 'attackMarker' && e?.netId && Array.isArray(d.attack?.markers) && d.attack.markers.includes(d.marker))
      eventList.push({ type, enemy: e.netId, attack: e.netAttack, attackId: d.attack.id, marker: d.attack.markers.indexOf(d.marker) });
  });
  projectiles.fire = (e, attack, p) => {
    // A reliable shot event, replayed once on each client's presentation timeline.
    bolts.push({ enemy: e.netId, attack: attack.id, target: { x: p.x, y: p.y, z: p.z, height: p.height } });
    // Kept a bolt's life, so a deflect claimed against it (Mirror Shard's `parryShot`) can be checked: one a bolt fired.
    while (shotsFired.length && (time - shotsFired[0].at > CONFIG.projectile.life || shotsFired.length > 64)) shotsFired.shift();
    if (p.id) shotsFired.push({ e, id: p.id, at: time, speed: attack.projectile.speed, left: (attack.projectile.spread || [0]).length });
    // Browsers fly bolts against their own player; bots need the same bolts flown here (js/projectiles.js rules).
    if (bots.size) for (const off of attack.projectile.spread || [0]) flying.push(launch(e, attack, p, off));
  };
  const flying = [], shotsFired = [];
  function launch(owner, attack, target, off) {
    const A = attack.projectile, P = CONFIG.projectile, s = Math.sin(owner.yaw + off), c = Math.cos(owner.yaw + off);
    const b = { x: owner.x + s * owner.radius * 1.2, z: owner.z + c * owner.radius * 1.2, y: owner.y + owner.height * P.muzzle };
    const along = Math.max(1, (target.x - b.x) * s + (target.z - b.z) * c), t = along / A.speed;
    const dy = target.y + target.height * P.aimAt - b.y;
    return Object.assign(b, { vx: s * A.speed, vz: c * A.speed, vy: dy / t + 0.5 * A.gravity * t, g: A.gravity, size: A.size, age: 0,
      owner, strike: makeStrike(attack), passed: new Set() });
  }
  function boltStop(x, y, z, dx, dy, dz) {
    let f = Infinity;
    if (world.solids) {
      for (const s of world.solids) if (!s.low) f = Math.min(f, segBox3(x, y, z, dx, dy, dz, s));
      for (const s of world.slabs) f = Math.min(f, segBox3(x, y, z, dx, dy, dz, s));
      for (const g of world.gates) if (!g.open && g.box) f = Math.min(f, segBox3(x, y, z, dx, dy, dz, g.box));
      return f;
    }
    if (y + dy < 0) f = Math.min(f, y / -dy);
    return f;
  }
  function flyBolts(dt) {
    for (let i = flying.length - 1; i >= 0; i--) {
      const b = flying[i];
      b.vy -= b.g * dt; b.age += dt;
      const dx = b.vx * dt, dy = b.vy * dt, dz = b.vz * dt, wall = boltStop(b.x, b.y, b.z, dx, dy, dz);
      let gone = false;
      for (const bb of bots.values()) {
        const p = bb.body; if (!p || !p.alive() || b.passed.has(p)) continue;
        const l2 = dx * dx + dz * dz, t = l2 > 1e-9 ? clamp(((p.x - b.x) * dx + (p.z - b.z) * dz) / l2, 0, 1) : 0;
        const cx = b.x + dx * t - p.x, cz = b.z + dz * t - p.z, cy = b.y + dy * t, r = p.radius + b.size;
        if (cx * cx + cz * cz > r * r || cy < p.y || cy > p.y + p.height || t > wall) continue;
        if (p.invulnerable()) { b.passed.add(p); continue; }
        gone = true;
        if (p.kit && p.kit.whens.has('parryShot') && canDeflectNow(p) && isInFront(p, b.x, b.z) && b.owner.alive()) {   // Mirror Shard
          p.deflect = 0; p.deflectLock = 0;
          abilityReport(p, 'parryShot', { enemy: b.owner, flight: Math.max(0, Math.hypot(b.owner.x - p.x, b.owner.z - p.z) - (b.owner.radius || 0)) / Math.hypot(b.vx, b.vy, b.vz), x: p.x, y: p.y, z: p.z });
          break;
        }
        p.takeHit(b.strike, { x: b.x, z: b.z }); break;
      }
      if (!gone && wall <= 1) gone = true;
      b.x += dx; b.y += dy; b.z += dz;
      if (gone || b.age > CONFIG.projectile.life || b.y < (world.killY ?? -50)) flying.splice(i, 1);
    }
  }
  function catalog() {
    return { version: VERSION, bosses: ENEMY_DEFS.filter(isBossDef).map(e => ({ id: e.id, name: e.name })) };
  }
  // What a session is, in a few words, for the title screen of someone about to join (v7.19.0): "Boss Rush",
  // "Weekly Run". Null when nothing runs.
  function describe(session) {
    if (!session?.gauntlet) return null;
    return session.gauntlet.name.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
  }
  const rejected = message => Object.assign(new Error(message), { rejected: true });   // a refused request, safe to show
  // One fight of Boss Rush (C.calling), endless (CONFIG.endless, RUSH in js/data/rush.js): `run` is { seed, opening },
  // `fight` counts from 0. Every fight is drawn in turn from the run's seed, so a run replays the same bosses and
  // modifiers; `opening` (ids, optional) sets the first fights' bosses by hand (tests, tools). The same shape as a
  // fight: its first boss, the others (`partners`), the run to carry on, whether it is Crowned and its modifiers' ids.
  const rushSeed = seed => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // A weekly run (C.weekly) carries its `week` ('2026-W46'), whose seed it must be, and no opening.
  function calling(run, fight = 0) {
    const E = CONFIG.endless, all = catalog().bosses.map(e => e.id), opening = run?.opening || [], week = run?.week;
    if (!run || !Number.isInteger(run.seed) || run.seed < 0 || run.seed > 0xffffffff || !Array.isArray(opening) || opening.length > all.length ||
      opening.some(id => typeof id !== 'string' || !all.includes(id)) || new Set(opening).size !== opening.length ||
      week !== undefined && (typeof week !== 'string' || !/^\d{4}-W\d{2}$/.test(week) || run.seed !== weekSeed(week) || opening.length)) throw rejected('Unknown Boss Rush run');
    if (!Number.isInteger(fight) || fight < 0 || fight >= E.longest) throw rejected('Unknown fight of Boss Rush');
    const rng = rushSeed(run.seed), seen = new Set(), drawn = [], draw = list => list[Math.floor(rng() * list.length)];
    let prev = [], defeated = 0, plan = null;
    for (let n = 0; n <= fight; n++) {
      const number = n + 1, crowned = number % E.crowned === 0;
      const size = !crowned && number >= E.pairFrom && (number - E.pairFrom) % E.pairEvery === 0 ? 2 : 1;
      const pool = number <= E.opening ? RUSH.opening : all, bosses = [];
      for (let i = 0; i < size; i++) {
        let id = i === 0 ? opening[n] : null;
        if (!id) {   // one not yet met in this round of the pool, not in the last fight, not already in this one
          const fresh = () => pool.filter(b => !seen.has(b) && !prev.includes(b) && !bosses.includes(b));
          let left = fresh();
          if (!left.length) {   // a new round of the pool: the last third of it met stays out a while longer
            seen.clear(); const keep = Math.floor(pool.length / 3); if (keep) for (const b of drawn.slice(-keep)) seen.add(b);
            left = fresh();
          }
          if (!left.length) left = pool.filter(b => !bosses.includes(b));
          id = draw(left);
        }
        bosses.push(id); seen.add(id); drawn.push(id);
      }
      const count = E.mods.filter(from => number >= from).length + (crowned && number >= E.mods[0] ? 1 : 0);
      const open = RUSH.modifiers.filter(m => number >= m.from).map(m => m.id), modifiers = [];
      while (modifiers.length < count && open.length) modifiers.push(open.splice(Math.floor(rng() * open.length), 1)[0]);
      plan = { bosses, crowned, modifiers, defeated };
      defeated += bosses.length; prev = bosses;
    }
    const mode = week ? C.weekly : C.calling;
    return { id: mode.id, name: mode.name, run: { seed: run.seed, opening: [...opening], ...(week ? { week } : {}) }, fight, boss: plan.bosses[0], partners: plan.bosses.slice(1),
      number: fight + 1, crowned: plan.crowned, modifiers: plan.modifiers, defeated: plan.defeated, next: fight + 1 < E.longest ? fight + 1 : null };
  }
  // A new run: a fresh seed, and the leader's opening bosses if any.
  const newRun = (opening = []) => ({ seed: Math.floor(Math.random() * 0x100000000) >>> 0, opening: [...opening] });
  // The weekly run (C.weekly): one seed per ISO week (UTC, from Monday 00:00), the same for every lobby.
  function weekOf(ms = Date.now()) {
    const d = new Date(ms), day = (d.getUTCDay() + 6) % 7;   // Monday 0
    const thursday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 3), year = new Date(thursday).getUTCFullYear();
    return `${year}-W${String(1 + Math.floor((thursday - Date.UTC(year, 0, 1)) / 604800000)).padStart(2, '0')}`;
  }
  // FNV-1a over bytes: seeds made from a week's name, or from a run, a fight and a player (4 bytes each).
  const fnv = bytes => { let h = 0x811c9dc5; for (const n of bytes) { h ^= n & 0xff; h = Math.imul(h, 0x01000193); } return h >>> 0; };
  const weekSeed = week => fnv([...('weekly:' + week)].map(c => c.charCodeAt(0)));
  const mixSeed = (...ints) => fnv(ints.flatMap(n => [n, n >>> 8, n >>> 16, n >>> 24]));
  const weeklyRun = (ms = Date.now()) => { const week = weekOf(ms); return { seed: weekSeed(week), opening: [], week }; };
  // Boss Rush's curve (CONFIG.pace): this fight's bosses at the pace for `won` fights won, and its modifiers' changes
  // (RUSH.modifiers); two or more bosses at once rest longer (CONFIG.endless.pairRest) and each has a share of its
  // health (rushHealth: CONFIG.endless.pairHealth, a warm-up boss's RUSH.warmHealth). Nothing raises health or blows.
  // Returns the pace.
  function setRushFight(won, modifiers = []) {
    const mods = modifiers.map(id => RUSH_MODIFIER_BY_ID[id]).filter(Boolean), times = key => mods.reduce((n, m) => n * (m[key] || 1), 1);
    const count = Game.enemies.filter(e => e.isBoss()).length, together = count > 1;
    const B = CONFIG.enemy.press;   // every boss's own press (item 4), under the modifiers
    const pace = rushPace(won) * times('pace'), rest = B.rest * times('rest') * (together ? CONFIG.endless.pairRest : 1), chain = B.chain * times('chain');
    for (const e of Game.enemies) if (e.isBoss()) { e.pace = pace; e.rest = rest; e.chain = chain; e.setHealth(rushHealth(count, won, e.baseDef.id)); }
    return pace;
  }
  // The party's might (kitMight, CONFIG.swift.might): the mean over `ids` of what each holds. Boss Rush's par divides by it.
  const partyMight = ids => ids.length ? ids.reduce((n, id) => n + kitMight(owned.get(id)), 0) / ids.length : 0;
  // A fight in the arena: enemy `id` and its `partners` (Boss Rush's fights; the tests and tools fight any enemy).
  // `keepAbilities`: a later fight of the same Boss Rush run; anything else starts with none.
  function start(kind, id, partners = [], keepAbilities = false) {
    // Validate every wire-supplied id before touching Game/world, so a refused start leaves the run intact.
    if (kind !== 'arena') throw rejected('Unknown game mode');
    if (!Array.isArray(partners)) throw rejected('Unknown opponent');
    const own = id => ArenaNet.own(ENEMY_BY_ID, id);
    if (!own(id) || partners.some(p => !own(p))) throw rejected('Unknown opponent');
    const d = own(id), L = d.arena && ALL_LEVELS.find(l => l.id === d.arena);
    const level = L ? { ...L, fullTracking: ARENA.fullTracking, playerStart: d.playerStart, enemyStart: d.enemyStart } : ARENA;
    const nextWorld = makeWorld(level, collisionStage(level));
    Game.kind = kind; Game.story = false; Game.duelId = id; Game.duelPartners = [...partners];
    Game.level = level; world = nextWorld;
    Game.cleared = new Set(); Game.complete = false; crowd.reset(); crowdClocks.clear();
    const s = Game.level.playerStart || Game.level.start;
    checkpoint = { ...s, y: world.floorY(s.x, s.z, s.y) };
    Game.zones = [];
    Game.enemies = Game.makeEnemies();
    for (const e of Game.enemies) { e.netId = enemyId(e); e.netAttack = 0; e.netTarget = null; }
    epoch++; time = 0; completedFor = 0; fought = 0; eventList = []; bolts = []; flying.length = 0; shotsFired.length = 0; history = []; players = []; trails.clear();
    damage = new Map(); closed = false; deaths = new Map(); fightBots = new Set();
    feats = new Map(); lastHit = null; killer = null; embers.clear(); risen.length = 0;
    hitBudget.clear(); lastParry.clear(); spentOpening.clear(); defended.clear(); sleeping = false; settleCheck = 0;
    wipeOnly = isBossDef(d);
    if (!keepAbilities) { owned.clear(); offers.clear(); }
    kits.clear(); perks.clear(); lastDodge.clear(); stepDodge.clear(); cycloneAt.clear(); pendingClaims.length = 0;
    let index = 0;
    for (const b of bots.values()) { registerPlayer(b.id, b.name); spawnBot(b, index++); }
    return { epoch, kind, id, ...(partners.length ? { partners: [...partners] } : {}), spawn: checkpoint, teamWipeOnly: isBossDef(d) };
  }
  function setPlayers(list) {
    players = list.map(s => proxy(s, s.id)).concat(botBodies());
    for (const s of list) {   // each person's recent places (C.trailSeconds), for the claims of a dash or a jump
      if (![s.x, s.y, s.z].every(Number.isFinite)) continue;
      let t = trails.get(s.id);
      if (!t) trails.set(s.id, t = []);
      const last = t[t.length - 1];
      if (last && last.t === time && last.state === s.state) continue;
      t.push({ t: time, x: s.x, y: s.y, z: s.z, state: s.state });
      while (t.length && (time - t[0].t > C.trailSeconds || t.length > 120)) t.shift();
    }
  }
  const trailOf = id => (trails.get(id) || []).filter(f => time - f.t <= C.trailSeconds);
  // A claimed place: { x, z } of finite numbers, or null.
  const point = q => q && typeof q === 'object' && Number.isFinite(q.x) && Number.isFinite(q.z) ? { x: q.x, z: q.z } : null;
  const botBodies = () => [...bots.values()].filter(b => b.body).map(b => b.body);
  // Beside the checkpoint, alternating sides, as a party member arriving with everyone else.
  function spawnBot(b, index) {
    const s = checkpoint, off = (index % 2 ? -1 : 1) * (1 + Math.floor(index / 2)) * 1.4, yaw = s.yaw || 0;
    const x = s.x + Math.cos(yaw) * off, z = s.z - Math.sin(yaw) * off;
    b.brain = bot.create(b.profile);
    b.body = new Player(PLAYER_DEF, x, z, yaw, world.floorY(x, z, s.y));
    b.body.ctl = b.brain.hands; b.body.id = b.body.botId = b.id;
    const body = b.body;
    body.grantAbilities(owned.get(b.id));
    body.onAbility = (when, ctx) => abilityPowers.trigger(b.id, body, body.kit, when, ctx);   // a bot's powers: settled here at once
    b.deadFor = 0; b.hitstop = 0;
  }
  // Abilities (CONFIG.abilities). An offer: `offer` cards (`extra` more after a swift kill, CONFIG.swift, never common),
  // each of a rarity drawn by its weight after `won` fights won, then one of that rarity this player may still take:
  // not at its last level, not already on the card before. No cap on legendaries, and teammates may hold the same one
  // (v7.160.0, Aleix: no card limits). With `withBots`, every bot
  // is offered too and takes one at once. After a Crowned fight (`crowned`, CONFIG.endless) the offer has at least
  // `crownedOffer` cards, and one of them, at a random place, is a legendary while one is left to offer. With a `seed`
  // (offerSeed: a Boss Rush run's fight) the nth player's draw is mixSeed(seed, n)'s, so a weekly run offers the same
  // cards to everyone who holds the same abilities.
  // `pools` false (the weekly run: one pool for everyone) offers from every ability; else a player is offered only their
  // own active pool (setGear), and one with none set (a bot) every ability. `rarities` (a list) keeps the offer to
  // those: the free pick before fight 1 (CONFIG.abilities.first).
  // A number key (ABILITY_KEYS) holds one ability: once one is taken, no other for that key is offered (pass 87, Aleix).
  const offerSize = (crowned, extra = 0) => crowned
    ? Math.max(CONFIG.abilities.offer + extra, CONFIG.endless.crownedOffer)
    : CONFIG.abilities.offer + extra;
  function offerAbilities(ids, withBots = true, extra = 0, won = 0, crowned = false, seed = null, pools = true, rarities = null) {
    const B = CONFIG.abilities;
    let random = Math.random, nth = -1;
    const pick = list => list[Math.floor(random() * list.length)];
    // Within a rarity, a plain common (`plain: true`) weighs CONFIG.abilities.plainWeight of the others.
    const pickCard = list => {
      const w = b => b.plain ? B.plainWeight : 1, total = list.reduce((n, b) => n + w(b), 0);
      let roll = random() * total;
      for (const b of list) if ((roll -= w(b)) < 0) return b;
      return list[list.length - 1];
    };
    const cards = offerSize(crowned, extra);
    // A `party` ability (Kindred Ember) only to a person in a run of two people or more (bots never revive anyone).
    const people = new Set([...ids, ...players.filter(p => !bots.has(p.id)).map(p => p.id)]).size;
    for (const id of [...ids, ...(withBots ? bots.keys() : [])]) {
      nth++;
      if (offers.has(id)) continue;
      random = seed === null ? Math.random : rushSeed(mixSeed(seed, nth));
      const held = owned.get(id) || [];
      const pool = pools && gear.get(id);
      // A number key once filled stays: no other ability for it is offered, only the one held, as its next level.
      const keyOf = new Map(held.map(h => ABILITY_BY_ID[h]).filter(b => b && b.key).map(b => [b.key, b.id]));
      const open = ABILITIES.filter(b => abilityLevel(b, held) < b.levels.length
        && !(b.key && keyOf.has(b.key) && keyOf.get(b.key) !== b.id)
        && (!pool || pool.has(b.id)) && (!rarities || rarities.includes(b.rarity))
        && !(b.party && (people < 2 || bots.has(id))));
      const offer = [], legend = crowned && pick(open.filter(b => b.rarity === 'legendary'));
      if (legend) offer.push(legend.id);
      for (let i = offer.length; i < cards; i++) {
        const left = open.filter(b => !offer.includes(b.id) && (i < B.offer || b.rarity !== 'common'));
        const weights = Object.entries(B.rarity).map(([r, R]) => [r, left.some(b => b.rarity === r) ? R.weight + R.grow * won : 0]);
        const total = weights.reduce((n, [, w]) => n + w, 0);
        if (total <= 0) break;
        let roll = random() * total, rarity = weights[0][0];
        for (const [r, w] of weights) { if (w > 0 && roll < w) { rarity = r; break; } roll -= w; }
        offer.push(pickCard(left.filter(b => b.rarity === rarity)).id);
      }
      if (legend && offer.length > 1) { const at = Math.floor(random() * offer.length); [offer[0], offer[at]] = [offer[at], offer[0]]; }
      if (!offer.length) continue;
      offers.set(id, offer);
      if (bots.has(id)) pickAbility(id, pick(offer));
    }
  }
  // A person's active pool (PLAN.md item 7), as their browser says: the abilities Boss Rush may offer them. A list that
  // isn't a pool (cratePool: unknown ids dropped, at least CRATE_MIN of each rarity) is the starter set. The lobby
  // keeps it through a run (js/lobby-host.js). Returns the pool kept.
  function setGear(id, list) {
    const pool = cratePool(list) || [...CRATES.starter];
    gear.set(id, new Set(pool));
    return pool;
  }
  const hasGear = id => gear.has(id);
  // The seed of a Boss Rush fight's offers: the run's seed and the fight; `round` sets a late arrival's apart.
  const offerSeed = (run, fight, round = 0) => mixSeed(run.seed, fight, round);
  // Takes one ability from this player's open offer; false for anything else.
  function pickAbility(id, ability) {
    const offer = offers.get(id);
    if (!offer || typeof ability !== 'string' || !offer.includes(ability)) return false;
    offers.delete(id); owned.set(id, [...(owned.get(id) || []), ability]); kits.delete(id);
    return true;
  }
  // Tools and tests only (tools/rush-curve.cjs's KIT): player `id` holds exactly `held` (ids, repeated by upgrades) at
  // once, with no offer; a bot's body takes the kit straight away. Never reached from the wire.
  function giveAbilities(id, held) {
    owned.set(id, [...held]); offers.delete(id); kits.delete(id);
    const b = bots.get(id);
    if (b && b.body) b.body.grantAbilities(owned.get(id));
  }
  // Out of time: everyone still choosing takes the first ability offered.
  function settleAbilities() { for (const [id, offer] of [...offers]) pickAbility(id, offer[0]); }
  // A player's kit from what they hold, kept until they take another.
  function kitOf(id) {
    let kit = kits.get(id);
    if (!kit) kits.set(id, kit = abilityKit(owned.get(id)));
    return kit;
  }
  const maxHpOf = id => PLAYER_DEF.stats.maxHp * (1 + kitOf(id).mods.maxHp);
  // A person's perk clocks (a bot's body keeps its own), and its last health from its poses.
  function perkOf(id) {
    let st = perks.get(id);
    if (!st) perks.set(id, st = { ...abilityPerkState(), hp: maxHpOf(id) });
    return st;
  }
  // A person's number keys fill from the claims accepted here (CONFIG.abilities.press.gain), as on their own body.
  function gainCharge(id, n) { const kit = kitOf(id); if (kit !== NO_KIT) abilityGain(kit, perkOf(id), n); }
  // A person's pose: health lost wakes the perks that wait for it, as on their own body.
  function notePose(id, hp) {
    const kit = kitOf(id);
    if (kit === NO_KIT) return;
    const st = perkOf(id);
    if (hp < st.hp - 1e-6) abilityHurt(kit, st);
    st.hp = hp;
  }
  // What the powers need of a holder: a bot's own body; for a person, their pose's place and health, their bar and their
  // perk clocks (the Blood Moon's).
  function holderOf(id) {
    const p = players.find(p => p.id === id);
    if (!p) return null;
    if (p.botId) return p;
    return { x: p.x, y: p.y, z: p.z, hp: p.hp, maxHp: maxHpOf(id), perk: perkOf(id), alive: () => p.alive() };
  }
  // A person's claim of an ability trigger (ABILITY_CLAIMS): a jump attack landing (from their pose: landing, with that
  // air attack), a perfect dodge (rolling, of a blow that was out near them lately, as a parry's check), being this
  // low (their pose's health) or drinking a flask (their pose: drinking). A claim sent ahead of the pose that shows it waits up to C.claimWait s for that pose
  // (pendingClaims, checked each step). Cooldowns and once-a-fight are the powers' own.
  function abilityClaim(id, msg, retry = false) {
    const wait = () => { if (!retry && pendingClaims.length < C.maxPendingClaims) pendingClaims.push({ id, msg, until: time + C.claimWait, fn: abilityClaim }); return false; };
    const kit = kitOf(id), p = players.find(p => p.id === id), body = holderOf(id);
    if (!p || !body || !p.alive() || !ABILITY_CLAIMS.includes(msg.when) || !kit.whens.has(msg.when)) return false;
    sleeping = false;
    if (msg.when === 'press') {   // a number key: its ability held, its charge full by this server's own count
      const slot = ABILITY_KEYS.includes(msg.key) && kit.pressed[msg.key], st = perkOf(id);
      if (!slot || !slot.power || st.charge[msg.key] < slot.v.charge * (1 - CONFIG.abilities.press.slack) - 1e-9) return false;
      const live = Game.enemies.filter(e => !e.invulnerable()), aim = enemy(msg.enemy);   // their lock, if in reach; else the nearest
      const e = pressTarget(p, live, aim && live.includes(aim) ? aim : null);
      if (ON_ENEMY.has(slot.then) && !e) return false;
      st.charge[msg.key] = 0;
      abilityPowers.trigger(id, body, kit, 'press', { key: msg.key, enemy: e });
    } else if (msg.when === 'land') {
      const a = ArenaNet.own(PLAYER_DEF.moveset.air, msg.action);
      if (!a || !['land', 'jumpAttack'].includes(p.state) || p.attack !== a) return false;
      abilityPowers.trigger(id, body, kit, 'land', { x: p.x, y: p.y, z: p.z, yaw: p.yaw, action: msg.action });   // Moonfall Cut cuts along their facing
    } else if (msg.when === 'dodge') {
      const e = struckNear(p, msg);
      if (!e) return false;
      if (p.state !== 'roll') return wait();
      // The separate dodged claim owns the counter window; an ability report must not refresh a spent opening.
      abilityPowers.trigger(id, body, kit, 'dodge', { enemy: e });
    } else if (msg.when === 'dashPast') {   // Spark Step: a dash their poses showed lately, along the path claimed, past that enemy
      const e = enemy(msg.enemy), from = point(msg.from), to = point(msg.to), K = CONFIG.abilities.commons, P = CONFIG.player;
      if (!e || !from || !to || Math.hypot(to.x - from.x, to.z - from.z) > P.rollSpeed * P.rollTime + C.claimNear * 2) return false;
      const trail = trailOf(id), dashed = trail.some(f => f.state === PS.ROLL && time - f.t <= C.claimDash);
      if (!dashed) return wait();
      // its start is where they stood as the roll began, its end where the roll went: not any two recent places
      const began = trail.findIndex(f => f.state === PS.ROLL), near = (f, q) => Math.hypot(f.x - q.x, f.z - q.z) <= C.claimNear;
      if (!trail.slice(Math.max(0, began - 2), began + 1).some(f => near(f, from)) || !trail.slice(began).some(f => near(f, to))) return false;
      if (dashPastOf(from, to, [e], K.pastGap + C.claimPast) !== e) return false;
      abilityPowers.trigger(id, body, kit, 'dashPast', { enemy: e, from, to, x: to.x, y: p.y, z: to.z });
    } else if (msg.when === 'jump') {   // Dust Devil: their pose leaving the ground lately, from the place claimed
      const at = point(msg), K = CONFIG.abilities.commons;
      if (!at || !Number.isFinite(msg.y)) return false;
      const trail = trailOf(id);
      if (!trail.some(f => AIRBORNE.has(f.state) && time - f.t <= C.claimJump)) return wait();
      if (!trail.some(f => Math.hypot(f.x - at.x, f.z - at.z) <= C.claimNear && Math.abs(f.y - msg.y) <= C.claimNear)) return false;
      const e = enemyNear(Game.enemies, at.x, msg.y, at.z, K.whirlRadius);
      if (!e) return false;
      abilityPowers.trigger(id, body, kit, 'jump', { enemy: e, x: at.x, y: msg.y, z: at.z });
    } else if (msg.when === 'block') {   // Thorn Guard: a blow of that attack was out near them, their pose blocking
      const e = struckNear(p, msg);
      if (!e) return false;
      if (p.state !== PS.BLOCK) return wait();
      if (Math.hypot(e.x - p.x, e.z - p.z) - (e.radius || 0) > CONFIG.abilities.commons.thornReach + C.claimNear) return false;
      abilityPowers.trigger(id, body, kit, 'block', { enemy: e });
    } else if (msg.when === 'parryShot') {   // Mirror Shard: that enemy shot at them within a bolt's life, and they face it
      const e = enemy(msg.enemy);
      while (shotsFired.length && time - shotsFired[0].at > CONFIG.projectile.life) shotsFired.shift();
      const shot = e && e.alive() && !e.netExec && shotsFired.find(s => s.e === e && s.id === id && s.left > 0);
      if (!shot || SHOT_UNREADY.has(p.state) || !isInFront(p, e.x, e.z)) return false;
      // It flies back from where they stand at its own speed: it strikes as it arrives. Not before it could have reached them.
      const way = Math.hypot(e.x - p.x, e.z - p.z) - (e.radius || 0), flight = way / shot.speed;
      if (time - shot.at < (way - C.claimNear) / shot.speed - 0.1) return false;
      shot.left--;
      abilityPowers.trigger(id, body, kit, 'parryShot', { enemy: e, flight, x: p.x, y: p.y, z: p.z });
    } else if (msg.when === 'comboHeavy') {   // Iron Cyclone: their pose in a string's heavy, no closer to the last than the shortest string
      if (time - (cycloneAt.get(id) ?? -Infinity) < CONFIG.abilities.cyclone.gap) return false;
      if (p.state !== PS.ATTACK || !isComboHeavy(ArenaNet.own(PLAYER_DEF.moveset.attacks, p.attack))) return wait();   // a pose's attack is its id
      cycloneAt.set(id, time);
      abilityPowers.trigger(id, body, kit, 'comboHeavy', { x: p.x, y: p.y, z: p.z });
    } else if (msg.when === 'flask') {
      if (p.state !== PS.USE_ITEM) return wait();
      abilityPowers.trigger(id, body, kit, 'flask', {});
    } else {
      const pw = kit.powers.find(q => q.when === 'low');
      if (!pw || !(body.hp > 0 && body.hp <= body.maxHp * pw.v.below)) return wait();
      abilityPowers.trigger(id, body, kit, 'low', {});
    }
    return true;
  }
  function retryClaims() {
    for (let i = pendingClaims.length - 1; i >= 0; i--) {
      const c = pendingClaims[i];
      if (time > c.until || c.fn(c.id, c.msg, true)) pendingClaims.splice(i, 1);
    }
  }
  function addBot(profileId) {
    if (bots.size >= (globalThis.SIM_MAX_BOTS || C.maxBots)) return null;
    const used = new Set([...bots.values()].map(b => b.profile.id));
    const profile = BOT_PROFILES.find(p => p.id === profileId) || BOT_PROFILES.find(p => !used.has(p.id)) || BOT_PROFILES[bots.size % BOT_PROFILES.length];
    const b = { id: 'bot-' + (++botSerial), name: profile.name, profile, brain: null, body: null, deadFor: 0, hitstop: 0, poseSeq: 0 };
    bots.set(b.id, b);
    if (Game.level && checkpoint) { registerPlayer(b.id, b.name); spawnBot(b, bots.size - 1); }
    return { id: b.id, name: b.name };
  }
  function removeBot(id) {
    const b = bots.get(id); if (b && b.body && b.body.exec) finisher.abandon(b.body);   // never leave its foe held
    const ok = bots.delete(id); players = players.filter(p => p.id !== id); return ok;
  }
  function clearBots() { for (const id of [...bots.keys()]) removeBot(id); }
  function updateBots(dt) {
    if (!bots.size) return;
    BotNavigation.tick();   // one shared floor-sample budget for every bot's route search this step
    const B = CONFIG.bot;
    for (const b of bots.values()) {
      const p = b.body; if (!p) continue;
      if (!p.alive()) {
        if (!b.deadFor) noteDeath(b.id);
        b.deadFor += dt; p.update(dt, { x: 0, z: 0, has: false }, [], null);
        if (!wipeOnly && b.deadFor >= B.respawnDelay) spawnBot(b, 0);
        continue;
      }
      if (b.hitstop > 0) { b.hitstop = Math.max(0, b.hitstop - dt); continue; }
      const allies = players.filter(o => o !== p && o.alive());
      const { mv, lock } = b.brain.think(dt, p, Game.enemies, allies, flying, null);
      const before = Game.enemies.map(e => e.hp);
      acting = b;
      try {
        p.update(dt, mv, Game.enemies.filter(e => e.alive()), lock && lock.alive() ? lock : null);
        for (const e of Game.enemies) if (e.state !== ES.EXECUTED) separatePair(p, e, 1);
        const g = { player: p, enemies: Game.enemies, hitstop: 0 };
        resolveCombat(g);
        b.hitstop = g.hitstop;
      } finally { acting = null; }
      Game.enemies.forEach((e, i) => { creditDamage(b.id, before[i] - e.hp); noteDamage(e, b.id, before[i] - e.hp); });
      if (p.alive() && !p.invulnerable()) for (const h of world.hazards || []) if (p.grounded && inRect(h.rect, p.x, p.z) && Math.abs(p.y - h.y) <= CONFIG.height.stepUp) {
        p.hp = Math.max(0, p.hp - h.dps * dt); if (p.hp <= 0) p.setState(PS.DEAD);
      }
      const fire = fireUnder(Game, p);   // a bot burns in them like a person (each client burns its own body)
      if (fire) { p.hp = Math.max(0, p.hp - fire.dps * dt); if (p.hp <= 0) p.setState(PS.DEAD); }
    }
  }
  // A chase camera behind the bot, facing its fight, for teammates who spectate it (the same view format browsers send).
  function botView(b) {
    const p = b.body, t = b.brain.target, want = t ? Math.atan2(t.x - p.x, t.z - p.z) : p.yaw;
    b.camYaw = b.camYaw === undefined ? want : b.camYaw + angDiff(want, b.camYaw) * 0.12;
    const fx = Math.sin(b.camYaw), fz = Math.cos(b.camYaw);
    const pos = [p.x - fx * 6.5, p.y + 3.4, p.z - fz * 6.5], dx = p.x + fx - pos[0], dy = p.y + 1.2 - pos[1], dz = p.z + fz - pos[2];
    const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
    const sy = Math.sin(yaw / 2), cy = Math.cos(yaw / 2), sp = Math.sin(pitch / 2), cp = Math.cos(pitch / 2);
    return { position: pos, quaternion: [cy * sp, sy * cp, -sy * sp, cy * cp], fov: CONFIG.camera.fov };
  }
  function botFrames() {
    return [...bots.values()].filter(b => b.body).map(b => ({ ...ArenaNet.bodyPose(b.body),
      view: b.body.alive() ? botView(b) : null, id: b.id, name: b.name, bot: true, poseSeq: ++b.poseSeq }));
  }
  const botList = () => [...bots.values()].map(b => ({ id: b.id, name: b.name, ready: true, hp: b.body ? b.body.hp : null, bot: true }));
  const botsDown = () => [...bots.values()].every(b => !b.body || !b.body.alive());
  function registerPlayer(id, name) {
    if (closed) return;
    const row = damage.get(id);
    damage.set(id, { id, name, damage: row?.damage || 0 });
    if (bots.has(id)) fightBots.add(id);   // still a bot in the tally if it leaves the party mid-fight
  }
  // A fall in this fight: a bot's here, a person's from the server when their pose first reports them dead.
  function noteDeath(id) { if (!closed) deaths.set(id, (deaths.get(id) || 0) + 1); }
  // This fight's damage, falls and feats per player, for Boss Rush's run totals and titles.
  const feat = id => { let f = feats.get(id); if (!f) feats.set(id, f = { parries: 0, finishers: 0, revives: 0, rescued: [] }); return f; };
  const fightTally = () => [...damage.values()].map(row => ({ id: row.id, name: row.name, damage: row.damage, deaths: deaths.get(row.id) || 0,
    ...(feats.get(row.id) || { parries: 0, finishers: 0, revives: 0, rescued: [] }), bot: fightBots.has(row.id) }));
  // A fallen person's ember, where their pose fell (the server calls this once per fall, in a party only).
  function fall(id, x, y, z) {
    if (!Game.complete && !embers.has(id) && [x, y, z].every(Number.isFinite)) embers.set(id, { x, y, z, by: null, t: 0, hp: 0 });
  }
  // The one standing on an ember keeps it while they stay within reach and lose no health; otherwise the closest living
  // person within reach (and not reviving another) starts over. `time` s straight on it brings its owner back.
  const revivingOther = (id, mine) => { for (const m of embers.values()) if (m !== mine && m.by === id) return true; return false; };
  function reviveStep(dt) {
    const R = CONFIG.revive;
    for (const [owner, m] of embers) {
      let by = null, near = Infinity;
      for (const p of players) {
        if (p.id === owner || bots.has(p.id) || !p.alive() || Math.abs(p.y - m.y) > R.height || revivingOther(p.id, m)) continue;
        const d = Math.hypot(p.x - m.x, p.z - m.z);
        if (d > R.range) continue;
        if (p.id === m.by) { by = p; break; }
        if (d < near) { by = p; near = d; }
      }
      m.t = by && by.id === m.by && by.hp >= m.hp - 1e-6 ? m.t + dt : 0;
      m.by = by ? by.id : null; m.hp = by ? by.hp : 0;
      if (by && m.t >= R.time - 1e-9) {
        embers.delete(owner); risen.push({ id: owner, by: by.id }); feat(by.id).revives++; feat(by.id).rescued.push(owner);
        eventList.push({ type: 'revive', player: owner, by: by.id, ...(kitOf(by.id).perks['revive/reviveHeal'] ? { kindred: true } : null) });   // Kindred Ember's ring
      }
    }
  }
  const reviving = id => { for (const m of embers.values()) if (m.by === id) return true; return false; };
  function creditDamage(id, amount) {
    const row = damage.get(id);
    if (row && !closed) row.damage += Math.max(0, amount);
  }
  // The fight is won once every enemy is down: its numbers are kept from then on, and the embers go.
  function progress(dt) {
    Game.complete = Game.enemies.every(e => !e.alive());
    completedFor = Game.complete ? completedFor + dt : 0;
    if (Game.complete && !closed) { closed = true; killer = lastHit; embers.clear(); }
  }
  // Nothing left to simulate: no bots, bolts or reservations, and every enemy dead or resting with its
  // guard whole again (patrols simply pause). The world clock keeps running; any living player wakes the run.
  const RESTING = new Set([ES.IDLE, ES.PATROL, ES.LURK, ES.DORMANT]);
  function settled() {
    if (bots.size || flying.length) return false;
    return Game.enemies.every(e => !e.netExec && (!e.alive() ? e.rewarded || e.state === ES.GONE
      : RESTING.has(e.state) && !(e.huntTime > 0) && e.grounded && !(e.cracks > 0) && e.poise === e.def.poise
        && (e.state === ES.PATROL || Math.hypot(e.vx, e.vz) < 0.05)));
  }
  // A boss fights the group (CONFIG.aggro): it remembers who hurt it lately (`e.threat`, damage by player id, fading
  // over `memory` s). A drinker within `healReach` of its body draws it at once; otherwise the lowest score (distance less recent
  // damage) wins, once the current target has been held `hold` s and only by `margin` m.
  function noteDamage(e, id, amount) {
    if (amount > 0 && e.isBoss()) { e.threat = e.threat || new Map(); e.threat.set(id, (e.threat.get(id) || 0) + amount); lastHit = id; }
  }
  function fadeThreat(e, dt) {
    if (!e.threat) return;
    const keep = Math.exp(-dt / CONFIG.aggro.memory);
    for (const [id, v] of e.threat) if (v * keep < 0.01) e.threat.delete(id); else e.threat.set(id, v * keep);
  }
  function bossTarget(e, valid, current, distance) {
    const A = CONFIG.aggro, bar = e.def.hp || 1;
    // A drinker keeps it while still drinking: two drinkers side by side don't flip it every step.
    if (current && current.state === PS.USE_ITEM && distance(current) - e.radius <= A.healReach) return current;
    let drinker = null, near = A.healReach;
    for (const p of valid) if (p.state === PS.USE_ITEM) { const d = distance(p) - e.radius; if (d <= near) { drinker = p; near = d; } }
    if (drinker) return drinker;
    // Whoever is reviving a teammate leans it hard their way, and draws it without waiting out `hold`.
    const lean = p => embers.size && reviving(p.id) ? A.revive : 0;
    const score = p => distance(p) - A.damage * 100 * (e.threat?.get(p.id) || 0) / bar - lean(p);
    let best = null, bestScore = Infinity;
    for (const p of valid) { const s = score(p); if (s < bestScore) { best = p; bestScore = s; } }
    if (!current || !best || best === current) return best || current;
    if (lean(best) && !lean(current)) return best;
    return time - (e.targetSince ?? -Infinity) >= A.hold && bestScore < score(current) - A.margin ? best : current;
  }
  function tick(dt, holdSimulation = false) {
    time += dt;
    if (holdSimulation) return;
    if (!Game.complete) fought += dt;
    let living = players.filter(p => p.alive());
    // Contacts and reservations wake it at once; a periodic check also notices any other change.
    if (living.length || bots.size) sleeping = false;
    else if ((settleCheck -= dt) <= 0) { settleCheck = C.sleepCheck; sleeping = settled(); }
    if (sleeping) { progress(dt); return; }
    ageFires(Game, dt); updateBots(dt); flyBolts(dt);   // the fires enemies left (js/enemy.js) burn down here too
    for (const st of perks.values()) abilityClocks(st, dt);
    // Reservations and world timers belong to the run, even if their owner
    // disconnects or every remaining player is dead/stale.
    for (const e of Game.enemies) if (e.netExec) {
      e.stateTime += dt;
      if (time >= e.netExec.until) finishFinisher(e);
    }
    living = players.filter(p => p.alive());   // bots may have fallen or risen this step
    if (!living.length) {
      // With nobody present, finish attacks/phases, decay meters and return home normally.
      // This observer is dead and never acquires a target, takes damage or joins combat.
      const absent = proxy({ ...checkpoint, hp: 0, state: PS.DEAD }, null);
      crowd.enemies = [];
      for (const e of Game.enemies) if (!e.netExec) {
        fadeThreat(e, dt); e.savePrev(); e.netTarget = null; e.update(dt, absent);
        if (!e.alive() && !e.rewarded) { e.rewarded = true; eventList.push({ type: 'enemyDeath', enemy: e.netId }); }
      }
      progress(dt); return;
    }
    if (embers.size && !Game.complete) reviveStep(dt);
    const groups = new Map(living.map(p => [p.id, { player: p, enemies: [] }]));
    // Choose targets first, then run each player's crowd independently. Fights
    // in separate rooms must not slow one another or circle the first player.
    for (const e of Game.enemies) {
      fadeThreat(e, dt);
      // Keep an attack's target locked until its recovery. Outside attacks pick a
      // visible player on the same floor, with hysteresis to avoid twitchy retargets.
      const valid = living.filter(p => !e.arena || inArea(e.arena, p.x, p.z));
      let target = valid.find(p => p.id === e.netTarget);
      const score = p => Math.hypot(p.x - e.x, p.z - e.z) + Math.abs(p.y - e.y) * CONFIG.height.reach + (gateBetween(e, p) ? e.notice : 0);
      if (e.isBoss()) {
        if (!target || !e.in('attacking')) target = bossTarget(e, valid, target, score);
        e.grouped = valid.filter(p => Math.hypot(p.x - e.x, p.z - e.z) - e.radius <= CONFIG.aggro.crowd).length >= 2;
      } else if (!target || !e.in('attacking')) {
        const scores = new Map(valid.map(p => [p.id, score(p)]));
        target = valid.reduce((best, p) => !best || scores.get(p.id) < scores.get(best.id) * (p.id === e.netTarget ? 1 : C.targetHysteresis) ? p : best, target);
      }
      target = target || living[0];
      if (target.id !== e.netTarget) e.targetSince = time;
      e.netTarget = target.id; groups.get(target.id).enemies.push(e);
    }
    for (const id of crowdClocks.keys()) if (!groups.has(id)) crowdClocks.delete(id);
    for (const [id, group] of groups) {
      crowd.enemies = group.enemies; crowd.sinceStart = (crowdClocks.get(id) ?? Infinity) + dt;
      crowd.spread(group.player);
      for (const e of group.enemies) {
        if (e.netExec) continue;
        e.savePrev(); e.update(dt, abilityPowers.decoy(e) || group.player);   // a summon may draw it (js/abilities.js)
        if (!e.alive() && !e.rewarded) { e.rewarded = true; eventList.push({ type: 'enemyDeath', enemy: e.netId }); }
      }
      crowdClocks.set(id, crowd.sinceStart);
    }
    for (let i = 0; i < Game.enemies.length; i++) for (let j = i + 1; j < Game.enemies.length; j++) separatePair(Game.enemies[i], Game.enemies[j], 0.5);
    abilityPowers.tick(dt);   // lightning and blades still striking
    if (pendingClaims.length) retryClaims();
    for (const e of Game.enemies) if (!e.alive() && !e.rewarded) { e.rewarded = true; eventList.push({ type: 'enemyDeath', enemy: e.netId }); }
    progress(dt);
    history.push({ time, enemies: Game.enemies.map(e => ({ id: e.netId, attack: e.netAttack, attackId: e.attack?.id, state: e.state, x: e.x, y: e.y, z: e.z, hit: e.hitIndex })) });
    while (history.length && time - history[0].time > C.historySeconds) history.shift();
  }
  function frame(drain = true) {
    const result = { epoch, time, complete: Game.complete, fought: Math.floor(fought * 10 + 1e-6) / 10,
      enemies: Game.enemies.map(e => ({
      id: e.netId, def: e.baseDef.id, x: e.x, y: e.y, z: e.z, yaw: e.yaw, state: e.state, stateTime: e.stateTime,
      hp: e.hp, phase: e.phase, cracks: e.cracks, crackBy: e.crackBy ?? null, poise: e.poise, frozen: e.frozen,
      attack: e.attack?.id || null, serial: e.netAttack, hitIndex: e.hitIndex, hitbox: !!e.hitbox,
      ...netTargetOf(e), grounded: e.grounded, walkPhase: e.walkPhase, leaping: e.leaping,
      holdLeft: e.holdLeft || 0, retreatHop: e.retreatHop || 0, blinkLeft: e.blinkLeft || 0,
      vx: e.vx, vy: e.vy, vz: e.vz, ...(e.def.resonance ? { resonance: Math.round(e.resonance * 100) / 100 } : null),   // pass 68: his bronze's glow and ring
      ...(e.mendPool > 0 ? { mend: Math.round(e.mendPool) } : null),   // pass 75: Aldric's open wounds (his bar, his cracks)
      ...(e.learned.length ? { learned: e.learned.slice() } : null),   // pass 77: the attacks the Antlered Hunger has learned (its antlers)
      exec: e.netExec ? { player: e.netExec.player, time: e.stateTime } : null,
    })), events: drain ? eventList.splice(0) : [], shots: drain ? bolts.splice(0) : [],
      embers: [...embers].map(([id, m]) => ({ id, x: m.x, y: m.y, z: m.z, t: Math.min(1, m.t / CONFIG.revive.time), by: m.by })) };
    return result;
  }
  // Clients report contacts against their displayed world. Resolve values from
  // trusted game data; do not accept a damage/HP amount from the wire.
  // Plausibility: the sender's last pose must be within reach of some place the enemy stood in the last
  // `contactWindow` s (its display may lag), with generous slack for pose age and honest movement.
  const reachOf = b => b.ring ? b.ring.to + b.ring.width / 2 : b.fwd + Math.hypot(b.w / 2, b.d / 2);
  function within(p, e, reach, height, match = null) {
    const slack = C.contactTolerance + C.contactSlack + C.contactSpeed * Math.min(p.poseAge || 0, C.contactAgeMax);
    const seen = [e];
    for (let i = history.length - 1; i >= 0 && time - history[i].time <= C.contactWindow; i--) {
      const s = history[i].enemies.find(s => s.id === e.netId); if (s && (!match || match(s))) seen.push(s);
    }
    return seen.some(s => (s !== e || !match || match(e)) && Math.hypot(p.x - s.x, p.z - s.z) - e.radius <= reach + slack &&
      Math.max(0, s.y - (p.y + height[1]), p.y + height[0] - (s.y + e.height)) <= slack);
  }
  // Each player/enemy pair refills one hit per `hitInterval` s up to `hitBurst`: no faster than real swings chain.
  function spendHit(id, e) {
    const key = id + '\n' + e.netId, b = hitBudget.get(key) || { tokens: C.hitBurst, at: time };
    b.tokens = Math.min(C.hitBurst, b.tokens + (time - b.at) / C.hitInterval); b.at = time;
    if (b.tokens < 1) { hitBudget.set(key, b); return false; }
    b.tokens--; hitBudget.set(key, b); return true;
  }
  function hit(id, msg) {
    const e = enemy(msg.enemy), p = players.find(p => p.id === id);
    const a = ArenaNet.own(PLAYER_DEF.moveset.attacks, msg.attack);
    if (!p || !p.alive() || !e || !e.alive() || !a || a.id === 'finisher' || !ArenaNet.finite(msg.charge, C.maxCharge) || msg.charge < 0) return false;
    if (!within(p, e, reachOf(a.box), [a.box.y - a.box.h / 2, a.box.y + a.box.h / 2])) return false;
    // A riposte (a counter) follows only this player's own recently accepted opening deflect (as the Player's riposte
    // timer) or perfect dodge, and only one counter an opening (pass 100: each cracks the guard).
    const kit = kitOf(id), longer = 1 + (kit.mods.counterWindow || 0);   // Breaker
    // Pass 85: every perfect dodge opens a counter (CONFIG.player.counterTime), Counterstep's window if longer (a dodge
    // its step came off cooldown for: stepDodge).
    // The window is the latest opening's own; a counter swing that reaches several foes counts on each (one `swing`).
    const parried = lastParry.get(id) ?? -Infinity, dodgedAt = lastDodge.get(id) ?? -Infinity, opening = Math.max(parried, dodgedAt);
    const spent = spentOpening.get(id), swing = typeof msg.swing === 'string' || Number.isSafeInteger(msg.swing) ? msg.swing : null;
    const fresh = !spent || opening > spent.opening || (swing !== null && spent.opening === opening && spent.swing === swing && !spent.enemies.has(e.netId));
    // Counterstep's window runs from its own step dodge, as the client's `riposte` keeps the longer of the two (a later
    // perfect dodge inside it never shortens it), while no deflect has opened a newer counter since.
    const fb = kit.perks['dodge/flashBehind'], stepAt = stepDodge.get(id) ?? -Infinity;
    const stepOpen = !!fb && stepAt >= parried && time - stepAt <= fb.window + C.riposteSlack;
    const span = opening === dodgedAt ? CONFIG.player.counterTime * longer : CONFIG.parry.riposteTime * longer;
    const riposte = a.id === PLAYER_DEF.moveset.counter.light && msg.riposte === true && fresh && (time - opening <= span + C.riposteSlack || stepOpen);
    const base = makeStrike(a, riposte, msg.charge);
    if (!Number.isFinite(base.damage) || !Number.isFinite(base.poise) || e.invulnerable() || !spendHit(id, e)) return false;
    const strike = abilityStrike(kit, perkOf(id), e, base);   // the kit's bonus, from what the server knows of them
    const hp = e.hp, cracks = e.cracks, result = e.takeHit(strike, p); sleeping = false;
    if (!Number.isFinite(e.hp)) e.hp = hp;   // a bar can never become NaN (alive yet unkillable)
    creditDamage(id, hp - e.hp); noteDamage(e, id, hp - e.hp);
    if (!result.blocked) gainCharge(id, pressGain(strike)); else abilityBlocked(perkOf(id), e, strike);
    if (riposte && !result.blocked) {
      const enemies = spent && spent.opening === opening && spent.swing === swing ? spent.enemies : new Set();
      enemies.add(e.netId); spentOpening.set(id, { opening, swing, enemies });
    }
    if (result.opened) {   // a stance broken, a wind-up faltered: open, a counter for this player (their browser opens it)
      lastParry.set(id, time); eventList.push({ type: 'opened', player: id, enemy: e.netId });
    }
    eventList.push({ type: 'strike', player: id, enemy: e.netId, strike, blocked: !!result.blocked,
      at: { x: e.x, y: e.y + e.height * EYE, z: e.z } });
    if (a.charge && msg.charge >= 1 && !result.blocked) abilityPowers.trigger(id, holderOf(id), kit, 'fullHeavy', { enemy: e });   // Storm King
    if (!result.blocked && kit.whens.has('hits')) abilityPowers.trigger(id, holderOf(id), kit, 'hits', { enemy: e, strike });   // Static Edge, Gale Crescent, a twin
    if (!result.blocked && a.stringEnd && kit.whens.has('stringEnd')) abilityPowers.trigger(id, holderOf(id), kit, 'stringEnd', { enemy: e, strike });   // Ember Lick
    if (!result.blocked && DASH_ATTACKS.has(a.id) && kit.whens.has('dashStrike')) abilityPowers.trigger(id, holderOf(id), kit, 'dashStrike', { enemy: e, strike });   // Petal Cut
    if (riposte && !result.blocked && kit.whens.has('counter')) abilityPowers.trigger(id, holderOf(id), kit, 'counter', { enemy: e });   // Pyre
    if (e.cracks > cracks && kit.whens.has('crack')) abilityPowers.trigger(id, holderOf(id), kit, 'crack', { enemy: e });   // Shatter Guard
    if (result.finisher) beginFinisher(id, e);
    return true;
  }
  // The enemy whose blow (attack `msg.serial`, out lately: winding up or striking) could have reached player `p`, or null.
  function struckNear(p, msg) {
    const e = enemy(msg.enemy);
    if (!e || !e.alive() || e.netExec || !Number.isSafeInteger(msg.serial)) return null;
    const recent = history.filter(f => f.enemies.some(s => s.id === msg.enemy && s.attack === msg.serial && (s.state === ES.WINDUP || s.state === ES.ACTIVE)))
      .map(f => f.enemies.find(s => s.id === msg.enemy));
    const a = recent.length && e.baseDef.attacks.find(a => a.id === recent[0].attackId);
    if (!a) return null;
    const reach = Math.max(...a.hits.map(h => reachOf(h.box || a.box))) + p.radius;
    return within(p, e, reach, [-Infinity, Infinity], s => s.attack === msg.serial) ? e : null;
  }
  function parry(id, msg) {
    const e = enemy(msg.enemy), p = players.find(p => p.id === id);
    if (!e || !p || !p.alive() || !e.alive() || e.netExec) return false;
    const recent = history.filter(f => f.enemies.some(s => s.id === msg.enemy && s.attack === msg.serial && (s.state === ES.WINDUP || s.state === ES.ACTIVE)))
      .map(f => f.enemies.find(s => s.id === msg.enemy));
    const a = recent.length && e.baseDef.attacks.find(a => a.id === recent[0].attackId);
    // The deflected blow (pass 85): `msg.hit`, its index in the attack. Every deflect allows this player a counter; the
    // last blow of an attack also opens the foe, an earlier one is turned aside and the string goes on until a counter lands.
    const hit = msg.hit;
    if (!a || !Number.isSafeInteger(hit) || hit < 0 || hit >= a.hits.length || !canParryHit(a, hit)
      || !recent.some(s => (s.hit || 0) === hit)) return false;   // that very blow was under way
    // The parried blow must have reached this player: its farthest hit from where the enemy stood during it.
    const reach = Math.max(...a.hits.map(h => reachOf(h.box || a.box))) + p.radius;
    if (!within(p, e, reach, [-Infinity, Infinity], s => s.attack === msg.serial)) return false;
    if (!firstDefence('parry', id, msg, hit)) return false;
    // A delayed parry of an old move still succeeded on that player's screen,
    // but must never cancel an unrelated new move on everybody else's screen.
    sleeping = false;
    const opened = hit === a.hits.length - 1;
    if (opened && e.netAttack === msg.serial) e.getParried();
    lastParry.set(id, time);
    feat(id).parries++; gainCharge(id, CONFIG.abilities.press.gain.deflect + abilityKeysFor(kitOf(id), 'parry'));   // Kindling's too
    eventList.push({ type: 'parry', player: id, enemy: e.netId });
    abilityPowers.trigger(id, holderOf(id), kitOf(id), 'parry', { enemy: e });   // Thousand Blades, Counterflame
    return true;
  }
  // A perfect dodge (pass 85), claimed by the dodger's browser: a blow of that attack was out near them. It allows the
  // counter's riposte (hit). Abilities that fire on a dodge still come through abilityClaim. Like that claim, it needs
  // the claimer's own frames to show the dash, and waits a moment for them.
  function dodged(id, msg, retry = false) {
    const p = players.find(p => p.id === id);
    if (!p || !p.alive() || !struckNear(p, msg)) return false;
    if (p.state !== 'roll') {
      if (!retry && pendingClaims.length < C.maxPendingClaims) pendingClaims.push({ id, msg, until: time + C.claimWait, fn: dodged });
      return false;
    }
    let hit = null;
    for (let i = history.length - 1; i >= 0; i--) {
      const s = history[i].enemies.find(s => s.id === msg.enemy && s.attack === msg.serial && (s.state === ES.WINDUP || s.state === ES.ACTIVE));
      if (s) { hit = s.hit || 0; break; }
    }
    if (!firstDefence('dodge', id, msg, hit)) return false;
    lastDodge.set(id, time); gainCharge(id, CONFIG.abilities.press.gain.dodge);
    const fb = kitOf(id).perks['dodge/flashBehind'], st = perkOf(id);   // Counterstep: its window, once a cooldown
    if (fb && st.step <= C.riposteSlack) { st.step = fb.cooldown; stepDodge.set(id, time); }   // the slack: the client's clock started at its dodge
    const e = enemy(msg.enemy);   // still that attack: a boss recovers longer from a blow dashed through (CONFIG.bossMove.dodged)
    if (e && e.netAttack === msg.serial && e.in('attacking')) e.dashedThroughBy();
    return true;
  }
  // The Finishing Blow (js/finisher.js), granted here: player `id`'s counter landed on a guard cracked to the last
  // (Enemy.takeHit). The foe is held until their browser says the blow ended (endFinisher) or its time is up, and the
  // browser is told to run it (the `finisher` event). Its damage is the server's, dealt as it ends.
  function beginFinisher(id, e) {
    const duration = finisher.duration(PLAYER_DEF.moveset.attacks.finisher);
    const damage = finisher.damageFor(e, kitOf(id).mods.finisher);
    if (!Number.isFinite(damage) || e.netExec) return;
    e.netExec = { player: id, until: time + duration + C.historySeconds, damage }; sleeping = false;
    e.hitbox = null; e.vx = e.vz = e.kx = e.kz = 0; e.setState(ES.EXECUTED); e.forgetAll();   // held: no step runs it here
    feat(id).finishers++; gainCharge(id, CONFIG.abilities.press.gain.finisher + abilityKeysFor(kitOf(id), 'finisher'));   // Tithe's too
    eventList.push({ type: 'finisher', player: id, enemy: e.netId });
  }
  function finishFinisher(e) {
    const { damage, player } = e.netExec; e.netExec = null;
    creditDamage(player, Math.min(e.hp, damage)); noteDamage(e, player, Math.min(e.hp, damage));
    e.hp = Math.max(0, e.hp - damage); e.cracks = 0;
    if (e.hp <= 0) { if (!e.outlast()) e.die(); }
    else { e.poise = e.def.poise; e.setState(ES.STAGGER); }
    const kit = kitOf(player), holder = holderOf(player);   // Petal Storm: round the finished foe, as it reels or falls
    if (holder && holder.alive() && kit.whens.has('finisher')) abilityPowers.trigger(player, holder, kit, 'finisher', { enemy: e, x: e.x, y: e.y, z: e.z });
  }
  function endFinisher(id, enemyId) { const e = enemy(enemyId); if (e?.netExec?.player === id) finishFinisher(e); }
  function lifesteal(id, msg) {
    const e = enemy(msg.enemy);
    if (e?.def.lifesteal && history.some(f => f.enemies.some(s => s.id === msg.enemy && s.attack === msg.serial && s.hit === msg.hitIndex))) {
      const hp = e.hp; e.lifesteal(); if (!Number.isFinite(e.hp)) e.hp = hp;
    }
  }
  // An attack it would learn landed on this player (pass 77, an attack's `learns`): only the attack it is in now, only if
  // it was in that hit (the history) when the player says so, and only within that hit's reach of where it stood then.
  function landed(id, msg) {
    const e = enemy(msg.enemy), p = players.find(p => p.id === id), a = e?.attack, h = a?.learns && a.hits[msg.hitIndex];
    if (!h || !p || !p.alive() || e.netAttack !== msg.serial) return;
    const box = h.box || a.box, reach = (box ? reachOf(box) : 0) + p.radius;
    if (within(p, e, reach, [-Infinity, Infinity], s => s.attack === msg.serial && s.hit === msg.hitIndex)) e.landed = true;
  }
  return { addBot, removeBot, clearBots, botFrames, botList, botsDown, catalog, calling, newRun, weeklyRun, weekOf, offerSeed, setRushFight, describe, start, setPlayers, registerPlayer, noteDeath, fightTally, tick,
    fall, dropEmber: id => embers.delete(id), takeRisen: () => risen.splice(0), get fightKiller() { return killer; },
    // A fallen player's bar as they rise, raised by their reviver's Kindred Ember (`by`), never over full.
    reviveHealth: (id, by) => maxHpOf(id) * Math.min(1, CONFIG.revive.health + ((by && kitOf(by).perks['revive/reviveHeal']) || { heal: 0 }).heal), frame, hit, parry, dodged, endFinisher, lifesteal, landed,
    playerMaxHp: PLAYER_DEF.stats.maxHp,
    offerAbilities, setGear, hasGear, poolOf: id => gear.has(id) ? [...gear.get(id)] : null, settleAbilities, pickAbility, giveAbilities, kitOf, maxHpOf, notePose, abilityClaim,
    offerSize, abilityPickTime: CONFIG.abilities.pickTime, abilityPickHold: CONFIG.abilities.pickHold, abilityFirst: CONFIG.abilities.first,
    rushPar, rushHealth, partyMight, swiftExtra: CONFIG.swift.extra,
    abilities: () => Object.fromEntries(owned), abilityOffer: id => offers.get(id) || null,
    playerMaxFlasks: PLAYER_DEF.inventory.find(it => it.item === 'flask').max,
    arenaWipeDelay: CONFIG.death.respawnDelay,
    get state() { return { epoch, time, checkpoint, complete: Game.complete, completedFor, fought }; },
    get sleeping() { return sleeping; },
    // Server-side whitelist for relayed poses: a real player attack id (own property) or nothing.
    playerAttack: id => ArenaNet.own(PLAYER_DEF.moveset.attacks, id) ? id : null,
    // Test harnesses can inspect state without giving public clients a debug API.
    inspect: () => ({ Game, world, players, crowd, bot, bots, CONFIG, abilityPowers, holderOf, beginFinisher }),
  };
})();
