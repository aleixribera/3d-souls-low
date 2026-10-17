'use strict';
// Entity model definitions: what a character LOOKS like (js/bodykit.js turns one into a model).
// An enemy opts in with `model: '<id>'` in js/data/enemies.js; enemies without it keep the old box body.
// Hitboxes, timings and AI never read anything here: the model only dresses the existing skeleton.
//
//   faction        design family (see the Phase 0 audit); shared motifs live in the faction's part choices
//   fit            multiplies the model's height so a hunched body still fills its collision height (hitbox untouched)
//   proportions    widths and lengths of the body parts (metres at scale 1); the bone positions are fixed
//   limbs          per-bone size tweaks for asymmetry: { armL: { len: 1.12, thick: 0.9 } }
//   posture        rest rotations [x, y, z] (radians) of bones: hunch, hanging head, bent elbows
//   materials      named slots -> { tex, tint, decay } (a texture from js/data/textures.js) or { glow: colour }
//   body           which slot dresses each core body piece
//   bones          extra bones for hanging cloth etc.: name -> { parent, at: [x, y, z] }
//   parts          accessories from the KIT_PARTS list in js/bodykit.js: { use, slot, bone, ...options }
//   weapon         { use, slots } a weapon from KIT_WEAPONS (replaces the box weapon; same size and grip)
//   (proportions.shoulderX: half the shoulder width, where the arms hang from)
//   anim           secondary motion (js/animator.js): idle breathing, walk follow-through, flinch, death, cloth springs;
//                  attack weight shifts come from ANIM_SECONDARY in js/data/animations.js
//   eyes           { color, size, spread, at }: small glowing eyes, the first thing seen in the dark
const MODEL_SETTINGS = {
  texMeters: 0.6,       // how many metres one texture tile covers on a surface
  texSize: 256,         // enemy textures; the player and bosses may use up to TEXTURE_SETTINGS.maxSize
  limbSides: 6,         // radial segments of limbs
  triBudget: { enemy: 1500, player: 3000, boss: 6000 },   // checked by the model lab; the builder warns when over
};
const MODEL_DEFS = {
  // The original Hollow Soldier look (before v5.5): the hollowed models in models-enemies.js / models-bosses.js start from it.
  hollowBase: {
    faction: 'hollowed', budget: 'enemy', fit: 1.07,
    proportions: { shoulderX: 0.31, torsoW: 0.2, torsoD: 0.13, armR: 0.052, legR: 0.08, headR: 0.125, handR: 0.05, footLen: 0.27 },
    limbs: { armL: { len: 1.14, thick: 0.9 }, armR: { thick: 1.0 }, legL: { thick: 0.95 } },   // the left arm hangs too long
    posture: { chest: [0.42, 0, 0.05], neck: [0.34, 0, -0.1], head: [0.1, 0, 0.12], elbowL: [-0.12, 0, 0], elbowR: [-0.3, 0, 0] },
    materials: {
      skin: { tex: 'paleSkin', tint: 0xa39d8f, decay: 0.75 },
      cloth: { tex: 'rottenCloth', tint: 0x8a7a62, decay: 0.8, double: true },
      wrap: { tex: 'rottenCloth', tint: 0xb0a690, decay: 0.9, double: true },
      leather: { tex: 'crackedLeather', tint: 0x7a6650, decay: 0.7 },
      iron: { tex: 'rustedIron', tint: 0x8a7a6a, decay: 0.7 },
      blade: { tex: 'rustedIron', tint: 0x9a9a98, decay: 0.55 },
      wood: { tex: 'barkMoss', tint: 0x8a7a6a, decay: 0.2 },
      eye: { glow: 0xd89a50 },
    },
    body: { torso: 'skin', pelvis: 'cloth', arms: 'skin', legs: 'cloth', head: 'skin', neck: 'skin', hands: 'skin', feet: 'leather' },
    bones: {
      loinF: { parent: 'spin', at: [0.02, -0.02, 0.13] },
      loinB: { parent: 'spin', at: [-0.03, -0.02, -0.13] },
      loinS: { parent: 'spin', at: [0.2, -0.02, 0.02] },
    },
    parts: [
      { use: 'tunic', slot: 'cloth', bone: 'spin' },
      { use: 'spineBumps', slot: 'skin', bone: 'chest' },
      { use: 'hood', slot: 'cloth', bone: 'head' },
      { use: 'pauldron', slot: 'iron', bone: 'armL', size: 1.0 },
      { use: 'breastHalf', slot: 'iron', bone: 'chest', side: -1 },
      { use: 'belt', slot: 'leather', bone: 'spin' },
      { use: 'pouch', slot: 'leather', bone: 'spin', x: -0.2, z: 0.1 },
      { use: 'wraps', slot: 'wrap', bone: 'elbowR', from: 0.02, to: 0.28, radius: 0.052, count: 4 },
      { use: 'wraps', slot: 'wrap', bone: 'kneeR', from: 0.04, to: 0.36, radius: 0.07, count: 4 },
      { use: 'clothStrip', slot: 'cloth', bone: 'loinF', w: 0.2, len: 0.46, seed: 3 },
      { use: 'clothStrip', slot: 'cloth', bone: 'loinB', w: 0.22, len: 0.55, seed: 7 },
      { use: 'clothStrip', slot: 'cloth', bone: 'loinS', w: 0.12, len: 0.3, seed: 11, turn: Math.PI / 2 },
      { use: 'arrowBroken', slot: 'wood', bone: 'chest' },
    ],
    weapon: { use: 'ruinedSword', slots: { blade: 'blade', grip: 'leather', guard: 'iron' } },
    anim: {
      attackMul: 1,
      idle: { breathRate: 1.3, breath: 0.03, headDrift: 0.12, sway: 0.03, twitch: 0.5 },
      walk: { twist: 0.2, roll: 0.07, headNod: 0.07, elbow: 0.6, drag: 0.55 },
      flinch: { head: 1, chest: 1, arms: 1 },
      death: { buckle: 1, slump: 1 },
      cloth: [{ bone: 'loinF', gain: 0.16, k: 60, damp: 5, flutter: 0.05 }, { bone: 'loinB', gain: 0.2, k: 50, damp: 4.5, flutter: 0.07 },
              { bone: 'loinS', gain: 0.1, k: 55, damp: 5, flutter: 0.05, sideways: 0.6 }],
    },
    eyes: { color: 0xd89a50, size: 0.016, spread: 0.05, at: [0, 0.085, 0.105] },
  },
};
// The Hollow Soldier (v5.5, after the reference art): a dead conscript still in his kit. A quilted, ochre-olive padded
// gambeson to mid-thigh with puffed quilted sleeves, two leather straps crossed over the chest, a big pouch at the
// right hip, rust-red trousers, leather gloves and forearm cuffs, iron knee cops over turned-down boot cuffs, a dented
// morion helmet (crested, brim up front and back) over a sunken, rotted face. Upright but slack.
MODEL_DEFS.hollowSoldier = {
  faction: 'hollowed', budget: 'enemy', fit: 1.04,
  proportions: { shoulderX: 0.32, torsoW: 0.21, torsoD: 0.14, armR: 0.06, legR: 0.092, headR: 0.118, handR: 0.052, footLen: 0.28 },
  limbs: { armL: { len: 1.04 }, legL: { thick: 0.97 } },
  posture: { chest: [0.16, 0, 0.03], neck: [0.22, 0, -0.04], head: [0.0, 0, 0.08], elbowL: [-0.14, 0, 0], elbowR: [-0.3, 0, 0] },
  materials: {
    skin: { tex: 'rotSkin', tint: 0x9a7a58, decay: 0.8 },
    quilt: { tex: 'quiltedGambeson', tint: 0xa08a4e, decay: 0.75 },
    trousers: { tex: 'rottenCloth', tint: 0x9a4a30, decay: 0.75 },
    leather: { tex: 'crackedLeather', tint: 0x6e5440, decay: 0.75 },
    strap: { tex: 'crackedLeather', tint: 0x7a6650, decay: 0.85 },
    iron: { tex: 'dentedSteel', tint: 0x7c7e82, decay: 0.8, double: true },
    mail: { tex: 'rustedIron', tint: 0x7a746c, decay: 0.6 },
    blade: { tex: 'rustedIron', tint: 0x9a9a98, decay: 0.55 },
    eye: { glow: 0xd89a50 },
  },
  body: { torso: 'quilt', pelvis: 'trousers', arms: 'quilt', legs: 'trousers', head: 'skin', neck: 'skin', hands: 'leather', feet: 'leather' },
  parts: [
    { use: 'gambeson', slot: 'quilt', bone: 'chest' },
    { use: 'quiltSkirt', slot: 'quilt', bone: 'spin', mail: 'mail' },
    { use: 'crossStraps', slot: 'strap', bone: 'chest' },
    { use: 'satchel', slot: 'strap', bone: 'spin', x: 0.13 },
    { use: 'morion', slot: 'iron', bone: 'head' },
    { use: 'wraps', slot: 'leather', bone: 'elbowL', from: 0.0, to: 0.07, radius: 0.064, count: 1 },
    { use: 'wraps', slot: 'leather', bone: 'elbowR', from: 0.0, to: 0.07, radius: 0.064, count: 1 },
    { use: 'kneeCop', slot: 'iron', bone: 'kneeL' },
    { use: 'kneeCop', slot: 'iron', bone: 'kneeR' },
    { use: 'boot', slot: 'leather', bone: 'kneeL' },
    { use: 'boot', slot: 'leather', bone: 'kneeR' },
  ],
  weapon: { use: 'ruinedSword', slots: { blade: 'blade', grip: 'leather', guard: 'iron' } },
  anim: {
    attackMul: 1,
    idle: { breathRate: 1.3, breath: 0.025, headDrift: 0.1, sway: 0.03, twitch: 0.4 },
    walk: { twist: 0.18, roll: 0.06, headNod: 0.06, elbow: 0.5, drag: 0.35 },
    flinch: { head: 1, chest: 1, arms: 1 },
    death: { buckle: 1, slump: 1 },
  },
  eyes: { color: 0xd89a50, size: 0.013, spread: 0.048, at: [0, 0.095, 0.1] },
};

