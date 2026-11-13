'use strict';
// The Calling end to end (v7.35.0): two browsers pick a 3-boss roster by hand, a bot fills the party, the party beats
// one boss, then the last two together, and everyone lands back in the lobby with the run complete. Between the fights
// each takes a blessing (one by click, one by key), and the fallen one's Rise Again gets them up in the last fight.
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
    assert.equal(app.sim.botList().length, 1, 'a bot fills the third place');
    assert.deepEqual([...app.session.gauntlet.roster], ['pillagerCaptain', 'bellWarden', 'ostrey']);
    assert.match(await a.locator('#onlineCurrentLevel').textContent(), /BOSS RUSH · 1\/2/);
    const bId = await b.evaluate(() => multiplayer.info.self);
    blows([await a.evaluate(() => multiplayer.info.self), bId]);
    await a.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    await a.waitForFunction(() => multiplayer.spectating);
    const epoch = app.session.epoch, aId = await a.evaluate(() => multiplayer.info.self);
    // a is offered Rise Again (the draw itself is tests/blessings.cjs's).
    const draw = app.sim.offerBlessings;
    app.sim.offerBlessings = (ids, withBots, extra) => {
      draw(ids, withBots, extra);
      // a already holds Whetted Edge once, so its card offers the next level.
      if (app.sim.blessingOffer(aId) && !app.sim.blessings()[aId]) {
        app.sim.blessingOffer(aId).splice(0, 1, 'whetted-edge'); app.sim.bless(aId, 'whetted-edge'); draw([aId], false, extra);
      }
      const o = app.sim.blessingOffer(aId);
      if (o) o.splice(0, o.length, ...['whetted-edge', 'rise-again', 'keen-ear', 'second-wind'].slice(0, o.length));
    };
    finishFight();
    // The kill moment: "Boss 1 down" at once, the boss's death slowed for the drawing only.
    await b.locator('#won.show.rush').waitFor({ timeout: 10000 });
    assert.equal(await b.locator('#wonTitle').textContent(), 'Boss 1 down');
    assert.equal(await b.evaluate(() => killMoment.active && Game.drawSlow < 1), true, 'the kill moment plays');
    await b.waitForTimeout(350);
    await b.screenshot({ path: `${out}/kill-moment.png` });
    for (const page of [a, b]) await page.locator("#blessingScreen").waitFor({ timeout: 30000 }).catch(e => { throw new Error(e.message + " page errors: " + errors.join(" | ")); });
    // Won in seconds, far under par: a swift kill, so a fourth card, marked.
    assert.equal(await a.locator('#blessingChoices button').count(), 4, 'a swift kill: four blessings to choose from');
    // Tall cards (v7.70.0): each with its own drawn icon, its rarity at the foot, the swift one marked beside it.
    assert.deepEqual(await a.locator('#blessingChoices .bl-rarity').allTextContents(), ['Common', 'Common', 'Common', 'Common · Swift kill']);
    assert.equal(new Set(await a.locator('#blessingChoices .bl-well path').evaluateAll(ps => ps.map(p => p.getAttribute('d')))).size, 4, 'four different icons');
    assert.deepEqual(await a.locator('#blessingChoices .ui-key').allTextContents(), ['1', '2', '3', '4'], 'the number keys');
    // Offered again, Whetted Edge shows its next level and the change.
    assert.deepEqual(await a.locator('#blessingChoices .bl-level').allTextContents(), ['I → II', '', '', '']);
    assert.equal(await a.locator('#blessingChoices .bl-text b').first().textContent(), '15% → 30%');
    const card = await a.locator('#blessingChoices button').first().boundingBox();
    assert.ok(card.height > card.width * 1.3, 'the cards stand upright');
    await a.waitForTimeout(400);
    await a.screenshot({ path: `${out}/blessing-desktop.png` });
    await a.setViewportSize({ width: 390, height: 844 });
    assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#blessingChoices button')].every(b => { const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth; })), 'the pick fits a phone');
    await a.screenshot({ path: `${out}/blessing-phone.png` });
    // A phone on its side, with a pad: one row, the focused card alone shows the pad's button.
    await a.setViewportSize({ width: 844, height: 390 });
    await a.evaluate(() => input.use('pad'));
    await a.waitForTimeout(200);
    const caps = await a.locator('#blessingChoices .ui-key').evaluateAll(ks => ks.map(k => getComputedStyle(k).visibility === 'visible' ? k.textContent : ''));
    assert.ok(caps[0] && caps[0] !== '1' && caps.slice(1).every(c => c === ''), `only the focused card shows the pad button: ${caps}`);
    assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#blessingChoices button')].every(b => { const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth; })), 'the pick fits a phone on its side');
    await a.screenshot({ path: `${out}/blessing-landscape-pad.png` });
    await a.evaluate(() => input.use('keyboard'));
    await a.setViewportSize({ width: 1280, height: 720 });
    await a.locator('#blessingChoices button', { hasText: 'Rise Again' }).click();
    assert.equal(await a.locator('#blessingStatus').textContent(), 'Waiting for the others.');
    assert.equal(app.session.epoch, epoch, 'the next fight waits for every pick');
    const bPick = await b.locator('#blessingChoices button').first().getAttribute('data-blessing');
    await b.keyboard.press('Digit1');
    await a.waitForFunction(epoch => multiplayer.info.session?.epoch > epoch, epoch, { timeout: 30000 });
    assert.equal(await b.evaluate(() => multiplayer.info.session.drop && !document.getElementById('loading').classList.contains('show')), true, 'the next boss drops straight in, no loading card');
    await Promise.all([ready(a), ready(b)]);
    assert.equal(await a.locator('#blessingScreen').isVisible(), false);
    assert.deepEqual(await a.evaluate(() => [...Game.player.blessings]), ['whetted-edge', 'rise-again']);
    assert.deepEqual(await b.evaluate(() => [...Game.player.blessings]), [bPick], 'the number key took the first');
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
    assert.equal(rows.length, 3, 'both players and the bot');
    assert.equal(rows.find(r => r[0] === 'Ash')[2], '2', 'Ash fell in both fights');
    assert.equal(rows.find(r => r[0] === 'Ember')[2], '0');
    assert.ok(['Ash', 'Ember'].every(name => Number(rows.find(r => r[0] === name)[1].replace(/\D/g, '')) > 0), 'both players dealt damage');
    assert.ok(rows.some(r => r[0].endsWith('Bot')), 'the bot is marked');
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
    app.sim.clearBots(); app.sim.arenaWipeDelay = 0.1;
    for (const page of [a, b]) await page.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    for (const page of [a, b]) await page.locator('#runSummary').waitFor({ timeout: 30000 });
    assert.equal(await a.locator('#runSummaryTitle').textContent(), 'Team wiped');
    assert.equal(await a.locator('#runSummaryBeaten').textContent(), '0 / 3');
    assert.ok((await a.locator('#runSummaryRows tr').allTextContents()).some(t => t.includes('Bot')), 'a bot that left mid-fight is still marked');
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
    console.log('BOSS RUSH browsers: hand-picked roster, phone fit, opening card, bot fill, blessings by click and key, fallen rise, last two together, Rise Again, run complete, the end-of-run screen, again and a wipe passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
