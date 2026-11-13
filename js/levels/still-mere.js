'use strict';
// Level 14: the Still Mere (v7.51.0), chapter 14 of the Story (STORY.md; LORE.md 10j): the one place in Thrale where
// fire never took, a frozen lake under a white tree. The player carries the dying Ember down to drown it. Rough (PLAN.md
// stage 3, track A): built from the old second road's last level (removed in v7.53.0) as raw material, its
// layout kept, every name and character of that road gone; no rot and no scarlet flowers: shallow water where the rot
// lay, and the Drowned under it. The light comes from the west, so what the player walks toward is front-lit.
// x east, z north; floors fall 24 -> 16 -> 0.
//   The white bough (bonfire 1, Ysolde), the first bough (a Toll Wisp on a twig), the bough fork (a Drowned, the first of
//   its kind, an elite Shield Warden, an elite Rogue), the bough down to the white gate (two Drowned, an Undead Knight, a
//   Wisp), the long stair down to the shore yard (bonfire 2), the drowned court (wade the shallows or keep to the stone:
//   an elite Drowned, a Salt Knight, Drowned asleep under the water), the reed passage (a Rogue asleep), the mere's shore
//   (bonfire 3), the fog, and the ice: the King's Blade.
const LEVEL_14 = {
  id: 'still-mere', layout: 'rooms', alert: true, cull: true, wakeZones: true, steer: true,
  ending: true,   // the story's end: no LEVEL COMPLETE; the King's Blade kneels, then the mere's cards and the credits (js/finale.js)
  name: 'Level 14: The Still Mere',
  description: 'There is one water in Thrale that never burned: a frozen lake under a white tree. Down the white boughs, through the drowned court, to the shore. Something waits on the ice, wearing your face.',
  help: 'Level 14: the boughs have no rail: a fall is death. The Drowned lie under the shallows until you pass. On the ice, the one who waits fights as you fight: its shield turns blows from the front, so circle it, or hit it as it swings.',
  wallHeight: 9, gateHeight: 3.4, gateThickness: 0.5, flasks: 9,
  atmosphere: { background: 0x2a3038, fog: 0x8a94a0, fogDensity: 0.0095,
                moon: { color: 0xf0f4ff, intensity: 2.3, position: [-30, 40, 16] },
                ambient: { color: 0x56606c, intensity: 1.35 },
                hemi: { sky: 0xe8eef8, ground: 0x2a3440, intensity: 0.75 },
                exposure: 0.96, dust: 0.1, rim: 0xe0ecff,
                grade: { shadowTint: [0.94, 0.97, 1.04], highlightTint: [1.02, 1.02, 1.04], saturation: 0.78 },
                surface: { moss: 0.3, grime: 0.6 }, banners: [0x8a2a24, 0xc8ccd4],
                sky: { zenith: 0x1e2430, sun: 0xd8e4ff, sunDir: [-0.5, 0.3, 0.2] }, silhouettes: 2 },
  realm: {
    tree: { kind: 'haligtree', x: -120, z: -420, y: -160, height: 980, width: 520 },   // the white tree over the mere
    weather: [{ kind: 'snow', amount: 0.9 }],
    clouds: { y: -22, color: 0x4a5462, light: 0xd8e4f0 },
    roots: [{ pts: [[30, 16, -6], [32, 21.5, 0], [30, 16, 6]], r: 1.8, color: 0xc8c8c4 }, { pts: [[14, 10, 0], [30, 21, 0], [48, 18, 0]], r: 2.4, color: 0xc8c8c4 },
            { pts: [[70, 8, -14], [82, 13.6, 0], [94, 4, 16]], r: 2.2, color: 0xc8c8c4 },
            { pts: [[-40, -30, -60], [10, 10, -40], [60, 60, -70], [120, 90, -110]], r: 12, color: 0xb8b8b4 }, { pts: [[160, -30, 40], [120, 30, 30], [60, 70, 50]], r: 10, color: 0xb8b8b4 }],
    // The shallows where the rot lay on the old road: water, and the Drowned under it.
    pools: [{ rect: [121, 138, -61, -49], kind: 'water' }, { rect: [146, 163, -46, -33], kind: 'water' }, { rect: [126, 137, -40, -33], kind: 'water' },
            { rect: [186, 196, -58, -52], kind: 'water' }],
    beams: 0xe0ecff,
    grounds: [{ kind: 'snow', rooms: ['white-bough', 'bough-fork', 'shore-yard', 'mere-shore'] }, { kind: 'palebark', rooms: ['first-bough', 'twig'] }],
  },
  start: { x: 4, y: 24, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'white-bough', rect: [0, 14, -7, 7], y: 24, open: true, height: 6, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0xb8b8b4, wall: 0xd0d0cc, light: 0xe8f0ff },
    { id: 'first-bough', rect: [14, 48, -2.5, 2.5], y: 24, open: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x9a9a94, wall: 0xb0b0aa },
    { id: 'twig', rect: [28, 31, 5, 8], y: 27, open: true, height: 4, edges: { n: 'open', s: 'open', e: 'open', w: 'open' }, floor: 0x9a9a94, wall: 0xb0b0aa },
    { id: 'bough-fork', rect: [48, 72, -10, 10], y: 24, open: true, height: 8, edges: { n: 'rail', s: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0xb4b4b0, wall: 0xc8c8c4, light: 0xe8f0ff },
    { id: 'white-gate', rect: [92, 116, -12, 12], y: 16, open: true, height: 9, edges: { n: 'rail', w: 'rail', e: 'rail' }, railHeight: 0.8, floor: 0xb0b2b0, wall: 0xc8cac8, light: 0xe0e8f8,
      pillars: [[94, 10], [114, 10], [94, -10], [114, -10]], braziers: [[115, 0]] },
    { id: 'shore-yard', rect: [88, 120, -54, -40], open: true, height: 9, floor: 0x7a8088, wall: 0x9aa0a8, light: 0xd8e4f4,
      braziers: [[118.5, -52.5], [118.5, -41.5]] },
    { id: 'drowned-court', rect: [120, 164, -62, -32], open: true, height: 10, floor: 0x5a646c, wall: 0x7a848c, light: 0xb8d0e8,
      pillars: [[142, -58], [142, -36]], lamps: [[122, -33.5], [162, -60.5]] },
    { id: 'reed-passage', rect: [164, 184, -50, -44], height: 4.5, floor: 0x4a5258, wall: 0x6a7278, light: 0x9ab8d8, dim: true },
    { id: 'mere-shore', rect: [184, 200, -58, -36], open: true, height: 9, floor: 0x5a626a, wall: 0x737b84, light: 0xe0e8f4,
      braziers: [[198.5, -56.5], [198.5, -37.5]] },
    { id: 'fog-door', rect: [200, 204, -49, -45], height: 6, floor: 0x5a626a, wall: 0x7a828a, dim: true },
    { id: 'the-mere', rect: [204, 248, -68, -26], open: true, height: 14, floor: 0x5a6c7c, wall: 0x6a747e, light: 0xd8e4f4,
      lamps: [[206, -66], [246, -66], [206, -28], [246, -28]] },
    { id: 'mere-exit', rect: [248, 252, -49, -45], height: 5, floor: 0x5a626a, wall: 0x7a828a, light: 0xe8f0ff, dim: true },
  ],
  ramps: [
    { id: 'bough-down', rect: [72, 92, -2.5, 2.5], axis: 'x', from: 24, to: 16, stairs: true, height: 6, edges: { n: 'open', s: 'open' }, floor: 0x9a9a94, wall: 0xb0b0aa },
    { id: 'long-stair', rect: [101, 107, -40, -12], axis: 'z', from: 0, to: 16, stairs: true, height: 6, floor: 0xa0a4a8, wall: 0xb8bcc0 },
  ],
  // Masonry under the white gate's floor, so the stair stands on stone.
  blocks: [{ rect: [92, 116, -12, 12], y0: -10, y1: 15.5, wall: 0xa8acb0 }],
  bonfires: [{ id: 'mere-bough', x: 3, y: 24, z: -4.5, spawn: { x: 5, y: 24, z: -3, yaw: Math.PI / 2 } },
             { id: 'mere-yard', x: 90, z: -52, spawn: { x: 92, z: -50.5, yaw: Math.PI / 2 } },
             { id: 'mere-shore', x: 186, z: -38, spawn: { x: 188, z: -40, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-fork', trigger: [48, 72, -10, 10], gate: { x: 72, z: 0, y: 24, along: 'z', width: 5 },
      enemies: [{ enemy: 'drowned', spawn: { x: 65, y: 24, z: 0, yaw: -Math.PI / 2 } }, { enemy: 'warden', variant: 'elite', spawn: { x: 57, y: 24, z: -6, yaw: -Math.PI / 2 } },
                { enemy: 'rogue', variant: 'elite', spawn: { x: 57, y: 24, z: 6, yaw: -Math.PI / 2 } }] },
    { id: 'zone-gate', trigger: [92, 116, -12, 12], gate: { x: 104, z: -12, y: 16, along: 'x', width: 6 },
      enemies: [{ enemy: 'drowned', spawn: { x: 104, y: 16, z: -5, yaw: -Math.PI / 2 } }, { enemy: 'drowned', spawn: { x: 110, y: 16, z: 4, yaw: -Math.PI / 2 } },
                { enemy: 'knight', spawn: { x: 99, y: 16, z: -6, yaw: -Math.PI / 2 } },
                { enemy: 'wisp', notice: 30, leash: 40, wide: true, spawn: { x: 98, y: 16, z: 8, yaw: -Math.PI / 2 } }] },
    { id: 'zone-court', trigger: [120, 164, -62, -32], gate: { x: 164, z: -47, along: 'z', width: 6 },
      enemies: [{ enemy: 'drowned', variant: 'elite', spawn: { x: 154, z: -50, yaw: -Math.PI / 2 } }, { enemy: 'saltKnight', spawn: { x: 145, z: -54, yaw: -Math.PI / 2 } },
                { enemy: 'drowned', behavior: 'slumber', spawn: { x: 130, z: -36, yaw: -Math.PI / 2 } }, { enemy: 'drowned', behavior: 'slumber', spawn: { x: 154, z: -40, yaw: -Math.PI / 2 } },
                { enemy: 'drowned', behavior: 'slumber', spawn: { x: 130, z: -55, yaw: -Math.PI / 2 } }] },
    // The ice: the one who waits. It sees the player only on the ice (`arena`), so the last bonfire is safe.
    { id: 'zone-blade', trigger: [205, 248, -68, -26], gate: { x: 248, z: -47, along: 'z', width: 4 },
      enemies: [{ enemy: 'kingsBlade', arena: true, notice: 60, leash: 200, homeLeash: 200, boss: { phases: ['blade', 'emberWorn'] }, spawn: { x: 236, z: -47, yaw: -Math.PI / 2 } }] },
  ],
  sealed: [{ id: 'blade-fog', gate: { x: 204, z: -47, along: 'z', width: 4 }, fog: 'zone-blade' }],
  dispersed: [
    { behavior: 'sentry', enemy: 'wisp', notice: 18, leash: 30, wide: true, x: 29.5, y: 27, z: 6.5, yaw: Math.PI },
    { behavior: 'slumber', enemy: 'rogue', variant: 'elite', x: 178, z: -47, yaw: -Math.PI / 2 },
  ],
  devJumps: [
    { name: 'L14: Bonfire 2 (the shore yard)', at: 'mere-yard', won: ['zone-fork', 'zone-gate'] },
    { name: 'L14: Bonfire 3 (the ice\'s fog)', at: 'mere-shore', won: ['zone-fork', 'zone-gate', 'zone-court'] },
  ],
};
