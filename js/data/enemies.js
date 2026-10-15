'use strict';
// Arena menu order. New enemies can go anywhere: levels refer to them by id.
const ENEMY_DEFS = [
  {
    id: 'hollow', name: 'Hollow Soldier', description: 'A shambling swordsman. Readable, honest, a fair first duel.',
    scale: 1.0, bulk: 1.0, radius: 0.4, color: 0x8a6a45, weapon: 'sword', idle: 'guard',
    visual: { skin: 0xa39d8f, bareArms: true, roughness: 0.85 },   // ashen, leathery
    hp: 110, poise: 50, speed: 2.7, turnRate: 5, trackRate: 2.2,
    cooldown: [0.63, 1.4], flinchTime: 0.24, staggerTime: 1.1, parriedTime: 1.7,
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
    hp: 240, poise: 120, speed: 1.9, turnRate: 3.2, trackRate: 1.2,
    cooldown: [0.98, 1.96], flinchTime: 0, staggerTime: 1.2, parriedTime: 1.8,
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
    hp: 65, poise: 25, speed: 4.7, turnRate: 9, trackRate: 4,
    cooldown: [0.42, 1.05], flinchTime: 0.26, staggerTime: 1.0, parriedTime: 1.6,
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
    hp: 480, poise: 220, speed: 1.4, turnRate: 2.2, trackRate: 0.8,
    cooldown: [1.26, 2.38], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0,
    // Boss posture: replaces poise interrupts (hits never cancel its swings). Every landed hit builds it by the
    // attack's postureDmg, times `chainMul` when it lands within `chainGap` s of the previous one. A parry adds
    // `parry`. It drains at `decay`/s once `chainGap` s pass without a hit.
    posture: { max: 100, parry: 38, chainGap: 1.8, chainMul: 1.5, decay: 10, breakTime: 3.2, damageMul: 1.6, hitstop: 0.2 },
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
    hp: 140, poise: 85, speed: 2.2, turnRate: 2.6, trackRate: 1.5,
    cooldown: [0.84, 1.68], flinchTime: 0.2, staggerTime: 1.15, parriedTime: 1.75,
    // Shield guard: hits from within `arc` (rad) of its facing are blocked (taking `damageMul` of the damage)
    // while the shield is up: not attacking, and not stepping in to strike within `lowerReach` of its shortest reach.
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
  // ---- the Tower's enemies (Level 4; the Lancer, Duelist and Bowman first appear in Level 3, the town) ----------------------------------------------------------------------------
  {
    id: 'lancer', name: 'Ashen Lancer', description: 'A spearman who closes distance in one lunge. Stay close and punish its slow jab.',
    scale: 1.05, bulk: 0.95, radius: 0.42, color: 0x6a6258, weapon: 'spear', idle: 'guard',
    visual: { skin: 0x9a948a, roughness: 0.8 },   // ashen, hooded
    hp: 150, poise: 55, speed: 3.0, turnRate: 5, trackRate: 2.0,
    cooldown: [0.7, 1.54], flinchTime: 0.24, staggerTime: 1.1, parriedTime: 1.7,
    attacks: [
      { id: 'lancerDash', name: 'Dashing Thrust', anim: 'thrust', minRange: 4, dash: { speed: 10, from: 0.45 },
        hits: [{ startup: 0.9, active: 0.16 }], recovery: 0.85, damage: 26, poise: 34, knock: 6, lunge: 3, range: 9,
        box: { w: 0.8, h: 1.2, d: 3.0, fwd: 1.8, y: 1.1 } },
      { id: 'lancerJab', name: 'Jab', anim: 'stab', hits: [{ startup: 0.45, active: 0.1 }], recovery: 0.8,   // long recovery: the opening
        damage: 14, poise: 18, knock: 3, lunge: 2.5, range: 2.8, box: { w: 0.7, h: 1.1, d: 2.8, fwd: 1.6, y: 1.1 } },
      { id: 'lancerCharged', name: 'Charged Thrust', anim: 'thrust', rollOnly: true, hits: [{ startup: 1.35, active: 0.18 }], recovery: 1.1,
        damage: 40, poise: 60, knock: 8, lunge: 4, range: 3.0, box: { w: 0.9, h: 1.3, d: 3.4, fwd: 2.0, y: 1.1 } },
    ],
  },
  {
    id: 'executioner', name: 'Executioner', description: 'A hooded giant with a greataxe. Its chop follows you; its spin cannot be blocked. Roll late, hit heavy.',
    scale: 1.5, bulk: 1.3, radius: 0.68, color: 0x4a2422, weapon: 'greataxe', idle: 'still',
    visual: { skin: 0x3a2a28, roughness: 0.9, rim: 0.7 },   // a dark hood
    hp: 320, poise: 140, speed: 1.8, turnRate: 2.8, trackRate: 1.0,
    cooldown: [1.12, 2.1], flinchTime: 0, staggerTime: 1.3, parriedTime: 1.9,
    // Stagger meter: never interrupted until it fills; heavy hits fill it far faster (three heavies, or four light hits).
    stagger: { max: 100, heavy: 45, light: 28, breakers: ['heavy', 'jumpHeavy'], decayDelay: 2.5, decay: 12, breakTime: 2.2, hitstop: 0.14 },
    attacks: [
      { id: 'execChop', name: 'Tracking Chop', anim: 'chop', track: 2.0, hits: [{ startup: 1.35, active: 0.18 }], recovery: 1.3,
        damage: 52, poise: 80, knock: 9, lunge: 1.4, range: 3.0, box: { w: 1.4, h: 3.0, d: 3.4, fwd: 2.0, y: 1.4 } },
      { id: 'execSpin', name: 'Whirling Axe', anim: 'spin', rollOnly: true, chance: 0.4, hits: [{ startup: 1.25, active: 0.4 }], recovery: 1.2,
        damage: 44, poise: 70, knock: 10, lunge: 1.0, range: 2.6, box: { w: 6.0, h: 1.6, d: 6.0, fwd: 0, y: 1.0 } },
    ],
  },
  {
    id: 'duelist', name: 'Pale Duelist', description: 'Fast and fragile, a blade in each hand. Its quick combo can be parried, and it pays dearly.',
    scale: 0.95, bulk: 0.82, radius: 0.34, color: 0xb0aca0, weapon: 'sword', offhand: 'dagger', idle: 'twitch',
    visual: { skin: 0xd8d2c4, roughness: 0.6 },   // pale
    hp: 85, poise: 28, speed: 4.4, turnRate: 8, trackRate: 3.5, approach: 0.8,   // presses in for its combo more than it dashes
    cooldown: [0.49, 1.12], flinchTime: 0.24, staggerTime: 1.0, parriedTime: 1.9,
    attacks: [
      { id: 'duelistCombo', name: 'Twin Cuts', anim: 'sweep', track: 4.0, hits: [{ startup: 0.5, active: 0.1 }, { startup: 0.28, active: 0.1 }],
        recovery: 0.6, damage: 14, poise: 14, knock: 3, lunge: 2.6, range: 2.0, box: { w: 1.8, h: 1.3, d: 1.8, fwd: 1.15, y: 1.05 } },
      { id: 'duelistDash', name: 'Dashing Cut', anim: 'stab', minRange: 3.5, dash: { speed: 9.5, from: 0.4 },
        hits: [{ startup: 0.7, active: 0.12 }], recovery: 0.7, damage: 20, poise: 24, knock: 4, lunge: 3, range: 7.5,
        box: { w: 1.4, h: 1.3, d: 2.2, fwd: 1.3, y: 1.05 } },
    ],
  },
  {
    id: 'bowman', name: 'Rampart Bowman', description: 'Shoots from afar and kicks up close. Block the bolts and close the gap.',
    scale: 0.95, bulk: 0.88, radius: 0.38, color: 0x5a6a3a, weapon: 'bow', idle: 'guard',
    visual: { skin: 0xa39d8f, bareArms: true, roughness: 0.85 },
    hp: 90, poise: 30, speed: 2.8, turnRate: 5, trackRate: 2.4, approach: 0,   // keeps its distance: kicks only if you close in
    cooldown: [0.84, 1.82], flinchTime: 0.24, staggerTime: 1.1, parriedTime: 1.7,
    attacks: [
      { id: 'bowShot', name: 'Aimed Shot', anim: 'draw', projectile: { speed: 24, gravity: 6, size: 0.12 }, minRange: 4, range: 24,
        hits: [{ startup: 1.1, active: 0.1 }], recovery: 0.7, damage: 20, poise: 24, knock: 3, lunge: 0,
        box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.3 } },
      { id: 'bowKick', name: 'Kick', anim: 'kick', hits: [{ startup: 0.4, active: 0.12 }], recovery: 0.5,
        damage: 12, poise: 30, knock: 7, lunge: 2, range: 1.7, box: { w: 1.0, h: 1.0, d: 1.4, fwd: 1.0, y: 0.6 } },
    ],
  },
  {
    id: 'shover', name: 'Shover', description: 'A bulky brute behind a great shield. Its push throws you off ledges: keep away from edges and flank it.',
    scale: 1.15, bulk: 1.3, radius: 0.52, color: 0x5a4a3a, weapon: 'none', offhand: 'kite', idle: 'still',
    visual: { skin: 0x8a8070, roughness: 0.8 },
    hp: 200, poise: 90, speed: 2.2, turnRate: 2.8, trackRate: 1.4,
    cooldown: [0.98, 1.82], flinchTime: 0.2, staggerTime: 1.15, parriedTime: 1.75,
    // Shield guard, as the Shield Warden's: frontal hits are blocked and barely fill the meter; flank it or break it with heavies.
    guard: { arc: 0.9, damageMul: 0.35, knockMul: 0.3, lowerReach: 1.0, blockedMul: 0.4, breakers: ['heavy', 'jumpHeavy'],
             max: 100, heavy: 50, light: 34, decayDelay: 2.5, decay: 12, breakTime: 2.4, hitstop: 0.14 },
    attacks: [
      { id: 'shoverShove', name: 'Shove', anim: 'shove', shove: true, hits: [{ startup: 1.3, active: 0.16 }], recovery: 0.9,
        damage: 8, poise: 30, knock: 26, lunge: 2.4, range: 2.0, box: { w: 1.8, h: 1.8, d: 1.6, fwd: 1.1, y: 1.0 } },
      { id: 'shoverBash', name: 'Shield Bash', anim: 'bash', hits: [{ startup: 0.55, active: 0.12 }], recovery: 0.75,
        damage: 16, poise: 34, knock: 8, lunge: 3.2, range: 1.7, box: { w: 1.6, h: 1.7, d: 1.5, fwd: 1.2, y: 1.2 } },
    ],
  },
  {
    // The invaders' commander, met at the top of the burning town (Level 3). A posture boss, stronger than Level 2's
    // throne pair and weaker than the Bell Warden: it tests what the town taught (close the gap, parry the combo, roll).
    id: 'pillagerCaptain', name: 'Pillager Captain',
    description: 'The commander who put the town to the torch. His halberd thrusts from afar, cuts three times (parry it) and falls from above (roll it).',
    scale: 1.45, bulk: 1.25, radius: 0.66, color: 0x3a2c28, weapon: 'halberd', idle: 'guard',
    visual: { skin: 0x4a4440, skinMetal: 0.4, metal: 0.35, roughness: 0.55, rim: 0.9, embers: true, cloak: true },   // blackened mail, a dark cloak
    hp: 450, poise: 200, speed: 2.4, turnRate: 3.4, trackRate: 1.6, approach: 0.55,   // a boss: steps in and presses
    cooldown: [0.98, 1.96], flinchTime: 0, staggerTime: 1.4, parriedTime: 1.9,
    posture: { max: 100, parry: 28, chainGap: 1.8, chainMul: 1.5, decay: 10, breakTime: 3.2, damageMul: 1.6, hitstop: 0.2 },
    attacks: [
      { id: 'captainThrust', name: 'Dashing Thrust', anim: 'thrust', minRange: 4.5, dash: { speed: 10.5, from: 0.45 },
        hits: [{ startup: 1.0, active: 0.16 }], recovery: 1.0, damage: 34, poise: 50, knock: 7, lunge: 2.5, range: 10,
        box: { w: 1.2, h: 1.6, d: 3.0, fwd: 1.8, y: 1.2 } },
      { id: 'captainCombo', name: 'Three Cuts', anim: 'sweep', track: 2.6,
        hits: [{ startup: 0.7, active: 0.14 }, { startup: 0.42, active: 0.14 }, { startup: 0.55, active: 0.16 }],
        recovery: 0.9, damage: 22, poise: 30, knock: 5, lunge: 1.8, range: 2.8, box: { w: 3.4, h: 1.6, d: 2.8, fwd: 1.6, y: 1.2 } },
      { id: 'captainOverhead', name: 'Burning Overhead', anim: 'chop', rollOnly: true, chance: 0.4, hits: [{ startup: 1.4, active: 0.2 }],
        recovery: 1.3, damage: 48, poise: 80, knock: 8, lunge: 1.4, range: 3.0, box: { w: 1.6, h: 3.0, d: 3.6, fwd: 2.0, y: 1.2 },
        impact: { ring: 2.6, crack: 1.4, dust: 12, shake: 0.1 } },
    ],
  },
  {
    id: 'bellWarden', name: 'Bell Warden', description: 'Keeper of the tower bell. A sweeping, charging colossus whose slam cannot be blocked and whose push sends you off the top.',
    scale: 1.9, bulk: 1.25, radius: 0.85, color: 0x4a5a48, weapon: 'bell', idle: 'sway',
    visual: { skin: 0x6a7a62, skinMetal: 0.35, metal: 0.35, roughness: 0.5, rim: 0.8 },   // verdigris bronze
    hp: 650, poise: 220, speed: 1.9, turnRate: 2.6, trackRate: 1.2, approach: 0.6,   // a boss: steps in and uses its strong attacks more often
    cooldown: [1.12, 2.24], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0,
    posture: { max: 120, parry: 34, chainGap: 1.8, chainMul: 1.5, decay: 9, breakTime: 3.4, damageMul: 1.6, hitstop: 0.2 },
    attacks: [
      { id: 'bellSweep', name: 'Tracking Sweep', anim: 'sweep', track: 1.6, hits: [{ startup: 1.2, active: 0.24 }], recovery: 1.2,
        damage: 40, poise: 70, knock: 9, lunge: 1.0, range: 3.4, box: { w: 5.5, h: 2.0, d: 4.0, fwd: 2.0, y: 1.2 } },
      { id: 'bellSlam', name: 'Bell Slam', anim: 'chop', rollOnly: true, chance: 0.45, hits: [{ startup: 1.5, active: 0.2 }], recovery: 1.4,
        damage: 55, poise: 90, knock: 8, lunge: 1.2, range: 3.0, box: { w: 2.4, h: 3.0, d: 4.2, fwd: 2.4, y: 1.0 },
        impact: { ring: 3.4, crack: 1.9, dust: 16, shake: 0.12 } },
      { id: 'bellShove', name: 'Bell Push', anim: 'shove', shove: true, chance: 0.45, hits: [{ startup: 1.3, active: 0.18 }], recovery: 1.0,
        damage: 14, poise: 40, knock: 28, lunge: 2.6, range: 2.8, box: { w: 3.0, h: 2.4, d: 2.2, fwd: 1.6, y: 1.2 } },
      { id: 'bellCharge', name: 'Charge', anim: 'thrust', minRange: 5, dash: { speed: 11, from: 0.4 },
        hits: [{ startup: 1.1, active: 0.3 }], recovery: 1.1, damage: 36, poise: 70, knock: 12, lunge: 3, range: 12,
        box: { w: 2.4, h: 2.4, d: 2.6, fwd: 1.4, y: 1.2 } },
    ],
  },
];

