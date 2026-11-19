'use strict';
// ============================================================================
// Vesper, the Pale Meridian (in-page visual, rig, spin-bone, prism renderer & mode checks)
// ============================================================================
// Loaded after tests/suite.js (only with #dev): `await __arena.tests.run('Vesper')`.
(function () {
  const A = window.__arena, { Game, CONFIG } = A, { sim, expect, test } = A.tests;
  const STEP = CONFIG.step;

  test('Vesper: visual data, baked model, spin bones and Phase 2 eclipse reveal', () => {
    sim.begin();
    const errs = validateData({ visual: true });
    expect.ok(errs.length === 0, `validateData({ visual: true }) failed: ${errs.join('; ')}`);
    const parts = KIT.modelParts('paleMeridian');
    expect.ok(parts.tris > 4000 && parts.tris <= 14000, `paleMeridian tris (${parts.tris}) within boss budget`);

    Game.startFight('vesper'); Game.loading = 0;
    const e = Game.enemies[0], p = Game.player;
    p.maxHp = p.hp = 1e5;
    expect.ok(!!e.rig && !!e.rig.bones.haloA && !!e.rig.bones.haloB, 'astrolabe halo bones exist on rig');
    // Phase 1 hides eclipse slots; astrolabe halo bones spin over frames.
    const a0 = e.rig.bones.haloA.rotation.z, b0 = e.rig.bones.haloB.rotation.z;
    for (let i = 0; i < 30; i++) { Game.update(STEP); Game.render(1, STEP); }
    expect.ok(e.rig.bones.haloA.rotation.z !== a0 && e.rig.bones.haloB.rotation.z !== b0, 'haloA and haloB counter-rotate');
    expect.ok(Math.sign(e.rig.bones.haloA.rotation.z - a0) !== Math.sign(e.rig.bones.haloB.rotation.z - b0), 'halo rings spin in opposite directions');

    // Phase 2 reveals hidden eclipse slots & plants 3 prisms rendered by astralPrisms.
    e.hp = e.def.hp * 0.45; e.checkPhaseAt(); e.cooldown = 0; e.opener = null;
    const op = e.def.attacks.find(a => a.id === 'eclipseOpen');
    e.beginAttack(op);
    for (let i = 0; i < Math.round(op.hits[0].startup * 60) + 12; i++) { Game.update(STEP); Game.render(1, STEP); }
    expect.ok(e.rig.revealed === true, 'Phase 2 reveals eclipse slots');
    expect.ok(e.prisms.length === 3, `eclipseOpen plants 3 prisms (got ${e.prisms.length})`);
    const live = astralPrisms.live();
    expect.ok(live.shells === 3 && live.crystals === 6 && live.halos === 6, `astralPrisms draws all 3 prisms (${JSON.stringify(live)})`);
  });

  test('Vesper: astralPrisms renders sightlines, fired lances and clears on Counter shatter', () => {
    sim.begin();
    Game.startFight('vesper'); Game.loading = 0;
    const e = Game.enemies[0], p = Game.player;
    p.maxHp = p.hp = 1e5;
    e.x = e.px = 0; e.z = e.pz = 0; e.yaw = 0; e.cooldown = 99; e.setState(ES.IDLE);
    p.x = p.px = 0; p.z = p.pz = 5;
    e.prisms.length = 0;
    e.prisms.push(
      { x: -3.5, y: 0, fy: 1.55, z: 3.5, aimX: 0, aimZ: 5, locked: false, aimKey: -1, age: 1, no: ++e.prismNo },
      { x: 3.5, y: 0, fy: 1.55, z: 3.5, aimX: 0, aimZ: 5, locked: false, aimKey: -1, age: 1, no: ++e.prismNo },
    );
    const align = e.def.attacks.find(a => a.id === 'starAlignment');
    e.beginAttack(align);
    for (let i = 0; i < Math.round(align.hits[0].startup * 0.85 * 60); i++) { Game.update(STEP); Game.render(1, STEP); }
    const aimLive = astralPrisms.live();
    expect.ok(aimLive.beams >= 6, `locked sightlines drawn during wind-up (${JSON.stringify(aimLive)})`);
    while (e.state === ES.WINDUP) { Game.update(STEP); Game.render(1, STEP); }
    Game.update(STEP); Game.render(1, STEP);
    const fireLive = astralPrisms.live();
    expect.ok(fireLive.fired === 2 && fireLive.beams >= 6 && fireLive.shells === 2, `fired light-lances & origin anchors drawn (${JSON.stringify(fireLive)})`);

    // Counter shatter clears active prisms immediately.
    e.prisms.push({ x: 2, y: 0, fy: 1.55, z: 2, aimX: 0, aimZ: 0, locked: false, aimKey: -1, age: 1, no: ++e.prismNo });
    e.takeHit({ damage: 50, poise: 10, knock: 0, riposte: true }, p);
    expect.ok(e.prisms.length === 0, 'Counter shatters active prisms in browser');
  });

  test('Vesper: selectable in Practice (Bosses & Boss vs Boss) and absent from Story', () => {
    sim.begin();
    Game.showMenu('practiceBosses');
    expect.ok(Game.menuItems.some(it => it.name === 'Gemini, Neon High'), 'Gemini, Neon High listed in Practice -> Fight a boss');
    Game.showMenu('bossBattle');
    expect.ok(ENEMY_DEFS.filter(isBossDef).some(d => d.id === 'vesper'), 'Vesper available in Boss vs Boss');
    const inStory = STORIES.some(s => s.chapters.some(c => {
      const L = ALL_LEVELS.find(l => l.id === c.level);
      return (L.gated || []).some(g => g.enemy === 'vesper' || (g.enemies || []).some(m => m.enemy === 'vesper'))
        || (L.dispersed || []).some(d => d.enemy === 'vesper');
    }));
    expect.ok(!inStory, 'Vesper is not in Story mode');
    Game.reset(); Game.showMenu('main');
  });
})();
