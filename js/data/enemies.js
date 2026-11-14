'use strict';
// Arena menu order. New enemies can go anywhere: levels refer to them by id.
// Attacks are four-phase (js/attack-anim.js; format in js/data/player.js): `pose` key poses, `tracking` (turn rate and
// the share of each wind-up spent turning before the aim locks), parry glints at the window, and optional `hold` on a
// hit: a delayed attack that freezes, clearly still, at `at` of its wind-up for `time` s with `chance`.
const ENEMY_DEFS = [
  {
    id: 'hollow', name: 'Hollow Soldier', description: 'A shambling swordsman. Readable, honest, a fair first duel.',
    scale: 1.0, bulk: 1.0, radius: 0.4, color: 0x8a6a45, weapon: 'sword', idle: 'guard', model: 'hollowSoldier',
    visual: { skin: 0xa39d8f, bareArms: true, roughness: 0.85 },   // ashen, leathery
    hp: 110, poise: 50, speed: 2.7, turnRate: 5, trackRate: 2.2,
    cooldown: [0.63, 1.4], flinchTime: 0.24, staggerTime: 1.1, parriedTime: 1.7,
    attacks: [
      // Four-phase (js/attack-anim.js): tracks the player for `tracking.commit` of the wind-up, then locks its aim;
      // the blade glints as the parry window opens. Was 0.62 / 0.14, recovery 0.65.
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
    id: 'knight', model: 'undeadKnight', name: 'Undead Knight', description: 'Slow, armored, patient. Its greatsword ends careless fights.',
    scale: 1.3, bulk: 1.3, radius: 0.6, color: 0x7b8088, weapon: 'sword', offhand: 'shield', idle: 'still',
    visual: { skin: 0x6e737a, skinMetal: 0.2, metal: 0.3, roughness: 0.5 },   // worn steel, helmed
    hp: 240, poise: 120, speed: 1.9, turnRate: 3.2, trackRate: 1.2,
    cooldown: [0.98, 1.96], flinchTime: 0, staggerTime: 1.2, parriedTime: 1.8,
    // Stagger meter (shown under its health bar), replacing poise: hits never interrupt it until the meter
    // fills (2 heavy, or 3 light; v4.2.1, was heavy 60 / light 45), then it kneels, open, for `breakTime`.
    // Drains at `decay`/s once `decayDelay` s pass without a hit. A jump heavy fills the meter as a heavy.
    stagger: { max: 100, heavy: 50, light: 15, breakers: ['heavy', 'jumpHeavy'], decayDelay: 2.5, decay: 11.2,
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
  // The Giant Skeleton: its own file since pass 72 (js/data/bosses/giant-skeleton.js).
  {
    id: 'warden', model: 'ironWarden', name: 'Shield Warden', description: 'Hides behind a great shield. Circle it, parry it, or batter its guard down.',
    scale: 1.12, bulk: 1.15, radius: 0.48, color: 0x56636e, weapon: 'sword', offhand: 'kite', idle: 'still',
    visual: { skin: 0x5c6670, skinMetal: 0.15, metal: 0.25, roughness: 0.55 },   // blued steel, helmed
    hp: 140, poise: 85, speed: 2.2, turnRate: 2.6, trackRate: 1.5,
    cooldown: [0.84, 1.68], flinchTime: 0.2, staggerTime: 1.15, parriedTime: 1.75,
    // Shield guard: hits from within `arc` (rad) of its facing are blocked (taking `damageMul` of the damage)
    // while the shield is up: not attacking, and not stepping in to strike within `lowerReach` of its shortest reach.
    // Every hit, blocked or not, fills a visible guard meter instead of poise: `heavy` for a `breakers`
    // attack, `light` otherwise (a jump heavy counts as heavy). At `max` the guard breaks (3 heavy, 1 heavy + 2 light,
    // or 4 light; v4.2.1, was heavy 50 / light 34).
    // Hits taken on the shield fill only `blockedMul` of that, so flanking or punishing swings breaks it far faster.
    // The meter drains at `decay`/s once `decayDelay` s pass without a hit.
    guard: { arc: 0.9, damageMul: 0.35, knockMul: 0.3, lowerReach: 1.0, blockedMul: 0.4, breakers: ['heavy', 'jumpHeavy'],
             max: 100, heavy: 42, light: 12, decayDelay: 2.5, decay: 9.6, breakTime: 2.4, hitstop: 0.14 },
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
    id: 'executioner', model: 'ashExecutioner', name: 'Executioner', description: 'A towering executioner in feathered scale with a blood-stained greataxe. Its chop follows you; its spin cannot be blocked. Roll late, hit heavy.',
    scale: 1.5, bulk: 1.3, radius: 0.68, color: 0x6a645c, weapon: 'greataxe', idle: 'still',
    visual: { skin: 0xb87654, roughness: 0.65, rim: 0.7 },
    hp: 320, poise: 140, speed: 1.8, turnRate: 2.8, trackRate: 1.0,
    cooldown: [1.12, 2.1], flinchTime: 0, staggerTime: 1.3, parriedTime: 1.9,
    // Stagger meter: never interrupted until it fills; heavy hits fill it far faster (three heavies, or five light hits;
    // v4.2.1, was heavy 45 / light 28).
    stagger: { max: 100, heavy: 40, light: 10, breakers: ['heavy', 'jumpHeavy'], decayDelay: 2.5, decay: 9.6, breakTime: 2.2, hitstop: 0.14 },
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
    id: 'bowman', model: 'rampartBowman', name: 'Rampart Bowman', description: 'Shoots from afar and kicks up close. Block the bolts and close the gap.', autoLock: false,
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
    guard: { arc: 0.9, damageMul: 0.35, knockMul: 0.3, lowerReach: 1.0, blockedMul: 0.4, breakers: ['heavy', 'jumpHeavy'],
             max: 100, heavy: 42, light: 12, decayDelay: 2.5, decay: 9.6, breakTime: 2.4, hitstop: 0.14 },
    attacks: [
      { id: 'shoverShove', name: 'Shove', anim: 'shove', pose: 'enemyShove', tracking: { rate: 2, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], shove: true, hits: [{ startup: 1.3, active: 0.16, follow: 0.2 }], recovery: 0.75,
        damage: 8, poise: 30, knock: 26, lunge: 2.4, range: 2.0, box: { w: 1.8, h: 1.8, d: 1.6, fwd: 1.1, y: 1.0 } },
      { id: 'shoverBash', name: 'Shield Bash', anim: 'bash', pose: 'enemyBash', tracking: { rate: 2.2, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], hits: [{ startup: 0.58, active: 0.12, follow: 0.15 }], recovery: 0.62,
        damage: 16, poise: 34, knock: 8, lunge: 3.2, range: 1.7, box: { w: 1.6, h: 1.7, d: 1.5, fwd: 1.2, y: 1.2 } },
    ],
  },
  // The Bell Warden: his own file since pass 68 (js/data/bosses/bell-warden.js).
  // ---- Level 5: the castle (v4.3) ---------------------------------------------------------------------------------
  {
    // A gargoyle: carved stone that crouches on the castle's ledges (placement `perch`) and springs at whoever passes.
    // Before it moves, grit trickles and stone grinds (js/finale.js), so it never strikes unannounced.
    id: 'gargoyle', model: 'gargoyle', name: 'Gargoyle', description: 'Carved stone that crouches on the ledges and springs when you pass. Grit falls before it moves. Few hits break it, but it hits hard.',
    scale: 1.05, bulk: 1.1, radius: 0.48, color: 0x262422, weapon: 'none', idle: 'twitch',
    visual: { skin: 0x2e2b28, roughness: 0.75 },
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
    scale: 1.65, bulk: 1.25, radius: 0.72, color: 0xb88c42, weapon: 'halberd', idle: 'still',
    visual: { skin: 0x9e723c, skinMetal: 0.55, metal: 0.65, roughness: 0.38, rim: 0.9 },
    hp: 520, poise: 200, speed: 1.8, turnRate: 2.8, trackRate: 1.2, approach: 0.45,
    cooldown: [1.1, 2.1], flinchTime: 0, staggerTime: 1.3, parriedTime: 1.9,
    stagger: { max: 100, heavy: 34, light: 9, breakers: ['heavy', 'jumpHeavy'], decayDelay: 2.5, decay: 9.6, breakTime: 2.4, hitstop: 0.16 },
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
    // The Toll Wisp: a bell-ringer's soul in its old robe and wide hat, bound to a handbell (STORY.md). It rings before every shot (the cue to move).
    id: 'wisp', model: 'tollWisp', name: 'Toll Wisp', description: "A bell-ringer's soul in its old robe, bound to a handbell. It rings before it shoots. Fragile: close in and cut it down.", autoLock: false,
    scale: 0.9, bulk: 0.96, radius: 0.36, color: 0x8a6432, weapon: 'none', idle: 'sway',
    visual: { skin: 0x9e9484, roughness: 0.75 },
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
    id: 'varn', model: 'varn', name: 'Aldric, the Gaoler King',
    description: 'Aldric, king of Ashmere, who took the Undying Ember to cheat death. The bell you rang has called him out. Learn his sweep, his cleave, his delayed overhead and his leap; in the end he burns.',
    scale: 1.75, bulk: 1.25, radius: 0.78, color: 0x5a4a36, weapon: 'sword', idle: 'guard',
    visual: { skin: 0x5a5048, skinMetal: 0.45, metal: 0.4, roughness: 0.45, rim: 0.9 },
    hp: 1600, poise: 240, speed: 2.1, turnRate: 3.0, trackRate: 1.5, approach: 0.45, kite: 0.2,   // v7.65.0: a skilled player alone beats it in about a minute (tools/bot-fights.cjs, BOTS=1 CLEAN=1)
    cooldown: [2.8, 5.2], flinchTime: 0, staggerTime: 1.5, parriedTime: 2.0, deathFade: 7,
    posture: { max: 91, parry: 26, chainGap: 1.8, chainMul: 1.35, decay: 4.5, breakTime: 3.4, hitstop: 0.22 },
    defaultPhases: ['throne', 'knell'],   // a duel from the Enemies menu fights the throne room's two bars
    phases: {
      // Outside: slower and readable, teaching his style. Ends in a retreat (the placement's `boss.retreat`).
      field: { hp: 1600, cooldown: [3, 5.6], approach: 0.35, kite: 0.25, speed: 2.0,
        attacks: ['varnSweep', 'varnCleave', 'varnDelay', 'varnLunge', 'varnShoulder', 'varnStomp', 'varnLeap'] },
      // The throne room's first bar: the same moves, pressed harder.
      throne: { hp: 1600, cooldown: [2.1, 4], approach: 0.6, kite: 0, speed: 2.2,
        attacks: ['varnSweep', 'varnCleave', 'varnDelay', 'varnLunge', 'varnShoulder', 'varnStomp', 'varnLeap'] },
      // After the transition (15 s, invulnerable): faster, longer, fiercer tracking in the wind-ups (commit points
      // unchanged), and four new attacks.
      knell: { name: 'Aldric, the Ember-Crowned', hp: 1700, transition: 15, ignite: true, cooldown: [1.6, 3.0], approach: 0.85, kite: 0, speed: 2.7,
        turnRate: 3.6, trackRate: 2.2, parriedTime: 1.7,
        posture: { max: 105, parry: 24, chainGap: 1.8, chainMul: 1.3, decay: 5, breakTime: 3.0, hitstop: 0.22 },
        attacks: ['knellSweep', 'knellCleave', 'knellDelay', 'knellLunge', 'knellStomp', 'knellLeap', 'tollingChain', 'ashWave', 'burningAscent', 'lastToll'] },
    },
    attacks: [
      // ---- the field and throne moves ----
      { id: 'varnSweep', name: 'Gaol Sweep', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 2.2, commit: 0.65 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.3,
        hits: [{ startup: 1.2, active: 0.14, follow: 0.38 }], recovery: 2,
        damage: 38, poise: 60, knock: 8, lunge: 1.2, range: 3.4, box: { w: 5.0, h: 2.0, d: 3.6, fwd: 2.0, y: 1.2 } },
      { id: 'varnCleave', name: 'Two-Step Cleave', anim: 'sweep', pose: 'enemyDoubleSlash', tracking: { rate: 2.6, commit: 0.7 }, markers: [{ event: 'glint', parry: true }, { event: 'glint', parry: true, hit: 1 }], poseScale: 1.25,
        hits: [{ startup: 0.9, active: 0.13, follow: 0.64 }, { startup: 0.62, active: 0.13, follow: 0.3 }], recovery: 1.9,
        damage: 30, poise: 45, knock: 6, lunge: 2.2, range: 3.0, box: { w: 3.6, h: 1.8, d: 3.2, fwd: 1.8, y: 1.2 } },
      { id: 'varnDelay', name: "Warden's Delay", anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 2.2, commit: 0.55 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.35,
        hits: [{ startup: 1.5, active: 0.14, follow: 0.4, hold: { at: 0.5, time: [0.5, 1.2], chance: 0.75 } }], recovery: 2.3,
        damage: 52, poise: 80, knock: 9, lunge: 1.6, range: 3.2, box: { w: 1.8, h: 3.0, d: 3.8, fwd: 2.2, y: 1.2 },
        impact: { ring: 2.8, crack: 1.6, dust: 14, shake: 0.1 } },
      { id: 'varnLunge', name: 'Shackle Lunge', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 2.6, commit: 0.4 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.15, minRange: 5, dash: { speed: 11, from: 0.45 }, chance: 0.7,
        hits: [{ startup: 1.1, active: 0.16, follow: 0.26 }], recovery: 1.9,
        damage: 36, poise: 55, knock: 8, lunge: 2.6, range: 12, box: { w: 1.4, h: 1.8, d: 3.2, fwd: 2.0, y: 1.2 } },
      { id: 'varnShoulder', name: 'Iron Shoulder', anim: 'shove', pose: 'enemyShove', tracking: { rate: 2.2, commit: 0.7 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.2, shove: true, chance: 0.35,
        hits: [{ startup: 0.85, active: 0.14, follow: 0.2 }], recovery: 1.5,
        damage: 16, poise: 40, knock: 18, lunge: 2.4, range: 2.2, box: { w: 2.6, h: 2.2, d: 2.0, fwd: 1.4, y: 1.2 } },
      { id: 'varnStomp', name: 'Key-Ring Stomp', anim: 'stomp', pose: 'enemyStomp', tracking: { rate: 1.4, commit: 0.5 }, poseScale: 1.2, rollOnly: true, chance: 0.4,
        hits: [{ startup: 1.35, active: 0.14, follow: 0.4 }], recovery: 2.4,
        damage: 44, poise: 70, knock: 10, lunge: 0, range: 2.6, box: { w: 5.6, h: 0.6, d: 5.6, fwd: 0.3, y: 0.3, ground: true },
        impact: { ring: 4.0, crack: 2.0, dust: 18, shake: 0.12 } },
      // The signature: a long crouch, a leap high along his locked aim, a crash that rings the ground. Long recovery.
      { id: 'varnLeap', name: 'Judgement Leap', anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 1.8, commit: 0.45 }, poseScale: 1.4, rollOnly: true, minRange: 4, chance: 0.35,
        hits: [{ startup: 1.9, active: 0.16, follow: 0.5, leap: { from: 0.45, max: 13, short: 1.4 } }], recovery: 4,
        damage: 60, poise: 90, knock: 12, lunge: 0, range: 13, box: { w: 5.0, h: 0.6, d: 5.0, fwd: 0.6, y: 0.3, ground: true },
        impact: { ring: 6.0, crack: 2.6, dust: 26, shake: 0.2 } },
      // ---- the Ember-Crowned: the same moves, faster and fiercer ----
      { id: 'knellSweep', name: 'Burning Sweep', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 3.2, commit: 0.65 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.35,
        hits: [{ startup: 0.95, active: 0.14, follow: 0.34 }], recovery: 2.2,
        damage: 34, poise: 60, knock: 8, lunge: 1.4, range: 3.6, box: { w: 5.4, h: 2.0, d: 3.8, fwd: 2.0, y: 1.2 } },
      { id: 'knellCleave', name: 'Two-Step Cleave', anim: 'sweep', pose: 'enemyDoubleSlash', tracking: { rate: 3.4, commit: 0.7 }, markers: [{ event: 'glint', parry: true }, { event: 'glint', parry: true, hit: 1 }], poseScale: 1.3,
        hits: [{ startup: 0.75, active: 0.13, follow: 0.62 }, { startup: 0.5, active: 0.13, follow: 0.26 }], recovery: 2.2,
        damage: 26, poise: 45, knock: 6, lunge: 2.4, range: 3.1, box: { w: 3.8, h: 1.8, d: 3.4, fwd: 1.8, y: 1.2 } },
      { id: 'knellDelay', name: "Warden's Delay", anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 3.0, commit: 0.55 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.4,
        hits: [{ startup: 1.3, active: 0.14, follow: 0.36, hold: { at: 0.5, time: [0.6, 1.4], chance: 0.5 } }], recovery: 2.9,
        damage: 44, poise: 80, knock: 9, lunge: 1.8, range: 3.3, box: { w: 1.9, h: 3.0, d: 4.0, fwd: 2.2, y: 1.2 },
        impact: { ring: 3.4, crack: 1.8, dust: 18, shake: 0.12 } },
      { id: 'knellLunge', name: 'Shackle Lunge', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 3.4, commit: 0.4 }, markers: [{ event: 'glint', parry: true }], poseScale: 1.2, minRange: 5, dash: { speed: 12.5, from: 0.45 }, chance: 0.8,
        hits: [{ startup: 0.95, active: 0.16, follow: 0.24 }], recovery: 2.4,
        damage: 30, poise: 55, knock: 8, lunge: 2.8, range: 13, box: { w: 1.5, h: 1.8, d: 3.4, fwd: 2.0, y: 1.2 } },
      { id: 'knellStomp', name: 'Key-Ring Stomp', anim: 'stomp', pose: 'enemyStomp', tracking: { rate: 2.0, commit: 0.5 }, poseScale: 1.25, rollOnly: true, chance: 0.45,
        hits: [{ startup: 1.15, active: 0.14, follow: 0.36 }], recovery: 3.2,
        damage: 36, poise: 70, knock: 10, lunge: 0, range: 2.8, box: { w: 6.4, h: 0.6, d: 6.4, fwd: 0.3, y: 0.3, ground: true },
        impact: { ring: 5.0, crack: 2.4, dust: 22, shake: 0.14 } },
      { id: 'knellLeap', name: 'Judgement Leap', anim: 'chop', pose: 'hollowOverhead', tracking: { rate: 2.6, commit: 0.45 }, poseScale: 1.45, rollOnly: true, minRange: 4, chance: 0.25,
        hits: [{ startup: 1.7, active: 0.16, follow: 0.45, leap: { from: 0.45, max: 14, short: 1.4 } }], recovery: 4.8,
        damage: 50, poise: 90, knock: 12, lunge: 0, range: 14, box: { w: 5.6, h: 0.6, d: 5.6, fwd: 0.6, y: 0.3, ground: true },
        impact: { ring: 7.0, crack: 3.0, dust: 30, shake: 0.22 } },
      // ---- the Ember-Crowned: new attacks ----
      // Four cuts, the last held a beat before it falls. Every cut can be parried.
      { id: 'tollingChain', name: 'Tolling Chain', anim: 'sweep', pose: 'knellChain', tracking: { rate: 3.4, commit: 0.72 }, poseScale: 1.3, chance: 0.9,
        markers: [{ event: 'glint', parry: true }, { event: 'glint', parry: true, hit: 1 }, { event: 'glint', parry: true, hit: 2 }, { event: 'glint', parry: true, hit: 3 }],
        hits: [{ startup: 0.72, active: 0.13, follow: 0.6 }, { startup: 0.45, active: 0.13, follow: 0.6 }, { startup: 0.45, active: 0.13, follow: 0.6 },
               { startup: 0.95, active: 0.15, follow: 0.36, hold: { at: 0.5, time: [0.3, 0.8], chance: 0.6 } }], recovery: 3.2,
        damage: 22, poise: 40, knock: 6, lunge: 1.8, range: 3.0, box: { w: 3.6, h: 1.8, d: 3.2, fwd: 1.8, y: 1.2 } },
      // A ground slash that throws a burning wave along the floor: sidestep or roll it.
      { id: 'ashWave', name: 'Ash Wave', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 2.6, commit: 0.8 }, poseScale: 1.3, minRange: 4, chance: 0.5,
        projectile: { speed: 15, gravity: 0, size: 0.6, look: 'slash' },
        hits: [{ startup: 1.15, active: 0.05, follow: 0.3 }], recovery: 2.9,
        damage: 28, poise: 45, knock: 7, lunge: 0, range: 20, box: { w: 1, h: 1, d: 1, fwd: 1, y: 0.8 } },
      // A rising cut that throws him into a short leap and a burning crash.
      { id: 'burningAscent', name: 'Burning Ascent', anim: 'chop', pose: 'risingCrash', tracking: { rate: 2.6, commit: 0.6 }, poseScale: 1.35, rollOnly: true, chance: 0.4,
        hits: [{ startup: 0.85, active: 0.14, follow: 0.62 }, { startup: 1.1, active: 0.16, follow: 0.45, leap: { from: 0.3, max: 9, short: 1.4 },
          box: { w: 5.0, h: 0.6, d: 5.0, fwd: 0.6, y: 0.3, ground: true }, impact: { ring: 5.0, crack: 2.2, dust: 22, shake: 0.16 } }], recovery: 4.8,
        damage: 32, poise: 70, knock: 9, lunge: 1.6, range: 3.2, box: { w: 2.6, h: 2.8, d: 3.0, fwd: 1.8, y: 1.3 } },
      // The big one: he plants the blade; three tolls send three rings of fire out across the room (roll each as it
      // reaches you), then a blast close round him. Long recovery after.
      { id: 'lastToll', name: 'The Last Toll', anim: 'stomp', pose: 'tollingStamp', tracking: { rate: 1.6, commit: 0.4 }, poseScale: 1.3, rollOnly: true, chance: 0.12,
        markers: [{ at: 'windup', t: 0, event: 'sound', sound: 'bellToll', vel: 1 }, { at: 'windup', t: 0, hit: 1, event: 'sound', sound: 'bellToll', vel: 0.9 },
                  { at: 'windup', t: 0, hit: 2, event: 'sound', sound: 'bellToll', vel: 0.9 }],
        hits: [{ startup: 1.6, active: 0.2, follow: 1.1, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 15, width: 2.2, time: 0.2 } } },
               { startup: 0.8, active: 0.2, follow: 1.1, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 15, width: 2.2, time: 0.2 } } },
               { startup: 0.8, active: 0.2, follow: 1.1, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1.5, to: 15, width: 2.2, time: 0.2 } } },
               { startup: 1.0, active: 0.16, follow: 0.6, box: { w: 6.4, h: 2.0, d: 6.4, fwd: 0, y: 1.0 }, impact: { ring: 6.0, crack: 3.0, dust: 30, shake: 0.22 } }],
        recovery: 4.4, damage: 32, poise: 60, knock: 10, lunge: 0, range: 9, box: { w: 6.4, h: 2.0, d: 6.4, fwd: 0, y: 1.0 } },
    ],
  },
];

