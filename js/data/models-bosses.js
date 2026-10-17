'use strict';
// Phase 6: boss models (the format is explained in js/data/models.js; texture size up to 512, budget 6000 triangles).
// Each boss has one focal point you could draw from memory:
//   Giant Skeleton   (OLD BONES)  a spectral giant: a huge domed skull hung low, pale glowing bone, a white-hot spine
//   Pillager Captain (ASHEN HOST) a horned helm, a cloak torn into strips, a halberd whose edge glows
//   Bell Warden      (IRONBOUND)  a verdigris bronze colossus: bell helm, bell skirt, a temple bell for a hammer

MODEL_DEFS.giantSkeleton = {
  // v5.5, after the reference art: a spectral giant. Pale translucent bone lit from within (strong rim, bright
  // vein texture, a cold aura), a huge domed skull hung low before the chest on a long neck, a deep rib cage,
  // long femur-thick limbs with heavy knuckled joints, and a spine that burns white down to the pelvis.
  extends: 'hollowBase', faction: 'oldbones', budget: 'boss', fit: 1.04, limbSides: 8, rim: 2.4,
  proportions: { shoulderX: 0.34, torsoW: 0.16, torsoD: 0.12, armR: 0.072, legR: 0.08, headR: 0.29, handR: 0.06, footLen: 0.32 },
  limbs: { armL: { len: 1.3, thick: 1.15 }, legL: { thick: 1.15 } },
  posture: { chest: [0.55, 0, 0.04], neck: [0.9, 0, -0.06], head: [-0.45, 0, 0.1], elbowL: [-0.25, 0, 0], elbowR: [-0.3, 0, 0] },
  materials: {
    bone: { tex: 'spectralBone', tint: 0xd8dde6, decay: 0.55, size: 512 },
    dark: { tex: 'spectralBone', tint: 0xaab0bc, decay: 0.8 },
    void: { tex: 'ashSoot', tint: 0x181a20, decay: 0.4 },
    core: { glow: 0xe8eeff },
    eye: { glow: 0xc8d8ff },
  },
  body: { torso: null, pelvis: 'bone', arms: 'bone', legs: 'bone', head: 'bone', neck: 'bone', hands: 'bone', feet: 'bone' },
  parts: [
    { use: 'ribcage', slot: 'bone', bone: 'chest', full: 8, broken: 8, whole: true, size: 1.3, spine: 0.16 },
    { use: 'skullFace', slot: 'bone', void: 'void', bone: 'head' },
    // the burning spine: white-hot vertebrae from the ribs down into the pelvis
    { use: 'knobs', slot: 'core', bone: 'chest', at: [[0, 0.04, -0.16, 0.032], [0, 0.11, -0.165, 0.03], [0, 0.18, -0.17, 0.028], [0, 0.25, -0.17, 0.026], [0, 0.32, -0.17, 0.024]] },
    { use: 'knobs', slot: 'core', bone: 'spin', at: [[0, 0.0, -0.08, 0.036], [0, 0.07, -0.095, 0.036], [0, 0.14, -0.11, 0.035], [0, 0.21, -0.125, 0.034], [0, 0.28, -0.14, 0.033]] },
    // heavy knuckled joints: femur heads at the shoulders and hips, thick condyles at elbows, wrists and knees
    { use: 'knobs', slot: 'dark', bone: 'armL', at: [[0, 0, 0, 0.11], [0.03, -0.05, 0.03, 0.07]] }, { use: 'knobs', slot: 'dark', bone: 'armR', at: [[0, 0, 0, 0.11], [-0.03, -0.05, 0.03, 0.07]] },
    { use: 'knobs', slot: 'dark', bone: 'elbowL', at: [[0.03, 0, 0, 0.08], [-0.03, 0, 0, 0.07], [0, -0.36, 0, 0.07]] }, { use: 'knobs', slot: 'dark', bone: 'elbowR', at: [[0.03, 0, 0, 0.08], [-0.03, 0, 0, 0.07], [0, -0.34, 0, 0.07]] },
    { use: 'knobs', slot: 'dark', bone: 'kneeL', at: [[0.03, 0, 0.01, 0.085], [-0.03, 0, 0.01, 0.08]] }, { use: 'knobs', slot: 'dark', bone: 'kneeR', at: [[0.03, 0, 0.01, 0.085], [-0.03, 0, 0.01, 0.08]] },
    { use: 'knobs', slot: 'dark', bone: 'legL', at: [[0, 0, 0, 0.1]] }, { use: 'knobs', slot: 'dark', bone: 'legR', at: [[0, 0, 0, 0.1]] },
    { use: 'fingers', slot: 'bone', bone: 'elbowL', at: 0.4, r: 0.022, len: 0.24, spread: 0.045 }, { use: 'fingers', slot: 'bone', bone: 'elbowR', at: 0.38, r: 0.022, len: 0.24, spread: 0.045 },
  ],
  weapon: { use: 'boneClub', slots: { blade: 'bone', grip: 'bone', guard: 'dark' } },
  eyes: { color: 0xc8d8ff, size: 0.024, spread: 0.11, at: [0, 0.28, 0.21] },
  aura: { color: 0xcfdcff, size: 3.6, opacity: 0.16 },
  anim: {
    idle: { breathRate: 0.6, breath: 0.02, headDrift: 0.1, sway: 0.025, twitch: 0 }, walk: { twist: 0.12, roll: 0.06, headNod: 0.07, elbow: 0.3, drag: 0.35 },
    flinch: { head: 0.4, chest: 0.4, arms: 0.4 }, death: { buckle: 1.2, slump: 1 },
  },
};

