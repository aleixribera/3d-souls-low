'use strict';
// Strike I, shapes on the ground (pass 129, design/abilities BUILD-ORDER batch 6): Tidal Arc's wave through the line,
// Frost Spike's running line, Stone Fist's and Rising Fang's spot erupting a beat later, Thunderclap's close cone (and
// its key kept while the boss is out of reach), on a body and through the server's press claim.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);

const sim = createSimulation({ seed: 7 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), powers = g('abilityPowers'), CONFIG = g('CONFIG');
const ES = g('ES'), pressOpen = g('pressOpen'), Game = sim.inspect().Game, e = Game.enemies[0], fired = [];
g('events').on('abilityPower', ev => fired.push(ev));
const holder = (ids, dz = 1) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const fresh = () => { e.hp = e.def.hp; e.state = ES.IDLE; e.x = e.px = home.x; e.z = e.pz = home.z; fired.length = 0; powers.reset(); };
const step = s => { for (let t = 0; t < s - 1e-9; t += 1 / 60) powers.tick(1 / 60); };
const lost = () => e.def.hp - e.hp;
const v = id => BY[id].levels[0];
const press = (who, b) => powers.trigger(who, b, b.kit, 'press', { key: 'strike', enemy: e });
const home = { x: e.x, z: e.z };
// A second enemy beside the boss (only its place and its wounds matter here).
const dummy = (x, z) => ({ x, y: e.y, z, radius: 0.6, hp: 100, hits: 0, state: ES.IDLE, netExec: null,
  alive: () => true, invulnerable: () => false, isBoss: () => false, takeHit(s) { this.hits++; this.hp -= s.damage; return {}; } });

const IDS = ['fire-burst', 'wind-blade', 'tidal-arc', 'frost-spike', 'stone-fist', 'rising-fang', 'thunderclap'];
for (const id of IDS) assert.ok(BY[id] && BY[id].rarity === 'rare' && BY[id].key === 'strike' && BY[id].levels.length === 3, id);

// Tidal Arc: Riptide's line from the press, `reach` long and `width` either side, at once.
{
  fresh(); const t = holder(['tidal-arc'], 2);
  press('t', t);
  near(lost(), v('tidal-arc').damage, 'Tidal Arc on the boss'); assert.equal(fired[0].then, 'wave');
  const side = dummy(e.x + v('tidal-arc').width - 0.2, e.z); Game.enemies.push(side);
  fresh(); press('t', t); Game.enemies.pop();
  assert.equal(side.hits, 1, 'wide: an enemy beside the boss is caught too');
}

// Frost Spike: the front runs out at `speed`; the boss is hit when it reaches it, not before, and missed if it left the line.
{
  const S = CONFIG.abilities.spikes, gap = 6, f = holder(['frost-spike'], gap);
  fresh(); press('f', f);
  assert.equal(lost(), 0, 'nothing at the press');
  step((gap - 0.5) / S.speed); assert.equal(lost(), 0, 'not before the front gets there');
  step(0.2); near(lost(), v('frost-spike').damage, 'wounded as the front reaches it');
  step(1); near(lost(), v('frost-spike').damage, 'once');
  const sl = holder(['frost-spike']).kit.pressed.strike;
  assert.ok(!pressOpen(sl, holder(['frost-spike'], v('frost-spike').reach + 1), e), 'its enemy past the reach of the line: the key waits');
  fresh(); press('f', f); e.x = e.px = e.x + S.width + e.radius + 1.5;   // it steps off the line at once
  step(1); assert.equal(lost(), 0, 'off the line: missed');
  fresh(); const far = holder(['frost-spike'], v('frost-spike').reach + 1); press('far', far); step(1.5);
  near(lost(), v('frost-spike').damage, 'a press taken just past its reach (the server slack) still runs to its enemy');
  assert.equal(powers.ahead.length, 0, 'the line is done');
}

// Stone Fist and Rising Fang: the boss's spot erupts `delay` s on; a boss that left it is missed.
for (const [id, then] of [['stone-fist', 'fist'], ['rising-fang', 'risingFire']]) {
  const F = CONFIG.abilities[then], s = holder([id], 3);
  fresh(); press('s', s);
  assert.equal(fired[0].then, then); assert.equal(lost(), 0, `${id}: nothing at the press`);
  step(F.delay - 2 / 60); assert.equal(lost(), 0, `${id}: not before its delay`);
  step(4 / 60); near(lost(), v(id).damage, `${id}: erupts at its delay`);
  fresh(); press('s', s); e.x = e.px = e.x + F.radius + e.radius + 0.5;
  step(F.delay + 0.1); assert.equal(lost(), 0, `${id}: the boss left the spot`);
}

// Thunderclap: needs its enemy within `reach` (else the key keeps its charge); a cone of `angle` toward it, at once.
{
  const r = v('thunderclap').reach, slot = holder(['thunderclap']).kit.pressed.strike;
  const close = holder(['thunderclap'], r - 1), far = holder(['thunderclap'], r + 1);
  assert.ok(pressOpen(slot, close, e), 'in reach: it fires'); assert.ok(!pressOpen(slot, far, e), 'out of reach: it waits');
  assert.ok(!pressOpen(slot, close, null), 'no enemy: it waits');
  assert.ok(pressOpen(holder(['wind-blade']).kit.pressed.strike, far, e), 'a line strike has no such rule');
  fresh(); press('c', close); near(lost(), v('thunderclap').damage, 'the clap at once');
  fresh(); close.y = e.y - CONFIG.height.reach - 1; press('c', close); close.y = e.y;
  near(lost(), v('thunderclap').damage, 'its enemy is struck from below too (the key was spent on it)');
  // One beside the boss inside the cone is struck; one behind the holder is not.
  const dir = { x: e.x - close.x, z: e.z - close.z }, d = Math.hypot(dir.x, dir.z), ux = dir.x / d, uz = dir.z / d;
  const inside = dummy(close.x + ux * 3 - uz * 0.8, close.z + uz * 3 + ux * 0.8), behind = dummy(close.x - ux * 2, close.z - uz * 2);
  const wide = dummy(close.x - uz * 3, close.z + ux * 3);   // square to the side: 90 degrees off
  Game.enemies.push(inside, behind, wide);
  fresh(); press('c', close); Game.enemies.splice(-3, 3);
  assert.deepEqual([inside.hits, behind.hits, wide.hits], [1, 0, 0], 'inside the cone only');
  // On the body: a press with the boss out of reach keeps the charge and turns nothing.
  const p = holder(['thunderclap'], r + 2), keys = new Set(['ability1']), told = [];
  p.ctl = { consume: a => keys.delete(a) }; p.onAbility = (when) => told.push(when);
  p.perk.charge.strike = slot.v.charge; p.pressAbilities([e], null);
  assert.equal(p.perk.charge.strike, slot.v.charge, 'out of reach: the key keeps its charge'); assert.deepEqual(told, [], 'nothing told');
  const q = holder(['thunderclap'], r - 1); q.yaw = 0; keys.add('ability1');
  q.ctl = { consume: a => keys.delete(a) }; q.onAbility = (when) => told.push(when);
  q.perk.charge.strike = slot.v.charge; q.pressAbilities([e], null);
  assert.deepEqual(told, ['press'], 'in reach: it fires'); assert.equal(q.perk.charge.strike, 0, 'the key spent');
  near(q.yaw, Math.atan2(e.x - q.x, e.z - q.z), 'turned to its enemy');
}

// Through the server: the press claim checks Thunderclap's reach; the spot strikes land on the server's own clock.
{
  fresh();
  const boss = e, S = PLAYER_DEF.stats, id = 'person';
  sim.registerPlayer(id, 'Ash');
  const place = dz => sim.setPlayers([{ id, x: boss.x, y: boss.y, z: boss.z + boss.radius + dz, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
  sim.giveAbilities(id, ['thunderclap']); place(v('thunderclap').reach + 2); sim.tick(1 / 60); sim.frame(true);
  const st = sim.inspect().holderOf(id).perk;
  st.charge.strike = v('thunderclap').charge; boss.hp = boss.def.hp;
  assert.equal(sim.abilityClaim(id, { when: 'press', key: 'strike', enemy: boss.netId }), false, 'out of reach: refused');
  assert.equal(st.charge.strike, v('thunderclap').charge, 'and the count kept');
  place(v('thunderclap').reach + 1); sim.tick(1 / 60);
  assert.equal(sim.abilityClaim(id, { when: 'press', key: 'strike', enemy: boss.netId }), true, 'just past reach, within the slack for the older pose on the server: taken');
  near(boss.def.hp - boss.hp, v('thunderclap').damage, 'the clap on the server');
  sim.giveAbilities(id, ['stone-fist']); sim.tick(1 / 60); sim.frame(true); powers.reset();
  st.charge.strike = v('stone-fist').charge; boss.hp = boss.def.hp; boss.state = ES.IDLE;
  assert.equal(sim.abilityClaim(id, { when: 'press', key: 'strike', enemy: boss.netId }), true, 'a fist pressed');
  const told = sim.frame(true).events.filter(x => x.type === 'abilityPower' && x.power === 'stone-fist');
  assert.equal(told.length, 1, 'told to every browser'); assert.equal(told[0].enemy, boss.netId, 'at its enemy');
  for (let i = 0; i < 30; i++) sim.tick(1 / 60);
  near(boss.def.hp - boss.hp, v('stone-fist').damage, 'the fist rises on the server');
}
console.log('STRIKE SHAPES: Tidal Arc\'s wave, Frost Spike\'s running line, Stone Fist\'s and Rising Fang\'s spots, Thunderclap\'s cone and reach, alone and through the server, passed.');
