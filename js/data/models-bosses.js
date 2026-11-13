'use strict';
// Phase 6: boss models (the format is explained in js/data/models.js; texture size up to 512, budget 6000 triangles).
// Each boss has one focal point you could draw from memory:
//   Giant Skeleton   (OLD BONES)  a spectral giant: a huge domed skull hung low, pale glowing bone, a white-hot spine
//   Pillager Captain (ASHEN HOST) a horned helm, a cloak torn into strips, a halberd whose edge glows
//   Bell Warden      (IRONBOUND)  a verdigris bronze colossus: bell helm, bell skirt, a temple bell for a hammer (Blender, v7.43.0)

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
  // v6.0 remake: a real skeleton (js/kit-premium.js): shaped long bones with heads and condyles, paired forearm and shin
  // bones, bony hands and feet, a pelvis and neck vertebrae under the huge domed skull; the white-hot spine as before.
  body: { torso: null, pelvis: null, arms: null, legs: null, head: 'bone', neck: null, hands: null, feet: null },
  parts: [
    { use: 'ribcage', slot: 'bone', bone: 'chest', full: 8, broken: 8, whole: true, size: 1.3, spine: 0.16 },
    { use: 'skullFace', slot: 'bone', void: 'void', bone: 'head' },
    // the burning spine: white-hot vertebrae from the ribs down into the pelvis
    { use: 'knobs', slot: 'core', bone: 'chest', at: [[0, 0.04, -0.16, 0.032], [0, 0.11, -0.165, 0.03], [0, 0.18, -0.17, 0.028], [0, 0.25, -0.17, 0.026], [0, 0.32, -0.17, 0.024]] },
    { use: 'knobs', slot: 'core', bone: 'spin', at: [[0, 0.0, -0.08, 0.036], [0, 0.07, -0.095, 0.036], [0, 0.14, -0.11, 0.035], [0, 0.21, -0.125, 0.034], [0, 0.28, -0.14, 0.033]] },
    { use: 'bonePelvis', slot: 'bone', bone: 'spin', size: 1.3 },
    { use: 'boneNeck', slot: 'dark', bone: 'neck', size: 1.4, count: 5 },
    { use: 'longBone', slot: 'bone', bone: 'armL', len: 0.39, r: 0.05 }, { use: 'longBone', slot: 'bone', bone: 'armR', len: 0.3, r: 0.046 },
    { use: 'longBone', slot: 'bone', bone: 'elbowL', len: 0.39, r: 0.042, pair: true }, { use: 'longBone', slot: 'bone', bone: 'elbowR', len: 0.3, r: 0.04, pair: true },
    { use: 'longBone', slot: 'bone', bone: 'legL', len: 0.45, r: 0.062 }, { use: 'longBone', slot: 'bone', bone: 'legR', len: 0.45, r: 0.056 },
    { use: 'longBone', slot: 'bone', bone: 'kneeL', len: 0.45, r: 0.052, pair: true }, { use: 'longBone', slot: 'bone', bone: 'kneeR', len: 0.45, r: 0.048, pair: true },
    { use: 'boneHand', slot: 'bone', bone: 'elbowL', at: 0.42, size: 1.5 }, { use: 'boneHand', slot: 'bone', bone: 'elbowR', at: 0.33, size: 1.45 },
    { use: 'boneFoot', slot: 'bone', bone: 'kneeL', size: 1.25 }, { use: 'boneFoot', slot: 'bone', bone: 'kneeR', size: 1.2 },
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
  plate: { tex: 'dentedSteel', tint: 0x3a3634, decay: 0.85, size: 512 },   // blackened (v7.41.0: 0x4a4644 read silver in the burning town)
  cloak: { tex: 'rottenCloth', tint: 0x4a3a36, decay: 0.8, size: 512, double: true },
  cloakHem: { tex: 'tatteredFabric', tint: 0x4a3a36, decay: 0.85, size: 512, double: true },
  scorch: { tex: 'rottenCloth', tint: 0x7a3a2c, decay: 0.85, double: true },
  sash: { tex: 'rottenCloth', tint: 0xb03a22, decay: 0.5, double: true },
  leather: { tex: 'crackedLeather', tint: 0x56585a, decay: 0.8 },
  blade: { tex: 'dentedSteel', tint: 0x6a6460, decay: 0.8, size: 512 },
  wood: { tex: 'barkMoss', tint: 0x5a4a44, decay: 0.3 },
  eye: { glow: 0xff7a30 },
};
// Pillager Captain (v7.41.0 built in Blender, tools/blender/captain.py): the Ashbound's commander in blackened plate over
// mail, wearing no colours. A sallet with a keeled crown and a flared tail, a dark eye slit with the ember light behind
// it and a pointed bevor; iron ram horns curling from its temples. A gorget of lames, a keeled breastplate with rivets
// and a plackart; layered pauldrons with three lames and iron spikes along the crown; fanned couters, vambraces and
// gauntlets; a buckled belt, three fauld lames and a mail skirt; scorched loincloths with a red rag of sash; cuisses,
// knee cops, keeled greaves and sabatons; a dark cloak from the shoulders torn into strips below the knee. The kit
// still builds the halberd.
MODEL_DEFS.pillagerCaptain = {
  extends: 'ashBase', faction: 'ashen', budget: 'boss', fit: 1.02, rim: 0.4,
  proportions: { shoulderX: 0.4, torsoW: 0.26, torsoD: 0.18, armR: 0.07, legR: 0.09, headR: 0.13, handR: 0.065, footLen: 0.32 },
  posture: { chest: [0.1, 0, 0], neck: [0.06, 0, 0], head: [0.02, 0, 0.03], elbowL: [-0.35, 0, 0], elbowR: [-0.4, 0, 0] },
  materials: {
    ...CAPTAIN_MATS, void: { tex: 'ashSoot', tint: 0x0a0908, decay: 0.9 },
    cloak: { ...CAPTAIN_MATS.cloak, rim: 0.15 }, cloakHem: { ...CAPTAIN_MATS.cloakHem, rim: 0.15 },   // broad sheets: edge-on they take the rim as white
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: {
    loinF: { parent: 'spin', at: [0.0, -0.02, 0.17] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.17] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.24] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] }, capeD: { parent: 'capeC', at: [0, -0.34, 0] },
  },
  // v7.41.0: built in Blender (tools/blender/captain.py), one piece per bone
  parts: Object.entries({
    head: ['plate', 'plate.1', 'void', 'iron'], neck: ['mail'],
    chest: ['plate', 'plate.1', 'iron'], spin: ['leather', 'iron', 'plate', 'mail'],
    loinF: ['scorch', 'sash'], loinB: ['scorch'],
    capeA: ['cloak'], capeB: ['cloak'], capeC: ['cloak'], capeD: ['cloakHem'],
    armL: ['mail', 'plate', 'iron'], armR: ['mail', 'plate', 'iron'],
    elbowL: ['plate', 'plate.1', 'plate.2'], elbowR: ['plate', 'plate.1', 'plate.2'],
    legL: ['mail', 'plate'], legR: ['mail', 'plate'],
    kneeL: ['plate', 'plate.1'], kneeR: ['plate', 'plate.1'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `captain:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42 }))),
  weapon: { use: 'halberd', slots: { blade: 'blade', grip: 'wood', guard: 'iron' } },
  embers: { head: [0, -0.1, 2.0], edge: { size: [0.07, 0.42, 0.06], at: [0, -0.3, 1.86] } },
  eyes: { color: 0xff7a30, size: 0.018, spread: 0.05, at: [0, 0.135, 0.13] },
  anim: {
    idle: { breathRate: 1.1, breath: 0.015, headDrift: 0.03, sway: 0.01, twitch: 0 }, walk: { twist: 0.1, roll: 0.04, headNod: 0.04, elbow: 0.3, drag: 0 },
    flinch: { head: 0.4, chest: 0.4, arms: 0.4 }, death: { buckle: 1, slump: 0.8 },
    cloth: [{ bone: 'loinF', gain: 0.12, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.16, k: 50, damp: 4.5, flutter: 0.05 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 36, damp: 3.8, flutter: 0.045 },
            { bone: 'capeC', gain: 0.07, k: 32, damp: 3.4, flutter: 0.06, sideways: 1.2 }, { bone: 'capeD', gain: 0.1, k: 24, damp: 2.8, flutter: 0.09, sideways: 1.4 }],
  },
};

MODEL_DEFS.bellWarden = {
  extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.45,
  proportions: { shoulderX: 0.37, torsoW: 0.265, torsoD: 0.19, armR: 0.085, legR: 0.1, headR: 0.14, handR: 0.075, footLen: 0.34 },
  posture: { chest: [0.1, 0, 0], neck: [0.06, 0, 0], head: [0.02, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    bronze: { tex: 'bellBronze', tint: 0x9cb8aa, decay: 0.5, size: 512, double: true },
    trim: { tex: 'wornGilt', decay: 0.4 },
    mail: { tex: 'knightMail', tint: 0x707a79, decay: 0.7 },
    rust: { tex: 'rustedIron', tint: 0x6a7a62, decay: 0.8 },
    iron: { tex: 'dentedSteel', tint: 0x4a5058, decay: 0.8 },
    cloth: { tex: 'oathLinen', tint: 0xbcb4a0, decay: 0.65, double: true, rim: 0.15 },   // edge-on, a strip took the rim as a white line
    leather: { tex: 'crackedLeather', tint: 0x5e6860, decay: 0.7 },
    void: { tex: 'ashSoot', tint: 0x0a0908, decay: 0.9 },
    eye: { glow: 0xb8ffd0 },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: { loinF: { parent: 'spin', at: [0.0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.2] } },
  // v7.43.0: built in Blender (tools/blender/bellwarden.py), one piece per bone. A bellkeeper chained in bronze: a bell
  // for a helm with a barred gaol window, bells for pauldrons and skirt, crossed chains locked at the breast, shackles.
  parts: Object.entries({
    head: ['bronze', 'void', 'trim'], neck: ['iron'],
    chest: ['bronze', 'trim', 'iron'], spin: ['bronze', 'bronze.1', 'trim', 'leather', 'iron'],
    loinF: ['cloth'], loinB: ['cloth'],
    armL: ['mail', 'bronze', 'trim'], armR: ['mail', 'bronze', 'trim'],
    elbowL: ['bronze', 'trim', 'iron', 'iron.1'], elbowR: ['bronze', 'trim', 'iron', 'iron.1'],
    legL: ['mail'], legR: ['mail'],
    kneeL: ['bronze', 'iron', 'iron.1'], kneeR: ['bronze', 'iron', 'iron.1'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `bell:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42 }))),
  weapon: { use: 'bellMaul', rest: 0.65, slots: { blade: 'bronze', guard: 'rust', grip: 'iron' } },   // rest: the bell sits on its lip, not sunk in the floor
  eyes: { color: 0xb8ffd0, size: 0.016, spread: 0.06, at: [0, 0.062, 0.165] },
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
  proportions: { shoulderX: 0.38, torsoW: 0.26, torsoD: 0.18, armR: 0.078, legR: 0.095, headR: 0.135, handR: 0.07, footLen: 0.33 },
  posture: { chest: [0.06, 0, 0], neck: [0.04, 0, 0], head: [-0.02, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0x6a6258, decay: 0.8 },
    plate: { tex: 'gaolerPlate', decay: 0.45, size: 512 },
    gilt: { tex: 'wornGilt', decay: 0.5 },
    dark: { tex: 'dentedSteel', tint: 0x3a3836, decay: 0.8 },
    iron: { tex: 'rustedIron', tint: 0x5a5048, decay: 0.8 },
    mail: { tex: 'knightMail', tint: 0x777b82, decay: 0.65 },
    tabard: { tex: 'oathLinen', tint: 0x485d7a, decay: 0.5, double: true },
    stripe: { tex: 'rottenCloth', tint: 0x9a7a3a, decay: 0.6, double: true },
    cloak: { tex: 'oathLinen', tint: 0xa4a1a0, decay: 0.6, size: 512, double: true },
    cloakHem: { tex: 'tatteredFabric', tint: 0x4a4644, decay: 0.7, size: 512, double: true },
    leather: { tex: 'crackedLeather', tint: 0x4e4a44, decay: 0.75 },
    blade: { tex: 'dentedSteel', tint: 0x8a8a8e, decay: 0.55, size: 512 },
    eye: { glow: 0xffc070 },
  },
  body: { torso: null, pelvis: 'mail', arms: 'mail', legs: 'mail', head: null, neck: 'mail', hands: 'plate', feet: 'plate' },
  bones: {
    loinF: { parent: 'spin', at: [0.0, -0.02, 0.19] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.19] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.25] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] }, capeD: { parent: 'capeC', at: [0, -0.36, 0] },
  },
  parts: [
    { use: 'castCuirass', slot: 'plate', trim: 'gilt', bone: 'chest', flute: 0.018 }, { use: 'mailSkirt', slot: 'mail', bone: 'spin' }, { use: 'belt', slot: 'leather', bone: 'spin' },
    { use: 'greatHelm', slot: 'plate', bone: 'head', size: 1.1 },
    { use: 'gaolerCrown', slot: 'gilt', iron: 'iron', bone: 'head' },
    { use: 'gorget', slot: 'dark', bone: 'neck', size: 1.25 },
    { use: 'layeredPauldron', slot: 'plate', rivet: 'gilt', bone: 'armL', size: 1.85 },
    { use: 'layeredPauldron', slot: 'plate', rivet: 'gilt', bone: 'armR', size: 1.45, side: -1 },
    { use: 'oathLock', slot: 'gilt', dark: 'dark', bone: 'chest', z: 0.235 },
    { use: 'chain', slot: 'iron', bone: 'chest', from: [-0.24, 0.54, 0.19], to: [0.22, 0.2, 0.215], links: 10, sag: 0.04 },
    { use: 'chain', slot: 'iron', bone: 'chest', from: [0.24, 0.54, 0.19], to: [-0.22, 0.2, 0.215], links: 10, sag: 0.04 },
    { use: 'vambrace', slot: 'plate', strap: 'gilt', bone: 'elbowL', size: 1.35 },
    { use: 'vambrace', slot: 'plate', strap: 'gilt', bone: 'elbowR', size: 1.35 },
    { use: 'manacle', slot: 'dark', trim: 'iron', bone: 'elbowL', r: 0.073, at: 0.26 },
    { use: 'manacle', slot: 'dark', trim: 'iron', bone: 'elbowR', r: 0.073, at: 0.26 },
    { use: 'gauntlet', slot: 'plate', bone: 'elbowL', at: 0.33, size: 1.25 },
    { use: 'gauntlet', slot: 'plate', bone: 'elbowR', at: 0.33, size: 1.25 },
    { use: 'kneeCop', slot: 'gilt', bone: 'kneeL', r: 0.08 },
    { use: 'kneeCop', slot: 'gilt', bone: 'kneeR', r: 0.08 },
    { use: 'greave', slot: 'plate', bone: 'kneeL', size: 1.25 },
    { use: 'greave', slot: 'plate', bone: 'kneeR', size: 1.25 },
    { use: 'clothStrip', slot: 'tabard', bone: 'loinF', w: 0.32, len: 0.72, seed: 3 }, { use: 'clothStrip', slot: 'stripe', bone: 'loinF', w: 0.06, len: 0.66, seed: 3, dz: 0.012 },
    { use: 'clothStrip', slot: 'tabard', bone: 'loinB', w: 0.34, len: 0.8, seed: 6 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeA', w0: 0.6, w1: 0.72, len: 0.42, bow: 1.0 }, { use: 'capeSegment', slot: 'cloak', bone: 'capeB', w0: 0.72, w1: 0.86, len: 0.42, bow: 0.8 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeC', w0: 0.86, w1: 0.96, len: 0.36, bow: 0.6 },
    { use: 'capeSegment', slot: 'cloakHem', bone: 'capeD', w0: 0.96, w1: 1.0, len: 0.34, bow: 0.5, ragged: true, seed: 9 },
  ],
  weapon: { use: 'greatSword', slots: { blade: 'blade', grip: 'leather', guard: 'iron' } },
  embers: { head: [0, 0, 1.5], edge: { size: [0.04, 0.16, 1.2], at: [0, 0, 0.85] } },
  eyes: { color: 0xffc070, size: 0.012, spread: 0.055, at: [0, 0.14, 0.19] },
  anim: {
    idle: { breathRate: 0.95, breath: 0.014, headDrift: 0.03, sway: 0.01, twitch: 0 }, walk: { twist: 0.08, roll: 0.03, headNod: 0.03, elbow: 0.25, drag: 0 },
    flinch: { head: 0.35, chest: 0.35, arms: 0.35 }, death: { buckle: 1, slump: 0.6 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 66, damp: 5.6, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 56, damp: 5, flutter: 0.04 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 36, damp: 3.8, flutter: 0.045 },
            { bone: 'capeC', gain: 0.07, k: 32, damp: 3.4, flutter: 0.06, sideways: 1.2 }, { bone: 'capeD', gain: 0.1, k: 24, damp: 2.8, flutter: 0.09, sideways: 1.4 }],
  },
};
