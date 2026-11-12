'use strict';
// Standalone browser-suite runner, so renderer checks can run in a fresh process.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true,
    args: process.env.ARENA_SOFTWARE_GL ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [] });
  const messages = [];
  try {
    // 640x360: a quarter of 720p's pixels, so a run weighs little on the GPU (and on the CPU under software WebGL).
    // ARENA_VIEWPORT=WxH picks another size.
    const [width, height] = (process.env.ARENA_VIEWPORT || '640x360').split('x').map(Number);
    if (!(width > 0 && height > 0)) throw new Error(`ARENA_VIEWPORT must be WxH, not "${process.env.ARENA_VIEWPORT}"`);
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', e => messages.push(e.stack));
    // One line per test as it ends, so a run cut short by a timeout still shows how far it got and what was slow.
    let done = 0;
    await page.exposeFunction('__testProgress', ({ name, ok, ms }) => {
      done++; if (!ok || ms > 5000 || process.env.ARENA_TEST_PROGRESS) console.log(`${String(done).padStart(4)} ${ok ? 'ok  ' : 'FAIL'} ${(ms / 1000).toFixed(1).padStart(6)} s  ${name}`);
    });
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady && window.__arena.tests, { timeout: 120000 });
    // ARENA_SHARD=k/n (1-based k): run only that slice of the suite, as one of n parallel CI jobs.
    const m = /^(\d+)\/(\d+)$/.exec(process.env.ARENA_SHARD || ''), shard = m ? [m[1] - 1, +m[2]] : null;
    if (process.env.ARENA_SHARD && !(shard && shard[0] >= 0 && shard[0] < shard[1])) throw new Error(`ARENA_SHARD must be k/n with 1 <= k <= n, not "${process.env.ARENA_SHARD}"`);
    const results = await page.evaluate(async ([filter, shard]) => { Game.manualClock = true; return __arena.tests.run(filter, { shard }); }, [process.argv[2] || '', shard]);
    const output = path.resolve('.scratch/multiplayer-solo'); fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ results, messages }, null, 2));
    console.log(results.summary);
    console.log(`slowest:\n  ${results.slowest.join('\n  ')}`);
    if (results.failed?.length) throw new Error(results.failed.join('\n'));
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
