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
// BOTS=n (pass 45): n bodies instead of three (1 to 4; with PERSON=1, one of them is the person stand-in). CLEAN=1:
// every body is kept at full health, so a fight is a clean run and its time is the boss's health over the party's
// damage (the solo base-health measure: BOTS=1 CLEAN=1). FIGHT=n: Boss Rush's pace for n fights won (CONFIG.pace).
const { createSimulation } = require('../server/headless.cjs');
const fs = require('fs');
const which = process.argv[2] || 'all', trials = Number(process.argv[3] || 6), limit = Number(process.argv[4] || 600);
const probe = createSimulation();
const STORY = ['pillagerCaptain', 'bellWarden', 'giant', 'varn', 'antlered', 'ostrey', 'hale+harrow', 'ringer', 'hollis', 'oswin', 'agathe', 'kindlingTree', 'kingsBlade'];
const bosses = which === 'all' ? probe.catalog().bosses.map(b => b.id) : which === 'story' ? STORY : which.split(',');
const rows = [];
const person = !!process.env.PERSON, clean = !!process.env.CLEAN, fight = Number(process.env.FIGHT || 0);
const count = Math.max(1, Math.min(4, Number(process.env.BOTS || 3)));
const zero = () => ({ fights: 0, wins: 0, time: 0, anyFell: 0, dmg: 0, dealt: 0, rolls: 0, botMin: 0, chains: 0, swingsIn: 0, hitSwinging: 0, fell: 0,
  personDealt: 0, execPerson: 0, execBots: 0, yielded: 0, offered: 0, backup: 0, drew: 0, waiting: 0, judged: 0, needless: 0, swings: 0 });
const tot = zero();
// Pass 38: swings = attacks a bot starts a bot-min (a chained combo once); waiting = s a bot-min spent free near the boss without swinging (the brain's tally); needless = the share of
// rolls at a melee blow whose real hitbox reached neither the spot the bot rolled from nor the bot itself (a tracking boss
// follows the roll); judged: rolls with a melee blow coming. An upper bound: a roll that took the bot out of a tracking
// blow's way can look needless too, and a roll at a bolt counts while a melee blow is also winding up.
const extra = row => `  swings ${(row.swings / Math.max(1e-9, row.botMin * (person ? (count - 1) / count : 1))).toFixed(1)} a bot-min  waiting ${(row.waiting / Math.max(1e-9, row.botMin * (person ? (count - 1) / count : 1))).toFixed(1)} s a bot-min  needless rolls ${row.needless}/${row.judged} (${(100 * row.needless / Math.max(1, row.judged)).toFixed(0)}%)  executions ${person ? `person ${row.execPerson} bots ${row.execBots}` : row.execBots}  left to a person: ${row.yielded} executions ${row.offered} openings  behind a boss on someone else ${(row.backup / Math.max(1e-9, row.botMin * (person ? (count - 1) / count : 1))).toFixed(1)} s a bot-min  drew ${row.drew}` +
  (person ? `  person's share of damage ${(100 * row.personDealt / Math.max(1, row.dealt)).toFixed(0)}%` : '');
