'use strict';
// A recorded Boss Rush run on a local server, for the replay viewer and its measures (PLAN.md "replays"):
//   node tools/replay-drill.cjs [minutes=4] [dir=.scratch/replays]
// Two scripted players join over WebSocket (they circle the boss, take a blow when one lands near them, pick the
// first ability offered) and two of the server's own bots fight beside them, so the run has real blows, downs,
// revives and Finishing Blows. It prints what the recorder cost per snapshot, the tick and bandwidth, and the
// file's size per hour of play. KEEP=1 leaves the server up afterwards on PORT (lobby) and REPLAY_PORT (the door).
const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const { build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');

const minutes = Number(process.argv[2] || 4), dir = path.resolve(process.argv[3] || '.scratch/replays');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const app = createServer({ replayDir: dir, capacity: 8 });
  await new Promise(r => app.server.listen(Number(process.env.PORT || 0), '127.0.0.1', r));
  await new Promise(r => app.replayServer.listen(Number(process.env.REPLAY_PORT || 0), '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  console.log(`lobby ${origin}  replays http://127.0.0.1:${app.replayServer.address().port}/`);
  // The recorder's own cost: every call to it timed.
  let spent = 0, calls = 0;
  const begin = app.replays.begin;
  app.replays.begin = head => {
    const rec = begin(head), frame = rec.frame;
    rec.frame = (f, p) => { const t = performance.now(); frame(f, p); spent += performance.now() - t; calls++; };
    return rec;
  };
  const players = [];
  async function join(name, lead) {
    const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin });
    const me = { ws, name, session: null, ready: false, hp: 120, max: 120, angle: lead ? 0 : Math.PI, down: false, enemies: [] };
    const send = m => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m));
    me.send = send;
    ws.on('message', data => {
      const m = JSON.parse(data);
      if (m.type === 'welcome') me.id = m.id;
      if (m.type === 'start') { me.session = m.session; me.hp = me.max; me.down = false; me.ready = false; setTimeout(() => { send({ type: 'ready', epoch: me.session.epoch }); me.ready = true; }, 600); }
      if (m.type === 'stop') { me.session = null; me.ready = false; }
      if (m.type === 'abilities' && m.offer?.length) setTimeout(() => send({ type: 'pickAbility', epoch: me.session.epoch, id: m.offer[Math.floor(Math.random() * m.offer.length)] }), 800 + Math.random() * 2000);
      if (m.type === 'revive') { me.hp = m.hp; me.down = false; }
      if (m.type === 'frame' && m.frame) for (const e of m.frame.enemies || []) {
        const old = me.enemies.find(x => x.id === e.id);
        if (old) Object.assign(old, e); else me.enemies.push({ ...e });
      }
    });
    await once(ws, 'open');
    send({ type: 'hello', protocol: C.protocol, build, name });
    players.push(me);
    return me;
  }
  const a = await join('Aleix', true), b = await join('Marc');
  await wait(400);
  a.send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id });
  await wait(300);
  app.sim.addBot(); app.sim.addBot();
  let t = 0;
  const pose = setInterval(() => {
    t += 1 / 30;
    for (const me of players) {
      if (!me.session || !me.ready) continue;
      const boss = me.enemies.find(e => e.hp > 0) || { x: me.session.spawn.x, z: me.session.spawn.z + 8 };
      const striking = me.enemies.find(e => e.hp > 0 && (e.hitbox || e.state === 'active') && Math.hypot(e.x - me.x, e.z - me.z) < 3.2);
      if (!me.down && striking && Math.random() < 0.12) me.hp = Math.max(0, me.hp - 22);
      if (me.hp <= 0) me.down = true;
      me.angle += 0.018 * (me.name === 'Aleix' ? 1 : -1);
      const r = 4 + Math.sin(t * 0.7 + me.angle) * 1.5;
      if (!me.down) { me.x = boss.x + Math.cos(me.angle) * r; me.z = boss.z + Math.sin(me.angle) * r; }
      const swinging = !me.down && Math.sin(t * 3 + me.angle) > 0.6;
      me.send({ type: 'pose', epoch: me.session.epoch, pose: { x: me.x ?? me.session.spawn.x, y: me.session.spawn.y, z: me.z ?? me.session.spawn.z,
        yaw: Math.atan2(boss.x - (me.x ?? 0), boss.z - (me.z ?? 0)), hp: me.hp, state: me.down ? 'dead' : swinging ? 'attack' : 'walk', stateTime: (t * 2) % 1,
        attack: swinging ? 'light' : null, attackT: swinging ? (t * 2) % 1 : 0, chargeT: 0, walkPhase: t * 6, grounded: true, vx: 0, vy: 0, vz: 0 } });
    }
  }, 1000 / 30);
  const end = Date.now() + minutes * 60000;
  while (Date.now() < end && app.session) await wait(1000);
  clearInterval(pose);
  const metrics = app.metrics;
  if (app.session) { for (const me of players) { me.hp = 0; me.down = true; } a.send({ type: 'control', action: 'lobby' }); await wait(800); }
  const run = app.replays.list()[0];
  await wait(300);
  const size = fs.statSync(path.join(dir, run.id + '.rec.gz')).size;
  console.log(JSON.stringify({ run: run.id, outcome: run.outcome, reached: run.reached, seconds: run.duration, bytes: size,
    mbPerHour: +(size / Math.max(1, run.duration) * 3600 / 1e6).toFixed(2), recorderMsPerSnapshot: +(spent / Math.max(1, calls)).toFixed(3), snapshots: calls,
    tickMs: metrics.tickMs, hz: metrics.hz, bytesPerSecondToPlayers: metrics.bytesPerSecond }));
  if (!process.env.KEEP) { for (const me of players) me.ws.close(); await app.close(); process.exit(0); }
})().catch(e => { console.error(e); process.exit(1); });
