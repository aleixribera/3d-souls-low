'use strict';
// ============================================================================
// Level 11: Aurel in Ash, Oswin, the First Crown and the Cinderfolk (v7.46.0)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Aurel in Ash')`.
(function () {
  const A = window.__arena, { Game, ES } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('aurel-in-ash'); Game.loading = 0; sim.begin(); };
  const oswin = () => Game.enemies.find(e => e.baseDef.id === 'oswin');
  test('Aurel in Ash: Level 11 follows Aurel, as chapter 11 of the Story', () => {
    expect.ok(A.LEVELS[A.LEVELS.indexOf(A.LEVEL_11) - 1].id === 'aurel', 'listed after Aurel');
    expect.ok(A.STORY.chapters[10].level === 'aurel-in-ash' && A.STORY.chapters[10].title === 'AUREL IN ASH', 'chapter 11 of the Story');
    expect.ok(A.LEVEL_10.next === 'aurel-in-ash', 'the Levels menu carries on from Aurel too');
  });
  test('Aurel in Ash: Oswin keeps Godfrey\'s engineering under new names, within the boss rules', () => {
    const d = A.ENEMY_BY_ID.oswin, ids = new Set(d.attacks.map(a => a.id)), G = GODFREY;
    expect.ok(d.attacks.length === G.attacks.length, `every move carried over (${d.attacks.length} of ${G.attacks.length})`);
    for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`);
    for (const P of Object.values(d.phases)) for (const id of P.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    const U = d.phases.uncrowned;
    expect.ok(U.at === 0.4 && U.opener === 'crownCastDown' && U.ignite && U.conceal.join() === 'weapon' && U.name === 'Oswin, Uncrowned',
      'at 40% he casts the axe down and the Ember takes his hands');
    expect.ok(d.attacks.find(a => a.id === 'crownCastDown').invulnerable, 'he cannot be hurt through the change');
    expect.ok(!/Godfrey|Loux|Serosh|Elden|Hoarah|Erdtree/.test(JSON.stringify(d.attacks.map(a => a.name)) + JSON.stringify(Object.values(d.phases).map(p => p.name || '')) + d.name + d.description),
      'no names of the old road');
    expect.ok(BOSS_FX.oswin && BOSS_FX.oswin.phases.uncrowned === 'fire', 'his effects are written, the Ember\'s fire once uncrowned');
    expect.ok(G.attacks.some(a => a.id === 'seroshShed') && G.name === 'Godfrey, First Elden Lord', 'Godfrey himself is untouched');
  });
  test('Aurel in Ash: Cinderfolk walk the burned city, and nothing of the old road is left in it', () => {
    const ids = new Set([...A.LEVEL_11.gated.flatMap(z => z.enemies.map(m => m.enemy)), ...A.LEVEL_11.dispersed.map(s => s.enemy)]);
    for (const old of ['ashenWarrior', 'leyndellKnight', 'graftedScion', 'godfrey', 'lancer', 'rogue', 'hollow']) expect.ok(!ids.has(old), `no ${old}`);
    expect.ok(ids.has('cinderfolk') && ids.has('oswin'), 'the Cinderfolk and the first king');
    expect.ok(!/Leyndell|Erdtree|Elden|Godfrey|Seren|Hoarah|Lands/.test(JSON.stringify(A.LEVEL_11)), 'no names of the old road');
    expect.ok(!A.LEVEL_11.realm.tree, 'no great tree over the city');
    const C = A.ENEMY_BY_ID.cinderfolk, H = A.ENEMY_BY_ID.hollow;
    expect.ok(C.hp > H.hp && C.speed < H.speed && C.attacks.every(a => a.markers?.length), 'slower than a Hollow, harder to put down; its blows glint');
    start();
    expect.ok(Game.enemies.filter(e => e.baseDef.id === 'cinderfolk').length >= 10, 'Cinderfolk in the streets');
  });
  test('Aurel in Ash: killing Oswin opens the throne and finishes the level', () => {
    start();
    const e = oswin(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-oswin');
    expect.ok(e && zone && !zone.gate.open && !Game.complete, 'shut at first');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }   // the city, won
    sim.place(e.x, e.z - 6, e.y); p.yaw = 0; p.hp = p.maxHp = 1e6; e.wake?.(); sim.step(0.5);
    e.hp = e.def.hp * 0.35; sim.step(0.5); sim.until(() => e.state !== ES.PHASE && e.def.phaseId === 'uncrowned', 12);
    expect.ok(e.def.phaseId === 'uncrowned' && e.def.name === 'Oswin, Uncrowned', `past 40% he is uncrowned (${e.def.phaseId})`);
    for (let i = 0; i < 6 && e.alive(); i++) { e.deplete(); sim.step(1); sim.until(() => e.state !== ES.PHASE && !e.invulnerable(), 20); }
    sim.until(() => Game.complete, 10);
    expect.ok(!e.alive() && zone.gate.open && Game.complete, `gate open, level complete (hp ${Math.round(e.hp)})`);
  });
  test('Aurel in Ash: Level 11 is written in the lore, Ysolde by the first bonfire', () => {
    const L = LORE.levels['aurel-in-ash'];
    expect.ok(L.npcs.length === 1 && L.npcs[0].bonfire === 'cinder-gate' && L.npcs[0].lines.length === 6, 'Ysolde, six lines');
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    const R = terrainFor(A.LEVEL_11);
    for (const I of L.inscriptions.filter(i => i.mount === 'floor')) expect.ok(Math.abs(R.floorY(I.x, I.z, I.y || 0) - (I.y || 0)) < 0.5, `${I.id} stands on the floor`);
  });
})();
