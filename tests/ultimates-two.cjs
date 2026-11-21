'use strict';
// Ultimates II (pass 157, design/abilities BUILD-ORDER batch 16): Great Wave (one crash `ult.wave` s on over a box from
// where it was pressed, aimed at the enemy), Sky Blade (`ult.sky` s on, following its enemy, everything within
// `ult.skyRadius` of the point), Phoenix Dive (its holder flown through the boss `strikes` times, untouchable, each pass
// on the server's clock), Black Star (arrives `ult.star` s on, holds all within its radius, draws the small ones in, then
// implodes). Through the server (Boss Rush and Boss Rush alone run this session): each pressed, its blows told with what
// a browser draws, the enemy-free ones too. And the three new Blender models: every piece, in budget, facing out.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

const sim = createSimulation({ seed: 16 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), ES = g('ES'), Enemy = g('Enemy');
const powers = g('abilityPowers'), C = CONFIG.abilities, U = C.ult, PX = C.phoenix, Game = sim.inspect().Game, e = Game.enemies[0], said = [];
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
const beside = (dx, dz) => { const o = new Enemy(e.def, { behavior: 'gated', x: e.x + dx, y: e.y, z: e.z + dz, yaw: 0 }); o.poise = 1e9; o.cooldown = 99; Game.enemies.push(o); return o; };
const away = o => Game.enemies.splice(Game.enemies.indexOf(o), 1);
const press = (p, enemy = e, yaw) => powers.trigger('u', p, p.kit, 'press', { key: 'ultimate', enemy, yaw });
const lost = o => o.def.hp - o.hp;

for (const id of ['great-wave', 'sky-blade', 'phoenix-dive', 'black-star']) {
  assert.equal(BY[id].key, 'ultimate', `${id} is an Ultimate`); assert.equal(BY[id].rarity, 'legendary', `${id} legendary`);
}

// ---- Great Wave: nothing until `ult.wave`, then one crash over the box from where it was pressed toward the enemy:
// the boss and one in the box hit once, one beside the box and one behind spared.
{
  fresh();
  const p = holder(['great-wave'], 2), V = v('great-wave');   // the holder south of the boss, facing it (yaw PI: -z)
  const inBox = beside(V.width * 0.3, -(e.radius + 4)), side = beside(V.width / 2 + 4, -2), back = beside(0, e.radius + 2 + 6);
  press(p, e, 0);   // facing away (yaw 0): the wave still goes at the enemy pressed on
  assert.equal(told('greatWave').length, 1, 'the press told');
  step(U.wave - 0.05); assert.equal(e.hp, e.def.hp, 'nothing before it crashes');
  step(0.1);
  near(lost(e), V.damage, 'the boss under the crash'); near(lost(inBox), V.damage, 'one in the box');
  assert.equal(side.hp, side.def.hp, 'one beside the box spared'); assert.equal(back.hp, back.def.hp, 'one behind spared');
  const crash = told('greatWave', x => x.strike)[0];
  assert.ok(crash && crash.enemy === null && Math.abs(Math.cos(crash.yaw) + 1) < 1e-6, `told on no enemy, aimed at the boss (${crash && crash.yaw})`);
  step(1); near(lost(e), V.damage, 'once only');
  away(inBox); away(side); away(back);
}

// ---- Sky Blade: `ult.sky` s on, where its enemy is then (it follows), the boss and all within `skyRadius`.
{
  fresh();
  const p = holder(['sky-blade']), V = v('sky-blade');
  press(p);
  step(U.sky / 2); const x0 = e.x; e.x += 3;   // the boss moves: the sword follows
  const o = beside(e.radius + U.skyRadius * 0.4, 0), far = beside(e.radius + U.skyRadius + 6, 0);
  step(U.sky / 2 - 0.05); assert.equal(e.hp, e.def.hp, 'nothing before it drops');
  step(0.1);
  near(lost(e), V.damage, 'the boss'); near(lost(o), V.damage, 'one beside the point'); assert.equal(far.hp, far.def.hp, 'one far off spared');
  const land = told('skyBlade', x => x.strike)[0];
  assert.ok(land && land.enemy === e && Math.abs(land.x - e.x) < 1e-6, 'told on the boss where it went');
  e.x = x0; away(o); away(far);
  // Its enemy gone first: it falls where it last was, told on no enemy.
  fresh(); const lone = beside(10, 0); press(p, lone); step(U.sky / 2); away(lone); step(U.sky);
  const solo = told('skyBlade', x => x.strike)[0];
  assert.ok(solo && solo.enemy === null && Math.abs(solo.x - lone.x) < 1e-6, 'its enemy gone: told where it was, on no enemy');
}

// ---- Phoenix Dive: the server's passes on the flight's clock, each `damage` to the boss and to one within `diveReach`
// of its edge; the holder's own flight (Player.diveStart) untouchable, through the boss's middle at each pass, down after.
{
  fresh();
  const p = holder(['phoenix-dive']), V = v('phoenix-dive'), first = PX.burst + PX.up + PX.dive / 2, each = PX.dive + PX.gap;
  const o = beside(e.radius + U.diveReach * 0.5 + 0.4, 0), far = beside(e.radius + U.diveReach + 5, 0);
  press(p);
  step(first - 0.05); assert.equal(e.hp, e.def.hp, 'nothing before the first pass');
  step(0.1); near(lost(e), V.damage, 'the first pass'); near(lost(o), V.damage, 'one beside it burned');
  step(each * (V.strikes - 1));
  near(lost(e), V.damage * V.strikes, 'every pass'); assert.equal(far.hp, far.def.hp, 'one far off spared');
  assert.deepEqual(told('phoenix', x => x.strike).map(x => x.strike), [...Array(V.strikes).keys()].map(i => i + 1), 'each told in turn');
  away(o); away(far);

  fresh();
  const b = holder(['phoenix-dive'], 4), y0 = b.y;
  b.diveStart(e, V);
  assert.ok(b.invulnerable(), 'untouchable from the press');
  const T = PX.burst + PX.up + V.strikes * PX.dive + (V.strikes - 1) * PX.gap + PX.land;
  let t = 0, closest = Array(V.strikes).fill(Infinity), lowAt = Array(V.strikes).fill(Infinity), wasOff = false;
  for (; t < T + 0.1 && b.dive; t += 1 / 60) {
    b.diveStep(1 / 60);
    if (b.dive) assert.ok(b.invulnerable(), `untouchable at ${t.toFixed(2)} s`);
    const k = Math.floor((t - PX.burst - PX.up) / each);
    if (k >= 0 && k < V.strikes) { const d = Math.hypot(b.x - e.x, b.z - e.z); if (d < closest[k]) { closest[k] = d; lowAt[k] = b.y - y0; } }
    if (b.y > y0 + 1) wasOff = true;
  }
  assert.ok(wasOff, 'it flew');
  closest.forEach((d, k) => { assert.ok(d < 0.6, `pass ${k + 1} through the boss's middle (${d.toFixed(2)} m)`); assert.ok(lowAt[k] < PX.rise * 0.5, `pass ${k + 1} low through it (${lowAt[k].toFixed(2)})`); });
  assert.equal(b.dive, null, 'landed'); assert.ok(Math.abs(b.y - y0) < 0.05, `on the floor (${b.y - y0})`);
  assert.ok(b.diveGrace > 0 && b.invulnerable(), 'a grace after landing');
  assert.ok(Math.abs(t - T) < 0.05, `the flight's length matches the clock (${t.toFixed(2)} vs ${T.toFixed(2)})`);
}

// ---- Black Star: `ult.star` s on, everything within its radius held (`frozen`) for `time` s, the small drawn in, the
// boss held where it is; then the implosion: `damage` to everything within its radius.
{
  fresh();
  const p = holder(['black-star']), V = v('black-star');
  const o = beside(e.radius + V.radius * 0.5, 0), far = beside(e.radius + V.radius + 6, 0);
  o.def = Object.assign(Object.create(Object.getPrototypeOf(o.def)), o.def);   // a small one: not a boss
  const isBoss = o.isBoss; o.isBoss = () => false;
  press(p);
  step(U.star - 0.05); assert.ok(!(e.frozen > 0), 'not held before it arrives');
  step(0.1);
  assert.ok(e.frozen > V.time - 0.2 && o.frozen > 0, 'the boss and one beside it held'); assert.ok(!(far.frozen > 0), 'one far off free');
  const bx = e.x, d0 = Math.hypot(o.x - e.x, o.z - e.z);
  step(V.time / 2);
  assert.ok(Math.hypot(o.x - bx, o.z - e.z) < d0 - 0.5, 'the small one drawn in'); assert.equal(e.x, bx, 'the boss held where it is');
  assert.equal(e.hp, e.def.hp, 'no damage while held');
  step(V.time / 2 + 0.05);
  near(lost(e), V.damage, 'the implosion on the boss'); near(lost(o), V.damage, 'and on the one drawn in'); assert.equal(far.hp, far.def.hp, 'one far off spared');
  assert.deepEqual(told('blackStar', x => x.strike).map(x => x.strike), [1, 2], 'its arrival and its implosion told');
  o.isBoss = isBoss; away(o); away(far);
  // A boss pinned by another Ultimate, or resting from a hold, takes the damage but isn't held.
  fresh(); e.holdRest = C.holdRest; press(p); step(U.star + 0.05); assert.ok(!(e.frozen > 0), 'resting: not held');
  step(V.time); near(lost(e), V.damage, 'resting: still the damage');
}

// ---- Through the server: what each tells every browser.
{
  fresh();
  const S = PLAYER_DEF.stats, id = 'ult2';
  sim.registerPlayer(id, 'Ash');
  const pose = () => sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 2, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
  const calm = () => { e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.cooldown = 99; };
  const run = (s, pick) => { const out = []; for (let t = 0; t < s; t += 1 / 60) { pose(); calm(); sim.tick(1 / 60); for (const x of sim.frame(true).events) if (pick(x)) out.push(x); } return out; };
  const powerEv = then => x => x.type === 'abilityPower' && x.then === then;
  for (const [ability, then] of [['great-wave', 'greatWave'], ['sky-blade', 'skyBlade'], ['phoenix-dive', 'phoenix'], ['black-star', 'blackStar']]) {
    fresh(); sim.giveAbilities(id, [ability]); pose(); sim.tick(1 / 60); sim.frame(true);
    const st = sim.inspect().holderOf(id).perk, K = sim.kitOf(id).pressed, V = v(ability);
    st.charge.ultimate = K.ultimate.v.charge;
    assert.equal(sim.abilityClaim(id, { when: 'press', key: 'ultimate', enemy: e.netId }), true, `${ability}: pressed`);
    const span = then === 'greatWave' ? U.wave : then === 'skyBlade' ? U.sky : then === 'phoenix' ? PX.burst + PX.up + V.strikes * (PX.dive + PX.gap) : U.star + V.time;
    const ev = run(span + 0.3, powerEv(then)), press0 = ev.find(x => !x.strike), blows = ev.filter(x => x.strike);
    assert.ok(press0 && press0.holder === id && press0.v && press0.v.damage === V.damage, `${ability}: the press told, with its holder and numbers`);
    const want = then === 'phoenix' ? V.strikes : then === 'blackStar' ? 2 : 1;
    assert.equal(blows.length, want, `${ability}: ${want} blows told`);
    if (then === 'greatWave') assert.ok(blows[0].enemy == null && Number.isFinite(blows[0].x) && Number.isFinite(blows[0].yaw), 'Great Wave: its crash told on no enemy, with its place and aim');
    else assert.ok(blows.every(x => x.enemy === e.netId), `${ability}: each blow names the boss`);
    assert.ok(lost(e) >= V.damage * (then === 'phoenix' ? V.strikes : 1) - 1e-6, `${ability}: the boss lost them (${lost(e)})`);
  }
}

// ---- The models (tools/blender/great_wave.py, sky_blade.py, phoenix.py, packed): every piece, in budget, facing out.
for (const [file, prefix, pieces, most] of [
  ['great-wave', 'wave:', ['body__deep', 'band__mid', 'foam__foam'], 2500],
  ['sky-blade', 'sword:', ['blade__steel', 'blade__edge'], 800],
  ['phoenix', 'phoenix:', ['body', 'wingR', 'wingL', 'tail'].flatMap(n => [`${n}__ember`, `${n}__core`]), 1500],
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
console.log('ULTIMATES II: the wave\'s one crash over its box at the enemy, the sky blade following and falling on all round its point, the phoenix\'s passes on its flight\'s clock with its holder untouchable through the boss and down, the black star holding, drawing in and imploding, each told through the server; the wave, the sword and the bird whole and facing out, passed.');
