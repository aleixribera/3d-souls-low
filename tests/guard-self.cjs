'use strict';
// Guard I, on yourself (pass 134, design/abilities BUILD-ORDER batch 8): Iron Root's planted, lighter blows, Unbroken's
// floor, Vanishing Step's refill and untouchable time, Ember Mail's plates, Still Water's pool (its holder's rate, a
// teammate's share), Iron Stance's own deflects giving the Guard key nothing; and through the server: a vanished person
// is no target while another is there, and a pool is told to every browser.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);

const sim = createSimulation({ seed: 7 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), PS = g('PS'), ES = g('ES');
const pressPerk = g('abilityPressPerk'), clocks = g('abilityClocks'), pools = g('abilityPools'), gain = g('abilityGain'), powers = g('abilityPowers');
const A = CONFIG.abilities, e = sim.inspect().Game.enemies[0], perks = [];
g('events').on('abilityPerk', ev => perks.push(ev));
const holder = (ids, dz = 1) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const press = (p, id = 'self') => pressPerk(p, p.kit.pressed.guard, 0, id);
const v = id => BY[id].levels[0];
const blow = (damage = 20, more = {}) => ({ attackId: 'test', damage, poise: 10, knock: 3, hitstop: 0, ...more });
const told = perk => perks.filter(x => x.perk === perk).length;

const IDS = ['iron-root', 'unbroken', 'vanishing-step', 'ember-mail', 'still-water'];
for (const id of IDS) assert.ok(BY[id] && BY[id].rarity === 'rare' && BY[id].key === 'guard' && BY[id].perk.when === 'press' && BY[id].levels.length === 3, id);

// Iron Root: a blow does `cut` less and moves nothing (no flinch, no push); a grab still takes its holder; it runs out.
{
  const p = holder(['iron-root']), R = v('iron-root'); press(p);
  near(p.perk.rooted, R.time, 'rooted for its time');
  const hp = p.hp, x = p.x, z = p.z, res = p.takeHit(blow(20, { heavy: true }), e);
  near(hp - p.hp, 20 * (1 - R.cut), 'the blow cut'); assert.equal(p.state, PS.IDLE, 'no flinch, even from a heavy blow');
  assert.ok(res.rooted && p.x === x && p.z === z, 'nothing moves the body'); assert.equal(told('root/bite'), 1, 'the bite told');
  clocks(p.perk, R.time + 0.01); const hp2 = p.hp; p.takeHit(blow(20), e);
  near(hp2 - p.hp, 20, 'run out: the whole blow'); assert.notEqual(p.state, PS.IDLE, 'and a flinch');
}

// Unbroken: no blow and no burn takes its holder below the floor; the killing blow kneels it; run out, a blow kills.
{
  const p = holder(['unbroken']), U = v('unbroken'); press(p);
  p.hp = 10; const res = p.takeHit(blow(50), e);
  assert.equal(p.hp, A.undying.floor, 'held at the floor'); assert.ok(p.alive() && res.saved, 'alive, saved');
  assert.equal(p.state, PS.STAGGER, 'kneeling'); assert.ok(perks.some(x => x.perk === 'press/undying' && x.saved), 'the save told');
  p.loseHp(30); assert.equal(p.hp, A.undying.floor, 'a burn or a drain held too');
  p.hp = 50; p.takeHit(blow(20), e); near(p.hp, 30, 'a blow that leaves health is whole');
  clocks(p.perk, U.time + 0.01); p.hp = 10; p.setState(PS.IDLE); p.takeHit(blow(50), e);
  assert.ok(!p.alive() || p.hp <= 0, 'run out: the killing blow kills');
}

// Vanishing Step: every dash back; untouchable while it lasts; an attack ends it.
{
  const p = holder(['vanishing-step']); p.dashes = 0; press(p);
  assert.equal(p.dashes, CONFIG.player.dashCharges, 'dashes refilled');
  assert.ok(p.vanished() && p.invulnerable(), 'unseen, untouchable');
  p.setState(PS.ATTACK); assert.ok(!p.vanished(), 'an attack ends it'); assert.equal(told('vanish/end'), 1, 'the end told');
  const q = holder(['vanishing-step']); press(q); clocks(q.perk, v('vanishing-step').time + 0.01);
  assert.ok(!q.vanished(), 'it runs out');
}

// Ember Mail: each plate takes a blow whole; then blows land; a grab breaks every plate and takes its holder.
{
  const p = holder(['ember-mail']), M = v('ember-mail'); press(p);
  assert.equal(p.perk.plates, M.hits, `${M.hits} plate(s)`);
  let hp = p.hp; const res = p.takeHit(blow(30), e);
  assert.ok(res.plated && p.hp === hp, 'the plate took it whole'); assert.equal(told('armour/crack'), 1, 'the crack told');
  hp = p.hp; p.takeHit(blow(30), e); near(hp - p.hp, 30, 'no plates left: the blow lands');
  const two = holder(['ember-mail']); two.abilityLevels = { 'ember-mail': 2 };
  const l2 = BY['ember-mail'].levels[1]; pressPerk(two, { ...two.kit.pressed.guard, v: l2 }, 0);
  assert.equal(two.perk.plates, l2.hits, 'level II: two plates');
  two.takeHit(blow(10, { seize: { time: 1 } }), e); assert.equal(two.perk.plates, 0, 'a grab breaks them all');
  const t = holder(['ember-mail']); press(t); clocks(t.perk, M.time + 0.01); assert.equal(t.perk.plates, 0, 'unspent plates go at its end');
}

// Still Water: its holder heals `heal` over its time standing in it; another at shared.pool of that; none outside; it dries.
{
  pools.clear();
  const p = holder(['still-water']), W = v('still-water'); p.hp = 20; press(p);
  assert.equal(pools.list.length, 1, 'a pool laid');
  const other = holder([], 0.5); other.id = 'mate'; other.hp = 20;   // a teammate (the browser's own player is 'self')
  const far = holder([], W.radius + 3); far.hp = 20;
  p.poolStep(1); other.poolStep(1); far.poolStep(1);
  near(p.hp, 20 + p.maxHp * W.heal / W.time, 'its holder at the full rate');
  near(other.hp, 20 + other.maxHp * W.heal / W.time * A.shared.pool, 'another at its share');
  assert.equal(far.hp, 20, 'none outside it');
  const q = holder(['still-water']); press(q, 'q'); press(q, 'q'); assert.equal(pools.list.length, 2, 'one a holder (a new press moves it)');
  pools.tick(W.time + 0.01); assert.equal(pools.list.length, 0, 'it dries');
}

// Iron Stance: a deflect made only by the stance gives the Guard key nothing (the others still fill).
{
  const p = holder(['iron-stance', 'whirl-drill']); p.perk.charge.guard = 0; p.perk.charge.strike = 0;
  gain(p.kit, p.perk, 3, 'guard');
  assert.equal(p.perk.charge.guard, 0, 'the Guard key skipped'); assert.equal(p.perk.charge.strike, 3, 'the Strike key filled');
}

// Through the server: a vanished person is never chosen while someone else is there; a pool is told to every browser.
{
  powers.reset(); pools.clear();
  const S = PLAYER_DEF.stats, near1 = 'near', far1 = 'far';
  sim.registerPlayer(near1, 'Ash'); sim.registerPlayer(far1, 'Birch');
  const place = () => sim.setPlayers([
    { id: near1, x: e.x, y: e.y, z: e.z + e.radius + 2, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 },
    { id: far1, x: e.x + 6, y: e.y, z: e.z + e.radius + 6, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
  sim.giveAbilities(near1, ['vanishing-step']); sim.giveAbilities(far1, ['still-water']);
  place(); e.state = ES.IDLE; e.netTarget = null;
  for (let i = 0; i < 3; i++) { place(); sim.tick(1 / 60); } sim.frame(true);
  assert.equal(e.netTarget, near1, 'the nearer first');
  const st = sim.inspect().holderOf(near1).perk;
  st.charge.guard = v('vanishing-step').charge;
  assert.equal(sim.abilityClaim(near1, { when: 'press', key: 'guard' }), true, 'a vanish claimed');
  assert.ok(st.vanish > v('vanishing-step').time, 'the server counts it, with its slack');
  if (e.in && e.in('attacking')) e.state = ES.IDLE;
  place(); sim.tick(1 / 60);
  assert.equal(e.netTarget, far1, 'vanished: the boss turns to the other');
  const fst = sim.inspect().holderOf(far1).perk; fst.charge.guard = v('still-water').charge;
  assert.equal(sim.abilityClaim(far1, { when: 'press', key: 'guard' }), true, 'a pool claimed');
  const pool = sim.frame(true).events.find(x => x.type === 'guardPool');
  assert.ok(pool && pool.holder === far1 && pool.ability === 'still-water' && pool.radius === v('still-water').radius, 'the pool told to every browser');
  near(pool.rate, v('still-water').heal / v('still-water').time, 'at its rate');
  st.charge.guard = 0;
  assert.equal(sim.abilityClaim(near1, { when: 'press', key: 'guard' }), false, 'an empty key refused');
}
console.log('GUARD SELF: Iron Root\'s planted blows, Unbroken\'s floor, Vanishing Step\'s refill and untouchable time, Ember Mail\'s plates, Still Water\'s pool and share, Iron Stance\'s skipped key, and through the server a vanished person unchosen and a pool told, passed.');
