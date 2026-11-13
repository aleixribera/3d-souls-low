'use strict';
// Level 13: the Root of the Ember (v7.50.0), chapter 13 of the Story (STORY.md; LORE.md 10i): inside the Ember's first
// growth, under everything. Rough (PLAN.md stage 3, track A): built from the old second road's throne level
// (js/levels/lands/erdtree.js) as raw material, its layout kept, every name and character of that road gone; no rings of
// light, a burning deep under the roots instead of a golden abyss, and the light from the west so what the player walks
// toward is front-lit. The roots have no rail; the hollows a low lip. x east, z north; floors climb 0 -> 8 -> 16.
//   The first hollow (bonfire 1, Ysolde), the first root to the ember hollow (a Rootbound, the first of its kind, with an
//   elite Shield Warden and an elite Hollow), the rising root to the sap hollow (a Rootbound, an Undead Knight, two Toll
//   Wisps). North along a root an elite Empty Sentinel bars the way; the amber hollow (bonfire 2); the spiral root up to
//   the grafting, where the thralls went into the wood (three Rootbound, an elite Undead Knight); the long root east to
//   the last hollow (bonfire 3), the fog, and the heartwood, a ring of wood over the burning deep: the Kindling Tree.
const LEVEL_13 = {
  id: 'ember-root', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  name: 'Level 13: The Root of the Ember',
  description: 'Under everything, the Ember is a root. Inside its first growth: hollows of living red-gold wood, joined by roots over a burning deep. The roots have no rail. Where it began, the root has been given limbs.',
  help: 'Level 13: the roots have no rail: a fall is death. The Rootbound sink into the wood and rise where you stand, throw thorns of fire, and mark the floor to burn: step off the mark.',
  completeHint: 'The root is cut. Far off, under the storm, there is water that never burned…',
  wallHeight: 8, gateHeight: 3.2, gateThickness: 0.5, flasks: 9,
  atmosphere: { background: 0x1e100a, fog: 0x3e2418, fogDensity: 0.0095,
                moon: { color: 0xffd0a0, intensity: 2.3, position: [-30, 34, 12] },
                ambient: { color: 0x5a4636, intensity: 1.3 },
                hemi: { sky: 0xe0b090, ground: 0x24120a, intensity: 0.75 },
                exposure: 1.02, dust: 0.25, rim: 0xffc890,
                grade: { shadowTint: [1.0, 0.95, 0.92], highlightTint: [1.04, 0.99, 0.92], saturation: 0.82 },
                surface: { moss: 0.05, grime: 0.6 }, banners: [0x8a2a14, 0xc87a30],
                sky: { zenith: 0x140a06, sun: 0xff9a50, sunDir: [-0.6, 0.3, 0.3] } },
  realm: {
    weather: [{ kind: 'motes', amount: 1.2, colors: [0xff8a30, 0xffc070, 0xff5a20] }, { kind: 'leaves', amount: 0.2, colors: [0xc8541e, 0xe88a3a] }],
    clouds: { y: -30, color: 0x5a1a08, light: 0xff6a20 },   // the burning deep under the roots
    roots: [{ pts: [[30, -8, -6], [30, -3.2, 0], [30, -8, 6]], r: 2.2, color: 0x7a3418 }, { pts: [[105, 0, 18], [105, 5.4, 27], [105, 0, 36]], r: 2.0, color: 0x7a3418 },
            { pts: [[135, 4, 78], [135, 13.6, 84], [135, 4, 90]], r: 1.8, color: 0x7a3418 },
            { pts: [[-30, -40, 30], [20, 30, 60], [90, 90, 120], [160, 120, 140]], r: 9, color: 0x6a2a14 }, { pts: [[230, -40, 0], [200, 40, 40], [150, 110, 30]], r: 8, color: 0x6a2a14 },
            { pts: [[60, -40, -60], [80, 20, -30], [70, 90, -10]], r: 7, color: 0x6a2a14 }],
    pillars: [{ x: 260, z: 200, y0: -60, y1: 180, r: 20, color: 0x5a2a16 }, { x: -80, z: 140, y0: -60, y1: 160, r: 16, color: 0x5a2a16 }],
    beams: 0xffa060,
    grounds: [{ kind: 'emberbark', rooms: ['first-hollow', 'first-root', 'ember-hollow', 'sap-hollow', 'second-root', 'amber-hollow', 'last-root', 'last-hollow'] }],
  },
  start: { x: 4, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'first-hollow', rect: [0, 16, -8, 8], open: true, height: 6, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x5e3e2c, wall: 0x6e4a34, light: 0xffc890 },
    { id: 'first-root', rect: [16, 44, -2, 2], open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x6a4430, wall: 0x6e4a34 },
    { id: 'ember-hollow', rect: [44, 72, -12, 12], open: true, height: 8, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x5e3e2c, wall: 0x6e4a34, light: 0xffb878,
      pillars: [[46, -10], [70, 10]] },
    { id: 'sap-hollow', rect: [90, 120, -14, 14], y: 8, open: true, height: 8, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x5e3e2c, wall: 0x6e4a34, light: 0xffb878,
      pillars: [[92, -12], [118, -12]] },
    { id: 'second-root', rect: [102, 108, 14, 40], y: 8, open: true, height: 6, edges: { e: 'open', w: 'open' }, floor: 0x6a4430, wall: 0x6e4a34 },
    { id: 'amber-hollow', rect: [96, 114, 40, 54], y: 8, open: true, height: 6, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x5e3e2c, wall: 0x6e4a34, light: 0xffc080 },
    { id: 'the-grafting', rect: [90, 120, 72, 96], y: 16, open: true, height: 9, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x5e3e2c, wall: 0x6e4a34, light: 0xffb878,
      pillars: [[93, 75], [117, 75], [93, 93], [117, 93]], braziers: [[105, 94.5]] },
    { id: 'last-root', rect: [120, 150, 82, 86], y: 16, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x6a4430, wall: 0x6e4a34 },
    { id: 'last-hollow', rect: [150, 164, 76, 92], y: 16, open: true, height: 6, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0x5e3e2c, wall: 0x6e4a34, light: 0xffc890 },
    { id: 'fog-door', rect: [164, 168, 82, 86], y: 16, height: 6, floor: 0x4a3222, wall: 0x5e3e2c, dim: true },
    { id: 'the-heartwood', rect: [168, 208, 64, 104], y: 16, open: true, height: 16, edges: { n: 'rail', s: 'rail', e: 'rail', w: 'rail' }, railHeight: 0.9, floor: 0x6a4430, wall: 0x7a5038, light: 0xffc890,
      lamps: [[170, 66], [206, 66], [170, 102], [206, 102]] },
    { id: 'heartwood-exit', rect: [208, 212, 82, 86], y: 16, height: 5, floor: 0x4a3222, wall: 0x5e3e2c, light: 0xffc890, dim: true },
  ],
  ramps: [
    { id: 'rising-root', rect: [72, 90, -2, 2], axis: 'x', from: 0, to: 8, stairs: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x6a4430, wall: 0x6e4a34 },
    { id: 'root-spiral', rect: [101, 105, 54, 72], axis: 'z', from: 8, to: 16, stairs: true, height: 6, edges: { e: 'open', w: 'open' }, floor: 0x6a4430, wall: 0x6e4a34 },
  ],
  bonfires: [{ id: 'root-first', x: 3, z: -5.5, spawn: { x: 5, z: -4, yaw: Math.PI / 2 } },
             { id: 'root-amber', x: 97.5, y: 8, z: 52.5, spawn: { x: 99.5, y: 8, z: 51, yaw: 0 } },
             { id: 'root-heart', x: 151.5, y: 16, z: 77.5, spawn: { x: 153.5, y: 16, z: 79, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-ember', trigger: [44, 72, -12, 12], gate: { x: 72, z: 0, along: 'z', width: 4 },
      enemies: [{ enemy: 'rootbound', spawn: { x: 64, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'warden', variant: 'elite', spawn: { x: 55, z: -6, yaw: -Math.PI / 2 } },
                { enemy: 'hollow', variant: 'elite', spawn: { x: 55, z: 6, yaw: -Math.PI / 2 } }] },
    { id: 'zone-sap', trigger: [90, 120, -14, 14], gate: { x: 105, z: 14, y: 8, along: 'x', width: 6 },
      enemies: [{ enemy: 'rootbound', spawn: { x: 110, y: 8, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'knight', spawn: { x: 100, y: 8, z: -6, yaw: -Math.PI / 2 } },
                { enemy: 'wisp', notice: 30, leash: 40, wide: true, spawn: { x: 95, y: 8, z: 10, yaw: -Math.PI / 2 } },
                { enemy: 'wisp', notice: 30, leash: 40, wide: true, spawn: { x: 116, y: 8, z: 10, yaw: -Math.PI / 2 } }] },
    { id: 'zone-grafting', trigger: [90, 120, 72, 96], gate: { x: 120, z: 84, y: 16, along: 'z', width: 4 },
      enemies: [{ enemy: 'rootbound', spawn: { x: 100, y: 16, z: 82, yaw: Math.PI } }, { enemy: 'rootbound', spawn: { x: 112, y: 16, z: 90, yaw: Math.PI } },
                { enemy: 'knight', variant: 'elite', spawn: { x: 114, y: 16, z: 80, yaw: Math.PI } }, { enemy: 'rootbound', spawn: { x: 96, y: 16, z: 90, yaw: Math.PI } }] },
    // The heartwood: the tree. It sees the player only inside it (`arena`), so the last bonfire is safe.
    { id: 'zone-tree', trigger: [169, 208, 64, 104], gate: { x: 208, z: 84, y: 16, along: 'z', width: 4 },
      enemies: [{ enemy: 'kindlingTree', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['rooted', 'kindled'] }, spawn: { x: 198, y: 16, z: 84, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'tree-fog', gate: { x: 168, z: 84, y: 16, along: 'z', width: 4 }, fog: 'zone-tree' }],
  dispersed: [
    { behavior: 'sentry', enemy: 'sentinel', variant: 'elite', x: 105, y: 8, z: 30, yaw: Math.PI },
    { behavior: 'patrol', enemy: 'rootbound', z: 0, path: [20, 40] },
  ],
  devJumps: [
    { name: 'L13: Bonfire 2 (the amber hollow)', at: 'root-amber', won: ['zone-ember', 'zone-sap'] },
    { name: 'L13: Bonfire 3 (the tree\'s fog)', at: 'root-heart', won: ['zone-ember', 'zone-sap', 'zone-grafting'] },
  ],
};
