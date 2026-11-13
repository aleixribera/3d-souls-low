'use strict';
// ============================================================================
// Mother Agathe, the Rending Hand (v7.48.0), the boss of Level 12, js/levels/torn-abbey.js (LORE.md 10h), and the
// Rending Brothers, her monks
// ============================================================================
// The abbess who held the knife when Thrale's monks tried to cut the Ember out of the earth and tore the hill loose into
// the storm. Rough (PLAN.md stage 3, track A): her fight reuses the engineering of Maliketh's (js/data/bosses/maliketh.js:
// the four quick cuts, the flung stones and the boulder, the claw that rends the floor into a line of shockwaves, the
// leap back; at half health an untouchable change, then the waves flung from the air, the dive, the sphere of cuts and
// the wound that cuts the player's health for a while), renamed. Where Maliketh shed his robes for the Black Blade, the
// storm comes at Agathe's back: nothing is cast off (her stand-in has no second body to show), and from then on every
// blow of the hook rends. Her figure is a stand-in: the Toll Wisp's Blender body (a long robe, a tall hat) without the
// beard, in an abbess's black and storm-grey, a glaive for the great hook. Her own Blender figure comes later
// (BACKLOG.md).
// Loaded after js/data/lands-enemies.js: the Rending Brothers are the Beastman's engineering on another body.
{
  const W = MODEL_DEFS.tollWisp;
  MODEL_DEFS.motherAgathe = {
    extends: 'tollWisp', budget: 'boss',
    materials: {
      ...W.materials,
      hat: { tex: 'wispHat', tint: 0x2a2a30, decay: 0.55, double: true },   // the abbess's tall black hood-hat
      brimTrim: { tex: 'execTrim', tint: 0x8a8e98, decay: 0.5, double: true },
      mantle: { tex: 'wispMantle', tint: 0x4a4c56, decay: 0.55, double: true },   // a storm-grey scapular
      epaulette: { tex: 'execSkirt', tint: 0x3a3c44, decay: 0.5, double: true },
      brocade: { tex: 'wispBrocade', tint: 0xb8bcc4, decay: 0.45, double: true },   // the pale front of the habit
      trim: { tex: 'wispTrim', tint: 0x9aa0b0, decay: 0.42, double: true, rim: 0.6 },
      coat: { tex: 'wispCoat', tint: 0x2c2c32, decay: 0.6, double: true },   // the black habit
      rope: { tex: 'execTrim', tint: 0xa89e88, decay: 0.45 },
      skin: { tex: 'paleSkin', tint: 0xb0aaa0, decay: 0.5 },
      blade: { tex: 'glaiveSteel', tint: 0xb8bcc2, decay: 0.5, rim: 0.6 },   // the great hook
      rust: { tex: 'rustedIron', tint: 0x5a3020, decay: 0.85 },   // old blood on it
      socket: { tex: 'ashSoot', tint: 0x100c0a, decay: 0.9 },
      wood: { tex: 'crackedLeather', tint: 0x2e241c, decay: 0.72 },
      iron: { tex: 'rustedIron', tint: 0x5a5450, decay: 0.75 },
      rags: { tex: 'rottenCloth', tint: 0x3a3a42, decay: 0.8, double: true },
      eye: { glow: 0xc8d8ff },
    },
    parts: W.parts.filter(p => p.slot !== 'beard'),   // the tall hat stays: without it the head is a bare dark ball
    weapon: { use: 'glaive', slots: { blade: 'blade', rust: 'rust', hole: 'socket', grip: 'wood', guard: 'iron', wrap: 'rags' } },
    eyes: { ...W.eyes, color: 0xc8d8ff },
  };

  // Maliketh's moves by their new names; anything not named here is left out (none is).
  const RENAME = {
    multiSlash: ['hookFlurry', 'Hook Flurry'], sling: ['tornStones', 'Torn Stones'], slingRetreat: ['leapingStones', 'Leaping Stones'],
    slingPunish: ['stonesPunish', 'Torn Stones'], gurranqStone: ['abbeyStone', 'A Stone of the Abbey'], beastClaw: ['rendTheEarth', 'Rend the Earth'],
    gurranqClaw: ['greatRending', 'The Great Rending'], lungeSweep: ['lungingHook', 'Lunging Hook'], stabUplift: ['hookAndLift', 'Hook and Lift'],
    clergyRear: ['turningHook', 'Turning Hook'], shedRobes: ['stormComes', 'The Storm Comes'], bladeWaves: ['stormWaves', 'Storm Waves'],
    corkscrew: ['fallingHook', 'The Falling Hook'], deathSphere: ['theRending', 'The Rending'], overheadSlam: ['cleavingRend', 'Cleaving Rend'],
    escapeSlash: ['sweepingEscape', 'Sweeping Escape'], spinFlip: ['spinningHook', 'Spinning Hook'], bladeCombo: ['rendingHand', 'The Rending Hand'],
  };
  const id = old => RENAME[old] && RENAME[old][0];
  const must = old => { if (!id(old)) throw new Error(`Mother Agathe: Maliketh's "${old}" has no new name.`); return id(old); };
  const STORM_WAVE = [0xd8e4ff, 0x2a3a6a];   // the waves flung from the air: storm-light, not the Black Blade's crimson
  const attacks = MALIKETH.attacks.filter(a => RENAME[a.id]).map(src => {
    const a = JSON.parse(JSON.stringify(src));
    a.id = id(src.id); a.name = RENAME[src.id][1];
    if (a.projectile && a.projectile.look === 'slash') a.projectile.colors = STORM_WAVE;
    if (a.followUps) a.followUps = a.followUps.map(f => ({ ...f, attack: must(f.attack) }));   // a branch never vanishes silently
    for (const h of a.hits) if (h.abort) h.abort.into = must(h.abort.into);
    return a;
  });
  const P = MALIKETH.phases, { reveal, conceal, ...storm } = P.blackBlade;   // nothing to shed: the stand-in has one body
  const phase = (src, extra) => ({ ...src, ...extra, attacks: src.attacks.map(must), ...(src.opener ? { opener: must(src.opener) } : {}) });
  const AGATHE = {
    ...MALIKETH, id: 'agathe', model: 'motherAgathe', name: 'Mother Agathe, the Rending Hand',
    description: 'The abbess who held the knife when Thrale\'s monks tried to cut the Ember out of the earth. A great hook, flung stones, and a claw that rends the floor into a line of shockwaves (roll or jump). At half her strength the storm comes at her back, and every blow of the hook rends: a wound that holds your health down until it closes.',
    scale: 1.8, color: 0x2c2c32, idle: 'sway',
    visual: { skin: 0xb0aaa0, roughness: 0.75, rim: 0.9 },
    hp: 4000,   // Maliketh's 4,600 guarded the old road's throne; Agathe opens Act III, a step past Oswin's 3,800
    defaultPhases: ['abbess', 'storm'],
    phases: { abbess: phase(P.clergyman, { hp: 4000 }), storm: phase(storm, { name: 'Agathe, the Storm at Her Back' }) },
    attacks,
  };
  ENEMY_DEFS.push(AGATHE); ENEMY_BY_ID[AGATHE.id] = AGATHE;
}

