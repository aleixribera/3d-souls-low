'use strict';
require('./low-priority.cjs');
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const sim = createSimulation();
const dt = 1 / 60;
function setup() {
  sim.start('arena', 'pillagerCaptain');
  const e = sim.inspect().Game.duel;
  sim.setPlayers(['a', 'b'].map(id => ({ id, x: e.x, y: e.y, z: e.z + 1, hp: 120, state: 'idle' })));
  return e;
}
const claim = (e, id, attack = 'counter', swing = '1') => sim.hit(id, { enemy: e.netId, attack, charge: 0, riposte: true, swing });
{ // Rule 5: the light counter is the only counter, worth about the old heavy counter (36).
  const g = name => sim.inspect().Game.update.constructor(`return ${name}`)();
  const PLAYER_DEF = g('PLAYER_DEF'), makeStrike = g('makeStrike');
  assert.deepEqual(Object.keys(PLAYER_DEF.moveset.counter), ['light'], 'one counter, on light');
  assert.ok(!PLAYER_DEF.moveset.attacks.counterHeavy, 'the rising cut is gone');
  const dmg = makeStrike(PLAYER_DEF.moveset.attacks.counter, true, 0).damage;
  assert.ok(dmg >= 34 && dmg <= 38, `the counter deals about 36 (${dmg})`);
}
for (const index of [0, 1, 2]) {
  const e = setup(), a = e.def.attacks.find(a => a.hits.length === 3 && !a.noParry);
  e.beginAttack(a); e.hitIndex = index; sim.tick(dt);
  assert.equal(sim.parry('a', { enemy: e.netId, serial: e.netAttack, hit: index }), true);
  assert.equal(claim(e, 'a'), true);
  assert.equal(e.cracks, 1, `deflect hit ${index + 1} opens the counter`);
  assert.equal(e.state, 'parried', 'counter stops the string');
  assert.equal(e.hitbox, null);
  assert.equal(e.parriedFor, 0.5);
  for (let i = 0; i < 29; i++) sim.tick(dt);
  assert.equal(e.state, 'parried', 'reel lasts about half a second');
  for (let i = 0; i < 3; i++) sim.tick(dt);
  assert.notEqual(e.state, 'parried', 'boss resumes after reel');
}
{
  const e = setup(), a = e.def.attacks.find(a => a.hits.length === 3 && !a.noParry);
  e.beginAttack(a); sim.tick(dt);
  for (const id of ['a', 'b']) assert.ok(sim.parry(id, { enemy: e.netId, serial: e.netAttack, hit: 0 }));
  claim(e, 'a', 'heavy'); assert.equal(e.cracks, 0, 'heavy cannot claim a counter bonus');
  claim(e, 'a'); claim(e, 'b');
  assert.equal(e.cracks, 2, 'both players can counter one string without a cooldown');
  claim(e, 'a'); assert.equal(e.cracks, 2, 'repeated contact cannot create a third crack');
  for (let i = 0; i < 30; i++) sim.tick(dt); // refill the contact budget after the duplicate probe
  e.beginAttack(a); sim.tick(dt);
  assert.ok(sim.parry('a', { enemy: e.netId, serial: e.netAttack, hit: 0 }));
  assert.ok(claim(e, 'a', 'counter', '2'));
  assert.equal(e.state, 'executed', 'third accepted counter grants the Finishing Blow');
}
for (const kind of ['parry', 'dodged']) {
  const e = setup(), a = e.def.attacks.find(a => a.hits.length === 3 && !a.noParry);
  e.beginAttack(a); sim.tick(dt);
  const msg = { enemy: e.netId, serial: e.netAttack, hit: 0 };
  if (kind === 'dodged') sim.setPlayers([{ id: 'a', x: e.x, y: e.y, z: e.z + 1, hp: 120, state: 'roll' }]);
  assert.ok(sim[kind]('a', msg));
  assert.ok(claim(e, 'a'));
  sim.tick(dt);
  assert.equal(sim[kind]('a', msg), false, `${kind}: the same defence cannot refresh an opening`);
  claim(e, 'a', 'counter', '2');
  assert.equal(e.cracks, 1, `${kind}: repeated defence cannot award a second crack`);
}
// Exercise the real combat resolver and Enemy.takeHit together: a contact captured before a counter must be
// canceled before player damage, but an ordinary swing must still trade. No renderer is required.
{
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  for (const riposte of [false, true]) {
    const e = setup(), { CONFIG } = sim.inspect(), kit = {}, a = e.def.attacks.find(a => a.hits.length === 3);
    e.beginAttack(a); e.state = 'active';
    const payload = { attackId: riposte ? 'counter' : 'light', damage: 1, poise: 0, knock: 0, hitstop: 0, riposte };
    const box = (owner, strike) => ({ owner, payload: strike, overlaps: () => true, markHit() {}, center: () => ({ x: e.x, y: e.y + 1, z: e.z }) });
    const p = { id: 'a', x: e.x, y: e.y, z: e.z + 1, height: 2, hp: 120, deflect: 0, kit,
      alive: () => true, invulnerable: () => false, takeHit() { this.hp -= 10; return {}; }, openCounter() {} };
    p.hitbox = box(p, payload); e.hitbox = box(e, { ...payload, riposte: false });
    const game = { player: p, enemies: [e], hitstop: 0 };
    const context = { CONFIG, NO_KIT: kit, game, gateBetween: () => false, abilityStrike: (k, perk, foe, s) => s,
      events: { emit() {} }, abilityReport() {}, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
      finisher: { start() {} }, PS: { ROLL: 'roll' } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/combat.js'), 'utf8') + '\nresolveCombat(game);', context);
    assert.equal(p.hp, riposte ? 120 : 110, riposte ? 'counter cancels same-step enemy damage' : 'ordinary simultaneous hits still trade');
  }
}
console.log('Counters: deflects, interruption, heavy rejection, party finishers, duplicate defences and same-step trades passed.');
