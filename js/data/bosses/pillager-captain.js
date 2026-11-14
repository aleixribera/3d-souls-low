'use strict';
// ============================================================================
// The Pillager Captain, Torch of Corvel (v7.41.0 figure; his own fight since pass 63), the boss of Level 3,
// js/levels/burning-town.js (STORY.md, part one)
// ============================================================================
// The Ashbound's commander, who put Corvel to the torch. He burns what he takes. He fights with a bill: a long haft with a
// cleaver's blade, a hook behind it and a spike on top, held in both hands. Cold, it teaches the town's lessons hard: a
// dashing thrust and three cuts to parry, an overhead cleave to roll, and the hook, swept low from his right, that does
// not knock you away but drags you in (a hit's `pull`) for the chop that follows (parry it). At half his strength he
// lights it: the pitch-soaked rags under the head catch, the edge glows (the phase's `reveal`, `ignite: 'weapon'`: his
// armour stays cold), and where the burning bill lands, fires stay on the floor and burn (a hit's `fire`,
// Enemy.noteFires, drawn by js/ground-fire.js). Step out of them; he fills his court with them.
//
// Every wind-up is his own. The haft levelled low at the hip, drawn back (the thrust); the bill raised high over his right
// shoulder (three cuts); the bill heaved up behind his head, his back arched (the cleave); the bill laid out low on his
// right, the hook turned toward you (the hook); wound right round, his back half to you (the reaping wheel); crouched, the
// blade dragged behind him along the floor (the furrow); the haft gripped short, a look back over his shoulder (haft
// back). Lit: the bill raised to the sky and the rags catching (kindling); the bill swung back low on his right, burning
// (the firebrand). He holds the haft in both hands (the model's `grip`, Rig.holdHaft): each key pose says where it
// points, `haft: [pitch, yaw, roll]` in his chest's heading (pitch 0 level ahead, -1.57 straight up, positive dips the
// head; yaw + to his left; roll turns the blade round the haft: 3.14 hangs it under a level haft and forward of an
// upright one, 4.7 to his left, 1.6 to his right; the hook is always on the other side).

