'use strict';
// Level 9: The Night Gaol (v7.42.0), chapter 9 of the Story (STORY.md 10e): Thrale's gaol, hung among the
// stars. Rough (PLAN.md stage 3, track A): built from the old second road's evergaol (removed in v7.54.0) as raw
// material, its layout kept, every name and character of that road gone. Cells of old stone on nothing, rune circles on
// their floors, joined by bridges with no rail at all; a fall from anywhere is a fall into the sky. x east, z north;
// floors climb 0 -> 6 -> 12.
//   The landing (bonfire 1, Ysolde), bridge 1 under a Toll Wisp's floating rock, cell 1 (three Keyless), bridge 2 and
//   the rise to cell 2 (an Empty Sentinel, the gaol's last warden, with two Keyless).
//   The isle (bonfire 2); the bridge north to cell 3 (Keyless and two Toll Wisps, ringers' souls); the rise to cell 4 (prisoners of
//   older wars: a knight, a Keyless, a thrall), a Gargoyle on a column; the last isle (bonfire 3), the fog, and the great
//   ring: the Ringer of Thrale, still chained.
const LEVEL_9 = {
  id: 'night-gaol', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  next: 'aurel',   // v7.44.0: on to Thrale's capital (chapter 10)
  name: 'Level 9: The Night Gaol',
  description: 'Thrale\'s gaol, hung among the stars: stone cells on nothing, bridges with no rail, prisoners who never left. In the great ring, the one who rang Thrale\'s bell.',
  help: 'Level 9: the bridges have no rail and the sky has no floor. The cells have a low kerb: jump it only if you mean to. Wisps ring from the floating rocks: their bolts reach you on the bridges.',
  completeHint: 'The Ringer is still. Her chain lies open on the stones, as it has for a long time…',
  wallHeight: 6, gateHeight: 3.2, gateThickness: 0.5,
  // Night in a sealed sky: violet and teal, stars and a band of mist, runes and motes of blue light.
  // (pass 169, the cel redo) It was all one blue: cells, bridges and sky ran together. Now the open sky and the bridges
  // are a cold, darker blue-black, and the cells and isles are warm under their lamps (`areas`), so each cell is a pool
  // of firelight to cross to and the runes on its floor stay the cold magic in it. Floors a step darker than the pale
  // stone of kerbs and pillars.
  atmosphere: { background: 0x05060e, fog: 0x10182a, fogDensity: 0.009,
                moon: { color: 0x9ab8f0, intensity: 2.0, position: [-10, 40, 20] },
                ambient: { color: 0x222a44, intensity: 1.1 },
                hemi: { sky: 0x4a5a90, ground: 0x0c0c16, intensity: 0.55 },
                exposure: 0.84, dust: 0.0, rim: 0xa8c0ff,
                grade: { shadowTint: [0.88, 0.94, 1.14], highlightTint: [0.98, 1.0, 1.06], saturation: 0.7, contrast: 1.1 },
                surface: { moss: 0.3, grime: 0.8 }, banners: [0x2a2a4a, 0x4a3a6a],
                sky: { zenith: 0x05060f, sun: 0x5a6ab0, sunDir: [0.3, 0.35, 0.8] },
                areas: [
                  { rooms: ['cell-1', 'cell-2', 'cell-3', 'cell-4', 'isle', 'isle-2'], moon: { color: 0x8a98c8, intensity: 1.2 },
                    ambient: { color: 0x4a3426, intensity: 1.05 }, hemi: { sky: 0x6a5446, ground: 0x24160e, intensity: 0.5 }, fog: 0x1e1610,
                    exposure: 0.86, grade: { shadowTint: [0.9, 0.92, 1.08], highlightTint: [1.08, 0.98, 0.86], saturation: 0.74 } },
                  { rooms: ['bridge-1', 'bridge-2', 'bridge-3', 'bridge-n', 'bridge-4', 'rise-1', 'rise-2'], moon: { intensity: 2.3 },
                    fog: 0x0e1626, exposure: 0.8, grade: { saturation: 0.62, contrast: 1.14 } },
                  { rooms: ['great-ring', 'ring-exit'], moon: { color: 0xa8a0e0, intensity: 1.5 }, ambient: { color: 0x3a2c30, intensity: 1.0 },
                    hemi: { sky: 0x5a4a6a, ground: 0x1c120c, intensity: 0.5 }, fog: 0x1a1218, exposure: 0.88,
                    grade: { shadowTint: [0.92, 0.9, 1.1], highlightTint: [1.08, 1.0, 0.86], saturation: 0.78 } },
                ] },
  realm: {
    stars: { count: 2200, color: 0xdde4ff, band: [0x6a40c0, 0x2a8ab0] },
    weather: [{ kind: 'motes', amount: 0.8, colors: [0x9ab0ff, 0xc8a0ff, 0x80e0ff] }],
    clouds: { y: -34, color: 0x1a1430, light: 0x5a4a9a },
    floaters: { kind: 'rock', count: 26, at: [95, 30], radius: [120, 320], y: [-50, 70], color: 0x4a4a5a },
    runes: [{ x: 40, z: 0, r: 7, color: 0x8ab0ff }, { x: 84, y: 6, z: 0, r: 7, color: 0xb08aff }, { x: 105, y: 6, z: 34, r: 7.5, color: 0x8ab0ff },
            { x: 105, y: 12, z: 66, r: 7.5, color: 0xb08aff }, { x: 166, y: 12, z: 66, r: 16, color: 0xffc070 }, { x: 105, y: 6, z: 0, r: 3.5, color: 0xffd890 }],
    beams: 0xb8c8ff,
  },
  start: { x: 4, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'landing', rect: [0, 14, -7, 7], open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x2c2e38, wall: 0x6a6e80, light: 0xa8b8ff },
    { id: 'bridge-1', rect: [14, 30, -1.5, 1.5], open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x434a5e, wall: 0x6a7080 },
    { id: 'cell-1', rect: [30, 50, -10, 10], open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x2e2a2c, wall: 0x74747c, light: 0xffa868,
      lamps: [[46.6, -8.5], [46.6, 8.5]], pillars: [[31.5, -8.5], [31.5, 8.5], [48.5, -8.5], [48.5, 8.5]] },
    { id: 'bridge-2', rect: [50, 62, -1.5, 1.5], open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x434a5e, wall: 0x6a7080 },
    { id: 'cell-2', rect: [74, 94, -10, 10], y: 6, open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x2e2a2c, wall: 0x74747c, light: 0xffa868,
      lamps: [[90.6, -8.5], [90.6, 8.5]], pillars: [[75.5, -8.5], [75.5, 8.5], [92.5, -8.5], [92.5, 8.5]] },
    { id: 'bridge-3', rect: [94, 100, -1.5, 1.5], y: 6, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x434a5e, wall: 0x6a7080 },
    { id: 'isle', rect: [100, 110, -5, 5], y: 6, open: true, height: 6, edges: { s: 'rail', e: 'rail', n: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x302a2a, wall: 0x74747c, light: 0xffd8a0 },
    { id: 'bridge-n', rect: [103.5, 106.5, 5, 24], y: 6, open: true, height: 6, edges: { e: 'open', w: 'open' }, floor: 0x434a5e, wall: 0x6a7080 },
    { id: 'cell-3', rect: [94, 116, 24, 44], y: 6, open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x2e2a2c, wall: 0x74747c, light: 0xffa868,
      lamps: [[97.4, 25.5], [112.6, 25.5]], pillars: [[95.5, 25.5], [114.5, 25.5], [95.5, 42.5], [114.5, 42.5]] },
    { id: 'cell-4', rect: [94, 116, 56, 76], y: 12, open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x2e2a2c, wall: 0x74747c, light: 0xffa868,
      lamps: [[95.5, 59.4], [95.5, 72.6]], pillars: [[95.5, 57.5], [114.5, 57.5], [95.5, 74.5], [114.5, 74.5]] },
    { id: 'bridge-4', rect: [116, 130, 64.5, 67.5], y: 12, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x434a5e, wall: 0x6a7080 },
    { id: 'isle-2', rect: [130, 140, 61, 71], y: 12, open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x302a2a, wall: 0x74747c, light: 0xffd8a0 },
    { id: 'fog-span', rect: [140, 146, 64.5, 67.5], y: 12, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x434a5e, wall: 0x6a7080 },
    { id: 'great-ring', rect: [146, 186, 46, 86], y: 12, open: true, height: 10, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.9, floor: 0x2c2628, wall: 0x74747c, light: 0xffc890,
      lamps: [[148, 48], [184, 48], [148, 84], [184, 84]] },
    { id: 'ring-exit', rect: [186, 190, 64.5, 67.5], y: 12, height: 4, floor: 0x302a2a, wall: 0x74747c, light: 0xffe0b0, dim: true },
    // Floating rocks the gaol's wisps stand on, and a column top for a Gargoyle: no way up for the player.
    { id: 'rock-a', rect: [25, 28, 6, 9], y: 3, open: true, height: 4, edges: { n: 'open', s: 'open', e: 'open', w: 'open' }, floor: 0x2c2e38, wall: 0x6a6e80 },
    { id: 'rock-b', rect: [64, 67, -10, -7], y: 7, open: true, height: 4, edges: { n: 'open', s: 'open', e: 'open', w: 'open' }, floor: 0x2c2e38, wall: 0x6a6e80 },
    { id: 'column-c', rect: [118, 120, 68.5, 70.5], y: 16, open: true, height: 4, edges: { n: 'open', s: 'open', e: 'open', w: 'open' }, floor: 0x2c2e38, wall: 0x6a6e80 },
  ],
  ramps: [
    { id: 'rise-1', rect: [62, 74, -1.5, 1.5], axis: 'x', from: 0, to: 6, stairs: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x434a5e, wall: 0x6a7080 },
    { id: 'rise-2', rect: [103.5, 106.5, 44, 56], axis: 'z', from: 6, to: 12, stairs: true, height: 6, edges: { e: 'open', w: 'open' }, floor: 0x434a5e, wall: 0x6a7080 },
  ],
  // A flask found on the road (pass 79, Game.updateLevel): in the hand of the dead by the wall.
  flaskFinds: [{ id: 'gaol-prisoner', x: 47.5, z: 6.8 }],
  bonfires: [{ id: 'night-landing', x: 3, z: -4.5, spawn: { x: 5, z: -3, yaw: Math.PI / 2 } },
             { id: 'night-isle', x: 108, y: 6, z: -3, spawn: { x: 106, y: 6, z: -1.5, yaw: 0 } },
             { id: 'night-last', x: 132, y: 12, z: 62.8, spawn: { x: 134, y: 12, z: 64.5, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-cell1', trigger: [30, 50, -10, 10], gate: { x: 50, z: 0, along: 'z', width: 3 },
      enemies: [{ enemy: 'keyless', variant: 'elite', spawn: { x: 45, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'keyless', spawn: { x: 40, z: -6, yaw: -Math.PI / 2 } },
                { enemy: 'keyless', spawn: { x: 40, z: 6, yaw: -Math.PI / 2 } }] },
    { id: 'zone-cell2', trigger: [74, 94, -10, 10], gate: { x: 94, z: 0, y: 6, along: 'z', width: 3 },
      enemies: [{ enemy: 'sentinel', spawn: { x: 89, y: 6, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'keyless', spawn: { x: 84, y: 6, z: -5, yaw: -Math.PI / 2 } },
                { enemy: 'keyless', spawn: { x: 84, y: 6, z: 5, yaw: -Math.PI / 2 } }] },
    { id: 'zone-cell3', trigger: [94, 116, 24, 44], gate: { x: 105, z: 44, y: 6, along: 'x', width: 3 },
      enemies: [{ enemy: 'keyless', variant: 'elite', spawn: { x: 100, y: 6, z: 35, yaw: Math.PI } }, { enemy: 'keyless', spawn: { x: 110, y: 6, z: 35, yaw: Math.PI } },
                { enemy: 'wisp', notice: 30, leash: 40, wide: true, spawn: { x: 97, y: 6, z: 41, yaw: Math.PI } }, { enemy: 'wisp', notice: 30, leash: 40, wide: true, spawn: { x: 113, y: 6, z: 41, yaw: Math.PI } }] },
    { id: 'zone-cell4', trigger: [94, 116, 56, 76], gate: { x: 116, z: 66, y: 12, along: 'z', width: 3 },
      enemies: [{ enemy: 'knight', variant: 'elite', spawn: { x: 102, y: 12, z: 66, yaw: Math.PI } }, { enemy: 'keyless', variant: 'elite', spawn: { x: 109, y: 12, z: 62, yaw: Math.PI } },
                { enemy: 'lanternThrall', variant: 'elite', spawn: { x: 109, y: 12, z: 71, yaw: Math.PI } }] },
    // The great ring: the Ringer, still chained. She sees the player only inside it (`arena`), so the last bonfire is safe.
    // She stands at its centre, inside the circle her chain let her reach (her first phase's `tether`, 8.5 m).
    { id: 'zone-ringer', trigger: [147, 186, 46, 86], gate: { x: 186, z: 66, y: 12, along: 'z', width: 3 },
      enemies: [{ enemy: 'ringer', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['chained', 'tolling'] }, spawn: { x: 166, y: 12, z: 66, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'ringer-fog', gate: { x: 146, z: 66, y: 12, along: 'z', width: 3 }, fog: 'zone-ringer' }],
  dispersed: [
    { behavior: 'sentry', enemy: 'wisp', notice: 18, leash: 30, wide: true, x: 26.5, y: 3, z: 7.5, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'wisp', notice: 26, leash: 36, wide: true, x: 65.5, y: 7, z: -8.5, yaw: 0 },
    { behavior: 'perch', enemy: 'gargoyle', x: 119, y: 16, z: 69.5, yaw: -Math.PI / 2, zone: 'zone-cell4' },
  ],
  hints: [{ kind: 'corpse', x: 112, y: 12, z: 58.5, yaw: 1.3 }],
  devJumps: [
    { name: 'L9: Bonfire 2 (isle)', at: 'night-isle', won: ['zone-cell1', 'zone-cell2'] },
    { name: 'L9: Bonfire 3 (the Ringer\'s fog)', at: 'night-last', won: ['zone-cell1', 'zone-cell2', 'zone-cell3', 'zone-cell4'] },
  ],
};
