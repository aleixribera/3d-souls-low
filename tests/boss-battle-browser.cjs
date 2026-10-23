'use strict';
// Real menu actions plus the fixed-step boss combat, projectiles, phases and spectator presentation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
(async () => {
  const app = createServer({ dev: true }), errors = [];
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  let browser;
  const output = '.scratch/boss-battle'; fs.mkdirSync(output, { recursive: true });
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'low', volume: 0 })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html#dev`);
    await page.waitForFunction(() => window.__arenaReady && window.__arena.tests, null, { timeout: 120000 });
    await page.evaluate(() => { Game.manualClock = true; fullscreen.attempted = true; });
    await page.getByRole('button', { name: '1v1 Arena', exact: true }).click();
    await page.getByRole('button', { name: 'Boss vs Boss', exact: true }).click();
    const start = page.getByRole('button', { name: 'Start battle', exact: true });
    assert.equal(await start.getAttribute('aria-disabled'), 'true', 'empty teams cannot start');
    const catalog = await page.evaluate(() => bossBattle.catalog().map(d => ({ id: d.id, name: d.name })));
    assert.equal(catalog.length, 12, 'all four Ashmere and eight Elden Ring bosses are available');
    for (const team of ['Team 1', 'Team 2']) {
      await page.getByRole('button', { name: `Add boss to ${team}`, exact: true }).click();
      await page.getByRole('button', { name: catalog[0].name, exact: true }).click();
    }
    assert.equal(await start.getAttribute('aria-disabled'), null);
    for (let i = 1; i < 6; i++) {
      await page.getByRole('button', { name: 'Add boss to Team 1', exact: true }).click();
      await page.getByRole('button', { name: catalog[0].name, exact: true }).click();
    }
    assert.equal(await page.getByRole('button', { name: 'Add boss to Team 1', exact: true }).getAttribute('aria-disabled'), 'true');
    assert.equal(await page.evaluate(id => bossBattle.add('a', id), catalog[0].id), false, 'the API enforces the six-boss limit too');
    await page.getByRole('button', { name: `Remove ${catalog[0].name} from Team 1`, exact: true }).first().click();
    assert.equal(await page.evaluate(() => bossBattle.teams.a.length), 5, 'one duplicate is removed independently');
    // Put every boss in the same match, exercising all of their normal AI and rendering paths.
    await page.evaluate(() => {
      bossBattle.teams = { a: [], b: [] };
      bossBattle.catalog().forEach((d, i) => bossBattle.add(i < 6 ? 'a' : 'b', d.id));
      Game.showMenu('bossBattle');
    });
    await page.screenshot({ path: `${output}/teams.png` });
    for (const viewport of [{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 390, height: 740 }]) {
      await page.setViewportSize(viewport);
      const clipped = await page.evaluate(() => {
        const bad = [];
        for (let i = 0; i < Game.menuItems.length; i++) {
          Game.select(i, true);
          const r = $('menuList').children[i].getBoundingClientRect(), list = $('menuList').getBoundingClientRect();
          if (r.left < 0 || r.right > innerWidth || r.top < list.top - 1 || r.bottom > list.bottom + 1) bad.push(Game.menuItems[i].name);
        }
        return bad;
      });
      assert.deepEqual(clipped, [], `team builder fits ${viewport.width} × ${viewport.height}`);
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await start.click();
    const fight = await page.evaluate(() => {
      Game.loading = 0; $('loading').classList.remove('show');
      const attacks = new Set(), struck = new Set(), hp = Game.player.hp;
      const na = (events.handlers.attackStart || []).length, ns = (events.handlers.strike || []).length;
      events.on('attackStart', d => attacks.add(d.enemy.baseDef.id));
      events.on('strike', d => { if (d.attacker.team) {
        if (d.target.team === d.attacker.team || d.target === Game.player) throw new Error('Friendly fire or spectator hit');
        struck.add(d.target.baseDef.id);
      } });
      for (let i = 0; i < 90 * 60 && !bossBattle.winner; i++) Game.update(CONFIG.step);
      Game.render(1, CONFIG.step);
      events.handlers.attackStart.length = na; events.handlers.strike.length = ns;
      return { count: Game.enemies.length, attacks: [...attacks], struck: [...struck], spectatorSafe: hp === Game.player.hp,
        targets: Game.enemies.every(e => !e.battleTarget || e.battleTarget.team !== e.team),
        finite: Game.enemies.every(e => [e.x, e.y, e.z, e.yaw].every(Number.isFinite)),
        hidden: !Game.player.rig.root.visible && !Game.player.rig.shadow.visible };
    });
    assert.equal(fight.count, 12); assert.equal(fight.attacks.length, 12, `every boss attacks: ${fight.attacks}`);
    assert.ok(fight.struck.length >= 8, `bosses take real damage: ${fight.struck}`);
    assert.ok(fight.spectatorSafe && fight.targets && fight.finite && fight.hidden, JSON.stringify(fight));
    await page.waitForFunction(() => getComputedStyle($('loading')).opacity === '0');
    await page.screenshot({ path: `${output}/battle.png` });
    assert.equal(await page.locator('.battle-health').count(), 12);
    assert.equal(await page.locator('.eTag[data-team="a"]').first().evaluate(el => getComputedStyle(el).overflow), 'visible', 'boss names above team health bars are visible');
    console.log('Team UI, add/remove/duplicates, cap, responsive layout, all 12 boss AIs and spectator rendering passed.');

    const natural = await page.evaluate(() => {
      bossBattle.teams = { a: [], b: [] }; bossBattle.add('a', 'giant'); bossBattle.add('b', 'pillagerCaptain');
      if (!bossBattle.start(Game)) throw new Error('Natural duel setup rejected'); Game.loading = 0;
      for (let i = 0; i < 900 * 60 && !bossBattle.winner; i++) Game.update(CONFIG.step);
      return { winner: bossBattle.winner, survivors: Game.enemies.filter(e => e.alive()).length };
    });
    assert.ok(natural.winner && natural.survivors === 1, JSON.stringify(natural));
    console.log('An unassisted boss duel reaches a last-team-standing victory through real damage.');

    const mechanics = await page.evaluate(() => {
      const set = (a, b) => {
        bossBattle.teams = { a: [], b: [] }; a.forEach(id => bossBattle.add('a', id)); b.forEach(id => bossBattle.add('b', id));
        bossBattle.start(Game); Game.loading = 0; $('loading').classList.remove('show');
      };
      set(['giant', 'giant'], ['giant', 'giant']);
      const [a, ally, b, extra] = Game.enemies;
      a.x = 0; a.z = 0; a.yaw = Math.PI / 2; ally.x = b.x = 1; ally.z = b.z = 0; extra.x = 10;
      const attack = a.def.attacks.find(x => !x.projectile), strike = makeStrike(attack);
      a.hitbox = new Hitbox(a, { w: 8, h: 8, d: 8, y: 2, fwd: 0 }, strike);
      const ah = ally.hp, bh = b.hp;
      resolveTeamCombat(Game); const damaged = b.hp < bh, friendly = ally.hp === ah, once = b.hp;
      resolveTeamCombat(Game); const single = b.hp === once;
      b.deplete(); Game.hitstop = 0; Game.update(CONFIG.step);
      const retargeted = a.battleTarget === extra;

      set(['malenia'], ['giant']);
      const [m, g] = Game.enemies; m.hp -= 200; g.x = m.x + 1; g.z = m.z;
      const mh = m.hp; m.hitbox = new Hitbox(m, { w: 8, h: 8, d: 8, y: 2, fwd: 0 }, makeStrike(m.def.attacks[0]));
      resolveTeamCombat(Game); const lifesteal = m.hp > mh;
      m.deplete(); Game.hitstop = 0; Game.update(CONFIG.step);
      const phaseLives = m.alive() && m.state === ES.PHASE && !bossBattle.winner;
      const phaseHp = m.hp; g.hitbox = new Hitbox(g, { w: 30, h: 20, d: 30, y: 2, fwd: 0 }, makeStrike(g.def.attacks[0]));
      resolveTeamCombat(Game); const phaseSafe = m.hp === phaseHp;
      g.hitbox = null;
      for (let i = 0; i < 360; i++) { Game.hitstop = 0; Game.update(CONFIG.step); }
      const phaseResumed = m.alive() && m.hp > 0 && m.state !== ES.PHASE;

      set(['margit', 'giant'], ['giant', 'giant']);
      const [shooter, friend, near, far] = Game.enemies;
      friend.x = 2; friend.z = 0; const friendHp = friend.hp;
      shooter.x = 0; shooter.z = 0; shooter.yaw = Math.PI / 2;
      near.x = 4; near.z = 0; far.x = 8; far.z = 0;
      const shot = shooter.def.attacks.find(x => x.projectile) || shooter.baseDef.attacks.find(x => x.projectile);
      const nearHp = near.hp, farHp = far.hp; projectiles.fire(shooter, shot, near);
      for (let i = 0; i < 60; i++) projectiles.update(Game, CONFIG.step);
      const bolt = near.hp < nearHp && far.hp === farHp && friend.hp === friendHp;
      const ownerHp = shooter.hp;
      const self = projectiles.fire(shooter, shot, near); self.x = shooter.x; self.z = shooter.z; self.y = shooter.y + 1;
      projectiles.update(Game, CONFIG.step); const ownerSafe = shooter.hp === ownerHp;
      projectiles.clear();
      near.deplete(); far.deplete(); Game.hitstop = 0; Game.update(CONFIG.step);
      const win = bossBattle.winner === 'a';
      for (let i = 0; i < 180; i++) Game.update(CONFIG.step);
      return { damaged, friendly, single, retargeted, lifesteal, phaseLives, phaseSafe, phaseResumed, bolt, ownerSafe, win, result: Game.screen === 'bossBattleWon' };
    });
    for (const [name, ok] of Object.entries(mechanics)) assert.equal(ok, true, name);
    await page.getByRole('button', { name: 'Rematch', exact: true }).click();
    assert.equal(await page.evaluate(() => !bossBattle.winner && Game.enemies.length === 4 && Game.enemies.every(e => e.hp === e.def.hp)), true);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Back to Menu', exact: true }).click();
    assert.equal(await page.evaluate(() => Game.screen), 'bossBattle');
    await page.evaluate(() => { Game.startFight('giant'); Game.loading = 0; Game.render(1, CONFIG.step); });
    assert.equal(await page.evaluate(() => !hud.root.classList.contains('boss-battle') && Game.player.rig.root.visible && Game.enemies.length === 1), true);
    assert.deepEqual(errors, []);
    console.log('Melee ally immunity, one hit per swing, retargeting, lifesteal, phases, projectile collision, victory, rematch, exit and regular-duel restoration passed.');
  } finally { if (browser) await browser.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
