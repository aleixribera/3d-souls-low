'use strict';
// Evidence frames: the title menu at desktop and phone width, one frame per Ashmere level from
// its start (with frame time, draw calls and triangles on High), and one frame per boss in a Practice duel, front-lit at
// fighting distance. Usage: node tools/scorecard-frames.cjs [outDir=docs/scorecard] [levels|bosses|fights|menu|enemies|windup|arena ...]
// BOSS=<id> (pass 123): only that boss in `bosses` and `fights` (`enemies`: every common enemy the same way, pass 162,
// ENEMY=<id,...> to pick, bosses too, for a side-by-side; `arena`: the duel arena every Practice and Boss Rush fight is in, wide, from two corners);
// STYLE=<id>: drawn in that art style (js/data/styles.js).
// One headless Edge, closed at the end; idle priority through tests/low-priority.cjs.
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const [outDir = 'docs/scorecard', ...parts] = process.argv.slice(2);
const want = p => !parts.length || parts.includes(p);
const ONLY = process.env.BOSS || '', STYLE = process.env.STYLE ? `?style=${encodeURIComponent(process.env.STYLE)}` : '';
const ENEMIES = (process.env.ENEMY || '').split(',').filter(Boolean);
const enemyIds = page => page.evaluate(only => only.length ? only : ENEMY_DEFS.filter(d => !isBossDef(d) && !TEST_DEFS.includes(d) && !d.arena).map(d => d.id), ENEMIES);
const bossIds = page => page.evaluate(only => ENEMY_DEFS.filter(isBossDef).map(d => d.id).filter(id => !only || id === only), ONLY);
const shot = (page, name) => page.screenshot({ path: path.join(outDir, name + '.jpg'), type: 'jpeg', quality: 62 });

// Waits out the loading card, then lets the scene settle.
async function settle(page, ms = 2000) {
  await page.waitForFunction(() => Game.player && Game.loading <= 0, null, { timeout: 120000 });
  await page.waitForTimeout(ms);
}

