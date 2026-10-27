'use strict';
// Actual keyboard, focus, pointer-capture and layout regressions for the experience audit.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  let browser;
  const output = '.scratch/experience'; fs.mkdirSync(output, { recursive: true });
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0,
      fps: false, hitboxes: false, cameraMotion: true, screenShake: false })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.evaluate(() => { Game.manualClock = true; fullscreen.attempted = true; });
    await page.waitForFunction(() => /\d+ FPS/.test(document.getElementById('fpsCounter').textContent));
    assert.equal(await page.locator('#fpsCounter').isVisible(), true, 'FPS is visible despite an old saved Off preference');
    await page.keyboard.press('F3');
    assert.equal(await page.locator('#fpsCounter').isVisible(), true, 'the retired FPS shortcut cannot hide the counter');
    assert.equal(await page.evaluate(() => settings.cameraMotion), false, 'legacy shake Off migrates to combined motion Off');
    const selection = () => page.evaluate(() => ({ selected: Game.selected,
      focus: [...document.querySelector('#menuList').children].indexOf(document.activeElement),
      stops: document.querySelectorAll('#menuList button[tabindex="0"]').length }));
    assert.deepEqual(await selection(), { selected: 0, focus: 0, stops: 1 });
    await page.keyboard.press('Tab');
    assert.deepEqual(await selection(), { selected: 1, focus: 1, stops: 1 });
    await page.keyboard.press('Shift+Tab');
    assert.deepEqual(await selection(), { selected: 0, focus: 0, stops: 1 });
    await page.keyboard.press('Shift+Tab');
    assert.equal((await selection()).selected, await page.locator('#menuList button').count() - 1, 'backward Tab wraps');
    await page.evaluate(() => { Game.optionsFrom = 'main'; Game.showMenu('options'); });
    assert.deepEqual(await page.locator('#menuList .n').allTextContents(),
      ['Camera motion: Off', 'Lessons: On', 'Show lessons again', 'Graphics: Low', 'Check graphics again', 'Back']);
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => settings.cameraMotion), true, 'Space activates the focused option exactly once');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => settings.cameraMotion), false);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => settings.cameraMotion), true);
    assert.deepEqual(await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      return { cameraMotion: saved.cameraMotion, legacyShake: 'screenShake' in saved };
    }), { cameraMotion: true, legacyShake: false }, 'saving the unified option retires the old shake preference');
    await page.keyboard.press('ArrowDown');
    assert.deepEqual(await selection(), { selected: 1, focus: 1, stops: 1 });
    await page.keyboard.press('End');
    assert.equal((await selection()).selected, await page.locator('#menuList button').count() - 1);
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => {
      const key = new KeyboardEvent('keydown', { code: 'KeyJ', ctrlKey: true, bubbles: true, cancelable: true });
      window.dispatchEvent(key); return key.defaultPrevented;
    }), false, 'browser shortcuts are left to the browser');
    assert.equal(await page.evaluate(() => settings.graphics), 'low', 'shortcut never activates a menu item');
    const motionOption = page.getByRole('button', { name: /^Camera motion:/ });
    await motionOption.hover({ position: { x: 100, y: 18 } });
    await motionOption.hover({ position: { x: 102, y: 18 } });
    const hovered = await selection();
    assert.equal(hovered.focus, hovered.selected, 'actual pointer movement keeps native focus with selection');
    assert.match(await page.evaluate(() => Game.menuItems[Game.selected].name), /^Camera motion:/);
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => settings.cameraMotion), false, 'Space activates the hovered selection too');

    // Check every item, not just the first description: graphics and campaign text wrap more than simple options.
    for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 },
      { width: 800, height: 600 }, { width: 844, height: 390 }, { width: 640, height: 360 },
      { width: 390, height: 740 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      for (const screen of ['main', 'story', 'options', 'arena', 'levelsLands', 'storyConfirm', 'storyDone']) {
        const issues = await page.evaluate(screen => {
          Game.optionsFrom = 'main'; Game.showMenu(screen);
          const issues = [], box = id => document.getElementById(id).getBoundingClientRect();
          for (let i = 0; i < Game.menuItems.length; i++) {
            Game.select(i, true);
            const list = box('menuList'), desc = box('menuDesc'), hint = box('menuHint'), title = box('menuTitle');
            const button = document.getElementById('menuList').children[i].getBoundingClientRect();
            if (desc.bottom > hint.top - 4) issues.push(`${i}: description overlaps navigation`);
            if (list.bottom > desc.top || title.bottom > list.top) issues.push(`${i}: menu regions overlap`);
            if (title.left < 0 || title.right > innerWidth || hint.bottom > innerHeight - 15) issues.push(`${i}: text leaves viewport`);
            if (button.left < 0 || button.right > innerWidth || button.bottom > list.bottom + 1 || button.top < list.top - 1)
              issues.push(`${i}: selected action is clipped`);
          }
          return issues;
        }, screen);
        assert.deepEqual(issues, [], `${screen} at ${viewport.width} × ${viewport.height}`);
      }
      await page.evaluate(() => { Game.optionsFrom = 'main'; Game.showMenu('options'); Game.select(1, true); });
      await page.screenshot({ path: `${output}/options-${viewport.width}.png`, animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => {
      Game.startFight('hollow'); Game.loading = 0; document.getElementById('loading').classList.remove('show');
      input.down('KeyW'); input.down('KeyJ'); Game.player.buffer = { action: 'light', time: 0.3 };
      gamepad.move = { x: 1, y: 0 }; gamepad.down.add('PadRB');
      window.dispatchEvent(new Event('blur'));
    });
    assert.deepEqual(await page.evaluate(() => ({ mode: Game.mode, held: input.held.size, pressed: input.pressed.size,
      queued: Game.player.buffer, suspended: input.suspended, movement: gamepad.move.x })),
    { mode: 'pause', held: 0, pressed: 0, queued: null, suspended: true, movement: 0 });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    assert.equal(await page.evaluate(() => Game.mode), 'pause', 'refocusing never resumes combat by itself');
    assert.equal(await page.evaluate(() => {
      const read = gamepad.read;
      try {
        gamepad.read = () => ({ buttons: [1], axes: [0, 0, 0, 0] }); gamepad.poll(CONFIG.step);
        return Game.mode;
      } finally { gamepad.read = read; gamepad.release(); }
    }), 'pause', 'a controller button held while away cannot resume play');
    await page.keyboard.press('Enter');

    assert.equal(await page.evaluate(() => hud.showHitboxes()), false, 'hitboxes are hidden during normal play');
    await page.keyboard.press('F1');
    assert.equal(await page.evaluate(() => hud.showHitboxes()), true, 'F1 help always shows hitboxes despite an old Off preference');
    await page.keyboard.press('h');
    assert.equal(await page.evaluate(() => hud.showHitboxes()), true, 'the retired hitbox shortcut cannot disable F1 hitboxes');
    await page.keyboard.press('F1');
    assert.equal(await page.evaluate(() => hud.showHitboxes()), false, 'closing F1 hides hitboxes again');
    assert.equal(await page.evaluate(() => Game.mode), 'play');
    await page.evaluate(() => {
      Game.player.buffer = { action: 'roll', time: 0.3 }; Game.pause(false);
    });
    assert.equal(await page.evaluate(() => Game.player.buffer), null, 'manual pause cancels pending actions too');
    await page.keyboard.press('Enter');

    // Promise-based pointer lock can fail asynchronously (embedded/restricted browsers).
    await page.evaluate(() => {
      canvas.requestPointerLock = () => Promise.reject(new Error('Pointer capture refused'));
      canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
    assert.equal(await page.evaluate(() => input.peek('light')), false, 'the capture click never attacks');
    await page.evaluate(() => canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 })));
    assert.equal(await page.evaluate(() => input.peek('light')), true, 'next click attacks after capture is refused');
    await page.evaluate(() => { input.clear(); canvas.dispatchEvent(new MouseEvent('mouseup', { button: 0 })); });

    const steady = await page.evaluate(() => {
      settings.cameraMotion = false;
      Game.shake = 0; Game.addShake(1, 1); const refused = Game.shake === 0;
      Game.shake = Game.shakeDur = 1; Game.shakeAmp = 2; Game.render(1, CONFIG.step);
      const steady = camera.position.distanceTo(Game.cam.pos) < 0.000001;
      settings.cameraMotion = true; Game.shake = 0; Game.addShake(1, 1);
      const enabled = Game.shake === 1;
      Game.shake = 0;
      return { refused, steady, enabled };
    });
    assert.deepEqual(steady, { refused: true, steady: true, enabled: true });

    // Inspect the actual game at each quality; these captures retain the established art direction.
    for (const quality of ['low', 'high', 'ultra']) {
      await page.evaluate(quality => {
        settings.graphics = quality; applySettings(); Game.startLevel('stormhill'); Game.loading = 0;
        document.getElementById('loading').classList.remove('show');
        for (let i = 0; i < 30; i++) Game.update(CONFIG.step);
        Game.render(1, CONFIG.step);
      }, quality);
      await page.screenshot({ path: `${output}/stormhill-${quality}.png` });
      assert.deepEqual(await page.evaluate(() => { const gl = renderer.getContext(); gl.finish();
        return { lost: gl.isContextLost(), error: gl.getError() }; }), { lost: false, error: 0 });
    }
    await page.evaluate(() => { settings.graphics = 'low'; applySettings(); Game.showMenu('main'); Game.manualClock = false; });
    await page.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await page.waitForFunction(() => multiplayer.connected);
    await page.locator('#lobbyStart').click();
    await page.waitForFunction(() => multiplayer.info.ready && Game.loading <= 0 && !multiplayer.runIntroActive, null, { timeout: 90000 });
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await page.evaluate(() => Game.mode), 'play', 'focus loss never pauses the shared online world');
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); multiplayer.leave(); });
    assert.deepEqual(errors, [], 'no browser exceptions or rejected pointer-lock promises');
    console.log('Experience browser: keyboard focus/Tab/Space, shortcuts, seven responsive layouts, safe pause, pointer-lock recovery, camera comfort, three graphics presets and online focus passed.');
  } finally { if (browser) await browser.close(); await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
