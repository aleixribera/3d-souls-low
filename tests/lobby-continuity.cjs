'use strict';
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const { build, createSimulation } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
async function join(origin, name, token) {
  const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [], waiters = [];
  ws.on('message', data => {
    const m = JSON.parse(data), i = waiters.findIndex(w => w.test(m));
    if (i < 0) queue.push(m);
    else { const w = waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); }
  });
  const next = (type, predicate = () => true) => {
    const test = m => m.type === type && predicate(m), i = queue.findIndex(test);
    if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { test, resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error('Timed out: ' + type)); }, 4000) };
      waiters.push(w);
    });
  };
  const send = m => ws.send(JSON.stringify(m));
  await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name, token });
  const welcome = await next('welcome');
  return { ws, send, next, id: welcome.id, welcome, activity: async () => { send({ type: 'activity' }); send({ type: 'ping' }); await next('pong'); } };
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async (test, message, limit = 4000) => {
  const end = performance.now() + limit;
  while (!test() && performance.now() < end) await wait(20);
  assert.ok(test(), message);
};
{
  const idle = createSimulation(); idle.start('arena', 'giant'); idle.setPlayers([]);
  const enemy = idle.inspect().Game.duel; enemy.beginAttack(enemy.baseDef.attacks.find(a => a.id === 'sweep'));
  for (let i = 0; i < 360; i++) idle.tick(1 / C.tickRate);
  assert.ok(!['windup', 'active', 'recover'].includes(enemy.state), 'an empty arena finishes attacks and returns to idle');
  assert.ok(idle.state.time > 5);
  // The owner kneels beside its victim: the server range-checks executions (ArenaNet.config.contactSlack).
  const owner = { ...idle.state.checkpoint, x: enemy.x, y: enemy.y, z: enemy.z + enemy.radius + 0.8, id: 'absent-owner', hp: 120, state: 'idle' };
  idle.setPlayers([owner]); enemy.setState('broken');
  assert.ok(idle.beginExecution(owner.id, { enemy: enemy.netId })); idle.setPlayers([]);
  for (let i = 0; i < 600; i++) idle.tick(1 / C.tickRate);
  assert.equal(enemy.netExec, null, 'an abandoned execution resolves while the arena is empty');
}
(async () => {
  let loadingClock = 0;
  const app = createServer({ loadNow: () => loadingClock }), peers = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  const add = async (name, token) => { const p = await join(origin, name, token); peers.push(p); return p; };
  const ready = (p, session, extra = {}) => {
    p.send({ type: 'ready', epoch: session.epoch });
    p.send({ type: 'pose', epoch: session.epoch, pose: { ...session.spawn, yaw: 0, hp: 120, state: 'idle', stateTime: 0,
      attackT: 0, chargeT: 0, walkPhase: 0, grounded: true, stamina: 160, flasks: 4, ...extra } });
  };
  try {
    const a = await add('Leader'), b = await add('Friend');
    a.send({ type: 'control', action: 'start', kind: 'campaign', id: 'lands' });
    const { session } = await a.next('start');
    ready(a, session); ready(b, session); await b.next('frame', m => m.frame.time > 0);
    const { Game, world } = app.sim.inspect(), zone = Game.zones.find(z => z.id === 'zone-heath');
    for (const e of zone.actors) { e.hp = 0; e.die(); }
    const boss = Game.enemies.find(e => e.baseDef.id === 'margit');
    boss.hp -= 24; const bossHp = boss.hp;
    await b.next('frame', m => m.frame.gates.some(g => g.id === zone.id && g.open));

    a.send({ type: 'presence', foreground: false }); await a.activity();
    await b.next('roster', m => m.leader === b.id);
    b.send({ type: 'presence', foreground: false }); await b.activity();
    await until(() => !app.clients.get(b.id).foreground, 'both old tabs are away');
    const before = app.sim.state.time;
    await until(() => app.sim.state.time > before + 0.1, 'the world clock advances with every tab inactive');
    const newcomer = await add('Returning knight');
    assert.equal(newcomer.welcome.leader, newcomer.id, 'a new active player leads immediately when the old tabs are away');
    assert.equal((await newcomer.next('start')).session.epoch, session.epoch);
    const saved = { x: session.spawn.x + 1, y: session.spawn.y, z: session.spawn.z + 1, yaw: 0.8, hp: 61,
      stamina: 37, flasks: 1, staminaDelay: 0.4, exhausted: false, doomTime: 2, doomDrain: 3 };
    ready(newcomer, session, saved); await newcomer.activity();
    const token = newcomer.welcome.token, id = newcomer.id;
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(newcomer.welcome.players).includes(token), 'private credentials never enter the roster');
    for (const p of [a, b, newcomer]) p.ws.close(1000, 'Left lobby');
    await until(() => app.clients.size === 0, 'the party left');
    const emptyTime = app.sim.state.time;
    await until(() => app.sim.state.time > emptyTime + 0.15, 'the empty run continues ticking');
    assert.equal(app.session.epoch, session.epoch, 'an intentional empty lobby retains the adventure');
    assert.equal(boss.hp, bossHp, 'boss health survives the whole party leaving');
    assert.ok(world.gates.find(g => g.id === zone.id).open, 'won gates remain open');

    const rejoined = await add('', token), resumed = await rejoined.next('start');
    assert.equal(rejoined.id, id, 'the browser recovers its identity');
    assert.equal(rejoined.welcome.players.find(p => p.id === id).name, 'Returning knight', 'the server remembers the name');
    for (const [key, value] of Object.entries(saved)) assert.equal(resumed.resume[key], value, 'saved ' + key + ' survives leaving');
    ready(rejoined, session, saved); await rejoined.activity();
    const impostor = await add('Returning knight');
    assert.notEqual(impostor.id, id, 'a matching display name cannot take a different identity or state');
    assert.equal((await impostor.next('start')).resume, null);
    // A same-browser reload can replace its old transport without duplicate bodies or a delayed close erasing it.
    const previousSocket = app.clients.get(id).ws;
    const replacement = await add('', token); await replacement.next('start');
    assert.equal(replacement.id, id); ready(replacement, session, saved); await replacement.activity();
    await wait(50);
    assert.notEqual(app.clients.get(id).ws, previousSocket, 'the new transport replaces the old one');
    assert.equal(app.clients.get(id).ws.readyState, WebSocket.OPEN);
    assert.equal([...app.clients.values()].filter(p => p.id === id).length, 1);

    // Missing pose/resource fields use legal defaults; invalid resource packets never poison remembered state.
    replacement.send({ type: 'pose', epoch: session.epoch, pose: { ...app.clients.get(id).pose, stamina: -1 } });
    await replacement.activity();
    assert.equal(app.clients.get(id).pose.stamina, 37);
    replacement.send({ type: 'control', action: 'transfer', player: impostor.id }); await replacement.activity();
    impostor.send({ type: 'control', action: 'start', kind: 'gauntlet', id: 'boss-only' });
    const run = (await impostor.next('start')).session;
    impostor.send({ type: 'control', action: 'addBot' }); await impostor.activity();
    assert.equal(app.sim.botList().length, 1);
    // Neither human finishes loading. Even a fresh/reconnecting loader cannot extend the overall wait forever.
    replacement.send({ type: 'presence', foreground: false }); await replacement.activity();
    app.clients.get(impostor.id).loadingSince = performance.now(); loadingClock += C.loadTimeout;
    const body = [...app.sim.inspect().bots.values()][0].body, enemy = app.sim.inspect().Game.duel;
    const hp = enemy.hp;
    await until(() => enemy.hp < hp, 'away/stalled connected loaders cannot prevent bots fighting', 16000);
    const aloneHp = enemy.hp;
    for (const p of [replacement, impostor]) p.ws.close(1000, 'Left lobby');
    await until(() => app.clients.size === 0, 'all sockets left the bot run');
    await until(() => enemy.hp < aloneHp, 'a bot deals real damage after every human leaves', 16000);
    assert.ok(body.alive()); assert.equal(app.session.epoch, run.epoch); assert.equal(app.sim.botList().length, 1);
    // A new chapter/attempt gets its normal spawn and refills, never coordinates from an old map.
    const later = await add('', token), current = await later.next('start');
    assert.equal(current.session.epoch, run.epoch); assert.equal(current.resume, null);
    assert.equal(later.welcome.players.find(p => p.id === id).name, 'Returning knight');
    ready(later, run); await later.activity();
    later.send({ type: 'pose', epoch: run.epoch, pose: { ...app.clients.get(id).pose, hp: 0, state: 'dead', stamina: 0, flasks: 0 } });
    await later.activity(); later.ws.terminate(); await until(() => !app.clients.size, 'defeated player disconnected');
    const dead = await add('', token), death = await dead.next('start');
    assert.equal(death.resume.hp, 0); assert.equal(death.resume.state, 'dead', 'rejoining cannot revive a defeated player');
    ready(dead, run); await dead.activity();
    assert.equal(app.clients.get(id).pose.hp, 0, 'a fresh healthy pose cannot bypass the saved defeat latch');
    console.log('Persistent lobby: inactive/empty clocks, immediate leader handoff, private identity, resources, duplicate transports, epoch isolation, defeat latch and bots fighting without humans passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
