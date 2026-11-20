'use strict';
// The art style exploration (js/style-lab.js, PLAN.md item 4): every style of js/data/styles.js loads with ?style=<id>,
// compiles its shaders and draws the Pillager Captain's fight with no page or console error; without ?style the game's
// own pipeline is untouched (no extra pass). One headless Edge.
const assert = require('node:assert/strict');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');

(async () => {
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const passes = {};
    for (const style of ['', 'cel', 'dark', 'paint']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false })));
      await page.goto(`${base}${style ? `?style=${style}` : ''}#dev`);
      await page.waitForFunction(() => window.__arenaReady, null, { timeout: 180000 });
      await page.evaluate(() => Game.startFight('pillagerCaptain'));
      await page.waitForFunction(() => Game.player && Game.loading <= 0, null, { timeout: 120000 });
      await page.waitForFunction(() => !styleLab.def || !styleLab.def.post || styleLab.frames > 5, null, { timeout: 60000 });
      const r = await page.evaluate(() => ({ style: styleLab.style, passes: visuals.composer.passes.length, frames: styleLab.frames }));
      assert.equal(r.style, style || null, `?style=${style} chose ${r.style}`);
      assert.deepEqual(errors, [], `${style || 'no style'}: errors`);
      passes[style || 'none'] = r.passes;
      console.log(`${style || 'no style'}: ${r.passes} passes, ${r.frames} style frames, clean`);
      await page.close();
    }
    for (const s of ['cel', 'dark', 'paint']) assert.equal(passes[s], passes.none + 1, `${s}: one pass added`);
    console.log('style-browser: ok');
  } finally { await browser.close(); app.server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
