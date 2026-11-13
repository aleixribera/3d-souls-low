'use strict';
// Bots as human aids (v7.52.0): a temperament per bot and per fight, waiting out an enemy's string from past its
// reach, rolling away from a string rather than across it, and leaving executions to the player.
// node tests/bot-temperament.cjs   (VERBOSE=1 prints the temperaments drawn)
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');
const dt = 1 / 60;
function seeded(seed) {
  let s = seed >>> 0;   // mulberry32: neighbouring seeds give unrelated draws
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// One bot against a boss whose own initiative is frozen (its moves, collision and damage are real).
function duel(boss, profile, seed, bots = 1) {
  const sim = createSimulation({ seed }); sim.addBot(profile); for (let i = 1; i < bots; i++) sim.addBot();
  sim.start('arena', boss); sim.setPlayers([]);
  const { Game, bot, bots: all } = sim.inspect(), list = [...all.values()], b = list[0], p = b.body, e = Game.enemies[0];
  b.brain = bot.create(b.profile, seeded(seed)); p.ctl = b.brain.hands;
  e.chooseAttack = e.react = () => null; e.def = { ...e.def, speed: 0, approach: 0 }; e.cooldown = 99;
  p.x = e.x; p.z = e.z + e.radius + p.radius + 1; p.y = e.y; p.yaw = Math.PI; p.savePrev(); e.yaw = 0; e.wake(p);
  return { sim, Game, bot, list, b, p, e };
}
// A brain in a fight that drew a mood with (or without) a gap it swings into.
function withMood(boss, profile, want) {
  for (let seed = 1; seed < 400; seed++) {
    const d = duel(boss, profile, seed);
    d.b.brain.think(dt, d.p, [d.e], []); d.b.brain.hands.clear();
    if (want(d.b.brain.mood)) return d;
  }
  throw new Error(`no ${profile} fight drew the wanted mood`);
}

// ---- 1. Temperaments vary by bot and by fight ----
{
  const drawn = {}, lines = [], firsts = [];
  for (const profile of ['quill', 'maren', 'tobin']) for (let seed = 1; seed <= 12; seed++) {
    const { b, p, e } = duel('hale', profile, seed);
    b.brain.think(dt, p, [e], []);
    (drawn[profile] = drawn[profile] || new Set()).add(b.brain.mood);
    if (seed <= 2) { lines.push(`${b.profile.name}, fight ${seed}: ${b.brain.describe()}`); firsts.push(b.brain.mood); }
  }
  for (const [profile, moods] of Object.entries(drawn)) assert.ok(moods.size >= 2, profile + ' draws more than one temperament over twelve fights');
  assert.notDeepEqual([...drawn.maren].sort(), [...drawn.tobin].sort(), 'Maren and Tobin lean to different temperaments');
  assert.ok(new Set(firsts).size >= 2, 'the three bots over their first two fights do not all choose the same way');
  if (process.env.VERBOSE) lines.forEach(l => console.log('  ' + l));
  console.log(`Temperaments: ${Object.entries(drawn).map(([k, v]) => `${k} ${[...v].sort().join('/')}`).join(', ')}.`);
}

// ---- 2. Waiting out a string: Harrow's Kneel at the Gate (two rings with a pause between) ----
{
  const { sim, b, p, e } = withMood('harrow', 'maren', m => m === 'patient' || m === 'wary');
  const kneel = e.baseDef.attacks.find(a => a.id === 'kneelGate');
  e.beginAttack(kneel);
  let swungMid = false, swungAfter = false, farthest = 0, time = 0;
  for (; time < 8; time += dt) {
    sim.setPlayers([]); sim.tick(dt);
    const mid = e.attack === kneel && (e.state === 'windup' || e.state === 'active');
    if (p.state === 'attack' && mid) swungMid = true;
    if (mid) farthest = Math.max(farthest, Math.hypot(p.x - e.x, p.z - e.z));
    if (e.state === 'recover' && p.state === 'attack') { swungAfter = true; break; }
  }
  assert.ok(!swungMid, 'a patient bot never swings into the pause between the two rings');
  assert.ok(swungAfter, 'it goes in once the string is over (the recovery)');
  console.log(`Kneel: a ${b.brain.mood} Maren waits out both rings (out to ${farthest.toFixed(1)} m), then strikes in the recovery.`);
}

// ---- 3. Getting out of a string, not rolling across it: Hale's Gale Wheel (three spins round him); unhurt, so no rolls is no free pass ----
{
  let rollsMax = 0, outside = 0, untouched = 0;
  for (const seed of [3, 5, 8, 13]) {
    const { sim, p, e } = duel('hale', 'quill', seed);
    p.z = e.z + e.radius + p.radius + 0.4; p.savePrev();
    const storm = e.baseDef.attacks.find(a => a.id === 'galeWheel');
    e.beginAttack(storm);
    let rolls = 0, prev = p.state; const hp = p.hp;
    for (let t = 0; t < 3 && e.attack === storm; t += dt) {
      sim.setPlayers([]); sim.tick(dt);
      if (p.state === 'roll' && prev !== 'roll') rolls++;
      prev = p.state;
    }
    rollsMax = Math.max(rollsMax, rolls); if (p.hp === hp) untouched++;
    const half = storm.box.w / 2 + p.radius;
    if (Math.abs(p.x - e.x) > half || Math.abs(p.z - e.z) > half) outside++;
  }
  assert.ok(rollsMax <= 2, `a bot rolls out of a three-spin string, not at every spin (most rolls ${rollsMax})`);
  assert.ok(outside >= 3, 'it ends the string outside the spin');
  assert.ok(untouched >= 3, `it comes through the string unhurt (${untouched}/4 fights)`);
  console.log(`Stormcaller: at most ${rollsMax} rolls, outside the spin in ${outside}/4 fights, unhurt in ${untouched}/4.`);
}

// ---- 4. Executions are the player's ----
// The second bot's body stands in for a person: no botId, its presses scripted here.
function kneeling(playerActs, withPlayer = true) {
  const { sim, list, b, p, e } = duel('ostrey', 'maren', 7, 2);
  const human = list[1].body;
  if (withPlayer) {
    delete human.botId;
    list[1].brain = { hands: list[1].brain.hands, navigator: list[1].brain.navigator, target: null,
      think(_dt, me) {
        const front = { x: e.x + Math.sin(e.yaw) * (e.radius + me.radius + 0.4), z: e.z + Math.cos(e.yaw) * (e.radius + me.radius + 0.4) };
        const dx = front.x - me.x, dz = front.z - me.z, d = Math.hypot(dx, dz);
        if (playerActs && e.state === 'broken' && e.stateTime > 0.6) {
          if (d < 0.5) this.hands.press('light');
          return { mv: d > 0.2 ? { x: dx / d, z: dz / d, has: true } : { x: 0, z: 0, has: false }, lock: e };
        }
        return { mv: { x: 0, z: 0, has: false }, lock: e };
      } };
    human.ctl = list[1].brain.hands;
    human.x = e.x + e.radius + human.radius + 3; human.z = e.z; human.y = e.y; human.savePrev();
  } else { human.x = e.x - 30; human.savePrev(); human.hp = 0; }
  e.hitbox = null; e.crack = 1; e.setState('broken');
  const breakTime = e.def.posture.breakTime;
  let botAt = null, humanAt = null;
  for (let t = 0; t < breakTime + 0.5; t += dt) {
    sim.setPlayers([]); sim.tick(dt);
    if (botAt === null && p.state === 'execute') botAt = t;
    if (humanAt === null && human.state === 'execute') humanAt = t;
  }
  return { botAt, humanAt, breakTime, tally: b.brain.tally };
}
{
  const taken = kneeling(true);
  assert.ok(taken.humanAt !== null, 'the player executes the kneeling boss');
  assert.equal(taken.botAt, null, 'the bot holds off while the player takes it');
  const left = kneeling(false);
  assert.ok(left.humanAt === null && left.botAt !== null, 'with the player hanging back, the bot takes it');
  assert.ok(left.botAt > left.breakTime - 2, `only near the end of the kneel (${left.botAt.toFixed(2)} of ${left.breakTime} s)`);
  const alone = kneeling(false, false);
  assert.ok(alone.botAt !== null && alone.botAt < 1.5, 'with no player near, a bot executes at once');
  console.log(`Executions: the player executes at ${taken.humanAt.toFixed(2)} s and the bot holds off; the player hangs back and the bot executes at ${left.botAt.toFixed(2)} of ${left.breakTime} s; alone it executes at ${alone.botAt.toFixed(2)} s.`);
}

// ---- 5. Openings are the player's first, and bots back up whoever the boss is after (pass 35) ----
// The second body stands in for a person again (no botId, scripted). A boss in a long recovery with the person in
// reach of it: the bot waits CONFIG.bot.support.first s, or until the person swings, before it swings; alone it goes in
// at once.
function recovery(withPerson, personSwingsAt = Infinity) {
  const { sim, list, p, e } = duel('ostrey', 'maren', 7, 2), S = sim.inspect().CONFIG.bot.support;
  const human = list[1].body;
  if (withPerson) {
    delete human.botId;
    let t = 0;
    list[1].brain = { hands: list[1].brain.hands, navigator: list[1].brain.navigator, target: null,
      think(step) { t += step; if (t >= personSwingsAt && t < personSwingsAt + step * 1.5) this.hands.press('light'); return { mv: { x: 0, z: 0, has: false }, lock: e }; } };
    human.ctl = list[1].brain.hands;
    human.x = e.x - (e.radius + human.radius + 0.6); human.z = e.z + 0.5; human.y = e.y; human.yaw = Math.PI / 2; human.savePrev();
  } else { human.x = e.x - 30; human.savePrev(); human.hp = 0; }
  const swing = e.baseDef.attacks.find(a => !a.projectile && !a.when);
  e.attack = { ...swing, recovery: 2.5 }; e.hitbox = null; e.setState('recover');
  let botAt = null, humanAt = null;
  for (let t = 0; t < 2; t += dt) {
    sim.setPlayers([]); sim.tick(dt);
    if (botAt === null && ['attack', 'jump', 'jumpAttack'].includes(p.state)) botAt = t;   // a swing, or a leap into one
    if (humanAt === null && human.state === 'attack') humanAt = t;
  }
  return { botAt, humanAt, first: S.first, tally: list[0].brain.tally };
}
{
  const alone = recovery(false), offered = recovery(true), joined = recovery(true, 0.25);
  assert.ok(alone.botAt !== null && alone.botAt < alone.first, `alone, a bot punishes a long recovery at once (${alone.botAt})`);
  assert.ok(offered.botAt === null || offered.botAt >= offered.first - dt, `with a person in reach, it leaves them the first ${offered.first} s (${offered.botAt})`);
  assert.equal(offered.tally.offered, 1, 'and counts one opening left to the person');
  assert.ok(joined.humanAt !== null && joined.botAt !== null && joined.botAt >= joined.humanAt, `once the person swings, it joins (${joined.humanAt} then ${joined.botAt})`);
  console.log(`Openings: alone the bot swings ${alone.botAt.toFixed(2)} s into a long recovery; with a person in reach it waits until ${offered.botAt === null ? 'the end' : offered.botAt.toFixed(2) + ' s'}; when the person swings at ${joined.humanAt.toFixed(2)} s it joins at ${joined.botAt.toFixed(2)} s.`);
}
// The boss after the person: the bot walks round to the boss's back (the person's far side) instead of circling in
// front; against a boss with counters behind and at its flank (Ostrey), to the edge of the back they leave open.
// The boss is held in place, so only the bot's walk changes the angle.
function backup(boss, seed) {
  const { sim, list, b, p, e } = duel(boss, 'maren', seed, 2);
  const human = list[1].body; delete human.botId;
  list[1].brain = { hands: list[1].brain.hands, navigator: list[1].brain.navigator, target: null, think() { return { mv: { x: 0, z: 0, has: false }, lock: e }; } };
  human.ctl = list[1].brain.hands;
  human.x = e.x; human.z = e.z + e.radius + human.radius + 1; human.y = e.y; human.yaw = Math.PI; human.savePrev();
  p.x = e.x + e.radius + p.radius + 1.5; p.z = e.z; p.savePrev();
  e.netTarget = human.id;
  const x0 = e.x, z0 = e.z;
  let best = Infinity, end = 0;
  for (let t = 0; t < 6; t += dt) {
    sim.setPlayers([]); sim.tick(dt); e.netTarget = human.id; e.x = x0; e.z = z0;
    const back = Math.atan2(e.x - human.x, e.z - human.z), at = Math.atan2(p.x - e.x, p.z - e.z);
    end = Math.abs(Math.atan2(Math.sin(at - back), Math.cos(at - back)));
    if (t > 2) best = Math.min(best, end);
  }
  return { best, end, tally: b.brain.tally };
}
{
  const open = [3, 7, 11].map(s => backup('giant', s)), guarded = [3, 7, 11].map(s => backup('ostrey', s));
  const list = runs => runs.map(r => r.end.toFixed(2)).join(', ');
  assert.ok(open.every(r => r.best < 0.9), `with the boss on the person, the bot reaches its back (closest ${open.map(r => r.best.toFixed(2)).join(', ')} rad off behind)`);
  assert.ok(open.every(r => r.end < 1.2), `and fights from there (${list(open)} rad off behind at the end)`);
  // Ostrey counters within 0.94 rad of straight behind (CONFIG.ai.reactions.behind) and on one flank.
  assert.ok(guarded.every(r => r.end > 0.94 && r.end < 1.4), `against rear counters it keeps to the open edge of the back (${list(guarded)} rad)`);
  console.log(`Backup: with the boss on the person, the bot ends ${list(open)} rad off straight behind the Giant Skeleton and ${list(guarded)} behind Ostrey (outside his rear counter); ${open.concat(guarded).map(r => r.tally.backup.toFixed(1)).join(', ')} s at the back.`);
}
