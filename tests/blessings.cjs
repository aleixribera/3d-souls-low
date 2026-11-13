'use strict';
// The Calling's blessings (v7.35.0, CONFIG.blessings): each blessing's effect measured on a real Player body in the
// headless simulation, then the server's pick between fights end to end: offers, a refused pick, the wait for everyone,
// a bot's own pick, the run's blessings in every later fight, the server's damage and flask limits, Rise Again's claim
// (once a fight) and the pick that runs out of time.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createSimulation, build } = require('../server/headless.cjs');
const { createServer } = require('../server/index.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);
// The simulation's own globals (Player, CONFIG, parryTiming...): a function made by its realm's Function constructor.
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

// ---- 1. Each blessing on a body ------------------------------------------------------------------------------------
{
  const sim = createSimulation(), g = realm(sim);
  sim.addBot(); sim.start('arena', 'ostrey');
  const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), CONFIG = g('CONFIG'), B = CONFIG.blessings, ES = g('ES');
  const hands = [...sim.inspect().bots.values()][0].body.ctl;
  const body = ids => { const p = new Player(PLAYER_DEF, 0, 0, 0, 0); p.ctl = hands; p.bless(ids); return p; };

  // Whetted Edge: every strike the body makes carries `damage` more.
  const attack = Object.values(PLAYER_DEF.moveset.attacks).find(a => a.id !== 'execute');
  near(g('makeStrike')(attack, false, 0, B.boons.damage).damage, attack.damage * (1 + B.boons.damage), 'Whetted Edge damage');
  assert.equal(body(['whetted-edge']).boons.damage, B.boons.damage);

  // Second Wind: stamina refills `stamina` faster.
  const refill = ids => { const p = body(ids); p.stamina = 0; p.staminaDelay = 0; p.update(0.25, { x: 0, z: 0, has: false }, [], null); return p.stamina; };
  near(refill(['second-wind']) / refill([]), 1 + B.boons.stamina, 'Second Wind refill');

  // Spare Draught: one more flask, full; twice is two.
  const flasks = ids => body(ids).inventory.flask;
  assert.deepEqual({ ...flasks(['spare-draught']) }, { count: 4 + B.boons.flasks, max: 4 + B.boons.flasks });
  assert.equal(flasks(['spare-draught', 'spare-draught']).max, 4 + 2 * B.boons.flasks, 'the same blessing twice adds twice');

  // Keen Ear: a press that comes too early for a plain body parries with the blessing.
  const e = sim.inspect().Game.enemies[0], strike = e.def.attacks.find(a => g('canParryAttack')(a));
  const early = ids => {
    const p = body(ids); p.x = e.x; p.z = e.z + e.radius + 0.6; p.yaw = Math.PI;   // facing the boss, inside its reach
    e.yaw = 0; e.attack = strike; e.hitIndex = 0; e.state = ES.WINDUP;
    e.stateTime = strike.hits[0].startup - CONFIG.parry.lead * (1 + B.boons.parry / 2);
    return g('parryTiming')(p, e, 0);
  };
  assert.equal(early([]), null, 'too early without the blessing');
  assert.ok(early(['keen-ear']) > CONFIG.parry.lead, 'Keen Ear parries it');

  // Rise Again on a bot in a boss fight: up again where it fell, `riseHp` health, once a fight.
  const bot = [...sim.inspect().bots.values()][0];
  sim.offerBlessings([]);
  const held = sim.blessings()[bot.id];
  assert.equal(held.length, 1, 'a bot takes a blessing at once');
  sim.offerBlessings(['late'], false); sim.settleBlessings();
  assert.equal(sim.blessings()[bot.id].length, 1, 'an offer to one late player gives no bot a second blessing');
  assert.equal(sim.blessings().late.length, 1, 'out of time: an open offer is settled, its player present or not');
  const s2 = createSimulation({ seed: 7 }), g2 = realm(s2), id = s2.addBot().id;
  for (let round = 0; !(s2.blessings()[id] || []).includes('rise-again') && round < 5; round++) { s2.start('arena', 'ostrey', [], round > 0); s2.offerBlessings([]); }
  s2.start('arena', 'ostrey', [], true);
  const riser = () => s2.inspect().bots.get(id).body;
  assert.ok(riser().blessings.includes('rise-again'), 'a bot takes Rise Again within a few offers');
  const fell = riser(); fell.x += 1; fell.die();
  s2.tick(g2('CONFIG').blessings.riseDelay + 0.1);
  assert.notEqual(riser(), fell, 'a fresh body'); assert.equal(riser().alive(), true);
  near(riser().hp, riser().maxHp * B.riseHp, 'risen health'); assert.equal(riser().x, fell.x, 'where it fell');
  riser().die(); s2.tick(B.riseDelay + 0.1);
  assert.equal(riser().alive(), false, 'once a fight');
  assert.equal(s2.rise(id), false, 'no claim left');
}

