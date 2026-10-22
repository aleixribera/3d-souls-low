'use strict';
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const { build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function peer(origin) {
  const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [], waiters = [];
  ws.on('message', data => {
    const msg = JSON.parse(data), i = waiters.findIndex(w => w.test(msg));
    if (i < 0) queue.push(msg);
    else { const w = waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(msg); }
  });
  const next = type => {
    const test = m => m.type === type, i = queue.findIndex(test);
    if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { test, resolve, timer: setTimeout(() => reject(new Error('Timed out: ' + type)), 10000) };
      waiters.push(w);
    });
  };
  const send = msg => ws.send(JSON.stringify(msg));
  await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name: 'Arena friend' });
  const welcome = await next('welcome');
  return { ws, send, next, id: welcome.id };
}
(async () => {
  const app = createServer(), peers = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  const add = async () => { const p = await peer(origin); peers.push(p); return p; };
  let session;
  const pose = (p, dead = false) => p.send({ type: 'pose', epoch: session.epoch, pose: {
    ...session.spawn, hp: dead ? 0 : 120, state: dead ? 'dead' : 'idle', stateTime: 0,
    attackT: 0, chargeT: 0, walkPhase: 0, grounded: true,
  } });
  const ready = p => { p.send({ type: 'ready', epoch: session.epoch }); pose(p); };
  const flush = async p => { p.send({ type: 'ping' }); await p.next('pong'); };
  try {
    const a = await add(), b = await add();
    a.send({ type: 'control', action: 'start', kind: 'arena', id: 'margit' });
    session = (await a.next('start')).session; await b.next('start');
    assert.equal(session.teamWipeOnly, true);
    ready(a); ready(b); await flush(b);
    app.sim.inspect().Game.duel.hp -= 24;
    pose(a, true); await flush(a);
    // Wait longer than the ordinary respawn delay while a teammate survives.
    await wait((app.sim.arenaWipeDelay + 0.2) * 1000);
    assert.equal(app.session.epoch, session.epoch);
    ready(a); await flush(a);
    assert.equal(app.clients.get(a.id).pose.hp, 0, 'ready and revived poses cannot bypass defeat');
    assert.equal(app.clients.get(a.id).pose.state, 'dead');
    assert.equal(app.sim.inspect().Game.duel.hp, 3176, 'partial wipe preserves boss damage');
    pose(b, true); await flush(b);
    const oldEpoch = session.epoch;
    session = (await a.next('start')).session; await b.next('start');
    assert.ok(session.epoch > oldEpoch, 'full wipe starts a fresh shared attempt');
    assert.equal(session.id, 'margit');
    assert.equal(app.sim.inspect().Game.duel.hp, 3200, 'boss health resets');
    ready(a); ready(b); await flush(b);
    assert.equal(app.clients.get(a.id).pose.hp, 120, 'new attempt restores the party');
    // Speed up the remaining edge cases, without changing the production delay.
    app.sim.arenaWipeDelay = 0.1;
    const late = await add(); await late.next('start');
    pose(a, true); pose(b, true); await flush(b); await wait(200);
    assert.equal(app.session.epoch, session.epoch, 'loading late join blocks a premature wipe');
    late.ws.close();
    session = (await a.next('start')).session; await b.next('start');
    ready(a); ready(b); await flush(b);
    const boss = app.sim.inspect().Game.duel; boss.hp = 0; boss.die();
    pose(a, true); pose(b, true); await flush(b); await wait(200);
    assert.equal(app.session.epoch, session.epoch, 'victory is never undone by a wipe');
    a.send({ type: 'control', action: 'start', kind: 'level', id: 'long-hall' });
    session = (await a.next('start')).session; await b.next('start');
    assert.equal(session.teamWipeOnly, false);
    ready(a); ready(b); pose(a, true); pose(a); await flush(a);
    assert.equal(app.clients.get(a.id).pose.hp, 120, 'story levels keep personal respawns');
    console.log('Boss arenas: partial wipe, respawn bypass, team restart, boss reset, loading/disconnected peers, victory and level respawns passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
