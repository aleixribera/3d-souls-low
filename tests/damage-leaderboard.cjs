'use strict';
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const { config: C, FrameEncoder, FrameDecoder } = require('../js/net-protocol.js');
const sim = createSimulation();
function begin(kind = 'arena', id = 'margit') {
  sim.start(kind, id);
  sim.registerPlayer('ash', 'Ash'); sim.registerPlayer('ember', 'Ember'); sim.registerPlayer('idle', 'Idle');
  const e = sim.inspect().Game.enemies[0];
  sim.setPlayers(['ash', 'ember'].map(id => ({ id, x: e.x, y: e.y, z: e.z + 1, hp: 120, state: 'idle' })));
  return e;
}
const hit = (id, e, extra = {}) => sim.hit(id, { enemy: e.netId, attack: 'light', charge: 0, ...extra });
function complete() {
  for (const e of sim.inspect().Game.enemies) { e.hp = 0; e.die(); }
  sim.tick(1 / C.tickRate);
  assert.equal(sim.state.complete, true);
  assert.equal(sim.frame(false).results, null, 'victory appears before the leaderboard');
  sim.tick(C.leaderboardDelay);
  return JSON.parse(JSON.stringify(sim.frame(false).results));
}
let e = begin();
assert.equal(hit('ash', e, { damage: 100000 }), true);
assert.equal(hit('ember', e), true);
e.hp = 3;
assert.equal(hit('ember', e), true);
const rows = complete();
assert.deepEqual(rows.map(r => [r.id, r.damage, r.rank]), [['ember', 27, 1], ['ash', 24, 2], ['idle', 0, 3]], 'trusted damage, overkill cap, zero damage participants and descending ranks');
sim.registerPlayer('ash', 'Changed after victory');
assert.equal(sim.frame(false).results[1].name, 'Ash', 'completed results remain frozen');
const encoder = new FrameEncoder(), decoder = new FrameDecoder();
assert.deepEqual(decoder.decode(JSON.parse(JSON.stringify(encoder.encode(sim.frame(false), [])))).frame.results, rows, 'late-ready full baseline carries results');
sim.tick(C.leaderboardTime);
assert.equal(sim.frame(false).results, null, 'results expire after their reading time');

e = begin(); e.setState('broken'); e.hp = 100;
assert.equal(sim.beginExecution('ash', { enemy: e.netId }), true);
assert.equal(sim.beginExecution('ember', { enemy: e.netId }), false);
sim.endExecution('ember', e.netId);
assert.equal(e.hp, 100, 'another player cannot resolve the execution');
sim.endExecution('ash', e.netId);
assert.equal(complete()[0].damage, 100, 'execution credits its owner, capped at remaining HP');

e = begin(); e.setState('broken'); e.hp = 80;
assert.equal(sim.beginExecution('ember', { enemy: e.netId }), true);
sim.setPlayers([]);
for (let i = 0; i < 600 && e.netExec; i++) sim.tick(1 / C.tickRate);
assert.equal(complete()[0].damage, 80, 'disconnected execution owner retains credit on reservation timeout');

e = begin(); e.setState('phase');
assert.equal(hit('ash', e), false, 'invulnerable contacts are rejected');
assert.equal(complete().find(r => r.id === 'ash').damage, 0);

e = begin('arena', 'malenia');
hit('ash', e); e.lifesteal(); hit('ash', e);
assert.equal(complete()[0].damage, 48, 'healing never subtracts previously earned damage');

e = begin();
hit('ash', e); hit('ember', e);
sim.setPlayers([]);
const ties = complete();
assert.deepEqual(ties.map(r => [r.name, r.damage, r.rank]), [['Ash', 24, 1], ['Ember', 24, 1], ['Idle', 0, 3]], 'ties share a rank and disconnected contributors remain');

e = begin('arena', 'varn'); e.hp = 10;
hit('ash', e);
assert.equal(e.state, 'phase', 'fixture crosses a refilling phase');
assert.equal(complete()[0].damage, 10, 'phase changes count only damage removed from the depleted bar');

begin('arena', 'warden');
e = sim.inspect().Game.enemies.find(e => e.def.guard);
assert.ok(e, 'shield fixture exists');
const before = e.hp;
e.setState('block');
// guarding() is a shared combat predicate; force a guarded contact without AI movement.
e.guarding = () => true;
sim.setPlayers([{ id: 'ash', x: e.x + Math.sin(e.yaw), y: e.y, z: e.z + Math.cos(e.yaw), hp: 120, state: 'idle' }]);
hit('ash', e);
const removed = before - e.hp;
assert.ok(removed < 24 && removed >= 0);
assert.equal(complete().find(r => r.id === 'ash').damage, removed, 'blocked hits count actual chip damage');
begin();
assert.deepEqual(complete().map(r => r.damage), [0, 0, 0], 'each new epoch resets all totals');
console.log('Damage leaderboard: trusted totals, chip damage, overkill, executions, phases, ties, disconnects, delayed display, baselines and reset passed.');
