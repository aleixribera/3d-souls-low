'use strict';
// Revive and the end screen's titles in the browser (PLAN.md track B item 4). One page (Ash) and three Node teammates
// (Bram, Cole, Dara) in a Boss Rush: Bram falls and Ash revives him (the ring filling, "Reviving Bram"); Ash falls
// and Cole revives him ("Cole is reviving you", then up again with a third of the bar); everyone falls and the end
// screen gives each of the four a different title; alone, the title is yours. The server's rules: tests/revive.cjs.
// node tests/revive-browser.cjs [screenshot directory]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');
const { build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const shots = process.argv[2] || '.scratch/revive', app = createServer({ dev: true }), errors = [], peers = [];
  fs.mkdirSync(shots, { recursive: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port, { CONFIG } = app.sim.inspect();
  CONFIG.revive.time = 6;   // the server's clock only: time to take the frames mid-revive
  // A Node teammate: joins the lobby, readies for each fight, and sends a pose every 33 ms from `at` (a function).
  async function teammate(name) {
    const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [];
    ws.on('message', data => queue.push(JSON.parse(data)));
    const next = async type => { for (let i = 0; i < 1500; i++) { const at = queue.findIndex(m => m.type === type); if (at >= 0) return queue.splice(at, 1)[0]; await wait(20); } throw new Error(name + ' timed out: ' + type); };
    const t = { ws, next, name, hp: 120, at: null, epoch: null, send: m => ws.send(JSON.stringify(m)) };
    await once(ws, 'open'); t.send({ type: 'hello', protocol: C.protocol, build, name }); t.id = (await next('welcome')).id;
    ws.on('message', data => { const m = JSON.parse(data); if (m.type === 'start') { t.epoch = m.session.epoch; t.spawn = m.session.spawn; t.send({ type: 'ready', epoch: t.epoch }); } });
    t.timer = setInterval(() => {
      if (t.epoch === null || !t.at || ws.readyState !== 1) return;
      t.send({ type: 'pose', epoch: t.epoch, pose: { ...t.spawn, ...t.at(), hp: t.hp, state: t.hp > 0 ? 'idle' : 'dead', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true } });
    }, 33);
    peers.push(t); return t;
  }
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ volume: 0 }));
      localStorage.setItem('combatArena.onlineName', 'Ash');
    });
    await page.goto(origin + '/combat-arena-3d.html#dev');
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await page.waitForFunction(() => multiplayer.connected);
    const bram = await teammate('Bram'), cole = await teammate('Cole'), dara = await teammate('Dara');
    await page.waitForFunction(() => multiplayer.info.players.length === 4);
    await page.locator('#lobbyStart').click();
    await page.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive && multiplayer.info.receivedFrames > 2, null, { timeout: 120000 });
    const ash = await page.evaluate(() => multiplayer.info.self);
    // Ash can't be hurt while the frames are staged (the teammates' health is only what they send).
    const boss = app.sim.inspect().Game.enemies[0];
    const me = () => page.evaluate(() => ({ x: Game.player.x, y: Game.player.y, z: Game.player.z, yaw: Game.cam.yaw }));
    await page.evaluate(() => { Game.player.execGrace = 1e6; });
    let spot = await me();
    const ahead = (d, side = 0) => ({ x: spot.x + Math.sin(spot.yaw) * d + Math.cos(spot.yaw) * side, z: spot.z + Math.cos(spot.yaw) * d - Math.sin(spot.yaw) * side });
    bram.at = () => ahead(2.2); cole.at = () => ahead(3, -2.5); dara.at = () => ahead(3.5, 2.5);
    await wait(800);

    // Bram falls 2.2 m ahead: his ember and the cue to stand in its ring.
    bram.hp = 0;
    await page.waitForFunction(() => document.querySelector('#reviveCue')?.classList.contains('show'), null, { timeout: 10000 });
    assert.equal(await page.locator('#reviveCue .revive-text').textContent(), 'Stand in the ring to revive Bram');
    await page.screenshot({ path: path.join(shots, 'ember-near.png') });
    // Ash steps onto it: the ring fills, "Reviving Bram", and the boss turns on Ash.
    const target = ahead(2.2);
    await page.evaluate(t => { Game.player.x = t.x - Math.sin(Game.cam.yaw) * 0.5; Game.player.z = t.z - Math.cos(Game.cam.yaw) * 0.5; Game.player.savePrev(); Game.updateCamera(0, true); }, target);
    await page.waitForFunction(() => document.querySelector('#reviveCue .revive-text')?.textContent === 'Reviving Bram', null, { timeout: 10000 });
    await wait(2600);
    await page.screenshot({ path: path.join(shots, 'ember-reviving-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(500);
    await page.screenshot({ path: path.join(shots, 'ember-reviving-phone.png') });
    await page.setViewportSize({ width: 1280, height: 720 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the cue fits a phone');
    assert.equal(boss.netTarget, ash, 'the boss turns on the reviver');
    // Bram rises: the line and Bram's health.
    await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some(t => t.textContent === 'You revived Bram'), null, { timeout: 10000 });
    assert.ok(app.clients.get(bram.id).arenaDefeated, 'Bram is up once his browser says so');
    bram.hp = 40; await wait(200);
    assert.equal(app.clients.get(bram.id).arenaDefeated, false);

    // Ash falls; Cole stands on his ember.
    spot = await me();
    await page.evaluate(() => { Game.player.execGrace = 0; Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    for (let t = 0; !app.sim.frame(false).embers.some(m => m.id === ash); t++) { if (t > 200) throw new Error('no ember for Ash'); await wait(25); }
    const fell = app.sim.frame(false).embers.find(m => m.id === ash);
    cole.at = () => ({ x: fell.x + 0.4, z: fell.z });
    await page.waitForFunction(() => document.querySelector('#reviveCue .revive-text')?.textContent === 'Cole is reviving you', null, { timeout: 10000 });
    await wait(2000);
    await page.screenshot({ path: path.join(shots, 'ember-being-revived.png') });
    await page.waitForFunction(() => Game.player.alive(), null, { timeout: 10000 });
    const risen = await page.evaluate(() => ({ hp: Game.player.hp, max: Game.player.maxHp, x: Game.player.x, z: Game.player.z }));
    assert.ok(Math.abs(risen.hp - risen.max * 1 / 3) < 1e-6, 'up with a third of the bar');
    assert.ok(Math.hypot(risen.x - fell.x, risen.z - fell.z) < 0.01, 'where he fell');
    await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some(t => t.textContent === 'Cole revived you'));
    for (let t = 0; app.clients.get(ash).arenaDefeated; t++) { if (t > 200) throw new Error('the server never saw Ash rise'); await wait(25); }
    await page.evaluate(() => { Game.player.execGrace = 1e6; });
    await wait(400);
    await page.screenshot({ path: path.join(shots, 'risen.png') });

    // Everyone falls: the end screen, four players, four titles.
    const tally = app.sim.fightTally;
    app.sim.fightTally = () => tally().map(r => ({ ...r, damage: r.damage + { [ash]: 2400, [bram.id]: 900, [cole.id]: 1300, [dara.id]: 700 }[r.id], parries: r.id === dara.id ? 9 : r.parries }));
    app.sim.arenaWipeDelay = 0.1;
    for (const t of [bram, cole, dara]) t.hp = 0;
    await page.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    await page.locator('#runSummary').waitFor({ timeout: 30000 });
    app.sim.fightTally = tally;
    const titles = await page.locator('#runSummaryRows .summary-title').allTextContents();
    assert.equal(titles.length, 4, 'a title for each of the four');
    assert.equal(new Set(titles).size, 4, 'no two the same');
    for (const t of ['9 perfect parries', 'Revived Bram', 'Revived Ash']) assert.ok(titles.includes(t), titles.join(' / '));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shots, 'summary-four-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the end screen fits a phone');
    await page.screenshot({ path: path.join(shots, 'summary-four-phone.png'), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });

    // Alone: the others leave, Ash runs again and falls; one row, one title.
    for (const t of peers) { clearInterval(t.timer); t.ws.close(); }
    await page.waitForFunction(() => multiplayer.info.players.length === 1);
    await page.locator('#runSummaryAgain').click();
    await page.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive && multiplayer.info.receivedFrames > 2, null, { timeout: 120000 });
    await page.evaluate(() => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); });
    await page.locator('#runSummary').waitFor({ timeout: 30000 });
    assert.equal(await page.locator('#runSummaryRows .summary-title').count(), 1, 'alone, the title is yours');
    assert.equal(app.sim.frame(false).embers.length, 0, 'alone, no ember');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shots, 'summary-alone-desktop.png') });
    assert.deepEqual(errors, [], 'no page errors');
    console.log('revive-browser: ok ' + titles.join(' / '));
  } finally {
    for (const t of peers) { clearInterval(t.timer); t.ws.close(); }
    await browser.close(); app.server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
