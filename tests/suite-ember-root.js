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
  // A fight with the tree alone, the player `gap` m before it, both facing; the player cannot die.
  const duel = (gap = 3) => {
    Game.startFight('kindlingTree'); sim.begin();
    const e = Game.duel, p = Game.player; p.hp = p.maxHp = 1000; e.cooldown = 99;
    e.x = e.px = p.x; e.z = e.pz = p.z + gap; e.y = p.y; e.yaw = Math.PI; p.yaw = 0;
    return { e, p };
  };
  test('Ember Root: the Kindling Tree is its own, rooted until it catches, every wind-up its own (pass 50)', () => {
    const d = A.ENEMY_BY_ID.kindlingTree, ids = new Set(d.attacks.map(a => a.id));
    for (const a of d.attacks) for (const h of a.hits) if (!(h.box || a.box).ring) expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`);
    for (const P of Object.values(d.phases)) for (const id of P.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    expect.ok(d.attacks.every(a => a.pose && a.pose.startsWith('tree')) && !d.attacks.some(a => RADAGON.attacks.some(r => r.id === a.id)), 'no borrowed moves: every pose is its own');
    const M = MODEL_DEFS.kindlingTree;
    expect.ok(M.parts.length >= 25 && M.parts.every(q => q.use === 'baked' && q.mesh.startsWith('tree:')) && M.extends !== 'antleredHunger', 'its own Blender figure');
    expect.ok(d.hp === 2500 && d.posture.max === 105 && d.posture.parry === 50 && d.poise === 270, 'health and posture as before');
    const P = d.phases.rooted, K = d.phases.kindled;
    expect.ok(P.rooted === true && d.speed === 0 && !('speed' in P), 'rooted: it never walks');
    expect.ok(K.at === 0.6 && K.opener === 'uprooted' && K.name === 'The Kindling Tree, Ablaze' && K.ignite && K.rooted === false && K.speed > 0, 'at 60 % it catches and tears itself free');
    // Every move opens on its own wind-up (its punish is into the roots, sooner; deep roots opens as into the roots does).
    const tell = a => JSON.stringify(['armR', 'elbowR', 'armL', 'elbowL', 'spin', 'chest', 'crouch'].map(b => ATTACK_POSES[a.pose].hits[0].windup[b]));
    const seen = new Map();
    for (const a of d.attacks.filter(a => !['risingPunish', 'deepRoots', 'burningLash'].includes(a.id))) {
      expect.ok(!seen.has(tell(a)), `${a.id}: its own wind-up (not ${seen.get(tell(a))}'s)`); seen.set(tell(a), a.id);
    }
    for (const a of d.attacks) for (const h of a.hits) if (h.burrow)
      expect.ok(h.startup * (1 - h.burrow.lock) >= CONFIG.burrow.minTell - 1e-6, `${a.id}: the heave holds still long enough to step off`);
    expect.ok(!OLD.test(JSON.stringify(d.attacks.map(a => a.name)) + JSON.stringify(Object.values(d.phases).map(p => p.name || '')) + d.name + d.description),
      'no names of the old road');
    expect.ok(d.holyLight && d.holyLight.color !== CONFIG.bossPowers.holy.color, 'its marks burn in the Ember\'s light, not the old gold');
    expect.ok(BOSS_FX.kindlingTree && BOSS_FX.kindlingTree.phases.kindled === 'fire', 'its effects are written, fire once it catches');
    expect.ok(RADAGON.name === 'Radagon of the Golden Order' && !RADAGON.holyLight && RADAGON.attacks.some(a => a.id === 'goldBreaker'), 'Radagon himself is untouched');
  });
  test('Ember Root: rooted, nothing shoves the tree and it does not walk to you', () => {
    const { e, p } = duel(1.0);
    const at = [e.x, e.z];
    sim.seconds(1);
    expect.ok(Math.hypot(e.x - at[0], e.z - at[1]) < 1e-6, `not shoved (${(e.x - at[0]).toFixed(3)}, ${(e.z - at[1]).toFixed(3)})`);
    expect.ok(Math.hypot(p.x - e.x, p.z - e.z) >= e.radius + p.radius - 0.05, 'the player is pushed off its trunk');
    sim.place(e.x, e.z - 9, e.y); e.state = ES.CHASE; sim.seconds(1.5);
    expect.ok(Math.hypot(e.x - at[0], e.z - at[1]) < 1e-6, 'it waits where it is rooted');
  });
  test('Ember Root: into the roots, it runs under the floor after you, holds still, and rises through the swelling', () => {
    const { e, p } = duel(12), a = e.attackById('intoTheRoots'), h = a.hits[0], B = h.burrow;
    e.beginAttack(a);
    sim.seconds(h.startup * B.from * 0.5);
    expect.ok(!e.burrowed() && !e.invulnerable(), 'sinking, not yet under');
    sim.until(() => e.burrowed(), 2);
    expect.ok(e.invulnerable(), 'under the floor it cannot be touched');
    sim.seconds(0.05, 1);
    expect.ok(rootHeave.live().rings >= 1, `the swelling is drawn (${JSON.stringify(rootHeave.live())})`);
    const d0 = Math.hypot(e.x - p.x, e.z - p.z);
    sim.seconds(0.5);
    expect.ok(Math.hypot(e.x - p.x, e.z - p.z) < d0 - 3, `the heave runs after you (${d0.toFixed(1)} -> ${Math.hypot(e.x - p.x, e.z - p.z).toFixed(1)})`);
    sim.until(() => e.stateTime >= h.startup * B.lock + 0.1, 3);
    const lock = [e.x, e.z];
    sim.place(p.x + 3, p.z, p.y); sim.seconds(0.2);
    expect.ok(Math.hypot(e.x - lock[0], e.z - lock[1]) < 0.15, 'once it stops, it holds still');
    sim.place(lock[0] + 6, lock[1], p.y);   // step off the swelling
    sim.until(() => e.state === ES.ACTIVE, 3);
    expect.ok(!e.burrowed() && Math.hypot(e.x - lock[0], e.z - lock[1]) < 0.3, 'it rises where it stopped');
    sim.until(() => e.state !== ES.ACTIVE, 2);
    expect.ok(p.hp === p.maxHp, `stepped off, untouched (${p.hp})`);
    // Again: stand still. It stops beside you, not under you, and the swelling still takes you.
    sim.until(() => e.state === ES.CHASE || e.state === ES.IDLE, 6);
    e.beginAttack(a);
    sim.until(() => e.stateTime >= h.startup * B.lock + 0.05, 4);
    const gap = Math.hypot(e.x - p.x, e.z - p.z);
    expect.ok(gap >= e.radius + p.radius && gap < e.radius + p.radius + CONFIG.burrow.near + 0.6, `it rises beside you (${gap.toFixed(2)} m)`);
    sim.until(() => p.hp < p.maxHp || e.state === ES.RECOVER, 3);
    expect.ok(p.hp < p.maxHp, `stood on the swelling: struck (${p.hp})`);
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
