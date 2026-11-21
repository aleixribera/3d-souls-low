'use strict';
// Summons III (pass 147, design/abilities BUILD-ORDER batch 12): the Ronin Shade that duels the boss and turns its first
// blow aside, the Mire Serpent coiled round the boss (riding with it) squeezing it, the Puppet Knight, the Ash Bear whose
// swipes land `dive` s after it rears, and the Glass Mantis. Through the server (Boss Rush and Boss Rush alone run this
// session): each call, blow, rear, landing, draw and the ronin's deflect told with its place. And the five Blender
// models' data: every piece their drawing hangs, in budget, no inside-out mesh.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

const sim = createSimulation({ seed: 12 }), g = realm(sim);
sim.start('arena', 'pillagerCaptain');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), ES = g('ES');
const powers = g('abilityPowers'), K = CONFIG.abilities.summons, e = sim.inspect().Game.enemies[0], said = [];
g('events').on('abilityPower', ev => said.push(ev));
const holder = (ids, dz = 3) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const v = id => BY[id].levels[0];
const fresh = () => { powers.reset(); said.length = 0; e.hp = e.def.hp; e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.frozen = 0; e.owlMark = null; e.cooldown = 99; e.poise = 1e9; };
const step = (s, p) => { for (let t = 0; t < s - 1e-9; t += 1 / 60) { powers.tick(1 / 60); if (p) e.update(1 / 60, powers.decoy(e) || p); } };
const press = (id, p) => powers.trigger(id, p, p.kit, 'press', { enemy: e, key: 'summon' });
const told = (kind, f = () => true) => said.filter(x => x.then === kind && f(x));

const IDS = { ronin: 'ronin-shade', serpent: 'mire-serpent', puppet: 'puppet-knight', bear: 'ash-bear', mantis: 'glass-mantis' };
for (const id of Object.values(IDS)) assert.ok(BY[id] && BY[id].rarity === 'rare' && BY[id].key === 'summon' && BY[id].power.when === 'press' && BY[id].levels.length === 3, id);

// Each strikes the boss every `every` s for its damage and draws it once (the bear's blows land a `dive` after its rear).
for (const [kind, id] of Object.entries(IDS)) {
  fresh();
  const p = holder([id]), V = v(id); press('h', p);
  const s = powers.summonOf('h'); assert.ok(s && s.kind === kind, `the ${kind} is out`);
  step(K.arrive + V.every * 2 + (K[kind].dive || 0) + 0.1);
  const landed = told(kind, x => kind === 'bear' ? x.land : x.strike && !x.flight).length;
  assert.ok(landed >= 2, `${kind}: its blows land (${landed})`);
  assert.ok(Math.abs(e.def.hp - e.hp - landed * V.damage) < 1e-6, `${kind}: each blow its damage`);
  assert.equal(told(kind, x => x.draw).length, 1, `${kind}: it draws the boss once`);
}

// The bear: each swipe told as it rears (`flight` = its `dive`), nothing landing then; it lands `dive` s later.
{
  fresh();
  const p = holder([IDS.bear]); press('b', p);
  for (let i = 0; i < 400 && !told('bear', x => x.flight).length; i++) step(1 / 60);
  const rear = told('bear', x => x.flight)[0];
  assert.ok(rear && Math.abs(rear.flight - K.bear.dive) < 1e-9, 'the rear told with its time');
  assert.equal(e.hp, e.def.hp, 'nothing lands as it rears');
  step(K.bear.dive + 0.02);
  assert.ok(told('bear', x => x.land).length === 1 && e.hp === e.def.hp - v(IDS.bear).damage, 'the swipe lands for its damage');
}

// The serpent rides with the boss: wherever the boss goes, it is coiled round it.
{
  fresh();
  const p = holder([IDS.serpent]); press('s', p);
  const s = powers.summonOf('s'); step(K.arrive + 0.1);
  e.x += 3; e.z -= 2; step(1 / 60);
  assert.ok(Math.hypot(s.x - e.x, s.z - e.z) < 1e-6, 'the serpent moved with the boss');
  for (let i = 0; i < 400 && !powers.decoy(e); i++) step(1 / 60);
  const d = powers.decoy(e);
  assert.ok(d && Math.abs(Math.hypot(d.x - e.x, d.z - e.z) - (e.radius + K.serpent.gap)) < 1e-6, 'it draws the boss to its coil, not the boss\'s own middle');
  assert.ok(Math.hypot(d.x - p.x, d.z - p.z) < Math.hypot(e.x - p.x, e.z - p.z), 'on its holder\'s side');
}

