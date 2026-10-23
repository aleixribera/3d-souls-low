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
  for (let i = 0; i < 30 && !b.brain.hands.peek('light'); i++) b.brain.think(dt, p, [e], []);
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
  for (let i = 0; i < 20; i++) {
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
    for (let i = 0; i < 20; i++) {
      const decision = b.brain.think(dt, p, [e], []);
      if (b.brain.hands.peek('roll')) {
        directions.add(Math.round(Math.atan2(decision.mv.x, decision.mv.z) * 4 / Math.PI)); break;
      }
    }
  }
  assert.ok(directions.size >= 3, profile + ' varies roll direction against the same strike (' + [...directions] + ')');
}
console.log('Bot rolls: each personality used at least three dodge directions against the same attack.');

// A large theoretical opening must not erase a deliberate bait/reposition plan.
{
  const { sim, b, p, e } = waiting('giant', 'quill');
  b.brain = sim.inspect().bot.create({ ...b.profile, patterns: { bait: 1 } }, seeded(40)); p.ctl = b.brain.hands;
  e.cooldown = 30;
  const to = { x: e.x - p.x, z: e.z - p.z };
  const decision = b.brain.think(dt, p, [e], []);
  assert.ok(decision.mv.x * to.x + decision.mv.z * to.z < 0, 'a baiting bot backs out even with a long safe opening');
  assert.ok(!b.brain.hands.peek('light') && !b.brain.hands.peek('heavy'), 'baiting does not automatically become a swing');
  e.setState('parried'); e.stateTime = 0; p.z = e.z + e.radius + p.radius + 0.7; p.riposte = 1;
  b.brain.think(dt, p, [e], []);
  assert.ok(b.brain.hands.peek('heavy') || b.brain.hands.peek('light'), 'a real riposte opportunity immediately overrides baiting');
}
{
  const { sim, b, p, e } = waiting('giant', 'quill');
  b.brain = sim.inspect().bot.create({ ...b.profile, patterns: { pressure: 1 }, burst: [1, 1], reset: [1, 1], heavy: 0, jump: 0 }, seeded(83)); p.ctl = b.brain.hands;
  e.cooldown = 30; e.def = { ...e.def, posture: { ...e.def.posture, max: 1e6 } };
  let wasAttacking = false, finished = false, retreatFrames = 0, lastDistance = Math.hypot(p.x - e.x, p.z - e.z), hits = 0, lastHp = e.hp;
  for (let i = 0; i < 12 * 60; i++) {
    sim.setPlayers([]); sim.tick(dt);
    if (e.hp < lastHp) hits++; lastHp = e.hp;
    if (wasAttacking && !p.isAttacking()) finished = true;
    const distance = Math.hypot(p.x - e.x, p.z - e.z);
    if (finished && !p.isAttacking() && p.state !== 'roll' && distance > lastDistance + 0.01) retreatFrames++;
    lastDistance = distance; wasAttacking = p.isAttacking();
  }
  assert.ok(retreatFrames >= 15, 'a completed attack burst is followed by a visible retreat');
  assert.ok(hits >= 2, 'the bot returns to attack after regrouping');
}

// Combo decisions are made once per swing. A declined chain must not be retried every frame until it succeeds.
{
  let declined = false;
  for (let seed = 1; seed < 30 && !declined; seed++) {
    const { sim, b, p, e } = waiting('giant', 'quill', false, seed);
    e.cooldown = 30;
    p.z = e.z + e.radius + p.radius + 0.7;
    p.attack = p.def.moveset.attacks.light; p.attackT = p.attack.hits[0].startup + 0.01; p.setState('attack');
    b.brain.think(dt, p, [e], []);
    if (b.brain.hands.peek('light')) continue;
    declined = true;
    for (let i = 0; i < 30; i++) {
      b.brain.hands.clear(); b.brain.think(dt, p, [e], []);
      assert.ok(!b.brain.hands.peek('light'), 'a declined combo remains declined for this swing');
    }
  }
  assert.ok(declined, 'ordinary openings sometimes end after one attack');
}
console.log('Bot tempo: baiting survives safe windows, key openings override it, bursts retreat and re-engage, and combos are chosen once.');

