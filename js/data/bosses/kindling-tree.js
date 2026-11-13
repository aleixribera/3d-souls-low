'use strict';
// ============================================================================
// The Kindling Tree (v7.50.0), the boss of Level 13, js/levels/ember-root.js (STORY.md 10i), and the Rootbound
// ============================================================================
// The Ember's own root, given limbs: under everything the Ember is a root, and this is where it began. Rough (PLAN.md
// stage 3, track A): its fight reuses the engineering of Radagon's (js/data/bosses/radagon.js: the three-blow lash, the
// slam that marks the floor and bursts, the thrown spears, the roll-only grab, the vanishing that strikes where it rises;
// at 60 % the leap and the great burst all round it), renamed. Where Radagon blinks in golden light, the tree sinks into
// its own roots and comes up again, and its marks and bursts are the Ember's red-gold (`holyLight`, js/holy.js). At 60 %
// it catches (`ignite`). Its figure is a stand-in: the Antlered Hunger's Blender body stood upright in red-gold wood,
// the antlers for boughs. Its own Blender figure comes later (BACKLOG.md).
// Loaded after js/data/move-sources.js: the Rootbound fight with ZEALOT_MOVES on another body.
{
  const H = MODEL_DEFS.antleredHunger;
  MODEL_DEFS.kindlingTree = {
    extends: 'antleredHunger',
    // Stood up: the Hunger stalks bent over; the root stands tall, its boughs raised.
    posture: { ...H.posture, chest: [0.22, 0, 0], neck: [0.05, 0, 0], head: [-0.12, 0, 0], armL: [-0.3, 0, -0.2], armR: [-0.3, 0, 0.2] },
    materials: {
      hide: { tex: 'emberBark', tint: 0xffffff, decay: 0.55, size: 512 },   // living red-gold wood, embers in the cracks
      quill: { tex: 'emberBark', tint: 0xffc890, decay: 0.5, rim: 0.15 },   // twigs
      bone: { tex: 'churchPlank', tint: 0xe0a060, decay: 0.45, rim: 0.4 },   // the skull and the boughs: older, paler heartwood
      eye: { glow: 0xffd070 },
    },
    eyes: { ...H.eyes, color: 0xffd070 },
  };

  // Radagon's moves by their new names; anything not named here is left out (none is).
  const RENAME = {
    hammerCombo: ['threefoldLash', 'Threefold Lash'], hammerTwo: ['lashingBoughs', 'Lashing Boughs'], stompChop: ['rootStomp', 'Root Stomp, Falling Bough'],
    runeSlam: ['kindlingSlam', 'The Kindling Mark'], runeBurst: ['markBurns', 'The Mark Burns'], lightningSpear: ['emberThorn', 'Ember Thorn'],
    spearVolley: ['thornVolley', 'Thorn Volley'], spearPunish: ['thornPunish', 'Ember Thorn'], blinkPunish: ['risingPunish', 'Up from the Roots'],
    goldenGrab: ['theTaking', 'The Taking'], teleportStrike: ['throughTheRoots', 'Through the Roots'], teleportAway: ['sinksAway', 'Sinks into the Roots'],
    goldBreaker: ['heartwoodBreaks', 'The Heartwood Breaks'], eldenShattering: ['greatKindling', 'The Great Kindling'],
    spearThrust: ['thornThrust', 'Thorn in the Earth'], teleportSlam: ['upFromTheRoots', 'Up from the Roots'],
  };
  const id = old => RENAME[old] && RENAME[old][0];
  const must = old => { if (!id(old)) throw new Error(`The Kindling Tree: Radagon's "${old}" has no new name.`); return id(old); };
  const attacks = RADAGON.attacks.filter(a => RENAME[a.id]).map(src => {
    const a = JSON.parse(JSON.stringify(src));
    a.id = id(src.id); a.name = RENAME[src.id][1];
    if (a.followUps) a.followUps = a.followUps.map(f => ({ ...f, attack: must(f.attack) }));   // a branch never vanishes silently
    for (const h of a.hits) if (h.abort) h.abort.into = must(h.abort.into);
    return a;
  });
  const P = RADAGON.phases;
  const phase = (src, extra) => ({ ...src, ...extra, attacks: src.attacks.map(must), ...(src.opener ? { opener: must(src.opener) } : {}) });
  const TREE = {
    ...RADAGON, id: 'kindlingTree', model: 'kindlingTree', name: 'The Kindling Tree',
    description: 'The Ember\'s own root, given limbs, where it began. Its boughs lash, its thorns fly, its mark in the floor burns a moment later (step off it), and it sinks into its roots to rise where you stand. At 60% it catches.',
    scale: 2.5, bulk: 1.2, radius: 0.9, color: 0x6a2a14, weapon: 'none', idle: 'sway',
    visual: { skin: 0x7a3a1c, roughness: 0.85, rim: 0.6 },
    holyLight: { color: 0xff8a2a, core: 0xffd890 },   // its marks and its rising: the Ember's red-gold, not Radagon's light
    hp: 4200,   // Radagon's 5,200 ended the old road; the tree is the thirteenth of the Story, a step past Agathe's 4,000
    defaultPhases: ['rooted', 'kindled'],
    phases: { rooted: phase(P.order, { hp: 4200 }), kindled: phase(P.shattering, { name: 'The Kindling Tree, Ablaze', ignite: true }) },
    attacks,
  };
  ENEMY_DEFS.push(TREE); ENEMY_BY_ID[TREE.id] = TREE;
}

