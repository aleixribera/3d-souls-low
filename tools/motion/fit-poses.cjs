'use strict';
// Video to motion, step 2 of 2 (docs/bosses/system.md, "Animation"): fits a clip's captured poses
// (tools/motion/clip-landmarks.py) onto a model's own rig, in the game's own key-pose format (js/data/attack-poses.js).
//   node tools/motion/fit-poses.cjs <landmarks.json> <modelId> <out.json> [--facing <deg>] [--haft RL|LR] [--every 3] [--mirror]
//
// In headless Edge with the game loaded: a Rig of the model is built (js/bodykit.js), and for each captured frame its
// bones are turned until every limb points where the person's does (directions only, so a person of any size fits any
// body). The legs are re-expressed through Rig.crouch (feet on the floor). With a two-handed haft (the model's `grip`),
// the haft's line is the line between the person's wrists, from the right hand to the left (`--haft LR` the other way),
// and the left arm is left to Rig.holdHaft as in the game.
//   --mirror: left and right swapped, for a drill done on the other hand than the body's.
//   --facing: where the person's target is, in degrees from the camera's line (0: toward the camera, 90: toward the
//             image's left). Default: the average way the person's chest faces over the clip.
// Writes <out.json> ({ model, fps, frames: [{ t, pose }] }, each pose ready to paste as a key pose) and <out>-sheet.jpg:
// every `--every`th frame, the clip (with its capture overlay) above the fitted body seen from the clip's camera.
// One headless Edge, closed at the end; idle priority. Take the browser lock (docs/two-tracks.md) before running it.
require('../../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('../../tests/browser.cjs');
const { createServer } = require('../../server/index.cjs');

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const mirror = argv.includes('--mirror') && !!argv.splice(argv.indexOf('--mirror'), 1);
const facing = opt('--facing', null), haftDir = opt('--haft', 'RL'), every = +opt('--every', 3), clipPath = opt('--clip', null);
const [inFile, modelId, outFile] = argv;
if (!outFile) { console.error('usage: node tools/motion/fit-poses.cjs <landmarks.json> <modelId> <out.json> [--facing deg] [--haft RL|LR] [--every 3] [--mirror] [--clip <video>]'); process.exit(2); }
const cap = JSON.parse(fs.readFileSync(inFile, 'utf8'));

// MediaPipe's world (x right, y down, z away from the camera) into the game's (x the body's left when it faces +z,
// y up, z toward the camera): flip y and z. Then turned about y so the target is straight ahead (+z).
const P = { nose: 0, earL: 7, earR: 8, shL: 11, shR: 12, elL: 13, elR: 14, wrL: 15, wrR: 16, hipL: 23, hipR: 24, knL: 25, knR: 26, anL: 27, anR: 28 };
// --mirror: the person's left is the body's right (a left-handed drill fitted onto a right-handed body).
const swapLR = k => k.endsWith('L') ? k.slice(0, -1) + 'R' : k.endsWith('R') ? k.slice(0, -1) + 'L' : k;
const pts = cap.frames.map(f => Object.fromEntries(Object.entries(P).map(([k, i]) =>
  [mirror ? swapLR(k) : k, [(mirror ? -1 : 1) * f.world[i][0], -f.world[i][1], -f.world[i][2]]])));
// (a half turn about x: right-handed, y up, z toward the camera; a person facing the camera faces +z with their left,
// the image's right, at +x, as a rig faces +z with its left at +x.)
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const chestFwd = p => { const l = sub(p.shL, p.shR); return [-l[2], 0, l[0]]; };   // left x up: the way the chest faces, flat
let yaw;
if (facing != null) yaw = +facing * Math.PI / 180;   // 0: the target is the camera (+z)
else { let x = 0, z = 0; for (const p of pts) { const f = chestFwd(p), n = Math.hypot(f[0], f[2]) || 1; x += f[0] / n; z += f[2] / n; } yaw = Math.atan2(x, z); }
// Turn by -yaw about y, so the target direction lands on +z.
const c = Math.cos(-yaw), s = Math.sin(-yaw), turn = v => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
const frames = pts.map(p => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, turn(v)])));
const camDir = turn([0, 0, 1]);   // where the clip's camera sits, seen from the body

