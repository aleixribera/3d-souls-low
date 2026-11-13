'use strict';
// Phase 5: models for the remaining normal enemies (the format is explained in js/data/models.js).
// A model that has an `extends` entry starts from another one: anything listed replaces the parent's entry,
// while `proportions` and `anim` merge key by key.
// Factions (Phase 0 audit):
//   HOLLOWED    hoods, rags, rope and leather, amber eyes     (Hollow Soldier, Rogue, Duelist, Bowman)
//   IRONBOUND   plate and mail, faded slate tabard with an ochre stripe, pale blue eyes   (Knight, Warden, Shover)
//   ASHEN HOST  soot mail, peaked hoods, scorched cloth, one red sash, ember eyes          (Lancer, Executioner)
const HOLLOWED_CLOTH = { tex: 'rottenCloth', decay: 0.8, double: true };

MODEL_DEFS.rogue = {   // (v5.5; v7.25.0 built in Blender, after the reference art) a deep charcoal hood and black mask, layered belted leather over blue-black
  // scale, blackened steel greaves, a broad iron scimitar and a dagger in the off hand
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
    strap: { tex: 'rogueLeather', tint: 0x8a7a66, decay: 0.6 },
    blade: { tex: 'rustedIron', tint: 0xa8a49e, decay: 0.4 },
    eye: { glow: 0x8a5a28 },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: { loinF: { parent: 'spin', at: [0.02, -0.02, 0.12] }, loinB: { parent: 'spin', at: [-0.03, -0.02, -0.12] }, hoodTail: { parent: 'neck', at: [0, 0.04, -0.1] } },
  // v7.25.0: built in Blender (tools/blender/rogue.py), one piece per bone; the kit still builds the dagger and the scimitar
  parts: [
    ...Object.entries({
      head: ['mask', 'hood'], hoodTail: ['hood'], neck: ['mask'], chest: ['scales', 'leather', 'strap', 'steel'], spin: ['scales', 'leather', 'strap'],
      loinF: ['leather'], loinB: ['leather'], armL: ['scales'], armR: ['scales', 'leather'], elbowL: ['scales', 'strap', 'leather', 'steel'],
      elbowR: ['scales', 'strap', 'leather'], legL: ['scales', 'leather'], legR: ['scales', 'leather'], kneeL: ['steel', 'leather'], kneeR: ['steel', 'leather'],
    }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `rogue:${bone}__${s}`, bone, slot: s, tile: 0.42 }))),
    { use: 'dagger', slot: 'blade', guardSlot: 'steel', bone: 'elbowL' },
  ],
  weapon: { use: 'scimitar', slots: { blade: 'blade', grip: 'leather', guard: 'steel' } },
  eyes: { color: 0x8a5a28, size: 0.01, spread: 0.044, at: [0, 0.095, 0.1] },   // a dim glint in the mask's slit
  anim: {
    idle: { breathRate: 2.2, breath: 0.03, headDrift: 0.14, sway: 0.03, twitch: 1.0 }, walk: { twist: 0.26, roll: 0.09, headNod: 0.09, elbow: 0.7, drag: 0.2 },
    cloth: [{ bone: 'loinF', gain: 0.14, k: 60, damp: 5, flutter: 0.04 }, { bone: 'loinB', gain: 0.18, k: 50, damp: 4.5, flutter: 0.05 },
            { bone: 'hoodTail', gain: 0.2, k: 40, damp: 3.5, flutter: 0.06 }],
  },
};

