'use strict';
// A bench result (tools/bench/laptop.sh or pc-bench.cjs) as a table: one row per level and fight, one column per run,
// each cell "mean fps / 1% low fps". Usage: node tools/bench/table.cjs <result.json> [more.json ...]
const fs = require('node:fs');
const runs = [];
for (const file of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(file, 'utf8')).results;
  for (const [name, res] of Object.entries(r)) runs.push({ name, res });
}
const rows = [...new Set(runs.flatMap(({ res }) => [...Object.keys(res.levels || {}), ...Object.keys(res.fights || {})]))];
const cell = (res, id) => { const v = (res.levels || {})[id] || (res.fights || {})[id]; return v ? `${Math.round(v.fps)} / ${Math.round(v.low1)}` : '-'; };
console.log(`| Scene | ${runs.map(r => r.name).join(' | ')} |`);
console.log(`|---|${runs.map(() => '---').join('|')}|`);
for (const id of rows) console.log(`| ${id} | ${runs.map(r => cell(r.res, id)).join(' | ')} |`);
const worst = runs.map(({ res }) => Object.values({ ...res.levels, ...res.fights }).reduce((m, v) => Math.min(m, v.low1), Infinity));
const mean = runs.map(({ res }) => { const v = Object.values({ ...res.levels, ...res.fights }); return v.reduce((s, x) => s + x.fps, 0) / v.length; });
console.log(`| **mean of means / worst 1% low** | ${runs.map((r, i) => `${Math.round(mean[i])} / ${Math.round(worst[i])}`).join(' | ')} |`);