for (const boss of bosses) {
  const r = { boss, ...zero() };
  const [first, ...partners] = boss.split('+');
  for (let t = 0; t < trials; t++) {
    const sim = createSimulation({ seed: 1000 + t, maxBots: count }); for (let i = 0; i < count; i++) sim.addBot();
    sim.start('arena', first, partners); sim.setPlayers([]);
    if (fight) sim.setRushFight(fight);
    const { Game, bots } = sim.inspect(); const bodies = sim.inspect().players, brains = [...bots.values()];
    if (person) delete bodies[0].botId;
    const aids = person ? brains.slice(1) : brains;
    const prevHp = bodies.map(b => b.hp), prevState = bodies.map(b => b.state), lastHurt = bodies.map(() => -9), rollAt = bodies.map(() => []), chainLen = bodies.map(() => 0);
    let time = 0, result = 'timeout';
    // A roll's verdict: { at, ghost (the body where it rolled from), watch: [{ e, attack }] }, settled once every blow
    // that was coming has ended (or after 4 s): needless if none of their hitboxes ever overlapped the ghost or the body.
    let pending = [];
    const blowing = e => e.alive() && e.attack && !e.attack.projectile && (e.state === 'windup' || e.state === 'active');
    for (; time < limit; time += 1 / 60) {
      sim.setPlayers([]); sim.tick(1 / 60);
      if (clean) for (const b of bodies) if (b.alive()) b.hp = b.maxHp;
      const boss = Game.enemies.find(e => e.alive());
      pending = pending.filter(p => {
        p.watch = p.watch.filter(w => w.e.attack === w.attack && blowing(w.e));
        const now = p.body.alive() && { x: p.body.x, y: p.body.y, z: p.body.z, radius: p.body.radius, height: p.body.height, grounded: p.body.grounded };
        if (p.watch.some(w => w.e.hitbox && (w.e.hitbox.overlaps(p.ghost) || now && w.e.hitbox.overlaps(now)))) { r.judged++; return false; }
        if (p.watch.length && time - p.at < 4) return true;
        r.judged++; r.needless++; return false;
      });
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
          const watch = Game.enemies.filter(blowing).map(e => ({ e, attack: e.attack }));
          if (watch.length && !(person && i === 0)) pending.push({ at: time, watch, body: b, ghost: { x: b.x, y: b.y, z: b.z, radius: b.radius, height: b.height, grounded: true } });
        }
        if (b.state === 'attack' && prevState[i] !== 'attack' && !(person && i === 0)) r.swings++;
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
    r.fell += bodies.filter(b => !b.alive()).length; if (bodies.some(b => !b.alive())) r.anyFell++;
    r.dealt += sim.fightTally().filter(row => row.bot).reduce((sum, row) => sum + row.damage, 0);
    if (person) r.personDealt += sim.fightTally().filter(row => row.id === bodies[0].id).reduce((sum, row) => sum + row.damage, 0);
    for (const b of aids) { const t = b.brain.tally || {}; for (const k of ['yielded', 'offered', 'backup', 'drew', 'waiting']) r[k] += t[k] || 0; }
    if (process.env.MOODS) for (const b of bots.values()) if (b.brain.mood) console.log(`  ${boss} seed ${1000 + t} ${b.name}: ${b.brain.describe()}`);
  }
  for (const k of Object.keys(tot)) tot[k] += r[k];
  rows.push(r);
  console.log(`${boss.padEnd(16)} wins ${r.wins}/${r.fights}  time ${(r.time / r.fights).toFixed(0)}s  dmg ${(r.dmg / r.fights).toFixed(0)}  fell ${(r.fell / r.fights).toFixed(1)} (a fall in ${(100 * r.anyFell / r.fights).toFixed(0)}%)  alive/bot ${(r.botMin * 60 / r.fights / count).toFixed(0)}s  dealt ${(r.dealt / r.fights).toFixed(0)} (${(r.dealt / (r.botMin * 60)).toFixed(1)}/s a bot)  falls/10 bot-min ${(r.fell / r.botMin * 10).toFixed(2)}  rolls/bot-min ${(r.rolls / r.botMin).toFixed(1)}  chains ${r.chains}  swings into a string ${r.swingsIn}  hit mid-swing ${r.hitSwinging}` + extra(r));
}
console.log(`TOTAL            wins ${tot.wins}/${tot.fights}  time ${(tot.time / tot.fights).toFixed(0)}s  dmg ${(tot.dmg / tot.fights).toFixed(0)}  fell ${(tot.fell / tot.fights).toFixed(2)} (a fall in ${(100 * tot.anyFell / tot.fights).toFixed(0)}%)  alive/bot ${(tot.botMin * 60 / tot.fights / count).toFixed(0)}s  dealt ${(tot.dealt / tot.fights).toFixed(0)} (${(tot.dealt / (tot.botMin * 60)).toFixed(1)}/s a bot)  falls/10 bot-min ${(tot.fell / tot.botMin * 10).toFixed(2)}  bot deaths ${tot.fell}  rolls/bot-min ${(tot.rolls / tot.botMin).toFixed(1)}  chains ${tot.chains}  swings into a string ${tot.swingsIn}  hit mid-swing ${tot.hitSwinging}` + extra(tot));
if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify({ rows, tot }, null, 1));
