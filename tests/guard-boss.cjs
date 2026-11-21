'use strict';
// Guard II, on the boss (pass 137, design/abilities BUILD-ORDER batch 9): Mirror Ward bouncing the blow (held to the
// boss's heaviest), Waiting Blade's answering cut, Moon Dome's shelter and crossing, Hourglass's way back and health,
// Ash Husk drawing a blow and bursting or crumbling, Binding Seal spending an attack on nothing; and through the server:
// a ward and an answer claimed against a real blow, once, a dome told to every browser, a sealed attack told and framed.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

const sim = createSimulation({ seed: 7 }), g = realm(sim);
sim.start('arena', 'pillagerCaptain');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), PS = g('PS'), ES = g('ES');
const pressPerk = g('abilityPressPerk'), clocks = g('abilityClocks'), domes = g('abilityDomes'), powers = g('abilityPowers'), report = g('abilityReport');
const A = CONFIG.abilities, e = sim.inspect().Game.enemies[0], perks = [], said = [];
g('events').on('abilityPerk', ev => perks.push(ev));
g('events').on('abilityPower', ev => said.push(ev));
const holder = (ids, dz = 1) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const press = p => pressPerk(p, p.kit.pressed.guard, 0, 'self');
const v = id => BY[id].levels[0];
const blow = (damage = 20, more = {}) => ({ attackId: 'test', damage, poise: 10, knock: 3, hitstop: 0, ...more });
const told = perk => perks.filter(x => x.perk === perk).length;
const fresh = () => { e.hp = e.def.hp; e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.frozen = 0; e.sealed = 0; e.sealBy = null; e.sealNo = -1; e.cooldown = 99; };
const swing = e.baseDef.attacks.find(x => !x.projectile && !x.rollOnly && !x.seize);

const IDS = ['mirror-ward', 'ash-husk', 'moon-dome', 'waiting-blade', 'hourglass', 'binding-seal'];
for (const id of IDS) assert.ok(BY[id] && BY[id].rarity === 'rare' && BY[id].key === 'guard' && (BY[id].perk || BY[id].power).when === 'press' && BY[id].levels.length === 3, id);

// Mirror Ward: a blow from the front is taken whole and bounces (its share, times reflect.mul, held to the boss's
// heaviest); not a shot, not from behind; one blow; it runs out.
{
  fresh();
  const p = holder(['mirror-ward']), W = v('mirror-ward'); press(p);
  assert.ok(p.perk.ward > 0, 'the ward up');
  const hp = p.hp, res = p.takeHit(blow(20), e, { enemy: e, shot: false, area: false });
  assert.ok(res.warded && p.hp === hp, 'taken whole'); assert.equal(told('ward/bounce'), 1, 'the bounce told');
  const small = e.def.hp - e.hp; assert.ok(small > 0, 'the boss is struck by it');
  assert.ok(said.some(x => x.then === 'ward' && x.enemy === e), 'the bounce as a power');
  assert.equal(p.perk.ward, 0, 'one blow');
  fresh(); press(p); p.takeHit(blow(1e6), e, { enemy: e, shot: false, area: false });
  const big = e.def.hp - e.hp, top = Math.max(...e.baseDef.attacks.flatMap(a => a.hits.map(h => h.damage || a.damage || 0)));
  assert.ok(big > small && big <= top * W.share * A.reflect.mul * (e.damageMul || 1) * 1.0001, `a huge blow is held to the heaviest (${big})`);
  press(p); const h2 = p.hp; p.takeHit(blow(20), e, { enemy: e, shot: true, area: false });
  assert.ok(p.hp < h2, 'a shot is not bounced');
  press(p); const behind = holder(['mirror-ward'], -e.radius * 2 - 2); behind.yaw = Math.PI; pressPerk(behind, behind.kit.pressed.guard, 0, 'b');
  const h3 = behind.hp; behind.takeHit(blow(20), e, { enemy: e, shot: false, area: false });
  assert.ok(behind.hp < h3, 'a blow from behind lands');
  clocks(p.perk, W.time + 0.01); assert.ok(!(p.perk.ward > 0), 'it runs out');
}

// Waiting Blade: held still; a blow is answered (the cut on the boss, nothing taken); a blast or a shot is not.
{
  fresh();
  const p = holder(['waiting-blade']), B = v('waiting-blade'); press(p);
  assert.ok(p.root > 0 && p.rootKind === 'wait' && p.perk.wait > 0, 'the stance held');
  const hp = p.hp, res = p.takeHit(blow(20), e, { enemy: e, shot: false, area: false });
  assert.ok(res.answered && p.hp === hp, 'answered, nothing taken'); assert.equal(told('wait/answer'), 1, 'the answer told');
  assert.ok(e.def.hp - e.hp > 0 && said.some(x => x.then === 'answer'), `the cut lands (${e.def.hp - e.hp} of ${B.damage})`);
  assert.ok(!(p.root > 0) && !(p.perk.wait > 0), 'spent');
  p.setState(PS.IDLE); press(p); const h2 = p.hp; p.takeHit(blow(20), e, { enemy: e, shot: false, area: true });
  assert.ok(p.hp < h2, 'a blast is not answered');
}

