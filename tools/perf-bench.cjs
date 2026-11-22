'use strict';
// The performance benchmark (docs/perf/README.md): the same scripted path through the game every run, on a real GPU,
// writing one small JSON. Not a test: it passes or fails nothing, it measures.
//   node tools/perf-bench.cjs [--label NAME] [--out DIR] [--only load,transitions,play,shots] [--quality ultra]
//                             [--size 1920x1080] [--trace] [--software]
// Run it on the Fedora laptop: remote-test --pull .scratch/perf -- node tools/perf-bench.cjs --label baseline
//
// What it does, in order, each part in its own browser context (a fresh one has an empty HTTP cache):
//   load         cold load (empty cache) at full speed and over a throttled "friend's internet" link, then a warm load
//                (same context, cached): navigation to the title's first drawn frame, with the phases between.
//   transitions  title -> a big Story area, title -> a boss duel, title -> Boss Rush alone (lobby, then the run): the
//                loading screen's build, the time to playable, and the hitches in the first seconds after it lifts.
//   play         real-time play, every frame timed: the title (the hub), a big area walked with the camera swept,
//                and the showcase (three Boss Rush bosses with abilities and ultimates, a seeded, scripted fight).
//   shots        fixed scenes on a hand-stepped clock and a seeded random, the same camera every run, for before/after
//                screenshots that prove nothing looks worse.
// The page is served by the game's own server (server/index.cjs: gzip, cache headers), as the home server serves it.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
const flag = name => args.includes('--' + name);
const root = path.resolve(__dirname, '..');
const label = opt('label', 'run');
const outDir = path.resolve(root, opt('out', '.scratch/perf'));
const only = new Set((opt('only', 'load,transitions,play,shots')).split(','));
if (only.has('gauntlet')) only.add('shots');   // numbers count only from a build that draws right: see the visual check
// The visual check (docs/perf/README.md): every shot against the known-good build's, the run fails when one differs.
const baselineDir = path.resolve(root, opt('baseline', 'docs/perf/baseline'));
const saveBaseline = flag('save-baseline');
const quality = opt('quality', 'ultra');
const [W, H] = opt('size', '1920x1080').split('x').map(Number);
const software = flag('software');
const headed = flag('headed');   // a real window on the display (WAYLAND_DISPLAY), vsync on: frames as the screen shows them
fs.mkdirSync(outDir, { recursive: true });
const shotDir = path.join(outDir, 'shots-' + label);

// The GPU, not SwiftShader (the fast-tests pass found headless Chromium on Linux falls back to software without these),
// and no frame cap, so a frame's time is its own cost, not the display's 16.7 ms.
const GPU_ARGS = software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : headed ? ['--enable-gpu', '--ignore-gpu-blocklist']   // Chrome's own default on Linux (ANGLE on OpenGL): Vulkan cannot make a context in a Wayland window
  : ['--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];
const LAUNCH_ARGS = [...GPU_ARGS, ...(headed ? ['--force-device-scale-factor=1', '--ozone-platform=wayland', '--start-fullscreen', `--window-size=${W},${H}`] : ['--disable-gpu-vsync', '--disable-frame-rate-limit']), '--autoplay-policy=no-user-gesture-required',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];

// A "friend at home" link for the throttled cold load: 40 ms round trip, 50 Mbit/s down, 10 up.
const THROTTLE = { offline: false, latency: 40, downloadThroughput: 50e6 / 8, uploadThroughput: 10e6 / 8 };

// ---- in-page instruments (added before any of the game's scripts run) ---------------------------------------------
function instruments({ quality, who }) {
  try {
    localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: quality, volume: 0, music: 0 }));
    if (!location.search.includes('firstvisit')) {
      localStorage.setItem('combat-arena-3d.showcase', JSON.stringify({ version: 'bench', at: Date.now() }));
      localStorage.setItem('combatArena.sparring', JSON.stringify({ done: true, seen: true, old: true, offers: 9 }));
      localStorage.setItem('combatArena.onlineName', 'Bench');   // Boss Rush asks a new player's name first
    }
  } catch (e) { /* none */ }
  const B = window.__bench = { marks: {}, longtasks: [], frames: null, rec: null };
  const mark = name => { if (B.marks[name] == null) B.marks[name] = performance.now(); };
  B.mark = mark;
  // __arenaReady is set by boot.js once every script ran: stamp it, then the first frame drawn after it.
  let ready = false;
  Object.defineProperty(window, '__arenaReady', { configurable: true, get: () => ready, set: v => {
    ready = v; if (v) { mark('ready'); requestAnimationFrame(() => requestAnimationFrame(() => mark('firstFrame'))); }
  } });
  let three;
  Object.defineProperty(window, 'THREE', { configurable: true, get: () => three, set: v => { three = v; mark('three'); } });
  document.addEventListener('DOMContentLoaded', () => mark('dcl'));
  try {
    new PerformanceObserver(list => { for (const e of list.getEntries()) B.longtasks.push([e.startTime, e.duration]); })
      .observe({ type: 'longtask', buffered: true });
  } catch (e) { /* no long tasks API */ }
  // Every frame while recording: its time since the last, plus what changed in the renderer (a new shader program, a
  // new texture or geometry on the GPU) so a hitch can be told apart.
  // hold: ticks still skipped after the loading screen goes. Every callback of a frame gets that frame's start time, so
  // the tick that runs after work finished under the screen (in the same frame) would date the next frame from before it.
  let last = 0, hold = 0;
  const tick = now => {
    requestAnimationFrame(tick);
    const R = B.rec;
    // --programs: the material and object each shader program compiled while recording was first built for.
    if (who && !B.patched && window.__arena && window.__arena.renderer) {
      const r = window.__arena.renderer, rbd = r.renderBufferDirect, progs = r.info.programs, push = progs.push;
      let lastM = null, lastO = null; B.patched = true;
      r.renderBufferDirect = function (c, s, g, m, o) { lastM = m; lastO = o; return rbd.apply(this, arguments); };
      progs.push = function () {
        if (B.rec && lastM) {
          const chain = []; for (let q = lastO, n = 0; q && n < 5; q = q.parent, n++) chain.push((q.name || q.type) + (Object.keys(q.userData).length ? '{' + Object.keys(q.userData).join(',') + '}' : '') + (q === lastO && q.geometry ? '[' + q.geometry.type + ' ' + (q.geometry.attributes.position ? q.geometry.attributes.position.count : 0) + 'v ' + Object.keys(lastM.uniforms || {}).slice(0, 4).join(',') + ']' : ''));
          (B.rec.who = B.rec.who || []).push([+(performance.now() - B.rec.t).toFixed(0), lastM.type + ':' + (lastM.name || '') + (lastM.map ? ' map' : '') + ' | ' + chain.join(' < ')]);
        }
        return push.apply(this, arguments);
      };
    }
    const shown = document.getElementById('loading');   // the game's loading screen, counted or not
    const G = typeof Game !== 'undefined' ? Game : null;   // a top-level const of the game's scripts: not on window
    const loadingNow = !!G && (G.loading > 0 || !!(shown && shown.classList.contains('show')));
    if (R && loadingNow) { R.skipped = (R.skipped || 0) + 1; last = 0; hold = 2; return; }
    if (R && hold > 0) { hold--; R.skipped = (R.skipped || 0) + 1; last = hold ? 0 : now; return; }
    if (R) {
      const info = window.__arena && window.__arena.renderer && window.__arena.renderer.info;
      const programs = info ? info.programs.length : 0, tex = info ? info.memory.textures : 0, geo = info ? info.memory.geometries : 0;
      if (last) R.dt.push(+(now - last).toFixed(2));
      R.prog.push(programs - R.p0);
      if (programs > R.p0 && info) {   // which shader programs a frame compiled: what warm-up missed
        if (!R.programs) R.programs = [];
        R.programs.push([+(now - R.t).toFixed(0), info.programs.slice(R.p0).map(p => p.name + ' ' + String(p.cacheKey).slice(0, 160))]);
      } R.tex.push(tex - R.t0); R.geo.push(geo - R.g0);
      R.p0 = programs; R.t0 = tex; R.g0 = geo;
      R.calls.push(info ? info.render.calls : 0);
      R.at.push(+now.toFixed(1));
    }
    last = now;
  };
  requestAnimationFrame(tick);
  B.start = () => {
    const info = window.__arena && window.__arena.renderer && window.__arena.renderer.info;
    B.rec = { t: performance.now(), dt: [], prog: [], tex: [], geo: [], calls: [], at: [], p0: info ? info.programs.length : 0,
      t0: info ? info.memory.textures : 0, g0: info ? info.memory.geometries : 0 };
    B.longtasks.length = 0;
  };
  B.stop = () => {
    const R = B.rec; B.rec = null; R.ms = performance.now() - R.t;
    R.longtasks = B.longtasks.filter(([s]) => s >= R.t).map(([s, d]) => [+(s - R.t).toFixed(1), +d.toFixed(1)]);
    R.t0page = R.t; delete R.p0; delete R.t0; delete R.g0; delete R.t;
    return R;
  };
}

