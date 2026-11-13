'use strict';
// ============================================================================
// The Ringer of Thrale (v7.42.0; her own since pass 42), the boss of Level 9, js/levels/night-gaol.js (STORY.md 10e)
// ============================================================================
// The bellwright's daughter who rang Thrale's bell without leave, the night the Seven came, and was shut in the great
// ring of the Night Gaol for it, in a scold's bridle, the bell's clapper chained to her wrist. The gaolers are long dead
// and her chain is long broken, but she does not know it: she fights inside the circle her chain let her reach (the
// `chained` phase's `tether`, drawn on the floor by js/tether.js) and calls across it to anyone who stands off (a knell
// along the floor: jump it). At half her strength she steps over the line for the first time (`overTheLine`), and
// rings the hours as she was taught: counted knells, a peal of blows, a leap out of the ring.
//
// Every wind-up is her own. The clapper hangs down her back (the hour struck), trails low at her left (change ringing),
// hangs between her feet (the rising toll), lies along her right side (the drive), stands upright before her bowed face
// (the call), is lifted while her knee comes up (the stamp), slung over her shoulder (the leap), held like a staff
// (the peal); she kneels for the tailors and flings her arms wide when she crosses the line. Clapper angles below: the
// shaft's `pitch` (0 level ahead, -1.57 straight up, positive dips the ball) is about armR.x + elbowR.x + weapon.x +
// chest.x + lean - 0.08; the poses give the pitch, and the loop after them works out the weapon angle.

