'use strict';
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { EnemyTrack, FrameEncoder, FrameDecoder, cameraView, config: C } = require('../js/net-protocol.js');
const { createSimulation } = require('../server/headless.cjs');
const sample = (time, state, extras = {}) => ({ time, value: { id: 'test', state, ...extras }, events: [], shots: [] });
const track = new EnemyTrack();
for (let tick = 0; tick <= 300; tick++) {
  const time = tick / 60;
  track.push(sample(time, time < 1 ? 'idle' : time < 2 ? 'windup' : time < 2.2 ? 'active' : 'recover'));
}
let view = track.advance(1 / 60);
assert.equal(view.time, 1, 'idle resync stops at the first unseen wind-up');
for (let i = 0; i < 59; i++) view = track.advance(1 / 60);
assert.ok(view.time < 2, 'the entire wind-up is shown at 1x even with a backlog');
view = track.advance(1 / 60);
assert.ok(view.time <= 2.001, 'the attack is not skipped to catch up');
for (let i = 0; i < 20; i++) view = track.advance(1 / 60);
assert.ok(view.time > 4.8, 'recovery discards accumulated idle delay');
const other = new EnemyTrack(); other.push(sample(0, 'idle')); other.push(sample(5, 'idle'));
assert.ok(other.advance(1 / 60).time > 4.8, 'a delayed attacking enemy never stalls another enemy');

// Fifty seconds of 30 Hz delivery, jitter and short stalls; cycles must remain
// at real speed rather than accumulate permanent slowdown after each underrun.
const playback = new EnemyTrack(); let received = 0, worst = 0, minWindup = Infinity, windupStart = null, previous = null;
for (let tick = 0; tick < 3000; tick++) {
  const now = tick / 60;
  if (tick % 2 === 0 && tick % 180 > 8) {
    for (; received / 30 <= now; received++) {
      const time = received / 30, phase = time % 3;
      const state = phase < 1 ? 'windup' : phase < 1.2 ? 'active' : 'recover';
      playback.push(sample(time, state));
    }
  }
  const v = playback.advance(1 / 60); if (!v) continue;
  worst = Math.max(worst, now - v.time);
  if (v.a.value.state === 'windup' && previous !== 'windup') windupStart = now;
  if (v.a.value.state === 'active' && previous === 'windup') minWindup = Math.min(minWindup, now - windupStart);
  previous = v.a.value.state;
}
assert.ok(worst < 0.3, `jitter delay stays bounded instead of growing: ${worst}`);
assert.ok(minWindup >= 0.95, `wind-ups retain their full duration: ${minWindup}`);

const sim = createSimulation(); sim.start('level', 'final-castle');
const encoder = new FrameEncoder(), decoder = new FrameDecoder();
let frame = sim.frame(false), first = encoder.encode(frame, []);
assert.equal(first.full, true);
let decoded = decoder.decode(JSON.parse(JSON.stringify(first)));
assert.equal(decoded.frame.enemies.length, frame.enemies.length);
const second = encoder.encode(frame, []);
assert.equal(second.frame.enemies.length, 0, 'unchanged enemy definitions and state are not retransmitted');
frame.enemies[0].hp -= 24; frame.time += 1 / 60;
const hit = encoder.encode(frame, [{ id: 'player', name: 'Friend', hp: 120 }]);
decoded = decoder.decode(JSON.parse(JSON.stringify(hit)));
assert.equal(decoded.frame.enemies[0].hp, frame.enemies[0].hp);
assert.equal(decoded.frame.enemies[0].def, frame.enemies[0].def, 'unchanged fields survive delta decoding');
assert.ok(Buffer.byteLength(JSON.stringify(hit)) < Buffer.byteLength(JSON.stringify(first)) / 4, 'delta frame is materially smaller');
const camera = { position: [3, 5, -8], quaternion: [0, 0, 0, 1], fov: 64 };
assert.deepEqual(cameraView({ ...camera, ignored: 'untrusted' }), camera, 'camera fields are whitelisted');
for (const invalid of [null, { ...camera, position: [Infinity, 0, 0] }, { ...camera, quaternion: [0, 0, 0, 0] },
  { ...camera, quaternion: [0, 0, 0, 2] }, { ...camera, fov: 0 }, { ...camera, fov: 179 }]) assert.equal(cameraView(invalid), null);
const cameraFrame = encoder.encode(frame, [{ id: 'player', name: 'Friend', hp: 120, view: camera }]);
assert.deepEqual(decoder.decode(cameraFrame).players[0].view, camera, 'rendered camera survives player deltas');
const deadFrame = encoder.encode(frame, [{ id: 'player', name: 'Friend', hp: 0, view: null }]);
assert.equal(decoder.decode(deadFrame).players[0].view, null, 'death clears camera data');
const left = decoder.decode(encoder.encode(frame, [])); assert.equal(left.players.length, 0, 'disconnect removes a player by ID');
sim.start('arena', 'margit'); const restarted = encoder.encode(sim.frame(false), []);
assert.equal(restarted.full, true); assert.equal(decoder.decode(restarted).frame.enemies.length, 1, 'new epoch clears old actors');
const raw = Buffer.byteLength(JSON.stringify(first)), packed = zlib.deflateRawSync(JSON.stringify(first), { level: C.compressionLevel }).length;
assert.ok(packed < raw / 3, 'Funnel traffic compresses efficiently');
console.log(`Network timing: full telegraphs, independent clocks, bounded jitter and delta round trips passed. Initial castle snapshot ${raw} → ${packed} bytes compressed.`);
