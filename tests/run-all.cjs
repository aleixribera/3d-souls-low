'use strict';
// Parallel test runner: each test file runs in its own Node process from the repository root.
//
//   node tests/run-all.cjs                         the node group (fast, pure Node: no browser, no Docker)
//   node tests/run-all.cjs --group browser         the Playwright/Edge suites CI runs (the in-page suite in shards)
//   node tests/run-all.cjs --group all             both groups (npm test)
//   node tests/run-all.cjs --group extra           the other Playwright files, not in CI (see BROWSER below)
//   node tests/run-all.cjs bot lobby               only matching tests: an exact name wins, else a substring
//                                                  match within the group (exact names may pick optional tests)
//   node tests/run-all.cjs solo-browser -- Menus   arguments after -- go to every selected test
//   node tests/run-all.cjs --list                  show the groups and what each would run
//
// Options: --jobs <n> node files at once (default: CPU threads, at most 8), --browser-jobs <n> browsers at once
// (default: a quarter of the threads; the in-page suite runs as that many shards), --timeout <minutes> per test
// (default 15 node / 60 browser), --bail (stop starting tests at the first failure), --verbose (one job at a time,
// each test's output streamed), --retries <n> (extra attempts for a failing test; network-load always gets one,
// being a timing measurement, and runs alone after the rest). Output: a dot per passing file, the log tail of each
// failure, then a summary. Logs: .scratch/test-logs/<name>.log, the full table in .scratch/test-logs/summary.txt.
// Browser tests need `npm install` at the root (Playwright) and Microsoft Edge; set ARENA_SOFTWARE_GL=1 for
// SwiftShader WebGL on machines without a GPU (honoured by solo-browser.cjs).
// Time budget (AGENTS.md): a whole group over its budget prints a loud warning; ARENA_TEST_BUDGET=<s> overrides it.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
require('./low-priority.cjs');   // every test this starts runs at the lowest priority

const root = path.resolve(__dirname, '..');
const testsDir = __dirname;
const exists = name => fs.existsSync(path.join(testsDir, name + '.cjs'));

// Pure Node tests (no Playwright). security-*/server-* files are picked up as other work adds them.
const NODE = ['net-timing', 'multiplayer', 'lobby-host', 'lobby-leader', 'lobby-continuity', 'arena-wipe',
  'boss-pace', 'counters', 'startup', 'fair-attacks', 'pose-via', 'body-check', 'boss-pages', 'rush-flow', 'boss-attention', 'calling', 'weekly', 'vesper', 'revive', 'abilities', 'blade-commons', 'guard-commons', 'mirror-shard', 'rare-perks', 'rare-triggers', 'strike-shapes', 'strike-flashy', 'guard-self', 'guard-boss', 'summons-one', 'summons-two', 'summons-three', 'legendaries-one', 'legendaries-two', 'ultimates-one', 'ultimates-two', 'ultimates-three', 'story-four', 'crates', 'bot-behavior', 'bot-temperament', 'bot', 'fight-tally', 'autoquality', 'experience',
  'deployment', 'network-load', 'textures', 'story-checkpoints', 'story-placements', 'release'];
// The browser group: the in-page suite and the smoke files, the browser tests CI runs (.github/workflows). Every other
// Playwright file (*-browser.cjs, onboarding) is the extra group: run by name or --group extra, on a machine with a GPU.
// CI never ran them, and on origin/main at v7.222.0 boss-battle, onboarding, multiplayer, rush-alone and summons-party
// fail and lobby-polish and revive are flaky (test-speed pass, 2026-11-21).
const BROWSER = ['solo-browser', 'startup-browser', 'alone-browser', 'calling-browser', 'reconnect-browser'];
const BROWSER_EXTRA = ['onboarding'];   // Playwright suites that are not named *-browser.cjs
// Run only when named: benchmarks, long duels, and checks that need a running container.
const OPTIONAL = {
  'bot-duel': 'bot duel benchmark; pass -- <boss|all> <trials>',
  performance: 'Playwright benchmark; pass -- <output-dir>',
  'high-quality': 'Playwright Normal preset trials; pass -- <output-dir>',
  'container-smoke': 'needs a running container; pass -- http://127.0.0.1:3080',
};
// Timing-sensitive measurements get one automatic retry (a busy machine can push a latency bound over).
const RETRIES = { 'network-load': 1 };
// Timing measurements run alone, after everything else, so parallel neighbours cannot slow them.
const ALONE = new Set(['network-load']);
const NOT_TESTS = new Set(['run-all', 'browser-adventure', 'browser', 'low-priority']); // the runner and shared helper modules
// Seconds a whole group may take on the Fedora test laptop before the runner warns (AGENTS.md, Test time budget).
const BUDGET = { node: 60, browser: 600, all: 600 };

