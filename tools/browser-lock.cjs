'use strict';
// The one browser lock shared by the loop's two passes (docs/two-tracks.md). Both passes call this script; nothing
// else creates or removes the lock folder (why: pass 108 deleted another pass's lock and pass 118 overwrote pass 117's
// after a bare 30-minute age rule, so two browsers ran at once).
//
//   node tools/browser-lock.cjs run <pass> -- <command ...>   take (waiting), run the command, release: the usual way
//   node tools/browser-lock.cjs take <pass> [--lease <min>]   hold it across several commands (a keeper beats for it)
//   node tools/browser-lock.cjs renew <pass> [--lease <min>]  extend your own hold
//   node tools/browser-lock.cjs release <pass>                drop your own hold (never someone else's)
//   node tools/browser-lock.cjs status
//   node tools/browser-lock.cjs log [hours]                    every hold in the last hours (default 24): wait, hold, command
//
// A lock is live while its holder's process (the `run` process or the `take` keeper) is alive or its heartbeat is
// under BEAT_STALE old. Only a lock whose holder is dead AND whose heartbeat stopped may be taken over. A `take` hold
// ends by itself when its lease runs out (default 20 min), so a pass that dies holding it frees the browser. A lock
// without a heartbeat (the old `owner.txt` rule) is never broken: the script waits and says who holds it.
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const BEAT_EVERY = 10e3, BEAT_STALE = 60e3, POLL = 5e3;
const root = (() => {   // the main checkout, shared by every worktree
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: __dirname, encoding: 'utf8' }).trim();
  return path.dirname(common);
})();
const LOCK = process.env.BROWSER_LOCK || path.join(root, '.scratch', 'browser.lock');
const OWNER = path.join(LOCK, 'owner.json'), BEAT = path.join(LOCK, 'beat');
// One line per hold, kept beside the lock: when it was asked for, taken and let go, so a retro measures where browser
// time went instead of guessing (why: rounds took 5 to 25 min in passes 160-169 and nothing said how much was waiting,
// retro 170).
const HISTORY = path.join(path.dirname(LOCK), 'browser-lock.log');
const minutes = ms => (ms / 60e3).toFixed(1);

const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const read = () => { try { return JSON.parse(fs.readFileSync(OWNER, 'utf8')); } catch { return null; } };
const beatAge = () => { try { return Date.now() - fs.statSync(BEAT).mtimeMs; } catch { return Infinity; } };
const beat = () => { try { const t = new Date(); fs.utimesSync(BEAT, t, t); } catch { try { fs.writeFileSync(BEAT, ''); } catch {} } };

function describe() {
  if (!fs.existsSync(LOCK)) return { free: true, text: 'free' };
  const o = read();
  if (!o) {
    let legacy = '';
    try { legacy = fs.readFileSync(path.join(LOCK, 'owner.txt'), 'utf8').trim(); } catch {}
    // A folder just made by take() has no owner.json for a moment: treat as live.
    return { free: false, stale: false, text: `held by ${legacy ? 'pass ' + legacy : 'someone'} (no heartbeat: never broken, waits for its holder)` };
  }
  const age = beatAge(), live = alive(o.pid) || age < BEAT_STALE;
  const lease = o.until ? `, lease to ${new Date(o.until).toTimeString().slice(0, 8)}` : '';
  const what = o.what ? `, ${minutes(Date.now() - o.since)} min so far: ${o.what}` : '';
  return { free: false, stale: !live, owner: o, text: `held by pass ${o.pass} (pid ${o.pid} ${alive(o.pid) ? 'alive' : 'gone'}, beat ${Math.round(age / 1000)}s ago${lease}${what})` };
}

// One attempt: mkdir is atomic, so of two takers only one wins. A stale lock is renamed away first (also atomic), so
// two passes can't both break it and both win.
function tryTake(pass, pid, until, asked = Date.now(), what = '') {
  const d = describe();
  if (!d.free) {
    if (!d.stale) return d;
    const grave = `${LOCK}.stale-${process.pid}-${Date.now()}`;
    try { fs.renameSync(LOCK, grave); } catch { return describe(); }
    // Another pass may have broken the same dead lock and taken a fresh one between our look and our rename: if what
    // we moved isn't the dead lock we saw, put it back.
    let moved = null; try { moved = JSON.parse(fs.readFileSync(path.join(grave, 'owner.json'), 'utf8')); } catch {}
    if (!moved || moved.since !== d.owner.since || moved.pid !== d.owner.pid) {
      try { fs.renameSync(grave, LOCK); } catch {}
      return describe();
    }
    fs.rmSync(grave, { recursive: true, force: true });
    console.log(`browser-lock: took over a dead lock (${d.text})`);
  }
  try { fs.mkdirSync(LOCK); } catch { return describe(); }
  fs.writeFileSync(OWNER, JSON.stringify({ pass: String(pass), pid, since: Date.now(), until, asked, what: what.replace(/\s+/g, ' ').slice(0, 120) }));
  beat();
  return { took: true };
}

async function waitTake(pass, pid, until, timeoutMin, what = '') {
  const asked = Date.now(), end = asked + timeoutMin * 60e3;
  let said = '';
  for (;;) {
    const r = tryTake(pass, pid, until, asked, what);
    if (r.took) return;
    if (r.text !== said) { console.log(`browser-lock: waiting, ${r.text}`); said = r.text; }
    if (Date.now() > end) { const e = new Error(`browser-lock: gave up after ${timeoutMin} min; ${r.text}`); e.code = 3; throw e; }
    await new Promise(res => setTimeout(res, POLL));
  }
}