// The Rending Brothers (Level 12; LORE.md 10h): the monks who cut at the hill with her. They spring from the ruins, cut
// four times with a hooked knife, fling stones and rend the floor into a line of shockwaves. Rough: the Beastman's moves
// (js/data/lands-enemies.js) on the Rogue's Blender figure in an undyed cowl, one hooked knife.
{
  const B = ENEMY_BY_ID.beastman, NAMES = { bmSlash: ['brotherCuts', 'Four Cuts'], bmClaw: ['brotherRend', 'Rend the Earth'],
    bmSling: ['brotherStones', 'Flung Stones'], bmLunge: ['brotherLunge', 'Lunging Hook'], bmPounce: ['brotherLeap', 'Leaping Hook'] };
  const BROTHER = { ...B, id: 'rendingBrother', model: 'rendingBrother', name: 'Rending Brother',
    description: 'A monk of the Torn Abbey, who cut at the hill with his abbess. He springs from the ruins, cuts four times with a hooked knife, flings stones, and rends the floor into a line of shockwaves (roll or jump).',
    color: 0x6a5a48, visual: { ...B.visual, skin: 0x9a8e80 },
    attacks: B.attacks.map(a => {
      if (!NAMES[a.id]) throw new Error(`Rending Brother: the Beastman's "${a.id}" has no new name.`);
      return { ...JSON.parse(JSON.stringify(a)), id: NAMES[a.id][0], name: NAMES[a.id][1] };
    }) };
  ENEMY_DEFS.push(BROTHER); ENEMY_BY_ID[BROTHER.id] = BROTHER;
  const R = MODEL_DEFS.rogue;
  MODEL_DEFS.rendingBrother = {
    extends: 'rogue',
    materials: {
      ...R.materials,
      skin: { tex: 'paleSkin', tint: 0xa09484, decay: 0.55 },
      hood: { tex: 'rogueHood', tint: 0x8a7458, decay: 0.6, double: true, rim: 0.5 },   // the undyed cowl
      mask: { tex: 'rogueHood', tint: 0x4a3e32, decay: 0.5, double: true },
      scales: { tex: 'rottenCloth', tint: 0x6a5a46, decay: 0.75 },   // a habit for the scale
      leather: { tex: 'rogueLeather', tint: 0x5a4636, decay: 0.65 },
      strap: { tex: 'execTrim', tint: 0xa89a7e, decay: 0.55 },   // the cord
      steel: { tex: 'rustedIron', tint: 0x6a645e, decay: 0.7 },
      blade: { tex: 'rustedIron', tint: 0xb0aca4, decay: 0.45 },
      eye: { glow: 0xc8d8ff },
    },
    parts: R.parts.filter(p => p.use === 'baked'),   // one hooked knife, no dagger
    weapon: { use: 'curvedKnife', slots: { blade: 'blade', grip: 'leather', guard: 'steel' } },
    eyes: { ...R.eyes, color: 0xc8d8ff },
  };
}
