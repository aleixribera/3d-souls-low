'use strict';
// Revive (PLAN.md track B item 4): in a party a fall leaves an ember; a teammate standing on it unhurt for
// CONFIG.revive.time s brings the fallen back with a third of their bar. The server decides it from the poses (range,
// time, the ember's owner), the boss turns on the reviver, a hit starts it over, alone there is no ember. Also the end
// screen's titles (runTitles): one per player, never the same twice.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer, runTitles } = require('../server/index.cjs');
const { build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function peer(origin, name) {
  const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [];
  ws.on('message', data => queue.push(JSON.parse(data)));
  const next = async (type, ms = 10000) => {
    for (let i = 0; i < ms / 20; i++) {
      const at = queue.findIndex(m => m.type === type);
      if (at >= 0) return queue.splice(at, 1)[0];
      await wait(20);
    }
    throw new Error('Timed out: ' + type);
  };
  const send = m => ws.send(JSON.stringify(m));
  await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name });
  return { ws, send, next, queue, id: (await next('welcome')).id };
}
(async () => {
  // The titles first: pure.
  const row = (id, extra = {}) => ({ id, name: id, damage: 1000, deaths: 1, parries: 0, executions: 0, revives: 0, kills: 0, ...extra });
  const alone = runTitles([row('a', { damage: 4200, parries: 7 })], [{ time: 38, swift: true, killer: 'a' }]);
  assert.equal(alone.length, 1); assert.ok(alone[0].title, 'alone, the title is yours');
  const four = runTitles([row('a', { damage: 5000, kills: 2 }), row('b', { revives: 3, rescued: ['a', 'c', 'd'] }), row('c', { parries: 12 }), row('d', { deaths: 0 })],
    [{ time: 38, swift: true, killer: 'a' }, { time: 70, swift: false, killer: 'a' }]);
  assert.equal(new Set(four.map(r => r.title)).size, 4, 'four players, four different titles');
  assert.equal(four.find(r => r.id === 'b').title, 'Revived 3 friends');
  assert.equal(four.find(r => r.id === 'c').title, '12 perfect parries');
  assert.equal(four.find(r => r.id === 'd').title, 'Never fell');
  assert.equal(runTitles([row('a', { revives: 2, rescued: ['b', 'b'] }), row('b')])[0].title, 'Revived b 2 times', 'the same friend, named');
  const same = runTitles([row('a', { damage: 1400 }), row('b')]);
  assert.notEqual(same[0].title, same[1].title, 'two plain runs still read differently');

  const app = createServer(), peers = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  const { CONFIG, Game } = app.sim.inspect(), R = CONFIG.revive;
  let session;
  // Each peer's place and health, sent every 33 ms like a browser's poses: `at` is a place or a function of nothing.
  const feed = new Map();
  const send = p => { const { at, hp } = feed.get(p); p.send({ type: 'pose', epoch: session.epoch, pose: {
    ...session.spawn, ...(typeof at === 'function' ? at() : at), hp, state: hp > 0 ? 'idle' : 'dead', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true,
  } }); };
  const place = (p, at, hp = 120) => { feed.set(p, { at, hp }); send(p); };
  const feeder = setInterval(() => { if (session) for (const p of feed.keys()) if (p.ws.readyState === 1) send(p); }, 33);
  const flush = async p => { p.send({ type: 'ping' }); await p.next('pong'); };
  const ember = id => app.sim.frame(false).embers.find(m => m.id === id);
  const until = async (test, ms, what) => { for (let t = 0; t < ms; t += 20) { if (test()) return; await wait(20); } assert.fail('Timed out: ' + what); };
  try {
    const a = await peer(origin, 'Ash'), b = await peer(origin, 'Bram'), c = await peer(origin, 'Cole'); peers.push(a, b, c);
    a.send({ type: 'control', action: 'start', kind: 'arena', id: 'ostrey' });
    session = (await a.next('start')).session; await b.next('start'); await c.next('start');
    assert.equal(session.teamWipeOnly, true);
    const boss = Game.enemies[0], s = session.spawn;
    const off = (p, dx, dz) => ({ x: p.x + dx, z: p.z + dz });
    for (const p of [a, b, c]) p.send({ type: 'ready', epoch: session.epoch });
    place(a, off(s, 0, 0)); place(b, off(s, 4, 0)); place(c, () => off(boss, 1.6, 0)); await flush(c);
    await until(() => boss.netTarget === c.id, 8000, 'the boss takes the closest player');

    // Ash falls: an ember where they fell. Bram stands 4 m off: nothing happens however long.
    place(a, off(s, 0, 0), 0); await flush(a);
    assert.ok(app.clients.get(a.id).arenaDefeated);
    const m = ember(a.id); assert.ok(m, 'a fall in a party leaves an ember');
    assert.ok(Math.abs(m.x - s.x) < 1e-6 && Math.abs(m.z - s.z) < 1e-6, 'where they fell');
    await wait((R.time + 0.4) * 1000);
    assert.equal(ember(a.id).t, 0, 'out of reach: no revive'); assert.equal(ember(a.id).by, null);
    assert.ok(app.clients.get(a.id).arenaDefeated);

    // Bram steps onto it: the revive starts and the boss turns on him.
    place(b, off(s, 0.6, 0));
    await until(() => ember(a.id)?.by === b.id && ember(a.id).t > 0, 2000, 'the revive starts');
    await until(() => boss.netTarget === b.id, 6000, 'the boss turns on the reviver');
    // A hit (health lost) starts it over.
    await until(() => ember(a.id).t > 0.3, 3000, 'the revive gets under way');
    place(b, off(s, 0.6, 0), 90); await flush(b); await wait(60);
    assert.ok(ember(a.id).t < 0.1, `a hit starts it over (${ember(a.id).t})`);
    // Stepping off starts it over too.
    place(b, off(s, 3, 0), 90); await flush(b); await wait(60);
    assert.equal(ember(a.id).t, 0, 'stepping off starts it over');
    // A fallen teammate can't revive: Cole falls on the ember himself.
    place(c, off(s, 0.3, 0), 0); await flush(c); await wait(100);
    assert.equal(ember(a.id).by, null, 'the fallen do not revive');
    assert.ok(ember(c.id), 'Cole has his own ember');

    // Bram stands on Ash's ember unhurt for the whole time: Ash is offered the rise.
    const started = Date.now();
    place(b, off(s, 0.6, 0), 90);
    const msg = await a.next('revive', (R.time + 2) * 1000);
    assert.ok(Date.now() - started >= (R.time - 0.2) * 1000, 'it takes the full time');
    assert.equal(msg.hp, app.sim.playerMaxHp * R.health, 'back with a third of the bar');
    assert.equal(msg.by, b.id);
    assert.equal(ember(a.id), undefined, 'the ember is spent');
    // A dead pose still in flight keeps them down; the first living pose brings them back.
    send(a); await flush(a);
    assert.ok(app.clients.get(a.id).arenaDefeated, 'still down until they rise');
    place(a, off(s, 0, 0), msg.hp); await flush(a);
    assert.equal(app.clients.get(a.id).arenaDefeated, false, 'risen');
    assert.equal(app.clients.get(a.id).pose.hp, msg.hp);
    assert.equal(app.sim.fightTally().find(r => r.id === b.id).revives, 1, 'the revive counts for Bram');
    // One revive per fall: without a new grant, a second rise is refused.
    place(a, off(s, 0, 0), 0); await flush(a);
    place(a, off(s, 0, 0), 120); await flush(a);
    assert.equal(app.clients.get(a.id).pose.hp, 0, 'a fall without a revive stays down');
    assert.ok(ember(a.id), 'the new fall leaves a new ember');

    // Alone, a fall leaves no ember. The others leave; Ash, down and alone, wipes and starts over.
    for (const p of [b, c]) { feed.delete(p); p.ws.close(); }
    await until(() => app.clients.size === 1, 3000, 'the others leave');
    assert.equal(ember(c.id), undefined, 'a leaver takes their ember');
    session = (await a.next('start')).session;
    a.send({ type: 'ready', epoch: session.epoch }); place(a, off(s, 0, 0)); await flush(a);
    place(a, off(s, 0, 0), 0); await flush(a);
    assert.ok(app.clients.get(a.id).arenaDefeated);
    assert.equal(ember(a.id), undefined, 'alone, no ember');
    console.log('revive: ok');
  } finally {
    clearInterval(feeder); for (const p of peers) p.ws.close();
    app.close?.(); app.server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
