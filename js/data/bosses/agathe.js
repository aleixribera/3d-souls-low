'use strict';
// ============================================================================
// Mother Agathe, the Rending Hand (v7.48.0; her own since pass 48), the boss of Level 12, js/levels/torn-abbey.js
// (STORY.md 10h), and the Rending Brothers, her monks
// ============================================================================
// The abbess who held the knife when Thrale's monks tried to cut the Ember out of the earth and tore the hill loose into the
// storm. She did not let go, and she still does not: what her great hook tears out of you, she keeps. An unblocked blow of
// the hook's blade (an attack's `rend`) tears a piece off your health bar and it hangs on the hook, a coal of your own red
// (Player.rend, drawn by js/storm-rend.js); every blow you land on her tears one back, as health; left there, the wound
// closes and the bar comes back empty. Fight her close, take back what she took. The butt of the haft never rends (the
// correction), nor do the stones and the earth she tears up. At half her strength the storm comes at her back: every blow
// of the hook rends (the phase's `rend`), lightning seams the hook, and the storm falls where you stand (a hit's `bolt`,
// Enemy.noteBolt): a mark on the floor follows you, holds still, and is struck. Step off it.
//
// Every wind-up is her own. The hook laid out far to her right, low (the reaping draw); the haft levelled straight at you,
// held (the crook); the haft turned butt-first across her breast like a staff (the correction); the hook trailing behind
// her right heel, her head bowed to your feet (hook and haul); the hook raised high on her left, her left foot forward
// (rend the earth); crouched, the hook dragged behind her left through the rubble (torn stones); the hook planted before
// her, hauling back on it (the cornerstone); the haft hugged upright, a look over her right shoulder (the turning hook).
// In the storm: the hook lifted to the sky in both hands, crouched under it (the storm comes); the hook held up in her
// right hand alone, her left palm open to the clouds (the storm knows its own); the hook wound round behind her back, her
// back to you (the gale reap); a deep crouch, the hook trailing, and a spring (the hook from the storm). She holds the haft
// in both hands (the model's `grip`, Rig.holdHaft, pass 53): each key pose says where it points, `haft: [pitch, yaw, roll]`
// in her chest's heading (pitch 0 level ahead, -1.57 straight up, positive dips the hook; yaw + to her left; roll the
// crescent's turn round the haft: 3.14 hangs it under a level haft and forward of an upright one, 4.7 to her left, 1.6 to
// her right), and her left hand closes on it `grip` along it (false: let go).

// ---- her figure: built in Blender (tools/blender/agathe.py), one piece per bone ----------------------------------------
// A gaunt old face in a white coif under a black veil that falls to the shoulders and on as a long torn mantle; a white
// guimpe, a black habit to the floor, a storm-grey scapular torn at the hem, a rope cincture; a rosary of rough stones and
// the abbey's sign (a ring with a hook through it) on an iron chain; wide bell sleeves, long bony hands bound in linen.
// The great hook: an ash haft taller than a man, iron-shod, a crescent blade as long as an arm, prayer cloths under it.
// `storm` slots (a seam of lightning along the hook's inner edge, the sign on her breast) show only in the storm.
const AGATHE_TILE = { skin: 0.12, linen: 0.2, scap: 0.25 };   // (pass 53) finer grain on the small, close-seen parts: a face's pores, linen's weave
MODEL_DEFS.motherAgathe = {
  extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.45,
  proportions: { shoulderX: 0.38, torsoW: 0.22, torsoD: 0.17, armR: 0.065, legR: 0.085, headR: 0.12, handR: 0.06, footLen: 0.3 },
  posture: { chest: [0.06, 0, 0], neck: [0.08, 0, 0], head: [-0.06, 0, 0], elbowL: [-0.35, 0, 0], elbowR: [-0.5, 0, 0] },   // a little stooped, head up
  materials: {
    skin: { tex: 'paleSkin', tint: 0x9c9084, decay: 0.1, rim: 0.15 },   // weathered, a shade under the linen so the face reads in it
    linen: { tex: 'abbeyLinen', tint: 0xffffff, decay: 0.15, rim: 0.3 },
    habit: { tex: 'abbessWool', tint: 0xffffff, decay: 0.2, double: true, rim: 0.25 },   // black wool, no brown in it
    scap: { tex: 'abbeyStorm', tint: 0xffffff, decay: 0.3, double: true, rim: 0.3 },   // storm-grey
    iron: { tex: 'rustedIron', tint: 0x6a6460, decay: 0.75, rim: 0.4 },
    rope: { tex: 'crackedLeather', tint: 0x9a9080, decay: 0.6 },
    wood: { tex: 'paviseWood', tint: 0x8a7258, decay: 0.6 },
    steel: { tex: 'glaiveSteel', tint: 0xc0c4ca, decay: 0.45, rim: 0.5 },
    wrap: { tex: 'sentinelRags', tint: 0xc8bea8, decay: 0.4, double: true },
    leather: { tex: 'rogueLeather', tint: 0x3a3028, decay: 0.7 },
    storm: { glow: 0xb8d4ff, storm: true },
    eye: { glow: 0x5a6478 },
  },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0, -0.02, -0.2] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.24] }, capeB: { parent: 'capeA', at: [0, -0.44, -0.06] }, capeC: { parent: 'capeB', at: [0, -0.44, -0.04] },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    head: ['skin', 'linen', 'habit'], chest: ['habit', 'habit.1', 'linen', 'scap', 'scap.1', 'rope', 'iron', 'storm'], spin: ['habit', 'rope'],
    loinF: ['habit', 'scap', 'rope'], loinB: ['habit', 'scap'], capeA: ['habit'], capeB: ['habit'], capeC: ['habit'],
    armL: ['habit'], armR: ['habit'], elbowL: ['habit', 'skin', 'wrap'], elbowR: ['habit', 'skin', 'wrap'],
    legL: ['habit'], legR: ['habit'], kneeL: ['habit', 'leather'], kneeR: ['habit', 'leather'],
    weapon: ['wood', 'steel', 'iron', 'wrap', 'storm'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `agathe:${bone}__${s}`, bone, slot: s.split('.')[0], tile: AGATHE_TILE[s.split('.')[0]] ?? 0.42,
    ...(bone === 'weapon' ? { weapon: true } : {}) }))),
  weapon: null,          // the great hook is part of the figure (the `weapon: true` pieces above)
  grip: { span: [-0.75, 1.15], rest: [-1.45, 0, 3.14] },
  weaponRest: -1.0,   // where views that don't hold the haft (the codex, the finale) stand it   // at rest the haft stands upright at her side like a shepherd's crook, the hook over her head
  eyes: { color: 0x5a6478, size: 0.005, spread: 0.031, at: [0, 0.126, 0.047], halo: 0 },   // a dull gleam deep in their sockets
  anim: {
    idle: { breathRate: 0.6, breath: 0.012, headDrift: 0.025, sway: 0.01, twitch: 0 }, walk: { twist: 0.05, roll: 0.03, headNod: 0.02, elbow: 0.08, drag: 0.08 },
    flinch: { head: 0.3, chest: 0.3, arms: 0.25 }, death: { buckle: 0.9, slump: 0.9 },
    cloth: [{ bone: 'loinF', gain: 0.12, k: 56, damp: 5.2, flutter: 0.05 }, { bone: 'loinB', gain: 0.16, k: 50, damp: 4.8, flutter: 0.06 },
      { bone: 'capeA', gain: 0.14, k: 38, damp: 4.2, flutter: 0.05 }, { bone: 'capeB', gain: 0.18, k: 32, damp: 3.6, flutter: 0.07 },
      { bone: 'capeC', gain: 0.24, k: 26, damp: 3.0, flutter: 0.1 }],
  },
};

