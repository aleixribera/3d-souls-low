'use strict';
// ============================================================================
// Oswin, the First Crown (v7.46.0; his own since pass 47), the boss of Level 11, js/levels/aurel-in-ash.js (STORY.md 10g)
// ============================================================================
// The first king of Thrale the Ember ever wore, laid beneath the throne with the crown still on him, risen when the
// hunger, refused, burned the city it could not keep. The throne court's floor is his grave, and it does not hold: every
// stamp of his foot and every blow of the axe cracks it open along a line, and the crack stays open, glowing with the
// Ember beneath (a hit's `seam`, js/enemy.js noteSeams; drawn by js/ember-seams.js). When enough of it is open he calls on
// the throne (`when: 'seamed'`): the haft driven into the floor, his head thrown back, "Long live the king", and every
// seam stands up at once as a wall of fire (a hit's `erupt`). Read the floor: fight where it is whole, and draw his
// cracks where you will not need to stand. Past the worst of his hurt he casts the axe down into the floor (a cross of
// seams), and the Ember takes his hands: bare-handed and burning, his fists are parried, but he grabs (only a roll gets
// clear), pounds the floor open, and kneels to burn it twice. (Pass 145 reworked him, docs/bosses/oswin.md.)
//
// Every wind-up is his own. The knee lifted high, the axe upright at his side (the tread); the axe straight up over his
// head in both hands, up on his toes (the headsman's fall); wound back level at his right hip, his whole body turned
// away (threefold reign); the axe reversed and levelled at his shoulder, its crowned butt at you (the sceptre); a deep
// crouch with the axe trailing behind him (the leap); his left hand raised palm out, the axe dragged at his right (the
// royal progress); a look over his left shoulder, the axe on it (the turn); the haft stood upright before him on its
// head (long live the king). Uncrowned: the axe high over his head held a full breath (the crown cast down); both arms
// spread wide, hands open (the hold); fists drawn to his chin (the fists); both hands clasped at his left shoulder where
// the haft lay, head bowed (empty reign); both hands clasped high, leaning back (ground breaker); a runner's crouch, the
// fist by his ear (the sworn fist); the open hand low behind him, the other on his heart (the open hand); on one knee,
// both hands raised to strike the floor (the first hunger). Haft angles below are a `pitch`
// (0 level ahead, -1.57 straight up, positive dips the head), worked out into the weapon bone's angle after the poses.

