'use strict';
// Vesper, the Pale Meridian & the floating Astral Prisms mechanic (`prism`, `prismFire`, `REACTIONS.prismed`,
// Counter-shatter): Boss Rush / Weekly Run / Practice inclusion, strict Story exclusion, prism planting & cap,
// tracking -> lock -> beam intersection (unparryable, fair off-line miss), Counter shatter (both direct & multiplayer
// server claim), Phase 2 Eclipse, and validateData checks.
const assert = require('node:assert/strict');
const { createSimulation } = require('../server/headless.cjs');

const sim = createSimulation();
const G = name => sim.inspect().Game.update.constructor('return ' + name)();
const ENEMY_BY_ID = G('ENEMY_BY_ID'), ALL_LEVELS = G('ALL_LEVELS');
const STORIES = G('STORIES'), CONFIG = G('CONFIG'), RUSH = G('RUSH'), ES = G('ES');
const isBossDef = G('isBossDef'), REACTIONS = G('REACTIONS'), canParryHit = G('canParryHit');
const validateData = G('validateData'), events = G('events');
const STEP = CONFIG.step;

// ---- 1. Catalog inclusion (Boss Rush, Weekly Run, Practice) & strict Story exclusion ------------------------------------
const vesper = ENEMY_BY_ID.vesper;
assert.ok(vesper, 'vesper exists in ENEMY_BY_ID');
assert.equal(vesper.name, 'Gemini, Neon High', 'boss display name is Gemini, Neon High');
assert.ok(isBossDef(vesper), 'vesper is a boss (has phases)');
assert.ok(sim.catalog().bosses.some(b => b.id === 'vesper'), 'vesper appears in sim.catalog().bosses');
assert.ok(!RUSH.opening.includes('vesper'), 'vesper is a full-strength Boss Rush boss, not a warm-up opener');

// Must appear naturally in Boss Rush draws (sim.calling) across seeds.
let seenInRush = false;
for (let seed = 1; seed <= 12 && !seenInRush; seed++) {
  for (let n = 0; n < 25; n++) {
    const f = sim.calling({ seed: seed * 1009 }, n);
    if (f.boss === 'vesper' || f.partners.includes('vesper')) { seenInRush = true; break; }
  }
}
assert.ok(seenInRush, 'vesper is drawn in Boss Rush runs');

// Must appear in Weekly Run draws across weeks.
let seenInWeekly = false;
for (let w = 0; w < 20 && !seenInWeekly; w++) {
  const run = sim.weeklyRun(Date.UTC(2026, 0, 1 + w * 7));
  for (let n = 0; n < 25; n++) {
    const f = sim.calling(run, n);
    if (f.boss === 'vesper' || f.partners.includes('vesper')) { seenInWeekly = true; break; }
  }
}
assert.ok(seenInWeekly, 'vesper is drawn in Weekly Runs');

// Must NOT appear in any Story campaign or level.
for (const L of ALL_LEVELS) {
  for (const g of L.gated || []) {
    assert.notEqual(g.enemy, 'vesper', `level ${L.id} gated must not spawn vesper`);
    for (const m of g.enemies || []) assert.notEqual(m.enemy, 'vesper', `level ${L.id} zone ${g.id} must not spawn vesper`);
  }
  for (const d of L.dispersed || []) assert.notEqual(d.enemy, 'vesper', `level ${L.id} dispersed must not spawn vesper`);
  for (const sp of L.spectators || []) assert.notEqual(sp.enemy, 'vesper', `level ${L.id} spectator must not use vesper`);
}
for (const S of STORIES) {
  assert.ok(!S.chapters.some(c => /vesper|meridian|observatory/i.test(c.level)), `story ${S.id} has no vesper chapter`);
}

