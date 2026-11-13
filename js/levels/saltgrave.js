'use strict';
// Level 8: Saltgrave (v7.40.0), chapter 8 of the Story (STORY.md; LORE.md 10d): Thrale's border fortress, on a cliff
// over the sea, in the rain. Rough (PLAN.md stage 3, track A): built from the old second road's castle level
// (removed in v7.53.0) as raw material, its layout kept, every name and character of that road gone.
// x runs east, z north.
//   The gatehouse (bonfire 1, Ysolde) opens on the main yard, Salt Knights in it and bowmen on the north rampart. The
//     great gate east is barred from inside; the way is the side passage south, out onto the walled cliff walk over the
//     sea, where two gargoyles crouch on the castle wall's ledge and spring when you pass.
//   The walk climbs to the outer rampart (y 8): a Shover pushes, a Salt Knight holds. Bonfire 2 in the tower.
//   Down the tower stair into the inner ward (y 0): the big fight, bowmen on the east gallery.
//   The hall of kneeling statues (Saltgrave's garrison in stone, and its fight), the stair room (bonfire 3), and the long
//   stair up to the tower roof (y 10): Hale and Harrow, the Castellans, together, in the storm.
const LEVEL_8 = {
  id: 'saltgrave', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  next: 'night-gaol',   // v7.42.0: on to Thrale's gaol among the stars (chapter 9)
  name: 'Level 8: Saltgrave',
  description: 'Thrale\'s border fortress over the sea, in the rain. The great gate is barred: go round by the cliffs, the outer rampart and the hall of statues, up to the tower roof.',
  help: 'Level 8: the great gate is barred, so take the side passage south. Things crouch on the walls over the cliff walk. On the tower roof the castellans fight together: keep one between you and the other.',
  completeHint: 'Both castellans have fallen. Saltgrave\'s gate is open to the road inland…',
  wallHeight: 10, gateHeight: 3.4, gateThickness: 0.5, flasks: 6,
  // Night, a storm off the sea: heavy rain, lightning, wet blue-grey stone, sea-grey and salt-white banners.
  atmosphere: { background: 0x1e252e, fog: 0x34404c, fogDensity: 0.0145,
                moon: { color: 0xb8c8e0, intensity: 2.2, position: [10, 30, -20] },
                ambient: { color: 0x4a5464, intensity: 1.65 },
                hemi: { sky: 0x7a88a0, ground: 0x22242a, intensity: 0.75 },
                exposure: 1.16, dust: 0.1, rim: 0xb8c8e0,
                grade: { shadowTint: [0.88, 0.95, 1.1], highlightTint: [1.02, 1.0, 0.96], saturation: 0.62 },
                surface: { moss: 0.9, grime: 1.25 }, banners: [0x3a4a48, 0x9a9890], debris: 0.25,
                shafts: { rooms: true, color: 0xc8d8e8, opacity: 0.12 },
                sky: { zenith: 0x0e1218, sun: 0x8a98b0, sunDir: [0.4, 0.3, -0.6] }, silhouettes: 2, grass: 0.5 },
  realm: {
    lightning: { every: [4, 10], color: 0xd8e4ff },
    weather: [{ kind: 'rain', amount: 1.0 }],
    grounds: [{ kind: 'earth', rooms: ['cliff-walk', 'ward', 'side-passage'] }],
  },
  start: { x: 3, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'gatehouse', rect: [0, 16, -6, 6], height: 6, floor: 0x3a3a38, wall: 0x52524e, light: 0xffb070, braziers: [[1.5, -4.5], [1.5, 4.5]] },
    { id: 'main-yard', rect: [16, 52, -14, 14], open: true, height: 10, floor: 0x3a3c3e, wall: 0x50545a, light: 0xb8c4d8,
      lamps: [[18, -12.5], [18, 12.5], [50, 12.5], [50, -12.5]] },
    { id: 'yard-rampart', rect: [24, 48, 14, 18], y: 7, open: true, height: 4, edges: { s: 'rail' }, floor: 0x44464a, wall: 0x54585e },
    { id: 'barred-hall', rect: [52, 58, -3, 3], height: 5, floor: 0x343638, wall: 0x4a4e54, dim: true },
    { id: 'side-passage', rect: [30, 36, -22, -14], open: true, height: 8, floor: 0x383a3c, wall: 0x4e5258 },
    { id: 'cliff-walk', rect: [30, 70, -28, -22], open: true, height: 10, edges: { s: 'wall' }, floor: 0x3a3c3c, wall: 0x50545a },
    { id: 'wall-ledge', rect: [44, 66, -22, -19], y: 4, open: true, height: 4, edges: { s: 'open' }, floor: 0x44464a, wall: 0x54585e },
    { id: 'rampart', rect: [86, 130, -28, -22], y: 8, open: true, height: 5, edges: { s: 'wall' }, floor: 0x46484a, wall: 0x56585e, light: 0xc8d0e0,
      lamps: [[100, -23], [118, -23]] },
    { id: 'tower', rect: [130, 142, -30, -16], y: 8, height: 5, floor: 0x3a3a38, wall: 0x52524e, light: 0xffa060, braziers: [[131.5, -17.5], [140.5, -17.5]] },
    { id: 'ward', rect: [120, 160, 4, 34], open: true, height: 10, grass: true, floor: 0x3c3e3a, wall: 0x52564e, light: 0xc8d0c0,
      pillars: [[126, 12], [154, 12], [126, 26], [154, 26]], lamps: [[122, 6], [158, 6], [122, 32], [158, 32]] },
    { id: 'east-gallery', rect: [160, 164, 8, 30], y: 6, open: true, height: 4, edges: { w: 'rail' }, floor: 0x44464a, wall: 0x54585e },
    { id: 'hall-door', rect: [137, 143, 34, 38], height: 4.5, floor: 0x343638, wall: 0x4a4e54, dim: true },
    { id: 'statue-hall', rect: [128, 152, 38, 58], height: 7, floor: 0x383a3c, wall: 0x4c5054, light: 0xa8b8c8,
      pillars: [[134, 48], [146, 48]], braziers: [[129.5, 39.5], [150.5, 39.5], [129.5, 56.5], [150.5, 56.5]] },
    { id: 'stair-door', rect: [137, 143, 58, 62], height: 4.5, floor: 0x3a3a38, wall: 0x52524e, dim: true },
    { id: 'stair-room', rect: [132, 148, 62, 72], height: 6, floor: 0x3a3a38, wall: 0x52524e, light: 0xffb070, braziers: [[146.5, 63.5], [146.5, 70.5]] },
    { id: 'fog-landing', rect: [137, 143, 90, 94], y: 10, height: 6, floor: 0x3a3a38, wall: 0x52524e, dim: true },
    { id: 'tower-roof', rect: [118, 162, 94, 134], y: 10, open: true, height: 14, edges: { e: 'rail', w: 'rail', n: 'rail' }, floor: 0x40424a, wall: 0x54585e, light: 0xd8e0f0,
      lamps: [[120, 96], [160, 96], [120, 132], [160, 132]] },
    { id: 'roof-exit', rect: [137, 143, 134, 138], y: 10, height: 4.5, floor: 0x3a3a38, wall: 0x52524e, light: 0xffd090, dim: true },
  ],
  ramps: [
    { id: 'walk-stair', rect: [70, 86, -28, -22], axis: 'x', from: 0, to: 8, stairs: true, height: 6, edges: { s: 'wall' }, floor: 0x3e4042, wall: 0x50545a },
    { id: 'tower-stair', rect: [134, 140, -16, 4], axis: 'z', from: 8, to: 0, stairs: true, height: 5, floor: 0x3a3a38, wall: 0x52524e },
    { id: 'roof-stair', rect: [137, 143, 72, 90], axis: 'z', from: 0, to: 10, stairs: true, height: 6, floor: 0x3a3a38, wall: 0x52524e },
  ],
  // The fortress's mass: the keep between the yard and the ward, the tower under its roof.
  blocks: [{ rect: [118, 162, 94, 134], y0: 0, y1: 9.5, wall: 0x50545a }],
  bonfires: [{ id: 'salt-gate', x: 13.5, z: -4.3, spawn: { x: 11.5, z: -3, yaw: Math.PI / 2 } },
             { id: 'salt-tower', x: 140, y: 8, z: -28.5, spawn: { x: 138, y: 8, z: -26.5, yaw: 0 } },
             { id: 'salt-stair', x: 133.5, z: 70.5, spawn: { x: 135.5, z: 69, yaw: 0 } }],
  gated: [
    { id: 'zone-yard', trigger: [18, 52, -14, 14], gate: { x: 33, z: -14, along: 'x', width: 6 },
      enemies: [{ enemy: 'saltKnight', spawn: { x: 34, z: -6, yaw: -Math.PI / 2 } }, { enemy: 'lanternThrall', variant: 'elite', spawn: { x: 40, z: 6, yaw: -Math.PI / 2 } },
                { enemy: 'warden', spawn: { x: 46, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'saltKnight', spawn: { x: 30, z: 8, yaw: Math.PI } }] },
    { id: 'zone-rampart', trigger: [86, 130, -28, -22], gate: { x: 130, z: -25, y: 8, along: 'z', width: 6 },
      enemies: [{ enemy: 'shover', spawn: { x: 108, y: 8, z: -25, yaw: -Math.PI / 2 } }, { enemy: 'saltKnight', spawn: { x: 122, y: 8, z: -25, yaw: -Math.PI / 2 } }] },
    { id: 'zone-ward', trigger: [122, 160, 6, 34], gate: { x: 140, z: 34, along: 'x', width: 6 },
      enemies: [{ enemy: 'saltKnight', spawn: { x: 140, z: 18, yaw: Math.PI } }, { enemy: 'duelist', spawn: { x: 130, z: 24, yaw: Math.PI } },
                { enemy: 'duelist', spawn: { x: 150, z: 24, yaw: Math.PI } }, { enemy: 'saltKnight', variant: 'elite', spawn: { x: 140, z: 29, yaw: Math.PI } }] },
    { id: 'zone-statues', trigger: [128, 152, 38, 58], gate: { x: 140, z: 58, along: 'x', width: 6 },
      enemies: [{ enemy: 'warden', spawn: { x: 140, z: 53, yaw: Math.PI } }, { enemy: 'saltKnight', variant: 'elite', spawn: { x: 132, z: 46, yaw: Math.PI } },
                { enemy: 'saltKnight', spawn: { x: 148, z: 44, yaw: Math.PI } }] },
    // The tower roof: both castellans at once. When one falls the other takes up her half (their `alone` phase).
    { id: 'zone-castellans', trigger: [118, 162, 95, 134], gate: { x: 140, z: 134, y: 10, along: 'x', width: 6 },
      enemies: [{ enemy: 'hale', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['helm', 'whole'] }, spawn: { x: 134, y: 10, z: 121, yaw: Math.PI } },
                { enemy: 'harrow', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['greaves', 'whole'] }, spawn: { x: 146, y: 10, z: 121, yaw: Math.PI } }] },
  ],
  sealed: [{ id: 'great-gate', gate: { x: 52, z: 0, along: 'z', width: 6 } },
           { id: 'castellans-fog', gate: { x: 140, z: 94, y: 10, along: 'x', width: 6 }, fog: 'zone-castellans' }],
  dispersed: [
    { behavior: 'sentry', enemy: 'castleBowman', notice: 21, leash: 34, wide: true, zone: 'zone-yard', x: 32, y: 7, z: 16.5, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 21, leash: 34, wide: true, zone: 'zone-yard', x: 44, y: 7, z: 16.5, yaw: Math.PI },
    { behavior: 'perch', enemy: 'gargoyle', x: 50, y: 4, z: -20.5, yaw: Math.PI },
    { behavior: 'perch', enemy: 'gargoyle', x: 61, y: 4, z: -20.5, yaw: Math.PI },
    { behavior: 'patrol', enemy: 'saltKnight', z: -25.5, path: [38, 64] },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-rampart', x: 127, y: 8, z: -23.5, yaw: -Math.PI / 2 },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-ward', x: 162, y: 6, z: 14, yaw: -Math.PI / 2 },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 30, leash: 40, wide: true, zone: 'zone-ward', x: 162, y: 6, z: 24, yaw: -Math.PI / 2 },
  ],
  hints: [{ kind: 'corpse', x: 47, z: -24.5, yaw: 0.8 }, { kind: 'corpse', x: 58.5, z: -26, yaw: 2.1 }],
  devJumps: [
    { name: 'L8: Bonfire 2 (tower)', at: 'salt-tower', won: ['zone-yard', 'zone-rampart'] },
    { name: 'L8: Bonfire 3 (the castellans\' fog)', at: 'salt-stair', won: ['zone-yard', 'zone-rampart', 'zone-ward', 'zone-statues'] },
  ],
};
