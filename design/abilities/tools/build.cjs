// Checks the pool (tools/pool.cjs) against the game's rules and writes pool.json beside the specs.
// Run: node design/abilities/tools/build.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const { POOL } = require('./pool.cjs');

const TEXT_MAX = { words: 9, chars: 56 }; // js/validate.js ABILITY_TEXT_MAX
const LEVELS = { common: 4, rare: 3, legendary: 1, story: 1 };
const KEYS = ['strike', 'guard', 'summon', 'ultimate'];
const errors = [];
const ids = new Set();
for (const a of POOL) {
  const where = a.id;
  if (ids.has(a.id)) errors.push(`${where}: duplicate id`);
  ids.add(a.id);
  const words = a.text.replace(/\{\w+\}/g, 'n').trim().split(/\s+/).length;
  if (words > TEXT_MAX.words) errors.push(`${where}: card text has ${words} words (max ${TEXT_MAX.words})`);
  if (a.text.length > TEXT_MAX.chars) errors.push(`${where}: card text has ${a.text.length} chars (max ${TEXT_MAX.chars})`);
  for (const m of a.text.matchAll(/\{(\w+)\}/g)) {
    if (!a.levels.every((l) => m[1] in l)) errors.push(`${where}: {${m[1]}} missing from a level`);
  }
  if (a.levels.length !== LEVELS[a.rarity]) errors.push(`${where}: ${a.levels.length} levels, ${a.rarity} needs ${LEVELS[a.rarity]}`);
  if (a.key) {
    if (!KEYS.includes(a.key)) errors.push(`${where}: unknown key ${a.key}`);
    if (a.when !== 'press') errors.push(`${where}: a key ability fires on press`);
    if (!a.levels.every((l) => l.charge > 0)) errors.push(`${where}: a key ability needs a charge on every level`);
    if (a.key === 'ultimate' && !['legendary', 'story'].includes(a.rarity)) errors.push(`${where}: the Ultimate key is legendary`);
    if (a.key !== 'ultimate' && a.rarity === 'common') errors.push(`${where}: keys 1-3 are rare or better`);
  }
  for (const l of a.levels) for (const k of ['below', 'heal', 'drain', 'share', 'cut', 'mark']) {
    if (k in l && !(l[k] > 0 && l[k] <= 1)) errors.push(`${where}: ${k} must be a share in (0, 1]`);
  }
  if (!a.idea || !a.look || !a.img) errors.push(`${where}: idea, look and img are required`);
}

const real = POOL.filter((a) => a.rarity !== 'story');
const count = (f) => real.filter(f).length;
const commons = real.filter((a) => a.rarity === 'common');
const plain = commons.filter((a) => a.plain).length;
if (plain * 3 > commons.length) errors.push(`plain stat commons ${plain} over a third of ${commons.length}`);
for (const k of KEYS) if (count((a) => a.key === k) < 12) errors.push(`key ${k}: fewer than 12`);
if (count((a) => a.summon) < 8) errors.push('fewer than 8 summons');

const stats = {
  total: real.length,
  story: POOL.length - real.length,
  rarity: { common: commons.length, rare: count((a) => a.rarity === 'rare'), legendary: count((a) => a.rarity === 'legendary') },
  keys: Object.fromEntries(KEYS.map((k) => [k, count((a) => a.key === k)])),
  triggered: count((a) => !a.key),
  summons: count((a) => a.summon),
  plainCommons: plain,
  origin: { kept: count((a) => a.from), new: count((a) => !a.from) },
};
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const out = path.join(__dirname, '..', 'pool.json');
fs.writeFileSync(out, JSON.stringify({ stats, pool: POOL }, null, 1) + '\n');
console.log(JSON.stringify(stats, null, 1));
