'use strict';
// The kept rares (pass 119, design/abilities BUILD-ORDER batch 4): Counterstep's flash step behind the boss (its arc,
// its cooldown, a wall refusing it, the longer counter once a cooldown), Opportunist on a cracked
// guard, and the rares' cues told to their holder (Vengeance armed, Bloodthirst's motes, Last Breath).
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();
const near = (a, b, what, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);

const sim = createSimulation({ seed: 11 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), PS = g('PS'), ES = g('ES');
const e = sim.inspect().Game.enemies[0], perks = [];
g('events').on('abilityPerk', ev => perks.push(ev));
const holder = (ids, dz = 1.5) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const v = id => BY[id].levels[0];
const told = (p, perk) => perks.filter(d => d.body === p && d.perk === perk);

// ---- Counterstep: the step round the boss's back ----
{
  const F = CONFIG.abilities.flashBehind;
  e.yaw = 0; e.state = ES.IDLE;   // facing +z, the player in front of it
  const p = holder(['counterstep']);
  assert.ok(p.flashBehind(e), 'a step from in front of the boss');
  assert.ok(p.invulnerable(), 'untouchable while it steps');
  const ev = told(p, 'dodge/flashBehind')[0];
  assert.ok(ev && ev.target === e && ev.from && ev.to, 'told with where it starts and lands');
  for (let i = 0; i < 30 && p.blink; i++) p.update(1 / 60);
  assert.equal(p.blink, null, 'over within its time');
  const back = Math.hypot(p.x - e.x, p.z - e.z), want = (e.radius || 0.6) + F.gap + p.radius;
  near(back, want, 'lands its gap behind the body', 1e-3);
  assert.ok(p.z < e.z, `behind the boss (z ${p.z.toFixed(2)} < ${e.z.toFixed(2)})`);
  near(Math.atan2(e.x - p.x, e.z - p.z), p.yaw, 'facing its back', 1e-3);

  const far = holder(['counterstep'], F.range + 2);
  assert.equal(far.flashBehind(e), false, 'out of range: no step');
}
// ---- Counterstep through a perfect dodge: the cooldown and the longer counter, alone and on the server ----
{
  const perfectDodge = g('perfectDodge'), S = v('counterstep');
  const p = holder(['counterstep']);
  const hb = { owner: e, payload: { damage: 1 }, markHit() {}, dodged: false };
  perfectDodge(p, hb);
  near(p.perk.step, S.cooldown, 'its cooldown starts');
  assert.ok(p.riposte >= S.window - 1e-9, 'the counter as long as its window');
  const steps = told(p, 'dodge/flashBehind').length;
  for (let i = 0; i < 30 && p.blink; i++) p.update(1 / 60);
  perfectDodge(p, { ...hb, dodged: false });
  assert.equal(told(p, 'dodge/flashBehind').length, steps, 'no second step on cooldown');
}
// ---- Opportunist: a cracked guard, not a boss off balance ----
{
  const p = holder(['opportunist']), strike = { attackId: 'light', damage: 20, poise: 0, knock: 0, hitstop: 0 };
  e.cracks = 0; e.state = ES.PARRIED;
  assert.equal(g('abilityStrike')(p.kit, p.perk, e, strike), strike, 'off balance alone: nothing');
  e.state = ES.IDLE; e.cracks = 1;
  const s = g('abilityStrike')(p.kit, p.perk, e, strike);
  near(s.damage, 20 * (1 + v('opportunist').damage), 'a cracked guard: more'); assert.equal(s.cracked, true);
  e.cracks = 0;
}
// ---- The cues told to their holder ----
{
  perks.length = 0;
  const p = holder(['vengeance', 'bloodthirst']), hits = v('bloodthirst').hits;
  g('abilityLanded')(p, { damage: 10 });
  assert.equal(told(p, 'streak/step').length, 1, 'Bloodthirst: a mote for a blow');
  assert.equal(told(p, 'streak/step')[0].n, 1, 'counted');
  g('abilityHurt')(p.kit, p.perk, p);
  assert.equal(told(p, 'streak/lost').length, 1, 'a hurt scatters the motes');
  assert.equal(told(p, 'hurt/armed').length, 1, 'Vengeance armed');
  for (let i = 0; i < hits; i++) g('abilityLanded')(p, { damage: 10 });
  assert.equal(told(p, 'streak/heal').length, 1, 'the streak heals');
  assert.equal(told(p, 'streak/step').length, hits, 'a mote for each blow but the last');

  const breath = holder(['last-breath']), B = v('last-breath');
  breath.hp = breath.maxHp * B.below * 0.5; breath.abilityStep(1 / 60);
  assert.equal(told(breath, 'low/freeDash').length, 1, 'Last Breath: told as it enters its band');
  breath.abilityStep(1 / 60);
  assert.equal(told(breath, 'low/freeDash').length, 1, 'once');
}
console.log('RARE PERKS: Counterstep steps behind the boss (arc, gap, facing, range, cooldown, the longer counter), Opportunist on a cracked guard, the rares\' cues to their holder passed.');
