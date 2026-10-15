'use strict';
// Test Grounds: a corner of a burning town at sunset, for the town's pieces (houses, props, barricades, the far
// castle). x runs east, z north. A square (40 x 32 m) with a fountain, a well, a cart, market stalls and crates,
// its west side shut by the town gate (sealed); a street east of it, held by two Hollows behind a barricade; a yard
// beyond with a small chapel standing free in it. An inn on the square's north side can be entered by its door.
const TEST_TOWN = {
  id: 'test-town', layout: 'rooms', cull: true, alert: true,
  name: 'Test: Town',
  description: 'A town square, a street and a yard: houses, props, a barricade and the far castle.',
  help: 'Test: the town. Props block you and your foes; the barricade falls when the street is won.',
  wallHeight: 9, gateHeight: 3.4, gateThickness: 0.5,
  atmosphere: LEVEL_3.atmosphere,   // the Burning Town's sunset, smoke, embers and far castle
  start: { x: 4, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'square', rect: [0, 40, -16, 16], open: true, height: 6, floor: 0x4a4440, wall: 0x6a6258, light: 0xffb070 },
    { id: 'street', rect: [40, 72, -4, 4], open: true, height: 6, floor: 0x46403a, wall: 0x6a6258 },
    { id: 'yard', rect: [72, 86, -8, 8], open: true, height: 6, floor: 0x46403a, wall: 0x6a6258, light: 0xffa060 },
    { id: 'gate-arch', rect: [-4, 0, -3, 3], height: 5, floor: 0x3a3733, wall: 0x5a5248, dim: true },
    { id: 'inn-door', rect: [12, 14, 16, 17], height: 3.2, floor: 0x3a3028, wall: 0x8a7a60, dim: true },
    { id: 'inn-hall', rect: [7, 19, 17, 27], height: 3.6, floor: 0x3a3028, wall: 0x8a7a60, light: 0xffa050 },
  ],
  // Houses: rect, eaves height, ridge direction; `stone`, `burning`, `ruined`, `lit` (share of glowing windows); a
  // tower; `rooms`: the regions inside an enterable one (the inn, the gatehouse over the town gate).
  houses: [
    { rect: [-12, 0, -16, -3], eaves: 8, ridge: 'z', stone: true },
    { rect: [-12, 0, -3, 3], eaves: 9, ridge: 'z', stone: true, rooms: ['gate-arch'] },
    { rect: [-12, 0, 3, 16], eaves: 8, ridge: 'z', stone: true },
    { rect: [0, 6, 16, 26], eaves: 7, ridge: 'z' },
    { rect: [6, 20, 16, 28], eaves: 7, ridge: 'x', rooms: ['inn-door', 'inn-hall'], lit: 0.7 },
    { rect: [20, 30, 16, 27], eaves: 8, ridge: 'z', burning: true },
    { kind: 'tower', rect: [30, 36, 16, 22], eaves: 16 },
    { rect: [36, 40, 16, 26], eaves: 7.5, ridge: 'z' },
    { rect: [40, 52, 4, 16], eaves: 7, ridge: 'x' },
    { rect: [40, 50, -16, -4], eaves: 6.5, ridge: 'x', ruined: true },
    { rect: [0, 12, -28, -16], eaves: 7, ridge: 'x' },
    { rect: [12, 26, -28, -16], eaves: 10, ridge: 'x', stone: true },
    { rect: [26, 40, -27, -16], eaves: 7.5, ridge: 'x', lit: 0.6 },
    { rect: [52, 62, 4, 13], eaves: 7, ridge: 'z', burning: true },
    { rect: [62, 72, 4, 14], eaves: 6.5, ridge: 'z' },
    { rect: [50, 61, -13, -4], eaves: 7, ridge: 'z' },
    { rect: [61, 72, -14, -4], eaves: 8, ridge: 'z' },
    { rect: [72, 86, 8, 18], eaves: 7, ridge: 'x' },
    { rect: [72, 86, -18, -8], eaves: 7, ridge: 'x', burning: true },
    { rect: [86, 96, -8, 8], eaves: 9, ridge: 'z', stone: true },
    { rect: [78, 82, -2, 2], eaves: 4.5, ridge: 'x', stone: true },   // the chapel, standing free in the yard
  ],
  props: [
    { kind: 'fountain', x: 20, z: 0 },
    { kind: 'well', x: 8, z: 8 },
    { kind: 'cart', x: 28, z: 9 },
    { kind: 'stall', x: 28, z: -9 },
    { kind: 'brokenStall', x: 34, z: -10 },
    { kind: 'crates', x: 14, z: -10 },
    { kind: 'heap', x: 34, z: 10, yaw: Math.PI / 2 },
  ],
  bonfires: [{ id: 'town-square', x: 3, z: -12, spawn: { x: 5, z: -9.5, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-street', trigger: [40, 72, -4, 4], gate: { x: 72, z: 0, along: 'z', width: 8, style: 'barricade' },
      enemies: [{ enemy: 'hollow', spawn: { x: 64, z: -2, yaw: -Math.PI / 2 } }, { enemy: 'hollow', spawn: { x: 64, z: 2, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'town-gate', gate: { x: -0.5, z: 0, along: 'z', width: 6 } }],
  dispersed: [],
};