// ---- his figure: built in Blender (tools/blender/oswin.py), one piece per bone -----------------------------------------
// Grey ash for skin, a long white beard and mane, the First Crown fused to his brow (seven tines like flames, ember-stones
// that never went out); a gold torc; an archaic cuirass of bronze scales; round bronze pauldrons; burial bands round
// forearms and feet; gold arm-rings; a kilt of studded lappets; the king's mantle burned nearly black, its hem still
// smouldering (`ember`); the Crown's Axe, a great bearded crescent on a gold-bound haft. Seams of fire up his forearms,
// across his breast and his face (`burn`) show only while he burns.
MODEL_DEFS.oswinFirstCrown = {
  extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.5,
  proportions: { shoulderX: 0.42, torsoW: 0.3, torsoD: 0.2, armR: 0.085, legR: 0.1, headR: 0.12, handR: 0.07, footLen: 0.34 },
  posture: { chest: [0.08, 0, 0], neck: [0.1, 0, 0], head: [-0.06, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.35, 0, 0] },   // stooped with age, the head still high
  materials: {
    skin: { tex: 'rotSkin', tint: 0x8c8780, decay: 0.75 },              // ash laid over dead skin
    hair: { tex: 'margitFur', tint: 0xdcd6cc, decay: 0.35 },            // an old king's white mane
    gold: { tex: 'sentinelFiligree', tint: 0xc89a48, decay: 0.55, rim: 0.5 },   // old gold, sooted
    bronze: { tex: 'wornGilt', tint: 0x8a6a3a, decay: 0.7, rim: 0.45 },
    cloth: { tex: 'rottenCloth', tint: 0x8a8070, decay: 0.75 },         // burial linen, grey with ash
    mantle: { tex: 'duelistVelvet', tint: 0x5a1410, decay: 0.6, double: true, rim: 0.3 },   // Thrale's crimson, burned nearly black
    leather: { tex: 'crackedLeather', tint: 0x3a2c22, decay: 0.6, double: true },
    iron: { tex: 'execBlade', tint: 0x5a5450, decay: 0.7, rim: 0.5, steel: true },   // (pass 145) banded as steel in cel, one hard glint
    ember: { glow: 0xff7a28 },                                          // the crown's stones and the mantle's hem, always alight
    burn: { glow: 0xff6a20, burn: true },
    eye: { glow: 0xff8a3a },
  },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0, -0.02, -0.2] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.28] }, capeB: { parent: 'capeA', at: [0, -0.44, -0.04] }, capeC: { parent: 'capeB', at: [0, -0.44, -0.03] },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    head: ['skin', 'hair', 'gold', 'ember', 'burn'], chest: ['skin', 'bronze', 'gold', 'mantle', 'burn'], spin: ['cloth', 'leather', 'gold'],
    loinF: ['leather', 'gold'], loinB: ['leather', 'gold'], capeA: ['mantle'], capeB: ['mantle'], capeC: ['mantle', 'ember'],
    armL: ['skin', 'bronze', 'gold'], armR: ['skin', 'bronze', 'gold'], elbowL: ['skin', 'skin.1', 'cloth', 'burn'], elbowR: ['skin', 'skin.1', 'cloth', 'burn'],
    legL: ['skin'], legR: ['skin'], kneeL: ['skin', 'bronze', 'cloth'], kneeR: ['skin', 'bronze', 'cloth'],
    weapon: ['leather', 'iron', 'gold'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `oswin:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42,
    ...(bone === 'weapon' ? { weapon: true } : {}) }))),
  weapon: null,          // the Crown's Axe is part of the figure (the `weapon: true` pieces above)
  weaponRest: 1.0,       // at rest its head hangs low before his right foot
  // (pass 145, docs/bosses/system.md 4) the wind-up's tell sits on what strikes, never over his body: the axe's bit
  // (`edgeTell`), or a hit's `tell`: a burning fist or a foot thrown down. Uncrowned, with the axe cast down, every blow
  // names its own. A heavy grows that halo instead of washing him orange (`tellsGrow`). Bone-local at rest: the right
  // fist round the weapon bone's origin, the left 0.36 below the elbow, the feet 0.4 below the knees.
  edgeTell: { slot: 'iron', size: 0.6, along: 0.82 },
  tells: { fistR: { bone: 'elbowR', at: [0, -0.36, 0.02], size: 0.45 }, fistL: { bone: 'elbowL', at: [0, -0.36, 0.02], size: 0.45 },
    footR: { bone: 'kneeR', at: [0, -0.4, 0.12], size: 0.5 }, footL: { bone: 'kneeL', at: [0, -0.4, 0.12], size: 0.5 } },
  tellsGrow: true,
  eyes: { color: 0xff8a3a, size: 0.011, spread: 0.034, at: [0, 0.12, 0.085] },   // deep under the brow
  anim: {
    idle: { breathRate: 0.55, breath: 0.016, headDrift: 0.025, sway: 0.01, twitch: 0 }, walk: { twist: 0.08, roll: 0.05, headNod: 0.025, elbow: 0.08, drag: 0.1 },
    flinch: { head: 0.25, chest: 0.25, arms: 0.2 }, death: { buckle: 0.9, slump: 1.0 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 55, damp: 5.2, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 50, damp: 5, flutter: 0.04 },
      // (pass 145) the mantle hangs down his bowed back and does not stand out over him as a board when he turns (plumb,
      // as the Regent's, pass 143)
      { bone: 'capeA', gain: 0.1, k: 38, damp: 4.4, flutter: 0.03, plumb: 0.7, max: 0.4, sideways: 0.5 }, { bone: 'capeB', gain: 0.14, k: 32, damp: 3.8, flutter: 0.04, max: 0.3, sideways: 0.5 },
      { bone: 'capeC', gain: 0.18, k: 26, damp: 3.2, flutter: 0.06, max: 0.3, sideways: 0.5 }],
  },
};

// ---- key poses (js/data/attack-poses.js format) -------------------------------------------------------------------------
{
  const heavy = { windup: 'inOutCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };
  const slam = { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' };
  // Two hands on the haft: the left reaches across to it below the right.
  const grip = (armL, elbowL) => ({ armL, elbowL });

  // The King's Tread: the right knee lifted high, the axe upright at his side, the left arm out for balance; the foot
  // comes down and the floor splits ahead of him.
  const kneeUp = { crouch: 0.05, lean: -0.12, legR: [-1.5, 0, 0], kneeR: [1.4, 0, 0], legL: [0.05, 0, 0], chest: [-0.15, 0, 0], head: [0.05, 0, 0],
    armR: [-0.35, 0, -0.35], elbowR: [-0.9, 0, 0], pitch: -1.45, armL: [-0.4, 0, 0.9], elbowL: [-0.3, 0, 0] };
  const stamp = { crouch: 0.3, lean: 0.3, legR: [-0.45, 0, 0], kneeR: [0.2, 0, 0], legL: [0.45, 0, 0], kneeL: [0.4, 0, 0], chest: [0.3, 0, 0], head: [0.15, 0, 0],
    armR: [-0.5, 0, -0.45], elbowR: [-0.7, 0, 0], pitch: -1.0, armL: [-0.3, 0, 0.7], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.oswinTread = { ease: slam, lag: { weapon: 0.1 }, hits: [{ windup: kneeUp, strike: stamp, follow: { ...stamp, crouch: 0.34 } }] };

  // The Headsman's Fall: up on his toes, the axe straight up over his head in both hands, held; brought straight down,
  // the bit buried in the floor and the floor split on from it.
  const raised = { crouch: -0.02, lean: -0.2, legL: [-0.3, 0, 0], legR: [0.25, 0, 0], chest: [-0.3, 0, 0], neck: [-0.1, 0, 0], head: [-0.15, 0, 0],
    armR: [-3.0, 0, 0.25], elbowR: [-0.4, 0, 0], pitch: -2.2, ...grip([-2.9, 0, -0.35], [-0.6, 0, 0]) };
  const buried = { crouch: 0.4, lean: 0.55, legL: [-0.85, 0, 0], kneeL: [0.6, 0, 0], legR: [0.55, 0, 0], chest: [0.45, 0, 0], head: [0.15, 0, 0],
    armR: [-1.1, 0, 0.15], elbowR: [-0.05, 0, 0], pitch: 0.75, ...grip([-1.0, 0, -0.4], [-0.3, 0, 0]) };
  ATTACK_POSES.oswinHeadsman = { ease: slam, lag: { weapon: 0.12, armR: 0.04 }, hits: [{ windup: raised, strike: buried, follow: { ...buried, crouch: 0.44 } }] };

  // Threefold Reign: wound back level at his right hip, turned away; across at the waist, back across, then heaved up
  // and down ahead into the floor.
  const wound = { crouch: 0.25, lean: 0.1, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], spin: [0, -1.25, 0], chest: [0.05, -0.4, 0], neck: [0, 0.7, 0], head: [0, 0.7, 0],
    armR: [-1.3, 0, -1.1], elbowR: [-0.3, 0, 0], pitch: 0.1, ...grip([-1.1, 0, -0.8], [-0.9, 0, 0]) };
  const across = { crouch: 0.3, lean: 0.25, legL: [-0.65, 0, 0], legR: [0.45, 0, 0], spin: [0, 1.0, 0], chest: [0.1, 0.4, 0], neck: [0, -0.4, 0], head: [0, -0.5, 0],
    armR: [-1.45, 0, 0.75], elbowR: [-0.05, 0, 0], pitch: 0.15, ...grip([-1.3, 0, 0.3], [-0.4, 0, 0]) };
  const backAcross = { ...wound, spin: [0, -1.1, 0], armR: [-1.45, 0, -1.0], elbowR: [-0.05, 0, 0], pitch: 0.12 };
  const heave = { crouch: 0.1, lean: -0.1, legL: [-0.45, 0, 0], legR: [0.3, 0, 0], spin: [0, -0.3, 0], chest: [-0.25, -0.1, 0], head: [-0.1, 0, 0],
    armR: [-2.9, 0, -0.1], elbowR: [-0.5, 0, 0], pitch: -2.4, ...grip([-2.7, 0, -0.5], [-0.7, 0, 0]) };
  ATTACK_POSES.oswinThreefold = { ease: heavy, lag: { weapon: 0.12, armR: 0.05 }, hits: [
    { windup: wound, strike: across, follow: { ...across, spin: [0, 1.15, 0] } },
    { windup: { ...across, spin: [0, 1.15, 0], crouch: 0.32 }, strike: backAcross, follow: { ...backAcross, spin: [0, -1.25, 0] } },
    { windup: heave, strike: buried, follow: { ...buried, crouch: 0.44 } }] };

  // The Sceptre's Reach: the axe reversed and levelled at his right shoulder, its crowned butt at you, his left hand far up
  // the haft; driven straight out, then the head brought round and up through you.
  const levelled = { crouch: 0.2, lean: -0.05, legL: [-0.55, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.5, 0], chest: [-0.05, -0.2, 0], head: [0, 0.3, 0],
    armR: [-1.2, 0, -0.55], elbowR: [-1.5, 0, 0], pitch: 3.25, ...grip([-0.6, 0, -0.5], [-0.5, 0, 0]) };
  const driven = { crouch: 0.3, lean: 0.4, legL: [-1.0, 0, 0], kneeL: [0.6, 0, 0], legR: [0.6, 0, 0], spin: [0, 0.2, 0], chest: [0.2, 0.1, 0], head: [-0.05, 0, 0],
    armR: [-1.3, 0, -0.1], elbowR: [-0.2, 0, 0], pitch: 3.1, ...grip([-1.4, 0, -0.2], [-0.2, 0, 0]) };
  const scoop = { crouch: 0.35, lean: 0.3, legL: [-0.7, 0, 0], legR: [0.5, 0, 0], spin: [0, -0.6, 0], chest: [0.3, -0.3, 0], head: [0, 0.2, 0],
    armR: [0.1, 0, -0.5], elbowR: [-0.1, 0, 0], pitch: 1.6, ...grip([-0.3, 0, -0.6], [-0.4, 0, 0]) };
  const risenCut = { crouch: 0.05, lean: -0.15, legL: [-0.5, 0, 0], legR: [0.35, 0, 0], spin: [0, 0.6, 0], chest: [-0.25, 0.3, 0], head: [-0.2, -0.2, 0],
    armR: [-2.6, 0, 0.4], elbowR: [-0.2, 0, 0], pitch: -1.8, ...grip([-2.3, 0, -0.1], [-0.5, 0, 0]) };
  ATTACK_POSES.oswinSceptre = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.08 },
    hits: [{ windup: levelled, strike: driven, follow: driven }, { windup: scoop, strike: risenCut, follow: { ...risenCut, spin: [0, 0.75, 0] } }] };

  // The King's Leap: a deep crouch, the axe trailing low behind him; up, and down onto you, the floor split three ways.
  const trail = { crouch: 0.55, lean: 0.2, legL: [-0.9, 0, 0], kneeL: [1.1, 0, 0], legR: [0.5, 0, 0], kneeR: [1.0, 0, 0], chest: [-0.1, 0, 0], head: [-0.3, 0, 0],
    armR: [0.6, 0, -0.4], elbowR: [-0.1, 0, 0], pitch: 2.5, armL: [-0.8, 0, 0.5], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.oswinLeap = { ease: slam, lag: { weapon: 0.12 }, hits: [{ windup: trail, strike: buried, follow: { ...buried, crouch: 0.5, lean: 0.6 } }] };

  // The Royal Progress (pass 145): his left hand raised before him palm out, as a king bids the court be still, the axe
  // dragged at his right with its bit on the floor; it comes up through you, over and down across you from his left
  // shoulder, and then the right foot is thrown down and the floor splits ahead.
  const bidding = { crouch: 0.08, lean: -0.1, legL: [-0.35, 0, 0], legR: [0.3, 0, 0], spin: [0, -0.35, 0], chest: [-0.15, -0.1, 0], head: [-0.08, 0.3, 0],
    armL: [-1.55, 0, 0.15], elbowL: [-0.1, 0, 0], armR: [0.45, 0, -0.3], elbowR: [-0.1, 0, 0], pitch: 2.2 };
  const upThrough = { crouch: 0.22, lean: 0.1, legL: [-0.7, 0, 0], kneeL: [0.4, 0, 0], legR: [0.45, 0, 0], spin: [0, 0.7, 0], chest: [-0.2, 0.35, 0], head: [-0.1, -0.2, 0],
    armR: [-2.4, 0, 0.5], elbowR: [-0.15, 0, 0], pitch: -1.6, armL: [-0.6, 0, 0.6], elbowL: [-0.5, 0, 0] };
  const overLeft = { ...upThrough, crouch: 0.16, lean: -0.05, spin: [0, 0.95, 0], chest: [-0.3, 0.45, 0], armR: [-2.75, 0, 0.65], pitch: -2.1, ...grip([-2.5, 0, 0.2], [-0.7, 0, 0]) };
  const downAcross = { crouch: 0.38, lean: 0.45, legL: [-0.9, 0, 0], kneeL: [0.6, 0, 0], legR: [0.55, 0, 0], spin: [0, -0.8, 0], chest: [0.4, -0.35, 0], head: [0.1, 0.2, 0],
    armR: [-0.9, 0, -0.5], elbowR: [-0.05, 0, 0], pitch: 1.0, ...grip([-0.8, 0, -0.6], [-0.3, 0, 0]) };
  const progressKnee = { ...kneeUp, spin: [0, -0.5, 0], armR: [-0.6, 0, -0.5], elbowR: [-0.3, 0, 0], pitch: 0.9, armL: [-0.5, 0, 0.9] };
  ATTACK_POSES.oswinProgress = { ease: heavy, lag: { weapon: 0.12, armR: 0.04 }, hits: [
    { windup: bidding, strike: upThrough, follow: overLeft },
    { windup: overLeft, strike: downAcross, follow: { ...downAcross, crouch: 0.42, lean: 0.52, spin: [0, -1.0, 0], chest: [0.48, -0.45, 0] } },
    { windup: progressKnee, strike: { ...stamp, armR: [-0.4, 0, -0.5], pitch: 1.1 }, follow: { ...stamp, crouch: 0.36, lean: 0.38, chest: [0.36, 0, 0], armR: [-0.4, 0, -0.5], pitch: 1.1 } }] };

  // The Turn: a look over his left shoulder, the axe on it; he comes round and the axe with him.
  const shoulder = { crouch: 0.2, legL: [-0.25, 0, 0], legR: [0.35, 0, 0], spin: [0, 0.9, 0], chest: [0, 0.35, 0], neck: [0, -0.5, 0], head: [0, -0.9, 0],
    armR: [-2.0, 0, 0.9], elbowR: [-1.4, 0, 0], pitch: -0.4, ...grip([-1.2, 0, 0.2], [-1.0, 0, 0]) };
  const round = { crouch: 0.3, lean: 0.15, legL: [-0.35, 0, 0], legR: [0.45, 0, 0], spin: [0, -1.6, 0], chest: [0.05, -0.5, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armR: [-1.45, 0, -1.1], elbowR: [0, 0, 0], pitch: 0.1, ...grip([-1.2, 0, -0.9], [-0.3, 0, 0]) };
  ATTACK_POSES.oswinTurn = { ease: heavy, lag: { weapon: 0.12 }, hits: [{ windup: shoulder, strike: round, follow: { ...round, spin: [0, -1.85, 0] } }] };

  // Long Live the King: he stands the axe on its head before him, both hands on the crowned butt, and drives it down;
  // then throws his head back and his arms wide and the floor answers him.
  const planted = { crouch: 0.05, lean: -0.05, legL: [-0.2, 0, 0], legR: [0.2, 0, 0], chest: [-0.05, 0, 0], head: [0.05, 0, 0],
    armR: [-0.9, 0, 0.3], elbowR: [-1.1, 0, 0], pitch: 1.4, ...grip([-0.9, 0, -0.3], [-1.1, 0, 0]) };
  const driveDown = { ...planted, crouch: 0.25, lean: 0.25, chest: [0.25, 0, 0], head: [0.2, 0, 0], armR: [-0.6, 0, 0.25], elbowR: [-0.5, 0, 0], pitch: 1.5,
    ...grip([-0.6, 0, -0.25], [-0.5, 0, 0]) };
  const hail = { crouch: 0.1, lean: -0.35, legL: [-0.3, 0, 0.1], legR: [0.3, 0, -0.1], chest: [-0.35, 0, 0], neck: [-0.35, 0, 0], head: [-0.6, 0, 0],
    armR: [-2.3, 0, -0.9], elbowR: [-0.2, 0, 0], pitch: -2.0, armL: [-2.3, 0, 0.9], elbowL: [-0.2, 0, 0] };
  ATTACK_POSES.oswinLongLive = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.1 },
    hits: [{ windup: planted, strike: driveDown, follow: driveDown }, { windup: { ...hail, armR: [-1.6, 0, -0.7], armL: [-1.6, 0, 0.7], head: [-0.3, 0, 0] }, strike: hail, follow: hail }] };

  // ---- uncrowned (second phase) ----
  // The Crown Cast Down (the phase opener): the axe high over his head, held a full breath; hurled down into the floor
  // before him, and the floor splits four ways from it.
  const castHigh = { ...raised, lean: -0.3, chest: [-0.4, 0, 0], head: [-0.3, 0, 0], armR: [-3.1, 0, 0.1], pitch: -1.7 };
  const cast = { crouch: 0.35, lean: 0.5, legL: [-0.8, 0, 0], legR: [0.5, 0, 0], chest: [0.5, 0, 0], head: [0.25, 0, 0],
    armR: [-0.7, 0, 0.1], elbowR: [0, 0, 0], pitch: 1.3, armL: [-0.7, 0, -0.1], elbowL: [0, 0, 0] };
  ATTACK_POSES.oswinCastDown = { ease: slam, lag: { weapon: 0.08 }, hits: [{ windup: castHigh, strike: cast, follow: { ...cast, crouch: 0.4 } }] };

  // The King's Hold: both arms spread wide, hands open, low and leaning in; he lunges and his arms close.
  const spread = { crouch: 0.35, lean: 0.1, legL: [-0.6, 0, 0], legR: [0.5, 0, 0], chest: [-0.05, 0, 0], head: [-0.25, 0, 0],
    armR: [-1.2, 0, -1.4], elbowR: [-0.3, 0, 0], armL: [-1.2, 0, 1.4], elbowL: [-0.3, 0, 0] };
  const closed = { crouch: 0.3, lean: 0.6, legL: [-1.0, 0, 0], kneeL: [0.5, 0, 0], legR: [0.6, 0, 0], chest: [0.4, 0, 0], head: [-0.1, 0, 0],
    armR: [-1.4, 0, 0.35], elbowR: [-0.7, 0, 0], armL: [-1.4, 0, -0.35], elbowL: [-0.7, 0, 0] };
  ATTACK_POSES.oswinHold = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [{ windup: spread, strike: closed, follow: closed }] };
  // The Sworn Fist (pass 145): a runner's crouch, the right fist drawn back by his ear and the left arm flung back; he
  // springs, and drives the fist straight through you.
  const sworn = { crouch: 0.45, lean: 0.25, legL: [-0.9, 0, 0], kneeL: [0.8, 0, 0], legR: [0.7, 0, 0], kneeR: [0.6, 0, 0], spin: [0, -0.6, 0], chest: [0.15, -0.3, 0], head: [-0.3, 0.4, 0],
    armR: [-1.2, 0, -1.3], elbowR: [-2.2, 0, 0], armL: [0.6, 0, 0.4], elbowL: [-0.3, 0, 0] };
  const punched = { crouch: 0.3, lean: 0.35, legL: [-1.0, 0, 0], kneeL: [0.5, 0, 0], legR: [0.6, 0, 0], spin: [0, 0.6, 0], chest: [0.2, 0.35, 0], head: [-0.15, -0.2, 0],
    armR: [-1.55, 0, 0.15], elbowR: [-0.05, 0, 0], armL: [0.5, 0, 0.5], elbowL: [-0.6, 0, 0] };
  ATTACK_POSES.oswinSwornFist = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [{ windup: sworn, strike: punched, follow: punched }] };
  // The Open Hand (pass 145): his burning right hand held out low behind him, open, his left over his heart, leaning back
  // and turned away; the palm comes round and up into you, and the Ember spills from it.
  const opened = { crouch: 0.3, lean: -0.15, legL: [-0.6, 0, 0], kneeL: [0.3, 0, 0], legR: [0.5, 0, 0], spin: [0, -0.9, 0], chest: [-0.15, -0.4, 0], head: [0, 0.7, 0],
    armR: [0.7, 0, -0.5], elbowR: [-0.1, 0, 0], armL: [-0.9, 0, -0.9], elbowL: [-1.9, 0, 0] };
  const palm = { crouch: 0.35, lean: 0.5, legL: [-1.0, 0, 0], kneeL: [0.6, 0, 0], legR: [0.6, 0, 0], spin: [0, 0.5, 0], chest: [0.3, 0.3, 0], head: [-0.1, -0.2, 0],
    armR: [-1.5, 0, 0.2], elbowR: [-0.05, 0, 0], armL: [-0.5, 0, -0.6], elbowL: [-1.6, 0, 0] };
  ATTACK_POSES.oswinOpenHand = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [{ windup: opened, strike: palm, follow: palm }] };
  // Empty Reign (pass 145): his hands remember the axe. Both clasped high at his left shoulder where its haft lay, his head
  // bowed to them; across at the waist with nothing in them, and back across.
  const remember = { crouch: 0.2, lean: 0.05, legL: [-0.3, 0, 0], legR: [0.45, 0, 0], spin: [0, 0.85, 0], chest: [0.1, 0.3, 0], neck: [0.2, 0, 0], head: [0.3, 0, 0],
    armR: [-2.0, 0, 0.9], elbowR: [-1.3, 0, 0], armL: [-1.7, 0, 0.4], elbowL: [-1.5, 0, 0] };
  const emptyAcross = { crouch: 0.32, lean: 0.25, legL: [-0.6, 0, 0], legR: [0.45, 0, 0], spin: [0, -1.0, 0], chest: [0.15, -0.4, 0], head: [0.05, 0.3, 0],
    armR: [-1.4, 0, -0.9], elbowR: [-0.1, 0, 0], armL: [-1.3, 0, -0.4], elbowL: [-0.3, 0, 0] };
  const emptyBack = { crouch: 0.36, lean: 0.35, legL: [-0.65, 0, 0], legR: [0.45, 0, 0], spin: [0, 0.9, 0], chest: [0.2, 0.4, 0], head: [0.05, -0.3, 0],
    armR: [-1.4, 0, 0.6], elbowR: [-0.1, 0, 0], armL: [-1.4, 0, 0.9], elbowL: [-0.2, 0, 0] };
  ATTACK_POSES.oswinEmptyReign = { ease: heavy, hits: [{ windup: remember, strike: emptyAcross, follow: emptyAcross },
    { windup: { ...emptyAcross, spin: [0, -1.15, 0] }, strike: emptyBack, follow: emptyBack }] };

  // Fists of the Ember: fists drawn up to his chin, hunched; a hook from the left, one from the right, then both fists
  // brought down together into the floor.
  const guard = { crouch: 0.3, lean: 0.3, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], chest: [0.3, 0, 0], head: [-0.15, 0, 0],
    armR: [-1.0, 0, -0.3], elbowR: [-2.0, 0, 0], armL: [-1.0, 0, 0.3], elbowL: [-2.0, 0, 0] };
  const hookL = { ...guard, spin: [0, -0.8, 0], chest: [0.3, -0.35, 0], armL: [-1.5, 0, -0.5], elbowL: [-0.5, 0, 0] };
  const hookR = { ...guard, crouch: 0.36, lean: 0.42, spin: [0, 0.8, 0], chest: [0.3, 0.35, 0], armR: [-1.5, 0, 0.5], elbowR: [-0.5, 0, 0] };
  const fistsHigh = { crouch: 0.1, lean: -0.2, legL: [-0.45, 0, 0], legR: [0.3, 0, 0], chest: [-0.3, 0, 0], head: [-0.2, 0, 0],
    armR: [-2.9, 0, 0.3], elbowR: [-0.8, 0, 0], armL: [-2.9, 0, -0.3], elbowL: [-0.8, 0, 0] };
  const pounded = { crouch: 0.55, lean: 0.7, legL: [-0.9, 0, 0], kneeL: [0.8, 0, 0], legR: [0.6, 0, 0], kneeR: [0.6, 0, 0], chest: [0.5, 0, 0], head: [0.1, 0, 0],
    armR: [-0.9, 0, 0.2], elbowR: [-0.1, 0, 0], armL: [-0.9, 0, -0.2], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.oswinFists = { ease: heavy, hits: [{ windup: guard, strike: hookL, follow: hookL }, { windup: hookL, strike: hookR, follow: hookR },
    { windup: fistsHigh, strike: pounded, follow: pounded }] };
  // Ground Breaker: both hands clasped high over his head, leaning back on his heels; brought down, and the floor breaks
  // in a ring and splits three ways.
  const clasped = { ...fistsHigh, lean: -0.15, chest: [-0.3, 0, 0], head: [-0.3, 0, 0], armR: [-3.0, 0, 0.45], elbowR: [-0.6, 0, 0], armL: [-3.0, 0, -0.45], elbowL: [-0.6, 0, 0] };
  // (pass 145) the clasped hands come down onto you first (parry them), and the ring runs out from where they struck.
  // (his body bowed over his hands, never laid flat along the floor)
  const broken = { ...pounded, lean: 0.4, chest: [0.4, 0, 0] };
  ATTACK_POSES.oswinBreaker = { ease: slam, hits: [{ windup: clasped, strike: broken, follow: broken },
    { windup: broken, strike: { ...broken, crouch: 0.62, lean: 0.45 }, follow: { ...broken, crouch: 0.64, lean: 0.47 } }] };
  // The First Hunger: he drops to one knee, both burning hands raised; drives them into the floor, and again.
  const kneel = { crouch: 0.55, lean: 0.2, legL: [-1.4, 0, 0], kneeL: [1.5, 0, 0], legR: [0.2, 0, 0], kneeR: [1.9, 0, 0], chest: [-0.2, 0, 0], neck: [-0.2, 0, 0], head: [-0.45, 0, 0],
    armR: [-2.6, 0, -0.5], elbowR: [-0.5, 0, 0], armL: [-2.6, 0, 0.5], elbowL: [-0.5, 0, 0] };
  const plunged = { ...kneel, lean: 0.45, chest: [0.35, 0, 0], head: [0.05, 0, 0], armR: [-0.7, 0, 0.1], elbowR: [-0.1, 0, 0], armL: [-0.7, 0, -0.1], elbowL: [-0.1, 0, 0] };
  // (pass 145) the first blow of his hands is onto you (parry it); they stay in the floor while the seams glow, he rears
  // as they burn, and drives them down again.
  const rearing = { ...plunged, lean: 0.25, chest: [0.05, 0, 0], head: [-0.4, 0, 0] };
  ATTACK_POSES.oswinHunger = { ease: slam, hits: [{ windup: kneel, strike: plunged, follow: plunged }, { windup: plunged, strike: rearing, follow: rearing },
    { windup: { ...kneel, armR: [-1.8, 0, -0.4], armL: [-1.8, 0, 0.4] }, strike: plunged, follow: plunged }] };

  // The Backhand (uncrowned): a look over his left shoulder, the right fist cocked across his chest; he comes round with
  // the back of his burning hand.
  const cocked = { crouch: 0.25, legL: [-0.25, 0, 0], legR: [0.35, 0, 0], spin: [0, 0.9, 0], chest: [0.1, 0.35, 0], neck: [0, -0.5, 0], head: [0, -0.9, 0],
    armR: [-1.4, 0, 0.9], elbowR: [-1.7, 0, 0], armL: [-0.7, 0, 0.6], elbowL: [-1.3, 0, 0] };
  const backhand = { crouch: 0.3, lean: 0.15, legL: [-0.35, 0, 0], legR: [0.45, 0, 0], spin: [0, -1.5, 0], chest: [0.1, -0.5, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armR: [-1.5, 0, -1.3], elbowR: [-0.1, 0, 0], armL: [-0.5, 0, 0.4], elbowL: [-1.0, 0, 0] };
  ATTACK_POSES.oswinBackhand = { ease: heavy, hits: [{ windup: cocked, strike: backhand, follow: { ...backhand, spin: [0, -1.75, 0] } }] };

  // (pass 145, tools/body-check.cjs) every follow-through carries his weight on past the blow: a fifth again of the
  // wind-up-to-strike change in his lean, his bend and his turn, where the pose written does not already go further.
  const get = (q, ch, i) => (i == null ? q[ch] || 0 : (q[ch] || [0, 0, 0])[i]);
  const carry = h => {
    const F = { ...h.follow };
    for (const [ch, i] of [['lean'], ['chest', 0], ['chest', 1], ['spin', 1]]) {
      const d = get(h.strike, ch, i) - get(h.windup, ch, i), want = get(h.strike, ch, i) + 0.2 * d;
      if (Math.abs(d) < 0.05 || (get(F, ch, i) - want) * Math.sign(d) >= 0) continue;
      if (i == null) F[ch] = want; else { const v = [...(F[ch] || [0, 0, 0])]; v[i] = want; F[ch] = v; }
    }
    return { ...h, follow: F };
  };
  for (const [id, P] of Object.entries(ATTACK_POSES)) if (/^oswin[A-Z]/.test(id)) P.hits = P.hits.map(carry);

  // Every haft angle above is a `pitch`, the way the axe points; here it becomes the weapon bone's angle.
  for (const [id, P] of Object.entries(ATTACK_POSES)) if (id.startsWith('oswin')) for (const h of P.hits) for (const k of ['windup', 'strike', 'follow']) {
    const q = h[k]; if (!q || !('pitch' in q)) continue;
    const { pitch, ...rest } = q, x = b => (rest[b] ? rest[b][0] : 0);
    h[k] = { ...rest, weapon: [pitch + 0.08 - x('armR') - x('elbowR') - x('chest') - (rest.lean || 0), 0, 0] };
  }
  // In-between keys (pass 145, docs/bosses/system.md 3; `via`, js/attack-anim.js), every one `rel`, from each hit's own key
  // poses (as the Regent's, pass 143): a last hand's breadth of wind before the blow; his hips and chest lead while the axe
  // or his fists trail a beat and then whip through; his weight goes on after it. `toward(a, b, k)`: k of the way from
  // pose a to pose b, per channel, each at most 0.45 rad. Every wind-up reaches its pose fast and then gathers (outCubic).
  const BODY = ['spin', 'chest'], LIMB = ['armR', 'elbowR', 'armL', 'elbowL', 'weapon', 'legL', 'legR', 'kneeL', 'kneeR'];
  const toward = (a, b, k, names) => Object.fromEntries(names.filter(n => a[n] && b[n])
    .map(n => [n, a[n].map((v, i) => Math.max(-0.45, Math.min(0.45, k * (b[n][i] - v))))]));
  const inBetween = h => ({
    windup: [{ t: 0.8, rel: true, crouch: 0.02, ...toward(h.strike, h.windup, 0.08, [...BODY, ...LIMB]) }],
    active: [{ t: 0.6, rel: true, crouch: 0.04, lean: 0.03, ...toward(h.windup, h.strike, 0.3, BODY), ...toward(h.windup, h.strike, -0.25, LIMB) }],
    follow: [{ t: 0.5, rel: true, crouch: 0.05, lean: 0.06, ...toward(h.strike, h.follow, 0.3, [...BODY, ...LIMB]) }],
  });
  for (const [id, P] of Object.entries(ATTACK_POSES)) if (/^oswin[A-Z]/.test(id)) {
    P.ease = { ...P.ease, windup: 'outCubic' };
    P.hits = P.hits.map(h => ({ ...h, via: { ...inBetween(h), ...(h.via || {}) } }));
  }
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const RING = (from, to, width, time) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time } });
  const CRACK = { w: 2.2, h: 0.6, d: 9.5, fwd: 5.5, y: 0.3, ground: true };    // a crack running ahead along the floor: jump or roll it
  const CHOP = { w: 2.0, h: 3.4, d: 5.0, fwd: 3.0, y: 1.4 };
  const WAIST = { w: 7.0, h: 1.6, d: 4.4, fwd: 2.4, y: 1.4 };
  const THRUST = { w: 1.6, h: 1.6, d: 6.4, fwd: 3.8, y: 1.8 };
  const RISE = { w: 3.0, h: 3.6, d: 4.0, fwd: 2.4, y: 1.8 };
  const GRAB = { w: 2.8, h: 2.4, d: 3.2, fwd: 2.0, y: 1.2 };
  const FIST = { w: 3.4, h: 1.8, d: 3.2, fwd: 1.9, y: 1.5 };
  const FIRE = { w: 1, h: 1, d: 1, fwd: 0, y: 0.5 };                          // an eruption's walls stand on the seams (Hitbox.lines)
  const PUNCH = { w: 1.8, h: 1.8, d: 3.4, fwd: 2.0, y: 1.6 };                 // the Sworn Fist, straight through you
  const PALM = { w: 2.2, h: 2.2, d: 4.0, fwd: 2.4, y: 1.5 };                  // the Open Hand
  const BARE = { w: 5.2, h: 1.6, d: 3.4, fwd: 1.9, y: 1.3 };                  // Empty Reign's empty-handed sweeps
  const HAMMER = { w: 2.6, h: 2.4, d: 3.4, fwd: 2.0, y: 1.0 };                // both hands brought down onto you
  const KNEELING = { w: 2.4, h: 1.6, d: 2.8, fwd: 1.6, y: 0.6 };              // ... from one knee
  const OSWIN = {
    id: 'oswin', model: 'oswinFirstCrown', name: 'Oswin, the First Crown',
    description: 'The first king the Ember ever wore, risen from beneath his throne. Every stamp and every blow of his axe cracks the floor open, and the cracks stay open; when he calls on the throne, every one of them stands up as a wall of fire. Fight where the floor is whole. At 40% he casts the axe down and the Ember takes his hands: his burning fists can be parried, but when he spreads his arms to take hold of you, only a roll gets clear.',
    scale: 2.2, bulk: 1.3, radius: 1.0, color: 0x6a5a48, weapon: 'greataxe', idle: 'sway',
    visual: { skin: 0x8c8780, skinMetal: 0.1, metal: 0.4, roughness: 0.7, rim: 0.9 },
    // hp: pass 45 (v7.65.0), a skilled player alone beats him in about a minute (tools/bot-fights.cjs BOTS=1 CLEAN=1);
    // kept until every boss is reworked (Aleix, 2026-11-13).
    hp: 3500, poise: 280, speed: 2.5, turnRate: 3.0, trackRate: 1.5, approach: 0.5, kite: 0.1,
    cooldown: [2.16, 3.96], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 7,
    defaultPhases: ['crowned', 'uncrowned'],
    phases: {
      crowned: { hp: 3500,
        attacks: ['tread', 'headsman', 'threefold', 'sceptre', 'kingsLeap', 'royalProgress', 'turn', 'longLive', 'leapPunish'] },
      // Past the worst of his hurt: the axe cast down, the Ember in his hands.
      uncrowned: { at: 0.4, name: 'Oswin, Uncrowned', opener: 'crownCastDown', conceal: ['weapon'], ignite: true,
        cooldown: [2.4, 4.0], approach: 0.75, kite: 0, speed: 3.2, trackRate: 1.9,
        attacks: ['crownCastDown', 'kingsHold', 'emberFists', 'emptyReign', 'groundBreaker', 'swornFist', 'openHand', 'firstHunger', 'fistPunish', 'backhand'] },
    },
    attacks: [
      // ---- crowned ------------------------------------------------------------------------------------------------------
      // The King's Tread: the knee lifted high, the foot thrown down; the floor splits ahead of him and stays split.
      { id: 'tread', name: 'The King\'s Tread', anim: 'stomp', pose: 'oswinTread', noParry: true, tracking: { rate: 2.0, commit: 0.55 }, chance: 0.6,
        hits: [{ tell: 'footR', startup: 0.95, active: 0.2, follow: 0.25, seam: { from: 1.4, len: 9 }, impact: { ring: 2.6, crack: 1.8, dust: 16, shake: 0.14 } }], recovery: 1.5,
        followUps: [{ attack: 'threefold', if: 'near', chance: 0.22 }, { attack: 'headsman', chance: 0.17 }],
        damage: 26, poise: 45, knock: 7, lunge: 0, range: 9, box: CRACK },
      // The Headsman's Fall: the axe straight up over his head, held; straight down, and the floor splits on from the bit.
      { id: 'headsman', name: 'The Headsman\'s Fall', anim: 'chop', pose: 'oswinHeadsman', tracking: { rate: 2.0, commit: 0.65 }, markers: glint(0), chance: 0.7,
        hits: [{ startup: 1.3, active: 0.16, follow: 0.4, hold: { at: 0.6, time: [0.2, 0.8], chance: 0.3 }, seam: { from: 3.0, len: 6 },
                 impact: { ring: 2.4, crack: 2.0, dust: 16, shake: 0.16 } }], recovery: 3.4,
        damage: 44, heavy: true, poise: 75, knock: 9, lunge: 1.0, range: 5.2, box: CHOP },
      // Threefold Reign: across at the waist, back across, then heaved up and down into the floor ahead. (pass 145) The axe's
      // blows, all three parried.
      { id: 'threefold', name: 'Threefold Reign', anim: 'sweep', pose: 'oswinThreefold', tracking: { rate: 2.6, commit: 0.65 }, markers: glint(0, 1, 2), chance: 0.6,
        hits: [{ startup: 1.05, active: 0.16, follow: 0.85 },
               { startup: 0.55, active: 0.16, follow: 0.87, step: { from: 0.2, speed: 3, side: 0 } },
               { startup: 0.95, active: 0.16, follow: 0.45, box: CHOP, seam: { from: 3.0, len: 6 }, impact: { ring: 2.4, crack: 1.8, dust: 14, shake: 0.14 } }], recovery: 3.2,
        damage: 30, poise: 50, knock: 7, lunge: 1.4, range: 4.4, box: WAIST },
      // The Sceptre's Reach: the crowned butt driven straight out at you; then the head brought round and up through you.
      { id: 'sceptre', name: 'The Sceptre\'s Reach', anim: 'thrust', pose: 'oswinSceptre', tracking: { rate: 2.8, commit: 0.7 }, markers: glint(0), chance: 0.5, minRange: 3,
        hits: [{ startup: 1.0, active: 0.14, follow: 0.55 },
               { startup: 0.7, active: 0.16, follow: 0.35, box: RISE }], recovery: 2.16,
        damage: 32, poise: 55, knock: 8, lunge: 2.6, range: 7.0, box: THRUST },
      // The King's Leap: from afar, a deep crouch with the axe trailing; down onto you, and the floor splits three ways.
      // (pass 145) The axe is parried as it lands; its cracks are still jumped.
      { id: 'kingsLeap', name: 'The King\'s Leap', anim: 'chop', pose: 'oswinLeap', tracking: { rate: 2.2, commit: 0.45 }, markers: glint(0), minRange: 6, chance: 0.5,
        hits: [{ startup: 1.4, active: 0.16, follow: 0.5, leap: { from: 0.35, max: 15, short: 2.4 }, seam: { from: 2.0, len: 7, spread: [-0.55, 0, 0.55] },
                 impact: { ring: 4.5, crack: 2.6, dust: 26, shake: 0.22 } }], recovery: 3.24,
        damage: 48, heavy: true, poise: 85, knock: 10, lunge: 0, range: 15, box: { w: 3.0, h: 3.0, d: 4.6, fwd: 2.4, y: 1.2 } },
      // The Royal Progress (pass 145): his hand raised palm out, the axe dragged at his side; up through you, down across
      // you (parry both), then the foot thrown down and the floor split ahead (jump or roll the crack). Back off after the
      // cuts and the sceptre reaches for you; get behind him and he turns.
      { id: 'royalProgress', name: 'The Royal Progress', anim: 'sweep', pose: 'oswinProgress', tracking: { rate: 2.4, commit: 0.45 }, markers: glint(0, 1), chance: 0.6,
        hits: [{ startup: 1.15, active: 0.16, follow: 0.4, hold: { at: 0.6, time: [0.2, 0.6], chance: 0.35 }, box: RISE },
               { startup: 0.6, active: 0.16, follow: 0.45, step: { from: 0.2, speed: 3, side: 0 }, box: CHOP },
               { tell: 'footR', startup: 0.8, active: 0.2, follow: 0.3, noParry: true, damage: 24, box: CRACK, seam: { from: 1.4, len: 9 }, impact: { ring: 2.6, crack: 1.8, dust: 16, shake: 0.14 } }],
        recovery: 2.2, followUps: [{ attack: 'sceptre', if: 'far', chance: 0.35 }, { attack: 'turn', if: 'behind', chance: 0.45 }],
        damage: 30, poise: 50, knock: 7, lunge: 1.6, range: 4.4, box: CHOP },
      // The Turn: behind him, a look over his shoulder; the axe comes round with him.
      { id: 'turn', name: 'The Turn', anim: 'sweep', pose: 'oswinTurn', when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 3,
        hits: [{ startup: 0.75, active: 0.18, follow: 0.3 }], recovery: 1.8,
        damage: 28, poise: 45, knock: 8, lunge: 0, range: 4.6, box: { w: 6.4, h: 2.0, d: 6.4, fwd: -0.4, y: 1.3 } },
      // Long Live the King: with three seams or more open, the haft driven into the floor at his feet; then his head thrown
      // back, and every open seam stands up as a wall of fire. Stand where the floor is whole.
      { id: 'longLive', name: 'Long Live the King', anim: 'stomp', pose: 'oswinLongLive', noParry: true, when: 'seamed', tracking: { rate: 1.6, commit: 0.4 }, chance: 0.25,
        hits: [{ startup: 0.9, active: 0.25, follow: 0.8, box: RING(0.6, 3.6, 1.2, 0.25), impact: { ring: 3.0, crack: 1.4, dust: 14, shake: 0.12 } },
               { startup: 1.25, active: 0.45, follow: 0.4, erupt: true, box: FIRE, damage: 40 }], recovery: 3.24,
        damage: 22, heavy: true, poise: 60, knock: 9, lunge: 0, range: 40, box: RING(0.6, 3.6, 1.2, 0.25) },
      // Drinking where he can see it: the leap, sooner (parried as it lands, as the leap).
      { id: 'leapPunish', name: 'The King\'s Leap', anim: 'chop', pose: 'oswinLeap', when: 'healing', tracking: { rate: 2.6, commit: 0.5 }, markers: glint(0), minRange: 4, chance: 3,
        hits: [{ startup: 1.0, active: 0.16, follow: 0.5, leap: { from: 0.3, max: 15, short: 2.4 }, seam: { from: 2.0, len: 7 }, impact: { ring: 4.0, crack: 2.4, dust: 22, shake: 0.2 } }],
        recovery: 2.88, damage: 44, heavy: true, poise: 80, knock: 10, lunge: 0, range: 15, box: { w: 3.0, h: 3.0, d: 4.6, fwd: 2.4, y: 1.2 } },

      // ---- the change -----------------------------------------------------------------------------------------------------
      // The Crown Cast Down (the phase opener): the axe held high, then hurled down into the floor: a ring, and the floor
      // splits four ways from where it fell. He cannot be hurt through it (as every boss's change). The axe is gone after.
      { id: 'crownCastDown', name: 'The Crown Cast Down', anim: 'chop', pose: 'oswinCastDown', noParry: true, rollOnly: true, invulnerable: true, tracking: { rate: 1.2, commit: 0.4 }, chance: 0,   // only as the phase's opener
        hits: [{ startup: 1.8, active: 0.4, follow: 0.5, box: RING(0.6, 7.5, 1.4, 0.4), seam: { from: 1.5, len: 8, spread: [-2.36, -0.79, 0.79, 2.36] },
                 impact: { ring: 5.0, crack: 2.8, dust: 32, shake: 0.24 } }], recovery: 2.16,
        damage: 30, heavy: true, poise: 60, knock: 11, lunge: 0, range: 7, box: RING(0.6, 7.5, 1.4, 0.4) },

      // ---- uncrowned ------------------------------------------------------------------------------------------------------
      // The King's Hold: arms spread wide, a lunge, and they close. Roll it.
      { id: 'kingsHold', name: 'The King\'s Hold', anim: 'bash', pose: 'oswinHold', noParry: true, rollOnly: true, tracking: { rate: 2.6, commit: 0.6 }, chance: 0.35,
        hits: [{ tell: 'fistR', startup: 1.0, active: 0.18, follow: 0.6 }], recovery: 3.8,
        damage: 56, heavy: true, poise: 90, knock: 12, lunge: 4.5, range: 5, box: GRAB },
      // Fists of the Ember: a hook from the left, one from the right, both fists into the floor; it splits ahead.
      { id: 'emberFists', name: 'Fists of the Ember', anim: 'sweep', pose: 'oswinFists', tracking: { rate: 3.0, commit: 0.7 }, markers: glint(0, 1, 2), chance: 0.7,
        hits: [{ tell: 'fistL', startup: 0.75, active: 0.14, follow: 0.71, step: { from: 0.3, speed: 3.5, side: 0 } },
               { tell: 'fistR', startup: 0.42, active: 0.14, follow: 0.75, step: { from: 0.1, speed: 3.5, side: 0 } },
               { tell: 'fistR', startup: 0.85, active: 0.16, follow: 0.45, box: { w: 2.6, h: 2.0, d: 3.6, fwd: 2.0, y: 0.9 }, seam: { from: 2.2, len: 6 },
                 impact: { ring: 2.6, crack: 1.8, dust: 16, shake: 0.14 } }], recovery: 2.8,
        damage: 24, poise: 40, knock: 6, lunge: 1.4, range: 3.8, box: FIST },
      // Empty Reign (pass 145): his hands remember the axe. Clasped at his shoulder where it lay; across at the waist, back
      // across, both parried. Stay close after it and he reaches to take hold of you; back off and the Sworn Fist comes.
      { id: 'emptyReign', name: 'Empty Reign', anim: 'sweep', pose: 'oswinEmptyReign', tracking: { rate: 2.6, commit: 0.65 }, markers: glint(0, 1), chance: 0.6,
        hits: [{ tell: 'fistR', startup: 1.0, active: 0.16, follow: 0.5, hold: { at: 0.55, time: [0.25, 0.7], chance: 0.4 } },
               { tell: 'fistL', startup: 0.55, active: 0.16, follow: 0.45, step: { from: 0.2, speed: 3, side: 0 } }], recovery: 2.4,
        followUps: [{ attack: 'kingsHold', if: 'near', chance: 0.3 }, { attack: 'swornFist', if: 'far', chance: 0.35 }],
        damage: 26, poise: 45, knock: 7, lunge: 1.4, range: 3.8, box: BARE },
      // Ground Breaker: both hands clasped high, then down onto you (pass 145: parry them), and from where they struck a ring
      // runs out along the floor (jump it) and three seams from him.
      { id: 'groundBreaker', name: 'Ground Breaker', anim: 'stomp', pose: 'oswinBreaker', tracking: { rate: 1.8, commit: 0.5 }, markers: glint(0), chance: 0.5,
        hits: [{ tell: 'fistR', startup: 1.15, active: 0.16, follow: 0.3, box: HAMMER, damage: 30 },
               { tell: 'fistR', startup: 0.45, active: 0.35, follow: 0.4, noParry: true, seam: { from: 1.6, len: 7, spread: [-2.1, 0, 2.1] }, impact: { ring: 5.5, crack: 2.4, dust: 26, shake: 0.2 } }], recovery: 3.0,
        damage: 32, poise: 55, knock: 9, lunge: 0, range: 8, box: RING(0.8, 9, 1.8, 0.35) },
      // The Sworn Fist (pass 145): a runner's crouch, the fist drawn back by his ear; he springs and drives it through you.
      // Parry it.
      { id: 'swornFist', name: 'The Sworn Fist', anim: 'thrust', pose: 'oswinSwornFist', tracking: { rate: 2.4, commit: 0.45 }, markers: glint(0), minRange: 5, chance: 0.5,
        hits: [{ tell: 'fistR', startup: 1.05, active: 0.16, follow: 0.5, leap: { from: 0.45, max: 11, short: 1.6 } }], recovery: 2.6,
        damage: 42, heavy: true, poise: 75, knock: 10, lunge: 0, range: 11, box: PUNCH },
      // The Open Hand (pass 145): his burning hand held low behind him, open, the other on his heart; the palm comes up
      // into you and the Ember spills from it. It may wait. Parry it.
      { id: 'openHand', name: 'The Open Hand', anim: 'thrust', pose: 'oswinOpenHand', tracking: { rate: 2.8, commit: 0.7 }, markers: glint(0), chance: 0.55,
        hits: [{ tell: 'fistR', startup: 1.1, active: 0.16, follow: 0.45, hold: { at: 0.6, time: [0.3, 0.9], chance: 0.5 }, impact: { ring: 1.6, crack: 0, dust: 10, shake: 0.1 } }], recovery: 2.0,
        damage: 34, poise: 55, knock: 9, lunge: 2.4, range: 4.6, box: PALM },
      // The First Hunger: on one knee, both hands driven down onto you (pass 145: parry them) and into the floor; they stay
      // there while every open seam glows, and it burns; he drives them down again and it burns again.
      { id: 'firstHunger', name: 'The First Hunger', anim: 'stomp', pose: 'oswinHunger', when: 'seamed', tracking: { rate: 1.4, commit: 0.4 }, markers: glint(0), chance: 0.15,
        hits: [{ tell: 'fistR', startup: 1.1, active: 0.16, follow: 0.2, box: KNEELING, damage: 30, impact: { ring: 2.0, crack: 0.8, dust: 10, shake: 0.12 } },
               { tell: 'fistR', startup: 1.1, active: 0.4, follow: 0.9, erupt: { keep: true }, box: FIRE },
               { tell: 'fistR', startup: 0.85, active: 0.4, follow: 0.5, erupt: true, box: FIRE }], recovery: 3.4,
        damage: 36, heavy: true, poise: 60, knock: 9, lunge: 0, range: 40, box: FIRE },
      // The Backhand: behind him, a look over his shoulder; the back of his burning hand comes round with him.
      { id: 'backhand', name: 'The Backhand', anim: 'sweep', pose: 'oswinBackhand', when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 3,
        hits: [{ tell: 'fistR', startup: 0.6, active: 0.16, follow: 0.3 }], recovery: 1.62,
        damage: 24, poise: 40, knock: 8, lunge: 0, range: 4.0, box: { w: 5.6, h: 2.0, d: 5.6, fwd: -0.3, y: 1.4 } },
      // Drinking where he can see it: the Sworn Fist, sooner and from nearer (pass 145: no longer a grab).
      { id: 'fistPunish', name: 'The Sworn Fist', anim: 'thrust', pose: 'oswinSwornFist', when: 'healing', tracking: { rate: 3.0, commit: 0.5 }, markers: glint(0), minRange: 3, chance: 3,
        hits: [{ tell: 'fistR', startup: 0.75, active: 0.16, follow: 0.5, leap: { from: 0.4, max: 11, short: 1.6 } }], recovery: 2.4,
        damage: 40, heavy: true, poise: 75, knock: 10, lunge: 0, range: 11, box: PUNCH },
    ],
  };
  ENEMY_DEFS.push(OSWIN); ENEMY_BY_ID[OSWIN.id] = OSWIN;
}