// ---- numbers -------------------------------------------------------------------------------------------------------
const round = (v, d = 1) => v == null || !isFinite(v) ? null : +v.toFixed(d);
function frameStats(rec, dropFirst = 0) {
  const dt = rec.dt.slice(dropFirst);
  if (!dt.length) return null;
  const sorted = [...dt].sort((a, b) => a - b), total = dt.reduce((a, b) => a + b, 0), minutes = total / 60000;
  const worst = share => { const n = Math.max(1, Math.round(dt.length * share)); const w = sorted.slice(-n); return w.reduce((a, b) => a + b, 0) / n; };
  const pct = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const over = ms => dt.filter(v => v > ms).length;
  // A hitch with a new shader program or texture in its frame (or the one after: rAF stamps the frame after the work).
  const cause = { program: 0, texture: 0, geometry: 0, none: 0 };
  rec.dt.forEach((v, i) => {
    if (i < dropFirst || v <= 33) return;
    const near = k => (rec[k][i] || 0) + (rec[k][i + 1] || 0);
    if (near('prog') > 0) cause.program++; else if (near('tex') > 0) cause.texture++; else if (near('geo') > 0) cause.geometry++; else cause.none++;
  });
  return {
    frames: dt.length, seconds: round(total / 1000, 1), avgFps: round(1000 / (total / dt.length)),
    low1: round(1000 / worst(0.01)), low01: round(1000 / worst(0.001)),
    p50: round(pct(0.5), 2), p99: round(pct(0.99), 2), max: round(sorted[sorted.length - 1], 1),
    hitch33: over(33), hitch50: over(50), hitch33PerMin: round(over(33) / minutes), hitch50PerMin: round(over(50) / minutes),
    hitchCause: cause, newPrograms: rec.prog.reduce((a, b) => a + b, 0), newTextures: rec.tex.reduce((a, b) => a + Math.max(0, b), 0),
    longtasks: rec.longtasks.length, longtaskMax: round(Math.max(0, ...rec.longtasks.map(l => l[1]))),
    drawCalls: rec.calls.length ? [...rec.calls].sort((a, b) => a - b)[Math.floor(rec.calls.length / 2)] : null,
  };
}

