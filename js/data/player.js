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
//   Optional: hitstop (default scales with damage), range (enemy AI: start the attack
//   within this distance), riposte: { damage, poise } multipliers
//   after a parry, air: jump-attack landing data (the active phase lasts until touchdown).
//   Four-phase animation (js/attack-anim.js): a hit may add `follow` (s of follow-through after the active phase, no
//   hitbox); `pose` (an ATTACK_POSES id, js/data/attack-poses.js) draws it from key poses; markers: [{ at: 'windup' |
//   'active' | 'follow' | 'recovery', t: 0..1 through that phase, hit?: index, event: 'sound' | 'shake' | 'glint', ... }].

// A flask is drunk on the move (pass 85, CONFIG.player.drinkSpeedMul), quicker than before (was 1.3 s), and a landed
// blow cuts it short.
const ITEMS = {
  flask: { name: 'Flask', action: 'flask', useTime: 0.95, heal: 45, healStart: 0.25, healDuration: 0.55, refillOnRest: true },
};

const PLAYER_DEF = {
  name: 'Knight', radius: 0.36,
  look: { scale: 1.0, bulk: 1.0, color: 0xb59a5a, weapon: 'sword', weaponColor: 0xb8bcc4, model: 'wanderer',
          visual: { skin: 0x8a867c, skinMetal: 0.15, roughness: 0.7 } },   // helmed knight
  stats: { maxHp: 120 },
  inventory: [{ item: 'flask', count: 4, max: 4 }],
  // The moveset since the player rework (pass 85, PLAN.md "First, urgent"): no attack costs anything. Pass 173 (PLAN
  // "Last", attacking pays): every blow deals 1.9x what it did (a light about 1% of a boss's bar, was 0.5%), the counter
  // 2.75x a light (was 2.25x), and the Finishing Blow came down to about 8% of a bar (CONFIG.finisher.damage). Poses borrowed from the enemies' (enemyStab, enemySpin, enemyThrust) and the string's are stand-ins until
  // the moves get their own key poses (track A, PLAN.md item 3c).
  moveset: {
    ground: { light: 'light', heavy: 'heavy' },        // input action -> attack id
    air: { light: 'jumpLight', heavy: 'jumpHeavy' },
    dash: { light: 'dashLight', heavy: 'dashHeavy' },  // an attack pressed in a dash (CONFIG.player.dashAttackFrom)
    counter: { light: 'counter' },   // pressed while a riposte is open (a perfect dodge, an opening deflect)
    attacks: {
      // Four-phase (js/attack-anim.js): wind-up, strike (hitbox on), follow-through, recovery.
      // The light string: diagonal -> backhand -> overhead -> thrust (`next`: the attack a press during this one chains
      // into). A heavy pressed at any point of it is that point's own finisher instead of a charged heavy.
      light: { id: 'light', flow: true, anim: 'sweep', pose: 'lightDiagonal', hits: [{ startup: 0.2, active: 0.08, follow: 0.1 }], recovery: 0.22,
               next: { light: 'light2', heavy: 'finisher1' },
               markers: [{ at: 'windup', t: 0.7, event: 'sound', sound: 'swingLight', vel: 0.55 }, { at: 'active', t: 0, event: 'glint' }],
               damage: 30, poise: 22, knock: 3, lunge: 2.4, hitstop: 0.06, riposte: { damage: 2.4 },
               box: { w: 2.0, h: 1.6, d: 1.9, fwd: 1.25, y: 1.1 } },
      light2: { id: 'light2', flow: true, anim: 'sweep', pose: 'lightBackhand', hits: [{ startup: 0.18, active: 0.08, follow: 0.1 }], recovery: 0.22,
                next: { light: 'light3', heavy: 'finisher2' },
                markers: [{ at: 'windup', t: 0.65, event: 'sound', sound: 'swingLight', vel: 0.55 }, { at: 'active', t: 0, event: 'glint' }],
                damage: 30, poise: 22, knock: 3, lunge: 2.2, hitstop: 0.06, riposte: { damage: 2.4 },
                box: { w: 2.0, h: 1.6, d: 1.9, fwd: 1.25, y: 1.1 } },
      light3: { id: 'light3', flow: true, anim: 'overhead', pose: 'lightOverhead', hits: [{ startup: 0.24, active: 0.09, follow: 0.12 }], recovery: 0.24,
                next: { light: 'light4', heavy: 'finisher3' },
                markers: [{ at: 'windup', t: 0.75, event: 'sound', sound: 'swingLight', vel: 0.65 }, { at: 'active', t: 0, event: 'glint' }],
                damage: 30, poise: 22, knock: 3, lunge: 2.6, hitstop: 0.07, riposte: { damage: 2.4 },
                box: { w: 1.4, h: 2.2, d: 2.2, fwd: 1.35, y: 1.2 } },
      light4: { id: 'light4', flow: true, stringEnd: true, anim: 'stab', pose: 'enemyStab', hits: [{ startup: 0.24, active: 0.09, follow: 0.12 }], recovery: 0.3,
                next: { heavy: 'finisher4' },
                markers: [{ at: 'windup', t: 0.7, event: 'sound', sound: 'swingLight', vel: 0.75 }, { at: 'active', t: 0, event: 'glint' }],
                damage: 38, poise: 26, knock: 4, lunge: 3.4, hitstop: 0.08, riposte: { damage: 2.4 },
                box: { w: 1.2, h: 1.6, d: 2.8, fwd: 1.6, y: 1.1 } },
      // Finishers: the heavy at each point of the string, each its own move, bigger the later it comes.
      finisher1: { id: 'finisher1', anim: 'sweep', pose: 'enemySpin', feel: 'heavy', hits: [{ startup: 0.26, active: 0.12, follow: 0.12 }], recovery: 0.36,
                   markers: [{ at: 'windup', t: 0.7, event: 'sound', sound: 'swingHeavy', vel: 0.7 }, { at: 'active', t: 0, event: 'glint' }],
                   damage: 57, poise: 40, knock: 5, lunge: 2.4, hitstop: 0.1, riposte: { damage: 2 },
                   box: { w: 3.4, h: 1.8, d: 3.0, fwd: 0.6, y: 1.1 } },
      finisher2: { id: 'finisher2', anim: 'stab', pose: 'enemyThrust', feel: 'heavy', hits: [{ startup: 0.28, active: 0.12, follow: 0.14 }], recovery: 0.38,
                   markers: [{ at: 'windup', t: 0.7, event: 'sound', sound: 'swingHeavy', vel: 0.75 }, { at: 'active', t: 0, event: 'glint' }],
                   damage: 68, poise: 46, knock: 6, lunge: 6.5, hitstop: 0.11, riposte: { damage: 2 },
                   box: { w: 1.2, h: 1.8, d: 3.4, fwd: 1.9, y: 1.1 } },
      finisher3: { id: 'finisher3', anim: 'overhead', pose: 'heavyOverhead', feel: 'heavy', hits: [{ startup: 0.32, active: 0.13, follow: 0.18 }], recovery: 0.42,
                   markers: [{ at: 'windup', t: 0.75, event: 'sound', sound: 'swingHeavy', vel: 0.85 }, { at: 'active', t: 0, event: 'glint' }],
                   damage: 84, poise: 56, knock: 7, lunge: 3.4, hitstop: 0.13, riposte: { damage: 2 },
                   box: { w: 1.3, h: 2.6, d: 2.8, fwd: 1.55, y: 1.3 } },
      finisher4: { id: 'finisher4', anim: 'sweep', pose: 'enemySpin', feel: 'heavy', hits: [{ startup: 0.34, active: 0.16, follow: 0.18 }], recovery: 0.48,
                   markers: [{ at: 'windup', t: 0.75, event: 'sound', sound: 'swingHeavy', vel: 1 }, { at: 'active', t: 0, event: 'glint' }],
                   damage: 106, poise: 70, knock: 9, lunge: 3, hitstop: 0.16, riposte: { damage: 2 },
                   box: { w: 3.8, h: 2.2, d: 3.6, fwd: 0.7, y: 1.2 } },
      // Heavy: hold the button to stop at `charge.at` of the wind-up, coiling for up to `hold` s; up to `mul` x damage and
      // `postureMul` x posture (a full charge is a skill move).
      heavy: { id: 'heavy', anim: 'overhead', pose: 'heavyOverhead', hits: [{ startup: 0.4, active: 0.13, follow: 0.2 }], recovery: 0.44,
               charge: { action: 'heavy', at: 0.7, hold: 0.8, mul: 1.7, postureMul: 3, hitstopMul: 1.4 },
               markers: [{ at: 'windup', t: 0.8, event: 'sound', sound: 'swingHeavy', vel: 0.8 }, { at: 'active', t: 0, event: 'glint' }],
               damage: 68, poise: 52, knock: 7, lunge: 3.2, hitstop: 0.12, riposte: { damage: 2.6, poise: 2.5 },
               box: { w: 1.1, h: 2.6, d: 2.7, fwd: 1.55, y: 1.3 } },
      // Dash attacks: out of a dash, the momentum carried into a thrust (light) or a driving lunge (heavy).
      dashLight: { id: 'dashLight', anim: 'stab', pose: 'enemyStab', hits: [{ startup: 0.12, active: 0.1, follow: 0.1 }], recovery: 0.28,
                   next: { light: 'light2', heavy: 'finisher2' },
                   markers: [{ at: 'windup', t: 0.5, event: 'sound', sound: 'swingLight', vel: 0.7 }, { at: 'active', t: 0, event: 'glint' }],
                   damage: 42, poise: 30, knock: 4, lunge: 6, hitstop: 0.08, riposte: { damage: 2.4 },
                   box: { w: 1.3, h: 1.6, d: 2.8, fwd: 1.5, y: 1.1 } },
      dashHeavy: { id: 'dashHeavy', anim: 'stab', pose: 'enemyThrust', feel: 'heavy', hits: [{ startup: 0.22, active: 0.13, follow: 0.14 }], recovery: 0.42,
                   markers: [{ at: 'windup', t: 0.6, event: 'sound', sound: 'swingHeavy', vel: 0.85 }, { at: 'active', t: 0, event: 'glint' }],
                   damage: 65, poise: 50, knock: 7, lunge: 8, hitstop: 0.12, riposte: { damage: 2 },
                   box: { w: 1.3, h: 1.8, d: 3.4, fwd: 1.8, y: 1.1 } },
      // The counter (pass 88; its own signature moves since pass 95): the riposte a perfect dodge or an opening deflect
      // allows. Light: a flash step, a low draw cut that carries the body through or past the foe (`flashStep`) and
      // holds there while the cut opens behind it (`cut`). Heavy: a rising cut in a wide arc from the ground up, held
      // high. Plain numbers as a light's and a heavy's, so a counter claimed without its riposte is worth no more than those.
      // flashStep: { past: m beyond the foe's far side, min/max: m in all, range/cone: the foe it aims for, brake: m/s^2
      // of the skid after, exit: the most m/s it leaves the step with }. cut: { kind: 'line' | 'arc', open: s after the blow its line opens } (js/counter-fx.js).
      counter: { id: 'counter', anim: 'sweep', pose: 'counterFlash', hits: [{ startup: 0.1, active: 0.14, follow: 0.26 }], recovery: 0.3,
                 next: { light: 'light2', heavy: 'finisher2' },
                 markers: [{ at: 'active', t: 0, event: 'sound', sound: 'counterFlash', vel: 1 }, { at: 'active', t: 0.5, event: 'glint' }],
                 damage: 30, poise: 24, knock: 3, lunge: 0, hitstop: 0.12, riposte: { damage: 2.75 },
                 flashStep: { past: 1.1, min: 3, max: 5.5, range: 6, cone: 0.7, brake: 60, exit: 4 }, cut: { kind: 'line', open: 0.32 },
                 box: { w: 1.8, h: 1.8, d: 2.8, fwd: 0.5, y: 1.1 } },
      // The Finishing Blow (pass 100, js/finisher.js): the counter that lands on a guard cracked twice. No hitbox: the
      // damage is its own (CONFIG.finisher.damage), dealt as the active phase opens. Wind-up: time stops for the foe and
      // the player flash-steps through it (CONFIG.finisher.steps); active: every cut opens at once; follow and recovery:
      // the held pose. About 1.2 s in all. Its look: js/finisher-fx.js (pass 103).
      finisher: { id: 'finisher', anim: 'sweep', pose: 'finisherStrike', hits: [{ startup: 0.5, active: 0.08, follow: 0.2 }], recovery: 0.28,
                  markers: [{ at: 'windup', t: 0, event: 'sound', sound: 'counterFlash', vel: 1 }, { at: 'active', t: 0, event: 'glint' },
                            { at: 'active', t: 0, event: 'sound', sound: 'hitFlesh', vel: 1 }],
                  damage: 0, poise: 0, knock: 0, lunge: 0, box: { w: 0.6, h: 0.6, d: 1.6, fwd: 1.0, y: 1.1 } },
      // Jump attacks: wind-up in the air, the hitbox opens while descending and lasts until landing
      // plus impactTime. `recovery` is the landing recovery (shortened by hitRecoveryMul on a hit).
      jumpLight: { id: 'jumpLight', anim: 'overhead', hits: [{ startup: 0.12, active: Infinity }], recovery: 0.36,
                   damage: 38, poise: 34, knock: 3.5, lunge: 0, hitstop: 0.09, riposte: { damage: 2.4 },
                   box: { w: 1.5, h: 2.0, d: 1.8, fwd: 0.9, y: 0.1 },
                   air: { impactTime: 0.08, hitRecoveryMul: 0.85, hop: 3.2, fx: { ring: 1.6, crack: 0.75, dust: 6, shake: 0.05 } } },
      // v4.2.1 balance (was damage 52, poise 60, posture 24, cost 42, recovery 0.7, hitstop 0.15, box 2.2 x 2.6): between a
      // tapped heavy and a full charge, a tighter landing zone, a longer landing to punish a miss that a hit no longer
      // shortens. Jump heavies now fill stagger and guard meters as heavy hits (v7.3).
      jumpHeavy: { id: 'jumpHeavy', anim: 'overhead', feel: 'heavy', hits: [{ startup: 0.3, active: Infinity }], recovery: 0.7,
                   damage: 95, poise: 70, knock: 7, lunge: 0, hitstop: 0.13, riposte: { damage: 2.6, poise: 2.5 },
                   box: { w: 1.7, h: 2.4, d: 2.1, fwd: 1.1, y: 0.0 },
                   air: { impactTime: 0.1, hitRecoveryMul: 1, hop: 3.8, fx: { ring: 3.2, crack: 1.7, dust: 14, shake: 0.11 } } },
    },
  },
};
