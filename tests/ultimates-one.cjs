'use strict';
// Ultimates I (pass 156, design/abilities BUILD-ORDER batch 15), each to Thunder Call's bar: Thunder Call's dragon
// (`strikes` bolts, the first `lead` s on, on to the nearest live enemy when its own falls), Cataclysm (cracks, then
// `ult.quake` s on a blast round where its holder pressed), Heaven's Lance and Frozen Lotus (a blow each `every` s for
// `time` s from their lead; the first pins the enemy: held in place, turning slow, never pushed, then resting from holds),
// Tempest (a storm round the enemy, its middle easing after it, each tick every enemy within its radius). Through the
// server (Boss Rush and Boss Rush alone run this session): each pressed, its blows told with what a browser draws. And
// the two new Blender models (the lotus, Cataclysm's slabs): every piece, in budget, facing out.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

const sim = createSimulation({ seed: 15 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), ES = g('ES'), Enemy = g('Enemy');
const powers = g('abilityPowers'), C = CONFIG.abilities, U = C.ult, Game = sim.inspect().Game, e = Game.enemies[0], said = [];
g('events').on('abilityPower', ev => said.push(ev));
const holder = (ids, dz = 3) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const v = id => BY[id].levels[0];
const fresh = () => {
  powers.reset(); said.length = 0;
  for (const o of Game.enemies) { o.hp = o.def.hp; o.state = ES.IDLE; o.attack = null; o.hitbox = null; o.frozen = 0; o.pinned = 0; o.holdRest = 0; o.cooldown = 99; o.poise = 1e9; }
};
const step = s => { for (let t = 0; t < s - 1e-9; t += 1 / 60) powers.tick(1 / 60); };
const told = (kind, f = () => true) => said.filter(x => x.then === kind && f(x));
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} vs ${b}`);
const beside = (dx, dz) => { const o = new Enemy(e.def, { behavior: 'gated', x: e.x + dx, y: e.y, z: e.z + dz, yaw: 0 }); o.poise = 1e9; Game.enemies.push(o); return o; };
const away = o => Game.enemies.splice(Game.enemies.indexOf(o), 1);
const press = (p, enemy = e) => powers.trigger('u', p, p.kit, 'press', { key: 'ultimate', enemy });
const lost = o => o.def.hp - o.hp;

// ---- Each is key 4's, at its numbers.
for (const id of ['thunder-call', 'cataclysm', 'heavens-lance', 'frozen-lotus', 'tempest']) {
  assert.equal(BY[id].key, 'ultimate', `${id} is an Ultimate`); assert.equal(BY[id].rarity, 'legendary', `${id} legendary`);
}

// ---- Thunder Call: nothing until `lead`, then a bolt each `every` s, `strikes` of them; its enemy gone, the rest go on
// to the nearest live one.
{
  fresh();
  const p = holder(['thunder-call']), V = v('thunder-call');
  press(p);
  assert.equal(told('dragon').length, 1, 'the call told'); assert.ok(!told('dragon')[0].strike, 'as the call');
  step(V.lead - 0.05); assert.equal(e.hp, e.def.hp, 'nothing before its lead');
  step(0.1); near(lost(e), V.damage, 'the first bite');
  step(V.every * (V.strikes - 1) + 0.05); near(lost(e), V.damage * V.strikes, 'every bolt');
  assert.deepEqual(told('dragon', x => x.strike).map(x => x.strike), [...Array(V.strikes).keys()].map(i => i + 1), 'each told in turn');

  fresh();
  const o = beside(6, 0);
  press(p); step(V.lead + 0.05);
  e.state = ES.DEAD;   // its enemy falls after the first bite
  step(V.every * (V.strikes - 1) + 0.05);
  near(lost(o), V.damage * (V.strikes - 1), 'the rest on the one beside it');
  e.state = ES.IDLE; e.hp = e.def.hp; away(o);
}

// ---- Cataclysm: the cracks at the press, the blast `ult.quake` s later round where the holder stood (not where they
// go), every enemy within its radius; one outside spared.
{
  fresh();
  const p = holder(['cataclysm'], 1), V = v('cataclysm');
  const inside = beside(0, e.radius + 1 + V.radius * 0.6), out = beside(0, e.radius + 1 + V.radius + 3);
  press(p, null);
  assert.equal(told('quake').length, 1, 'the cracks told'); assert.equal(e.hp, e.def.hp, 'nothing yet');
  const at = { x: p.x, z: p.z }; p.x += 30;   // the holder runs off: the blast stays where they pressed
  step(U.quake - 0.05); assert.equal(e.hp, e.def.hp, 'not before its delay');
  step(0.1);
  near(lost(e), V.damage, 'the boss in the blast'); near(lost(inside), V.damage, 'one within the radius');
  assert.equal(out.hp, out.def.hp, 'one outside spared');
  const burst = told('quake', x => x.strike)[0];
  assert.ok(burst && burst.enemy === null && Math.abs(burst.x - at.x) < 1e-9 && Math.abs(burst.z - at.z) < 1e-9, 'told where it was pressed, on no enemy');
  away(inside); away(out);
}

// ---- Heaven's Lance and Frozen Lotus: a blow each `every` s for `time` s from their lead; the first pins the enemy for
// `time` s: it stays where it is however it is pushed or walks, turns at `pinTurn` speed, and rests from holds after.
for (const [id, then, lead] of [['heavens-lance', 'beam', U.beam], ['frozen-lotus', 'iceLotus', U.lotus]]) {
  fresh();
  const p = holder([id]), V = v(id), n = Math.round(V.time / V.every);
  press(p);
  step(lead - 0.05); assert.equal(e.pinned, 0, `${id}: no hold before its lead`);
  step(0.1);
  near(lost(e), V.damage, `${id}: the first blow`); assert.ok(e.pinned > V.time - 0.2, `${id}: pinned`);
  const x = e.x, z = e.z;
  e.vx = 8; e.kx = 5;
  for (let i = 0; i < 30; i++) e.update(1 / 60, p);
  assert.ok(Math.hypot(e.x - x, e.z - z) < 1e-9, `${id}: held in place (${e.x - x}, ${e.z - z})`);
  step(V.time + 0.1);
  near(lost(e), V.damage * n, `${id}: ${n} blows`);
  for (let i = 0; i < Math.ceil(V.time * 60) - 30 + 2; i++) e.update(1 / 60, p);   // the hold's time, on its own clock
  assert.equal(e.pinned, 0, `${id}: let go`); assert.ok(e.holdRest > 0, `${id}: resting from holds after`);
  // Resting, a second one does its damage but holds nothing.
  step(V.time + lead + 0.2); fresh(); e.holdRest = C.holdRest;
  press(p); step(lead + 0.05);
  near(lost(e), V.damage, `${id}: damage while resting`); assert.equal(e.pinned, 0, `${id}: but no hold`);
}

// ---- Tempest: its middle eases after the enemy at `follow` m/s; each tick every enemy within its radius of the middle.
{
  fresh();
  const p = holder(['tempest']), V = v('tempest'), n = Math.round(V.time / V.every);
  const o = beside(V.radius * 0.5, 0), far = beside(V.radius + 4, 0);
  press(p);
  step(U.tempest - 0.05); assert.equal(e.hp, e.def.hp, 'nothing before its lead');
  step(0.1); near(lost(e), V.damage, 'the first tick'); near(lost(o), V.damage, 'one beside it, within the radius');
  assert.equal(far.hp, far.def.hp, 'one outside spared');
  const x0 = e.x; e.x += 4; step(0.25);   // the boss moves: the middle follows, no faster than `follow`
  const mid = told('tempest', x => x.strike).at(-1);
  assert.ok(mid.x > x0 && mid.x - x0 <= U.follow * 0.25 + 1e-6 + 0.02, `its middle eased after it (${mid.x - x0})`);
  e.x = x0;
  step(V.time + 0.1);
  assert.equal(told('tempest', x => x.strike).length, n, `${n} ticks`);
  near(lost(e), V.damage * n, 'every tick on the boss');
  away(o); away(far);
}

// ---- Through the server: what each tells every browser.
{
  fresh();
  const S = PLAYER_DEF.stats, id = 'ult1';
  sim.registerPlayer(id, 'Ash');
  const pose = () => sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 2, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
  const calm = () => { e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.cooldown = 99; };
  const run = (s, pick) => { const out = []; for (let t = 0; t < s; t += 1 / 60) { pose(); calm(); sim.tick(1 / 60); for (const x of sim.frame(true).events) if (pick(x)) out.push(x); } return out; };
  const powerEv = then => x => x.type === 'abilityPower' && x.then === then;
  const cases = [['thunder-call', 'dragon'], ['cataclysm', 'quake'], ['heavens-lance', 'beam'], ['frozen-lotus', 'iceLotus'], ['tempest', 'tempest']];
  for (const [ability, then] of cases) {
    fresh(); sim.giveAbilities(id, [ability]); pose(); sim.tick(1 / 60); sim.frame(true);
    const st = sim.inspect().holderOf(id).perk, K = sim.kitOf(id).pressed, V = v(ability);
    st.charge.ultimate = K.ultimate.v.charge;
    assert.equal(sim.abilityClaim(id, { when: 'press', key: 'ultimate', enemy: e.netId }), true, `${ability}: pressed`);
    const span = then === 'dragon' ? V.lead + V.every * V.strikes : then === 'quake' ? U.quake : V.time + 0.6;
    const ev = run(span + 0.3, powerEv(then)), press0 = ev.find(x => !x.strike), blows = ev.filter(x => x.strike);
    assert.ok(press0 && press0.holder === id, `${ability}: the press told, with its holder`);
    const want = then === 'dragon' ? V.strikes : then === 'quake' ? 1 : Math.round(V.time / V.every);
    assert.equal(blows.length, want, `${ability}: ${want} blows told`);
    if (then === 'quake') assert.ok(blows[0].enemy == null && Number.isFinite(blows[0].x) && Number.isFinite(blows[0].z), 'Cataclysm: its blast told on no enemy, with its place');
    else assert.ok(blows.every(x => x.enemy === e.netId), `${ability}: each blow names the boss`);
    if (then === 'tempest') assert.ok(blows.every(x => Number.isFinite(x.x) && Number.isFinite(x.z)), 'Tempest: each tick with its middle');
    assert.ok(press0.v && press0.v.damage === V.damage, `${ability}: its numbers told`);
    assert.ok(lost(e) >= V.damage * want - 1e-6, `${ability}: the boss lost them (${lost(e)})`);
  }
}

// ---- The models (tools/blender/ice_lotus.py, cataclysm_slabs.py, packed): every piece the drawing hangs, in budget, no
// mesh inside out (each triangle's winding agrees with its stored normals: the game culls back faces and inks along them).
for (const [file, prefix, pieces, most] of [
  ['ice-lotus', 'lotus:', ['spear__ice', 'spear__edge', 'outer__ice', 'outer__edge', 'crown__ice', 'crown__edge'], 1500],
  ['cataclysm-slabs', 'slabs:', [0, 1, 2, 3, 4, 5].flatMap(n => [`slab${n}__stone`, `slab${n}__ember`]), 1000],
]) {
  const ctx = { BAKED: undefined }; vm.createContext(ctx);
  const bytes = b64 => new Uint8Array(Buffer.from(b64, 'base64'));
  vm.runInContext(fs.readFileSync(path.join(__dirname, `../js/baked/${file}.js`), 'utf8'), ctx);
  const names = Object.keys(ctx.BAKED).filter(n => n.startsWith(prefix));
  for (const q of pieces) assert.ok(names.includes(prefix + q), prefix + q);
  let tris = 0;
  for (const n of names) {
    const B = ctx.BAKED[n], raw = new Int16Array(bytes(B.p).buffer), nor = new Int8Array(bytes(B.q).buffer);
    const idx = B.wide ? new Uint32Array(bytes(B.i).buffer) : new Uint16Array(bytes(B.i).buffer);
    const P = i => [0, 1, 2].map(k => B.min[k] + (raw[i * 3 + k] + 32767) / 65534 * B.span[k]);
    let agree = 0;
    for (let t = 0; t < idx.length; t += 3) {
      const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]].map(P), u = [0, 1, 2].map(k => b[k] - a[k]), w = [0, 1, 2].map(k => c[k] - a[k]);
      const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const m = [0, 1, 2].map(k => nor[idx[t] * 3 + k] + nor[idx[t + 1] * 3 + k] + nor[idx[t + 2] * 3 + k]);
      if (f[0] * m[0] + f[1] * m[1] + f[2] * m[2] >= 0) agree++;
    }
    tris += idx.length / 3;
    assert.ok(idx.length > 0 && agree >= 0.9 * idx.length / 3, `${n}: its triangles face out (${agree} of ${idx.length / 3})`);
  }
  assert.ok(tris <= most, `${file}: ${tris} triangles, at most ${most}`);
}
console.log('ULTIMATES I: the dragon\'s bolts after its lead and on to the next enemy, Cataclysm\'s blast where it was pressed, the Lance\'s and the Lotus\'s blows and their hold (in place, then resting), the storm following and striking all round it, each told through the server; the lotus and the slabs whole and facing out, passed.');
