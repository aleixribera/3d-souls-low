'use strict';
// "New version — Reload" (v7.61.0, js/version-check.js): a page left open on an older build learns from /api/lobby that
// the server runs a newer one, and the title and the pause menu offer a reload. It asks off the title too, without
// touching play; the button loads the new build; a page with no lobby behind it shows nothing and stops asking.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`;
  const out = '.scratch/version-notice';
  fs.mkdirSync(out, { recursive: true });
  const OLD = 'v0.0.1';
  // An older page: the server's own files, with an older VERSION in js/config.js and as the changelog's first entry
  // (validation holds the two together).
  const OLD_FILES = [['**/js/config.js*', /const VERSION = 'v[\d.]+'/, `const VERSION = '${OLD}'`],
                     ['**/js/data/changelog.js*', /version: 'v[\d.]+'/, `version: '${OLD}'`]];
  async function serveOld(page) {
    for (const [glob, from, to] of OLD_FILES) await page.route(glob, async route => {
      const response = await route.fetch(), body = await response.text();
      assert.match(body, from);
      await route.fulfill({ status: 200, contentType: 'text/javascript', body: body.replace(from, to) });
    });
  }
  const serveNew = page => Promise.all(OLD_FILES.map(([glob]) => page.unroute(glob)));
  async function open({ old = true, viewport = { width: 1280, height: 720 }, before } = {}) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 })));
    if (old) await serveOld(page);
    if (before) await before(page);
    await page.goto(url);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    return page;
  }
  const last = page => page.evaluate(() => { const it = Game.menuItems[Game.menuItems.length - 1], b = Game.menuButtons[Game.menuButtons.length - 1];
    return { name: it.name, size: it.size, desc: it.desc, cls: b.className, text: b.textContent }; });
  const updateButtons = page => page.locator('#menuList .menuBtn.update, #menuFootActions .title-update').count();
  try {
    // 1. The title of an older page: the button appears last, the selection stays on what the lobby chose.
    const a = await open();
    assert.equal(await a.evaluate(() => VERSION), OLD);
    await a.waitForFunction(() => versionCheck.newer && multiplayer.lobby.state === 'online', null, { timeout: 20000 });
    await a.waitForFunction(() => document.querySelector('#menuFootActions .title-update'));
    let it = await last(a);
    assert.equal(it.name, 'New version — Reload');
    assert.match(it.desc, /Version 7\.\d+\.\d+ is out; this page runs 0\.0\.1\./);
    assert.equal(await a.evaluate(() => Game.menuItems[Game.selected].name), 'Boss Rush', 'the title still opens on Boss Rush');
    // Keyboard: up from the first mode wraps to the footer, whose last entry is the button; down goes back to the first mode.
    await a.evaluate(() => Game.select(0));
    await a.keyboard.press('ArrowUp'); await a.keyboard.press('ArrowLeft');
    assert.equal(await a.evaluate(() => Game.menuItems[Game.selected].size), 'update');
    await a.screenshot({ path: `${out}/title-desktop.png` });
    await a.keyboard.press('ArrowDown');
    assert.equal(await a.evaluate(() => Game.selected), 0);
    // 2. Pause, in a Practice fight: the same button, last, saying what reloading does here.
    await a.evaluate(() => Game.startFight(ENEMY_DEFS.find(d => !isBossDef(d)).id));
    await a.waitForFunction(() => Game.mode === 'play', null, { timeout: 60000 });
    await a.evaluate(() => Game.pause());
    await a.waitForFunction(() => Game.screen === 'pause');
    it = await last(a);
    assert.equal(it.name, 'New version — Reload');
    assert.match(it.desc, /ends this fight/);
    assert.equal(await a.evaluate(() => Game.menuItems[0].name), 'Resume');
    await a.evaluate(() => Game.select(Game.menuItems.length - 1));
    await a.screenshot({ path: `${out}/pause-desktop.png` });
    // 3. The button loads the new build: the reload gets the server's own files, and nothing is offered any more.
    await serveNew(a);
    await Promise.all([a.waitForEvent('load', { timeout: 60000 }), a.keyboard.press('Enter')]);
    await a.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    assert.notEqual(await a.evaluate(() => VERSION), OLD, 'the reload loaded the new build');
    await a.waitForFunction(() => multiplayer.lobby.state === 'online', null, { timeout: 20000 });
    assert.equal(await a.evaluate(() => versionCheck.newer), null);
    assert.equal(await updateButtons(a), 0);
    await a.close();
    // 4. Off the title: a page that learned nothing on the title asks again on its own timer, mid-fight, and play goes on.
    let serverVersion = 'old';
    const b = await open({ before: page => page.route('**/api/lobby', async route => {
      const response = await route.fetch(), info = await response.json();
      if (serverVersion === 'old') info.version = OLD;
      await route.fulfill({ status: 200, json: info });
    }) });
    await b.waitForFunction(() => multiplayer.lobby.state === 'online', null, { timeout: 20000 });
    assert.equal(await b.evaluate(() => versionCheck.newer), null, 'same version: nothing to offer');
    await b.evaluate(() => Game.startFight(ENEMY_DEFS.find(d => !isBossDef(d)).id));
    await b.waitForFunction(() => Game.mode === 'play', null, { timeout: 60000 });
    await b.evaluate(() => { CONFIG.versionCheck.interval = 0.3; versionCheck.ask(); });
    serverVersion = 'new';
    await b.waitForFunction(() => versionCheck.newer, null, { timeout: 10000 });
    assert.equal(await b.evaluate(() => Game.mode), 'play', 'learning of a new version does not stop play');
    await b.evaluate(() => Game.pause());
    await b.waitForFunction(() => Game.screen === 'pause');
    assert.equal((await last(b)).name, 'New version — Reload');
    await b.close();
    // 5. Phone width: the title's button fits on screen, no sideways scrolling.
    const phone = await open({ viewport: { width: 375, height: 667 } });
    await phone.waitForFunction(() => document.querySelector('#menuFootActions .title-update'), null, { timeout: 20000 });
    const fit = await phone.evaluate(() => { const r = document.querySelector('#menuFootActions .title-update').getBoundingClientRect();
      return { scroll: document.documentElement.scrollWidth, left: r.left, right: r.right, bottom: r.bottom, height: innerHeight }; });
    assert.ok(fit.scroll <= 375 && fit.left >= 0 && fit.right <= 375 && fit.bottom <= fit.height, `phone layout fits: ${JSON.stringify(fit)}`);
    await phone.screenshot({ path: `${out}/title-phone.png` });
    await phone.evaluate(() => { Game.startFight(ENEMY_DEFS.find(d => !isBossDef(d)).id); });
    await phone.waitForFunction(() => Game.mode === 'play', null, { timeout: 60000 });
    await phone.evaluate(() => { Game.pause(); Game.select(Game.menuItems.length - 1); });
    await phone.screenshot({ path: `${out}/pause-phone.png` });
    await phone.close();
    // 6. No lobby behind the page (a static host): nothing shown, and it stops asking.
    let asked = 0;
    const c = await open({ old: true, before: page => page.route('**/api/lobby', route => { asked++; return route.fulfill({ status: 404, contentType: 'text/html', body: 'Not found' }); }) });
    await c.waitForFunction(() => multiplayer.lobby.state === 'absent', null, { timeout: 20000 });
    const seen = asked;
    await c.evaluate(() => { CONFIG.versionCheck.interval = 0.2; return versionCheck.ask(); });
    await c.waitForTimeout(800);
    assert.equal(asked, seen + 1, `asks once more at most, then stops (${seen} → ${asked})`);
    assert.equal(await c.evaluate(() => versionCheck.newer), null);
    assert.equal(await updateButtons(c), 0);
    await c.close();
    assert.deepEqual(errors, []);
    console.log('Version notice: title and pause buttons on an older page, keyboard reach, reload to the new build, off-title check during play, phone layout and no-lobby silence passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
