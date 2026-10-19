'use strict';
// ============================================================================
// The Lands Between (v7.0): one new enemy for each land, each carrying some of its land's boss in it
// ============================================================================
// Each is a normal enemy (an overhead bar, a stagger or guard meter that kneels it for an execution), stronger than the
// common foes of Ashmere, and free to appear in later lands. Their moves are borrowed from the Elden Ring bosses (the
// story bosses do the same, js/data/story-boss-moves.js): copied, never shared, so tuning here never changes a boss.
// A borrowed move keeps its source's timings, poses, tracking and markers; its hitboxes, reaches, steps and leaps are
// scaled to the smaller body (`k`, this enemy's scale over the boss's); its damage is tuned here; `origin` names the
// source. Kit parts: js/kit-realms.js. Effects: BOSS_FX at the end (js/ultra-boss.js draws every listed enemy).
//   Omenkin (Stormhill, Margit)       Grafted Scion (Stormveil, Godrick)   Crucible Squire (the Evergaol, the Crucible Knight)
//   Leyndell Knight (Morgott)         Ashen Warrior (Godfrey)               Beastman of Farum Azula (Maliketh)
//   Golden Zealot (Radagon)           Cleanrot Knight (the Haligtree, Malenia)

// ---- textures ------------------------------------------------------------------------------------------------------------
TEXTURE_DEFS.push(
  { id: 'omenRobe', kind: 'cloth', base: 0x3e3848, alt: 0x625a70, accent: 0x1e1a26, rough: [0.85, 1], metal: 0, bump: 1.1, scratch: 4, stain: 0x16121c, cavity: 0.6, contrast: 0.65, scale: 3 },
  { id: 'omenSkin', kind: 'skin', base: 0x8a8682, alt: 0xa8a29c, accent: 0x5a5262, rough: [0.55, 0.8], metal: 0, bump: 1.2, scratch: 8, stain: 0x342e36, cavity: 0.55 },
  { id: 'scionSkin', kind: 'skin', base: 0xb8a898, alt: 0xd2c4b2, accent: 0x8a4a46, rough: [0.45, 0.75], metal: 0, bump: 1.0, scratch: 10, stain: 0x4a2a28, cavity: 0.5 },
  { id: 'scionGold', kind: 'plate', base: 0x6a4a18, alt: 0xe0b860, accent: 0x2a1a08, rough: [0.2, 0.5], metal: 0.78, bump: 0.9, scratch: 40, stain: 0x241808, cavity: 0.8, contrast: 0.8 },
  { id: 'crucibleBronze', kind: 'plate', base: 0x5a3c1a, alt: 0xc08a44, accent: 0x2a1a0a, rough: [0.26, 0.62], metal: 0.66, bump: 1.25, scratch: 60, stain: 0x221408, cavity: 0.85, contrast: 0.85 },
  { id: 'leyndellPlate', kind: 'plate', base: 0x8a7c5c, alt: 0xeee2c4, accent: 0x4a3c20, rough: [0.18, 0.48], metal: 0.72, bump: 0.9, scratch: 36, stain: 0x3a3020, cavity: 0.75, contrast: 0.7 },
  { id: 'leyndellCloth', kind: 'cloth', base: 0xb4b0a6, alt: 0xe6e2d6, accent: 0x6a6048, rough: [0.8, 0.98], metal: 0, bump: 0.9, scratch: 4, stain: 0x5a5444, cavity: 0.55, contrast: 0.55 },
  { id: 'leyndellPlume', kind: 'feathers', base: 0xc8c4bc, alt: 0xf8f4ec, accent: 0x8a8478, rough: [0.7, 0.95], metal: 0, bump: 1.2, scratch: 4, stain: 0x8a8070, cavity: 0.6, contrast: 0.6 },
  { id: 'ashenSkin', kind: 'ash', base: 0x56504a, alt: 0x948a80, accent: 0xff6a1a, rough: [0.75, 1], metal: 0, bump: 1.3, scratch: 6, stain: 0x100e0c, cavity: 0.7 },
  { id: 'lionFur', kind: 'fur', base: 0x6a5a40, alt: 0xb8a47a, accent: 0x3a2c1a, rough: [0.85, 1], metal: 0, bump: 1.6, scratch: 0, stain: 0x1e160e },
  { id: 'beastFur', kind: 'fur', base: 0x5e564c, alt: 0xa49a8a, accent: 0x221e1a, rough: [0.85, 1], metal: 0, bump: 1.7, scratch: 0, stain: 0x141210 },
  { id: 'zealotRobe', kind: 'cloth', base: 0xc8c0ae, alt: 0xf2ead8, accent: 0x8a7a50, rough: [0.75, 0.95], metal: 0, bump: 0.8, scratch: 4, stain: 0x6a604a, cavity: 0.5, contrast: 0.5, scale: 2 },
  { id: 'zealotGold', kind: 'holy', base: 0x9a7a30, alt: 0xffe8a8, accent: 0xffffff, rough: [0.2, 0.45], metal: 0.6, bump: 0.6, scratch: 10, stain: 0x6a4a18, cavity: 0.6, contrast: 0.8 },
  { id: 'cleanrotGold', kind: 'feathers', base: 0x7a5a1e, alt: 0xe8c670, accent: 0x3a2808, rough: [0.22, 0.52], metal: 0.74, bump: 1.4, scratch: 30, stain: 0x2a1a08, cavity: 0.9, contrast: 0.9, scale: 2 },
  { id: 'cleanrotCape', kind: 'tattered', base: 0x5a0e0c, alt: 0x942a1e, accent: 0x2a0606, rough: [0.85, 1], metal: 0, bump: 1.0, scratch: 4, stain: 0x1e0404, alpha: true, cavity: 0.6 },
  { id: 'serenRobe', kind: 'cloth', base: 0xa8a49a, alt: 0xd8d2c6, accent: 0x6a6458, rough: [0.82, 0.98], metal: 0, bump: 0.8, scratch: 4, stain: 0x4a463e, cavity: 0.5, contrast: 0.5 },
);

