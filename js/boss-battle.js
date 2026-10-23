'use strict';
// Local spectator matches. Each fighter remains an ordinary Enemy with its original moves and phases.
const bossBattle = {
  teams: { a: [], b: [] }, serial: 0, picking: 'a', match: null,
  winner: null, wonTime: 0, groups: new Map(), hudRows: [],
  catalog() { return [...ENEMY_DEFS.filter(isBossDef), ...ELDEN_BOSS_DEFS]; },
  team(id) { return BOSS_TEAMS.find(t => t.id === id); },
  valid(teams) {
    const ids = new Set(this.catalog().map(d => d.id));
    return BOSS_TEAMS.every(t => Array.isArray(teams[t.id]) && teams[t.id].length > 0 &&
      teams[t.id].length <= CONFIG.bossBattle.maxTeam && teams[t.id].every(s => s && typeof s.id === 'string' && ids.has(s.enemy)));
  },
  add(team, enemy) {
    if (!this.team(team) || this.teams[team].length >= CONFIG.bossBattle.maxTeam || !this.catalog().some(d => d.id === enemy)) return false;
    this.teams[team].push({ id: `fighter-${++this.serial}`, enemy });
    return true;
  },
  screens(game) {
    const max = CONFIG.bossBattle.maxTeam, ready = this.valid(this.teams);
    const items = BOSS_TEAMS.flatMap(t => [
      { name: `${t.name} · ${this.teams[t.id].length} / ${max}`, team: t.id, row: '1', disabled: true,
        desc: 'Choose bosses below. Select a boss in your team to remove it.' },
      { name: '+ Add boss', label: `Add boss to ${t.name}`, team: t.id, row: '2', disabled: this.teams[t.id].length >= max,
        desc: this.teams[t.id].length >= max ? `${t.name} is full. Remove a boss to add another.` : `Choose any boss for ${t.name}. Multiple copies are allowed.`,
        go: () => { this.picking = t.id; game.showMenu('bossBattlePick'); } },
      ...this.teams[t.id].map((s, i) => ({ name: `${ENEMY_BY_ID[s.enemy].name}  ×`, label: `Remove ${ENEMY_BY_ID[s.enemy].name} from ${t.name}`,
        team: t.id, row: String(i + 3), desc: `Remove this boss from ${t.name}.`, go: () => {
          this.teams[t.id] = this.teams[t.id].filter(x => x.id !== s.id); game.showMenu('bossBattle', true);
        } })),
    ]);
    return {
      bossBattle: { title: 'BOSS VS BOSS', sub: 'TWO TEAMS · UP TO SIX BOSSES EACH', back: 'arena', items: [
        ...items,
        { name: 'Start battle', row: String(max + 3), disabled: !ready, desc: ready ? 'Watch the two teams fight to the last boss.' : 'Add at least one boss to each team to start.',
          go: () => game.loadingFirst('Boss vs Boss', 'Two teams. Last team standing wins.', () => this.start(game)) },
        { name: 'Back', row: String(max + 4), desc: '', cue: 'menuBack', go: () => game.showMenu('arena') },
      ] },
      bossBattlePick: { title: 'ADD A BOSS', sub: `${this.team(this.picking).name.toUpperCase()} · ${this.teams[this.picking].length} / ${max}`, back: 'bossBattle',
        items: [...this.catalog().map(d => ({ name: d.name, desc: d.description, go: () => {
          this.add(this.picking, d.id); game.showMenu('bossBattle');
        } })), { name: 'Back', desc: '', cue: 'menuBack', go: () => game.showMenu('bossBattle') }] },
      bossBattleWon: { title: this.winner === 'draw' ? 'DRAW' : `${this.team(this.winner)?.name.toUpperCase() || 'TEAM'} WINS`,
        sub: 'BOSS VS BOSS', overlay: true, items: [
          { name: 'Rematch', desc: 'Replay this match with the same teams.', go: () => game.loadingFirst('Boss vs Boss', 'Rematch', () => { game.enterPlay(); game.reset(); game.showLoading('Boss vs Boss', 'Rematch'); }) },
          { name: 'Edit teams', desc: 'Change bosses on either team.', go: () => game.showMenu('bossBattle') },
          { name: 'Arena menu', desc: '', cue: 'menuBack', go: () => game.showMenu('arena') },
        ] },
    };
  },
  start(game) {
    if (!this.valid(this.teams)) return false;
    this.match = Object.fromEntries(BOSS_TEAMS.map(t => [t.id, this.teams[t.id].map(s => ({ ...s }))]));
    game.kind = 'bossBattle'; game.story = false; game.eldenBoss = null; game.duelId = null; game.duelPartners = [];
    game.level = BOSS_BATTLE_ARENA;
    game.enterPlay(); game.reset(); game.showLoading('Boss vs Boss', 'Two teams. Last team standing wins.');
    return true;
  },
  reset() { this.winner = null; this.wonTime = 0; this.groups.clear(); this.hudRows = []; },
  spawn(game) {
    if (!this.match || !this.valid(this.match)) throw new Error('Boss battle: each team needs 1–6 valid bosses.');
    const C = CONFIG.bossBattle;
    return BOSS_TEAMS.flatMap(t => {
      const slots = this.match[t.id], gap = Math.min(C.spacing, C.rowWidth / Math.max(1, slots.length - 1));
      return slots.map((s, i) => {
        const e = new Enemy(ENEMY_BY_ID[s.enemy], { x: t.side * C.startX, y: 0, z: (i - (slots.length - 1) / 2) * gap,
          yaw: -t.side * Math.PI / 2, behavior: 'arena', notice: C.notice, wide: true, key: s.id });
        e.team = t.id; e.battleTarget = null;
        return e;
      });
    });
  },
  opponents(game, actor) { return game.enemies.filter(e => e !== actor && e.team !== actor.team && e.alive()); },
  target(game, e) {
    // Keep an opponent through an attack, then retarget when it dies. The spectator is never a threat.
    if (e.battleTarget?.alive()) return e.battleTarget;
    return this.opponents(game, e).sort((a, b) => Math.hypot(e.x - a.x, e.z - a.z) - Math.hypot(e.x - b.x, e.z - b.z))[0] || null;
  },
  update(game, dt) {
    const c = game.cam;
    game.player.savePrev(); for (const e of game.enemies) e.savePrev();
    c.prevPos.copy(c.pos); c.prevLook.copy(c.look);
    game.restartArm = Math.max(0, game.restartArm - dt);
    if (game.hitstop > 0) { game.hitstop = Math.max(0, game.hitstop - dt); input.hold(dt); return; }
    input.hold(dt); input.pressed.clear();
    if (!this.winner) {
      const groups = new Map();
      for (const e of game.enemies) {
        e.battleTarget = this.target(game, e);
        if (!e.alive() || !e.battleTarget) continue;
        const target = e.battleTarget;
        if (!groups.has(target)) groups.set(target, []);
        groups.get(target).push(e);
      }
      // Crowd pacing and surrounding slots are local to each actual opponent.
      for (const key of this.groups.keys()) if (!groups.has(key)) this.groups.delete(key);
      for (const [target, fighters] of groups) {
        crowd.enemies = fighters; crowd.sinceStart = (this.groups.get(target) ?? Infinity) + dt;
        crowd.spread(target);
        for (const e of fighters) e.update(dt, target);
        this.groups.set(target, crowd.sinceStart);
      }
      for (const e of game.enemies) if (!e.alive()) e.update(dt, e.battleTarget || e);
      for (let i = 0; i < game.enemies.length; i++) for (let j = i + 1; j < game.enemies.length; j++) separatePair(game.enemies[i], game.enemies[j], 0.5);
      resolveTeamCombat(game);
      projectiles.update(game, dt);
      for (const e of game.enemies) if (!e.alive() && !e.rewarded) { e.rewarded = true; events.emit('enemyDeath', { enemy: e }); }
      const standing = BOSS_TEAMS.filter(t => game.enemies.some(e => e.team === t.id && e.alive()));
      if (standing.length < BOSS_TEAMS.length) {
        this.winner = standing[0]?.id || 'draw'; game.complete = true; projectiles.clear();
        for (const e of game.enemies) { e.hitbox = null; e.vx = e.vz = 0; }
        events.emit('bossBattleWon', { team: this.winner });
      }
    } else {
      this.wonTime += dt;
      for (const e of game.enemies) if (!e.alive()) e.update(dt, e.battleTarget || e);
      if (this.wonTime >= CONFIG.bossBattle.victoryTime) game.showMenu('bossBattleWon');
    }
    this.updateCamera(game, dt, false);
  },
  updateCamera(game, dt, snap) {
    const C = CONFIG.bossBattle.camera, c = game.cam, live = game.enemies.filter(e => e.alive());
    const bodies = live.length ? live : game.enemies;
    const xs = bodies.map(e => e.x), zs = bodies.map(e => e.z);
    const x0 = Math.min(0, ...xs), x1 = Math.max(0, ...xs), z0 = Math.min(0, ...zs), z1 = Math.max(0, ...zs);
    const radius = Math.hypot((x1 - x0) / 2, (z1 - z0) / 2) + Math.max(C.margin, ...bodies.map(e => e.height));
    const fov = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
    const distance = Math.max(C.minDistance, radius / Math.sin(fov));
    const k = snap ? 1 : 1 - Math.exp(-C.rate * dt), norm = Math.hypot(1, C.elevation);
    const look = new THREE.Vector3((x0 + x1) / 2, C.lookHeight, (z0 + z1) / 2);
    c.look.lerp(look, k);
    c.pos.lerp(new THREE.Vector3(look.x, look.y + distance * C.elevation / norm, look.z + distance / norm), k);
    if (snap) { c.prevPos.copy(c.pos); c.prevLook.copy(c.look); }
  },
  drawHud(game) {
    let root = $('bossBattleHud');
    if (!root) { root = document.createElement('div'); root.id = 'bossBattleHud'; hud.root.appendChild(root); }
    if (!this.hudRows.length) {
      root.textContent = '';
      for (const t of BOSS_TEAMS) {
        const section = document.createElement('section'); section.style.setProperty('--team-color', t.color);
        const title = document.createElement('h2'); title.textContent = t.name; section.appendChild(title);
        for (const e of game.enemies.filter(e => e.team === t.id)) {
          const row = document.createElement('div'); row.className = 'battle-health';
          const name = document.createElement('span'), track = document.createElement('div'), fill = document.createElement('div');
          track.className = 'battle-health-track'; track.appendChild(fill); row.append(name, track); section.appendChild(row);
          this.hudRows.push({ e, row, name, fill });
        }
        root.appendChild(section);
      }
      const hint = document.createElement('div'); hint.className = 'battle-hint'; root.appendChild(hint);
    }
    for (const { e, row, name, fill } of this.hudRows) {
      name.textContent = e.def.name + (!e.alive() ? ' · Defeated' : e.state === ES.PHASE ? ' · Next phase' : '');
      fill.style.width = `${clamp(e.hp / e.def.hp, 0, 1) * 100}%`; row.classList.toggle('defeated', !e.alive());
    }
    root.querySelector('.battle-hint').textContent = this.winner ? this.winner === 'draw' ? 'Draw' : `${this.team(this.winner).name} wins` :
      `${systemLabel('pause')} · Pause / edit teams   ·   ${systemLabel('restart')} ${game.restartArm > 0 ? 'again ' : 'twice '}· Rematch`;
  },
};
