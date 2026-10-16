'use strict';
// Phase 6: boss models (the format is explained in js/data/models.js; texture size up to 512, budget 6000 triangles).
// Each boss has one focal point you could draw from memory:
//   Giant Skeleton   (OLD BONES)  an oversized cracked skull, a spine bent forward, ribs open on one side, a thigh-bone club
//   Pillager Captain (ASHEN HOST) a horned helm, a cloak torn into strips, a halberd whose edge glows
//   Bell Warden      (IRONBOUND)  a verdigris bronze colossus: bell helm, bell skirt, a temple bell for a hammer

MODEL_DEFS.giantSkeleton = {
  extends: 'hollowSoldier', faction: 'oldbones', budget: 'boss', fit: 1.04, limbSides: 8,
  proportions: { shoulderX: 0.3, torsoW: 0.2, torsoD: 0.14, armR: 0.034, legR: 0.048, headR: 0.2, handR: 0.04, footLen: 0.3 },
  limbs: { armL: { len: 1.12, thick: 1 }, legL: { thick: 1.1 } },
  posture: { chest: [0.5, 0, 0.06], neck: [0.34, 0, -0.1], head: [0.1, 0, 0.12], elbowL: [-0.2, 0, 0], elbowR: [-0.3, 0, 0] },
  materials: {
    bone: { tex: 'bone', tint: 0xcfc8b2, decay: 0.65, size: 512 },
    dark: { tex: 'bone', tint: 0x8a8068, decay: 0.95 },
    void: { tex: 'ashSoot', tint: 0x3a3430, decay: 0.4 },
    shroud: { tex: 'rottenCloth', tint: 0x6a6252, decay: 0.9, double: true },
    shroudHem: { tex: 'tatteredFabric', tint: 0x6a6252, decay: 0.9, double: true },
    eye: { glow: 0x9be8c0 },
  },
  body: { torso: null, pelvis: 'bone', arms: 'bone', legs: 'bone', head: 'bone', neck: 'bone', hands: 'bone', feet: 'bone' },
  bones: {
    capeA: { parent: 'chest', at: [0, 0.55, -0.2] }, capeB: { parent: 'capeA', at: [0, -0.4, 0] },
    loinF: { parent: 'spin', at: [0.0, -0.02, 0.1] },
  },
  parts: [
    { use: 'ribcage', slot: 'bone', bone: 'chest', full: 7, broken: 4, size: 1.1, spine: 0.14 },
    { use: 'skullFace', slot: 'bone', void: 'void', bone: 'head' },
    { use: 'knobs', slot: 'dark', bone: 'armL', at: [[0, 0, 0, 0.07]] }, { use: 'knobs', slot: 'dark', bone: 'armR', at: [[0, 0, 0, 0.08]] },
    { use: 'knobs', slot: 'dark', bone: 'elbowL', at: [[0, 0, 0, 0.05]] }, { use: 'knobs', slot: 'dark', bone: 'elbowR', at: [[0, 0, 0, 0.055]] },
    { use: 'knobs', slot: 'dark', bone: 'kneeL', at: [[0, 0, 0.01, 0.065]] }, { use: 'knobs', slot: 'dark', bone: 'kneeR', at: [[0, 0, 0.01, 0.07]] },
    { use: 'knobs', slot: 'dark', bone: 'legL', at: [[0, 0, 0, 0.075]] }, { use: 'knobs', slot: 'dark', bone: 'legR', at: [[0, 0, 0, 0.075]] },
    { use: 'fingers', slot: 'bone', bone: 'elbowL', at: 0.34 }, { use: 'fingers', slot: 'bone', bone: 'elbowR', at: 0.31 },
    { use: 'capeSegment', slot: 'shroud', bone: 'capeA', w0: 0.4, w1: 0.46, len: 0.4, bow: 1.0 },
    { use: 'capeSegment', slot: 'shroudHem', bone: 'capeB', w0: 0.46, w1: 0.5, len: 0.42, bow: 0.8, ragged: true, seed: 6 },
    { use: 'clothStrip', slot: 'shroud', bone: 'loinF', w: 0.2, len: 0.45, seed: 4 },
  ],
  weapon: { use: 'boneClub', slots: { blade: 'bone', grip: 'bone', guard: 'dark' } },
  eyes: { color: 0x9be8c0, size: 0.028, spread: 0.084, at: [0, 0.21, 0.172] },
  anim: {
    idle: { breathRate: 0.8, breath: 0.02, headDrift: 0.08, sway: 0.02, twitch: 0 }, walk: { twist: 0.12, roll: 0.05, headNod: 0.05, elbow: 0.3, drag: 0.35 },
    flinch: { head: 0.4, chest: 0.4, arms: 0.4 }, death: { buckle: 1.2, slump: 1 },
    cloth: [{ bone: 'capeA', gain: 0.07, k: 34, damp: 3.8, flutter: 0.04 }, { bone: 'capeB', gain: 0.07, k: 30, damp: 3.2, flutter: 0.06, sideways: 1.2 },
            { bone: 'loinF', gain: 0.12, k: 55, damp: 5, flutter: 0.05 }],
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