function listCjs() {
  return fs.readdirSync(testsDir).filter(f => f.endsWith('.cjs')).map(f => f.slice(0, -4))
    .filter(n => !NOT_TESTS.has(n)).sort();
}
function groups() {
  const all = listCjs();
  const dynamic = all.filter(n => /^(security|server)-/.test(n));
  const node = [...NODE.filter(exists), ...dynamic.filter(n => !n.endsWith('-browser') && !NODE.includes(n))];
  const browser = BROWSER.filter(exists);
  const extra = [...all.filter(n => n.endsWith('-browser') && !browser.includes(n)), ...BROWSER_EXTRA.filter(exists)];
  const known = new Set([...node, ...browser, ...extra, ...Object.keys(OPTIONAL)]);
  const unassigned = all.filter(n => !known.has(n));
  return { node, browser, extra, all: [...node, ...browser], optional: Object.keys(OPTIONAL).filter(exists), unassigned };
}
function kindOf(name, g) { return g.browser.includes(name) || g.extra.includes(name) || ['performance', 'high-quality'].includes(name) ? 'browser' : 'node'; }

function parse(argv) {
  const threads = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
  const opts = { group: null, names: [], passthrough: [], bail: false, verbose: false, list: false, timeout: null, retries: 0,
    jobs: Math.max(1, Math.min(8, threads)), browserJobs: Number(process.env.ARENA_BROWSER_JOBS) || Math.max(1, Math.floor(threads / 4)) };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { opts.passthrough = argv.slice(i + 1); break; }
    else if (a === '--group' || a === '-g') opts.group = argv[++i];
    else if (a.startsWith('--group=')) opts.group = a.slice(8);
    else if (a === '--filter' || a === '-f') opts.names.push(argv[++i]);
    else if (a.startsWith('--filter=')) opts.names.push(a.slice(9));
    else if (a === '--timeout') opts.timeout = Number(argv[++i]);
    else if (a === '--retries') opts.retries = Number(argv[++i]);
    else if (a === '--jobs' || a === '-j') opts.jobs = Math.max(1, Number(argv[++i]) || 1);
    else if (a === '--browser-jobs') opts.browserJobs = Math.max(1, Number(argv[++i]) || 1);
    else if (a === '--bail') opts.bail = true;
    else if (a === '--verbose' || a === '-v') opts.verbose = true;
    else if (a === '--list') opts.list = true;
    else if (a === '--help' || a === '-h') { const lines = fs.readFileSync(__filename, 'utf8').split(/\r?\n/).slice(1); console.log(lines.slice(0, lines.findIndex(l => !l.startsWith('//'))).join('\n').replace(/^\/\/ ?/gm, '')); process.exit(0); }
    else if (a.startsWith('-')) throw new Error(`Unknown option ${a}`);
    else opts.names.push(a.replace(/\.cjs$/, '').replace(/^tests[\\/]/, ''));
  }
  if (opts.group && !['node', 'browser', 'all', 'extra'].includes(opts.group)) throw new Error(`--group must be node, browser, all or extra (got ${opts.group})`);
  if (opts.verbose) opts.jobs = opts.browserJobs = 1;   // streamed output stays readable one test at a time
  return opts;
}

