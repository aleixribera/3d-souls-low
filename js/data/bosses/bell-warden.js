'use strict';
// ============================================================================
// The Bell Warden (v7.43.0 figure; his own fight since pass 68), the boss of Level 4, js/levels/the-tower.js (STORY.md)
// ============================================================================
// The king's guard over the Bell of Waking: a bellkeeper chained in bronze, set on the top of the Seven's watchtower so the
// Bell is never rung. He is cast like the bell he keeps (a bell for a helm, bells for pauldrons, a bell for a skirt) and
// his whole body rings when it is struck. He keeps that silent too: every blow you land on him sets his bronze humming,
// louder blow by blow (the def's `resonance`: a pale light swells at his breast and each blow rings higher), and when it
// is full he gives it back as one toll, a burst all round him that only a roll or distance escapes (`when: 'resonant'`).
// Two or three blows and away: the fight teaches patience. Cold, his bell maul is chained shut (`muffle`): a sweep and a
// backhand to parry, a falling slam to roll, the push that sends you off the tower's edge, a charge, the upswing. At half
// his strength he rings himself awake: he swings the maul into his own bell-helm, the chains fall from the bell
// (`conceal`), its old crack lights (`reveal`), and he hums faster, leaps on you, and strikes three tolls in a row.
//
// Every wind-up is his own. The maul hauled back low on his right, the bell trailing at his heel (the sweep); raised
// straight up over his head, up on his toes (the hammerfall); held crosswise before his chest, shoulder down (the push);
// head down like a bull, the bell levelled ahead under his arm (the charge); held high over his LEFT shoulder (the
// backhand); the bell resting on the floor ahead, crouched over it (the upswing); hugged upright to his chest, head bowed
// (the answering toll). Woken: the maul swung out wide on his right, his head turned to it (the waking); crouched with the
// bell swung behind him (the bronze fall); over his right shoulder, then his left (three tolls). He holds the haft in
// both hands (the model's `grip`, Rig.holdHaft): each key pose says where it points, `haft: [pitch, yaw, roll]` in his
// chest's heading (pitch 0 level ahead, -1.57 straight up, positive dips the bell; yaw + to his left).

