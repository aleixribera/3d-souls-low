'use strict';
const assert = require('node:assert/strict');
const { selectAdventure } = require('./browser-adventure.cjs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
const { config: C } = require('../js/net-protocol.js');
(async () => {
  let lobbyClock = 0;
  const app = createServer({ dev: true, lobbyNow: () => lobbyClock });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const url = 'http://127.0.0.1:' + app.server.address().port + '/combat-arena-3d.html#dev';
  async function player(name) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(name => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 }));
      localStorage.setItem('combatArena.onlineName', name);
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
  try {
    const a = await player('Leader'), b = await player('Friend');
    await selectAdventure(a, 'level/long-hall');
    await a.locator('#lobbyStart').click();
    await Promise.all([ready(a), ready(b)]);
    const epoch = app.session.epoch;
    const zone = app.sim.inspect().Game.zones.find(z => z.id === 'zone-hollow');
    for (const e of zone.actors) { e.hp = 0; e.die(); }
    await b.waitForFunction(id => world.gates.find(g => g.id === id).open, zone.id);
    // Freeze the leader's whole browser page as a suspended background tab.
    const devtools = await a.context().newCDPSession(a);
    await devtools.send('Page.setWebLifecycleState', { state: 'frozen' });
    const frames = await b.evaluate(() => multiplayer.info.receivedFrames);
    await b.waitForFunction(n => multiplayer.info.receivedFrames > n + 120, frames, { timeout: 15000 });
    assert.equal(app.session.epoch, epoch);
    assert.ok(await b.evaluate(() => multiplayer.active()));
    await devtools.send('Page.setWebLifecycleState', { state: 'active' });
    await ready(a);
    assert.equal(app.session.epoch, epoch, 'thawing a leader never restarts the party');
    // An actual transport loss automatically rejoins the same authoritative run.
    const oldId = await a.evaluate(() => multiplayer.info.self);
    app.clients.get(oldId).ws.terminate();
    await a.waitForFunction(id => multiplayer.connected && multiplayer.info.self !== id, oldId, { timeout: 20000 });
    await ready(a);
    assert.equal(app.session.epoch, epoch);
    assert.ok(await a.evaluate(id => world.gates.find(g => g.id === id).open, zone.id));
    assert.ok(await b.evaluate(() => multiplayer.active()));
    // Recover the title/menu fallback even when the transport remains connected.
    await b.evaluate(() => Game.showMenu('main'));
    await b.waitForFunction(() => Game.mode === 'play' && multiplayer.info.ready && Game.loading <= 0, null, { timeout: 90000 });
    await ready(b);
    assert.equal(app.session.epoch, epoch);
    // Repeated failures retry until connectivity returns.
    await b.route('**/api/lobby', route => route.abort());
    const friendId = await b.evaluate(() => multiplayer.info.self);
    app.clients.get(friendId).ws.terminate();
    await b.waitForFunction(() => !multiplayer.connected);
    await new Promise(resolve => setTimeout(resolve, 3500));
    await b.unroute('**/api/lobby');
    await ready(b);
    assert.equal(app.session.epoch, epoch);
    // Explicit leave cancels pending reconnects; a server removal stays removed.
    const lastId = await a.evaluate(() => multiplayer.info.self);
    app.clients.get(lastId).ws.terminate();
    await a.waitForFunction(() => !multiplayer.connected);
    await a.evaluate(() => multiplayer.leave());
    const remainingId = await b.evaluate(() => multiplayer.info.self);
    app.clients.get(remainingId).ws.close(1008, 'Removed by the lobby leader.');
    await b.waitForFunction(() => !multiplayer.connected);
    await new Promise(resolve => setTimeout(resolve, 2500));
    assert.equal(app.clients.size, 0, 'leave and removal cancel retries');
    assert.equal(app.session.epoch, epoch, 'unexpected empty party retains the run during reconnect grace');
    lobbyClock += C.emptyLobbyTimeout;
    await b.evaluate(() => multiplayer.join());
    await b.waitForFunction(() => multiplayer.connected && multiplayer.panelOpen && !multiplayer.active());
    assert.equal(app.session, null, 'returning later clears the abandoned run');
    assert.equal(await b.locator('#lobbyStart').isEnabled(), true, 'leader returns to lobby controls');
    assert.equal(await b.locator('#lobbyAdventure').inputValue(), 'gauntlet/boss-only');
    await a.evaluate(() => multiplayer.join());
    await a.waitForFunction(() => multiplayer.connected && multiplayer.panelOpen && !multiplayer.active());
    await b.locator('#lobbyAdventure').selectOption('gauntlet/boss-only'); await b.locator('#lobbyStart').click();
    await Promise.all([ready(a), ready(b)]);
    await a.evaluate(() => multiplayer.leave());
    assert.ok(app.session, 'leaving never resets a remaining teammate');
    await b.evaluate(() => multiplayer.leave());
    for (let i = 0; i < 100 && app.session; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(app.session, null, 'last explicit leave resets immediately');
    await b.evaluate(() => multiplayer.join());
    await b.waitForFunction(() => multiplayer.connected && multiplayer.panelOpen && !multiplayer.active());
    assert.equal(await b.locator('#lobbyStart').isEnabled(), true);
    assert.deepEqual(errors, []);
    console.log('Browsers: quick recovery, shared progress, 60s abandoned-run expiry, returning lobby controls, explicit party leave reset and fresh starts passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
