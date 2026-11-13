'use strict';
// ============================================================================
// Hale and Harrow, the Castellans (v7.40.0; their own since v7.60.0), the bosses of Level 8, js/levels/saltgrave.js (STORY.md 10d)
// ============================================================================
// Twin sisters who split the one suit of armour that came back gilded from Aurel, fought as a pair on the tower roof. The
// suit decides their fighting: Hale has its top half (the helm, the breastplate, the bearded axe) and fights with the axe;
// Harrow has its bottom half (the gauntlets, the greaves) and fights with fists and feet. They fight as one castellan in
// two bodies: some of their blows call the other's (`cue`, js/enemy.js): Harrow's stamps send you jumping and Hale's
// cleave comes down where you land; Hale's turning axe sends you back and Harrow slides in at your feet. While both stand
// each waits longer between blows. When one falls, the other kneels by her, rises in her sister's half of the suit too
// (an `alone` phase on the same bar; its `reveal` puts the hidden half on), and fights on with the axe and the greaves, faster.
//
// Every wind-up is its own. Hale: the axe high behind her head (the cleave), low behind her right hip (the hook), upright
// before her face (the salute), yoked across her shoulders (the turn), trailing as she crouches (the leap), held out flat
// at her right (the wind). Harrow: a knee raised high (the stamps), both fists over her left shoulder (the hammer), fists
// at her chin (the jab), a sprinter's crouch (the falling weight), a run-up (the slide). Axe angles below: the haft's pitch
// is about armR.x + elbowR.x + weapon.x - 0.25 (0 level ahead, -1.57 straight up, positive dips the head).

// ---- their figures: built in Blender (tools/blender/castellans.py), one piece per bone -----------------------------------
// One script builds both: the shared under-kit (mail, the sea-grey surcoat with its white bar, the belt) and each half of
// the suit. Each model takes its own half and its own kit (Hale: leather bracers and boots, the cape; Harrow: her bare
// head and braid, the quilted gambeson) and carries the other half hidden (`hidden`), for the `whole` phase to reveal.
{
  const SALT = {
    gilt: { tex: 'wornGilt', tint: 0xb89858, decay: 0.55, rim: 0.4 },
    steel: { tex: 'knightPlate', tint: 0xa8b0b4, decay: 0.75 },   // the salt crust on the rims and spikes
    dark: { tex: 'ashSoot', tint: 0x0a0a0c, decay: 0.4 },
    mail: { tex: 'knightMail', tint: 0x7a8084, decay: 0.7 },
    quilt: { tex: 'quiltedGambeson', tint: 0x6a767a, decay: 0.7 },
    coat: { tex: 'rottenCloth', tint: 0x48585a, decay: 0.7, double: true, rim: 0.15 },
    band: { tex: 'oathLinen', tint: 0xc8ccc4, decay: 0.6, double: true, rim: 0.15 },
    leather: { tex: 'crackedLeather', tint: 0x4a3c30, decay: 0.75 },
    haft: { tex: 'churchOak', tint: 0x4a3a2a, decay: 0.7, rim: 0.3 },
    eye: { glow: 0xc8d4dc },
  };
  const BONES = { loinF: { parent: 'spin', at: [0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0, -0.02, -0.2] } };
  const ANIM = {
    idle: { breathRate: 0.85, breath: 0.016, headDrift: 0.03, sway: 0.012, twitch: 0 }, walk: { twist: 0.08, roll: 0.04, headNod: 0.03, elbow: 0.2, drag: 0.08 },
    flinch: { head: 0.35, chest: 0.35, arms: 0.3 }, death: { buckle: 1, slump: 0.7 },
  };
  const LOIN = [{ bone: 'loinF', gain: 0.1, k: 66, damp: 5.6, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 56, damp: 5, flutter: 0.04 }];
  // pieces: { bone: { piece: slot } }; a piece named in the Blender file as castellans:<bone>__<piece>
  const parts = pieces => Object.entries(pieces).flatMap(([bone, list]) => Object.entries(list).map(([piece, slot]) =>
    ({ use: 'baked', mesh: `castellans:${bone}__${piece}`, bone, slot, tile: 0.42, ...(bone === 'weapon' ? { weapon: true } : {}) })));
  const both = { neck: { mail: 'mail' }, spin: { mail: 'mail', leather: 'leather', steel: 'steel' },
    loinF: { coat: 'coat', band: 'band' }, loinB: { coat: 'coat', band: 'band' }, legL: { mail: 'mail' }, legR: { mail: 'mail' } };
  const base = { extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.5,
    proportions: { shoulderX: 0.38, torsoW: 0.25, torsoD: 0.19, armR: 0.075, legR: 0.095, headR: 0.13, handR: 0.07, footLen: 0.32 },
    body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null }, weapon: null };

  // Hale: the helm with its wave crest, the breastplate and spaulders, the axe; leather bracers and boots, a ragged cape.
  // Hidden: Harrow's gauntlets and greaves (`pairGilt`, `pairSteel`), put on in the `whole` phase over the bracers and boots.
  MODEL_DEFS.castellanHale = { ...base,
    posture: { chest: [0.06, 0, 0], neck: [0.02, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.55, 0, 0] },
    materials: { ...SALT, pairGilt: SALT.gilt, pairSteel: SALT.steel,
      bracer: { tex: 'crackedLeather', tint: 0x3a2e24, decay: 0.8 },
      cape: { tex: 'tatteredFabric', tint: 0x3e4c4e, decay: 0.75, size: 512, double: true, rim: 0.15 } },
    bones: { ...BONES, capeA: { parent: 'chest', at: [0, 0.58, -0.25] }, capeB: { parent: 'capeA', at: [0, -0.42, -0.04] }, capeC: { parent: 'capeB', at: [0, -0.4, -0.02] } },
    parts: parts({ ...both,
      head: { gilt: 'gilt', dark: 'dark', steel: 'steel' },
      chest: { mail: 'mail', quilt: 'quilt', gilt: 'gilt', 'gilt.1': 'gilt', steel: 'steel' },
      capeA: { cape: 'cape' }, capeB: { cape: 'cape' }, capeC: { cape: 'cape' },
      armL: { mail: 'mail', quilt: 'quilt', gilt: 'gilt', steel: 'steel' }, armR: { mail: 'mail', quilt: 'quilt', gilt: 'gilt', steel: 'steel' },
      elbowL: { mail: 'mail', bracer: 'bracer', gilt: 'pairGilt', 'gilt.1': 'pairGilt', steel: 'pairSteel' },
      elbowR: { mail: 'mail', bracer: 'bracer', gilt: 'pairGilt', 'gilt.1': 'pairGilt', steel: 'pairSteel' },
      kneeL: { bracer: 'bracer', gilt: 'pairGilt', 'gilt.1': 'pairGilt' }, kneeR: { bracer: 'bracer', gilt: 'pairGilt', 'gilt.1': 'pairGilt' },
      weapon: { haft: 'haft', gilt: 'gilt', steel: 'steel', leather: 'leather' } }),
    hidden: ['pairGilt', 'pairSteel'],
    eyes: { color: 0xc8d4dc, size: 0.011, spread: 0.045, at: [0, 0.14, 0.13] },   // behind the slit
    anim: { ...ANIM, cloth: [...LOIN, { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.04 }, { bone: 'capeB', gain: 0.09, k: 34, damp: 3.6, flutter: 0.06 },
      { bone: 'capeC', gain: 0.1, k: 28, damp: 3.0, flutter: 0.09, sideways: 1.3 }] },
  };

  // Harrow: bare-headed, her hair in one long braid; a quilted gambeson; the great gauntlets and the greaves. Hidden: Hale's
  // helm, breastplate, spaulders and axe (`helm*`, `haft`, `grip`), put on in the `whole` phase (her face and hair go under the helm).
  MODEL_DEFS.castellanHarrow = { ...base,
    posture: { chest: [0.1, 0, 0], neck: [0.04, 0, 0], head: [-0.04, 0, 0], elbowL: [-0.75, 0, 0], elbowR: [-0.75, 0, 0] },   // fists up
    materials: { ...SALT, helmGilt: SALT.gilt, helmSteel: SALT.steel, helmDark: SALT.dark, grip: SALT.leather,
      skin: { tex: 'paleSkin', tint: 0xb89c8c, decay: 0.5 },
      hair: { tex: 'margitFur', tint: 0x2a221c, decay: 0.6 },
      braid: { tex: 'margitFur', tint: 0x2a221c, decay: 0.6 } },
    bones: { ...BONES, braid: { parent: 'head', at: [0, 0.05, -0.12] } },
    parts: parts({ ...both,
      head: { skin: 'skin', hair: 'hair', gilt: 'helmGilt', dark: 'helmDark', steel: 'helmSteel' },
      braid: { hair: 'braid', gilt: 'gilt' },
      chest: { mail: 'mail', quilt: 'quilt', gilt: 'helmGilt', 'gilt.1': 'helmGilt', steel: 'helmSteel' },
      armL: { mail: 'mail', quilt: 'quilt', gilt: 'helmGilt', steel: 'helmSteel' }, armR: { mail: 'mail', quilt: 'quilt', gilt: 'helmGilt', steel: 'helmSteel' },
      elbowL: { mail: 'mail', gilt: 'gilt', 'gilt.1': 'gilt', steel: 'steel' }, elbowR: { mail: 'mail', gilt: 'gilt', 'gilt.1': 'gilt', steel: 'steel' },
      kneeL: { gilt: 'gilt', 'gilt.1': 'gilt' }, kneeR: { gilt: 'gilt', 'gilt.1': 'gilt' },
      weapon: { haft: 'haft', gilt: 'helmGilt', steel: 'helmSteel', leather: 'grip' } }),
    hidden: ['helmGilt', 'helmSteel', 'helmDark', 'haft', 'grip'],
    eyes: { color: 0xc8d4dc, size: 0.009, spread: 0.045, at: [0, 0.11, 0.12] },
    anim: { ...ANIM, cloth: LOIN, hang: [{ bone: 'braid', k: 16, damp: 2.4, gain: 0.04 }] },
  };
}

