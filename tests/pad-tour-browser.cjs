'use strict';
// A controller-only tour (no mouse, no keyboard), driven through a stubbed navigator.getGamepads so the real poll runs
// every frame: two pads connected, a Steam-style virtual Xbox pad at index 0 that stays idle and a DualShock 4 at index
// 1 that does everything. Walks the first screen to a Boss Rush run alone and back out, checks a visible focus ring and
// PlayStation glyphs on the way. ARENA_TOUR_SHOTS=<dir> saves a screenshot of each stop. ARENA_TOUR_SIZE=1920x1080.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');

const [W, H] = (process.env.ARENA_TOUR_SIZE || '1920x1080').split('x').map(Number);
const SHOTS = process.env.ARENA_TOUR_SHOTS || null;
const B = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, share: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 };

(async () => {
  const app = createServer({ dev: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true }), errors = [];
  const context = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'bare', volume: 0 }));
    localStorage.setItem('combatArena.sparring', JSON.stringify({ done: true }));
    localStorage.setItem('combatArena.onlineName', 'Pad');
    const pad = (index, id) => ({ index, id, connected: true, mapping: 'standard', timestamp: 0,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] });
    // The virtual pad Steam adds sits first and never moves; the real DualShock is second.
    window.__pads = [pad(0, 'Xbox 360 Controller (XInput STANDARD GAMEPAD)'),
      pad(1, 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)')];
    navigator.getGamepads = () => window.__pads.map(p => p && { ...p, buttons: p.buttons.map(b => ({ ...b })), axes: [...p.axes] });
  });
  const frames = n => page.evaluate(n => new Promise(r => { let k = 0; const f = () => ++k >= n ? r() : requestAnimationFrame(f); requestAnimationFrame(f); }), n);
  // A press: the button down for a few frames, then up for a few.
  async function press(name, which = 1) {
    await page.evaluate(({ b, which }) => { const p = window.__pads[which]; p.buttons[b] = { pressed: true, touched: true, value: 1 }; p.timestamp = performance.now(); }, { b: B[name], which });
    await frames(4);
    await page.evaluate(({ b, which }) => { const p = window.__pads[which]; p.buttons[b] = { pressed: false, touched: false, value: 0 }; p.timestamp = performance.now(); }, { b: B[name], which });
    await frames(4);
  }
  async function stick(axes, ms, which = 1) {
    await page.evaluate(({ axes, which }) => { const p = window.__pads[which]; p.axes = axes; p.timestamp = performance.now(); }, { axes, which });
    await page.waitForTimeout(ms);
    await page.evaluate(which => { const p = window.__pads[which]; p.axes = [0, 0, 0, 0]; p.timestamp = performance.now(); }, which);
    await frames(4);
  }
  const state = () => page.evaluate(() => ({ mode: Game.mode, screen: Game.screen, device: input.device,
    focus: document.activeElement && (document.activeElement.id || document.activeElement.textContent.trim().slice(0, 40)),
    selected: Game.menuItems && Game.menuItems[Game.selected] && Game.menuItems[Game.selected].name,
    lobby: multiplayer.panelOpen, connected: multiplayer.connected }));
  let shot = 0;
  async function stop(name) {
    const s = await state();
    console.log(name.padEnd(28), JSON.stringify(s));
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${String(++shot).padStart(2, '0')}-${name}.png`), timeout: 120000 }); }
    return s;
  }
  // Down the current menu until `name` is selected.
  async function menuTo(name) {
    for (let i = 0; i < 30; i++) { if ((await state()).selected === name) return; await press('down'); }
    throw new Error('the pad cannot reach ' + name);
  }
  try {
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await frames(10);
    await stop('title');
    await press('down'); await press('up');
    let s = await stop('title-after-pad');
    assert.equal(s.device, 'pad', 'the DualShock at index 1 is read although an idle pad sits at index 0');
    const glyph = await page.evaluate(() => [...document.querySelectorAll('#menuHint .ui-key')].map(k => k.textContent).join(' '));
    assert.match(glyph, /✕/, 'PlayStation glyphs on the title hints: ' + glyph);
    // Options and back.
    await menuTo('Options'); await press('cross'); await stop('options');
    await press('down'); await press('right'); await stop('options-changed');
    await press('circle'); await press('circle'); s = await stop('back-to-title');
    assert.equal(s.screen, 'main', 'Circle backs out of a setting, then out of Options');
    if (W >= 1600) assert.ok(await page.evaluate(() => document.documentElement.classList.contains('couch')), 'menus grow on a TV once the pad is in use');
    // Boss Rush alone: the lead entry, at the top.
    for (let i = 0; i < 10 && !(await page.evaluate(() => Game.menuItems[Game.selected].lead)); i++) await press('up');
    await press('cross');
    await page.waitForFunction(() => multiplayer.connected && multiplayer.panelOpen, null, { timeout: 60000 });
    await frames(10);
    s = await stop('lobby');
    assert.equal(s.focus, 'lobbyStart');
    await press('cross');   // Start
    await page.waitForFunction(() => Game.mode === 'play' && !multiplayer.panelOpen && Game.loading <= 0 && multiplayer.abilityOpen, null, { timeout: 90000 });
    await frames(10);
    await stop('ability-pick');
    // The game menu over the pick: the pick steps aside, Circle closes the menu, the pick comes back.
    await press('options');
    s = await stop('menu-over-pick');
    assert.equal(s.mode, 'pause');
    assert.equal(await page.evaluate(() => multiplayer.abilityOpen), false, 'the game menu hides the ability pick');
    await press('circle');
    s = await state();
    assert.equal(s.mode, 'play', 'Circle closes the game menu');
    assert.equal(await page.evaluate(() => multiplayer.abilityOpen), true, 'the pick is back');
    await press('right'); await press('cross'); await press('down');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'abilityConfirm');
    await press('cross');
    await page.waitForFunction(() => !multiplayer.abilityOpen, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const at = await page.evaluate(() => ({ x: Game.player.x, z: Game.player.z, yaw: Game.cam.yaw }));
    await stick([0, -1, 0, 0], 700);   // left stick forward
    await stick([0, 0, 1, 0], 400);    // right stick: the camera turns
    const moved = await page.evaluate(() => ({ x: Game.player.x, z: Game.player.z, yaw: Game.cam.yaw }));
    assert.ok(Math.hypot(moved.x - at.x, moved.z - at.z) > 0.5, 'the left stick walks');
    s = await stop('in-run');
    // Attacks on the face buttons and shoulders reach the player's state machine.
    const states = [];
    for (const b of ['r1', 'r2', 'l1', 'circle', 'cross']) { await press(b); states.push(await page.evaluate(() => Game.player.state)); await page.waitForTimeout(500); }
    console.log('states after R1 R2 L1 Circle Cross:', states.join(' '));
    await stop('in-run-after-attacks');
    await press('options');
    s = await stop('game-menu');
    assert.equal(s.mode, 'pause');
    await press('circle');
    assert.equal((await state()).mode, 'play', 'Circle resumes');
    // A death ends a run alone: the summary, walked by pad back to the title.
    await page.evaluate(() => { Game.player.hp = 0; Game.player.die(); });
    await page.waitForFunction(() => !document.getElementById('runSummary').hidden, null, { timeout: 60000 });
    await frames(10);
    s = await stop('run-summary');
    const keys = await page.evaluate(() => document.getElementById('runSummaryLobbyKey').textContent);
    assert.equal(keys, '◯', 'Circle glyph on the summary');
    await press('down');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'runSummaryLobby');
    await press('cross');   // online the summary's way out is the lobby
    await page.waitForFunction(() => multiplayer.panelOpen && document.getElementById('runSummary').hidden, null, { timeout: 30000 });
    await frames(10);
    await stop('lobby-after-run');
    await press('circle');   // and Circle leaves the lobby for the title
    await page.waitForFunction(() => Game.mode === 'menu' && Game.screen === 'main' && !multiplayer.panelOpen, null, { timeout: 30000 });
    await frames(10);
    await stop('back-at-title');
    assert.deepEqual(errors, [], 'no page errors');
  } finally {
    console.log('errors:', errors.length ? errors : 'none');
    await browser.close(); app.server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
