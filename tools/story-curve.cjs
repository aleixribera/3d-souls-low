'use strict';
// Story's climb (pass 79, PLAN.md track A item 5), measured with the test bot as a friend new to the genre.
//   node tools/story-curve.cjs [trials]   each chapter's boss fight alone, in the arena, as strong as its chapter of the
//                                         road (roadMight) and with the flasks of one who found every flask so far
//                                         (roadFlasks); prints wins, falls and fight times per chapter.
// The stand-in is the default bot (BOT_MOODS' slips: a decent friend new to the genre), its body the person (no allied bot,
// no abilities). A fight ends at a win, a fall or LIMIT s (a loss). BASE=1: every boss as written (1x, 4 flasks), the
// road off, for a before-and-after. ROAD='{"bosses":{"pace":[0.75,1]}}' merges into CONFIG.story.road to try a climb.
// ONLY=giant,varn limits the bosses (by the first boss's id). JOBS=n splits the work over n child processes (idle priority).
// The boss fight is its level's last zone with a boss in it; a pair (Saltgrave's castellans) is fought together.
const { createSimulation } = require('../server/headless.cjs');
const { fork } = require('child_process');
const os = require('os');
try { os.setPriority(0, os.constants.priority.PRIORITY_LOW); } catch (e) { /* not allowed: run as is */ }

const trials = Number(process.argv[2] || 8), LIMIT = Number(process.env.LIMIT || 400), base = !!process.env.BASE;
const road = process.env.ROAD ? JSON.parse(process.env.ROAD) : null;
const global = (sim, name) => sim.inspect().Game.update.constructor('return ' + name)();
function setup(sim) {
  if (road) for (const [who, set] of Object.entries(road)) Object.assign(global(sim, 'CONFIG').story.road[who], set);
}
const probe = createSimulation(); setup(probe);
// Each chapter with a boss fight: [chapter number, level id, boss ids].
const chapters = global(probe, 'STORY').chapters.map((c, i) => {
  const L = global(probe, 'ALL_LEVELS').find(l => l.id === c.level), byId = global(probe, 'ENEMY_BY_ID'), isBoss = global(probe, 'isBossDef');
  const zones = (L.gated || []).map(z => (z.enemies || [{ enemy: z.enemy, boss: z.boss }]).filter(m => m.boss || isBoss(byId[m.enemy])).map(m => m.enemy)).filter(b => b.length);
  return [i + 1, c.level, zones.length ? zones[zones.length - 1] : null];
}).filter(c => c[2]).filter(c => !process.env.ONLY || process.env.ONLY.split(',').includes(c[2][0]));

function fight(level, bosses, seed) {
  const sim = createSimulation({ seed, maxBots: 1 }); setup(sim); sim.addBot();
  sim.start('arena', bosses[0], bosses.slice(1)); sim.setPlayers([]);
  const { Game, players } = sim.inspect(), body = players[0];
  delete body.botId;   // the person stand-in
  const flasks = base ? null : global(sim, 'roadFlasks')(level, true), it = body.inventory.flask;
  if (flasks) it.max = it.count = flasks;
  if (!base) for (const e of Game.enemies) e.setMight(global(sim, 'roadMight')(level, e.isBoss()));
  let time = 0, result = 'loss', drunk = 0, was = it.count;
  for (; time < LIMIT; time += 1 / 60) {
    sim.setPlayers([]); sim.tick(1 / 60);
    if (it.count < was) drunk += was - it.count;
    was = it.count;
    if (Game.enemies.every(e => !e.alive())) { result = 'win'; break; }
    if (sim.botsDown()) break;
  }
  return { result, time, drunk, flasks: it.max, pace: Game.enemies[0].pace, hp: Game.enemies.reduce((n, e) => n + e.def.hp, 0) };
}
function work(job) {
  return job.map(([n, level, bosses, from, to]) => {
    const r = { n, level, boss: bosses.join('+'), wins: 0, fights: 0, time: 0, winTime: 0, drunk: 0, flasks: 0, pace: 0, hp: 0 };
    for (let t = from; t < to; t++) {
      const f = fight(level, bosses, Number(process.env.SEED || 2000) + n * 97 + t);
      r.fights++; r.time += f.time; r.drunk += f.drunk; r.flasks = f.flasks; r.pace = f.pace; r.hp = f.hp;
      if (f.result === 'win') { r.wins++; r.winTime += f.time; }
    }
    return r;
  });
}
if (process.env.STORY_CHILD) {
  process.on('message', job => { process.send(work(job)); process.exit(0); });
} else {
  const slices = [];
  for (const [n, level, bosses] of chapters) for (let t = 0; t < trials; t += 4) slices.push([n, level, bosses, t, Math.min(trials, t + 4)]);
  const jobs = Math.max(1, Number(process.env.JOBS || 1));
  const parts = Array.from({ length: jobs }, (_, j) => slices.filter((_, i) => i % jobs === j)).filter(p => p.length);
  Promise.all(parts.map(p => new Promise((res, rej) => {
    const child = fork(__filename, process.argv.slice(2), { env: { ...process.env, STORY_CHILD: '1' } });
    child.on('message', res); child.on('error', rej); child.send(p);
  }))).then(out => {
    const merged = new Map();
    for (const r of out.flat()) {
      const m = merged.get(r.n);
      if (!m) { merged.set(r.n, r); continue; }
      for (const k of ['wins', 'fights', 'time', 'winTime', 'drunk']) m[k] += r[k];
    }
    const rows = [...merged.values()].sort((a, b) => a.n - b.n);
    console.log(`# Story's bosses alone, ${trials} fights each, the default bot (a friend new to the genre), ${base ? 'as written (BASE: 1x, 4 flasks)' : 'as strong as their chapter'}${road ? ' ROAD ' + process.env.ROAD : ''}`);
    let w = 0, n = 0;
    for (const r of rows) {
      w += r.wins; n += r.fights;
      console.log(`${String(r.n).padStart(2)} ${r.boss.padEnd(18)} wins ${String(r.wins).padStart(2)}/${r.fights}  ${(r.wins / r.fights * 100).toFixed(0).padStart(3)}%  pace ${r.pace.toFixed(2)}  hp ${r.hp}  flasks ${r.flasks}  drunk ${(r.drunk / r.fights).toFixed(1)}  time ${(r.time / r.fights).toFixed(0)}s  win time ${r.wins ? (r.winTime / r.wins).toFixed(0) + 's' : '-'}`);
    }
    console.log(`TOTAL wins ${w}/${n} (${(w / n * 100).toFixed(0)}%)`);
  });
}
