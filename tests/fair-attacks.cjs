'use strict';
// Every attack fair on its own, and bosses that move for the new player (pass 93, PLAN.md rework item 4):
// - every ground area hit (areaHit, CONFIG.area) shows its reach long enough before it strikes, stops turning before
//   it lands unless it is a ring or a disc round the body, never moves under its mark, hits nothing outside it, and a dash on any spot
//   of it gets through; js/validate.js refuses data that breaks any of it;
// - a phase keeps at most CONFIG.undeflectable.bigMoments moves no guard deflects besides its area hits, grabs and leaps;
// - a boss walks, turns and tracks at its pace (CONFIG.bossMove), circles its player while it holds, takes its distance
//   again after a dash, and recovers longer from a blow dashed through.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createSimulation, root } = require('../server/headless.cjs');

// The engine and data in a VM of their own, for the data checks (the server's VM keeps its globals to itself).
const html = fs.readFileSync(path.join(root, 'combat-arena-3d.html'), 'utf8');
const files = [...html.match(/const GAME_FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+\.js)'/g)].map(m => m[1]);
const engine = new Set(['config.js', 'net-protocol.js', 'helpers.js', 'terrain.js', 'states.js', 'registries.js', 'events.js', 'world.js', 'character.js', 'player.js', 'enemy.js', 'crowd.js', 'combat.js', 'finisher.js', 'abilities.js', 'bot-navigation.js', 'bot.js', 'companions.js', 'game.js', 'game-menus.js', 'game-view.js', 'game-level.js', 'attack-anim.js']);
const V = vm.createContext(vm.constants.DONT_CONTEXTIFY);
Object.assign(V, { console, performance, THREE: { Vector3: class { constructor() { this.x = this.y = this.z = 0; } } }, THREE_ADDONS: {}, Rig: class { dispose() {} },
  location: { hash: '' }, window: { addEventListener() {} }, projectiles: { fire() {} }, bindLabel: () => '' });
for (const f of files.filter(f => engine.has(f) || f.startsWith('data/') || f.startsWith('levels/'))) vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), V, { filename: f });
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'validate.js'), 'utf8'), V, { filename: 'validate.js' });
const G = vm.runInContext('({ ENEMY_DEFS, CONFIG, PLAYER_DEF, areaHit, areaDwell, areaShape, hitReach, isBossDef, canParryHit, validateData, Hitbox })', V);
const A = G.CONFIG.area, bosses = G.ENEMY_DEFS.filter(G.isBossDef);
const errors = () => [...G.validateData({ visual: false })];   // an array of this realm
assert.deepEqual(errors(), [], 'the data as shipped passes');

// 1. Every ground area hit of every boss, Story's and Boss Rush's alike.
let areas = 0;
for (const d of bosses) for (const a of d.attacks) a.hits.forEach((h, i) => {
  if (!G.areaHit(a, i)) return;
  areas++;
  const tag = `${d.id} ${a.id} hit ${i + 1}`, prev = a.hits[i - 1], b = h.box || a.box;
  assert.ok(!a.hits.some(x => x.leap), `${tag}: a leap slam is never one (they stay as they are)`);
  if (!h.burrow) assert.ok(h.startup + (prev ? prev.active + (prev.follow || 0) : 0) >= A.tell - 1e-6, `${tag}: its reach shows ${A.tell} s before it lands`);
  assert.ok(!h.step && !h.blink, `${tag}: it never moves under its mark`);
  if (!b.ring && !(b.round && Math.abs(b.fwd) <= A.offset)) assert.ok(a.tracking && h.startup * (1 - a.tracking.commit) >= A.locked - 1e-6, `${tag}: it stops turning ${A.locked} s before it lands`);
  assert.ok(G.areaDwell(b, h.active, G.PLAYER_DEF.radius) <= G.CONFIG.player.rollIFrames * A.dash + 1e-6, `${tag}: a dash anywhere on it gets through`);
});
assert.ok(areas >= 25, `the rule covers the bosses' area hits (${areas})`);
const varn = bosses.find(d => d.id === 'varn');
assert.ok(!varn.attacks.some(a => /stomp|stamp/i.test(a.id + a.name)), 'Aldric lost his borrowed stamp');
assert.ok(!bosses.some(d => d.attacks.some(a => /earth stomp/i.test(a.name))), 'no boss stomps the earth');
console.log(`${areas} ground area hits: shown ${A.tell} s ahead, locked, still, dashable`);

