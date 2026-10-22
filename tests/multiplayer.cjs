'use strict';
// Real server/transport tests plus shared-engine coverage. No renderer required.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createSimulation, build } = require('../server/headless.cjs');
const { createServer } = require('../server/index.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const C = require('../js/net-protocol.js').config;
const { FrameDecoder } = require('../js/net-protocol.js');
const pose = (x = 0, z = 0) => ({ x, z, y: 0, yaw: 0, hp: 120, state: 'idle', stateTime: 0,
  grounded: true, attack: null, attackT: 0, charge: 0, chargeT: 0, walkPhase: 0 });
function peer(url, origin) {
  const ws = new WebSocket(url, { origin });
  const decoder = new FrameDecoder();
  const queue = [], waiters = [];
  ws.on('message', data => {
    let m = JSON.parse(data); if (m.type === 'frame') m = decoder.decode(m);
    const index = waiters.findIndex(w => w.test(m));
    if (index >= 0) { const w = waiters.splice(index, 1)[0]; clearTimeout(w.timer); w.resolve(m); } else queue.push(m);
  });
  const next = (type, predicate = () => true) => {
    const test = m => m.type === type && predicate(m), index = queue.findIndex(test);
    if (index >= 0) return Promise.resolve(queue.splice(index, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { test, resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error('Timed out waiting for ' + type)); }, 8000) };
      waiters.push(w);
    });
  };
  return { ws, queue, next, send: msg => ws.send(JSON.stringify(msg)), join: async () => {
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', protocol: C.protocol, build, name: 'Test player' })); return next('welcome');
  } };
}
(async () => {
  const sim = createSimulation(), catalog = sim.catalog();
  for (const level of catalog.levels) {
    sim.start('level', level.id);
    const { Game, world } = sim.inspect(), s = sim.state.checkpoint;
    assert.ok(Number.isFinite(s.y), level.id + ' spawn has a floor');
    assert.equal(new Set(Game.enemies.map(e => e.netId)).size, Game.enemies.length, level.id + ' stable unique enemy IDs');
    sim.setPlayers([{ ...pose(s.x, s.z), y: s.y, id: 'a' }, { ...pose(s.x, s.z), y: s.y, id: 'b' }]);
    for (let i = 0; i < 180; i++) sim.tick(1 / 60);
    assert.ok(sim.frame().enemies.every(e => Number.isFinite(e.x) && Number.isFinite(e.y)), level.id + ' simulation remains finite');
    for (const t of world.traps) {
      assert.ok(t.region, level.id + ' trap resolves its floor');
      const x = (t.trigger[0] + t.trigger[1]) / 2, z = (t.trigger[2] + t.trigger[3]) / 2;
      sim.setPlayers([{ ...pose(x, z), y: t.y, state: 'execute', id: 'a' }]);
      sim.tick(1 / 60); assert.equal(t.state, 'set', 'execution cannot trigger a collapse');
      sim.setPlayers([{ ...pose(x, z), y: t.y, id: 'a' }]);
      for (let i = 0; i <= Math.ceil(t.warning * 60) + 1; i++) sim.tick(1 / 60);
      assert.equal(t.state, 'sprung', level.id + ' shared floor collapse triggers');
      const cx = (t.collapse[0] + t.collapse[1]) / 2, cz = (t.collapse[2] + t.collapse[3]) / 2;
      assert.ok(world.groundAt(cx, cz, t.y) < t.y, level.id + ' collapsed floor loses collision');
    }
  }
  for (const boss of catalog.bosses) {
    sim.start('arena', boss.id); sim.setPlayers([{ ...pose(), id: 'a' }, { ...pose(2, 0), id: 'b' }]);
    for (let i = 0; i < 360; i++) sim.tick(1 / 60);
    assert.ok(sim.frame().enemies.every(e => Number.isFinite(e.hp)), boss.id + ' headless AI');
  }
  console.log(`Shared simulation: ${catalog.levels.length} levels and ${catalog.bosses.length} opponents passed.`);
  // Two separate fights retain solo crowd speed and surround their own target.
  sim.start('level', 'long-hall');
  const split = sim.inspect(), first = split.Game.zones.find(z => z.id === 'zone-hollow').actors[0], second = split.Game.zones.find(z => z.id === 'zone-rogue').actors[0];
  sim.setPlayers([{ ...pose(first.x + 2, first.z), id: 'a' }, { ...pose(second.x + 2, second.z), id: 'b' }]);
  const observed = [];
  for (const e of [first, second]) {
    const original = e.update;
    e.update = function (dt, target) {
      observed.push({ enemy: this.netId, target: target.id, others: split.crowd.enemies.map(e => e.netId), rate: split.crowd.cooldownRate(this) });
      return original.call(this, dt, target);
    };
    e.beginAttack(e.baseDef.attacks[0]);
  }
  sim.tick(1 / 60);
  assert.equal(observed.find(o => o.enemy === first.netId).target, 'a');
  assert.equal(observed.find(o => o.enemy === second.netId).target, 'b');
  assert.ok(observed.every(o => o.rate === 1), 'unrelated distant attack does not slow a local enemy cooldown');
  assert.ok(observed.every(o => !o.others.includes(o.enemy === first.netId ? second.netId : first.netId)), 'crowds belong to the actual target');
  sim.start('arena', 'margit'); sim.setPlayers([{ ...pose(6, -3), id: 'a' }, { ...pose(-12, 0), id: 'b' }]);
  for (let i = 0; i < 60; i++) sim.tick(1 / 60);
  const e = sim.inspect().Game.duel;
  assert.equal(e.netTarget, 'a', 'server selects nearby player');
  const hp = e.hp;
  assert.equal(sim.hit('a', { enemy: e.netId, attack: 'light', charge: 0 }), true);
  assert.equal(e.hp, hp - 24, 'server computes damage from game data');
  assert.equal(sim.hit('a', { enemy: e.netId, attack: 'missing', charge: 0 }), false);
  const parryable = e.baseDef.attacks.find(a => !a.noParry && !a.projectile && !a.rollOnly);
  e.beginAttack(parryable); sim.tick(1 / 60); const oldSerial = e.netAttack;
  e.beginAttack(parryable); const newSerial = e.netAttack;
  assert.equal(sim.parry('a', { enemy: e.netId, serial: oldSerial }), true, 'accept a successful parry of the displayed recent move');
  assert.equal(e.netAttack, newSerial); assert.equal(e.state, 'windup', 'a late parry never cancels an unrelated new move');
  assert.ok(e.posture > 0, 'late parries still grant shared posture damage');
  e.setState('broken');
  assert.equal(sim.beginExecution('a', { enemy: e.netId }), true);
  assert.equal(sim.beginExecution('b', { enemy: e.netId }), false, 'execution has a single owner');
  assert.equal(e.state, 'executed');
  sim.endExecution('b', e.netId); assert.equal(e.state, 'executed', 'other player cannot finish execution');
  const before = e.hp; sim.endExecution('a', e.netId); assert.ok(e.hp < before && e.hp >= before - e.def.hp / 2, 'boss execution respects cap');
  const app = createServer({ capacity: 4 });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${app.server.address().port}`, url = origin.replace('http', 'ws') + '/lobby';
  const peers = [];
  try {
    assert.equal((await fetch(origin + '/healthz')).status, 200);
    assert.equal((await fetch(origin + '/server/index.cjs')).status, 404);
    assert.equal((await fetch(origin + '/js/%2e%2e/server/index.cjs')).status, 404);
    assert.equal((await fetch(origin + '/js/net-protocol.js')).status, 200);
    const a = peer(url, origin); peers.push(a); const wa = await a.join();
    const b = peer(url, origin); peers.push(b); const wb = await b.join();
    assert.equal(wa.leader, wa.id); assert.equal(wb.leader, wa.id);
    b.send({ type: 'control', action: 'start', kind: 'arena', id: 'margit' });
    assert.match((await b.next('error')).message, /leader/);
    a.send({ type: 'control', action: 'start', kind: 'arena', id: 'margit' });
    const start = await a.next('start'); await b.next('start');
    const epoch = start.session.epoch;
    for (const p of [a, b]) { p.send({ type: 'ready', epoch }); p.send({ type: 'pose', epoch, pose: pose() }); }
    await a.next('frame', m => m.frame.time > 0);
    a.send({ type: 'hit', epoch, seq: 1, enemy: 'duel/margit', attack: 'light', charge: 0, swing: 'one' });
    a.send({ type: 'hit', epoch, seq: 2, enemy: 'duel/margit', attack: 'light', charge: 0, swing: 'one' });
    await a.next('frame', m => m.frame.enemies[0].hp < 3200);
    assert.equal(app.sim.inspect().Game.duel.hp, 3176, 'duplicate contacts do not damage twice');
    b.send({ type: 'hit', epoch: epoch - 1, seq: 3, enemy: 'duel/margit', attack: 'heavy', charge: 0, swing: 'old' });
    const c = peer(url, origin); peers.push(c); await c.join();
    assert.equal((await c.next('start')).session.epoch, epoch, 'late join gets current session');
    c.send({ type: 'ready', epoch });
    assert.equal((await c.next('frame')).frame.enemies[0].hp, 3176, 'late join gets shared current health');
    a.send({ type: 'control', action: 'transfer', player: wb.id });
    await b.next('roster', m => m.leader === wb.id);
    b.send({ type: 'control', action: 'restart' });
    const restarted = await b.next('start'); assert.ok(restarted.session.epoch > epoch);
    b.ws.close(); await a.next('roster', m => m.leader === wa.id && m.session?.epoch === restarted.session.epoch && m.players.every(p => p.id !== wb.id));
    a.queue.length = 0;
    a.send({ type: 'control', action: 'lobby' });
    try { await a.next('stop'); } catch (err) { console.error('Final lobby state:', app.clients.size, a.queue); throw err; }
    console.log('Transport: public join, authority, shared health, duplicate/stale reports, late join, transfer, disconnect and restart passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
  const group = createServer({ capacity: 16 }), groupPeers = [];
  await new Promise(resolve => group.server.listen(0, '127.0.0.1', resolve));
  const groupOrigin = `http://127.0.0.1:${group.server.address().port}`;
  try {
    for (let i = 0; i < 16; i++) {
      const p = peer(groupOrigin.replace('http', 'ws') + '/lobby', groupOrigin); groupPeers.push(p); await p.join();
    }
    groupPeers[0].send({ type: 'control', action: 'start', kind: 'level', id: 'final-castle' });
    const start = await groupPeers[0].next('start');
    for (const p of groupPeers) { p.send({ type: 'ready', epoch: start.session.epoch }); p.send({ type: 'pose', epoch: start.session.epoch, pose: { ...pose(start.session.spawn.x, start.session.spawn.z), y: start.session.spawn.y } }); }
    await Promise.all(groupPeers.map(p => p.next('frame', m => m.players.length === 16 && m.frame.time > 0)));
    assert.equal(group.clients.size, 16);
    console.log('Capacity: 16 simultaneous WebSocket players received the same live level.');
  } finally { for (const p of groupPeers) p.ws.terminate(); await group.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