// ---- key poses (js/data/attack-poses.js format) -------------------------------------------------------------------------
{
  const swing = { windup: 'inOutCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };

  // The Reaping Draw: the hook laid out far to her right, low, her eyes on you over her left shoulder; a wide reap across to
  // her left, then the hook drawn back low through your knees to her right, and hauled in.
  const laidOut = { crouch: 0.2, lean: 0.1, legL: [-0.35, 0, 0], legR: [0.4, 0, 0], spin: [0, -1.0, 0], chest: [0, -0.3, 0], neck: [0, 0.4, 0], head: [0, 0.5, 0],
    armR: [-1.1, 0, -1.1], elbowR: [-0.1, 0, 0], haft: [0.3, -0.6, 4.9], armL: [-0.9, 0, -0.3], elbowL: [-0.8, 0, 0] };
  const reaped = { crouch: 0.22, lean: 0.25, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.9, 0], chest: [0.1, 0.3, 0], neck: [0, -0.3, 0], head: [0, -0.4, 0],
    armR: [-1.4, 0, 0.6], elbowR: [0, 0, 0], haft: [0.2, 0.7, 4.9], armL: [-0.6, 0, 0.6], elbowL: [-0.5, 0, 0] };
  const drawn = { crouch: 0.38, lean: 0.25, legL: [-0.6, 0, 0], kneeL: [0.4, 0, 0], legR: [0.5, 0, 0], spin: [0, -0.8, 0], chest: [0.2, -0.3, 0], head: [0, 0.3, 0],
    armR: [-0.7, 0, -0.9], elbowR: [-0.1, 0, 0], haft: [0.45, -0.6, 4.9], armL: [-0.7, 0, -0.2], elbowL: [-0.7, 0, 0] };
  const hauledIn = { ...drawn, crouch: 0.3, lean: 0.05, armR: [-0.35, 0, -0.5], elbowR: [-1.1, 0, 0], haft: [-0.5, -0.3, 4.9] };
  ATTACK_POSES.agatheReapingDraw = { ease: { ...swing, windup: 'inOutSine' }, lag: { weapon: 0.1, armR: 0.04 },
    hits: [{ windup: laidOut, strike: reaped, follow: { ...reaped, spin: [0, 1.1, 0] } }, { windup: { ...reaped, crouch: 0.32 }, strike: drawn, follow: hauledIn }] };

  // The Crook: the haft levelled straight at you at shoulder height in both hands, held; a long reach that lays the hook
  // past you, and then she hauls it home through you.
  const levelled = { crouch: 0.08, lean: -0.1, legL: [-0.4, 0, 0], legR: [0.4, 0, 0], chest: [-0.1, 0, 0], head: [-0.05, 0, 0],
    armR: [-1.45, 0, 0.1], elbowR: [-0.7, 0, 0], haft: [-0.05, 0.12, 3.14], armL: [-1.35, 0, -0.25], elbowL: [-0.25, 0, 0] };
  const reached = { crouch: 0.22, lean: 0.45, legL: [-0.95, 0, 0], kneeL: [0.5, 0, 0], legR: [0.55, 0, 0], chest: [0.15, 0, 0], head: [-0.2, 0, 0],
    armR: [-1.75, 0, 0.05], elbowR: [0, 0, 0], haft: [-0.1, 0.1, 3.14], armL: [-1.7, 0, -0.1], elbowL: [-0.05, 0, 0] };
  const hauled = { crouch: 0.28, lean: -0.2, legL: [-0.5, 0, 0], legR: [0.55, 0, 0], kneeR: [0.3, 0, 0], chest: [-0.2, 0, 0], head: [0.05, 0, 0],
    armR: [-0.55, 0, -0.2], elbowR: [-1.6, 0, 0], haft: [0.05, 0.1, 3.14], armL: [-0.45, 0, 0.2], elbowL: [-1.5, 0, 0] };
  ATTACK_POSES.agatheCrook = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.08 },
    hits: [{ windup: levelled, strike: reached, follow: reached }, { windup: { ...reached, lean: 0.4, head: [0.1, 0, 0] }, strike: hauled, follow: { ...hauled, lean: -0.25 } }] };

  // The Correction: the haft turned butt-first across her breast, held like a staff; three raps of the iron shoe, high,
  // low, high. The butt never rends.
  const staff = { crouch: 0.1, lean: 0.0, legL: [-0.3, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.3, 0], chest: [0, -0.1, 0], head: [0, 0.2, 0],
    armR: [-0.9, 0, -0.1], elbowR: [-1.2, 0, 0], haft: [-3.7, 0.5, 3.14], armL: [-1.0, 0, -0.4], elbowL: [-1.0, 0, 0] };
  const rapHigh = { crouch: 0.15, lean: 0.25, legL: [-0.6, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.2, 0], chest: [0.15, 0.1, 0], head: [0, 0, 0],
    armR: [-1.2, 0, 0.1], elbowR: [-0.3, 0, 0], haft: [-3.3, 0.12, 3.14], armL: [-1.3, 0, -0.2], elbowL: [-0.3, 0, 0] };
  const rapLow = { ...rapHigh, crouch: 0.3, lean: 0.35, spin: [0, -0.2, 0], haft: [-2.85, 0.12, 3.14], armR: [-0.8, 0, 0], armL: [-0.9, 0, -0.1] };
  ATTACK_POSES.agatheCorrection = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.05 },
    hits: [{ windup: staff, strike: rapHigh, follow: rapHigh }, { windup: { ...staff, crouch: 0.2 }, strike: rapLow, follow: rapLow },
      { windup: { ...staff, spin: [0, -0.5, 0] }, strike: { ...rapHigh, lean: 0.35 }, follow: { ...rapHigh, lean: 0.35 } }] };

  // Hook and Haul: the hook trailing low behind her right heel, her head bowed to your feet; a reap at the ankles, then
  // the hook heaved up over her head in both hands and brought down.
  const lowBehind = { crouch: 0.3, lean: 0.3, legL: [-0.5, 0, 0], legR: [0.45, 0, 0], spin: [0, -0.7, 0], chest: [0.25, -0.2, 0], neck: [0.2, 0, 0], head: [0.35, 0.3, 0],
    armR: [0.35, 0, -0.4], elbowR: [-0.1, 0, 0], haft: [0.35, -1.7, 4.9], armL: [-0.5, 0, 0.3], elbowL: [-0.9, 0, 0] };
  const ankle = { crouch: 0.42, lean: 0.4, legL: [-0.7, 0, 0], kneeL: [0.4, 0, 0], legR: [0.5, 0, 0], spin: [0, 0.6, 0], chest: [0.35, 0.2, 0], head: [0.2, -0.2, 0],
    armR: [-0.9, 0, 0.5], elbowR: [0, 0, 0], haft: [0.3, 0.4, 4.9], armL: [-0.6, 0, 0.5], elbowL: [-0.5, 0, 0] };
  const heave = { crouch: 0.08, lean: -0.2, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], chest: [-0.25, 0, 0], head: [-0.05, 0, 0],
    armR: [-2.9, 0, 0.1], elbowR: [-0.8, 0, 0], haft: [-2.5, 0, 3.14], armL: [-2.7, 0, -0.15], elbowL: [-0.9, 0, 0] };
  const chopped = { crouch: 0.36, lean: 0.5, legL: [-0.8, 0, 0], legR: [0.5, 0, 0], chest: [0.4, 0, 0], head: [0.1, 0, 0],
    armR: [-1.0, 0, 0], elbowR: [0, 0, 0], haft: [0.25, 0, 3.14], armL: [-1.0, 0, -0.1], elbowL: [-0.2, 0, 0] };
  ATTACK_POSES.agatheHookHaul = { ease: swing, lag: { weapon: 0.1 },
    hits: [{ windup: lowBehind, strike: ankle, follow: ankle }, { windup: heave, strike: chopped, follow: { ...chopped, crouch: 0.4 } }] };

  // Rend the Earth: the hook raised high on her left, point forward, her left foot stamped out; the blade dragged down
  // and through the floor ahead.
  const raisedLeft = { crouch: 0.12, lean: -0.1, legL: [-0.65, 0, 0], legR: [0.3, 0, 0], spin: [0, 0.7, 0], chest: [-0.1, 0.25, 0], neck: [0, -0.3, 0], head: [0, -0.5, 0],
    armR: [-2.4, 0, 0.7], elbowR: [-0.5, 0, 0], haft: [-1.2, 0.1, 3.14], armL: [-2.0, 0, 0.5], elbowL: [-0.8, 0, 0] };
  const furrow = { crouch: 0.45, lean: 0.55, legL: [-0.85, 0, 0], kneeL: [0.4, 0, 0], legR: [0.5, 0, 0], spin: [0, 0.1, 0], chest: [0.4, 0, 0], head: [0.15, 0, 0],
    armR: [-0.8, 0, 0.1], elbowR: [0, 0, 0], haft: [0.25, 0, 3.14], armL: [-0.75, 0, -0.05], elbowL: [-0.15, 0, 0] };
  ATTACK_POSES.agatheRendEarth = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.08 },
    hits: [{ windup: raisedLeft, strike: furrow, follow: { ...furrow, crouch: 0.48 } }] };
  // ... in the storm: and then the hook pointed at you, her left hand up to the clouds: the storm falls where you stand.
  const pointing = { crouch: 0.15, lean: 0.05, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], chest: [-0.05, 0, 0], head: [-0.25, 0, 0],
    armR: [-1.6, 0, 0], elbowR: [0, 0, 0], haft: [-0.35, 0.1, 3.14], grip: false, armL: [-2.7, 0, 0.45], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.agatheStormFurrow = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.08 },
    hits: [{ windup: raisedLeft, strike: furrow, follow: furrow }, { windup: pointing, strike: { ...pointing, armL: [-2.2, 0, 0.6] }, follow: pointing }] };

  // Torn Stones: crouched low, the hook dragged behind her left through the rubble, her eyes on you; the stones flung up
  // and out across to her right.
  const dragBehind = { crouch: 0.45, lean: 0.35, legL: [-0.55, 0, 0], legR: [0.55, 0, 0], spin: [0, 0.9, 0], chest: [0.3, 0.3, 0], neck: [0, -0.5, 0], head: [0, -0.6, 0],
    armR: [0.2, 0, 0.6], elbowR: [-0.1, 0, 0], haft: [0.3, 1.2, 3.14], armL: [-0.4, 0, 0.6], elbowL: [-0.6, 0, 0] };
  const fling = { crouch: 0.12, lean: -0.1, legL: [-0.3, 0, 0], legR: [0.4, 0, 0], spin: [0, -0.6, 0], chest: [-0.1, -0.3, 0], head: [0, 0.2, 0],
    armR: [-2.0, 0, -0.6], elbowR: [-0.1, 0, 0], haft: [-1.3, -0.3, 3.14], armL: [-1.0, 0, 0.3], elbowL: [-0.5, 0, 0] };
  ATTACK_POSES.agatheTornStones = { ease: swing, lag: { weapon: 0.12 }, hits: [{ windup: dragBehind, strike: fling, follow: fling }] };

  // The Cornerstone: the hook driven into the floor before her, both hands hauling back on it, her whole weight leaning;
  // a slab of the abbey tears up, and she hurls it.
  const haul = { crouch: 0.3, lean: -0.35, legL: [-0.7, 0, 0], kneeL: [0.4, 0, 0], legR: [0.5, 0, 0], chest: [-0.3, 0, 0], head: [0.1, 0, 0],
    armR: [-0.9, 0, 0.1], elbowR: [-1.0, 0, 0], haft: [1.0, 0.1, 3.14], armL: [-0.9, 0, -0.1], elbowL: [-1.1, 0, 0] };
  const hurl = { crouch: 0.1, lean: 0.3, legL: [-0.6, 0, 0], legR: [0.45, 0, 0], chest: [0.3, 0, 0], head: [-0.1, 0, 0],
    armR: [-2.6, 0, 0.1], elbowR: [-0.3, 0, 0], haft: [-2.2, 0, 3.14], armL: [-2.5, 0, -0.1], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.agatheCornerstone = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.08 },
    hits: [{ windup: haul, strike: hurl, follow: hurl }] };

  // The Turning Hook: you are behind her; the haft hugged upright at her side, a look over her right shoulder, and the
  // hook comes round.
  const hugged = { crouch: 0.15, spin: [0, -0.6, 0], chest: [0, -0.3, 0], neck: [0, -0.5, 0], head: [0, -1.0, 0],
    armR: [-0.4, 0, -0.3], elbowR: [-1.3, 0, 0], haft: [-1.4, 0, 3.14], armL: [-0.6, 0, -0.4], elbowL: [-1.2, 0, 0] };
  const round = { crouch: 0.22, lean: 0.1, legL: [-0.3, 0, 0], legR: [0.4, 0, 0], spin: [0, 1.6, 0], chest: [0.05, 0.5, 0], neck: [0, -0.3, 0], head: [0, -0.4, 0],
    armR: [-1.4, 0, 0.9], elbowR: [0, 0, 0], haft: [0.2, 0.5, 4.9], armL: [-0.5, 0, 0.8], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.agatheTurningHook = { ease: swing, lag: { weapon: 0.1 }, hits: [{ windup: hugged, strike: round, follow: { ...round, spin: [0, 1.9, 0] } }] };

  // ---- the storm (second phase) ----
  // The Storm Comes (the phase opener): the hook lifted to the sky in both hands, crouched under it, her face up; the
  // lightning takes it, and she drives the iron shoe into the floor.
  const skyward = { crouch: 0.25, lean: -0.15, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], chest: [-0.3, 0, 0], neck: [-0.3, 0, 0], head: [-0.55, 0, 0],
    armR: [-3.0, 0, 0.15], elbowR: [-0.2, 0, 0], haft: [-1.6, 0, 3.14], armL: [-2.9, 0, -0.15], elbowL: [-0.3, 0, 0] };
  const grounded = { crouch: 0.38, lean: 0.2, legL: [-0.5, 0, 0], legR: [0.45, 0, 0], chest: [0.2, 0, 0], head: [0.2, 0, 0],
    armR: [-0.9, 0, 0], elbowR: [-0.7, 0, 0], haft: [-1.3, 0, 3.14], armL: [-1.0, 0, -0.2], elbowL: [-0.8, 0, 0] };
  ATTACK_POSES.agatheStormComes = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [{ windup: skyward, strike: grounded, follow: grounded }] };

  // The Storm Knows Its Own: standing tall, the hook held up in her right hand alone, her left palm open to the clouds;
  // she casts the hand down at you, three times: three marks, three bolts.
  const callStorm = { crouch: 0.02, lean: -0.15, legL: [-0.2, 0, 0], legR: [0.2, 0, 0], chest: [-0.2, 0, 0], neck: [-0.2, 0, 0], head: [-0.45, 0, 0],
    armR: [-2.9, 0, -0.3], elbowR: [-0.1, 0, 0], haft: [-1.75, 0, 3.14], grip: false, armL: [-2.3, 0, 0.8], elbowL: [-0.2, 0, 0] };
  const cast = { ...callStorm, lean: 0.1, chest: [0.05, 0, 0], head: [-0.05, 0, 0], armL: [-1.3, 0, 0.35], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.agatheStormKnows = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' },
    hits: [{ windup: callStorm, strike: cast, follow: cast }, { windup: callStorm, strike: cast, follow: cast }, { windup: callStorm, strike: cast, follow: cast }] };

  // The Gale Reap: the hook wound round behind her back in both hands, her back to you, looking at you over her
  // shoulder; she turns full round with it at full reach, and back the other way, low.
  const woundRound = { crouch: 0.22, lean: 0.1, legL: [-0.3, 0, 0], legR: [0.45, 0, 0], spin: [0, -1.6, 0], chest: [0, -0.5, 0], neck: [0, 0.6, 0], head: [0, 1.0, 0],
    armR: [-1.2, 0, -1.2], elbowR: [-0.1, 0, 0], haft: [0.1, -0.6, 4.7], armL: [-1.0, 0, -0.6], elbowL: [-0.6, 0, 0] };
  const reapRound = { crouch: 0.25, lean: 0.15, legL: [-0.45, 0, 0], legR: [0.4, 0, 0], spin: [0, 1.8, 0], chest: [0.05, 0.5, 0], neck: [0, -0.4, 0], head: [0, -0.6, 0],
    armR: [-1.4, 0, 0.9], elbowR: [0, 0, 0], haft: [0.15, 0.4, 4.7], armL: [-0.7, 0, 0.8], elbowL: [-0.4, 0, 0] };
  const reapBack = { crouch: 0.42, lean: 0.3, legL: [-0.55, 0, 0], kneeL: [0.3, 0, 0], legR: [0.5, 0, 0], spin: [0, -1.7, 0], chest: [0.25, -0.5, 0], neck: [0, 0.4, 0], head: [0, 0.6, 0],
    armR: [-1.2, 0, -1.0], elbowR: [0, 0, 0], haft: [0.45, -0.4, 4.7], armL: [-0.8, 0, -0.5], elbowL: [-0.5, 0, 0] };
  ATTACK_POSES.agatheGaleReap = { ease: swing, lag: { weapon: 0.12, armR: 0.05 },
    hits: [{ windup: woundRound, strike: reapRound, follow: reapRound }, { windup: { ...reapRound, crouch: 0.35 }, strike: reapBack, follow: { ...reapBack, spin: [0, -1.9, 0] } }] };

  // The Hook from the Storm: a deep crouch, the hook trailing, and she springs: aloft, the hook up over her head in both
  // hands, driven down hook-first where you stood, and the storm strikes it.
  const aloft = { crouch: 0.1, lean: -0.1, legL: [-0.9, 0, 0], kneeL: [1.0, 0, 0], legR: [-0.3, 0, 0], kneeR: [1.1, 0, 0], chest: [-0.2, 0, 0], head: [-0.15, 0, 0],
    armR: [-2.8, 0, 0.1], elbowR: [-1.0, 0, 0], haft: [-2.6, 0, 3.14], armL: [-2.7, 0, -0.1], elbowL: [-1.0, 0, 0] };
  const planted = { crouch: 0.5, lean: 0.5, legL: [-1.0, 0, 0], kneeL: [1.2, 0, 0], legR: [0.4, 0, 0], kneeR: [1.3, 0, 0], chest: [0.35, 0, 0], head: [0.15, 0, 0],
    armR: [-0.85, 0, 0], elbowR: [-0.2, 0, 0], haft: [0.25, 0, 3.14], armL: [-0.85, 0, -0.1], elbowL: [-0.25, 0, 0] };
  ATTACK_POSES.agatheStormLeap = { ease: { windup: 'inOutCubic', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.06 },
    hits: [{ windup: aloft, strike: planted, follow: planted }] };

}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const RING = (from, to, width, time) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time } });
  const REAP = { w: 8.0, h: 1.4, d: 4.2, fwd: 2.4, y: 1.1 };        // the reap across: as wide as the hook swings
  const DRAW = { w: 7.0, h: 0.9, d: 4.6, fwd: 2.6, y: 0.45 };       // drawn back at the knees: jump it, or roll
  const REACH = { w: 1.8, h: 1.6, d: 2.4, fwd: 5.4, y: 1.4 };       // the hook laid down past you
  const HAUL = { w: 2.0, h: 1.6, d: 5.6, fwd: 3.2, y: 1.0 };        // ... hauled home through you
  const RAP = { w: 1.4, h: 1.4, d: 3.0, fwd: 1.9, y: 1.3 };
  const ANKLE = { w: 5.0, h: 0.8, d: 3.4, fwd: 1.9, y: 0.4 };
  const CHOP = { w: 1.8, h: 3.2, d: 4.8, fwd: 2.8, y: 1.2 };
  const FURROW = { w: 3.0, h: 0.6, d: 10.5, fwd: 6.0, y: 0.3, ground: true };
  const TURN = { w: 7.6, h: 1.8, d: 7.6, fwd: -0.4, y: 1.1 };
  const GALE = { w: 9.0, h: 1.6, d: 9.0, fwd: 0, y: 1.1 }, GALE_LOW = { ...GALE, h: 0.9, y: 0.45 };
  const BOLT = { w: 2.4, h: 6.0, d: 2.4, fwd: 0, y: 3.0 };          // where the mark lay
  const STONES = { speed: 19, gravity: 4, size: 0.22, look: 'rock', spread: [-0.3, -0.15, 0, 0.15, 0.3] };
  const AGATHE = {
    id: 'agathe', model: 'motherAgathe', name: 'Mother Agathe, the Rending Hand',
    description: 'The abbess who held the knife when Thrale\'s monks tried to cut the Ember out of the earth. She did not let go: what her great hook tears out of you she keeps on it, a piece of your health for every blow of the blade that gets past your guard. Strike her to tear it back. At half her strength the storm comes at her back: every blow of the hook rends, and the storm falls where you stand. Step off its mark.',
    scale: 1.95, bulk: 1.0, radius: 0.7, color: 0x2c2c32, weapon: 'spear', idle: 'sway',
    visual: { skin: 0xb4aca2, roughness: 0.75, rim: 0.9 },
    // hp and posture: kept from pass 45 (v7.65.0): a skilled player alone beats her in about a minute (tools/bot-fights.cjs BOTS=1 CLEAN=1).
    hp: 3200, poise: 240, speed: 2.9, turnRate: 3.4, trackRate: 1.9, approach: 0.6, kite: 0.15,
    cooldown: [1.62, 3.24], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 7,
    posture: { max: 84, parry: 60, chainGap: 1.8, chainMul: 1.3, decay: 4, breakTime: 3.2, hitstop: 0.2 },
    defaultPhases: ['abbess', 'storm'],
    phases: {
      abbess: { hp: 3200,
        attacks: ['reapingDraw', 'crook', 'correction', 'hookHaul', 'rendEarth', 'tornStones', 'cornerstone', 'turningHook', 'crookPunish'] },
      // At half her strength the storm comes at her back: every blow of the hook rends, and the storm falls where you stand.
      storm: { at: 0.5, name: 'Agathe, the Storm at Her Back', opener: 'stormComes', storm: true, rend: true,
        cooldown: [1.26, 2.52], approach: 0.8, kite: 0.05, speed: 3.2, trackRate: 2.2,
        attacks: ['stormComes', 'reapingDraw', 'crook', 'correction', 'hookHaul', 'stormFurrow', 'tornStones', 'turningHook', 'crookPunish',
                  'stormKnows', 'galeReap', 'stormLeap'] },
    },
    attacks: [
      // ---- the abbess -----------------------------------------------------------------------------------------------------
      // The Reaping Draw: laid out far to her right; a reap across, then drawn back low through your knees. Parry the reap,
      // jump or roll the draw.
      { id: 'reapingDraw', name: 'The Reaping Draw', anim: 'sweep', pose: 'agatheReapingDraw', rend: true, tracking: { rate: 2.4, commit: 0.65 }, markers: glint(0),
        hits: [{ startup: 1.15, active: 0.18, follow: 0.12, hold: { at: 0.6, time: [0.25, 0.7], chance: 0.4 } },
               { startup: 0.55, active: 0.18, follow: 0.3, damage: 26, box: DRAW }], recovery: 1.98,
        followUps: [{ attack: 'turningHook', if: 'behind', chance: 0.33 }],
        damage: 32, poise: 50, knock: 6, lunge: 1.0, range: 4.4, box: REAP },
      // The Crook: levelled at you, held; the reach lays the hook past you, then it is hauled home through you. Roll toward
      // her or out to the side as she hauls.
      { id: 'crook', name: 'The Crook', anim: 'thrust', pose: 'agatheCrook', noParry: true, rend: true, tracking: { rate: 2.8, commit: 0.75 }, minRange: 2.5, chance: 0.7,
        hits: [{ startup: 1.05, active: 0.14, follow: 0.1, damage: 14, box: REACH, hold: { at: 0.55, time: [0.3, 0.9], chance: 0.5 } },
               { startup: 0.5, active: 0.26, follow: 0.3, box: HAUL }], recovery: 2.16,
        damage: 34, poise: 50, knock: 7, lunge: 1.6, range: 7.0, box: HAUL },
      // The Correction: butt-first like a staff; three raps of the iron shoe. Parry them: the butt never rends.
      { id: 'correction', name: 'The Correction', anim: 'thrust', pose: 'agatheCorrection', rend: false, tracking: { rate: 3.2, commit: 0.7 }, markers: glint(0, 1, 2),
        hits: [{ startup: 0.8, active: 0.12, follow: 0.06 },
               { startup: 0.34, active: 0.12, follow: 0.06, step: { from: 0.1, speed: 3, side: 0 } },
               { startup: 0.42, active: 0.12, follow: 0.25, step: { from: 0.1, speed: 3, side: 0 } }], recovery: 1.8,
        followUps: [{ attack: 'hookHaul', if: 'near', chance: 0.17 }],
        damage: 16, poise: 30, knock: 4, lunge: 0.8, range: 3.2, box: RAP },
      // Hook and Haul: trailing behind her heel, head bowed; a reap at the ankles (jump it), then heaved overhead and down
      // (parry it, or roll).
      { id: 'hookHaul', name: 'Hook and Haul', anim: 'chop', pose: 'agatheHookHaul', rend: true, tracking: { rate: 2.4, commit: 0.6 }, markers: glint(1),
        hits: [{ startup: 1.0, active: 0.16, follow: 0.1, damage: 22, box: ANKLE },
               { startup: 0.75, active: 0.14, follow: 0.35, impact: { ring: 2.4, crack: 1.4, dust: 14, shake: 0.1 } }], recovery: 2.34,
        damage: 40, poise: 70, knock: 8, lunge: 1.0, range: 4.4, box: CHOP },
      // Rend the Earth: raised high on her left; dragged through the floor ahead, a line of shockwaves. Roll or jump it.
      { id: 'rendEarth', name: 'Rend the Earth', anim: 'chop', pose: 'agatheRendEarth', noParry: true, rollOnly: true, rend: false, tracking: { rate: 2.4, commit: 0.7 }, minRange: 2.5, chance: 0.45,
        hits: [{ startup: 1.15, active: 0.22, follow: 0.35, line: true, impact: { ring: 2.2, crack: 3.0, dust: 20, shake: 0.12 } }], recovery: 1.8,
        damage: 30, poise: 50, knock: 7, lunge: 0, range: 11, box: FURROW },
      // Torn Stones: crouched, dragging through the rubble; a fan of stones. At range.
      { id: 'tornStones', name: 'Torn Stones', anim: 'sweep', pose: 'agatheTornStones', noParry: true, rend: false, tracking: { rate: 3.0, commit: 0.85 }, minRange: 4, chance: 0.35,
        projectile: STONES, hits: [{ startup: 0.85, active: 0.05, follow: 0.2 }], recovery: 1.08,
        damage: 12, poise: 15, knock: 3, lunge: 0, range: 15, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.0 } },
      // The Cornerstone: the hook driven into the floor, hauled back on; a slab of the abbey, hurled. Sidestep it.
      { id: 'cornerstone', name: 'The Cornerstone', anim: 'overhead', pose: 'agatheCornerstone', noParry: true, rend: false, tracking: { rate: 2.2, commit: 0.8 }, minRange: 6, chance: 0.22,
        projectile: { speed: 12, gravity: 12, size: 0.8, look: 'rock' }, hits: [{ startup: 1.6, active: 0.05, follow: 0.5, impact: { ring: 1.4, crack: 1.2, dust: 14, shake: 0.06 } }], recovery: 2.7,
        damage: 46, poise: 80, knock: 9, lunge: 0, range: 20, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 2.0 } },
      // The Turning Hook: behind her, a look over her right shoulder; the hook comes round.
      { id: 'turningHook', name: 'The Turning Hook', anim: 'sweep', pose: 'agatheTurningHook', noParry: true, rend: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 4,
        hits: [{ startup: 0.7, active: 0.16, follow: 0.3 }], recovery: 1.62,
        damage: 26, poise: 40, knock: 8, lunge: 0, range: 3.8, box: TURN },
      // Drinking where she can see it: the crook, sooner.
      { id: 'crookPunish', name: 'The Crook', anim: 'thrust', pose: 'agatheCrook', noParry: true, rend: true, when: 'healing', tracking: { rate: 3.4, commit: 0.8 }, chance: 3,
        hits: [{ startup: 0.65, active: 0.14, follow: 0.1, damage: 14, box: REACH }, { startup: 0.4, active: 0.24, follow: 0.3, box: HAUL }], recovery: 1.98,
        damage: 32, poise: 50, knock: 7, lunge: 2.0, range: 7.5, box: HAUL },
      // ---- the storm -----------------------------------------------------------------------------------------------------
      // The Storm Comes (the phase opener): the hook lifted to the sky, the lightning takes it, the iron shoe driven down: a
      // ring of the storm along the floor. She cannot be hurt through it (as every boss's change).
      { id: 'stormComes', name: 'The Storm Comes', anim: 'stomp', pose: 'agatheStormComes', noParry: true, rollOnly: true, invulnerable: true, rend: false, tracking: { rate: 1.6, commit: 0.5 }, chance: 0.1,
        hits: [{ startup: 1.6, active: 0.5, follow: 0.4, box: RING(0.6, 8.0, 1.4, 0.55), impact: { ring: 4.4, crack: 1.4, dust: 18, shake: 0.18 } }], recovery: 2.34,
        damage: 30, poise: 50, knock: 9, lunge: 0, range: 7, box: RING(0.6, 8.0, 1.4, 0.55) },
      // The Storm Knows Its Own: the hook held up, her palm to the clouds; three marks fall where you stand, and are struck.
      // Each one follows you, holds still, and burns white just before: step off it.
      { id: 'stormKnows', name: 'The Storm Knows Its Own', anim: 'overhead', pose: 'agatheStormKnows', noParry: true, tracking: { rate: 2.0, commit: 0.55 }, chance: 0.45,
        hits: [{ startup: 1.35, active: 0.18, follow: 0.1, bolt: true, impact: { ring: 2.0, crack: 0.6, dust: 10, shake: 0.08 } },
               { startup: 1.0, active: 0.18, follow: 0.1, bolt: true, impact: { ring: 2.0, crack: 0.6, dust: 10, shake: 0.08 } },
               { startup: 1.0, active: 0.18, follow: 0.3, bolt: true, impact: { ring: 2.0, crack: 0.6, dust: 10, shake: 0.08 } }], recovery: 2.16,
        damage: 30, poise: 40, knock: 6, lunge: 0, range: 20, box: BOLT },
      // Lightning Down the Furrow: rend the earth, and then the hook points at you: the storm falls where you stand.
      { id: 'stormFurrow', name: 'Lightning Down the Furrow', anim: 'chop', pose: 'agatheStormFurrow', noParry: true, rollOnly: true, rend: false, tracking: { rate: 2.4, commit: 0.7 }, minRange: 2.5, chance: 0.45,
        hits: [{ startup: 1.1, active: 0.22, follow: 0.2, line: true, impact: { ring: 2.2, crack: 3.0, dust: 20, shake: 0.12 } },
               { startup: 1.0, active: 0.18, follow: 0.3, bolt: true, damage: 28, box: BOLT, impact: { ring: 2.0, crack: 0.6, dust: 10, shake: 0.08 } }], recovery: 1.98,
        damage: 30, poise: 50, knock: 7, lunge: 0, range: 11, box: FURROW },
      // The Gale Reap: wound round behind her back, her back to you; full round at full reach, then back the other way low.
      // Roll the first; jump or roll the second.
      { id: 'galeReap', name: 'The Gale Reap', anim: 'sweep', pose: 'agatheGaleReap', noParry: true, tracking: { rate: 2.0, commit: 0.55 }, chance: 0.55,
        hits: [{ startup: 1.15, active: 0.2, follow: 0.1, box: GALE },
               { startup: 0.55, active: 0.2, follow: 0.35, damage: 26, box: GALE_LOW }], recovery: 2.52,
        damage: 32, poise: 50, knock: 8, lunge: 0.6, range: 4.6, box: GALE },
      // The Hook from the Storm: a spring from a deep crouch; the hook driven down where you stood, and the storm strikes
      // it. Roll it late; a long opening after.
      { id: 'stormLeap', name: 'The Hook from the Storm', anim: 'chop', pose: 'agatheStormLeap', noParry: true, tracking: { rate: 2.4, commit: 0.5 }, minRange: 5, chance: 0.4,
        hits: [{ startup: 1.3, active: 0.16, follow: 0.45, leap: { from: 0.4, max: 12, short: 1.4 }, impact: { ring: 4.2, crack: 2.0, dust: 22, shake: 0.18 } }], recovery: 2.88,
        damage: 46, poise: 85, knock: 10, lunge: 0, range: 12, box: { w: 3.2, h: 2.8, d: 3.8, fwd: 1.6, y: 1.0 } },
    ],
  };
  ENEMY_DEFS.push(AGATHE); ENEMY_BY_ID[AGATHE.id] = AGATHE;
}

