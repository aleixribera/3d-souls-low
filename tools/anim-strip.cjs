'use strict';
// A strip of the player's motion for the animation judge (PLAN.md item 3c): the game stepped by hand in an empty arena,
// one frame every `every` steps from a fixed camera, tiled into one JPEG.
//   node tools/anim-strip.cjs <move> <out.jpg> [frames=14] [every=2] [zoom=1] [width=640] [height=480]   (zoom 2: the camera half as far)
// Moves: dash (a dash to the right across the view), deflect (a blow turned aside, filmed from the sword side),
// finisher (pass 103: three counters on a boss, the third the Finishing Blow, through the game's own camera; `frames`
// spread over the blow, two from each counter before it), boss:<attackId> (pass 111, docs/bosses/system.md: that boss
// attack from wind-up to recovery, filmed from the side at a fixed camera, the player standing in front out of reach,
// `frames` spread over the attack; `every` unused). With CLIP=<file.mp4> every step is also written as a 60 fps clip
// (ffmpeg on PATH). For boss:<attackId> clips (pass 113): REPEAT=<n> plays the attack n times (the strip keeps the first),
// VIEW=game films through the game's own camera behind the player instead of from the side. HOLD=<s> (pass 115): every
// hit with a `hold` takes it, for exactly that long (0: never), so a delayed wind-up can be filmed the same way twice.
// STYLE=<id> (pass 116): drawn in that art style (js/data/styles.js; cel is the game's chosen look).
// One headless Edge, closed at the end; idle priority. Run it under node tools/browser-lock.cjs run <pass> --.
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const [move = 'dash', out = '.scratch/strip.jpg', frames = '14', every = '2', zoom = '1', width = '640', height = '480'] = process.argv.slice(2);
const CLIP = process.env.CLIP || '';
const NOVIA = !!process.env.NOVIA;   // NOVIA=1: every key pose's in-between keys left out (a before/after of a `via`)
const STYLE = process.env.STYLE ? `?style=${encodeURIComponent(process.env.STYLE)}` : '';
const REPEAT = Math.max(1, +process.env.REPEAT || 1), VIEW = process.env.VIEW || 'side', HOLD = process.env.HOLD ?? null;

