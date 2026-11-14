'use strict';
// ============================================================================
// The King's Blade (v7.51.0; its own since pass 55), the boss of Level 14, js/levels/still-mere.js (STORY.md 10j)
// ============================================================================
// The hunger, beaten in every body it wore, in the last one it kept: the champion's burned-out memory. Before he was the
// king's sword he was the king's shield, and it is the shield the memory kept. It is the only enemy that fights the way
// the player does: it waits behind the round shield and answers. Its patience is the Oath Guard: the shield high, the
// sword laid level over its rim. A blow into its front is turned and answered at once (a hit's `counter`, js/enemy.js
// takeHit); a heavy blow breaks the stance and it is open; wait it out and the sword comes over the rim. Every time its
// posture breaks it does what the champion did at Corvel: it kneels, the sword planted point-down in the ice, its head
// bowed (`brokenPose`), the image the story ends on.
// Past half (`emberWorn`) the hunger takes the memory and does what the champion refused: the sword becomes the torch,
// the shield burns and the guard is gone. Corvel Burns is the long raising of the torch; three blows landed through it
// and the memory refuses again (a hit's `falter`): it kneels, open. Let it finish and the fire runs out across the ice.
//
// Every wind-up is its own. The Oath Guard (shield high, sword over the rim); the Answer (the shield drawn back);
// Keeping the River (the sword wound back at the right hip behind the shield); the King's Reach (drawn back at the
// shoulder, point at you); the Shield Wall (shoulder down behind the shield); the Crown's Weight (the shield a roof, the
// sword laid back under it). Ember-Worn: the Torch Taken Up (the sword raised straight up like a torch, head thrown
// back); Corvel Burns (the same, held, shaking); the Hunger's Cuts (hunched behind the burning shield, the sword cocked
// over it); the Shield Burns (the shield flung out wide). A blow the shield strikes is told on the shield (`tell`).
// Blade angles are a `pitch` (0 level ahead, -1.57 straight up, positive dips the point) and the shield's a `face` (the
// left forearm's angle: -1.57 the shield faced straight ahead, 0 faced at the floor), both worked out into the bone
// angles by the loop after the poses.