// ---- 2. Astral Prisms: planting, arena clamping, cap, tracking -> lock -> firing, Counter shatter -----------------------
sim.start('arena', 'vesper', []);
const Game = sim.inspect().Game;
const e = Game.enemies[0];
assert.equal(e.baseDef.id, 'vesper');
const setP = (x, z, state = 'idle') => sim.setPlayers([{ id: 'p1', x, y: 0, z, hp: 1000, state }]);
setP(0, 4.5);
e.x = e.px = 0; e.z = e.pz = 0; e.y = e.py = 0; e.yaw = 0; e.cooldown = 99; e.setState(ES.IDLE);

let plantedEvents = 0, shatteredEvents = 0;
const offPlant = events.on('prismPlant', () => plantedEvents++);
const offShatter = events.on('prismShatter', d => { if (d && Array.isArray(d.list)) shatteredEvents += d.list.length; });

// Plant via Sow the Glass (`prismSeed` -> 2 flanking prisms).
const sow = e.def.attacks.find(a => a.id === 'prismSeed');
e.beginAttack(sow);
for (let i = 0; i < Math.ceil((sow.hits[0].startup + 0.05) / STEP); i++) sim.tick(STEP);
assert.equal(e.prisms.length, 2, 'prismSeed plants 2 floating prisms');
assert.equal(plantedEvents, 2, 'prismPlant emitted for each planted prism');
assert.ok(REACTIONS.prismed(e), 'REACTIONS.prismed triggers at >= callAt prisms');
for (const pr of e.prisms) {
  const w = G('world');
  assert.ok(pr.x >= w.minX && pr.x <= w.maxX && Math.abs(pr.z) <= w.halfZ, 'planted prisms stay clamped inside arena bounds');
}

// Cap enforcement: planting more keeps at most CONFIG.prisms.max.
e.prismKey = -1; e.notePrisms();
e.prismKey = -1; e.notePrisms();
assert.equal(e.prisms.length, CONFIG.prisms.max, 'active prisms are capped at CONFIG.prisms.max');

// Counter shatter through real multiplayer deflect + counter claim!
const beforeShatter = e.prisms.length;
const draw = e.def.attacks.find(a => a.id === 'crescentDraw');
setP(e.x, e.z + 1.5);
e.beginAttack(draw); sim.tick(STEP);
assert.equal(sim.parry('p1', { enemy: e.netId, serial: e.netAttack, hit: 0 }), true, 'crescentDraw is deflectable');
assert.equal(sim.hit('p1', { enemy: e.netId, attack: 'counter', charge: 0, riposte: true, swing: '1' }), true, 'Counter lands');
assert.equal(e.prisms.length, 0, 'Counter shatters every active prism');
assert.equal(shatteredEvents, beforeShatter, 'prismShatter emitted with every shattered prism');
assert.ok(!REACTIONS.prismed(e), 'REACTIONS.prismed clears once prisms shatter');

// Tracking -> Lock -> Beam Hitbox intersection (hits on line, misses off line, unparryable).
const align = e.def.attacks.find(a => a.id === 'starAlignment');
assert.equal(canParryHit(align, 0), false, 'prismFire beams cannot be parried');

e.x = e.px = 0; e.z = e.pz = 0; e.yaw = 0; e.cooldown = 99; e.setState(ES.IDLE);
e.prisms.length = 0;
e.prisms.push(
  { x: -4, y: 0, fy: 1.55, z: 0, aimX: 0, aimZ: 0, locked: false, aimKey: -1, age: 1, no: ++e.prismNo },
  { x: 4, y: 0, fy: 1.55, z: 0, aimX: 0, aimZ: 0, locked: false, aimKey: -1, age: 1, no: ++e.prismNo },
);
setP(0, 5);
e.beginAttack(align);
// Advance partway through wind-up (before lock): prisms track player, not yet locked.
for (let i = 0; i < Math.floor(align.hits[0].startup * 0.25 / STEP); i++) sim.tick(STEP);
assert.ok(e.prisms.every(pr => !pr.locked), 'prisms track before lock fraction');
// Move player before lock: sightline follows.
setP(1.2, 5);
for (let i = 0; i < Math.ceil(align.hits[0].startup * 0.35 / STEP); i++) sim.tick(STEP);
assert.ok(e.prisms.every(pr => pr.locked), 'prisms lock rigid past lock fraction');
const lockedAim = e.prisms.map(pr => [pr.aimX, pr.aimZ]);
// Step well off the locked beam lines after lock: aim must NOT follow!
setP(0, -6);
for (let i = 0; i < 6; i++) sim.tick(STEP);
e.prisms.forEach((pr, idx) => {
  assert.equal(pr.aimX, lockedAim[idx][0], 'locked prism aimX stays rigid');
  assert.equal(pr.aimZ, lockedAim[idx][1], 'locked prism aimZ stays rigid');
});

