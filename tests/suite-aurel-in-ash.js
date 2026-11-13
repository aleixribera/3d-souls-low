'use strict';
// ============================================================================
// Level 11: Aurel in Ash, Oswin, the First Crown (his own since pass 47) and the Cinderfolk (v7.46.0)
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
  test('Aurel in Ash: Oswin fights with his own moves, each with its own wind-up, and cracks the floor he calls up (pass 47)', () => {
    const d = A.ENEMY_BY_ID.oswin, ids = new Set(d.attacks.map(a => a.id));
    for (const a of d.attacks) for (const h of a.hits) if (!(h.box || a.box).ring && !h.erupt) expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`);
    for (const P of Object.values(d.phases)) for (const id of P.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    expect.ok(d.attacks.every(a => a.pose && a.pose.startsWith('oswin')), 'no borrowed moves: every pose is his');
    const tell = a => JSON.stringify(['armR', 'elbowR', 'weapon', 'armL', 'elbowL', 'spin', 'legL', 'legR'].map(b => ATTACK_POSES[a.pose].hits[0].windup[b]));
    const seen = new Map();
    for (const a of d.attacks) { const t = tell(a), other = seen.get(t); expect.ok(!other || other.name === a.name, `${a.id} and ${other && other.id} share a wind-up`); seen.set(t, a); }
    // The floor: most of his blows crack it; the calls that burn it come only once enough is open, with a long tell.
    const seams = d.attacks.filter(a => a.hits.some(h => h.seam)), calls = d.attacks.filter(a => a.hits.some(h => h.erupt));
    expect.ok(seams.length >= 8 && calls.length === 2 && calls.every(a => a.when === 'seamed' && a.noParry), `${seams.length} moves crack the floor; ${calls.length} call it up`);
    for (const a of calls) expect.ok(a.hits.find(h => h.erupt).startup >= CONFIG.seams.minTell, `${a.id}: the floor glows a full ${CONFIG.seams.minTell} s first`);
    expect.ok(d.hp === 3500 && d.phases.crowned.hp === 3500 && d.posture.max === 115 && d.posture.breakTime === 3.4, 'health and posture as tuned in pass 45');
    const U = d.phases.uncrowned;
    expect.ok(U.at === 0.4 && U.opener === 'crownCastDown' && U.ignite && U.conceal.join() === 'weapon' && U.name === 'Oswin, Uncrowned',
      'at 40% he casts the axe down and the Ember takes his hands');
    expect.ok(d.attacks.find(a => a.id === 'crownCastDown').invulnerable, 'he cannot be hurt through the change');
    expect.ok(U.attacks.filter(id => d.attacks.find(a => a.id === id).rollOnly).length >= 3, 'uncrowned, he grabs: only a roll gets clear');
    expect.ok(!/Godfrey|Loux|Serosh|Elden|Hoarah|Erdtree/.test(JSON.stringify(d.attacks.map(a => a.name)) + JSON.stringify(Object.values(d.phases).map(p => p.name || '')) + d.name + d.description),
      'no names of the old road');
    expect.ok(BOSS_FX.oswin && BOSS_FX.oswin.phases.uncrowned === 'fire' && Object.keys(BOSS_FX.oswin.attacks).every(id => ids.has(id)), 'his effects are written, for his own moves');
    expect.ok(GODFREY.attacks.some(a => a.id === 'seroshShed') && GODFREY.name === 'Godfrey, First Elden Lord', 'Godfrey himself is untouched');
  });
  test('Aurel in Ash: Oswin\'s blows crack the floor and the cracks stay; called up, they burn where they lie and close (pass 47)', () => {
    Game.startFight('oswin'); sim.begin();
    const e = Game.duel, p = Game.player; p.hp = p.maxHp = 1e9;
    const put = (x, z, yaw) => { e.x = e.px = p.x + x; e.z = e.pz = p.z + z; e.y = p.y; e.yaw = yaw; };
    const strike = (id, yaw) => {
      put(0, -20, yaw); e.cooldown = 99; e.beginAttack(e.attackById(id)); e.holdLeft = 0;   // the player well ahead, out of reach
      sim.until(() => e.state === ES.RECOVER || e.attack?.id !== id, 8);   // (a follow-up may chain on: stop where this one ends)
    };
    strike('tread', 0);
    expect.ok(e.seams.length === 1, `the tread cracks the floor once (${e.seams.length})`);
    const L = e.seams[0];
    expect.ok(Math.abs(L.z0 - (e.z + 1.4)) < 0.3 && Math.abs(Math.hypot(L.x1 - L.x0, L.z1 - L.z0) - 9) < 0.01 && Math.abs(L.x1 - L.x0) < 0.5, `from 1.4 m ahead of him, 9 m along his facing (${JSON.stringify(L)})`);
    sim.seconds(1, 1);
    expect.ok(e.seams.length === 1 && emberSeams.live().some(s => s.state === 'open'), `it stays open, glowing (${JSON.stringify(emberSeams.live())})`);
    strike('groundBreaker', 0);
    expect.ok(e.seams.length === 4, `ground breaker opens three more (${e.seams.length})`);
    strike('kingsLeap', 0);
    expect.ok(e.seams.length === CONFIG.seams.max, `no more than ${CONFIG.seams.max} stay open (${e.seams.length})`);
    // Long live the king: the seams glow through the wind-up, then burn along their length and nowhere else.
    const on = e.seams[e.seams.length - 1];
    put(-30, 30, 0); e.cooldown = 99; e.beginAttack(e.attackById('longLive'));
    sim.until(() => e.hitIndex === 1 && e.state === ES.WINDUP && e.stateTime > 0.7, 6); sim.seconds(0.05, 1);
    expect.ok(emberSeams.live().some(s => s.warn > 0.3), `the seams brighten before they burn (${JSON.stringify(emberSeams.live())})`);
    sim.until(() => e.hitIndex === 1 && e.state === ES.ACTIVE, 3);
    const H = e.hitbox, body = (x, z) => ({ x, z, y: on.y, radius: p.radius, height: p.height, grounded: true });
    expect.ok(H && H.lines && H.overlaps(body((on.x0 + on.x1) / 2, (on.z0 + on.z1) / 2)), 'standing on a seam, the fire takes you');
    expect.ok(H && !H.overlaps(body(on.x0 + 40, on.z0 + 40)), 'where the floor is whole, it does not');
    expect.ok(e.seams.length === 0, 'the seams it burned are spent');
    sim.seconds(0.1, 1);
    expect.ok(emberSeams.live().some(s => s.state === 'erupt'), `a wall of fire stands on them (${JSON.stringify(emberSeams.live())})`);
    sim.seconds(VIS.emberSeams.burn + VIS.emberSeams.fade + VIS.emberSeams.close + 0.5, 1);
    expect.ok(!emberSeams.live().length, `and then they close (${JSON.stringify(emberSeams.live())})`);
    // The First Hunger burns them twice; with none open, a call does nothing.
    strike('twinTread', 0);
    expect.ok(e.seams.length === 2, `twin tread, two seams (${e.seams.length})`);
    put(-30, 30, 0); e.cooldown = 99; e.beginAttack(e.attackById('firstHunger'));
    sim.until(() => e.hitIndex === 0 && e.state === ES.ACTIVE, 4);
    expect.ok(e.hitbox && e.seams.length === 2, 'the first burning keeps them open');
    sim.until(() => e.hitIndex === 1 && e.state === ES.ACTIVE, 4);
    expect.ok(e.hitbox && e.seams.length === 0, 'the second spends them');
    put(-30, 30, 0); e.cooldown = 99; e.beginAttack(e.attackById('longLive'));
    sim.until(() => e.hitIndex === 1 && e.state === ES.ACTIVE, 6);
    expect.ok(!e.hitbox, 'nothing open, nothing burns');
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
