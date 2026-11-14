'use strict';
// ============================================================================
// The Regent Hollis (v7.44.0; his own since pass 44), the boss of Level 10, js/levels/aurel.js (STORY.md 10f)
// ============================================================================
// The steward the hunger left to keep Aurel fed when it went over the mountains: gilded, gracious, cruel. Aurel lays its
// faces in gold leaf, and so did he, and the gilt remembers what he does with it: every cut he makes leaves its line
// hanging in the air in gold leaf, and a beat later the line cuts again where it hangs (a hit's `echo`, js/enemy.js
// makeHitbox; drawn by js/gilt-echo.js). He bows while it falls; the leaves tremble and the seam brightens just before.
// The man can be parried; the memory cannot (js/combat.js parryTiming): step out of the line. Past the worst of his hurt
// (`hungry`) the gilt cracks and the hunger shows through it: his cuts hang as embers, he calls them home to him through
// you (`home`), and he eats like what he is.
//
// Every wind-up is his own. The bow, the sword low at his right (the courtesy); the blade upright before his face (the
// salute); the sword wound back level at his waist (taking your measure); a deep coil with the point trailing on the
// floor (the long table); both hands high behind his head (the judgement); a look over his shoulder (the turning cloak);
// the left hand drawn to his breast, then flung open (largesse). Hungry: the mask clutched in his left hand (the gilt
// cracks); hunched, looking up (ravenous); the sword raised point-down in both hands (the feast); the left hand reaching
// out and drawn back to him (called home). Blade angles below are a `pitch` (0 level ahead, -1.57 straight up, positive
// dips the point), worked out into the weapon bone's angle by the loop after the poses, as for the Ringer.

