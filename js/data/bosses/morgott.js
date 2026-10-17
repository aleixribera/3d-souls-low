'use strict';
// ============================================================================
// Elden Ring Bosses: Morgott, the Omen King (v5.5)
// ============================================================================
// Everything that makes Morgott lives here: his key poses, his model and his moveset. The boss list (js/data/elden-bosses.js)
// names him; the mode (js/elden.js) fights him in the Enemies arena. Reference: docs/morgott.txt.
//
// Conversion (all tuning is in MORGOTT below). The player has 120 HP, a light hit does 18, a heavy 53, a roll is
// invulnerable for 0.3 s. Elden Ring's bosses come down to this game's scale against each other, not by a fixed factor:
// Margit (ER 4174 HP) is 3200 here, Godrick (ER 6080) 4000. Morgott (ER 10399) is the hardest of the three, so:
//   - one bar of 4800 HP (about 1.2x Godrick, 1.5x Margit: ~90 light hits, a long duel); at 60 % (2880 HP left) the
//     second phase starts on the same bar (`at`), opening with the Defilement Burst;
//   - posture 150 and a parry adds 50: three parries break his stance (the reference's "3 parries"; Margit takes two);
//   - damage a step above Margit (ER Morgott hits ~15 % harder): sword 26-48, golden weapons 36-62, daggers 17-19,
//     bloodflame 50-66. The relative order of the reference holds: hammer and bloodflame dashes hardest, the flurry's cuts
//     and the daggers lightest;
//   - the Cursed Greatsword's physical blows can be parried (they glint); every golden conjuration, the tail, the
//     bloodflame and the burst cannot (`noParry`), but can be blocked; every strike's `active` stays at or under 0.2 s.

// ---- key poses (js/data/attack-poses.js format), built from the shared ones ----------------------------------------------
{
  const A = ATTACK_POSES, h = id => A[id].hits[0];
  ATTACK_POSES.morgottChopThrust = { hits: [h('heavyOverhead'), h('enemyThrust')] };
  ATTACK_POSES.morgottFlurry = { hits: [h('enemySpin'), h('lightBackhand'), h('enemySpin'), h('hollowOverhead')] };
  ATTACK_POSES.morgottSweepSlash = { hits: [h('hollowSwing'), h('lightBackhand')] };
  ATTACK_POSES.morgottHammerLeap = { hits: [h('heavyOverhead'), h('enemyStomp')] };
  ATTACK_POSES.morgottDaggerFan = { hits: [h('lightOverhead'), h('lightOverhead'), h('lightOverhead')] };
  ATTACK_POSES.morgottSpearCharge = { hits: [h('enemyThrust'), h('enemyThrust'), h('hollowOverhead')] };
  ATTACK_POSES.morgottRain = { hits: [h('heavyOverhead'), h('enemyStomp'), h('enemyStomp'), h('enemyStomp'), h('enemyStomp')] };
  ATTACK_POSES.morgottBloodSlice = { hits: [h('hollowSwing'), h('enemyStomp')] };
  ATTACK_POSES.morgottBurst = { hits: [h('enemyStomp'), h('enemyStomp')] };
}

// ---- model: Margit's body (the same Omen, a king's darker rags), the Cursed Greatsword in place of the cane ------------
MODEL_DEFS.morgott = {
  extends: 'margit',
  materials: {
    ...MODEL_DEFS.margit.materials,
    robe: { tex: 'margitBurlap', tint: 0x9a8a7a, decay: 0.75, size: 512, double: true },
    hood: { tex: 'margitBurlap', tint: 0x8a7464, decay: 0.8, size: 512, double: true },
    rags: { tex: 'margitRags', tint: 0x9a7a70, decay: 0.85, size: 512, double: true },
    ragsDark: { tex: 'margitRags', tint: 0x5a4440, decay: 0.9, size: 512, double: true },
    blade: { tex: 'rustedIron', tint: 0x5a4a44, decay: 0.85 },
    leather: { tex: 'margitBurlap', tint: 0x4a3a30, decay: 0.6 },
  },
  weapon: { use: 'greatSword', slots: { blade: 'blade', grip: 'leather', guard: 'iron' } },
};

