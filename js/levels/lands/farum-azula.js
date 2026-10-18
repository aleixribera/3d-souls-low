'use strict';
// The Lands Between, 6: Crumbling Farum Azula (v7.0). Boss: Maliketh, the Black Blade. The dragons' city torn loose from
// time: ruins adrift in a storm at an endless sunset, a sea of cloud far below, a dragon circling, lightning in the clouds.
// Most edges are open: a fall is a fall into the clouds. x east, z north.
//   The arrival (bonfire 1; Seren's grace), a broken bridge to the temple steps (three Beastmen; a Gargoyle on a statue).
//   The ruin stair up to the colonnade (y 8): its floor crumbles under you wall to wall (a trap), and its far end is open
//   anyway: either way down into the lower ruin, among an Ashen Warrior and two Beastmen. The ruin ramp climbs out to
//   the wind terrace (bonfire 2), then its fight (Beastmen, an elite Crucible Squire, a Toll Wisp), the long dragon
//   bridge (no rail; Beastmen on it, an archer at its end), the spire stair to the spire landing (bonfire 3), the fog,
//   and the great bridge: the Beast Clergyman, and the Black Blade beneath his robes.
const LANDS_6 = {
  id: 'farum-azula', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  name: 'Lands 6: Crumbling Farum Azula',
  description: 'Ruins adrift in an endless storm over a sea of cloud. The colonnade crumbles under your feet; the dragon bridge has no rail. The Black Blade waits on the great bridge.',
  help: 'Lands 6: most edges are open to the sky: a fall is death. Beastmen spring from the ruins and claw the floor into lines of shockwaves (roll or jump them).',
  completeHint: 'Destined Death is free. The way to the throne lies open…',
  wallHeight: 8, gateHeight: 3.2, gateThickness: 0.5, flasks: 8,
  atmosphere: { background: 0x3a2a30, fog: 0x6a4a48, fogDensity: 0.0075,
                moon: { color: 0xffb080, intensity: 2.4, position: [40, 18, -10] },
                ambient: { color: 0x5a4450, intensity: 1.15 },
                hemi: { sky: 0xffa080, ground: 0x2a1a24, intensity: 0.65 },
                exposure: 1.04, dust: 0.3, rim: 0xffb890,
                grade: { shadowTint: [0.94, 0.9, 1.06], highlightTint: [1.1, 0.98, 0.86], saturation: 0.86 },
                surface: { moss: 0.35, grime: 0.9 }, banners: [0x5a3a2a, 0x2a3a4a], debris: 0.2,
                sky: { zenith: 0x2a1a30, sun: 0xff8a4a, sunDir: [0.8, 0.08, -0.2] } },
  realm: {
    lightning: { every: [6, 13], color: 0xffd8c0 },
    weather: [{ kind: 'leaves', amount: 0.35, colors: [0x9a8a7a, 0xc8b8a0] }],
    clouds: { y: -26, color: 0x6a4250, light: 0xffb090 },
    floaters: { kind: 'ruin', count: 22, at: [150, 0], radius: [130, 360], y: [-30, 70], color: 0x7a6a64 },
    dragon: { at: [150, 40], radius: 210, y: 70, speed: 26, color: 0x2a2228 },
    pillars: [{ x: 420, z: 180, y0: -80, y1: 140, r: 14, color: 0x8a7a70 }, { x: -120, z: -260, y0: -60, y1: 110, r: 11, color: 0x8a7a70 },
              { x: 300, z: -320, y0: -90, y1: 160, r: 16, color: 0x8a7a70 }],
    beams: 0xffd8a0,
  },
  start: { x: 4, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'arrival', rect: [0, 14, -7, 7], open: true, height: 6, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x5a504a, wall: 0x7a6e64, light: 0xffc8a0 },
    { id: 'broken-bridge', rect: [14, 40, -2, 2], open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x5e544c, wall: 0x7a6e64 },
    { id: 'temple-steps', rect: [40, 64, -12, 12], open: true, height: 8, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x5a504a, wall: 0x7a6e64, light: 0xffb090,
      pillars: [[42, -10], [42, 10], [62, -10], [62, 10]] },
    { id: 'statue-a', rect: [50, 53, 13.5, 16.5], y: 4, open: true, height: 4, edges: { n: 'open', s: 'open', e: 'open', w: 'open' }, floor: 0x5a504a, wall: 0x7a6e64 },
    { id: 'colonnade-head', rect: [80, 86, -6, 6], y: 8, open: true, height: 8, edges: { n: 'rail', s: 'rail' }, floor: 0x625850, wall: 0x7e7268 },
    { id: 'colonnade', rect: [86, 112, -6, 6], y: 8, open: true, height: 8, edges: { n: 'open', s: 'open', e: 'open' }, floor: 0x625850, wall: 0x7e7268, light: 0xffb090 },
    { id: 'lower-ruin', rect: [86, 114, -14, 14], open: true, height: 7, floor: 0x4e4640, wall: 0x6a5e56, light: 0xd08060,
      pillars: [[90, -10], [110, 10]], braziers: [[87.5, 12.5], [112.5, -12.5]] },
    { id: 'wind-terrace', rect: [130, 160, -20, 4], y: 8, open: true, height: 8, edges: { s: 'open' }, floor: 0x5a504a, wall: 0x7a6e64, light: 0xffc090,
      lamps: [[158, -18.5], [158, 2.5]] },
    { id: 'dragon-bridge', rect: [160, 200, -3, 3], y: 8, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x5e544c, wall: 0x7a6e64 },
    { id: 'tower-isle', rect: [200, 214, -8, 8], y: 8, open: true, height: 8, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.8, floor: 0x5a504a, wall: 0x7a6e64, light: 0xffb090 },
    { id: 'spire-landing', rect: [230, 244, -8, 8], y: 16, open: true, height: 8, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x5a504a, wall: 0x7a6e64, light: 0xffd0a0,
      braziers: [[242.5, -6.5], [242.5, 6.5]] },
    { id: 'fog-door', rect: [244, 248, -3, 3], y: 16, height: 6, floor: 0x524a44, wall: 0x6e6258, dim: true },
    { id: 'great-bridge', rect: [248, 292, -16, 16], y: 16, open: true, height: 14, edges: { n: 'rail', s: 'rail' }, floor: 0x625850, wall: 0x7e7268, light: 0xffc8a0,
      lamps: [[250, -14.5], [250, 14.5], [290, -14.5], [290, 14.5]] },
    { id: 'bridge-exit', rect: [292, 296, -3, 3], y: 16, height: 5, floor: 0x524a44, wall: 0x6e6258, light: 0xffe0b0, dim: true },
  ],
  ramps: [
    { id: 'ruin-stair', rect: [64, 80, -3, 3], axis: 'x', from: 0, to: 8, stairs: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x5e544c, wall: 0x7a6e64 },
    { id: 'ruin-ramp', rect: [114, 130, -14, -8], axis: 'x', from: 0, to: 8, stairs: true, height: 6, edges: { s: 'open' }, floor: 0x5e544c, wall: 0x7a6e64 },
    { id: 'spire-stair', rect: [214, 230, -3, 3], axis: 'x', from: 8, to: 16, stairs: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x5e544c, wall: 0x7a6e64 },
  ],
  bonfires: [{ id: 'farum-arrival', x: 3, z: -4.5, spawn: { x: 5, z: -3, yaw: Math.PI / 2 } },
             { id: 'farum-terrace', x: 132, y: 8, z: -2, spawn: { x: 134, y: 8, z: -3.5, yaw: Math.PI / 2 } },
             { id: 'farum-spire', x: 232, y: 16, z: -6, spawn: { x: 234, y: 16, z: -4.5, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-temple', trigger: [40, 64, -12, 12], gate: { x: 64, z: 0, along: 'z', width: 6 },
      enemies: [{ enemy: 'beastman', spawn: { x: 56, z: -5, yaw: -Math.PI / 2 } }, { enemy: 'beastman', spawn: { x: 56, z: 5, yaw: -Math.PI / 2 } },
                { enemy: 'beastman', variant: 'elite', spawn: { x: 60, z: 0, yaw: -Math.PI / 2 } }] },
    // The lower ruin: the colonnade drops you in among them. The gate is at the foot of the ruin ramp.
    { id: 'zone-lower', trigger: [86, 114, -14, 14], gate: { x: 114, z: -11, along: 'z', width: 6 },
      enemies: [{ enemy: 'ashenWarrior', spawn: { x: 106, z: 2, yaw: -Math.PI / 2 } }, { enemy: 'beastman', spawn: { x: 94, z: -10, yaw: 0 } },
                { enemy: 'beastman', spawn: { x: 96, z: 10, yaw: Math.PI } }] },
    { id: 'zone-terrace', trigger: [140, 160, -20, 4], gate: { x: 160, z: 0, y: 8, along: 'z', width: 6 },
      enemies: [{ enemy: 'beastman', spawn: { x: 152, y: 8, z: -6, yaw: -Math.PI / 2 } }, { enemy: 'beastman', spawn: { x: 154, y: 8, z: 1, yaw: -Math.PI / 2 } },
                { enemy: 'crucibleSquire', variant: 'elite', spawn: { x: 157, y: 8, z: -12, yaw: -Math.PI / 2 } },
                { enemy: 'wisp', notice: 16, leash: 34, spawn: { x: 155, y: 8, z: -18, yaw: -Math.PI / 2 } }] },
    { id: 'zone-maliketh', trigger: [249, 292, -16, 16], gate: { x: 292, z: 0, y: 16, along: 'z', width: 6 },
      enemies: [{ enemy: 'maliketh', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['clergyman', 'blackBlade'] }, spawn: { x: 282, y: 16, z: 0, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'maliketh-fog', gate: { x: 248, z: 0, y: 16, along: 'z', width: 6 }, fog: 'zone-maliketh' }],
  // The colonnade crumbles wall to wall (its north, south and east sides are open drops into the lower ruin anyway).
  traps: [{ id: 'colonnade-floor', y: 8, collapse: [90, 108, -6, 6], trigger: [92, 106, -6, 6], warning: 0.5 }],
  dispersed: [
    { behavior: 'patrol', enemy: 'beastman', z: 0, path: [18, 36] },
    { behavior: 'perch', enemy: 'gargoyle', x: 51.5, y: 4, z: 15, yaw: Math.PI, zone: 'zone-temple' },
    { behavior: 'patrol', enemy: 'beastman', y: 8, z: 0, path: [166, 192] },
    { behavior: 'patrol', enemy: 'beastman', variant: 'elite', y: 8, z: 0, path: [176, 196] },
    { behavior: 'sentry', enemy: 'bowman', notice: 22, x: 203.5, y: 8, z: 5.5, yaw: -Math.PI / 2 },
  ],
  hints: [{ kind: 'corpse', x: 84, y: 8, z: 3.5, yaw: 1.9 }],
  devJumps: [
    { name: 'Lands 6: Bonfire 2 (wind terrace)', at: 'farum-terrace', won: ['zone-temple', 'zone-lower'] },
    { name: 'Lands 6: Bonfire 3 (Maliketh\'s fog)', at: 'farum-spire', won: ['zone-temple', 'zone-lower', 'zone-terrace'] },
  ],
};
