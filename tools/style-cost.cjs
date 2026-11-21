'use strict';
// What the default style (cel) costs a frame (PLAN's Speed row): the Pillager Captain's fight, a bot at the player's keys,
// on Normal at 100% render scale, at each screen size given, every body frozen and the camera still (so the GPU's
// numbers are steady; LIVE=1 lets the bot fight instead), measured four ways in the same scene:
//   classic   ?style=classic (no style)
//   default   no ?style= (cel: the bands, and the ink from the scene's own depth on Normal)
//   prepass   the default with its depth + normal pre-pass forced (styleLab.prepassAlways; the look before pass 155)
//   shadeOnly the default with its screen pass switched off
// WxH@N draws at pixel ratio N, for more fill on this PC's fast GPU.
// Unthrottled (no vsync), so compare the rows: gpuMs is the GPU's own time for the frame, frameMs rAF to rAF.
// SHOTS=<dir>: also a frame of each run, <dir>/<size>-<run>.png.
// Usage: node tools/style-cost.cjs [WxH[@dpr],...=1920x1080,2560x1440@3] [seconds=6]
// Takes the shared browser lock (docs/two-tracks.md); one headless Edge, closed at the end.
require('../tests/low-priority.cjs');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');
const { acquire } = require('./browser-lock.cjs');

const [sizeArg = '1920x1080,2560x1440@3', secArg = '6'] = process.argv.slice(2);
const SIZES = sizeArg.split(',').map(s => { const [wh, dpr = '1'] = s.split('@'); return [...wh.split('x').map(Number), Number(dpr)]; });
const MS = Number(secArg) * 1000;
const SHOTS = process.env.SHOTS ? require('node:path').resolve(process.env.SHOTS) : null;
if (SHOTS) require('node:fs').mkdirSync(SHOTS, { recursive: true });
const shot = (page, size, run) => SHOTS && page.screenshot({ path: require('node:path').join(SHOTS, `${size}-${run.replace(/W+/g, '-')}.png`) });

const startFight = page => page.evaluate(async live => {
  Game.startFight('pillagerCaptain');
  const end = performance.now() + 120000;
  while (!(Game.player && Game.loading <= 0 && !Game.pendingLoad)) { if (performance.now() > end) throw new Error('timed out'); await new Promise(r => setTimeout(r, 100)); }
  document.getElementById('publicLobby')?.classList.add('hidden');
  const p = Game.player; p.maxHp = p.hp = 1e7; Game.worldWaiting = false;
  Game.setLock?.(Game.enemies[0]);
  if (live) {
    const brain = bot.create(BOT_PROFILES[0]); p.ctl = brain.hands;
    Game.moveInput = () => brain.think(CONFIG.step, p, Game.enemies.filter(e => e.alive()), [], projectiles.live(), null).mv;
    return;
  }
  const e = Game.enemies[0], d = 4 + (e.def.scale || 1) * 2.5;   // as tools/style-frames.cjs "still"
  for (const o of Game.enemies) o.step = function (dt) { this.stateTime += dt; };
  const yaw = (e.yaw ?? 0) + 0.45; p.x = e.x + Math.sin(yaw) * d; p.z = e.z + Math.cos(yaw) * d;
  p.yaw = Math.atan2(e.x - p.x, e.z - p.z); if (Game.cam) Game.cam.yaw = p.yaw;
}, !!process.env.LIVE);
// frameMs: rAF to rAF (CPU-bound on a fast GPU). gpuMs: the GPU's own time for the frame's draw (the composer's render,
// timed with EXT_disjoint_timer_query_webgl2), the number that grows on a fill-bound integrated GPU.
const measure = (page, ms) => page.evaluate(ms => new Promise(done => {
  const gl = renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const comp = visuals.composer, render = comp.render, open = [], gpu = [];
  if (ext) comp.render = function (...a) { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); try { return render.apply(this, a); } finally { gl.endQuery(ext.TIME_ELAPSED_EXT); open.push(q); } };
  const poll = () => {
    while (open.length && gl.getQueryParameter(open[0], gl.QUERY_RESULT_AVAILABLE)) {
      const q = open.shift(); if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(q);
    }
  };
  const dts = []; let last = performance.now();
  const end = last + ms;
  const pct = (a, p) => +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(2);
  const tick = now => {
    dts.push(now - last); last = now; Game.player.hp = Game.player.maxHp;
    if (ext) poll();
    if (now < end) { requestAnimationFrame(tick); return; }
    comp.render = render;
    dts.shift(); dts.sort((a, b) => a - b); gpu.sort((a, b) => a - b);
    const mean = a => +(a.reduce((s, x) => s + x, 0) / Math.max(1, a.length)).toFixed(2);
    done({ frameMs: mean(dts), frameP99: pct(dts, 0.99), gpuMs: gpu.length ? mean(gpu) : null, gpuP99: gpu.length ? pct(gpu, 0.99) : null, frames: dts.length });
  };
  requestAnimationFrame(tick);
}), ms);

(async () => {
  const freeLock = await acquire(`style-cost ${process.pid}`);
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const rows = [];
  try {
    for (const [w, h, dpr] of SIZES) {
      const size = `${w}x${h}@${dpr}`;
      for (const style of ['classic', '']) {
        const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false, renderScale: 1 })));
        await page.goto(`${base}${style ? `?style=${style}` : ''}#dev`);
        await page.waitForFunction(() => window.__arenaReady, null, { timeout: 180000 });
        const lab0 = await page.evaluate(() => ({ style: styleLab.style, quality: visuals.quality().label }));
        if (lab0.quality !== 'Normal') throw new Error(`page drew ${JSON.stringify(lab0)}`);
        await startFight(page);
        await page.waitForTimeout(3000);
        const r = await measure(page, MS);
        const lab = await page.evaluate(() => ({ style: styleLab.style, sceneDepth: styleLab.sceneDepth }));
        rows.push({ size, run: style ? 'classic' : `default (${lab.style})`, ...r });
        await shot(page, size, style ? 'classic' : 'default');
        if (!style) {
          if (!lab.sceneDepth) throw new Error('the default style did not ink from the scene depth on Normal');
          for (const [run, set] of [['prepass', 'styleLab.prepassAlways = true'], ['shadeOnly', 'styleLab.prepassAlways = false; styleLab.pass.enabled = false'],
                                    ['default again', 'styleLab.pass.enabled = true']]) {
            await page.evaluate(set); await page.waitForTimeout(500);
            rows.push({ size, run, ...(await measure(page, MS)) });
            await shot(page, size, run);
          }
        }
        if (errors.length) throw new Error(errors.join('\n'));
        await context.close();
      }
    }
    console.table(rows);
  } finally { await browser.close(); app.server.close(); freeLock(); }
})().catch(e => { console.error(e); process.exit(1); });
