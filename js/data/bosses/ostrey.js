'use strict';
// ============================================================================
// Old Ostrey, the Porter (v7.38.0; his own since v7.58.0), the boss of Level 7, js/levels/windward-moor.js (STORY.md 10c)
// ============================================================================
// The porter who let the Seven through. They paid his toll with a coal of the Ember, and it has burned in his lantern
// since; he keeps the gate the harder for having opened it once. He fights as a porter: the bar laid across the way, the
// gate dropped, three knocks at the door, the lantern held up to see who comes, coals for those who stand off. Hurt past
// bearing, he opens the lantern and what the Seven paid him with comes out (the second phase: fire).
//
// Every wind-up is his alone: the lantern goes high for the low sweep, to his chest for the drop, out ahead for the drive,
// down and back for the coals, out to the side for the knocks. Bar angles below: the bar's pitch is about
// armR.x + elbowR.x + weapon.x - 0.25 (0 level ahead, -1.57 straight up, positive dips the tip).

// ---- his figure: built in Blender (tools/blender/ostrey.py), one piece per bone ----------------------------------------
// A round helm with a barred face like a portcullis and a comb; a hood and a short mantle torn at the hem; a cuirass with
// the porter's great key on a chain, a key ring at the hip; the wardens' apron with the gate badge; riveted arms and
// knees; the iron gate-bar, banded and studded, a hooked staple at its end; and a caged lantern that hangs plumb from his
// left fist on its own bone (anim.hang), its fire (`burn`) shown only once he burns.
MODEL_DEFS.oldOstrey = {
  extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.45,
  proportions: { shoulderX: 0.38, torsoW: 0.27, torsoD: 0.2, armR: 0.08, legR: 0.1, headR: 0.14, handR: 0.07, footLen: 0.34 },
  posture: { chest: [0.14, 0, 0], neck: [0.06, 0, 0], head: [0.02, 0, 0], elbowL: [-0.45, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    plate: { tex: 'gaolerPlate', tint: 0x9aa0a4, decay: 0.6, size: 512 },
    iron: { tex: 'rustedIron', tint: 0x6a5a4e, decay: 0.8 },
    dark: { tex: 'ashSoot', tint: 0x0a0a0c, decay: 0.4 },
    mail: { tex: 'knightMail', tint: 0x6e7176, decay: 0.7 },
    leather: { tex: 'crackedLeather', tint: 0x4a4038, decay: 0.75 },
    mantle: { tex: 'rottenCloth', tint: 0x4a564e, decay: 0.7, size: 512, double: true, rim: 0.15 },
    mantleHem: { tex: 'tatteredFabric', tint: 0x3e463f, decay: 0.75, size: 512, double: true, rim: 0.15 },
    tabard: { tex: 'oathLinen', tint: 0x46566e, decay: 0.6, double: true, rim: 0.15 },
    stripe: { tex: 'wornGilt', tint: 0xa88a50, decay: 0.6 },
    bar: { tex: 'rustedIron', tint: 0x5a524c, decay: 0.75 },
    glass: { glow: 0xffb050 },              // the horn panes, lit from inside
    burn: { glow: 0xff7a28, burn: true },   // the lantern opened: drawn only while he burns
    eye: { glow: 0xffb050 },
  },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0, -0.02, -0.2] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.27] }, capeB: { parent: 'capeA', at: [0, -0.44, -0.02] }, capeC: { parent: 'capeB', at: [0, -0.44, -0.01] },
    lantern: { parent: 'elbowL', at: [0, -0.33, 0] },   // the lantern's ring, under the fist: it hangs plumb from there
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    head: ['plate', 'dark', 'iron', 'iron.1', 'mantle'], neck: ['mail'],
    chest: ['plate', 'iron', 'mantle', 'iron.1', 'iron.2'], spin: ['leather', 'iron', 'mail', 'plate', 'iron.1'],
    loinF: ['tabard', 'stripe'], loinB: ['tabard'], capeA: ['mantle'], capeB: ['mantle'], capeC: ['mantleHem'],
    armL: ['mail', 'plate', 'iron'], armR: ['mail', 'plate', 'iron'], elbowL: ['plate', 'iron', 'leather'], elbowR: ['plate', 'iron', 'leather'],
    lantern: ['iron', 'glass', 'burn'], weapon: ['bar', 'iron', 'leather'],
    legL: ['mail', 'plate'], legR: ['mail', 'plate'], kneeL: ['plate', 'iron', 'iron.1'], kneeR: ['plate', 'iron', 'iron.1'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `ostrey:${bone}__${s}`, bone, slot: s.split('.')[0], tile: 0.42,
    ...(bone === 'weapon' ? { weapon: true } : {}) }))),
  weapon: null,             // the bar is part of the figure (the `weapon: true` pieces above)
  breathFrom: 'lantern',    // his fire comes out of the lantern
  halos: [{ bone: 'lantern', at: [0, -0.3, 0], color: 0xffb050, size: 0.9, opacity: 0.55 }],
  eyes: { color: 0xffb050, size: 0.012, spread: 0.05, at: [0, 0.12, 0.13] },   // behind the grille
  anim: {
    idle: { breathRate: 0.8, breath: 0.016, headDrift: 0.03, sway: 0.012, twitch: 0 }, walk: { twist: 0.07, roll: 0.04, headNod: 0.03, elbow: 0.2, drag: 0.1 },
    flinch: { head: 0.35, chest: 0.35, arms: 0.3 }, death: { buckle: 1, slump: 0.7 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 66, damp: 5.6, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 56, damp: 5, flutter: 0.04 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.08, k: 34, damp: 3.6, flutter: 0.05 },
            { bone: 'capeC', gain: 0.09, k: 28, damp: 3.0, flutter: 0.08, sideways: 1.3 }],
    hang: [{ bone: 'lantern', k: 18, damp: 2.5, gain: 0.03 }],
  },
};

