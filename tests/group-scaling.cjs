'use strict';
// Group scaling (v7.35.0): every boss's health, posture bar and break length follow CONFIG.group with the number of
// players in the run, in the headless server simulation. Prints each boss's bar and posture at 1, 2, 3 and 4 players.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');

const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);
// n players in the run: fallen ones count too (a death never makes a boss easier), so these stand-ins are down.
const party = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, x: 0, y: 0, z: 0, yaw: 0, hp: 0, state: 'dead' }));
function fight(boss, n) {
  const sim = createSimulation(); sim.start('arena', boss); sim.setPlayers(party(n)); sim.tick(1 / 60);
  const { Game } = sim.inspect(), e = Game.enemies.find(e => e.isBoss());
  return { sim, Game, e };
}

const RULE = { cap: 4, hp: 0.5, posture: 0.3, breakTime: 0.1, leaveDelay: 10 };   // CONFIG.group, as tuned in v7.35.0
const bosses = createSimulation().catalog().bosses.map(b => b.id);
const lines = [];
for (const boss of bosses) {
  const solo = fight(boss, 1).e, row = [];
  assert.equal(solo.def, solo.plainDef, `${boss}: one player keeps its own def`);
  for (let n = 1; n <= RULE.cap + 1; n++) {
    const { e } = fight(boss, n), k = Math.min(n, RULE.cap) - 1, plain = e.plainDef;
    assert.equal(e.group, Math.min(n, RULE.cap), `${boss}: scaled for ${n} players`);
    near(e.def.hp, plain.hp * (1 + RULE.hp * k), `${boss} hp at ${n}`);
    near(e.hp, e.def.hp, `${boss} starts with a full bar at ${n}`);
    const M = plain.posture || plain.stagger, S = e.def.posture || e.def.stagger;
    if (M) {
      near(S.max, M.max * (1 + RULE.posture * k), `${boss} posture at ${n}`);
      near(S.breakTime, M.breakTime * (1 - RULE.breakTime * k), `${boss} break at ${n}`);
      assert.equal(S.parry, M.parry, `${boss}: a parry's posture damage is the same`);
    }
    if (n <= RULE.cap) row.push(`${n}p ${Math.round(e.def.hp)} hp / ${M ? Math.round(S.max) : '-'} posture / ${M ? S.breakTime.toFixed(2) : '-'} s`);
  }
  lines.push(`${boss.padEnd(18)} ${row.join(' | ')}`);
}
console.log(lines.join('\n'));

// Someone joins mid-fight: the boss keeps its share of health and posture; someone leaves: the same.
{
  const { sim, e } = fight('giant', 2);
  e.hp = e.def.hp * 0.4; e.posture = e.def.posture.max * 0.5;
  sim.setPlayers(party(3)); sim.tick(1 / 60);
  assert.equal(e.group, 3);
  near(e.hp / e.def.hp, 0.4, 'health share after a join'); near(e.posture / e.def.posture.max, 0.5, 'posture share after a join');
  // A drop shorter than CONFIG.group.leaveDelay (a stall, another tab) changes nothing; a longer one shrinks it.
  for (let i = 0; i < 60 * (RULE.leaveDelay - 1); i++) { sim.setPlayers(party(1)); sim.tick(1 / 60); }
  assert.equal(e.group, 3, 'a short drop keeps the group');
  for (let i = 0; i < 60 * 2; i++) { sim.setPlayers(party(1)); sim.tick(1 / 60); }
  assert.equal(e.def, e.plainDef, 'back to its solo def');
  near(e.hp / e.def.hp, 0.4, 'health share after a leave');
}
// A phase change keeps the group: the next bar is scaled too.
{
  const phased = bosses.find(id => { const { e } = fight(id, 1); return e.phaseIds && e.phaseIds.length > 1 && !e.baseDef.phases[e.phaseIds[1]].at; });
  assert.ok(phased, 'a boss with a refilled second phase');
  const { e } = fight(phased, 3);
  e.enterPhase(1);
  near(e.def.hp, e.plainDef.hp * (1 + RULE.hp * 2), `${phased}'s second bar at 3 players`);
  console.log(`${phased}: phase 2 bar ${Math.round(e.plainDef.hp)} solo, ${Math.round(e.def.hp)} at 3 players`);
}
// The opt-in override: a def's groupScale replaces the rule's numbers, and false keeps it solo.
{
  // Each simulation has its own copy of the data, so each gets its own override (giant has no phases: plainDef is its def).
  const { sim, e } = fight('giant', 1), def = e.baseDef;
  def.groupScale = { hp: 0.25 };
  sim.setPlayers(party(3)); sim.tick(1 / 60);
  near(e.def.hp, def.hp * 1.5, 'override hp'); near(e.def.posture.max, def.posture.max * (1 + RULE.posture * 2), 'rule posture under an hp-only override');
  const off = fight('giant', 1);
  off.e.baseDef.groupScale = false;
  off.sim.setPlayers(party(4)); off.sim.tick(1 / 60);
  assert.equal(off.e.def, off.e.plainDef, 'groupScale: false keeps its solo def');
}
console.log(`group-scaling: ${bosses.length} bosses at 1-5 players, joins, phases and overrides: ok`);
