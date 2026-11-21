'use strict';
// A boss judge strip as a line drawing (docs/bosses/system.md section 6, judge `edges-1`): 14 frames of a clip from
// <start> s over <span> s, each through the same edge filter, tiled 7x2 at 427x240 a frame. Ours and the references go
// through the same filter with the same values, so the render style is out of the comparison and only the motion is left.
//   node tools/edge-strip.cjs <clip.mp4> <start s> <span s> <out.jpg> [low=0.05] [high=0.12]
// ffmpeg on PATH. Clips of ours: CLIP=<file> node tools/anim-strip.cjs boss:<attackId> ... (one attack, start 0).
const { execFileSync } = require('node:child_process');
const [clip, start = '0', span = '4', out = '.scratch/edge-strip.jpg', low = '0.05', high = '0.12'] = process.argv.slice(2);
if (!clip) { console.error('usage: node tools/edge-strip.cjs <clip.mp4> <start s> <span s> <out.jpg> [low] [high]'); process.exit(1); }
const fps = 14 / +span;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(start), '-t', String(span), '-i', clip, '-vf',
  `fps=${fps.toFixed(4)},scale=427:240:force_original_aspect_ratio=decrease,pad=427:240:(ow-iw)/2:(oh-ih)/2,` +
  `format=gray,edgedetect=low=${low}:high=${high},negate,tile=7x2`, '-frames:v', '1', '-q:v', '3', out]);
console.log('wrote', out);