MODEL_DEFS.paleDuelist = {   // (v7.26.0 built in Blender) a gaunt fallen noble: upright and thin, a plumed cap, rapier and dagger
  extends: 'hollowBase', fit: 1.03,
  proportions: { shoulderX: 0.28, torsoW: 0.16, torsoD: 0.1, armR: 0.042, legR: 0.06, headR: 0.11, handR: 0.043, footLen: 0.26 },
  limbs: { armL: { len: 1.05, thick: 1 } },
  posture: { chest: [0.1, 0, 0], neck: [0.06, 0, 0], head: [-0.04, 0, 0.12], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0xd0c8b8, decay: 0.5 },
    cloth: { tex: 'oathLinen', tint: 0xe0d9c5, decay: 0.4, double: true },
    plume: { tex: 'duelistVelvet', decay: 0.4, double: true },
    trim: { tex: 'wornGilt', tint: 0xd9cec0, decay: 0.4 },
    leather: { tex: 'crackedLeather', tint: 0x5e6460, decay: 0.55 },
    blade: { tex: 'dentedSteel', tint: 0xb0b4ba, decay: 0.3 },
    iron: { tex: 'dentedSteel', tint: 0x8a8e94, decay: 0.45 },
    eye: { glow: 0xd8e0ff },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: { loinF: { parent: 'spin', at: [0.02, -0.02, 0.12] }, loinB: { parent: 'spin', at: [-0.03, -0.02, -0.12] }, loinS: { parent: 'spin', at: [0.19, -0.02, 0.0] }, capeA: { parent: 'chest', at: [0.1, 0.53, -0.15] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] } },
  // v7.26.0: built in Blender (tools/blender/duelist.py), one piece per bone ('.1' marks a bone's second piece in a slot);
  // the kit still builds the dagger and the rapier
  parts: [
    ...Object.entries({
      head: ['skin', 'plume', 'cloth'], neck: ['skin', 'cloth'], chest: ['cloth', 'trim', 'plume'], spin: ['plume', 'cloth', 'leather', 'trim'],
      loinF: ['cloth'], loinB: ['cloth'], loinS: ['plume'], capeA: ['plume'], capeB: ['plume'],
      armL: ['plume', 'cloth'], armR: ['plume', 'cloth'], elbowL: ['cloth', 'leather', 'leather.1'], elbowR: ['cloth', 'leather', 'leather.1'],
      legL: ['cloth'], legR: ['cloth'], kneeL: ['leather', 'leather.1', 'trim'], kneeR: ['leather', 'leather.1', 'trim'],
    }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `duelist:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42 }))),
    { use: 'dagger', slot: 'blade', guardSlot: 'iron', bone: 'elbowL' },
  ],
  weapon: { use: 'rapier', slots: { blade: 'blade', grip: 'leather', guard: 'iron' } },
  eyes: { color: 0xd8e0ff, size: 0.013, spread: 0.042, at: [0, 0.095, 0.1] },
  anim: {
    idle: { breathRate: 1.9, breath: 0.022, headDrift: 0.08, sway: 0.02, twitch: 0.6 }, walk: { twist: 0.16, roll: 0.05, headNod: 0.05, elbow: 0.3, drag: 0 },
    cloth: [{ bone: 'capeA', gain: 0.08, k: 45, damp: 4.5, flutter: 0.03 }, { bone: 'capeB', gain: 0.14, k: 38, damp: 4, flutter: 0.05 }, { bone: 'loinF', gain: 0.16, k: 55, damp: 5, flutter: 0.04 }, { bone: 'loinB', gain: 0.22, k: 45, damp: 4.2, flutter: 0.06 },
            { bone: 'loinS', gain: 0.1, k: 50, damp: 4.5, flutter: 0.05, sideways: 0.8 }],
  },
};

MODEL_DEFS.rampartBowman = {   // (v7.28.0 built in Blender) hunched, a bow taller than its body, a quiver bristling with arrows
  extends: 'hollowBase', fit: 1.06,
  proportions: { torsoW: 0.18, torsoD: 0.12, armR: 0.048, legR: 0.07, headR: 0.118 },
  limbs: { armL: { len: 1.08, thick: 0.9 } },
  posture: { chest: [0.36, 0, 0.04], neck: [0.3, 0, -0.08], head: [0.08, 0, 0.1], elbowL: [-0.2, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0xa39d8f, decay: 0.7 },
    cloth: { tex: 'archerCanvas', decay: 0.55, double: true },
    metal: { tex: 'dentedSteel', tint: 0xa5a79e, decay: 0.6 },
    hood: { tex: 'archerCanvas', tint: 0x87917e, decay: 0.7, double: true },
    wrap: { ...HOLLOWED_CLOTH, tint: 0xb0a690, decay: 0.9 },
    leather: { tex: 'crackedLeather', tint: 0x66705e, decay: 0.65 },
    wood: { tex: 'barkMoss', tint: 0x8a7a6a, decay: 0.2 },
    eye: { glow: 0xd89a50 },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: { loinF: { parent: 'spin', at: [0.02, -0.02, 0.13] }, loinB: { parent: 'spin', at: [-0.03, -0.02, -0.13] } },
  // v7.28.0: built in Blender (tools/blender/bowman.py), one piece per bone; the kit still builds the bow
  parts: Object.entries({
    head: ['skin', 'hood'], neck: ['skin'], chest: ['cloth', 'hood', 'leather', 'metal', 'wood', 'wrap'],
    spin: ['cloth', 'cloth.1', 'leather', 'leather.1'], loinF: ['cloth'], loinB: ['cloth'], armL: ['skin'], armR: ['skin'],
    elbowL: ['skin', 'wrap'], elbowR: ['skin', 'leather', 'leather.1', 'metal'], legL: ['cloth', 'cloth.1'], legR: ['cloth', 'cloth.1'],
    kneeL: ['wrap', 'leather'], kneeR: ['wrap', 'leather'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `bowman:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42 }))),
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