// ---- key poses (js/data/attack-poses.js format) -------------------------------------------------------------------------
{
  // ---- Hale: the axe ----
  // Crown Cleave: upright, back arched, the axe raised high behind her head in both hands; held; then brought straight down.
  const crown = {
    windup: { crouch: 0.08, lean: -0.22, legL: [-0.35, 0, 0], legR: [0.3, 0, 0], chest: [-0.4, 0, 0], neck: [-0.1, 0, 0], head: [0.1, 0, 0],
      armR: [-2.95, 0, -0.05], elbowR: [-0.6, 0, 0], weapon: [0.2, 0, 0], armL: [-2.8, 0, -0.35], elbowL: [-0.7, 0, 0] },
    strike: { crouch: 0.32, lean: 0.5, legL: [-0.7, 0, 0], legR: [0.45, 0, 0], chest: [0.45, 0, 0], neck: [0.15, 0, 0], head: [0.05, 0, 0],
      armR: [-0.85, 0, 0.05], elbowR: [0, 0, 0], weapon: [1.75, 0, 0], armL: [-0.95, 0, -0.35], elbowL: [-0.2, 0, 0] },
    follow: { crouch: 0.34, lean: 0.55, legL: [-0.72, 0, 0], legR: [0.47, 0, 0], chest: [0.5, 0, 0], neck: [0.2, 0, 0], head: [0.1, 0, 0],
      armR: [-0.75, 0, 0.05], elbowR: [0, 0, 0], weapon: [1.8, 0, 0], armL: [-0.85, 0, -0.35], elbowL: [-0.2, 0, 0] },
  };
  ATTACK_POSES.haleCrownCleave = { ease: { windup: 'outCubic', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [crown] };

  // The Beard's Hook: the axe wound low behind her right hip, head down; a rising sweep up and across; then the beard
  // hooked back across at head height.
  const hook = {
    rise: {
      windup: { crouch: 0.32, lean: 0.25, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], spin: [0, -1.1, 0], chest: [0.2, -0.35, 0], neck: [0, 0.35, 0], head: [0.1, 0.45, 0],
        armR: [0.65, 0, -0.35], elbowR: [-0.2, 0, 0], weapon: [0.9, 0, 0], armL: [-0.4, 0, 0.3], elbowL: [-0.6, 0, 0] },
      strike: { crouch: 0.16, lean: 0.05, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.95, 0], chest: [-0.15, 0.4, 0], neck: [0, -0.3, 0], head: [-0.05, -0.4, 0],
        armR: [-2.2, 0, 0.55], elbowR: [-0.2, 0, 0], weapon: [0.6, 0, 0], armL: [-0.5, 0, 0.5], elbowL: [-0.5, 0, 0] },
      follow: { crouch: 0.15, lean: 0.02, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 1.1, 0], chest: [-0.2, 0.45, 0], neck: [0, -0.35, 0], head: [-0.05, -0.45, 0],
        armR: [-2.45, 0, 0.6], elbowR: [-0.4, 0, 0], weapon: [0.8, 0, 0], armL: [-0.5, 0, 0.5], elbowL: [-0.5, 0, 0] },
    },
    back: {
      windup: { crouch: 0.18, lean: 0.05, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 1.15, 0], chest: [-0.15, 0.45, 0], neck: [0, -0.4, 0], head: [0, -0.5, 0],
        armR: [-1.9, 0, 0.9], elbowR: [-0.6, 0, 0], weapon: [1.0, 0, 0], armL: [-0.5, 0, 0.5], elbowL: [-0.5, 0, 0] },
      strike: { crouch: 0.24, lean: 0.2, legL: [-0.6, 0, 0], legR: [0.45, 0, 0], spin: [0, -0.75, 0], chest: [0.1, -0.4, 0], neck: [0, 0.25, 0], head: [0, 0.4, 0],
        armR: [-1.45, 0, -0.7], elbowR: [-0.9, 0, 0], weapon: [1.2, 0, 0], armL: [-0.4, 0, 0.3], elbowL: [-0.5, 0, 0] },
      follow: { crouch: 0.26, lean: 0.22, legL: [-0.62, 0, 0], legR: [0.46, 0, 0], spin: [0, -0.95, 0], chest: [0.12, -0.45, 0], neck: [0, 0.3, 0], head: [0, 0.45, 0],
        armR: [-1.3, 0, -0.85], elbowR: [-1.1, 0, 0], weapon: [1.25, 0, 0], armL: [-0.4, 0, 0.3], elbowL: [-0.5, 0, 0] },
    },
  };
  ATTACK_POSES.haleBeardsHook = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' },
    lag: { weapon: 0.08, armR: 0.05, elbowR: 0.06 }, hits: [hook.rise, hook.back] };

  // The Helm's Salute: the haft raised upright before her face, the axe head over her helm, still; then the top spike
  // driven down and out at you in one long step.
  const salute = {
    windup: { crouch: 0.1, lean: -0.05, legL: [-0.25, 0, 0], legR: [0.25, 0, 0], chest: [-0.12, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
      armR: [-1.15, 0, 0.12], elbowR: [-1.1, 0, 0], weapon: [0.95, 0, 0], armL: [-1.0, 0, -0.45], elbowL: [-1.5, 0, 0] },
    strike: { crouch: 0.3, lean: 0.38, legL: [-0.9, 0, 0], legR: [0.6, 0, 0], spin: [0, 0.2, 0], chest: [0.3, 0.1, 0], neck: [0.05, -0.1, 0], head: [0.05, -0.1, 0],
      armR: [-1.45, 0, 0.05], elbowR: [0, 0, 0], weapon: [1.75, 0, 0], armL: [-1.2, 0, -0.35], elbowL: [-0.4, 0, 0] },
    follow: { crouch: 0.32, lean: 0.42, legL: [-0.92, 0, 0], legR: [0.62, 0, 0], spin: [0, 0.22, 0], chest: [0.32, 0.1, 0], neck: [0.05, -0.1, 0], head: [0.05, -0.1, 0],
      armR: [-1.4, 0, 0.05], elbowR: [0, 0, 0], weapon: [1.8, 0, 0], armL: [-1.15, 0, -0.35], elbowL: [-0.45, 0, 0] },
  };
  ATTACK_POSES.haleHelmsSalute = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [salute] };

  // The Wall Turns: the axe yoked across her shoulders, wound to her left; she turns full round twice with it held out.
  const yoke = { crouch: 0.22, lean: 0.05, legL: [-0.4, 0, 0], legR: [0.4, 0, 0], spin: [0, 1.0, 0], chest: [0, 0.45, 0], neck: [0, -0.5, 0], head: [0, -0.6, 0],
    armR: [-2.5, 0, -0.5], elbowR: [-1.9, 0, 0], weapon: [1.4, 0, 0], armL: [-2.2, 0, 0.7], elbowL: [-1.7, 0, 0] };
  const out = turn => ({ tip: [0, turn, 0], crouch: 0.26, lean: 0.1, legL: [-0.45, 0, 0], legR: [0.45, 0, 0], spin: [0, -0.5, 0], chest: [0.05, -0.3, 0], neck: [0, 0.2, 0], head: [0, 0.3, 0],
    armR: [-1.45, 0, -0.95], elbowR: [0, 0, 0], weapon: [1.55, 0, 0], armL: [-0.5, 0, 0.9], elbowL: [-0.3, 0, 0] });
  // The two turns run on through the strikes and the steps between them (the boxes round her are short; the body keeps going).
  const T = Math.PI;
  ATTACK_POSES.haleWallTurns = { ease: { windup: 'inOutSine', active: 'linear', follow: 'linear', recovery: 'inOutCubic' }, lag: { tip: 0, spin: 0, chest: 0.05 }, hits: [
    { windup: yoke, strike: out(-1.1 * T), follow: out(-1.4 * T) },
    { windup: out(-1.8 * T), strike: out(-2.9 * T), follow: out(-4 * T) },
  ] };

  // Off the Rampart: down in a deep crouch, the axe trailing low behind her; she leaps and comes down axe first.
  ATTACK_POSES.haleOffTheRampart = { ease: { windup: 'inOutCubic', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [{
    windup: { crouch: 0.48, lean: 0.4, legL: [-0.8, 0, 0], legR: [0.5, 0, 0], spin: [0, -0.35, 0], chest: [0.35, -0.2, 0], neck: [-0.3, 0, 0], head: [-0.3, 0, 0],
      armR: [0.85, 0, -0.25], elbowR: [-0.1, 0, 0], weapon: [0.5, 0, 0], armL: [0.6, 0, 0.3], elbowL: [-0.2, 0, 0] },
    strike: crown.strike, follow: crown.follow }] };

  // Salt Wind: the axe held out flat at her right, the head trailing; swept across her front, and the wind it raises flies on.
  const wind = {
    windup: { crouch: 0.22, lean: 0.05, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], spin: [0, -1.2, 0], chest: [0, -0.4, 0], neck: [0, 0.6, 0], head: [0, 0.7, 0],
      armR: [-1.3, 0, -1.2], elbowR: [-0.1, 0, 0], weapon: [1.5, 0, 0], armL: [-0.6, 0, 0.6], elbowL: [-0.4, 0, 0] },
    strike: { crouch: 0.24, lean: 0.12, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.9, 0], chest: [0.05, 0.4, 0], neck: [0, -0.4, 0], head: [0, -0.5, 0],
      armR: [-1.4, 0, 0.75], elbowR: [-0.1, 0, 0], weapon: [1.5, 0, 0], armL: [-0.3, 0, 0.3], elbowL: [-0.4, 0, 0] },
    follow: { crouch: 0.24, lean: 0.12, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 1.05, 0], chest: [0.05, 0.45, 0], neck: [0, -0.45, 0], head: [0, -0.55, 0],
      armR: [-1.35, 0, 0.9], elbowR: [-0.15, 0, 0], weapon: [1.5, 0, 0], armL: [-0.3, 0, 0.3], elbowL: [-0.4, 0, 0] },
  };
  ATTACK_POSES.haleSaltWind = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutSine' }, lag: { weapon: 0.08, armR: 0.05 }, hits: [wind] };

  // The Haft's Heel: a look over her right shoulder, the haft slid through her hands; the butt driven back past her hip.
  ATTACK_POSES.haleHaftsHeel = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [{
    windup: { crouch: 0.14, spin: [0, 0.3, 0], chest: [0.05, 0.25, 0], neck: [0, -0.55, 0], head: [0.05, -1.05, 0],
      armR: [-1.0, 0, 0.1], elbowR: [-1.1, 0, 0], weapon: [1.7, 0, 0], armL: [-1.0, 0, -0.3], elbowL: [-0.9, 0, 0] },
    strike: { crouch: 0.22, lean: -0.15, legL: [-0.15, 0, 0], legR: [0.6, 0, 0], spin: [0, -0.55, 0], chest: [0.1, -0.4, 0], neck: [0, -0.4, 0], head: [0.05, -0.8, 0],
      armR: [0.85, 0, -0.1], elbowR: [-0.15, 0, 0], weapon: [0.55, 0, 0], armL: [0.6, 0, 0.2], elbowL: [-0.3, 0, 0] },
    follow: { crouch: 0.24, lean: -0.16, legL: [-0.17, 0, 0], legR: [0.62, 0, 0], spin: [0, -0.62, 0], chest: [0.12, -0.45, 0], neck: [0, -0.4, 0], head: [0.05, -0.8, 0],
      armR: [0.9, 0, -0.1], elbowR: [-0.1, 0, 0], weapon: [0.5, 0, 0], armL: [0.65, 0, 0.2], elbowL: [-0.3, 0, 0] } }] };

  // ---- Harrow: fists and greaves ----
  // Stamp the Stones: a knee raised high, arms out for balance, held; the greave stamped down and the stones ring out;
  // the other knee, the other stamp, wider.
  const lift = side => ({ crouch: 0.04, lean: -0.12, chest: [-0.15, 0, side * 0.08], head: [0.15, 0, 0],
    ...(side < 0 ? { legL: [-1.55, 0, 0], kneeL: [1.45, 0, 0], legR: [0.05, 0, 0] } : { legR: [-1.55, 0, 0], kneeR: [1.45, 0, 0], legL: [0.05, 0, 0] }),
    armL: [-0.5, 0, 1.05], elbowL: [-0.3, 0, 0], armR: [-0.5, 0, -1.05], elbowR: [-0.3, 0, 0] });
  const stamp = side => ({ crouch: 0.36, lean: 0.32, chest: [0.3, 0, 0], head: [0.2, 0, 0],
    ...(side < 0 ? { legL: [-0.55, 0, 0], kneeL: [0.25, 0, 0], legR: [0.45, 0, 0] } : { legR: [-0.55, 0, 0], kneeR: [0.25, 0, 0], legL: [0.45, 0, 0] }),
    armL: [-0.2, 0, 0.55], elbowL: [-0.9, 0, 0], armR: [-0.2, 0, -0.55], elbowR: [-0.9, 0, 0] });
  const stamps = { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };
  ATTACK_POSES.harrowStamp = { ease: stamps, hits: [{ windup: lift(-1), strike: stamp(-1) }, { windup: lift(1), strike: stamp(1) }] };

  // Hammer of Both Hands: the fists locked together and wound up over her left shoulder, held; then a diagonal smash
  // down across her body to the ground at her right.
  const hammer = {
    windup: { crouch: 0.12, lean: -0.12, legL: [-0.35, 0, 0], legR: [0.3, 0, 0], spin: [0, 0.85, 0], chest: [-0.3, 0.35, 0], neck: [0, -0.3, 0], head: [0.05, -0.3, 0],
      armR: [-2.75, 0, 0.75], elbowR: [-1.0, 0, 0], armL: [-2.75, 0, 0.05], elbowL: [-1.0, 0, 0] },
    strike: { crouch: 0.38, lean: 0.55, legL: [-0.75, 0, 0], legR: [0.5, 0, 0], spin: [0, -0.5, 0], chest: [0.5, -0.3, 0], neck: [0.15, 0.2, 0], head: [0.1, 0.2, 0],
      armR: [-0.6, 0, -0.35], elbowR: [-0.15, 0, 0], armL: [-0.75, 0, -0.55], elbowL: [-0.15, 0, 0] },
    follow: { crouch: 0.4, lean: 0.58, legL: [-0.77, 0, 0], legR: [0.52, 0, 0], spin: [0, -0.6, 0], chest: [0.52, -0.33, 0], neck: [0.15, 0.2, 0], head: [0.1, 0.2, 0],
      armR: [-0.5, 0, -0.4], elbowR: [-0.1, 0, 0], armL: [-0.65, 0, -0.6], elbowL: [-0.1, 0, 0] },
  };
  ATTACK_POSES.harrowHammer = { ease: { windup: 'outCubic', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { armR: 0.06, armL: 0.06 }, hits: [hammer] };

  // Knuckle and Heel: fists at her chin; a left jab, a right hook swung round, a front kick with the greave's point.
  const guard = { armL: [-1.25, 0, 0.15], elbowL: [-2.0, 0, 0], armR: [-1.05, 0, -0.15], elbowR: [-2.1, 0, 0] };
  ATTACK_POSES.harrowKnuckleHeel = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [
    { windup: { ...guard, crouch: 0.18, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.35, 0], chest: [0.1, -0.2, 0], neck: [0, 0.2, 0], head: [0.1, 0.25, 0] },
      strike: { ...guard, crouch: 0.2, lean: 0.22, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.4, 0], chest: [0.15, 0.25, 0], neck: [0, -0.2, 0], head: [0.05, -0.25, 0],
        armL: [-1.6, 0, -0.05], elbowL: [-0.05, 0, 0] } },
    { windup: { ...guard, crouch: 0.2, lean: 0.1, legL: [-0.45, 0, 0], legR: [0.4, 0, 0], spin: [0, -0.7, 0], chest: [0.1, -0.4, 0], neck: [0, 0.35, 0], head: [0.05, 0.4, 0],
        armR: [-1.25, 0, -1.0], elbowR: [-1.2, 0, 0] },
      strike: { ...guard, crouch: 0.22, lean: 0.2, legL: [-0.5, 0, 0], legR: [0.45, 0, 0], spin: [0, 0.85, 0], chest: [0.15, 0.4, 0], neck: [0, -0.35, 0], head: [0.05, -0.4, 0],
        armR: [-1.5, 0, 0.55], elbowR: [-1.25, 0, 0] } },
    { windup: { ...guard, crouch: 0.08, lean: -0.22, legL: [0.1, 0, 0], legR: [-1.35, 0, 0], kneeR: [1.7, 0, 0], spin: [0, 0.1, 0], chest: [-0.15, 0, 0] },
      strike: { ...guard, crouch: 0.1, lean: -0.35, legL: [0.15, 0, 0], legR: [-1.55, 0, 0], kneeR: [0.05, 0, 0], spin: [0, 0.15, 0], chest: [-0.2, 0, 0] },
      follow: { ...guard, crouch: 0.1, lean: -0.32, legL: [0.15, 0, 0], legR: [-1.45, 0, 0], kneeR: [0.15, 0, 0], spin: [0, 0.15, 0], chest: [-0.2, 0, 0] } },
  ] };

  // The Falling Weight: a sprinter's crouch, both arms swung back; she leaps and comes down on both knees, greaves first,
  // and the stones ring out from where she lands.
  const kneesDown = { crouch: 0.6, lean: 0.25, legL: [-1.25, 0, 0], kneeL: [1.6, 0, 0], legR: [-1.15, 0, 0], kneeR: [1.65, 0, 0], chest: [0.3, 0, 0], head: [0.2, 0, 0],
    armL: [-0.4, 0, 0.5], elbowL: [-0.6, 0, 0], armR: [-0.4, 0, -0.5], elbowR: [-0.6, 0, 0] };
  ATTACK_POSES.harrowFallingWeight = { ease: { windup: 'inOutCubic', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [
    { windup: { crouch: 0.5, lean: 0.65, legL: [-0.85, 0, 0], kneeL: [1.0, 0, 0], legR: [0.55, 0, 0], kneeR: [0.6, 0, 0], chest: [0.35, 0, 0], neck: [-0.4, 0, 0], head: [-0.35, 0, 0],
        armL: [0.95, 0, 0.25], elbowL: [-0.2, 0, 0], armR: [0.95, 0, -0.25], elbowR: [-0.2, 0, 0] },
      strike: kneesDown, follow: { ...kneesDown, crouch: 0.62 } },
    { windup: { ...kneesDown, crouch: 0.55 }, strike: { ...kneesDown, crouch: 0.45, lean: 0.1, chest: [-0.1, 0, 0], head: [-0.1, 0, 0], armL: [-0.2, 0, 1.1], armR: [-0.2, 0, -1.1] } },
  ] };

  // Greave Slide: a run-up, fists pumping; she drops and slides in feet first, the leading greave at your shins.
  ATTACK_POSES.harrowGreaveSlide = { ease: { windup: 'inOutSine', active: 'outCubic', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [{
    windup: { crouch: 0.22, lean: 0.45, legL: [-0.7, 0, 0], kneeL: [0.9, 0, 0], legR: [0.5, 0, 0], kneeR: [0.7, 0, 0], chest: [0.2, 0, 0],
      armL: [0.6, 0, 0.1], elbowL: [-1.4, 0, 0], armR: [-1.1, 0, -0.1], elbowR: [-1.4, 0, 0] },
    strike: { crouch: 0.55, lean: -0.75, legL: [-1.45, 0, 0], kneeL: [0.05, 0, 0], legR: [-0.35, 0, 0], kneeR: [1.7, 0, 0], chest: [0.35, 0, 0], neck: [0.3, 0, 0], head: [0.3, 0, 0],
      armR: [0.35, 0, -0.7], elbowR: [-0.1, 0, 0], armL: [-0.9, 0, 0.5], elbowL: [-1.0, 0, 0] },
    follow: { crouch: 0.52, lean: -0.7, legL: [-1.4, 0, 0], kneeL: [0.1, 0, 0], legR: [-0.35, 0, 0], kneeR: [1.65, 0, 0], chest: [0.35, 0, 0], neck: [0.3, 0, 0], head: [0.3, 0, 0],
      armR: [0.3, 0, -0.7], elbowR: [-0.1, 0, 0], armL: [-0.9, 0, 0.5], elbowL: [-1.0, 0, 0] } }] };

  // Back Heel: a glance down past her hip, then the greave kicked straight back like a mule's.
  ATTACK_POSES.harrowBackHeel = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [{
    windup: { crouch: 0.2, lean: 0.25, legR: [-0.6, 0, 0], kneeR: [1.5, 0, 0], legL: [-0.1, 0, 0], neck: [0.2, -0.4, 0], head: [0.2, -0.6, 0], ...guard },
    strike: { crouch: 0.16, lean: 0.75, legR: [1.25, 0, 0], kneeR: [0.05, 0, 0], legL: [-0.15, 0, 0], chest: [0.25, 0, 0], neck: [-0.3, -0.2, 0], head: [-0.2, -0.3, 0],
      armL: [-0.9, 0, 0.3], elbowL: [-0.4, 0, 0], armR: [-0.9, 0, -0.3], elbowR: [-0.4, 0, 0] },
    follow: { crouch: 0.17, lean: 0.72, legR: [1.2, 0, 0], kneeR: [0.1, 0, 0], legL: [-0.15, 0, 0], chest: [0.25, 0, 0], neck: [-0.3, -0.2, 0], head: [-0.2, -0.3, 0],
      armL: [-0.9, 0, 0.3], elbowL: [-0.4, 0, 0], armR: [-0.9, 0, -0.3], elbowR: [-0.4, 0, 0] } }] };

  // ---- alone, in the whole suit ----
  // Her Sister's Half (the opener): she kneels on one knee, head bowed, both hands on her knee, a long while; then rises
  // with her arms flung wide, and the other half of the suit is on her.
  ATTACK_POSES.castellanSistersHalf = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [{
    windup: { crouch: 0.62, lean: 0.35, legL: [-1.3, 0, 0], kneeL: [1.35, 0, 0], legR: [0.25, 0, 0], kneeR: [1.95, 0, 0], chest: [0.4, 0, 0], neck: [0.35, 0, 0], head: [0.4, 0, 0],
      armL: [-0.7, 0, 0.1], elbowL: [-0.6, 0, 0], armR: [-0.6, 0, -0.1], elbowR: [-0.7, 0, 0], weapon: [1.6, 0, 0] },
    strike: { crouch: 0.08, lean: -0.15, legL: [-0.3, 0, 0], legR: [0.25, 0, 0], chest: [-0.35, 0, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0],
      armL: [-0.55, 0, 1.2], elbowL: [-0.2, 0, 0], armR: [-0.55, 0, -1.2], elbowR: [-0.2, 0, 0], weapon: [1.4, 0, 0] },
    follow: { crouch: 0.1, lean: -0.12, legL: [-0.3, 0, 0], legR: [0.25, 0, 0], chest: [-0.3, 0, 0], neck: [-0.15, 0, 0], head: [-0.25, 0, 0],
      armL: [-0.5, 0, 1.15], elbowL: [-0.25, 0, 0], armR: [-0.5, 0, -1.15], elbowR: [-0.25, 0, 0], weapon: [1.4, 0, 0] } }] };

  // Both Halves: the crown cleave, a stamp that rings out, then the beard brought rising up through you.
  ATTACK_POSES.castellanBothHalves = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [
    // its own opening, not Crown Cleave's: turned side-on and sunk low, the axe stood upright at her right shoulder;
    // then hewn down and across from her right
    { windup: { crouch: 0.4, lean: 0.12, spin: [0, -0.85, 0], legL: [-0.65, 0, 0], legR: [0.55, 0, 0], chest: [0.15, -0.45, 0], neck: [0, 0.4, 0], head: [0, 0.5, 0],
        armR: [-1.7, 0, -0.95], elbowR: [-1.0, 0, 0], weapon: [0.9, 0, 0], armL: [-1.5, 0, 0.35], elbowL: [-1.2, 0, 0] },
      strike: { ...crown.strike, spin: [0, 0.35, 0], chest: [0.45, 0.25, 0] }, follow: { ...crown.follow, spin: [0, 0.4, 0] } },
    { windup: { ...lift(1), armR: [-0.7, 0, -0.6], elbowR: [-0.4, 0, 0], weapon: [1.6, 0, 0] }, strike: { ...stamp(1), armR: [-0.5, 0, -0.4], elbowR: [-0.3, 0, 0], weapon: [1.7, 0, 0] } },
    { windup: hook.rise.windup, strike: hook.rise.strike, follow: hook.rise.follow },
  ] };
}

