'use strict';
// Arena menu order. New enemies can go anywhere: levels refer to them by id.
const ENEMY_DEFS = [
  {
    id: 'hollow', name: 'Hollow Soldier', description: 'A shambling swordsman. Readable, honest, a fair first duel.',
    scale: 1.0, bulk: 1.0, radius: 0.4, color: 0x8a6a45, weapon: 'sword', idle: 'guard',
    visual: { skin: 0xa39d8f, bareArms: true, roughness: 0.85 },   // ashen, leathery
    hp: 110, poise: 50, speed: 2.7, turnRate: 5, trackRate: 2.2, holdRange: 2.4,
    cooldown: [0.45, 1.0], flinchTime: 0.24, staggerTime: 1.1, parriedTime: 1.7,
    attacks: [
      { id: 'swing', name: 'Sword Swing', anim: 'sweep', hits: [{ startup: 0.62, active: 0.14 }], recovery: 0.65,
        damage: 20, poise: 20, knock: 4, lunge: 1.6, range: 1.9,
        box: { w: 2.0, h: 1.4, d: 2.0, fwd: 1.3, y: 1.1 } },
      { id: 'overhead', name: 'Overhead Strike', anim: 'overhead', hits: [{ startup: 1.0, active: 0.14 }], recovery: 1.05,
        damage: 34, poise: 40, knock: 6, lunge: 2.0, range: 2.0,
        box: { w: 0.9, h: 2.4, d: 2.3, fwd: 1.4, y: 1.2 } },
    ],
  },
  {
    id: 'knight', name: 'Undead Knight', description: 'Slow, armored, patient. Its greatsword ends careless fights.',
    scale: 1.3, bulk: 1.3, radius: 0.6, color: 0x7b8088, weapon: 'sword', offhand: 'shield', idle: 'still',
    visual: { skin: 0x6e737a, skinMetal: 0.2, metal: 0.3, roughness: 0.5 },   // worn steel, helmed
    hp: 240, poise: 120, speed: 1.9, turnRate: 3.2, trackRate: 1.2, holdRange: 2.9,
    cooldown: [0.7, 1.4], flinchTime: 0, staggerTime: 1.2, parriedTime: 1.8,
    // Stagger meter (shown under its health bar), replacing poise: hits never interrupt it until the meter
    // fills (about 2 hits: 2 heavy, heavy + light, or 3 light), then it kneels, open, for `breakTime`.
    // Drains at `decay`/s once `decayDelay` s pass without a hit.
    stagger: { max: 100, heavy: 60, light: 45, breakers: ['heavy', 'jumpHeavy'], decayDelay: 2.5, decay: 14,
               breakTime: 2.0, hitstop: 0.14 },
    attacks: [
      { id: 'slam', name: 'Greatsword Slam', anim: 'overhead', hits: [{ startup: 1.4, active: 0.18 }], recovery: 1.35,
        damage: 58, poise: 85, knock: 9, lunge: 1.4, range: 2.8,
        box: { w: 1.5, h: 3.0, d: 3.2, fwd: 2.0, y: 1.5 } },
      { id: 'bash', name: 'Shield Bash', anim: 'bash', hits: [{ startup: 0.5, active: 0.12 }], recovery: 0.7,
        damage: 16, poise: 34, knock: 11, lunge: 4.0, range: 1.6,
        box: { w: 1.5, h: 1.6, d: 1.4, fwd: 1.2, y: 1.3 } },
    ],
  },
  {
    id: 'rogue', name: 'Fast Rogue', description: 'Quick and fragile. Blink and it has already cut you twice.',
    scale: 0.85, bulk: 0.8, radius: 0.32, color: 0x2f5234, weapon: 'sword', idle: 'twitch',
    visual: { skin: 0xbab29e, roughness: 0.8 },   // pale face, dark cloth
    hp: 65, poise: 25, speed: 4.7, turnRate: 9, trackRate: 4, holdRange: 2.3,
    cooldown: [0.3, 0.75], flinchTime: 0.26, staggerTime: 1.0, parriedTime: 1.6,
    attacks: [
      { id: 'stab', name: 'Quick Stab', anim: 'stab', hits: [{ startup: 0.38, active: 0.1 }], recovery: 0.45,
        damage: 13, poise: 12, knock: 3, lunge: 5.0, range: 2.1,
        box: { w: 0.7, h: 1.2, d: 2.0, fwd: 1.3, y: 1.0 } },
      { id: 'doubleSlash', name: 'Double Slash', anim: 'sweep', hits: [{ startup: 0.42, active: 0.09 }, { startup: 0.26, active: 0.09 }],
        recovery: 0.62, damage: 10, poise: 11, knock: 2.5, lunge: 2.6, range: 1.7,
        box: { w: 1.7, h: 1.2, d: 1.7, fwd: 1.1, y: 1.0 } },
    ],
  },
  {
    id: 'giant', name: 'Giant Skeleton', description: 'A towering ruin of bone. Every blow is a catastrophe.',
    scale: 2.3, bulk: 1.2, radius: 0.95, color: 0xb9b3a0, weapon: 'club', idle: 'sway',
    visual: { skin: 0xcfc8b2, bareArms: true, roughness: 0.75, rim: 0.8 },   // bone
    hp: 480, poise: 220, speed: 1.4, turnRate: 2.2, trackRate: 0.8, holdRange: 3.6,
    cooldown: [0.9, 1.7], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0,
    // Boss posture: replaces poise interrupts (hits never cancel its swings). Only chained hits build it;
    // each attack's postureDmg says how much. A parry adds `parry`.
    posture: { max: 100, parry: 38, chainGap: 1.8, decay: 7, breakTime: 3.2, damageMul: 1.6, hitstop: 0.2 },
    attacks: [
      { id: 'sweep', name: 'Club Sweep', anim: 'sweep', hits: [{ startup: 1.65, active: 0.24 }], recovery: 1.55,
        damage: 62, poise: 95, knock: 12, lunge: 0.6, range: 3.6,
        box: { w: 7.0, h: 2.2, d: 4.6, fwd: 2.4, y: 1.3 } },
      { id: 'stomp', name: 'Stomp', anim: 'stomp', hits: [{ startup: 1.3, active: 0.2 }], recovery: 1.25,
        damage: 46, poise: 75, knock: 8, lunge: 0, range: 2.4,
        box: { w: 5.6, h: 0.8, d: 5.6, fwd: 0.6, y: 0.4 } },
    ],
  },
  {
    id: 'warden', name: 'Shield Warden', description: 'Hides behind a great shield. Circle it, parry it, or batter its guard down.',
    scale: 1.12, bulk: 1.15, radius: 0.48, color: 0x56636e, weapon: 'sword', offhand: 'kite', idle: 'still',
    visual: { skin: 0x5c6670, skinMetal: 0.15, metal: 0.25, roughness: 0.55 },   // blued steel, helmed
    hp: 140, poise: 85, speed: 2.2, turnRate: 2.6, trackRate: 1.5, holdRange: 2.5,
    cooldown: [0.6, 1.2], flinchTime: 0.2, staggerTime: 1.15, parriedTime: 1.75,
    // Shield guard: hits from within `arc` (rad) of its facing are blocked (taking `damageMul` of the damage)
    // while the shield is up: not attacking, and not within `lowerReach` of striking range with an attack chosen.
    // Every hit, blocked or not, fills a visible guard meter instead of poise: `heavy` for a `breakers`
    // attack, `light` otherwise. At `max` the guard breaks (2 heavy, 1 heavy + 2 light, or 3 light).
    // Hits taken on the shield fill only `blockedMul` of that, so flanking or punishing swings breaks it far faster.
    // The meter drains at `decay`/s once `decayDelay` s pass without a hit.
    guard: { arc: 0.9, damageMul: 0.35, knockMul: 0.3, lowerReach: 1.0, blockedMul: 0.4, breakers: ['heavy', 'jumpHeavy'],
             max: 100, heavy: 50, light: 34, decayDelay: 2.5, decay: 12, breakTime: 2.4, hitstop: 0.14 },
    attacks: [
      { id: 'wardenSwing', name: 'Sword Swing', anim: 'sweep', hits: [{ startup: 0.75, active: 0.14 }], recovery: 0.8,
        damage: 26, poise: 30, knock: 5, lunge: 1.8, range: 2.2,
        box: { w: 2.2, h: 1.5, d: 2.2, fwd: 1.4, y: 1.1 } },
      { id: 'wardenBash', name: 'Shield Bash', anim: 'bash', hits: [{ startup: 0.55, active: 0.12 }], recovery: 0.75,
        damage: 18, poise: 40, knock: 10, lunge: 3.6, range: 1.7,
        box: { w: 1.6, h: 1.7, d: 1.5, fwd: 1.2, y: 1.2 } },
    ],
  },
];

