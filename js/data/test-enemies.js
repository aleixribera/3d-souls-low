'use strict';
// Test enemies (Test Grounds only, see js/data/levels.js): plain Hollow-like fighters that each show one
// attack mechanic, so it can be tried on its own before real enemies use it.
//   rollOnly: true        cannot be blocked or parried; glows CONFIG.VISUALS.rollOnlyGlow instead of red,
//                         with a faint flash on the ground as the wind-up starts.
//   minRange + dash       a gap closer: picked only with the player between minRange and range; from
//                         `dash.from` (fraction of the wind-up) it rushes forward at `dash.speed` until in reach.
//   track: rate           keeps turning toward the player at `rate` rad/s through the whole wind-up and the swing.
const testBase = { scale: 1.0, bulk: 1.0, radius: 0.4, weapon: 'sword', idle: 'guard', visual: { skin: 0xa39d8f, bareArms: true, roughness: 0.85 },
  hp: 160, poise: 60, speed: 2.7, turnRate: 5, trackRate: 2.2, holdRange: 2.4,
  cooldown: [0.6, 1.2], flinchTime: 0.24, staggerTime: 1.1, parriedTime: 1.7 };
const testSwing = { id: 'testSwing', name: 'Sword Swing', anim: 'sweep', hits: [{ startup: 0.62, active: 0.14 }], recovery: 0.65,
  damage: 18, poise: 20, knock: 4, lunge: 1.6, range: 1.9, box: { w: 2.0, h: 1.4, d: 2.0, fwd: 1.3, y: 1.1 } };
const TEST_DEFS = [
  { ...testBase, id: 'testRollOnly', name: 'Test: Roll-only', color: 0x4a5a7a,
    description: 'A heavy overhead that cannot be blocked or parried. Watch for the blue glow and roll.',
    attacks: [testSwing,
      { id: 'testCrush', name: 'Unblockable Crush', anim: 'overhead', rollOnly: true, hits: [{ startup: 1.15, active: 0.16 }], recovery: 1.0,
        damage: 40, poise: 60, knock: 7, lunge: 1.8, range: 2.2, box: { w: 1.2, h: 2.4, d: 2.4, fwd: 1.4, y: 1.2 } }] },
  { ...testBase, id: 'testLunger', name: 'Test: Lunger', color: 0x6a4a3a,
    description: 'Back away and it closes the gap in one rushing thrust.',
    attacks: [testSwing,
      { id: 'testDashThrust', name: 'Dashing Thrust', anim: 'stab', minRange: 3.5, dash: { speed: 9, from: 0.45 },
        hits: [{ startup: 0.85, active: 0.14 }], recovery: 0.8, damage: 24, poise: 30, knock: 5, lunge: 3, range: 7.5,
        box: { w: 0.9, h: 1.3, d: 2.3, fwd: 1.4, y: 1.05 } }] },
  { ...testBase, id: 'testTracker', name: 'Test: Tracker', color: 0x3a6a4a,
    description: 'Its swing follows you. Roll late, or through it.',
    attacks: [{ ...testSwing, id: 'testTrackingSwing', name: 'Tracking Swing', track: 3.2, hits: [{ startup: 0.9, active: 0.2 }] }] },
  { ...testBase, id: 'testAll', name: 'Test: Everything', color: 0x6a3a6a,
    description: 'A roll-only, tracking dash from mid range, plus a plain swing.',
    attacks: [testSwing,
      { id: 'testPerilousDash', name: 'Perilous Dash', anim: 'stab', rollOnly: true, minRange: 3.5, dash: { speed: 8.5, from: 0.5 }, track: 2.5,
        hits: [{ startup: 1.0, active: 0.16 }], recovery: 0.95, damage: 34, poise: 50, knock: 6, lunge: 3, range: 7.5,
        box: { w: 1.0, h: 1.4, d: 2.4, fwd: 1.4, y: 1.05 } }] },
];
