'use strict';
// The Calling (v7.35.0): the leader's co-op boss rush. A chosen or random roster, bots filling the party, one boss at a
// time with the last two together, the fallen rising for the next fight, a refused roster changing nothing.
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
    const a = await peer(origin, 'Ash'), b = await peer(origin, 'Ember'); peers.push(a, b);
    const owner = () => [a, b].find(p => p.id === app.leader) || a;
    // Between fights everyone takes a blessing (tests/blessings.cjs covers the pick itself).
    const bless = async () => {
      for (const p of [a, b]) { p.send({ type: 'bless', epoch: session.epoch, id: (await p.next('blessings')).offer[0] }); await p.next('blessings'); }
    };
    const bosses = app.sim.catalog().bosses.map(e => e.id);
    const call = async extra => {
      owner().send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id, ...extra });
      const opened = await a.next('start'); session = opened.session; await b.next('start');
      return opened;
    };

    // A refused roster starts nothing and adds no bot.
    for (const roster of [bosses.slice(0, 2), [bosses[0], bosses[0], bosses[1]], [bosses[0], bosses[1], 'nobody']]) {
      owner().send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id, roster });
      assert.match((await owner().next('error')).message, /Choose at least 3 different bosses/);
    }
    owner().send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id, roster: 'all' }); await flush(owner());
    assert.equal(app.session, null, 'a malformed roster starts nothing');
    assert.equal(app.sim.botList().length, 0, 'a refused run adds no bot');

    // A hand-picked roster of three: one fight alone, then the last two together. Two players, so one bot fills in.
    const roster = [bosses[3], bosses[0], bosses[7]];
    // Every fight's tally gets 10.4 damage more per player, so the run's totals show two fights folded together.
    const tally = app.sim.fightTally; app.sim.fightTally = () => tally().map(r => ({ ...r, damage: r.damage + 10.4 }));
    const opened = await call({ roster });
    assert.equal(opened.opening, true, 'The Calling opens with its own card');
    assert.equal(app.sim.botList().length, C.calling.fillTo - 2, 'bots fill the party to ' + C.calling.fillTo);
    assert.deepEqual(session.gauntlet.roster, roster);
    assert.equal(session.id, roster[0]); assert.deepEqual(session.partners || [], []);
    assert.equal(session.gauntlet.number, 1); assert.equal(session.gauntlet.total, 2);
    assert.equal(session.teamWipeOnly, true);
    assert.equal(app.sim.describe(session), 'The Calling');
    ready(a); ready(b); await flush(b);
    pose(a, true); await flush(a); pose(a); await flush(a);
    assert.equal(app.clients.get(a.id).pose.hp, 0, 'a fallen player stays down for the rest of the fight');
    finishFight(); await bless();
    session = (await a.next('start')).session; await b.next('start');
    assert.equal(session.gauntlet.number, 2); assert.equal(session.gauntlet.defeated, 1);
    assert.equal(session.id, roster[1]); assert.deepEqual(session.partners, [roster[2]], 'the last two bosses come together');
    assert.deepEqual(Array.from(app.sim.inspect().Game.enemies, e => e.baseDef.id), roster.slice(1));
    ready(a); ready(b); await flush(b);
    assert.equal(app.clients.get(a.id).pose.hp, 120, 'the fallen rise for the next fight');
    assert.equal(app.sim.botList().length, 1, 'the bot stays for the whole run');
    finishFight();
    const done = await a.next('stop'); await b.next('stop');
    assert.match(done.message, /THE CALLING COMPLETE · 3 bosses defeated/);
    assert.equal(app.session, null);
    // The end of the run: its time, every boss beaten, and each player's damage and deaths over both fights.
    const won = done.summary, row = id => won.players.find(r => r.id === id);
    assert.equal(won.outcome, 'won'); assert.equal(won.beaten, 3); assert.equal(won.bosses, 3); assert.deepEqual(won.roster, roster);
    assert.ok(Number.isInteger(won.time) && won.time >= 0, 'the run time is whole seconds');
    assert.equal(won.players.length, 3, 'both players and the bot');
    assert.equal(row(a.id).deaths, 1, 'Ash fell once'); assert.equal(row(b.id).deaths, 0);
    assert.equal(row(a.id).name, 'Ash'); assert.equal(won.players.filter(r => r.bot).length, 1);
    assert.ok(won.players.every(r => r.damage >= 21), 'damage adds up over the fights');
    assert.ok(won.players.every((r, i) => !i || won.players[i - 1].damage >= r.damage), 'most damage first');
    app.sim.fightTally = tally;
    // Again: the leader starts the same roster for the same group.
    await call({ roster: won.roster });
    assert.deepEqual(session.gauntlet.roster, roster); assert.equal(session.gauntlet.number, 1);
    assert.equal(app.sim.botList().length, 1, 'the same group: no extra bot');

    // A random roster: the length the leader chose, every boss different, drawn from every boss in the game.
    await call({ length: 4 });
    const random = session.gauntlet.roster;
    assert.equal(random.length, 4); assert.equal(new Set(random).size, 4); assert.ok(random.every(id => bosses.includes(id)));
    assert.equal(session.gauntlet.total, 3);
    assert.equal(app.sim.botList().length, 1, 'a party already filled gets no more bots');
    await call({});
    assert.equal(session.gauntlet.roster.length, C.calling.length, 'the default run is ' + C.calling.length + ' bosses');
    await call({ length: 999 });
    assert.equal(session.gauntlet.roster.length, bosses.length, 'a longer run than there are bosses meets every boss once');

    // Restart starts the same roster from its first fight; a team wipe ends the run.
    ready(a); ready(b); await flush(b); finishFight(); await bless();
    session = (await a.next('start')).session; await b.next('start');
    const whole = session.gauntlet.roster;
    assert.equal(session.gauntlet.number, 2);
    owner().send({ type: 'control', action: 'restart' });
    session = (await a.next('start')).session; await b.next('start');
    assert.equal(session.gauntlet.number, 1); assert.deepEqual(session.gauntlet.roster, whole);
    app.sim.clearBots(); ready(a); ready(b); await flush(b);
    app.sim.arenaWipeDelay = 0.1;
    pose(a, true); pose(b, true); await flush(a); await flush(b);
    const wipe = await a.next('stop'); await b.next('stop');
    assert.equal(wipe.reason, 'team-wipe'); assert.match(wipe.message, /TEAM WIPED.*THE CALLING/);
    assert.equal(wipe.summary.outcome, 'wiped'); assert.equal(wipe.summary.beaten, 0, 'a restart starts the tally again');
    assert.equal(wipe.summary.bosses, whole.length); assert.equal(wipe.summary.players.find(r => r.id === b.id).deaths, 1);
    console.log('THE CALLING: refused rosters, picked roster, bots fill the party, last two together, the fallen rise, run complete, random and default lengths, restart, wipe, the end-of-run totals and again passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
