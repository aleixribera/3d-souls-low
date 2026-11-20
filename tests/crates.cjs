'use strict';
// Levels, crates and abilities (PLAN.md item 7; js/data/crates.js, js/progress.js): xp and levels, a run counted once;
// a fresh profile owns exactly the starter set; a crate unlocks an ability not owned, never a duplicate, over the whole
// pool, then says the collection is complete; the active pool keeps its minimum per rarity; the store is kept across
// visits, resets old saves to the starter set and is safe against bad or blocked storage. Then the server: a player is
// offered only their active pool, a bad pool is the starter set, the weekly run offers everyone the same, and a pool
// change waits for the run's end. Last, the two heal rares on a body (Grave Feast, Iron Mercy).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const { createSimulation, build } = require('../server/headless.cjs');
const { createServer } = require('../server/index.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');

const root = path.join(__dirname, '..');
const plain = x => JSON.parse(JSON.stringify(x));   // an object from the other realm, comparable here
const near = (a, b, what, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);
const sorted = list => [...list].sort();
// A browser's progress in its own realm, over `storage` (a Map, or a store whose calls throw).
function browser(storage) {
  const ctx = vm.createContext({ console, Math, JSON, localStorage: storage });
  for (const f of ['js/net-protocol.js', 'js/data/abilities.js', 'js/data/crates.js', 'js/progress.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return vm.runInContext('({ progress, CRATES, CRATE_MIN, ABILITIES, ABILITY_BY_ID })', ctx);
}
const store = () => { const m = new Map(); return { m, getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)) }; };
// A seeded random, so the odds below are the same every run.
const seeded = seed => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---- 1. Levels and xp ----------------------------------------------------------------------------------------------
{
  const { progress, CRATES } = browser(store()), L = CRATES.level, X = CRATES.xp;
  assert.deepEqual(plain(progress.levelOf(0)), { level: 1, into: 0, need: L.first });
  assert.deepEqual(plain(progress.levelOf(L.first)), { level: 2, into: 0, need: L.first + L.step });
  assert.equal(progress.levelOf(1e7).need, L.most, 'a level never needs more than `most`');
  assert.equal(progress.runXp({ won: 4, crowned: 0, time: 370 }), 4 * X.fight + 6 * X.minute);
  assert.equal(progress.runXp({ won: 5, crowned: 1, time: 59 }), 5 * X.fight + X.crowned);
  assert.equal(progress.runXp({ won: 0, time: 20 }), X.least, 'a run lost at once still earns something');
  assert.equal(progress.award({ outcome: 'left', won: 0, time: 120 }, 'abandoned'), null, 'an abandoned run before its first win earns nothing');
  assert.equal(progress.runXp({ won: 'x', crowned: -3, time: NaN }), X.least, 'a summary that makes no sense earns the least');
  const big = { won: 12, crowned: 2, time: 900 }, earned = progress.award(big, 'run-1');
  assert.equal(earned.xp, progress.runXp(big)); assert.equal(earned.before.level, 1);
  assert.equal(earned.crates, earned.after.level - 1); assert.ok(earned.crates >= 2, 'a long run gives several crates');
  assert.equal(progress.crates, earned.crates); assert.equal(progress.xp, earned.xp);
  assert.equal(progress.award(big, 'run-1'), null, 'the same run is not counted twice');
  assert.equal(progress.xp, earned.xp);
}

