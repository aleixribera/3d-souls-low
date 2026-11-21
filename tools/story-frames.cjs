'use strict';
// Story chapter frames (pass 167, the Story levels redone): the same places of a chapter shot the same way before and
// after a redo, so the two contact sheets compare one for one. One headless Edge on the Normal preset, lessons off, the
// game never stepped while it shoots (paused: nothing moves).
//   node tools/browser-lock.cjs run <pass> -- node tools/story-frames.cjs <tag> <levelId ...>
// Per room of the chapter, in its own order, the player stands on the room's near side, facing in (toward the next
// room's middle when the room is the way on). Frames land in .scratch/story-frames/<level>/<tag>-NN.jpg, and a contact
// sheet of them in docs/story/audit/<level>-<tag>.jpg (ffmpeg's tile).
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const [tag, ...ids] = process.argv.slice(2);
if (!tag || !ids.length) { console.error('usage: node tools/story-frames.cjs <tag> <levelId ...>'); process.exit(2); }
const root = path.join(__dirname, '..'), sheets = path.join(root, 'docs', 'story', 'audit');
(async () => {
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`, { timeout: 180000 });
    await page.waitForFunction(() => window.__arenaReady && window.__arena.tests, null, { timeout: 180000 });
    for (const id of ids) {
      const dir = path.join(root, '.scratch', 'story-frames', id); fs.mkdirSync(dir, { recursive: true });
      for (const f of fs.readdirSync(dir)) if (f.startsWith(tag + '-')) fs.unlinkSync(path.join(dir, f));
      const shots = await page.evaluate(id => {
        const A = window.__arena, sim = A.tests.sim;
        sim.begin(); story.jumpTo(id); Game.loading = 0;
        const L = Game.level, rooms = L.rooms || [];
        const mid = R => ({ x: (R.rect[0] + R.rect[1]) / 2, z: (R.rect[2] + R.rect[3]) / 2, y: R.y || 0 });
        const list = [];
        rooms.forEach((R, i) => {
          if (R.rect[1] - R.rect[0] < 3 || R.rect[3] - R.rect[2] < 3) return;   // a doorway, not a place
          const c = mid(R), prev = i ? mid(rooms[i - 1]) : { x: L.start.x, z: L.start.z }, next = rooms[i + 1] ? mid(rooms[i + 1]) : null;
          const ax = Math.sign(c.x - prev.x) * Math.min(Math.abs(c.x - prev.x), (R.rect[1] - R.rect[0]) * 0.35);
          const az = Math.sign(c.z - prev.z) * Math.min(Math.abs(c.z - prev.z), (R.rect[3] - R.rect[2]) * 0.35);
          const at = { x: c.x - ax, z: c.z - az, y: c.y };
          const to = next && Math.hypot(next.x - at.x, next.z - at.z) < 60 ? next : c;
          list.push({ room: R.id, ...at, yaw: Math.atan2(to.x - at.x, to.z - at.z) || L.start.yaw || 0 });
        });
        return list;
      }, id);
      let n = 0;
      for (const s of shots) {
        await page.evaluate(s => {
          const A = window.__arena, sim = A.tests.sim;
          sim.place(s.x, s.z, s.y + 0.5); if (!Number.isFinite(Game.player.y)) sim.place(s.x, s.z, Infinity);
          Game.player.yaw = Game.cam.yaw = s.yaw; Game.cam.pitch = 0.18; Game.zoomTarget = Game.cam.zoom = CONFIG.zoom.default;
          for (const id of ['loading', 'fade']) { const el = document.getElementById(id); el.style.transition = 'none'; el.classList.remove('show'); }
          // One long frame first: a level's `areas` and interior look ease in over time (the light as you'd see it there).
          for (let i = 0; i < 3; i++) { Game.updateCamera(1 / 60, true); Game.render(1, i ? 1 / 60 : 3); }
        }, s);
        await page.screenshot({ path: path.join(dir, `${tag}-${String(++n).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 80 });
      }
      const cols = 4, rows = Math.ceil(n / cols);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(dir, `${tag}-%02d.jpg`),
        '-vf', `scale=480:270,tile=${cols}x${rows}:padding=4:color=black`, '-frames:v', '1', '-q:v', '4', path.join(sheets, `${id}-${tag}.jpg`)]);
      console.log(`${id}: ${n} frames (${shots.map(s => s.room).join(', ')}) -> docs/story/audit/${id}-${tag}.jpg`);
    }
  } finally { await browser.close(); await app.close(); }
  if (errors.length) { console.log('page errors:\n  ' + errors.join('\n  ')); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exitCode = 1; });
