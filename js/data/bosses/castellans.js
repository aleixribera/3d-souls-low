'use strict';
// ============================================================================
// Hale and Harrow, the Castellans (v7.40.0), the bosses of Level 8, js/levels/saltgrave.js (STORY.md 10d)
// ============================================================================
// Twin sisters who split one suit of armour, fought as a pair on the tower roof. Rough (PLAN.md stage 3, track A): the
// engineering of Godrick's fight (js/data/bosses/godrick.js) split between them and renamed, the grafted dragon taken
// out. Hale has the helm and the axe: the wheeling storm, the wind blades, the leap out of the gale, the five cuts.
// Harrow has the gauntlets and the greaves: the stamps that ring out along the floor, the falling weight, the two steps.
// Both drag the blade in a run and clear their backs. While both stand each waits longer between blows; when one falls,
// the other kneels by her, takes up her sister's half (an `alone` phase: it begins once the rest of its zone has
// fallen, on the same bar) and fights on with both halves' moves, faster. Their figures are stand-ins (models-enemies.js).
{
  const DAMAGE = 0.85;   // two at once: every blow a little lighter than Godrick's
  const RENAME = {
    stormcaller: ['galeWheel', 'Gale Wheel'], stormBlade: ['saltWind', 'Salt Wind'], stormLeap: ['galeLeap', 'Out of the Gale'],
    rampage: ['wallCuts', 'Five Cuts of the Wall'], dragSlash: ['grindingRun', 'Grinding Run'], backhand: ['rearBackhand', 'Rear Backhand'],
    kneel: ['kneelGate', 'Kneel at the Gate'], jumpSlam: ['fallingWeight', 'Falling Weight'], doubleStep: ['twoSteps', 'Two Steps, One Blow'],
    armChop: ['sistersHalf', 'Her Sister\'s Half'],
  };
  const must = old => { if (!RENAME[old]) throw new Error(`The Castellans: Godrick's "${old}" has no new name.`); return RENAME[old][0]; };
  const attacks = GODRICK.attacks.filter(a => RENAME[a.id]).map(src => {
    const a = JSON.parse(JSON.stringify(src));
    a.id = RENAME[src.id][0]; a.name = RENAME[src.id][1];
    a.damage = Math.round(a.damage * DAMAGE);
    if (a.id === 'sistersHalf') delete a.followUps;   // no dragon's breath after it: she rises and fights
    if (a.followUps) a.followUps = a.followUps.map(f => ({ ...f, attack: must(f.attack) }));   // a branch never vanishes silently
    return a;
  });
  const HALE = ['galeWheel', 'saltWind', 'galeLeap', 'wallCuts', 'grindingRun', 'rearBackhand'];
  const HARROW = ['kneelGate', 'fallingWeight', 'twoSteps', 'grindingRun', 'rearBackhand'];
  const both = [...new Set([...HALE, ...HARROW])];
  const base = {
    scale: 1.75, bulk: 1.15, radius: 0.78, weapon: 'greataxe', idle: 'sway',
    hp: 1700, poise: 220, speed: 2.3, turnRate: 3.0, trackRate: 1.5, approach: 0.45, kite: 0.15,
    flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 7,
    posture: { ...GODRICK.posture, max: 120 },
    attacks,
  };
  // While her sister stands: her own half, and a longer breath between blows. Alone: both halves, sooner and closer.
  const pair = own => ({ hp: 1700, cooldown: [1.7, 3.0], attacks: own });
  const alone = { alone: true, opener: 'sistersHalf', cooldown: [0.9, 1.7], approach: 0.7, kite: 0, speed: 2.6, trackRate: 1.8, attacks: ['sistersHalf', ...both] };
  const defs = [
    { ...base, id: 'hale', model: 'castellanHale', name: 'Hale, the Castellan',
      description: 'The elder castellan of Saltgrave, in the helm and breastplate of the one suit she shares with her sister, and the axe. Its wheel calls the sea wind.',
      color: 0x8e908a, visual: { skin: 0x9a9890, skinMetal: 0.4, metal: 0.5, roughness: 0.55, rim: 0.9 },
      defaultPhases: ['helm', 'whole'], phases: { helm: pair(HALE), whole: { ...alone, name: 'Hale, the Whole Castellan' } } },
    { ...base, id: 'harrow', model: 'castellanHarrow', name: 'Harrow, the Castellan',
      description: 'The younger castellan, bare-headed, in the gauntlets and greaves of the suit her sister shares. Her stamps ring out along the stones: jump them or roll.',
      color: 0x6a726c, visual: { skin: 0xc09a84, skinMetal: 0.2, metal: 0.4, roughness: 0.6, rim: 0.9 },
      defaultPhases: ['greaves', 'whole'], phases: { greaves: pair(HARROW), whole: { ...alone, name: 'Harrow, the Whole Castellan' } } },
  ];
  for (const d of defs) { ENEMY_DEFS.push(d); ENEMY_BY_ID[d.id] = d; }
}
