'use strict';
// Check current checkpoint definitions without loading or changing game content.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.env.STORY_CHECKPOINT_ROOT || path.join(__dirname, '..'));
const source = fs.readFileSync(path.join(root, 'js/story.js'), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));
const checkpoint = { id: 'fire', x: 80, z: 12, y: 6, spawn: { x: 78, y: 6, z: 11, yaw: 1 } };
const valid = { v: 1, level: 'hall', bonfire: 'fire', spawn: { x: 22, z: 3, yaw: 0 },
  cleared: ['enemy@old'], shortcuts: ['shortcut'], zones: ['won'], traps: ['trap'], seen: ['scene'], bosses: ['boss'], finds: ['flask'],
  progress: { inventory: { flask: { max: 7 } }, futureField: { preserved: true } }, completed: false, savedAt: 10 };
function fixture(save = valid, bonfires = [checkpoint]) {
  let stored = typeof save === 'string' ? save : JSON.stringify(save), campaign, seen = [], holes = 0;
  const level = { id: 'hall', start: { x: 4, y: 2, z: -1, yaw: 0.5 }, bonfires: structuredClone(bonfires) };
  const world = { gates: [{ id: 'shortcut', opensFrom: 'east', open: false }], traps: [{ id: 'trap', state: 'set' }], openHole() { holes++; } };
  const Game = { story: false, kind: 'level', cleared: new Set(), zones: [], enemies: [],
    startLevel() {
      this.level = level; this.spawn = { ...level.start }; this.cleared = new Set();
      this.zones = [{ id: 'won', members: [], actors: [], gate: { open: false } }];
      this.spawnPlayer(); campaign.onLevelStart();
    },
    spawnPlayer() { this.player = { inventory: { flask: { max: 4, count: 4 } } }; campaign.applyProgress(this.player); },
    respawnEnemies() {}, showMenu(name) { this.menu = name; },
  };
  const context = vm.createContext({
    CONFIG: { story: { saveVersion: 1, saveKeys: { test: 'save' } }, rest: { respawnOffset: 1.2 } },
    ALL_LEVELS: [level], PLAYER_DEF: { inventory: [] }, ITEMS: { flask: {} },
    roadFinds: () => [], roadFlasks: () => 4, roadGifts: () => [], ABILITY_BY_ID: {},
    localStorage: { getItem: () => stored, setItem: (key, value) => { stored = value; } },
    events: { emit() {} }, Game, world,
    clamp: (v, low, high) => Math.max(low, Math.min(high, v)),
    finale: { skipSightings(value) { seen = [...value]; }, seenSightings: () => seen },
  });
  vm.runInContext(source.slice(0, source.indexOf('// The facade')), context);
  campaign = vm.runInContext("makeCampaign({ id: 'test', chapters: [{ level: 'hall' }], progress: {} })", context);
  return { campaign, Game, world, level, saved: () => JSON.parse(stored), holes: () => holes };
}
const moved = fixture(), removed = fixture(valid, []);
if (process.argv.includes('--baseline')) {
  moved.campaign.resume();
  assert.deepEqual(plain(moved.Game.spawn), valid.spawn, 'old code reuses stale absolute coordinates');
  assert.equal(removed.campaign.status, 'broken', 'old code rejects valid progress when bonfire disappears');
  console.log('REPRODUCED: moved checkpoint uses old coordinates; removed checkpoint rejects the save');
} else {
  moved.campaign.resume();
  assert.deepEqual(plain(moved.Game.spawn), checkpoint.spawn);
  assert.deepEqual(moved.saved().spawn, checkpoint.spawn, 'resolved position persists for later resumes');
  for (const run of [moved, removed]) {
    if (run === removed) run.campaign.resume();
    assert.equal(run.campaign.status, 'ok');
    const saved = run.saved();
    for (const field of ['cleared', 'shortcuts', 'zones', 'traps', 'seen', 'bosses', 'finds', 'progress'])
      assert.deepEqual(saved[field], valid[field], `${field} survives checkpoint recovery`);
    assert.equal(run.Game.player.inventory.flask.max, 7);
    assert.equal(run.world.gates[0].open, true);
    assert.equal(run.Game.zones[0].gate.open, true);
    assert.equal(run.holes(), 1);
    assert.equal(saved.v, 1);
  }
  assert.deepEqual(plain(removed.Game.spawn), removed.level.start);
  assert.equal(removed.saved().bonfire, null);
  assert.equal(removed.saved().spawn, null);
  const noFire = fixture({ ...valid, bonfire: null }); noFire.campaign.resume();
  assert.deepEqual(plain(noFire.Game.spawn), noFire.level.start, 'chapter start uses its current definition');
  const hallFire = { id: 'fire', x: 80, z: 12 };
  const hall = fixture(valid, [hallFire]); hall.campaign.resume();
  assert.deepEqual(plain(hall.Game.spawn), { x: 78.8, z: 12, yaw: 0.5 }, 'hall checkpoint uses current position and approach from chapter start');
  const opposite = fixture({ ...valid, spawn: { x: 81.2, z: 12, yaw: 0.5 } }, [hallFire]); opposite.campaign.resume();
  assert.equal(opposite.Game.spawn.x, 81.2, 'an unchanged hall checkpoint preserves the saved valid side');
  const zero = fixture({ ...valid, spawn: null }); zero.campaign.resume();
  assert.deepEqual(plain(zero.Game.spawn), checkpoint.spawn, 'bonfire ID is authoritative even with no saved position');
  for (const patch of [
    { bonfire: 42 }, { bonfire: {} }, { bonfire: '' }, { spawn: { x: '1', z: 2, yaw: 0 } },
    { spawn: { x: 1, z: 2, yaw: null } }, { spawn: { x: 1, z: 2, yaw: 0, y: '2' } },
    { level: 'removed-level' }, { v: 0 }, { progress: [] }, { finds: [3] },
  ]) assert.equal(fixture({ ...valid, ...patch }, []).campaign.status, 'broken', JSON.stringify(patch));
  for (const raw of ['{bad', 'null', '[]']) assert.equal(fixture(raw).campaign.status, 'broken');
  console.log('PASS: moved/removed checkpoints, progress retained, hall offset, null spawn, malformed save rejection');
}
