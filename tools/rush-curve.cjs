'use strict';
// Boss Rush's difficulty, measured alone with the test bot as the person stand-in (pass 54, PLAN.md track B item 10).
//   node tools/rush-curve.cjs bosses [trials] [fight]   each boss alone at the pace of `fight` fights won (default 0, 1x)
//   node tools/rush-curve.cjs runs [runs]                whole runs: fight n at the curve's pace for n - 1 won, a fresh body
//                                                        each fight (as Boss Rush), until the first fall; prints the fight reached
// One body, its bot brain playing the person (no allied bot, item 9). A fight ends at a win, a fall or `LIMIT` s (a loss).
// No blessings: the no-ability target. ONLY=a,b limits the bosses. JOBS=n splits the work over n child processes, each at
// idle priority. CURVE='{"rise":0.3}' merges into CONFIG.pace, to try a curve without editing js/config.js.
// SLOW='{"oswin":[1.2,1.1,0.8,0.2]}' scales a boss's idle gaps (every `cooldown`), recoveries and follow-up chances, and adds
// seconds to the beat between the blows of each string (every hit's `follow` but the last), to try a
// pace before writing it into the boss's own data.
const { createSimulation } = require('../server/headless.cjs');
const { fork } = require('child_process');
const os = require('os');
try { os.setPriority(0, os.constants.priority.PRIORITY_LOW); } catch (e) { /* not allowed: run as is */ }

const mode = process.argv[2] || 'bosses', count = Number(process.argv[3] || (mode === 'runs' ? 12 : 6)), fightArg = Number(process.argv[4] || 0);
const LIMIT = Number(process.env.LIMIT || 400);
const curve = process.env.CURVE ? JSON.parse(process.env.CURVE) : null;
const slow = process.env.SLOW ? JSON.parse(process.env.SLOW) : {};
// The stand-in's skill: SKILLED=1 is the skilled player of PLAN.md item 10's curve targets, the bot mistiming a quarter
// as many rolls as its moods say (BOT_MOODS slip, 0.3 to 0.5: a decent friend new to the genre, the default).
const skill = process.env.SKILLED ? 0.25 : 1;
const probe = createSimulation();
if (curve) Object.assign(global(probe, 'CONFIG').pace, curve);   // the printed pace follows CURVE too
const ALL = probe.catalog().bosses.map(b => b.id);
const only = process.env.ONLY ? process.env.ONLY.split(',') : ALL;

