'use strict';
// The blind boss judge's log (docs/bosses/system.md section 6): reads docs/scorecard/boss-judge.csv, plots every round
// to docs/scorecard/boss-judge.svg and says, per boss, whether the current judge has gone flat.
//   node tools/boss-judge.cjs          after adding a round's row (columns: see the csv header)
// `judge` names one judge set-up (its references and question); a fresh judge gets a new name, and flatness is counted
// within the current one. Flat: the last three rounds all caught us at 8/10 or more AND motion + readability +
// spectacle moved by 2 or less across them (about the panel's noise). Then the next round needs a fresh judge, not
// another fix against this one (why: retro 120, six rounds caught 9/10 against Sekiro strips while motion crept 3 to 5).
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'docs', 'scorecard');
const lines = fs.readFileSync(path.join(dir, 'boss-judge.csv'), 'utf8').trim().split(/\r?\n/);
const head = lines[0].split(',');
if (head.slice(0, 9).join(',') !== 'round,pass,boss,attack,motion,readability,spectacle,caught,judge')
  throw new Error('boss-judge.csv: unexpected header ' + lines[0]);
const rows = lines.slice(1).map(line => {
  const f = line.split(','), giveaway = f.slice(9).join(',').replace(/^"|"$/g, '');
  const caught = /(\d+)\s*\/\s*(\d+)/.exec(f[7]);
  return { round: +f[0], pass: +f[1], boss: f[2], attack: f[3], motion: +f[4], read: +f[5], spec: +f[6],
    caught: caught ? +caught[1] / +caught[2] : (/yes/.test(f[7]) ? 1 : 0), judge: f[8], giveaway };
});

let flatAny = false;
const bosses = [...new Set(rows.map(r => r.boss))];
for (const boss of bosses) {
  const all = rows.filter(r => r.boss === boss), judge = all[all.length - 1].judge;
  const cur = all.filter(r => r.judge === judge);
  console.log(`${boss}, judge ${judge}: ${cur.length} round(s)`);
  for (const r of cur) console.log(`  r${r.round} p${r.pass}  motion ${'#'.repeat(r.motion).padEnd(10)} ${r.motion}  read ${r.read}  spec ${r.spec}  caught ${Math.round(r.caught * 10)}/10`);
  const last = cur.slice(-3);
  if (last.length === 3) {
    const sums = last.map(r => r.motion + r.read + r.spec);
    const flat = last.every(r => r.caught >= 0.8) && Math.max(...sums) - Math.min(...sums) <= 2;
    if (flat) { flatAny = true; console.log(`  FLAT: the last three rounds sum ${sums.join(', ')} and caught each at 8/10 or more. The next round is a fresh judge (new name in the judge column).`); }
    else console.log(`  moving: sums ${sums.join(', ')}`);
  }
  console.log(`  last giveaway: ${all[all.length - 1].giveaway}`);
}

const W = 560, H = 260, L = 34, R = 120, T = 20, B = 40, colors = { motion: '#2f6fb0', read: '#3d8b4a', spec: '#c0612b', caught: '#6b6b6b' };
const x = i => L + (rows.length < 2 ? (W - L - R) / 2 : (i / (rows.length - 1)) * (W - L - R));
const y = s => T + (1 - s / 10) * (H - T - B);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="sans-serif" font-size="11"><rect width="${W}" height="${H}" fill="#fff"/>`;
for (let s = 0; s <= 10; s += 2) svg += `<line x1="${L}" x2="${W - R}" y1="${y(s)}" y2="${y(s)}" stroke="#e4e4e4"/><text x="${L - 6}" y="${y(s) + 4}" text-anchor="end" fill="#555">${s}</text>`;
rows.forEach((r, i) => {
  svg += `<text x="${x(i)}" y="${H - B + 14}" text-anchor="middle" fill="#555">r${r.round}</text>`;
  if (i && rows[i - 1].judge !== r.judge) svg += `<line x1="${(x(i) + x(i - 1)) / 2}" x2="${(x(i) + x(i - 1)) / 2}" y1="${T}" y2="${H - B}" stroke="#999" stroke-dasharray="3,3"/>`;
});
for (const [key, c] of Object.entries(colors)) {
  const val = r => key === 'caught' ? r.caught * 10 : r[key];
  svg += `<polyline fill="none" stroke="${c}" stroke-width="2" points="${rows.map((r, i) => `${x(i)},${y(val(r))}`).join(' ')}"/>`;
  svg += `<text x="${W - R + 10}" y="${y(val(rows[rows.length - 1])) + 4 + (key === 'caught' ? -10 : 0)}" fill="${c}">${key === 'caught' ? 'caught x/10' : key} ${val(rows[rows.length - 1])}</text>`;
}
svg += `<text x="${L}" y="${H - 8}" fill="#777">Blind boss judge per round (${bosses.join(', ')}). Dashed line: a fresh judge.</text></svg>\n`;
fs.writeFileSync(path.join(dir, 'boss-judge.svg'), svg);
process.exitCode = 0;
if (flatAny) console.log('boss-judge.svg written; a judge is flat.'); else console.log('boss-judge.svg written.');
