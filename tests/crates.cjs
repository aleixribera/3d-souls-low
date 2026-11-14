'use strict';
// Levels and crates (PLAN.md track B item 7; js/data/crates.js, js/progress.js): xp and levels, a run counted once,
// the crate's odds and what it gives (nothing owned twice while anything is left, a new look worn), the store kept
// across visits and safe against bad or blocked storage; then the server: a crate ability is offered only to the player
// whose crates gave it, never in the weekly run, and anything unknown a browser sends is dropped; and the two crate
// abilities heal on their own triggers (Grave Feast: an execution; Iron Mercy: a parry, once per cooldown).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createSimulation } = require('../server/headless.cjs');

const root = path.join(__dirname, '..');
const plain = x => JSON.parse(JSON.stringify(x));   // an object from the other realm, comparable here
const near = (a, b, what, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps * Math.max(1, Math.abs(b)), `${what}: ${a} is not ${b}`);
// A browser's progress in its own realm, over `storage` (a Map, or a store whose calls throw).
function browser(storage) {
  const ctx = vm.createContext({ console, Math, JSON, localStorage: storage });
  for (const f of ['js/data/abilities.js', 'js/data/crates.js', 'js/progress.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return vm.runInContext('({ progress, CRATES, CRATE_BY_ID, ABILITY_BY_ID, crateRarity })', ctx);
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
  assert.equal(progress.runXp({ beaten: 4, crowned: 0, time: 370 }), 4 * X.boss + 6 * X.minute);
  assert.equal(progress.runXp({ beaten: 5, crowned: 1, time: 59 }), 5 * X.boss + X.crowned);
  assert.equal(progress.runXp({ beaten: 0, time: 20 }), X.least, 'a run lost at once still earns something');
  assert.equal(progress.runXp({ beaten: 'x', crowned: -3, time: NaN }), X.least, 'a summary that makes no sense earns the least');

  // A run is counted once by its key; its levels are crates.
  const big = { beaten: 12, crowned: 2, time: 900 }, earned = progress.award(big, 'run-1');
  assert.equal(earned.xp, progress.runXp(big)); assert.equal(earned.before.level, 1);
  assert.equal(earned.crates, earned.after.level - 1); assert.ok(earned.crates >= 2, 'a long run gives several crates');
  assert.equal(progress.crates, earned.crates); assert.equal(progress.xp, earned.xp);
  assert.equal(progress.award(big, 'run-1'), null, 'the same run is not counted twice');
  assert.equal(progress.xp, earned.xp);
}

// ---- 2. Crates: the odds, nothing owned twice, a look worn ----------------------------------------------------------
{
  const { progress, CRATES, CRATE_BY_ID, crateRarity } = browser(store()), rng = seeded(7);
  // The odds, from a fresh collection: each rarity about its weight's share.
  const count = { common: 0, rare: 0, legendary: 0 }, N = 20000, total = Object.values(CRATES.odds).reduce((a, b) => a + b, 0);
  for (let i = 0; i < N; i++) count[crateRarity(progress.draw(rng))]++;
  for (const [r, w] of Object.entries(CRATES.odds)) near(count[r] / N, w / total, `crate odds, ${r}`, 0.02 / (w / total));
  assert.equal(progress.open(rng), null, 'no crate, nothing to open');
  const prizes = CRATES.rewards.filter(r => !r.start);
  progress.award({ beaten: 200, crowned: 40, time: 0 }, 'long');
  assert.ok(progress.crates > prizes.length, 'enough crates for everything and more');
  const seen = new Set(), before = progress.crates;
  for (let i = 0; i < prizes.length; i++) {
    const got = progress.open(rng);
    assert.equal(got.fresh, true, 'a crate holds something new while anything is left'); assert.ok(!seen.has(got.reward.id)); seen.add(got.reward.id);
    assert.equal(got.strip.length, CRATES.roll.tiles); assert.equal(got.strip[CRATES.roll.land], got.reward.id, 'the strip lands on the reward');
    assert.ok(got.strip.every(id => CRATE_BY_ID[id] && !CRATE_BY_ID[id].start), 'the strip shows only crate rewards');
    if (got.reward.kind === 'look') assert.equal(progress.look, got.reward.id, 'a new look is worn at once');
  }
  assert.equal(progress.crates, before - prizes.length);
  assert.deepEqual(plain([...progress.abilities()].sort()), plain(prizes.filter(r => r.kind === "ability").map(r => r.ability).sort()), 'the crate abilities owned');
  const again = progress.open(rng);
  assert.equal(again.fresh, false, 'with everything owned, a crate gives something already yours');
  const look = progress.look, other = prizes.find(r => r.kind === 'look' && r.id !== look).id;
  assert.equal(progress.wear(other), true); assert.equal(progress.look, other);
  assert.equal(progress.wear('grave-feast'), false, 'only a look is worn'); assert.equal(progress.wear('nothing'), false);
}

// ---- 3. The store: kept across visits, safe against bad data and blocked storage -----------------------------------
{
  const s = store(), a = browser(s).progress;
  a.award({ beaten: 6, time: 300 }, 'k1'); const opened = a.open(seeded(3));
  const b = browser(s).progress;   // the next visit
  assert.equal(b.xp, a.xp); assert.equal(b.crates, a.crates); assert.deepEqual(plain(b.owned), plain(a.owned)); assert.equal(b.look, a.look);
  assert.equal(b.award({ beaten: 6, time: 300 }, 'k1'), null, 'a run counted on the last visit stays counted');
  assert.ok(b.owns(opened.reward.id));
  // Two tabs at once: one opens a crate, the other then counts a run; neither undoes the other.
  b.award({ beaten: 9, time: 0 }, 'k2'); const tabA = a.open(seeded(4)); b.award({ beaten: 1, time: 0 }, 'k3');
  const after = browser(s).progress;
  assert.ok(after.owns(tabA.reward.id), 'a crate opened in one tab survives a run counted in another');
  assert.equal(after.award({ beaten: 9, time: 0 }, 'k2'), null);
  // Bad data: unknown rewards dropped, the start look always owned, a look not owned not worn, numbers made whole.
  const bad = store(); bad.setItem('arena.progress', JSON.stringify({ xp: -5, crates: 2.5, owned: ['gilded', 'nope', 3], look: 'bloodsteel', counted: 'x' }));
  const c = browser(bad).progress;
  assert.equal(c.xp, 0); assert.equal(c.crates, 0); assert.ok(c.owns('gilded') && c.owns('old-steel') && !c.owns('nope'));
  assert.equal(c.look, 'old-steel', 'a look you do not own is not worn');
  const junk = store(); junk.setItem('arena.progress', '{not json'); assert.equal(browser(junk).progress.level.level, 1, 'unreadable: start again');
  // Storage that throws (blocked, private mode): it still plays, kept for the visit.
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const d = browser(blocked).progress;
  const e = d.award({ beaten: 3, time: 200 }, 'b'); assert.ok(e.xp > 0); assert.equal(d.xp, e.xp);
}

// ---- 4. The server: crate abilities only for those who own them, never in the weekly run ------------------------------
{
  const sim = createSimulation({ seed: 11 }), g = name => sim.inspect().Game.update.constructor('return ' + name)();
  const BY = g('ABILITY_BY_ID'), crate = Object.values(BY).filter(b => b.crate).map(b => b.id);
  assert.ok(crate.length >= 2);
  sim.start('arena', 'ostrey');
  const offered = (id, crates, rounds = 300) => {
    const seen = new Set();
    for (let i = 0; i < rounds; i++) { sim.offerAbilities([id], false, 1, 20, false, null, crates); for (const a of sim.abilityOffer(id) || []) seen.add(a); sim.pickAbility(id, sim.abilityOffer(id)[0]); sim.giveAbilities(id, []); }
    return seen;
  };
  assert.ok(crate.every(a => !offered('plain', true).has(a)), 'no crate ability without its crate');
  assert.equal(sim.setGear('owner', 'moonlit', [crate[0], 'keen-edge', 'nothing', 7]), 'moonlit');
  const mine = offered('owner', true);
  assert.ok(mine.has(crate[0]), 'a crate ability its crate gave is offered'); assert.ok(!mine.has(crate[1]), 'not one it did not give');
  assert.ok(!offered('owner', false).has(crate[0]), 'never in the weekly run');
  assert.equal(sim.setGear('x', 'grave-feast', 'all'), null, 'an ability is no look'); assert.equal(sim.setGear('x', 'nope', null), null);
}

// ---- 5. The crate abilities on a body -------------------------------------------------------------------------------
{
  const sim = createSimulation({ seed: 5 }), g = name => sim.inspect().Game.update.constructor('return ' + name)();
  sim.addBot(); sim.start('arena', 'ostrey');
  const Player = g('Player'), PLAYER_DEF = g('PLAYER_DEF'), CONFIG = g('CONFIG'), ES = g('ES'), PS = g('PS'), BY = g('ABILITY_BY_ID');
  const hands = [...sim.inspect().bots.values()][0].body.ctl, e = sim.inspect().Game.enemies[0];
  const body = ids => { const p = new Player(PLAYER_DEF, e.x, e.z + e.radius + 0.6, Math.PI, e.y); p.ctl = hands; p.grantAbilities(ids); return p; };

  // Iron Mercy: a parry heals, then not again until its cooldown has run.
  const parryable = e.def.attacks.find(a => g('canParryAttack')(a)), mv = BY['iron-mercy'].levels[0];
  const parry = p => {
    e.yaw = 0; e.attack = parryable; e.hitIndex = 0; e.state = ES.WINDUP; e.stateTime = parryable.hits[0].startup - CONFIG.parry.lead * 0.5;
    p.setState(PS.PARRY); p.stateTime = 0;
    g('resolveCombat')({ player: p, enemies: [e], hitstop: 0 });
  };
  const mercy = body(['iron-mercy']); mercy.hp = 40;
  parry(mercy); near(mercy.hp, 40 + mercy.maxHp * mv.heal, 'Iron Mercy heals on a parry');
  const healed = mercy.hp; parry(mercy); near(mercy.hp, healed, 'Iron Mercy waits for its cooldown');
  g('abilityClocks')(mercy.perk, mv.cooldown + 0.01); parry(mercy); near(mercy.hp, healed + mercy.maxHp * mv.heal, 'Iron Mercy again after its cooldown');
  const plain = body([]); plain.hp = 40; parry(plain); assert.equal(plain.hp, 40, 'no heal without it');

  // Grave Feast: an execution heals.
  const feast = (ids) => {
    const p = body(ids); p.hp = 30; e.hp = e.def.hp; e.setState(ES.BROKEN);
    const X = g('execution'); X.start(p, e);
    for (let t = 0; t < 4 && !p.exec?.impact; t += 1 / 60) X.update(p, 1 / 60);
    assert.ok(p.exec?.impact, 'the execution lands');
    return p.hp;
  };
  near(feast(['grave-feast']), 30 + PLAYER_DEF.stats.maxHp * BY['grave-feast'].levels[0].heal, 'Grave Feast heals on an execution');
  assert.equal(feast([]), 30, 'no heal without it');
}
console.log('crates: ok');