// The castle's archers (Level 5, v4.3.1): Rampart Bowmen with a longer reach, so they cover the courtyard and the walks.
{
  const B = ENEMY_DEFS.find(d => d.id === 'bowman');
  ENEMY_DEFS.push({ ...B, id: 'castleBowman', name: 'Castle Bowman', description: 'A rampart archer of the castle. Shoots from far across the courtyard and kicks up close. Block the bolts and close the gap.',
    attacks: B.attacks.map(a => a.id === 'bowShot' ? { ...a, id: 'castleShot', projectile: { ...a.projectile, speed: 28 }, range: 34 } : a) });
}

// The Lantern Thralls of the Windward Moor (Level 7, v7.38.0; STORY.md 10c): blind herd-folk who walk in a flock after one
// who carries a lantern. Blindness is the levels' short `notice`; the bearer sees, and its alarm (`alert`) brings the
// flock. Rough stand-ins: the thrall is the Hollow Soldier's figure and moves, the bearer the Toll Wisp's, re-coloured.
{
  const H = ENEMY_DEFS.find(d => d.id === 'hollow'), W = ENEMY_DEFS.find(d => d.id === 'wisp');
  ENEMY_DEFS.push({ ...H, id: 'lanternThrall', model: 'lanternThrall', name: 'Lantern Thrall',
    description: 'Blind, smiling herd-folk of Thrale who walk close after a lantern. They find you by the lantern\'s eyes, or by your step.',
    color: 0x7a7464, visual: { ...H.visual, skin: 0xb8b2a4 }, hp: 90, speed: 2.4, turnRate: 4.2, trackRate: 1.9, cooldown: [0.8, 1.6],
    attacks: H.attacks.map(a => ({ ...a, id: a.id === 'swing' ? 'thrallSwing' : 'thrallOverhead', name: a.id === 'swing' ? 'Herder\'s Swing' : 'Overhead Chop' })) });
  ENEMY_DEFS.push({ ...W, id: 'lanternBearer', model: 'lanternBearer', name: 'Lantern-Bearer',
    description: 'The one thrall of the flock who sees, and carries the light the others follow. When it sees you, the flock comes. Its flare can be blocked: close in and cut it down.',
    color: 0x8a6a3a, hp: 70, autoLock: true,   // the one to cut down first, so lock-on takes it
    // the handbell's toll before the flare stays the cue to move (its stand-in figure holds the bell)
    attacks: W.attacks.map(a => a.id === 'wispBolt' ? { ...a, id: 'bearerFlare', name: 'Lantern Flare' } : { ...a, id: 'bearerPush', name: 'Lantern Shove' }) });
}

