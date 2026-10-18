'use strict';
// The Lands Between, 5: Leyndell, Ashen Capital (v7.0). Boss: Godfrey, First Elden Lord. The capital after the burning:
// grey and black, ash falling like snow, embers in the wind, the Erdtree a black husk with fire still in its bark.
// x east, z north.
//   The ash gate (bonfire 1; Seren, only her grace now), the ash street (an Ashen Warrior, the first, with two Hollows).
//   The market lane: halfway along, the burnt street gives way wall to wall (a trap) and drops you into the cellar
//   below, where a Leyndell Knight, a Grafted Scion and two Rogues wait (the lane's far end is choked with rubble: there
//   is no going round). The cellar stair climbs out into the burnt yard (bonfire 2).
//   The cinder avenue (an Ashen Warrior and two Lancers), the ruined plaza (the big fight: an elite Ashen Warrior, a
//   Leyndell Knight, an elite Executioner, a Grafted Scion), the throne steps to the throne court (bonfire 3), the fog,
//   and the Elden Throne in ash: Godfrey, come home.
const LANDS_5 = {
  id: 'ashen-capital', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  name: 'Lands 5: Leyndell, Ashen Capital',
  description: 'The capital burned to ash with the Erdtree. Halfway down the market lane the street gives way; fight out of the cellars and on through the cinders to the throne, where the first Elden Lord has returned.',
  help: 'Lands 5: the burnt streets are not sound. Ashen Warriors stomp the floor into a running crack (jump it). Leyndell Knights still hold the plaza.',
  completeHint: 'The first Elden Lord kneels in the ash. The throne\'s doors still hold…',
  wallHeight: 9, gateHeight: 3.4, gateThickness: 0.5, flasks: 8,
  atmosphere: { background: 0x1a1614, fog: 0x2e2622, fogDensity: 0.016,
                moon: { color: 0xd0a080, intensity: 1.8, position: [20, 30, 30] },
                ambient: { color: 0x4a3c36, intensity: 1.45 },
                hemi: { sky: 0x8a7060, ground: 0x1e1612, intensity: 0.75 },
                exposure: 1.14, ash: 1.4, embers: 1.1, dust: 0.2, rim: 0xff9a60,
                grade: { shadowTint: [0.95, 0.9, 0.92], highlightTint: [1.1, 0.96, 0.84], saturation: 0.62 },
                surface: { moss: 0.05, grime: 1.5 }, banners: [0x3a2a20, 0x5a4a30], debris: 0.4,
                sky: { zenith: 0x120e0e, sun: 0xff6a30, sunDir: [0.3, 0.15, 0.95] }, silhouettes: 3 },
  realm: {
    tree: { kind: 'burnt', x: 180, z: 480, y: -80, height: 940, width: 520 },
    weather: [{ kind: 'ash', amount: 1.2 }],
    beams: 0xffc890,
    grounds: [{ kind: 'ash', rooms: ['ash-street', 'market-lane', 'burnt-yard', 'cinder-avenue', 'ruined-plaza', 'ash-gate'] }],
  },
  start: { x: 3, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'ash-gate', rect: [0, 14, -5, 5], open: true, height: 8, floor: 0x3a3430, wall: 0x4a423c, light: 0xff9a60, braziers: [[1.5, -3.5], [1.5, 3.5]] },
    { id: 'ash-street', rect: [14, 60, -6, 6], open: true, height: 9, floor: 0x34302c, wall: 0x46403a, light: 0xff8a50,
      lamps: [[18, -5], [18, 5], [40, -5], [40, 5], [58, -5], [58, 5]] },
    { id: 'market-lane', rect: [60, 96, -4, 4], open: true, height: 9, floor: 0x36302c, wall: 0x48403a, light: 0xff9050, dim: true },
    { id: 'rubble-end', rect: [96, 100, -4, 4], open: true, height: 6, floor: 0x2e2a26, wall: 0x403a34 },
    { id: 'cellar', rect: [60, 94, -12, 6], y: -5, height: 4.5, floor: 0x2a2420, wall: 0x3a322c, light: 0xd06030,
      pillars: [[70, -4], [84, -4]], braziers: [[61.5, -10.5], [92.5, 4.5]] },
    { id: 'burnt-yard', rect: [76, 110, -42, -28], open: true, height: 9, floor: 0x36302c, wall: 0x48403a, light: 0xffa060,
      lamps: [[108, -40.5], [108, -29.5]] },
    { id: 'cinder-avenue', rect: [110, 160, -38, -30], open: true, height: 9, floor: 0x34302c, wall: 0x46403a, light: 0xff8a50,
      lamps: [[124, -37], [146, -31]] },
    { id: 'ruined-plaza', rect: [160, 200, -50, -10], open: true, height: 12, floor: 0x383230, wall: 0x4a423c, light: 0xff9a60,
      pillars: [[168, -42], [192, -42], [168, -18], [192, -18]], lamps: [[162, -48], [198, -48], [162, -12], [198, -12]] },
    { id: 'throne-court', rect: [170, 190, 12, 22], y: 10, open: true, height: 10, floor: 0x3a3430, wall: 0x4a423c, light: 0xffb070,
      braziers: [[188.5, 13.5], [188.5, 20.5]] },
    { id: 'fog-door', rect: [177, 183, 22, 26], y: 10, height: 6, floor: 0x34302c, wall: 0x46403a, dim: true },
    { id: 'ashen-throne', rect: [160, 200, 26, 66], y: 10, open: true, height: 16, floor: 0x3c3632, wall: 0x504840, light: 0xffb070,
      lamps: [[162, 28], [198, 28], [162, 64], [198, 64]] },
    { id: 'throne-exit', rect: [177, 183, 66, 70], y: 10, height: 5, floor: 0x34302c, wall: 0x46403a, light: 0xffd090, dim: true },
  ],
  ramps: [
    { id: 'cellar-stair', rect: [84, 90, -28, -12], axis: 'z', from: 0, to: -5, stairs: true, height: 4.5, floor: 0x2e2a26, wall: 0x403a34 },
    { id: 'throne-steps', rect: [176, 184, -10, 12], axis: 'z', from: 0, to: 10, stairs: true, height: 10, floor: 0x36302c, wall: 0x48403a },
  ],
  // Masonry: the burnt shells either side of the cellar stair, the throne court's footing and the throne's.
  blocks: [{ rect: [60, 84, -28, -12], y0: 0, y1: 7, wall: 0x3e3832 }, { rect: [90, 110, -28, -12], y0: 0, y1: 7.5, wall: 0x3e3832 },
           { rect: [170, 190, 12, 22], y0: 0, y1: 9.5, wall: 0x4a423c }, { rect: [160, 200, 22, 70], y0: -20, y1: 9.5, wall: 0x4a423c }],
  houses: [
    ...houseRow([14, 60, -18, -6], 'x', [8, 7, 8, 8, 7, 8], [8, 9, 7.5, 8.5, 9, 8]).map((H, i) => ({ ...H, burning: i % 3 === 1, ruined: i % 3 === 2, stone: true })),
    ...houseRow([14, 60, 6, 18], 'x', [8, 8, 7, 8, 8, 7], [9, 8, 8.5, 7.5, 9, 8]).map((H, i) => ({ ...H, burning: i % 3 === 0, ruined: i % 3 === 2, stone: true })),
    ...houseRow([60, 96, -10.5, -4], 'x', [9, 9, 9, 9], [8, 9, 8.5, 9]).map((H, i) => ({ ...H, y: 0, burning: i === 2, ruined: i === 1, stone: true })),
    ...houseRow([60, 96, 4, 14], 'x', [9, 9, 9, 9], [9, 8, 9.5, 8.5]).map((H, i) => ({ ...H, y: 0, burning: i === 1, ruined: i === 3, stone: true })),
    { rect: [96, 108, -10.5, -4], eaves: 9, ridge: 'x', y: 0, stone: true, ruined: true }, { rect: [96, 108, 4, 16], eaves: 10, ridge: 'x', y: 0, stone: true },
    { rect: [100, 108, -4, 4], eaves: 12, ridge: 'z', y: 0, stone: true, ruined: true },
    ...houseRow([110, 160, -50, -38], 'x', [10, 10, 10, 10, 10], [8, 9, 8.5, 9.5, 8]).map((H, i) => ({ ...H, burning: i % 2 === 0, stone: true })),
    ...houseRow([110, 160, -30, -18], 'x', [10, 10, 10, 10, 10], [9, 8, 9.5, 8, 9]).map((H, i) => ({ ...H, ruined: i % 2 === 1, burning: i === 2, stone: true })),
  ],
  props: [
    { kind: 'heap', x: 30, z: -4.2 }, { kind: 'cart', x: 46, z: 4.2 }, { kind: 'crates', x: 78, z: -38, yaw: Math.PI / 2 },
    { kind: 'heap', x: 174, z: -30 }, { kind: 'brokenStall', x: 186, z: -46 }, { kind: 'heap', x: 196, z: -26, yaw: Math.PI / 2 },
  ],
  bonfires: [{ id: 'ash-gate', x: 11.5, z: -3.5, spawn: { x: 9.5, z: -2, yaw: Math.PI / 2 } },
             { id: 'ash-yard', x: 78, z: -30.5, spawn: { x: 80, z: -32, yaw: Math.PI / 2 } },
             { id: 'ash-throne', x: 171.5, y: 10, z: 20.5, spawn: { x: 173.5, y: 10, z: 19, yaw: 0 } }],
  gated: [
    { id: 'zone-street', trigger: [44, 60, -6, 6], gate: { x: 60, z: 0, along: 'z', width: 8, style: 'barricade' },
      enemies: [{ enemy: 'ashenWarrior', spawn: { x: 55, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'hollow', variant: 'elite', spawn: { x: 49, z: -3.5, yaw: -Math.PI / 2 } },
                { enemy: 'hollow', variant: 'elite', spawn: { x: 49, z: 3.5, yaw: -Math.PI / 2 } }] },
    // The cellar under the lane: the fall puts the player among them. Its gate is at the foot of the cellar stair.
    { id: 'zone-cellar', trigger: [60, 94, -12, 6], gate: { x: 87, z: -12, y: -5, along: 'x', width: 6 },
      enemies: [{ enemy: 'leyndellKnight', spawn: { x: 82, y: -5, z: -7, yaw: Math.PI / 2 } }, { enemy: 'graftedScion', spawn: { x: 70, y: -5, z: 2, yaw: Math.PI / 2 } },
                { enemy: 'rogue', behavior: 'slumber', spawn: { x: 64, y: -5, z: -9, yaw: Math.PI / 2 } }, { enemy: 'rogue', behavior: 'slumber', spawn: { x: 91, y: -5, z: 2, yaw: -Math.PI / 2 } }] },
    { id: 'zone-cinder', trigger: [130, 160, -38, -30], gate: { x: 160, z: -34, along: 'z', width: 8 },
      enemies: [{ enemy: 'ashenWarrior', spawn: { x: 152, z: -34, yaw: -Math.PI / 2 } }, { enemy: 'lancer', spawn: { x: 142, z: -36.5, yaw: -Math.PI / 2 } },
                { enemy: 'lancer', spawn: { x: 142, z: -31.5, yaw: -Math.PI / 2 } }] },
    { id: 'zone-plaza', trigger: [160, 200, -50, -10], gate: { x: 180, z: -10, along: 'x', width: 8 },
      enemies: [{ enemy: 'ashenWarrior', variant: 'elite', spawn: { x: 180, z: -22, yaw: Math.PI } }, { enemy: 'leyndellKnight', spawn: { x: 171, z: -36, yaw: -Math.PI / 2 } },
                { enemy: 'executioner', variant: 'elite', spawn: { x: 190, z: -36, yaw: -Math.PI / 2 } }, { enemy: 'graftedScion', spawn: { x: 186, z: -16, yaw: Math.PI } }] },
    { id: 'zone-godfrey', trigger: [160, 200, 27, 66], gate: { x: 180, z: 66, y: 10, along: 'x', width: 6 },
      enemies: [{ enemy: 'godfrey', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['lord', 'regal', 'loux', 'rage'] }, spawn: { x: 180, y: 10, z: 54, yaw: Math.PI } }] },
  ],
  sealed: [{ id: 'lane-rubble', gate: { x: 96, z: 0, along: 'z', width: 8 } },
           { id: 'godfrey-fog', gate: { x: 180, z: 26, y: 10, along: 'x', width: 6 }, fog: 'zone-godfrey' }],
  // The lane's floor, wall to wall from x 66 to 90: too long to jump, and the far end is blocked.
  traps: [{ id: 'lane-floor', collapse: [66, 90, -4, 4], trigger: [70, 90, -4, 4], warning: 0.4 }],
  dispersed: [
    { behavior: 'patrol', enemy: 'hollow', variant: 'elite', z: 2.5, path: [20, 38] },
  ],
  hints: [{ kind: 'corpse', x: 64, z: 2.2, yaw: 1.4 }],
  devJumps: [
    { name: 'Lands 5: Bonfire 2 (burnt yard)', at: 'ash-yard', won: ['zone-street', 'zone-cellar'] },
    { name: 'Lands 5: Bonfire 3 (Godfrey\'s fog)', at: 'ash-throne', won: ['zone-street', 'zone-cellar', 'zone-cinder', 'zone-plaza'] },
  ],
};
