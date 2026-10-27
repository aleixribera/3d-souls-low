// Optional browser audit runner. Requires Playwright; no game runtime dependencies.
// NODE_PATH=<directory containing playwright> node tests/performance.cjs <output-directory> [test-filter]
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = process.env.AUDIT_ROOT ? path.resolve(process.env.AUDIT_ROOT) : path.resolve(__dirname, '..');
const output = path.resolve(process.argv[2] || path.join(root, 'performance-results'));
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'text/plain');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: Number(process.env.AUDIT_DPR || 1) });
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.error('PAGE ERROR:', e.message); });
    page.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.error(m.text().slice(0, 300)); } });
    if (process.env.AUDIT_QUALITY) await page.addInitScript(quality => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: quality }));
    }, process.env.AUDIT_QUALITY);
    await page.goto(`http://127.0.0.1:${server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady && window.__arena.tests, { timeout: 120000 });
    await page.evaluate(() => { Game.manualClock = true; });
    if (process.argv[3] === 'AUTO') {
      const results = [];
      for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
        await page.setViewportSize(viewport);
        const row = await page.evaluate(() => {
          const result = autoQuality.recheck();
          return { ...result, summary: autoQuality.summary() };
        });
        results.push(row); console.log(JSON.stringify(row));
      }
      fs.writeFileSync(path.join(output, 'auto.json'), JSON.stringify({ results, errors }, null, 2));
      if (errors.length) throw new Error(JSON.stringify(errors));
      return;
    }
    if (process.argv[3] === 'LOW') {
      const hardware = await page.evaluate(() => {
        const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
        return { gpu: ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL), dpr: devicePixelRatio };
      });
      if (process.env.AUDIT_NATIVE) await page.evaluate(() => { CONFIG.VISUALS.quality.low.renderScale = 1; });
      const results = [];
      for (const id of ['long-hall', 'sunken-keep', 'burning-town', 'final-castle', 'margit', 'godrick', 'radagon', 'maliketh', 'malenia']) {
        const row = await page.evaluate(async id => {
          Game.manualClock = true; visuals.setQuality('low');
          let seed = 12345;
          Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
          const phases = {}, originals = [];
          for (const [obj, key] of [[visuals, 'warmUp'], [visuals, 'dressStage'], [TEXLIB, 'get'], [TEXLIB, 'material']]) {
            const fn = obj[key]; originals.push([obj, key, fn]);
            obj[key] = function (...args) { const t = performance.now(); try { return fn.apply(this, args); } finally { phases[key] = (phases[key] || 0) + performance.now() - t; } };
          }
          const t = performance.now(), textures = TEXLIB.count();
          if (ELDEN_BOSSES.some(b => b.id === id)) elden.start(id); else Game.startLevel(id);
          const loadMs = performance.now() - t;
          for (const [obj, key, fn] of originals) obj[key] = fn;
          const t1 = performance.now(); Game.reset(); const retryMs = performance.now() - t1;
          Game.loading = 0; document.getElementById('loading').classList.remove('show');
          const cpu = [], gpu = [], calls = [], triangles = [], pending = [];
          const gl = renderer.getContext(), timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
          for (let i = 0; i < 36; i++) {
            await new Promise(requestAnimationFrame);
            const query = timer ? gl.createQuery() : null;
            if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
            Game.update(CONFIG.step); const t = performance.now(); Game.render(1, CONFIG.step);
            if (query) { gl.endQuery(timer.TIME_ELAPSED_EXT); pending.push(query); }
            cpu.push(performance.now() - t); calls.push(renderer.info.render.calls); triangles.push(renderer.info.render.triangles);
          }
          for (let i = 0; pending.length && i < 120; i++) {
            await new Promise(requestAnimationFrame);
            for (let j = pending.length - 1; j >= 0; j--) if (gl.getQueryParameter(pending[j], gl.QUERY_RESULT_AVAILABLE)) {
              if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) gpu.push(gl.getQueryParameter(pending[j], gl.QUERY_RESULT) / 1e6);
              gl.deleteQuery(pending[j]); pending.splice(j, 1);
            }
          }
          for (const query of pending) gl.deleteQuery(query);
          const median = a => a.sort((a, b) => a - b)[Math.floor(a.length / 2)];
          return { id, loadMs, retryMs, phases, newTextures: TEXLIB.count() - textures, textureBakeMs: TEXLIB.stats.ms,
            cpuMs: median(cpu), gpuMs: median(gpu), calls: median(calls), triangles: median(triangles), size: [canvas.width, canvas.height],
            enemies: Game.enemies.length, memory: { ...renderer.info.memory }, programs: renderer.info.programs.length };
        }, id);
        results.push(row); console.log(JSON.stringify(row));
        await page.screenshot({ path: path.join(output, id + '.png') });
      }
      fs.writeFileSync(path.join(output, 'low.json'), JSON.stringify({ hardware, results, errors }, null, 2));
      return;
    }
    if (process.argv[3] === 'MODELS') {
      await page.waitForFunction(() => typeof MODELLAB !== 'undefined' && MODELLAB.open);
      const rows = [];
      for (const id of ['hollowSoldier', 'undeadKnight', 'ashExecutioner', 'giantSkeleton', 'margit', 'godrick', 'malenia']) {
        for (const detail of ['before', 'after']) {
          const result = await page.evaluate(({ id, detail }) => {
            Game.mode = 'play'; Game.manualClock = true;
            KIT.setDetail(detail === 'before' ? { geo: { enemy: 1.8, player: 2.6, boss: 2.6 }, tex: 2 } : CONFIG.VISUALS.ultra.models);
            MODELLAB.close(); MODELLAB.open(id); MODELLAB.pose('idle');
            const model = KIT.modelParts(id);
            return { id, detail, triangles: model.tris, vertices: model.parts.reduce((n, p) => n + p.geo.attributes.position.count, 0),
              bytes: model.parts.reduce((n, p) => n + Object.values(p.geo.attributes).reduce((a, b) => a + b.array.byteLength, 0) + (p.geo.index ? p.geo.index.array.byteLength : 0), 0) };
          }, { id, detail });
          await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
          await page.screenshot({ path: path.join(output, id + '-' + detail + '.png') });
          rows.push(result);
          fs.writeFileSync(path.join(output, 'models.json'), JSON.stringify({ results: rows, errors }, null, 2));
          console.log(JSON.stringify(result));
        }
      }
      return;
    }
    if (process.argv[3] === 'LOADING') {
      const results = await page.evaluate(() => {
        Game.manualClock = true; visuals.setQuality('ultra');
        const rows = [], stages = {};
        for (const [obj, key, label] of [[visuals, 'warmUp', 'warmup'], [visuals, 'dressStage', 'stage'], [lore, 'reset', 'lore'], [finale, 'reset', 'finale']]) {
          const original = obj[key];
          obj[key] = function (...args) { const t = performance.now(); try { return original.apply(this, args); } finally { stages[label] = (stages[label] || 0) + performance.now() - t; } };
        }
        for (const [kind, id] of [...LEVELS.map(l => ['level', l.id]), ...ENEMY_DEFS.map(e => ['enemy', e.id]), ...ELDEN_BOSSES.map(b => ['boss', b.id])]) {
          for (const pass of ['first', 'repeat']) {
            for (const key of Object.keys(stages)) delete stages[key];
            const t = performance.now(), textures = TEXLIB.count(), models = KIT.cache.size;
            if (kind === 'level') Game.startLevel(id); else if (kind === 'boss') elden.start(id); else Game.startFight(id);
            rows.push({ kind, id, pass, ms: performance.now() - t, ...stages, textures: TEXLIB.count() - textures, models: KIT.cache.size - models });
          }
        }
        return rows;
      });
      fs.writeFileSync(path.join(output, 'loading.json'), JSON.stringify({ results, errors }, null, 2));
      console.log(JSON.stringify(results));
      return;
    }
    if (process.argv[3]) {
      const result = await page.evaluate(filter => __arena.tests.run(filter === 'ALL' ? '' : filter), process.argv[3]);
      fs.writeFileSync(path.join(output, 'tests.json'), JSON.stringify({ ...result, errors }, null, 2));
      console.log(result.summary, JSON.stringify(result.failed));
      return;
    }
    const hardware = await page.evaluate(() => {
      const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { gpu: ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL), dpr: devicePixelRatio, maxSamples: renderer.capabilities.maxSamples };
    });
    console.log(JSON.stringify(hardware));
    const results = [];
    for (const id of ['long-hall', 'sunken-keep', 'burning-town', 'the-tower', 'final-castle', 'godrick', 'malenia']) {
      const result = await page.evaluate(async id => {
        let seed = 12345;
        Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        Game.manualClock = true;
        visuals.setQuality('ultra');
        if (['godrick', 'malenia'].includes(id)) elden.start(id); else Game.startLevel(id);
        Game.loading = 0;
        document.getElementById('loading').classList.remove('show');
        for (let i = 0; i < 12; i++) { Game.update(CONFIG.step); Game.render(1, CONFIG.step); }
        const gl = renderer.getContext(), timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
        const cpu = [], gpu = [], calls = [], tris = [], programs = [], pending = [];
        renderer.info.autoReset = false;
        for (let i = 0; i < 48; i++) {
          await new Promise(requestAnimationFrame);
          Game.update(CONFIG.step);
          renderer.info.reset();
          const query = timer ? gl.createQuery() : null;
          if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
          const start = performance.now();
          Game.render(1, CONFIG.step);
          cpu.push(performance.now() - start);
          if (query) { gl.endQuery(timer.TIME_ELAPSED_EXT); pending.push(query); }
          calls.push(renderer.info.render.calls); tris.push(renderer.info.render.triangles); programs.push(renderer.info.programs.length);
        }
        for (let i = 0; pending.length && i < 120; i++) {
          await new Promise(requestAnimationFrame);
          for (let j = pending.length - 1; j >= 0; j--) if (gl.getQueryParameter(pending[j], gl.QUERY_RESULT_AVAILABLE)) {
            if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) gpu.push(gl.getQueryParameter(pending[j], gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(pending[j]); pending.splice(j, 1);
          }
        }
        for (const q of pending) gl.deleteQuery(q);
        renderer.info.autoReset = true;
        const stats = a => { a.sort((x, y) => x - y); return { median: a[Math.floor(a.length / 2)], p95: a[Math.floor(a.length * 0.95)] }; };
        return { id, cpuMs: stats(cpu), gpuMs: stats(gpu), calls: stats(calls), triangles: stats(tris), programs: stats(programs),
          renderSize: [renderer.domElement.width, renderer.domElement.height], ultra: ultraPost.info(), effects: ultraFx.info(),
          memory: { ...renderer.info.memory } };
      }, id);
      results.push(result);
      await page.screenshot({ path: path.join(output, id + '.png') });
      fs.writeFileSync(path.join(output, 'benchmark.json'), JSON.stringify({ hardware, results, errors }, null, 2));
      console.log(JSON.stringify(result));
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
