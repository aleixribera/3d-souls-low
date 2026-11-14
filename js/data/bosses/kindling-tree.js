'use strict';
// ============================================================================
// The Kindling Tree (v7.50.0; its own since pass 50), the boss of Level 13, js/levels/ember-root.js (STORY.md 10i), and
// the Rootbound
// ============================================================================
// The Ember's own root, given limbs, where it began. It is not a man: it does not walk to you. Rooted in the heartwood
// (the phase's `rooted`: it never moves on its feet and no body shoves it), it reaches you with what a tree has. Close in,
// its boughs lash and fall; its claw drives a mark into the floor that burns a moment later; hug its trunk and the roots
// burst up all round it. Far off, its crown flings thorns, and it goes down into its roots: the floor heaves and runs
// after you (a hit's `burrow`, js/root-heave.js), stops, swells, and the tree comes up through it. The heave is the tell:
// it cannot touch you and you cannot touch it while it is under; once it stops, step off the swelling or roll. At 60 % it
// catches (`ignite`): it tears its roots out of the floor and comes for you, burning, on its roots; the lash takes a
// third blow, it charges, the great kindling throws two rings of fire, and it goes under twice running.
//
// Every wind-up is its own. The right bough wound across to its left (the lash); both boughs high and back (the falling
// bough); the left claw drawn into the hollow of its breast, where its coal is (the kindling mark); leaning back, boughs
// low and spread, the crown shaking (the thorns); hugging itself, crouched (the roots rise); both boughs straight up
// together as it sinks (into the roots); a look over its right side, the bough raised behind (the turning bough). Ablaze:
// crouched, its claws in the floor, tearing (uprooted); boughs forward like antlers (the charge); crown thrown back, its
// breast opened (the great kindling).

// ---- its figure: built in Blender (tools/blender/kindling_tree.py), one piece per bone ----------------------------------
// An enormous trunk of living red-gold wood tapering up, twisted, its foot flaring into buttress roots over two braids
// of root; two gnarled boughs for arms, each ending in a splay of thorned twigs, a root hanging from each crook; a crown of
// bare branches with a few leaves the colour of embers; in its breast the hollow lipped with pale heartwood, and the coal
// in it. `burn` slots (wide seams of fire, flaming tips) show only once it catches (js/finale.js).
MODEL_DEFS.kindlingTree = {
  extends: 'ironKnight', faction: 'ember', budget: 'boss', fit: 1.0, limbSides: 8, rim: 0.5,
  proportions: { shoulderX: 0.42 },
  limbs: { armL: { len: 1.5 }, armR: { len: 1.5 } },
  // Boughs held out and a little forward, the crown leaning back: it looms.
  posture: { chest: [-0.04, 0, 0], head: [-0.1, 0, 0], armL: [-0.3, 0, 0.32], armR: [-0.3, 0, -0.32], elbowL: [-0.35, 0, 0], elbowR: [-0.35, 0, 0] },
  materials: {
    bark: { tex: 'emberBark', tint: 0xffffff, decay: 0.55, size: 512, rim: 0.3 },
    heartwood: { tex: 'churchPlank', tint: 0xf0c890, decay: 0.45, rim: 0.4 },   // the hollow's lips: older, paler wood
    root: { tex: 'churchLog', tint: 0x9a6a48, decay: 0.7 },
    thorn: { tex: 'bone', tint: 0xd8c0a0, decay: 0.55, rim: 0.4 },
    leaf: { tex: 'execPlumage', tint: 0xff8a50, decay: 0.5, double: true, rim: 0.3 },
    ember: { glow: 0xff8a30 },             // the coal in the hollow, the thin seams: always
    burn: { glow: 0xff6a20, burn: true },  // the wide seams and the flaming tips: only once it catches
  },
  bones: { vineL: { parent: 'elbowL', at: [0.05, -0.02, -0.04] }, vineR: { parent: 'elbowR', at: [-0.05, -0.02, -0.04] } },
  body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: null, hands: null, feet: null },
  parts: Object.entries({
    chest: ['bark', 'heartwood', 'ember', 'burn', 'thorn'], spin: ['bark'], legL: ['root'], legR: ['root'], kneeL: ['root'], kneeR: ['root'],
    armL: ['bark', 'thorn', 'burn'], armR: ['bark', 'thorn', 'burn'], elbowL: ['bark', 'root', 'thorn', 'burn'], elbowR: ['bark', 'root', 'thorn', 'burn'],
    vineL: ['root'], vineR: ['root'], head: ['bark', 'leaf', 'thorn', 'burn', 'ember'],
  }).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `tree:${bone}__${s}`, bone, slot: s, tile: 0.42 }))),
  weapon: null,
  eyes: null,   // no face: the coal in its breast is what looks at you
  anim: {
    idle: { breathRate: 0.35, breath: 0.01, headDrift: 0.03, sway: 0.02, twitch: 0 }, walk: { twist: 0.08, roll: 0.05, headNod: 0.03, elbow: 0.1, drag: 0.12 },
    flinch: { head: 0.2, chest: 0.2, arms: 0.3 }, death: { buckle: 0.6, slump: 1.0 },
    cloth: [{ bone: 'vineL', gain: 0.2, k: 30, damp: 3.4, flutter: 0.06 }, { bone: 'vineR', gain: 0.2, k: 30, damp: 3.4, flutter: 0.06 }],
  },
};

