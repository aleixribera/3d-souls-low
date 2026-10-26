'use strict';
// Real renderer checks for consistent camera motion, shared feedback and pooled effects.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    const cameraResult = await page.evaluate(() => {
      Game.manualClock = true; Game.startFight('hollow'); Game.loading = 0;
      const p = Game.player; p.vx = p.vz = 0;
      const result = {};
      for (const hz of [30, 60, 144]) {
        settings.cameraMotion = false; Game.render(1, 0);
        settings.cameraMotion = true; Game.render(1, 0);
        events.emit('strike', { strike: { damage: 60 }, attacker: Game.duel, target: p, at: { x: p.x, y: p.y, z: p.z } });
        const cam = Game.cam.pos.clone();
        for (let i = 0; i < hz / 2; i++) Game.render(1, 1 / hz);
        result[hz] = { spring: cameraFeel.state(), unchanged: cam.equals(Game.cam.pos) };
      }
      Game.startFight('hollow'); Game.render(1, 0);
      result.reset = Object.values(cameraFeel.state()).every(v => v === 0);
      return result;
    });
    for (const hz of [30, 60, 144]) {
      assert.ok(cameraResult[hz].unchanged);
      for (const key of Object.keys(cameraResult[30].spring))
        assert.ok(Math.abs(cameraResult[hz].spring[key] - cameraResult[30].spring[key]) < 1e-9, `${key}: ${hz} Hz matches 30 Hz`);
    }
    assert.ok(cameraResult.reset, 'a new body clears the previous camera impulse');
    console.log('Camera: identical half-second response at 30/60/144 Hz, unchanged simulation camera, clean restart.');

    const feedback = await page.evaluate(() => {
      Game.startLevel('stormhill'); Game.loading = 0;
      settings.cameraMotion = false; Game.render(1, 0); settings.cameraMotion = true; Game.render(1, 0);
      const c = Game.companion.body, enemy = Game.enemies[0], shakes = {};
      for (const type of ['parry', 'execution', 'executionPull', 'land']) {
        Game.shake = Game.shakeAmp = 0;
        events.emit(type, { player: c, enemy, target: enemy, at: { x: c.x, y: c.y, z: c.z }, exit: { x: c.x, y: c.y, z: c.z },
          x: c.x, y: c.y, z: c.z, fx: PLAYER_DEF.moveset.attacks.jumpHeavy.air.fx });
        shakes[type] = Game.shake === 0;
      }
      Game.render(1, CONFIG.step);
      const spring = Object.values(cameraFeel.state()).every(v => v === 0);
      const original = audio.play, sounds = [];
      try {
        audio.play = (id, options) => sounds.push({ id, pos: options && options.pos });
        events.emit('itemUsed', { player: c, item: 'flask' }); events.emit('dodge', { player: c });
        events.emit('itemUsed', { player: Game.player, item: 'flask' });
      } finally { audio.play = original; }
      return { shakes, spring, sounds, position: { x: c.x, y: c.y, z: c.z } };
    });
    for (const [event, quiet] of Object.entries(feedback.shakes)) assert.ok(quiet, event + ' belongs to Finn');
    assert.ok(feedback.spring);
    assert.deepEqual(feedback.sounds.slice(0, 2).map(s => s.pos), [feedback.position, feedback.position]);
    assert.equal(feedback.sounds[2].pos, null);
    console.log('Companion feedback: parry/critical/landing isolation and spatial flask/dodge sounds passed.');

    const output = '.scratch/polish'; fs.mkdirSync(output, { recursive: true });
    const particles = await page.evaluate(() => {
      Game.startFight('hollow'); Game.loading = 0; $('loading').classList.remove('show');
      settings.cameraMotion = false; Game.render(1, 0); Game.render(1, 0);
      const calls = renderer.info.render.calls, programs = renderer.info.programs.length;
      const p = Game.player;
      spawnBurst({ x: p.x, y: p.y + 1, z: p.z }, { color: 0xff8040, count: 100, speed: 3 });
      Game.render(1, 0);
      const result = { count: particleBatch.count, submissions: renderer.info.render.calls - calls,
        warm: programs === renderer.info.programs.length,
        live: particleBatch.visible, capacity: particles.length };
      const color = new THREE.Color(); particleBatch.getColorAt(0, color);
      result.color = color.getHex() === 0xff8040;
      const legacy = liveParticles.map(p => {
        const material = new THREE.MeshBasicMaterial({ color: p.mesh.material.color, opacity: p.mesh.material.opacity, transparent: true, fog: false });
        const mesh = new THREE.Mesh(particleGeo, material);
        mesh.position.copy(p.mesh.position); mesh.rotation.copy(p.mesh.rotation); scene.add(mesh); return mesh;
      });
      particleBatch.visible = false; renderer.render(scene, camera);
      const separateCalls = renderer.info.render.calls;
      for (const mesh of legacy) { scene.remove(mesh); mesh.material.dispose(); }
      particleBatch.visible = true; renderer.render(scene, camera);
      result.savedSubmissions = separateCalls - renderer.info.render.calls;
      updateParticles(CONFIG.fx.particleLife * 0.2);
      result.fades = particleAlpha.array[0] > 0 && particleAlpha.array[0] <= 1;
      updateParticles(CONFIG.fx.particleLife * 3);
      result.expires = particleBatch.count === 0 && !particleBatch.visible;
      spawnBurst(p, { color: 0xffffff, count: 1000, speed: 1 }); updateParticles(0);
      result.bounded = particleBatch.count === particles.length;
      Game.reset(); result.reset = !particleBatch.visible && particleBatch.count === 0;
      return result;
    });
    assert.equal(particles.count, 100); assert.equal(particles.submissions, 1);
    assert.equal(particles.savedSubmissions, 99, 'the same 100 visible particles save 99 drawing submissions');
    for (const key of ['warm', 'live', 'color', 'fades', 'expires', 'bounded', 'reset']) assert.ok(particles[key], key);
    fs.writeFileSync(`${output}/results.json`, JSON.stringify({ cameraResult, feedback, particles }, null, 2));
    console.log('Particles: 100 cubes in one submission, prepared shader, individual colour/fade, bounded pool and clean expiry/reset.');

    const navigation = await page.evaluate(() => {
      Game.startLevel('long-hall'); Game.loading = 0;
      for (const g of world.gates) g.open = true;
      const old = CONFIG.bot.follow;
      try {
        CONFIG.bot.follow = [0, 0.01];
        const me = Game.player, lead = { id: 'leader', x: 20, y: 0, z: 0, alive: () => true };
        Object.assign(me, { x: 5, y: 0, z: 0, grounded: true });
        const nav = BotNavigation.create(); nav.move(CONFIG.step, me, lead);
        me.x = 19.9; nav.move(CONFIG.step, me, lead); // consume the final waypoint
        lead.x = 21;
        return nav.move(CONFIG.step, me, lead).has;
      } finally { CONFIG.bot.follow = old; }
    });
    assert.ok(navigation, 'a consumed route replans when the leader moves');
    console.log('Navigation: consuming the final waypoint and following again never dereferences an empty route.');

    const thunder = await page.evaluate(() => {
      Game.startLevel('farum-azula'); Game.loading = 0;
      const originalPlay = audio.play, originalTimer = window.setTimeout, originalClear = window.clearTimeout;
      const callbacks = new Map(), cancelled = new Set(), sounds = [];
      try {
        audio.play = id => sounds.push(id);
        window.setTimeout = (fn, delay) => { const id = originalTimer(fn, 100000); callbacks.set(id, fn); return id; };
        window.clearTimeout = id => { cancelled.add(id); originalClear(id); };
        realms.strike(); Game.render(1, CONFIG.step);
        const timers = [...realms.state.thunderTimers];
        Game.startFight('hollow');
        for (const id of timers) callbacks.get(id)(); // also simulate a callback already dequeued at disposal
        return { scheduled: timers.length, cancelled: timers.every(id => cancelled.has(id)), silent: !sounds.includes('thunder') };
      } finally {
        audio.play = originalPlay; window.setTimeout = originalTimer; window.clearTimeout = originalClear;
        for (const id of callbacks.keys()) originalClear(id);
      }
    });
    assert.equal(thunder.scheduled, 1); assert.ok(thunder.cancelled && thunder.silent);
    console.log('Realm cleanup: delayed thunder is cancelled and stale callbacks cannot sound in the next stage.');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await page.evaluate(() => {
      hud.toast('Shortcut opened'); hud.pHp.classList.add('low');
      return { animation: getComputedStyle(hud.pHp).animationName, toast: getComputedStyle(hud.toastList.at(-1).el).opacity };
    });
    assert.equal(reduced.animation, 'none'); assert.equal(reduced.toast, '1');
    assert.deepEqual(errors, []);
  } finally { if (browser) await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
