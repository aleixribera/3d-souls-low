'use strict';
// Real compressed WebSockets, three moving clients and the largest Ashmere map.
// This measures local server/transport cost; it does not stand in for WAN tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { createServer } = require('../server/index.cjs');
const { build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C, FrameDecoder } = require('../js/net-protocol.js');
(async () => {
  const app = createServer(), peers = [];
  let poseTimer, pingTimer, measuring = false, legacyTime = -Infinity, legacySignature = '', legacyBytes = 0;
  const pings = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  try {
    for (let i = 0; i < 3; i++) {
      const ws = new WebSocket(origin.replace('http', 'ws') + '/lobby', { origin });
      const decoder = new FrameDecoder(), peer = { ws, decoder }; peers.push(peer);
      peer.send = msg => ws.send(JSON.stringify(msg));
      peer.next = type => new Promise((resolve, reject) => {
        const timer = setTimeout(() => { ws.off('message', listener); reject(new Error('Timed out: ' + type)); }, 10000);
        function listener(data) { const m = JSON.parse(data); if (m.type === type) { clearTimeout(timer); ws.off('message', listener); resolve(m); } }
        ws.on('message', listener);
      });
      ws.on('message', data => {
        const message = JSON.parse(data);
        if (message.type === 'pong' && measuring) pings.push(performance.now() - message.sent);
        if (message.type !== 'frame') return;
        peer.frame = decoder.decode(message);
        if (!measuring || i !== 0) return;
        const f = app.sim.frame(false);
        const signature = f.enemies.map(e => `${e.state}/${e.serial}/${e.hitIndex}/${e.hitbox}/${e.phase}`).join('|');
        if (f.time - legacyTime < 1 / 20 - 1e-9 && signature === legacySignature) return;
        legacyTime = f.time; legacySignature = signature;
        const players = [...app.clients.values()].map(p => ({ ...p.pose, id: p.id, name: p.name }));
        legacyBytes += Buffer.byteLength(JSON.stringify({ type: 'frame', frame: f, players })) * peers.length;
      });
      await once(ws, 'open');
      const welcome = peer.next('welcome'); peer.send({ type: 'hello', protocol: C.protocol, build, name: `Load ${i}` }); await welcome;
      assert.ok(ws.extensions.includes('permessage-deflate'), 'WebSocket compression negotiated');
    }
    const starting = Promise.all(peers.map(p => p.next('start')));
    peers[0].send({ type: 'control', action: 'start', kind: 'level', id: 'final-castle' });
    const [{ session }] = await starting;
    const enemies = app.sim.inspect().Game.enemies;
    for (let i = 0; i < peers.length; i++) {
      peers[i].at = enemies[Math.floor(i * (enemies.length - 1) / 2)];
      peers[i].send({ type: 'ready', epoch: session.epoch });
    }
    const sendPoses = () => peers.forEach((p, i) => {
      const a = p.at.home, t = performance.now() / 1000 + i;
      p.send({ type: 'pose', epoch: session.epoch, pose: {
        x: a.x + 3 + Math.sin(t), y: a.y, z: a.z + Math.cos(t), yaw: t % (2 * Math.PI),
        hp: 120, state: 'walk', stateTime: t, grounded: true,
        attack: null, attackT: 0, charge: 0, chargeT: 0, walkPhase: t,
      } });
    });
    sendPoses(); poseTimer = setInterval(sendPoses, 1000 / C.playerRate);
    await delay(2000);
    const written = () => [...app.clients.values()].reduce((n, p) => n + p.ws._socket.bytesWritten, 0);
    const before = written(), began = performance.now(); measuring = true;
    pingTimer = setInterval(() => peers.forEach(p => p.send({ type: 'ping', sent: performance.now() })), 200);
    await delay(6000);
    measuring = false;
    const seconds = (performance.now() - began) / 1000;
    const measured = { players: 3, level: 'final-castle', seconds: +seconds.toFixed(2),
      compressedBytesPerSecond: Math.round((written() - before) / seconds),
      previousFullFrameBytesPerSecond: Math.round(legacyBytes / seconds), metrics: app.metrics,
      localPingP95Ms: +pings.sort((a, b) => a - b)[Math.floor(pings.length * 0.95)].toFixed(2) };
    measured.reductionPercent = Math.round(100 * (1 - measured.compressedBytesPerSecond / measured.previousFullFrameBytesPerSecond));
    assert.equal(app.clients.size, 3, 'all three clients remain connected throughout the measurement');
    assert.ok(measured.compressedBytesPerSecond < measured.previousFullFrameBytesPerSecond / 2, 'public relay traffic materially reduced');
    assert.ok(measured.metrics.hz >= 55, 'simulation maintains its fixed 60 Hz cadence');
    assert.ok(measured.metrics.bufferedBytes < C.maxBuffered, 'no transport backlog');
    assert.ok(measured.localPingP95Ms < 100, 'busy simulation does not stall local ping responses');
    fs.mkdirSync('.scratch', { recursive: true }); fs.writeFileSync('.scratch/network-load.json', JSON.stringify(measured, null, 2));
    console.log(JSON.stringify(measured, null, 2));
  } finally { clearInterval(poseTimer); clearInterval(pingTimer); for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
