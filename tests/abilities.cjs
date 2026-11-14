'use strict';
// Boss Rush's abilities (v7.70.0, js/abilities.js, js/data/abilities.js): kits and levels, each common, rare and
// legendary measured on real bodies and the boss in the headless simulation, the offers' draw (rarity, last levels,
// a teammate's legendary, a swift kill's extra card), then the server end to end: the pick between fights, a refused
// pick, the wait for everyone, a bot's own pick, the abilities carried to the next fight, the server's damage and
// health limits, the claims it checks (a jump heavy landing, a perfect dodge, a low bar, a flask) and the pick that
// runs out.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createSimulation, build } = require('../server/headless.cjs');
const { createServer } = require('../server/index.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);
// The simulation's own globals (Player, CONFIG, parryTiming...): a function made by its realm's Function constructor.
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

// ---- 1. Kits, levels and each ability on a body -------------------------------------------------------------------
{
  const sim = createSimulation({ seed: 5 }), g = realm(sim);
  sim.addBot(); sim.start('arena', 'ostrey');
  const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), CONFIG = g('CONFIG'), ES = g('ES'), BY = g('ABILITY_BY_ID');
  const kitOf = g('abilityKit'), strikeWith = g('abilityStrike'), perkState = g('abilityPerkState');
  const hands = [...sim.inspect().bots.values()][0].body.ctl, S = PLAYER_DEF.stats;
  const body = ids => { const p = new Player(PLAYER_DEF, 0, 0, 0, 0); p.ctl = hands; p.grantAbilities(ids); return p; };
  const at = (id, level) => BY[id].levels[level - 1];

  // Levels: an id held twice is its second level, and never more than its last.
  assert.equal(kitOf([]), g('NO_KIT'));
  const kit = kitOf(['keen-edge', 'iron-blood', 'keen-edge']);
  near(kit.mods.damage, at('keen-edge', 2).damage, 'Keen Edge II'); near(kit.mods.maxHp, at('iron-blood', 1).maxHp, 'Iron Blood I');
  near(kitOf(Array(9).fill('keen-edge')).mods.damage, at('keen-edge', 4).damage, 'past the last level');
  assert.deepEqual(kitOf(['vengeance', 'meteor-fall', 'nothing']).ids, ['vengeance', 'meteor-fall'], 'an unknown id is dropped');

  // Iron Blood and Deep Lungs: bigger bars, full. Quick Breath: a faster refill.
  const tough = body(['iron-blood', 'deep-lungs']);
  near(tough.maxHp, S.maxHp * (1 + at('iron-blood', 1).maxHp), 'Iron Blood bar'); assert.equal(tough.hp, tough.maxHp);
  near(tough.maxStamina, S.maxStamina * (1 + at('deep-lungs', 1).maxStamina), 'Deep Lungs bar');
  const refill = ids => { const p = body(ids); p.stamina = 0; p.staminaDelay = 0; p.update(0.25, { x: 0, z: 0, has: false }, [], null); return p.stamina; };
  near(refill(['quick-breath']) / refill([]), 1 + at('quick-breath', 1).staminaRegen, 'Quick Breath refill');
  near(body(['quick-draught']).drinkRate(), 1 + at('quick-draught', 1).flaskSpeed, 'Quick Draught');

  // Keen Eye: a press too early for a plain body parries with the ability.
  const e = sim.inspect().Game.enemies[0], parryable = e.def.attacks.find(a => g('canParryAttack')(a));
  const early = ids => {
    const p = body(ids); p.x = e.x; p.z = e.z + e.radius + 0.6; p.yaw = Math.PI;   // facing the boss, inside its reach
    e.yaw = 0; e.attack = parryable; e.hitIndex = 0; e.state = ES.WINDUP;
    e.stateTime = parryable.hits[0].startup - CONFIG.parry.lead * (1 + at('keen-eye', 1).parryWindow / 2);
    return g('parryTiming')(p, e, 0);
  };
  assert.equal(early([]), null, 'too early without Keen Eye');
  assert.ok(early(['keen-eye']) > CONFIG.parry.lead, 'Keen Eye parries it');
  e.state = ES.IDLE; e.attack = null;

  // A blow's bonus: Keen Edge, Breaker, Cold Riposte (a riposte only), Opportunist (a boss off balance), Headsman.
  const attack = Object.values(PLAYER_DEF.moveset.attacks).find(a => a.id !== 'execute' && a.postureDmg);
  const base = g('makeStrike')(attack, false, 0), riposte = g('makeStrike')(attack, true, 0);
  const sharp = strikeWith(kitOf(['keen-edge', 'breaker']), perkState(), e, base);
  near(sharp.damage, base.damage * (1 + at('keen-edge', 1).damage), 'Keen Edge'); near(sharp.postureDmg, base.postureDmg * (1 + at('breaker', 1).posture), 'Breaker');
  assert.equal(strikeWith(kitOf(['cold-riposte']), perkState(), e, base), base, 'Cold Riposte: nothing on a plain blow');
  near(strikeWith(kitOf(['cold-riposte']), perkState(), e, riposte).damage, riposte.damage * (1 + at('cold-riposte', 1).riposte), 'Cold Riposte');
  assert.equal(strikeWith(kitOf(['opportunist']), perkState(), e, base), base, 'Opportunist: the boss on its feet');
  e.state = ES.BROKEN;
  near(strikeWith(kitOf(['opportunist']), perkState(), e, base).damage, base.damage * (1 + at('opportunist', 1).damage), 'Opportunist, the boss kneeling');
  e.state = ES.IDLE; e.frozen = 1;
  assert.notEqual(strikeWith(kitOf(['opportunist']), perkState(), e, base), base, 'Opportunist, the boss stopped in time'); e.frozen = 0;
  near(g('execution').damageFor(e, at('headsman', 1).execution) / g('execution').damageFor(e), 1 + at('headsman', 1).execution, 'Headsman');

  // Vengeance: hurt, the next blow within its window is stronger, once. Patience: unhurt long enough, the next blow double.
  const vk = kitOf(['vengeance']), vs = perkState();
  g('abilityHurt')(vk, vs);
  const venge = strikeWith(vk, vs, e, base);
  near(venge.damage, base.damage * (1 + at('vengeance', 1).damage), 'Vengeance'); assert.equal(venge.empowered, true);
  assert.equal(strikeWith(vk, vs, e, base), base, 'Vengeance is spent');
  g('abilityHurt')(vk, vs); g('abilityClocks')(vs, at('vengeance', 1).window + 0.1);
  assert.equal(strikeWith(vk, vs, e, base), base, 'Vengeance runs out');
  const pk = kitOf(['patience']), ps = perkState();
  g('abilityClocks')(ps, at('patience', 1).after - 0.5); assert.equal(strikeWith(pk, ps, e, base), base, 'Patience: not yet');
  g('abilityClocks')(ps, 0.6); near(strikeWith(pk, ps, e, base).damage, base.damage * 2, 'Patience');
  assert.equal(strikeWith(pk, ps, e, base), base, 'Patience starts over');

  // Bloodthirst: `hits` landed blows without being hurt heal; a hurt starts the count over.
  const thirsty = body(['bloodthirst']), v = at('bloodthirst', 1);
  thirsty.hp = thirsty.lastHp = 50;
  for (let i = 0; i < v.hits - 1; i++) g('abilityLanded')(thirsty, base);
  assert.equal(thirsty.hp, 50, 'not yet');
  g('abilityLanded')(thirsty, base); near(thirsty.hp, 50 + thirsty.maxHp * v.heal, 'Bloodthirst heals');
  for (let i = 0; i < v.hits - 1; i++) g('abilityLanded')(thirsty, base);
  thirsty.hp -= 10; thirsty.update(CONFIG.step, { x: 0, z: 0, has: false }, [], null);   // hurt: abilityStep notices
  const before = thirsty.hp; g('abilityLanded')(thirsty, base);
  assert.ok(thirsty.hp <= before + 1e-9, 'a hurt starts the count over');

  // Last Breath: low, a roll costs nothing. Light Step: a cheaper roll.
  const roll = (ids, hp) => { const p = body(ids); if (hp) p.hp = p.lastHp = hp; p.startRoll({ x: 0, z: 1, has: true }); return p.maxStamina - p.stamina; };
  const plain = roll([]);
  assert.ok(plain > 0); assert.equal(roll(['last-breath'], S.maxHp * 0.2), 0, 'Last Breath: free'); assert.equal(roll(['last-breath']), plain, 'not while healthy');
  near(roll(['light-step']), plain * (1 - at('light-step', 1).rollCost), 'Light Step');
}

