// Optional repeatable HIGH preset trials; requires the same Playwright/Edge setup as performance.cjs.
// node tests/high-quality.cjs <output-dir> [comma-separated variants]
// AUDIT_ROOT may point to an unchanged checkout for a before/after comparison.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(process.env.AUDIT_ROOT || path.join(__dirname, '..'));
const output = path.resolve(process.argv[2] || '.scratch/high-quality');
const variants = (process.argv[3] || 'low,high,no-reflections,base-geometry,fire,full-warmup,ultra').split(',');
const scenes = ['long-hall', 'burning-town', 'final-castle', 'godrick', 'godrick-fire', 'malenia-rot'];
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') return res.writeHead(204).end();
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'text/plain');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [], errors = [];
  let hardware;
  try {
    for (const dpr of (process.env.AUDIT_DPR || '1,2').split(',').map(Number)) for (const variant of variants) {
      const quality = ['low', 'ultra'].includes(variant) ? variant : 'high';
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push({ variant, dpr, error: e.message }));
      page.on('console', m => { if (m.type() === 'error') errors.push({ variant, dpr, error: m.text() }); });
      await page.addInitScript(quality => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: quality })), quality);
      await page.goto(`http://127.0.0.1:${server.address().port}/combat-arena-3d.html#dev`);
      await page.waitForFunction(() => window.__arenaReady && __arena.tests, { timeout: 120000 });
      hardware = await page.evaluate(() => {
        Game.manualClock = true; Game.mode = 'play';
        const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info');
        return { gpu: e && gl.getParameter(e.UNMASKED_RENDERER_WEBGL), viewport: [innerWidth, innerHeight] };
      });
      await page.evaluate(variant => {
        const q = CONFIG.VISUALS.quality.high;
        if (variant === 'no-reflections') q.reflections = false;
        if (variant === 'base-geometry') q.modelDetail = { geo: 1, tex: 1, anatomy: false };
        if (variant === 'fire') q.proceduralFire = true;
        if (variant === 'full-warmup') q.warmupSize = 0;
        if (variant === 'sculpted') q.modelDetail.anatomy = true;
        if (variant === 'split-output') {
          const grade = visuals.passes.grade;
          grade.material.fragmentShader = grade.material.fragmentShader.replace(GRADE_OUTPUT, '');
          grade.material.needsUpdate = true;
          visuals.composer.insertPass(new OutputPass(), visuals.composer.passes.indexOf(grade));
        }
      }, variant);
      for (const id of scenes) {
        const row = await page.evaluate(async ({ id, variant, quality, dpr }) => {
          let seed = 12345;
          Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
          visuals.setQuality(quality);
          const warming = [], originalWarm = visuals.warmUp;
          visuals.warmUp = function (...args) {
            const start = performance.now();
            try { return originalWarm.apply(this, args); } finally { warming.push(performance.now() - start); }
          };
          const start = performance.now();
          try {
            if (id.startsWith('godrick')) elden.start('godrick');
            else if (id === 'malenia-rot') elden.start('malenia');
            else Game.startLevel(id);
          } finally { visuals.warmUp = originalWarm; }
          const loadMs = performance.now() - start;
          const retryStart = performance.now(); Game.reset(); const retryMs = performance.now() - retryStart;
          Game.loading = 0; document.getElementById('loading').classList.remove('show');
          for (let i = 0; i < 12; i++) Game.update(CONFIG.step);
          if (id === 'godrick-fire' || id === 'malenia-rot') {
            const e = Game.duel, phase = id === 'godrick-fire' ? 'dragon' : 'rot';
            const from = e.phase;
            e.enterPhase(e.phaseIds.indexOf(phase));
            events.emit('bossPhase', { enemy: e, from, to: e.phase, seamless: true });
            const attack = e.def.attacks.find(a => a.id === (id === 'godrick-fire' ? 'flameSweep' : 'aeonia'));
            if (!attack) throw new Error('Missing trial attack for ' + id);
            e.beginAttack(attack); e.strike(Game.player); e.stateTime = attack.hits[0].active * 0.5;
            // Frame the boss and attack footprint. Simulation is held while effects keep rendering.
            Game.cam.pos.set(e.x + 8, e.y + 6, e.z + 11); Game.cam.look.set(e.x, e.y + 1.5, e.z);
          }
          for (let i = 0; i < 16; i++) Game.render(1, CONFIG.step);
          const gl = renderer.getContext(), timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
          const warmCpu = [], warmGpu = [], warmPending = [];
          if (variant === 'high' || variant === 'full-warmup') {
            for (let i = 0; i < 8; i++) {
              await new Promise(requestAnimationFrame);
              const q = timer && gl.createQuery();
              if (q) gl.beginQuery(timer.TIME_ELAPSED_EXT, q);
              const t = performance.now(); visuals.warmUp(Game.cam); warmCpu.push(performance.now() - t);
              if (q) { gl.endQuery(timer.TIME_ELAPSED_EXT); warmPending.push(q); }
            }
            for (let i = 0; warmPending.length && i < 120; i++) {
              await new Promise(requestAnimationFrame);
              for (let j = warmPending.length - 1; j >= 0; j--) if (gl.getQueryParameter(warmPending[j], gl.QUERY_RESULT_AVAILABLE)) {
                if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) warmGpu.push(gl.getQueryParameter(warmPending[j], gl.QUERY_RESULT) / 1e6);
                gl.deleteQuery(warmPending[j]); warmPending.splice(j, 1);
              }
            }
            for (const q of warmPending) gl.deleteQuery(q);
          }
          const cpu = [], gpu = [], calls = [], triangles = [], pending = [];
          renderer.info.autoReset = false;
          const programStart = renderer.info.programs.length;
          for (let i = 0; i < 64; i++) {
            await new Promise(requestAnimationFrame);
            renderer.info.reset();
            const q = timer && gl.createQuery();
            if (q) gl.beginQuery(timer.TIME_ELAPSED_EXT, q);
            const t = performance.now(); Game.render(1, CONFIG.step); cpu.push(performance.now() - t);
            if (q) { gl.endQuery(timer.TIME_ELAPSED_EXT); pending.push(q); }
            calls.push(renderer.info.render.calls); triangles.push(renderer.info.render.triangles);
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
          const stats = a => { a.sort((x, y) => x - y); return { median: a[Math.floor(a.length / 2)] ?? null, p95: a[Math.floor(a.length * 0.95)] ?? null }; };
          return { id, variant, dpr, loadMs, warmMs: warming[0], retryMs, warmCpuMs: stats(warmCpu), warmGpuMs: stats(warmGpu), gpuMs: stats(gpu), cpuMs: stats(cpu),
            calls: stats(calls), triangles: stats(triangles), renderSize: [canvas.width, canvas.height],
            playerTriangles: Game.player.rig.modelInfo.tris, bossTriangles: Game.duel?.rig.modelInfo?.tris,
            ultra: ultraPost.info(), effects: ultraFx.info(), bossEffects: ultraBoss.info(),
            newProgramsDuringSample: renderer.info.programs.length - programStart, models: [...KIT.cache.keys()],
            postSize: [visuals.composer.renderTarget1.width, visuals.composer.renderTarget1.height] };
        }, { id, variant, quality, dpr });
        results.push(row); console.log(JSON.stringify({ id, variant, dpr, gpu: row.gpuMs.median, warm: row.warmMs, load: row.loadMs }));
        await page.screenshot({ path: path.join(output, `${variant}-${dpr}-${id}.png`) });
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ hardware, results, errors }, null, 2));
      }
      await context.close();
    }
  } finally { await browser.close(); }
  if (errors.length) throw new Error(JSON.stringify(errors));
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
