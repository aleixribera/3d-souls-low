'use strict';
// The current frames (docs/scorecard/now/, PLAN.md "Process first"): one latest frame per screen, the only place judges,
// reviewers and the director look. A pass that changes a screen retakes it here under the same name.
// Usage: node tools/now-frames.cjs [lobby|rush|crate ...]   (no part = all). One headless Edge, closed at the end.
//   lobby-desktop / lobby-phone   the lobby, Boss Rush chosen
//   rush-fight                    a Boss Rush run started from the lobby, its first boss attacking
//   crate-roll                    a crate's roll landing on its reward
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const out = path.join(__dirname, '..', 'docs', 'scorecard', 'now');
const parts = process.argv.slice(2), want = p => !parts.length || parts.includes(p);
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 70 });

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const open = async (w, h, crates = 0) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    await page.addInitScript(crates => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false }));
      localStorage.setItem('combatArena.onlineName', 'Wanderer');   // past the name prompt
      if (crates) localStorage.setItem('arena.progress', JSON.stringify({ xp: 0, crates, owned: [], runs: [] }));
    }, crates);
    await page.goto(url); await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    return page;
  };
  const joinLobby = async page => {
    await page.evaluate(() => multiplayer.join());
    await page.waitForFunction(() => !document.getElementById('lobbyLeader').hidden, null, { timeout: 30000 });
    await page.waitForTimeout(800);
  };
  try {
    if (want('lobby')) for (const [w, h, tag] of [[1280, 720, 'desktop'], [390, 844, 'phone']]) {
      const page = await open(w, h); await joinLobby(page); await shot(page, `lobby-${tag}`); await page.close();
      console.log('lobby', tag);
    }
    if (want('rush')) {
      const page = await open(1280, 720); await joinLobby(page);
      await page.evaluate(() => { const s = document.getElementById('lobbyAdventure'); s.value = 'calling/boss-rush'; s.dispatchEvent(new Event('change', { bubbles: true })); });
      await page.locator('#lobbyStart').click();
      await page.waitForFunction(() => multiplayer.info.ready && multiplayer.info.receivedFrames > 2, null, { timeout: 90000 });
      await page.waitForTimeout(1500);
      // The opening card offer: pick the first card and confirm it (v7.160), as a player would.
      if (await page.locator('#abilityConfirm').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)) {
        await page.locator('button.bcard').first().click();
        await page.locator('#abilityConfirm').click();
        await page.locator('#abilityConfirm').waitFor({ state: 'hidden', timeout: 15000 });
      }
      // The world waits for the player (v7.160): a step forward wakes it.
      await page.keyboard.down('w'); await page.waitForTimeout(600); await page.keyboard.up('w');
      await page.waitForTimeout(3500);
      await shot(page, 'rush-fight'); await page.close();
      console.log('rush');
    }
    if (want('crate')) {
      const page = await open(1280, 720, 1);
      const rolled = await page.evaluate(() => crateScreen.roll());
      if (!rolled) throw new Error('no crate to open');
      await page.waitForFunction(() => !crateScreen.rolling, null, { timeout: 20000 });
      await page.waitForTimeout(600);
      await shot(page, 'crate-roll'); await page.close();
      console.log('crate');
    }
  } finally { await browser.close(); app.server.close(); }
  if (errors.length) { console.log('page errors:\n' + [...new Set(errors)].slice(0, 8).join('\n')); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exit(1); });
