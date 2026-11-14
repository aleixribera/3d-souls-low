// Refresh tests/shard-weights.json from finished CI runs, so the four in-page shards split the suite by time, not by
// count (one shard with the two slowest tests used to take twice as long as another).
//   node tools/shard-weights.cjs [runId...]   (default: the newest 5 successful CI runs on main; needs `gh`)
// Each test's weight is its median time over those runs: the slow ones swing a lot between runs (the walking regression
// took 295 s on one and 507 s on another), and one run's luck would unbalance the shards.
// Each shard logs one line per test (ARENA_TEST_PROGRESS): "  12 ok     3.4 s  <name>".
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
const gh = args => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 << 20 });
const runs = process.argv.length > 2 ? process.argv.slice(2) : gh(['run', 'list', '--workflow', 'CI', '--branch', 'main',
  '--status', 'success', '--limit', '5', '--json', 'databaseId', '-q', '.[].databaseId']).trim().split(/\s+/);
const times = {};   // name -> one time per run
for (const runId of runs) {
  const jobs = JSON.parse(gh(['run', 'view', runId, '--json', 'jobs'])).jobs.filter(j => /In-page browser suite/.test(j.name));
  if (!jobs.length) throw new Error(`run ${runId} has no in-page shards`);
  let found = 0;
  for (const job of jobs) {
    const log = gh(['api', '--allow-escape-sequences', `repos/{owner}/{repo}/actions/jobs/${job.databaseId}/logs`]);
    for (const line of log.split('\n')) {
      const m = /^\S+Z +\d+ (?:ok  |FAIL) +([\d.]+) s {2}(.+?)\r?$/.exec(line);
      if (m) { (times[m[2]] ??= []).push(+m[1]); found++; }
    }
  }
  if (found < 50) throw new Error(`only ${found} test times found in run ${runId}`);
}
const median = list => { const s = [...list].sort((a, b) => a - b), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const names = Object.keys(times).sort();
const weights = Object.fromEntries(names.map(n => [n, Math.round(median(times[n]) * 10) / 10]));
const out = path.join(__dirname, '../tests/shard-weights.json');
fs.writeFileSync(out, JSON.stringify(weights, null, 1) + '\n');
console.log(`${names.length} test times, median of runs ${runs.join(' ')}: ${Math.round(names.reduce((s, n) => s + weights[n], 0))} s in all -> ${path.relative(process.cwd(), out)}`);
