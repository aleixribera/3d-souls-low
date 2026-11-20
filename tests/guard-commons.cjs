'use strict';
// The guard and the run (pass 114, design/abilities BUILD-ORDER batch 3): Thorn Guard, Bitter Draught and Shatter Guard
// on the boss; Ringing Steel, Ash Veil, Grit, Kindling, Tithe, Glint and Hunter's Pace on their holder's body; Kindred
// Ember's revive and its offer; and the server's own counts (Kindling's and Tithe's points, a crack it sees).
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);

const sim = createSimulation({ seed: 7 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), powers = g('abilityPowers'), CONFIG = g('CONFIG'), PS = g('PS');
const K = CONFIG.abilities.commons, G = CONFIG.abilities.press.gain, e = sim.inspect().Game.enemies[0], fired = [], perks = [];
g('events').on('abilityPower', ev => fired.push(ev));
g('events').on('abilityPerk', ev => perks.push(ev.perk));
const holder = (ids, dz = 1) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const fresh = () => { e.hp = e.def.hp; e.frozen = 0; e.cracks = 0; fired.length = 0; perks.length = 0; powers.reset(); };
const step = s => { for (let t = 0; t < s - 1e-9; t += 1 / 60) powers.tick(1 / 60); };
const lost = () => e.def.hp - e.hp;
const v = id => BY[id].levels[0];
const IDS = ['ringing-steel', 'thorn-guard', 'ash-veil', 'bitter-draught', 'grit', 'kindling', 'tithe', 'glint', 'hunters-pace', 'kindred-ember', 'shatter-guard'];
for (const id of IDS) assert.ok(BY[id] && BY[id].rarity === 'common' && (BY[id].power || BY[id].perk) && BY[id].levels.length === 4, id);
const blow = (damage = 20) => ({ attackId: 'test', damage, poise: 0, knock: 0, hitstop: 0 });

// ---- 1. The powers on the boss ----
{
  fresh(); const t = holder(['thorn-guard']);
  powers.trigger('t', t, t.kit, 'block', { enemy: e });
  near(lost(), v('thorn-guard').damage, 'Thorn Guard');
  powers.trigger('t', t, t.kit, 'block', { enemy: e }); near(lost(), v('thorn-guard').damage, 'cooling down');
  step(v('thorn-guard').cooldown + 0.02); powers.trigger('t', t, t.kit, 'block', { enemy: e });
  near(lost(), 2 * v('thorn-guard').damage, 'again after its cooldown');

  fresh(); const b = holder(['bitter-draught']), B = v('bitter-draught');
  assert.ok(b.kit.whens.has('hits'), 'its burning blows are heard');
  powers.trigger('b', b, b.kit, 'hits', { enemy: e, strike: blow() }); assert.equal(lost(), 0, 'no flask, no burn');
  powers.trigger('b', b, b.kit, 'flask', {});
  assert.equal(b.perk.burn, B.hits, 'the flask lights the blade');
  for (let i = 0; i < B.hits + 2; i++) powers.trigger('b', b, b.kit, 'hits', { enemy: e, strike: blow() });
  near(lost(), B.hits * B.damage, `${B.hits} burning blows, no more`);
  assert.deepEqual(fired.filter(f => f.strike).map(f => f.strike), Array.from({ length: B.hits }, (_, i) => i + 1), 'each burn told by its number');
  powers.trigger('b', b, b.kit, 'flask', {}); powers.trigger('b', b, b.kit, 'flask', {});
  assert.equal(b.perk.burn, B.hits, 'a second flask renews, never adds');

  fresh(); const s = holder(['shatter-guard']);
  powers.trigger('s', s, s.kit, 'crack', { enemy: e });
  assert.equal(lost(), 0, 'the shards wait');
  step(K.shardDelay + 0.02); near(lost(), v('shatter-guard').damage, 'Shatter Guard');
  assert.equal(fired.filter(f => f.strike).length, 1, 'its burst told as it lands');
}

// ---- 2. The perks on their holder's body ----
{
  // Ringing Steel: a deflect banks one free dash, at most once a cooldown; the next dash spends it, not a charge.
  fresh(); const r = holder(['ringing-steel']);
  r.dashes = 0; assert.equal(r.canRoll(), false, 'no charge, no dash');
  g('abilityParried')(r, e);
  assert.equal(r.perk.bank, 1); assert.ok(r.canRoll(), 'the banked dash'); assert.ok(perks.includes('parry/freeDash'));
  r.startRoll({ has: false }); assert.equal(r.perk.bank, 0, 'spent'); assert.equal(r.dashes, 0, 'no charge taken'); assert.ok(perks.includes('freeDash/spent'));
  g('abilityParried')(r, e); assert.equal(r.perk.bank, 0, 'cooling down');
  r.dashes = 2; r.perk.bank = 1; r.setState(PS.IDLE); r.startRoll({ has: false }); assert.equal(r.dashes, 2, 'the bank goes first');

  // Ash Veil: once a fight, this low: the next blow does `cut` less, the one after it all.
  fresh(); const a = holder(['ash-veil']), A = v('ash-veil');
  a.hp = a.maxHp * (A.below + 0.05); a.abilityStep(1 / 60); assert.equal(a.perk.veil, 0, 'not low yet');
  a.hp = a.maxHp * A.below * 0.9; a.lastHp = a.hp; a.abilityStep(1 / 60); assert.equal(a.perk.veil, 1, 'low: the veil');
  let hp = a.hp; a.takeHit(blow(10), e); near(hp - a.hp, 10 * (1 - A.cut), 'the veiled blow');
  hp = a.hp; a.takeHit(blow(10), e); near(hp - a.hp, 10, 'the veil is spent');
  a.lastHp = a.hp; a.abilityStep(1 / 60); assert.equal(a.perk.veil, 2, 'once a fight');

  // Grit: losing health sets the skin to iron for `time` s.
  fresh(); const r2 = holder(['grit']), R = v('grit');
  r2.hp -= 5; r2.abilityStep(1 / 60); near(r2.perk.iron, R.time, 'iron');
  hp = r2.hp; r2.takeHit(blow(10), e); near(hp - r2.hp, 10 * (1 - R.cut), 'the iron blow');
  for (let i = 0; i < R.time * 60 + 2; i++) r2.abilityStep(1 / 60);
  assert.equal(r2.perk.iron, 0, 'and gone');
  hp = r2.hp; r2.setState(PS.IDLE); r2.takeHit(blow(10), e); near(hp - r2.hp, 10, 'flesh again');

  // Kindling and Tithe: their points with a deflect's and a Finishing Blow's; Glint wakes as a key fills.
  const keysFor = g('abilityKeysFor');
  const k = holder(['kindling', 'tithe', 'fire-burst']);
  assert.equal(keysFor(k.kit, 'parry'), v('kindling').charge); assert.equal(keysFor(k.kit, 'finisher'), v('tithe').charge);
  assert.equal(keysFor(holder(['fire-burst']).kit, 'parry'), 0, 'none without them');
  fresh(); const gl = holder(['glint', 'fire-burst']), full = gl.kit.pressed.strike.v.charge;
  gl.gainCharge(full - 1); assert.equal(gl.perk.glint, 0, 'not full yet');
  gl.gainCharge(5); assert.equal(gl.perk.glint, 1, 'full: the blade glints'); assert.ok(perks.includes('ready/empower'));
  gl.gainCharge(5); assert.equal(perks.filter(p => p === 'ready/empower').length, 1, 'a full key fills no more');
  const st = g('abilityStrike')(gl.kit, gl.perk, e, blow(10));
  near(st.damage, 10 * (1 + v('glint').damage), 'the glinting blow'); assert.ok(st.glint && !st.empowered, 'told as its own');
  assert.equal(gl.perk.glint, 0, 'spent');
  near(g('abilityStrike')(gl.kit, gl.perk, e, blow(10)).damage, 10, 'one blow only');

  // Hunter's Pace: the fight begins as its holder first moves: free dashes for `time` s.
  fresh(); const h = holder(['hunters-pace']);
  h.abilityStep(1 / 60); assert.equal(h.perk.hunt, 0, 'standing still: not begun');
  h.setState(PS.WALK); h.abilityStep(1 / 60); near(h.perk.hunt, v('hunters-pace').time, 'begun');
  h.dashes = 0; assert.ok(h.freeDash() && h.canRoll(), 'dashes free');
  h.perk.hunt = 0.01; h.abilityStep(1 / 60); h.abilityStep(1 / 60); assert.equal(h.perk.hunt, 0, 'over'); assert.equal(h.freeDash(), false);
  h.abilityStep(1 / 60); assert.ok(perks.filter(p => p === 'fightStart/freeDash').length === 1, 'once a fight');
}

// ---- 3. Through the server ----
{
  const boss = sim.inspect().Game.enemies[0], S = PLAYER_DEF.stats;
  sim.registerPlayer('a', 'Ash'); sim.registerPlayer('b', 'Birch');
  // Kindred Ember: the friend rises with more of their bar; without it, the usual.
  sim.giveAbilities('a', ['kindred-ember']); sim.giveAbilities('b', []);
  near(sim.reviveHealth('b', 'a'), sim.maxHpOf('b') * (CONFIG.revive.health + v('kindred-ember').heal), 'raised by Kindred Ember');
  near(sim.reviveHealth('a', 'b'), sim.maxHpOf('a') * CONFIG.revive.health, 'the usual');
  // Offered only in a run of two people or more.
  const offered = (ids, players) => {
    sim.setPlayers(players.map(id => ({ id, x: boss.x + 5, y: boss.y, z: boss.z + 5, yaw: 0, hp: S.maxHp, state: 'idle', poseAge: 0 })));
    let seen = false;
    for (let n = 0; n < 120 && !seen; n++) {
      sim.giveAbilities(ids[0], []); sim.offerAbilities(ids, false, 0, 0, false, n, false, ['common']);
      seen = (sim.abilityOffer(ids[0]) || []).includes('kindred-ember');
    }
    return seen;
  };
  assert.equal(offered(['a'], ['a']), false, 'alone: never offered');
  assert.equal(offered(['a'], ['a', 'b']), true, 'with a friend: offered');

}
console.log('GUARD COMMONS: Thorn Guard, Bitter Draught and Shatter Guard on the boss; Ringing Steel, Ash Veil, Grit, Kindling, Tithe, Glint and Hunter\'s Pace on the body; Kindred Ember\'s revive and offer.');
