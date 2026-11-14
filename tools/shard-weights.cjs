// Refresh tests/shard-weights.json from a finished CI run, so the four in-page shards split the suite by time, not by
// count (one shard with the two slowest tests used to take twice as long as another).
//   node tools/shard-weights.cjs [runId]      (default: the newest successful CI run on main; needs `gh`)
// Each shard logs one line per test (ARENA_TEST_PROGRESS): "  12 ok     3.4 s  <name>".
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
const gh = args => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 << 20 });
const runId = process.argv[2] || gh(['run', 'list', '--workflow', 'CI', '--branch', 'main', '--status', 'success', '--limit', '1',
  '--json', 'databaseId', '-q', '.[0].databaseId']).trim();
const jobs = JSON.parse(gh(['run', 'view', runId, '--json', 'jobs'])).jobs.filter(j => /In-page browser suite/.test(j.name));
if (!jobs.length) throw new Error(`run ${runId} has no in-page shards`);
const weights = {};
for (const job of jobs) {
  const log = gh(['api', '--allow-escape-sequences', `repos/{owner}/{repo}/actions/jobs/${job.databaseId}/logs`]);
  for (const line of log.split('\n')) {
    const m = /^\S+Z +\d+ (?:ok  |FAIL) +([\d.]+) s {2}(.+?)\r?$/.exec(line);
    if (m) weights[m[2]] = +m[1];
  }
}
const names = Object.keys(weights);
if (names.length < 50) throw new Error(`only ${names.length} test times found in run ${runId}`);
const out = path.join(__dirname, '../tests/shard-weights.json');
fs.writeFileSync(out, JSON.stringify(Object.fromEntries(names.sort().map(n => [n, weights[n]])), null, 1) + '\n');
console.log(`${names.length} test times from run ${runId}, ${Math.round(names.reduce((s, n) => s + weights[n], 0))} s in all -> ${path.relative(process.cwd(), out)}`);
