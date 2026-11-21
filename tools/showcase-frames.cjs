'use strict';
// Stills of the showcase (js/showcase.js) at chosen beats, for checking a fight, a fade or the overlay without recording
// the whole show: the show stepped by hand in headless Edge, a screenshot at each beat asked for.
//   node tools/showcase-frames.cjs <outDir> <beat>[,<beat>...]|none [--phone] [--still]
// Writes <outDir>/showcase-b<beat>.jpg (1280x720; 390x844 with --phone) and prints the run's beats. `--still`: with
// reduced motion. One headless Edge at idle priority, closed at the end. Take the browser lock first
// (docs/two-tracks.md): node tools/browser-lock.cjs run <pass> -- node tools/showcase-frames.cjs ...
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const [outDir, list] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const phone = process.argv.includes('--phone'), still = process.argv.includes('--still');
if (!outDir || !list) { console.error('usage: node tools/showcase-frames.cjs <outDir> <beat>[,<beat>...] [--phone] [--still]'); process.exit(2); }
const beats = list === 'none' ? [] : list.split(',').map(Number).sort((a, b) => a - b);

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const app = createServer({ dev: true });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const size = phone ? { width: 390, height: 844 } : { width: 1280, height: 720 };
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ v: 2, graphics: 'normal', volume: 0, lessons: false })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 180000 });
    await page.evaluate(still => { document.getElementById('publicLobby')?.classList.add('hidden'); if (still) reducedMotion.force(true); return document.fonts.ready; }, still);
    const ok = await page.evaluate(() => showcase.play({ manual: true, toMenu: false }));
    if (!ok) throw new Error('the showcase did not start');
    for (const b of beats) {
      // Up to just before the beat without drawing, then a few drawn frames into it.
      await page.evaluate(b => {
        const B = 60 / SHOWCASE.bpm, S = CONFIG.step;
        while (showcase.running && showcase.time < b * B - 4 * S) showcase.frame(S, { render: false });
        for (let i = 0; i < 4 && showcase.running; i++) showcase.frame(S, { render: true });
        const p = Game.player, e = Game.enemies[0], c = Game.cam.pos, r = v => Math.round(v * 10) / 10;
        return new Promise(requestAnimationFrame).then(() => `player ${r(p.x)},${r(p.z)}  ${e.baseDef.id} ${r(e.x)},${r(e.z)} h ${r(e.height)} ${e.state} shown ${e.rig.root.visible}  camera ${r(c.x)},${r(c.y)},${r(c.z)}`);
      }, b).then(w => console.log(`beat ${b}: ${w}`));
      const file = path.join(outDir, `showcase-b${b}${phone ? '-phone' : ''}.jpg`);
      await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
      console.log(file);
    }
    const report = await page.evaluate(() => { while (showcase.running) showcase.frame(CONFIG.step, { render: false }); return showcase.report(); });
    console.log(report.beats.map(x => `${x.id}:${x.ok ? 'ok' : 'MISSED ' + x.need.filter(n => !n.ok).map(n => n.what).join('; ') + ` (dodges ${x.dodges} deflects ${x.parries} of ${x.hits}, hurt ${x.hurt}, window ${x.window}, swung ${x.swung})`}`).join('\n'));
    if (errors.length) console.warn('page errors:\n  ' + errors.slice(0, 5).join('\n  '));
  } finally {
    await browser.close();
    app.server.close();
  }
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
