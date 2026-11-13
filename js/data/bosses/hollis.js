'use strict';
// ============================================================================
// The Regent Hollis (v7.44.0), the boss of Level 10, js/levels/aurel.js (STORY.md 10f)
// ============================================================================
// The steward the hunger left to keep its city fed when it went over the mountains in the Seven's keeping: gilded,
// gracious, cruel. Rough (PLAN.md stage 3, track A): his fight reuses the engineering of Morgott's
// (js/data/bosses/morgott.js: the greatsword's parryable cuts, weapons of gilt drawn out of the air, the punishes for a
// drink, a second phase at 60 % opened by a burst he cannot be hurt through), renamed. The tail swipe at his back becomes
// a turning cut, and in the second phase the hunger shows through him: the gilt cracks and the Ember burns out of the
// seams (fire where Morgott's blood was). His figure is a stand-in: the Pale Duelist's Blender body in gold leaf and
// regent's crimson, a gilded greatsword in hand. His own Blender figure comes later (BACKLOG.md).
{
  const D = MODEL_DEFS.paleDuelist;
  MODEL_DEFS.regentHollis = {
    extends: 'paleDuelist', budget: 'boss',
    materials: {
      ...D.materials,
      skin: { tex: 'paleSkin', tint: 0xd8c08a, decay: 0.45 },   // gold leaf on the face and hands
      cloth: { tex: 'oathLinen', tint: 0xc8bc9c, decay: 0.45, double: true, rim: 0.6 },
      plume: { tex: 'duelistVelvet', tint: 0xd8a070, decay: 0.45, double: true },   // the regent's crimson: cap, cape and sleeves
      trim: { tex: 'wornGilt', tint: 0xe0b860, decay: 0.4, rim: 0.6 },
      leather: { tex: 'crackedLeather', tint: 0x6a5434, decay: 0.55 },
      blade: { tex: 'dentedSteel', tint: 0xf4e8c4, decay: 0.2, rim: 0.6 },   // pale gilt over bright steel
      iron: { tex: 'wornGilt', tint: 0xc8a050, decay: 0.45, rim: 0.5 },
      eye: { glow: 0xffc860 },
    },
    weapon: { use: 'greatSword', slots: { blade: 'blade', grip: 'leather', guard: 'iron' } },
    eyes: { ...D.eyes, color: 0xffc860 },
  };

  // Morgott's moves by their new names; anything not named here is left out (none is).
  const RENAME = {
    chopThrust: ['stewardsChop', 'Chop, Thrust'], swordFlurry: ['giltFlurry', 'Gilt Sword Flurry'], hammerLeap: ['giltHammerLeap', 'Gilt Hammer, Leaping'],
    hammerSweep: ['giltHammerSweep', 'Gilt Hammer Sweep'], sweepSlash: ['courtlyCuts', 'Courtly Cuts'], spearCharge: ['giltSpearCharge', 'Gilt Spear Charge'],
    spearThrow: ['giltJavelin', 'Gilt Javelin'], swordRain: ['rainOfGilt', 'Rain of Gilt Swords'], daggerFan: ['giltKnives', 'A Fan of Gilt Knives'],
    daggerRetreat: ['bowAndKnife', 'A Bow, a Knife'], daggerPunish: ['knifePunish', 'Gilt Knife'], leapPunish: ['leapingCut', 'Leaping Cut'],
    daggerSlash: ['flankKnife', 'A Knife at the Flank'], tailSwipe: ['turningCut', 'Turning Cut'],
    defilement: ['hungerShows', 'The Hunger Shows'], bloodSlice: ['emberSlice', 'Ember Slice'], bloodyThrust: ['emberThrust', 'Ember Thrust'],
    geysers: ['emberWells', 'Ember Wells'],
  };
  const id = old => RENAME[old] && RENAME[old][0];
  const must = old => { if (!id(old)) throw new Error(`The Regent Hollis: Morgott's "${old}" has no new name.`); return id(old); };
  const attacks = MORGOTT.attacks.filter(a => RENAME[a.id]).map(src => {
    const a = JSON.parse(JSON.stringify(src));
    a.id = id(src.id); a.name = RENAME[src.id][1];
    if (a.followUps) a.followUps = a.followUps.map(f => ({ ...f, attack: must(f.attack) }));   // a branch never vanishes silently
    for (const h of a.hits) if (h.abort) h.abort.into = must(h.abort.into);
    return a;
  });
  const phase = (P, extra) => ({ ...P, ...extra, attacks: P.attacks.filter(id).map(id), ...(P.opener ? { opener: must(P.opener) } : {}) });
  const HOLLIS = {
    ...MORGOTT, id: 'hollis', model: 'regentHollis', name: 'The Regent Hollis',
    description: 'The steward the hunger left to keep Aurel fed: gilded, gracious, cruel. A gilded greatsword, and weapons of gilt drawn out of the air. Past 60% the gilt cracks, the hunger shows through, and his blade burns.',
    scale: 1.85, bulk: 1.05, radius: 0.72, color: 0x8a7448,
    visual: { skin: 0xd8c08a, roughness: 0.6, rim: 0.9 },
    hp: 3400,   // Morgott's 4,800 was the old road's hardest duel; the Regent is the fourth of Thrale's, a step past the Ringer's 3,000
    defaultPhases: ['gracious', 'hungry'],
    phases: { gracious: phase(MORGOTT.phases.king, { hp: 3400 }), hungry: phase(MORGOTT.phases.cursed, {}) },
    attacks,
  };
  ENEMY_DEFS.push(HOLLIS); ENEMY_BY_ID[HOLLIS.id] = HOLLIS;
}