function select(opts, g) {
  const pool = g[opts.group || (opts.names.length ? 'all' : 'node')];
  if (!opts.names.length) return pool;
  const picked = [];
  for (const name of opts.names) {
    const exact = [...pool, ...g.extra, ...g.optional, ...g.unassigned].includes(name) ? [name] : [];
    const matches = exact.length ? exact : pool.filter(n => n.includes(name));
    if (!matches.length) throw new Error(`No test matches "${name}" in group ${opts.group || 'all'} (try --list)`);
    for (const m of matches) if (!picked.includes(m)) picked.push(m);
  }
  return picked;
}

const fmt = ms => ms < 60000 ? (ms / 1000).toFixed(1) + 's' : `${Math.floor(ms / 60000)}m${String(Math.round(ms % 60000 / 1000)).padStart(2, '0')}s`;

function run(job, timeoutMs, verbose, logDir) {
  return new Promise(resolve => {
    const started = Date.now();
    const log = fs.createWriteStream(path.join(logDir, job.label + '.log'));
    const tail = [];
    const child = spawn(process.execPath, [path.join('tests', job.name + '.cjs'), ...job.args],
      { cwd: root, env: { ...process.env, ...job.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    const onData = stream => chunk => {
      log.write(chunk);
      if (verbose) stream.write(chunk);
      tail.push(chunk.toString()); if (tail.length > 400) tail.splice(0, tail.length - 400);
    };
    child.stdout.on('data', onData(process.stdout));
    child.stderr.on('data', onData(process.stderr));
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer); log.end();
      const lines = tail.join('').split(/\r?\n/).filter(Boolean);
      resolve({ name: job.label, ok: code === 0 && !timedOut, code, signal, timedOut, ms: Date.now() - started, lines });
    });
  });
}

