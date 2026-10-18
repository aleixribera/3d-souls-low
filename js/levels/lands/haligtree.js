'use strict';
// The Lands Between, 8: the Haligtree (v7.0). Boss: Malenia, Blade of Miquella. Two halves: high in the frozen boughs of
// the Haligtree (snow, pale gold leaves, the drop to the clouds under every branch), then down through Elphael's brace
// into the rot, where the courts lie flooded with scarlet rot that eats at the feet (a hazard floor) and Malenia waits by
// the lake. x east, z north; floors fall 24 -> 16 -> 0.
//   The frozen ledge (bonfire 1; Seren's grace), the first branch (a Wisp on a twig), the branch fork (a Cleanrot Knight,
//   the first, an elite Omenkin, an elite Rogue), the branch down to the brace gate (two Cleanrot Knights, a Golden
//   Zealot, a Wisp), the prayer stair down to Elphael's yard (bonfire 2), the rot court (wade or walk the dry stone: an
//   elite Cleanrot Knight, an Ashen Warrior, Beastmen, a Grafted Scion), the drainage passage (a Rogue asleep), the
//   lake shore (bonfire 3), the fog, and the lake: Malenia.
const LANDS_8 = {
  id: 'haligtree', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true, ending: true,
  name: 'Lands 8: The Haligtree',
  description: 'The last shard of the Ring lies under the Haligtree. Walk its frozen boughs, descend through Elphael into the scarlet rot, and face the Blade of Miquella by the lake.',
  help: 'Lands 8: the boughs have no rail. Below, the scarlet rot eats at your feet while you stand in it: keep to the dry stone. Cleanrot Knights heal a little with every blow they land.',
  wallHeight: 9, gateHeight: 3.4, gateThickness: 0.5, flasks: 9,
  atmosphere: { background: 0x3a2c30, fog: 0x7a5a5c, fogDensity: 0.0105,
                moon: { color: 0xffe0d0, intensity: 2.2, position: [-20, 40, 20] },
                ambient: { color: 0x5a4a50, intensity: 1.3 },
                hemi: { sky: 0xe8d8d8, ground: 0x3a1418, intensity: 0.7 },
                exposure: 1.04, dust: 0.15, rim: 0xffd0c0,
                grade: { shadowTint: [0.96, 0.92, 1.0], highlightTint: [1.08, 1.0, 0.94], saturation: 0.86 },
                surface: { moss: 0.6, grime: 0.9 }, banners: [0x8a1a14, 0xd8b060],
                sky: { zenith: 0x2a2028, sun: 0xffb8a0, sunDir: [0.5, 0.25, -0.6] }, silhouettes: 2 },
  realm: {
    tree: { kind: 'haligtree', x: -120, z: -420, y: -160, height: 980, width: 520 },
    weather: [{ kind: 'snow', amount: 0.8 }, { kind: 'petals', amount: 0.5, colors: [0xd8302a, 0xffc070] }, { kind: 'spores', amount: 0.6 }],
    clouds: { y: -22, color: 0x5a3a40, light: 0xffd0c0 },
    roots: [{ pts: [[30, 16, -6], [32, 21.5, 0], [30, 16, 6]], r: 1.8 }, { pts: [[14, 10, 0], [30, 21, 0], [48, 18, 0]], r: 2.4 },
            { pts: [[70, 8, -14], [82, 13.6, 0], [94, 4, 16]], r: 2.2 },
            { pts: [[-40, -30, -60], [10, 10, -40], [60, 60, -70], [120, 90, -110]], r: 12 }, { pts: [[160, -30, 40], [120, 30, 30], [60, 70, 50]], r: 10 }],
    blooms: [{ x: 130, z: -54, r: 5, count: 30 }, { x: 154, z: -40, r: 5, count: 30 }, { x: 131, z: -36, r: 3, count: 16 },
             { x: 226, z: -30, r: 4, count: 26 }, { x: 226, z: -64, r: 4, count: 26 }, { x: 192, z: -38, r: 3, count: 16 }],
    beams: 0xffe0c0,
    grounds: [{ kind: 'snow', rooms: ['frozen-ledge', 'branch-fork'] }, { kind: 'palebark', rooms: ['branch-1', 'twig'] },
              { kind: 'earth', rooms: ['elphael-yard', 'lake-shore'] }],
  },
  start: { x: 4, y: 24, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'frozen-ledge', rect: [0, 14, -7, 7], y: 24, open: true, height: 6, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0xb8b0a8, wall: 0xd0c8c0, light: 0xffe0d0 },
    { id: 'branch-1', rect: [14, 48, -2.5, 2.5], y: 24, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x8a7a6a, wall: 0xa89888 },
    { id: 'twig', rect: [28, 31, 5, 8], y: 27, open: true, height: 4, edges: { n: 'open', s: 'open', e: 'open', w: 'open' }, floor: 0x8a7a6a, wall: 0xa89888 },
    { id: 'branch-fork', rect: [48, 72, -10, 10], y: 24, open: true, height: 8, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0xb0a89e, wall: 0xc8c0b6, light: 0xffe8d8 },
    { id: 'brace-gate', rect: [92, 116, -12, 12], y: 16, open: true, height: 9, edges: { n: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0xb4aca0, wall: 0xccc4b8, light: 0xffe0c8,
      pillars: [[94, 10], [114, 10], [94, -10], [114, -10]], braziers: [[115, 0]] },
    { id: 'elphael-yard', rect: [88, 120, -54, -40], open: true, height: 9, floor: 0x8a7470, wall: 0xa08884, light: 0xffc8b0,
      braziers: [[118.5, -52.5], [118.5, -41.5]] },
    { id: 'rot-court', rect: [120, 164, -62, -32], open: true, height: 10, floor: 0x5a3a36, wall: 0x7a5650, light: 0xff6a50,
      pillars: [[142, -58], [142, -36]], lamps: [[122, -33.5], [162, -60.5]] },
    { id: 'drainage', rect: [164, 184, -50, -44], height: 4.5, floor: 0x4a3230, wall: 0x6a4a46, light: 0xd05040, dim: true },
    { id: 'lake-shore', rect: [184, 200, -58, -36], open: true, height: 9, floor: 0x6a4a46, wall: 0x8a6660, light: 0xffb090,
      braziers: [[198.5, -56.5], [198.5, -37.5]] },
    { id: 'fog-door', rect: [200, 204, -49, -45], height: 6, floor: 0x5a3e3a, wall: 0x7a5650, dim: true },
    { id: 'rot-lake', rect: [204, 248, -68, -26], open: true, height: 14, floor: 0x6a4e4a, wall: 0x8a6a64, light: 0xffc0a0,
      lamps: [[206, -66], [246, -66], [206, -28], [246, -28]] },
    { id: 'lake-exit', rect: [248, 252, -49, -45], height: 5, floor: 0x5a3e3a, wall: 0x7a5650, light: 0xffe0c0, dim: true },
  ],
  ramps: [
    { id: 'branch-down', rect: [72, 92, -2.5, 2.5], axis: 'x', from: 24, to: 16, stairs: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x8a7a6a, wall: 0xa89888 },
    { id: 'prayer-stair', rect: [101, 107, -40, -12], axis: 'z', from: 0, to: 16, stairs: true, height: 6, floor: 0xa89c90, wall: 0xc0b4a8 },
  ],
  // The brace: masonry under the gate's floor, so Elphael stands on stone.
  blocks: [{ rect: [92, 116, -12, 12], y0: -10, y1: 15.5, wall: 0xb0a49a }],
  // The scarlet rot: where it lies, standing in it costs health every second (drawn as pools of rot, js/realms.js).
  hazards: [{ id: 'rot-a', kind: 'rot', rect: [121, 138, -61, -49], dps: 7 }, { id: 'rot-b', kind: 'rot', rect: [146, 163, -46, -33], dps: 7 },
            { id: 'rot-c', kind: 'rot', rect: [126, 137, -40, -33], dps: 7 }, { id: 'rot-d', kind: 'rot', rect: [186, 196, -58, -52], dps: 7 }],
  bonfires: [{ id: 'halig-ledge', x: 3, y: 24, z: -4.5, spawn: { x: 5, y: 24, z: -3, yaw: Math.PI / 2 } },
             { id: 'halig-elphael', x: 90, z: -52, spawn: { x: 92, z: -50.5, yaw: Math.PI / 2 } },
             { id: 'halig-lake', x: 186, z: -38, spawn: { x: 188, z: -40, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-fork', trigger: [48, 72, -10, 10], gate: { x: 72, z: 0, y: 24, along: 'z', width: 5 },
      enemies: [{ enemy: 'cleanrotKnight', spawn: { x: 65, y: 24, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'omenkin', variant: 'elite', spawn: { x: 57, y: 24, z: -6, yaw: -Math.PI / 2 } },
                { enemy: 'rogue', variant: 'elite', spawn: { x: 57, y: 24, z: 6, yaw: -Math.PI / 2 } }] },
    { id: 'zone-brace', trigger: [92, 116, -12, 12], gate: { x: 104, z: -12, y: 16, along: 'x', width: 6 },
      enemies: [{ enemy: 'cleanrotKnight', spawn: { x: 104, y: 16, z: -5, yaw: -Math.PI / 2 } }, { enemy: 'cleanrotKnight', spawn: { x: 110, y: 16, z: 4, yaw: -Math.PI / 2 } },
                { enemy: 'goldenZealot', spawn: { x: 99, y: 16, z: -6, yaw: -Math.PI / 2 } },
                { enemy: 'wisp', notice: 30, leash: 40, wide: true, spawn: { x: 98, y: 16, z: 8, yaw: -Math.PI / 2 } }] },
    { id: 'zone-court', trigger: [120, 164, -62, -32], gate: { x: 164, z: -47, along: 'z', width: 6 },
      enemies: [{ enemy: 'cleanrotKnight', variant: 'elite', spawn: { x: 154, z: -50, yaw: -Math.PI / 2 } }, { enemy: 'ashenWarrior', spawn: { x: 145, z: -54, yaw: -Math.PI / 2 } },
                { enemy: 'beastman', spawn: { x: 132, z: -45, yaw: -Math.PI / 2 } }, { enemy: 'beastman', spawn: { x: 158, z: -58, yaw: -Math.PI / 2 } },
                { enemy: 'graftedScion', spawn: { x: 142, z: -41, yaw: -Math.PI / 2 } }] },
    { id: 'zone-malenia', trigger: [205, 248, -68, -26], gate: { x: 248, z: -47, along: 'z', width: 4 },
      enemies: [{ enemy: 'malenia', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['blade', 'rot'] }, spawn: { x: 236, z: -47, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'malenia-fog', gate: { x: 204, z: -47, along: 'z', width: 4 }, fog: 'zone-malenia' }],
  dispersed: [
    { behavior: 'sentry', enemy: 'wisp', notice: 18, leash: 30, wide: true, x: 29.5, y: 27, z: 6.5, yaw: Math.PI },
    { behavior: 'slumber', enemy: 'rogue', variant: 'elite', x: 178, z: -47, yaw: -Math.PI / 2 },
  ],
  hints: [{ kind: 'corpse', x: 170, z: -45.5, yaw: 0.4 }],
  devJumps: [
    { name: 'Lands 8: Bonfire 2 (Elphael)', at: 'halig-elphael', won: ['zone-fork', 'zone-brace'] },
    { name: 'Lands 8: Bonfire 3 (Malenia\'s fog)', at: 'halig-lake', won: ['zone-fork', 'zone-brace', 'zone-court'] },
  ],
};
