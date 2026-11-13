'use strict';
// Load the game's classic scripts in their browser order. Combat/terrain are shared;
// the server never creates WebGL, textures, audio or a browser.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'combat-arena-3d.html'), 'utf8');
const files = [...html.match(/const GAME_FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+\.js)'/g)].map(m => m[1]);
const engine = new Set(['config.js', 'net-protocol.js', 'helpers.js', 'terrain.js', 'states.js', 'registries.js', 'events.js', 'world.js', 'character.js', 'player.js', 'enemy.js', 'crowd.js', 'combat.js', 'execution.js', 'abilities.js', 'bot-navigation.js', 'bot.js', 'companions.js', 'game.js', 'game-menus.js', 'game-view.js', 'game-level.js', 'attack-anim.js']);
const scripts = files.filter(f => engine.has(f) || f.startsWith('data/') || f.startsWith('levels/'));
// Ignore text/visual-only definitions in the compatibility fingerprint? No: clients and
// server must run exactly the same release, including every level and balance edit.
const hash = crypto.createHash('sha256');
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(root, 'js', f)));
const build = hash.digest('hex').slice(0, 24);

class Vector3 { constructor() { this.x = this.y = this.z = 0; } }
class Rig { dispose() {} }
// The data check runs once per process, on the first simulation: the same validateData the browser runs at load,
// without its drawing half (models, looks, stage builders). Broken data stops the server with the readable list.
let validated = false;
function validate(context) {
  if (validated) return;
  vm.runInContext(fs.readFileSync(path.join(root, 'js', 'validate.js'), 'utf8'), context, { filename: 'validate.js' });
  const errors = vm.runInContext('validateData({ visual: false })', context);
  if (errors.length) throw new Error(`Game data check failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  validated = true;
}
// `seed` (tests): a seeded Math.random inside this simulation, so bot fights replay the same way. `maxBots` (tools):
// more bots than the lobby allows, for a four-body party of bots.
function createSimulation({ seed, maxBots } = {}) {
  // An ordinary isolated VM global avoids Node's contextified-property proxy
  // on every shared helper call in terrain, collision and AI hot loops.
  const context = vm.createContext(vm.constants.DONT_CONTEXTIFY);
  Object.assign(context, {
    console, performance, THREE: { Vector3 }, THREE_ADDONS: {}, Rig,
    location: { hash: '' }, window: { addEventListener() {} },
    projectiles: { fire() {} },
    bindLabel: () => '',   // lesson cards name keys; the server never shows them
    SIM_MAX_BOTS: Number.isInteger(maxBots) ? maxBots : null,
  });
  // Keep hot numeric operations in the VM's lexical scope. Repeated built-in
  // lookups through a contextified global are much slower than normal scripts.
  vm.runInContext('const Math = globalThis.Math, Number = globalThis.Number;', context);
  if (Number.isInteger(seed)) vm.runInContext(`{ let s = ${seed} >>> 0; Math.random = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }`, context);
  for (const file of scripts) vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context, { filename: file });
  validate(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'simulation.js'), 'utf8'), context, { filename: 'server/simulation.js' });
  return context.host;
}
module.exports = { createSimulation, build, root };