// ---- her figure: built in Blender (tools/blender/ringer.py), one piece per bone ----------------------------------------
// A gaunt shaved head shut in a scold's bridle (iron hoops, a mouth plate) with a small bell on its crown; a sackcloth
// shift under a foundry apron; a bell rope for a belt, its red-banded sally at her hip; bare arms and big hands; fetters at
// wrists and ankles, a broken chain hanging from the left (its own bone, anim.hang); rag-wrapped shins, bare feet; the
// clapper of Thrale's bell, a long iron shaft with a heavy ball worn bright where it struck, a chain from its eye to her
// right fetter.
MODEL_DEFS.ringerOfThrale = {
  extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.5,
  proportions: { shoulderX: 0.38, torsoW: 0.25, torsoD: 0.19, armR: 0.075, legR: 0.095, headR: 0.13, handR: 0.07, footLen: 0.32 },
  posture: { chest: [0.12, 0, 0], neck: [0.1, 0, 0], head: [-0.04, 0, 0], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0] },   // stooped, head up
  materials: {
    skin: { tex: 'paleSkin', tint: 0xb0a8a0, decay: 0.5 },
    iron: { tex: 'rustedIron', tint: 0x6a6058, decay: 0.75, rim: 0.4 },
    bronze: { tex: 'bellBronze', tint: 0xc09858, decay: 0.55, rim: 0.4 },
    struck: { tex: 'dentedSteel', tint: 0xd8d0c0, decay: 0.45, rim: 0.4 },   // the ball, worn bright where it struck
    shift: { tex: 'sentinelCloth', tint: 0xb8b0a0, decay: 0.6, double: true, rim: 0.2 },
    apron: { tex: 'crackedLeather', tint: 0x6a4a30, decay: 0.7, double: true },
    wrap: { tex: 'sentinelRags', tint: 0x9a9080, decay: 0.7 },
    rope: { tex: 'oathLinen', tint: 0xd0c4a8, decay: 0.6 },
    sally: { tex: 'duelistVelvet', tint: 0x9a2018, decay: 0.6 },
    eye: { glow: 0xb8c8ff },
  },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0, -0.02, -0.2] },
    chainL: { parent: 'elbowL', at: [0.07, -0.22, 0] },   // the broken chain, from her left fetter: it hangs plumb from there
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    head: ['skin', 'iron', 'bronze'], chest: ['shift', 'apron', 'iron', 'apron.1'], spin: ['shift', 'rope'],
    loinF: ['shift', 'apron', 'sally', 'rope'], loinB: ['shift', 'apron'],
    armL: ['skin', 'shift'], armR: ['skin', 'shift'], elbowL: ['skin', 'wrap', 'iron'], elbowR: ['skin', 'wrap', 'iron'], chainL: ['iron'],
    legL: ['skin'], legR: ['skin'], kneeL: ['skin', 'wrap', 'iron'], kneeR: ['skin', 'wrap', 'iron'],
    weapon: ['iron', 'struck', 'iron.1', 'wrap'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `ringer:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42,
    ...(bone === 'weapon' ? { weapon: true } : {}) }))),
  weapon: null,          // the clapper is part of the figure (the `weapon: true` pieces above)
  weaponRest: 0.8,       // at rest the ball hangs before her feet (js/registries.js `sway`)
  eyes: { color: 0xb8c8ff, size: 0.01, spread: 0.034, at: [0, 0.11, 0.085] },   // through the bridle's hoops
  anim: {
    idle: { breathRate: 0.9, breath: 0.018, headDrift: 0.04, sway: 0.014, twitch: 0 }, walk: { twist: 0.08, roll: 0.05, headNod: 0.04, elbow: 0.15, drag: 0.12 },
    flinch: { head: 0.4, chest: 0.35, arms: 0.3 }, death: { buckle: 1, slump: 0.8 },
    cloth: [{ bone: 'loinF', gain: 0.12, k: 60, damp: 5.2, flutter: 0.04 }, { bone: 'loinB', gain: 0.16, k: 50, damp: 4.6, flutter: 0.05 }],
    hang: [{ bone: 'chainL', k: 22, damp: 2.2, gain: 0.04 }],
  },
};

// ---- key poses (js/data/attack-poses.js format) -------------------------------------------------------------------------
{
  // The ball struck down on the stones before her (the end of most of her blows).
  const struck = { crouch: 0.34, lean: 0.52, legL: [-0.72, 0, 0], legR: [0.5, 0, 0], chest: [0.45, 0, 0], neck: [0.15, 0, 0], head: [0.05, 0, 0],
    armR: [-1.15, 0, 0.05], elbowR: [-0.05, 0, 0], pitch: 0.15, armL: [-1.0, 0, -0.2], elbowL: [-0.5, 0, 0] };
  const deeper = { ...struck, crouch: 0.36, lean: 0.56, chest: [0.5, 0, 0] };

  // The Hour Struck: the clapper lifted until the ball hangs down her back, her head bowed under the weight; held; brought
  // over and down.
  const hourUp = { crouch: 0.1, lean: -0.25, legL: [-0.35, 0, 0], legR: [0.3, 0, 0], chest: [-0.3, 0, 0], neck: [0.1, 0, 0], head: [0.25, 0, 0],
    armR: [-2.9, 0, -0.15], elbowR: [-0.9, 0, 0], pitch: -3.6, armL: [-2.7, 0, 0.15], elbowL: [-1.0, 0, 0] };
  const fall = { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' };
  ATTACK_POSES.ringerHourStruck = { ease: fall, lag: { weapon: 0.1 }, hits: [{ windup: hourUp, strike: struck, follow: deeper }] };
  // ... and in the second phase the ball lifted a hand's width and struck again where it lies: the knell spreads.
  const lift = { ...deeper, crouch: 0.3, lean: 0.4, armR: [-1.4, 0, 0.05], pitch: 0.4 };
  ATTACK_POSES.ringerHourStruck2 = { ease: fall, lag: { weapon: 0.1 }, hits: [{ windup: hourUp, strike: struck, follow: deeper },
    { windup: lift, strike: deeper, follow: { ...deeper, crouch: 0.38 } }] };

  // Change Ringing: the clapper trailing low at her left (a backhand at the knees), then raised over her right shoulder
  // and brought across at head height.
  ATTACK_POSES.ringerChangeRinging = { ease: { windup: 'inOutCubic', active: 'linear', follow: 'outCubic', recovery: 'inOutSine' },
    lag: { weapon: 0.08, armR: 0.05, elbowR: 0.06 }, hits: [
    { windup: { crouch: 0.28, lean: 0.12, legL: [-0.25, 0, 0], legR: [0.35, 0, 0], spin: [0, 1.0, 0], chest: [0.15, 0.4, 0], neck: [0, -0.25, 0], head: [0.1, -0.5, 0],
                armR: [-0.5, 0, 0.75], elbowR: [-0.4, 0, 0], pitch: 0.7, armL: [0.3, 0, 0.3], elbowL: [-0.6, 0, 0] },
      strike: { crouch: 0.32, lean: 0.25, legL: [-0.6, 0, 0], legR: [0.45, 0, 0], spin: [0, -1.1, 0], chest: [0.2, -0.4, 0], neck: [0, 0.2, 0], head: [0.05, 0.4, 0],
                armR: [-0.6, 0, -0.9], elbowR: [0, 0, 0], pitch: 0.6, armL: [-0.6, 0, 0.2], elbowL: [-0.5, 0, 0] },
      follow: { crouch: 0.3, lean: 0.25, legL: [-0.62, 0, 0], legR: [0.46, 0, 0], spin: [0, -1.3, 0], chest: [0.22, -0.45, 0], neck: [0, 0.25, 0], head: [0.05, 0.45, 0],
                armR: [-0.6, 0, -1.05], elbowR: [0, 0, 0], pitch: 0.6, armL: [-0.6, 0, 0.2], elbowL: [-0.5, 0, 0] } },
    { windup: { crouch: 0.15, lean: 0, legL: [-0.4, 0, 0], legR: [0.35, 0, 0], spin: [0, -1.3, 0], chest: [-0.15, -0.4, 0], neck: [0, 0.3, 0], head: [0, 0.5, 0],
                armR: [-2.5, 0, -0.6], elbowR: [-0.8, 0, 0], pitch: -2.6, armL: [-1.5, 0, 0.4], elbowL: [-1.2, 0, 0] },
      strike: { crouch: 0.2, lean: 0.15, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.9, 0], chest: [0.1, 0.4, 0], neck: [0, -0.25, 0], head: [0, -0.4, 0],
                armR: [-1.6, 0, 0.6], elbowR: [0, 0, 0], pitch: -0.1, armL: [-0.7, 0, 0.3], elbowL: [-0.5, 0, 0] },
      follow: { crouch: 0.2, lean: 0.15, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], spin: [0, 1.15, 0], chest: [0.1, 0.45, 0], neck: [0, -0.3, 0], head: [0, -0.5, 0],
                armR: [-1.5, 0, 0.8], elbowR: [0, 0, 0], pitch: -0.1, armL: [-0.65, 0, 0.3], elbowL: [-0.5, 0, 0] } },
  ] };

  // The Rising Toll: stooped low, the clapper hanging between her feet, her eyes up at you; heaved up and over.
  const rose = { crouch: 0.08, lean: -0.25, legL: [-0.55, 0, 0], legR: [0.3, 0, 0], chest: [-0.35, 0, 0], neck: [-0.15, 0, 0], head: [-0.2, 0, 0],
    armR: [-2.7, 0, 0], elbowR: [-0.2, 0, 0], pitch: -1.9, armL: [-2.5, 0, 0.1], elbowL: [-0.6, 0, 0] };
  ATTACK_POSES.ringerRisingToll = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.12 }, hits: [{
    windup: { crouch: 0.38, lean: 0.55, legL: [-0.45, 0, 0], legR: [0.45, 0, 0], chest: [0.35, 0, 0], neck: [0.1, 0, 0], head: [-0.3, 0, 0],
              armR: [-0.25, 0, 0.12], elbowR: [-0.1, 0, 0], pitch: 0.2, armL: [-0.35, 0, -0.12], elbowL: [-0.25, 0, 0] },
    strike: rose, follow: { ...rose, armR: [-2.85, 0, 0], armL: [-2.6, 0, 0.1] } }] };

  // The Clapper Drive: side-on, the shaft along her right side like a ram, her left hand guiding it; a short jab, then the
  // whole body behind the ball.
  const side = { spin: [0, -0.7, 0], chest: [0, -0.3, 0], neck: [0, 0.35, 0], head: [0, 0.35, 0] };
  ATTACK_POSES.ringerClapperDrive = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.1, armR: 0.06, elbowR: 0.08 }, hits: [
    { windup: { ...side, crouch: 0.22, legL: [-0.4, 0, 0], legR: [0.4, 0, 0], armR: [0.45, 0, -0.15], elbowR: [-1.5, 0, 0], pitch: 0.05, armL: [-0.9, 0, -0.55], elbowL: [-1.0, 0, 0] },
      strike: { ...side, spin: [0, -0.4, 0], crouch: 0.24, lean: 0.12, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], armR: [-0.7, 0, 0], elbowR: [-0.6, 0, 0], pitch: 0, armL: [-1.2, 0, -0.4], elbowL: [-0.4, 0, 0] },
      follow: { ...side, spin: [0, -0.5, 0], crouch: 0.24, lean: 0.1, legL: [-0.48, 0, 0], legR: [0.4, 0, 0], armR: [-0.4, 0, 0], elbowR: [-1.0, 0, 0], pitch: 0, armL: [-1.1, 0, -0.45], elbowL: [-0.6, 0, 0] } },
    { windup: { ...side, spin: [0, -0.85, 0], crouch: 0.3, legL: [-0.45, 0, 0], legR: [0.45, 0, 0], armR: [0.6, 0, -0.15], elbowR: [-1.6, 0, 0], pitch: 0.05, armL: [-0.8, 0, -0.6], elbowL: [-1.1, 0, 0] },
      strike: { crouch: 0.3, lean: 0.45, legL: [-0.9, 0, 0], legR: [0.55, 0, 0], spin: [0, 0.3, 0], chest: [0.35, 0.2, 0], neck: [0.1, -0.15, 0], head: [0.05, -0.2, 0],
                armR: [-1.4, 0, 0.1], elbowR: [0, 0, 0], pitch: 0.05, armL: [-1.4, 0, -0.2], elbowL: [-0.1, 0, 0] },
      follow: { crouch: 0.32, lean: 0.5, legL: [-0.92, 0, 0], legR: [0.56, 0, 0], spin: [0, 0.35, 0], chest: [0.4, 0.22, 0], neck: [0.12, -0.15, 0], head: [0.05, -0.2, 0],
                armR: [-1.38, 0, 0.1], elbowR: [0, 0, 0], pitch: 0.08, armL: [-1.38, 0, -0.2], elbowL: [-0.1, 0, 0] } },
  ] };

  // The Fetter Stamp: the clapper held upright before her, her left knee drawn up high, eyes on the floor; the fettered
  // foot stamped down and a ring runs out along the stones. In the second phase the right foot follows.
  const stampUp = (L) => ({ crouch: 0.05, lean: -0.1, [L ? 'legL' : 'legR']: [-1.45, 0, 0], [L ? 'kneeL' : 'kneeR']: [1.4, 0, 0], [L ? 'legR' : 'legL']: [0.05, 0, 0],
    chest: [-0.15, 0, 0], head: [0.2, 0, 0], armR: [-1.0, 0, 0.05], elbowR: [-1.5, 0, 0], pitch: -1.45, armL: [-0.9, 0, -0.2], elbowL: [-1.4, 0, 0] });
  const stampDown = (L) => ({ crouch: 0.3, lean: 0.2, [L ? 'legL' : 'legR']: [-0.35, 0, 0], [L ? 'kneeL' : 'kneeR']: [0.25, 0, 0], [L ? 'legR' : 'legL']: [0.3, 0, 0],
    chest: [0.2, 0, 0], head: [0.25, 0, 0], armR: [-0.85, 0, 0.05], elbowR: [-1.2, 0, 0], pitch: -1.2, armL: [-0.8, 0, -0.2], elbowL: [-1.2, 0, 0] });
  const stamp = { windup: 'outCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };
  ATTACK_POSES.ringerFetterStamp = { ease: stamp, hits: [{ windup: stampUp(true), strike: stampDown(true), follow: { ...stampDown(true), crouch: 0.32 } }] };
  ATTACK_POSES.ringerFetterStamp2 = { ease: stamp, hits: [{ windup: stampUp(true), strike: stampDown(true), follow: { ...stampDown(true), crouch: 0.32 } },
    { windup: stampUp(false), strike: stampDown(false), follow: { ...stampDown(false), crouch: 0.34 } }] };

  // The Backstroke: behind her, a look over her right shoulder, the clapper raised before her left; swung back round.
  ATTACK_POSES.ringerBackstroke = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.1 }, hits: [{
    windup: { crouch: 0.15, spin: [0, 0.5, 0], chest: [0.05, 0.3, 0], neck: [0, -0.5, 0], head: [0.05, -1.0, 0],
              armR: [-1.4, 0, 0.6], elbowR: [-1.2, 0, 0], pitch: -1.3, armL: [-1.0, 0, -0.3], elbowL: [-1.1, 0, 0] },
    strike: { crouch: 0.25, lean: -0.15, legL: [-0.2, 0, 0], legR: [0.55, 0, 0], spin: [0, -1.2, 0], chest: [0.1, -0.5, 0], neck: [0, -0.4, 0], head: [0.05, -0.7, 0],
              armR: [0.7, 0, -0.6], elbowR: [-0.1, 0, 0], pitch: 0.45, armL: [-0.6, 0, 0.2], elbowL: [-0.4, 0, 0] },
    follow: { crouch: 0.26, lean: -0.15, legL: [-0.22, 0, 0], legR: [0.57, 0, 0], spin: [0, -1.35, 0], chest: [0.12, -0.55, 0], neck: [0, -0.4, 0], head: [0.05, -0.7, 0],
              armR: [0.75, 0, -0.65], elbowR: [-0.1, 0, 0], pitch: 0.45, armL: [-0.6, 0, 0.2], elbowL: [-0.4, 0, 0] } }] };

  // Calling Across the Ring: the clapper stood upright before her bowed face, as if listening to it; then struck down on
  // the floor. The knell runs out along the stones past the edge of her circle.
  const call = { windup: { crouch: 0.12, lean: 0.1, legL: [-0.3, 0, 0], legR: [0.3, 0, 0], chest: [0.15, 0, 0], neck: [0.3, 0, 0], head: [0.45, 0, 0],
    armR: [-0.75, 0, 0.25], elbowR: [-1.7, 0, 0], pitch: -1.5, armL: [-0.85, 0, -0.25], elbowL: [-1.6, 0, 0] },
    strike: { ...struck, crouch: 0.4, lean: 0.55, armR: [-0.6, 0, 0.05], elbowR: [0, 0, 0], pitch: 0.15, armL: [-0.7, 0, -0.1], elbowL: [-0.2, 0, 0] } };
  ATTACK_POSES.ringerCallAcross = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [{ ...call, follow: { ...call.strike, crouch: 0.42 } }] };

  // ---- over the line (second phase) ----
  // Over the Line: the clapper raised high in her right hand, her left arm flung wide, her face lifted to the bell that
  // is not there; brought down, and the great knell runs out to the walls.
  const wide = { crouch: 0, lean: -0.3, legL: [-0.2, 0, 0.12], legR: [0.2, 0, -0.12], chest: [-0.4, 0, 0], neck: [-0.3, 0, 0], head: [-0.55, 0, 0],
    armR: [-3.0, 0, -0.3], elbowR: [-0.3, 0, 0], pitch: -3.4, armL: [-0.2, 0, 1.4], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.ringerOverTheLine = { ease: fall, hits: [{ windup: wide, strike: { ...struck, crouch: 0.42, lean: 0.6 }, follow: { ...deeper, crouch: 0.44, lean: 0.6 } },
    { windup: { ...deeper, crouch: 0.44, lean: 0.6 }, strike: { ...deeper, crouch: 0.46, lean: 0.62 }, follow: { ...deeper, crouch: 0.4 } }] };

  // The Nine Tailors: she kneels and counts them out, the clapper lifted upright and struck down; three knells at a
  // steady pace, then the fourth lifted over her head, heavier, wider.
  const knelt = { crouch: 0.5, lean: 0.2, legL: [-1.25, 0, 0], kneeL: [1.35, 0, 0], legR: [0.35, 0, 0], kneeR: [1.55, 0, 0], neck: [0.25, 0, 0], head: [0.3, 0, 0] };
  const tellUp = { ...knelt, chest: [0, 0, 0], armR: [-1.3, 0, 0.2], elbowR: [-1.3, 0, 0], pitch: -1.4, armL: [-1.2, 0, -0.2], elbowL: [-1.4, 0, 0] };
  const tellDown = { ...knelt, lean: 0.35, chest: [0.3, 0, 0], armR: [-0.7, 0, 0.1], elbowR: [-0.2, 0, 0], pitch: 0.27, armL: [-0.7, 0, -0.1], elbowL: [-0.4, 0, 0] };
  const tellHigh = { ...knelt, lean: 0, chest: [-0.3, 0, 0], neck: [-0.1, 0, 0], head: [-0.3, 0, 0], armR: [-2.8, 0, -0.1], elbowR: [-0.4, 0, 0], pitch: -3.0,
    armL: [-2.6, 0, 0.1], elbowL: [-0.8, 0, 0] };
  const knell = up => ({ windup: up, strike: tellDown, follow: { ...tellDown, lean: 0.38 } });
  ATTACK_POSES.ringerNineTailors = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'linear', recovery: 'inOutCubic' },
    hits: [knell(tellUp), knell(tellUp), knell(tellUp), { ...knell(tellHigh), strike: { ...tellDown, lean: 0.45, chest: [0.4, 0, 0], pitch: 0.12 } }] };

  // The Peal: the clapper held across her like a staff, both fists wide on the shaft; four quick blows, over her left
  // shoulder and her right in turn, the last struck into the floor.
  const pealUp = L => ({ crouch: 0.12, spin: [0, L ? 0.5 : -0.6, 0], chest: [-0.1, L ? 0.25 : -0.3, 0], head: [0, L ? -0.3 : 0.35, 0],
    armR: [-2.3, 0, L ? 0.5 : -0.8], elbowR: [L ? -1.0 : -0.6, 0, 0], pitch: -2.2, armL: [-1.8 - (L ? 0 : 0.1), 0, L ? 0.2 : 0.5], elbowL: [L ? -1.2 : -1.0, 0, 0] });
  const pealDown = L => ({ crouch: 0.22, lean: 0.25, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], spin: [0, L ? -0.5 : 0.5, 0], chest: [0.2, L ? -0.3 : 0.3, 0], head: [0, L ? 0.3 : -0.3, 0],
    armR: [-0.9, 0, L ? -0.5 : 0.4], elbowR: [-0.2, 0, 0], pitch: 0.7, armL: [-1.0, 0, L ? -0.1 : 0.3], elbowL: [-0.5, 0, 0] });
  const peal = L => ({ windup: pealUp(L), strike: pealDown(L), follow: { ...pealDown(L), crouch: 0.24 } });
  ATTACK_POSES.ringerPeal = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.08 },
    hits: [peal(true), peal(false), peal(true), { windup: { ...pealUp(false), crouch: 0.05, lean: -0.15 }, strike: struck, follow: deeper }] };

  // Out of the Ring: down in a crouch, the clapper slung over her right shoulder, the ball at her back; she leaps and
  // brings it down where she lands.
  ATTACK_POSES.ringerOutOfTheRing = { ease: { windup: 'inOutCubic', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [
    { windup: { crouch: 0.45, lean: 0.25, legL: [-0.6, 0, 0], legR: [0.5, 0, 0], chest: [0.2, -0.2, 0], neck: [0, 0.1, 0], head: [-0.2, 0, 0],
                armR: [-2.6, 0, -0.3], elbowR: [-1.6, 0, 0], pitch: -3.4, armL: [-1.6, 0, 0.2], elbowL: [-1.4, 0, 0] },
      strike: struck, follow: deeper },
    { windup: { ...deeper, crouch: 0.38 }, strike: { ...deeper, crouch: 0.4 }, follow: { ...deeper, crouch: 0.3, lean: 0.4 } }] };
  // Every clapper angle above is a `pitch`, the way the shaft points; here it becomes the weapon bone's angle.
  for (const [id, P] of Object.entries(ATTACK_POSES)) if (id.startsWith('ringer')) for (const h of P.hits) for (const k of ['windup', 'strike', 'follow']) {
    const q = h[k]; if (!q || !('pitch' in q)) continue;
    const { pitch, ...rest } = q, x = b => (rest[b] ? rest[b][0] : 0);
    h[k] = { ...rest, weapon: [pitch + 0.08 - x('armR') - x('elbowR') - x('chest') - (rest.lean || 0), 0, 0] };
  }
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  // A knell: a ring along the floor from `from` to `to` m in `time` s, `width` m thick. It runs out slowly enough to be
  // seen coming and jumped (its band passes in under 0.2 s, inside a roll's i-frames too); a hit's `active` lasts as
  // long as its ring, and js/ring-waves.js draws it where the hitbox is.
  const RING = (from, to, width, time) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time } });
  const knell = (from, to, width, time, extra = {}) => ({ active: time, box: RING(from, to, width, time), ...extra });
  const RINGER = {
    id: 'ringer', model: 'ringerOfThrale', name: 'The Ringer of Thrale',
    description: 'The bellwright\'s daughter who rang Thrale\'s bell without leave, shut in the great ring of the Night Gaol for it with the clapper chained to her wrist. Her chain is long broken; she still keeps to the circle it let her reach, and calls across it. Jump the knell along the floor.',
    scale: 1.85, bulk: 1.0, radius: 0.7, color: 0x8a8478, weapon: 'club', idle: 'sway',
    visual: { skin: 0xb0a8a0, roughness: 0.75, rim: 0.9 },
    hp: 3000, poise: 220, speed: 2.6, turnRate: 3.2, trackRate: 1.8, approach: 0.55, kite: 0.1,
    cooldown: [1.0, 2.0], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 6,
    posture: { max: 125, parry: 62, chainGap: 1.8, chainMul: 1.35, decay: 4.5, breakTime: 3.2, hitstop: 0.2 },
    defaultPhases: ['chained', 'tolling'],
    phases: {
      // Chained: she cannot leave the circle her chain let her reach (8.5 m round where she stands).
      chained: { hp: 3000, tether: 8.5,
        attacks: ['strikeHour', 'changeRinging', 'risingToll', 'clapperDrive', 'fetterStamp', 'backstroke', 'callAcross', 'callPunish'] },
      // Past half her strength she steps over the line, and rings the hours.
      tolling: { at: 0.5, name: 'The Ringer of Thrale, Over the Line', opener: 'overTheLine', cooldown: [0.7, 1.5], approach: 0.75, kite: 0.05, speed: 3.0, trackRate: 2.1,
        attacks: ['strikeHour2', 'changeRinging', 'risingToll', 'clapperDrive', 'fetterStamp2', 'backstroke', 'callAcross', 'callPunish',
                  'overTheLine', 'nineTailors', 'peal', 'outOfTheRing'] },
    },
    attacks: [
      // ---- chained ------------------------------------------------------------------------------------------------------
      // The Hour Struck: the ball hung down her back, held, brought over onto you. Step aside, not back.
      { id: 'strikeHour', name: 'The Hour Struck', anim: 'chop', pose: 'ringerHourStruck', tracking: { rate: 2.0, commit: 0.6 }, markers: glint(0),
        hits: [{ startup: 1.45, active: 0.14, follow: 0.5, hold: { at: 0.6, time: [0.35, 1.0], chance: 0.6 } }], recovery: 1.4,
        damage: 44, poise: 75, knock: 8, lunge: 1.2, range: 4.0, box: { w: 1.8, h: 3.2, d: 4.4, fwd: 2.5, y: 1.2 },
        impact: { ring: 2.6, crack: 1.4, dust: 14, shake: 0.12 } },
      // Change Ringing: low at the knees from her left (jump it or roll it), then high across from her right.
      { id: 'changeRinging', name: 'Change Ringing', anim: 'sweep', pose: 'ringerChangeRinging', tracking: { rate: 2.6, commit: 0.6 }, markers: glint(0, 1),
        hits: [{ startup: 0.95, active: 0.16, follow: 0.12, box: { w: 6.5, h: 0.9, d: 3.6, fwd: 1.6, y: 0.45 } },
               { startup: 0.6, active: 0.16, follow: 0.35, box: { w: 6.5, h: 1.2, d: 3.6, fwd: 1.6, y: 1.9 } }], recovery: 1.0,
        followUps: [{ attack: 'backstroke', if: 'behind', chance: 0.6 }],
        damage: 28, poise: 45, knock: 6, lunge: 1.4, range: 3.8, box: { w: 6.5, h: 0.9, d: 3.6, fwd: 1.6, y: 0.45 } },
      // The Rising Toll: from between her feet, up and over. Late: roll at the last moment.
      { id: 'risingToll', name: 'The Rising Toll', anim: 'overhead', pose: 'ringerRisingToll', tracking: { rate: 2.8, commit: 0.7 }, markers: glint(0),
        hits: [{ startup: 1.15, active: 0.14, follow: 0.4 }], recovery: 1.1,
        damage: 36, poise: 60, knock: 9, lunge: 1.6, range: 3.6, box: { w: 1.8, h: 3.4, d: 3.4, fwd: 1.9, y: 1.5 } },
      // The Clapper Drive: a short jab to draw you in, then the long drive.
      { id: 'clapperDrive', name: 'The Clapper Drive', anim: 'thrust', pose: 'ringerClapperDrive', tracking: { rate: 3.0, commit: 0.7 }, markers: glint(0, 1),
        hits: [{ startup: 0.8, active: 0.1, follow: 0.12, box: { w: 1.0, h: 1.4, d: 2.8, fwd: 1.9, y: 1.2 } },
               { startup: 0.55, active: 0.14, follow: 0.35, hold: { at: 0.6, time: [0.2, 0.6], chance: 0.45 } }], recovery: 1.0,
        damage: 28, poise: 45, knock: 7, lunge: 3.0, range: 4.4, box: { w: 1.2, h: 1.4, d: 4.4, fwd: 2.7, y: 1.2 } },
      // The Fetter Stamp: the knee up, the fettered foot stamped; a ring runs out. It flows on into the rising toll or the
      // hour struck.
      { id: 'fetterStamp', name: 'The Fetter Stamp', anim: 'stomp', pose: 'ringerFetterStamp', noParry: true, rollOnly: true, tracking: { rate: 1.8, commit: 0.5 }, chance: 0.45,
        hits: [{ startup: 0.95, follow: 0.2, ...knell(0.8, 5.5, 1.4, 0.45), impact: { ring: 2.6, crack: 1.2, dust: 12, shake: 0.1 } }], recovery: 1.0,
        followUps: [{ attack: 'risingToll', if: 'near', chance: 0.5 }, { attack: 'strikeHour', if: 'any', chance: 0.3 }],
        damage: 22, poise: 35, knock: 6, lunge: 0, range: 5, box: RING(0.8, 5.5, 1.4, 0.45) },
      // Behind her: a look over her shoulder and the clapper swung back round.
      { id: 'backstroke', name: 'The Backstroke', anim: 'sweep', pose: 'ringerBackstroke', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 4,
        hits: [{ startup: 0.7, active: 0.14, follow: 0.3 }], recovery: 0.9,
        damage: 24, poise: 40, knock: 8, lunge: 0, range: 3.4, box: { w: 3.6, h: 2.0, d: 3.0, fwd: -1.5, y: 1.0 } },
      // Calling Across the Ring: from inside her circle, to you standing off: the clapper listened to, then struck on the
      // floor. The knell runs out to 20 m. Jump it (or roll through it); a shield does not stop it.
      { id: 'callAcross', name: 'Calling Across the Ring', anim: 'chop', pose: 'ringerCallAcross', noParry: true, rollOnly: true, tracking: { rate: 2.0, commit: 0.8 },
        minRange: 6, chance: 0.5,
        hits: [{ startup: 1.5, follow: 0.4, hold: { at: 0.7, time: [0.2, 0.7], chance: 0.5 }, ...knell(1, 20, 1.4, 1.5), impact: { ring: 3.0, crack: 1.0, dust: 12, shake: 0.1 } }],
        recovery: 1.2, damage: 24, poise: 30, knock: 5, lunge: 0, range: 20, box: RING(1, 20, 1.4, 1.5) },
      // Drinking where she can see it: the same call, sooner.
      { id: 'callPunish', name: 'Calling Across the Ring', anim: 'chop', pose: 'ringerCallAcross', noParry: true, rollOnly: true, when: 'healing', tracking: { rate: 2.6, commit: 0.8 },
        minRange: 4, chance: 3,
        hits: [{ startup: 0.95, follow: 0.4, ...knell(1, 20, 1.4, 1.5), impact: { ring: 3.0, crack: 1.0, dust: 12, shake: 0.1 } }],
        recovery: 1.0, damage: 26, poise: 30, knock: 5, lunge: 0, range: 20, box: RING(1, 20, 1.4, 1.5) },
      // ---- over the line ------------------------------------------------------------------------------------------------
      // The Hour Struck twice: the ball struck again where it lies, and a knell runs out from it.
      { id: 'strikeHour2', name: 'The Hour Struck', anim: 'chop', pose: 'ringerHourStruck2', tracking: { rate: 2.2, commit: 0.6 }, markers: glint(0),
        hits: [{ startup: 1.35, active: 0.14, follow: 0.25, hold: { at: 0.6, time: [0.3, 0.9], chance: 0.55 }, impact: { ring: 2.6, crack: 1.4, dust: 14, shake: 0.12 } },
               { startup: 0.45, follow: 0.45, ...knell(1, 10, 1.5, 0.7), impact: { ring: 3.4, crack: 0, dust: 12, shake: 0.1 } }], recovery: 1.3,
        damage: 44, poise: 75, knock: 8, lunge: 1.2, range: 4.0, box: { w: 1.8, h: 3.2, d: 4.4, fwd: 2.5, y: 1.2 } },
      // Two Fetters: the left foot stamped, then the right, wider.
      { id: 'fetterStamp2', name: 'The Fetter Stamp', anim: 'stomp', pose: 'ringerFetterStamp2', noParry: true, rollOnly: true, tracking: { rate: 1.8, commit: 0.5 }, chance: 0.45,
        hits: [{ startup: 0.9, follow: 0.1, ...knell(0.8, 5.5, 1.4, 0.45), impact: { ring: 2.6, crack: 1.2, dust: 12, shake: 0.1 } },
               { startup: 0.65, follow: 0.3, ...knell(1, 9, 1.6, 0.6), impact: { ring: 4.0, crack: 1.8, dust: 18, shake: 0.14 } }], recovery: 1.1,
        followUps: [{ attack: 'risingToll', if: 'near', chance: 0.5 }, { attack: 'peal', if: 'any', chance: 0.25 }],
        damage: 24, poise: 40, knock: 7, lunge: 0, range: 6, box: RING(0.8, 5.5, 1.4, 0.45) },
      // Over the Line (the phase opener): the clapper raised high, her arm flung wide, her face lifted; brought down on
      // the floor where her circle ends, and the great knell runs out to the walls.
      { id: 'overTheLine', name: 'Over the Line', anim: 'chop', pose: 'ringerOverTheLine', noParry: true, rollOnly: true, tracking: { rate: 1.6, commit: 0.6 }, chance: 0.1,
        hits: [{ startup: 1.6, active: 0.16, follow: 0.35, box: { w: 3.2, h: 2.4, d: 3.6, fwd: 1.4, y: 1.0 }, impact: { ring: 3.6, crack: 1.8, dust: 20, shake: 0.18 } },
               { startup: 0.35, follow: 0.5, ...knell(1, 22, 1.6, 1.6), impact: { ring: 5.0, crack: 0, dust: 14, shake: 0.12 } }],
        recovery: 1.6, damage: 40, poise: 70, knock: 9, lunge: 0.6, range: 8, box: { w: 3.2, h: 2.4, d: 3.6, fwd: 1.4, y: 1.0 } },
      // The Nine Tailors: knelt, she counts them out: three knells at a steady pace, then a fourth, heavier and wider.
      // Jump each on the beat; her body is open between them.
      { id: 'nineTailors', name: 'The Nine Tailors', anim: 'chop', pose: 'ringerNineTailors', noParry: true, rollOnly: true, tracking: { rate: 1.2, commit: 0.4 }, chance: 0.3,
        hits: [{ startup: 1.4, follow: 0.05, ...knell(1, 12, 1.2, 0.9), impact: { ring: 2.4, crack: 0.8, dust: 8, shake: 0.06 } },
               { startup: 0.5, follow: 0.05, ...knell(1, 12, 1.2, 0.9), impact: { ring: 2.4, crack: 0, dust: 8, shake: 0.06 } },
               { startup: 0.5, follow: 0.05, ...knell(1, 12, 1.2, 0.9), impact: { ring: 2.4, crack: 0, dust: 8, shake: 0.06 } },
               { startup: 0.95, follow: 0.5, ...knell(1, 20, 1.6, 1.4), impact: { ring: 4.4, crack: 1.6, dust: 18, shake: 0.14 } }],
        recovery: 1.6, damage: 20, poise: 30, knock: 5, lunge: 0, range: 12, box: RING(1, 12, 1.2, 0.9) },
      // The Peal: four quick blows from the shoulders, left, right, left, the last into the floor with a short knell.
      { id: 'peal', name: 'The Peal', anim: 'chop', pose: 'ringerPeal', tracking: { rate: 3.0, commit: 0.65 }, markers: glint(0, 1, 2, 3),
        hits: [{ startup: 0.75, active: 0.12, follow: 0.08 }, { startup: 0.38, active: 0.12, follow: 0.08 }, { startup: 0.38, active: 0.12, follow: 0.08 },
               { startup: 0.65, follow: 0.4, ...knell(0.8, 6, 1.4, 0.45), impact: { ring: 2.8, crack: 1.2, dust: 12, shake: 0.1 } }],
        recovery: 1.2, damage: 24, poise: 35, knock: 5, lunge: 1.6, range: 3.6, box: { w: 2.4, h: 2.6, d: 3.6, fwd: 1.9, y: 1.2 } },
      // Out of the Ring: a crouch, the clapper over her shoulder; a leap, and it comes down where she lands, a knell after.
      { id: 'outOfTheRing', name: 'Out of the Ring', anim: 'chop', pose: 'ringerOutOfTheRing', noParry: true, tracking: { rate: 2.4, commit: 0.5 }, minRange: 5, chance: 0.35,
        hits: [{ startup: 1.4, active: 0.14, follow: 0.3, leap: { from: 0.45, max: 13, short: 1.4 }, impact: { ring: 4.6, crack: 2.2, dust: 22, shake: 0.18 } },
               { startup: 0.35, follow: 0.5, ...knell(1, 9, 1.5, 0.55), impact: { ring: 3.6, crack: 0, dust: 10, shake: 0.1 } }],
        recovery: 1.7, damage: 46, poise: 85, knock: 10, lunge: 0, range: 13, box: { w: 2.4, h: 2.8, d: 4.4, fwd: 2.4, y: 1.0 } },
    ],
  };
  ENEMY_DEFS.push(RINGER); ENEMY_BY_ID[RINGER.id] = RINGER;
}
