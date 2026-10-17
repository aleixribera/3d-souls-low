'use strict';
// ============================================================================
// Elden Ring Bosses: Margit, the Fell Omen (v5.3)
// ============================================================================
// Everything that makes Margit lives here: his key poses, his model and his moveset. The boss list (js/data/elden-bosses.js)
// names him; the mode (js/elden.js) fights him in the Enemies arena. Reference: docs/Margit/margit-stats.txt.
//
// Scaled to this game, not to Elden Ring's numbers: the player has 120 HP, a light hit does 18 and a heavy 38, and a roll
// is invulnerable for 0.3 s. Margit stands a little above Aldric (the throne + knell duel, 3800 HP over two bars):
//   - one bar of 3200 HP; at 60 % (1920 HP left) the second phase begins on the same bar (`at`), opening with the hammer;
//   - posture 130, a parry adds 65: two parries break his stance (the reference's "2 parries"), heavy blows build it too;
//   - cane blows 22-46 damage, golden (holy) weapons 34-60, the daggers 16-18; every strike's active time stays at or under
//     0.2 s, so a roll always clears it with a margin (the boss test);
//   - the cane can be parried (it glints); the golden weapons and the tail cannot (`noParry`), but they can be blocked.
// Ratios kept from the reference: the hammer slams hit hardest, the charged overhead and the leaping plunge leave the big
// openings, the thrust and the daggers are fast with almost no opening, and the delayed swings (`hold`) are his identity.

// ---- key poses (js/data/attack-poses.js format), built from the shared ones ----------------------------------------------
{
  const A = ATTACK_POSES, h = id => A[id].hits[0];
  ATTACK_POSES.margitCaneCombo = { hits: [h('lightDiagonal'), h('lightBackhand')] };
  ATTACK_POSES.margitCaneComboThrust = { hits: [h('lightDiagonal'), h('lightBackhand'), h('enemyThrust')] };
  ATTACK_POSES.margitFlickOverhead = { hits: [h('lightBackhand'), h('hollowOverhead')] };
  ATTACK_POSES.margitRunningSweep = { hits: [h('hollowSwing'), h('lightBackhand')] };
  ATTACK_POSES.margitDoubleToss = { hits: [h('lightOverhead'), h('lightOverhead')] };
  ATTACK_POSES.margitLeapThrust = { hits: [h('hollowSwing'), h('enemyThrust')] };
  ATTACK_POSES.margitHammerOpener = { hits: [h('hollowSwing'), h('heavyOverhead'), h('enemyStomp')] };
  ATTACK_POSES.margitHammerSlam = { hits: [h('heavyOverhead'), h('enemyStomp')] };
  ATTACK_POSES.margitSpinSweep = { hits: [h('enemySpin'), h('enemySpin')] };
  ATTACK_POSES.margitFlurry = { hits: [h('enemySpin'), h('lightBackhand'), h('enemySpin'), h('lightBackhand'), h('hollowOverhead')] };
  ATTACK_POSES.margitSwordCombo = { hits: [h('enemyThrust'), h('hollowSwing'), h('hollowOverhead')] };
  ATTACK_POSES.margitCross = { hits: [h('enemySpin')] };
}

