'use strict';
// Test Grounds: heights. A walled yard open to the sky; east of it a trench with no floor (a pit). A smooth
// ramp climbs to a terrace (4 m) whose west edge drops into the trench, an open walkway crosses back over the
// trench and ends 4 m above the yard (a safe drop). Stairs climb on to a landing (10 m): from there a railed
// walkway crosses the trench and carries on, unrailed, over the yard (a 10 m drop hurts). More stairs reach a
// tower (15 m) whose sky-walk runs back over the trench and the yard: falling from it is death either way.
// A hole in the yard floor (north-east) is a pit too.
const TEST_HEIGHTS = {
  id: 'test-heights', layout: 'rooms',
  name: 'Test: Heights',
  description: 'Ramps, stairs, rails, open edges, pits and fall damage.',
  help: 'Test: heights. Drops above 4.5 m hurt, 14 m kills, and the trench and the hole have no floor. Enemies stop at edges.',
  wallHeight: 8, gateHeight: 5.6, gateThickness: 0.5,
  atmosphere: { background: 0x1a1c22, fog: 0x23262e, fogDensity: 0.012,
                moon: { color: 0xc8cfe0, intensity: 2.4, position: [-10, 20, 8] },
                ambient: { color: 0x5a6070, intensity: 1.4 }, hemi: { sky: 0x8a93a8, ground: 0x2a241c, intensity: 0.6 } },
  start: { x: 5, z: -10, yaw: Math.PI / 2 },
  rooms: [
    { id: 'yard', rect: [0, 30, -20, 40], open: true, height: 6, pits: [[20, 23, 30, 33]],
      floor: 0x3a3733, wall: 0x4a453e, light: 0xffb070, braziers: [[2, -2], [28, 38]] },
    { id: 'terrace', rect: [46, 58, -20, 0], y: 4, open: true, height: 6, edges: { w: 'open', n: 'rail' },
      floor: 0x34383a, wall: 0x454a4c, light: 0x9ab4d0 },
    { id: 'walk-pit', rect: [30, 46, -6, -3], y: 4, open: true, height: 4, edges: { n: 'open', s: 'open', w: 'open' },
      floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'landing', rect: [73, 81, -20, 20], y: 10, open: true, height: 6, edges: { w: 'rail' },
      floor: 0x3a3440, wall: 0x4a4252, light: 0xc0a0ff },
    { id: 'walk-rail', rect: [30, 73, 14, 17], y: 10, open: true, height: 4, edges: { n: 'rail', s: 'rail' },
      floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'walk-open', rect: [6, 30, 14, 17], y: 10, open: true, height: 4, edges: { n: 'open', s: 'open', w: 'open' },
      floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'tower', rect: [73, 81, 32, 40], y: 15, open: true, height: 5, edges: { w: 'rail' },
      floor: 0x3a3440, wall: 0x4a4252, light: 0xffd080 },
    { id: 'sky-walk', rect: [6, 73, 34, 37], y: 15, open: true, height: 4, edges: { n: 'open', s: 'open', w: 'open' },
      floor: 0x4a4030, wall: 0x5a5040 },
  ],
  // Ramps rise along `axis` from `from` (west or south end) to `to`; stairs look stepped but walk like a slope.
  ramps: [
    { id: 'ramp', rect: [30, 46, -20, -14], axis: 'x', from: 0, to: 4, edges: { n: 'rail' }, floor: 0x3a3733, wall: 0x4a453e },
    { id: 'stairs', rect: [58, 73, -20, -14], axis: 'x', from: 4, to: 10, stairs: true, edges: { n: 'rail' }, floor: 0x34383a, wall: 0x454a4c },
    { id: 'tower-stairs', rect: [73, 81, 20, 32], axis: 'z', from: 10, to: 15, stairs: true, edges: { w: 'rail' }, floor: 0x3a3440, wall: 0x4a4252 },
  ],
  bonfires: [{ id: 'heights-yard', x: 3, z: -17, spawn: { x: 5, z: -14, yaw: Math.PI / 2 } },
             { id: 'heights-landing', x: 78, z: 17, spawn: { x: 77, z: 12, yaw: -Math.PI / 2 } }],
  gated: [],
  dispersed: [
    { behavior: 'patrol', enemy: 'hollow', z: -4.5, path: [33, 43] },     // on the open walkway over the trench
    { behavior: 'patrol', enemy: 'hollow', z: -10, path: [48, 56] },      // on the terrace
    { behavior: 'slumber', enemy: 'knight', x: 77, z: 0, yaw: -Math.PI / 2 },
  ],
};
