'use strict';
// Hall-style levels run along +X from x = 0 to `length`; z = 0 is the centre line.
const TUTORIAL = {
  id: 'tutorial', layout: 'hall', script: 'tutorial',
  name: 'Tutorial', description: 'Learn every control on training dummies. No real danger here.',
  help: 'Tutorial: follow the prompt at the top of the screen.',
  // Cleaner and easier to read than the real levels.
  atmosphere: { background: 0x15171c, fog: 0x1c1f26, fogDensity: 0.014,
                moon: { color: 0xc8cfe0, intensity: 2.5, position: [-6, 14, 8] },
                ambient: { color: 0x6a6f80, intensity: 1.5 },
                hemi: { sky: 0x8a93a8, ground: 0x2a241c, intensity: 0.5 },
                exposure: 1.15, ash: 0.1, dust: 0.4, grade: { saturation: 0.92, contrast: 1.02 },
                surface: { moss: 0.15, grime: 0.7 }, banners: [0x5a4426] },
  length: 40, halfZ: 6, wallHeight: 7, gateHeight: 4.8, gateThickness: 0.5,
  start: { x: 5, z: 0, yaw: Math.PI / 2 }, bonfires: [{ id: 'tutorial-fire', x: 9, z: -4 }],
  alcoveWidth: 0, alcoveDepth: 2, alcoves: [], gated: [], dispersed: [],
  torches: [{ x: 14, side: 1 }, { x: 26, side: -1 }, { x: 36, side: 1 }],
  training: { dummy: 'dummy', sparring: 'sparringDummy', dodge: 'dodgeDummy', execution: 'executionDummy',
              dummyAhead: 4,          // a single target dummy stands this far ahead of the player
              attackerAhead: 2.3,     // the sparring and dodge dummies stand within their swing range
              pairAhead: 6, pairSpread: 3 },   // two dummies for the target-switch step
};