// The Salt Knights of Saltgrave (Level 8, v7.40.0; STORY.md 10d): the fortress's garrison, their armour crusted white by
// the sea wind. Heavier than Ashmere's knights and slower to turn. Rough stand-in: the Undead Knight's figure and moves,
// salt-white.
{
  const K = ENEMY_DEFS.find(d => d.id === 'knight');
  ENEMY_DEFS.push({ ...K, id: 'saltKnight', model: 'saltKnight', name: 'Salt Knight',
    description: 'Saltgrave\'s garrison, still keeping the walls, armour crusted white by the sea wind. Heavy, slow to turn: step round it.',
    color: 0xb8b6ac, visual: { ...K.visual, skin: 0xb0aea4 }, hp: 290, poise: 150, turnRate: 2.6, trackRate: 1.0 });
}

// The Keyless of the Night Gaol (Level 9, v7.42.0; STORY.md 10e): prisoners whose cells fell open long ago, who never went
// out. They walk in their chains: slower than a Hollow Soldier, harder to stagger, and the chain's weight is in every
// blow. Rough stand-in: the Hollow Soldier's figure and moves, starlit grey under rusted fetters.
{
  const H = ENEMY_DEFS.find(d => d.id === 'hollow');
  ENEMY_DEFS.push({ ...H, id: 'keyless', model: 'keyless', name: 'Keyless',
    description: 'Prisoners of the Night Gaol whose doors fell open long ago. They never went out. Slow in their chains, hard to stagger, and the chain\'s weight is in every blow.',
    color: 0x6a6e78, visual: { ...H.visual, skin: 0x9aa0aa }, hp: 140, poise: 75, speed: 2.1, turnRate: 4.0, trackRate: 1.8, cooldown: [0.9, 1.7],
    attacks: H.attacks.map(a => ({ ...a, id: a.id === 'swing' ? 'fetterSwing' : 'chainChop', name: a.id === 'swing' ? 'Fetter Swing' : 'Chain Chop',
      damage: Math.round(a.damage * 1.15), poise: Math.round(a.poise * 1.2) })) });
}

