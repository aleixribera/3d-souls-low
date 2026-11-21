'use strict';
// Summons II (pass 144, design/abilities BUILD-ORDER batch 11): Ink Crows pecking at the boss four times a second, the
// Bone Archer rising at range whose arrows land a flight later, the Thunder Hawk whose dives land `dive` s after they
// start, and the Night Owl whose marks make the next weapon blow anyone lands hit harder. Through the server (Boss Rush
// and Boss Rush alone run this session): each call, peck, loose, dive and landing told with its place; a mark burst by a
// person's hit claim, by a teammate's too, told to every browser; a blocked blow keeps it. And the four Blender models'
// data: every piece their drawing hangs, in budget, no inside-out mesh.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

const sim = createSimulation({ seed: 11 }), g = realm(sim);
sim.start('arena', 'pillagerCaptain');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), ES = g('ES');
const powers = g('abilityPowers'), K = CONFIG.abilities.summons, e = sim.inspect().Game.enemies[0], said = [];
g('events').on('abilityPower', ev => said.push(ev));
const holder = (ids, dz = 3) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const v = id => BY[id].levels[0];
const fresh = () => { powers.reset(); said.length = 0; e.hp = e.def.hp; e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.frozen = 0; e.owlMark = null; e.cooldown = 99; e.poise = e.def.poise ?? e.poise; };
const step = (s, p) => { for (let t = 0; t < s - 1e-9; t += 1 / 60) { powers.tick(1 / 60); if (p) e.update(1 / 60, powers.decoy(e) || p); } };
const press = (id, p) => powers.trigger(id, p, p.kit, 'press', { enemy: e, key: 'summon' });
const told = (kind, f = () => true) => said.filter(x => x.then === kind && f(x));

const IDS = { crows: 'ink-crows', archer: 'bone-archer', hawk: 'thunder-hawk', owl: 'night-owl' };
for (const id of Object.values(IDS)) assert.ok(BY[id] && BY[id].rarity === 'rare' && BY[id].key === 'summon' && BY[id].power.when === 'press' && BY[id].levels.length === 3, id);

// Ink Crows: at the boss, pecking every 0.25 s for small damage, drawing it once.
{
  fresh();
  const p = holder([IDS.crows]), C = v(IDS.crows); press('c', p);
  const s = powers.summonOf('c'); assert.ok(s && s.kind === 'crows', 'the crows are out');
  step(K.arrive + 1);
  const pecks = told('crows', x => x.strike).length;
  assert.ok(pecks >= 3 && pecks <= 5, `about four pecks a second (${pecks} in 1 s)`);
  assert.ok(Math.abs(e.def.hp - e.hp - pecks * C.damage) < 1e-6, 'each peck its damage');
  assert.ok(told('crows', x => x.draw).length === 1, 'it draws the boss once');
}

// Bone Archer: it rises `gap` m off the boss's side away from its holder and shoots from there; each arrow lands
// distance / `shot` s on, told as it leaves (`flight`) and as it lands (`land`).
{
  fresh();
  const p = holder([IDS.archer], 2); press('a', p);
  const s = powers.summonOf('a'); assert.ok(s && s.kind === 'archer', 'the archer is out');
  const r = Math.hypot(s.x - e.x, s.z - e.z);
  assert.ok(Math.abs(r - (e.radius + K.archer.gap)) < 0.05, `it rises ${K.archer.gap} m off the boss (${r.toFixed(2)})`);
  for (let i = 0; i < 300 && !told('archer', x => x.flight).length; i++) step(1 / 60);
  const loose = told('archer', x => x.flight)[0];
  assert.ok(loose, 'an arrow loosed, told with its flight');
  assert.ok(Math.abs(loose.flight - Math.hypot(e.x - s.x, e.z - s.z) / K.archer.shot) < 0.03, `its flight is distance / shot (${loose.flight.toFixed(3)} s)`);
  assert.equal(e.hp, e.def.hp, 'nothing lands as it is loosed');
  step(loose.flight + 0.03);
  const hit = told('archer', x => x.land)[0];
  assert.ok(hit && !hit.heal && e.hp === e.def.hp - v(IDS.archer).damage, 'the arrow lands for its damage, told as it lands, healing no one');
}

