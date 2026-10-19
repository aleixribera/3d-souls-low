'use strict';
// ============================================================================
// Tests of the Lands Between (v7.0): the second Story road, its eight lands, its new enemies, its set pieces and menus
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Lands')`.
(function () {
  const A = window.__arena, { Game, CONFIG } = A, { sim, expect, test } = A.tests;
  const STEP = CONFIG.step;
  const sturdy = p => { p.maxHp = p.hp = 1e9; };
  const start = id => { Game.startLevel(id); Game.loading = 0; sim.begin(); };
  // Each land's way through, start to the boss's exit (x, z; the floor is whatever lies under the player there).
  // Trap lands walk on into their trap and carry on from where it drops them.
  const ROUTES = {
    stormhill: [[16, 0], [28, 0], [40, 0], [60, 0], [74, 0], [95, 0], [106, 2], [106, 6], [106, 2], [120, -2], [120, -6], [120, -2], [128, 0], [140, -6],
      [148, 12], [148, 16], [156, 16], [165, 16], [156, 16], [148, 16], [148, 10], [165, 0], [172, 0], [192, 0], [221, 0], [230, 0], [237, 0], [244, 0], [276, 0], [288, 0]],
    stormveil: [[15, 0], [30, -8], [33, -12], [33, -18], [33, -25], [50, -25], [68, -25], [86, -25], [100, -25], [128, -25], [136, -25], [137, -18],
      [137, -10], [137, 3], [137, 8], [140, 20], [140, 33], [140, 36], [140, 45], [140, 57], [140, 60], [140, 66], [140, 74], [140, 89], [140, 92], [140, 100], [140, 130], [140, 136]],
    evergaol: [[14, 0], [30, 0], [40, 0], [50, 0], [62, 0], [74, 0], [84, 0], [94, 0], [100, 0], [105, 0], [105, 6], [105, 24], [105, 34], [105, 44], [105, 56],
      [105, 66], [116, 66], [130, 66], [135, 66], [140, 66], [146, 66], [166, 66], [188, 66]],
    leyndell: [[16, 0], [40, 0], [70, 0], [80, 7], [100, 7], [110, 0], [120, 0], [132, 0], [142, 0], [160, 0], [160, 16], [160, 30], [160, 46], [160, 52], [160, 56],
      [160, 60], [160, 80], [160, 102]],
    'ashen-capital': [[14, 0], [40, 0], [60, 0], [75, 0], [84, 0], [87, -8], [87, -12], [87, -20], [87, -28], [87, -34], [100, -34], [110, -34], [135, -34], [160, -34],
      [180, -30], [180, -12], [180, -8], [180, 0], [180, 12], [180, 18], [180, 24], [180, 28], [180, 50], [180, 68]],
    'farum-azula': [[14, 0], [40, 0], [52, 0], [64, 0], [80, 0], [86, 0], [97, 0], [104, -6], [110, -11], [114, -11], [122, -11], [130, -11], [140, -8], [150, -2],
      [160, 0], [180, 0], [200, 0], [207, 0], [214, 0], [230, 0], [238, 0], [244, 0], [248, 0], [270, 0], [294, 0]],
    erdtree: [[16, 0], [44, 0], [60, 0], [72, 0], [90, 0], [105, 0], [105, 14], [105, 40], [103, 47], [103, 54], [103, 72], [105, 84], [120, 84], [150, 84], [157, 84],
      [164, 84], [168, 84], [190, 84], [210, 84]],
    haligtree: [[14, 0], [48, 0], [60, 0], [72, 0], [92, 0], [104, 0], [104, -12], [104, -26], [104, -40], [104, -47], [120, -47], [142, -47], [164, -47], [184, -47],
      [192, -47], [200, -47], [204, -47], [230, -47], [250, -47]],
  };
  const walk = (x, z, every, seconds = 30) => {
    const p = Game.player;
    const ok = sim.until(() => { if (every) every(); const dx = x - p.x, dz = z - p.z; if (Math.hypot(dx, dz) < 0.6) return true; sim.move(dx, dz); return false; }, seconds) >= 0;
    sim.move(null);
    return ok;
  };
  const at = p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`;
  const allOf = L => [...L.gated.flatMap(g => g.enemies), ...L.dispersed];

  // ---- the road -----------------------------------------------------------------------------------------------------
  test('Lands: the second road is eight lands, Stormhill to the Haligtree, one per Elden Ring boss in the boss select\'s order', () => {
    const S = A.LANDS_STORY, ids = S.chapters.map(c => c.level), lv = A.LANDS_LEVELS;
    expect.ok(ids.join() === 'stormhill,stormveil,evergaol,leyndell,ashen-capital,farum-azula,erdtree,haligtree', `chapters: ${ids}`);
    expect.ok(lv.map(l => l.id).join() === ids.join(), 'the Levels menu lists them in the same order');
    const bosses = lv.map(L => L.gated.flatMap(g => g.enemies).filter(m => A.ENEMY_BY_ID[m.enemy].phases).map(m => m.enemy));
    expect.ok(bosses.every(b => b.length === 1), 'one boss per land');
    expect.ok(bosses.map(b => b[0]).join() === A.ELDEN_BOSSES.map(e => e.enemy).join(), `bosses in order: ${bosses.map(b => b[0])}`);
    expect.ok(lv.every((L, i) => i === 0 || L.flasks >= lv[i - 1].flasks) && lv[0].flasks > A.PLAYER_DEF.inventory[0].max, 'more flasks than Ashmere, never fewer land to land');
    expect.ok(lv[lv.length - 1].ending === true && lv.slice(0, -1).every(L => !L.ending), 'the Haligtree alone has the ending');
    for (const L of lv) {
      expect.ok(L.bonfires.length >= 3, `${L.id}: ${L.bonfires.length} bonfires`);
      expect.ok((L.sealed || []).some(s => s.fog), `${L.id}: a fog gate before the boss`);
      const n = allOf(L).filter(m => !A.ENEMY_BY_ID[m.enemy].phases).length;
      expect.ok(n >= 13, `${L.id}: ${n} enemies besides the boss`);
    }
  });
  test('Lands: each land brings in its own new enemy (one each), and later lands use the earlier ones', () => {
    const order = ['omenkin', 'graftedScion', 'crucibleSquire', 'leyndellKnight', 'ashenWarrior', 'beastman', 'goldenZealot', 'cleanrotKnight'];
    const seen = new Set();
    A.LANDS_LEVELS.forEach((L, i) => {
      const used = new Set(allOf(L).map(m => m.enemy)), fresh = order.filter(id => used.has(id) && !seen.has(id));
      expect.ok(fresh.length === 1 && fresh[0] === order[i], `${L.id} introduces ${fresh.join(', ') || 'nothing'} (expected ${order[i]})`);
      for (const id of used) seen.add(id);
    });
    expect.ok(['farum-azula', 'erdtree', 'haligtree'].every(id => { const L = A.LANDS_LEVELS.find(l => l.id === id); return allOf(L).some(m => order.indexOf(m.enemy) >= 0 && order.indexOf(m.enemy) < order.indexOf(order[A.LANDS_LEVELS.indexOf(L)])); }),
      'the last lands bring back enemies of the earlier ones');
  });
  test('Lands: every land loads on Low, High and Ultra, draws its set pieces, and runs 5 s with rendering', () => {
    const was = settings.graphics;
    try {
      for (const q of ['low', 'high', 'ultra']) {
        A.visuals.setQuality(q);
        for (const L of A.LANDS_LEVELS) {
          start(L.id);
          const p = Game.player, y0 = p.y;
          sim.seconds(5, 10);
          // A NaN in the tree's glow attribute contaminates HDR bloom and blacks out the whole view.
          scene.traverse(o => {
            const glow = o.geometry?.attributes.glow;
            if (glow) expect.ok(glow.array.every(Number.isFinite), `${L.id} (${q}): scenery glow is finite`);
          });
          const info = A.realms.info();
          expect.ok(p.alive() && Math.abs(p.y - y0) < 0.01, `${L.id} (${q}): the player stands at the start`);
          expect.ok(info && info.beams === L.bonfires.length, `${L.id} (${q}): a grace beam over each bonfire`);
          if (L.realm.weather) expect.ok(info.weather.every(w => w.shown > 0 && w.shown <= w.max), `${L.id} (${q}): weather drawn within its pool`);
        }
      }
    } finally { A.visuals.setQuality(was === 'auto' ? autoQuality.effective() : was); }
  });
  test('Realms: set pieces follow the preset (fewer on Low, more on Ultra) and are rebuilt on a change', () => {
    const was = settings.graphics, shown = {};
    try {
      start('farum-azula');
      for (const q of ['low', 'high', 'ultra']) { A.visuals.setQuality(q); const i = A.realms.info(); shown[q] = { w: i.weather[0].shown, f: i.floaters }; }
      expect.ok(shown.low.w < shown.high.w && shown.high.w < shown.ultra.w, `weather: ${shown.low.w} / ${shown.high.w} / ${shown.ultra.w}`);
      expect.ok(shown.low.f < shown.high.f && shown.high.f < shown.ultra.f, `floaters: ${shown.low.f} / ${shown.high.f} / ${shown.ultra.f}`);
      start('long-hall');
      expect.ok(A.realms.info() === null, 'Ashmere draws no realm');
    } finally { A.visuals.setQuality(was === 'auto' ? autoQuality.effective() : was); }
  });

  // ---- walking the lands ------------------------------------------------------------------------------------------------
  test('Lands: every land is walkable from its start to the boss\'s exit, the gates open (the trap lands through their traps)', () => {
    for (const L of A.LANDS_LEVELS) {
      start(L.id); sim.clearEnemies(); sturdy(Game.player);
      for (const g of world.gates) if (!g.id.endsWith('-fog')) { g.open = true; g.lift = 1; }
      for (const [x, z] of ROUTES[L.id]) expect.ok(walk(x, z, null, 25), `${L.id}: walked to (${x}, ${z}); stuck at ${at(Game.player)}`);
      expect.ok(Game.player.alive(), `${L.id}: alive at the end`);
    }
  });
  test('Lands: Stormveil corridor walls stop falls; the trap cellar walls remain visible below the houses', () => {
    start('stormveil'); sim.clearEnemies();
    for (const [x, y] of [[56, 0], [78, 4], [108, 8]]) {
      sim.place(x, -25, y); sim.move(0, -1); sim.seconds(2, 6); sim.move(null);
      expect.ok(Game.player.alive() && Game.player.z > -28 && Game.player.y >= y - 0.5, `corridor at x ${x}: outer wall stops a fall`);
    }
    start('ashen-capital'); sim.clearEnemies();
    scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(75, -3, 0), new THREE.Vector3(0, 0, 1), 0, 8);
    ray.camera = A.camera;
    const hit = ray.intersectObject(stage.group, true)[0];
    expect.ok(hit && Math.abs(hit.point.z - 6) < 0.1, 'the north cellar wall is drawn below the street houses');
    sim.place(75, 0, -5); sim.move(0, 1); sim.seconds(2, 6); sim.move(null);
    expect.ok(Game.player.alive() && Game.player.z < 6 && Game.player.y === -5, 'the cellar wall keeps the player on its floor');
  });

  test('Lands: a scripted run wakes every fight, opens every gate in turn, and every enemy comes for the player', () => {
    for (const L of A.LANDS_LEVELS) {
      start(L.id); const p = Game.player; sturdy(p);
      const engaged = new Set(), all = new Set(Game.enemies.filter(e => !e.phaseIds));
      const route = ROUTES[L.id], boss = Game.enemies.find(e => e.phaseIds);
      for (const [x, z] of route) {
        const ok = walk(x, z, () => {
          for (const e of Game.enemies) if (e.alive() && !e.phaseIds && e.fightingPlayer()) { engaged.add(e); e.die(); }
          if (boss && boss.alive() && boss.fightingPlayer()) { engaged.add(boss); boss.deplete(); }
        }, 40);
        expect.ok(ok, `${L.id}: reached (${x}, ${z}); stuck at ${at(p)} (gates: ${Game.zones.map(z => z.id + (z.gate.open ? '+' : '-')).join(' ')})`);
      }
      sim.until(() => { if (boss.alive()) boss.deplete(); return !boss.alive(); }, 30);
      expect.ok(!boss.alive() && engaged.has(boss), `${L.id}: the boss fought and fell`);
      sim.step(2);
      expect.ok(Game.zones.every(z => z.gate.open) && Game.complete, `${L.id}: every gate open, the land complete`);
      const missed = [...all].filter(e => !engaged.has(e)).map(e => `${e.def.id}@${e.home.x.toFixed(0)},${e.home.z.toFixed(0)}`);
      expect.ok(!missed.length, `${L.id}: never came for the player: ${missed.join(' ')}`);
    }
  });
  test('Lands: no enemy is stuck: each fight\'s enemies reach a player standing just inside it', () => {
    for (const L of A.LANDS_LEVELS) {
      for (const g of L.gated.filter(g => !g.enemies.some(m => A.ENEMY_BY_ID[m.enemy].phases))) {
        start(L.id); const p = Game.player; sturdy(p);
        for (const z of Game.zones) if (z.id !== g.id) { z.gate.open = true; z.gate.lift = 1; }
        const zone = Game.zones.find(z => z.id === g.id), r = Array.isArray(g.trigger[0]) ? g.trigger[0] : g.trigger;
        // Where the way first enters the fight, on its floor (as the player comes in).
        const y = zone.actors.length ? zone.actors[0].home.y : 0;
        const inside = (px, pz) => (Array.isArray(g.trigger[0]) ? g.trigger : [g.trigger]).some(q => px > q[0] + 1.5 && px < q[1] - 1.5 && pz > q[2] + 1.5 && pz < q[3] - 1.5);
        const [x, zz] = ROUTES[L.id].find(([px, pz]) => inside(px, pz) && Math.abs(world.floorY(px, pz, y + 0.5) - y) < 0.6) || [r[0] + 1.5, (r[2] + r[3]) / 2];
        sim.place(x, zz, y + 0.2);
        const reached = new Set();
        sim.until(() => {
          for (const e of zone.actors) if (e.alive() && (e.in('attacking') || Math.hypot(e.x - p.x, e.z - p.z) < e.radius + p.radius + 2.2)) reached.add(e);
          return zone.actors.every(e => reached.has(e));
        }, 30);
        const late = zone.actors.filter(e => !reached.has(e)).map(e => `${e.def.id} at ${at(e)} (${e.state})`);
        expect.ok(!late.length, `${L.id} ${g.id}: never reached the player at ${at(p)}: ${late.join(', ')}`);
      }
    }
  });
  test('Lands: no enemy is stuck: every melee enemy outside the fights (patrols, sleepers, sentries, perchers) reaches a player on the way', () => {
    for (const L of A.LANDS_LEVELS) {
      L.dispersed.forEach((s, i) => {
        if (A.ENEMY_BY_ID[s.enemy].attacks.some(a => a.projectile && a.range >= 20 && !a.spectral)) return;   // archers shoot from their posts (the run checks they engage)
        start(L.id); const p = Game.player; sturdy(p);
        for (const z of Game.zones) { z.gate.open = true; z.gate.lift = 1; }
        const e = Game.enemies.find(q => q.key === Game.placementKey(s));
        sim.clearEnemies(q => q === e);
        if (!e) return;
        const hy = e.home.y, perch = s.behavior === 'perch';   // a percher leaps down: any floor below it will do
        const near = ROUTES[L.id].map(([x, z]) => [x, z, world.floorY(x, z, hy + 0.5)]).filter(([, , y]) => perch ? y <= hy + 0.5 : Math.abs(y - hy) < 1)
          .sort((a, b) => Math.hypot(a[0] - e.home.x, a[1] - e.home.z) - Math.hypot(b[0] - e.home.x, b[1] - e.home.z))[0];
        expect.ok(!!near, `${L.id} ${s.enemy} #${i}: a point of the way on its floor`);
        sim.place(near[0], near[1], near[2] + 0.2);
        sim.step(1); e.wake(p);   // told where the player is (a narrow-sighted patrol may simply not have looked yet)
        let reached = false;
        sim.until(() => { reached = reached || e.in('attacking') || Math.hypot(e.x - p.x, e.z - p.z) < e.radius + p.radius + 2.2; return reached; }, 20);
        expect.ok(reached, `${L.id} ${s.enemy} #${i} (${s.behavior}): never reached the player at ${at(p)}; it is at ${at(e)} (${e.state})`);
      });
    }
  });
  // Where along the way a point lies: the index of the nearest point of the way (on its floor, if given).
  const wayIndex = (L, x, z, y) => {
    const W = ROUTES[L.id].map(([px, pz], i) => [i, Math.hypot(px - x, pz - z), world.floorY(px, pz, (y ?? 0) + 0.5)]);
    const same = W.filter(w => y === undefined || Math.abs(w[2] - y) < 1.5), list = same.length ? same : W;
    return list.sort((a, b) => a[1] - b[1])[0][0];
  };
  test('Lands: every bonfire is a safe place: with the way to it cleared, nothing comes for a player resting there', () => {
    for (const L of A.LANDS_LEVELS) for (const b of L.bonfires) {
      start(L.id); const p = Game.player; sturdy(p);
      const at = wayIndex(L, b.x, b.z, b.y ?? 0);   // won: every fight and enemy the way passes before it
      for (const z of Game.zones) if (wayIndex(L, z.gate.x, z.gate.z, z.gate.y) <= at) { z.gate.open = true; z.gate.lift = 1; z.beaten = true; }
      sim.clearEnemies(e => !(e.phaseIds && wayIndex(L, e.home.x, e.home.z, e.home.y) > at) && wayIndex(L, e.home.x, e.home.z, e.home.y) > at);
      sim.place(b.x + 1.2, b.z, b.y); sim.seconds(4);
      const on = Game.enemies.filter(e => e.alive() && e.fightingPlayer()).map(e => `${e.def.id}@${e.x.toFixed(0)},${e.z.toFixed(0)}`);
      expect.ok(!on.length && !!Game.canRest(), `${L.id} ${b.id}: ${on.length ? 'threatened by ' + on.join(' ') : 'cannot rest'}`);
    }
  });
  test('Lands: each boss waits in its arena; the fog seals behind the player and lifts with the boss\'s death', () => {
    for (const L of A.LANDS_LEVELS) {
      const zid = L.gated.find(g => g.enemies.some(m => A.ENEMY_BY_ID[m.enemy].phases)).id, last = L.bonfires[L.bonfires.length - 1];
      start(L.id); const p = Game.player; sturdy(p);
      for (const z of Game.zones) if (z.id !== zid) { z.gate.open = true; z.gate.lift = 1; for (const a of z.actors) a.rig.dispose(); Game.enemies = Game.enemies.filter(e => !z.actors.includes(e)); z.actors = []; z.beaten = true; }
      sim.clearEnemies(e => e.phaseIds);
      sim.place(last.x + 1.2, last.z, last.y);
      const boss = Game.enemies.find(e => e.phaseIds), home = { x: boss.x, z: boss.z };
      sim.seconds(3);
      expect.ok(boss.in('unaware') && Math.hypot(boss.x - home.x, boss.z - home.z) < 0.5, `${L.id}: the boss waits unseen while the player rests (${boss.state})`);
      expect.ok(!!Game.canRest(), `${L.id}: the last bonfire can be rested at`);
      const fog = world.gates.find(g => g.id.endsWith('-fog')), r = L.gated.find(g => g.id === zid).trigger;
      const inside = fog.box.x1 - fog.box.x0 < 1 ? [fog.x + Math.sign(((r[0] + r[1]) / 2) - fog.x) * 4, fog.z] : [fog.x, fog.z + Math.sign(((r[2] + r[3]) / 2) - fog.z) * 4];
      expect.ok(walk(inside[0], inside[1], null, 15), `${L.id}: walked through the fog to ${inside}; at ${at(p)}`);
      sim.seconds(1.5);
      expect.ok(!fog.open && boss.fightingPlayer(), `${L.id}: the fog sealed behind the player and the boss comes (${boss.state})`);
      sim.until(() => { if (boss.alive()) boss.deplete(); return !boss.alive(); }, 30);
      sim.step(5);
      expect.ok(fog.open && Game.zones.find(z => z.id === zid).gate.open, `${L.id}: fog and the exit open after the boss`);
    }
  });
  test('Lands: Seren waits by the first bonfire of every land, outside every fight; from the ashen capital on she is a spirit', () => {
    for (const L of A.LANDS_LEVELS) {
      const D = A.LORE.levels[L.id];
      expect.ok(D && D.npcs && D.npcs[0].who === 'seren' && D.npcs[0].bonfire === L.bonfires[0].id, `${L.id}: Seren by the first bonfire`);
      for (const N of D.npcs) {
        expect.ok(!L.gated.some(g => inArea(g.trigger, N.x, N.z)), `${L.id}: Seren at (${N.x}, ${N.z}) stands outside every fight`);
        const b = L.bonfires.find(q => q.id === N.bonfire);
        expect.ok(Math.hypot(b.x - N.x, b.z - N.z) < 12, `${L.id}: she stands by her bonfire`);
      }
      expect.ok(D.npcs.every(N => !!N.spirit === (A.LANDS_LEVELS.indexOf(L) >= 4)), `${L.id}: a spirit only after the Erdtree burns`);
      expect.ok((D.inscriptions || []).length >= 2, `${L.id}: messages and tablets to read`);
      start(L.id);
      const n = A.lore.state.npcs[0];
      expect.ok(n.name === 'Seren, the Grace-Bearer' && A.lore.state.inscriptions.length === D.inscriptions.length, `${L.id}: drawn in the land`);
    }
    A.lore.jumpTo('stormhill'); Game.loading = 0; sim.begin(); sim.step(2);
    expect.ok(A.lore.prompt() === 'Talk to Seren', `the prompt names her (${A.lore.prompt()})`);
  });

  // ---- the rot, the ending ---------------------------------------------------------------------------------------------
  test('Lore: arrival guides are ahead and within talking distance of the natural exit route', () => {
    for (const L of [A.LEVEL_1, ...A.LANDS_LEVELS]) {
      start(L.id); sim.clearEnemies();
      const N = A.LORE.levels[L.id].npcs[0], S = L.start;
      expect.ok(N.x > S.x && Math.abs(N.z - S.z) < CONFIG.lore.talkRange, `${L.id}: guide ahead, beside the route`);
      expect.ok(walk(N.x, S.z, null, 8), `${L.id}: walk along the arrival route`);
      expect.ok(A.lore.prompt()?.startsWith('Talk'), `${L.id}: the route offers Talk`);
    }
  });

  test('Lands: the scarlet rot hurts only while stood in, on its floor; bonfires and the arena are clear of it', () => {
    start('haligtree'); const p = Game.player; sim.clearEnemies();
    const h = world.hazards[0], cx = (h.rect[0] + h.rect[1]) / 2, cz = (h.rect[2] + h.rect[3]) / 2;
    sim.place(h.rect[0] - 2, cz, 0); const hp0 = p.hp; sim.seconds(2);
    expect.ok(p.hp === hp0, 'beside the rot: unharmed');
    sim.place(cx, cz, 0); sim.seconds(2);
    expect.near(hp0 - p.hp, h.dps * 2, 0.5, 'two seconds in the rot');
    const malenia = A.LANDS_8.gated.find(g => g.id === 'zone-malenia').trigger;
    expect.ok(!A.LANDS_8.hazards.some(z => rectAnd(z.rect, malenia)), 'no rot in Malenia\'s arena');
    p.hp = 5; sim.seconds(2);
    expect.ok(!p.alive(), 'the rot can kill');
  });
  test('Lands: Malenia\'s death plays the second road\'s ending, its own cards and credits, and completes the road', () => {
    const key = CONFIG.story.saveKeys.lands; let kept = null;
    try { kept = localStorage.getItem(key); } catch (e) { /* none */ }
    try {
      A.story.use('lands'); A.story.jumpTo('haligtree'); Game.loading = 0; sim.begin();
      expect.ok(Game.story && A.story.active.def.id === 'lands', 'the Lands road is active');
      const b = Game.enemies.find(e => e.def.id === 'malenia' || (e.baseDef && e.baseDef.id === 'malenia'));
      sim.until(() => { if (b.alive()) b.deplete(); return !b.alive(); }, 30); sim.step(2);
      expect.ok(A.finale.state && A.finale.state.ending, 'the ending began');
      expect.ok(A.LORE.endings.haligtree.length === 5 && A.LORE.endings.haligtree[4].includes('lantern'), 'its own cards');
      A.events.emit('endingDone');
      expect.ok(Game.screen === 'storyDone' && A.story.data.completed, 'STORY COMPLETE, saved as complete');
      expect.ok(Game.screens().storyDone.notice === A.LANDS_STORY.done, 'its own last words');
    } finally {
      Game.story = false;
      try { if (kept === null) localStorage.removeItem(key); else localStorage.setItem(key, kept); } catch (e) { /* none */ }
      A.story.load(); A.story.use('ashmere'); Game.showMenu('main');
    }
  });

  // ---- the two roads, the menus ----------------------------------------------------------------------------------------
  test('Menus: the title offers Story, 1v1 Arena, Levels and Options; Story holds both roads, the Arena enemies, bosses and Elden Ring bosses', () => {
    Game.showMenu('main');
    const main = Game.screens().main.items.map(i => i.name);
    expect.ok(main.slice(0, 4).join() === 'Story,1v1 Arena,Levels,Options', `main: ${main}`);
    const roads = Game.screens().story.items;
    expect.ok(roads.some(i => i.campaign === 'ashmere' && i.name === 'New') && roads.some(i => i.campaign === 'lands' && i.name === 'New') && roads.at(-1).name === 'Back', 'both campaigns offer New on the same screen');
    const arena = Game.screens().arena.items.map(i => i.name);
    expect.ok(arena.join() === 'Enemies,Bosses,Elden Ring Bosses,Back', `arena: ${arena}`);
    const enemies = Game.screens().enemies.items.map(i => i.name), bosses = Game.screens().bosses.items.map(i => i.name);
    expect.ok(!enemies.includes('Aldric, the Gaoler King') && bosses.includes('Aldric, the Gaoler King') && bosses.includes('Giant Skeleton'), 'the Ashmere bosses apart');
    expect.ok(['Omenkin', 'Cleanrot Knight', 'Golden Zealot'].every(n => enemies.includes(n)), 'the new enemies are in the Enemies list');
    const levels = Game.screens().levels.items;
    expect.ok(levels.map(i => i.name).join() === 'Ashmere  ›,The Lands Between  ›,Back', 'Levels groups both roads');
    levels[0].go();
    expect.ok(Game.screen === 'levelsAshmere', 'Ashmere opens its own list');
    const ash = Game.screens().levelsAshmere;
    expect.ok(ash.back === 'levels' && ash.items.length === A.STORY.chapters.length + 1, 'only Ashmere chapters and Back');
    expect.ok(!ash.items.some(i => i.name === A.TUTORIAL.name), 'tutorial omitted');
    ash.items[ash.items.length - 1].go();
    levels[1].go();
    expect.ok(Game.screen === 'levelsLands' && Game.screens().levelsLands.back === 'levels', 'Lands list returns to the groups');
    expect.ok(Game.screens().elden.back === 'arena' && Game.screens().levelsLands.items.length === A.LANDS_LEVELS.length + 1, 'Elden Ring Bosses back to the Arena; the Lands in Levels');
  });
  test('Menus: scrolling beneath a stationary mouse preserves directional selection', () => {
    const from = Game.optionsFrom;
    try {
      Game.optionsFrom = 'main'; Game.showMenu('options');
      const list = document.getElementById('menuList'), buttons = [...list.children];
      const hover = (button, moving = false) => {
        button.dispatchEvent(new MouseEvent('mouseenter'));
        button.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, movementY: moving ? 1 : 0 }));
      };
      for (let i = 1; i < buttons.length; i++) {
        Game.menuStep('down');
        hover(buttons[i - 1]);
        expect.ok(Game.selected === i && buttons[i].classList.contains('sel'), `down: keeps row ${i}`);
      }
      expect.ok(list.scrollTop > 0, 'the list scrolls to reveal lower options');
      Game.menuStep('down');
      expect.ok(Game.selected === 0, 'wraps from the bottom to the first row');
      Game.menuStep('up');
      expect.ok(Game.selected === buttons.length - 1, 'wraps from the top to the last row');
      Game.menuStep('up'); hover(buttons[buttons.length - 1]);
      expect.ok(Game.selected === buttons.length - 2, 'up: keeps the intended row');
      hover(buttons[buttons.length - 1], true);
      expect.ok(Game.selected === buttons.length - 1, 'moving the mouse still selects a row');
      buttons[buttons.length - 1].click();
      expect.ok(Game.screen === 'main', 'clicking Back still opens the main menu');
    } finally { Game.optionsFrom = from; Game.showMenu('main'); }
  });
  test('Story: the two roads keep separate saves; Continue on one never touches the other', () => {
    const keys = CONFIG.story.saveKeys, kept = {};
    for (const k of Object.values(keys)) { try { kept[k] = localStorage.getItem(k); } catch (e) { kept[k] = null; } }
    try {
      for (const k of Object.values(keys)) localStorage.removeItem(k);
      A.story.load();
      A.story.use('lands'); A.story.newGame(false); sim.begin();
      expect.ok(Game.level.id === 'stormhill' && localStorage.getItem(keys.lands) && !localStorage.getItem(keys.ashmere), 'Lands saved in its own slot');
      A.story.use('ashmere'); A.story.newGame(false); sim.begin();
      expect.ok(Game.level.id === 'long-hall' && JSON.parse(localStorage.getItem(keys.lands)).level === 'stormhill', 'Ashmere started; the Lands save untouched');
      Game.showMenu('main'); A.story.use('lands'); Game.showMenu('story');
      expect.ok(Game.screens().story.items.some(i => i.campaign === 'lands' && i.name === 'Continue'), 'Story offers Continue for the Lands');
      A.story.resume(); sim.begin();
      expect.ok(Game.story && Game.level.id === 'stormhill' && Game.player.item('flask').max === A.LANDS_1.flasks, `Continue: Stormhill, ${A.LANDS_1.flasks} flasks`);
      expect.ok(A.story.nextLevelId('stormhill') === 'stormveil' && A.story.nextLevelId('haligtree') === null, 'the road chains Stormhill onward and ends at the Haligtree');
    } finally {
      Game.story = false;
      for (const [k, v] of Object.entries(kept)) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* none */ } }
      A.story.load(); A.story.use('ashmere'); Game.showMenu('main');
    }
  });

  test('Story: one screen starts either campaign, Continue loads it, and Cancel protects both saves', () => {
    const kept = Object.fromEntries(Object.values(CONFIG.story.saveKeys).map(k => [k, localStorage.getItem(k)]));
    const menu = () => { Game.showMenu('main'); Game.showMenu('story'); };
    const action = (id, name) => Game.menuItems.find(i => i.campaign === id && i.name === name).go();
    const tutorial = on => { const it = Game.screens().story.items.find(i => i.name.startsWith('Tutorial:')); if (it.name !== `Tutorial: ${on ? 'On' : 'Off'}`) it.adjust(); };
    try {
      sim.begin();
      for (const c of Object.values(A.story.campaigns)) c.erase();
      for (const id of ['ashmere', 'lands']) {
        menu(); tutorial(true); action(id, 'New');
        expect.ok(Game.mode === 'play' && Game.story && Game.isTutorial() && A.story.active.def.id === id, `${id}: New starts the tutorial directly`);
        A.story.afterTutorial();
        const first = A.story.active.chapterIds()[0], before = localStorage.getItem(CONFIG.story.saveKeys[id]);
        expect.ok(Game.level.id === first, `${id}: tutorial continues into its own campaign`);
        menu(); action(id, 'New');
        expect.ok(Game.screen === 'storyConfirm' && Game.menuItems[0].name === 'Cancel', 'only replacing a save needs a confirmation, defaulting to Cancel');
        Game.confirm();
        expect.ok(Game.screen === 'story' && localStorage.getItem(CONFIG.story.saveKeys[id]) === before, 'Cancel keeps the save');
        action(id, 'Continue');
        expect.ok(Game.mode === 'play' && Game.story && Game.level.id === first && A.story.active.def.id === id, 'Continue loads directly into the right campaign');
        const other = id === 'ashmere' ? 'lands' : 'ashmere', otherSave = localStorage.getItem(CONFIG.story.saveKeys[other]);
        menu(); tutorial(false); action(id, 'New');
        Game.menuItems.find(i => i.name === 'New').go();
        expect.ok(Game.mode === 'play' && Game.story && Game.level.id === first, 'Tutorial Off starts chapter one directly after confirmation');
        expect.ok(localStorage.getItem(CONFIG.story.saveKeys[other]) === otherSave, 'the other campaign save is untouched');
      }
    } finally {
      Game.story = false;
      for (const [key, value] of Object.entries(kept)) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
      A.story.load(); A.story.use('ashmere'); menu(); tutorial(true); Game.showMenu('main');
    }
  });

  // ---- the new enemies -------------------------------------------------------------------------------------------------
  test('Lands enemies: each is a normal enemy (an overhead bar), stronger than Ashmere\'s, with moves borrowed from its land\'s boss', () => {
    const src = { omenkin: 'margit', graftedScion: 'godrick', crucibleSquire: 'crucibleKnight', leyndellKnight: 'morgott', ashenWarrior: 'godfrey',
                  beastman: 'maliketh', goldenZealot: 'radagon', cleanrotKnight: 'malenia' };
    for (const d of A.LANDS_ENEMY_DEFS) {
      expect.ok(!isBossDef(d) && d.model in MODEL_DEFS && A.ENEMY_DEFS.includes(d), `${d.id}: a normal enemy with a model, in the Enemies list`);
      expect.ok(d.hp >= 240 && d.hp > A.ENEMY_BY_ID.hollow.hp * 2, `${d.id}: ${d.hp} HP`);
      const borrowed = d.attacks.filter(a => a.origin);
      expect.ok(borrowed.length >= 3 && borrowed.every(a => a.origin.enemy === src[d.id]), `${d.id}: ${borrowed.length} moves of ${src[d.id]}`);
      for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.2, `${d.id}/${a.id}: active ${h.active} s (rolls clear it)`);
      for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(d.attacks.some(o => o.id === f.attack), `${d.id}/${a.id}: follow-up ${f.attack} is its own`);
      const boss = A.ENEMY_BY_ID[src[d.id]];
      for (const a of borrowed) {
        const o = boss.attacks.find(q => q.id === a.origin.attack);
        expect.ok(o.hits.length >= a.hits.length && a.hits.every((h, i) => h.startup === o.hits[a.hits.length === o.hits.length ? i : [0, 1, 2, 4][i]].startup), `${d.id}/${a.id}: the source's timings`);
        if (!a.projectile && d.scale < boss.scale) expect.ok(a.box.w <= o.box.w && a.range <= o.range, `${d.id}/${a.id}: hitbox and reach scaled down`);
        expect.ok(a.damage < o.damage, `${d.id}/${a.id}: hits softer than the boss (${a.damage} < ${o.damage})`);
      }
    }
    expect.ok(A.LANDS_ENEMY_DEFS.filter(d => d.stagger || d.guard).length === 7, 'all but the Beastman kneel for an execution');
  });
  test('Lands enemies: each duel runs, the enemy comes and lands blows', () => {
    for (const d of A.LANDS_ENEMY_DEFS) {
      Game.startFight(d.id); sim.begin(); const p = Game.player; sturdy(p);
      let attacked = false;
      for (let s = 0; s < 15 * 6; s++) { sim.step(10); if (Game.duel.in('attacking')) attacked = true; }
      expect.ok(attacked && p.hp < p.maxHp, `${d.id}: attacked and hit (${attacked}, ${p.maxHp - p.hp} damage)`);
    }
  });
})();
