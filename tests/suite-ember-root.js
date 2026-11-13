'use strict';
// ============================================================================
// Level 13: the Root of the Ember, the Kindling Tree and the Rootbound (v7.50.0)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Ember Root')`.
(function () {
  const A = window.__arena, { Game, ES } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('ember-root'); Game.loading = 0; sim.begin(); };
  const tree = () => Game.enemies.find(e => e.baseDef.id === 'kindlingTree');
  const OLD = /Radagon|Golden|Order|Marika|Elden|Erdtree|Zealot|Leyndell|Crucible|Beast|Seren|Lands|Spear|Rune|Teleport|Hammer/i;
  test('Ember Root: Level 13 follows the Torn Abbey, as chapter 13 of the Story', () => {
    expect.ok(A.LEVELS[A.LEVELS.indexOf(A.LEVEL_13) - 1].id === 'torn-abbey', 'listed after the Torn Abbey');
    expect.ok(A.STORY.chapters[12].level === 'ember-root' && A.STORY.chapters[12].title === 'THE ROOT OF THE EMBER', 'chapter 13 of the Story');
    expect.ok(A.LEVEL_12.next === 'ember-root', 'the Levels menu carries on from the Torn Abbey too');
  });
  test('Ember Root: the Kindling Tree keeps Radagon\'s engineering under new names, within the boss rules', () => {
    const d = A.ENEMY_BY_ID.kindlingTree, ids = new Set(d.attacks.map(a => a.id)), R = RADAGON;
    expect.ok(d.attacks.length === R.attacks.length, `every move carried over (${d.attacks.length} of ${R.attacks.length})`);
    for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`);
    for (const P of Object.values(d.phases)) for (const id of P.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    const K = d.phases.kindled;
    expect.ok(K.at === 0.6 && K.opener === 'heartwoodBreaks' && K.name === 'The Kindling Tree, Ablaze' && K.ignite, 'at 60 % it catches');
    expect.ok(!OLD.test(JSON.stringify(d.attacks.map(a => a.name)) + JSON.stringify(Object.values(d.phases).map(p => p.name || '')) + d.name + d.description),
      'no names of the old road');
    expect.ok(d.holyLight && d.holyLight.color !== CONFIG.bossPowers.holy.color, 'its marks burn in the Ember\'s light, not the old gold');
    expect.ok(BOSS_FX.kindlingTree && BOSS_FX.kindlingTree.phases.kindled === 'fire', 'its effects are written, fire once it catches');
    expect.ok(R.name === 'Radagon of the Golden Order' && !R.holyLight && R.attacks.some(a => a.id === 'goldBreaker'), 'Radagon himself is untouched');
  });
  test('Ember Root: Rootbound hold the hollows, and nothing of the old road is left in them', () => {
    const L = A.LEVEL_13, ids = new Set([...L.gated.flatMap(z => z.enemies.map(m => m.enemy)), ...L.dispersed.map(s => s.enemy)]);
    for (const old of ['goldenZealot', 'leyndellKnight', 'crucibleSquire', 'beastman', 'radagon']) expect.ok(!ids.has(old), `no ${old}`);
    expect.ok(ids.has('rootbound') && ids.has('kindlingTree'), 'the Rootbound and the tree');
    expect.ok(!OLD.test(JSON.stringify(L)), 'no names of the old road');
    expect.ok(!L.realm.halos && L.realm.grounds[0].kind === 'emberbark', 'no rings of light; the floor is the root\'s red-gold wood');
    const B = A.ENEMY_BY_ID.rootbound;
    expect.ok(!OLD.test(B.name + B.description + JSON.stringify(B.attacks.map(a => a.name))) && B.attacks.every(a => /^root/.test(a.id)), 'the Rootbound\'s own names');
    expect.ok(ZEALOT_MOVES.attacks.every(a => /^gz/.test(a.id)), 'the Golden Zealot\'s moves themselves are untouched');
    start();
    expect.ok(Game.enemies.filter(e => e.baseDef.id === 'rootbound').length >= 6, 'Rootbound in the hollows');
  });
  test('Ember Root: killing the Kindling Tree opens the heartwood and finishes the level', () => {
    start();
    const e = tree(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-tree');
    expect.ok(e && zone && !zone.gate.open && !Game.complete, 'shut at first');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }   // the root, won
    sim.place(e.x - 6, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.(); sim.step(0.5);
    e.hp = e.def.hp * 0.55; sim.step(0.5); sim.until(() => e.state !== ES.PHASE && e.def.phaseId === 'kindled', 12);
    expect.ok(e.def.phaseId === 'kindled' && e.def.name === 'The Kindling Tree, Ablaze', `past 60 % it is ablaze (${e.def.phaseId})`);
    for (let i = 0; i < 6 && e.alive(); i++) { e.deplete(); sim.step(1); sim.until(() => e.state !== ES.PHASE && !e.invulnerable(), 20); }
    sim.until(() => Game.complete, 10);
    expect.ok(!e.alive() && zone.gate.open && Game.complete, `gate open, level complete (hp ${Math.round(e.hp)})`);
  });
  test('Ember Root: Level 13 is written in the lore, Ysolde by the first bonfire', () => {
    const L = LORE.levels['ember-root'];
    expect.ok(L.npcs.length === 1 && L.npcs[0].bonfire === 'root-first' && L.npcs[0].lines.length === 6, 'Ysolde, six lines');
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    const R = terrainFor(A.LEVEL_13);
    for (const I of L.inscriptions.filter(i => i.mount === 'floor')) expect.ok(Math.abs(R.floorY(I.x, I.z, I.y || 0) - (I.y || 0)) < 0.5, `${I.id} stands on the floor`);
  });
})();
