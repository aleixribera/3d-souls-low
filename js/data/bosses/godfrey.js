'use strict';
// ============================================================================
// Elden Ring Bosses: Godfrey, First Elden Lord / Hoarah Loux, Warrior (v5.5)
// ============================================================================
// Everything that makes Godfrey lives here: his key poses, his model and his moveset. The boss list (js/data/elden-bosses.js)
// names him; the mode (js/elden.js) fights him in the Enemies arena. Reference: docs/godfrey.txt.
//
// Conversion to this game's scale (not Elden Ring's numbers). The player has 120 HP, a light hit does 18 and a heavy 53,
// a roll is invulnerable for 0.3 s. Margit 3200 HP, Godrick 4000. In Elden Ring Godfrey (21903, Leyndell Ash) is a late
// boss far above both; at 18 a hit a straight ratio would be a slog of several hundred hits, so he sits a step above Godrick:
//   - one bar of 4400 HP, four phases on it (`at`): `lord` (the axe), `regal` from 78 % (after the Regal Roar every stomp
//     is a ring round him), `loux` from 40 % (the reference's threshold: he casts off Serosh, the armour and the axe and
//     fights bare-handed, "Hoarah Loux, Warrior" on the bar), `rage` from 20 % (Hoarah Loux's Rage: his stomps go wide);
//   - stance 120 -> posture 165 (Godrick 105 -> 150); nothing can be parried (`noParry` on every attack), only blocked
//     or rolled; the grabs (Power Bomb, Loux's Lunge) are `rollOnly`: unblockable, as in the reference;
//   - axe blows 26-34, leaps and the axe dive 58-62, the grabs 56-64, stomps and shockwaves 28-38 (along the floor:
//     `ground`, so a jump clears them), claws 18; every strike's active time stays at or under 0.2 s (a test checks);
//   - the phase change (`seroshShed`) is untouchable through its wind-up and strike (`invulnerable`) and only shoves
//     someone right beside him; the axe, armour and lion vanish as it lands (the phase's `conceal`, js/flame.js).
// Punish windows kept from the reference: the axe dive, the Regal Roar, the fissure (flanks), the triple combo, the
// Power Bomb, the Lunge and the Earthshaker leave long recoveries; the hoist, the flurry and the double stomp short ones;
// the plain stomp has none (it branches straight into an axe swing).

// ---- key poses (js/data/attack-poses.js format), built from the shared ones ----------------------------------------------
{
  const A = ATTACK_POSES, h = id => A[id].hits[0];
  ATTACK_POSES.godfreyTriple = { hits: [h('hollowSwing'), h('lightBackhand'), h('heavyOverhead')] };
  ATTACK_POSES.godfreySmashSpin = { hits: [h('heavyOverhead'), h('enemySpin'), h('heavyOverhead')] };
  ATTACK_POSES.godfreyFissure = { hits: [h('heavyOverhead'), h('enemyBash')] };
  ATTACK_POSES.godfreyDive = { hits: [h('heavyOverhead'), h('enemyStomp')] };
  ATTACK_POSES.godfreyStomp2 = { hits: [h('enemyStomp'), h('heavyOverhead')] };
  ATTACK_POSES.louxShake = { hits: [h('enemyBash'), h('heavyOverhead'), h('enemyStomp')] };
  ATTACK_POSES.louxFlurry = { hits: [A.clawRake.hits[0], A.clawRake.hits[1], A.clawRake.hits[0], A.clawRake.hits[1], h('lightOverhead')] };
}