const CAPTAIN_MATS = {
  skin: { tex: 'paleSkin', tint: 0x6a5e58, decay: 0.85 },
  mail: { tex: 'dentedSteel', tint: 0x3e3c3a, decay: 0.9, size: 512 },
  iron: { tex: 'rustedIron', tint: 0x6a5e58, decay: 0.8 },
  plate: { tex: 'dentedSteel', tint: 0x4a4644, decay: 0.85, size: 512 },
  cloak: { tex: 'rottenCloth', tint: 0x4a3a36, decay: 0.8, size: 512, double: true },
  cloakHem: { tex: 'tatteredFabric', tint: 0x4a3a36, decay: 0.85, size: 512, double: true },
  scorch: { tex: 'rottenCloth', tint: 0x7a3a2c, decay: 0.85, double: true },
  sash: { tex: 'rottenCloth', tint: 0xb03a22, decay: 0.5, double: true },
  leather: { tex: 'crackedLeather', tint: 0x56585a, decay: 0.8 },
  blade: { tex: 'dentedSteel', tint: 0x6a6460, decay: 0.8, size: 512 },
  wood: { tex: 'barkMoss', tint: 0x5a4a44, decay: 0.3 },
  eye: { glow: 0xff7a30 },
};
MODEL_DEFS.pillagerCaptain = {
  extends: 'ashLancer', faction: 'ashen', budget: 'boss', fit: 1.02, limbSides: 8,
  proportions: { shoulderX: 0.4, torsoW: 0.26, torsoD: 0.18, armR: 0.07, legR: 0.09, headR: 0.13, handR: 0.065, footLen: 0.32 },
  posture: { chest: [0.1, 0, 0], neck: [0.06, 0, 0], head: [0.02, 0, 0.03], elbowL: [-0.35, 0, 0], elbowR: [-0.4, 0, 0] },
  materials: CAPTAIN_MATS,
  body: { torso: 'mail', pelvis: 'scorch', arms: 'mail', legs: 'mail', head: null, neck: 'mail', hands: 'plate', feet: 'plate' },
  bones: {
    loinF: { parent: 'spin', at: [0.0, -0.02, 0.17] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.17] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.24] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] }, capeD: { parent: 'capeC', at: [0, -0.34, 0] },
  },
  parts: [
    { use: 'jerkin', slot: 'plate', bone: 'chest' }, { use: 'mailSkirt', slot: 'mail', bone: 'spin' }, { use: 'belt', slot: 'leather', bone: 'spin' },
    { use: 'greatHelm', slot: 'plate', bone: 'head', size: 1.2 }, { use: 'horns', slot: 'iron', bone: 'head', size: 1.5 },
    { use: 'pauldron', slot: 'plate', bone: 'armL', size: 1.6 }, { use: 'spikes', slot: 'iron', bone: 'armL', size: 1.3 },
    { use: 'pauldron', slot: 'plate', bone: 'armR', size: 1.6, side: -1 }, { use: 'spikes', slot: 'iron', bone: 'armR', size: 1.3, side: -1 },
    { use: 'wraps', slot: 'plate', bone: 'elbowL', from: 0.05, to: 0.28, radius: 0.07, count: 3 }, { use: 'wraps', slot: 'plate', bone: 'elbowR', from: 0.05, to: 0.28, radius: 0.07, count: 3 },
    { use: 'wraps', slot: 'plate', bone: 'kneeL', from: 0.04, to: 0.34, radius: 0.085, count: 3 }, { use: 'wraps', slot: 'plate', bone: 'kneeR', from: 0.04, to: 0.34, radius: 0.085, count: 3 },
    { use: 'clothStrip', slot: 'scorch', bone: 'loinF', w: 0.3, len: 0.6, seed: 3 }, { use: 'clothStrip', slot: 'sash', bone: 'loinF', w: 0.08, len: 0.55, seed: 3, dz: 0.012 },
    { use: 'clothStrip', slot: 'scorch', bone: 'loinB', w: 0.3, len: 0.6, seed: 7 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeA', w0: 0.56, w1: 0.68, len: 0.42, bow: 1.0 }, { use: 'capeSegment', slot: 'cloak', bone: 'capeB', w0: 0.68, w1: 0.82, len: 0.42, bow: 0.8 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeC', w0: 0.82, w1: 0.92, len: 0.34, bow: 0.6 },
    { use: 'clothStrip', slot: 'cloak', bone: 'capeD', w: 0.26, len: 0.5, seed: 1, dx: -0.28 }, { use: 'clothStrip', slot: 'cloak', bone: 'capeD', w: 0.24, len: 0.7, seed: 2, dx: 0.0 },
    { use: 'clothStrip', slot: 'cloak', bone: 'capeD', w: 0.26, len: 0.45, seed: 3, dx: 0.28 },
  ],
  weapon: { use: 'halberd', slots: { blade: 'blade', grip: 'wood', guard: 'iron' } },
  embers: { head: [0, -0.1, 2.0], edge: { size: [0.07, 0.42, 0.06], at: [0, -0.3, 1.86] } },
  eyes: { color: 0xff7a30, size: 0.02, spread: 0.06, at: [0, 0.125, 0.18] },
  anim: {
    idle: { breathRate: 1.1, breath: 0.015, headDrift: 0.03, sway: 0.01, twitch: 0 }, walk: { twist: 0.1, roll: 0.04, headNod: 0.04, elbow: 0.3, drag: 0 },
    flinch: { head: 0.4, chest: 0.4, arms: 0.4 }, death: { buckle: 1, slump: 0.8 },
    cloth: [{ bone: 'loinF', gain: 0.12, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.16, k: 50, damp: 4.5, flutter: 0.05 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 36, damp: 3.8, flutter: 0.045 },
            { bone: 'capeC', gain: 0.07, k: 32, damp: 3.4, flutter: 0.06, sideways: 1.2 }, { bone: 'capeD', gain: 0.1, k: 24, damp: 2.8, flutter: 0.09, sideways: 1.4 }],
  },
};

