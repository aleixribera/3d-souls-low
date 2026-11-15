'use strict';
const assert = require('node:assert/strict');
const { pinRush, selectRush } = require('./browser-adventure.cjs');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true, firstPick: false });
  pinRush(app, ['ostrey']);
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true }), errors = [];
  async function player() {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'bare', volume: 0 })); localStorage.setItem('combatArena.sparring', JSON.stringify({ done: true })); localStorage.setItem('combatArena.onlineName', 'Tester'); });
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.getByRole('button', { name: 'Join lobby', exact: false }).click();
    await page.waitForFunction(() => multiplayer.connected);
    return page;
  }
  const ready = p => p.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && multiplayer.info.receivedFrames > 2,
    null, { timeout: 90000 });
  const die = p => p.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
  try {
    const a = await player(), b = await player();
    await selectRush(a); await a.locator('#lobbyStart').click();
    await Promise.all([ready(a), ready(b)]);
    // Hold the boss still so this fixture controls each player's death.
    for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    const epoch = app.session.epoch;
    app.sim.inspect().Game.duel.hp -= 24;
    const duel = app.sim.inspect().Game.duel, share = duel.hp / duel.def.hp;   // her share of a group-scaled bar
    await die(a);
    await a.waitForFunction(() => Game.deathTimer > CONFIG.death.respawnDelay + 0.2);
    assert.equal(await a.evaluate(() => Game.player.alive()), false, 'dead player cannot respawn while teammate lives');
    assert.match(await a.locator('#diedStatus').textContent(), /Waiting for your team/);
    assert.equal(await b.evaluate(() => Game.player.alive()), true);
    assert.equal(app.session.epoch, epoch);
    assert.ok(share < 1 && Math.abs(duel.hp / duel.def.hp - share) < 1e-9, 'a partial wipe keeps her damage');
    await die(b);
    // A full wipe ends the run: both see its summary in the lobby.
    for (const p of [a, b]) await p.locator('#runSummary').waitFor({ timeout: 20000 });
    assert.equal(await a.locator('#runSummaryTitle').textContent(), 'Reached fight 1');
    assert.equal(app.session, null);
    assert.deepEqual(errors, []);
    console.log('Boss arena browsers: defeated player waits beyond respawn delay; a full team wipe ends the run on its summary.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
