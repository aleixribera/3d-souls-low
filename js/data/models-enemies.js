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

MODEL_DEFS.ironWarden = {   // a wall of shield: a tall crested helm, a banner on its back
  extends: 'ironKnight', fit: 1.0,
  proportions: { torsoW: 0.23, torsoD: 0.16, armR: 0.062 },
  materials: { ...IRONBOUND_MATS, plate: { tex: 'dentedSteel', tint: 0x5c6670, decay: 0.6 }, tabard: { tex: 'rottenCloth', tint: 0x4a5a6a, decay: 0.7, double: true } },
  bones: { ...IRONBOUND_BONES, banner: { parent: 'chest', at: [0, 0.55, -0.2] } },
  parts: [
    { use: 'jerkin', slot: 'plate', bone: 'chest' }, { use: 'mailSkirt', slot: 'mail', bone: 'spin' }, { use: 'belt', slot: 'leather', bone: 'spin' },
    { use: 'greatHelm', slot: 'plate', bone: 'head', size: 1.1, crest: 0.2 },
    { use: 'pauldron', slot: 'plate', bone: 'armR', size: 1.15, side: -1 },
    { use: 'wraps', slot: 'plate', bone: 'elbowR', from: 0.06, to: 0.28, radius: 0.056, count: 3 },
    { use: 'wraps', slot: 'plate', bone: 'kneeL', from: 0.05, to: 0.32, radius: 0.078, count: 3 }, { use: 'wraps', slot: 'plate', bone: 'kneeR', from: 0.05, to: 0.32, radius: 0.078, count: 3 },
    ...tabardParts(0.26, 0.6),
    { use: 'clothStrip', slot: 'tabard', bone: 'banner', w: 0.2, len: 0.9, seed: 5 }, { use: 'clothStrip', slot: 'stripe', bone: 'banner', w: 0.05, len: 0.8, seed: 5, dz: -0.01 },
    { use: 'kiteShield', slot: 'tabard', metal: 'plate', bone: 'elbowL', w: 0.62, h: 1.0, at: [0.06, -0.14, 0.19] },
  ],
  weapon: { use: 'wandererSword', slots: { blade: 'blade', grip: 'leather', guard: 'plate' } },
  eyes: { color: 0x9ab8ff, size: 0.016, spread: 0.055, at: [0, 0.125, 0.155] },
  anim: { ...IRONBOUND_ANIM, cloth: [...IRONBOUND_ANIM.cloth, { bone: 'banner', gain: 0.22, k: 40, damp: 3.6, flutter: 0.06 }] },
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
MODEL_DEFS.ashLancer = {   // upright, a peaked hood and long ash cloak, a spear far taller than itself
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

MODEL_DEFS.ashExecutioner = {   // bare shoulders, a closed pointed hood with ember slits, a huge greataxe
  extends: 'ashLancer', fit: 1.02,
  proportions: { shoulderX: 0.38, torsoW: 0.26, torsoD: 0.17, armR: 0.08, legR: 0.09, headR: 0.125, handR: 0.065, footLen: 0.3 },
  posture: { chest: [0.14, 0, 0], neck: [0.08, 0, 0], head: [0.03, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: { ...ASHEN_MATS, soot: { tex: 'ashSoot', tint: 0x6a6460, decay: 0.8, double: true } },
  body: { torso: 'skin', pelvis: 'leather', arms: 'skin', legs: 'cloth', head: 'skin', neck: 'skin', hands: 'leather', feet: 'leather' },
  bones: { loinF: { parent: 'spin', at: [0.0, -0.02, 0.17] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.17] } },
  parts: [
    { use: 'hood', slot: 'soot', bone: 'head', close: 0.65, size: 1.1 }, { use: 'hoodPeak', slot: 'soot', bone: 'head', size: 1.1, height: 1.1 },
    { use: 'belt', slot: 'leather', bone: 'spin' }, { use: 'pauldron', slot: 'iron', bone: 'armR', size: 1.6, side: -1 },
    { use: 'clothStrip', slot: 'leather', bone: 'loinF', w: 0.36, len: 0.7, seed: 3 }, { use: 'clothStrip', slot: 'soot', bone: 'loinB', w: 0.3, len: 0.6, seed: 7 },
    { use: 'wraps', slot: 'leather', bone: 'elbowL', from: 0.04, to: 0.28, radius: 0.062, count: 4 }, { use: 'wraps', slot: 'leather', bone: 'elbowR', from: 0.04, to: 0.28, radius: 0.062, count: 4 },
    { use: 'wraps', slot: 'leather', bone: 'kneeL', from: 0.04, to: 0.34, radius: 0.075, count: 3 }, { use: 'wraps', slot: 'leather', bone: 'kneeR', from: 0.04, to: 0.34, radius: 0.075, count: 3 },
  ],
  weapon: { use: 'greatAxe', slots: { blade: 'blade', grip: 'wood', guard: 'iron' } },
  eyes: { color: 0xff5a20, size: 0.016, spread: 0.05, at: [0, 0.095, 0.15] },
  anim: {
    idle: { breathRate: 1.0, breath: 0.015, headDrift: 0.03, sway: 0.01, twitch: 0 }, death: { buckle: 1, slump: 0.8 }, flinch: { head: 0.5, chest: 0.5, arms: 0.5 },
    cloth: [{ bone: 'loinF', gain: 0.12, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.16, k: 50, damp: 4.5, flutter: 0.05 }],
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