// Thunder Hawk: it circles the boss; each dive is told as it starts (`flight` = its `dive`) and lands `dive` s later.
{
  fresh();
  const p = holder([IDS.hawk]), H = v(IDS.hawk); press('h', p);
  const s = powers.summonOf('h'); assert.ok(s && s.kind === 'hawk', 'the hawk is out');
  for (let i = 0; i < 300 && !told('hawk', x => x.flight).length; i++) step(1 / 60);
  const dive = told('hawk', x => x.flight)[0];
  assert.ok(dive && Math.abs(dive.flight - K.hawk.dive) < 1e-9, 'a dive told with its time');
  assert.equal(e.hp, e.def.hp, 'nothing lands as it starts');
  step(K.hawk.dive + 0.02);
  assert.ok(told('hawk', x => x.land).length === 1 && e.hp === e.def.hp - H.damage, 'the dive lands for its damage');
  const a0 = Math.atan2(s.x - e.x, s.z - e.z); step(0.5); const a1 = Math.atan2(s.x - e.x, s.z - e.z);
  assert.ok(Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0))) > 0.3, 'it circles the boss');
  assert.ok(told('hawk', x => x.draw).length === 1, 'it draws the boss once');
}

// Night Owl: it never strikes and never draws; it marks the boss every `every` s; the mark lapses after `markLife` s.
{
  fresh();
  const p = holder([IDS.owl]), O = v(IDS.owl); press('o', p);
  const s = powers.summonOf('o'); assert.ok(s && s.kind === 'owl', 'the owl is out');
  step(K.arrive + 0.05);
  assert.ok(e.owlMark && e.owlMark.mul === O.mark && e.owlMark.holder === 'o', 'the boss is marked on arrival');
  assert.equal(e.hp, e.def.hp, 'the owl wounds nothing');
  assert.ok(!told('owl', x => x.draw).length && powers.decoy(e) === null, 'it never draws the boss');
  step(O.every * 2 + 0.05); assert.ok(told('owl', x => x.strike).length >= 3, 'a mark every `every` s');
  s.until = 0; step(1 / 60); assert.equal(powers.summonOf('o'), null, 'gone at its time');
  step(K.owl.markLife + 0.1); assert.equal(e.owlMark, null, 'an unburst mark lapses');
}

