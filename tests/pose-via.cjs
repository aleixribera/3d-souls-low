'use strict';
// In-between keys and the pose library (pass 111, js/attack-anim.js `via`, js/data/pose-library.js):
// - a phase with via keys starts and ends on the same key poses as without them, and passes through each key;
// - `rel` keys add to the straight blend; a library name resolves to its keys (the Pillager Captain's Overhead Cleave);
// - the curve has no jump from one 60 Hz frame to the next, through the keys and across phase changes;
// - validation refuses a via with an unknown name, keys out of order, or a bone the skeleton lacks;
// - a held wind-up with `hold.creep` (pass 115) keeps moving through the hold and still strikes on time.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { root } = require('../server/headless.cjs');

const html = fs.readFileSync(path.join(root, 'combat-arena-3d.html'), 'utf8');
const files = [...html.match(/const GAME_FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+\.js)'/g)].map(m => m[1]);
const engine = new Set(['config.js', 'net-protocol.js', 'helpers.js', 'terrain.js', 'states.js', 'registries.js', 'events.js', 'world.js', 'character.js', 'player.js', 'enemy.js', 'crowd.js', 'combat.js', 'finisher.js', 'abilities.js', 'bot-navigation.js', 'bot.js', 'companions.js', 'game.js', 'game-menus.js', 'game-view.js', 'game-level.js', 'attack-anim.js']);
const V = vm.createContext(vm.constants.DONT_CONTEXTIFY);
Object.assign(V, { console, performance, THREE: { Vector3: class { constructor() { this.x = this.y = this.z = 0; } } }, THREE_ADDONS: {}, Rig: class { dispose() {} },
  location: { hash: '' }, window: { addEventListener() {} }, projectiles: { fire() {} }, bindLabel: () => '' });
for (const f of files.filter(f => engine.has(f) || f.startsWith('data/') || f.startsWith('levels/'))) vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), V, { filename: f });
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'validate.js'), 'utf8'), V, { filename: 'validate.js' });
const G = vm.runInContext('({ ENEMY_DEFS, ATTACK_POSES, POSE_LIBRARY, poseAttackKeys, checkAttackAnim, validateData, phaseSpan, Enemy, CONFIG })', V);
assert.deepEqual([...G.validateData({ visual: false })], [], 'the data as shipped passes');

// A rig of plain numbers: each bone's rotation, crouch and lean summed, the haft's line.
const BONES = ['tip', 'spin', 'chest', 'neck', 'head', 'armL', 'armR', 'elbowL', 'elbowR', 'legL', 'legR', 'kneeL', 'kneeR', 'weapon'];
const fakeRig = () => {
  const r = { bones: {}, c: 0, l: 0, grip: { rest: [0.3, 0, 3.14] }, haftNow: [0, 0, 0], gripW: 0 };
  for (const b of BONES) r.bones[b] = { rotation: { x: 0, y: 0, z: 0 } };
  r.crouch = d => { r.c += d; }; r.lean = a => { r.l += a; };
  return r;
};
const sample = (a, tt) => {
  const r = fakeRig(); G.poseAttackKeys(r, a, tt);
  const v = [r.c, r.l, ...r.haftNow]; for (const b of BONES) { const R = r.bones[b].rotation; v.push(R.x, R.y, R.z); }
  return v;
};
const maxDiff = (u, w) => Math.max(...u.map((x, i) => Math.abs(x - w[i])));

// 1. The Captain's cleave winds up through the library's raise, and strikes and follows through on keys of its own (pass 113).
const cap = G.ENEMY_DEFS.find(d => d.id === 'pillagerCaptain'), cleave = cap.attacks.find(a => a.id === 'captainOverhead');
const P = G.ATTACK_POSES[cleave.pose];
const raise = G.POSE_LIBRARY.haftOverheadRaise.keys;
assert.deepEqual(P.hits[0].via.windup.slice(0, raise.length), raise);
assert.ok(P.hits[0].via.active.length && P.hits[0].via.follow.length, 'the strike and the follow-through have in-between keys');
assert.ok(G.POSE_LIBRARY.haftOverheadRaise.keys.length >= 2);

// 2. Same ends as the straight blend; different in between; no jumps at 60 Hz.
const plain = { ...JSON.parse(JSON.stringify(cleave)), pose: '__plainCleave' };
G.ATTACK_POSES.__plainCleave = { ...P, hits: P.hits.map(h => ({ ...h, via: undefined })) };
delete G.ATTACK_POSES.__plainCleave.hits[0].via;
const [w0, wLen] = G.phaseSpan(cleave, 'windup', 0);
const end = G.phaseSpan(cleave, 'recovery', 0)[0] + cleave.recovery;
const [a0, aLen] = G.phaseSpan(cleave, 'active', 0), [f0, fLen] = G.phaseSpan(cleave, 'follow', 0);
for (const t of [0.0001, w0 + wLen - 0.0001, a0 + aLen - 0.0001, f0 + fLen - 0.0001, end - 0.01])
  assert.ok(maxDiff(sample(cleave, t), sample(plain, t)) < 0.02, `via keeps the authored pose at ${t.toFixed(3)} s`);
