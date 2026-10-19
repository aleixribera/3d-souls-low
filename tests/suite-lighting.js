'use strict';
// Render-only navigation and lighting regressions, registered on the existing browser runner.
(() => {
  const { test, expect, sim } = __arena.tests;
  const start = id => { Game.startLevel(id); Game.loading = 0; sim.begin(); };
  test('Guiding light: all thirteen campaign levels have connected bonfire references and floor-safe paths', () => {
    expect.ok(validateBonfireGuidance().length === 0, validateBonfireGuidance().join(' | '));
    const levels = [...LEVELS, ...LANDS_LEVELS].filter(L => L.bonfires.length > 1);
    expect.ok(levels.length === 13, 'all campaign levels with multiple bonfires');
    for (const L of levels) {
      const routes = BONFIRE_GUIDANCE[L.id], TR = L.layout === 'rooms' ? terrainFor(L) : null;
      expect.ok(routes.length === L.bonfires.length - 1, `${L.id}: links every bonfire`);
      for (const route of routes) for (const path of route.paths) for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / VIS.guidance.sample));
        for (let k = 0; k <= n; k++) {
          const t = k / n, x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t), z = lerp(a[2], b[2], t);
          if (!TR) continue;
          const floor = TR.floorY(x, z, y);
          expect.ok(Number.isFinite(floor) && Math.abs(floor - y) < 0.25, `${L.id}/${route.id}: floor at ${x}, ${y}, ${z}`);
          expect.ok(!TR.solids.some(s => x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1 && y + VIS.guidance.height > s.y0 && y + VIS.guidance.height < s.y1), `${L.id}: no route through solid ${x}, ${y}, ${z}`);
          expect.ok(!(L.hazards || []).some(h => x > h.rect[0] && x < h.rect[1] && z > h.rect[2] && z < h.rect[3] && Math.abs(y - (h.y || 0)) < VIS.guidance.floorTolerance), `${L.id}: route avoids damaging floor ${x}, ${z}`);
        }
      }
    }
  });
  test('Guiding light: validation rejects unknown bonfires and malformed paths', () => {
    const route = BONFIRE_GUIDANCE['long-hall'][0], to = route.to, paths = route.paths;
    try {
      route.to = 'missing-fire'; expect.ok(validateBonfireGuidance().some(s => s.includes('distinct bonfires')), 'readable bad reference');
      route.to = to; route.paths = [[[1, 0, NaN]]];
      expect.ok(validateBonfireGuidance().some(s => s.includes('[x, y, z]')), 'readable malformed point');
    } finally { route.to = to; route.paths = paths; }
  });
  test('Guiding light: pockets stay fixed, animate in one draw, survive presets, and clear in duels', () => {
    const saved = settings.graphics;
    try {
      start('the-tower');
      const s = bonfireGuidance.state, positions = s.mesh.geometry.attributes.position.array.slice();
      const model = Game.player, before = [model.x, model.y, model.z, model.hp];
      for (const q of ['low', 'high', 'ultra']) {
        visuals.setQuality(q); Game.render(1, CONFIG.step);
        expect.ok(bonfireGuidance.state === s && s.mesh.isPoints, `${q}: one retained point mesh`);
        expect.ok(positions.every((v, i) => s.mesh.geometry.attributes.position.array[i] === v), `${q}: fixed pocket positions`);
        expect.ok(before.join() === [model.x, model.y, model.z, model.hp].join(), `${q}: drawing does not move or damage the player`);
      }
      elden.start('margit'); expect.ok(bonfireGuidance.info() === null, 'no route leaks into duels');
    } finally { settings.graphics = saved; applySettings(); }
  });
  test('Guiding light: coloured attacks light the world with fixed bounded lights on every preset', () => {
    const saved = settings.graphics;
    try {
      sim.begin();
      for (const q of ['low', 'high', 'ultra']) {
        visuals.setQuality(q); elden.start('margit'); Game.loading = 0;
        const e = Game.enemies[0], a = e.baseDef.attacks.find(a => a.spectral);
        e.attack = a; e.hitIndex = 0; e.setState(ES.WINDUP); e.stateTime = a.hits[0].startup / 2;
        e.x = Game.player.x + 3; e.z = Game.player.z; e.rig.root.visible = true;
        for (let i = 0; i < 12; i++) Game.render(1, CONFIG.step);
        const info = effectLighting.info(), lights = effectLighting.lights;
        expect.ok(info.lights.filter(l => l.visible).length === VIS.effectLight.counts[q], `${q}: fixed light count`);
        expect.ok(info.lights.some(l => l.visible && l.intensity > 0), `${q}: spectral weapon casts light`);
        expect.ok(lights.every(l => !l.castShadow), `${q}: no cube shadow maps`);
        expect.ok(lights.some(l => l.intensity > 0 && l.color.r > l.color.b), `${q}: golden light colour`);
        elden.start('margit'); expect.ok(effectLighting.info().activeEffects === 0, `${q}: clear on same-arena retry`);
        Game.startLevel('long-hall'); expect.ok(effectLighting.info().activeEffects === 0, `${q}: clear on level change`);
      }
    } finally { settings.graphics = saved; applySettings(); }
  });
  test('Guiding light: reaching or resting at a bonfire advances the route, including default checkpoint spawns', () => {
    start('the-tower');
    const p = Game.player, b = Game.level.bonfires.find(b => b.id === 'tower-bait');
    sim.place(b.x, b.z, 0); Game.render(1, CONFIG.step);
    expect.ok(bonfireGuidance.info().route === 'tower-bait-to-tower-postern', 'reaching the fire shows the outgoing leg only');
    events.emit('rest', { bonfire: Game.level.bonfires.find(b => b.id === 'tower-postern') });
    Game.render(1, CONFIG.step);
    expect.ok(bonfireGuidance.info().route === 'tower-postern-to-tower-bell', 'rest follows a bonfire id');
    start('long-hall');
    const last = Game.level.bonfires.find(b => b.id === 'after-rogue');
    Game.spawn = { x: last.x - CONFIG.rest.respawnOffset, z: last.z };
    Game.render(1, CONFIG.step);
    expect.ok(bonfireGuidance.info().route === null, 'a restored final checkpoint has no backwards trail');
  });
  test('Guiding light: lightning illuminates surfaces directionally and clears on changing realms', () => {
    start('stormveil'); realms.strike();
    // Realm weather runs on the render clock, with the light in the same frame.
    Game.render(1, CONFIG.step); Game.render(1, CONFIG.step);
    expect.ok(effectLighting.info().storm > 0, 'a directional flash reaches world and character materials');
    expect.ok(realms.state.flash.intensity <= VIS.effectLight.storm.ambient, 'ambient fill stays restrained');
    start('sunken-keep'); Game.render(1, CONFIG.step);
    expect.ok(effectLighting.info().storm === 0, 'no storm light in the next level');
  });
})();