// GC pauses on the main thread, from a Chromium trace of the window.
async function traced(browser, page, fn) {
  if (!flag('trace') && !flag('gc')) return { value: await fn(), gc: null };
  await browser.startTracing(page, { categories: ['devtools.timeline', 'v8', 'disabled-by-default-v8.gc'] });
  const value = await fn();
  const buf = await browser.stopTracing();
  const events = JSON.parse(buf.toString()).traceEvents || [];
  const main = events.find(e => e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain');
  const gc = events.filter(e => e.ph === 'X' && (e.name === 'MinorGC' || e.name === 'MajorGC') && (!main || (e.pid === main.pid && e.tid === main.tid)));
  const ms = gc.map(e => e.dur / 1000);
  return { value, gc: { count: gc.length, totalMs: round(ms.reduce((a, b) => a + b, 0)), maxMs: round(Math.max(0, ...ms)),
    major: gc.filter(e => e.name === 'MajorGC').length, over5ms: ms.filter(v => v > 5).length } };
}

// A CPU profile's heaviest functions: by self time, and by total time (self plus everything it called).
// What the main thread ran during each slow frame: the frame's window [at - dt, at] (page time) against the profile's
// samples (pageStart: performance.now() when the profiler started). Per spike, the heaviest game functions (self and
// inclusive time) and what the time went to outside script (GC, (program) = the browser's own work, e.g. the GPU).
function spikesOf(profile, pageStart, rec, over = 25, n = 6) {
  const byId = new Map(profile.nodes.map(node => [node.id, node])), parent = new Map();
  for (const node of profile.nodes) for (const c of node.children || []) parent.set(c, node.id);
  const key = node => `${node.callFrame.functionName || '(anon)'} ${node.callFrame.url.split('/').pop().split('?')[0]}:${node.callFrame.lineNumber + 1}`;
  const times = []; let t = profile.startTime;
  for (const d of profile.timeDeltas) { t += d; times.push(pageStart + (t - profile.startTime) / 1000); }
  const out = [];
  rec.dt.forEach((dt, i) => {
    if (dt <= over) return;
    const end = rec.at[i], start = end - dt, self = new Map(), total = new Map();
    profile.samples.forEach((id, k) => {
      if (times[k] < start || times[k] > end) return;
      const ms = (profile.timeDeltas[k + 1] || 0) / 1000;
      const node = byId.get(id); self.set(key(node), (self.get(key(node)) || 0) + ms);
      const seen = new Set();
      for (let cur = id; cur != null; cur = parent.get(cur)) { const nk = key(byId.get(cur)); if (seen.has(nk)) continue; seen.add(nk); total.set(nk, (total.get(nk) || 0) + ms); }
    });
    const top = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => k + ' ' + Math.round(v));
    out.push({ at: Math.round(end - rec.t0page), dt, self: top(self), total: top([...total].filter(([k]) => !/^\((root|program|idle)\)/.test(k) || true)).slice(0, n + 4) });
  });
  return out;
}

function topFunctions(profile, n = 25) {
  const byId = new Map(profile.nodes.map(node => [node.id, node])), dt = profile.timeDeltas, self = new Map();
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (dt[i] || 0) / 1000));
  const parent = new Map(); for (const node of profile.nodes) for (const c of node.children || []) parent.set(c, node.id);
  const key = node => `${node.callFrame.functionName || '(anon)'} ${node.callFrame.url.split('/').pop().split('?')[0]}:${node.callFrame.lineNumber + 1}`;
  const selfBy = new Map(), totalBy = new Map();
  for (const [id, ms] of self) {
    const node = byId.get(id); selfBy.set(key(node), (selfBy.get(key(node)) || 0) + ms);
    const seen = new Set();
    for (let cur = id; cur != null; cur = parent.get(cur)) { const k = key(byId.get(cur)); if (seen.has(k)) continue; seen.add(k); totalBy.set(k, (totalBy.get(k) || 0) + ms); }
  }
  const top = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v)]);
  return { self: top(selfBy), total: top(totalBy) };
}

// ---- the game's server ---------------------------------------------------------------------------------------------
async function startServer() {
  const { createServer } = require(path.join(root, 'server/index.cjs'));
  const app = createServer({ replayDir: null });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  return { app, url: `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html` };
}

async function newPage(browser, { throttle = false } = {}) {
  const context = await browser.newContext(headed ? { viewport: null } : { viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await context.addInitScript(instruments, { quality, who: flag('programs') });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  if (flag('verbose')) { page.on('pageerror', e => console.error('pageerror', e.message)); page.on('console', m => console.error('console', m.type(), m.text().slice(0, 300))); }
  const cdp = await context.newCDPSession(page);
  if (headed) {   // the whole screen, as a player sees it: the screen's own pixels, 1920x1080 (scale 1)
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'fullscreen' } });
  }
  await cdp.send('Network.enable');
  if (throttle) await cdp.send('Network.emulateNetworkConditions', THROTTLE);
  return { context, page, errors, cdp };
}