// Check the requested reduction across repeated eligible parry opportunities, without player animation hiding a parry.
for (const profile of profiles) {
  const { sim, b, p, e } = waiting('hollow', profile);
  b.brain = sim.inspect().bot.create({ ...b.profile, evade: 0, jumpDodge: 0 }, seeded(514)); p.ctl = b.brain.hands;
  p.z = e.z + e.radius + p.radius + 0.7; e.yaw = 0;
  const attack = e.baseDef.attacks.find(a => !a.noParry && !a.rollOnly && !a.projectile && a.hits.length === 1);
  let parries = 0, responses = 0;
  for (let sample = 0; sample < 2000; sample++) {
    b.brain.hands.clear(); e.beginAttack(attack); e.stateTime = attack.hits[0].startup - 0.01;
    for (let i = 0; i < 20; i++) {
      b.brain.think(dt, p, [e], []);
      if (b.brain.hands.peek('parry') || b.brain.hands.peek('roll')) {
        parries += Number(b.brain.hands.peek('parry')); responses++; break;
      }
    }
  }
  assert.equal(responses, 2000, 'every eligible blow gets a defensive response');
  const rate = parries / responses;
  assert.ok(Math.abs(rate - b.profile.parry * 0.1) < 0.025, profile + ' parry rate is one tenth of its former preference (' + (rate * 100).toFixed(1) + '%)');
  console.log(profile + ': parried ' + parries + '/' + responses + ' eligible blows.');
}

// Defensive jumping uses ordinary Player physics and low hitboxes; it is not a free invulnerability state.
{
  const { sim, b, p, e } = waiting('giant', 'maren');
  b.brain = sim.inspect().bot.create({ ...b.profile, parry: 0, evade: 0, jumpDodge: 1 }, seeded(7)); p.ctl = b.brain.hands;
  p.z = e.z + e.radius + p.radius + 0.5; p.vx = p.vz = 0; e.yaw = 0;
  const attack = e.baseDef.attacks.find(a => a.id === 'stomp');
  e.beginAttack(attack); e.holdLeft = 0;
  const hp = p.hp; let jumped = false, cleared = false;
  for (let i = 0; i < 3 * 60; i++) {
    sim.setPlayers([]); sim.tick(dt);
    if (p.state === 'jump' || p.state === 'fall') jumped = true;
    if (e.hitbox && e.hitbox.overlaps({ ...p, y: e.y, grounded: true }) && !e.hitbox.overlaps(p) && p.y > e.y) cleared = true;
    if (e.state === 'recover') break;
  }
  assert.ok(jumped && cleared, 'the bot jumps and physically clears the stomp while a grounded body would be hit');
  assert.equal(p.hp, hp, 'the jump avoids the real attack damage');
}
{
  const { sim, b, p, e } = waiting('hollow', 'maren');
  b.brain = sim.inspect().bot.create({ ...b.profile, parry: 0, evade: 0, jumpDodge: 1 }, seeded(7)); p.ctl = b.brain.hands;
  p.z = e.z + e.radius + p.radius + 0.7; e.yaw = 0;
  const attack = e.baseDef.attacks.find(a => !a.projectile && a.hits.length === 1);
  e.beginAttack(attack);
  let rolled = false;
  for (let i = 0; i < 2 * 60; i++) {
    const decision = b.brain.think(dt, p, [e], []);
    assert.ok(!b.brain.hands.peek('jump'), 'a tall swing never gets a defensive jump');
    if (b.brain.hands.peek('roll')) { rolled = true; break; }
    e.stateTime += dt;
  }
  assert.ok(rolled, 'an unjumpable attack keeps its roll response');
}
console.log('Bot jump defence: real clearance and no damage against a low stomp; tall attacks retain rolls.');

{
  const { sim, b, p, e } = waiting('giant', 'quill');
  b.brain = sim.inspect().bot.create({ ...b.profile, parry: 0, evade: 1, jumpDodge: 0 }, seeded(21)); p.ctl = b.brain.hands;
  p.z = e.z + e.radius + p.radius + 1.2; e.yaw = 0;
  const attack = e.baseDef.attacks.find(a => a.id === 'sweep');
  e.beginAttack(attack);
  const hp = p.hp; let rolled = false, movedOut = false, farthest = 0;
  for (let i = 0; i < 3 * 60; i++) {
    sim.setPlayers([]); sim.tick(dt);
    if (p.state === 'roll') rolled = true;
    if (e.hitbox && !e.hitbox.overlaps(p)) movedOut = true;
    farthest = Math.max(farthest, Math.hypot(p.x - e.x, p.z - e.z));
    if (e.state === 'recover') break;
  }
  assert.ok(movedOut && !rolled && p.hp === hp, 'with enough room and wind-up, the bot walks clear and stays out until the swing closes');
  assert.ok(farthest < 7, 'walking evasion stops once clear instead of retreating for the whole wind-up');
}
{
  const { sim, p, e } = waiting('giant', 'maren'), brain = sim.inspect().bot;
  const stomp = e.baseDef.attacks.find(a => a.id === 'stomp'), low = stomp.hits[0];
  assert.ok(brain.jumpLead(e, { attack: stomp, hit: low, index: 0 }, p), 'a low stomp can physically be cleared');
  const chain = { ...stomp, hits: [low, { startup: 0.1, active: 0.15, box: { w: 4, d: 4, h: 4, fwd: 1, y: 2 } }] };
  assert.equal(brain.jumpLead(e, { attack: chain, hit: low, index: 0 }, p), null, 'a quick follow-up vetoes a jump commitment');
  const bolt = { ...stomp, projectile: { speed: 20 } };
  assert.equal(brain.jumpLead(e, { attack: bolt, hit: low, index: 0 }, p), null, 'projectiles do not acquire jump evasion');
}
console.log('Bot spacing: a safe walking escape avoids damage without a roll; fast follow-ups and projectiles veto jumping.');

