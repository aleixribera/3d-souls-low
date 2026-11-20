'use strict';
// Boss Rush alone, with no server (js/alone.js; PLAN.md track B item 1): the page opened as a file plays a whole run. The
// title's Boss Rush fails to join (no lobby answers a file) and the lobby screen offers Play in private; the run is the lobby's own (js/lobby-host.js) in
// a frame of the page, from the free pick to fight 5; the pause holds it; a fall ends it on the end screen, whose xp
// gives a level and a crate that are still there after a reload. node tests/alone-browser.cjs [screenshot directory]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('./browser.cjs');
(async () => {
  const shots = process.argv[2] || '.scratch/alone', errors = [];
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;   // the reload keeps what the run earned
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'bare', volume: 0 }));
      localStorage.setItem('combatArena.sparring', JSON.stringify({ done: true }));
    });
    await page.goto(pathToFileURL(path.join(__dirname, '..', 'combat-arena-3d.html')).href);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });

    // The title: Boss Rush leads; a file has no lobby, so joining fails and the lobby screen offers Play in private.
    await page.waitForFunction(() => multiplayer.lobby.state === 'absent');
    assert.match(await page.locator('#menuDesc').textContent(), /^Boss after boss/);
    await page.screenshot({ path: path.join(shots, 'title-alone-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the title fits a phone');
    await page.screenshot({ path: path.join(shots, 'title-alone-phone.png') });
    await page.setViewportSize({ width: 1280, height: 720 });
    const before = await page.evaluate(() => ({ xp: progress.xp, level: progress.level.level, crates: progress.crates }));

    // Play in private: the lobby screen closes, the run's intro, then the free pick before fight 1.
    await page.locator('#menuList .title-lead').click();
    if (await page.locator('#nameAskField').isVisible()) { await page.locator('#nameAskField').fill('Tester'); await page.keyboard.press('Enter'); }
    await page.locator('#lobbyPrivate').click();
    await page.waitForFunction(() => multiplayer.alone && multiplayer.connected);
    assert.equal(await page.evaluate(() => multiplayer.panelOpen), false, 'no lobby screen while playing alone');
    const playing = () => page.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive && multiplayer.info.receivedFrames > 2, null, { timeout: 90000 });
    await playing();
    assert.equal(await page.evaluate(() => multiplayer.info.session.gauntlet.id), 'boss-rush');
    const pick = async () => {
      await page.locator('#abilityScreen').waitFor({ timeout: 30000 });
      assert.equal(await page.locator('#abilityConfirm').isDisabled(), true, 'Confirm stays disabled until a card is highlighted');
      await page.locator('#abilityChoices button').first().click();
      assert.equal(await page.locator('#abilityScreen').isVisible(), true, 'clicking a card only highlights it');
      assert.equal(await page.locator('#abilityConfirm').isDisabled(), false, 'Confirm enables once a card is highlighted');
      await page.locator('#abilityConfirm').click();
      await page.locator('#abilityScreen').waitFor({ state: 'hidden', timeout: 30000 });
    };
    await pick();
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => alone.lobby.sim.state.fought), 0, 'the boss waits until the player moves');
    await page.keyboard.down('KeyW'); await page.waitForTimeout(250); await page.keyboard.up('KeyW');
    await page.waitForFunction(() => alone.lobby.sim.state.fought > 0.5, null, { timeout: 30000 });
    await page.screenshot({ path: path.join(shots, 'fight-1-alone.png') });

    // The pause holds the run: no time passes in the frame's simulation.
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => Game.mode === 'pause');
    const items = await page.evaluate(() => Game.menuItems.map(it => it.name));
    for (const name of ['Resume', 'Start over', 'Quit to title']) assert.ok(items.includes(name), `pause offers ${name}: ${items}`);
    const held = await page.evaluate(() => alone.lobby.sim.state.time);
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => alone.lobby.sim.state.time), held, 'paused, the run holds');
    await page.screenshot({ path: path.join(shots, 'pause-alone.png') });
    await page.evaluate(() => Game.resume());
    await page.waitForFunction(t => alone.lobby.sim.state.time > t + 0.3, held);

    // Four bosses fall, each followed by the pick: fight 5.
    for (let fight = 1; fight < 5; fight++) {
      await page.evaluate(() => { for (const e of alone.lobby.sim.inspect().Game.enemies) { e.hp = 0; e.die(); } });
      await pick();
      await page.waitForFunction(n => multiplayer.rush?.fight === n, fight + 1, { timeout: 60000 });
      await playing();
    }
    assert.equal(await page.evaluate(() => Game.player.kit.ids.length), 5, 'five picks held');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(shots, 'fight-5-alone.png') });

    // A fall ends the run: the end screen, its xp, a level and a crate.
    await page.evaluate(() => { alone.lobby.sim.arenaWipeDelay = 0.1; Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    await page.locator('#runSummary').waitFor({ timeout: 30000 });
    assert.equal(await page.locator('#runSummaryTitle').textContent(), 'Reached fight 5');
    assert.equal(await page.locator('#runSummaryRows tr').count(), 1);
    assert.match(await page.locator('#runSummaryLobby').textContent(), /Title$/, 'alone, the way out is the title');
    const earned = await page.evaluate(() => ({ xp: progress.xp, level: progress.level.level, crates: progress.crates }));
    assert.ok(earned.xp > before.xp && earned.level > before.level && earned.crates > before.crates, `the run gave xp, a level and a crate: ${JSON.stringify([before, earned])}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shots, 'summary-alone.png') });
    await page.locator('#runSummaryLobby').click();
    await page.waitForFunction(() => Game.screen === 'main' && Game.mode === 'menu' && !multiplayer.connected);

    // After a reload: the same level and crates.
    await page.reload();
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    assert.deepEqual(await page.evaluate(() => ({ xp: progress.xp, level: progress.level.level, crates: progress.crates })), earned, 'kept after a reload');
    assert.deepEqual(errors, [], 'no page errors');
    console.log(`Boss Rush alone: a file page played to fight 5, paused, fell, and kept ${JSON.stringify(earned)} after a reload.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
