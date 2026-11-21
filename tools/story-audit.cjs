'use strict';
// The Story audit (pass 163): plays every Story chapter through in the real page (headless Edge, #dev, the hand-stepped
// clock) with tools/story-audit-page.js and prints each chapter's findings: placements off the floor or in walls, routes
// that do not exist, walks that stick, fights whose gates never open, pickups and saves that fail, chapters that do not
// carry on, page errors. Frames land in .scratch/story-audit/ (spawn, the gift, the boss won, each problem).
//   node tools/browser-lock.cjs run <pass> -- node tools/story-audit.cjs [levelId ...] [--no-frames] [--json out.json]
// Exits 1 when any chapter has a severity-1 finding (it stops a player).
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const args = process.argv.slice(2), frames = !args.includes('--no-frames');
const jsonAt = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--json');
const dir = path.resolve('.scratch/story-audit'); fs.mkdirSync(dir, { recursive: true });
(async () => {
  const app = createServer({ dev: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const all = [];
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const messages = [];
    page.on('console', m => { if (m.type() === 'error') messages.push(m.text()); });
    page.on('pageerror', e => messages.push(e.stack || e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 })));
    await page.exposeFunction('__auditFrame', async name => { await page.screenshot({ path: path.join(dir, name + '.png'), timeout: 120000 }); });
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`, { timeout: 180000 });   // a busy PC: generous waits
    await page.waitForFunction(() => window.__arenaReady && window.__arena.tests && typeof MODELLAB !== 'undefined', { timeout: 180000 });
    await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'story-audit-page.js'), 'utf8') });
    const ids = only.length ? only : await page.evaluate(() => __arena.STORY.chapters.map(c => c.level));
    let worst = 9;
    for (const id of ids) {
      const t0 = Date.now(), before = messages.length;
      const r = await page.evaluate(([id, frames]) => window.__storyAudit(id, { frames }), [id, frames]);
      r.console = messages.slice(before);
      all.push(r);
      console.log(`\n== ${id}: ${r.findings.length} findings, ${r.seconds.toFixed(0)} s walked, exit ${r.exit}, ${((Date.now() - t0) / 1000).toFixed(0)} s real`);
      for (const f of r.findings) { worst = Math.min(worst, f.sev); console.log(`  [${f.sev}] ${f.kind}: ${f.text}${f.at ? ` @ (${f.at.x}, ${f.at.y}, ${f.at.z})` : ''}`); }
      for (const e of [...new Set([...r.errors, ...r.console])].slice(0, 8)) console.log(`  ERROR ${String(e).split('\n')[0]}`);
      if (r.errors.length || r.console.length) worst = Math.min(worst, 1);
    }
    if (jsonAt) fs.writeFileSync(jsonAt, JSON.stringify(all, null, 2));
    if (worst === 1) process.exitCode = 1;
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
