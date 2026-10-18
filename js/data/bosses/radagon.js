'use strict';
// ============================================================================
// Elden Ring Bosses: Radagon of the Golden Order (v5.7)
// ============================================================================
// Everything that makes Radagon lives here: his key poses, his model and his moveset. The boss list (js/data/elden-bosses.js)
// names him; the mode (js/elden.js) fights him in the Enemies arena. Reference: docs/radagon.txt. His holy light (teleport
// flashes, floor runes, pillars) is drawn by js/holy.js; the teleport itself is a hit's `blink` (js/enemy.js).
//
// Conversion (all tuning is in RADAGON below). The player has 120 HP, a light hit does 18, a heavy 53, a roll is
// invulnerable for 0.3 s. Elden Ring's bosses come down to this game's scale against each other, not by a fixed factor:
// Margit (ER 4174 HP) is 3200 here, Godrick (ER 6080) 4000, Morgott (ER 10399) 4800. Radagon (ER 13347) is the last and
// hardest, so:
//   - one bar of 5200 HP (~1.1x Morgott: ~100 light hits); at 60 % (3120 HP left) the second phase starts on the same bar
//     (`at`) with the Gold Breaker, and he adds the Elden Shattering, the spear detonation and more teleports;
//   - posture 150, a parry adds 50: three parries break his stance (the reference's "3 parries"); ER stance 120 -> 150
//     like Godrick's 105 -> 150 scale-up for a long fight;
//   - damage a step above Morgott (endgame): hammer 30-50, holy spears 36-40, teleport flashes 24, runes and pillars 40-48,
//     Gold Breaker 66, the Shattering's last slam 64, the Golden Grab 70 (roll only). Ratios kept from the reference: the
//     grab and the leaps hit hardest, the flashes and spear volleys lightest;
//   - the hammer's swings can be parried (they glint); spears, shockwaves, runes, teleports, the grab and the Gold Breaker
//     cannot (`noParry` / projectiles / `rollOnly`); every strike's `active` stays at or under 0.2 s (a roll clears it).
// Readable: every big blow has a long wind-up; the runes glow where they will erupt before they do.

// ---- key poses (js/data/attack-poses.js format), built from the shared ones ----------------------------------------------
{
  const A = ATTACK_POSES, h = id => A[id].hits[0];
  ATTACK_POSES.radagonCombo = { hits: [h('hollowSwing'), h('lightBackhand'), h('heavyOverhead')] };
  ATTACK_POSES.radagonTwo = { hits: [h('hollowSwing'), h('lightBackhand')] };
  ATTACK_POSES.radagonStompChop = { hits: [h('enemyStomp'), h('hollowOverhead')] };
  ATTACK_POSES.radagonRuneSlam = { hits: [h('heavyOverhead'), h('enemyStomp')] };
  ATTACK_POSES.radagonBlink = { hits: [h('enemyStomp'), h('enemyStomp'), h('hollowSwing')] };
  ATTACK_POSES.radagonBlinkAway = { hits: [h('enemyStomp'), h('enemyStomp')] };
  ATTACK_POSES.radagonBlinkSlam = { hits: [h('enemyStomp'), h('heavyOverhead')] };
  ATTACK_POSES.radagonVolley = { hits: [h('lightOverhead'), h('lightOverhead')] };
  ATTACK_POSES.radagonBreaker = { hits: [h('heavyOverhead'), h('enemyStomp')] };
  ATTACK_POSES.radagonShatter = { hits: [h('heavyOverhead'), h('heavyOverhead'), h('heavyOverhead'), h('enemyStomp')] };
  ATTACK_POSES.radagonSpearThrust = { hits: [h('enemyThrust'), h('enemyStomp')] };
}

