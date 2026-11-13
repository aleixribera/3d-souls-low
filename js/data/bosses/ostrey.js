'use strict';
// ============================================================================
// Old Ostrey, the Porter (v7.38.0), the boss of Level 7, js/levels/windward-moor.js (STORY.md 10c)
// ============================================================================
// A giant gatekeeper still keeping Thrale's border for a king long dead: an iron gate-bar and a lantern. Rough (PLAN.md
// stage 3, track A): his fight reuses the engineering of Margit's (js/data/bosses/margit.js: the delayed swings, the
// leaping plunge, the reactions behind and at his flank, a second phase at 60 % opened by a slam with a shockwave),
// renamed and with the conjured golden weapons taken out: the bar does the work, coals from the lantern take the place of
// the daggers, and in the second phase the lantern catches (fire). His figure is a stand-in: the Shover's Blender body
// in the gate-wardens' colours, without its shield, a long iron bar in hand. His own Blender figure comes later.
{
  const S = MODEL_DEFS.ironShover;
  MODEL_DEFS.oldOstrey = {
    extends: 'ironShover', budget: 'boss',
    materials: {
      ...S.materials,
      plate: { tex: 'gaolerPlate', tint: 0xa49c8c, decay: 0.75 }, trim: { tex: 'wornGilt', tint: 0xa88a50, decay: 0.75 },
      tabard: { tex: 'rottenCloth', tint: 0x5a6478, decay: 0.75, double: true },
      bar: { tex: 'rustedIron', tint: 0x6a625a, decay: 0.7 },
      eye: { glow: 0xffb050 },
    },
    parts: S.parts.filter(p => p.use === 'baked'),
    weapon: { use: 'cane', slots: { grip: 'bar', blade: 'bar', guard: 'bar' } },
    eyes: { color: 0xffb050 },
  };

  // Margit's moves by their new names; anything not named here is left out (the conjured sword flurry and combo).
  const RENAME = {
    caneCombo: ['barCombo', 'Bar Sweep, Return'], groundThrust: ['barDrive', 'Bar Drive'], caneOverhead: ['barOverhead', 'Raised Bar'],
    runningSweep: ['porterCharge', 'Porter\'s Charge'], caneThrust: ['barThrust', 'Bar Jab'], flickOverhead: ['flickOverhead', 'Upswing, Overhead'],
    canePlunge: ['gateDrop', 'Gate Drop'], daggerToss: ['coalToss', 'Lantern Coal'], daggerDouble: ['coalDouble', 'Two Coals'],
    daggerPunish: ['coalPunish', 'Lantern Coal'], daggerLeap: ['barLeap', 'Leaping Bar, Drive'], daggerRetreat: ['coalRetreat', 'Step Back, Coal'],
    daggerSlash: ['lanternBash', 'Lantern Bash'], tailSwipe: ['heelSweep', 'Backward Sweep'], crossSlash: ['barCross', 'Bar and Lantern'],
    hammerOpener: ['kindleOpener', 'The Lantern Catches'], hammerLeap: ['burningDrop', 'Burning Gate Drop'], hammerStomp: ['stampSlam', 'Stamp and Slam'],
    spinSweep: ['fullTurn', 'Full Turn'],
  };
  const id = old => RENAME[old] && RENAME[old][0];
  const must = old => { if (!id(old)) throw new Error(`Old Ostrey: Margit's "${old}" has no new name.`); return id(old); };
  const attacks = MARGIT.attacks.filter(a => RENAME[a.id]).map(src => {
    const a = JSON.parse(JSON.stringify(src));
    a.id = id(src.id); a.name = RENAME[src.id][1]; delete a.spectral;
    if (a.projectile && a.projectile.look === 'dagger') a.projectile.look = 'rock';
    if (a.followUps) a.followUps = a.followUps.map(f => ({ ...f, attack: must(f.attack) }));   // a branch never vanishes silently
    for (const h of a.hits) if (h.abort) h.abort.into = must(h.abort.into);
    return a;
  });
  const phase = (P, extra) => ({ ...P, ...extra, attacks: P.attacks.filter(id).map(id), ...(P.opener ? { opener: must(P.opener) } : {}) });
  const OSTREY = {
    ...MARGIT, id: 'ostrey', model: 'oldOstrey', name: 'Old Ostrey, the Porter',
    description: 'A giant porter in the armour of Thrale\'s gate-wardens, still keeping the border for a king long dead. An iron gate-bar, a lantern, and blows that wait before they fall.',
    scale: 2.1, bulk: 1.2, radius: 0.82, color: 0x5a564c, weapon: 'spear', idle: 'sway',
    visual: { skin: 0x8a8274, roughness: 0.8, rim: 0.9 },
    hp: 3000,
    defaultPhases: ['porter', 'kindled'],
    phases: { porter: phase(MARGIT.phases.omen, { hp: 3000 }), kindled: phase(MARGIT.phases.golden, {}) },
    attacks,
  };
  ENEMY_DEFS.push(OSTREY); ENEMY_BY_ID[OSTREY.id] = OSTREY;
}