// ---- 2. The starter set, the odds, every crate new until the collection is complete ---------------------------------
{
  const { progress, CRATES, CRATE_MIN, ABILITIES } = browser(store()), rng = seeded(7);
  // A fresh profile owns exactly the starter set (6 commons, 4 rares, 2 legendaries), all of it on.
  assert.deepEqual(sorted(progress.owned), sorted(CRATES.starter), 'a fresh profile owns exactly the starter set');
  assert.deepEqual(sorted(progress.active()), sorted(CRATES.starter), 'all of it on');
  assert.deepEqual(plain(CRATE_MIN), { common: 6, rare: 4, legendary: 2 });
  const BY = Object.fromEntries(ABILITIES.map(b => [b.id, b])), keyed = k => CRATES.starter.filter(id => BY[id].key === k).length;
  assert.ok(['strike', 'guard', 'summon', 'ultimate'].every(k => keyed(k) === 1), 'one starter on each number key');
  assert.equal(CRATES.starter.filter(id => BY[id].rarity === 'rare' && !BY[id].key).length, 1, 'one triggered rare');
  assert.equal(CRATES.starter.filter(id => BY[id].rarity === 'legendary' && !BY[id].key).length, 1, 'one triggered legendary');
  // The odds, from a fresh collection (every rarity still holds something): each rarity about its weight's share.
  const count = { common: 0, rare: 0, legendary: 0 }, N = 20000, total = Object.values(CRATES.odds).reduce((a, b) => a + b, 0);
  for (let i = 0; i < N; i++) count[progress.draw(rng).rarity]++;
  for (const [r, w] of Object.entries(CRATES.odds)) near(count[r] / N, w / total, `crate odds, ${r}`, 0.02 / (w / total));
  assert.equal(progress.open(rng), null, 'no crate, nothing to open');
  const prizes = ABILITIES.filter(b => !CRATES.starter.includes(b.id));
  progress.award({ won: 300, crowned: 60, time: 0 }, 'long');
  assert.ok(progress.crates > prizes.length, 'enough crates for everything and more');
  const seen = new Set(), before = progress.crates;
  for (let i = 0; i < prizes.length; i++) {
    assert.equal(progress.complete, false);
    const got = progress.open(rng);
    assert.ok(got, `crate ${i + 1} opens`);
    assert.ok(!CRATES.starter.includes(got.ability.id) && !seen.has(got.ability.id), `crate ${i + 1} gives an ability not owned (${got.ability.id})`);
    seen.add(got.ability.id);
    assert.ok(progress.owns(got.ability.id) && progress.isActive(got.ability.id), 'owned and on at once');
    assert.equal(got.strip.length, CRATES.roll.tiles); assert.equal(got.strip[CRATES.roll.land], got.ability.id, 'the strip lands on it');
    assert.ok(got.strip.every(id => BY[id] && !CRATES.starter.includes(id)), 'the strip shows only crate abilities');
  }
  assert.equal(seen.size, prizes.length, 'the whole pool, each once');
  assert.equal(progress.crates, before - prizes.length);
  assert.equal(progress.complete, true, 'everything owned: the collection is complete');
  assert.equal(progress.open(rng), null, 'a complete collection opens nothing'); assert.equal(progress.crates, before - prizes.length, 'and keeps its crates');
  assert.equal(progress.draw(rng), null);
  // Late in the collection the odds lean to what is left: with only legendaries left, a crate gives one.
  const late = browser(store()).progress; late.award({ won: 300, time: 0 }, 'x');
  let opened; while ((opened = late.open(rng)) && ABILITIES.some(b => b.rarity !== 'legendary' && !late.owns(b.id)));
  const left = ABILITIES.filter(b => !late.owns(b.id));
  if (left.length) assert.ok(left.every(b => b.rarity === 'legendary') && late.draw(rng).rarity === 'legendary', 'what is left is what a crate gives');
}

// ---- 3. The active pool: on and off, never under the minimum ---------------------------------------------------------
{
  const { progress, CRATES, ABILITY_BY_ID } = browser(store());
  const common = CRATES.starter.find(id => ABILITY_BY_ID[id].rarity === 'common');
  assert.equal(progress.canTurnOff(common), false, 'at the minimum, nothing turns off');
  assert.equal(progress.setActive(common, false), false); assert.ok(progress.isActive(common));
  assert.equal(progress.setActive('cold-riposte', true), false, 'an ability not owned does not turn on');
  progress.award({ won: 300, time: 0 }, 'k');
  let got; do got = progress.open(seeded(9)); while (got && got.ability.rarity !== 'common');
  assert.ok(got, 'a common unlocked');
  assert.equal(progress.canTurnOff(common), true, 'one over the minimum: one may turn off');
  assert.equal(progress.setActive(common, false), true); assert.ok(!progress.active().includes(common), 'off: out of the pool');
  assert.equal(progress.setActive(got.ability.id, false), false, 'back at the minimum');
  assert.equal(progress.setActive(common, true), true); assert.ok(progress.active().includes(common));
}

