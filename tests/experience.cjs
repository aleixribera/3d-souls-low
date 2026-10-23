'use strict';
// Persistence and input recovery fixtures. No browser or additional packages required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function options(raw, denied = false) {
  const context = vm.createContext({
    CONFIG: { input: { buffer: 0.2 }, VISUALS: { defaultQuality: 'high', quality: { low: {}, high: {}, ultra: {} } } },
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    localStorage: { getItem() { if (denied) throw new Error('Storage denied'); return raw; } },
    performance: { now: () => 1000 }, events: { emit() {} },
  });
  vm.runInContext(source('js/input.js'), context);
  return { context, settings: plain(vm.runInContext('settings', context)) };
}
const defaults = options(null).settings;
assert.equal(defaults.volume, 5);
assert.equal(options('{"volume":8}').settings.volume, 5, 'the former volume of 8 is lowered to 5');
assert.equal(options('{"volume":3}').settings.volume, 3, 'other saved volume choices remain intact');
assert.ok(!('hitboxes' in defaults) && !('fps' in defaults) && !('screenShake' in defaults));
for (const raw of ['null', '[]', '9', '"text"', '{broken']) assert.deepEqual(options(raw).settings, defaults);
assert.deepEqual(options(null, true).settings, defaults, 'refused storage keeps usable defaults');
const corrupt = options(JSON.stringify({ sensitivity: 'fast', hudScale: null, volume: {}, invert: 'false',
  fps: 1, hitboxes: [], graphics: 'constructor', cameraMotion: null, screenShake: 'off', unknown: 'ignored' })).settings;
assert.deepEqual(corrupt, defaults, 'incorrect types and unknown keys cannot poison options');
const saved = options(JSON.stringify({ sensitivity: 99, hudScale: 0.01, volume: -5, invert: true,
  graphics: 'ultra', cameraMotion: false, screenShake: false, fps: true, hitboxes: true })).settings;
assert.deepEqual(saved, { ...defaults, sensitivity: 10, hudScale: 0.7, volume: 0, invert: true,
  graphics: 'ultra', cameraMotion: false });
for (const cameraMotion of [true, false]) for (const screenShake of [true, false]) {
  assert.equal(options(JSON.stringify({ cameraMotion, screenShake })).settings.cameraMotion, cameraMotion && screenShake,
    'either disabled legacy camera effect keeps the combined setting off');
}
assert.equal(options('{"screenShake":false}').settings.cameraMotion, false);
assert.deepEqual(options('{"fps":false,"hitboxes":false}').settings, defaults, 'retired visibility preferences are ignored');
assert.equal(options('{"sensitivity":1e999,"volume":1e999,"hudScale":1e999}').settings.volume, defaults.volume);
assert.equal(options('{"hudScale":1.26}').settings.hudScale, 1.3);

const { context } = options(null);
vm.runInContext(`
  const Game = { mode: 'play' };
  CONFIG.gamepad = { deadzone: 0.2 };
  const navigator = {};
`, context);
vm.runInContext(source('js/gamepad.js'), context);
vm.runInContext(`
  input.down('PadRB'); gamepad.down.add('PadRB');
  gamepad.move = { x: 1, y: 0 }; gamepad.menuDir = 'down'; gamepad.flickArmed = false;
  input.suspended = true;
  gamepad.read = () => { throw new Error('A suspended page must not poll the controller'); };
  gamepad.poll(1 / 60);
`, context);
assert.deepEqual(plain(vm.runInContext('[...input.held]', context)), []);
assert.deepEqual(plain(vm.runInContext('gamepad.move', context)), { x: 0, y: 0 });
assert.equal(vm.runInContext('gamepad.menuDir', context), null);
assert.equal(vm.runInContext('gamepad.flickArmed', context), true);

const valid = { v: 1, level: 'hall', bonfire: null, spawn: null, cleared: [], shortcuts: [], traps: [], seen: [], bosses: [],
  progress: { inventory: { flask: { max: 4 } }, futureField: { preserved: true } }, completed: false, savedAt: 100 };
let stored = JSON.stringify(valid), refuseWrite = false;
const notices = [];
const campaignContext = vm.createContext({
  CONFIG: { story: { saveVersion: 1, saveKeys: { test: 'save' } } },
  ALL_LEVELS: [{ id: 'hall', bonfires: [] }], PLAYER_DEF: { inventory: [] }, ITEMS: { flask: {} },
  localStorage: { getItem: () => stored, setItem(k, v) { if (refuseWrite) throw new Error('Quota exceeded'); stored = v; } },
  events: { emit: type => notices.push(type) },
  Game: { story: true, kind: 'level', level: { id: 'hall' }, player: { inventory: {} }, cleared: new Set(), zones: [], isTutorial: () => false },
  world: { gates: [], traps: [] }, finale: { seenSightings: () => [] },
});
const storySource = source('js/story.js');
vm.runInContext(storySource.slice(0, storySource.indexOf('// The facade')), campaignContext);
const campaign = vm.runInContext("makeCampaign({ id: 'test', chapters: [{ level: 'hall' }], progress: {} })", campaignContext);
assert.equal(campaign.status, 'ok');
assert.equal(campaign.data.progress.futureField.preserved, true, 'unknown progress stays intact');
for (const mutate of [
  d => { d.progress = []; }, d => { d.progress.inventory = []; },
  ...[null, [], {}, { max: '4' }, { max: -1 }, { max: 1.5 }, { max: Number.MAX_SAFE_INTEGER + 1 }]
    .map(value => d => { d.progress.inventory.flask = value; }),
  d => { d.completed = 'false'; }, d => { d.savedAt = null; }, d => { d.savedAt = -1; },
]) {
  const broken = structuredClone(valid); mutate(broken); stored = JSON.stringify(broken); campaign.load();
  assert.equal(campaign.status, 'broken', `malformed checkpoint rejected: ${stored}`);
}
stored = JSON.stringify(valid); campaign.load();
refuseWrite = true;
assert.equal(campaign.save(), false);
assert.equal(campaign.save(), false);
assert.deepEqual(notices, ['saveFailed'], 'save failures announce once until storage recovers');
assert.equal(campaign.storageOk, false);
refuseWrite = false; assert.equal(campaign.save(), true);
refuseWrite = true; campaign.save();
assert.deepEqual(notices, ['saveFailed', 'saveFailed'], 'a new failure after recovery is announced');
console.log('Experience: settings recovery, controller suspension, checkpoint validation and save failure feedback passed.');