// ---- key poses (js/data/attack-poses.js format) -------------------------------------------------------------------------
// armL outward is +z, armR outward is -z; an arm's x below zero raises it forward (about -2.9 straight up); spin's y
// above zero turns it to its left; chest x above zero bends it forward.
{
  const swing = { windup: 'inOutCubic', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };
  const slow = { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutCubic' };

  // The Lash: the right bough wound across to its left, its trunk turned with it; swept out across to its right; then
  // the left bough, wound across to its right, answers back.
  const woundR = { crouch: 0.12, lean: 0.05, spin: [0, 0.75, 0], chest: [0.05, 0.25, 0], head: [0, -0.5, 0],
    armR: [-1.35, 0, 1.05], elbowR: [-0.7, 0, 0], armL: [-0.2, 0, 0.6], elbowL: [-0.6, 0, 0] };
  const lashedR = { crouch: 0.2, lean: 0.2, spin: [0, -0.85, 0], chest: [0.25, -0.3, 0], head: [0, 0.4, 0],
    armR: [-1.0, 0, -1.3], elbowR: [-0.1, 0, 0], armL: [-0.6, 0, -0.5], elbowL: [-1.0, 0, 0] };
  const lashedL = { crouch: 0.2, lean: 0.2, spin: [0, 0.85, 0], chest: [0.25, 0.3, 0], head: [0, -0.4, 0],
    armL: [-1.0, 0, 1.3], elbowL: [-0.1, 0, 0], armR: [-0.6, 0, 0.5], elbowR: [-1.0, 0, 0] };
  ATTACK_POSES.treeLash = { ease: swing, lag: { armR: 0.06, armL: 0.06 },
    hits: [{ windup: woundR, strike: lashedR, follow: { ...lashedR, spin: [0, -0.95, 0] } },
           { windup: { ...lashedR, armL: [-1.2, 0, -0.8], elbowL: [-0.7, 0, 0] }, strike: lashedL, follow: { ...lashedL, spin: [0, 0.95, 0] } }] };

  // The Falling Bough: both boughs raised high and back over its crown, its trunk bowed back; brought down together.
  const raised = { crouch: 0.05, lean: -0.2, chest: [-0.35, 0, 0], head: [-0.35, 0, 0],
    armL: [-2.95, 0, 0.35], elbowL: [-0.5, 0, 0], armR: [-2.95, 0, -0.35], elbowR: [-0.5, 0, 0] };
  const fallen = { crouch: 0.18, lean: 0.22, chest: [0.42, 0, 0], head: [0.2, 0, 0],
    armL: [-0.95, 0, 0.15], elbowL: [-0.05, 0, 0], armR: [-0.95, 0, -0.15], elbowR: [-0.05, 0, 0] };
  ATTACK_POSES.treeFallingBough = { ease: slow, lag: { armL: 0.05, armR: 0.05 }, hits: [{ windup: raised, strike: fallen, follow: { ...fallen, crouch: 0.22 } }] };

  // The Kindling Mark: the left claw drawn into the hollow of its breast, where the coal is, its crown bowed to it; the
  // claw driven into the floor before it; then torn out, and the mark it left burns.
  const toHollow = { crouch: 0.1, lean: -0.05, spin: [0, -0.25, 0], chest: [-0.1, 0.2, 0], head: [0.35, 0, 0],
    armL: [-0.55, 0, -0.45], elbowL: [-1.9, 0, 0], armR: [-0.4, 0, -0.9], elbowR: [-0.4, 0, 0] };
  const driven = { crouch: 0.22, lean: 0.25, spin: [0, 0.15, 0], chest: [0.42, -0.1, 0], head: [0.2, 0, 0],
    armL: [-1.05, 0, 0.05], elbowL: [-0.05, 0, 0], armR: [-0.5, 0, -0.8], elbowR: [-0.6, 0, 0] };
  const tornOut = { crouch: 0.15, lean: -0.15, spin: [0, -0.1, 0], chest: [-0.2, 0, 0], head: [-0.2, 0, 0],
    armL: [-1.9, 0, 0.6], elbowL: [-0.6, 0, 0], armR: [-0.4, 0, -1.0], elbowR: [-0.3, 0, 0] };
  ATTACK_POSES.treeKindlingMark = { ease: slow, lag: { armL: 0.05 },
    hits: [{ windup: toHollow, strike: driven, follow: driven }, { windup: { ...driven, crouch: 0.26, chest: [0.46, -0.1, 0] }, strike: tornOut, follow: tornOut }] };

  // The Thorns: leaning back, both boughs low and spread, its crown shaking; whipped up and forward, and the crown flings
  // its thorns.
  const spread = { crouch: 0.15, lean: -0.3, chest: [-0.4, 0, 0], head: [-0.45, 0, 0],
    armL: [0.25, 0, 1.15], elbowL: [-0.2, 0, 0], armR: [0.25, 0, -1.15], elbowR: [-0.2, 0, 0] };
  const flung = { crouch: 0.1, lean: 0.3, chest: [0.4, 0, 0], head: [0.3, 0, 0],
    armL: [-2.1, 0, 0.55], elbowL: [-0.3, 0, 0], armR: [-2.1, 0, -0.55], elbowR: [-0.3, 0, 0] };
  ATTACK_POSES.treeThorns = { ease: { ...slow, active: 'outQuad' }, hits: [{ windup: spread, strike: flung, follow: flung }] };

  // The Roots Rise: hugging itself, crouched over its own foot; thrown open and upright as the roots burst all round it.
  const hugged = { crouch: 0.32, lean: 0.1, chest: [0.42, 0, 0], head: [0.45, 0, 0],
    armL: [-1.05, 0, -0.85], elbowL: [-1.7, 0, 0], armR: [-1.05, 0, 0.85], elbowR: [-1.7, 0, 0] };
  const thrownOpen = { crouch: 0, lean: -0.15, chest: [-0.3, 0, 0], head: [-0.4, 0, 0],
    armL: [-0.7, 0, 1.45], elbowL: [-0.2, 0, 0], armR: [-0.7, 0, -1.45], elbowR: [-0.2, 0, 0] };
  ATTACK_POSES.treeRootsRise = { ease: { ...slow, windup: 'inOutCubic' }, hits: [{ windup: hugged, strike: thrownOpen, follow: thrownOpen }] };

  // Into the Roots: both boughs straight up together, its crown back, as it sinks (js/root-heave.js lowers the figure);
  // it comes up through the floor with them flung wide.
  const praying = { crouch: 0.2, lean: 0, chest: [-0.15, 0, 0], head: [-0.5, 0, 0],
    armL: [-3.0, 0, -0.08], elbowL: [0, 0, 0], armR: [-3.0, 0, 0.08], elbowR: [0, 0, 0] };
  const risen = { crouch: 0, lean: -0.1, chest: [-0.35, 0, 0], head: [-0.35, 0, 0],
    armL: [-1.9, 0, 1.25], elbowL: [-0.15, 0, 0], armR: [-1.9, 0, -1.25], elbowR: [-0.15, 0, 0] };
  ATTACK_POSES.treeIntoRoots = { ease: { ...slow, active: 'outQuad' }, hits: [{ windup: praying, strike: risen, follow: risen }, { windup: praying, strike: risen, follow: risen }] };

  // The Turning Bough: a look over its right side, the right bough raised behind it; it comes round.
  const lookBack = { crouch: 0.15, lean: 0, spin: [0, -0.5, 0], chest: [0, -0.4, 0], head: [0, -0.9, 0],
    armR: [0.55, 0, -1.1], elbowR: [-0.4, 0, 0], armL: [-0.9, 0, 0.6], elbowL: [-0.9, 0, 0] };
  const cameRound = { crouch: 0.25, lean: 0.1, spin: [0, -1.6, 0], chest: [0.1, -0.5, 0], head: [0, -0.3, 0],
    armR: [-1.4, 0, -1.4], elbowR: [-0.1, 0, 0], armL: [-0.5, 0, 0.3], elbowL: [-1.0, 0, 0] };
  ATTACK_POSES.treeTurning = { ease: swing, hits: [{ windup: lookBack, strike: cameRound, follow: cameRound }] };

  // ---- ablaze ----
  // Uprooted: crouched to the floor, both claws in it; it tears itself up and stands, boughs raised wide.
  const gripping = { crouch: 0.4, lean: 0.12, chest: [0.42, 0, 0], head: [0.3, 0, 0],
    armL: [-0.45, 0, 0.45], elbowL: [-0.15, 0, 0], armR: [-0.45, 0, -0.45], elbowR: [-0.15, 0, 0] };
  const torn = { crouch: 0, lean: -0.25, chest: [-0.4, 0, 0], head: [-0.55, 0, 0],
    armL: [-2.5, 0, 1.0], elbowL: [-0.3, 0, 0], armR: [-2.5, 0, -1.0], elbowR: [-0.3, 0, 0] };
  ATTACK_POSES.treeUprooted = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outCubic', recovery: 'inOutSine' }, hits: [{ windup: gripping, strike: torn, follow: torn }] };

  // The Burning Lash: the lash, and a third blow, both boughs from high on its left down through you.
  const highLeft = { crouch: 0.1, lean: -0.1, spin: [0, 0.6, 0], chest: [-0.25, 0.2, 0], head: [-0.2, -0.3, 0],
    armL: [-2.7, 0, 0.6], elbowL: [-0.4, 0, 0], armR: [-2.4, 0, 0.5], elbowR: [-0.5, 0, 0] };
  ATTACK_POSES.treeBurningLash = { ease: swing, lag: { armR: 0.05, armL: 0.05 },
    hits: [...ATTACK_POSES.treeLash.hits, { windup: highLeft, strike: { ...fallen, spin: [0, -0.3, 0] }, follow: { ...fallen, spin: [0, -0.35, 0], crouch: 0.22 } }] };

  // The Charge: low, boughs forward like antlers, its crown down; it runs on its roots.
  const antlers = { crouch: 0.2, lean: 0.25, chest: [0.4, 0, 0], head: [0.35, 0, 0],
    armL: [-1.5, 0, 0.3], elbowL: [-0.3, 0, 0], armR: [-1.5, 0, -0.3], elbowR: [-0.3, 0, 0] };
  const rammed = { crouch: 0.15, lean: 0.35, chest: [0.45, 0, 0], head: [0.2, 0, 0],
    armL: [-1.75, 0, 0.1], elbowL: [0, 0, 0], armR: [-1.75, 0, -0.1], elbowR: [0, 0, 0] };
  ATTACK_POSES.treeCharge = { ease: { ...swing, windup: 'inOutSine' }, hits: [{ windup: antlers, strike: rammed, follow: rammed }] };

  // The Great Kindling: its crown thrown back, its breast opened to the sky, boughs out; bowed down as the first ring goes,
  // thrown back again, and flung open for the second.
  const opened = { crouch: 0.1, lean: -0.3, chest: [-0.5, 0, 0], head: [-0.65, 0, 0],
    armL: [-0.15, 0, 1.3], elbowL: [-0.3, 0, 0], armR: [-0.15, 0, -1.3], elbowR: [-0.3, 0, 0] };
  const bowed = { crouch: 0.22, lean: 0.18, chest: [0.4, 0, 0], head: [0.3, 0, 0],
    armL: [-1.3, 0, 1.3], elbowL: [-0.1, 0, 0], armR: [-1.3, 0, -1.3], elbowR: [-0.1, 0, 0] };
  ATTACK_POSES.treeGreatKindling = { ease: slow, hits: [{ windup: opened, strike: bowed, follow: bowed }, { windup: { ...opened, crouch: 0.2 }, strike: torn, follow: torn }] };
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const RING = (from, to, width, time, h = 0.8) => ({ w: 1, h, d: 1, fwd: 0, y: h / 2, ring: { from, to, width, time } });
  const LASH = { w: 9.0, h: 1.8, d: 4.8, fwd: 2.8, y: 1.6 };        // a bough swept across: as wide as it reaches
  const BOUGH = { w: 2.6, h: 3.6, d: 5.4, fwd: 3.4, y: 1.5 };       // both boughs brought down ahead
  const CLAW = { w: 2.2, h: 1.6, d: 2.8, fwd: 4.2, y: 0.8 };        // the claw driven into the floor
  const MARK = { w: 4.8, h: 4.0, d: 4.8, fwd: 4.2, y: 1.5 };        // ... and the mark it left, burning
  const TURN = { w: 8.4, h: 1.8, d: 7.4, fwd: -0.8, y: 1.4 };       // the bough coming round behind it
  const RAM = { w: 3.8, h: 3.0, d: 3.6, fwd: 2.0, y: 1.4 };
  const RISE = RING(0, 2.0, 3.6, 0.15, 3.2);                         // it comes up through the floor: all of the swelling, 3.8 m round
  const THORNS = { speed: 20, gravity: 3, size: 0.1, look: 'thorn', spread: [-0.32, -0.16, 0, 0.16, 0.32] };
  const TREE = {
    id: 'kindlingTree', model: 'kindlingTree', name: 'The Kindling Tree',
    description: 'The Ember\'s own root, given limbs, where it began. Rooted in the heartwood, it does not walk to you: its boughs lash, its claw marks the floor to burn a moment later, and far off it goes down into its roots and the floor heaves after you. When the heave stops, get off the swelling. At 60% it catches and tears itself free.',
    scale: 2.5, bulk: 1.3, radius: 1.0, color: 0x6a2a14, weapon: 'none', idle: 'sway',
    visual: { skin: 0x7a3a1c, roughness: 0.85, rim: 0.6 },
    holyLight: { color: 0xff8a2a, core: 0xffd890 },   // its marks: the Ember's red-gold (js/holy.js)
    // hp and posture: kept from v7.65.0 (a skilled player alone beats it in about a minute, tools/bot-fights.cjs BOTS=1 CLEAN=1).
    hp: 2500, poise: 270, speed: 0, turnRate: 2.6, trackRate: 1.8, approach: 0, kite: 0,
    cooldown: [1.35, 2.7], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 6,
    posture: { max: 105, parry: 50, chainGap: 1.8, chainMul: 1.35, decay: 4, breakTime: 3.2, hitstop: 0.2 },
    defaultPhases: ['rooted', 'kindled'],
    phases: {
      // Rooted in the heartwood: it never steps, and nothing shoves it.
      rooted: { hp: 2500, rooted: true,
        attacks: ['lash', 'fallingBough', 'kindlingMark', 'thornVolley', 'rootsRise', 'intoTheRoots', 'turningBough', 'risingPunish'] },
      // At 60 % it catches, tears its roots out of the floor and comes for you.
      kindled: { at: 0.6, name: 'The Kindling Tree, Ablaze', opener: 'uprooted', ignite: true, rooted: false,
        cooldown: [1.05, 2.1], approach: 0.75, kite: 0.05, speed: 3.0, turnRate: 3.2, trackRate: 2.1,
        attacks: ['uprooted', 'burningLash', 'fallingBough', 'kindlingMark', 'thornVolley', 'rootsRise', 'rootCharge', 'greatKindling', 'deepRoots',
                  'turningBough', 'risingPunish'] },
    },
    attacks: [
      // ---- rooted ---------------------------------------------------------------------------------------------------------
      // The Lash: the right bough wound across, swept out; the left answers back. Parry both, or get under its trunk.
      { id: 'lash', name: 'The Lash', anim: 'sweep', pose: 'treeLash', tracking: { rate: 2.2, commit: 0.65 }, markers: glint(0, 1),
        hits: [{ startup: 1.05, active: 0.16, follow: 0.37, hold: { at: 0.6, time: [0.2, 0.6], chance: 0.35 } },
               { startup: 0.6, active: 0.16, follow: 0.3 }], recovery: 1.5,
        followUps: [{ attack: 'turningBough', if: 'behind', chance: 0.4 }],
        damage: 30, poise: 50, knock: 7, lunge: 0, range: 5.6, box: LASH },
      // The Falling Bough: both boughs high and back, a pause, brought down together. Parry it, or roll aside.
      { id: 'fallingBough', name: 'The Falling Bough', anim: 'chop', pose: 'treeFallingBough', tracking: { rate: 2.4, commit: 0.6 }, markers: glint(0),
        hits: [{ startup: 1.3, active: 0.16, follow: 0.4, hold: { at: 0.6, time: [0.3, 0.8], chance: 0.5 }, impact: { ring: 3.0, crack: 2.0, dust: 18, shake: 0.14 } }], recovery: 2.1,
        damage: 44, poise: 75, knock: 9, lunge: 0, range: 6.0, box: BOUGH },
      // The Kindling Mark: the claw drawn to its coal and driven into the floor before it; torn out, the mark it left burns
      // a moment later, where it was. Step off it.
      { id: 'kindlingMark', name: 'The Kindling Mark', anim: 'chop', pose: 'treeKindlingMark', noParry: true, tracking: { rate: 2.4, commit: 0.6 }, chance: 0.5,
        hits: [{ startup: 1.15, active: 0.15, follow: 0.35, damage: 26, box: CLAW, impact: { ring: 2.0, crack: 1.4, dust: 12, shake: 0.1 } },
               { startup: 1.2, active: 0.18, follow: 0.4, still: true, sigil: 2.4, box: MARK, impact: { ring: 3.0, crack: 0.8, dust: 10, shake: 0.12 } }], recovery: 1.65,
        damage: 40, poise: 60, knock: 8, lunge: 0, range: 6.2, minRange: 1.5, box: MARK },
      // The Thorns: leaning back, boughs low and spread; its crown flings a fan of thorns. At range.
      { id: 'thornVolley', name: 'Thorns', anim: 'overhead', pose: 'treeThorns', noParry: true, tracking: { rate: 3.0, commit: 0.85 }, minRange: 6, chance: 0.45,
        projectile: THORNS, hits: [{ startup: 1.0, active: 0.05, follow: 0.3 }], recovery: 1.2,
        damage: 14, poise: 15, knock: 3, lunge: 0, range: 24, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 3.6 } },
      // The Roots Rise: hugging itself, crouched; the roots burst up all round it. Roll through, or be away.
      { id: 'rootsRise', name: 'The Roots Rise', anim: 'stomp', pose: 'treeRootsRise', noParry: true, rollOnly: true, tracking: { rate: 1.2, commit: 0.4 }, chance: 0.9,
        hits: [{ startup: 1.25, active: 0.4, follow: 0.4, box: RING(0.6, 6.0, 1.6, 0.4, 1.6), impact: { ring: 4.0, crack: 2.4, dust: 22, shake: 0.16 } }], recovery: 1.8,
        damage: 34, poise: 50, knock: 9, lunge: 0, range: 4.0, box: RING(0.6, 6.0, 1.6, 0.4, 1.6) },
      // Into the Roots: boughs up together, it sinks; the floor heaves and runs after you, stops, swells, and it comes up
      // through it. Get off the swelling once it stops, or roll as it breaks. A long opening after.
      { id: 'intoTheRoots', name: 'Into the Roots', anim: 'stomp', pose: 'treeIntoRoots', noParry: true, rollOnly: true, tracking: { rate: 2.0, commit: 0.3 }, minRange: 4.5, chance: 0.45,
        hits: [{ startup: 2.6, active: 0.2, follow: 0.5, burrow: { from: 0.18, lock: 0.72, speed: 11, turn: 2.4 }, impact: { ring: 4.2, crack: 2.6, dust: 28, shake: 0.2 } }], recovery: 2.4,
        damage: 46, poise: 80, knock: 10, lunge: 0, range: 22, box: RISE },
      // The Turning Bough: behind it, a look over its right side; the bough comes round.
      { id: 'turningBough', name: 'The Turning Bough', anim: 'sweep', pose: 'treeTurning', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 4,
        hits: [{ startup: 0.75, active: 0.16, follow: 0.3 }], recovery: 1.35,
        damage: 26, poise: 40, knock: 8, lunge: 0, range: 4.6, box: TURN },
      // Drinking where it can feel it: it goes under, sooner, and faster.
      { id: 'risingPunish', name: 'Into the Roots', anim: 'stomp', pose: 'treeIntoRoots', noParry: true, rollOnly: true, when: 'healing', tracking: { rate: 2.4, commit: 0.3 }, chance: 3,
        hits: [{ startup: 1.9, active: 0.2, follow: 0.4, burrow: { from: 0.15, lock: 0.6, speed: 13, turn: 3.0 }, impact: { ring: 4.2, crack: 2.6, dust: 28, shake: 0.2 } }], recovery: 2.1,
        damage: 40, poise: 70, knock: 10, lunge: 0, range: 20, box: RISE },
      // ---- ablaze --------------------------------------------------------------------------------------------------------
      // Uprooted (the phase opener): its claws in the floor, it tears itself free; a ring of burning earth all round. It
      // cannot be hurt through it (as every boss's change).
      { id: 'uprooted', name: 'Uprooted', anim: 'stomp', pose: 'treeUprooted', noParry: true, rollOnly: true, invulnerable: true, tracking: { rate: 1.6, commit: 0.5 }, chance: 0.1,
        hits: [{ startup: 1.8, active: 0.5, follow: 0.4, box: RING(0.8, 9.0, 1.6, 0.55, 1.4), impact: { ring: 5.0, crack: 3.0, dust: 30, shake: 0.22 } }], recovery: 1.95,
        damage: 32, poise: 50, knock: 9, lunge: 0, range: 8, box: RING(0.8, 9.0, 1.6, 0.55, 1.4) },
      // The Burning Lash: the lash with a stride into each blow, and a third, both boughs down from high on its left.
      { id: 'burningLash', name: 'The Burning Lash', anim: 'sweep', pose: 'treeBurningLash', tracking: { rate: 2.6, commit: 0.65 }, markers: glint(0, 1, 2),
        hits: [{ startup: 0.95, active: 0.16, follow: 0.35, step: { from: 0.2, speed: 3.5, side: 0 } },
               { startup: 0.55, active: 0.16, follow: 0.35, step: { from: 0.1, speed: 3.5, side: 0 } },
               { startup: 0.75, active: 0.16, follow: 0.4, damage: 40, box: BOUGH, impact: { ring: 3.0, crack: 2.0, dust: 18, shake: 0.14 } }], recovery: 1.95,
        followUps: [{ attack: 'turningBough', if: 'behind', chance: 0.4 }],
        damage: 30, poise: 50, knock: 7, lunge: 1.0, range: 5.4, box: LASH },
      // The Charge: low, boughs forward like antlers; it runs at you on its roots. Roll aside, late.
      { id: 'rootCharge', name: 'The Charge', anim: 'thrust', pose: 'treeCharge', noParry: true, tracking: { rate: 2.6, commit: 0.7 }, minRange: 5, chance: 0.4,
        dash: { speed: 11, from: 0.45 }, hits: [{ startup: 1.2, active: 0.2, follow: 0.4, impact: { ring: 2.4, crack: 0.8, dust: 18, shake: 0.12 } }], recovery: 2.1,
        damage: 40, poise: 70, knock: 10, lunge: 0, range: 14, box: RAM },
      // The Great Kindling: its breast opened to the sky; a ring of fire, and a wider one after it. Roll each.
      { id: 'greatKindling', name: 'The Great Kindling', anim: 'stomp', pose: 'treeGreatKindling', noParry: true, rollOnly: true, tracking: { rate: 1.4, commit: 0.4 }, chance: 0.35,
        hits: [{ startup: 1.6, active: 0.45, follow: 0.35, box: RING(0.8, 7.0, 1.6, 0.45, 1.6), impact: { ring: 4.4, crack: 2.0, dust: 20, shake: 0.16 } },
               { startup: 0.85, active: 0.55, follow: 0.4, box: RING(2.5, 11.0, 1.6, 0.55, 1.6), impact: { ring: 6.0, crack: 2.4, dust: 26, shake: 0.2 } }], recovery: 2.25,
        damage: 36, poise: 60, knock: 9, lunge: 0, range: 9, box: RING(0.8, 7.0, 1.6, 0.45, 1.6) },
      // Deep Roots: it goes under, comes up through the swelling, and goes under again.
      { id: 'deepRoots', name: 'Deep Roots', anim: 'stomp', pose: 'treeIntoRoots', noParry: true, rollOnly: true, tracking: { rate: 2.0, commit: 0.3 }, minRange: 4.5, chance: 0.4,
        hits: [{ startup: 2.2, active: 0.2, follow: 0.45, burrow: { from: 0.2, lock: 0.68, speed: 12, turn: 2.4 }, impact: { ring: 4.2, crack: 2.6, dust: 28, shake: 0.2 } },
               { startup: 1.8, active: 0.2, follow: 0.5, burrow: { from: 0.25, lock: 0.62, speed: 12, turn: 2.6 }, impact: { ring: 4.2, crack: 2.6, dust: 28, shake: 0.2 } }], recovery: 2.7,
        damage: 40, poise: 70, knock: 10, lunge: 0, range: 22, box: RISE },
    ],
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
