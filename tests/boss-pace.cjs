'use strict';
// Pace, not team size (v7.65.0, CONFIG.pace), in the headless server simulation:
// - every boss is the same for one player and for four: health, posture bar and break length;
// - Boss Rush's curve at fights 0, 5, 10, 20 and 40 raises only the pace, never health or damage;
// - a faster pace means more attacks a minute; wind-ups barely change by fight 10 and stay above
//   CONFIG.pace.tellFloor of their length at fight 40 (every tell stays readable).
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');

// n players in the run, standing at the spawn: client-owned stand-ins the server never wounds.
const party = (n, at) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, x: at.x + i * 0.8, y: at.y, z: at.z, yaw: at.yaw || 0, hp: 100, state: 'idle' }));
function fight(boss, n, won = null) {
  const sim = createSimulation({ seed: 7 }), spawn = sim.start('arena', boss).spawn;
  if (won !== null) sim.setRushFight(won);
  sim.setPlayers(party(n, spawn)); sim.tick(1 / 60);
  const { Game } = sim.inspect();
  return { sim, Game, spawn, e: Game.enemies.find(e => e.isBoss()) };
}
const bars = e => {
  const M = e.def.posture || e.def.stagger || e.def.guard;
  return JSON.stringify({ hp: e.def.hp, now: e.hp, meter: M ? M.max : null, breakTime: M ? M.breakTime : null, damage: e.def.attacks.map(a => a.hits.map(h => h.damage ?? a.damage)) });   // text: each simulation is its own VM
};

// 1 and 4 players face the same boss.
const bosses = createSimulation().catalog().bosses.map(b => b.id);
for (const boss of bosses) {
  const one = bars(fight(boss, 1).e), four = bars(fight(boss, 4).e);
  assert.equal(four, one, `${boss}: four players meet the boss one player does`);
}
console.log(`${bosses.length} bosses: the same health, posture and breaks for 1 and 4 players`);

// The curve: subtle at first, exponential, capped; health and damage never move.
const P = { won: [0, 5, 10, 20, 40], pace: [] };
const plain = bars(fight('ostrey', 1).e);
for (const won of P.won) {
  const { e, sim } = fight('ostrey', 4, won);
  assert.equal(bars(e), plain, `fight ${won}: health and damage are the boss's own`);
  assert.equal(e.pace, sim.setRushFight(won), `fight ${won}: the boss runs at the curve's pace`);
  P.pace.push(e.pace);
}
const base = P.pace[0];
assert.ok(P.pace.every((p, i) => i === 0 || p > P.pace[i - 1]), `the pace rises fight by fight: ${P.pace.map(p => p.toFixed(2)).join(', ')}`);
assert.equal(base, createSimulation().inspect().CONFIG.pace.boss, 'the first fight runs at the base pace, as every boss does outside Boss Rush');
assert.ok(P.pace[1] / base < 1.1 && P.pace[2] / base < 1.25, 'fairly easy at first: under 10% faster by fight 5, 25% by fight 10');
assert.ok(P.pace[3] / base > 1.4 && P.pace[4] / base > 3, 'then genuinely hard: well over 40% by fight 20, three times by fight 40');
console.log('pace at fights ' + P.won.map((w, i) => `${w}: x${P.pace[i].toFixed(2)}`).join(', '));

// What the pace does: more attacks a minute, the same wind-ups. One stand-in in front of the boss for a minute.
function tempo(won) {
  const { sim, Game, e, spawn } = fight('pillagerCaptain', 1, won);
  const windups = new Map();
  let starts = 0, last = null, since = 0;
  for (let t = 0; t < 90; t += 1 / 60) {
    sim.setPlayers(party(1, { ...spawn, x: e.x + 2.2 * Math.sin(e.yaw), z: e.z + 2.2 * Math.cos(e.yaw) }));
    sim.tick(1 / 60);
    const key = e.state === 'windup' ? `${e.netAttack}/${e.hitIndex}` : null;
    if (key && key !== last) { if (e.hitIndex === 0) starts++; since = 0; }
    if (key) since += 1 / 60;
    if (last && key !== last && e.state === 'active') {
      const id = e.attack.id + '/' + e.hitIndex, list = windups.get(id) || []; list.push(since); windups.set(id, list);
    }
    last = key;
    assert.ok(Game.enemies.includes(e) && e.alive(), 'the boss fights on');
  }
  return { starts, windups };
}
const slow = tempo(0), mid = tempo(10), fast = tempo(40);
assert.ok(mid.starts >= slow.starts && fast.starts >= slow.starts * 1.5, `a faster boss attacks more often: ${slow.starts}, ${mid.starts} and ${fast.starts} attacks in 90 s at fights 0, 10 and 40`);
// A wind-up's length (holds and tracking aside): the same move winds up about as long at fight 10 as at fight 0, and
// at fight 40 shorter, but never under the floor.
const mean = list => list.reduce((s, v) => s + v, 0) / list.length, floor = 0.6;   // CONFIG.pace.tellFloor
let compared = 0;
for (const [id, was] of slow.windups) {
  const then = mid.windups.get(id), late = fast.windups.get(id);
  if (!then || !late) continue;
  compared++;
  const a = mean(was), b = mean(then), c = mean(late);
  assert.ok(Math.abs(b - a) < 0.03 + 0.08 * a, `${id}: its wind-up barely changes by fight 10 (${a.toFixed(2)} s, then ${b.toFixed(2)} s)`);
  assert.ok(c < a && c > a * floor - 0.03, `${id}: at fight 40 it is quicker but at least ${floor} of its length (${a.toFixed(2)} s, then ${c.toFixed(2)} s)`);
}
assert.ok(compared >= 2, 'wind-ups compared at every pace');
console.log(`boss-pace: ${slow.starts}, ${mid.starts} and ${fast.starts} attacks in 90 s at fights 0, 10 and 40; ${compared} wind-ups checked: ok`);

// After a break (CONFIG.enemy.postureRest): a boss back on its feet builds posture at `mul` for `time` s, then fully,
// so a party cannot keep it kneeling; the break itself still comes as soon as before.
{
  const { e, sim } = fight('ostrey', 1), R = sim.inspect().CONFIG.enemy.postureRest;
  e.posture = 0; e.sinceBreak = Infinity; e.addPosture(10);
  const fresh = e.posture;
  e.posture = 0; e.sinceBreak = R.time / 2; e.addPosture(10);
  const resting = e.posture;
  e.posture = 0; e.sinceBreak = R.time + 0.1; e.addPosture(10);
  assert.equal(fresh, 10, 'posture builds fully on a boss that has not broken lately');
  assert.ok(Math.abs(resting - 10 * R.mul) < 1e-9, `just after a break it builds at ${R.mul} (${resting})`);
  assert.equal(e.posture, 10, `after ${R.time} s it builds fully again`);
  console.log(`boss-pace: posture after a break builds at ${R.mul} for ${R.time} s: ok`);
}
