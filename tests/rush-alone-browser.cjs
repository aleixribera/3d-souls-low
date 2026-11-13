'use strict';
// Boss Rush is you against the bosses (pass 52, PLAN.md track B item 9): the lobby offers no bot, a run started alone
// stays alone (no bot joins, none is drawn), and alone, a fall ends the run on the end-of-run screen.
// (Two people: tests/calling-browser.cjs.) node tests/rush-alone-browser.cjs [screenshot directory]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');
const { config: C } = require('../js/net-protocol.js');
(async () => {
  const shots = process.argv[2] || '.scratch/rush-alone', app = createServer({ dev: true }), errors = [];
  fs.mkdirSync(shots, { recursive: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 }));
      localStorage.setItem('combatArena.onlineName', 'Ash');
    });
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await page.waitForFunction(() => multiplayer.connected);
    // The lobby: Boss Rush by default, and nothing anywhere adds a bot.
    assert.equal(await page.locator('#lobbyAdventure').inputValue(), 'calling/' + C.calling.id, 'Boss Rush is the default');
    assert.equal(await page.locator('#publicLobby button', { hasText: /bot/i }).count(), 0, 'no button adds a bot');
    assert.equal(await page.locator('#lobbyPlayers .lobby-player').count(), 1, 'the party is Ash alone');
    assert.equal(await page.locator('#lobbyStart').textContent(), 'Start', 'alone, not "together"');
    await page.waitForFunction(() => document.querySelector('.lobby-card').getAnimations().every(a => a.playState === 'finished'));
    await page.screenshot({ path: path.join(shots, 'lobby-alone-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(shots, 'lobby-alone-phone.png') });
    await page.setViewportSize({ width: 1280, height: 720 });
    // Alone into the run: no bot joins it, and none is drawn beside the player.
    await page.locator('#lobbyStart').click();
    await page.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive && multiplayer.info.receivedFrames > 2, null, { timeout: 90000 });
    assert.equal(app.session.gauntlet.id, C.calling.id);
    assert.equal(app.sim.botList().length, 0, 'no bot fills the party');
    assert.equal(app.sim.inspect().bots.size, 0, 'the server simulates no bot');
    assert.equal(await page.evaluate(() => multiplayer.info.players.length), 1);
    assert.equal(await page.locator('.online-name').count(), 0, 'no teammate is drawn');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(shots, 'fight-alone.png') });
    // Alone, a fall ends the run.
    app.sim.arenaWipeDelay = 0.1;
    await page.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    await page.locator('#runSummary').waitFor({ timeout: 30000 });
    assert.equal(await page.locator('#runSummaryTitle').textContent(), 'You fell');
    assert.equal(await page.locator('#runSummaryRows tr').count(), 1, 'the end of the run lists Ash alone');
    assert.equal(app.session, null);
    assert.match(await page.locator('#lobbyNotice').textContent(), /^YOU FELL · /, 'the lobby says it plainly too');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(shots, 'summary-alone.png') });
    assert.deepEqual(errors, [], 'no page errors');
    console.log('Boss Rush alone: no bot in the lobby or the run, a fall ends the run passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exit(1); });