// ---- 4. The store: kept across visits, old saves reset, safe against bad data and blocked storage -------------------
{
  const s = store(), a = browser(s).progress;
  a.award({ won: 6, time: 300 }, 'k1'); const opened = a.open(seeded(3));
  const b = browser(s).progress;   // the next visit
  assert.equal(b.xp, a.xp); assert.equal(b.crates, a.crates); assert.deepEqual(plain(b.owned), plain(a.owned));
  assert.equal(b.award({ won: 6, time: 300 }, 'k1'), null, 'a run counted on the last visit stays counted');
  assert.ok(b.owns(opened.ability.id));
  // Two tabs at once: one opens a crate, the other then counts a run; neither undoes the other.
  b.award({ won: 9, time: 0 }, 'k2'); const tabA = a.open(seeded(4)); b.award({ won: 1, time: 0 }, 'k3');
  const after = browser(s).progress;
  assert.ok(after.owns(tabA.ability.id), 'a crate opened in one tab survives a run counted in another');
  assert.equal(after.award({ won: 9, time: 0 }, 'k2'), null);
  // A save from before item 7 (no version, blade looks owned): its xp, crates and name stay; its abilities are the
  // starter set again (everyone resets, Aleix).
  const { CRATES } = browser(store());
  const old = store(); old.setItem('arena.progress', JSON.stringify({ xp: 900, crates: 3, owned: ['old-steel', 'gilded', 'grave-feast'], look: 'gilded', counted: ['r1'], name: 'Vale' }));
  const o = browser(old).progress;
  assert.equal(o.xp, 900); assert.equal(o.crates, 3); assert.equal(o.name, 'Vale'); assert.equal(o.award({ won: 1 }, 'r1'), null);
  assert.deepEqual(sorted(o.owned), sorted(CRATES.starter), 'an old save resets to the starter set');
  // Bad data in a current save: unknown abilities dropped, the starter set always owned, too many off turned on.
  const bad = store(); bad.setItem('arena.progress', JSON.stringify({ v: CRATES.save, xp: -5, crates: 2.5, owned: ['cold-riposte', 'nope', 3], off: ['keen-edge', 'cold-riposte', 'nope'], counted: 'x' }));
  const c = browser(bad).progress;
  assert.equal(c.xp, 0); assert.equal(c.crates, 0); assert.ok(c.owns('cold-riposte') && c.owns('keen-edge') && !c.owns('nope'));
  assert.ok(c.isActive('keen-edge') || c.isActive('cold-riposte'), 'never under the minimum');
  assert.equal(c.active().filter(id => ['keen-edge', 'iron-blood', 'breaker', 'keen-eye', 'light-step', 'quick-draught', 'cold-riposte'].includes(id)).length, 6);
  const junk = store(); junk.setItem('arena.progress', '{not json'); assert.equal(browser(junk).progress.level.level, 1, 'unreadable: start again');
  // Storage that throws (blocked, private mode): it still plays, kept for the visit.
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const d = browser(blocked).progress;
  const e = d.award({ won: 3, time: 200 }, 'b'); assert.ok(e.xp > 0); assert.equal(d.xp, e.xp);
  assert.equal(d.setName('Kept'), true); assert.equal(d.name, 'Kept', 'a name set with storage blocked lasts the visit');
}