// ---- model: tall, hunched, cloaked, a white beard under a deep hood, a gnarled cane, a long tail ---------------------------
MODEL_DEFS.margit = {
  faction: 'goldenOmen', budget: 'boss', fit: 1.08, limbSides: 8,
  proportions: { shoulderX: 0.36, torsoW: 0.22, torsoD: 0.17, armR: 0.06, legR: 0.075, headR: 0.13, handR: 0.065, footLen: 0.32 },
  limbs: { armL: { len: 1.12, thick: 0.95 }, armR: { len: 1.08 } },   // long arms, the off hand longer still
  posture: { chest: [0.55, 0, 0.04], neck: [0.3, 0, 0], head: [-0.25, 0, 0], elbowL: [-0.35, 0, 0], elbowR: [-0.4, 0, 0] },   // bent low over the cane
  materials: {
    skin: { tex: 'paleSkin', tint: 0x8a8274, decay: 0.85 },
    robe: { tex: 'rottenCloth', tint: 0x4a463a, decay: 0.75, size: 512, double: true },
    cloak: { tex: 'rottenCloth', tint: 0x34342e, decay: 0.7, size: 512, double: true },
    cloakHem: { tex: 'tatteredFabric', tint: 0x34342e, decay: 0.75, size: 512, double: true },
    hair: { tex: 'rottenCloth', tint: 0xcfc8b4, decay: 0.4, double: true },
    leather: { tex: 'crackedLeather', tint: 0x4a4036, decay: 0.75 },
    gold: { tex: 'dentedSteel', tint: 0xb08a3a, decay: 0.5 },
    wood: { tex: 'barkMoss', tint: 0x5a4630, decay: 0.35 },
    iron: { tex: 'rustedIron', tint: 0x6a5e50, decay: 0.7 },
    tail: { tex: 'paleSkin', tint: 0x5e584e, decay: 0.9 },
    eye: { glow: 0xffd36a },
  },
  body: { torso: 'robe', pelvis: 'robe', arms: 'robe', legs: 'leather', head: 'skin', neck: 'skin', hands: 'skin', feet: 'leather' },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.18] }, loinB: { parent: 'spin', at: [0, -0.02, -0.18] },
    beard: { parent: 'head', at: [0, 0.03, 0.13] },
    capeA: { parent: 'chest', at: [0, 0.56, -0.22] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] }, capeD: { parent: 'capeC', at: [0, -0.38, 0] },
  },
  parts: [
    { use: 'tunic', slot: 'robe', bone: 'spin' }, { use: 'belt', slot: 'gold', bone: 'spin' },
    { use: 'hood', slot: 'cloak', bone: 'head', size: 1.3, tail: 1.4 },
    { use: 'pauldron', slot: 'cloak', bone: 'armL', size: 1.9 }, { use: 'pauldron', slot: 'cloak', bone: 'armR', size: 1.9, side: -1 },
    { use: 'chain', slot: 'gold', bone: 'chest', from: [-0.22, 0.52, 0.14], to: [0.22, 0.52, 0.14], links: 9, sag: 0.08 },
    { use: 'wraps', slot: 'leather', bone: 'elbowL', from: 0.04, to: 0.3, radius: 0.07, count: 3 }, { use: 'wraps', slot: 'leather', bone: 'elbowR', from: 0.04, to: 0.3, radius: 0.07, count: 3 },
    { use: 'clothStrip', slot: 'hair', bone: 'beard', w: 0.16, len: 0.42, seed: 5 },
    { use: 'clothStrip', slot: 'robe', bone: 'loinF', w: 0.34, len: 0.95, seed: 2 }, { use: 'clothStrip', slot: 'robe', bone: 'loinB', w: 0.36, len: 1.0, seed: 8 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeA', w0: 0.62, w1: 0.74, len: 0.42, bow: 1.0 }, { use: 'capeSegment', slot: 'cloak', bone: 'capeB', w0: 0.74, w1: 0.86, len: 0.42, bow: 0.8 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeC', w0: 0.86, w1: 0.96, len: 0.38, bow: 0.6 },
    { use: 'capeSegment', slot: 'cloakHem', bone: 'capeD', w0: 0.96, w1: 1.02, len: 0.36, bow: 0.5, ragged: true, seed: 4 },
    { use: 'tail', slot: 'tail', bone: 'spin', size: 1.1 },
  ],
  weapon: { use: 'cane', slots: { grip: 'wood', blade: 'iron', guard: 'wood' } },
  eyes: { color: 0xffd36a, size: 0.02, spread: 0.07, at: [0, 0.13, 0.15] },
  anim: {
    idle: { breathRate: 0.9, breath: 0.022, headDrift: 0.06, sway: 0.025, twitch: 0 }, walk: { twist: 0.14, roll: 0.05, headNod: 0.04, elbow: 0.3, drag: 0.2 },
    flinch: { head: 0.35, chest: 0.35, arms: 0.35 }, death: { buckle: 1.2, slump: 1 },
    cloth: [{ bone: 'loinF', gain: 0.12, k: 60, damp: 5, flutter: 0.04 }, { bone: 'loinB', gain: 0.15, k: 52, damp: 4.6, flutter: 0.05 },
            { bone: 'beard', gain: 0.1, k: 70, damp: 6, flutter: 0.02 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 36, damp: 3.8, flutter: 0.045 },
            { bone: 'capeC', gain: 0.07, k: 32, damp: 3.4, flutter: 0.06, sideways: 1.2 }, { bone: 'capeD', gain: 0.1, k: 24, damp: 2.8, flutter: 0.09, sideways: 1.4 }],
  },
};