MODEL_DEFS.bellWarden = {
  extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8,
  proportions: { shoulderX: 0.43, torsoW: 0.3, torsoD: 0.2, armR: 0.085, legR: 0.1, headR: 0.14, handR: 0.075, footLen: 0.34 },
  posture: { chest: [0.1, 0, 0], neck: [0.06, 0, 0], head: [0.02, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0x7a7468, decay: 0.8 },
    bronze: { tex: 'dentedSteel', tint: 0x5a7a62, decay: 0.75, size: 512, double: true },
    rust: { tex: 'rustedIron', tint: 0x6a7a62, decay: 0.8 },
    iron: { tex: 'dentedSteel', tint: 0x4a5058, decay: 0.8 },
    cloth: { tex: 'rottenCloth', tint: 0x4a5a48, decay: 0.8, double: true },
    leather: { tex: 'crackedLeather', tint: 0x5e6860, decay: 0.7 },
    eye: { glow: 0xb8ffd0 },
  },
  body: { torso: 'bronze', pelvis: 'bronze', arms: 'bronze', legs: 'bronze', head: null, neck: 'iron', hands: 'iron', feet: 'iron' },
  bones: { loinF: { parent: 'spin', at: [0.0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.2] } },
  parts: [
    { use: 'jerkin', slot: 'bronze', bone: 'chest' }, { use: 'bellSkirt', slot: 'bronze', bone: 'spin' }, { use: 'belt', slot: 'iron', bone: 'spin' },
    { use: 'bellHelm', slot: 'bronze', bone: 'head', size: 1.25 },
    { use: 'pauldron', slot: 'bronze', bone: 'armL', size: 1.6 }, { use: 'pauldron', slot: 'bronze', bone: 'armR', size: 1.6, side: -1 },
    { use: 'chain', slot: 'iron', bone: 'chest', from: [-0.2, 0.56, 0.1], to: [0.2, 0.56, 0.1], links: 9, sag: 0.1 },
    { use: 'chain', slot: 'iron', bone: 'chest', from: [0.22, 0.52, 0.12], to: [0.02, 0.0, 0.21], links: 9, sag: 0.04 },
    { use: 'wraps', slot: 'bronze', bone: 'elbowL', from: 0.05, to: 0.28, radius: 0.09, count: 3 }, { use: 'wraps', slot: 'bronze', bone: 'elbowR', from: 0.05, to: 0.28, radius: 0.09, count: 3 },
    { use: 'wraps', slot: 'rust', bone: 'kneeL', from: 0.04, to: 0.34, radius: 0.1, count: 3 }, { use: 'wraps', slot: 'bronze', bone: 'kneeR', from: 0.04, to: 0.34, radius: 0.1, count: 3 },
    { use: 'clothStrip', slot: 'cloth', bone: 'loinF', w: 0.24, len: 0.5, seed: 2 }, { use: 'clothStrip', slot: 'cloth', bone: 'loinB', w: 0.3, len: 0.6, seed: 5 },
  ],
  weapon: { use: 'bellMaul', slots: { blade: 'bronze', guard: 'rust', grip: 'iron' } },
  eyes: { color: 0xb8ffd0, size: 0.022, spread: 0.07, at: [0, 0.17, 0.2] },
  anim: {
    idle: { breathRate: 0.9, breath: 0.014, headDrift: 0.03, sway: 0.01, twitch: 0 }, walk: { twist: 0.07, roll: 0.03, headNod: 0.03, elbow: 0.25, drag: 0 },
    flinch: { head: 0.4, chest: 0.4, arms: 0.4 }, death: { buckle: 1, slump: 0.7 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 70, damp: 6, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 60, damp: 5.5, flutter: 0.04 }],
  },
};

