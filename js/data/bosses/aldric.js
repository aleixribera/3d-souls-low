'use strict';
// ============================================================================
// Aldric, the Gaoler King (v4.3; his own fight since pass 75), the boss of Level 5, js/levels/final-castle.js (STORY.md 2)
// ============================================================================
// The last king to swear the Oath of the Open Hand, who feared death above all after the plague year and took the Undying
// Ember to cheat it. It keeps its bargain: he will not stay hurt. Every blow you land on him opens a wound the Ember fills
// (the def's `mend`: a share of the blow's damage glows on his bar, his cracks light, js/hud.js), and once no blow has
// landed for `delay` s the Ember closes it again, embers streaming back into him (js/finale.js). Only two things make a
// wound stay: keep at him before it closes, or break his guard, which lets the death in (a posture break seals every open
// wound; a riposte or an execution never opens one). Answer his greed for life with yours: press him, and break him. He
// knows it, and a king who was a soldier punishes greed in turn: a string of blows too long and he shoulders you off
// (`when: 'struck'`). Three bars. On the Field of Answer before his gates he is still a man, and his wounds stay; pressed,
// he withdraws behind his walls, where the Ember is strongest (the field's `retreat`). In the throne room the Ember mends
// him; past his second bar he gives himself to it wholly, burns (`ignite`), and it mends him faster.
//
// Every wind-up is his own, and he holds the blade in both hands (the model's `grip`, Rig.holdHaft): `haft: [pitch, yaw,
// roll]` is where the blade points in his chest's heading (pitch 0 level ahead, -1.57 straight up, positive dips the
// point; yaw + to his left; roll 3.14 its edges up and down, 4.71 its edges level). His guard: the point low before him,
// to his left. The blade hauled back low behind his right hip, his back half turned (the sweep); over his right shoulder,
// point to the sky (the two cuts); laid across the back of his neck like a headsman's yoke, point out to his left (the
// withheld sentence); drawn back level at his right hip, point at you (the lunge); let down along his right thigh,
// point trailing, his left hand off it and his left shoulder squared to you (the shoulder); the point planted ahead and
// leaned on, his right knee raised (the stamp); crouched with the blade over his right shoulder, point behind him (the
// leap). Burning: the point dragged on the floor
// behind him (the ash wave); low at his left (the ascent); the hilt raised to his chest, the blade hanging point-down (the
// last toll). The four-cut chain runs through four of these in a row.

