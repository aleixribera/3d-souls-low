'use strict';
// Arena menu order. New enemies can go anywhere: levels refer to them by id.
// Attacks are four-phase (js/attack-anim.js; format in js/data/player.js): `pose` key poses, `tracking` (turn rate and
// the share of each wind-up spent turning before the aim locks), parry glints at the window, and optional `hold` on a
// hit: a delayed attack that freezes, clearly still, at `at` of its wind-up for `time` s with `chance`.
// Timings before v4.2: docs/combat-timings-v4.1.md.
const ENEMY_DEFS = [
  {
    id: 'hollow', name: 'Hollow Soldier', description: 'A shambling swordsman. Readable, honest, a fair first duel.',
    scale: 1.0, bulk: 1.0, radius: 0.4, color: 0x8a6a45, weapon: 'sword', idle: 'guard', model: 'hollowSoldier',
    visual: { skin: 0xa39d8f, bareArms: true, roughness: 0.85 },   // ashen, leathery
    hp: 110, poise: 50, speed: 2.7, turnRate: 5, trackRate: 2.2,
    cooldown: [0.63, 1.4], flinchTime: 0.24, staggerTime: 1.1, parriedTime: 1.7,
    attacks: [
      // Four-phase (js/attack-anim.js): tracks the player for `tracking.commit` of the wind-up, then locks its aim;
      // the blade glints as the parry window opens. Was 0.62 / 0.14, recovery 0.65 (docs/combat-timings-v4.1.md).
      { id: 'swing', name: 'Sword Swing', anim: 'sweep', pose: 'hollowSwing', hits: [{ startup: 0.75, active: 0.12, follow: 0.18 }], recovery: 0.55,
        tracking: { rate: 3.0, commit: 0.7 }, markers: [{ event: 'glint', parry: true }],
        damage: 20, poise: 20, knock: 4, lunge: 1.6, range: 1.9,
        box: { w: 2.0, h: 1.4, d: 2.0, fwd: 1.3, y: 1.1 } },
      // The big one: a long, arched wind-up, then the blade buried in the floor for a punishable recovery.
      // Was 1.0 / 0.14, recovery 1.05.
      { id: 'overhead', name: 'Overhead Strike', anim: 'overhead', pose: 'hollowOverhead', hits: [{ startup: 1.15, active: 0.14, follow: 0.26 }], recovery: 0.9,
        tracking: { rate: 2.4, commit: 0.65 }, markers: [{ event: 'glint', parry: true }],
        damage: 34, poise: 40, knock: 6, lunge: 2.0, range: 2.0,
        box: { w: 0.9, h: 2.4, d: 2.3, fwd: 1.4, y: 1.2 } },
    ],
  },
  {
    id: 'knight', model: 'ironKnight', name: 'Undead Knight', description: 'Slow, armored, patient. Its greatsword ends careless fights.',
    scale: 1.3, bulk: 1.3, radius: 0.6, color: 0x7b8088, weapon: 'sword', offhand: 'shield', idle: 'still',
    visual: { skin: 0x6e737a, skinMetal: 0.2, metal: 0.3, roughness: 0.5 },   // worn steel, helmed
    hp: 240, poise: 120, speed: 1.9, turnRate: 3.2, trackRate: 1.2,
    cooldown: [0.98, 1.96], flinchTime: 0, staggerTime: 1.2, parriedTime: 1.8,
    // Stagger meter (shown under its health bar), replacing poise: hits never interrupt it until the meter
    // fills (2 heavy, or 3 light; v4.2.1, was heavy 60 / light 45), then it kneels, open, for `breakTime`.
    // Drains at `decay`/s once `decayDelay` s pass without a hit. A jump attack counts as light.
    stagger: { max: 100, heavy: 50, light: 38, breakers: ['heavy'], decayDelay: 2.5, decay: 14,
               breakTime: 2.0, hitstop: 0.14 },
    attacks: [
      { id: 'slam', name: 'Greatsword Slam', anim: 'overhead', pose: 'hollowOverhead', tracking: { rate: 1.6, commit: 0.6 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.1, hits: [{ startup: 1.5, active: 0.18, follow: 0.3, hold: { at: 0.45, time: [0.25, 0.6], chance: 0.4 } }], recovery: 1.15,
        damage: 58, poise: 85, knock: 9, lunge: 1.4, range: 2.8,
        box: { w: 1.5, h: 3.0, d: 3.2, fwd: 2.0, y: 1.5 } },
      { id: 'bash', name: 'Shield Bash', anim: 'bash', pose: 'enemyBash', tracking: { rate: 2.4, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], hits: [{ startup: 0.55, active: 0.12, follow: 0.15 }], recovery: 0.6,
        damage: 16, poise: 34, knock: 11, lunge: 4.0, range: 1.6,
        box: { w: 1.5, h: 1.6, d: 1.4, fwd: 1.2, y: 1.3 } },
    ],
  },
  {
    id: 'rogue', model: 'rogue', name: 'Fast Rogue', description: 'Quick and fragile. Blink and it has already cut you twice.',
    scale: 0.85, bulk: 0.8, radius: 0.32, color: 0x2f5234, weapon: 'sword', idle: 'twitch',
    visual: { skin: 0xbab29e, roughness: 0.8 },   // pale face, dark cloth
    // v4.2.4: speed 4.7 -> 4.2, cooldown [0.42, 1.05] -> [0.55, 1.2], and it takes turns when others fight the player too.
    hp: 65, poise: 25, speed: 4.2, turnRate: 9, trackRate: 4,
    cooldown: [0.55, 1.2], crowd: { groupCooldown: 1.8 }, flinchTime: 0.26, staggerTime: 1.0, parriedTime: 1.6,
    attacks: [
      { id: 'stab', name: 'Quick Stab', anim: 'stab', pose: 'enemyStab', tracking: { rate: 6, commit: 0.75 }, markers: [{ event: 'glint', parry: true }], hits: [{ startup: 0.4, active: 0.1, follow: 0.12 }], recovery: 0.4,
        damage: 13, poise: 12, knock: 3, lunge: 5.0, range: 2.1,
        box: { w: 0.7, h: 1.2, d: 2.0, fwd: 1.3, y: 1.0 } },
      { id: 'doubleSlash', name: 'Double Slash', anim: 'sweep', pose: 'enemyDoubleSlash', tracking: { rate: 6, commit: 0.75 }, markers: [{ event: 'glint', parry: true }, { event: 'glint', parry: true, hit: 1 }], hits: [{ startup: 0.42, active: 0.09, follow: 0.08 }, { startup: 0.3, active: 0.09, follow: 0.14 }],
        recovery: 0.55, damage: 10, poise: 11, knock: 2.5, lunge: 2.6, range: 1.7,
        box: { w: 1.7, h: 1.2, d: 1.7, fwd: 1.1, y: 1.0 } },
    ],
  },
  {
    id: 'giant', model: 'giantSkeleton', name: 'Giant Skeleton', description: 'A towering ruin of bone. Every blow is a catastrophe.',
    scale: 2.3, bulk: 1.2, radius: 0.95, color: 0xb9b3a0, weapon: 'club', idle: 'sway',
    visual: { skin: 0xcfc8b2, bareArms: true, roughness: 0.75, rim: 0.8 },   // bone
    hp: 480, poise: 220, speed: 1.4, turnRate: 2.2, trackRate: 0.8,
    cooldown: [1.26, 2.38], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0,
    // Boss posture: replaces poise interrupts (hits never cancel its swings). Every landed hit builds it by the
    // attack's postureDmg, times `chainMul` when it lands within `chainGap` s of the previous one. A parry adds
    // `parry`. It drains at `decay`/s once `chainGap` s pass without a hit. (v4.2.1: chainMul 1.5 -> 1.35, parry -15%.)
    posture: { max: 100, parry: 32, chainGap: 1.8, chainMul: 1.35, decay: 10, breakTime: 3.2, damageMul: 1.6, hitstop: 0.2 },
    // v4.2.4: its sweep and stomp were active 0.24 / 0.2 s over boxes too wide to roll out of, so a roll's 0.3 s of
    // invulnerability had almost no margin; now 0.12 s, the rest added to the follow-through (docs/combat-timings-v4.1.md).
    attacks: [
      { id: 'sweep', name: 'Club Sweep', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 1.4, commit: 0.6 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.25, hits: [{ startup: 1.75, active: 0.12, follow: 0.42 }], recovery: 1.3,
        damage: 62, poise: 95, knock: 12, lunge: 0.6, range: 3.6,
        box: { w: 7.0, h: 2.2, d: 4.6, fwd: 2.4, y: 1.3 } },
      { id: 'stomp', name: 'Stomp', anim: 'stomp', pose: 'enemyStomp', tracking: { rate: 1.2, commit: 0.5 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.1, hits: [{ startup: 1.4, active: 0.12, follow: 0.38, hold: { at: 0.55, time: [0.4, 0.9], chance: 0.5 } }], recovery: 1,
        damage: 46, poise: 75, knock: 8, lunge: 0, range: 2.4,
        box: { w: 5.6, h: 0.8, d: 5.6, fwd: 0.6, y: 0.4 } },
    ],
  },
  {
    id: 'warden', model: 'ironWarden', name: 'Shield Warden', description: 'Hides behind a great shield. Circle it, parry it, or batter its guard down.',
    scale: 1.12, bulk: 1.15, radius: 0.48, color: 0x56636e, weapon: 'sword', offhand: 'kite', idle: 'still',
    visual: { skin: 0x5c6670, skinMetal: 0.15, metal: 0.25, roughness: 0.55 },   // blued steel, helmed
    hp: 140, poise: 85, speed: 2.2, turnRate: 2.6, trackRate: 1.5,
    cooldown: [0.84, 1.68], flinchTime: 0.2, staggerTime: 1.15, parriedTime: 1.75,
    // Shield guard: hits from within `arc` (rad) of its facing are blocked (taking `damageMul` of the damage)
    // while the shield is up: not attacking, and not stepping in to strike within `lowerReach` of its shortest reach.
    // Every hit, blocked or not, fills a visible guard meter instead of poise: `heavy` for a `breakers`
    // attack, `light` otherwise (a jump attack counts as light). At `max` the guard breaks (3 heavy, 1 heavy + 2 light,
    // or 4 light; v4.2.1, was heavy 50 / light 34).
    // Hits taken on the shield fill only `blockedMul` of that, so flanking or punishing swings breaks it far faster.
    // The meter drains at `decay`/s once `decayDelay` s pass without a hit.
    guard: { arc: 0.9, damageMul: 0.35, knockMul: 0.3, lowerReach: 1.0, blockedMul: 0.4, breakers: ['heavy'],
             max: 100, heavy: 42, light: 29, decayDelay: 2.5, decay: 12, breakTime: 2.4, hitstop: 0.14 },
    attacks: [
      { id: 'wardenSwing', name: 'Sword Swing', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 2.4, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], hits: [{ startup: 0.8, active: 0.12, follow: 0.16 }], recovery: 0.7,
        damage: 26, poise: 30, knock: 5, lunge: 1.8, range: 2.2,
        box: { w: 2.2, h: 1.5, d: 2.2, fwd: 1.4, y: 1.1 } },
      { id: 'wardenBash', name: 'Shield Bash', anim: 'bash', pose: 'enemyBash', tracking: { rate: 2.2, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], hits: [{ startup: 0.6, active: 0.12, follow: 0.15 }], recovery: 0.65,
        damage: 18, poise: 40, knock: 10, lunge: 3.6, range: 1.7,
        box: { w: 1.6, h: 1.7, d: 1.5, fwd: 1.2, y: 1.2 } },
    ],
  },
  // ---- the Tower's enemies (Level 4; the Lancer, Duelist and Bowman first appear in Level 3, the town) ----------------------------------------------------------------------------
  {
    id: 'lancer', model: 'ashLancer', name: 'Ashen Lancer', description: 'A spearman who closes distance in one lunge, and up close winds up a charged thrust you can only roll. Its slow jab is the opening.',
    scale: 1.05, bulk: 0.95, radius: 0.42, color: 0x6a6258, weapon: 'spear', idle: 'guard',
    visual: { skin: 0x9a948a, roughness: 0.8 },   // ashen, hooded
    hp: 150, poise: 55, speed: 3.0, turnRate: 5, trackRate: 2.0, approach: 0.12,   // holds at lunge range rather than walking in
    // v4.2.3: far more aggressive alone (cooldown was [0.7, 1.54]); with other enemies fighting too its cooldown lasts
    // 4x longer ([0.4, 1.6]), so in a group it attacks only a little more than before.
    cooldown: [0.1, 0.4], crowd: { groupCooldown: 4 }, kite: 0.5, flinchTime: 0.24, staggerTime: 1.1, parriedTime: 1.7,
    // v4.2.3 priorities (`chance`, per second / as weights up close): lunges readily from range (default dash 0.3; this one 2.5/s); up
    // close it mostly winds up the blue charged thrust (default 0.22) and jabs less (default 0.9).
    attacks: [
      { id: 'lancerDash', name: 'Dashing Thrust', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 2.6, commit: 0.4 }, markers: [{ event: 'glint', parry: true }], minRange: 4, dash: { speed: 10, from: 0.45 }, chance: 2.5,
        hits: [{ startup: 0.95, active: 0.16, follow: 0.2 }], recovery: 0.75, damage: 26, poise: 34, knock: 6, lunge: 3, range: 9,
        box: { w: 0.8, h: 1.2, d: 3.0, fwd: 1.8, y: 1.1 } },
      { id: 'lancerJab', name: 'Jab', anim: 'stab', chance: 0.35, pose: 'enemyStab', tracking: { rate: 3, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], hits: [{ startup: 0.48, active: 0.1, follow: 0.12 }], recovery: 0.72,   // long recovery: the opening
        damage: 14, poise: 18, knock: 3, lunge: 2.5, range: 2.8, box: { w: 0.7, h: 1.1, d: 2.8, fwd: 1.6, y: 1.1 } },
      { id: 'lancerCharged', name: 'Charged Thrust', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 2.2, commit: 0.65 }, poseScale: 1.15, rollOnly: true, chance: 1.0, hits: [{ startup: 1.4, active: 0.18, follow: 0.22, hold: { at: 0.45, time: [0.3, 0.7], chance: 0.5 } }], recovery: 0.95,
        damage: 48, poise: 60, knock: 8, lunge: 4, range: 3.0, box: { w: 0.9, h: 1.3, d: 3.4, fwd: 2.0, y: 1.1 } },
    ],
  },
  {
    id: 'executioner', model: 'ashExecutioner', name: 'Executioner', description: 'A hooded giant with a greataxe. Its chop follows you; its spin cannot be blocked. Roll late, hit heavy.',
    scale: 1.5, bulk: 1.3, radius: 0.68, color: 0x4a2422, weapon: 'greataxe', idle: 'still',
    visual: { skin: 0x3a2a28, roughness: 0.9, rim: 0.7 },   // a dark hood
    hp: 320, poise: 140, speed: 1.8, turnRate: 2.8, trackRate: 1.0,
    cooldown: [1.12, 2.1], flinchTime: 0, staggerTime: 1.3, parriedTime: 1.9,
    // Stagger meter: never interrupted until it fills; heavy hits fill it far faster (three heavies, or five light hits;
    // v4.2.1, was heavy 45 / light 28).
    stagger: { max: 100, heavy: 40, light: 24, breakers: ['heavy'], decayDelay: 2.5, decay: 12, breakTime: 2.2, hitstop: 0.14 },
    attacks: [
      { id: 'execChop', name: 'Tracking Chop', anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 2.6, commit: 0.85 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.15, hits: [{ startup: 1.4, active: 0.18, follow: 0.3, hold: { at: 0.5, time: [0.3, 0.7], chance: 0.5 } }], recovery: 1.1,
        damage: 52, poise: 80, knock: 9, lunge: 1.4, range: 3.0, box: { w: 1.4, h: 3.0, d: 3.4, fwd: 2.0, y: 1.4 } },
      { id: 'execSpin', name: 'Whirling Axe', anim: 'spin', pose: 'enemySpin', tracking: { rate: 1.5, commit: 0.6 }, rollOnly: true, chance: 0.4, hits: [{ startup: 1.3, active: 0.2, follow: 0.4 }], recovery: 1,
        damage: 58, poise: 70, knock: 10, lunge: 1.0, range: 2.6, box: { w: 6.0, h: 1.6, d: 6.0, fwd: 0, y: 1.0 } },
    ],
  },
  {
    id: 'duelist', model: 'paleDuelist', name: 'Pale Duelist', description: 'Fast and fragile, a blade in each hand. Its quick combo can be parried, and it pays dearly.',
    scale: 0.95, bulk: 0.82, radius: 0.34, color: 0xb0aca0, weapon: 'sword', offhand: 'dagger', idle: 'twitch',
    visual: { skin: 0xd8d2c4, roughness: 0.6 },   // pale
    // v4.2.4: speed 4.4 -> 4.0, and it takes turns when others fight the player too.
    hp: 85, poise: 28, speed: 4.0, turnRate: 8, trackRate: 3.5, approach: 0.8,   // presses in for its combo more than it dashes
    cooldown: [0.49, 1.12], crowd: { groupCooldown: 1.6 }, flinchTime: 0.24, staggerTime: 1.0, parriedTime: 1.9,
    attacks: [
      { id: 'duelistCombo', name: 'Twin Cuts', anim: 'sweep', pose: 'enemyDoubleSlash', tracking: { rate: 5, commit: 0.8 }, markers: [{ event: 'glint', parry: true }, { event: 'glint', parry: true, hit: 1 }], hits: [{ startup: 0.52, active: 0.1, follow: 0.08 }, { startup: 0.32, active: 0.1, follow: 0.14 }],
        recovery: 0.52, damage: 14, poise: 14, knock: 3, lunge: 2.6, range: 2.0, box: { w: 1.8, h: 1.3, d: 1.8, fwd: 1.15, y: 1.05 } },
      { id: 'duelistDash', name: 'Dashing Cut', anim: 'stab', pose: 'enemyStab', tracking: { rate: 4, commit: 0.38 }, markers: [{ event: 'glint', parry: true }], minRange: 3.5, dash: { speed: 9.5, from: 0.4 },
        hits: [{ startup: 0.72, active: 0.12, follow: 0.14 }], recovery: 0.6, damage: 20, poise: 24, knock: 4, lunge: 3, range: 7.5,
        box: { w: 1.4, h: 1.3, d: 2.2, fwd: 1.3, y: 1.05 } },
    ],
  },
  {
    id: 'bowman', model: 'rampartBowman', name: 'Rampart Bowman', description: 'Shoots from afar and kicks up close. Block the bolts and close the gap.',
    scale: 0.95, bulk: 0.88, radius: 0.38, color: 0x5a6a3a, weapon: 'bow', idle: 'guard',
    visual: { skin: 0xa39d8f, bareArms: true, roughness: 0.85 },
    hp: 90, poise: 30, speed: 2.8, turnRate: 5, trackRate: 2.4, approach: 0, kite: 0.6,   // keeps its distance, but now and then kicks out at a player close by
    cooldown: [0.84, 1.82], flinchTime: 0.24, staggerTime: 1.1, parriedTime: 1.7,
    attacks: [
      { id: 'bowShot', name: 'Aimed Shot', anim: 'draw', pose: 'enemyDraw', tracking: { rate: 2.4, commit: 0.85 }, projectile: { speed: 24, gravity: 6, size: 0.12 }, minRange: 4, range: 24,
        hits: [{ startup: 1.1, active: 0.1, follow: 0.12 }], recovery: 0.6, damage: 20, poise: 24, knock: 3, lunge: 0,
        box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.3 } },
      { id: 'bowKick', name: 'Kick', anim: 'kick', pose: 'enemyKick', tracking: { rate: 3, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], hits: [{ startup: 0.42, active: 0.12, follow: 0.12 }], recovery: 0.42,
        damage: 12, poise: 30, knock: 7, lunge: 2, range: 1.7, box: { w: 1.0, h: 1.0, d: 1.4, fwd: 1.0, y: 0.6 } },
    ],
  },
  {
    id: 'shover', model: 'ironShover', name: 'Shover', description: 'A bulky brute behind a great shield. Its push throws you off ledges: keep away from edges and flank it.',
    scale: 1.15, bulk: 1.3, radius: 0.52, color: 0x5a4a3a, weapon: 'none', offhand: 'kite', idle: 'still',
    visual: { skin: 0x8a8070, roughness: 0.8 },
    hp: 200, poise: 90, speed: 2.2, turnRate: 2.8, trackRate: 1.4,
    cooldown: [0.98, 1.82], flinchTime: 0.2, staggerTime: 1.15, parriedTime: 1.75,
    // Shield guard, as the Shield Warden's: frontal hits are blocked and barely fill the meter; flank it or break it with heavies.
    guard: { arc: 0.9, damageMul: 0.35, knockMul: 0.3, lowerReach: 1.0, blockedMul: 0.4, breakers: ['heavy'],
             max: 100, heavy: 42, light: 29, decayDelay: 2.5, decay: 12, breakTime: 2.4, hitstop: 0.14 },
    attacks: [
      { id: 'shoverShove', name: 'Shove', anim: 'shove', pose: 'enemyShove', tracking: { rate: 2, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], shove: true, hits: [{ startup: 1.3, active: 0.16, follow: 0.2 }], recovery: 0.75,
        damage: 8, poise: 30, knock: 26, lunge: 2.4, range: 2.0, box: { w: 1.8, h: 1.8, d: 1.6, fwd: 1.1, y: 1.0 } },
      { id: 'shoverBash', name: 'Shield Bash', anim: 'bash', pose: 'enemyBash', tracking: { rate: 2.2, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], hits: [{ startup: 0.58, active: 0.12, follow: 0.15 }], recovery: 0.62,
        damage: 16, poise: 34, knock: 8, lunge: 3.2, range: 1.7, box: { w: 1.6, h: 1.7, d: 1.5, fwd: 1.2, y: 1.2 } },
    ],
  },
  {
    // The invaders' commander, met at the top of the burning town (Level 3). A posture boss, stronger than Level 2's
    // throne pair and weaker than the Bell Warden: it tests what the town taught (close the gap, parry the combo, roll).
    id: 'pillagerCaptain', model: 'pillagerCaptain', name: 'Pillager Captain',
    description: 'The commander who put the town to the torch. His halberd thrusts from afar, cuts three times (parry it) and falls from above (roll it).',
    scale: 1.45, bulk: 1.25, radius: 0.66, color: 0x3a2c28, weapon: 'halberd', idle: 'guard',
    visual: { skin: 0x4a4440, skinMetal: 0.4, metal: 0.35, roughness: 0.55, rim: 0.9, embers: true, cloak: true },   // blackened mail, a dark cloak
    hp: 450, poise: 200, speed: 2.4, turnRate: 3.4, trackRate: 1.6, approach: 0.55, kite: 0.15,   // a boss: steps in and presses, and rarely backs away
    cooldown: [0.98, 1.96], flinchTime: 0, staggerTime: 1.4, parriedTime: 1.9,
    posture: { max: 100, parry: 24, chainGap: 1.8, chainMul: 1.35, decay: 10, breakTime: 3.2, damageMul: 1.6, hitstop: 0.2 },
    attacks: [
      { id: 'captainThrust', name: 'Dashing Thrust', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 2.6, commit: 0.4 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.1, minRange: 4.5, dash: { speed: 10.5, from: 0.45 },
        hits: [{ startup: 1.05, active: 0.16, follow: 0.2 }], recovery: 0.85, damage: 34, poise: 50, knock: 7, lunge: 2.5, range: 10,
        box: { w: 1.2, h: 1.6, d: 3.0, fwd: 1.8, y: 1.2 } },
      { id: 'captainCombo', name: 'Three Cuts', anim: 'sweep', pose: 'enemyTripleCut', tracking: { rate: 3.2, commit: 0.75 }, markers: [{ event: 'glint', parry: true }, { event: 'glint', parry: true, hit: 1 }, { event: 'glint', parry: true, hit: 2 }], poseScale: 1.1,
        hits: [{ startup: 0.65, active: 0.14, follow: 0.1 }, { startup: 0.42, active: 0.14, follow: 0.1 }, { startup: 0.8, active: 0.16, follow: 0.24 }],
        recovery: 0.75, damage: 22, poise: 30, knock: 5, lunge: 1.8, range: 2.8, box: { w: 3.4, h: 1.6, d: 2.8, fwd: 1.6, y: 1.2 } },
      { id: 'captainOverhead', name: 'Burning Overhead', anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 2.2, commit: 0.5 }, poseScale: 1.25, rollOnly: true, chance: 0.4, hits: [{ startup: 1.5, active: 0.14, follow: 0.36, hold: { at: 0.5, time: [0.4, 1], chance: 0.6 } }],
        recovery: 1.1, damage: 62, poise: 80, knock: 8, lunge: 1.4, range: 3.0, box: { w: 1.6, h: 3.0, d: 3.6, fwd: 2.0, y: 1.2 },
        impact: { ring: 2.6, crack: 1.4, dust: 12, shake: 0.1 } },
    ],
  },
  {
    id: 'bellWarden', model: 'bellWarden', name: 'Bell Warden', description: 'Keeper of the tower bell. A sweeping, charging colossus whose slam cannot be blocked and whose push sends you off the top.',
    scale: 1.9, bulk: 1.25, radius: 0.85, color: 0x4a5a48, weapon: 'bell', idle: 'sway',
    visual: { skin: 0x6a7a62, skinMetal: 0.35, metal: 0.35, roughness: 0.5, rim: 0.8 },   // verdigris bronze
    hp: 650, poise: 220, speed: 1.9, turnRate: 2.6, trackRate: 1.2, approach: 0.6, kite: 0.15,   // a boss: steps in and uses its strong attacks more often
    cooldown: [1.12, 2.24], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0,
    posture: { max: 120, parry: 29, chainGap: 1.8, chainMul: 1.35, decay: 9, breakTime: 3.4, damageMul: 1.6, hitstop: 0.2 },
    attacks: [
      { id: 'bellSweep', name: 'Tracking Sweep', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 2.2, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.3, hits: [{ startup: 1.3, active: 0.14, follow: 0.4 }], recovery: 1,
        damage: 40, poise: 70, knock: 9, lunge: 1.0, range: 3.4, box: { w: 5.5, h: 2.0, d: 4.0, fwd: 2.0, y: 1.2 } },
      { id: 'bellSlam', name: 'Bell Slam', anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 2, commit: 0.5 }, poseScale: 1.35, rollOnly: true, chance: 0.45, hits: [{ startup: 1.7, active: 0.14, follow: 0.41, hold: { at: 0.5, time: [0.5, 1.1], chance: 0.7 } }], recovery: 1.2,
        damage: 72, poise: 90, knock: 8, lunge: 1.2, range: 3.0, box: { w: 2.4, h: 3.0, d: 4.2, fwd: 2.4, y: 1.0 },
        impact: { ring: 3.4, crack: 1.9, dust: 16, shake: 0.12 } },
      { id: 'bellShove', name: 'Bell Push', anim: 'shove', pose: 'enemyShove', tracking: { rate: 1.8, commit: 0.65 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.25, shove: true, chance: 0.45, hits: [{ startup: 1.35, active: 0.18, follow: 0.2 }], recovery: 0.85,
        damage: 14, poise: 40, knock: 28, lunge: 2.6, range: 2.8, box: { w: 3.0, h: 2.4, d: 2.2, fwd: 1.6, y: 1.2 } },
      { id: 'bellCharge', name: 'Charge', anim: 'thrust', pose: 'enemyShove', tracking: { rate: 2, commit: 0.35 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.2, minRange: 5, dash: { speed: 11, from: 0.4 },
        hits: [{ startup: 1.15, active: 0.16, follow: 0.34 }], recovery: 0.95, damage: 36, poise: 70, knock: 12, lunge: 3, range: 12,
        box: { w: 2.4, h: 2.4, d: 2.6, fwd: 1.4, y: 1.2 } },
    ],
  },
  // ---- Level 5: the castle (v4.3) ---------------------------------------------------------------------------------
  {
    // A gargoyle: carved stone that crouches on the castle's ledges (placement `perch`) and springs at whoever passes.
    // Before it moves, grit trickles and stone grinds (js/finale.js), so it never strikes unannounced.
    id: 'gargoyle', model: 'gargoyle', name: 'Gargoyle', description: 'Carved stone that crouches on the ledges and springs when you pass. Grit falls before it moves. Few hits break it, but it hits hard.',
    scale: 1.05, bulk: 1.1, radius: 0.48, color: 0x6e6c68, weapon: 'none', idle: 'twitch',
    visual: { skin: 0x7a786f, roughness: 0.95 },
    hp: 120, poise: 70, speed: 3.6, turnRate: 6, trackRate: 3,
    cooldown: [0.8, 1.6], flinchTime: 0.2, staggerTime: 1.0, parriedTime: 1.6,
    attacks: [
      { id: 'gargoyleClaw', name: 'Raking Claws', anim: 'sweep', pose: 'clawRake', tracking: { rate: 4, commit: 0.7 }, markers: [{ event: 'glint', parry: true }, { event: 'glint', parry: true, hit: 1 }],
        hits: [{ startup: 0.55, active: 0.1, follow: 0.1 }, { startup: 0.38, active: 0.1, follow: 0.18 }], recovery: 0.7,
        damage: 18, poise: 20, knock: 3, lunge: 2.4, range: 1.8, box: { w: 1.8, h: 1.4, d: 1.8, fwd: 1.1, y: 1.0 } },
      { id: 'gargoyleDive', name: 'Diving Pounce', anim: 'overhead', pose: 'clawPounce', tracking: { rate: 3, commit: 0.45 }, rollOnly: true, minRange: 3.5, chance: 0.5,
        hits: [{ startup: 1.0, active: 0.14, follow: 0.3, leap: { from: 0.5, max: 16, short: 1.0 } }], recovery: 1.0,
        damage: 34, poise: 50, knock: 7, lunge: 0, range: 16, box: { w: 2.4, h: 1.8, d: 2.4, fwd: 0.6, y: 0.9 },
        impact: { ring: 2.2, crack: 1.0, dust: 10, shake: 0.06 } },
    ],
  },
  {
    // The Empty Sentinel: a giant suit of armour with nobody inside, cold light in the joints. Section A's bridge guard.
    id: 'sentinel', model: 'emptySentinel', name: 'Empty Sentinel', description: 'A giant suit of armour with nobody inside. Its sweep waits before it falls; its slam can only be rolled. Fill its stagger with heavy blows.',
    scale: 1.65, bulk: 1.25, radius: 0.72, color: 0x5a6068, weapon: 'halberd', idle: 'still',
    visual: { skin: 0x4a5058, skinMetal: 0.4, metal: 0.4, roughness: 0.5, rim: 0.9 },
    hp: 520, poise: 200, speed: 1.8, turnRate: 2.8, trackRate: 1.2, approach: 0.45,
    cooldown: [1.1, 2.1], flinchTime: 0, staggerTime: 1.3, parriedTime: 1.9,
    stagger: { max: 100, heavy: 34, light: 22, breakers: ['heavy'], decayDelay: 2.5, decay: 12, breakTime: 2.4, hitstop: 0.16 },
    attacks: [
      { id: 'sentinelSweep', name: 'Patient Sweep', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 1.8, commit: 0.6 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.25,
        hits: [{ startup: 1.3, active: 0.14, follow: 0.4, hold: { at: 0.5, time: [0.4, 1.0], chance: 0.6 } }], recovery: 1.1,
        damage: 44, poise: 70, knock: 9, lunge: 1.0, range: 3.6, box: { w: 5.4, h: 2.0, d: 4.0, fwd: 2.0, y: 1.2 } },
      { id: 'sentinelSlam', name: 'Hollow Slam', anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 1.6, commit: 0.5 }, poseScale: 1.3, rollOnly: true, chance: 0.45,
        hits: [{ startup: 1.6, active: 0.14, follow: 0.45 }], recovery: 1.3,
        damage: 62, poise: 90, knock: 8, lunge: 1.0, range: 3.4, box: { w: 2.2, h: 3.0, d: 4.2, fwd: 2.4, y: 1.0 },
        impact: { ring: 3.0, crack: 1.6, dust: 14, shake: 0.1 } },
      { id: 'sentinelThrust', name: 'Halberd Thrust', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 2.2, commit: 0.55 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.15, minRange: 3, chance: 0.6,
        hits: [{ startup: 1.0, active: 0.14, follow: 0.25 }], recovery: 0.9,
        damage: 32, poise: 50, knock: 7, lunge: 1.6, range: 5.2, box: { w: 1.2, h: 1.6, d: 3.6, fwd: 3.0, y: 1.2 } },
    ],
  },
  {
    // The Toll Wisp: a hooded robe of blue flame round a small bell. It rings before every shot (the cue to move).
    id: 'wisp', model: 'tollWisp', name: 'Toll Wisp', description: 'A robe of blue flame round a little bell. It rings before it shoots. Fragile: close in and cut it down.',
    scale: 0.9, bulk: 0.8, radius: 0.36, color: 0x5a7ab0, weapon: 'none', idle: 'sway',
    visual: { skin: 0x6a8ac0, roughness: 0.6 },
    hp: 60, poise: 20, speed: 2.4, turnRate: 6, trackRate: 3,
    cooldown: [1.4, 2.4], flinchTime: 0.3, staggerTime: 1.0, parriedTime: 1.6,
    attacks: [
      { id: 'wispBolt', name: 'Tolling Flame', anim: 'overhead', pose: 'enemyDraw', tracking: { rate: 2.4, commit: 0.85 }, markers: [{ at: 'windup', t: 0, event: 'sound', sound: 'wispToll', vel: 0.8 }],
        projectile: { speed: 17, gravity: 0, size: 0.22 }, minRange: 3, range: 32,
        hits: [{ startup: 1.1, active: 0.05, follow: 0.1 }], recovery: 0.9,
        damage: 22, poise: 18, knock: 3, lunge: 0, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.2 } },
      { id: 'wispPulse', name: 'Cold Pulse', anim: 'bash', pose: 'enemyBash', tracking: { rate: 3, commit: 0.7 }, markers: [{ event: 'glint', parry: true }],
        hits: [{ startup: 0.6, active: 0.12, follow: 0.15 }], recovery: 0.7,
        damage: 12, poise: 20, knock: 8, lunge: 1.0, range: 1.6, box: { w: 1.6, h: 1.6, d: 1.6, fwd: 0.9, y: 1.0 } },
    ],
  },
  {
    // The final boss. The castle's lord, the jailer of the prison the player escaped (Levels 1-2), master of the invaders
    // who burned the town (Level 3). Ringing the tower bell (Level 4) called him out to answer a challenge, as of old.
    // Three phases (Enemy.enterPhase): `field` outside the castle (ends in a retreat), then `throne` and `knell` in the
    // throne room. Every strike's active time stays well under a roll's i-frames (the boss test).
    id: 'varn', model: 'varn', name: 'Varn, the Gaoler King',
    description: 'The lord of the castle and jailer of its prison. The bell you rang has called him out. Learn his sweep, his cleave, his delayed overhead and his leap; in the end he burns.',
    scale: 1.75, bulk: 1.25, radius: 0.78, color: 0x5a4a36, weapon: 'sword', idle: 'guard',
    visual: { skin: 0x5a5048, skinMetal: 0.45, metal: 0.4, roughness: 0.45, rim: 0.9 },
    hp: 900, poise: 240, speed: 2.1, turnRate: 3.0, trackRate: 1.5, approach: 0.45, kite: 0.2,
    cooldown: [1.4, 2.6], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0, deathFade: 7,
    posture: { max: 130, parry: 26, chainGap: 1.8, chainMul: 1.35, decay: 9, breakTime: 3.4, damageMul: 1.6, hitstop: 0.22 },
    defaultPhases: ['throne', 'knell'],   // a duel from the Enemies menu fights the throne room's two bars
    phases: {
      // Outside: slower and readable, teaching his style. Ends in a retreat (the placement's `boss.retreat`).
      field: { hp: 800, cooldown: [1.5, 2.8], approach: 0.35, kite: 0.25, speed: 2.0,
        attacks: ['varnSweep', 'varnCleave', 'varnDelay', 'varnLunge', 'varnShoulder', 'varnStomp', 'varnLeap'] },
      // The throne room's first bar: the same moves, pressed harder.
      throne: { hp: 900, cooldown: [1.05, 2.0], approach: 0.6, kite: 0, speed: 2.2,
        attacks: ['varnSweep', 'varnCleave', 'varnDelay', 'varnLunge', 'varnShoulder', 'varnStomp', 'varnLeap'] },
      // After the transition (15 s, invulnerable): faster, longer, fiercer tracking in the wind-ups (commit points
      // unchanged), and four new attacks.
      knell: { name: 'Varn, Knell of Ash', hp: 1000, transition: 15, ignite: true, cooldown: [0.55, 1.25], approach: 0.85, kite: 0, speed: 2.7,
        turnRate: 3.6, trackRate: 2.2, parriedTime: 1.7,
        posture: { max: 150, parry: 24, chainGap: 1.8, chainMul: 1.3, decay: 10, breakTime: 3.0, damageMul: 1.6, hitstop: 0.22 },
        attacks: ['knellSweep', 'knellCleave', 'knellDelay', 'knellLunge', 'knellStomp', 'knellLeap', 'tollingChain', 'ashWave', 'burningAscent', 'lastToll'] },
    },
    attacks: [
      // ---- the field and throne moves ----
      { id: 'varnSweep', name: 'Gaol Sweep', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 2.2, commit: 0.65 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.3,
        hits: [{ startup: 1.2, active: 0.14, follow: 0.38 }], recovery: 1.0,
        damage: 38, poise: 60, knock: 8, lunge: 1.2, range: 3.4, box: { w: 5.0, h: 2.0, d: 3.6, fwd: 2.0, y: 1.2 } },
      { id: 'varnCleave', name: 'Two-Step Cleave', anim: 'sweep', pose: 'enemyDoubleSlash', tracking: { rate: 2.6, commit: 0.7 }, markers: [{ event: 'glint', parry: true }, { event: 'glint', parry: true, hit: 1 }], poseScale: 1.25,
        hits: [{ startup: 0.9, active: 0.13, follow: 0.14 }, { startup: 0.62, active: 0.13, follow: 0.3 }], recovery: 0.95,
        damage: 30, poise: 45, knock: 6, lunge: 2.2, range: 3.0, box: { w: 3.6, h: 1.8, d: 3.2, fwd: 1.8, y: 1.2 } },
      { id: 'varnDelay', name: "Warden's Delay", anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 2.2, commit: 0.55 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.35,
        hits: [{ startup: 1.5, active: 0.14, follow: 0.4, hold: { at: 0.5, time: [0.5, 1.2], chance: 0.75 } }], recovery: 1.15,
        damage: 52, poise: 80, knock: 9, lunge: 1.6, range: 3.2, box: { w: 1.8, h: 3.0, d: 3.8, fwd: 2.2, y: 1.2 },
        impact: { ring: 2.8, crack: 1.6, dust: 14, shake: 0.1 } },
      { id: 'varnLunge', name: 'Shackle Lunge', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 2.6, commit: 0.4 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.15, minRange: 5, dash: { speed: 11, from: 0.45 }, chance: 0.7,
        hits: [{ startup: 1.1, active: 0.16, follow: 0.26 }], recovery: 0.95,
        damage: 36, poise: 55, knock: 8, lunge: 2.6, range: 12, box: { w: 1.4, h: 1.8, d: 3.2, fwd: 2.0, y: 1.2 } },
      { id: 'varnShoulder', name: 'Iron Shoulder', anim: 'shove', pose: 'enemyShove', tracking: { rate: 2.2, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.2, shove: true, chance: 0.35,
        hits: [{ startup: 0.85, active: 0.14, follow: 0.2 }], recovery: 0.75,
        damage: 16, poise: 40, knock: 18, lunge: 2.4, range: 2.2, box: { w: 2.6, h: 2.2, d: 2.0, fwd: 1.4, y: 1.2 } },
      { id: 'varnStomp', name: 'Key-Ring Stomp', anim: 'stomp', pose: 'enemyStomp', tracking: { rate: 1.4, commit: 0.5 }, poseScale: 1.2, rollOnly: true, chance: 0.4,
        hits: [{ startup: 1.35, active: 0.14, follow: 0.4 }], recovery: 1.2,
        damage: 44, poise: 70, knock: 10, lunge: 0, range: 2.6, box: { w: 5.6, h: 0.6, d: 5.6, fwd: 0.3, y: 0.3, ground: true },
        impact: { ring: 4.0, crack: 2.0, dust: 18, shake: 0.12 } },
      // The signature: a long crouch, a leap high along his locked aim, a crash that rings the ground. Long recovery.
      { id: 'varnLeap', name: 'Judgement Leap', anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 1.8, commit: 0.45 }, poseScale: 1.4, rollOnly: true, minRange: 4, chance: 0.35,
        hits: [{ startup: 1.9, active: 0.16, follow: 0.5, leap: { from: 0.45, max: 13, short: 1.4 } }], recovery: 2.0,
        damage: 60, poise: 90, knock: 12, lunge: 0, range: 13, box: { w: 5.0, h: 2.4, d: 5.0, fwd: 0.6, y: 1.0 },
        impact: { ring: 6.0, crack: 2.6, dust: 26, shake: 0.2 } },
      // ---- Knell of Ash: the same moves, faster and fiercer ----
      { id: 'knellSweep', name: 'Burning Sweep', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 3.2, commit: 0.65 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.35,
        hits: [{ startup: 0.95, active: 0.14, follow: 0.34 }], recovery: 0.7,
        damage: 42, poise: 60, knock: 8, lunge: 1.4, range: 3.6, box: { w: 5.4, h: 2.0, d: 3.8, fwd: 2.0, y: 1.2 } },
      { id: 'knellCleave', name: 'Two-Step Cleave', anim: 'sweep', pose: 'enemyDoubleSlash', tracking: { rate: 3.4, commit: 0.7 }, markers: [{ event: 'glint', parry: true }, { event: 'glint', parry: true, hit: 1 }], poseScale: 1.3,
        hits: [{ startup: 0.75, active: 0.13, follow: 0.12 }, { startup: 0.5, active: 0.13, follow: 0.26 }], recovery: 0.7,
        damage: 32, poise: 45, knock: 6, lunge: 2.4, range: 3.1, box: { w: 3.8, h: 1.8, d: 3.4, fwd: 1.8, y: 1.2 } },
      { id: 'knellDelay', name: "Warden's Delay", anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 3.0, commit: 0.55 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.4,
        hits: [{ startup: 1.3, active: 0.14, follow: 0.36, hold: { at: 0.5, time: [0.6, 1.4], chance: 0.8 } }], recovery: 0.9,
        damage: 56, poise: 80, knock: 9, lunge: 1.8, range: 3.3, box: { w: 1.9, h: 3.0, d: 4.0, fwd: 2.2, y: 1.2 },
        impact: { ring: 3.4, crack: 1.8, dust: 18, shake: 0.12 } },
      { id: 'knellLunge', name: 'Shackle Lunge', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 3.4, commit: 0.4 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.2, minRange: 5, dash: { speed: 12.5, from: 0.45 }, chance: 0.8,
        hits: [{ startup: 0.95, active: 0.16, follow: 0.24 }], recovery: 0.75,
        damage: 38, poise: 55, knock: 8, lunge: 2.8, range: 13, box: { w: 1.5, h: 1.8, d: 3.4, fwd: 2.0, y: 1.2 } },
      { id: 'knellStomp', name: 'Key-Ring Stomp', anim: 'stomp', pose: 'enemyStomp', tracking: { rate: 2.0, commit: 0.5 }, poseScale: 1.25, rollOnly: true, chance: 0.45,
        hits: [{ startup: 1.15, active: 0.14, follow: 0.36 }], recovery: 1.0,
        damage: 46, poise: 70, knock: 10, lunge: 0, range: 2.8, box: { w: 6.4, h: 0.6, d: 6.4, fwd: 0.3, y: 0.3, ground: true },
        impact: { ring: 5.0, crack: 2.4, dust: 22, shake: 0.14 } },
      { id: 'knellLeap', name: 'Judgement Leap', anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 2.6, commit: 0.45 }, poseScale: 1.45, rollOnly: true, minRange: 4, chance: 0.45,
        hits: [{ startup: 1.7, active: 0.16, follow: 0.45, leap: { from: 0.45, max: 14, short: 1.4 } }], recovery: 1.5,
        damage: 64, poise: 90, knock: 12, lunge: 0, range: 14, box: { w: 5.6, h: 2.4, d: 5.6, fwd: 0.6, y: 1.0 },
        impact: { ring: 7.0, crack: 3.0, dust: 30, shake: 0.22 } },
      // ---- Knell of Ash: new attacks ----
      // Four cuts, the last held a beat before it falls. Every cut can be parried.
      { id: 'tollingChain', name: 'Tolling Chain', anim: 'sweep', pose: 'knellChain', tracking: { rate: 3.4, commit: 0.72 }, poseScale: 1.3, chance: 0.9,
        markers: [{ event: 'glint', parry: true }, { event: 'glint', parry: true, hit: 1 }, { event: 'glint', parry: true, hit: 2 }, { event: 'glint', parry: true, hit: 3 }],
        hits: [{ startup: 0.72, active: 0.13, follow: 0.1 }, { startup: 0.45, active: 0.13, follow: 0.1 }, { startup: 0.45, active: 0.13, follow: 0.1 },
               { startup: 0.95, active: 0.15, follow: 0.36, hold: { at: 0.5, time: [0.3, 0.8], chance: 0.6 } }], recovery: 1.0,
        damage: 28, poise: 40, knock: 6, lunge: 1.8, range: 3.0, box: { w: 3.6, h: 1.8, d: 3.2, fwd: 1.8, y: 1.2 } },
      // A ground slash that throws a burning wave along the floor: sidestep or roll it.
      { id: 'ashWave', name: 'Ash Wave', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 2.6, commit: 0.8 }, poseScale: 1.3, minRange: 4, chance: 0.5,
        projectile: { speed: 15, gravity: 0, size: 0.6, look: 'slash' },
        hits: [{ startup: 1.15, active: 0.05, follow: 0.3 }], recovery: 0.9,
        damage: 34, poise: 45, knock: 7, lunge: 0, range: 20, box: { w: 1, h: 1, d: 1, fwd: 1, y: 0.8 } },
      // A rising cut that throws him into a short leap and a burning crash.
      { id: 'burningAscent', name: 'Burning Ascent', anim: 'chop', pose: 'risingCrash', tracking: { rate: 2.6, commit: 0.6 }, poseScale: 1.35, rollOnly: true, chance: 0.4,
        hits: [{ startup: 0.85, active: 0.14, follow: 0.12 }, { startup: 1.1, active: 0.16, follow: 0.45, leap: { from: 0.3, max: 9, short: 1.4 },
          box: { w: 5.0, h: 2.4, d: 5.0, fwd: 0.6, y: 1.0 }, impact: { ring: 5.0, crack: 2.2, dust: 22, shake: 0.16 } }], recovery: 1.5,
        damage: 40, poise: 70, knock: 9, lunge: 1.6, range: 3.2, box: { w: 2.6, h: 2.8, d: 3.0, fwd: 1.8, y: 1.3 } },
      // The big one: he plants the blade; three tolls send three rings of fire out across the room (roll each as it
      // reaches you), then a blast close round him. Long recovery after.
      { id: 'lastToll', name: 'The Last Toll', anim: 'stomp', pose: 'tollingStamp', tracking: { rate: 1.6, commit: 0.4 }, poseScale: 1.3, rollOnly: true, chance: 0.25,
        markers: [{ at: 'windup', t: 0, event: 'sound', sound: 'bellToll', vel: 1 }, { at: 'windup', t: 0, hit: 1, event: 'sound', sound: 'bellToll', vel: 0.9 },
                  { at: 'windup', t: 0, hit: 2, event: 'sound', sound: 'bellToll', vel: 0.9 }],
        hits: [{ startup: 1.6, active: 0.2, follow: 0.25, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 15, width: 2.2, time: 0.2 } } },
               { startup: 0.8, active: 0.2, follow: 0.25, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 15, width: 2.2, time: 0.2 } } },
               { startup: 0.8, active: 0.2, follow: 0.25, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 15, width: 2.2, time: 0.2 } } },
               { startup: 1.0, active: 0.16, follow: 0.6, box: { w: 6.4, h: 2.0, d: 6.4, fwd: 0, y: 1.0 }, impact: { ring: 6.0, crack: 3.0, dust: 30, shake: 0.22 } }],
        recovery: 2.2, damage: 40, poise: 60, knock: 10, lunge: 0, range: 9, box: { w: 6.4, h: 2.0, d: 6.4, fwd: 0, y: 1.0 } },
    ],
  },
];

// The castle's archers (Level 5, v4.3.1): Rampart Bowmen with a longer reach, so they cover the courtyard and the walks.
{
  const B = ENEMY_DEFS.find(d => d.id === 'bowman');
  ENEMY_DEFS.push({ ...B, id: 'castleBowman', name: 'Castle Bowman', description: 'A rampart archer of the castle. Shoots from far across the courtyard and kicks up close. Block the bolts and close the gap.',
    attacks: B.attacks.map(a => a.id === 'bowShot' ? { ...a, id: 'castleShot', projectile: { ...a.projectile, speed: 28 }, range: 34 } : a) });
}

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
