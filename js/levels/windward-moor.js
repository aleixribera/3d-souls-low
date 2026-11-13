'use strict';
// Level 7: The Windward Moor (v7.38.0), chapter 7 of the Story (STORY.md; LORE.md 10c): Thrale's border, over the pass.
// Rough (PLAN.md stage 3, track A): built from the old second road's first level (removed in v7.53.0) as raw
// material, its layout kept, every name and character of that road gone. x runs east toward Thrale, z north.
//   The border shrine (y 0): the start, bonfire 1, Ysolde. Steps out onto the moor (y 0, open, long grass, ruined
//     shepherds' huts): a flock of Lantern Thralls walks it after its bearer; at its far side a barricade and its fight.
//   The road to the gorge, then the gorge itself (walls 14 m high): two thralls lie in its niches as if dead, and an old
//     gate-warden waits at the far end.
//   The gatefront ruins (y 0): bonfire 2 by the entrance, a warden, a knight and a second flock among the ruins; bowmen
//     on the old wall walk. The way on is the cliff stair.
//   The cliff road (y 8): six metres wide, a sheer drop to the south and no rail. Old Ostrey watches from the cliff top.
//   The bridge yard (y 8, bonfire 3), then the fog and the gate bridge: Old Ostrey, the Porter, in his gate.
const LEVEL_7 = {
  id: 'windward-moor', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  next: 'saltgrave',   // v7.40.0: on to Thrale's border fortress (chapter 8)
  name: 'Level 7: The Windward Moor',
  description: 'Over the pass, Thrale\'s border: a storm-held moor, a gorge, a cliff road with no rail and a gate bridge, still kept.',
  help: 'Level 7: win each fight to open the way on. The thralls are blind: their bearer sees for them. The cliff road has no rail: keep to its wall.',
  completeHint: 'The porter is fallen. Thrale\'s gate stands open…',
  wallHeight: 10, gateHeight: 3.4, gateThickness: 0.5, flasks: 6,
  // A slate storm over the moor: driving rain, wind in the grass, lightning far off; no sun.
  atmosphere: { background: 0x3e474e, fog: 0x4e585e, fogDensity: 0.012,
                moon: { color: 0xd0d8e4, intensity: 2.1, position: [-20, 30, 12] },
                ambient: { color: 0x56606a, intensity: 1.45 },
                hemi: { sky: 0xa4b0b8, ground: 0x30302a, intensity: 0.8 },
                exposure: 1.04, dust: 0.2, rim: 0xc0d0e0,
                grade: { shadowTint: [0.9, 0.97, 1.08], highlightTint: [1.02, 1.0, 0.96], saturation: 0.66 },
                surface: { moss: 0.9, grime: 1.0 }, banners: [0x3a4250, 0x4a4030], debris: 0.15,
                sky: { zenith: 0x2e3a44, sun: 0xc8ccd0, sunDir: [-0.55, 0.22, 0.6] }, silhouettes: 3, grass: 1,
                landmark: { x: 560, z: 0, y: -80, height: 360, width: 340 } },
  realm: {
    lightning: { every: [6, 13], color: 0xdce6ff },
    weather: [{ kind: 'rain', amount: 0.6 }, { kind: 'leaves', amount: 0.3, colors: [0x7a8460, 0x8a8260, 0x5a6448] }],
    grounds: [{ kind: 'earth', rooms: ['shrine-steps', 'moor', 'approach', 'gorge', 'niche-n', 'niche-s', 'gatefront', 'stair-foot', 'cliff-road'] }],
  },
  start: { x: 4, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'shrine', rect: [0, 18, -9, 9], open: true, height: 9, floor: 0x3c3a36, wall: 0x5a5850, light: 0xffc890,
      pillars: [[7, -5], [7, 5], [13, -5], [13, 5]], braziers: [[16.5, -7.5], [16.5, 7.5]] },
    { id: 'shrine-steps', rect: [18, 30, -4, 4], open: true, height: 5, floor: 0x3e3c36, wall: 0x58564c },
    { id: 'moor', rect: [30, 72, -16, 16], open: true, grass: true, height: 4.5, floor: 0x3a3e34, wall: 0x52564c, light: 0xc8d0c8,
      lamps: [[34, -14], [34, 14], [70, -14.5], [70, 14.5]] },
    { id: 'approach', rect: [72, 96, -4, 4], open: true, height: 6, floor: 0x3c3c36, wall: 0x54524a },
    { id: 'gorge', rect: [96, 130, -4, 4], open: true, height: 14, floor: 0x363630, wall: 0x4c4a44, light: 0xb0bcc8, dim: true },
    { id: 'niche-n', rect: [104, 108, 4, 8], open: true, height: 6, floor: 0x32322e, wall: 0x484640 },
    { id: 'niche-s', rect: [118, 122, -8, -4], open: true, height: 6, floor: 0x32322e, wall: 0x484640 },
    { id: 'gatefront', rect: [130, 170, -18, 14], open: true, grass: true, height: 5, floor: 0x3a3c34, wall: 0x52564c, light: 0xd0ccc0,
      lamps: [[132, 12.5], [150, -16.5], [168, -16.5]] },
    { id: 'stair-foot', rect: [146, 150, 14, 18], open: true, height: 8, floor: 0x3c3c36, wall: 0x54524a },
    { id: 'wall-walk', rect: [160, 170, 14, 18], y: 5, open: true, height: 4, edges: { s: 'rail' }, floor: 0x46423a, wall: 0x58544c },
    { id: 'cliff-road', rect: [190, 222, -3, 3], y: 8, open: true, height: 8, edges: { s: 'open' }, floor: 0x3c3a34, wall: 0x504e4a },
    { id: 'bridge-yard', rect: [222, 236, -8, 8], y: 8, open: true, height: 10, floor: 0x3e3c38, wall: 0x58544c, light: 0xffc890,
      lamps: [[234.5, -6.5], [234.5, 6.5]] },
    { id: 'fog-door', rect: [236, 240, -3, 3], y: 8, height: 6, floor: 0x383633, wall: 0x54504a, dim: true },
    { id: 'gate-bridge', rect: [240, 284, -15, 15], y: 8, open: true, height: 14, edges: { n: 'rail', s: 'rail' }, floor: 0x42403c, wall: 0x5a5650, light: 0xffc890,
      lamps: [[242, -13.5], [242, 13.5], [282, -13.5], [282, 13.5]] },
    { id: 'border-gate', rect: [284, 290, -3, 3], y: 8, height: 5, floor: 0x383633, wall: 0x54504a, light: 0xffc080, dim: true },
  ],
  ramps: [
    { id: 'wall-stair', rect: [150, 160, 14, 18], axis: 'x', from: 0, to: 5, stairs: true, height: 4, edges: { s: 'rail' }, floor: 0x46423a, wall: 0x58544c },
    { id: 'ascent', rect: [170, 190, -3, 3], axis: 'x', from: 0, to: 8, stairs: true, height: 8, floor: 0x3e3c36, wall: 0x54524a },
  ],
  // The gatehouse over Thrale's border gate: masonry the gate bridge's east wall runs into.
  blocks: [{ rect: [284, 296, -12, 12], y0: 13.5, y1: 22, wall: 0x5a5650 }],
  houses: [
    { rect: [40, 47, 7, 13], eaves: 4.5, ridge: 'x', ruined: true },
    { rect: [50, 56, -14, -9], eaves: 4, ridge: 'z', ruined: true },
    { rect: [142, 148, -14, -9], eaves: 4.2, ridge: 'x', ruined: true },
    { rect: [154, 159, 3, 9], eaves: 3.8, ridge: 'z', ruined: true },
  ],
  props: [
    { kind: 'cart', x: 60, z: -12 }, { kind: 'heap', x: 64, z: 11 }, { kind: 'crates', x: 36, z: -9 },
    { kind: 'brokenStall', x: 138, z: 8 }, { kind: 'cart', x: 163, z: -12, yaw: Math.PI / 2 }, { kind: 'heap', x: 226, y: 8, z: 6 },
  ],
  bonfires: [{ id: 'moor-shrine', x: 2.5, z: -6.5, spawn: { x: 4.5, z: -4.5, yaw: Math.PI / 2 } },
             { id: 'moor-gatefront', x: 133, z: -15.5, spawn: { x: 135, z: -13.5, yaw: Math.PI / 2 } },
             { id: 'moor-bridge', x: 224, y: 8, z: -6.2, spawn: { x: 226, y: 8, z: -4.5, yaw: Math.PI / 2 } }],
  gated: [
    // The barricade at the moor's far side: a flock and its bearer.
    { id: 'zone-moor', trigger: [54, 72, -16, 16], gate: { x: 72, z: 0, along: 'z', width: 8, style: 'barricade' },
      enemies: [{ enemy: 'lanternBearer', spawn: { x: 68, z: 0, yaw: -Math.PI / 2 } },
                { enemy: 'lanternThrall', spawn: { x: 62, z: -6, yaw: -Math.PI / 2 } }, { enemy: 'lanternThrall', variant: 'elite', spawn: { x: 63, z: 6, yaw: -Math.PI / 2 } },
                { enemy: 'lanternThrall', spawn: { x: 65, z: 2.5, yaw: -Math.PI / 2 } }] },
    // The gorge: two thralls asleep in the niches, rising as the player passes; an old gate-warden at the far end.
    { id: 'zone-gorge', trigger: [[104, 130, -4, 4], [104, 108, 4, 8], [118, 122, -8, -4]], gate: { x: 130, z: 0, along: 'z', width: 8 },
      enemies: [{ enemy: 'lanternThrall', behavior: 'slumber', spawn: { x: 109, z: 2.8, yaw: -Math.PI / 2 } },
                { enemy: 'lanternThrall', behavior: 'slumber', spawn: { x: 117, z: -2.8, yaw: -Math.PI / 2 } },
                { enemy: 'knight', spawn: { x: 126, z: 0, yaw: -Math.PI / 2 } }] },
    { id: 'zone-gatefront', trigger: [138, 170, -18, 14], gate: { x: 170, z: 0, along: 'z', width: 6 },
      enemies: [{ enemy: 'warden', spawn: { x: 152, z: -1, yaw: -Math.PI / 2 } }, { enemy: 'lanternBearer', spawn: { x: 165, z: 4, yaw: -Math.PI / 2 } },
                { enemy: 'lanternThrall', spawn: { x: 160, z: -5, yaw: -Math.PI / 2 } }, { enemy: 'lanternThrall', spawn: { x: 162, z: 7, yaw: -Math.PI / 2 } }] },
    // The gate bridge: Old Ostrey. He sees the player only on the bridge (`arena`), so the bonfire before the fog is safe.
    { id: 'zone-ostrey', trigger: [241, 284, -15, 15], gate: { x: 284, z: 0, y: 8, along: 'z', width: 6 },
      enemies: [{ enemy: 'ostrey', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['porter', 'kindled'] }, spawn: { x: 272, y: 8, z: 0, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'ostrey-fog', gate: { x: 240, z: 0, y: 8, along: 'z', width: 6 }, fog: 'zone-ostrey' }],
  dispersed: [
    // The flock on the moor: blind (a short `notice`), walking after its bearer, who sees; the bearer's alarm wakes them.
    { behavior: 'patrol', enemy: 'lanternBearer', notice: 16, z: 0, path: [38, 52] },
    { behavior: 'patrol', enemy: 'lanternThrall', notice: 4, z: 2, path: [36, 50] },
    { behavior: 'patrol', enemy: 'lanternThrall', notice: 4, z: -2, path: [36, 50] },
    { behavior: 'patrol', enemy: 'lanternThrall', notice: 4, z: 0.5, path: [34, 48] },
    { behavior: 'sentry', enemy: 'lancer', x: 46, z: -12, yaw: 0 },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-gatefront', x: 163, y: 5, z: 16.5, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-gatefront', x: 168, y: 5, z: 16.5, yaw: Math.PI },
    { behavior: 'patrol', enemy: 'lancer', y: 8, z: 0.5, path: [194, 214] },
    { behavior: 'sentry', enemy: 'bowman', x: 219.5, y: 8, z: 1.5, yaw: -Math.PI / 2 },
  ],
  // Ostrey seen first from the cliff road, on the cliff top above it: he watches, then turns away north.
  spectators: [{ id: 'sighting-ostrey', enemy: 'ostrey', x: 207, y: 16, z: 3.5, yaw: Math.PI, trigger: [192, 222, -3, 3], watch: 3.2, leave: [0, 7], halo: 0xffb050 }],
  hints: [{ kind: 'corpse', x: 101, z: 2.4, yaw: 0.5 }, { kind: 'corpse', x: 127.5, z: -2.5, yaw: 2.4 }],
  devJumps: [
    { name: 'L7: Bonfire 2 (gatefront)', at: 'moor-gatefront', won: ['zone-moor', 'zone-gorge'] },
    { name: 'L7: Bonfire 3 (Ostrey\'s fog)', at: 'moor-bridge', won: ['zone-moor', 'zone-gorge', 'zone-gatefront'], seen: ['sighting-ostrey'] },
  ],
};