const mid = Math.max(...[0.25, 0.5, 0.75].map(k => maxDiff(sample(cleave, w0 + wLen * k), sample(plain, w0 + wLen * k))));
assert.ok(mid > 0.1, `the captured raise changes the wind-up (largest change ${mid.toFixed(2)} rad)`);
const strike = maxDiff(sample(cleave, a0 + aLen * 0.5), sample(plain, a0 + aLen * 0.5)), follow = maxDiff(sample(cleave, f0 + fLen * 0.25), sample(plain, f0 + fLen * 0.25));
assert.ok(strike > 0.1 && follow > 0.05, `the strike's and follow-through's keys bend the blend (${strike.toFixed(2)}, ${follow.toFixed(2)} rad)`);
// Every channel, frame by frame through the whole attack: no frame steps far past both of its neighbours (a jump), and
// through the wind-up nothing moves faster than the strike does (the capture's snap stays a wind-up's).
const steps = [];
let prev = sample(cleave, 0);
for (let t = 1 / 60; t < end; t += 1 / 60) { const s = sample(cleave, t); steps.push({ t, d: s.map((v, i) => Math.abs(v - prev[i])) }); prev = s; }
const CH = ['crouch', 'lean', 'haft0', 'haft1', 'haft2', ...BONES.flatMap(b => [b + '.x', b + '.y', b + '.z'])], spikeAt = [];
let spikes = 0, worstWind = 0, worstAll = 0;
steps.forEach((st, k) => st.d.forEach((d, i) => {
  worstAll = Math.max(worstAll, d); if (st.t <= w0 + wLen) worstWind = Math.max(worstWind, d);
  const a = steps[k - 1], b = steps[k + 1];
  if (a && b && d > 0.03 && d > 2.5 * Math.max(a.d[i], b.d[i])) { spikes++; spikeAt.push(`${CH[i]} at ${st.t.toFixed(3)} s`); }
}));
assert.equal(spikes, 0, `no single-frame jump in any channel (${spikeAt.join(', ')})`);
assert.ok(worstWind < worstAll, `the wind-up's fastest frame (${worstWind.toFixed(3)} rad) is slower than the strike's (${worstAll.toFixed(3)})`);

// 3. Absolute keys are passed through; rel keys add to the blend.
G.ATTACK_POSES.__viaTest = { hits: [{ windup: { armR: [-1, 0, 0] }, strike: { armR: [0, 0, 0] },
  via: { windup: [{ t: 0.5, armR: [-2, 0, 0] }] } }], ease: { windup: 'linear' }, lag: { armR: 0 } };
G.ATTACK_POSES.__viaRel = { hits: [{ windup: { armR: [-1, 0, 0] }, strike: { armR: [0, 0, 0] },
  via: { windup: [{ t: 0.5, rel: true, armR: [-2, 0, 0] }] } }], ease: { windup: 'linear' }, lag: { armR: 0 } };
const one = id => ({ id, pose: id, hits: [{ startup: 1, active: 0.1 }], recovery: 0.5, damage: 1, box: { w: 1, h: 1, d: 1, fwd: 1, y: 1 } });
const armR = (id, t) => { const r = fakeRig(); G.poseAttackKeys(r, one(id), t); return r.bones.armR.rotation.x; };
assert.ok(Math.abs(armR('__viaTest', 0.5) - -2) < 1e-6, 'an absolute key is passed through');
assert.ok(Math.abs(armR('__viaRel', 0.5) - -2.5) < 1e-6, 'a rel key adds to the straight blend (-0.5 - 2)');

// 4. Validation.
const errs = id => { const out = []; G.checkAttackAnim(one(id), id, (ok, msg) => { if (!ok) out.push(msg); }); return out; };
assert.deepEqual(errs('__viaTest'), []);
G.ATTACK_POSES.__bad1 = { hits: [{ windup: {}, strike: {}, via: { windup: 'noSuchMotion' } }] };
G.ATTACK_POSES.__bad2 = { hits: [{ windup: {}, strike: {}, via: { windup: [{ t: 0.6 }, { t: 0.4 }] } }] };
G.ATTACK_POSES.__bad3 = { hits: [{ windup: {}, strike: {}, via: { windup: [{ t: 0.5, tail: [0, 0, 0] }] } }] };
G.ATTACK_POSES.__bad4 = { hits: [{ windup: {}, strike: {}, via: { swing: [] } }] };
for (const [id, word] of [['__bad1', 'POSE_LIBRARY'], ['__bad2', 'rising'], ['__bad3', 'bone'], ['__bad4', 'via must be']])
  assert.ok(errs(id).some(m => m.includes(word)), `${id} refused (${errs(id).join(' | ') || 'no error'})`);