// ---- 2. The pick between fights, through the server ----------------------------------------------------------------
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
  const app = createServer(), peers = [], g = realm(app.sim), B = g('CONFIG').blessings;
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  let session;
  const pose = (p, extra = {}) => p.send({ type: 'pose', epoch: session.epoch, pose: {
    ...session.spawn, hp: 120, state: 'idle', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true, ...extra } });
  const flush = async p => { p.send({ type: 'ping' }); await p.next('pong'); };
  const finishFight = () => {
    for (const e of app.sim.inspect().Game.enemies) { e.hp = 0; e.die(); }
    app.sim.tick(Math.max(C.bossVictoryDelay, C.leaderboardDelay + C.leaderboardTime));
  };
  // Each player's offer is set to known blessings (the draw itself is covered above).
  const forced = new Map(), offer = app.sim.offerBlessings;
  app.sim.offerBlessings = ids => { offer(ids); for (const [id, list] of forced) { const o = app.sim.blessingOffer(id); if (o) o.splice(0, o.length, ...list); } };
  try {
    const a = await peer(origin, 'Ash'), b = await peer(origin, 'Ember'); peers.push(a, b);
    const owner = [a, b].find(p => p.id === app.leader);
    const bosses = app.sim.catalog().bosses.map(e => e.id), roster = [bosses[0], bosses[3], bosses[5], bosses[7]];
    app.sim.addBot();   // a test player beside Ash and Ember: since pass 52 no bot fills a party
    owner.send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id, roster });
    session = (await a.next('start')).session; await b.next('start');
    assert.deepEqual(session.blessings, {}, 'a run starts with no blessings');
    const bot = app.sim.botList()[0].id;
    for (const p of [a, b]) { p.send({ type: 'ready', epoch: session.epoch }); pose(p); }
    await flush(a); await flush(b);

    // Round one: three different blessings each; a stranger's id and a wrong one are refused; the fight waits for both.
    forced.set(a.id, ['whetted-edge', 'keen-ear', 'second-wind']); forced.set(b.id, ['spare-draught', 'keen-ear', 'rise-again']);
    finishFight();
    const offerA = await a.next('blessings'), offerB = await b.next('blessings');
    assert.deepEqual(offerA.offer, forced.get(a.id)); assert.deepEqual(offerA.held, []);
    assert.ok(offerA.left > B.pickTime - 1 && offerA.left <= B.pickTime, 'the time left to choose');
    assert.equal(app.sim.blessings()[bot].length, 1, 'the bot chose at once');
    a.send({ type: 'bless', epoch: session.epoch, id: 'rise-again' }); a.send({ type: 'bless', epoch: session.epoch, id: 'nothing' }); await flush(a);
    assert.equal(a.queue.some(m => m.type === 'blessings'), false, 'a blessing outside the offer is refused');
    a.send({ type: 'bless', epoch: session.epoch, id: 'whetted-edge' });
    assert.deepEqual((await a.next('blessings')).held, ['whetted-edge']);
    a.send({ type: 'bless', epoch: session.epoch, id: 'keen-ear' }); await flush(a); await wait(200);
    assert.deepEqual([...app.sim.blessings()[a.id]], ['whetted-edge'], 'one pick a round');
    assert.equal(app.session.gauntlet.number, 1, 'the next fight waits for everyone');
    b.send({ type: 'bless', epoch: session.epoch, id: 'spare-draught' });
    session = (await a.next('start')).session; await b.next('start');
    assert.equal(session.gauntlet.number, 2);
    assert.deepEqual(session.blessings[a.id], ['whetted-edge']); assert.deepEqual(session.blessings[b.id], ['spare-draught']);
    assert.equal(session.blessings[bot].length, 1, 'every body of the run, the bot included');
    assert.ok(app.sim.inspect().bots.get(bot).body.blessings.length === 1, "the bot's new body holds its blessing");
    for (const p of [a, b]) { p.send({ type: 'ready', epoch: session.epoch }); pose(p); }
    await flush(a); await flush(b);

    // Whetted Edge on the server: the same blow from both, a's 15% harder. Spare Draught: b may carry five flasks.
    const boss = app.sim.inspect().Game.enemies[0], attack = Object.values(g('PLAYER_DEF').moveset.attacks).find(x => x.id !== 'execute');
    const blow = id => {
      app.sim.frame(true);   // drain earlier events
      app.sim.setPlayers([{ ...session.spawn, id, x: boss.x, z: boss.z + boss.radius + 0.5, y: boss.y, yaw: Math.PI, hp: 120, state: 'idle', poseAge: 0 }]);
      boss.hp = boss.def.hp; assert.equal(app.sim.hit(id, { enemy: boss.netId, attack: attack.id, charge: 0 }), true, 'the blow lands');
      return app.sim.frame(true).events.filter(ev => ev.type === 'strike').pop().strike.damage;
    };
    near(blow(a.id) / blow(b.id), 1 + B.boons.damage, 'Whetted Edge on the server');
    pose(a, { flasks: 5 }); pose(b, { flasks: 5 }); await flush(a); await flush(b);
    assert.notEqual(app.clients.get(a.id).pose.flasks, 5, 'five flasks are refused without Spare Draught');
    assert.equal(app.clients.get(b.id).pose.flasks, 5, 'Spare Draught: five flasks');

    // Round two: a takes Rise Again; b lets the time run out and gets the first offered.
    forced.set(a.id, ['rise-again', 'keen-ear', 'second-wind']); forced.set(b.id, ['keen-ear', 'whetted-edge', 'second-wind']);
    app.sim.blessingPickTime = 0.5;
    finishFight();
    await a.next('blessings'); await b.next('blessings');
    a.send({ type: 'bless', epoch: session.epoch, id: 'rise-again' });
    session = (await a.next('start')).session; await b.next('start');
    assert.deepEqual(session.blessings[a.id], ['whetted-edge', 'rise-again']);
    assert.deepEqual(session.blessings[b.id], ['spare-draught', 'keen-ear'], 'out of time: the first offered');
    for (const p of [a, b]) { p.send({ type: 'ready', epoch: session.epoch }); pose(p); }
    await flush(a); await flush(b);

    // Rise Again on the server: a's fall is lifted once this fight; b, without it, stays down.
    const down = p => { pose(p, { hp: 0, state: 'dead' }); };
    const rise = async p => { p.send({ type: 'rise', epoch: session.epoch }); return (await p.next('risen')).ok; };
    down(a); down(b); await flush(a); await flush(b);
    assert.equal(app.clients.get(a.id).arenaDefeated, true);
    assert.equal(await rise(a), false, 'not before riseDelay');
    app.sim.riseDelay = C.riseSlack;
    assert.equal(await rise(a), true); assert.equal(await rise(b), false);
    down(a); await flush(a);
    assert.equal(app.clients.get(a.id).arenaDefeated, false, 'a dead pose sent before the answer arrived is not a new fall');
    pose(a, { hp: 60 }); pose(b, { hp: 60 }); await flush(a); await flush(b);
    assert.equal(app.clients.get(a.id).arenaDefeated, false, 'Rise Again lifts the defeat');
    assert.equal(app.clients.get(a.id).pose.hp, 60, 'and the risen body is relayed');
    assert.equal(app.clients.get(b.id).pose.hp, 0, 'no rise without the blessing');
    down(a); await flush(a); assert.equal(await rise(a), false); pose(a, { hp: 60 }); await flush(a);
    assert.equal(app.clients.get(a.id).pose.hp, 0, 'once a fight');
    console.log('BLESSINGS: damage, stamina, flasks, parry and rise on a body; offers, refused picks, the wait, the bot, carried blessings, server damage and flasks, rise once and the timed-out pick passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
