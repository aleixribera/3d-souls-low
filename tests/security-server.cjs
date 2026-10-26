'use strict';
// Server hardening: prototype ids, contact plausibility, admission caps, roster chatter, kicks,
// tick failures, the sleeping empty run and static caching. Real sockets on 127.0.0.1, port 0.
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const { createSimulation, build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const pose = (x = 0, z = 0, extra = {}) => ({ x, z, y: 0, yaw: 0, hp: 120, state: 'idle', stateTime: 0,
  grounded: true, attack: null, attackT: 0, charge: 0, chargeT: 0, walkPhase: 0, ...extra });
const PROTO = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'];

// ---- Shared simulation: wire ids, reach, rate and riposte -----------------------------------------
{
  const sim = createSimulation();
  sim.start('arena', 'margit');
  const { Game } = sim.inspect(), e = Game.duel, level = Game.level, enemies = Game.enemies;
  sim.setPlayers([{ ...pose(e.x - 1.5, e.z), id: 'a' }]);
  for (const id of PROTO) {
    assert.equal(sim.hit('a', { enemy: e.netId, attack: id, charge: 0 }), false, 'prototype attack id ' + id);
    assert.throws(() => sim.start('arena', id), err => err.rejected === true, 'prototype opponent ' + id);
    assert.throws(() => sim.start('arena', 'margit', [id]), err => err.rejected === true, 'prototype partner ' + id);
    assert.throws(() => sim.gauntlet(undefined, id), err => err.rejected === true, 'prototype boss run ' + id);
    assert.equal(sim.playerAttack(id), null, 'prototype pose attack ' + id);
    assert.equal(sim.beginExecution('a', { enemy: id }), false);
  }
  assert.ok(Number.isFinite(e.hp) && e.hp === e.def.hp, 'boss health stays finite and untouched');
  assert.equal(Game.level, level, 'a refused start leaves the level'); assert.equal(Game.enemies, enemies, 'and its enemies');
  assert.equal(sim.playerAttack('heavy'), 'heavy');
  assert.equal(sim.hit('a', { enemy: e.netId, attack: 'light', charge: -1 }), false, 'negative charge is refused');
  assert.equal(sim.hit('a', { enemy: e.netId, attack: 'light', charge: NaN }), false);

  // Honest contact at reach; the riposte flag needs this player's own accepted parry.
  let hp = e.hp;
  assert.equal(sim.hit('a', { enemy: e.netId, attack: 'light', charge: 0, riposte: true }), true, 'in-range hit accepted');
  assert.equal(hp - e.hp, 24, 'riposte bonus refused without a parry');
  // Per player/enemy budget: a burst of claimed swings is capped.
  let accepted = 1;
  for (let i = 0; i < 6; i++) accepted += sim.hit('a', { enemy: e.netId, attack: 'light', charge: 0 }) ? 1 : 0;
  assert.equal(accepted, C.hitBurst, 'hits beyond the swing budget are refused');
  for (let i = 0; i < Math.ceil(C.hitInterval * 60) + 1; i++) { sim.setPlayers([{ ...pose(e.x - 1.5, e.z), id: 'a' }]); sim.tick(1 / 60); }
  assert.equal(sim.hit('a', { enemy: e.netId, attack: 'light', charge: 0 }), true, 'the budget refills at swing pace');

  // Out of reach: across the level from every place the enemy stood.
  sim.start('level', 'long-hall');
  const far = sim.inspect().Game.enemies.reduce((best, x) => !best || x.x > best.x ? x : best, null);
  const s = sim.state.checkpoint;
  sim.setPlayers([{ ...pose(s.x, s.z), y: s.y, id: 'a' }]);
  for (let i = 0; i < 5; i++) sim.tick(1 / 60);
  hp = far.hp;
  assert.ok(Math.hypot(far.x - s.x, far.z - s.z) > 30, 'fixture enemy is far away');
  assert.equal(sim.hit('a', { enemy: far.netId, attack: 'heavy', charge: 1 }), false, 'contact from across the level refused');
  assert.equal(far.hp, hp);
  far.setState('broken');
  assert.equal(sim.beginExecution('a', { enemy: far.netId }), false, 'execution out of range refused');
  far.setState('idle');
  sim.setPlayers([{ ...pose(far.x - 1.2, far.z), y: far.y, id: 'a' }]);
  assert.equal(sim.hit('a', { enemy: far.netId, attack: 'heavy', charge: 0 }), true, 'the same contact at reach is accepted');
  assert.equal(sim.rest('a', 'nowhere'), false);
  console.log('Simulation: prototype ids, finite health, atomic start, reach, budget, riposte and execution range passed.');
}

// ---- Sleeping empty run --------------------------------------------------------------------------
{
  const sim = createSimulation();
  sim.start('level', 'long-hall'); sim.setPlayers([]);
  for (let i = 0; i < 60 * 20 && !sim.sleeping; i++) sim.tick(1 / 60);
  assert.ok(sim.sleeping, 'an empty, settled level sleeps');
  const t = sim.state.time, x = sim.inspect().Game.enemies.map(e => e.x);
  let began = performance.now();
  for (let i = 0; i < 600; i++) sim.tick(1 / 60);
  const asleep = (performance.now() - began) / 600;
  assert.ok(sim.state.time > t + 9.9, 'the world clock still advances');
  assert.deepEqual(sim.inspect().Game.enemies.map(e => e.x), x);
  const s = sim.state.checkpoint;
  sim.setPlayers([{ ...pose(s.x, s.z), y: s.y, id: 'a' }]); sim.tick(1 / 60);
  assert.equal(sim.sleeping, false, 'a returning player wakes the run at once');
  sim.setPlayers([]);
  const e = sim.inspect().Game.enemies[0]; e.poise = 0; e.poiseTimer = 0;
  for (let i = 0; i < 60 * 20 && !sim.sleeping; i++) sim.tick(1 / 60);
  assert.ok(sim.sleeping && e.poise === e.def.poise, 'meters recover before the run sleeps again');
  console.log(`Sleep: empty run settles and wakes on join (${(asleep * 1000).toFixed(0)} µs/tick asleep).`);
}

// ---- Transport -------------------------------------------------------------------------------------
function connect(url, origin, headers = {}) {
  const ws = new WebSocket(url, { origin, headers }), queue = [], waiters = [];
  ws.on('message', data => {
    const m = JSON.parse(data), i = waiters.findIndex(w => w.test(m));
    if (i < 0) queue.push(m); else { const w = waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); }
  });
  const next = (type, predicate = () => true, limit = 4000) => {
    const test = m => m.type === type && predicate(m), i = queue.findIndex(test);
    if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { test, resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error('Timed out: ' + type)); }, limit) };
      waiters.push(w);
    });
  };
  const opened = new Promise(resolve => { ws.once('open', () => resolve(true)); ws.once('unexpected-response', (req, res) => resolve(res.statusCode)); ws.once('error', () => resolve(false)); });
  const closed = new Promise(resolve => ws.once('close', (code, reason) => resolve({ code, reason: String(reason) })));
  const send = m => ws.send(JSON.stringify(m));
  return { ws, queue, next, send, opened, closed,
    hello: async (name = 'Tester', extra = {}) => { send({ type: 'hello', protocol: C.protocol, build, name, ...extra }); return next('welcome'); } };
}
(async () => {
  const app = createServer({ capacity: 3 }), all = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${app.server.address().port}`, url = origin.replace('http', 'ws') + C.path;
  const peer = (headers) => { const p = connect(url, origin, headers); all.push(p); return p; };
  try {
    // Pending sockets hold no player slot; only a few may wait at once.
    const waiting = [];
    for (let i = 0; i < C.pendingConnections; i++) { const p = peer(); waiting.push(p); assert.equal(await p.opened, true); }
    assert.equal(await peer().opened, 503, 'pending sockets beyond the allowance are refused');
    assert.equal(app.clients.size, 0, 'joining sockets are not players');
    for (const p of waiting) p.ws.terminate();
    await wait(50);
    // Per-address budget behind a loopback proxy (X-Forwarded-For).
    const proxied = [];
    for (let i = 0; i < C.connectionsPerAddress; i++) { const p = peer({ 'X-Forwarded-For': '203.0.113.9' }); proxied.push(p); assert.equal(await p.opened, true); }
    assert.equal(await peer({ 'X-Forwarded-For': '203.0.113.9' }).opened, 503, 'one address cannot take every connection');
    const other = peer({ 'X-Forwarded-For': '198.51.100.4' }); assert.equal(await other.opened, true, 'other addresses still join');
    for (const p of [...proxied, other]) p.ws.terminate();
    await wait(50);
    // Hellos per address and minute.
    let refused = null;
    for (let i = 0; i <= C.hellosPerMinute && !refused; i++) {
      const p = peer({ 'X-Forwarded-For': '192.0.2.77' }); await p.opened;
      p.send({ type: 'hello', protocol: C.protocol, build, name: 'Spam' });
      const outcome = await Promise.race([p.next('welcome').then(() => null, () => null), p.closed]);
      if (outcome?.code === 1008) refused = i; else { p.ws.terminate(); await p.closed; }
    }
    assert.equal(refused, C.hellosPerMinute, 'join churn from one address is rate limited');

    // Capacity counts joined players only; a full lobby refuses the next hello.
    const a = peer(), b = peer(), c = peer(), d = peer();
    for (const p of [a, b, c, d]) assert.equal(await p.opened, true);
    const wa = await a.hello('Leader'); await b.hello('Two'); await c.hello('Three');
    d.send({ type: 'hello', protocol: C.protocol, build, name: 'Four' });
    assert.equal((await d.closed).code, 1013, 'a full lobby refuses the next join');
    assert.equal((await (await fetch(origin + '/healthz')).json()).players, 3);

    // Roster chatter coalesces; repeats broadcast nothing.
    await wait(C.rosterInterval * 2); b.queue.length = 0;
    for (let i = 0; i < 20; i++) a.send({ type: 'name', name: 'Leader ' + i });
    for (let i = 0; i < 20; i++) a.send({ type: 'presence', foreground: true });
    await wait(C.rosterInterval * 3);
    const rosters = b.queue.filter(m => m.type === 'roster');
    assert.ok(rosters.length >= 1 && rosters.length <= 3, 'twenty renames coalesce: ' + rosters.length);
    assert.equal(rosters.at(-1).players.find(p => p.id === wa.id).name, 'Leader 19', 'the coalesced roster is current');

    // Prototype ids over the wire and a refused start keep the run.
    a.send({ type: 'control', action: 'start', kind: 'gauntlet', id: 'constructor' });
    assert.match((await a.next('error')).message, /Unknown boss run/);
    a.send({ type: 'control', action: 'start', kind: 'arena', id: '__proto__' });
    assert.match((await a.next('error')).message, /Unknown level or opponent/);
    assert.equal(app.session, null);
    a.send({ type: 'control', action: 'start', kind: 'arena', id: 'margit' });
    const { session } = await a.next('start');
    a.send({ type: 'control', action: 'start', kind: 'arena', id: 'toString' });
    assert.match((await a.next('error')).message, /Unknown level or opponent/);
    assert.equal(app.session.epoch, session.epoch, 'a refused start keeps the current run');
    a.send({ type: 'ready', epoch: session.epoch });
    a.send({ type: 'pose', epoch: session.epoch, pose: pose(0, 0, { attack: 'constructor', state: 'attack' }) });
    a.send({ type: 'ping' }); await a.next('pong');
    assert.equal(app.clients.get(wa.id).pose.attack, null, 'relayed poses carry only real attack ids');
    a.send({ type: 'hit', epoch: session.epoch, seq: 1, enemy: 'duel/margit', attack: '__proto__', charge: 0, swing: 's1' });
    a.send({ type: 'execute', epoch: session.epoch, seq: 2, enemy: 'constructor' });
    assert.equal((await a.next('execution')).accepted, false);
    assert.ok(Number.isFinite(app.sim.inspect().Game.duel.hp));

    // Repeated ready: one baseline per resync interval and no roster.
    await wait(C.rosterInterval * 2); b.queue.length = 0; a.queue.length = 0;
    for (let i = 0; i < 10; i++) a.send({ type: 'ready', epoch: session.epoch });
    a.send({ type: 'ping' }); await a.next('pong'); await wait(C.rosterInterval * 2);
    assert.ok(a.queue.filter(m => m.type === 'frame' && m.full).length <= 1, 'repeated ready messages do not force baselines');
    assert.ok(b.queue.filter(m => m.type === 'roster').length === 0, 'and do not broadcast rosters: ');

    // Kick cooldown and repeat window.
    const others = [...app.clients.keys()].filter(id => id !== wa.id);
    a.send({ type: 'control', action: 'kick', player: others[0] });
    await wait(100);
    a.send({ type: 'control', action: 'kick', player: others[1] });
    assert.match((await a.next('error')).message, /Wait a moment/, 'kicks have a cooldown');
    assert.equal(app.clients.size, 2);

    // A tick failure goes through the proper stop path.
    const tick = app.sim.tick;
    app.sim.tick = () => { app.sim.tick = tick; throw new Error('secret internal detail'); };
    const stopped = await a.next('stop');
    assert.equal(stopped.reason, 'error'); assert.ok(!stopped.message.includes('secret'), 'internal details stay in the server log');
    await a.next('roster', m => m.session === null);
    assert.ok([...app.clients.values()].every(p => !p.ready && !p.pose), 'players are reset by the stop');

    // Static files: immutable versioned scripts, ETag revalidation and gzip.
    const html = await (await fetch(origin + '/')).text();
    const stamp = html.match(/const LOAD_STAMP = '([^']+)'/)[1];
    assert.ok(html.includes(`'?v=' + LOAD_STAMP + '-${build}'`) && html.includes(`content="${build}"`), 'the page versions scripts by build');
    let r = await fetch(`${origin}/js/net-protocol.js?v=${stamp}-${build}`);
    assert.match(r.headers.get('cache-control'), /immutable/);
    assert.equal(r.headers.get('content-encoding'), 'gzip', 'text is compressed when accepted');
    const text = await r.text();
    r = await fetch(origin + '/js/net-protocol.js?v=old');
    assert.equal(r.headers.get('cache-control'), 'no-cache', 'an old version string is not immutable');
    const etag = r.headers.get('etag'); assert.ok(etag);
    assert.equal((await fetch(origin + '/js/net-protocol.js', { headers: { 'If-None-Match': etag } })).status, 304);
    const raw = await new Promise(resolve => require('node:http').get(origin + '/js/net-protocol.js', { headers: { 'Accept-Encoding': 'gzip' } }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({ res, body: Buffer.concat(chunks) }));
    }));
    assert.equal(zlib.gunzipSync(raw.body).toString(), text);
    assert.equal((await fetch(origin + '/js/%2e%2e/server/index.cjs')).status, 404, 'traversal guard intact');
    assert.equal((await fetch(origin + '/server/index.cjs')).status, 404);
    console.log('Transport: pending/per-address/hello caps, capacity at hello, roster coalescing, wire prototype ids, baselines, kicks, tick failure and static caching passed.');
  } finally { for (const p of all) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
