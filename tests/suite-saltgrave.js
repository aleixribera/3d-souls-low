'use strict';
// ============================================================================
// Level 8: Saltgrave, Hale and Harrow and the Salt Knights (v7.40.0)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Saltgrave')`.
(function () {
  const A = window.__arena, { Game, ES } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('saltgrave'); Game.loading = 0; sim.begin(); };
  const twin = id => Game.enemies.find(e => e.baseDef.id === id);
  const arrive = () => {   // the fights before the roof won, the player at the castellans
    const zone = Game.zones.find(z => z.id === 'zone-castellans');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }
    const p = Game.player, h = twin('hale');
    sim.place(140, 112, 10); p.yaw = 0; p.hp = p.maxHp = 1e6; h.wake?.(); twin('harrow').wake?.(); sim.step(0.5);
    return zone;
  };
  test('Saltgrave: Level 8 follows the moor, as chapter 8 of the Story', () => {
    const i = A.LEVELS.findIndex(l => l.id === 'saltgrave');
    expect.ok(i > 0 && A.LEVELS[i - 1].id === 'windward-moor', 'listed after the moor');
    expect.ok(A.STORY.chapters[7].level === 'saltgrave' && A.STORY.chapters[7].title === 'SALTGRAVE', 'chapter 8 of the Story');
    expect.ok(A.LEVEL_7.next === 'saltgrave', 'the Levels menu carries on from the moor too');
  });
  test('Saltgrave: the castellans have their own moves and poses, every hit within the boss rules, the halves apart', () => {
    const others = new Set(ENEMY_DEFS.filter(d => d.id !== 'hale' && d.id !== 'harrow').flatMap(d => d.attacks.map(a => a.pose)).filter(Boolean));
    for (const id of ['hale', 'harrow']) {
      const d = A.ENEMY_BY_ID[id], ids = new Set(d.attacks.map(a => a.id));
      for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.2, `${id} ${a.id}: active ${h.active}`);
      for (const a of d.attacks) expect.ok(a.pose && ATTACK_POSES[a.pose] && !others.has(a.pose), `${id} ${a.id}: its own key poses (${a.pose})`);
      for (const P of Object.values(d.phases)) for (const m of P.attacks) expect.ok(ids.has(m), `${id}: phase move ${m} exists`);
      for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${id}: ${a.id} follows up into ${f.attack}`);
      const [pair, alone] = d.defaultPhases.map(p => d.phases[p]);
      expect.ok(alone.alone === true && alone.opener === 'sistersHalf' && alone.attacks.length > pair.attacks.length, `${id}: alone she takes up both halves`);
    }
    const hale = A.ENEMY_BY_ID.hale.phases.helm.attacks, harrow = A.ENEMY_BY_ID.harrow.phases.greaves.attacks;
    expect.ok(!hale.some(m => harrow.includes(m)), 'no move shared between the halves');
    expect.ok(new Set([...hale, ...harrow].map(m => A.ENEMY_BY_ID.hale.attacks.find(a => a.id === m).pose)).size === hale.length + harrow.length, 'every wind-up its own');
    expect.ok(MODEL_DEFS.castellanHale.parts.every(p => p.use === 'baked') && MODEL_DEFS.castellanHarrow.parts.every(p => p.use === 'baked'), 'both figures from Blender');
  });
  test('Saltgrave: the castellans cue each other: Harrow\'s stamps bring down Hale\'s cleave', () => {
    start(); arrive();
    const h = twin('hale'), r = twin('harrow'), p = Game.player, rnd = Math.random;
    for (const e of [h, r]) { e.chooseAttack = e.react = e.breakOff = () => null; e.cooldown = 0; }
    sim.place(140, 118, 10); h.x = 139; h.z = 120; r.x = 142; r.z = 121; h.setState(ES.CHASE); r.setState(ES.CHASE); sim.step(0.1);
    try {
      Math.random = () => 0;   // the cue's chance always answers
      r.beginAttack(r.def.attacks.find(a => a.id === 'stampStones'));
      expect.ok(h.cued && h.cued.attack === 'crownCleave', `Hale is cued (${JSON.stringify(h.cued)})`);
      sim.until(() => h.attack && h.attack.id === 'crownCleave', 2);
      expect.ok(h.attack && h.attack.id === 'crownCleave' && r.attack && r.attack.id === 'stampStones', `both at once (${h.attack && h.attack.id}, ${r.attack && r.attack.id})`);
      Math.random = rnd;
      // a cue is dropped once she leaves the chase
      h.attack = null; h.x = 139; h.z = 120; h.setState(ES.CHASE); r.setState(ES.CHASE); sim.place(140, 118, 10); sim.step(0.1); Math.random = () => 0;
      r.beginAttack(r.def.attacks.find(a => a.id === 'stampStones'));
      expect.ok(h.cued, 'cued again'); h.setState(ES.HURT);
      expect.ok(!h.cued, 'a flinch drops the cue');
    } finally { Math.random = rnd; }
  });
  test('Saltgrave: the twins fight together; when one falls the other takes up her half, on the same bar', () => {
    start(); arrive();
    const h = twin('hale'), r = twin('harrow');
    expect.ok(h && r && h.awake() && r.awake(), 'both awake on the roof');
    expect.ok(h.def.phaseId === 'helm' && r.def.phaseId === 'greaves', `each in her half (${h.def.phaseId}, ${r.def.phaseId})`);
    r.hp = r.def.hp * 0.4; const left = r.hp;
    h.deplete(); sim.step(1);
    expect.ok(!h.alive(), 'Hale falls with her one bar, no second one');
    sim.step(0.2);
    expect.ok(r.def.phaseId === 'whole' && Math.abs(r.hp - left) < 1, `Harrow takes up the whole suit, keeping her wounds (${r.def.phaseId}, ${Math.round(r.hp)} of ${Math.round(left)})`);
    expect.ok(r.def.attacks.some(a => a.id === 'crownCleave'), 'with her sister\'s moves');
    // She kneels first, untouchable, in her own half; the helm, the breastplate and the axe are on her as she rises.
    const R = r.rig, shown = sl => (R.slotMeshes[sl] || R.weaponSlotMeshes[sl]).visible;
    sim.until(() => r.attack && r.attack.id === 'sistersHalf', 6);
    expect.ok(r.attack && r.attack.id === 'sistersHalf' && r.invulnerable(), 'she kneels by her sister, untouchable');
    sim.step(0.5); Game.render(1, CONFIG.step);
    expect.ok(!shown('helmGilt') && !shown('haft') && shown('skin'), 'still in her own half while she kneels');
    sim.until(() => r.state !== ES.WINDUP, 4); Game.render(1, CONFIG.step);
    expect.ok(shown('helmGilt') && shown('helmSteel') && shown('haft') && !shown('skin') && !shown('hair'), 'risen in the whole suit, the axe in her hands');
  });
  test('Saltgrave: a death resets the pair, and killing both opens the roof and finishes the level', () => {
    start(); let zone = arrive();
    twin('hale').deplete(); sim.step(1);
    expect.ok(!twin('hale').alive() && !zone.gate.open, 'one down, the way still shut');
    Game.respawnEnemies(); sim.step(0.2);
    expect.ok(twin('hale').alive() && twin('harrow').alive() && twin('harrow').def.phaseId === 'greaves', 'both stand again, each in her half');
    zone = arrive();
    // Harrow, left alone, kneels untouchable through her sister's half: a second between tries outlasts it.
    for (const e of [twin('hale'), twin('harrow')]) for (let i = 0; i < 10 && e.alive(); i++) { e.deplete(); sim.seconds(1); sim.until(() => e.state !== ES.PHASE, 20); }
    sim.until(() => Game.complete, 4);
    expect.ok(zone.gate.open && Game.complete, `gate open, level complete (${zone.gate.open}, ${Game.complete}; ${Game.zones.filter(z => !z.gate.open).map(z => z.id)}; ${zone.actors.map(a => `${a.baseDef.id} ${a.state} ${a.def.phaseId} ${Math.round(a.hp)}`)})`);
  });
  test('Saltgrave: in the Arena a castellan fought alone is the whole castellan, and a pair fought together each keep a half', () => {
    Game.startFight('hale'); Game.loading = 0; sim.begin(); sim.step(0.2);
    expect.ok(Game.duel.def.phaseId === 'whole' && Math.abs(Game.duel.hp - Game.duel.def.hp) < 1, `alone from the start, on her one bar (${Game.duel.def.phaseId})`);
    Game.startFight('hale', ['harrow']); Game.loading = 0; sim.begin(); sim.step(0.2);
    expect.ok(Game.enemies.length === 2 && Game.enemies.every(e => e.def.phaseId !== 'whole'), `together each in her half (${Game.enemies.map(e => e.def.phaseId)})`);
  });
  // Pass 138 (docs/bosses/castellans.md): alone, she is a fight of her own: the pair's calls answered by one body, and the
  // moves only the whole suit can make; each sister has 8 moves, and at most a quarter of any fight's can't be parried.
  test('Saltgrave: alone, the whole castellan answers her own calls, with moves of her own', () => {
    for (const id of ['hale', 'harrow']) {
      const d = A.ENEMY_BY_ID[id], [pair, alone] = d.defaultPhases.map(p => d.phases[p]), by = m => d.attacks.find(a => a.id === m);
      expect.ok(pair.attacks.length === 8, `${id}: 8 moves of her own (${pair.attacks.length})`);
      expect.ok(['vaultHaft', 'gauntletHold', 'stampStonesAlone', 'wallTurnsAlone'].every(m => alone.attacks.includes(m) && !pair.attacks.includes(m)), `${id}: the whole suit's own moves`);
      const names = new Map([...pair.attacks, ...alone.attacks].map(m => [by(m).name, by(m)]));
      const shut = [...names.values()].filter(a => a.noParry || a.rollOnly || a.hits.every(h => h.noParry)).length;
      expect.ok(shut / names.size <= 0.25, `${id}: ${shut} of ${names.size} moves can't be parried`);
    }
    Game.startFight('harrow'); Game.loading = 0; sim.begin(); sim.step(0.2);
    const e = Game.duel, p = Game.player, rnd = Math.random;
    p.hp = p.maxHp = 1e6;
    expect.ok(sim.until(() => !e.attack && e.state === ES.CHASE, 8) >= 0, `she rises and closes in (${e.state}, ${e.attack && e.attack.id})`);
    e.chooseAttack = e.react = e.breakOff = () => null;
    const near = () => { p.x = p.px = e.x + Math.sin(e.yaw) * 3; p.z = p.pz = e.z + Math.cos(e.yaw) * 3; p.hp = 1e6; return false; };
    try {
      Math.random = () => 0;
      e.beginAttack(e.attackById('stampStonesAlone'));
      sim.until(() => near() || (e.attack && e.attack.id === 'crownCleave'), 8);
      expect.ok(e.attack && e.attack.id === 'crownCleave', `her stamps bring her own cleave down (${e.attack && e.attack.id})`);
    } finally { Math.random = rnd; }
  });
  // Pass 139 (system.md 4: nothing washes the body in a wind-up): every wind-up glows on what strikes. The axe's on its
  // head, the fists' and greaves' on the gauntlet, elbow, knee or toe, and a heavy's halo grows there; the body keeps its colour.
  test('Saltgrave: the castellans\' wind-ups glow on the axe head, gauntlet or greave, never over the body', () => {
    for (const id of ['hale', 'harrow']) for (const ph of A.ENEMY_BY_ID[id].defaultPhases) {
      Game.startFight(id); Game.loading = 0; sim.begin();
      const e = Game.duel, r = e.rig;
      e.phaseIds = A.ENEMY_BY_ID[id].defaultPhases; e.enterPhase(e.phaseIds.indexOf(ph));   // (fought alone she starts whole)
      const own = e.def.attacks;
      expect.ok(own.every(a => a.hits.every(h => !h.tell || r.tellGlows[h.tell])), `${id} ${ph}: every named tell is on her`);
      for (const a of own.filter(a => a.heavy)) {
        const h = a.hits[0], g = h.tell ? r.tellGlows[h.tell] : r.warnGlow;
        const at = f => { e.attack = a; e.hitIndex = 0; e.holdLeft = 0; e.setState(ES.WINDUP); e.stateTime = h.startup * f; Game.render(0, CONFIG.step); return g.scale.x; };
        const early = at(0.2), late = at(0.95);
        expect.ok(r.bodyMats.every(m => m.emissive.r + m.emissive.g + m.emissive.b < 0.01), `${id} ${a.id}: no heavy tint on the body`);
        expect.ok(g.visible && late > early * 1.2, `${id} ${a.id}: the halo on ${h.tell || 'the axe head'} grows (${early.toFixed(2)} to ${late.toFixed(2)})`);
        if (h.tell) expect.ok(!r.warnGlow.visible, `${id} ${a.id}: the axe stays dark while the ${h.tell} strikes`);
      }
    }
  });
  test('Saltgrave: the old road is gone from the fortress', () => {
    const ids = new Set([...A.LEVEL_8.gated.flatMap(z => z.enemies.map(m => m.enemy)), ...A.LEVEL_8.dispersed.map(s => s.enemy)]);
    for (const old of ['graftedScion', 'omenkin', 'godrick']) expect.ok(!ids.has(old), `no ${old}`);
    expect.ok(ids.has('saltKnight') && ids.has('hale') && ids.has('harrow'), 'Salt Knights and the castellans');
    expect.ok(!/Godrick|Stormveil|Rune/i.test(JSON.stringify(A.LEVEL_8)), 'no names of the old road');
  });
  test('Saltgrave: Level 8 is written in the lore, Ysolde by the first bonfire, the garrison kneeling in stone', () => {
    const L = LORE.levels.saltgrave;
    expect.ok(L.npcs.length === 1 && L.npcs[0].bonfire === 'salt-gate' && L.npcs[0].lines.length === 6, 'Ysolde, six lines');
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    expect.ok(L.scenes.filter(s => s.kind === 'statue' && s.of === 'saltKnight' && s.pose === 'kneel').length === 6, 'six kneeling statues');
    start();
    const statues = A.lore.state.scenes.filter(s => s.rig && s.def.of);
    expect.ok(statues.length === 6 && statues.every(s => s.rig.statue && s.rig.mats.length > 0), `the statues are built (${statues.length})`);
  });
})();