// ---- the bosses -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const RING = (from, to, width, time = 0.3) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time } });
  const SALT_WIND = { speed: 16, gravity: 0, size: 0.65, look: 'slash', colors: [0xeef4f8, 0x5a7a88] };
  const attacks = [
    // ---- Hale: the axe -------------------------------------------------------------------------------------------------
    // Crown Cleave: raised high behind her head, held (the delay is the point), brought straight down.
    { id: 'crownCleave', name: 'Crown Cleave', anim: 'chop', pose: 'haleCrownCleave', tracking: { rate: 2.2, commit: 0.6 }, markers: glint(0),
      hits: [{ startup: 1.25, active: 0.14, follow: 0.45, hold: { at: 0.6, time: [0.3, 0.9], chance: 0.55 } }], recovery: 1.4,
      damage: 38, poise: 70, knock: 8, lunge: 1.2, range: 3.8, box: { w: 1.6, h: 3.0, d: 4.2, fwd: 2.3, y: 1.2 },
      impact: { ring: 2.4, crack: 1.4, dust: 12, shake: 0.1 } },
    // The Beard's Hook: up from her right hip, then the beard hooked back across. Roll the first toward her left.
    { id: 'beardsHook', name: 'The Beard\'s Hook', anim: 'sweep', pose: 'haleBeardsHook', tracking: { rate: 2.8, commit: 0.6 }, markers: glint(0),
      hits: [{ startup: 0.95, active: 0.14, follow: 0.1, box: { w: 3.6, h: 2.4, d: 3.2, fwd: 1.5, y: 1.1 } },
             { startup: 0.45, active: 0.14, follow: 0.35, box: { w: 3.8, h: 1.4, d: 3.0, fwd: 1.4, y: 1.7 } }], recovery: 1.0,
      followUps: [{ attack: 'haftsHeel', if: 'behind', chance: 0.6 }],
      damage: 28, poise: 45, knock: 6, lunge: 1.4, range: 3.4, box: { w: 3.6, h: 2.4, d: 3.2, fwd: 1.5, y: 1.1 } },
    // The Helm's Salute: the haft upright before her face, a stillness, then the top spike driven out a long step.
    { id: 'helmsSalute', name: 'The Helm\'s Salute', anim: 'thrust', pose: 'haleHelmsSalute', tracking: { rate: 3.0, commit: 0.75 }, markers: glint(0),
      hits: [{ startup: 1.05, active: 0.12, follow: 0.3 }], recovery: 1.0,
      followUps: [{ attack: 'beardsHook', if: 'near', chance: 0.3 }],
      damage: 30, poise: 50, knock: 7, lunge: 2.6, range: 4.6, box: { w: 1.0, h: 1.4, d: 4.6, fwd: 2.7, y: 1.2 } },
    // The Wall Turns: yoked across her shoulders, then two full turns with the axe held out. Get out of reach, or under it
    // with a roll; Harrow slides in at whoever backs away.
    { id: 'wallTurns', name: 'The Wall Turns', anim: 'sweep', pose: 'haleWallTurns', noParry: true, tracking: { rate: 1.6, commit: 0.4 }, chance: 0.5,
      cue: { attack: 'greaveSlide', delay: 0.9, chance: 0.6, near: 14 },
      hits: [{ startup: 1.2, active: 0.2, follow: 0.1 }, { startup: 0.15, active: 0.2, follow: 0.45 }], recovery: 1.4,
      damage: 26, poise: 45, knock: 8, lunge: 0.6, range: 3.4, box: { w: 6.8, h: 1.8, d: 6.8, fwd: 0, y: 1.1 } },
    // Off the Rampart: from afar, a crouch with the axe trailing, a leap, the axe first on landing.
    { id: 'offTheRampart', name: 'Off the Rampart', anim: 'chop', pose: 'haleOffTheRampart', noParry: true, tracking: { rate: 2.2, commit: 0.5 }, minRange: 5, chance: 0.35,
      hits: [{ startup: 1.3, active: 0.16, follow: 0.5, leap: { from: 0.4, max: 12, short: 1.4 } }], recovery: 1.6,
      damage: 40, poise: 75, knock: 9, lunge: 0, range: 12, box: { w: 2.2, h: 2.8, d: 4.2, fwd: 2.0, y: 1.0 },
      impact: { ring: 3.4, crack: 1.8, dust: 16, shake: 0.14 } },
    // Salt Wind: from afar, the flat of the axe swept across, and the sea wind it raises flies at you. Block it or step aside.
    { id: 'saltWind', name: 'Salt Wind', anim: 'sweep', pose: 'haleSaltWind', tracking: { rate: 2.8, commit: 0.85 }, minRange: 6, chance: 0.35,
      projectile: SALT_WIND,
      hits: [{ startup: 0.9, active: 0.06, follow: 0.25 }], recovery: 0.8,
      damage: 22, poise: 25, knock: 4, lunge: 0, range: 18, box: { w: 0.5, h: 0.5, d: 0.5, fwd: 0.6, y: 1.3 } },
    // Behind her: the butt of the haft driven back past her hip.
    { id: 'haftsHeel', name: 'The Haft\'s Heel', anim: 'thrust', pose: 'haleHaftsHeel', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 3,
      hits: [{ startup: 0.6, active: 0.12, follow: 0.3 }], recovery: 0.8,
      damage: 20, poise: 35, knock: 8, lunge: 0, range: 3.0, box: { w: 2.6, h: 1.8, d: 2.6, fwd: -1.5, y: 1.0 } },
    // ---- Harrow: fists and greaves -------------------------------------------------------------------------------------
    // Stamp the Stones: a knee raised high, then the greave stamped: a ring along the floor; then the other, wider. Jump
    // them or roll them; Hale's cleave comes down where you land.
    { id: 'stampStones', name: 'Stamp the Stones', anim: 'stomp', pose: 'harrowStamp', noParry: true, rollOnly: true, tracking: { rate: 1.8, commit: 0.5 }, chance: 0.45,
      cue: { attack: 'crownCleave', delay: 0.35, chance: 0.7, near: 6 },
      hits: [{ startup: 1.05, active: 0.2, follow: 0.15, box: RING(0.8, 5, 1.4), impact: { ring: 2.6, crack: 1.2, dust: 12, shake: 0.1 } },
             { startup: 0.75, active: 0.2, follow: 0.4, box: RING(1.0, 8, 1.6), impact: { ring: 4.0, crack: 1.8, dust: 18, shake: 0.14 } }],
      recovery: 1.5, damage: 24, poise: 40, knock: 7, lunge: 0, range: 5, box: RING(0.8, 5, 1.4) },
    // Hammer of Both Hands: fists locked, wound over her left shoulder, held, smashed down across to her right.
    { id: 'hammerOfHands', name: 'Hammer of Both Hands', anim: 'chop', pose: 'harrowHammer', tracking: { rate: 2.2, commit: 0.6 }, markers: glint(0),
      hits: [{ startup: 1.15, active: 0.14, follow: 0.4, hold: { at: 0.55, time: [0.25, 0.7], chance: 0.5 } }], recovery: 1.3,
      damage: 36, poise: 65, knock: 8, lunge: 1.4, range: 3.0, box: { w: 2.2, h: 2.6, d: 3.2, fwd: 1.6, y: 1.0 },
      impact: { ring: 2.0, crack: 1.0, dust: 10, shake: 0.1 } },
    // Knuckle and Heel: a jab, a hook, a front kick. Quick; parry each.
    { id: 'knuckleHeel', name: 'Knuckle and Heel', anim: 'thrust', pose: 'harrowKnuckleHeel', tracking: { rate: 3.2, commit: 0.65 }, markers: glint(0, 1, 2),
      hits: [{ startup: 0.65, active: 0.1, follow: 0.08, box: { w: 1.0, h: 1.2, d: 2.6, fwd: 1.6, y: 1.6 } },
             { startup: 0.38, active: 0.12, follow: 0.08, box: { w: 2.6, h: 1.2, d: 2.2, fwd: 1.2, y: 1.6 } },
             { startup: 0.6, active: 0.14, follow: 0.35, box: { w: 1.4, h: 1.2, d: 3.0, fwd: 1.8, y: 0.9 } }], recovery: 0.9,
      followUps: [{ attack: 'backHeel', if: 'behind', chance: 0.7 }],
      damage: 20, poise: 30, knock: 5, lunge: 1.4, range: 2.8, box: { w: 1.0, h: 1.2, d: 2.6, fwd: 1.6, y: 1.6 } },
    // The Falling Weight: a sprinter's crouch, a leap, both knees down on you; the stones ring out a moment after.
    { id: 'fallingWeight', name: 'The Falling Weight', anim: 'chop', pose: 'harrowFallingWeight', noParry: true, tracking: { rate: 2.4, commit: 0.5 }, minRange: 5, chance: 0.4,
      hits: [{ startup: 1.3, active: 0.16, follow: 0.3, leap: { from: 0.45, max: 12, short: 1.2 }, box: { w: 3.0, h: 2.2, d: 3.0, fwd: 0.6, y: 0.8 },
               impact: { ring: 3.6, crack: 2.0, dust: 20, shake: 0.16 } },
             { startup: 0.32, active: 0.2, follow: 0.4, box: RING(1.4, 7, 1.6, 0.2), impact: { ring: 4.2, crack: 0, dust: 12, shake: 0.1 } }],
      recovery: 1.7, damage: 40, poise: 75, knock: 10, lunge: 0, range: 12, box: { w: 3.0, h: 2.2, d: 3.0, fwd: 0.6, y: 0.8 } },
    // Greave Slide: from afar, a run, then she drops and slides in feet first at your shins. Jump it.
    { id: 'greaveSlide', name: 'Greave Slide', anim: 'bash', pose: 'harrowGreaveSlide', noParry: true, tracking: { rate: 2.6, commit: 0.5 },
      minRange: 4, dash: { speed: 12, from: 0.4 }, chance: 0.35,
      hits: [{ startup: 0.85, active: 0.2, follow: 0.4 }], recovery: 1.1,
      damage: 26, poise: 45, knock: 8, lunge: 2.4, range: 11, box: { w: 2.2, h: 0.8, d: 2.8, fwd: 1.2, y: 0.4, ground: true } },
    // Behind her: a greave kicked straight back.
    { id: 'backHeel', name: 'Back Heel', anim: 'thrust', pose: 'harrowBackHeel', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 3,
      hits: [{ startup: 0.55, active: 0.12, follow: 0.3 }], recovery: 0.8,
      damage: 20, poise: 35, knock: 9, lunge: 0, range: 3.0, box: { w: 2.0, h: 1.6, d: 2.8, fwd: -1.6, y: 0.8 } },
    // ---- alone, in the whole suit ---------------------------------------------------------------------------------------
    // Her Sister's Half (the opener): she kneels by her sister a long while, untouchable, then rises in the whole suit and
    // the stones ring out round her.
    { id: 'sistersHalf', name: 'Her Sister\'s Half', anim: 'stomp', pose: 'castellanSistersHalf', noParry: true, invulnerable: true, tracking: { rate: 1.0, commit: 0.3 }, chance: 0,
      hits: [{ startup: 2.6, active: 0.2, follow: 0.6, box: RING(1.2, 7, 1.6), impact: { ring: 4.0, crack: 1.6, dust: 20, shake: 0.18 } }],
      recovery: 0.6, damage: 24, poise: 40, knock: 10, lunge: 0, range: 4, box: RING(1.2, 7, 1.6) },
    // Both Halves: the crown cleave, a stamp that rings out, the beard rising. Parry the first; jump or roll the ring; roll the third.
    { id: 'bothHalves', name: 'Both Halves', anim: 'chop', pose: 'castellanBothHalves', tracking: { rate: 2.4, commit: 0.6 }, markers: glint(0), chance: 0.35,
      hits: [{ startup: 1.1, active: 0.14, follow: 0.3, impact: { ring: 2.4, crack: 1.4, dust: 12, shake: 0.1 } },
             { startup: 0.7, active: 0.2, follow: 0.15, box: RING(1.0, 7, 1.6), impact: { ring: 3.6, crack: 1.6, dust: 16, shake: 0.12 } },
             { startup: 0.55, active: 0.14, follow: 0.4, box: { w: 3.6, h: 2.4, d: 3.2, fwd: 1.5, y: 1.1 } }],
      recovery: 1.6, damage: 34, poise: 60, knock: 8, lunge: 1.2, range: 3.8, box: { w: 1.6, h: 3.0, d: 4.2, fwd: 2.3, y: 1.2 } },
  ];
  const HALE = ['crownCleave', 'beardsHook', 'helmsSalute', 'wallTurns', 'offTheRampart', 'saltWind', 'haftsHeel'];
  const HARROW = ['stampStones', 'hammerOfHands', 'knuckleHeel', 'fallingWeight', 'greaveSlide', 'backHeel'];
  // Alone, in the whole suit: the axe and the greaves (the fists hold the axe now), and both halves at once.
  const WHOLE = ['sistersHalf', 'bothHalves', ...HALE, 'stampStones', 'fallingWeight', 'greaveSlide', 'backHeel'];
  const base = {
    scale: 1.75, bulk: 1.15, radius: 0.78, weapon: 'greataxe', idle: 'sway',
    hp: 1700, poise: 220, speed: 2.3, turnRate: 3.0, trackRate: 1.5, approach: 0.45, kite: 0.15,
    flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 7,
    posture: { max: 120, parry: 40, chainGap: 1.8, chainMul: 1.3, decay: 4, breakTime: 3.4, hitstop: 0.22 },
    attacks,
  };
  // While her sister stands: her own half, and a longer breath between blows. Alone: the whole suit, sooner and closer;
  // the other half shown as she rises from the kneel (a gilt burst, not the fire of a grafting).
  const pair = own => ({ hp: 1700, cooldown: [1.7, 3.0], attacks: own });
  const whole = (name, reveal, conceal) => ({ alone: true, name, opener: 'sistersHalf', reveal, conceal, revealBurst: { color: 0xe8c878, count: 60, speed: 5 },
    cooldown: [0.9, 1.7], approach: 0.7, kite: 0, speed: 2.6, trackRate: 1.8, attacks: WHOLE });
  const defs = [
    { ...base, id: 'hale', model: 'castellanHale', name: 'Hale, the Castellan',
      description: 'The elder castellan of Saltgrave, in the helm and breastplate of the one suit she shares with her sister, and the bearded axe.',
      color: 0x8e908a, visual: { skin: 0x9a9890, skinMetal: 0.4, metal: 0.5, roughness: 0.55, rim: 0.9 },
      defaultPhases: ['helm', 'whole'],
      phases: { helm: pair(HALE), whole: whole('Hale, the Whole Castellan', ['pairGilt', 'pairSteel'], ['bracer']) } },
    { ...base, id: 'harrow', model: 'castellanHarrow', name: 'Harrow, the Castellan',
      description: 'The younger castellan, bare-headed, in the gauntlets and greaves of the suit her sister shares. Her stamps ring out along the stones: jump them or roll.',
      color: 0x6a726c, visual: { skin: 0xc09a84, skinMetal: 0.2, metal: 0.4, roughness: 0.6, rim: 0.9 },
      defaultPhases: ['greaves', 'whole'],
      phases: { greaves: pair(HARROW), whole: whole('Harrow, the Whole Castellan', ['helmGilt', 'helmSteel', 'helmDark', 'haft', 'grip'], ['skin', 'hair']) } },
  ];
  for (const d of defs) { ENEMY_DEFS.push(d); ENEMY_BY_ID[d.id] = d; }
}