// The Gilded Thralls of Aurel (Level 10, v7.44.0; STORY.md 10f): the capital's citizens, fed and smiling, gold leaf laid
// on their faces and hands, a knife in each. They smile until you are close. Quick and fragile like the Rogue, a little
// harder to put down. Rough stand-in: the Rogue's figure and moves, in gold leaf and ochre, two curved knives.
{
  const R = ENEMY_DEFS.find(d => d.id === 'rogue');
  ENEMY_DEFS.push({ ...R, id: 'gildedThrall', model: 'gildedThrall', name: 'Gilded Thrall',
    description: 'A citizen of Aurel, fed and smiling, gold leaf on the face and hands, a knife in each. Quick and fragile: the cuts glint, and a parry pays.',
    scale: 0.9, color: 0xa88a48, visual: { ...R.visual, skin: 0xd8c08a }, hp: 80, poise: 30,
    attacks: R.attacks.map(a => ({ ...a, id: a.id === 'stab' ? 'smilingStab' : 'twoKnives', name: a.id === 'stab' ? 'Smiling Stab' : 'Two Knives' })) });
}

// The Cinderfolk of Aurel in Ash (Level 11, v7.46.0; STORY.md 10g): the capital's citizens after the hunger, refused,
// burned the city it could not keep. Burned, and still walking; some lie in the ash until you pass. Slower than a Hollow
// Soldier and harder to put down. Rough stand-in: the Hollow Soldier's figure and moves, charred, embers for eyes.
{
  const H = ENEMY_DEFS.find(d => d.id === 'hollow');
  ENEMY_DEFS.push({ ...H, id: 'cinderfolk', model: 'cinderfolk', name: 'Cinderfolk',
    description: 'Citizens of Aurel, burned when the city burned, and still walking. Some lie in the ash until you pass. Slow, hard to put down; a parry pays.',
    color: 0x4a4440, visual: { ...H.visual, skin: 0x6a625a }, hp: 130, poise: 60, speed: 2.3, turnRate: 4.4, trackRate: 2.0, cooldown: [0.8, 1.6],
    attacks: H.attacks.map(a => ({ ...a, id: a.id === 'swing' ? 'cinderSwing' : 'fallingBrand', name: a.id === 'swing' ? 'Cinder Swing' : 'Falling Brand',
      damage: Math.round(a.damage * 1.1), poise: Math.round(a.poise * 1.15) })) });
}

