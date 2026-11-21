'use strict';
// The body check (retro 130): does the body move the blow, or only the weapon arm?
// "Only the weapon travels; the hips and torso never coil, drop or overshoot" was the boss judges' giveaway in 6 of 10
// rounds (docs/scorecard/boss-judge.csv, rounds 0-8), found one judge round at a time. This reads it from the key poses
// in a second, before any strip is filmed: each hit of each keyed attack, sampled at 60 Hz through its wind-up, strike
// and follow-through on a rig of plain numbers (the same blend the game draws, js/attack-anim.js).
//   twist  the torso's turn through the hit (rad, feet + hips + chest yaw, range over wind-up to follow)
//   drop   how far the hips sink in the strike and follow-through below their highest in the wind-up (m, crouch)
//   over   the follow-through carries the torso on past the strike, in the strike's direction (rad: its turn, or its
//          forward bend for a chop or a thrust)
//   arm    the weapon arm's and haft's travel through the strike (rad)
//   body   (twist + lean change + chest pitch change) / arm: the share of the swing the body carries
// A hit is flagged `ARM ONLY` when the arm travels far (arm > 1) and the body carries little of it (body < 0.35),
// `NO WEIGHT` when it neither drops nor leans into it (drop < 0.04 and lean change < 0.1), `NO OVERSHOOT` when a blow
// (the strike's own turn or bend over 0.3) stops dead at the strike. Flags are leads for a pass, not a verdict: a thrust may be all arm.
//   node tools/body-check.cjs [bossId ...]      (default: the bosses through the system, docs/bosses/*.md)
//   node tools/body-check.cjs --all             every boss with keyed attacks
// Exit code 0 always; `tests/body-check.cjs` holds the bosses through the system to it.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');

function load() {
  const html = fs.readFileSync(path.join(root, 'combat-arena-3d.html'), 'utf8');
  const files = [...html.match(/const GAME_FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+\.js)'/g)].map(m => m[1]);
  const engine = new Set(['config.js', 'net-protocol.js', 'helpers.js', 'terrain.js', 'states.js', 'registries.js', 'events.js', 'world.js', 'character.js', 'player.js', 'enemy.js', 'crowd.js', 'combat.js', 'finisher.js', 'abilities.js', 'bot-navigation.js', 'bot.js', 'companions.js', 'game.js', 'game-menus.js', 'game-view.js', 'game-level.js', 'attack-anim.js']);
  const V = vm.createContext(vm.constants.DONT_CONTEXTIFY);
  Object.assign(V, { console, performance, THREE: { Vector3: class { constructor() { this.x = this.y = this.z = 0; } } }, THREE_ADDONS: {}, Rig: class { dispose() {} },
    location: { hash: '' }, window: { addEventListener() {} }, projectiles: { fire() {} }, bindLabel: () => '' });
  const byFile = {};   // data file -> the attack poses it adds
  const poses = () => { try { return vm.runInContext('Object.keys(ATTACK_POSES)', V); } catch { return []; } };
  for (const f of files.filter(f => engine.has(f) || f.startsWith('data/') || f.startsWith('levels/'))) {
    const had = new Set(poses()); vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), V, { filename: f });
    byFile['js/' + f] = poses().filter(k => !had.has(k));
  }
  return { ...vm.runInContext('({ ENEMY_DEFS, ATTACK_POSES, poseAttackKeys, phaseSpan, isBossDef })', V), byFile };
}

const BONES = ['tip', 'spin', 'chest', 'armR', 'elbowR'];
function sampler(G) {
  const r = { bones: {}, c: 0, l: 0, grip: { rest: [0.3, 0, 3.14] }, haftNow: [0, 0, 0], gripW: 0 };
  for (const b of BONES) r.bones[b] = { rotation: { x: 0, y: 0, z: 0 } };
  r.crouch = d => { r.c += d; }; r.lean = a => { r.l += a; };
  return (a, t) => {
    r.c = r.l = 0; for (const b of BONES) { const R = r.bones[b].rotation; R.x = R.y = R.z = 0; }
    G.poseAttackKeys(r, a, t);
    const B = r.bones;
    return { yaw: B.tip.rotation.y + B.spin.rotation.y + B.chest.rotation.y, pitch: B.chest.rotation.x + B.spin.rotation.x,
      crouch: r.c, lean: r.l, arm: [B.armR.rotation.x, B.armR.rotation.y, B.armR.rotation.z, B.elbowR.rotation.x, ...r.haftNow] };
  };
}
const dist = (u, w) => Math.hypot(...u.map((x, i) => x - w[i]));

