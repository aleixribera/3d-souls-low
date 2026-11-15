#!/usr/bin/env node
'use strict';
// The loop's view of the recorded runs (PLAN.md "replays", .claude/iterate.md "Feedback"). Reads the replay door's
// feedback on the home server (127.0.0.1:3082 there, over ssh), appends Aleix's new notes to .claude/feedback.md (each
// once, by note id) and prints a digest of the runs finished in the last days: who fell to what, which boss attacks
// land most, picks and time per fight.
//   node tools/replays.cjs [--days 7] [--dry]
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const args = process.argv.slice(2);
const days = Number(args[args.indexOf('--days') + 1]) || 7, dry = args.includes('--dry');
const since = Date.now() - days * 86400000;
const FEEDBACK = path.join(__dirname, '..', '.claude', 'feedback.md');

let body;
try {
  body = execFileSync('ssh', ['homelab', `curl -s --max-time 10 'http://127.0.0.1:3082/api/runs/feedback?since=${since}'`], { encoding: 'utf8', timeout: 30000 });
} catch (e) { console.error('The home server did not answer: ' + e.message.split('\n')[0]); process.exit(1); }
const { notes = [], summaries = [] } = JSON.parse(body);
const clock = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const day = ms => new Date(ms).toISOString().slice(0, 10);

const file = fs.readFileSync(FEEDBACK, 'utf8');
const fresh = notes.filter(n => !file.includes(`(replay note ${n.id})`));
if (fresh.length) {
  const text = fresh.map(n => `\n- ${day(n.at)}, replay note (${n.version || 'unknown version'}, ${n.players.join(', ') || 'bots'}): ${n.text.replace(/\s+/g, ' ')}\n  At ${clock(n.t)} in run ${n.run}: /watch?run=${n.run}#t=${n.t} (replay note ${n.id})`).join('');
  if (!dry) fs.writeFileSync(FEEDBACK, file.replace(/\s*$/, '') + '\n' + text + '\n');
}
console.log(`${fresh.length} new note${fresh.length === 1 ? '' : 's'}${dry ? ' (dry run, not written)' : fresh.length ? ' added to .claude/feedback.md' : ''}.`);

console.log(`\n${summaries.length} run${summaries.length === 1 ? '' : 's'} in the last ${days} days.`);
const attacks = {}, killers = {};
for (const s of summaries) {
  console.log(`\n${day(s.startedAt)} ${s.version || ''} ${s.outcome} at fight ${s.reached}, ${clock(s.duration || 0)}: ${s.players.join(', ')}`);
  for (const f of s.fights || []) console.log(`  fight ${f.fight} ${f.bosses.join(' + ')}${f.crowned ? ' (crowned)' : ''}: ${f.time === null ? '?' : clock(f.time)}${f.won ? '' : ', lost'}`);
  for (const p of s.players || []) {
    if (p.bot) continue;
    const by = p.downedBy.map(d => `${d.attack} x${d.count}`).join(', ');
    console.log(`  ${p.name}: ${p.downs} downs, ${p.deaths} deaths${by ? ` (by ${by})` : ''}${p.picks.length ? `; picked ${p.picks.join(', ')}` : ''}`);
    for (const d of p.downedBy) killers[d.attack] = (killers[d.attack] || 0) + d.count;
  }
  for (const a of s.attacks || []) attacks[a.attack] = (attacks[a.attack] || 0) + a.count;
}
const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} x${n}`).join(', ');
if (summaries.length) console.log(`\nAttacks that land most: ${top(attacks) || 'none'}\nAttacks that down players most: ${top(killers) || 'none'}`);
