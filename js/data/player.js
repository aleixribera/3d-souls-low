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

const ITEMS = {
  flask: { name: 'Flask', action: 'flask', useTime: 1.3, heal: 45, healStart: 0.35, healDuration: 0.8, refillOnRest: true },
};

const PLAYER_DEF = {
  name: 'Knight', radius: 0.36,
  look: { scale: 1.0, bulk: 0.88, color: 0xb59a5a, weapon: 'sword', weaponColor: 0xb8bcc4,
          visual: { skin: 0x8a867c, skinMetal: 0.15, roughness: 0.7 } },   // helmed knight
  stats: { maxHp: 120, maxStamina: 160, maxPoise: 30 },
  inventory: [{ item: 'flask', count: 4, max: 4 }],
  moveset: {
    ground: { light: 'light', heavy: 'heavy' },        // input action -> attack id
    air: { light: 'jumpLight', heavy: 'jumpHeavy' },
    attacks: {
      light: { id: 'light', anim: 'sweep', hits: [{ startup: 0.22, active: 0.12 }], recovery: 0.34, cost: 16,
               damage: 18, poise: 22, postureDmg: 9, knock: 3, lunge: 2.4, hitstop: 0.07, riposte: { damage: 2.4 },
               box: { w: 2.0, h: 1.6, d: 1.9, fwd: 1.25, y: 1.1 } },
      heavy: { id: 'heavy', anim: 'overhead', hits: [{ startup: 0.56, active: 0.16 }], recovery: 0.64, cost: 40,
               damage: 38, poise: 52, postureDmg: 24, knock: 7, lunge: 3.2, hitstop: 0.13, riposte: { damage: 2.6, poise: 2.5 },
               box: { w: 1.1, h: 2.6, d: 2.7, fwd: 1.55, y: 1.3 } },
      // Jump attacks: wind-up in the air, the hitbox opens while descending and lasts until landing
      // plus impactTime. `recovery` is the landing recovery (shortened by hitRecoveryMul on a hit).
      jumpLight: { id: 'jumpLight', anim: 'overhead', hits: [{ startup: 0.12, active: Infinity }], recovery: 0.42, cost: 18,
                   damage: 22, poise: 26, postureDmg: 9, knock: 3.5, lunge: 0, hitstop: 0.09, riposte: { damage: 2.4 },
                   box: { w: 1.5, h: 2.0, d: 1.8, fwd: 0.9, y: 0.1 },
                   air: { impactTime: 0.08, hitRecoveryMul: 0.85, hop: 3.2, fx: { ring: 1.6, crack: 0.75, dust: 6, shake: 0.05 } } },
      jumpHeavy: { id: 'jumpHeavy', anim: 'overhead', hits: [{ startup: 0.3, active: Infinity }], recovery: 0.7, cost: 42,
                   damage: 52, poise: 60, postureDmg: 24, knock: 7, lunge: 0, hitstop: 0.15, riposte: { damage: 2.6, poise: 2.5 },
                   box: { w: 2.2, h: 2.4, d: 2.6, fwd: 1.1, y: 0.0 },
                   air: { impactTime: 0.1, hitRecoveryMul: 0.85, hop: 3.8, fx: { ring: 3.2, crack: 1.7, dust: 14, shake: 0.11 } } },
    },
  },
};