// ---- model: tall and lean, grey stone-cracked skin, long red hair, the Elden Ring burning gold on his chest, a dark ragged
// skirt from the hips to the feet, gold on the hammer arm and belt, Marika's stone hammer flecked with golden light.
MODEL_DEFS.radagon = {
  faction: 'goldenOrder', budget: 'boss', fit: 1.0, limbSides: 8,
  proportions: { shoulderX: 0.38, torsoW: 0.25, torsoD: 0.18, armR: 0.07, legR: 0.085, headR: 0.115, handR: 0.07, footLen: 0.32 },
  limbs: { armR: { len: 1.06, thick: 1.05 }, armL: { len: 1.06 } },
  posture: { chest: [0.06, 0, 0], neck: [0.04, 0, 0], head: [-0.05, 0, 0], elbowL: [-0.25, 0, 0], elbowR: [-0.3, 0, 0] },   // upright, regal
  materials: {
    skin: { tex: 'margitSkin', tint: 0xdcd6ce, decay: 0.6, size: 512 },
    skirt: { tex: 'margitRags', tint: 0x484846, decay: 0.85, size: 512, double: true },
    skirtDark: { tex: 'margitRags', tint: 0x2c2c2c, decay: 0.9, size: 512, double: true },
    hair: { tex: 'rottenCloth', tint: 0xd04a22, decay: 0.2, double: true },
    gold: { tex: 'dentedSteel', tint: 0xd8b05a, decay: 0.3 },
    stone: { tex: 'gargoyleStone', tint: 0x8a8278, decay: 0.7 },
    rune: { glow: 0xffc850 },
    eye: { glow: 0xffd890 },
  },
  body: { torso: null, pelvis: 'skirt', arms: 'skin', legs: 'skirt', head: 'skin', neck: 'skin', hands: 'skin', feet: 'skin' },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.04, 0.2] }, loinB: { parent: 'spin', at: [0, -0.04, -0.2] },
    loinL: { parent: 'spin', at: [0.2, -0.04, 0.02] }, loinR: { parent: 'spin', at: [-0.2, -0.04, 0.02] },
    hemF: { parent: 'loinF', at: [0, -0.55, 0.02] }, hemB: { parent: 'loinB', at: [0, -0.55, -0.02] },
    hairB: { parent: 'head', at: [0, 0.12, -0.08] }, hairL: { parent: 'head', at: [0.12, 0.08, -0.05] }, hairR: { parent: 'head', at: [-0.12, 0.08, -0.05] },
  },
  parts: [
    { use: 'muscleTorso', slot: 'skin', bone: 'chest', bulk: 1.0 },   // v6.0: a sculpted bare torso (js/kit-premium.js)
    // A long skirt of dark rags knotted at the hips, falling to the feet.
    { use: 'robeSkirt', slot: 'skirt', bone: 'spin', len: 1.05, top: 0.24, hem: 0.44, seed: 11 },
    { use: 'robeSkirt', slot: 'skirtDark', bone: 'spin', len: 0.5, top: 0.27, hem: 0.36, seed: 13 },
    { use: 'ropeSash', slot: 'skirtDark', bone: 'spin', y: 0.04 },
    { use: 'clothStrip', slot: 'skirt', bone: 'loinF', w: 0.4, len: 0.6, seed: 2 }, { use: 'clothStrip', slot: 'skirtDark', bone: 'hemF', w: 0.38, len: 0.45, seed: 3 },
    { use: 'clothStrip', slot: 'skirt', bone: 'loinB', w: 0.42, len: 0.6, seed: 8 }, { use: 'clothStrip', slot: 'skirtDark', bone: 'hemB', w: 0.4, len: 0.48, seed: 9 },
    { use: 'clothStrip', slot: 'skirtDark', bone: 'loinL', w: 0.26, len: 1.0, seed: 14, turn: Math.PI / 2 }, { use: 'clothStrip', slot: 'skirtDark', bone: 'loinR', w: 0.26, len: 1.0, seed: 15, turn: Math.PI / 2 },
    // The Elden Ring burning on his chest; gold on the hammer arm.
    { use: 'eldenRune', slot: 'rune', bone: 'chest', at: [0.05, 0.4, 0.2], size: 1.2 },
    { use: 'wraps', slot: 'gold', bone: 'elbowR', from: 0.04, to: 0.26, radius: 0.08, count: 3 },
    // Long red hair, falling over the shoulders.
    { use: 'sweptHair', slot: 'hair', bone: 'head', size: 1.1 },
    { use: 'clothStrip', slot: 'hair', bone: 'hairB', w: 0.26, len: 0.75, seed: 21 },
    { use: 'clothStrip', slot: 'hair', bone: 'hairL', w: 0.1, len: 0.6, seed: 22, turn: Math.PI / 2 }, { use: 'clothStrip', slot: 'hair', bone: 'hairR', w: 0.1, len: 0.6, seed: 23, turn: Math.PI / 2 },
  ],
  weapon: { use: 'marikaHammer', slots: { blade: 'stone', grip: 'stone', guard: 'gold' } },
  embers: { head: [0, 0, 1.38], edge: { size: [0.06, 0.06, 1.3], at: [0, 0, 0.6] } },   // golden light seeping out of the haft and head
  eyes: { color: 0xffd890, size: 0.014, spread: 0.06, at: [0, 0.1, 0.13] },
  anim: {
    idle: { breathRate: 0.8, breath: 0.018, headDrift: 0.04, sway: 0.015, twitch: 0 }, walk: { twist: 0.1, roll: 0.03, headNod: 0.03, elbow: 0.2, drag: 0.1 },
    flinch: { head: 0.25, chest: 0.25, arms: 0.3 }, death: { buckle: 1.0, slump: 1 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5, flutter: 0.04 }, { bone: 'loinB', gain: 0.12, k: 52, damp: 4.6, flutter: 0.05 },
            { bone: 'hemF', gain: 0.1, k: 44, damp: 4, flutter: 0.06 }, { bone: 'hemB', gain: 0.12, k: 40, damp: 3.8, flutter: 0.07 },
            { bone: 'loinL', gain: 0.1, k: 50, damp: 4.5, flutter: 0.06, sideways: 1.2 }, { bone: 'loinR', gain: 0.1, k: 50, damp: 4.5, flutter: 0.06, sideways: 1.2 },
            { bone: 'hairB', gain: 0.1, k: 50, damp: 4.2, flutter: 0.05 }, { bone: 'hairL', gain: 0.08, k: 55, damp: 4.5, flutter: 0.04 }, { bone: 'hairR', gain: 0.08, k: 55, damp: 4.5, flutter: 0.04 }],
  },
};