// Through the server: a person's press calls each; every blow is told with its place and enemy, shots and dives with
// their flight and their landing; a mark is burst by the next weapon blow anyone lands, told to every browser.
{
  fresh();
  const S = PLAYER_DEF.stats, id = 'two', mate = 'mate';
  sim.registerPlayer(id, 'Ash'); sim.registerPlayer(mate, 'Bell');
  const place = (at = {}) => sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 4, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0, ...at },
    { id: mate, x: e.x + 0.5, y: e.y, z: e.z + e.radius + 0.6, yaw: Math.PI, hp: S.maxHp, state: 'attack', poseAge: 0 }]);
  const claim = ability => {
    sim.giveAbilities(id, [ability]); place();
    const st = sim.inspect().holderOf(id).perk; st.charge.summon = v(ability).charge;
    return sim.abilityClaim(id, { when: 'press', key: 'summon' });
  };
  const run = (s, pick) => { const out = []; for (let t = 0; t < s; t += 1 / 60) { place(); sim.tick(1 / 60); for (const x of sim.frame(true).events) if (pick(x)) out.push(x); } return out; };
  for (const [kind, ability] of Object.entries(IDS)) {
    fresh(); sim.tick(1 / 60); sim.frame(true);
    assert.equal(claim(ability), true, `${ability} pressed`);
    const heard = run(3.2, x => x.type === 'abilityPower' && x.then === kind);
    assert.ok(heard.some(x => !x.strike && !x.draw && x.power === ability), `${kind}: its call told`);
    const blows = heard.filter(x => x.strike);
    assert.ok(blows.length >= 1 && blows.every(x => [x.x, x.z].every(Number.isFinite) && x.enemy === e.netId), `${kind}: each blow told with its place and enemy (${blows.length})`);
    if (kind === 'archer' || kind === 'hawk') {
      assert.ok(blows.some(x => x.flight > 0), `${kind}: a flight told`);
      assert.ok(blows.some(x => x.land && !x.flight), `${kind}: a landing told`);
    }
    if (kind !== 'owl') assert.ok(heard.some(x => x.draw), `${kind}: its draw told`);
  }
  // The owl's mark: a person's light on the marked boss does `mark` more and bursts it, told to every browser; the
  // next blow is plain. A teammate's blow bursts the next mark the same.
  fresh(); sim.tick(1 / 60); sim.frame(true);
  assert.equal(claim(IDS.owl), true, 'the owl pressed');
  run(K.arrive + 0.1, () => false);
  const O = v(IDS.owl);
  assert.ok(e.owlMark, 'the boss marked');
  const blow = (who, near) => {
    e.hp = e.def.hp; e.poise = 1e9; e.state = ES.IDLE; e.attack = null; e.hitbox = null;
    sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + (who === id ? 0.6 : 4), yaw: Math.PI, hp: S.maxHp, state: 'attack', poseAge: 0 },
      { id: mate, x: e.x + 0.3, y: e.y, z: e.z + e.radius + (who === mate ? 0.6 : 4), yaw: Math.PI, hp: S.maxHp, state: 'attack', poseAge: 0 }]);
    assert.equal(sim.hit(who, { enemy: e.netId, attack: 'light', charge: 0 }), true, `${who}'s light lands`);
    return e.def.hp - e.hp;
  };
  sim.frame(true);
  const marked = blow(id), burst = sim.frame(true).events.filter(x => x.type === 'abilityPower' && x.then === 'owlBurst');
  assert.equal(e.owlMark, null, 'the mark burst');
  assert.ok(burst.length === 1 && burst[0].power === IDS.owl && burst[0].enemy === e.netId && burst[0].holder === id, 'the burst told to every browser');
  for (let i = 0; i < 20; i++) sim.tick(1 / 60);
  e.owlMark = null; const plain = blow(id);
  assert.ok(Math.abs(marked - plain * (1 + O.mark)) < 1e-6, `the marked blow did ${O.mark} more (${marked.toFixed(1)} vs ${plain.toFixed(1)})`);
  run(O.every + 0.1, () => false);
  assert.ok(e.owlMark, 'marked again');
  for (let i = 0; i < 20; i++) sim.tick(1 / 60);
  const theirs = blow(mate);
  assert.ok(e.owlMark === null && Math.abs(theirs - plain * (1 + O.mark)) < 1e-6, 'a teammate\'s blow bursts it the same');
  // A blocked blow keeps the mark; a power's blow neither bursts nor spends it.
  const AS = g('abilityOwlStrike'), AL = g('abilityOwlLanded');
  e.owlMark = { mul: O.mark, holder: id, power: IDS.owl, v: O, t: 4 };
  const st = AS(e, { damage: 10 }); AL(e, st, { blocked: true });
  assert.ok(e.owlMark && st.damage === 10 * (1 + O.mark), 'blocked: the mark stays');
  assert.equal(AS(e, { damage: 10, power: true }).damage, 10, 'a power\'s blow takes nothing from it');
}

// The four models' data (tools/blender/*.py, packed): every piece the drawing hangs, in budget, and no mesh inside out
// (each triangle's winding agrees with its stored normals: the game culls back faces and outlines along the normals).
{
  const ctx = { BAKED: undefined }; vm.createContext(ctx);
  const bytes = b64 => new Uint8Array(Buffer.from(b64, 'base64'));
  const want = {
    'ink-crows': [['crow:', ['body__ink', 'body__eye']], 400],
    'thunder-hawk': [['hawk:', ['body__ink', 'head__ink', 'wingLu__ink', 'wingLl__ink', 'wingRu__ink', 'wingRl__ink', 'tail__ink', 'wingLl__bolt', 'wingRl__bolt']], 1800],
    'night-owl': [['owl:', ['body__plume', 'head__plume', 'head__eye', 'wingLu__plume', 'wingLl__plume', 'wingRu__plume', 'wingRl__plume', 'tail__plume', 'wingLu__bar']], 1700],
    'bone-archer': [['bonearcher:', ['head__bone', 'head__light', 'chest__cloth', 'elbowL__wood', 'elbowL__light', 'elbowR__light', 'legL__bone', 'kneeR__bone']], 4000],
  };
  for (const [file, [[pre, parts], budget]] of Object.entries(want)) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/baked', file + '.js'), 'utf8'), ctx);
    const names = Object.keys(ctx.BAKED).filter(n => n.startsWith(pre));
    for (const q of parts) assert.ok(names.includes(pre + q), `${file}: ${pre + q}`);
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
    assert.ok(tris <= budget, `${file}: ${tris} triangles, at most ${budget}`);
  }
}
console.log('SUMMONS II: the crows pecking four a second, the archer rising at range with arrows landing a flight later, the hawk circling and diving, the owl\'s marks burst by anyone\'s next blow (a blocked one keeps it), each told through the server; the four models whole and facing out, passed.');
