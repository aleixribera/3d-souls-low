'use strict';
// Boss Rush is you against the bosses (pass 52, PLAN.md track B item 9): the lobby offers no bot, a run started alone
// stays alone (no bot joins, none is drawn), and alone, a fall ends the run on the end-of-run screen.
// The whole run is played from the gamepad alone (PLAN.md track B item 3): the title's Boss Rush, the lobby's Start,
// the ability pick and the end of the run. (Two people: tests/calling-browser.cjs; every lobby control by pad:
// tests/lobby-controller-browser.cjs.) node tests/rush-alone-browser.cjs [screenshot directory]
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
    // One press and release of a pad button (standard mapping: 0 A, 1 B, 13 down, 14 left, 15 right).
    const pad = button => page.evaluate(button => {
      const read = gamepad.read;
      input.suspended = false;   // a headless page may not have focus
      try {
        gamepad.read = () => ({ buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === button, value: i === button ? 1 : 0 })), axes: [0, 0, 0, 0] });
        gamepad.poll(CONFIG.step);
        gamepad.read = () => ({ buttons: [], axes: [0, 0, 0, 0] }); gamepad.poll(CONFIG.step);
      } finally { gamepad.read = read; gamepad.release(); }
    }, button);
    const focused = () => page.evaluate(() => document.activeElement.id || document.activeElement.dataset.ability || document.activeElement.dataset.padKey || '');
    // The title chooses Boss Rush once the lobby answers; A joins it.
    await page.waitForFunction(() => Game.screen === 'main' && Game.menuItems[Game.titleMode]?.name === 'Boss Rush' && Game.menuItems[Game.selected]?.name === 'Boss Rush');
    await pad(0);
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
    // Alone into the run, by pad: down to Start, A. No bot joins it, and none is drawn beside the player.
    for (let i = 0; i < 35 && await focused() !== 'lobbyStart'; i++) await pad(13);
    assert.equal(await focused(), 'lobbyStart', 'the pad reaches Start');
    await pad(0);
    await page.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive && multiplayer.info.receivedFrames > 2, null, { timeout: 90000 });
    assert.equal(app.session.gauntlet.id, C.calling.id);
    assert.equal(app.sim.botList().length, 0, 'no bot fills the party');
    assert.equal(app.sim.inspect().bots.size, 0, 'the server simulates no bot');
    assert.equal(await page.evaluate(() => multiplayer.info.players.length), 1);
    assert.equal(await page.locator('.online-name').count(), 0, 'no teammate is drawn');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(shots, 'fight-alone.png') });
    // The first boss falls: the ability pick, walked and taken by pad.
    for (const e of app.sim.inspect().Game.enemies) { e.hp = 0; e.die(); }
    await page.locator('#abilityScreen').waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.activeElement?.dataset?.ability);
    const cards = await page.locator('#abilityChoices button').evaluateAll(bs => bs.map(b => b.dataset.ability));
    assert.equal(await focused(), cards[0], 'the pick opens on the first card');
    await pad(15); assert.equal(await focused(), cards[1], 'right moves to the next card');
    await pad(14); await pad(14); assert.equal(await focused(), cards[cards.length - 1], 'left from the first wraps to the last');
    await pad(15); await pad(15);
    await pad(0);
    await page.locator('#abilityScreen').waitFor({ state: 'hidden', timeout: 30000 });
    await page.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.abilityPending && multiplayer.rush?.fight === 2, null, { timeout: 90000 });
    assert.deepEqual(await page.evaluate(() => Game.player.kit.ids), [cards[1]], 'A took the focused card');
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
    // The end of the run by pad: it opens on Run again, right goes to Lobby and back, B closes it into the lobby.
    assert.equal(await focused(), 'runSummaryAgain', 'the end of the run opens on Run again');
    await pad(15); assert.equal(await focused(), 'runSummaryLobby', 'right moves to Lobby');
    await pad(14); assert.equal(await focused(), 'runSummaryAgain', 'and left back');
    await pad(1);
    assert.equal(await page.locator('#runSummary').isVisible(), false, 'B closes it into the lobby');
    assert.equal(await page.evaluate(() => multiplayer.panelOpen), true);
    assert.deepEqual(errors, [], 'no page errors');
    console.log('Boss Rush alone: no bot in the lobby or the run, the pick and a fall that ends the run, all by pad, passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exit(1); });
