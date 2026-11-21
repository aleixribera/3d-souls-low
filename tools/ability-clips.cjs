'use strict';
// Short clips of the effect commons (Aleix asked to see them moving, pass 114), in the cel style on a Pillager Captain,
// each fired twice, its name in the corner: docs/scorecard/now/<set>-commons.mp4. The clock is stepped by hand
// (Game.manualClock) and every other step is a frame, so a clip plays at real speed whatever the PC's speed. With
// `--stills`, the guard set's current frames too (guard-*.jpg, desktop; -phone for two).
// Usage: node tools/ability-clips.cjs [blade|guard|mirror|rares|triggers|echo|strikes ...] [--stills]   (no set = all). One headless Edge; needs ffmpeg.
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const out = path.join(__dirname, '..', 'docs', 'scorecard', 'now');
const args = process.argv.slice(2), stills = args.includes('--stills'), sets = args.filter(a => !a.startsWith('--'));
const want = s => !sets.length || sets.includes(s);
const FPS = 30, EVERY = 2;   // a frame every 2 steps of 1/60 s

// Each beat: [name shown, setup (run in the page with p, e; returns nothing), steps to run after it]. Fired twice.
const SETS = {
  blade: { ids: ['spark-step', 'ember-lick', 'hot-iron', 'petal-cut', 'echo-step', 'dust-devil'], beats: [
    ['Spark Step', `(p, e) => { const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), side = e.radius + CONFIG.abilities.commons.pastGap * 0.5;
      p.dashFromX = e.x - fz * 2.4 - fx * side; p.dashFromZ = e.z + fx * 2.4 - fz * side;
      const ox = p.x, oz = p.z; p.x = e.x + fz * 2.4 - fx * side; p.z = e.z - fx * 2.4 - fz * side; p.dashEnded(Game.enemies); p.x = ox; p.z = oz; }`, 40],
    ['Ember Lick', `() => __fire('stringEnd')`, 30],
    ['Hot Iron', `() => __fire('fullHeavy')`, 30],
    ['Petal Cut', `() => __fire('dashStrike')`, 50],
    ['Echo Step', `() => __fire('dodge')`, 40],
    ['Dust Devil', `p => p.tookOff(Game.enemies)`, 40],
  ] },
  guard: { ids: ['ringing-steel', 'thorn-guard', 'ash-veil', 'bitter-draught', 'grit', 'kindling', 'tithe', 'glint', 'hunters-pace', 'kindred-ember', 'shatter-guard', 'fire-burst'], beats: [
    ['Ringing Steel', `(p, e) => abilityParried(p, e)`, 30, 'ring'],
    ['Thorn Guard', `() => __fire('block')`, 26, 'thorns'],
    ['Ash Veil', `(p, e) => { p.perk.veil = 1; events.emit('abilityPerk', { body: p, perk: 'low/veil' }); __later(24, () => p.takeHit({ attackId: 'x', damage: 1, poise: 0, knock: 0, hitstop: 0 }, e)); }`, 46, 'veil'],
    ['Bitter Draught', `(p, e) => { __fire('flask'); __later(14, () => __hit()); __later(28, () => __hit()); }`, 44, 'burn'],
    ['Grit', `p => { p.hp -= 1; }`, 36, 'grit'],
    ['Kindling', `(p, e) => abilityParried(p, e)`, 30, 'keys'],
    ['Glint', `(p, e) => { p.perk.charge.strike = 0; p.gainCharge(99); __later(20, () => __glint()); }`, 40, 'glint'],
    ['Shatter Guard', `() => __fire('crack')`, 30, 'shards'],
    ['Hunter\'s Pace', `p => { p.perk.hunt = 0; events.emit('abilityPerk', { body: p, perk: 'fightStart/freeDash' }); }`, 34, 'pace'],
    ['Kindred Ember', `p => events.emit('revive', { x: p.x + 1.2, y: p.y, z: p.z, kindred: true })`, 40, 'kindred'],
  ] },
  // Mirror Shard (pass 117): the Captain looses a bolt (a bowman's, he has none) from 7 m; a deflect armed as it
  // arrives turns it back into him. The second round is the same, seen again.
  mirror: { ids: ['mirror-shard'], file: 'mirror-shard', stillAt: 28, beats: [
    ['Mirror Shard', `(p, e) => { e.x = e.px = p.x + Math.sin(p.yaw + 0.35) * 7; e.z = e.pz = p.z + Math.cos(p.yaw + 0.35) * 7; e.yaw = Math.atan2(p.x - e.x, p.z - e.z);
      p.yaw = p.pyaw = Math.atan2(e.x - p.x, e.z - p.z); Game.render(1, CONFIG.step);
      __later(8, () => { const b = projectiles.fire(e, ENEMY_BY_ID.bowman.attacks.find(a => a.projectile), p);
        __later(Math.max(1, Math.round(Math.hypot(b.x - p.x, b.z - p.z) / Math.hypot(b.vx, b.vz) / CONFIG.step) - 4), () => { p.deflect = CONFIG.parry.arm; p.setState(PS.BLOCK); }); }); }`, 70, 'mirror-shard'],
  ] },
  // The kept rares (pass 119, batch 4), each through its real path where a clip can reach it: docs/scorecard/now/rare-perks.mp4,
  // and with --stills one frame of each at its peak (rare-<id>.jpg; -phone for the first two).
  rares: { ids: ['counterstep', 'vengeance', 'bloodthirst', 'last-breath', 'opportunist', 'bastion', 'patience', 'counterflame', 'static-edge', 'grave-feast', 'iron-mercy'],
    file: 'rare-perks', phone: 2, solo: true, crf: 32, beats: [   // solo: each beat holds only its own (ids in the beats' order)
    ['Counterstep', `(p, e) => { e.yaw = Math.atan2(p.x - e.x, p.z - e.z); p.setState(PS.ROLL); perfectDodge(p, { owner: e, payload: { damage: 1 }, markHit() {}, dodged: false }); }`, 40, 'rare-counterstep', 4],
    ['Vengeance', `(p, e) => { p.hp -= 1; __later(44, () => __strike()); }`, 64, 'rare-vengeance', 20],
    ['Bloodthirst', `(p, e) => { for (let i = 0; i < 5; i++) __later(1 + i * 12, () => { __hit(); abilityLanded(p, { damage: 10 }); }); }`, 84, 'rare-bloodthirst', 46],
    ['Last Breath', `(p, e) => { p.hp = p.lastHp = p.maxHp * 0.15; for (let i = 0; i < 3; i++) __later(14 + i * 22, () => { p.yaw += 1.2; p.startRoll({ has: false }); }); }`, 80, 'rare-last-breath', 18],
    ['Opportunist', `(p, e) => { e.cracks = 1; events.emit('guardCrack', { enemy: e, cracks: 1 }); __later(10, () => __strike()); __later(30, () => __strike()); }`, 50, 'rare-opportunist', 12],
    ['Bastion', `p => { p.setState(PS.BLOCK); p.perk.bastion = p.kit.perks['block/charge'].window; events.emit('abilityPerk', { body: p, perk: 'block/armed' }); }`, 44, 'rare-bastion', 24],
    ['Patience', `p => { p.perk.calm = p.kit.perks['unhurt/empower'].after + 0.5; __later(30, () => __strike()); }`, 64, 'rare-patience', 34],
    ['Counterflame', `(p, e) => abilityParried(p, e)`, 34, 'rare-counterflame', 6],
    ['Static Edge', `() => { for (let i = 0; i < 5; i++) __later(1 + i * 8, () => __hit()); }`, 60, 'rare-static-edge', 36],
    ['Grave Feast', `(p, e) => { p.hp = p.lastHp = p.maxHp * 0.5; abilityHeal(p, 0.25, 'finisher/heal', e); }`, 44, 'rare-grave-feast', 10],
    ['Iron Mercy', `(p, e) => { p.hp = p.lastHp = p.maxHp * 0.5; abilityParried(p, e); }`, 44, 'rare-iron-mercy', 8],
  ] },
  // The rares' new triggers (pass 122, batch 5): docs/scorecard/now/rare-triggers.mp4, and with --stills a frame of each
  // (trig-<id>.jpg; -phone for the first two). Iron Cyclone and Ironclad through the body's own path (a string heavy
  // swung, a flask drunk and two heavy blows taken in it); the rest fired as their trigger would.
  triggers: { ids: ['riptide', 'moonfall-cut', 'iron-cyclone', 'petal-storm', 'ironclad', 'hunting-call', 'grave-hound'],
    file: 'rare-triggers', phone: 2, crf: 30, beats: [
    ['Riptide', `(p, e) => { __face(); __fire('counter'); }`, 36, 'trig-riptide', 10],
    ['Moonfall Cut', `(p, e) => { __face(); abilityPowers.trigger('self', p, p.kit, 'land', { x: p.x, y: p.y, z: p.z, action: 'light' }); }`, 30, 'trig-moonfall-cut', 6],
    ['Iron Cyclone', `(p, e) => { __face(); p.startAttack(PLAYER_DEF.moveset.attacks.finisher1, { x: 0, z: 0, has: false }, false, Game.enemies); }`, 50, 'trig-iron-cyclone', 24],
    ['Petal Storm', `(p, e) => abilityPowers.trigger('self', p, p.kit, 'finisher', { enemy: e, x: e.x, y: e.y, z: e.z })`, 76, 'trig-petal-storm', 20],
    ['Ironclad', `(p, e) => { p.inventory.flask.count = 4; p.useItem('flask'); for (const n of [16, 34]) __later(n, () => p.takeHit({ attackId: 'x', damage: 1, knock: 6, poise: 0, heavy: true, hitstop: 0 }, e)); }`, 56, 'trig-ironclad', 18],
    ['Hunting Call', `(p, e) => { __face(); abilityPowers.trigger('self', p, p.kit, 'press', { key: 'summon', enemy: e }); let done = false;   // the holder's blow a beat after the hound's first bite marks the boss
      for (let n = 40; n < 150; n++) __later(n, () => { if (!done && p.perk.mark) { done = true; __later(24, () => __landed()); } }); }`, 150, 'trig-hunting-call', 124],
  ] },
  // Batch 5's second pass (pass 126): docs/scorecard/now/echo-overcharge.mp4, with --stills trig-echoing-blade.jpg and
  // trig-overcharge.jpg (-phone too). Echoing Blade armed by a key, then a light string swung for real into the Captain:
  // each blow that lands is echoed. Overcharge: the Strike key filling past full (its ring on the HUD, arcs at the hand),
  // then pressed through the player's own key path.
  echo: { ids: [], file: 'echo-overcharge', phone: 2, crf: 30, beats: [
    ['Echoing Blade', `(p, e) => { p.grantAbilities(['echoing-blade']); __face(); e.x = e.px = p.x + Math.sin(p.yaw) * 2.2; e.z = e.pz = p.z + Math.cos(p.yaw) * 2.2;
      abilityPowers.trigger('self', p, p.kit, 'press', { key: 'guard' });
      const A = PLAYER_DEF.moveset.attacks, still = { x: 0, z: 0, has: false };
      [['light', 14], ['light2', 40], ['light3', 66]].forEach(([id, n]) => __later(n, () => { __face(); p.startAttack(A[id], still, false, Game.enemies); })); }`, 110, 'trig-echoing-blade', 36],
    ['Overcharge', `(p, e) => { p.grantAbilities(['overcharge', 'fire-burst']); __face(); p.perk.charge.strike = 0;
      for (let n = 1; n <= 56; n += 2) __later(n, () => p.gainCharge(1));
      __later(66, () => { const c = p.ctl.consume; p.ctl.consume = function (a) { if (a === 'ability1') { p.ctl.consume = c; return true; } return c.call(this, a); }; }); }`, 100, 'trig-overcharge', 70],
  ] },
  // Strike I (pass 129, batch 6): docs/scorecard/now/strike-shapes.mp4, with --stills a frame of each (strike-<id>.jpg;
  // -phone for the first two). Each pressed through the player's own key 1, its charge full.
  strikes: { ids: ['fire-burst', 'wind-blade', 'tidal-arc', 'frost-spike', 'stone-fist', 'rising-fang', 'thunderclap'], solo: true,
    file: 'strike-shapes', phone: 2, crf: 30, beats: [
    ['Fire Burst', `(p, e) => __key()`, 50, 'strike-fire-burst', 22],
    ['Wind Blade', `(p, e) => __key()`, 44, 'strike-wind-blade', 12],
    ['Tidal Arc', `(p, e) => __key()`, 50, 'strike-tidal-arc', 16],
    ['Frost Spike', `(p, e) => __key()`, 56, 'strike-frost-spike', 22],
    ['Stone Fist', `(p, e) => __key()`, 64, 'strike-stone-fist', 26],
    ['Rising Fang', `(p, e) => __key()`, 56, 'strike-rising-fang', 22],
    ['Thunderclap', `(p, e) => __key()`, 44, 'strike-thunderclap', 10],
  ] },
};

