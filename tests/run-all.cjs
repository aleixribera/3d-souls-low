'use strict';
// Sequential test runner: each test file runs in its own Node process from the repository root.
//
//   node tests/run-all.cjs                         the node group (fast, pure Node: no browser, no Docker)
//   node tests/run-all.cjs --group browser         Playwright/Edge suites (solo-browser first)
//   node tests/run-all.cjs --group all             both groups
//   node tests/run-all.cjs bot lobby               only matching tests: an exact name wins, else a substring
//                                                  match within the group (exact names may pick optional tests)
//   node tests/run-all.cjs solo-browser -- Menus   arguments after -- go to every selected test
//   node tests/run-all.cjs --list                  show the groups and what each would run
//
// Options: --timeout <minutes> per test (default 15 node / 60 browser), --bail (stop at the first failure),
// --verbose (stream each test's output), --retries <n> (extra attempts for a failing test; network-load
// always gets one, being a timing measurement). Logs: .scratch/test-logs/<name>.log; a failure prints the tail.
// Browser tests need `npm install` at the root (Playwright) and Microsoft Edge; set ARENA_SOFTWARE_GL=1 for
// SwiftShader WebGL on machines without a GPU (honoured by solo-browser.cjs).
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const testsDir = __dirname;
const exists = name => fs.existsSync(path.join(testsDir, name + '.cjs'));

// Pure Node tests (no Playwright). security-*/server-* files are picked up as other work adds them.
const NODE = ['net-timing', 'multiplayer', 'multiplayer-campaign', 'lobby-leader', 'lobby-continuity', 'arena-wipe',
  'boss-only', 'bot-behavior', 'bot-follow', 'bot', 'damage-leaderboard', 'fullscreen', 'autoquality', 'experience',
  'deployment', 'network-load', 'textures'];
// Playwright suites that are not named *-browser.cjs.
const BROWSER_EXTRA = ['onboarding', 'quality-picker'];
// Run only when named: benchmarks, long duels, and checks that need a running container.
const OPTIONAL = {
  'bot-duel': 'bot duel benchmark; pass -- <boss|all> <trials>',
  performance: 'Playwright benchmark; pass -- <output-dir>',
  'high-quality': 'Playwright High preset trials; pass -- <output-dir>',
  'container-smoke': 'needs a running container; pass -- http://127.0.0.1:3080',
};
// Timing-sensitive measurements get one automatic retry (a busy machine can push a latency bound over).
const RETRIES = { 'network-load': 1 };
const NOT_TESTS = new Set(['run-all', 'browser-adventure']); // runner and a shared helper module

function listCjs() {
  return fs.readdirSync(testsDir).filter(f => f.endsWith('.cjs')).map(f => f.slice(0, -4))
    .filter(n => !NOT_TESTS.has(n)).sort();
}
function groups() {
  const all = listCjs();
  const dynamic = all.filter(n => /^(security|server)-/.test(n));
  const node = [...NODE.filter(exists), ...dynamic.filter(n => !n.endsWith('-browser') && !NODE.includes(n))];
  const browser = ['solo-browser', ...all.filter(n => n.endsWith('-browser') && n !== 'solo-browser'),
    ...BROWSER_EXTRA.filter(exists)].filter(exists);
  const known = new Set([...node, ...browser, ...Object.keys(OPTIONAL)]);
  const unassigned = all.filter(n => !known.has(n));
  return { node, browser, all: [...node, ...browser], optional: Object.keys(OPTIONAL).filter(exists), unassigned };
}
function kindOf(name, g) { return g.browser.includes(name) || ['performance', 'high-quality'].includes(name) ? 'browser' : 'node'; }

function parse(argv) {
  const opts = { group: null, names: [], passthrough: [], bail: false, verbose: false, list: false, timeout: null, retries: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { opts.passthrough = argv.slice(i + 1); break; }
    else if (a === '--group' || a === '-g') opts.group = argv[++i];
    else if (a.startsWith('--group=')) opts.group = a.slice(8);
    else if (a === '--filter' || a === '-f') opts.names.push(argv[++i]);
    else if (a.startsWith('--filter=')) opts.names.push(a.slice(9));
    else if (a === '--timeout') opts.timeout = Number(argv[++i]);
    else if (a === '--retries') opts.retries = Number(argv[++i]);
    else if (a === '--bail') opts.bail = true;
    else if (a === '--verbose' || a === '-v') opts.verbose = true;
    else if (a === '--list') opts.list = true;
    else if (a === '--help' || a === '-h') { const lines = fs.readFileSync(__filename, 'utf8').split(/\r?\n/).slice(1); console.log(lines.slice(0, lines.findIndex(l => !l.startsWith('//'))).join('\n').replace(/^\/\/ ?/gm, '')); process.exit(0); }
    else if (a.startsWith('-')) throw new Error(`Unknown option ${a}`);
    else opts.names.push(a.replace(/\.cjs$/, '').replace(/^tests[\\/]/, ''));
  }
  if (opts.group && !['node', 'browser', 'all'].includes(opts.group)) throw new Error(`--group must be node, browser or all (got ${opts.group})`);
  return opts;
}

