'use strict';
// Local campaign companions are ordinary Players using the shared bot hands, physics and combat.
// Opt-in content lives on the campaign; solo death/bonfires still belong to the human player.
const companions = (() => {
  let label = null, health = null, labelPosition = null;
  function definition(game) {
    if (!game.story || game.kind !== 'level' || (typeof multiplayer !== 'undefined' && multiplayer.connected)) return null;
    const C = story.active.def;
    return C.companion && C.chapters.some(c => c.level === game.level.id) ? C.companion : null;
  }
  function hide() { if (label) label.hidden = true; }
  function reset(game) {
    if (game.companion) game.companion.body.rig.dispose();
    game.companion = null; hide();
    const def = definition(game); if (!def) return;
    const leader = game.player, profile = BOT_PROFILES.find(p => p.id === def.profile), brain = bot.create(profile);
    const off = CONFIG.companion.spawnOffset, x = leader.x + Math.cos(leader.yaw) * off, z = leader.z - Math.sin(leader.yaw) * off;
    const look = { ...PLAYER_DEF.look, color: def.color };
    const body = new Player({ ...PLAYER_DEF, name: def.name, look }, x, z, leader.yaw, leader.y);
    body.ctl = brain.hands; body.id = body.botId = def.id; leader.id = 'solo-player';
    clampToWorld(body);
    const floor = world.groundAt(body.x, body.z, leader.y);
    if (!Number.isFinite(floor) || Math.abs(floor - leader.y) > CONFIG.height.stepDown || gateBetween(leader, body)) { body.x = leader.x; body.z = leader.z; }
    body.y = body.peak = world.groundAt(body.x, body.z, leader.y); body.savePrev();
    game.companion = { def, body, brain, targets: new WeakMap(), clocks: new Map(), hazardTimers: new Map() };
  }
  function actors(game) { return [game.player, game.companion && game.companion.body].filter(Boolean); }
  function update(game, dt) {
    const c = game.companion; if (!c) return;
    const p = c.body;
    if (!p.alive()) { c.brain.hands.clear(); p.update(dt, { x: 0, z: 0, has: false }, [], null); return; }
    const live = game.enemies.filter(e => e.alive());
    // Like an online ally, Finn may enter an encounter after the human seals its fog.
    // Only his own input/physics see this entry allowance; the human and enemies retain the closed gate.
    const entry = [];
    for (const s of game.level.sealed || []) if (s.fog) {
      const z = game.zones.find(z => z.id === s.fog), g = world.gates.find(g => g.id === s.id);
      if (z && g && !g.open && inArea(z.trigger, game.player.x, game.player.z) && !inArea(z.trigger, p.x, p.z) &&
        Math.abs(p.y - g.y) <= CONFIG.height.reach && Math.abs(game.player.y - g.y) <= CONFIG.height.reach) { g.open = true; entry.push(g); }
    }
    try {
      const { mv, lock } = c.brain.think(dt, p, game.enemies, [game.player], projectiles.live(), game.player);
      p.update(dt, mv, live, lock);
    } finally { for (const g of entry) g.open = false; }
    const rescue = c.brain.navigator.recovery;
    if (p.alive() && !c.brain.target && rescue) {
      p.x = rescue.x; p.y = p.peak = rescue.y; p.z = rescue.z;
      p.vx = p.vy = p.vz = p.kx = p.kz = 0; p.savePrev();
    }
  }
  // Hold the actual attack target through its wind-up/active/recovery. Separate crowds keep the
  // enemies fighting Finn from circling or throttling the ones fighting the human elsewhere.
  function updateEnemies(game, dt) {
    const c = game.companion, living = actors(game).filter(p => p.alive());
    const groups = new Map(living.map(p => [p, []]));
    for (const e of game.enemies) {
      const valid = living.filter(p => !e.arena || inArea(e.arena, p.x, p.z));
      let target = valid.find(p => p === c.targets.get(e));
      if (!target || !e.in('attacking')) {
        const score = p => Math.hypot(p.x - e.x, p.z - e.z) + Math.abs(p.y - e.y) * CONFIG.height.reach + (gateBetween(e, p) ? e.notice : 0);
        target = valid.reduce((best, p) => !best || score(p) < score(best) * (p === c.targets.get(e) ? 1 : ArenaNet.config.targetHysteresis) ? p : best, target);
      }
      target = target || game.player; c.targets.set(e, target);
      if (!groups.has(target)) groups.set(target, []); groups.get(target).push(e);
    }
    for (const [p, enemies] of groups) {
      crowd.enemies = enemies; crowd.sinceStart = (c.clocks.get(p) ?? Infinity) + dt; crowd.spread(p);
      for (const e of enemies) if (!game.sleeps(e)) e.update(dt, p);
      c.clocks.set(p, crowd.sinceStart);
    }
  }
  function resolve(game) {
    const c = game.companion; if (!c) return;
    for (const e of game.enemies) if (e.state !== ES.EXECUTED) separatePair(c.body, e, CONFIG.companion.separationShare);
    const fight = { player: c.body, enemies: game.enemies, hitstop: game.hitstop };
    resolveCombat(fight); game.hitstop = Math.max(game.hitstop, fight.hitstop);
  }
  function hazards(game, dt) {
    const c = game.companion; if (!c) return;
    const p = c.body;
    for (const h of world.hazards) {
      const on = p.alive() && p.grounded && !p.invulnerable() && inRect(h.rect, p.x, p.z) && Math.abs(p.y - h.y) < CONFIG.height.stepUp;
      let timer = on ? (c.hazardTimers.get(h) || 0) + dt : 0;
      if (on) {
        p.hp = Math.max(0, p.hp - h.dps * dt);
        if (timer >= CONFIG.hazards.tick) { timer -= CONFIG.hazards.tick; p.tint = Math.max(p.tint, 0.5); events.emit('hazard', { hazard: h, player: p }); }
        if (p.hp <= 0) { p.hitbox = null; p.setState(PS.DEAD); events.emit('hazardDeath', { hazard: h, player: p }); }
      }
      c.hazardTimers.set(h, timer);
    }
  }
  function focus(game, b) {
    const c = game.companion;
    return c && (b === c.body ? c.brain.target : c.targets.get(b)) || game.player;
  }
  function draw(game) {
    const c = game.companion;
    if (!c || !c.body.alive() || !game.player.alive() || game.mode !== 'play' || game.loading > 0) { hide(); return; }
    if (!label) {
      label = document.createElement('div'); label.id = 'companionNameplate'; label.className = 'companion-nameplate';
      const name = document.createElement('span'), bar = document.createElement('span');
      name.className = 'companion-name'; bar.className = 'companion-health'; health = document.createElement('i');
      bar.appendChild(health); label.append(name, bar); hud.root.appendChild(label);
      labelPosition = new THREE.Vector3();
    }
    label.firstChild.textContent = c.def.name;
    health.style.width = (clamp(c.body.hp / c.body.maxHp, 0, 1) * 100) + '%';
    camera.updateMatrixWorld();
    const p = c.body.rig.root.position, v = labelPosition.set(p.x, p.y + c.body.height + CONFIG.companion.nameGap, p.z).project(camera);
    label.hidden = v.z < -1 || v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1;
    label.style.left = ((v.x + 1) * innerWidth / 2) + 'px'; label.style.top = ((1 - v.y) * innerHeight / 2) + 'px';
  }
  return { definition, reset, hide, actors, update, updateEnemies, resolve, hazards, focus, draw };
})();