// Finish wind-up so prismFire strikes: off-line player takes NO hit, on-line target DOES overlap!
while (e.state === ES.WINDUP) sim.tick(STEP);
assert.equal(e.state, ES.ACTIVE, 'starAlignment enters ACTIVE');
assert.equal(e.prisms.length, 0, 'keep: false clears active prisms on strike');
assert.equal(e.prismBeams.length, 2, 'prismBeams records both fired light-lances');
const hb = e.hitbox;
assert.ok(hb && hb.lines && hb.lines.length === 2, 'prismFire spawns a line-segment hitbox');
assert.ok(!hb.overlaps({ x: 0, y: 0, z: -6, radius: 0.45 }), 'stepping off the locked beam lines avoids damage');
assert.ok(hb.overlaps({ x: 1.2, y: 0, z: 5.0, radius: 0.45 }), 'standing on the locked intersection gets hit');

// ---- 3. Phase 2 Eclipse transition & opener ----------------------------------------------------------------------------
e.hp = e.def.hp * 0.45;
e.setState(ES.IDLE); e.cooldown = 0;
e.checkPhaseAt();
assert.equal(e.def.phaseId, 'eclipse', 'below 52% HP enters Phase 2 eclipse');
assert.equal(e.def.name, 'Gemini, the Eclipsed');
assert.equal(e.opener && e.opener.id, 'eclipseOpen', 'Phase 2 queues invulnerable eclipseOpen');
assert.ok(e.def.attacks.some(a => a.id === 'mirrorStep'), 'Phase 2 unlocks mirrorStep');
assert.ok(e.def.attacks.some(a => a.id === 'eclipseCross'), 'Phase 2 unlocks eclipseCross');
assert.ok(e.def.attacks.some(a => a.id === 'lunarTempest'), 'Phase 2 unlocks lunarTempest');

// Dying clears all prisms cleanly.
e.prisms.push({ x: 2, y: 0, fy: 1.55, z: 2, aimX: 0, aimZ: 0, locked: false, aimKey: -1, age: 0, no: ++e.prismNo });
e.die();
assert.equal(e.prisms.length, 0, 'die() clears all active prisms');
assert.ok(!e.prismBeams || e.prismBeams.length === 0, 'die() clears all prismBeams');

if (typeof offPlant === 'function') offPlant();
if (typeof offShatter === 'function') offShatter();

// ---- 4. Headless validateData checks (valid + malformed prism/prismFire rejection) -------------------------------------
assert.equal(validateData({ visual: false }).length, 0, 'validateData({ visual: false }) is clean');
const origStartup = align.hits[0].startup;
try {
  align.hits[0].startup = 0.2;   // shorter than CONFIG.prisms.minTell
  const errs = validateData({ visual: false });
  assert.ok(errs.some(m => m.includes('prismFire')), 'validateData rejects prismFire wind-up below CONFIG.prisms.minTell');
} finally { align.hits[0].startup = origStartup; }
const origAt = sow.hits[0].prism.at;
try {
  sow.hits[0].prism.at = [];
  const errs = validateData({ visual: false });
  assert.ok(errs.some(m => m.includes('prism')), 'validateData rejects empty prism.at');
} finally { sow.hits[0].prism.at = origAt; }
assert.equal(validateData({ visual: false }).length, 0, 'validateData clean after restoring data');

console.log('vesper ok: Boss Rush / Weekly / Practice included, Story excluded, prisms + lock + beam + Counter-shatter + Phase 2 + validation verified');