// Median and 95th-percentile frame time over `ms`, and one whole frame's draw calls and triangles (every pass summed:
// the info is reset once per frame instead of once per render call).
const measure = (page, ms) => page.evaluate(ms => new Promise(done => {
  const dts = [], info = renderer.info, auto = info.autoReset; let last = performance.now(), frame = null; const end = last + ms;
  info.autoReset = false; info.reset();
  const tick = now => {
    dts.push(now - last); last = now; frame = { calls: info.render.calls, triangles: info.render.triangles }; info.reset();
    if (now < end) { requestAnimationFrame(tick); return; }
    info.autoReset = auto; dts.sort((a, b) => a - b);
    done({ medianMs: +dts[dts.length >> 1].toFixed(1), p95Ms: +dts[Math.floor(dts.length * 0.95)].toFixed(1), ...frame });
  };
  requestAnimationFrame(tick);
}), ms);

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html${STYLE}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], report = { levels: {}, bosses: [] };
  const open = async (w, h, hash = '') => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false })));
    await page.goto(url + hash); await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.evaluate(() => document.getElementById('publicLobby')?.classList.add('hidden'));
    return page;
  };
  try {
    if (want('menu')) for (const [w, h, tag] of [[1280, 720, 'desktop'], [390, 844, 'phone']]) {
      const page = await open(w, h); await page.waitForTimeout(1500); await shot(page, `menu-title-${tag}`); await page.close();
    }
    const page = await open(1280, 720, '#dev');
    if (want('levels')) for (const id of await page.evaluate(() => LEVELS.map(l => l.id))) {
      await page.evaluate(id => Game.startLevel(id), id); await settle(page, 2500);
      report.levels[id] = await measure(page, 3000);
      await shot(page, `level-${id}`);
      console.log(id, JSON.stringify(report.levels[id]));
    }
    const still = async (ids, tag) => { for (const id of ids) {
      await page.evaluate(id => Game.startFight(id), id); await settle(page, 500);
      await page.evaluate(() => {
        // close up: the player hidden at 2-3 m on the enemy's lit side, the camera pulled in to its nearest
        const e = Game.enemies[0], p = Game.player, d = 1.6 + (e.def.scale || 1) * 1.2;
        for (const o of Game.enemies) o.step = function (dt) { this.stateTime += dt; };
        p.rig.root.visible = false; p.rig.root.onBeforeRender = () => {}; Game.zoomTarget = Game.cam.zoom = CONFIG.zoom.min;
        const yaw = (e.yaw ?? 0) + 0.45; p.x = e.x + Math.sin(yaw) * d; p.z = e.z + Math.cos(yaw) * d;
        p.yaw = Math.atan2(e.x - p.x, e.z - p.z); if (Game.cam) Game.cam.yaw = p.yaw; Game.setLock?.(e);
      });
      await page.waitForTimeout(1800);
      await shot(page, `${tag}-${id}`); console.log(tag, id);
    } };
    if (want('enemies')) await still(await enemyIds(page), 'enemy');
    // `windup`: each enemy (ENEMY as above) awake, caught late in an attack's wind-up from 3 m, the player hidden: where its tell glows
    if (want('windup')) for (const id of await enemyIds(page)) {
      await page.evaluate(id => Game.startFight(id), id); await settle(page, 300);
      await page.evaluate(() => {
        const e = Game.enemies[0], p = Game.player; Game.worldWaiting = false; p.maxHp = p.hp = 1e7;
        const yaw = (e.yaw ?? 0) + 0.45, d = 2.2 + (e.def.scale || 1); p.x = e.x + Math.sin(yaw) * d; p.z = e.z + Math.cos(yaw) * d;
        p.yaw = Math.atan2(e.x - p.x, e.z - p.z); if (Game.cam) Game.cam.yaw = p.yaw; Game.setLock?.(e);
        p.rig.root.visible = false; Game.zoomTarget = Game.cam.zoom = CONFIG.zoom.min;
      });
      const got = await page.waitForFunction(() => { const e = Game.enemies[0], h = e.attack && e.attack.hits[e.hitIndex || 0];
        Game.player.rig.root.visible = false;
        return e.state === ES.WINDUP && h && e.stateTime > h.startup * 0.7; }, null, { timeout: 15000, polling: 'raf' }).then(() => true, () => false);
      await shot(page, `windup-${id}`); console.log('windup', id, got ? '' : '(no wind-up caught)');
    }
    if (want('arena')) {
      await page.evaluate(() => Game.startFight('hollow')); await settle(page, 500);
      for (const [i, [x, z, yaw]] of [[-15, 10, 2.3], [14, -10, -0.75]].entries()) {
        await page.evaluate(([x, z, yaw]) => { const p = Game.player; for (const o of Game.enemies) o.step = function (dt) { this.stateTime += dt; };
          p.x = x; p.z = z; p.yaw = yaw; Game.setLock?.(null); if (Game.cam) Game.cam.yaw = yaw; }, [x, z, yaw]);
        await page.waitForTimeout(1500); await shot(page, `arena-${i + 1}`); console.log('arena', i + 1);
      }
    }
    if (want('bosses')) for (const id of await bossIds(page)) {
      await page.evaluate(id => Game.startFight(id), id); await settle(page, 500);
      // The player stands at fighting distance on the boss's lit side, every body frozen mid-idle, locked on.
      await page.evaluate(() => {
        const e = Game.enemies[0], p = Game.player, d = 4 + (e.def.scale || 1) * 2.5;
        for (const o of Game.enemies) o.step = function (dt) { this.stateTime += dt; };
        const yaw = (e.yaw ?? 0) + 0.45; p.x = e.x + Math.sin(yaw) * d; p.z = e.z + Math.cos(yaw) * d;
        p.yaw = Math.atan2(e.x - p.x, e.z - p.z); if (Game.cam) Game.cam.yaw = p.yaw; Game.setLock?.(e);
      });
      await page.waitForTimeout(1800);
      await shot(page, `boss-${id}`); report.bosses.push(id); console.log('boss', id);
    }
    // Each boss fights for real (the world awake, the player unkillable): 5 s, then past its phase change for 6 s more,
    // a frame taken while it attacks. Page errors are counted below (PLAN.md item 2: no console error).
    if (want('fights')) for (const id of await bossIds(page)) {
      await page.evaluate(id => { Game.startFight(id); }, id); await settle(page, 300);
      await page.evaluate(() => { Game.worldWaiting = false; const p = Game.player; p.maxHp = p.hp = 1e7; Game.setLock?.(Game.enemies[0]); });
      await page.waitForTimeout(5000);
      await page.evaluate(() => { for (const e of Game.enemies) if (e.alive() && e.def.phases) { e.hp = e.def.hp * 0.4; e.checkPhaseAt?.(); } Game.player.hp = Game.player.maxHp; });
      await page.waitForFunction(() => Game.enemies.some(e => e.alive() && e.attack && e.state !== ES.RECOVER), null, { timeout: 6000 }).catch(() => {});
      await shot(page, `fight-${id}`);
      await page.waitForTimeout(3000);
      console.log('fight', id, errors.length ? `${errors.length} page errors so far` : 'clean');
    }
    await page.close();
  } finally { await browser.close(); app.server.close(); }
  if (Object.keys(report.levels).length) fs.writeFileSync(path.join(outDir, 'levels-high.json'), JSON.stringify(report.levels, null, 1) + '\n');
  if (errors.length) { console.log('page errors:\n' + [...new Set(errors)].slice(0, 8).join('\n')); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exit(1); });
