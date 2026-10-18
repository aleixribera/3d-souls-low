// First-launch regression fixtures. No browser or extra packages required:
// node tests/autoquality.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');

function launch({ gpu, cores = 8, memory = 8, saved = null, recheck = false, frames = null }) {
  let stored = JSON.stringify(saved || {}), benchmarks = 0, saves = 0;
  const settings = { graphics: saved?.graphics || 'high' };
  const context = vm.createContext({
    navigator: { hardwareConcurrency: cores, deviceMemory: memory, maxTouchPoints: 0 },
    screen: { width: 1920, height: 1080 }, window: { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1 },
    renderer: { getContext: () => ({ getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 1 }), getParameter: () => gpu }) },
    qualityBenchmark: { measure(preset) { benchmarks++; if (frames && preset in frames) return { ms: frames[preset], width: 1280, height: 720, frames: 20 }; throw new Error('Simulated unavailable timing'); } },
    settings, SETTINGS_KEY: 'settings', localStorage: { getItem: () => stored },
    saveSettings() { saves++; stored = JSON.stringify(settings); },
  });
  for (const file of ['js/config.js', 'js/autoquality.js'])
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  const first = vm.runInContext('autoQuality.firstRun()', context);
  const effective = vm.runInContext('autoQuality.effective()', context);
  // A second application must reuse the result, with no extra benchmark or settings write.
  vm.runInContext('autoQuality.effective(); autoQuality.firstRun()', context);
  if (settings.graphics === 'auto') {
    const before = vm.runInContext('autoQuality.result()', context);
    assert.ok(before && before.checkedAt > 0, 'saved Auto exposes the current check');
    if (recheck) {
      const after = vm.runInContext('autoQuality.recheck()', context);
      assert.notEqual(before, after, 'explicit check replaces the in-page cached result');
    }
  }
  return { first, effective, benchmarks, saves, saved: JSON.parse(stored).graphics };
}

const cases = [
  ['fast desktop with limited browser hints', { gpu: 'NVIDIA GeForce RTX 5060', cores: 4, memory: 4, frames: { ultra: 6 } }, { first: 'ultra', effective: 'ultra', benchmarks: 1, saves: 1, saved: 'auto' }],
  ['fast masked adapter', { gpu: 'WebKit WebGL', cores: 4, memory: 4, frames: { ultra: 6 } }, { first: 'ultra', effective: 'ultra', benchmarks: 1, saves: 1, saved: 'auto' }],
  ['measured High fallback', { gpu: 'NVIDIA RTX 5060', frames: { ultra: 24, high: 8 } }, { first: 'high', effective: 'high', benchmarks: 2, saves: 1, saved: 'auto' }],
  ['both presets over budget', { gpu: 'NVIDIA RTX 5060', frames: { ultra: 24, high: 25 } }, { first: 'low', effective: 'low', benchmarks: 2, saves: 1, saved: 'auto' }],
  ['fresh UHD laptop', { gpu: 'Intel(R) UHD Graphics 620' }, { first: 'low', effective: 'low', benchmarks: 0, saves: 1, saved: 'auto' }],
  ['existing Auto laptop', { gpu: 'Intel(R) UHD Graphics 620', saved: { graphics: 'auto' } }, { first: null, effective: 'low', benchmarks: 0, saves: 0, saved: 'auto' }],
  ['masked GPU with limited hints', { gpu: 'WebKit WebGL', cores: 4, memory: 4 }, { first: 'low', effective: 'low', benchmarks: 2, saves: 1, saved: 'auto' }],
  ['modern integrated failed timing', { gpu: 'Intel Iris Xe Graphics', memory: 4 }, { first: 'low', effective: 'low', benchmarks: 1, saves: 1, saved: 'auto' }],
  ['explicit recheck', { gpu: 'NVIDIA GeForce RTX 5060', recheck: true }, { first: 'low', effective: 'low', benchmarks: 4, saves: 1, saved: 'auto' }],
  ['failed timing', { gpu: 'NVIDIA GeForce RTX 5060' }, { first: 'low', effective: 'low', benchmarks: 2, saves: 1, saved: 'auto' }],
];
for (const graphics of ['low', 'high', 'ultra']) cases.push([
  `manual ${graphics}`, { gpu: 'Intel UHD Graphics 620', saved: { graphics } },
  { first: null, effective: graphics, benchmarks: 0, saves: 0, saved: graphics },
]);
for (const [label, input, expected] of cases) assert.deepEqual(launch(input), expected, label);
const version = fs.readFileSync(path.join(root, 'js/config.js'), 'utf8').match(/const VERSION = 'v([^']+)'/)[1];
const stamp = fs.readFileSync(path.join(root, 'combat-arena-3d.html'), 'utf8').match(/const LOAD_STAMP = '([^']+)'/)[1];
assert.equal(stamp, version, 'script cache key must match the release version');
console.log(`${cases.length}/${cases.length} first-launch fixtures passed`);
