'use strict';
// ============================================================================
// Level 12: the Torn Abbey, Mother Agathe, the Rending Hand and the Rending Brothers (v7.48.0)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Torn Abbey')`.
(function () {
  const A = window.__arena, { Game, ES } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('torn-abbey'); Game.loading = 0; sim.begin(); };
  const agathe = () => Game.enemies.find(e => e.baseDef.id === 'agathe');
  const OLD = /Maliketh|Black Blade|Destined|Gurranq|Farum|Azula|Cinquedea|Beast|Elden|dragon|Seren|Lands/i;
  test('Torn Abbey: Level 12 follows Aurel in Ash, as chapter 12 of the Story', () => {
    expect.ok(A.LEVELS[A.LEVELS.indexOf(A.LEVEL_12) - 1].id === 'aurel-in-ash', 'listed after Aurel in Ash');
    expect.ok(A.STORY.chapters[11].level === 'torn-abbey' && A.STORY.chapters[11].title === 'THE TORN ABBEY', 'chapter 12 of the Story');
    expect.ok(A.LEVEL_11.next === 'torn-abbey', 'the Levels menu carries on from Aurel in Ash too');
  });
  test('Torn Abbey: Agathe keeps Maliketh\'s engineering under new names, within the boss rules', () => {
    const d = A.ENEMY_BY_ID.agathe, ids = new Set(d.attacks.map(a => a.id)), M = MALIKETH;
    expect.ok(d.attacks.length === M.attacks.length, `every move carried over (${d.attacks.length} of ${M.attacks.length})`);
    for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`);
    for (const P of Object.values(d.phases)) for (const id of P.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    const S = d.phases.storm;
    expect.ok(S.at === 0.5 && S.opener === 'stormComes' && S.name === 'Agathe, the Storm at Her Back' && !S.reveal && !S.conceal,
      'at half her strength the storm comes at her back; nothing to shed');
    expect.ok(d.attacks.find(a => a.id === 'stormComes').invulnerable, 'she cannot be hurt through the change');
    expect.ok(S.attacks.filter(id => id !== 'stormComes').every(id => d.attacks.find(a => a.id === id).destined), 'every blow of the hook rends once the storm comes');
    expect.ok(!OLD.test(JSON.stringify(d.attacks.map(a => a.name)) + JSON.stringify(Object.values(d.phases).map(p => p.name || '')) + d.name + d.description),
      'no names of the old road');
    expect.ok(BOSS_FX.agathe && BOSS_FX.agathe.phases.storm === 'storm', 'her effects are written, the storm\'s once it comes');
    expect.ok(M.attacks.some(a => a.id === 'shedRobes') && M.name === 'Beast Clergyman' && M.phases.blackBlade.reveal, 'Maliketh himself is untouched');
  });
  test('Torn Abbey: Rending Brothers hold the ruins, and nothing of the old road is left in them', () => {
    const L = A.LEVEL_12, ids = new Set([...L.gated.flatMap(z => z.enemies.map(m => m.enemy)), ...L.dispersed.map(s => s.enemy)]);
    for (const old of ['beastman', 'ashenWarrior', 'crucibleSquire', 'maliketh']) expect.ok(!ids.has(old), `no ${old}`);
    expect.ok(ids.has('rendingBrother') && ids.has('agathe'), 'the Brothers and the abbess');
    expect.ok(!OLD.test(JSON.stringify(L)), 'no names of the old road');
    expect.ok(!L.realm.dragon && L.realm.lightning && L.realm.weather.some(w => w.kind === 'rain'), 'no dragon: a storm, rain and lightning');
    const B = A.ENEMY_BY_ID.rendingBrother;
    expect.ok(!OLD.test(B.name + B.description + JSON.stringify(B.attacks.map(a => a.name))) && B.attacks.every(a => /^brother/.test(a.id)), 'the Brothers\' own names');
    start();
    expect.ok(Game.enemies.filter(e => e.baseDef.id === 'rendingBrother').length >= 9, 'Brothers in the ruins');
  });
  test('Torn Abbey: killing Agathe opens the rent and finishes the level', () => {
    start();
    const e = agathe(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-agathe');
    expect.ok(e && zone && !zone.gate.open && !Game.complete, 'shut at first');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }   // the abbey, won
    sim.place(e.x - 6, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.(); sim.step(0.5);
    e.hp = e.def.hp * 0.45; sim.step(0.5); sim.until(() => e.state !== ES.PHASE && e.def.phaseId === 'storm', 12);
    expect.ok(e.def.phaseId === 'storm' && e.def.name === 'Agathe, the Storm at Her Back', `past half she has the storm at her back (${e.def.phaseId})`);
    for (let i = 0; i < 6 && e.alive(); i++) { e.deplete(); sim.step(1); sim.until(() => e.state !== ES.PHASE && !e.invulnerable(), 20); }
    sim.until(() => Game.complete, 10);
    expect.ok(!e.alive() && zone.gate.open && Game.complete, `gate open, level complete (hp ${Math.round(e.hp)})`);
  });
  test('Torn Abbey: Level 12 is written in the lore, Ysolde by the first bonfire', () => {
    const L = LORE.levels['torn-abbey'];
    expect.ok(L.npcs.length === 1 && L.npcs[0].bonfire === 'abbey-landing' && L.npcs[0].lines.length === 6, 'Ysolde, six lines');
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    const R = terrainFor(A.LEVEL_12);
    for (const I of L.inscriptions.filter(i => i.mount === 'floor')) expect.ok(Math.abs(R.floorY(I.x, I.z, I.y || 0) - (I.y || 0)) < 0.5, `${I.id} stands on the floor`);
  });
})();
