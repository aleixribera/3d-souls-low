'use strict';
// Phase 5: models for the remaining normal enemies (the format is explained in js/data/models.js).
// A model that has an `extends` entry starts from another one: anything listed replaces the parent's entry,
// while `proportions` and `anim` merge key by key.
// Factions (Phase 0 audit):
//   HOLLOWED    hoods, rags, rope and leather, amber eyes     (Hollow Soldier, Rogue, Duelist, Bowman)
//   IRONBOUND   plate and mail, faded slate tabard with an ochre stripe, pale blue eyes   (Knight, Warden, Shover)
//   ASHEN HOST  soot mail, peaked hoods, scorched cloth, one red sash, ember eyes          (Lancer, Executioner)
const HOLLOWED_CLOTH = { tex: 'rottenCloth', decay: 0.8, double: true };

MODEL_DEFS.rogue = {   // (v5.5, after the reference art) a deep charcoal hood and black mask, layered belted leather over blue-black
  // scale, blackened steel greaves, a broad scimitar licked by fire and a dagger in the off hand
  extends: 'hollowBase', fit: 1.08,
  proportions: { torsoW: 0.17, torsoD: 0.11, armR: 0.045, legR: 0.065, headR: 0.112, handR: 0.045, footLen: 0.26 },
  limbs: { armL: { len: 1.08, thick: 0.95 } },
  posture: { chest: [0.4, 0, 0.06], neck: [0.3, 0, -0.08], head: [0.12, 0, 0.1], elbowL: [-0.4, 0, 0], elbowR: [-0.5, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0x8a8274, decay: 0.55 },
    scales: { tex: 'rogueScales', decay: 0.4 },
    leather: { tex: 'rogueLeather', decay: 0.6 },
    hood: { tex: 'rogueHood', decay: 0.55, double: true },
    mask: { tex: 'rogueHood', tint: 0x2a2a2a, decay: 0.4, double: true },
    steel: { tex: 'rogueSteel', decay: 0.5 },
    blade: { tex: 'rogueSteel', tint: 0xb8bcc4, decay: 0.35 },
    flame: { glow: 0xff5a14 },
    eye: { glow: 0x8a5a28 },
  },
  body: { torso: 'leather', pelvis: 'scales', arms: 'scales', legs: 'scales', head: 'mask', neck: 'mask', hands: 'leather', feet: 'steel' },
  bones: { loinF: { parent: 'spin', at: [0.02, -0.02, 0.12] }, loinB: { parent: 'spin', at: [-0.03, -0.02, -0.12] }, hoodTail: { parent: 'neck', at: [0, 0.04, -0.1] } },
  parts: [
    { use: 'hood', slot: 'hood', bone: 'head', size: 1.15, tail: 0.6, close: 0.35 }, { use: 'faceWrap', slot: 'mask', bone: 'head' },
    { use: 'clothStrip', slot: 'hood', bone: 'hoodTail', w: 0.2, len: 0.3, seed: 4 },
    { use: 'jerkin', slot: 'leather', bone: 'chest' },
    { use: 'strap', slot: 'leather', buckle: 'steel', bone: 'chest', y: 0.2, r: 0.215, tilt: 0.06 },
    { use: 'strap', slot: 'leather', buckle: 'steel', bone: 'chest', y: 0.32, r: 0.25, tilt: -0.05, bx: 0.07 },
    { use: 'pauldron', slot: 'leather', bone: 'armR', size: 1.2 },
    { use: 'tunic', slot: 'leather', bone: 'spin' },
    { use: 'belt', slot: 'leather', bone: 'spin' }, { use: 'pouch', slot: 'leather', bone: 'spin', x: 0.2, z: 0.08 },
    { use: 'wraps', slot: 'leather', bone: 'elbowL', from: 0.08, to: 0.3, radius: 0.042, count: 3 },
    { use: 'wraps', slot: 'leather', bone: 'elbowR', from: 0.08, to: 0.3, radius: 0.042, count: 3 },
    { use: 'spikes', slot: 'leather', bone: 'elbowL', size: 0.7, at: [[0.035, -0.1, -0.01], [0.035, -0.17, -0.01], [0.035, -0.24, -0.01]] },
    { use: 'kneeCop', slot: 'steel', bone: 'kneeL' }, { use: 'kneeCop', slot: 'steel', bone: 'kneeR' },
    { use: 'boot', slot: 'steel', bone: 'kneeL' }, { use: 'boot', slot: 'steel', bone: 'kneeR' },
    { use: 'clothStrip', slot: 'leather', bone: 'loinF', w: 0.18, len: 0.3, seed: 3 }, { use: 'clothStrip', slot: 'leather', bone: 'loinB', w: 0.2, len: 0.34, seed: 7 },
    { use: 'dagger', slot: 'blade', guardSlot: 'steel', bone: 'elbowL' },
  ],
  weapon: { use: 'flameScimitar', slots: { blade: 'blade', grip: 'leather', guard: 'steel', flame: 'flame' } },
  eyes: { color: 0x8a5a28, size: 0.01, spread: 0.044, at: [0, 0.095, 0.1] },   // a dim glint in the mask's slit
  anim: {
    idle: { breathRate: 2.2, breath: 0.03, headDrift: 0.14, sway: 0.03, twitch: 1.0 }, walk: { twist: 0.26, roll: 0.09, headNod: 0.09, elbow: 0.7, drag: 0.2 },
    cloth: [{ bone: 'loinF', gain: 0.14, k: 60, damp: 5, flutter: 0.04 }, { bone: 'loinB', gain: 0.18, k: 50, damp: 4.5, flutter: 0.05 },
            { bone: 'hoodTail', gain: 0.2, k: 40, damp: 3.5, flutter: 0.06 }],
  },
};

