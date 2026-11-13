'use strict';
// ============================================================================
// The King's Blade (v7.51.0), the boss of Level 14, js/levels/still-mere.js (STORY.md 10j)
// ============================================================================
// The hunger, beaten in every body it wore, in the last one it kept: the champion's burned-out memory. Red scarf, round
// shield, the King's sword. It fights as the player fights: its moves are the player's own (PLAYER_DEF), read from the
// player's data so a change to the player's sword changes its sword too: the three cuts that chain one into the next, the
// held overhead (the player's charge), the leaping blow (the player's jump heavy), a running cut that closes ground, and
// the shield, which turns blows from the front and answers them. Only the timings are slowed to a boss's, so each blow
// can be read. Past half the Ember shows through (`ignite`): the third cut runs on into the held blow, and it presses.
// Rough (PLAN.md stage 3, track A): its figure is a stand-in, the player's own Blender body (the wanderer) gone to ash
// with the scarf still red and embers for eyes. Its own figure, the round shield on the arm and a roll come later
// (BACKLOG.md).
{
  const W = MODEL_DEFS.wanderer;
  MODEL_DEFS.kingsBlade = {
    extends: 'wanderer', budget: 'boss',
    posture: { ...W.posture, chest: [0.08, 0, 0], neck: [0.06, 0, 0] },   // straighter than the wanderer: a champion's carriage
    materials: {
      ...W.materials,
      skin: { tex: 'rotSkin', tint: 0x6a625a, decay: 0.7 },
      cloth: { tex: 'ashSoot', tint: 0x8a847c, decay: 0.6, size: 512 },   // the memory of cloth, in ash
      hood: { tex: 'ashSoot', tint: 0x6a6660, decay: 0.6, double: true, rim: 0.6 },
      cape: { tex: 'ashSoot', tint: 0x6a645c, decay: 0.6, size: 512, double: true, rim: 0.6 },
      capeHem: { tex: 'tatteredFabric', tint: 0x4a4440, decay: 0.7, size: 512, double: true, rim: 0.6 },
      coat: { tex: 'ashSoot', tint: 0x6a645c, decay: 0.6, size: 512, double: true },
      leather: { tex: 'crackedLeather', tint: 0x3a3430, decay: 0.7, size: 512 },
      strap: { tex: 'crackedLeather', tint: 0x2a2420, decay: 0.75 },
      iron: { tex: 'dentedSteel', tint: 0x7a7470, decay: 0.6 },
      mail: { tex: 'dentedSteel', tint: 0x5a5654, decay: 0.75 },
      wood: { tex: 'ashSoot', tint: 0x7a6a5a, decay: 0.5 },
      blade: { tex: 'dentedSteel', tint: 0xc0bab0, decay: 0.35, size: 512 },   // the King's sword: kept bright
      scarf: { tex: 'rottenCloth', tint: 0xd0382a, decay: 0.4, double: true },   // the one thing the fire left its colour
      eye: { glow: 0xff7a2a },
    },
    eyes: { color: 0xff7a2a, size: 0.011, spread: 0.044, at: [0, 0.09, 0.105] },
  };

  // The player's own moves (js/data/player.js) at a boss's pace: `hit` slows the wind-up so the blow can be read, and keeps
  // the strike, follow-through, pose, reach and push of the player's.
  const P = PLAYER_DEF.moveset.attacks;
  const glint = { event: 'glint', parry: true };
  const from = (src, own) => {
    const S = P[src], h = S.hits[0];
    return { anim: S.anim, ...(S.pose ? { pose: S.pose } : {}), markers: [glint], knock: S.knock, lunge: S.lunge, box: { ...S.box },
      ...own, hits: own.hits.map(x => ({ active: h.active === Infinity ? 0.16 : h.active, follow: h.follow ?? 0.2, ...x })) };
  };
  const attacks = [
    // The three cuts, as the player chains them: diagonal, backhand, overhead. Each may run on into the next.
    from('light', { id: 'firstCut', name: 'The First Cut', tracking: { rate: 3.0, commit: 0.75 }, chance: 1,
      hits: [{ startup: 0.62 }], recovery: 0.55, followUps: [{ attack: 'secondCut', if: 'near', chance: 0.8 }],
      damage: 22, poise: 30, postureDmg: 9, range: 2.9 }),
    from('light2', { id: 'secondCut', name: 'The Second Cut', tracking: { rate: 3.0, commit: 0.75 }, chance: 0,
      hits: [{ startup: 0.4 }], recovery: 0.55, followUps: [{ attack: 'thirdCut', if: 'near', chance: 0.65 }],
      damage: 22, poise: 30, postureDmg: 9, range: 2.9 }),
    from('light3', { id: 'thirdCut', name: 'The Third Cut', tracking: { rate: 2.6, commit: 0.7 }, chance: 0,
      hits: [{ startup: 0.5 }], recovery: 0.9, damage: 28, poise: 40, postureDmg: 12, range: 3.0 }),
    // The held blow: the player's heavy, coiled as the player coils a charge (the hold), then down.
    from('heavy', { id: 'heldBlow', name: 'The Held Blow', tracking: { rate: 2.4, commit: 0.6 }, chance: 0.55, poseScale: 1.1,
      hits: [{ startup: 0.9, hold: { at: 0.7, time: [0.3, 0.9], chance: 0.6 } }], recovery: 1.2,
      damage: 42, poise: 65, postureDmg: 20, range: 3.3, impact: { ring: 1.6, crack: 0.9, dust: 8, shake: 0.08 } }),
    // The leaping blow: the player's jump heavy, from farther off.
    from('jumpHeavy', { id: 'leapingBlow', name: 'The Leaping Blow', pose: 'heavyOverhead', tracking: { rate: 2.6, commit: 0.7 }, chance: 0.45, minRange: 4,
      hits: [{ startup: 1.0, leap: { from: 0.3, max: 9, short: 1.2 }, impact: { ring: 2.2, crack: 1.2, dust: 12, shake: 0.1 } }], recovery: 1.3,
      damage: 40, poise: 70, postureDmg: 18, range: 10, lunge: 0 }),
    // A running first cut: it closes the ground the way the player does, and may go on into the second.
    from('light', { id: 'runningCut', name: 'Running Cut', tracking: { rate: 3.0, commit: 0.45 }, chance: 0.4, minRange: 4.5, dash: { speed: 10, from: 0.4 },
      hits: [{ startup: 0.75 }], recovery: 0.7, followUps: [{ attack: 'secondCut', if: 'near', chance: 0.5 }],
      damage: 24, poise: 35, postureDmg: 10, range: 10 }),
    // The flask: drink in reach of it and it comes at once, as the player punishes a boss that heals.
    from('light', { id: 'drinkPunish', name: 'Running Cut', when: 'healing', tracking: { rate: 3.4, commit: 0.5 }, chance: 2.5, minRange: 2.5, dash: { speed: 11, from: 0.35 },
      hits: [{ startup: 0.6 }], recovery: 0.7, damage: 24, poise: 35, postureDmg: 10, range: 11 }),
    // The shield: a blow just turned by it is answered with the rim of it (a reaction, js/enemy.js `shielded`).
    { id: 'shieldAnswer', name: 'The Shield Answers', anim: 'bash', pose: 'enemyBash', noParry: true, when: 'shielded', tracking: { rate: 3.0, commit: 0.7 }, chance: 1.5,
      hits: [{ startup: 0.5, active: 0.12, follow: 0.25 }], recovery: 1.0,
      damage: 18, poise: 60, knock: 9, lunge: 2.0, range: 3.0, box: { w: 1.6, h: 1.8, d: 1.8, fwd: 1.3, y: 1.1 } },
  ];
  // Past half: the third cut runs on into the held blow; the leap that opens the phase lands in fire.
  const third = attacks.find(a => a.id === 'thirdCut');
  attacks.push({ ...third, id: 'thirdCutBurning', followUps: [{ attack: 'heldBlow', if: 'near', chance: 0.5 }] },
    { ...attacks.find(a => a.id === 'secondCut'), id: 'secondCutBurning', followUps: [{ attack: 'thirdCutBurning', if: 'near', chance: 0.8 }] },
    { ...attacks.find(a => a.id === 'firstCut'), id: 'firstCutBurning', followUps: [{ attack: 'secondCutBurning', if: 'near', chance: 0.9 }] },
    { ...attacks.find(a => a.id === 'leapingBlow'), id: 'emberLeap', name: 'The Ember Leaps', noParry: true, markers: [], chance: 0, recovery: 1.6,
      hits: [{ ...attacks.find(a => a.id === 'leapingBlow').hits[0], startup: 1.3, impact: { ring: 3.6, crack: 1.8, dust: 20, shake: 0.16 } }], damage: 46 });

  const BLADE = {
    id: 'kingsBlade', model: 'kingsBlade', name: 'The King\'s Blade',
    description: 'The hunger in the last body it kept: a champion of Ashmere, red scarf, round shield, the King\'s sword. It fights as you fight: three cuts, a held blow, a leap. Blows to its front glance off the shield, and the shield answers. Past half, the Ember shows through.',
    scale: 1.08, bulk: 1.0, radius: 0.42, color: 0x6a645c, weapon: 'sword', idle: 'sway',
    visual: { skin: 0x6a625a, roughness: 0.75, rim: 0.8 },
    hp: 3000,   // v7.65.0: a skilled player alone beats it in about a minute (tools/bot-fights.cjs, BOTS=1 CLEAN=1); its shield slows a bot alone more than a person
    poise: 200, speed: 3.1, turnRate: 4.0, trackRate: 2.0, approach: 0.7, kite: 0.1,
    cooldown: [0.9, 1.7], flinchTime: 0, staggerTime: 1.4, parriedTime: 1.8, deathFade: 6,
    posture: { max: 84, parry: 60, chainGap: 1.8, chainMul: 1.3, decay: 4.5, breakTime: 3.0, hitstop: 0.2 },   // two parries break it
    // The round shield, as the player holds it: frontal blows while it is not attacking glance off (0.35 of the damage)
    // and fill its guard; a heavy far more. Flank it or punish what it swings.
    guard: { arc: 0.9, damageMul: 0.35, knockMul: 0.3, lowerReach: 1.0, blockedMul: 0.4, breakers: ['heavy', 'jumpHeavy'],
             max: 100, heavy: 30, light: 10, decayDelay: 2.5, decay: 8, breakTime: 3.0, hitstop: 0.18 },
    defaultPhases: ['blade', 'emberWorn'],
    phases: {
      blade: { hp: 3000, attacks: ['firstCut', 'heldBlow', 'leapingBlow', 'runningCut', 'drinkPunish', 'shieldAnswer'] },
      emberWorn: { at: 0.5, name: 'The King\'s Blade, Ember-Worn', ignite: true, opener: 'emberLeap', cooldown: [0.6, 1.3], approach: 0.85, kite: 0.05, speed: 3.4,
        attacks: ['firstCutBurning', 'heldBlow', 'leapingBlow', 'runningCut', 'drinkPunish', 'shieldAnswer', 'emberLeap'] },
    },
    attacks,
  };
  ENEMY_DEFS.push(BLADE); ENEMY_BY_ID[BLADE.id] = BLADE;
}
