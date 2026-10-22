'use strict';
// Exercise real enemy materials and both update paths, including held executions.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await page.waitForFunction(() => multiplayer.connected);
    await page.locator('#lobbyStart').click();
    await page.waitForFunction(() => multiplayer.info.ready && multiplayer.info.receivedFrames > 2, null, { timeout: 90000 });
    const results = await page.evaluate(() => {
      Game.manualClock = true;
      const original = Game.enemies, mode = Game.mode, p = Game.player;
      const failures = [], checked = [];
      const check = (ok, message) => { if (!ok) failures.push(message); };
      const ctx = { t: 1, dt: CONFIG.step, yaw: 0, px: p.x, pz: p.z };
      const steps = Math.ceil(Math.max(CONFIG.fx.tintTime, CONFIG.fx.crackTime, CONFIG.fx.recoilTime) / CONFIG.step) + 2;
      const glowing = e => e.rig.bodyMats.some(m => m.emissive.getHex() !== 0);
      try {
        // Keep combat/credits out of this check while running the actual online update.
        Game.mode = 'ending';
        for (const def of [...ENEMY_DEFS, ...ELDEN_BOSS_DEFS, ...TRAINING_DEFS]) {
          const e = new Enemy(def, { behavior: 'gated', x: 0, y: 0, z: 0, yaw: 0 });
          Game.enemies = [e];
          try {
            for (const online of [false, true]) {
              const label = `${def.id}/${online ? 'online' : 'solo'}`;
              e.state = ES.IDLE; e.posture = e.guardMeter = 0;
              const meter = e.def.guard || e.def.stagger;
              if (e.def.posture) e.addPosture(e.def.posture.max);
              else if (meter) e.fillMeter(meter, meter.breakers[0], meter.max / meter.heavy);
              else e.crack = 1; // poise-only enemies use the same presentation path
              check(e.crack === 1, `${label}: break produces its flash`);
              e.tint = e.recoil = 1;
              e.state = ES.IDLE; e.pose(0, ctx);
              check(glowing(e), `${label}: initial break flash is visible`);
              // Solo's execution state still ticks feedback before returning.
              e.state = ES.EXECUTED;
              for (let i = 0; i < steps; i++) {
                if (online) multiplayer.update(CONFIG.step);
                else e.update(CONFIG.step, p);
                if (i === 0) check(Math.abs(e.crack - (1 - CONFIG.step / CONFIG.fx.crackTime)) < 1e-9,
                  `${label}: flash ticks exactly once per fixed step`);
              }
              e.state = ES.IDLE; e.pose(0, ctx);
              check(e.crack === 0 && e.tint === 0 && e.recoil === 0, `${label}: feedback expires`);
              check(!glowing(e), `${label}: normal body material is restored`);
              check(!e.rig.warnGlow.visible, `${label}: no stale weapon warning`);
              // A new strike must still produce feedback after the old one clears.
              e.tint = 1; e.pose(0, ctx);
              check(glowing(e), `${label}: later hits still flash`);
            }
            checked.push(def.id);
          } finally { e.rig.dispose(); }
        }
        // Exercise the real streamed boss and the local execution-hold branch.
        Game.enemies = original;
        const boss = Game.duel;
        boss.crack = boss.tint = boss.recoil = 1;
        p.exec = { enemy: boss };
        for (let i = 0; i < steps; i++) multiplayer.update(CONFIG.step);
        check(boss.crack === 0 && boss.tint === 0 && boss.recoil === 0, 'streamed boss: execution hold does not freeze feedback');
        p.exec = null;
      } finally { Game.enemies = original; Game.mode = mode; p.exec = null; }
      return { failures, checked };
    });
    assert.deepEqual(results.failures, []);
    assert.deepEqual(errors, []);
    console.log(`Enemy feedback: ${results.checked.length} enemy/boss definitions passed solo and multiplayer material resets, repeated hits, and streamed execution hold.`);
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