// Training dummies (tutorial only): same humanoid primitives. They never move or aggro, never die,
// stagger or lose poise. The sparring dummy repeats one slow, telegraphed swing; the dodge dummy is the same
// dummy with exactly the same cadence, but its swing is roll-only (a blue glow and ring: roll through it).
const SPARRING_DUMMY = { id: 'sparringDummy', name: 'Sparring Dummy', scale: 1.0, bulk: 1.05, radius: 0.42, color: 0x6a5446, weapon: 'sword',
  visual: { skin: 0x8a7650, roughness: 0.95 }, hp: 300, poise: Infinity, flinchTime: 0, parriedTime: 1.6, restTime: 1.3,
  attacks: [
    { id: 'trainingSwing', name: 'Training Swing', anim: 'overhead', hits: [{ startup: 1.3, active: 0.16 }], recovery: 0.9,
      damage: 8, poise: 10, knock: 2, lunge: 0, range: 3, box: { w: 1.2, h: 2.4, d: 2.4, fwd: 1.4, y: 1.2 } },
  ] };
const TRAINING_DEFS = [
  { id: 'dummy', name: 'Training Dummy', scale: 1.0, bulk: 1.05, radius: 0.42, color: 0x7a6440, weapon: 'none', visual: { skin: 0x8a7650, roughness: 0.95 },
    hp: 300, poise: Infinity, flinchTime: 0, parriedTime: 1.6, attacks: [] },
  SPARRING_DUMMY,
  { ...SPARRING_DUMMY, id: 'dodgeDummy', name: 'Dodge Dummy',
    attacks: SPARRING_DUMMY.attacks.map(a => ({ ...a, id: 'dodgeSwing', name: 'Dodge Swing', rollOnly: true })) },
];
const ENEMY_BY_ID = Object.fromEntries([...ENEMY_DEFS, ...TRAINING_DEFS, ...TEST_DEFS].map(d => [d.id, d]));
