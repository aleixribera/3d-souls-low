'use strict';
// A real delayed asset must recover; a genuinely missing script must remain an error.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('./browser.cjs');
const root = path.resolve(process.env.STARTUP_ROOT || path.join(__dirname, '..'));
const out = path.join(__dirname, '../.scratch/startup');
const baseline = process.argv.includes('--baseline');
const server = http.createServer((req, res) => {
  const name = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!name.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(name, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' }[path.extname(name)];
    res.writeHead(200, { 'Content-Type': type || 'application/octet-stream' }); res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  fs.mkdirSync(out, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.ARENA_EDGE_PATH
      ? { executablePath: process.env.ARENA_EDGE_PATH } : { channel: 'msedge' }) });
    const url = `http://127.0.0.1:${server.address().port}/combat-arena-3d.html#dev`;
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    let requestedReplay = false;
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/js/replay.js')) requestedReplay = true; });
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'bare', volume: 0 })));
    await page.routeWebSocket('**', socket => socket.close());
    let release;
    const delayed = new Promise(resolve => { release = resolve; });
    await page.route('**/js/baked/snow-church.js*', async route => { await delayed; await route.continue(); });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('#bootError:not(.hidden)').waitFor({ timeout: 20000 });
    const slowText = await page.locator('#bootError .msg').textContent();
    await page.screenshot({ path: path.join(out, baseline ? 'before-slow.png' : 'slow.png') });
    release();
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.evaluate(() => { Game.manualClock = true; });
    await page.screenshot({ path: path.join(out, baseline ? 'before-ready.png' : 'ready.png') });
    const visible = await page.locator('#bootError').isVisible();
    if (baseline) {
      assert.equal(visible, true, 'reproduce: successful boot leaves the timeout error covering the title');
      console.log('REPRODUCED: ready game still covered by timeout error:', slowText);
      return;
    }
    assert.match(slowText, /Still loading/);
    assert.equal(visible, false, 'slow-loading status clears when ready');
    assert.equal(requestedReplay, false, 'the title does not fetch the replay viewer');
    await page.waitForFunction(() => !!window.__arena.tests, null, { timeout: 20000 });
    await page.setViewportSize({ width: 360, height: 740 });
    await page.screenshot({ path: path.join(out, 'ready-phone.png') });
    await page.close();
    const failed = await browser.newPage({ viewport: { width: 360, height: 740 } });
    await failed.routeWebSocket('**', socket => socket.close());
    await failed.route('**/js/baked/snow-church.js*', route => route.abort());
    await failed.goto(url, { waitUntil: 'domcontentloaded' });
    await failed.waitForFunction(() => window.__bootShown, null, { timeout: 30000 });
    assert.match(await failed.locator('#bootError .msg').textContent(), /snow-church\.js/);
    await failed.evaluate(() => window.__bootComplete());
    assert.equal(await failed.locator('#bootError').isVisible(), true, 'completion never hides an actual failure');
    assert.match(await failed.locator('#bootError .msg').textContent(), /snow-church\.js/);
    await failed.screenshot({ path: path.join(out, 'failed-phone.png') });
    console.log('PASS: slow asset recovers, dev tests load, real failed asset remains named, desktop/phone captured');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
