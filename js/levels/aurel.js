'use strict';
// Level 10: Aurel, the Gilded City (v7.44.0), chapter 10 of the Story (STORY.md 10f): Thrale's capital, still
// gold, fed and smiling. Rough (PLAN.md stage 3, track A): built from the old second road's royal capital
// (removed in v7.54.0) as raw material, its layout kept, every name and character of that road gone; no great
// tree over this city, only the Ember's root coming up out of the chasm. x east, z north (toward the throne court).
//   The city gate (bonfire 1, Ysolde), the avenue between lit houses (Gilded Thralls, smiling, with knives), the
//   fountain court (the big fight: an Empty Sentinel of the regent's watch and a crowd of thralls, archers on the north
//   gallery). Past the court, bonfire 2 at the foot of the great stair, up to the upper terrace (y 10): thralls of the
//   court and a Pale Duelist; from here the Regent is seen at the throne gate before he turns away. North over the
//   chasm runs the great root, no rail, a thrall keeping it; then the throne gate (bonfire 3), the fog, and the throne
//   court: the Regent Hollis.
const LEVEL_10 = {
  id: 'aurel', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  next: 'aurel-in-ash',   // v7.46.0: on to the same city, burning (chapter 11)
  name: 'Level 10: Aurel, the Gilded City',
  description: 'Thrale\'s capital, still gold, and fed, and smiling. Down the avenue, through the fountain court, up the great stair and over the root out of the chasm, to the throne court where the Regent keeps the city.',
  help: 'Level 10: the citizens smile until you are close, and they carry knives. Archers hold the fountain court\'s north gallery. The great root over the chasm has no rail.',
  completeHint: 'The Regent is fallen, and the city stops smiling. Somewhere below the avenue, something has begun to burn…',
  wallHeight: 10, gateHeight: 3.6, gateThickness: 0.5, flasks: 7,
  // Afternoon gold: warm haze, white stone hardly weathered, flakes of gold leaf falling off the roofs.
  atmosphere: { background: 0x6a5a40, fog: 0x8a7652, fogDensity: 0.0085,
                moon: { color: 0xffe0a0, intensity: 2.6, position: [-30, 40, -20] },
                ambient: { color: 0x6a5a48, intensity: 1.15 },
                hemi: { sky: 0xffe0a8, ground: 0x3a3020, intensity: 0.7 },
                exposure: 1.0, dust: 0.3, rim: 0xffe0a0,
                grade: { shadowTint: [0.95, 0.92, 1.0], highlightTint: [1.08, 1.0, 0.86], saturation: 0.88 },
                surface: { moss: 0.12, grime: 0.45 }, banners: [0xd8b860, 0xe8e0c8], debris: 0.05,
                sky: { zenith: 0x7a6a50, sun: 0xffd070, sunDir: [0.15, 0.4, 0.9] }, silhouettes: 2, grass: 0.3 },
  realm: {
    weather: [{ kind: 'leaves', amount: 0.7, colors: [0xffc040, 0xffd870, 0xe8a030] }, { kind: 'motes', amount: 0.35, color: 0xffe0a0 }],
    // The Ember's root, come up out of the chasm and over it: red-gold wood the city has gilded where it could reach.
    roots: [{ pts: [[160, 2, 22], [158, 6.6, 36], [161, 2, 50]], r: 2.6 }, { pts: [[146, -10, 30], [152, 2, 38], [150, -12, 60]], r: 3.4 },
            { pts: [[174, -12, 28], [168, 0, 40], [176, -10, 58]], r: 3.0 }],
    beams: 0xffe0a0,
    grounds: [{ kind: 'goldbark', rooms: ['great-root'] }],
  },
  start: { x: 3, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'city-gate', rect: [0, 16, -6, 6], height: 8, floor: 0xa89c80, wall: 0xc8bc9c, light: 0xffd8a0, braziers: [[1.5, -4.5], [1.5, 4.5]] },
    { id: 'avenue', rect: [16, 70, -7, 7], open: true, height: 10, floor: 0xb4a888, wall: 0xd0c4a4, light: 0xffe0a0,
      lamps: [[20, -6], [20, 6], [44, -6], [44, 6], [68, -6], [68, 6]] },
    { id: 'fountain-court', rect: [70, 110, -20, 20], open: true, height: 12, floor: 0xb0a486, wall: 0xccc0a0, light: 0xffe8b8,
      lamps: [[72, -18], [72, 18], [108, -18], [108, 18]] },
    { id: 'gallery', rect: [76, 104, 20, 24], y: 6, open: true, height: 4, edges: { s: 'rail' }, floor: 0xa89c80, wall: 0xc8bc9c },
    { id: 'stair-foot', rect: [110, 122, -4, 4], open: true, height: 10, floor: 0xa89c80, wall: 0xc8bc9c, light: 0xffd8a0 },
    { id: 'upper-terrace', rect: [142, 180, -16, 16], y: 10, open: true, height: 12, floor: 0xb4a888, wall: 0xd0c4a4, light: 0xffe0a0,
      lamps: [[144, -14], [144, 14], [178, -14], [178, 14]] },
    { id: 'great-root', rect: [156, 164, 16, 46], y: 10, open: true, height: 8, edges: { e: 'open', w: 'open' }, floor: 0x8a6a3a, wall: 0x9a7a48 },
    { id: 'throne-gate', rect: [152, 168, 46, 56], y: 10, open: true, height: 10, floor: 0xa89c80, wall: 0xc8bc9c, light: 0xffd8a0, braziers: [[166.5, 47.5], [166.5, 54.5]] },
    { id: 'fog-door', rect: [157, 163, 56, 60], y: 10, height: 6, floor: 0x9a8e74, wall: 0xc0b494, dim: true },
    { id: 'throne-court', rect: [140, 180, 60, 100], y: 10, open: true, height: 16, floor: 0xb8aa88, wall: 0xd4c6a2, light: 0xffe8b0,
      lamps: [[142, 62], [178, 62], [142, 98], [178, 98]] },
    { id: 'throne-exit', rect: [157, 163, 100, 104], y: 10, height: 5, floor: 0x9a8e74, wall: 0xc0b494, light: 0xffe8c0, dim: true },
  ],
  ramps: [
    { id: 'great-stair', rect: [122, 142, -4, 4], axis: 'x', from: 0, to: 10, stairs: true, height: 10, floor: 0xa89c80, wall: 0xc8bc9c },
  ],
  // Masonry under the raised floors: the court's gallery, the upper terrace, the throne gate and the throne court.
  blocks: [{ rect: [76, 104, 20, 24], y0: 0, y1: 5.5, wall: 0xc8bc9c }, { rect: [142, 180, -16, 16], y0: -2, y1: 9.5, wall: 0xc0b494 },
           { rect: [152, 168, 46, 56], y0: -30, y1: 9.5, wall: 0xb0a484 }, { rect: [140, 180, 56, 104], y0: -30, y1: 9.5, wall: 0xb0a484 }],
  houses: [
    ...houseRow([16, 70, -19, -7], 'x', [9, 9, 9, 9, 9, 9], [9, 10.5, 8.5, 11, 9.5, 10], { stone: true, lit: 0.5 }),
    ...houseRow([16, 70, 7, 19], 'x', [9, 9, 9, 9, 9, 9], [10, 9, 11, 8.5, 10.5, 9], { stone: true, lit: 0.5 }),
    ...houseRow([70, 110, -32, -20], 'x', [10, 10, 10, 10], [11, 12.5, 11, 12], { stone: true, lit: 0.6 }),
    { rect: [70, 76, 20, 30], eaves: 12, ridge: 'z', stone: true, lit: 0.4 }, { rect: [104, 110, 20, 30], eaves: 12, ridge: 'z', stone: true, lit: 0.4 },
    { rect: [76, 104, 24, 32], eaves: 15, ridge: 'x', stone: true, lit: 0.6, y: 0 },
    { rect: [110, 122, -16, -4], eaves: 11, ridge: 'x', stone: true, lit: 0.4 }, { rect: [110, 122, 4, 16], eaves: 11, ridge: 'x', stone: true, lit: 0.4 },
    { rect: [122, 142, -14, -4], eaves: 13, ridge: 'x', stone: true, lit: 0.5 }, { rect: [122, 142, 4, 14], eaves: 13, ridge: 'x', stone: true, lit: 0.5 },
    ...houseRow([142, 180, -28, -16], 'x', [9.5, 9.5, 9.5, 9.5], [9, 10, 9.5, 11], { stone: true, lit: 0.5, y: 10 }),
    { rect: [142, 156, 16, 26], eaves: 9, ridge: 'x', stone: true, lit: 0.5, y: 10 }, { rect: [164, 180, 16, 26], eaves: 9, ridge: 'x', stone: true, lit: 0.5, y: 10 },
    { kind: 'tower', rect: [180, 188, -16, -4], eaves: 18, y: 10 }, { kind: 'tower', rect: [180, 188, 4, 16], eaves: 18, y: 10 },
  ],
  props: [
    { kind: 'fountain', x: 90, z: 0 }, { kind: 'crates', x: 74, z: -15 }, { kind: 'cart', x: 104, z: 14, yaw: Math.PI / 2 },
    { kind: 'stall', x: 32, z: -4.8 }, { kind: 'stall', x: 52, z: 4.8, yaw: Math.PI }, { kind: 'well', x: 170, y: 10, z: -10 },
  ],
  bonfires: [{ id: 'aurel-gate', x: 13.5, z: -4.5, spawn: { x: 11.5, z: -3, yaw: Math.PI / 2 } },
             { id: 'aurel-stair', x: 120, z: -2.8, spawn: { x: 118, z: -1.2, yaw: Math.PI / 2 } },
             { id: 'aurel-throne', x: 153.5, y: 10, z: 54.5, spawn: { x: 155.5, y: 10, z: 53, yaw: 0 } }],
  gated: [
    { id: 'zone-avenue', trigger: [50, 70, -7, 7], gate: { x: 70, z: 0, along: 'z', width: 14 },
      enemies: [{ enemy: 'gildedThrall', variant: 'elite', spawn: { x: 64, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'gildedThrall', spawn: { x: 58, z: -4, yaw: -Math.PI / 2 } },
                { enemy: 'gildedThrall', spawn: { x: 58, z: 4, yaw: -Math.PI / 2 } }] },
    { id: 'zone-court', trigger: [72, 110, -20, 20], gate: { x: 110, z: 0, along: 'z', width: 8 },
      enemies: [{ enemy: 'sentinel', variant: 'elite', spawn: { x: 101, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'gildedThrall', spawn: { x: 94, z: -11, yaw: -Math.PI / 2 } },
                { enemy: 'gildedThrall', spawn: { x: 84, z: 11, yaw: -Math.PI / 2 } }, { enemy: 'gildedThrall', spawn: { x: 84, z: -11, yaw: -Math.PI / 2 } },
                { enemy: 'gildedThrall', variant: 'elite', spawn: { x: 94, z: 11, yaw: -Math.PI / 2 } }] },
    { id: 'zone-terrace', trigger: [142, 180, -16, 16], gate: { x: 160, z: 16, y: 10, along: 'x', width: 8 },
      enemies: [{ enemy: 'gildedThrall', variant: 'elite', spawn: { x: 154, y: 10, z: 2, yaw: -Math.PI / 2 } }, { enemy: 'gildedThrall', variant: 'elite', spawn: { x: 170, y: 10, z: 6, yaw: -Math.PI / 2 } },
                { enemy: 'duelist', variant: 'elite', spawn: { x: 166, y: 10, z: -8, yaw: -Math.PI / 2 } }] },
    // The throne court: the Regent. He sees the player only inside it (`arena`), so the last bonfire is safe.
    { id: 'zone-hollis', trigger: [140, 180, 61, 100], gate: { x: 160, z: 100, y: 10, along: 'x', width: 6 },
      enemies: [{ enemy: 'hollis', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['gracious', 'hungry'] }, spawn: { x: 160, y: 10, z: 88, yaw: Math.PI } }] },
  ],
  sealed: [{ id: 'hollis-fog', gate: { x: 160, z: 60, y: 10, along: 'x', width: 6 }, fog: 'zone-hollis' }],
  dispersed: [
    { behavior: 'patrol', enemy: 'gildedThrall', z: 2.5, path: [22, 42] },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-court', x: 84, y: 6, z: 22, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-court', x: 97, y: 6, z: 22, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'gildedThrall', variant: 'elite', x: 160, y: 10, z: 34, yaw: Math.PI },
  ],
  // The Regent at the throne gate, seen from the upper terrace across the chasm; he turns and goes in to his court.
  spectators: [{ id: 'sighting-hollis', enemy: 'hollis', x: 160, y: 10, z: 50, yaw: Math.PI, trigger: [142, 180, -16, 16], watch: 3.5, leave: [0, 9], halo: 0xffc860 }],
  devJumps: [
    { name: 'L10: Bonfire 2 (the great stair)', at: 'aurel-stair', won: ['zone-avenue', 'zone-court'] },
    { name: 'L10: Bonfire 3 (the Regent\'s fog)', at: 'aurel-throne', won: ['zone-avenue', 'zone-court', 'zone-terrace'], seen: ['sighting-hollis'] },
  ],
};
