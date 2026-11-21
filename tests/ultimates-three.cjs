'use strict';
// Ultimates III (pass 158, design/abilities BUILD-ORDER batch 17): World of Ink (for `time` s each landed blow struck
// again `ult.inkDelay` s on for `share` of it, the echo echoing nothing), Severance (`ult.cut` s on, all within
// `ult.cutWidth` of a line `ult.cutLength` m each way through the enemy, fixed at the press), Colossus (`ult.giant` s on,
// all within `reach` and the arc in front), Ash Legion (from `ult.legion` s on, every `every` s for `time` s, all in its
// lane). Through the server (Boss Rush and Boss Rush alone run this session): each pressed, its blows told with what a
// browser draws, the ink's echo of a blow the server accepted too. And the two new Blender models.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

const sim = createSimulation({ seed: 17 }), g = realm(sim);
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
const beside = (dx, dz) => { const o = new Enemy(e.def, { behavior: 'gated', x: e.x + dx, y: e.y, z: e.z + dz, yaw: 0 }); o.poise = 1e9; o.cooldown = 99; Game.enemies.push(o); return o; };
const away = o => Game.enemies.splice(Game.enemies.indexOf(o), 1);
const press = (p, enemy = e, yaw) => powers.trigger('u', p, p.kit, 'press', { key: 'ultimate', enemy, yaw });
const lost = o => o.def.hp - o.hp;
const hits = (p, o, damage) => powers.trigger('u', p, p.kit, 'hits', { enemy: o, strike: { damage, poise: 1 } });

for (const id of ['world-of-ink', 'severance', 'colossus', 'ash-legion']) {
  assert.equal(BY[id].key, 'ultimate', `${id} is an Ultimate`); assert.equal(BY[id].rarity, 'legendary', `${id} legendary`);
}

// ---- World of Ink: nothing before its press; then each landed blow again `inkDelay` s on, `share` of it, on that enemy;
// the echo's own blow echoes nothing; none once `time` is out.
{
  fresh();
  const p = holder(['world-of-ink']), V = v('world-of-ink');
  hits(p, e, 50); step(U.inkDelay + 0.1); assert.equal(e.hp, e.def.hp, 'no echo before the press');
  press(p); assert.equal(told('inkWorld').length, 1, 'the press told');
  assert.ok(told('inkWorld')[0].enemy === e, 'told with the enemy pressed at');
  hits(p, e, 50); step(U.inkDelay - 0.05); assert.equal(e.hp, e.def.hp, 'not before the delay');
  step(0.1); near(lost(e), 50 * V.share, 'the blow painted again');
  const o = beside(e.radius + 3, 0); hits(p, o, 40); step(U.inkDelay + 0.05); near(lost(o), 40 * V.share, 'on the enemy struck');
  step(1); near(lost(e), 50 * V.share, 'the echo echoes nothing');
  const echoes = told('inkWorld', x => x.strike);
  assert.ok(echoes.length === 2 && echoes[0].enemy === e && echoes[1].enemy === o, 'each echo told on its enemy');
  g('abilityClocks')(p.perk, V.time); const was = e.hp; hits(p, e, 50);   // its holder's clocks (the body's update) run out step(U.inkDelay + 0.1); assert.equal(e.hp, was, 'none once its time is out');
  away(o);
}

// ---- Severance: `ult.cut` s on, all on its line both ways through the boss (fixed at the press), none beside it.
{
  fresh();
  const p = holder(['severance']), V = v('severance');   // south of the boss facing -z: the line runs along z
  const past = beside(0, -(e.radius + 20)), behind = beside(0.5, e.radius + 12), side = beside(U.cutWidth + 5, 0);
  press(p, e, 0);   // facing away: still at the enemy
  step(U.cut / 2); const ex = e.x; e.x += 6;   // the boss steps off the line after the press: the line stays
  step(U.cut / 2 - 0.05); assert.equal(e.hp, e.def.hp, 'nothing before the cut');
  step(0.1);
  assert.equal(e.hp, e.def.hp, 'the boss stepped off the fixed line');
  near(lost(past), V.damage, 'one far past it'); near(lost(behind), V.damage, 'one behind its holder');
  assert.equal(side.hp, side.def.hp, 'one beside the line spared');
  const cut = told('worldCut', x => x.strike)[0];
  assert.ok(cut && cut.enemy === null && Math.abs(Math.cos(cut.yaw) + 1) < 1e-6, `told on no enemy, along the line (${cut && cut.yaw})`);
  e.x = ex; fresh(); press(p); step(U.cut + 0.05); near(lost(e), V.damage, 'the boss on the line'); step(1); near(lost(e), V.damage, 'once only');
  away(past); away(behind); away(side);
}

