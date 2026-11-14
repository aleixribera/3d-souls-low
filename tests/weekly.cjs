'use strict';
// The weekly run (PLAN.md track B item 8): Boss Rush on one seed per ISO week, so two runs of the same week meet the
// same bosses, modifiers and ability offers; a new week is a new run. The server keeps the week's board (furthest runs,
// fastest kills, by the party's names) in a file, so it survives a restart, and a new week starts it empty.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const { createBoard } = require('../server/board.cjs');
const { build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function peer(origin, name) {
  const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [];
  ws.on('message', data => queue.push(JSON.parse(data)));
  const next = async type => {
    for (let i = 0; i < 500; i++) {
      const at = queue.findIndex(m => m.type === type);
      if (at >= 0) return queue.splice(at, 1)[0];
      await wait(20);
    }
    throw new Error('Timed out: ' + type);
  };
  const send = m => ws.send(JSON.stringify(m));
  await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name });
  const welcome = await next('welcome');
  return { ws, send, next, queue, id: welcome.id, welcome };
}
const SATURDAY = Date.UTC(2026, 10, 14, 12), MONDAY = Date.UTC(2026, 10, 9, 0, 0, 1), NEXT_MONDAY = Date.UTC(2026, 10, 16, 0, 0, 1);
async function serve(options) {
  const app = createServer(options);
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  return { app, origin: 'http://127.0.0.1:' + app.server.address().port };
}
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-')), boardFile = path.join(dir, 'data', 'weekly-board.json');
  let clock = SATURDAY, servers = [], peers = [];
  try {
    // ---- The seed: one per ISO week (UTC) ----
    let { app, origin } = await serve({ dateNow: () => clock, boardFile }); servers.push(app);
    const sim = app.sim;
    assert.equal(sim.weekOf(SATURDAY), '2026-W46'); assert.equal(sim.weekOf(MONDAY), '2026-W46', 'a week starts on Monday, UTC');
    assert.equal(sim.weekOf(NEXT_MONDAY), '2026-W47'); assert.equal(sim.weekOf(Date.UTC(2021, 0, 3)), '2020-W53', 'ISO weeks across a new year');
    const run = sim.weeklyRun(SATURDAY);
    assert.deepEqual(sim.weeklyRun(MONDAY), run, 'the whole week shares one run');
    assert.notEqual(sim.weeklyRun(NEXT_MONDAY).seed, run.seed, 'a new week is a new run');
    for (let n = 0; n < 20; n++) {
      const g = sim.calling(run, n);
      assert.deepEqual(sim.calling(sim.weeklyRun(MONDAY), n), g, `fight ${n + 1} is the same all week`);
      assert.equal(g.id, C.weekly.id); assert.equal(g.name, C.weekly.name); assert.equal(g.run.week, '2026-W46');
    }
    assert.throws(() => sim.calling({ ...run, seed: run.seed + 1 }), /Unknown Boss Rush run/, 'a week is only its own seed');
    assert.throws(() => sim.calling({ ...run, opening: [sim.catalog().bosses[0].id] }), /Unknown Boss Rush run/, 'a weekly run has no opening');
    // The offers: the same seed and holdings draw the same cards; Boss Rush's own runs are seeded the same way.
    const held = [], draw = seed => { sim.giveAbilities('solo', held); sim.offerAbilities(['solo'], false, 0, 3, false, seed); return sim.abilityOffer('solo'); };
    for (let fight = 0; fight < 12; fight++) {
      const seed = sim.offerSeed(run, fight), offered = draw(seed);
      assert.deepEqual(draw(seed), offered, `fight ${fight + 1}'s offer is the same for the same kit`);
      held.push(offered[0]);
    }
    sim.giveAbilities('solo', []);

    // ---- Two weekly runs over the wire meet the same bosses and offers ----
    let session;
    const a = await peer(origin, 'Ash'); peers.push(a);
    assert.deepEqual(a.welcome.board, { week: '2026-W46', runs: [], kills: [] }, 'the welcome brings this week\'s board');
    const pose = (dead = false) => a.send({ type: 'pose', epoch: session.epoch, pose: { ...session.spawn, hp: dead ? 0 : 120, state: dead ? 'dead' : 'idle', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true } });
    const ready = async () => { a.send({ type: 'ready', epoch: session.epoch }); pose(); a.send({ type: 'ping' }); await a.next('pong'); };
    const finishFight = () => { for (const e of sim.inspect().Game.enemies) { e.hp = 0; e.die(); } sim.tick(Math.max(C.bossVictoryDelay, C.leaderboardDelay + C.leaderboardTime)); };
    const weekly = async () => {
      a.send({ type: 'control', action: 'start', kind: 'calling', id: C.weekly.id });
      session = (await a.next('start')).session;
      const seen = [];
      for (let fight = 0; fight < 3; fight++) {
        seen.push({ boss: session.id, partners: session.partners || [], modifiers: session.gauntlet.modifiers });
        await ready(); finishFight();
        const o = await a.next('abilities'); seen[fight].offer = o.offer;
        a.send({ type: 'pickAbility', epoch: session.epoch, id: o.offer[0] }); await a.next('abilities');
        session = (await a.next('start')).session;
      }
      return seen;
    };
    const first = await weekly();
    assert.equal(session.gauntlet.id, C.weekly.id); assert.equal(session.gauntlet.run.week, '2026-W46');
    assert.equal(sim.describe(session), 'Weekly Run');
    const second = await weekly();
    assert.deepEqual(second, first, 'two runs of the same week meet the same bosses, modifiers and offers');
    a.send({ type: 'control', action: 'start', kind: 'calling', id: C.weekly.id, opening: [first[0].boss] }); a.send({ type: 'ping' }); await a.next('pong');
    assert.equal(app.session.gauntlet.number, 4, 'a weekly run with an opening by hand is refused');

    // ---- Its end goes on the board, the fight reached and each lone boss's fastest kill ----
    await ready(); sim.arenaWipeDelay = 0.1; pose(true);
    const end = await a.next('stop');
    assert.equal(end.reason, 'team-wipe'); assert.match(end.message, /YOU FELL.*WEEKLY RUN/); assert.equal(end.summary.id, C.weekly.id);
    const posted = (await a.next('board')).board;
    assert.equal(posted.runs.length, 1); assert.deepEqual(posted.runs[0].names, ['Ash']);
    assert.equal(posted.runs[0].reached, 4, 'fell at fight 4'); assert.equal(posted.runs[0].beaten, end.summary.beaten);
    const lone = end.summary.times.filter(t => t.bosses.length === 1);
    assert.equal(posted.kills.length, new Set(lone.map(t => t.bosses[0])).size, 'a kill per boss met alone');
    assert.ok(posted.kills.every(k => k.names[0] === 'Ash' && Number.isInteger(k.time)));
    // A Boss Rush run is not on the weekly board.
    a.send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id }); session = (await a.next('start')).session;
    await ready(); pose(true); await a.next('stop'); a.send({ type: 'ping' }); await a.next('pong');
    assert.ok(!a.queue.some(m => m.type === 'board'), 'Boss Rush runs stay off the weekly board');

    // ---- The board survives a restart; a new week starts it empty ----
    a.ws.terminate(); peers = []; await app.close(); servers = [];
    ({ app, origin } = await serve({ dateNow: () => clock, boardFile })); servers.push(app);
    const back = await peer(origin, 'Ember'); peers.push(back);
    assert.deepEqual(back.welcome.board, posted, 'the board is the same after a restart');
    back.ws.terminate(); peers = []; await app.close(); servers = [];
    clock = NEXT_MONDAY;
    ({ app, origin } = await serve({ dateNow: () => clock, boardFile })); servers.push(app);
    const monday = await peer(origin, 'Ash'); peers.push(monday);
    assert.deepEqual(monday.welcome.board, { week: '2026-W47', runs: [], kills: [] }, 'a new week starts an empty board');
    // A weekly run given up after a win counts too: a restart (as this week's run) or the lobby.
    monday.send({ type: 'control', action: 'start', kind: 'calling', id: C.weekly.id }); session = (await monday.next('start')).session;
    const go = async () => { monday.send({ type: 'ready', epoch: session.epoch }); monday.send({ type: 'pose', epoch: session.epoch, pose: { ...session.spawn, hp: 120, state: 'idle', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true } }); monday.send({ type: 'ping' }); await monday.next('pong'); };
    await go(); for (const e of app.sim.inspect().Game.enemies) { e.hp = 0; e.die(); } app.sim.tick(Math.max(C.bossVictoryDelay, C.leaderboardDelay + C.leaderboardTime));
    const o = await monday.next('abilities'); monday.send({ type: 'pickAbility', epoch: session.epoch, id: o.offer[0] }); await monday.next('abilities');
    session = (await monday.next('start')).session; await go();
    monday.send({ type: 'control', action: 'restart' });
    const restarted = (await monday.next('start')).session;
    assert.equal(restarted.gauntlet.number, 1); assert.equal(restarted.gauntlet.run.week, '2026-W47', 'a restart is this week\'s run');
    const left = (await monday.next('board')).board;
    assert.deepEqual(left.runs.map(r => [r.names, r.reached, r.beaten]), [[['Ash'], 2, 1]], 'a restart after a win puts the run on the board');
    monday.send({ type: 'control', action: 'lobby' }); await monday.next('stop'); monday.send({ type: 'ping' }); await monday.next('pong');
    assert.ok(!monday.queue.some(m => m.type === 'board'), 'a run left before any win is not on the board');

    // ---- The board alone: a party keeps its best run, a boss its fastest kill, the lists their size ----
    const week = () => '2026-W46', boss = sim.catalog().bosses.map(e => e.id);
    const b = createBoard({ size: 3, bosses: boss, weekOf: week });
    b.record('2026-W46', { names: ['Ash', 'Ember'], reached: 5, beaten: 4, time: 400, fights: [{ bosses: [boss[0]], time: 50 }, { bosses: [boss[1], boss[2]], time: 70 }] });
    b.record('2026-W46', { names: ['Ember', 'Ash'], reached: 3, beaten: 2, time: 100, fights: [{ bosses: [boss[0]], time: 40 }] });
    assert.equal(b.current().runs.length, 1, 'one row per party'); assert.equal(b.current().runs[0].reached, 5, 'its best run');
    assert.deepEqual(b.current().kills.map(k => [k.boss, k.time]), [[boss[0], 40]], 'the fastest kill of a boss; a pair has none');
    for (let i = 0; i < 5; i++) b.record('2026-W46', { names: ['P' + i], reached: 2 + i, beaten: 1 + i, time: 60, fights: [] });
    assert.deepEqual(b.current().runs.map(r => r.reached), [6, 5, 5], 'furthest first, the list cut to its size');
    assert.equal(b.record('2026-W45', { names: ['Late'], reached: 9, beaten: 8, time: 1, fights: [] }), false, 'a run of last week is not counted');
    assert.equal(b.record('2026-W46', { names: [], reached: 9, beaten: 8, time: 1, fights: [] }), false, 'a run needs a name');
    fs.writeFileSync(boardFile, '{ not json');
    assert.deepEqual(createBoard({ file: boardFile, bosses: boss, weekOf: week }).current(), { week: '2026-W46', runs: [], kills: [] }, 'a broken file starts the week empty');
    console.log('WEEKLY RUN: one seed per ISO week, the same bosses, modifiers and offers in two runs, the board (furthest, fastest kills), kept across a restart, reset by a new week passed.');
  } finally {
    for (const p of peers) p.ws.terminate();
    for (const s of servers) await s.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