// 2. No damage outside what the floor showed: the round burst and the box hit exactly their drawn shape (+ the body).
{
  const owner = { x: 0, y: 0, z: 0, yaw: 0, stateTime: 0 }, body = r => (x, z) => ({ x, y: 0, z, radius: r, height: 1.8, grounded: true });
  const round = new G.Hitbox(owner, { w: 6, h: 2, d: 6, fwd: 0, y: 1, round: true }, {}), p = body(0.36);
  const at = (hb, x, z) => hb.overlaps(p(x, z));
  assert.ok(at(round, 0, 3.3) && !at(round, 0, 3.4), 'the burst reaches its disc and the body on its edge, no further');
  assert.ok(!at(round, 2.4, 2.4), 'the corner a square box would have reached is outside its disc: no hit there');
  const box = new G.Hitbox(owner, { w: 2, h: 1, d: 4, fwd: 3, y: 0.5 }, {});
  assert.ok(at(box, 0, 5.3) && !at(box, 0, 5.4) && !at(box, 1.4, 3), 'the box hits its own rectangle and no more');
  // Every boss's area hit, through its whole strike: no spot on the floor is hit that its mark (areaShape, what
  // js/area-marks.js draws) leaves out, beyond the body's own radius.
  const R = G.PLAYER_DEF.radius;
  let spots = 0;
  for (const d of bosses) for (const a of d.attacks) a.hits.forEach((h, i) => {
    if (!G.areaHit(a, i) || h.burrow) return;
    const b = h.box || a.box, M = G.areaShape(a, h, {}), me = { x: 0, y: 0, z: 0, yaw: 0, stateTime: 0 }, hb = new G.Hitbox(me, b, {});
    const grid = M.outer + 1;
    for (let t = 0; t <= h.active + 1e-9; t += h.active / 6) {
      me.stateTime = t;
      for (let x = -grid; x <= grid; x += 0.25) for (let z = b.fwd - grid; z <= b.fwd + grid; z += 0.25) {
        if (!hb.overlaps(p(x, z))) continue;
        spots++;
        const lx = x, lz = z - b.fwd, r = Math.hypot(lx, lz);
        const out = M.shape === 'ring' ? Math.max(M.inner - r, r - M.outer) : M.shape === 'round' ? r - M.outer
          : Math.hypot(Math.max(0, Math.abs(lx) - M.hw), Math.max(0, Math.abs(lz) - M.hd));
        assert.ok(out <= R + 1e-6, `${d.id} ${a.id} hit ${i + 1} at ${t.toFixed(2)} s hits (${x}, ${z}), ${out.toFixed(2)} m outside its mark`);
      }
    }
  });
  assert.ok(spots > 1000, 'the sweep found the hits');
  console.log(`every area hit stays inside its floor mark (${spots} spots hit, none outside)`);
}

// 3. validate.js refuses an unfair one: a short tell, a mark that keeps turning, a strike too long to dash through.
{
  const stomp = bosses.find(d => d.id === 'giant').attacks.find(a => a.id === 'stomp'), keep = JSON.stringify(stomp);
  const reset = () => Object.assign(stomp, JSON.parse(keep));
  stomp.hits[0].startup = 0.5; assert.ok(errors().some(e => /stomp.*ground area hit.*shows its reach/.test(e)), 'a stomp told for 0.5 s is refused'); reset();
  stomp.hits[0].active = 0.5; assert.ok(errors().some(e => /stomp.*holds a spot/.test(e)), 'a stomp too long to dash through is refused'); reset();
  stomp.hits[0] = { ...stomp.hits[0], step: { from: 0.2, speed: 3, side: 0 } }; assert.ok(errors().some(e => /stomp.*must not move under its mark/.test(e)), 'a stomp that steps in is refused'); reset();
  const furrow = bosses.find(d => d.id === 'agathe').attacks.find(a => a.id === 'rendEarth'), fk = JSON.stringify(furrow.tracking);
  furrow.tracking.commit = 0.95; assert.ok(errors().some(e => /rendEarth.*stop at least/.test(e)), 'a furrow still turning as it lands is refused'); furrow.tracking = JSON.parse(fk);
  assert.deepEqual(errors(), [], 'restored');
  console.log('unfair area hits are refused at load');
}