function global(sim, name) { return sim.inspect().Game.update.constructor('return ' + name)(); }
function setup(sim) {
  if (curve) Object.assign(global(sim, 'CONFIG').pace, curve);
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
}
// One fight alone: { result: 'win' | 'loss', time, taken }.
function fight(boss, won, seed) {
  const sim = createSimulation({ seed, maxBots: 1 }); setup(sim); sim.addBot();
  sim.start('arena', boss, []); sim.setPlayers([]);
  sim.setRushFight(won);
  const { Game, players } = sim.inspect(), body = players[0];
  delete body.botId;   // the person stand-in
  let time = 0, taken = 0, prev = body.hp, result = 'loss', blow = null;
  const by = {};   // BY=1: the damage taken by what dealt it (an attack's id, or 'other' for fire, seams and the like)
  if (process.env.BY) global(sim, 'events').on('strike', d => { if (d.target === body) blow = (d.attacker && d.attacker.attack && d.attacker.attack.id + (process.env.BY === '2' ? '#' + d.attacker.hitIndex + (d.attacker.state === 'recover' || d.attacker.state === 'chase' ? d.attacker.state : '') : '')) || 'blow'; });
  for (; time < LIMIT; time += 1 / 60) {
    sim.setPlayers([]); blow = null; sim.tick(1 / 60);
    if (body.hp < prev) { taken += prev - body.hp; const k = blow || 'other'; by[k] = (by[k] || 0) + prev - body.hp; }
    prev = body.hp;
    if (Game.enemies.every(e => !e.alive())) { result = 'win'; break; }
    if (sim.botsDown()) break;
  }
  return { result, time, taken, by };
}
function work(job) {
  if (job.mode === 'bosses') {
    return job.bosses.map(boss => {
      const r = { boss, wins: 0, time: 0, winTime: 0, taken: 0, fights: 0, by: {} };
      for (let t = 0; t < job.count; t++) {
        const f = fight(boss, job.won, Number(process.env.SEED || 1000) + t);
        r.fights++; r.time += f.time; r.taken += f.taken;
        for (const [k, v] of Object.entries(f.by)) r.by[k] = (r.by[k] || 0) + v;
        if (f.result === 'win') { r.wins++; r.winTime += f.time; }
      }
      return r;
    });
  }
  // Runs: each its own shuffled order of every boss, round again once all are fought (Endless isn't built yet).
  return job.runs.map(n => {
    let s = (5000 + n * 7919) >>> 0; const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const order = [];
    for (let won = 0; ; won++) {
      if (!order.length) { const ids = [...only]; for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } order.push(...ids); }
      const boss = order.shift(), f = fight(boss, won, 9000 + n * 101 + won);
      if (f.result !== 'win' || won >= 40) return { run: n, reached: won + 1, fell: f.result !== 'win' ? boss : null, pace: probe.inspect().Game.update.constructor('return rushPace')()(won) };
    }
  });
}
if (process.env.RUSH_CHILD) {
  process.on('message', job => { process.send(work(job)); process.exit(0); });
} else {
  const jobs = Math.max(1, Number(process.env.JOBS || 1));
  const items = mode === 'bosses' ? only : Array.from({ length: count }, (_, i) => i);
  const parts = Array.from({ length: jobs }, (_, j) => items.filter((_, i) => i % jobs === j)).filter(p => p.length);
  const job = p => mode === 'bosses' ? { mode, bosses: p, count, won: fightArg } : { mode, runs: p };
  Promise.all(parts.map(p => new Promise((res, rej) => {
    const child = fork(__filename, process.argv.slice(2), { env: { ...process.env, RUSH_CHILD: '1' } });
    child.on('message', res); child.on('error', rej); child.send(job(p));
  }))).then(out => {
    const rows = out.flat();
    if (mode === 'bosses') {
      rows.sort((a, b) => ALL.indexOf(a.boss) - ALL.indexOf(b.boss));
      console.log(`# alone, ${count} fights each at the pace for ${fightArg} won (x${probe.inspect().Game.update.constructor('return rushPace')()(fightArg).toFixed(2)}), no abilities, ${skill === 1 ? 'the default bot' : 'SKILLED'}`);
      let w = 0, n = 0;
      for (const r of rows) {
        w += r.wins; n += r.fights;
        console.log(`${r.boss.padEnd(14)} wins ${r.wins}/${r.fights}  falls ${((r.fights - r.wins) / r.fights).toFixed(2)}  time ${(r.time / r.fights).toFixed(0)}s  win time ${r.wins ? (r.winTime / r.wins).toFixed(0) + 's' : '-'}  taken ${(r.taken / r.fights).toFixed(0)}` +
          (process.env.BY ? '  by ' + Object.entries(r.by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / r.fights).toFixed(0)}`).join(', ') : ''));
      }
      console.log(`TOTAL          wins ${w}/${n}  falls ${((n - w) / n).toFixed(2)}`);
    } else {
      rows.sort((a, b) => a.run - b.run);
      for (const r of rows) console.log(`run ${r.run}  reached fight ${r.reached}  (x${r.pace.toFixed(2)})  fell to ${r.fell || '-'}`);
      const reached = rows.map(r => r.reached).sort((a, b) => a - b);
      console.log(`reached: median ${reached[Math.floor(reached.length / 2)]}  mean ${(reached.reduce((a, b) => a + b, 0) / reached.length).toFixed(1)}  range ${reached[0]}-${reached[reached.length - 1]}`);
    }
  });
}
