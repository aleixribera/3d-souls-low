'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true, firstPick: false }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  async function player(name) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(name => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'bare', volume: 0 }));
      localStorage.setItem('combatArena.onlineName', name); localStorage.setItem('combatArena.sparring', JSON.stringify({ done: true }));
    }, name);
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.locator('#menuList .title-lead').click();
    await page.waitForFunction(() => multiplayer.connected);
    return page;
  }
  const ready = p => p.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive, null, { timeout: 90000 });
  try {
    const a = await player('Ash'), b = await player('Ember');
    for (const choice of ['calling/boss-rush', 'calling/weekly']) {
      await a.evaluate(() => multiplayer.show());
      await a.locator('#lobbyAdventure').selectOption(choice); await a.locator('#lobbyStart').click();
      await Promise.all([ready(a), ready(b)]);
      assert.equal(await a.locator('#runIntroScreen').count(), 0, `${choice}: no 5 s intro pause`);
      await a.waitForTimeout(400);
      assert.equal(app.sim.state.fought, 0, `${choice}: boss waits until a player moves or acts`);
      await a.keyboard.down('KeyW'); await a.waitForTimeout(250); await a.keyboard.up('KeyW');
      await a.waitForFunction(() => true);
      for (let t = 0; t < 50 && app.sim.state.fought <= 0; t++) await a.waitForTimeout(50);
      assert.ok(app.sim.state.fought > 0, `${choice}: moving wakes the boss`);
      for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    }
    assert.deepEqual(errors, []);
    console.log('Run start: Boss Rush and Weekly Run skip the 5 s intro pause and wait until a player moves.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
