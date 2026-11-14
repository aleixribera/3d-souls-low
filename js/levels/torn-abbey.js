'use strict';
// Level 12: the Torn Abbey (v7.48.0), chapter 12 of the Story (STORY.md 10h), the first of Act III: where
// Thrale's monks tried to cut the Ember out of the earth and tore the hill loose into the storm. Rough (PLAN.md stage 3,
// track A): built from the old second road's ruins adrift (removed in v7.54.0) as raw material, its layout
// kept, every name and character of that road gone; no dragon, a storm instead of the endless sunset, rain and lightning,
// and the Ember's torn root hanging in the cloud past the nave. Most edges are open: a fall is a fall into the storm.
// x east, z north.
//   The landing (bonfire 1, Ysolde), the broken cloister walk to the chapter steps (three Rending Brothers; a Gargoyle on
//   a saint's plinth). The cloister stair up to the colonnade (y 8): its floor crumbles under you wall to wall (a trap),
//   and its far end is open anyway: either way down into the undercroft, among an Undead Knight and two Brothers. The
//   undercroft ramp climbs out to the storm terrace (bonfire 2), then its fight (Brothers, an elite Shield Warden, a Toll
//   Wisp), the long bridge (no rail; Brothers on it, an archer at its end), the nave stair to the nave landing (bonfire
//   3), the fog, and the rent where the hill tore: Mother Agathe, the Rending Hand.
const LEVEL_12 = {
  id: 'torn-abbey', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  next: 'ember-root',   // v7.50.0: on to the Root of the Ember (chapter 13)
  name: 'Level 12: The Torn Abbey',
  description: 'Where Thrale\'s monks tried to cut the hunger out of the earth, and the earth came with it: ruins adrift in the storm. The colonnade crumbles under your feet; the long bridge has no rail. The abbess waits where the hill tore.',
  help: 'Level 12: most edges are open to the storm: a fall is death. The Rending Brothers spring from the ruins and rend the floor into lines of shockwaves (roll or jump them).',
  completeHint: 'The abbess lies in the rent. Below the storm, the root goes down into the dark…',
  wallHeight: 8, gateHeight: 3.2, gateThickness: 0.5,
  atmosphere: { background: 0x2a2c34, fog: 0x4c4e5a, fogDensity: 0.0085,
                moon: { color: 0xc8d4ff, intensity: 2.2, position: [-30, 26, 14] },
                ambient: { color: 0x4a4c5a, intensity: 1.3 },
                hemi: { sky: 0x9aa4c0, ground: 0x221e24, intensity: 0.7 },
                exposure: 1.08, dust: 0.15, rim: 0xc8d8ff,
                grade: { shadowTint: [0.92, 0.94, 1.08], highlightTint: [1.0, 1.0, 1.04], saturation: 0.7 },
                surface: { moss: 0.45, grime: 1.0 }, banners: [0x3a3a44, 0x5a4a3a], debris: 0.25,
                sky: { zenith: 0x14161e, sun: 0x8a9ac8, sunDir: [-0.7, 0.14, 0.25] } },
  realm: {
    lightning: { every: [5, 11], color: 0xd8e4ff },
    weather: [{ kind: 'rain', amount: 0.9 }],
    clouds: { y: -26, color: 0x3a3e4c, light: 0x9aa8d0 },
    floaters: { kind: 'ruin', count: 22, at: [150, 0], radius: [130, 360], y: [-30, 70], color: 0x6a6a70 },
    pillars: [{ x: 420, z: 180, y0: -80, y1: 140, r: 14, color: 0x6e6a6a }, { x: -120, z: -260, y0: -60, y1: 110, r: 11, color: 0x6e6a6a },
              { x: 300, z: -320, y0: -90, y1: 160, r: 16, color: 0x6e6a6a }],
    // The Ember's root, torn out of the earth with the hill: it arches up out of the cloud past the rent.
    roots: [{ pts: [[318, -40, -34], [326, 30, 0], [318, -40, 34]], r: 4.2, color: 0x5a2414 }],
    beams: 0xc8d4f0,
  },
  start: { x: 4, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'landing', rect: [0, 14, -7, 7], open: true, height: 6, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x54524e, wall: 0x6e6a66, light: 0xc8d0e0 },
    { id: 'broken-cloister', rect: [14, 40, -2, 2], open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x585450, wall: 0x6e6a66 },
    { id: 'chapter-steps', rect: [40, 64, -12, 12], open: true, height: 8, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x54524e, wall: 0x6e6a66, light: 0xb8c4dc,
      pillars: [[42, -10], [42, 10], [62, -10], [62, 10]] },
    { id: 'saint-plinth', rect: [50, 53, 13.5, 16.5], y: 4, open: true, height: 4, edges: { n: 'open', s: 'open', e: 'open', w: 'open' }, floor: 0x54524e, wall: 0x6e6a66 },
    { id: 'colonnade-head', rect: [80, 86, -6, 6], y: 8, open: true, height: 8, edges: { n: 'rail', s: 'rail' }, floor: 0x5c5854, wall: 0x726e6a },
    { id: 'colonnade', rect: [86, 112, -6, 6], y: 8, open: true, height: 8, edges: { n: 'open', s: 'open', e: 'open' }, floor: 0x5c5854, wall: 0x726e6a, light: 0xb8c4dc },
    { id: 'undercroft', rect: [86, 114, -14, 14], open: true, height: 7, floor: 0x48464a, wall: 0x5e5a5a, light: 0xd09060,
      pillars: [[90, -10], [110, 10]], braziers: [[87.5, 12.5], [112.5, -12.5]] },
    { id: 'storm-terrace', rect: [130, 160, -20, 4], y: 8, open: true, height: 8, edges: { s: 'open' }, floor: 0x54524e, wall: 0x6e6a66, light: 0xc0c8e0,
      lamps: [[158, -18.5], [158, 2.5]] },
    { id: 'long-bridge', rect: [160, 200, -3, 3], y: 8, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x585450, wall: 0x6e6a66 },
    { id: 'bell-isle', rect: [200, 214, -8, 8], y: 8, open: true, height: 8, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.8, floor: 0x54524e, wall: 0x6e6a66, light: 0xb8c4dc },
    { id: 'nave-landing', rect: [230, 244, -8, 8], y: 16, open: true, height: 8, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x54524e, wall: 0x6e6a66, light: 0xffc890,
      braziers: [[242.5, -6.5], [242.5, 6.5]] },
    { id: 'fog-door', rect: [244, 248, -3, 3], y: 16, height: 6, floor: 0x4c4a48, wall: 0x625e5a, dim: true },
    // The rent (pass 48): what is left of the abbey's nave where the hill tore loose, open to the storm on both sides. A dark
    // wet floor, so the storm's marks read on it; the nave's broken columns down both sides; a cold light, the lamps low.
    { id: 'the-rent', rect: [248, 292, -16, 16], y: 16, open: true, dim: true, height: 14, edges: { n: 'rail', s: 'rail' }, floor: 0x34343a, wall: 0x726e6a, light: 0xa8b8e0,
      lamps: [[250, -14.5], [250, 14.5], [290, -14.5], [290, 14.5]],
      pillarHeight: 8, pillars: [[256, -12.5, 1.3], [268, -12.5, 1.3], [280, -12.5, 1.3], [256, 12.5, 1.3], [268, 12.5, 1.3], [280, 12.5, 1.3]] },
    { id: 'rent-exit', rect: [292, 296, -3, 3], y: 16, height: 5, floor: 0x4c4a48, wall: 0x625e5a, light: 0xe0e8ff, dim: true },
  ],
  ramps: [
    { id: 'cloister-stair', rect: [64, 80, -3, 3], axis: 'x', from: 0, to: 8, stairs: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x585450, wall: 0x6e6a66 },
    { id: 'undercroft-ramp', rect: [114, 130, -14, -8], axis: 'x', from: 0, to: 8, stairs: true, height: 6, edges: { s: 'open' }, floor: 0x585450, wall: 0x6e6a66 },
    { id: 'nave-stair', rect: [214, 230, -3, 3], axis: 'x', from: 8, to: 16, stairs: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x585450, wall: 0x6e6a66 },
  ],
  // A flask found on the road (pass 79, Game.updateLevel): in the hand of the dead by the wall.
  flaskFinds: [{ id: 'abbey-brother', x: 236.7, y: 16, z: 5.4 }],
  bonfires: [{ id: 'abbey-landing', x: 3, z: -4.5, spawn: { x: 5, z: -3, yaw: Math.PI / 2 } },
             { id: 'abbey-terrace', x: 132, y: 8, z: -2, spawn: { x: 134, y: 8, z: -3.5, yaw: Math.PI / 2 } },
             { id: 'abbey-nave', x: 232, y: 16, z: -6, spawn: { x: 234, y: 16, z: -4.5, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-steps', trigger: [40, 64, -12, 12], gate: { x: 64, z: 0, along: 'z', width: 6 },
      enemies: [{ enemy: 'rendingBrother', spawn: { x: 56, z: -5, yaw: -Math.PI / 2 } }, { enemy: 'rendingBrother', spawn: { x: 56, z: 5, yaw: -Math.PI / 2 } },
                { enemy: 'rendingBrother', variant: 'elite', spawn: { x: 60, z: 0, yaw: -Math.PI / 2 } }] },
    // The undercroft: the colonnade drops you in among them. The gate is at the foot of the undercroft ramp.
    { id: 'zone-undercroft', trigger: [86, 114, -14, 14], gate: { x: 114, z: -11, along: 'z', width: 6 },
      enemies: [{ enemy: 'knight', spawn: { x: 106, z: 2, yaw: -Math.PI / 2 } }, { enemy: 'rendingBrother', spawn: { x: 94, z: -10, yaw: 0 } },
                { enemy: 'rendingBrother', spawn: { x: 96, z: 10, yaw: Math.PI } }] },
    { id: 'zone-terrace', trigger: [140, 160, -20, 4], gate: { x: 160, z: 0, y: 8, along: 'z', width: 6 },
      enemies: [{ enemy: 'rendingBrother', spawn: { x: 152, y: 8, z: -6, yaw: -Math.PI / 2 } }, { enemy: 'rendingBrother', spawn: { x: 154, y: 8, z: 1, yaw: -Math.PI / 2 } },
                { enemy: 'warden', variant: 'elite', spawn: { x: 157, y: 8, z: -12, yaw: -Math.PI / 2 } },
                { enemy: 'wisp', notice: 16, leash: 34, spawn: { x: 155, y: 8, z: -18, yaw: -Math.PI / 2 } }] },
    // The rent: the abbess. She sees the player only inside it (`arena`), so the last bonfire is safe.
    { id: 'zone-agathe', trigger: [249, 292, -16, 16], gate: { x: 292, z: 0, y: 16, along: 'z', width: 6 },
      enemies: [{ enemy: 'agathe', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['abbess', 'storm'] }, spawn: { x: 282, y: 16, z: 0, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'agathe-fog', gate: { x: 248, z: 0, y: 16, along: 'z', width: 6 }, fog: 'zone-agathe' }],
  // The colonnade crumbles wall to wall (its north, south and east sides are open drops into the undercroft anyway).
  traps: [{ id: 'colonnade-floor', y: 8, collapse: [90, 108, -6, 6], trigger: [92, 106, -6, 6], warning: 0.5 }],
  dispersed: [
    { behavior: 'patrol', enemy: 'rendingBrother', z: 0, path: [18, 36] },
    { behavior: 'perch', enemy: 'gargoyle', x: 51.5, y: 4, z: 15, yaw: Math.PI, zone: 'zone-steps' },
    { behavior: 'patrol', enemy: 'rendingBrother', y: 8, z: 0, path: [166, 192] },
    { behavior: 'patrol', enemy: 'rendingBrother', variant: 'elite', y: 8, z: 0, path: [176, 196] },
    { behavior: 'sentry', enemy: 'bowman', notice: 22, x: 203.5, y: 8, z: 5.5, yaw: -Math.PI / 2 },
  ],
  hints: [{ kind: 'corpse', x: 84, y: 8, z: 3.5, yaw: 1.9 }],
  devJumps: [
    { name: 'L12: Bonfire 2 (the storm terrace)', at: 'abbey-terrace', won: ['zone-steps', 'zone-undercroft'] },
    { name: 'L12: Bonfire 3 (the abbess\'s fog)', at: 'abbey-nave', won: ['zone-steps', 'zone-undercroft', 'zone-terrace'] },
  ],
};
