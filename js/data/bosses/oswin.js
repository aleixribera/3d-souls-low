'use strict';
// ============================================================================
// Oswin, the First Crown (v7.46.0), the boss of Level 11, js/levels/aurel-in-ash.js (LORE.md 10g)
// ============================================================================
// The first king of Thrale the Ember ever wore, risen to his throne in the ash when the hunger, refused, burned the city it
// could not keep. Rough (PLAN.md stage 3, track A): his fight reuses the engineering of Godfrey's
// (js/data/bosses/godfrey.js: a great axe, stomps that crack the floor ahead and then ring round him, the grabs that can
// only be rolled, a cast-off at 40 % he cannot be hurt through, and a last rage at 20 %), renamed. Where Godfrey cast off
// a lion and his armour, Oswin casts down the axe, the crown's weapon, and the Ember takes his hands: from 40 % he
// fights bare-handed as the man he was before it, burning (`ignite`). His figure is a stand-in: the Executioner's
// Blender body in ash and old gold, white-maned, the executioner's axe in hand. His own Blender figure comes later
// (BACKLOG.md).
{
  const D = MODEL_DEFS.ashExecutioner;
  MODEL_DEFS.oswinFirstCrown = {
    extends: 'ashExecutioner', budget: 'boss',
    materials: {
      ...D.materials,
      skin: { tex: 'rotSkin', tint: 0x9a948c, decay: 0.7 },   // ash laid over the skin
      hair: { tex: 'margitFur', tint: 0xd8d2c8, decay: 0.3 },   // an old king's white mane
      patch: { tex: 'crackedLeather', tint: 0x141210, decay: 0.6 },
      plumage: { tex: 'execPlumage', tint: 0xa8a29a, decay: 0.6, double: true },   // a mantle of ash
      sleeve: { tex: 'rottenCloth', tint: 0x4a1e16, decay: 0.7, double: true },   // Thrale's crimson, burned nearly black
      sash: { tex: 'rottenCloth', tint: 0xb08a48, decay: 0.55, double: true },
      cord: { tex: 'rottenCloth', tint: 0x8a2a18, decay: 0.55, double: true },
      skirt: { tex: 'execSkirt', tint: 0x4a443e, decay: 0.75, double: true },
      trim: { tex: 'wornGilt', tint: 0xc8a050, decay: 0.5, double: true, rim: 0.6 },   // old gold, sooted
      gauntlet: { tex: 'wornGilt', tint: 0x9a7a40, decay: 0.65 },
      iron: { tex: 'dentedSteel', tint: 0x4a4644, decay: 0.75 },
      blade: { tex: 'execBlade', tint: 0x8a8480, decay: 0.75, rim: 0.6 },
      eye: { glow: 0xff8a3a },
    },
    eyes: { ...D.eyes, color: 0xff8a3a },
  };

  // Godfrey's moves by their new names; anything not named here is left out (none is).
  const RENAME = {
    stomp: ['ashStomp', 'Ash Stomp'], stompWide: ['ashStompWide', 'Ash Stomp'], regalRoar: ['crownsRoar', 'The Crown\'s Roar'],
    axeDive: ['kingsLeap', 'The King\'s Leap'], fissure: ['emberCleaver', 'Ember Cleaver'], tripleAxe: ['threefoldAxe', 'Threefold Axe'],
    smashSpin: ['smashAndTurn', 'Smash and Turn'], hoist: ['plungingAxe', 'Plunging Axe'], seroshShed: ['crownCastDown', 'The Crown Cast Down'],
    powerBomb: ['kingsHold', 'The King\'s Hold'], louxLunge: ['lungingGrasp', 'Lunging Grasp'], earthshaker: ['groundBreaker', 'Ground Breaker'],
    flurry: ['cinderFlurry', 'Cinder Flurry'], doubleStomp: ['twinStomp', 'Twin Stomp'], doubleStompWide: ['twinStompWide', 'Twin Stomp'],
    louxRage: ['firstHunger', 'The First Hunger'],
  };
  const id = old => RENAME[old] && RENAME[old][0];
  const must = old => { if (!id(old)) throw new Error(`Oswin, the First Crown: Godfrey's "${old}" has no new name.`); return id(old); };
  const attacks = GODFREY.attacks.filter(a => RENAME[a.id]).map(src => {
    const a = JSON.parse(JSON.stringify(src));
    a.id = id(src.id); a.name = RENAME[src.id][1];
    if (a.followUps) a.followUps = a.followUps.map(f => ({ ...f, attack: must(f.attack) }));   // a branch never vanishes silently
    for (const h of a.hits) if (h.abort) h.abort.into = must(h.abort.into);
    return a;
  });
  const P = GODFREY.phases, BARE = { name: 'Oswin, Uncrowned', conceal: ['weapon'], ignite: true };
  const phase = (src, extra) => ({ ...src, ...extra, attacks: src.attacks.map(must), ...(src.opener ? { opener: must(src.opener) } : {}) });
  const OSWIN = {
    ...GODFREY, id: 'oswin', model: 'oswinFirstCrown', name: 'Oswin, the First Crown',
    description: 'The first king of Thrale the Ember ever wore, risen to his throne in the ash. A great axe, and stomps that crack the burning floor (jump them). At 40% he casts the axe down and the Ember takes his hands: he grabs, and only a roll gets clear.',
    color: 0x6a5a48, visual: { skin: 0x9a948c, skinMetal: 0.1, metal: 0.4, roughness: 0.7, rim: 0.9 },
    hp: 3800,   // Godfrey's 4,400 crowned the old road; Oswin is the fifth of Thrale's, a step past the Regent's 3,400
    defaultPhases: ['crowned', 'roaring', 'uncrowned', 'hunger'],
    phases: {
      crowned: phase(P.lord, { hp: 3800 }), roaring: phase(P.regal, {}),
      uncrowned: phase(P.loux, BARE), hunger: phase(P.rage, BARE),
    },
    attacks,
  };
  ENEMY_DEFS.push(OSWIN); ENEMY_BY_ID[OSWIN.id] = OSWIN;
}
