'use strict';
// The current frames (docs/scorecard/now/, PLAN.md "Process first"): one latest frame per screen, the only place judges,
// reviewers and the director look. A pass that changes a screen retakes it here under the same name.
// Usage: node tools/now-frames.cjs [lobby|rush|crate|abilities ...]   (no part = all). One headless Edge, closed at the end.
//   lobby-desktop / lobby-phone   the lobby, Boss Rush chosen (Play in private a quiet footer entry, pass 161)
//   lobby-private-desktop / -phone  `private`: the lobby that can't be reached, Play in private its big button (pass 161)
//   rush-fight                    a Boss Rush run started from the lobby, its first boss attacking
//   crate-roll                    a crate's roll landing on its reward
//   abilities-desktop / -phone    the Abilities page (PLAN.md item 7) opened from the lobby: a few unlocked, one off;
//   abilities-phone-end           the phone page scrolled to its legendaries; abilities-locked: opened during a run
//   blade-*                       the blade commons' effects (pass 112) in the cel style, on the Pillager Captain
//   story-given-desktop / -phone  Story: Scarlet Draw given on the road, its toast and story-coloured key (pass 159)
//   cel-default-desktop / -phone  the default look (cel, no ?style=) in a Practice fight; cel-default-fight.mp4: 10 s of it
//   cel-enemy-<id>, cel-enemies.mp4  `enemies` (pass 162): four restyled enemies fought in the arena's ruins, 6 s each
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
  const open = async (w, h, crates = 0, save = null, query = '') => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    await page.addInitScript(([crates, save]) => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false }));
      localStorage.setItem('combatArena.onlineName', 'Wanderer');   // past the name prompt
      if (crates) localStorage.setItem('arena.progress', JSON.stringify({ xp: 0, crates, owned: [], runs: [] }));
      if (save) localStorage.setItem('arena.progress', JSON.stringify(save));
    }, [crates, save]);
    await page.goto(url + query); await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
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
    if (want('private')) for (const [w, h, tag] of [[1280, 720, 'desktop'], [390, 844, 'phone']]) {
      const page = await open(w, h); await page.route('**/api/lobby', route => route.abort());
      await page.evaluate(() => multiplayer.join());
      await page.locator('#lobbyPrivate').waitFor({ state: 'visible', timeout: 30000 }); await page.waitForTimeout(500);
      await shot(page, `lobby-private-${tag}`); await page.close();
      console.log('private', tag);
    }
    if (want('cel')) {
      // The default look (pass 155: cel with no ?style=): the Practice fight with the Pillager Captain, a bot at the
      // player's keys, on desktop and phone (HUD in), and 10 s of it as cel-default-fight.mp4.
      const fight = async page => page.evaluate(async () => {
        Game.startFight('pillagerCaptain');
        while (!(Game.player && Game.loading <= 0 && !Game.pendingLoad)) await new Promise(r => setTimeout(r, 100));
        const p = Game.player; p.maxHp = p.hp = 1e7; Game.worldWaiting = false;
        const brain = bot.create(BOT_PROFILES[0]); p.ctl = brain.hands;
        Game.moveInput = () => brain.think(CONFIG.step, p, Game.enemies.filter(e => e.alive()), [], projectiles.live(), null).mv;
      });
      for (const [w, h, tag] of [[1280, 720, 'desktop'], [390, 844, 'phone']]) {
        const page = await open(w, h);
        if (await page.evaluate(() => styleLab.style) !== 'cel') throw new Error('the page without ?style= is not cel');
        await fight(page); await page.waitForTimeout(3500);
        await page.waitForFunction(() => Game.enemies.some(e => e.alive() && e.attack), null, { timeout: 15000 }).catch(() => {});
        await shot(page, `cel-default-${tag}`); await page.close();
        console.log('cel', tag);
      }
      const dir = path.join(out, '.video'), t0 = Date.now();
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir, size: { width: 1280, height: 720 } } });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
      await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false })));
      await page.goto(url); await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
      await fight(page); await page.waitForTimeout(2000);
      const from = (Date.now() - t0) / 1000;
      await page.waitForTimeout(10500);
      const video = page.video(); await context.close();
      const raw = await video.path();
      require('node:child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', from.toFixed(2), '-i', raw, '-t', '10', '-an', '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', path.join(out, 'cel-default-fight.mp4')]);
      fs.rmSync(dir, { recursive: true, force: true });
      console.log('cel clip');
    }
    if (want('enemies')) {
      // (pass 162) the cel look carried to the enemies and the arena: a bot at the player's keys fights the Hollow Soldier,
      // the Undead Knight, the Empty Sentinel and the Executioner in turn among the arena's new ruins, 6 s each, as
      // cel-enemies.mp4, and a still of each fight as cel-enemy-<id>.jpg.
      const ids = ['hollow', 'knight', 'sentinel', 'executioner'];
      const dir = path.join(out, '.video'), t0 = Date.now(), cuts = [];
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir, size: { width: 1280, height: 720 } } });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
      await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false })));
      await page.goto(url); await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
      for (const id of ids) {
        await page.evaluate(async id => {
          Game.startFight(id);
          while (!(Game.player && Game.loading <= 0 && !Game.pendingLoad)) await new Promise(r => setTimeout(r, 100));
          document.getElementById('publicLobby')?.classList.add('hidden');
          const p = Game.player; p.maxHp = p.hp = 1e7; Game.worldWaiting = false; Game.setLock?.(Game.enemies[0]);
          const brain = bot.create(BOT_PROFILES[0]); p.ctl = brain.hands;
          Game.moveInput = () => brain.think(CONFIG.step, p, Game.enemies.filter(e => e.alive()), [], projectiles.live(), null).mv;
          for (const e of Game.enemies) e.hp = 1e6;   // the fight lasts the clip
        }, id);
        await page.waitForTimeout(1200); cuts.push((Date.now() - t0) / 1000);
        await page.waitForTimeout(3000); await shot(page, `cel-enemy-${id}`);
        await page.waitForTimeout(3000); cuts.push((Date.now() - t0) / 1000);
        console.log('enemy clip', id);
      }
      const video = page.video(); await context.close();
      const raw = await video.path(), parts = [];
      for (let i = 0; i < cuts.length; i += 2) parts.push(`[0:v]trim=${cuts[i].toFixed(2)}:${cuts[i + 1].toFixed(2)},setpts=PTS-STARTPTS[v${i / 2}]`);
      require('node:child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-filter_complex',
        parts.join(';') + ';' + ids.map((_, i) => `[v${i}]`).join('') + `concat=n=${ids.length}:v=1:a=0[o]`, '-map', '[o]', '-an', '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', path.join(out, 'cel-enemies.mp4')]);
      fs.rmSync(dir, { recursive: true, force: true });
      console.log('enemies clip');
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
    if (want('given')) for (const [w, h, tag] of [[1280, 720, 'desktop'], [390, 844, 'phone']]) {
      // Story's road (pass 159): Scarlet Draw given in the Sunken Keep, the toast and its key on the row, in the story colour.
      const page = await open(w, h);
      await page.evaluate(async () => {
        const key = CONFIG.story.saveKey; try { localStorage.removeItem(key); } catch (e) { /* none */ }
        __arena.story.jumpTo('sunken-keep');
        while (!(Game.player && Game.loading <= 0 && !Game.pendingLoad)) await new Promise(r => setTimeout(r, 100));
        Game.worldWaiting = false;
        for (const e of Game.enemies) if (e.alive()) e.x += 500;
        const G = Game.level.giveAbility, p = Game.player;
        p.x = p.px = (G.trigger[0] + G.trigger[1]) / 2; p.z = p.pz = (G.trigger[2] + G.trigger[3]) / 2; p.y = world.floorY(p.x, p.z, G.y ?? 0);
        p.yaw = p.pyaw = Game.cam.yaw;
      });
      await page.waitForTimeout(900);
      await shot(page, `story-given-${tag}`); await page.close();
      console.log('given', tag);
    }
    if (want('blades')) for (const [w, h, tag] of [[1280, 720, ''], [390, 844, '-phone']]) {
      // The blade commons (pass 112) in the cel style, on a Pillager Captain held 2.8 m ahead and to the right. The clock is stepped by
      // hand (Game.manualClock) so each frame is caught at the same moment of its effect every time.
      const page = await open(w, h);
      await page.evaluate(() => Game.startFight('pillagerCaptain'));
      await page.waitForFunction(() => Game.mode === 'play' && Game.player && Game.duel && !Game.loading, null, { timeout: 60000 });
      await page.waitForTimeout(800);
      await page.evaluate(() => {
        const p = Game.player, e = Game.duel; e.cooldown = 999; e.hp = e.maxHp = 1e6;
        p.grantAbilities(['spark-step', 'ember-lick', 'hot-iron', 'petal-cut', 'echo-step', 'dust-devil']);
        Game.manualClock = true; Game.worldWaiting = false;   // the world goes on without a key press
        window.__blade = (setup, steps) => {
          commonFx.clear(); abilityPowers.reset();
          for (let i = 0; i < 40; i++) Game.update(CONFIG.step);   // the last frame's hit glow gone
          e.x = e.px = p.x + Math.sin(p.yaw + 0.6) * 2.8; e.z = e.pz = p.z + Math.cos(p.yaw + 0.6) * 2.8; e.y = p.y; e.yaw = Math.atan2(p.x - e.x, p.z - e.z);
          setup(p, e);
          for (let i = 0; i < steps; i++) { Game.update(CONFIG.step); Game.render(1, CONFIG.step); }
          return JSON.stringify(commonFx.state);
        };
        window.__fire = when => abilityPowers.trigger('self', p, p.kit, when, { enemy: e });
      });
      const K = await page.evaluate(() => CONFIG.abilities.commons), STEP = 1 / 60;
      const past = (p, e) => {   // a dash past the boss's flank, ending beside it
        const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), side = e.radius + CONFIG.abilities.commons.pastGap * 0.5;
        p.dashFromX = e.x - fz * 2.4 - fx * side; p.dashFromZ = e.z + fx * 2.4 - fz * side;   // across the view, on the near side
        const tx = e.x + fz * 2.4 - fx * side, tz = e.z - fx * 2.4 - fz * side;
        const ox = p.x, oz = p.z; p.x = tx; p.z = tz; p.dashEnded(Game.enemies); p.x = ox; p.z = oz;
      };
      const frames = [
        ['cut-open', `() => __fire('dashStrike')`, Math.ceil(K.lateCut / STEP) + 12],
        ['whirl', `p => p.tookOff(Game.enemies)`, 9],
      ];
      if (!tag) frames.unshift(
        ['spark', `(${past})`, 7],
        ['lick', `() => __fire('stringEnd')`, 4],
        ['molten', `() => __fire('fullHeavy')`, 3],
        ['cut-hang', `() => __fire('dashStrike')`, 8],
        ['echo', `() => __fire('dodge')`, Math.ceil(K.imageDelay / STEP) + 3],
      );
      const states = {};
      for (const [name, setup, steps] of frames) {
        states[name] = await page.evaluate(([setup, steps]) => __blade(eval(setup), steps), [setup, steps]);
        await shot(page, `blade-${name}${tag}`);
      }
      console.log('blades', tag || 'desktop', JSON.stringify(states));
      await page.close();
    }
  } finally { await browser.close(); app.server.close(); }
  if (errors.length) { console.log('page errors:\n' + [...new Set(errors)].slice(0, 8).join('\n')); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exit(1); });