// ---- 4b. The player's name, kept with the save (PLAN.md "Next, small" 6) -------------------------------------------
{
  const s = store(), a = browser(s).progress;
  assert.equal(a.name, '', 'a new player has no name');
  assert.equal(a.setName('  <b>Ser Vale</b>\u0007  '), true); assert.equal(a.name, 'bSer Vale/b', 'cleaned as the server cleans it');
  assert.equal(a.setName('   '), false, 'an empty name is refused'); assert.equal(a.name, 'bSer Vale/b');
  assert.equal(a.setName('x'.repeat(40)), true); assert.equal(a.name.length, 24, 'capped at the protocol length');
  a.setName('Ser Vale'); a.award({ won: 2, time: 0 }, 'n1');
  assert.equal(JSON.parse(s.getItem('arena.progress')).name, 'Ser Vale', 'stored in the save itself');
  assert.equal(browser(s).progress.name, 'Ser Vale', 'the next visit keeps it');
  const b = browser(s).progress; a.setName('Vale'); b.award({ won: 1, time: 0 }, 'n2');
  assert.equal(browser(s).progress.name, 'Vale');
  const old = store(); old.setItem('combatArena.onlineName', 'Friend'); assert.equal(browser(old).progress.name, 'Friend');
  const made = store(); made.setItem('combatArena.onlineName', 'Player 3'); assert.equal(browser(made).progress.name, '');
  const both = store(); both.setItem('combatArena.onlineName', 'Old'); both.setItem('arena.progress', JSON.stringify({ name: 'New' }));
  assert.equal(browser(both).progress.name, 'New', 'the save wins over the old key');
}

// ---- 5. The server's offers: only the active pool ----------------------------------------------------------------------
{
  const sim = createSimulation({ seed: 11 }), g = name => sim.inspect().Game.update.constructor('return ' + name)();
  const CR = g('CRATES'), ALL = g('ABILITIES').map(b => b.id);
  sim.start('arena', 'ostrey');
  const offered = (id, pools, rounds = 300) => {
    const seen = new Set();
    for (let i = 0; i < rounds; i++) { sim.offerAbilities([id], false, 1, 20, false, null, pools); for (const a of sim.abilityOffer(id) || []) seen.add(a); sim.pickAbility(id, sim.abilityOffer(id)[0]); sim.giveAbilities(id, []); }
    return seen;
  };
  const pool = [...CR.starter, 'cold-riposte', 'iron-mercy', 'storm-king'];
  assert.deepEqual(sorted(sim.setGear('p', [...pool, 'nothing', 7, 'keen-edge'])), sorted(pool), 'unknown ids dropped, each once');
  const mine = offered('p', true);
  assert.ok([...mine].every(a => pool.includes(a)), `only the active pool is offered: ${[...mine].filter(a => !pool.includes(a))}`);
  assert.ok(['cold-riposte', 'iron-mercy', 'storm-king'].every(a => mine.has(a)), 'what the pool holds can be offered');
  assert.deepEqual(sorted(sim.setGear('q', CR.starter.slice(1))), sorted(CR.starter), 'a pool under the minimum is the starter set');
  assert.deepEqual(sorted(sim.setGear('r', 'all')), sorted(CR.starter), 'not a list: the starter set');
  const week = offered('p', false);
  assert.ok([...week].some(a => !pool.includes(a)), 'the weekly run offers from every ability, the same for everyone');
  assert.ok([...offered('bot', true)].some(a => !CR.starter.includes(a)) && ALL.length > CR.starter.length, 'one with no pool set (a bot) is offered any');
}

