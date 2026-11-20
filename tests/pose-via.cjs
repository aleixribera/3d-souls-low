'use strict';
// In-between keys and the pose library (pass 111, js/attack-anim.js `via`, js/data/pose-library.js):
// - a phase with via keys starts and ends on the same key poses as without them, and passes through each key;
// - `rel` keys add to the straight blend; a library name resolves to its keys (the Pillager Captain's Overhead Cleave);
// - the curve has no jump from one 60 Hz frame to the next, through the keys and across phase changes;
// - validation refuses a via with an unknown name, keys out of order, or a bone the skeleton lacks.
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
const G = vm.runInContext('({ ENEMY_DEFS, ATTACK_POSES, POSE_LIBRARY, poseAttackKeys, checkAttackAnim, validateData, phaseSpan })', V);
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

// 1. The Captain's cleave names the library's raise, and it resolves.
const cap = G.ENEMY_DEFS.find(d => d.id === 'pillagerCaptain'), cleave = cap.attacks.find(a => a.id === 'captainOverhead');
const P = G.ATTACK_POSES[cleave.pose];
assert.equal(P.hits[0].via.windup, 'haftOverheadRaise');
assert.ok(G.POSE_LIBRARY.haftOverheadRaise.keys.length >= 2);

// 2. Same ends as the straight blend; different in between; no jumps at 60 Hz.
const plain = { ...JSON.parse(JSON.stringify(cleave)), pose: '__plainCleave' };
G.ATTACK_POSES.__plainCleave = { ...P, hits: P.hits.map(h => ({ ...h, via: undefined })) };
delete G.ATTACK_POSES.__plainCleave.hits[0].via;
const [w0, wLen] = G.phaseSpan(cleave, 'windup', 0);
const end = G.phaseSpan(cleave, 'recovery', 0)[0] + cleave.recovery;
for (const t of [0.0001, w0 + wLen - 0.0001, w0 + wLen + 0.05, end - 0.01])
  assert.ok(maxDiff(sample(cleave, t), sample(plain, t)) < 0.02, `via keeps the authored pose at ${t.toFixed(3)} s`);
const mid = Math.max(...[0.25, 0.5, 0.75].map(k => maxDiff(sample(cleave, w0 + wLen * k), sample(plain, w0 + wLen * k))));
assert.ok(mid > 0.1, `the captured raise changes the wind-up (largest change ${mid.toFixed(2)} rad)`);
// Every channel, frame by frame through the whole attack: no frame steps far past both of its neighbours (a jump), and
// through the wind-up nothing moves faster than the strike does (the capture's snap stays a wind-up's).
const steps = [];
let prev = sample(cleave, 0);
for (let t = 1 / 60; t < end; t += 1 / 60) { const s = sample(cleave, t); steps.push({ t, d: s.map((v, i) => Math.abs(v - prev[i])) }); prev = s; }
let spikes = 0, worstWind = 0, worstAll = 0;
steps.forEach((st, k) => st.d.forEach((d, i) => {
  worstAll = Math.max(worstAll, d); if (st.t <= w0 + wLen) worstWind = Math.max(worstWind, d);
  const a = steps[k - 1], b = steps[k + 1];
  if (a && b && d > 0.03 && d > 2.5 * Math.max(a.d[i], b.d[i])) spikes++;
}));
assert.equal(spikes, 0, 'no single-frame jump in any channel');
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

console.log(`pose via: the Captain's cleave raise ${mid.toFixed(2)} rad off the straight blend at most, fastest wind-up frame ${worstWind.toFixed(3)} rad, all checks pass`);
