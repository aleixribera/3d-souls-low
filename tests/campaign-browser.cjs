'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
const chapters = ['stormhill', 'stormveil', 'evergaol', 'leyndell', 'ashen-capital', 'farum-azula', 'erdtree', 'haligtree'];
(async () => {
  const app = createServer({ dev: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const pages = [], errors = [];
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`;
  async function player(name) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage(); pages.push(page);
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(name => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 }));
      localStorage.setItem('combatArena.onlineName', name);
      for (const suffix of ['', '.lands', '.v2']) localStorage.setItem('combatArena.story' + suffix, 'offline-save-sentinel');
    }, name);
    await page.goto(url);
    await page.waitForFunction(() => window.__arenaReady && window.__arena.tests, { timeout: 120000 });
    await page.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await page.waitForFunction(() => __arena.multiplayer.connected, { timeout: 15000 });
    return page;
  }
  async function ready(page, id) {
    await page.waitForFunction(id => __arena.multiplayer.info.ready && Game.level.id === id && Game.loading <= 0, id, { timeout: 90000 });
    assert.equal(await page.evaluate(() => Game.story), false);
    assert.equal(await page.evaluate(() => document.getElementById('lobbyAdventure').value), 'campaign/lands');
  }
  try {
    const a = await player('Leader'), b = await player('Friend');
    assert.equal(await a.locator('#lobbyAdventure').inputValue(), 'campaign/lands', 'full Elden Ring story is selected without any setup');
    await a.locator('#lobbyStart').click();
    for (let i = 0; i < chapters.length; i++) {
      await Promise.all([ready(a, chapters[i]), ready(b, chapters[i])]);
      for (const p of [a, b]) {
        assert.deepEqual(await p.evaluate(() => ({ chapter: multiplayer.campaign.number, total: multiplayer.campaign.total,
          next: Game.nextLevelId(), card: Game.levelCard(Game.level.id) })), {
          chapter: i + 1, total: 8, next: chapters[i + 1] || null,
          card: [app.sim.campaign('lands', chapters[i]).title, app.sim.campaign('lands', chapters[i]).line],
        });
      }
      if (i === chapters.length - 1) {
        for (const p of [a, b]) await p.evaluate(() => {
          Object.assign(CONFIG.finale.death, { stagger: 0.1, kneel: 0.2, blaze: 0.3, fade: 1.6, overlay: 1.8 });
          Object.assign(CONFIG.finale.ending, { card: 0.05, credits: 4, hold: 0.05 });
        });
      }
      for (const e of app.sim.inspect().Game.enemies) {
        if (i === chapters.length - 1 && e.phaseIds?.length) e.enterPhase(e.phaseIds.length - 1);
        e.hp = 0; e.die();
      }
      if (i > 0 && i < chapters.length - 1) {
        await a.waitForFunction(() => Game.complete);
        await a.evaluate(() => multiplayer.show());
        await a.locator('#lobbyNext').click();
      }
      console.log('Browsers completed chapter ' + (i + 1) + ': ' + chapters[i]);
    }
    for (const p of [a, b]) {
      await p.locator('#ending .back.show').waitFor({ timeout: 20000 });
      assert.equal(await p.locator('#ending .card').allTextContents().then(cards => cards.join('\n')),
        await p.evaluate(() => LORE.endings.haligtree.join('\n')), 'canonical Lands Between ending');
      const epoch = await p.evaluate(() => multiplayer.info.session.epoch);
      await p.keyboard.press('Enter');
      await p.locator('#publicLobby:not(.hidden)').waitFor();
      assert.equal(await p.locator('#ending').count(), 0);
      assert.equal(await p.evaluate(() => multiplayer.info.session.epoch), epoch, 'credits keep the party session');
      assert.equal(await p.locator('#lobbyNext').isDisabled(), true, 'last chapter cannot wrap');
      assert.equal(await p.evaluate(() => Game.story), false);
      assert.deepEqual(await p.evaluate(() => ['', '.lands', '.v2'].map(s => localStorage.getItem('combatArena.story' + s))),
        Array(3).fill('offline-save-sentinel'), 'co-op never writes solo saves');
      assert.equal(await p.evaluate(() => localStorage.getItem('combatArena.complete.haligtree')), null, 'co-op never writes solo completion');
    }
    const late = await player('Late friend');
    await ready(late, 'haligtree');
    assert.equal(await late.evaluate(() => multiplayer.campaign.number), 8);
    await late.evaluate(() => { Object.assign(CONFIG.finale.ending, { card: 0.05, credits: 0.05, hold: 0.05 }); });
    await late.locator('#ending .back.show').waitFor({ timeout: 25000 });
    await a.locator('#lobbyReturn').click();
    for (const p of pages) {
      await p.locator('#publicLobby:not(.hidden)').waitFor();
      assert.equal(await p.locator('#ending').count(), 0, 'leader return cancels every credits overlay');
    }
    assert.deepEqual(errors, []);
    console.log('Campaign browsers: default choice, all eight maps, automatic party travel, chapter cards, ending, late join and untouched solo saves passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
