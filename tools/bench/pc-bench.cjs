'use strict';
// The benchmark (tools/bench/bench-page.js) on this PC, in headless Edge on its GPU, and frames of each level:
//   node tools/bench/pc-bench.cjs <out.json> [qualities=normal,ultra] [opts json | @file.json]
// Env: SIZE=WxH (1920x1080), SHOTS=<dir> (instead of timing, one frame per level per preset: <dir>/<level>-<preset>.jpg,
// the player at the level's start, as the level faces them, enemies frozen). Takes the shared browser lock itself
// (.scratch/browser.lock in the main checkout, .claude/iterate.md); a run is one browser, closed at the end.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../../tests/browser.cjs');
const { createServer } = require('../../server/index.cjs');

const [out, qualities = 'normal,ultra', rawOpts = '{}'] = process.argv.slice(2);
if (!out) { console.error('usage: node tools/bench/pc-bench.cjs <out.json> [qualities] [opts json | @file]'); process.exit(2); }
const opts = JSON.parse(rawOpts.startsWith('@') ? fs.readFileSync(rawOpts.slice(1), 'utf8') : rawOpts);
const [width, height] = (process.env.SIZE || '1920x1080').split('x').map(Number);
const shots = process.env.SHOTS ? path.resolve(process.env.SHOTS) : null;
const benchPage = fs.readFileSync(path.join(__dirname, 'bench-page.js'), 'utf8');

// The main checkout's lock, also from a worktree (.claude/worktrees/<name>/ is three levels down).
const root = path.resolve(__dirname, '../..');
const main = /[\\/]\.claude[\\/]worktrees[\\/]/.test(root) ? path.resolve(root, '../../..') : root;
const lock = path.join(main, '.scratch', 'browser.lock');

(async () => {
  try { fs.mkdirSync(lock); } catch (e) { throw new Error(`the browser lock is taken (${lock}): ${fs.readFileSync(path.join(lock, 'owner.txt'), 'utf8').trim()}`); }
  fs.writeFileSync(path.join(lock, 'owner.txt'), `pc-bench ${process.pid}\n`);
  const app = createServer({ dev: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const results = {};
  try {
    for (const q of qualities.split(',')) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript(g => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: g, volume: 0, lessons: false })), q);
      await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
      await page.waitForFunction(() => window.__arenaReady, null, { timeout: 180000 });
      await page.evaluate(benchPage);
      if (shots) {
        fs.mkdirSync(shots, { recursive: true });
        const ids = await page.evaluate(o => o.levels === 'all' || !o.levels ? LEVELS.map(l => l.id) : o.levels, opts);
        for (const id of ids) {
          await page.evaluate(async ([id, set]) => {
            if (set) { for (const [p, v] of Object.entries(set)) { const k = p.split('.'), last = k.pop(); k.reduce((t, x) => t[x], CONFIG)[last] = v; }
              visuals.setQuality(Object.keys(CONFIG.VISUALS.quality).find(k => CONFIG.VISUALS.quality[k] === visuals.quality())); }
            Game.startLevel(id);
            const end = performance.now() + 120000;
            while (!(Game.player && Game.loading <= 0 && !Game.pendingLoad)) { if (performance.now() > end) throw new Error('timed out'); await new Promise(r => setTimeout(r, 100)); }
            for (const o of Game.enemies || []) o.step = function (dt) { this.stateTime += dt; };
            const p = Game.player;
            if (Game.cam) Game.cam.yaw = p.yaw;
            await new Promise(r => setTimeout(r, 2500));
          }, [id, opts.set || null]);
          await page.screenshot({ path: path.join(shots, `${id}-${q}.jpg`), type: 'jpeg', quality: 85 });
          console.log(`shot ${id} ${q}`);
        }
        results[q] = { shots: ids.length, errors };
      } else {
        const r = await page.evaluate(o => window.__bench(o), opts);
        r.errors.push(...errors);
        results[q] = r;
        for (const [id, v] of Object.entries({ ...r.levels, ...r.fights })) console.log(`${q} ${id} fps ${v.fps} low1 ${v.low1} calls ${v.calls}`);
      }
      if (errors.length) console.log(`${q} errors:\n  ${errors.slice(0, 5).join('\n  ')}`);
      await page.close();
    }
  } finally {
    await browser.close(); await app.close();
    fs.rmSync(lock, { recursive: true, force: true });
  }
  fs.writeFileSync(out, JSON.stringify({ size: [width, height], machine: 'pc', results }, null, 2));
})().catch(e => { console.error(e.message || e); process.exitCode = 1; });
