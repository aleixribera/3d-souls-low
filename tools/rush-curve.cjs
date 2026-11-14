'use strict';
// Boss Rush's difficulty, measured alone with the test bot as the person stand-in (pass 54, PLAN.md track B item 10).
//   node tools/rush-curve.cjs bosses [trials] [fight]   each boss alone at the pace of `fight` fights won (default 0, 1x)
//   node tools/rush-curve.cjs runs [runs]                whole Endless runs (sim.calling: its draw, pairs and modifiers), fight n
//                                                        at the curve's pace for n - 1 won, a fresh body each fight (as Boss
//                                                        Rush), until the first fall; prints the fight reached. MODS=0: no modifiers
//   node tools/rush-curve.cjs pairs [trials] [fight]     two different random bosses at once, as Endless's pairs, at the pace of
//                                                        `fight` fights won; ENDLESS='{"pairRest":0.4}' merges into CONFIG.endless
// One body, its bot brain playing the person (no allied bot, item 9). A fight ends at a win, a fall or `LIMIT` s (a loss).
// No abilities unless KIT (below): the no-ability target. ONLY=a,b limits the bosses (bosses mode). JOBS=n splits the work over n child processes, each at
// idle priority. CURVE='{"rise":0.3}' merges into CONFIG.pace, to try a curve without editing js/config.js.
// ABILITIES='{"posture":0.7}' merges into CONFIG.abilities.
// DUMP=file (runs mode) writes each run's fights (number, time, win, breaks, par, might) as JSON.
// BY=1 adds the damage taken by what dealt it, and the last blow of each fall (BY=2: by blow of a string).
// SLOW='{"oswin":[1.2,1.1,0.8,0.2]}' scales a boss's idle gaps (every `cooldown`), recoveries and follow-up chances, and adds
// seconds to the beat between the blows of each string (every hit's `follow` but the last), to try a
// pace before writing it into the boss's own data. PATCH='{"varn":{"lastToll":{"chance":0.1,"beat":0.3,"hold":0.5},
// "phase:knell":{"cooldown":[2,3.6]}}}' sets one attack's fields (beat: added to its string's beats; hold: every hold's
// chance) or one phase's.
const { createSimulation } = require('../server/headless.cjs');
const { fork } = require('child_process');
const os = require('os');
try { os.setPriority(0, os.constants.priority.PRIORITY_LOW); } catch (e) { /* not allowed: run as is */ }

