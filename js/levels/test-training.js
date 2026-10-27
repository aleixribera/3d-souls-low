'use strict';
// Test: Training Room, the old Training Hall (v3.7 to v7.18) kept as an empty, well-lit room for trying moves and
// for the tests that need flat, quiet ground. The controls are taught inside Level 1 since v7.19.0 (js/lessons.js).
// Hall-style levels run along +X from x = 0 to `length`; z = 0 is the centre line.
const TEST_TRAINING = {
  id: 'test-training', layout: 'hall',
  name: 'Test: Training Room', description: 'An empty, well-lit hall: flat ground and no foes, for trying moves.',
  help: 'Test: an empty room. Nothing here fights back.',
  atmosphere: { background: 0x15171c, fog: 0x1c1f26, fogDensity: 0.014,
                moon: { color: 0xc8cfe0, intensity: 2.5, position: [-6, 14, 8] },
                ambient: { color: 0x6a6f80, intensity: 1.5 },
                hemi: { sky: 0x8a93a8, ground: 0x2a241c, intensity: 0.5 },
                exposure: 1.15, ash: 0.1, dust: 0.4, grade: { saturation: 0.92, contrast: 1.02 },
                surface: { moss: 0.15, grime: 0.7 }, banners: [0x5a4426, 0x3a2c4a],
                shafts: { every: 14, color: 0xc8d4e8, opacity: 0.16 } },
  length: 40, halfZ: 6, wallHeight: 7, gateHeight: 4.8, gateThickness: 0.5,
  start: { x: 5, z: 0, yaw: Math.PI / 2 }, bonfires: [{ id: 'training-fire', x: 9, z: -4 }],
  alcoveWidth: 0, alcoveDepth: 2, alcoves: [], gated: [], dispersed: [],
  torches: [{ x: 3, side: 1 }, { x: 14, side: 1 }, { x: 14, side: -1 }, { x: 26, side: -1 }, { x: 26, side: 1 }, { x: 36, side: 1 }, { x: 36, side: -1 }],
  braziers: [{ x: 37.5, z: 3.6 }, { x: 37.5, z: -3.6 }],
};
