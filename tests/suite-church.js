'use strict';
// ============================================================================
// Level 6: the Church in the Pass and the Antlered Hunger (v7.20)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Church')`.
(function () {
  const A = window.__arena, { Game, CONFIG, ES, PS, events } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('the-church'); Game.loading = 0; sim.begin(); };
  const hunger = () => Game.enemies.find(e => e.baseDef.id === 'antlered');
  const inNave = (gap = 6) => {
    const e = hunger(), p = Game.player;
    sim.place(e.x - gap, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6;
    e.wake?.(); return e;
  };
  test('Church: Level 6 follows the Final Castle and stands apart from the Story', () => {
    expect.ok(A.LEVELS[A.LEVELS.length - 1].id === 'the-church' && A.LEVELS[A.LEVELS.length - 2].id === 'final-castle', 'listed after the castle');
    expect.ok(!A.STORY.chapters.some(c => c.level === 'the-church'), 'not a chapter of either road');
    expect.ok(!A.LEVEL_5.next, 'the castle still ends the Story: nothing carries on from it');
    expect.ok(Game.screens().levelsAshmere.items.length === A.LEVELS.length + 1, 'the Levels menu lists it');
  });
  test('Church: every hit of the Hunger obeys the boss rules', () => {
    const d = A.ENEMY_BY_ID.antlered;
    for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.22, `${a.id}: active ${h.active}`);
    expect.ok(d.phases.gorge.opener === 'roar' && d.phases.gorge.at === 0.5, 'the second phase opens with the roar');
  });
  test('Church: the Hunger never uses one move three times running', () => {
    start(); const e = inNave(3.5);
    for (let i = 0; i < 300; i++) {
      const a = e.chooseAttack(3.5, 0, 1);
      if (!a) continue;
      expect.ok(!(e.lastMove === a.id && e.moveRun >= 2), `${a.id} a third time`);
      e.moveRun = a.id === e.lastMove ? (e.moveRun || 0) + 1 : 1; e.lastMove = a.id;
    }
    e.lastMove = 'rake'; e.moveRun = 2;
    expect.ok(e.spent(e.def.attacks.find(a => a.id === 'rake')) && !e.spent(e.def.attacks.find(a => a.id === 'slam')), 'only the repeated move is spent');
  });
  test('Church: the rule holds for its answers too', () => {
    start(); const e = inNave(2.5), p = Game.player, sweep = e.def.attacks.find(a => a.id === 'hindSweep'), toP = e.yaw + Math.PI;
    e.lastMove = 'hindSweep'; e.moveRun = 2;
    for (let i = 0; i < 200; i++) expect.ok(e.react(p, 2.5, toP, 10) !== sweep, 'no third hind sweep');
    e.lastMove = 'slam'; e.moveRun = 2; e.attack = e.def.attacks.find(a => a.id === 'rake');
    for (let i = 0; i < 100; i++) expect.ok(!e.followUp(), 'no third slam from a follow-up');
    e.attack = null;
  });
  test('Church: the roar waits on its chance at mid range', () => {
    start(); const e = inNave(6); e.enterPhase(1); e.cooldown = 0; let n = 0;
    for (let i = 0; i < 600; i++) { const a = e.chooseAttack(6, e.yaw, 1 / 60); if (a && a.id === 'roar') n++; }
    expect.ok(n < 60, `it rolls per second, not every frame (${n} of 600)`);
  });
  test('Church: the door veil lifts for a player in the doorway', () => {
    start(); const S = scenery.state, c = camera.position.clone();
    sim.place(121, 0, 6); camera.position.set(114, 8, 0);
    for (let i = 0; i < 180; i++) visuals.hooks.beforeDraw.forEach(f => f());
    camera.position.copy(c);
    expect.ok(S.k > 0.5 && S.veil.material.opacity < 0.5, 'the player is not behind the black, and the nave is not lit by the yard');
  });
  test('Church: other enemies keep repeating (noRepeat is opt-in)', () => {
    start(); const e = Game.enemies.find(x => x.baseDef.id === 'hollow');
    e.lastMove = e.def.attacks[0].id; e.moveRun = 9;
    expect.ok(!e.spent(e.def.attacks[0]), 'without noRepeat nothing is spent');
  });
  test('Church: half health brings the roar and no damage with it', () => {
    start(); const e = inNave(), p = Game.player, hp = p.hp;
    e.hp = e.def.hp * 0.5 + 1; e.takeHit(makeStrike(A.PLAYER_DEF.moveset.attacks.heavy, true), p);
    sim.until(() => e.phase === 1, 3);
    expect.ok(e.phase === 1 && e.alive(), `second phase at half health, now ${e.phase}`);
    expect.ok(p.hp === hp, 'the change itself hurts nobody');
    sim.until(() => e.attack && e.attack.id === 'roar', 3);
    expect.ok(e.attack && e.attack.id === 'roar', 'it opens with the roar');
  });
  test('Church: killing the Hunger opens the gate and finishes the level', () => {
    start(); const e = inNave(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-nave') || Game.zones[0];
    expect.ok(!zone.gate.open && !Game.complete, 'shut at first');
    e.hp = 1; e.deplete(); sim.until(() => Game.complete, 4);
    expect.ok(!e.alive() && zone.gate.open && Game.complete, 'gate open, level complete');
    expect.ok(Game.nextLevelId() === null, 'nothing follows it');
    expect.ok(p.alive(), 'the player stands');
  });
  test('Church: the seen land is Blender\'s and the room walls stay out of the way', () => {
    start();
    const S = A.scenery ? A.scenery.state : scenery.state;
    expect.ok(S && S.def.id === 'the-church' && S.props.length > 0, 'scenery built');
    expect.ok(S.tracks && S.veil && S.inside.length === 3, 'prints, the door veil and the three inside rooms');
    expect.ok(A.LEVEL_6.rooms.every(r => r.unseen), 'no room draws its own walls');
  });
  test('Church: leaving the level takes the scenery with it', () => {
    start(); const inside = scenery.state.G;
    Game.startLevel('long-hall'); Game.loading = 0; sim.begin();
    let top = inside; while (top.parent) top = top.parent;
    expect.ok(top !== scene && camera.far < A.LEVEL_6.scenery.far, 'the group left the scene and the far plane came back');
    const icons = () => { let map = null; scenery.state.G.traverse(o => { if (o.material && o.material.emissiveMap) map = o.material.map; }); return map; }, first = (start(), icons());
    expect.ok(scenery.state.G.parent && camera.far >= A.LEVEL_6.scenery.far, 'back again');
    Game.startLevel('long-hall'); Game.loading = 0; sim.begin(); start();
    expect.ok(first && icons() === first, 'one painted texture however many visits');
  });
  test('Church: Level 6 is written in the lore', () => {
    const L = A.LORE ? A.LORE.levels['the-church'] : LORE.levels['the-church'];
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    const R = terrainFor(A.LEVEL_6);
    for (const I of L.inscriptions) expect.ok(Math.abs(R.floorY(I.x, I.z, I.y) - I.y) < 0.5, `${I.id} stands on the floor`);
  });
})();
