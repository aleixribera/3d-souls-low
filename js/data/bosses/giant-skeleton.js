'use strict';
// ============================================================================
// The Giant Skeleton (v7.45.0 figure; his own fight since pass 72), the boss of Level 1, js/levels/long-hall.js (STORY.md)
// ============================================================================
// The gaol's dead, made one. Those who died in the Long Hall's cells went down the pit at the hall's end, and the heat
// that leaks up from the Ember under the castle stood their bones up again as one giant, with the gaol still on them: iron
// cuffs on its wrists, a broken chain at its ankle. It keeps the hall's last gate and does what the gaol did to them: it
// takes the living and holds them. Its long left hand is a cell. It closes on you (a hit's `seize`, Player.seize), lifts
// you to the skull, and the white heat in its spine breathes on you while you struggle (strike or roll, again and again)
// to tear loose; a blow that breaks its posture opens the hand too. The rest is a gaoler's club and that hand: a sweep and
// a raking claw to parry, a slam and a stomp to roll. At half its strength it drives both hands into the floor and the pit
// gives it more of its dead: the heat fills its ribs (`reveal`), and it leaps on you hand first, wheels the club round, and
// walks you down with stamps.
//
// Every wind-up is its own, and glows on what strikes (the club, the claw or the raised foot: `tells`). The club hauled
// back low behind its right hip, the skull turned to you over its left shoulder (the sweep); one knee raised to its hip,
// both arms spread, the skull looking down between its feet (the stomp); the long claw drawn up over its left shoulder,
// fingers spread (the claw); the club raised high on the right while the claw points at you (the slam); crouched and
// twisted to its left, the open hand held out wide and low at its left (the taking); the club cocked
// across its chest to the left (club and claw). Gathered: both hands raised high and driven into the floor (the gathering);
// crouched on its haunches, the claw stretched back (the reaching hand); the club held straight out to its right, coiled
// left (the bonewheel); stamping forward, foot over foot (pit stomps).