// The Rending Brothers (Level 12; STORY.md 10h): the monks who cut at the hill with her. They spring from the ruins, cut
// four times with a hooked knife, fling stones and rend the floor into a line of shockwaves. Rough: the Beastman's moves
// (BEASTMAN_MOVES, js/data/move-sources.js) on the Rogue's Blender figure in an undyed cowl, one hooked knife.
{
  const B = BEASTMAN_MOVES, NAMES = { bmSlash: ['brotherCuts', 'Four Cuts'], bmClaw: ['brotherRend', 'Rend the Earth'],
    bmSling: ['brotherStones', 'Flung Stones'], bmLunge: ['brotherLunge', 'Lunging Hook'], bmPounce: ['brotherLeap', 'Leaping Hook'] };
  const BROTHER = { ...B, id: 'rendingBrother', model: 'rendingBrother', name: 'Rending Brother',
    description: 'A monk of the Torn Abbey, who cut at the hill with his abbess. He springs from the ruins, cuts four times with a hooked knife, flings stones, and rends the floor into a line of shockwaves (roll or jump).',
    color: 0x6a5a48, visual: { ...B.visual, skin: 0x9a8e80 },
    attacks: B.attacks.map(a => {
      if (!NAMES[a.id]) throw new Error(`Rending Brother: the Beastman's "${a.id}" has no new name.`);
      return { ...JSON.parse(JSON.stringify(a)), id: NAMES[a.id][0], name: NAMES[a.id][1] };
    }) };
  ENEMY_DEFS.push(BROTHER); ENEMY_BY_ID[BROTHER.id] = BROTHER;
  const R = MODEL_DEFS.rogue;
  MODEL_DEFS.rendingBrother = {
    extends: 'rogue',
    materials: {
      ...R.materials,
      skin: { tex: 'paleSkin', tint: 0xa09484, decay: 0.55 },
      hood: { tex: 'rogueHood', tint: 0x8a7458, decay: 0.6, double: true, rim: 0.5 },   // the undyed cowl
      mask: { tex: 'rogueHood', tint: 0x4a3e32, decay: 0.5, double: true },
      scales: { tex: 'rottenCloth', tint: 0x6a5a46, decay: 0.75 },   // a habit for the scale
      leather: { tex: 'rogueLeather', tint: 0x5a4636, decay: 0.65 },
      strap: { tex: 'execTrim', tint: 0xa89a7e, decay: 0.55 },   // the cord
      steel: { tex: 'rustedIron', tint: 0x6a645e, decay: 0.7 },
      blade: { tex: 'rustedIron', tint: 0xb0aca4, decay: 0.45 },
      eye: { glow: 0xc8d8ff },
    },
    parts: R.parts.filter(p => p.use === 'baked'),   // one hooked knife, no dagger
    weapon: { use: 'curvedKnife', slots: { blade: 'blade', grip: 'leather', guard: 'steel' } },
    eyes: { ...R.eyes, color: 0xc8d8ff },
  };
}