(async () => {
  const ffmpeg = process.env.FFMPEG || 'ffmpeg';
  const app = createServer({ dev: true }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html?style=cel`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    for (const [set, S] of Object.entries(SETS)) {
      if (!want(set)) continue;
      for (const [w, h, tag] of stills && set !== 'blade' ? [[1280, 720, ''], [390, 844, '-phone']] : [[1280, 720, '']]) {
        const beats = tag && S.phone ? S.beats.slice(0, S.phone) : S.beats;
        const page = await browser.newPage({ viewport: { width: w, height: h } });
        page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
        await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ graphics: 'normal', volume: 0, lessons: false })));
        await page.goto(url); await page.waitForFunction(() => window.__arenaReady, null, { timeout: 120000 });
        await page.evaluate(() => Game.startFight('pillagerCaptain'));
        await page.waitForFunction(() => Game.mode === 'play' && Game.player && Game.duel && !Game.loading, null, { timeout: 60000 });
        await page.waitForTimeout(800);
        await page.evaluate(ids => {
          const p = Game.player, e = Game.duel; e.cooldown = 999; e.hp = e.maxHp = 1e6;
          p.grantAbilities(ids); p.huntArmed = false;
          Game.manualClock = true; Game.worldWaiting = false;
          const tag = document.createElement('div'); tag.id = 'clipName';
          tag.style.cssText = 'position:fixed;left:28px;bottom:26px;z-index:99;font:600 26px/1 Georgia,serif;color:#f4f1e8;text-shadow:0 2px 6px #000,0 0 2px #000';
          document.body.appendChild(tag);
          const later = [];
          window.__later = (n, fn) => later.push({ n, fn });
          window.__fire = when => abilityPowers.trigger('self', p, p.kit, when, { enemy: e });
          window.__hit = () => { const s = { attackId: 'light', damage: 10, poise: 0, knock: 0, hitstop: 0 }; e.takeHit(s, p); abilityPowers.trigger('self', p, p.kit, 'hits', { enemy: e, strike: s }); };
          window.__glint = () => { const s = abilityStrike(p.kit, p.perk, e, { attackId: 'light', damage: 10, poise: 0, knock: 0, hitstop: 0 }); e.takeHit(s, p); if (s.glint) events.emit('abilityPerk', { body: p, perk: 'glint/spent', target: e }); };
          window.__strike = () => {   // a blow as js/combat.js lands it, with the rares' cues it tells
            const s = abilityStrike(p.kit, p.perk, e, { attackId: 'light', damage: 10, poise: 0, knock: 0, hitstop: 0 }); e.takeHit(s, p);
            for (const [k, perk] of [['venge', 'empower'], ['calm', 'unhurt/empower'], ['cracked', 'cracked/damage']]) if (s[k]) events.emit('abilityPerk', { body: p, perk, target: e });
          };
          window.__key = () => {   // key 1 pressed with its charge full, through the player's own press
            __face(); const slot = p.kit.pressed.strike; if (slot) p.perk.charge.strike = slot.v.charge;
            const c = p.ctl.consume; p.ctl.consume = function (a) { if (a === 'ability1') { p.ctl.consume = c; return true; } return c.call(this, a); };
          };
          window.__face = () => { p.yaw = p.pyaw = Math.atan2(e.x - p.x, e.z - p.z); };
          window.__landed = () => {   // a blow of the player's, told as js/combat.js tells it (the strike its cues listen for)
            const s = abilityStrike(p.kit, p.perk, e, { attackId: 'light', damage: 10, poise: 0, knock: 0, hitstop: 0 }); e.takeHit(s, p);
            events.emit('strike', { strike: s, attacker: p, target: e, at: { x: e.x, y: e.y + 1.2, z: e.z }, blocked: false });
          };
          window.__reset = name => {
            commonFx.clear(); rareFx.clear(); rareStrikeFx.clear(); strikeFx.clear(); abilityPowers.reset(); later.length = 0; tag.textContent = name; e.cracks = 0; events.emit('guardCrack', { enemy: e, cracks: 0 });
            p.hp = p.maxHp; p.lastHp = p.hp; p.perk = abilityPerkState(); p.tint = 0;
            for (let i = 0; i < 30; i++) Game.update(CONFIG.step);
            e.x = e.px = p.x + Math.sin(p.yaw + 0.6) * 2.8; e.z = e.pz = p.z + Math.cos(p.yaw + 0.6) * 2.8; e.y = p.y; e.yaw = Math.atan2(p.x - e.x, p.z - e.z);
            Game.render(1, CONFIG.step);
          };
          window.__steps = n => {
            for (let i = 0; i < n; i++) {
              for (let j = later.length - 1; j >= 0; j--) if (--later[j].n <= 0) { const f = later[j].fn; later.splice(j, 1); f(); }
              Game.update(CONFIG.step); Game.render(1, CONFIG.step);
            }
            return JSON.stringify(commonFx.state);
          };
        }, S.ids);
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clip-'));
        let frame = 0;
        const grab = async () => page.screenshot({ path: path.join(dir, `f${String(frame++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 85 });
        for (const [b, [name, setup, steps, still, stillAt]] of beats.entries()) {
          for (let round = 0; round < (tag ? 1 : 2); round++) {
            await page.evaluate(([setup, name, only]) => { if (only) Game.player.grantAbilities([only]); __reset(name); eval(setup)(Game.player, Game.duel); }, [setup, name, S.solo ? S.ids[b] : null]);
            for (let s = 0; s < steps; s += EVERY) {
              await page.evaluate(n => __steps(n), EVERY);
              if (!tag) await grab();
              if (stills && still && round === 0 && s === (stillAt ?? S.stillAt ?? EVERY * 3)) await page.screenshot({ path: path.join(out, `${S.file ? '' : 'guard-'}${still}${tag}.jpg`), type: 'jpeg', quality: 70 });
            }
          }
        }
        if (!tag) {
          const mp4 = path.join(out, `${S.file || set + '-commons'}.mp4`);
          execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.jpg'),
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(S.crf || 26), '-preset', 'veryfast', mp4]);
          console.log(set, frame, 'frames ->', path.relative(process.cwd(), mp4));
        }
        fs.rmSync(dir, { recursive: true, force: true });
        await page.close();
      }
    }
  } finally { await browser.close(); app.server.close(); }
  if (errors.length) { console.log('page errors:\n' + [...new Set(errors)].slice(0, 8).join('\n')); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exit(1); });
