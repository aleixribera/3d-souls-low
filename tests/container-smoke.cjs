'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C, FrameDecoder } = require('../js/net-protocol.js');
const origin = process.argv[2] || 'http://127.0.0.1:3080';
const version = fs.readFileSync('js/config.js', 'utf8').match(/const VERSION = '([^']+)'/)[1];
(async () => {
  let healthy = false;
  for (let n = 0; n < 120; n++) {
    try { const r = await fetch(origin + '/healthz', { signal: AbortSignal.timeout(2000) }); if (r.ok && (await r.json()).version === version) { healthy = true; break; } } catch {}
    await delay(250);
  }
  assert.ok(healthy, 'container becomes healthy with the expected version');
  const info = await (await fetch(origin + '/api/lobby')).json();
  assert.equal(info.protocol, C.protocol);
  const html = await (await fetch(origin)).text(); assert.ok(html.includes(`content="${info.build}"`), 'page and container use the same build');
  for (const file of ['/server/index.cjs', '/.env', '/tests/suite.js']) assert.equal((await fetch(origin + file)).status, 404);
  const ws = new WebSocket(origin.replace(/^http/, 'ws') + C.path, { origin });
  const decoder = new FrameDecoder();
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Container WebSocket smoke test timed out')), 15000);
      ws.on('error', reject);
      ws.on('open', () => {
        try {
          assert.ok(ws.extensions.includes('permessage-deflate'), 'container negotiates WebSocket compression');
          ws.send(JSON.stringify({ type: 'hello', protocol: C.protocol, build: info.build, name: 'Container smoke test' }));
        } catch (e) { clearTimeout(timeout); reject(e); }
      });
      ws.on('message', data => {
        try {
          const m = JSON.parse(data);
          const send = value => ws.send(JSON.stringify(value));
          if (m.type === 'welcome') send({ type: 'control', action: 'start', kind: 'arena', id: 'margit' });
          if (m.type === 'start') {
            send({ type: 'ready', epoch: m.session.epoch });
            send({ type: 'pose', epoch: m.session.epoch, pose: { ...m.session.spawn, hp: 120, state: 'idle', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true } });
          }
          if (m.type === 'frame') {
            const f = decoder.decode(m).frame;
            assert.equal(f.enemies[0].def, 'margit');
            if (f.time > 0.1) { clearTimeout(timeout); resolve(); }
          }
        } catch (e) { clearTimeout(timeout); reject(e); }
      });
    });
    console.log(`Container smoke test passed: ${version}, HTTP assets, protocol ${C.protocol}, compressed WebSocket, live boss simulation.`);
  } finally { ws.terminate(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
