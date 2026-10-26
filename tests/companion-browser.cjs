'use strict';
// A real local Player companion throughout the eight solo Lands levels, in Story and Levels.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.stack));
    page.on('console', m => { if (m.type() === 'warning' && /Ultra boss effect|failed/i.test(m.text())) errors.push(m.text()); });
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    const chapters = await page.evaluate(() => {
      Game.manualClock = true; story.use('lands'); story.newGame(false);
      const result = []; let old = null;
      for (const ch of story.active.def.chapters) {
        Game.startLevel(ch.level); Game.loading = 0; $('loading').classList.remove('show');
        const c = Game.companion; Game.render(1, CONFIG.step);
        result.push({ level: ch.level, name: c.def.name, count: Game.allies().length,
          player: c.body instanceof Player, hands: c.body.ctl === c.brain.hands && c.body.ctl !== input,
          resources: c.body.hp === c.body.maxHp && c.body.stamina === c.body.maxStamina,
          removed: !old || !old.parent, present: c.body.rig.root.parent === scene });
        old = c.body.rig.root;
      }
      return result;
    });
    assert.equal(chapters.length, 8);
    for (const c of chapters) { assert.equal(c.name, 'Finn'); assert.equal(c.count, 2);
      for (const k of ['player', 'hands', 'resources', 'removed', 'present']) assert.ok(c[k], c.level + '/' + k); }
    console.log('All eight chapters: one Finn, separate inputs/resources, real Player rigs and clean chapter replacement.');

    const levels = await page.evaluate(() => {
      Game.story = false; story.use('ashmere');
      const saves = STORIES.map(c => localStorage.getItem(CONFIG.story.saveKeys[c.id]));
      return STORIES.find(c => c.id === 'lands').chapters.map(ch => {
        const old = Game.companion && Game.companion.body.rig.root;
        Game.startLevel(ch.level); Game.loading = 0;
        const c = Game.companion;
        return { level: ch.level, joins: c && c.def.name === 'Finn' && Game.allies().length === 2,
          clean: !old || !old.parent, campaign: !Game.story && story.active.def.id === 'ashmere',
          saves: STORIES.every((c, i) => localStorage.getItem(CONFIG.story.saveKeys[c.id]) === saves[i]) };
      });
    });
    for (const l of levels) for (const k of ['joins', 'clean', 'campaign', 'saves']) assert.ok(l[k], l.level + '/' + k);
    console.log('All eight standalone Lands levels include Finn independently of the active Story, without changing saves.');

    const mechanics = await page.evaluate(() => {
      const dt = CONFIG.step, nextLevelId = Game.nextLevelId;
      const fresh = () => {
        story.use('lands'); Game.story = true; Game.startLevel('stormhill'); Game.loading = 0; $('loading').classList.remove('show'); input.clear();
        for (const e of Game.enemies) e.rig.dispose(); Game.enemies = []; for (const z of Game.zones) { z.actors = []; z.beaten = false; } Game.nextLevelId = () => null;
        for (const g of world.gates) g.open = true;
        return Game.companion;
      };
      const at = (p, x, y, z) => { p.x = x; p.y = p.peak = y; p.z = z; p.vx = p.vy = p.vz = p.kx = p.kz = 0; p.setState(PS.IDLE); p.execGrace = 0; p.savePrev(); };
      const enemy = (id, x, z) => new Enemy(ENEMY_BY_ID[id], { x, y: 0, z, yaw: -Math.PI / 2, behavior: 'arena', notice: 100 });
      let c = fresh(); at(Game.player, 17, 0, 0);
      let maxStep = 0; const startX = c.body.x;
      for (let i = 0; i < 360; i++) { const x = c.body.x, z = c.body.z; Game.update(dt); maxStep = Math.max(maxStep, Math.hypot(c.body.x - x, c.body.z - z)); }
      const follows = c.body.x > startX + 8 && Math.hypot(c.body.x - Game.player.x, c.body.z - Game.player.z) < 2.6 && maxStep < 0.16;
      at(Game.player, 5, 0, 0); at(c.body, 34, 0, 0);
      let e = enemy('hollow', 36, 0); e.chooseAttack = e.react = () => null; Game.enemies = [e]; const hp = e.hp;
      for (let i = 0; i < 900 && e.hp === hp; i++) { Game.hitstop = 0; Game.update(dt); }
      const fights = e.hp < hp && c.targets.get(e) === c.body && Game.player.hp === Game.player.maxHp;

      c = fresh(); at(Game.player, 42, 0, 0); at(c.body, 43, 0, 0); e = enemy('hollow', 41, 0); Game.enemies = [e];
      const strike = makeStrike(e.def.attacks[0]), big = { w: 12, h: 8, d: 12, y: 2, fwd: 0 };
      e.hitbox = new Hitbox(e, big, strike); const ph = Game.player.hp, ch = c.body.hp;
      resolveCombat(Game); companions.resolve(Game);
      const melee = Game.player.hp < ph && c.body.hp < ch; const onceP = Game.player.hp, onceC = c.body.hp;
      resolveCombat(Game); companions.resolve(Game); const single = Game.player.hp === onceP && c.body.hp === onceC;
      e.hitbox = null; Game.player.hitbox = new Hitbox(Game.player, big, makeStrike(PLAYER_DEF.moveset.attacks.light));
      c.body.hitbox = new Hitbox(c.body, big, makeStrike(PLAYER_DEF.moveset.attacks.light));
      resolveCombat(Game); companions.resolve(Game); const friendly = Game.player.hp === onceP && c.body.hp === onceC;

      c = fresh(); at(Game.player, 43, 0, 0); at(c.body, 38, 0, 0); e = enemy('bowman', 34, 0); e.yaw = Math.PI / 2;
      const shot = e.def.attacks.find(a => a.projectile); projectiles.fire(e, shot, Game.player);
      for (let i = 0; i < 90; i++) projectiles.update(Game, dt);
      const bolt = c.body.hp < c.body.maxHp && Game.player.hp === Game.player.maxHp;
      c.body.hp = c.body.maxHp; c.body.setState(PS.ROLL); c.body.stateTime = 0;
      const arrow = projectiles.fire(e, shot, Game.player);
      for (let i = 0; i < 90; i++) projectiles.update(Game, dt);
      const boltRoll = c.body.hp === c.body.maxHp && Game.player.hp < Game.player.maxHp && arrow.passed.has(c.body);

      c = fresh(); c.body.hp = 30; const playerFlasks = Game.player.item('flask').count; c.body.useItem('flask');
      for (let i = 0; i < 100; i++) { Game.hitstop = 0; Game.update(dt); }
      const flask = c.body.hp > 60 && c.body.item('flask').count === 3 && Game.player.item('flask').count === playerFlasks;
      hud.deniedTimer = hud.refundTimer = 0; events.emit('staminaDenied', { player: c.body }); events.emit('parry', { target: e, player: c.body });
      const ownHud = hud.deniedTimer === 0 && hud.refundTimer === 0;

      c = fresh(); at(Game.player, 5, 0, 0); at(c.body, 34, 0, 0);
      e = enemy('malenia', 35, 0); e.hp = 1; e.setState(ES.BROKEN); Game.enemies = [e];
      const phase = e.phase; execution.start(c.body, e); let heldPhase = true, sawImpact = false;
      for (let i = 0; i < 360 && c.body.exec; i++) {
        Game.hitstop = 0; Game.update(dt);
        if (c.body.exec && c.body.exec.impact) { sawImpact = true; heldPhase &&= e.state === ES.EXECUTED && e.hp === 1 && e.phase === phase; }
      }
      const critical = sawImpact && heldPhase && !c.body.exec && e.alive() && e.phase !== phase && Game.player.alive();
      c = fresh(); at(Game.player, 5, 0, 0); at(c.body, 34, 0, 0);
      e = enemy('margit', 35, 0);
      const threshold = e.baseDef.phases[e.phaseIds[e.phase + 1]].at; e.hp = e.def.hp * threshold + 1;
      e.setState(ES.BROKEN); Game.enemies = [e]; const midPhase = e.phase;
      execution.start(c.body, e); let heldMid = true, midImpact = false;
      for (let i = 0; i < 360 && c.body.exec; i++) {
        Game.hitstop = 0; Game.update(dt);
        if (c.body.exec && c.body.exec.impact) { midImpact = true; heldMid &&= e.state === ES.EXECUTED && e.phase === midPhase; }
      }
      const midCritical = midImpact && heldMid && e.alive() && e.phase !== midPhase && !c.body.exec;
      c = fresh();
      const dead = c.body; dead.hp = 0; dead.setState(PS.DEAD);
      for (let i = 0; i < Math.floor(CONFIG.companion.respawnDelay / dt) - 1; i++) Game.update(dt);
      const mortal = c.body === dead && !dead.alive() && Game.player.alive();
      Game.update(dt); Game.update(dt);
      c = Game.companion;
      const respawn = c.body !== dead && c.body.alive() && !dead.rig.root.parent && c.deadFor === 0 &&
        c.body.hp === c.body.maxHp && c.body.item('flask').count === c.body.item('flask').max &&
        Math.hypot(c.body.x - Game.spawn.x, c.body.z - Game.spawn.z) < 2 && Game.player.alive();
      const returned = c.body; returned.hp = 0; returned.setState(PS.DEAD); Game.update(dt);
      const b = world.bonfires[0]; at(Game.player, b.x, world.floorY(b.x, b.z, b.y), b.z); Game.tryRest();
      c = Game.companion;
      const rest = c.body !== returned && c.body.alive() && c.body.hp === c.body.maxHp && c.deadFor === 0 && !returned.rig.root.parent;
      const saved = { ...Game.spawn }, beforeDeath = c.body;
      Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); Game.deathTimer = CONFIG.death.respawnDelay; Game.update(dt);
      const death = Game.companion.body !== beforeDeath && Game.companion.body.alive() && Game.player.alive() &&
        Math.hypot(Game.companion.body.x - Game.player.x, Game.companion.body.z - Game.player.z) < 2;
      story.quit(); Game.render(1, dt);
      const quit = Game.mode === 'menu' && (!document.getElementById('companionNameplate') || document.getElementById('companionNameplate').hidden);
      story.use('lands'); story.resume();
      const resume = !!Game.companion && Game.allies().length === 2 && Game.player.x === saved.x && Game.player.z === saved.z;
      Game.nextLevelId = nextLevelId;
      for (const z of Game.zones) z.gate.open = true; Game.nextTimer = CONFIG.nextLevel.delay + CONFIG.nextLevel.fadeTime; Game.updateLevel(dt);
      const next = Game.level.id === 'stormveil' && Game.companion.def.name === 'Finn' && Game.allies().length === 2;
      return { follows, fights, melee, single, friendly, bolt, boltRoll, flask, ownHud, critical, midCritical, mortal, respawn, rest, death, quit, resume, next };
    });
    for (const [key, value] of Object.entries(mechanics)) assert.ok(value, key);
    console.log('Following, actual combat, damage, friendly safety, projectiles/rolls, flasks, own HUD, mortality, rest/death/Continue and automatic progression passed.');

    const fog = await page.evaluate(() => {
      Game.story = true; Game.startLevel('stormhill'); Game.loading = 0; input.clear();
      const c = Game.companion, zone = Game.zones.find(z => z.id === 'zone-margit'), boss = zone.actors[0];
      for (const e of Game.enemies) if (e !== boss) e.rig.dispose(); Game.enemies = [boss]; boss.update = () => {};
      Game.zones = [zone]; const gate = world.gates.find(g => g.id === 'margit-fog'); gate.open = false;
      Object.assign(Game.player, { x: 250, y: 8, z: 0 }); Game.player.savePrev();
      Object.assign(c.body, { x: 236, y: 8, z: 0 }); c.body.savePrev(); let stayedClosed = true;
      for (let i = 0; i < 360; i++) { Game.update(CONFIG.step); stayedClosed &&= !gate.open; }
      return { joined: c.body.x > 241, stayedClosed };
    });
    assert.ok(fog.joined && fog.stayedClosed, JSON.stringify(fog));

    const environment = await page.evaluate(() => {
      Game.startLevel('haligtree'); Game.loading = 0; const c = Game.companion;
      Object.assign(c.body, { x: 125, y: 0, z: -55, grounded: true });
      for (let i = 0; i < 60; i++) Game.updateLevel(CONFIG.step);
      const rot = c.body.hp < c.body.maxHp && Game.player.hp === Game.player.maxHp;
      Game.startLevel('ashen-capital'); const friend = Game.companion.body; Object.assign(friend, { x: 72, y: 0, z: 0, grounded: true });
      Game.updateLevel(CONFIG.step); const trap = world.traps[0].state === 'warning';
      return { rot, trap };
    });
    assert.ok(environment.rot && environment.trap, 'Finn takes rot damage and can trigger physical traps');
    const negative = await page.evaluate(() => {
      story.use('ashmere'); story.newGame(false); const ash = !Game.companion;
      story.use('lands'); story.newGame(true); const tutorial = !Game.companion; story.afterTutorial(); const afterTutorial = !!Game.companion;
      Game.story = false; Game.startLevel('stormhill'); const level = !!Game.companion;
      const c = Game.companion, old = c.body; old.hp = 0; old.setState(PS.DEAD);
      Game.loading = 0;
      for (let i = 0; i < Math.ceil(CONFIG.companion.respawnDelay / CONFIG.step) + 2; i++) { Game.hitstop = 0; Game.update(CONFIG.step); }
      const respawn = Game.companion.body !== old && Game.companion.body.alive() && !old.rig.root.parent;
      Game.startLevel(STORY.chapters[0].level); const standaloneAsh = !Game.companion;
      Game.startFight('margit'); const arena = !Game.companion;
      return { ash, tutorial, afterTutorial, level, respawn, standaloneAsh, arena };
    });
    for (const [key, value] of Object.entries(negative)) assert.ok(value, key);
    await page.evaluate(() => multiplayer.join());
    await page.waitForFunction(() => multiplayer.connected);
    assert.ok(await page.evaluate(() => { Game.story = true; Game.startLevel('stormhill'); const absent = !Game.companion; multiplayer.leave(); return absent; }), 'connected games never spawn a local companion');
    console.log('Boss fog entry, standalone respawn and exclusion from Ashmere, training, duels and online play passed.');

    for (const quality of ['low', 'high', 'ultra']) {
      await page.evaluate(quality => {
        Game.story = true; story.use('lands'); Game.startLevel('stormhill'); Game.loading = 0; $('loading').classList.remove('show');
        visuals.setQuality(quality); const c = Game.companion;
        c.body.startAttack(PLAYER_DEF.moveset.attacks.light, { x: 1, z: 0, has: true }, null, []);
        for (let i = 0; i < 30; i++) { c.body.update(CONFIG.step, { x: 0, z: 0, has: false }, [], null); Game.render(1, CONFIG.step); }
      }, quality);
    }
    await page.screenshot({ path: '.scratch/finn-companion.png' });
    const ending = await page.evaluate(() => {
      Game.startLevel('haligtree'); Game.loading = 0;
      const boss = Game.enemies.find(e => e.boss); finale.state.ending = { boss, stage: 4, t: CONFIG.finale.death.overlay };
      finale.update(Game, CONFIG.step);
      const credited = document.getElementById('ending').textContent.includes('Finn'); finale.cancelEnding(); return credited;
    });
    assert.ok(ending, 'solo ending credits name Finn');
    assert.deepEqual(errors, [], 'no browser/effect errors');
    console.log('Low/High/Ultra companion rendering and Finn ending credit passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