// ---- the boss -----------------------------------------------------------------------------------------------------------
// New fields (v5.3, js/enemy.js): `when` (a reaction: behind, flank, healing, staggered), `followUps` (a combo branches),
// a hit's `abort` (a wind-up turns into another attack if the player backs off), a hit's `leap.back` (a leap away),
// `spectral` (a golden weapon appears in his hand, js/spectral.js) and `noParry`. A phase with `at` starts mid-bar.
const margitGlint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
const MARGIT = {
  id: 'margit', model: 'margit', name: 'Margit, the Fell Omen',
  description: 'A towering, hunched omen with a gnarled cane, who conjures golden weapons from the air. His swings wait before they fall.',
  scale: 1.85, bulk: 1.15, radius: 0.74, color: 0x4a463a, weapon: 'spear', idle: 'sway',
  visual: { skin: 0x8a8274, roughness: 0.75, rim: 0.9 },
  hp: 3200, poise: 240, speed: 2.6, turnRate: 3.2, trackRate: 1.6, approach: 0.5, kite: 0.15,
  cooldown: [1.1, 2.1], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 6,
  posture: { max: 130, parry: 65, chainGap: 1.8, chainMul: 1.35, decay: 4.5, breakTime: 3.2, hitstop: 0.2 },
  defaultPhases: ['omen', 'golden'],
  phases: {
    // Phase 1: the cane and the daggers, the leaping plunge, the tail behind him.
    omen: { hp: 3200,
      attacks: ['caneCombo', 'caneOverhead', 'runningSweep', 'caneThrust', 'flickOverhead', 'daggerToss', 'daggerDouble', 'daggerLeap',
                'daggerRetreat', 'canePlunge', 'tailSwipe', 'daggerSlash', 'daggerPunish', 'crossSlash'] },
    // Phase 2 (at 60 %): the hammer and the sword join the cane; he attacks sooner and closes in harder. Opens with the hammer.
    golden: { at: 0.6, opener: 'hammerOpener', cooldown: [0.7, 1.5], approach: 0.75, kite: 0.05, speed: 2.9, trackRate: 2.0,
      attacks: ['caneCombo', 'caneOverhead', 'runningSweep', 'caneThrust', 'flickOverhead', 'daggerToss', 'daggerDouble', 'daggerLeap',
                'daggerRetreat', 'tailSwipe', 'daggerSlash', 'daggerPunish', 'crossSlash',
                'hammerOpener', 'hammerLeap', 'hammerStomp', 'spinSweep', 'swordFlurry', 'swordCombo'] },
  },
  attacks: [
    // ---- phase 1: the cane --------------------------------------------------------------------------------------------
    // Right-to-left, then back: may end in a ground thrust (the bait; the pause after the second swing is a trap).
    { id: 'caneCombo', name: 'Double Slash', anim: 'sweep', pose: 'margitCaneCombo', tracking: { rate: 2.8, commit: 0.7 }, markers: margitGlint(0, 1), poseScale: 1.2,
      hits: [{ startup: 0.85, active: 0.13, follow: 0.12 }, { startup: 0.55, active: 0.13, follow: 0.3 }], recovery: 0.9,
      followUps: [{ attack: 'groundThrust', chance: 0.55 }],
      damage: 24, poise: 40, knock: 5, lunge: 2.0, range: 3.2, box: { w: 3.8, h: 1.8, d: 3.2, fwd: 1.8, y: 1.2 } },
    { id: 'groundThrust', name: 'Ground Thrust', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 2.4, commit: 0.6 }, markers: margitGlint(0), poseScale: 1.15, chance: 0,
      hits: [{ startup: 0.75, active: 0.14, follow: 0.3, hold: { at: 0.5, time: [0.2, 0.5], chance: 0.4 } }], recovery: 1.1,
      damage: 30, poise: 50, knock: 6, lunge: 2.6, range: 3.6, box: { w: 1.2, h: 1.4, d: 3.4, fwd: 2.2, y: 0.8 } },
    // Raised two-handed, held (the delay is the point); slams in front: a major opening. Back off before it falls and he
    // turns it into the running sweep.
    { id: 'caneOverhead', name: 'Charged Overhead', anim: 'chop', pose: 'heavyOverhead', tracking: { rate: 2.0, commit: 0.55 }, markers: margitGlint(0), poseScale: 1.35,
      hits: [{ startup: 1.6, active: 0.14, follow: 0.45, hold: { at: 0.5, time: [0.4, 1.1], chance: 0.7 }, abort: { at: 0.6, beyond: 5, into: 'runningSweep' } }], recovery: 1.45,
      damage: 46, poise: 80, knock: 9, lunge: 1.4, range: 3.4, box: { w: 1.8, h: 3.0, d: 3.8, fwd: 2.2, y: 1.2 },
      impact: { ring: 2.6, crack: 1.4, dust: 12, shake: 0.1 } },
    // The gap-closing version: a run and two diagonal sweeps; open only after the second.
    { id: 'runningSweep', name: 'Running Sweep', anim: 'sweep', pose: 'margitRunningSweep', tracking: { rate: 2.8, commit: 0.45 }, markers: margitGlint(0, 1), poseScale: 1.2,
      minRange: 4.5, dash: { speed: 10, from: 0.3 }, chance: 0.35,
      hits: [{ startup: 0.8, active: 0.14, follow: 0.12 }, { startup: 0.5, active: 0.14, follow: 0.3 }], recovery: 0.85,
      damage: 26, poise: 45, knock: 6, lunge: 2.4, range: 11, box: { w: 3.8, h: 1.8, d: 3.2, fwd: 1.8, y: 1.2 } },
    // Fast and linear. Circle to his left and the recovery cancels into a golden dagger slash.
    { id: 'caneThrust', name: 'Staff Stab', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 3.4, commit: 0.75 }, markers: margitGlint(0), poseScale: 1.15,
      hits: [{ startup: 0.6, active: 0.12, follow: 0.18 }], recovery: 0.7,
      followUps: [{ attack: 'daggerSlash', if: 'flank', chance: 0.85 }, { attack: 'daggerSlash', chance: 0.25 }],
      damage: 22, poise: 35, knock: 5, lunge: 3.0, range: 3.8, box: { w: 1.0, h: 1.4, d: 3.6, fwd: 2.2, y: 1.2 } },
    // A quick upward flick, then the one-handed overhead held a beat too long.
    { id: 'flickOverhead', name: 'Upward Slash, Overhead', anim: 'chop', pose: 'margitFlickOverhead', tracking: { rate: 3.0, commit: 0.65 }, markers: margitGlint(0, 1), poseScale: 1.25,
      hits: [{ startup: 0.55, active: 0.12, follow: 0.12 }, { startup: 1.0, active: 0.14, follow: 0.35, hold: { at: 0.45, time: [0.4, 0.9], chance: 0.75 } }], recovery: 0.95,
      followUps: [{ attack: 'daggerSlash', if: 'flank', chance: 0.7 }],
      damage: 28, poise: 45, knock: 6, lunge: 1.8, range: 3.2, box: { w: 2.2, h: 2.6, d: 3.4, fwd: 2.0, y: 1.2 } },
    // Jumps high and plunges the cane: it sticks in the ground, a long opening. (Phase 2 replaces it with the hammer.)
    { id: 'canePlunge', name: 'Leaping Cane Plunge', anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 2.0, commit: 0.45 }, markers: margitGlint(0), poseScale: 1.4, minRange: 4, chance: 0.3,
      hits: [{ startup: 1.5, active: 0.14, follow: 0.6, leap: { from: 0.4, max: 12, short: 1.6 } }], recovery: 1.5,
      damage: 44, poise: 80, knock: 9, lunge: 0, range: 12, box: { w: 2.6, h: 2.4, d: 3.6, fwd: 1.6, y: 1.0 },
      impact: { ring: 3.0, crack: 1.6, dust: 16, shake: 0.12 } },
    // ---- phase 1: the golden daggers (holy; thrown daggers are bolts, blockable, not parryable) ----------------------
    { id: 'daggerToss', name: 'Dagger Toss', anim: 'overhead', pose: 'lightOverhead', spectral: 'dagger', tracking: { rate: 3.0, commit: 0.85 }, minRange: 4, chance: 0.35,
      projectile: { speed: 22, gravity: 0, size: 0.16, look: 'dagger' },
      hits: [{ startup: 0.75, active: 0.05, follow: 0.12 }], recovery: 0.35,
      followUps: [{ attack: 'daggerLeap', if: 'far', chance: 0.4 }],
      damage: 16, poise: 20, knock: 3, lunge: 0, range: 22, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.4 } },
    { id: 'daggerDouble', name: 'Double Dagger Toss', anim: 'overhead', pose: 'margitDoubleToss', spectral: 'dagger', tracking: { rate: 3.0, commit: 0.85 }, minRange: 5, chance: 0.22,
      projectile: { speed: 22, gravity: 0, size: 0.16, look: 'dagger' },
      hits: [{ startup: 0.75, active: 0.05, follow: 0.1 }, { startup: 0.4, active: 0.05, follow: 0.12 }], recovery: 0.4,
      damage: 16, poise: 20, knock: 3, lunge: 0, range: 22, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.4 } },
    // Drinking at range invites a dagger (the reference's flask read).
    { id: 'daggerPunish', name: 'Dagger Toss', anim: 'overhead', pose: 'lightOverhead', spectral: 'dagger', when: 'healing', tracking: { rate: 3.4, commit: 0.85 }, minRange: 4, chance: 3,
      projectile: { speed: 24, gravity: 0, size: 0.16, look: 'dagger' },
      hits: [{ startup: 0.6, active: 0.05, follow: 0.12 }], recovery: 0.35,
      damage: 18, poise: 20, knock: 3, lunge: 0, range: 22, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.4 } },
    // A leaping horizontal cane slash after a toss, then the ground thrust: open only after the thrust.
    { id: 'daggerLeap', name: 'Dagger Leap & Thrust', anim: 'sweep', pose: 'margitLeapThrust', tracking: { rate: 2.6, commit: 0.45 }, markers: margitGlint(0, 1), poseScale: 1.25, minRange: 4, chance: 0.2,
      hits: [{ startup: 1.0, active: 0.14, follow: 0.12, leap: { from: 0.35, max: 11, short: 1.8 } }, { startup: 0.55, active: 0.14, follow: 0.35 }], recovery: 1.0,
      damage: 28, poise: 45, knock: 6, lunge: 1.6, range: 12, box: { w: 3.6, h: 1.8, d: 3.4, fwd: 1.9, y: 1.1 } },
    // Too close: a backward leap, a dagger thrown on the way. No opening.
    { id: 'daggerRetreat', name: 'Dagger Retreat', anim: 'overhead', pose: 'lightOverhead', spectral: 'dagger', tracking: { rate: 3, commit: 0.6 }, chance: 0.25,
      projectile: { speed: 22, gravity: 0, size: 0.16, look: 'dagger' },
      hits: [{ startup: 0.7, active: 0.05, follow: 0.15, leap: { from: 0.2, max: 5, back: 5 } }], recovery: 0.3,
      damage: 16, poise: 20, knock: 3, lunge: 0, range: 2.6, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.4 } },
    // Close at his left (his off hand): a quick golden dagger slash. Also the cancel out of the thrust.
    { id: 'daggerSlash', name: 'Spectral Dagger Slash', anim: 'sweep', pose: 'lightBackhand', spectral: 'dagger', noParry: true, when: 'flank', tracking: { rate: 4, commit: 0.7 }, chance: 1.6,
      hits: [{ startup: 0.5, active: 0.12, follow: 0.14 }], recovery: 0.6,
      damage: 20, poise: 30, knock: 4, lunge: 2.2, range: 3.0, box: { w: 3.0, h: 1.6, d: 2.6, fwd: 1.3, y: 1.1 } },
    // Behind him: the tail sweeps his rear arc.
    { id: 'tailSwipe', name: 'Tail Swipe', anim: 'spin', pose: 'enemySpin', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 4,
      hits: [{ startup: 0.6, active: 0.14, follow: 0.3 }], recovery: 0.75,
      damage: 22, poise: 40, knock: 8, lunge: 0, range: 3.4, box: { w: 4.4, h: 1.2, d: 3.0, fwd: -1.4, y: 0.6 } },
    // A broken guard: the staff and a conjured sword scissor shut.
    { id: 'crossSlash', name: 'Unguarded Cross Slash', anim: 'spin', pose: 'margitCross', spectral: 'sword', noParry: true, when: 'staggered', tracking: { rate: 4, commit: 0.8 }, chance: 6,
      hits: [{ startup: 0.55, active: 0.14, follow: 0.3 }], recovery: 0.8,
      damage: 36, poise: 60, knock: 7, lunge: 1.6, range: 3.4, box: { w: 3.4, h: 2.0, d: 3.0, fwd: 1.6, y: 1.2 } },
    // ---- phase 2: the golden hammer and sword (holy, blockable, not parryable) ----------------------------------------
    // The phase opener: the hammer appears on his shoulder, a wide sweep, a leap and a slam with a holy shockwave.
    { id: 'hammerOpener', name: 'Hammer Sweep, Aerial Slam', anim: 'sweep', pose: 'margitHammerOpener', spectral: 'hammer', noParry: true, tracking: { rate: 2.2, commit: 0.6 }, poseScale: 1.3, chance: 0.12,
      hits: [{ startup: 1.2, active: 0.14, follow: 0.3, box: { w: 6.0, h: 2.0, d: 4.0, fwd: 2.0, y: 1.1 } },
             { startup: 1.3, active: 0.16, follow: 0.5, leap: { from: 0.35, max: 9, short: 1.2 }, box: { w: 5.0, h: 2.4, d: 5.0, fwd: 0.8, y: 1.0 },
               impact: { ring: 5.0, crack: 2.4, dust: 22, shake: 0.18 } },
             { startup: 0.05, active: 0.18, follow: 0.2, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 7, width: 1.6, time: 0.18 } } }],
      recovery: 1.6, damage: 40, poise: 70, knock: 9, lunge: 1.2, range: 3.8, box: { w: 6.0, h: 2.0, d: 4.0, fwd: 2.0, y: 1.1 } },
    // Replaces the cane plunge: a high leap that tracks, a crash and a shockwave. Major opening.
    { id: 'hammerLeap', name: 'Hammer Leap Slam', anim: 'chop', pose: 'margitHammerSlam', spectral: 'hammer', noParry: true, tracking: { rate: 2.4, commit: 0.5 }, poseScale: 1.4, minRange: 4, chance: 0.35,
      hits: [{ startup: 1.6, active: 0.16, follow: 0.3, leap: { from: 0.4, max: 13, short: 1.2 }, impact: { ring: 6.0, crack: 2.8, dust: 26, shake: 0.2 } },
             { startup: 0.05, active: 0.18, follow: 0.5, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 8, width: 1.6, time: 0.18 } } }],
      recovery: 1.8, damage: 56, poise: 90, knock: 11, lunge: 0, range: 13, box: { w: 5.0, h: 2.4, d: 5.0, fwd: 0.8, y: 1.0 } },
    // Lifts a leg, winds the hammer overhead (held), slams it straight down. A finisher: a major opening, nothing after.
    { id: 'hammerStomp', name: 'Hammer Stomp & Slam', anim: 'chop', pose: 'margitHammerSlam', spectral: 'hammer', noParry: true, tracking: { rate: 2.0, commit: 0.5 }, poseScale: 1.35, chance: 0.4,
      hits: [{ startup: 1.75, active: 0.16, follow: 0.4, hold: { at: 0.55, time: [0.3, 0.9], chance: 0.6 } }], recovery: 1.7,
      damage: 60, poise: 95, knock: 10, lunge: 1.2, range: 3.6, box: { w: 2.4, h: 3.0, d: 4.2, fwd: 2.3, y: 1.0 },
      impact: { ring: 4.0, crack: 2.2, dust: 20, shake: 0.16 } },
    // A full turn: the cane, then the hammer right behind it. Backing away chains the leaping slash and thrust.
    { id: 'spinSweep', name: 'Staff-to-Hammer Spin', anim: 'spin', pose: 'margitSpinSweep', spectral: 'hammer', noParry: true, tracking: { rate: 2.4, commit: 0.6 }, poseScale: 1.25, chance: 0.5,
      hits: [{ startup: 0.9, active: 0.14, follow: 0.08 }, { startup: 0.35, active: 0.16, follow: 0.35 }], recovery: 0.9,
      followUps: [{ attack: 'daggerLeap', if: 'far', chance: 0.7 }],
      damage: 34, poise: 60, knock: 8, lunge: 1.0, range: 3.4, box: { w: 6.2, h: 1.8, d: 6.2, fwd: 0, y: 1.0 } },
    // The Carian flurry: up to five alternating spins with the golden sword and the cane, advancing, the pauses between
    // them frame traps, a downward strike to end. Open only after the last.
    { id: 'swordFlurry', name: 'Golden Sword Flurry', anim: 'spin', pose: 'margitFlurry', spectral: 'sword', noParry: true, tracking: { rate: 3.0, commit: 0.7 }, poseScale: 1.2, chance: 0.45,
      hits: [{ startup: 0.8, active: 0.13, follow: 0.08 }, { startup: 0.42, active: 0.13, follow: 0.08 }, { startup: 0.6, active: 0.13, follow: 0.08 },
             { startup: 0.42, active: 0.13, follow: 0.1 }, { startup: 0.95, active: 0.15, follow: 0.4, hold: { at: 0.5, time: [0.2, 0.6], chance: 0.6 } }],
      recovery: 1.1, damage: 20, poise: 30, knock: 4, lunge: 2.0, range: 3.4, box: { w: 4.6, h: 1.8, d: 3.6, fwd: 1.6, y: 1.1 } },
    // Golden sword thrust, a horizontal swipe, the cane plunged into the ground.
    { id: 'swordCombo', name: 'Sword Combo, Ground Stab', anim: 'thrust', pose: 'margitSwordCombo', spectral: 'sword', noParry: true, tracking: { rate: 3.0, commit: 0.7 }, poseScale: 1.2, chance: 0.5,
      hits: [{ startup: 0.65, active: 0.12, follow: 0.1, box: { w: 1.2, h: 1.4, d: 3.8, fwd: 2.4, y: 1.2 } }, { startup: 0.45, active: 0.13, follow: 0.12 },
             { startup: 0.8, active: 0.14, follow: 0.4, box: { w: 2.0, h: 2.4, d: 3.2, fwd: 2.0, y: 0.8 }, impact: { ring: 2.4, crack: 1.2, dust: 10, shake: 0.08 } }],
      recovery: 1.0, damage: 26, poise: 45, knock: 6, lunge: 2.2, range: 3.6, box: { w: 4.2, h: 1.8, d: 3.4, fwd: 1.8, y: 1.1 } },
  ],
};