// ---- its figure: built in Blender (tools/blender/kings_blade.py), one piece per bone ----------------------------------
// The champion's statue in the castle chapel come down off its plinth in ash: a deep hood and mantle, a mail hauberk under
// a surcoat with the seven-pointed crown on its breast, a great layered pauldron on the shield side, vambraces, a mail
// skirt, greaves, a long cape; all charred black. Only the scarf keeps its red. No face: struck off, as on the statue,
// two embers in its cracks. A big round shield on a centre grip; the King's sword, long and bright. Cracks of fire
// (`burn`) across the face, the breast and the shield show only while it burns.
{
  const PST = { chest: [0.03, 0, 0], neck: [0.04, 0, 0], head: [0.02, 0, 0], armR: [-0.12, 0, 0], elbowR: [-0.25, 0, 0],
    armL: [-0.05, 0, 0], elbowL: [-1.45, 0, 0], weapon: [0, 0, 0] };   // upright; the shield carried before it at the hip
  MODEL_DEFS.kingsBlade = {
    extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.5,
    proportions: { shoulderX: 0.34, torsoW: 0.22, torsoD: 0.16, armR: 0.065, legR: 0.085, headR: 0.12, handR: 0.06, footLen: 0.32 },
    posture: PST,
    materials: {
      ash: { tex: 'ashSoot', tint: 0x6a625a, decay: 0.55, rim: 0.4 },
      hood: { tex: 'ashSoot', tint: 0x5a5450, decay: 0.6, double: true, rim: 0.5 },
      cloth: { tex: 'ashSoot', tint: 0x7a7068, decay: 0.55, double: true },
      cape: { tex: 'tatteredFabric', tint: 0x4a4440, decay: 0.75, double: true, rim: 0.5 },
      mail: { tex: 'knightMail', tint: 0x4a4644, decay: 0.75 },
      iron: { tex: 'dentedSteel', tint: 0x6a6460, decay: 0.65, rim: 0.5 },
      leather: { tex: 'crackedLeather', tint: 0x3a3430, decay: 0.7 },
      strap: { tex: 'crackedLeather', tint: 0x2a2420, decay: 0.75 },
      wood: { tex: 'paviseWood', tint: 0x5a4a3e, decay: 0.7 },
      scarf: { tex: 'rottenCloth', tint: 0xd0302a, decay: 0.35, double: true },   // the one thing the fire left its colour
      blade: { tex: 'dentedSteel', tint: 0xe8e4dc, decay: 0.15, rim: 0.6 },        // the King's sword: kept bright
      burn: { glow: 0xff6a20, burn: true },
      eye: { glow: 0xff7a2a },
    },
    bones: {
      loinF: { parent: 'spin', at: [0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0, -0.02, -0.2] },
      capeA: { parent: 'chest', at: [0, 0.56, -0.24] }, capeB: { parent: 'capeA', at: [0, -0.42, -0.03] }, capeC: { parent: 'capeB', at: [0, -0.42, -0.03] },
      scarfA: { parent: 'chest', at: [0.06, 0.6, -0.14] }, scarfB: { parent: 'scarfA', at: [0.01, -0.33, -0.19] },
    },
    body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
    parts: Object.entries({
      head: ['ash', 'hood', 'burn'], neck: ['scarf'], chest: ['mail', 'cloth', 'iron', 'hood', 'strap', 'burn'], spin: ['mail', 'leather'],
      loinF: ['cloth'], loinB: ['cloth'], capeA: ['cape'], capeB: ['cape'], capeC: ['cape'], scarfA: ['scarf'], scarfB: ['scarf'],
      armL: ['mail', 'iron', 'iron.2'], armR: ['mail', 'iron'], elbowL: ['iron', 'leather', 'wood', 'iron.2', 'strap', 'burn'], elbowR: ['iron', 'leather'],
      legL: ['mail'], legR: ['mail'], kneeL: ['leather', 'iron', 'strap'], kneeR: ['leather', 'iron', 'strap'],
      weapon: ['blade', 'iron', 'strap'],   // (its fuller's fire, weapon__burn, is left out: a weapon piece is never hidden)
    }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `kingsBlade:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42,
      ...(bone === 'weapon' ? { weapon: true } : {}) }))),
    weapon: null,          // the King's sword is part of the figure (the `weapon: true` pieces above)
    weaponRest: 1.15,      // at rest its point is low before it (the `sway` idle)
    guardArm: { armL: [-0.85, 0, -0.12], elbowL: [-0.78, 0, 0] },   // guarding: the shield high before its chest, faced at you
    shieldTell: { bone: 'elbowL', at: [0.015, -0.42, 0.01] },   // a shield blow's wind-up glows on the shield's face, not the sword
    eyes: { color: 0xff7a2a, size: 0.009, spread: 0.03, at: [0, 0.115, 0.066] },   // embers in the struck-off face
    anim: {
      idle: { breathRate: 0.6, breath: 0.012, headDrift: 0.02, sway: 0.006, twitch: 0 }, walk: { twist: 0.05, roll: 0.03, headNod: 0.02, elbow: 0.08, drag: 0.04 },
      flinch: { head: 0.3, chest: 0.3, arms: 0.2 }, death: { buckle: 0.8, slump: 0.9 },
      cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5.4, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 52, damp: 5, flutter: 0.04 },
        { bone: 'capeA', gain: 0.12, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.16, k: 34, damp: 3.8, flutter: 0.04 },
        { bone: 'capeC', gain: 0.2, k: 28, damp: 3.2, flutter: 0.06 },
        { bone: 'scarfA', gain: 0.22, k: 30, damp: 3.0, flutter: 0.08 }, { bone: 'scarfB', gain: 0.3, k: 24, damp: 2.6, flutter: 0.12 }],
    },
  };

  // ---- key poses (js/data/attack-poses.js format) -----------------------------------------------------------------------
  const swing = { windup: 'inOutCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };
  const stance = { crouch: 0.14, legL: [-0.4, 0, 0], legR: [0.32, 0, 0] };

  // The Oath Guard: the shield high, its left shoulder to you, the sword laid level over the rim; held. If nothing comes,
  // the sword goes over the rim at you.
  const oath = { ...stance, crouch: 0.16, lean: 0.05, spin: [0, -0.12, 0], chest: [0, -0.1, 0], head: [0.05, 0.35, 0],
    armL: [-0.85, 0, -0.1], face: -1.62, armR: [-1.35, 0, 0.5], elbowR: [-0.6, 0, 0], pitch: 0.04 };
  const overRim = { crouch: 0.26, lean: 0.3, legL: [-0.9, 0, 0], kneeL: [0.5, 0, 0], legR: [0.55, 0, 0], spin: [0, -0.05, 0], head: [0.05, 0.2, 0],
    armL: [-0.7, 0, -0.1], face: -1.5, armR: [-1.55, 0, 0.3], elbowR: [-0.05, 0, 0], pitch: -0.6 };
  ATTACK_POSES.kbOath = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.06 },
    hits: [{ windup: oath, strike: overRim, follow: { ...overRim, lean: 0.35 } }] };

  // The Answer: the blow turned, the shield drawn back and driven into you; then the sword, high and down across.
  const drawShield = { ...stance, crouch: 0.2, spin: [0, 0.35, 0], chest: [0, 0.1, 0], head: [0, -0.3, 0],
    armL: [-0.3, 0, 0.3], face: -1.2, armR: [-0.7, 0, -0.3], elbowR: [-0.3, 0, 0], pitch: 0.4 };
  const bash = { crouch: 0.22, lean: 0.25, legL: [-0.8, 0, 0], kneeL: [0.4, 0, 0], legR: [0.5, 0, 0], spin: [0, -0.5, 0], chest: [0.05, -0.1, 0], head: [0, 0.4, 0],
    armL: [-1.3, 0, -0.25], face: -1.58, armR: [-0.8, 0, -0.4], elbowR: [-0.3, 0, 0], pitch: 0.5 };
  const highR = { ...stance, crouch: 0.16, lean: -0.05, spin: [0, -0.6, 0], chest: [-0.1, -0.2, 0], head: [0, 0.45, 0],
    armL: [-0.9, 0, -0.1], face: -1.5, armR: [-2.25, 0, -0.5], elbowR: [-1.0, 0, 0], pitch: -2.4 };
  const downL = { crouch: 0.28, lean: 0.35, legL: [-0.7, 0, 0], legR: [0.45, 0, 0], spin: [0, 0.55, 0], chest: [0.25, 0.3, 0], head: [0, -0.3, 0],
    armL: [-0.45, 0, 0.25], face: -1.25, armR: [-0.85, 0, 0.6], elbowR: [0, 0, 0], pitch: 0.75 };
  ATTACK_POSES.kbAnswer = { ease: swing, lag: { weapon: 0.08, armR: 0.04 },
    hits: [{ windup: drawShield, strike: bash, follow: bash }, { windup: highR, strike: downL, follow: { ...downL, spin: [0, 0.7, 0] } }] };

  // Keeping the River: the sword wound back at the right hip, the shield before it; across at the waist, then back up
  // from low on its left to high on its right, a step in; the shield driven after it.
  const wound = { ...stance, crouch: 0.2, spin: [0, -0.9, 0], chest: [0, -0.3, 0], head: [0, 0.75, 0],
    armL: [-0.8, 0, -0.1], face: -1.55, armR: [-1.1, 0, -1.0], elbowR: [-0.3, 0, 0], pitch: 0.15 };
  const across = { crouch: 0.22, lean: 0.15, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.8, 0], chest: [0.05, 0.3, 0], head: [0, -0.55, 0],
    armL: [-0.5, 0, 0.4], face: -1.2, armR: [-1.4, 0, 0.75], elbowR: [0, 0, 0], pitch: 0.1 };
  const lowL = { ...across, crouch: 0.3, spin: [0, 0.9, 0], armR: [-0.6, 0, 0.7], pitch: 0.9 };
  const rising = { crouch: 0.12, lean: -0.05, legL: [-0.5, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.7, 0], chest: [-0.1, -0.3, 0], head: [0, 0.5, 0],
    armL: [-0.8, 0, 0], face: -1.55, armR: [-2.3, 0, -0.6], elbowR: [-0.2, 0, 0], pitch: -1.7 };
  const risen = { ...rising, armR: [-2.5, 0, -0.7], pitch: -2.0 };
  const shove = { crouch: 0.22, lean: 0.3, legL: [-0.85, 0, 0], kneeL: [0.4, 0, 0], legR: [0.55, 0, 0], spin: [0, -0.45, 0], head: [0, 0.35, 0],
    armL: [-1.35, 0, -0.2], face: -1.6, armR: [-1.8, 0, -0.5], elbowR: [-0.2, 0, 0], pitch: -0.8 };
  ATTACK_POSES.kbRiver = { ease: swing, lag: { weapon: 0.08, armR: 0.05 }, hits: [
    { windup: wound, strike: across, follow: { ...across, spin: [0, 1.0, 0] } },
    { windup: lowL, strike: rising, follow: risen },
    { windup: { ...risen, spin: [0, 0.3, 0], armL: [-0.3, 0, 0.35], face: -1.2 }, strike: shove, follow: shove }] };

  // The King's Reach: drawn back at the shoulder, the point at you over the shield; a long lunge.
  const drawn = { ...stance, crouch: 0.26, legL: [-0.5, 0, 0], legR: [0.45, 0, 0], spin: [0, -0.45, 0], chest: [0, -0.2, 0], head: [0, 0.45, 0],
    armL: [-0.9, 0, 0.1], face: -1.6, armR: [-0.55, 0, 0], elbowR: [-1.5, 0, 0], pitch: 0.0 };
  const lunge = { crouch: 0.35, lean: 0.4, legL: [-1.1, 0, 0], kneeL: [0.8, 0, 0], legR: [0.75, 0, 0], spin: [0, 0.05, 0], chest: [0.15, 0.05, 0], head: [0, -0.1, 0],
    armL: [-0.2, 0, 0.5], face: -0.6, armR: [-1.55, 0, 0], elbowR: [0, 0, 0], pitch: -0.3 };
  ATTACK_POSES.kbReach = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.05 },
    hits: [{ windup: drawn, strike: lunge, follow: { ...lunge, lean: 0.45 } }] };

  // The Shield Wall: its shoulder down behind the shield, a run, the shield first; then a cut over it.
  const wall = { crouch: 0.3, lean: 0.35, legL: [-0.6, 0, 0], legR: [0.5, 0, 0], spin: [0, -0.6, 0], chest: [0.1, -0.1, 0], head: [-0.1, 0.45, 0],
    armL: [-1.0, 0, -0.2], face: -1.6, armR: [-0.3, 0, -0.3], elbowR: [-0.3, 0, 0], pitch: 0.8 };
  const rammed = { ...wall, crouch: 0.25, lean: 0.45, legL: [-0.9, 0, 0], kneeL: [0.4, 0, 0], legR: [0.6, 0, 0], spin: [0, -0.7, 0], armL: [-1.3, 0, -0.25], face: -1.6 };
  ATTACK_POSES.kbWall = { ease: swing, lag: { weapon: 0.08 },
    hits: [{ windup: wall, strike: rammed, follow: rammed }, { windup: highR, strike: downL, follow: { ...downL, spin: [0, 0.7, 0] } }] };

  // The Crown's Weight: the shield held up flat over its head like a roof, the sword laid back beneath it; the shield
  // swept away to its side as the sword comes straight down out from under it.
  const high = { crouch: 0.14, lean: -0.08, legL: [-0.5, 0, 0], legR: [0.35, 0, 0], chest: [-0.15, 0.1, 0], head: [-0.15, 0, 0],
    armL: [-2.7, 0, -0.3], face: -3.0, armR: [-2.6, 0, -0.3], elbowR: [-1.6, 0, 0], pitch: -3.35 };
  const down = { crouch: 0.36, lean: 0.5, legL: [-0.85, 0, 0], kneeL: [0.35, 0, 0], legR: [0.55, 0, 0], chest: [0.35, -0.1, 0], head: [0.1, 0, 0],
    armL: [-0.3, 0, 0.75], face: -0.9, armR: [-1.05, 0, -0.05], elbowR: [0, 0, 0], pitch: 0.6 };
  ATTACK_POSES.kbCrown = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.1 },
    hits: [{ windup: high, strike: down, follow: { ...down, crouch: 0.35, lean: 0.5 } }] };

  // Gives Ground: struck, it springs back with a parting cut, then comes again with the reach.
  const recoil = { crouch: 0.3, lean: -0.2, legL: [-0.2, 0, 0], legR: [0.6, 0, 0], kneeR: [0.4, 0, 0], spin: [0, -0.6, 0], head: [0, 0.5, 0],
    armL: [-0.9, 0, -0.1], face: -1.6, armR: [-1.2, 0, -0.8], elbowR: [-0.3, 0, 0], pitch: 0.2 };
  const parting = { crouch: 0.2, lean: 0.05, legL: [-0.4, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.6, 0], chest: [0, 0.25, 0], head: [0, -0.4, 0],
    armL: [-0.7, 0, 0.2], face: -1.4, armR: [-1.3, 0, 0.7], elbowR: [0, 0, 0], pitch: 0.2 };
  ATTACK_POSES.kbGround = { ease: swing, lag: { weapon: 0.08 },
    hits: [{ windup: recoil, strike: parting, follow: parting }, { windup: drawn, strike: lunge, follow: { ...lunge, lean: 0.45 } }] };

  // The Turn: you are behind it; a look over its left shoulder, and the sword comes round.
  const turn = { crouch: 0.25, lean: 0.1, legL: [-0.3, 0, 0], legR: [0.4, 0, 0], spin: [0, -1.5, 0], chest: [0.05, -0.5, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armL: [-0.6, 0, 0.8], face: -1.0, armR: [-1.4, 0, -1.1], elbowR: [0, 0, 0], pitch: 0.2 };
  ATTACK_POSES.kbTurn = { ease: swing, lag: { weapon: 0.1 }, hits: [{
    windup: { crouch: 0.2, spin: [0, 0.9, 0], chest: [0, 0.3, 0], neck: [0, -0.5, 0], head: [0, -0.9, 0],
              armL: [-0.5, 0, 0.3], face: -1.3, armR: [-1.0, 0, 0.6], elbowR: [-1.2, 0, 0], pitch: 0.1 },
    strike: turn, follow: { ...turn, spin: [0, -1.75, 0] } }] };

  // The Shield's Rim: you are at its shield side; the shield is drawn across it and swung out, rim first.
  const rimIn = { ...stance, crouch: 0.2, spin: [0, -0.5, 0], head: [0, 0.6, 0], armL: [-0.7, 0, -0.55], face: -1.4, armR: [-0.4, 0, -0.3], pitch: 0.7 };
  const rimOut = { crouch: 0.22, lean: 0.15, legL: [-0.3, 0, 0.15], legR: [0.4, 0, 0], spin: [0, 0.6, 0], head: [0, 0.4, 0],
    armL: [-1.0, 0, 1.1], face: -1.3, armR: [-0.4, 0, -0.3], pitch: 0.7 };
  ATTACK_POSES.kbRim = { ease: swing, hits: [{ windup: rimIn, strike: rimOut, follow: rimOut }] };

  // ---- Ember-Worn ----
  // The Torch Taken Up (the phase opener): the sword raised straight up like a torch, its head thrown back; driven point
  // down into the ice, and the fire runs out from it.
  const torch = { crouch: 0.05, lean: -0.2, legL: [-0.3, 0, 0], legR: [0.25, 0, 0], chest: [-0.25, 0, 0], neck: [-0.2, 0, 0], head: [-0.4, 0, 0],
    armL: [-0.2, 0, 0.6], face: -0.5, armR: [-2.9, 0, 0.2], elbowR: [-0.25, 0, 0], pitch: -1.55 };
  const driven = { crouch: 0.5, lean: 0.45, legL: [-1.1, 0, 0], kneeL: [1.2, 0, 0], legR: [0.4, 0, 0], kneeR: [1.3, 0, 0], chest: [0.3, 0, 0], head: [0.25, 0, 0],
    armL: [-0.3, 0, 0.5], face: -0.4, armR: [-1.1, 0, 0.1], elbowR: [-0.2, 0, 0], pitch: 1.5 };
  ATTACK_POSES.kbTorch = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.06 },
    hits: [{ windup: torch, strike: driven, follow: driven }] };
  // Corvel Burns: the torch raised, held, shaking; driven down, and the fire runs out across the ice twice.
  ATTACK_POSES.kbCorvel = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.06 },
    hits: [{ windup: { ...torch, lean: -0.25, armR: [-3.0, 0, 0.15] }, strike: driven, follow: driven },
      { windup: { ...driven, head: [0.5, 0, 0] }, strike: { ...driven, head: [-0.35, 0, 0], chest: [0.1, 0, 0] }, follow: { ...driven, head: [-0.35, 0, 0], chest: [0.1, 0, 0] } }] };

  // The Hunger's Cuts: the Oath Guard gone hungry. Hunched behind the burning shield, the sword cocked over it; the shield
  // driven into you, the blade straight over its rim after it, then the sword raised high over the shield and down across.
  const hunch = { crouch: 0.34, lean: 0.4, legL: [-0.6, 0, 0], legR: [0.5, 0, 0], chest: [0.25, 0, 0], neck: [-0.15, 0, 0], head: [-0.2, 0, 0] };
  const brace = { ...hunch, spin: [0, 0.35, 0], head: [-0.2, -0.3, 0], armL: [-0.35, 0, 0.3], face: -1.2,
    armR: [-1.7, 0, -0.2], elbowR: [-1.35, 0, 0], pitch: 0.05 };
  const driveIn = { ...hunch, crouch: 0.3, lean: 0.5, legL: [-0.95, 0, 0], kneeL: [0.45, 0, 0], legR: [0.6, 0, 0], spin: [0, -0.35, 0], head: [-0.2, 0.3, 0],
    armL: [-1.4, 0, -0.2], face: -1.6, armR: [-1.7, 0, -0.2], elbowR: [-1.4, 0, 0], pitch: 0.0 };
  const overBrand = { ...driveIn, lean: 0.55, spin: [0, -0.1, 0], armL: [-1.1, 0, -0.15], face: -1.55, armR: [-1.6, 0, 0.2], elbowR: [-0.05, 0, 0], pitch: -0.15 };
  const overShield = { ...hunch, crouch: 0.26, lean: 0.2, spin: [0, -0.5, 0], chest: [0.1, -0.15, 0], head: [-0.1, 0.4, 0],
    armL: [-1.05, 0, -0.15], face: -1.6, armR: [-2.4, 0, -0.4], elbowR: [-0.6, 0, 0], pitch: -2.2 };
  const downAcross = { ...hunch, crouch: 0.42, lean: 0.5, legL: [-0.85, 0, 0], kneeL: [0.4, 0, 0], spin: [0, 0.5, 0], chest: [0.35, 0.2, 0], head: [-0.1, -0.3, 0],
    armL: [-0.6, 0, 0.6], face: -1.1, armR: [-0.85, 0, 0.5], elbowR: [0, 0, 0], pitch: 0.85 };
  ATTACK_POSES.kbHunger = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.08, armR: 0.05 },
    hits: [{ windup: brace, strike: driveIn, follow: driveIn }, { windup: driveIn, strike: overBrand, follow: { ...overBrand, lean: 0.6 } },
      { windup: overShield, strike: downAcross, follow: { ...downAcross, spin: [0, 0.7, 0] } }] };

  // The Ember Leaps: the Crown's Weight's roof, a leap, and down where you were.
  ATTACK_POSES.kbLeap = { ease: { windup: 'inOutCubic', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.06 },
    hits: [{ windup: { ...high, crouch: 0.3 }, strike: down, follow: { ...down, crouch: 0.4, lean: 0.5 } }] };

  // The Shield Burns: you are at its shield side; the burning shield flung out wide at you, then slammed flat into the ice.
  const shieldUp = { crouch: 0.22, lean: 0.05, legL: [-0.35, 0, 0.12], legR: [0.35, 0, 0], spin: [0, 0.7, 0], chest: [-0.1, 0.25, 0], head: [0, 0.45, 0],
    armL: [-1.3, 0, 1.35], face: -1.5, armR: [-0.4, 0, -0.3], pitch: 0.8 };   // flung out wide at arm's length on its shield side, not overhead
  const slammed = { crouch: 0.45, lean: 0.45, legL: [-0.9, 0, 0], kneeL: [0.8, 0, 0], legR: [0.5, 0, 0], kneeR: [0.8, 0, 0], spin: [0, 0.3, 0], chest: [0.3, 0.1, 0],
    armL: [-0.7, 0, 0.3], face: 0, armR: [-0.3, 0, -0.4], pitch: 0.9 };
  ATTACK_POSES.kbShieldBurns = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' },
    hits: [{ windup: shieldUp, strike: slammed, follow: slammed }] };

  // The refusal (every posture break): one knee down, the sword planted point-down in the ice before it, both hands on
  // the pommel, the shield let down at its side, its head bowed: as the champion knelt at Corvel, and kneels at the end.
  const refusal = { kneel: 1, lean: 0.12, chest: [0.12, 0, 0], neck: [0.25, 0, 0], head: [0.45, 0, 0],
    armR: [-0.75, 0, 0.3], elbowR: [-0.55, 0, 0], pitch: 1.57, armL: [-0.2, 0, 0.35], face: 0.1 };

  // Every `pitch` above becomes the weapon bone's angle and every `face` the left forearm's, past the posture (PST).
  const x = (q, b) => (q[b] ? q[b][0] : 0);
  const convert = q => {
    if (!q || !('pitch' in q || 'face' in q)) return q;
    const { pitch, face, ...rest } = q;
    if (rest.crouch) rest.crouch *= 0.6;   // a champion's stance: lower than it stands, never squatting
    const body = x(rest, 'chest') + (rest.lean || 0) + PST.chest[0];
    if (pitch != null) rest.weapon = [pitch - x(rest, 'armR') - x(rest, 'elbowR') - body - PST.armR[0] - PST.elbowR[0], 0, 0];
    if (face != null) rest.elbowL = [face - x(rest, 'armL') - body - PST.armL[0] - PST.elbowL[0], 0, 0];
    return rest;
  };
  for (const [id, P] of Object.entries(ATTACK_POSES)) if (id.startsWith('kb')) for (const h of P.hits) for (const k of ['windup', 'strike', 'follow']) h[k] = convert(h[k]);
  var KINGS_BLADE_REFUSAL = convert(refusal);   // (the boss below)
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const RING = (from, to, width, time) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time } });
  const THRUST = { w: 1.2, h: 1.4, d: 4.4, fwd: 2.6, y: 1.3 };
  const CUT = { w: 3.4, h: 2.2, d: 3.0, fwd: 1.7, y: 1.2 };
  const WAIST = { w: 4.6, h: 1.2, d: 3.2, fwd: 1.6, y: 1.1 };
  const CHOP = { w: 1.6, h: 3.0, d: 4.0, fwd: 2.2, y: 1.2 };
  const SHIELD = { w: 1.8, h: 2.0, d: 1.8, fwd: 1.2, y: 1.1 };
  const BLADE = {
    id: 'kingsBlade', model: 'kingsBlade', name: 'The King\'s Blade',
    description: 'The hunger in the last body it kept: the champion of Ashmere, red scarf, round shield, the King\'s sword. It fights as you fight: it waits behind the shield and answers. A blow into its Oath Guard is turned and answered; a heavy blow breaks it open. Past half the hunger takes the memory: the sword becomes the torch and the shield burns. Strike it as it raises the torch, and the memory refuses.',
    scale: 1.4, bulk: 1.0, radius: 0.55, color: 0x5a544e, weapon: 'sword', idle: 'sway',
    visual: { skin: 0x5a544e, roughness: 0.75, rim: 0.8 },
    hp: 3000,   // v7.65.0: a skilled player alone beats it in about a minute (tools/bot-fights.cjs, BOTS=1 CLEAN=1)
    poise: 200, speed: 3.1, turnRate: 4.0, trackRate: 2.0, approach: 0.7, kite: 0.1,
    cooldown: [1.98, 3.74], flinchTime: 0, staggerTime: 1.4, parriedTime: 1.8, deathFade: 6, noRepeat: 2,
    posture: { max: 84, parry: 60, chainGap: 1.8, chainMul: 1.3, decay: 4.5, breakTime: 3.0, hitstop: 0.2 },   // two parries break it
    brokenPose: KINGS_BLADE_REFUSAL,   // every break is the refusal at Corvel: knelt, the sword planted, head bowed
    // The round shield, as the player holds it: frontal blows while it is not attacking glance off (0.35 of the damage)
    // and fill its guard; a heavy far more. Flank it or punish what it swings. Gone once the Ember shows.
    guard: { arc: 0.9, damageMul: 0.35, knockMul: 0.3, lowerReach: 1.0, blockedMul: 0.4, breakers: ['heavy', 'jumpHeavy'],
             max: 100, heavy: 30, light: 10, decayDelay: 2.5, decay: 8, breakTime: 3.0, hitstop: 0.18 },
    defaultPhases: ['blade', 'emberWorn'],
    phases: {
      blade: { hp: 3000,
        attacks: ['oathGuard', 'theAnswer', 'keepingRiver', 'kingsReach', 'shieldWall', 'crownsWeight', 'givesGround', 'theTurn', 'rimStrike', 'reachPunish'] },
      // Past half the hunger takes the memory: the torch, the burning shield, and no guard.
      emberWorn: { at: 0.5, name: 'The King\'s Blade, Ember-Worn', ignite: true, opener: 'torchTaken', guard: null,
        cooldown: [1.32, 2.86], approach: 0.85, kite: 0.05, speed: 3.4, trackRate: 2.3,
        attacks: ['torchTaken', 'corvel', 'hungerCuts', 'emberLeap', 'shieldBurns', 'kingsReach', 'crownsWeight', 'keepingRiver', 'theTurn', 'reachPunish'] },
    },
    attacks: [
      // ---- the blade --------------------------------------------------------------------------------------------------
      // The Oath Guard: the shield high, the sword over its rim; it waits. Strike its front and it turns the blow and
      // answers; a heavy blow breaks the stance open; wait, or circle, and the sword comes over the rim (parry it).
      { id: 'oathGuard', name: 'The Oath Guard', anim: 'thrust', pose: 'kbOath', tracking: { rate: 3.2, commit: 0.85 }, markers: glint(0), chance: 1.3,
        hits: [{ startup: 1.9, active: 0.14, follow: 0.3, hold: { at: 0.75, time: [0.4, 1.4], chance: 0.6 }, counter: { answer: 'theAnswer', from: 0.12 } }], recovery: 1.6,
        damage: 32, poise: 50, postureDmg: 12, knock: 7, lunge: 2.0, range: 4.6, box: THRUST },
      // The Answer: only ever a blow turned on the Oath Guard; the shield into you, then the sword down across.
      { id: 'theAnswer', name: 'The Answer', anim: 'sweep', pose: 'kbAnswer', tracking: { rate: 3.4, commit: 0.75 }, markers: glint(1), chance: 0,
        hits: [{ startup: 0.42, active: 0.12, follow: 0.42, damage: 16, box: SHIELD, tell: 'shield' }, { startup: 0.5, active: 0.14, follow: 0.25 }], recovery: 1.6,
        damage: 30, poise: 55, postureDmg: 12, knock: 8, lunge: 1.4, range: 4, box: CUT },
      // Keeping the River: across at the waist; a step and up from low; the shield driven after it.
      { id: 'keepingRiver', name: 'Keeping the River', anim: 'sweep', pose: 'kbRiver', tracking: { rate: 2.8, commit: 0.65 }, markers: glint(0, 1), chance: 0.9,
        hits: [{ startup: 0.95, active: 0.16, follow: 0.42 },
               { startup: 0.45, active: 0.14, follow: 0.45, step: { from: 0.2, speed: 3, side: 0 }, box: CUT },
               { startup: 0.45, active: 0.12, follow: 0.2, damage: 14, box: SHIELD, tell: 'shield' }], recovery: 1.8,
        followUps: [{ attack: 'theTurn', if: 'behind', chance: 0.36 }],
        damage: 26, poise: 45, postureDmg: 10, knock: 6, lunge: 1.2, range: 3.8, box: WAIST },
      // The King's Reach: drawn back at the shoulder, held; a long lunge.
      { id: 'kingsReach', name: 'The King\'s Reach', anim: 'thrust', pose: 'kbReach', tracking: { rate: 3.0, commit: 0.75 }, markers: glint(0), chance: 0.7,
        hits: [{ startup: 1.15, active: 0.14, follow: 0.3, hold: { at: 0.6, time: [0.3, 1.1], chance: 0.55 } }], recovery: 1.8,
        damage: 36, poise: 55, postureDmg: 14, knock: 8, lunge: 5.0, range: 6.5, box: THRUST },
      // The Shield Wall: from off, a run behind the shield, the shield first; a cut over it. The shield cannot be parried.
      { id: 'shieldWall', name: 'The Shield Wall', anim: 'bash', pose: 'kbWall', noParry: true, tracking: { rate: 3.0, commit: 0.45 }, chance: 0.5, minRange: 4.5, dash: { speed: 10, from: 0.45 },
        hits: [{ startup: 0.95, active: 0.14, follow: 0.45, box: SHIELD, tell: 'shield' }, { startup: 0.55, active: 0.14, follow: 0.25, damage: 28, box: CUT }], recovery: 1.9,
        damage: 24, poise: 70, postureDmg: 12, knock: 10, lunge: 0, range: 11, box: SHIELD },
      // The Crown's Weight: the shield a roof over its head, the sword laid back under it, held; straight down.
      { id: 'crownsWeight', name: 'The Crown\'s Weight', anim: 'chop', pose: 'kbCrown', tracking: { rate: 2.2, commit: 0.6 }, markers: glint(0), chance: 0.6,
        hits: [{ startup: 1.3, active: 0.14, follow: 0.35, hold: { at: 0.6, time: [0.3, 1.0], chance: 0.5 }, impact: { ring: 1.8, crack: 1.0, dust: 10, shake: 0.08 } }], recovery: 2.1,
        followUps: [{ attack: 'keepingRiver', if: 'near', chance: 0.18 }],
        damage: 42, poise: 70, postureDmg: 18, knock: 8, lunge: 1.0, range: 4.0, box: CHOP },
      // Gives Ground: struck, it springs back with a parting cut, then comes again with the reach.
      { id: 'givesGround', name: 'Gives Ground', anim: 'sweep', pose: 'kbGround', when: 'struck', tracking: { rate: 3.0, commit: 0.7 }, markers: glint(1), chance: 0.8,
        hits: [{ startup: 0.45, active: 0.14, follow: 0.45, leap: { from: 0.15, max: 6, back: 4.5 }, box: CUT },
               { startup: 0.75, active: 0.14, follow: 0.3, damage: 34, box: THRUST }], recovery: 1.8,
        damage: 22, poise: 45, postureDmg: 10, knock: 6, lunge: 5.0, range: 3.4, box: CUT },
      // The Turn: behind it, a look over its shoulder; the sword comes round.
      { id: 'theTurn', name: 'The Turn', anim: 'sweep', pose: 'kbTurn', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 4,
        hits: [{ startup: 0.6, active: 0.16, follow: 0.3 }], recovery: 1.4,
        damage: 26, poise: 40, postureDmg: 10, knock: 8, lunge: 0, range: 3.4, box: { w: 4.6, h: 1.8, d: 4.6, fwd: -0.6, y: 1.1 } },
      // The Shield's Rim: at its shield side, the shield swung out at you, rim first.
      { id: 'rimStrike', name: 'The Shield\'s Rim', anim: 'bash', pose: 'kbRim', noParry: true, when: 'flank', tracking: { rate: 4, commit: 0.5 }, chance: 2,
        hits: [{ startup: 0.5, active: 0.14, follow: 0.2, tell: 'shield' }], recovery: 1.4,
        damage: 18, poise: 60, postureDmg: 8, knock: 9, lunge: 0.6, range: 2.8, box: { w: 2.6, h: 1.8, d: 2.4, fwd: 0.8, y: 1.1 } },
      // Drinking where it can see you: the reach, sooner and longer.
      { id: 'reachPunish', name: 'The King\'s Reach', anim: 'thrust', pose: 'kbReach', when: 'healing', tracking: { rate: 3.4, commit: 0.8 }, markers: glint(0), chance: 3,
        hits: [{ startup: 0.7, active: 0.16, follow: 0.35 }], recovery: 1.6,
        damage: 32, poise: 55, postureDmg: 12, knock: 8, lunge: 6.0, range: 7.5, box: THRUST },
      // ---- Ember-Worn ---------------------------------------------------------------------------------------------------
      // The Torch Taken Up (the phase opener): raised like a torch, driven into the ice; the fire runs out from it.
      // It cannot be hurt through it (as every boss's change).
      { id: 'torchTaken', name: 'The Torch Taken Up', anim: 'chop', pose: 'kbTorch', noParry: true, rollOnly: true, invulnerable: true, tracking: { rate: 1.6, commit: 0.5 }, chance: 0.1,
        hits: [{ startup: 1.6, active: 0.5, follow: 0.4, box: RING(0.6, 8, 1.4, 0.5), impact: { ring: 4.0, crack: 1.8, dust: 18, shake: 0.16 } }], recovery: 2.2,
        damage: 30, poise: 50, postureDmg: 0, knock: 9, lunge: 0, range: 7, box: RING(0.6, 8, 1.4, 0.5) },
      // Corvel Burns: the torch raised, held; three blows landed through it and the memory refuses (it kneels, open).
      // Otherwise it is driven down, and the fire runs out across the ice twice: roll each.
      { id: 'corvel', name: 'Corvel Burns', anim: 'chop', pose: 'kbCorvel', noParry: true, rollOnly: true, tracking: { rate: 1.6, commit: 0.4 }, chance: 0.35,
        hits: [{ startup: 2.4, active: 0.5, follow: 0.6, falter: { hits: 3 }, box: RING(0.6, 7, 1.4, 0.5), impact: { ring: 4.0, crack: 1.8, dust: 18, shake: 0.16 } },
               { startup: 0.7, active: 0.5, follow: 0.4, damage: 26, box: RING(0.6, 11, 1.6, 0.7) }], recovery: 2.4,
        damage: 34, poise: 60, postureDmg: 0, knock: 9, lunge: 0, range: 9, box: RING(0.6, 7, 1.4, 0.5) },
      // The Hunger's Cuts: the burning shield driven in, the blade over its rim, then raised over the shield and down across.
      { id: 'hungerCuts', name: 'The Hunger\'s Cuts', anim: 'sweep', pose: 'kbHunger', tracking: { rate: 3.2, commit: 0.7 }, markers: glint(0, 1, 2), chance: 0.9,
        hits: [{ startup: 0.72, active: 0.12, follow: 0.38, damage: 16, box: SHIELD, tell: 'shield', step: { from: 0.3, speed: 4, side: 0 } },
               { startup: 0.3, active: 0.12, follow: 0.42, box: THRUST },
               { startup: 0.6, active: 0.14, follow: 0.25, damage: 32, box: CHOP, step: { from: 0.2, speed: 3, side: 0 } }], recovery: 2.1,
        damage: 22, poise: 35, postureDmg: 8, knock: 5, lunge: 1.0, range: 3.6, box: { w: 4.0, h: 1.6, d: 3.0, fwd: 1.6, y: 1.0 } },
      // The Ember Leaps: raised high, a leap from far off, and down where you were, in fire.
      { id: 'emberLeap', name: 'The Ember Leaps', anim: 'chop', pose: 'kbLeap', noParry: true, tracking: { rate: 2.6, commit: 0.6 }, chance: 0.5, minRange: 5,
        hits: [{ startup: 1.2, active: 0.16, follow: 0.4, leap: { from: 0.35, max: 11, short: 1.2 }, impact: { ring: 3.0, crack: 1.6, dust: 16, shake: 0.14 } }], recovery: 2.4,
        damage: 44, poise: 80, postureDmg: 18, knock: 10, lunge: 0, range: 12, box: { w: 2.6, h: 2.6, d: 3.0, fwd: 1.0, y: 1.0 } },
      // The Shield Burns: at its shield side, the burning shield flung out wide and slammed into the ice.
      { id: 'shieldBurns', name: 'The Shield Burns', anim: 'stomp', pose: 'kbShieldBurns', noParry: true, rollOnly: true, when: 'flank', tracking: { rate: 1, commit: 0.4 }, chance: 1.5,
        hits: [{ startup: 0.8, active: 0.35, follow: 0.3, tell: 'shield', box: RING(0.4, 4, 1.2, 0.35), impact: { ring: 2.4, crack: 1.2, dust: 12, shake: 0.1 } }], recovery: 1.9,
        damage: 26, poise: 60, postureDmg: 0, knock: 9, lunge: 0, range: 3.5, box: RING(0.4, 4, 1.2, 0.35) },
    ],
  };
  ENEMY_DEFS.push(BLADE); ENEMY_BY_ID[BLADE.id] = BLADE;
}