// 5. The cleave held for 0.4 s and 1 s (its hold's range): the drawn wind-up clock rises every frame through the hold (the body
// never freezes), creeps at most CONFIG.enemy.holdCreep.cap of the wind-up's rest, and meets the simulation's clock at the strike.
const W = cleave.hits[0], tH = W.startup * W.hold.at, dt = 1 / 60;
assert.ok(W.hold.creep > 0, 'the cleave creeps through its hold');
for (const hold of [0.4, 1]) {
  const e = { stateTime: 0, holdLeft: null };   // the simulation's side, as js/enemy.js steps it
  let last = -1, minStep = Infinity, crept = 0;
  while (e.stateTime < W.startup - 1e-9) {
    if (e.holdLeft === null && e.stateTime + dt >= tH) e.holdLeft = hold;
    e.stateTime += dt;
    if (e.holdLeft > 0) { e.holdLeft -= dt; e.stateTime = Math.min(e.stateTime, tH); }
    const drawn = G.Enemy.prototype.creepTime.call(e, W, e.stateTime, dt);
    if (last >= 0) minStep = Math.min(minStep, drawn - last);
    if (e.holdLeft > 0) crept = drawn - tH;
    last = drawn;
  }
  assert.ok(minStep > dt * W.hold.creep * 0.5, `held ${hold} s: the drawn clock never stops (slowest frame ${(minStep / dt).toFixed(2)}x)`);
  assert.ok(crept > 0 && crept <= (W.startup - tH) * G.CONFIG.enemy.holdCreep.cap + 1e-9, `held ${hold} s: crept ${crept.toFixed(2)} s of the wind-up`);
  assert.ok(Math.abs(last - W.startup) < 0.02, `held ${hold} s: the drawn wind-up ends with the simulation's (${last.toFixed(3)} of ${W.startup})`);
}
const bad = one('__viaTest'); bad.hits[0].hold = { at: 0.5, time: [0.2, 0.4], chance: 1, creep: 1.5 };
const badErrs = []; G.checkAttackAnim(bad, 'creep', (ok, msg) => { if (!ok) badErrs.push(msg); });
assert.ok(badErrs.some(m => m.includes('creep')), 'a creep of 1 or more is refused');

// 6. The Bell Warden's in-between keys (pass 124): every attack with a via keeps its authored ends at every phase change,
// bends the blend in every phase that has keys, and has no single-frame jump in any channel through the whole attack.
const warden = G.ENEMY_DEFS.find(d => d.id === 'bellWarden');
const viaAttacks = warden.attacks.filter(a => (G.ATTACK_POSES[a.pose].hits || []).some(h => h.via));
assert.ok(['wardenSweep', 'wardenHammerfall', 'wardenBackhand', 'wardenUpswing', 'wardenFall', 'wardenThreeTolls', 'wardenSweepReturn'].every(id => viaAttacks.some(a => a.id === id)),
  `the Warden's heavy swings have in-between keys (${viaAttacks.map(a => a.id).join(', ')})`);
for (const a of viaAttacks) {
  const PA = G.ATTACK_POSES[a.pose], id = '__plain_' + a.id;
  G.ATTACK_POSES[id] = { ...PA, hits: PA.hits.map(h => { const c = { ...h }; delete c.via; return c; }) };
  const flat = { ...a, pose: id };
  a.hits.forEach((h, i) => {
    const vh = PA.hits[i].via || {};
    for (const ph of ['windup', 'active', 'follow']) {
      const [s0, len] = G.phaseSpan(a, ph, i);
      if (!(len > 0)) continue;
      if (ph !== 'windup' || i > 0) assert.ok(maxDiff(sample(a, s0 + 0.0001), sample(flat, s0 + 0.0001)) < 0.02, `${a.id} hit ${i}: the ${ph} starts on its authored pose`);
      assert.ok(maxDiff(sample(a, s0 + len - 0.0001), sample(flat, s0 + len - 0.0001)) < 0.02, `${a.id} hit ${i}: the ${ph} ends on its authored pose`);
      if (!vh[ph]) continue;
      const bent = Math.max(...[0.2, 0.3, 0.4, 0.5, 0.6, 0.75].map(k => maxDiff(sample(a, s0 + len * k), sample(flat, s0 + len * k))));
      assert.ok(bent > 0.05, `${a.id} hit ${i}: the ${ph}'s keys bend the blend (${bent.toFixed(2)} rad)`);
    }
  });
  const endA = G.phaseSpan(a, 'recovery', a.hits.length - 1)[0] + a.recovery, st = [], at = [];
  let pv = sample(a, 0);
  for (let t = 1 / 60; t < endA; t += 1 / 60) { const s = sample(a, t); st.push({ t, d: s.map((v, i) => Math.abs(v - pv[i])) }); pv = s; }
  st.forEach((s, k) => s.d.forEach((d, i) => { const p = st[k - 1], n = st[k + 1]; if (p && n && d > 0.03 && d > 2.5 * Math.max(p.d[i], n.d[i])) at.push(`${CH[i]} at ${s.t.toFixed(3)} s`); }));
  assert.equal(at.length, 0, `${a.id}: no single-frame jump in any channel (${at.join(', ')})`);
}

console.log(`pose via: the Bell Warden's ${viaAttacks.length} attacks with in-between keys keep their ends and never jump`);
console.log(`pose via: the Captain's cleave raise ${mid.toFixed(2)} rad off the straight blend at most, fastest wind-up frame ${worstWind.toFixed(3)} rad, all checks pass`);
