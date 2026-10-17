'use strict';
// ============================================================================
// Elden Ring Bosses: the Crucible Knight (v5.5)
// ============================================================================
// Everything that makes the Crucible Knight lives here: his key poses, his model and his moveset. The boss list
// (js/data/elden-bosses.js) names him; the mode (js/elden.js) fights him in the Enemies arena. Reference:
// docs/crucible-knight-stats.txt.
//
// Conversion to this game's scale (not Elden Ring's numbers). The player has 120 HP, a light hit does 18 and a heavy 53,
// a roll is invulnerable for 0.3 s. Margit (3200 HP, 4174 in ER) and Godrick (4000, 6080 in ER) are the other duels. The
// Crucible Knight has 2782 HP in ER (x0.67 of Margit), but 35 % absorption everywhere and a greatshield that eats frontal
// blows, so he sits a little under Margit on paper and plays as long:
//   - one bar of 2600 HP; at 50 % (1300 HP left, the reference's threshold) the Crucible aspects wake on the same bar
//     (`at`), opening with the Wings dive so the change is plain to see;
//   - stance 80 -> posture 115 (Margit 90 -> 130); ONE parry breaks it (`parry` = `max`, the reference's "1 parry"), and
//     an execution on him deals 0.7 of the usual (`critMul`, the reference's 30 % critical resistance);
//   - shield guard (`guard`): while not attacking, blows from the front are blocked (0.3 of the damage) and each blocked
//     blow may be answered at once by the counter Shield Bash (`when: 'shielded'`). The guard meter breaks him too;
//   - greatsword blows 20-44, the stomp's shockwave 26 (along the floor: jump it), shield bashes 24, the tail 32 and the
//     great tail 42, the Wings dive 54; every strike's `active` stays at or under 0.2 s (a roll clears it; a test checks);
//   - parryable: every greatsword swing and thrust (they glint). Not parryable: the shield bashes, the stomp and the aspects.
// Ratios kept from the reference: the overhead slam (sword planted), the double spin, the whiffed bash, the Wings landing
// and the double tail leave the big openings; the thrusts, the diagonal pair and the single tail short ones; the stomp
// never: it always chains into a sword blow. Phase 2: no longer pauses after his finishers, a tail sweep follows if close.

// ---- key poses (js/data/attack-poses.js format), built from the shared ones ----------------------------------------------
{
  const A = ATTACK_POSES, h = id => A[id].hits[0];
  ATTACK_POSES.crucibleDiagonal = { hits: [h('lightDiagonal'), h('lightBackhand')] };
  ATTACK_POSES.crucibleDoubleSpin = { hits: [h('enemySpin'), h('enemySpin')] };
}

