'use strict';
// ============================================================================
// Elden Ring Bosses: Godrick the Grafted (v5.4)
// ============================================================================
// Everything that makes Godrick lives here: his key poses, his model and his moveset. The boss list (js/data/elden-bosses.js)
// names him; the mode (js/elden.js) fights him in the Enemies arena. Reference: docs/Margit/godrick-stats.txt.
//
// Conversion to this game's scale (not Elden Ring's numbers). The player has 120 HP, a light hit does 18 and a heavy 38,
// a roll is invulnerable for 0.3 s. Aldric (throne + knell, 3800 HP over two bars) and Margit (3200, one bar) are the
// toughest duels. In Elden Ring Godrick has 6080 HP against Margit's 4174 (x1.46); a straight copy (4660) would make the
// fight a slog at 18 a hit, so he sits just above Aldric:
//   - one bar of 4000 HP; at 60 % (2400 HP left, the reference's threshold) the second phase starts on the same bar (`at`);
//   - stance 105 -> posture 150 (Margit's 90 -> 130); he cannot be parried at all (`noParry` on every attack), only blocked
//     or rolled, so the posture fills from heavy blows and executions are the reward for breaking it;
//   - axe blows 20-36, slams and leaps 50-62, shockwaves 28-46 (roll-only, jumpable), fire ticks 12-14, the grab 62;
//     every strike's active time stays at or under 0.2 s (a roll clears it with a margin; a test checks);
//   - the arm chop (the phase change) is untouchable through its wind-up and strike (`invulnerable`), and only hurts
//     someone standing right next to him; then the opening flame sweep, whose flanks are safe.
// Ratios kept from the reference: the leaping slams and the shockwave finishers leave the big openings, the rampage is
// open only after its fifth cut, the drag and the double step are short openings, and the stormcaller branches.

// ---- key poses (js/data/attack-poses.js format), built from the shared ones ----------------------------------------------
{
  const A = ATTACK_POSES, h = id => A[id].hits[0], rep = (id, n) => Array.from({ length: n }, () => h(id));
  ATTACK_POSES.godrickStorm = { hits: rep('enemySpin', 3) };
  ATTACK_POSES.godrickBlade = { hits: [h('hollowSwing'), h('lightBackhand')] };
  ATTACK_POSES.godrickKneel2 = { hits: [h('enemyStomp'), h('heavyOverhead')] };
  ATTACK_POSES.godrickKneel3 = { hits: [h('enemyStomp'), h('heavyOverhead'), h('heavyOverhead')] };
  ATTACK_POSES.godrickDrag = { hits: [h('hollowSwing'), h('lightOverhead')] };
  ATTACK_POSES.godrickRampage = { hits: [h('lightDiagonal'), h('lightBackhand'), h('lightDiagonal'), h('hollowSwing'), h('lightBackhand')] };
  ATTACK_POSES.godrickDoubleStep = { hits: [h('heavyOverhead'), h('enemyBash')] };
  ATTACK_POSES.godrickBreath = { hits: rep('enemyBash', 7) };
  ATTACK_POSES.godrickLeapRing = { hits: [h('heavyOverhead'), h('enemyStomp')] };
  ATTACK_POSES.godrickMarch = { hits: [...rep('enemyBash', 4), h('lightOverhead')] };
}

