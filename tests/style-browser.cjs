'use strict';
// The game's art styles (js/style-lab.js, js/data/styles.js): every page without ?style= draws the default (cel), on
// Normal inking from the scene's own depth (no pre-pass, pass 155); ?style=classic is the way back (no extra pass);
// every style loads with ?style=<id>, compiles its shaders and draws the Pillager Captain's fight with no page or
// console error. One headless Edge.
const assert = require('node:assert/strict');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');

(async () => {
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const passes = {};
    for (const style of ['', 'classic', 'cel', 'dark', 'paint']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false })));
      await page.goto(`${base}${style ? `?style=${style}` : ''}#dev`);
      await page.waitForFunction(() => window.__arenaReady, null, { timeout: 180000 });
      await page.evaluate(() => Game.startFight('pillagerCaptain'));
      await page.waitForFunction(() => Game.player && Game.loading <= 0, null, { timeout: 120000 });
      await page.waitForFunction(() => !styleLab.def.post || styleLab.frames > 5, null, { timeout: 60000 });
      const r = await page.evaluate(() => ({ style: styleLab.style, passes: visuals.composer.passes.length, frames: styleLab.frames,
        sceneDepth: styleLab.sceneDepth, dflt: STYLE_DEFS.find(s => s.default).id }));
      assert.equal(r.style, style || r.dflt, `?style=${style} chose ${r.style}`);
      assert.deepEqual(errors, [], `${style || 'no style'}: errors`);
      if (!style) {
        assert.equal(r.style, 'cel', 'the default look is cel');
        assert.equal(r.sceneDepth, true, 'on Normal the default inks from the scene depth (no pre-pass)');
        // Ultra (MSAA) takes the pre-pass after the light pass, before bloom; back on Normal, the scene depth right after the scene.
        const at = async q => page.evaluate(async q => {
          visuals.setQuality(q); const f = styleLab.frames;
          while (styleLab.frames < f + 3) await new Promise(r => requestAnimationFrame(r));
          const L = visuals.composer.passes;
          return { index: L.indexOf(styleLab.pass), bloom: L.indexOf(visuals.passes.bloom), sceneDepth: styleLab.sceneDepth };
        }, q);
        const ultra = await at('ultra'), normal = await at('normal');
        assert.deepEqual([ultra.index, ultra.sceneDepth], [ultra.bloom - 1, false], `Ultra: pre-pass before bloom (${JSON.stringify(ultra)})`);
        assert.deepEqual([normal.index, normal.sceneDepth], [1, true], `Normal again: scene depth after the scene (${JSON.stringify(normal)})`);
        assert.deepEqual(errors, [], 'quality changes: errors');
      }
      passes[style || 'none'] = r.passes;
      console.log(`${style || 'no style'} (${r.style}): ${r.passes} passes, ${r.frames} style frames, clean`);
      await page.close();
    }
    for (const s of ['none', 'cel', 'dark', 'paint']) assert.equal(passes[s], passes.classic + 1, `${s}: one pass added to classic`);
    console.log('style-browser: ok');
  } finally { await browser.close(); app.server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
