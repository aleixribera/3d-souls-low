'use strict';
// Test Grounds: a big open courtyard under a dusk sky, for open rooms and culling. Grass, distant ruins and
// eight lit lamps around the courtyard; long corridors lead to roofed halls far away. Twelve enemies: a crowd
// of six holds the courtyard (its gate opens on the east hall), six more wait in the halls. With `cull`, a
// fixed pool of lights follows the nearest of the level's eighteen light sources, and the far, unaware
// enemies sleep until you come near.
const TEST_COURTYARD = {
  id: 'test-courtyard', layout: 'rooms', cull: true, alert: true,
  name: 'Test: Courtyard',
  description: 'A big open courtyard with twelve enemies, grass, sky and many lights: open rooms and culling.',
  help: 'Test: open rooms and culling. Far, unaware enemies sleep; only the nearest lights are real.',
  wallHeight: 8, gateHeight: 5.6, gateThickness: 0.5,
  atmosphere: { background: 0x2a2a34, fog: 0x3a3a46, fogDensity: 0.014,
                moon: { color: 0xffc8a0, intensity: 2.0, position: [-20, 12, -14] },
                ambient: { color: 0x5a5868, intensity: 1.1 },
                hemi: { sky: 0x9a98b0, ground: 0x2a2418, intensity: 0.6 },
                exposure: 1.0, ash: 0.6, dust: 0.2, rim: 0xffd6b0, surface: { moss: 0.5, grime: 1 },
                sky: { zenith: 0x2a2c3e, sun: 0xff9a60, sunDir: [-0.7, 0.18, -0.5] }, silhouettes: 3, grass: 1 },
  start: { x: 4, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'gate-room', rect: [0, 12, -6, 6], height: 7, floor: 0x3a3733, wall: 0x4a453e, light: 0xffb070 },
    { id: 'courtyard', rect: [12, 72, -24, 24], open: true, height: 9, grass: true,
      floor: 0x3c3a34, wall: 0x4e4a42, light: 0xffc890,
      pillars: [[30, -8], [30, 8], [54, -8], [54, 8]],
      lamps: [[16, -20], [16, 20], [34, -22], [34, 22], [52, -22], [52, 22], [68, -20], [68, 20]] },
    { id: 'n-corridor', rect: [40, 44, 24, 40], height: 5, floor: 0x2f3433, wall: 0x3a403f, light: 0x8c80d0, dim: true },
    { id: 'n-hall', rect: [30, 54, 40, 56], height: 7, floor: 0x283622, wall: 0x38462e, light: 0x9ad860, pillars: [[34, 44], [50, 52]] },
    { id: 's-corridor', rect: [40, 44, -40, -24], height: 5, floor: 0x2f3433, wall: 0x3a403f, light: 0x8c80d0, dim: true },
    { id: 's-hall', rect: [30, 54, -56, -40], height: 7, floor: 0x1f3238, wall: 0x2c434b, light: 0x6fc8c0, pillars: [[34, -52], [50, -44]] },
    { id: 'e-corridor', rect: [72, 80, -2, 2], height: 5, floor: 0x2f3433, wall: 0x3a403f, light: 0xd06050, dim: true },
    { id: 'e-hall', rect: [80, 104, -14, 14], height: 8, floor: 0x37211f, wall: 0x4a2b27, light: 0xff7a50, braziers: [[102, -12], [102, 12]] },
  ],
  bonfires: [{ id: 'courtyard-gate', x: 2.5, z: -4, spawn: { x: 5, z: -2, yaw: Math.PI / 2 } },
             { id: 'courtyard-east', x: 90, z: -12, spawn: { x: 90, z: -9, yaw: Math.PI } }],
  gated: [
    { id: 'zone-courtyard', trigger: [14, 72, -24, 24], gate: { x: 72, z: 0, along: 'z', width: 4 },
      enemies: [{ enemy: 'hollow', spawn: { x: 50, z: -6, yaw: -Math.PI / 2 } }, { enemy: 'hollow', spawn: { x: 50, z: 6, yaw: -Math.PI / 2 } },
                { enemy: 'hollow', spawn: { x: 56, z: -12, yaw: -Math.PI / 2 } }, { enemy: 'hollow', spawn: { x: 56, z: 12, yaw: -Math.PI / 2 } },
                { enemy: 'rogue', spawn: { x: 60, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'warden', spawn: { x: 64, z: 4, yaw: -Math.PI / 2 } }] },
  ],
  dispersed: [
    { behavior: 'patrol', enemy: 'hollow', z: 48, path: [33, 51] },
    { behavior: 'slumber', enemy: 'rogue', x: 45, z: 53, yaw: Math.PI },
    { behavior: 'patrol', enemy: 'hollow', z: -48, path: [33, 51] },
    { behavior: 'slumber', enemy: 'knight', x: 42, z: -52, yaw: 0 },
    { behavior: 'patrol', enemy: 'hollow', z: 6, path: [84, 100] },
    { behavior: 'slumber', enemy: 'hollow', x: 96, z: -6, yaw: -Math.PI / 2 },
  ],
};