// Training dummies (tutorial only): same humanoid primitives. They never move or aggro, never die,
// stagger or lose poise. The sparring dummy repeats one slow, telegraphed swing.
const TRAINING_DEFS = [
  { id: 'dummy', name: 'Training Dummy', scale: 1.0, bulk: 1.05, radius: 0.42, color: 0x7a6440, weapon: 'none', visual: { skin: 0x8a7650, roughness: 0.95 },
    hp: 300, poise: Infinity, flinchTime: 0, parriedTime: 1.6, attacks: [] },
  { id: 'sparringDummy', name: 'Sparring Dummy', scale: 1.0, bulk: 1.05, radius: 0.42, color: 0x6a5446, weapon: 'sword', visual: { skin: 0x8a7650, roughness: 0.95 },
    hp: 300, poise: Infinity, flinchTime: 0, parriedTime: 1.6, restTime: 1.3,
    attacks: [
      { id: 'trainingSwing', name: 'Training Swing', anim: 'overhead', hits: [{ startup: 1.3, active: 0.16 }], recovery: 0.9,
        damage: 8, poise: 10, knock: 2, lunge: 0, range: 3, box: { w: 1.2, h: 2.4, d: 2.4, fwd: 1.4, y: 1.2 } },
    ] },
];
const ENEMY_BY_ID = Object.fromEntries([...ENEMY_DEFS, ...TRAINING_DEFS].map(d => [d.id, d]));
