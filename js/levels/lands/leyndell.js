'use strict';
// The Lands Between, 4: Leyndell, Royal Capital (v7.0). Boss: Morgott, the Omen King. A city of white stone and gold under
// the Erdtree, leaves of light falling over everything. x east, z north (toward the Erdtree).
//   The capital gate (bonfire 1, Seren), the great avenue between lit houses (a Leyndell Knight holds its end), the plaza
//   of the fountain (the big fight: an Empty Sentinel, a Crucible Squire, Lancers, archers on the north gallery).
//   Past the plaza, bonfire 2 at the foot of the grand stair, up to the upper terrace (y 10): Leyndell Knights and a
//   Squire; from here Morgott is seen at the throne gate before he turns away. North over the chasm runs a great root of
//   the Erdtree, no rail, an Omenkin on it; then the throne gate (bonfire 3), the fog, and the Elden Throne's court.
const LANDS_4 = {
  id: 'leyndell', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  name: 'Lands 4: Leyndell, Royal Capital',
  description: 'The golden capital under the Erdtree. Down the avenue, through the fountain plaza, up the grand stair and over the great root to the Elden Throne, where the Omen King stands guard.',
  help: 'Lands 4: archers hold the plaza\'s north gallery. The great root over the chasm has no rail. Leyndell Knights conjure golden spears: they charge at mid range and throw from afar.',
  completeHint: 'The Omen King is fallen. But the Erdtree has closed itself in thorns…',
  wallHeight: 10, gateHeight: 3.6, gateThickness: 0.5, flasks: 7,
  // Afternoon gold: warm haze, white stone hardly weathered, golden leaves falling, the Erdtree filling the north sky.
  atmosphere: { background: 0x6a5a40, fog: 0x8a7652, fogDensity: 0.0085,
                moon: { color: 0xffe0a0, intensity: 2.6, position: [-30, 40, -20] },
                ambient: { color: 0x6a5a48, intensity: 1.15 },
                hemi: { sky: 0xffe0a8, ground: 0x3a3020, intensity: 0.7 },
                exposure: 1.0, dust: 0.3, rim: 0xffe0a0,
                grade: { shadowTint: [0.95, 0.92, 1.0], highlightTint: [1.08, 1.0, 0.86], saturation: 0.88 },
                surface: { moss: 0.12, grime: 0.45 }, banners: [0xd8b860, 0xe8e0c8], debris: 0.05,
                sky: { zenith: 0x7a6a50, sun: 0xffd070, sunDir: [0.15, 0.4, 0.9] }, silhouettes: 2, grass: 0.3 },
  realm: {
    tree: { kind: 'golden', x: 160, z: 460, y: -80, height: 980, width: 560 },
    weather: [{ kind: 'leaves', amount: 1.0, colors: [0xffc040, 0xffd870, 0xe8a030] }, { kind: 'motes', amount: 0.35, color: 0xffe0a0 }],
    roots: [{ pts: [[160, 2, 22], [158, 6.6, 36], [161, 2, 50]], r: 2.6 }, { pts: [[146, -10, 30], [152, 2, 38], [150, -12, 60]], r: 3.4 },
            { pts: [[174, -12, 28], [168, 0, 40], [176, -10, 58]], r: 3.0 }],
    beams: 0xffe0a0,
    grounds: [{ kind: 'goldbark', rooms: ['root-bridge'] }],
  },
  start: { x: 3, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'capital-gate', rect: [0, 16, -6, 6], height: 8, floor: 0xa89c80, wall: 0xc8bc9c, light: 0xffd8a0, braziers: [[1.5, -4.5], [1.5, 4.5]] },
    { id: 'avenue', rect: [16, 70, -7, 7], open: true, height: 10, floor: 0xb4a888, wall: 0xd0c4a4, light: 0xffe0a0,
      lamps: [[20, -6], [20, 6], [44, -6], [44, 6], [68, -6], [68, 6]] },
    { id: 'plaza', rect: [70, 110, -20, 20], open: true, height: 12, floor: 0xb0a486, wall: 0xccc0a0, light: 0xffe8b8,
      lamps: [[72, -18], [72, 18], [108, -18], [108, 18]] },
    { id: 'gallery', rect: [76, 104, 20, 24], y: 6, open: true, height: 4, edges: { s: 'rail' }, floor: 0xa89c80, wall: 0xc8bc9c },
    { id: 'terrace-foot', rect: [110, 122, -4, 4], open: true, height: 10, floor: 0xa89c80, wall: 0xc8bc9c, light: 0xffd8a0 },
    { id: 'upper-terrace', rect: [142, 180, -16, 16], y: 10, open: true, height: 12, floor: 0xb4a888, wall: 0xd0c4a4, light: 0xffe0a0,
      lamps: [[144, -14], [144, 14], [178, -14], [178, 14]] },
    { id: 'root-bridge', rect: [156, 164, 16, 46], y: 10, open: true, height: 8, edges: { e: 'open', w: 'open' }, floor: 0x8a6a3a, wall: 0x9a7a48 },
    { id: 'throne-gate', rect: [152, 168, 46, 56], y: 10, open: true, height: 10, floor: 0xa89c80, wall: 0xc8bc9c, light: 0xffd8a0, braziers: [[166.5, 47.5], [166.5, 54.5]] },
    { id: 'fog-door', rect: [157, 163, 56, 60], y: 10, height: 6, floor: 0x9a8e74, wall: 0xc0b494, dim: true },
    { id: 'elden-throne', rect: [140, 180, 60, 100], y: 10, open: true, height: 16, floor: 0xb8aa88, wall: 0xd4c6a2, light: 0xffe8b0,
      lamps: [[142, 62], [178, 62], [142, 98], [178, 98]] },
    { id: 'throne-exit', rect: [157, 163, 100, 104], y: 10, height: 5, floor: 0x9a8e74, wall: 0xc0b494, light: 0xffe8c0, dim: true },
  ],
  ramps: [
    { id: 'grand-stair', rect: [122, 142, -4, 4], axis: 'x', from: 0, to: 10, stairs: true, height: 10, floor: 0xa89c80, wall: 0xc8bc9c },
  ],
  // Masonry under the raised floors: the plaza gallery, the upper terrace, the throne gate and the throne's court.
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
  bonfires: [{ id: 'ley-gate', x: 13.5, z: -4.5, spawn: { x: 11.5, z: -3, yaw: Math.PI / 2 } },
             { id: 'ley-plaza', x: 120, z: -2.8, spawn: { x: 118, z: -1.2, yaw: Math.PI / 2 } },
             { id: 'ley-throne', x: 153.5, y: 10, z: 54.5, spawn: { x: 155.5, y: 10, z: 53, yaw: 0 } }],
  gated: [
    { id: 'zone-avenue', trigger: [50, 70, -7, 7], gate: { x: 70, z: 0, along: 'z', width: 14 },
      enemies: [{ enemy: 'leyndellKnight', spawn: { x: 64, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'hollow', variant: 'elite', spawn: { x: 58, z: -4, yaw: -Math.PI / 2 } },
                { enemy: 'hollow', variant: 'elite', spawn: { x: 58, z: 4, yaw: -Math.PI / 2 } }] },
    { id: 'zone-plaza', trigger: [72, 110, -20, 20], gate: { x: 110, z: 0, along: 'z', width: 8 },
      enemies: [{ enemy: 'sentinel', variant: 'elite', spawn: { x: 101, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'crucibleSquire', spawn: { x: 94, z: -11, yaw: -Math.PI / 2 } },
                { enemy: 'lancer', spawn: { x: 84, z: 11, yaw: -Math.PI / 2 } }, { enemy: 'lancer', spawn: { x: 84, z: -11, yaw: -Math.PI / 2 } }] },
    { id: 'zone-terrace', trigger: [142, 180, -16, 16], gate: { x: 160, z: 16, y: 10, along: 'x', width: 8 },
      enemies: [{ enemy: 'leyndellKnight', spawn: { x: 154, y: 10, z: 2, yaw: -Math.PI / 2 } }, { enemy: 'leyndellKnight', spawn: { x: 170, y: 10, z: 6, yaw: -Math.PI / 2 } },
                { enemy: 'crucibleSquire', variant: 'elite', spawn: { x: 166, y: 10, z: -8, yaw: -Math.PI / 2 } }] },
    { id: 'zone-morgott', trigger: [140, 180, 61, 100], gate: { x: 160, z: 100, y: 10, along: 'x', width: 6 },
      enemies: [{ enemy: 'morgott', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['king', 'cursed'] }, spawn: { x: 160, y: 10, z: 88, yaw: Math.PI } }] },
  ],
  sealed: [{ id: 'morgott-fog', gate: { x: 160, z: 60, y: 10, along: 'x', width: 6 }, fog: 'zone-morgott' }],
  dispersed: [
    { behavior: 'patrol', enemy: 'hollow', variant: 'elite', z: 2.5, path: [22, 42] },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-plaza', x: 84, y: 6, z: 22, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-plaza', x: 97, y: 6, z: 22, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'omenkin', variant: 'elite', x: 160, y: 10, z: 34, yaw: Math.PI },
  ],
  // Morgott at the throne gate, seen from the upper terrace across the chasm; he turns and goes in to his throne.
  spectators: [{ id: 'sighting-morgott', enemy: 'morgott', x: 160, y: 10, z: 50, yaw: Math.PI, trigger: [142, 180, -16, 16], watch: 3.5, leave: [0, 9], halo: 0xffc860 }],
  devJumps: [
    { name: 'Lands 4: Bonfire 2 (grand stair)', at: 'ley-plaza', won: ['zone-avenue', 'zone-plaza'] },
    { name: 'Lands 4: Bonfire 3 (Morgott\'s fog)', at: 'ley-throne', won: ['zone-avenue', 'zone-plaza', 'zone-terrace'], seen: ['sighting-morgott'] },
  ],
};
