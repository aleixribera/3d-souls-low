'use strict';
// Mirror Shard (pass 117, design/abilities BUILD-ORDER batch 3): a deflected bolt flies back and strikes its shooter as
// it gets there. The power's timing, and the server's check of the claim (a shot it fired at this player, facing it,
// once a bolt). The bolt turning in the browser is the in-page test `mirror shard`.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);

const sim = createSimulation({ seed: 7 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), powers = g('abilityPowers'), CONFIG = g('CONFIG');
const e = sim.inspect().Game.enemies[0], fired = [], V = BY['mirror-shard'].levels[0];
g('events').on('abilityPower', ev => { if (ev.then === 'reflect') fired.push(ev); });
const fresh = () => { e.hp = e.def.hp; e.frozen = 0; fired.length = 0; powers.reset(); };
const lost = () => e.def.hp - e.hp;
assert.ok(BY['mirror-shard'].rarity === 'common' && BY['mirror-shard'].levels.length === 4);
assert.ok(g('ABILITY_CLAIMS').includes('parryShot'), 'claimed by the browser that saw it');

// ---- 1. The power: it waits out the bolt's way back, then strikes once ----
{
  fresh();
  const p = new Player(PLAYER_DEF, e.x, e.z + 8, Math.PI, e.y); p.grantAbilities(['mirror-shard']);
  assert.ok(p.kit.whens.has('parryShot'), 'its holder hears a deflected shot');
  powers.trigger('m', p, p.kit, 'parryShot', { enemy: e, flight: 0.3 });
  assert.equal(lost(), 0, 'nothing yet: the bolt is on its way back');
  assert.ok(fired.length === 1 && fired[0].flight === 0.3, 'told as it turns, with its flight');
  for (let i = 0; i < 17; i++) powers.tick(1 / 60);
  assert.equal(lost(), 0, 'still flying at 0.28 s');
  for (let i = 0; i < 3; i++) powers.tick(1 / 60);
  near(lost(), V.damage, 'it strikes as it arrives');
  assert.ok(fired.length === 2 && fired[1].strike === 1, 'its landing told');
  powers.trigger('m', p, p.kit, 'parryShot', { enemy: e, flight: 0.05 }); for (let i = 0; i < 5; i++) powers.tick(1 / 60);
  near(lost(), 2 * V.damage, 'no cooldown: every bolt turned strikes');
}

// ---- 2. Through the server: a claim against a shot it fired, facing it, once a bolt ----
{
  fresh();
  const Game = sim.inspect().Game, S = PLAYER_DEF.stats, coal = e.baseDef.attacks.find(a => a.projectile && !a.projectile.spread);
  assert.ok(coal, 'Ostrey throws a single coal');
  sim.registerPlayer('a', 'Ash'); sim.giveAbilities('a', ['mirror-shard']);
  const pose = (yaw, state = 'idle') => sim.setPlayers([{ id: 'a', x: e.x, y: e.y, z: e.z + 8, yaw, hp: S.maxHp, state, poseAge: 0 }]);
  pose(Math.PI);   // facing the boss (it stands toward -z of them)
  const claim = () => sim.abilityClaim('a', { when: 'parryShot', enemy: e.netId });
  const settle = s => { for (let t = 0; t < s; t += 1 / 60) powers.tick(1 / 60); };
  e.cooldown = 999;
  assert.equal(claim(), false, 'no shot fired at them: refused');
  const target = sim.inspect().players.find(p => p.id === 'a');
  g('projectiles').fire(e, coal, target);
  assert.equal(claim(), false, 'before it could have reached them: refused');
  for (let i = 0; i < 30; i++) sim.tick(1 / 60);
  e.hp = e.def.hp; fired.length = 0;
  pose(0); assert.equal(claim(), false, 'their back to it: refused');
  pose(Math.PI, 'roll'); assert.equal(claim(), false, 'mid-dash: refused');
  pose(Math.PI);
  assert.equal(claim(), true, 'a shot at them, facing it: accepted');
  const back = (8 - e.radius) / coal.projectile.speed;
  near(fired[0].flight, back, 'its way back at the bolt\'s own speed');
  settle(back + 0.05); near(lost(), V.damage, 'the server strikes the shooter');
  assert.equal(claim(), false, 'one bolt turns once');
  sim.registerPlayer('b', 'Birch'); sim.giveAbilities('b', ['mirror-shard']);
  sim.setPlayers([{ id: 'a', x: e.x, y: e.y, z: e.z + 8, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 },
    { id: 'b', x: e.x, y: e.y, z: e.z + 6, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
  g('projectiles').fire(e, coal, sim.inspect().players.find(p => p.id === 'a'));
  for (let i = 0; i < 30; i++) sim.tick(1 / 60);
  assert.equal(sim.abilityClaim('b', { when: 'parryShot', enemy: e.netId }), false, 'a shot at a friend is not theirs to turn');

  // A bot's bolts fly on the server: its deflect armed, facing the bolt, turns it the same way.
  fresh();
  const added = sim.addBot(), bot = sim.inspect().bots.get(added.id), body = bot.body;
  sim.giveAbilities(added.id, ['mirror-shard']);
  assert.ok(body && body.kit.whens.has('parryShot'), 'the bot holds it');
  body.x = e.x; body.z = e.z + 6; body.y = e.y; body.yaw = Math.PI;
  const hp = body.hp; e.yaw = 0;
  g('projectiles').fire(e, coal, body);
  for (let i = 0; i < 90 && !fired.length; i++) { body.x = e.x; body.z = e.z + 6; body.yaw = Math.PI; body.deflect = CONFIG.parry.arm; body.setState(g('PS').IDLE); sim.tick(1 / 60); }
  assert.ok(fired.length >= 1 && body.hp === hp, `the bot turned it, unharmed (${fired.length}, ${hp - body.hp})`);
  void Game;
}
console.log('MIRROR SHARD: a deflected bolt strikes its shooter as it arrives; the server takes a claim only against a shot at that player, facing it, once.');