// ---- 2. The legendaries on the boss --------------------------------------------------------------------------------
{
  const sim = createSimulation({ seed: 9 }), g = realm(sim);
  sim.start('arena', 'ostrey');
  const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), kitOf = g('abilityKit'), powers = g('abilityPowers');
  const e = sim.inspect().Game.enemies[0], fired = [];
  g('events').on('abilityPower', ev => fired.push(ev));
  powers.reset();
  const holder = ids => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + 1, Math.PI, e.y); p.grantAbilities(ids); return p; };
  const fresh = () => { e.hp = e.def.hp; e.posture = 0; e.frozen = 0; fired.length = 0; };
  const step = s => { for (let t = 0; t < s - 1e-9; t += 1 / 60) powers.tick(1 / 60); };

  // Meteor Fall: only the jump heavy, a blast on everything near, then its cooldown.
  fresh(); const meteor = holder(['meteor-fall']), mv = BY['meteor-fall'].levels[0];
  powers.trigger('m', meteor, meteor.kit, 'land', { x: e.x, y: e.y, z: e.z + 2, action: 'light' });
  assert.equal(e.hp, e.def.hp, 'a jump light is no meteor');
  powers.trigger('m', meteor, meteor.kit, 'land', { x: e.x, y: e.y, z: e.z + 2, action: 'heavy' });
  assert.ok(e.hp < e.def.hp && e.posture > 0, 'the meteor lands on the boss'); assert.equal(fired[0].power, 'meteor-fall');
  const hp = e.hp; powers.trigger('m', meteor, meteor.kit, 'land', { x: e.x, y: e.y, z: e.z, action: 'heavy' });
  assert.equal(e.hp, hp, 'cooling down'); step(mv.cooldown + 0.05);
  powers.trigger('m', meteor, meteor.kit, 'land', { x: e.x + mv.radius + e.radius + 1, y: e.y, z: e.z, action: 'heavy' });
  assert.equal(e.hp, hp, 'out of its reach');

  // Storm King: `strikes` bolts, the first `lead` s after the heavy, then one every `every` s.
  fresh(); const storm = holder(['storm-king']), sv = BY['storm-king'].levels[0];
  powers.trigger('s', storm, storm.kit, 'fullHeavy', { enemy: e });
  step(sv.lead * 0.9); assert.equal(e.hp, e.def.hp, 'the first bolt is still coming');
  step(sv.lead * 0.2 + sv.every * sv.strikes);
  assert.equal(fired.filter(f => f.strike).length, sv.strikes, 'every bolt'); assert.ok(e.hp < e.def.hp);

  // Time Rift: the boss stands still and its blows do nothing until the time is up.
  fresh(); const rift = holder(['time-rift']), tv = BY['time-rift'].levels[0];
  e.state = g('ES').WINDUP; e.attack = e.def.attacks[0]; e.hitIndex = 0; e.stateTime = 0.01;
  powers.trigger('t', rift, rift.kit, 'dodge', { enemy: e });
  near(e.frozen, tv.time, 'frozen'); assert.equal(e.hitbox, null);
  for (let i = 0; i < 30; i++) e.update(1 / 60, rift);
  near(e.stateTime, 0.01, 'no step while frozen'); near(e.frozen, tv.time - 0.5, 'the time runs down');
  e.state = g('ES').IDLE; e.attack = null; e.frozen = 0;

  // Thousand Blades: a parry rains blades for `time` s.
  fresh(); const blades = holder(['thousand-blades']), bv = BY['thousand-blades'].levels[0];
  powers.trigger('b', blades, blades.kit, 'parry', { enemy: e }); step(bv.time + 0.05);
  near(e.def.hp - e.hp, Math.round(bv.time / bv.every) * bv.damage, 'every blade');   // Ostrey takes a power's blow in full

  // Blood Moon: only this low, once a fight; stronger blows that heal.
  fresh(); const moon = holder(['blood-moon']), ov = BY['blood-moon'].levels[0];
  powers.trigger('o', moon, moon.kit, 'low', {}); assert.equal(moon.perk.moon, 0, 'not while healthy');
  moon.hp = moon.lastHp = moon.maxHp * ov.below * 0.9;
  powers.trigger('o', moon, moon.kit, 'low', {}); near(moon.perk.moon, ov.time, 'the moon rises');
  const base = g('makeStrike')(Object.values(PLAYER_DEF.moveset.attacks)[0], false, 0), struck = g('abilityStrike')(moon.kit, moon.perk, e, base);
  near(struck.damage, base.damage * (1 + ov.damage), 'Blood Moon damage');
  const low = moon.hp; g('abilityLanded')(moon, struck); near(moon.hp, low + struck.damage * ov.drain, 'Blood Moon drink');
  moon.perk.moon = 0; powers.trigger('o', moon, moon.kit, 'low', {}); assert.equal(moon.perk.moon, 0, 'once a fight');
  moon.hp = low; powers.reset(); powers.trigger('o', moon, moon.kit, 'low', {}); assert.ok(moon.perk.moon > 0, 'a new fight');

  // Counterflame (a rare's power): a parry bursts fire on the boss, then its cooldown.
  fresh(); const flame = holder(['counterflame']), fv = BY['counterflame'].levels[0];
  powers.trigger('f', flame, flame.kit, 'parry', { enemy: e }); near(e.def.hp - e.hp, fv.damage, 'Counterflame');
  powers.trigger('f', flame, flame.kit, 'parry', { enemy: e }); near(e.def.hp - e.hp, fv.damage, 'Counterflame cooling down');

  // Static Edge and Gale Crescent: every `hits`th landed blow, each counting its own.
  fresh(); const edge = holder(['static-edge', 'gale-crescent']), ev = BY['static-edge'].levels[0], gv = BY['gale-crescent'].levels[0];
  const blow = { damage: 20, postureDmg: 5 };
  for (let i = 1; i <= gv.hits * ev.hits; i++) powers.trigger('h', edge, edge.kit, 'hits', { enemy: e, strike: blow });
  assert.equal(fired.filter(f => f.power === 'static-edge').length, gv.hits, 'a spark every Nth blow');
  assert.equal(fired.filter(f => f.power === 'gale-crescent').length, ev.hits, 'a crescent every Nth blow');
  near(e.def.hp - e.hp, gv.hits * ev.damage + ev.hits * gv.damage, 'Static Edge and Gale Crescent damage');
  // The crescent cuts what stands on its path past the boss, not beside the holder.
  const far = holder(['gale-crescent']);
  fresh(); far.x = e.x; far.z = e.z + e.radius + 4;
  for (let i = 0; i < gv.hits; i++) powers.trigger('g', far, far.kit, 'hits', { enemy: e, strike: blow });
  near(e.def.hp - e.hp, gv.damage, 'the crescent through the boss');

  // Pyre: only a break lights it; it burns `time` s.
  fresh(); const pyre = holder(['pyre']), yv = BY['pyre'].levels[0];
  powers.trigger('p', pyre, pyre.kit, 'parry', { enemy: e }); assert.equal(fired.length, 0, 'a parry alone lights no pyre');
  powers.trigger('p', pyre, pyre.kit, 'break', { enemy: e }); step(yv.time + 0.05);
  near(e.def.hp - e.hp, Math.round(yv.time / yv.every) * yv.damage, 'every burn');
  // A second break while it burns lights it afresh, not a second pillar.
  fresh(); powers.trigger('p', pyre, pyre.kit, 'break', { enemy: e }); step(yv.cooldown + 0.05);
  powers.trigger('p', pyre, pyre.kit, 'break', { enemy: e });
  assert.equal(powers.running.filter(r => r.enemy === e).length, 1, 'one pillar a boss'); powers.reset();
  // An Nth blow with nothing to strike leaves the next one due.
  fresh(); const gone = holder(['static-edge']), dead = { ...e, alive: () => false };
  for (let i = 1; i < ev.hits; i++) powers.trigger('d', gone, gone.kit, 'hits', { enemy: e, strike: blow });
  powers.trigger('d', gone, gone.kit, 'hits', { enemy: dead, strike: blow });
  powers.trigger('d', gone, gone.kit, 'hits', { enemy: e, strike: blow });
  assert.equal(fired.filter(f => f.power === 'static-edge').length, 1, 'the spark waits for the next blow');

  // Ember Twin: a flask calls it; while it is out each landed blow comes again at `share`, as its own event; then it
  // goes, and a new fight sends it away.
  fresh(); const twin = holder(['ember-twin']), wv = BY['ember-twin'].levels[0];
  assert.ok(twin.kit.whens.has('hits') && twin.kit.whens.has('flask'), 'the twin hears blows and flasks');
  powers.trigger('w', twin, twin.kit, 'hits', { enemy: e, strike: blow }); step(0.2); assert.equal(e.hp, e.def.hp, 'no twin yet');
  powers.trigger('w', twin, twin.kit, 'flask', {}); assert.ok(powers.twinOf('w'), 'the twin is out');
  for (let i = 0; i < 3; i++) { powers.trigger('w', twin, twin.kit, 'hits', { enemy: e, strike: blow }); step(0.2); }
  near(e.def.hp - e.hp, 3 * blow.damage * wv.share, 'three echoes'); assert.deepEqual(fired.filter(f => f.strike).map(f => f.strike), [1, 2, 3]);
  step(wv.time); const after = e.hp;
  powers.trigger('w', twin, twin.kit, 'hits', { enemy: e, strike: blow }); step(0.2); assert.equal(e.hp, after, 'gone when its time is up');
  powers.reset(); assert.equal(powers.twinOf('w'), null);

  // Grave Hound: a parry calls it on the parried boss. It runs to the boss's flank, draws its eye for `draw` s once
  // it has arrived (the boss fights its decoy, and finishes an attack begun on it), bites every `every` s, and goes
  // when its time is up. One summon a holder: the twin can't come while it is out.
  const ES = g('ES'), K = g('CONFIG').abilities.summons;
  fresh(); e.state = ES.IDLE; e.frozen = 0;
  const hound = holder(['grave-hound', 'ember-twin']), hv = BY['grave-hound'].levels[0];
  powers.trigger('h', hound, hound.kit, 'parry', { enemy: e });
  const out = powers.summonOf('h'); assert.ok(out && out.kind === 'hound', 'the hound is out');
  assert.equal(fired.filter(f => f.power === 'grave-hound').length, 1, 'its call is an event');
  assert.equal(powers.decoy(e), null, 'not drawing it before it has arrived');
  powers.trigger('h', hound, hound.kit, 'flask', {}); assert.equal(powers.twinOf('h'), null, 'no twin while the hound is out');
  step(K.arrive + 0.05);
  const lure = powers.decoy(e); assert.ok(lure && lure.decoy, 'arrived: it draws the boss');
  assert.ok(Math.hypot(lure.x - e.x, lure.z - e.z) < e.radius + K.hound.gap + 0.6, 'beside the boss');
  assert.ok(Math.hypot(lure.x - hound.x, lure.z - hound.z) > 1, 'not where its holder stands');
  assert.equal(fired.filter(f => f.power === 'grave-hound' && f.draw).length, 1, 'the draw is an event');
  // The draw ends, but not mid-attack.
  e.state = ES.WINDUP; e.attack = e.def.attacks[0]; e.hitIndex = 0; e.stateTime = 0;
  step(hv.draw); assert.ok(powers.decoy(e), 'an attack begun on it ends on it');
  e.state = ES.IDLE; step(1 / 60); assert.equal(powers.decoy(e), null, 'then the boss is free');
  assert.ok(e.hp < e.def.hp, 'it bites'); const bit = fired.filter(f => f.power === 'grave-hound' && f.strike).length;
  step(hv.every * 3 + 0.01); assert.equal(fired.filter(f => f.power === 'grave-hound' && f.strike).length, bit + 3, 'a bite every `every` s');
  // Drawn, the boss turns on it: its own step faces the decoy.
  const turned = e.yaw; for (let i = 0; i < 30; i++) e.update(1 / 60, lure);
  const face = Math.atan2(lure.x - e.x, lure.z - e.z), off = a => Math.abs(Math.atan2(Math.sin(a - face), Math.cos(a - face)));
  assert.ok(off(e.yaw) <= off(turned) + 1e-6, 'the boss turns toward the hound');
  step(hv.time); assert.equal(powers.summonOf('h'), null, 'gone when its time is up');
  powers.trigger('h', hound, hound.kit, 'flask', {}); assert.ok(powers.twinOf('h'), 'and the twin may come');
  step(K.arrive + 0.05); assert.ok(powers.decoy(e), 'the twin draws the boss too');
  assert.equal(powers.decoy(e).height, K.twin.height, 'its decoy stands as tall as the twin (sight lines, shots)');
  // A summon goes with its holder, and lets the boss go.
  hound.hp = 0; hound.state = g('PS').DEAD; step(1 / 60);
  assert.equal(powers.twinOf('h'), null, 'gone with its holder'); assert.equal(powers.decoy(e), null, 'and the boss is free');
  powers.reset();

  // Stone Guardian: low health raises it once a fight, beside the boss (it doesn't run there); it holds the boss
  // `draw` s and bashes every `every` s. Lancer of Ash: a break sends it charging from its holder; it thrusts.
  fresh(); e.state = ES.IDLE;
  const guard = holder(['stone-guardian']), sgv = BY['stone-guardian'].levels[0];
  powers.trigger('g', guard, guard.kit, 'low', {}); assert.equal(powers.summonOf('g'), null, 'no guardian while its holder is well');
  guard.hp = guard.maxHp * sgv.below * 0.9; powers.trigger('g', guard, guard.kit, 'low', {});
  const sgs = powers.summonOf('g'); assert.ok(sgs && sgs.kind === 'guardian', 'low health raises the guardian');
  assert.ok(Math.hypot(sgs.x - e.x, sgs.z - e.z) < e.radius + K.guardian.gap + 0.05, 'it rises beside the boss');
  step(K.arrive + 0.05);
  assert.ok(powers.decoy(e) && powers.decoy(e).height === K.guardian.height, 'it draws the boss');
  assert.ok(e.hp < e.def.hp, 'it bashes');
  step(sgv.draw - 0.2); assert.ok(powers.decoy(e), `it holds the boss ${sgv.draw} s`);
  step(0.3); assert.equal(powers.decoy(e), null, 'then lets it go');
  const bashed = fired.filter(f => f.power === 'stone-guardian' && f.strike).length;
  step(sgv.every * 2); assert.equal(fired.filter(f => f.power === 'stone-guardian' && f.strike).length, bashed + 2, 'a bash every `every` s');
  step(sgv.time); assert.equal(powers.summonOf('g'), null, 'gone when its time is up');
  powers.trigger('g', guard, guard.kit, 'low', {}); assert.equal(powers.summonOf('g'), null, 'once a fight');
  // Low health is told once: with the twin out then, the guardian waits for it to go, and rises after.
  powers.reset(); fresh(); e.state = ES.IDLE;
  const both = holder(['stone-guardian', 'ember-twin']), bwv = BY['ember-twin'].levels[0];
  powers.trigger('b', both, both.kit, 'flask', {}); assert.ok(powers.twinOf('b'), 'the twin is out');
  both.hp = both.maxHp * sgv.below * 0.9; powers.trigger('b', both, both.kit, 'low', {});
  assert.equal(powers.summonOf('b').kind, 'twin', 'no guardian while the twin is out');
  step(bwv.time + 0.1); assert.equal(powers.summonOf('b')?.kind, 'guardian', 'the guardian rises when the twin is gone');
  powers.reset(); fresh(); e.state = ES.IDLE;
  const lan = holder(['ash-lancer']), alv = BY['ash-lancer'].levels[0];
  powers.trigger('l', lan, lan.kit, 'break', { enemy: e });
  const als = powers.summonOf('l'); assert.ok(als && als.kind === 'lancer', 'a break sends the lancer');
  assert.ok(Math.hypot(als.x - lan.x, als.z - lan.z) < 1e-6, 'from its holder');
  step(1); assert.ok(Math.hypot(als.x - e.x, als.z - e.z) - e.radius <= K.lancer.reach, 'it charges to the boss');
  assert.ok(e.hp < e.def.hp && fired.some(f => f.power === 'ash-lancer' && f.draw), 'it thrusts and draws the boss');
  powers.trigger('l', lan, lan.kit, 'break', { enemy: e }); assert.equal(fired.filter(f => f.power === 'ash-lancer' && !f.strike && !f.draw).length, 1, 'its cooldown spaces it');
  powers.reset();

  // Second Wind (a rare's perk): a flask drunk gives stamina back.
  const wind = holder(['second-wind']); wind.stamina = 0; wind.useItem('flask');
  near(wind.stamina, wind.maxStamina * BY['second-wind'].levels[0].stamina, 'Second Wind');
}

