'use strict';
// ============================================================================
// The Antlered Hunger (v7.20), the boss of Level 6, js/levels/the-church.js
// ============================================================================
// Its key poses, model and moveset. The model comes from Blender (tools/blender/antlered_beast.py, one rigid piece per
// bone, packed into js/baked/snow-church.js), so every shared key pose drives it.
//
// Above Aldric's last bar and below Margit: the player has come through five levels. It fights without pauses (a short
// `cooldown`), never uses one move three times running (`noRepeat`) and only strikes what is in front of it, so the way
// past its guard is behind it, where only the hind sweep can reach. Two phases on one bar: at half health it roars (a
// shockwave, no damage from the transition itself) and starts to leap and charge in earnest.
{
  const A = ATTACK_POSES, h = id => A[id].hits[0];
  A.hungerRake = { hits: [h('hollowSwing'), h('lightBackhand')] };
  A.hungerFlurry = { hits: [h('lightDiagonal'), h('lightBackhand'), h('hollowSwing')] };
  A.hungerRoar = { hits: [h('heavyOverhead')] };
  A.hungerCrash = { hits: [h('heavyOverhead'), h('enemyStomp')] };
}
{
  const hide = { tex: 'beastHide', tint: 0xffffff, decay: 0.6, size: 512 };
  const bonesOf = {
    spin: ['hide'], chest: ['hide', 'quill'], neck: ['hide', 'quill'], head: ['bone', 'quill', 'bone.2'],
    armL: ['hide', 'quill'], elbowL: ['hide', 'bone'], legL: ['hide'], kneeL: ['hide', 'bone'],
    armR: ['hide', 'quill'], elbowR: ['hide', 'bone'], legR: ['hide'], kneeR: ['hide', 'bone'],
  };
  MODEL_DEFS.antleredHunger = {
    faction: 'hunger', budget: 'boss', fit: 1, limbSides: 8, rim: 0.4,
    proportions: { shoulderX: 0.4, torsoW: 0.3, torsoD: 0.22, armR: 0.07, legR: 0.09, headR: 0.13, handR: 0.08, footLen: 0.4 },
    limbs: { armL: { len: 1.35 }, armR: { len: 1.35 } },
    posture: { chest: [0.72, 0, 0], neck: [0.1, 0, 0], head: [-0.62, 0, 0], armL: [-0.55, 0, -0.14], armR: [-0.55, 0, 0.14], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0] },
    materials: { hide, quill: { tex: 'beastQuill', tint: 0xffffff, decay: 0.5, rim: 0.15 }, bone: { tex: 'bone', tint: 0xd8cdb4, decay: 0.55, rim: 0.5 }, eye: { glow: 0xff5a20 } },
    body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: 'hide', hands: null, feet: null },
    bones: {},
    parts: Object.entries(bonesOf).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `${bone}__${s}`, bone, slot: s.split('.')[0] }))),
    eyes: { color: 0xff5a20, size: 0.022, spread: 0.1, at: [0, 0.1, 0.28] },
    anim: { idle: { breathRate: 1.1, breath: 0.03, headDrift: 0.08, sway: 0.03, twitch: 0.02 }, walk: { twist: 0.2, roll: 0.08, headNod: 0.07, elbow: 0.3, drag: 0.1 },
            flinch: { head: 0.35, chest: 0.35, arms: 0.35 }, death: { buckle: 1.2, slump: 1 } },
  };
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const ANTLERED_HUNGER = {
    id: 'antlered', model: 'antleredHunger', name: 'The Antlered Hunger',
    description: 'The hunger the Ember left behind, gone over the mountains to the Seven\'s first church to wear a starving stag. It never tries the same thing twice over, and it only strikes what stands before it.',
    scale: 2.3, bulk: 1.2, radius: 0.95, color: 0x4a3626, weapon: 'none', idle: 'sway', noRepeat: 2,
    visual: { skin: 0x5a4632, roughness: 0.85, rim: 0.5 },
    hp: 2600, poise: 240, speed: 3.1, turnRate: 3.4, trackRate: 1.9, approach: 0.8, kite: 0.02,
    cooldown: [0.5, 1.1], flinchTime: 0, staggerTime: 1.4, parriedTime: 1.8, deathFade: 7,
    posture: { max: 98, parry: 45, chainGap: 1.8, chainMul: 1.35, decay: 4.5, breakTime: 3.2, hitstop: 0.22 },
    defaultPhases: ['stalk', 'gorge'],
    phases: {
      stalk: { hp: 2600, attacks: ['rake', 'flurry', 'slam', 'charge', 'hindSweep'] },
      gorge: { at: 0.5, opener: 'roar', cooldown: [0.3, 0.8], approach: 1.1, speed: 3.5, trackRate: 2.3, attacks: ['rake', 'flurry', 'slam', 'charge', 'leap', 'roar', 'hindSweep'] },
    },
    attacks: [
      // Right claw, then left: the bread of the fight. Both can be parried.
      { id: 'rake', name: 'Claw Rake', anim: 'sweep', pose: 'hungerRake', tracking: { rate: 3.0, commit: 0.65 }, markers: glint(0, 1), poseScale: 1.2,
        hits: [{ startup: 0.7, active: 0.14, follow: 0.1 }, { startup: 0.45, active: 0.14, follow: 0.3 }], recovery: 0.75,
        followUps: [{ attack: 'slam', if: 'far', chance: 0.35 }],
        damage: 26, poise: 45, knock: 6, lunge: 2.2, range: 4.2, box: { w: 5.0, h: 2.6, d: 3.6, fwd: 2.0, y: 1.6 } },
      // Three cuts, advancing, a beat between the second and third.
      { id: 'flurry', name: 'Rending Flurry', anim: 'sweep', pose: 'hungerFlurry', tracking: { rate: 3.0, commit: 0.7 }, markers: glint(0, 2), poseScale: 1.15, chance: 0.6,
        hits: [{ startup: 0.6, active: 0.13, follow: 0.08, step: { from: 0.3, speed: 3, side: 0 } }, { startup: 0.4, active: 0.13, follow: 0.1 }, { startup: 0.7, active: 0.14, follow: 0.35 }],
        recovery: 0.95, damage: 22, poise: 35, knock: 4, lunge: 2.4, range: 4.0, box: { w: 4.6, h: 2.4, d: 3.4, fwd: 1.9, y: 1.5 } },
      // Both arms up, held a beat, down: the big opening of the first phase.
      { id: 'slam', name: 'Hammerfall', anim: 'chop', pose: 'heavyOverhead', tracking: { rate: 2.2, commit: 0.55 }, markers: glint(0), poseScale: 1.3,
        hits: [{ startup: 1.2, active: 0.15, follow: 0.45, hold: { at: 0.5, time: [0.2, 0.6], chance: 0.5 } }], recovery: 1.25,
        damage: 44, poise: 80, knock: 9, lunge: 1.6, range: 4.0, box: { w: 2.8, h: 3.4, d: 4.4, fwd: 2.4, y: 1.4 },
        impact: { ring: 3.4, crack: 1.8, dust: 16, shake: 0.14 } },
      // The head goes down and it comes on, antlers first: step aside, it cannot be parried.
      { id: 'charge', name: 'Antler Charge', anim: 'thrust', pose: 'enemyThrust', noParry: true, tracking: { rate: 2.4, commit: 0.6 }, poseScale: 1.2, minRange: 5, chance: 0.45,
        dash: { speed: 13, from: 0.45 }, hits: [{ startup: 1.0, active: 0.16, follow: 0.45 }], recovery: 1.0,
        damage: 40, poise: 70, knock: 10, lunge: 2.6, range: 15, box: { w: 3.2, h: 2.6, d: 4.0, fwd: 2.2, y: 1.4 } },
      // Over the pillars and down on the player: the long opening of the second phase.
      { id: 'leap', name: 'The Fall', anim: 'chop', pose: 'hungerCrash', noParry: true, tracking: { rate: 2.4, commit: 0.5 }, poseScale: 1.35, minRange: 5, chance: 0.5,
        hits: [{ startup: 1.4, active: 0.16, follow: 0.3, leap: { from: 0.4, max: 15, short: 1.4 }, impact: { ring: 6.0, crack: 2.8, dust: 26, shake: 0.2 } },
               { startup: 0.3, active: 0.18, follow: 0.5, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 8, width: 1.6, time: 0.18 } }, impact: { ring: 4.5, crack: 0, dust: 14, shake: 0.12 } }],
        recovery: 1.5, damage: 50, poise: 90, knock: 10, lunge: 0, range: 16, box: { w: 5.0, h: 2.6, d: 5.0, fwd: 0.8, y: 1.0 } },
      // Throws back the skull and screams: a ring of force through the floor. Jump or roll it. Opens the second phase.
      { id: 'roar', name: 'The Roar', anim: 'overhead', pose: 'hungerRoar', noParry: true, tracking: { rate: 1.6, commit: 0.4 }, poseScale: 1.0, minRange: 0.1, chance: 0.2,
        hits: [{ startup: 1.3, active: 0.18, follow: 0.5, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1, to: 10, width: 1.6, time: 0.18 } }, impact: { ring: 4.0, crack: 0, dust: 14, shake: 0.22 } }],
        recovery: 0.9, damage: 24, poise: 60, knock: 8, lunge: 0, range: 8, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3 } },
      // Behind it: a whole turn of the claws.
      { id: 'hindSweep', name: 'Hind Sweep', anim: 'spin', pose: 'enemySpin', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 1.6,
        hits: [{ startup: 0.7, active: 0.15, follow: 0.3 }], recovery: 0.8,
        damage: 26, poise: 45, knock: 8, lunge: 0, range: 4.2, box: { w: 7.0, h: 2.0, d: 7.0, fwd: 0, y: 1.0 } },
    ],
  };
  ENEMY_DEFS.push(ANTLERED_HUNGER); ENEMY_BY_ID[ANTLERED_HUNGER.id] = ANTLERED_HUNGER;
}
