'use strict';
// ============================================================================
// The Ringer of Thrale (v7.42.0), the boss of Level 9, js/levels/night-gaol.js (LORE.md 10e)
// ============================================================================
// The one who rang Thrale's own bell, long ago, and was shut away for it: still chained in the great ring of the Night
// Gaol, still fighting, not knowing she is free. Rough (PLAN.md stage 3, track A): her fight reuses the engineering of
// the Crucible Knight's (js/data/bosses/crucible-knight.js: the stomp that always flows on, the planted overhead, the
// double turn, the lunge that punishes a drink, a second phase at half health opened by a leap), renamed, with the
// greatshield and the golden aspects taken out. She swings a bell on a haft; in the second phase she stops answering the
// blows and starts ringing them: a knell rings out round her along the floor (low: jump it). Her figure is a stand-in:
// the Rogue's Blender body in faded gaol-grey and bell-bronze, hooded and masked, the bell maul in hand. Her own Blender
// figure comes later (BACKLOG.md).
{
  const R = MODEL_DEFS.rogue;
  MODEL_DEFS.ringerOfThrale = {
    extends: 'rogue', budget: 'boss',
    materials: {
      ...R.materials,
      skin: { tex: 'paleSkin', tint: 0x9a9488, decay: 0.55 },
      scales: { tex: 'rogueScales', tint: 0x6a7078, decay: 0.55 },
      leather: { tex: 'rogueLeather', tint: 0x7a6a58, decay: 0.7 },
      hood: { tex: 'rogueHood', tint: 0x5a5e6a, decay: 0.6, double: true, rim: 0.5 },
      mask: { tex: 'rogueHood', tint: 0x3a3a40, decay: 0.45, double: true },
      steel: { tex: 'rustedIron', tint: 0x8a7a68, decay: 0.6 },   // the fetters at her wrists and shins
      strap: { tex: 'rustedIron', tint: 0x6a6058, decay: 0.7 },
      bronze: { tex: 'dentedSteel', tint: 0xa8864e, decay: 0.55, rim: 0.6 },
      iron: { tex: 'rustedIron', tint: 0x5a544e, decay: 0.6, rim: 0.4 },
      eye: { glow: 0xb8c8ff },
    },
    parts: R.parts.filter(p => p.use === 'baked'),   // no dagger: both hands on the bell
    weapon: { use: 'bellMaul', size: 0.6, slots: { blade: 'bronze', guard: 'iron', grip: 'iron' } },   // the Bell Warden's maul, sized to her hand
    eyes: { ...R.eyes, color: 0xb8c8ff },
  };

  // The Crucible Knight's moves by their new names (a phase-2 copy keeps its `2`); anything not named is left out: the
  // shield counter (no shield).
  const RENAME = {
    lungeThrust: ['runningToll', 'Running Toll'], healThrust: ['tollPunish', 'Running Toll'], stomp: ['fetterStamp', 'Fetter Stamp'],
    overheadSlam: ['bellFalls', 'The Bell Falls'], uppercut: ['risingToll', 'Rising Toll'], doubleSpin: ['twoTurns', 'Two Turns of the Chain'],
    diagonalSlash: ['crossPeal', 'Cross Peal'], shieldBash: ['shackledRush', 'Shackled Rush'], jab: ['shortToll', 'Short Toll'],
    wingsDive: ['cellLeap', 'Out of the Cell'], tailSwipe: ['knell', 'The Knell'], tailDouble: ['greatKnell', 'The Great Knell'],
  };
  const split = old => { const m = /^(.*?)(2?)$/.exec(old); return RENAME[m[1]] ? [RENAME[m[1]][0] + m[2], RENAME[m[1]][1]] : null; };
  const must = old => { const n = split(old); if (!n) throw new Error(`The Ringer of Thrale: the Crucible Knight's "${old}" has no new name.`); return n[0]; };
  // A knell: the bell struck on the stones, its ring spreading round her along the floor (the box is the Crucible tail's).
  const KNELL = { knell: { ring: 3.0, crack: 0.8, dust: 10, shake: 0.1 }, greatKnell: { ring: 7.0, crack: 1.4, dust: 18, shake: 0.16 } };
  const attacks = CRUCIBLE_KNIGHT.attacks.filter(a => split(a.id)).map(src => {
    const a = JSON.parse(JSON.stringify(src)), [id, name] = split(src.id);
    a.id = id; a.name = name; delete a.spectral;
    if (KNELL[id]) a.hits[0].impact = KNELL[id];
    if (a.followUps) a.followUps = a.followUps.map(f => ({ ...f, attack: must(f.attack) }));   // a branch never vanishes silently
    return a;
  });
  const phase = (P, extra) => ({ ...P, ...extra, attacks: P.attacks.filter(split).map(must), ...(P.opener ? { opener: must(P.opener) } : {}) });
  const C = CRUCIBLE_KNIGHT, { guard, offhand, ...knight } = C;   // no greatshield: every blow lands
  const RINGER = {
    ...knight, id: 'ringer', model: 'ringerOfThrale', name: 'The Ringer of Thrale',
    description: 'The one who rang Thrale\'s own bell without leave, shut in the great ring of the Night Gaol for it, still chained, still fighting. Past half her strength she rings the blows: jump the knell along the floor.',
    scale: 1.55, bulk: 1.1, radius: 0.62, color: 0x7a7468, weapon: 'bell', idle: 'sway',
    visual: { skin: 0x9a9488, roughness: 0.75, rim: 0.9 },
    hp: 3000,   // the Crucible Knight's 2,600 was set behind a shield that ate 70 % of frontal blows; she has none
    defaultPhases: ['chained', 'tolling'],
    phases: { chained: phase(C.phases.knight, { hp: 3000 }), tolling: phase(C.phases.aspect, {}) },
    attacks,
  };
  ENEMY_DEFS.push(RINGER); ENEMY_BY_ID[RINGER.id] = RINGER;
}