// ---- model (from the reference art): a hulking, stooped lord in mismatched silver and gilded plate under a teal tabard
// and cape bordered in gold embroidery, red rags at the hips, a gold medallion, a wild white mane under a low gold
// circlet over a pale, lined face; pale grafted arms with long hooked claws reaching out of his back and flanks; a long
// gilded great axe with two crescent bits back to back.
MODEL_DEFS.godrick = {
  faction: 'grafted', budget: 'boss', fit: 1.02, limbSides: 8,
  proportions: { shoulderX: 0.44, torsoW: 0.3, torsoD: 0.22, armR: 0.085, legR: 0.1, headR: 0.125, handR: 0.08, footLen: 0.34 },
  limbs: { armR: { len: 1.04, thick: 1.12 }, armL: { len: 1.06, thick: 1.15 }, legL: { thick: 1.1 }, legR: { thick: 1.1 } },
  posture: { chest: [0.28, 0, 0.04], neck: [0.16, 0, 0], head: [-0.2, 0, 0], elbowL: [-0.4, 0, 0], elbowR: [-0.45, 0, 0] },   // a deep forward stoop
  hidden: ['dragon', 'dragonGlow'],   // the grafted dragon head: shown from the second phase (its `reveal`, js/flame.js)
  materials: {
    skin: { tex: 'paleSkin', tint: 0xb4a898, decay: 0.9 },
    graft: { tex: 'paleSkin', tint: 0xc0b4a2, decay: 0.95 },
    plate: { tex: 'dentedSteel', tint: 0xa49c88, decay: 0.6, size: 512 },
    gold: { tex: 'dentedSteel', tint: 0xc09a4a, decay: 0.45, size: 512 },
    robe: { tex: 'rottenCloth', tint: 0x2e5048, decay: 0.6, size: 512, double: true },
    cape: { tex: 'rottenCloth', tint: 0x355a50, decay: 0.6, size: 512, double: true },
    capeHem: { tex: 'tatteredFabric', tint: 0x355a50, decay: 0.7, size: 512, double: true },
    trim: { tex: 'dentedSteel', tint: 0xd0a850, decay: 0.25, double: true },
    rag: { tex: 'tatteredFabric', tint: 0x9a4040, decay: 0.7, double: true },
    hair: { tex: 'rottenCloth', tint: 0xe6e0d2, decay: 0.25, double: true },
    blade: { tex: 'rustedIron', tint: 0x9a7e52, decay: 0.35, size: 512 },
    haft: { tex: 'dentedSteel', tint: 0xb08a40, decay: 0.5 },
    dragon: { tex: 'bone', tint: 0x6a5a48, decay: 0.9 },
    dragonGlow: { glow: 0xff7a20 },
    eye: { glow: 0xffd890 },
  },
  body: { torso: 'robe', pelvis: 'plate', arms: 'plate', legs: 'plate', head: 'skin', neck: 'skin', hands: 'gold', feet: 'plate' },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.22] }, loinB: { parent: 'spin', at: [0, -0.02, -0.22] },
    ragL: { parent: 'spin', at: [0.2, -0.02, 0.1] }, ragR: { parent: 'spin', at: [-0.2, -0.02, 0.12] },
    beard: { parent: 'head', at: [0, 0.03, 0.12] }, mane: { parent: 'head', at: [0, 0, 0] },
    capeA: { parent: 'chest', at: [0, 0.6, -0.27] }, capeB: { parent: 'capeA', at: [0, -0.44, 0] }, capeC: { parent: 'capeB', at: [0, -0.44, 0] }, capeD: { parent: 'capeC', at: [0, -0.4, 0] },
  },
  parts: [
    // Armour: a teal tabard over the chest, mismatched silver and gilded plates on the shoulders, forearms and shins.
    { use: 'jerkin', slot: 'robe', bone: 'chest' }, { use: 'breastHalf', slot: 'plate', bone: 'chest', side: -1 },
    { use: 'medallion', slot: 'gold', bone: 'chest', at: [0.13, 0.42, 0.24], r: 0.075 },
    { use: 'chain', slot: 'gold', bone: 'chest', from: [-0.26, 0.56, 0.12], to: [0.24, 0.3, 0.22], links: 10, sag: 0.03 },
    { use: 'belt', slot: 'gold', bone: 'spin' },
    { use: 'pauldron', slot: 'plate', bone: 'armL', size: 2.1 }, { use: 'pauldron', slot: 'gold', bone: 'armR', size: 1.9, side: -1 },
    { use: 'spikes', slot: 'gold', bone: 'armL', size: 1.0 },
    { use: 'wraps', slot: 'gold', bone: 'elbowR', from: 0.04, to: 0.3, radius: 0.095, count: 3 }, { use: 'wraps', slot: 'plate', bone: 'elbowL', from: 0.04, to: 0.22, radius: 0.095, count: 2 },
    { use: 'wraps', slot: 'plate', bone: 'kneeL', from: 0.04, to: 0.34, radius: 0.11, count: 3 }, { use: 'wraps', slot: 'gold', bone: 'kneeR', from: 0.04, to: 0.34, radius: 0.11, count: 3 },
    // The head: a pale face, a wild white mane and beard, the gold circlet.
    { use: 'mane', slot: 'hair', bone: 'mane', count: 22, len: 0.5 },
    { use: 'circlet', slot: 'gold', bone: 'head', r: 0.135, y: 0.17 },
    { use: 'clothStrip', slot: 'hair', bone: 'beard', w: 0.18, len: 0.3, seed: 4 },
    // The grafts: pale arms with long hooked claws, sewn onto his back and flanks, one reaching over his shoulder.
    { use: 'graftedArms', slot: 'graft', bone: 'chest', r: 0.085, hand: 0.3, arms: [
      [[0.24, 0.5, -0.2], [0.62, 0.42, -0.36], [0.86, 0.02, -0.12]], [[-0.24, 0.5, -0.2], [-0.66, 0.46, -0.32], [-0.9, 0.08, -0.04]],
      [[0.1, 0.28, -0.26], [0.32, -0.06, -0.5], [0.4, -0.46, -0.3]],
      [[0.04, 0.6, -0.2], [0.14, 0.98, -0.36], [0.34, 1.2, -0.18]] ] },
    { use: 'graftedArms', slot: 'graft', bone: 'spin', r: 0.075, hand: 0.27, arms: [[[-0.24, 0.04, -0.14], [-0.56, -0.24, -0.2], [-0.62, -0.62, 0.0]]] },
    { use: 'dragonHead', slot: 'dragon', glow: 'dragonGlow', bone: 'elbowL', size: 1.25 },
    // Cloth: a long teal tabard front and back with gold borders, red rags at the hips, a teal cape bordered in gold.
    { use: 'clothStrip', slot: 'robe', bone: 'loinF', w: 0.42, len: 1.0, seed: 3 },
    { use: 'clothStrip', slot: 'trim', bone: 'loinF', w: 0.07, len: 0.98, seed: 3, dx: 0.16, dz: 0.012 }, { use: 'clothStrip', slot: 'trim', bone: 'loinF', w: 0.07, len: 0.98, seed: 3, dx: -0.16, dz: 0.012 },
    { use: 'clothStrip', slot: 'robe', bone: 'loinB', w: 0.44, len: 1.05, seed: 7 },
    { use: 'clothStrip', slot: 'rag', bone: 'ragL', w: 0.2, len: 0.7, seed: 11, turn: 1.0 }, { use: 'clothStrip', slot: 'rag', bone: 'ragR', w: 0.22, len: 0.62, seed: 13, turn: -1.0 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeA', w0: 0.7, w1: 0.84, len: 0.44, bow: 1.0 }, { use: 'capeTrim', slot: 'trim', bone: 'capeA', w0: 0.7, w1: 0.84, len: 0.44, bow: 1.0, trim: 0.1 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeB', w0: 0.84, w1: 0.98, len: 0.44, bow: 0.8 }, { use: 'capeTrim', slot: 'trim', bone: 'capeB', w0: 0.84, w1: 0.98, len: 0.44, bow: 0.8, trim: 0.1 },
    { use: 'capeSegment', slot: 'cape', bone: 'capeC', w0: 0.98, w1: 1.08, len: 0.42, bow: 0.6 }, { use: 'capeTrim', slot: 'trim', bone: 'capeC', w0: 0.98, w1: 1.08, len: 0.42, bow: 0.6, trim: 0.1 },
    { use: 'capeSegment', slot: 'capeHem', bone: 'capeD', w0: 1.08, w1: 1.14, len: 0.36, bow: 0.5, ragged: true, seed: 5 },
  ],
  weapon: { use: 'twinAxe', slots: { blade: 'blade', grip: 'haft', guard: 'gold' } },
  embers: { head: [0, 0, 1.48], edge: { size: [0.05, 0.85, 0.45], at: [0, 0, 1.05] } },   // only while he burns (phase 2)
  eyes: { color: 0xffd890, size: 0.02, spread: 0.06, at: [0, 0.12, 0.12] },
  anim: {
    idle: { breathRate: 0.85, breath: 0.024, headDrift: 0.06, sway: 0.025, twitch: 0 }, walk: { twist: 0.14, roll: 0.07, headNod: 0.05, elbow: 0.25, drag: 0.12 },
    flinch: { head: 0.3, chest: 0.3, arms: 0.3 }, death: { buckle: 1.2, slump: 1 },
    cloth: [{ bone: 'loinF', gain: 0.1, k: 60, damp: 5, flutter: 0.03 }, { bone: 'loinB', gain: 0.14, k: 52, damp: 4.6, flutter: 0.04 },
            { bone: 'ragL', gain: 0.16, k: 50, damp: 4, flutter: 0.07 }, { bone: 'ragR', gain: 0.16, k: 48, damp: 4, flutter: 0.07 },
            { bone: 'beard', gain: 0.1, k: 70, damp: 6, flutter: 0.02 }, { bone: 'mane', gain: 0.05, k: 60, damp: 5, flutter: 0.03 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 34, damp: 3.6, flutter: 0.05 },
            { bone: 'capeC', gain: 0.08, k: 30, damp: 3.2, flutter: 0.07, sideways: 1.2 }, { bone: 'capeD', gain: 0.1, k: 24, damp: 2.8, flutter: 0.09, sideways: 1.4 }],
  },
};