// From navigation to the title's first drawn frame, and the phases between (ms from navigation start).
async function measureLoad(page, cdp, url) {
  let bytes = 0, requests = 0;
  const onData = e => { bytes += e.encodedDataLength; requests++; };
  cdp.on('Network.loadingFinished', onData);
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__bench && window.__bench.marks.firstFrame != null, null, { timeout: 120000, polling: 50 }).catch(async e => {
    const state = await page.evaluate(() => JSON.stringify({ marks: window.__bench && window.__bench.marks, ready: document.readyState, arena: !!window.__arenaReady, mode: typeof Game !== 'undefined' && Game.mode, screen: typeof Game !== 'undefined' && Game.screen })).catch(x => String(x));
    await page.screenshot({ path: path.join(outDir, label + '-stuck.png') }).catch(() => {});
    throw new Error('the page never drew its first frame: ' + state + ' ' + e.message.split(String.fromCharCode(10))[0]);
  });
  cdp.off('Network.loadingFinished', onData);
  return page.evaluate(({ bytes, requests }) => {
    const m = window.__bench.marks, nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const scripts = res.filter(r => r.initiatorType === 'script' || r.name.endsWith('.js') || r.name.includes('.js?'));
    const game = scripts.filter(r => r.name.includes('/js/')), three = res.filter(r => r.name.includes('cdn.jsdelivr.net'));
    const end = list => list.length ? Math.max(...list.map(r => r.responseEnd)) : null;
    const r1 = v => v == null ? null : Math.round(v);
    return {
      htmlMs: r1(nav && nav.responseEnd), dclMs: r1(m.dcl), threeMs: r1(m.three), threeFetchedMs: r1(end(three)),
      gameScriptsFetchedMs: r1(end(game)), readyMs: r1(m.ready), firstFrameMs: r1(m.firstFrame),
      requests, kb: Math.round(bytes / 1024), gameScripts: game.length, threeFiles: three.length,
      longtasks: window.__bench.longtasks.length, longtaskMs: r1(window.__bench.longtasks.reduce((a, l) => a + l[1], 0)),
      longestTask: r1(Math.max(0, ...window.__bench.longtasks.map(l => l[1]))),
    };
  }, { bytes, requests });
}

