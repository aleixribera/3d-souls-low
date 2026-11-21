'use strict';
// Level 8: Saltgrave (v7.40.0), chapter 8 of the Story (STORY.md 10d): Thrale's border fortress, on a cliff
// over the sea, in the rain. Rough (PLAN.md stage 3, track A): built from the old second road's castle level
// (removed in v7.54.0) as raw material, its layout kept, every name and character of that road gone.
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
  wallHeight: 10, gateHeight: 3.4, gateThickness: 0.5,
  // Night, a storm off the sea: heavy rain, lightning, wet blue-grey stone, sea-grey and salt-white banners.
  // (pass 172, the cel redo) It was one blue, walls and floors alike. Now the storm is a darker slate under exposure 1
  // and the fortress's rooms each have their own light (`areas`): the gatehouse, the tower and the stair room warm
  // under their braziers, the inner ward a grey-green dusk, the hall of statues a pale cold violet, the roof the open
  // storm. Pale wet limestone on the walls, floors a clear step darker.
  atmosphere: { background: 0x161c24, fog: 0x2c3640, fogDensity: 0.0135,
                moon: { color: 0xb8c8e0, intensity: 2.2, position: [10, 30, -20] },
                ambient: { color: 0x3e4858, intensity: 1.3 },
                hemi: { sky: 0x7a88a0, ground: 0x1e2026, intensity: 0.65 },
                exposure: 0.9, dust: 0.1, rim: 0xb8c8e0,
                grade: { shadowTint: [0.88, 0.95, 1.1], highlightTint: [1.02, 1.0, 0.96], saturation: 0.64, contrast: 1.1 },
                surface: { moss: 0.8, grime: 1.1 }, banners: [0x2a4a48, 0xb8b4a8], debris: 0.25,
                shafts: { rooms: true, color: 0xc8d8e8, opacity: 0.12 },
                sky: { zenith: 0x0e1218, sun: 0x8a98b0, sunDir: [0.4, 0.3, -0.6] }, silhouettes: 2, grass: 0.5,
                areas: [
                  { rooms: ['gatehouse', 'tower', 'stair-room', 'stair-door'], moon: { color: 0xc8c0b8, intensity: 1.6 },
                    ambient: { color: 0x544638, intensity: 1.35 }, hemi: { sky: 0x8a7a6a, ground: 0x221812 }, fog: 0x2a2420, exposure: 0.94,
                    grade: { shadowTint: [0.94, 0.94, 1.04], highlightTint: [1.08, 0.98, 0.88], saturation: 0.7 } },
                  { rooms: ['ward', 'east-gallery', 'tower-stair'], moon: { color: 0xc0d0c0, intensity: 2.3 }, ambient: { color: 0x3e4a44, intensity: 1.3 },
                    hemi: { sky: 0x7a9088, ground: 0x1a2018 }, fog: 0x2a3430, exposure: 0.92, grade: { shadowTint: [0.9, 1.0, 1.0], saturation: 0.66 } },
                  { rooms: ['hall-door', 'statue-hall'], moon: { color: 0xd0c8e8, intensity: 1.8 }, ambient: { color: 0x4a4658, intensity: 1.4 },
                    hemi: { sky: 0x8a86a8 }, fog: 0x2a2836, exposure: 0.92, grade: { shadowTint: [0.92, 0.92, 1.1], saturation: 0.6 } },
                  { rooms: ['roof-stair', 'fog-landing', 'tower-roof', 'roof-exit'], moon: { intensity: 2.5 }, ambient: { color: 0x44506a, intensity: 1.35 },
                    fog: 0x303a48, exposure: 0.94, grade: { saturation: 0.62, contrast: 1.12 } },
                ] },
  realm: {
    lightning: { every: [4, 10], color: 0xd8e4ff },
    weather: [{ kind: 'rain', amount: 1.0 }],
    grounds: [{ kind: 'earth', rooms: ['cliff-walk', 'ward', 'side-passage'] }],
  },
  start: { x: 3, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'gatehouse', rect: [0, 16, -6, 6], height: 6, floor: 0x2e2a28, wall: 0x82786c, light: 0xffb070, braziers: [[1.5, -4.5], [1.5, 4.5]] },
    { id: 'main-yard', rect: [16, 52, -14, 14], open: true, height: 10, floor: 0x2e3236, wall: 0x7e8284, light: 0xb8c4d8,
      lamps: [[18, -12.5], [18, 12.5], [50, 12.5], [50, -12.5]] },
    { id: 'yard-rampart', rect: [24, 48, 14, 18], y: 7, open: true, height: 4, edges: { s: 'rail' }, floor: 0x3a3e42, wall: 0x868a8c },
    { id: 'barred-hall', rect: [52, 58, -3, 3], height: 5, floor: 0x2a2c30, wall: 0x6e7276, dim: true },
    { id: 'side-passage', rect: [30, 36, -22, -14], open: true, height: 8, floor: 0x2e3236, wall: 0x7e8284 },
    { id: 'cliff-walk', rect: [30, 70, -28, -22], open: true, height: 10, edges: { s: 'wall' }, floor: 0x2e3236, wall: 0x7e8284 },
    { id: 'wall-ledge', rect: [44, 66, -22, -19], y: 4, open: true, height: 4, edges: { s: 'open' }, floor: 0x3a3e42, wall: 0x868a8c },
    { id: 'rampart', rect: [86, 130, -28, -22], y: 8, open: true, height: 5, edges: { s: 'wall' }, floor: 0x3a3e42, wall: 0x868a8c, light: 0xc8d0e0,
      lamps: [[100, -23], [118, -23]] },
    { id: 'tower', rect: [130, 142, -30, -16], y: 8, height: 5, floor: 0x2e2a28, wall: 0x82786c, light: 0xffa060, braziers: [[131.5, -17.5], [140.5, -17.5]] },
    { id: 'ward', rect: [120, 160, 4, 34], open: true, height: 10, grass: true, floor: 0x2e3236, wall: 0x7e8284, light: 0xc8d0c0,
      pillars: [[126, 12], [154, 12], [126, 26], [154, 26]], lamps: [[122, 6], [158, 6], [122, 32], [158, 32]] },
    { id: 'east-gallery', rect: [160, 164, 8, 30], y: 6, open: true, height: 4, edges: { w: 'rail' }, floor: 0x3a3e42, wall: 0x868a8c },
    { id: 'hall-door', rect: [137, 143, 34, 38], height: 4.5, floor: 0x2a2c30, wall: 0x6e7276, dim: true },
    { id: 'statue-hall', rect: [128, 152, 38, 58], height: 7, floor: 0x2c2c32, wall: 0x8a8894, light: 0xa8b8c8,
      pillars: [[134, 48], [146, 48]], braziers: [[129.5, 39.5], [150.5, 39.5], [129.5, 56.5], [150.5, 56.5]] },
    { id: 'stair-door', rect: [137, 143, 58, 62], height: 4.5, floor: 0x2e2a28, wall: 0x82786c, dim: true },
    { id: 'stair-room', rect: [132, 148, 62, 72], height: 6, floor: 0x2e2a28, wall: 0x82786c, light: 0xffb070, braziers: [[146.5, 63.5], [146.5, 70.5]] },
    { id: 'fog-landing', rect: [137, 143, 90, 94], y: 10, height: 6, floor: 0x2e2a28, wall: 0x82786c, dim: true },
    // The tower roof: the beacon the castellans kept lit in the middle, and the stumps of the old turret's merlons, fallen
    // where the storms threw them: something to put between one sister and the other.
    { id: 'tower-roof', rect: [118, 162, 94, 134], y: 10, open: true, height: 14, edges: { e: 'rail', w: 'rail', n: 'rail' }, floor: 0x34383e, wall: 0x868a8c, light: 0xd8e0f0,
      lamps: [[120, 96], [160, 96], [120, 132], [160, 132]], braziers: [[140, 113]],
      pillars: [[127.5, 105, 2.8], [152.5, 105, 2.8], [126.5, 123.5, 2.6], [153.5, 123.5, 2.6], [140, 128.5, 2.4]], pillarHeight: 2.7 },
    { id: 'roof-exit', rect: [137, 143, 134, 138], y: 10, height: 4.5, floor: 0x2e2a28, wall: 0x82786c, light: 0xffd090, dim: true },
  ],
  ramps: [
    { id: 'walk-stair', rect: [70, 86, -28, -22], axis: 'x', from: 0, to: 8, stairs: true, height: 6, edges: { s: 'wall' }, floor: 0x2e3236, wall: 0x7e8284 },
    { id: 'tower-stair', rect: [134, 140, -16, 4], axis: 'z', from: 8, to: 0, stairs: true, height: 5, floor: 0x2e2a28, wall: 0x82786c },
    { id: 'roof-stair', rect: [137, 143, 72, 90], axis: 'z', from: 0, to: 10, stairs: true, height: 6, floor: 0x2e2a28, wall: 0x82786c },
  ],
  // The fortress's mass: the keep between the yard and the ward, the tower under its roof.
  blocks: [{ rect: [118, 162, 94, 134], y0: 0, y1: 9.5, wall: 0x7e8284 }],
  // (pass 172) The garrison's yards, no longer bare: weapon racks against the walls (Blender, tools/blender/castle_bits.py),
  // crates and a cart under the north rampart.
  props: [
    { kind: 'rack', x: 24, z: 12.8, yaw: Math.PI }, { kind: 'rack', x: 41, z: 12.8, yaw: Math.PI }, { kind: 'crates', x: 46, z: -12.5 },
    { kind: 'cart', x: 20, z: -11, yaw: Math.PI / 2 },
    { kind: 'rack', x: 122.8, z: 19, yaw: Math.PI / 2 }, { kind: 'rack', x: 148, z: 32.8, yaw: Math.PI }, { kind: 'crates', x: 157, z: 17 },
  ],
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
