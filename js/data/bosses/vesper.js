'use strict';
// ============================================================================
// Gemini, Neon High (Boss Rush & Practice): watcher of the glass observatory
// ============================================================================
// The watcher who measured the sky long after the stars went out. Tall, poised and severe behind a porcelain-silver mask
// and two counter-rotating astrolabe rings. Her twin-crescent Meridian Glaive weaves sharp, deflectable anime combos
// while planting floating silver crystal prisms across the arena (`prism`, js/enemy.js notePrisms; drawn by
// js/astral-prisms.js). When she plants her glaive upright and raises her open left hand (`prismFire`), every prism
// tracks you with a laser sightline, locks rigid with a chime, and fires a piercing silver light-lance simultaneously.
// Deflect her glaive and land a Counter (or Finishing Blow) to shatter every active prism in a cascade of crystal sparks.
// Past half her strength (`eclipse`, 52% HP) the eclipse opens: her astrolabe rings and blade flare violet-silver, she
// blinks through silver mist (`mirrorStep`), and her prisms converge into crossfire followed by a plunging moon-cleave.
//
// Every wind-up has its own silhouette. Glaive low and wide to her right (the crescent draw); drawn straight back at the
// right hip like a star-needle (meridian line); laid diagonally across her shoulders (astrolabe waltz); lifted straight up
// in both hands like a sundial needle (zenith fall); crouched back with the blade sweeping wide (sow the glass); haft
// planted upright beside her right foot, left hand raised open to the sky (alignment); glance over her left shoulder
// (waning turn). Eclipsed: doubled low clutching the sternum dial before flinging her arms wide (the eclipse opens);
// glaive held vertical before her mask as silver mist coils (step through glass); left hand raised for crossfire then a
// soaring plunge (eclipse crossfire); low coil with the crescent trailing behind her heel (lunar tempest).
// Two-handed haft IK (`grip`, Rig.holdHaft): each pose specifies `haft: [pitch, yaw, roll]` in her chest's heading
// (pitch 0 level ahead, -1.57 straight up, positive dips; yaw + left; roll turns the crescent edge: 0 up, 3.14 down/fwd,
// 4.71 to her left, 1.57 to her right); `grip: false` frees her left hand for prism commands.

// ---- her figure: built in Blender (tools/blender/vesper.py), one piece per bone ----------------------------------------
const VESPER_TILE = { silver: 0.35, trim: 0.35, indigo: 0.32, silk: 0.28 };
MODEL_DEFS.paleMeridian = {
  extends: 'ironKnight', faction: 'ironbound', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.6,
  proportions: { shoulderX: 0.36, torsoW: 0.23, torsoD: 0.17, armR: 0.062, legR: 0.084, headR: 0.12, handR: 0.058, footLen: 0.33 },
  posture: { chest: [-0.04, 0, 0], neck: [0.02, 0, 0], head: [-0.05, 0, 0], elbowL: [-0.32, 0, 0], elbowR: [-0.42, 0, 0] },
  hidden: ['eclipse'],   // revealed in Phase 2 (Vesper, the Eclipsed)
  materials: {
    silver:  { tex: 'astralSilver', tint: 0xe6eef8, decay: 0.18, rim: 0.7 },
    trim:    { tex: 'astralSilver', tint: 0xf6f8ff, decay: 0.12, rim: 0.75 },
    indigo:  { tex: 'midnightCloth', tint: 0xffffff, decay: 0.2, double: true, rim: 0.45 },
    silk:    { tex: 'midnightCloth', tint: 0xd8e0ff, decay: 0.18, double: true, rim: 0.5 },
    dark:    { tex: 'crackedLeather', tint: 0x262a3a, decay: 0.45 },
    blade:   { tex: 'dentedSteel', tint: 0xf4f8ff, decay: 0.12, rim: 0.85, steel: true },   // (pass 153) the crescents banded as steel in cel
    crystal: { glow: 0x76d6ff },
    eclipse: { glow: 0xb874ff },
    eye:     { glow: 0x90dcff },
  },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0, -0.02, -0.2] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.24] }, capeB: { parent: 'capeA', at: [0, -0.44, -0.05] }, capeC: { parent: 'capeB', at: [0, -0.44, -0.04] },
    haloA: { parent: 'chest', at: [0, 0.74, -0.25] }, haloB: { parent: 'chest', at: [0, 0.74, -0.25] },
  },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    head: ['silver', 'trim', 'crystal', 'indigo', 'eclipse'],
    chest: ['silver', 'trim', 'trim.1', 'crystal', 'eclipse', 'indigo', 'silk'],
    haloA: ['silver', 'trim', 'eclipse'],
    haloB: ['trim', 'crystal', 'eclipse'],
    spin: ['indigo', 'silver', 'trim'],
    loinF: ['indigo', 'trim'], loinB: ['indigo', 'trim'],
    capeA: ['indigo'], capeB: ['indigo'], capeC: ['indigo', 'trim'],
    armL: ['indigo', 'silver'], armR: ['indigo', 'silver'],
    elbowL: ['silver', 'silver.1', 'trim'], elbowR: ['silver', 'silver.1', 'trim'],
    legL: ['dark'], legR: ['dark'],
    kneeL: ['silver', 'silver.1', 'trim'], kneeR: ['silver', 'silver.1', 'trim'],
    weapon: ['dark', 'blade', 'trim', 'crystal', 'eclipse'],
  }).flatMap(([bone, list]) => list.map(s => {
    const slot = s.split('.')[0];
    return { use: 'baked', mesh: `vesper:${bone}__${s}`, bone, slot, tile: VESPER_TILE[slot] ?? 0.42,
      ...(bone === 'weapon' ? { weapon: true } : {}) };
  })),
  weapon: null,          // the Meridian Glaive is baked on the weapon bone
  grip: { span: [-0.52, 0.62], rest: [-1.18, 0.14, 0.0] },
  weaponRest: -0.95,
  eyes: { color: 0x90dcff, size: 0.0085, spread: 0.032, at: [0, 0.105, 0.085], halo: 0.32 },
  edgeTell: { slot: 'blade', size: 0.5, along: 0.9 },   // (pass 153) her wind-ups glow on the crescent, not as a wash behind her body
  tells: { hand: { bone: 'elbowL', at: [0, -0.34, 0.06], size: 0.7 } },
  halos: [
    { bone: 'chest', at: [0, 0.36, 0.17], color: 0x76d6ff, size: 0.36, opacity: 0.34 },
    { bone: 'weapon', at: [0, -0.025, 1.23], color: 0x86dcff, size: 0.42, opacity: 0.38 },
  ],
  anim: {
    idle: { breathRate: 0.65, breath: 0.011, headDrift: 0.025, sway: 0.008, twitch: 0 },
    walk: { twist: 0.055, roll: 0.025, headNod: 0.02, elbow: 0.09, drag: 0.04 },
    flinch: { head: 0.28, chest: 0.25, arms: 0.22 },
    death: { buckle: 0.85, slump: 0.9 },
    cloth: [
      { bone: 'loinF', gain: 0.10, k: 58, damp: 5.5, flutter: 0.035, max: 0.5 },
      { bone: 'loinB', gain: 0.13, k: 50, damp: 5.0, flutter: 0.045, max: 0.55 },
      { bone: 'capeA', gain: 0.11, k: 44, damp: 5.2, flutter: 0.04, max: 0.38 },
      { bone: 'capeB', gain: 0.14, k: 38, damp: 4.8, flutter: 0.055, max: 0.44 },
      { bone: 'capeC', gain: 0.17, k: 32, damp: 4.2, flutter: 0.08, max: 0.5 },
    ],
    spin: [
      { bone: 'haloA', axis: 'z', speed: 0.28, revealMul: 2.1 },
      { bone: 'haloB', axis: 'z', speed: -0.52, revealMul: 2.3 },
    ],
  },
};

