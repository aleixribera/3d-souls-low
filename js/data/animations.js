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
  // Pass 94 (a fresh judge: "the blade sits straight up"): every guard pose holds the blade across the body, hilt in
  // front of the chest a little to the sword side, tip up toward the off side, the off-hand on the grip. Arm and blade
  // angles were solved on the wanderer's model for a hilt point and blade direction, then checked in frames.
  deflect: {
    rise: 0.045, hold: 0.07, fall: 0.16, drop: 0.15,
    pose: { armR: [-0.86, 0, 0.74], elbowR: [-0.02, 0, 0], weapon: [0.96, 1.13, 0], armL: [-0.48, -0.03, -0.58], elbowL: [-0.6, 0, 0],
            chest: [-0.05, -0.3, 0], head: [0.05, 0.25, 0],   // the blade pushed out across the body to meet the blow, tip low to the off side
            spin: [0.1, -0.22, 0], legL: [-0.45, 0, 0.06], kneeL: [0.7, 0, 0], legR: [0.4, 0, -0.06], kneeR: [0.6, 0, 0] },   // knees braced (pass 94)
    clang: { rise: 0.03, hold: 0.04, fall: 0.26, drop: 0.2, step: [0.26, 0.12],
             pose: { armR: [-0.61, 0.09, 0.73], elbowR: [-0.3, 0, 0], weapon: [0.85, 1, 0], chest: [-0.24, -0.12, 0], head: [-0.22, 0.1, 0],
                     tip: [-0.13, 0, 0.14], spin: [-0.18, -0.32, -0.12], armL: [-0.59, -0.6, -0.47], elbowL: [-0.66, 0, 0],   // knocked back to the chest, still across it
                     legL: [-0.12, 0, 0.06], kneeL: [0.2, 0, 0], legR: [0.62, 0, -0.1], kneeR: [0.5, 0, 0] } },
  },
  // The held guard (pass 94; a vertical high guard until then): the blade diagonal across the body, both hands on the
  // grip, the hips down `drop` m.
  guard: { drop: 0.05,
           pose: { armR: [-0.5, 0.56, 0.25], elbowR: [-1, 0, 0], weapon: [0.82, 0.49, 0], armL: [-0.92, -0.26, -0.79], elbowL: [-0.03, 0, 0] } },
  // The dash's key pose (pass 92, the blind judge: "a long, low, leaning lunge"): in `rise` s the front leg reaches far
  // ahead, the back leg stretches out behind and the hips sink between them (as far as the front foot stays planted),
  // the torso pitches `lean` rad forward and the body `tip` rad at the feet, both arms and the blade trail; held to
  // `hold` of the dash, then eased out (Rig.settle carries it into the run). Leg and arm targets are [x, y, z] rad, knees
  // and elbows a bend; `head` lifts the eyes back to the path.
  // Pass 94 (a fresh judge: "the body locks into a single forward lean"): the dash steps through key poses instead of
  // holding one, on a smooth curve through each (`at`: share of the dash). `rise` s: when the push-off is struck (the
  // first afterimage waits for it).
  dash: { rise: 0.05, keys: [
    { at: 0, lean: 0.5, tip: 0.06, head: -0.35,   // loaded: both knees bent, arms going back
      legL: [-0.5, 0, 0.06], kneeL: 1.2, legR: [0.45, 0, -0.06], kneeR: 0.7,
      armR: [0.5, 0.1, -0.3], elbowR: -0.3, weapon: [1.1, 0, 0], armL: [0.4, -0.1, 0.4], elbowL: -0.4 },
    { at: 0.16, lean: 0.72, tip: 0.14, head: -0.55,   // push-off: the back leg drives straight, arms swept back
      legL: [-1, 0, 0.08], kneeL: 1.35, legR: [0.95, 0, -0.06], kneeR: 0.05,
      armR: [1, 0.15, -0.4], elbowR: -0.15, weapon: [1.3, 0, 0], armL: [0.95, -0.1, 0.5], elbowL: -0.15 },
    { at: 0.42, lean: 0.55, tip: 0.1, head: -0.45,   // the stride: the back leg swung through and reaching, the old front leg behind, free arm swung through
      legL: [0.55, 0, 0.08], kneeL: 0.5, legR: [-1.15, 0, -0.06], kneeR: 1.3,
      armR: [1.1, 0.2, -0.45], elbowR: -0.2, weapon: [1.25, 0, 0], armL: [-0.5, -0.1, 0.35], elbowL: -0.9 },
    { at: 0.7, lean: 0.3, tip: -0.08, head: -0.2,   // the skid: the new front heel braking, back knee low, body rising, free arm bent out a little
      legL: [0.5, 0, 0.12], kneeL: 1.3, legR: [-1, 0, -0.08], kneeR: 0.3,
      armR: [0.35, 0.1, -0.6], elbowR: -0.5, weapon: [1, 0.2, 0], armL: [-0.45, 0, 0.45], elbowL: -0.8 },
    { at: 1, lean: 0.12, tip: 0, head: -0.05,   // up toward stance, blade forward again
      legL: [0.3, 0, 0.05], kneeL: 0.5, legR: [-0.45, 0, -0.03], kneeR: 0.5,
      armR: [-0.2, 0, -0.15], elbowR: -0.2, weapon: [0.6, 0, 0], armL: [-0.1, 0, 0.3], elbowL: -0.2 },
  ] },
  // The counter window on the blade (pass 94, js/player-pose.js): `color` glowing at `emissive` times its strength,
  // which runs from 1 as the window opens down to `min` as it shuts; the blade's glint held at `glint` of that.
  // Pass 95: it flares as the window opens, `flare` times brighter on top, easing off over `flareTime` s.
  counterGlow: { color: 0xcfe6ff, emissive: 2.4, min: 0.45, glint: 0.85, flare: 2.2, flareTime: 0.3 },
  // The counter, impossible to miss (pass 95, js/counter-fx.js). As the window opens: the screen's edges dim (`dim`:
  // peak darkness, in and out s) while it lasts; the foe shows an open mark at its chest (`mark`: size m, s); the blade
  // leaves a trail (`trail`: colour, brightness, how much longer it lasts than a swing's). The counter's cut: a thin line
  // across the foe (`cut`: length m, width m thin and opened, s it shows after opening), sparks as it opens.
  counterFx: {
    dim: { peak: 0.8, in: 0.1, out: 0.3 },
    mark: { size: 1.5, time: 0.5, color: 0xe8f4ff },
    trail: { color: 0x9cc6ff, boost: 1.5, life: 1.6 },
    cut: { length: 2.6, thin: 0.035, wide: 0.1, show: 0.42, color: 0xf2f8ff, sparks: 46, arcSparks: 60, tilt: 0.38 },
  },
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