for (const profile of profiles) {
  let jumps = 0, rolls = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const { sim, b, p, e } = waiting('giant', profile);
    b.brain = sim.inspect().bot.create({ ...b.profile, parry: 0, evade: 0 }, seeded(seed * 131)); p.ctl = b.brain.hands;
    p.z = e.z + e.radius + p.radius + 0.5; p.vx = p.vz = 0; e.yaw = 0;
    e.beginAttack(e.baseDef.attacks.find(a => a.id === 'stomp')); e.holdLeft = 0;
    for (let i = 0; i < 2 * 60; i++) {
      sim.setPlayers([]); sim.tick(dt);
      if (p.state === 'jump') { jumps++; break; }
      if (p.state === 'roll') { rolls++; break; }
    }
  }
  assert.ok(jumps > 0 && rolls > jumps && jumps + rolls === 40, profile + ' sometimes jumps a low stomp, usually rolls, and never gets stuck deciding');
  console.log(profile + ': ' + jumps + ' jumps and ' + rolls + ' rolls over 40 eligible low attacks.');
}

{
  const { sim, b, p, e } = waiting('giant', 'maren');
  b.brain = sim.inspect().bot.create({ ...b.profile, parry: 0, evade: 0, jumpDodge: 1 }, seeded(7)); p.ctl = b.brain.hands;
  p.z = e.z + e.radius + p.radius + 0.5; p.vx = p.vz = 0; e.yaw = 0;
  const otherSim = createSimulation(); otherSim.addBot(); otherSim.start('arena', 'hollow');
  const other = otherSim.inspect().Game.duel;
  other.x = p.x; other.z = p.z + 1.7; other.yaw = Math.PI;
  const tall = other.baseDef.attacks.find(a => !a.projectile && a.hits.length === 1);
  e.beginAttack(e.baseDef.attacks.find(a => a.id === 'stomp')); e.holdLeft = 0; e.stateTime = e.attack.hits[0].startup - 0.4;
  other.beginAttack(tall); other.stateTime = tall.hits[0].startup - 0.3;
  let rolled = false;
  for (let i = 0; i < 40; i++) {
    b.brain.think(dt, p, [e, other], []);
    assert.ok(!b.brain.hands.peek('jump'), 'another incoming attack vetoes a jump over the low attack');
    if (b.brain.hands.peek('roll')) { rolled = true; break; }
    e.stateTime += dt; other.stateTime += dt;
  }
  assert.ok(rolled, 'overlapping threats retain a grounded emergency dodge');
}

{
  const { sim, b, p, e } = waiting('giant', 'tobin');
  b.brain = sim.inspect().bot.create({ ...b.profile, patterns: { bait: 1 }, heavy: 0, jump: 0 }, seeded(19)); p.ctl = b.brain.hands;
  p.z = e.z + 6; p.vx = p.vz = 0;
  e.attack = e.baseDef.attacks.find(a => a.id === 'sweep'); e.setState('recover'); e.stateTime = 0;
  const hp = e.hp;
  for (let i = 0; i < 2 * 60 && e.hp === hp; i++) { sim.setPlayers([]); sim.tick(dt); }
  assert.ok(e.hp < hp, 'a bot pursues a recovery opening long enough to close and hit, rather than abandoning it mid-approach');
}

{
  const choice = atEdge => {
    const { sim, b, p, e } = waiting('giant', 'maren');
    b.brain = sim.inspect().bot.create({ ...b.profile, parry: 0, evade: 0, jumpDodge: 1 }, () => 0.5); p.ctl = b.brain.hands;
    e.x = atEdge ? 15.7 : 0; e.z = 0; e.yaw = Math.PI / 2;
    p.x = e.x + 1.8; p.z = 0; p.vx = 1.1; p.vz = 0;
    e.beginAttack(e.baseDef.attacks.find(a => a.id === 'stomp')); e.holdLeft = 0; e.stateTime = e.attack.hits[0].startup - 0.18;
    for (let i = 0; i < 20; i++) {
      b.brain.think(dt, p, [e], []);
      if (b.brain.hands.peek('jump')) return 'jump';
    }
    e.stateTime = e.attack.hits[0].startup - 0.05;
    for (let i = 0; i < 10; i++) b.brain.think(dt, p, [e], []);
    return b.brain.hands.peek('roll') ? 'roll' : 'none';
  };
  assert.equal(choice(false), 'jump', 'a clear landing path permits the eligible jump');
  assert.equal(choice(true), 'roll', 'drift beyond the arena edge vetoes a jump and falls back to a roll');
}