function select(opts, g) {
  const pool = g[opts.group || (opts.names.length ? 'all' : 'node')];
  if (!opts.names.length) return pool;
  const picked = [];
  for (const name of opts.names) {
    const exact = [...pool, ...g.optional, ...g.unassigned].includes(name) ? [name] : [];
    const matches = exact.length ? exact : pool.filter(n => n.includes(name));
    if (!matches.length) throw new Error(`No test matches "${name}" in group ${opts.group || 'all'} (try --list)`);
    for (const m of matches) if (!picked.includes(m)) picked.push(m);
  }
  return picked;
}

const fmt = ms => ms < 60000 ? (ms / 1000).toFixed(1) + 's' : `${Math.floor(ms / 60000)}m${String(Math.round(ms % 60000 / 1000)).padStart(2, '0')}s`;

function run(name, args, timeoutMs, verbose, logDir) {
  return new Promise(resolve => {
    const started = Date.now();
    const log = fs.createWriteStream(path.join(logDir, name + '.log'));
    const tail = [];
    const child = spawn(process.execPath, [path.join('tests', name + '.cjs'), ...args], { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
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
      const text = tail.join('');
      const lines = text.split(/\r?\n/).filter(Boolean);
      resolve({ name, ok: code === 0 && !timedOut, code, signal, timedOut, ms: Date.now() - started, lines });
    });
  });
}

(async () => {
  const opts = parse(process.argv.slice(2));
  const g = groups();
  if (opts.list) {
    for (const k of ['node', 'browser']) console.log(`${k} (${g[k].length}): ${g[k].join(', ')}`);
    console.log('optional (run by name):'); for (const n of g.optional) console.log(`  ${n.padEnd(16)} ${OPTIONAL[n]}`);
    if (g.unassigned.length) console.log(`unassigned (run by name): ${g.unassigned.join(', ')}`);
    return;
  }
  const chosen = select(opts, g);
  const logDir = path.join(root, '.scratch', 'test-logs'); fs.mkdirSync(logDir, { recursive: true });
  console.log(`Running ${chosen.length} test file(s) on Node ${process.version}${opts.passthrough.length ? ` with args: ${opts.passthrough.join(' ')}` : ''}`);
  const results = [];
  const total = Date.now();
  for (const name of chosen) {
    const kind = kindOf(name, g);
    const timeoutMs = (opts.timeout || (kind === 'browser' ? 60 : 15)) * 60000;
    process.stdout.write(`- ${name} ... `);
    let r = await run(name, opts.passthrough, timeoutMs, opts.verbose, logDir), attempts = 1;
    const allowed = Math.max(opts.retries, RETRIES[name] || 0);
    while (!r.ok && attempts <= allowed) {
      process.stdout.write(`${r.timedOut ? 'TIMEOUT' : 'FAIL'} (${fmt(r.ms)}): ${r.lines.filter(l => !/^Node\.js v/.test(l)).slice(-1)[0] || ''}\n  retrying ${name} ... `);
      r = await run(name, opts.passthrough, timeoutMs, opts.verbose, logDir); attempts++;
    }
    r.attempts = attempts;
    results.push(r);
    console.log(`${r.ok ? 'ok' : r.timedOut ? 'TIMEOUT' : 'FAIL'} (${fmt(r.ms)})`);
    if (!r.ok && !opts.verbose) {
      console.log(`  --- last lines of .scratch/test-logs/${name}.log ---`);
      for (const line of r.lines.slice(-60)) console.log('  | ' + line);
    }
    if (!r.ok && opts.bail) break;
  }
  const width = Math.max(4, ...results.map(r => r.name.length));
  console.log('\n' + 'Test'.padEnd(width) + '  Result   Time');
  console.log('-'.repeat(width) + '  -------  ------');
  const label = r => r.ok ? (r.attempts > 1 ? 'pass*' : 'pass') : r.timedOut ? 'timeout' : `fail(${r.code ?? r.signal})`;
  for (const r of results) console.log(`${r.name.padEnd(width)}  ${label(r).padEnd(7)}  ${fmt(r.ms)}`);
  const failed = results.filter(r => !r.ok);
  const retried = results.filter(r => r.ok && r.attempts > 1).length;
  const skipped = chosen.length - results.length;
  console.log(`\n${results.length - failed.length}/${results.length} passed${retried ? ` (* ${retried} after a retry)` : ''}${skipped ? `, ${skipped} skipped (--bail)` : ''} in ${fmt(Date.now() - total)}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results.map(r => `| ${r.name} | ${label(r)} | ${fmt(r.ms)} |`).join('\n');
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `| Test | Result | Time |\n| --- | --- | --- |\n${rows}\n\n`); } catch {}
  }
  if (failed.length || skipped) process.exitCode = 1;
})().catch(e => { console.error(e.message || e); process.exitCode = 2; });