const mode = process.argv[2] || 'bosses', count = Number(process.argv[3] || (mode === 'runs' ? 12 : 6)), fightArg = Number(process.argv[4] || 0);
const LIMIT = Number(process.env.LIMIT || 400);
const curve = process.env.CURVE ? JSON.parse(process.env.CURVE) : null;
const slow = process.env.SLOW ? JSON.parse(process.env.SLOW) : {};
const patch = process.env.PATCH ? JSON.parse(process.env.PATCH) : {};
// The stand-in's skill: SKILLED=1 is the skilled player of PLAN.md item 10's curve targets, the bot mistiming a quarter
// as many rolls as its moods say (BOT_MOODS slip, 0.3 to 0.5: a decent friend new to the genre, the default).
const skill = process.env.SKILLED ? 0.25 : 1;
// KIT (pass 56): the abilities held, the first the free pick before fight 1 (a common, CONFIG.abilities.first, pass 73),
// then one picked after each fight won, in this order: fight n holds the first n. KIT=strong is item 10's "rare, great
// kit": a lucky run's best picks, two legendaries the bot can use (Time Rift on its dodges, Blood Moon when low) among
// health, damage and healing. KIT=max (pass 73, item 11's check) is the strongest kit the rules allow for the stagger
// meter: two legendaries that strike as the bot fights (Gale Crescent, Storm King) and the posture abilities. Or a list
// of ability ids. No KIT: no abilities.
const KITS = {
  max: ['breaker', 'gale-crescent', 'breaker', 'static-edge', 'gale-crescent', 'breaker', 'opportunist', 'storm-king', 'keen-edge',
    'breaker', 'static-edge', 'storm-king', 'iron-blood', 'opportunist', 'keen-edge', 'static-edge', 'iron-blood', 'opportunist',
    'keen-edge', 'ash-lancer', 'iron-blood', 'ash-lancer', 'keen-edge', 'iron-blood', 'ash-lancer', 'bloodthirst', 'bloodthirst',
    'bloodthirst', 'deep-lungs', 'deep-lungs', 'deep-lungs'],
  strong: ['keen-edge', 'iron-blood', 'keen-edge', 'time-rift', 'bloodthirst', 'iron-blood', 'keen-edge', 'long-shadow', 'time-rift',
    'iron-blood', 'bloodthirst', 'keen-edge', 'blood-moon', 'long-shadow', 'iron-blood', 'keen-edge', 'bloodthirst',
    'quick-draught', 'opportunist', 'blood-moon', 'long-shadow', 'quick-draught', 'opportunist', 'vengeance', 'vengeance',
    'opportunist', 'vengeance', 'quick-draught', 'quick-draught', 'deep-lungs', 'deep-lungs'],
};
const kitList = process.env.KIT ? KITS[process.env.KIT] || process.env.KIT.split(',') : [];
const probe = createSimulation();
if (curve) Object.assign(global(probe, 'CONFIG').pace, curve);   // the printed pace follows CURVE too
if (process.env.ENDLESS) Object.assign(global(probe, 'CONFIG').endless, JSON.parse(process.env.ENDLESS));
const ALL = probe.catalog().bosses.map(b => b.id);
const only = process.env.ONLY ? process.env.ONLY.split(',') : ALL;