// ---- the boss -----------------------------------------------------------------------------------------------------------
// Fields new in v5.4: an attack's `invulnerable` (js/enemy.js) and `breath` (a flame jet drawn along its box, js/flame.js),
// a phase's `reveal` (model slots shown from that phase). The rest are the v5.3 fields (see margit.js).
const RING = (from, to, width) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time: 0.18 } });
const GODRICK = {
  id: 'godrick', model: 'godrick', name: 'Godrick the Grafted',
  description: 'A hulking lord sewn with the arms of the fallen, swinging a great axe and calling the storm. At 60% he hacks off his arm for a dragon\'s head that breathes fire.',
  scale: 2.1, bulk: 1.3, radius: 0.95, color: 0x8a6a3a, weapon: 'greataxe', idle: 'sway',
  visual: { skin: 0x9a8c7c, skinMetal: 0.3, metal: 0.5, roughness: 0.5, rim: 0.9 },
  hp: 4000, poise: 260, speed: 2.4, turnRate: 3.0, trackRate: 1.5, approach: 0.5, kite: 0.1,
  cooldown: [1.2, 2.2], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 7,
  posture: { max: 150, parry: 40, chainGap: 1.8, chainMul: 1.3, decay: 4, breakTime: 3.4, hitstop: 0.22 },
  defaultPhases: ['grafted', 'dragon'],
  phases: {
    // Phase 1: the axe and the storm.
    grafted: { hp: 4000,
      attacks: ['stormcaller', 'stormBlade', 'stormLeap', 'jumpSlam', 'kneel', 'dragSlash', 'rampage', 'doubleStep', 'backhand'] },
    // Phase 2 (at 60 %): the arm chop, the dragon head, fire on everything; he attacks sooner and presses harder.
    dragon: { at: 0.6, opener: 'armChop', ignite: true, reveal: ['dragon', 'dragonGlow'], cooldown: [0.8, 1.6], approach: 0.7, kite: 0,
      speed: 2.6, trackRate: 1.9,
      attacks: ['armChop', 'flameSweep', 'flameStorm', 'flameBlade', 'flameLeap', 'jumpSlam', 'flameKneel', 'dragSlash', 'rampage',
                'doubleStep', 'backhand', 'dragonGrab', 'fireMarch'] },
  },
  attacks: [
    // ---- phase 1 --------------------------------------------------------------------------------------------------
    // Stormcaller: the axe whirled round him three times, a vortex at arm's length. No opening: it branches at once,
    // into the leaping slam if you stayed close, into the storm blades if you backed off.
    { id: 'stormcaller', name: 'Stormcaller', anim: 'spin', pose: 'godrickStorm', noParry: true, tracking: { rate: 2.4, commit: 0.6 }, poseScale: 1.3, chance: 0.6,
      hits: [{ startup: 1.0, active: 0.14, follow: 0.06 }, { startup: 0.32, active: 0.14, follow: 0.06 }, { startup: 0.32, active: 0.14, follow: 0.12 }], recovery: 0.6,
      followUps: [{ attack: 'stormBlade', if: 'far', chance: 0.9 }, { attack: 'stormLeap', chance: 0.85 }],
      damage: 22, poise: 35, knock: 6, lunge: 0.6, range: 4.0, box: { w: 6.4, h: 2.0, d: 6.4, fwd: 0, y: 1.1 } },
    // Two curved wind blades, one after the other (bolts: block or roll them). A small opening at range.
    { id: 'stormBlade', name: 'Storm Blade', anim: 'sweep', pose: 'godrickBlade', noParry: true, tracking: { rate: 3.0, commit: 0.85 }, poseScale: 1.25, chance: 0,
      projectile: { speed: 15, gravity: 0, size: 0.6, look: 'slash' },
      hits: [{ startup: 0.55, active: 0.05, follow: 0.15 }, { startup: 0.5, active: 0.05, follow: 0.3 }], recovery: 1.0,
      damage: 26, poise: 40, knock: 6, lunge: 0, range: 22, box: { w: 1, h: 1, d: 1, fwd: 1, y: 1.0 } },
    // A roll-and-leap out of the storm, the axe driven into the earth: it lodges, a long opening.
    { id: 'stormLeap', name: 'Storm Leap Slam', anim: 'chop', pose: 'heavyOverhead', noParry: true, tracking: { rate: 2.2, commit: 0.5 }, poseScale: 1.4, chance: 0,
      hits: [{ startup: 1.2, active: 0.16, follow: 0.6, leap: { from: 0.3, max: 10, short: 1.6 } }], recovery: 1.9,
      damage: 56, poise: 85, knock: 10, lunge: 0, range: 10, box: { w: 3.0, h: 2.6, d: 4.4, fwd: 1.8, y: 1.0 },
      impact: { ring: 4.0, crack: 2.2, dust: 22, shake: 0.18 } },
    // The standalone jump: both hands on the haft, straight up, straight down. Long landing.
    { id: 'jumpSlam', name: 'Jumping Axe Slam', anim: 'chop', pose: 'heavyOverhead', noParry: true, tracking: { rate: 2.0, commit: 0.45 }, poseScale: 1.4, minRange: 4, chance: 0.3,
      hits: [{ startup: 1.6, active: 0.16, follow: 0.6, leap: { from: 0.4, max: 11, short: 1.6 } }], recovery: 1.8,
      damage: 54, poise: 85, knock: 10, lunge: 0, range: 11, box: { w: 3.0, h: 2.6, d: 4.4, fwd: 1.8, y: 1.0 },
      impact: { ring: 4.0, crack: 2.0, dust: 20, shake: 0.16 } },
    // "I command thee, kneel!": the leg raised, the axe inverted and slammed: a small shockwave, then a much wider one.
    // Along the floor: jump them or roll them. A big opening after the second.
    { id: 'kneel', name: 'I Command Thee, Kneel!', anim: 'stomp', pose: 'godrickKneel2', noParry: true, rollOnly: true, tracking: { rate: 1.6, commit: 0.5 }, poseScale: 1.3, chance: 0.45,
      hits: [{ startup: 1.4, active: 0.18, follow: 0.2, box: RING(0.8, 4, 1.4), impact: { ring: 3.0, crack: 1.6, dust: 14, shake: 0.12 } },
             { startup: 0.9, active: 0.2, follow: 0.4, box: RING(1.2, 9, 1.8), impact: { ring: 5.0, crack: 2.4, dust: 22, shake: 0.18 } }],
      recovery: 1.8, damage: 32, poise: 55, knock: 9, lunge: 0, range: 4.2, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true } },
    // A run with the blade grinding along the floor at his right, then an upward scoop. A short pause after.
    { id: 'dragSlash', name: 'Dragging Slash', anim: 'sweep', pose: 'godrickDrag', noParry: true, tracking: { rate: 2.8, commit: 0.45 }, poseScale: 1.25,
      minRange: 4.5, dash: { speed: 9.5, from: 0.3 }, chance: 0.45,
      hits: [{ startup: 1.0, active: 0.14, follow: 0.1, box: { w: 3.6, h: 1.4, d: 3.4, fwd: 1.8, y: 0.6 } }, { startup: 0.45, active: 0.14, follow: 0.3, box: { w: 1.8, h: 3.2, d: 3.4, fwd: 2.0, y: 1.4 } }],
      recovery: 0.85, damage: 30, poise: 50, knock: 7, lunge: 2.0, range: 11, box: { w: 3.6, h: 1.8, d: 3.4, fwd: 1.8, y: 1.0 } },
    // The roar, three cuts lunging in from side to side, a pause (a trap), two wide sweeps. Open only after the fifth.
    { id: 'rampage', name: 'Five-Strike Rampage', anim: 'sweep', pose: 'godrickRampage', noParry: true, tracking: { rate: 3.0, commit: 0.7 }, poseScale: 1.25, chance: 0.6,
      // Each cut is a stride at the player, swinging from side to side (`step`); the 4th comes after the held pause.
      hits: [{ startup: 1.0, active: 0.13, follow: 0.08, step: { from: 0.45, speed: 4.5, side: 2.2 } },
             { startup: 0.4, active: 0.13, follow: 0.08, step: { from: 0.1, speed: 5, side: -2.6 } },
             { startup: 0.4, active: 0.13, follow: 0.1, step: { from: 0.1, speed: 5, side: 2.6 } },
             { startup: 0.85, active: 0.14, follow: 0.1, hold: { at: 0.4, time: [0.2, 0.6], chance: 0.7 }, step: { from: 0.45, speed: 5.5, side: -2.4 }, box: { w: 5.2, h: 1.8, d: 3.6, fwd: 1.8, y: 1.1 } },
             { startup: 0.5, active: 0.14, follow: 0.4, step: { from: 0.15, speed: 5, side: 2.4 }, box: { w: 5.2, h: 1.8, d: 3.6, fwd: 1.8, y: 1.1 } }],
      recovery: 1.6, damage: 20, poise: 35, knock: 5, lunge: 1.8, range: 3.6, box: { w: 3.8, h: 1.8, d: 3.4, fwd: 1.8, y: 1.1 } },
    // Two heavy steps, the axe down from his left shoulder, an off-hand sweep. Circle behind and a backhand follows.
    { id: 'doubleStep', name: 'Double-Step Strike', anim: 'chop', pose: 'godrickDoubleStep', noParry: true, tracking: { rate: 2.4, commit: 0.65 }, poseScale: 1.3, chance: 0.6,
      hits: [{ startup: 1.3, active: 0.14, follow: 0.2, box: { w: 2.0, h: 3.0, d: 4.0, fwd: 2.2, y: 1.2 } }, { startup: 0.45, active: 0.13, follow: 0.3, box: { w: 4.2, h: 1.6, d: 2.8, fwd: 1.4, y: 1.0 } }],
      recovery: 0.85, followUps: [{ attack: 'backhand', if: 'behind', chance: 0.85 }],
      damage: 34, poise: 55, knock: 7, lunge: 2.6, range: 3.8, box: { w: 2.0, h: 3.0, d: 4.0, fwd: 2.2, y: 1.2 } },
    // Someone at his back: a swift backhand with a grafted arm clears the rear arc.
    { id: 'backhand', name: 'Rear Backhand', anim: 'spin', pose: 'enemySpin', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 1.8,
      hits: [{ startup: 0.55, active: 0.13, follow: 0.25 }], recovery: 0.7,
      damage: 24, poise: 40, knock: 9, lunge: 0, range: 3.6, box: { w: 4.4, h: 1.8, d: 3.0, fwd: -1.4, y: 1.1 } },

    // ---- the phase change -----------------------------------------------------------------------------------------
    // He screams, drops to his knees and hacks off his left forearm: untouchable meanwhile, the chop hurts only right
    // beside him. The dragon head appears as the axe falls (js/flame.js); the flame sweep follows at once.
    { id: 'armChop', name: 'Arm Chop', anim: 'chop', pose: 'heavyOverhead', noParry: true, invulnerable: true, tracking: { rate: 1.2, commit: 0.3 }, poseScale: 1.2, chance: 0,
      hits: [{ startup: 2.6, active: 0.14, follow: 0.8, box: { w: 3.6, h: 2.2, d: 3.6, fwd: 0, y: 1.0 }, impact: { ring: 3.0, crack: 1.4, dust: 18, shake: 0.2 } }],
      recovery: 0.3, followUps: [{ attack: 'flameSweep', chance: 1 }],
      damage: 30, poise: 50, knock: 10, lunge: 0, range: 3, box: { w: 3.6, h: 2.2, d: 3.6, fwd: 0, y: 1.0 } },

    // ---- phase 2 --------------------------------------------------------------------------------------------------
    // Braced, a long jet of fire swept slowly across his front: his flanks and back are safe the whole time (a big opening).
    { id: 'flameSweep', name: 'Flame Sweep', anim: 'bash', pose: 'godrickBreath', noParry: true, tracking: { rate: 0.35, commit: 1 }, poseScale: 1.2, chance: 0.12,
      breath: { len: 9, width: 2.6 },
      hits: [{ startup: 1.1, active: 0.14, follow: 0.06 }, ...Array.from({ length: 6 }, () => ({ startup: 0.2, active: 0.14, follow: 0.06 }))], recovery: 1.8,
      damage: 12, poise: 15, knock: 3, lunge: 0, range: 8, box: { w: 3.2, h: 2.0, d: 7.5, fwd: 4.5, y: 1.0 } },
    // The dragon's jaws scrape the floor in a charge; caught, he bites down and burns. A big opening if it misses.
    { id: 'dragonGrab', name: 'Dragon Grab', anim: 'bash', pose: 'enemyBash', noParry: true, rollOnly: true, tracking: { rate: 2.6, commit: 0.5 }, poseScale: 1.3,
      minRange: 3.5, dash: { speed: 10, from: 0.4 }, chance: 0.35, breath: { len: 3.5, width: 1.6 },
      hits: [{ startup: 1.3, active: 0.16, follow: 0.5 }], recovery: 1.9,
      damage: 62, poise: 90, knock: 12, lunge: 2.0, range: 10, box: { w: 2.2, h: 1.6, d: 3.0, fwd: 1.8, y: 0.7 } },
    // The burning stormcaller: same branching, fiercer.
    { id: 'flameStorm', name: 'Flaming Stormcaller', anim: 'spin', pose: 'godrickStorm', noParry: true, tracking: { rate: 2.8, commit: 0.6 }, poseScale: 1.35, chance: 0.6,
      hits: [{ startup: 0.9, active: 0.14, follow: 0.06 }, { startup: 0.3, active: 0.14, follow: 0.06 }, { startup: 0.3, active: 0.14, follow: 0.12 }], recovery: 0.5,
      followUps: [{ attack: 'flameBlade', if: 'far', chance: 0.9 }, { attack: 'flameLeap', chance: 0.85 }],
      damage: 24, poise: 35, knock: 6, lunge: 0.6, range: 4.2, box: { w: 6.8, h: 2.0, d: 6.8, fwd: 0, y: 1.1 } },
    // Two spinning fire vortices, faster than the wind blades.
    { id: 'flameBlade', name: 'Flaming Storm Blade', anim: 'sweep', pose: 'godrickBlade', noParry: true, tracking: { rate: 3.2, commit: 0.85 }, poseScale: 1.25, chance: 0,
      projectile: { speed: 19, gravity: 0, size: 0.7, look: 'slash' },
      hits: [{ startup: 0.5, active: 0.05, follow: 0.12 }, { startup: 0.45, active: 0.05, follow: 0.3 }], recovery: 0.9,
      damage: 30, poise: 40, knock: 6, lunge: 0, range: 22, box: { w: 1, h: 1, d: 1, fwd: 1, y: 1.0 } },
    // The leaping slam, burning: a ring of fire bursts from where it lands. Still the big opening.
    { id: 'flameLeap', name: 'Flaming Leap Slam', anim: 'chop', pose: 'godrickLeapRing', noParry: true, tracking: { rate: 2.4, commit: 0.5 }, poseScale: 1.45, chance: 0,
      hits: [{ startup: 1.15, active: 0.16, follow: 0.2, leap: { from: 0.3, max: 11, short: 1.6 }, impact: { ring: 5.0, crack: 2.6, dust: 26, shake: 0.2 } },
             { startup: 0.05, active: 0.18, follow: 0.5, box: RING(1.5, 6.5, 1.6) }],
      recovery: 1.8, damage: 60, poise: 90, knock: 11, lunge: 0, range: 11, box: { w: 3.0, h: 2.6, d: 4.4, fwd: 1.8, y: 1.0 } },
    // Kneel in three: small, medium, then a blast across most of the arena. Recovery only after the third.
    { id: 'flameKneel', name: 'Flaming "Kneel!"', anim: 'stomp', pose: 'godrickKneel3', noParry: true, rollOnly: true, tracking: { rate: 1.8, commit: 0.5 }, poseScale: 1.35, chance: 0.45,
      hits: [{ startup: 1.3, active: 0.18, follow: 0.15, box: RING(0.8, 4, 1.4), impact: { ring: 3.0, crack: 1.6, dust: 14, shake: 0.12 } },
             { startup: 0.75, active: 0.18, follow: 0.15, box: RING(1.2, 8, 1.8), impact: { ring: 4.5, crack: 2.0, dust: 18, shake: 0.15 } },
             { startup: 0.95, active: 0.2, follow: 0.5, box: RING(1.5, 13, 2.4), impact: { ring: 7.0, crack: 3.0, dust: 30, shake: 0.24 } }],
      recovery: 2.0, damage: 34, poise: 60, knock: 10, lunge: 0, range: 4.4, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true } },
    // He walks forward with the dragon's mouth down, the ground ahead in flames, and flicks the fire up to end.
    // Step round his sides: the stream is only ahead.
    { id: 'fireMarch', name: 'Fire March', anim: 'bash', pose: 'godrickMarch', noParry: true, tracking: { rate: 1.6, commit: 1 }, poseScale: 1.2, chance: 0.4,
      breath: { len: 6, width: 2.2 },
      hits: [{ startup: 1.0, active: 0.14, follow: 0.1 }, { startup: 0.3, active: 0.14, follow: 0.1 }, { startup: 0.3, active: 0.14, follow: 0.1 },
             { startup: 0.3, active: 0.14, follow: 0.1 }, { startup: 0.45, active: 0.14, follow: 0.4, box: { w: 2.6, h: 3.4, d: 4.4, fwd: 2.8, y: 1.7 } }],
      recovery: 1.1, damage: 14, poise: 20, knock: 3, lunge: 1.4, range: 6, box: { w: 2.8, h: 1.4, d: 5.0, fwd: 3.2, y: 0.6 } },
  ],
};