// One row per hit of a keyed attack.
function measure(G, a) {
  const at = sampler(G), rows = [];
  for (let i = 0; i < a.hits.length; i++) {
    const [w0, wl] = G.phaseSpan(a, 'windup', i), [s0, sl] = G.phaseSpan(a, 'active', i), [f0, fl] = G.phaseSpan(a, 'follow', i);
    const end = f0 + fl, step = 1 / 60, eps = 1e-4;
    const start = at(a, w0 + eps), W = at(a, s0 - eps), S = at(a, s0 + sl - eps), F = at(a, end - eps);
    let yMin = Infinity, yMax = -Infinity, cMin = Infinity, cMax = -Infinity, armPath = 0, prev = null;
    for (let t = w0 + eps; t <= end; t += step) {
      const q = at(a, t);
      yMin = Math.min(yMin, q.yaw); yMax = Math.max(yMax, q.yaw);
      if (t < s0) cMin = Math.min(cMin, q.crouch); else cMax = Math.max(cMax, q.crouch);
      if (t >= s0 - step && t <= s0 + sl + step) { if (prev) armPath += dist(q.arm, prev.arm); prev = q; }
    }
    const twist = yMax - yMin, drop = Math.max(0, cMax - cMin), dir = Math.sign(S.yaw - W.yaw);
    const bend = q => q.lean + q.pitch, bendCh = bend(S) - bend(W);   // a chop's or a thrust's blow is a forward bend
    const over = fl > 0 ? Math.max(0, (F.yaw - S.yaw) * dir, (bend(F) - bend(S)) * Math.sign(bendCh)) : 0;
    const leanCh = Math.max(Math.abs(S.lean - W.lean), Math.abs(W.lean - start.lean)), pitchCh = Math.abs(S.pitch - W.pitch);
    const arm = Math.max(armPath, dist(S.arm, W.arm)), body = arm > 0 ? (twist + leanCh + pitchCh) / arm : 9;
    const flags = [];
    if (arm > 1 && body < 0.35) flags.push('ARM ONLY');
    if (drop < 0.04 && leanCh < 0.1) flags.push('NO WEIGHT');
    if ((Math.abs(S.yaw - W.yaw) > 0.3 || Math.abs(bendCh) > 0.3) && fl > 0 && over < 0.03) flags.push('NO OVERSHOOT');
    rows.push({ attack: a.id, hit: i, twist, drop, over, arm, body, flags });
  }
  return rows;
}

function bossAttacks(def) {
  const seen = new Map();
  const add = list => { for (const a of list || []) if (a && a.pose && !seen.has(a.id)) seen.set(a.id, a); };
  add(def.attacks);   // phases name their attacks by id from this list
  return [...seen.values()];
}

// The bosses through the system: those with a one-page design in docs/bosses/ (its `Data:` file's key poses).
function systemBosses(G) {
  const dir = path.join(root, 'docs', 'bosses'), ids = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'system.md')) {
    const m = fs.readFileSync(path.join(dir, f), 'utf8').match(/Data:\s+`(js\/data\/[\w\/.-]+\.js)`/);
    if (!m || !(G.byFile[m[1]] || []).length) throw new Error(`docs/bosses/${f} names no data file of key poses`);
    const own = new Set(G.byFile[m[1]]);   // the bosses whose attacks use the poses that file adds
    ids.push(...G.ENEMY_DEFS.filter(d => G.isBossDef(d) && bossAttacks(d).some(a => own.has(a.pose))).map(d => d.id).filter(id => !ids.includes(id)));
  }
  return ids;
}

function check(ids, tweak) {   // tweak(G): change the loaded data first (tests)
  const G = load(); if (tweak) tweak(G);
  if (!ids || !ids.length) ids = systemBosses(G);
  if (ids[0] === '--all') ids = G.ENEMY_DEFS.filter(d => G.isBossDef(d) && bossAttacks(d).length).map(d => d.id);
  const out = {};
  for (const id of ids) {
    const def = G.ENEMY_DEFS.find(d => d.id === id);
    if (!def) throw new Error(`no enemy '${id}'`);
    out[id] = bossAttacks(def).flatMap(a => measure(G, a));
  }
  return out;
}

if (require.main === module) {
  const res = check(process.argv.slice(2));
  const f = x => x.toFixed(2).padStart(5);
  for (const [id, rows] of Object.entries(res)) {
    const flagged = rows.filter(r => r.flags.length).length;
    console.log(`${id}: ${rows.length} hits, ${flagged} flagged`);
    for (const r of rows) console.log(`  ${(r.attack + '#' + r.hit).padEnd(22)} twist${f(r.twist)} drop${f(r.drop)} over${f(r.over)} arm${f(r.arm)} body${f(r.body)}  ${r.flags.join(', ')}`);
  }
}
module.exports = { check, systemBosses };
