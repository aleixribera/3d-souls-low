'use strict';
// The player's name (PLAN.md "Next, small" 6), from empty storage: solo play never asks; opening online play asks once
// and the name shows in the party list; a reload joins with no ask; a rename in Options reaches a friend's party list at
// once; the pad spells it on its keyboard. Frames of the ask and the Options row, desktop and phone, in .scratch/name/.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('./browser.cjs');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true }), errors = [];
  const out = '.scratch/name'; fs.mkdirSync(out, { recursive: true });
  async function open(context) {
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    return page;
  }
  async function pad(page, button) {
    await page.evaluate(button => {
      const read = gamepad.read;
      try {
        gamepad.read = () => ({ buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === button, value: i === button ? 1 : 0 })), axes: [0, 0, 0, 0] });
        gamepad.poll(CONFIG.step);
        gamepad.read = () => ({ buttons: [], axes: [0, 0, 0, 0] }); gamepad.poll(CONFIG.step);
      } finally { gamepad.read = read; gamepad.release(); }
    }, button);
  }
  const asking = page => page.evaluate(() => nameAsk.isOpen);
  const partyNames = page => page.locator('#lobbyPlayers .lobby-player-name').allTextContents();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    // Sparred already (js/sparring.js sends a new player to the sparring scene first; the end checks that order).
    await context.addInitScript(() => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'bare', volume: 0 }));
      localStorage.setItem('combatArena.sparring', JSON.stringify({ done: true }));
    });
    let a = await open(context);
    assert.equal(await a.evaluate(() => progress.name), '', 'empty storage: no name yet');

    // Solo never asks: Story starts straight away.
    await a.evaluate(() => Game.menuItems[0].go());
    await a.waitForFunction(() => Game.mode === 'play' && Game.loading <= 0, null, { timeout: 90000 });
    assert.equal(await asking(a), false, 'Story never asks for a name');
    await a.evaluate(() => Game.showMenu('main'));

    // Online asks once, before joining.
    await a.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    assert.equal(await asking(a), true, 'opening online play with no name asks for one');
    assert.equal(await a.evaluate(() => multiplayer.connected), false, 'nothing joins before the name is given');
    assert.equal(await a.locator('#nameAskDone').isDisabled(), true, 'an empty name cannot join');
    assert.equal(await a.evaluate(() => document.activeElement.id), 'nameAskField', 'the field has the focus');
    await a.keyboard.type('Ser Vale');
    await a.screenshot({ path: `${out}/ask-desktop.png` });
    await a.setViewportSize({ width: 390, height: 780 });
    assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the ask fits a phone');
    await a.screenshot({ path: `${out}/ask-phone.png` });
    await a.setViewportSize({ width: 1280, height: 720 });
    await a.keyboard.press('Escape');
    assert.equal(await asking(a), false); assert.equal(await a.evaluate(() => progress.name), '', 'Escape keeps nothing');
    await a.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await a.keyboard.type('Ser Vale'); await a.keyboard.press('Enter');
    await a.waitForFunction(() => multiplayer.connected);
    assert.deepEqual(await partyNames(a), ['Ser Vale (you)'], 'the chosen name shows in the party list');
    await a.screenshot({ path: `${out}/lobby-desktop.png` });
    assert.equal(await a.locator('#publicLobby input').count(), 0, 'the lobby only shows the name');
    assert.equal(await a.evaluate(() => JSON.parse(localStorage.getItem('arena.progress')).name), 'Ser Vale', 'kept with the save');

    // A reload joins with no ask.
    await a.reload(); await a.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await a.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    assert.equal(await asking(a), false, 'never asked again');
    await a.waitForFunction(() => multiplayer.connected);
    assert.deepEqual(await partyNames(a), ['Ser Vale (you)']);

    // A friend who chose a name in an older build is never asked either.
    const friendContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await friendContext.addInitScript(() => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'bare', volume: 0 }));
      localStorage.setItem('combatArena.onlineName', 'Friend');
      localStorage.setItem('combatArena.sparring', JSON.stringify({ done: true }));
    });
    const b = await open(friendContext);
    await b.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    assert.equal(await asking(b), false, 'a name from the old lobby box counts as set');
    await b.waitForFunction(() => multiplayer.connected);
    await a.waitForFunction(() => multiplayer.info.players.some(p => p.name === 'Friend'));
    assert.ok(!(await partyNames(b)).some(n => /^Player \d/.test(n)), 'no made-up Player N');

    // Renamed in Options, from the lobby: the friend's party list shows it at once.
    await a.locator('#lobbyOptions').click();
    const row = a.locator('#menuSide .menuBtn.setting', { hasText: 'Name' });
    assert.equal(await row.locator('.v').textContent(), 'Ser Vale', 'the Name row shows the name');
    await a.screenshot({ path: `${out}/options-desktop.png` });
    await a.setViewportSize({ width: 390, height: 780 });
    await a.screenshot({ path: `${out}/options-phone.png` });
    await a.setViewportSize({ width: 1280, height: 720 });
    await row.click();
    assert.equal(await asking(a), true, 'the Name row opens the same ask');
    assert.equal(await a.locator('#nameAskDone').textContent(), 'EnterSave');
    await a.locator('#nameAskField').fill('Vale the Second'); await a.keyboard.press('Enter');
    assert.equal(await row.locator('.v').textContent(), 'Vale the Second', 'the row redraws with the new name');
    await b.waitForFunction(() => [...document.querySelectorAll('#lobbyPlayers .lobby-player-name')].some(n => n.textContent === 'Vale the Second'));

    // The pad: A on the row opens the keyboard, A types, X deletes, B cancels and keeps the old name.
    await pad(a, 0);
    assert.equal(await asking(a), true);
    assert.equal(await a.locator('#nameAskKeys').isVisible(), true, 'the pad gets the letter keys');
    assert.match(await a.locator('#nameAskHint').textContent(), /D-pad.*Move.*A.*Type.*X.*Delete/);
    await pad(a, 0); assert.equal(await a.locator('#nameAskField').inputValue(), 'Vale the SecondA', 'A types the focused letter');
    await pad(a, 13); await pad(a, 0); assert.equal(await a.locator('#nameAskField').inputValue(), 'Vale the SecondAK', 'down moves a row');
    await pad(a, 2); assert.equal(await a.locator('#nameAskField').inputValue(), 'Vale the SecondA', 'X deletes');
    await a.setViewportSize({ width: 390, height: 780 });
    assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the pad keyboard fits a phone');
    await a.screenshot({ path: `${out}/pad-phone.png` });
    await a.setViewportSize({ width: 1280, height: 720 });
    await pad(a, 1);
    assert.equal(await asking(a), false); assert.equal(await a.evaluate(() => progress.name), 'Vale the Second', 'B cancels');
    await pad(a, 0); await pad(a, 0); await pad(a, 9);
    assert.equal(await a.evaluate(() => progress.name), 'Vale the SecondA', 'Start keeps the name');
    await b.waitForFunction(() => multiplayer.info.players.some(p => p.name === 'Vale the SecondA'));

    // A brand-new player (truly empty storage) spars first; leaving the sparring scene goes on to the ask.
    const freshContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await freshContext.addInitScript(() => { if (!localStorage.getItem('combat-arena-3d.settings')) localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'bare', volume: 0 })); });
    const c = await open(freshContext);
    await c.getByRole('button', { name: 'Join public lobby', exact: false }).click();
    await c.waitForFunction(() => sparring.active(), null, { timeout: 90000 });
    assert.equal(await asking(c), false, 'no ask over the sparring scene');
    await c.evaluate(() => sparring.skip());
    assert.equal(await asking(c), true, 'after sparring, joining asks for the name');
    assert.equal(await c.evaluate(() => multiplayer.connected), false);
    await c.close();
    assert.deepEqual(errors, []);
    console.log('Name: solo never asks, online asks once, kept with the save, reload joins, Options renames live, pad keyboard, new players spar first passed.');
  } finally { await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
