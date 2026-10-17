'use strict';
// Key poses for attacks (read by js/attack-anim.js). An attack opts in with `pose: '<id>'`; without it the legacy
// ANIMS function (js/registries.js) still drives it.
//
// Each entry: hits: [{ windup, strike, follow? }] (one per strike of the attack), ease?: { windup, active, follow,
// recovery } (names in EASE, js/attack-anim.js), lag?: { bone: fraction } (overrides POSE_SETTINGS.lag).
// A pose is { bone: [x, y, z] } in radians ADDED to the resting pose, plus two body shapes: crouch (m the hips drop,
// knees bend, feet stay planted) and lean (rad the torso tips forward at the hips).
// The body moves guard -> windup (end of wind-up) -> strike (end of the active phase) -> follow (end of follow-through)
// -> guard (end of recovery); a combo's next wind-up starts from the previous hit's follow pose.
// Bones: tip (whole body at the feet), spin (hips), chest, neck, head, armL, armR, elbowL, elbowR, legL, legR, kneeL,
// kneeR, weapon. The weapon arm is armR. +x tips forward, +y on spin turns the body toward its left (the swing side).
const POSE_SETTINGS = {
  ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' },
  // Overlapping action: each joint starts its move this fraction of the phase later than the feet, so motion runs
  // legs -> hips -> spine -> shoulder -> elbow -> blade. All joints still arrive together at the end of the phase.
  lag: { tip: 0, legL: 0, legR: 0, kneeL: 0, kneeR: 0, crouch: 0, lean: 0.03, spin: 0.05, chest: 0.1, neck: 0.14, head: 0.17,
         armL: 0.12, armR: 0.14, elbowL: 0.18, elbowR: 0.2, weapon: 0.26 },
  glintTime: 0.12,   // s a `glint` marker's flash lasts on either side of its moment
};

