'use strict';
// ============================================================================
// 2. Data: player, items, enemies, levels
// ============================================================================
// Everything here is referenced by id (never by list position) and checked at load by validateData().
//
// Attack format, shared by the player and every enemy:
//   id, anim (a name in ANIMS), hits: [{ startup, active }] (one per strike), recovery,
//   damage, poise, knock, lunge, box: hit volume in the attacker's frame
//     (w side, h up, d forward, centred `fwd` ahead and `y` up).
//   Optional: hitstop (default scales with damage), cost (stamina), range (enemy AI: start the attack
//   within this distance), postureDmg (fills a boss's posture), riposte: { damage, poise } multipliers
//   after a parry, air: jump-attack landing data (the active phase lasts until touchdown).
//   Four-phase animation (js/attack-anim.js): a hit may add `follow` (s of follow-through after the active phase, no
//   hitbox); `pose` (an ATTACK_POSES id, js/data/attack-poses.js) draws it from key poses; markers: [{ at: 'windup' |
//   'active' | 'follow' | 'recovery', t: 0..1 through that phase, hit?: index, event: 'sound' | 'shake' | 'glint', ... }].

const ITEMS = {
  flask: { name: 'Flask', action: 'flask', useTime: 1.3, heal: 45, healStart: 0.35, healDuration: 0.8, refillOnRest: true },
};