(async () => {
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: +width, height: +height } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0 })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html${STYLE}#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    const data = await page.evaluate(async ([move, frames, every, zoom, clip, novia, repeat, view, hold]) => {
      const trace = [];
      if (novia) for (const P of Object.values(ATTACK_POSES)) for (const h of P.hits || []) delete h.via;
      const STEP = CONFIG.step; let clock = 0;
      Game.manualClock = true; input.now = () => clock; gamepad.poll = () => {}; gamepad.move = { x: 0, y: 0 };
      let mv = null; Game.moveInput = () => mv ? { x: mv.x, z: mv.z, has: true } : { x: 0, z: 0, has: false };
      input.clear();
      const bossAttack = move.startsWith('boss:') ? move.slice(5) : null;
      const bossDef = bossAttack && ENEMY_DEFS.find(d => d.attacks.some(a => a.id === bossAttack));
      if (bossAttack && !bossDef) throw new Error('no enemy has the attack ' + bossAttack);
      Game.startFight(move === 'finisher' ? 'pillagerCaptain' : bossDef ? bossDef.id : 'hollow'); Game.loading = 0;
      if (move !== 'finisher' && !bossDef) { for (const e of Game.enemies) e.rig.dispose(); Game.enemies = []; for (const z of Game.zones) z.actors = []; }
      const p = Game.player;
      const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() }, at = new THREE.Vector3();
      let aim = () => {};
      // Every step is drawn, as the game draws each frame at 60 Hz: the pose's visual clocks (the deflect's, the
      // landing's, afterimages) run on the drawn frames' time, so drawing only the filmed steps slowed them (pass 102).
      const draw = () => {
        if (move === 'finisher' || view === 'game') { Game.render(1, STEP); return; }   // the game's own camera
        aim(); at.subVectors(cam.pos, cam.look).divideScalar(zoom).add(cam.look);
        const c = Game.cam; c.prevPos.copy(at); c.pos.copy(at); c.prevLook.copy(cam.look); c.look.copy(cam.look);
        Game.render(1, STEP);
      };
      const step = n => { for (let i = 0; i < n; i++) { clock += STEP; Game.update(STEP); draw(); } };
      const shots = [];
      const shoot = () => shots.push(renderer.domElement.toDataURL('image/jpeg', 0.85));
      const press = a => { const code = ACTIONS[a][0]; input.down(code); input.up(code); };
      const film = [];   // every step of the finisher move, for the clip
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
      } else if (move === 'finisher') {
        // A boss held still between counters, the player in front of it; each counter opened by a deflect, then pressed.
        const e = Game.duel || Game.enemies[0];
        p.maxHp = p.hp = 1e6;
        Game.setLock(e);
        const place = () => {
          const d = e.radius + p.radius + 0.6;
          p.x = p.px = e.x + Math.sin(e.yaw) * d; p.z = p.pz = e.z + Math.cos(e.yaw) * d; p.vx = p.vz = p.kx = p.kz = 0;
          p.yaw = p.pyaw = Math.atan2(e.x - p.x, e.z - p.z);
        };
        const counter = n => { delete e.update; e.hitbox = null; e.setState(ES.PARRIED); place(); p.openCounter(1, 'deflect', e); step(1); press('light'); };
        const roll = (n, keep) => { for (let i = 0; i < n; i++) {
          step(1);
          const shot = clip || (keep && keep(i)) ? renderer.domElement.toDataURL('image/jpeg', 0.85) : null;
          if (clip) film.push(shot);
          if (keep && keep(i)) shots.push(shot);
        } };
        e.update = function () {}; place(); step(60);
        for (let c = 0; c < 2; c++) {
          counter(c); roll(54, i => i === 8 || i === 30);
          e.update = function () {}; roll(40);   // held still (its AI off) past the striker's rest
        }
        counter(2);
        const blowSteps = 90;   // 1.5 s: the whole blow and its held pose
        const pick = new Set(Array.from({ length: frames }, (_, k) => Math.round(k * (blowSteps - 1) / Math.max(1, frames - 1))));
        roll(blowSteps, i => pick.has(i));
        roll(30);
      } else if (bossDef) {
        // The boss at the middle facing +x, the player in front of it beyond the attack's reach (it tracks them), the
        // camera square to its side. Its AI held while it settles; then the attack, every step drawn, `frames` of it kept.
        const e = Game.duel || Game.enemies[0], a = e.attackById(bossAttack);
        p.maxHp = p.hp = 1e6;
        const k = Math.max(1, e.def.scale || 1), far = (a.range || 3) + (a.lunge || 0) + (view === 'game' ? 2 : 4);   // the game's camera: nearer, as a player stands
        e.x = e.px = 0; e.z = e.pz = 0; e.yaw = Math.PI / 2;
        p.x = p.px = far; p.z = p.pz = 0; p.yaw = p.pyaw = -Math.PI / 2; p.vx = p.vz = 0;
        aim = () => { cam.pos.set(e.x + 1.2 * k, 1.7 * k, 7.5 * k); cam.look.set(e.x + 1.2 * k, 1.1 * k, e.z); };
        let held = 0;
        if (hold !== null) for (const h of a.hits) if (h.hold) { h.hold = { ...h.hold, chance: +hold > 0 ? 1 : 0, time: [+hold, +hold] }; held += +hold; }
        const total = Math.round((phaseSpan(a, 'recovery', a.hits.length - 1)[0] + a.recovery + held) / STEP) + 6;
        const pick = new Set(Array.from({ length: frames }, (_, j) => Math.round(j * (total - 1) / Math.max(1, frames - 1))));
        for (let n = 0; n < repeat; n++) {
          e.update = function () {}; step(view === 'game' && !n ? 120 : 40); delete e.update;   // the game's camera settles behind the player first
          if (clip && n) for (let i = 0; i < 20; i++) { e.update = function () {}; step(1); delete e.update; film.push(renderer.domElement.toDataURL('image/jpeg', 0.85)); }
          e.x = e.px = 0; e.z = e.pz = 0;
          e.beginAttack(a);
          for (let i = 0; i < total; i++) {
            p.x = p.px = far; p.z = p.pz = 0; p.vx = p.vz = 0;   // the player stays put, out of reach
            if (view === 'game') p.yaw = p.pyaw = Math.atan2(e.x - p.x, e.z - p.z);
            step(1);
            const keep = !n && pick.has(i), shot = clip || keep ? renderer.domElement.toDataURL('image/jpeg', 0.85) : null;
            if (clip) film.push(shot);
            if (keep) shots.push(shot);
            trace.push(`${n} ${i} ${e.state} ${e.stateTime.toFixed(3)} ${e.holdLeft}`);
          }
        }
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
      return { strip: cv.toDataURL('image/jpeg', 0.82), film, trace };
    }, [move, +frames, +every, +zoom, !!CLIP, NOVIA, REPEAT, VIEW, HOLD]);
    if (process.env.TRACE) console.log(data.trace.join('\n'));   // TRACE=1: the boss's state each step
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.strip.split(',')[1], 'base64'));
    if (CLIP && data.film.length) {   // the clip: every step at 60 fps
      const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'anim-strip-'));
      data.film.forEach((src, i) => fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(src.split(',')[1], 'base64')));
      require('node:child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(dir, 'f%04d.jpg'), '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', CLIP]);
      fs.rmSync(dir, { recursive: true, force: true });
      console.log('wrote', CLIP, `(${data.film.length} frames)`);
    }
    if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
    console.log('wrote', out);
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
