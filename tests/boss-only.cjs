'use strict';
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const { build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function peer(origin) {
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
  await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name: 'Boss runner' });
  return { ws, send, next, id: (await next('welcome')).id };
}
(async () => {
  const app = createServer(), peers = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  let session;
  const pose = (p, dead = false) => p.send({ type: 'pose', epoch: session.epoch, pose: {
    ...session.spawn, hp: dead ? 0 : 120, state: dead ? 'dead' : 'idle', stateTime: 0,
    attackT: 0, chargeT: 0, walkPhase: 0, grounded: true,
  } });
  const ready = p => { p.send({ type: 'ready', epoch: session.epoch }); pose(p); };
  const flush = async p => { p.send({ type: 'ping' }); await p.next('pong'); };
  try {
    const a = await peer(origin), b = await peer(origin); peers.push(a, b);
    const begin = async () => {
      a.send({ type: 'control', action: 'start', kind: 'gauntlet', id: 'boss-only' });
      session = (await a.next('start')).session; await b.next('start');
    };
    await begin();
    const bosses = app.sim.catalog().bosses;
    assert.equal(session.id, bosses[0].id); assert.equal(session.gauntlet.total, bosses.length);
    assert.equal(session.teamWipeOnly, true);
    const boss = app.sim.inspect().Game.duel;
    let updates = 0; boss.update = () => updates++;
    ready(a); await flush(a); await wait(350);
    assert.equal(updates, 0, 'boss waits for the loading teammate');
    ready(b); await flush(b); await wait(2700);
    assert.equal(updates, 0, 'three seconds of grace after the whole party loads');
    // Keep player poses fresh without altering the readiness timer.
    pose(a); pose(b); await wait(500);
    assert.ok(updates > 0, 'boss activates after the grace period');
    pose(a, true); await flush(a); pose(a); await flush(a);
    assert.equal(app.clients.get(a.id).pose.hp, 0, 'defeated players cannot respawn mid-boss');
    for (const expected of bosses) {
      assert.equal(session.id, expected.id, 'every boss appears in canonical roster order');
      const duel = app.sim.inspect().Game.duel; duel.hp = 0; duel.die();
      const epoch = session.epoch;
      await wait(150);
      assert.equal(app.session.epoch, epoch, 'victory remains visible before progression');
      app.sim.tick(C.bossVictoryDelay);
      if (!session.gauntlet.next) break;
      session = (await a.next('start')).session; await b.next('start');
      ready(a); ready(b); await flush(b);
      assert.equal(app.clients.get(a.id).pose.hp, 120, 'next boss clears defeat for everyone');
    }
    assert.match((await a.next('stop')).message, /COMPLETE/); await b.next('stop');
    assert.equal(app.session, null);
    await begin(); ready(a); ready(b); await flush(b);
    app.sim.arenaWipeDelay = 0.1;
    pose(a, true); await flush(a); await wait(200);
    assert.ok(app.session, 'one survivor keeps the run alive');
    pose(b, true); await flush(b);
    assert.match((await a.next('stop')).message, /TEAM WIPED/); await b.next('stop');
    assert.equal(app.session, null, 'wipe returns everyone to lobby');
    await begin(); assert.equal(session.id, bosses[0].id); assert.equal(session.gauntlet.number, 1);
    console.log('BOSS ONLY: loading barrier, 3s grace, defeat latch, ordered full roster, victory delay, revival, completion, wipe and retry passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
