'use strict';
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const { build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
async function join(origin, name) {
  const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [], waiters = [];
  ws.on('message', data => {
    const m = JSON.parse(data), i = waiters.findIndex(w => w.test(m));
    if (i < 0) queue.push(m);
    else { const w = waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); }
  });
  const next = (type, predicate = () => true) => {
    const test = m => m.type === type && predicate(m), i = queue.findIndex(test);
    if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { test, resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error('Timed out: ' + type)); }, 4000) };
      waiters.push(w);
    });
  };
  const send = m => ws.send(JSON.stringify(m));
  await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name });
  const welcome = await next('welcome');
  return { ws, send, next, id: welcome.id, welcome, activity: async () => { send({ type: 'activity' }); send({ type: 'ping' }); await next('pong'); } };
}
(async () => {
  let clock = 0;
  const app = createServer({ activityNow: () => clock }), peers = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  const silent = new WebSocket(origin.replace('http', 'ws') + C.path, { origin });
  await once(silent, 'open');
  try {
    const a = await join(origin, 'Leader'); peers.push(a);
    assert.equal(a.welcome.leader, a.id, 'a socket that never joins cannot hold leadership'); silent.terminate();
    const b = await join(origin, 'Friend'); peers.push(b);
    const c = await join(origin, 'Other friend'); peers.push(c);
    a.send({ type: 'control', action: 'start', kind: 'arena', id: 'margit' });
    const { session } = await a.next('start');
    const pose = { ...session.spawn, hp: 120, state: 'idle', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true };
    for (const p of peers) { p.send({ type: 'ready', epoch: session.epoch }); p.send({ type: 'pose', epoch: session.epoch, pose }); }
    clock = C.leaderIdle - 1;
    await b.activity();
    assert.equal(app.clients.get(a.id).lastActivity, 0, 'leader has no actual input');
    a.send({ type: 'pose', epoch: session.epoch, pose: { ...pose, stateTime: 123 } });
    a.send({ type: 'ping' }); await a.next('pong');
    assert.equal(app.clients.get(a.id).lastActivity, 0, 'poses and pings do not reset inactivity');
    clock = C.leaderIdle;
    const changed = await a.next('roster', m => m.leader === b.id);
    assert.match(changed.notice, /inactive for five minutes/);
    assert.equal(a.ws.readyState, WebSocket.OPEN, 'demoted player stays in the game');
    assert.equal(app.session.epoch, session.epoch, 'timeout preserves the current session');
    assert.equal(app.sim.inspect().Game.duel.hp, 3200, 'timeout preserves the shared boss');
    a.send({ type: 'control', action: 'restart' });
    assert.match((await a.next('error')).message, /Only the lobby leader/, 'old leader loses authority immediately');
    assert.equal(app.session.epoch, session.epoch);
    clock++;
    a.send({ type: 'hello', protocol: C.protocol, build, name: 'Again' });
    a.send({ type: 'ping' }); await a.next('pong');
    assert.equal(app.clients.get(a.id).lastActivity, C.leaderIdle, 'a duplicate hello is not new input');
    assert.equal(app.clients.size, 3);

    clock = 2 * C.leaderIdle + 1;
    await c.next('roster', m => m.leader === null);
    assert.equal(app.clients.size, 3, 'all-idle party remains connected');
    await c.activity(); await c.next('roster', m => m.leader === c.id);
    c.send({ type: 'control', action: 'transfer', player: a.id });
    assert.match((await c.next('error')).message, /inactive/, 'manual transfer cannot hand control to another AFK player');
    await b.activity();
    c.send({ type: 'control', action: 'transfer', player: b.id });
    await b.next('roster', m => m.leader === b.id && m.players.length === 3 && m.notice === undefined);
    b.ws.close(); await c.next('roster', m => m.leader === c.id && m.players.every(p => p.id !== b.id));
    a.ws.close(); await c.next('roster', m => m.players.length === 1);
    clock += C.leaderIdle;
    await c.next('roster', m => m.leader === null);
    await c.activity(); await c.next('roster', m => m.leader === c.id);
    assert.equal(app.session.epoch, session.epoch, 'sole player can resume leadership without resetting the run');
    console.log('Leader inactivity: exact five-minute expiry, real input, demotion authority, all-idle/solo recovery, manual transfer and disconnect passed.');
  } finally { silent.terminate(); for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