// The Undead Knight (v7.24.0, built in Blender: tools/blender/knight.py): full worn plate, mottled grey with rivets. A
// rounded close helm with a beaked visor and a dark eye slit over a broad gorget, a swelling ridged breastplate, great
// three-lamed pauldrons (the left the larger), mail at the joints, banded vambraces, dark gauntlets and sabatons,
// tassets and knee cops over dark brown trousers, and a long greatsword whose blade hooks up into a cleaver tip (the kit
// still builds the sword). No shield, no tabard. ironKnight stays as the base of the other Ironbound.
MODEL_DEFS.undeadKnight = {
  extends: 'ironKnight', fit: 1.0,
  proportions: { ...IRONBOUND_PROPS, shoulderX: 0.39, torsoW: 0.27, torsoD: 0.19, armR: 0.07, legR: 0.092 },
  posture: { chest: [0.06, 0, 0], neck: [0.1, 0, 0], head: [0.04, 0, 0.03], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    ...IRONBOUND_MATS,
    plate: { tex: 'knightPlate', tint: 0xc4c6cc, decay: 0.55 },
    gauntlet: { tex: 'knightPlate', tint: 0x8a8c92, decay: 0.65 },
    mail: { tex: 'knightMail', tint: 0x8a8a8e, decay: 0.7 },
    trousers: { tex: 'rottenCloth', tint: 0x5a4434, decay: 0.75 },
    leather: { tex: 'crackedLeather', tint: 0x5a3e2c, decay: 0.7 },
    dark: { tex: 'ashSoot', tint: 0x0c0c0e, decay: 0.9 },
    blade: { tex: 'knightPlate', tint: 0xa8aaae, decay: 0.5 },
    guard: { tex: 'knightPlate', tint: 0x8a8c90, decay: 0.6 },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    head: ['plate', 'dark'], neck: ['mail'], chest: ['plate'], spin: ['plate', 'leather', 'mail', 'trousers'],
    armL: ['mail', 'plate'], armR: ['mail', 'plate'], elbowL: ['plate', 'gauntlet'], elbowR: ['plate', 'gauntlet'],
    legL: ['trousers', 'plate'], legR: ['trousers', 'plate'], kneeL: ['plate', 'gauntlet'], kneeR: ['plate', 'gauntlet'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `knight:${bone}__${s}`, bone, slot: s, tile: 0.42 }))),
  weapon: { use: 'knightGreatsword', slots: { blade: 'blade', grip: 'leather', guard: 'guard' } },
  eyes: { color: 0x9ab8ff, size: 0.014, spread: 0.055, at: [0, 0.183, 0.18] },
  anim: { ...IRONBOUND_ANIM, cloth: [] },
};

// The Shield Warden (v5.5, after the reference art): dark pitted charcoal plate with worn silver edges, a cylindrical
// flat-topped tower helm with a central nasal bar and vertical face grate, a high spiked gorget and shoulder guard,
// V-ribbed breastplate, fauld and tassets with a heavy bulbous codpiece, banded greaves with winged knee cops, a long
// slender greatsword carried over the right shoulder, and a towering ornate horned greatshield with gothic brass-silver
// tracery over a fire-and-soot recessed face. No banner, no tabard.
MODEL_DEFS.ironWarden = {   // (v7.27.0 built in Blender) the gaoler of the Sunken Keep: heavy blued plate, a tower helm, a great shield
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
    dark: { tex: 'ashSoot', tint: 0x0c0c0e, decay: 0.9 },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: {},
  // v7.27.0: built in Blender (tools/blender/warden.py), one piece per bone; the kit still builds the greatshield and the
  // greatsword
  parts: [
    ...Object.entries({
      head: ['plate', 'dark', 'guard'], neck: ['mail'], chest: ['plate', 'guard'], spin: ['leather', 'mail', 'plate', 'rust'],
      armL: ['mail', 'plate'], armR: ['mail', 'plate', 'guard'], elbowL: ['plate', 'guard'], elbowR: ['plate', 'guard'],
      legL: ['mail', 'plate'], legR: ['mail', 'plate'], kneeL: ['plate', 'guard'], kneeR: ['plate', 'guard'],
    }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `warden:${bone}__${s}`, bone, slot: s, tile: 0.42 }))),
    { use: 'greatshield', slot: 'shieldFace', metal: 'shieldTrim', bone: 'elbowL', w: 0.74, h: 1.48, at: [0.08, -0.22, 0.22] },
  ],
  weapon: { use: 'wardenGreatsword', slots: { blade: 'blade', grip: 'grip', guard: 'guard' } },
  eyes: { color: 0x9ab8ff, size: 0.013, spread: 0.048, at: [0, 0.152, 0.165] },
  anim: { ...IRONBOUND_ANIM, cloth: [] },
};