// ---- the boss -----------------------------------------------------------------------------------------------------------
const morgottGlint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
const MORGOTT_RING = (from, to, width) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time: 0.18 } });
const MORGOTT = {
  id: 'morgott', model: 'morgott', name: 'Morgott, the Omen King',
  description: 'The Omen King, Margit\'s true self: a cursed greatsword, golden spears, hammers and daggers, and at 60% his own cursed blood set alight.',
  scale: 1.95, bulk: 1.2, radius: 0.78, color: 0x3e3830, weapon: 'spear', idle: 'sway',
  visual: { skin: 0x8a8274, roughness: 0.75, rim: 0.9 },
  hp: 4800, poise: 260, speed: 2.7, turnRate: 3.3, trackRate: 1.7, approach: 0.55, kite: 0.15,
  cooldown: [1.0, 2.0], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 6,
  posture: { max: 150, parry: 50, chainGap: 1.8, chainMul: 1.35, decay: 4, breakTime: 3.2, hitstop: 0.2 },
  defaultPhases: ['king', 'cursed'],
  phases: {
    // Phase 1: the cursed greatsword, the golden spear, hammer, curved sword and daggers, the rain of swords, the tail.
    king: { hp: 4800,
      attacks: ['chopThrust', 'swordFlurry', 'hammerLeap', 'hammerSweep', 'sweepSlash', 'spearCharge', 'spearThrow', 'swordRain',
                'daggerFan', 'daggerRetreat', 'daggerPunish', 'leapPunish', 'tailSwipe', 'daggerSlash'] },
    // Phase 2 (at 60 %): the Defilement Burst, then bloodflame on the blade; he attacks sooner and presses harder.
    cursed: { at: 0.6, opener: 'defilement', ignite: true, cooldown: [0.7, 1.5], approach: 0.8, kite: 0.05, speed: 3.0, trackRate: 2.1,
      attacks: ['chopThrust', 'swordFlurry', 'hammerLeap', 'hammerSweep', 'sweepSlash', 'spearCharge', 'spearThrow', 'swordRain',
                'daggerFan', 'daggerRetreat', 'daggerPunish', 'leapPunish', 'tailSwipe', 'daggerSlash', 'defilement',
                'bloodSlice', 'bloodyThrust', 'geysers'] },
  },
  attacks: [
    // ---- the Cursed Greatsword (parryable) ----------------------------------------------------------------------------
    // A long-delayed overhead chop, a step and a thrust. Roll behind during the chop and the tail answers.
    { id: 'chopThrust', name: 'Overhead Chop, Thrust', anim: 'chop', pose: 'morgottChopThrust', tracking: { rate: 2.2, commit: 0.6 }, markers: morgottGlint(0, 1), poseScale: 1.35,
      hits: [{ startup: 1.4, active: 0.14, follow: 0.2, hold: { at: 0.5, time: [0.3, 0.9], chance: 0.65 }, box: { w: 1.8, h: 3.0, d: 3.8, fwd: 2.2, y: 1.2 },
               impact: { ring: 2.4, crack: 1.2, dust: 10, shake: 0.1 } },
             { startup: 0.55, active: 0.13, follow: 0.35, box: { w: 1.2, h: 1.4, d: 3.8, fwd: 2.3, y: 1.1 } }],
      recovery: 1.0, followUps: [{ attack: 'tailSwipe', if: 'behind', chance: 0.9 }],
      damage: 44, poise: 70, knock: 8, lunge: 2.2, range: 3.6, box: { w: 1.8, h: 3.0, d: 3.8, fwd: 2.2, y: 1.2 } },
    // The 4-hit flurry: greatsword and a conjured curved sword, advancing, ending in an overhead cross-chop. The golden
    // cuts cannot be parried, and parry is per attack, so none of it can (the reference's physical cuts could).
    { id: 'swordFlurry', name: 'Cursed Sword Flurry', anim: 'spin', pose: 'morgottFlurry', spectral: 'sword', noParry: true, tracking: { rate: 3.0, commit: 0.7 }, poseScale: 1.25, chance: 0.5,
      hits: [{ startup: 0.8, active: 0.13, follow: 0.08 }, { startup: 0.45, active: 0.13, follow: 0.08 }, { startup: 0.55, active: 0.13, follow: 0.1 },
             { startup: 0.9, active: 0.15, follow: 0.45, box: { w: 2.4, h: 3.0, d: 3.6, fwd: 2.0, y: 1.0 }, impact: { ring: 2.6, crack: 1.4, dust: 12, shake: 0.12 } }],
      recovery: 1.3, damage: 26, poise: 40, knock: 5, lunge: 2.2, range: 3.4, box: { w: 4.6, h: 1.8, d: 3.6, fwd: 1.6, y: 1.1 } },
    // ---- the golden hammer (holy, blockable, not parryable) ------------------------------------------------------------
    // Leaps high, tracks, drives the hammer down with a holy shockwave; stuck in the ground after: a major opening.
    { id: 'hammerLeap', name: 'Golden Hammer Leaping Slam', anim: 'chop', pose: 'morgottHammerLeap', spectral: 'hammer', noParry: true, tracking: { rate: 2.4, commit: 0.5 }, poseScale: 1.4, minRange: 4, chance: 0.35,
      hits: [{ startup: 1.6, active: 0.16, follow: 0.3, leap: { from: 0.4, max: 13, short: 1.2 }, impact: { ring: 6.0, crack: 2.8, dust: 26, shake: 0.2 } },
             { startup: 0.05, active: 0.18, follow: 0.6, box: MORGOTT_RING(1.5, 8, 1.6) }],
      recovery: 1.9, damage: 62, poise: 95, knock: 11, lunge: 0, range: 13, box: { w: 5.0, h: 2.4, d: 5.0, fwd: 0.8, y: 1.0 } },
    // The hammer on his shoulder, a low sweep from his right; weaves into a sword slash or a leap back.
    { id: 'hammerSweep', name: 'Golden Hammer Sweep', anim: 'sweep', pose: 'hollowSwing', spectral: 'hammer', noParry: true, tracking: { rate: 2.6, commit: 0.6 }, poseScale: 1.3, chance: 0.4,
      hits: [{ startup: 1.0, active: 0.15, follow: 0.2 }], recovery: 0.6,
      followUps: [{ attack: 'sweepSlash', if: 'near', chance: 0.6 }, { attack: 'daggerRetreat', chance: 0.3 }],
      damage: 40, poise: 70, knock: 9, lunge: 1.4, range: 3.8, box: { w: 5.6, h: 1.4, d: 3.8, fwd: 1.6, y: 0.7 } },
    // The sweep's branch: a quick greatsword backhand, then a cut (parryable).
    { id: 'sweepSlash', name: 'Greatsword Slashes', anim: 'sweep', pose: 'morgottSweepSlash', tracking: { rate: 3.0, commit: 0.6 }, markers: morgottGlint(0, 1), poseScale: 1.2,
      hits: [{ startup: 0.6, active: 0.13, follow: 0.1 }, { startup: 0.5, active: 0.13, follow: 0.3 }], recovery: 0.9,
      damage: 30, poise: 45, knock: 6, lunge: 2.2, range: 3.4, box: { w: 3.8, h: 1.8, d: 3.4, fwd: 1.8, y: 1.2 } },
    // ---- the golden spear: mid range a running charge, far away the javelin ------------------------------------------
    { id: 'spearCharge', name: 'Golden Spear Charge', anim: 'thrust', pose: 'morgottSpearCharge', spectral: 'spear', noParry: true, tracking: { rate: 2.6, commit: 0.55 }, poseScale: 1.2,
      minRange: 4, dash: { speed: 9, from: 0.35 }, chance: 0.4,
      hits: [{ startup: 1.0, active: 0.13, follow: 0.05 }, { startup: 0.3, active: 0.13, follow: 0.05 }, { startup: 0.5, active: 0.15, follow: 0.5, box: { w: 1.4, h: 2.6, d: 4.2, fwd: 2.6, y: 1.2 } }],
      recovery: 1.7, damage: 34, poise: 55, knock: 8, lunge: 3.0, range: 9, box: { w: 1.4, h: 1.6, d: 4.4, fwd: 2.6, y: 1.1 } },
    { id: 'spearThrow', name: 'Golden Spear Javelin', anim: 'overhead', pose: 'heavyOverhead', spectral: 'spear', tracking: { rate: 2.8, commit: 0.85 }, poseScale: 1.2, minRange: 9, chance: 0.4,
      projectile: { speed: 28, gravity: 0, size: 0.3, look: 'dagger' },
      hits: [{ startup: 1.1, active: 0.05, follow: 0.15 }], recovery: 0.7,
      damage: 40, poise: 50, knock: 7, lunge: 0, range: 26, box: { w: 0.6, h: 0.6, d: 0.6, fwd: 0.6, y: 1.6 } },
    // ---- the rain of swords (holy): channelled, then golden swords fall in a line ahead of him ------------------------
    { id: 'swordRain', name: 'Rain of Swords', anim: 'chop', pose: 'morgottRain', spectral: 'sword', noParry: true, tracking: { rate: 2.0, commit: 0.4 }, poseScale: 1.2, chance: 0.2, minRange: 3,
      hits: [{ startup: 1.5, active: 0.12, follow: 0.1, box: { w: 2.2, h: 3, d: 2.2, fwd: 2.5, y: 1.0 }, impact: { ring: 1.6, crack: 0.8, dust: 8, shake: 0.05 } },
             { startup: 0.3, active: 0.12, follow: 0.1, box: { w: 2.2, h: 3, d: 2.2, fwd: 5, y: 1.0 }, impact: { ring: 1.6, crack: 0.8, dust: 8, shake: 0.05 } },
             { startup: 0.3, active: 0.12, follow: 0.1, box: { w: 2.2, h: 3, d: 2.2, fwd: 7.5, y: 1.0 }, impact: { ring: 1.6, crack: 0.8, dust: 8, shake: 0.05 } },
             { startup: 0.3, active: 0.12, follow: 0.1, box: { w: 2.2, h: 3, d: 2.2, fwd: 10, y: 1.0 }, impact: { ring: 1.6, crack: 0.8, dust: 8, shake: 0.05 } },
             { startup: 0.3, active: 0.12, follow: 0.2, box: { w: 2.2, h: 3, d: 2.2, fwd: 12.5, y: 1.0 }, impact: { ring: 1.6, crack: 0.8, dust: 8, shake: 0.05 } }],
      recovery: 0.6, damage: 36, poise: 50, knock: 6, lunge: 0, range: 13, box: { w: 2.2, h: 3, d: 2.2, fwd: 2.5, y: 1.0 } },
    // ---- the Erdsteel daggers (thrown daggers are bolts: blockable, never parried) ------------------------------------
    { id: 'daggerFan', name: 'Erdsteel Dagger Flurry', anim: 'overhead', pose: 'morgottDaggerFan', spectral: 'dagger', tracking: { rate: 3.2, commit: 0.9 }, minRange: 4, chance: 0.3,
      projectile: { speed: 23, gravity: 0, size: 0.16, look: 'dagger' },
      hits: [{ startup: 0.7, active: 0.05, follow: 0.08 }, { startup: 0.25, active: 0.05, follow: 0.08 }, { startup: 0.25, active: 0.05, follow: 0.12 }], recovery: 0.3,
      damage: 17, poise: 20, knock: 3, lunge: 0, range: 22, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.4 } },
    // Too close: a backward leap, a dagger thrown on the way. No opening.
    { id: 'daggerRetreat', name: 'Dagger Retreat', anim: 'overhead', pose: 'lightOverhead', spectral: 'dagger', tracking: { rate: 3, commit: 0.6 }, chance: 0.2,
      projectile: { speed: 23, gravity: 0, size: 0.16, look: 'dagger' },
      hits: [{ startup: 0.65, active: 0.05, follow: 0.15, leap: { from: 0.2, max: 5, back: 5 } }], recovery: 0.3,
      damage: 17, poise: 20, knock: 3, lunge: 0, range: 2.6, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.4 } },
    // Drinking a flask at range: a dagger at once, or a leaping gap-closer (the reference's input read).
    { id: 'daggerPunish', name: 'Dagger Toss', anim: 'overhead', pose: 'lightOverhead', spectral: 'dagger', when: 'healing', tracking: { rate: 3.4, commit: 0.85 }, minRange: 4, chance: 2,
      projectile: { speed: 25, gravity: 0, size: 0.16, look: 'dagger' },
      hits: [{ startup: 0.55, active: 0.05, follow: 0.12 }], recovery: 0.35,
      damage: 19, poise: 20, knock: 3, lunge: 0, range: 22, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.4 } },
    { id: 'leapPunish', name: 'Leaping Slash', anim: 'chop', pose: 'hollowOverhead', when: 'healing', tracking: { rate: 2.6, commit: 0.5 }, markers: morgottGlint(0), poseScale: 1.3, minRange: 4, chance: 1.2,
      hits: [{ startup: 1.1, active: 0.14, follow: 0.4, leap: { from: 0.35, max: 11, short: 1.6 } }], recovery: 1.2,
      damage: 40, poise: 70, knock: 8, lunge: 0, range: 12, box: { w: 2.4, h: 2.4, d: 3.6, fwd: 1.6, y: 1.0 },
      impact: { ring: 2.6, crack: 1.4, dust: 14, shake: 0.1 } },
    // Close at his left: an instant golden dagger slash.
    { id: 'daggerSlash', name: 'Spectral Dagger Slash', anim: 'sweep', pose: 'lightBackhand', spectral: 'dagger', noParry: true, when: 'flank', tracking: { rate: 4, commit: 0.7 }, chance: 1.6,
      hits: [{ startup: 0.45, active: 0.12, follow: 0.14 }], recovery: 0.55,
      damage: 22, poise: 30, knock: 4, lunge: 2.2, range: 3.0, box: { w: 3.0, h: 1.6, d: 2.6, fwd: 1.3, y: 1.1 } },
    // Behind his hips: the tail sweeps his rear arc.
    { id: 'tailSwipe', name: 'Tail Swipe', anim: 'spin', pose: 'enemySpin', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 4,
      hits: [{ startup: 0.5, active: 0.14, follow: 0.3 }], recovery: 0.7,
      damage: 26, poise: 40, knock: 8, lunge: 0, range: 3.4, box: { w: 4.6, h: 1.2, d: 3.0, fwd: -1.4, y: 0.6 } },
    // ---- phase 2: cursed bloodflame (unparryable) ------------------------------------------------------------------
    // The change: kneels, choking (untouchable, ~3 s), then a 360° burst and a ring of geysers. Run before it goes off.
    { id: 'defilement', name: 'Defilement Burst', anim: 'stomp', pose: 'morgottBurst', noParry: true, invulnerable: true, tracking: { rate: 0.6, commit: 0.2 }, poseScale: 1.2, chance: 0,
      hits: [{ startup: 3.0, active: 0.18, follow: 0.3, box: MORGOTT_RING(0, 6, 6), impact: { ring: 6.0, crack: 3.0, dust: 30, shake: 0.25 } },
             { startup: 0.5, active: 0.18, follow: 0.6, box: MORGOTT_RING(5, 11, 1.6), impact: { ring: 4.0, crack: 1.6, dust: 18, shake: 0.12 } }],
      recovery: 0.8, damage: 50, poise: 80, knock: 12, lunge: 0, range: 6, box: MORGOTT_RING(0, 6, 6) },
    // Winds back, dashes, sweeps; the cut's path bursts again a moment later. A major opening after the second burst.
    { id: 'bloodSlice', name: 'Cursed Blood Slice', anim: 'sweep', pose: 'morgottBloodSlice', noParry: true, tracking: { rate: 2.6, commit: 0.55 }, poseScale: 1.3,
      minRange: 3, dash: { speed: 12, from: 0.5 }, chance: 0.45,
      hits: [{ startup: 1.1, active: 0.15, follow: 0.2, box: { w: 5.0, h: 1.8, d: 3.6, fwd: 1.8, y: 1.0 } },
             { startup: 0.55, active: 0.18, follow: 0.5, box: { w: 5.6, h: 2.4, d: 4.6, fwd: 1.4, y: 1.0 }, impact: { ring: 4.0, crack: 2.0, dust: 22, shake: 0.18 } }],
      recovery: 1.9, damage: 58, poise: 90, knock: 10, lunge: 2.0, range: 10, box: { w: 5.0, h: 1.8, d: 3.6, fwd: 1.8, y: 1.0 } },
    // Braced, sword forward, a straight dash: impales (heavy damage). Sidestep the line and he is wide open.
    { id: 'bloodyThrust', name: 'Bloody Thrust', anim: 'thrust', pose: 'enemyThrust', noParry: true, rollOnly: true, tracking: { rate: 2.8, commit: 0.75 }, poseScale: 1.25,
      minRange: 4, dash: { speed: 14, from: 0.55 }, chance: 0.35,
      hits: [{ startup: 1.2, active: 0.16, follow: 0.6 }], recovery: 1.9,
      damage: 66, poise: 100, knock: 12, lunge: 3.0, range: 11, box: { w: 1.4, h: 1.6, d: 4.4, fwd: 2.6, y: 1.1 } },
    // The pools of cursed blood: geysers erupt round him, then further out.
    { id: 'geysers', name: 'Blood Geysers', anim: 'stomp', pose: 'morgottBurst', noParry: true, tracking: { rate: 1.2, commit: 0.4 }, poseScale: 1.2, chance: 0.25,
      hits: [{ startup: 1.2, active: 0.18, follow: 0.2, box: MORGOTT_RING(1, 5, 1.8), impact: { ring: 3.5, crack: 1.6, dust: 16, shake: 0.1 } },
             { startup: 0.6, active: 0.18, follow: 0.5, box: MORGOTT_RING(5, 10, 1.8), impact: { ring: 4.0, crack: 1.6, dust: 16, shake: 0.1 } }],
      recovery: 1.0, damage: 34, poise: 50, knock: 8, lunge: 0, range: 5, box: MORGOTT_RING(1, 5, 1.8) },
  ],
};
