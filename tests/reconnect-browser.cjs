'use strict';
const assert = require('node:assert/strict');
const { selectAdventure } = require('./browser-adventure.cjs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
const { config: C } = require('../js/net-protocol.js');
(async () => {
  const app = createServer({ dev: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], suspended = new WeakSet();
  const url = 'http://127.0.0.1:' + app.server.address().port + '/combat-arena-3d.html#dev';
  async function player(name) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
    const page = await context.newPage();
    await page.routeWebSocket('**/lobby', route => {
      const server = route.connectToServer();
      route.onMessage(message => { if (!suspended.has(page)) server.send(message); });
      server.onMessage(message => route.send(message));
    });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(name => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 }));
      if (!localStorage.getItem('combatArena.onlineName')) localStorage.setItem('combatArena.onlineName', name);
    }, name);
    await page.goto(url);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await page.waitForFunction(() => multiplayer.connected);
    return page;
  }
  async function ready(page) {
    await page.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && multiplayer.info.receivedFrames > 2,
      null, { timeout: 90000 });
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const save = page => page.evaluate(() => {
    const p = Game.player; input.clear(); Game.setLock(null); Game.retarget = false;
    p.x = Game.spawn.x + 1; p.z = Game.spawn.z; p.y = world.floorY(p.x, p.z, Game.spawn.y); p.yaw = 0.7;
    p.vx = p.vy = p.vz = 0; p.grounded = true; p.setState(PS.IDLE); p.savePrev();
    p.hp = 61; p.stamina = 37; p.staminaDelay = 100; p.item('flask').count = 1;
    document.getElementById('lobbyName').value = 'Remembered knight';
    document.getElementById('lobbyName').onchange();
    return { x: p.x, y: p.y, z: p.z, hp: p.hp, stamina: p.stamina, flasks: p.item('flask').count };
  });
  const assertSaved = async (page, saved) => {
    const current = await page.evaluate(() => {
      const p = Game.player;
      return { x: p.x, y: p.y, z: p.z, hp: p.hp, stamina: p.stamina, flasks: p.item('flask').count };
    });
    for (const [key, value] of Object.entries(saved)) assert.ok(Math.abs(current[key] - value) < 0.05, key + ' is recovered: ' + current[key] + '/' + value);
    assert.equal(await page.locator('#lobbyName').inputValue(), 'Remembered knight');
  };
  try {
    const a = await player('Leader');
    await selectAdventure(a, 'level/long-hall'); await a.locator('#lobbyStart').click(); await ready(a);
    const epoch = app.session.epoch, oldId = await a.evaluate(() => multiplayer.info.self);
    const zone = app.sim.inspect().Game.zones.find(z => z.id === 'zone-hollow');
    for (const e of zone.actors) { e.hp = 0; e.die(); }
    await a.waitForFunction(id => world.gates.find(g => g.id === id).open, zone.id);

    // Reproduce a lone leader's suspended tab, followed by a new active joiner.
    const devtools = await a.context().newCDPSession(a);
    // Some headless browser activations thaw a page; also suppress its outgoing stream to keep this fixture suspended.
    suspended.add(a); await devtools.send('Page.setWebLifecycleState', { state: 'frozen' });
    const frozenAt = app.sim.state.time;
    await wait((C.stalePlayer + 0.2) * 1000);
    assert.ok(app.sim.state.time > frozenAt + 2, 'the only frozen browser cannot stop the server clock');
    const b = await player('Friend'); await ready(b);
    await b.waitForFunction(() => multiplayer.info.self === multiplayer.info.leader);
    assert.equal(await b.locator('#lobbyLeader').count(), 1);
    assert.equal(app.session.epoch, epoch, 'a new leader enters the existing run');
    suspended.delete(a); await devtools.send('Page.setWebLifecycleState', { state: 'active' }); await ready(a);
    assert.equal(await a.evaluate(() => multiplayer.info.self), oldId, 'thaw/recovery retains identity');
    const saved = await save(a);
    await a.waitForTimeout(150);
    assert.equal(app.clients.get(oldId).pose.flasks, 1);

    // A transport failure restores personal state once, rather than creating a full-health character.
    app.clients.get(oldId).ws.terminate();
    await a.waitForFunction(() => !multiplayer.connected);
    await ready(a); assert.equal(await a.evaluate(() => multiplayer.info.self), oldId);
    await assertSaved(a, saved);
    assert.equal(app.session.epoch, epoch);
    assert.ok(await a.evaluate(id => world.gates.find(g => g.id === id).open, zone.id));

    // A hard reload uses the private persisted credential too.
    await a.reload(); await a.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await a.getByRole('button', { name: 'Join public lobby', exact: false }).click(); await ready(a);
    assert.equal(await a.evaluate(() => multiplayer.info.self), oldId); await assertSaved(a, saved);

    // Recover a title/menu fallback without a refill, and retry repeated transport failures.
    await a.evaluate(() => Game.showMenu('main')); await ready(a);
    await a.waitForFunction(() => Game.mode === 'play'); await assertSaved(a, saved);
    await b.route('**/api/lobby', route => route.abort());
    const friendId = await b.evaluate(() => multiplayer.info.self);
    app.clients.get(friendId).ws.terminate(); await b.waitForFunction(() => !multiplayer.connected);
    await wait(3500); await b.unroute('**/api/lobby'); await ready(b);
    assert.equal(await b.evaluate(() => multiplayer.info.self), friendId);

    // Deliberate leave/removal cancels retries but keeps the run and saved resources.
    await a.evaluate(() => { Game.player.stamina = 23; Game.player.staminaDelay = 100; Game.player.item('flask').count = 0; multiplayer.leave(); });
    app.clients.get(friendId).ws.close(1008, 'Removed by the lobby leader.');
    await b.waitForFunction(() => !multiplayer.connected); await wait(1200);
    assert.equal(app.clients.size, 0); assert.equal(app.session.epoch, epoch);
    const emptyAt = app.sim.state.time; await wait(250);
    assert.ok(app.sim.state.time > emptyAt + 0.1, 'the empty lobby keeps simulating');
    await a.bringToFront(); await a.evaluate(() => multiplayer.join()); await ready(a);
    assert.equal(await a.evaluate(() => multiplayer.info.self), oldId);
    await assertSaved(a, { ...saved, stamina: 23, flasks: 0 });
    assert.equal(app.session.epoch, epoch);
    assert.deepEqual(errors, []);
    console.log('Browsers: lone frozen leader/new active joiner, live empty run, same identity/name/resources across transport loss, reload, menu recovery and explicit leave; retries and removal passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
