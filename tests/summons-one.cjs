'use strict';
// Summons I (pass 141, design/abilities BUILD-ORDER batch 10): the Cinder Fox circling the boss and slashing it, the
// Lantern Spirit at its holder's shoulder whose fireballs land a beat later and heal its holder, the Lancer of Ash
// charging in from the arena's edge, the Grave Hound and the Stone Guardian unchanged in rule; and through the server
// (Boss Rush and Boss Rush alone run this session): a person's press calls each, every browser is told each slash and
// shot with the place it was made from, a landed fireball's heal rides the frame for the holder's browser, and the
// fox's and the lancer's draw names the summon's place (the snapshot's `lure`). Also: a ward claimed against a sealed
// attack is refused (BACKLOG, retro 140).
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

const sim = createSimulation({ seed: 7 }), g = realm(sim);
sim.start('arena', 'pillagerCaptain');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), ES = g('ES');
const powers = g('abilityPowers'), K = CONFIG.abilities.summons, e = sim.inspect().Game.enemies[0], said = [];
g('events').on('abilityPower', ev => said.push(ev));
const holder = (ids, dz = 3) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const v = id => BY[id].levels[0];
const fresh = () => { powers.reset(); said.length = 0; e.hp = e.def.hp; e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.frozen = 0; e.sealed = 0; e.sealBy = null; e.sealNo = -1; e.cooldown = 99; };
const step = (s, p) => { for (let t = 0; t < s - 1e-9; t += 1 / 60) { powers.tick(1 / 60); if (p) e.update(1 / 60, powers.decoy(e) || p); } };
const press = (id, p) => powers.trigger(id, p, p.kit, 'press', { enemy: e, key: 'summon' });

for (const id of ['cinder-fox', 'lantern-spirit']) assert.ok(BY[id] && BY[id].rarity === 'rare' && BY[id].key === 'summon' && BY[id].power.when === 'press' && BY[id].levels.length === 3, id);

// The Cinder Fox: it runs to the boss and circles it (its flank turning at `orbit`), slashing every `every` s, and draws
// the boss's eye once for `draw` s.
{
  fresh();
  const p = holder(['cinder-fox']), F = v('cinder-fox'); press('f', p);
  const s = powers.summonOf('f'); assert.ok(s && s.kind === 'fox', 'the fox is out');
  step(1.2);
  const a0 = Math.atan2(s.x - e.x, s.z - e.z), r0 = Math.hypot(s.x - e.x, s.z - e.z);
  assert.ok(Math.abs(r0 - (e.radius + K.fox.gap)) < 0.6, `beside the boss (${r0.toFixed(2)} m)`);
  step(0.5);
  const a1 = Math.atan2(s.x - e.x, s.z - e.z), turned = Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)));
  assert.ok(turned > 0.5, `it circles the boss (${turned.toFixed(2)} rad in 0.5 s)`);
  const slashes = said.filter(x => x.then === 'fox' && x.strike).length;
  assert.ok(slashes >= 1 && e.hp < e.def.hp, `it slashes (${slashes})`);
  assert.ok(said.some(x => x.then === 'fox' && x.draw), 'it draws the boss once');
  step(F.every * 3 + 0.02); assert.ok(said.filter(x => x.then === 'fox' && x.strike).length >= slashes + 2, 'a slash every `every` s');
  step(F.time); assert.equal(powers.summonOf('f'), null, 'gone when its time is up');
}

// The Lantern Spirit: at its holder's shoulder (not round the boss), it shoots from far off; each fireball lands
// distance / `shot` s on, wounding the boss and healing its holder `heal`; it never draws the boss.
{
  fresh();
  const p = holder(['lantern-spirit'], 8), L = v('lantern-spirit'); press('l', p);
  p.hp = p.maxHp * 0.5;
  const s = powers.summonOf('l'); assert.ok(s && s.kind === 'lantern', 'the lantern is out');
  step(K.arrive + 0.05);
  assert.ok(Math.hypot(s.x - p.x, s.z - p.z) < K.lantern.side + 0.3, 'at its holder\'s shoulder');
  const shot = said.find(x => x.then === 'lantern' && x.strike && x.flight > 0);
  assert.ok(shot, 'a fireball told with its flight');
  const dist = Math.hypot(e.x - s.x, e.z - s.z);
  assert.ok(Math.abs(shot.flight - dist / K.lantern.shot) < 0.05, `its flight is distance / shot (${shot.flight.toFixed(2)} s)`);
  assert.equal(e.hp, e.def.hp, 'nothing lands as it is fired');
  const hp = p.hp;
  step(shot.flight + 0.05);
  const landed = said.find(x => x.then === 'lantern' && x.heal);
  assert.ok(landed && landed.heal === L.heal && e.hp < e.def.hp, 'it lands on the boss, told with its heal');
  assert.ok(Math.abs(p.hp - (hp + p.maxHp * L.heal)) < 1e-6, `its holder healed ${L.heal} of the bar`);
  assert.ok(!said.some(x => x.then === 'lantern' && x.draw) && powers.decoy(e) === null, 'it never draws the boss');
  step(L.every * 2 + 1); assert.ok(said.filter(x => x.then === 'lantern' && x.heal).length >= 2, 'a shot every `every` s');
  // A shot whose boss is gone heals nothing.
  const n = said.filter(x => x.heal).length, h2 = p.hp;
  for (let i = 0; i < 300 && !s.shots.length; i++) step(1 / 60);
  assert.ok(s.shots.length > 0, 'a fireball in flight');
  e.hp = 0; e.state = ES.DEAD; step(1);
  assert.equal(said.filter(x => x.heal).length, n, 'no heal told'); assert.equal(p.hp, h2, 'no heal from a shot at nothing');
}
// Its last fireball, in flight as its time runs out, still lands (pass 141 review: the summon waited for none).
{
  fresh();
  const p = holder(['lantern-spirit'], 8); press('l', p);
  const s = powers.summonOf('l');
  for (let i = 0; i < 600 && !s.shots.length; i++) step(1 / 60);
  assert.ok(s.shots.length > 0, 'a fireball in flight');
  s.until = 0; const before = said.filter(x => x.heal).length; step(1 / 60);
  assert.equal(powers.summonOf('l'), null, 'its time is up');
  step(2); assert.equal(said.filter(x => x.heal).length, before + 1, 'that last fireball lands');
  assert.ok(!s.shots.length, 'and the lantern is gone after it');
}