// ---- model (from the reference art): a towering old warlord in ornate silver-gilt plate and mail, a dark blue cape, a
// brown sash, a gold circlet over a white mane and long forked beard; the ghostly lion Serosh on his back; a huge single-
// bitted axe. In the second phase the lion, the armour and the axe are gone (the phase's `conceal`): a bare-chested giant.
MODEL_DEFS.godfrey = {
  faction: 'lord', budget: 'boss', fit: 1.02, limbSides: 8,
  proportions: { shoulderX: 0.46, torsoW: 0.31, torsoD: 0.22, armR: 0.09, legR: 0.105, headR: 0.12, handR: 0.08, footLen: 0.34 },
  limbs: { armR: { len: 1.02, thick: 1.15 }, armL: { len: 1.02, thick: 1.15 }, legL: { thick: 1.12 }, legR: { thick: 1.12 } },
  posture: { chest: [-0.04, 0, 0], head: [-0.04, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },   // upright, a lord
  materials: {
    skin: { tex: 'paleSkin', tint: 0xc49a78, decay: 0.8 },
    armour: { tex: 'dentedSteel', tint: 0xb4aa98, decay: 0.45, size: 512 },
    gold: { tex: 'dentedSteel', tint: 0xc8a050, decay: 0.3, size: 512 },
    mail: { tex: 'dentedSteel', tint: 0x8a8478, decay: 0.7 },
    cape: { tex: 'rottenCloth', tint: 0x26304e, decay: 0.55, size: 512, double: true },
    sash: { tex: 'tatteredFabric', tint: 0x7a5a40, decay: 0.7, double: true },
    rag: { tex: 'tatteredFabric', tint: 0x8a3a30, decay: 0.7, double: true },
    hair: { tex: 'rottenCloth', tint: 0xe8e0d0, decay: 0.2, double: true },
    lion: { tex: 'margitFur', tint: 0xb8a878, decay: 0.3, double: true },
    blade: { tex: 'dentedSteel', tint: 0xc0b498, decay: 0.4, size: 512 },
    haft: { tex: 'rustedIron', tint: 0x6a4a30, decay: 0.5 },
    eye: { glow: 0xffe0a0 },
  },
  body: { torso: null, pelvis: 'sash', arms: 'skin', legs: 'skin', head: 'skin', neck: 'skin', hands: 'skin', feet: 'armour' },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.22] }, loinB: { parent: 'spin', at: [0, -0.02, -0.22] },
    beard: { parent: 'head', at: [0, 0.0, 0.12] }, mane: { parent: 'head', at: [0, 0, 0] },
    lion: { parent: 'chest', at: [0.18, 0.95, -0.4] }, lionMane: { parent: 'chest', at: [0.1, 0.7, -0.36] },
    capeA: { parent: 'chest', at: [0, 0.6, -0.27] }, capeB: { parent: 'capeA', at: [0, -0.46, 0] }, capeC: { parent: 'capeB', at: [0, -0.46, 0] },
  },
  parts: [
    { use: 'muscleTorso', slot: 'skin', bone: 'chest', bulk: 1.15 },   // v6.0: a sculpted bare torso (js/kit-premium.js)
    // Armour (phase 1 only): breastplate, big rounded pauldrons, bracers, tassets and mail skirt, greaves.
    { use: 'breastplate', slot: 'armour', bone: 'chest' },
    { use: 'medallion', slot: 'gold', bone: 'chest', at: [0, 0.4, 0.25], r: 0.08 },
    { use: 'roundPauldron', slot: 'armour', bone: 'armL', size: 1.9 }, { use: 'roundPauldron', slot: 'armour', bone: 'armR', size: 1.9, side: -1 },
    { use: 'wraps', slot: 'armour', bone: 'elbowL', from: 0.04, to: 0.3, radius: 0.1, count: 3 }, { use: 'wraps', slot: 'armour', bone: 'elbowR', from: 0.04, to: 0.3, radius: 0.1, count: 3 },
    { use: 'wraps', slot: 'armour', bone: 'kneeL', from: 0.04, to: 0.36, radius: 0.12, count: 3 }, { use: 'wraps', slot: 'armour', bone: 'kneeR', from: 0.04, to: 0.36, radius: 0.12, count: 3 },
    { use: 'mailSkirt', slot: 'mail', bone: 'spin' }, { use: 'tassets', slot: 'armour', bone: 'spin' },
    // Always: the sash, the belt, the hip rags; the white mane, forked beard and gold circlet.
    { use: 'belt', slot: 'gold', bone: 'spin' },
    { use: 'clothStrip', slot: 'sash', bone: 'loinF', w: 0.3, len: 0.85, seed: 3 }, { use: 'clothStrip', slot: 'rag', bone: 'loinB', w: 0.4, len: 0.8, seed: 7 },
    { use: 'mane', slot: 'hair', bone: 'mane', count: 18, len: 0.42 },
    { use: 'circlet', slot: 'gold', bone: 'head', r: 0.13, y: 0.16 },
    { use: 'clothStrip', slot: 'hair', bone: 'beard', w: 0.14, len: 0.36, seed: 4 },
    // Serosh, the lion on his back (phase 1 only): a vast pale mane round a shaggy head above his left shoulder.
    { use: 'mane', slot: 'lion', bone: 'lion', count: 28, len: 1.0 }, { use: 'mane', slot: 'lion', bone: 'lionMane', count: 24, len: 0.8 },
    { use: 'furTail', slot: 'lion', bone: 'lion', size: 1.2 },
    // The dark blue cape (phase 1 only).
    { use: 'capeSegment', slot: 'cape', bone: 'capeA', w0: 0.72, w1: 0.86, len: 0.46, bow: 1.0 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeB', w0: 0.86, w1: 0.98, len: 0.46, bow: 0.8 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeC', w0: 0.98, w1: 1.04, len: 0.4, bow: 0.6, ragged: true, seed: 5 },
  ],
  weapon: { use: 'greatAxe', slots: { blade: 'blade', grip: 'haft', guard: 'gold' } },
  eyes: { color: 0xffe0a0, size: 0.018, spread: 0.06, at: [0, 0.12, 0.12] },
  anim: {
    idle: { breathRate: 0.8, breath: 0.026, headDrift: 0.05, sway: 0.02, twitch: 0 }, walk: { twist: 0.14, roll: 0.06, headNod: 0.05, elbow: 0.25, drag: 0.1 },
    flinch: { head: 0.3, chest: 0.3, arms: 0.3 }, death: { buckle: 1.2, slump: 1 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 52, damp: 4.6, flutter: 0.04 },
            { bone: 'beard', gain: 0.1, k: 70, damp: 6, flutter: 0.02 }, { bone: 'mane', gain: 0.05, k: 60, damp: 5, flutter: 0.03 },
            { bone: 'lion', gain: 0.04, k: 30, damp: 3, flutter: 0.08 }, { bone: 'lionMane', gain: 0.05, k: 30, damp: 3, flutter: 0.08 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 34, damp: 3.6, flutter: 0.05 },
            { bone: 'capeC', gain: 0.08, k: 30, damp: 3.2, flutter: 0.07, sideways: 1.2 }],
  },
};

