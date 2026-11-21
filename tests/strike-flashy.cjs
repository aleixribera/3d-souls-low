'use strict';
// Strike II, the flashy ones (pass 131, design/abilities BUILD-ORDER batch 7): Sparrow Flurry's thrusts while its holder
// stands, Whirl Drill's grinds, Shadow Stitch's stabs, Spinning Blade's two passes, Three Shadows' one moment, Quick
// Draw's stance, draw and delayed cut (and its charge given back when cut short), on a body and through the server.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);

const sim = createSimulation({ seed: 7 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), powers = g('abilityPowers'), CONFIG = g('CONFIG');
const ES = g('ES'), PS = g('PS'), pressOpen = g('pressOpen'), Game = sim.inspect().Game, e = Game.enemies[0], fired = [];
const A = CONFIG.abilities, STEP = 1 / 60;
g('events').on('abilityPower', ev => fired.push(ev));
const home = { x: e.x, z: e.z };
const holder = (ids, dz = 1) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const fresh = () => { e.hp = e.def.hp; e.state = ES.IDLE; e.x = e.px = home.x; e.z = e.pz = home.z; fired.length = 0; powers.reset(); };
const step = s => { for (let t = 0; t < s - 1e-9; t += STEP) powers.tick(STEP); };
const lost = () => e.def.hp - e.hp;
const v = id => BY[id].levels[0];
const press = (who, b) => powers.trigger(who, b, b.kit, 'press', { key: 'strike', enemy: e });
const strikes = then => fired.filter(f => f.then === then && f.strike).length;
const dummy = (x, z) => ({ x, y: e.y, z, radius: 0.6, hp: 100, hits: 0, state: ES.IDLE, netExec: null,
  alive: () => true, invulnerable: () => false, isBoss: () => false, takeHit(s) { this.hits++; this.hp -= s.damage; return {}; } });

const IDS = ['sparrow-flurry', 'whirl-drill', 'shadow-stitch', 'spinning-blade', 'three-shadows', 'quick-draw'];
for (const id of IDS) assert.ok(BY[id] && BY[id].rarity === 'rare' && BY[id].key === 'strike' && BY[id].levels.length === 3, id);

// Sparrow Flurry: needs its enemy within flurry.reach; `hits` thrusts over flurry.time; a dash out or a blow taken drops the rest.
{
  const f = v('sparrow-flurry'), slot = holder(['sparrow-flurry']).kit.pressed.strike;
  assert.ok(pressOpen(slot, holder(['sparrow-flurry'], A.flurry.reach - 0.5), e), 'in reach: it fires');
  assert.ok(!pressOpen(slot, holder(['sparrow-flurry'], A.flurry.reach + 0.5), e), 'out of reach: the key waits');
  fresh(); const p = holder(['sparrow-flurry'], 1); press('p', p);
  assert.equal(lost(), 0, 'nothing at the press');
  step(A.flurry.time / 2 + 1e-6); near(lost(), f.damage * f.hits / 2, 'half the thrusts by half its time');
  step(A.flurry.time); near(lost(), f.damage * f.hits, 'every thrust over its time');
  assert.equal(strikes('flurry'), f.hits, 'each thrust told');
  fresh(); press('p', p); step(A.flurry.time * 0.3 + 1e-6);
  const landed = lost(); p.z += A.rootSlip + 1; step(A.flurry.time);
  near(lost(), landed, 'dashed out: the rest dropped'); assert.ok(fired.some(x => x.end === 'cut'), 'the cut told'); p.z -= A.rootSlip + 1;
  fresh(); press('p', p); step(A.flurry.time * 0.3 + 1e-6); const before = lost(); p.hp -= 10; step(A.flurry.time);
  near(lost(), before, 'a blow taken: the rest dropped'); p.hp = p.maxHp;
}

// Whirl Drill: lands drill.lead s on, then grinds every `every` s, time / every grinds in all.
{
  const d = v('whirl-drill'), n = Math.round(d.time / d.every);
  fresh(); press('d', holder(['whirl-drill'], 4));
  step(A.drill.lead - 2 * STEP); assert.equal(lost(), 0, 'not before its lead');
  step(3 * STEP); near(lost(), d.damage, 'the first grind at its lead');
  step(d.time + 0.2); near(lost(), d.damage * n, `${n} grinds`);
}

// Shadow Stitch: `hits` stabs, the first stitch.lead s on, then every stitch.every, each told.
{
  const s = v('shadow-stitch');
  fresh(); press('s', holder(['shadow-stitch'], 5));
  step(A.stitch.lead - 2 * STEP); assert.equal(lost(), 0, 'not before its lead');
  step(3 * STEP); near(lost(), s.damage, 'the first stab');
  step(A.stitch.every * (s.hits - 1) + 0.05); near(lost(), s.damage * s.hits, 'all its stabs');
  assert.equal(strikes('stitch'), s.hits, 'each stab told');
}

// Spinning Blade: through the boss and back, a cut each way; one past the boss on its path is cut both ways, one off it never.
{
  const b = v('spinning-blade'), p = holder(['spinning-blade'], 4), B = A.boomerang;
  const dir = { x: e.x - p.x, z: e.z - p.z }, l = Math.hypot(dir.x, dir.z), ux = dir.x / l, uz = dir.z / l;
  const beyond = dummy(e.x + ux * (e.radius + 1.2), e.z + uz * (e.radius + 1.2)), off = dummy(p.x + uz * 4, p.z - ux * 4);
  fresh(); Game.enemies.push(beyond, off); press('b', p);
  step(B.time / 2 - STEP); near(lost(), b.damage, 'the first cut on the way out');
  step(B.time); Game.enemies.splice(-2, 2);
  near(lost(), b.damage * b.hits, 'the second on the way back');
  assert.deepEqual([beyond.hits, off.hits], [2, 0], 'on the path both ways; off it, never');
  assert.equal(powers.ahead.length, 0, 'it came back');
  fresh(); press('b', p); step(B.time / 2);
  e.x = e.px = e.x + uz * (B.width + e.radius + 2); e.z = e.pz = e.z - ux * (B.width + e.radius + 2);   // it leaps aside after the first cut
  step(B.time); near(lost(), b.damage, 'a boss that leapt aside dodges the return');
}

// Three Shadows: `hits` wounds at once, clones.lead s on.
{
  const c = v('three-shadows');
  fresh(); press('c', holder(['three-shadows'], 6));
  step(A.clones.lead - 2 * STEP); assert.equal(lost(), 0, 'not before the clones cut');
  step(3 * STEP); near(lost(), c.damage * c.hits, 'every clone at once');
}

// Quick Draw: the stance, the draw (marks the line), the cut a beat later wherever the marked went; cut short, the key's charge back.
{
  const q = v('quick-draw'), I = A.iai, p = holder(['quick-draw'], 5);
  fresh(); press('q', p);
  step(I.stance - STEP); assert.equal(lost(), 0, 'nothing in the stance'); assert.equal(strikes('iai'), 0, 'not drawn yet');
  step(2 * STEP); const drawn = fired.find(x => x.then === 'iai' && x.strike === 1);
  assert.ok(drawn && drawn.path, 'drawn, its line told'); assert.equal(lost(), 0, 'the line hangs');
  e.x = e.px = e.x + 5;   // it runs off the line in the beat: still cut (the line is drawn on it)
  step(I.beat + 2 * STEP); near(lost(), q.damage, 'the line opens on it a beat later');
  const side = dummy(p.x + 4, p.z);   // off the line at the draw
  fresh(); Game.enemies.push(side); press('q', p); step(I.stance + I.beat + 0.1); Game.enemies.pop();
  assert.equal(side.hits, 0, 'off the line at the draw: untouched');
  fresh(); p.perk.charge.strike = 0; press('q', p); step(I.stance / 2); p.x += A.rootSlip + 0.5; step(I.stance);
  assert.equal(lost(), 0, 'dashed out of the stance: no cut'); assert.equal(p.perk.charge.strike, q.charge, 'and the key full again');
  assert.ok(fired.some(x => x.end === 'cancel'), 'the cancel told'); p.x -= A.rootSlip + 0.5;
  fresh(); p.perk.charge.strike = 0; press('q', p); step(I.stance / 2); p.hp -= 5; step(I.stance + I.beat);
  assert.equal(lost(), 0, 'struck in the stance: no cut'); assert.equal(p.perk.charge.strike, q.charge, 'the charge back'); p.hp = p.maxHp;
}

// On the body: a flurry or a stance roots its holder (turned to the enemy); walking does nothing, a dash gets out.
{
  const p = holder(['quick-draw'], 4), keys = new Set(['ability1']);
  p.ctl = { consume: a => keys.delete(a), isHeld: () => false }; p.onAbility = () => {};
  p.yaw = 0; p.perk.charge.strike = v('quick-draw').charge; p.pressAbilities([e], null);
  near(p.root, A.iai.stance, 'rooted for the stance'); near(p.yaw, Math.atan2(e.x - p.x, e.z - p.z), 'turned to its enemy');
  assert.equal(p.perk.charge.strike, 0, 'the key spent');
  const r = holder(['quick-draw'], 4), k2 = new Set(['ability1']);
  r.ctl = { consume: a => k2.delete(a), isHeld: () => false }; r.onAbility = () => {}; r.state = PS.ROLL;
  r.perk.charge.strike = v('quick-draw').charge; r.pressAbilities([e], null);
  assert.equal(r.root, 0, 'mid-dash: no stance'); assert.equal(r.perk.charge.strike, v('quick-draw').charge, 'and the key kept');
}

// Through the server: the flurry's claim needs its enemy near; a stance cut short gives the server's count its charge back.
{
  fresh();
  const boss = e, S = PLAYER_DEF.stats, id = 'person';
  sim.registerPlayer(id, 'Ash');
  const place = dz => sim.setPlayers([{ id, x: boss.x, y: boss.y, z: boss.z + boss.radius + dz, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
  sim.giveAbilities(id, ['sparrow-flurry']); place(A.flurry.reach + A.press.reachSlack + 1); sim.tick(STEP); sim.frame(true);
  const st = sim.inspect().holderOf(id).perk;
  st.charge.strike = v('sparrow-flurry').charge; boss.hp = boss.def.hp;
  assert.equal(sim.abilityClaim(id, { when: 'press', key: 'strike', enemy: boss.netId }), false, 'flurry out of reach: refused');
  place(1); sim.tick(STEP);
  assert.equal(sim.abilityClaim(id, { when: 'press', key: 'strike', enemy: boss.netId }), true, 'in reach: taken');
  for (let i = 0; i < 70; i++) sim.tick(STEP);
  near(boss.def.hp - boss.hp, v('sparrow-flurry').damage * v('sparrow-flurry').hits, 'the flurry on the server');
  sim.giveAbilities(id, ['quick-draw']); sim.tick(STEP); sim.frame(true); powers.reset();
  st.charge.strike = v('quick-draw').charge; boss.hp = boss.def.hp; boss.state = ES.IDLE;
  assert.equal(sim.abilityClaim(id, { when: 'press', key: 'strike', enemy: boss.netId }), true, 'a draw pressed');
  assert.equal(st.charge.strike, 0, 'its count spent');
  for (let i = 0; i < 10; i++) sim.tick(STEP);
  place(1 + A.rootSlip + 2); sim.tick(STEP);   // their next pose: they dashed away
  const told = sim.frame(true).events.filter(x => x.type === 'abilityPower' && x.power === 'quick-draw');
  assert.ok(told.some(x => x.end === 'cancel'), 'the cancel told to every browser');
  assert.equal(st.charge.strike, v('quick-draw').charge, 'the server gives its count back');
  for (let i = 0; i < 60; i++) sim.tick(STEP);
  assert.equal(boss.def.hp - boss.hp, 0, 'no cut');
}
console.log('STRIKE FLASHY: Sparrow Flurry\'s thrusts and its cut-short, Whirl Drill\'s grinds, Shadow Stitch\'s stabs, Spinning Blade\'s two passes, Three Shadows\' one moment, Quick Draw\'s stance, draw, beat and given-back charge, alone and through the server, passed.');
