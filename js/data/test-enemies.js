'use strict';
// Test enemies (Test Grounds only, see js/data/levels.js): plain Hollow-like fighters that each show one
// attack mechanic, so it can be tried on its own before real enemies use it.
//   rollOnly: true        cannot be blocked or parried; glows CONFIG.VISUALS.rollOnlyGlow instead of red,
//                         with a faint flash on the ground as the wind-up starts.
//   minRange + dash       a gap closer: picked only with the player between minRange and range; from
//                         `dash.from` (fraction of the wind-up) it rushes forward at `dash.speed` until in reach.
//   track: rate           keeps turning toward the player at `rate` rad/s through the whole wind-up and the swing.
//   projectile            the active phase looses a bolt instead of opening a hitbox (js/projectiles.js).
//   shove: true           knockback beyond the usual cap: it can throw you off an open edge.
// A test enemy with `arena` (a room level) is fought there, from `playerStart` and `enemyStart`.
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
  { ...testBase, id: 'testBowman', name: 'Test: Bowman', color: 0x5a6a3a, weapon: 'bow', scale: 0.95, bulk: 0.9, radius: 0.38,
    hp: 100, poise: 35, holdRange: 9,
    description: 'Shoots from the open walkway over the trench. Block the bolts, sidestep, or go round by the ramp and close in.',
    arena: 'test-heights', playerStart: { x: 12, z: -4.5, yaw: Math.PI / 2 }, enemyStart: { x: 36, z: -4.5, yaw: -Math.PI / 2 },
    attacks: [
      { id: 'testAimedShot', name: 'Aimed Shot', anim: 'draw', projectile: { speed: 22, gravity: 6, size: 0.12 }, minRange: 4, range: 26,
        hits: [{ startup: 1.1, active: 0.1 }], recovery: 0.7, damage: 22, poise: 26, knock: 3, lunge: 0,
        box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.3 } },
      { id: 'testKick', name: 'Kick', anim: 'kick', hits: [{ startup: 0.4, active: 0.12 }], recovery: 0.5,
        damage: 12, poise: 30, knock: 7, lunge: 2, range: 1.7, box: { w: 1.0, h: 1.0, d: 1.4, fwd: 1.0, y: 0.6 } }] },
  { ...testBase, id: 'testShover', name: 'Test: Shover', color: 0x6a5a4a, offhand: 'kite', scale: 1.1, bulk: 1.25, radius: 0.5,
    hp: 180, poise: 80, speed: 2.3, holdRange: 2.2,
    description: 'On the terrace by the open edge. Its slow push throws you into the trench: keep away from the edge, block or roll.',
    arena: 'test-heights', playerStart: { x: 49, z: -10, yaw: Math.PI / 2 }, enemyStart: { x: 55, z: -10, yaw: -Math.PI / 2 },
    attacks: [
      { id: 'testShove', name: 'Shove', anim: 'shove', shove: true, hits: [{ startup: 1.25, active: 0.16 }], recovery: 0.9,
        damage: 8, poise: 30, knock: 26, lunge: 2.4, range: 2.0, box: { w: 1.8, h: 1.8, d: 1.6, fwd: 1.1, y: 1.0 } },
      { id: 'testShieldBash', name: 'Shield Bash', anim: 'bash', hits: [{ startup: 0.55, active: 0.12 }], recovery: 0.75,
        damage: 16, poise: 34, knock: 8, lunge: 3.2, range: 1.7, box: { w: 1.6, h: 1.7, d: 1.5, fwd: 1.2, y: 1.2 } }] },
];
