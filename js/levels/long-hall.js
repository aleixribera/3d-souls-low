'use strict';
const LEVEL_1 = {
  id: 'long-hall', layout: 'hall',
  next: 'sunken-keep',   // once complete, carry on into this level automatically
  name: 'Level 1: The Long Hall',
  description: 'Four opponents, and others waiting in the dark. Clear the way forward.',
  help: 'Level 1: defeat each gated opponent to open the next gate. Others are optional.',
  // Cold, grey-blue and close, with warm pools under the torches.
  // v6.0: a torch every few metres down both walls, braziers flanking each gate, the fog thinned so the hall's length reads.
  atmosphere: { background: 0x0a0d12, fog: 0x161c25, fogDensity: 0.027,
                moon: { color: 0x8fa2c8, intensity: 1.9, position: [-6, 14, 8] },
                ambient: { color: 0x44506a, intensity: 1.45 },
                hemi: { sky: 0x5a6a86, ground: 0x2a2018, intensity: 0.75 },
                exposure: 1.12, ash: 0.45, dust: 0.35, rim: 0x8fa3c4,
                grade: { shadowTint: [0.82, 0.93, 1.16], highlightTint: [1.05, 1.0, 0.92], saturation: 0.66 },
                surface: { moss: 0.3, grime: 1.15 },
                shafts: { every: 22, color: 0xa8b8d0, opacity: 0.18 },
                banners: [0x4a1c1a, 0x2c2a33], debris: 0.25 },
  length: 180, halfZ: 6, wallHeight: 7, gateHeight: 4.8, gateThickness: 0.5,
  start: { x: 5, z: 0, yaw: Math.PI / 2 },
  // The controls, taught where the hall first asks for them (js/data/lessons.js), essentials first: the list is the
  // course, in teaching order (v7.19.1). In the corridor out of the cell: walk, swing, roll. The first duel: lock on,
  // block as its first blow winds up; a flask when hurt. The patrolling Hollow: the heavy and the jump attack. The Knight: break its stance, execute.
  // The Rogue: parry. The second fire: rest. The pair past it: switch target. The Giant: roll into its swing.
  lessons: [
    { lesson: 'move', when: { x: 0 } },
    { lesson: 'light', when: { after: 'move' } },
    { lesson: 'roll', when: { after: 'light' } },
    { lesson: 'lock', when: { zone: 'zone-hollow' } },
    { lesson: 'block', when: { glint: 'red' } },
    { lesson: 'flask', when: { hurt: 0.6 } },
    { lesson: 'heavy', when: { x: 38 } },
    { lesson: 'jumpAttack', when: { after: 'heavy' } },
    { lesson: 'stance', when: { zone: 'zone-knight' } },
    { lesson: 'execute', when: { kneel: true } },
    { lesson: 'parry', when: { zone: 'zone-rogue' } },
    { lesson: 'rest', when: { near: 'after-rogue' } },
    { lesson: 'switch', when: { group: 2 } },
    { lesson: 'dodge', when: { zone: 'zone-giant' } },
  ],
  bonfires: [{ id: 'hall-start', x: 2.6, z: -3.4 }, { id: 'after-rogue', x: 130.5, z: -4.2 }],
  alcoveWidth: 2.8, alcoveDepth: 2.2,
  alcoves: [{ id: 'cell-8', x: 8, side: 1 }, { id: 'west-58', x: 58, side: 1 },   // cell-8: Ysolde's cell (js/data/lore.js)
             { id: 'east-87', x: 87, side: -1 }, { id: 'west-141', x: 141, side: 1 }],
  // Gated zones in order: entering x > trigger spawns the enemy; its gate at gateX lifts on its death.
  // The level is complete when every gate is open.
  gated: [
    { id: 'zone-hollow', enemy: 'hollow', trigger: 16, spawn: { x: 28, z: 0, yaw: -Math.PI / 2 }, gateX: 34 },
    { id: 'zone-knight', enemy: 'knight', trigger: 64, spawn: { x: 75, z: 0, yaw: -Math.PI / 2 }, gateX: 82 },
    { id: 'zone-rogue', enemy: 'rogue', trigger: 112, spawn: { x: 121, z: 0, yaw: -Math.PI / 2 }, gateX: 128 },
    { id: 'zone-giant', enemy: 'giant', trigger: 146, spawn: { x: 160, z: 0, yaw: -Math.PI / 2 }, gateX: 170 },
  ],
  // Optional enemies scattered between the gated zones.
  dispersed: [
    { behavior: 'ambush', enemy: 'rogue', alcove: 'west-58' },
    { behavior: 'ambush', enemy: 'rogue', alcove: 'east-87' },
    { behavior: 'ambush', enemy: 'rogue', alcove: 'west-141' },
    { behavior: 'patrol', enemy: 'hollow', z: 1.5, path: [40, 53] },
    { behavior: 'patrol', enemy: 'hollow', z: -2.5, path: [98, 104] },
    { behavior: 'patrol', enemy: 'hollow', z: 2.5, path: [139, 144] },   // clear of the bonfire past the Rogue's gate
    { behavior: 'slumber', enemy: 'knight', x: 93, z: 2, yaw: -Math.PI / 2 },
  ],
  torches: [{ x: 14, side: -1 }, { x: 22, side: 1 }, { x: 30, side: -1 }, { x: 40, side: 1 }, { x: 46, side: -1 }, { x: 50, side: 1 },
            { x: 62, side: -1 }, { x: 68, side: 1 }, { x: 76, side: 1 }, { x: 79, side: -1 }, { x: 95, side: -1 }, { x: 100, side: 1 },
            { x: 110, side: -1 }, { x: 116, side: 1 }, { x: 125, side: -1 }, { x: 134, side: 1 }, { x: 150, side: 1 }, { x: 156, side: -1 },
            { x: 164, side: 1 }, { x: 167, side: -1 }],
  // Braziers flanking each gate on the approach: the fight ahead is lit like a stage.
  braziers: [{ x: 31.2, z: 3.9 }, { x: 31.2, z: -3.9 }, { x: 79.2, z: 3.9 }, { x: 76.5, z: -3.9 }, { x: 125.2, z: 3.9 }, { x: 122.5, z: -3.9 },
             { x: 167.2, z: 3.9 }, { x: 164.5, z: -3.9 }],
};
