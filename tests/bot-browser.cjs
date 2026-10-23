'use strict';
// Friendly bots in the browser (v7.11): the leader's Add bot button, the roster tag, the bot drawn fighting beside
// the player, and spectating it after a fall. node tests/bot-browser.cjs [screenshot directory]
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const shots = process.argv[2], app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
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
  try {
    const a = await player('Ash'), b = await player('Ember');
    assert.ok(await a.locator('#lobbyAddBot').isVisible(), 'the leader sees Add bot');
    assert.ok(!(await b.locator('#lobbyAddBot').isVisible()), 'a guest does not');
    await a.locator('#lobbyAddBot').click();
    await b.waitForFunction(() => document.querySelector('#lobbyPlayers .lobby-player[data-bot=true] .lobby-player-role.bot'));
    assert.equal(await b.locator('.lobby-bot-remove').count(), 0, 'only the leader can remove it');
    if (shots) await a.screenshot({ path: path.join(shots, 'bot-lobby.png') });
    await a.locator('#lobbyStart').click();
    const ready = p => p.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && multiplayer.info.receivedFrames > 2, null, { timeout: 90000 });
    await Promise.all([ready(a), ready(b)]);
    await b.evaluate(() => multiplayer.hide && multiplayer.hide());
    // The bot is drawn as a teammate, with its tag, and fights the boss beside the player.
    await a.waitForFunction(() => [...document.querySelectorAll('.online-name-text')].some(n => / · Bot/.test(n.textContent)), null, { timeout: 20000 });
    const boss = app.sim.inspect().Game.enemies[0], start = boss.hp;
    await a.waitForFunction(() => Game.duel.hp < Game.duel.def.hp, null, { timeout: 30000 });
    assert.ok(boss.hp < start || boss.hp < boss.baseDef.hp, 'the shared boss loses health to the bot');
    if (shots) { await a.waitForTimeout(1500); await a.screenshot({ path: path.join(shots, 'bot-fight.png') }); }
    // Both players fall: the bot carries the attempt, and the fallen watch it fight.
    for (const p of [a, b]) await p.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    // The first fallen player briefly watches the other human until their death pose arrives.
    await a.waitForFunction(() => document.body.classList.contains('spectator-view') && /Ser Quill|Maren|Tobin/.test(document.getElementById('spectatorName')?.textContent || ''), null, { timeout: 15000 });
    const watched = await a.locator('#spectatorName').textContent();
    assert.match(watched, /Ser Quill|Maren|Tobin/, 'the fallen spectate the bot');
    const epoch = app.session.epoch;
    await a.waitForTimeout((app.sim.arenaWipeDelay + 1) * 1000);
    assert.equal(app.session.epoch, epoch, 'no team wipe while the bot stands');
    if (shots) await a.screenshot({ path: path.join(shots, 'bot-spectate.png') });
    assert.deepEqual(errors, [], 'no page errors');
    console.log(`Friendly bot browser check passed (spectating ${watched}).`);
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exit(1); });
