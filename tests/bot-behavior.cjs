'use strict';
// Real Player/Enemy regression: a waiting opponent must not leave a bot circling forever.
// node tests/bot-behavior.cjs
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const dt = 1 / 60;
function seeded(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function waiting(boss, profile, hurt = false, seed = 17) {
  const sim = createSimulation(); sim.addBot(profile); sim.start('arena', boss); sim.setPlayers([]);
  const { Game, bot, bots } = sim.inspect(), b = [...bots.values()][0], p = b.body, e = Game.enemies[0];
  b.brain = bot.create(b.profile, seeded(seed)); p.ctl = b.brain.hands;
  // Freeze only the opponent's initiative: its real moves/phase, collision, damage and combat still apply.
  e.chooseAttack = e.react = () => null; e.def = { ...e.def, speed: 0, approach: 0 }; e.cooldown = 0;
  p.x = e.x; p.z = e.z + e.radius + p.radius + 2.2; p.y = e.y; p.savePrev(); e.wake(p);
  if (hurt) p.hp = p.maxHp * 0.4;
  return { sim, b, p, e };
}
const profiles = ['quill', 'maren', 'tobin'];
const bosses = createSimulation().catalog().bosses.map(b => b.id);
const stalled = []; let count = 0, slowest = 0;
for (const boss of bosses) for (const profile of profiles) for (const hurt of [false, true]) {
  const { sim, p, e } = waiting(boss, profile, hurt);
  const hp = e.hp; let time = 0;
  for (; time < 14; time += dt) {
    sim.setPlayers([]); sim.tick(dt);
    if (e.hp < hp) break;
  }
  if (e.hp >= hp) stalled.push(boss + '/' + profile + (hurt ? '/hurt' : ''));
  slowest = Math.max(slowest, time); count++;
}
assert.deepEqual(stalled, [], 'bots must initiate real damage against a waiting boss, including while looking for a heal');
console.log('Bot initiative: ' + count + ' boss/profile/health combinations, slowest first damage ' + slowest.toFixed(2) + 's.');

// Observe movement with an intentionally short hypothetical opening. Each companion should hold a distinct
// plan for a useful interval, then change it, instead of re-rolling its approach every fixed step.
const movement = {};
for (const profile of profiles) {
  const { sim, b, p, e } = waiting('malenia', profile);
  b.brain = sim.inspect().bot.create(b.profile, () => 0.5); p.ctl = b.brain.hands;
  const to = { x: e.x - p.x, z: e.z - p.z }, dist = Math.hypot(to.x, to.z);
  const first = b.brain.think(dt, p, [e], []).mv;
  movement[profile] = { inward: (first.x * to.x + first.z * to.z) / dist,
    sideways: Math.abs(first.x * to.z - first.z * to.x) / dist };
  const plan = b.brain.tactic;
  for (let i = 0; i < 60; i++) { b.brain.hands.clear(); b.brain.think(dt, p, [e], []); }
  assert.equal(b.brain.tactic, plan, profile + ' keeps its movement plan for more than a frame');
  for (let i = 0; i < 150; i++) { b.brain.hands.clear(); b.brain.think(dt, p, [e], []); }
  assert.notEqual(b.brain.tactic, plan, profile + ' varies its plan after a few seconds');
}
assert.ok(movement.maren.inward > movement.quill.inward && movement.quill.inward > 0 && movement.tobin.inward < 0,
  'Maren pressures, Quill closes on a flank, and Tobin first baits at range');
assert.ok(movement.quill.sideways > movement.maren.sideways, 'Quill circles more strongly than Maren');

// Build up patience without moving the bodies, as when collision or a wary opponent stops an approach.
function observe(b, p, enemies, seconds) {
  for (let i = 0; i < seconds * 60; i++) { b.brain.think(dt, p, enemies, []); b.brain.hands.clear(); }
}
{
  const { b, p, e } = waiting('malenia', 'quill');
  p.z = e.z + e.radius + p.radius + 0.7;
  p.stamina = 0; p.exhausted = true;
  observe(b, p, [e], 10);
  b.brain.think(dt, p, [e], []);
  assert.ok(!b.brain.hands.peek('light') && !b.brain.hands.peek('heavy'), 'impatience cannot spend unavailable stamina');
  p.stamina = p.maxStamina;
  b.brain.think(dt, p, [e], []);
  assert.ok(b.brain.hands.peek('light'), 'a rested bot probes even when the theoretical counter window is too short');
}
{
  const { sim, b, p, e } = waiting('malenia', 'quill');
  p.z = e.z + e.radius + p.radius + 0.7;
  observe(b, p, [e], 10);
  // A different boss is a threat too: probing the target must never override defence against its partner.
  const other = createSimulation();
  other.addBot(); other.start('arena', 'giant');
  const threat = other.inspect().Game.enemies[0];
  threat.x = p.x; threat.z = p.z - 2; threat.y = p.y; threat.yaw = 0;
  const attack = threat.baseDef.attacks.find(a => !a.projectile && a.hits.length === 1 && !a.hits[0].leap && !a.hits[0].blink);
  assert.ok(attack, 'the defence fixture uses a real single-hit boss attack');
  threat.beginAttack(attack); threat.stateTime = attack.hits[0].startup - 0.01;
  let defended = false;
  for (let i = 0; i < 8; i++) {
    b.brain.think(dt, p, [e, threat], []);
    assert.ok(!b.brain.hands.peek('light') && !b.brain.hands.peek('heavy'), 'a known incoming blow vetoes a probe');
    if (b.brain.hands.peek('roll') || b.brain.hands.peek('parry')) { defended = true; break; }
  }
  assert.ok(defended, 'the impatient bot still rolls or parries an actual blow');
  b.brain.hands.clear();
  const bolt = { x: p.x, z: p.z - 1, vx: 0, vz: 10, size: 0.1 };
  b.brain.think(dt, p, [e], [], [bolt]);
  assert.ok(b.brain.hands.peek('roll') && !b.brain.hands.peek('light'), 'an incoming bolt also vetoes a probe');
}
console.log('Bot personalities: distinct movement, persistent and varied plans, stamina, partner defence and projectile defence passed.');

// Arena tracking covers every corner, even when the opponent is idle and facing away.
for (const profile of profiles) {
  for (const enemy of ['hollow', ...bosses]) {
    const sim = createSimulation(); sim.addBot(profile); sim.start('arena', enemy); sim.setPlayers([]);
    const { Game, bots } = sim.inspect(), b = [...bots.values()][0], p = b.body, e = Game.duel;
    assert.equal(Game.level.fullTracking, true, enemy + ' arena enables full tracking');
    p.x = -16; p.z = -11; p.y = e.y; p.savePrev();
    e.x = 16; e.z = 11; e.yaw = Math.atan2(e.x - p.x, e.z - p.z); e.setState('idle'); e.savePrev();
    const decision = b.brain.think(dt, p, [e], []);
    assert.equal(decision.lock, e, profile + ' notices ' + enemy + ' across the arena');
    sim.setPlayers([]); sim.tick(dt);
    assert.ok(!e.in('unaware'), enemy + ' notices the bot across the arena while facing away');
    assert.equal(e.netTarget, p.id, 'server targeting keeps the arena-wide opponent');
  }
  const sim = createSimulation(); sim.addBot(profile); sim.start('arena', 'giant', ['pillagerCaptain']); sim.setPlayers([]);
  const { Game, bots } = sim.inspect(), b = [...bots.values()][0], p = b.body, first = Game.duel;
  const next = Game.enemies.find(e => e !== first);
  p.x = -16; p.z = -11; p.savePrev();
  first.x = p.x + 2; first.z = p.z; first.savePrev();
  next.x = 16; next.z = 11; next.setState('idle'); next.savePrev();
  b.brain.think(dt, p, Game.enemies, []);
  assert.equal(b.brain.target, first, 'the bot starts on the nearby boss');
  first.deplete();
  const distance = Math.hypot(p.x - next.x, p.z - next.z);
  for (let i = 0; i < 120; i++) { sim.setPlayers([]); sim.tick(dt); }
  assert.equal(b.brain.target, next, profile + ' picks up the distant survivor after a kill');
  assert.ok(Math.hypot(p.x - next.x, p.z - next.z) < distance - 2, 'the bot rejoins the fight');
}
{
  const { sim, b, p, e } = waiting('giant', 'quill');
  const { Game } = sim.inspect();
  Game.level = { ...Game.level, fullTracking: false };
  p.x = -16; p.z = -11; e.x = 16; e.z = 11;
  e.yaw = Math.atan2(e.x - p.x, e.z - p.z); e.setState('idle');
  assert.equal(b.brain.think(dt, p, [e], []).lock, null, 'ordinary level detection keeps its distance limit');
  sim.setPlayers([]); sim.tick(dt);
  assert.ok(e.in('unaware'), 'ordinary level enemies retain their sight cone and notice range');
}
console.log('Arena tracking: all profiles and 13 enemy/boss definitions, far survivor reacquisition and ordinary detection passed.');

// Repeated rolls against the same real strike should use several safe directions, rather than a fixed side.
for (const profile of profiles) {
  const directions = new Set();
  for (let seed = 1; seed <= 48; seed++) {
    const { b, p, e, sim } = waiting('hollow', profile, false, seed);
    b.brain = sim.inspect().bot.create({ ...b.profile, parry: 0 }, seeded(seed)); p.ctl = b.brain.hands;
    p.x = e.x; p.z = e.z + e.radius + p.radius + 1.2; e.yaw = 0;
    const attack = e.baseDef.attacks.find(a => !a.projectile && !a.box.ring && a.hits.length === 1 && !a.hits[0].leap);
    e.beginAttack(attack); e.stateTime = attack.hits[0].startup - 0.01;
    for (let i = 0; i < 10; i++) {
      const decision = b.brain.think(dt, p, [e], []);
      if (b.brain.hands.peek('roll')) {
        directions.add(Math.round(Math.atan2(decision.mv.x, decision.mv.z) * 4 / Math.PI)); break;
      }
    }
  }
  assert.ok(directions.size >= 3, profile + ' varies roll direction against the same strike (' + [...directions] + ')');
}
console.log('Bot rolls: each personality used at least three dodge directions against the same attack.');