// The Drowned of the Still Mere (Level 14, v7.51.0; STORY.md 10j): thralls of Thrale who walked into the one water that
// never burned, so the hunger would have nothing left to hold, and stayed under. They lie in the shallows until you
// pass. Slow, heavy with water, hard to stagger. Rough stand-in: the Hollow Soldier's figure and moves, waterlogged.
{
  const H = ENEMY_DEFS.find(d => d.id === 'hollow');
  ENEMY_DEFS.push({ ...H, id: 'drowned', model: 'drowned', name: 'Drowned',
    description: 'Thralls who walked into the one water in Thrale that never burned, so the hunger would have nothing to hold, and stayed under. They lie in the shallows until you pass. Slow, heavy with water, hard to stagger.',
    color: 0x5a6a72, visual: { ...H.visual, skin: 0x8a9aa2 }, hp: 140, poise: 80, speed: 2.0, turnRate: 4.0, trackRate: 1.8, cooldown: [0.9, 1.7],
    attacks: H.attacks.map(a => ({ ...a, id: a.id === 'swing' ? 'soddenSwing' : 'fallingWeight', name: a.id === 'swing' ? 'Sodden Swing' : 'Falling Weight',
      damage: Math.round(a.damage * 1.15), poise: Math.round(a.poise * 1.2) })) });
}

