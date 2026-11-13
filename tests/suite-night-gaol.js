'use strict';
// ============================================================================
// Level 9: the Night Gaol, the Ringer of Thrale and the Keyless (v7.42.0)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Night Gaol')`.
(function () {
  const A = window.__arena, { Game, ES } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('night-gaol'); Game.loading = 0; sim.begin(); };
  const ringer = () => Game.enemies.find(e => e.baseDef.id === 'ringer');
  test('Night Gaol: Level 9 follows Saltgrave, as chapter 9 of the Story', () => {
    expect.ok(A.LEVELS[A.LEVELS.indexOf(A.LEVEL_9) - 1].id === 'saltgrave', 'listed after Saltgrave');
    expect.ok(A.STORY.chapters[8].level === 'night-gaol' && A.STORY.chapters[8].title === 'THE NIGHT GAOL', 'chapter 9 of the Story');
    expect.ok(A.LEVEL_8.next === 'night-gaol', 'the Levels menu carries on from Saltgrave too');
  });
  test('Night Gaol: the Ringer keeps the Crucible Knight\'s engineering, within the boss rules, with no shield and no aspects', () => {
    const d = A.ENEMY_BY_ID.ringer, ids = new Set(d.attacks.map(a => a.id)), C = CRUCIBLE_KNIGHT;
    for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`);
    expect.ok(d.attacks.every(a => !a.spectral && !a.when?.startsWith('shield')) && !d.guard && !d.offhand, 'no greatshield, no golden wings or tail');
    for (const P of Object.values(d.phases)) for (const id of P.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    const by = id => d.attacks.find(a => a.id === id);
    expect.ok(by('fetterStamp').followUps.map(f => f.attack).join() === 'risingToll,bellFalls,twoTurns', 'the stamp always flows on, as the Crucible stomp');
    expect.ok(by('bellFalls2').followUps.some(f => f.attack === 'knell'), 'in the second phase a finisher rings the knell if you stay close');
    expect.ok(by('knell').hits[0].impact.ring > 0 && by('greatKnell').hits[0].impact.ring > by('knell').hits[0].impact.ring, 'each knell rings out along the floor, the great one wider');
    expect.ok(d.phases.tolling.at === 0.5 && d.phases.tolling.opener === 'cellLeap', 'she rings the blows from half her strength, opening with a leap');
    expect.ok(C.guard && C.attacks.some(a => a.spectral === 'wings'), 'the Crucible Knight himself is untouched');
  });
  test('Night Gaol: the Keyless walk the cells, and nothing of the old road is left in the gaol', () => {
    const ids = new Set([...A.LEVEL_9.gated.flatMap(z => z.enemies.map(m => m.enemy)), ...A.LEVEL_9.dispersed.map(s => s.enemy)]);
    for (const old of ['crucibleSquire', 'omenkin', 'graftedScion', 'crucibleKnight']) expect.ok(!ids.has(old), `no ${old}`);
    expect.ok(ids.has('keyless') && ids.has('ringer'), 'the Keyless and the Ringer');
    expect.ok(!/Crucible|Evergaol|Great Rune|Seren|Golden Order|Stormhill/.test(JSON.stringify(A.LEVEL_9)), 'no names of the old road');
    const K = A.ENEMY_BY_ID.keyless, H = A.ENEMY_BY_ID.hollow;
    expect.ok(K.speed < H.speed && K.poise > H.poise, 'slower in their chains, harder to stagger');
    start();
    expect.ok(Game.enemies.filter(e => e.baseDef.id === 'keyless').length >= 6, 'Keyless in the cells');
  });
  test('Night Gaol: killing the Ringer opens the great ring and finishes the level', () => {
    start();
    const e = ringer(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-ringer');
    expect.ok(e && zone && !zone.gate.open && !Game.complete, 'shut at first');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }   // the cells, won
    sim.place(e.x - 6, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.(); sim.step(0.5);
    e.hp = e.def.hp * 0.45; sim.step(0.5);
    expect.ok(e.def.phaseId === 'tolling', `past half she rings the blows (${e.def.phaseId})`);
    for (let i = 0; i < 4 && e.alive(); i++) { e.deplete(); sim.step(1); sim.until(() => e.state !== ES.PHASE, 20); }
    sim.until(() => Game.complete, 4);
    expect.ok(!e.alive() && zone.gate.open && Game.complete, 'gate open, level complete');
  });
  test('Night Gaol: Level 9 is written in the lore, Ysolde by the first bonfire', () => {
    const L = LORE.levels['night-gaol'];
    expect.ok(L.npcs.length === 1 && L.npcs[0].bonfire === 'night-landing' && L.npcs[0].lines.length === 6, 'Ysolde, six lines');
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    const R = terrainFor(A.LEVEL_9);
    for (const I of L.inscriptions) expect.ok(Math.abs(R.floorY(I.x, I.z, I.y || 0) - (I.y || 0)) < 0.5, `${I.id} stands on the floor`);
  });
})();