// Moon Dome: shelters a body inside from a blast outside, not one inside; a shot crossing in is stopped at its skin; it ends.
{
  domes.clear();
  const p = holder(['moon-dome']), D = v('moon-dome'); press(p);
  assert.equal(domes.list.length, 1, 'raised'); assert.equal(domes.list[0].radius, D.radius, 'its radius');
  assert.ok(domes.shelter(p, p.x + D.radius + 3, p.y, p.z), 'a blast from outside kept off');
  assert.equal(domes.shelter(p, p.x + 0.3, p.y, p.z), null, 'one from inside lands');
  const f = domes.crossing(p.x + D.radius + 2, p.y + 1, p.z, -(D.radius + 2), 0, 0);
  assert.ok(f > 0 && f < 1, `a shot flying in meets the skin (${f})`);
  assert.equal(domes.crossing(p.x, p.y + 1, p.z, D.radius + 2, 0, 0), Infinity, 'a shot from inside flies out');
  domes.tick(D.time + 0.01); assert.equal(domes.list.length, 0, 'it ends');
}

// Hourglass: back to where it stood about `time` s ago, untouchable on the way, its health the better of then and now.
{
  const p = holder(['hourglass']), H = v('hourglass'), R = A.rewind, x0 = p.x, z0 = p.z;
  for (let i = 0; i < Math.round(H.time / R.every) + 2; i++) { p.x = x0 + i * 0.2; p.grounded = true; p.trailStep(R.every); }
  p.hp = 30; p.x += 0.2;
  const to = p.startRewind(H.time), want = x0 + 0.2 * (p.trail.n - Math.round(H.time / R.every));   // the place kept time/every steps back
  assert.ok(to && Math.abs(to.x - want) < 1e-9, `back along its way (${to && to.x}, ${want})`);
  assert.ok(p.invulnerable(), 'untouchable on the way');
  for (let i = 0; i < 60 && p.rewind; i++) p.rewindStep(1 / 60);
  assert.ok(!p.rewind && Math.abs(p.x - to.x) < 1e-9, 'arrived'); assert.ok(p.hp > 30, 'its health then'); assert.equal(told('rewind/end'), 1, 'the end told');
  const q = holder(['hourglass']); assert.equal(q.startRewind(H.time), null, 'nothing kept: nowhere to go');
}

// Ash Husk: it draws the boss's next attack; a blow meeting it bursts it on every enemy near; unstruck, it crumbles.
{
  fresh(); powers.reset();
  const p = holder(['ash-husk']), U = v('ash-husk'); said.length = 0;
  report(p, 'press', { key: 'guard', enemy: e });
  assert.equal(powers.husks.size, 1, 'a husk left'); powers.tick(1 / 60);
  assert.ok(powers.decoy(e), 'it draws the boss');
  const hb = e.hitbox; e.hitbox = { overlaps: () => true };
  powers.tick(1 / 60); e.hitbox = hb;
  assert.equal(powers.husks.size, 0, 'struck, it bursts');
  assert.ok(said.some(x => x.then === 'husk' && x.burst) && e.def.hp - e.hp > 0, `the burst wounds (${e.def.hp - e.hp} of ${U.damage})`);
  fresh(); report(p, 'press', { key: 'guard', enemy: e }); e.state = ES.DEAD;   // nothing to draw: it waits out its time
  const lure = powers.husks.get('self'); lure.lure = null;
  for (let t = 0; t < U.time + 0.1; t += 1 / 60) powers.tick(1 / 60);
  e.state = ES.IDLE;
  assert.ok(powers.husks.size === 0 && said.some(x => x.then === 'husk' && x.end === 'crumble'), 'unstruck, it crumbles');
}