// The Lancer of Ash: it starts `from` m off the boss on its holder's side, stands `hold` s, charges in, and has arrived
// by its own `arrive`.
{
  fresh();
  const p = holder(['ash-lancer']); press('a', p);
  const s = powers.summonOf('a'); assert.ok(s && s.kind === 'lancer', 'the lancer is out');
  const d0 = Math.hypot(s.x - e.x, s.z - e.z);
  assert.ok(Math.abs(d0 - K.lancer.from) < 1e-6, `it starts ${K.lancer.from} m off (${d0.toFixed(2)})`);
  assert.ok(Math.hypot(s.x - p.x, s.z - p.z) < K.lancer.from, 'on its holder\'s side');
  step(K.lancer.hold * 0.9); assert.ok(Math.abs(Math.hypot(s.x - e.x, s.z - e.z) - d0) < 1e-6, 'it stands as it forms');
  step(K.lancer.arrive - K.lancer.hold * 0.9 + 0.02);
  assert.ok(Math.hypot(s.x - e.x, s.z - e.z) - e.radius <= K.lancer.reach + 0.05, 'it has charged in by its arrive');
  step(1); assert.ok(said.some(x => x.then === 'lancer' && x.strike) && e.hp < e.def.hp, 'it thrusts');
}

// Through the server: a person's press calls each; every slash and shot is told with where it was made; the heal rides
// the frame; the fox's draw names its place.
{
  fresh();
  const S = PLAYER_DEF.stats, id = 'sum';
  sim.registerPlayer(id, 'Ash');
  const place = () => sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 4, yaw: Math.PI, hp: S.maxHp * 0.5, state: 'idle', poseAge: 0 }]);
  const claim = ability => {
    sim.giveAbilities(id, [ability]); place();
    const st = sim.inspect().holderOf(id).perk; st.charge.summon = v(ability).charge;
    return sim.abilityClaim(id, { when: 'press', key: 'summon' });
  };
  const run = (s, pick) => { const out = []; for (let t = 0; t < s; t += 1 / 60) { place(); sim.tick(1 / 60); for (const x of sim.frame(true).events) if (pick(x)) out.push(x); } return out; };
  const pressed = { fox: 'cinder-fox', lantern: 'lantern-spirit', lancer: 'ash-lancer', hound: 'grave-hound' };
  for (const [kind, ability] of Object.entries(pressed)) {
    fresh(); sim.tick(1 / 60); sim.frame(true);
    assert.equal(claim(ability), true, `${ability} pressed`);
    const told = run(3, x => x.type === 'abilityPower' && x.then === kind);
    assert.ok(told.some(x => !x.strike && !x.draw && x.power === ability), `${kind}: its call told`);
    const blows = told.filter(x => x.strike);
    assert.ok(blows.length >= 1 && blows.every(x => [x.x, x.z].every(Number.isFinite) && x.enemy === e.netId), `${kind}: each blow told with its place and enemy (${blows.length})`);
    if (kind === 'lantern') {
      assert.ok(blows.some(x => x.flight > 0), 'a fireball\'s flight told');
      const heal = blows.find(x => x.heal);
      assert.ok(heal && heal.heal === v(ability).heal && heal.holder === id, 'the heal rides the frame for its holder');
    }
    if (kind === 'fox' || kind === 'lancer') {
      const draw = told.find(x => x.draw);
      assert.ok(draw, `${kind}: its draw told`);
      run(1 / 60, () => false);
      const snap = sim.frame(true).enemies.find(x => x.id === e.netId);
      assert.ok(!e.alive() || (snap && snap.target === 'summon' && snap.lure && Number.isFinite(snap.lure.x)) || !powers.decoy(e), `${kind}: the snapshot names the summon's place`);
    }
  }
  // A ward claimed against a sealed attack: refused (it strikes nothing).
  fresh(); sim.tick(1 / 60);
  sim.giveAbilities(id, ['mirror-ward']); place();
  sim.inspect().holderOf(id).perk.charge.guard = v('mirror-ward').charge;
  assert.equal(sim.abilityClaim(id, { when: 'press', key: 'guard' }), true, 'a ward pressed');
  const swing = e.baseDef.attacks.find(x => !x.projectile && !x.rollOnly && !x.seize);
  e.sealed = 5; e.sealBy = { power: 'binding-seal', holder: 'x', v: v('binding-seal') }; e.cooldown = 0;
  sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 0.8, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
  e.beginAttack(swing); sim.tick(1 / 60);
  assert.equal(e.sealNo, e.attackNo, 'the attack sealed');
  assert.equal(sim.abilityClaim(id, { when: 'ward', enemy: e.netId, serial: e.netAttack, damage: 20 }), false, 'a ward against a sealed attack refused');
}
console.log('SUMMONS I: the fox circling and slashing, the lantern\'s fireballs landing late and healing its holder, the lancer charging in from 12 m, and through the server each call, blow, heal and draw told; a ward against a sealed attack refused, passed.');
