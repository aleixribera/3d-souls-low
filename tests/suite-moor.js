'use strict';
// ============================================================================
// Level 7: the Windward Moor, Old Ostrey and the Lantern Thralls (v7.38.0)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Moor')`.
(function () {
  const A = window.__arena, { Game, ES } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('windward-moor'); Game.loading = 0; sim.begin(); };
  const ostrey = () => Game.enemies.find(e => e.baseDef.id === 'ostrey');
  test('Moor: Level 7 follows the church, as chapter 7 of the Story', () => {
    expect.ok(A.LEVELS[A.LEVELS.indexOf(A.LEVEL_7) - 1].id === 'the-church', 'listed after the church');
    expect.ok(A.STORY.chapters[6].level === 'windward-moor' && A.STORY.chapters[6].title === 'THE WINDWARD MOOR', 'chapter 7 of the Story');
    expect.ok(A.LEVEL_6.next === 'windward-moor', 'the Levels menu carries on from the church too');
  });
  test('Moor: Old Ostrey fights with his own moves, each with its own wind-up (v7.58.0)', () => {
    const d = A.ENEMY_BY_ID.ostrey, ids = new Set(d.attacks.map(a => a.id));
    for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`);
    for (const P of Object.values(d.phases)) for (const id of P.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    expect.ok(typeof MARGIT === 'undefined' && d.attacks.every(a => !a.spectral && a.pose && a.pose.startsWith('ostrey')), 'no borrowed moves: every pose is his');
    // A wind-up reads by the arms: no two of his moves share the first wind-up of the bar arm and the lantern arm.
    const tell = a => JSON.stringify(['armR', 'elbowR', 'weapon', 'armL', 'elbowL', 'spin'].map(b => ATTACK_POSES[a.pose].hits[0].windup[b]));
    const seen = new Map();
    for (const a of d.attacks) { const t = tell(a), other = seen.get(t); expect.ok(!other || other.pose === a.pose, `${a.id} and ${other && other.id} share a wind-up`); seen.set(t, a); }
    expect.ok(d.phases.kindled.ignite && d.phases.kindled.opener === 'lanternBursts' && d.phases.kindled.attacks.includes('lanternBreath'), 'the lantern opens: he burns, and breathes its fire');
  });
  test('Moor: his figure carries the bar as a weapon and the lantern hangs plumb, its fire hidden until he burns', () => {
    const e = new A.Enemy(A.ENEMY_BY_ID.ostrey, { x: 0, z: 0, yaw: 0, behavior: 'arena', notice: 30 }), r = e.rig;
    try {
      expect.ok(MODEL_DEFS.oldOstrey.parts.some(p => p.weapon && p.mesh === 'ostrey:weapon__bar') && r.weaponMeshes?.some(m => m.material === r.weaponMat), 'the baked bar is his weapon');
      expect.ok(r.breathFrom === r.bones.lantern && r.bones.lantern.children.some(c => c.isSprite), 'breath and halo come from the lantern');
      expect.ok(r.burnMeshes.length > 0 && r.burnMeshes.every(m => !m.visible), 'the fire is shut in the lantern');
      // Raise his arm overhead: the lantern still hangs down (its bone keeps plumb under the fist).
      const q = new THREE.Quaternion(), down = new THREE.Vector3();
      r.armL.rotation.x = -3.0;
      for (let i = 0; i < 120; i++) r.anim.updateHang(e, { yaw: 0 }, 1 / 60);
      r.root.updateMatrixWorld(true);
      r.bones.lantern.getWorldQuaternion(q); down.set(0, -1, 0).applyQuaternion(q);
      expect.ok(down.y < -0.8, `the lantern hangs (its axis ${down.y.toFixed(2)} down)`);
    } finally { r.dispose?.(); }
  });
  test('Moor: the flock is blind and its bearer sees', () => {
    start();
    const thralls = Game.enemies.filter(e => e.baseDef.id === 'lanternThrall'), bearers = Game.enemies.filter(e => e.baseDef.id === 'lanternBearer');
    expect.ok(thralls.length >= 3 && bearers.length >= 1, `a flock on the moor (${thralls.length} thralls, ${bearers.length} bearers)`);
    const roaming = thralls.filter(e => e.behavior === 'patrol');
    expect.ok(roaming.length === 3 && roaming.every(e => e.notice <= 5), 'the roaming thralls notice only what is close');
    expect.ok(bearers.some(e => e.behavior === 'patrol' && e.notice >= 12), 'the bearer sees far');
  });
  test('Moor: killing Ostrey opens Thrale\'s gate and finishes the level', () => {
    start();
    const e = ostrey(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-ostrey');
    expect.ok(e && zone && !zone.gate.open && !Game.complete, 'shut at first');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }   // the fights before the bridge, won
    sim.place(e.x - 6, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.(); sim.step(0.5);
    for (let i = 0; i < 4 && e.alive(); i++) { e.deplete(); sim.step(1); sim.until(() => e.state !== ES.PHASE, 20); }
    sim.until(() => Game.complete, 4);
    expect.ok(!e.alive() && zone.gate.open && Game.complete, 'gate open, level complete');
  });
  test('Moor: Level 7 is written in the lore, Ysolde by the first bonfire', () => {
    const L = A.LORE ? A.LORE.levels['windward-moor'] : LORE.levels['windward-moor'];
    expect.ok(L.npcs.length === 1 && L.npcs[0].bonfire === 'moor-shrine' && L.npcs[0].lines.length === 6, 'Ysolde, six lines');
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    const R = terrainFor(A.LEVEL_7);
    for (const I of L.inscriptions) expect.ok(Math.abs(R.floorY(I.x, I.z, I.y || 0) - (I.y || 0)) < 0.5, `${I.id} stands on the floor`);
  });
})();