// ---- model (from the reference art): a towering knight in ornate golden-bronze plate worked with roots and vortices, a
// tall closed helm with lyre horns and a crest spike, dark mail between the plates, a great oval shield on the left arm
// and a long straight greatsword. Built on the Shield Warden's frame (same skeleton and shield arm).
MODEL_DEFS.crucibleKnight = {
  extends: 'ironWarden', fit: 1.0,
  proportions: { ...IRONBOUND_PROPS, shoulderX: 0.4, torsoW: 0.27, torsoD: 0.2, armR: 0.07, legR: 0.095, headR: 0.12 },
  posture: { chest: [0.04, 0, 0], neck: [0.04, 0, 0], head: [0.02, 0, 0], elbowL: [-0.5, 0, 0], elbowR: [-0.3, 0, 0] },
  materials: {
    ...IRONBOUND_MATS,
    plate: { tex: 'dentedSteel', tint: 0xb07a40, decay: 0.55, size: 512 },
    gilt: { tex: 'dentedSteel', tint: 0xc89850, decay: 0.4 },
    mail: { tex: 'knightMail', tint: 0x4a4038, decay: 0.8 },
    shieldFace: { tex: 'rustedIron', tint: 0xb08050, decay: 0.45, size: 512 },
    shieldTrim: { tex: 'dentedSteel', tint: 0xc08a48, decay: 0.45 },
    grip: { tex: 'crackedLeather', tint: 0x4a3020, decay: 0.6 },
    blade: { tex: 'dentedSteel', tint: 0xb07850, decay: 0.45, size: 512 },
    guard: { tex: 'dentedSteel', tint: 0xa87040, decay: 0.5 },
    cloth: { tex: 'rottenCloth', tint: 0x2e2a26, decay: 0.75, double: true },
  },
  body: { torso: 'mail', pelvis: 'mail', arms: 'mail', legs: 'mail', head: null, neck: 'mail', hands: 'plate', feet: 'plate' },
  bones: { loinF: { parent: 'spin', at: [0, -0.04, 0.18] }, loinB: { parent: 'spin', at: [0, -0.04, -0.18] } },
  parts: [
    { use: 'breastplate', slot: 'plate', bone: 'chest' },
    { use: 'medallion', slot: 'gilt', bone: 'chest', at: [0, 0.4, 0.21], r: 0.07 },   // the vortex boss on the breast
    { use: 'neckGuard', slot: 'plate', bone: 'chest' },
    { use: 'tassets', slot: 'plate', bone: 'spin' },
    { use: 'crucibleHelm', slot: 'plate', metal: 'gilt', bone: 'head', size: 1.12 },
    { use: 'roundPauldron', slot: 'plate', bone: 'armR', size: 1.6, side: -1 },
    { use: 'roundPauldron', slot: 'plate', bone: 'armL', size: 1.5 },
    { use: 'plateBands', slot: 'plate', bone: 'elbowR', from: 0.03, to: 0.28, radius: 0.066, count: 3, flare: 0.28, cop: 0.075 },
    { use: 'plateBands', slot: 'plate', bone: 'elbowL', from: 0.03, to: 0.28, radius: 0.064, count: 3, flare: 0.22, cop: 0.07 },
    { use: 'plateBands', slot: 'plate', bone: 'legL', from: 0.08, to: 0.34, radius: 0.1, count: 3 },
    { use: 'plateBands', slot: 'plate', bone: 'legR', from: 0.08, to: 0.34, radius: 0.1, count: 3 },
    { use: 'plateBands', slot: 'plate', bone: 'kneeL', from: 0.03, to: 0.42, radius: 0.076, count: 4, flare: 0.14, cop: 0.09 },
    { use: 'plateBands', slot: 'plate', bone: 'kneeR', from: 0.03, to: 0.42, radius: 0.076, count: 4, flare: 0.14, cop: 0.09 },
    { use: 'clothStrip', slot: 'cloth', bone: 'loinF', w: 0.3, len: 0.6, seed: 5 },
    { use: 'clothStrip', slot: 'cloth', bone: 'loinB', w: 0.34, len: 0.66, seed: 9 },
    { use: 'ovalShield', slot: 'shieldFace', metal: 'shieldTrim', bone: 'elbowL', w: 0.84, h: 1.18, at: [0.08, -0.24, 0.24] },
  ],
  weapon: { use: 'wardenGreatsword', slots: { blade: 'blade', grip: 'grip', guard: 'guard' } },
  eyes: { color: 0xffc880, size: 0.012, spread: 0.04, at: [0, 0.15, 0.17] },
  anim: { ...IRONBOUND_ANIM,
    cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.12, k: 54, damp: 4.6, flutter: 0.04 }] },
};

// ---- the boss -----------------------------------------------------------------------------------------------------------
// New in v5.5: the `shielded` reaction (a blow taken on his guard, js/enemy.js), `critMul` (js/execution.js), spectral
// `wings`, `tail` and `tailGreat` mounted on the body (js/spectral.js). The rest are the v5.3 / v5.4 fields.
const crucibleGlint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
const CK_RING = (w, h) => ({ w, h, d: w, fwd: 0, y: h / 2, ground: true });   // a sweep all round him, low (jumpable)
// Phase 2: a greatsword finisher gains the tail sweep if the player is still close as it ends (and keeps its own branches).
const ckTail = (a, id) => ({ ...a, id, followUps: [...(a.followUps || []), { attack: 'tailSwipe', if: 'near', chance: 0.75 }] });

