'use strict';
// Headless adapter over the *same* Enemy, Hitbox, makeWorld and Game placement rules.
// Only player outcomes come from browsers. Enemy choices, movement, bars and world
// progress run here, even when the lobby leader has a slow or backgrounded tab.
globalThis.host = (() => {
  let epoch = 0, time = 0, attackSerial = 0, bolts = [], eventList = [], history = [];
  let players = [], checkpoint = null;
  let completedFor = 0;
  let damage = new Map(), results = null;
  // Friendly bots (v7.11): real Player bodies pressing BotHands (js/bot.js), simulated here beside the shared
  // enemies, so a bot keeps fighting whatever any browser tab is doing. id -> { id, name, profile, brain, body, ... }
  const bots = new Map();
  let followers = new Map(), assignLeft = 0, partyKey = '';
  let botSerial = 0, wipeOnly = false, acting = null;
  const crowdClocks = new Map();
  // Contact plausibility state, per run: hit budgets per player/enemy and each player's last accepted parry (riposte).
  const hitBudget = new Map(), lastParry = new Map();
  // An empty, settled run sleeps (world clocks advance, enemies wait at home) until somebody returns.
  let sleeping = false, settleCheck = 0;
  const C = ArenaNet.config;
  for (const story of STORIES) {
    if (!story.chapters.length || story.chapters.some(c => !ALL_LEVELS.some(l => l.id === c.level) || TEST_LEVELS.some(l => l.id === c.level)))
      throw new Error(`Campaign ${story.id} has an unknown or empty chapter list.`);
  }
  if (!STORIES.some(s => s.id === C.defaultCampaign)) throw new Error('Unknown default multiplayer campaign: ' + C.defaultCampaign);
  const choice = C.defaultAdventure;
  if (!(choice.kind === 'gauntlet' && C.gauntlets[choice.id] || choice.kind === 'campaign' && STORIES.some(s => s.id === choice.id && s.lobbyName)))
    throw new Error('Unknown default lobby adventure: ' + choice.kind + '/' + choice.id);
  const proxy = (s, id) => ({ ...s, id, radius: PLAYER_DEF.radius, height: BODY_HEIGHT * PLAYER_DEF.look.scale,
    alive() { return this.hp > 0 && this.state !== PS.DEAD; },
    isAttacking() { return this.state === PS.ATTACK || this.state === PS.JUMP_ATTACK; },
    // Player's own rule (roll i-frames, executing, and the post-execution grace the pose carries).
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
  const enemyId = e => e.key || 'duel/' + e.baseDef.id;
  const enemy = id => Game.enemies.find(e => e.netId === id);
  events.onAny((type, d) => {
    // A bot's own blows and parries reach the clients as a player's would.
    if (acting && type === 'strike' && d.attacker === acting.body && d.target?.netId)
      eventList.push({ type: 'strike', player: acting.id, enemy: d.target.netId, strike: d.strike, blocked: !!d.blocked, at: d.at });
    if (acting && type === 'parry' && d.target?.netId) eventList.push({ type: 'parry', player: acting.id, enemy: d.target.netId });
    const e = d.enemy || d.actor;
    if (type === 'attackStart' && e) e.netAttack = ++attackSerial;
    if (['attackStart', 'attackPhase', 'bossPhase', 'bossRetreat', 'bossGone', 'postureBreak', 'enemyBlink', 'impact'].includes(type))
      eventList.push({ type, enemy: e && e.netId, attack: e && e.netAttack, out: d.out, seamless: d.seamless,
        x: d.x, y: d.y, z: d.z, fx: d.fx, hitIndex: e && e.hitIndex });
    // Enemy key-pose markers (tolls, chimes): the marker's index in its attack's own list.
    if (type === 'attackMarker' && e?.netId && Array.isArray(d.attack?.markers) && d.attack.markers.includes(d.marker))
      eventList.push({ type, enemy: e.netId, attack: e.netAttack, attackId: d.attack.id, marker: d.attack.markers.indexOf(d.marker) });
  });
  projectiles.fire = (e, attack, p) => {
    // A reliable shot event, replayed once on each client's presentation timeline.
    bolts.push({ enemy: e.netId, attack: attack.id, target: { x: p.x, y: p.y, z: p.z, height: p.height } });
    // Browsers fly bolts against their own player; bots need the same bolts flown here (js/projectiles.js rules).
    if (bots.size) for (const off of attack.projectile.spread || [0]) flying.push(launch(e, attack, p, off));
  };
  const flying = [];
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
        p.takeHit(b.strike, { x: b.x, z: b.z }); gone = true; break;
      }
      if (!gone && wall <= 1) gone = true;
      b.x += dx; b.y += dy; b.z += dz;
      if (gone || b.age > CONFIG.projectile.life || b.y < (world.killY ?? -50)) flying.splice(i, 1);
    }
  }
  function catalog() {
    return { version: VERSION, levels: ALL_LEVELS.filter(l => !TEST_LEVELS.includes(l)).map(l => ({ id: l.id, name: l.name })),
      campaigns: STORIES.map(s => ({ id: s.id, name: s.name, chapters: s.chapters.length })),
      defaultAdventure: { ...C.defaultAdventure },
      bosses: [...ENEMY_DEFS, ...ELDEN_BOSS_DEFS].filter(isBossDef).map(e => ({ id: e.id, name: e.name })) };
  }
  function campaign(id, level) {
    const story = STORIES.find(s => s.id === id); if (!story) return null;
    const index = level === undefined ? 0 : story.chapters.findIndex(c => c.level === level);
    const chapter = story.chapters[index]; if (!chapter) return null;
    return { id: story.id, name: story.name, intro: LOBBY_INTROS.some(x => x.id === story.id), level: chapter.level, title: chapter.title, line: chapter.line,
      number: index + 1, total: story.chapters.length, next: story.chapters[index + 1]?.level || null, done: story.done };
  }
  // One encounter of a boss run: `size` consecutive catalog bosses, referenced by the first one's id.
  const rejected = message => Object.assign(new Error(message), { rejected: true });   // a refused request, safe to show
  function gauntlet(boss, id = 'boss-only') {
    const run = ArenaNet.own(C.gauntlets, id); if (!run) throw rejected('Unknown boss run');
    const bosses = catalog().bosses;
    const index = boss === undefined ? 0 : bosses.findIndex(e => e.id === boss);
    if (index < 0 || index % run.size) throw rejected('Unknown gauntlet boss');
    const group = bosses.slice(index, index + run.size);
    return { id, name: run.name, boss: group[0].id, partners: group.slice(1).map(e => e.id), number: index / run.size + 1,
      total: Math.ceil(bosses.length / run.size), defeated: index, bosses: bosses.length, next: bosses[index + run.size]?.id || null };
  }
  function start(kind, id, partners = []) {
    // Validate every wire-supplied id before touching Game/world, so a refused start leaves the run intact.
    if (!['level', 'arena'].includes(kind)) throw rejected('Unknown game mode');
    if (!Array.isArray(partners)) throw rejected('Unknown level or opponent');
    const own = id => ArenaNet.own(ENEMY_BY_ID, id);
    if (kind === 'level' && !catalog().levels.some(l => l.id === id) || kind === 'arena' && !own(id) || partners.length && (kind !== 'arena' || partners.some(p => !own(p)))) throw rejected('Unknown level or opponent');
    const d = kind === 'arena' && own(id), L = d && d.arena && ALL_LEVELS.find(l => l.id === d.arena);
    const level = kind === 'level' ? ALL_LEVELS.find(l => l.id === id) : L ? { ...L, fullTracking: ARENA.fullTracking, playerStart: d.playerStart, enemyStart: d.enemyStart } : ARENA;
    const nextWorld = makeWorld(level, collisionStage(level));
    Game.kind = kind; Game.story = false; Game.duelId = kind === 'arena' ? id : null; Game.duelPartners = [...partners];
    Game.level = level; world = nextWorld;
    Game.cleared = new Set(); Game.complete = false; crowd.reset(); crowdClocks.clear();
    const s = Game.level.playerStart || Game.level.start;
    checkpoint = { ...s, y: world.floorY(s.x, s.z, s.y) };
    Game.zones = kind === 'arena' ? [] : (Game.level.gated || []).map(z => ({ ...z, members: z.enemies || [{ enemy: z.enemy, spawn: z.spawn }], actors: [], gate: world.gates.find(g => g.id === z.id) }));
    Game.enemies = Game.makeEnemies();
    for (const z of Game.zones) Game.spawnZone(z);
    for (const e of Game.enemies) { e.netId = enemyId(e); e.netAttack = 0; e.netTarget = null; }
    epoch++; time = 0; completedFor = 0; eventList = []; bolts = []; flying.length = 0; history = []; players = [];
    damage = new Map(); results = null; followers.clear(); assignLeft = 0; partyKey = '';
    hitBudget.clear(); lastParry.clear(); sleeping = false; settleCheck = 0;
    wipeOnly = kind === 'arena' && isBossDef(d);
    let index = 0;
    for (const b of bots.values()) { registerPlayer(b.id, b.name); spawnBot(b, index++); }
    return { epoch, kind, id, ...(partners.length ? { partners: [...partners] } : {}), spawn: checkpoint, teamWipeOnly: kind === 'arena' && isBossDef(d) };
  }
  function setPlayers(list) { players = list.map(s => proxy(s, s.id)).concat(botBodies()); }
  const botBodies = () => [...bots.values()].filter(b => b.body).map(b => b.body);
  // Beside the checkpoint, alternating sides, as a party member arriving with everyone else.
  function spawnBot(b, index) {
    const s = checkpoint, off = (index % 2 ? -1 : 1) * (1 + Math.floor(index / 2)) * 1.4, yaw = s.yaw || 0;
    const x = s.x + Math.cos(yaw) * off, z = s.z - Math.sin(yaw) * off;
    b.brain = bot.create(b.profile);
    b.body = new Player(PLAYER_DEF, x, z, yaw, world.floorY(x, z, s.y));
    b.body.ctl = b.brain.hands; b.body.id = b.body.botId = b.id;
    b.deadFor = 0; b.hitstop = 0;
  }
  function addBot(profileId) {
    if (bots.size >= C.maxBots) return null;
    const used = new Set([...bots.values()].map(b => b.profile.id));
    const profile = BOT_PROFILES.find(p => p.id === profileId) || BOT_PROFILES.find(p => !used.has(p.id)) || BOT_PROFILES[bots.size % BOT_PROFILES.length];
    const b = { id: 'bot-' + (++botSerial), name: profile.name, profile, brain: null, body: null, deadFor: 0, hitstop: 0, poseSeq: 0 };
    bots.set(b.id, b);
    if (Game.level && checkpoint) { registerPlayer(b.id, b.name); spawnBot(b, bots.size - 1); }
    return { id: b.id, name: b.name };
  }
  function removeBot(id) { const ok = bots.delete(id); players = players.filter(p => p.id !== id); return ok; }
  function clearBots() { for (const id of [...bots.keys()]) removeBot(id); }
  function updateBots(dt) {
    if (!bots.size) return;
    BotNavigation.tick();   // one shared floor-sample budget for every bot's route search this step
    const B = CONFIG.bot, people = players.filter(p => !p.botId && p.alive());
    const liveBots = botBodies().filter(p => p.alive());
    const key = people.map(p => p.id).sort().join(',') + '/' + liveBots.map(p => p.id).sort().join(',');
    if (Game.kind === 'level' && ((assignLeft -= dt) <= 0 || key !== partyKey)) {
      followers = BotNavigation.assign(people, liveBots, Game.enemies, followers);
      assignLeft = B.assignmentTime; partyKey = key;
    }
    for (const b of bots.values()) {
      const p = b.body; if (!p) continue;
      if (!p.alive()) {
        b.deadFor += dt; p.update(dt, { x: 0, z: 0, has: false }, [], null);
        if (!wipeOnly && b.deadFor >= B.respawnDelay) spawnBot(b, 0);
        continue;
      }
      if (b.hitstop > 0) { b.hitstop = Math.max(0, b.hitstop - dt); continue; }
      const allies = players.filter(o => o !== p && o.alive());
      const lead = Game.kind === 'level' ? people.find(p => p.id === followers.get(b.id)) : null;
      const { mv, lock } = b.brain.think(dt, p, Game.enemies, allies, flying, lead);
      const before = Game.enemies.map(e => e.hp);
      acting = b;
      try {
        p.update(dt, mv, Game.enemies.filter(e => e.alive()), lock && lock.alive() ? lock : null);
        for (const e of Game.enemies) if (e.state !== ES.EXECUTED) separatePair(p, e, 1);
        const g = { player: p, enemies: Game.enemies, hitstop: 0 };
        resolveCombat(g);
        b.hitstop = g.hitstop;
      } finally { acting = null; }
      Game.enemies.forEach((e, i) => creditDamage(b.id, before[i] - e.hp));
      if (p.alive() && !p.invulnerable()) for (const h of world.hazards || []) if (p.grounded && inRect(h.rect, p.x, p.z) && Math.abs(p.y - h.y) <= CONFIG.height.stepUp) {
        p.hp = Math.max(0, p.hp - h.dps * dt); if (p.hp <= 0) p.setState(PS.DEAD);
      }
      // Only sustained failed walking can request a short, collision-checked unstick along its route.
      const rescue = b.brain.navigator.recovery;
      if (Game.kind === 'level' && p.alive() && !b.brain.target && rescue && lead) {
        p.x = rescue.x; p.y = rescue.y; p.z = rescue.z;
        p.vx = p.vy = p.vz = p.kx = p.kz = 0; p.savePrev();
      }
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
    if (results) return;
    const row = damage.get(id);
    damage.set(id, { id, name, damage: row?.damage || 0 });
  }
  function creditDamage(id, amount) {
    const row = damage.get(id);
    if (row && !results) row.damage += Math.max(0, amount);
  }
  function progress(dt) {
    const living = players.filter(p => p.alive());
    for (const z of Game.zones) {
      for (const p of living) {
        const entered = typeof z.trigger === 'number' ? p.x > z.trigger : inArea(z.trigger, p.x, p.z);
        const floor = z.actors[0]?.home.y ?? p.y;
        if (Game.level.wakeZones && entered && !z.gate.open && Math.abs(p.y - floor) <= CONFIG.height.reach + 1)
          for (const e of Game.enemies) if (e.zone === z.id && e.alive()) {
            e.huntTime = CONFIG.ai.huntTime;
            if (e.state === ES.SEARCH) { e.lastSeen = { x: p.x, z: p.z }; e.searchLook = 0; e.stateTime = 0; }
            else if (e.in('unaware') || e.state === ES.DORMANT) e.wake(p);
          }
      }
      if ((z.beaten || z.actors.length && z.actors.every(e => !e.alive())) && !z.gate.open) { z.gate.open = true; eventList.push({ type: 'gateOpened', id: z.id }); }
    }
    for (const g of world.gates) if (!g.open && g.opensFrom && living.some(p => inRect(g.opensFrom, p.x, p.z) && Math.abs(p.y - g.y) <= CONFIG.height.reach)) {
      g.open = true; eventList.push({ type: 'gateOpened', id: g.id, shortcut: true });
    }
    // Fog seals only once somebody enters its arena; other players can cross it
    // through a co-op entrance allowance in the client, without moving the boss.
    for (const data of Game.level.sealed || []) if (data.fog) {
      const z = Game.zones.find(z => z.id === data.fog), g = world.gates.find(g => g.id === data.id);
      if (z && g) g.open = z.gate.open || !living.some(p => inArea(z.trigger, p.x, p.z));
    }
    for (const t of world.traps) {
      if (t.state === 'set' && living.some(p => p.grounded && p.state !== PS.EXECUTE && inRect(t.trigger, p.x, p.z) && Math.abs(p.y - t.y) < CONFIG.height.stepUp)) {
        t.state = 'warning'; t.timer = 0; eventList.push({ type: 'trapWarning', id: t.id });
      } else if (t.state === 'warning') t.timer += dt;
      else if (t.state === 'sprung') t.dropTime += dt;
      if (t.state === 'warning' && t.timer >= t.warning) { t.state = 'sprung'; world.openHole(t.region, t.collapse); eventList.push({ type: 'trapSprung', id: t.id }); }
    }
    Game.complete = Game.kind === 'level' ? Game.zones.length > 0 && Game.zones.every(z => z.gate.open) : Game.enemies.every(e => !e.alive());
    completedFor = Game.complete ? completedFor + dt : 0;
    if (Game.complete && !results) {
      results = [...damage.values()].map(row => ({ ...row }))
        .sort((a, b) => b.damage - a.damage || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
      for (let i = 0; i < results.length; i++) results[i].rank = i && results[i].damage === results[i - 1].damage ? results[i - 1].rank : i + 1;
    }
  }
  // Nothing left to simulate: no bots, bolts, reservations or trap warnings, and every enemy dead or resting with its
  // meters recovered (patrols simply pause). The world clock keeps running; any living player wakes the run.
  const RESTING = new Set([ES.IDLE, ES.PATROL, ES.LURK, ES.DORMANT]);
  function settled() {
    if (bots.size || flying.length || world.traps.some(t => t.state === 'warning')) return false;
    return Game.enemies.every(e => !e.netExec && (!e.alive() ? e.rewarded || e.state === ES.GONE
      : RESTING.has(e.state) && !(e.huntTime > 0) && e.grounded && !(e.posture > 0) && !(e.guardMeter > 0) && e.poise === e.def.poise
        && (e.state === ES.PATROL || Math.hypot(e.vx, e.vz) < 0.05)));
  }
  function tick(dt, holdSimulation = false) {
    time += dt;
    if (holdSimulation) return;
    let living = players.filter(p => p.alive());
    // Contacts and reservations wake it at once; a periodic check also notices any other change.
    if (living.length || bots.size) sleeping = false;
    else if ((settleCheck -= dt) <= 0) { settleCheck = C.sleepCheck; sleeping = settled(); }
    if (sleeping) { progress(dt); return; }
    updateBots(dt); flyBolts(dt);
    // Reservations and world timers belong to the run, even if their owner
    // disconnects or every remaining player is dead/stale.
    for (const e of Game.enemies) if (e.netExec) {
      e.stateTime += dt;
      if (time >= e.netExec.until) finishExecution(e);
    }
    living = players.filter(p => p.alive());   // bots may have fallen or risen this step
    if (!living.length) {
      // With nobody present, finish attacks/phases, decay meters and return home normally.
      // This observer is dead and never acquires a target, takes damage or joins combat.
      const absent = proxy({ ...checkpoint, hp: 0, state: PS.DEAD }, null);
      crowd.enemies = [];
      for (const e of Game.enemies) if (!e.netExec) {
        e.savePrev(); e.netTarget = null; e.update(dt, absent);
        if (!e.alive() && !e.rewarded) { e.rewarded = true; eventList.push({ type: 'enemyDeath', enemy: e.netId }); }
      }
      progress(dt); return;
    }
    const was = new Set(Game.enemies.filter(e => e.in('unaware') || e.state === ES.DORMANT));
    const groups = new Map(living.map(p => [p.id, { player: p, enemies: [] }]));
    // Choose targets first, then run each player's crowd independently. Fights
    // in separate rooms must not slow one another or circle the first player.
    for (const e of Game.enemies) {
      // Keep an attack's target locked until its recovery. Outside attacks pick a
      // visible player on the same floor, with hysteresis to avoid twitchy retargets.
      const valid = living.filter(p => !e.arena || inArea(e.arena, p.x, p.z));
      let target = valid.find(p => p.id === e.netTarget);
      const score = p => Math.hypot(p.x - e.x, p.z - e.z) + Math.abs(p.y - e.y) * CONFIG.height.reach + (gateBetween(e, p) ? e.notice : 0);
      if (!target || !e.in('attacking')) {
        const scores = new Map(valid.map(p => [p.id, score(p)]));
        target = valid.reduce((best, p) => !best || scores.get(p.id) < scores.get(best.id) * (p.id === e.netTarget ? 1 : C.targetHysteresis) ? p : best, target);
      }
      target = target || living[0];
      e.netTarget = target.id; groups.get(target.id).enemies.push(e);
    }
    for (const id of crowdClocks.keys()) if (!groups.has(id)) crowdClocks.delete(id);
    for (const [id, group] of groups) {
      crowd.enemies = group.enemies; crowd.sinceStart = (crowdClocks.get(id) ?? Infinity) + dt;
      crowd.spread(group.player);
      for (const e of group.enemies) {
        if (e.netExec) continue;
        e.savePrev(); e.update(dt, group.player);
        if (!e.alive() && !e.rewarded) { e.rewarded = true; eventList.push({ type: 'enemyDeath', enemy: e.netId }); }
      }
      crowdClocks.set(id, crowd.sinceStart);
    }
    if (Game.kind === 'level' && Game.level.alert) for (const e of Game.enemies) if (was.has(e) && !e.in('unaware') && e.state !== ES.DORMANT) {
      const p = living.find(p => p.id === e.netTarget) || living[0];
      for (const other of Game.enemies) if (other !== e && other.alive() && (other.zone && other.zone === e.zone || Math.hypot(other.x - e.x, other.z - e.z) < CONFIG.alert.radius && !sightLost(e, other))) other.wake(p);
    }
    for (let i = 0; i < Game.enemies.length; i++) for (let j = i + 1; j < Game.enemies.length; j++) separatePair(Game.enemies[i], Game.enemies[j], 0.5);
    progress(dt);
    history.push({ time, enemies: Game.enemies.map(e => ({ id: e.netId, attack: e.netAttack, attackId: e.attack?.id, state: e.state, x: e.x, y: e.y, z: e.z, hit: e.hitIndex })) });
    while (history.length && time - history[0].time > C.historySeconds) history.shift();
  }
  function frame(drain = true) {
    const result = { epoch, time, complete: Game.complete,
      results: results && completedFor >= C.leaderboardDelay && completedFor < C.leaderboardDelay + C.leaderboardTime ? results : null,
      checkpoint, enemies: Game.enemies.map(e => ({
      id: e.netId, def: e.baseDef.id, x: e.x, y: e.y, z: e.z, yaw: e.yaw, state: e.state, stateTime: e.stateTime,
      hp: e.hp, phase: e.phase, posture: e.posture, guardMeter: e.guardMeter, poise: e.poise,
      attack: e.attack?.id || null, serial: e.netAttack, hitIndex: e.hitIndex, hitbox: !!e.hitbox,
      target: e.netTarget, grounded: e.grounded, walkPhase: e.walkPhase, leaping: e.leaping,
      holdLeft: e.holdLeft || 0, retreatHop: e.retreatHop || 0, blinkLeft: e.blinkLeft || 0,
      vx: e.vx, vy: e.vy, vz: e.vz,
      exec: e.netExec ? { player: e.netExec.player, time: e.stateTime } : null,
    })), gates: world.gates.map(g => ({ id: g.id, open: g.open })),
      traps: world.traps.map(t => ({ id: t.id, state: t.state, timer: t.timer, dropTime: t.dropTime })),
      events: drain ? eventList.splice(0) : [], shots: drain ? bolts.splice(0) : [] };
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
    if (!p || !p.alive() || !e || !e.alive() || !a || a.id === 'execute' || !ArenaNet.finite(msg.charge, C.maxCharge) || msg.charge < 0) return false;
    if (!within(p, e, reachOf(a.box), [a.box.y - a.box.h / 2, a.box.y + a.box.h / 2])) return false;
    // A riposte bonus follows only this player's own recently accepted parry (as the Player's riposte timer).
    const riposte = msg.riposte === true && time - (lastParry.get(id) ?? -Infinity) <= CONFIG.parry.riposteTime + C.riposteSlack;
    const strike = makeStrike(a, riposte, msg.charge);
    if (!Number.isFinite(strike.damage) || !Number.isFinite(strike.poise) || e.invulnerable() || !spendHit(id, e)) return false;
    const hp = e.hp, result = e.takeHit(strike, p); sleeping = false;
    if (!Number.isFinite(e.hp)) e.hp = hp;   // a bar can never become NaN (alive yet unkillable)
    creditDamage(id, hp - e.hp);
    eventList.push({ type: 'strike', player: id, enemy: e.netId, strike, blocked: !!result.blocked,
      at: { x: e.x, y: e.y + e.height * EYE, z: e.z } });
    if (result.broke) eventList.push({ type: 'postureBreak', enemy: e.netId });
    return true;
  }
  function parry(id, msg) {
    const e = enemy(msg.enemy), p = players.find(p => p.id === id);
    if (!e || !p || !p.alive() || !e.alive() || e.netExec) return false;
    const recent = history.filter(f => f.enemies.some(s => s.id === msg.enemy && s.attack === msg.serial && (s.state === ES.WINDUP || s.state === ES.ACTIVE)))
      .map(f => f.enemies.find(s => s.id === msg.enemy));
    const a = recent.length && e.baseDef.attacks.find(a => a.id === recent[0].attackId);
    if (!a || !canParryAttack(a)) return false;
    // The parried blow must have reached this player: its farthest hit from where the enemy stood during it.
    const reach = Math.max(...a.hits.map(h => reachOf(h.box || a.box))) + p.radius;
    if (!within(p, e, reach, [-Infinity, Infinity], s => s.attack === msg.serial)) return false;
    // A delayed parry of an old move still succeeded on that player's screen,
    // but must never cancel an unrelated new move on everybody else's screen.
    sleeping = false;
    const broke = e.netAttack === msg.serial ? e.getParried() : e.def.posture ? e.addPosture(e.def.posture.parry) : false;
    lastParry.set(id, time);
    eventList.push({ type: 'parry', player: id, enemy: e.netId });
    if (broke) eventList.push({ type: 'postureBreak', enemy: e.netId });
    return true;
  }
  function beginExecution(id, msg) {
    const e = enemy(msg.enemy), p = players.find(p => p.id === id), X = CONFIG.execution;
    if (!e || !p || !p.alive() || e.state !== ES.BROKEN || e.netExec) return false;
    // Execution range is between body edges (CONFIG.execution.range), on about the same floor.
    if (!within(p, e, X.range + p.radius, [-X.floor, p.height + X.floor])) return false;
    const a = PLAYER_DEF.moveset.attacks.execute;
    const duration = a.hits.reduce((n, h) => n + h.startup + h.active + (h.follow || 0), 0) + a.recovery;
    const damage = execution.damageFor(e);
    if (!Number.isFinite(damage)) return false;
    e.netExec = { player: id, until: time + duration + C.historySeconds, damage }; sleeping = false;
    e.hitbox = null; e.setState(ES.EXECUTED);
    return true;
  }
  function finishExecution(e) {
    const { damage, player } = e.netExec; e.netExec = null;
    creditDamage(player, Math.min(e.hp, damage));
    e.hp = Math.max(0, e.hp - damage);
    if (e.hp <= 0) { if (!e.outlast()) e.die(); }
    else { e.posture = 0; e.guardMeter = 0; e.setState(ES.STAGGER); }
  }
  function rest(id, bonfire) {
    const p = players.find(p => p.id === id), b = world.bonfires.find(b => b.id === bonfire);
    if (!p || !p.alive() || !b || Math.hypot(p.x - b.x, p.z - b.z) >= CONFIG.rest.range + C.contactTolerance || Math.abs(world.floorY(b.x, b.z, b.y) - p.y) >= CONFIG.height.reach || b.litBy && !Game.zones.find(z => z.id === b.litBy)?.gate.open) return false;
    if (Game.enemies.some(e => e.alive() && !e.in('unaware') && Math.hypot(e.x - p.x, e.z - p.z) < CONFIG.rest.blockRange && !gateBetween(e, p))) return false;
    checkpoint = b.spawn ? { ...b.spawn } : { x: b.x, y: world.floorY(b.x, b.z, b.y), z: b.z, yaw: p.yaw };
    return true;
  }
  function endExecution(id, enemyId) { const e = enemy(enemyId); if (e?.netExec?.player === id) finishExecution(e); }
  function lifesteal(id, msg) {
    const e = enemy(msg.enemy);
    if (e?.def.lifesteal && history.some(f => f.enemies.some(s => s.id === msg.enemy && s.attack === msg.serial && s.hit === msg.hitIndex))) {
      const hp = e.hp; e.lifesteal(); if (!Number.isFinite(e.hp)) e.hp = hp;
    }
  }
  return { addBot, removeBot, clearBots, botFrames, botList, botsDown, catalog, campaign, gauntlet, start, setPlayers, registerPlayer, tick, frame, hit, parry, beginExecution, endExecution, lifesteal, rest,
    playerMaxHp: PLAYER_DEF.stats.maxHp, playerMaxStamina: PLAYER_DEF.stats.maxStamina, playerMaxPoise: PLAYER_DEF.stats.maxPoise,
    get playerMaxFlasks() { return Math.max(PLAYER_DEF.inventory.find(it => it.item === 'flask').max, Game.kind === 'level' && Game.level.flasks || 0); },
    arenaWipeDelay: CONFIG.death.respawnDelay,
    campaignAdvanceTime: CONFIG.nextLevel.delay + CONFIG.nextLevel.fadeTime,
    get state() { return { epoch, time, checkpoint, complete: Game.complete, completedFor }; },
    get sleeping() { return sleeping; },
    // Server-side whitelist for relayed poses: a real player attack id (own property) or nothing.
    playerAttack: id => ArenaNet.own(PLAYER_DEF.moveset.attacks, id) ? id : null,
    // Test harnesses can inspect state without giving public clients a debug API.
    inspect: () => ({ Game, world, players, crowd, bot, bots }),
  };
})();
