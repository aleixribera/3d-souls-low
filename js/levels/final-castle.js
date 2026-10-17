'use strict';
// Level 5: The Final Castle (v4.3). The castle on the horizon of the burning town: the lord who kept the prison
// (Levels 1-2) and sent the invaders (Level 3) lives here, and the bell rung on the Tower (Level 4) has called him out.
// x runs east (toward the throne), z north; heights are floor levels in metres.
//   Field of Answer (y 0, open): the level starts straight into the first fight with Aldric, the Gaoler King. When his bar
//     empties he staggers, leaps onto the curtain wall and is gone (his placement's `boss.retreat`); the gate opens and
//     bonfire 1, inside it, lights (`litBy`). Dying before that starts the fight again from the level start.
//   Section A, the outer ward (y 0 to 6): the gate yard (bonfire 1), the lower courtyard under a wall walk with two
//     Bowmen (stairs up its north side) and a Gargoyle, the barracks (a Shield Warden and a sleeping Knight; its back
//     hall is a shortcut gate back to bonfire 1), the moat bridge held by the Empty Sentinel (the standout), and the upper
//     courtyard, where Aldric watches from the chapel roof. Bonfire 2 is in the chapel.
//   Section B, the inner keep (y 0 to 16): the great hall (a pack of three; the kitchen beside it is a second way in,
//     coming out behind them), the hall stair up to the ramparts (a Shover, two Gargoyles on the walk and an Executioner
//     asleep at the far end; Aldric crosses the bridge high above), then the tower stair to bonfire 3 on the tower top.
//   Section C, the throne approach (y 16 to 24): the ash bridge over the hall roof under three Toll Wisps, the
//     processional (the gauntlet: four at once in its first hall, alcoves to split them; two heavies in the second),
//     the royal stair to the final bonfire, and a short run to the fog at the throne room door.
//   Throne room (y 24): Aldric's second fight, two bars (`throne`, then `knell`), and the ending (js/finale.js).
const LEVEL_5 = {
  id: 'final-castle', layout: 'rooms', alert: true, cull: true, wakeZones: true, clearGates: true,
  ending: true,   // no LEVEL COMPLETE: Aldric's death, the ending and the credits instead (js/finale.js)
  name: 'Level 5: The Final Castle',
  description: 'The bell has called him out. Face the Gaoler King before his gates, then climb his castle to the throne.',
  help: 'Level 5: the castle of the Gaoler King. Bonfires light as you reach them; the throne room fog seals behind you. Gargoyles grind before they spring; Toll Wisps ring before they shoot.',
  wallHeight: 10, gateHeight: 3.6, gateThickness: 0.5,
  // Night over the castle: cold moonlight on dark stone, ash on the wind, a red glow low in the east behind the keep.
  atmosphere: { background: 0x14121a, fog: 0x221e28, fogDensity: 0.011,
                moon: { color: 0x9aa8d0, intensity: 2.0, position: [40, 30, -20] },
                ambient: { color: 0x3a3448, intensity: 1.05 },
                hemi: { sky: 0x6a6488, ground: 0x1a1412, intensity: 0.55 },
                exposure: 1.0, ash: 1.2, embers: 0.35, dust: 0.2, rim: 0xb0b8e0,
                grade: { shadowTint: [0.9, 0.92, 1.12], highlightTint: [1.08, 0.98, 0.88], saturation: 0.62 },
                surface: { moss: 0.4, grime: 1.3 }, banners: [0x2e3a4a, 0x5a4a22], debris: 0.3,
                shafts: { rooms: true, color: 0xd8c8b0, opacity: 0.16 },
                sky: { zenith: 0x120f1c, sun: 0xb05030, sunDir: [1, 0.05, -0.2] }, silhouettes: 3, grass: 0.6,
                landmark: { x: 640, z: 0, y: -10, height: 340, width: 380 } },
  start: { x: 14, z: 0, yaw: Math.PI / 2 },
  rooms: [
    // The field before the gate: wide, open, no pillars in the middle.
    { id: 'field', rect: [0, 84, -36, 36], open: true, height: 10, grass: true, floor: 0x3a3832, wall: 0x4a4640, light: 0xffb070,
      lamps: [[6, -30], [6, 30], [42, -33], [42, 33], [78, -30], [78, 30]] },
    // Section A: the outer ward.
    { id: 'gate-yard', rect: [84, 96, -8, 8], height: 8, floor: 0x37342f, wall: 0x48433b, light: 0xffa060 },
    { id: 'lower-court', rect: [96, 136, -20, 20], open: true, height: 6, grass: true, floor: 0x3c3a34, wall: 0x4e4a42, light: 0xffc890,
      pillars: [[110, -8], [110, 8], [122, -8], [122, 8]], lamps: [[98, -18], [98, 18], [134, -18], [134, 18]] },
    { id: 'walk-foot', rect: [96, 100, 20, 24], open: true, height: 6, floor: 0x3c3a34, wall: 0x4e4a42 },
    { id: 'court-walk', rect: [115, 130, 20, 24], y: 6, open: true, height: 4, edges: { s: 'rail' }, floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'barracks-door', rect: [118, 122, -24, -20], height: 3.4, floor: 0x3a3440, wall: 0x4a4252, dim: true },
    { id: 'barracks', rect: [110, 130, -36, -24], height: 5, floor: 0x37342f, wall: 0x48433b, light: 0xffa060,
      pillars: [[116, -30], [124, -30]], braziers: [[128.5, -34.5]] },
    { id: 'back-hall', rect: [94, 110, -32, -28], height: 3.5, floor: 0x2f3433, wall: 0x3a403f, light: 0xd09060, dim: true },
    { id: 'back-link', rect: [90, 94, -32, -8], height: 3.5, floor: 0x2f3433, wall: 0x3a403f, dim: true },
    { id: 'bridge', rect: [136, 164, -3, 3], open: true, height: 4, edges: { n: 'rail', s: 'rail' }, floor: 0x45423c, wall: 0x5a5650 },
    { id: 'upper-court', rect: [164, 196, -16, 16], open: true, height: 7, grass: true, floor: 0x3c3a34, wall: 0x4e4a42, light: 0xffc890,
      lamps: [[166, -14], [166, 14], [194, -14], [194, 14]] },
    { id: 'chapel-door', rect: [196, 198, -2, 2], height: 3.4, floor: 0x3a3733, wall: 0x7a7266, dim: true },
    { id: 'chapel', rect: [198, 214, -7, 7], height: 7, floor: 0x342b3c, wall: 0x463a52, light: 0xffb070,
      braziers: [[212.5, 5.5], [199.5, 5.5]] },
    // Section B: the inner keep.
    { id: 'keep-door', rect: [214, 216, -2, 2], height: 3.6, floor: 0x3a3440, wall: 0x4a4252, light: 0xd06050, dim: true },
    { id: 'great-hall', rect: [216, 256, -10, 10], height: 9, floor: 0x37211f, wall: 0x4a2b27, light: 0xff9a5a,
      pillars: [[224, -6], [224, 6], [232, -6], [232, 6], [240, -6], [240, 6], [248, -6], [248, 6]], braziers: [[254.5, -8.5], [254.5, 4], [217.5, 8.5]] },
    { id: 'kitchen-door-w', rect: [226, 229, -12, -10], height: 3, floor: 0x3a3028, wall: 0x8a7a60, dim: true },
    { id: 'kitchen', rect: [220, 252, -20, -12], height: 4, floor: 0x3a3028, wall: 0x8a7a60, light: 0xd08050, dim: true },
    { id: 'kitchen-door-e', rect: [246, 249, -12, -10], height: 3, floor: 0x3a3028, wall: 0x8a7a60, dim: true },
    { id: 'rampart-e', rect: [252, 258, 30, 34], y: 8, open: true, height: 4, edges: { n: 'rail', e: 'rail' }, floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'rampart', rect: [212, 252, 30, 34], y: 8, open: true, height: 4, edges: { n: 'rail', s: 'rail' }, floor: 0x4a4030, wall: 0x5a5040, light: 0xffb070 },
    { id: 'rampart-w', rect: [204, 212, 30, 38], y: 8, open: true, height: 4, edges: { n: 'rail', w: 'rail' }, floor: 0x4a4030, wall: 0x5a5040, lamps: [[210.5, 36.5]] },
    { id: 'tower-top', rect: [200, 212, -6, 6], y: 16, open: true, height: 4, edges: { s: 'rail', w: 'rail' }, floor: 0x3a3733, wall: 0x4a453e, light: 0xffd8a0 },
    // Section C: the throne approach.
    { id: 'ash-bridge', rect: [212, 252, -5, 5], y: 16, open: true, height: 4, edges: { n: 'rail', s: 'rail' }, floor: 0x45423c, wall: 0x5a5650 },
    { id: 'proc-a', rect: [252, 272, -8, 8], y: 16, height: 8, floor: 0x37211f, wall: 0x4a2b27, light: 0xffb070,
      pillars: [[258, -5], [258, 5], [266, -5], [266, 5]], braziers: [[270.5, -6.5], [270.5, 6.5]] },
    { id: 'proc-alc-n', rect: [260, 264, 8, 11], y: 16, height: 4, floor: 0x37211f, wall: 0x4a2b27, dim: true },
    { id: 'proc-alc-s', rect: [260, 264, -11, -8], y: 16, height: 4, floor: 0x37211f, wall: 0x4a2b27, dim: true },
    { id: 'proc-b', rect: [272, 292, -8, 8], y: 16, height: 8, floor: 0x37211f, wall: 0x4a2b27, light: 0xff8a50,
      pillars: [[278, -5], [278, 5], [286, -5], [286, 5]], braziers: [[290.5, -6.5], [290.5, 6.5]] },
    { id: 'proc-alc-n2', rect: [280, 284, 8, 11], y: 16, height: 4, floor: 0x37211f, wall: 0x4a2b27, dim: true },
    { id: 'proc-alc-s2', rect: [280, 284, -11, -8], y: 16, height: 4, floor: 0x37211f, wall: 0x4a2b27, dim: true },
    { id: 'royal-landing', rect: [312, 320, -6, 6], y: 24, height: 5, floor: 0x3a3733, wall: 0x4a453e, light: 0xffa060 },
    // The throne room: tall and long, pillars down both sides only, the throne at the far end, glowing.
    { id: 'throne-room', rect: [320, 364, -20, 20], y: 24, height: 14, floor: 0x2e2422, wall: 0x3e302c, light: 0xff9050,
      pillars: [[328, -14], [328, 14], [338, -14], [338, 14], [348, -14], [348, 14], [358, -14], [358, 14]],
      braziers: [[362, -7], [362, 7], [322, -18], [322, 18]], lamps: [[333, -18], [333, 18], [353, -18], [353, 18]] },
    { id: 'throne-exit', rect: [364, 368, -2, 2], y: 24, height: 4, floor: 0x3a3733, wall: 0x4a453e, light: 0xffe0b0, dim: true },
  ],
  // Ramps rise along `axis` from `from` (west or south end) to `to`.
  ramps: [
    { id: 'walk-stair', rect: [100, 115, 20, 24], axis: 'x', from: 0, to: 6, stairs: true, height: 4, edges: { s: 'rail' }, floor: 0x4a4030, wall: 0x5a5040 },
    { id: 'hall-stair', rect: [252, 256, 10, 30], axis: 'z', from: 0, to: 8, stairs: true, height: 4, floor: 0x3a3440, wall: 0x4a4252 },
    { id: 'tower-stair', rect: [204, 208, 6, 30], axis: 'z', from: 16, to: 8, stairs: true, height: 4, edges: { w: 'rail', e: 'rail' }, floor: 0x3a3a34, wall: 0x4a4a42 },
    { id: 'royal-stair', rect: [292, 312, -3, 3], axis: 'x', from: 16, to: 24, stairs: true, height: 5, floor: 0x3a3440, wall: 0x4a4252 },
  ],
  // Masonry: the tower under its top and its stair, and the bridge piers standing on the hall roof.
  blocks: [{ rect: [200, 212, -6, 6], y0: 7.5, y1: 15.5, wall: 0x4a4a42 }, { rect: [204, 208, 8, 30], y0: 0, y1: 7.5, wall: 0x4a4a42 },
           { rect: [226, 228, -5, 5], y0: 9.5, y1: 15.5, wall: 0x4a4a42 }, { rect: [240, 242, -5, 5], y0: 9.5, y1: 15.5, wall: 0x4a4a42 }],
  // Bonfire 1 is cold until the field is won (`litBy`): Aldric gone, his gate open.
  bonfires: [{ id: 'castle-gate', x: 88, z: -6, litBy: 'zone-field', spawn: { x: 89.5, z: -3.5, yaw: Math.PI / 2 } },
             { id: 'castle-barracks', x: 112, z: -34, spawn: { x: 113.5, z: -32, yaw: Math.PI / 2 } },
             { id: 'castle-chapel', x: 211, y: 0, z: -5, spawn: { x: 209, y: 0, z: -3, yaw: Math.PI / 2 } },
             { id: 'castle-rampart', x: 256.5, z: 32.5, y: 8, spawn: { x: 254.5, y: 8, z: 32, yaw: -Math.PI / 2 } },
             { id: 'castle-tower', x: 203, z: -4, y: 16, spawn: { x: 205, y: 16, z: -2, yaw: Math.PI / 2 } },
             { id: 'castle-throne', x: 314, z: -4, y: 24, spawn: { x: 315.5, y: 24, z: -2, yaw: Math.PI / 2 } }],
  gated: [
    // The opening: Aldric's first bar. At its end he retreats over the wall (`boss.retreat`) and the gate opens.
    { id: 'zone-field', trigger: [0, 84, -36, 36], gate: { x: 84, z: 0, along: 'z', width: 8 },
      enemies: [{ enemy: 'varn', spawn: { x: 46, z: 0, yaw: -Math.PI / 2 }, notice: 90, leash: 200, homeLeash: 200,
                  boss: { phases: ['field'], retreat: { kneel: 1.6, to: [84, 10.2, -12], hop: 1.2, wait: 1.4, out: [98, 4, -16], fly: 1.0, height: 6 } } }] },
    // Section A's courtyard fight: the archers on the wall walk and the Gargoyle are tied to it (`zone`), so they join in.
    { id: 'zone-court', trigger: [[96, 136, -20, 20], [96, 100, 20, 24]], gate: { x: 136, z: 0, along: 'z', width: 6 },
      enemies: [{ enemy: 'hollow', spawn: { x: 112, z: -4, yaw: -Math.PI / 2 } }, { enemy: 'hollow', spawn: { x: 128, z: 10, yaw: -Math.PI / 2 } },
                { enemy: 'lancer', spawn: { x: 131, z: -12, yaw: -Math.PI / 2 } }] },
    // Section A's standout: the Empty Sentinel on the moat bridge. Wide enough to circle it, nowhere to fall.
    { id: 'zone-bridge', trigger: [136, 164, -3, 3], gate: { x: 164, z: 0, along: 'z', width: 6 },
      enemies: [{ enemy: 'sentinel', spawn: { x: 152, z: 0, yaw: -Math.PI / 2 } }] },
    { id: 'zone-upper', trigger: [164, 196, -16, 16], gate: { x: 197, z: 0, along: 'z', width: 4 },
      enemies: [{ enemy: 'lancer', spawn: { x: 184, z: -8, yaw: -Math.PI / 2 } }, { enemy: 'hollow', variant: 'elite', spawn: { x: 178, z: 6, yaw: -Math.PI / 2 } },
                { enemy: 'duelist', spawn: { x: 190, z: 2, yaw: -Math.PI / 2 } }] },
    // Section B: the hall pack. The kitchen's east door lets the player come in behind them.
    { id: 'zone-hall', trigger: [216, 256, -10, 10], gate: { x: 254, z: 10, along: 'x', width: 4 },
      enemies: [{ enemy: 'lancer', spawn: { x: 236, y: 0, z: -3, yaw: -Math.PI / 2 } }, { enemy: 'lancer', spawn: { x: 244, y: 0, z: 3, yaw: -Math.PI / 2 } },
                { enemy: 'duelist', spawn: { x: 250, y: 0, z: 0, yaw: -Math.PI / 2 } }] },
    // Section B's standout: the ramparts. A Shover mid-walk, the Executioner asleep at the far end (two Gargoyles perch
    // near the stair top, see `dispersed`). Rails all along: the danger is the pressure, not a fall.
    { id: 'zone-rampart', trigger: [[212, 252, 30, 34], [204, 212, 30, 38]], gate: { x: 206, z: 30, y: 8, along: 'x', width: 4 },
      enemies: [{ enemy: 'shover', spawn: { x: 230, y: 8, z: 32, yaw: Math.PI / 2 } },
                { enemy: 'executioner', behavior: 'slumber', spawn: { x: 208, y: 8, z: 35, yaw: Math.PI / 2 } }] },
    // Section C: the ash bridge under three Toll Wisps (a Gargoyle perched among them, tied to this fight).
    { id: 'zone-ashbridge', trigger: [212, 252, -5, 5], gate: { x: 252, z: 0, y: 16, along: 'z', width: 10 },
      enemies: [{ enemy: 'wisp', notice: 32, leash: 44, wide: true, spawn: { x: 226, y: 16, z: 3.5, yaw: -Math.PI / 2 } },
                { enemy: 'wisp', notice: 32, leash: 44, wide: true, spawn: { x: 237, y: 16, z: -3.5, yaw: -Math.PI / 2 } },
                { enemy: 'wisp', notice: 32, leash: 44, wide: true, spawn: { x: 249, y: 16, z: 3.5, yaw: -Math.PI / 2 } }] },
    // Section C: the gauntlet. Four at once in the first hall (alcoves on both sides to split them), two heavies in the second.
    { id: 'zone-gauntlet', trigger: [252, 272, -8, 8], gate: { x: 272, z: 0, y: 16, along: 'z', width: 16 },
      enemies: [{ enemy: 'duelist', spawn: { x: 262, y: 16, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'lancer', spawn: { x: 266, y: 16, z: -4, yaw: -Math.PI / 2 } },
                { enemy: 'rogue', spawn: { x: 266, y: 16, z: 4, yaw: -Math.PI / 2 } }, { enemy: 'knight', variant: 'elite', spawn: { x: 269, y: 16, z: 0, yaw: -Math.PI / 2 } }] },
    { id: 'zone-heavies', trigger: [272, 292, -8, 8], gate: { x: 292, z: 0, y: 16, along: 'z', width: 6 },
      enemies: [{ enemy: 'executioner', variant: 'elite', spawn: { x: 284, y: 16, z: -3, yaw: -Math.PI / 2 } },
                { enemy: 'sentinel', variant: 'elite', spawn: { x: 288, y: 16, z: 3, yaw: -Math.PI / 2 } }] },
    // The throne: Aldric's last two bars. The fog seals behind the player (`sealed` throne-fog).
    { id: 'zone-throne', trigger: [320, 364, -20, 20], gate: { x: 364, z: 0, y: 24, along: 'z', width: 4 },
      enemies: [{ enemy: 'varn', spawn: { x: 352, y: 24, z: 0, yaw: -Math.PI / 2 }, notice: 30, leash: 200, homeLeash: 200, boss: { phases: ['throne', 'knell'] } }] },
  ],
  // The barracks' back hall opens onto the gate yard from its far side: back to bonfire 1.
  shortcuts: [{ id: 'barracks-back', gate: { x: 92, z: -12, along: 'x', width: 4 }, opensFrom: [90, 94, -30, -14] }],
  // The throne room's fog (`fog`: the zone it seals): open, until the player is inside with Aldric alive (js/finale.js).
  sealed: [{ id: 'throne-fog', gate: { x: 320, z: 0, y: 24, along: 'z', width: 12 }, fog: 'zone-throne' }],
  dispersed: [
    // Section A: the lower courtyard and its wall walk, the barracks.
    { behavior: 'sentry', enemy: 'castleBowman', notice: 32, leash: 44, wide: true, zone: 'zone-court', x: 121, y: 6, z: 22.5, yaw: Math.PI },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 32, leash: 44, wide: true, zone: 'zone-court', x: 128, y: 6, z: 22.5, yaw: Math.PI },
    { behavior: 'perch', enemy: 'gargoyle', x: 116.5, y: 6, z: 22, yaw: -Math.PI / 2, zone: 'zone-court' },
    { behavior: 'sentry', enemy: 'warden', x: 120, z: -28, yaw: 0 },
    { behavior: 'patrol', enemy: 'hollow', z: -30, path: [97, 107] },
    { behavior: 'slumber', enemy: 'knight', x: 126, z: -33, yaw: Math.PI / 2 },
    // Section B: the kitchen (a Rogue at the stove, another asleep in the larder: a corpse marks the door) and the ramparts.
    { behavior: 'sentry', enemy: 'rogue', x: 236, z: -16, yaw: Math.PI / 2 },
    { behavior: 'slumber', enemy: 'rogue', x: 249, z: -18, yaw: Math.PI },
    { behavior: 'perch', enemy: 'gargoyle', x: 248, y: 8, z: 33, yaw: Math.PI / 2, zone: 'zone-rampart' },
    { behavior: 'perch', enemy: 'gargoyle', x: 240, y: 8, z: 31, yaw: Math.PI / 2, zone: 'zone-rampart' },
    { behavior: 'sentry', enemy: 'castleBowman', notice: 32, leash: 44, wide: true, zone: 'zone-rampart', x: 205.5, y: 8, z: 36.5, yaw: Math.PI / 2 },
    // Section C: the ash bridge under three Toll Wisps and a Gargoyle.
    { behavior: 'perch', enemy: 'gargoyle', x: 244, y: 16, z: -3.5, yaw: -Math.PI / 2, zone: 'zone-ashbridge' },
  ],
  // Aldric seen on the way, out of reach (js/finale.js): he watches from where he stands until the player has seen him
  // (`watch` s after entering `trigger`), then turns and walks off along `leave` [dx, dz] and is gone.
  spectators: [
    { id: 'sighting-chapel', enemy: 'varn', x: 199.5, y: 7.3, z: 0, yaw: -Math.PI / 2, trigger: [168, 196, -16, 16], watch: 3.5, leave: [6, 0] },
    { id: 'sighting-bridge', enemy: 'varn', x: 232, y: 16, z: 0, yaw: 0, trigger: [212, 252, 30, 34], watch: 3.5, leave: [14, 0] },
  ],
  // Ambush hints (js/finale.js, drawn only): a fallen soldier before the kitchen's sleeping Rogue and under the perches.
  hints: [{ kind: 'corpse', x: 247.5, z: -13.5, yaw: 0.6 }, { kind: 'corpse', x: 119, z: 18.5, yaw: 2.2 },
          { kind: 'corpse', x: 244, y: 8, z: 31.2, yaw: -1.2 }],
  // The throne room's dressing and its transition (js/finale.js, drawn only): the throne, the stained glass along both
  // long walls, the two pillars that crack and fall outward onto the marked sides, and the columns of fire.
  finaleRoom: { y: 24, throne: [361, 0], windows: [[333, 19.8], [343, 19.8], [353, 19.8], [333, -19.8], [343, -19.8], [353, -19.8]],
                pillars: [[343, 17, 1], [333, -17, -1]], fires: [[362, -7], [362, 7], [322, -18], [322, 18]], glow: [356, 0] },
  // Developer jumps (#dev, js/finale.js): start the level at a bonfire with the zones before it already won.
  devJumps: [
    { name: 'L5: Field (boss phase 1)', at: null, won: [] },
    { name: 'L5: Bonfire 1 (castle gate)', at: 'castle-gate', won: ['zone-field'] },
    { name: 'L5: Bonfire 2 (chapel)', at: 'castle-chapel', won: ['zone-field', 'zone-court', 'zone-bridge', 'zone-upper'] },
    { name: 'L5: Bonfire 3 (tower top)', at: 'castle-tower', won: ['zone-field', 'zone-court', 'zone-bridge', 'zone-upper', 'zone-hall', 'zone-rampart'] },
    { name: 'L5: Final bonfire (throne door)', at: 'castle-throne', won: ['zone-field', 'zone-court', 'zone-bridge', 'zone-upper', 'zone-hall', 'zone-rampart', 'zone-ashbridge', 'zone-gauntlet', 'zone-heavies'] },
  ],
};
