'use strict';
// All four summons out at once in a real online party of four (PLAN.md track B item 6's check: every summon seen working
// in a real fight in a party of four). One page (Ash) and three Node teammates (Bram, Cole, Dara) in a Boss Rush; each
// takes one summon at the pick after fight 1, then in fight 2 calls it the way a player does, through the server's own
// checks: Cole's parry of a real blow sends the Grave Hound, low health raises the Stone Guardian, a flask calls the
// Ember Twin (Ash's in the page, then Bram's, run twice), and Dara's blow that breaks the boss's balance sends the
// Lancer of Ash. The page must draw all four where the server has them, one of them must draw the boss, and all four
// must go when their time is up. The engine's rules for each summon: tests/abilities.cjs.
// node tests/summons-party-browser.cjs [screenshot directory] [twin|guardian]
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
const shots = process.argv[2] || '.scratch/summons-party';
// One run: Ash (the page) holds mine, Bram holds his (the twin and the guardian, each way round: a twin is its holder's
// own figure posed as they are, so the page draws its own and a teammate's differently).
async function party(browser, mine, his) {
  const app = createServer({ dev: true, firstPick: false }), errors = [], peers = [], tag = mine.split('-')[1];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port, R = app.sim.inspect();
  const g = name => R.Game.update.constructor('return ' + name)(), ES = g('ES'), canParryHit = g('canParryHit'), PLAYER_DEF = g('PLAYER_DEF');
  const opening = ['pillagerCaptain', 'hollis'];
  const newRun = app.sim.newRun; app.sim.newRun = () => newRun(opening);
  // Each player's offer is the one summon the test hands them (the draw itself is tests/abilities.cjs's).
  const forced = new Map(), offer = app.sim.offerAbilities;
  app.sim.offerAbilities = (ids, withBots, ...rest) => {
    offer(ids, withBots, ...rest);
    for (const [id, pick] of forced) { const o = app.sim.abilityOffer(id); if (o) o.splice(0, o.length, pick); }
  };
  // A Node teammate: joins the lobby, readies for each fight, takes its summon when offered, and sends a pose every 33 ms
  // from `at` (a function) with its own health; `claim` sends a numbered claim as a browser does.
  async function teammate(name, pick) {
    const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [];
    ws.on('message', data => queue.push(JSON.parse(data)));
    const next = async type => { for (let i = 0; i < 1500; i++) { const at = queue.findIndex(m => m.type === type); if (at >= 0) return queue.splice(at, 1)[0]; await wait(20); } throw new Error(name + ' timed out: ' + type); };
    const t = { ws, next, name, pick, hp: 120, state: 'idle', at: null, epoch: null, seq: 0, send: m => ws.send(JSON.stringify(m)) };
    t.claim = (type, m) => t.send({ type, epoch: t.epoch, seq: ++t.seq, ...m });
    await once(ws, 'open'); t.send({ type: 'hello', protocol: C.protocol, build, name }); t.id = (await next('welcome')).id;
    forced.set(t.id, pick);
    ws.on('message', data => {
      const m = JSON.parse(data);
      if (m.type === 'start') { t.epoch = m.session.epoch; t.spawn = m.session.spawn; t.send({ type: 'ready', epoch: t.epoch }); }
      if (m.type === 'abilities' && m.offer && m.offer.includes(pick)) t.send({ type: 'pickAbility', epoch: t.epoch, id: pick });
    });
    t.timer = setInterval(() => {
      if (t.epoch === null || !t.at || ws.readyState !== 1) return;
      const at = t.at();
      t.send({ type: 'pose', epoch: t.epoch, pose: { ...t.spawn, ...at, hp: t.hp, state: t.state, stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true } });
    }, 33);
    peers.push(t); return t;
  }
  let page = null;
  try {
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ volume: 0 }));
      localStorage.setItem('combatArena.onlineName', 'Ash');
    });
    await page.goto(origin + '/combat-arena-3d.html#dev');
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await page.waitForFunction(() => multiplayer.connected);
    const ash = await page.evaluate(() => multiplayer.info.self);
    forced.set(ash, mine);
    const bram = await teammate('Bram', his), cole = await teammate('Cole', 'grave-hound'), dara = await teammate('Dara', 'ash-lancer');
    await page.waitForFunction(() => multiplayer.info.players.length === 4);
    await page.locator('#lobbyStart').click();
    const ready = () => page.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive && multiplayer.info.receivedFrames > 2, null, { timeout: 120000 });
    await ready();

    // Fight 1 is won at once; at the pick each takes their summon (Ash by clicking the card).
    const boss = () => R.Game.enemies[0];
    for (const e of R.Game.enemies) { e.hp = 0; e.die(); }
    await page.locator(`#abilityChoices button[data-ability="${mine}"]`).click({ timeout: 60000 });
    for (let t = 0; app.session.gauntlet.number < 2; t++) { if (t > 600) throw new Error('fight 2 never began'); await wait(50); }
    await ready();
    assert.equal(app.session.gauntlet.boss, 'hollis');
    const held = app.sim.abilities();
    assert.deepEqual([ash, bram.id, cole.id, dara.id].map(id => [...held[id]]), [[mine], [his], ['grave-hound'], ['ash-lancer']], 'each holds their summon');
    assert.ok(await page.evaluate(id => Game.player.kit.ids.includes(id), mine), "Ash's page holds it");

    // Ash stands 7 m off the boss, looking at it; the three stand round it within a blow's reach.
    await page.evaluate(() => { Game.player.execGrace = 1e6; });
    const place = async () => {
      const b = boss(), p = await page.evaluate(() => ({ x: Game.player.x, z: Game.player.z }));
      const dx = b.x - p.x, dz = b.z - p.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, d = l - 7;
      await page.evaluate(([x, z, yaw]) => { Game.player.x = x; Game.player.z = z; Game.player.yaw = yaw; Game.player.savePrev(); Game.cam.yaw = yaw; Game.updateCamera(0, true); },
        [p.x + ux * d, p.z + uz * d, Math.atan2(ux, uz)]);
      return { ux, uz };
    };
    let { ux, uz } = await place();
    const round = (ang, r) => () => { const b = boss(), c = Math.cos(ang), s = Math.sin(ang); return { x: b.x - (ux * c - uz * s) * (b.radius + r), y: b.y, z: b.z - (uz * c + ux * s) * (b.radius + r) }; };
    // Where each stands (rad round from Ash's side) so that, with each kind's own flank (CONFIG.abilities.summons), the four
    // summons spread round the boss where Ash's camera sees them.
    bram.at = round(his === 'stone-guardian' ? 2.59 : -2.79, 1.6); cole.at = round(-1.39, 1.4); dara.at = round(his === 'stone-guardian' ? -3.04 : -2.64, 1.2);
    await wait(600);

    // Cole parries a real blow of Hollis's (one with a hit that can be parried, out while he stands in reach).
    let houndOut = false;
    for (let t = 0; t < 400 && !houndOut; t++) {
      const b = boss();
      if (b.state === ES.WINDUP || b.state === ES.ACTIVE) {
        const a = b.attack, i = b.hit || 0;
        if (a && !a.projectile && canParryHit(a, i)) { cole.claim('parry', { enemy: b.netId, serial: b.netAttack, hit: i }); await wait(80); houndOut = R.abilityPowers.summonOf(cole.id)?.kind === 'hound'; }
      }
      if (!houndOut) await wait(40);
    }
    assert.ok(houndOut, "Cole's parry sends the hound");
    ({ ux, uz } = await place());   // the boss has moved while it was waited on: the frame's places again
    // Nearly down, the guardian's holder raises it (the page reports its own low health); the twin's holder drinks.
    // Dara's blow breaks Hollis's balance: the lancer.
    if (mine === 'ember-twin') {
      // The drink, then a 0.7 s hitch (a slow frame): the claim must not wait on the next frame's pose.
      await page.evaluate(() => { const p = Game.player; p.setState(PS.IDLE); p.useItem('flask'); const t = performance.now(); while (performance.now() - t < 700); });
      bram.hp = 30; await wait(120); bram.claim('ability', { when: 'low' });
    } else {
      await page.evaluate(() => { Game.player.hp = Game.player.maxHp * 0.25; });
      bram.state = 'useItem'; await wait(120); bram.claim('ability', { when: 'flask' });
    }
    const b = boss(), P = b.def.posture;
    b.sinceBreak = 99; b.posture = P.max - 0.01;
    const light = Object.values(PLAYER_DEF.moveset.attacks).find(x => x.id !== 'execute' && !x.charge).id;
    dara.claim('hit', { enemy: b.netId, swing: 'dara-1', attack: light, charge: 0 });
    const kinds = () => [ash, bram.id, cole.id, dara.id].map(id => R.abilityPowers.summonOf(id)?.kind || null);
    for (let t = 0; kinds().includes(null); t++) { if (t > 100) throw new Error('not all four out: ' + kinds().join(', ') + ' ' + JSON.stringify(await page.evaluate(() => [Game.player.state, Game.player.hp, Game.player.item('flask').count])) + ' ' + app.clients.get(ash).pose?.state); await wait(30); }
    assert.deepEqual(kinds(), mine === 'ember-twin' ? ['twin', 'guardian', 'hound', 'lancer'] : ['guardian', 'twin', 'hound', 'lancer'], 'all four summons out at once, one each');

    // Arrived: the page draws all four, each near where the server has it, and the boss is drawn by one of them.
    let drew = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 1400) { if (b.alive() && R.abilityPowers.decoy(b)) drew = true; await wait(30); }
    const seen = await page.evaluate(() => ({ figures: summonFigures.info(), hounds: summonHound.info(), twins: abilityFx.info().twins }));
    assert.deepEqual(seen.figures.map(f => f.kind).sort(), ['guardian', 'lancer'], 'the page draws the guardian and the lancer');
    assert.equal(seen.hounds.length, 1, 'the page draws the hound'); assert.equal(seen.twins, 1, 'and the twin');
    const server = Object.fromEntries([ash, bram.id, cole.id, dara.id].map(id => { const s = R.abilityPowers.summonOf(id); return [s.kind, { x: s.x, z: s.z }]; }));
    const off = (a, k) => Math.hypot(a.x - server[k].x, a.z - server[k].z);
    const gaps = { guardian: off(seen.figures.find(f => f.kind === 'guardian'), 'guardian'), lancer: off(seen.figures.find(f => f.kind === 'lancer'), 'lancer'), hound: off(seen.hounds[0], 'hound') };
    for (const [k, g] of Object.entries(gaps)) assert.ok(g < 2.5, `the page's ${k} stands where the server's does (${g.toFixed(2)} m off)`);
    assert.ok(drew, 'a summon draws the boss');
    await page.screenshot({ path: path.join(shots, `party-${tag}-desktop.png`) });
    const fps = await page.evaluate(() => new Promise(done => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 1500) requestAnimationFrame(f); else done(n / (performance.now() - t) * 1000); }; requestAnimationFrame(f); }));
    await page.screenshot({ path: path.join(shots, `party-${tag}-desktop-2.png`) });
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(400);
    await page.screenshot({ path: path.join(shots, `party-${tag}-phone.png`) });
    await page.setViewportSize({ width: 1280, height: 720 });

    // Their time up, all four go, on the server and in the page.
    for (let t = 0; kinds().some(k => k); t++) { if (t > 400) throw new Error('summons outstayed: ' + kinds().join(', ')); await wait(50); }
    await wait(1500);
    const after = await page.evaluate(() => summonFigures.info().length + summonHound.info().length + abilityFx.info().twins);
    assert.equal(after, 0, 'gone from the page too');
    assert.deepEqual(errors, [], 'no page errors');
    console.log(`summons-party-browser: ok, Ash holds ${mine}, four summons out at once; page vs server gap ${Object.entries(gaps).map(([k, g]) => k + ' ' + g.toFixed(2)).join(', ')} m; ${fps.toFixed(0)} fps with all four`);
  } finally {
    for (const t of peers) { clearInterval(t.timer); t.ws.close(); }
    await page?.close(); app.close?.(); app.server.close();
  }
}
(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const only = process.argv[3];   // 'twin' or 'guardian': only the run where Ash holds that one
  try {
    if (only !== 'guardian') await party(browser, 'ember-twin', 'stone-guardian');
    if (only !== 'twin') await party(browser, 'stone-guardian', 'ember-twin');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