MODEL_DEFS.paleDuelist = {   // a gaunt fallen noble: upright and thin, a plumed cap, rapier and dagger
  extends: 'hollowBase', fit: 1.03,
  proportions: { shoulderX: 0.28, torsoW: 0.16, torsoD: 0.1, armR: 0.042, legR: 0.06, headR: 0.11, handR: 0.043, footLen: 0.26 },
  limbs: { armL: { len: 1.05, thick: 1 } },
  posture: { chest: [0.1, 0, 0], neck: [0.06, 0, 0], head: [-0.04, 0, 0.12], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0xd0c8b8, decay: 0.5 },
    cloth: { tex: 'rottenCloth', tint: 0xb0aca0, decay: 0.6, double: true },
    plume: { tex: 'rottenCloth', tint: 0x9a5a6a, decay: 0.55, double: true },
    leather: { tex: 'crackedLeather', tint: 0x5e6460, decay: 0.55 },
    blade: { tex: 'dentedSteel', tint: 0xb0b4ba, decay: 0.3 },
    iron: { tex: 'dentedSteel', tint: 0x8a8e94, decay: 0.45 },
    eye: { glow: 0xd8e0ff },
  },
  body: { torso: 'cloth', pelvis: 'cloth', arms: 'cloth', legs: 'cloth', head: 'skin', neck: 'skin', hands: 'skin', feet: 'leather' },
  bones: { loinF: { parent: 'spin', at: [0.02, -0.02, 0.12] }, loinB: { parent: 'spin', at: [-0.03, -0.02, -0.12] }, loinS: { parent: 'spin', at: [0.19, -0.02, 0.0] } },
  parts: [
    { use: 'tunic', slot: 'cloth', bone: 'spin' }, { use: 'jerkin', slot: 'leather', bone: 'chest' },
    { use: 'featherCap', slot: 'cloth', plumeSlot: 'plume', bone: 'head' },
    { use: 'belt', slot: 'leather', bone: 'spin' },
    { use: 'wraps', slot: 'leather', bone: 'elbowR', from: 0.08, to: 0.28, radius: 0.04, count: 3 },
    { use: 'wraps', slot: 'leather', bone: 'elbowL', from: 0.08, to: 0.28, radius: 0.04, count: 3 },
    { use: 'wraps', slot: 'leather', bone: 'kneeL', from: 0.04, to: 0.3, radius: 0.052, count: 3 },
    { use: 'wraps', slot: 'leather', bone: 'kneeR', from: 0.04, to: 0.3, radius: 0.052, count: 3 },
    { use: 'clothStrip', slot: 'cloth', bone: 'loinF', w: 0.15, len: 0.5, seed: 2 }, { use: 'clothStrip', slot: 'cloth', bone: 'loinB', w: 0.2, len: 0.7, seed: 5 },
    { use: 'clothStrip', slot: 'plume', bone: 'loinS', w: 0.07, len: 0.45, seed: 8, turn: Math.PI / 2 },
    { use: 'dagger', slot: 'blade', guardSlot: 'iron', bone: 'elbowL' },
  ],
  weapon: { use: 'rapier', slots: { blade: 'blade', grip: 'leather', guard: 'iron' } },
  eyes: { color: 0xd8e0ff, size: 0.013, spread: 0.042, at: [0, 0.095, 0.1] },
  anim: {
    idle: { breathRate: 1.9, breath: 0.022, headDrift: 0.08, sway: 0.02, twitch: 0.6 }, walk: { twist: 0.16, roll: 0.05, headNod: 0.05, elbow: 0.3, drag: 0 },
    cloth: [{ bone: 'loinF', gain: 0.16, k: 55, damp: 5, flutter: 0.04 }, { bone: 'loinB', gain: 0.22, k: 45, damp: 4.2, flutter: 0.06 },
            { bone: 'loinS', gain: 0.1, k: 50, damp: 4.5, flutter: 0.05, sideways: 0.8 }],
  },
};

MODEL_DEFS.rampartBowman = {   // hunched, a bow taller than its body, a quiver bristling with arrows
  extends: 'hollowBase', fit: 1.06,
  proportions: { torsoW: 0.18, torsoD: 0.12, armR: 0.048, legR: 0.07, headR: 0.118 },
  limbs: { armL: { len: 1.08, thick: 0.9 } },
  posture: { chest: [0.36, 0, 0.04], neck: [0.3, 0, -0.08], head: [0.08, 0, 0.1], elbowL: [-0.2, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0xa39d8f, decay: 0.7 },
    cloth: { ...HOLLOWED_CLOTH, tint: 0x6a7258 },
    hood: { ...HOLLOWED_CLOTH, tint: 0x56604a, decay: 0.85 },
    wrap: { ...HOLLOWED_CLOTH, tint: 0xb0a690, decay: 0.9 },
    leather: { tex: 'crackedLeather', tint: 0x66705e, decay: 0.65 },
    wood: { tex: 'barkMoss', tint: 0x8a7a6a, decay: 0.2 },
    eye: { glow: 0xd89a50 },
  },
  body: { torso: 'skin', pelvis: 'cloth', arms: 'skin', legs: 'cloth', head: 'skin', neck: 'skin', hands: 'skin', feet: 'leather' },
  bones: { loinF: { parent: 'spin', at: [0.02, -0.02, 0.13] }, loinB: { parent: 'spin', at: [-0.03, -0.02, -0.13] } },
  parts: [
    { use: 'tunic', slot: 'cloth', bone: 'spin' }, { use: 'hood', slot: 'hood', bone: 'head' },
    { use: 'belt', slot: 'leather', bone: 'spin' }, { use: 'pouch', slot: 'leather', bone: 'spin', x: -0.2, z: 0.1 },
    { use: 'quiver', bone: 'chest', slot: 'leather' },
    { use: 'wraps', slot: 'leather', bone: 'elbowL', from: 0.06, to: 0.28, radius: 0.043, count: 3 },
    { use: 'wraps', slot: 'wrap', bone: 'kneeL', from: 0.05, to: 0.34, radius: 0.062, count: 4 },
    { use: 'wraps', slot: 'wrap', bone: 'kneeR', from: 0.05, to: 0.34, radius: 0.062, count: 4 },
    { use: 'clothStrip', slot: 'cloth', bone: 'loinF', w: 0.18, len: 0.42, seed: 3 }, { use: 'clothStrip', slot: 'cloth', bone: 'loinB', w: 0.2, len: 0.5, seed: 7 },
  ],
  weapon: { use: 'bow', slots: { limb: 'wood', string: 'wrap' } },
  anim: { cloth: [{ bone: 'loinF', gain: 0.16, k: 60, damp: 5, flutter: 0.05 }, { bone: 'loinB', gain: 0.2, k: 50, damp: 4.5, flutter: 0.07 }] },
};

// ---- Ironbound: the fallen garrison ---------------------------------------------------------------------------------
const IRONBOUND_MATS = {
  skin: { tex: 'paleSkin', tint: 0x7a7468, decay: 0.8 },
  plate: { tex: 'dentedSteel', tint: 0x7a7e86, decay: 0.65 },
  rust: { tex: 'rustedIron', tint: 0x8a7a6a, decay: 0.75 },
  mail: { tex: 'dentedSteel', tint: 0x5a5e66, decay: 0.85 },
  cloth: { tex: 'rottenCloth', tint: 0x6a6a62, decay: 0.75, double: true },
  tabard: { tex: 'rottenCloth', tint: 0x5a6a78, decay: 0.7, double: true },
  stripe: { tex: 'rottenCloth', tint: 0xa07a3a, decay: 0.6, double: true },
  leather: { tex: 'crackedLeather', tint: 0x5e6860, decay: 0.7 },
  blade: { tex: 'dentedSteel', tint: 0x8a8e94, decay: 0.6 },
  eye: { glow: 0x9ab8ff },
};
const IRONBOUND_ANIM = {
  idle: { breathRate: 1.1, breath: 0.012, headDrift: 0.03, sway: 0.01, twitch: 0 }, walk: { twist: 0.08, roll: 0.03, headNod: 0.03, elbow: 0.25, drag: 0 },
  flinch: { head: 0.5, chest: 0.5, arms: 0.5 }, death: { buckle: 1, slump: 0.7 },
  cloth: [{ bone: 'loinF', gain: 0.1, k: 70, damp: 6, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 60, damp: 5.5, flutter: 0.04 }],
};
const IRONBOUND_BODY = { torso: 'mail', pelvis: 'mail', arms: 'mail', legs: 'mail', head: null, neck: 'mail', hands: 'plate', feet: 'plate' };
const IRONBOUND_BONES = { loinF: { parent: 'spin', at: [0.0, -0.02, 0.16] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.16] } };
const IRONBOUND_PROPS = { shoulderX: 0.37, torsoW: 0.25, torsoD: 0.17, armR: 0.066, legR: 0.088, headR: 0.13, handR: 0.06, footLen: 0.31 };
const tabardParts = (w, len) => [
  { use: 'clothStrip', slot: 'tabard', bone: 'loinF', w, len, seed: 3 }, { use: 'clothStrip', slot: 'stripe', bone: 'loinF', w: 0.05, len: len - 0.05, seed: 3, dz: 0.012 },
  { use: 'clothStrip', slot: 'tabard', bone: 'loinB', w: w + 0.02, len: len + 0.1, seed: 6 },
];

