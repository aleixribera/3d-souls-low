'use strict';
// ============================================================================
// Level 14: the Still Mere, the King's Blade and the Drowned (v7.51.0)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Still Mere')`.
(function () {
  const A = window.__arena, { Game, ES } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('still-mere'); Game.loading = 0; sim.begin(); };
  const blade = () => Game.enemies.find(e => e.baseDef.id === 'kingsBlade');
  const OLD = /Malenia|Miquella|Haligtree|Elphael|Scarlet|Rot\b|Cleanrot|Omenkin|Zealot|Beast|Scion|Seren|Lands|Grace|Ashen Warrior/i;
  test('Still Mere: Level 14 follows the Root of the Ember, as chapter 14 of the Story', () => {
    expect.ok(A.LEVELS[A.LEVELS.indexOf(A.LEVEL_14) - 1].id === 'ember-root', 'listed after the Root of the Ember');
    expect.ok(A.STORY.chapters[13].level === 'still-mere' && A.STORY.chapters[13].title === 'THE STILL MERE', 'chapter 14 of the Story');
    expect.ok(A.LEVEL_13.next === 'still-mere', 'the Levels menu carries on from the Root of the Ember too');
  });
  test('Still Mere: the King\'s Blade fights with the player\'s own moves, within the boss rules', () => {
    const d = A.ENEMY_BY_ID.kingsBlade, ids = new Set(d.attacks.map(a => a.id)), P = A.PLAYER_DEF.moveset.attacks;
    for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`);
    for (const Ph of Object.values(d.phases)) for (const id of Ph.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    const by = id => d.attacks.find(a => a.id === id);
    // The player's three cuts, chained as the player chains them, with the player's own poses and reach.
    expect.ok(by('firstCut').pose === P.light.pose && by('secondCut').pose === P.light2.pose && by('thirdCut').pose === P.light3.pose, 'the three cuts\' poses are the player\'s');
    expect.ok(by('firstCut').box.d === P.light.box.d && by('firstCut').hits[0].active === P.light.hits[0].active, 'their reach and strike are the player\'s');
    expect.ok(by('firstCut').followUps[0].attack === 'secondCut' && by('secondCut').followUps[0].attack === 'thirdCut', 'first into second into third');
    expect.ok(by('heldBlow').pose === P.heavy.pose && by('heldBlow').hits[0].hold, 'the held blow is the player\'s charged heavy');
    expect.ok(by('leapingBlow').hits[0].leap, 'the leaping blow is the player\'s jump heavy');
    expect.ok(d.attacks.some(a => a.when === 'healing') && d.attacks.some(a => a.when === 'shielded') && d.guard, 'it punishes a drink, and its shield turns blows and answers them');
    const E = d.phases.emberWorn;
    expect.ok(E.at === 0.5 && E.opener === 'emberLeap' && E.ignite && E.name === 'The King\'s Blade, Ember-Worn', 'past half the Ember shows through');
    expect.ok(by('thirdCutBurning').followUps.some(f => f.attack === 'heldBlow'), 'and the third cut runs on into the held blow');
    expect.ok(BOSS_FX.kingsBlade && BOSS_FX.kingsBlade.phases.emberWorn === 'fire', 'its effects are written, fire once the Ember shows');
    expect.ok(!OLD.test(JSON.stringify(d.attacks.map(a => a.name)) + d.name + d.description), 'no names of the old road');
  });
  test('Still Mere: the Drowned hold the court, and nothing of the old road is left', () => {
    const L = A.LEVEL_14, ids = new Set([...L.gated.flatMap(z => z.enemies.map(m => m.enemy)), ...L.dispersed.map(s => s.enemy)]);
    for (const old of ['cleanrotKnight', 'omenkin', 'goldenZealot', 'ashenWarrior', 'beastman', 'graftedScion', 'malenia']) expect.ok(!ids.has(old), `no ${old}`);
    expect.ok(ids.has('drowned') && ids.has('kingsBlade'), 'the Drowned and the King\'s Blade');
    const text = JSON.stringify({ name: L.name, description: L.description, help: L.help, hint: L.completeHint, rooms: L.rooms.map(r => r.id), bonfires: L.bonfires.map(b => b.id), zones: L.gated.map(z => z.id) });
    expect.ok(!OLD.test(text), 'no names of the old road');
    expect.ok(!L.hazards && !L.realm.blooms && L.realm.pools.every(p => p.kind === 'water'), 'no rot and no scarlet flowers: water where the rot lay');
    const D = A.ENEMY_BY_ID.drowned;
    expect.ok(!OLD.test(D.name + D.description + JSON.stringify(D.attacks.map(a => a.name))), 'the Drowned\'s own names');
    expect.ok(A.ENEMY_BY_ID.hollow.attacks.some(a => a.id === 'swing'), 'the Hollow Soldier itself is untouched');
    start();
    expect.ok(Game.enemies.filter(e => e.baseDef.id === 'drowned').length >= 7, 'Drowned on the boughs and in the court');
  });
  test('Still Mere: killing the King\'s Blade opens the ice and finishes the level', () => {
    start();
    const e = blade(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-blade');
    expect.ok(e && zone && !zone.gate.open && !Game.complete, 'shut at first');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }   // the mere, won
    sim.place(e.x - 6, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.(); sim.step(0.5);
    e.hp = e.def.hp * 0.45; sim.step(0.5); sim.until(() => e.state !== ES.PHASE && e.def.phaseId === 'emberWorn', 12);
    let opened = null; sim.until(() => (opened = e.attack && e.attack.id) === 'emberLeap', 4);
    expect.ok(opened === 'emberLeap', `the phase opens with the Ember Leaps (${opened})`);
    expect.ok(e.def.phaseId === 'emberWorn' && e.def.name === 'The King\'s Blade, Ember-Worn', `past half the Ember shows (${e.def.phaseId})`);
    for (let i = 0; i < 6 && e.alive(); i++) { e.deplete(); sim.step(1); sim.until(() => e.state !== ES.PHASE && !e.invulnerable(), 20); }
    sim.until(() => Game.complete, 10);
    expect.ok(!e.alive() && zone.gate.open && Game.complete, `gate open, level complete (hp ${Math.round(e.hp)})`);
  });
  test('Still Mere: the King\'s Blade strikes the player in a fair fight, and its shield turns a blow from the front', () => {
    start();
    const e = blade(), p = Game.player;
    for (const z of Game.zones) if (z.id !== 'zone-blade') { z.gate.open = true; z.beaten = true; }
    sim.place(e.x - 2.4, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.();
    const seen = new Set();
    for (let t = 0; t < 30 && seen.size < 3; t += 1 / 60) { sim.step(1 / 60); if (e.attack && e.state === ES.ACTIVE) seen.add(e.attack.id); }
    expect.ok(seen.size >= 2 && p.hp < p.maxHp, `it attacks with its moves (${[...seen].join(', ')}), and lands blows`);
    const front = A.ENEMY_BY_ID.kingsBlade.guard;
    expect.ok(front.damageMul < 1 && front.breakers.includes('heavy'), 'the shield takes most of a frontal blow, and a heavy breaks it');
  });
  test('Still Mere: Level 14 is written in the lore, Ysolde by the first bonfire', () => {
    const L = LORE.levels['still-mere'];
    expect.ok(L.npcs.length === 1 && L.npcs[0].bonfire === 'mere-bough' && L.npcs[0].lines.length === 6, 'Ysolde, six lines');
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    const R = terrainFor(A.LEVEL_14);
    for (const I of [...L.inscriptions.filter(i => i.mount === 'floor'), ...L.npcs]) expect.ok(Math.abs(R.floorY(I.x, I.z, I.y || 0) - (I.y || 0)) < 0.5, `${I.id || 'Ysolde'} stands on the floor`);
  });
})();
