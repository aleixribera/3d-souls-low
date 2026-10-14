'use strict';
// Test Grounds: one wide room with a crowd, for attack tokens and surrounding. Five Hollows stand in an
// arc; with the default two tokens, three of them circle while two attack.
const TEST_CROWD = {
  id: 'test-crowd', layout: 'rooms',
  name: 'Test: Crowd',
  description: 'Five Hollow Soldiers at once. Only two attack at a time; the rest circle.',
  help: 'Test: attack tokens. Watch the waiting enemies keep to your sides and back.',
  wallHeight: 8, gateHeight: 5.6, gateThickness: 0.5,
  start: { x: 6, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'yard', rect: [0, 40, -16, 16], floor: 0x3a3733, wall: 0x4a453e, light: 0xffa060,
      braziers: [[38, -14], [38, 14], [2, 14]] },
    { id: 'exit', rect: [40, 46, -3, 3], floor: 0x4a4030, wall: 0x5a5040, light: 0xffd080, dim: true },
  ],
  bonfires: [{ id: 'crowd-fire', x: 3, z: -13, spawn: { x: 5, z: -10.5, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-crowd', trigger: [10, 40, -16, 16], gate: { x: 40, z: 0, along: 'z', width: 6 },
      enemies: [-8, -4, 0, 4, 8].map(z => ({ enemy: 'hollow', spawn: { x: 26 - Math.abs(z) * 0.5, z, yaw: -Math.PI / 2 } })) },
  ],
  dispersed: [],
};
