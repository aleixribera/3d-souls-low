'use strict';
// Render-only navigation and lighting regressions, registered on the existing browser runner.
(() => {
  const { test, expect, sim } = __arena.tests;
  const start = id => { Game.startLevel(id); Game.loading = 0; sim.begin(); };
  test('Guiding light: all fourteen story levels have connected bonfire references and floor-safe paths', () => {
    expect.ok(validateBonfireGuidance().length === 0, validateBonfireGuidance().join(' | '));
    const levels = LEVELS.filter(L => L.bonfires.length > 1);
    expect.ok(levels.length === 14, 'all story levels with multiple bonfires');
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
      for (const q of ['bare', 'normal', 'ultra']) {
        visuals.setQuality(q); Game.render(1, CONFIG.step);
        expect.ok(bonfireGuidance.state === s && s.mesh.isPoints, `${q}: one retained point mesh`);
        expect.ok(positions.every((v, i) => s.mesh.geometry.attributes.position.array[i] === v), `${q}: fixed pocket positions`);
        expect.ok(before.join() === [model.x, model.y, model.z, model.hp].join(), `${q}: drawing does not move or damage the player`);
      }
      Game.startFight('ostrey'); expect.ok(bonfireGuidance.info() === null, 'no route leaks into duels');
    } finally { settings.graphics = saved; applySettings(); }
  });
  test('Guiding light: coloured attacks light the world with fixed bounded lights on every preset', () => {
    const saved = settings.graphics;
    try {
      sim.begin();
      for (const q of ['bare', 'normal', 'ultra']) {
        visuals.setQuality(q); Game.startFight('rootbound'); Game.loading = 0;
        const e = Game.enemies[0], a = e.baseDef.attacks.find(a => a.spectral);
        e.attack = a; e.hitIndex = 0; e.setState(ES.WINDUP); e.stateTime = a.hits[0].startup / 2;
        e.x = Game.player.x + 3; e.z = Game.player.z; e.rig.root.visible = true;
        for (let i = 0; i < 12; i++) Game.render(1, CONFIG.step);
        const info = effectLighting.info(), lights = effectLighting.lights;
        expect.ok(info.lights.filter(l => l.visible).length === VIS.effectLight.counts[q], `${q}: fixed light count`);
        expect.ok(info.lights.some(l => l.visible && l.intensity > 0), `${q}: spectral weapon casts light`);
        expect.ok(lights.every(l => !l.castShadow), `${q}: no cube shadow maps`);
        expect.ok(lights.some(l => l.intensity > 0 && l.color.r > l.color.b), `${q}: golden light colour`);
        Game.startFight('rootbound'); expect.ok(effectLighting.info().activeEffects === 0, `${q}: clear on same-arena retry`);
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
    start('saltgrave'); realms.strike();
    // Realm weather runs on the render clock, with the light in the same frame.
    Game.render(1, CONFIG.step); Game.render(1, CONFIG.step);
    expect.ok(effectLighting.info().storm > 0, 'a directional flash reaches world and character materials');
    expect.ok(realms.state.flash.intensity <= VIS.effectLight.storm.ambient, 'ambient fill stays restrained');
    start('sunken-keep'); Game.render(1, CONFIG.step);
    expect.ok(effectLighting.info().storm === 0, 'no storm light in the next level');
  });
  test('Baked light: Normal lights a level from its baked volume, walls stop the light and cast the moon\'s shadow', () => {
    const saved = settings.graphics, v = new THREE.Vector3(), lum = c => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    try {
      visuals.setQuality('normal'); start('burning-town'); Game.render(1, CONFIG.step);
      const I = bakedLight.info();
      expect.ok(I && I.active && I.lights === stage.lightSources.length, `every light source baked (${I && I.lights})`);
      expect.ok(I.cells[0] * I.cells[1] * I.cells[2] <= VIS.baked.maxVolume && I.ms < 2000, `bounded volume, baked in ${I.ms} ms`);
      expect.ok(!renderer.shadowMap.enabled && stage.lightPool.every(l => !l.visible || l.intensity === 0), 'no shadow map and no pooled light drawn');
      let baked = 0; stage.group.traverse(o => { if (o.isMesh && o.material && o.material.defines && 'BAKED_LIGHT' in o.material.defines) baked++; });
      expect.above(baked, 0, 'the level\'s materials read the volume');
      // Near a light it is lit; a point straight behind a wall from a light gets none of it (another light may reach it).
      const T = terrainFor(Game.level), boxes = T.solids.filter(b => !b.low && b.kind !== 'prop');
      const inBox = (x, y, z) => boxes.some(b => x > b.x0 - 0.4 && x < b.x1 + 0.4 && y > b.y0 - 0.4 && y < b.y1 + 0.4 && z > b.z0 - 0.4 && z < b.z1 + 0.4);
      let lit = 0, dark = 0, behind = 0;
      for (const l of stage.lightSources) {
        l.getWorldPosition(v);
        const a = bakedLight.at(v.x, v.y, v.z); if (a && !a.solid && a.light > 0) lit++;
        for (const b of boxes) {
          if (!(b.y0 < v.y - 0.5 && b.y1 > v.y + 1)) continue;
          for (const [ax, other] of [['x', 'z'], ['z', 'x']]) {
            if (!(v[other] > b[other + '0'] + 0.6 && v[other] < b[other + '1'] - 0.6)) continue;
            const before = b[ax + '0'] - v[ax], after = v[ax] - b[ax + '1'];
            const P = { y: v.y, [other]: v[other], [ax]: before > 0.3 && before < 3 ? b[ax + '1'] + 1.5 : after > 0.3 && after < 3 ? b[ax + '0'] - 1.5 : NaN };
            if (Number.isNaN(P[ax]) || inBox(P.x, P.y, P.z)) continue;
            const s = bakedLight.at(P.x, P.y, P.z); if (!s || s.solid) continue;
            behind++; if (s.light < 0.05 * lum(l.color) * l.intensity / Math.hypot(P.x - v.x, P.z - v.z)) dark++;
          }
        }
      }
      expect.ok(lit === stage.lightSources.length, `lit at every light (${lit}/${stage.lightSources.length})`);
      expect.ok(dark >= 3 && dark * 2 >= behind, `dark behind walls (${dark} of ${behind})`);
      // The moon: the open middle of the arena sees it; the foot of the wall on the moon's side is in its shadow.
      Game.startFight('ostrey'); Game.loading = 0; sim.begin(); Game.render(1, CONFIG.step);
      const x = Math.sign(moonLight.position.x) * (ARENA.halfX - 0.5);   // inside the wall that faces the moon
      expect.ok(bakedLight.at(0, 0.5, 0).moon > 0.95 && bakedLight.at(-x, 0.5, 0).moon > 0.95, 'moonlit in the open and by the far wall');
      expect.ok(bakedLight.at(x, 0.5, 0).moon < 0.05, `shadowed at the foot of the moon-side wall (${bakedLight.at(x, 0.5, 0).moon})`);
      visuals.setQuality('bare');
      expect.ok(bakedLight.info() === null && !bakedLight.active(), 'Bare drops the volume');
    } finally { settings.graphics = saved; applySettings(); }
  });
})();
