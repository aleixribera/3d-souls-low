'use strict';
// Test Grounds: the Level 3 enemies together. An open hall holds a Lancer, a Duelist, an Executioner and a
// Shover (two attack tokens), and two Rampart Bowmen keep watch from a railed gallery 5 m above its north side,
// out of reach: they shoot down whenever they have a line, token or not. A preview of the Tower's courtyard.
const TEST_MIXED = {
  id: 'test-mixed', layout: 'rooms', alert: true, attackTokens: 2,
  name: 'Test: Mixed Crowd',
  description: 'Lancer, Duelist, Executioner and Shover at once, with two Bowmen shooting down from a gallery.',
  help: 'Test: the new enemies together. Two attack at a time; the bowmen above shoot regardless.',
  wallHeight: 8, gateHeight: 5.6, gateThickness: 0.5,
  atmosphere: { background: 0x2a2a34, fog: 0x3a3a46, fogDensity: 0.016,
                moon: { color: 0xffc8a0, intensity: 2.0, position: [-20, 12, -14] },
                ambient: { color: 0x5a5868, intensity: 1.15 }, hemi: { sky: 0x9a98b0, ground: 0x2a2418, intensity: 0.6 },
                exposure: 1.0, ash: 0.5, rim: 0xffd6b0, sky: { zenith: 0x2a2c3e, sun: 0xff9a60, sunDir: [-0.7, 0.18, -0.5] } },
  start: { x: 5, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'entry', rect: [0, 10, -5, 5], height: 7, floor: 0x3a3733, wall: 0x4a453e, light: 0xffb070 },
    { id: 'hall', rect: [10, 50, -16, 16], open: true, height: 6, floor: 0x3c3a34, wall: 0x4e4a42, light: 0xffc890,
      lamps: [[12, -14], [48, -14], [12, 14], [48, 14]] },
    { id: 'gallery', rect: [14, 46, 16, 20], y: 5, open: true, height: 4, edges: { s: 'rail' }, floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'exit', rect: [50, 56, -3, 3], height: 6, floor: 0x4a4030, wall: 0x5a5040, light: 0xffd080, dim: true },
  ],
  bonfires: [{ id: 'mixed-fire', x: 2.5, z: -3.5, spawn: { x: 5, z: -1.5, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-mixed', trigger: [12, 50, -16, 16], gate: { x: 50, z: 0, along: 'z', width: 6 },
      enemies: [{ enemy: 'shover', spawn: { x: 30, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'lancer', spawn: { x: 34, z: -7, yaw: -Math.PI / 2 } },
                { enemy: 'duelist', spawn: { x: 36, z: 7, yaw: -Math.PI / 2 } }, { enemy: 'executioner', spawn: { x: 43, z: 0, yaw: -Math.PI / 2 } }] },
  ],
  // Lookouts on the gallery: they see far and belong to no zone (the gate opens without them).
  dispersed: [
    { behavior: 'sentry', enemy: 'bowman', x: 22, z: 18.5, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'bowman', x: 38, z: 18.5, yaw: Math.PI },
  ],
};
