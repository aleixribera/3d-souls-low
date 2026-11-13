'use strict';
// ============================================================================
// Level 12: the Torn Abbey, Mother Agathe, the Rending Hand (her own since pass 48) and the Rending Brothers (v7.48.0)
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
  // A fight with her alone, the player 3 m before her, both facing; the player cannot die.
  const duel = () => {
    Game.startFight('agathe'); sim.begin();
    const e = Game.duel, p = Game.player; p.hp = p.maxHp = 1000; e.cooldown = 99;
    e.x = e.px = p.x; e.z = e.pz = p.z + 3; e.y = p.y; e.yaw = Math.PI; p.yaw = 0;
    return { e, p };
  };
  test('Torn Abbey: Agathe fights with her own moves, each with its own wind-up; the storm comes at half (pass 48)', () => {
    const d = A.ENEMY_BY_ID.agathe, ids = new Set(d.attacks.map(a => a.id)), M = MALIKETH;
    for (const a of d.attacks) for (const h of a.hits) if (!(h.box || a.box).ring) expect.ok(h.active <= 0.26, `${a.id}: active ${h.active}`);
    for (const P of Object.values(d.phases)) for (const id of P.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    expect.ok(d.attacks.every(a => a.pose && a.pose.startsWith('agathe')), 'no borrowed moves: every pose is hers');
    // Every move opens on its own wind-up (the crook's punish is the crook; the storm's furrow opens as rend the earth does).
    const tell = a => JSON.stringify(['armR', 'elbowR', 'weapon', 'armL', 'elbowL', 'spin', 'legL', 'legR'].map(b => ATTACK_POSES[a.pose].hits[0].windup[b]));
    const same = (x, y) => x.pose === y.pose || [x.id, y.id].sort().join() === 'rendEarth,stormFurrow';
    const seen = new Map();
    for (const a of d.attacks) { const t = tell(a), other = seen.get(t); expect.ok(!other || same(a, other), `${a.id} and ${other && other.id} share a wind-up`); seen.set(t, a); }
    expect.ok(d.hp === 3200 && d.posture.max === 84 && d.posture.parry === 60 && d.poise === 240, 'her health and posture are kept until every boss is reworked');
    const S = d.phases.storm, R = d.phases.abbess;
    expect.ok(S.at === 0.5 && S.opener === 'stormComes' && S.name === 'Agathe, the Storm at Her Back' && S.storm && S.rend && !R.storm && !R.rend,
      'at half her strength the storm comes at her back, and every blow of the hook rends');
    expect.ok(d.attacks.find(a => a.id === 'stormComes').invulnerable, 'she cannot be hurt through the change');
    const rends = R.attacks.map(id => d.attacks.find(a => a.id === id)).filter(a => a.rend);
    expect.ok(rends.length >= 4 && rends.every(a => !a.projectile), `in the first half her hook's blade rends (${rends.map(a => a.id)})`);
    expect.ok(['correction', 'rendEarth', 'tornStones', 'cornerstone', 'stormComes', 'stormFurrow'].every(id => d.attacks.find(a => a.id === id).rend === false),
      'the butt, the stones and the torn earth never rend');
    const bolts = d.attacks.filter(a => a.hits.some(h => h.bolt));
    expect.ok(bolts.length >= 2 && bolts.every(a => !R.attacks.includes(a.id) && S.attacks.includes(a.id)), 'the storm falls where you stand, only once it has come');
    expect.ok(!OLD.test(JSON.stringify(d.attacks.map(a => a.name)) + JSON.stringify(Object.values(d.phases).map(p => p.name || '')) + d.name + d.description),
      'no names of the old road');
    expect.ok(BOSS_FX.agathe && BOSS_FX.agathe.phases.storm === 'storm', 'her effects are written, the storm\'s once it comes');
    expect.ok(M.attacks.some(a => a.id === 'shedRobes') && M.name === 'Beast Clergyman' && M.phases.blackBlade.reveal, 'Maliketh himself is untouched');
  });
  test('Torn Abbey: what her hook tears off your bar it keeps; a blow on her tears it back; left there it closes (pass 48)', () => {
    const { e, p } = duel(), C = CONFIG.rend;
    e.beginAttack(e.attackById('reapingDraw')); e.holdLeft = 0;
    sim.until(() => p.rent > 0, 5);
    expect.ok(p.rent === 1 && p.rentBy === e && Math.abs(p.hpCap() - p.maxHp * (1 - C.cut)) < 1e-6 && p.hp <= p.hpCap(), `a piece torn off (${p.rent}, cap ${p.hpCap()})`);
    sim.until(() => e.state !== ES.ACTIVE && e.state !== ES.WINDUP, 5);
    // Struck back: each blow on her tears one piece back, as health.
    const held = p.rent, before = p.hp;
    expect.ok(held === 2, `both blows of the reaping draw tore a piece (${held})`);
    sim.seconds(VIS.stormRend.fly + 0.1, 1);   // past their flight: on the hook
    expect.ok(stormRend.live().pieces === 2, `the pieces hang on her hook (${JSON.stringify(stormRend.live())})`);
    for (let k = held; k > 0; k--) {
      e.cooldown = 99; e.x = e.px = p.x; e.z = e.pz = p.z + 1.6; p.yaw = 0; p.setState(PS.IDLE);
      sim.press('light'); sim.until(() => p.rent < k, 3);
      expect.ok(p.rent === k - 1, `one piece back per blow (${p.rent} left)`);
      sim.until(() => p.state === PS.IDLE, 3);
    }
    expect.ok(p.rent === 0 && p.rentBy === null && p.hpCap() === p.maxHp && p.hp > before, `torn back as health (${before} -> ${p.hp})`);
    // The butt never rends.
    sim.until(() => p.state === PS.IDLE, 3);
    p.hp = p.maxHp; e.cooldown = 99; e.x = e.px = p.x; e.z = e.pz = p.z + 2.4; e.yaw = Math.PI; e.state = ES.IDLE;
    e.beginAttack(e.attackById('correction'));
    sim.until(() => p.hp < p.maxHp, 4);
    expect.ok(p.hp < p.maxHp && p.rent === 0, 'the correction hurts, and tears nothing');
    // Left on her hook, the wound closes; the bar comes back empty.
    sim.until(() => e.state === ES.CHASE || e.state === ES.IDLE, 6); e.cooldown = 999; e.x = e.px = p.x + 30;   // done with her recovery, which sets her cooldown
    p.hp = p.maxHp; p.rend(e); p.rend(e); p.rend(e); p.rend(e);
    expect.ok(p.rent === C.max, `at most ${C.max} pieces (${p.rent})`);
    sim.seconds(C.time + 0.5);
    expect.ok(p.rent === 0 && p.hpCap() === p.maxHp && p.hp <= p.maxHp * (1 - C.max * C.cut) + 1e-6, `closed, the bar empty there (hp ${p.hp}, rent ${p.rent}, ${p.rentTime.toFixed(1)} s, cap ${p.hpCap()}, she ${e.state} ${e.attack && e.attack.id})`);
    // She falls: all she held comes back.
    p.rend(e); p.rend(e); const low = p.hp;
    e.deplete(); sim.step(2);
    expect.ok(p.rent === 0 && p.hp > low, `on her death every piece comes back (${low} -> ${p.hp})`);
  });
  test('Torn Abbey: in the storm a mark follows you, holds still, and is struck: step off it (pass 48)', () => {
    const { e, p } = duel();
    for (const m of e.rig.stormMeshes) expect.ok(!m.visible, 'no storm on her at first');
    e.hp = e.def.hp * 0.49; e.cooldown = 0;
    sim.until(() => e.def.phaseId === 'storm' && e.state !== ES.PHASE && !(e.attack && e.attack.invulnerable), 12);
    sim.step(1, 1);
    expect.ok(e.def.storm && e.rig.stormMeshes.length >= 2 && e.rig.stormMeshes.every(m => m.visible), 'the storm seams her hook and the sign on her breast');
    sim.place(p.x, p.z, p.y); p.hp = p.maxHp; p.rent = 0; p.rentBy = null;
    e.cooldown = 99; e.attack = null; e.hitbox = null; e.state = ES.IDLE;
    e.x = e.px = p.x; e.z = e.pz = p.z + 8; e.y = p.y; e.yaw = Math.PI;
    e.beginAttack(e.attackById('stormKnows'));
    expect.ok(!canParryHit(e.attack, 0) && !canParryHit(e.attackById('stormFurrow'), 1), 'lightning cannot be parried');
    sim.seconds(0.2, 1);
    expect.ok(e.bolt && !e.bolt.locked && Math.hypot(e.bolt.x - p.x, e.bolt.z - p.z) < 0.01, 'the mark is where you stand');
    expect.ok(stormRend.live().marks >= 1, `the mark is drawn (${JSON.stringify(stormRend.live())})`);
    sim.place(p.x + 0.6, p.z, p.y); sim.step(1);
    expect.ok(Math.hypot(e.bolt.x - p.x, e.bolt.z - p.z) < 0.01, 'it follows you');
    sim.until(() => e.bolt.locked, 2);
    const mark = { x: e.bolt.x, z: e.bolt.z };
    sim.place(p.x + 4, p.z, p.y);   // step off it
    sim.until(() => e.state === ES.ACTIVE, 3);
    expect.ok(e.hitbox && Math.hypot(e.hitbox.center().x - mark.x, e.hitbox.center().z - mark.z) < 1e-6, 'struck where the mark lay');
    sim.until(() => e.hitIndex === 1, 3);
    expect.ok(p.hp === p.maxHp, `stepped off, untouched (${p.hp})`);
    // The second: stand still on it.
    sim.until(() => e.state === ES.ACTIVE && e.hitIndex === 1, 3);
    sim.until(() => p.hp < p.maxHp || e.hitIndex !== 1, 1);
    expect.ok(p.hp < p.maxHp && p.rent === 0, `stood on it: struck, and lightning tears nothing (${p.hp}, rent ${p.rent})`);
    // In the storm the butt still tears nothing; a blow of the hook with no `rend` of its own does (the phase's).
    const close = id => {
      sim.until(() => e.state === ES.CHASE || e.state === ES.IDLE, 8);
      p.hp = p.maxHp; e.cooldown = 99; e.x = e.px = p.x; e.z = e.pz = p.z + 2.4; e.yaw = Math.PI; p.yaw = 0;
      e.beginAttack(e.attackById(id)); sim.until(() => p.hp < p.maxHp, 4);
    };
    close('correction');
    expect.ok(p.hp < p.maxHp && p.rent === 0, `the correction hurts in the storm too, and tears nothing (rent ${p.rent})`);
    expect.ok(!('rend' in e.attackById('galeReap')), 'the gale reap has no rend of its own');
    close('galeReap');
    expect.ok(p.hp < p.maxHp && p.rent === 1, `the gale reap tears, the storm's rend (rent ${p.rent})`);
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
