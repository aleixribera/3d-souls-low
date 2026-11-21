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
// (pass 172) Set pieces in the chapters stand clear of what a player must reach or fight beside: no prop's box over a
// spawn, a bonfire or its respawn, a flask, a lamp or a pillar, and none in a gate's doorway.
const propBoxes = g('propBoxes'), gatedAll = L => [...gatedEntries(L).map(z => z.gate), ...(L.sealed || []).map(s => s.gate)];
const clear = [];
for (const { level } of STORY.chapters) {
  const L = ALL_LEVELS.find(l => l.id === level);
  if (!L.props) continue;
  const T = terrainFor(L), spots = [];
  const spot = (what, x, z, r = 0.8) => Number.isFinite(x) && spots.push({ what, x, z, r });
  for (const z of L.gated || []) for (const m of z.enemies || []) spot(`${m.enemy} of ${z.id}`, m.spawn.x, m.spawn.z, 1);
  for (const d of L.dispersed || []) spot(d.enemy, d.x, d.z, 1);
  for (const b of L.bonfires || []) { spot(`bonfire ${b.id}`, b.x, b.z, 1.2); if (b.spawn) spot(`${b.id}'s respawn`, b.spawn.x, b.spawn.z); }
  for (const f of L.flaskFinds || []) spot(`flask ${f.id}`, f.x, f.z);
  for (const R of L.rooms || []) for (const [x, z] of [...(R.lamps || []), ...(R.pillars || []), ...(R.braziers || [])]) spot(`${R.id}'s lamp or pillar`, x, z, 0.7);
  for (const G of gatedAll(L)) { const w = G.width / 2 + 0.5; spots.push({ what: 'a gate', box: G.along === 'x' ? [G.x - w, G.x + w, G.z - 1, G.z + 1] : [G.x - 1, G.x + 1, G.z - w, G.z + w] }); }
  for (const P of L.props) for (const b of propBoxes(P, T.floorY(P.x, P.z, P.y === undefined ? Infinity : P.y + 0.5))) for (const s of spots) {
    const hit = s.box ? b.x0 < s.box[1] && b.x1 > s.box[0] && b.z0 < s.box[3] && b.z1 > s.box[2]
      : s.x > b.x0 - s.r && s.x < b.x1 + s.r && s.z > b.z0 - s.r && s.z < b.z1 + s.r;
    if (hit) clear.push(`${level}: the ${P.kind} at (${P.x}, ${P.z}) stands on ${s.what}`);
  }
}
assert.deepEqual([...new Set(clear)], [], `Story set pieces:\n  ${[...new Set(clear)].join('\n  ')}`);
assert.ok(ALL_LEVELS.find(l => l.id === 'final-castle').props.filter(p => p.kind === 'gibbet').length >= 4 &&
  ALL_LEVELS.find(l => l.id === 'saltgrave').props.some(p => p.kind === 'rack'), 'the field has its gibbets, Saltgrave its racks');

// (pass 172) The castle set pieces' Blender meshes (tools/blender/castle_bits.py, packed): every piece the drawing hangs,
// in budget, and none inside out (each triangle's winding agrees with its stored normals; the game culls back faces).
{
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const ctx = { BAKED: undefined }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/baked/castle-bits.js'), 'utf8'), ctx);
  const bytes = b64 => new Uint8Array(Buffer.from(b64, 'base64'));
  let tris = 0;
  for (const n of ['gibbet__stone', 'gibbet__wood', 'gibbet__iron', 'rack__wood', 'rack__iron'].map(p => 'castle-bits:' + p)) {
    const B = ctx.BAKED[n]; assert.ok(B, n);
    const raw = new Int16Array(bytes(B.p).buffer), nor = new Int8Array(bytes(B.q).buffer);
    const idx = B.wide ? new Uint32Array(bytes(B.i).buffer) : new Uint16Array(bytes(B.i).buffer);
    const P = i => [0, 1, 2].map(k => B.min[k] + (raw[i * 3 + k] + 32767) / 65534 * B.span[k]);
    let agree = 0;
    for (let t = 0; t < idx.length; t += 3) {
      const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]].map(P), u = [0, 1, 2].map(k => b[k] - a[k]), w = [0, 1, 2].map(k => c[k] - a[k]);
      const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const m = [0, 1, 2].map(k => nor[idx[t] * 3 + k] + nor[idx[t + 1] * 3 + k] + nor[idx[t + 2] * 3 + k]);
      if (f[0] * m[0] + f[1] * m[1] + f[2] * m[2] >= 0) agree++;
    }
    tris += idx.length / 3;
    assert.ok(agree >= 0.95 * idx.length / 3, `${n}: its triangles face out (${agree} of ${idx.length / 3})`);
  }
  assert.ok(tris <= 1200, `castle-bits: ${tris} triangles, at most 1,200`);
}
console.log(`story placements: ${STORY.chapters.length} chapters ok`);