// ---- Colossus: `ult.giant` s on, all within `reach` of its holder and the arc toward the enemy; none behind or past it.
{
  fresh();
  const p = holder(['colossus'], 2), V = v('colossus');
  const wide = beside(-6, -2), back = beside(0, e.radius + 2 + 6), far = beside(0, -(e.radius + 2 + V.reach + 4));
  press(p, e, 0);
  step(U.giant - 0.05); assert.equal(e.hp, e.def.hp, 'nothing before the swing');
  step(0.1);
  near(lost(e), V.damage, 'the boss in front'); near(lost(wide), V.damage, 'one wide in the arc');
  assert.equal(back.hp, back.def.hp, 'one behind spared'); assert.equal(far.hp, far.def.hp, 'one past its reach spared');
  assert.deepEqual(told('colossus', x => x.strike).map(x => x.strike), [1], 'one swing told');
  step(1); near(lost(e), V.damage, 'once only');
  away(wide); away(back); away(far);
  // No enemy pressed at: along its holder's facing.
  fresh(); const q = holder(['colossus'], 2); press(q, null, Math.PI); step(U.giant + 0.05); near(lost(e), V.damage, 'along the facing, no enemy');
}

// ---- Ash Legion: from `ult.legion` s on, every `every` s for `time` s, everything in its lane; none beside it.
{
  fresh();
  const p = holder(['ash-legion']), V = v('ash-legion'), n = Math.round(V.time / V.every);
  const inLane = beside(U.legionWidth * 0.3, -(e.radius + 4)), side = beside(U.legionWidth / 2 + 4, 0);
  press(p, e, 0);
  step(U.legion - 0.05); assert.equal(e.hp, e.def.hp, 'nothing before the charge arrives');
  step(0.1); near(lost(e), V.damage, 'the front rank');
  step(V.time);
  near(lost(e), V.damage * n, `every rank (${n})`); near(lost(inLane), V.damage * n, 'one in the lane too');
  assert.equal(side.hp, side.def.hp, 'one beside it spared');
  assert.deepEqual(told('legion', x => x.strike).map(x => x.strike), [...Array(n).keys()].map(i => i + 1), 'each told in turn');
  away(inLane); away(side);
}

// ---- Through the server: what each tells every browser.
{
  fresh();
  const S = PLAYER_DEF.stats, id = 'ult3';
  sim.registerPlayer(id, 'Ash');
  const pose = () => sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 1, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
  const calm = () => { e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.cooldown = 99; };
  const run = (s, pick) => { const out = []; for (let t = 0; t < s; t += 1 / 60) { pose(); calm(); sim.tick(1 / 60); for (const x of sim.frame(true).events) if (pick(x)) out.push(x); } return out; };
  const powerEv = then => x => x.type === 'abilityPower' && x.then === then;
  for (const [ability, then] of [['world-of-ink', 'inkWorld'], ['severance', 'worldCut'], ['colossus', 'colossus'], ['ash-legion', 'legion']]) {
    fresh(); sim.giveAbilities(id, [ability]); pose(); sim.tick(1 / 60); sim.frame(true);
    const st = sim.inspect().holderOf(id).perk, K = sim.kitOf(id).pressed, V = v(ability);
    st.charge.ultimate = K.ultimate.v.charge;
    assert.equal(sim.abilityClaim(id, { when: 'press', key: 'ultimate', enemy: e.netId }), true, `${ability}: pressed`);
    const first = run(1 / 60, powerEv(then)), press0 = first.find(x => !x.strike);
    assert.ok(press0 && press0.holder === id && press0.v && press0.v.charge === V.charge, `${ability}: the press told, with its holder and numbers`);
    let landed = 0;
    if (then === 'inkWorld') {
      const hp = e.hp;
      assert.equal(sim.hit(id, { enemy: e.netId, attack: 'light', charge: 0 }), true, 'World of Ink: a blow lands');
      landed = hp - e.hp; assert.ok(landed > 0, 'the server took the blow');
    }
    const span = then === 'inkWorld' ? U.inkDelay : then === 'worldCut' ? U.cut : then === 'colossus' ? U.giant : U.legion + V.time;
    const blows = run(span + 0.3, powerEv(then)).filter(x => x.strike);
    if (then === 'inkWorld') {
      assert.ok(blows.length === 1 && blows[0].enemy === e.netId, `World of Ink: the echo told on the boss (${blows.length})`);
      near(lost(e), landed * (1 + V.share), 'World of Ink: the boss lost the blow and its echo');
      continue;
    }
    const want = then === 'legion' ? Math.round(V.time / V.every) : 1;
    assert.equal(blows.length, want, `${ability}: ${want} blows told`);
    assert.ok(blows.every(x => x.enemy == null && Number.isFinite(x.x) && Number.isFinite(x.yaw)), `${ability}: told on no enemy, with its place and aim`);
    near(lost(e), V.damage * want, `${ability}: the boss lost them`);
  }
}

// ---- The models (tools/blender/colossus.py, ash_legion.py, packed): every piece, in budget, facing out.
for (const [file, prefix, pieces, most] of [
  ['colossus', 'colossus:', ['body__plate', 'body__seam', 'arms__plate', 'arms__seam', 'sword__fire', 'sword__core'], 3000],
  ['ash-legion', 'legion:', ['rider__ash', 'rider__ember', 'spear__ash', 'spear__ember'], 1200],
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
console.log('ULTIMATES III: the ink painting each landed blow again a beat later for its time and never its own echo, the cut along its whole line both ways fixed at the press, the giant\'s arc in front within its reach, the legion\'s ranks down its lane, each told through the server with the ink\'s echo of a blow the server took; the giant and the legion whole and facing out, passed.');
