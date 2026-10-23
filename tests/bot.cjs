'use strict';
// Friendly bots (v7.11): leader-only controls, roster and frames, real combat credit, team-wipe rules,
// and the bot's duel record. node tests/bot.cjs
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const { build, createSimulation } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C, FrameDecoder } = require('../js/net-protocol.js');
async function join(origin, name) {
  const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [], waiters = [], decoder = new FrameDecoder();
  ws.on('message', data => {
    let m = JSON.parse(data); if (m.type === 'frame') m = decoder.decode(m);
    const i = waiters.findIndex(w => w.test(m));
    if (i < 0) { queue.push(m); if (queue.length > 400) queue.shift(); }
    else { const w = waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); }
  });
  const next = (type, predicate = () => true, wait = 4000) => {
    const test = m => (m.type === type || (type === 'frame' && m.frame)) && predicate(m), i = queue.findIndex(test);
    if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { test, resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error('Timed out: ' + type)); }, wait) };
      waiters.push(w);
    });
  };
  const send = m => ws.send(JSON.stringify(m));
  await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name });
  const welcome = await next('welcome');
  return { ws, send, next, id: welcome.id, welcome, clear: () => queue.length = 0 };
}
(async () => {
  const app = createServer(), peers = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  try {
    const a = await join(origin, 'Leader'); peers.push(a);
    const b = await join(origin, 'Guest'); peers.push(b);
    b.send({ type: 'control', action: 'addBot' });
    assert.match((await b.next('error')).message, /Only the lobby leader/, 'guests cannot add bots');
    a.send({ type: 'control', action: 'addBot' });
    const roster = await b.next('roster', m => m.players.some(p => p.bot));
    const botRow = roster.players.find(p => p.bot);
    assert.ok(botRow.name && botRow.ready, 'the bot joins the roster, named and ready');
    for (let i = 1; i < C.maxBots; i++) { a.send({ type: 'control', action: 'addBot' }); await a.next('roster', m => m.players.filter(p => p.bot).length === i + 1); }
    a.send({ type: 'control', action: 'addBot' });
    assert.match((await a.next('error')).message, /at most/, `no more than ${C.maxBots} bots`);
    b.send({ type: 'control', action: 'removeBot', player: botRow.id });
    assert.match((await b.next('error')).message, /Only the lobby leader/, 'guests cannot remove bots');
    a.clear();
    for (const p of app.sim.botList().slice(1)) a.send({ type: 'control', action: 'removeBot', player: p.id });
    await a.next('roster', m => m.players.filter(x => x.bot).length === 1);
    assert.equal(app.sim.botList().length, 1, 'the leader removes bots');

    // A boss arena: the guests fall at once; the bot fights on, alone, and the run is not wiped while it stands.
    a.send({ type: 'control', action: 'start', kind: 'arena', id: 'giant' });
    const { session } = await a.next('start');
    const dead = { ...session.spawn, hp: 0, state: 'dead', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true };
    for (const p of peers) { p.send({ type: 'ready', epoch: session.epoch }); p.send({ type: 'pose', epoch: session.epoch, pose: dead }); }
    const keep = setInterval(() => { for (const p of peers) p.send({ type: 'pose', epoch: session.epoch, pose: dead }); }, 200);
    try {
      const framed = await a.next('frame', m => (m.players || []).some(p => p.bot && p.id === botRow.id), 6000);
      const pose = framed.players.find(p => p.id === botRow.id);
      assert.ok(pose.view && pose.view.position.length === 3 && pose.view.quaternion.length === 4, 'the bot carries a camera for spectators');
      const strike = await a.next('frame', m => m.frame.events.some(e => e.type === 'strike' && e.player === botRow.id), 20000);
      assert.ok(strike, 'the bot\'s blows reach the clients as a player\'s');
      await new Promise(r => setTimeout(r, (app.sim.arenaWipeDelay + 1) * 1000));
      assert.equal(app.session.epoch, session.epoch, 'a standing bot keeps the attempt alive');
      const boss = app.sim.inspect().Game.enemies[0];
      assert.ok(boss.hp < boss.baseDef.hp, 'the bot deals real damage to the shared boss');
    } finally { clearInterval(keep); }
    a.clear(); a.send({ type: 'control', action: 'removeBot', player: botRow.id });
    await a.next('roster', m => !m.players.some(p => p.bot));
    assert.equal(app.sim.inspect().players.filter(p => p.botId).length, 0, 'a removed bot leaves the fight');
  } finally {
    for (const p of peers) p.ws.close();
    await app.close();
  }

  // An aid must contribute and resolve its solo attempt. Winning almost every duel is no longer the balance goal.
  const duel = (boss, profile, limit = 180) => {
    const sim = createSimulation(); sim.addBot(profile); sim.start('arena', boss); sim.setPlayers([]);
    const { Game } = sim.inspect(), e = Game.enemies[0], initialHp = e.hp;
    for (let t = 0; t < limit * 60; t++) {
      sim.setPlayers([]); sim.tick(1 / 60);
      if (Game.enemies.every(e => !e.alive()) || sim.botsDown())
        return { win: Game.enemies.every(e => !e.alive()), damage: initialHp - e.hp, initialHp, time: t / 60 };
    }
    return { timeout: true, damage: initialHp - e.hp, initialHp, time: limit };
  };
  const profiles = ['quill', 'maren', 'tobin'];
  const duels = Array.from({ length: 30 }, (_, i) => duel('giant', profiles[i % 3]));
  const wins = duels.filter(d => d.win).length;
  assert.ok(duels.every(d => !d.timeout), 'solo attempts resolve within three minutes');
  assert.ok(duels.filter(d => d.damage >= d.initialHp * 0.2).length >= 24, 'bots still make a useful damage contribution');
  console.log(`Friendly bots: leader-only add/remove, cap, roster, frames, camera, strikes, damage, no wipe while standing, removal passed. Giant Skeleton duels: ${wins}/30.`);
})().catch(e => { console.error(e); process.exit(1); });