const CK_ATTACKS = {
  // A fast, long run with the sword drawn back level, then one piercing thrust. Sidestep it: a short opening.
  lungeThrust: { id: 'lungeThrust', name: 'Lunging Thrust', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 3.0, commit: 0.6 }, markers: crucibleGlint(0), poseScale: 1.2,
    minRange: 4, dash: { speed: 10, from: 0.35 }, chance: 0.4,
    hits: [{ startup: 0.85, active: 0.14, follow: 0.25 }], recovery: 0.75,
    damage: 34, poise: 50, knock: 8, lunge: 2.2, range: 10, box: { w: 1.2, h: 1.6, d: 3.2, fwd: 2.0, y: 1.2 } },
  // Earth Stomp: the forward leg lifted high, driven down: a cone of rock along the floor ahead (jump it). Never an
  // opening: it always flows straight into the uppercut, the overhead slam or the double spin.
  stomp: { id: 'stomp', name: 'Earth Stomp', anim: 'stomp', pose: 'enemyStomp', noParry: true, tracking: { rate: 2.2, commit: 0.6 }, poseScale: 1.2, chance: 0.5,
    hits: [{ startup: 0.65, active: 0.16, follow: 0.1, impact: { ring: 2.6, crack: 1.6, dust: 16, shake: 0.12 } }], recovery: 0.6,
    followUps: [{ attack: 'uppercut', chance: 0.34 }, { attack: 'overheadSlam', chance: 0.5 }, { attack: 'doubleSpin', chance: 1 }],
    damage: 26, poise: 40, knock: 7, lunge: 0.4, range: 4.5, box: { w: 3.0, h: 0.6, d: 5.0, fwd: 2.8, y: 0.3, ground: true } },
  // Both hands overhead, a pause, then straight down: the blade stays planted in the earth (the big opening, phase 1).
  overheadSlam: { id: 'overheadSlam', name: 'Two-Handed Overhead Slam', anim: 'chop', pose: 'heavyOverhead', tracking: { rate: 2.2, commit: 0.55 }, markers: crucibleGlint(0), poseScale: 1.3, chance: 0,
    hits: [{ startup: 0.95, active: 0.15, follow: 0.6, hold: { at: 0.6, time: [0.15, 0.4], chance: 0.6 } }], recovery: 1.5,
    damage: 44, poise: 70, knock: 9, lunge: 1.0, range: 3.6, box: { w: 1.4, h: 2.6, d: 3.4, fwd: 2.0, y: 1.2 },
    impact: { ring: 2.4, crack: 1.4, dust: 14, shake: 0.14 } },
  // The blade dragged along the earth at his left, ripped up in a rising cut. May go on into the diagonal pair.
  uppercut: { id: 'uppercut', name: 'Uppercut Slash', anim: 'sweep', pose: 'lightBackhand', tracking: { rate: 2.6, commit: 0.6 }, markers: crucibleGlint(0), poseScale: 1.3, chance: 0,
    hits: [{ startup: 0.7, active: 0.14, follow: 0.3, box: { w: 1.8, h: 3.0, d: 3.2, fwd: 1.8, y: 1.3 } }], recovery: 0.8,
    followUps: [{ attack: 'diagonalSlash', chance: 0.45 }],
    damage: 32, poise: 50, knock: 7, lunge: 1.4, range: 3.4, box: { w: 1.8, h: 3.0, d: 3.2, fwd: 1.8, y: 1.3 } },
  // Wound back to the left, two full turns: the first flows straight into the second (a trap), then a long opening.
  doubleSpin: { id: 'doubleSpin', name: 'Double Spin Slash', anim: 'spin', pose: 'crucibleDoubleSpin', tracking: { rate: 2.4, commit: 0.6 }, markers: crucibleGlint(0, 1), poseScale: 1.25, chance: 0.35,
    hits: [{ startup: 0.85, active: 0.15, follow: 0.06 }, { startup: 0.34, active: 0.15, follow: 0.3 }], recovery: 1.6,
    damage: 28, poise: 45, knock: 7, lunge: 0.8, range: 3.4, box: { w: 5.6, h: 1.8, d: 5.6, fwd: 0.2, y: 1.1 } },
  // The blade raised over his right shoulder, a short hold, snapped down right to left, then back up left to right.
  diagonalSlash: { id: 'diagonalSlash', name: 'Diagonal Slash', anim: 'sweep', pose: 'crucibleDiagonal', tracking: { rate: 2.8, commit: 0.65 }, markers: crucibleGlint(0, 1), poseScale: 1.2, chance: 0.6,
    hits: [{ startup: 0.8, active: 0.14, follow: 0.08, hold: { at: 0.7, time: [0.1, 0.3], chance: 0.5 } }, { startup: 0.4, active: 0.14, follow: 0.25 }], recovery: 0.75,
    damage: 28, poise: 45, knock: 6, lunge: 1.6, range: 3.2, box: { w: 3.0, h: 2.2, d: 3.0, fwd: 1.7, y: 1.2 } },
  // Braced behind the greatshield, a few heavy steps, the shield driven up and out. Whiff it or get round it: his back
  // is open through a long recovery. Cannot be parried.
  shieldBash: { id: 'shieldBash', name: 'Shield Bash', anim: 'bash', pose: 'enemyBash', noParry: true, tracking: { rate: 2.4, commit: 0.75 }, poseScale: 1.25, chance: 0.4,
    dash: { speed: 4.2, from: 0.15 },
    hits: [{ startup: 0.9, active: 0.14, follow: 0.35 }], recovery: 1.5,
    damage: 24, poise: 70, knock: 11, lunge: 2.0, range: 4.5, box: { w: 1.8, h: 2.0, d: 2.0, fwd: 1.5, y: 1.2 } },
  // The counter: a blow just glanced off his shield, the bash comes straight back (a reaction, js/enemy.js `shielded`).
  counterBash: { id: 'counterBash', name: 'Shield Counter', anim: 'bash', pose: 'enemyBash', noParry: true, when: 'shielded', tracking: { rate: 3.0, commit: 0.7 }, poseScale: 1.2, chance: 2.5,
    hits: [{ startup: 0.55, active: 0.14, follow: 0.3 }], recovery: 1.3,
    damage: 24, poise: 70, knock: 11, lunge: 2.4, range: 3.2, box: { w: 1.8, h: 2.0, d: 2.0, fwd: 1.5, y: 1.2 } },
  // A quick straight jab from behind the shield; barely an opening.
  jab: { id: 'jab', name: 'One-Handed Thrust', anim: 'stab', pose: 'enemyStab', tracking: { rate: 3.2, commit: 0.7 }, markers: crucibleGlint(0), poseScale: 1.15, chance: 0.7,
    hits: [{ startup: 0.55, active: 0.12, follow: 0.15 }], recovery: 0.45,
    damage: 20, poise: 30, knock: 5, lunge: 1.0, range: 3.0, box: { w: 0.9, h: 1.4, d: 2.8, fwd: 1.8, y: 1.2 } },

  // ---- phase 2: the Crucible aspects (golden, holy; none can be parried) -------------------------------------------------
  // Wings: golden wings unfold, he springs high with the sword levelled, hangs, and dives straight at you; he skids
  // on landing and takes a long while to rise and turn (the big opening). The phase's opener.
  wingsDive: { id: 'wingsDive', name: 'Aspect of the Crucible: Wings', anim: 'thrust', pose: 'enemyThrust', noParry: true, spectral: 'wings', tracking: { rate: 2.4, commit: 0.75 }, poseScale: 1.3, chance: 0.3,
    minRange: 3,
    hits: [{ startup: 1.55, active: 0.16, follow: 0.7, leap: { from: 0.2, max: 15, short: 1.4 } }], recovery: 2.0,
    damage: 54, poise: 85, knock: 11, lunge: 0, range: 15, box: { w: 1.8, h: 2.2, d: 3.6, fwd: 1.8, y: 1.0 },
    impact: { ring: 3.0, crack: 1.8, dust: 22, shake: 0.18 } },
  // Tail: a golden tail sweeps round his body; quick. If you back off or strike at once, the great tail follows.
  tailSwipe: { id: 'tailSwipe', name: 'Aspect of the Crucible: Tail', anim: 'spin', pose: 'enemySpin', noParry: true, spectral: 'tail', tracking: { rate: 2.0, commit: 0.5 }, poseScale: 1.2, chance: 0,
    hits: [{ startup: 0.45, active: 0.14, follow: 0.2 }], recovery: 0.6,
    followUps: [{ attack: 'tailDouble', if: 'far', chance: 0.75 }, { attack: 'tailDouble', chance: 0.35 }],
    damage: 32, poise: 50, knock: 9, lunge: 0, range: 3.4, box: CK_RING(6.0, 1.0) },
  // The great tail: about two and a half times the reach, still low enough to jump. He is locked as it fades: a big opening.
  tailDouble: { id: 'tailDouble', name: 'Aspect of the Crucible: Great Tail', anim: 'spin', pose: 'enemySpin', noParry: true, spectral: 'tailGreat', tracking: { rate: 2.0, commit: 0.5 }, poseScale: 1.3, chance: 0,
    hits: [{ startup: 0.6, active: 0.16, follow: 0.4 }], recovery: 1.8,
    damage: 42, poise: 65, knock: 11, lunge: 0, range: 8, box: CK_RING(14.0, 1.0) },
};
// Drinking or using an item at range: the lunging thrust comes at once (a reaction).
CK_ATTACKS.healThrust = { ...CK_ATTACKS.lungeThrust, id: 'healThrust', when: 'healing', minRange: 3, range: 12, chance: 3 };

