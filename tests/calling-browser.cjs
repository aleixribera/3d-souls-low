'use strict';
// Boss Rush end to end (v7.35.0 as The Calling; endless since pass 65): two browsers start a run (no bot joins, pass 52),
// the party beats fight 1, then the run skips ahead to fight 5, Crowned, with its modifiers under the boss bar; its win
// offers four abilities with a legendary; a pair in fight 7 has a share of its health each, and a wipe there ends the run on the end-of-run screen. Between the fights
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
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'bare', volume: 0 }));
      localStorage.setItem('combatArena.onlineName', name);
    }, name);
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await page.waitForFunction(() => multiplayer.connected);
    return page;
  }
  // The server has a player's fall (its pose with no health), counted for the end of the run: a fight finished before
  // that pose arrives would miss it.
  const fallen = async id => { for (let t = 0; !app.clients.get(id)?.arenaDefeated; t++) { if (t > 200) throw new Error('the server never saw the fall'); await new Promise(r => setTimeout(r, 25)); } };
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
    // The run's first five bosses are pinned, so the test knows them (the draw itself is tests/calling.cjs's); the run
    // skips from fight 2 to fight 5 (index 4) once `skip` is set.
    const opening = ['pillagerCaptain', 'bellWarden', 'giant', 'antlered', 'ostrey'];
    const newRun = app.sim.newRun, calling = app.sim.calling; let skip = 0;
    app.sim.newRun = () => newRun(opening);
    app.sim.calling = (run, fight = 0) => calling(run, fight ? Math.max(fight, skip) : 0);
    const a = await player('Ash'), b = await player('Ember');
    await a.locator('#lobbyAdventure').selectOption('calling/' + C.calling.id);
    assert.match(await a.locator('#lobbyAdventureSummary').textContent(), /until everyone falls/);
    assert.equal(await a.locator('#lobbyCalling').count(), 0, 'an endless run has no length or roster to set');
    await a.screenshot({ path: `${out}/lobby-desktop.png` });
    await a.setViewportSize({ width: 390, height: 844 });
    assert.ok(await a.locator('#publicLobby .lobby-card').evaluate(el => el.scrollWidth <= el.clientWidth), 'the lobby fits a phone');
    await a.screenshot({ path: `${out}/lobby-phone.png` });
    await a.setViewportSize({ width: 1280, height: 720 });

    await a.locator('#lobbyStart').click();
    await a.locator('#runIntroScreen').waitFor({ timeout: 90000 });
    assert.equal(await a.locator('#runIntroTitle').textContent(), 'BOSS RUSH');
    await Promise.all([ready(a), ready(b)]);
    assert.equal(app.sim.botList().length, 0, 'no bot fills the party');
    assert.equal(app.session.gauntlet.boss, 'pillagerCaptain');
    assert.match(await a.locator('#onlineCurrentLevel').textContent(), /BOSS RUSH · Fight 1/);
    assert.equal(await a.locator('#rushCrown').textContent(), 'Crowned in 4');
    assert.equal(await a.locator('#rushMods').isVisible(), false, 'no modifier on the first fights');
    const bId = await b.evaluate(() => multiplayer.info.self);
    blows([await a.evaluate(() => multiplayer.info.self), bId]);
    await a.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    await a.waitForFunction(() => multiplayer.spectating);
    const epoch = app.session.epoch, aId = await a.evaluate(() => multiplayer.info.self);
    await fallen(aId);
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
    app.sim.offerAbilities = draw; skip = 4;   // on to fight 5, Crowned
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
    assert.match(await a.locator('#onlineCurrentLevel').textContent(), /BOSS RUSH · Fight 5/);
    blows([aId, bId]);
    assert.equal(await a.evaluate(() => Game.player.alive() && Game.player.hp === Game.player.maxHp), true, 'the fallen rise for the next fight');
    assert.deepEqual(await b.evaluate(() => Game.enemies.map(e => e.baseDef.id)), ['ostrey']);
    await a.waitForTimeout(2500);   // let the fight start before the frame
    // The streak under the boss bar: the fight, Crowned, its clock (the server's) and its par; the modifiers under it.
    assert.equal(await a.locator('#rushClock').isVisible(), true);
    assert.equal(await a.locator('#rushFight').textContent(), 'Fight 5');
    assert.equal(await a.locator('#rushCrown').textContent(), 'Crowned');
    assert.match(await a.locator('#rushTime').textContent(), /^0:0\d$/);
    assert.equal(await a.locator('#rushPar').textContent(), `par 0:${String(app.session.par).padStart(2, '0')}`);
    const mods = app.session.gauntlet.modifiers;
    assert.equal(mods.length, 2, 'a Crowned fight 5: two modifiers');
    assert.equal(await a.locator('#rushMods').textContent(), mods.map(id => app.sim.inspect().Game.update.constructor('return RUSH_MODIFIER_BY_ID')()[id].name).join(' · '));
    await a.screenshot({ path: `${out}/crowned-fight.png` });
    await a.setViewportSize({ width: 390, height: 844 });
    await a.waitForTimeout(300);
    assert.ok(await a.evaluate(() => ['rushClock', 'rushMods'].every(id => { const r = document.getElementById(id).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })), 'the streak and the modifiers fit a phone');
    await a.screenshot({ path: `${out}/crowned-fight-phone.png` });
    await a.setViewportSize({ width: 1280, height: 720 });
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
    await fallen(aId);
    finishFight();
    // The Crowned win: four abilities, one of them a legendary, for each.
    for (const page of [a, b]) await page.locator('#abilityScreen').waitFor({ timeout: 30000 });
    for (const page of [a, b]) {
      assert.equal(await page.locator('#abilityChoices button').count(), 4, 'a Crowned win: four abilities');
      assert.ok(await page.locator('#abilityChoices button[data-rarity=legendary]').count() >= 1, 'one of them a legendary');
      assert.equal(await page.locator('#abilityChoices button em.swift').count(), 0, 'no swift mark on a Crowned offer');
    }
    await a.waitForTimeout(400);
    await a.screenshot({ path: `${out}/crowned-offer.png` });
    const epoch6 = app.session.epoch;
    skip = 6;   // on to fight 7, two bosses at once
    for (const page of [a, b]) await page.keyboard.press('Digit1');
    await a.waitForFunction(epoch => multiplayer.info.session?.epoch > epoch, epoch6, { timeout: 30000 });
    await Promise.all([ready(a), ready(b)]);
    assert.equal(app.session.gauntlet.number, 7);
    // A pair (pass 67): each boss has a share of its health, and both browsers' bars match the server's.
    const pairBars = [...app.sim.inspect().Game.enemies].map(e => [e.baseDef.id, e.def.hp]);   // an array of this realm, not the simulation's
    assert.equal(pairBars.length, 2, 'fight 7: two bosses');
    assert.ok(app.sim.inspect().Game.enemies.every(e => e.health === app.sim.rushHealth(2) && e.health < 1), 'each boss of a pair has a share of its health');
    for (const page of [a, b]) {
      await page.waitForFunction(ids => Game.enemies.map(e => e.baseDef.id).join() === ids, pairBars.map(([id]) => id).join(), { timeout: 30000 });
      assert.deepEqual(await page.evaluate(() => Game.enemies.map(e => [e.baseDef.id, e.def.hp])), pairBars, 'the browser draws the bars the server has');
    }
    blows([aId, bId]);
    await a.waitForTimeout(2500);
    await a.screenshot({ path: `${out}/pair-fight.png` });
    // Everyone falls in fight 7: the run ends.
    app.sim.arenaWipeDelay = 0.1;
    for (const page of [a, b]) await page.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    for (const page of [a, b]) await page.locator('#publicLobby:not(.hidden)').waitFor({ timeout: 30000 });
    assert.equal(app.session, null);
    // The end of the run: bosses beaten as the title, Crowned fights won, time, and each player's damage and deaths;
    // the leader can go again.
    for (const page of [a, b]) await page.locator('#runSummary').waitFor({ timeout: 10000 });
    assert.equal(await a.locator('#runSummaryTitle').textContent(), '2 bosses beaten');
    assert.equal(await a.locator('#runSummaryCrowned').textContent(), '1');
    assert.match(await a.locator('#runSummaryTime').textContent(), /^\d+:\d\d$/);
    const times = await a.locator('#runSummaryTimes li').allTextContents();
    assert.equal(times.length, 2, 'each fight\'s time');
    assert.match(times[0], /^Pillager Captain0:0\dSwift kill$/);
    assert.match(times[1], /^Crowned: Old Ostrey, the Porter0:\d\d(Swift kill|par \d:\d\d)$/);
    const rows = await a.locator('#runSummaryRows tr').evaluateAll(trs => trs.map(tr => [tr.cells[0].firstChild.textContent, ...[...tr.cells].slice(1).map(td => td.textContent), tr.querySelector('.summary-title')?.textContent]));
    assert.equal(rows.length, 2, 'both players');
    assert.ok(rows.every(r => r[3]) && rows[0][3] !== rows[1][3], 'a different title under each name');
    assert.equal(rows.find(r => r[0] === 'Ash')[2], '3', 'Ash fell in all three fights');
    assert.equal(rows.find(r => r[0] === 'Ember')[2], '1');
    assert.ok(['Ash', 'Ember'].every(name => Number(rows.find(r => r[0] === name)[1].replace(/\D/g, '')) > 0), 'both players dealt damage');
    assert.equal(await a.locator('#runSummaryAgain').isVisible(), true, 'the leader can go again');
    assert.equal(await b.locator('#runSummaryAgain').isVisible(), false);
    assert.equal(await b.locator('#runSummaryWait').textContent(), 'Ash can start this run again.');
    await a.waitForTimeout(300);
    await a.screenshot({ path: `${out}/summary-desktop.png` });
    await b.setViewportSize({ width: 390, height: 844 });
    assert.ok(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#runSummaryLobby').getBoundingClientRect().bottom <= innerHeight), 'the summary fits a phone');
    await b.screenshot({ path: `${out}/summary-phone.png` });
    await b.setViewportSize({ width: 1280, height: 720 });
    // Again: a new run from its first fight, for the same group; both summaries close.
    skip = 0;
    await a.locator('#runSummaryAgain').click();
    await Promise.all([ready(a), ready(b)]);
    assert.equal(app.session.gauntlet.number, 1); assert.equal(app.session.gauntlet.boss, 'pillagerCaptain');
    assert.equal(await b.locator('#runSummary').isVisible(), false);
    // A wipe in the first fight ends the run on the same screen, in red.
    for (const page of [a, b]) await page.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    for (const page of [a, b]) await page.locator('#runSummary').waitFor({ timeout: 30000 });
    assert.equal(await a.locator('#runSummaryTitle').textContent(), 'No boss beaten');
    assert.equal(await a.locator('#runSummaryCrowned').textContent(), '0');
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
    console.log('BOSS RUSH browsers: the endless lobby, phone fit, opening card, no bot, abilities by click and key, fallen rise, a Crowned fight with its modifiers and its offer, the end-of-run screen, again and a wipe passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
