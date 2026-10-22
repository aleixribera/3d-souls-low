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
  const ready = p => p.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && multiplayer.info.receivedFrames > 2,
    null, { timeout: 90000 });
  const die = p => p.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
  const target = (p, id) => p.waitForFunction(id => multiplayer.info.spectatorTarget === id, id);
  async function freezeView(p, x) {
    return p.evaluate(x => {
      Game.manualClock = true;
      camera.position.set(x, 6, 14); camera.lookAt(0, 2, 0); camera.fov = 64 + x; camera.updateProjectionMatrix();
      multiplayer.captureView();
      return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
    }, x);
  }
  async function matchesView(p, view) {
    await p.waitForFunction(v => camera.position.toArray().every((n, i) => Math.abs(n - v.position[i]) < 0.003)
      && Math.abs(camera.quaternion.dot(new THREE.Quaternion().fromArray(v.quaternion))) > 0.99999 && Math.abs(camera.fov - v.fov) < 0.003, view);
  }
  const pad = (p, index) => p.evaluate(index => {
    const read = gamepad.read;
    try {
      gamepad.read = () => ({ buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === index, value: i === index ? 1 : 0 })), axes: [0, 0, 1, 0] });
      gamepad.poll(CONFIG.step);
    } finally { gamepad.read = read; gamepad.release(); }
  }, index);
  try {
    const a = await player('Observer'), b = await player('Knight'), c = await player('Tarnished');
    await a.locator('#lobbyAdventure').selectOption('arena/margit'); await a.locator('#lobbyStart').click();
    await Promise.all([ready(a), ready(b), ready(c)]);
    for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    const bId = await b.evaluate(() => multiplayer.info.self), cId = await c.evaluate(() => multiplayer.info.self);
    const bView = await freezeView(b, 3), cView = await freezeView(c, -3);
    await die(a); await target(a, bId); await matchesView(a, bView);
    assert.equal(await a.locator('#spectatorName').textContent(), 'Knight');
    assert.equal(await a.locator('#onlineSpectator').isVisible(), true);
    assert.equal(await a.locator('#died').isVisible(), false, 'death overlay does not cover the shared view');
    assert.equal(await a.evaluate(() => getComputedStyle(canvas).filter), 'none', 'spectator view keeps normal colour');
    await a.locator('#spectatorNext').click(); await target(a, cId); await matchesView(a, cView);
    await a.locator('#spectatorPrevious').click(); await target(a, bId);
    await a.keyboard.press('ArrowRight'); await target(a, cId);
    await a.keyboard.press('Tab');
    assert.equal(await a.locator('#spectatorControls').isVisible(), false);
    assert.equal(await a.locator('#spectatorToggle').isVisible(), true);
    await matchesView(a, cView);
    await a.locator('#spectatorToggle').click();
    await pad(a, 4); await target(a, bId); // LB / L1
    await pad(a, 5); await target(a, cId); // RB / R1
    await pad(a, 2); // X / Square
    assert.equal(await a.locator('#spectatorControls').isVisible(), false);
    await pad(a, 2);
    assert.equal(await a.locator('#spectatorControls').isVisible(), true);
    await matchesView(a, cView); // right-stick input cannot alter the relayed view
    await a.keyboard.press('Escape');
    await a.getByRole('button', { name: 'Options', exact: true }).click();
    assert.equal(await a.evaluate(() => Game.screen), 'options', 'spectators can access Options');
    await a.keyboard.press('Escape');
    await a.keyboard.press('Escape');
    await pad(a, 9);
    await a.getByRole('button', { name: /^Lobby(?:Players|$)/ }).click();
    await a.locator('#publicLobby:not(.hidden)').waitFor();
    assert.equal(await a.locator('#onlineSpectator').isVisible(), false);
    await pad(a, 1); await a.locator('#onlineSpectator').waitFor({ state: 'visible' });
    await a.setViewportSize({ width: 390, height: 740 });
    assert.ok(await a.locator('#onlineSpectator').evaluate(el => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth));
    fs.mkdirSync('.scratch/spectator', { recursive: true });
    await a.screenshot({ path: '.scratch/spectator/narrow.png' });
    await a.setViewportSize({ width: 1280, height: 720 });
    await a.screenshot({ path: '.scratch/spectator/view.png' });
    await die(c); await target(a, bId); await matchesView(a, bView);
    assert.equal(await a.locator('#spectatorNext').isDisabled(), true, 'dead teammates are excluded');
    await b.evaluate(() => multiplayer.leave());
    await a.waitForFunction(() => multiplayer.info.spectatorTarget === null);
    const epoch = app.session.epoch;
    await c.evaluate(() => { Game.manualClock = false; });
    await a.waitForFunction(epoch => multiplayer.info.session.epoch > epoch, epoch, { timeout: 20000 });
    await Promise.all([ready(a), ready(c)]);
    assert.equal(await a.locator('#onlineSpectator').isVisible(), false, 'fresh attempt exits spectator mode');
    assert.equal(await a.evaluate(() => multiplayer.spectating), false);
    assert.equal(await a.evaluate(() => Game.player.alive()), true);
    assert.equal(await a.evaluate(() => camera.fov), await a.evaluate(() => CONFIG.camera.fov));
    await a.evaluate(() => multiplayer.show());
    await a.locator('#lobbyAdventure').selectOption('level/long-hall'); await a.locator('#lobbyStart').click();
    await Promise.all([ready(a), ready(c)]);
    for (const e of app.sim.inspect().Game.enemies) e.update = () => {};
    await die(a);
    assert.equal(await a.evaluate(() => multiplayer.spectatorMode), false, 'normal level deaths keep their personal respawn');
    assert.deepEqual(errors, []);
    console.log('Spectator browsers: exact relayed camera, automatic entry, clicks, keyboard, controller, bar toggle, narrow layout, target death/disconnect, team reset and normal level deaths passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
