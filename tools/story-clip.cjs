'use strict';
// A Story walk-through clip (pass 169, the Story levels redone): the frames tools/story-frames.cjs shot of each chapter,
// room after room in the chapter's order, chained into one mp4 (each frame held `hold` seconds). No browser: it only
// reads .scratch/story-frames/<level>/<tag>-NN.jpg, so shoot the chapters first.
//   node tools/story-clip.cjs <out.mp4> <tag> <levelId ...> [--hold 1.2]
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const args = process.argv.slice(2), hi = args.indexOf('--hold');
const hold = hi >= 0 ? Number(args.splice(hi, 2)[1]) : 1.2;
const [out, tag, ...ids] = args;
if (!out || !tag || !ids.length || !(hold > 0)) { console.error('usage: node tools/story-clip.cjs <out.mp4> <tag> <levelId ...> [--hold 1.2]'); process.exit(2); }
const root = path.join(__dirname, '..'), frames = [];
for (const id of ids) {
  const dir = path.join(root, '.scratch', 'story-frames', id);
  const mine = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.startsWith(`${tag}-`) && /^\d+\.jpg$/.test(f.slice(tag.length + 1))).sort() : [];
  if (!mine.length) { console.error(`${id}: no ${tag} frames in ${path.relative(root, dir)} (run tools/story-frames.cjs ${tag} ${id})`); process.exit(1); }
  for (const f of mine) frames.push(path.join(dir, f));
}
const list = path.join(root, '.scratch', `story-clip-${process.pid}.txt`);
fs.writeFileSync(list, frames.map(f => `file '${f.replace(/\\/g, '/')}'\nduration ${hold}\n`).join('') + `file '${frames[frames.length - 1].replace(/\\/g, '/')}'\n`);
try {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'scale=960:540,format=yuv420p',
    '-r', '30', '-c:v', 'libx264', '-crf', '26', '-movflags', '+faststart', path.resolve(out)]);
} finally { fs.rmSync(list, { force: true }); }
console.log(`${frames.length} frames from ${ids.join(', ')} -> ${out} (${(frames.length * hold).toFixed(0)} s)`);
