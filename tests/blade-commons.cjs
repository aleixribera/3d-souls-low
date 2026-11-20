'use strict';
// The blade's commons (pass 112, design/abilities BUILD-ORDER batch 2): Spark Step, Ember Lick, Hot Iron, Petal Cut,
// Echo Step and Dust Devil in the headless simulation: each power on the boss (damage, delay, reach, cooldown), the
// body's own triggers (a dash past an enemy, a jump beside one, the fourth light hit and a dash attack landing), and
// the server's checks of a person's claims (a dash or a jump their poses showed) and of the blows it sees itself.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);

const sim = createSimulation({ seed: 7 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), powers = g('abilityPowers'), CONFIG = g('CONFIG');
const K = CONFIG.abilities.commons, e = sim.inspect().Game.enemies[0], fired = [];
g('events').on('abilityPower', ev => fired.push(ev));
const holder = (ids, dz = 1) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const fresh = () => { e.hp = e.def.hp; e.frozen = 0; fired.length = 0; powers.reset(); };
const step = s => { for (let t = 0; t < s - 1e-9; t += 1 / 60) powers.tick(1 / 60); };
const lost = () => e.def.hp - e.hp;
const v = id => BY[id].levels[0];

// Every one a common with a power, validated with the rest (validateData ran at load).
for (const id of ['spark-step', 'ember-lick', 'hot-iron', 'petal-cut', 'echo-step', 'dust-devil'])
  assert.ok(BY[id] && BY[id].rarity === 'common' && BY[id].power && BY[id].levels.length === 4, id);

// ---- 1. Each power on the boss ----
{
  // Spark Step: a spark along the dash's path, then its cooldown.
  fresh(); const p = holder(['spark-step']), from = { x: e.x - 4, z: e.z + e.radius + 0.5 }, to = { x: e.x + 4, z: e.z + e.radius + 0.5 };
  powers.trigger('s', p, p.kit, 'dashPast', { enemy: e, from, to });
  near(lost(), v('spark-step').damage, 'Spark Step');
  assert.equal(JSON.stringify(fired[0].path), JSON.stringify({ from, to }), 'the spark carries its path');
  powers.trigger('s', p, p.kit, 'dashPast', { enemy: e, from, to }); near(lost(), v('spark-step').damage, 'cooling down');
  step(v('spark-step').cooldown + 0.02); powers.trigger('s', p, p.kit, 'dashPast', { enemy: e, from, to });
  near(lost(), 2 * v('spark-step').damage, 'again after its cooldown');

  // Ember Lick and Hot Iron: a blow each, every time (no cooldown).
  fresh(); const q = holder(['ember-lick', 'hot-iron']);
  powers.trigger('q', q, q.kit, 'stringEnd', { enemy: e }); powers.trigger('q', q, q.kit, 'stringEnd', { enemy: e });
  near(lost(), 2 * v('ember-lick').damage, 'Ember Lick, twice');
  powers.trigger('q', q, q.kit, 'fullHeavy', { enemy: e });
  near(lost(), 2 * v('ember-lick').damage + v('hot-iron').damage, 'Hot Iron');

  // Petal Cut: the line now, the blow `lateCut` s later, told again as it lands.
  fresh(); const c = holder(['petal-cut']);
  powers.trigger('c', c, c.kit, 'dashStrike', { enemy: e });
  assert.equal(fired.length, 1, 'the line hangs'); assert.equal(lost(), 0, 'no damage yet');
  step(K.lateCut - 0.05); assert.equal(lost(), 0, 'still hanging');
  step(0.1); near(lost(), v('petal-cut').damage, 'the cut opens');
  assert.equal(fired.filter(f => f.strike).length, 1, 'its opening told');

  // Echo Step: the afterimage strikes `imageDelay` s after a perfect dodge, within reach of the dodge point only.
  fresh(); const d = holder(['echo-step'], 1);
  powers.trigger('d', d, d.kit, 'dodge', { enemy: e });
  step(K.imageDelay + 0.02); near(lost(), v('echo-step').damage, 'Echo Step');
  const strike = fired.find(f => f.strike);
  assert.ok(strike && Math.abs(strike.x - d.x) < 1e-6 && Math.abs(strike.z - d.z) < 1e-6, 'the slash comes from where they stood');
  fresh(); const far = holder(['echo-step'], K.imageReach + 1);
  powers.trigger('f', far, far.kit, 'dodge', { enemy: e }); step(0.5);
  assert.equal(lost(), 0, 'out of the copy\'s reach'); assert.equal(fired.length, 0, 'and nothing drawn');

  // Dust Devil: every enemy within the whirl's radius of the take-off, then its cooldown.
  fresh(); const w = holder(['dust-devil']);
  powers.trigger('w', w, w.kit, 'jump', { enemy: e, x: w.x, y: w.y, z: w.z });
  near(lost(), v('dust-devil').damage, 'Dust Devil');
  powers.trigger('w', w, w.kit, 'jump', { enemy: e, x: w.x, y: w.y, z: w.z }); near(lost(), v('dust-devil').damage, 'cooling down');
  fresh(); powers.trigger('w', w, w.kit, 'jump', { enemy: e, x: e.x + e.radius + K.whirlRadius + 0.5, y: w.y, z: e.z });
  assert.equal(lost(), 0, 'too far from the take-off');
}

// ---- 2. The body's own triggers ----
{
  const dashPastOf = g('dashPastOf'), live = [e];
  const side = e.radius + K.pastGap * 0.5;
  assert.equal(dashPastOf({ x: e.x - 5, z: e.z + side }, { x: e.x + 5, z: e.z + side }, live), e, 'past its flank');
  assert.equal(dashPastOf({ x: e.x - 5, z: e.z + e.radius + K.pastGap + 0.5 }, { x: e.x + 5, z: e.z + e.radius + K.pastGap + 0.5 }, live), null, 'too wide');
  assert.equal(dashPastOf({ x: e.x - 5, z: e.z }, { x: e.x - e.radius, z: e.z }, live), null, 'into it, not past it');
  assert.equal(dashPastOf({ x: e.x + 5, z: e.z + side }, { x: e.x + 3, z: e.z + side }, live), null, 'away from it');

  // A body with the kit reports each trigger once, at the right moment; one without reports nothing.
  const heard = [], body = ids => { const p = holder(ids, 2); p.onAbility = (when, ctx) => heard.push({ when, ctx }); return p; };
  const a = body(['spark-step']);
  a.dashFromX = e.x - 5; a.dashFromZ = e.z + side; a.x = e.x + 5; a.z = e.z + side;
  a.dashEnded(live);
  assert.equal(heard.length, 1); assert.equal(heard[0].when, 'dashPast'); assert.equal(heard[0].ctx.enemy, e);
  heard.length = 0; const plain = body([]); plain.dashFromX = a.dashFromX; plain.dashFromZ = a.dashFromZ; plain.x = a.x; plain.z = a.z;
  plain.dashEnded(live); assert.equal(heard.length, 0, 'no Spark Step, no report');
  const j = body(['dust-devil']); j.x = e.x; j.z = e.z + e.radius + 1; j.tookOff(live);
  assert.equal(heard.length, 1); assert.equal(heard[0].when, 'jump');
  heard.length = 0; j.z = e.z + e.radius + K.whirlRadius + 1; j.tookOff(live); assert.equal(heard.length, 0, 'no enemy close: no whirl');

  // A real dash past the boss in the simulation, through the Player's own update, reports it as it ends.
  heard.length = 0;
  const r = body(['spark-step']); r.x = e.x - 3; r.z = e.z + side; r.yaw = Math.PI / 2;
  const hands = { consume: a => a === 'roll', isHeld: () => false, held: () => false, pressed: () => false };
  r.ctl = new Proxy(hands, { get: (t, k) => k in t ? t[k] : () => false });
  r.startRoll({ x: 1, z: 0, has: true });
  r.ctl = new Proxy({}, { get: () => () => false });
  for (let i = 0; i < 90 && r.state === g('PS').ROLL; i++) r.update(1 / 60, { x: 1, z: 0, has: true }, live, null);
  assert.ok(r.x > e.x, `the dash carried past the boss (${r.x.toFixed(2)} vs ${e.x.toFixed(2)})`);
  assert.equal(heard.filter(h => h.when === 'dashPast').length, 1, 'one dashPast as the dash ends');
}

// ---- 3. Through the server: the blows it sees and the claims it checks ----
{
  sim.inspect().Game.enemies.forEach(x => { x.hp = x.def.hp; });
  const boss = sim.inspect().Game.enemies[0], S = PLAYER_DEF.stats, id = 'person';
  sim.registerPlayer(id, 'Ash');
  const place = (state, at = {}) => sim.setPlayers([{ id, x: boss.x, y: boss.y, z: boss.z + boss.radius + 0.5, yaw: Math.PI, hp: S.maxHp, state, poseAge: 0, ...at }]);
  const powersFired = () => sim.frame(true).events.filter(ev => ev.type === 'abilityPower');

  // Ember Lick on the fourth light hit only; Petal Cut on a dash attack only.
  sim.giveAbilities(id, ['ember-lick', 'petal-cut']); place('attack'); sim.frame(true);
  for (const attack of ['light', 'light4', 'dashLight']) {
    boss.hp = boss.def.hp; place('attack');
    assert.equal(sim.hit(id, { enemy: boss.netId, attack, charge: 0 }), true, attack + ' lands');
    for (let i = 0; i < 30; i++) sim.tick(1 / 60);
    const seen = powersFired().map(ev => ev.power + (ev.strike ? '+' : ''));
    const want = attack === 'light4' ? ['ember-lick'] : attack === 'dashLight' ? ['petal-cut', 'petal-cut+'] : [];
    assert.equal(seen.join(), want.join(), attack);
  }

  // Spark Step claimed: refused with no dash in the poses, refused for a path the poses never took, granted after.
  sim.giveAbilities(id, ['spark-step']); g('abilityPowers').reset();
  const side = boss.radius + K.pastGap * 0.5, from = { x: boss.x - 2.4, z: boss.z + side }, to = { x: boss.x + 2.4, z: boss.z + side };
  const claim = msg => sim.abilityClaim(id, { when: 'dashPast', enemy: boss.netId, ...msg });
  for (let i = 0; i < 70; i++) { place('idle', from); sim.tick(1 / 60); }
  assert.equal(claim({ from, to }), false, 'no dash in the poses');
  for (let i = 0; i < 40; i++) sim.tick(1 / 60);   // the waiting claim runs out
  sim.frame(true);
  for (let i = 0; i <= 8; i++) { place('roll', { x: from.x + (to.x - from.x) * i / 8, z: from.z }); sim.tick(1 / 60); }
  place('idle', to); sim.tick(1 / 60);
  assert.equal(claim({ from, to: { x: to.x + 20, z: to.z } }), false, 'a path longer than any dash');
  assert.equal(claim({ from: { x: from.x, z: from.z - 6 }, to: { x: to.x, z: to.z - 6 } }), false, 'a path the poses never took');
  assert.equal(claim({ from: { x: 'a' }, to }), false, 'a malformed path');
  assert.equal(claim({ from: to, to: from }), false, 'the roll run backwards: its start is where the roll began');
  boss.hp = boss.def.hp;
  assert.equal(claim({ from, to }), true, 'the dash the poses showed');
  near(boss.def.hp - boss.hp, v('spark-step').damage, 'the spark on the server');
  const spark = powersFired().find(ev => ev.power === 'spark-step');
  assert.ok(spark && spark.path && spark.path.to.x === to.x, 'every browser gets the path to draw');

  // Dust Devil claimed: only from a take-off the poses showed, near the boss.
  sim.giveAbilities(id, ['dust-devil']); g('abilityPowers').reset();
  for (let i = 0; i < 70; i++) { place('idle'); sim.tick(1 / 60); }
  const at = { x: boss.x, y: boss.y, z: boss.z + boss.radius + 0.5 }, jump = msg => sim.abilityClaim(id, { when: 'jump', ...at, ...msg });
  assert.equal(jump({}), false, 'standing: no jump yet');
  for (let i = 0; i < 40; i++) sim.tick(1 / 60);
  place('fall'); sim.tick(1 / 60);
  assert.equal(jump({}), false, 'a fall off a ledge is not a jump');
  for (let i = 0; i < 40; i++) { place('idle'); sim.tick(1 / 60); }
  place('jump'); sim.tick(1 / 60);
  assert.equal(jump({ z: at.z + 9 }), false, 'from somewhere they never stood');
  boss.hp = boss.def.hp;
  assert.equal(jump({}), true, 'the take-off the poses showed');
  near(boss.def.hp - boss.hp, v('dust-devil').damage, 'the whirl on the server');
}
console.log('BLADE COMMONS: Spark Step, Ember Lick, Hot Iron, Petal Cut, Echo Step and Dust Devil on the boss (damage, delay, reach, cooldown), the body\'s dash and jump triggers, and the server\'s blows and claims.');