// ---- 3. The offers -------------------------------------------------------------------------------------------------
{
  const sim = createSimulation({ seed: 11 }), g = realm(sim), BY = g('ABILITY_BY_ID'), B = g('CONFIG').abilities;
  const rarity = {};
  for (let round = 0; round < 300; round++) {
    if (round % 30 === 0) {   // a new run: the teammate takes a legendary first
      sim.start('arena', 'ostrey');
      while (!sim.abilities().mate?.some(id => BY[id].rarity === 'legendary')) {
        sim.offerAbilities(['mate'], false, 1); const o = sim.abilityOffer('mate');
        sim.pickAbility('mate', o.find(id => BY[id].rarity === 'legendary') || o[0]);
      }
    }
    sim.offerAbilities(['me'], false, round % 2, round % 8);
    const offer = sim.abilityOffer('me'), held = sim.abilities().me || [];
    assert.equal(offer.length, B.offer + round % 2, 'three cards, four after a swift kill');
    assert.equal(new Set(offer).size, offer.length, 'no card twice');
    if (round % 2) assert.notEqual(BY[offer.at(-1)].rarity, 'common', "a swift kill's extra card is never common");
    for (const id of offer) {
      assert.ok(held.filter(h => h === id).length < BY[id].levels.length, 'never past its last level');
      assert.ok(!(BY[id].rarity === 'legendary' && sim.abilities().mate.includes(id)), "never a teammate's legendary");
      rarity[BY[id].rarity] = (rarity[BY[id].rarity] || 0) + 1;
    }
    sim.pickAbility('me', offer[round % offer.length]);
  }
  assert.ok(rarity.common > rarity.rare && rarity.rare > rarity.legendary && rarity.legendary > 0, `the odds: ${JSON.stringify(rarity)}`);
  assert.equal(sim.pickAbility('me', 'keen-edge'), false, 'no offer open');

  // A legendary on a teammate's open offer is not offered too, nor taken once a teammate holds it.
  sim.start('arena', 'ostrey');
  let shared = null;
  for (let i = 0; i < 400 && !shared; i++) {
    sim.offerAbilities(['mate'], false, 1, 40); shared = sim.abilityOffer('mate').find(id => BY[id].rarity === 'legendary') || null;
    if (!shared) sim.pickAbility('mate', sim.abilityOffer('mate')[0]);
  }
  assert.ok(shared, 'a legendary offered');
  for (let i = 0; i < 40; i++) { sim.offerAbilities(['me'], false, 1, 40); assert.ok(!sim.abilityOffer('me').includes(shared), "never a legendary on a teammate's offer"); sim.pickAbility('me', sim.abilityOffer('me')[0]); }

  // Vengeance on the server: a fight's first pose is no wound.
  sim.start('arena', 'ostrey');
  for (let i = 0; i < 400 && !(sim.abilities().me || []).includes('vengeance'); i++) {
    sim.offerAbilities(['me'], false, 1, 8); const o = sim.abilityOffer('me'); sim.pickAbility('me', o.includes('vengeance') ? 'vengeance' : o[0]);
  }
  assert.ok(sim.abilities().me.includes('vengeance'), 'Vengeance taken');
  const R = sim.inspect(), full = sim.maxHpOf('me');
  sim.setPlayers([{ id: 'me', x: 0, y: 0, z: 0, yaw: 0, hp: full, state: 'idle', poseAge: 0 }]);
  sim.notePose('me', full);
  assert.equal(R.holderOf('me').perk.vengeance, 0, 'no free Vengeance at the start of a fight');
  sim.notePose('me', full - 10);
  assert.ok(R.holderOf('me').perk.vengeance > 0, 'a real wound wakes it');
}