async function gpuString(page) {
  return page.evaluate(() => {
    const gl = __arena.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
}

const frames = n => `new Promise(r => { let k = ${n}; const f = () => (--k > 0 ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); })`;

// A transition through the game's own loading screen, timed: the build, the time until playable, then `after` seconds
// of play with every frame recorded (shaders or textures met for the first time show here).
async function transition(page, kind, id, after = 4, playable = null) {
  const enter = await page.evaluate(async ({ kind, id }) => {
    const B = window.__bench, t0 = performance.now(), wrap = (obj, key) => { const f = obj[key]; obj[key] = function (...a) { const s = performance.now(); try { return f.apply(this, a); } finally { B.build = (B.build || 0) + performance.now() - s; } }; return () => { obj[key] = f; }; };
    B.build = 0;
    const undo = wrap(Game, kind === 'fight' ? 'startFight' : 'startLevel');
    const [name, tip] = kind === 'fight' ? Game.duelCard(id) : Game.levelCard(id);
    Game.loadingFirst(name, tip, () => kind === 'fight' ? Game.startFight(id) : Game.startLevel(id));
    await new Promise(r => { const f = () => (Game.mode === 'play' && Game.loading <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    undo();
    const playable = performance.now() - t0;
    const programs = __arena.renderer.info.programs.length, textures = __arena.renderer.info.memory.textures;
    return { buildMs: Math.round(B.build), playableMs: Math.round(playable), programs, textures };
  }, { kind, id });
  if (playable) await playable();   // e.g. start a CPU profile of the seconds after the screen lifts
  const rec = await page.evaluate(async after => { __bench.start(); await new Promise(r => setTimeout(r, after * 1000)); return __bench.stop(); }, after);
  return { ...enter, rec };
}

async function toTitle(page) {
  await page.evaluate(async () => {
    if (typeof showcase !== 'undefined') showcase.stop();
    if (Game.mode !== 'menu') { Game.mode = 'menu'; }
    Game.showMenu('main');
    await new Promise(r => setTimeout(r, 300));
  });
}

async function main() {
  const { app, url } = await startServer();
  const browser = await chromium.launch({ headless: !headed, args: LAUNCH_ARGS });
  const result = { label, when: new Date().toISOString(), quality, size: [W, H], software, headed, gpu: null, chromium: browser.version(),
    load: {}, transitions: {}, play: {}, errors: [] };
  const save = () => fs.writeFileSync(path.join(outDir, label + '.json'), JSON.stringify(result, null, 1));
  try {
    try { result.loadavg = fs.readFileSync('/proc/loadavg', 'utf8').trim(); } catch (e) { result.loadavg = null; }
    // ---- load ----
    if (only.has('load')) {
      for (const [name, throttle] of [['cold', false], ['coldThrottled', true]]) {
        const runs = [];
        for (let i = 0; i < 3; i++) {
          const P = await newPage(browser, { throttle });
          runs.push(await measureLoad(P.page, P.cdp, url));
          if (!result.gpu) result.gpu = await gpuString(P.page);
          if (name === 'cold' && i === 2) {   // warm: a second visit in the same context, its cache filled
            const W2 = [];
            for (let j = 0; j < 3; j++) {
              const page2 = await P.context.newPage();
              const cdp2 = await P.context.newCDPSession(page2); await cdp2.send('Network.enable');
              W2.push(await measureLoad(page2, cdp2, url));
              await page2.close();
            }
            result.load.warm = W2;
          }
          result.errors.push(...P.errors);
          await P.context.close();
        }
        result.load[name] = runs;
        save();
      }
    }
    // ---- profile: a sampled CPU profile of a warm load and a level's build, the top functions by self and total time ----
    if (only.has('profile')) {
      const P = await newPage(browser);
      await measureLoad(P.page, P.cdp, url);
      const page2 = await P.context.newPage();
      const cdp2 = await P.context.newCDPSession(page2);
      await cdp2.send('Profiler.enable'); await cdp2.send('Profiler.setSamplingInterval', { interval: 200 });
      await cdp2.send('Profiler.start');
      await measureLoad(page2, cdp2, url);
      result.profile = { load: topFunctions((await cdp2.send('Profiler.stop')).profile) };
      await toTitle(page2);
      for (const [kind, id] of [['level', 'final-castle'], ['level', 'the-church'], ['fight', 'kingsBlade']]) {
        await cdp2.send('Profiler.start');
        let build = null;
        await transition(page2, kind, id, 4, async () => { build = topFunctions((await cdp2.send('Profiler.stop')).profile); await cdp2.send('Profiler.start'); });
        result.profile[id] = build; result.profile[id + ' after'] = topFunctions((await cdp2.send('Profiler.stop')).profile);
        await toTitle(page2);
      }
      await P.context.close();
      save();
    }
    // ---- transitions ----
    if (only.has('transitions')) {
      const P = await newPage(browser);
      await measureLoad(P.page, P.cdp, url);
      if (!result.gpu) result.gpu = await gpuString(P.page);
      await toTitle(P.page);
      for (const [kind, id, key] of [['level', 'final-castle', 'bigArea'], ['level', 'the-church', 'church'], ['fight', 'kingsBlade', 'bossDuel'], ['level', 'final-castle', 'bigAreaAgain']]) {
        const T = await transition(P.page, kind, id);
        result.transitions[key] = { id, buildMs: T.buildMs, playableMs: T.playableMs, programs: T.programs, textures: T.textures, after: frameStats(T.rec) };
        await toTitle(P.page);
        save();
      }
      result.errors.push(...P.errors);
      await P.context.close();
      // Boss Rush alone, from a fresh title: the lobby, then the run (the lobby's frame boots the engine a second time).
      const R = await newPage(browser);
      await measureLoad(R.page, R.cdp, url);
      const rush = await R.page.evaluate(async () => {
        const wait = (ok, s, what) => new Promise((r, no) => { const end = performance.now() + s * 1000; const f = () => ok() ? r() : performance.now() > end ? no(new Error('timed out: ' + what)) : setTimeout(f, 16); f(); });
        await wait(() => Game.screen === 'main', 20, 'title');
        const t0 = performance.now();
        const i = Game.menuItems.findIndex(m => m.name === 'Boss Rush');
        if (i < 0) throw new Error('no Boss Rush in ' + Game.menuItems.map(m => m.name).join(', '));
        input.suspended = false; gamepad.neutralRequired = false;   // a headless page has no focus
        Game.select(i, true); Game.confirm();
        await wait(() => multiplayer.connected, 60, 'lobby');
        const lobby = performance.now() - t0;
        await new Promise(r => setTimeout(r, 1500));
        const t1 = performance.now();
        input.suspended = false; document.getElementById('lobbyStart').click();
        await wait(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive && multiplayer.info.receivedFrames > 2, 90, 'run');
        return { lobbyMs: Math.round(lobby), runMs: Math.round(performance.now() - t1) };
      }).catch(e => ({ error: String(e).slice(0, 200) }));
      result.transitions.bossRush = rush;
      result.errors.push(...R.errors);
      await R.context.close();
      save();
    }
    // ---- play ----
    if (only.has('play')) {
      const P = await newPage(browser);
      await measureLoad(P.page, P.cdp, url);
      if (!result.gpu) result.gpu = await gpuString(P.page);
      await toTitle(P.page);
      // The hub: the title screen (and its scene) for 10 s.
      let r = await traced(browser, P.page, () => P.page.evaluate(async () => { __bench.start(); await new Promise(r => setTimeout(r, 10000)); return __bench.stop(); }));
      result.play.title = { ...frameStats(r.value), gc: r.gc };
      save();
      // A big area: in, then 25 s walking forward with the camera swept slowly left and right; enemies come.
      await transition(P.page, 'level', 'final-castle', 0.1);
      r = await traced(browser, P.page, () => P.page.evaluate(async () => {
        let seed = 777; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        Game.player.hp = Game.player.maxHp = 1e9;
        input.suspended = false;   // a headless page has no focus
        input.down('KeyW');
        __bench.start();
        const t0 = performance.now();
        await new Promise(r => { const f = () => {
          const t = (performance.now() - t0) / 1000; if (t > 25) { r(); return; }
          Game.mouseLook(Math.sin(t * 0.9) * 6, 0); requestAnimationFrame(f); }; requestAnimationFrame(f); });
        input.up('KeyW');
        return __bench.stop();
      }));
      result.play.bigArea = { ...frameStats(r.value, 30), gc: r.gc };
      await toTitle(P.page);
      save();
      // The showcase: three bosses at a late run's pace, abilities, ultimates, and two fades between fights.
      r = await traced(browser, P.page, () => P.page.evaluate(async () => {
        __bench.start();
        // As the title's Tutorial and the first launch start it: the loading screen painted, then the show's setup under it.
        await new Promise(r => {
          document.getElementById('loading').classList.add('show');
          requestAnimationFrame(() => requestAnimationFrame(() => { if (!showcase.play({ skippable: true, toMenu: false, onEnd: r })) r(); }));
          setTimeout(r, 120000);
        });
        return __bench.stop();
      }));
      result.play.showcase = { ...frameStats(r.value), gc: r.gc, beats: await P.page.evaluate(() => { const rep = showcase.report(); return rep && rep.beats ? rep.beats.length : null; }) };
      result.errors.push(...P.errors);
      await P.context.close();
      save();
    }
    // ---- gauntlet: the done-bar (docs/perf/README.md "The gauntlet"). The heaviest real play, end to end, every frame
    // timed except the loading screens': the busiest area fought through with a death and a respawn, the burning town,
    // a Boss Rush fight with three co-op players, and the showcase's three late-run bosses with abilities and ultimates.
    if (only.has('gauntlet')) {
      const P = await newPage(browser);
      await measureLoad(P.page, P.cdp, url);
      if (!result.gpu) result.gpu = await gpuString(P.page);
      result.display = await P.page.evaluate(() => ({ inner: [innerWidth, innerHeight], screen: [screen.width, screen.height], dpr: devicePixelRatio,
        graphics: JSON.parse(localStorage.getItem('combat-arena-3d.settings') || '{}').graphics, drawing: [__arena.renderer.domElement.width, __arena.renderer.domElement.height] }));
      await toTitle(P.page);
      const G = result.gauntlet = {};
      const all = { dt: [], prog: [], tex: [], geo: [], calls: [], longtasks: [], ms: 0 };
      // --spikes: a CPU profile of each part, and what ran in each slow frame (spikesOf).
      const profiled = async fn => {
        if (!flag('spikes')) return fn();
        await P.cdp.send('Profiler.enable'); await P.cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await P.cdp.send('Profiler.start');
        const pageStart = await P.page.evaluate(() => performance.now());
        const rec = await fn();
        const { profile } = await P.cdp.send('Profiler.stop');
        rec.spikes = spikesOf(profile, pageStart, rec);
        rec.profile = { profile, pageStart };
        return rec;
      };
      const keep = (name, rec, drop = 0) => {
        G[name] = frameStats(rec, drop) || { frames: 0 };   // an entry recorded before its first frame
        if (rec.spikes) G[name].spikes = rec.spikes;
        if (rec.profile) {   // the whole profile (DevTools opens it) and the frames, to look closer afterwards
          fs.writeFileSync(path.join(outDir, `${label}-${name}.cpuprofile`), JSON.stringify(rec.profile.profile));
          Object.assign(G[name], { profileStart: rec.profile.pageStart, frameAt: rec.at, frameDt: rec.dt, t0page: rec.t0page });
        }
        G[name].slow = rec.dt.map((v, i) => [Math.round(rec.at[i] - rec.t0page), v]).filter(([, v]) => v > 17.5);
        if (rec.programs) G[name].programs = rec.programs;
        if (rec.who) G[name].who = rec.who;
        for (const k of ['dt', 'prog', 'tex', 'geo', 'calls']) all[k].push(...rec[k].slice(drop));
        all.longtasks.push(...rec.longtasks); all.ms += rec.ms;
        save();
      };
      // Walk forward for `seconds`, the camera swept left and right, a light attack every 0.45 s and a heavy every 2.1 s;
      // `dieAt`: the player dies then (the death, the respawn at the bonfire, the world reset) and walks on.
      const walk = (seconds, dieAt = -1) => P.page.evaluate(async ({ seconds, dieAt }) => {
        let seed = 777; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        const tough = () => { if (Game.player.alive()) Game.player.hp = Game.player.maxHp = 1e9; };
        input.suspended = false; gamepad.neutralRequired = false;
        __bench.start();
        const t0 = performance.now();
        let died = false, lastLight = 0, lastHeavy = 0;
        await new Promise(r => { const f = () => {
          const t = (performance.now() - t0) / 1000; if (t > seconds) { r(); return; }
          if (dieAt >= 0 && t > dieAt && !died) { died = true; Game.player.die(); }
          if (Game.player.alive()) tough();
          input.down('KeyW');
          if (t - lastLight > 0.45) { lastLight = t; input.down('KeyJ'); setTimeout(() => input.up('KeyJ'), 60); }
          if (t - lastHeavy > 2.1) { lastHeavy = t; input.down('KeyK'); setTimeout(() => input.up('KeyK'), 300); }
          Game.mouseLook(Math.sin(t * 0.9) * 6, 0); requestAnimationFrame(f); }; requestAnimationFrame(f); });
        input.up('KeyW');
        return __bench.stop();
      }, { seconds, dieAt });
      // 1. The busiest area (the Final Castle, most enemies of any level): in through the loading screen, 40 s fought
      //    through, a death at 24 s and the respawn.
      let T = await transition(P.page, 'level', 'final-castle', 0.01);
      keep('areaEntry', T.rec);
      keep('area', await profiled(() => walk(40, 24)));
      await toTitle(P.page);
      // 2. The burning town (fire everywhere): in, 20 s fought through.
      T = await transition(P.page, 'level', 'burning-town', 0.01);
      keep('townEntry', T.rec);
      keep('town', await profiled(() => walk(20)));
      await toTitle(P.page);
      // 3. Boss Rush, four players: this page leads the lobby, three of the game's own bots (the lobby's simulation, as
      //    the server runs them) join the run as soon as it starts, and fight the boss beside the player for 40 s.
      const rush = await P.page.evaluate(async () => {
        const wait = (ok, s, what) => new Promise((r, no) => { const end = performance.now() + s * 1000; const f = () => ok() ? r() : performance.now() > end ? no(new Error('timed out: ' + what)) : setTimeout(f, 16); f(); });
        await wait(() => Game.screen === 'main', 20, 'title');
        const i = Game.menuItems.findIndex(m => m.name === 'Boss Rush');
        if (i < 0) throw new Error('no Boss Rush in ' + Game.menuItems.map(m => m.name).join(', '));
        input.suspended = false; gamepad.neutralRequired = false;
        Game.select(i, true); Game.confirm();
        await wait(() => multiplayer.connected, 60, 'lobby');
        await new Promise(r => setTimeout(r, 1000));
        input.suspended = false; document.getElementById('lobbyStart').click();
        await wait(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive && multiplayer.info.receivedFrames > 2, 90, 'run');
        return true;
      }).catch(e => ({ error: String(e).slice(0, 200) }));
      if (rush !== true) G.rushError = rush.error;
      else {
        const bots = [0, 1, 2].map(() => app.sim.addBot());
        G.rushBots = bots.filter(Boolean).length;
        const R = await profiled(() => P.page.evaluate(async () => {
          const wait = (ok, s) => new Promise(r => { const end = performance.now() + s * 1000; const f = () => ok() || performance.now() > end ? r() : setTimeout(f, 50); f(); });
          await wait(() => (multiplayer.info.players || []).length >= 4, 5);
          const tough = () => { if (Game.player.alive()) Game.player.hp = Game.player.maxHp = 1e9; };
          input.suspended = false;
          __bench.start();
          const t0 = performance.now();
          let lastLight = 0;
          await new Promise(r => { const f = () => {
            const t = (performance.now() - t0) / 1000; if (t > 40) { r(); return; }
            tough();
            const boss = Game.enemies.find(e => e.isBoss && e.isBoss() && e.alive && e.alive());
            if (boss && Game.lock !== boss) Game.setLock(boss);
            input.down('KeyW');
            if (t - lastLight > 0.45) { lastLight = t; input.down('KeyJ'); setTimeout(() => input.up('KeyJ'), 60); }
            requestAnimationFrame(f); }; requestAnimationFrame(f); });
          input.up('KeyW');
          const rec = __bench.stop();
          rec.players = (multiplayer.info.players || []).length;
          return rec;
        }));
        G.rushPlayers = R.players;
        keep('rush', R);
      }
      await P.page.evaluate(() => { try { multiplayer.leave && multiplayer.leave(); } catch (e) { /* none */ } });
      await toTitle(P.page);
      // 4. The showcase: three Boss Rush bosses at a late run's pace, every ability and ultimate in its script, two fades.
      const S = await profiled(() => P.page.evaluate(async () => {
        // Started as the title's Tutorial and the first launch start it: its setup under the loading screen.
        __bench.start();
        $('loading').classList.add('show');
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!showcase.play({ skippable: true, toMenu: false, onEnd: r })) r();
          setTimeout(r, 120000);
        })));
        return __bench.stop();
      }));
      keep('showcase', S);
      G.whole = frameStats(all);
      G.whole.over33 = all.dt.filter(v => v > 33).length;
      G.whole.over17 = all.dt.filter(v => v > 17.5).length;
      result.errors.push(...P.errors);
      await P.context.close();
      save();
    }
    // ---- shots ----
    if (only.has('shots')) {
      fs.mkdirSync(shotDir, { recursive: true });
      const P = await newPage(browser);
      await measureLoad(P.page, P.cdp, url);
      await toTitle(P.page);
      const scenes = [['level', 'final-castle', 30], ['level', 'the-church', 30], ['level', 'burning-town', 30], ['fight', 'kingsBlade', 90], ['showcase', null, 620], ['showcase', null, 1500]];
      for (const [kind, id, steps] of scenes) {
        await P.page.evaluate(async ({ kind, id, steps }) => {
          if (typeof showcase !== 'undefined') showcase.stop();
          // Two seeded streams: three.js draws on Math.random for every object's uuid, so with one stream a build that
          // makes one object more or fewer (a reused material) would shift every draw the fight makes after it.
          const lcg = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
          const game = lcg(12345), ids = lcg(777), probe = {}, limit = Error.stackTraceLimit;
          Math.random = () => {
            Error.stackTraceLimit = 2; Error.captureStackTrace(probe); Error.stackTraceLimit = limit;
            return probe.stack.includes('generateUUID') ? ids() : game();
          };
          // The wall clock too: sway, banners and shader time read performance.now(), so a shot would otherwise depend on
          // how long this build took to get here. A fake clock starts at the same time and moves one step per update.
          const realNow = performance.now; let now = 1e6; performance.now = () => now;
          const tick = () => { now += CONFIG.step * 1000; };
          Game.manualClock = true;
          try {
            if (kind === 'showcase') {
              Game.showMenu('main');
              showcase.play({ manual: true, skippable: true });
              for (let i = 0; i < steps; i++) { showcase.frame(CONFIG.step, { render: i === steps - 1 }); tick(); }
            } else {
              if (kind === 'fight') Game.startFight(id); else Game.startLevel(id);
              Game.loading = 0; document.getElementById('loading').classList.remove('show');
              for (let i = 0; i < steps; i++) { Game.update(CONFIG.step); tick(); }
              Game.render(1, CONFIG.step);
            }
          } finally { performance.now = realNow; }
        }, { kind, id, steps });
        await P.page.evaluate(frames(3));
        await P.page.screenshot({ path: path.join(shotDir, `${kind}-${id || 'showcase'}-${steps}.png`) });
        await P.page.evaluate(() => { if (typeof showcase !== 'undefined') showcase.stop(); Game.manualClock = false; });
      }
      result.errors.push(...P.errors);
      await P.context.close();
      result.visual = await visualCheck(browser, quality);
    }
  } finally {
    save();
    await browser.close();
    app.server.close(); if (app.close) app.close();
  }
  console.log(JSON.stringify(summary(result), null, 1));
  if (result.visual && !result.visual.pass) {
    console.error('VISUAL CHECK FAILED: this build draws differently from the baseline; its numbers do not count.');
    for (const v of result.visual.shots.filter(v => !v.pass)) console.error('  ' + v.shot + ': ' + v.why);
    process.exitCode = 4;
  }
  if (/swiftshader|llvmpipe/i.test(result.gpu || '') && !software) { console.error('WARNING: software rendering: ' + result.gpu); process.exitCode = 3; }
}

