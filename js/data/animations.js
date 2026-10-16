'use strict';
// Secondary animation data (read by js/animator.js). Bone rotations are [x, y, z] radians ADDED on top of the base
// pose, so every existing attack timing and animation is untouched; this only adds body weight and follow-through.
// Positive x tips a bone forward. Y and Z components flip on alternate strikes of a combo (like the base swing).
//   windup  the extra pose reached at the end of the wind-up (coil), strike  the extra pose reached by the end of
//   the swing. Recovery eases back to nothing. Bones: chest, neck, head, elbowL, elbowR, armL, armR.
const ANIM_SECONDARY = {
  sweep:    { windup: { chest: [-0.2, -0.45, 0.08], neck: [-0.08, 0.2, 0], head: [0, 0.25, 0], elbowR: [-0.45, 0, 0] },
              strike: { chest: [0.28, 0.5, -0.1], neck: [0.12, -0.25, 0], head: [0.05, -0.3, 0], elbowR: [0.45, 0, 0] } },
  overhead: { windup: { chest: [-0.55, 0, 0], neck: [-0.35, 0, 0], head: [-0.2, 0, 0], elbowR: [-0.4, 0, 0], elbowL: [-0.3, 0, 0] },
              strike: { chest: [0.5, 0, 0], neck: [0.3, 0, 0], head: [0.2, 0, 0], elbowR: [0.55, 0, 0], elbowL: [0.2, 0, 0] } },
  chop:     { windup: { chest: [-0.6, 0, 0], neck: [-0.4, 0, 0], head: [-0.2, 0, 0], elbowR: [-0.3, 0, 0], elbowL: [-0.3, 0, 0] },
              strike: { chest: [0.55, 0, 0], neck: [0.35, 0, 0], head: [0.2, 0, 0], elbowR: [0.5, 0, 0], elbowL: [0.5, 0, 0] } },
  stab:     { windup: { chest: [-0.12, -0.4, 0], neck: [0, 0.2, 0], head: [0, 0.2, 0], elbowR: [-0.95, 0, 0] },
              strike: { chest: [0.32, 0.35, 0], neck: [0.15, -0.15, 0], head: [0.1, -0.2, 0], elbowR: [0.9, 0, 0] } },
  thrust:   { windup: { chest: [-0.15, -0.5, 0], neck: [0, 0.25, 0], head: [0, 0.25, 0], elbowR: [-0.9, 0, 0], elbowL: [-0.4, 0, 0] },
              strike: { chest: [0.4, 0.4, 0], neck: [0.2, -0.2, 0], head: [0.1, -0.25, 0], elbowR: [0.85, 0, 0], elbowL: [0.3, 0, 0] } },
  bash:     { windup: { chest: [-0.1, 0.35, 0], head: [0, -0.2, 0], elbowL: [-0.7, 0, 0] },
              strike: { chest: [0.3, -0.4, 0], neck: [0.12, 0, 0], head: [0.05, 0.2, 0], elbowL: [0.6, 0, 0] } },
  spin:     { windup: { chest: [0, -0.5, 0], neck: [0, 0.3, 0], head: [0, 0.3, 0] },
              strike: { chest: [0.1, 0.4, 0], neck: [0, -0.2, 0] } },
  draw:     { windup: { chest: [0, 0.25, 0], head: [0, -0.2, 0], elbowL: [-0.8, 0, 0] },
              strike: { chest: [0, 0.2, 0], head: [0, -0.2, 0], elbowL: [0.4, 0, 0] } },
  shove:    { windup: { chest: [-0.3, 0, 0], neck: [-0.15, 0, 0], elbowR: [-0.5, 0, 0], elbowL: [-0.5, 0, 0] },
              strike: { chest: [0.45, 0, 0], neck: [0.2, 0, 0], elbowR: [0.5, 0, 0], elbowL: [0.5, 0, 0] } },
  kick:     { windup: { chest: [-0.2, 0, 0], head: [-0.1, 0, 0] },
              strike: { chest: [-0.1, 0, 0], head: [0.1, 0, 0] } },
  stomp:    { windup: { chest: [-0.35, 0, 0], neck: [-0.2, 0, 0], elbowR: [-0.4, 0, 0], elbowL: [-0.4, 0, 0] },
              strike: { chest: [0.5, 0, 0], neck: [0.25, 0, 0], elbowR: [0.4, 0, 0], elbowL: [0.4, 0, 0] } },
  default:  { windup: { chest: [-0.15, 0, 0], neck: [-0.05, 0, 0] }, strike: { chest: [0.2, 0, 0], neck: [0.1, 0, 0] } },
};
const ANIM_SETTINGS = {
  maxClothDt: 0.04,        // longest physics step of the cloth springs (s)
  clothClamp: 1.1,         // furthest a cloth strip may swing (rad)
  clothTwist: 0.6,         // how much the body's own twisting (attack coil and unwind) swings the cloth, like turning
  clothBend: 0.05,         // how much bending forward or back flicks the cloth
  // Enemies turning to track: the hips and then the chest lag behind the feet by this much per rad/s of turn (max rad).
  turnLag: { spin: 0.06, chest: 0.09, max: 0.45 },
  // Walking with weight (Rig.weightLean): rad of lean per m/s2 of acceleration, per m/s of speed, per (rad/s x m/s) of
  // turning; at most `max` rad, eased in at `rate`/s.
  weight: { accel: 0.006, speed: 0.012, turn: 0.012, max: 0.14, rate: 8 },
  walkBlendRate: 8,        // how fast the walk layer fades in and out (1/s)
  deathBuckleTime: 0.45,   // s for the knees to give way
  walkStates: ['chase', 'patrol', 'return'],   // enemy states that count as walking
};
