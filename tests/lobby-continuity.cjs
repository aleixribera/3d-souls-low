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
  const app = createServer(), peers = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  const add = async name => { const p = await join(origin, name); peers.push(p); return p; };
  const ready = (p, session) => {
    p.send({ type: 'ready', epoch: session.epoch });
    p.send({ type: 'pose', epoch: session.epoch, pose: { ...session.spawn, yaw: 0, hp: 120, state: 'idle', stateTime: 0,
      attackT: 0, chargeT: 0, walkPhase: 0, grounded: true } });
  };
  try {
    const a = await add('Leader'), b = await add('Friend'), c = await add('Other friend');
    a.send({ type: 'control', action: 'start', kind: 'campaign', id: 'lands' });
    const { session } = await a.next('start');
    for (const p of peers) ready(p, session);
    await b.next('frame', m => m.frame.time > 0);
    const { Game, world } = app.sim.inspect();
    const zone = Game.zones.find(z => z.id === 'zone-heath');
    for (const e of zone.actors) { e.hp = 0; e.die(); }
    const boss = Game.enemies.find(e => e.baseDef.id === 'margit');
    boss.hp -= 24; const bossHp = boss.hp;
    await b.next('frame', m => m.frame.gates.some(g => g.id === zone.id && g.open));
    // Model a background tab whose animation loop stops publishing poses.
    app.clients.get(a.id).lastPose = -Infinity;
    const before = app.sim.state.time;
    await b.next('frame', m => m.frame.time > before);
    assert.equal(app.session.epoch, session.epoch);
    assert.equal(b.ws.readyState, WebSocket.OPEN);
    a.ws.terminate();
    await b.next('roster', m => m.players.length === 2 && m.leader === b.id);
    c.ws.terminate();
    await b.next('roster', m => m.players.length === 1);
    const after = app.sim.state.time;
    await b.next('frame', m => m.frame.time > after);
    assert.equal(app.session.epoch, session.epoch, 'leader and non-leader drops preserve the level');
    assert.equal(boss.hp, bossHp, 'shared enemy health survives disconnects');
    assert.ok(world.gates.find(g => g.id === zone.id).open, 'won gates stay open');
    b.ws.terminate();
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(app.clients.size, 0);
    assert.equal(app.session.epoch, session.epoch, 'even the last disconnect preserves the run');
    const rejoined = await add('Reconnected');
    assert.deepEqual((await rejoined.next('start')).session, session);
    ready(rejoined, session);
    const baseline = await rejoined.next('frame', m => m.full);
    assert.equal(baseline.frame.enemies.find(e => e.id === boss.netId).hp, bossHp);
    assert.ok(baseline.frame.gates.find(g => g.id === zone.id).open);
    // All-dead/stale players must not strand a reserved execution or prevent
    // a completed campaign chapter from advancing.
    app.sim.setPlayers([{ ...session.spawn, yaw: 0, hp: 120, state: 'idle', id: rejoined.id }]);
    boss.setState('broken');
    assert.ok(app.sim.beginExecution(rejoined.id, { enemy: boss.netId }));
    app.sim.setPlayers([]);
    for (let i = 0; i < 600; i++) app.sim.tick(1 / C.tickRate);
    assert.equal(boss.netExec, null, 'abandoned execution resolves without a living owner');
    for (const e of Game.enemies) { e.hp = 0; e.die(); }
    for (let i = 0; i <= Math.ceil(app.sim.campaignAdvanceTime * C.tickRate); i++) app.sim.tick(1 / C.tickRate);
    const next = (await rejoined.next('start', m => m.session.id === session.campaign.next)).session;
    assert.equal(next.campaign.number, 2, 'campaign continues after original party drops');
    console.log('Continuity: stale leader, leader/non-leader/last disconnect, rejoin baseline, enemy HP, gates, abandoned execution and campaign advance passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
