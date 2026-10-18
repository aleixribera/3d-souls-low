'use strict';
// The Lands Between, 1: Stormhill (v7.0). Boss: Margit, the Fell Omen. x runs east toward Stormveil, z north.
//   The Chapel of Anticipation (y 0): the start, bonfire 1, Seren. A short flight of steps out onto
//   the heath (y 0, open, long grass, ruined shacks): Hollows wander it; at its far side a barricade and its fight.
//   The road to the Stormgate, then the gorge itself (walls 14 m high): two Rogues lie by its walls as if dead, among
//     the corpses of its side niches (a corpse marks the place), and an Omenkin waits at the far end: the first of its kind.
//   The gatefront ruins (y 0): bonfire 2 by the entrance, a Knight, a Shield Warden and another Omenkin among the ruins;
//     archers on the old wall walk (a stair climbs to it). The way on is the cliff stair.
//   The cliff path (y 8): six metres wide, a sheer drop to the south and nothing to stop a fall. A Lancer walks it, an
//     archer holds its end, and Margit watches from the cliff top before he turns away.
//   The bridge yard (y 8, bonfire 3), then the fog and the gate bridge: Margit, before the castle's gate.
const LANDS_1 = {
  id: 'stormhill', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  name: 'Lands 1: Stormhill',
  description: 'A storm-lashed heath under the Erdtree. Cross it, the Stormgate and the cliff path to Stormveil\'s gate bridge, where the Fell Omen waits.',
  help: 'Lands 1: win each fight to open the way on. The cliff path has no rail: keep to its wall. Seren waits by the first bonfire (F to talk); messages left by others can be read (F).',
  completeHint: 'The Omen is fallen. Stormveil\'s gate stands open…',
  wallHeight: 10, gateHeight: 3.4, gateThickness: 0.5, flasks: 6,
  // A grey-green storm over the heath: wind-blown leaves and a little rain, lightning far off, the Erdtree gold in the sky.
  atmosphere: { background: 0x48545a, fog: 0x5a666a, fogDensity: 0.0105,
                moon: { color: 0xd8e0e8, intensity: 2.3, position: [-20, 30, 12] },
                ambient: { color: 0x5a666e, intensity: 1.45 },
                hemi: { sky: 0xb0bcc0, ground: 0x34322a, intensity: 0.8 },
                exposure: 1.06, dust: 0.25, rim: 0xc8d8e8,
                grade: { shadowTint: [0.9, 0.98, 1.06], highlightTint: [1.05, 1.02, 0.92], saturation: 0.74 },
                surface: { moss: 0.85, grime: 1.0 }, banners: [0x3a4a3a, 0x5a4a28], debris: 0.15,
                sky: { zenith: 0x34424c, sun: 0xf0e0b0, sunDir: [-0.55, 0.22, 0.6] }, silhouettes: 3, grass: 1,
                landmark: { x: 560, z: 0, y: -80, height: 360, width: 340 } },
  realm: {
    tree: { kind: 'golden', x: -420, z: 560, y: -40, height: 760, width: 420 },
    lightning: { every: [7, 15], color: 0xdce6ff },
    weather: [{ kind: 'leaves', amount: 0.55, colors: [0x8a9a6a, 0xb0a070, 0x6a7a50] }, { kind: 'rain', amount: 0.3 }],
    beams: 0xffd890,
    grounds: [{ kind: 'earth', rooms: ['chapel-steps', 'heath', 'approach', 'gorge', 'niche-n', 'niche-s', 'gatefront', 'stair-foot', 'cliff-path'] }],
  },
  start: { x: 4, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'chapel', rect: [0, 18, -9, 9], open: true, height: 9, floor: 0x3e3c36, wall: 0x5e5a50, light: 0xffc890,
      pillars: [[7, -5], [7, 5], [13, -5], [13, 5]], braziers: [[16.5, -7.5], [16.5, 7.5]] },
    { id: 'chapel-steps', rect: [18, 30, -4, 4], open: true, height: 5, floor: 0x403e36, wall: 0x5a564c },
    { id: 'heath', rect: [30, 72, -16, 16], open: true, grass: true, height: 4.5, floor: 0x3e4034, wall: 0x56584c, light: 0xd8e0c8,
      lamps: [[34, -14], [34, 14], [70, -14.5], [70, 14.5]] },
    { id: 'approach', rect: [72, 96, -4, 4], open: true, height: 6, floor: 0x3e3e36, wall: 0x56544a },
    { id: 'gorge', rect: [96, 130, -4, 4], open: true, height: 14, floor: 0x383832, wall: 0x4e4c44, light: 0xb8c4d0, dim: true },
    { id: 'niche-n', rect: [104, 108, 4, 8], open: true, height: 6, floor: 0x34342e, wall: 0x4a4840 },
    { id: 'niche-s', rect: [118, 122, -8, -4], open: true, height: 6, floor: 0x34342e, wall: 0x4a4840 },
    { id: 'gatefront', rect: [130, 170, -18, 14], open: true, grass: true, height: 5, floor: 0x3c3e34, wall: 0x56584c, light: 0xd8d4c0,
      lamps: [[132, 12.5], [150, -16.5], [168, -16.5]] },
    { id: 'stair-foot', rect: [146, 150, 14, 18], open: true, height: 8, floor: 0x3e3e36, wall: 0x56544a },
    { id: 'wall-walk', rect: [160, 170, 14, 18], y: 5, open: true, height: 4, edges: { s: 'rail' }, floor: 0x48443a, wall: 0x5a564c },
    { id: 'cliff-path', rect: [190, 222, -3, 3], y: 8, open: true, height: 8, edges: { s: 'open' }, floor: 0x3e3c34, wall: 0x52504a },
    { id: 'bridge-yard', rect: [222, 236, -8, 8], y: 8, open: true, height: 10, floor: 0x403e38, wall: 0x5a564c, light: 0xffd8a0,
      lamps: [[234.5, -6.5], [234.5, 6.5]] },
    { id: 'fog-door', rect: [236, 240, -3, 3], y: 8, height: 6, floor: 0x3a3833, wall: 0x56524a, dim: true },
    { id: 'gate-bridge', rect: [240, 284, -15, 15], y: 8, open: true, height: 14, edges: { n: 'rail', s: 'rail' }, floor: 0x44423c, wall: 0x5e5a52, light: 0xffe0b0,
      lamps: [[242, -13.5], [242, 13.5], [282, -13.5], [282, 13.5]] },
    { id: 'castle-gate', rect: [284, 290, -3, 3], y: 8, height: 5, floor: 0x3a3833, wall: 0x56524a, light: 0xffd090, dim: true },
  ],
  ramps: [
    { id: 'wall-stair', rect: [150, 160, 14, 18], axis: 'x', from: 0, to: 5, stairs: true, height: 4, edges: { s: 'rail' }, floor: 0x48443a, wall: 0x5a564c },
    { id: 'ascent', rect: [170, 190, -3, 3], axis: 'x', from: 0, to: 8, stairs: true, height: 8, floor: 0x403e36, wall: 0x56544a },
  ],
  // The gatehouse over the castle gate: masonry the gate bridge's east wall runs into.
  blocks: [{ rect: [284, 296, -12, 12], y0: 13.5, y1: 22, wall: 0x5e5a52 }],
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
  bonfires: [{ id: 'storm-chapel', x: 2.5, z: -6.5, spawn: { x: 4.5, z: -4.5, yaw: Math.PI / 2 } },
             { id: 'storm-gatefront', x: 133, z: -15.5, spawn: { x: 135, z: -13.5, yaw: Math.PI / 2 } },
             { id: 'storm-bridge', x: 224, y: 8, z: -6.2, spawn: { x: 226, y: 8, z: -4.5, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-heath', trigger: [54, 72, -16, 16], gate: { x: 72, z: 0, along: 'z', width: 8, style: 'barricade' },
      enemies: [{ enemy: 'hollow', spawn: { x: 62, z: -6, yaw: -Math.PI / 2 } }, { enemy: 'hollow', variant: 'elite', spawn: { x: 63, z: 6, yaw: -Math.PI / 2 } },
                { enemy: 'lancer', spawn: { x: 68, z: 0, yaw: -Math.PI / 2 } }] },
    // The Stormgate: two Rogues asleep in the niches, rising as the player passes; the first Omenkin at the far end.
    { id: 'zone-gorge', trigger: [[104, 130, -4, 4], [104, 108, 4, 8], [118, 122, -8, -4]], gate: { x: 130, z: 0, along: 'z', width: 8 },
      enemies: [{ enemy: 'rogue', behavior: 'slumber', spawn: { x: 109, z: 2.8, yaw: -Math.PI / 2 } },
                { enemy: 'rogue', behavior: 'slumber', spawn: { x: 117, z: -2.8, yaw: -Math.PI / 2 } },
                { enemy: 'omenkin', spawn: { x: 126, z: 0, yaw: -Math.PI / 2 } }] },
    { id: 'zone-gatefront', trigger: [138, 170, -18, 14], gate: { x: 170, z: 0, along: 'z', width: 6 },
      enemies: [{ enemy: 'knight', spawn: { x: 160, z: -5, yaw: -Math.PI / 2 } }, { enemy: 'warden', spawn: { x: 152, z: -1, yaw: -Math.PI / 2 } },
                { enemy: 'omenkin', spawn: { x: 165, z: 4, yaw: -Math.PI / 2 } }] },
    // The gate bridge: Margit. He sees the player only on the bridge (`arena`), so the bonfire before the fog is safe.
    { id: 'zone-margit', trigger: [241, 284, -15, 15], gate: { x: 284, z: 0, y: 8, along: 'z', width: 6 },
      enemies: [{ enemy: 'margit', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['omen', 'golden'] }, spawn: { x: 272, y: 8, z: 0, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'margit-fog', gate: { x: 240, z: 0, y: 8, along: 'z', width: 6 }, fog: 'zone-margit' }],
  dispersed: [
    { behavior: 'patrol', enemy: 'hollow', z: 2, path: [36, 50] },
    { behavior: 'patrol', enemy: 'hollow', z: -6, path: [40, 54] },
    { behavior: 'sentry', enemy: 'lancer', x: 46, z: -12, yaw: 0 },
    { behavior: 'slumber', enemy: 'rogue', x: 44, z: 4.5, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-gatefront', x: 163, y: 5, z: 16.5, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-gatefront', x: 168, y: 5, z: 16.5, yaw: Math.PI },
    { behavior: 'patrol', enemy: 'lancer', y: 8, z: 0.5, path: [194, 214] },
    { behavior: 'sentry', enemy: 'bowman', x: 219.5, y: 8, z: 1.5, yaw: -Math.PI / 2 },
  ],
  // Margit seen first from the cliff path, on the cliff top above it: he watches, then turns away north.
  spectators: [{ id: 'sighting-margit', enemy: 'margit', x: 207, y: 16, z: 3.5, yaw: Math.PI, trigger: [192, 222, -3, 3], watch: 3.2, leave: [0, 7], halo: 0xffd27a }],
  hints: [{ kind: 'corpse', x: 101, z: 2.4, yaw: 0.5 }, { kind: 'corpse', x: 127.5, z: -2.5, yaw: 2.4 }],
  devJumps: [
    { name: 'Lands 1: Bonfire 2 (gatefront)', at: 'storm-gatefront', won: ['zone-heath', 'zone-gorge'] },
    { name: 'Lands 1: Bonfire 3 (Margit\'s fog)', at: 'storm-bridge', won: ['zone-heath', 'zone-gorge', 'zone-gatefront'], seen: ['sighting-margit'] },
  ],
};
