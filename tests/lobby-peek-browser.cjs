'use strict';
// The title screen's online card (v7.19.0): it reads /api/lobby while the title shows, so a friend who opens the link
// sees that others are playing right now, and what. Polls only on the title; dims when the lobby does not answer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`;
  fs.mkdirSync('.scratch/lobby-peek', { recursive: true });
  async function open(name, viewport = { width: 1280, height: 720 }) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(name => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 }));
      localStorage.setItem('combatArena.onlineName', name);
    }, name);
    await page.goto(url);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.evaluate(() => { CONFIG.titleLobby.interval = 0.3; multiplayer.peek(); });
    return page;
  }
  const badge = page => page.locator('#menuList .menuBtn.hero .b');
  const card = page => page.locator('#menuList .menuBtn.hero').first();
  try {
    const a = await open('Ash');
    await a.waitForFunction(() => multiplayer.lobby.state === 'online');
    assert.match(await badge(a).first().textContent(), /Nobody inside yet/);
    assert.equal(await a.evaluate(() => [Game.menuItems[0].name, Game.menuItems[1].name, Game.selected].join()), 'Play Online,Story,0', 'the online card comes first, and is chosen when the lobby answers');
    assert.match(await card(a).getAttribute('aria-label'), /Join public lobby/);
    // A friend joins and starts a run: the card says so, without the title being touched.
    const b = await open('Birch');
    await b.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await b.waitForFunction(() => multiplayer.connected);
    await a.waitForFunction(() => /1 playing now/.test(document.querySelector('#menuList .menuBtn.hero .b').textContent));
    assert.equal(await badge(a).first().getAttribute('data-state'), 'live');
    await b.locator('#lobbyAdventure').selectOption('campaign/ashmere');
    await b.locator('#lobbyStart').click();
    await a.waitForFunction(() => /Ashmere · /.test(document.querySelector('#menuList .menuBtn.hero .b').textContent), null, { timeout: 15000 });
    await a.screenshot({ path: '.scratch/lobby-peek/title-live.png' });
    // Off the title it stops asking.
    let asked = 0;
    a.on('request', r => { if (r.url().endsWith('/api/lobby')) asked++; });
    await a.getByRole('button', { name: 'Options', exact: true }).click();
    await a.waitForTimeout(1200);
    const offTitle = asked;
    assert.ok(offTitle <= 1, `no polling off the title (${offTitle})`);
    await a.evaluate(() => Game.showMenu('main'));
    await a.waitForTimeout(1200);
    assert.ok(asked > offTitle, 'polling resumes on the title');
    // The lobby stops answering: the card dims and says so; Story becomes the one to pick.
    await a.route('**/api/lobby', route => route.abort());
    await a.waitForFunction(() => multiplayer.lobby.state === 'offline');
    assert.match(await badge(a).first().textContent(), /not answering/);
    assert.equal(await card(a).evaluate(el => el.classList.contains('offline')), true);
    await a.unroute('**/api/lobby');
    // Phone width: both cards and the row fit without sideways scrolling.
    const phone = await open('Cedar', { width: 375, height: 667 });
    await phone.waitForFunction(() => multiplayer.lobby.state === 'online');
    const fit = await phone.evaluate(() => ({ scroll: document.documentElement.scrollWidth, boxes: [...document.querySelectorAll('#menuList .menuBtn')].map(b => b.getBoundingClientRect()).map(r => [r.left, r.right]) }));
    assert.ok(fit.scroll <= 375 && fit.boxes.every(([l, r]) => l >= 0 && r <= 375), `phone layout fits: ${JSON.stringify(fit)}`);
    await phone.screenshot({ path: '.scratch/lobby-peek/title-phone.png' });
    assert.deepEqual(errors, []);
    console.log('Lobby peek: title card count and run name, online-first focus, polling only on the title, offline dimming and phone layout passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
