'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
const { config: C } = require('../js/net-protocol.js');
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
    assert.equal(await a.locator('#lobbyAdventure option').count(), 2 + Object.keys(C.gauntlets).length);
    assert.equal(await a.locator('#lobbyAdventure').inputValue(), 'gauntlet/boss-only', 'BOSS ONLY is selected without setup');
    await a.locator('#lobbyStart').click();
    await Promise.all([ready(a), ready(b)]);
    for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    for (const [page, hits] of [[a, 1], [b, 2]]) await page.evaluate(hits => {
      const p = Game.player, e = Game.duel, strike = makeStrike(PLAYER_DEF.moveset.attacks.light);
      for (let i = 0; i < hits; i++) {
        p.hitbox = new Hitbox(p, PLAYER_DEF.moveset.attacks.light.box, strike);
        multiplayer.hit(e, strike); multiplayer.hit(e, strike); // duplicate contact must not inflate totals
      }
      p.hitbox = null;
    }, hits);
    await a.waitForFunction(() => Game.duel.hp === Game.duel.def.hp - 72);
    const allyHealth = a.locator('#onlineAlive').getByRole('meter', { name: 'Ember health', exact: true });
    const worldHealth = a.locator('.online-name').filter({ hasText: 'Ember' }).locator('.ally-health');
    await a.waitForFunction(() => document.querySelector('#onlineAlive .ally-health')?.getAttribute('aria-valuenow') === '120');
    assert.equal(await a.locator('#onlineAlive .ally-health').count(), 1, 'one health bar per teammate, without duplicating the local HUD');
    await b.evaluate(() => { Game.player.hp = 60; });
    await a.waitForFunction(() => document.querySelector('#onlineAlive .ally-health')?.getAttribute('aria-valuenow') === '60');
    assert.equal(await worldHealth.getAttribute('aria-valuenow'), '60', 'world nameplate tracks teammate damage');
    assert.equal(await allyHealth.getAttribute('aria-valuemax'), '120');
    await a.locator('canvas#view').click();
    await a.waitForFunction(() => document.pointerLockElement === canvas);
    await die(a);
    await a.waitForFunction(() => multiplayer.spectating && !document.pointerLockElement);
    assert.equal(await a.evaluate(() => Game.mode), 'play', 'automatic mouse release does not open pause');
    assert.equal(await a.locator('#onlineSpectator').isVisible(), true);
    await a.waitForFunction(() => document.querySelector('#onlineAlive').textContent.includes('1/2'));
    assert.match(await a.locator('#onlineAlive').textContent(), /Ash \(you\)Fallen/);
    assert.match(await a.locator('#onlineAlive').textContent(), /EmberAlive/);
    assert.equal(await allyHealth.isVisible(), true, 'teammate health stays visible in spectator mode');
    assert.equal(await allyHealth.getAttribute('aria-valuenow'), '60');
    await b.evaluate(() => { Game.player.hp = 90; });
    await a.waitForFunction(() => document.querySelector('#onlineAlive .ally-health')?.getAttribute('aria-valuenow') === '90');
    assert.equal(await worldHealth.getAttribute('aria-valuenow'), '90', 'healing updates both bars while spectating');
    await a.setViewportSize({ width: 390, height: 740 });
    assert.ok(await a.locator('#onlineParty').evaluate(el => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth));
    assert.ok(await a.evaluate(() => document.querySelector('#onlineParty').getBoundingClientRect().top > document.querySelector('#eBars').getBoundingClientRect().bottom), 'party pane stays below the boss bar on narrow screens');
    assert.ok(await a.locator('#onlineAlive').evaluate(el => el.scrollWidth <= el.clientWidth), 'health bars fit the narrow player panel');
    fs.mkdirSync('.scratch/boss-only', { recursive: true });
    await a.screenshot({ path: '.scratch/boss-only/spectating.png' });
    await b.evaluate(() => { Game.player.hp = 1; Game.player.item('flask').count = 0; });
    await a.evaluate(() => { hud.controlsTipsTimer = 0; });
    for (const page of [a, b]) await page.evaluate(() => {
      window.__loadingCards = [];
      new MutationObserver(() => {
        if (document.querySelector('#loading').classList.contains('show'))
          window.__loadingCards.push([document.querySelector('#loadName').textContent, document.querySelector('#loadTip').textContent]);
      }).observe(document.querySelector('#loading'), { subtree: true, childList: true, attributes: true });
    });
    const epoch = app.session.epoch;
    const boss = app.sim.inspect().Game.duel; boss.hp = 0; boss.die();
    await a.locator('#won.show').waitFor();
    await b.locator('#won.show').waitFor();
    assert.equal(await a.locator('#onlineLeaderboard').isVisible(), false, 'results wait for the victory beat');
    assert.equal(app.session.epoch, epoch, 'victory is visible before the next fight');
    for (const page of [a, b]) {
      await page.locator('#onlineLeaderboard').waitFor();
      assert.deepEqual(await page.locator('#leaderboardRows tr').allTextContents(), page === a
        ? ['1Ember48', '2Ash (you)24'] : ['1Ember (you)48', '2Ash24']);
    }
    assert.equal(await a.locator('#onlineLeaderboard').evaluate(el => el.scrollWidth <= innerWidth), true, 'results fit narrow spectator screen');
    await a.screenshot({ path: '.scratch/boss-only/leaderboard-mobile.png' });
    await b.screenshot({ path: '.scratch/boss-only/leaderboard-desktop.png' });
    await a.waitForFunction(epoch => multiplayer.info.session?.epoch > epoch, epoch, { timeout: 20000 });
    await Promise.all([ready(a), ready(b)]);
    for (const page of [a, b]) {
      assert.equal(await page.locator('#onlineLeaderboard').isVisible(), false, 'next boss clears prior results');
      const cards = await page.evaluate(() => [...new Set(window.__loadingCards.map(c => JSON.stringify(c)))]);
      assert.equal(cards.length, 1, 'one consistent loading message from first paint through boss preparation');
      assert.match(JSON.parse(cards[0])[0], /^Duel: /);
    }
    assert.equal(await a.evaluate(() => hud.controlsTipsTimer), 0, 'automatic progression does not replay controls over every boss');
    for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    for (const page of [a, b]) assert.equal(await page.evaluate(() => Game.player.alive() && Game.player.hp === Game.player.maxHp && Game.player.item('flask').count === Game.player.item('flask').max), true);
    await a.waitForFunction(() => document.querySelector('#onlineAlive .ally-health')?.getAttribute('aria-valuenow') === '120');
    assert.equal(await a.locator('#onlineSpectator').isVisible(), false);
    assert.match(await a.locator('#onlineCurrentLevel').textContent(), /BOSS ONLY · 2\//);
    await die(a); await die(b);
    await a.locator('#teamWipeScreen').waitFor({ timeout: 20000 });
    await b.locator('#teamWipeScreen').waitFor({ timeout: 20000 });
    assert.match(await a.locator('#teamWipeScore').textContent(), /1 \/ 12/);
    assert.equal(await a.locator('#publicLobby').evaluate(el => el.inert), true, 'lobby cannot be activated under the death screen');
    await a.keyboard.press('Escape');
    await a.evaluate(() => multiplayer.pad(['PadB']));
    assert.equal(await a.evaluate(() => multiplayer.connected), true, 'keyboard and controller back cannot dismiss the wipe screen or leave');
    assert.equal(await a.locator('#teamWipeScreen').isVisible(), true);
    await a.waitForFunction(() => document.querySelector('#teamWipeScreen').getAnimations({ subtree: true }).every(a => a.playState === 'finished'));
    await a.screenshot({ path: '.scratch/boss-only/team-wipe.png' });
    await a.locator('#teamWipeScreen').waitFor({ state: 'hidden' });
    await b.locator('#teamWipeScreen').waitFor({ state: 'hidden' });
    assert.equal(await a.locator('#publicLobby').evaluate(el => el.inert), false);
    await a.locator('#publicLobby:not(.hidden)').waitFor({ timeout: 20000 });
    await b.locator('#publicLobby:not(.hidden)').waitFor({ timeout: 20000 });
    assert.equal(app.session, null); assert.match(await a.locator('#lobbyNotice').textContent(), /TEAM WIPED/);
    await a.locator('#lobbyStart').click(); await Promise.all([ready(a), ready(b)]);
    assert.equal(app.session.gauntlet.number, 1);
    assert.deepEqual(errors, []);
    console.log('BOSS ONLY browsers: choices, spectating, alive panel, victory, refills, dramatic team wipe, keyboard/controller input guard, lobby return and retry passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
