'use strict';
// Friendly bot duels (v7.11): a lone bot against bosses in the headless server simulation.
// node tests/bot-duel.cjs [bossId|all] [trials] [maxSeconds] [profileId]
// MAX_IDLE bounds uninterrupted neutral lulls; MAX_RESOLVE bounds time until either victory or defeat.
const { createSimulation } = require('../server/headless.cjs');
const which = process.argv[2] || 'giant', trials = Number(process.argv[3] || 10), limit = Number(process.argv[4] || 600);
const probe = createSimulation();
const bosses = which === 'all' ? probe.catalog().bosses.map(b => b.id) : which.split(',');
const summary = [];
for (const boss of bosses) {
  let wins = 0, times = [], hpLeft = [], resolutions = [], damageTaken = [], why = {}, longestIdle = 0;
  for (let t = 0; t < trials; t++) {
    const sim = createSimulation(); sim.addBot(process.argv[5] || process.env.PROFILE); sim.start('arena', boss); sim.setPlayers([]);
    const { Game } = sim.inspect(); const body = sim.inspect().players[0];
    let taken = 0, previousHp = body.hp;
    let time = 0, idle = 0, health = body.hp + Game.enemies.reduce((sum, e) => sum + e.hp, 0), result = 'timeout';
    for (; time < limit; time += 1 / 60) {
      sim.setPlayers([]); sim.tick(1 / 60);
      taken += Math.max(0, previousHp - body.hp); previousHp = body.hp;
      const nextHealth = body.hp + Game.enemies.reduce((sum, e) => sum + e.hp, 0);
      const busy = body.isAttacking() || ['useItem', 'execute'].includes(body.state) || Game.enemies.some(e => e.alive() && (e.in('attacking') || e.invulnerable()));
      idle = busy || nextHealth !== health ? 0 : idle + 1 / 60; health = nextHealth;
      longestIdle = Math.max(longestIdle, idle);
      if (Game.enemies.every(e => !e.alive())) { result = 'win'; break; }
      if (sim.botsDown()) { result = 'loss'; break; }
    }
    const p = sim.inspect().players[0];
    why[result] = (why[result] || 0) + 1;
    resolutions.push(time); damageTaken.push(taken);
    if (result === 'win') { wins++; times.push(time); hpLeft.push(p.hp); }
    else if (process.env.VERBOSE) console.log(`  ${boss} #${t}: ${result} at ${time.toFixed(0)}s, boss hp ${Game.enemies.map(e => Math.round(e.hp)).join('/')}, flasks ${p.item('flask').count}`);
  }
  const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(0) : '-';
  const line = `${boss.padEnd(18)} ${wins}/${trials} wins  ${JSON.stringify(why)}  win avg ${avg(times)}s  resolve avg/max ${avg(resolutions)}/${Math.max(...resolutions).toFixed(0)}s  damage taken ${avg(damageTaken)}  hp left ${avg(hpLeft)}  longest lull ${longestIdle.toFixed(1)}s`;
  console.log(line); summary.push({ boss, wins, trials, results: why, resolutions, damageTaken, longestIdle });
  if (process.env.MAX_RESOLVE && Math.max(...resolutions) > Number(process.env.MAX_RESOLVE)) {
    console.error(`FAIL ${boss}: fight exceeded ${process.env.MAX_RESOLVE}s`); process.exitCode = 1;
  }
  if (process.env.MAX_IDLE && longestIdle > Number(process.env.MAX_IDLE)) {
    console.error(`FAIL ${boss}: ${longestIdle.toFixed(1)}s without an exchange`); process.exitCode = 1;
  }
}
if (process.env.REQUIRE) { const need = Number(process.env.REQUIRE); for (const s of summary) if (s.wins / s.trials < need) { console.error(`FAIL ${s.boss}`); process.exitCode = 1; } }