// ---- its figure: built in Blender (tools/blender/giant.py), one piece per bone -----------------------------------------
// A spectral giant: a huge domed skull hung low before the chest on a long neck, a crack over the crown and the jaw
// hanging open; a barrel of ribs (three snapped) on a spine that burns white (`core`); long knuckled bones, a long clawed
// left hand, a fist of bone round the club. Pass 72: the gaol on it (iron cuffs and broken chain), and the heat that fills
// its ribs once it is gathered (`heat`, hidden until the second phase reveals it). Pass 74: the gaol made heavy enough to
// read in the fight: a manacle on the claw with a broken chain about 1.2 m long that swings from it (`chainClaw`, a
// `hang`), and an iron collar whose chain lies down its back; the skulls of four of the other dead fused into its pelvis,
// shoulders and back, and its club built with it: a great thigh bone bound in gaol iron, cell nails through its knuckles and
// another skull fused to its end.
MODEL_DEFS.giantSkeleton = {
  extends: 'hollowBase', faction: 'oldbones', budget: 'boss', fit: 1.04, limbSides: 8, rim: 2.4,
  proportions: { shoulderX: 0.34, torsoW: 0.16, torsoD: 0.12, armR: 0.072, legR: 0.08, headR: 0.29, handR: 0.06, footLen: 0.32 },
  limbs: { armL: { len: 1.3, thick: 1.15 }, legL: { thick: 1.15 } },
  // v7.45.0: neck 0.9 -> 0.75, head -0.45 -> -0.95, so the skull's face looks down at the player, not at the floor
  posture: { chest: [0.55, 0, 0.04], neck: [0.75, 0, -0.06], head: [-0.95, 0, 0.1], elbowL: [-0.25, 0, 0], elbowR: [-0.3, 0, 0] },
  materials: {
    bone: { tex: 'spectralBone', tint: 0xd8dde6, decay: 0.55, size: 512 },
    dark: { tex: 'spectralBone', tint: 0xaab0bc, decay: 0.8 },
    void: { tex: 'ashSoot', tint: 0x181a20, decay: 0.4 },
    iron: { tex: 'rustedIron', tint: 0x5a524c, decay: 0.85, rim: 0.25 },
    core: { glow: 0xe8eeff },
    heat: { glow: 0xffb060 },
    eye: { glow: 0xc8d8ff },
  },
  bones: { chainClaw: { parent: 'elbowL', at: [0.088, -0.36, 0.004] } },   // the claw's chain hangs plumb from its manacle's ring
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    head: ['bone', 'bone.1', 'bone.2', 'void', 'core', 'dark'], neck: ['core', 'dark', 'iron'],
    chest: ['core', 'dark', 'dark.1', 'bone', 'bone.1', 'bone.2', 'bone.3', 'void', 'heat'], spin: ['bone', 'bone.1', 'bone.2', 'bone.3', 'void'],
    armL: ['bone'], armR: ['bone'], elbowL: ['bone', 'bone.1', 'iron'], elbowR: ['bone', 'bone.1', 'iron'],
    legL: ['bone'], legR: ['bone'], kneeL: ['bone', 'bone.1', 'iron'], kneeR: ['bone', 'bone.1'], chainClaw: ['iron'],
    weapon: ['bone', 'bone.1', 'void', 'iron'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `giant:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42,
    ...(bone === 'weapon' ? { weapon: true } : {}) }))),
  weapon: null,            // pass 74: its club is part of the figure (the `weapon: true` pieces above): a gaol-ironed thigh bone
  weaponRest: 0.5,         // the club's head on the floor, not sunk in it
  hidden: ['heat'],        // the heat in its ribs: shown by the gathered phase's `reveal`
  // Where a blow that is not the club's shows its wind-up glow (a hit's `tell`): the claw, and each foot.
  tells: { claw: { bone: 'elbowL', at: [0, -0.5, 0.02] }, footL: { bone: 'kneeL', at: [0, -0.38, 0.06] }, footR: { bone: 'kneeR', at: [0, -0.38, 0.06] } },
  eyes: { color: 0xff9a48, size: 0.02, spread: 0.105, at: [0, 0.265, 0.19] },   // pass 74: embers deep in the sockets (the heat that raised it), not white discs
  aura: { color: 0xcfdcff, size: 3.6, opacity: 0.16 },
  anim: {
    idle: { breathRate: 0.6, breath: 0.02, headDrift: 0.1, sway: 0.025, twitch: 0 }, walk: { twist: 0.12, roll: 0.06, headNod: 0.07, elbow: 0.3, drag: 0.35 },
    flinch: { head: 0.4, chest: 0.4, arms: 0.4 }, death: { buckle: 1.2, slump: 1 },
    cloth: [],   // no loincloth (its own `bones` replace hollowBase's loin bones)
    hang: [{ bone: 'chainClaw', k: 14, damp: 1.6, gain: 0.06 }],   // a heavy chain about 1.2 m long: slow, wide swings
  },
};

// ---- key poses (js/data/attack-poses.js format; added to its hunched rest: chest .55 forward, the skull hung low) ------
// The club is in the right fist (`weapon`: + tips it forward and down); the long claw is the left arm.
{
  const heavy = { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' };   // a weight that gathers, then falls
  const swing = { windup: 'inOutCubic', active: 'outCubic', follow: 'outQuad', recovery: 'inOutCubic' };

  // Club Sweep: the club hauled back low behind its right hip, its back half turned, the skull on you over its left
  // shoulder; swung flat across at your hips, and the weight carries it round to its left.
  const hauled = { crouch: 0.2, lean: 0.05, legL: [-0.4, 0, 0], legR: [0.4, 0, 0], spin: [0, -1.0, 0], chest: [-0.2, -0.35, 0], neck: [0, 0.45, 0], head: [0.1, 0.6, 0],
    armR: [0.55, 0, -0.75], elbowR: [-0.2, 0, 0], weapon: [0.9, 0, 0.6], armL: [-0.9, 0, 0.6], elbowL: [-0.5, 0, 0] };
  const swept = { crouch: 0.22, lean: 0.12, legL: [-0.5, 0, -0.08], legR: [0.35, 0, 0.1], spin: [0, 0.9, 0], chest: [0.0, 0.45, 0], neck: [0, -0.3, 0], head: [0, -0.4, 0],
    armR: [-1.45, 0, 0.95], elbowR: [0.05, 0, 0], weapon: [0.6, 0, -0.5], armL: [0.2, 0, 0.5], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.giantSweep = { ease: { ...swing, active: 'inOutSine' }, lag: { weapon: 0.1 },
    hits: [{ windup: hauled, strike: swept, follow: { ...swept, crouch: 0.26, spin: [0, 1.2, 0], armR: [-1.1, 0, 1.2], weapon: [0.8, 0, -0.6] } }] };

  // Stomp: one knee raised to its hip, both arms spread for balance, the skull bowed to look down between its feet; the foot
  // comes down and the floor jumps.
  const footUp = { crouch: 0.0, lean: -0.1, legL: [-2.2, 0, 0.1], kneeL: [1.9, 0, 0], legR: [0.1, 0, -0.08], chest: [-0.2, 0, 0], neck: [0.1, 0, 0], head: [0.35, 0, 0],
    armR: [-0.6, 0, -1.1], elbowR: [-0.4, 0, 0], weapon: [0.3, 0, 0.2], armL: [-0.6, 0, 1.1], elbowL: [-0.4, 0, 0] };
  const stamped = { crouch: 0.16, lean: 0.06, legL: [-0.45, 0, 0], kneeL: [0.25, 0, 0], legR: [0.3, 0, 0], chest: [0.05, 0, 0], neck: [0.1, 0, 0], head: [0.2, 0, 0],
    armR: [-0.3, 0, -0.5], elbowR: [-0.2, 0, 0], weapon: [0.5, 0, 0], armL: [-0.3, 0, 0.5], elbowL: [-0.2, 0, 0] };
  ATTACK_POSES.giantStomp = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' },
    hits: [{ windup: footUp, strike: stamped, follow: { ...stamped, crouch: 0.2 } }] };

  // The Long Claw: the claw drawn up over its left shoulder, fingers spread, its body turned to its left; raked down and
  // across before it to its right knee.
  const clawUp = { crouch: 0.12, lean: -0.05, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], spin: [0, 0.7, 0], chest: [-0.3, 0.35, 0], neck: [0, -0.3, 0], head: [0, -0.35, 0],
    armL: [-2.6, 0, 0.7], elbowL: [-0.9, 0, 0], armR: [-0.3, 0, -0.35], elbowR: [-0.3, 0, 0], weapon: [0.4, 0, 0] };
  const raked = { crouch: 0.26, lean: 0.25, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, -0.6, 0], chest: [0.15, -0.35, 0], neck: [0, 0.3, 0], head: [0, 0.3, 0],
    armL: [-0.7, 0, -0.75], elbowL: [-0.1, 0, 0], armR: [-0.2, 0, -0.5], elbowR: [-0.2, 0, 0], weapon: [0.5, 0, 0] };
  ATTACK_POSES.giantClaw = { ease: swing, lag: { armL: 0.04, elbowL: 0.08 },
    hits: [{ windup: clawUp, strike: raked, follow: { ...raked, crouch: 0.3, spin: [0, -0.8, 0], armL: [-0.4, 0, -0.9] } }] };

  // Gaol Slam: the club raised high over its right shoulder, the claw stretched out at you to take its aim; held; brought
  // down into the floor ahead with all its weight behind it.
  const clubHigh = { crouch: 0.06, lean: -0.2, legL: [-0.4, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.35, 0], chest: [-0.45, -0.2, 0], neck: [0, 0, 0], head: [0.1, 0.15, 0],
    armR: [-2.9, 0, -0.35], elbowR: [-0.6, 0, 0], weapon: [-0.7, 0, 0], armL: [-1.5, 0, 0.1], elbowL: [-0.1, 0, 0] };
  const slammed = { crouch: 0.34, lean: 0.35, legL: [-0.75, 0, 0], kneeL: [0.4, 0, 0], legR: [0.5, 0, 0], spin: [0, 0.2, 0], chest: [0.35, 0.1, 0], neck: [-0.1, 0, 0], head: [-0.1, 0, 0],
    armR: [-1.1, 0, 0.05], elbowR: [0, 0, 0], weapon: [1.1, 0, 0], armL: [-0.2, 0, 0.5], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.giantSlam = { ease: heavy, lag: { weapon: 0.08 },
    hits: [{ windup: clubHigh, strike: slammed, follow: { ...slammed, crouch: 0.38 } }] };

  // The Taking: crouched and twisted to its left, the open claw held out wide and low at its left, the skull lowered at
  // you; the hand scoops forward low across the floor and closes; it straightens and lifts you up before its skull (where
  // the grip's `at` holds you), the jaw at you; then it flings you down.
  const reachBack = { crouch: 0.4, lean: 0.25, legL: [-0.3, 0, -0.1], kneeL: [0.4, 0, 0], legR: [0.55, 0, 0.1], kneeR: [0.4, 0, 0], spin: [0, 0.9, 0], chest: [0.05, 0.35, 0], neck: [0, -0.4, 0], head: [0.1, -0.5, 0],
    armL: [-0.35, 0, 1.0], elbowL: [-0.35, 0, 0], armR: [-0.5, 0, -0.4], elbowR: [-0.5, 0, 0], weapon: [0.6, 0, 0] };
  const scooped = { crouch: 0.3, lean: 0.25, legL: [-0.75, 0, 0], kneeL: [0.5, 0, 0], legR: [0.45, 0, 0], kneeR: [0.3, 0, 0], spin: [0, -0.15, 0], chest: [0.05, -0.1, 0], neck: [-0.1, 0, 0], head: [0, 0, 0],
    armL: [-0.95, 0, -0.15], elbowL: [-0.1, 0, 0], armR: [-0.4, 0, -0.5], elbowR: [-0.4, 0, 0], weapon: [0.6, 0, 0] };
  const lifted = { crouch: 0.12, lean: -0.05, legL: [-0.3, 0, -0.08], legR: [0.25, 0, 0.08], spin: [0, 0.1, 0], chest: [-0.35, 0.05, 0], neck: [-0.15, 0, 0], head: [0.2, -0.1, 0],
    armL: [-1.45, 0, -0.3], elbowL: [-0.6, 0, 0], armR: [-0.5, 0, -0.45], elbowR: [-0.6, 0, 0], weapon: [0.5, 0, 0] };
  ATTACK_POSES.giantTaking = { ease: { windup: 'inOutSine', active: 'outCubic', follow: 'outExpo', recovery: 'inOutCubic' }, lag: { armL: 0.04, elbowL: 0.06 },
    hits: [{ windup: reachBack, strike: scooped, follow: lifted }] };

  // Club and Claw: the club cocked across its chest to its left; a backhand out to its right (parry it); the claw raked
  // across from its left (parry it); then the club high over its right shoulder and down (roll it).
  const cocked = { crouch: 0.15, lean: 0.0, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], spin: [0, 0.8, 0], chest: [-0.2, 0.4, 0], neck: [0, -0.35, 0], head: [0, -0.4, 0],
    armR: [-1.3, 0, 1.15], elbowR: [-1.0, 0, 0], weapon: [0.2, 0, 0.8], armL: [-0.5, 0, 0.5], elbowL: [-0.5, 0, 0] };
  const backhanded = { crouch: 0.22, lean: 0.12, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.8, 0], chest: [0.05, -0.45, 0], neck: [0, 0.35, 0], head: [0, 0.4, 0],
    armR: [-1.4, 0, -0.9], elbowR: [0, 0, 0], weapon: [1.3, 0, 0.3], armL: [-0.6, 0, 0.6], elbowL: [-0.5, 0, 0] };
  ATTACK_POSES.giantClubClaw = { ease: swing, lag: { weapon: 0.08, armL: 0.03 },
    hits: [{ windup: cocked, strike: backhanded, follow: backhanded },
      { windup: { ...clawUp, spin: [0, 0.2, 0] }, strike: raked, follow: raked },
      { windup: clubHigh, strike: slammed, follow: { ...slammed, crouch: 0.38 } }] };

  // ---- gathered (second phase) ----
  // The Gathering (the phase opener): both hands raised high over its skull; driven down into the floor before it, and the
  // pit's dead come up round it.
  const handsHigh = { crouch: 0.05, lean: -0.3, legL: [-0.3, 0, -0.15], legR: [0.25, 0, 0.15], chest: [-0.6, 0, 0], neck: [-0.2, 0, 0], head: [-0.1, 0, 0],
    armR: [-2.9, 0, -0.3], elbowR: [-0.3, 0, 0], weapon: [-0.4, 0, 0], armL: [-2.9, 0, 0.3], elbowL: [-0.3, 0, 0] };
  const driven = { crouch: 0.55, lean: 0.55, legL: [-0.7, 0, -0.15], kneeL: [0.7, 0, 0], legR: [0.5, 0, 0.15], kneeR: [0.6, 0, 0], chest: [0.45, 0, 0], neck: [-0.2, 0, 0], head: [-0.15, 0, 0],
    armR: [-1.0, 0, -0.2], elbowR: [0, 0, 0], weapon: [1.2, 0, 0], armL: [-0.75, 0, 0.2], elbowL: [0, 0, 0] };
  ATTACK_POSES.giantGathering = { ease: heavy, lag: { weapon: 0.08 },
    hits: [{ windup: handsHigh, strike: driven, follow: { ...driven, crouch: 0.6 } }] };

  // The Reaching Hand: crouched on its haunches, the claw stretched back behind it; it leaps and comes down hand first on
  // you, closes it, and lifts you up as in the taking.
  const haunches = { crouch: 0.6, lean: 0.4, legL: [-0.9, 0, 0], kneeL: [0.9, 0, 0], legR: [0.5, 0, 0], kneeR: [0.8, 0, 0], spin: [0, 0.4, 0], chest: [0.25, 0.2, 0], neck: [-0.35, 0, 0], head: [-0.2, -0.2, 0],
    armL: [0.9, 0, 0.35], elbowL: [-0.1, 0, 0], armR: [0.3, 0, -0.4], elbowR: [-0.3, 0, 0], weapon: [0.5, 0, 0] };
  // landing: the claw driven straight down at you from the leap, fingers splayed on the floor, the club flung back for balance
  const handDown = { crouch: 0.38, lean: 0.45, legL: [-0.85, 0, -0.1], kneeL: [0.7, 0, 0], legR: [0.6, 0, 0.1], kneeR: [0.5, 0, 0], spin: [0, 0.25, 0], chest: [0.15, 0.15, 0], neck: [-0.25, 0, 0], head: [-0.1, -0.15, 0],
    armL: [-1.15, 0, 0.05], elbowL: [0, 0, 0], armR: [0.6, 0, -0.7], elbowR: [-0.2, 0, 0], weapon: [0.2, 0, 0] };
  ATTACK_POSES.giantReach = { ease: { windup: 'inOutSine', active: 'outCubic', follow: 'outExpo', recovery: 'inOutCubic' }, lag: { armL: 0.04 },
    hits: [{ windup: haunches, strike: handDown, follow: lifted }] };

  // The Bonewheel: the club held straight out to its right, its body coiled to its left; whirled round twice.
  const coiled = { crouch: 0.25, spin: [0, -1.2, 0], chest: [-0.15, -0.35, 0], neck: [0, 0.5, 0], head: [0, 0.6, 0], armR: [-1.4, 0, -1.2], elbowR: [0, 0, 0], weapon: [0.9, 0, 0],
    armL: [-0.6, 0, 0.9], elbowL: [-0.3, 0, 0] };
  const whirled = { crouch: 0.28, lean: 0.1, spin: [0, 2.5, 0], chest: [-0.1, 0.3, 0], neck: [0, -0.2, 0], head: [0, -0.2, 0], armR: [-1.45, 0, -1.25], elbowR: [0, 0, 0], weapon: [0.9, 0, 0],
    armL: [-0.6, 0, 0.95], elbowL: [-0.3, 0, 0] };
  const whirled2 = { ...whirled, spin: [0, 5.6, 0] };
  ATTACK_POSES.giantWheel = { ease: { windup: 'inOutCubic', active: 'linear', follow: 'outCubic', recovery: 'inOutSine' }, lag: { weapon: 0.04, armR: 0.03 },
    hits: [{ windup: coiled, strike: whirled, follow: whirled }, { windup: whirled, strike: whirled2, follow: { ...whirled2, spin: [0, 6.1, 0] } }] };

  // Pit Stomps: a march, not a stomp. It hunches toward you with its skull up and its club dragged behind, and walks you
  // down right, left, right; the third stamp with both arms flung down. Stomp alone stands tall on its left foot.
  const marchR = { crouch: 0.12, lean: 0.35, legL: [0.2, 0, -0.08], kneeL: [0.15, 0, 0], legR: [-1.7, 0, -0.1], kneeR: [1.7, 0, 0], chest: [0.1, 0, 0], neck: [-0.2, 0, 0],
    head: [-0.35, 0, 0], armR: [0.7, 0, -0.35], elbowR: [-0.1, 0, 0], weapon: [1.1, 0, 0.1], armL: [-0.5, 0, 0.9], elbowL: [-0.5, 0, 0] };
  const marchedR = { ...marchR, crouch: 0.2, lean: 0.4, legL: [0.35, 0, 0], kneeL: [0.2, 0, 0], legR: [-0.5, 0, 0], kneeR: [0.3, 0, 0], head: [-0.15, 0, 0] };
  const marchL = { ...marchR, legR: [0.2, 0, 0.08], kneeR: [0.15, 0, 0], legL: [-1.7, 0, 0.1], kneeL: [1.7, 0, 0] };
  const marchedL = { ...marchedR, legR: [0.35, 0, 0], kneeR: [0.2, 0, 0], legL: [-0.5, 0, 0], kneeL: [0.3, 0, 0] };
  ATTACK_POSES.giantPitStomps = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' },
    hits: [{ windup: marchR, strike: marchedR, follow: marchedR }, { windup: marchL, strike: marchedL, follow: marchedL },
      { windup: { ...marchR, lean: 0.2, armR: [-2.4, 0, -0.6], armL: [-2.4, 0, 0.6], weapon: [0.3, 0, 0.2], head: [-0.2, 0, 0] },
        strike: { ...marchedR, crouch: 0.32, lean: 0.25, chest: [0.3, 0, 0], armR: [-0.4, 0, -0.3], armL: [-0.4, 0, 0.3], weapon: [0.5, 0, 0] },
        follow: { ...marchedR, crouch: 0.34, lean: 0.25, chest: [0.3, 0, 0], armR: [-0.4, 0, -0.3], armL: [-0.4, 0, 0.3], weapon: [0.5, 0, 0] } }] };
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const BURST = r => ({ w: 2 * r, h: 2.4, d: 2 * r, fwd: 0, y: 1.2 });
  const SWEEP = { w: 7.0, h: 2.2, d: 4.6, fwd: 2.4, y: 1.3 };
  const STOMP = { w: 5.6, h: 0.8, d: 5.6, fwd: 0.6, y: 0.4 };   // low: a jump clears it
  const CLAW = { w: 4.2, h: 2.2, d: 4.0, fwd: 2.4, y: 1.1 };
  const SLAM = { w: 2.6, h: 3.0, d: 4.4, fwd: 2.8, y: 1.0 };
  const SCOOP = { w: 3.0, h: 1.8, d: 3.0, fwd: 2.3, y: 0.9 };
  const WHEEL = { w: 8.4, h: 2.0, d: 8.4, fwd: 0, y: 1.2 };
  const BACKHAND = { w: 5.0, h: 2.0, d: 3.6, fwd: 2.0, y: 1.2 };
  const SHATTER = { ring: 3.2, crack: 1.8, dust: 16, shake: 0.14 };   // a blow into the floor
  // The grip: carried from where you stood up before its skull over `lift` s, burning `dps` a second for at most `time`
  // s; a strike, roll or parry pressed wins back `escape` s; thrown `throw` m/s when it lets go (Player.seize).
  const GRIP = { at: [0.55, 2.8, 2.15], lift: 0.5, time: 2.4, dps: 11, escape: 0.22, throw: 12 };

  // ---- the gaol's dead --------------------------------------------------------------------------------------------------
  // Club Sweep: hauled back low behind its right hip; flat across at your hips. Parry it.
  const sweep = { id: 'sweep', name: 'Club Sweep', anim: 'sweep', pose: 'giantSweep', tracking: { rate: 1.6, commit: 0.6 }, markers: glint(0),
    hits: [{ startup: 1.45, active: 0.14, follow: 0.42 }], recovery: 1.3, damage: 32, poise: 70, knock: 10, lunge: 0.6, range: 3.6, box: SWEEP };
  // Stomp: a foot raised high over you; down. Its answer to standing under it. Roll it, or jump it.
  const stomp = { id: 'stomp', name: 'Stomp', anim: 'stomp', pose: 'giantStomp', tracking: { rate: 1.2, commit: 0.5 }, rollOnly: true, chance: 0.5,
    hits: [{ startup: 1.25, active: 0.12, follow: 0.38, tell: 'footL', hold: { at: 0.55, time: [0.3, 0.8], chance: 0.5 }, impact: { ring: 2.8, crack: 1.2, dust: 12, shake: 0.12 } }], recovery: 1.05,
    damage: 24, poise: 60, knock: 8, lunge: 0, range: 2.6, box: STOMP };
  // The Long Claw: drawn up over its left shoulder; raked down across before it. Parry it.
  const claw = { id: 'giantClaw', name: 'The Long Claw', anim: 'sweep', pose: 'giantClaw', tracking: { rate: 2.0, commit: 0.65 }, markers: glint(0), chance: 0.6,
    hits: [{ startup: 1.15, active: 0.14, follow: 0.35, tell: 'claw' }], recovery: 1.1, damage: 28, poise: 55, knock: 7, lunge: 1.2, range: 4.2, box: CLAW };
  // Gaol Slam: the club high on its right, the claw aimed at you; held; down into the floor. Roll it.
  const slam = { id: 'giantSlam', name: 'Gaol Slam', anim: 'chop', pose: 'giantSlam', tracking: { rate: 1.8, commit: 0.5 }, rollOnly: true, chance: 0.45,
    hits: [{ startup: 1.5, active: 0.13, follow: 0.5, hold: { at: 0.6, time: [0.3, 0.9], chance: 0.55 }, impact: SHATTER }], recovery: 1.45,
    damage: 46, poise: 90, knock: 9, lunge: 1.0, range: 3.8, box: SLAM };
  // The Taking: crouched, the open hand held out wide and low; it scoops you off the floor and holds you up before
  // its skull. Roll it; caught, struggle.
  const taking = { id: 'giantTaking', name: 'The Taking', anim: 'thrust', pose: 'giantTaking', tracking: { rate: 1.8, commit: 0.6 }, rollOnly: true, noParry: true, chance: 0.45,
    hits: [{ startup: 1.35, active: 0.16, follow: 2.4, tell: 'claw', seize: GRIP }], recovery: 1.1,
    damage: 8, poise: 40, knock: 0, lunge: 1.6, range: 3.6, box: SCOOP };
  // Club and Claw: the club cocked across to its left; a backhand (parry it), the claw (parry it), then the club high and
  // down (roll it).
  const clubClaw = { id: 'giantClubClaw', name: 'Club and Claw', anim: 'sweep', pose: 'giantClubClaw', tracking: { rate: 2.2, commit: 0.65 }, markers: glint(0, 1), chance: 0.5,
    hits: [{ startup: 1.05, active: 0.13, follow: 0.2, box: BACKHAND }, { startup: 0.85, active: 0.13, follow: 0.2, tell: 'claw', box: CLAW },
           { startup: 1.0, active: 0.13, follow: 0.45, noParry: true, damage: 42, hold: { at: 0.6, time: [0.2, 0.6], chance: 0.4 }, box: SLAM, impact: SHATTER }],
    recovery: 1.4, damage: 24, poise: 50, knock: 6, lunge: 1.0, range: 3.6, box: BACKHAND };
  // Drinking where it can see you: the taking, sooner.
  const takingPunish = { ...JSON.parse(JSON.stringify(taking)), id: 'giantTakingPunish', when: 'healing', chance: 3,
    hits: [{ startup: 1.0, active: 0.16, follow: 2.4, tell: 'claw', seize: GRIP }], tracking: { rate: 2.4, commit: 0.7 }, range: 4.5 };

  // ---- gathered: the pit gives it more of its dead -----------------------------------------------------------------------
  // The Gathering (the phase opener): both hands high, then driven into the floor; the dead come up all round it (roll it,
  // or be out of reach). It cannot be hurt through it (as every boss's change).
  const gathering = { id: 'giantGathering', name: 'The Gathering', anim: 'stomp', pose: 'giantGathering', noParry: true, rollOnly: true, invulnerable: true, tracking: { rate: 1.0, commit: 0.5 }, chance: 0.1,
    hits: [{ startup: 1.6, active: 0.2, follow: 0.8, box: BURST(4.4), impact: { ring: 5.4, crack: 2.4, dust: 22, shake: 0.2 } }], recovery: 1.6,
    damage: 26, poise: 50, knock: 14, lunge: 0, range: 3.0, box: BURST(4.4) };   // range: chosen only close in (it is mostly its opener)
  // The Reaching Hand: crouched on its haunches, the claw stretched back; a leap, and the hand comes down on you. Roll it;
  // caught, struggle.
  const reach = { id: 'giantReach', name: 'The Reaching Hand', anim: 'overhead', pose: 'giantReach', tracking: { rate: 2.2, commit: 0.45 }, rollOnly: true, noParry: true, minRange: 4.5, chance: 0.5,
    hits: [{ startup: 1.3, active: 0.18, follow: 2.4, tell: 'claw', leap: { from: 0.5, max: 11, short: 1.6 }, seize: GRIP, impact: { ring: 2.6, crack: 0.8, dust: 12, shake: 0.1 } }], recovery: 1.1,
    damage: 10, poise: 50, knock: 0, lunge: 0, range: 11, box: SCOOP };
  // The Bonewheel: the club straight out to its right, coiled to its left; whirled round twice. Roll it, or be out of reach.
  const wheel = { id: 'giantWheel', name: 'The Bonewheel', anim: 'sweep', pose: 'giantWheel', tracking: { rate: 1.6, commit: 0.4 }, rollOnly: true, noParry: true, chance: 0.4,
    hits: [{ startup: 1.35, active: 0.2, follow: 0.12 }, { startup: 0.12, active: 0.2, follow: 0.55 }], recovery: 1.5,
    damage: 26, poise: 60, knock: 10, lunge: 0.8, range: 3.8, box: WHEEL };
  // Pit Stomps: right, left, right toward you, hunched and marching, the third the hardest. Roll them, or jump them.
  const pitStomps = { id: 'giantPitStomps', name: 'Pit Stomps', anim: 'stomp', pose: 'giantPitStomps', tracking: { rate: 2.0, commit: 0.7 }, rollOnly: true, chance: 0.4,
    hits: [{ startup: 1.0, active: 0.12, follow: 0.12, tell: 'footR', impact: { ring: 2.4, crack: 0.8, dust: 8, shake: 0.08 } },
           { startup: 0.6, active: 0.12, follow: 0.12, tell: 'footL', impact: { ring: 2.4, crack: 0.8, dust: 8, shake: 0.08 } },
           { startup: 0.85, active: 0.12, follow: 0.45, tell: 'footR', damage: 30, box: { ...STOMP, w: 7.0, d: 7.0 }, impact: { ring: 3.6, crack: 1.6, dust: 16, shake: 0.14 } }],
    recovery: 1.3, damage: 20, poise: 50, knock: 7, lunge: 1.4, range: 3.0, box: STOMP };

  const GIANT = {
    id: 'giant', model: 'giantSkeleton', name: 'Giant Skeleton',
    description: 'The gaol\'s dead, made one by the heat under the castle, still wearing its irons. Its long hand takes the living: roll away from the open hand, and if it closes on you, strike or roll again and again to tear loose. Its sweep and claw can be parried, its slam and stomp only rolled. At half its strength the pit gives it more of its dead.',
    scale: 2.3, bulk: 1.2, radius: 0.95, color: 0xb9b3a0, weapon: 'club', idle: 'sway',
    visual: { skin: 0xcfc8b2, bareArms: true, roughness: 0.75, rim: 0.8 },   // bone
    hp: 1920, poise: 220, speed: 1.4, turnRate: 2.2, trackRate: 0.8, approach: 0.5, kite: 0.1,
    cooldown: [1.39, 2.62], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0,
    // Boss posture: replaces poise interrupts (hits never cancel its swings). A break opens its hand too (Player.seize).
    posture: { max: 70, parry: 32, chainGap: 1.8, chainMul: 1.35, decay: 5, breakTime: 3.2, hitstop: 0.2 },
    defaultPhases: ['gaol', 'gathered'],
    phases: {
      gaol: { hp: 1920, attacks: ['sweep', 'stomp', 'giantClaw', 'giantSlam', 'giantTaking', 'giantClubClaw', 'giantTakingPunish'] },
      // At half its strength it drives both hands into the floor and the pit gives it more of its dead: the heat fills its ribs.
      gathered: { at: 0.5, name: 'The Giant Skeleton, Gathered', opener: 'giantGathering', reveal: ['heat'],
        revealBurst: { color: 0xffa040, count: 44, speed: 6 },
        cooldown: [1.15, 2.2], approach: 0.7, speed: 1.7, trackRate: 1.1,
        attacks: ['giantGathering', 'sweep', 'stomp', 'giantClaw', 'giantSlam', 'giantTaking', 'giantClubClaw', 'giantReach', 'giantWheel', 'giantPitStomps', 'giantTakingPunish'] },
    },
    attacks: [sweep, stomp, claw, slam, taking, clubClaw, takingPunish, gathering, reach, wheel, pitStomps],
  };
  ENEMY_DEFS.push(GIANT); ENEMY_BY_ID[GIANT.id] = GIANT;
}