MODEL_DEFS.ironKnight = {   // broad, upright, heavy: a cracked great helm, one pauldron gone, a greatsword
  extends: 'hollowBase', faction: 'ironbound', fit: 1.0,
  proportions: IRONBOUND_PROPS, limbs: {},
  posture: { chest: [0.04, 0, 0], neck: [0.05, 0, 0], head: [0, 0, 0.04], elbowL: [-0.25, 0, 0], elbowR: [-0.3, 0, 0] },
  materials: IRONBOUND_MATS, body: IRONBOUND_BODY, bones: IRONBOUND_BONES,
  parts: [
    { use: 'jerkin', slot: 'plate', bone: 'chest' }, { use: 'mailSkirt', slot: 'mail', bone: 'spin' }, { use: 'belt', slot: 'leather', bone: 'spin' },
    { use: 'greatHelm', slot: 'plate', bone: 'head', size: 1.2 },
    { use: 'pauldron', slot: 'plate', bone: 'armL', size: 1.6 },
    { use: 'wraps', slot: 'rust', bone: 'elbowL', from: 0.06, to: 0.28, radius: 0.058, count: 2 }, { use: 'wraps', slot: 'plate', bone: 'elbowR', from: 0.06, to: 0.28, radius: 0.058, count: 1 },
    { use: 'wraps', slot: 'rust', bone: 'kneeL', from: 0.05, to: 0.32, radius: 0.08, count: 2 }, { use: 'wraps', slot: 'plate', bone: 'kneeR', from: 0.05, to: 0.32, radius: 0.08, count: 2 },
    ...tabardParts(0.3, 0.7),
    { use: 'roundShield', slot: 'plate', face: 'plate', metal: 'rust', bone: 'elbowL', r: 0.3, at: [0.07, -0.18, 0.17], rot: [Math.PI / 2, 0, 0] },
  ],
  weapon: { use: 'greatSword', slots: { blade: 'blade', grip: 'leather', guard: 'rust' } },
  eyes: { color: 0x9ab8ff, size: 0.017, spread: 0.06, at: [0, 0.135, 0.17] },
  anim: IRONBOUND_ANIM,
};

// The Undead Knight (after the reference art): full worn plate, mottled grey with rivets. A rounded close helm with a
// beaked visor over a broad gorget, a swelling breastplate, great three-lamed pauldrons (the left the larger), mail at
// the joints, banded vambraces, gauntlets and greaves, tassets over dark brown trousers, and a long greatsword whose
// blade hooks up into a cleaver tip. No shield, no tabard. ironKnight stays as the base of the other Ironbound.
MODEL_DEFS.undeadKnight = {
  extends: 'ironKnight', fit: 1.0,
  proportions: { ...IRONBOUND_PROPS, shoulderX: 0.39, torsoW: 0.27, torsoD: 0.19, armR: 0.07, legR: 0.092 },
  posture: { chest: [0.06, 0, 0], neck: [0.1, 0, 0], head: [0.04, 0, 0.03], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    ...IRONBOUND_MATS,
    plate: { tex: 'knightPlate', tint: 0xc4c6cc, decay: 0.55 },
    mail: { tex: 'knightMail', tint: 0x8a8a8e, decay: 0.7 },
    trousers: { tex: 'rottenCloth', tint: 0x5a4434, decay: 0.75 },
    leather: { tex: 'crackedLeather', tint: 0x5a3e2c, decay: 0.7 },
    blade: { tex: 'knightPlate', tint: 0xa8aaae, decay: 0.5 },
    guard: { tex: 'knightPlate', tint: 0x8a8c90, decay: 0.6 },
  },
  body: { torso: 'mail', pelvis: 'trousers', arms: 'mail', legs: 'trousers', head: null, neck: 'mail', hands: 'plate', feet: 'plate' },
  parts: [
    { use: 'breastplate', slot: 'plate', bone: 'chest' },
    { use: 'tassets', slot: 'plate', bone: 'spin' },
    { use: 'closeHelm', slot: 'plate', bone: 'head', size: 1.12 },
    { use: 'roundPauldron', slot: 'plate', bone: 'armL', size: 1.55 }, { use: 'roundPauldron', slot: 'plate', bone: 'armR', size: 1.3, side: -1 },
    { use: 'plateBands', slot: 'plate', bone: 'elbowL', from: 0.03, to: 0.27, radius: 0.058, count: 3, flare: 0.25, cop: 0.068 },
    { use: 'plateBands', slot: 'plate', bone: 'elbowR', from: 0.03, to: 0.27, radius: 0.058, count: 3, flare: 0.25, cop: 0.068 },
    { use: 'plateBands', slot: 'plate', bone: 'legL', from: 0.12, to: 0.3, radius: 0.098, count: 1 },
    { use: 'plateBands', slot: 'plate', bone: 'legR', from: 0.12, to: 0.3, radius: 0.098, count: 1 },
    { use: 'plateBands', slot: 'plate', bone: 'kneeL', from: 0.04, to: 0.4, radius: 0.072, count: 3, flare: 0.12, cop: 0.08 },
    { use: 'plateBands', slot: 'plate', bone: 'kneeR', from: 0.04, to: 0.4, radius: 0.072, count: 3, flare: 0.12, cop: 0.08 },
    { use: 'belt', slot: 'leather', bone: 'spin' },
  ],
  weapon: { use: 'knightGreatsword', slots: { blade: 'blade', grip: 'leather', guard: 'guard' } },
  eyes: { color: 0x9ab8ff, size: 0.014, spread: 0.055, at: [0, 0.183, 0.18] },
  anim: { ...IRONBOUND_ANIM, cloth: [] },
};

