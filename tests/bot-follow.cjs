'use strict';
// Real server Player movement: fair human followers, room/ramp routes and stuck-only recovery.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const dt = 1 / 60, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const human = (id, x, y = 0, z = 0) => ({ id, x, y, z, yaw: 0, hp: 120, state: 'idle', alive() { return this.hp > 0; } });
const N = createSimulation().inspect().bot.navigation;
const enemy = human('next', 180); enemy.state = 'dormant';
for (let bots = 1; bots <= 3; bots++) for (let people = 1; people <= 6; people++) {
  const party = Array.from({ length: people }, (_, i) => human('p' + i, i * 10));
  const aids = Array.from({ length: bots }, (_, i) => Object.assign(human('b' + i, 0), { botId: 'b' + i }));
  const assigned = N.assign(party, aids, [enemy]);
  const counts = party.map(p => [...assigned.values()].filter(id => id === p.id).length);
  const base = Math.floor(bots / people), extra = bots % people;
  assert.deepEqual(counts, party.map((_, i) => base + (i >= people - extra ? 1 : 0)), 'front players get surplus companions');
  assert.deepEqual([...N.assign([...party].reverse(), [...aids].reverse(), [enemy], assigned)], [...assigned].reverse(), 'ids survive proxy/roster ordering changes');
}
{
  const rear = human('rear', 5), front = human('front', 120), aid = Object.assign(human('bot', 4), { botId: 'bot' });
  assert.equal(N.assign([rear, front, aid], [aid], [enemy]).get(aid.id), front.id, 'one bot chooses the next-enemy player, not the nearby player/bot');
  front.hp = 0;
  assert.equal(N.assign([rear, front], [aid], [enemy]).get(aid.id), rear.id, 'a dead leader loses its followers');
  rear.hp = 0;
  assert.equal(N.assign([rear, front], [aid], [enemy]).size, 0, 'absent/dead humans never get followers');
  front.hp = rear.hp = 120;
  assert.equal(N.assign([front, rear], [aid], []).size, 1, 'a fully cleared level still has a human follower');
}
console.log('Fair distribution: 18 bot/player ratios, single bot/front priority, stable ids and death/empty handling.');