// Binding Seal: the boss's next attack plays out and strikes nothing; it is told burning out, and its recovery is longer.
{
  fresh(); powers.reset(); said.length = 0;
  const p = holder(['binding-seal']), S = v('binding-seal');
  report(p, 'press', { key: 'guard', enemy: e });
  assert.ok(Math.abs(e.sealed - S.time) < 1e-9, 'sealed for its time');
  e.beginAttack(swing);
  assert.equal(e.sealNo, e.attackNo, 'this attack spent'); assert.equal(e.sealed, 0, 'the seal used');
  const run = () => {   // steps until the attack is over: whether a blow opened, and its time in recovery
    let boxed = false, rec = 0;
    for (let i = 0; i < 900 && e.attack === swing && e.alive(); i++) { e.update(1 / 60, p); if (e.hitbox) boxed = true; if (e.state === ES.RECOVER) rec += 1 / 60; }
    return { boxed, rec };
  };
  const sealed = run();
  assert.ok(!sealed.boxed, 'no blow opened'); assert.ok(sealed.rec > 0, 'it recovered');
  assert.equal(said.filter(x => x.then === 'seal' && x.sputter).length, 1, 'told burning out, once');
  fresh(); p.x = e.x + 40; e.beginAttack(swing); const plain = run();   // the same attack unsealed (its holder far off: nothing hit)
  assert.ok(plain.boxed && sealed.rec > plain.rec + 0.05, `a longer recovery sealed (${sealed.rec.toFixed(2)} s, ${plain.rec.toFixed(2)} s)`);
}

// Through the server: a ward claimed against a real blow bounces once; an answer too; a dome is told to every browser;
// a sealed attack is told and framed.
{
  fresh(); powers.reset(); domes.clear();
  const S = PLAYER_DEF.stats, id = 'ward';
  sim.registerPlayer(id, 'Ash');
  const place = (state = 'idle') => sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 0.8, yaw: Math.PI, hp: S.maxHp, state, poseAge: 0 }]);
  const claimPress = ability => {
    sim.giveAbilities(id, [ability]); place();
    const st = sim.inspect().holderOf(id).perk; st.charge.guard = v(ability).charge;
    return sim.abilityClaim(id, { when: 'press', key: 'guard' });
  };
  assert.equal(claimPress('mirror-ward'), true, 'a ward claimed');
  assert.equal(sim.abilityClaim(id, { when: 'ward', enemy: e.netId, serial: 12345, damage: 20 }), false, 'no such blow');
  e.beginAttack(swing); sim.tick(1 / 60); place();
  const serial = e.netAttack, hp = e.hp;
  assert.equal(sim.abilityClaim(id, { when: 'ward', enemy: e.netId, serial, damage: 1e9 }), true, 'a real blow bounced');
  const cap = Math.max(...swing.hits.map(h => h.damage || swing.damage || 0)) * (e.damageMul || 1) * v('mirror-ward').share * A.reflect.mul;
  assert.ok(e.hp < hp && hp - e.hp <= cap + 1e-6, `the boss struck, by no more than that attack's heaviest blow bounced (${hp - e.hp} of ${cap})`);
  assert.equal(sim.abilityClaim(id, { when: 'ward', enemy: e.netId, serial, damage: 20 }), false, 'once');
  fresh(); sim.tick(1 / 60);
  assert.equal(claimPress('waiting-blade'), true, 'a stance claimed');
  e.beginAttack(swing); sim.tick(1 / 60); place();
  assert.equal(sim.abilityClaim(id, { when: 'answer', enemy: e.netId, serial: e.netAttack }), true, 'an answer claimed');
  assert.equal(sim.abilityClaim(id, { when: 'answer', enemy: e.netId, serial: e.netAttack }), false, 'once');
  fresh(); sim.tick(1 / 60); sim.frame(true);
  assert.equal(claimPress('moon-dome'), true, 'a dome claimed');
  const told2 = sim.frame(true).events.find(x => x.type === 'guardDome');
  assert.ok(told2 && told2.holder === id && told2.radius === v('moon-dome').radius && domes.list.length === 1, 'the dome told to every browser');
  fresh(); domes.clear(); sim.tick(1 / 60); sim.frame(true);
  assert.equal(claimPress('binding-seal'), true, 'a seal claimed');
  assert.ok(e.sealed > 0, 'sealed on the server');
  e.cooldown = 0; e.beginAttack(swing);
  let framed = false, sputter = false;
  for (let i = 0; i < 300 && e.attack === swing; i++) {
    place(); sim.tick(1 / 60);
    const f = sim.frame(true), s = f.enemies && f.enemies.find(x => x.id === e.netId);
    if (s && s.seal) framed = true;
    if (f.events.some(x => x.type === 'abilityPower' && x.sputter)) sputter = true;
  }
  assert.ok(framed, 'the frame says the attack is sealed'); assert.ok(sputter, 'its burning out told to every browser');
}
console.log('GUARD BOSS: Mirror Ward\'s bounce held to the heaviest, Waiting Blade\'s answer, Moon Dome\'s shelter and crossing, Hourglass\'s way back, Ash Husk\'s burst and crumble, Binding Seal\'s spent attack, and through the server a ward and an answer claimed once, a dome told and a seal framed, passed.');