// ---- 6. The lobby: hello sets the pool, a change during a run waits for its end ---------------------------------------
async function lobby() {
  const app = createServer({ firstPick: false });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port, wait = ms => new Promise(r => setTimeout(r, ms));
  const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [];
  ws.on('message', data => queue.push(JSON.parse(data)));
  const next = async type => { for (let i = 0; i < 500; i++) { const at = queue.findIndex(m => m.type === type); if (at >= 0) return queue.splice(at, 1)[0]; await wait(20); } throw new Error('Timed out: ' + type); };
  const send = m => ws.send(JSON.stringify(m)), flush = async () => { send({ type: 'ping' }); await next('pong'); };
  try {
    const g = name => app.sim.inspect().Game.update.constructor('return ' + name)(), CR = g('CRATES');
    const first = [...CR.starter, 'cold-riposte'], second = [...CR.starter, 'storm-king'];
    await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name: 'Ash', abilities: first });
    const id = (await next('welcome')).id;
    assert.deepEqual(sorted(app.sim.poolOf(id)), sorted(first), 'hello sets the pool');
    send({ type: 'gear', abilities: second }); await flush();
    assert.deepEqual(sorted(app.sim.poolOf(id)), sorted(second), 'in the lobby, a change counts at once');
    send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id }); await next('start');
    send({ type: 'gear', abilities: first }); await flush();
    assert.deepEqual(sorted(app.sim.poolOf(id)), sorted(second), 'locked while the run is on');
    send({ type: 'control', action: 'lobby' }); await next('stop');
    assert.deepEqual(sorted(app.sim.poolOf(id)), sorted(first), 'the change made during the run counts at its end');
    // A restart is a new run: a change kept during the old one counts for it.
    send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id }); await next('start');
    send({ type: 'gear', abilities: second }); await flush();
    assert.deepEqual(sorted(app.sim.poolOf(id)), sorted(first), 'locked again');
    send({ type: 'control', action: 'restart' }); await next('start');
    assert.deepEqual(sorted(app.sim.poolOf(id)), sorted(second), 'a restart takes the kept change');
  } finally { ws.close(); app.close?.(); app.server.close(); }
}

// ---- 7. The two heal rares on a body ------------------------------------------------------------------------------------
function heals() {
  const sim = createSimulation({ seed: 5 }), g = name => sim.inspect().Game.update.constructor('return ' + name)();
  sim.addBot(); sim.start('arena', 'ostrey');
  const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), CONFIG = g('CONFIG'), ES = g('ES'), PS = g('PS'), BY = g('ABILITY_BY_ID');
  const hands = [...sim.inspect().bots.values()][0].body.ctl, e = sim.inspect().Game.enemies[0];
  const body = ids => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + 0.6, Math.PI, e.y); p.ctl = hands; p.grantAbilities(ids); return p; };

  // Iron Mercy: a parry heals, then not again until its cooldown has run.
  const parryable = e.def.attacks.find(a => g('canParryAttack')(a)), mv = BY['iron-mercy'].levels[0];
  const parry = p => {
    e.yaw = 0; e.attack = parryable; e.hitIndex = 0; e.state = ES.WINDUP; e.stateTime = parryable.hits[0].startup - CONFIG.parry.lead * 0.5;
    p.setState(PS.IDLE); p.deflect = CONFIG.parry.arm; p.deflectLock = 0;   // a deflect press (pass 85)
    g('resolveCombat')({ player: p, enemies: [e], hitstop: 0 });
  };
  const mercy = body(['iron-mercy']); mercy.hp = 40;
  parry(mercy); near(mercy.hp, 40 + mercy.maxHp * mv.heal, 'Iron Mercy heals on a parry');
  const healed = mercy.hp; parry(mercy); near(mercy.hp, healed, 'Iron Mercy waits for its cooldown');
  g('abilityClocks')(mercy.perk, mv.cooldown + 0.01); parry(mercy); near(mercy.hp, healed + mercy.maxHp * mv.heal, 'Iron Mercy again after its cooldown');
  const none = body([]); none.hp = 40; parry(none); assert.equal(none.hp, 40, 'no heal without it');

  // Grave Feast: a Finishing Blow heals (pass 100).
  const feast = (ids) => {
    const p = body(ids); p.hp = 30; e.hp = e.def.hp; e.setState(ES.IDLE);
    const X = g('finisher'); X.start(p, e);
    for (let t = 0; t < 4 && !p.exec?.impact; t += 1 / 60) X.update(p, 1 / 60);
    assert.ok(p.exec?.impact, 'the Finishing Blow lands');
    return p.hp;
  };
  near(feast(['grave-feast']), 30 + PLAYER_DEF.stats.maxHp * (BY['grave-feast'].levels[0].heal + CONFIG.finisher.heal), 'Grave Feast heals on a Finishing Blow');   // on top of every Finishing Blow's own
  near(feast([]), 30 + PLAYER_DEF.stats.maxHp * CONFIG.finisher.heal, 'a Finishing Blow heals a little without it');
}

(async () => {
  heals();
  await lobby();
  console.log('crates: ok');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
