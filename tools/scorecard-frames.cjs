'use strict';
// Evidence frames: the title menu at desktop and phone width, one frame per Ashmere level from
// its start (with frame time, draw calls and triangles on High), and one frame per boss in a Practice duel, front-lit at
// fighting distance. Usage: node tools/scorecard-frames.cjs [outDir=docs/scorecard] [levels|bosses|menu ...]
// One headless Edge, closed at the end; idle priority through tests/low-priority.cjs.
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const [outDir = 'docs/scorecard', ...parts] = process.argv.slice(2);
const want = p => !parts.length || parts.includes(p);
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
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], report = { levels: {}, bosses: [] };
  const open = async (w, h, hash = '') => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'high', volume: 0, lessons: false })));
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
    if (want('bosses')) for (const id of await page.evaluate(() => ENEMY_DEFS.filter(isBossDef).map(d => d.id))) {
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
    await page.close();
  } finally { await browser.close(); app.server.close(); }
  if (Object.keys(report.levels).length) fs.writeFileSync(path.join(outDir, 'levels-high.json'), JSON.stringify(report.levels, null, 1) + '\n');
  if (errors.length) { console.log('page errors:\n' + [...new Set(errors)].slice(0, 8).join('\n')); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exit(1); });