// ---- models -------------------------------------------------------------------------------------------------------------
// The Omenkin: a lesser omen, hunched under faded violet rags, horn bursting out of its back and shoulders, a crown of
// horn over white hair under its hood, a short matted tail; a gnarled cane; golden eyes.
MODEL_DEFS.omenkin = {
  faction: 'goldenOmen', budget: 'enemy', fit: 1.06, limbSides: 7,
  proportions: { shoulderX: 0.34, torsoW: 0.22, torsoD: 0.17, armR: 0.054, legR: 0.074, headR: 0.124, handR: 0.064, footLen: 0.34 },
  limbs: { armL: { len: 1.12, thick: 0.92 }, armR: { len: 1.08 } },
  posture: { chest: [0.55, 0, 0.06], neck: [0.3, 0, 0], head: [-0.26, 0, 0.05], elbowL: [-0.42, 0, 0], elbowR: [-0.45, 0, 0] },
  materials: {
    skin: { tex: 'omenSkin', tint: 0xffffff, decay: 0.75 },
    robe: { tex: 'omenRobe', tint: 0xffffff, decay: 0.7, double: true },
    rags: { tex: 'margitRags', tint: 0x8a7a96, decay: 0.8, double: true },
    hair: { tex: 'rottenCloth', tint: 0xe2ded6, decay: 0.3, double: true },
    rope: { tex: 'margitBurlap', tint: 0xb89868, decay: 0.5 },
    horn: { tex: 'margitHorn', tint: 0xdccab0, decay: 0.55 },
    fur: { tex: 'margitFur', tint: 0x9a8c80, decay: 0.6 },
    wood: { tex: 'barkMoss', tint: 0x8a7a6a, decay: 0.35 },
    iron: { tex: 'rustedIron', tint: 0x6a5e50, decay: 0.7 },
    eye: { glow: 0xffc850 },
  },
  body: { torso: 'robe', pelvis: 'robe', arms: 'skin', legs: 'robe', head: 'skin', neck: 'skin', hands: 'skin', feet: 'skin' },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.19] }, loinB: { parent: 'spin', at: [0, -0.02, -0.19] },
    hairB: { parent: 'head', at: [0, 0.1, -0.08] }, sleeveL: { parent: 'armL', at: [0.02, -0.08, 0] }, sleeveR: { parent: 'armR', at: [-0.02, -0.08, 0] },
    capeA: { parent: 'chest', at: [0, 0.56, -0.21] }, capeB: { parent: 'capeA', at: [0, -0.4, 0] }, capeC: { parent: 'capeB', at: [0, -0.38, 0] },
  },
  parts: [
    { use: 'robeSkirt', slot: 'robe', bone: 'spin', len: 0.86, top: 0.23, hem: 0.42, seed: 6 },
    { use: 'robeSkirt', slot: 'rags', bone: 'spin', len: 0.6, top: 0.26, hem: 0.46, seed: 9 },
    { use: 'jerkin', slot: 'robe', bone: 'chest' }, { use: 'hunch', slot: 'robe', bone: 'chest', size: 1.05 },
    { use: 'sleeve', slot: 'rags', bone: 'armL', len: 0.38, seed: 7 }, { use: 'sleeve', slot: 'rags', bone: 'armR', len: 0.38, seed: 8 },
    { use: 'ropeSash', slot: 'rope', bone: 'spin', y: 0.06 },
    { use: 'hood', slot: 'robe', bone: 'head', size: 1.3, tail: 1.3, close: 0.12 },
    { use: 'hornCrown', slot: 'horn', bone: 'head', size: 0.9, count: 7 },
    { use: 'boneGrowths', slot: 'horn', bone: 'chest', size: 1.35, count: 11, seed: 4 },
    { use: 'clothStrip', slot: 'hair', bone: 'hairB', w: 0.2, len: 0.5, seed: 21 },
    { use: 'clothStrip', slot: 'rags', bone: 'sleeveL', w: 0.18, len: 0.36, seed: 31, turn: Math.PI / 2 }, { use: 'clothStrip', slot: 'rags', bone: 'sleeveR', w: 0.18, len: 0.36, seed: 32, turn: Math.PI / 2 },
    { use: 'wraps', slot: 'rope', bone: 'elbowL', from: 0.02, to: 0.15, radius: 0.07, count: 2 }, { use: 'wraps', slot: 'rope', bone: 'elbowR', from: 0.02, to: 0.15, radius: 0.07, count: 2 },
    { use: 'clothStrip', slot: 'robe', bone: 'loinF', w: 0.38, len: 0.5, seed: 2 }, { use: 'clothStrip', slot: 'rags', bone: 'loinB', w: 0.4, len: 0.55, seed: 8 },
    { use: 'capeSegment', slot: 'rags', bone: 'capeA', w0: 0.6, w1: 0.72, len: 0.4, bow: 1.0 },
    { use: 'capeSegment', slot: 'rags', bone: 'capeB', w0: 0.72, w1: 0.82, len: 0.38, bow: 0.8 },
    { use: 'capeSegment', slot: 'rags', bone: 'capeC', w0: 0.82, w1: 0.86, len: 0.34, bow: 0.6, ragged: true, seed: 6 },
    { use: 'furTail', slot: 'fur', bone: 'spin', size: 0.7, side: 1 },
  ],
  weapon: { use: 'cane', slots: { grip: 'wood', blade: 'iron', guard: 'wood' } },
  eyes: { color: 0xffc850, size: 0.017, spread: 0.062, at: [0, 0.11, 0.14] },
  anim: {
    idle: { breathRate: 1.0, breath: 0.026, headDrift: 0.08, sway: 0.03, twitch: 0.2 }, walk: { twist: 0.16, roll: 0.06, headNod: 0.05, elbow: 0.35, drag: 0.3 },
    flinch: { head: 0.6, chest: 0.6, arms: 0.6 }, death: { buckle: 1.2, slump: 1 },
    cloth: [{ bone: 'loinF', gain: 0.12, k: 60, damp: 5, flutter: 0.04 }, { bone: 'loinB', gain: 0.15, k: 52, damp: 4.6, flutter: 0.05 },
            { bone: 'hairB', gain: 0.08, k: 60, damp: 5, flutter: 0.03 }, { bone: 'sleeveL', gain: 0.1, k: 50, damp: 4.6, flutter: 0.05 }, { bone: 'sleeveR', gain: 0.1, k: 50, damp: 4.6, flutter: 0.05 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 36, damp: 3.8, flutter: 0.05 }, { bone: 'capeC', gain: 0.09, k: 28, damp: 3, flutter: 0.08, sideways: 1.2 }],
  },
};
// The Grafted Scion: a thin pale body stitched together, a blank gold mask crowned with knife-rays, four extra arms sewn on
// at the back and sides, each with a blade; a sword in the hand; a stained loincloth; it moves low and fast.
MODEL_DEFS.graftedScion = {
  faction: 'grafted', budget: 'enemy', fit: 1.02, limbSides: 7,
  proportions: { shoulderX: 0.3, torsoW: 0.18, torsoD: 0.13, armR: 0.042, legR: 0.062, headR: 0.118, handR: 0.05, footLen: 0.3 },
  limbs: { armL: { len: 1.18, thick: 0.85 }, armR: { len: 1.15, thick: 0.9 }, legL: { thick: 0.82 }, legR: { thick: 0.82 } },
  posture: { chest: [0.42, 0, 0], neck: [0.25, 0, 0], head: [-0.18, 0, 0], elbowL: [-0.65, 0, 0], elbowR: [-0.5, 0, 0], legL: [-0.2, 0, 0.04], legR: [-0.2, 0, -0.04], kneeL: [0.35, 0, 0], kneeR: [0.35, 0, 0] },
  materials: {
    skin: { tex: 'scionSkin', tint: 0xffffff, decay: 0.7 },
    gold: { tex: 'scionGold', tint: 0xffffff, decay: 0.35 },
    void: { tex: 'ashSoot', tint: 0x0a0806, decay: 0.9 },
    cloth: { tex: 'tatteredFabric', tint: 0x6a3a2c, decay: 0.75, double: true },
    leather: { tex: 'crackedLeather', tint: 0x5a3a28, decay: 0.6 },
    blade: { tex: 'dentedSteel', tint: 0xb0b0b4, decay: 0.5 },
    eye: { glow: 0xffe0a0 },
  },
  body: { torso: 'skin', pelvis: 'cloth', arms: 'skin', legs: 'skin', head: 'skin', neck: 'skin', hands: 'skin', feet: 'skin' },
  bones: { loinF: { parent: 'spin', at: [0, -0.03, 0.15] }, loinB: { parent: 'spin', at: [0, -0.03, -0.15] } },
  parts: [
    { use: 'spineBumps', slot: 'skin', bone: 'chest' },
    { use: 'scionMask', slot: 'gold', dark: 'void', bone: 'head', size: 1.0, rays: 11 },
    { use: 'scionLimbs', slot: 'skin', blades: 'blade', bone: 'chest', r: 0.032, blade: 0.55, arms: [
      [[0.12, 0.5, -0.14], [0.42, 0.62, -0.32], [0.6, 0.3, -0.12]], [[-0.12, 0.5, -0.14], [-0.42, 0.62, -0.32], [-0.6, 0.3, -0.12]],
      [[0.16, 0.28, -0.1], [0.4, 0.18, -0.24], [0.52, -0.08, 0.05]], [[-0.16, 0.28, -0.1], [-0.4, 0.18, -0.24], [-0.52, -0.08, 0.05]]] },
    { use: 'belt', slot: 'leather', bone: 'spin' },
    { use: 'clothStrip', slot: 'cloth', bone: 'loinF', w: 0.26, len: 0.5, seed: 4 }, { use: 'clothStrip', slot: 'cloth', bone: 'loinB', w: 0.3, len: 0.56, seed: 6 },
    { use: 'wraps', slot: 'cloth', bone: 'kneeL', from: 0.08, to: 0.4, radius: 0.058, count: 4 }, { use: 'wraps', slot: 'cloth', bone: 'kneeR', from: 0.08, to: 0.4, radius: 0.058, count: 4 },
    { use: 'wraps', slot: 'leather', bone: 'elbowR', from: 0.12, to: 0.28, radius: 0.045, count: 3 },
    { use: 'circlet', slot: 'gold', bone: 'neck', r: 0.07, y: 0.0 },
  ],
  weapon: { use: 'scimitar', slots: { blade: 'blade', grip: 'leather', guard: 'gold' } },
  eyes: { color: 0xffe0a0, size: 0.012, spread: 0.045, at: [0, 0.13, 0.15] },
  anim: {
    idle: { breathRate: 1.6, breath: 0.03, headDrift: 0.14, sway: 0.04, twitch: 0.7 }, walk: { twist: 0.22, roll: 0.08, headNod: 0.06, elbow: 0.5, drag: 0.4 },
    flinch: { head: 1, chest: 1, arms: 1 }, death: { buckle: 1.3, slump: 1 },
    cloth: [{ bone: 'loinF', gain: 0.16, k: 60, damp: 5, flutter: 0.05 }, { bone: 'loinB', gain: 0.18, k: 52, damp: 4.6, flutter: 0.06 }],
  },
};
// The Crucible Squire: a young knight of the Crucible in dark bronze half-plate, a horned helm, a small oval shield and a
// knight's sword; amber growths of the Crucible's old life breaking out of the pauldrons and the back.
MODEL_DEFS.crucibleSquire = {
  extends: 'crucibleKnight', budget: 'enemy', fit: 1.0,
  proportions: { ...IRONBOUND_PROPS, shoulderX: 0.37, torsoW: 0.24, torsoD: 0.18, armR: 0.064, legR: 0.088, headR: 0.118 },
  posture: { chest: [0.08, 0, 0], neck: [0.05, 0, 0], head: [0.02, 0, 0], elbowL: [-0.55, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    ...IRONBOUND_MATS,
    plate: { tex: 'crucibleBronze', tint: 0xffffff, decay: 0.5 },
    gilt: { tex: 'scionGold', tint: 0xd8a860, decay: 0.45 },
    mail: { tex: 'knightMail', tint: 0x3e3630, decay: 0.8 },
    shieldFace: { tex: 'crucibleBronze', tint: 0xe0b890, decay: 0.55 },
    shieldTrim: { tex: 'scionGold', tint: 0xc89850, decay: 0.45 },
    grip: { tex: 'crackedLeather', tint: 0x4a3020, decay: 0.6 },
    blade: { tex: 'dentedSteel', tint: 0xc0a080, decay: 0.45 },
    guard: { tex: 'crucibleBronze', tint: 0xd0a070, decay: 0.5 },
    cloth: { tex: 'tatteredFabric', tint: 0x6a3a1c, decay: 0.7, double: true },
    amber: { glow: 0xffa830 },
    eye: { glow: 0xffb050 },
  },
  bones: { loinF: { parent: 'spin', at: [0, -0.04, 0.17] }, loinB: { parent: 'spin', at: [0, -0.04, -0.17] },
           capeA: { parent: 'chest', at: [0, 0.56, -0.2] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] } },
  parts: [
    { use: 'breastplate', slot: 'plate', bone: 'chest' },
    { use: 'medallion', slot: 'gilt', bone: 'chest', at: [0, 0.4, 0.2], r: 0.055 },
    { use: 'neckGuard', slot: 'plate', bone: 'chest' },
    { use: 'tassets', slot: 'plate', bone: 'spin' },
    { use: 'crucibleHelm', slot: 'plate', metal: 'gilt', bone: 'head', size: 1.02 },
    { use: 'layeredPauldron', slot: 'plate', bone: 'armR', side: -1, size: 1.25, rivet: 'gilt', strap: 'grip' },
    { use: 'layeredPauldron', slot: 'plate', bone: 'armL', side: 1, size: 1.15, rivet: 'gilt', strap: 'grip' },
    { use: 'crystalCluster', slot: 'amber', bone: 'armR', at: [-0.06, 0.08, -0.02], dir: [-0.6, 1, -0.3], count: 6, size: 1.0, seed: 3 },
    { use: 'crystalCluster', slot: 'amber', bone: 'chest', at: [0.06, 0.48, -0.2], dir: [0.3, 0.8, -1], count: 7, size: 1.1, seed: 8 },
    { use: 'plateBands', slot: 'plate', bone: 'elbowR', from: 0.03, to: 0.28, radius: 0.06, count: 3, flare: 0.25, cop: 0.068 },
    { use: 'plateBands', slot: 'plate', bone: 'elbowL', from: 0.03, to: 0.28, radius: 0.058, count: 3, flare: 0.2, cop: 0.064 },
    { use: 'plateBands', slot: 'plate', bone: 'kneeL', from: 0.03, to: 0.42, radius: 0.072, count: 4, flare: 0.14, cop: 0.084 },
    { use: 'plateBands', slot: 'plate', bone: 'kneeR', from: 0.03, to: 0.42, radius: 0.072, count: 4, flare: 0.14, cop: 0.084 },
    { use: 'clothStrip', slot: 'cloth', bone: 'loinF', w: 0.28, len: 0.55, seed: 5 },
    { use: 'clothStrip', slot: 'cloth', bone: 'loinB', w: 0.32, len: 0.6, seed: 9 },
    { use: 'capeSegment', slot: 'cloth', bone: 'capeA', w0: 0.5, w1: 0.62, len: 0.42, bow: 1.0 },
    { use: 'capeSegment', slot: 'cloth', bone: 'capeB', w0: 0.62, w1: 0.7, len: 0.4, bow: 0.7, ragged: true, seed: 4 },
    { use: 'ovalShield', slot: 'shieldFace', metal: 'shieldTrim', bone: 'elbowL', w: 0.62, h: 0.86, at: [0.08, -0.22, 0.2] },
  ],
  weapon: { use: 'knightGreatsword', slots: { blade: 'blade', grip: 'grip', guard: 'guard' } },
  eyes: { color: 0xffb050, size: 0.012, spread: 0.04, at: [0, 0.15, 0.165] },
  anim: { ...IRONBOUND_ANIM,
    cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.12, k: 54, damp: 4.6, flutter: 0.04 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.09, k: 30, damp: 3.2, flutter: 0.07, sideways: 1.1 }] },
};
// The Leyndell Knight: a tall knight of the capital in white-gold plate, a great white plume, a pale tabard with the
// Erdtree raised in gold on the breast, a long cape; a greatsword.
MODEL_DEFS.leyndellKnight = {
  extends: 'ironWarden', budget: 'enemy', fit: 1.0,
  proportions: { ...IRONBOUND_PROPS, shoulderX: 0.39, torsoW: 0.25, torsoD: 0.18, armR: 0.064, legR: 0.09, headR: 0.118 },
  posture: { chest: [0.0, 0, 0], neck: [0.02, 0, 0], head: [0.0, 0, 0], elbowL: [-0.25, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    ...IRONBOUND_MATS,
    plate: { tex: 'leyndellPlate', tint: 0xffffff, decay: 0.35 },
    gilt: { tex: 'scionGold', tint: 0xf0c868, decay: 0.3 },
    mail: { tex: 'knightMail', tint: 0x8a8478, decay: 0.6 },
    tabard: { tex: 'leyndellCloth', tint: 0xffffff, decay: 0.4, double: true },
    cape: { tex: 'leyndellCloth', tint: 0x5a6a8a, decay: 0.45, double: true },
    plume: { tex: 'leyndellPlume', tint: 0xffffff, decay: 0.25, double: true },
    void: { tex: 'ashSoot', tint: 0x0a0806, decay: 0.9 },
    grip: { tex: 'crackedLeather', tint: 0x3a2a1e, decay: 0.5 },
    blade: { tex: 'dentedSteel', tint: 0xd8d4c8, decay: 0.3 },
    guard: { tex: 'scionGold', tint: 0xe0b860, decay: 0.35 },
    eye: { glow: 0xfff0c0 },
  },
  bones: { loinF: { parent: 'spin', at: [0, -0.04, 0.18] }, loinB: { parent: 'spin', at: [0, -0.04, -0.18] },
           capeA: { parent: 'chest', at: [0, 0.58, -0.21] }, capeB: { parent: 'capeA', at: [0, -0.44, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] } },
  parts: [
    { use: 'breastplate', slot: 'plate', bone: 'chest' },
    { use: 'erdtreeEmblem', slot: 'gilt', bone: 'chest', at: [0, 0.37, 0.205], size: 1.0 },
    { use: 'neckGuard', slot: 'plate', bone: 'chest' },
    { use: 'tassets', slot: 'plate', bone: 'spin' },
    { use: 'plumedHelm', slot: 'plate', trim: 'gilt', plume: 'plume', dark: 'void', bone: 'head', size: 1.05, feathers: 7 },
    { use: 'roundPauldron', slot: 'plate', bone: 'armR', size: 1.5, side: -1 }, { use: 'roundPauldron', slot: 'plate', bone: 'armL', size: 1.5 },
    { use: 'couter', slot: 'plate', bone: 'elbowL', size: 1.05, side: 1 }, { use: 'couter', slot: 'plate', bone: 'elbowR', size: 1.05, side: -1 },
    { use: 'gauntlet', slot: 'plate', bone: 'elbowL', size: 1.05 }, { use: 'gauntlet', slot: 'plate', bone: 'elbowR', size: 1.05 },
    { use: 'greave', slot: 'plate', bone: 'kneeL', size: 1.05 }, { use: 'greave', slot: 'plate', bone: 'kneeR', size: 1.05 },
    { use: 'kneeCop', slot: 'gilt', bone: 'kneeL', r: 0.07 }, { use: 'kneeCop', slot: 'gilt', bone: 'kneeR', r: 0.07 },
    { use: 'clothStrip', slot: 'tabard', bone: 'loinF', w: 0.3, len: 0.7, seed: 3 }, { use: 'clothStrip', slot: 'tabard', bone: 'loinB', w: 0.32, len: 0.74, seed: 6 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeA', w0: 0.62, w1: 0.76, len: 0.46, bow: 1.0 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeB', w0: 0.76, w1: 0.86, len: 0.44, bow: 0.8 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeC', w0: 0.86, w1: 0.9, len: 0.36, bow: 0.6, ragged: true, seed: 3 },
    { use: 'belt', slot: 'gilt', bone: 'spin' },
  ],
  weapon: { use: 'greatSword', slots: { blade: 'blade', grip: 'grip', guard: 'guard' } },
  eyes: { color: 0xfff0c0, size: 0.011, spread: 0.04, at: [0, 0.105, 0.17] },
  anim: { ...IRONBOUND_ANIM,
    cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.12, k: 54, damp: 4.6, flutter: 0.04 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 34, damp: 3.6, flutter: 0.05 },
            { bone: 'capeC', gain: 0.09, k: 28, damp: 3.0, flutter: 0.08, sideways: 1.2 }] },
};
// The Ashen Warrior: one of Hoarah Loux's old champions risen from the ash: a vast bare body grey with ash, embers glowing
// in its cracks, a lion's head worn as a hood with its mane over the shoulders, bracers and a loincloth; a great axe.
MODEL_DEFS.ashenWarrior = {
  faction: 'lord', budget: 'enemy', fit: 1.02, limbSides: 8,
  proportions: { shoulderX: 0.44, torsoW: 0.3, torsoD: 0.21, armR: 0.088, legR: 0.1, headR: 0.12, handR: 0.078, footLen: 0.33 },
  limbs: { armR: { len: 1.02, thick: 1.15 }, armL: { len: 1.02, thick: 1.15 }, legL: { thick: 1.1 }, legR: { thick: 1.1 } },
  posture: { chest: [0.12, 0, 0], head: [-0.02, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.38, 0, 0] },
  materials: {
    skin: { tex: 'ashenSkin', tint: 0xffffff, decay: 0.6 },
    lion: { tex: 'lionFur', tint: 0x9a9080, decay: 0.55, double: true },
    hide: { tex: 'lionFur', tint: 0x7a6a50, decay: 0.5 },
    bone: { tex: 'bone', tint: 0xd8ccb0, decay: 0.4 },
    void: { tex: 'ashSoot', tint: 0x0a0806, decay: 0.9 },
    leather: { tex: 'crackedLeather', tint: 0x3a2e24, decay: 0.7 },
    sash: { tex: 'tatteredFabric', tint: 0x4a3a30, decay: 0.75, double: true },
    blade: { tex: 'dentedSteel', tint: 0x7a7470, decay: 0.7 },
    haft: { tex: 'rustedIron', tint: 0x4a3a2a, decay: 0.6 },
    gold: { tex: 'dentedSteel', tint: 0x9a7a40, decay: 0.6 },
    ember: { glow: 0xff6a1a },
    eye: { glow: 0xff7a24 },
  },
  body: { torso: null, pelvis: 'sash', arms: 'skin', legs: 'skin', head: 'skin', neck: 'skin', hands: 'skin', feet: 'leather' },
  bones: { loinF: { parent: 'spin', at: [0, -0.02, 0.21] }, loinB: { parent: 'spin', at: [0, -0.02, -0.21] },
           pelt: { parent: 'chest', at: [0, 0.6, -0.24] }, peltB: { parent: 'pelt', at: [0, -0.42, 0] } },
  parts: [
    { use: 'muscleTorso', slot: 'skin', bone: 'chest', bulk: 1.2 },
    { use: 'lionPelt', slot: 'hide', fur: 'lion', fangs: 'bone', dark: 'void', bone: 'head', size: 1.35, count: 44 },
    { use: 'emberVeins', slot: 'ember', bone: 'chest', count: 14, bulk: 0.12, seed: 5 },
    { use: 'capeSegment', slot: 'lion', bone: 'pelt', w0: 0.6, w1: 0.72, len: 0.44, bow: 1.0 },
    { use: 'capeSegment', slot: 'lion', bone: 'peltB', w0: 0.72, w1: 0.7, len: 0.4, bow: 0.8, ragged: true, seed: 8 },
    { use: 'wraps', slot: 'leather', bone: 'elbowL', from: 0.04, to: 0.3, radius: 0.098, count: 3 }, { use: 'wraps', slot: 'leather', bone: 'elbowR', from: 0.04, to: 0.3, radius: 0.098, count: 3 },
    { use: 'wraps', slot: 'leather', bone: 'kneeL', from: 0.2, to: 0.42, radius: 0.09, count: 3 }, { use: 'wraps', slot: 'leather', bone: 'kneeR', from: 0.2, to: 0.42, radius: 0.09, count: 3 },
    { use: 'belt', slot: 'gold', bone: 'spin' },
    { use: 'clothStrip', slot: 'sash', bone: 'loinF', w: 0.32, len: 0.7, seed: 3 }, { use: 'clothStrip', slot: 'sash', bone: 'loinB', w: 0.4, len: 0.72, seed: 7 },
    { use: 'chain', slot: 'gold', bone: 'chest', from: [0.24, 0.5, 0.14], to: [-0.12, 0.08, 0.2], links: 9, sag: 0.05 },
  ],
  weapon: { use: 'greatAxe', slots: { blade: 'blade', grip: 'haft', guard: 'gold' } },
  eyes: { color: 0xff7a24, size: 0.016, spread: 0.06, at: [0, 0.11, 0.125] },
  anim: {
    idle: { breathRate: 0.9, breath: 0.03, headDrift: 0.05, sway: 0.025, twitch: 0 }, walk: { twist: 0.14, roll: 0.07, headNod: 0.05, elbow: 0.25, drag: 0.15 },
    flinch: { head: 0.35, chest: 0.35, arms: 0.35 }, death: { buckle: 1.2, slump: 1 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 52, damp: 4.6, flutter: 0.04 },
            { bone: 'pelt', gain: 0.06, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'peltB', gain: 0.08, k: 30, damp: 3.2, flutter: 0.06, sideways: 1.1 }],
  },
};
// The Beastman of Farum Azula: a lean grey wolfish beast-man, hunched, long ears and a muzzle, fur matted over its
// shoulders and down its back, scraps of a robe, a curved blade; it springs from the ruins.
MODEL_DEFS.beastman = {
  faction: 'beast', budget: 'enemy', fit: 1.04, limbSides: 7,
  proportions: { shoulderX: 0.31, torsoW: 0.2, torsoD: 0.15, armR: 0.05, legR: 0.07, headR: 0.112, handR: 0.055, footLen: 0.32 },
  limbs: { armL: { len: 1.12, thick: 0.95 }, armR: { len: 1.12, thick: 0.95 } },
  posture: { chest: [0.5, 0, 0], neck: [0.15, 0, 0], head: [-0.32, 0, 0], elbowL: [-0.7, 0, 0], elbowR: [-0.6, 0, 0], legL: [-0.25, 0, 0.05], legR: [-0.25, 0, -0.05], kneeL: [0.45, 0, 0], kneeR: [0.45, 0, 0] },
  materials: {
    fur: { tex: 'beastFur', tint: 0xffffff, decay: 0.6 },
    hide: { tex: 'beastFur', tint: 0x9a9088, decay: 0.55 },
    rags: { tex: 'tatteredFabric', tint: 0x5a4434, decay: 0.8, double: true },
    leather: { tex: 'crackedLeather', tint: 0x3e3026, decay: 0.7 },
    blade: { tex: 'dentedSteel', tint: 0x9a968e, decay: 0.6 },
    steel: { tex: 'rustedIron', tint: 0x6a5a48, decay: 0.6 },
    claw: { tex: 'bone', tint: 0xd8ccb0, decay: 0.5 },
    void: { tex: 'ashSoot', tint: 0x0a0806, decay: 0.9 },
    eye: { glow: 0xff9a40 },
  },
  body: { torso: 'fur', pelvis: 'rags', arms: 'fur', legs: 'fur', head: 'fur', neck: 'fur', hands: 'hide', feet: 'hide' },
  bones: { loinF: { parent: 'spin', at: [0, -0.02, 0.16] }, loinB: { parent: 'spin', at: [0, -0.02, -0.16] }, tail: { parent: 'spin', at: [0, 0.0, -0.14] } },
  parts: [
    { use: 'wolfMuzzle', slot: 'hide', dark: 'void', fangs: 'claw', bone: 'head', size: 1.0 },
    { use: 'beastEars', slot: 'hide', bone: 'head', size: 1.0 },
    { use: 'furClumps', slot: 'fur', bone: 'chest', from: [-0.28, 0.4, -0.22], to: [0.28, 0.64, 0.02], lay: [0, -0.5, -1], count: 40, len: 0.22, seed: 3 },
    { use: 'furClumps', slot: 'fur', bone: 'chest', from: [-0.12, 0.06, -0.18], to: [0.12, 0.42, -0.14], lay: [0, -1, -0.6], count: 16, len: 0.14, seed: 7 },
    { use: 'furClumps', slot: 'fur', bone: 'neck', from: [-0.1, -0.02, -0.1], to: [0.1, 0.1, 0.08], lay: [0, -0.6, -0.6], count: 14, len: 0.14, seed: 9 },
    { use: 'sleeve', slot: 'rags', bone: 'armR', len: 0.3, seed: 3 },
    { use: 'ropeSash', slot: 'leather', bone: 'spin', y: 0.05 },
    { use: 'clothStrip', slot: 'rags', bone: 'loinF', w: 0.26, len: 0.48, seed: 5 }, { use: 'clothStrip', slot: 'rags', bone: 'loinB', w: 0.3, len: 0.52, seed: 8 },
    { use: 'furTail', slot: 'fur', bone: 'tail', size: 0.55, side: -1 },
    { use: 'fingers', slot: 'claw', bone: 'elbowL', len: 0.12, r: 0.01, at: 0.34 },
  ],
  weapon: { use: 'scimitar', slots: { blade: 'blade', grip: 'leather', guard: 'steel' } },
  eyes: { color: 0xff9a40, size: 0.013, spread: 0.05, at: [0, 0.1, 0.13] },
  anim: {
    idle: { breathRate: 1.8, breath: 0.035, headDrift: 0.16, sway: 0.04, twitch: 0.8 }, walk: { twist: 0.22, roll: 0.08, headNod: 0.07, elbow: 0.5, drag: 0.3 },
    flinch: { head: 1, chest: 1, arms: 1 }, death: { buckle: 1.3, slump: 1 },
    cloth: [{ bone: 'loinF', gain: 0.16, k: 60, damp: 5, flutter: 0.05 }, { bone: 'loinB', gain: 0.18, k: 52, damp: 4.6, flutter: 0.06 }],
  },
};
// The Golden Zealot: a tall fundamentalist of the Golden Order in white and gold robes, a gold mitre, a ring of light
// behind the head and the Elden Rune glowing on the breast; Marika's hammer.
MODEL_DEFS.goldenZealot = {
  faction: 'order', budget: 'enemy', fit: 1.02, limbSides: 7,
  proportions: { shoulderX: 0.33, torsoW: 0.21, torsoD: 0.15, armR: 0.052, legR: 0.075, headR: 0.118, handR: 0.055, footLen: 0.3 },
  limbs: {},
  posture: { chest: [0.04, 0, 0], neck: [0.04, 0, 0], head: [0.02, 0, 0], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0] },
  materials: {
    skin: { tex: 'paleSkin', tint: 0xd8c8b4, decay: 0.3 },
    robe: { tex: 'zealotRobe', tint: 0xffffff, decay: 0.35, double: true },
    robeGold: { tex: 'zealotRobe', tint: 0xe0c070, decay: 0.3, double: true },
    gold: { tex: 'zealotGold', tint: 0xffffff, decay: 0.25 },
    haft: { tex: 'zealotGold', tint: 0x8a6a34, decay: 0.4 },
    halo: { glow: 0xffd870 },
    rune: { glow: 0xffe090 },
    eye: { glow: 0xffe8b0 },
  },
  body: { torso: 'robe', pelvis: 'robe', arms: 'robe', legs: 'robe', head: 'skin', neck: 'skin', hands: 'skin', feet: 'gold' },
  bones: { loinF: { parent: 'spin', at: [0, -0.02, 0.16] }, loinB: { parent: 'spin', at: [0, -0.02, -0.16] },
           capeA: { parent: 'chest', at: [0, 0.56, -0.19] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] }, capeC: { parent: 'capeB', at: [0, -0.4, 0] } },
  parts: [
    { use: 'robeSkirt', slot: 'robe', bone: 'spin', len: 1.0, top: 0.2, hem: 0.4, seed: 3 },
    { use: 'robeSkirt', slot: 'robeGold', bone: 'spin', len: 0.55, top: 0.22, hem: 0.36, seed: 5 },
    { use: 'jerkin', slot: 'robe', bone: 'chest' },
    { use: 'mantle', slot: 'robeGold', bone: 'chest', seed: 4 },
    { use: 'eldenRune', slot: 'rune', bone: 'chest', at: [0, 0.38, 0.19], size: 0.85 },
    { use: 'goldMitre', slot: 'robe', gold: 'gold', bone: 'head', size: 1.0 },
    { use: 'haloRing', slot: 'halo', bone: 'head', at: [0, 0.2, -0.22], size: 1.0, tilt: 0.12 },
    { use: 'sleeve', slot: 'robe', bone: 'armL', len: 0.42, r1: 0.16, seed: 4 }, { use: 'sleeve', slot: 'robe', bone: 'armR', len: 0.42, r1: 0.16, seed: 5 },
    { use: 'belt', slot: 'gold', bone: 'spin' },
    { use: 'clothStrip', slot: 'robeGold', bone: 'loinF', w: 0.24, len: 0.85, seed: 3 },
    { use: 'capeSegment', slot: 'robe', bone: 'capeA', w0: 0.56, w1: 0.68, len: 0.44, bow: 1.0 },
    { use: 'capeSegment', slot: 'robe', bone: 'capeB', w0: 0.68, w1: 0.78, len: 0.42, bow: 0.8 },
    { use: 'capeSegment', slot: 'robeGold', bone: 'capeC', w0: 0.78, w1: 0.82, len: 0.36, bow: 0.6 },
  ],
  weapon: { use: 'zealotHammer', slots: { blade: 'gold', grip: 'haft', guard: 'gold' } },
  eyes: { color: 0xffe8b0, size: 0.012, spread: 0.048, at: [0, 0.1, 0.11] },
  anim: {
    idle: { breathRate: 1.1, breath: 0.02, headDrift: 0.04, sway: 0.02, twitch: 0 }, walk: { twist: 0.12, roll: 0.04, headNod: 0.03, elbow: 0.3, drag: 0.1 },
    flinch: { head: 0.6, chest: 0.6, arms: 0.6 }, death: { buckle: 1.0, slump: 1 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5, flutter: 0.03 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 34, damp: 3.6, flutter: 0.05 },
            { bone: 'capeC', gain: 0.09, k: 28, damp: 3.0, flutter: 0.08, sideways: 1.2 }],
  },
};
// The Cleanrot Knight: a knight sworn to Malenia in ornate gold armour worked like layered feathers, a tall conical helm
// trailing a crimson tassel, a torn crimson cape, scarlet rot blooming on the plate; a long spear.
MODEL_DEFS.cleanrotKnight = {
  extends: 'ironWarden', budget: 'enemy', fit: 1.0,
  proportions: { ...IRONBOUND_PROPS, shoulderX: 0.36, torsoW: 0.23, torsoD: 0.17, armR: 0.06, legR: 0.085, headR: 0.115 },
  posture: { chest: [0.04, 0, 0], neck: [0.02, 0, 0], head: [0.0, 0, 0], elbowL: [-0.5, 0, 0], elbowR: [-0.4, 0, 0] },
  materials: {
    ...IRONBOUND_MATS,
    plate: { tex: 'cleanrotGold', tint: 0xffffff, decay: 0.38 },
    gilt: { tex: 'scionGold', tint: 0xe8c070, decay: 0.3 },
    mail: { tex: 'sentinelMail', tint: 0x9a7a40, decay: 0.55 },
    cape: { tex: 'cleanrotCape', tint: 0xffffff, decay: 0.6, double: true },
    tassel: { tex: 'margitRags', tint: 0xb02418, decay: 0.4, double: true },
    void: { tex: 'ashSoot', tint: 0x0a0806, decay: 0.9 },
    blade: { tex: 'sentinelSteel', tint: 0xc8b890, decay: 0.4 },
    rust: { tex: 'rustedIron', tint: 0x8a3a20, decay: 0.6 },
    socket: { tex: 'ashSoot', tint: 0x2a1a10, decay: 0.8 },
    wood: { tex: 'barkMoss', tint: 0x5a3a28, decay: 0.4 },
    iron: { tex: 'scionGold', tint: 0xc89850, decay: 0.4 },
    rags: { tex: 'cleanrotCape', tint: 0xd04030, decay: 0.5, double: true },
    rot: { glow: 0xff4030 },
    eye: { glow: 0xff7050 },
  },
  bones: { loinF: { parent: 'spin', at: [0, -0.04, 0.17] }, loinB: { parent: 'spin', at: [0, -0.04, -0.17] },
           capeA: { parent: 'chest', at: [0, 0.56, -0.2] }, capeB: { parent: 'capeA', at: [0, -0.44, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] } },
  parts: [
    { use: 'breastplate', slot: 'plate', bone: 'chest', slim: true },
    { use: 'medallion', slot: 'gilt', bone: 'chest', at: [0, 0.4, 0.19], r: 0.05 },
    { use: 'neckGuard', slot: 'plate', bone: 'chest' },
    { use: 'tassets', slot: 'plate', bone: 'spin' },
    { use: 'cleanrotHelm', slot: 'plate', tassel: 'tassel', dark: 'void', bone: 'head', size: 1.0 },
    { use: 'layeredPauldron', slot: 'plate', bone: 'armR', side: -1, size: 1.2, rivet: 'gilt', strap: 'mail' },
    { use: 'layeredPauldron', slot: 'plate', bone: 'armL', side: 1, size: 1.2, rivet: 'gilt', strap: 'mail' },
    { use: 'couter', slot: 'plate', bone: 'elbowL', size: 1.0, side: 1 }, { use: 'couter', slot: 'plate', bone: 'elbowR', size: 1.0, side: -1 },
    { use: 'gauntlet', slot: 'plate', bone: 'elbowL', size: 1.0 }, { use: 'gauntlet', slot: 'plate', bone: 'elbowR', size: 1.0 },
    { use: 'greave', slot: 'plate', bone: 'kneeL', size: 1.0 }, { use: 'greave', slot: 'plate', bone: 'kneeR', size: 1.0 },
    { use: 'rotBlooms', slot: 'rot', bone: 'chest', at: [[0.14, 0.46, 0.17], [-0.18, 0.2, 0.15], [0.22, 0.56, -0.05]], size: 1.0 },
    { use: 'clothStrip', slot: 'cape', bone: 'loinF', w: 0.24, len: 0.6, seed: 3 }, { use: 'clothStrip', slot: 'cape', bone: 'loinB', w: 0.3, len: 0.66, seed: 6 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeA', w0: 0.58, w1: 0.72, len: 0.46, bow: 1.0 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeB', w0: 0.72, w1: 0.82, len: 0.44, bow: 0.8 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeC', w0: 0.82, w1: 0.86, len: 0.36, bow: 0.6, ragged: true, seed: 5 },
  ],
  weapon: { use: 'cleanrotSpear', slots: { blade: 'blade', grip: 'wood', guard: 'gilt' } },
  eyes: { color: 0xff7050, size: 0.01, spread: 0.04, at: [0, 0.135, 0.15] },
  anim: { ...IRONBOUND_ANIM,
    cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.12, k: 54, damp: 4.6, flutter: 0.04 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 34, damp: 3.6, flutter: 0.05 },
            { bone: 'capeC', gain: 0.1, k: 26, damp: 2.8, flutter: 0.09, sideways: 1.3 }] },
};
// Seren, the Grace-Bearer (the second road's guide; not an enemy): a slight maiden in pale layered robes and a deep grey
// hood, a lantern of grace in her left hand.
MODEL_DEFS.seren = {
  extends: 'ysolde',
  materials: {
    skin: { tex: 'paleSkin', tint: 0xd8c8b8, decay: 0.2 },
    dress: { tex: 'serenRobe', tint: 0xffffff, decay: 0.35, double: true },
    shawl: { tex: 'rottenCloth', tint: 0x4a4e5c, decay: 0.4, double: true },
    shawlHem: { tex: 'tatteredFabric', tint: 0x464a58, decay: 0.5, double: true },
    leather: { tex: 'crackedLeather', tint: 0x6a5240, decay: 0.4 },
    rope: { tex: 'rottenCloth', tint: 0xc8b890, decay: 0.5 },
    iron: { tex: 'rustedIron', tint: 0x5a5048, decay: 0.5 },
    grace: { glow: 0xffd890 },
  },
  parts: [
    { use: 'robeSkirt', slot: 'dress', bone: 'spin', len: 0.92, top: 0.18, hem: 0.32, seed: 4 },
    { use: 'jerkin', slot: 'dress', bone: 'chest' },
    { use: 'ropeSash', slot: 'rope', bone: 'spin', y: 0.05 },
    { use: 'hood', slot: 'shawl', bone: 'head', size: 1.12, tail: 0.7, close: 0.12 },
    { use: 'mantle', slot: 'shawl', bone: 'chest', seed: 6 },
    { use: 'lantern', slot: 'iron', glow: 'grace', bone: 'elbowL', at: 0.34, size: 1.0 },
    { use: 'capeSegment', slot: 'shawl', bone: 'capeA', w0: 0.46, w1: 0.56, len: 0.4, bow: 1.0 },
    { use: 'capeSegment', slot: 'shawl', bone: 'capeB', w0: 0.56, w1: 0.6, len: 0.4, bow: 0.8 },
    { use: 'capeSegment', slot: 'shawlHem', bone: 'capeC', w0: 0.6, w1: 0.62, len: 0.32, bow: 0.7, ragged: true, seed: 11 },
  ],
};

