'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');
const { config: C } = require('../js/net-protocol.js');
const rush = 'calling/' + C.calling.id, weekly = 'calling/' + C.weekly.id, adventures = [rush, weekly];   // online play is these two only
(async () => {
  const app = createServer({ dev: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true }), errors = [];
  async function player(name) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(name => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'bare', volume: 0 })); localStorage.setItem('combatArena.sparring', JSON.stringify({ done: true }));
      localStorage.setItem('combatArena.onlineName', name);
    }, name);
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.locator('#menuList .title-lead').click();
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
    assert.equal(await a.locator('#lobbyAdventure').inputValue(), rush, 'Boss Rush is the default');
    assert.equal(await a.locator('#lobbyAdventure option').first().textContent(), 'Boss Rush');
    assert.equal(await a.locator('#lobbyAdventure option').count(), adventures.length, 'Boss Rush and the Weekly Run only');
    assert.equal(await a.locator('#lobbyAdventure option[value^="level/"]').count(), 0, 'no individual levels in the dropdown');
    assert.equal(await a.getByRole('button', { name: 'Edit name', exact: true }).count(), 0, 'no separate name-edit action');
    assert.equal(await a.evaluate(() => document.activeElement.id), 'lobbyStart', 'focus lands on Start when the lobby opens');
    await a.locator('#lobbyHelp').click(); await a.locator('#lobbyControlsClose').click();
    assert.equal(await a.locator('#lobbyStart.pad-selected').count(), 0, 'a click takes the focus ring off Start');
    // v7.63.0: the mode is a visible list mirroring the select; Start has the focus. Boss Rush has no settings (endless, pass 65).
    assert.deepEqual(await a.locator('#lobbyModes .ui-row').evaluateAll(rows => rows.map(r => r.dataset.mode)), adventures, 'one row per mode');
    assert.equal(await a.locator('#lobbyModes .ui-row[aria-pressed=true]').textContent(), 'Boss Rush');
    await navigate(a, 'lobbyStart');
    assert.match(await a.locator('#lobbyPadHint').textContent(), /D-pad.*Move.*✕.*Select/, 'hints follow the controller');
    assert.equal(await a.locator('#lobbyLeave .ui-key').textContent(), '◯', "Back's key sits on Leave lobby");
    await pad(a, 12);
    assert.match(await a.evaluate(() => document.activeElement.dataset.padKey || ''), /^mode\//, 'up from Start reaches the mode list');
    await navigate(a, 'mode/' + weekly); await pad(a, 0);
    assert.equal(await a.locator('#lobbyAdventure').inputValue(), weekly, 'A picks the focused mode');
    await navigate(a, 'mode/' + rush); await pad(a, 13, undefined, true);
    assert.notEqual(await a.evaluate(() => document.activeElement.dataset.padKey), 'mode/' + weekly, 'held D-pad moves on past the next row');
    assert.equal(await a.locator('#lobbyAdventure').inputValue(), weekly, 'moving never changes the mode');
    await navigate(a, 'mode/' + weekly);
    await pad(a, null, [0, 1, 0, 0]);
    assert.equal(await a.evaluate(() => document.activeElement.id), 'lobbyStart', 'left stick moves focus');
    // The name and its pad keyboard are their own ask now (tests/name-browser.cjs).
    await a.setViewportSize({ width: 390, height: 740 });
    assert.ok(await a.locator('.lobby-card').evaluate(el => el.scrollWidth <= el.clientWidth), 'the lobby fits a narrow layout');
    await a.setViewportSize({ width: 1280, height: 720 });
    const bId = await b.evaluate(() => multiplayer.info.self), transfer = 'transfer/' + bId;
    await navigate(a, 'lobbyManage'); await pad(a, 0);
    await navigate(a, transfer);
    await b.evaluate(() => progress.setName('Renamed friend'));
    await a.waitForFunction(() => multiplayer.info.players.some(p => p.name === 'Renamed friend'));
    assert.equal(await a.evaluate(() => document.activeElement.dataset.padKey), transfer, 'roster updates preserve controller focus');
    await pad(a, 0);
    await b.waitForFunction(() => multiplayer.info.self === multiplayer.info.leader);
    assert.ok(await a.evaluate(() => !!document.activeElement.offsetParent), 'leadership changes never leave focus in hidden controls');
    await navigate(b, 'mode/' + weekly); await pad(b, 0);
    assert.equal(await b.locator('#lobbyAdventure').inputValue(), weekly);
    assert.deepEqual(await b.locator('#lobbyAdventure option').evaluateAll(options => options.map(o => o.value)), adventures);
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
    await pad(a, 1);   // the run's summary closes into the lobby
    assert.equal(await a.evaluate(() => document.getElementById('runSummary').hidden && multiplayer.panelOpen), true, 'B closes the summary');
    await pad(a, 1);
    assert.equal(await a.evaluate(() => multiplayer.connected), false, 'B leaves idle lobby for main menu');
    assert.deepEqual(errors, []);
    console.log('Lobby controller: stick/D-pad, held repeat, mode list, roster focus, leader transfer, start, resume, return and leave passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