function mine(pass) { const o = read(); return o && o.pass === String(pass) ? o : null; }

function release(pass) {
  const o = mine(pass);
  if (!o) { console.log(`browser-lock: not yours to release (${describe().text})`); return false; }
  if (o.pid !== process.pid && alive(o.pid)) { try { process.kill(o.pid); } catch {} }
  const now = Date.now(), asked = o.asked || o.since;
  try {
    fs.appendFileSync(HISTORY, [new Date(asked).toISOString(), o.pass, minutes(o.since - asked), minutes(now - o.since), o.what || ''].join('\t') + '\n');
  } catch {}
  const grave = `${LOCK}.done-${process.pid}-${Date.now()}`;
  try { fs.renameSync(LOCK, grave); fs.rmSync(grave, { recursive: true, force: true }); } catch {}
  console.log(`browser-lock: released by pass ${pass}`);
  return true;
}

// For a script that opens Edge itself (style-frames, pc-bench): waits for the lock, beats for it while this process
// lives, and returns the release. Under `run`, which already holds it for the command, it does nothing.
async function acquire(tag, timeoutMin = 90) {
  if (process.env.BROWSER_LOCK_HELD) return () => {};
  await waitTake(tag, process.pid, null, timeoutMin, path.basename(process.argv[1] || tag));
  const t = setInterval(beat, BEAT_EVERY); t.unref();
  let done = false;
  const free = () => { if (done) return; done = true; clearInterval(t); release(tag); };
  process.on('exit', free);
  return free;
}
module.exports = { acquire, describe };
if (require.main !== module) return;

const args = process.argv.slice(2);
const [cmd, pass] = args;
const opt = (name, dflt) => { const i = args.indexOf(name); return i > 0 && args[i + 1] ? Number(args[i + 1]) : dflt; };
const timeout = opt('--timeout', 90);

(async () => {
  if (cmd === 'status' || !cmd) { console.log(`browser-lock: ${describe().text}`); return; }
  if (cmd === 'log') {   // the holds of the last hours, and each pass's minutes waited and held
    const since = Date.now() - (Number(pass) || 24) * 3600e3, per = new Map();
    let lines = [];
    try { lines = fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean); } catch {}
    for (const l of lines) {
      const [at, who, waited, held, what = ''] = l.split('\t');
      if (!(Date.parse(at) >= since) || !(+waited >= 0) || !(+held >= 0)) continue;
      console.log(`${at.slice(0, 16)}  pass ${who}  waited ${waited} min  held ${held} min  ${what}`);
      const t = per.get(who) || [0, 0, 0]; per.set(who, [t[0] + 1, t[1] + +waited, t[2] + +held]);
    }
    for (const [who, [n, w, h]] of per) console.log(`pass ${who}: ${n} holds, waited ${w.toFixed(1)} min, held ${h.toFixed(1)} min`);
    return;
  }
  if (!pass) { console.error('usage: node tools/browser-lock.cjs run|take|renew|release <pass> ...'); process.exit(2); }

  if (cmd === 'run') {
    const sep = args.indexOf('--'), command = sep > 0 ? args.slice(sep + 1) : [];
    if (!command.length) { console.error('browser-lock run: give the command after --'); process.exit(2); }
    await waitTake(pass, process.pid, null, timeout, command.join(' '));
    const t = setInterval(beat, BEAT_EVERY);
    const env = { ...process.env, BROWSER_LOCK_HELD: String(pass) };
    const child = command[0] === 'node' ? spawn(process.execPath, command.slice(1), { stdio: 'inherit', env })
      : spawn(command.join(' '), { stdio: 'inherit', shell: true, env });
    const done = code => { clearInterval(t); release(pass); process.exit(code); };
    for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, () => { child.kill(); done(130); });
    child.on('exit', code => done(code ?? 1));
    child.on('error', e => { console.error(e.message); done(1); });
    return;
  }

  if (cmd === 'take') {
    const lease = opt('--lease', 20);
    // The keeper owns the hold: it beats while the lease runs and the lock is still this pass's, then lets it go.
    await waitTake(pass, process.pid, Date.now() + lease * 60e3, timeout, 'take');
    const keeper = spawn(process.execPath, [__filename, 'keep', pass], { detached: true, stdio: 'ignore', windowsHide: true });
    keeper.unref();
    const o = read(); o.pid = keeper.pid; fs.writeFileSync(OWNER, JSON.stringify(o));
    console.log(`browser-lock: pass ${pass} holds it for ${lease} min (keeper pid ${keeper.pid}); release when Edge is closed`);
    return;
  }

  if (cmd === 'keep') {   // internal: the take keeper
    const t = setInterval(() => {
      const o = mine(pass);
      if (!o || o.pid !== process.pid) { clearInterval(t); return; }
      if (Date.now() > o.until) { release(pass); clearInterval(t); return; }
      beat();
    }, BEAT_EVERY);
    return;
  }

  if (cmd === 'renew') {
    const o = mine(pass);
    if (!o) { console.error(`browser-lock: not yours (${describe().text})`); process.exit(1); }
    o.until = Date.now() + opt('--lease', 20) * 60e3; fs.writeFileSync(OWNER, JSON.stringify(o)); beat();
    console.log(`browser-lock: pass ${pass} renewed to ${new Date(o.until).toTimeString().slice(0, 8)}`);
    return;
  }

  if (cmd === 'release') { process.exit(release(pass) ? 0 : 1); }
  console.error(`browser-lock: unknown command ${cmd}`); process.exit(2);
})().catch(e => { console.error(e.message); process.exit(e.code === 3 ? 3 : 1); });