// 4. Most moves can be deflected: per phase, at most `bigMoments` beside area hits, grabs, leaps, shots and fire.
{
  let all = 0, undeflectable = 0;
  for (const d of bosses) for (const a of d.attacks) { all++; if (a.noParry || a.rollOnly) undeflectable++; }
  const ostrey = bosses.find(d => d.id === 'ostrey'), turn = ostrey.attacks.find(a => a.id === 'buttBack');
  assert.ok(G.canParryHit(turn, 0), 'a turn on someone behind it can be deflected now');
  turn.noParry = true; const swing = ostrey.attacks.find(a => a.id === 'lanternSwing'); swing.noParry = true;
  assert.ok(errors().some(e => /ostrey.*moves no guard can deflect/.test(e)), 'a third undeflectable move in a phase is refused');
  delete turn.noParry; delete swing.noParry;
  assert.deepEqual(errors(), [], 'restored');
  console.log(`${undeflectable} of ${all} boss attacks no guard deflects (area hits, grabs, leaps, shots, fire and each phase's biggest moments)`);
}

// 5. Bosses move for the new player, on one pace (headless server simulation; its stand-in players are never wounded).
const STEP = 1 / 60;
function duel(boss, won = null, far = 15) {
  const sim = createSimulation({ seed: 3 }); sim.start('arena', boss);
  if (won !== null) sim.setRushFight(won);
  const { Game, CONFIG } = sim.inspect(), e = Game.enemies.find(e => e.isBoss());
  const me = { id: 'p0', x: e.x, y: e.y, z: e.z + far, yaw: Math.PI, hp: 100, state: 'idle', stateTime: 0, grounded: true };
  const run = (s, each) => { for (let i = 0; i < Math.round(s * 60); i++) { if (each) each(); sim.setPlayers([me]); sim.tick(STEP); } };
  run(0.1);
  return { sim, e, me, run, CONFIG };
}
{
  // The pace: walking, turning and tracking follow it, the same curve as its timings.
  const slow = duel('pillagerCaptain', 0), base = duel('pillagerCaptain', 4, 22), fast = duel('pillagerCaptain', 19, 22), M = base.CONFIG.bossMove;   // 22 m: both still running in
  assert.equal(base.e.moveRate(), 1, 'at a boss\'s own pace it moves as written');
  assert.ok(slow.e.moveRate() < 1 && fast.e.moveRate() > 1.3 && fast.e.moveRate() <= M.max, `slower in the warm-up, faster deep in a run (${slow.e.moveRate().toFixed(2)}, ${fast.e.moveRate().toFixed(2)})`);
  const closing = D => { D.run(0.4, () => { D.e.cooldown = 99; }); const z0 = D.me.z - D.e.z; D.run(0.5, () => { D.e.cooldown = 99; }); return (z0 - (D.me.z - D.e.z)) / 0.5; };   // under way
  const v0 = closing(base), v1 = closing(fast), sp = base.e.def.speed;
  assert.ok(v0 > sp * 1.2, `from afar it runs in (${v0.toFixed(2)} m/s, its walk ${sp})`);
  assert.ok(Math.abs(v1 / v0 - fast.e.moveRate()) < 0.08, `faster at a faster pace, by its move rate (${(v1 / v0).toFixed(2)} vs ${fast.e.moveRate().toFixed(2)})`);
  console.log(`move rate: x${slow.e.moveRate().toFixed(2)} in the warm-up, x1 at its own pace, x${fast.e.moveRate().toFixed(2)} at fight 20; runs in at ${v0.toFixed(1)} m/s`);
}
{
  // Holding alone, it circles its player, still facing them.
  const D = duel('pillagerCaptain', 4), { e, me } = D;
  D.run(4, () => { e.cooldown = 99; });
  const bearing = () => Math.atan2(e.x - me.x, e.z - me.z), b0 = bearing(), d0 = Math.hypot(e.x - me.x, e.z - me.z);
  let moved = 0, last = b0;
  D.run(3, () => { e.cooldown = 99; const b = bearing(); moved += Math.abs(Math.atan2(Math.sin(b - last), Math.cos(b - last))); last = b; });
  assert.ok(moved > 0.25, `it circles while it holds (${moved.toFixed(2)} rad round in 3 s)`);
  assert.ok(Math.abs(Math.hypot(e.x - me.x, e.z - me.z) - d0) < 1.5, 'at about the same distance');
  console.log(`holding, it circles ${moved.toFixed(2)} rad round its player in 3 s`);
}
{
  // The player's dash: it takes its distance again, quicker than it walks up to a player who stepped back.
  const closed = dash => {
    const D = duel('pillagerCaptain', 4), { e, me } = D;
    D.run(4, () => { e.cooldown = 99; });
    me.z += 3; me.state = dash ? 'roll' : 'walk'; D.run(0.05, () => { e.cooldown = 99; });
    if (dash) assert.ok(e.respace > 0, 'it saw the dash');
    me.state = 'idle'; const d0 = Math.hypot(e.x - me.x, e.z - me.z);
    D.run(0.6, () => { e.cooldown = 99; });
    return d0 - Math.hypot(e.x - me.x, e.z - me.z);
  };
  const walked = closed(false), dashed = closed(true);
  assert.ok(dashed > walked * 1.2, `after a dash it closes the gap faster (${dashed.toFixed(2)} m against ${walked.toFixed(2)} m in 0.6 s)`);
  console.log(`after a dash it re-spaces: ${dashed.toFixed(2)} m in 0.6 s (${walked.toFixed(2)} m after a step back)`);
}
{
  // A blow dashed through recovers longer; one that was not, as written.
  const recovery = dash => {
    const D = duel('pillagerCaptain', 4), { e, me } = D, a = e.def.attacks.find(a => a.id === 'captainOverhead');
    me.x = e.x; me.z = e.z + 2.5; D.run(0.05, () => { e.cooldown = 99; });
    e.yaw = 0; e.beginAttack(a);
    let t = 0, claimed = false;
    D.run(6, () => {   // dashed through: the player rolls under the strike and claims the perfect dodge, as a client does
      me.state = 'idle';
      if (dash && e.state === 'active' && !claimed) { me.state = 'roll'; D.sim.setPlayers([me]); claimed = D.sim.dodged('p0', { enemy: e.netId, serial: e.netAttack }); }
      if (e.state === 'recover') t += STEP; if (e.state !== 'recover' && t > 0) e.cooldown = 99;
    });
    if (dash) assert.ok(claimed, 'the server took the dodge');
    return { t, a, mul: e.recoverMul };
  };
  const plain = recovery(false), dodged = recovery(true), M = createSimulation().inspect().CONFIG.bossMove;
  assert.ok(Math.abs(plain.t - plain.a.recovery) < 0.05, `not dashed through: its own recovery (${plain.t.toFixed(2)} s)`);
  assert.ok(Math.abs(dodged.t - plain.a.recovery * M.dodged.recovery) < 0.06, `dashed through: ${M.dodged.recovery}x as long (${dodged.t.toFixed(2)} s)`);
  console.log(`recovery ${plain.t.toFixed(2)} s, dashed through ${dodged.t.toFixed(2)} s`);
}
{
  // A ground area hit holds still under its mark through its wind-up and its strike.
  const D = duel('giant', 4), { e, me } = D, stomp = e.def.attacks.find(a => a.id === 'stomp');
  me.x = e.x; me.z = e.z + 2; D.run(0.05, () => { e.cooldown = 99; });
  e.beginAttack(stomp); const x0 = e.x, z0 = e.z;
  let far = 0;
  D.run(stomp.hits[0].startup + 1, () => { if (e.attack === stomp && (e.state === 'windup' || e.state === 'active')) far = Math.max(far, Math.hypot(e.x - x0, e.z - z0)); });
  assert.ok(far < 0.02, `the stomp lands where its mark lay (moved ${far.toFixed(3)} m)`);
  console.log('the stomp never moves under its mark');
}
