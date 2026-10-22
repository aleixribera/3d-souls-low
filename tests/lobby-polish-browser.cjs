'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
const WS = require('../server/node_modules/ws');
const { build } = require('../server/headless.cjs');
const { config: C } = require('../js/net-protocol.js');
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`;
  fs.mkdirSync('.scratch/lobby-polish', { recursive: true });
  async function player(name) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
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
  const ready = p => p.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && multiplayer.info.receivedFrames > 2, null, { timeout: 90000 });
  const visibleAction = page => page.locator('#lobbyStart').evaluate(node => {
    const r = node.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
  });
  try {
    const a = await player('Ash');
    assert.equal(await a.locator('#lobbyControls').isVisible(), false, 'help starts collapsed');
    assert.equal(await a.locator('#lobbyRunActions').isVisible(), false, 'idle lobby hides unavailable run actions');
    assert.ok(await visibleAction(a), 'start is visible without scrolling on desktop');
    await a.waitForFunction(() => document.querySelector('.lobby-card').getAnimations().every(a => a.playState === 'finished'));
    await a.screenshot({ path: '.scratch/lobby-polish/lobby-desktop.png' });
    await a.setViewportSize({ width: 390, height: 740 });
    assert.ok(await visibleAction(a), 'start stays above the fold in a narrow window');
    assert.ok(await a.locator('.lobby-card').evaluate(node => node.scrollWidth <= node.clientWidth), 'narrow layout has no horizontal scroll');
    await a.screenshot({ path: '.scratch/lobby-polish/lobby-narrow.png' });
    for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1920, height: 1080 }]) {
      await a.setViewportSize(viewport);
      assert.ok(await visibleAction(a), `start stays visible at ${viewport.width} × ${viewport.height}`);
      assert.ok(await a.locator('.lobby-card').evaluate(node => node.scrollWidth <= node.clientWidth));
    }
    await a.setViewportSize({ width: 1280, height: 720 });
    await a.locator('#lobbyHelp').click();
    assert.equal(await a.locator('#lobbyHelp').getAttribute('aria-expanded'), 'true');
    assert.equal(await a.locator('#lobbyTalkKey').textContent(), await a.evaluate(() => keycap(bindLabel('talk'))), 'talk uses its own binding');
    await a.keyboard.press('Escape');
    assert.equal(await a.locator('#lobbyControls').isVisible(), false, 'Escape dismisses help first');
    assert.equal(await a.evaluate(() => multiplayer.connected), true);
    await a.locator('#lobbyOptions').click();
    assert.equal(await a.evaluate(() => Game.screen), 'options');
    await a.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await a.locator('#publicLobby').isVisible(), true, 'Options Back returns to the idle lobby');
    await a.locator('#lobbyOptions').click(); await a.keyboard.press('Escape');
    assert.equal(await a.locator('#publicLobby').isVisible(), true, 'Options Escape also returns to lobby');
    await a.locator('#lobbyLeave').focus(); await a.keyboard.press('Tab');
    assert.equal(await a.evaluate(() => document.activeElement.id), 'lobbyAdventure', 'Tab wraps inside the dialog');
    await a.keyboard.press('Shift+Tab');
    assert.equal(await a.evaluate(() => document.activeElement.id), 'lobbyLeave');
    await a.evaluate(() => document.activeElement.blur()); await a.keyboard.press('Shift+Tab');
    assert.equal(await a.evaluate(() => document.activeElement.id), 'lobbyLeave', 'backward Tab enters at the last control when focus was lost');
    const b = await player('Ember');
    await a.waitForFunction(() => multiplayer.info.players.length === 2);
    assert.equal(await b.locator('#lobbyWaiting').isVisible(), true, 'guest gets an explanation in place of leader controls');
    const guests = await Promise.all(Array.from({ length: C.defaultCapacity - 2 }, (_, i) => new Promise((resolve, reject) => {
      const ws = new WS(`ws://127.0.0.1:${app.server.address().port}/lobby`, { origin: new URL(url).origin });
      ws.on('error', reject);
      ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', protocol: C.protocol, build, name: `Wanderer of Ashmere ${i + 1}` })));
      ws.on('message', raw => { if (JSON.parse(raw).type === 'welcome') resolve(ws); });
    })));
    await a.waitForFunction(capacity => multiplayer.info.players.length === capacity, C.defaultCapacity);
    assert.ok(await visibleAction(a), 'a full party never pushes Start out of view');
    await a.screenshot({ path: '.scratch/lobby-polish/full-party.png' });
    for (const ws of guests) ws.close(1000, 'Left lobby');
    await a.waitForFunction(() => multiplayer.info.players.length === 2);
    assert.equal(await a.locator('#lobbyPlayers .lobby-player-actions button').first().isVisible(), false);
    await a.locator('#lobbyName').focus();
    await a.locator('#lobbyName').evaluate(node => node.setSelectionRange(1, 2));
    await b.locator('#lobbyName').fill('A very long teammate name'); await b.locator('#lobbyName').dispatchEvent('change');
    await a.waitForFunction(() => multiplayer.info.players.some(p => p.name === 'A very long teammate name'.slice(0, 24)));
    assert.deepEqual(await a.locator('#lobbyName').evaluate(node => [document.activeElement === node, node.selectionStart, node.selectionEnd]), [true, 1, 2], 'roster update preserves keyboard focus and selection');
    await a.locator('#lobbyManage').click();
    assert.equal(await a.locator('#lobbyPlayers .lobby-player-actions button').first().isVisible(), true);
    await a.locator('#lobbyStart').click();
    await Promise.all([ready(a), ready(b)]);
    for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    const epoch = app.session.epoch;
    await a.evaluate(() => { input.use('pad'); input.use('keyboard'); });
    assert.match(await a.locator('#wonHint').textContent(), /Next boss incoming/, 'device changes retain the run victory instructions');
    assert.equal(await a.locator('#helpTable tr').filter({ hasText: /^Restart/ }).count(), 0, 'online help never promises a personal restart');
    assert.equal(await a.locator('#helpTable tr').filter({ hasText: /^Lobby/ }).count(), 1, 'online help names the lobby shortcut');
    await a.waitForFunction(() => !document.getElementById('onlineParty').hidden);
    await a.screenshot({ path: '.scratch/lobby-polish/combat.png' });
    for (const quality of ['high', 'ultra', 'low']) {
      await a.evaluate(quality => { settings.graphics = quality; applySettings(); }, quality);
      await a.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await a.evaluate(() => multiplayer.active() && Game.mode === 'play'), true, 'preset changes preserve online play');
      assert.deepEqual(await a.evaluate(() => { const gl = renderer.getContext(); gl.finish(); return { lost: gl.isContextLost(), error: gl.getError() }; }),
        { lost: false, error: 0 }, `${quality} renders online without WebGL errors`);
      if (quality !== 'low') await a.screenshot({ path: `.scratch/lobby-polish/combat-${quality}.png` });
    }
    await a.keyboard.press('Escape');
    assert.equal(await a.locator('#menuTitle').textContent(), 'ONLINE', 'online menu never implies a paused world');
    await a.waitForFunction(() => document.getElementById('onlineParty').hidden);
    await a.keyboard.press('Escape');
    await a.evaluate(() => multiplayer.show()); await a.locator('#lobbyOptions').click();
    await a.keyboard.press('Escape'); await a.locator('#lobbyResume').click();
    assert.equal(app.session.epoch, epoch, 'lobby Options never replaces the run');
    await a.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    await a.waitForFunction(() => multiplayer.spectating);
    const sound = await a.evaluate(() => {
      const listener = multiplayer.listener;
      const atListener = { ...audio.space({ x: listener.x, y: listener.y, z: listener.z }) };
      audio.unlock(); audio.watchWorld(audio.ctx.currentTime);
      return { isRemote: listener !== Game.player, gain: atListener.gain, mood: audio.mood };
    });
    assert.equal(sound.isRemote, true); assert.equal(sound.gain, 1); assert.equal(sound.mood, 'open', 'spectating restores full-range teammate audio');
    const bId = await b.evaluate(() => multiplayer.info.self);
    await a.waitForFunction(id => document.querySelector(`.online-name[data-player-id="${id}"]`)?.hidden, bId);
    await a.screenshot({ path: '.scratch/lobby-polish/spectator.png' });
    await a.evaluate(() => multiplayer.leave()); await b.evaluate(() => multiplayer.leave());
    await a.route('**/api/lobby', route => route.abort());
    await a.evaluate(() => multiplayer.join());
    await a.locator('#lobbyRetry').waitFor();
    assert.match(await a.locator('#lobbyStatus').textContent(), /Could not reach/);
    await a.unroute('**/api/lobby'); await a.locator('#lobbyRetry').click();
    await a.waitForFunction(() => multiplayer.connected);
    await a.evaluate(() => multiplayer.leave());
    await a.route('**/api/lobby', async route => {
      const response = await route.fetch(), body = await response.json();
      await route.fulfill({ json: { ...body, version: 'v0.0.0' } });
    });
    await a.evaluate(() => multiplayer.join());
    await a.locator('#lobbyRetry').waitFor();
    assert.equal(await a.locator('#lobbyRetry').textContent(), 'Reload game', 'incompatible build offers the correct recovery action');
    assert.deepEqual(errors, []);
    console.log('Lobby polish: desktop/narrow layout, progressive help/management, keyboard focus, idle/live Options, online HUD, device labels, spectator audio, retry and reload passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
