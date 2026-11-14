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
  test('Church: Level 6 follows the Final Castle, as chapter 6 of the Story (v7.36.0)', () => {
    expect.ok(A.LEVELS[A.LEVELS.indexOf(A.LEVEL_6) - 1].id === 'final-castle', 'listed after the castle');
    expect.ok(A.STORY.chapters[5].level === 'the-church' && A.STORY.chapters[4].level === 'final-castle', 'chapter 6 of Ashmere, after the castle');
    expect.ok(A.LEVEL_5.next === 'the-church', 'the Levels menu carries on from the castle too');
    expect.ok(Game.screens().practiceLevels.items.length === A.LEVELS.length + 1, 'Practice lists it');
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
    start(); const e = inNave(2.5), p = Game.player, kick = e.def.attacks.find(a => a.id === 'hindKick'), toP = e.yaw + Math.PI;
    e.lastMove = 'hindKick'; e.moveRun = 2;
    for (let i = 0; i < 200; i++) expect.ok(e.react(p, 2.5, toP, 10) !== kick, 'no third hind kick');
    e.lastMove = 'slam'; e.moveRun = 2; e.attack = e.def.attacks.find(a => a.id === 'rake');
    for (let i = 0; i < 100; i++) expect.ok(!e.followUp(), 'no third slam from a follow-up');
    e.attack = null;
  });
  // Pass 77: it learns every move of its own you escape, comes again with its learned form, and forgets them all on a break.
  const attack = (e, id) => e.attackById(id);
  const busy = e => e.state === ES.WINDUP || e.state === ES.ACTIVE || e.state === ES.RECOVER;
  test('Church: a move you escape is learned, and comes again as its learned form', () => {
    start(); const e = inNave(20), seen = []; let listen = true; events.on('enemyLearned', x => listen && seen.push(x.attack.id));
    expect.ok(e.learned.length === 0, 'it knows nothing at first');
    e.beginAttack(attack(e, 'rake')); sim.until(() => !busy(e), 8); listen = false;
    expect.ok(e.learned[0] === 'rake' && seen[0] === 'rake', `the missed rake is learned (a missed follow-up after it too) (${e.learned.join()})`);
    e.beginAttack(attack(e, 'rake'));
    expect.ok(e.attack.id === 'rakeLearned' && e.attack.hits.length === 3 && e.lastMove === 'rake', `it comes as the learned rake, counted as a rake (${e.attack.id})`);
    sim.until(() => !busy(e), 8);
    expect.ok(e.learned.filter(x => x === 'rake').length === 1 && !e.learned.includes('rakeLearned'), 'a learned form is not learned again');
  });
  test('Church: a move that lands is not learned', () => {
    start(); const e = inNave(2.6); e.yaw = -Math.PI / 2;
    e.beginAttack(attack(e, 'rake')); sim.until(() => !busy(e), 8);
    expect.ok(e.landed && e.learned.length === 0, `it hit, so it learned nothing (${e.landed}, ${e.learned.join()})`);
  });
  test('Church: a parried move is learned, and a break forgets them all', () => {
    start(); const e = inNave(20);
    e.beginAttack(attack(e, 'slam')); e.getParried();
    expect.ok(e.learned.includes('slam'), 'parried, so learned');
    e.learned.push('rake'); e.breakNow(); sim.step(1);
    expect.ok(e.learned.length === 0, `broken, it forgets (${e.learned.join()})`);
    e.beginAttack(attack(e, 'slam'));
    expect.ok(e.attack.id === 'slam', 'and the hammerfall is plain again');
  });
  test('Church: learned forms are never chosen for themselves', () => {
    start(); const e = inNave(3.5), p = Game.player;
    for (let i = 0; i < 400; i++) { e.cooldown = 0; const a = e.chooseAttack(3 + (i % 12), 0, 1); expect.ok(!a || !a.learned, `${a && a.id} picked`); }
    for (let i = 0; i < 200; i++) { const a = e.react(p, 2.5, e.yaw + Math.PI, 10); expect.ok(!a || !a.learned, `${a && a.id} as an answer`); }
    const d = A.ENEMY_BY_ID.antlered;
    for (const a of d.attacks) if (a.learns) expect.ok(attack(e, a.learns).learned && !Object.values(d.phases).some(ph => ph.attacks.includes(a.learns)), `${a.learns} only learned`);
  });
  test('Church: each move it knows lights its own ember collar on the antlers', () => {
    start(); const e = inNave(20); sim.step(2, 1);
    const M = e.rig.markMeshes, lit = () => M.filter(list => list.length && list.every(m => m.visible)).length;
    expect.ok(M && M.length === 6 && M.every(list => list.length > 0) && lit() === 0, `six collars, all dark (${M && M.length})`);
    e.learned.push('hook', 'leap'); sim.step(2, 1);
    expect.ok(lit() === 2 && M[1][0].visible && M[5][0].visible && !M[0][0].visible, `its own collar for each move it knows (${lit()})`);
    e.breakNow(); sim.step(2, 1);
    expect.ok(lit() === 0, 'dark again once broken');
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
    expect.ok(Game.nextLevelId() === 'windward-moor', 'the moor follows it (v7.38.0)');
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
