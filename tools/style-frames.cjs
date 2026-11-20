'use strict';
// The art style exploration's evidence (PLAN.md item 4), into docs/style/: for each style of js/data/styles.js, the
// player (a bot at the keys, unhurt) against the Pillager Captain in his arena, on Normal at 1280x720:
//   <style>-still.jpg  both frozen mid-idle at fighting distance, the camera behind the player (the same frame each time)
//   <style>-fight.jpg  a frame of the live fight while the Captain attacks
//   <style>.mp4        10 s of the live fight (recorded by the browser, cut and encoded with ffmpeg)
//   frame-times.json   each style's mean and 99th-percentile frame time over 8 s of the fight, on this PC's GPU
//   side-by-side.jpg   the four stills in a grid, named
// Usage: node tools/style-frames.cjs [styles=all] [still,fight,clip,time]   e.g. node tools/style-frames.cjs cel still
// Takes the shared browser lock (docs/two-tracks.md); one headless Edge, closed at the end.
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs', 'style');
const [styleArg = 'all', partArg = 'still,fight,clip,time'] = process.argv.slice(2);
const parts = new Set(partArg.split(','));
const STYLES = styleArg === 'all' ? ['control', 'cel', 'dark', 'paint'] : styleArg.split(',');
const BOSS = 'pillagerCaptain', W = 1280, H = 720, CLIP = 10;
const main = /[\\/]\.claude[\\/]worktrees[\\/]/.test(root) ? path.resolve(root, '../../..') : root;
const lock = path.join(main, '.scratch', 'browser.lock');
let ownLock = false, cleanup = () => {};

// In the page: the fight started, loaded and awake, the player unhurt; `botOn`: a bot at the player's keys.
const startFight = async (page, botOn) => page.evaluate(async ([boss, botOn]) => {
  Game.startFight(boss);
  const end = performance.now() + 120000;
  while (!(Game.player && Game.loading <= 0 && !Game.pendingLoad)) { if (performance.now() > end) throw new Error('timed out'); await new Promise(r => setTimeout(r, 100)); }
  document.getElementById('publicLobby')?.classList.add('hidden');
  const p = Game.player; p.maxHp = p.hp = 1e7; Game.worldWaiting = false;
  Game.setLock?.(Game.enemies[0]);
  if (botOn) {
    const brain = bot.create(BOT_PROFILES[0]); p.ctl = brain.hands;
    Game.moveInput = () => brain.think(CONFIG.step, p, Game.enemies.filter(e => e.alive()), [], projectiles.live(), null).mv;
  }
}, [BOSS, botOn]);
const measure = (page, ms) => page.evaluate(ms => new Promise(done => {
  const dts = [], info = renderer.info, auto = info.autoReset; let last = performance.now(), calls = 0, n = 0;
  const end = last + ms; info.autoReset = false; info.reset();
  const tick = now => {
    dts.push(now - last); last = now; calls += info.render.calls; n++; info.reset();
    Game.player.hp = Game.player.maxHp;
    if (now < end) { requestAnimationFrame(tick); return; }
    info.autoReset = auto; dts.shift(); dts.sort((a, b) => a - b);
    const mean = dts.reduce((s, x) => s + x, 0) / dts.length;
    done({ meanMs: +mean.toFixed(2), p99Ms: +dts[Math.floor(dts.length * 0.99)].toFixed(2), fps: +(1000 / mean).toFixed(1), calls: Math.round(calls / n), frames: dts.length });
  };
  requestAnimationFrame(tick);
}), ms);