// The clip's frames for the sheet, cut with ffmpeg at the captured times.
const sheetIdx = cap.frames.map((_, i) => i).filter(i => i % every === 0);
let shots = [];
const video = clipPath || path.join(path.dirname(inFile), cap.clip);
if (fs.existsSync(video)) {
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'fit-'));
  shots = sheetIdx.map(i => {
    const f = path.join(tmp, `s${i}.jpg`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(cap.start + cap.frames[i].t), '-i', video, '-frames:v', '1', '-vf', mirror ? 'scale=320:-2,hflip' : 'scale=320:-2', f]);
    return 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
  });
  fs.rmSync(tmp, { recursive: true, force: true });
}

(async () => {
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0 })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    const out = await page.evaluate(async ([frames, modelId, haftDir, sheetIdx, shots, camDir, times]) => {
      if (window.Game && Game.pause) try { Game.pause(); } catch (e) { /* the menu may own the loop */ }
      const rig = new Rig({ scale: 1, bulk: 1, color: 0x888888, weapon: 'sword', model: modelId });
      const B = rig.bones, V = () => new THREE.Vector3();
      const tmp = { a: V(), b: V(), c: V() };
      // The parameters fitted, each an added rotation on one bone axis (js/data/attack-poses.js: added to the rest).
      const PARAMS = [['spin', 0], ['spin', 1], ['spin', 2], ['chest', 0], ['chest', 1], ['chest', 2], ['head', 0], ['head', 1],
        ['armL', 0], ['armL', 1], ['armL', 2], ['elbowL', 0], ['armR', 0], ['armR', 1], ['armR', 2], ['elbowR', 0],
        ['legL', 0], ['legL', 1], ['legL', 2], ['kneeL', 0], ['legR', 0], ['legR', 1], ['legR', 2], ['kneeR', 0]];
      const LIMIT = { elbowL: [-2.6, 0], elbowR: [-2.6, 0], kneeL: [0, 2.6], kneeR: [0, 2.6] };   // hinges bend one way
      const elbowOff = { L: B.elbowL.position.clone(), R: B.elbowR.position.clone() };
      const pose = x => {
        rig.reset(); rig.place(0, 0, 0, 0);
        PARAMS.forEach(([b, ax], i) => { B[b].rotation[['x', 'y', 'z'][ax]] += x[i]; });
        rig.root.updateMatrixWorld(true);
      };
      const wp = (bone, local) => local ? bone.localToWorld(tmp.c.copy(local)).clone() : bone.getWorldPosition(V());
      const joints = () => ({
        hipL: wp(B.legL), hipR: wp(B.legR), knL: wp(B.kneeL), knR: wp(B.kneeR),
        anL: wp(B.kneeL, new THREE.Vector3(0, -LEG_SEG, 0)), anR: wp(B.kneeR, new THREE.Vector3(0, -LEG_SEG, 0)),
        shL: wp(B.armL), shR: wp(B.armR), elL: wp(B.elbowL), elR: wp(B.elbowR),
        wrL: wp(B.elbowL, elbowOff.L), wrR: wp(B.weapon),
        head: wp(B.head, new THREE.Vector3(0, 0.12, 0)), nose: wp(B.head, new THREE.Vector3(0, 0.12, 0.2)),
      });
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      const vmid = (a, b) => a.clone().add(b).multiplyScalar(0.5);
      // Limbs compared by direction (weight, from, to): the person's are fixed per frame, the body's are measured.
      const SEGS = [[2, 'hipR', 'hipL'], [2, 'shR', 'shL'], [3, 'hipMid', 'shMid'], [1.5, 'shL', 'elL'], [1.5, 'elL', 'wrL'],
        [2, 'shR', 'elR'], [2, 'elR', 'wrR'], [1.5, 'hipL', 'knL'], [1.5, 'knL', 'anL'], [1.5, 'hipR', 'knR'], [1.5, 'knR', 'anR'],
        [0.6, 'shMid', 'head'], [0.4, 'head', 'nose']];
      const dir = (a, b) => b.clone().sub(a).normalize();
      const withMids = j => ({ ...j, hipMid: vmid(j.hipL, j.hipR), shMid: vmid(j.shL, j.shR) });
      const cost = (x, target) => {
        pose(x); const j = withMids(joints());
        let e = 0;
        for (const [w, a, b] of SEGS) e += w * dir(j[a], j[b]).distanceToSquared(target[a + '>' + b]);
        for (let i = 0; i < x.length; i++) e += 0.002 * x[i] * x[i];   // the nearest of equal fits: the smallest turn
        return e;
      };
      const results = [];
      let x = PARAMS.map(() => 0);
      for (let f = 0; f < frames.length; f++) {
        const p = frames[f], P3 = k => new THREE.Vector3(...p[k]);
        const T = { ...Object.fromEntries(Object.keys(p).map(k => [k, P3(k)])) };
        T.hipMid = new THREE.Vector3(...mid(p.hipL, p.hipR)); T.shMid = new THREE.Vector3(...mid(p.shL, p.shR));
        T.head = new THREE.Vector3(...mid(p.earL, p.earR));
        const target = {}; for (const [, a, b] of SEGS) target[a + '>' + b] = dir(T[a], T[b]);
        // Coordinate descent from the last frame's fit: each angle nudged both ways while it helps, the step halving.
        let best = cost(x, target);
        for (let step = f ? 0.15 : 0.4; step > 0.004; step *= 0.5) {
          for (let round = 0; round < 4; round++) {
            let moved = false;
            for (let i = 0; i < x.length; i++) for (const sg of [1, -1]) {
              const old = x[i], L = LIMIT[PARAMS[i][0]]; let v = old + sg * step;
              if (L && PARAMS[i][1] === 0) v = Math.max(L[0], Math.min(L[1], v));
              if (v === old) continue;
              x[i] = v; const e = cost(x, target);
              if (e < best - 1e-7) { best = e; moved = true; } else x[i] = old;
            }
            if (!moved) break;
          }
        }
        // The pose, as the game would add it: legs re-expressed through Rig.crouch so the lower foot stands on the floor.
        pose(x); const j = joints();
        const d = Math.max(0, Math.min(j.anL.y, j.anR.y)), a = Math.acos(Math.max(-1, Math.min(1, 1 - d / (2 * LEG_SEG))));
        const out = {}; const r2 = v => Math.round(v * 100) / 100;
        PARAMS.forEach(([b, ax], i) => { (out[b] || (out[b] = [0, 0, 0]))[ax] = r2(x[i]); });
        out.legL[0] = r2(out.legL[0] + a); out.legR[0] = r2(out.legR[0] + a);
        out.kneeL[0] = r2(out.kneeL[0] - 2 * a); out.kneeR[0] = r2(out.kneeR[0] - 2 * a);
        const pz = { crouch: r2(d), ...out };
        // The haft along the person's wrists, in the chest's heading (Rig.holdHaft); left out while the hands are closer
        // than 25 cm (the line between them says little then; a via key without it keeps the authored haft).
        if (rig.grip && T.wrL.distanceTo(T.wrR) >= 0.25) {
          const h = dir(haftDir === 'LR' ? T.wrL : T.wrR, haftDir === 'LR' ? T.wrR : T.wrL);
          const me = B.chest.matrixWorld.elements, heading = Math.atan2(me[8], me[10]);
          let yw = Math.atan2(h.x, h.z) - heading; yw = Math.atan2(Math.sin(yw), Math.cos(yw));
          pz.haft = [r2(-Math.asin(Math.max(-1, Math.min(1, h.y)))), r2(yw), r2(rig.grip.rest[2])];
        }
        if (rig.grip) { delete pz.armL; delete pz.elbowL; }   // the left hand goes where the haft is (Rig.holdHaft)
        results.push({ pose: pz, err: Math.round(best * 1000) / 1000 });
      }
      // The sheet: the clip's frame above the fitted body, seen from where the clip's camera stood.
      const W = 320, H = 240, canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const R = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); R.setSize(W, H, false);
      const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1a1714);
      scene.add(new THREE.HemisphereLight(0xc8c4d0, 0x2a2218, 1.2));
      const key = new THREE.DirectionalLight(0xffe0c0, 2.2); key.position.set(camDir[0] * 4 + 2, 5, camDir[2] * 4 + 2); scene.add(key);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2; scene.add(floor); scene.add(rig.root);
      const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
      cam.position.set(camDir[0] * 7, 1.3, camDir[2] * 7); cam.lookAt(0, 0.95, 0);
      const renders = [];
      for (const i of sheetIdx) {
        const pz = results[i].pose;
        rig.reset(); rig.place(0, 0, 0, 0);
        applyKeyPose(rig, pz, 1);
        if (rig.grip && pz.haft) { rig.haftNow[0] = pz.haft[0]; rig.haftNow[1] = pz.haft[1]; rig.haftNow[2] = pz.haft[2]; rig.gripW = 1; rig.holdHaft(1); }
        R.render(scene, cam); renders.push(canvas.toDataURL('image/jpeg', 0.85));
      }
      const load = src => new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.src = src; });
      const top = await Promise.all(shots.map(load)), bot = await Promise.all(renders.map(load));
      const cols = Math.min(8, bot.length), rowsN = Math.ceil(bot.length / cols), cellH = shots.length ? H * 2 : H;
      const sheet = document.createElement('canvas'); sheet.width = W * cols; sheet.height = cellH * rowsN;
      const g = sheet.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sheet.width, sheet.height);
      bot.forEach((im, k) => {
        const x0 = (k % cols) * W, y0 = Math.floor(k / cols) * cellH;
        if (top[k]) g.drawImage(top[k], x0, y0, W, Math.min(H, top[k].height * W / top[k].width));
        g.drawImage(im, x0, y0 + cellH - H, W, H);
        g.fillStyle = '#ff0'; g.font = '15px sans-serif'; g.fillText(times[sheetIdx[k]].toFixed(2) + ' s', x0 + 4, y0 + 16);
      });
      R.dispose(); rig.dispose && rig.dispose();
      return { results, sheet: sheet.toDataURL('image/jpeg', 0.82) };
    }, [frames, modelId, haftDir, sheetIdx, shots, camDir, cap.frames.map(f => f.t)]);
    const res = { model: modelId, clip: cap.clip, start: cap.start, fps: cap.fps, facingDeg: Math.round(yaw * 180 / Math.PI),
      frames: out.results.map((r, i) => ({ t: cap.frames[i].t, err: r.err, pose: r.pose })) };
    fs.writeFileSync(outFile, JSON.stringify(res, null, 0).replace(/\{"t":/g, '\n{"t":'));
    const sheetFile = outFile.replace(/\.json$/, '') + '-sheet.jpg';
    fs.writeFileSync(sheetFile, Buffer.from(out.sheet.split(',')[1], 'base64'));
    const errs = out.results.map(r => r.err).sort((a, b) => a - b);
    console.log(`fitted ${errs.length} frames onto ${modelId} (facing ${res.facingDeg} deg); fit error median ${errs[errs.length >> 1]}, worst ${errs[errs.length - 1]}`);
    if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
    console.log('wrote', outFile, 'and', sheetFile);
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
