'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true }), errors = [];
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
  async function pad(page, button = null, axes = [0, 0, 0, 0], hold = false) {
    await page.evaluate(({ button, axes, hold }) => {
      const read = gamepad.read;
      try {
        gamepad.read = () => ({ buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === button, value: i === button ? 1 : 0 })), axes });
        gamepad.poll(CONFIG.step);
        if (hold) for (let i = 0; i < 5; i++) gamepad.poll(CONFIG.gamepad.menuDelay);
        gamepad.read = () => ({ buttons: [], axes: [0, 0, 0, 0] }); gamepad.poll(CONFIG.step);
      } finally { gamepad.read = read; gamepad.release(); }
    }, { button, axes, hold });
  }
  async function navigate(page, key) {
    for (let i = 0; i < 35; i++) {
      if (await page.evaluate(key => document.activeElement.id === key || document.activeElement.dataset.padKey === key, key)) return;
      await pad(page, 13);
    }
    throw new Error('Controller cannot reach ' + key);
  }
  const ready = p => p.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0, null, { timeout: 90000 });
  try {
    const a = await player('Leader'), b = await player('Friend');
    assert.deepEqual(await a.locator('#lobbyAdventure optgroup[label="Stories"] option').allTextContents(), ['Story 1 (Ashmere)', 'Story 2 (Lands)']);
    assert.equal(await a.locator('#lobbyAdventure option').count(), 3, 'two stories and BOSS ONLY');
    assert.equal(await a.locator('#lobbyAdventure option[value^="level/"]').count(), 0, 'no individual levels in the dropdown');
    assert.equal(await a.getByRole('button', { name: 'Edit name', exact: true }).count(), 0, 'no separate name-edit action');
    await a.locator('#lobbyName').click();
    assert.equal(await a.locator('#lobbyNameEditor').isVisible(), false, 'mouse activation keeps normal text entry');
    await a.locator('#lobbyName').fill('Leader');
    await a.locator('#lobbyName').dispatchEvent('change');
    await a.locator('#lobbyAdventure').focus();
    await pad(a, 0);
    assert.equal(await a.locator('#lobbyAdventure').getAttribute('size'), '8', 'A opens adventure picker without native popup');
    await pad(a, 12);
    assert.notEqual(await a.locator('#lobbyAdventure').inputValue(), 'gauntlet/boss-only');
    await pad(a, 1);
    assert.equal(await a.locator('#lobbyAdventure').inputValue(), 'gauntlet/boss-only', 'B cancels adventure edits');
    await a.locator('#lobbyAdventure').selectOption('campaign/ashmere');
    await pad(a, 0); await pad(a, 13, undefined, true);
    assert.equal(await a.locator('#lobbyAdventure').inputValue(), 'gauntlet/boss-only', 'held D-pad advances across both remaining choices');
    await pad(a, 1);
    await a.locator('#lobbyAdventure').selectOption('campaign/lands');
    await pad(a, null, [0, 1, 0, 0]);
    assert.equal(await a.evaluate(() => document.activeElement.id), 'lobbyStart', 'left stick moves focus');
    await pad(a, 3);
    assert.equal(await a.locator('#lobbyNameEditor').isVisible(), false, 'unrelated controller buttons never open the keyboard');
    await navigate(a, 'lobbyName');
    assert.equal(await a.locator('#lobbyNameEditor').isVisible(), false, 'focusing the name box does not open the keyboard');
    await pad(a, 0);
    assert.equal(await a.locator('#lobbyNameEditor').isVisible(), true, 'A on the name box opens the controller keyboard');
    await pad(a, 0);
    assert.equal(await a.locator('#lobbyNamePreview').textContent(), 'LeaderA');
    await pad(a, 2);
    assert.equal(await a.locator('#lobbyNamePreview').textContent(), 'Leader', 'X deletes');
    await pad(a, 0); await pad(a, 12); await pad(a, 14); await pad(a, 0);
    assert.equal(await a.locator('#lobbyNameEditor').isVisible(), false, 'controller can reach Done');
    assert.equal(await a.locator('#lobbyName').inputValue(), 'LeaderA');
    await a.waitForFunction(() => multiplayer.info.players.some(p => p.name === 'LeaderA'));
    assert.equal(await a.evaluate(() => document.activeElement.id), 'lobbyName', 'Done returns focus to the name box');
    await pad(a, 0); await pad(a, 0); await pad(a, 1);
    assert.equal(await a.locator('#lobbyName').inputValue(), 'LeaderA', 'B cancels name edits');
    await pad(a, 0); await a.setViewportSize({ width: 390, height: 740 });
    assert.ok(await a.locator('.lobby-card').evaluate(el => el.scrollWidth <= el.clientWidth), 'controller keyboard fits narrow layout');
    fs.mkdirSync('.scratch/lobby-controller', { recursive: true });
    await a.screenshot({ path: '.scratch/lobby-controller/name-keyboard.png' });
    await pad(a, 1); await a.setViewportSize({ width: 1280, height: 720 });
    const bId = await b.evaluate(() => multiplayer.info.self), transfer = 'transfer/' + bId;
    await navigate(a, transfer);
    await b.locator('#lobbyName').fill('Renamed friend'); await b.locator('#lobbyName').dispatchEvent('change');
    await a.waitForFunction(() => multiplayer.info.players.some(p => p.name === 'Renamed friend'));
    assert.equal(await a.evaluate(() => document.activeElement.dataset.padKey), transfer, 'roster updates preserve controller focus');
    await pad(a, 0);
    await b.waitForFunction(() => multiplayer.info.self === multiplayer.info.leader);
    assert.ok(await a.evaluate(() => !!document.activeElement.offsetParent), 'leadership changes never leave focus in hidden controls');
    await navigate(b, 'lobbyAdventure');
    if (await b.locator('#lobbyAdventure').getAttribute('size')) await pad(b, 1);
    for (let i = 0; i < 100 && await b.locator('#lobbyAdventure').inputValue() !== 'gauntlet/boss-only'; i++) await pad(b, 15);
    assert.equal(await b.locator('#lobbyAdventure').inputValue(), 'gauntlet/boss-only');
    assert.deepEqual(await b.locator('#lobbyAdventure option').evaluateAll(options => options.map(o => o.value)), ['campaign/ashmere', 'campaign/lands', 'gauntlet/boss-only']);
    await navigate(b, 'lobbyStart'); await pad(b, 0);
    await Promise.all([ready(a), ready(b)]);
    for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    await b.keyboard.press('Escape');
    await b.getByRole('button', { name: 'Options', exact: true }).waitFor();
    assert.equal(await b.locator('#publicLobby').isVisible(), false, 'Escape opens the normal pause menu');
    await b.getByRole('button', { name: 'Options', exact: true }).click();
    assert.equal(await b.evaluate(() => Game.screen), 'options');
    await b.keyboard.press('Escape');
    assert.equal(await b.evaluate(() => Game.screen), 'pause', 'Options returns to pause');
    await b.keyboard.press('Escape');
    assert.equal(await b.evaluate(() => Game.mode), 'play', 'Escape resumes');
    await pad(b, 9);
    await b.getByRole('button', { name: 'Resume', exact: false }).waitFor();
    await pad(b, 13); await pad(b, 0);
    await b.locator('#publicLobby:not(.hidden)').waitFor();
    await pad(b, 1);
    assert.equal(await b.locator('#publicLobby').isVisible(), false, 'B resumes the fight');
    await pad(b, 9); await pad(b, 13); await pad(b, 0);
    await navigate(b, 'lobbyReturn'); await pad(b, 0);
    await a.waitForFunction(() => !multiplayer.active());
    await a.locator('#publicLobby:not(.hidden)').waitFor();
    await pad(a, 1);
    assert.equal(await a.evaluate(() => multiplayer.connected), false, 'B leaves idle lobby for main menu');
    assert.deepEqual(errors, []);
    console.log('Lobby controller: stick/D-pad, held repeat, adventure confirm/cancel, name keyboard, roster focus, leader transfer, start, resume, return and leave passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
