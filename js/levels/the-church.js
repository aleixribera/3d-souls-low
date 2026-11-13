'use strict';
// Level 6: The Church in the Pass (v7.20). Stands apart from the Story: a level of its own after the Final Castle, out
// of Ashmere and over the mountains the Seven came from. Everything seen is Blender's (tools/blender/church.py and
// snow_land.py, packed into js/baked/snow-church.js); the rooms here are the collision under it, so they must agree with
// those scripts. x runs east (toward the altar), z north.
//   The wood (y 0): a spruce wood in the snow, the first bonfire.
//   The hill path (y 0 to 6): up through the trees, with the church's tower coming into view.
//   The churchyard (y 6): iron crosses behind a split-rail fence, the second bonfire by its gate.
//   The nave (y 6): candles, four great carved pillars, the fog at the door behind you and the Antlered Hunger before the icon wall.
const LEVEL_6 = {
  id: 'the-church', layout: 'rooms', alert: true, cull: true, wakeZones: true, clearGates: true,
  next: 'windward-moor',   // v7.38.0: over the pass and down, into Thrale (chapter 7)
  name: 'Level 6: The Church in the Pass',
  description: 'Over the mountains, in the first church of the Seven, the hunger the Ember left behind has found a body.',
  help: 'Level 6: the church in the pass. Your steps stay in the snow. Inside, the Antlered Hunger strikes only what is before it: get behind it, and mind the roar.',
  wallHeight: 10, gateHeight: 5.2, gateThickness: 0.5,
  // A white afternoon: pale sky, hanging snow, long blue shadows. Inside (`interior`), dark timber and candlelight.
  atmosphere: { background: 0xb4c0cc, fog: 0xc0ccd8, fogDensity: 0.0095,
                moon: { color: 0xfff0dc, intensity: 1.25, position: [-30, 62, 24] },
                ambient: { color: 0xa8b8cc, intensity: 1.3 },
                hemi: { sky: 0xd8e4f0, ground: 0xa8b4c4, intensity: 0.95 },
                exposure: 0.8, ash: 0, embers: 0, dust: 0.25, rim: 0xd0dcec, debris: 0,
                grade: { shadowTint: [0.92, 0.97, 1.08], highlightTint: [1.03, 1.0, 0.97], saturation: 0.82 },
                surface: { moss: 0.1, grime: 0.6 },
                shafts: { rooms: true, color: 0xe8d8b8, opacity: 0.14 },
                sky: { zenith: 0x8ca4bc, sun: 0xf0e4d0, sunDir: [-0.5, 0.55, 0.4] },
                interior: { rooms: ['porch', 'nave', 'sanctuary'], fog: 0x18100a, fogDensity: 0.01, moon: 0.08, exposure: 1.45,
                            ambient: { color: 0x8a6a50, intensity: 1.25 }, hemi: { sky: 0xb08a64, ground: 0x4a3020, intensity: 1.0 } } },
  realm: { weather: [{ kind: 'snow', amount: 1.4 }] },
  scenery: {
    far: 900, plan: ['land__snow'], distant: ['ridge__rock', 'ridge__peak'], thin: ['spruce'], veil: { x: 119, y: [6, 11.2], z: [-3, 3], color: 0x0c0806 },
    meshes: ['land__snow', 'ridge__rock', 'ridge__peak', 'church__logs', 'church__shingle', 'church__oak', 'church__plank', 'church__icons', 'church__gilt', 'church__iron', 'church__daylight', 'church__snow'],
    instances: { spruce: ['spruce__needle', 'spruce__snow', 'spruce__bark'], fence: ['fence__wood', 'fence__snow'], cross: ['cross__iron'], rock: ['rock__stone', 'rock__snow'], shrub: ['shrub__stem', 'shrub__leaf'] },
    materials: {
      snow: { ground: 'snow', tile: 7, tint: 0xeef2f8, bump: 1.4 }, rock: { color: 0xa4b0c0, sky: true, emissive: 0x5a6674 }, peak: { color: 0xe4eaf2, sky: true, emissive: 0x30343a },
      logs: { tex: 'churchLog', tint: 0xffffff, decay: 0.5, tile: 2.4 }, shingle: { tex: 'churchShingle', tint: 0xffffff, decay: 0.6, tile: 1.3 },
      oak: { tex: 'churchOak', tint: 0xffffff, decay: 0.4, tile: 1.8 }, plank: { tex: 'churchPlank', tint: 0xffffff, decay: 0.3, tile: 3 },
      icons: { painted: 'icons' }, gilt: { tex: 'wornGilt', tint: 0xb08030, decay: 0.3, tile: 1 }, iron: { tex: 'rustedIron', tint: 0x8a8078, decay: 0.5, tile: 1 },
      daylight: { glow: 0xd8e8ff }, stone: { tex: 'stone', tint: 0xb8bcc4, decay: 0.5, tile: 2 },
      needle: { tex: 'barkMoss', tint: 0x4e6c5c, decay: 0.3, tile: 1.4 }, bark: { tex: 'barkMoss', tint: 0x8a7a68, decay: 0.5, tile: 1 },
      wood: { tex: 'barkMoss', tint: 0x8a7a68, decay: 0.5, tile: 1 }, stem: { color: 0x2c221a }, leaf: { color: 0x7a2c14 },
    },
    tracks: { rooms: ['wood', 'hill-path', 'yard'] },
  },
  start: { x: 7, z: 0, yaw: Math.PI / 2 },
  rooms: [
    { id: 'wood', rect: [0, 44, -16, 16], open: true, unseen: true, pillars: [[14, 11, 1.6], [31, -12.5, 1.3], [22, -14.5, 1.7], [6, 13.5, 1.2], [40, 13, 1.7]],   // the rocks
      height: 10, floor: 0xd8dee6, wall: 0x7a8088 },
    { id: 'yard', rect: [74, 118, -24, 24], y: 6, open: true, unseen: true, pillars: [[80, 16, 1.2], [112, -18, 1.2], [96, 19, 1.2]], height: 10, floor: 0xd8dee6, wall: 0x7a8088 },
    { id: 'porch', rect: [118, 124, -3, 3], y: 6, height: 5.2, unseen: true, dim: true, floor: 0x2a1c12, wall: 0x3a2818 },
    { id: 'nave', rect: [124, 166, -13, 13], y: 6, height: 13, unseen: true, floor: 0x2a1c12, wall: 0x3a2818, light: 0xffb070, dim: true, lampFlame: { size: 0.42, y: 1.62 }, pillars: [[133, -7.5], [133, 7.5], [153, -7.5], [153, 7.5]], pillarSize: 3,   // the four great pillars
      lamps: [[129, -11.9], [129, 11.9], [143, -11.9], [143, 11.9], [158, -11.9], [158, 11.9], [163.4, -6], [163.4, 6]] },
    { id: 'sanctuary', rect: [166, 170, -3, 3], y: 6, height: 5.2, unseen: true, dim: true, floor: 0x2a1c12, wall: 0x3a2818, light: 0xffd8a0 },
  ],
  ramps: [{ id: 'hill-path', rect: [44, 74, -9, 9], axis: 'x', from: 0, to: 6, height: 10, unseen: true, floor: 0xd8dee6, wall: 0x7a8088 }],
  bonfires: [{ id: 'pass-wood', x: 4.5, z: -5.5, spawn: { x: 6.5, z: -3.5, yaw: Math.PI / 2 } },
             { id: 'pass-yard', x: 80, y: 6, z: -6, spawn: { x: 82.5, y: 6, z: -4, yaw: Math.PI / 2 } }],
  gated: [
    { id: 'zone-nave', trigger: [124, 166, -13, 13], gate: { x: 166, z: 0, y: 6, along: 'z', width: 6 },
      enemies: [{ enemy: 'antlered', spawn: { x: 155, y: 6, z: 0, yaw: -Math.PI / 2 }, notice: 34, leash: 200, homeLeash: 200, boss: { phases: ['stalk', 'gorge'] } }] },
  ],
  sealed: [{ id: 'nave-fog', gate: { x: 124, z: 0, y: 6, along: 'z', width: 6 }, fog: 'zone-nave' }],
  dispersed: [
    // Those who came up the pass before you, and did not go home.
    { behavior: 'patrol', enemy: 'hollow', z: 4, path: [20, 40] },
    { behavior: 'sentry', enemy: 'lancer', x: 60, y: 3.2, z: -3, yaw: -Math.PI / 2 },
    { behavior: 'sentry', enemy: 'duelist', x: 100, y: 6, z: 5, yaw: -Math.PI / 2 },
    { behavior: 'slumber', enemy: 'knight', x: 110, y: 6, z: -14, yaw: Math.PI / 2 },
    { behavior: 'patrol', enemy: 'hollow', y: 6, z: -10, path: [90, 112] },
  ],
  devJumps: [
    { name: 'L6: Start (the wood)', at: null, won: [], seen: [] },
    { name: 'L6: Bonfire 2 (churchyard)', at: 'pass-yard', won: [], seen: [] },
  ],
};