// ---- Level 5 (v4.3) -------------------------------------------------------------------------------------------------
// Aldric, the Gaoler King: the castle's lord. Ironbound plate gone dark bronze, a slate tabard with the castle's tarnished
// gold stripe, a crown of shackles (a ring of chain round the helm and short iron spikes), chains across the chest, a
// long ash-grey cloak and the great gaoler's blade. Embers along the blade light only in his second phase (js/finale.js).
MODEL_DEFS.varn = {
  extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8,
  proportions: { shoulderX: 0.42, torsoW: 0.28, torsoD: 0.19, armR: 0.078, legR: 0.095, headR: 0.135, handR: 0.07, footLen: 0.33 },
  posture: { chest: [0.06, 0, 0], neck: [0.04, 0, 0], head: [-0.02, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0x6a6258, decay: 0.8 },
    plate: { tex: 'dentedSteel', tint: 0x6a5a44, decay: 0.7, size: 512 },
    dark: { tex: 'dentedSteel', tint: 0x3a3836, decay: 0.8 },
    iron: { tex: 'rustedIron', tint: 0x5a5048, decay: 0.8 },
    mail: { tex: 'dentedSteel', tint: 0x4a4c50, decay: 0.85 },
    tabard: { tex: 'rottenCloth', tint: 0x3e4a58, decay: 0.75, double: true },
    stripe: { tex: 'rottenCloth', tint: 0x9a7a3a, decay: 0.6, double: true },
    cloak: { tex: 'rottenCloth', tint: 0x4a4644, decay: 0.7, size: 512, double: true },
    cloakHem: { tex: 'tatteredFabric', tint: 0x4a4644, decay: 0.7, size: 512, double: true },
    leather: { tex: 'crackedLeather', tint: 0x4e4a44, decay: 0.75 },
    blade: { tex: 'dentedSteel', tint: 0x8a8a8e, decay: 0.55, size: 512 },
    eye: { glow: 0xffc070 },
  },
  body: { torso: 'mail', pelvis: 'mail', arms: 'mail', legs: 'mail', head: null, neck: 'mail', hands: 'plate', feet: 'plate' },
  bones: {
    loinF: { parent: 'spin', at: [0.0, -0.02, 0.19] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.19] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.25] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] }, capeD: { parent: 'capeC', at: [0, -0.36, 0] },
  },
  parts: [
    { use: 'jerkin', slot: 'plate', bone: 'chest' }, { use: 'mailSkirt', slot: 'mail', bone: 'spin' }, { use: 'belt', slot: 'leather', bone: 'spin' },
    { use: 'greatHelm', slot: 'plate', bone: 'head', size: 1.22, crest: 0.12 },
    { use: 'chain', slot: 'iron', bone: 'head', from: [-0.2, 0.3, 0.05], to: [0.2, 0.3, 0.05], links: 9, sag: -0.04 },
    { use: 'spikes', slot: 'iron', bone: 'head', size: 1.4, at: [[0, 0.36, 0.08], [0.1, 0.34, 0.05], [-0.1, 0.34, 0.05], [0.16, 0.32, -0.02], [-0.16, 0.32, -0.02]] },
    { use: 'pauldron', slot: 'plate', bone: 'armL', size: 1.7 }, { use: 'spikes', slot: 'dark', bone: 'armL', size: 1.2 },
    { use: 'pauldron', slot: 'plate', bone: 'armR', size: 1.7, side: -1 }, { use: 'spikes', slot: 'dark', bone: 'armR', size: 1.2, side: -1 },
    { use: 'chain', slot: 'iron', bone: 'chest', from: [-0.24, 0.54, 0.12], to: [0.22, 0.2, 0.2], links: 10, sag: 0.04 },
    { use: 'chain', slot: 'iron', bone: 'chest', from: [0.24, 0.54, 0.12], to: [-0.22, 0.2, 0.2], links: 10, sag: 0.04 },
    { use: 'wraps', slot: 'dark', bone: 'elbowL', from: 0.05, to: 0.28, radius: 0.08, count: 3 }, { use: 'wraps', slot: 'dark', bone: 'elbowR', from: 0.05, to: 0.28, radius: 0.08, count: 3 },
    { use: 'wraps', slot: 'plate', bone: 'kneeL', from: 0.04, to: 0.34, radius: 0.095, count: 3 }, { use: 'wraps', slot: 'plate', bone: 'kneeR', from: 0.04, to: 0.34, radius: 0.095, count: 3 },
    { use: 'clothStrip', slot: 'tabard', bone: 'loinF', w: 0.32, len: 0.72, seed: 3 }, { use: 'clothStrip', slot: 'stripe', bone: 'loinF', w: 0.06, len: 0.66, seed: 3, dz: 0.012 },
    { use: 'clothStrip', slot: 'tabard', bone: 'loinB', w: 0.34, len: 0.8, seed: 6 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeA', w0: 0.6, w1: 0.72, len: 0.42, bow: 1.0 }, { use: 'capeSegment', slot: 'cloak', bone: 'capeB', w0: 0.72, w1: 0.86, len: 0.42, bow: 0.8 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeC', w0: 0.86, w1: 0.96, len: 0.36, bow: 0.6 },
    { use: 'capeSegment', slot: 'cloakHem', bone: 'capeD', w0: 0.96, w1: 1.0, len: 0.34, bow: 0.5, ragged: true, seed: 9 },
  ],
  weapon: { use: 'greatSword', slots: { blade: 'blade', grip: 'leather', guard: 'iron' } },
  embers: { head: [0, 0, 1.5], edge: { size: [0.04, 0.16, 1.2], at: [0, 0, 0.85] } },
  eyes: { color: 0xffc070, size: 0.022, spread: 0.065, at: [0, 0.14, 0.19] },
  anim: {
    idle: { breathRate: 0.95, breath: 0.014, headDrift: 0.03, sway: 0.01, twitch: 0 }, walk: { twist: 0.08, roll: 0.03, headNod: 0.03, elbow: 0.25, drag: 0 },
    flinch: { head: 0.35, chest: 0.35, arms: 0.35 }, death: { buckle: 1, slump: 0.6 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 66, damp: 5.6, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 56, damp: 5, flutter: 0.04 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 36, damp: 3.8, flutter: 0.045 },
            { bone: 'capeC', gain: 0.07, k: 32, damp: 3.4, flutter: 0.06, sideways: 1.2 }, { bone: 'capeD', gain: 0.1, k: 24, damp: 2.8, flutter: 0.09, sideways: 1.4 }],
  },
};
