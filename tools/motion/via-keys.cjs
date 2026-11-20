'use strict';
// Video to motion, the last step (docs/bosses/system.md, "Animation"): a stretch of a fitted capture
// (tools/motion/fit-poses.cjs) as in-between keys for one phase of an attack (a hit's `via`, js/attack-anim.js).
//   node tools/motion/via-keys.cjs <fit.json> <from s> <to s> [--keys 4] [--gain 1] [--abs] [--only spin,chest,...]
// By default the keys are `rel: true`: how far the captured body strays from a straight blend between its own pose at
// <from> and at <to>, so the motion's shape (the dip before the rise, the arc of the arms, the hips turning first) lands
// between the attack's own authored key poses, whatever they are. --abs prints the captured poses themselves.
// --gain scales the offsets (an anime body moves bigger than a person in a gym). Prints JSON to paste into the pose.
const fs = require('node:fs');
const argv = process.argv.slice(2), flag = k => { const i = argv.indexOf(k); return i >= 0 ? !!argv.splice(i, 1) : false; };
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const abs = flag('--abs'), n = +opt('--keys', 4), gain = +opt('--gain', 1), only = opt('--only', null);
const [file, a, b] = argv;
if (!(file && a != null && b != null)) { console.error('usage: node tools/motion/via-keys.cjs <fit.json> <from s> <to s> [--keys 4] [--gain 1] [--abs] [--only bones]'); process.exit(2); }
const fit = JSON.parse(fs.readFileSync(file, 'utf8')), F = fit.frames;
// The pose at time t, each channel blended between the two nearest captured frames.
const at = t => {
  let i = F.findIndex(f => f.t >= t); if (i < 0) i = F.length - 1; const j = Math.max(0, i - 1);
  const u = F[i].t > F[j].t ? (t - F[j].t) / (F[i].t - F[j].t) : 0, out = {};
  for (const k of Object.keys(F[i].pose)) {
    const p = F[j].pose[k], q = F[i].pose[k];
    if (p == null || q == null) continue;
    out[k] = Array.isArray(q) ? q.map((v, c) => p[c] + (v - p[c]) * u) : p + (q - p) * u;
  }
  return out;
};
const t0 = +a, t1 = +b, P0 = at(t0), P1 = at(t1), r2 = v => Math.round(v * 100) / 100;
const keep = only ? only.split(',') : Object.keys(P0).filter(k => k !== 'haft');   // the haft stays authored unless asked
const keys = [];
for (let m = 1; m <= n; m++) {
  const t = m / (n + 1), T = t0 + (t1 - t0) * t, P = at(T), key = { t: r2(t), ...(abs ? {} : { rel: true }) };
  for (const k of keep) {
    if (P[k] == null || P0[k] == null || P1[k] == null) continue;
    const d = (v, c) => abs ? v : gain * (v - (c < 0 ? P0[k] + (P1[k] - P0[k]) * t : P0[k][c] + (P1[k][c] - P0[k][c]) * t));
    key[k] = Array.isArray(P[k]) ? P[k].map((v, c) => r2(d(v, c))) : r2(d(P[k], -1));
  }
  keys.push(key);
}
console.log(JSON.stringify(keys).replace(/\},\{/g, '},\n{'));
