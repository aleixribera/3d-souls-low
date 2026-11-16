'use strict';
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { createSimulation } = require('../server/headless.cjs');
const { createReplays } = require('../server/replays.cjs');
const { createLobby } = require('../js/lobby-host.js');
const { config: C } = require('../js/net-protocol.js');

let now = performance.now();
performance.now = () => now;
const replays = createReplays();
const lobby = createLobby({ sim: createSimulation(), build: 'test', capacity: 2, uuid: randomUUID,
  token: size => randomBytes(size).toString('hex'), board: { current: () => null, record: () => false }, replays, firstPick: false });
const step = n => { for (let i = 0; i < n; i++) { now += 1000 / C.tickRate; lobby.tick(); } };
function join(token, name = 'Ash') {
  const messages = [];
  const p = lobby.connect({ readyState: 1, bufferedAmount: 0, send: data => messages.push(JSON.parse(data)), close() {} });
  const send = msg => lobby.receive(p, msg);
  send({ type: 'hello', protocol: C.protocol, build: 'test', name, token });
  return { p, send, messages, welcome: messages.find(m => m.type === 'welcome') };
}

try {
  const first = join();
  const teammate = join(undefined, 'Bram');
  first.send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id });
  step(10);
  const epoch = lobby.session.epoch;
  const card = replays.list()[0];
  const recorder = replays.live.get(card.id);
  lobby.disconnect(first.p);
  lobby.disconnect(teammate.p);
  const before = recorder.lines;
  step(65 * C.tickRate);
  assert.ok(replays.list()[0].live, 'replay remains live as long as the run can resume');
  assert.equal(recorder.tail.lines.slice(before).map(JSON.parse).filter(line => line.k === 'f').length, 0, 'no snapshots while the lobby is empty');
  const resumed = join(first.welcome.token);
  assert.equal(resumed.welcome.id, first.welcome.id);
  assert.equal(resumed.messages.find(m => m.type === 'start').session.epoch, epoch);
  step(15);
  const resumedLines = recorder.tail.lines.slice(before).map(JSON.parse);
  assert.ok(resumedLines.some(m => m.type === 'gap' && m.seconds === 65));
  assert.equal(resumedLines.find(m => m.k === 'f').m.full, true);
  resumed.send({ type: 'control', action: 'lobby' });
  const result = resumed.messages.find(m => m.type === 'stop').summary;
  assert.equal(result.outcome, 'left');
  assert.equal(result.won, 0);
  assert.equal(replays.list().length, 1);
  const finished = replays.list()[0];
  assert.equal(finished.id, card.id);
  assert.equal(finished.live, false);
  assert.equal(finished.outcome, 'left');
  assert.ok(finished.duration < 3, 'the gap does not add dead playback time');
  assert.ok(recorder.tail.lines.map(JSON.parse).some(m => m.k === 'end' && m.summary?.key === result.key));
  const returned = join(teammate.welcome.token, 'Bram');
  assert.deepEqual(returned.welcome.results, [result], 'a disconnected participant gets the same result on reconnect');
  returned.send({ type: 'runResultSeen', key: result.key });
  lobby.disconnect(returned.p);
  const guest = join();
  assert.equal(guest.welcome.results, undefined, 'a new player does not receive another player’s result');
  lobby.disconnect(guest.p);
  assert.equal(join(teammate.welcome.token, 'Bram').welcome.results, undefined, 'acknowledged result is no longer sent');
  console.log('Replay continuity: one run, no idle snapshots, a marked gap, a full resume frame and the final result.');
} finally {
  lobby.close();
  replays.close();
}