// The Shield Warden (v5.5, after the reference art): dark pitted charcoal plate with worn silver edges, a cylindrical
// flat-topped tower helm with a central nasal bar and vertical face grate, a high spiked gorget and shoulder guard,
// V-ribbed breastplate, fauld and tassets with a heavy bulbous codpiece, banded greaves with winged knee cops, a long
// slender greatsword carried over the right shoulder, and a towering ornate horned greatshield with gothic brass-silver
// tracery over a fire-and-soot recessed face. No banner, no tabard.
MODEL_DEFS.ironWarden = {
  extends: 'ironKnight', fit: 1.0,
  proportions: { ...IRONBOUND_PROPS, shoulderX: 0.38, torsoW: 0.25, torsoD: 0.18, armR: 0.066, legR: 0.09 },
  posture: { chest: [0.06, 0, 0], neck: [0.08, 0, 0], head: [0.03, 0, 0.02], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    ...IRONBOUND_MATS,
    plate: { tex: 'wardenPlate', tint: 0xb8bcc4, decay: 0.65 },
    mail: { tex: 'knightMail', tint: 0x6a6c72, decay: 0.75 },
    shieldFace: { tex: 'wardenShield', tint: 0xe8d0c0, decay: 0.65 },
    shieldTrim: { tex: 'wardenBrass', tint: 0xd0c6b4, decay: 0.5 },
    grip: { tex: 'crackedLeather', tint: 0x8a4228, decay: 0.55 },
    blade: { tex: 'knightPlate', tint: 0xb4b8c0, decay: 0.45 },
    guard: { tex: 'wardenPlate', tint: 0x90949c, decay: 0.55 },
  },
  body: { torso: 'mail', pelvis: 'mail', arms: 'mail', legs: 'mail', head: null, neck: 'mail', hands: 'plate', feet: 'plate' },
  bones: {},
  parts: [
    { use: 'breastplate', slot: 'plate', bone: 'chest' },
    { use: 'neckGuard', slot: 'plate', bone: 'chest' },
    { use: 'tassets', slot: 'plate', bone: 'spin' },
    { use: 'codpiece', slot: 'plate', bone: 'spin' },
    { use: 'towerHelm', slot: 'plate', bone: 'head', size: 1.12 },
    { use: 'roundPauldron', slot: 'plate', bone: 'armR', size: 1.45, side: -1 },
    { use: 'roundPauldron', slot: 'plate', bone: 'armL', size: 1.25 },
    { use: 'plateBands', slot: 'plate', bone: 'elbowR', from: 0.03, to: 0.28, radius: 0.06, count: 3, flare: 0.28, cop: 0.07 },
    { use: 'plateBands', slot: 'plate', bone: 'elbowL', from: 0.03, to: 0.28, radius: 0.058, count: 3, flare: 0.22, cop: 0.066 },
    { use: 'plateBands', slot: 'plate', bone: 'legL', from: 0.1, to: 0.32, radius: 0.095, count: 2 },
    { use: 'plateBands', slot: 'plate', bone: 'legR', from: 0.1, to: 0.32, radius: 0.095, count: 2 },
    { use: 'plateBands', slot: 'plate', bone: 'kneeL', from: 0.03, to: 0.4, radius: 0.072, count: 3, flare: 0.14, cop: 0.084 },
    { use: 'plateBands', slot: 'plate', bone: 'kneeR', from: 0.03, to: 0.4, radius: 0.072, count: 3, flare: 0.14, cop: 0.084 },
    { use: 'greatshield', slot: 'shieldFace', metal: 'shieldTrim', bone: 'elbowL', w: 0.74, h: 1.48, at: [0.08, -0.22, 0.22] },
  ],
  weapon: { use: 'wardenGreatsword', slots: { blade: 'blade', grip: 'grip', guard: 'guard' } },
  eyes: { color: 0x9ab8ff, size: 0.013, spread: 0.048, at: [0, 0.152, 0.165] },
  anim: { ...IRONBOUND_ANIM, cloth: [] },
};

MODEL_DEFS.ironShover = {   // a barrel-chested brute behind a wall-sized shield; no weapon, the shield is the weapon
  extends: 'ironKnight', fit: 1.0,
  proportions: { torsoW: 0.28, torsoD: 0.19, armR: 0.07, legR: 0.09, headR: 0.125 },
  posture: { chest: [0.16, 0, 0], neck: [0.1, 0, 0], head: [0.04, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0] },
  materials: { ...IRONBOUND_MATS, plate: { tex: 'dentedSteel', tint: 0x6a6e74, decay: 0.75 }, tabard: { tex: 'rottenCloth', tint: 0x6a5a48, decay: 0.75, double: true } },
  parts: [
    { use: 'jerkin', slot: 'plate', bone: 'chest' }, { use: 'mailSkirt', slot: 'mail', bone: 'spin' }, { use: 'belt', slot: 'leather', bone: 'spin' },
    { use: 'greatHelm', slot: 'plate', bone: 'head', size: 1.1, flat: true, nose: true },
    { use: 'pauldron', slot: 'plate', bone: 'armR', size: 1.4, side: -1 }, { use: 'pauldron', slot: 'rust', bone: 'armL', size: 1.4 },
    { use: 'wraps', slot: 'rust', bone: 'elbowR', from: 0.06, to: 0.28, radius: 0.06, count: 3 },
    { use: 'wraps', slot: 'plate', bone: 'kneeL', from: 0.05, to: 0.32, radius: 0.08, count: 3 }, { use: 'wraps', slot: 'plate', bone: 'kneeR', from: 0.05, to: 0.32, radius: 0.08, count: 3 },
    ...tabardParts(0.3, 0.55),
    { use: 'kiteShield', slot: 'tabard', metal: 'rust', bone: 'elbowL', w: 0.8, h: 1.15, at: [0.08, -0.12, 0.22] },
  ],
  weapon: null,
  eyes: { color: 0x9ab8ff, size: 0.017, spread: 0.05, at: [0, 0.12, 0.165] },
};

