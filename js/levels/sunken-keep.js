'use strict';
// Room-style levels: walkable rectangles `rect: [x0, x1, z0, z1]` that touch edge to edge. Walls are
// built around the union automatically; a shared edge is an open doorway. Gated zones trigger when the
// player enters `trigger` (a rect); `gate` sits in a doorway (`along`: the axis its bars span), and it
// lifts once every enemy of the zone is dead. `alert`: an enemy that notices the player wakes others nearby.
const LEVEL_2 = {
  id: 'sunken-keep', layout: 'rooms', alert: true,
  next: 'burning-town',   // once complete, carry on out into the burning town
  name: 'Level 2: The Sunken Keep',
  description: 'Winding rooms and corridors. Shield Wardens hold the doors, and some foes fight in pairs.',
  help: 'Level 2: win each room\'s fight to open its gate; paired foes open it only when both fall. An enemy that spots you alerts those nearby.',
  wallHeight: 8, gateHeight: 5.6, gateThickness: 0.5,
  // Damp, green-grey and murky, light falling through the broken ceilings.
  // v6.0: the braziers of the great rooms burn (lit lamps), lamps along every corridor, the murk thinned a little.
  // (pass 172, the cel redo) It was one green-grey murk, its long corridors of one stone. Now the base is a neutral damp
  // grey under exposure 1 and each wing has its own light (`areas`): the vestibule warm under its brazier, the cistern a
  // cold teal over black water, the chapel violet, the oath hall candle-gold, the moss hall green, the throne a low red.
  // Pale dressed stone on the walls, floors a clear step darker, so the road reads in the cel bands.
  atmosphere: { background: 0x070a0a, fog: 0x1a2020, fogDensity: 0.022,
                moon: { color: 0xa8bab4, intensity: 1.35, position: [8, 14, -6] },
                ambient: { color: 0x3c4646, intensity: 1.25 },
                hemi: { sky: 0x6a7a78, ground: 0x161a16, intensity: 0.45 },
                exposure: 0.9, ash: 0.25, dust: 0.6, rim: 0xa8c4ba,
                grade: { shadowTint: [0.92, 1.0, 1.02], highlightTint: [1.04, 1.0, 0.94], saturation: 0.7, contrast: 1.1 },
                surface: { moss: 0.8, grime: 1.1 },
                shafts: { rooms: true, color: 0xd4e6cc, opacity: 0.2 },
                banners: [0x2c3a2a, 0x5a2420], debris: 0.35,
                areas: [
                  { rooms: ['vestibule', 'hall-1'], ambient: { color: 0x5a4a3c, intensity: 1.3 }, hemi: { sky: 0x7a6a5a, ground: 0x1e1610 },
                    fog: 0x221c18, exposure: 0.94, grade: { shadowTint: [0.94, 0.94, 1.04], highlightTint: [1.08, 0.98, 0.86] } },
                  { rooms: ['cistern', 'hall-2'], moon: { color: 0xa8c4c8, intensity: 1.5 }, ambient: { color: 0x34403f, intensity: 1.2 },
                    hemi: { sky: 0x5a8088, ground: 0x0e1618 }, fog: 0x14222a, exposure: 0.88, grade: { shadowTint: [0.9, 0.98, 1.06], saturation: 0.6 } },
                  { rooms: ['chapel'], moon: { color: 0xc4bcdc, intensity: 1.4 }, ambient: { color: 0x3e3a48, intensity: 1.2 },
                    hemi: { sky: 0x7a6a98, ground: 0x18121e }, fog: 0x1e1a28, exposure: 0.9, grade: { shadowTint: [0.95, 0.93, 1.06], saturation: 0.6 } },
                  { rooms: ['shrine-hall'], moon: { color: 0xffe0b0, intensity: 1.2 }, ambient: { color: 0x584634, intensity: 1.35 },
                    fog: 0x241e16, exposure: 0.94, grade: { highlightTint: [1.1, 1.0, 0.84] } },
                  { rooms: ['moss-hall', 'hall-4'], moon: { color: 0xc4d4b0, intensity: 1.5 }, ambient: { color: 0x384036, intensity: 1.2 },
                    hemi: { sky: 0x7a9068, ground: 0x141a10 }, fog: 0x1a2416, exposure: 0.9, grade: { shadowTint: [0.94, 1.0, 0.96], saturation: 0.6 } },
                  { rooms: ['throne', 'exit'], moon: { color: 0xd8b4a4, intensity: 1.4 }, ambient: { color: 0x463430, intensity: 1.2 },
                    hemi: { sky: 0x7a5048, ground: 0x1e0e0a }, fog: 0x261614, exposure: 0.9,
                    grade: { shadowTint: [0.96, 0.9, 1.0], highlightTint: [1.08, 0.98, 0.88], saturation: 0.62 } },
                ] },
  start: { x: 5, z: 0, yaw: Math.PI / 2 },
  lessons: [{ lesson: 'shield', when: { enemy: 'warden' } }],   // v7.19.0: the first raised shield (js/data/lessons.js)
  rooms: [
    { id: 'vestibule', rect: [0, 20, -8, 8], floor: 0x2c2826, wall: 0x7a7268, light: 0xf0b080, lamps: [[18, -6.5], [18, 6.5]], braziers: [[2, 6.5]] },
    { id: 'hall-1', rect: [20, 34, -4, 4], floor: 0x262a2a, wall: 0x6a706c, light: 0x9ab8b0, dim: true, lamps: [[27, -3.2]] },
    { id: 'cistern', rect: [34, 58, -11, 11], floor: 0x1a2628, wall: 0x66787a, light: 0xa8bcbc,
      pillars: [[40, -6], [40, 6], [52, -6], [52, 6]], lamps: [[56.5, -9.5], [35.5, 9.5]], braziers: [[35.5, -9.5]] },
    { id: 'hall-2', rect: [42, 50, 11, 30], floor: 0x262a2a, wall: 0x6a706c, light: 0xaaa8b8, dim: true, lamps: [[49.2, 20]] },
    { id: 'chapel', rect: [34, 66, 30, 54], floor: 0x28222e, wall: 0x76707e, light: 0xbcb4cc,
      pillars: [[38, 34], [38, 50], [62, 34], [62, 50]], lamps: [[50, 52.5], [35.5, 42]], braziers: [[64.5, 52.5]] },
    { id: 'shrine-hall', rect: [66, 90, 37, 47], floor: 0x2e2820, wall: 0x86785e, light: 0xffb070, dim: true, lamps: [[72, 46.2], [84, 37.8]] },
    { id: 'moss-hall', rect: [90, 116, 28, 56], floor: 0x222a1c, wall: 0x6e7664, light: 0xbcc8a8,
      pillars: [[95, 33], [95, 51], [111, 33], [111, 51]], lamps: [[114.5, 42], [103, 54.5]], braziers: [[91.5, 54.5]] },
    { id: 'hall-4', rect: [99, 107, 8, 28], floor: 0x262a2a, wall: 0x6a706c, light: 0xc4a090, dim: true, lamps: [[99.8, 18]] },
    { id: 'throne', rect: [88, 130, -26, 8], floor: 0x2a1c1a, wall: 0x7a5e54, light: 0xf0a080,
      pillars: [[94, -20], [94, 2], [124, -20], [124, 2]], lamps: [[128.5, -10], [128.5, 6], [109, -24.5]], braziers: [[89.5, -24.5], [89.5, 6]] },
    { id: 'exit', rect: [130, 136, -4, 4], floor: 0x302a22, wall: 0x86785e, light: 0xffd080, dim: true, lamps: [[133, 3.3]] },
  ],
  // Bonfires: `spawn` is where resting (and dying) puts the player back.
  // A flask found on the road (pass 79, Game.updateLevel): in the hand of the dead by the wall.
  flaskFinds: [{ id: 'keep-pilgrim', x: 35.6, z: -9.0 }],
  giveAbility: { id: 'scarlet-draw', trigger: [66, 72, 37, 47] },   // the Seven's oath hall: Scarlet Draw (pass 159)
  bonfires: [{ id: 'keep-start', x: 3.5, z: -5.5, spawn: { x: 5, z: -3.4, yaw: Math.PI / 2 } },
             { id: 'keep-shrine', x: 78, z: 45, spawn: { x: 78, z: 42.4, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-cistern', trigger: [36, 58, -11, 11], gate: { x: 46, z: 11, along: 'x', width: 8 },
      enemies: [{ enemy: 'warden', spawn: { x: 50, z: 3, yaw: -Math.PI / 2 } }] },
    { id: 'zone-chapel', trigger: [34, 66, 32, 54], gate: { x: 66, z: 42, along: 'z', width: 10 },
      enemies: [{ enemy: 'hollow', spawn: { x: 50, z: 44, yaw: Math.PI } },
                { enemy: 'rogue', behavior: 'slumber', spawn: { x: 57, z: 48, yaw: Math.PI } }] },
    { id: 'zone-moss', trigger: [92, 116, 28, 56], gate: { x: 103, z: 28, along: 'x', width: 8 },
      enemies: [{ enemy: 'knight', spawn: { x: 106, z: 40, yaw: -Math.PI / 2 } }] },
    { id: 'zone-throne', trigger: [88, 130, -26, 6], gate: { x: 130, z: 0, along: 'z', width: 8 },
      enemies: [{ enemy: 'knight', spawn: { x: 104, z: -13, yaw: 0 } },
                { enemy: 'warden', behavior: 'slumber', spawn: { x: 112, z: -12, yaw: -Math.PI / 2 } }] },
  ],
  dispersed: [
    { behavior: 'patrol', enemy: 'hollow', z: 4.5, path: [14.5, 18.5] },
  ],
};