// ---- his figure: built in Blender (tools/blender/bellwarden.py), one piece per bone ------------------------------------------
// A verdigris bronze colossus cast like the bell he keeps: a bell for a helm with a barred gaol window, bells for pauldrons
// and skirt, crossed chains locked at the breast, shackles. Pass 68: his own bell maul baked on the weapon bone (a cast
// bell on an iron-banded haft, its canons bolted to a forged socket, the clapper inside), chained shut (`muffle`) until he
// wakes, its crack lit (`toll`) after.
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
    wood: { tex: 'paviseWood', tint: 0x4a4034, decay: 0.7 },
    muffle: { tex: 'rustedIron', tint: 0x5a5650, decay: 0.85, rim: 0.3 },
    toll: { glow: 0xb8ffd0 },
    eye: { glow: 0xb8ffd0 },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  bones: { loinF: { parent: 'spin', at: [0.0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.2] } },
  parts: Object.entries({
    head: ['bronze', 'void', 'trim'], neck: ['iron'],
    chest: ['bronze', 'trim', 'iron'], spin: ['bronze', 'bronze.1', 'trim', 'leather', 'iron'],
    loinF: ['cloth'], loinB: ['cloth'],
    armL: ['mail', 'bronze', 'trim'], armR: ['mail', 'bronze', 'trim'],
    elbowL: ['bronze', 'trim', 'iron', 'iron.1'], elbowR: ['bronze', 'trim', 'iron', 'iron.1'],
    legL: ['mail'], legR: ['mail'],
    kneeL: ['bronze', 'iron', 'iron.1'], kneeR: ['bronze', 'iron', 'iron.1'],
    weapon: ['wood', 'bronze', 'trim', 'iron', 'muffle', 'toll'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `bell:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42,
    ...(bone === 'weapon' ? { weapon: true } : {}) }))),
  weapon: null,            // the bell maul is part of the figure (the `weapon: true` pieces above)
  hidden: ['toll'],        // the lit crack: shown by the woken phase's `reveal`
  grip: { span: [-0.5, 0.75], rest: [0.5, -0.45, 3.14] },   // at rest the bell hangs low ahead of his right foot, its lip off the floor
  weaponRest: 0.5,
  // The hum (pass 68): a pale light at his breast that swells with his `resonance` (Enemy.pose).
  hum: { bone: 'chest', at: [0, 0.4, 0.22], color: 0xb8ffd0, size: 1.5 },
  eyes: { color: 0xb8ffd0, size: 0.016, spread: 0.06, at: [0, 0.062, 0.165] },
  anim: {
    idle: { breathRate: 0.9, breath: 0.014, headDrift: 0.03, sway: 0.01, twitch: 0 }, walk: { twist: 0.07, roll: 0.03, headNod: 0.03, elbow: 0.25, drag: 0 },
    flinch: { head: 0.4, chest: 0.4, arms: 0.4 }, death: { buckle: 1, slump: 0.7 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 70, damp: 6, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 60, damp: 5.5, flutter: 0.04 }],
  },
};

// ---- key poses (js/data/attack-poses.js format) -------------------------------------------------------------------------
{
  const heavy = { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' };   // a weight that gathers, then falls
  const swing = { windup: 'inOutCubic', active: 'outCubic', follow: 'outQuad', recovery: 'inOutCubic' };

  // Bronze Sweep: the maul hauled back low on his right, the bell trailing at his right heel, his back half turned; swung
  // flat across at your hips, and the weight carries him on round to his left.
  const hauled = { crouch: 0.26, lean: 0.12, legL: [-0.45, 0, 0], legR: [0.45, 0, 0], spin: [0, -1.1, 0], chest: [0.05, -0.4, 0], neck: [0, 0.5, 0], head: [0, 0.7, 0],
    armR: [-0.35, 0, -0.55], elbowR: [-0.3, 0, 0], haft: [0.45, -2.4, 3.14], armL: [-0.7, 0, -0.4], elbowL: [-0.8, 0, 0] };
  const swept = { crouch: 0.22, lean: 0.08, legL: [-0.55, 0, -0.1], legR: [0.35, 0, 0.12], spin: [0, 1.0, 0], chest: [0.05, 0.45, 0], neck: [0, -0.35, 0], head: [0, -0.45, 0],
    armR: [-1.35, 0, 0.9], elbowR: [-0.1, 0, 0], haft: [0.18, 1.35, 3.14], armL: [-1.0, 0, 0.5], elbowL: [-0.4, 0, 0] };
  ATTACK_POSES.wardenSweep = { ease: { ...swing, active: 'inOutSine' }, lag: { weapon: 0.1 },
    hits: [{ windup: hauled, strike: swept, follow: { ...swept, crouch: 0.3, spin: [0, 1.3, 0], haft: [0.4, 1.9, 3.14] } }] };

  // The Hammerfall: the maul raised straight up over his head in both hands, up on his toes, his back arched; held; brought
  // down mouth-first into the floor ahead with all his bronze behind it.
  const raised = { crouch: 0.02, lean: -0.25, legL: [-0.35, 0, 0], legR: [0.3, 0, 0], chest: [-0.35, 0, 0], neck: [-0.1, 0, 0], head: [-0.2, 0, 0],
    armR: [-3.0, 0, 0.1], elbowR: [-0.5, 0, 0], haft: [-1.95, 0, 3.14], armL: [-3.0, 0, -0.1], elbowL: [-0.5, 0, 0] };
  // (Arms out level and the haft steep: the bell lands mouth-down on the floor 2-4 m ahead, not thrust out past it.)
  const fallen = { crouch: 0.12, lean: 0.28, legL: [-0.95, 0, 0], kneeL: [0.5, 0, 0], legR: [0.6, 0, 0], kneeR: [0.2, 0, 0], chest: [0.3, 0, 0], neck: [-0.2, 0, 0], head: [-0.25, 0, 0],
    armR: [-1.9, 0, 0], elbowR: [0, 0, 0], haft: [1.3, 0, 3.14], armL: [-1.85, 0, 0], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.wardenHammerfall = { ease: heavy, lag: { weapon: 0.08 },
    hits: [{ windup: raised, strike: fallen, follow: { ...fallen, crouch: 0.06, armR: [-1.95, 0, 0], armL: [-1.9, 0, 0] } }] };

  // The Ward Push: the haft held crosswise before his chest in both fists, his left shoulder lowered into it; driven out
  // at you, both arms straight: a push, not a blow, and the tower top has an open edge.
  const braced = { crouch: 0.3, lean: 0.15, legL: [-0.6, 0, 0], legR: [0.5, 0, 0], spin: [0, 0.45, 0], chest: [0.15, 0.2, 0], neck: [0, -0.3, 0], head: [0, -0.4, 0],
    armR: [-0.9, 0, -0.35], elbowR: [-1.5, 0, 0], haft: [-0.2, 1.57, 3.14], armL: [-0.9, 0, 0.2], elbowL: [-1.4, 0, 0] };
  const pushed = { crouch: 0.22, lean: 0.35, legL: [-0.95, 0, 0], kneeL: [0.4, 0, 0], legR: [0.75, 0, 0], spin: [0, 0.1, 0], chest: [0.2, 0.05, 0], neck: [0, -0.1, 0], head: [-0.1, -0.1, 0],
    armR: [-1.45, 0, -0.2], elbowR: [-0.15, 0, 0], haft: [-0.15, 1.57, 3.14], armL: [-1.4, 0, 0.2], elbowL: [-0.2, 0, 0] };
  ATTACK_POSES.wardenPush = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.05 },
    hits: [{ windup: braced, strike: pushed, follow: pushed }] };

  // The Rampart Charge: head down like a bull, the maul tucked under his right arm, the bell levelled ahead of him; he runs
  // and rams it into you.
  const lowered = { crouch: 0.36, lean: 0.45, legL: [-0.75, 0, 0], kneeL: [0.3, 0, 0], legR: [0.6, 0, 0], chest: [0.3, 0, 0], neck: [-0.25, 0, 0], head: [-0.35, 0, 0],
    armR: [-0.45, 0, -0.25], elbowR: [-1.25, 0, 0], haft: [0.3, 0.05, 3.14], armL: [-0.7, 0, -0.05], elbowL: [-1.2, 0, 0] };
  const rammed = { crouch: 0.3, lean: 0.55, legL: [-1.0, 0, 0], kneeL: [0.45, 0, 0], legR: [0.8, 0, 0], chest: [0.35, 0, 0], neck: [-0.3, 0, 0], head: [-0.4, 0, 0],
    armR: [-1.25, 0, -0.1], elbowR: [-0.25, 0, 0], haft: [0.08, 0, 3.14], armL: [-1.2, 0, 0], elbowL: [-0.4, 0, 0] };
  ATTACK_POSES.wardenCharge = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.06 },
    hits: [{ windup: lowered, strike: rammed, follow: { ...rammed, lean: 0.45 } }] };

  // Backhand and Hammer: the maul held high over his LEFT shoulder; a backhand down across to his right knee (parry it);
  // then heaved up from there over his head and brought down (roll it).
  const overLeft = { crouch: 0.12, lean: -0.05, legL: [-0.4, 0, 0], legR: [0.45, 0, 0], spin: [0, 0.9, 0], chest: [-0.05, 0.4, 0], neck: [0, -0.35, 0], head: [0, -0.5, 0],
    armR: [-2.5, 0, 0.9], elbowR: [-0.9, 0, 0], haft: [-0.95, 2.1, 3.14], armL: [-2.0, 0, 0.4], elbowL: [-1.0, 0, 0] };
  const backhanded = { crouch: 0.3, lean: 0.2, legL: [-0.55, 0, 0], legR: [0.4, 0, 0.1], spin: [0, -0.9, 0], chest: [0.2, -0.4, 0], neck: [0, 0.35, 0], head: [0, 0.45, 0],
    armR: [-0.7, 0, -0.75], elbowR: [-0.1, 0, 0], haft: [0.6, -1.5, 3.14], armL: [-0.75, 0, -0.35], elbowL: [-0.5, 0, 0] };
  const heaved = { crouch: 0.08, lean: -0.15, legL: [-0.45, 0, 0], legR: [0.4, 0, 0], spin: [0, -0.25, 0], chest: [-0.25, -0.1, 0], head: [-0.15, 0, 0],
    armR: [-2.9, 0, -0.2], elbowR: [-0.6, 0, 0], haft: [-1.75, -0.35, 3.14], armL: [-2.8, 0, -0.1], elbowL: [-0.6, 0, 0] };
  const fallenRight = { ...fallen, spin: [0, -0.25, 0], chest: [0.3, -0.15, 0], haft: [1.25, -0.2, 3.14] };
  ATTACK_POSES.wardenBackhand = { ease: swing, lag: { weapon: 0.08, armR: 0.03 },
    hits: [{ windup: overLeft, strike: backhanded, follow: backhanded }, { windup: heaved, strike: fallenRight, follow: fallenRight }] };

  // The Upswing: the bell let down onto the floor ahead of him, crouched deep over it, still; scooped up from the floor
  // under you and on up over his head.
  const scoop = { crouch: 0.5, lean: 0.4, legL: [-0.8, 0, -0.1], kneeL: [0.5, 0, 0], legR: [0.55, 0, 0.1], kneeR: [0.4, 0, 0], chest: [0.4, 0, 0], neck: [-0.3, 0, 0], head: [-0.35, 0, 0],
    armR: [-0.55, 0, -0.1], elbowR: [-0.05, 0, 0], haft: [0.55, -0.1, 3.14], armL: [-0.45, 0, 0], elbowL: [-0.2, 0, 0] };
  const upswung = { crouch: 0.04, lean: -0.3, legL: [-0.4, 0, 0], legR: [0.35, 0, 0], chest: [-0.35, 0, 0], neck: [-0.15, 0, 0], head: [-0.3, 0, 0],
    armR: [-2.7, 0, 0.05], elbowR: [-0.2, 0, 0], haft: [-1.2, 0, 3.14], armL: [-2.6, 0, -0.05], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.wardenUpswing = { ease: { windup: 'inOutSine', active: 'outCubic', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.08 },
    hits: [{ windup: scoop, strike: upswung, follow: { ...upswung, haft: [-1.5, 0, 3.14] } }] };

  // The Answering Toll: he hugs the maul upright against his chest, hunched over it, head bowed, and his bronze shakes;
  // then he flings his arms wide, his head back, and every bell on him rings at once.
  const hugged = { crouch: 0.32, lean: 0.12, legL: [-0.3, 0, -0.18], legR: [0.25, 0, 0.18], chest: [0.3, 0, 0], neck: [0.25, 0, 0], head: [0.35, 0, 0],
    armR: [-0.85, 0, 0.35], elbowR: [-1.75, 0, 0], haft: [-1.45, 0.05, 3.14], armL: [-0.8, 0, -0.35], elbowL: [-1.7, 0, 0] };
  const flung = { crouch: 0.12, lean: -0.3, legL: [-0.2, 0, -0.32], legR: [0.15, 0, 0.32], chest: [-0.4, 0, 0], neck: [-0.2, 0, 0], head: [-0.35, 0, 0],
    armR: [-1.4, 0, -1.25], elbowR: [-0.1, 0, 0], haft: [-0.35, -1.45, 3.14], grip: false, armL: [-1.4, 0, 1.25], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.wardenAnswer = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.05 },
    hits: [{ windup: hugged, strike: flung, follow: flung }, { windup: { ...hugged, crouch: 0.28 }, strike: flung, follow: flung }] };

  // ---- woken (second phase) ----
  // The Waking (the phase opener): the maul swung out wide on his right at shoulder height, his head turned to look at it;
  // hauled up and over until it stands straight above his helm, and the toll breaks out of him.
  const wide = { crouch: 0.2, lean: 0, legL: [-0.4, 0, -0.1], legR: [0.35, 0, 0.1], spin: [0, -0.6, 0], chest: [-0.1, -0.35, 0], neck: [0, -0.4, 0], head: [0, -0.6, 0.15],
    armR: [-1.5, 0, -1.3], elbowR: [-0.2, 0, 0], haft: [-0.25, -1.75, 3.14], grip: false, armL: [-0.4, 0, -0.2], elbowL: [-0.6, 0, 0] };
  const rung = { crouch: 0.3, lean: -0.08, legL: [-0.45, 0, -0.15], legR: [0.4, 0, 0.15], spin: [0, 0.35, 0], chest: [-0.05, 0.3, 0], neck: [0, 0.2, 0.2], head: [0.05, 0.25, 0.35],
    armR: [-2.1, 0, 0.75], elbowR: [-1.0, 0, 0], haft: [-1.0, 1.15, 3.14], armL: [-1.2, 0, 0.6], elbowL: [-1.3, 0, 0] };
  ATTACK_POSES.wardenWaking = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.1 },
    hits: [{ windup: wide, strike: rung, follow: { ...rung, crouch: 0.36, head: [0.15, 0.3, 0.4] } }] };

  // The Bronze Fall: crouched low with the bell swung down behind him between his feet; he leaps and comes down on you
  // mouth-first.
  const coiled = { crouch: 0.55, lean: 0.35, legL: [-0.85, 0, 0], kneeL: [0.6, 0, 0], legR: [0.5, 0, 0], kneeR: [0.5, 0, 0], chest: [0.3, 0, 0], neck: [-0.35, 0, 0], head: [-0.4, 0, 0],
    armR: [0.45, 0, -0.2], elbowR: [-0.2, 0, 0], haft: [0.3, 3.0, 3.14], armL: [0.3, 0, 0.1], elbowL: [-0.4, 0, 0] };
  ATTACK_POSES.wardenFall = { ease: heavy, lag: { weapon: 0.1 },
    hits: [{ windup: coiled, strike: { ...fallen, lean: 0.3 }, follow: { ...fallen, crouch: 0.06, armR: [-1.95, 0, 0], armL: [-1.9, 0, 0] } }] };

  // Three Tolls: the maul over his right shoulder, down across to his left; over his left shoulder, down across to his
  // right; then raised straight up, held, and brought down ahead.
  const overRight = { crouch: 0.1, lean: -0.1, legL: [-0.45, 0, 0], legR: [0.4, 0, 0], spin: [0, -0.7, 0], chest: [-0.15, -0.35, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armR: [-2.7, 0, -0.45], elbowR: [-0.7, 0, 0], haft: [-1.55, -0.75, 3.14], armL: [-2.3, 0, -0.35], elbowL: [-0.8, 0, 0] };
  const downLeft = { ...fallen, spin: [0, 0.55, 0], chest: [0.4, 0.3, 0], head: [-0.2, -0.3, 0], haft: [0.85, 0.5, 3.14] };
  const overLeft2 = { ...overRight, spin: [0, 0.7, 0], chest: [-0.15, 0.35, 0], neck: [0, -0.3, 0], head: [0, -0.4, 0], armR: [-2.6, 0, 0.5], haft: [-1.55, 0.75, 3.14], armL: [-2.5, 0, 0.3] };
  const downRight = { ...fallen, spin: [0, -0.55, 0], chest: [0.4, -0.3, 0], head: [-0.2, 0.3, 0], haft: [0.85, -0.5, 3.14] };
  ATTACK_POSES.wardenThreeTolls = { ease: heavy, lag: { weapon: 0.08, armR: 0.03 },
    hits: [{ windup: overRight, strike: downLeft, follow: downLeft }, { windup: overLeft2, strike: downRight, follow: downRight },
      { windup: raised, strike: fallen, follow: { ...fallen, crouch: 0.06, armR: [-1.95, 0, 0], armL: [-1.9, 0, 0] } }] };
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  // The toll all round him: a square `r` m out on every side of him, too tall to jump. Roll it, or be out of reach. Not a
  // ring that travels out (v6.2 took the Skyfall shockwave off him for balance, and the tests keep it off): it is the bronze
  // ringing where he stands.
  const BURST = r => ({ w: 2 * r, h: 2.4, d: 2 * r, fwd: 0, y: 1.2 });
  const SWEEP = { w: 5.6, h: 1.6, d: 3.8, fwd: 2.0, y: 1.1 };
  const SLAM = { w: 2.4, h: 3.0, d: 4.0, fwd: 2.5, y: 1.0 };
  const PUSH = { w: 3.0, h: 2.4, d: 2.2, fwd: 1.6, y: 1.2 };
  const RAM = { w: 2.4, h: 2.4, d: 2.6, fwd: 1.6, y: 1.2 };
  const BACKHAND = { w: 4.0, h: 1.8, d: 3.2, fwd: 1.9, y: 1.0 };
  const UPSWING = { w: 2.0, h: 3.2, d: 3.4, fwd: 2.1, y: 1.4 };
  const FALL = { w: 3.2, h: 2.4, d: 3.2, fwd: 1.4, y: 0.9 };
  const TOLL = { ring: 3.0, crack: 1.6, dust: 14, shake: 0.12 };   // a mouth-first blow into the floor
  const tollSound = vel => ({ at: 'windup', t: 0, event: 'sound', sound: 'bellToll', vel });

  // ---- cold: the bell chained silent ---------------------------------------------------------------------------------------
  // Bronze Sweep: hauled back low on his right; flat across at your hips. Parry it.
  const sweep = { id: 'wardenSweep', name: 'Bronze Sweep', anim: 'sweep', pose: 'wardenSweep', tracking: { rate: 2.2, commit: 0.7 }, markers: glint(0),
    hits: [{ startup: 1.25, active: 0.16, follow: 0.4 }], recovery: 1.15, damage: 34, poise: 60, knock: 8, lunge: 1.0, range: 3.6, box: SWEEP };
  // The Hammerfall: raised straight up, held; down mouth-first ahead. Roll it.
  const hammerfall = { id: 'wardenHammerfall', name: 'The Hammerfall', anim: 'chop', pose: 'wardenHammerfall', tracking: { rate: 2, commit: 0.5 }, rollOnly: true, chance: 0.45,
    hits: [{ startup: 1.55, active: 0.14, follow: 0.45, hold: { at: 0.55, time: [0.4, 1.0], chance: 0.6 }, impact: TOLL }], recovery: 1.4,
    damage: 58, poise: 90, knock: 8, lunge: 1.2, range: 3.4, box: SLAM };
  // The Ward Push: crosswise before his chest; driven out at you. It sends you a long way, and the tower top has an open
  // edge. Parry it.
  const push = { id: 'wardenPush', name: 'The Ward Push', anim: 'shove', pose: 'wardenPush', tracking: { rate: 1.8, commit: 0.65 }, markers: glint(0), shove: true, chance: 0.45,
    hits: [{ startup: 1.3, active: 0.18, follow: 0.25 }], recovery: 1.0, damage: 14, poise: 40, knock: 28, lunge: 2.6, range: 2.8, box: PUSH };
  // The Rampart Charge: head down, the bell levelled under his arm; a run and a ram. Parry it.
  const charge = { id: 'wardenCharge', name: 'Rampart Charge', anim: 'thrust', pose: 'wardenCharge', tracking: { rate: 2, commit: 0.35 }, markers: glint(0), minRange: 5, dash: { speed: 11, from: 0.4 },
    hits: [{ startup: 1.15, active: 0.16, follow: 0.3 }], recovery: 1.15, damage: 32, poise: 70, knock: 12, lunge: 3, range: 12, box: RAM };
  // Backhand and Hammer: over his left shoulder; a backhand down across (parry it), then heaved up and brought down (roll it).
  const backhand = { id: 'wardenBackhand', name: 'Backhand and Hammer', anim: 'sweep', pose: 'wardenBackhand', tracking: { rate: 2.6, commit: 0.7 }, markers: glint(0), chance: 0.55,
    hits: [{ startup: 0.95, active: 0.15, follow: 0.2, box: BACKHAND }, { startup: 0.85, active: 0.14, follow: 0.4, noParry: true, damage: 46, box: SLAM, impact: TOLL }],
    recovery: 1.35, damage: 26, poise: 50, knock: 7, lunge: 1.2, range: 3.2, box: BACKHAND };
  // The Upswing: the bell let down on the floor ahead, crouched over it; scooped up under you. Parry it.
  const upswing = { id: 'wardenUpswing', name: 'The Upswing', anim: 'overhead', pose: 'wardenUpswing', tracking: { rate: 2.4, commit: 0.65 }, markers: glint(0), chance: 0.4,
    hits: [{ startup: 1.05, active: 0.16, follow: 0.35 }], recovery: 1.2, damage: 30, poise: 60, knock: 10, lunge: 1.4, range: 3.3, box: UPSWING };
  // The Answering Toll: never chosen; it is his answer once his bronze is full (`resonance`). Hugged upright, head bowed,
  // shaking; then arms flung wide and the toll rings out all round him. Roll it, or be out of reach.
  const answer = { id: 'wardenAnswer', name: 'The Answering Toll', anim: 'stomp', pose: 'wardenAnswer', when: 'resonant', noParry: true, rollOnly: true, tracking: { rate: 1.2, commit: 0.4 }, chance: 60,
    markers: [tollSound(0.5)],
    hits: [{ startup: 1.05, active: 0.2, follow: 0.62, box: BURST(3.6), impact: { ring: 4.2, crack: 0, dust: 10, shake: 0.14 } }], recovery: 1.7,
    damage: 34, poise: 60, knock: 14, lunge: 0, range: 3.6, box: BURST(3.6) };
  // Drinking where he can see it: the charge, sooner.
  const chargePunish = { ...JSON.parse(JSON.stringify(charge)), id: 'wardenChargePunish', when: 'healing', minRange: 0, chance: 3,
    hits: [{ startup: 0.8, active: 0.16, follow: 0.3 }], tracking: { rate: 3, commit: 0.6 } };

  // ---- woken: the bell rung ------------------------------------------------------------------------------------------------
  // The Waking (the phase opener): the maul swung wide on his right, then hauled up straight over his helm; the toll breaks out of
  // him (roll it, or be out of reach). He cannot be hurt through it (as every boss's change).
  const waking = { id: 'wardenWaking', name: 'The Waking', anim: 'stomp', pose: 'wardenWaking', noParry: true, rollOnly: true, invulnerable: true, tracking: { rate: 1.4, commit: 0.5 }, chance: 0.1,
    markers: [tollSound(0.35)],
    hits: [{ startup: 1.5, active: 0.2, follow: 0.8, box: BURST(4.4), impact: { ring: 5.2, crack: 0, dust: 16, shake: 0.2 } }], recovery: 1.9,
    damage: 30, poise: 50, knock: 14, lunge: 0, range: 3.0, box: BURST(4.4) };   // range: chosen only close in (it is mostly his opener)
  // The Bronze Fall: crouched, the bell swung behind him; a leap, and down on you mouth-first. Roll it.
  const fall = { id: 'wardenFall', name: 'The Bronze Fall', anim: 'overhead', pose: 'wardenFall', tracking: { rate: 2.4, commit: 0.45 }, rollOnly: true, minRange: 4, chance: 0.5,
    hits: [{ startup: 1.2, active: 0.16, follow: 0.45, leap: { from: 0.5, max: 14, short: 1.0 }, impact: { ring: 3.6, crack: 2.0, dust: 18, shake: 0.16 } }], recovery: 1.5,
    damage: 52, poise: 90, knock: 9, lunge: 0, range: 14, box: FALL };
  // Three Tolls: over his right shoulder and down (parry it), over his left and down (parry it), then raised, held, and
  // down ahead (roll it).
  const threeTolls = { id: 'wardenThreeTolls', name: 'Three Tolls', anim: 'chop', pose: 'wardenThreeTolls', tracking: { rate: 2.6, commit: 0.65 }, markers: glint(0, 1), chance: 0.55,
    hits: [{ startup: 1.0, active: 0.14, follow: 0.18, impact: TOLL }, { startup: 0.7, active: 0.14, follow: 0.18, impact: TOLL },
           { startup: 1.0, active: 0.14, follow: 0.45, noParry: true, damage: 50, hold: { at: 0.6, time: [0.3, 0.8], chance: 0.5 }, impact: TOLL }],
    recovery: 1.45, damage: 28, poise: 50, knock: 7, lunge: 1.0, range: 3.4, box: SLAM };
  // Woken, his answer rings twice.
  const answerTwice = { ...JSON.parse(JSON.stringify(answer)), id: 'wardenAnswerTwice', name: 'The Answering Peal',
    hits: [{ startup: 0.95, active: 0.2, follow: 0.42, box: BURST(3.6), impact: { ring: 4.2, crack: 0, dust: 10, shake: 0.14 } },
           { startup: 0.85, active: 0.2, follow: 0.62, box: BURST(4.0), impact: { ring: 4.8, crack: 0, dust: 10, shake: 0.14 } }] };

  // His bronze hums under your blows: `light` a blow, `heavy` one of the `breakers`; after `delay` s with none it fades at
  // `decay` a second. Full (`max`), his `when: 'resonant'` answer is due; for `rest` s after it starts blows do not fill it
  // (three of you would otherwise fill it again before he has finished answering).
  const RESONANCE = { max: 6, light: 1, heavy: 2, breakers: ['heavy', 'jumpHeavy'], delay: 2.5, decay: 1.2, rest: 5 };

  const WARDEN = {
    id: 'bellWarden', model: 'bellWarden', name: 'Bell Warden',
    description: 'Keeper of the tower bell, cast in bronze like the bell he keeps, and it rings when you strike him. Land too many blows and he gives the ringing back as a toll all round him: strike two or three times, then step away. His sweep and backhand can be parried, his falling slams only rolled, and his push sends you toward the open edge. At half his strength he rings himself awake.',
    scale: 1.9, bulk: 1.25, radius: 0.85, color: 0x4a5a48, weapon: 'bell', idle: 'sway',
    visual: { skin: 0x6a7a62, skinMetal: 0.35, metal: 0.35, roughness: 0.5, rim: 0.8 },   // verdigris bronze
    hp: 2600, poise: 220, speed: 1.9, turnRate: 2.6, trackRate: 1.2, approach: 0.6, kite: 0.15,
    cooldown: [1.34, 2.69], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0,
    posture: { max: 84, parry: 29, chainGap: 1.8, chainMul: 1.35, decay: 4.5, breakTime: 3.4, hitstop: 0.2 },
    // Broken: hunched over and stunned, the bell propped on the floor ahead of him (the default kneel sank it through the floor).
    brokenPose: { crouch: 0.3, lean: 0.25, chest: [0.3, 0, 0], neck: [0.2, 0, 0], head: [0.3, 0, 0], armR: [-1.15, 0, 0.1], elbowR: [-0.3, 0, 0], armL: [-0.3, 0, 0.25], elbowL: [-0.5, 0, 0] },
    defaultPhases: ['silent', 'woken'],
    phases: {
      silent: { hp: 2600, resonance: RESONANCE,
        attacks: ['wardenSweep', 'wardenHammerfall', 'wardenPush', 'wardenCharge', 'wardenBackhand', 'wardenUpswing', 'wardenAnswer', 'wardenChargePunish'] },
      // At half his strength he rings himself awake: the chains fall from the bell, its crack lights, and his bronze fills faster.
      woken: { at: 0.5, name: 'The Bell Warden, Woken', opener: 'wardenWaking', conceal: ['muffle'], reveal: ['toll'],
        revealBurst: { color: 0xb8ffd0, count: 40, speed: 6 },
        resonance: { ...RESONANCE, max: 4, decay: 1.0 },
        cooldown: [1.1, 2.2], approach: 0.75, kite: 0.05, speed: 2.1, trackRate: 1.5,
        attacks: ['wardenWaking', 'wardenSweep', 'wardenHammerfall', 'wardenPush', 'wardenBackhand', 'wardenUpswing', 'wardenFall', 'wardenThreeTolls',
                  'wardenAnswerTwice', 'wardenChargePunish'] },
    },
    attacks: [sweep, hammerfall, push, charge, backhand, upswing, answer, chargePunish, waking, fall, threeTolls, answerTwice],
  };
  ENEMY_DEFS.push(WARDEN); ENEMY_BY_ID[WARDEN.id] = WARDEN;
}
