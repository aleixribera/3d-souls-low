'use strict';
// Level 4: The Tower. A cliff-top keep: the gatehouse (west), a walled courtyard open to the sky, and the tower
// on its east side with the cliff beyond (a pit). x runs east, z north; heights are floor levels in metres.
//   Gatehouse (y 0): a warm-up fight, bonfire 1. Past its gate a short passage runs east to a portcullis that never
//     opens, a bonfire glowing behind it: the bait. Partway along, the passage floor rumbles, cracks and gives way
//     wall to wall (a trap), dropping the player 4 m into the undercroft.
//   Undercroft (y -4), under the passage and the courtyard's south-west: an ambush, two Hollows waiting and an
//     Executioner rising from the floor. Its gate opens at the foot of the exit stairs, which climb to the bait
//     bonfire (bonfire 2). Its room bends round into the courtyard's west side, so nothing in the courtyard sees it.
//   Courtyard (y 0, open, grass): the crowd fight, with two Rampart Bowmen shooting down from the north rampart.
//   Rampart stairs up the courtyard's north wall to the ramparts (y 6): railed, with an open gap (a 6 m drop
//     back into the courtyard). A Shover holds the bridge into the tower.
//   Tower hall (y 6) inside the tower's solid core: the Executioner. Past it, bonfire 3 and the postern stair,
//     whose gate at the bottom opens the way back to the courtyard (a shortcut, from the stair side only).
//   Outer walkways spiral round the core: the north walk (y 10), the west stair (10 to 14, over the courtyard),
//     the south walk (y 14), the east stair (14 to 18, over the cliff), the wide north landing (y 18, a Duelist
//     pair), then the bell stair (18 to 22) to bonfire 4 and the bell platform on top of the tower (y 22): the
//     Bell Warden, railed on the courtyard side and open on the cliff side.
const LEVEL_4 = {
  id: 'the-tower', layout: 'rooms', alert: true, cull: true,
  next: 'final-castle',   // the bell is rung: on to the castle, where its lord answers (v4.3)
  name: 'Level 4: The Tower',
  description: 'A cliff-top keep. Past the gatehouse the floor gives way: fight out of the undercroft, cross the courtyard, take the ramparts, and climb the walkways round the tower to its bell.',
  completeHint: 'The bell has rung. By the old law, the lord of the castle must come out and answer…',
  help: 'Level 4: win each fight to open the way on. Past the gatehouse the passage floor gives way: fight your way out of the undercroft. Falls from the walkways hurt or kill; the cliff side is a drop to your death. Bowmen shoot whenever they see you.',
  wallHeight: 8, gateHeight: 3.2, gateThickness: 0.5,
  // A cold dusk over the cliffs: wind-blown ash, grass in the courtyard, ruins on the skyline.
  atmosphere: { background: 0x23252e, fog: 0x333644, fogDensity: 0.011,
                moon: { color: 0xb8c4e0, intensity: 2.1, position: [-30, 18, 10] },
                ambient: { color: 0x4a5064, intensity: 1.15 },
                hemi: { sky: 0x8a92b0, ground: 0x221e1a, intensity: 0.6 },
                exposure: 1.02, ash: 1.0, dust: 0.15, rim: 0xb8c8e8,
                grade: { shadowTint: [0.86, 0.95, 1.14], highlightTint: [1.04, 1.0, 0.94], saturation: 0.72 },
                surface: { moss: 0.55, grime: 1.1 }, banners: [0x3a2a2a, 0x2a2e3a], debris: 0.2,
                sky: { zenith: 0x1e2236, sun: 0xd08a70, sunDir: [-0.8, 0.12, 0.35] }, silhouettes: 3, grass: 1 },
  start: { x: -5, z: 0, yaw: Math.PI / 2 },
  rooms: [
    // The gatehouse, the passage east of it, and the bait bonfire behind the passage's portcullis, which bends round
    // into the courtyard.
    { id: 'gate-approach', rect: [-8, 6, -6, 6], height: 7, floor: 0x3a3733, wall: 0x4a453e, light: 0xffa060 },
    { id: 'gatehouse', rect: [6, 22, -9, 9], height: 8, floor: 0x37342f, wall: 0x48433b, light: 0xffb070,
      pillars: [[10, -5], [10, 5], [18, -5], [18, 5]], braziers: [[20.5, -7.5], [20.5, 7.5]] },
    { id: 'gate-passage', rect: [22, 29, -3, 3], height: 6, floor: 0x2f3433, wall: 0x3a403f, light: 0xd09060, dim: true },
    { id: 'bonfire-room', rect: [29, 34, -3, 3], height: 5, floor: 0x37342f, wall: 0x48433b, light: 0xffa060 },
    { id: 'bonfire-bend', rect: [30, 34, 3, 7], height: 4, floor: 0x37342f, wall: 0x48433b, light: 0xd09060, dim: true },
    { id: 'bonfire-door', rect: [34, 36, 4, 7], height: 4, floor: 0x37342f, wall: 0x48433b },
    // The undercroft: under the passage (where its floor drops you) and under the courtyard's south-west.
    { id: 'undercroft-landing', rect: [22, 29, -11, 3], y: -4, height: 3.5, floor: 0x1f3238, wall: 0x2c434b, light: 0x6fc8c0 },
    { id: 'undercroft', rect: [22, 64, -22, -11], y: -4, height: 3.5, floor: 0x1f3238, wall: 0x2c434b, light: 0x6fc8c0,
      pillars: [[40, -16.5], [52, -15], [58, -15]] },
    // The courtyard, under the sky.
    { id: 'courtyard', rect: [36, 86, -22, 22], open: true, height: 6, grass: true,
      floor: 0x3c3a34, wall: 0x4e4a42, light: 0xffc890,
      pillars: [[52, -6], [52, 6], [70, -6], [70, 6]],
      lamps: [[38, -20], [38, 20], [62, -20], [62, 20], [84, -20], [84, 20]] },
    { id: 'stairs-foot', rect: [36, 40, 22, 26], open: true, height: 6, floor: 0x3c3a34, wall: 0x4e4a42 },
    // The north rampart: railed over the courtyard, but for a gap you can drop through.
    { id: 'rampart-a', rect: [56, 66, 22, 26], y: 6, open: true, height: 4, edges: { s: 'rail' }, floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'rampart-gap', rect: [66, 70, 22, 26], y: 6, open: true, height: 4, edges: { s: 'open' }, floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'rampart-b', rect: [70, 86, 22, 26], y: 6, open: true, height: 4, edges: { s: 'rail' }, floor: 0x4a4030, wall: 0x5a5040,
      lamps: [[84.5, 24]] },
    { id: 'rampart-c', rect: [86, 100, 22, 26], y: 6, open: true, height: 4, edges: { s: 'rail' }, floor: 0x4a4030, wall: 0x5a5040 },
    // Into the tower.
    { id: 'tower-bridge', rect: [96, 100, 9, 22], y: 6, height: 3.4, floor: 0x3a3440, wall: 0x4a4252, light: 0xd06050, dim: true },
    { id: 'tower-hall', rect: [91, 109, -9, 9], y: 6, height: 5, floor: 0x37211f, wall: 0x4a2b27, light: 0xff7a50,
      braziers: [[93, -7.5], [93, 7.5], [107, 7.5]] },
    { id: 'hall-door', rect: [109, 114, -6, -2], y: 6, height: 3.5, floor: 0x3a3440, wall: 0x4a4252, light: 0xd06050, dim: true },
    { id: 'postern-landing', rect: [103, 109, -15, -9], y: 6, height: 3.5, floor: 0x3a3733, wall: 0x4a453e, light: 0xffa060 },
    // The outer walkways and the top of the tower.
    { id: 'north-walk', rect: [86, 114, 10, 13], y: 10, open: true, height: 3.5, edges: { n: 'rail', w: 'open', e: 'open' },
      floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'south-walk', rect: [86, 114, -13, -10], y: 14, open: true, height: 3.5, edges: { s: 'rail', w: 'open', e: 'open' },
      floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'north-landing', rect: [86, 114, 10, 17], y: 18, open: true, height: 3.5, edges: { n: 'rail', w: 'open', e: 'open' },
      floor: 0x4a4030, wall: 0x5a5040, lamps: [[112.5, 16]] },
    { id: 'bell-landing', rect: [84, 90, -16, -10], y: 22, open: true, height: 4, edges: { w: 'rail', s: 'rail' },
      floor: 0x3a3733, wall: 0x4a453e, lamps: [[85, -11]] },
    { id: 'bell-platform', rect: [90, 110, -14, 10], y: 22, open: true, height: 5, edges: { w: 'rail', n: 'rail', s: 'rail', e: 'open' },
      floor: 0x3a3a34, wall: 0x4a4a42, light: 0xffd8a0 },
    { id: 'belfry', rect: [96, 104, -18, -14], y: 22, height: 4.5, floor: 0x3a3733, wall: 0x4a453e, light: 0xffd080 },
  ],
  // Ramps rise along `axis` from `from` (west or south end) to `to`.
  ramps: [
    { id: 'undercroft-stair', rect: [30, 34, -11, -3], axis: 'z', from: -4, to: 0, stairs: true, height: 3.5, floor: 0x2f3433, wall: 0x3a403f },
    { id: 'rampart-stairs', rect: [40, 56, 22, 26], axis: 'x', from: 0, to: 6, stairs: true, height: 4, edges: { s: 'rail' },
      floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'postern-stair', rect: [86, 103, -15, -11], axis: 'x', from: 0, to: 6, stairs: true, height: 3.5, floor: 0x3a3733, wall: 0x4a453e },
    { id: 'hall-stair', rect: [110, 114, -2, 10], axis: 'z', from: 6, to: 10, stairs: true, height: 3.5, edges: { e: 'rail' },
      floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'west-stair', rect: [86, 89, -10, 10], axis: 'z', from: 14, to: 10, stairs: true, height: 3.5, edges: { w: 'open' },
      floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'east-stair', rect: [111, 114, -10, 10], axis: 'z', from: 14, to: 18, stairs: true, height: 3.5, edges: { e: 'open' },
      floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'bell-stair', rect: [86, 90, -10, 10], axis: 'z', from: 22, to: 18, stairs: true, height: 3.5, edges: { w: 'rail' },
      floor: 0x3a3a34, wall: 0x4a4a42 },
  ],
  // The tower's solid core, below the hall and between the hall's roof and the bell platform.
  blocks: [{ rect: [90, 110, -10, 10], y0: 0, y1: 5.5, wall: 0x4a4a42 }, { rect: [90, 110, -10, 10], y0: 11.5, y1: 21.5, wall: 0x4a4a42 }],
  bonfires: [{ id: 'tower-gate', x: -5.5, z: -4.5, spawn: { x: -3.5, z: -2, yaw: Math.PI / 2 } },
             { id: 'tower-bait', x: 30.5, z: -1.8, spawn: { x: 32.3, z: -0.3, yaw: 0 } },
             { id: 'tower-postern', x: 107.5, z: -13.5, y: 6, spawn: { x: 105, y: 6, z: -11.5, yaw: -Math.PI / 2 } },
             { id: 'tower-bell', x: 85.5, z: -14.5, y: 22, spawn: { x: 87.5, y: 22, z: -12.5, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-gatehouse', trigger: [6, 22, -9, 9], gate: { x: 22, z: 0, along: 'z', width: 6 },
      enemies: [{ enemy: 'hollow', spawn: { x: 16, z: -4, yaw: -Math.PI / 2 } }, { enemy: 'hollow', spawn: { x: 16, z: 4, yaw: -Math.PI / 2 } },
                { enemy: 'lancer', spawn: { x: 19.5, z: 0, yaw: -Math.PI / 2 } }] },
    // The ambush where the passage floor drops you: two Hollows waiting by the landing, and the Executioner asleep on
    // the floor a few metres off. Its gate is at the foot of the exit stairs.
    { id: 'zone-undercroft', trigger: [[22, 29, -11, 3], [22, 64, -22, -11]], gate: { x: 32, z: -11, y: -4, along: 'x', width: 4 },
      enemies: [{ enemy: 'hollow', spawn: { x: 23.5, y: -4, z: -5, yaw: 0 } }, { enemy: 'hollow', spawn: { x: 27.5, y: -4, z: -5, yaw: 0 } },
                { enemy: 'executioner', behavior: 'slumber', spawn: { x: 25.5, y: -4, z: -9, yaw: 0 } }] },
    { id: 'zone-courtyard', trigger: [36, 86, -22, 22], gate: { x: 38, z: 22, along: 'x', width: 4 },
      enemies: [{ enemy: 'hollow', spawn: { x: 58, z: -8, yaw: -Math.PI / 2 } }, { enemy: 'hollow', spawn: { x: 58, z: 8, yaw: -Math.PI / 2 } },
                { enemy: 'lancer', spawn: { x: 66, z: -12, yaw: -Math.PI / 2 } }, { enemy: 'lancer', spawn: { x: 66, z: 12, yaw: -Math.PI / 2 } },
                { enemy: 'duelist', spawn: { x: 74, z: 0, yaw: -Math.PI / 2 } }] },
    { id: 'zone-rampart', trigger: [56, 100, 22, 26], gate: { x: 98, z: 22, y: 6, along: 'x', width: 4 },
      enemies: [{ enemy: 'shover', spawn: { x: 94, y: 6, z: 24, yaw: -Math.PI / 2 } }] },
    { id: 'zone-hall', trigger: [91, 109, -9, 9], gate: { x: 109, z: -4, y: 6, along: 'z', width: 4 },
      enemies: [{ enemy: 'executioner', spawn: { x: 100, y: 6, z: 0, yaw: Math.PI } }] },
    { id: 'zone-walkway', trigger: [86, 114, 13, 17], gate: { x: 88, z: 10, y: 18, along: 'x', width: 4 },
      enemies: [{ enemy: 'duelist', spawn: { x: 98, y: 18, z: 14.5, yaw: Math.PI / 2 } }, { enemy: 'duelist', spawn: { x: 105, y: 18, z: 14.5, yaw: Math.PI / 2 } }] },
    { id: 'zone-bell', trigger: [90, 110, -9, 10], gate: { x: 100, z: -14, y: 22, along: 'x', width: 4 },
      enemies: [{ enemy: 'bellWarden', arena: true, spawn: { x: 101, y: 22, z: -2, yaw: -Math.PI / 2 } }] },   // arena: the bell bonfire before it is safe
  ],
  // The postern gate opens only from the stair side, linking bonfire 3 back to the courtyard.
  shortcuts: [{ id: 'postern', gate: { x: 86, z: -13, y: 0, along: 'z', width: 4 }, opensFrom: [87, 92, -15, -11] }],
  // The portcullis between the passage and the bait bonfire: it never opens.
  sealed: [{ id: 'bonfire-portcullis', gate: { x: 29, z: 0, along: 'z', width: 6 } }],
  // The passage floor, wall to wall from just past the gatehouse gate to the portcullis: too long to jump.
  traps: [{ id: 'passage-floor', collapse: [22.5, 29, -3, 3], trigger: [24, 29, -3, 3], warning: 0.4 }],
  dispersed: [
    { behavior: 'sentry', enemy: 'bowman', x: 61, y: 6, z: 24.5, yaw: Math.PI },        // the ramparts over the courtyard
    { behavior: 'sentry', enemy: 'bowman', x: 78, y: 6, z: 24.5, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'bowman', x: 88, y: 10, z: 11.5, yaw: Math.PI / 2 },   // north walk, west corner
    { behavior: 'patrol', enemy: 'lancer', y: 10, z: 11.5, path: [93, 106] },           // north walk, the straight run
    { behavior: 'sentry', enemy: 'shover', x: 87.5, y: 12, z: 0, yaw: 0 },             // west stair, over the courtyard
    { behavior: 'sentry', enemy: 'bowman', x: 112.5, y: 14, z: -11.5, yaw: -Math.PI / 2 },   // south walk, east corner
    { behavior: 'patrol', enemy: 'lancer', y: 14, z: -11.5, path: [92, 106] },          // south walk
    { behavior: 'sentry', enemy: 'shover', x: 112.5, y: 16, z: 0, yaw: Math.PI },     // east stair, over the cliff
    { behavior: 'sentry', enemy: 'bowman', x: 88, y: 18, z: 15.5, yaw: Math.PI / 2 },   // north landing, west corner
  ],
};