// ---- Ashen Host: the invaders -----------------------------------------------------------------------------------------
const ASHEN_MATS = {
  skin: { tex: 'paleSkin', tint: 0x6a5e58, decay: 0.85 },
  cloth: { tex: 'rottenCloth', tint: 0x7a4a3c, decay: 0.85, double: true },
  soot: { tex: 'ashSoot', tint: 0x8a8480, decay: 0.7, double: true },
  mail: { tex: 'dentedSteel', tint: 0x4a4644, decay: 0.9 },
  iron: { tex: 'rustedIron', tint: 0x7a6a62, decay: 0.8 },
  leather: { tex: 'crackedLeather', tint: 0x5a5a56, decay: 0.8 },
  sash: { tex: 'rottenCloth', tint: 0xb03a22, decay: 0.5, double: true },
  blade: { tex: 'dentedSteel', tint: 0x7a7470, decay: 0.8 },
  wood: { tex: 'barkMoss', tint: 0x6a5a50, decay: 0.3 },
  eye: { glow: 0xff7a30 },
};
MODEL_DEFS.ashBase = {   // base template for the Ashen Pillager faction
  extends: 'hollowBase', faction: 'ashen', fit: 1.03,
  proportions: { shoulderX: 0.32, torsoW: 0.2, torsoD: 0.13, armR: 0.054, legR: 0.075, headR: 0.12 },
  limbs: {},
  posture: { chest: [0.2, 0, 0], neck: [0.1, 0, 0], head: [0.04, 0, 0], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0] },
  materials: ASHEN_MATS,
  body: { torso: 'mail', pelvis: 'cloth', arms: 'mail', legs: 'cloth', head: 'skin', neck: 'skin', hands: 'leather', feet: 'leather' },
  bones: {
    loinF: { parent: 'spin', at: [0.0, -0.02, 0.13] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.13] },
    capeA: { parent: 'chest', at: [0, 0.55, -0.21] }, capeB: { parent: 'capeA', at: [0, -0.4, 0] }, capeC: { parent: 'capeB', at: [0, -0.4, 0] },
  },
  parts: [
    { use: 'tunic', slot: 'cloth', bone: 'spin' }, { use: 'jerkin', slot: 'mail', bone: 'chest' },
    { use: 'hood', slot: 'soot', bone: 'head', close: 0.4 }, { use: 'hoodPeak', slot: 'soot', bone: 'head', size: 0.9 },
    { use: 'belt', slot: 'leather', bone: 'spin' }, { use: 'clothStrip', slot: 'sash', bone: 'loinF', w: 0.12, len: 0.6, seed: 3, dx: 0.1, dz: 0.01 },
    { use: 'pauldron', slot: 'iron', bone: 'armR', size: 1.1, side: -1 },
    { use: 'wraps', slot: 'leather', bone: 'elbowL', from: 0.06, to: 0.28, radius: 0.047, count: 3 }, { use: 'wraps', slot: 'leather', bone: 'elbowR', from: 0.06, to: 0.28, radius: 0.047, count: 3 },
    { use: 'wraps', slot: 'leather', bone: 'kneeL', from: 0.05, to: 0.32, radius: 0.06, count: 3 }, { use: 'wraps', slot: 'leather', bone: 'kneeR', from: 0.05, to: 0.32, radius: 0.06, count: 3 },
    { use: 'clothStrip', slot: 'cloth', bone: 'loinB', w: 0.22, len: 0.5, seed: 7 },
    { use: 'capeSegment', slot: 'soot', bone: 'capeA', w0: 0.42, w1: 0.48, len: 0.4, bow: 1.0 }, { use: 'capeSegment', slot: 'soot', bone: 'capeB', w0: 0.48, w1: 0.56, len: 0.4, bow: 0.8 },
    { use: 'capeSegment', slot: 'soot', bone: 'capeC', w0: 0.56, w1: 0.62, len: 0.3, bow: 0.7 },
  ],
  weapon: { use: 'spear', slots: { blade: 'blade', grip: 'wood', guard: 'iron' } },
  eyes: { color: 0xff7a30, size: 0.014, spread: 0.045, at: [0, 0.09, 0.115] },
  anim: {
    idle: { breathRate: 1.4, breath: 0.02, headDrift: 0.05, sway: 0.02, twitch: 0 }, walk: { twist: 0.14, roll: 0.05, headNod: 0.05, elbow: 0.35, drag: 0 },
    cloth: [{ bone: 'loinF', gain: 0.16, k: 60, damp: 5, flutter: 0.05 }, { bone: 'loinB', gain: 0.2, k: 50, damp: 4.5, flutter: 0.07 },
            { bone: 'capeA', gain: 0.08, k: 38, damp: 4.2, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 34, damp: 3.6, flutter: 0.05 },
            { bone: 'capeC', gain: 0.06, k: 30, damp: 3.2, flutter: 0.07, sideways: 1.2 }],
  },
};

// The Ashen Lancer (v5.5, after the reference art): a hunched skeletal militiaman in a coarse dark charcoal-brown
// burlap hood and tattered poncho shroud that parts over the chest to expose the ribcage and spine, a twisted dark
// reddish-brown neck cord, bare bleached-ivory skeletal forearms, shins and bony feet with prominent dark-grimed knee
// condyles and forearm/ankle bindings, frayed cloth tatters hanging around the waist and thighs, and a long curved
// glaive with three circular perforations at the blade heel, rust encrustation, and hanging shaft streamers.
MODEL_DEFS.ashLancer = {
  extends: 'hollowBase', faction: 'ashen', budget: 'enemy', fit: 1.03, limbSides: 4,
  proportions: { shoulderX: 0.31, torsoW: 0.185, torsoD: 0.12, armR: 0.036, legR: 0.046, headR: 0.116, handR: 0.032, footLen: 0.25 },
  limbs: {
    armL: { len: 1.05, thick: 0.9 }, elbowL: { len: 1.04, thick: 0.88 },
    armR: { len: 1.05, thick: 0.9 }, elbowR: { len: 1.04, thick: 0.88 },
    legL: { thick: 0.9 }, kneeL: { thick: 0.88 },
    legR: { thick: 0.9 }, kneeR: { thick: 0.88 },
  },
  posture: {
    chest: [0.22, 0, 0], neck: [0.08, 0, 0], head: [-0.14, 0, 0],
    armL: [0.18, 0, 0.12], elbowL: [-0.48, 0, 0.18],
    armR: [-0.12, 0, -0.14], elbowR: [-0.62, 0, -0.05],
  },
  materials: {
    bone: { tex: 'lancerBone', tint: 0xd4c4a4, decay: 0.55 },
    darkBone: { tex: 'lancerBone', tint: 0x5c4c3a, decay: 0.85 },
    socket: { tex: 'ashSoot', tint: 0x100c0a, decay: 0.9 },
    shroud: { tex: 'lancerBurlap', tint: 0x6e5e50, decay: 0.78, double: true },
    rags: { tex: 'lancerRags', tint: 0x6a5a4c, decay: 0.85, double: true },
    collar: { tex: 'rottenCloth', tint: 0x683024, decay: 0.65, double: true },
    leather: { tex: 'crackedLeather', tint: 0x3a2e26, decay: 0.78 },
    iron: { tex: 'rustedIron', tint: 0x62564e, decay: 0.8 },
    rust: { tex: 'rustedIron', tint: 0x744226, decay: 0.9 },
    blade: { tex: 'glaiveSteel', tint: 0xb8bcc2, decay: 0.58 },
    wood: { tex: 'crackedLeather', tint: 0x38281e, decay: 0.72 },
    eye: { glow: 0xd8a858 },
  },
  body: { torso: null, pelvis: 'darkBone', arms: 'bone', legs: 'bone', head: null, neck: 'darkBone', hands: 'bone', feet: 'bone' },
  bones: {
    loinF: { parent: 'spin', at: [0.0, -0.02, 0.13] },
    loinB: { parent: 'spin', at: [0.0, -0.02, -0.13] },
    loinL: { parent: 'spin', at: [0.16, -0.03, 0.02] },
    loinR: { parent: 'spin', at: [-0.16, -0.03, 0.02] },
    capeA: { parent: 'chest', at: [0, 0.54, -0.16] },
    capeB: { parent: 'capeA', at: [0, -0.42, 0] },
  },
  parts: [
    // Skull face with dark eye sockets, nasal cavity, brow crack and teeth under a deep woven burlap hood.
    { use: 'skeletalSkull', slot: 'bone', void: 'socket', hood: 'shroud', bone: 'head' },
    // Exposed skeletal ribcage and sternum inside the open V-front burlap shroud and twisted reddish-brown neck cord.
    { use: 'shroud', slot: 'shroud', collar: 'collar', ribs: 'bone', void: 'socket', bone: 'chest' },
    { use: 'belt', slot: 'leather', bone: 'spin' },
    // Ragged burlap sleeves draping over the upper arms and shoulder joints.
    { use: 'sleeve', slot: 'shroud', bone: 'armL', y0: 0.06, r0: 0.095, r1: 0.15, len: 0.29, seg: 6, seed: 11 },
    { use: 'sleeve', slot: 'shroud', bone: 'armR', y0: 0.06, r0: 0.095, r1: 0.15, len: 0.29, seg: 6, seed: 14 },
    // Prominent bone condyle knobs at elbows and dark-grimed knees, plus skeletal fingers.
    { use: 'knobs', slot: 'bone', bone: 'armL', at: [[0, -0.3, 0, 0.036]] },
    { use: 'knobs', slot: 'bone', bone: 'armR', at: [[0, -0.3, 0, 0.036]] },
    { use: 'knobs', slot: 'darkBone', bone: 'legL', at: [[0, -0.4, 0.015, 0.05]] },
    { use: 'knobs', slot: 'darkBone', bone: 'legR', at: [[0, -0.4, 0.015, 0.05]] },
    { use: 'fingers', slot: 'bone', bone: 'elbowL', len: 0.11, r: 0.01, spread: 0.022 },
    { use: 'fingers', slot: 'bone', bone: 'elbowR', len: 0.11, r: 0.01, spread: 0.022 },
    // Dark leather/iron bindings on the skeletal forearms and lower shins/ankles.
    { use: 'wraps', slot: 'leather', bone: 'elbowL', from: 0.07, to: 0.18, radius: 0.036, count: 1 },
    { use: 'wraps', slot: 'leather', bone: 'elbowR', from: 0.07, to: 0.18, radius: 0.036, count: 1 },
    { use: 'wraps', slot: 'leather', bone: 'kneeL', from: 0.22, to: 0.34, radius: 0.042, count: 1 },
    { use: 'wraps', slot: 'leather', bone: 'kneeR', from: 0.22, to: 0.34, radius: 0.042, count: 1 },
    // Hanging frayed cloth strips around the front, sides, and back of the waist, plus the tattered back cloak.
    { use: 'clothStrip', slot: 'rags', bone: 'loinF', w: 0.16, len: 0.56, seed: 3, dx: -0.075 },
    { use: 'clothStrip', slot: 'rags', bone: 'loinF', w: 0.15, len: 0.52, seed: 5, dx: 0.08, dz: 0.01 },
    { use: 'clothStrip', slot: 'shroud', bone: 'loinL', w: 0.2, len: 0.58, seed: 11, turn: Math.PI / 2 },
    { use: 'clothStrip', slot: 'shroud', bone: 'loinR', w: 0.2, len: 0.58, seed: 13, turn: -Math.PI / 2 },
    { use: 'clothStrip', slot: 'rags', bone: 'loinB', w: 0.28, len: 0.62, seed: 7 },
    { use: 'capeSegment', slot: 'shroud', bone: 'capeA', w0: 0.46, w1: 0.56, len: 0.44, bow: 0.95, ragged: true, seed: 2 },
    { use: 'capeSegment', slot: 'rags', bone: 'capeB', w0: 0.56, w1: 0.64, len: 0.46, bow: 0.78, ragged: true, seed: 6 },
  ],
  weapon: { use: 'glaive', slots: { blade: 'blade', rust: 'rust', hole: 'socket', grip: 'wood', guard: 'iron', wrap: 'rags' } },
  eyes: { color: 0xd8a858, size: 0.009, spread: 0.036, at: [0, 0.112, 0.105] },
  anim: {
    idle: { breathRate: 1.2, breath: 0.018, headDrift: 0.06, sway: 0.025, twitch: 0.12 },
    walk: { twist: 0.15, roll: 0.06, headNod: 0.06, elbow: 0.35, drag: 0.08 },
    cloth: [
      { bone: 'loinF', gain: 0.16, k: 58, damp: 4.8, flutter: 0.06 },
      { bone: 'loinB', gain: 0.2, k: 50, damp: 4.5, flutter: 0.07 },
      { bone: 'loinL', gain: 0.15, k: 54, damp: 4.6, flutter: 0.06, sideways: 0.9 },
      { bone: 'loinR', gain: 0.15, k: 54, damp: 4.6, flutter: 0.06, sideways: 0.9 },
      { bone: 'capeA', gain: 0.09, k: 38, damp: 4.2, flutter: 0.04 },
      { bone: 'capeB', gain: 0.08, k: 34, damp: 3.6, flutter: 0.06, sideways: 1.1 },
    ],
  },
};

