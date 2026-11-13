'use strict';
// Three-bot boss fights with behaviour counts (pass 29): node tools/bot-fights.cjs [boss|story|all] [trials] [maxSeconds]
// `story` is the story's 13 boss fights (Hale and Harrow as one pair: `hale+harrow`); `all` every catalog boss.
// Per boss: wins, avg fight time, damage the party took, bot falls per fight, seconds each bot stayed alive, damage
// the bots dealt per fight (and per second a bot was alive), falls per ten bot-minutes, rolls per bot-minute, roll chains (3+ rolls each within 1.2 s of the last), swings started
// while the boss was mid-string, and hits taken while swinging.
// JSON=path writes the per-boss rows. MOODS=1 prints each bot's per-fight choices (if the brain exposes them).
// PERSON=1 (pass 35): the first of the three stands in for a person (its body has no botId, so the other two treat it
// as one; it still plays with a bot's brain). Adds the person's share of the damage, who executed, and what the two
// bots left to the person (executions, openings), how long they stood behind a boss that was after someone else and
// how often they drew it off a hurt ally (the brain's tally, where it keeps one).
const { createSimulation } = require('../server/headless.cjs');
const fs = require('fs');
const which = process.argv[2] || 'all', trials = Number(process.argv[3] || 6), limit = Number(process.argv[4] || 600);
const probe = createSimulation();
const STORY = ['pillagerCaptain', 'bellWarden', 'giant', 'varn', 'antlered', 'ostrey', 'hale+harrow', 'ringer', 'hollis', 'oswin', 'agathe', 'kindlingTree', 'kingsBlade'];
const bosses = which === 'all' ? probe.catalog().bosses.map(b => b.id) : which === 'story' ? STORY : which.split(',');
const rows = [];
const person = !!process.env.PERSON;
const zero = () => ({ fights: 0, wins: 0, time: 0, dmg: 0, dealt: 0, rolls: 0, botMin: 0, chains: 0, swingsIn: 0, hitSwinging: 0, fell: 0,
  personDealt: 0, execPerson: 0, execBots: 0, yielded: 0, offered: 0, backup: 0, drew: 0 });
const tot = zero();
const extra = row => `  executions ${person ? `person ${row.execPerson} bots ${row.execBots}` : row.execBots}  left to a person: ${row.yielded} executions ${row.offered} openings  behind a boss on someone else ${(row.backup / Math.max(1e-9, row.botMin * (person ? 2 / 3 : 1))).toFixed(1)} s a bot-min  drew ${row.drew}` +
  (person ? `  person's share of damage ${(100 * row.personDealt / Math.max(1, row.dealt)).toFixed(0)}%` : '');
for (const boss of bosses) {
  const r = { boss, ...zero() };
  const [first, ...partners] = boss.split('+');
  for (let t = 0; t < trials; t++) {
    const sim = createSimulation({ seed: 1000 + t }); for (let i = 0; i < 3; i++) sim.addBot();
    sim.start('arena', first, partners); sim.setPlayers([]);
    const { Game, bots } = sim.inspect(); const bodies = sim.inspect().players, brains = [...bots.values()];
    if (person) delete bodies[0].botId;
    const aids = person ? brains.slice(1) : brains;
    const prevHp = bodies.map(b => b.hp), prevState = bodies.map(b => b.state), lastHurt = bodies.map(() => -9), rollAt = bodies.map(() => []), chainLen = bodies.map(() => 0);
    let time = 0, result = 'timeout';
    for (; time < limit; time += 1 / 60) {
      sim.setPlayers([]); sim.tick(1 / 60);
      const boss = Game.enemies.find(e => e.alive());
      bodies.forEach((b, i) => {
        if (b.alive()) r.botMin += 1 / 3600;
        if (b.hp < prevHp[i]) { r.dmg += prevHp[i] - b.hp; if (time - lastHurt[i] > 0.25 && (b.state === 'attack' || prevState[i] === 'attack')) r.hitSwinging++; lastHurt[i] = time; }
        if (b.state === 'execute' && prevState[i] !== 'execute') { if (person && i === 0) r.execPerson++; else r.execBots++; }
        if (b.state === 'roll' && prevState[i] !== 'roll') {
          r.rolls++;
          const last = rollAt[i][rollAt[i].length - 1];
          chainLen[i] = last !== undefined && time - last < 1.2 ? chainLen[i] + 1 : 1;
          if (chainLen[i] === 3) r.chains++;
          rollAt[i].push(time);
        }
        if (b.state === 'attack' && prevState[i] !== 'attack' && boss && (boss.state === 'windup' || boss.state === 'active') && boss.attack && !boss.attack.projectile) {
          const more = boss.hitIndex < boss.attack.hits.length - 1 || (boss.attack.followUps || []).some(f => f.chance > 0);
          if (more) r.swingsIn++;
        }
        prevHp[i] = b.hp; prevState[i] = b.state;
      });
      if (Game.enemies.every(e => !e.alive())) { result = 'win'; break; }
      if (sim.botsDown()) { result = 'loss'; break; }
    }
    r.fights++; r.time += time; if (result === 'win') r.wins++;
    r.fell += bodies.filter(b => !b.alive()).length;
    r.dealt += sim.fightTally().filter(row => row.bot).reduce((sum, row) => sum + row.damage, 0);
    if (person) r.personDealt += sim.fightTally().filter(row => row.id === bodies[0].id).reduce((sum, row) => sum + row.damage, 0);
    for (const b of aids) { const t = b.brain.tally || {}; for (const k of ['yielded', 'offered', 'backup', 'drew']) r[k] += t[k] || 0; }
    if (process.env.MOODS) for (const b of bots.values()) if (b.brain.mood) console.log(`  ${boss} seed ${1000 + t} ${b.name}: ${b.brain.describe()}`);
  }
  for (const k of Object.keys(tot)) tot[k] += r[k];
  rows.push(r);
  console.log(`${boss.padEnd(16)} wins ${r.wins}/${r.fights}  time ${(r.time / r.fights).toFixed(0)}s  dmg ${(r.dmg / r.fights).toFixed(0)}  fell ${(r.fell / r.fights).toFixed(1)}  alive/bot ${(r.botMin * 60 / r.fights / 3).toFixed(0)}s  dealt ${(r.dealt / r.fights).toFixed(0)} (${(r.dealt / (r.botMin * 60)).toFixed(1)}/s a bot)  falls/10 bot-min ${(r.fell / r.botMin * 10).toFixed(2)}  rolls/bot-min ${(r.rolls / r.botMin).toFixed(1)}  chains ${r.chains}  swings into a string ${r.swingsIn}  hit mid-swing ${r.hitSwinging}` + extra(r));
}
console.log(`TOTAL            wins ${tot.wins}/${tot.fights}  time ${(tot.time / tot.fights).toFixed(0)}s  dmg ${(tot.dmg / tot.fights).toFixed(0)}  fell ${(tot.fell / tot.fights).toFixed(2)}  alive/bot ${(tot.botMin * 60 / tot.fights / 3).toFixed(0)}s  dealt ${(tot.dealt / tot.fights).toFixed(0)} (${(tot.dealt / (tot.botMin * 60)).toFixed(1)}/s a bot)  falls/10 bot-min ${(tot.fell / tot.botMin * 10).toFixed(2)}  bot deaths ${tot.fell}  rolls/bot-min ${(tot.rolls / tot.botMin).toFixed(1)}  chains ${tot.chains}  swings into a string ${tot.swingsIn}  hit mid-swing ${tot.hitSwinging}` + extra(tot));
if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify({ rows, tot }, null, 1));
