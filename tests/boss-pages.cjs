'use strict';
// The boss creation system's one-page designs (pass 123, docs/bosses/system.md step 1): every boss with a page,
// docs/bosses/<file>.md beside js/data/bosses/<file>.js, names every attack of its data on that page (by the attack's
// `name`), and the page keeps the system's headings. A boss built through the system can't grow a move its page lacks.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { root } = require('../server/headless.cjs');

const html = fs.readFileSync(path.join(root, 'combat-arena-3d.html'), 'utf8');
const files = [...html.match(/const GAME_FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+\.js)'/g)].map(m => m[1]);
const V = vm.createContext(vm.constants.DONT_CONTEXTIFY);
const engine = new Set(['config.js', 'net-protocol.js', 'helpers.js', 'terrain.js', 'states.js', 'registries.js', 'events.js', 'world.js', 'character.js', 'player.js', 'enemy.js', 'crowd.js', 'combat.js', 'finisher.js', 'abilities.js', 'bot-navigation.js', 'bot.js', 'companions.js', 'game.js', 'game-menus.js', 'game-view.js', 'game-level.js', 'attack-anim.js']);
Object.assign(V, { console, performance, THREE: { Vector3: class { constructor() { this.x = this.y = this.z = 0; } } }, THREE_ADDONS: {}, Rig: class { dispose() {} },
  location: { hash: '' }, window: { addEventListener() {} }, projectiles: { fire() {} }, bindLabel: () => '' });
const before = new Set();
const pages = fs.readdirSync(path.join(root, 'docs', 'bosses')).filter(f => f.endsWith('.md') && f !== 'system.md');
assert.ok(pages.length >= 2, 'the Pillager Captain and a second boss have pages');
const byFile = {};
for (const f of files.filter(f => engine.has(f) || f.startsWith('data/') || f.startsWith('levels/'))) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), V, { filename: f });
  const defs = vm.runInContext('typeof ENEMY_DEFS === "undefined" ? [] : ENEMY_DEFS', V);
  byFile[f] = defs.filter(d => !before.has(d)); for (const d of defs) before.add(d);
}
for (const page of pages) {
  const stem = page.slice(0, -3), file = `data/bosses/${stem}.js`;
  assert.ok(byFile[file], `${page}: js/${file} is in GAME_FILES`);
  const text = fs.readFileSync(path.join(root, 'docs', 'bosses', page), 'utf8');
  for (const h of ['## Idea', '## Silhouette', '## Moveset', '## Signature moments', '## Phase two', '## Effects', '## Animation'])
    assert.ok(text.includes(h), `${page}: has the heading "${h}"`);
  const bosses = byFile[file].filter(d => d.attacks && d.phases);
  assert.ok(bosses.length, `${page}: js/${file} defines a boss`);
  for (const d of bosses) for (const a of d.attacks)
    assert.ok(text.includes(a.name), `${page}: names ${d.id}'s attack "${a.name}" (${a.id})`);
}
console.log(`boss pages: ${pages.join(', ')} name every attack in their data`);
