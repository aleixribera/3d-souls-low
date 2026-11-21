'use strict';
// Legendaries II (pass 154, design/abilities BUILD-ORDER batch 14): Hundred Suns' sheets of fire out of a finished enemy
// (every sheet on it, the ones a sheet crosses struck), Thunder God Step's dash cutting all it crossed (the line every
// dash, the cooldown only after a cut), Fourfold's Ultimate refilling the other keys a beat later, Shade Host's clones
// (one a perfect dodge, `most` at once, each echoing its holder's blows). Through the server (Boss Rush and Boss Rush
// alone run this session): the finisher's sheets, a claimed dash's cuts, the Ultimate's refill, the clones' echoes, each
// told with what a browser draws; Fourfold offered only to one holding an Ultimate. And the shade clone's Blender model.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

const sim = createSimulation({ seed: 14 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), ES = g('ES'), Enemy = g('Enemy');
const powers = g('abilityPowers'), C = CONFIG.abilities, Game = sim.inspect().Game, e = Game.enemies[0], said = [];
g('events').on('abilityPower', ev => said.push(ev));
const holder = (ids, dz = 3) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const v = id => BY[id].levels[0];
const fresh = () => { powers.reset(); said.length = 0; e.hp = e.def.hp; e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.frozen = 0; e.cooldown = 99; e.poise = 1e9; };
const step = s => { for (let t = 0; t < s - 1e-9; t += 1 / 60) powers.tick(1 / 60); };
const told = (kind, f = () => true) => said.filter(x => x.then === kind && f(x));
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} vs ${b}`);
const beside = (dx, dz) => { const o = new Enemy(e.def, { behavior: 'gated', x: e.x + dx, y: e.y, z: e.z + dz, yaw: 0 }); o.poise = 1e9; Game.enemies.push(o); return o; };
const away = o => Game.enemies.splice(Game.enemies.indexOf(o), 1);

// ---- Hundred Suns: `strikes` sheets on the finished one; a sheet runs out along the line to the holder (+z here), so
// what stands on that line is struck once; what stands in the gap between sheets is not.
{
  fresh();
  const p = holder(['hundred-suns']), V = v('hundred-suns');
  const on = beside(0, e.radius + 3), gap = beside(7, 0);   // +x is midway between two sheets (they are 60 degrees apart)
  powers.trigger('h', p, p.kit, 'finisher', { enemy: e, x: e.x, y: e.y, z: e.z });
  assert.equal(told('sunLines').length, 1, 'the sheets told once');
  near(e.def.hp - e.hp, V.strikes * V.damage, 'every sheet on the finished one');
  near(on.def.hp - on.hp, V.damage, 'the one on the holder\'s line struck once');
  assert.equal(gap.hp, gap.def.hp, 'the one between sheets is spared');
  away(on); away(gap);
}

// ---- Thunder God Step: every live enemy the path crossed, cut as the dash ends; the line every dash, the cooldown only
// after a cut.
{
  fresh();
  const dashCrossed = g('dashCrossed'), p = holder(['thunder-god-step']), V = v('thunder-god-step');
  const o = beside(4, 0), from = { x: e.x - 4, z: e.z }, to = { x: e.x + 6, z: e.z };
  assert.deepEqual([...dashCrossed(from, to, [e, o])], [e, o], 'through both');
  assert.equal(dashCrossed({ x: e.x - 8, z: e.z + 10 }, { x: e.x + 8, z: e.z + 10 }, [e, o]).length, 0, 'well clear of both');
  powers.trigger('t', p, p.kit, 'dash', { from, to });
  near(e.def.hp - e.hp, V.damage, 'the boss cut'); near(o.def.hp - o.hp, V.damage, 'the one beside it cut');
  const line = told('lightningDash', x => !x.strike)[0];
  assert.ok(line && line.crossed === 2 && line.boss && !line.idle && line.path, 'the line says what it cut, with its path');
  assert.deepEqual(told('lightningDash', x => x.strike).map(x => x.enemy), [e, o], 'each cut told on its enemy');
  powers.trigger('t', p, p.kit, 'dash', { from, to });
  near(e.def.hp - e.hp, V.damage, 'cooling: the next dash cuts nothing');
  assert.ok(told('lightningDash', x => x.idle).length === 1, 'but its line is drawn all the same');
  step(V.cooldown + 0.05); said.length = 0;
  powers.trigger('t', p, p.kit, 'dash', { from: { x: e.x - 8, z: e.z + 10 }, to: { x: e.x + 8, z: e.z + 10 } });
  assert.equal(told('lightningDash').length, 1, 'a dash through nothing: its line');
  powers.trigger('t', p, p.kit, 'dash', { from, to });
  near(e.def.hp - e.hp, 2 * V.damage, 'a miss spends no cooldown');
  away(o);
}

// ---- Fourfold: the Ultimate's press; `refill.delay` s later each other key stands at least `share` full (never lowered).
{
  fresh();
  const p = holder(['fourfold', 'thunder-call', 'fire-burst', 'grave-hound']), V = v('fourfold'), K = p.kit.pressed;
  assert.ok(p.kit.whens.has('press') && p.kit.whens.has('castUltimate'), 'heard as the Ultimate\'s press');
  p.perk.charge.strike = 0; p.perk.charge.summon = K.summon.v.charge * 1.4;   // an overfilled key stays over
  powers.trigger('f', p, p.kit, 'press', { key: 'strike', enemy: e });
  step(C.refill.delay + 0.1); assert.equal(told('refillKeys').length, 0, 'another key: nothing');
  powers.trigger('f', p, p.kit, 'press', { key: 'ultimate', enemy: e });
  step(C.refill.delay * 0.8); assert.equal(p.perk.charge.strike, 0, 'not yet');
  step(C.refill.delay * 0.4);
  near(p.perk.charge.strike, K.strike.v.charge * V.share, 'Strike refilled');
  near(p.perk.charge.summon, K.summon.v.charge * 1.4, 'an overfilled key never lowered');
  const r = told('refillKeys', x => x.strike)[0];
  assert.ok(r && r.keys.includes('strike') && r.keys.includes('summon') && !r.keys.includes('guard') && !r.keys.includes('ultimate'), `the keys it filled told (${r && r.keys})`);
}

// ---- Shade Host: a perfect dodge adds a clone at its own place; `most` at once (one more renews the oldest); each lands
// `share` of every blow its holder lands, a beat later; the host goes with its last clone.
{
  fresh();
  const p = holder(['shade-host'], 1), V = v('shade-host'), blow = { damage: 100, poise: 0 };
  powers.trigger('s', p, p.kit, 'dodge', { enemy: e });
  const s = powers.summonOf('s');
  assert.ok(s && s.kind === 'shadeClone' && s.clones.length === 1, 'a clone');
  for (let i = 1; i < V.most + 1; i++) { step(V.cooldown + 0.02); powers.trigger('s', p, p.kit, 'dodge', { enemy: e }); }
  assert.equal(s.clones.length, V.most, `at most ${V.most}`);
  assert.deepEqual([...s.clones.map(c => c.slot)].sort(), [...Array(V.most).keys()], 'each at its own place');
  step(0.2);
  const places = s.clones.map(c => Math.round(Math.atan2(c.z - e.z, c.x - e.x) * 10));
  assert.equal(new Set(places).size, V.most, `round the boss, apart (${places})`);
  e.hp = e.def.hp; said.length = 0;
  powers.trigger('s', p, p.kit, 'hits', { enemy: e, strike: blow });
  assert.equal(e.hp, e.def.hp, 'a beat later');
  step(C.summons.shadeClone.delay + 0.03);
  near(e.def.hp - e.hp, V.most * blow.damage * V.share, 'each clone its share');
  assert.deepEqual(told('shadeClone', x => x.strike).map(x => x.clone).sort(), [...Array(V.most).keys()], 'each echo names its clone');
  step(V.time + 0.1);
  assert.equal(powers.summonOf('s'), null, 'gone with the last clone');
}

// ---- Through the server: what each power tells every browser.
{
  fresh();
  const S = PLAYER_DEF.stats, id = 'legend2';
  sim.registerPlayer(id, 'Ash');
  const pose = (state = 'idle', at = {}) => sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 0.5, yaw: Math.PI, hp: S.maxHp, state, poseAge: 0, ...at }]);
  const calm = () => { e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.cooldown = 99; };
  const run = (s, pick, state) => { const out = []; for (let t = 0; t < s; t += 1 / 60) { pose(state); calm(); sim.tick(1 / 60); for (const x of sim.frame(true).events) if (pick(x)) out.push(x); } return out; };
  const powerEv = then => x => x.type === 'abilityPower' && x.then === then;

  // A Finishing Blow ending: the sheets, from the finished enemy.
  sim.giveAbilities(id, ['hundred-suns']); pose(); sim.tick(1 / 60); sim.frame(true);
  e.netExec = { player: id, until: 1e9, damage: 10 }; e.setState(ES.EXECUTED);
  sim.endFinisher(id, e.netId);
  const sun = run(0.1, powerEv('sunLines'));
  assert.equal(sun.length, 1, 'the sheets told'); assert.equal(sun[0].enemy, e.netId, 'on the finished one');
  assert.ok(e.hp < e.def.hp - v('hundred-suns').strikes * v('hundred-suns').damage, 'the sheets burned it');

  // A dash their poses showed, claimed with its path through the boss: the server finds the cut.
  fresh(); sim.giveAbilities(id, ['thunder-god-step']);
  const from = { x: e.x, z: e.z + e.radius + 2.5 }, to = { x: e.x, z: e.z - e.radius - 0.2 };
  for (let i = 0; i < 3; i++) { sim.setPlayers([{ id, x: from.x, y: e.y, z: from.z, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]); calm(); sim.tick(1 / 60); }
  for (let i = 0; i <= 10; i++) { const k = i / 10; sim.setPlayers([{ id, x: from.x, y: e.y, z: from.z + (to.z - from.z) * k, yaw: Math.PI, hp: S.maxHp, state: 'roll', poseAge: 0 }]); calm(); sim.tick(1 / 60); }
  sim.frame(true);
  assert.equal(sim.abilityClaim(id, { when: 'dash', from, to }), true, 'the dash claimed');
  assert.equal(sim.abilityClaim(id, { when: 'dash', from, to }), false, 'one line a dash');
  const bolt = sim.frame(true).events.filter(powerEv('lightningDash'));
  assert.ok(bolt.some(x => !x.strike && x.crossed === 1 && x.boss && x.path), 'its line, what it cut and its path');
  assert.ok(bolt.some(x => x.strike === 1 && x.enemy === e.netId), 'the cut on the boss');
  near(e.def.hp - e.hp, v('thunder-god-step').damage, 'the boss lost the cut');
  assert.equal(sim.abilityClaim(id, { when: 'dash', from: { x: e.x + 40, z: e.z }, to: { x: e.x + 44, z: e.z } }), false, 'a path its poses never showed');
  // A second dash straight after, its poses one long roll with the first: its own line is claimed, the first's never again.
  const back = { x: e.x + 4, z: to.z };
  for (let i = 1; i <= 8; i++) { sim.setPlayers([{ id, x: to.x + (back.x - to.x) * i / 8, y: e.y, z: to.z, yaw: Math.PI, hp: S.maxHp, state: 'roll', poseAge: 0 }]); calm(); sim.tick(1 / 60); }
  sim.frame(true);
  assert.equal(sim.abilityClaim(id, { when: 'dash', from, to }), false, 'the first dash re-claimed');
  assert.equal(sim.abilityClaim(id, { when: 'dash', from: to, to: back }), true, 'the second dash its own');
  assert.equal(sim.abilityClaim(id, { when: 'dash', from: to, to: back }), false, 'and only once');

  // The Ultimate pressed, full: a beat later the server's count of each other key is refilled, and the browser told.
  fresh(); sim.giveAbilities(id, ['fourfold', 'thunder-call', 'fire-burst']); pose(); sim.tick(1 / 60); sim.frame(true);
  const st = sim.inspect().holderOf(id).perk, K = sim.kitOf(id).pressed;
  st.charge.ultimate = K.ultimate.v.charge; st.charge.strike = 0;
  assert.equal(sim.abilityClaim(id, { when: 'press', key: 'ultimate', enemy: e.netId }), true, 'the Ultimate fires');
  const fill = run(C.refill.delay + 0.2, powerEv('refillKeys'));
  assert.ok(fill.length === 2 && !fill[0].strike && fill[1].strike === 1 && fill[1].keys.includes('strike'), 'the press and the refill told, with its keys');
  near(st.charge.strike, K.strike.v.charge * v('fourfold').share, 'the server\'s count refilled');
  assert.equal(st.charge.ultimate, 0, 'the Ultimate itself spent');

  // A perfect dodge claimed: a clone, then its echoes of the blows the server accepts.
  fresh(); sim.giveAbilities(id, ['shade-host']); pose(); sim.tick(1 / 60); sim.frame(true);
  const H = sim.inspect();
  const serial = (() => { const a = e.baseDef.attacks.find(x => x.parryable !== false) || e.baseDef.attacks[0]; e.beginAttack(a); sim.tick(1 / 60); return e.netAttack; })();
  pose('roll', { x: e.x + 1.5, z: e.z });
  assert.equal(sim.abilityClaim(id, { when: 'dodge', enemy: e.netId, serial }), true, 'the dodge claimed');
  const called = sim.frame(true).events.filter(powerEv('shadeClone'));
  assert.ok(called.length === 1 && !called[0].strike, 'the clone told');
  calm(); for (let i = 0; i < 30; i++) { pose('attack'); calm(); sim.tick(1 / 60); } sim.frame(true);
  e.hp = e.def.hp;
  assert.equal(sim.hit(id, { enemy: e.netId, attack: 'light', charge: 0 }), true, 'a blow lands');
  const echo = run(0.3, x => powerEv('shadeClone')(x) && x.strike, 'attack');
  assert.ok(echo.length === 1 && echo[0].clone === 0 && echo[0].enemy === e.netId, 'its echo told, naming its clone');
  void H;

  // Fourfold is offered only to one holding an Ultimate.
  const seen = new Set();
  for (let i = 0; i < 300; i++) { sim.giveAbilities(id, []); sim.offerAbilities([id], false, 3, 40); for (const b of sim.abilityOffer(id) || []) seen.add(b); }
  assert.ok(!seen.has('fourfold'), 'not without an Ultimate');
  let offered = false;
  for (let i = 0; i < 400 && !offered; i++) { sim.giveAbilities(id, ['thunder-call']); sim.offerAbilities([id], false, 3, 40); offered = (sim.abilityOffer(id) || []).includes('fourfold'); }
  assert.ok(offered, 'offered with one');
}

// ---- The shade clone's model (tools/blender/shade_clone.py, packed): every piece its drawing hangs, in budget, no mesh
// inside out (each triangle's winding agrees with its stored normals: the game culls back faces and inks along them).
{
  const ctx = { BAKED: undefined }; vm.createContext(ctx);
  const bytes = b64 => new Uint8Array(Buffer.from(b64, 'base64'));
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/baked/shade-clone.js'), 'utf8'), ctx);
  const names = Object.keys(ctx.BAKED).filter(n => n.startsWith('shade:'));
  for (const q of ['head__ink', 'head__eye', 'chest__ink', 'chest__split', 'elbowR__ink', 'kneeL__ink', 'capeA__ink', 'capeC__ink']) assert.ok(names.includes('shade:' + q), 'shade:' + q);
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
    assert.ok(agree >= 0.9 * idx.length / 3, `${n}: its triangles face out (${agree} of ${idx.length / 3})`);
  }
  assert.ok(tris <= 4000, `the shade: ${tris} triangles, at most 4000`);
}
console.log('LEGENDARIES II: the sun sheets on the finished one and along their lines, the lightning dash cutting what it crossed and cooling only after a cut, Fourfold refilling the keys a beat after the Ultimate, the shade clones at their places echoing each blow, each told through the server; Fourfold offered only with an Ultimate; the shade clone whole and facing out, passed.');
