'use strict';
// ============================================================================
// Level 10: Aurel, the Gilded City, the Regent Hollis and the Gilded Thralls (v7.44.0)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Aurel')`.
(function () {
  const A = window.__arena, { Game, ES } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('aurel'); Game.loading = 0; sim.begin(); };
  const hollis = () => Game.enemies.find(e => e.baseDef.id === 'hollis');
  test('Aurel: Level 10 follows the Night Gaol, as chapter 10 of the Story', () => {
    expect.ok(A.LEVELS[A.LEVELS.indexOf(A.LEVEL_10) - 1].id === 'night-gaol', 'listed after the Night Gaol');
    expect.ok(A.STORY.chapters[9].level === 'aurel' && A.STORY.chapters[9].title === 'AUREL, THE GILDED CITY', 'chapter 10 of the Story');
    expect.ok(A.LEVEL_9.next === 'aurel', 'the Levels menu carries on from the Night Gaol too');
  });
  test('Aurel: the Regent keeps Morgott\'s engineering under new names, within the boss rules', () => {
    const d = A.ENEMY_BY_ID.hollis, ids = new Set(d.attacks.map(a => a.id)), M = MORGOTT;
    expect.ok(d.attacks.length === M.attacks.length, `every move carried over (${d.attacks.length} of ${M.attacks.length})`);
    for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`);
    for (const P of Object.values(d.phases)) for (const id of P.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    expect.ok(d.phases.hungry.at === 0.6 && d.phases.hungry.opener === 'hungerShows' && d.phases.hungry.ignite, 'at 60% the hunger shows and his blade burns');
    expect.ok(d.attacks.find(a => a.id === 'hungerShows').invulnerable, 'he cannot be hurt through the change');
    expect.ok(!/Morgott|Omen|Erdsteel|Erdtree|Defilement|[Cc]ursed/.test(JSON.stringify(d.attacks.map(a => a.name)) + d.name + d.description), 'no names of the old road');
    expect.ok(BOSS_FX.hollis && BOSS_FX.hollis.phases.hungry === 'fire', 'his effects are written, the Ember\'s fire in the second phase');
    expect.ok(M.attacks.some(a => a.id === 'defilement') && M.name === 'Morgott, the Omen King', 'Morgott himself is untouched');
  });
  test('Aurel: Gilded Thralls fill the city, and nothing of the old road is left in it', () => {
    const ids = new Set([...A.LEVEL_10.gated.flatMap(z => z.enemies.map(m => m.enemy)), ...A.LEVEL_10.dispersed.map(s => s.enemy)]);
    for (const old of ['leyndellKnight', 'crucibleSquire', 'omenkin', 'morgott', 'lancer']) expect.ok(!ids.has(old), `no ${old}`);
    expect.ok(ids.has('gildedThrall') && ids.has('hollis'), 'the thralls and the Regent');
    expect.ok(!/Leyndell|Erdtree|Elden|Morgott|Seren|Omen|Lands/.test(JSON.stringify(A.LEVEL_10)), 'no names of the old road');
    expect.ok(!A.LEVEL_10.realm.tree, 'no great tree over the city');
    const T = A.ENEMY_BY_ID.gildedThrall, R = A.ENEMY_BY_ID.rogue;
    expect.ok(T.hp > R.hp && T.speed === R.speed && T.attacks.every(a => a.markers?.length), 'quick like the Rogue, a little harder to kill; its cuts glint');
    start();
    expect.ok(Game.enemies.filter(e => e.baseDef.id === 'gildedThrall').length >= 10, 'thralls in the streets');
  });
  test('Aurel: killing the Regent opens the throne court and finishes the level', () => {
    start();
    const e = hollis(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-hollis');
    expect.ok(e && zone && !zone.gate.open && !Game.complete, 'shut at first');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }   // the city, won
    sim.place(e.x, e.z - 6, e.y); p.yaw = 0; p.hp = p.maxHp = 1e6; e.wake?.(); sim.step(0.5);
    e.hp = e.def.hp * 0.55; sim.step(0.5); sim.until(() => e.state !== ES.PHASE && e.def.phaseId === 'hungry', 8);
    expect.ok(e.def.phaseId === 'hungry', `past 60% the hunger shows (${e.def.phaseId})`);
    sim.until(() => e.attack && e.attack.id === 'hungerShows', 6);
    expect.ok(e.invulnerable(), 'untouchable while the hunger shows');
    sim.until(() => !e.invulnerable(), 10);   // the burst is over
    for (let i = 0; i < 4 && e.alive(); i++) { e.deplete(); sim.step(1); sim.until(() => e.state !== ES.PHASE && !e.invulnerable(), 20); }
    sim.until(() => Game.complete, 10);
    expect.ok(!e.alive() && zone.gate.open && Game.complete, `gate open, level complete (hp ${Math.round(e.hp)})`);
  });
  test('Aurel: Level 10 is written in the lore, Ysolde by the first bonfire', () => {
    const L = LORE.levels.aurel;
    expect.ok(L.npcs.length === 1 && L.npcs[0].bonfire === 'aurel-gate' && L.npcs[0].lines.length === 6, 'Ysolde, six lines');
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    const R = terrainFor(A.LEVEL_10);
    for (const I of L.inscriptions.filter(i => i.mount === 'floor')) expect.ok(Math.abs(R.floorY(I.x, I.z, I.y || 0) - (I.y || 0)) < 0.5, `${I.id} stands on the floor`);
  });
})();
