'use strict';
// A strip of the player's motion for the animation judge (PLAN.md item 3c): the game stepped by hand in an empty arena,
// one frame every `every` steps from a fixed camera, tiled into one JPEG.
//   node tools/anim-strip.cjs <move> <out.jpg> [frames=14] [every=2] [zoom=1]   (zoom 2: the camera half as far)
// Moves: dash (a dash to the right across the view), deflect (a blow turned aside, filmed from the sword side).
// One headless Edge, closed at the end; idle priority. Take the browser lock (.claude/iterate.md) before running it.
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const [move = 'dash', out = '.scratch/strip.jpg', frames = '14', every = '2', zoom = '1'] = process.argv.slice(2);

(async () => {
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0 })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    const data = await page.evaluate(async ([move, frames, every, zoom]) => {
      const STEP = CONFIG.step; let clock = 0;
      Game.manualClock = true; input.now = () => clock; gamepad.poll = () => {}; gamepad.move = { x: 0, y: 0 };
      let mv = null; Game.moveInput = () => mv ? { x: mv.x, z: mv.z, has: true } : { x: 0, z: 0, has: false };
      input.clear();
      Game.startFight('hollow'); Game.loading = 0;
      for (const e of Game.enemies) e.rig.dispose();
      Game.enemies = []; for (const z of Game.zones) z.actors = [];
      const p = Game.player;
      const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() }, at = new THREE.Vector3();
      let aim = () => {};
      // Every step is drawn, as the game draws each frame at 60 Hz: the pose's visual clocks (the deflect's, the
      // landing's, afterimages) run on the drawn frames' time, so drawing only the filmed steps slowed them (pass 102).
      const draw = () => {
        aim(); at.subVectors(cam.pos, cam.look).divideScalar(zoom).add(cam.look);
        const c = Game.cam; c.prevPos.copy(at); c.pos.copy(at); c.prevLook.copy(cam.look); c.look.copy(cam.look);
        Game.render(1, STEP);
      };
      const step = n => { for (let i = 0; i < n; i++) { clock += STEP; Game.update(STEP); draw(); } };
      const shots = [];
      const shoot = () => shots.push(renderer.domElement.toDataURL('image/jpeg', 0.85));
      const press = a => { const code = ACTIONS[a][0]; input.down(code); input.up(code); };
      // The player at the arena's middle, facing +x, at rest.
      const put = yaw => { p.x = p.px = 0; p.z = p.pz = 0; p.vx = p.vz = 0; p.yaw = p.pyaw = yaw; p.setState(PS.IDLE); };
      if (move === 'dash') {
        // The camera on the sword side and a little behind, following the body like the game's camera (the floor slides by).
        aim = () => { cam.pos.set(p.x - 1.3, 1.5, 4.0); cam.look.set(p.x + 0.4, 0.75, 0); };
        put(Math.PI / 2); step(30); shoot();
        mv = { x: 1, z: 0 }; press('roll');
        for (let i = 1; i < frames; i++) { step(every); shoot(); }
        mv = null;
      } else if (move === 'deflect') {
        cam.pos.set(2.4, 1.7, 3.2); cam.look.set(0, 1.0, 0);
        put(Math.PI / 2); step(30);
        input.down(ACTIONS.block[0]); step(3); shoot();
        p.deflectedBlow = { enemy: null, key: 'strip' };
        for (let i = 1; i < frames; i++) { if (i === 4) input.up(ACTIONS.block[0]); step(every); shoot(); }
      } else throw new Error('unknown move ' + move);
      // Tile: one row, each frame cropped to the middle and numbered.
      const imgs = await Promise.all(shots.map(src => new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.src = src; })));
      const W = 320, H = 240, cols = Math.min(imgs.length, 7), rows = Math.ceil(imgs.length / cols);
      const cv = document.createElement('canvas'); cv.width = W * cols; cv.height = H * rows;
      const g = cv.getContext('2d');
      imgs.forEach((im, i) => {
        const sx = 0, sw = im.width;
        const scale = Math.min(W / sw, H / im.height), dw = sw * scale, dh = im.height * scale;
        g.fillStyle = '#000'; g.fillRect((i % cols) * W, Math.floor(i / cols) * H, W, H);
        g.drawImage(im, sx, 0, sw, im.height, (i % cols) * W + (W - dw) / 2, Math.floor(i / cols) * H + (H - dh) / 2, dw, dh);
        g.fillStyle = '#ff0'; g.font = '16px sans-serif'; g.fillText(String(i), (i % cols) * W + 4, Math.floor(i / cols) * H + 18);
      });
      return cv.toDataURL('image/jpeg', 0.82);
    }, [move, +frames, +every, +zoom]);
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
    if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
    console.log('wrote', out);
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
