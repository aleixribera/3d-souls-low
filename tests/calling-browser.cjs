'use strict';
// The Calling end to end (v7.35.0): two browsers pick a 3-boss roster by hand (no bot joins, pass 52), the party beats
// one boss, then the last two together, and everyone lands back in the lobby with the run complete. Between the fights
// each takes an ability (one by click, one by key); the fallen get up for the next fight.
// v7.70.0: the abilities rebuilt (25 of them, js/data/abilities.js): tall cards, the held one's kit after the pick.
// v7.69.0: the kill moment ("Boss 1 down", slowed and embers), a swift kill's fourth card, the next boss dropping
// straight in with no loading card, the streak and par under the boss bar, and each boss's time on the end screen.
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
  // A blow from each player at the first boss, through the server's own hit check, so the run's damage is real.
  const blows = ids => {
    const boss = app.sim.inspect().Game.enemies[0], attack = Object.values(app.sim.inspect().PLAYER_DEF?.moveset.attacks || {}).find(x => x.id !== 'execute')?.id || 'light';
    for (const [i, id] of ids.entries()) {
      app.sim.setPlayers([{ ...app.session.spawn, id, x: boss.x, z: boss.z + boss.radius + 0.5, y: boss.y, yaw: Math.PI, hp: 120, state: 'idle', poseAge: 0 }]);
      for (let n = 0; n <= i; n++) app.sim.hit(id, { enemy: boss.netId, attack, charge: 0 });
    }
  };
  try {
    fs.mkdirSync(out, { recursive: true });
    const a = await player('Ash'), b = await player('Ember');
    await a.locator('#lobbyAdventure').selectOption('calling/' + C.calling.id);
    assert.equal(await a.locator('#lobbyCalling').isVisible(), true, 'Boss Rush shows its length and roster');
    assert.equal(await a.locator('#lobbyCallingLength').inputValue(), String(C.calling.length));
    assert.equal(await a.locator('#lobbyCallingPick').isVisible(), false, 'the boss list waits for "Chosen by hand"');
    await a.locator('#lobbyCallingRoster').selectOption('pick');
    const picks = a.locator('#lobbyCallingPick button');
    assert.equal(await picks.count(), app.sim.catalog().bosses.length, 'every boss in the game can be picked');
    assert.equal(await a.locator('#lobbyStart').isDisabled(), true, 'a hand-picked run needs three bosses');
    for (const name of ['Pillager Captain', 'Bell Warden', 'Old Ostrey, the Porter']) await picks.filter({ hasText: name }).click();
    assert.equal(await picks.filter({ hasText: 'Old Ostrey' }).getAttribute('data-order'), '3');
    assert.match(await a.locator('#lobbyAdventureSummary').textContent(), /Pillager Captain, then Bell Warden and Old Ostrey, the Porter together\./);
    await a.screenshot({ path: `${out}/lobby-desktop.png` });
    await a.setViewportSize({ width: 390, height: 844 });
    await a.locator('#lobbyCallingPick').scrollIntoViewIfNeeded();
    assert.ok(await a.locator('#publicLobby .lobby-card').evaluate(el => el.scrollWidth <= el.clientWidth), 'the picker fits a phone');
    await a.screenshot({ path: `${out}/lobby-phone.png` });
    await a.setViewportSize({ width: 1280, height: 720 });
    assert.equal(await b.locator('#lobbyCalling').isVisible(), false, 'only the leader shapes the run');

    await a.locator('#lobbyStart').click();
    await a.locator('#runIntroScreen').waitFor({ timeout: 90000 });
    assert.equal(await a.locator('#runIntroTitle').textContent(), 'BOSS RUSH');
    await Promise.all([ready(a), ready(b)]);
    assert.equal(app.sim.botList().length, 0, 'no bot fills the party');
    assert.deepEqual([...app.session.gauntlet.roster], ['pillagerCaptain', 'bellWarden', 'ostrey']);
    assert.match(await a.locator('#onlineCurrentLevel').textContent(), /BOSS RUSH · 1\/2/);
    const bId = await b.evaluate(() => multiplayer.info.self);
    blows([await a.evaluate(() => multiplayer.info.self), bId]);
    await a.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    await a.waitForFunction(() => multiplayer.spectating);
    const epoch = app.session.epoch, aId = await a.evaluate(() => multiplayer.info.self);
    // a is offered these four (the draw itself is tests/abilities.cjs's).
    const draw = app.sim.offerAbilities;
    app.sim.offerAbilities = (ids, ...rest) => {
      draw(ids, ...rest);
      const o = app.sim.abilityOffer(aId);
      if (o) o.splice(0, o.length, ...['keen-edge', 'time-rift', 'vengeance', 'iron-blood'].slice(0, o.length));
    };
    finishFight();
    // The kill moment: "Boss 1 down" at once, the boss's death slowed for the drawing only.
    await b.locator('#won.show.rush').waitFor({ timeout: 10000 });
    assert.equal(await b.locator('#wonTitle').textContent(), 'Boss 1 down');
    assert.equal(await b.evaluate(() => killMoment.active && Game.drawSlow < 1), true, 'the kill moment plays');
    await b.waitForTimeout(350);
    await b.screenshot({ path: `${out}/kill-moment.png` });
    for (const page of [a, b]) await page.locator('#abilityScreen').waitFor({ timeout: 30000 });
    // Won in seconds, far under par: a swift kill, so a fourth card, marked.
    assert.equal(await a.locator('#abilityChoices button').count(), 4, 'a swift kill: four abilities to choose from');
    assert.equal(await a.locator('#abilityChoices button em.swift').count(), 1);
    assert.equal(await a.locator('#abilityChoices button').last().locator('em.swift').textContent(), 'Swift kill');
    await a.waitForTimeout(400);
    await a.screenshot({ path: `${out}/ability-desktop.png` });
    await a.setViewportSize({ width: 390, height: 844 });
    assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#abilityChoices button')].every(b => b.getBoundingClientRect().bottom <= innerHeight)), 'the pick fits a phone');
    await a.screenshot({ path: `${out}/ability-phone.png` });
    await a.setViewportSize({ width: 1280, height: 720 });
    assert.deepEqual(await a.locator('#abilityChoices button').evaluateAll(bs => bs.map(b => b.dataset.rarity)), ['common', 'legendary', 'rare', 'common']);
    await a.locator('#abilityChoices button', { hasText: 'Time Rift' }).click();
    assert.equal(await a.locator('#abilityStatus').textContent(), 'Waiting for the others.');
    assert.equal(app.session.epoch, epoch, 'the next fight waits for every pick');
    const bPick = await b.locator('#abilityChoices button').first().getAttribute('data-ability');
    await b.keyboard.press('Digit1');
    await a.waitForFunction(epoch => multiplayer.info.session?.epoch > epoch, epoch, { timeout: 30000 });
    assert.equal(await b.evaluate(() => multiplayer.info.session.drop && !document.getElementById('loading').classList.contains('show')), true, 'the next boss drops straight in, no loading card');
    await Promise.all([ready(a), ready(b)]);
    assert.equal(await a.locator('#abilityScreen').isVisible(), false);
    assert.deepEqual(await a.evaluate(() => [...Game.player.kit.ids]), ['time-rift']);
    assert.deepEqual(await b.evaluate(() => [...Game.player.kit.ids]), [bPick], 'the number key took the first');
    assert.match(await a.locator('#onlineCurrentLevel').textContent(), /BOSS RUSH · 2\/2/);
    blows([aId, bId]);
    assert.equal(await a.evaluate(() => Game.player.alive() && Game.player.hp === Game.player.maxHp), true, 'the fallen rise for the next fight');
    assert.deepEqual(await b.evaluate(() => Game.enemies.map(e => e.baseDef.id)), ['bellWarden', 'ostrey'], 'the last two bosses come together');
    await a.waitForTimeout(2500);   // let the fight start before the frame
    // The streak under the boss bar: the fight, its clock (the server's) and its par.
    assert.equal(await a.locator('#rushClock').isVisible(), true);
    assert.equal(await a.locator('#rushFight').textContent(), 'Fight 2');
    assert.match(await a.locator('#rushTime').textContent(), /^0:0\d$/);
    assert.equal(await a.locator('#rushPar').textContent(), `par 1:${String(app.session.par - 60).padStart(2, '0')}`);
    await a.screenshot({ path: `${out}/final-fight.png` });
    // a's Time Rift, fired as their dodge claim would fire it: both browsers draw the stopped boss's bubble. A legendary
    // on no enemy (a Meteor's blast) reaches every browser too, with its frame.
    const R = app.sim.inspect(), fireAs = (kit, when, ctx) => R.abilityPowers.trigger(aId, R.holderOf(aId), kit, when, ctx);
    fireAs(app.sim.kitOf(aId), 'dodge', { enemy: R.Game.enemies[0] });
    for (const page of [a, b]) await page.waitForFunction(() => abilityFx.info().bubbles > 0, null, { timeout: 5000 });
    fireAs({ powers: [{ id: 'meteor-fall', when: 'land', then: 'blast', action: 'heavy', v: { radius: 1, damage: 1, posture: 1, cooldown: 1 } }] }, 'land', { x: 0, y: 0, z: 0, action: 'heavy' });
    for (const page of [a, b]) await page.waitForFunction(() => abilityFx.info().meteors > 0, null, { timeout: 5000 });
    R.abilityPowers.reset();
    // a falls again: they watch the rest of this fight.
    await a.evaluate(() => { const p = Game.player; p.hp = 0; p.setState(PS.DEAD); Game.onPlayerDeath(); });
    await a.waitForFunction(() => multiplayer.spectating);
    finishFight();
    for (const page of [a, b]) await page.locator('#publicLobby:not(.hidden)').waitFor({ timeout: 30000 });
    assert.match(await a.locator('#lobbyNotice').textContent(), /BOSS RUSH COMPLETE · All 3 bosses beaten/);
    assert.equal(app.session, null);
    // The end of the run: time, bosses beaten, and each player's damage and deaths; the leader can go again.
    for (const page of [a, b]) await page.locator('#runSummary').waitFor({ timeout: 10000 });
    assert.equal(await a.locator('#runSummaryTitle').textContent(), 'Every boss beaten');
    assert.equal(await a.locator('#runSummaryBeaten').textContent(), '3 / 3');
    assert.match(await a.locator('#runSummaryTime').textContent(), /^\d+:\d\d$/);
    const times = await a.locator('#runSummaryTimes li').allTextContents();
    assert.equal(times.length, 2, 'each fight\'s time');
    assert.match(times[0], /^Pillager Captain0:0\dSwift kill$/);
    assert.match(times[1], /^Bell Warden & Old Ostrey, the Porter0:\d\d(Swift kill|par 1:\d\d)$/);
    const rows = await a.locator('#runSummaryRows tr').evaluateAll(trs => trs.map(tr => [...tr.cells].map(td => td.textContent)));
    assert.equal(rows.length, 2, 'both players');
    assert.equal(rows.find(r => r[0] === 'Ash')[2], '2', 'Ash fell in both fights');
    assert.equal(rows.find(r => r[0] === 'Ember')[2], '0');
    assert.ok(['Ash', 'Ember'].every(name => Number(rows.find(r => r[0] === name)[1].replace(/\D/g, '')) > 0), 'both players dealt damage');
    assert.equal(await a.locator('#runSummaryAgain').isVisible(), true, 'the leader can go again');
    assert.equal(await b.locator('#runSummaryAgain').isVisible(), false);
    assert.equal(await b.locator('#runSummaryWait').textContent(), 'Ash can start this run again.');
    await a.waitForTimeout(300);
    await a.screenshot({ path: `${out}/summary-won-desktop.png` });
    await b.setViewportSize({ width: 390, height: 844 });
    assert.ok(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#runSummaryLobby').getBoundingClientRect().bottom <= innerHeight), 'the summary fits a phone');
    await b.screenshot({ path: `${out}/summary-won-phone.png` });
    await b.setViewportSize({ width: 1280, height: 720 });
    // Again: the same roster from its first fight, for the same group; both summaries close.
    await a.locator('#runSummaryAgain').click();
    await Promise.all([ready(a), ready(b)]);
    assert.deepEqual([...app.session.gauntlet.roster], ['pillagerCaptain', 'bellWarden', 'ostrey']);
    assert.equal(app.session.gauntlet.number, 1);
    assert.equal(await b.locator('#runSummary').isVisible(), false);
    // A wipe ends the run on the same screen, in red.
    app.sim.arenaWipeDelay = 0.1;
    for (const page of [a, b]) await page.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    for (const page of [a, b]) await page.locator('#runSummary').waitFor({ timeout: 30000 });
    assert.equal(await a.locator('#runSummaryTitle').textContent(), 'Team wiped');
    assert.equal(await a.locator('#runSummaryBeaten').textContent(), '0 / 3');
    assert.equal(await a.locator('#teamWipeScreen').isVisible(), false, 'the summary replaces the short wipe card');
    await a.waitForTimeout(300);
    await a.screenshot({ path: `${out}/summary-wiped-desktop.png` });
    await a.setViewportSize({ width: 390, height: 844 });
    await a.screenshot({ path: `${out}/summary-wiped-phone.png` });
    await a.setViewportSize({ width: 1280, height: 720 });
    await a.keyboard.press('Escape');
    assert.equal(await a.locator('#runSummary').isVisible(), false, 'Escape closes it into the lobby');
    assert.equal(await a.locator('#publicLobby').evaluate(el => el.inert), false);
    await b.locator('#runSummaryLobby').click();
    assert.equal(await b.locator('#runSummary').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('BOSS RUSH browsers: hand-picked roster, phone fit, opening card, no bot, abilities by click and key, fallen rise, last two together, run complete, the end-of-run screen, again and a wipe passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