// ---- moves borrowed from the bosses ----------------------------------------------------------------------------------------
// k: this enemy's scale over the boss's. Boxes (and their rings), reaches, lunges, steps, leaps, blinks, sigils and impact
// sizes shrink by it; projectiles keep their reach. Branches (followUps) name the boss's other moves, so they go.
const landsBorrow = (source, id, k, changes = {}) => {
  const original = source.attacks.find(a => a.id === id);
  if (!original) throw new Error(`Lands enemies: unknown attack "${source.id}/${id}".`);
  const a = JSON.parse(JSON.stringify(original)), r2 = v => Math.round(v * 100) / 100;
  delete a.followUps;
  const box = b => { if (!b) return; for (const f of ['w', 'h', 'd', 'fwd', 'y']) if (typeof b[f] === 'number') b[f] = r2(b[f] * k); if (b.ring) for (const f of ['from', 'to', 'width']) b.ring[f] = r2(b.ring[f] * k); };
  const imp = m => { if (m) for (const f of ['ring', 'crack']) if (typeof m[f] === 'number') m[f] = r2(m[f] * k); };
  box(a.box); imp(a.impact);
  for (const h of a.hits) {
    box(h.box); imp(h.impact);
    if (h.step) h.step.side = r2(h.step.side * k);
    if (h.leap) { h.leap.max = r2(h.leap.max * k); if (h.leap.short) h.leap.short = r2(h.leap.short * k); if (h.leap.back) h.leap.back = r2(h.leap.back * k); }
    if (h.blink) { if (h.blink.dist) h.blink.dist = r2(h.blink.dist * k); if (h.blink.back) h.blink.back = r2(h.blink.back * k); }
    if (h.sigil) h.sigil = r2(h.sigil * k);
    if (h.abort) delete h.abort;
  }
  if (!a.projectile) { a.range = r2(a.range * k); if (a.minRange) a.minRange = r2(a.minRange * k); }
  a.lunge = r2((a.lunge || 0) * k);
  if (a.poseScale) a.poseScale = Math.min(a.poseScale, 1.2);
  Object.assign(a, { origin: { enemy: source.id, attack: id } });
  return typeof changes === 'function' ? (changes(a) || a) : Object.assign(a, changes);
};
const CK = { attacks: Object.values(CK_ATTACKS), id: 'crucibleKnight' };
const landsGlint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
// A stagger meter (normal enemies of Ashmere's Undead Knight kind): never interrupted until it fills, then it kneels.
const landsStagger = (heavy, light, breakTime = 2.2) => ({ max: 100, heavy, light, breakers: ['heavy', 'jumpHeavy'], decayDelay: 2.5, decay: 9.6, breakTime, hitstop: 0.14 });

