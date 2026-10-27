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
  atmosphere: { background: 0x060a08, fog: 0x18221d, fogDensity: 0.026,
                moon: { color: 0x9dbaa8, intensity: 1.35, position: [8, 14, -6] },
                ambient: { color: 0x40524a, intensity: 1.55 },
                hemi: { sky: 0x6f8a78, ground: 0x141a12, intensity: 0.45 },
                exposure: 1.12, ash: 0.25, dust: 0.6, rim: 0x9cc4ae,
                grade: { shadowTint: [0.9, 1.03, 0.98], highlightTint: [1.06, 1.02, 0.9], saturation: 0.7 },
                surface: { moss: 0.95, grime: 1.25 },
                shafts: { rooms: true, color: 0xd4e6cc, opacity: 0.2 },
                banners: [0x2c3a2a, 0x3a2420], debris: 0.35 },
  start: { x: 5, z: 0, yaw: Math.PI / 2 },
  lessons: [{ lesson: 'shield', when: { enemy: 'warden' } }],   // v7.19.0: the first raised shield (js/data/lessons.js)
  rooms: [
    { id: 'vestibule', rect: [0, 20, -8, 8], floor: 0x3a3733, wall: 0x4a453e, light: 0xffa060, lamps: [[18, -6.5], [18, 6.5]], braziers: [[2, 6.5]] },
    { id: 'hall-1', rect: [20, 34, -4, 4], floor: 0x2f3433, wall: 0x3a403f, light: 0x6fc8c0, dim: true, lamps: [[27, -3.2]] },
    { id: 'cistern', rect: [34, 58, -11, 11], floor: 0x1f3238, wall: 0x2c434b, light: 0x5fd0e0,
      pillars: [[40, -6], [40, 6], [52, -6], [52, 6]], lamps: [[56.5, -9.5], [35.5, 9.5]], braziers: [[35.5, -9.5]] },
    { id: 'hall-2', rect: [42, 50, 11, 30], floor: 0x2f3433, wall: 0x3a403f, light: 0x8c80d0, dim: true, lamps: [[49.2, 20]] },
    { id: 'chapel', rect: [34, 66, 30, 54], floor: 0x342b3c, wall: 0x463a52, light: 0xb08cff,
      pillars: [[38, 34], [38, 50], [62, 34], [62, 50]], lamps: [[50, 52.5], [35.5, 42]], braziers: [[64.5, 52.5]] },
    { id: 'shrine-hall', rect: [66, 90, 37, 47], floor: 0x3a3428, wall: 0x4a4234, light: 0xffb070, dim: true, lamps: [[72, 46.2], [84, 37.8]] },
    { id: 'moss-hall', rect: [90, 116, 28, 56], floor: 0x283622, wall: 0x38462e, light: 0x9ad860,
      pillars: [[95, 33], [95, 51], [111, 33], [111, 51]], lamps: [[114.5, 42], [103, 54.5]], braziers: [[91.5, 54.5]] },
    { id: 'hall-4', rect: [99, 107, 8, 28], floor: 0x2f3433, wall: 0x3a403f, light: 0xd06050, dim: true, lamps: [[99.8, 18]] },
    { id: 'throne', rect: [88, 130, -26, 8], floor: 0x37211f, wall: 0x4a2b27, light: 0xff5a40,
      pillars: [[94, -20], [94, 2], [124, -20], [124, 2]], lamps: [[128.5, -10], [128.5, 6], [109, -24.5]], braziers: [[89.5, -24.5], [89.5, 6]] },
    { id: 'exit', rect: [130, 136, -4, 4], floor: 0x4a4030, wall: 0x5a5040, light: 0xffd080, dim: true, lamps: [[133, 3.3]] },
  ],
  // Bonfires: `spawn` is where resting (and dying) puts the player back.
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
