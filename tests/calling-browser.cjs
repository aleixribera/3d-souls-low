'use strict';
// The Calling end to end (v7.35.0): two browsers pick a 3-boss roster by hand, a bot fills the party, the party beats
// one boss, then the last two together, and everyone lands back in the lobby with the run complete. Between the fights
// each takes a blessing (one by click, one by key), and the fallen one's Rise Again gets them up in the last fight.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');
const { config: C } = require('../js/net-protocol.js');
const out = process.env.CALLING_SHOTS || '.scratch/calling';
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ready = p => p.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive && multiplayer.info.receivedFrames > 2, null, { timeout: 90000 });
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
  const finishFight = () => { for (const e of app.sim.inspect().Game.enemies) { e.hp = 0; e.die(); } };
  try {
    fs.mkdirSync(out, { recursive: true });
    const a = await player('Ash'), b = await player('Ember');
    await a.locator('#lobbyAdventure').selectOption('calling/' + C.calling.id);
    assert.equal(await a.locator('#lobbyCalling').isVisible(), true, 'The Calling shows its length and roster');
    assert.equal(await a.locator('#lobbyCallingLength').inputValue(), String(C.calling.length));
    assert.equal(await a.locator('#lobbyCallingPick').isVisible(), false, 'the boss list waits for "Chosen by hand"');
    await a.locator('#lobbyCallingRoster').selectOption('pick');
    const picks = a.locator('#lobbyCallingPick button');
    assert.equal(await picks.count(), app.sim.catalog().bosses.length, 'every boss in the game can be picked');
    assert.equal(await a.locator('#lobbyStart').isDisabled(), true, 'a hand-picked run needs three bosses');
    for (const name of ['Pillager Captain', 'Bell Warden', 'Margit, the Fell Omen']) await picks.filter({ hasText: name }).click();
    assert.equal(await picks.filter({ hasText: 'Margit' }).getAttribute('data-order'), '3');
    assert.match(await a.locator('#lobbyAdventureSummary').textContent(), /Pillager Captain, then Bell Warden and Margit, the Fell Omen together\./);
    await a.screenshot({ path: `${out}/lobby-desktop.png` });
    await a.setViewportSize({ width: 390, height: 844 });
    await a.locator('#lobbyCallingPick').scrollIntoViewIfNeeded();
    assert.ok(await a.locator('#publicLobby .lobby-card').evaluate(el => el.scrollWidth <= el.clientWidth), 'the picker fits a phone');
    await a.screenshot({ path: `${out}/lobby-phone.png` });
    await a.setViewportSize({ width: 1280, height: 720 });
    assert.equal(await b.locator('#lobbyCalling').isVisible(), false, 'only the leader shapes the run');

    await a.locator('#lobbyStart').click();
    await a.locator('#runIntroScreen').waitFor({ timeout: 90000 });
    assert.equal(await a.locator('#runIntroTitle').textContent(), 'THE CALLING');
    await Promise.all([ready(a), ready(b)]);
    assert.equal(app.sim.botList().length, 1, 'a bot fills the third place');
    assert.deepEqual([...app.session.gauntlet.roster], ['pillagerCaptain', 'bellWarden', 'margit']);
    assert.match(await a.locator('#onlineCurrentLevel').textContent(), /THE CALLING · 1\/2/);
    await a.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    await a.waitForFunction(() => multiplayer.spectating);
    const epoch = app.session.epoch, aId = await a.evaluate(() => multiplayer.info.self);
    // a is offered Rise Again (the draw itself is tests/blessings.cjs's).
    const draw = app.sim.offerBlessings;
    app.sim.offerBlessings = ids => { draw(ids); app.sim.blessingOffer(aId)?.splice(0, 3, 'whetted-edge', 'rise-again', 'keen-ear'); };
    finishFight();
    for (const page of [a, b]) await page.locator('#blessingScreen').waitFor({ timeout: 30000 });
    assert.equal(await a.locator('#blessingChoices button').count(), 3, 'three blessings to choose from');
    await a.waitForTimeout(400);
    await a.screenshot({ path: `${out}/blessing-desktop.png` });
    await a.setViewportSize({ width: 390, height: 844 });
    assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#blessingChoices button')].every(b => b.getBoundingClientRect().bottom <= innerHeight)), 'the pick fits a phone');
    await a.screenshot({ path: `${out}/blessing-phone.png` });
    await a.setViewportSize({ width: 1280, height: 720 });
    await a.locator('#blessingChoices button', { hasText: 'Rise Again' }).click();
    assert.equal(await a.locator('#blessingStatus').textContent(), 'Waiting for the others.');
    assert.equal(app.session.epoch, epoch, 'the next fight waits for every pick');
    const bPick = await b.locator('#blessingChoices button').first().getAttribute('data-blessing');
    await b.keyboard.press('Digit1');
    await a.waitForFunction(epoch => multiplayer.info.session?.epoch > epoch, epoch, { timeout: 30000 });
    await Promise.all([ready(a), ready(b)]);
    assert.equal(await a.locator('#blessingScreen').isVisible(), false);
    assert.deepEqual(await a.evaluate(() => [...Game.player.blessings]), ['rise-again']);
    assert.deepEqual(await b.evaluate(() => [...Game.player.blessings]), [bPick], 'the number key took the first');
    assert.match(await a.locator('#onlineCurrentLevel').textContent(), /THE CALLING · 2\/2/);
    assert.equal(await a.evaluate(() => Game.player.alive() && Game.player.hp === Game.player.maxHp), true, 'the fallen rise for the next fight');
    assert.deepEqual(await b.evaluate(() => Game.enemies.map(e => e.baseDef.id)), ['bellWarden', 'margit'], 'the last two bosses come together');
    await a.waitForTimeout(2500);   // let the fight start before the frame
    await a.screenshot({ path: `${out}/final-fight.png` });
    // Rise Again: a falls and gets up where they fell, at half health, and the server counts them standing.
    const fell = await a.evaluate(() => { const p = Game.player; p.hp = 0; p.setState(PS.DEAD); Game.onPlayerDeath(); return { x: p.x, z: p.z }; });
    await a.waitForFunction(() => Game.player.alive(), null, { timeout: 10000 });
    const risen = await a.evaluate(() => ({ x: Game.player.x, z: Game.player.z, hp: Game.player.hp / Game.player.maxHp, spectating: multiplayer.spectating }));
    assert.deepEqual(risen, { x: fell.x, z: fell.z, hp: 0.5, spectating: false }, 'risen where they fell, at half health');
    await a.waitForTimeout(300);
    assert.equal(app.clients.get(aId).arenaDefeated, false, 'the server lifted the defeat');
    assert.ok(app.clients.get(aId).pose.hp > 0, 'the risen body is relayed');
    await a.screenshot({ path: `${out}/risen.png` });
    finishFight();
    for (const page of [a, b]) await page.locator('#publicLobby:not(.hidden)').waitFor({ timeout: 30000 });
    assert.match(await a.locator('#lobbyNotice').textContent(), /THE CALLING COMPLETE · 3 bosses defeated/);
    assert.equal(app.session, null);
    await a.screenshot({ path: `${out}/complete.png` });
    assert.deepEqual(errors, []);
    console.log('THE CALLING browsers: hand-picked roster, phone fit, opening card, bot fill, blessings by click and key, fallen rise, last two together, Rise Again, run complete passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