// ---- his figure: built in Blender (tools/blender/hollis.py), one piece per bone ----------------------------------------
// A gold-leaf mask of a face with a thin smile, silver hair under a regent's fillet; a standing crimson collar over a fur
// roll; a gilt cuirass with the steward's chain and the city's sun; crimson sleeves, layered gilt pauldrons, gilt
// vambraces, the left hand open; a crimson robe hemmed in gold over gilt faulds; a crimson mantle to the floor (three
// bones that swing); gilt greaves and pointed sabatons; the Sword of State, a long bright blade with curled quillons and a
// crowned pommel. Seams of fire in the mask and cuirass (`burn`) show only while he burns.
MODEL_DEFS.regentHollis = {
  extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.55,
  proportions: { shoulderX: 0.38, torsoW: 0.24, torsoD: 0.18, armR: 0.07, legR: 0.09, headR: 0.12, handR: 0.065, footLen: 0.34 },
  posture: { chest: [-0.05, 0, 0], neck: [0.02, 0, 0], head: [-0.08, 0, 0], elbowL: [-0.25, 0, 0], elbowR: [-0.3, 0, 0] },   // upright, chin up
  materials: {
    gilt: { tex: 'wornGilt', tint: 0xe4cc68, decay: 0.3, rim: 0.55 },
    gold: { tex: 'sentinelFiligree', tint: 0xf4e078, decay: 0.25, rim: 0.6 },
    robe: { tex: 'duelistVelvet', tint: 0x9a1820, decay: 0.2, double: true, rim: 0.3 },
    trim: { tex: 'sentinelTrim', tint: 0xe0b450, decay: 0.4, double: true },
    fur: { tex: 'margitFur', tint: 0xe8e0d0, decay: 0.5 },
    hair: { tex: 'execPlumage', tint: 0xd0d0d4, decay: 0.45 },
    dark: { tex: 'crackedLeather', tint: 0x3a2e28, decay: 0.6 },
    blade: { tex: 'dentedSteel', tint: 0xf0ece0, decay: 0.2, rim: 0.6 },
    burn: { glow: 0xff6a20, burn: true },
    eye: { glow: 0xffc860 },
  },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0, -0.02, -0.2] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.26] }, capeB: { parent: 'capeA', at: [0, -0.44, -0.04] }, capeC: { parent: 'capeB', at: [0, -0.44, -0.03] },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    head: ['gilt', 'gold', 'hair', 'burn'], chest: ['gilt', 'gold', 'robe', 'robe.1', 'trim', 'fur', 'burn'], spin: ['gilt', 'gold', 'robe'],
    loinF: ['robe', 'trim'], loinB: ['robe', 'trim'], capeA: ['robe'], capeB: ['robe'], capeC: ['robe', 'trim'],
    armL: ['gilt', 'robe'], armR: ['gilt', 'robe'], elbowL: ['gilt', 'gold'], elbowR: ['gilt', 'gold'],
    legL: ['dark'], legR: ['dark'], kneeL: ['gilt', 'gold'], kneeR: ['gilt', 'gold'],
    weapon: ['blade', 'gold', 'robe'],   // (its fuller's fire, weapon__burn, is left out: a weapon piece is never hidden)
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `hollis:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42,
    ...(bone === 'weapon' ? { weapon: true } : {}) }))),
  weapon: null,          // the Sword of State is part of the figure (the `weapon: true` pieces above)
  weaponRest: 1.3,       // at rest its point is low before his right foot (the `sway` idle)
  eyes: { color: 0xffc860, size: 0.009, spread: 0.032, at: [0, 0.1, 0.1] },   // through the mask's eye slits
  anim: {
    idle: { breathRate: 0.7, breath: 0.012, headDrift: 0.03, sway: 0.008, twitch: 0 }, walk: { twist: 0.06, roll: 0.03, headNod: 0.02, elbow: 0.1, drag: 0.05 },
    flinch: { head: 0.3, chest: 0.3, arms: 0.25 }, death: { buckle: 0.8, slump: 0.9 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5.4, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 52, damp: 5, flutter: 0.04 },
      { bone: 'capeA', gain: 0.12, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.16, k: 34, damp: 3.8, flutter: 0.04 },
      { bone: 'capeC', gain: 0.2, k: 28, damp: 3.2, flutter: 0.06 }],
  },
};

// ---- key poses (js/data/attack-poses.js format) -------------------------------------------------------------------------
{
  const swing = { windup: 'inOutCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };
  // Gilt echoes are drawn by his left hand: it opens toward the hanging line and closes as it cuts.
  const bow = { crouch: 0.12, lean: 0.35, legL: [-0.2, 0, 0], legR: [0.35, 0, 0], chest: [0.4, 0, 0], neck: [0.25, 0, 0], head: [0.2, 0, 0],
    armR: [0.35, 0, -0.35], elbowR: [-0.15, 0, 0], pitch: 1.3, armL: [-0.7, 0, -0.5], elbowL: [-1.9, 0, 0] };
  const present = { crouch: 0.05, lean: -0.05, legL: [-0.3, 0, 0], legR: [0.2, 0, 0], spin: [0, 0.2, 0], chest: [-0.08, 0.1, 0], head: [-0.1, 0, 0],
    armR: [-0.3, 0, -0.15], elbowR: [-0.3, 0, 0], pitch: 1.1, armL: [-1.3, 0, 0.4], elbowL: [-0.6, 0, 0] };
  const closeHand = { ...present, head: [0.08, 0, 0], armL: [-1.0, 0, 0.15], elbowL: [-1.4, 0, 0] };
  const echo = (open, shut) => ({ windup: open, strike: shut, follow: shut });

  // The Courtesy: a bow, the sword low at his right; a rising cut across to high on his left. The cut hangs; he offers
  // it his open hand, and closes it.
  const rise = { crouch: 0.15, lean: 0.1, legL: [-0.55, 0, 0], legR: [0.35, 0, 0], spin: [0, 0.7, 0], chest: [-0.1, 0.35, 0], head: [0, -0.3, 0],
    armR: [-2.3, 0, 0.5], elbowR: [-0.2, 0, 0], pitch: -1.0, armL: [-0.3, 0, 0.5], elbowL: [-0.4, 0, 0] };
  const risen = { ...rise, spin: [0, 0.85, 0], armR: [-2.5, 0, 0.6], pitch: -1.3 };
  ATTACK_POSES.hollisCourtesy = { ease: { ...swing, windup: 'inOutSine' }, lag: { weapon: 0.08, armR: 0.04 }, hits: [{ windup: bow, strike: rise, follow: risen }, echo(present, closeHand)] };
  // ... and hungry, it is answered from high on his right, down across to his left: two lines, an X.
  const over = { crouch: 0.1, lean: -0.05, legL: [-0.4, 0, 0], legR: [0.3, 0, 0], spin: [0, -0.6, 0], chest: [-0.15, -0.3, 0], neck: [0, 0.3, 0], head: [0, 0.3, 0],
    armR: [-2.6, 0, -0.6], elbowR: [-0.5, 0, 0], pitch: -2.0, armL: [-0.6, 0, 0.4], elbowL: [-0.8, 0, 0] };
  const across = { crouch: 0.28, lean: 0.35, legL: [-0.6, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.6, 0], chest: [0.3, 0.35, 0], neck: [0, -0.2, 0], head: [0, -0.25, 0],
    armR: [-0.8, 0, 0.6], elbowR: [0, 0, 0], pitch: 0.9, armL: [-0.4, 0, 0.6], elbowL: [-0.5, 0, 0] };
  ATTACK_POSES.hollisCourtesy2 = { ease: { ...swing, windup: 'inOutSine' }, lag: { weapon: 0.08, armR: 0.04 }, hits: [{ windup: bow, strike: rise, follow: risen },
    { windup: over, strike: across, follow: { ...across, spin: [0, 0.75, 0] } }, echo(present, { ...present, armL: [-1.2, 0, 0.3], elbowL: [-0.9, 0, 0] }), echo(present, closeHand)] };

  // The Salute: heels together, the blade upright before his face, the other hand behind his back; then the long thrust.
  // The thrust hangs where it was; a nod of the blade, and it runs through again.
  const salute = { crouch: 0, lean: -0.05, legL: [0, 0, 0], legR: [0.05, 0, 0], chest: [-0.08, 0, 0], neck: [0.05, 0, 0], head: [0.15, 0, 0],
    armR: [-1.0, 0, 0.35], elbowR: [-1.4, 0, 0], pitch: -1.55, armL: [0.5, 0, 0.2], elbowL: [-1.6, 0, 0] };
  const thrust = { crouch: 0.25, lean: 0.35, legL: [-1.0, 0, 0], kneeL: [0.6, 0, 0], legR: [0.55, 0, 0], spin: [0, -0.35, 0], chest: [0.2, 0, 0], head: [-0.1, 0, 0],
    armR: [-1.45, 0, 0.1], elbowR: [0, 0, 0], pitch: 0.05, armL: [0.6, 0, 0.4], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.hollisSalute = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.06 },
    hits: [{ windup: salute, strike: thrust, follow: { ...thrust, lean: 0.4, crouch: 0.28 } },
      { windup: { ...salute, head: [-0.1, 0, 0] }, strike: { ...salute, head: [0.3, 0, 0], pitch: -1.2 }, follow: { ...salute, head: [0.3, 0, 0], pitch: -1.2 } }] };

  // Taking Your Measure: the sword wound back level at his right hip, his eyes on you over his shoulder; across at the
  // waist, a step and back again. He stands the sword on its point before him, both hands on the pommel, and nods: the
  // first cut comes again.
  const wound = { crouch: 0.18, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], spin: [0, -1.1, 0], chest: [0, -0.4, 0], neck: [0, 0.6, 0], head: [0, 0.6, 0],
    armR: [-1.2, 0, -1.0], elbowR: [-0.3, 0, 0], pitch: 0.15, armL: [-0.6, 0, 0.4], elbowL: [-1.0, 0, 0] };
  const fore = { crouch: 0.2, lean: 0.15, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.9, 0], chest: [0.05, 0.35, 0], neck: [0, -0.3, 0], head: [0, -0.4, 0],
    armR: [-1.4, 0, 0.7], elbowR: [0, 0, 0], pitch: 0.15, armL: [-0.3, 0, 0.6], elbowL: [-0.6, 0, 0] };
  const back = { crouch: 0.2, lean: 0.15, legL: [-0.45, 0, 0], legR: [0.45, 0, 0], spin: [0, -1.0, 0], chest: [0, -0.35, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armR: [-1.4, 0, -1.0], elbowR: [0, 0, 0], pitch: 0.1, armL: [-0.5, 0, 0.3], elbowL: [-0.6, 0, 0] };
  const pommel = { crouch: 0.02, legL: [-0.15, 0, 0], legR: [0.15, 0, 0], head: [-0.1, 0, 0],
    armR: [-0.55, 0, 0.25], elbowR: [-0.6, 0, 0], pitch: 1.5, armL: [-0.55, 0, -0.25], elbowL: [-0.6, 0, 0] };
  ATTACK_POSES.hollisMeasure = { ease: swing, lag: { weapon: 0.08, armR: 0.05 }, hits: [
    { windup: wound, strike: fore, follow: { ...fore, spin: [0, 1.05, 0], armR: [-1.4, 0, 0.85] } },
    { windup: { ...fore, spin: [0, 1.05, 0], crouch: 0.22 }, strike: back, follow: { ...back, spin: [0, -1.15, 0] } },
    echo(pommel, { ...pommel, head: [0.15, 0, 0] })] };
  // Called Home (hungry): his open left hand held out to you first, palm up, the blade high behind his shoulder (its own
  // tell); then the measuring cut, a leap back from you with a cut at nothing, and his hand draws the hanging line home to
  // him, through you.
  const reach = { crouch: 0.15, lean: -0.1, legL: [-0.4, 0, 0], legR: [0.3, 0, 0], chest: [-0.1, 0.15, 0], head: [-0.1, 0, 0],
    armR: [-0.4, 0, -0.6], elbowR: [-0.2, 0, 0], pitch: 0.6, armL: [-1.5, 0, 0.2], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.hollisCallHome = { ease: swing, lag: { weapon: 0.08, armR: 0.05 }, hits: [
    { windup: { ...wound, crouch: 0.1, armR: [-2.4, 0, -0.6], elbowR: [-0.6, 0, 0], armL: [-1.4, 0, -0.1], elbowL: [-0.2, 0, 0] }, strike: fore, follow: { ...fore, spin: [0, 1.05, 0], armR: [-1.4, 0, 0.85] } },
    { windup: { ...fore, crouch: 0.35, lean: 0.3, spin: [0, 0.6, 0] }, strike: back, follow: { ...back, crouch: 0.3 } },
    { windup: reach, strike: { ...reach, lean: 0.1, chest: [0.1, -0.1, 0], armL: [-0.9, 0, -0.2], elbowL: [-1.9, 0, 0] },
      follow: { ...reach, lean: 0.1, chest: [0.1, -0.1, 0], armL: [-0.9, 0, -0.2], elbowL: [-1.9, 0, 0] } }] };

  // The Long Table: a deep coil, the point trailing on the floor behind his right heel; a sweep at the knees, wide as a
  // banquet. He rises, and lays his open hand along it: it is swept again.
  const coil = { crouch: 0.42, lean: 0.35, legL: [-0.7, 0, 0], kneeL: [0.6, 0, 0], legR: [0.6, 0, 0], kneeR: [0.5, 0, 0], spin: [0, -1.2, 0], chest: [0.25, -0.3, 0],
    neck: [0, 0.6, 0], head: [-0.2, 0.5, 0], armR: [0.2, 0, -0.7], elbowR: [-0.1, 0, 0], pitch: 1.0, armL: [-0.8, 0, 0.6], elbowL: [-0.5, 0, 0] };
  const laid = { ...coil, spin: [0, 1.1, 0], chest: [0.25, 0.35, 0], neck: [0, -0.3, 0], head: [-0.1, -0.4, 0], armR: [-0.9, 0, 0.9], elbowR: [0, 0, 0], pitch: 0.85,
    armL: [0.2, 0, 0.9], elbowL: [-0.2, 0, 0] };
  const host = { crouch: 0.15, lean: 0.05, legL: [-0.35, 0, 0], legR: [0.3, 0, 0], spin: [0, 0.3, 0], chest: [0, 0.1, 0],
    armR: [-0.6, 0, -0.9], elbowR: [-0.1, 0, 0], pitch: 0.4, armL: [-0.9, 0, 0.9], elbowL: [-0.2, 0, 0] };
  ATTACK_POSES.hollisLongTable = { ease: { ...swing, windup: 'inOutSine' }, lag: { weapon: 0.1 },
    hits: [{ windup: coil, strike: laid, follow: { ...laid, spin: [0, 1.3, 0] } }, echo(host, { ...host, armL: [-0.9, 0, 0.2] })] };

  // The Judgement: both hands high, the blade laid back behind his head; brought straight down. He steps off it with his
  // hand on his breast and bows his head, and it falls again.
  const high = { crouch: 0.08, lean: -0.15, legL: [-0.45, 0, 0], legR: [0.3, 0, 0], chest: [-0.25, 0, 0], head: [0.05, 0, 0],
    armR: [-2.9, 0, 0.15], elbowR: [-0.9, 0, 0], pitch: -3.3, armL: [-2.7, 0, -0.25], elbowL: [-1.0, 0, 0] };
  const down = { crouch: 0.32, lean: 0.45, legL: [-0.75, 0, 0], legR: [0.5, 0, 0], chest: [0.4, 0, 0], head: [0.1, 0, 0],
    armR: [-1.0, 0, 0.05], elbowR: [0, 0, 0], pitch: 0.5, armL: [-1.0, 0, -0.1], elbowL: [-0.2, 0, 0] };
  const nod = { crouch: 0.08, lean: 0.2, legL: [-0.1, 0, 0], legR: [0.3, 0, 0], chest: [0.25, 0, 0], neck: [0.2, 0, 0], head: [0.15, 0, 0],
    armR: [-0.2, 0, -0.2], elbowR: [-0.1, 0, 0], pitch: 1.3, armL: [-0.8, 0, -0.6], elbowL: [-1.7, 0, 0] };
  ATTACK_POSES.hollisJudgement = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.1 },
    hits: [{ windup: high, strike: down, follow: { ...down, crouch: 0.35, lean: 0.5 } }, echo({ ...nod, head: [0.05, 0, 0] }, { ...nod, head: [0.4, 0, 0] })] };

  // The Turning Cloak: you are behind him; a look over his left shoulder, and the mantle and the blade come round.
  const turn = { crouch: 0.25, lean: 0.1, legL: [-0.3, 0, 0], legR: [0.4, 0, 0], spin: [0, -1.5, 0], chest: [0.05, -0.5, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armR: [-1.4, 0, -1.1], elbowR: [0, 0, 0], pitch: 0.2, armL: [-0.5, 0, 0.8], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.hollisTurnCloak = { ease: swing, lag: { weapon: 0.1 }, hits: [{
    windup: { crouch: 0.2, spin: [0, 0.9, 0], chest: [0, 0.3, 0], neck: [0, -0.5, 0], head: [0, -0.9, 0],
              armR: [-1.0, 0, 0.6], elbowR: [-1.2, 0, 0], pitch: 0.1, armL: [-0.4, 0, 0.3], elbowL: [-0.6, 0, 0] },
    strike: turn, follow: { ...turn, spin: [0, -1.75, 0] } }] };

  // Largesse: the sword stood on its point, his left hand drawn to his breast, then flung open to you, palm up: a shower
  // of gold leaf hangs round where you stand. His fingers curl; it closes.
  const breast = { ...pommel, chest: [0.05, 0, 0], head: [0.05, 0, 0], armL: [-0.6, 0, -0.5], elbowL: [-2.0, 0, 0] };
  const flung = { ...pommel, spin: [0, 0.25, 0], chest: [-0.05, 0.15, 0], armL: [-1.5, 0, 0.25], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.hollisLargesse = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'linear', recovery: 'inOutCubic' },
    hits: [{ windup: breast, strike: flung, follow: flung },
      echo({ ...flung, head: [-0.1, 0, 0], armL: [-1.45, 0, 0.2], elbowL: [-0.25, 0, 0] }, { ...flung, armL: [-0.9, 0, 0.1], elbowL: [-1.5, 0, 0] })] };

  // ---- hungry (second phase) ----
  // The Gilt Cracks (the phase opener): he clutches his mask, doubled over, the sword dragging; then throws his head back
  // and his arms wide, and the hunger bursts out of him along the floor.
  const clutch = { crouch: 0.25, lean: 0.45, legL: [-0.3, 0, 0], legR: [0.4, 0, 0], chest: [0.5, 0, 0], neck: [0.3, 0, 0], head: [0.3, 0.2, 0],
    armL: [-2.0, 0, -0.7], elbowL: [-2.3, 0, 0], armR: [0.1, 0, -0.3], elbowR: [-0.2, 0, 0], pitch: 1.4 };
  const burst = { crouch: 0.05, lean: -0.3, legL: [-0.2, 0, 0.1], legR: [0.2, 0, -0.1], chest: [-0.4, 0, 0], neck: [-0.3, 0, 0], head: [-0.5, 0, 0],
    armL: [-0.3, 0, 1.3], elbowL: [-0.1, 0, 0], armR: [-0.3, 0, -1.3], elbowR: [-0.1, 0, 0], pitch: 0.3 };
  ATTACK_POSES.hollisGiltCracks = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [{ windup: clutch, strike: burst, follow: burst }] };

  // Ravenous: hunched low, looking up at you, the point scraping the floor; four quick cuts, left and right, stepping in.
  // He reaches for the second where it hangs, and closes his fist on it.
  const hunch = { crouch: 0.35, lean: 0.5, legL: [-0.5, 0, 0], legR: [0.45, 0, 0], chest: [0.45, 0, 0], neck: [-0.2, 0, 0], head: [-0.35, 0, 0] };
  const fromR = { ...hunch, spin: [0, -0.8, 0], armR: [-0.9, 0, -0.9], elbowR: [-0.2, 0, 0], pitch: 0.3, armL: [-0.7, 0, 0.5], elbowL: [-0.8, 0, 0] };
  const toL = { ...hunch, spin: [0, 0.8, 0], armR: [-1.1, 0, 0.8], elbowR: [0, 0, 0], pitch: 0.3, armL: [-0.4, 0, 0.7], elbowL: [-0.4, 0, 0] };
  const toR = { ...fromR, armR: [-1.1, 0, -0.9], elbowR: [0, 0, 0] };
  const grasp = { ...hunch, crouch: 0.25, lean: 0.3, armR: [-0.4, 0, -0.3], elbowR: [-0.2, 0, 0], pitch: 1.0, armL: [-1.3, 0, 0.35], elbowL: [-0.2, 0, 0] };
  ATTACK_POSES.hollisRavenous = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.08, armR: 0.05 },
    hits: [{ windup: fromR, strike: toL, follow: toL }, { windup: toL, strike: toR, follow: toR }, { windup: toR, strike: toL, follow: toL },
      { windup: { ...toL, crouch: 0.4 }, strike: toR, follow: { ...toR, spin: [0, -1.0, 0] } }, echo(grasp, { ...grasp, armL: [-0.8, 0, 0], elbowL: [-1.4, 0, 0] })] };

  // The Feast: the sword raised point-down in both hands, he leaps, and drives it into the floor where you were. Knelt
  // over it, he looks up at you; the gilt it threw up hangs round him, and cuts.
  const plunge = { crouch: 0.45, lean: 0.2, legL: [-0.6, 0, 0], legR: [0.5, 0, 0], chest: [-0.1, 0, 0], head: [-0.1, 0, 0],
    armR: [-2.8, 0, 0.2], elbowR: [-1.2, 0, 0], pitch: 1.5, armL: [-2.7, 0, -0.2], elbowL: [-1.3, 0, 0] };
  const driven = { crouch: 0.5, lean: 0.5, legL: [-1.1, 0, 0], kneeL: [1.3, 0, 0], legR: [0.4, 0, 0], kneeR: [1.4, 0, 0], chest: [0.35, 0, 0], head: [0.2, 0, 0],
    armR: [-0.9, 0, 0.1], elbowR: [-0.3, 0, 0], pitch: 1.5, armL: [-0.9, 0, -0.1], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.hollisFeast = { ease: { windup: 'inOutCubic', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, lag: { weapon: 0.06 },
    hits: [{ windup: plunge, strike: driven, follow: driven }, echo({ ...driven, neck: [-0.2, 0, 0], head: [-0.4, 0, 0] }, { ...driven, crouch: 0.3, lean: 0.2, head: [-0.3, 0, 0] })] };

  // Every blade angle above is a `pitch`, the way the sword points; here it becomes the weapon bone's angle.
  for (const [id, P] of Object.entries(ATTACK_POSES)) if (id.startsWith('hollis')) for (const h of P.hits) for (const k of ['windup', 'strike', 'follow']) {
    const q = h[k]; if (!q || !('pitch' in q)) continue;
    const { pitch, ...rest } = q, x = b => (rest[b] ? rest[b][0] : 0);
    h[k] = { ...rest, weapon: [pitch + 0.08 - x('armR') - x('elbowR') - x('chest') - (rest.lean || 0), 0, 0] };
  }
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  // An echo of hit `of`: the same line again, from where he stood and faced as it struck (js/enemy.js makeHitbox).
  const echo = (of, line, extra = {}, tilt) => ({ echo: { of, line, ...(tilt ? { tilt } : {}), ...(extra.home ? { home: true } : {}) } });
  const RING = (from, to, width, time) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time } });
  const RISE = { w: 3.4, h: 2.6, d: 3.0, fwd: 1.8, y: 1.4 };       // the rising cut, and its X partner
  const THRUST = { w: 1.2, h: 1.4, d: 4.6, fwd: 2.8, y: 1.3 };
  const WAIST = { w: 5.0, h: 1.2, d: 3.4, fwd: 1.7, y: 1.1 };
  const TABLE = { w: 7.0, h: 0.9, d: 3.8, fwd: 1.8, y: 0.45 };     // at the knees: jump it, or roll
  const CHOP = { w: 1.6, h: 3.2, d: 4.2, fwd: 2.3, y: 1.2 };
  const SHOWER = { w: 4.6, h: 2.6, d: 6.0, fwd: 9.0, y: 1.3 };     // where you stand when he is far off
  const HOLLIS = {
    id: 'hollis', model: 'regentHollis', name: 'The Regent Hollis',
    description: 'The steward the hunger left to keep Aurel fed: gilded, gracious, cruel. His cuts hang in the air in gold leaf and cut again a beat later where they hang; he bows while it falls. Parry the man, never the gilt: step out of its line. Past the worst of his hurt the gilt cracks, his cuts hang as embers, and he calls them home to him through you.',
    scale: 1.9, bulk: 1.0, radius: 0.7, color: 0x8a7448, weapon: 'sword', idle: 'sway',
    visual: { skin: 0xd8c08a, roughness: 0.55, rim: 0.9 },
    // hp and posture: pass 45 (v7.65.0), a skilled player alone beats him in about a minute (tools/bot-fights.cjs BOTS=1 CLEAN=1).
    hp: 2600, poise: 220, speed: 3.0, turnRate: 3.6, trackRate: 2.0, approach: 0.6, kite: 0.15,
    cooldown: [1.44, 2.88], flinchTime: 0, staggerTime: 1.4, parriedTime: 1.8, deathFade: 6,
    posture: { max: 91, parry: 60, chainGap: 1.8, chainMul: 1.35, decay: 4.5, breakTime: 3.2, hitstop: 0.2 },
    echoColor: 0xf0b030,
    defaultPhases: ['gracious', 'hungry'],
    phases: {
      gracious: { hp: 2600,
        attacks: ['courtesy', 'salute', 'measure', 'longTable', 'judgement', 'turnCloak', 'largesse', 'salutePunish'] },
      // Past the worst of his hurt the gilt cracks: his cuts hang as embers, and the hunger calls them home.
      hungry: { at: 0.55, name: 'The Regent Hollis, the Gilt Cracked', opener: 'giltCracks', ignite: true, echoColor: 0xff7a30,
        cooldown: [1.12, 2.24], approach: 0.8, kite: 0.05, speed: 3.3, trackRate: 2.3,
        attacks: ['courtesy2', 'salute', 'measure', 'longTable', 'judgement', 'turnCloak', 'largesse', 'salutePunish',
                  'giltCracks', 'callHome', 'ravenous', 'feast'] },
    },
    attacks: [
      // ---- gracious -----------------------------------------------------------------------------------------------------
      // The Courtesy: a bow, a rising cut; it hangs, and he offers it his hand. Roll the cut, then step out of its line.
      { id: 'courtesy', name: 'The Courtesy', anim: 'sweep', pose: 'hollisCourtesy', tracking: { rate: 2.4, commit: 0.65 }, markers: glint(0),
        hits: [{ startup: 1.2, active: 0.16, follow: 0.6, hold: { at: 0.55, time: [0.25, 0.8], chance: 0.45 } },
               { startup: 0.6, active: 0.14, follow: 0.25, damage: 24, ...echo(0, 'sweep', {}, -0.45) }], recovery: 1.76,
        followUps: [{ attack: 'turnCloak', if: 'behind', chance: 0.37 }],
        damage: 34, poise: 55, knock: 7, lunge: 1.4, range: 3.8, box: RISE },
      // The Salute: the blade upright before his face, held; the long thrust. A nod of the blade and it runs through again.
      { id: 'salute', name: 'The Salute', anim: 'thrust', pose: 'hollisSalute', tracking: { rate: 3.0, commit: 0.75 }, markers: glint(0),
        hits: [{ startup: 1.05, active: 0.14, follow: 0.6, hold: { at: 0.6, time: [0.3, 0.9], chance: 0.5 } },
               { startup: 0.55, active: 0.14, follow: 0.2, damage: 24, ...echo(0, 'thrust') }], recovery: 1.6,
        damage: 36, poise: 55, knock: 8, lunge: 3.2, range: 5.2, box: THRUST },
      // Taking Your Measure: across at the waist, a step and back again; the sword stood on its point, and the first comes
      // again.
      { id: 'measure', name: 'Taking Your Measure', anim: 'sweep', pose: 'hollisMeasure', tracking: { rate: 2.6, commit: 0.6 }, markers: glint(0, 1),
        hits: [{ startup: 0.95, active: 0.16, follow: 0.42 },
               { startup: 0.45, active: 0.16, follow: 0.55, step: { from: 0.2, speed: 3, side: 0 } },
               { startup: 0.45, active: 0.14, follow: 0.2, damage: 20, ...echo(0, 'sweep') }], recovery: 1.6,
        followUps: [{ attack: 'turnCloak', if: 'behind', chance: 0.37 }],
        damage: 28, poise: 45, knock: 6, lunge: 1.2, range: 3.8, box: WAIST },
      // The Long Table: a sweep at the knees, wide as a banquet; he lays his hand along it and it is swept again. Jump each.
      { id: 'longTable', name: 'The Long Table', anim: 'sweep', pose: 'hollisLongTable', noParry: true, tracking: { rate: 2.2, commit: 0.6 }, chance: 0.6,
        hits: [{ startup: 1.15, active: 0.16, follow: 0.6 },
               { startup: 0.7, active: 0.16, follow: 0.25, damage: 22, ...echo(0, 'sweep') }], recovery: 1.92,
        damage: 30, poise: 45, knock: 6, lunge: 1.0, range: 4.2, box: TABLE },
      // The Judgement: both hands high, straight down. He steps off it, bows his head, and it falls again.
      { id: 'judgement', name: 'The Judgement', anim: 'chop', pose: 'hollisJudgement', tracking: { rate: 2.0, commit: 0.6 }, markers: glint(0),
        hits: [{ startup: 1.4, active: 0.14, follow: 0.65, hold: { at: 0.6, time: [0.3, 1.0], chance: 0.5 }, impact: { ring: 2.0, crack: 1.0, dust: 10, shake: 0.08 } },
               { startup: 0.5, active: 0.14, follow: 0.25, damage: 30, ...echo(0, 'chop'), impact: { ring: 2.0, crack: 0, dust: 8, shake: 0.06 } }], recovery: 2.08,
        followUps: [{ attack: 'courtesy', if: 'near', chance: 0.19 }],
        damage: 42, poise: 70, knock: 8, lunge: 1.0, range: 4.2, box: CHOP },
      // The Turning Cloak: behind him, a look over his shoulder; the mantle and the blade come round.
      { id: 'turnCloak', name: 'The Turning Cloak', anim: 'sweep', pose: 'hollisTurnCloak', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 4,
        hits: [{ startup: 0.65, active: 0.16, follow: 0.3 }], recovery: 1.44,
        damage: 26, poise: 40, knock: 8, lunge: 0, range: 3.4, box: { w: 4.6, h: 1.8, d: 4.6, fwd: -0.6, y: 1.1 } },
      // Largesse: to you standing off, his left hand flung open: gold leaf hangs round where you stand, and closes. Leave
      // it before his fingers curl (blockable).
      { id: 'largesse', name: 'Largesse', anim: 'overhead', pose: 'hollisLargesse', noParry: true, tracking: { rate: 2.4, commit: 0.95 }, minRange: 6, chance: 0.5,
        hits: [{ startup: 1.0, active: 0.1, follow: 0.5, damage: 6, box: { w: 1.2, h: 1.6, d: 1.2, fwd: 1.0, y: 1.2 } },
               { startup: 0.95, active: 0.2, follow: 0.3, box: SHOWER, ...echo(0, 'field') }], recovery: 1.76,
        damage: 26, poise: 30, knock: 5, lunge: 0, range: 12, box: SHOWER },
      // Drinking where he can see it: the salute's thrust, sooner and longer.
      { id: 'salutePunish', name: 'The Salute', anim: 'thrust', pose: 'hollisSalute', when: 'healing', tracking: { rate: 3.4, commit: 0.8 }, chance: 3, markers: glint(0),
        hits: [{ startup: 0.6, active: 0.16, follow: 0.35 }], recovery: 1.6,
        damage: 32, poise: 55, knock: 8, lunge: 4.6, range: 6.5, box: THRUST },
      // ---- hungry ---------------------------------------------------------------------------------------------------------
      // The Courtesy, answered: the rising cut and one down across it; both hang, an X, and cut again in turn.
      { id: 'courtesy2', name: 'The Courtesy', anim: 'sweep', pose: 'hollisCourtesy2', tracking: { rate: 2.6, commit: 0.65 }, markers: glint(0, 1),
        hits: [{ startup: 1.05, active: 0.16, follow: 0.45, hold: { at: 0.55, time: [0.2, 0.7], chance: 0.4 } },
               { startup: 0.5, active: 0.16, follow: 0.55 },
               { startup: 0.5, active: 0.14, follow: 0.4, damage: 24, ...echo(0, 'sweep', {}, -0.45) },
               { startup: 0.3, active: 0.14, follow: 0.25, damage: 24, ...echo(1, 'sweep', {}, 0.45), box: RISE }], recovery: 1.92,
        damage: 34, poise: 55, knock: 7, lunge: 1.4, range: 3.8, box: RISE },
      // The Gilt Cracks (the phase opener): his mask clutched, then his arms flung wide: the hunger bursts along the floor.
      // He cannot be hurt through it (as every boss's change).
      { id: 'giltCracks', name: 'The Gilt Cracks', anim: 'stomp', pose: 'hollisGiltCracks', noParry: true, rollOnly: true, invulnerable: true, tracking: { rate: 1.6, commit: 0.5 }, chance: 0.1,
        hits: [{ startup: 1.5, active: 0.5, follow: 0.4, box: RING(0.6, 7.5, 1.4, 0.5), impact: { ring: 4.0, crack: 1.6, dust: 18, shake: 0.16 } }], recovery: 2.24,
        damage: 30, poise: 50, knock: 9, lunge: 0, range: 6, box: RING(0.6, 7.5, 1.4, 0.5) },
      // Called Home: the waist cut, a leap back from you with a cut at nothing; then his hand draws the first cut home to
      // him, through you. Get out of its line sideways, or roll it as it comes.
      { id: 'callHome', name: 'Called Home', anim: 'sweep', pose: 'hollisCallHome', tracking: { rate: 2.8, commit: 0.6 }, markers: glint(0), chance: 0.7,
        hits: [{ startup: 0.85, active: 0.16, follow: 0.4 },
               { startup: 0.6, active: 0.14, follow: 0.5, leap: { from: 0.15, max: 7, back: 5.5 }, box: { w: 3.0, h: 1.4, d: 2.0, fwd: 1.4, y: 1.1 } },
               { startup: 0.6, active: 0.4, follow: 0.2, damage: 28, ...echo(0, 'sweep', { home: true }) }], recovery: 1.76,
        damage: 30, poise: 45, knock: 7, lunge: 1.2, range: 3.8, box: WAIST },
      // Ravenous: hunched, looking up; four quick cuts stepping in, and the second again where it hangs.
      { id: 'ravenous', name: 'Ravenous', anim: 'sweep', pose: 'hollisRavenous', tracking: { rate: 3.2, commit: 0.7 }, markers: glint(0, 1, 2, 3), chance: 0.8,
        hits: [{ startup: 0.75, active: 0.12, follow: 0.36 },
               { startup: 0.35, active: 0.12, follow: 0.36, step: { from: 0.1, speed: 3.5, side: 0 } },
               { startup: 0.35, active: 0.12, follow: 0.36, step: { from: 0.1, speed: 3.5, side: 0 } },
               { startup: 0.45, active: 0.12, follow: 0.5, step: { from: 0.1, speed: 3.5, side: 0 } },
               { startup: 0.4, active: 0.14, follow: 0.2, damage: 20, ...echo(1, 'sweep') }], recovery: 2.08,
        damage: 22, poise: 35, knock: 5, lunge: 1.0, range: 3.6, box: { w: 4.0, h: 1.6, d: 3.0, fwd: 1.6, y: 1.0 } },
      // The Feast: the sword raised point-down, a leap, and it is driven into the floor where you were; the gilt it threw
      // up hangs round him, and cuts.
      { id: 'feast', name: 'The Feast', anim: 'chop', pose: 'hollisFeast', noParry: true, tracking: { rate: 2.4, commit: 0.5 }, minRange: 5, chance: 0.4,
        hits: [{ startup: 1.3, active: 0.16, follow: 0.7, leap: { from: 0.4, max: 12, short: 1.2 }, impact: { ring: 4.0, crack: 2.0, dust: 20, shake: 0.16 } },
               { startup: 0.7, active: 0.2, follow: 0.3, damage: 30, box: { w: 4.0, h: 3.0, d: 4.0, fwd: 1.0, y: 1.5 }, ...echo(0, 'field') }], recovery: 2.56,
        damage: 46, poise: 85, knock: 10, lunge: 0, range: 12, box: { w: 3.0, h: 2.6, d: 3.0, fwd: 1.0, y: 1.0 } },
    ],
  };
  ENEMY_DEFS.push(HOLLIS); ENEMY_BY_ID[HOLLIS.id] = HOLLIS;
}
