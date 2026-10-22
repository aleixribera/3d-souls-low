'use strict';
// Standalone browser-suite runner, so renderer checks can run in a fresh process.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true,
    args: process.env.ARENA_SOFTWARE_GL ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [] });
  const messages = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', e => messages.push(e.stack));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady && window.__arena.tests, { timeout: 120000 });
    const results = await page.evaluate(async filter => { Game.manualClock = true; return __arena.tests.run(filter); }, process.argv[2] || '');
    const output = path.resolve('.scratch/multiplayer-solo'); fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ results, messages }, null, 2));
    console.log(results.summary);
    if (results.failed?.length) throw new Error(results.failed.join('\n'));
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