// ---- the boss -----------------------------------------------------------------------------------------------------------
// New field (v5.5): a phase's `conceal` (model slots, or 'weapon', hidden once its invulnerable opener strikes; js/flame.js).
const GF_RING = (from, to, width) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time: 0.2 } });
const GF_CONE = { w: 5.0, h: 0.6, d: 7.0, fwd: 3.6, y: 0.3, ground: true };   // the forward cone of cracked rock
const GODFREY = {
  id: 'godfrey', model: 'godfrey', name: 'Godfrey, First Elden Lord',
  description: 'The first Elden Lord, returned as a shade: a giant axe, stomps that split the earth, and the lion Serosh on his back. At 40% he casts it all off and fights bare-handed as Hoarah Loux.',
  scale: 2.2, bulk: 1.3, radius: 1.0, color: 0xb09050, weapon: 'greataxe', idle: 'sway',
  visual: { skin: 0xa88a6c, skinMetal: 0.3, metal: 0.55, roughness: 0.45, rim: 0.9 },
  hp: 4400, poise: 280, speed: 2.5, turnRate: 3.0, trackRate: 1.5, approach: 0.5, kite: 0.1,
  cooldown: [1.2, 2.2], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 7,
  posture: { max: 165, parry: 40, chainGap: 1.8, chainMul: 1.3, decay: 4, breakTime: 3.4, hitstop: 0.22 },
  defaultPhases: ['lord', 'regal', 'loux', 'rage'],
  phases: {
    // Phase 1: the axe; his stomp sends a cone ahead.
    lord: { hp: 4400, attacks: ['stomp', 'axeDive', 'fissure', 'tripleAxe', 'smashSpin', 'hoist'] },
    // From 78 %: the Regal Roar, and every stomp after it is a ring round him.
    regal: { at: 0.78, opener: 'regalRoar', attacks: ['regalRoar', 'stompWide', 'axeDive', 'fissure', 'tripleAxe', 'smashSpin', 'hoist'] },
    // From 40 %: Hoarah Loux. Serosh, the armour and the axe are cast off; he brawls, grabs and closes in faster.
    loux: { at: 0.4, opener: 'seroshShed', name: 'Hoarah Loux, Warrior', conceal: ['armour', 'mail', 'cape', 'lion', 'weapon'],
      cooldown: [0.8, 1.6], approach: 0.75, kite: 0, speed: 3.2, trackRate: 1.9,
      attacks: ['seroshShed', 'powerBomb', 'louxLunge', 'earthshaker', 'flurry', 'doubleStomp'] },
    // From 20 %: Hoarah Loux's Rage, two stomps, and from then on his stomps reach across the arena.
    rage: { at: 0.2, opener: 'louxRage', name: 'Hoarah Loux, Warrior', conceal: ['armour', 'mail', 'cape', 'lion', 'weapon'],
      cooldown: [0.7, 1.4], approach: 0.8, kite: 0, speed: 3.3, trackRate: 2.0,
      attacks: ['louxRage', 'powerBomb', 'louxLunge', 'earthshaker', 'flurry', 'doubleStompWide'] },
  },
  attacks: [
    // ---- phase 1: the axe ----------------------------------------------------------------------------------------
    // Earth Stomp: the foot lifted high, then a cone of cracked rock ahead along the floor (jump or roll it). No opening:
    // it branches straight into an axe swing.
    { id: 'stomp', name: 'Earth Stomp', anim: 'stomp', pose: 'enemyStomp', noParry: true, tracking: { rate: 2.0, commit: 0.6 }, poseScale: 1.3, chance: 0.6,
      hits: [{ startup: 0.75, active: 0.16, follow: 0.2, box: GF_CONE, impact: { ring: 3.5, crack: 2.2, dust: 18, shake: 0.14 } }], recovery: 0.4,
      followUps: [{ attack: 'tripleAxe', if: 'near', chance: 0.6 }, { attack: 'smashSpin', if: 'near', chance: 0.6 }, { attack: 'hoist', chance: 0.5 }],
      damage: 28, poise: 45, knock: 7, lunge: 0, range: 6, box: GF_CONE },
    // After the Regal Roar: the same stomp, but a ring round him out to the arena's edge.
    { id: 'stompWide', name: 'Earth Stomp', anim: 'stomp', pose: 'enemyStomp', noParry: true, tracking: { rate: 2.0, commit: 0.6 }, poseScale: 1.3, chance: 0.6,
      hits: [{ startup: 0.75, active: 0.2, follow: 0.2, box: GF_RING(0.8, 12, 2.0), impact: { ring: 6.0, crack: 2.6, dust: 26, shake: 0.18 } }], recovery: 0.5,
      followUps: [{ attack: 'tripleAxe', if: 'near', chance: 0.6 }, { attack: 'smashSpin', if: 'near', chance: 0.6 }, { attack: 'hoist', chance: 0.5 }],
      damage: 30, poise: 45, knock: 7, lunge: 0, range: 8, box: GF_RING(0.8, 12, 2.0) },
    // Regal Roar (the opener at 78 %): the axe raised two-handed, the leg held up a full second, then a ring across the
    // arena. A long opening once it has passed.
    { id: 'regalRoar', name: 'Regal Roar', anim: 'stomp', pose: 'enemyStomp', noParry: true, tracking: { rate: 1.2, commit: 0.4 }, poseScale: 1.45, chance: 0,
      hits: [{ startup: 1.5, active: 0.2, follow: 0.6, box: GF_RING(0.8, 14, 2.4), impact: { ring: 8.0, crack: 3.0, dust: 34, shake: 0.26 } }], recovery: 2.0,
      damage: 34, poise: 55, knock: 10, lunge: 0, range: 14, box: GF_RING(0.8, 14, 2.4) },
    // Jumping Axe Throw & Dive: from range, a huge leap onto the axe head; the landing sends a ring out. He stays
    // crouched over the planted axe for a long while.
    { id: 'axeDive', name: 'Jumping Axe Dive', anim: 'chop', pose: 'godfreyDive', noParry: true, tracking: { rate: 2.2, commit: 0.45 }, poseScale: 1.4, minRange: 6, chance: 0.5,
      hits: [{ startup: 1.4, active: 0.16, follow: 0.15, leap: { from: 0.3, max: 16, short: 1.8 }, impact: { ring: 5.0, crack: 2.6, dust: 28, shake: 0.22 } },
             { startup: 0.05, active: 0.18, follow: 0.6, box: GF_RING(1.5, 6, 1.6) }],
      recovery: 2.0, damage: 58, poise: 90, knock: 11, lunge: 0, range: 16, box: { w: 3.0, h: 2.6, d: 4.4, fwd: 1.8, y: 1.0 } },
    // Fissure Slam: the axe whirled and driven into the earth, a long pause, then pushed deeper: a line of golden energy
    // erupts straight ahead the length of the arena. Not along the floor (a jump does not clear it): step to his side.
    { id: 'fissure', name: 'Earth Cleaver', anim: 'chop', pose: 'godfreyFissure', noParry: true, tracking: { rate: 2.0, commit: 0.6 }, poseScale: 1.35, chance: 0.4,
      hits: [{ startup: 1.2, active: 0.16, follow: 0.2, box: { w: 2.6, h: 2.6, d: 4.0, fwd: 2.0, y: 1.0 }, impact: { ring: 3.0, crack: 3.0, dust: 18, shake: 0.16 } },
             { startup: 1.5, active: 0.2, follow: 0.6, box: { w: 2.4, h: 3.0, d: 16, fwd: 9, y: 1.2 }, impact: { ring: 2.0, crack: 4.0, dust: 34, shake: 0.24 } }],
      recovery: 1.6, damage: 36, poise: 60, knock: 9, lunge: 0.6, range: 9, box: { w: 2.6, h: 2.6, d: 4.0, fwd: 2.0, y: 1.0 } },
    // Triple Axe Combo: right to left, left to right, then a delayed two-handed chop. Open only after the third.
    { id: 'tripleAxe', name: 'Triple Axe Combo', anim: 'sweep', pose: 'godfreyTriple', noParry: true, tracking: { rate: 2.8, commit: 0.7 }, poseScale: 1.3, chance: 0.6,
      hits: [{ startup: 0.95, active: 0.14, follow: 0.1, box: { w: 5.2, h: 1.8, d: 3.8, fwd: 1.9, y: 1.1 } },
             { startup: 0.45, active: 0.14, follow: 0.1, box: { w: 5.2, h: 1.8, d: 3.8, fwd: 1.9, y: 1.1 } },
             { startup: 0.9, active: 0.15, follow: 0.45, hold: { at: 0.45, time: [0.2, 0.55], chance: 0.7 }, box: { w: 2.2, h: 3.0, d: 4.4, fwd: 2.2, y: 1.2 } }],
      recovery: 1.5, damage: 30, poise: 50, knock: 7, lunge: 1.8, range: 4.0, box: { w: 5.2, h: 1.8, d: 3.8, fwd: 1.9, y: 1.1 } },
    // Overhead Smash to 360 Spin: a fast chop, a full spin, a second smash. The pauses between are traps; the opening
    // comes only after the second smash.
    { id: 'smashSpin', name: 'Overhead Smash and Spin', anim: 'chop', pose: 'godfreySmashSpin', noParry: true, tracking: { rate: 2.6, commit: 0.65 }, poseScale: 1.3, chance: 0.55,
      hits: [{ startup: 0.85, active: 0.14, follow: 0.12, box: { w: 2.2, h: 3.0, d: 4.2, fwd: 2.1, y: 1.2 } },
             { startup: 0.45, active: 0.16, follow: 0.1, box: { w: 7.0, h: 2.0, d: 7.0, fwd: 0, y: 1.1 } },
             { startup: 0.6, active: 0.15, follow: 0.4, box: { w: 2.2, h: 3.0, d: 4.2, fwd: 2.1, y: 1.2 }, impact: { ring: 2.5, crack: 1.8, dust: 12, shake: 0.12 } }],
      recovery: 1.3, damage: 32, poise: 50, knock: 8, lunge: 1.4, range: 4.0, box: { w: 2.2, h: 3.0, d: 4.2, fwd: 2.1, y: 1.2 } },
    // Plunging Axe: a dash in, the blade driven down and wrenched up with a spray of rock. A short opening.
    { id: 'hoist', name: 'Plunging Axe', anim: 'overhead', pose: 'lightOverhead', noParry: true, tracking: { rate: 2.6, commit: 0.55 }, poseScale: 1.3, minRange: 3,
      dash: { speed: 8.5, from: 0.35 }, chance: 0.45,
      hits: [{ startup: 1.0, active: 0.15, follow: 0.3, box: { w: 2.2, h: 3.6, d: 3.6, fwd: 2.0, y: 1.6 }, impact: { ring: 2.0, crack: 1.6, dust: 16, shake: 0.12 } }],
      recovery: 0.85, damage: 26, poise: 45, knock: 8, lunge: 1.6, range: 8, box: { w: 2.2, h: 3.6, d: 3.6, fwd: 2.0, y: 1.6 } },

    // ---- the change ------------------------------------------------------------------------------------------------
    // He cuts Serosh down and casts off the armour and the axe: untouchable through it, the blow only shoves someone
    // right beside him. The lion, armour and axe vanish as it lands (the phase's `conceal`).
    { id: 'seroshShed', name: 'Serosh Cast Off', anim: 'chop', pose: 'heavyOverhead', noParry: true, invulnerable: true, tracking: { rate: 1.0, commit: 0.3 }, poseScale: 1.3, chance: 0,
      hits: [{ startup: 2.4, active: 0.15, follow: 0.8, box: { w: 3.8, h: 2.4, d: 3.8, fwd: 0, y: 1.1 }, impact: { ring: 4.0, crack: 1.6, dust: 30, shake: 0.24 } }],
      recovery: 0.8, damage: 20, poise: 60, knock: 12, lunge: 0, range: 3, box: { w: 3.8, h: 2.4, d: 3.8, fwd: 0, y: 1.1 } },

    // ---- phase 2: Hoarah Loux --------------------------------------------------------------------------------------
    // Power Bomb: a sprint with the arms raised, a scoop up and a pile-driver. Unblockable (roll it); a whiff leaves him
    // a long time getting up.
    { id: 'powerBomb', name: 'Power Bomb', anim: 'bash', pose: 'enemyBash', noParry: true, rollOnly: true, tracking: { rate: 2.6, commit: 0.55 }, poseScale: 1.35,
      minRange: 4, dash: { speed: 11, from: 0.35 }, chance: 0.4,
      hits: [{ startup: 1.2, active: 0.18, follow: 0.6, box: { w: 2.4, h: 2.4, d: 2.8, fwd: 1.6, y: 1.0 }, impact: { ring: 3.0, crack: 2.0, dust: 22, shake: 0.2 } }],
      recovery: 2.1, damage: 64, poise: 95, knock: 12, lunge: 2.2, range: 11, box: { w: 2.4, h: 2.4, d: 2.8, fwd: 1.6, y: 1.0 } },
    // Loux's Lunge: low, one hand out, a straight charge (it locks its line early). Unblockable; step aside and his
    // back is open through the slide.
    { id: 'louxLunge', name: 'Loux\'s Lunge', anim: 'thrust', pose: 'enemyThrust', noParry: true, rollOnly: true, tracking: { rate: 2.4, commit: 0.35 }, poseScale: 1.3,
      minRange: 3, dash: { speed: 12, from: 0.45 }, chance: 0.4,
      hits: [{ startup: 1.0, active: 0.16, follow: 0.5, box: { w: 2.0, h: 2.0, d: 3.0, fwd: 1.8, y: 1.0 } }],
      recovery: 1.7, damage: 56, poise: 90, knock: 12, lunge: 2.4, range: 10, box: { w: 2.0, h: 2.0, d: 3.0, fwd: 1.8, y: 1.0 } },
    // Hoarah Loux's Earthshaker: a close roar that shoves, a leap with both fists into the floor (a ring), a pause, then
    // the arms torn outward: a far bigger ring. Both rings run along the floor (jump them). A long opening after.
    { id: 'earthshaker', name: 'Earthshaker', anim: 'stomp', pose: 'louxShake', noParry: true, tracking: { rate: 2.0, commit: 0.5 }, poseScale: 1.35, chance: 0.45,
      hits: [{ startup: 0.9, active: 0.15, follow: 0.2, box: { w: 4.0, h: 2.4, d: 4.0, fwd: 0.6, y: 1.1 } },
             { startup: 0.6, active: 0.18, follow: 0.3, leap: { from: 0.2, max: 6, short: 1.6 }, box: GF_RING(0.8, 5, 1.6), impact: { ring: 4.0, crack: 2.2, dust: 22, shake: 0.18 } },
             { startup: 0.9, active: 0.2, follow: 0.6, box: GF_RING(1.2, 11, 2.2), impact: { ring: 7.0, crack: 3.0, dust: 34, shake: 0.26 } }],
      recovery: 2.0, damage: 34, poise: 60, knock: 10, lunge: 0, range: 6, box: { w: 4.0, h: 2.4, d: 4.0, fwd: 0.6, y: 1.1 } },
    // Berserker Flurry: four claw swipes stepping in from side to side, then an upward cross-slash. Open only after it.
    { id: 'flurry', name: 'Berserker Flurry', anim: 'sweep', pose: 'louxFlurry', noParry: true, tracking: { rate: 3.2, commit: 0.7 }, poseScale: 1.25, chance: 0.6,
      hits: [{ startup: 0.75, active: 0.12, follow: 0.06, step: { from: 0.4, speed: 5, side: 2.0 } },
             { startup: 0.32, active: 0.12, follow: 0.06, step: { from: 0.1, speed: 5, side: -2.2 } },
             { startup: 0.32, active: 0.12, follow: 0.06, step: { from: 0.1, speed: 5, side: 2.2 } },
             { startup: 0.36, active: 0.12, follow: 0.08, step: { from: 0.1, speed: 5, side: -2.2 } },
             { startup: 0.5, active: 0.14, follow: 0.35, box: { w: 2.4, h: 3.4, d: 3.4, fwd: 1.8, y: 1.5 } }],
      recovery: 1.0, damage: 18, poise: 30, knock: 5, lunge: 1.6, range: 3.6, box: { w: 3.8, h: 1.8, d: 3.2, fwd: 1.7, y: 1.1 } },
    // Double Earth Stomp: a stomp (a cone ahead), then both fists into the floor (a ring). Jump both.
    { id: 'doubleStomp', name: 'Double Earth Stomp', anim: 'stomp', pose: 'godfreyStomp2', noParry: true, tracking: { rate: 2.0, commit: 0.55 }, poseScale: 1.3, chance: 0.5,
      hits: [{ startup: 0.8, active: 0.16, follow: 0.15, box: GF_CONE, impact: { ring: 3.5, crack: 2.0, dust: 18, shake: 0.14 } },
             { startup: 0.55, active: 0.18, follow: 0.35, box: GF_RING(0.8, 6, 1.8), impact: { ring: 4.5, crack: 2.2, dust: 22, shake: 0.18 } }],
      recovery: 1.1, damage: 30, poise: 50, knock: 8, lunge: 0, range: 5, box: GF_CONE },
    // After his Rage: the double stomp, both rings reaching across the arena.
    { id: 'doubleStompWide', name: 'Double Earth Stomp', anim: 'stomp', pose: 'godfreyStomp2', noParry: true, tracking: { rate: 2.0, commit: 0.55 }, poseScale: 1.35, chance: 0.5,
      hits: [{ startup: 0.8, active: 0.18, follow: 0.15, box: GF_RING(0.8, 11, 2.0), impact: { ring: 6.0, crack: 2.4, dust: 24, shake: 0.18 } },
             { startup: 0.6, active: 0.2, follow: 0.35, box: GF_RING(1.2, 13, 2.2), impact: { ring: 7.0, crack: 2.8, dust: 28, shake: 0.22 } }],
      recovery: 1.2, damage: 32, poise: 50, knock: 8, lunge: 0, range: 8, box: GF_RING(0.8, 11, 2.0) },
    // Hoarah Loux's Rage (the opener at 20 %): the roar with the foot raised, then two stomps across the arena.
    { id: 'louxRage', name: 'Hoarah Loux\'s Rage', anim: 'stomp', pose: 'godfreyStomp2', noParry: true, tracking: { rate: 1.2, commit: 0.4 }, poseScale: 1.45, chance: 0,
      hits: [{ startup: 1.5, active: 0.2, follow: 0.2, box: GF_RING(0.8, 12, 2.2), impact: { ring: 7.0, crack: 2.8, dust: 30, shake: 0.24 } },
             { startup: 0.7, active: 0.2, follow: 0.5, box: GF_RING(1.2, 14, 2.4), impact: { ring: 8.0, crack: 3.0, dust: 34, shake: 0.26 } }],
      recovery: 1.8, damage: 38, poise: 60, knock: 10, lunge: 0, range: 14, box: GF_RING(0.8, 12, 2.2) },
  ],
};
