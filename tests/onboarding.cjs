// Browser checks for fullscreen, the Story entry flow and readable lesson cards.
// NODE_PATH=<directory containing playwright> node tests/onboarding.cjs [output-directory]
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), out = path.resolve(process.argv[2] || path.join(root, '.scratch/onboarding'));
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') return res.writeHead(204).end();
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end();
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
    const obsoleteRequests = [];
    // Reproduce a blocked/missing standalone fullscreen file: startup must never request it.
    await page.route('**/js/fullscreen.js*', route => { obsoleteRequests.push(route.request().url()); return route.abort('blockedbyclient'); });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'high' })));
    await page.goto(`http://127.0.0.1:${server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady && window.__arena.tests, { timeout: 120000 });
    assert.deepEqual(obsoleteRequests, [], 'fullscreen adds no separate startup request');
    await page.getByRole('button', { name: 'Story', exact: true }).click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    assert.equal(await page.evaluate(() => Game.screen), 'story', 'first click both enters fullscreen and opens Story');
    await page.evaluate(() => document.exitFullscreen());
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await page.evaluate(() => !!document.fullscreenElement), false, 'leaving fullscreen is respected');
    await page.getByRole('button', { name: 'Options', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: /^Fullscreen:/ }).count(), 0, 'Options omits the fullscreen control');
    assert.equal(await page.evaluate(() => !!document.fullscreenElement), false, 'opening Options respects leaving fullscreen');
    // Prepare both saved campaigns, keeping all starting actions on the same screen.
    await page.evaluate(() => {
      Game.manualClock = true;
      for (const id of ['ashmere', 'lands']) { story.use(id); story.newGame(false); }
      Game.showMenu('main'); Game.showMenu('story');
      document.getElementById('loading').classList.remove('show');
    });
    const labels = await page.locator('#menuList .n').allTextContents();
    assert.deepEqual(labels, ['Continue', 'New', 'Continue', 'New', 'Back']);
    for (const [width, height] of [[1280, 720], [800, 600], [640, 480]]) {
      await page.setViewportSize({ width, height });
      const boxes = await page.locator('#menuList .menuBtn').evaluateAll(btns => btns.map(b => {
        const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
      }));
      assert.ok(boxes.every(b => b.x >= 0 && b.right <= width && b.y >= 0 && b.bottom <= height), 'all Story actions fit');
      await page.screenshot({ path: path.join(out, `story-${width}.png`) });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    // A real controller confirmation loads the selected campaign directly.
    await page.evaluate(() => {
      Game.select(Game.menuItems.findIndex(i => i.campaign === 'lands' && i.name === 'Continue'));
      gamepad.menuInput(['PadA'], CONFIG.step);
    });
    assert.ok(await page.evaluate(() => Game.mode === 'play' && Game.story && Game.level.id === 'stormhill'));
    // A new game needs only an overwrite confirmation; Cancel preserves it.
    await page.evaluate(() => { Game.showMenu('main'); Game.showMenu('story'); });
    const kept = await page.evaluate(() => localStorage.getItem(CONFIG.story.saveKeys.ashmere));
    await page.getByRole('button', { name: 'ASHMERE: New', exact: true }).click();
    assert.equal(await page.evaluate(() => Game.screen), 'storyConfirm');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem(CONFIG.story.saveKeys.ashmere)), kept);
    await page.getByRole('button', { name: 'ASHMERE: New', exact: true }).click();
    await page.getByRole('button', { name: 'New', exact: true }).click();
    // A new Ashmere game starts in Level 1 itself: the controls are taught there.
    assert.ok(await page.evaluate(() => Game.mode === 'play' && Game.story && Game.level.id === STORY.chapters[0].level && lessons.owns(Game)));
    // Lesson cards stay whole on screen, with their keys, on both input devices.
    for (const [id, device] of [['move', 'keyboard'], ['block', 'keyboard'], ['jumpAttack', 'keyboard'], ['rest', 'keyboard'], ['execute', 'pad'], ['block', 'pad']]) {
      await page.evaluate(({ id, device }) => {
        Game.manualClock = true; input.use(device);
        Game.loading = 0; document.getElementById('loading').classList.remove('show');
        lessons.show(id); Game.render(1, CONFIG.step);
      }, { id, device });
      assert.equal(await page.locator('#lessonKeys kbd').count() > 0, true, `${id} shows its keys`);
      for (const [width, height] of [[1280, 720], [640, 480], [375, 667]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(async () => {
          // Let viewport resize handlers finish before drawing with the manual test clock.
          await new Promise(requestAnimationFrame); resize(); Game.render(1, CONFIG.step);
        });
        const box = await page.locator('#lesson').boundingBox();
        await page.screenshot({ path: path.join(out, `${id}-${device}-${width}.png`), animations: 'disabled' });
        assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height, `whole instruction fits: ${id}/${device} ${width}x${height}: ${JSON.stringify(box)}`);
      }
    }
    assert.deepEqual(errors, []);
    console.log('Onboarding: native fullscreen, respected exit, simplified Options, Story mouse/controller flow, save protection and lesson card layouts passed.');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => server.close());
