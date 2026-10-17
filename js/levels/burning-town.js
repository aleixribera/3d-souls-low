'use strict';
// Level 3: The Burning Town. The invaders sacked it and set it alight; the player comes out of the Sunken Keep at its
// lower gate and fights up through it to the upper town gate and the cliff road toward the Tower. x runs east, z north;
// floors climb in terraces (y 0, 4, 8, 12). A massive castle stands on the horizon to the east, the sun setting behind
// it, and the main streets point at it.
//   Lower town (y 0): the lower gate street (bonfire 1; the way back into the Keep is shut), the first street and the
//     market. Stairs climb north from the market to the steep street.
//   Steep street (y 4), running back west: a Lancer below and a Bowman on a balcony above, reached through the stair
//     house. A side stair at its east end climbs to an overlook above the market: the one drop that hurts (7.5 m).
//   The alley (y 4) bends north round a corner where a Duelist waits; a yard off it holds a sleeping Knight.
//   Fountain square (y 8): a gate at its south-west corner opens (from this side) onto the long stair down to bonfire 1.
//     East of it, the tavern (bonfire 2), then a lane and stairs east up to
//   the church square (y 12), the biggest fight, with a Bowman on the church's gallery (reached by a stair inside
//     the church). East again, the upper square: the Pillager Captain, before the upper town gate and the cliff road.
// Rows of houses are filled with `houseRow` (js/helpers.js).
const LEVEL_3 = {
  id: 'burning-town', layout: 'rooms', alert: true, cull: true,
  next: 'the-tower',   // once the town is clear, carry on up the cliff road to the Tower
  name: 'Level 3: The Burning Town',
  description: 'The invaders sacked the town and set it alight. Clear them out, street by street, up to the upper gate.',
  help: 'Level 3: the invaders hold the town street by street; each barricade falls once its fight is won. Bowmen shoot from above: find the way up to them.',
  completeHint: 'The town is free. Onward to the Tower…',
  wallHeight: 6, gateHeight: 3.2, gateThickness: 0.5,
  // Sunset over a burning town: warm haze, smoke and embers, the sun low behind the castle to the east.
  atmosphere: { background: 0x3a2622, fog: 0x5c3c30, fogDensity: 0.0085,
                moon: { color: 0xffa868, intensity: 2.0, position: [60, 12, 4] },
                ambient: { color: 0x5a4440, intensity: 1.0 },
                hemi: { sky: 0xc88868, ground: 0x2a1a14, intensity: 0.7 },
                exposure: 1.05, embers: 0.9, dust: 0.1, rim: 0xffa070,
                grade: { shadowTint: [0.92, 0.9, 1.06], highlightTint: [1.08, 0.97, 0.85], saturation: 0.82 },
                surface: { moss: 0.2, grime: 1.1 }, banners: [0x3a2a2a, 0x2a2e3a], debris: 0.1,
                sky: { zenith: 0x262038, sun: 0xff7a3a, sunDir: [1, 0.08, 0.05] }, silhouettes: 2,
                landmark: { x: 700, z: 60, y: -20, height: 300, width: 320 } },
  start: { x: 4, z: 1, yaw: Math.PI / 2 },
  rooms: [
    // The lower town (y 0).
    { id: 'keep-exit', rect: [-6, 0, -3, 3], height: 4.5, floor: 0x3a3733, wall: 0x6a6258, light: 0xd06040, dim: true },
    { id: 'lower-gate', rect: [0, 26, -4, 4], open: true, floor: 0x4a4440, wall: 0x6a6258, light: 0xffa868 },
    { id: 'shortcut-foot', rect: [4, 8, 4, 6], open: true, floor: 0x46403a, wall: 0x6a6258 },
    { id: 'first-street', rect: [26, 52, -4, 4], open: true, floor: 0x4a4440, wall: 0x6a6258 },
    { id: 'market', rect: [52, 80, -12, 10], open: true, floor: 0x4c4640, wall: 0x6a6258, light: 0xffa060 },
    // The steep street (y 4), its balcony (y 8) and the stair house; the overlook over the market (y 8).
    { id: 'steep-street', rect: [22, 68, 22, 28], y: 4, open: true, floor: 0x4a4440, wall: 0x6a6258 },
    // Low rails (v4.2.4): a jump clears them, so the player can drop back to the street.
    { id: 'balcony', rect: [32, 45, 28, 33], y: 8, open: true, height: 4, edges: { s: 'rail' }, railHeight: 0.7, floor: 0x4a4030, wall: 0x6a6258 },
    { id: 'sh-door', rect: [53, 55, 28, 29], y: 4, height: 3.2, floor: 0x3a3028, wall: 0x8a7a60, dim: true },
    { id: 'sh-hall', rect: [52, 59, 29, 37], y: 4, height: 3.4, floor: 0x3a3028, wall: 0x8a7a60, light: 0xffa050, dim: true },
    { id: 'overlook-walk', rect: [75, 80, 16, 26], y: 7.5, open: true, floor: 0x46403a, wall: 0x6a6258 },
    { id: 'overlook', rect: [68, 80, 10, 16], y: 7.5, open: true, edges: { s: 'open', w: 'rail' }, floor: 0x46403a, wall: 0x6a6258 },
    // The alley (y 4) and the yard off it.
    { id: 'alley-a', rect: [14, 22, 22, 27], y: 4, open: true, floor: 0x44403a, wall: 0x6a6258 },
    { id: 'alley-b', rect: [16, 20, 27, 40], y: 4, open: true, floor: 0x44403a, wall: 0x6a6258 },
    { id: 'yard-passage', rect: [16, 19, 20, 22], y: 4, open: true, floor: 0x44403a, wall: 0x6a6258 },
    { id: 'knight-yard', rect: [12, 22, 10, 20], y: 4, open: true, floor: 0x46423a, wall: 0x6a6258 },
    // The fountain square (y 8), the tavern and the lane east.
    { id: 'fountain-square', rect: [0, 30, 47, 71], y: 8, open: true, floor: 0x4c4640, wall: 0x6a6258, light: 0xffa868 },
    { id: 'tavern-door', rect: [30, 32, 58, 61], y: 8, height: 3.4, floor: 0x3a3028, wall: 0x8a7a60, dim: true },
    { id: 'tavern', rect: [32, 44, 54, 66], y: 8, height: 4.2, floor: 0x3a3028, wall: 0x8a7a60, light: 0xffa050 },
    { id: 'tavern-back', rect: [44, 46, 58, 61], y: 8, height: 3.4, floor: 0x3a3028, wall: 0x8a7a60, dim: true },
    { id: 'upper-lane', rect: [46, 66, 56, 64], y: 8, open: true, floor: 0x4a4440, wall: 0x6a6258 },
    // The church square (y 12), the church (porch, gallery, and the stair up to it inside), the upper square, the gate.
    { id: 'church-square', rect: [76, 116, 44, 80], y: 12, open: true, height: 4.5, floor: 0x4c4640, wall: 0x6a6258, light: 0xffa868 },
    { id: 'church-porch', rect: [92, 94, 80, 83], y: 12, height: 3.4, floor: 0x3a3733, wall: 0x7a7266, dim: true },
    { id: 'gallery', rect: [82, 106, 80, 83], y: 17, open: true, height: 4, edges: { s: 'rail' }, railHeight: 0.7, floor: 0x4a4436, wall: 0x7a7266 },
    { id: 'church-door', rect: [92, 94, 83, 84], y: 12, height: 3.4, floor: 0x3a3733, wall: 0x7a7266, dim: true },
    { id: 'church-aisle', rect: [83, 107, 84, 88], y: 12, height: 4.5, floor: 0x3a3733, wall: 0x7a7266, light: 0xffc080, dim: true },
    { id: 'church-loft', rect: [83, 107, 84, 88], y: 17, height: 3.5, floor: 0x3a3428, wall: 0x7a7266, dim: true },
    { id: 'church-landing', rect: [83, 87, 83, 84], y: 17, height: 3.5, floor: 0x3a3428, wall: 0x7a7266, dim: true },
    { id: 'church-walk', rect: [87, 91, 88, 97], y: 17, height: 3.5, edges: { w: 'rail' }, floor: 0x3a3428, wall: 0x7a7266, dim: true },
    { id: 'church-upper', rect: [83, 91, 97, 99], y: 17, height: 3.5, floor: 0x3a3428, wall: 0x7a7266, dim: true },
    { id: 'upper-street', rect: [116, 124, 59, 65], y: 12, open: true, height: 4.5, floor: 0x4a4440, wall: 0x6a6258 },
    { id: 'upper-square', rect: [124, 148, 50, 74], y: 12, open: true, height: 4.5, floor: 0x4c4640, wall: 0x6a6258, light: 0xffa060 },
    { id: 'town-gate', rect: [148, 154, 59, 65], y: 12, open: true, height: 4.5, floor: 0x3a3733, wall: 0x6a6258 },
    { id: 'cliff-road', rect: [154, 186, 57, 67], y: 12, open: true, height: 4, edges: { n: 'rail', s: 'rail', e: 'rail' },
      floor: 0x4a4436, wall: 0x6a6258 },
  ],
  // Ramps rise along `axis` from `from` (west or south end) to `to`.
  ramps: [
    { id: 'shortcut-stair', rect: [4, 8, 6, 47], axis: 'z', from: 0, to: 8, stairs: true, height: 4, floor: 0x46403a, wall: 0x6a6258 },
    { id: 'steep-stairs', rect: [62, 68, 10, 22], axis: 'z', from: 0, to: 4, stairs: true, height: 6, floor: 0x46403a, wall: 0x6a6258 },
    { id: 'sh-stair', rect: [45, 52, 29, 32.5], axis: 'x', from: 8, to: 4, stairs: true, height: 3.5, floor: 0x3a3028, wall: 0x8a7a60 },
    { id: 'overlook-stair', rect: [68, 75, 22, 26], axis: 'x', from: 4, to: 7.5, stairs: true, height: 6, floor: 0x46403a, wall: 0x6a6258 },
    { id: 'alley-stairs', rect: [16, 20, 40, 47], axis: 'z', from: 4, to: 8, stairs: true, height: 6, floor: 0x44403a, wall: 0x6a6258 },
    { id: 'church-stairs', rect: [66, 76, 56, 64], axis: 'x', from: 8, to: 12, stairs: true, height: 6, floor: 0x46403a, wall: 0x6a6258 },
    { id: 'church-stair', rect: [83, 87, 88, 97], axis: 'z', from: 12, to: 17, stairs: true, height: 3.5, floor: 0x3a3428, wall: 0x7a7266 },
  ],
  // Solid stone under the church's gallery, either side of its porch.
  blocks: [{ rect: [81, 92, 80, 83], y0: 12, y1: 16.5, wall: 0x7a7266 }, { rect: [94, 107, 80, 83], y0: 12, y1: 16.5, wall: 0x7a7266 }],
  houses: [
    // The town wall's gate towers and the gatehouse over the way back to the Keep.
    { rect: [-14, 0, -16, -3], eaves: 9, ridge: 'z', stone: true },
    { rect: [-14, 0, -3, 3], eaves: 10, ridge: 'z', stone: true, rooms: ['keep-exit'] },
    { rect: [-14, 0, 3, 16], eaves: 9, ridge: 'z', stone: true },
    // The lower town: both sides of the lower gate street and the first street, round the market.
    ...houseRow([0, 52, -16, -4], 'x', [7, 6, 7, 6, 7, 6, 7, 6], [7, 8, 6.5, 7.5, 8.5, 7, 6.5, 8]),
    ...houseRow([52, 80, -24, -12], 'x', [7, 7, 7, 7], [8, 7, 8.5, 7.5]),
    ...houseRow([80, 92, -12, 10], 'z', [7, 8, 7], [5.5, 5, 5.5], { ridge: 'x' }),   // low, gable-fronted: the castle shows over them
    ...houseRow([8, 26, 4, 10], 'x', [6, 6, 6], [10, 10.5, 10]),
    ...houseRow([26, 52, 4, 13], 'x', [6, 7, 6, 7], [8, 9, 7.5, 8.5]),
    ...houseRow([26, 52, 13, 22], 'x', [8, 9, 9], [7, 8, 7]),
    ...houseRow([52, 62, 10, 22], 'x', [5, 5], [11, 11.5]),
    { rect: [22, 26, 10, 22], eaves: 7, ridge: 'z' },
    // Along the long shortcut stair from the fountain square down to the lower gate.
    ...houseRow([-10, 4, 16, 47], 'z', [8, 8, 7, 8], [9, 10.5, 11.5, 13.5]),
    { rect: [0, 4, 4, 16], eaves: 9, ridge: 'z' },
    { rect: [8, 12, 10, 22], eaves: 10.5, ridge: 'z' },
    { rect: [8, 14, 22, 30], eaves: 11, ridge: 'z' }, { rect: [14, 16, 27, 30], eaves: 7, ridge: 'z' },
    ...houseRow([8, 16, 30, 47], 'z', [8, 9], [12.5, 14]),
    { rect: [12, 16, 20, 22], eaves: 7, ridge: 'x' }, { rect: [19, 22, 20, 22], eaves: 7, ridge: 'x' },
    // The steep street: the balcony and the stair house that leads up to it, the houses round the overlook.
    { rect: [45, 60, 28, 38], eaves: 9, ridge: 'x', rooms: ['sh-door', 'sh-hall', 'sh-stair'], lit: 0.6 },
    { rect: [60, 68, 28, 38], eaves: 8, ridge: 'z' },
    { rect: [68, 80, 26, 38], eaves: 10, ridge: 'x', ruined: true },
    { rect: [68, 75, 16, 22], eaves: 14, ridge: 'z' },
    ...houseRow([80, 92, 10, 30], 'z', [10, 10], [9, 8]),
    { rect: [32, 45, 33, 42], eaves: 7, ridge: 'x', burning: true },
    { rect: [20, 32, 28, 42], eaves: 9, ridge: 'z' },
    { rect: [20, 30, 42, 47], eaves: 10.5, ridge: 'x' },
    { rect: [30, 46, 42, 53], eaves: 7.5, ridge: 'x' },
    // Round the fountain square; the tavern on its east side.
    ...houseRow([-10, 0, 47, 71], 'z', [8, 8, 8], [8, 9, 7.5]),
    { rect: [0, 8, 71, 82], eaves: 8, ridge: 'z' },
    { rect: [8, 22, 71, 84], eaves: 11, ridge: 'x', stone: true, lit: 0.4 },   // the town hall
    { rect: [22, 30, 71, 82], eaves: 9, ridge: 'z', burning: true },
    { rect: [30, 46, 53, 67], eaves: 8, ridge: 'x', rooms: ['tavern-door', 'tavern', 'tavern-back'], lit: 0.8 },
    { rect: [30, 46, 67, 80], eaves: 8.5, ridge: 'x' },
    // Both sides of the upper lane and the stairs up to the church square.
    ...houseRow([46, 76, 44, 56], 'x', [8, 8, 8, 6], [8, 9, 8.5, 11.5]).map((H, i) => i === 1 ? { ...H, burning: true } : H),
    ...houseRow([46, 76, 64, 76], 'x', [8, 8, 8, 6], [9, 8, 9.5, 11.5]),
    // Round the church square: the church (its gallery out front, a stair inside) and its bell tower.
    { rect: [76, 80, 38, 44], eaves: 8, ridge: 'z' },
    ...houseRow([80, 116, 32, 44], 'x', [8, 8, 8, 6, 6], [8, 9, 7.5, 8.5, 9]).map((H, i) => i === 1 ? { ...H, burning: true } : i === 3 ? { ...H, ruined: true } : H),
    { rect: [70, 76, 76, 84], eaves: 9, ridge: 'z' },
    { rect: [76, 82, 80, 100], eaves: 10, ridge: 'z' },
    { rect: [82, 108, 83, 100], eaves: 13, ridge: 'x', stone: true, lit: 0.5,
      rooms: ['church-door', 'church-aisle', 'church-loft', 'church-landing', 'church-walk', 'church-upper', 'church-stair'] },
    { kind: 'tower', rect: [108, 116, 84, 92], eaves: 22 },
    { rect: [106, 116, 80, 83], eaves: 10, ridge: 'x' },
    { rect: [116, 124, 44, 59], eaves: 9, ridge: 'z', burning: true },
    { rect: [116, 124, 65, 80], eaves: 9.5, ridge: 'z' },
    // Round the upper square: burning houses, and the upper town gate between two towers.
    ...houseRow([124, 148, 38, 50], 'x', [8, 8, 8], [8, 9.5, 8]).map((H, i) => i !== 1 ? { ...H, burning: true } : H),
    ...houseRow([124, 148, 74, 86], 'x', [8, 8, 8], [9, 8, 9.5]).map((H, i) => i === 1 ? { ...H, burning: true } : { ...H, ruined: i === 2 }),
    { kind: 'tower', rect: [148, 154, 50, 59], eaves: 13 },   // the upper town gate: an open arch between two towers,
    { kind: 'tower', rect: [148, 154, 65, 74], eaves: 13 },   // so the castle shows through it behind the Captain
  ],
  props: [
    { kind: 'heap', x: 14, z: 2.4 },                                    // the townsfolk's failed barricades
    { kind: 'cart', x: 36, z: -2.4 }, { kind: 'crates', x: 44, z: 2.8 },
    { kind: 'stall', x: 58, z: -9 }, { kind: 'brokenStall', x: 66, z: -10 }, { kind: 'brokenStall', x: 72, z: 7.6, yaw: Math.PI },   // the sacked market
    { kind: 'stall', x: 58.5, z: 7.6, yaw: Math.PI }, { kind: 'cart', x: 77, z: -7, yaw: Math.PI / 2 }, { kind: 'crates', x: 78, z: 8 },
    { kind: 'heap', x: 54.5, z: -10.6 },
    { kind: 'cart', x: 60, z: 23.1 }, { kind: 'crates', x: 30, z: 23.4 },
    { kind: 'fountain', x: 13, z: 61 }, { kind: 'well', x: 25, z: 52 }, { kind: 'cart', x: 3, z: 64, yaw: Math.PI / 2 },
    { kind: 'crates', x: 27, z: 68.5 }, { kind: 'brokenStall', x: 9, z: 52 },
    { kind: 'cart', x: 84, z: 49 }, { kind: 'brokenStall', x: 101, z: 47 }, { kind: 'heap', x: 112, z: 73, yaw: Math.PI / 2 },
    { kind: 'crates', x: 79, z: 77 }, { kind: 'well', x: 110, z: 52 },
    { kind: 'crates', x: 126.5, z: 52.5 }, { kind: 'heap', x: 145, z: 71.6 },
  ],
  bonfires: [{ id: 'town-lower-gate', x: 3.5, z: -2.6, spawn: { x: 5.5, z: -0.8, yaw: Math.PI / 2 } },
             { id: 'town-tavern', x: 38, z: 63, y: 8, spawn: { x: 38, y: 8, z: 60.5, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-lower-gate', trigger: [8, 26, -4, 4], gate: { x: 26, z: 0, along: 'z', width: 9, style: 'barricade' },
      enemies: [{ enemy: 'hollow', spawn: { x: 20, z: 0, yaw: -Math.PI / 2 } }] },
    { id: 'zone-first-street', trigger: [26, 52, -4, 4], gate: { x: 52, z: 0, along: 'z', width: 9, style: 'barricade' },
      enemies: [{ enemy: 'lancer', spawn: { x: 46, z: 0, yaw: -Math.PI / 2 } }] },
    { id: 'zone-market', trigger: [52, 80, -12, 10], gate: { x: 65, z: 10, along: 'x', width: 7, style: 'barricade' },
      enemies: [{ enemy: 'hollow', spawn: { x: 66, z: -5, yaw: -Math.PI / 2 } }, { enemy: 'hollow', spawn: { x: 64, z: 5, yaw: -Math.PI / 2 } },
                { enemy: 'lancer', spawn: { x: 73, z: 0, yaw: -Math.PI / 2 } }] },
    { id: 'zone-steep-street', trigger: [22, 68, 22, 28], gate: { x: 22, z: 25, along: 'z', width: 7, style: 'barricade' },
      enemies: [{ enemy: 'lancer', spawn: { x: 40, y: 4, z: 25, yaw: Math.PI / 2 } }] },   // its Bowman is optional (dispersed)
    { id: 'zone-alley', trigger: [[14, 22, 22, 27], [16, 20, 27, 40]], gate: { x: 18, z: 40, along: 'x', width: 5, style: 'barricade' },
      enemies: [{ enemy: 'duelist', spawn: { x: 18, y: 4, z: 37, yaw: Math.PI } }] },
    { id: 'zone-fountain', trigger: [0, 30, 47, 71], gate: { x: 30, z: 59.5, along: 'z', width: 4, style: 'barricade' },
      enemies: [{ enemy: 'duelist', spawn: { x: 14, y: 8, z: 56, yaw: 0 } }, { enemy: 'hollow', spawn: { x: 8, y: 8, z: 64, yaw: Math.PI / 2 } },
                { enemy: 'rogue', spawn: { x: 22, y: 8, z: 65, yaw: Math.PI } }] },
    { id: 'zone-church', trigger: [76, 116, 44, 80], gate: { x: 116, z: 62, along: 'z', width: 7, style: 'barricade' },
      enemies: [{ enemy: 'hollow', spawn: { x: 90, y: 12, z: 58, yaw: -Math.PI / 2 } }, { enemy: 'lancer', spawn: { x: 98, y: 12, z: 64, yaw: -Math.PI / 2 } },
                { enemy: 'duelist', spawn: { x: 96, y: 12, z: 54, yaw: -Math.PI / 2 } }, { enemy: 'warden', spawn: { x: 106, y: 12, z: 62, yaw: -Math.PI / 2 } }] },
    { id: 'zone-captain', trigger: [124, 148, 50, 74], gate: { x: 148.6, z: 62, along: 'z', width: 6 },
      enemies: [{ enemy: 'pillagerCaptain', spawn: { x: 140, y: 12, z: 62, yaw: -Math.PI / 2 } }] },
  ],
  // The long stair from the fountain square down to the lower gate: its gate at the top opens from the square.
  shortcuts: [{ id: 'fountain-shortcut', gate: { x: 6, z: 47, along: 'x', width: 5 }, opensFrom: [0, 12, 48, 54] }],
  // The way back into the Keep, shut behind the player.
  sealed: [{ id: 'keep-gate', gate: { x: -0.6, z: 0, along: 'z', width: 6 } }],
  // Bowmen are optional: a barricade never waits on one. They wake with their zone's fight.
  dispersed: [
    { behavior: 'sentry', enemy: 'bowman', x: 38, y: 8, z: 29.2, yaw: Math.PI, zone: 'zone-steep-street' },   // the balcony, at its rail
    { behavior: 'slumber', enemy: 'knight', x: 17, y: 4, z: 13, yaw: 0, zone: 'zone-alley' },   // the yard off the alley: rises with the Duelist's ambush
    { behavior: 'sentry', enemy: 'bowman', x: 98, y: 17, z: 81.5, yaw: Math.PI, zone: 'zone-church' },   // the church gallery
  ],
};