function global(sim, name) { return sim.inspect().Game.update.constructor('return ' + name)(); }
function setup(sim) {
  if (curve) Object.assign(global(sim, 'CONFIG').pace, curve);
  if (process.env.ENDLESS) Object.assign(global(sim, 'CONFIG').endless, JSON.parse(process.env.ENDLESS));
  if (process.env.ABILITIES) Object.assign(global(sim, 'CONFIG').abilities, JSON.parse(process.env.ABILITIES));
  if (skill !== 1) for (const m of Object.values(global(sim, 'BOT_MOODS'))) m.slip *= skill;
  const byId = global(sim, 'ENEMY_BY_ID');
  for (const [id, [cd, rec, fu, beat = 0]] of Object.entries(slow)) {
    const d = byId[id]; if (!d) throw new Error('SLOW: no boss ' + id);
    const gap = c => c && [+(c[0] * cd).toFixed(2), +(c[1] * cd).toFixed(2)];
    d.cooldown = gap(d.cooldown);
    for (const p of Object.values(d.phases || {})) if (p.cooldown) p.cooldown = gap(p.cooldown);
    for (const a of d.attacks) {
      if (a.recovery !== undefined) a.recovery = +(a.recovery * rec).toFixed(2);
      for (const f of a.followUps || []) if (f.chance < 1) f.chance = Math.min(0.95, +(f.chance * fu).toFixed(2));
      if (beat) a.hits.slice(0, -1).forEach(h => { h.follow = +((h.follow || 0) + beat).toFixed(2); });   // a string's beat between blows
    }
  }
  for (const [id, parts] of Object.entries(patch)) {
    const d = byId[id]; if (!d) throw new Error('PATCH: no boss ' + id);
    for (const [key, set] of Object.entries(parts)) {
      if (key.startsWith('phase:')) { Object.assign(d.phases[key.slice(6)], set); continue; }
      const a = d.attacks.find(x => x.id === key); if (!a) throw new Error(`PATCH: ${id} has no attack ${key}`);
      const { beat = 0, hold, ...rest } = set;
      Object.assign(a, rest);
      if (beat) a.hits.slice(0, -1).forEach(h => { h.follow = +((h.follow || 0) + beat).toFixed(2); });
      if (hold !== undefined) a.hits.forEach(h => { if (h.hold) h.hold.chance = hold; });
    }
  }
}
// One fight alone: { result: 'win' | 'loss', time, taken }. `partners`: bosses fought with it; `mods`: Endless modifiers.
function fight(boss, won, seed, partners = [], mods = []) {
  const sim = createSimulation({ seed, maxBots: 1 }); setup(sim); sim.addBot();
  sim.start('arena', boss, partners); sim.setPlayers([]);
  sim.setRushFight(won, mods);
  const { Game, players } = sim.inspect(), body = players[0];
  delete body.botId;   // the person stand-in
  const kit = kitList.slice(0, won + 1);   // the free pick and one a fight won
  if (kit.length) sim.giveAbilities(body.id, kit);
  const ES = global(sim, 'ES'), bosses = Game.enemies.filter(e => e.isBoss()), was = bosses.map(e => e.state);
  let time = 0, taken = 0, prev = body.hp, result = 'loss', blow = null, last = null, breaks = 0;   // last: what dealt the last damage (BY)
  const by = {};   // BY=1: the damage taken by what dealt it (an attack's id, or 'other' for fire, seams and the like)
  if (process.env.BY) global(sim, 'events').on('strike', d => { if (d.target === body) blow = (d.attacker && d.attacker.attack && d.attacker.attack.id + (process.env.BY === '2' ? '#' + d.attacker.hitIndex + (d.attacker.state === 'recover' || d.attacker.state === 'chase' ? d.attacker.state : '') : '')) || 'blow'; });
  for (; time < LIMIT; time += 1 / 60) {
    sim.setPlayers([]); blow = null; sim.tick(1 / 60);
    bosses.forEach((e, i) => { if (e.state === ES.BROKEN && was[i] !== ES.BROKEN) breaks++; was[i] = e.state; });   // posture breaks
    if (body.hp < prev) { taken += prev - body.hp; const k = blow || 'other'; by[k] = (by[k] || 0) + prev - body.hp; last = k; }
    prev = body.hp;
    if (Game.enemies.every(e => !e.alive())) { result = 'win'; break; }
    if (sim.botsDown()) break;
  }
  const might = global(sim, 'kitMight')(kit), par = global(sim, 'rushPar')(won, 1 + partners.length, might);
  return { result, time, taken, by, last: result === 'win' ? null : last, breaks, par, might };
}
function work(job) {
  if (job.mode === 'bosses') {
    return job.bosses.map(([boss, from, to]) => {
      const r = { boss, wins: 0, time: 0, winTime: 0, taken: 0, fights: 0, by: {}, fell: {}, breaks: 0, swift: 0 };
      for (let t = from; t < to; t++) {
        const f = fight(boss, job.won, Number(process.env.SEED || 1000) + t);
        r.fights++; r.time += f.time; r.taken += f.taken; r.breaks += f.breaks; if (f.result === 'win' && f.time <= f.par) r.swift++;
        for (const [k, v] of Object.entries(f.by)) r.by[k] = (r.by[k] || 0) + v;
        if (f.result === 'win') { r.wins++; r.winTime += f.time; } else if (f.last) r.fell[f.last] = (r.fell[f.last] || 0) + 1;
      }
      return r;
    });
  }
  if (job.mode === 'pairs') {
    const r = { boss: 'pairs', wins: 0, time: 0, winTime: 0, taken: 0, fights: 0, by: {}, fell: {} };
    for (const t of job.trials) {
      let s = (777 + t * 7919) >>> 0; const rnd = () => { s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x6d2b79f5 >>> 0; return s / 4294967296; };
      const a = only[Math.floor(rnd() * only.length)], rest = only.filter(b => b !== a), b = rest[Math.floor(rnd() * rest.length)];
      const f = fight(a, job.won, 9000 + t, [b]);
      r.fights++; r.time += f.time; r.taken += f.taken;
      if (f.result === 'win') { r.wins++; r.winTime += f.time; } else r.fell[a + '+' + b] = (r.fell[a + '+' + b] || 0) + 1;
    }
    return [r];
  }
  // Runs: each an Endless run of its own seed, drawn as the server draws it. `fights`: each fight's number, time,
  // result, posture breaks and par.
  return job.runs.map(n => {
    const run = { seed: (5000 + n * 7919) >>> 0 }, fights = [];
    for (let won = 0; ; won++) {
      const g = probe.calling(run, won), mods = process.env.MODS === '0' ? [] : g.modifiers;
      const f = fight(g.boss, won, 9000 + n * 101 + won, g.partners, mods);
      fights.push({ number: won + 1, time: f.time, win: f.result === 'win', breaks: f.breaks, par: f.par, might: f.might, bosses: 1 + g.partners.length });
      if (f.result !== 'win' || won >= 40) return { run: n, reached: won + 1, fell: f.result !== 'win' ? [g.boss, ...g.partners].join('+') : null, pace: probe.inspect().Game.update.constructor('return rushPace')()(won), fights };
    }
  });
}
if (process.env.RUSH_CHILD) {
  process.on('message', job => { process.send(work(job)); process.exit(0); });
} else {
  const jobs = Math.max(1, Number(process.env.JOBS || 1));
  // Bosses: each boss's fights in slices of at most 8, so one boss alone spreads over every job too.
  const slices = [];
  if (mode === 'bosses') for (const b of only) for (let t = 0; t < count; t += 8) slices.push([b, t, Math.min(count, t + 8)]);
  const items = mode === 'bosses' ? slices : Array.from({ length: count }, (_, i) => i);   // runs, or pairs' trials
  const parts = Array.from({ length: jobs }, (_, j) => items.filter((_, i) => i % jobs === j)).filter(p => p.length);
  const job = p => mode === 'bosses' ? { mode, bosses: p, count, won: fightArg } : mode === 'pairs' ? { mode, trials: p, won: fightArg } : { mode, runs: p };
  Promise.all(parts.map(p => new Promise((res, rej) => {
    const child = fork(__filename, process.argv.slice(2), { env: { ...process.env, RUSH_CHILD: '1' } });
    child.on('message', res); child.on('error', rej); child.send(job(p));
  }))).then(out => {
    let rows = out.flat();
    if (mode === 'pairs') {
      const m = rows.reduce((t, r) => { for (const k of ['wins', 'time', 'winTime', 'taken', 'fights']) t[k] += r[k]; Object.assign(t.fell, r.fell); return t; }, { wins: 0, time: 0, winTime: 0, taken: 0, fights: 0, fell: {} });
      console.log(`# pairs alone, ${count} fights at the pace for ${fightArg} won, pairRest ${global(probe, 'CONFIG').endless.pairRest}${process.env.ENDLESS ? ' (ENDLESS ' + process.env.ENDLESS + ')' : ''}, ${skill === 1 ? 'the default bot' : 'SKILLED'}`);
      console.log(`pairs  wins ${m.wins}/${m.fights}  falls ${((m.fights - m.wins) / m.fights).toFixed(2)}  time ${(m.time / m.fights).toFixed(0)}s  win time ${m.wins ? (m.winTime / m.wins).toFixed(0) + 's' : '-'}  taken ${(m.taken / m.fights).toFixed(0)}`);
    } else if (mode === 'bosses') {
      const merged = new Map();   // a boss's slices back into one row
      for (const r of rows) {
        const m = merged.get(r.boss);
        if (!m) { merged.set(r.boss, r); continue; }
        for (const k of ['wins', 'time', 'winTime', 'taken', 'fights', 'breaks', 'swift']) m[k] += r[k];
        for (const [k, v] of Object.entries(r.by)) m.by[k] = (m.by[k] || 0) + v;
        for (const [k, v] of Object.entries(r.fell)) m.fell[k] = (m.fell[k] || 0) + v;
      }
      rows = [...merged.values()];
      rows.sort((a, b) => ALL.indexOf(a.boss) - ALL.indexOf(b.boss));
      console.log(`# alone, ${count} fights each at the pace for ${fightArg} won (x${probe.inspect().Game.update.constructor('return rushPace')()(fightArg).toFixed(2)}), ${kitList.length ? `KIT ${process.env.KIT} (the first ${fightArg})` : 'no abilities'}, ${skill === 1 ? 'the default bot' : 'SKILLED'}`);
      let w = 0, n = 0;
      for (const r of rows) {
        w += r.wins; n += r.fights;
        console.log(`${r.boss.padEnd(14)} wins ${r.wins}/${r.fights}  falls ${((r.fights - r.wins) / r.fights).toFixed(2)}  time ${(r.time / r.fights).toFixed(0)}s  win time ${r.wins ? (r.winTime / r.wins).toFixed(0) + 's' : '-'}  taken ${(r.taken / r.fights).toFixed(0)}  swift ${r.swift}  s/break ${r.breaks ? (r.time / r.breaks).toFixed(0) : '-'}` +
          (process.env.BY ? '  by ' + Object.entries(r.by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / r.fights).toFixed(0)}`).join(', ') +
            '  last blow ' + Object.entries(r.fell).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') : ''));
      }
      console.log(`TOTAL          wins ${w}/${n}  falls ${((n - w) / n).toFixed(2)}`);
    } else {
      rows.sort((a, b) => a.run - b.run);
      if (process.env.DUMP) require('fs').writeFileSync(process.env.DUMP, JSON.stringify(rows));   // each run's fights, to study offline
      for (const r of rows) console.log(`run ${r.run}  reached fight ${r.reached}  (x${r.pace.toFixed(2)})  fell to ${r.fell || '-'}`);
      const reached = rows.map(r => r.reached).sort((a, b) => a - b);
      console.log(`reached: median ${reached[Math.floor(reached.length / 2)]}  mean ${(reached.reduce((a, b) => a + b, 0) / reached.length).toFixed(1)}  range ${reached[0]}-${reached[reached.length - 1]}  ` +
        `share past 10 ${(reached.filter(n => n > 10).length / reached.length).toFixed(2)}, 15 ${(reached.filter(n => n > 15).length / reached.length).toFixed(2)}, 20 ${(reached.filter(n => n > 20).length / reached.length).toFixed(2)}`);
      // PLAN.md item 11's stages: each one's fights, falls, win time, swift kills and seconds between posture breaks.
      const all = rows.flatMap(r => r.fights);
      for (const [from, to] of [[1, 4], [5, 10], [11, 15], [16, 20], [21, 99]]) {
        const f = all.filter(x => x.number >= from && x.number <= to), won = f.filter(x => x.win);
        if (!f.length) continue;
        const t = f.reduce((n, x) => n + x.time, 0), b = f.reduce((n, x) => n + x.breaks, 0);
        console.log(`fights ${String(from).padStart(2)}-${String(to).padEnd(2)}  ${String(f.length).padStart(3)} fought  falls ${((f.length - won.length) / f.length).toFixed(2)}  win time ${won.length ? (won.reduce((n, x) => n + x.time, 0) / won.length).toFixed(0) + 's' : '-'}` +
          `  par ${(f.reduce((n, x) => n + x.par, 0) / f.length).toFixed(0)}s  swift ${won.length ? (won.filter(x => x.time <= x.par).length / won.length).toFixed(2) : '-'}  s/break ${b ? (t / b).toFixed(0) : '-'}`);
      }
    }
  });
}