// ---- key poses (js/data/attack-poses.js format, two-handed `haft` IK) ----------------------------------------------------
{
  const swing = { windup: 'inOutCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };
  const heavy = { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' };

  // 1. The Crescent Draw: glaive laid low and wide to her right; rising crescent arc across to high-left, then a fast
  // spinning reverse cleave across the waist that leaves a crystal prism floating in its wake.
  const lowR = { crouch: 0.2, lean: 0.1, legL: [-0.38, 0, 0], legR: [0.4, 0, 0], spin: [0, -0.78, 0], chest: [0.05, -0.26, 0], neck: [0, 0.35, 0], head: [0, 0.45, 0],
    armR: [-0.95, 0, -0.95], elbowR: [-0.15, 0, 0], haft: [0.32, -0.78, 4.71], armL: [-0.85, 0, -0.25], elbowL: [-0.7, 0, 0] };
  const highL = { crouch: 0.16, lean: 0.16, legL: [-0.52, 0, 0], legR: [0.38, 0, 0], spin: [0, 0.78, 0], chest: [-0.08, 0.28, 0], neck: [0, -0.22, 0], head: [0, -0.32, 0],
    armR: [-1.72, 0, 0.68], elbowR: [-0.08, 0, 0], haft: [-0.52, 0.88, 4.71], armL: [-1.35, 0, 0.52], elbowL: [-0.28, 0, 0] };
  const revR = { crouch: 0.24, lean: 0.2, legL: [-0.48, 0, 0], legR: [0.46, 0, 0], spin: [0, -0.92, 0], chest: [0.08, -0.3, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armR: [-1.35, 0, -1.02], elbowR: [-0.05, 0, 0], haft: [0.12, -0.82, 1.57], armL: [-0.85, 0, -0.35], elbowL: [-0.65, 0, 0] };
  ATTACK_POSES.vesperCrescent = { ease: { ...swing, windup: 'inOutSine' }, lag: { weapon: 0.08, armR: 0.04 }, hits: [
    { windup: lowR, strike: highL, follow: { ...highL, spin: [0, 1.0, 0] } },
    { windup: { ...highL, crouch: 0.25 }, strike: revR, follow: { ...revR, spin: [0, -1.12, 0] } },
  ] };

  // 2. Meridian Line: glaive levelled straight back at her right hip like a star-needle, held; long piercing lunge thrust.
  const needle = { crouch: 0.12, lean: -0.08, legL: [-0.35, 0, 0], legR: [0.42, 0, 0], spin: [0, -0.45, 0], chest: [-0.08, -0.18, 0], head: [0, 0.45, 0],
    armR: [-0.85, 0, -0.2], elbowR: [-1.35, 0, 0], haft: [0.02, 0.14, 0.0], armL: [-1.15, 0, -0.35], elbowL: [-0.55, 0, 0] };
  const pierce = { crouch: 0.26, lean: 0.38, legL: [-0.95, 0, 0], kneeL: [0.55, 0, 0], legR: [0.58, 0, 0], spin: [0, -0.12, 0], chest: [0.18, 0, 0], head: [-0.12, 0.1, 0],
    armR: [-1.62, 0, 0.05], elbowR: [0, 0, 0], haft: [0.0, 0.08, 0.0], armL: [-1.52, 0, -0.15], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.vesperThrust = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { weapon: 0.06 }, hits: [
    { windup: needle, strike: pierce, follow: { ...pierce, lean: 0.42 } },
  ] };

  // 3. Astrolabe Waltz: glaive poised diagonally across her shoulders; sweeping forehand -> stepping backhand -> soaring
  // overhead crescent cleave. All 3 hits deflectable for a rhythmic duel!
  const poise = { crouch: 0.18, lean: -0.05, legL: [-0.42, 0, 0], legR: [0.35, 0, 0], spin: [0, -0.85, 0], chest: [-0.05, -0.25, 0], head: [0, 0.65, 0],
    armR: [-2.15, 0, -0.65], elbowR: [-0.7, 0, 0], haft: [-0.45, -1.15, 4.71], armL: [-1.55, 0, -0.3], elbowL: [-0.8, 0, 0] };
  const waltz1 = { crouch: 0.22, lean: 0.2, legL: [-0.55, 0, 0], legR: [0.4, 0, 0], spin: [0, 0.85, 0], chest: [0.1, 0.3, 0], head: [0, -0.45, 0],
    armR: [-1.35, 0, 0.68], elbowR: [0, 0, 0], haft: [0.15, 0.72, 4.71], armL: [-0.9, 0, 0.5], elbowL: [-0.45, 0, 0] };
  const waltz2 = { crouch: 0.24, lean: 0.18, legL: [-0.45, 0, 0], legR: [0.48, 0, 0], spin: [0, -0.9, 0], chest: [0.05, -0.3, 0], head: [0, 0.45, 0],
    armR: [-1.38, 0, -0.95], elbowR: [0, 0, 0], haft: [0.08, -0.78, 1.57], armL: [-0.85, 0, -0.3], elbowL: [-0.65, 0, 0] };
  const skyRaise = { crouch: 0.08, lean: -0.2, legL: [-0.42, 0, 0], legR: [0.32, 0, 0], chest: [-0.24, 0, 0], head: [-0.08, 0, 0],
    armR: [-2.68, 0, 0.12], elbowR: [-0.6, 0, 0], haft: [-1.62, 0.05, 3.14], armL: [-2.45, 0, -0.22], elbowL: [-0.75, 0, 0] };
  const skyFall = { crouch: 0.34, lean: 0.46, legL: [-0.78, 0, 0], kneeL: [0.5, 0, 0], legR: [0.52, 0, 0], chest: [0.38, 0, 0], head: [0.1, 0, 0],
    armR: [-1.02, 0, 0.08], elbowR: [0, 0, 0], haft: [0.46, 0.05, 3.14], armL: [-1.0, 0, -0.15], elbowL: [-0.22, 0, 0] };
  ATTACK_POSES.vesperWaltz = { ease: swing, lag: { weapon: 0.08, armR: 0.04 }, hits: [
    { windup: poise, strike: waltz1, follow: { ...waltz1, spin: [0, 1.0, 0] } },
    { windup: { ...waltz1, crouch: 0.28 }, strike: waltz2, follow: { ...waltz2, spin: [0, -1.05, 0] } },
    { windup: skyRaise, strike: skyFall, follow: { ...skyFall, crouch: 0.38, lean: 0.5 } },
  ] };

  // 4. Zenith Fall: draws the crescent glaive back at shoulder height (full crescent blade clearly in frame
  // telegraphing the cleaving plane), held; plunging heavy cleave.
  const zenithRaise = { crouch: 0.16, lean: -0.1, legL: [-0.46, 0, 0], legR: [0.38, 0, 0], spin: [0, -0.52, 0], chest: [-0.08, -0.28, 0], neck: [0, 0.28, 0], head: [-0.02, 0.42, 0],
    armR: [-1.52, 0, -0.78], elbowR: [-0.55, 0, 0], haft: [-0.24, -1.05, 3.14], armL: [-1.35, 0, -0.24], elbowL: [-0.72, 0, 0] };
  ATTACK_POSES.vesperZenith = { ease: heavy, lag: { weapon: 0.1 }, hits: [
    { windup: zenithRaise, strike: skyFall, follow: { ...skyFall, crouch: 0.38, lean: 0.52 } },
  ] };

  // 5. Sow the Glass: crouch & sweeping crescent flourish while vaulting cleanly backward, planting 2 flanking Prisms.
  const crouchSow = { crouch: 0.38, lean: 0.25, legL: [-0.6, 0, 0], kneeL: [0.45, 0, 0], legR: [0.5, 0, 0], spin: [0, -0.8, 0], chest: [0.15, -0.2, 0],
    armR: [-1.05, 0, -0.9], elbowR: [-0.3, 0, 0], haft: [0.22, -0.75, 4.71], armL: [-0.95, 0, -0.2], elbowL: [-0.6, 0, 0] };
  const vaulted = { crouch: 0.14, lean: -0.18, legL: [-0.35, 0, 0], legR: [0.25, 0, 0], spin: [0, 0.78, 0], chest: [-0.15, 0.25, 0], head: [0, -0.35, 0],
    armR: [-1.55, 0, 0.65], elbowR: [-0.08, 0, 0], haft: [-0.15, 0.85, 4.71], armL: [-1.25, 0, 0.55], elbowL: [-0.35, 0, 0] };
  ATTACK_POSES.vesperSow = { ease: swing, lag: { weapon: 0.09 }, hits: [
    { windup: crouchSow, strike: vaulted, follow: { ...vaulted, crouch: 0.22, lean: 0 } },
  ] };

  // 6. Alignment: glaive planted upright beside her right foot (`grip: false`), open left hand lifted high to align every
  // floating prism, then snapped shut to fire the converging light-lances!
  const alignOpen = { grip: false, crouch: 0.04, lean: -0.06, legL: [-0.22, 0, 0], legR: [0.2, 0, 0], spin: [0, 0.28, 0], chest: [-0.08, 0.18, 0], head: [-0.12, -0.15, 0],
    armR: [-0.55, 0, -0.28], elbowR: [-0.55, 0, 0], haft: [-1.45, 0.1, 0.0], armL: [-2.25, 0, 0.35], elbowL: [-0.15, 0, 0] };
  const alignSnap = { grip: false, crouch: 0.14, lean: 0.18, legL: [-0.38, 0, 0], legR: [0.28, 0, 0], spin: [0, -0.18, 0], chest: [0.14, -0.12, 0], head: [0.06, 0.08, 0],
    armR: [-0.45, 0, -0.32], elbowR: [-0.65, 0, 0], haft: [-1.38, 0.08, 0.0], armL: [-1.15, 0, -0.18], elbowL: [-1.75, 0, 0] };
  ATTACK_POSES.vesperAlign = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [
    { windup: alignOpen, strike: alignSnap, follow: alignSnap },
  ] };

  // 7. Waning Turn: behind-reaction, glance over her left shoulder then sharp sweeping reverse arc.
  const glance = { crouch: 0.2, spin: [0, 0.88, 0], chest: [0, 0.28, 0], neck: [0, -0.5, 0], head: [0, -0.88, 0],
    armR: [-1.1, 0, 0.55], elbowR: [-0.7, 0, 0], haft: [0.18, 0.85, 1.57], armL: [-0.8, 0, 0.25], elbowL: [-0.6, 0, 0] };
  const turned = { crouch: 0.24, lean: 0.12, legL: [-0.35, 0, 0], legR: [0.42, 0, 0], spin: [0, -1.45, 0], chest: [0.08, -0.45, 0], neck: [0, 0.3, 0], head: [0, 0.4, 0],
    armR: [-1.35, 0, -1.05], elbowR: [0, 0, 0], haft: [0.15, -1.05, 1.57], armL: [-0.8, 0, -0.2], elbowL: [-0.6, 0, 0] };
  ATTACK_POSES.vesperTurn = { ease: swing, lag: { weapon: 0.09 }, hits: [
    { windup: glance, strike: turned, follow: { ...turned, spin: [0, -1.65, 0] } },
  ] };

  // ---- Phase 2 (Eclipse) ----
  // 8. The Eclipse Opens (phase opener): crouches clutching her sternum dial, then throws her arms wide & glaive skyward.
  const eclCoil = { grip: false, crouch: 0.34, lean: 0.42, legL: [-0.45, 0, 0], legR: [0.42, 0, 0], chest: [0.45, 0, 0], neck: [0.28, 0, 0], head: [0.3, 0, 0],
    armL: [-1.35, 0, -0.65], elbowL: [-2.05, 0, 0], armR: [-0.4, 0, -0.35], elbowR: [-0.5, 0, 0], haft: [-1.25, -0.25, 0.0] };
  const eclBurst = { grip: false, crouch: 0.04, lean: -0.28, legL: [-0.22, 0, 0.12], legR: [0.22, 0, -0.12], chest: [-0.36, 0, 0], neck: [-0.25, 0, 0], head: [-0.42, 0, 0],
    armL: [-1.45, 0, 1.25], elbowL: [-0.1, 0, 0], armR: [-2.15, 0, -0.95], elbowR: [-0.1, 0, 0], haft: [-1.48, -0.2, 0.0] };
  ATTACK_POSES.vesperEclipseOpen = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [
    { windup: eclCoil, strike: eclBurst, follow: eclBurst },
  ] };

  // 9. Step Through Glass: vertical mirror guard before her mask, blinks through silver dust into a razor two-hit cross-slash.
  const mirrorGuard = { crouch: 0.16, lean: -0.04, legL: [-0.35, 0, 0], legR: [0.38, 0, 0], spin: [0, -0.65, 0], chest: [-0.05, -0.2, 0], head: [0, 0.45, 0],
    armR: [-1.45, 0, -0.15], elbowR: [-0.95, 0, 0], haft: [-1.22, -0.35, 4.71], armL: [-1.35, 0, -0.35], elbowL: [-0.7, 0, 0] };
  ATTACK_POSES.vesperMirrorStep = { ease: swing, lag: { weapon: 0.08, armR: 0.04 }, hits: [
    { windup: mirrorGuard, strike: waltz1, follow: { ...waltz1, spin: [0, 0.98, 0] } },
    { windup: { ...waltz1, crouch: 0.26 }, strike: revR, follow: { ...revR, spin: [0, -1.1, 0] } },
  ] };

  // 10. Eclipse Crossfire: open-hand alignment fires every prism, then she leaps high and plunges the crescent glaive down!
  const leapCoil = { crouch: 0.44, lean: 0.16, legL: [-0.62, 0, 0], kneeL: [0.55, 0, 0], legR: [0.5, 0, 0], chest: [-0.15, 0, 0], head: [-0.1, 0, 0],
    armR: [-2.75, 0, 0.12], elbowR: [-0.7, 0, 0], haft: [-1.68, 0.05, 3.14], armL: [-2.55, 0, -0.22], elbowL: [-0.8, 0, 0] };
  ATTACK_POSES.vesperCrossfire = { ease: heavy, lag: { weapon: 0.09 }, hits: [
    { windup: alignOpen, strike: alignSnap, follow: alignSnap },
    { windup: leapCoil, strike: skyFall, follow: { ...skyFall, crouch: 0.42, lean: 0.54 } },
  ] };

  // 11. Lunar Tempest (pass 153: its own opener; it began as the Waltz did, poised across the shoulders): sunk low in a
  // sprinter's lunge, the glaive trailed back behind her right heel; a low rising sweep, a backhand, a spinning reverse
  // cleave, then the moon rises: crouched under the blade, point down, and cut straight up.
  const heelTrail = { crouch: 0.44, lean: 0.42, legL: [-0.78, 0, 0], kneeL: [0.6, 0, 0], legR: [0.62, 0, 0], spin: [0, 0.55, 0], chest: [0.32, 0.2, 0], head: [-0.25, -0.5, 0],
    armR: [-0.25, 0, -0.35], elbowR: [-0.1, 0, 0], haft: [0.55, -2.35, 4.71], armL: [-0.55, 0, -0.45], elbowL: [-0.9, 0, 0] };
  const lowSweep = { crouch: 0.38, lean: 0.3, legL: [-0.65, 0, 0], kneeL: [0.48, 0, 0], legR: [0.55, 0, 0], spin: [0, 1.05, 0], chest: [0.22, 0.35, 0], head: [0, -0.45, 0],
    armR: [-1.05, 0, 0.85], elbowR: [0, 0, 0], haft: [0.44, 0.85, 4.71], armL: [-0.75, 0, 0.45], elbowL: [-0.5, 0, 0] };
  const moonDraw = { crouch: 0.46, lean: 0.36, legL: [-0.72, 0, 0], kneeL: [0.6, 0, 0], legR: [0.5, 0, 0], spin: [0, 0.25, 0], chest: [0.34, 0.1, 0], head: [-0.3, 0, 0],
    armR: [-0.3, 0, -0.25], elbowR: [-0.25, 0, 0], haft: [0.95, 0.1, 0.0], armL: [-0.4, 0, -0.1], elbowL: [-0.55, 0, 0] };
  const moonRise = { crouch: 0.04, lean: -0.24, legL: [-0.38, 0, 0], legR: [0.34, 0, 0], spin: [0, -0.15, 0], chest: [-0.32, -0.08, 0], head: [-0.22, 0, 0],
    armR: [-2.75, 0, 0.1], elbowR: [-0.15, 0, 0], haft: [-1.45, 0.05, 0.0], armL: [-2.5, 0, -0.2], elbowL: [-0.3, 0, 0] };
  ATTACK_POSES.vesperTempest = { ease: swing, lag: { weapon: 0.08, armR: 0.04 }, hits: [
    { windup: heelTrail, strike: lowSweep, follow: { ...lowSweep, spin: [0, 1.2, 0] } },
    { windup: { ...lowSweep, crouch: 0.3 }, strike: waltz2, follow: { ...waltz2, spin: [0, -1.05, 0] } },
    { windup: { ...highL, crouch: 0.28 }, strike: revR, follow: { ...revR, spin: [0, -1.15, 0] } },
    { windup: moonDraw, strike: moonRise, follow: { ...moonRise, lean: -0.3, crouch: 0.1 } },
  ] };

  // (pass 153, tools/body-check.cjs; as the King's Blade's) every follow-through carries a fifth again of the blow's lean,
  // bend and turn past the strike, where the pose written does not already go further; a blow that neither drops nor
  // leans settles through its follow. Then in-between keys from each hit's own poses (all `rel`).
  const get = (q, ch, i) => (i == null ? q[ch] || 0 : (q[ch] || [0, 0, 0])[i]);
  const carry = h => {
    const F = { ...h.follow };
    for (const [ch, i] of [['lean'], ['chest', 0], ['chest', 1], ['spin', 1]]) {
      const d = get(h.strike, ch, i) - get(h.windup, ch, i), want = get(h.strike, ch, i) + 0.2 * d;
      if (Math.abs(d) < 0.05 || (get(F, ch, i) - want) * Math.sign(d) >= 0) continue;
      if (i == null) F[ch] = want; else { const v = [...(F[ch] || [0, 0, 0])]; v[i] = want; F[ch] = v; }
    }
    if (get(F, 'crouch') <= get(h.strike, 'crouch') + 0.02 && Math.abs(get(h.strike, 'lean') - get(h.windup, 'lean')) < 0.1) F.crouch = get(h.strike, 'crouch') + 0.08;
    return { ...h, follow: F };
  };
  const BODY = ['spin', 'chest'], LIMB = ['armR', 'elbowR', 'armL'];
  const toward = (a, b, k, names) => Object.fromEntries(names.filter(n => a[n] && b[n])
    .map(n => [n, a[n].map((v, i) => Math.max(-0.45, Math.min(0.45, k * (b[n][i] - v))))]));
  const inBetween = h => ({
    windup: [{ t: 0.8, rel: true, crouch: 0.02, ...toward(h.strike, h.windup, 0.08, [...BODY, ...LIMB]) }],
    active: [{ t: 0.6, rel: true, crouch: 0.03, lean: 0.03, ...toward(h.windup, h.strike, 0.3, BODY), ...toward(h.windup, h.strike, -0.2, LIMB) }],
    follow: [{ t: 0.5, rel: true, crouch: 0.04, lean: 0.05, ...toward(h.strike, h.follow, 0.3, [...BODY, ...LIMB]) }],
  });
  for (const [id, P] of Object.entries(ATTACK_POSES)) if (id.startsWith('vesper'))
    P.hits = P.hits.map(carry).map(h => ({ ...h, via: { ...inBetween(h), ...(h.via || {}) } }));
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const RING = (from, to, width, time) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time } });
  const ARC = { w: 4.8, h: 1.8, d: 3.6, fwd: 2.0, y: 1.2 };
  const WIDE = { w: 5.8, h: 1.4, d: 3.8, fwd: 2.0, y: 1.0 };
  const THRUST = { w: 1.3, h: 1.4, d: 5.2, fwd: 3.1, y: 1.25 };
  const CHOP = { w: 1.9, h: 3.4, d: 4.6, fwd: 2.4, y: 1.2 };
  const PLAIN = { w: 1.6, h: 2.4, d: 1.6, fwd: 0, y: 1.2 };

  const VESPER = {
    id: 'vesper', model: 'paleMeridian', name: 'Gemini, Neon High',
    description: 'Watcher of the glass observatory who measured the sky long after the stars went out. Her twin-crescent glaive plants floating silver prisms across the arena; when she raises her hand, every prism locks its sightline and fires a piercing lance of light at once. Deflect her blade and counter her to shatter the prisms. Past half her strength the eclipse opens: she steps through silver glass, and the sky cuts in crossfire.',
    scale: 1.92, bulk: 0.96, radius: 0.72, color: 0x304068, weapon: 'spear', idle: 'sway',
    visual: { skin: 0xd0dce8, roughness: 0.45, rim: 0.9 },
    // Tuned to the 1x Boss Rush base pace (measured with tools/rush-curve.cjs against Hollis & the roster).
    hp: 2950, poise: 210, speed: 3.35, turnRate: 3.8, trackRate: 2.2, approach: 0.68, kite: 0.14,
    cooldown: [1.35, 2.65], flinchTime: 0, staggerTime: 1.4, parriedTime: 1.8, deathFade: 6,
    defaultPhases: ['meridian', 'eclipse'],
    phases: {
      meridian: { hp: 2950,
        attacks: ['crescentDraw', 'meridianThrust', 'astrolabeWaltz', 'zenithFall', 'prismSeed', 'starAlignment', 'turnArc', 'needlePunish'] },
      eclipse: { at: 0.52, name: 'Gemini, the Eclipsed', opener: 'eclipseOpen',
        reveal: ['eclipse'], revealBurst: { color: 0xb874ff, count: 36, speed: 6.5 },
        cooldown: [1.05, 2.1], approach: 0.85, kite: 0.06, speed: 3.65, trackRate: 2.5,
        attacks: ['crescentDraw', 'meridianThrust', 'astrolabeWaltz', 'zenithFall', 'prismSeed', 'turnArc', 'needlePunish',
                  'eclipseOpen', 'mirrorStep', 'eclipseCross', 'lunarTempest'] },
    },
    attacks: [
      // ---- meridian (Phase 1) -------------------------------------------------------------------------------------------
      // The Crescent Draw: low coil, rising crescent arc -> spinning reverse cleave that plants 1 silver Prism.
      { id: 'crescentDraw', name: 'The Crescent Draw', anim: 'sweep', pose: 'vesperCrescent', tracking: { rate: 2.6, commit: 0.65 }, markers: glint(0, 1),
        hits: [{ startup: 0.98, active: 0.15, follow: 0.42, hold: { at: 0.55, time: [0.22, 0.65], chance: 0.4 } },
               { startup: 0.48, active: 0.15, follow: 0.4, step: { from: 0.18, speed: 3.2, side: 0 }, prism: { at: [[2.4, 3.0]] } }], recovery: 1.65,
        followUps: [{ attack: 'turnArc', if: 'behind', chance: 0.38 }],
        damage: 28, poise: 45, knock: 6, lunge: 1.5, range: 4.3, box: ARC },
      // Meridian Line: glaive levelled at the right hip, delayed piercing lunge thrust that plants 1 Prism.
      { id: 'meridianThrust', name: 'Meridian Line', anim: 'thrust', pose: 'vesperThrust', tracking: { rate: 3.1, commit: 0.72 }, markers: glint(0),
        hits: [{ startup: 1.0, active: 0.14, follow: 0.45, hold: { at: 0.58, time: [0.25, 0.75], chance: 0.45 }, prism: { at: [[3.4, -2.8]] } }], recovery: 1.55,
        damage: 34, poise: 55, knock: 8, lunge: 3.6, range: 5.6, box: THRUST },
      // Astrolabe Waltz: rhythmic 3-hit deflectable anime combo (forehand -> backhand -> heavy plunging moon-cleave).
      { id: 'astrolabeWaltz', name: 'Astrolabe Waltz', anim: 'sweep', pose: 'vesperWaltz', tracking: { rate: 2.8, commit: 0.62 }, markers: glint(0, 1, 2), chance: 0.85,
        hits: [{ startup: 0.92, active: 0.14, follow: 0.36 },
               { startup: 0.42, active: 0.14, follow: 0.38, step: { from: 0.15, speed: 3.2, side: 0 } },
               { startup: 0.64, active: 0.15, follow: 0.45, damage: 36, box: CHOP, impact: { ring: 2.2, crack: 1.0, dust: 10, shake: 0.09 } }], recovery: 1.85,
        followUps: [{ attack: 'turnArc', if: 'behind', chance: 0.32 }],
        damage: 25, poise: 45, knock: 6, lunge: 1.4, range: 4.2, box: ARC },
      // Zenith Fall: glaive lifted straight overhead like a sundial needle, held; heavy deflectable cleave.
      { id: 'zenithFall', name: 'Zenith Fall', anim: 'chop', pose: 'vesperZenith', tracking: { rate: 2.2, commit: 0.6 }, markers: glint(0), chance: 0.75,
        hits: [{ startup: 1.28, active: 0.15, follow: 0.5, hold: { at: 0.58, time: [0.25, 0.8], chance: 0.45 },
                 impact: { ring: 2.6, crack: 1.2, dust: 14, shake: 0.11 } }], recovery: 1.88,
        followUps: [{ attack: 'crescentDraw', if: 'near', chance: 0.22 }],
        damage: 40, heavy: true, poise: 70, knock: 9, lunge: 1.3, range: 4.5, box: CHOP },
      // Sow the Glass: sweeping vault backward that plants 2 flanking silver Prisms across the arena.
      { id: 'prismSeed', name: 'Sow the Glass', anim: 'sweep', pose: 'vesperSow', tracking: { rate: 2.4, commit: 0.55 }, markers: glint(0), chance: 0.55,
        hits: [{ startup: 0.86, active: 0.16, follow: 0.42, leap: { from: 0.25, max: 6.5, back: 4.6 },
                 prism: { at: [[3.0, -3.6], [3.0, 3.6]] } }], recovery: 1.5,
        damage: 24, poise: 35, knock: 6, lunge: 0, range: 5.5, box: WIDE },
      // Alignment: open-hand command when 2+ Prisms are up; every prism locks its sightline (chime!) and fires at once!
      { id: 'starAlignment', name: 'Alignment', anim: 'overhead', pose: 'vesperAlign', when: 'prismed', tracking: { rate: 2.2, commit: 0.5 }, chance: 0.34,
        markers: [{ event: 'sound', sound: 'prismLock', at: 'windup', t: 0.5, vel: 0.85 }, { event: 'sound', sound: 'prismLance', at: 'active', t: 0, vel: 0.9 }],
        hits: [{ startup: 1.35, active: 0.15, follow: 0.45, tell: 'hand', prismFire: { lock: 0.45, len: 24, keep: false } }], recovery: 1.85,
        damage: 26, poise: 45, knock: 7, lunge: 0, range: 22, box: PLAIN },
      // Waning Turn: behind-reaction crescent sweep.
      { id: 'turnArc', name: 'Waning Turn', anim: 'sweep', pose: 'vesperTurn', when: 'behind', tracking: { rate: 1.2, commit: 0.35 }, markers: glint(0), chance: 3.8,
        hits: [{ startup: 0.64, active: 0.15, follow: 0.32 }], recovery: 1.38,
        damage: 26, poise: 40, knock: 8, lunge: 0, range: 3.8, box: { w: 4.8, h: 1.8, d: 4.8, fwd: -0.5, y: 1.1 } },
      // The Watcher's Eye: punishes careless healing with a rapid lunging meridian thrust.
      { id: 'needlePunish', name: 'Meridian Line', anim: 'thrust', pose: 'vesperThrust', when: 'healing', tracking: { rate: 3.4, commit: 0.78 }, markers: glint(0), chance: 2.8,
        hits: [{ startup: 0.62, active: 0.15, follow: 0.35 }], recovery: 1.5,
        damage: 30, poise: 50, knock: 8, lunge: 4.8, range: 7.2, box: THRUST },

      // ---- eclipse (Phase 2) --------------------------------------------------------------------------------------------
      // The Eclipse Opens (invulnerable opener): fair expanding lunar ring + plants 3 Prisms in a triangle!
      { id: 'eclipseOpen', name: 'The Eclipse Opens', anim: 'stomp', pose: 'vesperEclipseOpen', noParry: true, rollOnly: true, invulnerable: true,
        tracking: { rate: 1.6, commit: 0.45 }, chance: 0.08,
        markers: [{ event: 'sound', sound: 'prismLock', at: 'windup', t: 0.4, vel: 0.9 }, { event: 'sound', sound: 'prismLance', at: 'active', t: 0, vel: 0.95 }],
        hits: [{ startup: 1.52, active: 0.46, follow: 0.45, box: RING(0.6, 8.2, 1.3, 0.46),
                 prism: { at: [[4.4, 0], [-2.8, 4.0], [-2.8, -4.0]] },
                 impact: { ring: 4.2, crack: 1.6, dust: 16, shake: 0.16 } }], recovery: 2.05,
        damage: 30, poise: 50, knock: 9, lunge: 0, range: 7.5, box: RING(0.6, 8.2, 1.3, 0.46) },
      // Step Through Glass: anime blink-step right into a razor two-hit crescent combo that plants 1 Prism!
      { id: 'mirrorStep', name: 'Step Through Glass', anim: 'sweep', pose: 'vesperMirrorStep', tracking: { rate: 3.0, commit: 0.65 }, markers: glint(0, 1), minRange: 4.0, chance: 0.85,
        hits: [{ startup: 0.95, active: 0.15, follow: 0.36, blink: { from: 0.42, dist: 2.6, time: 0.22 } },
               { startup: 0.44, active: 0.15, follow: 0.42, step: { from: 0.15, speed: 3.4, side: 0 }, prism: { at: [[2.6, -2.8]] } }], recovery: 1.72,
        damage: 28, poise: 45, knock: 7, lunge: 1.4, range: 13.0, box: ARC },
      // Eclipse Crossfire: locks & fires every active Prism in violet-silver crossfire, then leaps into a heavy plunge!
      { id: 'eclipseCross', name: 'Eclipse Crossfire', anim: 'chop', pose: 'vesperCrossfire', when: 'prismed', tracking: { rate: 2.4, commit: 0.5 }, chance: 0.32,
        markers: [{ event: 'sound', sound: 'prismLock', at: 'windup', t: 0.48, vel: 0.9 }, { event: 'sound', sound: 'prismLance', at: 'active', t: 0, vel: 0.95 }],
        hits: [{ startup: 1.30, active: 0.15, follow: 0.52, tell: 'hand', prismFire: { lock: 0.45, len: 26, keep: false }, box: PLAIN },
               { startup: 0.98, active: 0.16, follow: 0.48, leap: { from: 0.34, max: 11.5, short: 1.1 }, damage: 36, box: CHOP,
                 impact: { ring: 3.2, crack: 1.4, dust: 16, shake: 0.13 } }], recovery: 2.15,
        damage: 26, heavy: true, poise: 70, knock: 9, lunge: 0, range: 22, box: CHOP },
      // Lunar Tempest: sunk low, the glaive trailed behind her heel; four parried blows, the last a rising cut that plants 2 Prisms.
      { id: 'lunarTempest', name: 'Lunar Tempest', anim: 'sweep', pose: 'vesperTempest', tracking: { rate: 3.1, commit: 0.65 }, markers: glint(0, 1, 2, 3), chance: 0.8,
        hits: [{ startup: 0.86, active: 0.13, follow: 0.32, box: WIDE },
               { startup: 0.36, active: 0.13, follow: 0.32, step: { from: 0.12, speed: 3.2, side: 0 } },
               { startup: 0.40, active: 0.14, follow: 0.36, step: { from: 0.15, speed: 2.8, side: 0 } },
               { startup: 0.66, active: 0.15, follow: 0.46, damage: 34, box: CHOP, prism: { at: [[2.5, -3.2], [2.5, 3.2]] } }], recovery: 1.95,   // a rising cut: no ground impact
        damage: 22, poise: 40, knock: 6, lunge: 1.2, range: 4.4, box: ARC },
    ],
  };
  ENEMY_DEFS.push(VESPER); ENEMY_BY_ID[VESPER.id] = VESPER;
}
