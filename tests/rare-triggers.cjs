'use strict';
// The rares' new triggers (pass 122, design/abilities BUILD-ORDER batch 5): Riptide's wave along a counter, Moonfall
// Cut's crescent ahead of a landing, Iron Cyclone's ring on a string's heavy, Petal Storm on a Finishing Blow's end
// (alone and on the server), Ironclad's unshaken drink, and Hunting Call's mark, set by the summon and spent by the
// holder's blow; and the server's check of a person's comboHeavy claim.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);

const sim = createSimulation({ seed: 5 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), powers = g('abilityPowers'), CONFIG = g('CONFIG');
const PS = g('PS'), ES = g('ES'), e = sim.inspect().Game.enemies[0], fired = [], perks = [];
g('events').on('abilityPower', ev => fired.push(ev));
g('events').on('abilityPerk', ev => perks.push(ev));
const holder = (ids, dz = 1) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const fresh = () => { e.hp = e.def.hp; e.state = ES.IDLE; fired.length = 0; perks.length = 0; powers.reset(); };
const step = s => { for (let t = 0; t < s - 1e-9; t += 1 / 60) powers.tick(1 / 60); };
const lost = () => e.def.hp - e.hp;
const v = id => BY[id].levels[0];

for (const id of ['riptide', 'moonfall-cut', 'iron-cyclone', 'petal-storm', 'ironclad', 'hunting-call'])
  assert.ok(BY[id] && BY[id].rarity === 'rare' && BY[id].levels.length === 3, id);

// ---- The powers on the boss ----
{
  // Riptide: on a counter, through the boss along the line from the holder.
  fresh(); const r = holder(['riptide']);
  powers.trigger('r', r, r.kit, 'counter', { enemy: e });
  near(lost(), v('riptide').damage, 'Riptide'); assert.equal(fired[0].then, 'wave');
  powers.trigger('r', r, r.kit, 'counter', { enemy: e });
  near(lost(), v('riptide').damage, 'one wave a swing, however many it lands on');

  // Moonfall Cut: on a light jump attack's landing, only along the holder's facing.
  const C = CONFIG.abilities.crescent;
  fresh(); const m = holder(['moonfall-cut'], 1);   // facing the boss (yaw PI: -z)
  powers.trigger('m', m, m.kit, 'land', { x: m.x, y: m.y, z: m.z, action: 'heavy' });
  assert.equal(lost(), 0, 'a jump heavy is no crescent');
  powers.trigger('m', m, m.kit, 'land', { x: m.x, y: m.y, z: m.z, action: 'light' });
  near(lost(), v('moonfall-cut').damage, 'Moonfall Cut ahead');
  fresh(); m.yaw = 0;   // turned away
  powers.trigger('m', m, m.kit, 'land', { x: m.x, y: m.y, z: m.z, action: 'light' });
  assert.equal(lost(), 0, 'nothing behind the holder'); assert.equal(fired.length, 1, 'drawn all the same');
  fresh(); const far = holder(['moonfall-cut'], C.reach + 1);
  powers.trigger('f', far, far.kit, 'land', { x: far.x, y: far.y, z: far.z, action: 'light', yaw: Math.PI });
  assert.equal(lost(), 0, 'out of its reach');
  fresh(); powers.trigger('f', far, far.kit, 'land', { x: e.x + e.radius + C.width + 1, y: far.y, z: far.z - C.reach, action: 'light', yaw: Math.PI });
  assert.equal(lost(), 0, 'beside its line');

  // Iron Cyclone: within its radius of the holder, then its cooldown.
  fresh(); const c = holder(['iron-cyclone'], 1);
  powers.trigger('c', c, c.kit, 'comboHeavy', { x: c.x, y: c.y, z: c.z });
  near(lost(), v('iron-cyclone').damage, 'Iron Cyclone');
  powers.trigger('c', c, c.kit, 'comboHeavy', { x: c.x, y: c.y, z: c.z }); near(lost(), v('iron-cyclone').damage, 'cooling down');
  fresh(); const out = holder(['iron-cyclone'], v('iron-cyclone').radius + 0.5);
  powers.trigger('o', out, out.kit, 'comboHeavy', { x: out.x, y: out.y, z: out.z });
  assert.equal(lost(), 0, 'out of its radius');

  // Petal Storm: round the finished boss.
  fresh(); const s = holder(['petal-storm'], 6);
  powers.trigger('s', s, s.kit, 'finisher', { enemy: e, x: e.x, y: e.y, z: e.z });
  near(lost(), v('petal-storm').damage, 'Petal Storm round the boss, its holder far off');
}

// ---- The body's own triggers ----
{
  const isComboHeavy = g('isComboHeavy'), A = PLAYER_DEF.moveset.attacks;
  assert.ok(['finisher1', 'finisher2', 'finisher3', 'finisher4'].every(id => isComboHeavy(A[id])), 'every string heavy');
  assert.ok(!isComboHeavy(A.heavy) && !isComboHeavy(A.light4), 'a plain heavy, a light: no');

  // A string's heavy reaching its blow reports comboHeavy once, landed or not.
  const heard = [], c = holder(['iron-cyclone'], 3);
  c.onAbility = (when, ctx) => heard.push(when);
  c.ctl = new Proxy({}, { get: () => () => false });
  c.startAttack(A.finisher1, { x: 0, z: 0, has: false }, false, []);
  for (let i = 0; i < 60 && c.state === PS.ATTACK; i++) c.update(1 / 60, { x: 0, z: 0, has: false }, [], null);
  assert.deepEqual(heard, ['comboHeavy'], 'a string heavy, once');
  heard.length = 0; c.startAttack(A.heavy, { x: 0, z: 0, has: false }, false, []);
  for (let i = 0; i < 90 && c.state === PS.ATTACK; i++) c.update(1 / 60, { x: 0, z: 0, has: false }, [], null);
  assert.deepEqual(heard, [], 'a plain heavy: nothing');

  // Ironclad: a flask begun, the blows that land in its time hurt but never knock or flinch; after, they do again.
  const t = holder(['ironclad'], 2), T = v('ironclad').time, blow = { damage: 10, knock: 6, poise: 0, heavy: true };
  t.inventory.flask = t.inventory.flask || { count: 1 }; t.inventory.flask.count = Math.max(1, t.inventory.flask.count);
  t.useItem('flask');
  near(t.perk.unshaken, T, 'its time starts with the drink');
  assert.ok(perks.some(p => p.body === t && p.perk === 'flask/unshaken'), 'told');
  const hp = t.hp; t.takeHit(blow, e);
  near(hp - t.hp, 10, 'the damage lands');
  assert.equal(t.state, PS.USE_ITEM, 'the drink goes on'); assert.equal(t.kx, 0, 'no knock'); assert.equal(t.kz, 0, 'no knock');
  assert.ok(perks.some(p => p.body === t && p.perk === 'unshaken/glance' && p.at), 'the glance told, with where from');
  g('abilityClocks')(t.perk, T + 0.01);
  t.takeHit(blow, e); assert.equal(t.state, PS.STAGGER, 'after its time a heavy staggers again');
  const plain = holder([], 2); plain.inventory.flask.count = 1; plain.useItem('flask');
  plain.takeHit(blow, e); assert.equal(plain.state, PS.STAGGER, 'without it a heavy cuts the drink');

  // Hunting Call: the summon's blow marks the boss; the holder's next landed blow on it does more, once.
  fresh();
  const houndId = Object.keys(BY).find(id => BY[id].power && BY[id].power.then === 'hound');
  const h = holder(['hunting-call', houndId], 1.5);
  const hound = h.kit.powers.find(pw => ['hound', 'guardian', 'lancer'].includes(pw.then));
  assert.ok(hound, 'a summon that strikes to test with');
  powers.trigger('h', h, h.kit, hound.when, { enemy: e, x: h.x, y: h.y, z: h.z, key: hound.key });
  for (let i = 0; i < 600 && !fired.some(f => f.strike); i++) powers.tick(1 / 60);
  const bite = fired.find(f => f.strike);
  assert.ok(bite && bite.mark, 'its blow carries the mark');
  assert.ok(h.perk.mark === e, 'the boss marked'); near(h.perk.markT, CONFIG.abilities.mark.keep, 'for its time');
  const strike = { attackId: 'light', damage: 20, poise: 0, knock: 0, hitstop: 0 }, hit = g('abilityStrike');
  const once = hit(h.kit, h.perk, e, strike);
  near(once.damage, 20 * (1 + v('hunting-call').damage), 'the marked blow'); near(once.marked, CONFIG.abilities.mark.keep, 'told, with its time left');
  assert.ok(h.perk.mark === null, 'spent');
  g('abilityBlocked')(h.perk, e, once);
  assert.ok(h.perk.mark === e, 'a blocked blow gives the mark back');
  hit(h.kit, h.perk, e, strike);
  assert.equal(hit(h.kit, h.perk, e, strike), strike, 'once');
  h.perk.mark = e; h.perk.markT = 0.1; g('abilityClocks')(h.perk, 0.2);
  assert.ok(h.perk.mark === null, 'a mark runs out');
}

// ---- Through the server ----
{
  sim.inspect().Game.enemies.forEach(x => { x.hp = x.def.hp; });
  const boss = sim.inspect().Game.enemies[0], S = PLAYER_DEF.stats, id = 'person';
  sim.registerPlayer(id, 'Ash');
  const place = (state, at = {}) => sim.setPlayers([{ id, x: boss.x, y: boss.y, z: boss.z + boss.radius + 0.5, yaw: Math.PI, hp: S.maxHp, state, poseAge: 0, ...at }]);
  const powersFired = () => sim.frame(true).events.filter(ev => ev.type === 'abilityPower');

  // Iron Cyclone claimed: only while the pose shows a string's heavy, then not again within the shortest string.
  sim.giveAbilities(id, ['iron-cyclone']); powers.reset();
  for (let i = 0; i < 70; i++) { place('idle'); sim.tick(1 / 60); }
  sim.frame(true);
  assert.equal(sim.abilityClaim(id, { when: 'comboHeavy' }), false, 'standing: waits');
  for (let i = 0; i < 40; i++) sim.tick(1 / 60);
  place('attack', { attack: 'heavy' }); sim.tick(1 / 60);
  assert.equal(sim.abilityClaim(id, { when: 'comboHeavy' }), false, 'a plain heavy: waits');
  for (let i = 0; i < 40; i++) sim.tick(1 / 60);
  place('attack', { attack: 'finisher2' }); sim.tick(1 / 60); sim.frame(true);
  boss.hp = boss.def.hp;
  assert.equal(sim.abilityClaim(id, { when: 'comboHeavy' }), true, 'the string heavy its pose shows');
  near(boss.def.hp - boss.hp, v('iron-cyclone').damage, 'the ring on the server');
  powers.reset();
  assert.equal(sim.abilityClaim(id, { when: 'comboHeavy' }), false, 'too soon after the last');

  // Petal Storm: the server's Finishing Blow ends and the petals fly round its foe.
  sim.giveAbilities(id, ['petal-storm']); powers.reset();
  place('attack', { attack: 'light' }); sim.tick(1 / 60); sim.frame(true);
  boss.hp = boss.def.hp * 10; boss.netExec = { player: id, until: 0, damage: 1 };
  sim.tick(1 / 60);
  const petals = powersFired().filter(ev => ev.power === 'petal-storm');
  assert.equal(petals.length, 1, 'once, as the blow ends'); assert.equal(petals[0].enemy, boss.netId, 'round its foe');
}
console.log('RARE TRIGGERS: Riptide, Moonfall Cut, Iron Cyclone, Petal Storm, Ironclad and Hunting Call (their blows, triggers and marks), and the server\'s cyclone and petals passed.');
