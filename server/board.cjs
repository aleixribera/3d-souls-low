'use strict';
// The weekly run's board (PLAN.md track B item 8): this week's furthest runs and fastest kills, by the names the party
// played under. No accounts and nothing else: names, fights, bosses and seconds. Kept in one JSON file (BOARD_FILE, a
// mounted volume on the home server) so a restart or a container update keeps it; without a file it lives in memory.
// A new week starts an empty board. Every file access is wrapped: a board that cannot be read or written never stops
// the lobby.
const fs = require('node:fs');
const path = require('node:path');

const VERSION = 1, NAMES = 8, NAME = 24;
const whole = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
const cleanNames = list => Array.isArray(list) ? list.filter(n => typeof n === 'string' && n.trim()).slice(0, NAMES).map(n => n.slice(0, NAME)) : [];

// `size`: rows kept per list (C.weekly.board); `bosses`: the ids a kill may name; `weekOf()`: this week's key.
function createBoard({ file = null, size = 3, bosses = [], weekOf }) {
  const known = new Set(bosses);
  let board = { week: weekOf(), runs: [], kills: [] }, warned = false;
  const run = r => r && typeof r === 'object' && whole(r.reached, 1e4) && whole(r.beaten, 1e5) && whole(r.time, 1e7)
    ? { names: cleanNames(r.names), reached: r.reached, beaten: r.beaten, time: r.time } : null;
  const kill = k => k && typeof k === 'object' && known.has(k.boss) && whole(k.time, 1e6) ? { boss: k.boss, time: k.time, names: cleanNames(k.names) } : null;
  const sortRuns = list => list.sort((a, b) => b.reached - a.reached || b.beaten - a.beaten || a.time - b.time);
  const sortKills = list => list.sort((a, b) => a.time - b.time);
  if (file) try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (saved?.version === VERSION && saved.week === board.week) {
      board.runs = sortRuns((Array.isArray(saved.runs) ? saved.runs : []).map(run).filter(r => r && r.names.length)).slice(0, size);
      board.kills = sortKills((Array.isArray(saved.kills) ? saved.kills : []).map(kill).filter(k => k && k.names.length)).slice(0, size);
    }
  } catch (e) { if (e.code !== 'ENOENT') console.error('The weekly board could not be read; starting this week empty:', e.message); }
  function save() {
    if (!file) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(temp, JSON.stringify({ version: VERSION, ...board }));
      fs.renameSync(temp, file);   // whole or not at all
      warned = false;
    } catch (e) { if (!warned) console.error('The weekly board could not be saved; it is kept in memory:', e.message); warned = true; }
  }
  // This week's board; a new week clears it.
  function current() {
    const week = weekOf();
    if (board.week !== week) { board = { week, runs: [], kills: [] }; save(); }
    return board;
  }
  // A finished weekly run of `week`: the party's names, the fight it reached, bosses beaten, its time (s), and its won
  // fights ({ bosses, time }). A run of another week is not counted. A party keeps only its best run, and a boss only
  // its fastest kill (one boss alone; a pair is no fair time). Returns whether the board changed.
  function record(week, { names, reached, beaten, time, fights = [] }) {
    const b = current(), entry = run({ names, reached, beaten, time });
    if (week !== b.week || !entry || !entry.names.length) return false;
    const before = JSON.stringify(b), party = list => [...list].sort().join('\n'), key = party(entry.names);
    const mine = b.runs.find(r => party(r.names) === key);
    if (!mine) b.runs.push(entry);
    else if ((entry.reached - mine.reached || entry.beaten - mine.beaten || mine.time - entry.time) > 0) Object.assign(mine, entry);
    b.runs = sortRuns(b.runs).slice(0, size);
    for (const f of fights) {
      if (!Array.isArray(f.bosses) || f.bosses.length !== 1) continue;
      const k = kill({ boss: f.bosses[0], time: f.time, names: entry.names });
      if (!k) continue;
      const held = b.kills.find(x => x.boss === k.boss);
      if (!held) b.kills.push(k); else if (k.time < held.time) Object.assign(held, k);
    }
    b.kills = sortKills(b.kills).slice(0, size);
    if (JSON.stringify(b) === before) return false;
    save();
    return true;
  }
  return { current, record };
}
module.exports = { createBoard };