// ---- the enemies ---------------------------------------------------------------------------------------------------------
const LANDS_ENEMY_DEFS = [
  {
    id: 'omenkin', model: 'omenkin', name: 'Omenkin', description: 'A lesser Omen of Stormhill, horned and hunched, with Margit\'s patience: its cane waits before it falls, and it throws daggers of light.',
    scale: 1.4, bulk: 1.1, radius: 0.56, color: 0x4a4458, weapon: 'spear', idle: 'sway',
    visual: { skin: 0x8a8682, roughness: 0.75, rim: 0.85 },
    hp: 360, poise: 90, speed: 2.7, turnRate: 4, trackRate: 1.8, approach: 0.45, kite: 0.15,
    cooldown: [0.9, 1.8], crowd: { groupCooldown: 2.2 }, flinchTime: 0, staggerTime: 1.2, parriedTime: 1.8,
    stagger: landsStagger(34, 10),
    attacks: [
      landsBorrow(MARGIT, 'caneCombo', 0.76, { id: 'omenCaneCombo', name: 'Omen Double Slash', damage: 22, chance: 1 }),
      landsBorrow(MARGIT, 'flickOverhead', 0.76, { id: 'omenFlick', name: 'Omen Upward Slash, Overhead', damage: 26, chance: 0.8 }),
      landsBorrow(MARGIT, 'daggerToss', 0.76, { id: 'omenDagger', name: 'Golden Dagger', damage: 15, chance: 0.35, minRange: 4, range: 18 }),
      landsBorrow(MARGIT, 'canePlunge', 0.76, { id: 'omenPlunge', name: 'Omen Leaping Plunge', damage: 32, chance: 0.25 }),
      landsBorrow(MARGIT, 'tailSwipe', 0.76, { id: 'omenTail', name: 'Omen Tail', damage: 18, chance: 3 }),
    ],
  },
  {
    id: 'graftedScion', model: 'graftedScion', name: 'Grafted Scion', description: 'One of Godrick\'s grafted things: a gold mask and a blade in every sewn-on hand. Low, fast, and its rampage steps at you from side to side.',
    scale: 1.2, bulk: 0.9, radius: 0.48, color: 0xb8a898, weapon: 'sword', idle: 'twitch',
    visual: { skin: 0xc8b8a8, roughness: 0.6, rim: 0.8 },
    hp: 300, poise: 70, speed: 3.6, turnRate: 6, trackRate: 2.8, approach: 0.7, kite: 0.3,
    cooldown: [0.6, 1.3], crowd: { groupCooldown: 1.8 }, flinchTime: 0.2, staggerTime: 1.0, parriedTime: 1.7,
    stagger: landsStagger(40, 12, 2.0),
    attacks: [
      landsBorrow(GODRICK, 'rampage', 0.57, a => ({ ...a, id: 'scionRampage', name: 'Grafted Rampage', damage: 14, chance: 0.7, hits: [a.hits[0], a.hits[1], a.hits[2], a.hits[4]], recovery: 1.2 })),
      landsBorrow(GODRICK, 'doubleStep', 0.57, { id: 'scionDoubleStep', name: 'Grafted Double Strike', damage: 22, chance: 0.6 }),
      landsBorrow(GODRICK, 'dragSlash', 0.57, { id: 'scionDrag', name: 'Grafted Dragging Slash', damage: 20, chance: 0.5, minRange: 3 }),
      landsBorrow(GODRICK, 'jumpSlam', 0.57, { id: 'scionPounce', name: 'Grafted Pounce', damage: 28, chance: 0.4, recovery: 1.3, minRange: 3 }),
      landsBorrow(GODRICK, 'backhand', 0.57, { id: 'scionBackhand', name: 'Grafted Backhand', damage: 16, chance: 2 }),
    ],
  },
  {
    id: 'crucibleSquire', model: 'crucibleSquire', name: 'Crucible Squire', description: 'A young knight of the Crucible in dark bronze. Its little shield turns your blows and earns a bash; its stomp runs along the floor (jump it); a golden tail sweeps round it.',
    scale: 1.25, bulk: 1.15, radius: 0.55, color: 0x8a5a2a, weapon: 'sword', offhand: 'shield', idle: 'still',
    visual: { skin: 0x8a6a40, skinMetal: 0.4, metal: 0.55, roughness: 0.42, rim: 0.85 },
    hp: 400, poise: 110, speed: 2.5, turnRate: 3.4, trackRate: 1.6, approach: 0.4,
    cooldown: [0.9, 1.7], flinchTime: 0, staggerTime: 1.2, parriedTime: 1.9,
    guard: { arc: 0.95, damageMul: 0.3, knockMul: 0.3, lowerReach: 1.0, blockedMul: 0.4, breakers: ['heavy', 'jumpHeavy'],
             max: 100, heavy: 30, light: 9, decayDelay: 2.5, decay: 9.6, breakTime: 2.4, hitstop: 0.14 },
    attacks: [
      landsBorrow(CK, 'lungeThrust', 0.8, { id: 'squireLunge', name: 'Squire\'s Lunge', damage: 24, chance: 0.5 }),
      landsBorrow(CK, 'diagonalSlash', 0.8, { id: 'squireDiagonal', name: 'Squire\'s Diagonal Slash', damage: 22, chance: 0.8 }),
      landsBorrow(CK, 'stomp', 0.8, { id: 'squireStomp', name: 'Squire\'s Earth Stomp', damage: 18, chance: 0.4, recovery: 0.9,
        followUps: [{ attack: 'squireDiagonal', if: 'near', chance: 0.5 }] }),
      landsBorrow(CK, 'tailSwipe', 0.8, { id: 'squireTail', name: 'Aspect of the Crucible: Tail', damage: 20, chance: 0.45, range: 2.6, recovery: 0.9 }),
      landsBorrow(CK, 'counterBash', 0.8, { id: 'squireBash', name: 'Shield Counter', damage: 16, chance: 2 }),
    ],
  },
  {
    id: 'leyndellKnight', model: 'leyndellKnight', name: 'Leyndell Knight', description: 'A knight of the capital in white-gold plate. Its overhead waits, then drives a thrust after it; at range it conjures a golden spear and charges, or throws it.',
    scale: 1.4, bulk: 1.2, radius: 0.6, color: 0xd8ccb0, weapon: 'sword', idle: 'guard',
    visual: { skin: 0xc8bca0, skinMetal: 0.5, metal: 0.6, roughness: 0.35, rim: 0.85 },
    hp: 460, poise: 130, speed: 2.4, turnRate: 3.2, trackRate: 1.6, approach: 0.45, kite: 0.1,
    cooldown: [0.9, 1.8], flinchTime: 0, staggerTime: 1.2, parriedTime: 1.9,
    stagger: landsStagger(32, 9, 2.3),
    attacks: [
      landsBorrow(MORGOTT, 'chopThrust', 0.72, { id: 'lkChopThrust', name: 'Overhead Chop, Thrust', damage: 30, chance: 0.8 }),
      landsBorrow(MORGOTT, 'sweepSlash', 0.72, { id: 'lkSweep', name: 'Greatsword Slashes', damage: 24, chance: 1 }),
      landsBorrow(MORGOTT, 'spearCharge', 0.72, { id: 'lkSpear', name: 'Golden Spear Charge', damage: 26, chance: 0.45 }),
      landsBorrow(MORGOTT, 'spearThrow', 0.72, { id: 'lkJavelin', name: 'Golden Javelin', damage: 24, chance: 0.4, minRange: 9, range: 24 }),
    ],
  },
  {
    id: 'ashenWarrior', model: 'ashenWarrior', name: 'Ashen Warrior', description: 'One of Hoarah Loux\'s champions, risen from the ash with a lion\'s head for a hood. Its stomp splits the floor ahead (jump it), and its great axe comes down three times.',
    scale: 1.65, bulk: 1.35, radius: 0.72, color: 0x5a5450, weapon: 'greataxe', idle: 'sway',
    visual: { skin: 0x4a4440, roughness: 0.8, rim: 0.85 },
    hp: 560, poise: 180, speed: 2.3, turnRate: 3.0, trackRate: 1.4, approach: 0.45,
    cooldown: [1.0, 1.9], flinchTime: 0, staggerTime: 1.3, parriedTime: 1.9,
    stagger: landsStagger(30, 8, 2.4),
    attacks: [
      landsBorrow(GODFREY, 'stomp', 0.75, { id: 'awStomp', name: 'Ashen Earth Stomp', damage: 24, chance: 0.5, followUps: [{ attack: 'awSmash', if: 'near', chance: 0.55 }] }),
      landsBorrow(GODFREY, 'smashSpin', 0.75, { id: 'awSmash', name: 'Overhead Smash and Spin', damage: 28, chance: 0.7 }),
      landsBorrow(GODFREY, 'flurry', 0.75, { id: 'awFlurry', name: 'Berserker Flurry', damage: 13, chance: 0.5 }),
      landsBorrow(GODFREY, 'hoist', 0.75, { id: 'awPlunge', name: 'Plunging Axe', damage: 22, chance: 0.45 }),
    ],
  },
  {
    id: 'beastman', model: 'beastman', name: 'Beastman of Farum Azula', description: 'A wolfish beast-man of the dragons\' city. It slashes four times with its curved blade, flings stones, and claws the earth into a line of shockwaves (roll or jump). It springs from the ruins.',
    scale: 1.15, bulk: 0.95, radius: 0.45, color: 0x5a5048, weapon: 'sword', idle: 'twitch',
    visual: { skin: 0x6a6058, roughness: 0.85, rim: 0.8 },
    hp: 250, poise: 55, speed: 4.0, turnRate: 7, trackRate: 3.2, approach: 0.7, kite: 0.35,
    cooldown: [0.55, 1.2], crowd: { groupCooldown: 1.6 }, flinchTime: 0.22, staggerTime: 1.0, parriedTime: 1.7,
    attacks: [
      landsBorrow(MALIKETH, 'multiSlash', 0.58, { id: 'bmSlash', name: 'Beast Multi-Slash', damage: 12, chance: 0.9 }),
      landsBorrow(MALIKETH, 'beastClaw', 0.58, { id: 'bmClaw', name: 'Beast Claw', damage: 22, chance: 0.35 }),
      landsBorrow(MALIKETH, 'sling', 0.58, { id: 'bmSling', name: 'Bestial Sling', damage: 8, chance: 0.3, range: 12 }),
      landsBorrow(MALIKETH, 'lungeSweep', 0.58, { id: 'bmLunge', name: 'Lunging Sweep', damage: 18, chance: 0.4 }),
      { id: 'bmPounce', name: 'Leaping Slash', anim: 'overhead', pose: 'clawPounce', tracking: { rate: 3, commit: 0.45 }, rollOnly: true, minRange: 3.5, chance: 0.35,
        hits: [{ startup: 0.95, active: 0.14, follow: 0.3, leap: { from: 0.45, max: 13, short: 1.0 } }], recovery: 0.95,
        damage: 22, poise: 40, knock: 6, lunge: 0, range: 13, box: { w: 2.2, h: 1.8, d: 2.4, fwd: 0.7, y: 0.9 },
        impact: { ring: 2.0, crack: 0.9, dust: 10, shake: 0.06 } },
    ],
  },
  {
    id: 'goldenZealot', model: 'goldenZealot', name: 'Golden Zealot', description: 'A fundamentalist of the Golden Order with Marika\'s hammer. It hurls spears of holy lightning, vanishes and strikes where you stand, and its slam leaves a rune that erupts.',
    scale: 1.35, bulk: 1.05, radius: 0.55, color: 0xd8ccb0, weapon: 'club', idle: 'still',
    visual: { skin: 0xd8c8b4, roughness: 0.55, rim: 0.9 },
    hp: 440, poise: 120, speed: 2.5, turnRate: 3.6, trackRate: 1.8, approach: 0.4, kite: 0.2,
    cooldown: [0.9, 1.8], flinchTime: 0, staggerTime: 1.2, parriedTime: 1.9,
    stagger: landsStagger(32, 9, 2.2),
    attacks: [
      landsBorrow(RADAGON, 'hammerTwo', 0.68, { id: 'gzHammer', name: 'Hammer Swings', damage: 24, chance: 1 }),
      landsBorrow(RADAGON, 'lightningSpear', 0.68, { id: 'gzSpear', name: 'Golden Lightning Spear', damage: 22, chance: 0.4, minRange: 7, range: 24 }),
      landsBorrow(RADAGON, 'teleportStrike', 0.68, { id: 'gzBlink', name: 'Vanishing Strike', damage: 20, chance: 0.35 }),
      landsBorrow(RADAGON, 'runeSlam', 0.68, { id: 'gzRune', name: 'Rune Slam', damage: 28, chance: 0.35 }),
    ],
  },
  {
    id: 'cleanrotKnight', model: 'cleanrotKnight', name: 'Cleanrot Knight', description: 'A knight sworn to Malenia, in gold worked like feathers, scarlet rot blooming on the plate. Its thrust comes from far off and very fast, its spear cuts in quick flurries, and every blow it lands heals it a little.',
    scale: 1.35, bulk: 1.15, radius: 0.56, color: 0xc8a050, weapon: 'spear', idle: 'guard',
    visual: { skin: 0xc8a050, skinMetal: 0.5, metal: 0.6, roughness: 0.38, rim: 0.85 },
    hp: 520, poise: 150, speed: 2.8, turnRate: 3.8, trackRate: 2.0, approach: 0.5, kite: 0.15,
    cooldown: [0.8, 1.6], flinchTime: 0, staggerTime: 1.2, parriedTime: 1.9, lifesteal: { flat: 4, pct: 0 },
    stagger: landsStagger(30, 8, 2.3),
    attacks: [
      landsBorrow(MALENIA, 'thrust', 1, { id: 'crThrust', name: 'Lunging Thrust', damage: 24, chance: 0.6 }),
      landsBorrow(MALENIA, 'slices', 1, a => { a.hits.forEach(h => { delete h.damage; }); a.hits[3].damage = 18; return Object.assign(a, { id: 'crSlices', name: 'Rot Spear Flurry', damage: 11, chance: 0.8 }); }),
      landsBorrow(MALENIA, 'sweep', 1, { id: 'crSweep', name: 'Spear Sweep', damage: 20, chance: 0.9 }),
      landsBorrow(MALENIA, 'slamRot', 1, a => { a.hits[1].damage = 30; return Object.assign(a, { id: 'crGeyser', name: 'Leaping Slam, Rot Geyser', damage: 24, chance: 0.4 }); }),
    ],
  },
];
for (const d of LANDS_ENEMY_DEFS) { ENEMY_DEFS.push(d); ENEMY_BY_ID[d.id] = d; }

