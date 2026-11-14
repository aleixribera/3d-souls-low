'use strict';
// Boss Rush (v7.35.0 as The Calling), endless since pass 65 (PLAN.md track B item 5): a run of bosses drawn from its
// seed that goes on until everyone falls. No bots (pass 52); the first fights from the easier bosses, every 5th fight
// Crowned (a pick of 4 with a legendary), two bosses at once every few fights, modifiers by name; the fallen rise for
// the next fight; a refused opening changes nothing; the end of run counts bosses beaten and Crowned fights.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const { build } = require('../server/headless.cjs');
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
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  const G = name => app.sim.inspect().Game.update.constructor('return ' + name)();
  const E = G('CONFIG').endless, RUSH = G('RUSH'), ABILITY_BY_ID = G('ABILITY_BY_ID');
  let session;
  const pose = (p, dead = false) => p.send({ type: 'pose', epoch: session.epoch, pose: {
    ...session.spawn, hp: dead ? 0 : 120, state: dead ? 'dead' : 'idle', stateTime: 0,
    attackT: 0, chargeT: 0, walkPhase: 0, grounded: true,
  } });
  const ready = p => { p.send({ type: 'ready', epoch: session.epoch }); pose(p); };
  const flush = async p => { p.send({ type: 'ping' }); await p.next('pong'); };
  const finishFight = () => {
    for (const e of app.sim.inspect().Game.enemies) { e.hp = 0; e.die(); }
    app.sim.tick(Math.max(C.bossVictoryDelay, C.leaderboardDelay + C.leaderboardTime));
  };
  try {
    // ---- The draw (sim.calling), for many seeds ----
    const bosses = app.sim.catalog().bosses.map(e => e.id);
    for (let seed = 1; seed <= 40; seed++) {
      const fights = Array.from({ length: 30 }, (_, n) => app.sim.calling({ seed: seed * 7919 }, n));
      fights.forEach((g, n) => {
        const number = n + 1, met = [g.boss, ...g.partners];
        assert.equal(g.number, number); assert.equal(g.next, n + 1, 'a run never runs out of fights');
        if (number <= E.opening) assert.ok(RUSH.opening.includes(g.boss), `fight ${number} draws from the easier bosses (${g.boss})`);
        assert.equal(g.crowned, number % E.crowned === 0, `every ${E.crowned}th fight is Crowned (fight ${number})`);
        assert.equal(met.length, [7, 12, 17, 22, 27].includes(number) ? 2 : 1, `two bosses at once on fights 7, 12, 17... (fight ${number})`);
        assert.equal(new Set(met).size, met.length, 'never the same boss twice in a fight');
        if (n) assert.ok(met.every(id => ![fights[n - 1].boss, ...fights[n - 1].partners].includes(id)), `no boss twice in a row (fight ${number})`);
        assert.equal(g.modifiers.length, number < E.mods[0] ? 0 : Math.min(RUSH.modifiers.length, E.mods.filter(f => number >= f).length + (g.crowned ? 1 : 0)), `fight ${number}'s modifier count`);
        assert.ok(g.modifiers.every(id => RUSH.modifiers.find(m => m.id === id).from <= number), 'a modifier only from its own fight');
        assert.equal(g.defeated, fights.slice(0, n).reduce((k, f) => k + 1 + f.partners.length, 0), 'defeated counts the bosses before');
      });
      // The first round of the whole roster meets every boss before any comes back, the opening's apart.
      const later = fights.slice(E.opening).flatMap(g => [g.boss, ...g.partners]).slice(0, bosses.length - E.opening);
      assert.equal(new Set(later).size, later.length, 'no boss comes back before the others have come');
      assert.deepEqual(app.sim.calling({ seed: seed * 7919 }, 17), fights[17], 'a seed replays the same run');
    }
    const forced = app.sim.calling({ seed: 3, opening: [bosses[9], bosses[5]] }, 1);
    assert.equal(forced.boss, bosses[5], 'an opening by hand sets the first fights');
    // The curve and the modifiers: pace only, never health or damage.
    app.sim.start('arena', bosses[0], []);
    const boss = app.sim.inspect().Game.enemies[0], hp = boss.maxHp ?? boss.def.hp;
    const plain = app.sim.setRushFight(10), quick = app.sim.setRushFight(10, ['quickened', 'restless', 'unbroken']);
    assert.ok(Math.abs(quick / plain - RUSH.modifiers.find(m => m.id === 'quickened').pace) < 1e-9, 'Quickened speeds the whole pace');
    assert.ok(boss.rest > 1 && boss.chain > 1, 'Restless and Unbroken set the rests and the strings');
    assert.equal(boss.maxHp ?? boss.def.hp, hp, 'no modifier adds health');
    app.sim.setRushFight(0); assert.ok(boss.rest === 1 && boss.chain === 1, 'a fight without modifiers is plain');
    assert.equal(boss.def.hp, hp, 'a boss alone keeps its whole health');
    // A pair (pass 67): each boss has CONFIG.endless.pairHealth of its own health, its later bars too.
    app.sim.start('arena', bosses[0], [bosses[1]]); app.sim.setRushFight(6);
    const pair = app.sim.inspect().Game.enemies, own = e => e.baseDef.phases ? e.baseDef.phases[e.def.phaseId].hp ?? e.baseDef.hp : e.baseDef.hp;
    for (const e of pair) {
      assert.equal(e.def.hp, Math.round(own(e) * E.pairHealth), `${e.baseDef.id}: a share of its bar in a pair`);
      assert.equal(e.hp, e.def.hp, 'it starts the pair at full share');
      if ((e.phaseIds || []).length > 1) { e.enterPhase(1); assert.equal(e.def.hp, Math.round(own(e) * E.pairHealth), `${e.baseDef.id}: its next bar too`); }
    }
    assert.equal(app.sim.rushHealth(2), E.pairHealth); assert.equal(app.sim.rushHealth(1), 1);
    // A Crowned win's offer: four cards, one of them a legendary, for every player.
    for (let i = 0; i < 30; i++) {
      app.sim.offerAbilities(['crowned-' + i], false, 0, 5, true);
      const offer = app.sim.abilityOffer('crowned-' + i);
      assert.equal(offer.length, E.crownedOffer); assert.ok(offer.some(id => ABILITY_BY_ID[id].rarity === 'legendary'), 'a legendary on every Crowned offer');
      app.sim.pickAbility('crowned-' + i, offer.find(id => ABILITY_BY_ID[id].rarity !== 'legendary'));   // a taken legendary leaves the others' offers
    }

    // ---- A run over the wire ----
    const a = await peer(origin, 'Ash'), b = await peer(origin, 'Ember'); peers.push(a, b);
    const owner = () => [a, b].find(p => p.id === app.leader) || a;
    const pickAbility = async () => {
      const offers = [];
      for (const p of [a, b]) { const o = await p.next('abilities'); offers.push(o); p.send({ type: 'pickAbility', epoch: session.epoch, id: o.offer[0] }); await p.next('abilities'); }
      return offers;
    };
    const call = async extra => {
      owner().send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id, ...extra });
      const opened = await a.next('start'); session = opened.session; await b.next('start');
      return opened;
    };
    const nextFight = async () => { session = (await a.next('start')).session; await b.next('start'); };

    // A refused opening starts nothing and adds no bot.
    for (const opening of [[bosses[0], bosses[0]], [bosses[0], 'nobody']]) {
      owner().send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id, opening });
      assert.match((await owner().next('error')).message, /Unknown Boss Rush run/);
    }
    owner().send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id, opening: 'all' }); await flush(owner());
    assert.equal(app.session, null, 'a malformed opening starts nothing');
    assert.equal(app.sim.botList().length, 0, 'a refused run adds no bot');

    // Two players and no bot: fight 1 alone, the fallen rise for fight 2.
    const tally = app.sim.fightTally; app.sim.fightTally = () => tally().map(r => ({ ...r, damage: r.damage + 10.4 }));
    const opened = await call({ opening: [bosses[3], bosses[0]] });
    assert.equal(opened.opening, true, 'Boss Rush opens with its own card');
    assert.equal(app.sim.botList().length, 0, 'no bot fills the party');
    assert.equal(session.id, bosses[3]); assert.deepEqual(session.partners || [], []);
    assert.equal(session.gauntlet.number, 1); assert.equal(session.gauntlet.crowned, false); assert.deepEqual(session.gauntlet.modifiers, []);
    assert.equal(session.teamWipeOnly, true);
    assert.equal(app.sim.describe(session), 'Boss Rush');
    const seed = session.gauntlet.run.seed;
    ready(a); ready(b); await flush(b);
    pose(a, true); await flush(a); pose(a); await flush(a);
    assert.equal(app.clients.get(a.id).pose.hp, 0, 'a fallen player stays down for the rest of the fight');
    finishFight(); await pickAbility(); await nextFight();
    assert.equal(session.gauntlet.number, 2); assert.equal(session.gauntlet.defeated, 1); assert.equal(session.id, bosses[0]);
    ready(a); ready(b); await flush(b);
    assert.equal(app.clients.get(a.id).pose.hp, 120, 'the fallen rise for the next fight');
    app.sim.fightTally = tally;

    // Restart: the same run from its first fight. Then on to the first Crowned fight and past it.
    owner().send({ type: 'control', action: 'restart' }); await nextFight();
    assert.equal(session.gauntlet.number, 1); assert.equal(session.gauntlet.run.seed, seed, 'a restart replays the same run');
    for (let number = 1; number < E.crowned; number++) {
      ready(a); ready(b); await flush(b);
      if (number >= E.mods[0]) assert.ok(session.gauntlet.modifiers.length >= 1, `fight ${number} carries a modifier`);
      finishFight(); const offers = await pickAbility();
      assert.ok(offers.every(o => !o.crowned), 'an ordinary fight is no Crowned offer');
      await nextFight();
    }
    assert.equal(session.gauntlet.number, E.crowned); assert.equal(session.gauntlet.crowned, true, `fight ${E.crowned} is Crowned`);
    ready(a); ready(b); await flush(b); finishFight();
    const crownedOffers = await pickAbility();
    for (const o of crownedOffers) {
      assert.equal(o.crowned, true); assert.equal(o.offer.length, E.crownedOffer, 'a Crowned win offers four');
      assert.ok(o.offer.some(id => ABILITY_BY_ID[id].rarity === 'legendary'), 'one of them a legendary');
    }
    await nextFight();
    assert.equal(session.gauntlet.number, E.crowned + 1); assert.equal(session.gauntlet.crowned, false);

    // A team wipe ends the run: bosses beaten, Crowned fights won, each player's totals.
    ready(a); ready(b); await flush(b);
    app.sim.arenaWipeDelay = 0.1;
    pose(a, true); pose(b, true); await flush(a); await flush(b);
    const wipe = await a.next('stop'); await b.next('stop');
    assert.equal(wipe.reason, 'team-wipe'); assert.match(wipe.message, /TEAM WIPED.*BOSS RUSH/);
    const end = wipe.summary, row = id => end.players.find(r => r.id === id);
    assert.equal(end.outcome, 'wiped'); assert.equal(end.beaten, E.crowned, 'a restart starts the tally again');
    assert.equal(end.crowned, 1, 'one Crowned fight won');
    assert.equal(end.times.length, E.crowned); assert.equal(end.times[E.crowned - 1].crowned, true, 'the Crowned fight is marked');
    assert.equal(end.players.length, 2); assert.equal(row(b.id).deaths, 1); assert.equal(row(a.id).name, 'Ash');
    assert.ok(Number.isInteger(end.time) && end.time >= 0, 'the run time is whole seconds');
    assert.ok(!('roster' in end) && !('bosses' in end), 'an endless run has no length');
    // Again: a new run.
    await call({});
    assert.equal(session.gauntlet.number, 1); assert.ok(RUSH.opening.includes(session.id), 'a new run opens on an easier boss');
    console.log('BOSS RUSH (endless): the draw (easier first, Crowned every 5th, pairs, no repeats, modifiers, seeds replay), pace-only modifiers, the Crowned offer, refused openings, no bot, the fallen rise, restart, a Crowned fight over the wire, the wipe and its summary passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
