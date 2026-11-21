'use strict';
// Story's placements (pass 163, the Story audit, docs/story/audit.md): on every chapter of the road, everything a
// player must reach stands on a floor, and every fight can be won from where its zone counts the player.
//  - The start, each bonfire and its respawn, each flask found and the given ability's place have a floor under them.
//  - A zone counts the player inside its trigger only on its first member's floor (Game.updateLevel): every member
//    stands on that floor. (The Torn Abbey's Undead Knight stood on the crumbling colonnade, 8 m over the undercroft
//    it guards: a player who dropped off the colonnade's open side before the floor fell was shut in the undercroft
//    with its gate closed and the knight out of reach.)
//  - No enemy stands on a trap's floor: the floor falls from under it, or, never sprung, leaves it out of reach.
// The walk itself (routes, gates, saves, the exit) is tools/story-audit.cjs, in the page.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const sim = createSimulation(), g = name => sim.inspect().Game.update.constructor('return ' + name)();
const STORY = g('STORY'), ALL_LEVELS = g('ALL_LEVELS'), terrainFor = g('terrainFor'), CONFIG = g('CONFIG'), inRect = g('inRect');
const reach = CONFIG.height.reach, problems = [];
const centre = r => Array.isArray(r[0]) ? centre(r[0]) : { x: (r[0] + r[1]) / 2, z: (r[2] + r[3]) / 2 };
for (const { level } of STORY.chapters) {
  const L = ALL_LEVELS.find(l => l.id === level);
  if (L.layout !== 'rooms') continue;   // the hall is one flat floor
  const T = terrainFor(L), floor = (x, z, y) => T.floorY(x, z, y === undefined ? Infinity : y + 0.5);
  const has = (what, x, z, y) => { const f = floor(x, z, y); if (!Number.isFinite(f) || f < T.killY) problems.push(`${level}: ${what} has no floor at (${x}, ${z})`); return f; };
  has('the start', L.start.x, L.start.z, L.start.y);
  for (const b of L.bonfires || []) { has(`bonfire ${b.id}`, b.x, b.z, b.y); if (b.spawn) has(`bonfire ${b.id}'s respawn`, b.spawn.x, b.spawn.z, b.spawn.y); }
  for (const f of L.flaskFinds || []) has(`flask ${f.id}`, f.x, f.z, f.y);
  if (L.giveAbility) { const c = centre(L.giveAbility.trigger); has(`the ${L.giveAbility.id} gift`, c.x, c.z, L.giveAbility.y); }
  const enemies = [];
  for (const z of L.gated || []) {
    const members = (z.enemies || [{ enemy: z.enemy, spawn: z.spawn }]).map(m => ({ ...m, ...m.spawn }));
    const ys = members.map(m => has(`${m.enemy} of ${z.id}`, m.x, m.z, m.y));
    for (const [i, m] of members.entries()) {
      if (Math.abs(ys[i] - ys[0]) > reach) problems.push(`${level}: ${z.id} counts the player at y ${ys[0]}, but its ${m.enemy} stands at y ${ys[i]}`);
      enemies.push({ id: `${m.enemy} of ${z.id}`, x: m.x, z: m.z, y: ys[i] });
    }
  }
  for (const d of L.dispersed || []) if (Number.isFinite(d.x)) enemies.push({ id: d.enemy, x: d.x, z: d.z, y: floor(d.x, d.z, d.y) });
  for (const t of L.traps || []) for (const e of enemies)
    if (inRect(t.collapse, e.x, e.z) && Math.abs(e.y - (t.y ?? 0)) < CONFIG.height.stepUp) problems.push(`${level}: ${e.id} stands on trap ${t.id}'s floor`);
}
assert.deepEqual(problems, [], `Story placements:\n  ${problems.join('\n  ')}`);

// A gate in an open place has no lintel hanging over it and lifts out of sight (gateWalled, js/scene.js): the Night
// Gaol's cells, the Root's courts and the Mere's fork stand open at their ends; the Sunken Keep's doors are in walls.
const gateWalled = g('gateWalled'), gatedEntries = g('gatedEntries');
const walled = (level, id) => {
  const L = ALL_LEVELS.find(l => l.id === level), T = terrainFor(L), G = gatedEntries(L).find(z => z.id === id).gate;
  return gateWalled(T, G, T.floorY(G.x, G.z, G.y === undefined ? Infinity : G.y + 0.5), L.gateHeight);
};
for (const [level, id] of [['night-gaol', 'zone-cell1'], ['ember-root', 'zone-ember'], ['still-mere', 'zone-fork'], ['torn-abbey', 'zone-steps'], ['the-tower', 'zone-bell']])
  assert.equal(walled(level, id), false, `${level} ${id} stands open: no lintel`);
for (const [level, id] of [['sunken-keep', 'zone-cistern'], ['saltgrave', 'zone-yard'], ['aurel', 'zone-avenue'], ['torn-abbey', 'zone-undercroft']])
  assert.equal(walled(level, id), true, `${level} ${id} stands in a wall: its lintel joins it`);
// (pass 167) A walled portcullis that would stand over the walls beside it once lifted lifts out of sight too
// (gateLiftsAway): the Sunken Keep's doors, the Tower's postern and Saltgrave's rampart showed their bars over the walls.
const gateLiftsAway = g('gateLiftsAway');
const away = (level, id) => {
  const L = ALL_LEVELS.find(l => l.id === level), T = terrainFor(L), G = gatedEntries(L).find(z => z.id === id).gate;
  return gateLiftsAway(T, G, T.floorY(G.x, G.z, G.y === undefined ? Infinity : G.y + 0.5), L.gateHeight);
};
for (const [level, id] of [['sunken-keep', 'zone-cistern'], ['the-tower', 'postern'], ['saltgrave', 'zone-rampart'], ['night-gaol', 'zone-cell1']])
  assert.equal(away(level, id), true, `${level} ${id} lifts out of sight`);
for (const [level, id] of [['aurel', 'zone-avenue'], ['torn-abbey', 'zone-undercroft'], ['saltgrave', 'zone-yard']])
  assert.equal(away(level, id), false, `${level} ${id} stays lifted in its doorway, under its wall's top`);
console.log(`story placements: ${STORY.chapters.length} chapters ok`);