// The Executioner (v5.5, after the reference art): unhelmed with swept-back auburn hair and a black diagonal eyepatch,
// a silver-grey feathered scale hauberk with layered leaf-scale plumage over the chest, shoulders and hips, an open
// collar over a dark undertunic, a multi-band amber sash and diagonal strap with red-white cord tassels, a beige-olive
// skirt bordered in geometric embroidery, a heavy scaled left gauntlet and smooth leather right bracer, dark banded
// knee-guards and boots, and a blood-stained crescent greataxe on a gnarled, red-wrapped haft.
MODEL_DEFS.ashExecutioner = {
  extends: 'ashBase', faction: 'ashen', fit: 1.02,
  proportions: { shoulderX: 0.37, torsoW: 0.25, torsoD: 0.17, armR: 0.072, legR: 0.088, headR: 0.122, handR: 0.062, footLen: 0.3 },
  limbs: { armL: { len: 1.04, thick: 1.06 }, armR: { len: 1.02, thick: 1.0 } },
  posture: { chest: [0.06, 0, 0], neck: [0.04, 0, 0], head: [0.02, -0.05, 0], elbowL: [-0.28, 0, 0.06], elbowR: [-0.38, 0, -0.04] },
  materials: {
    skin: { tex: 'execSkin', tint: 0xdca07c, decay: 0.35 },
    hair: { tex: 'margitFur', tint: 0x9e4828, decay: 0.35 },
    patch: { tex: 'crackedLeather', tint: 0x201c1a, decay: 0.4 },
    plumage: { tex: 'execPlumage', tint: 0xd0cac2, decay: 0.45, double: true },
    sleeve: { tex: 'rottenCloth', tint: 0x9e4224, decay: 0.5, double: true },
    sash: { tex: 'rottenCloth', tint: 0xc89658, decay: 0.45, double: true },
    cord: { tex: 'rottenCloth', tint: 0xb83824, decay: 0.4, double: true },
    skirt: { tex: 'execSkirt', tint: 0x9a8c68, decay: 0.5, double: true },
    trim: { tex: 'execTrim', tint: 0xd0c294, decay: 0.35, double: true },
    leather: { tex: 'crackedLeather', tint: 0x5c3828, decay: 0.55 },
    darkLeather: { tex: 'crackedLeather', tint: 0x282422, decay: 0.6 },
    gauntlet: { tex: 'rogueScales', tint: 0x7c7e86, decay: 0.45 },
    iron: { tex: 'dentedSteel', tint: 0x5a5856, decay: 0.65 },
    blade: { tex: 'execBlade', tint: 0xa89e9a, decay: 0.65 },
    haft: { tex: 'bone', tint: 0x9a8878, decay: 0.6 },
    eye: { glow: 0xffe0b8 },
  },
  body: { torso: 'plumage', pelvis: 'skirt', arms: 'sleeve', legs: 'darkLeather', head: 'skin', neck: 'skin', hands: 'darkLeather', feet: 'darkLeather' },
  bones: {
    tasselL: { parent: 'chest', at: [0.06, 0.38, 0.19] },
    tasselR: { parent: 'chest', at: [-0.07, 0.36, 0.19] },
    cloakB: { parent: 'chest', at: [0, 0.52, -0.2] },
  },
  parts: [
    // Head: swept-back auburn hair, black diagonal eyepatch over the left eye, sculpted nose and brow.
    { use: 'sweptHair', slot: 'hair', bone: 'head', size: 1.02 },
    { use: 'eyePatch', slot: 'patch', skin: 'skin', hair: 'hair', bone: 'head', side: 1 },
    // Torso: open V-collar, feathered scale jerkin and cascading rows of pointed feather-scales.
    { use: 'openCollar', slot: 'plumage', bone: 'chest' },
    { use: 'jerkin', slot: 'plumage', bone: 'chest' },
    { use: 'featherMantle', slot: 'plumage', bone: 'chest', rows: [
      { y: 0.49, r: 0.31, n: 8, w: 0.072, h: 0.16, tilt: 0.26 },
      { y: 0.35, r: 0.285, n: 8, w: 0.07, h: 0.165, tilt: 0.2 },
      { y: 0.22, r: 0.255, n: 7, w: 0.068, h: 0.155, tilt: 0.16 },
    ] },
    // Lower feather-scale peplum below the waist sash, over the embroidered skirt.
    { use: 'featherMantle', slot: 'plumage', bone: 'spin', rows: [
      { y: -0.02, r: 0.235, n: 8, w: 0.07, h: 0.17, tilt: 0.18 },
      { y: -0.14, r: 0.25, n: 7, w: 0.072, h: 0.17, tilt: 0.14 },
    ] },
    // Waist sash, diagonal strap, hanging cord tassels, side pouch, and the embroidered olive-tan skirt.
    { use: 'waistSash', slot: 'sash', cord: 'cord', bone: 'spin' },
    { use: 'pouch', slot: 'leather', bone: 'spin', x: -0.22, z: 0.04 },
    { use: 'borderedSkirt', slot: 'skirt', trim: 'trim', bone: 'spin', top: -0.02, hem: -0.45, border: 0.095 },
    // Shoulders and arms: feathered pauldrons over rust-orange sleeves, smooth leather right bracer, scaled left gauntlet.
    { use: 'pauldron', slot: 'plumage', bone: 'armL', size: 1.35 },
    { use: 'pauldron', slot: 'plumage', bone: 'armR', size: 1.35, side: -1 },
    { use: 'sleeve', slot: 'sleeve', bone: 'armL', r0: 0.085, r1: 0.115, len: 0.28, seed: 3 },
    { use: 'sleeve', slot: 'sleeve', bone: 'armR', r0: 0.085, r1: 0.115, len: 0.28, seed: 6 },
    { use: 'plateBands', slot: 'leather', bone: 'elbowR', from: 0.05, to: 0.27, radius: 0.062, count: 2, flare: 0.12 },
    { use: 'plateBands', slot: 'gauntlet', bone: 'elbowL', from: 0.03, to: 0.29, radius: 0.068, count: 4, flare: 0.18, cop: 0.072 },
    { use: 'spikes', slot: 'gauntlet', bone: 'elbowL', size: 0.55, at: [[0.06, -0.08, 0.02], [0.062, -0.16, 0.02], [0.06, -0.24, 0.02]] },
    // Legs: dark leather cuisses, banded knee-guards with cops, and dark boots.
    { use: 'plateBands', slot: 'darkLeather', bone: 'kneeL', from: 0.03, to: 0.36, radius: 0.076, count: 3, flare: 0.08, cop: 0.082 },
    { use: 'plateBands', slot: 'darkLeather', bone: 'kneeR', from: 0.03, to: 0.36, radius: 0.076, count: 3, flare: 0.08, cop: 0.082 },
    { use: 'boot', slot: 'darkLeather', bone: 'kneeL' },
    { use: 'boot', slot: 'darkLeather', bone: 'kneeR' },
    // Hanging red-orange chest cords and short feathered back mantle.
    { use: 'clothStrip', slot: 'cord', bone: 'tasselL', w: 0.045, len: 0.36, seed: 5 },
    { use: 'clothStrip', slot: 'cord', bone: 'tasselR', w: 0.05, len: 0.42, seed: 9 },
    { use: 'capeSegment', slot: 'plumage', bone: 'cloakB', w0: 0.52, w1: 0.62, len: 0.46, bow: 0.85, ragged: true, seed: 4 },
  ],
  weapon: { use: 'executionerAxe', slots: { blade: 'blade', grip: 'haft', guard: 'iron', wrap: 'cord' } },
  eyes: { color: 0xffe0b8, size: 0.011, spread: 0.042, at: [0, 0.12, 0.108] },
  anim: {
    idle: { breathRate: 1.1, breath: 0.016, headDrift: 0.04, sway: 0.015, twitch: 0 },
    walk: { twist: 0.12, roll: 0.04, headNod: 0.04, elbow: 0.3, drag: 0 },
    death: { buckle: 1, slump: 0.8 }, flinch: { head: 0.5, chest: 0.5, arms: 0.5 },
    cloth: [
      { bone: 'tasselL', gain: 0.14, k: 58, damp: 4.8, flutter: 0.05 },
      { bone: 'tasselR', gain: 0.16, k: 54, damp: 4.5, flutter: 0.06 },
      { bone: 'cloakB', gain: 0.09, k: 42, damp: 4.2, flutter: 0.04 },
    ],
  },
};

