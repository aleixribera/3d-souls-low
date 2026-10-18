'use strict';
// The Lands Between, 3: the Stormhill Evergaol (v7.0). Boss: the Crucible Knight. A prison of stars: cells of old stone
// hung in a night sky, rune circles burning on their floors, joined by narrow bridges with no rail at all. The cells have a
// low kerb (a jump clears it); a fall from anywhere is a fall into the sky. x east, z north; floors climb 0 -> 6 -> 12.
//   The landing (bonfire 1, Seren), bridge 1 under a Toll Wisp's floating rock, cell 1 (a Crucible Squire and two
//   hollowed prisoners), bridge 2 and the rise to cell 2 (an Empty Sentinel, the gaol's warden, with two Duelists).
//   The isle (bonfire 2); the bridge north to cell 3 (two Squires and two Wisps); the rise to cell 4 (prisoners of the
//   lands before: a Knight, an Omenkin, a Grafted Scion), a Gargoyle on a column; the last isle (bonfire 3), the fog, and
//   the great evergaol ring: the Crucible Knight, set to guard the Crucible's Great Rune for ever.
const LANDS_3 = {
  id: 'evergaol', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  name: 'Lands 3: The Stormhill Evergaol',
  description: 'A prison of stars: stone cells hung in the night sky, rune circles on their floors, bridges with no rail. The last knight of the Crucible guards the second Great Rune.',
  help: 'Lands 3: the bridges have no rail and the sky has no floor. The cells have a low kerb: jump it only if you mean to. Wisps shoot from the floating rocks.',
  completeHint: 'The evergaol breaks, and the Crucible\'s rune is yours. Two runes: the capital\'s gate will open…',
  wallHeight: 6, gateHeight: 3.2, gateThickness: 0.5, flasks: 7,
  // Night in a sealed sky: violet and teal, stars and a band of mist, runes and motes of blue light.
  atmosphere: { background: 0x070814, fog: 0x14162a, fogDensity: 0.0095,
                moon: { color: 0x9aa8ff, intensity: 2.0, position: [-10, 40, 20] },
                ambient: { color: 0x2a2e50, intensity: 1.4 },
                hemi: { sky: 0x5a5aa0, ground: 0x140e20, intensity: 0.7 },
                exposure: 1.12, dust: 0.0, rim: 0xa8b0ff,
                grade: { shadowTint: [0.92, 0.9, 1.16], highlightTint: [1.0, 1.0, 1.08], saturation: 0.82 },
                surface: { moss: 0.3, grime: 0.8 }, banners: [0x2a2a4a, 0x4a3a6a],
                sky: { zenith: 0x05060f, sun: 0x6a5ab0, sunDir: [0.3, 0.35, 0.8] } },
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
    { id: 'landing', rect: [0, 14, -7, 7], open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x3a3a48, wall: 0x50506a, light: 0xa8b8ff },
    { id: 'bridge-1', rect: [14, 30, -1.5, 1.5], open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x40405a, wall: 0x50506a },
    { id: 'cell-1', rect: [30, 50, -10, 10], open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x34344a, wall: 0x4a4a64, light: 0x8ab0ff,
      pillars: [[31.5, -8.5], [31.5, 8.5], [48.5, -8.5], [48.5, 8.5]] },
    { id: 'bridge-2', rect: [50, 62, -1.5, 1.5], open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x40405a, wall: 0x50506a },
    { id: 'cell-2', rect: [74, 94, -10, 10], y: 6, open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x34344a, wall: 0x4a4a64, light: 0xb08aff,
      pillars: [[75.5, -8.5], [75.5, 8.5], [92.5, -8.5], [92.5, 8.5]] },
    { id: 'bridge-3', rect: [94, 100, -1.5, 1.5], y: 6, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x40405a, wall: 0x50506a },
    { id: 'isle', rect: [100, 110, -5, 5], y: 6, open: true, height: 6, edges: { s: 'rail', e: 'rail', n: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x3e3c4c, wall: 0x54526a, light: 0xffd8a0 },
    { id: 'bridge-n', rect: [103.5, 106.5, 5, 24], y: 6, open: true, height: 6, edges: { e: 'open', w: 'open' }, floor: 0x40405a, wall: 0x50506a },
    { id: 'cell-3', rect: [94, 116, 24, 44], y: 6, open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x34344a, wall: 0x4a4a64, light: 0x8ab0ff,
      pillars: [[95.5, 25.5], [114.5, 25.5], [95.5, 42.5], [114.5, 42.5]] },
    { id: 'cell-4', rect: [94, 116, 56, 76], y: 12, open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x34344a, wall: 0x4a4a64, light: 0xb08aff,
      pillars: [[95.5, 57.5], [114.5, 57.5], [95.5, 74.5], [114.5, 74.5]] },
    { id: 'bridge-4', rect: [116, 130, 64.5, 67.5], y: 12, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x40405a, wall: 0x50506a },
    { id: 'isle-2', rect: [130, 140, 61, 71], y: 12, open: true, height: 6, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.7, floor: 0x3e3c4c, wall: 0x54526a, light: 0xffd8a0 },
    { id: 'fog-span', rect: [140, 146, 64.5, 67.5], y: 12, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x40405a, wall: 0x50506a },
    { id: 'evergaol', rect: [146, 186, 46, 86], y: 12, open: true, height: 10, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.9, floor: 0x3a3646, wall: 0x52506a, light: 0xffc890,
      lamps: [[148, 48], [184, 48], [148, 84], [184, 84]] },
    { id: 'gaol-exit', rect: [186, 190, 64.5, 67.5], y: 12, height: 4, floor: 0x3e3c4c, wall: 0x54526a, light: 0xffe0b0, dim: true },
    // Floating rocks the gaol's wisps stand on, and a column top for a Gargoyle: no way up for the player.
    { id: 'rock-a', rect: [25, 28, 6, 9], y: 3, open: true, height: 4, edges: { n: 'open', s: 'open', e: 'open', w: 'open' }, floor: 0x3a3a48, wall: 0x50506a },
    { id: 'rock-b', rect: [64, 67, -10, -7], y: 7, open: true, height: 4, edges: { n: 'open', s: 'open', e: 'open', w: 'open' }, floor: 0x3a3a48, wall: 0x50506a },
    { id: 'column-c', rect: [118, 120, 68.5, 70.5], y: 16, open: true, height: 4, edges: { n: 'open', s: 'open', e: 'open', w: 'open' }, floor: 0x3a3a48, wall: 0x50506a },
  ],
  ramps: [
    { id: 'rise-1', rect: [62, 74, -1.5, 1.5], axis: 'x', from: 0, to: 6, stairs: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x40405a, wall: 0x50506a },
    { id: 'rise-2', rect: [103.5, 106.5, 44, 56], axis: 'z', from: 6, to: 12, stairs: true, height: 6, edges: { e: 'open', w: 'open' }, floor: 0x40405a, wall: 0x50506a },
  ],
  bonfires: [{ id: 'gaol-landing', x: 3, z: -4.5, spawn: { x: 5, z: -3, yaw: Math.PI / 2 } },
             { id: 'gaol-isle', x: 108, y: 6, z: -3, spawn: { x: 106, y: 6, z: -1.5, yaw: 0 } },
             { id: 'gaol-last', x: 132, y: 12, z: 62.8, spawn: { x: 134, y: 12, z: 64.5, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-cell1', trigger: [30, 50, -10, 10], gate: { x: 50, z: 0, along: 'z', width: 3 },
      enemies: [{ enemy: 'crucibleSquire', spawn: { x: 45, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'hollow', variant: 'elite', spawn: { x: 40, z: -6, yaw: -Math.PI / 2 } },
                { enemy: 'hollow', variant: 'elite', spawn: { x: 40, z: 6, yaw: -Math.PI / 2 } }] },
    { id: 'zone-cell2', trigger: [74, 94, -10, 10], gate: { x: 94, z: 0, y: 6, along: 'z', width: 3 },
      enemies: [{ enemy: 'sentinel', spawn: { x: 89, y: 6, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'duelist', spawn: { x: 84, y: 6, z: -5, yaw: -Math.PI / 2 } },
                { enemy: 'duelist', spawn: { x: 84, y: 6, z: 5, yaw: -Math.PI / 2 } }] },
    { id: 'zone-cell3', trigger: [94, 116, 24, 44], gate: { x: 105, z: 44, y: 6, along: 'x', width: 3 },
      enemies: [{ enemy: 'crucibleSquire', spawn: { x: 100, y: 6, z: 35, yaw: Math.PI } }, { enemy: 'crucibleSquire', spawn: { x: 110, y: 6, z: 35, yaw: Math.PI } },
                { enemy: 'wisp', notice: 30, leash: 40, wide: true, spawn: { x: 97, y: 6, z: 41, yaw: Math.PI } }, { enemy: 'wisp', notice: 30, leash: 40, wide: true, spawn: { x: 113, y: 6, z: 41, yaw: Math.PI } }] },
    { id: 'zone-cell4', trigger: [94, 116, 56, 76], gate: { x: 116, z: 66, y: 12, along: 'z', width: 3 },
      enemies: [{ enemy: 'knight', variant: 'elite', spawn: { x: 102, y: 12, z: 66, yaw: Math.PI } }, { enemy: 'omenkin', spawn: { x: 109, y: 12, z: 62, yaw: Math.PI } },
                { enemy: 'graftedScion', spawn: { x: 109, y: 12, z: 71, yaw: Math.PI } }] },
    { id: 'zone-crucible', trigger: [147, 186, 46, 86], gate: { x: 186, z: 66, y: 12, along: 'z', width: 3 },
      enemies: [{ enemy: 'crucibleKnight', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['knight', 'aspect'] }, spawn: { x: 176, y: 12, z: 66, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'crucible-fog', gate: { x: 146, z: 66, y: 12, along: 'z', width: 3 }, fog: 'zone-crucible' }],
  dispersed: [
    { behavior: 'sentry', enemy: 'wisp', notice: 18, leash: 30, wide: true, x: 26.5, y: 3, z: 7.5, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'wisp', notice: 26, leash: 36, wide: true, x: 65.5, y: 7, z: -8.5, yaw: 0 },
    { behavior: 'perch', enemy: 'gargoyle', x: 119, y: 16, z: 69.5, yaw: -Math.PI / 2, zone: 'zone-cell4' },
  ],
  hints: [{ kind: 'corpse', x: 112, y: 12, z: 58.5, yaw: 1.3 }],
  devJumps: [
    { name: 'Lands 3: Bonfire 2 (isle)', at: 'gaol-isle', won: ['zone-cell1', 'zone-cell2'] },
    { name: 'Lands 3: Bonfire 3 (the Crucible Knight\'s fog)', at: 'gaol-last', won: ['zone-cell1', 'zone-cell2', 'zone-cell3', 'zone-cell4'] },
  ],
};