// The Shover (v7.34.0, built in Blender: tools/blender/shover.py): a barrel-chested brute behind a wall-sized shield; no
// weapon, the shield is the weapon. A deep round cuirass bound with two iron hoops like a barrel and the pavise's guige
// strap across it, a kettle hat over a high bevor, a great pauldron on the shield arm, a long brown tabard.
MODEL_DEFS.ironShover = {
  extends: 'ironKnight', fit: 1.0,
  proportions: { shoulderX: 0.35, torsoW: 0.24, torsoD: 0.18, armR: 0.07, legR: 0.09, headR: 0.125 },
  posture: { chest: [0.16, 0, 0], neck: [0.1, 0, 0], head: [0.04, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0] },
  materials: {
    ...IRONBOUND_MATS, plate: { tex: 'gaolerPlate', tint: 0x9fa6ad, decay: 0.7 }, trim: { tex: 'wornGilt', tint: 0xaba392, decay: 0.7 },
    shield: { tex: 'paviseWood', decay: 0.7 }, tabard: { tex: 'rottenCloth', tint: 0x6a5a48, decay: 0.75, double: true },
    dark: { tex: 'ashSoot', tint: 0x0c0c0e, decay: 0.9 },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  // v7.34.0: one baked piece per bone; the kit still builds the pavise
  parts: [
    ...Object.entries({
      head: ['plate', 'plate.1', 'dark', 'mail', 'rust'], neck: ['rust'], chest: ['plate', 'rust', 'leather', 'trim'],
      spin: ['leather', 'trim', 'mail', 'plate'], loinF: ['tabard', 'trim'], loinB: ['tabard'],
      armL: ['mail', 'plate', 'rust'], armR: ['mail', 'plate'], elbowL: ['plate', 'rust.1'], elbowR: ['leather', 'rust', 'rust.1'],
      legL: ['mail', 'plate'], legR: ['mail', 'plate'], kneeL: ['plate', 'rust', 'rust.1'], kneeR: ['plate', 'rust', 'rust.1'],
    }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `shover:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42 }))),
    { use: 'bulwarkShield', slot: 'shield', metal: 'rust', paint: 'trim', bone: 'elbowL', w: 0.8, h: 1.15, at: [0.08, -0.12, 0.22] },
  ],
  weapon: null,
  eyes: { color: 0x9ab8ff, size: 0.011, spread: 0.05, at: [0, 0.12, 0.165] },
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
// glaive with three circular perforations at the blade heel, rust encrustation, and hanging shaft streamers. v7.23 rebuilt the
// body in Blender after the same brief; the glaive is still the kit's.
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
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: {
    loinF: { parent: 'spin', at: [0.0, -0.02, 0.13] },
    loinB: { parent: 'spin', at: [0.0, -0.02, -0.13] },
    loinL: { parent: 'spin', at: [0.16, -0.03, 0.02] },
    loinR: { parent: 'spin', at: [-0.16, -0.03, 0.02] },
    capeA: { parent: 'chest', at: [0, 0.54, -0.16] },
    capeB: { parent: 'capeA', at: [0, -0.42, 0] },
  },
  // v7.23: the body is Blender meshes, one rigid piece per bone (tools/blender/lancer.py, packed in js/baked/lancer.js).
  parts: Object.entries({
    head: ['bone', 'socket', 'shroud'], neck: ['darkBone'], chest: ['bone', 'socket', 'shroud', 'collar'], spin: ['darkBone', 'rags'],
    loinF: ['rags'], loinB: ['rags'], loinL: ['shroud'], loinR: ['shroud'], capeA: ['shroud'], capeB: ['rags'],
    armL: ['bone', 'shroud'], armR: ['bone', 'shroud'], elbowL: ['bone', 'leather'], elbowR: ['bone', 'leather'],
    legL: ['bone', 'darkBone'], legR: ['bone', 'darkBone'], kneeL: ['bone', 'leather'], kneeR: ['bone', 'leather'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `lancer:${bone}__${s}`, bone, slot: s, tile: 0.42 }))),
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
// knee-guards and boots, and a blood-stained crescent greataxe on a gnarled, red-wrapped haft. v7.32 rebuilt the body in
// Blender after the same brief (the skirt now hangs in four swinging panels); the greataxe is still the kit's.
MODEL_DEFS.ashExecutioner = {
  extends: 'ashBase', faction: 'ashen', budget: 'enemy', fit: 1.02,
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
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: {
    tasselL: { parent: 'chest', at: [0.06, 0.38, 0.19] },
    tasselR: { parent: 'chest', at: [-0.07, 0.36, 0.19] },
    cloakB: { parent: 'chest', at: [0, 0.52, -0.2] },
    loinF: { parent: 'spin', at: [0, -0.13, 0.19] }, loinB: { parent: 'spin', at: [0, -0.13, -0.19] },
    loinL: { parent: 'spin', at: [0.2, -0.13, 0] }, loinR: { parent: 'spin', at: [-0.2, -0.13, 0] },
  },
  // v7.32.0: built in Blender (tools/blender/executioner.py), one piece per bone; the kit still builds the greataxe
  parts: Object.entries({
    head: ['skin', 'hair', 'patch'], neck: ['skin'],
    chest: ['plumage', 'plumage.1', 'plumage.2', 'darkLeather', 'leather'], cloakB: ['plumage'],
    tasselL: ['cord', 'trim'], tasselR: ['cord', 'trim'],
    spin: ['sash', 'plumage', 'skirt', 'leather'],
    loinF: ['skirt', 'trim'], loinB: ['skirt', 'trim'], loinL: ['skirt', 'trim'], loinR: ['skirt', 'trim'],
    armL: ['plumage', 'sleeve'], armR: ['plumage', 'sleeve'],
    elbowL: ['sleeve', 'gauntlet', 'gauntlet.1', 'iron'], elbowR: ['sleeve', 'leather', 'darkLeather'],
    legL: ['darkLeather'], legR: ['darkLeather'],
    kneeL: ['darkLeather', 'darkLeather.1', 'iron'], kneeR: ['darkLeather', 'darkLeather.1', 'iron'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `exec:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42 }))),
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
      { bone: 'loinF', gain: 0.13, k: 60, damp: 5, flutter: 0.04 }, { bone: 'loinB', gain: 0.15, k: 54, damp: 4.8, flutter: 0.05 },
      { bone: 'loinL', gain: 0.12, k: 58, damp: 5, flutter: 0.04, sideways: 0.8 }, { bone: 'loinR', gain: 0.12, k: 58, damp: 5, flutter: 0.04, sideways: 0.8 },
    ],
  },
};

