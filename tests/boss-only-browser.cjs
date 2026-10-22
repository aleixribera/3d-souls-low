'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ready = p => p.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && multiplayer.info.receivedFrames > 2, null, { timeout: 90000 });
  async function player(name) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(name => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 }));
      localStorage.setItem('combatArena.onlineName', name);
    }, name);
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await page.waitForFunction(() => multiplayer.connected);
    return page;
  }
  const die = p => p.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
  try {
    const a = await player('Ash'), b = await player('Ember');
    assert.equal(await a.locator('#lobbyAdventure option').count(), 3);
    await a.locator('#lobbyAdventure').selectOption('gauntlet/boss-only'); await a.locator('#lobbyStart').click();
    await Promise.all([ready(a), ready(b)]);
    for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    await a.locator('canvas#view').click();
    await a.waitForFunction(() => document.pointerLockElement === canvas);
    await die(a);
    await a.waitForFunction(() => multiplayer.spectating && !document.pointerLockElement);
    assert.equal(await a.evaluate(() => Game.mode), 'play', 'automatic mouse release does not open pause');
    assert.equal(await a.locator('#onlineSpectator').isVisible(), true);
    await a.waitForFunction(() => document.querySelector('#onlineAlive').textContent.includes('1/2'));
    assert.match(await a.locator('#onlineAlive').textContent(), /Ash \(you\)Fallen/);
    assert.match(await a.locator('#onlineAlive').textContent(), /EmberAlive/);
    await a.setViewportSize({ width: 390, height: 740 });
    assert.ok(await a.locator('#onlineParty').evaluate(el => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth));
    assert.ok(await a.evaluate(() => document.querySelector('#onlineParty').getBoundingClientRect().top > document.querySelector('#eBars').getBoundingClientRect().bottom), 'party pane stays below the boss bar on narrow screens');
    fs.mkdirSync('.scratch/boss-only', { recursive: true });
    await a.screenshot({ path: '.scratch/boss-only/spectating.png' });
    await b.evaluate(() => { Game.player.hp = 1; Game.player.item('flask').count = 0; });
    const epoch = app.session.epoch;
    const boss = app.sim.inspect().Game.duel; boss.hp = 0; boss.die();
    await a.locator('#won.show').waitFor();
    await b.locator('#won.show').waitFor();
    assert.equal(app.session.epoch, epoch, 'victory is visible before the next fight');
    await a.waitForFunction(epoch => multiplayer.info.session?.epoch > epoch, epoch, { timeout: 20000 });
    await Promise.all([ready(a), ready(b)]);
    for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    for (const page of [a, b]) assert.equal(await page.evaluate(() => Game.player.alive() && Game.player.hp === Game.player.maxHp && Game.player.item('flask').count === Game.player.item('flask').max), true);
    assert.equal(await a.locator('#onlineSpectator').isVisible(), false);
    assert.match(await a.locator('#onlineCurrentLevel').textContent(), /BOSS ONLY · 2\//);
    await die(a); await die(b);
    await a.locator('#publicLobby:not(.hidden)').waitFor({ timeout: 20000 });
    await b.locator('#publicLobby:not(.hidden)').waitFor({ timeout: 20000 });
    assert.equal(app.session, null); assert.match(await a.locator('#lobbyNotice').textContent(), /TEAM WIPED/);
    await a.locator('#lobbyStart').click(); await Promise.all([ready(a), ready(b)]);
    assert.equal(app.session.gauntlet.number, 1);
    assert.deepEqual(errors, []);
    console.log('BOSS ONLY browsers: three choices, pointer-lock death without pause, alive panel, narrow layout, spectator victory, auto advance, full HP/flasks, team wipe and retry passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