// ---- key poses (js/data/attack-poses.js format) -------------------------------------------------------------------------
{
  const heavy = { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };
  // The low sweep: crouched, the bar trailing at his right, the lantern lifted high to light the way it will go.
  const lowSweep = {
    windup: { crouch: 0.3, lean: 0.12, legL: [-0.3, 0, 0], legR: [0.35, 0, 0], spin: [0, -1.25, 0], chest: [0.1, -0.4, 0], neck: [0, 0.35, 0], head: [0.1, 0.5, 0],
              armR: [0.2, 0, -0.45], elbowR: [0, 0, 0], weapon: [0.2, 0, 0], armL: [-2.7, 0, 0.35], elbowL: [-0.25, 0, 0] },
    strike: { crouch: 0.34, lean: 0.3, legL: [-0.6, 0, 0], legR: [0.45, 0, 0], spin: [0, 1.15, 0], chest: [0.25, 0.35, 0], neck: [0, -0.2, 0], head: [0.05, -0.3, 0],
              armR: [-0.35, 0, 0.5], elbowR: [0, 0, 0], weapon: [0.8, 0, 0], armL: [-2.2, 0, 0.3], elbowL: [-0.3, 0, 0] },
    follow: { crouch: 0.32, lean: 0.3, legL: [-0.62, 0, 0], legR: [0.46, 0, 0], spin: [0, 1.45, 0], chest: [0.28, 0.42, 0], neck: [0, -0.25, 0], head: [0.05, -0.4, 0],
              armR: [-0.3, 0, 0.75], elbowR: [0, 0, 0], weapon: [0.85, 0, 0], armL: [-1.6, 0, 0.3], elbowL: [-0.35, 0, 0] },
  };
  ATTACK_POSES.ostreyBarTheWay = { ease: { windup: 'inOutCubic', active: 'linear', follow: 'outCubic', recovery: 'inOutSine' },
    lag: { weapon: 0.08, armR: 0.05, elbowR: 0.06 }, hits: [lowSweep] };

  // The gate dropped: upright, the bar raised plumb overhead like a portcullis, the lantern drawn in to his chest; it falls
  // with gathering speed and stays in the ground.
  const gate = {
    windup: { crouch: 0.06, lean: -0.15, legL: [-0.3, 0, 0], legR: [0.25, 0, 0], chest: [-0.35, 0, 0], neck: [-0.1, 0, 0], head: [0.05, 0, 0],
              armR: [-2.75, 0, -0.1], elbowR: [0.2, 0, 0], weapon: [1.2, 0, 0], armL: [-0.7, 0, -0.35], elbowL: [-1.3, 0, 0] },
    strike: { crouch: 0.3, lean: 0.45, legL: [-0.65, 0, 0], legR: [0.45, 0, 0], chest: [0.45, 0, 0], neck: [0.15, 0, 0], head: [0.05, 0, 0],
              armR: [-1.0, 0, 0], elbowR: [0.1, 0, 0], weapon: [1.7, 0, 0], armL: [-0.5, 0, -0.2], elbowL: [-1.0, 0, 0] },
    follow: { crouch: 0.32, lean: 0.5, legL: [-0.68, 0, 0], legR: [0.47, 0, 0], chest: [0.5, 0, 0], neck: [0.2, 0, 0], head: [0.1, 0, 0],
              armR: [-0.9, 0, 0], elbowR: [0.1, 0, 0], weapon: [1.75, 0, 0], armL: [-0.4, 0, -0.15], elbowL: [-0.9, 0, 0] },
  };
  ATTACK_POSES.ostreyGateDrop = { ease: { windup: 'outCubic', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [gate] };

  // The drive: side-on, the lantern held out ahead to sight along, the bar drawn back level at the hip; a short jab to
  // draw you, then the long drive.
  const sight = { spin: [0, -0.5, 0], chest: [-0.05, -0.3, 0], neck: [0, 0.25, 0], head: [0, 0.3, 0], armL: [-1.35, 0, -0.25], elbowL: [0.3, 0, 0] };
  ATTACK_POSES.ostreyBarDrive = { ease: heavy, lag: { weapon: 0.1, armR: 0.06, elbowR: 0.08 }, hits: [
    { windup: { ...sight, crouch: 0.2, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], armR: [0.5, 0, -0.1], elbowR: [-1.35, 0, 0], weapon: [1.1, 0, 0] },
      strike: { ...sight, spin: [0, -0.2, 0], crouch: 0.22, lean: 0.12, legL: [-0.45, 0, 0], legR: [0.38, 0, 0], armR: [-0.6, 0, 0.05], elbowR: [-0.5, 0, 0], weapon: [1.35, 0, 0] },
      follow: { ...sight, spin: [0, -0.3, 0], crouch: 0.22, lean: 0.08, legL: [-0.42, 0, 0], legR: [0.37, 0, 0], armR: [-0.2, 0, 0], elbowR: [-1.0, 0, 0], weapon: [1.45, 0, 0] } },
    { windup: { ...sight, spin: [0, -0.65, 0], crouch: 0.28, legL: [-0.4, 0, 0], legR: [0.4, 0, 0], armR: [0.6, 0, -0.1], elbowR: [-1.45, 0, 0], weapon: [1.1, 0, 0] },
      strike: { crouch: 0.3, lean: 0.4, legL: [-0.85, 0, 0], legR: [0.55, 0, 0], spin: [0, 0.45, 0], chest: [0.35, 0.3, 0], neck: [0.1, -0.2, 0], head: [0.05, -0.25, 0],
                armR: [-1.25, 0, 0.1], elbowR: [0.05, 0, 0], weapon: [1.45, 0, 0], armL: [0.6, 0, 0.3], elbowL: [-0.3, 0, 0] },
      follow: { crouch: 0.32, lean: 0.45, legL: [-0.88, 0, 0], legR: [0.56, 0, 0], spin: [0, 0.55, 0], chest: [0.4, 0.35, 0], neck: [0.12, -0.25, 0], head: [0.05, -0.3, 0],
                armR: [-1.2, 0, 0.12], elbowR: [0.05, 0, 0], weapon: [1.42, 0, 0], armL: [0.55, 0, 0.3], elbowL: [-0.35, 0, 0] } },
  ] };

  // Behind him: a look over the right shoulder, the bar raised before him, then the butt driven back past his hip.
  ATTACK_POSES.ostreyButtBack = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [{
    windup: { crouch: 0.16, spin: [0, 0.25, 0], chest: [0.05, 0.2, 0], neck: [0, -0.5, 0], head: [0.05, -1.0, 0],
              armR: [-0.9, 0, 0], elbowR: [-1.0, 0, 0], weapon: [1.6, 0, 0], armL: [-0.3, 0, 0.3], elbowL: [-0.3, 0, 0] },
    strike: { crouch: 0.22, lean: -0.12, legL: [-0.2, 0, 0], legR: [0.55, 0, 0], spin: [0, -0.6, 0], chest: [0.1, -0.4, 0], neck: [0, -0.4, 0], head: [0.05, -0.8, 0],
              armR: [0.75, 0, -0.15], elbowR: [-0.2, 0, 0], weapon: [0.6, 0, 0], armL: [-1.0, 0, 0.2], elbowL: [-0.4, 0, 0] },
    follow: { crouch: 0.24, lean: -0.14, legL: [-0.22, 0, 0], legR: [0.58, 0, 0], spin: [0, -0.7, 0], chest: [0.12, -0.45, 0], neck: [0, -0.4, 0], head: [0.05, -0.8, 0],
              armR: [0.8, 0, -0.15], elbowR: [-0.15, 0, 0], weapon: [0.55, 0, 0], armL: [-1.05, 0, 0.2], elbowL: [-0.4, 0, 0] },
  }] };

  // At his left: the lantern wound back past his left hip, then swung up and across in a rising arc.
  ATTACK_POSES.ostreyLanternSwing = { ease: { windup: 'inOutSine', active: 'outCubic', follow: 'outQuad', recovery: 'inOutSine' },
    lag: { armL: 0.04, elbowL: 0.08 }, hits: [{
    windup: { crouch: 0.18, legL: [0.3, 0, 0], legR: [-0.25, 0, 0], spin: [0, 0.7, 0], chest: [0, 0.3, 0], neck: [0, -0.3, 0], head: [0, -0.6, 0],
              armL: [0.9, 0, 0.5], elbowL: [-0.2, 0, 0], armR: [-0.6, 0, 0.2], elbowR: [-0.8, 0, 0], weapon: [0.9, 0, 0] },
    strike: { crouch: 0.2, lean: 0.15, legL: [-0.45, 0, 0], legR: [0.3, 0, 0], spin: [0, -0.8, 0], chest: [0.1, -0.3, 0], neck: [0, 0.2, 0], head: [0, 0.4, 0],
              armL: [-2.1, 0, -0.55], elbowL: [-0.1, 0, 0], armR: [-0.3, 0, -0.1], elbowR: [-0.6, 0, 0], weapon: [1.0, 0, 0] },
    follow: { crouch: 0.2, lean: 0.12, legL: [-0.47, 0, 0], legR: [0.32, 0, 0], spin: [0, -0.95, 0], chest: [0.08, -0.35, 0], neck: [0, 0.25, 0], head: [0, 0.45, 0],
              armL: [-2.4, 0, -0.7], elbowL: [-0.15, 0, 0], armR: [-0.25, 0, -0.1], elbowR: [-0.6, 0, 0], weapon: [1.0, 0, 0] },
  }] };

  // The gate on his shoulder: head down, both arms forward and the bar across his chest, he runs you down.
  const carry = (lean, push) => ({ crouch: 0.3, lean, legL: [-0.6, 0, 0], legR: [0.5, 0, 0], spin: [0, 0.3, 0], chest: [0.35 + push * 0.2, -0.4, 0], neck: [0.15, 0.2, 0], head: [0.35, 0.2, 0],
    armR: [-1.2 - push * 0.3, 0, 0.85], elbowR: [-1.1 + push * 0.6, 0, 0], weapon: [1.4, 0, 0], armL: [-1.2 - push * 0.3, 0, -0.6], elbowL: [-1.2 + push * 0.7, 0, 0] });
  ATTACK_POSES.ostreyShoulderGate = { ease: { windup: 'inOutCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' },
    hits: [{ windup: carry(0.55, 0), strike: carry(0.68, 1), follow: carry(0.62, 0.8) }] };

  // The coals: the lantern swung low and back past his hip, then flung forward underarm, its door knocked open.
  const fling = {
    windup: { crouch: 0.25, legL: [-0.3, 0, 0], legR: [0.3, 0, 0], spin: [0, 0.45, 0], chest: [0.15, 0.3, 0], neck: [0, -0.2, 0], head: [0, -0.3, 0],
              armL: [0.75, 0, 0.25], elbowL: [-0.15, 0, 0], armR: [-0.3, 0, -0.1], elbowR: [-0.3, 0, 0], weapon: [1.0, 0, 0] },
    strike: { crouch: 0.16, lean: -0.05, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.3, 0], chest: [-0.1, -0.2, 0], neck: [0, 0.1, 0], head: [-0.05, 0.2, 0],
              armL: [-2.0, 0, -0.15], elbowL: [-0.1, 0, 0], armR: [-0.3, 0, -0.1], elbowR: [-0.3, 0, 0], weapon: [1.0, 0, 0] },
    follow: { crouch: 0.15, lean: -0.04, legL: [-0.46, 0, 0], legR: [0.36, 0, 0], spin: [0, -0.4, 0], chest: [-0.12, -0.25, 0], neck: [0, 0.12, 0], head: [-0.05, 0.25, 0],
              armL: [-2.2, 0, -0.2], elbowL: [-0.15, 0, 0], armR: [-0.3, 0, -0.1], elbowR: [-0.3, 0, 0], weapon: [1.0, 0, 0] },
  };
  ATTACK_POSES.ostreyCoals = { ease: { windup: 'inOutSine', active: 'outCubic', follow: 'outQuad', recovery: 'inOutSine' }, lag: { armL: 0.05, elbowL: 0.1 }, hits: [fling] };

  // Three knocks at the gate: the bar laid back over his shoulder, the lantern held out to the side, brought over and down;
  // the third raised higher, held, harder.
  const knock = (high) => ({
    windup: { crouch: 0.12, lean: -0.08 - high * 0.08, legL: [-0.3, 0, 0], legR: [0.3, 0, 0], spin: [0, -0.15, 0], chest: [-0.15 - high * 0.2, -0.1, 0], neck: [-0.05, 0, 0],
              armR: [-1.9 - high * 0.7, 0, -0.05], elbowR: [-1.1 + high * 0.5, 0, 0], weapon: [0.65 - high * 0.1, 0, 0], armL: [-0.4, 0, 0.9], elbowL: [-0.3, 0, 0] },
    strike: { crouch: 0.22 + high * 0.1, lean: 0.3 + high * 0.15, legL: [-0.5, 0, 0], legR: [0.38, 0, 0], spin: [0, 0.1, 0], chest: [0.3 + high * 0.15, 0.05, 0], neck: [0.1, 0, 0],
              armR: [-1.0, 0, 0], elbowR: [0, 0, 0], weapon: [1.85, 0, 0], armL: [-0.3, 0, 0.75], elbowL: [-0.3, 0, 0] },
    follow: { crouch: 0.22 + high * 0.12, lean: 0.32 + high * 0.15, legL: [-0.52, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.12, 0], chest: [0.32 + high * 0.15, 0.05, 0], neck: [0.1, 0, 0],
              armR: [-0.95, 0, 0], elbowR: [0.05, 0, 0], weapon: [1.85, 0, 0], armL: [-0.3, 0, 0.7], elbowL: [-0.3, 0, 0] },
  });
  ATTACK_POSES.ostreyThreeKnocks = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [knock(0), knock(0), knock(1)] };

  // ---- the lantern opened (second phase) ----
  // The opener: the lantern held up overhead, his face turned up to it, then dashed down into the ground; the fire spreads.
  const dashed = { crouch: 0.42, lean: 0.5, legL: [-0.7, 0, 0], legR: [0.5, 0, 0], chest: [0.5, 0, 0], neck: [0.15, 0, 0], head: [0.2, 0, 0],
    armL: [-0.9, 0, 0.05], elbowL: [-0.1, 0, 0], armR: [0.1, 0, -0.5], elbowR: [-0.2, 0, 0], weapon: [0.8, 0, 0] };
  ATTACK_POSES.ostreyLanternBursts = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [
    { windup: { crouch: 0.05, lean: -0.2, legL: [-0.25, 0, 0], legR: [0.25, 0, 0], chest: [-0.3, 0, 0], neck: [-0.2, 0, 0], head: [-0.35, 0, 0],
                armL: [-3.0, 0, 0.2], elbowL: [-0.1, 0, 0], armR: [0.1, 0, -0.5], elbowR: [-0.2, 0, 0], weapon: [0.8, 0, 0] },
      strike: dashed, follow: { ...dashed, crouch: 0.44, lean: 0.52 } },
    { windup: { ...dashed, crouch: 0.4, lean: 0.4 }, strike: { ...dashed, crouch: 0.3, lean: 0.25, chest: [0.3, 0, 0], armL: [-1.3, 0, 0.3] },
      follow: { ...dashed, crouch: 0.26, lean: 0.2, chest: [0.25, 0, 0], armL: [-1.2, 0, 0.3] } },
  ] };

  // Low, then high: the lantern carried low before him lighting the ground, the bar trailing; a sweep at the knees, then
  // the bar brought back across at head height.
  const lowLit = { ...lowSweep, windup: { ...lowSweep.windup, head: [0.25, 0.6, 0], armL: [-0.9, 0, -0.2], elbowL: [-0.6, 0, 0] },
    strike: { ...lowSweep.strike, armL: [-0.8, 0, -0.1], elbowL: [-0.5, 0, 0] }, follow: { ...lowSweep.follow, armL: [-0.8, 0, -0.1], elbowL: [-0.5, 0, 0] } };
  ATTACK_POSES.ostreyKindledSweep = { ease: { windup: 'inOutCubic', active: 'linear', follow: 'outCubic', recovery: 'inOutSine' }, lag: { weapon: 0.08, armR: 0.05, elbowR: 0.06 }, hits: [
    lowLit,
    { windup: { crouch: 0.15, lean: 0.05, legL: [-0.4, 0, 0], legR: [0.35, 0, 0], spin: [0, 1.4, 0], chest: [-0.1, 0.4, 0], neck: [0, -0.3, 0], head: [0, -0.5, 0],
                armR: [-1.7, 0, 0.9], elbowR: [-0.3, 0, 0], weapon: [1.0, 0, 0], armL: [-0.6, 0, 0.2], elbowL: [-0.5, 0, 0] },
      strike: { crouch: 0.12, lean: 0.1, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], spin: [0, -0.9, 0], chest: [0, -0.35, 0], neck: [0, 0.25, 0], head: [0, 0.45, 0],
                armR: [-1.6, 0, -0.6], elbowR: [0, 0, 0], weapon: [0.95, 0, 0], armL: [-0.6, 0, 0.4], elbowL: [-0.5, 0, 0] },
      follow: { crouch: 0.12, lean: 0.1, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], spin: [0, -1.15, 0], chest: [0, -0.4, 0], neck: [0, 0.3, 0], head: [0, 0.55, 0],
                armR: [-1.4, 0, -0.8], elbowR: [0, 0, 0], weapon: [1.0, 0, 0], armL: [-0.55, 0, 0.45], elbowL: [-0.5, 0, 0] } },
  ] };

  // The breath: the lantern drawn in to his chest, his head bowed over it; then held out, its fire breathed across his front.
  const breath = side => ({ crouch: 0.2, lean: 0.15, legL: [-0.45, 0, 0], legR: [0.4, 0, 0], spin: [0, side, 0], chest: [0.1, side * 0.5, 0], neck: [0, 0, 0], head: [-0.05, 0, 0],
    armL: [-1.45, 0, -0.15], elbowL: [-0.25, 0, 0], armR: [-0.2, 0, -0.25], elbowR: [-0.3, 0, 0], weapon: [1.0, 0, 0] });
  const sweepAcross = [-0.35, -0.2, -0.05, 0.1, 0.25, 0.35];
  ATTACK_POSES.ostreyLanternBreath = { ease: { windup: 'inOutSine', active: 'linear', follow: 'linear', recovery: 'inOutCubic' }, hits: [
    { windup: { crouch: 0.22, lean: 0.2, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.4, 0], chest: [0.25, -0.2, 0], neck: [0.3, 0, 0], head: [0.55, 0, 0],
                armL: [-1.0, 0, -0.45], elbowL: [-1.5, 0, 0], armR: [-0.2, 0, -0.25], elbowR: [-0.3, 0, 0], weapon: [1.0, 0, 0] },
      strike: breath(-0.45), follow: breath(-0.42) },
    ...sweepAcross.map(s => ({ windup: breath(s - 0.05), strike: breath(s), follow: breath(s + 0.03) })),
  ] };

  // The burning drop: down in a deep crouch, the bar raised plumb and the lantern swung back; he leaps and drops the gate,
  // and the fire runs out from where it lands.
  ATTACK_POSES.ostreyBurningDrop = { ease: { windup: 'inOutCubic', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [
    { windup: { ...gate.windup, crouch: 0.4, lean: 0.1, legL: [-0.55, 0, 0], legR: [0.45, 0, 0], armL: [0.8, 0, 0.3], elbowL: [-0.2, 0, 0] },
      strike: gate.strike, follow: gate.follow },
    { windup: { ...gate.follow, crouch: 0.36 }, strike: { ...gate.follow, crouch: 0.22, lean: 0.3, chest: [0.3, 0, 0] }, follow: { ...gate.follow, crouch: 0.2, lean: 0.25, chest: [0.25, 0, 0] } },
  ] };

  // Ember rain: the lantern whirled up over his head, then swung round and down, scattering coals in a wide fan; twice.
  const whirl = { crouch: 0.12, lean: -0.1, legL: [-0.3, 0, 0], legR: [0.3, 0, 0], spin: [0, 0.9, 0], chest: [-0.2, 0.35, 0], neck: [-0.1, -0.3, 0], head: [-0.15, -0.5, 0],
    armL: [-2.9, 0, 0.6], elbowL: [-0.2, 0, 0], armR: [-0.2, 0, -0.3], elbowR: [-0.3, 0, 0], weapon: [1.0, 0, 0] };
  const scatter = { crouch: 0.2, lean: 0.15, legL: [-0.5, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.7, 0], chest: [0.1, -0.35, 0], neck: [0, 0.2, 0], head: [0, 0.35, 0],
    armL: [-2.2, 0, -0.5], elbowL: [-0.1, 0, 0], armR: [-0.2, 0, -0.3], elbowR: [-0.3, 0, 0], weapon: [1.0, 0, 0] };
  ATTACK_POSES.ostreyEmberRain = { ease: { windup: 'inOutSine', active: 'outCubic', follow: 'outQuad', recovery: 'inOutSine' }, lag: { armL: 0.04, elbowL: 0.08 },
    hits: [{ windup: whirl, strike: scatter, follow: { ...scatter, spin: [0, -0.85, 0] } }, { windup: whirl, strike: scatter, follow: { ...scatter, spin: [0, -0.85, 0] } }] };
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const COAL = { speed: 15, gravity: 9, size: 0.2, look: 'coal' };
  const OSTREY = {
    id: 'ostrey', model: 'oldOstrey', name: 'Old Ostrey, the Porter',
    description: 'A giant porter in the armour of Thrale\'s gate-wardens, still keeping the border for a king long dead. An iron gate-bar laid across the way, and a lantern that is never let go out.',
    scale: 2.1, bulk: 1.2, radius: 0.82, color: 0x5a564c, weapon: 'spear', idle: 'sway',
    visual: { skin: 0x8a8274, roughness: 0.8, rim: 0.9 },
    hp: 3000, poise: 240, speed: 2.5, turnRate: 3.0, trackRate: 1.6, approach: 0.5, kite: 0.15,
    cooldown: [1.1, 2.1], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 6,
    posture: { max: 91, parry: 65, chainGap: 1.8, chainMul: 1.35, decay: 4.5, breakTime: 3.2, hitstop: 0.2 },
    defaultPhases: ['porter', 'kindled'],
    phases: {
      // The porter: the bar and the closed lantern.
      porter: { hp: 3000,
        attacks: ['barTheWay', 'gateDrop', 'barDrive', 'threeKnocks', 'shoulderGate', 'lanternCoals', 'coalPunish', 'buttBack', 'lanternSwing'] },
      // Hurt past bearing (at 55 %), he opens the lantern: it burns, and so does he. Sooner, closer, and fire.
      kindled: { at: 0.55, name: 'Old Ostrey, the Lantern Opened', opener: 'lanternBursts', ignite: true, cooldown: [0.75, 1.5], approach: 0.75, kite: 0.05, speed: 2.8, trackRate: 2.0,
        attacks: ['barTheWay', 'gateDrop', 'barDrive', 'threeKnocks', 'shoulderGate', 'lanternCoals', 'coalPunish', 'buttBack', 'lanternSwing',
                  'lanternBursts', 'kindledSweep', 'lanternBreath', 'burningDrop', 'emberRain'] },
    },
    attacks: [
      // ---- the porter --------------------------------------------------------------------------------------------------
      // Bar the Way: a sweep at the knees, wide and late. Roll through it, not away.
      { id: 'barTheWay', name: 'Bar the Way', anim: 'sweep', pose: 'ostreyBarTheWay', tracking: { rate: 2.6, commit: 0.65 }, markers: glint(0),
        hits: [{ startup: 1.05, active: 0.16, follow: 0.3 }], recovery: 1.0,
        followUps: [{ attack: 'threeKnocks', if: 'near', chance: 0.3 }],
        damage: 26, poise: 45, knock: 6, lunge: 1.4, range: 3.6, box: { w: 7.0, h: 0.9, d: 3.6, fwd: 1.6, y: 0.45 } },
      // The Gate Drop: raised plumb, held (the delay is the point), dropped like a portcullis. Back off while it is up and
      // he lowers his head and runs at you instead.
      { id: 'gateDrop', name: 'The Gate Drop', anim: 'chop', pose: 'ostreyGateDrop', tracking: { rate: 2.0, commit: 0.55 }, markers: glint(0),
        hits: [{ startup: 1.5, active: 0.14, follow: 0.5, hold: { at: 0.55, time: [0.4, 1.1], chance: 0.7 }, abort: { at: 0.6, beyond: 6, into: 'shoulderGate' } }], recovery: 1.5,
        damage: 46, poise: 80, knock: 9, lunge: 1.2, range: 3.8, box: { w: 1.8, h: 3.0, d: 4.2, fwd: 2.4, y: 1.2 },
        impact: { ring: 2.8, crack: 1.5, dust: 14, shake: 0.12 } },
      // The Drive: a short jab to draw you in, then the long drive, sometimes held.
      { id: 'barDrive', name: 'Bar Drive', anim: 'thrust', pose: 'ostreyBarDrive', tracking: { rate: 3.0, commit: 0.7 }, markers: glint(0, 1),
        hits: [{ startup: 0.75, active: 0.1, follow: 0.12, box: { w: 1.0, h: 1.4, d: 2.6, fwd: 1.8, y: 1.2 } },
               { startup: 0.5, active: 0.14, follow: 0.35, hold: { at: 0.6, time: [0.2, 0.6], chance: 0.45 } }], recovery: 1.0,
        followUps: [{ attack: 'lanternSwing', if: 'flank', chance: 0.7 }],
        damage: 28, poise: 45, knock: 6, lunge: 3.0, range: 4.2, box: { w: 1.2, h: 1.4, d: 4.2, fwd: 2.6, y: 1.2 } },
      // Three Knocks: the bar brought down at the gate three times; the third raised higher and held.
      { id: 'threeKnocks', name: 'Three Knocks', anim: 'chop', pose: 'ostreyThreeKnocks', tracking: { rate: 2.6, commit: 0.6 }, markers: glint(0, 1, 2),
        hits: [{ startup: 0.8, active: 0.12, follow: 0.12 }, { startup: 0.5, active: 0.12, follow: 0.12 },
               { startup: 0.95, active: 0.14, follow: 0.45, hold: { at: 0.5, time: [0.3, 0.8], chance: 0.6 }, impact: { ring: 2.4, crack: 1.2, dust: 10, shake: 0.08 } }],
        recovery: 1.2, damage: 26, poise: 40, knock: 6, lunge: 1.2, range: 3.6, box: { w: 1.8, h: 2.8, d: 4.0, fwd: 2.2, y: 1.0 } },
      // Shoulder the Gate: from afar, the bar across his chest, head down, a run that bowls you over.
      { id: 'shoulderGate', name: 'Shoulder the Gate', anim: 'bash', pose: 'ostreyShoulderGate', noParry: true, shove: true, tracking: { rate: 2.4, commit: 0.45 },
        minRange: 5, dash: { speed: 11, from: 0.35 }, chance: 0.35,
        hits: [{ startup: 1.0, active: 0.16, follow: 0.4 }], recovery: 1.1,
        damage: 34, poise: 60, knock: 10, lunge: 2.2, range: 12, box: { w: 3.4, h: 2.2, d: 2.4, fwd: 1.4, y: 1.1 },
        impact: { ring: 1.6, crack: 0, dust: 10, shake: 0.08 } },
      // Lantern Coals: swung low and back, then flung underarm: three coals lobbed in a fan. Blockable, not parryable.
      { id: 'lanternCoals', name: 'Lantern Coals', anim: 'overhead', pose: 'ostreyCoals', tracking: { rate: 2.8, commit: 0.85 }, minRange: 4, chance: 0.3,
        projectile: { ...COAL, spread: [-0.14, 0, 0.14] },
        hits: [{ startup: 0.9, active: 0.06, follow: 0.2 }], recovery: 0.55,
        followUps: [{ attack: 'shoulderGate', if: 'any', chance: 0.3 }],
        damage: 16, poise: 20, knock: 3, lunge: 0, range: 18, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.4 } },
      // Drinking at range: one coal, sooner.
      { id: 'coalPunish', name: 'Lantern Coal', anim: 'overhead', pose: 'ostreyCoals', when: 'healing', tracking: { rate: 3.4, commit: 0.85 }, minRange: 4, chance: 3,
        projectile: COAL,
        hits: [{ startup: 0.6, active: 0.06, follow: 0.15 }], recovery: 0.4,
        damage: 18, poise: 20, knock: 3, lunge: 0, range: 18, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.4 } },
      // Behind him: he looks over his shoulder and drives the butt of the bar back.
      { id: 'buttBack', name: 'Butt of the Bar', anim: 'thrust', pose: 'ostreyButtBack', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 4,
        hits: [{ startup: 0.65, active: 0.12, follow: 0.3 }], recovery: 0.8,
        damage: 22, poise: 40, knock: 8, lunge: 0, range: 3.2, box: { w: 3.0, h: 1.8, d: 2.8, fwd: -1.6, y: 1.0 } },
      // At his left (the lantern side): a rising swing of the lantern.
      { id: 'lanternSwing', name: 'Lantern Swing', anim: 'sweep', pose: 'ostreyLanternSwing', noParry: true, when: 'flank', tracking: { rate: 3.6, commit: 0.7 }, chance: 1.6,
        hits: [{ startup: 0.55, active: 0.12, follow: 0.18 }], recovery: 0.7,
        damage: 22, poise: 35, knock: 5, lunge: 1.6, range: 3.0, box: { w: 3.4, h: 2.0, d: 2.6, fwd: 1.3, y: 1.4 } },
      // ---- the lantern opened ------------------------------------------------------------------------------------------
      // The Lantern Opened (the phase opener): held up, dashed into the ground; the fire runs out in a ring.
      { id: 'lanternBursts', name: 'The Lantern Opened', anim: 'chop', pose: 'ostreyLanternBursts', noParry: true, tracking: { rate: 2.0, commit: 0.6 }, chance: 0.12,
        hits: [{ startup: 1.4, active: 0.16, follow: 0.4, box: { w: 3.6, h: 2.2, d: 3.6, fwd: 1.2, y: 1.0 }, impact: { ring: 3.4, crack: 1.6, dust: 18, shake: 0.16 } },
               { startup: 0.45, active: 0.18, follow: 0.4, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 8, width: 1.6, time: 0.18 } },
                 impact: { ring: 4.5, crack: 0, dust: 12, shake: 0.12 } }],
        recovery: 1.6, damage: 40, poise: 70, knock: 9, lunge: 0.8, range: 3.6, box: { w: 3.6, h: 2.2, d: 3.6, fwd: 1.2, y: 1.0 } },
      // Low, Then High: the knees, then the head. Roll the first, roll the second.
      { id: 'kindledSweep', name: 'Low, Then High', anim: 'sweep', pose: 'ostreyKindledSweep', tracking: { rate: 2.8, commit: 0.6 }, markers: glint(0, 1),
        hits: [{ startup: 0.9, active: 0.16, follow: 0.12, box: { w: 7.0, h: 0.9, d: 3.6, fwd: 1.6, y: 0.45 } },
               { startup: 0.55, active: 0.16, follow: 0.35, box: { w: 7.0, h: 1.2, d: 3.6, fwd: 1.6, y: 1.9 } }], recovery: 1.0,
        followUps: [{ attack: 'lanternSwing', if: 'flank', chance: 0.6 }],
        damage: 30, poise: 50, knock: 7, lunge: 1.6, range: 3.6, box: { w: 7.0, h: 0.9, d: 3.6, fwd: 1.6, y: 0.45 } },
      // The Ember's Breath: the lantern to his chest, head bowed over it; then its fire breathed across his front. His sides
      // and back are safe all the while.
      { id: 'lanternBreath', name: 'The Ember\'s Breath', anim: 'bash', pose: 'ostreyLanternBreath', noParry: true, tracking: { rate: 0.4, commit: 1 }, chance: 0.18,
        breath: { len: 7, width: 2.2 },
        hits: [{ startup: 1.2, active: 0.14, follow: 0.06 }, ...Array.from({ length: 6 }, () => ({ startup: 0.2, active: 0.14, follow: 0.06 }))], recovery: 1.6,
        damage: 12, poise: 15, knock: 3, lunge: 0, range: 7, box: { w: 2.6, h: 2.0, d: 6.5, fwd: 4.0, y: 1.0 } },
      // The Burning Drop: a crouch, a leap, the gate dropped from the air, and the fire running out from where it lands.
      { id: 'burningDrop', name: 'The Burning Drop', anim: 'chop', pose: 'ostreyBurningDrop', noParry: true, tracking: { rate: 2.4, commit: 0.5 }, minRange: 4, chance: 0.35,
        hits: [{ startup: 1.5, active: 0.16, follow: 0.3, leap: { from: 0.4, max: 12, short: 1.4 }, impact: { ring: 5.0, crack: 2.4, dust: 22, shake: 0.18 } },
               { startup: 0.3, active: 0.18, follow: 0.5, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 7.5, width: 1.6, time: 0.18 } },
                 impact: { ring: 4.0, crack: 0, dust: 12, shake: 0.1 } }],
        recovery: 1.8, damage: 54, poise: 90, knock: 11, lunge: 0, range: 12, box: { w: 2.4, h: 2.6, d: 4.4, fwd: 2.4, y: 1.0 } },
      // Ember Rain: the lantern whirled overhead and swung down, coals scattered in a wide fan; twice.
      { id: 'emberRain', name: 'Ember Rain', anim: 'overhead', pose: 'ostreyEmberRain', tracking: { rate: 2.4, commit: 0.8 }, minRange: 3, chance: 0.3,
        projectile: { ...COAL, speed: 13, spread: [-0.5, -0.25, 0, 0.25, 0.5] },
        hits: [{ startup: 1.1, active: 0.06, follow: 0.15 }, { startup: 0.7, active: 0.06, follow: 0.2 }], recovery: 0.9,
        damage: 16, poise: 20, knock: 3, lunge: 0, range: 18, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.4 } },
    ],
  };
  ENEMY_DEFS.push(OSTREY); ENEMY_BY_ID[OSTREY.id] = OSTREY;
}