// ---- 4. Through the server -----------------------------------------------------------------------------------------
async function peer(origin, name) {
  const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [];
  ws.on('message', data => queue.push(JSON.parse(data)));
  const next = async type => {
    for (let i = 0; i < 500; i++) {
      const at = queue.findIndex(m => m.type === type);
      if (at >= 0) return queue.splice(at, 1)[0];
      await wait(20);
    }
    throw new Error('Timed out: ' + type);
  };
  const send = m => ws.send(JSON.stringify(m));
  await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name });
  return { ws, send, next, queue, id: (await next('welcome')).id };
}
(async () => {
  const app = createServer(), peers = [], g = realm(app.sim), B = g('CONFIG').abilities, BY = g('ABILITY_BY_ID'), S = g('PLAYER_DEF').stats;
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  let session;
  const pose = (p, extra = {}) => p.send({ type: 'pose', epoch: session.epoch, pose: {
    ...session.spawn, hp: S.maxHp, state: 'idle', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true, ...extra } });
  const flush = async p => { p.send({ type: 'ping' }); await p.next('pong'); };
  const finishFight = () => {
    for (const e of app.sim.inspect().Game.enemies) { e.hp = 0; e.die(); }
    app.sim.tick(Math.max(C.bossVictoryDelay, C.leaderboardDelay + C.leaderboardTime));
  };
  // Each player's offer is set to known abilities (the draw itself is covered above).
  const forced = new Map(), offer = app.sim.offerAbilities;
  // The players' offers first, set to `forced`, then the bots': a bot takes one at once, and with the forced offers
  // open it never takes a legendary the test hands a player (it did now and then, at random, and broke Time Rift's pick).
  app.sim.offerAbilities = (ids, withBots = true, ...rest) => {
    offer(ids, false, ...rest);
    for (const [id, list] of forced) { const o = app.sim.abilityOffer(id); if (o) o.splice(0, o.length, ...list); }
    if (withBots) offer(app.sim.botList().map(x => x.id), false, ...rest);
  };
  try {
    const a = await peer(origin, 'Ash'), b = await peer(origin, 'Ember'); peers.push(a, b);
    const owner = [a, b].find(p => p.id === app.leader);
    const bosses = app.sim.catalog().bosses.map(e => e.id), opening = [bosses[0], bosses[3], bosses[5], bosses[7]];
    app.sim.addBot();   // a test player beside Ash and Ember: since pass 52 no bot fills a party
    owner.send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id, opening });
    session = (await a.next('start')).session; await b.next('start');
    assert.deepEqual(session.abilities, {}, 'a run starts with no abilities');
    const bot = app.sim.botList()[0].id;
    for (const p of [a, b]) { p.send({ type: 'ready', epoch: session.epoch }); pose(p); }
    await flush(a); await flush(b);

    // Round one: a stranger's id and a wrong one are refused; one pick a round; the fight waits for both.
    forced.set(a.id, ['keen-edge', 'iron-blood', 'meteor-fall']); forced.set(b.id, ['quick-breath', 'blood-moon', 'time-rift']);
    finishFight();
    const offerA = await a.next('abilities'); await b.next('abilities');
    assert.deepEqual(offerA.offer, forced.get(a.id)); assert.deepEqual(offerA.held, []);
    assert.ok(offerA.left > B.pickTime - 1 && offerA.left <= B.pickTime, 'the time left to choose');
    assert.equal(app.sim.abilities()[bot].length, 1, 'the bot chose at once');
    a.send({ type: 'pickAbility', epoch: session.epoch, id: 'blood-moon' }); a.send({ type: 'pickAbility', epoch: session.epoch, id: 'nothing' }); await flush(a);
    assert.equal(a.queue.some(m => m.type === 'abilities'), false, 'an ability outside the offer is refused');
    a.send({ type: 'pickAbility', epoch: session.epoch, id: 'keen-edge' });
    assert.deepEqual((await a.next('abilities')).held, ['keen-edge']);
    a.send({ type: 'pickAbility', epoch: session.epoch, id: 'iron-blood' }); await flush(a); await wait(200);
    assert.deepEqual([...app.sim.abilities()[a.id]], ['keen-edge'], 'one pick a round');
    assert.equal(app.session.gauntlet.number, 1, 'the next fight waits for everyone');
    b.send({ type: 'pickAbility', epoch: session.epoch, id: 'blood-moon' });
    session = (await a.next('start')).session; await b.next('start');
    assert.equal(session.gauntlet.number, 2);
    assert.deepEqual(session.abilities[a.id], ['keen-edge']); assert.deepEqual(session.abilities[b.id], ['blood-moon']);
    assert.equal(session.abilities[bot].length, 1, 'every body of the run, the bot included');
    assert.equal(app.sim.inspect().bots.get(bot).body.kit.ids.length, 1, "the bot's new body holds its ability");
    for (const p of [a, b]) { p.send({ type: 'ready', epoch: session.epoch }); pose(p); }
    await flush(a); await flush(b);

    // Keen Edge on the server: the same blow from both, a's harder.
    const boss = app.sim.inspect().Game.enemies[0], attack = Object.values(g('PLAYER_DEF').moveset.attacks).find(x => x.id !== 'execute');
    const blow = id => {
      app.sim.frame(true);   // drain earlier events
      app.sim.setPlayers([{ ...session.spawn, id, x: boss.x, z: boss.z + boss.radius + 0.5, y: boss.y, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
      boss.hp = boss.def.hp; assert.equal(app.sim.hit(id, { enemy: boss.netId, attack: attack.id, charge: 0 }), true, 'the blow lands');
      return app.sim.frame(true).events.filter(ev => ev.type === 'strike').pop().strike.damage;
    };
    near(blow(a.id) / blow(b.id), 1 + BY['keen-edge'].levels[0].damage, 'Keen Edge on the server');

    // Blood Moon claimed: refused while b is healthy, granted once low, then never again this fight.
    const claim = (id, msg, hp) => {
      app.sim.setPlayers([{ ...session.spawn, id, x: boss.x, z: boss.z + boss.radius + 0.5, y: boss.y, yaw: Math.PI, hp, state: 'idle', poseAge: 0, ...msg.pose }]);
      app.sim.frame(true); app.sim.abilityClaim(id, msg);
      return app.sim.frame(true).events.filter(ev => ev.type === 'abilityPower');
    };
    assert.equal(claim(b.id, { when: 'low' }, S.maxHp).length, 0, 'a healthy body has no Blood Moon');
    assert.equal(claim(a.id, { when: 'low' }, 1).length, 0, 'nor one without it');
    const moon = claim(b.id, { when: 'low' }, 1);
    assert.equal(moon.length, 1); assert.equal(moon[0].power, 'blood-moon'); assert.equal(moon[0].holder, b.id);
    assert.equal(claim(b.id, { when: 'low' }, 1).length, 0, 'once a fight');
    // A claim that comes ahead of the pose showing it waits a moment for that pose.
    app.sim.inspect().abilityPowers.reset();
    assert.equal(claim(b.id, { when: 'low' }, S.maxHp).length, 0, 'not low yet');
    app.sim.setPlayers([{ ...session.spawn, id: b.id, x: boss.x, z: boss.z + boss.radius + 0.5, y: boss.y, yaw: Math.PI, hp: 1, state: 'idle', poseAge: 0 }]);
    app.sim.tick(1 / 60);
    assert.equal(app.sim.frame(true).events.filter(ev => ev.type === 'abilityPower').length, 1, 'the late pose lets the claim through');

    // Round two: a takes Meteor Fall (a legendary a teammate holds is never offered); b lets the time run out.
    forced.set(a.id, ['meteor-fall', 'iron-blood', 'time-rift']); forced.set(b.id, ['iron-blood', 'keen-edge', 'quick-breath']);
    app.sim.abilityPickTime = 0.5;
    finishFight();
    await a.next('abilities'); await b.next('abilities');
    a.send({ type: 'pickAbility', epoch: session.epoch, id: 'meteor-fall' });
    session = (await a.next('start')).session; await b.next('start');
    assert.deepEqual(session.abilities[a.id], ['keen-edge', 'meteor-fall']);
    assert.deepEqual(session.abilities[b.id], ['blood-moon', 'iron-blood'], 'out of time: the first offered');
    for (const p of [a, b]) { p.send({ type: 'ready', epoch: session.epoch }); pose(p); }
    await flush(a); await flush(b);

    // Iron Blood: b's bigger bar is accepted; a's pose of the same health is not.
    const tall = S.maxHp * (1 + BY['iron-blood'].levels[0].maxHp);
    pose(a, { hp: tall }); pose(b, { hp: tall }); await flush(a); await flush(b);
    assert.notEqual(app.clients.get(a.id).pose.hp, tall, 'more health than the bar is refused');
    assert.equal(app.clients.get(b.id).pose.hp, tall, 'Iron Blood: the bigger bar');

    // Meteor Fall claimed: only on a jump heavy's landing, as the pose shows it; then through the socket, once.
    const boss2 = app.sim.inspect().Game.enemies[0];
    assert.equal(claim(a.id, { when: 'land', action: 'heavy' }, S.maxHp).length, 0, 'standing still is no landing');
    assert.equal(claim(a.id, { when: 'land', action: 'light', pose: { state: 'land', attack: 'jumpLight' } }, S.maxHp).length, 0, 'a jump light is no meteor');
    pose(a, { x: boss2.x, z: boss2.z + boss2.radius + 0.5, y: boss2.y, state: 'land', attack: 'jumpHeavy' }); await flush(a);
    boss2.hp = boss2.def.hp;
    a.send({ type: 'ability', epoch: session.epoch, when: 'land', action: 'heavy', seq: 1 }); await flush(a);
    assert.ok(boss2.hp < boss2.def.hp, 'the meteor lands on the boss');
    const after = boss2.hp;
    a.send({ type: 'ability', epoch: session.epoch, when: 'land', action: 'heavy', seq: 2 }); await flush(a);
    assert.equal(boss2.hp, after, 'cooling down');

    // Time Rift needs a blow that was really out near the dodger: a made-up one is refused.
    forced.set(b.id, ['time-rift']); app.sim.offerAbilities([b.id], false); assert.equal(app.sim.pickAbility(b.id, 'time-rift'), true);
    app.sim.setPlayers([{ ...session.spawn, id: b.id, x: boss2.x, z: boss2.z + boss2.radius + 0.5, y: boss2.y, yaw: Math.PI, hp: S.maxHp, state: 'roll', poseAge: 0 }]);
    assert.equal(app.sim.abilityClaim(b.id, { when: 'dodge', enemy: boss2.netId, serial: 999999 }), false, 'no such blow');
    // ...and the dodger rolling: a real blow claimed standing still is refused, once the wait is out.
    const swing = boss2.baseDef.attacks.find(x => !x.projectile && !x.rollOnly);
    boss2.frozen = 0; boss2.beginAttack(swing); app.sim.tick(1 / 60);
    const serial = boss2.netAttack, beside = state => app.sim.setPlayers([{ ...session.spawn, id: b.id, x: boss2.x, z: boss2.z + boss2.radius + 0.5, y: boss2.y, yaw: Math.PI, hp: S.maxHp, state, poseAge: 0 }]);
    beside('idle');
    assert.equal(app.sim.abilityClaim(b.id, { when: 'dodge', enemy: boss2.netId, serial }), false, 'standing still is no dodge');
    for (let i = 0; i < 40; i++) app.sim.tick(1 / 60);
    assert.ok(!(boss2.frozen > 0), 'nor once the wait is out');
    beside('roll');
    assert.equal(app.sim.abilityClaim(b.id, { when: 'dodge', enemy: boss2.netId, serial }), true, 'rolling through it');
    assert.ok(boss2.frozen > 0, 'Time Rift');
    boss2.frozen = 0;

    // Ember Twin claimed: only while the pose shows a drink; then the server echoes each of b's landed blows. Static
    // Edge counts the server's own accepted blows.
    for (const id of ['ember-twin', 'static-edge']) { forced.set(b.id, [id]); app.sim.offerAbilities([b.id], false); assert.equal(app.sim.pickAbility(b.id, id), true); }
    app.sim.inspect().abilityPowers.reset();
    assert.equal(claim(b.id, { when: 'flask' }, S.maxHp).length, 0, 'no flask, no twin');
    for (let i = 0; i < 40; i++) app.sim.tick(1 / 60);   // the unproven claim's wait runs out
    const called = claim(b.id, { when: 'flask', pose: { state: 'useItem' } }, S.maxHp);
    assert.equal(called.length, 1); assert.equal(called[0].power, 'ember-twin');
    const struck = () => {
      app.sim.frame(true);
      app.sim.setPlayers([{ ...session.spawn, id: b.id, x: boss2.x, z: boss2.z + boss2.radius + 0.5, y: boss2.y, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
      assert.equal(app.sim.hit(b.id, { enemy: boss2.netId, attack: attack.id, charge: 0 }), true, 'the blow lands');
      for (let i = 0; i < 10; i++) app.sim.tick(1 / 60);
      return app.sim.frame(true).events.filter(ev => ev.type === 'abilityPower');
    };
    const sparkEvery = BY['static-edge'].levels[0].hits, seen = [];
    for (let i = 0; i < sparkEvery; i++) { boss2.hp = boss2.def.hp; boss2.posture = 0; seen.push(...struck()); }
    assert.equal(seen.filter(ev => ev.power === 'ember-twin' && ev.strike).length, sparkEvery, "the twin echoes each of b's blows");
    assert.equal(seen.filter(ev => ev.power === 'static-edge').length, 1, 'a spark on the Nth blow the server accepted');
    console.log('ABILITIES: kits and levels, every common, rare and legendary on a body and the boss, the offers\' odds and limits, the pick through the server, server damage and health, the Blood Moon, Meteor Fall, Time Rift and Ember Twin claims, the hound biting, the guardian holding and the lancer charging, every summon drawing the boss, the twin echoing blows and Static Edge counting them on the server, the timed-out pick passed.');
  } finally { for (const p of peers) p.ws.terminate(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
