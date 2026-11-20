'use strict';
// The counter's cue (PLAN.md item 3, rule 4), frame by frame: the same cue after a deflect and after a perfect dodge
// (the blade flashes, the window's marks), then the light counter landing and the boss reeling, its string broken.
// Usage: node tools/counter-cue-frames.cjs [outDir=docs/scorecard/now]. One headless Edge, closed at the end.
// Frames: counter-deflect-before, counter-deflect-cue, counter-dodge-cue, counter-lands, counter-reel.
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const out = process.argv[2] || path.join(__dirname, '..', 'docs', 'scorecard', 'now');
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 72 });

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    await page.addInitScript(() => {
      localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false }));
      localStorage.setItem('combatArena.onlineName', 'Wanderer');
    });
    await page.goto(url); await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
    await page.evaluate(() => { Game.startFight('pillagerCaptain'); });
    await page.waitForFunction(() => Game.player && Game.loading <= 0, null, { timeout: 120000 });
    await page.waitForTimeout(1500);
    // A manual clock, as the in-page tests drive the game (tests/suite.js `sim`): steps, keys, a render after each.
    await page.evaluate(() => {
      const STEP = CONFIG.step; let clock = 1000;
      Game.manualClock = true; input.now = () => clock; Game.moveInput = () => ({ x: 0, z: 0, has: false });
      Game.worldWaiting = false; input.clear();
      const p = Game.player; p.maxHp = p.hp = 1e6;
      window.__cue = {
        step(n = 1) { for (let i = 0; i < n; i++) { clock += STEP; Game.update(STEP); Game.render(1, STEP); } },
        until(fn, s = 4) { for (let i = 0; i < s / STEP; i++) { if (fn()) return true; this.step(); } return fn(); },
        press(a) { const c = ACTIONS[a][0]; input.down(c); input.up(c); },
        faceOff(d) {
          const e = Game.duel; e.x = e.px = p.x + Math.sin(p.yaw) * d; e.z = e.pz = p.z + Math.cos(p.yaw) * d; e.y = p.y;
          e.yaw = Math.atan2(p.x - e.x, p.z - e.z); Game.setLock?.(e); Game.updateCamera(0, true);
        },
        opens: 0,
      };
      events.on('counterOpen', d => { if (d.player === p) window.__cue.opens++; });
    });
    // A deflect of the string's first blow: the window opens while the string would go on.
    const deflect = await page.evaluate(() => {
      const c = __cue, e = Game.duel, combo = e.def.attacks.find(a => a.hits.length === 3 && !a.noParry);
      c.faceOff(2); c.step(30); e.beginAttack(combo);
      c.until(() => e.state === ES.WINDUP && !(e.holdLeft > 0) && e.stateTime >= combo.hits[0].startup - 0.2);
      return combo.id;
    });
    await shot(page, 'counter-deflect-before');
    const opened = await page.evaluate(() => {
      const c = __cue, e = Game.duel, a = e.attack;
      c.until(() => e.stateTime >= a.hits[0].startup - 0.08); c.press('block');
      c.until(() => c.opens > 0, 0.5); c.step(4);
      return { opens: c.opens, riposte: Game.player.riposte, state: e.state, hit: e.hitIndex };
    });
    await shot(page, 'counter-deflect-cue');
    // The light counter through the open window: it lands mid-string, the boss reels and the string never resumes.
    const landed = await page.evaluate(() => {
      const c = __cue, e = Game.duel, p = Game.player, a = e.attack, no = e.attackNo;
      c.press('light'); c.until(() => p.state === PS.ATTACK, 0.5);
      c.until(() => e.state === ES.PARRIED, 1); c.step(3);
      return { attack: p.attack && p.attack.id, state: e.state, cracks: e.cracks, a: a && a.id, no };
    });
    await shot(page, 'counter-lands');
    const reel = await page.evaluate(no => {
      const c = __cue, e = Game.duel; let resumed = false;
      for (let i = 0; i < 90; i++) { c.step(); if (e.attackNo === no && e.state === ES.ACTIVE) resumed = true; }
      return { state: e.state, resumed };
    }, landed.no);
    await shot(page, 'counter-reel');
    // A perfect dodge of a single blow: the same cue.
    const dodge = await page.evaluate(() => {
      const c = __cue, e = Game.duel, p = Game.player, one = e.def.attacks.find(a => a.id === 'captainOverhead');
      c.until(() => p.isFree() && e.state !== ES.PARRIED, 3); e.cooldown = 0; c.until(() => e.state === ES.CHASE, 4);
      c.faceOff(1.6); c.opens = 0; e.beginAttack(one);
      c.until(() => e.state === ES.WINDUP && !(e.holdLeft > 0) && e.stateTime >= one.hits[0].startup - 0.04);
      c.press('roll'); c.until(() => c.opens > 0, 0.5); c.step(4);
      return { opens: c.opens, riposte: p.riposte };
    });
    await shot(page, 'counter-dodge-cue');
    console.log(JSON.stringify({ deflect, opened, landed, reel, dodge }));
    await page.close();
  } finally { await browser.close(); app.server.close(); }
  if (errors.length) { console.log('page errors:\n' + [...new Set(errors)].slice(0, 8).join('\n')); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exit(1); });