// ---- the boss -----------------------------------------------------------------------------------------------------------
// New fields (v5.7, js/enemy.js): a hit's `blink: { from, dist | back, time? }` (a teleport: unseen and untouchable while it
// rushes to `dist` m before the player or `back` m away) and `sigil` (radius of a golden rune drawn where the hit lands).
const radagonGlint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
const RADAGON_RING = (from, to, width) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ring: { from, to, width, time: 0.18 } });
const RADAGON_FLASH = { w: 1, h: 2.4, d: 1, fwd: 0, y: 1.2, ring: { from: 0, to: 2.4, width: 2.4, time: 0.12 } };   // a teleport's burst
const RADAGON_P1 = ['hammerCombo', 'hammerTwo', 'stompChop', 'runeSlam', 'lightningSpear', 'goldenGrab', 'teleportStrike',
                    'teleportAway', 'runeBurst', 'spearVolley', 'spearPunish', 'blinkPunish'];
const RADAGON = {
  id: 'radagon', model: 'radagon', name: 'Radagon of the Golden Order',
  description: 'The Golden Order made flesh: Marika\'s hammer, spears of holy lightning, golden runes that erupt from the floor, and teleports that strike as he leaves and arrives.',
  scale: 2.0, bulk: 1.05, radius: 0.72, color: 0x8a8278, weapon: 'spear', idle: 'sway',
  visual: { skin: 0xa8a29a, roughness: 0.8, rim: 1.0 },
  hp: 5200, poise: 270, speed: 2.8, turnRate: 3.4, trackRate: 1.8, approach: 0.55, kite: 0.15,
  cooldown: [1.0, 2.0], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 6,
  posture: { max: 150, parry: 50, chainGap: 1.8, chainMul: 1.35, decay: 4, breakTime: 3.2, hitstop: 0.2 },
  defaultPhases: ['order', 'shattering'],
  phases: {
    // Phase 1: the hammer, the holy spears, the grab, the rune slam and the teleports.
    order: { hp: 5200, attacks: RADAGON_P1 },
    // Phase 2 (at 60 %): opens with the Gold Breaker; adds the Elden Shattering, the spear detonation and a teleport slam;
    // he attacks sooner and closes in harder.
    shattering: { at: 0.6, opener: 'goldBreaker', cooldown: [0.7, 1.5], approach: 0.75, kite: 0.05, speed: 3.0, trackRate: 2.1,
      attacks: [...RADAGON_P1, 'goldBreaker', 'eldenShattering', 'spearThrust', 'teleportSlam'] },
  },
  attacks: [
    // ---- Marika's Hammer (parryable) -----------------------------------------------------------------------------------
    // Right-to-left sweep, backswing, overhead slam; the slam's spot may then erupt (runeBurst). Opening after the slam.
    { id: 'hammerCombo', name: 'Hammer Combo', anim: 'sweep', pose: 'radagonCombo', tracking: { rate: 2.8, commit: 0.65 }, markers: radagonGlint(0, 1, 2), poseScale: 1.3,
      hits: [{ startup: 0.85, active: 0.14, follow: 0.1 }, { startup: 0.5, active: 0.14, follow: 0.1 },
             { startup: 0.75, active: 0.15, follow: 0.4, box: { w: 1.8, h: 3.0, d: 3.8, fwd: 2.0, y: 1.2 }, impact: { ring: 2.6, crack: 1.4, dust: 14, shake: 0.12 } }],
      recovery: 1.0, followUps: [{ attack: 'runeBurst', chance: 0.4 }],
      damage: 34, poise: 55, knock: 7, lunge: 2.0, range: 3.6, box: { w: 4.4, h: 1.8, d: 3.6, fwd: 1.7, y: 1.1 } },
    // The short form: two sweeps.
    { id: 'hammerTwo', name: 'Hammer Swings', anim: 'sweep', pose: 'radagonTwo', tracking: { rate: 3.0, commit: 0.65 }, markers: radagonGlint(0, 1), poseScale: 1.25,
      hits: [{ startup: 0.8, active: 0.14, follow: 0.1 }, { startup: 0.5, active: 0.14, follow: 0.3 }], recovery: 0.9,
      damage: 30, poise: 50, knock: 6, lunge: 2.0, range: 3.5, box: { w: 4.4, h: 1.8, d: 3.6, fwd: 1.7, y: 1.1 } },
    // A quick stomp kicking up rocks, then a fast overhead chop (the chop glints).
    { id: 'stompChop', name: 'Foot Stomp, Overhead Chop', anim: 'chop', pose: 'radagonStompChop', tracking: { rate: 3.2, commit: 0.7 }, markers: radagonGlint(1), poseScale: 1.2,
      hits: [{ startup: 0.45, active: 0.12, follow: 0.05, box: { w: 2.6, h: 0.6, d: 2.4, fwd: 0.9, y: 0.3 }, impact: { ring: 1.6, crack: 0.8, dust: 12, shake: 0.06 } },
             { startup: 0.55, active: 0.14, follow: 0.35, box: { w: 1.6, h: 3.0, d: 3.6, fwd: 2.0, y: 1.2 }, impact: { ring: 2.2, crack: 1.2, dust: 10, shake: 0.1 } }],
      recovery: 0.9, damage: 32, poise: 50, knock: 6, lunge: 1.6, range: 3.2, box: { w: 1.6, h: 3.0, d: 3.6, fwd: 2.0, y: 1.2 } },
    // ---- holy (not parryable, blockable) ---------------------------------------------------------------------------------
    // Raised in both hands, a long pause, a slam that etches a rune; 1.5 s later it erupts. Behind his hips is safe.
    { id: 'runeSlam', name: 'Rune Shockwave Slam', anim: 'chop', pose: 'radagonRuneSlam', noParry: true, tracking: { rate: 2.2, commit: 0.5 }, poseScale: 1.4, chance: 0.4,
      hits: [{ startup: 1.5, active: 0.15, follow: 0.1, hold: { at: 0.6, time: [0.3, 0.7], chance: 0.6 }, box: { w: 2.0, h: 3.0, d: 3.6, fwd: 2.0, y: 1.2 },
               impact: { ring: 3.0, crack: 1.8, dust: 18, shake: 0.15 } },
             { startup: 1.5, active: 0.18, follow: 0.4, sigil: 3.2, box: { w: 6.0, h: 4.0, d: 6.0, fwd: 2.4, y: 1.5 }, impact: { ring: 3.4, crack: 1.0, dust: 10, shake: 0.12 } }],
      recovery: 1.4, followUps: [{ attack: 'teleportAway', chance: 0.35 }],
      damage: 46, poise: 75, knock: 9, lunge: 0.8, range: 3.6, box: { w: 2.0, h: 3.0, d: 3.6, fwd: 2.0, y: 1.2 } },
    // The combo's branch: the slam's spot glows, then erupts.
    { id: 'runeBurst', name: 'Rune Detonation', anim: 'stomp', pose: 'enemyStomp', noParry: true, tracking: { rate: 0.5, commit: 0.1 }, chance: 0,
      hits: [{ startup: 1.4, active: 0.18, follow: 0.4, sigil: 2.8, box: { w: 5.0, h: 4.0, d: 5.0, fwd: 2.2, y: 1.5 }, impact: { ring: 3.0, crack: 0.8, dust: 8, shake: 0.1 } }],
      recovery: 0.9, damage: 40, poise: 50, knock: 8, lunge: 0, range: 4, box: { w: 5.0, h: 4.0, d: 5.0, fwd: 2.2, y: 1.5 } },
    // Golden Lightning Spear: hurled at range; far away two quick ones follow.
    { id: 'lightningSpear', name: 'Golden Lightning Spear', anim: 'overhead', pose: 'heavyOverhead', spectral: 'sword', tracking: { rate: 3.0, commit: 0.85 }, poseScale: 1.2, minRange: 7, chance: 0.45,
      projectile: { speed: 30, gravity: 0, size: 0.32, look: 'dagger' },
      hits: [{ startup: 1.0, active: 0.05, follow: 0.15 }], recovery: 0.7, followUps: [{ attack: 'spearVolley', if: 'far', chance: 0.5 }],
      damage: 40, poise: 50, knock: 7, lunge: 0, range: 26, box: { w: 0.6, h: 0.6, d: 0.6, fwd: 0.6, y: 1.7 } },
    { id: 'spearVolley', name: 'Lightning Spear Volley', anim: 'overhead', pose: 'radagonVolley', spectral: 'sword', tracking: { rate: 3.4, commit: 0.9 }, chance: 0,
      projectile: { speed: 32, gravity: 0, size: 0.28, look: 'dagger' },
      hits: [{ startup: 0.45, active: 0.05, follow: 0.1 }, { startup: 0.4, active: 0.05, follow: 0.2 }], recovery: 0.8,
      damage: 36, poise: 40, knock: 6, lunge: 0, range: 26, box: { w: 0.6, h: 0.6, d: 0.6, fwd: 0.6, y: 1.7 } },
    // Drinking at range: an instant spear (the reference's input read) or a teleport slam.
    { id: 'spearPunish', name: 'Lightning Spear', anim: 'overhead', pose: 'lightOverhead', spectral: 'sword', when: 'healing', tracking: { rate: 3.4, commit: 0.85 }, minRange: 5, chance: 1.6,
      projectile: { speed: 32, gravity: 0, size: 0.3, look: 'dagger' },
      hits: [{ startup: 0.55, active: 0.05, follow: 0.12 }], recovery: 0.5,
      damage: 38, poise: 40, knock: 6, lunge: 0, range: 26, box: { w: 0.6, h: 0.6, d: 0.6, fwd: 0.6, y: 1.7 } },
    { id: 'blinkPunish', name: 'Teleport Slam', anim: 'chop', pose: 'radagonBlinkSlam', noParry: true, when: 'healing', tracking: { rate: 3.0, commit: 0.6 }, poseScale: 1.3, minRange: 5, chance: 1.0,
      hits: [{ startup: 0.5, active: 0.12, follow: 0.05, blink: { from: 0.3, dist: 2.4 }, box: RADAGON_FLASH },
             { startup: 0.6, active: 0.15, follow: 0.4, box: { w: 1.8, h: 3.0, d: 3.8, fwd: 2.0, y: 1.2 }, impact: { ring: 2.6, crack: 1.4, dust: 14, shake: 0.12 } }],
      recovery: 1.1, damage: 42, poise: 60, knock: 8, lunge: 0, range: 26, box: { w: 1.8, h: 3.0, d: 3.8, fwd: 2.0, y: 1.2 } },
    // Golden Grab: the left hand ignites, a tracking charge; caught, a heavy blow. Roll sideways and he whiffs into the
    // ground (a major opening). Not a true grab: a roll-only strike, like Godrick's Dragon Grab.
    { id: 'goldenGrab', name: 'Golden Grab', anim: 'thrust', pose: 'enemyThrust', noParry: true, rollOnly: true, tracking: { rate: 3.0, commit: 0.75 }, poseScale: 1.2,
      minRange: 3, dash: { speed: 11, from: 0.5 }, chance: 0.3,
      hits: [{ startup: 1.2, active: 0.16, follow: 0.6, impact: { ring: 2.0, crack: 1.0, dust: 12, shake: 0.12 } }], recovery: 2.0,
      damage: 70, poise: 100, knock: 12, lunge: 2.0, range: 10, box: { w: 1.6, h: 2.2, d: 3.0, fwd: 1.8, y: 1.1 } },
    // ---- teleports: the departure bursts, he reappears before the player and sweeps at once ------------------------------
    { id: 'teleportStrike', name: 'Teleport Reappearance Strike', anim: 'sweep', pose: 'radagonBlink', noParry: true, tracking: { rate: 3.2, commit: 0.8 }, poseScale: 1.2, minRange: 5, chance: 0.35,
      hits: [{ startup: 0.55, active: 0.12, follow: 0.05, box: RADAGON_FLASH },
             { startup: 0.3, active: 0.12, follow: 0.05, blink: { from: 0, dist: 2.4 }, box: RADAGON_FLASH },
             { startup: 0.45, active: 0.14, follow: 0.35 }],
      recovery: 1.0, damage: 24, poise: 40, knock: 6, lunge: 1.4, range: 20, box: { w: 4.4, h: 1.8, d: 3.6, fwd: 1.7, y: 1.1 } },
    // Too close (or after the rune slam): bursts and reappears far away; far, a spear may follow.
    { id: 'teleportAway', name: 'Spatial Shift', anim: 'stomp', pose: 'radagonBlinkAway', noParry: true, tracking: { rate: 3, commit: 0.6 }, chance: 0.2,
      hits: [{ startup: 0.5, active: 0.12, follow: 0.05, box: RADAGON_FLASH },
             { startup: 0.3, active: 0.12, follow: 0.2, blink: { from: 0, back: 8 }, box: RADAGON_FLASH }],
      recovery: 0.4, followUps: [{ attack: 'lightningSpear', if: 'far', chance: 0.6 }],
      damage: 24, poise: 40, knock: 6, lunge: 0, range: 2.8, box: RADAGON_FLASH },
    // ---- phase 2 -----------------------------------------------------------------------------------------------------------
    // Gold Breaker: a high leap, a long hang in the air, the hammer driven down; a wide holy shockwave. He stays down after.
    { id: 'goldBreaker', name: 'Gold Breaker', anim: 'chop', pose: 'radagonBreaker', noParry: true, tracking: { rate: 2.4, commit: 0.5 }, poseScale: 1.45, chance: 0.3,
      hits: [{ startup: 2.0, active: 0.16, follow: 0.2, leap: { from: 0.35, max: 14, short: 0.6 }, sigil: 4, impact: { ring: 6.0, crack: 3.0, dust: 30, shake: 0.25 } },
             { startup: 0.08, active: 0.18, follow: 1.2, box: RADAGON_RING(1.5, 9, 1.8) }],
      recovery: 1.6, damage: 66, poise: 100, knock: 12, lunge: 0, range: 14, box: { w: 4.6, h: 2.6, d: 4.6, fwd: 0.8, y: 1.0 } },
    // Elden Shattering: a narrow line of shockwaves, a wide half-circle, then a leap and a blast all round him. The pauses
    // between are traps; the opening comes after the third. The first two run along the floor (a jump clears them).
    { id: 'eldenShattering', name: 'Elden Shattering', anim: 'chop', pose: 'radagonShatter', noParry: true, tracking: { rate: 2.4, commit: 0.55 }, poseScale: 1.35, chance: 0.25,
      hits: [{ startup: 1.2, active: 0.15, follow: 0.15, box: { w: 2.2, h: 0.6, d: 9, fwd: 4.5, y: 0.3 }, impact: { ring: 2.6, crack: 2.4, dust: 16, shake: 0.14 } },
             { startup: 1.1, active: 0.16, follow: 0.15, box: { w: 12, h: 0.6, d: 6.5, fwd: 2.8, y: 0.3 }, impact: { ring: 3.4, crack: 2.4, dust: 18, shake: 0.16 } },
             { startup: 1.5, active: 0.16, follow: 0.1, leap: { from: 0.3, max: 3, short: 2.0 }, sigil: 4, impact: { ring: 6.0, crack: 3.2, dust: 30, shake: 0.25 } },
             { startup: 0.06, active: 0.18, follow: 1.0, box: RADAGON_RING(0, 12, 3) }],
      recovery: 2.0, damage: 48, poise: 80, knock: 10, lunge: 0, range: 7, box: { w: 3.0, h: 2.6, d: 3.4, fwd: 1.4, y: 1.1 } },
    // A conjured golden spear driven into the ground; a second later its line bursts. His rear flank is safe.
    { id: 'spearThrust', name: 'Spear Thrust, Detonation', anim: 'thrust', pose: 'radagonSpearThrust', spectral: 'sword', noParry: true, tracking: { rate: 2.8, commit: 0.65 }, poseScale: 1.2, chance: 0.35,
      hits: [{ startup: 0.9, active: 0.14, follow: 0.1, box: { w: 1.2, h: 1.8, d: 4.2, fwd: 2.4, y: 1.0 } },
             { startup: 1.0, active: 0.18, follow: 0.4, sigil: 2.4, box: { w: 3.0, h: 4.0, d: 6.0, fwd: 3.4, y: 1.5 }, impact: { ring: 2.8, crack: 1.2, dust: 10, shake: 0.12 } }],
      recovery: 1.2, damage: 40, poise: 60, knock: 8, lunge: 1.6, range: 4.2, box: { w: 1.2, h: 1.8, d: 4.2, fwd: 2.4, y: 1.0 } },
    // An offensive teleport into an overhead slam (the hammer glints: parryable).
    { id: 'teleportSlam', name: 'Teleport Slam', anim: 'chop', pose: 'radagonBlinkSlam', tracking: { rate: 3.0, commit: 0.6 }, markers: radagonGlint(1), poseScale: 1.3, minRange: 6, chance: 0.35,
      hits: [{ startup: 0.5, active: 0.12, follow: 0.05, blink: { from: 0.3, dist: 2.4 }, box: RADAGON_FLASH },
             { startup: 0.65, active: 0.15, follow: 0.4, box: { w: 1.8, h: 3.0, d: 3.8, fwd: 2.0, y: 1.2 }, impact: { ring: 2.6, crack: 1.4, dust: 14, shake: 0.12 } }],
      recovery: 1.1, damage: 44, poise: 60, knock: 8, lunge: 0, range: 20, box: { w: 1.8, h: 3.0, d: 3.8, fwd: 2.0, y: 1.2 } },
  ],
};
