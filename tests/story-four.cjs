'use strict';
// Story's four (pass 159, design/abilities BUILD-ORDER batch 18), each given on Story's road (a level's `giveAbility`):
// Scarlet Draw (`story.scarf` s on, all within `story.scarfWidth` of a line `reach` m out from its holder toward the
// enemy, fixed at the press), Oath Guard (for `time` s every blow a deflect could turn is turned, from any side, and each
// answered with `damage`), The Seven (seven founders round the enemy, a blow each `every` s from their arrival, a gather,
// then all together for `story.together` times one), the Bell of Waking (`story.bell` s on its enemy kneels for `time` s,
// then the second toll strikes, never past a boss's phase line). Through the server (Boss Rush runs this session; Story
// is solo, but the powers are the engine's): each pressed, its blows told with what a browser draws. And the two new
// Blender models.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

const sim = createSimulation({ seed: 19 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), ES = g('ES'), Enemy = g('Enemy');
const powers = g('abilityPowers'), C = CONFIG.abilities, T = C.story, Game = sim.inspect().Game, e = Game.enemies[0], said = [];
g('events').on('abilityPower', ev => said.push(ev));
const holder = (ids, dz = 3) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const v = id => BY[id].levels[0];
const fresh = () => {
  powers.reset(); said.length = 0;
  for (const o of Game.enemies) { o.hp = o.def.hp; o.state = ES.IDLE; o.attack = null; o.hitbox = null; o.frozen = 0; o.kneel = 0; o.pinned = 0; o.holdRest = 0; o.cooldown = 99; o.poise = 1e9; }
};
const step = s => { for (let t = 0; t < s - 1e-9; t += 1 / 60) powers.tick(1 / 60); };
const told = (kind, f = () => true) => said.filter(x => x.then === kind && f(x));
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} vs ${b}`);
const beside = (dx, dz) => { const o = new Enemy(e.def, { behavior: 'gated', x: e.x + dx, y: e.y, z: e.z + dz, yaw: 0 }); o.poise = 1e9; o.cooldown = 99; Game.enemies.push(o); return o; };
const away = o => Game.enemies.splice(Game.enemies.indexOf(o), 1);
const press = (p, key, enemy = e, yaw) => powers.trigger('s', p, p.kit, 'press', { key, enemy, yaw });
const lost = o => o.def.hp - o.hp;

const KEYS = { 'scarlet-draw': 'strike', 'oath-guard': 'guard', 'the-seven': 'summon', 'bell-of-waking': 'ultimate' };
for (const [id, key] of Object.entries(KEYS)) {
  assert.equal(BY[id].key, key, `${id} on key ${key}`); assert.equal(BY[id].rarity, 'story', `${id} is a story ability`);
  assert.ok(C.rarity.story.given && C.rarity.story.weight === 0, 'the story rarity is given, never drawn');
}

// ---- Never offered: a Boss Rush pick (no pool) draws from every ability but these.
{
  sim.registerPlayer('offer', 'Pick');
  for (let i = 0; i < 40; i++) {
    sim.offerAbilities(['offer'], false, 2, 6, i % 2 === 0, 1000 + i, false);
    const offer = sim.abilityOffer('offer') || [];
    assert.ok(offer.length && offer.every(x => BY[x].rarity !== 'story'), `offer ${i}: ${offer}`);
    sim.pickAbility('offer', offer[0]);
  }
}

// ---- Scarlet Draw: `story.scarf` s on, all within `scarfWidth`/2 of the line `reach` m from its holder toward the enemy.
{
  fresh();
  const p = holder(['scarlet-draw']), V = v('scarlet-draw');   // south of the boss facing it: the line runs along -z
  const inLine = beside(0.3, -(V.reach - 3 - e.radius - 1)), past = beside(0, -(V.reach + 6)), side = beside(T.scarfWidth / 2 + 3, 0);
  press(p, 'strike');
  assert.equal(told('scarfBlade', x => !x.strike).length, 1, 'the press told');
  step(T.scarf - 0.05); assert.equal(e.hp, e.def.hp, 'nothing before the scarf hardens');
  step(0.1);
  near(lost(e), V.damage, 'the boss on the line'); near(lost(inLine), V.damage, 'one further down it');
  assert.equal(past.hp, past.def.hp, 'one past its reach spared'); assert.equal(side.hp, side.def.hp, 'one beside it spared');
  const cut = told('scarfBlade', x => x.strike)[0];
  assert.ok(cut && cut.enemy === null && Math.abs(Math.cos(cut.yaw) + 1) < 1e-6, `told on no enemy, along the line (${cut && cut.yaw})`);
  step(1); near(lost(e), V.damage, 'once only');
  away(inLine); away(past); away(side);
}

// ---- Oath Guard: its press arms the clock; each deflect then answers `damage`; from behind too; none once out.
{
  fresh();
  const p = holder(['oath-guard'], 1), V = v('oath-guard'), canDeflectNow = g('canDeflectNow'), parryTiming = g('parryTiming');
  const parry = () => powers.trigger('s', p, p.kit, 'parry', { enemy: e });
  parry(); assert.equal(e.hp, e.def.hp, 'no answer before the press');
  // A blow just landing, the holder facing away from it (yaw 0: north, the boss south of it... the boss is at -z).
  const a = e.def.attacks.find(x => g('canParryHit')(x, 0));
  e.state = ES.WINDUP; e.attack = a; e.hitIndex = 0; e.stateTime = a.hits[0].startup - 0.01; p.yaw = 0;
  assert.equal(parryTiming(p, e, 0), null, 'from behind, no deflect without the oath');
  p.perk.charge.guard = V.charge; p.ctl = { consume: k => k === 'ability2' };
  p.pressAbilities([e], null);
  assert.ok(p.perk.oath > 0 && canDeflectNow(p), 'pressed: the body deflects untimed');
  assert.notEqual(parryTiming(p, e, 0), null, 'from behind, the blow is turned');
  e.state = ES.IDLE; e.attack = null;
  parry(); parry();
  near(lost(e), 2 * V.damage, 'each turned blow answered');
  assert.deepEqual(told('oathShield', x => x.strike).map(x => [x.strike, x.enemy === e]), [[1, true], [2, true]], 'each answer told on its enemy');
  g('abilityClocks')(p.perk, V.time); parry(); near(lost(e), 2 * V.damage, 'none once its time is out');
}

// ---- The Seven: arrive `arrive` s on; a blow every `every` s for each founder, the gather (none), all together.
{
  fresh();
  const p = holder(['the-seven']), V = v('the-seven'), S = C.summons.seven, n = S.count;
  press(p, 'summon');
  step(S.arrive - 0.05); assert.equal(e.hp, e.def.hp, 'nothing before they rise');
  step(0.1); near(lost(e), V.damage, 'the first founder');
  step(V.every * (n - 1)); near(lost(e), V.damage * n, `each of the ${n}`);
  step(V.every); near(lost(e), V.damage * n, 'the gather strikes nothing');
  step(V.every); near(lost(e), V.damage * (n + T.together), 'all together');
  assert.deepEqual(told('seven', x => x.strike).map(x => x.strike), [...Array(n + 2).keys()].map(i => i + 1), 'each beat told in turn');
  step(2); near(lost(e), V.damage * (n + T.together), 'then they fade');
  assert.ok(!powers.summonOf('s'), 'gone');
}

// ---- Bell of Waking: `story.bell` s on its enemy kneels for `time` s (held, drawn as a kneel), then the toll strikes;
// a boss with a phase to come keeps every point past its phase line.
{
  fresh();
  const p = holder(['bell-of-waking']), V = v('bell-of-waking');
  press(p, 'ultimate');
  step(T.bell - 0.05); assert.ok(!(e.kneel > 0), 'not before the first toll');
  step(0.1); assert.ok(e.kneel > 0 && e.frozen > 0 && e.kneelFor === V.time, 'knelt and held');
  assert.equal(e.hp, e.def.hp, 'the first toll strikes nothing');
  step(V.time - 0.1); assert.equal(e.hp, e.def.hp, 'nothing while it kneels');
  step(0.1); near(lost(e), V.damage, 'the second toll');
  assert.deepEqual(told('bellToll', x => x.strike).map(x => x.strike), [1, 2], 'both tolls told');
  // Its phase line: the porter's next phase comes at `at` of its bar.
  fresh(); const at = e.baseDef.phases[e.phaseIds[e.phase + 1]].at, line = e.def.hp * at;
  assert.ok(at > 0 && !e.lastPhase(), 'the boss has a mid-bar phase to come');
  e.hp = line + V.damage / 4; press(p, 'ultimate'); step(T.bell + V.time + 0.1);
  near(e.hp, line, 'the toll stops at the phase line');
}

// ---- Through the server: what each tells every browser.
{
  fresh();
  const S = PLAYER_DEF.stats, id = 'story4';
  sim.registerPlayer(id, 'Ash');
  const pose = () => sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 1, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
  const calm = () => { e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.cooldown = 99; };
  const run = (s, pick, keep = calm) => { const out = []; for (let t = 0; t < s; t += 1 / 60) { pose(); keep(); sim.tick(1 / 60); for (const x of sim.frame(true).events) if (pick(x)) out.push(x); } return out; };
  const powerEv = then => x => x.type === 'abilityPower' && x.then === then;
  for (const [ability, then] of [['scarlet-draw', 'scarfBlade'], ['oath-guard', 'oathShield'], ['the-seven', 'seven'], ['bell-of-waking', 'bellToll']]) {
    fresh(); sim.giveAbilities(id, [ability]); pose(); sim.tick(1 / 60); sim.frame(true);
    const key = KEYS[ability], st = sim.inspect().holderOf(id).perk, K = sim.kitOf(id).pressed, V = v(ability);
    st.charge[key] = K[key].v.charge;
    assert.equal(sim.abilityClaim(id, { when: 'press', key, enemy: e.netId }), true, `${ability}: pressed`);
    const first = run(1 / 60, powerEv(then)), press0 = first.find(x => !x.strike);
    assert.ok(press0 && press0.holder === id && press0.v && press0.v.charge === V.charge, `${ability}: the press told, with its holder and numbers`);
    if (then === 'oathShield') {
      // A real blow of the boss's, deflected by this player's claim: the server answers it.
      let answered = [], tries = 0;
      const swing = () => { e.cooldown = 0; e.poise = 1e9; };
      for (let t = 0; t < 6 && !answered.length; t += 1 / 60) {
        pose(); swing(); sim.tick(1 / 60);
        const ev = sim.frame(true).events;
        answered.push(...ev.filter(x => powerEv(then)(x) && x.strike));
        if (e.state === ES.WINDUP && e.netAttack && g('canParryHit')(e.attack, e.hitIndex) && !answered.length && tries < 20) { tries++; sim.parry(id, { enemy: e.netId, serial: e.netAttack, hit: e.hitIndex }); }
      }
      assert.ok(answered.length === 1 && answered[0].enemy === e.netId && answered[0].strike === 1, `Oath Guard: a deflect answered on the boss (${answered.length}, ${tries} tries)`);
      near(lost(e), V.damage, 'Oath Guard: the boss lost the answer');
      continue;
    }
    const span = then === 'scarfBlade' ? T.scarf : then === 'seven' ? C.summons.seven.arrive + V.time : T.bell + V.time;
    let kneelSeen = false;
    const blows = run(span + 0.3, powerEv(then), () => { calm(); if (then === 'bellToll') { const s = sim.frame(false).enemies?.find(q => q.id === e.netId); if (s && s.kneel > 0) kneelSeen = true; } }).filter(x => x.strike);
    if (then === 'scarfBlade') {
      assert.ok(blows.length === 1 && blows[0].enemy == null && Number.isFinite(blows[0].x) && Number.isFinite(blows[0].yaw), 'Scarlet Draw: told on no enemy, with its place and aim');
      near(lost(e), V.damage, 'Scarlet Draw: the boss lost it');
    } else if (then === 'seven') {
      const n = C.summons.seven.count;
      assert.deepEqual(blows.map(x => x.strike), [...Array(n + 2).keys()].map(i => i + 1), 'The Seven: each beat told');
      assert.ok(blows.every(x => x.enemy === e.netId), 'The Seven: told on the boss');
      near(lost(e), V.damage * (n + T.together), 'The Seven: the boss lost them');
    } else {
      assert.deepEqual(blows.map(x => x.strike), [1, 2], 'Bell of Waking: both tolls told');
      assert.ok(blows.every(x => x.enemy === e.netId), 'Bell of Waking: told on the boss');
      assert.ok(kneelSeen, 'Bell of Waking: the snapshot carries the kneel');
      near(lost(e), V.damage, 'Bell of Waking: the boss lost the toll');
    }
  }
}

// ---- The models (tools/blender/seven_founder.py, ghost_bell.py, packed): every piece, in budget, facing out.
for (const [file, prefix, pieces, most] of [
  ['seven-founder', 'founder:', ['robe__gold', 'robe__ink', 'lining__crimson', 'face__wood', 'face__paint', 'face__cheek', 'armL__gold', 'armR__gold', ...[0, 1, 2, 3, 4, 5, 6].map(i => `mark${i}__paint`)], 1600],
  ['ghost-bell', 'bell:', ['body__gold', 'marks__bronze', 'crack__glow', ...[...Array(16).keys()].map(i => `shard${i}__gold`)], 5400],
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
console.log('STORY\'S FOUR: never offered; the scarf\'s band down its line, the oath turning blows from behind and answering each, the seven founders\' beats and their blow together, the bell\'s kneel and its toll stopped at the phase line, each told through the server (a real deflect answered, the kneel in the snapshot); the founder and the bell whole and facing out, passed.');
