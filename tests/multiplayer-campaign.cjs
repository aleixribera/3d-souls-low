'use strict';
// Exercise the public campaign over real WebSockets, including every chapter.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const { build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C, FrameDecoder } = require('../js/net-protocol.js');
const chapters = ['stormhill', 'stormveil', 'evergaol', 'leyndell', 'ashen-capital', 'farum-azula', 'erdtree', 'haligtree'];
function peer(url) {
  const ws = new WebSocket(url, { origin: url.replace('ws:', 'http:').replace('/lobby', '') }), decoder = new FrameDecoder(), queue = [], waiting = [];
  ws.on('message', data => {
    let m = JSON.parse(data); if (m.type === 'frame') m = decoder.decode(m);
    const i = waiting.findIndex(w => w.test(m));
    if (i < 0) queue.push(m);
    else { const w = waiting.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); }
  });
  const send = m => ws.send(JSON.stringify(m));
  const next = (type, predicate = () => true) => {
    const test = m => m.type === type && predicate(m), i = queue.findIndex(test);
    if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { test, resolve, timer: setTimeout(() => { waiting.splice(waiting.indexOf(w), 1); reject(new Error('Timed out: ' + type)); }, 10000) };
      waiting.push(w);
    });
  };
  return { ws, next, send, async join() { await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name: 'Campaign friend' }); return next('welcome'); },
    ready(s) { send({ type: 'ready', epoch: s.epoch }); send({ type: 'pose', epoch: s.epoch, pose: { ...s.spawn, yaw: 0, hp: 120, state: 'idle', stateTime: 0,
      grounded: true, attack: null, attackT: 0, charge: 0, chargeT: 0, walkPhase: 0 } }); } };
}
(async () => {
  const app = createServer(), peers = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const url = `ws://127.0.0.1:${app.server.address().port}/lobby`;
  const add = async () => { const p = peer(url); peers.push(p); return [p, await p.join()]; };
  try {
    const [a, welcome] = await add(), [b] = await add();
    assert.deepEqual(welcome.catalog.defaultAdventure, { kind: 'campaign', id: 'lands' });
    assert.equal(welcome.catalog.campaigns.find(c => c.id === 'lands').chapters, 8);
    a.send({ type: 'control', action: 'start', kind: 'campaign', id: 'unknown' });
    assert.match((await a.next('error')).message, /Unknown campaign/);
    a.send({ type: 'control', action: 'start', ...welcome.catalog.defaultAdventure });
    let session = (await a.next('start')).session;
    await b.next('start');
    for (let i = 0; i < chapters.length; i++) {
      assert.equal(session.id, chapters[i]);
      assert.equal(session.kind, 'level');
      assert.equal(session.campaign.id, 'lands');
      assert.equal(session.campaign.number, i + 1);
      assert.equal(session.campaign.total, 8);
      assert.equal(session.campaign.next, chapters[i + 1] || null);
      assert.ok(session.campaign.title && session.campaign.line);
      if (i === 0) {
        assert.equal(session.opening, true, 'new campaigns carry the opening ceremony');
        const held = () => app.sim.inspect().Game.enemies.map(e => [e.netId, e.x, e.y, e.z, e.state, e.stateTime]);
        const before = held();
        a.ready(session);
        await a.next('frame', m => m.frame.epoch === session.epoch && m.frame.time > 0.1);
        assert.deepEqual(held(), before, 'story enemies wait until the whole party has finished its intro');
      } else assert.equal(session.opening, undefined, 'automatic chapters do not repeat the ceremony');
      for (const p of peers) p.ready(session);
      await a.next('frame', m => m.frame.epoch === session.epoch && m.frame.time > 0);
      if (i === 0) {
        a.send({ type: 'control', action: 'next' });
        assert.match((await a.next('error')).message, /Finish this level/);
        b.send({ type: 'control', action: 'next' });
        assert.match((await b.next('error')).message, /leader/);
      }
      if (i === 2) {
        a.send({ type: 'control', action: 'restart' });
        const oldEpoch = session.epoch;
        session = (await a.next('start')).session;
        await b.next('start');
        assert.ok(session.epoch > oldEpoch);
        assert.equal(session.campaign.number, 3, 'restart preserves the chapter');
        for (const p of peers) p.ready(session);
        await a.next('frame', m => m.frame.epoch === session.epoch && m.frame.time > 0);
        const [late, lateWelcome] = await add();
        assert.equal(lateWelcome.session.campaign.number, 3);
        assert.deepEqual((await late.next('start')).session, session);
        late.ready(session);
        await late.next('frame', m => m.frame.epoch === session.epoch);
      }
      for (const e of app.sim.inspect().Game.enemies) { e.hp = 0; e.die(); }
      // Keep the fixture's players present while advancing the normal fixed-step
      // clock. The real server still decides when to publish/start the next map.
      app.sim.tick(1 / C.tickRate);
      assert.equal(app.sim.state.complete, true, chapters[i] + ' completes from shared gates');
      if (i === 0 || i === chapters.length - 1) {
        for (let n = 0; n < Math.ceil(app.sim.campaignAdvanceTime * C.tickRate) + 1; n++) app.sim.tick(1 / C.tickRate);
      }
      if (i < chapters.length - 1) {
        if (i > 0) a.send({ type: 'control', action: 'next' });
        const oldEpoch = session.epoch;
        session = (await a.next('start')).session;
        assert.ok(session.epoch > oldEpoch);
        for (const p of peers.slice(1)) assert.deepEqual((await p.next('start')).session, session, 'everyone enters the same chapter');
      } else {
        a.send({ type: 'control', action: 'next' });
        assert.match((await a.next('error')).message, /Finish this level/);
        assert.equal((await a.next('frame', m => m.frame.epoch === session.epoch && m.frame.complete)).frame.epoch, session.epoch, 'final chapter stays completed');
        assert.equal(app.sim.state.epoch, session.epoch, 'campaign does not wrap or enter another road');
      }
    }
    console.log('Default Elden Ring campaign: all eight chapters, party auto-advance, leader controls, restart, late join and final completion passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
