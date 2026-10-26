'use strict';
// ============================================================================
// Rendering audit regressions: stage disposal, the model cache, lightning, reduced motion, the shared effect clock
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Render audit')`.
(() => {
  const { test, expect, sim } = __arena.tests;
  const start = id => { Game.startLevel(id); Game.loading = 0; sim.begin(); };
  const restoreQuality = () => { applySettings.graphics = undefined; applySettings(); };
  const frames = n => { for (let i = 0; i < n; i++) Game.render(1, CONFIG.step); };
  const disposed = new WeakSet(), watch = m => { if (m && !m.userData.renderAuditWatched) { m.userData.renderAuditWatched = true; m.addEventListener('dispose', () => disposed.add(m)); } };

  test('Render audit: a stage change frees its points, sprites and banner materials but keeps the shared banner cloth', () => {
    start('long-hall');
    const points = [], sprites = [], banners = [];
    stage.group.traverse(o => {
      if (o.isPoints) points.push(o.material); else if (o.isSprite) sprites.push(o.material);
      else if (o.isInstancedMesh && o.material.customProgramCacheKey && o.material.customProgramCacheKey() === 'banner') banners.push(o.material);
    });
    expect.ok(points.length > 0 && sprites.length > 0 && banners.length > 0, `long-hall has dust/embers (${points.length}), glows (${sprites.length}) and banners (${banners.length})`);
    for (const m of [...points, ...sprites, ...banners]) watch(m);
    const cloth = banners[0].map;
    let clothGone = false; cloth.addEventListener('dispose', () => { clothGone = true; });
    start('sunken-keep');
    expect.ok(points.every(m => disposed.has(m)), 'stage points materials freed');
    expect.ok(sprites.every(m => disposed.has(m)), 'stage sprite materials freed');
    expect.ok(banners.every(m => disposed.has(m)), 'banner materials freed');
    expect.ok(!clothGone, 'the shared banner texture is never disposed');
    start('long-hall');
    let again = null;
    stage.group.traverse(o => { if (o.isInstancedMesh && o.material.customProgramCacheKey && o.material.customProgramCacheKey() === 'banner') again = o.material.map; });
    expect.ok(again === cloth, 'every level reuses one banner texture');
  });

  test('Render audit: models of another detail leave the cache once no body uses them; live bodies keep theirs', () => {
    const was = KIT.detail(), Q = CONFIG.VISUALS.quality;
    try {
      start('long-hall');
      const live = KIT.modelParts(PLAYER_DEF.look.model);   // the player's body was built at the current detail
      const other = JSON.stringify(was) === JSON.stringify(Q.ultra.modelDetail) ? Q.low.modelDetail : Q.ultra.modelDetail;
      KIT.setDetail(other);
      const temp = KIT.modelParts('godfrey');
      let freed = 0; for (const p of temp.parts) p.geo.addEventListener('dispose', () => freed++);
      expect.ok([...KIT.cache.values()].includes(temp), 'built and cached at the trial detail');
      KIT.setDetail(was);
      expect.ok(![...KIT.cache.values()].includes(temp) && freed === temp.parts.length, 'unused entry of the old detail dropped and freed');
      expect.ok([...KIT.cache.values()].includes(live), 'the live player body keeps its entry');
      // A rig built at a trial detail holds its entry until disposed (the Auto benchmark's pattern).
      KIT.setDetail(other, { prewarm: false, evict: false });
      const entry = KIT.modelParts('margit'), rig = new Rig({ model: 'margit', scale: 1, bulk: 1 });
      KIT.setDetail(was, { prewarm: false, evict: false });
      expect.ok(entry.users === 1 && [...KIT.cache.values()].includes(entry), 'the trial rig keeps its model while alive');
      rig.dispose();
      expect.ok(![...KIT.cache.values()].includes(entry), 'released with its last rig');
    } finally { KIT.setDetail(was); }
  });

  test('Render audit: lightning flashes at most twice a second, from pooled bolts kept out of the depth pass', () => {
    const saved = settings.cameraMotion;
    try {
      settings.cameraMotion = true; reducedMotion.force(false);
      visuals.setQuality('ultra'); start('stormveil'); frames(2);
      const st = realms.state, objects = st.group.children.length;
      expect.ok(st.bolts.length === CONFIG.VISUALS.realms.lightning.pool, 'a fixed pool of bolts');
      expect.ok(st.bolts.every(b => ultraPost.excluded(b.m)), 'bolts are in the no-depth set');
      const onsets = [];
      realms.strike();
      let prev = 0;
      for (let i = 0; i < 60; i++) {   // one second at 60 frames
        frames(1);
        if (st.flashK > prev + 0.05) onsets.push(i * CONFIG.step);
        prev = st.flashK;
      }
      expect.ok(st.group.children.length === objects, 'a strike builds nothing');
      expect.ok(onsets.length >= 1 && onsets.length <= 2, `one or two pulses (${onsets.length})`);
      for (let i = 1; i < onsets.length; i++) expect.above(onsets[i] - onsets[i - 1], 1 / 3, 'pulses under 3 Hz');
      // Reduced motion: one pulse, capped.
      reducedMotion.force(true);
      for (let i = 0; i < 90; i++) frames(1);
      realms.strike();
      let peak = 0, rises = 0; prev = 0;
      for (let i = 0; i < 60; i++) { frames(1); peak = Math.max(peak, st.flashK); if (st.flashK > prev + 0.02) rises++; prev = st.flashK; }
      expect.ok(peak > 0 && peak <= CONFIG.VISUALS.reducedMotion.lightning + 1e-6, `capped flash (${peak.toFixed(3)})`);
      expect.ok(rises === 1, `a single pulse (${rises})`);
    } finally { reducedMotion.force(null); settings.cameraMotion = saved; restoreQuality(); }
  });

  test('Render audit: reduced motion softens screen flashes and stops refraction (option or OS setting)', () => {
    const saved = settings.cameraMotion, R = CONFIG.VISUALS.reducedMotion;
    try {
      visuals.setQuality('ultra'); start('long-hall'); frames(1);
      const flashNow = () => visuals.passes.grade.uniforms.uFlash.value;
      const measure = () => {
        visuals.setQuality('ultra'); frames(1);   // clears pulses and waves
        ultraPost.pulse({ flash: 1, color: 0xffffff, hurt: 1 }); ultraPost.wave(Game.player, 1, 1);
        const waves = ultraPost.info().waves; frames(1);
        return { flash: flashNow(), waves };
      };
      settings.cameraMotion = true; reducedMotion.force(false);
      const full = measure();
      expect.ok(full.flash > 0.5 && full.waves === 1, `normal: full flash (${full.flash.toFixed(2)}) and a wave`);
      settings.cameraMotion = false;
      const option = measure();
      expect.ok(option.flash > 0 && option.flash <= R.flash + 1e-6 && option.waves === 0, `Camera motion off: subtle flash (${option.flash.toFixed(2)}), no wave`);
      settings.cameraMotion = true; reducedMotion.force(true);
      const os = measure();
      expect.ok(os.flash > 0 && os.flash <= R.flash + 1e-6 && os.waves === 0, 'OS reduced motion: the same');
    } finally { reducedMotion.force(null); settings.cameraMotion = saved; restoreQuality(); }
  });

  test('Render audit: effect slots sweep departed actors and the effect clock honours hand-stepping and hit-pause', () => {
    const hit = Game.hitstop;
    try {
      sim.begin();
      expect.ok(effectSlots.real() === CONFIG.step, 'a hand-stepped frame is one fixed step');
      Game.hitstop = 0.1;
      expect.near(effectSlots.dt(), CONFIG.step * CONFIG.VISUALS.effectClock.hitstop, 1e-9, 'a hit-pause slows drawn effects');
      Game.hitstop = 0;
      const t0 = effectSlots.time(); Game.render(1, CONFIG.step);
      expect.near(effectSlots.time() - t0, CONFIG.step, 1e-9, 'effect time advances once per frame');
      const released = [], slots = effectSlots.slots((s, a) => released.push(a)), a = {}, b = {};
      expect.ok(slots.acquire(a, () => 1) === 1 && slots.acquire(a, () => 2) === 1, 'one slot per actor');
      slots.acquire(b, () => 3);
      slots.sweep([b]);
      expect.ok(released.length === 1 && released[0] === a && slots.size === 1, 'departed actors released');
      // A boss effect owner leaving the game frees its drawing (Godrick's flame jet).
      visuals.setQuality('low'); elden.start('godrick'); Game.loading = 0; sim.begin();
      const e = Game.enemies[0]; flame.prepare(Game.enemies);
      const jet = e.rig.flameJet; watch(jet.layers[0].material);
      Game.enemies.length = 0; Game.render(1, CONFIG.step);
      expect.ok(disposed.has(jet.layers[0].material) && !jet.g.parent && e.rig.flameJet === null, 'jet removed with its owner');
    } finally { Game.hitstop = hit; restoreQuality(); }
  });

  test('Render audit: blood decals are one instanced draw, and bolts in flight come from one reused list', () => {
    start('long-hall');
    const D = visuals.decals;
    D.clear();
    for (let i = 0; i < 3; i++) visuals.blood({ x: Game.player.x + i, y: Game.player.y + 1, z: Game.player.z }, 1, false);
    expect.ok(D.mesh.isInstancedMesh && D.count() === 3 && D.mesh.visible, `three splats in one mesh (${D.count()})`);
    D.update(CONFIG.VISUALS.blood.life + 1);
    expect.ok(D.count() === 0 && !D.mesh.visible, 'expired splats leave nothing drawn');
    expect.ok(projectiles.flying() === projectiles.flying(), 'one reused list of flying bolts');
  });
})();