// ---- the visual check ------------------------------------------------------------------------------------------------
// Each shot (the same scenes, hand-stepped game and wall clocks, seeded random) is compared with the baseline's, both
// scaled to 960x540 in the browser: the mean difference per channel over the whole frame, and the worst 32x32 block's.
// The block catches a fault in one place (a body not drawn moves a block 30+ of 255, while the frame's mean barely
// moves); the mean catches one spread thin over everything. Calibration in docs/perf/README.md. A side-by-side with a
// difference heat map (red: the blocks over the limit) is written next to the shots for each one, to look at.
const VISUAL = { w: 960, h: 540, block: 32, maxBlock: 15, maxMean: 4 };
async function visualCheck(browser, q) {
  const base = path.join(baselineDir, q), shots = fs.readdirSync(shotDir).filter(f => f.endsWith('.png'));
  const page = await (await browser.newContext()).newPage();
  const out = { baseline: path.relative(root, base), pass: true, shots: [] };
  try {
    if (saveBaseline) fs.mkdirSync(base, { recursive: true });
    for (const f of shots) {
      const name = f.replace(/.png$/, '.jpg'), mine = fs.readFileSync(path.join(shotDir, f)).toString('base64');
      const theirs = fs.existsSync(path.join(base, name)) ? fs.readFileSync(path.join(base, name)).toString('base64') : null;
      const r = await page.evaluate(async ({ mine, theirs, V }) => {
        const load = async b64 => createImageBitmap(await (await fetch('data:image/' + (b64.startsWith('iVBOR') ? 'png' : 'jpeg') + ';base64,' + b64)).blob());
        const draw = bmp => { const c = new OffscreenCanvas(V.w, V.h), g = c.getContext('2d'); g.drawImage(bmp, 0, 0, V.w, V.h); return { c, d: g.getImageData(0, 0, V.w, V.h).data }; };
        const toB64 = async c => { const b = await c.convertToBlob({ type: 'image/jpeg', quality: 0.85 }); const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); };
        const A = draw(await load(mine));
        if (!theirs) return { scaled: await toB64(A.c) };
        const B = draw(await load(theirs));
        const side = new OffscreenCanvas(V.w * 3, V.h), g = side.getContext('2d'), heat = g.createImageData(V.w, V.h);
        const bw = Math.floor(V.w / V.block), bh = Math.floor(V.h / V.block), blocks = new Float64Array(bw * bh);
        let sum = 0;
        for (let i = 0, p = 0; i < A.d.length; i += 4, p++) {
          const d = (Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2])) / 3;
          sum += d;
          const bx = Math.floor((p % V.w) / V.block), by = Math.floor(p / V.w / V.block);
          if (bx < bw && by < bh) blocks[by * bw + bx] += d;
          heat.data[i] = heat.data[i + 1] = Math.min(255, d * 3); heat.data[i + 2] = 0; heat.data[i + 3] = 255;
        }
        let worst = 0, over = 0;
        for (let k = 0; k < blocks.length; k++) {
          const m = blocks[k] / (V.block * V.block); worst = Math.max(worst, m);
          if (m <= V.maxBlock) continue;
          over++;
          const x0 = (k % bw) * V.block, y0 = Math.floor(k / bw) * V.block;
          for (let y = y0; y < y0 + V.block; y++) for (let x = x0; x < x0 + V.block; x++) { const i = (y * V.w + x) * 4; heat.data[i] = 255; heat.data[i + 1] >>= 2; }
        }
        g.drawImage(B.c, 0, 0); g.drawImage(A.c, V.w, 0); g.putImageData(heat, V.w * 2, 0);
        return { mean: sum / (A.d.length / 4), worst, over, scaled: await toB64(A.c), side: await toB64(side) };
      }, { mine, theirs, V: VISUAL });
      if (saveBaseline) fs.writeFileSync(path.join(base, name), Buffer.from(r.scaled, 'base64'));
      if (r.side) fs.writeFileSync(path.join(shotDir, 'compare-' + name), Buffer.from(r.side, 'base64'));
      const v = { shot: name, mean: r.mean === undefined ? null : +r.mean.toFixed(2), worst: r.worst === undefined ? null : +r.worst.toFixed(1), over: r.over };
      v.pass = saveBaseline || (r.mean !== undefined && r.mean <= VISUAL.maxMean && r.worst <= VISUAL.maxBlock);
      if (!v.pass) v.why = r.mean === undefined ? 'no baseline shot (' + path.relative(root, path.join(base, name)) + ')'
        : `mean difference ${v.mean} (max ${VISUAL.maxMean}), worst block ${v.worst} (max ${VISUAL.maxBlock}, ${v.over} over): see compare-${name}`;
      out.shots.push(v); if (!v.pass) out.pass = false;
    }
  } finally { await page.context().close(); }
  return out;
}