const PLAYER_DEF = {
  name: 'Knight', radius: 0.36,
  look: { scale: 1.0, bulk: 1.0, color: 0xb59a5a, weapon: 'sword', weaponColor: 0xb8bcc4, model: 'wanderer',
          visual: { skin: 0x8a867c, skinMetal: 0.15, roughness: 0.7 } },   // helmed knight
  stats: { maxHp: 120, maxStamina: 160, maxPoise: 30 },
  inventory: [{ item: 'flask', count: 4, max: 4 }],
  moveset: {
    ground: { light: 'light', heavy: 'heavy' },        // input action -> attack id
    air: { light: 'jumpLight', heavy: 'jumpHeavy' },
    attacks: {
      // Four-phase (js/attack-anim.js): wind-up, strike (hitbox on), follow-through, recovery. Was 0.22 / 0.12 / 0.34
      // (docs/combat-timings-v4.1.md).
      // Light combo: diagonal -> backhand -> overhead finisher (`next`: the attack a press during this one chains into).
      light: { id: 'light', anim: 'sweep', pose: 'lightDiagonal', hits: [{ startup: 0.3, active: 0.1, follow: 0.14 }], recovery: 0.26, cost: 16,
               next: { light: 'light2' },
               markers: [{ at: 'windup', t: 0.7, event: 'sound', sound: 'swingLight', vel: 0.55 }, { at: 'active', t: 0, event: 'glint' }],
               damage: 18, poise: 22, postureDmg: 9, knock: 3, lunge: 2.4, hitstop: 0.07, riposte: { damage: 2.4 },
               box: { w: 2.0, h: 1.6, d: 1.9, fwd: 1.25, y: 1.1 } },
      light2: { id: 'light2', anim: 'sweep', pose: 'lightBackhand', hits: [{ startup: 0.26, active: 0.1, follow: 0.14 }], recovery: 0.28, cost: 16,
                next: { light: 'light3' },
                markers: [{ at: 'windup', t: 0.65, event: 'sound', sound: 'swingLight', vel: 0.55 }, { at: 'active', t: 0, event: 'glint' }],
                damage: 18, poise: 22, postureDmg: 9, knock: 3, lunge: 2.2, hitstop: 0.07, riposte: { damage: 2.4 },
                box: { w: 2.0, h: 1.6, d: 1.9, fwd: 1.25, y: 1.1 } },
      light3: { id: 'light3', anim: 'overhead', pose: 'lightOverhead', hits: [{ startup: 0.38, active: 0.12, follow: 0.18 }], recovery: 0.36, cost: 16,
                next: { light: 'light' },
                markers: [{ at: 'windup', t: 0.75, event: 'sound', sound: 'swingLight', vel: 0.7 }, { at: 'active', t: 0, event: 'glint' }],
                damage: 18, poise: 22, postureDmg: 9, knock: 3, lunge: 2.6, hitstop: 0.08, riposte: { damage: 2.4 },
                box: { w: 1.4, h: 2.2, d: 2.2, fwd: 1.35, y: 1.2 } },
      // Heavy: hold the button to stop at `charge.at` of the wind-up, coiling for up to `hold` s; up to `mul` x damage.
      // Was 0.56 / 0.16, recovery 0.64 (docs/combat-timings-v4.1.md).
      heavy: { id: 'heavy', anim: 'overhead', pose: 'heavyOverhead', hits: [{ startup: 0.62, active: 0.14, follow: 0.22 }], recovery: 0.5, cost: 40,
               charge: { action: 'heavy', at: 0.7, hold: 0.9, mul: 1.5, hitstopMul: 1.4 },
               markers: [{ at: 'windup', t: 0.8, event: 'sound', sound: 'swingHeavy', vel: 0.8 }, { at: 'active', t: 0, event: 'glint' }],
               damage: 53, poise: 52, postureDmg: 24, knock: 7, lunge: 3.2, hitstop: 0.13, riposte: { damage: 2.6, poise: 2.5 },
               box: { w: 1.1, h: 2.6, d: 2.7, fwd: 1.55, y: 1.3 } },
      // Execution (v5.2, js/execution.js): light attack in front of a kneeling enemy. No hitbox: the damage is the
      // execution's own (CONFIG.execution.damage), dealt as the active phase opens. Wind-up: slide in and coil low;
      // active: the thrust through the chest; follow: the hold, blade inside; recovery: the pull-out.
      execute: { id: 'execute', anim: 'stab', pose: 'executeThrust', hits: [{ startup: 0.46, active: 0.08, follow: 0.5 }], recovery: 0.5,
                 markers: [{ at: 'windup', t: 0.72, event: 'sound', sound: 'swingHeavy', vel: 0.9 }, { at: 'active', t: 0, event: 'glint' },
                           { at: 'recovery', t: 0.12, event: 'sound', sound: 'hitFlesh', vel: 0.7 }],
                 damage: 0, poise: 0, knock: 0, lunge: 0, box: { w: 0.6, h: 0.6, d: 1.6, fwd: 1.0, y: 1.1 } },
      // Jump attacks: wind-up in the air, the hitbox opens while descending and lasts until landing
      // plus impactTime. `recovery` is the landing recovery (shortened by hitRecoveryMul on a hit).
      jumpLight: { id: 'jumpLight', anim: 'overhead', hits: [{ startup: 0.12, active: Infinity }], recovery: 0.42, cost: 18,
                   damage: 28, poise: 34, postureDmg: 14, knock: 3.5, lunge: 0, hitstop: 0.09, riposte: { damage: 2.4 },
                   box: { w: 1.5, h: 2.0, d: 1.8, fwd: 0.9, y: 0.1 },
                   air: { impactTime: 0.08, hitRecoveryMul: 0.85, hop: 3.2, fx: { ring: 1.6, crack: 0.75, dust: 6, shake: 0.05 } } },
      // v4.2.1 balance (was damage 52, poise 60, posture 24, cost 42, recovery 0.7, hitstop 0.15, box 2.2 x 2.6): between a
      // tapped heavy and a full charge, a tighter landing zone, a longer landing to punish a miss that a hit no longer
      // shortens. Jump heavies now fill stagger and guard meters as heavy hits (v7.3).
      jumpHeavy: { id: 'jumpHeavy', anim: 'overhead', hits: [{ startup: 0.3, active: Infinity }], recovery: 0.85, cost: 46,
                   damage: 74, poise: 70, postureDmg: 30, knock: 7, lunge: 0, hitstop: 0.13, riposte: { damage: 2.6, poise: 2.5 },
                   box: { w: 1.7, h: 2.4, d: 2.1, fwd: 1.1, y: 0.0 },
                   air: { impactTime: 0.1, hitRecoveryMul: 1, hop: 3.8, fx: { ring: 3.2, crack: 1.7, dust: 14, shake: 0.11 } } },
    },
  },
};
