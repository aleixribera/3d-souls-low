'use strict';
// The lobby's session without a network (js/lobby-host.js), as the page runs it alone (js/alone.js): one socket that is
// only an object, a clock the test turns. A Boss Rush run from hello to its end screen: the run starts, frames come,
// the free pick holds the boss, a kill offers abilities, the next fight drops in, a pause holds everything, and a fall
// ends the run on its summary. The same session over real sockets: tests/multiplayer.cjs, calling.cjs, revive.cjs.
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { createSimulation } = require('../server/headless.cjs');
const { createLobby } = require('../js/lobby-host.js');
const { config: C } = require('../js/net-protocol.js');

// The test's clock: performance.now is everyone's (the lobby's and the simulation's), turned one tick at a time.
let clock = performance.now();
performance.now = () => clock;
const sim = createSimulation();
const lobby = createLobby({ sim, build: 'alone', capacity: 1, token: n => randomBytes(n).toString('hex'), uuid: randomUUID,
  board: { current: () => null, record: () => false } });
const inbox = [];
const ws = { readyState: 1, bufferedAmount: 0, send: text => inbox.push(JSON.parse(text)), close(code, reason) { this.readyState = 3; this.closed = { code, reason }; } };
const p = lobby.connect(ws);
const send = msg => lobby.receive(p, JSON.parse(JSON.stringify(msg)));
const take = type => { const i = inbox.findIndex(m => m.type === type); return i < 0 ? null : inbox.splice(i, 1)[0]; };
let session = null, hp = 120;
const pose = () => send({ type: 'pose', epoch: session.epoch, pose: { ...session.spawn, hp, state: hp > 0 ? 'idle' : 'dead', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true } });
// Ticks until `done()` (a pose every other tick, as a browser sends them), at most `seconds` of the clock.
function run(done, seconds = 30, paused = false) {
  for (let i = 0; i < seconds * C.tickRate; i++) {
    clock += 1000 / C.tickRate;
    if (session && i % 2 === 0) pose();
    lobby.tick(paused);
    if (done()) return true;
  }
  return false;
}

send({ type: 'hello', protocol: C.protocol, build: 'alone', name: 'Ash' });
const welcome = take('welcome');
assert.ok(welcome && welcome.id === p.id, 'welcome');
assert.equal(lobby.leader, p.id, 'alone, the player leads');
send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id, opening: ['ostrey'] });
let start = take('start');
assert.ok(start && start.opening, 'the run starts, with its intro');
session = start.session;
assert.equal(session.gauntlet.id, C.calling.id);
assert.equal(session.gauntlet.boss, 'ostrey');
send({ type: 'ready', epoch: session.epoch });

// The free pick before fight 1: the boss waits for it.
assert.ok(run(() => inbox.some(m => m.type === 'abilities')), 'the free pick is offered');
const free = take('abilities');
assert.equal(sim.state.fought, 0, 'the boss waits for the pick');
send({ type: 'pickAbility', epoch: session.epoch, id: free.offer[0] });
assert.ok(run(() => inbox.some(m => m.type === 'firstPick')), 'the pick is taken');
assert.ok(run(() => sim.state.fought > 1), 'then the boss wakes and the fight runs');
assert.ok(inbox.some(m => m.type === 'frame'), 'frames come');

// A pause holds the run: no simulated time passes, and ten paused minutes (no poses, as the paused page sends none)
// neither count toward the run's time nor make the player idle.
const held = sim.state.time, pausedFor = 600;
for (let i = 0; i < pausedFor * C.tickRate; i++) { clock += 1000 / C.tickRate; lobby.tick(true); }
assert.equal(sim.state.time, held, 'paused, the run holds');
assert.equal(lobby.leader, p.id, 'a long pause leaves the player leading');

// The boss falls: the pick between fights, then fight 2 drops straight in.
for (const e of sim.inspect().Game.enemies) { e.hp = 0; e.die(); }
inbox.length = 0;
assert.ok(run(() => inbox.some(m => m.type === 'abilities')), 'a kill offers abilities');
const offer = take('abilities');
send({ type: 'pickAbility', epoch: session.epoch, id: offer.offer[0] });
assert.ok(run(() => inbox.some(m => m.type === 'start')), 'the next fight starts');
start = take('start');
session = start.session;
assert.equal(session.gauntlet.number, 2, 'fight 2');
assert.ok(session.drop, 'with no loading card');
assert.deepEqual(session.abilities[p.id], [free.offer[0], offer.offer[0]], 'both picks are held');
send({ type: 'ready', epoch: session.epoch });
assert.ok(run(() => sim.state.fought > 0.5), 'fight 2 runs');

// Alone, a fall ends the run on its summary.
hp = 0;
assert.ok(run(() => inbox.some(m => m.type === 'stop')), 'a fall ends the run');
const stop = take('stop');
assert.equal(stop.reason, 'team-wipe');
assert.equal(stop.summary.outcome, 'wiped');
assert.equal(stop.summary.reached, 2, 'the fight reached');
assert.equal(stop.summary.won, 1);
assert.equal(stop.summary.players.length, 1);
assert.equal(stop.summary.players[0].name, 'Ash');
assert.ok(stop.summary.time < pausedFor, `the paused minutes are not run time: ${stop.summary.time} s`);
assert.ok(typeof stop.summary.key === 'string' && stop.summary.key.length === 16, 'a run key for the rewards (js/progress.js)');
assert.equal(lobby.session, null);

lobby.disconnect(p);
assert.equal(lobby.clients.size, 0);
lobby.close();
console.log('Lobby host: a Boss Rush run alone, from hello through the free pick, a kill, fight 2, a pause and a fall to its summary, passed.');
