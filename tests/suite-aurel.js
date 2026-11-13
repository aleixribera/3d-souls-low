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
  test('Aurel: the Regent fights with his own moves, each with its own wind-up, and his cuts hang and cut again (pass 44)', () => {
    const d = A.ENEMY_BY_ID.hollis, ids = new Set(d.attacks.map(a => a.id));
    for (const a of d.attacks) for (const h of a.hits) if (!(h.box || a.box).ring && !h.echo?.home) expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`);
    for (const P of Object.values(d.phases)) for (const id of P.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    expect.ok(d.attacks.every(a => a.pose && a.pose.startsWith('hollis')) && typeof MORGOTT === 'undefined', 'no borrowed moves: every pose is his, and Morgott is gone');
    const tell = a => JSON.stringify(['armR', 'elbowR', 'weapon', 'armL', 'elbowL', 'spin', 'legL', 'legR'].map(b => ATTACK_POSES[a.pose].hits[0].windup[b]));
    const seen = new Map();
    for (const a of d.attacks) { const t = tell(a), other = seen.get(t); expect.ok(!other || other.name === a.name, `${a.id} and ${other && other.id} share a wind-up`); seen.set(t, a); }
    // Every cut that comes again gives time to read it: it hangs at least 0.6 s, and its last moments are a tell.
    const echoes = d.attacks.flatMap(a => a.hits.map((h, i) => ({ a, h, i })).filter(x => x.h.echo));
    expect.ok(echoes.length >= 8, `his cuts come again (${echoes.length} echoes)`);
    for (const { a, h, i } of echoes) {
      const from = a.hits[h.echo.of], hang = from.active + (from.follow || 0) + a.hits.slice(h.echo.of + 1, i).reduce((n, x) => n + x.startup + x.active + (x.follow || 0), 0) + h.startup;
      expect.ok(hang >= 0.6 && h.startup >= VIS.giltEcho.warn - 0.15, `${a.id} hit ${i + 1}: hangs ${hang.toFixed(2)} s`);
    }
    expect.ok(d.phases.hungry.at === 0.55 && d.phases.hungry.opener === 'giltCracks' && d.phases.hungry.ignite && d.phases.hungry.echoColor !== d.echoColor, 'past the worst of his hurt the gilt cracks: it burns, and hangs as embers');
    expect.ok(d.attacks.find(a => a.id === 'giltCracks').invulnerable, 'he cannot be hurt through the change');
    expect.ok(d.attacks.find(a => a.id === 'callHome').hits.some(h => h.echo?.home), 'hungry, he calls his cuts home');
    expect.ok(!/Morgott|Omen|Erdsteel|Erdtree|Defilement|[Cc]ursed/.test(JSON.stringify(d.attacks.map(a => a.name)) + d.name + d.description), 'no names of the old road');
    expect.ok(BOSS_FX.hollis && BOSS_FX.hollis.phases.hungry === 'fire', 'his effects are written, the Ember\'s fire in the second phase');
  });
  test('Aurel: a gilt echo cuts where the cut was made, not where he stands; it cannot be parried; called home it comes to him (pass 44)', () => {
    Game.startFight('hollis'); sim.begin();
    const e = Game.duel, p = Game.player; p.hp = p.maxHp = 1e9;
    const put = (x, z) => { e.x = e.px = p.x + x; e.z = e.pz = p.z + z; e.y = p.y; e.yaw = Math.atan2(p.x - e.x, p.z - e.z); };
    put(0, 3); e.cooldown = 99; p.yaw = Math.atan2(e.x - p.x, e.z - p.z);
    e.beginAttack(e.attackById('courtesy')); e.holdLeft = 0;
    expect.ok(parryTiming(p, e, 9) !== null, 'his own cut can be parried');
    sim.until(() => e.state === ES.ACTIVE, 4);
    const cut = { x: e.x, z: e.z, yaw: e.yaw };
    sim.until(() => e.hitIndex === 1, 2);
    expect.ok(e.state === ES.WINDUP && !!e.cutOf(0), 'the cut is remembered');
    sim.seconds(0.1, 1);
    expect.ok(giltEcho.live().some(s => s.state === 'hang' && s.hit === 1), `the gilt hangs where it will cut (${JSON.stringify(giltEcho.live())})`);
    expect.ok(parryTiming(p, e, 9) === null, 'the gilt cannot be parried');
    e.x += 6; e.px = e.x;   // he is somewhere else when it cuts
    sim.until(() => e.state === ES.ACTIVE && e.hitIndex === 1, 2);
    const c = e.hitbox.center(), B = e.hitbox.box;
    expect.ok(Math.abs(c.x - (cut.x + Math.sin(cut.yaw) * B.fwd)) < 1e-6 && Math.abs(c.z - (cut.z + Math.cos(cut.yaw) * B.fwd)) < 1e-6, 'the echo cuts where the cut was');
    expect.ok(!e.hitbox.overlaps({ ...p, x: e.x + Math.sin(e.yaw) * 1.8, z: e.z + Math.cos(e.yaw) * 1.8, radius: p.radius, height: p.height, y: p.y, grounded: true }), 'not where he stands now');
    // Called home: the line slides from the cut back to him over its strike.
    e.hp = e.def.hp * 0.5; sim.until(() => e.def.phaseId === 'hungry' && (e.state === ES.CHASE || e.state === ES.IDLE), 10);
    put(0, 3); e.cooldown = 99;
    e.beginAttack(e.attackById('callHome'));
    sim.until(() => e.hitIndex === 2 && e.state === ES.ACTIVE, 6);
    const H = e.hitbox, at = () => { const q = H.center(); return Math.hypot(q.x - e.x, q.z - e.z); }, d0 = at();
    sim.seconds(H.anchor.time * 0.99);
    expect.ok(d0 > H.box.fwd + 3 && Math.abs(at() - H.box.fwd) < 0.4, `called home from ${d0.toFixed(2)} m to ${at().toFixed(2)} m before him`);
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
    e.hp = e.def.hp * 0.5; sim.step(0.5); sim.until(() => e.state !== ES.PHASE && e.def.phaseId === 'hungry', 8);
    expect.ok(e.def.phaseId === 'hungry', `past the worst of his hurt the gilt cracks (${e.def.phaseId})`);
    sim.until(() => e.attack && e.attack.id === 'giltCracks', 6);
    expect.ok(e.invulnerable(), 'untouchable while the gilt cracks');
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
