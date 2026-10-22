'use strict';
// Headless adapter over the *same* Enemy, Hitbox, makeWorld and Game placement rules.
// Only player outcomes come from browsers. Enemy choices, movement, bars and world
// progress run here, even when the lobby leader has a slow or backgrounded tab.
globalThis.host = (() => {
  let epoch = 0, time = 0, attackSerial = 0, bolts = [], eventList = [], history = [];
  let players = [], checkpoint = null;
  let completedFor = 0;
  const crowdClocks = new Map();
  const C = ArenaNet.config;
  for (const story of STORIES) {
    if (!story.chapters.length || story.chapters.some(c => !ALL_LEVELS.some(l => l.id === c.level) || TEST_LEVELS.some(l => l.id === c.level)))
      throw new Error(`Campaign ${story.id} has an unknown or empty chapter list.`);
  }
  if (!STORIES.some(s => s.id === C.defaultCampaign)) throw new Error('Unknown default multiplayer campaign: ' + C.defaultCampaign);
  const proxy = (s, id) => ({ ...s, id, radius: PLAYER_DEF.radius, height: BODY_HEIGHT * PLAYER_DEF.look.scale,
    alive() { return this.hp > 0 && this.state !== PS.DEAD; },
    isAttacking() { return this.state === PS.ATTACK || this.state === PS.JUMP_ATTACK; },
    invulnerable() { return this.state === PS.EXECUTE || this.state === PS.ROLL && this.stateTime < CONFIG.player.rollIFrames; },
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
    const e = d.enemy || d.actor;
    if (type === 'attackStart' && e) e.netAttack = ++attackSerial;
    if (['attackStart', 'attackPhase', 'bossPhase', 'bossRetreat', 'bossGone', 'postureBreak', 'enemyBlink', 'impact'].includes(type))
      eventList.push({ type, enemy: e && e.netId, attack: e && e.netAttack, out: d.out, seamless: d.seamless,
        x: d.x, y: d.y, z: d.z, fx: d.fx, hitIndex: e && e.hitIndex });
  });
  projectiles.fire = (e, attack, p) => {
    // A reliable shot event, replayed once on each client's presentation timeline.
    bolts.push({ enemy: e.netId, attack: attack.id, target: { x: p.x, y: p.y, z: p.z, height: p.height } });
  };
  function catalog() {
    return { version: VERSION, levels: ALL_LEVELS.filter(l => !TEST_LEVELS.includes(l)).map(l => ({ id: l.id, name: l.name })),
      campaigns: STORIES.map(s => ({ id: s.id, name: s.name, chapters: s.chapters.length })),
      defaultAdventure: { kind: 'campaign', id: C.defaultCampaign },
      bosses: [...ENEMY_DEFS, ...ELDEN_BOSS_DEFS].filter(isBossDef).map(e => ({ id: e.id, name: e.name })) };
  }
  function campaign(id, level) {
    const story = STORIES.find(s => s.id === id); if (!story) return null;
    const index = level === undefined ? 0 : story.chapters.findIndex(c => c.level === level);
    const chapter = story.chapters[index]; if (!chapter) return null;
    return { id: story.id, name: story.name, level: chapter.level, title: chapter.title, line: chapter.line,
      number: index + 1, total: story.chapters.length, next: story.chapters[index + 1]?.level || null, done: story.done };
  }
  function gauntlet(boss) {
    const bosses = catalog().bosses;
    const current = boss === undefined ? bosses[0] : bosses.find(e => e.id === boss);
    if (!current) throw new Error('Unknown gauntlet boss');
    const number = bosses.findIndex(e => e.id === current.id) + 1;
    return { id: 'boss-only', boss: current.id, number, total: bosses.length, next: bosses[number]?.id || null };
  }
  function start(kind, id) {
    if (!['level', 'arena'].includes(kind)) throw new Error('Unknown game mode');
    if (kind === 'level' && !catalog().levels.some(l => l.id === id) || kind === 'arena' && !ENEMY_BY_ID[id]) throw new Error('Unknown level or opponent');
    Game.kind = kind; Game.story = false; Game.duelId = kind === 'arena' ? id : null;
    const d = kind === 'arena' && ENEMY_BY_ID[id], L = d && d.arena && ALL_LEVELS.find(l => l.id === d.arena);
    Game.level = kind === 'level' ? ALL_LEVELS.find(l => l.id === id) : L ? { ...L, playerStart: d.playerStart, enemyStart: d.enemyStart } : ARENA;
    world = makeWorld(Game.level, collisionStage(Game.level));
    Game.cleared = new Set(); Game.complete = false; crowd.reset(); crowdClocks.clear();
    const s = Game.level.playerStart || Game.level.start;
    checkpoint = { ...s, y: world.floorY(s.x, s.z, s.y) };
    Game.zones = kind === 'arena' ? [] : (Game.level.gated || []).map(z => ({ ...z, members: z.enemies || [{ enemy: z.enemy, spawn: z.spawn }], actors: [], gate: world.gates.find(g => g.id === z.id) }));
    Game.enemies = Game.makeEnemies();
    for (const z of Game.zones) Game.spawnZone(z);
    for (const e of Game.enemies) { e.netId = enemyId(e); e.netAttack = 0; e.netTarget = null; }
    epoch++; time = 0; completedFor = 0; eventList = []; bolts = []; history = []; players = [];
    return { epoch, kind, id, spawn: checkpoint, teamWipeOnly: kind === 'arena' && isBossDef(d) };
  }
  function setPlayers(list) { players = list.map(s => proxy(s, s.id)); }
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
    Game.complete = Game.kind === 'level' ? Game.zones.length > 0 && Game.zones.every(z => z.gate.open) : !Game.duel.alive();
    completedFor = Game.complete ? completedFor + dt : 0;
  }
  function tick(dt, holdBoss = false) {
    time += dt;
    if (holdBoss) return;
    const living = players.filter(p => p.alive());
    // Reservations and world timers belong to the run, even if their owner
    // disconnects or every remaining player is dead/stale.
    for (const e of Game.enemies) if (e.netExec) {
      e.stateTime += dt;
      if (time >= e.netExec.until) finishExecution(e);
    }
    if (!living.length) { progress(dt); return; }
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
    const result = { epoch, time, complete: Game.complete, checkpoint, enemies: Game.enemies.map(e => ({
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
  function hit(id, msg) {
    const e = enemy(msg.enemy), p = players.find(p => p.id === id);
    const a = PLAYER_DEF.moveset.attacks[msg.attack];
    if (!p || !p.alive() || !e || !e.alive() || !a || a.id === 'execute' || !ArenaNet.finite(msg.charge, C.maxCharge)) return false;
    const strike = makeStrike(a, !!msg.riposte, msg.charge);
    if (e.invulnerable()) return false;
    const result = e.takeHit(strike, p);
    eventList.push({ type: 'strike', player: id, enemy: e.netId, strike, blocked: !!result.blocked,
      at: { x: e.x, y: e.y + e.height * EYE, z: e.z } });
    if (result.broke) eventList.push({ type: 'postureBreak', enemy: e.netId });
    return true;
  }
  function parry(id, msg) {
    const e = enemy(msg.enemy);
    if (!e || !e.alive() || e.netExec || !history.some(f => f.enemies.some(s => s.id === msg.enemy && s.attack === msg.serial && (s.state === ES.WINDUP || s.state === ES.ACTIVE) && canParryAttack(e.baseDef.attacks.find(a => a.id === s.attackId))))) return false;
    // A delayed parry of an old move still succeeded on that player's screen,
    // but must never cancel an unrelated new move on everybody else's screen.
    const broke = e.netAttack === msg.serial ? e.getParried() : e.def.posture ? e.addPosture(e.def.posture.parry) : false;
    eventList.push({ type: 'parry', player: id, enemy: e.netId });
    if (broke) eventList.push({ type: 'postureBreak', enemy: e.netId });
    return true;
  }
  function beginExecution(id, msg) {
    const e = enemy(msg.enemy), p = players.find(p => p.id === id);
    if (!e || !p || !p.alive() || e.state !== ES.BROKEN || e.netExec) return false;
    const a = PLAYER_DEF.moveset.attacks.execute;
    const duration = a.hits.reduce((n, h) => n + h.startup + h.active + (h.follow || 0), 0) + a.recovery;
    e.netExec = { player: id, until: time + duration + C.historySeconds, damage: execution.damageFor(e) };
    e.hitbox = null; e.setState(ES.EXECUTED);
    return true;
  }
  function finishExecution(e) {
    const damage = e.netExec.damage; e.netExec = null;
    e.hp = Math.max(0, e.hp - damage);
    if (e.hp <= 0) { if (!e.outlast()) e.die(); }
    else { e.posture = 0; e.guardMeter = 0; e.setState(ES.STAGGER); }
  }
  function rest(id, bonfire) {
    const p = players.find(p => p.id === id), b = world.bonfires.find(b => b.id === bonfire);
    if (!p || !b || Math.hypot(p.x - b.x, p.z - b.z) >= CONFIG.rest.range || Math.abs(world.floorY(b.x, b.z, b.y) - p.y) >= CONFIG.height.reach || b.litBy && !Game.zones.find(z => z.id === b.litBy)?.gate.open) return false;
    if (Game.enemies.some(e => e.alive() && !e.in('unaware') && Math.hypot(e.x - p.x, e.z - p.z) < CONFIG.rest.blockRange && !gateBetween(e, p))) return false;
    checkpoint = b.spawn ? { ...b.spawn } : { x: b.x, y: world.floorY(b.x, b.z, b.y), z: b.z, yaw: p.yaw };
    return true;
  }
  function endExecution(id, enemyId) { const e = enemy(enemyId); if (e?.netExec?.player === id) finishExecution(e); }
  function lifesteal(id, msg) {
    const e = enemy(msg.enemy);
    if (e?.def.lifesteal && history.some(f => f.enemies.some(s => s.id === msg.enemy && s.attack === msg.serial && s.hit === msg.hitIndex))) e.lifesteal();
  }
  return { catalog, campaign, gauntlet, start, setPlayers, tick, frame, hit, parry, beginExecution, endExecution, lifesteal, rest,
    playerMaxHp: PLAYER_DEF.stats.maxHp,
    arenaWipeDelay: CONFIG.death.respawnDelay,
    campaignAdvanceTime: CONFIG.nextLevel.delay + CONFIG.nextLevel.fadeTime,
    get state() { return { epoch, time, checkpoint, complete: Game.complete, completedFor }; },
    // Test harnesses can inspect state without giving public clients a debug API.
    inspect: () => ({ Game, world, players, crowd }),
  };
})();
