'use strict';
// Close looks at summons (pass 147): each called on a Pillager Captain in the cel style, the camera set beside it for a
// few frames of its life, saved to <out>/closeup-<id>-<n>.jpg (default: the OS temp folder). For checking a summon's
// model and moves where the game's own camera would show it small behind the boss.
// Usage: node tools/summon-closeups.cjs [ability-id ...] [--out <dir>] [--at 1.2,2,2.8]
require('../tests/low-priority.cjs');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null; };
const out = opt('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'closeups-'));
const at = (opt('--at') || '1.2,2,2.8').split(',').map(Number);
const ids = args.length ? args : ['ronin-shade', 'mire-serpent', 'puppet-knight', 'ash-bear', 'glass-mantis'];

(async () => {
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html?style=cel`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.evaluate(() => Game.startFight('pillagerCaptain'));
    await page.waitForFunction(() => Game.mode === 'play' && Game.player && Game.duel && !Game.loading, null, { timeout: 60000 });
    await page.evaluate(() => { Game.manualClock = true; Game.worldWaiting = false; document.querySelectorAll('body > *:not(canvas)').forEach(n => { if (n.style) n.style.visibility = 'hidden'; }); });
    for (const id of ids) {
      await page.evaluate(id => {
        const p = Game.player, e = Game.duel; e.cooldown = 999; e.hp = e.maxHp = 1e6;
        for (const m of [summonFigures, summonBrutes, summonCoil]) m.clear();
        abilityPowers.reset(); p.grantAbilities([id]); abilityPowers.reset();
        e.x = p.x + Math.sin(p.yaw) * 3; e.z = p.z + Math.cos(p.yaw) * 3; e.yaw = Math.atan2(p.x - e.x, p.z - e.z);
        abilityPowers.trigger('self', p, p.kit, 'press', { enemy: e, key: 'summon', x: e.x, y: e.y, z: e.z });
        window.__t = 0;
      }, id);
      for (const [n, t] of at.entries()) {
        await page.evaluate(t => {
          for (; window.__t < t; window.__t += CONFIG.step) { Game.update(CONFIG.step); Game.render(1, CONFIG.step); }
          const s = [...summonFigures.info(), ...summonBrutes.info(), ...summonCoil.info()][0], e = Game.duel;
          if (!s) return;
          const p = Game.player, on = Math.hypot(s.x - e.x, s.z - e.z) < 0.1;   // a serpent is on the boss: from the player's side then
          const dx = on ? p.x - e.x : s.x - e.x, dz = on ? p.z - e.z : s.z - e.z, l = Math.hypot(dx, dz) || 1, side = [-dz / l, dx / l];   // beside it, square to the boss (and the player)
          camera.position.set(s.x + side[0] * 4.2 + dx / l * 1.5, e.y + 1.8, s.z + side[1] * 4.2 + dz / l * 1.5);
          camera.lookAt((s.x + e.x) / 2, e.y + 1.1, (s.z + e.z) / 2); camera.updateMatrixWorld();
          if (visuals.composer) visuals.composer.render(); else renderer.render(scene, camera);
        }, t);
        await page.screenshot({ path: path.join(out, `closeup-${id}-${n}.jpg`), type: 'jpeg', quality: 80 });
      }
    }
  } finally { await browser.close(); app.server.close(); }
  console.log('closeups ->', out);
  if (errors.length) { console.log('page errors:\n' + [...new Set(errors)].slice(0, 8).join('\n')); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exit(1); });