// The headline numbers, the ones the table in docs/perf/results.md keeps.
function summary(r) {
  const med = list => { if (!list || !list.length) return null; const out = {}; for (const k of Object.keys(list[0])) { const v = list.map(x => x[k]).filter(x => typeof x === 'number').sort((a, b) => a - b); out[k] = v.length ? v[Math.floor(v.length / 2)] : null; } return out; };
  const L = { cold: med(r.load.cold), coldThrottled: med(r.load.coldThrottled), warm: med(r.load.warm) };
  const pick = s => s && { avgFps: s.avgFps, low1: s.low1, low01: s.low01, hitch33PerMin: s.hitch33PerMin, hitch50PerMin: s.hitch50PerMin, max: s.max, cause: s.hitchCause, gc: s.gc };
  return {
    label: r.label, gpu: r.gpu, loadavg: r.loadavg,
    load: Object.fromEntries(Object.entries(L).filter(([, v]) => v).map(([k, v]) => [k, { ready: v.readyMs, firstFrame: v.firstFrameMs, three: v.threeMs, kb: v.kb, requests: v.requests, longestTask: v.longestTask }])),
    transitions: Object.fromEntries(Object.entries(r.transitions).map(([k, v]) => [k, v.after ? { build: v.buildMs, playable: v.playableMs, programs: v.programs, after: pick(v.after) } : v])),
    play: Object.fromEntries(Object.entries(r.play).map(([k, v]) => [k, pick(v)])),
    gauntlet: r.gauntlet && Object.fromEntries(Object.entries(r.gauntlet).map(([k, v]) => [k, v && v.frames ? { ...pick(v), frames: v.frames, p99: v.p99, over33: v.over33, over17: v.over17 } : v])),
    display: r.display,
    visual: r.visual && { pass: r.visual.pass, shots: r.visual.shots.map(v => v.shot + ' ' + v.mean + '/' + v.worst + (v.pass ? '' : ' FAIL')) },
    errors: r.errors.length ? r.errors.slice(0, 5) : undefined,
  };
}

main().catch(e => { console.error(e); process.exitCode = 1; });