// ---- Level 5: the castle's own creatures (v4.3). None of them is a living person. ----------------------------------
// Gargoyle: carved, weathered stone, hunched forward, horned, stone wings spread from the back, clawed hands.
MODEL_DEFS.gargoyle = {
  extends: 'hollowBase', faction: 'castle', budget: 'enemy', fit: 1.12,
  proportions: { shoulderX: 0.33, torsoW: 0.22, torsoD: 0.16, armR: 0.06, legR: 0.085, headR: 0.13, handR: 0.06, footLen: 0.3 },
  limbs: { armL: { len: 1.15 }, armR: { len: 1.15 } },
  posture: { chest: [0.62, 0, 0], neck: [-0.25, 0, 0], head: [-0.2, 0, 0], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0], wingL: [0.35, 0.2, -1.05], wingR: [0.35, -0.2, 1.05] },
  materials: {
    stone: { tex: 'stone', tint: 0x8a877e, decay: 0.75 },
    moss: { tex: 'stone', tint: 0x6a6e5a, decay: 0.9 },
    wing: { tex: 'stone', tint: 0x75726a, decay: 0.8, double: true },
    eye: { glow: 0x9ac8ff },
  },
  body: { torso: 'stone', pelvis: 'stone', arms: 'stone', legs: 'stone', head: 'stone', neck: 'stone', hands: 'stone', feet: 'stone' },
  bones: { wingL: { parent: 'chest', at: [0.12, 0.5, -0.17] }, wingR: { parent: 'chest', at: [-0.12, 0.5, -0.17] } },
  parts: [
    { use: 'spineBumps', slot: 'moss', bone: 'chest' },
    { use: 'horns', slot: 'stone', bone: 'head', size: 0.75 },
    { use: 'capeSegment', slot: 'wing', bone: 'wingL', w0: 0.12, w1: 0.55, len: 0.75, bow: 0.4 },
    { use: 'capeSegment', slot: 'wing', bone: 'wingR', w0: 0.12, w1: 0.55, len: 0.75, bow: 0.4 },
    { use: 'spikes', slot: 'moss', bone: 'armL', size: 0.9 }, { use: 'spikes', slot: 'moss', bone: 'armR', size: 0.9, side: -1 },
  ],
  weapon: null,
  eyes: { color: 0x9ac8ff, size: 0.018, spread: 0.055, at: [0, 0.1, 0.11] },
  anim: { attackMul: 1, idle: { breathRate: 0.4, breath: 0.004, headDrift: 0.15, sway: 0.0, twitch: 0.8 }, walk: { twist: 0.25, roll: 0.08, headNod: 0.05, elbow: 0.7, drag: 0.2 },
          flinch: { head: 0.6, chest: 0.6, arms: 0.6 }, death: { buckle: 1, slump: 1 },
          cloth: [{ bone: 'wingL', gain: 0.05, k: 80, damp: 7, flutter: 0.01 }, { bone: 'wingR', gain: 0.05, k: 80, damp: 7, flutter: 0.01 }] },
};
// Empty Sentinel: a giant suit of plate with nothing inside: the gaps between the plates are black, and cold blue light
// shows through the visor. Tarnished bronze and slate, the castle's colours.
MODEL_DEFS.emptySentinel = {
  extends: 'ironKnight', faction: 'castle', budget: 'enemy', fit: 1.0,
  proportions: { shoulderX: 0.4, torsoW: 0.26, torsoD: 0.18, armR: 0.07, legR: 0.09, headR: 0.13, handR: 0.065, footLen: 0.32 },
  posture: { chest: [0.02, 0, 0], neck: [0.05, 0, 0], head: [0.08, 0, 0.06], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0] },
  materials: {
    plate: { tex: 'dentedSteel', tint: 0x6a6450, decay: 0.75 },
    void: { tex: 'ashSoot', tint: 0x202024, decay: 0.3 },
    rust: { tex: 'rustedIron', tint: 0x7a6a5a, decay: 0.85 },
    tabard: { tex: 'rottenCloth', tint: 0x3e4a58, decay: 0.85, double: true },
    wood: { tex: 'barkMoss', tint: 0x5a4a3a, decay: 0.4 },
    blade: { tex: 'rustedIron', tint: 0x8a8680, decay: 0.6 },
    eye: { glow: 0x9ad0ff },
  },
  body: { torso: 'void', pelvis: 'void', arms: 'void', legs: 'void', head: null, neck: 'void', hands: 'plate', feet: 'plate' },
  bones: IRONBOUND_BONES,
  parts: [
    { use: 'jerkin', slot: 'plate', bone: 'chest' }, { use: 'mailSkirt', slot: 'rust', bone: 'spin' },
    { use: 'greatHelm', slot: 'plate', bone: 'head', size: 1.25, crest: 0.18 },
    { use: 'pauldron', slot: 'plate', bone: 'armL', size: 1.6 }, { use: 'pauldron', slot: 'plate', bone: 'armR', size: 1.6, side: -1 },
    { use: 'wraps', slot: 'plate', bone: 'elbowL', from: 0.06, to: 0.28, radius: 0.07, count: 2 }, { use: 'wraps', slot: 'plate', bone: 'elbowR', from: 0.06, to: 0.28, radius: 0.07, count: 2 },
    { use: 'wraps', slot: 'plate', bone: 'legL', from: 0.04, to: 0.3, radius: 0.1, count: 2 }, { use: 'wraps', slot: 'plate', bone: 'legR', from: 0.04, to: 0.3, radius: 0.1, count: 2 },
    { use: 'wraps', slot: 'plate', bone: 'kneeL', from: 0.04, to: 0.34, radius: 0.09, count: 2 }, { use: 'wraps', slot: 'plate', bone: 'kneeR', from: 0.04, to: 0.34, radius: 0.09, count: 2 },
    { use: 'clothStrip', slot: 'tabard', bone: 'loinF', w: 0.3, len: 0.7, seed: 4 }, { use: 'clothStrip', slot: 'tabard', bone: 'loinB', w: 0.32, len: 0.8, seed: 8 },
  ],
  weapon: { use: 'halberd', slots: { blade: 'blade', grip: 'wood', guard: 'rust' } },
  eyes: { color: 0x9ad0ff, size: 0.02, spread: 0.06, at: [0, 0.14, 0.17] },
  anim: IRONBOUND_ANIM,
};
// Toll Wisp: a hooded robe hanging round blue flame, a little bell where a face would be. No body: the arms and the
// hands are flame. It glides; the robe hides where legs would be.
MODEL_DEFS.tollWisp = {
  extends: 'hollowBase', faction: 'castle', budget: 'enemy', fit: 1.0,
  proportions: { shoulderX: 0.26, torsoW: 0.16, torsoD: 0.12, armR: 0.04, legR: 0.05, headR: 0.11, handR: 0.045, footLen: 0.2 },
  limbs: {},
  posture: { chest: [0.18, 0, 0], neck: [0.15, 0, 0], head: [0.1, 0, 0], elbowL: [-0.6, 0, 0], elbowR: [-0.6, 0, 0] },
  materials: {
    flame: { glow: 0x2a5ab8 },
    robe: { tex: 'rottenCloth', tint: 0x3a4250, decay: 0.85, double: true },
    bell: { tex: 'dentedSteel', tint: 0x9a8050, decay: 0.6 },
    eye: { glow: 0xc8e4ff },
  },
  body: { torso: 'flame', pelvis: 'flame', arms: 'flame', legs: 'flame', head: null, neck: 'flame', hands: 'flame', feet: 'flame' },
  bones: { robeF: { parent: 'spin', at: [0, 0.0, 0.12] }, robeB: { parent: 'spin', at: [0, 0.0, -0.12] } },
  parts: [
    { use: 'hood', slot: 'robe', bone: 'head', size: 1.15, tail: 0.4, close: 0.2 },
    { use: 'bellHelm', slot: 'bell', bone: 'head', size: 0.5 },
    { use: 'bellSkirt', slot: 'robe', bone: 'spin' },
    { use: 'clothStrip', slot: 'robe', bone: 'robeF', w: 0.32, len: 0.85, seed: 3 }, { use: 'clothStrip', slot: 'robe', bone: 'robeB', w: 0.34, len: 0.9, seed: 7 },
  ],
  weapon: null,
  eyes: { color: 0xc8e4ff, size: 0.016, spread: 0.04, at: [0, 0.06, 0.1] },
  anim: { attackMul: 1, idle: { breathRate: 1.8, breath: 0.03, headDrift: 0.2, sway: 0.06, twitch: 0 }, walk: { twist: 0.05, roll: 0.02, headNod: 0.02, elbow: 0.2, drag: 0 },
          flinch: { head: 1, chest: 1, arms: 1 }, death: { buckle: 0.6, slump: 0.6 },
          cloth: [{ bone: 'robeF', gain: 0.2, k: 40, damp: 3.5, flutter: 0.1 }, { bone: 'robeB', gain: 0.22, k: 36, damp: 3.2, flutter: 0.12 }] },
};