// ---- his figure: built in Blender (tools/blender/aldric.py), one piece per bone -----------------------------------------
// Ironbound plate gone dark bronze, a slate tabard with the castle's tarnished gold stripe, a crown of shackles, the Oath's
// lock at his breast with a chain of office hung to it, a long ash-grey cloak. In his last bar (the Ember-Crowned) the
// plate cracks and the Ember shows through (`burn`); in the throne room the same cracks light while a wound is open (the
// Ember in him, js/finale.js). Pass 75: his own greatsword baked on the weapon bone (a broad soldier's blade, a cross
// whose ends are manacle cuffs, a long two-hand grip, the Oath's lock for a pommel) in place of the kit's.
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
    blade: { tex: 'dentedSteel', tint: 0x8a8a8e, decay: 0.55, size: 512, rim: 0.3 },   // a thin bright blade takes less rim (v7.39.0)
    void: { tex: 'ashSoot', tint: 0x141210, decay: 0.4 },
    burn: { glow: 0xff7a28, burn: true },   // the Ember in the cracks: drawn while he burns or a wound is open
    eye: { glow: 0xffc070 },
  },
  bones: {
    loinF: { parent: 'spin', at: [0.0, -0.02, 0.19] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.19] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.25] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] }, capeD: { parent: 'capeC', at: [0, -0.36, 0] },
  },
  // v7.47.0: a closed great helm with a dark eye slit and breaths on the right cheek, the crown of shackles (seven gilt
  // tines, an iron shackle under each); a cast cuirass with gilt borders, the Oath's lock (the Open Hand in gilt, a keyhole)
  // and a chain of office; layered pauldrons, the left heavier; manacles at both wrists, a broken chain off the left; the
  // tabard, the gilt knee cops, the long cloak torn below the knee; and the `burn` cracks over the helm, the cuirass and the
  // pauldrons. Pass 75: the greatsword on the weapon bone.
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    head: ['plate', 'void', 'dark', 'gilt', 'iron', 'burn'], neck: ['mail', 'dark'],
    chest: ['plate', 'gilt', 'dark', 'gilt.1', 'void', 'iron', 'burn'], spin: ['leather', 'gilt', 'plate', 'mail'],
    loinF: ['tabard', 'stripe'], loinB: ['tabard'], capeA: ['cloak'], capeB: ['cloak'], capeC: ['cloak'], capeD: ['cloakHem'],
    armL: ['mail', 'plate', 'gilt', 'burn'], armR: ['mail', 'plate', 'gilt', 'burn'],
    elbowL: ['plate', 'plate.1', 'gilt', 'iron', 'plate.2'], elbowR: ['plate', 'plate.1', 'gilt', 'iron', 'plate.2'],
    legL: ['mail', 'plate', 'gilt'], legR: ['mail', 'plate', 'gilt'], kneeL: ['plate', 'plate.1'], kneeR: ['plate', 'plate.1'],
    weapon: ['blade', 'dark', 'iron', 'leather', 'gilt', 'void'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `aldric:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42,
    ...(bone === 'weapon' ? { weapon: true } : {}) }))),
  weapon: null,   // his greatsword is part of the figure (the `weapon: true` pieces above)
  // Both hands on the grip, the left below the right (span: along the blade from the right fist, toward the pommel); at
  // rest the point hangs low before him, to his left.
  grip: { span: [-0.27, -0.11], gap: 0.11, rest: [0.55, 0.4, 3.14] },
  embers: { head: [0, 0, 1.3], edge: { size: [0.04, 0.1, 1.1], at: [0, 0, 0.75] } },   // along the blade (js/finale.js: shown while he burns)
  eyes: { color: 0xffc070, size: 0.013, spread: 0.055, at: [0, 0.146, 0.15] },   // behind the eye slit
  anim: {
    idle: { breathRate: 0.95, breath: 0.014, headDrift: 0.03, sway: 0.01, twitch: 0 }, walk: { twist: 0.08, roll: 0.03, headNod: 0.03, elbow: 0.25, drag: 0 },
    flinch: { head: 0.35, chest: 0.35, arms: 0.35 }, death: { buckle: 1, slump: 0.6 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 66, damp: 5.6, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 56, damp: 5, flutter: 0.04 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 36, damp: 3.8, flutter: 0.045 },
            { bone: 'capeC', gain: 0.07, k: 32, damp: 3.4, flutter: 0.06, sideways: 1.2 }, { bone: 'capeD', gain: 0.1, k: 24, damp: 2.8, flutter: 0.09, sideways: 1.4 }],
  },
};

// ---- key poses (js/data/attack-poses.js format) -------------------------------------------------------------------------
{
  const cut = { windup: 'inOutCubic', active: 'outCubic', follow: 'outQuad', recovery: 'inOutCubic' };   // a trained cut: gathered, then snapped through
  const heavy = { windup: 'inOutSine', active: 'outQuad', follow: 'outCubic', recovery: 'inOutCubic' };  // a weight that gathers, then falls
  const lunge = { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' };

  // Gaol Sweep: the blade hauled back low behind his right hip, point trailing, his back half turned; swung flat across at
  // your waist, and the weight carries him round to his left.
  const hauled = { crouch: 0.28, lean: 0.1, legL: [-0.5, 0, 0], legR: [0.45, 0, 0], spin: [0, -0.8, 0], chest: [0.05, -0.35, 0], neck: [0, 0.5, 0], head: [0, 0.6, 0],
    armR: [-0.45, 0, -0.6], elbowR: [-0.35, 0, 0], haft: [0.55, -1.15, 4.71], armL: [-0.8, 0, -0.5], elbowL: [-0.9, 0, 0] };
  const swept = { crouch: 0.22, lean: 0.1, legL: [-0.6, 0, -0.1], legR: [0.4, 0, 0.12], spin: [0, 0.4, 0], chest: [0.05, 0.2, 0], neck: [0, -0.2, 0], head: [0, -0.3, 0],
    armR: [-1.15, 0, 0.85], elbowR: [-0.1, 0, 0], haft: [0.25, -0.2, 4.71], armL: [-1.0, 0, 0.6], elbowL: [-0.3, 0, 0] };
  const sweptOn = { ...swept, crouch: 0.28, spin: [0, 0.6, 0], chest: [0.05, 0.3, 0], haft: [0.35, 0.6, 4.71] };
  ATTACK_POSES.aldricSweep = { ease: cut, lag: { weapon: 0.1 }, hits: [{ windup: hauled, strike: swept, follow: sweptOn }] };

  // Two Cuts: over his right shoulder, point to the sky; down across to his left knee (parry it); then from low at his left
  // up across to his right shoulder (parry it).
  const cocked = { crouch: 0.14, lean: -0.05, legL: [-0.45, 0, 0], legR: [0.4, 0, 0], spin: [0, -0.6, 0], chest: [-0.1, -0.35, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armR: [-2.5, 0, -0.35], elbowR: [-1.1, 0, 0], haft: [-1.9, -0.5, 3.14], armL: [-2.0, 0, -0.5], elbowL: [-1.0, 0, 0] };
  const downLeft = { crouch: 0.26, lean: 0.25, legL: [-0.75, 0, 0], kneeL: [0.3, 0, 0], legR: [0.5, 0, 0], spin: [0, 0.3, 0], chest: [0.3, 0.2, 0], neck: [0, -0.2, 0], head: [-0.1, -0.2, 0],
    armR: [-1.2, 0, 0.75], elbowR: [-0.1, 0, 0], haft: [0.75, 0.6, 3.14], armL: [-1.1, 0, 0.5], elbowL: [-0.2, 0, 0] };
  const lowLeft = { ...downLeft, crouch: 0.32, spin: [0, 0.4, 0], armR: [-0.9, 0, 0.8], haft: [0.95, 0.9, 3.14] };
  const rising = { crouch: 0.1, lean: -0.05, legL: [-0.4, 0, 0], legR: [0.55, 0, 0], spin: [0, -0.55, 0], chest: [-0.15, -0.35, 0], neck: [0, 0.3, 0], head: [0, 0.35, 0],
    armR: [-2.3, 0, -0.45], elbowR: [-0.3, 0, 0], haft: [-1.05, -0.3, 3.14], armL: [-2.0, 0, -0.3], elbowL: [-0.4, 0, 0] };
  ATTACK_POSES.aldricTwoCuts = { ease: cut, lag: { weapon: 0.08 },
    hits: [{ windup: cocked, strike: downLeft, follow: downLeft }, { windup: lowLeft, strike: rising, follow: { ...rising, haft: [-1.35, -0.5, 3.14] } }] };

  // The Withheld Sentence: the blade laid across the back of his neck like a headsman's yoke, point out to his left, both
  // fists up at his right ear; held, as long as he likes; brought over and straight down ahead.
  const yoke = { crouch: 0.1, lean: -0.15, legL: [-0.4, 0, 0], legR: [0.45, 0, 0], spin: [0, -0.35, 0], chest: [-0.25, -0.2, 0], neck: [-0.05, 0.15, 0], head: [-0.05, 0.2, 0],
    armR: [-2.6, 0, -0.6], elbowR: [-1.7, 0, 0], haft: [-0.15, 2.3, 4.71], armL: [-2.6, 0, 0.2], elbowL: [-1.6, 0, 0] };
  const fell = { crouch: 0.26, lean: 0.38, legL: [-0.95, 0, 0], kneeL: [0.45, 0, 0], legR: [0.65, 0, 0], kneeR: [0.2, 0, 0], chest: [0.4, 0, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0],
    armR: [-1.35, 0, 0.1], elbowR: [0, 0, 0], haft: [0.95, 0.05, 3.14], armL: [-1.3, 0, -0.05], elbowL: [-0.1, 0, 0] };
  const fellOn = { ...fell, crouch: 0.3, armR: [-1.15, 0, 0.1], haft: [1.15, 0.05, 3.14] };
  ATTACK_POSES.aldricSentence = { ease: heavy, lag: { weapon: 0.1 }, hits: [{ windup: yoke, strike: fell, follow: fellOn }] };

  // Shackle Lunge: drawn back level at his right hip, point at you, his weight back; he runs it through you.
  const drawn = { crouch: 0.32, lean: 0.1, legL: [-0.7, 0, 0], kneeL: [0.3, 0, 0], legR: [0.55, 0, 0], spin: [0, -0.55, 0], chest: [0.1, -0.3, 0], neck: [0, 0.4, 0], head: [0, 0.5, 0],
    armR: [-0.55, 0, -0.3], elbowR: [-1.5, 0, 0], haft: [0, 0.5, 4.71], armL: [-0.9, 0, 0.1], elbowL: [-1.3, 0, 0] };
  const thrust = { crouch: 0.3, lean: 0.5, legL: [-1.05, 0, 0], kneeL: [0.45, 0, 0], legR: [0.85, 0, 0], spin: [0, 0.15, 0], chest: [0.25, 0.1, 0], neck: [-0.15, -0.1, 0], head: [-0.2, -0.1, 0],
    armR: [-1.5, 0, 0.15], elbowR: [-0.05, 0, 0], haft: [0.05, -0.1, 4.71], armL: [-1.45, 0, 0.1], elbowL: [-0.15, 0, 0] };
  ATTACK_POSES.aldricLunge = { ease: lunge, lag: { weapon: 0.05 }, hits: [{ windup: drawn, strike: thrust, follow: thrust }] };

  // Iron Shoulder: the blade let down low along his right thigh, point trailing behind him, his left hand off it and his
  // left pauldron squared to you, deep in a crouch; he drives the shoulder into you. (Pass 75's judge: held upright, its
  // wind-up read as the Two Cuts'.) Blade up is always a cut; blade down and the shoulder forward, always the shove.
  const braced = { crouch: 0.38, lean: 0.25, legL: [-0.7, 0, 0], kneeL: [0.35, 0, 0], legR: [0.5, 0, 0], kneeR: [0.3, 0, 0], spin: [0, -0.5, 0], chest: [0.25, -0.6, 0],
    neck: [0, 0.6, 0], head: [-0.05, 0.75, 0], armR: [-0.3, 0, -0.35], elbowR: [-0.3, 0, 0], haft: [1.0, -1.3, 4.71], grip: false, armL: [-0.2, 0, 0.6], elbowL: [-1.8, 0, 0] };
  const rammed = { crouch: 0.3, lean: 0.55, legL: [-1.05, 0, 0], kneeL: [0.45, 0, 0], legR: [0.85, 0, 0], spin: [0, -0.4, 0], chest: [0.35, -0.5, 0], neck: [-0.1, 0.5, 0], head: [-0.1, 0.65, 0],
    armR: [-0.4, 0, -0.4], elbowR: [-0.25, 0, 0], haft: [0.9, -1.2, 4.71], grip: false, armL: [-0.3, 0, 0.7], elbowL: [-1.9, 0, 0] };
  ATTACK_POSES.aldricShoulder = { ease: lunge, lag: { weapon: 0.04 }, hits: [{ windup: braced, strike: rammed, follow: rammed }] };

  // The Gaoler's Stamp: the point planted in the floor ahead and leaned on, his right knee drawn up high; stamped down, and
  // the floor rings out round him.
  const kneeUp = { crouch: 0.05, lean: 0.15, legR: [-1.45, 0, 0], kneeR: [1.5, 0, 0], chest: [0.15, 0, 0], head: [-0.1, 0, 0],
    armR: [-1.0, 0, 0.25], elbowR: [-0.5, 0, 0], haft: [1.35, 0.15, 3.14], armL: [-1.0, 0, -0.05], elbowL: [-0.5, 0, 0] };
  const stamped = { crouch: 0.3, lean: 0.2, legR: [0.15, 0, 0], kneeR: [0.1, 0, 0], legL: [-0.3, 0, 0], kneeL: [0.3, 0, 0], chest: [0.25, 0, 0], head: [-0.2, 0, 0],
    armR: [-0.85, 0, 0.25], elbowR: [-0.4, 0, 0], haft: [1.45, 0.15, 3.14], armL: [-0.85, 0, -0.05], elbowL: [-0.4, 0, 0] };
  ATTACK_POSES.aldricStamp = { ease: heavy, lag: { weapon: 0.04 }, hits: [{ windup: kneeUp, strike: stamped, follow: stamped }] };

  // Judgement Leap: a deep crouch, the blade over his right shoulder with its point behind him; a leap along his locked aim,
  // and the blade comes down with him.
  const coiled = { crouch: 0.45, lean: 0.35, legL: [-0.9, 0, 0], kneeL: [0.6, 0, 0], legR: [0.4, 0, 0], kneeR: [0.6, 0, 0], spin: [0, -0.4, 0], chest: [0.35, -0.25, 0], neck: [-0.25, 0.2, 0], head: [-0.3, 0.25, 0],
    armR: [-2.1, 0, -0.55], elbowR: [-1.2, 0, 0], haft: [-0.4, -2.25, 3.14], armL: [-1.6, 0, -0.4], elbowL: [-1.2, 0, 0] };
  const crashed = { ...fell, crouch: 0.4, lean: 0.45, haft: [1.1, 0, 3.14] };
  ATTACK_POSES.aldricLeap = { ease: heavy, lag: { weapon: 0.08 }, hits: [{ windup: coiled, strike: crashed, follow: { ...crashed, crouch: 0.44 } }] };

  // Tolling Chain (burning): four cuts through four of his guards: over his right shoulder and down left; from low left up
  // right; hauled back right and swept flat; then the yoke, held a beat, and straight down.
  ATTACK_POSES.aldricChain = { ease: cut, lag: { weapon: 0.08 },
    hits: [{ windup: cocked, strike: downLeft, follow: downLeft }, { windup: lowLeft, strike: rising, follow: rising },
      { windup: hauled, strike: swept, follow: swept }, { windup: yoke, strike: fell, follow: fellOn }] };

  // Ash Wave (burning): the point dragged on the floor behind him at his right, crouched and turned away; flung up and
  // across, and the burning cut runs on along the floor.
  const trailing = { crouch: 0.4, lean: 0.3, legL: [-0.85, 0, 0], kneeL: [0.5, 0, 0], legR: [0.55, 0, 0], spin: [0, -0.95, 0], chest: [0.3, -0.4, 0], neck: [-0.1, 0.5, 0], head: [-0.1, 0.6, 0],
    armR: [-0.25, 0, -0.55], elbowR: [-0.2, 0, 0], haft: [1.0, -1.15, 4.71], armL: [-0.5, 0, -0.6], elbowL: [-0.6, 0, 0] };
  const flung = { crouch: 0.18, lean: 0.05, legL: [-0.5, 0, 0], legR: [0.6, 0, 0], spin: [0, 0.45, 0], chest: [-0.05, 0.3, 0], neck: [0, -0.2, 0], head: [0, -0.25, 0],
    armR: [-2.0, 0, 0.7], elbowR: [-0.1, 0, 0], haft: [-0.7, 0.15, 4.71], armL: [-1.7, 0, 0.4], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.aldricAshWave = { ease: { ...cut, active: 'outExpo' }, lag: { weapon: 0.12 }, hits: [{ windup: trailing, strike: flung, follow: flung }] };

  // Burning Ascent: the blade low at his left, point behind; a rising cut that lifts him off his feet with it, the blade
  // high over his head; and down with him into the floor.
  const lowBehind = { ...lowLeft, crouch: 0.36, spin: [0, 0.65, 0], haft: [1.0, 1.15, 3.14], armR: [-0.6, 0, 0.7] };
  const risen = { crouch: 0.02, lean: -0.2, legL: [-0.3, 0, 0], legR: [0.3, 0, 0], chest: [-0.3, 0, 0], neck: [-0.1, 0, 0], head: [-0.25, 0, 0],
    armR: [-2.9, 0, 0.1], elbowR: [-0.3, 0, 0], haft: [-1.55, 0, 3.14], armL: [-2.9, 0, -0.1], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.aldricAscent = { ease: heavy, lag: { weapon: 0.08 },
    hits: [{ windup: lowBehind, strike: risen, follow: risen }, { windup: { ...risen, chest: [-0.4, 0, 0], haft: [-1.8, 0, 3.14] }, strike: crashed, follow: crashed }] };

  // The Last Toll (burning): the hilt raised to his chest in both fists, the blade hanging point-down; driven into the floor,
  // three times, each a toll and a ring of fire; then both arms flung up and wide and the fire breaks out round him.
  const hung = { crouch: 0.08, lean: 0.05, chest: [-0.1, 0, 0], head: [-0.25, 0, 0],
    armR: [-2.0, 0, 0.25], elbowR: [-1.0, 0, 0], haft: [1.5, 0, 3.14], armL: [-2.0, 0, -0.25], elbowL: [-1.0, 0, 0] };
  const driven = { crouch: 0.38, lean: 0.2, legL: [-0.7, 0, 0], kneeL: [0.5, 0, 0], legR: [0.5, 0, 0], kneeR: [0.4, 0, 0], chest: [0.3, 0, 0], head: [-0.3, 0, 0],
    armR: [-1.1, 0, 0.25], elbowR: [-0.3, 0, 0], haft: [1.52, 0, 3.14], armL: [-1.1, 0, -0.25], elbowL: [-0.3, 0, 0] };
  const bowed = { ...driven, crouch: 0.45, chest: [0.45, 0, 0], head: [-0.45, 0, 0] };
  const flungWide = { crouch: 0.05, lean: -0.25, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], chest: [-0.35, 0, 0], head: [-0.4, 0, 0],
    armR: [-2.6, 0, -0.7], elbowR: [-0.2, 0, 0], haft: [-1.2, -0.6, 3.14], grip: false, armL: [-2.2, 0, 0.9], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.aldricLastToll = { ease: heavy, lag: { weapon: 0.05 },
    hits: [{ windup: hung, strike: driven, follow: driven }, { windup: hung, strike: driven, follow: driven }, { windup: hung, strike: driven, follow: driven },
      { windup: bowed, strike: flungWide, follow: flungWide }] };
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const SWEEP = { w: 5.0, h: 2.0, d: 3.6, fwd: 2.0, y: 1.2 };
  const CUT = { w: 3.6, h: 1.8, d: 3.2, fwd: 1.8, y: 1.2 };
  const FALL = { w: 1.8, h: 3.0, d: 3.8, fwd: 2.2, y: 1.2 };
  const THRUST = { w: 1.4, h: 1.8, d: 3.2, fwd: 2.0, y: 1.2 };
  const SHOULDER = { w: 2.6, h: 2.2, d: 2.0, fwd: 1.4, y: 1.2 };
  const STAMP = r => ({ w: 2 * r, h: 0.6, d: 2 * r, fwd: 0.3, y: 0.3, ground: true });
  const LANDING = r => ({ w: 2 * r, h: 0.6, d: 2 * r, fwd: 0.6, y: 0.3, ground: true });
  const TOLL_RING = { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 15, width: 2.2, time: 0.2 } };
  const BLAST = { w: 6.4, h: 2.0, d: 6.4, fwd: 0, y: 1.0 };

  // ---- the man: the Field of Answer and the throne room's first bar ------------------------------------------------------
  // Gaol Sweep: hauled back low at his right hip; flat across at your waist. Parry it.
  const sweep = { id: 'varnSweep', name: 'Gaol Sweep', anim: 'sweep', pose: 'aldricSweep', tracking: { rate: 2.2, commit: 0.65 }, markers: glint(0), poseScale: 1.1,
    hits: [{ startup: 1.2, active: 0.14, follow: 0.38 }], recovery: 2,
    damage: 38, poise: 60, knock: 8, lunge: 1.2, range: 3.4, box: SWEEP };
  // Two Cuts: over his right shoulder; down across (parry it), then up across (parry it).
  const cleave = { id: 'varnCleave', name: 'Two Cuts', anim: 'sweep', pose: 'aldricTwoCuts', tracking: { rate: 2.6, commit: 0.7 }, markers: glint(0, 1), poseScale: 1.1,
    hits: [{ startup: 0.9, active: 0.13, follow: 0.64 }, { startup: 0.62, active: 0.13, follow: 0.3 }], recovery: 1.9,
    damage: 30, poise: 45, knock: 6, lunge: 2.2, range: 3.0, box: CUT };
  // The Withheld Sentence: the yoke across his neck, held as long as he likes; down ahead. Parry it, if you wait for it.
  const sentence = { id: 'varnDelay', name: 'The Withheld Sentence', anim: 'chop', pose: 'aldricSentence', tracking: { rate: 2.2, commit: 0.55 }, markers: glint(0), poseScale: 1.1,
    hits: [{ startup: 1.5, active: 0.14, follow: 0.4, hold: { at: 0.5, time: [0.5, 1.2], chance: 0.75 } }], recovery: 2.3,
    damage: 52, poise: 80, knock: 9, lunge: 1.6, range: 3.2, box: FALL, impact: { ring: 2.8, crack: 1.6, dust: 14, shake: 0.1 } };
  // Shackle Lunge: drawn back level at his hip, point at you; a run and a thrust from far off. Parry it.
  const lungeAt = { id: 'varnLunge', name: 'Shackle Lunge', anim: 'thrust', pose: 'aldricLunge', tracking: { rate: 2.6, commit: 0.4 }, markers: glint(0), poseScale: 1.05, minRange: 5,
    dash: { speed: 11, from: 0.45 }, chance: 0.7,
    hits: [{ startup: 1.1, active: 0.16, follow: 0.26 }], recovery: 1.9,
    damage: 36, poise: 55, knock: 8, lunge: 2.6, range: 12, box: THRUST };
  // Iron Shoulder: the blade let down along his thigh, his left shoulder squared to you; driven into you. It throws you
  // back. Parry it.
  const shoulder = { id: 'varnShoulder', name: 'Iron Shoulder', anim: 'shove', pose: 'aldricShoulder', tracking: { rate: 2.2, commit: 0.7 }, markers: glint(0), poseScale: 1.1, shove: true, chance: 0.35,
    hits: [{ startup: 0.85, active: 0.14, follow: 0.2 }], recovery: 1.5,
    damage: 16, poise: 40, knock: 18, lunge: 2.4, range: 2.2, box: SHOULDER };
  // The King's Rebuke: the same shoulder, as his answer to a string of blows too long (`struck`): never chosen otherwise. Its
  // wind-up is shorter, but it is the same wind-up. Parry it, or stop striking and roll.
  const rebuke = { ...JSON.parse(JSON.stringify(shoulder)), id: 'varnRebuke', name: "The King's Rebuke", when: 'struck', chance: 1.6,
    hits: [{ startup: 0.7, active: 0.14, follow: 0.2 }], tracking: { rate: 3, commit: 0.6 } };
  // The Gaoler's Stamp: the point planted, his knee drawn up; the floor rings out round him. Jump it, or roll it.
  const stamp = { id: 'varnStomp', name: "The Gaoler's Stamp", anim: 'stomp', pose: 'aldricStamp', tracking: { rate: 1.4, commit: 0.5 }, poseScale: 1.1, rollOnly: true, chance: 0.4,
    hits: [{ startup: 1.35, active: 0.14, follow: 0.4 }], recovery: 2.4,
    damage: 44, poise: 70, knock: 10, lunge: 0, range: 2.6, box: STAMP(2.8), impact: { ring: 4.0, crack: 2.0, dust: 18, shake: 0.12 } };
  // Judgement Leap: crouched, the blade over his shoulder; a leap high along his locked aim, a crash that rings the ground.
  // Roll it. A long recovery.
  const leap = { id: 'varnLeap', name: 'Judgement Leap', anim: 'chop', pose: 'aldricLeap', tracking: { rate: 1.8, commit: 0.45 }, poseScale: 1.1, rollOnly: true, minRange: 4, chance: 0.35,
    hits: [{ startup: 1.9, active: 0.16, follow: 0.5, leap: { from: 0.45, max: 13, short: 1.4 } }], recovery: 4,
    damage: 60, poise: 90, knock: 12, lunge: 0, range: 13, box: LANDING(2.5), impact: { ring: 6.0, crack: 2.6, dust: 26, shake: 0.2 } };

  // ---- the Ember-Crowned: the same blade, burning, faster -----------------------------------------------------------------
  const hot = (a, over) => ({ ...JSON.parse(JSON.stringify(a)), ...over });
  const knellSweep = hot(sweep, { id: 'knellSweep', name: 'Burning Sweep', tracking: { rate: 3.2, commit: 0.65 }, poseScale: 1.15,
    hits: [{ startup: 0.95, active: 0.14, follow: 0.34 }], recovery: 2.2, damage: 34, lunge: 1.4, range: 3.6, box: { ...SWEEP, w: 5.4, d: 3.8 } });
  const knellCleave = hot(cleave, { id: 'knellCleave', tracking: { rate: 3.4, commit: 0.7 }, poseScale: 1.15,
    hits: [{ startup: 0.75, active: 0.13, follow: 0.62 }, { startup: 0.5, active: 0.13, follow: 0.26 }], recovery: 2.2, damage: 26, lunge: 2.4, range: 3.1, box: { ...CUT, w: 3.8, d: 3.4 } });
  const knellSentence = hot(sentence, { id: 'knellDelay', tracking: { rate: 3.0, commit: 0.55 }, poseScale: 1.15,
    hits: [{ startup: 1.3, active: 0.14, follow: 0.36, hold: { at: 0.5, time: [0.6, 1.4], chance: 0.5 } }], recovery: 2.9, damage: 44, lunge: 1.8, range: 3.3,
    box: { ...FALL, w: 1.9, d: 4.0 }, impact: { ring: 3.4, crack: 1.8, dust: 18, shake: 0.12 } });
  const knellLunge = hot(lungeAt, { id: 'knellLunge', tracking: { rate: 3.4, commit: 0.4 }, poseScale: 1.1, dash: { speed: 12.5, from: 0.45 }, chance: 0.8,
    hits: [{ startup: 0.95, active: 0.16, follow: 0.24 }], recovery: 2.4, damage: 30, lunge: 2.8, range: 13, box: { ...THRUST, w: 1.5, d: 3.4 } });
  const knellStamp = hot(stamp, { id: 'knellStomp', tracking: { rate: 2.0, commit: 0.5 }, poseScale: 1.15, chance: 0.45,
    hits: [{ startup: 1.15, active: 0.14, follow: 0.36 }], recovery: 3.2, damage: 36, range: 2.8, box: STAMP(3.2), impact: { ring: 5.0, crack: 2.4, dust: 22, shake: 0.14 } });
  const knellLeap = hot(leap, { id: 'knellLeap', tracking: { rate: 2.6, commit: 0.45 }, poseScale: 1.15, chance: 0.25,
    hits: [{ startup: 1.7, active: 0.16, follow: 0.45, leap: { from: 0.45, max: 14, short: 1.4 } }], recovery: 4.8, damage: 50, range: 14, box: LANDING(2.8),
    impact: { ring: 7.0, crack: 3.0, dust: 30, shake: 0.22 } });
  const knellRebuke = hot(rebuke, { id: 'knellRebuke', chance: 2.2, hits: [{ startup: 0.62, active: 0.14, follow: 0.2 }] });

  // ---- the Ember-Crowned: his own -----------------------------------------------------------------------------------------
  // Tolling Chain: four cuts through four guards, the last held a beat before it falls. Every cut can be parried.
  const chain = { id: 'tollingChain', name: 'Tolling Chain', anim: 'sweep', pose: 'aldricChain', tracking: { rate: 3.4, commit: 0.72 }, poseScale: 1.15, chance: 0.9,
    markers: glint(0, 1, 2, 3),
    hits: [{ startup: 0.72, active: 0.13, follow: 0.6 }, { startup: 0.45, active: 0.13, follow: 0.6 }, { startup: 0.45, active: 0.13, follow: 0.6, box: SWEEP },
           { startup: 0.95, active: 0.15, follow: 0.36, hold: { at: 0.5, time: [0.3, 0.8], chance: 0.6 }, box: FALL }], recovery: 3.2,
    damage: 22, poise: 40, knock: 6, lunge: 1.8, range: 3.0, box: CUT };
  // Ash Wave: the point dragged behind him; flung up and across, and a burning cut runs on along the floor. Sidestep or roll it.
  const ashWave = { id: 'ashWave', name: 'Ash Wave', anim: 'sweep', pose: 'aldricAshWave', tracking: { rate: 2.6, commit: 0.8 }, poseScale: 1.15, minRange: 4, chance: 0.5,
    projectile: { speed: 15, gravity: 0, size: 0.6, look: 'slash' },
    hits: [{ startup: 1.15, active: 0.05, follow: 0.3 }], recovery: 2.9,
    damage: 28, poise: 45, knock: 7, lunge: 0, range: 20, box: { w: 1, h: 1, d: 1, fwd: 1, y: 0.8 } };
  // Burning Ascent: from low at his left, a rising cut that lifts him off his feet; then down with him in a burning crash.
  const ascent = { id: 'burningAscent', name: 'Burning Ascent', anim: 'chop', pose: 'aldricAscent', tracking: { rate: 2.6, commit: 0.6 }, poseScale: 1.15, rollOnly: true, chance: 0.4,
    hits: [{ startup: 0.85, active: 0.14, follow: 0.62 }, { startup: 1.1, active: 0.16, follow: 0.45, leap: { from: 0.3, max: 9, short: 1.4 },
      box: LANDING(2.5), impact: { ring: 5.0, crack: 2.2, dust: 22, shake: 0.16 } }], recovery: 4.8,
    damage: 32, poise: 70, knock: 9, lunge: 1.6, range: 3.2, box: { w: 2.6, h: 2.8, d: 3.0, fwd: 1.8, y: 1.3 } };
  // The Last Toll: the hilt raised, the blade hanging point-down; driven into the floor three times, three tolls, three
  // rings of fire out across the room (roll or jump each as it reaches you); then the fire breaks out close round him.
  const lastToll = { id: 'lastToll', name: 'The Last Toll', anim: 'stomp', pose: 'aldricLastToll', tracking: { rate: 1.6, commit: 0.4 }, poseScale: 1.1, rollOnly: true, chance: 0.12,
    markers: [{ at: 'windup', t: 0, event: 'sound', sound: 'bellToll', vel: 1 }, { at: 'windup', t: 0, hit: 1, event: 'sound', sound: 'bellToll', vel: 0.9 },
              { at: 'windup', t: 0, hit: 2, event: 'sound', sound: 'bellToll', vel: 0.9 }],
    hits: [{ startup: 1.6, active: 0.2, follow: 1.1, box: TOLL_RING }, { startup: 0.8, active: 0.2, follow: 1.1, box: TOLL_RING },
           { startup: 0.8, active: 0.2, follow: 1.1, box: TOLL_RING }, { startup: 1.0, active: 0.16, follow: 0.6, box: BLAST, impact: { ring: 6.0, crack: 3.0, dust: 30, shake: 0.22 } }],
    recovery: 4.4, damage: 32, poise: 60, knock: 10, lunge: 0, range: 9, box: BLAST };

  // The Undying Ember (pass 75): `share` of each blow that lands opens a wound on his bar, at most `cap` of it at a time;
  // once no blow has landed for `delay` s the Ember closes it at `rate` of his bar a second. A posture break seals every
  // open wound; a blow on him while parried or broken opens none.
  const MEND = { share: 0.5, cap: 0.12, delay: 2.4, rate: 0.05 };

  const ALDRIC = {
    // The castle's lord, the jailer of the prison the player escaped (Levels 1-2), master of the invaders who burned the
    // town (Level 3). Ringing the tower bell (Level 4) called him out to answer a challenge, as of old. Three phases
    // (Enemy.enterPhase): `field` outside the castle (ends in a retreat), then `throne` and `knell` in the throne room.
    // Every strike's active time stays well under a roll's i-frames (the boss test).
    id: 'varn', model: 'varn', name: 'Aldric, the Gaoler King',
    description: 'Aldric, king of Ashmere, who took the Undying Ember to cheat death, and it will not let him stay hurt. In his throne room every wound you give him glows, and the Ember closes it once you stop: keep at him, or break his guard to make the wounds stay. Strike too long and he shoulders you off. His sweep, his two cuts, his withheld sentence and his lunge can be parried; his stamp and his leap only rolled. In the end he burns.',
    scale: 1.75, bulk: 1.25, radius: 0.78, color: 0x5a4a36, weapon: 'sword', idle: 'guard',
    visual: { skin: 0x5a5048, skinMetal: 0.45, metal: 0.4, roughness: 0.45, rim: 0.9 },
    hp: 1600, poise: 240, speed: 2.1, turnRate: 3.0, trackRate: 1.5, approach: 0.45, kite: 0.2,   // v7.65.0: a skilled player alone beats it in about a minute (tools/bot-fights.cjs, BOTS=1 CLEAN=1)
    cooldown: [2.8, 5.2], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0, deathFade: 7,
    posture: { max: 91, parry: 26, chainGap: 1.8, chainMul: 1.35, decay: 4.5, breakTime: 3.4, hitstop: 0.22 },
    // Broken: hunched over his knees, the blade's point on the floor before him, his head hanging.
    brokenPose: { crouch: 0.32, lean: 0.3, chest: [0.35, 0, 0], neck: [0.2, 0, 0], head: [0.35, 0, 0], armR: [-0.9, 0, -0.05], elbowR: [-0.3, 0, 0], armL: [-0.45, 0, 0.3], elbowL: [-0.7, 0, 0] },
    defaultPhases: ['throne', 'knell'],   // a duel from the Enemies menu fights the throne room's two bars
    phases: {
      // Outside: still a man. Slower and readable, teaching his blade; his wounds stay. Ends in a retreat (the placement's `boss.retreat`).
      field: { hp: 1600, cooldown: [3, 5.6], approach: 0.35, kite: 0.25, speed: 2.0,
        attacks: ['varnSweep', 'varnCleave', 'varnDelay', 'varnLunge', 'varnShoulder', 'varnStomp', 'varnLeap'] },
      // The throne room's first bar: the same blade, pressed harder, and the Ember closes his wounds. Pass 75: the bars
      // in the throne room 1600 and 1700 before the Ember mended him; trimmed so a fight lasts about as long as it did.
      throne: { hp: 1400, cooldown: [2.1, 4], approach: 0.6, kite: 0, speed: 2.2, mend: MEND,
        attacks: ['varnSweep', 'varnCleave', 'varnDelay', 'varnLunge', 'varnShoulder', 'varnRebuke', 'varnStomp', 'varnLeap'] },
      // After the transition (15 s, invulnerable): burning, faster, fiercer tracking in the wind-ups (commit points
      // unchanged), four of his own, and the Ember mends him faster.
      knell: { name: 'Aldric, the Ember-Crowned', hp: 1500, transition: 15, ignite: true, cooldown: [1.6, 3.0], approach: 0.85, kite: 0, speed: 2.7,
        turnRate: 3.6, trackRate: 2.2, parriedTime: 1.7, mend: { ...MEND, share: 0.55, cap: 0.14, delay: 2.0, rate: 0.065 },
        posture: { max: 105, parry: 24, chainGap: 1.8, chainMul: 1.3, decay: 5, breakTime: 3.0, hitstop: 0.22 },
        attacks: ['knellSweep', 'knellCleave', 'knellDelay', 'knellLunge', 'knellRebuke', 'knellStomp', 'knellLeap', 'tollingChain', 'ashWave', 'burningAscent', 'lastToll'] },
    },
    attacks: [sweep, cleave, sentence, lungeAt, shoulder, rebuke, stamp, leap,
      knellSweep, knellCleave, knellSentence, knellLunge, knellRebuke, knellStamp, knellLeap, chain, ashWave, ascent, lastToll],
  };
  ENEMY_DEFS.push(ALDRIC); ENEMY_BY_ID[ALDRIC.id] = ALDRIC;
}
