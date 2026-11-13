'use strict';
// A boss fights the group (CONFIG.aggro, v7.35.0), in the headless server simulation: it turns on whoever hurt it most
// lately, on anyone drinking a flask, else on the closest, holding each target a while; with players bunched round it,
// its area attacks come more often. Then three bots fight bosses: each boss changes target and hits every bot.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');

const RULE = { hold: 3, memory: 8, areaWidth: 4.5 };   // CONFIG.aggro, as tuned in v7.35.0
const STEP = 1 / 60;

// The rule, with three people held at fixed offsets from the boss (players' health is their own client's, so these
// stand-ins never fall): p0 2 m away, p1 4 m, p2 8 m.
{
  const sim = createSimulation(); sim.start('arena', 'pillagerCaptain');
  const { Game } = sim.inspect(), e = Game.enemies.find(e => e.isBoss());
  const at = { p0: 2, p1: 4, p2: 8 }, side = { p0: 0, p1: 2.1, p2: 4.2 }, state = { p0: 'idle', p1: 'idle', p2: 'idle' };
  const place = () => sim.setPlayers(Object.keys(at).map(id => ({ id, x: e.x + Math.sin(side[id]) * at[id], y: e.y, z: e.z + Math.cos(side[id]) * at[id],
    yaw: 0, hp: 100, state: state[id], stateTime: 0, grounded: true })));
  const run = s => { for (let i = 0; i < s * 60; i++) { place(); sim.tick(STEP); } };
  // Waits (at most `s` s) for the boss to stand between attacks, then reads its target.
  const settle = (s = 6) => { for (let i = 0; i < s * 60 && e.in('attacking'); i++) { place(); sim.tick(STEP); } return e.netTarget; };
  run(1);
  assert.equal(settle(), 'p0', 'nobody has hurt it: the closest');
  assert.ok(e.grouped, 'p0 and p1 stand within its crowd range');
  // p1 keeps landing blows (a light attack every 0.5 s): it turns on p1 between two of its attacks, after the hold.
  let landed = 0;
  for (let i = 0; i < 24 && e.netTarget !== 'p1'; i++) { place(); if (sim.hit('p1', { enemy: e.netId, attack: 'light', charge: 0 })) landed++; run(0.5); }
  assert.equal(e.netTarget, 'p1', `the one who hurt it most lately (${landed} blows landed)`);
  assert.ok(landed >= 2, `it needs more than one blow to turn (${landed})`);
  // p2, far off, drinks a flask: it turns at once, hold or not.
  state.p2 = 'useItem'; run(0.1);
  assert.equal(settle(), 'p2', 'a drinker draws it');
  // Nobody hurts it for a while and nobody drinks: back to the closest.
  state.p2 = 'idle'; run(RULE.memory * 4);
  assert.equal(settle(), 'p0', 'the old blows have faded: the closest again');
  // Alone, nothing changes: the one player, never grouped.
  for (let i = 0; i < 120; i++) { sim.setPlayers([{ id: 'p0', x: e.x + 2, y: e.y, z: e.z, yaw: 0, hp: 100, state: 'idle', stateTime: 0, grounded: true }]); sim.tick(STEP); }
  assert.equal(e.netTarget, 'p0'); assert.equal(e.grouped, false, 'one player is never a group');
  console.log('rule: closest, then the striker, then the drinker, then the closest again; alone, unchanged');
}

// Three bots against bosses: each fight sees the boss change target at least twice and turn on every bot, and most
// of them get hit (since pass 32 a careful bot can go a whole fight unscratched). The boss's
// bar is topped up past half so a quick win doesn't end the fight before everyone has been in it. The fights are seeded
// (`createSimulation({ seed })`), so they replay the same way every run.
const lines = [];
for (const boss of ['pillagerCaptain', 'bellWarden', 'ostrey']) {
  const sim = createSimulation({ seed: 7 }); for (let i = 0; i < 3; i++) sim.addBot();
  sim.start('arena', boss); sim.setPlayers([]);
  const { Game, players } = sim.inspect(), e = Game.enemies.find(e => e.isBoss());
  const best = players.map(p => p.hp), hit = new Set(), targeted = new Set();
  let last = null, switches = 0, serial = 0, area = 0, attacks = 0, t = 0;
  for (; t < 240 * 60 && e.alive() && !sim.botsDown(); t++) {
    sim.setPlayers([]); sim.tick(STEP);
    if (e.hp < e.def.hp * 0.5) e.hp = e.def.hp * 0.8;
    if (e.netTarget && e.netTarget !== last) { if (last) switches++; last = e.netTarget; targeted.add(last); }
    players.forEach((p, i) => { if (p.hp < best[i]) hit.add(i); best[i] = Math.max(best[i], p.hp); });
    if (e.netAttack !== serial) { serial = e.netAttack; attacks++; if (e.attack && e.attack.hits.some(h => { const b = h.box || e.attack.box; return b && (b.ring || b.w >= RULE.areaWidth); })) area++; }
    if (switches >= 2 && targeted.size === 3 && hit.size >= 2) break;
  }
  lines.push(`${boss.padEnd(16)} ${(t / 60).toFixed(0)} s: ${switches} target changes, ${targeted.size}/3 bots targeted, ${hit.size}/3 bots hit, ${area}/${attacks} area attacks`);
  assert.ok(switches >= 2, `${boss}: changed target ${switches} times`);
  assert.equal(targeted.size, 3, `${boss}: turned on ${targeted.size} of 3 bots`);
  assert.ok(hit.size >= 2, `${boss}: hit ${hit.size} of 3 bots`);
}
console.log(lines.join('\n'));
console.log('boss attention: ok');