(async () => {
  const opts = parse(process.argv.slice(2));
  const g = groups();
  if (opts.list) {
    for (const k of ['node', 'browser', 'extra']) console.log(`${k} (${g[k].length}): ${g[k].join(', ')}`);
    console.log('optional (run by name):'); for (const n of g.optional) console.log(`  ${n.padEnd(16)} ${OPTIONAL[n]}`);
    if (g.unassigned.length) console.log(`unassigned (run by name): ${g.unassigned.join(', ')}`);
    return;
  }
  const chosen = select(opts, g);
  const logDir = path.join(root, '.scratch', 'test-logs'); fs.mkdirSync(logDir, { recursive: true });
  // The in-page suite is most of the browser time: with no filter it runs as one shard per browser slot.
  const jobs = chosen.flatMap(name => {
    const kind = kindOf(name, g);
    if (name === 'solo-browser' && !opts.passthrough.length && opts.browserJobs > 1 && !process.env.ARENA_SHARD) {
      const n = opts.browserJobs;
      return Array.from({ length: n }, (_, k) => ({ name, kind, label: `solo-browser.${k + 1}of${n}`, args: [], env: { ARENA_SHARD: `${k + 1}/${n}` } }));
    }
    return [{ name, kind, label: name, args: opts.passthrough, env: {} }];
  });
  // Browser jobs first (they are the long ones), node files beside them; timing measurements alone at the end.
  const queue = [...jobs.filter(j => j.kind === 'browser'), ...jobs.filter(j => j.kind === 'node' && !ALONE.has(j.name))];
  const last = jobs.filter(j => j.kind === 'node' && ALONE.has(j.name));
  console.log(`Running ${chosen.length} test file(s) on Node ${process.version} (${opts.jobs} node / ${opts.browserJobs} browser at once)${opts.passthrough.length ? ` with args: ${opts.passthrough.join(' ')}` : ''}`);
  const results = [];
  const total = Date.now();
  let stop = false, dots = 0;
  const report = r => {
    results.push(r);
    if (opts.verbose) { console.log(`- ${r.name} ${r.ok ? 'ok' : r.timedOut ? 'TIMEOUT' : 'FAIL'} (${fmt(r.ms)})`); }
    else if (r.ok) { process.stdout.write('.'); dots++; }
    if (!r.ok) {
      if (dots) { process.stdout.write('\n'); dots = 0; }
      console.log(`${r.timedOut ? 'TIMEOUT' : 'FAIL'} ${r.name} (${fmt(r.ms)}${r.attempts > 1 ? `, ${r.attempts} attempts` : ''})`);
      if (!opts.verbose) {
        console.log(`  --- last lines of .scratch/test-logs/${r.name}.log ---`);
        for (const line of r.lines.slice(-60)) console.log('  | ' + line);
      }
      if (opts.bail) stop = true;
    }
  };
  const attempt = async job => {
    const timeoutMs = (opts.timeout || (job.kind === 'browser' ? 60 : 15)) * 60000;
    let r = await run(job, timeoutMs, opts.verbose, logDir), attempts = 1;
    const allowed = Math.max(opts.retries, RETRIES[job.name] || 0);
    while (!r.ok && attempts <= allowed) { r = await run(job, timeoutMs, opts.verbose, logDir); attempts++; }
    r.attempts = attempts;
    report(r);
  };
  // Two pools drawing from one queue: browser jobs take a browser slot, node files a node slot.
  const free = { browser: opts.browserJobs, node: opts.jobs };
  await new Promise(resolve => {
    let running = 0;
    const pump = () => {
      if (!stop) {
        for (let i = 0; i < queue.length; i++) {
          const job = queue[i];
          if (free[job.kind] <= 0) continue;
          queue.splice(i--, 1); free[job.kind]--; running++;
          attempt(job).then(() => { free[job.kind]++; running--; pump(); });
        }
      }
      if (!running && (stop || !queue.length)) resolve();
    };
    pump();
  });
  for (const job of last) { if (stop) break; await attempt(job); }
  if (dots) process.stdout.write('\n');

  const elapsed = Date.now() - total;
  const width = Math.max(4, ...results.map(r => r.name.length));
  const label = r => r.ok ? (r.attempts > 1 ? 'pass*' : 'pass') : r.timedOut ? 'timeout' : `fail(${r.code ?? r.signal})`;
  const table = ['Test'.padEnd(width) + '  Result   Time', '-'.repeat(width) + '  -------  ------',
    ...[...results].sort((a, b) => b.ms - a.ms).map(r => `${r.name.padEnd(width)}  ${label(r).padEnd(7)}  ${fmt(r.ms)}`)];
  fs.writeFileSync(path.join(logDir, 'summary.txt'), table.join('\n') + '\n');
  const failed = results.filter(r => !r.ok);
  const retried = results.filter(r => r.ok && r.attempts > 1).length;
  const skipped = jobs.length - results.length;
  const slowest = [...results].sort((a, b) => b.ms - a.ms).slice(0, 5).map(r => `${r.name} ${fmt(r.ms)}`).join(', ');
  console.log(`${results.length - failed.length}/${results.length} passed${retried ? ` (* ${retried} after a retry)` : ''}${skipped ? `, ${skipped} skipped (--bail)` : ''} in ${fmt(elapsed)}. Slowest: ${slowest}. Table: .scratch/test-logs/summary.txt`);
  for (const r of failed) console.log(`  failed: ${r.name} (.scratch/test-logs/${r.name}.log)`);
  // The budget applies to a whole group, the run that has one (not to a hand-picked subset).
  const budget = Number(process.env.ARENA_TEST_BUDGET) || (!opts.names.length && BUDGET[opts.group || 'node']);
  if (budget && elapsed > budget * 1000) {
    console.log(`\n!!! TEST TIME BUDGET EXCEEDED: ${fmt(elapsed)} against ${budget} s for the ${opts.group || 'node'} group. Find the slow file in`);
    console.log('!!! .scratch/test-logs/summary.txt and make it faster or move it to an opt-in tier (AGENTS.md, Test time budget).\n');
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results.map(r => `| ${r.name} | ${label(r)} | ${fmt(r.ms)} |`).join('\n');
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `| Test | Result | Time |\n| --- | --- | --- |\n${rows}\n\n`); } catch {}
  }
  if (failed.length || skipped) process.exitCode = 1;
})().catch(e => { console.error(e.message || e); process.exitCode = 2; });
