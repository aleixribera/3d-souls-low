'use strict';
// Plots docs/scorecard/animation-judge.csv (PLAN.md item 3c: the blind judge's score per pass, 0 to 10, one line per
// action, the "after" score of each pass) to docs/scorecard/animation-judge.svg. Run after adding a pass's rows:
//   node tools/animation-judge-plot.cjs
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'docs', 'scorecard');
const rows = fs.readFileSync(path.join(dir, 'animation-judge.csv'), 'utf8').trim().split(/\r?\n/).slice(1)
  .map(line => { const [pass, action, before, after] = line.split(','); return { pass: +pass, action, before: +before, after: +after }; });
const passes = [...new Set(rows.map(r => r.pass))].sort((a, b) => a - b), actions = [...new Set(rows.map(r => r.action))];
const W = 520, H = 260, L = 40, R = 110, T = 20, B = 36, colors = ['#2f6fb0', '#c0612b', '#3d8b4a', '#8a4fb0', '#b03d5c', '#6b6b6b'];
const x = p => L + (passes.length < 2 ? (W - L - R) / 2 : (passes.indexOf(p) / (passes.length - 1)) * (W - L - R));
const y = s => T + (1 - s / 10) * (H - T - B);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="sans-serif" font-size="11"><rect width="${W}" height="${H}" fill="#fff"/>`;
for (let s = 0; s <= 10; s += 2) svg += `<line x1="${L}" x2="${W - R}" y1="${y(s)}" y2="${y(s)}" stroke="#e4e4e4"/><text x="${L - 6}" y="${y(s) + 4}" text-anchor="end" fill="#555">${s}</text>`;
for (const p of passes) svg += `<text x="${x(p)}" y="${H - B + 16}" text-anchor="middle" fill="#555">pass ${p}</text>`;
actions.forEach((a, i) => {
  const pts = rows.filter(r => r.action === a).sort((p, q) => p.pass - q.pass), c = colors[i % colors.length];
  if (pts.length > 1) svg += `<polyline fill="none" stroke="${c}" stroke-width="2" points="${pts.map(r => `${x(r.pass)},${y(r.after)}`).join(' ')}"/>`;
  for (const r of pts) svg += `<circle cx="${x(r.pass)}" cy="${y(r.after)}" r="4" fill="${c}"/><circle cx="${x(r.pass)}" cy="${y(r.before)}" r="3" fill="none" stroke="${c}"/>`;
  const last = pts[pts.length - 1];
  svg += `<text x="${W - R + 10}" y="${y(last.after) + 4}" fill="${c}">${a} ${last.after}</text>`;
});
svg += `<text x="${L}" y="${H - 6}" fill="#777">Blind judge, 0 to 10 against reference footage. Dot: after the pass; ring: before it.</text></svg>\n`;
fs.writeFileSync(path.join(dir, 'animation-judge.svg'), svg);
console.log(`animation-judge.svg: ${rows.length} rows, ${passes.length} passes`);
