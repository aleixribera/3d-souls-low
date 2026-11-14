'use strict';
// Phase 6: boss models (the format is explained in js/data/models.js; texture size up to 512, budget 6000 triangles).
// Each boss has one focal point you could draw from memory:
//   Giant Skeleton   (OLD BONES)  a spectral giant: a huge domed skull hung low, pale glowing bone, a white-hot spine (Blender, v7.45.0)
//   Pillager Captain (ASHEN HOST) a horned helm, a cloak torn into strips, a halberd whose edge glows
//   Bell Warden      (IRONBOUND)  a verdigris bronze colossus: bell helm, bell skirt, a temple bell for a hammer (Blender, v7.43.0)

// MODEL_DEFS.giantSkeleton: js/data/bosses/giant-skeleton.js (pass 72).

// MODEL_DEFS.bellWarden: js/data/bosses/bell-warden.js (pass 68).

// ---- Level 5 (v4.3) -------------------------------------------------------------------------------------------------
// Aldric, the Gaoler King: the castle's lord, the last king to swear the Oath of the Open Hand. Ironbound plate gone dark
// bronze, a slate tabard with the castle's tarnished gold stripe, a crown of shackles, the Oath's lock at his breast with
// a chain of office hung to it, a long ash-grey cloak and the great gaoler's blade. In his second phase (the Ember-Crowned)
// the plate cracks and the Ember shows through (`burn`), and embers run along the blade (js/finale.js).
MODEL_DEFS.varn = {
  extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.45,
  proportions: { shoulderX: 0.38, torsoW: 0.26, torsoD: 0.18, armR: 0.078, legR: 0.095, headR: 0.135, handR: 0.07, footLen: 0.33 },
  posture: { chest: [0.06, 0, 0], neck: [0.04, 0, 0], head: [-0.02, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    plate: { tex: 'gaolerPlate', decay: 0.45, size: 512 },
    gilt: { tex: 'wornGilt', decay: 0.5 },
    dark: { tex: 'dentedSteel', tint: 0x3a3836, decay: 0.8 },
    iron: { tex: 'rustedIron', tint: 0x5a5048, decay: 0.8 },
    mail: { tex: 'knightMail', tint: 0x777b82, decay: 0.65 },
    tabard: { tex: 'oathLinen', tint: 0x485d7a, decay: 0.5, double: true, rim: 0.15 },
    stripe: { tex: 'rottenCloth', tint: 0x9a7a3a, decay: 0.6, double: true, rim: 0.15 },
    cloak: { tex: 'oathLinen', tint: 0xa4a1a0, decay: 0.6, size: 512, double: true, rim: 0.15 },   // broad sheets: edge-on they take the rim as white
    cloakHem: { tex: 'tatteredFabric', tint: 0x4a4644, decay: 0.7, size: 512, double: true, rim: 0.15 },
    leather: { tex: 'crackedLeather', tint: 0x4e4a44, decay: 0.75 },
    blade: { tex: 'dentedSteel', tint: 0x8a8a8e, decay: 0.55, size: 512 },
    void: { tex: 'ashSoot', tint: 0x141210, decay: 0.4 },
    burn: { glow: 0xff7a28, burn: true },   // the Ember in the cracks: drawn only while he burns
    eye: { glow: 0xffc070 },
  },
  bones: {
    loinF: { parent: 'spin', at: [0.0, -0.02, 0.19] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.19] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.25] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] }, capeD: { parent: 'capeC', at: [0, -0.36, 0] },
  },
  // v7.47.0: built in Blender (tools/blender/aldric.py), one piece per bone: a closed great helm with a dark eye slit and
  // breaths on the right cheek, the crown of shackles (seven gilt tines, an iron shackle under each); a cast cuirass with
  // gilt borders, the Oath's lock (the Open Hand in gilt, a keyhole) and a chain of office; layered pauldrons, the left
  // heavier; manacles at both wrists, a broken chain off the left; the tabard, the gilt knee cops, the long cloak torn below
  // the knee; and the `burn` cracks over the helm, the cuirass and the pauldrons.
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    head: ['plate', 'void', 'dark', 'gilt', 'iron', 'burn'], neck: ['mail', 'dark'],
    chest: ['plate', 'gilt', 'dark', 'gilt.1', 'void', 'iron', 'burn'], spin: ['leather', 'gilt', 'plate', 'mail'],
    loinF: ['tabard', 'stripe'], loinB: ['tabard'], capeA: ['cloak'], capeB: ['cloak'], capeC: ['cloak'], capeD: ['cloakHem'],
    armL: ['mail', 'plate', 'gilt', 'burn'], armR: ['mail', 'plate', 'gilt', 'burn'],
    elbowL: ['plate', 'plate.1', 'gilt', 'iron', 'plate.2'], elbowR: ['plate', 'plate.1', 'gilt', 'iron', 'plate.2'],
    legL: ['mail', 'plate', 'gilt'], legR: ['mail', 'plate', 'gilt'], kneeL: ['plate', 'plate.1'], kneeR: ['plate', 'plate.1'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `aldric:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42 }))),
  weapon: { use: 'greatSword', slots: { blade: 'blade', grip: 'leather', guard: 'iron' } },
  embers: { head: [0, 0, 1.5], edge: { size: [0.04, 0.16, 1.2], at: [0, 0, 0.85] } },
  eyes: { color: 0xffc070, size: 0.013, spread: 0.055, at: [0, 0.146, 0.15] },   // behind the eye slit
  anim: {
    idle: { breathRate: 0.95, breath: 0.014, headDrift: 0.03, sway: 0.01, twitch: 0 }, walk: { twist: 0.08, roll: 0.03, headNod: 0.03, elbow: 0.25, drag: 0 },
    flinch: { head: 0.35, chest: 0.35, arms: 0.35 }, death: { buckle: 1, slump: 0.6 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 66, damp: 5.6, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 56, damp: 5, flutter: 0.04 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 36, damp: 3.8, flutter: 0.045 },
            { bone: 'capeC', gain: 0.07, k: 32, damp: 3.4, flutter: 0.06, sideways: 1.2 }, { bone: 'capeD', gain: 0.1, k: 24, damp: 2.8, flutter: 0.09, sideways: 1.4 }],
  },
};