const CRUCIBLE_KNIGHT = {
  id: 'crucibleKnight', model: 'crucibleKnight', name: 'Crucible Knight',
  description: 'A knight of the old Crucible in golden-bronze plate, behind a great shield. Blows to his front glance off it; at half health the primal aspects wake: wings and a golden tail.',
  scale: 1.55, bulk: 1.2, radius: 0.66, color: 0x9a6a3a, weapon: 'sword', offhand: 'kite', idle: 'still',
  visual: { skin: 0x9a6a3a, skinMetal: 0.4, metal: 0.55, roughness: 0.45, rim: 0.9 },
  hp: 2600, poise: 220, speed: 2.5, turnRate: 3.2, trackRate: 1.7, approach: 0.55, kite: 0.1,
  cooldown: [1.0, 1.9], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0, deathFade: 6, critMul: 0.7,
  posture: { max: 115, parry: 115, chainGap: 1.8, chainMul: 1.3, decay: 4.5, breakTime: 3.2, hitstop: 0.2 },
  // The greatshield, as the Shield Warden's: frontal blows while he is not attacking are blocked (0.3 of the damage) and
  // fill the guard meter (a heavy far more); flank him or punish his recoveries.
  guard: { arc: 0.95, damageMul: 0.3, knockMul: 0.25, lowerReach: 1.0, blockedMul: 0.5, breakers: ['heavy'],
           max: 100, heavy: 30, light: 8, decayDelay: 2.5, decay: 8, breakTime: 3.2, hitstop: 0.18 },
  defaultPhases: ['knight', 'aspect'],
  phases: {
    // Phase 1: sword and shield.
    knight: { hp: 2600,
      attacks: ['lungeThrust', 'healThrust', 'stomp', 'overheadSlam', 'uppercut', 'doubleSpin', 'diagonalSlash', 'shieldBash', 'counterBash', 'jab'] },
    // Phase 2 (at 50 %): the aspects; the finishers gain the tail; he presses harder. Opens with the Wings dive.
    aspect: { at: 0.5, opener: 'wingsDive', cooldown: [0.8, 1.6], approach: 0.7, kite: 0.05, speed: 2.7, trackRate: 1.9,
      attacks: ['lungeThrust2', 'healThrust2', 'stomp2', 'overheadSlam2', 'uppercut', 'doubleSpin2', 'diagonalSlash2', 'shieldBash', 'counterBash', 'jab',
                'wingsDive', 'tailSwipe', 'tailDouble'] },
  },
  attacks: [
    ...Object.values(CK_ATTACKS),
    ckTail(CK_ATTACKS.lungeThrust, 'lungeThrust2'), ckTail(CK_ATTACKS.healThrust, 'healThrust2'),
    ckTail(CK_ATTACKS.overheadSlam, 'overheadSlam2'), ckTail(CK_ATTACKS.doubleSpin, 'doubleSpin2'), ckTail(CK_ATTACKS.diagonalSlash, 'diagonalSlash2'),
    // The phase 2 stomp chains into the tail-ended finishers.
    { ...CK_ATTACKS.stomp, id: 'stomp2', followUps: [{ attack: 'uppercut', chance: 0.34 }, { attack: 'overheadSlam2', chance: 0.5 }, { attack: 'doubleSpin2', chance: 1 }] },
  ],
};
