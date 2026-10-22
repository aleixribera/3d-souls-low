'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
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
  const ready = p => p.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive, null, { timeout: 90000 });
  try {
    const a = await player('Ash'), b = await player('Ember');
    for (const [choice, title] of [['campaign/ashmere', 'RISE FROM ASH'], ['campaign/lands', 'FOLLOW THE GOLD'], ['gauntlet/boss-only', 'DEFY THEM ALL']]) {
      await a.evaluate(() => multiplayer.show());
      await a.locator('#lobbyAdventure').selectOption(choice); await a.locator('#lobbyStart').click();
      await Promise.all([a, b].map(p => p.locator('#runIntroScreen').waitFor({ timeout: 90000 })));
      assert.equal(await a.locator('#runIntroTitle').textContent(), title);
      assert.equal(await a.evaluate(() => multiplayer.info.ready), false, 'intro holds ready until players have seen it');
      assert.ok([...app.clients.values()].every(p => !p.ready), 'combat cannot start during the opening');
      const before = await a.evaluate(() => [Game.player.x, Game.player.z]);
      await a.keyboard.press('Escape'); await a.keyboard.press('KeyR');
      await a.evaluate(() => {
        const read = gamepad.read;
        try { gamepad.read = () => ({ buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 9, value: i === 9 ? 1 : 0 })), axes: [1, 1, 0, 0] }); gamepad.poll(CONFIG.step); }
        finally { gamepad.read = read; gamepad.release(); }
      });
      assert.equal(await a.evaluate(() => Game.mode), 'play', 'intro input cannot open pause or restart');
      assert.deepEqual(await a.evaluate(() => [Game.player.x, Game.player.z]), before, 'player waits safely behind the ceremony');
      await a.waitForFunction(() => document.querySelector('#runIntroTitle').getAnimations().every(a => a.playState === 'finished'));
      fs.mkdirSync('.scratch/run-intro', { recursive: true });
      if (choice === 'gauntlet/boss-only') {
        await a.screenshot({ path: '.scratch/run-intro/gauntlet.png' });
        await a.setViewportSize({ width: 390, height: 740 });
        assert.ok(await a.locator('.intro-message').evaluate(el => el.scrollWidth <= el.clientWidth));
        await a.screenshot({ path: '.scratch/run-intro/gauntlet-narrow.png' });
      } else await a.screenshot({ path: `.scratch/run-intro/${choice.split('/')[1]}.png` });
      await Promise.all([ready(a), ready(b)]);
      assert.equal(await a.locator('#menu').evaluate(el => el.inert), false);
      for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    }
    const epoch = app.session.epoch;
    const late = await player('Late arrival'); await ready(late);
    assert.equal(await late.locator('#runIntroScreen').isVisible(), false, 'late join never replays an opening');
    assert.equal(app.session.epoch, epoch);
    const boss = app.sim.inspect().Game.duel; boss.hp = 0; boss.die(); app.sim.tick(5);
    await a.waitForFunction(epoch => multiplayer.info.session?.epoch > epoch, epoch, { timeout: 20000 });
    for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    await Promise.all([ready(a), ready(b), ready(late)]);
    assert.equal(await a.locator('#runIntroScreen').isVisible(), false, 'automatic boss advancement does not repeat the opening');
    let owner;
    for (const p of [a, b, late]) if (await p.evaluate(() => multiplayer.info.self === multiplayer.info.leader)) owner = p;
    assert.ok(owner, 'party has a current leader');
    await owner.evaluate(() => multiplayer.show()); await owner.locator('#lobbyRestart').click();
    await a.locator('#runIntroScreen').waitFor({ timeout: 90000 });
    await a.evaluate(() => multiplayer.leave());
    assert.equal(await a.locator('#runIntroScreen').isVisible(), false, 'leaving cancels the ceremony');
    assert.equal(await a.locator('#menu').evaluate(el => el.inert), false);
    await b.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await b.locator('#runIntroTitle').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.deepEqual(errors, []);
    console.log('Gold openings: both stories and gauntlet, safe loading, input guards, narrow layout, late join, auto advance, cancellation and reduced motion passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
