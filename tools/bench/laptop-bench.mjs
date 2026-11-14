// The frame-rate benchmark on the laptop (PLAN.md track A item 3), Firefox driven over WebDriver BiDi with Node's own
// WebSocket, no dependency. Runs ON the laptop, inside `~/laptop-test/lt run 3d-souls-low ...` (tools/bench/laptop.sh
// sets that up from the PC). Adapted from duty-shooter's laptop driver.
//   node laptop-bench.mjs <gameUrl> <out.json> [width=1920] [height=1080]
//   QUALITIES="normal,ultra"  presets to measure, each in a fresh page load (the canvas's antialias is fixed at load)
//   OPTS='{"levels":"all","fights":["kings-blade"]}'  passed to __bench (tools/bench/bench-page.js)
//   REAL=1  a real full-screen window on the owner's desktop session, instead of a headless Mutter of its own
// rAF runs unthrottled (layout.frame_rate=0), so frame times are the machine's, not the 60 Hz timer's.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [url, out, w = '1920', h = '1080'] = process.argv.slice(2);
const qualities = (process.env.QUALITIES || 'normal,ultra').split(',');
const opts = process.env.OPTS_FILE ? readFileSync(process.env.OPTS_FILE, 'utf8') : process.env.OPTS || '{}';
const benchSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'bench-page.js'), 'utf8');
const port = 9334;
const profile = mkdtempSync(join(tmpdir(), 'souls-bench-'));
writeFileSync(join(profile, 'user.js'), [
  'user_pref("layout.frame_rate", 0);',
  'user_pref("media.volume_scale", "0.0");',
  'user_pref("browser.shell.checkDefaultBrowser", false);',
  'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
  'user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);',
  'user_pref("browser.aboutwelcome.enabled", false);',
  'user_pref("remote.prefs.recommended", true);',
].join('\n'));
// Headless Firefox has no GPU, so it runs as a normal window on a headless Mutter of its own (a virtual monitor drawn
// on the laptop's GPU, its own Wayland display and D-Bus session): nothing shows on the owner's screen.
const ffArgs = `--no-remote --profile ${profile} --remote-debugging-port ${port} --width=${w} --height=${h}`;
const real = !!process.env.REAL;
const session = { WAYLAND_DISPLAY: 'wayland-0', XDG_RUNTIME_DIR: '/run/user/1000', DBUS_SESSION_BUS_ADDRESS: 'unix:path=/run/user/1000/bus' };
const ff = real
  ? spawn('sh', ['-c', `MOZ_ENABLE_WAYLAND=1 GDK_BACKEND=wayland exec firefox --kiosk ${ffArgs}`], {
    env: { ...process.env, ...session, DISPLAY: '' }, stdio: ['ignore', 'ignore', 'pipe'], detached: true })
  : spawn('dbus-run-session', ['--', 'sh', '-c',
    `mutter --headless --no-x11 --virtual-monitor ${w}x${h}@60 --wayland-display souls-wl >/dev/null 2>&1 & sleep 3; ` +
    `WAYLAND_DISPLAY=souls-wl MOZ_ENABLE_WAYLAND=1 GDK_BACKEND=wayland exec nice -n 5 firefox ${ffArgs}`], {
    env: { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '' }, stdio: ['ignore', 'ignore', 'pipe'], detached: true });
let errTail = '';
ff.stderr.on('data', d => (errTail = (errTail + d).slice(-4000)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cleanup = () => { try { process.kill(-ff.pid, 'SIGTERM'); } catch {} setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 1500); };
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143));

let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await sleep(500);
  try { const s = new WebSocket(`ws://127.0.0.1:${port}/session`); await new Promise((ok, bad) => { s.onopen = ok; s.onerror = bad; }); ws = s; } catch {}
}
if (!ws) { console.error('no BiDi', errTail); process.exit(1); }
let id = 0;
const pending = new Map();
ws.onmessage = m => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
const send = (method, params) => new Promise((ok, bad) => {
  const n = ++id;
  pending.set(n, msg => (msg.type === 'error' ? bad(new Error(`${method}: ${msg.error} ${msg.message}`)) : ok(msg.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
await send('session.new', { capabilities: {} });
const context = (await send('browsingContext.getTree', {})).contexts[0].context;
if (!real) await send('browsingContext.setViewport', { context, viewport: { width: Number(w), height: Number(h) }, devicePixelRatio: 1 }).catch(() => {});
const evaluate = async expression => {
  const r = await send('script.evaluate', { expression, target: { context }, awaitPromise: true });
  return r.type === 'success' ? r.result.value : `ERR ${JSON.stringify(r.exceptionDetails?.text)}`;
};
const results = {};
// The runs: one per preset with the same opts, or, when the opts are a list, one per entry
// ({ name, quality, ...opts }: an A/B of settings, each in its own page load).
const parsed = JSON.parse(opts);
const runs = Array.isArray(parsed) ? parsed.map(v => ({ name: v.name || v.quality, q: v.quality || qualities[0], opts: JSON.stringify(v) }))
  : qualities.map(q => ({ name: q, q, opts }));
for (const { name, q, opts } of runs) {
  await send('browsingContext.navigate', { context, url, wait: 'complete' });
  await evaluate(`localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: ${JSON.stringify(q)}, volume: 0, lessons: false })), 1`);
  await send('browsingContext.reload', { context, wait: 'complete' });
  for (let i = 0; i < 240 && (await evaluate('!!window.__arenaReady')) !== true; i++) await sleep(500);
  console.log(q, 'ready', await evaluate(`innerWidth + 'x' + innerHeight + '@' + devicePixelRatio + ' ' + visuals.quality().label`));
  await evaluate(benchSrc + '\n;1');
  await evaluate(`__bench(${opts}), 1`);
  let last = '', r = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 1800e3) {
    await sleep(3000);
    r = await evaluate('window.__benchResult ? JSON.stringify(window.__benchResult) : String(window.__benchProgress)');
    if (typeof r === 'string' && r.startsWith('{')) break;
    if (r !== last) { console.log(Math.round((Date.now() - t0) / 1000) + 's', r); last = r; }
  }
  try { results[name] = JSON.parse(r); } catch { results[name] = { error: r }; }
  for (const [k, v] of Object.entries({ ...results[name].levels, ...results[name].fights })) console.log(name, k, 'fps', v.fps, 'low1', v.low1, 'calls', v.calls);
  if (results[name].errors?.length) console.log(name, 'errors', results[name].errors.join(' | '));
  writeFileSync(out, JSON.stringify({ url, size: [w, h], real, results }, null, 1));
}
await send('session.end', {}).catch(() => {});
process.exit(0);