// The player: a worn wanderer, not a hero. Practical layers (cloth, leather jerkin, a mail skirt, one steel pauldron),
// a hood, a long cape that reacts to movement, a round shield slung on the back, and one faded-red scarf as the accent.
// The back view matters most: hood, cape and the round shield make the silhouette from behind.
MODEL_DEFS.wanderer = {
  faction: 'wanderer', budget: 'player', fit: 1.0, limbSides: 8,
  proportions: { shoulderX: 0.3, torsoW: 0.19, torsoD: 0.12, armR: 0.054, legR: 0.075, headR: 0.118, handR: 0.05, footLen: 0.28 },
  limbs: { armR: { thick: 1.0 }, armL: { thick: 1.05 } },
  posture: { chest: [0.14, 0, 0], neck: [0.1, 0, 0], head: [0.04, 0, 0], elbowL: [-0.15, 0, 0], elbowR: [-0.28, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0x8f867a, decay: 0.4, size: 512 },
    cloth: { tex: 'rottenCloth', tint: 0x6a6252, decay: 0.45, size: 512 },
    hood: { tex: 'rottenCloth', tint: 0x4e5240, decay: 0.55, double: true },
    cape: { tex: 'rottenCloth', tint: 0x5a5444, decay: 0.55, size: 512, double: true },
    capeHem: { tex: 'tatteredFabric', tint: 0x5a5444, decay: 0.6, size: 512, double: true },
    leather: { tex: 'crackedLeather', tint: 0x5e6860, decay: 0.5, size: 512 },
    mail: { tex: 'dentedSteel', tint: 0x6c7078, decay: 0.7 },
    iron: { tex: 'dentedSteel', tint: 0x8a8e94, decay: 0.55 },
    wood: { tex: 'barkMoss', tint: 0x7a6a58, decay: 0.15 },
    blade: { tex: 'dentedSteel', tint: 0xa0a4aa, decay: 0.4, size: 512 },
    scarf: { tex: 'rottenCloth', tint: 0xc03a2a, decay: 0.45, double: true },
  },
  body: { torso: 'cloth', pelvis: 'cloth', arms: 'cloth', legs: 'cloth', head: 'skin', neck: 'skin', hands: 'leather', feet: 'leather' },
  bones: {
    capeA: { parent: 'chest', at: [0, 0.55, -0.235] },
    capeB: { parent: 'capeA', at: [0, -0.4, 0] },
    capeC: { parent: 'capeB', at: [0, -0.4, 0] },
    scarfTail: { parent: 'neck', at: [0.04, 0.0, -0.09] },
  },
  parts: [
    { use: 'jerkin', slot: 'leather', bone: 'chest' },
    { use: 'mailSkirt', slot: 'mail', bone: 'spin' },
    { use: 'belt', slot: 'leather', bone: 'spin' },
    { use: 'pouch', slot: 'leather', bone: 'spin', x: -0.2, z: 0.08 },
    { use: 'flask', slot: 'iron', bone: 'spin', x: 0.2, z: 0.07 },
    { use: 'hood', slot: 'hood', bone: 'head', size: 1.04, tail: 0.35, close: 0.3 },
    { use: 'faceWrap', slot: 'scarf', bone: 'head' },
    { use: 'scarf', slot: 'scarf', bone: 'neck' },
    { use: 'clothStrip', slot: 'scarf', bone: 'scarfTail', w: 0.08, len: 0.4, seed: 5 },
    { use: 'pauldron', slot: 'iron', bone: 'armL', size: 1.15 },
    { use: 'wraps', slot: 'leather', bone: 'elbowL', from: 0.1, to: 0.29, radius: 0.047, count: 3 },
    { use: 'wraps', slot: 'leather', bone: 'elbowR', from: 0.1, to: 0.29, radius: 0.047, count: 3 },
    { use: 'wraps', slot: 'leather', bone: 'kneeL', from: 0.06, to: 0.3, radius: 0.058, count: 3 },
    { use: 'wraps', slot: 'leather', bone: 'kneeR', from: 0.06, to: 0.3, radius: 0.058, count: 3 },
    { use: 'shieldBack', slot: 'wood', bone: 'chest' },
    { use: 'capeSegment', slot: 'cape', bone: 'capeA', w0: 0.52, w1: 0.62, len: 0.4, bow: 1.0 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeB', w0: 0.62, w1: 0.74, len: 0.4, bow: 0.8 },
    { use: 'capeSegment', slot: 'capeHem', bone: 'capeC', w0: 0.74, w1: 0.82, len: 0.34, bow: 0.7, ragged: true, seed: 4 },
  ],
  weapon: { use: 'wandererSword', slots: { blade: 'blade', grip: 'leather', guard: 'iron' } },
  anim: {
    idle: { breathRate: 1.6, breath: 0.018, headDrift: 0.04, sway: 0.015, twitch: 0 },
    walk: { twist: 0.12, roll: 0.04, headNod: 0.03, elbow: 0.3, drag: 0 },
    flinch: { head: 1, chest: 1, arms: 1 },
    death: { buckle: 1, slump: 1 },
    cloth: [{ bone: 'capeA', gain: 0.09, k: 38, damp: 4.2, flutter: 0.035 }, { bone: 'capeB', gain: 0.07, k: 34, damp: 3.6, flutter: 0.05 },
            { bone: 'capeC', gain: 0.06, k: 30, damp: 3.2, flutter: 0.07, sideways: 1.2 },
            { bone: 'scarfTail', gain: 0.14, k: 55, damp: 4, flutter: 0.08 }],
  },
};

// Ysolde of Corvel (v5.1, js/lore.js): the one friendly soul. Unarmed and slight, a long blue-grey shawl worn as a
// hood and trailing down the back, a bellwright's leather apron, rope still round both wrists. No eyes glow: she is
// the only figure in the game whose face is just a face. Built on the wanderer so the shawl moves like the cape.
MODEL_DEFS.ysolde = {
  extends: 'wanderer', faction: 'wanderer', budget: 'enemy', limbSides: 6,
  proportions: { shoulderX: 0.27, torsoW: 0.165, torsoD: 0.11, armR: 0.044, legR: 0.066, headR: 0.112, handR: 0.044, footLen: 0.25 },
  limbs: {},
  posture: { chest: [0.2, 0, 0], neck: [0.16, 0, 0], head: [0.06, 0, 0], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0xb8a690, decay: 0.3 },
    dress: { tex: 'rottenCloth', tint: 0x5a5048, decay: 0.5 },
    shawl: { tex: 'rottenCloth', tint: 0x5a6a7a, decay: 0.45, double: true },
    shawlHem: { tex: 'tatteredFabric', tint: 0x52606e, decay: 0.55, double: true },
    leather: { tex: 'crackedLeather', tint: 0x7a5a3e, decay: 0.45 },
    rope: { tex: 'rottenCloth', tint: 0xa89870, decay: 0.6 },
    iron: { tex: 'rustedIron', tint: 0x8a7a6a, decay: 0.5 },
  },
  body: { torso: 'dress', pelvis: 'dress', arms: 'dress', legs: 'dress', head: 'skin', neck: 'skin', hands: 'skin', feet: 'leather' },
  bones: {
    capeA: { parent: 'chest', at: [0, 0.5, -0.2] },
    capeB: { parent: 'capeA', at: [0, -0.38, 0] },
    capeC: { parent: 'capeB', at: [0, -0.38, 0] },
  },
  parts: [
    { use: 'tunic', slot: 'dress', bone: 'spin' },
    { use: 'jerkin', slot: 'leather', bone: 'chest' },
    { use: 'belt', slot: 'leather', bone: 'spin' },
    { use: 'pouch', slot: 'leather', bone: 'spin', x: 0.18, z: 0.08 },
    { use: 'flask', slot: 'iron', bone: 'spin', x: -0.19, z: 0.07 },   // a small hand-bell at her belt
    { use: 'hood', slot: 'shawl', bone: 'head', size: 1.08, tail: 0.5, close: 0.1 },
    { use: 'scarf', slot: 'shawl', bone: 'neck' },
    { use: 'wraps', slot: 'rope', bone: 'elbowL', from: 0.2, to: 0.27, radius: 0.04, count: 2 },
    { use: 'wraps', slot: 'rope', bone: 'elbowR', from: 0.2, to: 0.27, radius: 0.04, count: 2 },
    { use: 'capeSegment', slot: 'shawl', bone: 'capeA', w0: 0.46, w1: 0.56, len: 0.38, bow: 1.0 },
    { use: 'capeSegment', slot: 'shawl', bone: 'capeB', w0: 0.56, w1: 0.6, len: 0.38, bow: 0.8 },
    { use: 'capeSegment', slot: 'shawlHem', bone: 'capeC', w0: 0.6, w1: 0.62, len: 0.3, bow: 0.7, ragged: true, seed: 8 },
  ],
  weapon: null,
  anim: {
    idle: { breathRate: 1.4, breath: 0.022, headDrift: 0.06, sway: 0.02, twitch: 0 },
    cloth: [{ bone: 'capeA', gain: 0.08, k: 38, damp: 4.2, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 34, damp: 3.6, flutter: 0.05 },
            { bone: 'capeC', gain: 0.06, k: 30, damp: 3.2, flutter: 0.07, sideways: 1.0 }],
  },
};

// Variants: a stronger version of any model, chosen per placement in a level ({ enemy: 'knight', variant: 'elite', ... }).
// Visibly different, not just a recolour: darker and more worn materials, spikes on both shoulders and horns on the head
// (on the model's first metal slot), brighter eyes, a slightly larger frame and a faint pulsing aura.
const MODEL_VARIANTS = {
  elite: {
    darken: 0.72, decayAdd: 0.1, eyeBoost: 1.5, scale: 1.06,
    metalSlots: ['plate', 'iron', 'bronze', 'mail', 'rust', 'bone'],
    parts: [{ use: 'spikes', bone: 'armL', size: 1.2 }, { use: 'spikes', bone: 'armR', size: 1.2, side: -1 }, { use: 'horns', bone: 'head', size: 0.8 }],
    aura: { color: null, size: 2.8, opacity: 0.2 },   // colour: the model's eye colour unless set
  },
};
