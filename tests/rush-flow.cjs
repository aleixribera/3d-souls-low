'use strict';
// Boss Rush between fights (v7.69.0, PLAN.md track B item 2): each fight's par (CONFIG.swift), the server's fight clock,
// the kill moment's short wait before the ability pick opens in the arena, a swift kill's extra choice, the next boss
// dropping straight in (no loading card, a short grace), and each boss's time on the end screen.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { build } = require('../server/headless.cjs');
const { createServer } = require('../server/index.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function peer(origin, name) {
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
  await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name });
  return { ws, send, next, queue, id: (await next('welcome')).id };
}

(async () => {
  const app = createServer(), peers = [];
  const CONFIG = app.sim.inspect().Game.update.constructor('return CONFIG')(), S = CONFIG.swift;
  // The par: S.par at the base pace, longer as the curve speeds the boss up, half again for a second boss, capped.
  assert.equal(app.sim.rushPar(0), S.par, 'fight 1 par is the fight-length target');
  const pars = [0, 5, 10, 20, 40].map(w => app.sim.rushPar(w));
  assert.ok(pars.every((p, i) => i === 0 || p >= pars[i - 1]) && pars[3] > pars[0], 'par grows with the curve: ' + pars.join(', '));
  assert.equal(pars[4], S.max, 'and stops at its cap');
  assert.equal(app.sim.rushPar(0, 2), Math.round(S.par * (1 + S.pair)), 'two bosses at once: a longer par');

  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  let session;
  const pose = (p, dead = false) => p.send({ type: 'pose', epoch: session.epoch, pose: {
    ...session.spawn, hp: dead ? 0 : 120, state: dead ? 'dead' : 'idle', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true } });
  const flush = async p => { p.send({ type: 'ping' }); await p.next('pong'); };
  const kill = () => { for (const e of app.sim.inspect().Game.enemies) { e.hp = 0; e.die(); } };
  const arrive = async p => { p.send({ type: 'ready', epoch: session.epoch }); pose(p); await flush(p); };
  try {
    const a = await peer(origin, 'Ash'); peers.push(a);
    app.sim.addBot();   // a test player beside Ash: since pass 52 no bot fills a party
    const bosses = app.sim.catalog().bosses.map(e => e.id), opening = [bosses[0], bosses[3], bosses[5], bosses[7]];
    a.send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id, opening });
    session = (await a.next('start')).session;
    assert.equal(session.par, S.par, 'the first fight carries its par');
    assert.ok(!session.drop, 'the first fight opens with its card');
    await arrive(a);

    // Fight 1, won over par: the kill moment plays, then three choices and no swift kill.
    kill(); app.sim.tick(S.par + 5);
    assert.equal(Math.round(app.sim.state.fought), S.par + 5, "the server's clock stops when the boss falls");
    const slow = await a.next('abilities');
    assert.equal(slow.offer.length, CONFIG.abilities.offer, 'no extra choice over par');
    assert.equal(slow.swift, false);
    a.send({ type: 'pickAbility', epoch: session.epoch, id: slow.offer[0] });
    assert.equal((await a.next('abilities')).offer, null, 'the pick is taken');
    const second = (await a.next('start')).session; session = second;
    assert.equal(second.gauntlet.number, 2);
    assert.equal(second.drop, true, 'the next boss drops straight in');
    assert.equal(second.par, app.sim.rushPar(1), "its par follows the curve's pace");
    await arrive(a);

    // Fight 2, won under par: nothing until the kill moment has played, then one more choice, marked swift.
    kill(); app.sim.tick(C.rushKillTime - 0.5); await flush(a);
    assert.equal(a.queue.some(m => m.type === 'abilities'), false, 'the pick waits for the kill moment');
    app.sim.tick(1);
    const fast = await a.next('abilities');
    assert.equal(fast.offer.length, CONFIG.abilities.offer + S.extra, 'a swift kill: an extra choice');
    assert.equal(fast.swift, true);
    assert.equal(new Set(fast.offer).size, fast.offer.length, 'all different');
    const bot = app.sim.botList()[0].id;
    assert.equal(app.sim.abilities()[bot].length, 2, 'the bots chose too');
    a.send({ type: 'pickAbility', epoch: session.epoch, id: fast.offer[fast.offer.length - 1] });
    session = (await a.next('start')).session;
    assert.equal(session.par, app.sim.rushPar(2, 1 + session.gauntlet.partners.length));
    assert.equal(session.health, session.gauntlet.partners.length ? app.sim.rushHealth(1 + session.gauntlet.partners.length) : undefined, 'a lone boss: no health share sent');
    await arrive(a);
    assert.equal(app.session.gauntlet.number, 3);

    // Fight 3 won at once; in fight 4 everyone falls and the run ends: each boss's time against its par, on the end screen.
    kill(); app.sim.tick(C.rushKillTime + 0.5);
    let third = await a.next('abilities'); while (!third.offer) third = await a.next('abilities');   // past fight 2's taken pick
    a.send({ type: 'pickAbility', epoch: session.epoch, id: third.offer[0] });
    session = (await a.next('start')).session; await arrive(a);
    assert.equal(session.gauntlet.number, 4);
    app.sim.arenaWipeDelay = 0.1;
    for (const body of app.sim.inspect().players) if (body.botId) { body.hp = 0; body.die(); }
    pose(a, true); await flush(a);
    const stop = await a.next('stop');
    assert.equal(stop.reason, 'team-wipe');
    const times = stop.summary.times;
    assert.equal(times.length, 3, 'one row a fight won');
    assert.deepEqual(times.map(t => t.swift), [false, true, true]);
    assert.deepEqual(times[2].bosses, [opening[2]], 'the third fight boss in its row');
    assert.equal(times[0].time, S.par + 5); assert.equal(times[0].par, S.par);
    console.log('RUSH FLOW: par by the curve, the fight clock, the kill moment before the pick, the swift kill, the drop-in next boss and the end screen times passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