// The ronin: the first blow its drawn boss aims at it is turned aside (told once, `parry`); the next is not told again.
{
  fresh();
  const p = holder([IDS.ronin]); press('r', p);
  for (let i = 0; i < 400 && !told('ronin', x => x.draw).length; i++) step(1 / 60);
  assert.ok(told('ronin', x => x.draw).length === 1 && powers.decoy(e), 'the ronin draws the boss');
  step(0.1); assert.equal(told('ronin', x => x.parry).length, 0, 'no deflect before the boss swings');
  e.hitbox = { x: e.x, z: e.z, r: 1 }; step(1 / 60);
  assert.equal(told('ronin', x => x.parry).length, 1, 'its first blow turned aside');
  e.hitbox = null; step(0.2); e.hitbox = { x: e.x, z: e.z, r: 1 }; step(1 / 60); e.hitbox = null;
  assert.equal(told('ronin', x => x.parry).length, 1, 'only the first');
}

// Through the server: a person's press calls each; every blow told with its place and enemy; the bear's rear and its
// landing; each one's draw; the ronin's deflect reaches every browser.
{
  const S = PLAYER_DEF.stats, id = 'three';
  sim.registerPlayer(id, 'Ash');
  const place = () => sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 4, yaw: Math.PI, hp: S.maxHp, state: 'idle', poseAge: 0 }]);
  const claim = ability => {
    sim.giveAbilities(id, [ability]); place();
    const st = sim.inspect().holderOf(id).perk; st.charge.summon = v(ability).charge;
    return sim.abilityClaim(id, { when: 'press', key: 'summon' });
  };
  const run = (s, pick, each = () => {}) => { const out = []; for (let t = 0; t < s; t += 1 / 60) { place(); each(t); sim.tick(1 / 60); for (const x of sim.frame(true).events) if (pick(x)) out.push(x); } return out; };
  for (const [kind, ability] of Object.entries(IDS)) {
    fresh(); sim.tick(1 / 60); sim.frame(true);
    assert.equal(claim(ability), true, `${ability} pressed`);
    // The boss swings at 2 s (the ronin's deflect): its hitbox open for a moment.
    const heard = run(3.4, x => x.type === 'abilityPower' && x.then === kind, t => { e.hitbox = t > 2 && t < 2.1 ? { x: e.x, z: e.z, r: 1 } : null; });
    e.hitbox = null;
    assert.ok(heard.some(x => !x.strike && !x.draw && !x.parry && x.power === ability), `${kind}: its call told`);
    const blows = heard.filter(x => x.strike);
    assert.ok(blows.length >= 1 && blows.every(x => [x.x, x.z].every(Number.isFinite) && x.enemy === e.netId), `${kind}: each blow told with its place and enemy (${blows.length})`);
    if (kind === 'bear') {
      assert.ok(blows.some(x => x.flight > 0), 'bear: its rear told with its flight');
      assert.ok(blows.some(x => x.land && !x.flight), 'bear: its landing told');
    }
    assert.ok(heard.some(x => x.draw), `${kind}: its draw told`);
    assert.equal(heard.filter(x => x.parry).length, kind === 'ronin' ? 1 : 0, `${kind}: ${kind === 'ronin' ? 'its deflect told once' : 'no deflect'}`);
  }
}

// The five models' data (tools/blender/*.py, packed): every piece the drawing hangs, in budget, and no mesh inside out
// (each triangle's winding agrees with its stored normals: the game culls back faces and outlines along the normals).
{
  const ctx = { BAKED: undefined }; vm.createContext(ctx);
  const bytes = b64 => new Uint8Array(Buffer.from(b64, 'base64'));
  const want = {
    'ronin-shade': [['ronin:', ['head__straw', 'head__steel', 'chest__cloth', 'elbowR__steel', 'capeA__cloth', 'capeB__cloth', 'legL__cloth', 'kneeR__straw']], 3000],
    'puppet-knight': [['puppet:', ['head__wood', 'head__crack', 'chest__joint', 'elbowR__wood', 'elbowL__wood.1', 'kneeL__joint', 'loinF__paint']], 2500],
    'ash-bear': [['bear:', ['body__ash', 'body__ember', 'neck__ash', 'head__ash', 'jaw__ash', 'fLu__ash', 'fRl__char', 'hLu__ash', 'hRl__char']], 6000],
    'glass-mantis': [['mantis:', ['body__glass', 'head__glass', 'head__eye', 'aLu__glass', 'aLl__edge', 'aRl__glass', 'wL__glass', 'wR__glass', 'lL1__glass', 'lR2__glass']], 1800],
    'mire-serpent': [['serpent:', ['seg__body', 'seg__spine', 'head__body', 'head__spine', 'head__tooth', 'jaw__body', 'jaw__tooth']], 800],
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
console.log('SUMMONS III: the ronin duelling and turning the first blow aside, the serpent riding coiled round the boss, the puppet, the bear landing its swipes a rear later, the mantis, each told through the server; the five models whole and facing out, passed.');