function setup(level, at, goal, open = true) {
  const sim = createSimulation(); sim.addBot(); sim.start('level', level);
  const { Game, world, bots, bot } = sim.inspect(), b = [...bots.values()][0], p = b.body;
  Game.enemies = []; Game.zones = [];
  if (open) for (const g of world.gates) g.open = true;
  if (at) Object.assign(p, { x: at[0], y: at[1], z: at[2] });
  p.savePrev();
  const lead = human('person', ...goal);
  const step = () => { sim.setPlayers([lead]); sim.tick(dt); };
  return { sim, Game, world, b, p, lead, step, bot };
}
function walk(f, seconds, maxStep = 0.16) {
  let max = 0, time = 0;
  for (; time < seconds && dist(f.p, f.lead) > 2.6; time += dt) {
    const prev = { x: f.p.x, y: f.p.y, z: f.p.z }; f.step(); max = Math.max(max, dist(prev, f.p));
    assert.ok(f.p.alive(), 'route must keep the bot alive');
  }
  assert.ok(dist(f.p, f.lead) < 2.6, 'walking reaches its player: ' + JSON.stringify({ x: f.p.x, y: f.p.y, z: f.p.z }));
  assert.ok(max < maxStep, 'ordinary footsteps/falls, no catch-up teleport: ' + max);
  return time;
}
{
  const f = setup('long-hall', [5, 0, 0], [120, 0, 0]);
  const rear = human('rear', 8);
  // Keep a real distant dormant enemy solely as the road-ahead marker.
  const source = createSimulation(); source.start('level', 'long-hall');
  const next = source.inspect().Game.enemies[0]; next.x = 170; next.state = 'dormant'; next.update = () => {};
  f.Game.enemies = [next];
  for (let i = 0; i < 60; i++) { f.sim.setPlayers([rear, f.lead]); f.sim.tick(dt); }
  assert.equal(f.b.brain.navigator.leader, f.lead.id, 'server uses the assigned front player despite a nearer human');
  f.Game.enemies = []; walk(f, 35);
  for (let i = 0; i < 120; i++) f.step();
  assert.ok(dist(f.p, f.lead) < 2.6 && dist(f.p, f.lead) > 1.5, 'hysteresis reaches the inner following gap and stops');
  const x = f.p.x; f.sim.setPlayers([]);
  for (let i = 0; i < 180; i++) { f.sim.setPlayers([]); f.sim.tick(dt); }
  assert.ok(Math.abs(f.p.x - x) < 0.1, 'no human means no bot-to-bot follow chain');
}
{
  const f = setup('long-hall', [12, 0, 0], [80, 0, 0]);
  f.sim.addBot('maren'); f.sim.addBot('tobin');
  const rear = human('rear', 10);
  const source = createSimulation(); source.start('level', 'long-hall');
  const next = source.inspect().Game.enemies[0]; next.x = 170; next.state = 'dormant'; next.update = () => {};
  f.Game.enemies = [next];
  const leaders = () => [...f.sim.inspect().bots.values()].map(b => b.brain.navigator.leader).sort();
  f.sim.setPlayers([rear, f.lead]); f.sim.tick(dt);
  assert.deepEqual(leaders(), ['person', 'person', 'rear'], 'server splits three companions 2/1 toward the front');
  const joined = human('joined', 140);
  f.sim.setPlayers([rear, f.lead, joined]); f.sim.tick(dt);
  assert.deepEqual(leaders(), ['joined', 'person', 'rear'], 'a join immediately shares one companion per person');
  rear.hp = 0; f.sim.setPlayers([rear, f.lead, joined]); f.sim.tick(dt);
  assert.deepEqual(leaders(), ['joined', 'joined', 'person'], 'death immediately reallocates the extra slot to the new front');
  f.sim.setPlayers([]); f.sim.tick(dt);
  assert.deepEqual(leaders(), [null, null, null], 'with no humans, bots cannot choose one another as leaders');
}
for (const [level, from, to, seconds] of [
  ['sunken-keep', [5, 0, 0], [78, 0, 42], 40],
  ['the-tower', [58, 6, 24], [100, 22, 0], 75],
  ['stormhill', [140, 0, 0], [226, 8, -4.5], 40],
  ['haligtree', [119, 0, -46], [164, 0, -47], 20],
  ['final-castle', [8, 0, 0], [315.5, 24, -2], 150],
]) {
  const f = setup(level, from, to); f.world.traps = [];
  const secondsTaken = walk(f, seconds);
  assert.equal(f.p.hp, f.p.maxHp, 'walls, bends and stairs do not harm the bot');
  console.log(level + ': walked to player in ' + secondsTaken.toFixed(1) + 's without teleporting.');
}
{
  const f = setup('sunken-keep', [46, 0, 0], [50, 0, 42]);
  const gate = f.world.gates.find(g => g.id === 'zone-cistern'); gate.open = false;
  const start = { x: f.p.x, y: f.p.y, z: f.p.z };
  for (let i = 0; i < 25 * 60; i++) f.step();
  assert.ok(dist(start, f.p) < 0.1, 'unreachable player behind a gate does not authorize a teleport');
  assert.equal(f.b.brain.navigator.recovery, null);
  gate.open = true; walk(f, 20);
}
{
  const f = setup('sunken-keep', [24, 0, 0], [31, 0, 0]);
  const floor = f.world.regions.find(r => r.id === 'hall-1');
  f.world.openHole(floor, [26, 28, -1.5, 1.5]);
  walk(f, 10);
  assert.equal(f.p.hp, f.p.maxHp, 'walk around a floor hole instead of cutting across its edge');
}
// The campaigns require drops of four, five and eight metres. They use normal falling/damage.
for (const [level, from, to, damage] of [
  ['the-tower', [21, 0, 0], [27, -4, -14], false],
  ['ashen-capital', [64, 0, 0], [87, -5, -8], true],
  ['farum-azula', [88, 8, 0], [108, 0, -10], true],
]) {
  const f = setup(level, from, to);
  for (const t of f.world.traps) { t.state = 'sprung'; f.world.openHole(t.region, t.collapse); }
  walk(f, 30, 0.65);
  assert.equal(f.p.hp < f.p.maxHp, damage, 'drop preserves normal fall damage');
}
{
  const f = setup('long-hall', [10, 0, 0], [40, 0, 0]);
  const normal = f.p.update; f.p.update = () => {}; // Genuine failed movement despite a valid floor route.
  for (let i = 0; i < 7 * 60; i++) f.step();
  assert.equal(f.p.x, 10, 'no early rescue, even with a distant player');
  for (let i = 0; i < 2 * 60; i++) f.step();
  assert.ok(f.p.x >= 11 && f.p.x <= 13, 'only a short safe nudge after sustained failed walking');
  f.p.update = normal; walk(f, 12);
}
{
  const f = setup('final-castle', [8, 0, 0], [315.5, 24, -2]);
  for (let i = 0; i < 10 * 60; i++) { f.lead.z = Math.sin(i * 0.04) * 3; f.step(); }
  assert.ok(f.p.x > 15, 'a moving player cannot continually cancel a long route search');
}
// Route coverage through the actual 14 normal maps, including collapsed mandatory floors.
for (const L of createSimulation().catalog().levels) {
  const f = setup(L.id, null, [0, 0, 0]);
  for (const t of f.world.traps) { t.state = 'sprung'; f.world.openHole(t.region, t.collapse); }
  const fire = f.Game.level.bonfires.at(-1), goal = { ...(fire.spawn || fire) };
  goal.y = f.world.floorY(goal.x, goal.z, goal.y);
  assert.ok(f.bot.navigation.route(f.p, goal)?.length, L.id + ' has a floor route from start to last bonfire');
}
console.log('Bot following: human priority, walking/hysteresis, walls, all tower floors, gates, real drops, stuck-only recovery and all 14 level routes passed.');
