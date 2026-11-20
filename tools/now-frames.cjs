'use strict';
// The current frames (docs/scorecard/now/, PLAN.md "Process first"): one latest frame per screen, the only place judges,
// reviewers and the director look. A pass that changes a screen retakes it here under the same name.
// Usage: node tools/now-frames.cjs [lobby|rush|crate|abilities ...]   (no part = all). One headless Edge, closed at the end.
//   lobby-desktop / lobby-phone   the lobby, Boss Rush chosen
//   rush-fight                    a Boss Rush run started from the lobby, its first boss attacking
//   crate-roll                    a crate's roll landing on its reward
//   abilities-desktop / -phone    the Abilities page (PLAN.md item 7) opened from the lobby: a few unlocked, one off;
//   abilities-phone-end           the phone page scrolled to its legendaries; abilities-locked: opened during a run
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const out = path.join(__dirname, '..', 'docs', 'scorecard', 'now');
const parts = process.argv.slice(2), want = p => !parts.length || parts.includes(p);
const shot = (page, name, clip) => page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 70, clip });

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const open = async (w, h, crates = 0, save = null) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    await page.addInitScript(([crates, save]) => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false }));
      localStorage.setItem('combatArena.onlineName', 'Wanderer');   // past the name prompt
      if (crates) localStorage.setItem('arena.progress', JSON.stringify({ xp: 0, crates, owned: [], runs: [] }));
      if (save) localStorage.setItem('arena.progress', JSON.stringify(save));
    }, [crates, save]);
    await page.goto(url); await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    return page;
  };
  const joinLobby = async page => {
    await page.evaluate(() => multiplayer.join());
    await page.waitForFunction(() => !document.getElementById('lobbyLeader').hidden, null, { timeout: 30000 });
    await page.waitForTimeout(800);
  };
  try {
    if (want('lobby')) for (const [w, h, tag] of [[1280, 720, 'desktop'], [390, 844, 'phone']]) {
      const page = await open(w, h); await joinLobby(page); await shot(page, `lobby-${tag}`); await page.close();
      console.log('lobby', tag);
    }
    if (want('rush')) {
      const page = await open(1280, 720); await joinLobby(page);
      await page.evaluate(() => { const s = document.getElementById('lobbyAdventure'); s.value = 'calling/boss-rush'; s.dispatchEvent(new Event('change', { bubbles: true })); });
      await page.locator('#lobbyStart').click();
      await page.waitForFunction(() => multiplayer.info.ready && multiplayer.info.receivedFrames > 2, null, { timeout: 90000 });
      await page.waitForTimeout(1500);
      // The opening card offer: pick the first card and confirm it (v7.160), as a player would.
      if (await page.locator('#abilityConfirm').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)) {
        await page.locator('button.bcard').first().click();
        await page.locator('#abilityConfirm').click();
        await page.locator('#abilityConfirm').waitFor({ state: 'hidden', timeout: 15000 });
      }
      // The world waits for the player (v7.160): a step forward wakes it.
      await page.keyboard.down('w'); await page.waitForTimeout(600); await page.keyboard.up('w');
      await page.waitForTimeout(3500);
      await shot(page, 'rush-fight'); await page.close();
      console.log('rush');
    }
    if (want('crate')) {
      const page = await open(1280, 720, 1);
      const rolled = await page.evaluate(() => crateScreen.roll());
      if (!rolled) throw new Error('no crate to open');
      await page.waitForFunction(() => !crateScreen.rolling, null, { timeout: 20000 });
      await page.waitForTimeout(600);
      await shot(page, 'crate-roll'); await page.close();
      console.log('crate');
    }
    if (want('abilities')) {
      // Three unlocked past the starter set, one common turned off, two crates waiting, level 4.
      const save = { v: 2, xp: 1000, crates: 2, owned: ['keen-edge', 'iron-blood', 'breaker', 'keen-eye', 'light-step', 'quick-draught', 'fire-burst',
        'mending', 'grave-hound', 'counterstep', 'thunder-call', 'time-rift', 'cold-riposte', 'bastion', 'pyre'], off: ['quick-draught'], counted: [], name: 'Wanderer' };
      for (const [w, h, tag] of [[1280, 720, 'desktop'], [390, 844, 'phone']]) {
        const page = await open(w, h, 0, save); await joinLobby(page);
        await page.locator('#lobbyCollection').click(); await page.waitForTimeout(500);
        await shot(page, `abilities-${tag}`);
        if (tag === 'desktop') {   // the toggles: on, off, then refused at the minimum with the reason shown
          const t = id => page.locator(`#crates .ctile[data-ability="${id}"]`);
          await t('quick-draught').click(); await t('keen-edge').click(); await t('iron-blood').click();
          const got = await page.evaluate(() => ({ active: progress.active(), note: document.getElementById('cratesNote').textContent }));
          if (!got.active.includes('quick-draught') || got.active.includes('keen-edge') || !got.active.includes('iron-blood') || !/at least 6 commons/.test(got.note))
            throw new Error('the toggles: ' + JSON.stringify(got));
          await shot(page, 'abilities-toggled');
        }
        if (tag === 'phone') { await page.evaluate(() => document.getElementById('crates').scrollTo(0, 1e5)); await page.waitForTimeout(300); await shot(page, 'abilities-phone-end'); }
        await page.close(); console.log('abilities', tag);
      }
      const page = await open(1280, 720, 0, save); await joinLobby(page);
      await page.locator('#lobbyStart').click();
      await page.waitForFunction(() => multiplayer.info.ready, null, { timeout: 90000 });
      await page.waitForTimeout(1500); await page.evaluate(() => multiplayer.show());   // the lobby over the run, as Escape opens it
      await page.locator('#lobbyCollection').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('#lobbyCollection').click(); await page.waitForTimeout(500);
      if (!await page.evaluate(() => [...document.querySelectorAll('#crates .ctile[aria-pressed]')].every(b => b.disabled))) throw new Error('the Abilities page is not locked during a run');
      await shot(page, 'abilities-locked'); await page.close(); console.log('abilities locked');
    }
    if (want('touches')) {
      // The plain commons' touches (pass 109) in a Practice fight with the Pillager Captain held back: all eight held.
      const page = await open(1280, 720);
      await page.evaluate(() => Game.startFight('pillagerCaptain'));
      await page.waitForFunction(() => Game.mode === 'play' && Game.player && Game.duel && !Game.loading, null, { timeout: 60000 });
      await page.evaluate(() => {
        const p = Game.player, e = Game.duel; e.cooldown = 999;
        p.grantAbilities(['keen-edge', 'iron-blood', 'iron-blood', 'light-step', 'quick-draught', 'breaker', 'keen-eye', 'cold-riposte', 'headsman']);
        p.yaw = Math.atan2(e.x - p.x, e.z - p.z);
      });
      await page.waitForTimeout(800);
      const ink = await page.evaluate(() => {
        const p = Game.player, e = Game.duel, at = { x: e.x, y: e.y + e.height * 0.6, z: e.z };
        events.emit('strike', { attacker: p, target: e, strike: { riposte: true, damage: 1 }, at });
        events.emit('finisher', { player: p, enemy: e, damage: 1, lethal: false, at, exit: at });
        return abilityTouch.state;
      });
      await page.waitForTimeout(160); await shot(page, 'touch-ink-frost', { x: 400, y: 120, width: 480, height: 300 });
      await shot(page, 'touch-iron-hud', { x: 30, y: 25, width: 360, height: 80 });
      await page.evaluate(() => { Game.player.dashes = 1.99; }); await page.waitForTimeout(110); await shot(page, 'touch-feather', { x: 440, y: 300, width: 400, height: 380 });
      await page.keyboard.press('j'); await page.waitForTimeout(230); await shot(page, 'touch-glint', { x: 440, y: 160, width: 400, height: 400 });
      await page.close(); console.log('touches', JSON.stringify(ink));
    }
  } finally { await browser.close(); app.server.close(); }
  if (errors.length) { console.log('page errors:\n' + [...new Set(errors)].slice(0, 8).join('\n')); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exit(1); });
