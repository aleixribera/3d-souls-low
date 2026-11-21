'use strict';
// Legendaries I (pass 151, design/abilities BUILD-ORDER batch 13): Storm King's crown of bolts round the boss (each
// bolt on its ring point, the ones beside it struck too), Gale Crescent's blade cage (cuts over its time, a new cage
// starting afresh), the boss free of Time Rift for `holdRest` s after a freeze. Through the server (Boss Rush and Boss
// Rush alone run this session): each bolt and cut told with its place. And the Ember Twin's Blender model's data.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createSimulation } = require('../server/headless.cjs');
const realm = sim => name => sim.inspect().Game.update.constructor('return ' + name)();

const sim = createSimulation({ seed: 13 }), g = realm(sim);
sim.start('arena', 'ostrey');
const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), BY = g('ABILITY_BY_ID'), CONFIG = g('CONFIG'), ES = g('ES'), Enemy = g('Enemy');
const powers = g('abilityPowers'), C = CONFIG.abilities, Game = sim.inspect().Game, e = Game.enemies[0], said = [];
g('events').on('abilityPower', ev => said.push(ev));
const holder = (ids, dz = 3) => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + dz, Math.PI, e.y); p.grantAbilities(ids); return p; };
const v = id => BY[id].levels[0];
const fresh = () => { powers.reset(); said.length = 0; e.hp = e.def.hp; e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.frozen = 0; e.holdRest = 0; e.cooldown = 99; e.poise = 1e9; };
const step = s => { for (let t = 0; t < s - 1e-9; t += 1 / 60) powers.tick(1 / 60); };
const told = (kind, f = () => true) => said.filter(x => x.then === kind && f(x));
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} vs ${b}`);
// A second enemy beside the boss, for what strikes round it.
const beside = (dx, dz) => { const o = new Enemy(e.def, { behavior: 'gated', x: e.x + dx, y: e.y, z: e.z + dz, yaw: 0 }); o.poise = 1e9; Game.enemies.push(o); return o; };
const away = o => Game.enemies.splice(Game.enemies.indexOf(o), 1);

// ---- Storm King: `strikes` bolts on a ring round the boss, the first facing the holder; what stands by one is struck.
{
  fresh();
  const p = holder(['storm-king']), V = v('storm-king'), ring = e.radius + C.crown.gap;
  const by = beside(ring, 0);   // on the ring, a quarter round from the holder (who is at +z)
  powers.trigger('s', p, p.kit, 'fullHeavy', { enemy: e });
  step(V.lead * 0.9); assert.equal(e.hp, e.def.hp, 'the crown is still gathering');
  step(V.lead * 0.2 + V.every * V.strikes);
  const bolts = told('boltCrown', x => x.strike);
  assert.equal(bolts.length, V.strikes, 'every bolt');
  near(e.def.hp - e.hp, V.strikes * V.damage, 'each bolt its damage');
  for (const b of bolts) near(Math.hypot(b.x - e.x, b.z - e.z), ring, 'each bolt on the ring');
  assert.ok(bolts[0].z > e.z + ring * 0.99, 'the first bolt on the holder\'s side');
  const angles = new Set(bolts.map(b => Math.round(Math.atan2(b.z - e.z, b.x - e.x) * 100))); assert.equal(angles.size, V.strikes, 'each on its own point');
  assert.ok(by.hp < by.def.hp && by.hp > by.def.hp - 3 * V.damage, `the one by a bolt struck (${by.def.hp - by.hp})`);
  away(by);
}

// ---- Gale Crescent: a cage of round(time / every) cuts after its lead; a new cage on the same boss starts afresh.
{
  fresh();
  const p = holder(['gale-crescent']), V = v('gale-crescent'), cuts = Math.round(V.time / V.every), blow = { damage: 1, poise: 0 };
  const by = beside(e.radius + C.cage.reach * 0.5, 0);
  for (let i = 0; i < V.hits; i++) powers.trigger('g', p, p.kit, 'hits', { enemy: e, strike: blow });
  assert.equal(told('bladeCage', x => !x.strike).length, 1, 'a cage every Nth blow');
  step(C.cage.lead + V.time / 2);
  for (let i = 0; i < V.hits; i++) powers.trigger('g', p, p.kit, 'hits', { enemy: e, strike: blow });   // a second cage before the first is done
  step(C.cage.lead + V.time + 0.05);
  const n = told('bladeCage', x => x.strike).length;
  assert.ok(n > cuts && n < cuts * 2, `the second cage replaced the first (${n} cuts)`);
  near(e.def.hp - e.hp, n * V.damage, 'each cut its damage');
  assert.equal(by.def.hp - by.hp, n * V.damage, 'what stands in the cage is cut too');
  away(by);
}

// ---- Time Rift: frozen `time` s, then free of another freeze for `holdRest` s.
{
  fresh();
  const p = holder(['time-rift']), V = v('time-rift');
  powers.trigger('t', p, p.kit, 'dodge', { enemy: e });
  near(e.frozen, V.time, 'frozen');
  for (let t = 0; t < V.time + 0.5 - 1e-9; t += 1 / 60) e.update(1 / 60, p);
  assert.equal(e.frozen, 0, 'free when its time is up');
  assert.ok(e.holdRest > C.holdRest - 0.6 && e.holdRest < C.holdRest, `resting (${e.holdRest})`);
  powers.reset(); powers.trigger('t', p, p.kit, 'dodge', { enemy: e });
  assert.equal(e.frozen, 0, 'a rift while it rests does not stop it again');
  for (let t = 0; t < C.holdRest; t += 1 / 60) e.update(1 / 60, p);
  powers.reset(); powers.trigger('t', p, p.kit, 'dodge', { enemy: e });
  near(e.frozen, V.time, 'rested, a rift holds it again');
}

// ---- Through the server: a person's full heavy crowns the boss, every eighth blow cages it; each bolt and cut told
// with its place and enemy, for every browser to draw.
{
  fresh();
  const S = PLAYER_DEF.stats, id = 'legend';
  sim.registerPlayer(id, 'Ash');
  const place = () => sim.setPlayers([{ id, x: e.x, y: e.y, z: e.z + e.radius + 0.5, yaw: Math.PI, hp: S.maxHp, state: 'attack', poseAge: 0 }]);
  const calm = () => { e.state = ES.IDLE; e.attack = null; e.hitbox = null; e.cooldown = 99; };
  const run = (s, pick) => { const out = []; for (let t = 0; t < s; t += 1 / 60) { place(); calm(); sim.tick(1 / 60); for (const x of sim.frame(true).events) if (pick(x)) out.push(x); } return out; };
  sim.giveAbilities(id, ['storm-king']); place(); sim.tick(1 / 60); sim.frame(true);
  assert.equal(sim.hit(id, { enemy: e.netId, attack: 'heavy', charge: 1 }), true, 'a full heavy lands');
  const V = v('storm-king'), ring = e.radius + C.crown.gap;
  const bolts = run(V.lead + V.every * V.strikes + 0.3, x => x.type === 'abilityPower' && x.then === 'boltCrown' && x.strike);
  assert.equal(bolts.length, V.strikes, 'every bolt told');
  assert.ok(bolts.every(b => b.enemy === e.netId && Math.abs(Math.hypot(b.x - e.x, b.z - e.z) - ring) < 0.05), 'each on its ring point, with its enemy');
  assert.deepEqual(bolts.map(b => b.strike), [...Array(V.strikes)].map((_, i) => i + 1), 'numbered, for the last one\'s burst');

  e.hp = e.def.hp; sim.giveAbilities(id, ['gale-crescent']); place(); sim.tick(1 / 60); sim.frame(true);
  const G = v('gale-crescent'); let landed = 0;
  for (let i = 0; i < G.hits; i++) { for (let k = 0; k < 30; k++) { place(); calm(); sim.tick(1 / 60); } sim.frame(true); if (sim.hit(id, { enemy: e.netId, attack: 'light', charge: 0 })) landed++; }
  assert.equal(landed, G.hits, 'every blow lands');
  const shut = run(C.cage.lead + G.time + 0.3, x => x.type === 'abilityPower' && x.then === 'bladeCage' && x.strike);
  assert.equal(shut.length, Math.round(G.time / G.every), 'every cut told');
  assert.ok(shut.every(x => x.enemy === e.netId && Number.isFinite(x.x) && Number.isFinite(x.z)), 'each with its enemy and place');
}

// ---- The Ember Twin's model (tools/blender/ember_twin.py, packed): every piece its drawing hangs, in budget, no mesh
// inside out (each triangle's winding agrees with its stored normals: the game culls back faces and inks along them).
{
  const ctx = { BAKED: undefined }; vm.createContext(ctx);
  const bytes = b64 => new Uint8Array(Buffer.from(b64, 'base64'));
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/baked/ember-twin.js'), 'utf8'), ctx);
  const names = Object.keys(ctx.BAKED).filter(n => n.startsWith('twin:'));
  for (const q of ['head__ash', 'head__crack', 'head__eye', 'chest__ash', 'chest__crack', 'elbowR__ash', 'kneeL__crack', 'capeA__ash', 'capeC__crack']) assert.ok(names.includes('twin:' + q), 'twin:' + q);
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
  assert.ok(tris <= 4000, `the twin: ${tris} triangles, at most 4000`);
}
console.log('LEGENDARIES I: the crown of bolts on its ring and the ones beside it struck, the blade cage cutting over its time and starting afresh, the boss resting from Time Rift, each bolt and cut told through the server; the Ember Twin whole and facing out, passed.');