// Training dummies (developer rooms and tests; the Training Hall that used them is gone since v7.19.0): same humanoid primitives. They never move or aggro, never die,
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
  // The execution dummy (v5.2; large, with its stagger bar shown, v5.4.5): any attack fills its meter (two heavies or
  // three lights). It kneels for a long `breakTime`, so there is time to step in front of it and execute; it never dies.
  { id: 'executionDummy', name: 'Execution Dummy', scale: 1.5, bulk: 1.3, radius: 0.6, color: 0x6a4a3a, weapon: 'none', visual: { skin: 0x8a7650, roughness: 0.95 },
    hp: 300, poise: Infinity, flinchTime: 0, parriedTime: 1.6, attacks: [],
    stagger: { max: 100, heavy: 55, light: 36, breakers: ['heavy', 'jumpHeavy'], showBar: true, decayDelay: 4, decay: 8, breakTime: 4.5, hitstop: 0.14 } },
  // The Ability Grounds' great mannequins (v7.76.0): boss-sized, with a boss's health and the big bar at the top
  // (`bossBar`). The bar runs out like a boss's, holds empty for `refill.delay` s, then fills again over `refill.time` s.
  // The sparring one swings its slow, telegraphed blow at boss reach, for the abilities a parry or a dodge sets off.
  { id: 'greatDummy', name: 'Great Mannequin', scale: 2.1, bulk: 1.25, radius: 0.95, color: 0x7a6440, weapon: 'none', visual: { skin: 0x8a7650, roughness: 0.95 },
    hp: 3000, poise: Infinity, flinchTime: 0, parriedTime: 1.6, attacks: [], bossBar: true, refill: { delay: 1.5, time: 1.2 } },
  { ...SPARRING_DUMMY, id: 'greatSparringDummy', name: 'Great Sparring Mannequin', scale: 2.1, bulk: 1.25, radius: 0.95, hp: 3000,
    bossBar: true, refill: { delay: 1.5, time: 1.2 },
    attacks: SPARRING_DUMMY.attacks.map(a => ({ ...a, id: 'greatTrainingSwing', name: 'Great Training Swing', range: 5.5,
      box: { w: 2.4, h: 4.8, d: 4.6, fwd: 2.8, y: 2.4 } })) },
];
const ENEMY_BY_ID = Object.fromEntries([...ENEMY_DEFS, ...TRAINING_DEFS, ...TEST_DEFS].map(d => [d.id, d]));
// A boss (the big bar at the top, no overhead bar): posture or phases. Practice lists them apart from the enemies.
const isBossDef = d => !!d && !!(d.posture || d.phases);
