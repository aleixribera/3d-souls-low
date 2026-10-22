'use strict';
const assert = require('node:assert/strict');
const { selectAdventure } = require('./browser-adventure.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
const { config: C } = require('../js/net-protocol.js');
const output = path.resolve(process.argv[2] || '.scratch/multiplayer-browser');
fs.mkdirSync(output, { recursive: true });
(async () => {
  let activityClock = 0;
  const app = createServer({ dev: true, activityNow: () => activityClock });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], pages = [], timers = new Set();
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`;
  async function player(name, delay = 0) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage(); pages.push(page);
    page.on('pageerror', e => { errors.push(e.message); console.error('BROWSER ERROR', e); });
    page.on('console', msg => { if (msg.type() === 'error') { errors.push(msg.text()); console.error(msg.text().slice(0, 250)); } });
    await page.addInitScript(name => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 }));
      localStorage.setItem('combatArena.onlineName', name);
    }, name);
    if (delay) await page.routeWebSocket('**/lobby', route => {
      const server = route.connectToServer();
      server.onMessage(message => {
        const timer = setTimeout(() => { timers.delete(timer); try { route.send(message); } catch {} }, delay);
        timers.add(timer);
      });
      route.onMessage(message => server.send(message));
    });
    await page.goto(url);
    await page.waitForFunction(() => window.__arenaReady && window.__arena.tests, { timeout: 120000 });
    await page.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await page.waitForFunction(() => __arena.multiplayer.connected, { timeout: 15000 });
    return page;
  }
  try {
    const a = await player('Aleix'), b = await player('Friend', 150);
    await a.waitForFunction(() => __arena.multiplayer.info.players.length === 2);
    await a.screenshot({ path: path.join(output, 'lobby.png') });
    assert.equal(await b.locator('#lobbyLeader').isVisible(), false, 'only leader sees controls');
    const friendId = await b.evaluate(() => __arena.multiplayer.info.self);
    const until = async test => {
      for (let n = 0; n < 150; n++) { if (test()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
      throw new Error('Timed out waiting for player activity');
    };
    activityClock = C.leaderIdle - 1;
    await b.keyboard.press('Tab');
    await until(() => app.clients.get(friendId).lastActivity === activityClock);
    activityClock = C.leaderIdle;
    await a.waitForFunction(() => __arena.multiplayer.info.self !== __arena.multiplayer.info.leader);
    await b.waitForFunction(() => __arena.multiplayer.info.self === __arena.multiplayer.info.leader);
    assert.equal(await b.locator('#lobbyLeader').isVisible(), true, 'active player receives lobby controls after timeout');
    assert.equal(await a.locator('#lobbyLeader').isVisible(), false, 'AFK leader loses lobby controls');
    const leaderId = await a.evaluate(() => __arena.multiplayer.info.self);
    await a.evaluate(() => {
      const read = gamepad.read;
      try { gamepad.read = () => ({ buttons: [], axes: [0.6, 0, 0, 0] }); gamepad.poll(CONFIG.step); }
      finally { gamepad.read = read; gamepad.release(); }
    });
    await until(() => app.clients.get(leaderId).lastActivity === activityClock);
    await b.locator('#lobbyPlayers .lobby-player').filter({ hasText: /^Aleix/ }).getByRole('button', { name: 'Make leader' }).click();
    await a.waitForFunction(() => __arena.multiplayer.info.self === __arena.multiplayer.info.leader);
    console.log('Keyboard/controller activity, five-minute AFK handoff and lobby controls on both browsers passed.');
    await selectAdventure(a, 'arena/margit');
    await a.locator('#lobbyStart').click();
    for (const p of [a, b]) await p.waitForFunction(() => __arena.multiplayer.info.ready && __arena.multiplayer.info.receivedFrames > 2 && __arena.multiplayer.info.remotes === 1, { timeout: 90000 });
    console.log('Two browsers joined Margit, including one with 150 ms delayed incoming messages.');
    await a.screenshot({ path: path.join(output, 'co-op.png') });
    // A local defensive outcome cannot be overwritten by a server snapshot.
    await b.evaluate(() => { Game.player.hp = 17; Game.player.x = -14; Game.player.z = 9; Game.setLock(null); });
    await b.waitForFunction(() => __arena.multiplayer.info.playback > 1);
    assert.equal(await b.evaluate(() => Game.player.hp), 17, 'incoming snapshots do not overwrite personal health');
    await a.evaluate(() => {
      const e = Game.duel, p = Game.player;
      p.x = e.x - 2; p.z = e.z; p.yaw = Math.PI / 2;
      const strike = makeStrike(PLAYER_DEF.moveset.attacks.light);
      p.hitbox = new Hitbox(p, PLAYER_DEF.moveset.attacks.light.box, strike);
      multiplayer.hit(e, strike); multiplayer.hit(e, strike); p.hitbox = null;
      p.x = -14; p.z = -9;
    });
    await a.waitForFunction(() => Game.duel.hp <= 3176);
    await b.waitForFunction(() => Game.duel.hp <= 3176);
    assert.equal(app.sim.inspect().Game.duel.hp, 3176, 'one shared damage application');
    // A delayed client resolves defense immediately against its displayed attack.
    const serverEnemy = app.sim.inspect().Game.duel;
    serverEnemy.beginAttack(serverEnemy.baseDef.attacks.find(a => !a.noParry && !a.rollOnly && !a.projectile));
    const serial = serverEnemy.netAttack;
    await b.waitForFunction(serial => Game.duel.netSerial === serial && Game.duel.state === ES.WINDUP, serial);
    const defense = await b.evaluate(() => {
      Game.manualClock = true;
      const p = Game.player, e = Game.duel, a = e.attack;
      p.hitbox = null; p.hp = p.maxHp; p.stamina = p.maxStamina; p.exhausted = false; p.execGrace = 0;
      p.x = e.x - 1.5; p.y = e.y; p.z = e.z; p.yaw = Math.PI / 2; e.yaw = -Math.PI / 2;
      e.state = ES.WINDUP; e.hitIndex = 0; e.stateTime = a.hits[0].startup - CONFIG.parry.lead / 2;
      p.startParry(); resolveCombat(Game);
      const parried = p.state === PS.IDLE && p.flash === 1 && p.riposte > 0 && e.hitbox === null;
      p.riposte = 0; p.stamina = p.maxStamina; p.startRoll({ has: false });
      e.netParried = null; e.state = ES.ACTIVE; e.stateTime = 0;
      e.hitbox = new Hitbox(e, a.hits[0].box || a.box, makeStrike(a));
      const at = e.hitbox.center(); p.x = at.x; p.z = at.z;
      const hp = p.hp; resolveCombat(Game);
      const dodged = p.hp === hp && e.hitbox.dodged === true;
      p.setState(PS.IDLE); resolveCombat(Game);
      const vulnerableAfterRoll = p.hp < hp;
      p.hp = 17; p.setState(PS.IDLE); p.x = -14; p.z = 9; Game.hitstop = 0;
      Game.manualClock = false;
      return { parried, dodged, vulnerableAfterRoll };
    });
    assert.deepEqual(defense, { parried: true, dodged: true, vulnerableAfterRoll: true });
    console.log('Delayed client: immediate parry, roll i-frames and damage after i-frames passed.');
    const c = await player('Late friend');
    await c.waitForFunction(() => __arena.multiplayer.info.ready && Game.duel.hp === 3176, { timeout: 90000 });
    assert.equal(app.clients.size, 3);
    await a.evaluate(() => multiplayer.show());
    await a.locator('#lobbyPlayers .lobby-player').filter({ hasText: /^Friend/ }).getByRole('button', { name: 'Make leader' }).click();
    await b.waitForFunction(() => __arena.multiplayer.info.self === __arena.multiplayer.info.leader);
    await b.evaluate(() => multiplayer.show());
    await selectAdventure(b, 'arena/varn');
    await b.locator('#lobbyStart').click();
    for (const p of [a, b, c]) await p.waitForFunction(() => __arena.multiplayer.info.ready && Game.duelId === 'varn', { timeout: 90000 });
    const aldric = app.sim.inspect().Game.duel;
    aldric.hp = 100; aldric.hitbox = null; aldric.setState('broken');
    await a.waitForFunction(() => Game.duel.state === ES.BROKEN && Game.duel.hp === 100);
    await a.evaluate(() => {
      const p = Game.player, e = Game.duel, C = CONFIG.execution;
      const d = p.radius + e.radius * C.standoff + C.gap;
      p.x = e.x + Math.sin(e.yaw) * d; p.z = e.z + Math.cos(e.yaw) * d; p.y = e.y; p.yaw = e.yaw + Math.PI;
      p.hp = p.maxHp; p.setState(PS.IDLE); p.kx = p.kz = p.vx = p.vz = 0;
      window.__coopPhaseStates = [];
      events.on('bossPhase', () => window.__coopPhaseStates.push(Game.player.state));
      execution.start(p, e);
    });
    await a.waitForFunction(() => Game.player.state === PS.EXECUTE);
    assert.equal(await a.evaluate(() => Game.player.invulnerable()), true, 'reserved online execution is invulnerable');
    await a.waitForFunction(() => Game.player.state !== PS.EXECUTE && Game.duel.phase === 1, { timeout: 15000 });
    assert.ok(!(await a.evaluate(() => window.__coopPhaseStates)).includes('execute'), 'boss transitions wait for the local execution to finish');
    console.log('Online execution: server reservation, local invulnerability and deferred boss phase passed.');
    await b.evaluate(() => multiplayer.show());
    await selectAdventure(b, 'level/long-hall');
    await b.locator('#lobbyStart').click();
    for (const p of [a, b, c]) await p.waitForFunction(() => __arena.multiplayer.info.ready && Game.level.id === 'long-hall', { timeout: 90000 });
    const killZone = id => {
      const zone = app.sim.inspect().Game.zones.find(z => z.id === id);
      for (const e of zone.actors) { e.hp = 0; e.die(); }
    };
    killZone('zone-hollow');
    for (const p of [a, b, c]) await p.waitForFunction(() => {
      const g = world.gates.find(g => g.id === 'zone-hollow');
      return g.open && g.lift === 1 && g.mesh.position.y > g.y;
    });
    assert.equal(app.sim.inspect().world.gates.find(g => g.id === 'zone-hollow').open, true);
    await a.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    await a.waitForFunction(() => Game.player.alive(), { timeout: 20000 });
    assert.equal(await b.evaluate(() => Game.player.alive()), true);
    await b.evaluate(() => multiplayer.show());
    await selectAdventure(b, 'level/burning-town');
    await b.locator('#lobbyStart').click();
    for (const p of [a, b, c]) await p.waitForFunction(() => __arena.multiplayer.info.ready && Game.level.id === 'burning-town', { timeout: 90000 });
    killZone('zone-lower-gate');
    for (const p of [a, b, c]) await p.waitForFunction(() => {
      const g = world.gates.find(g => g.id === 'zone-lower-gate');
      return g.open && g.lift === 1 && !g.mesh.visible && Math.abs(g.mesh.rotation.z) > 0.5;
    });
    await a.evaluate(() => {
      const g = world.gates.find(g => g.id === 'fountain-shortcut');
      Game.player.x = 6; Game.player.y = g.y; Game.player.z = 50; Game.player.vy = 0; Game.player.hp = Game.player.maxHp;
    });
    for (const p of [a, b, c]) await p.waitForFunction(() => {
      const g = world.gates.find(g => g.id === 'fountain-shortcut');
      return g.open && g.lift === 1 && g.mesh.position.y > g.y;
    });
    await c.evaluate(() => multiplayer.leave());
    await c.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await c.waitForFunction(() => {
      if (!__arena.multiplayer.info.ready || Game.level.id !== 'burning-town') return false;
      const g = world.gates.find(g => g.id === 'zone-lower-gate');
      return g.open && g.lift === 1 && !g.mesh.visible;
    }, null, { timeout: 90000 });
    console.log('All three clients: portcullis rises, barricade falls/disappears, shortcut opens and late join preserves open gates.');
    await c.evaluate(() => multiplayer.leave());
    await b.waitForFunction(() => __arena.multiplayer.info.players.length === 2);
    await b.evaluate(() => multiplayer.show());
    await b.locator('#lobbyReturn').click();
    await a.waitForFunction(() => !__arena.multiplayer.active() && __arena.multiplayer.connected);
    console.log('Shared damage, personal health, late join, leader transfer, level switch, individual death and leave passed.');
    for (const p of [a, b]) await p.evaluate(() => multiplayer.leave());
    assert.equal(errors.length, 0, JSON.stringify(errors));
    if (process.env.ARENA_COOP_ONLY) return;
    for (const p of pages) await p.context().close();
    const soloContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const soloPage = await soloContext.newPage();
    soloPage.on('pageerror', e => errors.push(e.message));
    await soloPage.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 })));
    await soloPage.goto(url);
    await soloPage.waitForFunction(() => window.__arenaReady && window.__arena.tests, { timeout: 120000 });
    const solo = await soloPage.evaluate(async () => { Game.manualClock = true; return await __arena.tests.run(); });
    fs.writeFileSync(path.join(output, 'suite.json'), JSON.stringify({ solo, errors }, null, 2));
    console.log(solo.summary);
    assert.equal(errors.length, 0, JSON.stringify(errors));
    if (solo?.failed?.length) throw new Error(`${solo.failed.join('; ')} solo tests failed`);
  } finally {
    for (const timer of timers) clearTimeout(timer);
    await browser.close(); await app.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
