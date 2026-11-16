'use strict';
// A fight's numbers per player (Simulation.fightTally): what Boss Rush's run summary adds up.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const { config: C } = require('../js/net-protocol.js');
const sim = createSimulation();
function begin(kind = 'arena', id = 'ostrey') {
  sim.start(kind, id);
  sim.registerPlayer('ash', 'Ash'); sim.registerPlayer('ember', 'Ember'); sim.registerPlayer('idle', 'Idle');
  const e = sim.inspect().Game.enemies[0];
  sim.setPlayers(['ash', 'ember'].map(id => ({ id, x: e.x, y: e.y, z: e.z + 1, hp: 120, state: 'idle' })));
  return e;
}
const hit = (id, e, extra = {}) => sim.hit(id, { enemy: e.netId, attack: 'light', charge: 0, ...extra });
// Pass 100: player `id` lands a Finishing Blow: a perfect dodge opens a counter, and its counter on a guard cracked to
// the last is granted. The counter itself lands first.
function finisherBy(id, e) {
  e.beginAttack(e.baseDef.attacks.find(a => !a.projectile)); sim.tick(1 / C.tickRate);
  const at = { x: e.x, y: e.y, z: e.z + 1, hp: 120 }, others = ['ash', 'ember'].filter(o => o !== id).map(o => ({ id: o, ...at, state: 'idle' }));
  sim.setPlayers([{ id, ...at, state: 'roll' }, ...others]);
  assert.equal(sim.dodged(id, { enemy: e.netId, serial: e.netAttack }), true, 'a perfect dodge');
  sim.setPlayers([{ id, ...at, state: 'idle' }, ...others]);
  e.cracks = sim.inspect().CONFIG.finisher.cracks;
  assert.equal(hit(id, e, { attack: 'counter', riposte: true }), true); assert.ok(e.netExec, 'the Finishing Blow is granted');
}
function complete() {
  for (const e of sim.inspect().Game.enemies) { e.hp = 0; e.die(); }
  sim.tick(1 / C.tickRate);
  assert.equal(sim.state.complete, true);
  sim.tick(C.rushKillTime);
  return JSON.parse(JSON.stringify(sim.fightTally())).sort((a, b) => b.damage - a.damage || a.name.localeCompare(b.name));   // out of the vm's realm
}
let e = begin();
assert.equal(hit('ash', e, { damage: 100000 }), true);
assert.equal(hit('ember', e), true);
e.hp = 3;
assert.equal(hit('ember', e), true);
const rows = complete();
assert.deepEqual(rows.map(r => [r.id, r.damage]), [['ember', 19], ['ash', 16], ['idle', 0]], 'trusted damage, overkill cap and zero damage participants');
sim.registerPlayer('ash', 'Changed after victory');
assert.equal(sim.fightTally().find(r => r.id === 'ash').name, 'Ash', 'a won fight keeps its numbers');

e = begin(); e.hp = 100; finisherBy('ash', e);
const held = e.hp;
assert.equal(hit('ember', e), false, 'nobody strikes a foe held for a Finishing Blow');
sim.endFinisher('ember', e.netId);
assert.equal(e.hp, held, 'another player cannot end the Finishing Blow');
sim.endFinisher('ash', e.netId);
assert.equal(complete()[0].damage, 100, 'a Finishing Blow credits its owner, capped at remaining HP');

e = begin(); e.hp = 80; finisherBy('ember', e);
sim.setPlayers([]);
for (let i = 0; i < 600 && e.netExec; i++) sim.tick(1 / C.tickRate);
assert.equal(complete()[0].damage, 80, 'a disconnected Finishing Blow owner retains credit on reservation timeout');

e = begin(); e.setState('phase');
assert.equal(hit('ash', e), false, 'invulnerable contacts are rejected');
assert.equal(complete().find(r => r.id === 'ash').damage, 0);

e = begin(); e.def = { ...e.def, lifesteal: { flat: 40, pct: 0.02 } };   // the opt-in lifesteal of v5.9, no longer on any boss
hit('ash', e); e.lifesteal(); hit('ash', e);
assert.equal(complete()[0].damage, 32, 'healing never subtracts previously earned damage');

e = begin();
hit('ash', e); hit('ember', e);
sim.setPlayers([]);
const ties = complete();
assert.deepEqual(ties.map(r => [r.name, r.damage]), [['Ash', 16], ['Ember', 16], ['Idle', 0]], 'disconnected contributors remain');

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
console.log('Fight tally: trusted totals, chip damage, overkill, Finishing Blows, phases, disconnects, a won fight kept and reset passed.');
