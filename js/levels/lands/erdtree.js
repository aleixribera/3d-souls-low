'use strict';
// The Lands Between, 7: the Elden Throne (v7.0). Boss: Radagon of the Golden Order. Inside the burnt Erdtree, the light
// still alive: hollows of golden wood joined by great roots over a gold abyss, rings of light hung in the air, motes
// rising. The roots have no rail; the hollows a low lip. x east, z north; floors climb 0 -> 8 -> 16.
//   The root hollow (bonfire 1; Seren's grace), the first root to the golden hollow (a Golden Zealot, the first of
//   its kind, with an elite Shield Warden and an elite Hollow), the rising root to the rune hollow (a Zealot, a Leyndell
//   Knight, two Toll Wisps). North along a root an elite Empty Sentinel bars the way; the amber hollow (bonfire 2); the
//   spiral root up to the chapel of the Order (two Zealots, an elite Crucible Squire, a Beastman); the long root east to
//   the last hollow (bonfire 3), the fog, and Marika's hall, a ring of gold over the abyss: Radagon.
const LANDS_7 = {
  id: 'erdtree', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  name: 'Lands 7: The Elden Throne',
  description: 'Inside the burnt Erdtree the light lives on: hollows of golden wood, roots spanning a golden abyss, rings of light in the air. At its heart the Golden Order still has a body.',
  help: 'Lands 7: the roots have no rail. Golden Zealots vanish and strike where you stand, throw spears of holy light, and leave runes on the floor that erupt: step off them.',
  completeHint: 'Radagon is broken. The Ring will not mend: a shard is missing…',
  wallHeight: 8, gateHeight: 3.2, gateThickness: 0.5, flasks: 9,
  atmosphere: { background: 0x2a1c08, fog: 0x5a4018, fogDensity: 0.0105,
                moon: { color: 0xffd890, intensity: 2.2, position: [10, 40, 20] },
                ambient: { color: 0x6a5030, intensity: 1.35 },
                hemi: { sky: 0xffd080, ground: 0x2a1a08, intensity: 0.8 },
                exposure: 1.02, dust: 0.25, rim: 0xffe0a0,
                grade: { shadowTint: [1.02, 0.94, 0.86], highlightTint: [1.1, 1.0, 0.82], saturation: 0.9 },
                surface: { moss: 0.1, grime: 0.6 }, banners: [0xd8b860, 0x8a6a30],
                sky: { zenith: 0x1a1006, sun: 0xffc860, sunDir: [0.2, 0.6, 0.7] } },
  realm: {
    weather: [{ kind: 'motes', amount: 1.2, colors: [0xffd870, 0xffe8b0, 0xffb840] }, { kind: 'leaves', amount: 0.3, colors: [0xffd060, 0xe8b040] }],
    clouds: { y: -30, color: 0x5a3a10, light: 0xffd070 },
    halos: [{ x: 100, y: 60, z: 40, r: 70, color: 0xffd060, tilt: 0.3 }, { x: 188, y: 34, z: 84, r: 26, color: 0xffe090, tilt: 0.05 },
            { x: 30, y: 40, z: -40, r: 30, color: 0xffc850, tilt: -0.5 }, { x: 140, y: 80, z: 150, r: 50, color: 0xffd060, tilt: 0.8 }],
    roots: [{ pts: [[30, -8, -6], [30, -3.2, 0], [30, -8, 6]], r: 2.2 }, { pts: [[105, 0, 18], [105, 5.4, 27], [105, 0, 36]], r: 2.0 },
            { pts: [[135, 4, 78], [135, 13.6, 84], [135, 4, 90]], r: 1.8 },
            { pts: [[-30, -40, 30], [20, 30, 60], [90, 90, 120], [160, 120, 140]], r: 9 }, { pts: [[230, -40, 0], [200, 40, 40], [150, 110, 30]], r: 8 },
            { pts: [[60, -40, -60], [80, 20, -30], [70, 90, -10]], r: 7 }],
    pillars: [{ x: 260, z: 200, y0: -60, y1: 180, r: 20, color: 0x8a6a30 }, { x: -80, z: 140, y0: -60, y1: 160, r: 16, color: 0x8a6a30 }],
    beams: 0xffe8a0,
    grounds: [{ kind: 'goldbark', rooms: ['root-hollow', 'root-1', 'golden-hollow', 'rune-hollow', 'root-2', 'amber-hollow', 'root-3', 'last-hollow'] }],
  },
  start: { x: 4, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'root-hollow', rect: [0, 16, -8, 8], open: true, height: 6, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x7a5a2a, wall: 0x9a7a3a, light: 0xffd890 },
    { id: 'root-1', rect: [16, 44, -2, 2], open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x8a6a34, wall: 0x9a7a3a },
    { id: 'golden-hollow', rect: [44, 72, -12, 12], open: true, height: 8, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x7a5a2a, wall: 0x9a7a3a, light: 0xffd070,
      pillars: [[46, -10], [70, 10]] },
    { id: 'rune-hollow', rect: [90, 120, -14, 14], y: 8, open: true, height: 8, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x7a5a2a, wall: 0x9a7a3a, light: 0xffe090,
      pillars: [[92, -12], [118, -12]] },
    { id: 'root-2', rect: [102, 108, 14, 40], y: 8, open: true, height: 6, edges: { e: 'open', w: 'open' }, floor: 0x8a6a34, wall: 0x9a7a3a },
    { id: 'amber-hollow', rect: [96, 114, 40, 54], y: 8, open: true, height: 6, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x7a5a2a, wall: 0x9a7a3a, light: 0xffc870 },
    { id: 'chapel-of-order', rect: [90, 120, 72, 96], y: 16, open: true, height: 9, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x806030, wall: 0xa08040, light: 0xffe0a0,
      pillars: [[93, 75], [117, 75], [93, 93], [117, 93]], braziers: [[105, 94.5]] },
    { id: 'root-3', rect: [120, 150, 82, 86], y: 16, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x8a6a34, wall: 0x9a7a3a },
    { id: 'last-hollow', rect: [150, 164, 76, 92], y: 16, open: true, height: 6, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x7a5a2a, wall: 0x9a7a3a, light: 0xffd890 },
    { id: 'fog-door', rect: [164, 168, 82, 86], y: 16, height: 6, floor: 0x70522a, wall: 0x8a6a34, dim: true },
    { id: 'marika-hall', rect: [168, 208, 64, 104], y: 16, open: true, height: 16, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.9, floor: 0x8a6a34, wall: 0xa88a48, light: 0xfff0c0,
      lamps: [[170, 66], [206, 66], [170, 102], [206, 102]] },
    { id: 'hall-exit', rect: [208, 212, 82, 86], y: 16, height: 5, floor: 0x70522a, wall: 0x8a6a34, light: 0xfff0c0, dim: true },
  ],
  ramps: [
    { id: 'root-rise', rect: [72, 90, -2, 2], axis: 'x', from: 0, to: 8, stairs: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x8a6a34, wall: 0x9a7a3a },
    { id: 'root-spiral', rect: [101, 105, 54, 72], axis: 'z', from: 8, to: 16, stairs: true, height: 6, edges: { e: 'open', w: 'open' }, floor: 0x8a6a34, wall: 0x9a7a3a },
  ],
  bonfires: [{ id: 'tree-hollow', x: 3, z: -5.5, spawn: { x: 5, z: -4, yaw: Math.PI / 2 } },
             { id: 'tree-amber', x: 97.5, y: 8, z: 52.5, spawn: { x: 99.5, y: 8, z: 51, yaw: 0 } },
             { id: 'tree-throne', x: 151.5, y: 16, z: 77.5, spawn: { x: 153.5, y: 16, z: 79, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-golden', trigger: [44, 72, -12, 12], gate: { x: 72, z: 0, along: 'z', width: 4 },
      enemies: [{ enemy: 'goldenZealot', spawn: { x: 64, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'warden', variant: 'elite', spawn: { x: 55, z: -6, yaw: -Math.PI / 2 } },
                { enemy: 'hollow', variant: 'elite', spawn: { x: 55, z: 6, yaw: -Math.PI / 2 } }] },
    { id: 'zone-rune', trigger: [90, 120, -14, 14], gate: { x: 105, z: 14, y: 8, along: 'x', width: 6 },
      enemies: [{ enemy: 'goldenZealot', spawn: { x: 110, y: 8, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'leyndellKnight', spawn: { x: 100, y: 8, z: -6, yaw: -Math.PI / 2 } },
                { enemy: 'wisp', notice: 30, leash: 40, wide: true, spawn: { x: 95, y: 8, z: 10, yaw: -Math.PI / 2 } },
                { enemy: 'wisp', notice: 30, leash: 40, wide: true, spawn: { x: 116, y: 8, z: 10, yaw: -Math.PI / 2 } }] },
    { id: 'zone-chapel', trigger: [90, 120, 72, 96], gate: { x: 120, z: 84, y: 16, along: 'z', width: 4 },
      enemies: [{ enemy: 'goldenZealot', spawn: { x: 100, y: 16, z: 82, yaw: Math.PI } }, { enemy: 'goldenZealot', spawn: { x: 112, y: 16, z: 90, yaw: Math.PI } },
                { enemy: 'crucibleSquire', variant: 'elite', spawn: { x: 114, y: 16, z: 80, yaw: Math.PI } }, { enemy: 'beastman', spawn: { x: 96, y: 16, z: 90, yaw: Math.PI } }] },
    { id: 'zone-radagon', trigger: [169, 208, 64, 104], gate: { x: 208, z: 84, y: 16, along: 'z', width: 4 },
      enemies: [{ enemy: 'radagon', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['order', 'shattering'] }, spawn: { x: 198, y: 16, z: 84, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'radagon-fog', gate: { x: 168, z: 84, y: 16, along: 'z', width: 4 }, fog: 'zone-radagon' }],
  dispersed: [
    { behavior: 'sentry', enemy: 'sentinel', variant: 'elite', x: 105, y: 8, z: 30, yaw: Math.PI },
    { behavior: 'patrol', enemy: 'hollow', variant: 'elite', z: 0, path: [20, 40] },
  ],
  devJumps: [
    { name: 'Lands 7: Bonfire 2 (amber hollow)', at: 'tree-amber', won: ['zone-golden', 'zone-rune'] },
    { name: 'Lands 7: Bonfire 3 (Radagon\'s fog)', at: 'tree-throne', won: ['zone-golden', 'zone-rune', 'zone-chapel'] },
  ],
};