// ---- Level 5: the castle's own creatures (v4.3). None of them is a living person. ----------------------------------
// Gargoyle (v7.37.0 built in Blender, tools/blender/gargoyle.py): dark soot-stained basalt; a roaring fanged hound-demon
// head under a verdigris bronze brow crown, horns swept back; a carved muscular torso with a bronze collar and sternum
// medallion, spikes down the spine; long arms with stone forearm plates and curved talons; hocked legs on four-taloned
// raptor feet; a stone tail with a spade tip; great stone wings with a volute at the root, a hooked horn at the wrist,
// four fingers fanning a scalloped membrane and two tiers of carved covert feathers. The membrane takes little rim
// light (`rim` on its slot): seen edge-on, a broad sheet would otherwise read flat white.
MODEL_DEFS.gargoyle = {
  extends: 'hollowBase', faction: 'castle', budget: 'enemy', fit: 1.12, limbSides: 4, rim: 0.6,
  proportions: { shoulderX: 0.35, torsoW: 0.23, torsoD: 0.17, armR: 0.064, legR: 0.092, headR: 0.138, handR: 0.056, footLen: 0.28 },
  limbs: {
    armL: { len: 1.24, thick: 1.05 }, elbowL: { len: 1.22, thick: 0.96 },
    armR: { len: 1.24, thick: 1.05 }, elbowR: { len: 1.22, thick: 0.96 },
    legL: { thick: 1.08 }, kneeL: { thick: 1.02 },
    legR: { thick: 1.08 }, kneeR: { thick: 1.02 },
  },
  posture: {
    chest: [0.46, 0, 0], neck: [-0.28, 0, 0], head: [-0.18, 0, 0],
    armL: [0.06, 0, 0.56], elbowL: [-0.28, 0, 0.12],
    armR: [0.06, 0, -0.56], elbowR: [-0.28, 0, -0.12],
    wingL: [-0.42, -0.12, -0.05], wingR: [-0.42, 0.12, 0.05],
  },
  materials: {
    stone: { tex: 'gargoyleStone', tint: 0x948e88, decay: 0.65 },
    carved: { tex: 'gargoyleCarved', tint: 0x8c8680, decay: 0.68 },
    wing: { tex: 'gargoyleStone', tint: 0x8a847e, decay: 0.7, double: true, rim: 0.15 },
    bronze: { tex: 'gargoyleBronze', tint: 0x9ab4a6, decay: 0.55 },
    teeth: { tex: 'bone', tint: 0x9a9288, decay: 0.6 },
    void: { tex: 'ashSoot', tint: 0x0c0b0a, decay: 0.9 },
    eye: { glow: 0x6a7870 },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: {
    wingL: { parent: 'chest', at: [0.14, 0.52, -0.15] },
    wingR: { parent: 'chest', at: [-0.14, 0.52, -0.15] },
    tail: { parent: 'spin', at: [0, 0, -0.14] },
  },
  // v7.37.0: built in Blender (tools/blender/gargoyle.py), one piece per bone
  parts: Object.entries({
    head: ['carved', 'carved.1', 'void', 'teeth', 'stone', 'stone.1', 'bronze'], neck: ['carved'],
    chest: ['carved', 'bronze', 'bronze.1', 'stone'], spin: ['stone', 'carved'], tail: ['stone', 'carved'],
    armL: ['stone'], armR: ['stone'], elbowL: ['stone', 'carved', 'stone.1', 'carved.1'], elbowR: ['stone', 'carved', 'stone.1', 'carved.1'],
    legL: ['stone'], legR: ['stone'], kneeL: ['stone', 'carved', 'carved.1'], kneeR: ['stone', 'carved', 'carved.1'],
    wingL: ['wing', 'stone', 'carved'], wingR: ['wing', 'stone', 'carved'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `gargoyle:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42 }))),
  weapon: null,
  eyes: { color: 0x6a7870, size: 0.008, spread: 0.05, at: [0, 0.13, 0.1] },
  anim: {
    attackMul: 1,
    idle: { breathRate: 0.4, breath: 0.005, headDrift: 0.12, sway: 0.01, twitch: 0.6 },
    walk: { twist: 0.22, roll: 0.08, headNod: 0.05, elbow: 0.55, drag: 0.15 },
    flinch: { head: 0.6, chest: 0.6, arms: 0.6 },
    death: { buckle: 1, slump: 1 },
    cloth: [
      { bone: 'wingL', gain: 0.04, k: 85, damp: 7.5, flutter: 0.008 },
      { bone: 'wingR', gain: 0.04, k: 85, damp: 7.5, flutter: 0.008 },
      { bone: 'tail', gain: 0.05, k: 70, damp: 6, flutter: 0.006 },
    ],
  },
};

// Empty Sentinel (v7.39.0 built in Blender, tools/blender/sentinel.py): a towering suit of ornate golden-brass plate and
// arabesque filigree over bronze mail, with nobody inside (LORE.md). A tall narrow ovoid close-helm with a sharp keel down
// its face, a crest tuft on the crown, a filigree brow band, a dark eye slit and two columns of breathing holes, cold light
// in the dark behind them; a wide ringed gorget; great horizontally flared pauldrons with upturned outer lips, a filigree
// inlay and two rerebrace lames; a heavy breastplate with a filigree plackart, crossed by a pale surcoat sash from the
// right shoulder to the left hip with dark border stripes, hanging front and back in panels torn to rags at the knee;
// barrelled filigree vambraces with projecting couters and flared cuffs, closed gauntlets; filigree tassets and domed
// knee cops over mail thighs, keeled greaves and laminar sabatons; the kit's spiral-fluted halberd in the right hand.
MODEL_DEFS.emptySentinel = {
  extends: 'ironKnight', faction: 'castle', budget: 'enemy', fit: 1.0, rim: 0.45,
  proportions: { shoulderX: 0.42, torsoW: 0.27, torsoD: 0.19, armR: 0.072, legR: 0.095, headR: 0.128, handR: 0.066, footLen: 0.33 },
  limbs: {
    armL: { len: 1.04, thick: 1.05 }, elbowL: { len: 1.04, thick: 1.02 },
    armR: { len: 1.04, thick: 1.05 }, elbowR: { len: 1.04, thick: 1.02 },
  },
  posture: {
    chest: [0.03, 0, 0], neck: [0.04, 0, 0], head: [0.05, 0, 0.02],
    armL: [0.06, 0, 0.12], elbowL: [-0.28, 0, 0.06],
    armR: [-0.04, 0, -0.12], elbowR: [-0.34, 0, -0.05],
  },
  materials: {
    plate: { tex: 'sentinelBrass', tint: 0xdcb464, decay: 0.42 },
    filigree: { tex: 'sentinelFiligree', tint: 0xd8ae5e, decay: 0.44 },
    mail: { tex: 'sentinelMail', tint: 0x9e723c, decay: 0.58 },
    plume: { tex: 'sentinelMail', tint: 0x624626, decay: 0.65 },
    cloth: { tex: 'sentinelCloth', tint: 0xdedad2, decay: 0.45, double: true },
    rags: { tex: 'sentinelRags', tint: 0xd8d4cc, decay: 0.52, double: true },
    trim: { tex: 'sentinelTrim', tint: 0xc8c2b8, decay: 0.48, double: true },
    blade: { tex: 'sentinelSteel', tint: 0xc2c6cc, decay: 0.42, rim: 0.6 },
    haft: { tex: 'sentinelBrass', tint: 0xdcb464, decay: 0.42, rim: 0.4 },   // a long thin shaft is all edge: little rim light
    void: { tex: 'ashSoot', tint: 0x0a0908, decay: 0.9 },
    eye: { glow: 0xcfe2ff },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: {
    sashF: { parent: 'spin', at: [0.09, -0.02, 0.185] },
    sashB: { parent: 'spin', at: [0.06, -0.02, -0.185] },
  },
  // v7.39.0: built in Blender (tools/blender/sentinel.py), one piece per bone; the kit still builds the halberd
  parts: Object.entries({
    head: ['plate', 'void', 'filigree', 'plume'], neck: ['mail'],
    chest: ['plate', 'filigree', 'cloth', 'trim'], spin: ['plate', 'filigree', 'mail'],
    sashF: ['cloth', 'trim', 'rags'], sashB: ['cloth', 'trim', 'rags'],
    armL: ['mail', 'plate', 'filigree'], armR: ['mail', 'plate', 'filigree'],
    elbowL: ['filigree', 'plate'], elbowR: ['filigree', 'plate'],
    legL: ['mail', 'filigree'], legR: ['mail', 'filigree'],
    kneeL: ['plate', 'plate.1'], kneeR: ['plate', 'plate.1'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `sentinel:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42 }))),
  weapon: { use: 'sentinelHalberd', slots: { blade: 'blade', grip: 'haft', guard: 'filigree' } },
  eyes: { color: 0xcfe2ff, size: 0.01, spread: 0.045, at: [0, 0.195, 0.126] },
  anim: {
    ...IRONBOUND_ANIM,
    cloth: [
      { bone: 'sashF', gain: 0.14, k: 56, damp: 4.8, flutter: 0.04 },
      { bone: 'sashB', gain: 0.16, k: 50, damp: 4.5, flutter: 0.05 },
    ],
  },
};
// Toll Wisp (v5.5, after the reference art): a weathered wandering sorcerer in an enormous wide-brimmed dark felt
// wizard hat with a slouching hooked crown, patterned brim border, and twisted pale rope hatband with hanging tassels;
// a shadowed face with a flowing white beard tumbling over the throat; a draped chestnut-brown shoulder capelet with a
// knotted cloth cravat, sage-green shoulder caps, and a buckled diagonal leather baldric; wide brown sleeves with
// crisscross pale X-lacing and golden embroidered cuffs over bony hands; a multi-strand twisted rope waist girdle with
// long front tassels and an angled leather belt with a hip satchel; and a floor-length dark outer coat over a cream-gold
// damask brocade front robe bisected by a rust-amber stripe and wide embroidered bottom hem border, over brown boots.
// v7.30.0 adds the small handbell LORE.md binds each ringer to, and its soul's cold eyes under the brim.
MODEL_DEFS.tollWisp = {
  extends: 'hollowBase', faction: 'castle', budget: 'enemy', fit: 1.04, limbSides: 5,
  proportions: { shoulderX: 0.30, torsoW: 0.21, torsoD: 0.145, armR: 0.048, legR: 0.068, headR: 0.118, handR: 0.042, footLen: 0.27 },
  limbs: {
    armL: { len: 1.04, thick: 0.95 }, elbowL: { len: 1.04, thick: 0.92 },
    armR: { len: 1.04, thick: 0.95 }, elbowR: { len: 1.04, thick: 0.92 },
  },
  posture: {
    chest: [0.12, 0, 0], neck: [0.08, 0, 0], head: [0.08, 0, -0.02],
    armL: [0.06, 0, 0.09], elbowL: [-0.26, 0, 0.04],
    armR: [0.06, 0, -0.09], elbowR: [-0.28, 0, -0.04],
  },
  materials: {
    hat: { tex: 'wispHat', tint: 0x8e7c6e, decay: 0.55, double: true },
    brimTrim: { tex: 'execTrim', tint: 0x8c7e68, decay: 0.5, double: true },
    beard: { tex: 'margitFur', tint: 0xe2ded6, decay: 0.25 },
    mantle: { tex: 'wispMantle', tint: 0xb48462, decay: 0.5, double: true },
    epaulette: { tex: 'execSkirt', tint: 0x7c8868, decay: 0.45, double: true },
    brocade: { tex: 'wispBrocade', tint: 0xe2c88e, decay: 0.42, double: true },
    trim: { tex: 'wispTrim', tint: 0xdca048, decay: 0.38, double: true },
    coat: { tex: 'wispCoat', tint: 0x747868, decay: 0.6, double: true },
    rope: { tex: 'execTrim', tint: 0xc8bca2, decay: 0.42 },
    leather: { tex: 'crackedLeather', tint: 0x684024, decay: 0.55 },
    buckle: { tex: 'wardenBrass', tint: 0xc4b08a, decay: 0.45 },
    skin: { tex: 'paleSkin', tint: 0x9e9484, decay: 0.55 },
    void: { tex: 'ashSoot', tint: 0x0c0a08, decay: 0.9 },
    eye: { glow: 0x9ec4ff },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: {
    tasselF: { parent: 'spin', at: [-0.055, 0.02, 0.19] },
    robeB: { parent: 'chest', at: [0, 0.48, -0.18] },
  },
  // v7.30.0: built in Blender (tools/blender/wisp.py), one piece per bone, with the handbell LORE.md binds each ringer to
  parts: Object.entries({
    head: ['hat', 'hat.1', 'brimTrim', 'rope', 'void', 'skin', 'beard'], neck: ['void'],
    chest: ['coat', 'brocade', 'trim', 'mantle', 'mantle.1', 'epaulette', 'leather', 'buckle'],
    spin: ['coat', 'brocade', 'trim', 'rope', 'leather', 'leather.1', 'buckle'], tasselF: ['rope'], robeB: ['coat'],
    legL: ['coat', 'brocade', 'trim'], legR: ['coat', 'brocade', 'trim'], kneeL: ['leather'], kneeR: ['leather'],
    armL: ['mantle', 'rope'], armR: ['mantle', 'rope'],
    elbowL: ['mantle', 'trim', 'void', 'void.1', 'skin', 'buckle', 'leather'], elbowR: ['mantle', 'trim', 'void', 'skin'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `wisp:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42 }))),
  weapon: null,
  eyes: { color: 0x9ec4ff, size: 0.011, spread: 0.04, at: [0, 0.1, 0.09] },   // the soul's cold light under the brim
  anim: {
    attackMul: 1,
    idle: { breathRate: 1.4, breath: 0.02, headDrift: 0.08, sway: 0.03, twitch: 0 },
    walk: { twist: 0.1, roll: 0.035, headNod: 0.03, elbow: 0.25, drag: 0 },
    flinch: { head: 0.8, chest: 0.8, arms: 0.8 },
    death: { buckle: 0.8, slump: 0.8 },
    cloth: [
      { bone: 'tasselF', gain: 0.18, k: 48, damp: 4.0, flutter: 0.06 },
      { bone: 'robeB', gain: 0.1, k: 40, damp: 4.2, flutter: 0.04 },
    ],
  },
};


// ---- Thrale (Level 7 on; v7.38.0): rough stand-ins until each gets its own Blender figure (PLAN.md stage 3, track A) ---
// The Lantern Thrall: the Hollow Soldier's figure, bleached: dun, rain-greyed clothes, grey skin, milky blind eyes.
MODEL_DEFS.lanternThrall = {
  extends: 'hollowSoldier',
  materials: {
    ...MODEL_DEFS.hollowSoldier.materials,
    skin: { tex: 'rotSkin', tint: 0xb8b0a0, decay: 0.7 },
    quilt: { tex: 'quiltedGambeson', tint: 0x847e6c, decay: 0.8 },
    trousers: { tex: 'rottenCloth', tint: 0x5e5a50, decay: 0.8 },
    strap: { tex: 'crackedLeather', tint: 0x5a5044, decay: 0.85 },
    eye: { glow: 0xd8dccc },
  },
  eyes: { color: 0xd8dccc, size: 0.012 },
};
// The Lantern-Bearer: the Toll Wisp's figure in the moor's colours: a storm-grey coat, faded russet mantle, an amber
// light under the brim; the handbell stands in for its lantern.
MODEL_DEFS.lanternBearer = {
  extends: 'tollWisp',
  materials: {
    ...MODEL_DEFS.tollWisp.materials,
    hat: { tex: 'wispHat', tint: 0x5c5850, decay: 0.6, double: true },
    mantle: { tex: 'wispMantle', tint: 0x8a5a3c, decay: 0.55, double: true },
    coat: { tex: 'wispCoat', tint: 0x5a6058, decay: 0.65, double: true },
    brocade: { tex: 'wispBrocade', tint: 0xa89870, decay: 0.5, double: true },
    eye: { glow: 0xffb050 },
  },
  eyes: { color: 0xffb050 },
};
// The Keyless (Level 9, v7.42.0; LORE.md 10e): the Hollow Soldier's figure as a prisoner of the Night Gaol: skin grey
// under the starlight, a faded prison quilt, rusted iron at the straps and plates, a length of fetter for a blade. A
// stand-in until its own Blender figure.
MODEL_DEFS.keyless = {
  extends: 'hollowSoldier',
  materials: {
    ...MODEL_DEFS.hollowSoldier.materials,
    skin: { tex: 'rotSkin', tint: 0xa4a8b0, decay: 0.75 },
    quilt: { tex: 'quiltedGambeson', tint: 0x6a6c74, decay: 0.8 },
    trousers: { tex: 'rottenCloth', tint: 0x4a4c56, decay: 0.8 },
    strap: { tex: 'rustedIron', tint: 0x7a6656, decay: 0.8 },
    iron: { tex: 'rustedIron', tint: 0x7a6a5c, decay: 0.75, double: true },
    blade: { tex: 'rustedIron', tint: 0x6a625a, decay: 0.7 },
    eye: { glow: 0xb8c8ff },
  },
  eyes: { color: 0xb8c8ff, size: 0.011 },
};
// The Salt Knight (Level 8, v7.40.0; LORE.md 10d): the Undead Knight's figure, its plate crusted white by the sea wind
// over grey-green cloth. A stand-in until its own Blender figure.
MODEL_DEFS.saltKnight = {
  extends: 'undeadKnight',
  materials: {
    ...MODEL_DEFS.undeadKnight.materials,
    plate: { tex: 'knightPlate', tint: 0xd8d6cc, decay: 0.9 },
    gauntlet: { tex: 'knightPlate', tint: 0xa8a69c, decay: 0.85 },
    mail: { tex: 'knightMail', tint: 0x8c8c86, decay: 0.8 },
    trousers: { tex: 'rottenCloth', tint: 0x48544e, decay: 0.8 },
  },
};
// Hale and Harrow, the Castellans (Level 8, v7.40.0; LORE.md 10d): one suit of armour split between twin sisters, in
// salt-crusted iron and Saltgrave's sea-grey. Stand-ins until their own Blender figures: Hale, who has the helm, the
// breastplate and the axe, wears the Empty Sentinel's figure; Harrow, bare-headed in the gauntlets and greaves, the
// Executioner's.
MODEL_DEFS.castellanHale = {
  extends: 'emptySentinel', budget: 'boss',
  materials: {
    ...MODEL_DEFS.emptySentinel.materials,
    plate: { tex: 'knightPlate', tint: 0xc8c6bc, decay: 0.75 },
    filigree: { tex: 'sentinelFiligree', tint: 0x8e908a, decay: 0.6 },
    mail: { tex: 'knightMail', tint: 0x7a7c78, decay: 0.75 },
    plume: { tex: 'sentinelMail', tint: 0x3a4442, decay: 0.7 },
    cloth: { tex: 'sentinelCloth', tint: 0x52625e, decay: 0.6, double: true },
    rags: { tex: 'sentinelRags', tint: 0x4a5854, decay: 0.65, double: true },
    trim: { tex: 'sentinelTrim', tint: 0x9a9c94, decay: 0.55, double: true },
    blade: { tex: 'rustedIron', tint: 0x8a8680, decay: 0.5, rim: 0.6 },
    haft: { tex: 'dentedSteel', tint: 0x4a4a48, decay: 0.6, rim: 0.4 },
    eye: { glow: 0xc8d4dc },
  },
  weapon: { use: 'twinAxe', slots: { blade: 'blade', grip: 'haft', guard: 'filigree' } },
  eyes: { ...MODEL_DEFS.emptySentinel.eyes, color: 0xc8d4dc },
};
MODEL_DEFS.castellanHarrow = {
  extends: 'ashExecutioner', budget: 'boss',
  materials: {
    ...MODEL_DEFS.ashExecutioner.materials,
    hair: { tex: 'margitFur', tint: 0x5a4a3e, decay: 0.4 },
    plumage: { tex: 'execPlumage', tint: 0x9a9c94, decay: 0.5, double: true },
    sleeve: { tex: 'rottenCloth', tint: 0x52625e, decay: 0.55, double: true },
    sash: { tex: 'rottenCloth', tint: 0x9a9c94, decay: 0.5, double: true },
    cord: { tex: 'rottenCloth', tint: 0x3a4442, decay: 0.5, double: true },
    skirt: { tex: 'execSkirt', tint: 0x6a726c, decay: 0.55, double: true },
    trim: { tex: 'execTrim', tint: 0xa8aaa2, decay: 0.45, double: true },
    gauntlet: { tex: 'knightPlate', tint: 0xc8c6bc, decay: 0.75 },
    iron: { tex: 'knightPlate', tint: 0xb4b2a8, decay: 0.7 },
    eye: { glow: 0xc8d4dc },
  },
  eyes: { ...MODEL_DEFS.ashExecutioner.eyes, color: 0xc8d4dc },
};