// ---- their look in the fight (js/ultra-boss.js; drawing only) ----------------------------------------------------------------
Object.assign(BOSS_FX, {
  omenkin: { element: 'steel', aura: 0xffd27a, attacks: { omenDagger: { element: 'holy' }, omenPlunge: { element: 'holy', impact: 'pillar' }, omenFlick: { impact: 'shatter' } } },
  graftedScion: { element: 'storm', aura: 0xffc890, attacks: { scionPounce: { element: 'earth', impact: 'quake' }, scionRampage: { element: 'steel' } } },
  crucibleSquire: { element: 'earth', aura: 0xffb050, attacks: { squireStomp: { impact: 'quake' }, squireTail: { element: 'holy' } } },
  leyndellKnight: { element: 'steel', aura: 0xffe0a0, attacks: { lkSpear: { element: 'holy' }, lkJavelin: { element: 'holy' }, lkChopThrust: { impact: 'shatter', windup: 'gather' } } },
  ashenWarrior: { element: 'fire', aura: 0xff7a30, attacks: { awStomp: { element: 'earth', impact: 'quake' }, awSmash: { impact: 'blaze' }, awPlunge: { impact: 'blaze' } } },
  beastman: { element: 'bone', aura: 0xd0c0a0, attacks: { bmClaw: { impact: 'gale' } } },
  goldenZealot: { element: 'holy', aura: 0xffe0a0, attacks: { gzRune: { impact: 'pillar', windup: 'gather' }, gzHammer: { impact: 'shatter' } } },
  cleanrotKnight: { element: 'steel', aura: 0xff5040, attacks: { crGeyser: { element: 'rot', impact: 'bloom' }, crSlices: { element: 'rot' } } },
});