// The Rootbound (Level 13; STORY.md 10i): thralls grown into the wood, and gone into it gladly. They sink into the roots
// and rise where you stand, throw thorns of fire and mark the floor to burn. Rough: the Golden Zealot's moves
// (ZEALOT_MOVES, js/data/move-sources.js) on the Hollow Soldier's Blender figure, its skin and clothes gone to bark.
{
  const Z = ZEALOT_MOVES, NAMES = { gzHammer: ['rootLash', 'Lashing Branch'], gzSpear: ['rootThorn', 'Ember Thorn'],
    gzBlink: ['rootRise', 'Up from the Roots'], gzRune: ['rootMark', 'The Kindling Mark'] };
  const ROOTBOUND = { ...Z, id: 'rootbound', model: 'rootbound', name: 'Rootbound',
    description: 'A thrall of Thrale grown into the Ember\'s wood, and gone into it gladly. It sinks into the roots and rises where you stand, throws thorns of fire, and its blow marks the floor to burn a moment later: step off it.',
    color: 0x5a2a18, visual: { ...Z.visual, skin: 0x6a3a22, roughness: 0.85, rim: 0.7 },
    holyLight: { color: 0xff8a2a, core: 0xffd890 },
    attacks: Z.attacks.map(a => {
      if (!NAMES[a.id]) throw new Error(`Rootbound: the Golden Zealot's "${a.id}" has no new name.`);
      return { ...JSON.parse(JSON.stringify(a)), id: NAMES[a.id][0], name: NAMES[a.id][1] };
    }) };
  ENEMY_DEFS.push(ROOTBOUND); ENEMY_BY_ID[ROOTBOUND.id] = ROOTBOUND;
  MODEL_DEFS.rootbound = {
    extends: 'hollowSoldier', rim: 0.5,   // dark bark takes the full rim light as a white outline
    materials: {
      ...MODEL_DEFS.hollowSoldier.materials,
      skin: { tex: 'emberBark', tint: 0xffd0b0, decay: 0.6 },   // the wood grown over the skin
      quilt: { tex: 'emberBark', tint: 0xd0906a, decay: 0.7 },   // the clothes gone to bark
      trousers: { tex: 'churchLog', tint: 0xc07a50, decay: 0.75 },
      leather: { tex: 'churchLog', tint: 0xa06a48, decay: 0.75 },
      strap: { tex: 'churchLog', tint: 0x8a5a3a, decay: 0.85 },
      iron: { tex: 'rustedIron', tint: 0x6a4030, decay: 0.8, double: true },
      blade: { tex: 'emberBark', tint: 0xffc090, decay: 0.6 },   // a blade of the root's own wood
      eye: { glow: 0xffa040 },
    },
    eyes: { ...MODEL_DEFS.hollowSoldier.eyes, color: 0xffa040 },
  };
}