// ---- his figure: built in Blender (tools/blender/captain.py), one piece per bone ----------------------------------------
// Blackened plate over mail, wearing no colours. A sallet with a keeled crown and a flared tail, a dark eye slit with the
// ember light behind it, a brow over the slit and a pointed bevor with breaths; iron ram horns curling from its temples. A
// gorget of lames, a keeled breastplate with rivets and a plackart; layered pauldrons with spikes; fanned couters,
// vambraces and gauntlets; a buckled belt, fauld lames and a mail skirt; scorched loincloths with a red rag of sash;
// cuisses, knee cops, keeled greaves and sabatons; a dark cloak torn into strips below the knee. The bill: an ash haft,
// iron-shod, a cleaver's blade, a recurved hook and a square spike, pitch-soaked rags wound under the head. Its `burn`
// slot (the lit edge, the hook's inner edge, fire in the rags) is hidden (`hidden`) until the lit phase reveals it.
{
  const MATS = {
    skin: { tex: 'paleSkin', tint: 0x6a5e58, decay: 0.85 },
    mail: { tex: 'dentedSteel', tint: 0x3e3c3a, decay: 0.9, size: 512 },
    iron: { tex: 'rustedIron', tint: 0x6a5e58, decay: 0.8 },
    plate: { tex: 'dentedSteel', tint: 0x3a3634, decay: 0.85, size: 512 },   // blackened (v7.41.0: 0x4a4644 read silver in the burning town)
    cloak: { tex: 'rottenCloth', tint: 0x4a3a36, decay: 0.8, size: 512, double: true, rim: 0.15 },   // broad sheets: edge-on they take the rim as white
    cloakHem: { tex: 'tatteredFabric', tint: 0x4a3a36, decay: 0.85, size: 512, double: true, rim: 0.15 },
    scorch: { tex: 'rottenCloth', tint: 0x7a3a2c, decay: 0.85, double: true },
    sash: { tex: 'rottenCloth', tint: 0xb03a22, decay: 0.5, double: true },
    leather: { tex: 'crackedLeather', tint: 0x56585a, decay: 0.8 },
    void: { tex: 'ashSoot', tint: 0x0a0908, decay: 0.9 },
    // the bill
    wood: { tex: 'paviseWood', tint: 0x6a5444, decay: 0.6 },
    blade: { tex: 'dentedSteel', tint: 0x8a8480, decay: 0.7, size: 512, rim: 0.5 },
    pitch: { tex: 'ashSoot', tint: 0x2a221c, decay: 0.9 },
    burn: { glow: 0xff6a20 },
    eye: { glow: 0xff7a30 },
  };
  MODEL_DEFS.pillagerCaptain = {
    extends: 'ashBase', faction: 'ashen', budget: 'boss', fit: 1.02, rim: 0.4,
    proportions: { shoulderX: 0.4, torsoW: 0.26, torsoD: 0.18, armR: 0.07, legR: 0.09, headR: 0.13, handR: 0.065, footLen: 0.32 },
    posture: { chest: [0.1, 0, 0], neck: [0.06, 0, 0], head: [0.02, 0, 0.03], elbowL: [-0.35, 0, 0], elbowR: [-0.4, 0, 0] },
    materials: MATS,
    body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
    bones: {
      loinF: { parent: 'spin', at: [0.0, -0.02, 0.17] }, loinB: { parent: 'spin', at: [0.0, -0.02, -0.17] },
      capeA: { parent: 'chest', at: [0, 0.58, -0.24] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] }, capeD: { parent: 'capeC', at: [0, -0.34, 0] },
    },
    parts: Object.entries({
      head: ['plate', 'plate.1', 'void', 'void.1', 'iron', 'iron.1'], neck: ['mail'],
      chest: ['plate', 'plate.1', 'iron'], spin: ['leather', 'iron', 'plate', 'mail'],
      loinF: ['scorch', 'sash'], loinB: ['scorch'],
      capeA: ['cloak'], capeB: ['cloak'], capeC: ['cloak'], capeD: ['cloakHem'],
      armL: ['mail', 'plate', 'iron'], armR: ['mail', 'plate', 'iron'],
      elbowL: ['plate', 'plate.1', 'plate.2'], elbowR: ['plate', 'plate.1', 'plate.2'],
      legL: ['mail', 'plate'], legR: ['mail', 'plate'],
      kneeL: ['plate', 'plate.1'], kneeR: ['plate', 'plate.1'],
      weapon: ['wood', 'blade', 'iron', 'pitch', 'burn'],
    }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `captain:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42,
      ...(bone === 'weapon' ? { weapon: true } : {}) }))),
    weapon: null,          // the bill is part of the figure (the `weapon: true` pieces above)
    hidden: ['burn'],      // the lit edge and the fire in the rags: shown by the lit phase's `reveal`
    grip: { span: [-0.7, 1.0], rest: [-0.95, 0.25, 3.14] },   // at rest the bill slants up across him, the blade toward you
    weaponRest: -1.0,      // where views that don't hold the haft (the codex, the finale) stand it
    embers: { head: [0, -0.05, 0.95] },   // the rags burning under the head (shown only while he burns: js/finale.js)
    eyes: { color: 0xff7a30, size: 0.018, spread: 0.05, at: [0, 0.135, 0.13] },
    anim: {
      idle: { breathRate: 1.1, breath: 0.015, headDrift: 0.03, sway: 0.01, twitch: 0 }, walk: { twist: 0.1, roll: 0.04, headNod: 0.04, elbow: 0.15, drag: 0 },
      flinch: { head: 0.4, chest: 0.4, arms: 0.4 }, death: { buckle: 1, slump: 0.8 },
      cloth: [{ bone: 'loinF', gain: 0.12, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.16, k: 50, damp: 4.5, flutter: 0.05 },
              { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 36, damp: 3.8, flutter: 0.045 },
              { bone: 'capeC', gain: 0.07, k: 32, damp: 3.4, flutter: 0.06, sideways: 1.2 }, { bone: 'capeD', gain: 0.1, k: 24, damp: 2.8, flutter: 0.09, sideways: 1.4 }],
    },
  };
}

// ---- key poses (js/data/attack-poses.js format) -------------------------------------------------------------------------
{
  const swing = { windup: 'inOutCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };

  // Dashing Thrust: the haft levelled low at his hip and drawn back, his weight on the back foot; he dashes and drives the
  // spike out at full reach.
  const hip = { crouch: 0.22, lean: 0.05, legL: [-0.5, 0, 0], legR: [0.5, 0, 0], spin: [0, -0.45, 0], chest: [0, -0.2, 0], neck: [0, 0.25, 0], head: [0, 0.3, 0],
    armR: [-0.35, 0, -0.2], elbowR: [-1.2, 0, 0], haft: [0.08, 0.15, 1.6], armL: [-0.9, 0, -0.3], elbowL: [-0.7, 0, 0] };
  // (pass 66) It ends tall, a fencer's lunge: the front knee bent, the back leg straight out behind, his right shoulder
  // turned in and both arms at full reach, the spike a little up, at your chest. No other strike ends standing this long.
  const driven = { crouch: 0.2, lean: 0.28, legL: [-0.85, 0, 0], kneeL: [0.55, 0, 0], legR: [0.6, 0, 0], spin: [0, 0.55, 0], chest: [0.05, 0.15, 0], neck: [0, -0.3, 0], head: [-0.1, -0.3, 0],
    armR: [-1.5, 0, 0.15], elbowR: [-0.05, 0, 0], haft: [-0.08, 0.12, 1.6], armL: [-1.45, 0, -0.25], elbowL: [-0.15, 0, 0] };
  ATTACK_POSES.pillagerThrust = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.06 },
    hits: [{ windup: hip, strike: driven, follow: { ...driven, lean: 0.32, legR: [0.65, 0, 0] } }] };

  // Three Cuts: the bill raised high over his right shoulder; cut down across to his left knee, back up across to his
  // right shoulder, then heaved overhead and brought straight down.
  const highRight = { crouch: 0.1, lean: -0.1, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.7, 0], chest: [-0.1, -0.3, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armR: [-2.5, 0, -0.5], elbowR: [-0.6, 0, 0], haft: [-1.1, -0.7, 3.9], armL: [-1.8, 0, -0.4], elbowL: [-0.9, 0, 0] };
  // (pass 66) The first cut ends upright and wound to his left, the bill run down past his left hip behind him.
  const lowLeft = { crouch: 0.14, lean: 0.12, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 1.0, 0], chest: [0.1, 0.4, 0], neck: [0, -0.3, 0], head: [0, -0.45, 0],
    armR: [-0.7, 0, 1.0], elbowR: [-0.05, 0, 0], haft: [0.6, 1.7, 3.9], armL: [-0.3, 0, 0.6], elbowL: [-0.7, 0, 0] };
  const upRight = { crouch: 0.12, lean: 0.05, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], spin: [0, -0.8, 0], chest: [-0.05, -0.35, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armR: [-2.0, 0, -0.7], elbowR: [-0.2, 0, 0], haft: [-0.6, -0.8, 0.8], armL: [-1.3, 0, -0.5], elbowL: [-0.6, 0, 0] };
  const heave = { crouch: 0.08, lean: -0.2, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], chest: [-0.25, 0, 0], head: [-0.05, 0, 0],
    armR: [-2.9, 0, 0.1], elbowR: [-0.8, 0, 0], haft: [-2.4, 0, 3.14], armL: [-2.7, 0, -0.15], elbowL: [-0.9, 0, 0] };
  // (pass 66) The third cut ends square on, feet wide, the bill stopped at knee height straight ahead of him.
  const chopped = { crouch: 0.16, lean: 0.04, legL: [-0.6, 0, -0.12], legR: [0.45, 0, 0.12], chest: [0.08, 0, 0], neck: [-0.1, 0, 0], head: [0.05, 0, 0],
    armR: [-1.05, 0, 0.05], elbowR: [-0.1, 0, 0], haft: [0.26, 0, 3.14], armL: [-0.95, 0, -0.05], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.pillagerThreeCuts = { ease: swing, lag: { weapon: 0.08, armR: 0.03 },
    hits: [{ windup: highRight, strike: lowLeft, follow: lowLeft }, { windup: { ...lowLeft, crouch: 0.2 }, strike: upRight, follow: upRight },
      { windup: heave, strike: chopped, follow: { ...chopped, crouch: 0.2 } }] };

  // Overhead Cleave: the bill heaved up and back behind his head, his back arched, held; brought down into the floor
  // ahead with all his weight.
  const arched = { crouch: 0.15, lean: -0.35, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], chest: [-0.4, 0, 0], neck: [-0.15, 0, 0], head: [-0.1, 0, 0],
    armR: [-3.0, 0, 0.15], elbowR: [-1.1, 0, 0], haft: [-2.75, 0, 3.14], armL: [-2.9, 0, -0.15], elbowL: [-1.2, 0, 0] };
  // (pass 66) It ends with the blade buried in the floor ahead, his back bent over the haft and his eyes up at you; then he
  // wrenches it out, haft twisting.
  const cleft = { crouch: 0.3, lean: 0.62, legL: [-1.0, 0, 0], kneeL: [0.5, 0, 0], legR: [0.7, 0, 0], kneeR: [0.15, 0, 0], chest: [0.55, 0, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0],
    armR: [-0.55, 0, 0], elbowR: [0, 0, 0], haft: [0.58, 0, 3.14], armL: [-0.5, 0, -0.05], elbowL: [-0.1, 0, 0] };
  const wrenched = { ...cleft, crouch: 0.34, lean: 0.4, spin: [0, -0.3, 0], chest: [0.4, -0.15, 0], elbowR: [-0.7, 0, 0], elbowL: [-0.6, 0, 0], haft: [0.5, -0.12, 2.7] };
  ATTACK_POSES.pillagerCleave = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.08 },
    hits: [{ windup: arched, strike: cleft, follow: wrenched }] };

  // The Hook: the bill laid out low on his right, the hook turned toward you, his eyes on you over his left shoulder; swept
  // across at your shins and hauled in (you with it); then a short chop down.
  const laidOut = { crouch: 0.3, lean: 0.2, legL: [-0.4, 0, 0], legR: [0.45, 0, 0], spin: [0, -1.0, 0], chest: [0.1, -0.3, 0], neck: [0, 0.4, 0], head: [0, 0.5, 0],
    armR: [-0.9, 0, -1.0], elbowR: [-0.1, 0, 0], haft: [0.45, -0.75, 1.6], armL: [-0.8, 0, -0.3], elbowL: [-0.8, 0, 0] };
  const hooked = { crouch: 0.32, lean: 0.25, legL: [-0.6, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.6, 0], chest: [0.15, 0.25, 0], neck: [0, -0.2, 0], head: [0, -0.3, 0],
    armR: [-1.1, 0, 0.4], elbowR: [-0.1, 0, 0], haft: [0.4, 0.5, 1.6], armL: [-0.7, 0, 0.4], elbowL: [-0.5, 0, 0] };
  // (pass 66) Hauled in: square in a wide horse stance, he leans away, both fists pulled to his right hip, the head trailing low across
  // to his left front where the hook has you.
  const hauledIn = { crouch: 0.34, lean: -0.3, legL: [0.05, 0, -0.42], kneeL: [0.35, 0, 0], legR: [0.1, 0, 0.42], kneeR: [0.35, 0, 0], spin: [0, -0.5, 0], chest: [-0.2, -0.3, 0], neck: [0, 0.2, 0], head: [0.05, 0.3, 0],
    armR: [0.2, 0, -0.3], elbowR: [-1.2, 0, 0], haft: [0.32, 0.6, 1.6], armL: [-0.4, 0, 0.3], elbowL: [-1.0, 0, 0] };
  const shortUp = { crouch: 0.12, lean: -0.05, legL: [-0.45, 0, 0], legR: [0.4, 0, 0], chest: [-0.15, 0, 0], head: [-0.05, 0, 0],
    armR: [-2.4, 0, 0.1], elbowR: [-1.0, 0, 0], haft: [-1.5, 0.05, 3.14], armL: [-2.1, 0, -0.1], elbowL: [-1.1, 0, 0] };
  // (pass 66) The chop after the hook is short and choked up, the haft angled across to his right, his weight back.
  const hookChop = { crouch: 0.2, lean: 0.12, legL: [-0.5, 0, 0], legR: [0.55, 0, 0], kneeR: [0.2, 0, 0], spin: [0, -0.3, 0], chest: [0.2, -0.15, 0], head: [0.1, 0.2, 0],
    armR: [-1.15, 0, -0.25], elbowR: [-0.6, 0, 0], haft: [0.66, -0.3, 3.14], armL: [-0.95, 0, 0.1], elbowL: [-1.0, 0, 0] };
  ATTACK_POSES.pillagerHook = { ease: swing, lag: { weapon: 0.1 },
    hits: [{ windup: laidOut, strike: hooked, follow: hauledIn }, { windup: shortUp, strike: hookChop, follow: { ...hookChop, crouch: 0.24 } }] };

  // The Reaping Wheel: wound right round, his back half to you, looking over his left shoulder; he turns full round with
  // the bill at full reach, and back the other way, low.
  const wound = { crouch: 0.22, lean: 0.1, legL: [-0.3, 0, 0], legR: [0.45, 0, 0], spin: [0, -1.5, 0], chest: [0, -0.45, 0], neck: [0, 0.6, 0], head: [0, 0.9, 0],
    armR: [-1.2, 0, -1.2], elbowR: [-0.1, 0, 0], haft: [0.1, -0.7, 4.7], armL: [-1.0, 0, -0.6], elbowL: [-0.6, 0, 0] };
  // (pass 66) The first turn ends tall, the bill at shoulder height and full reach.
  const wheeled = { crouch: 0.08, lean: -0.05, legL: [-0.45, 0, 0], legR: [0.4, 0, 0], spin: [0, 5.0, 0], chest: [-0.05, 0.4, 0], neck: [0, -0.3, 0], head: [0, -0.4, 0],
    armR: [-1.75, 0, 1.1], elbowR: [0, 0, 0], haft: [-0.2, 0.5, 4.7], armL: [-1.0, 0, 0.8], elbowL: [-0.4, 0, 0] };
  const reapBack = { crouch: 0.42, lean: 0.3, legL: [-0.55, 0, 0], kneeL: [0.3, 0, 0], legR: [0.5, 0, 0], spin: [0, 2.6, 0], chest: [0.25, -0.5, 0], neck: [0, 0.4, 0], head: [0, 0.6, 0],
    armR: [-1.2, 0, -1.0], elbowR: [0, 0, 0], haft: [0.45, -0.4, 1.6], armL: [-0.8, 0, -0.5], elbowL: [-0.5, 0, 0] };
  ATTACK_POSES.pillagerWheel = { ease: { ...swing, active: 'linear' }, lag: { weapon: 0.08, armR: 0.04 },
    hits: [{ windup: wound, strike: wheeled, follow: { ...wheeled, spin: [0, 5.4, 0] } }, { windup: { ...wheeled, spin: [0, 5.6, 0], crouch: 0.35 }, strike: reapBack, follow: { ...reapBack, spin: [0, 2.3, 0] } }] };

  // The Furrow: crouched, the blade dragged behind him on his right along the floor, sparks off the stones; dragged up
  // through the floor ahead of him, then a rising cut.
  const dragged = { crouch: 0.42, lean: 0.35, legL: [-0.6, 0, 0], legR: [0.55, 0, 0], spin: [0, -0.9, 0], chest: [0.3, -0.3, 0], neck: [0, 0.5, 0], head: [0, 0.6, 0],
    armR: [0.3, 0, -0.5], elbowR: [-0.1, 0, 0], haft: [0.35, -2.0, 3.14], armL: [-0.5, 0, -0.4], elbowL: [-0.8, 0, 0] };
  // (pass 66) It ends in a deep squat, twisted to his left, the blade flat along the floor ahead of his left foot.
  const scraped = { crouch: 0.55, lean: 0.35, legL: [-0.95, 0, -0.15], kneeL: [0.6, 0, 0], legR: [0.75, 0, 0.1], kneeR: [0.45, 0, 0], spin: [0, 0.6, 0], chest: [0.35, 0.25, 0], neck: [-0.15, 0, 0], head: [-0.15, -0.2, 0],
    armR: [-0.45, 0, 0.3], elbowR: [0, 0, 0], haft: [0.38, 0.45, 3.14], armL: [-0.25, 0, 0.3], elbowL: [-0.3, 0, 0] };
  const risen = { crouch: 0.08, lean: -0.15, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.2, 0], chest: [-0.2, 0.1, 0], head: [-0.15, 0, 0],
    armR: [-2.6, 0, 0.1], elbowR: [-0.2, 0, 0], haft: [-1.3, 0.05, 0], armL: [-2.2, 0, -0.1], elbowL: [-0.4, 0, 0] };
  ATTACK_POSES.pillagerFurrow = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.1 },
    hits: [{ windup: dragged, strike: scraped, follow: scraped }, { windup: { ...scraped, crouch: 0.5 }, strike: risen, follow: risen }] };

  // Haft Back: you are behind him; the haft gripped short in front of him, a look back over his right shoulder; the iron
  // shoe driven back into you.
  const gathered = { crouch: 0.15, spin: [0, -0.3, 0], chest: [0, -0.2, 0], neck: [0, -0.5, 0], head: [0, -1.0, 0],
    armR: [-1.1, 0, -0.1], elbowR: [-0.4, 0, 0], haft: [-0.1, 0.05, 3.14], armL: [-1.1, 0, -0.2], elbowL: [-0.3, 0, 0] };
  // (pass 66) He stands up tall, feet together, and leans back into you, turned half round, both fists pulled to his right hip so the shoe drives out behind.
  const rammed = { crouch: 0.03, lean: -0.22, legL: [-0.05, 0, -0.05], legR: [0.12, 0, 0.05], spin: [0, -0.7, 0], chest: [-0.15, -0.35, 0], neck: [0, -0.6, 0], head: [0, -1.0, 0],
    armR: [0.5, 0, -0.25], elbowR: [-1.3, 0, 0], haft: [0.15, 0.1, 3.14], armL: [0.3, 0, -0.1], elbowL: [-1.4, 0, 0] };
  ATTACK_POSES.pillagerHaftBack = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.05 },
    hits: [{ windup: gathered, strike: rammed, follow: rammed }] };

  // ---- lit (second phase) ----
  // Kindling (the phase opener): the bill raised to the sky in both hands, the rags catching; driven down head-first at
  // his feet, and the fire runs out round him.
  const skyward = { crouch: 0.25, lean: -0.15, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], chest: [-0.3, 0, 0], neck: [-0.3, 0, 0], head: [-0.55, 0, 0],
    armR: [-3.0, 0, 0.15], elbowR: [-0.2, 0, 0], haft: [-1.6, 0, 3.14], armL: [-2.9, 0, -0.15], elbowL: [-0.3, 0, 0] };
  // (pass 66) He ends on one knee, the bill planted head-first at his feet like a stake, his head bowed over it.
  const grounded = { crouch: 0.6, lean: 0.15, legL: [-1.25, 0, 0], kneeL: [1.2, 0, 0], legR: [0.35, 0, 0], kneeR: [1.4, 0, 0], chest: [0.25, 0, 0], neck: [0.2, 0, 0], head: [0.35, 0, 0],
    armR: [-1.7, 0, 0], elbowR: [-1.2, 0, 0], haft: [1.25, 0, 3.14], armL: [-1.75, 0, -0.1], elbowL: [-1.25, 0, 0] };
  ATTACK_POSES.pillagerKindling = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [{ windup: skyward, strike: grounded, follow: grounded }] };

  // The Firebrand: the burning bill swung back low on his right; a wide sweep across in front of him that leaves a crescent
  // of fire, then the haft levelled and the spike driven through it at you.
  const brandBack = { crouch: 0.3, lean: 0.15, legL: [-0.4, 0, 0], legR: [0.5, 0, 0], spin: [0, -1.1, 0], chest: [0.05, -0.35, 0], neck: [0, 0.4, 0], head: [0, 0.55, 0],
    armR: [-1.0, 0, -1.1], elbowR: [-0.1, 0, 0], haft: [0.3, -0.9, 4.7], armL: [-0.9, 0, -0.3], elbowL: [-0.8, 0, 0] };
  // (pass 66) The sweep ends side-on in a wide straddle, one-handed at full reach out to his left, the left hand let go and flung back.
  const brandAcross = { crouch: 0.3, lean: 0.12, legL: [-0.25, 0, -0.5], kneeL: [0.3, 0, 0], legR: [0.2, 0, 0.45], spin: [0, 1.3, 0], chest: [0.15, 0.45, 0], neck: [0, -0.4, 0], head: [0, -0.5, 0],
    armR: [-1.3, 0, 1.25], elbowR: [0, 0, 0], haft: [0.3, 1.4, 4.7], grip: false, armL: [-0.2, 0, -0.9], elbowL: [-0.3, 0, 0] };
  // (pass 66) Then the haft raised over his right shoulder, the spike down at you, and stabbed down through the flames.
  const overhand = { crouch: 0.14, lean: -0.05, legL: [-0.45, 0, 0], legR: [0.45, 0, 0], spin: [0, -0.55, 0], chest: [-0.1, -0.25, 0], neck: [0, 0.3, 0], head: [0, 0.35, 0],
    armR: [-2.4, 0, -0.35], elbowR: [-1.4, 0, 0], haft: [-0.3, 0.1, 1.6], armL: [-1.5, 0, -0.3], elbowL: [-0.7, 0, 0] };
  const stabbed = { crouch: 0.2, lean: 0.25, legL: [-0.85, 0, 0], kneeL: [0.45, 0, 0], legR: [0.55, 0, 0], spin: [0, 0.35, 0], chest: [0.25, 0.15, 0], head: [0.15, -0.15, 0],
    armR: [-1.35, 0, 0.1], elbowR: [-0.1, 0, 0], haft: [0.2, 0.06, 1.6], armL: [-0.95, 0, -0.1], elbowL: [-0.35, 0, 0] };
  ATTACK_POSES.pillagerFirebrand = { ease: swing, lag: { weapon: 0.1, armR: 0.04 },
    hits: [{ windup: brandBack, strike: brandAcross, follow: { ...brandAcross, spin: [0, 1.5, 0] } }, { windup: overhand, strike: stabbed, follow: { ...stabbed, crouch: 0.24 } }] };
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const RING = (from, to, width, time) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time } });
  const THRUST = { w: 1.2, h: 1.6, d: 3.0, fwd: 1.8, y: 1.2 };
  const CUT = { w: 3.4, h: 1.6, d: 2.8, fwd: 1.6, y: 1.2 };
  const CHOP = { w: 1.6, h: 2.8, d: 3.4, fwd: 1.9, y: 1.1 };
  const CLEAVE = { w: 1.8, h: 3.0, d: 3.8, fwd: 2.1, y: 1.2 };
  const HOOK = { w: 5.4, h: 1.0, d: 3.2, fwd: 1.9, y: 0.55 };         // at the shins: roll it (it cannot be parried or blocked)
  const WHEEL = { w: 6.6, h: 1.6, d: 6.6, fwd: 0, y: 1.1 }, WHEEL_LOW = { ...WHEEL, h: 0.9, y: 0.45 };
  const FURROW = { w: 1.6, h: 0.7, d: 5.6, fwd: 3.0, y: 0.35, ground: true };
  const RISE = { w: 1.6, h: 3.0, d: 3.0, fwd: 1.6, y: 1.4 };
  const BUTT = { w: 1.5, h: 1.6, d: 2.2, fwd: -1.3, y: 1.1 };
  const SWEEP = { w: 6.6, h: 1.4, d: 3.6, fwd: 2.0, y: 1.0 };
  // Fires (a hit's `fire`): where they stand [m ahead, m to his left], how wide, how long, how hot.
  const arc = (R, angles) => angles.map(a => [+(R * Math.cos(a)).toFixed(2), +(R * Math.sin(a)).toFixed(2)]);
  const FIRE = (at, r = 1.0, time = 6, dps = 12) => ({ at, r, time, dps });
  // Lit: the same attack, burning: an id, a name and fires laid by the hits named.
  const lit = (a, id, name, fires) => ({ ...JSON.parse(JSON.stringify(a)), id, name,
    hits: a.hits.map((h, i) => (fires[i] ? { ...JSON.parse(JSON.stringify(h)), fire: fires[i] } : JSON.parse(JSON.stringify(h)))) });

  // ---- cold --------------------------------------------------------------------------------------------------------------
  // Dashing Thrust: levelled at the hip and drawn back; a dash and the spike at full reach. Parry it.
  const thrust = { id: 'captainThrust', name: 'Dashing Thrust', anim: 'thrust', pose: 'pillagerThrust', tracking: { rate: 2.6, commit: 0.4 }, markers: glint(0), minRange: 4.5, dash: { speed: 10.5, from: 0.45 },
    hits: [{ startup: 1.05, active: 0.16, follow: 0.2 }], recovery: 1.02, damage: 34, poise: 50, knock: 7, lunge: 2.5, range: 10, box: THRUST };
  // Three Cuts: down across, back up across, then straight down. Parry all three.
  const threeCuts = { id: 'captainCombo', name: 'Three Cuts', anim: 'sweep', pose: 'pillagerThreeCuts', tracking: { rate: 3.2, commit: 0.75 }, markers: glint(0, 1, 2),
    hits: [{ startup: 0.75, active: 0.14, follow: 0.18 }, { startup: 0.45, active: 0.14, follow: 0.18 }, { startup: 0.85, active: 0.16, follow: 0.3, box: CHOP, damage: 28 }],
    followUps: [{ attack: 'captainHaftBack', if: 'behind', chance: 0.4 }],
    recovery: 0.95, damage: 22, poise: 30, knock: 5, lunge: 1.8, range: 2.8, box: CUT };
  // Overhead Cleave: heaved back behind his head, held; down into the floor. Roll it.
  const cleave = { id: 'captainOverhead', name: 'Overhead Cleave', anim: 'chop', pose: 'pillagerCleave', tracking: { rate: 2.2, commit: 0.5 }, rollOnly: true, chance: 0.4,
    hits: [{ startup: 1.45, active: 0.14, follow: 0.4, hold: { at: 0.55, time: [0.4, 1], chance: 0.6 }, impact: { ring: 2.6, crack: 1.4, dust: 12, shake: 0.1 } }],
    recovery: 1.32, damage: 58, poise: 80, knock: 8, lunge: 1.4, range: 3.2, box: CLEAVE };
  // The Hook: laid out low on his right; swept at your shins and hauled in, you with it (roll it: nothing stops it but a
  // roll); then a short chop where it dragged you (parry it).
  const hook = { id: 'captainHook', name: 'The Hook', anim: 'sweep', pose: 'pillagerHook', tracking: { rate: 2.6, commit: 0.65 }, markers: glint(1), chance: 0.55,
    hits: [{ startup: 1.1, active: 0.16, follow: 0.3, pull: 1.5, damage: 14, box: HOOK },
           { startup: 0.5, active: 0.14, follow: 0.3, still: true }], recovery: 1.5,
    damage: 30, poise: 50, knock: 6, lunge: 0.8, range: 4.0, box: CHOP };
  // The Reaping Wheel: wound right round; full round at full reach, then back the other way, low. Roll the first; jump
  // or roll the second.
  const wheel = { id: 'captainWheel', name: 'The Reaping Wheel', anim: 'sweep', pose: 'pillagerWheel', noParry: true, tracking: { rate: 2.0, commit: 0.55 }, chance: 0.45,
    hits: [{ startup: 1.15, active: 0.2, follow: 0.1, box: WHEEL }, { startup: 0.55, active: 0.2, follow: 0.35, damage: 22, box: WHEEL_LOW }], recovery: 1.92,
    damage: 26, poise: 45, knock: 7, lunge: 0.5, range: 3.6, box: WHEEL };
  // The Furrow: the blade dragged behind him along the floor, then up through the floor ahead (roll or jump), then a
  // rising cut (parry it).
  const furrow = { id: 'captainFurrow', name: 'The Furrow', anim: 'chop', pose: 'pillagerFurrow', tracking: { rate: 2.4, commit: 0.65 }, markers: glint(1), minRange: 2.5, chance: 0.5,
    hits: [{ startup: 1.2, active: 0.18, follow: 0.12, line: true, noParry: true, box: FURROW, impact: { ring: 1.6, crack: 2.4, dust: 16, shake: 0.08 } },
           { startup: 0.5, active: 0.14, follow: 0.3, damage: 26, box: RISE }], recovery: 1.2,
    damage: 28, poise: 45, knock: 6, lunge: 0, range: 6.0, box: FURROW };
  // Haft Back: you are behind him; a look back over his shoulder and the iron shoe rammed into you.
  const haftBack = { id: 'captainHaftBack', name: 'Haft Back', anim: 'thrust', pose: 'pillagerHaftBack', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 4,
    hits: [{ startup: 0.6, active: 0.14, follow: 0.25 }], recovery: 1.1, damage: 20, poise: 40, knock: 9, lunge: 0, range: 2.6, box: BUTT };
  // Drinking where he can see it: the thrust, sooner.
  const thrustPunish = { ...JSON.parse(JSON.stringify(thrust)), id: 'captainThrustPunish', when: 'healing', minRange: 0, chance: 3,
    hits: [{ startup: 0.7, active: 0.16, follow: 0.2 }], tracking: { rate: 3.2, commit: 0.6 } };

  // ---- lit ---------------------------------------------------------------------------------------------------------------
  // Kindling (the phase opener): the bill raised to the sky, the rags catch; driven down at his feet, a ring of fire runs
  // out along the floor (jump or roll it) and fires stand round him. He cannot be hurt through it (as every boss's change).
  const kindling = { id: 'captainKindling', name: 'Kindling', anim: 'stomp', pose: 'pillagerKindling', noParry: true, rollOnly: true, invulnerable: true, tracking: { rate: 1.6, commit: 0.5 }, chance: 0.1,
    hits: [{ startup: 1.6, active: 0.5, follow: 0.4, box: RING(0.6, 7.0, 1.3, 0.55), impact: { ring: 4.0, crack: 1.4, dust: 18, shake: 0.16 },
      fire: FIRE(arc(4.6, [0, 1.05, 2.1, 3.14, 4.19, 5.24]), 1.2, 9, 12) }], recovery: 2.1,
    damage: 28, poise: 50, knock: 8, lunge: 0, range: 6, box: RING(0.6, 7.0, 1.3, 0.55) };
  // The Firebrand: swung back low and burning; a wide sweep that leaves a crescent of fire ahead of him (roll it), then
  // the spike driven through the flames at you (parry it).
  const firebrand = { id: 'captainFirebrand', name: 'The Firebrand', anim: 'sweep', pose: 'pillagerFirebrand', tracking: { rate: 2.4, commit: 0.6 }, markers: glint(1), chance: 0.6,
    hits: [{ startup: 1.15, active: 0.18, follow: 0.15, noParry: true, box: SWEEP, fire: FIRE(arc(3.3, [-1.0, -0.5, 0, 0.5, 1.0]), 0.95, 7, 12) },
           { startup: 0.6, active: 0.16, follow: 0.3, damage: 30, box: { ...THRUST, d: 3.4, fwd: 2.2 } }], recovery: 1.5,
    damage: 26, poise: 45, knock: 6, lunge: 0.6, range: 4.0, box: SWEEP };
  // Burning variants: the finishing chop, the cleave and the furrow leave fire where they land.
  const cutsLit = lit(threeCuts, 'captainComboLit', 'Three Burning Cuts', { 2: FIRE([[2.2, 0]], 1.1, 6) });
  const cleaveLit = lit(cleave, 'captainOverheadLit', 'Burning Cleave', { 0: FIRE([[2.6, 0], [4.1, 0.2], [5.6, -0.2]], 1.0, 7) });
  const furrowLit = lit(furrow, 'captainFurrowLit', 'Burning Furrow', { 0: FIRE([[1.6, 0], [3.1, 0], [4.6, 0]], 0.9, 7) });

  const CAPTAIN = {
    id: 'pillagerCaptain', model: 'pillagerCaptain', name: 'Pillager Captain',
    description: 'The Ashbound\'s commander, who put Corvel to the torch. He burns what he takes. His bill thrusts from afar, cuts three times (parry them), cleaves from above (roll it), and its hook sweeps your legs and drags you in for the chop. At half his strength he lights it: where the burning bill lands, fire stays on the floor. Step out of it.',
    scale: 1.45, bulk: 1.25, radius: 0.66, color: 0x3a2c28, weapon: 'spear', idle: 'guard',
    visual: { skin: 0x4a4440, skinMetal: 0.4, metal: 0.35, roughness: 0.55, rim: 0.9, cloak: true },   // blackened mail, a dark cloak (the rags' embers: the model's)
    // hp and posture: the old Captain's (v7.41.0), now over two phases on one bar.
    hp: 1800, poise: 200, speed: 2.4, turnRate: 3.4, trackRate: 1.6, approach: 0.55, kite: 0.15,
    cooldown: [1.18, 2.35], flinchTime: 0, staggerTime: 1.4, parriedTime: 1.9,
    posture: { max: 70, parry: 24, chainGap: 1.8, chainMul: 1.35, decay: 5, breakTime: 3.2, hitstop: 0.2 },
    defaultPhases: ['cold', 'lit'],
    phases: {
      cold: { hp: 1800, attacks: ['captainThrust', 'captainCombo', 'captainOverhead', 'captainHook', 'captainWheel', 'captainFurrow', 'captainHaftBack', 'captainThrustPunish'] },
      // At half his strength he lights the bill: only the bill burns (his armour stays cold), and it leaves fire behind.
      lit: { at: 0.5, name: 'The Pillager Captain, Torch of Corvel', opener: 'captainKindling', ignite: 'weapon', reveal: ['burn'],
        revealBurst: { color: 0xff6a20, count: 40, speed: 6 },
        cooldown: [1.0, 2.1], approach: 0.75, kite: 0.05, speed: 2.7, trackRate: 1.9,
        attacks: ['captainKindling', 'captainThrust', 'captainComboLit', 'captainOverheadLit', 'captainHook', 'captainWheel', 'captainFurrowLit', 'captainFirebrand',
                  'captainHaftBack', 'captainThrustPunish'] },
    },
    attacks: [thrust, threeCuts, cleave, hook, wheel, furrow, haftBack, thrustPunish, kindling, firebrand, cutsLit, cleaveLit, furrowLit],
  };
  ENEMY_DEFS.push(CAPTAIN); ENEMY_BY_ID[CAPTAIN.id] = CAPTAIN;
}