(async () => {
  fs.mkdirSync(out, { recursive: true });
  try { fs.mkdirSync(lock); } catch (e) { throw new Error(`the browser lock is taken (${lock})`); }
  ownLock = true;
  fs.writeFileSync(path.join(lock, 'owner.txt'), `style-frames ${process.pid}\n`);
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  cleanup = () => { app.server.close(); if (ownLock) { ownLock = false; fs.rmSync(lock, { recursive: true, force: true }); } };
  const base = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const timesFile = path.join(out, 'frame-times.json');
  const times = fs.existsSync(timesFile) ? JSON.parse(fs.readFileSync(timesFile, 'utf8')) : {};
  const errors = [];
  const open = async (style, video) => {
    const context = await browser.newContext({ viewport: { width: W, height: H }, ...(video ? { recordVideo: { dir: path.join(main, '.scratch', 'style-video'), size: { width: W, height: H } } } : {}) });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(`${style}: ${e.message.slice(0, 200)}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${style}: ${m.text().slice(0, 200)}`); });
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false })));
    await page.goto(`${base}?style=${style}#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 180000 });
    const lab = await page.evaluate(() => ({ style: styleLab.style, quality: visuals.quality().label }));
    if (lab.style !== style || lab.quality !== 'Normal') throw new Error(`${style}: page drew ${JSON.stringify(lab)}`);
    return { context, page };
  };
  try {
    for (const style of STYLES) {
      if (parts.has('still') || parts.has('fight') || parts.has('time')) {
        const { context, page } = await open(style, false);
        if (parts.has('still')) {
          await startFight(page, false);
          await page.evaluate(() => {   // as tools/scorecard-frames.cjs "bosses": the player on the boss's lit side, every body frozen
            const e = Game.enemies[0], p = Game.player, d = 4 + (e.def.scale || 1) * 2.5;
            for (const o of Game.enemies) o.step = function (dt) { this.stateTime += dt; };
            const yaw = (e.yaw ?? 0) + 0.45; p.x = e.x + Math.sin(yaw) * d; p.z = e.z + Math.cos(yaw) * d;
            p.yaw = Math.atan2(e.x - p.x, e.z - p.z); if (Game.cam) Game.cam.yaw = p.yaw;
          });
          await page.waitForTimeout(2000);
          await page.screenshot({ path: path.join(out, `${style}-still.jpg`), type: 'jpeg', quality: 82 });
          console.log(style, 'still');
        }
        if (parts.has('fight') || parts.has('time')) {
          await startFight(page, true);
          await page.waitForTimeout(3000);
          if (parts.has('time')) { times[style] = await measure(page, 8000); console.log(style, JSON.stringify(times[style])); }
          if (parts.has('fight')) {
            await page.waitForFunction(() => Game.enemies.some(e => e.alive() && e.attack && e.state === ES.ACTIVE), null, { timeout: 15000 }).catch(() => {});
            await page.screenshot({ path: path.join(out, `${style}-fight.jpg`), type: 'jpeg', quality: 82 });
            console.log(style, 'fight');
          }
        }
        await context.close();
      }
      if (parts.has('clip')) {
        const t0 = Date.now();   // close to the video's first frame: the recording starts with the page, before it loads
        const { context, page } = await open(style, true);
        await startFight(page, true);
        await page.waitForTimeout(2500);
        const from = (Date.now() - t0) / 1000;   // the page's load, the fight's start and 2.5 s of it
        await page.waitForTimeout(CLIP * 1000 + 500);
        const video = page.video(); await context.close();
        const raw = await video.path();
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', from.toFixed(2), '-i', raw, '-t', String(CLIP), '-an', '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', path.join(out, `${style}.mp4`)]);
        fs.rmSync(raw, { force: true });
        console.log(style, 'clip');
      }
    }
    if (parts.has('time')) fs.writeFileSync(timesFile, JSON.stringify({ ...times, measured: 'this PC, headless Edge on its GPU, unthrottled, Normal, 1280x720' }, null, 1) + '\n');
    // The stills side by side, each named.
    const stills = ['control', 'cel', 'dark', 'paint'].filter(s => fs.existsSync(path.join(out, `${s}-still.jpg`)));
    if (stills.length === 4 && parts.has('still')) {
      const names = await (async () => { const { context, page } = await open('control', false); const n = await page.evaluate(() => Object.fromEntries(STYLE_DEFS.map(s => [s.id, s.name]))); await context.close(); return n; })();
      const page = await browser.newPage({ viewport: { width: 1280, height: 744 } });
      const cell = s => `<figure><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(out, `${s}-still.jpg`)).toString('base64')}"><figcaption>${names[s]}</figcaption></figure>`;
      await page.setContent(`<style>body{margin:0;background:#111;display:grid;grid-template-columns:1fr 1fr;gap:4px;font:600 15px system-ui;color:#eee}
        figure{margin:0;position:relative}img{width:100%;display:block}figcaption{position:absolute;left:8px;bottom:8px;background:#000a;padding:3px 8px}</style>${stills.map(cell).join('')}`);
      await page.screenshot({ path: path.join(out, 'side-by-side.jpg'), type: 'jpeg', quality: 85, fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close(); cleanup();
  }
  if (errors.length) { console.log('page errors:\n' + [...new Set(errors)].slice(0, 10).join('\n')); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exitCode = 1; cleanup(); });