const ATTACK_POSES = {
  // Light attack 1: a rising-shoulder diagonal, high on the weapon side down across the body.
  lightDiagonal: {
    hits: [{
      windup: { crouch: 0.1, legL: [-0.18, 0, 0], legR: [0.14, 0, 0], spin: [0, -0.6, 0.04], chest: [-0.18, -0.45, 0.1],
                neck: [-0.05, 0.3, 0], head: [0, 0.3, 0], armR: [-1.7, 0, -0.55], elbowR: [-0.7, 0, 0], weapon: [-0.55, 0, 0.35],
                armL: [-0.35, 0, 0.25], elbowL: [-0.4, 0, 0] },
      strike: { crouch: 0.17, lean: 0.16, legL: [-0.42, 0, 0], legR: [0.3, 0, 0], spin: [0, 0.55, -0.03], chest: [0.28, 0.5, -0.12],
                neck: [0.1, -0.25, 0], head: [0.05, -0.3, 0], armR: [-0.95, 0, 0.65], elbowR: [0.1, 0, 0], weapon: [0.65, 0, -0.25],
                armL: [0.25, 0, -0.25], elbowL: [-0.2, 0, 0] },
      follow: { crouch: 0.14, lean: 0.12, legL: [-0.36, 0, 0], legR: [0.26, 0, 0], spin: [0, 0.75, -0.05], chest: [0.3, 0.68, -0.14],
                neck: [0.1, -0.3, 0], head: [0.05, -0.35, 0], armR: [-0.55, 0, 0.85], elbowR: [0.2, 0, 0], weapon: [0.95, 0, -0.35],
                armL: [0.35, 0, -0.3], elbowL: [-0.1, 0, 0] },
    }],
  },
  // Light attack 2: a flat backhand, from across the body out to the weapon side (the reverse of the first cut).
  lightBackhand: {
    hits: [{
      windup: { crouch: 0.12, legL: [0.12, 0, 0], legR: [-0.2, 0, 0], spin: [0, 0.7, 0], chest: [-0.08, 0.55, -0.06],
                neck: [0, -0.3, 0], head: [0, -0.25, 0], armR: [-1.45, 0, 1.05], elbowR: [-0.85, 0, 0], weapon: [0.2, 0, 0.9],
                armL: [-0.2, 0, -0.2], elbowL: [-0.5, 0, 0] },
      strike: { crouch: 0.16, lean: 0.1, legL: [-0.35, 0, 0], legR: [0.25, 0, 0], spin: [0, -0.55, 0.03], chest: [0.15, -0.5, 0.08],
                neck: [0.05, 0.25, 0], head: [0, 0.3, 0], armR: [-1.45, 0, -0.7], elbowR: [0, 0, 0], weapon: [0.3, 0, -0.4],
                armL: [0.25, 0, 0.3], elbowL: [-0.25, 0, 0] },
      follow: { crouch: 0.13, lean: 0.08, legL: [-0.3, 0, 0], legR: [0.22, 0, 0], spin: [0, -0.75, 0.05], chest: [0.16, -0.65, 0.1],
                neck: [0.05, 0.3, 0], head: [0, 0.35, 0], armR: [-1.2, 0, -1.0], elbowR: [0.1, 0, 0], weapon: [0.55, 0, -0.55],
                armL: [0.3, 0, 0.35], elbowL: [-0.15, 0, 0] },
    }],
  },
  // Light attack 3 (combo finisher): both hands up, a short rise onto the toes, then straight down with the body.
  lightOverhead: {
    hits: [{
      windup: { crouch: 0.05, lean: -0.12, legL: [-0.15, 0, 0], legR: [0.1, 0, 0], spin: [0, -0.2, 0], chest: [-0.35, -0.15, 0],
                neck: [-0.2, 0, 0], head: [-0.1, 0.1, 0], armR: [-2.6, 0, -0.2], elbowR: [-0.5, 0, 0], weapon: [-0.3, 0, 0],
                armL: [-2.2, 0, 0.35], elbowL: [-0.6, 0, 0] },
      strike: { crouch: 0.24, lean: 0.32, legL: [-0.5, 0, 0], legR: [0.35, 0, 0], spin: [0, 0.1, 0], chest: [0.45, 0.05, 0],
                neck: [0.2, 0, 0], head: [0.1, 0, 0], armR: [-0.7, 0, 0.15], elbowR: [0.1, 0, 0], weapon: [0.85, 0, 0],
                armL: [-0.5, 0, -0.2], elbowL: [-0.2, 0, 0] },
      follow: { crouch: 0.26, lean: 0.36, legL: [-0.52, 0, 0], legR: [0.36, 0, 0], spin: [0, 0.12, 0], chest: [0.55, 0.05, 0],
                neck: [0.25, 0, 0], head: [0.12, 0, 0], armR: [-0.35, 0, 0.15], elbowR: [0.15, 0, 0], weapon: [1.1, 0, 0],
                armL: [-0.25, 0, -0.2], elbowL: [-0.1, 0, 0] },
    }],
  },
  // ---- Enemies ----
  // Hollow Soldier, sword swing: hips and shoulders twist far away from the target (the main tell) while the head stays
  // on you, then unwind into a flat cut that carries well past.
  hollowSwing: {
    hits: [{
      windup: { crouch: 0.13, legL: [-0.22, 0, 0], legR: [0.16, 0, 0], spin: [0, -0.8, 0.05], chest: [-0.16, -0.55, 0.1],
                neck: [0, 0.4, 0], head: [0, 0.45, 0], armR: [-1.5, 0, -0.95], elbowR: [-0.65, 0, 0], weapon: [-0.4, 0, 0.55],
                armL: [-0.45, 0, 0.45], elbowL: [-0.5, 0, 0] },
      strike: { crouch: 0.17, lean: 0.15, legL: [-0.42, 0, 0], legR: [0.3, 0, 0], spin: [0, 0.6, -0.03], chest: [0.2, 0.55, -0.1],
                neck: [0.05, -0.3, 0], head: [0, -0.35, 0], armR: [-1.4, 0, 0.7], elbowR: [0, 0, 0], weapon: [0.4, 0, -0.3],
                armL: [0.3, 0, -0.3], elbowL: [-0.2, 0, 0] },
      follow: { crouch: 0.19, lean: 0.2, legL: [-0.44, 0, 0], legR: [0.32, 0, 0], spin: [0, 0.9, -0.06], chest: [0.3, 0.8, -0.15],
                neck: [0.08, -0.35, 0], head: [0.05, -0.4, 0], armR: [-1.0, 0, 1.05], elbowR: [0.15, 0, 0], weapon: [0.75, 0, -0.45],
                armL: [0.35, 0, -0.35], elbowL: [-0.1, 0, 0] },
    }],
  },
  // Hollow Soldier, overhead: the whole body arches back with the sword high behind the head and holds there, then
  // chops down so hard the blade ends in the floor and the body is left bent over it.
  hollowOverhead: {
    ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutSine' },
    hits: [{
      windup: { crouch: 0.12, lean: -0.28, legL: [-0.3, 0, 0], legR: [0.28, 0, 0], spin: [0, -0.3, 0], chest: [-0.6, -0.2, 0.05],
                neck: [-0.15, 0.1, 0], head: [0.1, 0.1, 0], armR: [-3.0, 0, -0.25], elbowR: [-0.8, 0, 0], weapon: [-0.55, 0, 0],
                armL: [-2.6, 0, 0.45], elbowL: [-0.75, 0, 0] },
      strike: { crouch: 0.24, lean: 0.3, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.12, 0], chest: [0.38, 0.08, 0],
                neck: [0.15, 0, 0], head: [0.05, 0, 0], armR: [-0.75, 0, 0.1], elbowR: [0.05, 0, 0], weapon: [0.8, 0, 0],
                armL: [-0.6, 0, -0.2], elbowL: [-0.15, 0, 0] },
      follow: { crouch: 0.28, lean: 0.36, legL: [-0.6, 0, 0], legR: [0.42, 0, 0], spin: [0, 0.15, 0.06], chest: [0.45, 0.1, 0.05],
                neck: [0.2, 0, 0], head: [0.1, 0, 0], armR: [-0.55, 0, 0.12], elbowR: [0.1, 0, 0], weapon: [0.95, 0, 0],
                armL: [-0.45, 0, -0.2], elbowL: [-0.05, 0, 0] },
    }],
  },
  // Generic enemy archetypes, shared by many attacks (a boss scales them up with the attack's poseScale).
  // One-handed thrust: the weapon drawn back at the hip, the body coiled away, then a long step and a straight stab.
  enemyStab: {
    hits: [{
      windup: { crouch: 0.12, legR: [0.2, 0, 0], spin: [0, -0.75, 0], chest: [-0.1, -0.4, 0], neck: [0, 0.3, 0], head: [0, 0.35, 0],
                armR: [-0.6, 0, -0.2], elbowR: [-1.4, 0, 0], weapon: [1.0, 0, 0], armL: [-0.5, 0, 0.3], elbowL: [-0.6, 0, 0] },
      strike: { crouch: 0.2, lean: 0.3, legL: [-0.65, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.5, 0], chest: [0.3, 0.35, 0],
                neck: [0.1, -0.2, 0], head: [0.05, -0.25, 0], armR: [-1.15, 0, 0.1], elbowR: [0, 0, 0], weapon: [1.05, 0, 0],
                armL: [0.3, 0, -0.3], elbowL: [-0.2, 0, 0] },
      follow: { crouch: 0.22, lean: 0.34, legL: [-0.68, 0, 0], legR: [0.42, 0, 0], spin: [0, 0.6, 0], chest: [0.34, 0.4, 0],
                neck: [0.1, -0.25, 0], head: [0.05, -0.3, 0], armR: [-1.2, 0, 0.15], elbowR: [0.05, 0, 0], weapon: [1.1, 0, 0],
                armL: [0.35, 0, -0.35], elbowL: [-0.1, 0, 0] },
    }],
  },
  // Two-handed spear lunge: low and twisted back with the shaft level, then the whole body driven along it.
  enemyThrust: {
    ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' },
    hits: [{
      windup: { crouch: 0.2, legL: [-0.15, 0, 0], legR: [0.3, 0, 0], spin: [0, -0.8, 0], chest: [-0.15, -0.45, 0], neck: [0, 0.35, 0],
                head: [0, 0.4, 0], armR: [-0.6, 0, -0.15], elbowR: [-1.2, 0, 0], weapon: [1.05, 0, 0], armL: [-0.8, 0, 0.2], elbowL: [-0.9, 0, 0] },
      strike: { crouch: 0.26, lean: 0.38, legL: [-0.8, 0, 0], legR: [0.5, 0, 0], spin: [0, 0.45, 0], chest: [0.35, 0.35, 0],
                neck: [0.12, -0.2, 0], head: [0.05, -0.25, 0], armR: [-1.2, 0, 0.1], elbowR: [0, 0, 0], weapon: [1.05, 0, 0],
                armL: [-1.1, 0, -0.1], elbowL: [-0.2, 0, 0] },
      follow: { crouch: 0.28, lean: 0.42, legL: [-0.82, 0, 0], legR: [0.52, 0, 0], spin: [0, 0.55, 0], chest: [0.4, 0.4, 0],
                neck: [0.12, -0.25, 0], head: [0.05, -0.3, 0], armR: [-1.15, 0, 0.12], elbowR: [0.05, 0, 0], weapon: [1.1, 0, 0],
                armL: [-1.0, 0, -0.1], elbowL: [-0.1, 0, 0] },
    }],
  },
  // Shield bash: the shield side turned away and drawn in, then the whole weight thrown behind it.
  enemyBash: {
    hits: [{
      windup: { crouch: 0.14, legR: [-0.2, 0, 0], legL: [0.15, 0, 0], spin: [0, 0.65, 0], chest: [-0.1, 0.3, 0], neck: [0, -0.25, 0],
                head: [0, -0.3, 0], armL: [-1.1, 0, -0.4], elbowL: [-0.9, 0, 0], armR: [-0.3, 0, 0.3] },
      strike: { crouch: 0.18, lean: 0.3, legL: [-0.55, 0, 0], legR: [0.38, 0, 0], spin: [0, -0.55, 0], chest: [0.22, -0.4, 0],
                neck: [0.08, 0.2, 0], head: [0, 0.25, 0], armL: [-1.4, 0, 0.2], elbowL: [0, 0, 0], armR: [0.2, 0, -0.2] },
      follow: { crouch: 0.2, lean: 0.34, legL: [-0.58, 0, 0], legR: [0.4, 0, 0], spin: [0, -0.68, 0], chest: [0.26, -0.48, 0],
                neck: [0.08, 0.25, 0], head: [0, 0.3, 0], armL: [-1.3, 0, 0.3], elbowL: [0.05, 0, 0], armR: [0.25, 0, -0.25] },
    }],
  },
  // A full turn with the weapon held out wide (the y of `spin` goes past a whole turn; recovery takes the short way).
  enemySpin: {
    ease: { windup: 'inOutCubic', active: 'linear', follow: 'outCubic', recovery: 'inOutSine' },
    lag: { weapon: 0.04, armR: 0.03, elbowR: 0.04, chest: 0.02, neck: 0.03, head: 0.03 },
    hits: [{
      windup: { crouch: 0.2, spin: [0, -1.2, 0], chest: [-0.05, -0.4, 0], head: [0, 0.6, 0], armR: [0.05, 0, -1.25], weapon: [0.9, 0, 0],
                armL: [-0.3, 0, 0.6] },
      strike: { crouch: 0.22, spin: [0, 5.2, 0], chest: [0.05, 0.25, 0], head: [0, -0.1, 0], armR: [0.05, 0, -1.3], weapon: [0.9, 0, 0],
                armL: [-0.3, 0, 0.6] },
      follow: { crouch: 0.24, lean: 0.12, spin: [0, 5.7, 0], chest: [0.12, 0.45, 0], head: [0, -0.2, 0], armR: [-0.2, 0, -0.9],
                weapon: [1.0, 0, 0], armL: [-0.2, 0, 0.4] },
    }],
  },
  // Two-handed push: arms gathered in, crouched, then driven out with a step.
  enemyShove: {
    hits: [{
      windup: { crouch: 0.22, lean: -0.1, legR: [0.2, 0, 0], chest: [-0.25, 0, 0], neck: [-0.1, 0, 0], armR: [-0.7, 0, 0.35],
                armL: [-0.7, 0, -0.35], elbowR: [-1.1, 0, 0], elbowL: [-1.1, 0, 0] },
      strike: { crouch: 0.16, lean: 0.36, legL: [-0.6, 0, 0], legR: [0.4, 0, 0], chest: [0.3, 0, 0], neck: [0.12, 0, 0],
                armR: [-1.5, 0, 0.05], armL: [-1.5, 0, -0.05], elbowR: [0, 0, 0], elbowL: [0, 0, 0] },
      follow: { crouch: 0.18, lean: 0.4, legL: [-0.64, 0, 0], legR: [0.42, 0, 0], chest: [0.34, 0, 0], neck: [0.12, 0, 0],
                armR: [-1.45, 0, 0.05], armL: [-1.45, 0, -0.05], elbowR: [0.05, 0, 0], elbowL: [0.05, 0, 0] },
    }],
  },
  // Front kick: the knee chambers high, then the leg snaps straight out while the body leans back.
  enemyKick: {
    hits: [{
      windup: { lean: -0.12, legR: [-0.6, 0, 0], kneeR: [1.3, 0, 0], chest: [-0.12, 0, 0], armL: [-0.5, 0, 0.3], armR: [-0.3, 0, -0.3] },
      strike: { lean: -0.25, legR: [-1.45, 0, 0], kneeR: [0.05, 0, 0], chest: [-0.15, 0, 0], armL: [-0.3, 0, 0.5], armR: [-0.1, 0, -0.5] },
      follow: { lean: -0.2, legR: [-1.1, 0, 0], kneeR: [0.5, 0, 0], chest: [-0.1, 0, 0], armL: [-0.3, 0, 0.45], armR: [-0.1, 0, -0.45] },
    }],
  },
  // Bow: side-on, the bow arm level and the string drawn to the cheek; the release snaps the hand open.
  enemyDraw: {
    hits: [{
      windup: { spin: [0, 0.35, 0], head: [0, 0.3, 0], armR: [-1.15, 0, 0], weapon: [-0.5, 0, 0], armL: [-1.3, 0, -0.75], elbowL: [-1.3, 0, 0] },
      strike: { spin: [0, 0.35, 0], head: [0, 0.3, 0], armR: [-1.15, 0, 0], weapon: [-0.5, 0, 0], armL: [-0.9, 0, -0.25], elbowL: [-0.3, 0, 0] },
      follow: { spin: [0, 0.3, 0], head: [0, 0.25, 0], armR: [-1.05, 0, 0], weapon: [-0.45, 0, 0], armL: [-0.8, 0, -0.15], elbowL: [-0.2, 0, 0] },
    }],
  },
  // Stomp: one leg lifted high (the long, visible tell), arms up for balance, then brought down with the whole weight.
  enemyStomp: {
    ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' },
    hits: [{
      windup: { lean: -0.15, legL: [-1.3, 0, 0], kneeL: [1.4, 0, 0], chest: [-0.3, 0, 0], neck: [-0.15, 0, 0], armR: [-1.2, 0, -0.6],
                armL: [-1.0, 0, 0.6], elbowR: [-0.5, 0, 0], elbowL: [-0.5, 0, 0] },
      strike: { crouch: 0.25, lean: 0.3, legL: [-0.25, 0, 0], kneeL: [0.1, 0, 0], chest: [0.4, 0, 0], neck: [0.2, 0, 0],
                armR: [-0.4, 0, -0.3], armL: [-0.4, 0, 0.3], elbowR: [-0.2, 0, 0], elbowL: [-0.2, 0, 0] },
      follow: { crouch: 0.3, lean: 0.34, legL: [-0.3, 0, 0], kneeL: [0.15, 0, 0], chest: [0.45, 0, 0], neck: [0.22, 0, 0],
                armR: [-0.3, 0, -0.35], armL: [-0.3, 0, 0.35], elbowR: [-0.1, 0, 0], elbowL: [-0.1, 0, 0] },
    }],
  },
  // Heavy: a deep two-handed overhead, the whole body arched back, then driven down into a low, planted finish.
  // `charge` is added on top of the wind-up while the button is held (coiling further: lower, more arched, twisted).
  heavyOverhead: {
    ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' },
    hits: [{
      windup: { crouch: 0.14, lean: -0.2, legL: [-0.25, 0, 0], legR: [0.25, 0, 0], spin: [0, -0.35, 0], chest: [-0.5, -0.25, 0.05],
                neck: [-0.25, 0.1, 0], head: [-0.15, 0.15, 0], armR: [-2.9, 0, -0.3], elbowR: [-0.7, 0, 0], weapon: [-0.5, 0, 0],
                armL: [-2.5, 0, 0.4], elbowL: [-0.7, 0, 0] },
      strike: { crouch: 0.25, lean: 0.3, legL: [-0.58, 0, 0], legR: [0.42, 0, 0], spin: [0, 0.15, 0], chest: [0.4, 0.1, 0],
                neck: [0.15, 0, 0], head: [0.06, 0, 0], armR: [-0.75, 0, 0.1], elbowR: [0.05, 0, 0], weapon: [0.8, 0, 0],
                armL: [-0.6, 0, -0.2], elbowL: [-0.15, 0, 0] },
      follow: { crouch: 0.28, lean: 0.34, legL: [-0.62, 0, 0], legR: [0.44, 0, 0], spin: [0, 0.18, 0], chest: [0.46, 0.1, 0],
                neck: [0.2, 0, 0], head: [0.1, 0, 0], armR: [-0.55, 0, 0.1], elbowR: [0.1, 0, 0], weapon: [0.95, 0, 0],
                armL: [-0.45, 0, -0.2], elbowL: [-0.05, 0, 0] },
    }],
    charge: { crouch: 0.1, lean: -0.12, spin: [0, -0.3, 0], chest: [-0.2, -0.25, 0], armR: [-0.25, 0, -0.15], armL: [-0.2, 0, 0.1],
              head: [0.1, 0.1, 0] },
  },
};
// Combos built from single cuts: a quick diagonal then a backhand; three cuts end in a big overhead (the final hit has the
// biggest wind-up).
ATTACK_POSES.enemyDoubleSlash = { hits: [ATTACK_POSES.lightDiagonal.hits[0], ATTACK_POSES.lightBackhand.hits[0]] };
ATTACK_POSES.enemyTripleCut = { hits: [ATTACK_POSES.lightDiagonal.hits[0], ATTACK_POSES.lightBackhand.hits[0], ATTACK_POSES.hollowOverhead.hits[0]] };
// Varn, Knell of Ash (Level 5, v4.3): four cuts ending in the big overhead; a rising cut into a leaping crash; three
// stamps of the blade (each a toll and a ring of fire) and a last overhead blast.
ATTACK_POSES.knellChain = { hits: [ATTACK_POSES.lightDiagonal.hits[0], ATTACK_POSES.lightBackhand.hits[0], ATTACK_POSES.lightDiagonal.hits[0], ATTACK_POSES.hollowOverhead.hits[0]] };
ATTACK_POSES.risingCrash = { hits: [ATTACK_POSES.lightBackhand.hits[0], ATTACK_POSES.hollowOverhead.hits[0]] };
ATTACK_POSES.tollingStamp = { hits: [ATTACK_POSES.enemyStomp.hits[0], ATTACK_POSES.enemyStomp.hits[0], ATTACK_POSES.enemyStomp.hits[0], ATTACK_POSES.hollowOverhead.hits[0]] };
// The Gargoyle's own (v4.3.1): it has no weapon, so its blows are claws and its whole body. A rake with the right claw,
// then the left; and a pounce, crouched low with both arms back, then both claws driven down as it lands.
ATTACK_POSES.clawRake = { hits: [
  { windup: { crouch: 0.15, spin: [0, -0.6, 0], chest: [0.1, -0.35, 0], armR: [-1.9, 0, -0.9], elbowR: [-0.9, 0, 0], armL: [-0.4, 0, 0.3], head: [0.1, 0.2, 0] },
    strike: { crouch: 0.2, lean: 0.2, spin: [0, 0.7, 0], chest: [0.35, 0.4, 0], armR: [-0.7, 0, 0.6], elbowR: [-0.2, 0, 0], armL: [-0.5, 0, 0.3] },
    follow: { crouch: 0.22, lean: 0.25, spin: [0, 0.85, 0], chest: [0.4, 0.45, 0], armR: [-0.3, 0, 0.8], elbowR: [-0.3, 0, 0], armL: [-0.6, 0, 0.2] } },
  { windup: { crouch: 0.15, spin: [0, 0.6, 0], chest: [0.1, 0.35, 0], armL: [-1.9, 0, 0.9], elbowL: [-0.9, 0, 0], armR: [-0.4, 0, -0.3], head: [0.1, -0.2, 0] },
    strike: { crouch: 0.2, lean: 0.2, spin: [0, -0.7, 0], chest: [0.35, -0.4, 0], armL: [-0.7, 0, -0.6], elbowL: [-0.2, 0, 0], armR: [-0.5, 0, -0.3] },
    follow: { crouch: 0.22, lean: 0.25, spin: [0, -0.85, 0], chest: [0.4, -0.45, 0], armL: [-0.3, 0, -0.8], elbowL: [-0.3, 0, 0], armR: [-0.6, 0, -0.2] } },
] };
ATTACK_POSES.clawPounce = { hits: [
  { windup: { crouch: 0.4, lean: 0.35, chest: [0.3, 0, 0], armR: [0.6, 0, -0.5], armL: [0.6, 0, 0.5], elbowR: [-0.6, 0, 0], elbowL: [-0.6, 0, 0], head: [-0.4, 0, 0], legL: [-0.5, 0, 0], legR: [-0.5, 0, 0] },
    strike: { crouch: 0.3, lean: 0.45, chest: [0.6, 0, 0], armR: [-1.2, 0, 0.3], armL: [-1.2, 0, -0.3], elbowR: [-0.1, 0, 0], elbowL: [-0.1, 0, 0], head: [0.2, 0, 0] },
    follow: { crouch: 0.35, lean: 0.5, chest: [0.7, 0, 0], armR: [-0.6, 0, 0.3], armL: [-0.6, 0, -0.3], elbowR: [-0.2, 0, 0], elbowL: [-0.2, 0, 0] } },
] };
