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
  clothClamp: 1.1,         // furthest a cloth strip may swing (rad), a chain of strips all told (pass 92)
  clothSpeed: 5,           // m/s past which moving faster swings the cloth no further (a dash streams it, not stands it on end)
  clothTwist: 0.6,         // how much the body's own twisting (attack coil and unwind) swings the cloth, like turning
  clothBend: 0.05,         // how much bending forward or back flicks the cloth
  // Enemies turning to track: the hips and then the chest lag behind the feet by this much per rad/s of turn (max rad).
  turnLag: { spin: 0.06, chest: 0.09, max: 0.45 },
  // Walking with weight (Rig.weightLean): rad of lean per m/s2 of acceleration, per m/s of speed, per (rad/s x m/s) of
  // turning; at most `max` rad, eased in at `rate`/s.
  weight: { accel: 0.006, speed: 0.012, turn: 0.012, max: 0.14, rate: 8 },
  // The player's moves blend (Rig.settle, pass 91, PLAN.md item 3c): when one move gives way to another (run into dash,
  // dash into an attack, a cancel, the guard), the body leaves the old pose over `time` s instead of snapping, on an
  // ease-out, so the new move still shows on the very next frame. `into`: a quicker blend into these states.
  settle: { time: 0.12, into: { idle: 0.18, walk: 0.08, roll: 0.1, attack: 0.1, block: 0.08, hurt: 0.05, stagger: 0.05, execute: 0.08 } },
  // The player's attacks snap into their wind-up and hold it (an anime key pose), whatever easing the pose's own data
  // gives an enemy that borrows it: a press shows at once. Names in EASE (js/attack-anim.js), by phase.
  playerEase: { windup: 'outCubic' },
  // The deflect (pass 91): a press snaps the blade across the body in `rise` s, holds it `hold` s and lets it go over
  // `fall` s; a blow turned aside knocks the blade back (`clang`: rise, hold, fall). Bone targets per key pose.
  // Pass 92 (the blind judge: "only the sword arm moves"): the whole body takes it. The press braces, hips dropped
  // `drop` m in a split stance; a blow turned aside rocks the body back and off the line at the feet (`tip`), turns and
  // rolls the torso with the hit and steps the whole body `step` [side, back] m off its line, the off-hand braced by the
  // hilt (a fresh judge: a flared free arm read as a T-pose), then it settles. Holds are short (round 2: "frozen crouch").
  deflect: {
    rise: 0.045, hold: 0.07, fall: 0.16, drop: 0.1,
    pose: { armR: [-1.2, -0.3, 0.1], elbowR: [-1, 0, 0], weapon: [0.5, 1.4, 0], armL: [-1.1, 0, 0.4], elbowL: [-1.1, 0, 0],
            chest: [-0.05, -0.3, 0], head: [0.05, 0.25, 0],   // the blade slanted up across the face, tip to the off side
            spin: [0.1, -0.22, 0], legL: [-0.38, 0, 0.06], kneeL: [0.35, 0, 0], legR: [0.34, 0, -0.06], kneeR: [0.3, 0, 0] },
    clang: { rise: 0.03, hold: 0.04, fall: 0.26, drop: 0.16, step: [0.26, 0.12],
             pose: { armR: [-1.55, -0.2, 0.2], elbowR: [-1.35, 0, 0], weapon: [1, 1.3, 0], chest: [-0.24, -0.12, 0], head: [-0.22, 0.1, 0],
                     tip: [-0.13, 0, 0.14], spin: [-0.18, -0.32, -0.12], armL: [-1.3, 0, 0.3], elbowL: [-1.2, 0, 0],   // the off-hand stays by the hilt
                     legL: [-0.12, 0, 0.06], kneeL: [0.2, 0, 0], legR: [0.62, 0, -0.1], kneeR: [0.5, 0, 0] } },
  },
  // The dash's key pose (pass 92, the blind judge: "a long, low, leaning lunge"): in `rise` s the front leg reaches far
  // ahead, the back leg stretches out behind and the hips sink between them (as far as the front foot stays planted),
  // the torso pitches `lean` rad forward and the body `tip` rad at the feet, both arms and the blade trail; held to
  // `hold` of the dash, then eased out (Rig.settle carries it into the run). Leg and arm targets are [x, y, z] rad, knees
  // and elbows a bend; `head` lifts the eyes back to the path.
  dash: { rise: 0.05, hold: 0.62, lean: 0.6, tip: 0.1, head: -0.45,
          legL: [-1.3, 0, 0.08], kneeL: 1.4, legR: [0.9, 0, -0.06], kneeR: 0,
          armR: [0.85, 0.1, -0.4], elbowR: -0.25, weapon: [1.2, 0, 0], armL: [0.75, -0.1, 0.5], elbowL: -0.2 },
  // A landing with weight (pass 92): the knees take it, `drop` m at most for a fall at `ref` m/s or faster.
  land: { rise: 0.04, hold: 0.05, fall: 0.22, drop: 0.2, min: 0.35, ref: 9, lean: 0.18 },
  // Dash afterimages (pass 91, js/afterimage.js): a pale copy of the body every `gap` m of a dash, frozen and fading over
  // `life` s, at most `perDash` per dash by effect budget (`pool` figures in all); a perfect dodge's are `dodge`. A copy
  // is lit at its edges and `core` of that across its middle, and fades in as the body leaves it (`clear`: from, to m);
  // one nearer the camera that covers the body on screen keeps `inLine` of its brightness (bodies `cover` m round).
  afterimage: { pool: 8, gap: 0.55, life: 0.28, opacity: 0.7, core: 0.2, clear: [0.35, 0.9], inLine: 0.12, cover: 0.5, color: 0x9cc8ff, perDash: { bare: 2, normal: 5, ultra: 7 },
                dodge: { life: 0.5, opacity: 0.8, color: 0xd8ecff } },
  walkBlendRate: 8,        // how fast the walk layer fades in and out (1/s)
  deathBuckleTime: 0.45,   // s for the knees to give way
  walkStates: ['chase', 'patrol', 'return'],   // enemy states that count as walking
};
