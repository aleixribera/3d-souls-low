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
// it cannot touch you and you cannot touch it while it is under; once it stops, step off the swelling or roll, and parry
// the boughs it brings down as it rises. At 60 % it catches (`ignite`): it tears its roots out of the floor and comes for
// you, burning, on its roots; the lash takes a third blow, it charges, the great kindling throws two rings of fire, it goes
// under twice running, and it throws the whole of itself down on you (the falling tree), the floor burning where it fell.
// Pass 149 reworked it (docs/bosses/kindling-tree.md): every blow of a bough or a claw is parried; the Wrack, the Bramble
// Sweep, the Reaching Bough and the Falling Tree are new; its strings branch on where you stand.
//
// Every wind-up is its own. The right bough wound across to its left (the lash); both boughs high and back (the falling
// bough); the left claw drawn into the hollow of its breast, where its coal is (the kindling mark); the right bough cocked
// high over its shoulder, the left claw held out low (the wrack); crouched, crown bowed, both boughs dragged out low on its
// right (the bramble sweep); the right bough drawn straight back, the left claw pointed at you (the reaching bough);
// leaning back, boughs low and spread, the crown shaking (the thorns); hugging itself, crouched (the roots rise); bowed,
// both boughs straight up together as it sinks (into the roots); a look over its right side, the bough raised behind (the
// turning bough). Ablaze: crouched, its claws in the floor, tearing (uprooted); boughs forward like antlers (the charge);
// crown thrown back, its breast opened (the great kindling); reared up tall, boughs flung wide (the falling tree).

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
  // (pass 149, docs/bosses/system.md 4) the wind-up's tell sits on what strikes, never over its trunk: the thorned splay at
  // the end of either bough, or its crown for what comes up from the roots; a heavy grows that halo (tellsGrow).
  tells: { boughR: { bone: 'elbowR', at: [0, -0.62, 0.06], size: 0.55 }, boughL: { bone: 'elbowL', at: [0, -0.62, 0.06], size: 0.55 },
    crown: { bone: 'head', at: [0, 0.45, 0], size: 0.7 } },
  tellsGrow: true,
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
  const thrownOpen = { crouch: 0, lean: -0.25, chest: [-0.42, 0, 0], head: [-0.4, 0, 0],
    armL: [-0.7, 0, 1.45], elbowL: [-0.2, 0, 0], armR: [-0.7, 0, -1.45], elbowR: [-0.2, 0, 0] };
  ATTACK_POSES.treeRootsRise = { ease: { ...slow, windup: 'inOutCubic' }, hits: [{ windup: hugged, strike: thrownOpen, follow: thrownOpen }] };

  // Into the Roots: bowed over its foot, both boughs straight up together, as it sinks (js/root-heave.js lowers the
  // figure); it comes up through the floor upright, with them flung wide.
  const praying = { crouch: 0.2, lean: 0.15, chest: [0.3, 0, 0], head: [-0.2, 0, 0],
    armL: [-3.0, 0, -0.08], elbowL: [0, 0, 0], armR: [-3.0, 0, 0.08], elbowR: [0, 0, 0] };
  const risen = { crouch: 0, lean: -0.15, chest: [-0.4, 0, 0], head: [-0.35, 0, 0],
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
  // bowed low again, and flung open for the second.
  const opened = { crouch: 0.1, lean: -0.3, chest: [-0.5, 0, 0], head: [-0.65, 0, 0],
    armL: [-0.15, 0, 1.3], elbowL: [-0.3, 0, 0], armR: [-0.15, 0, -1.3], elbowR: [-0.3, 0, 0] };
  const bowed = { crouch: 0.22, lean: 0.18, chest: [0.4, 0, 0], head: [0.3, 0, 0],
    armL: [-1.3, 0, 1.3], elbowL: [-0.1, 0, 0], armR: [-1.3, 0, -1.3], elbowR: [-0.1, 0, 0] };
  ATTACK_POSES.treeGreatKindling = { ease: slow, hits: [{ windup: opened, strike: bowed, follow: bowed }, { windup: { ...bowed, crouch: 0.28 }, strike: torn, follow: torn }] };

  // ---- pass 149's rework (docs/bosses/kindling-tree.md) ----
  // Into the Roots and Deep Roots rise with their boughs flung wide, then bring them down on you together: the rise is
  // rolled, the boughs parried.
  const riseFall = { windup: { ...risen, crouch: 0.05, lean: -0.2, chest: [-0.45, 0, 0], armL: [-2.6, 0, 0.7], armR: [-2.6, 0, -0.7] }, strike: fallen, follow: { ...fallen, crouch: 0.24 } };
  ATTACK_POSES.treeIntoRoots.hits = [{ windup: praying, strike: risen, follow: risen }, riseFall];
  ATTACK_POSES.treeDeepRoots = { ease: ATTACK_POSES.treeIntoRoots.ease, hits: [{ windup: praying, strike: risen, follow: risen }, { windup: praying, strike: risen, follow: risen }, riseFall] };

  // The Wrack: the right bough cocked high over its right shoulder, the trunk wound to its right, the left claw held out
  // low and open; the bough chopped down across before it; then the left claw, dropped behind its left hip, rakes up and
  // across.
  const cocked = { crouch: 0.12, lean: -0.05, spin: [0, -0.55, 0], chest: [-0.1, -0.3, 0], head: [0, 0.35, 0],
    armR: [-2.5, 0, -0.75], elbowR: [-1.5, 0, 0], armL: [-0.85, 0, 0.15], elbowL: [-0.2, 0, 0] };
  const chopped = { crouch: 0.22, lean: 0.25, spin: [0, 0.35, 0], chest: [0.4, 0.2, 0], head: [0.15, 0, 0],
    armR: [-0.8, 0, 0.35], elbowR: [-0.15, 0, 0], armL: [0.35, 0, 0.55], elbowL: [-0.5, 0, 0] };
  const raked = { crouch: 0.15, lean: 0.12, spin: [0, -0.7, 0], chest: [0.05, -0.35, 0], head: [0, 0.3, 0],
    armL: [-2.0, 0, -0.55], elbowL: [-0.2, 0, 0], armR: [-0.4, 0, -0.7], elbowR: [-0.7, 0, 0] };
  ATTACK_POSES.treeWrack = { ease: swing, lag: { armR: 0.06, armL: 0.06 },
    hits: [{ windup: cocked, strike: chopped, follow: { ...chopped, crouch: 0.26, chest: [0.48, 0.25, 0] } },
           { windup: { ...chopped, spin: [0, 0.55, 0], armL: [0.55, 0, 0.7], elbowL: [-0.4, 0, 0] }, strike: raked, follow: { ...raked, spin: [0, -0.9, 0] } }] };

  // The Bramble Sweep: crouched low, its crown bowed at your feet, both boughs dragged out low on its right; swept along
  // the floor across before it to its left (jump it, or parry).
  const draggedLow = { crouch: 0.38, lean: 0.2, spin: [0, -0.8, 0], chest: [0.45, -0.25, 0], head: [0.4, 0.2, 0],
    armR: [0.2, 0, -1.25], elbowR: [-0.1, 0, 0], armL: [-0.6, 0, -1.0], elbowL: [-0.3, 0, 0] };
  const sweptLow = { crouch: 0.42, lean: 0.25, spin: [0, 0.85, 0], chest: [0.5, 0.3, 0], head: [0.3, -0.2, 0],
    armR: [-0.6, 0, 1.0], elbowR: [-0.2, 0, 0], armL: [0.15, 0, 1.25], elbowL: [-0.1, 0, 0] };
  ATTACK_POSES.treeBrambleSweep = { ease: swing, lag: { armR: 0.05, armL: 0.05 }, hits: [{ windup: draggedLow, strike: sweptLow, follow: { ...sweptLow, spin: [0, 1.05, 0] } }] };

  // The Reaching Bough: crouched and coiled low, the trunk turned away, the right bough drawn straight back level behind
  // it and the left claw levelled at you, one line through the body like a spear; driven straight out at you, the whole
  // trunk leaning after it. (pass 152, bars-1: drawn back low and the claw raised, it read as the Wrack's spread boughs.)
  const drawnBack = { crouch: 0.32, lean: 0.22, spin: [0, -0.9, 0], chest: [0.3, -0.3, 0], head: [-0.1, 0.75, 0],
    armR: [1.85, 0, -0.1], elbowR: [0, 0, 0], armL: [-1.05, 0, 0.05], elbowL: [0, 0, 0] };
  const driven2 = { crouch: 0.2, lean: 0.35, spin: [0, 0.35, 0], chest: [0.3, 0.2, 0], head: [0.1, -0.2, 0],
    armR: [-1.55, 0, 0.1], elbowR: [0, 0, 0], armL: [-0.3, 0, 0.7], elbowL: [-0.8, 0, 0] };
  ATTACK_POSES.treeReaching = { ease: { ...swing, active: 'outQuad' }, lag: { armR: 0.05 }, hits: [{ windup: drawnBack, strike: driven2, follow: { ...driven2, lean: 0.42, spin: [0, 0.45, 0] } }] };

  // The Falling Tree (ablaze): reared up tall, boughs flung wide to either side, its crown thrown back and burning; it
  // throws the whole of itself down full length before it, and where it fell the floor burns.
  const reared = { crouch: 0, lean: -0.35, chest: [-0.5, 0, 0], head: [-0.6, 0, 0], spin: [0, 0.15, 0],
    armL: [-1.7, 0, 1.55], elbowL: [-0.1, 0, 0], armR: [-1.7, 0, -1.55], elbowR: [-0.1, 0, 0] };
  const felled = { crouch: 0.35, lean: 0.75, chest: [0.7, 0, 0], head: [0.4, 0, 0], spin: [0, -0.05, 0],
    armL: [-1.3, 0, 0.35], elbowL: [0, 0, 0], armR: [-1.3, 0, -0.35], elbowR: [0, 0, 0] };
  ATTACK_POSES.treeFallingTree = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutSine' },
    hits: [{ windup: reared, strike: felled, follow: { ...felled, crouch: 0.4, lean: 0.82 } }] };

  // (pass 149, tools/body-check.cjs; as Oswin's and Agathe's) every follow-through carries its weight on past the blow: a
  // fifth again of the wind-up-to-strike change in its lean, its bend and its turn, where the pose written does not
  // already go further. Then in-between keys from each hit's own poses, every one `rel`: a last breath of wind before the
  // blow; its trunk leads while the boughs trail a beat and whip through; its weight goes on after it.
  const get = (q, ch, i) => (i == null ? q[ch] || 0 : (q[ch] || [0, 0, 0])[i]);
  const carry = h => {
    const F = { ...h.follow };
    for (const [ch, i] of [['lean'], ['chest', 0], ['chest', 1], ['spin', 1]]) {
      const d = get(h.strike, ch, i) - get(h.windup, ch, i), want = get(h.strike, ch, i) + 0.2 * d;
      if (Math.abs(d) < 0.05 || (get(F, ch, i) - want) * Math.sign(d) >= 0) continue;
      if (i == null) F[ch] = want; else { const v = [...(F[ch] || [0, 0, 0])]; v[i] = want; F[ch] = v; }
    }
    // A blow that neither drops nor leans into it gets its weight: the trunk settles a little through the follow.
    if (get(F, 'crouch') <= get(h.strike, 'crouch') + 0.02 && Math.abs(get(h.strike, 'lean') - get(h.windup, 'lean')) < 0.1) F.crouch = get(h.strike, 'crouch') + 0.08;
    return { ...h, follow: F };
  };
  const BODY = ['spin', 'chest'], LIMB = ['armR', 'elbowR', 'armL', 'elbowL'];
  const toward = (a, b, k, names) => Object.fromEntries(names.filter(n => a[n] && b[n])
    .map(n => [n, a[n].map((v, i) => Math.max(-0.45, Math.min(0.45, k * (b[n][i] - v))))]));
  const inBetween = h => ({
    windup: [{ t: 0.8, rel: true, crouch: 0.02, ...toward(h.strike, h.windup, 0.08, [...BODY, ...LIMB]) }],
    active: [{ t: 0.6, rel: true, crouch: 0.04, lean: 0.03, ...toward(h.windup, h.strike, 0.3, BODY), ...toward(h.windup, h.strike, -0.25, LIMB) }],
    follow: [{ t: 0.5, rel: true, crouch: 0.05, lean: 0.06, ...toward(h.strike, h.follow, 0.3, [...BODY, ...LIMB]) }],
  });
  for (const [id, P] of Object.entries(ATTACK_POSES)) if (/^tree[A-Z]/.test(id)) {
    P.ease = { ...P.ease, windup: 'outCubic' };
    P.hits = P.hits.map(carry).map(h => ({ ...h, via: { ...inBetween(h), ...(h.via || {}) } }));
  }
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
  const SWEEP = { w: 9.0, h: 0.9, d: 5.0, fwd: 2.6, y: 0.45, ground: true };   // both boughs along the floor: jumped
  const REACH = { w: 1.8, h: 1.8, d: 5.6, fwd: 5.2, y: 1.6 };       // a bough driven straight out
  const TRUNK = { w: 3.2, h: 2.6, d: 8.6, fwd: 4.6, y: 1.0 };       // the whole tree thrown down full length
  const RISE = RING(0, 2.0, 3.6, 0.15, 3.2);                         // it comes up through the floor: all of the swelling, 3.8 m round
  // The rise from the roots, then its boughs brought down on you together (pass 149): parried.
  const RISE_FALL = { startup: 0.75, active: 0.16, follow: 0.45, tell: 'boughR', damage: 36, box: BOUGH, impact: { ring: 3.0, crack: 2.0, dust: 18, shake: 0.14 } };
  const THORNS = { speed: 20, gravity: 3, size: 0.1, look: 'thorn', spread: [-0.32, -0.16, 0, 0.16, 0.32] };
  const TREE = {
    id: 'kindlingTree', model: 'kindlingTree', name: 'The Kindling Tree',
    description: 'The Ember\'s own root, given limbs, where it began. Rooted in the heartwood, it does not walk to you: its boughs lash, its claw marks the floor to burn a moment later, and far off it goes down into its roots and the floor heaves after you. When the heave stops, get off the swelling. At 60% it catches and tears itself free.',
    scale: 2.5, bulk: 1.3, radius: 1.0, color: 0x6a2a14, weapon: 'none', idle: 'sway',
    visual: { skin: 0x7a3a1c, roughness: 0.85, rim: 0.6 },
    holyLight: { color: 0xff8a2a, core: 0xffd890 },   // its marks: the Ember's red-gold (js/holy.js)
    // hp: kept from v7.65.0 (a skilled player alone beats it in about a minute, tools/bot-fights.cjs BOTS=1 CLEAN=1).
    hp: 2500, poise: 270, speed: 0, turnRate: 2.6, trackRate: 1.8, approach: 0, kite: 0,
    cooldown: [1.35, 2.7], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 6,
    defaultPhases: ['rooted', 'kindled'],
    phases: {
      // Rooted in the heartwood: it never steps, and nothing shoves it.
      rooted: { hp: 2500, rooted: true,
        attacks: ['lash', 'fallingBough', 'kindlingMark', 'wrack', 'brambleSweep', 'reachingBough', 'thornVolley', 'rootsRise', 'intoTheRoots', 'turningBough', 'risingPunish'] },
      // At 60 % it catches, tears its roots out of the floor and comes for you.
      kindled: { at: 0.6, name: 'The Kindling Tree, Ablaze', opener: 'uprooted', ignite: true, rooted: false,
        cooldown: [1.05, 2.1], approach: 0.75, kite: 0.05, speed: 3.0, turnRate: 3.2, trackRate: 2.1,
        attacks: ['uprooted', 'burningLash', 'wrack', 'fallingBough', 'kindlingMark', 'brambleSweep', 'rootCharge', 'greatKindling', 'deepRoots',
                  'fallingTree', 'turningBough', 'risingPunish'] },
    },
    attacks: [
      // ---- rooted ---------------------------------------------------------------------------------------------------------
      // The Lash: the right bough wound across, swept out; the left answers back. Parry both, or get under its trunk. Behind
      // it, the bough comes round; backed off, its crown flings thorns after you.
      { id: 'lash', name: 'The Lash', anim: 'sweep', pose: 'treeLash', tracking: { rate: 2.2, commit: 0.65 }, markers: glint(0, 1),
        hits: [{ startup: 1.05, active: 0.16, follow: 0.37, tell: 'boughR', hold: { at: 0.6, time: [0.2, 0.6], chance: 0.35 } },
               { startup: 0.6, active: 0.16, follow: 0.3, tell: 'boughL' }], recovery: 1.5,
        followUps: [{ attack: 'turningBough', if: 'behind', chance: 0.4 }, { attack: 'thornVolley', if: 'far', chance: 0.35 }],
        damage: 30, poise: 50, knock: 7, lunge: 0, range: 5.6, box: LASH },
      // The Falling Bough: both boughs high and back, a pause, brought down together. Parry it, or roll aside.
      { id: 'fallingBough', name: 'The Falling Bough', anim: 'chop', pose: 'treeFallingBough', tracking: { rate: 2.4, commit: 0.6 }, markers: glint(0),
        hits: [{ startup: 1.3, active: 0.16, follow: 0.4, tell: 'boughR', hold: { at: 0.6, time: [0.3, 0.8], chance: 0.5 }, impact: { ring: 3.0, crack: 2.0, dust: 18, shake: 0.14 } }], recovery: 2.1,
        damage: 44, heavy: true, poise: 75, knock: 9, lunge: 0, range: 6.0, box: BOUGH },
      // The Kindling Mark: the claw drawn to its coal and driven into the floor before it (parry the claw); torn out, the mark
      // it left burns a moment later, where it was (step off it).
      { id: 'kindlingMark', name: 'The Kindling Mark', anim: 'chop', pose: 'treeKindlingMark', tracking: { rate: 2.4, commit: 0.6 }, chance: 0.5, markers: glint(0),
        hits: [{ startup: 1.15, active: 0.15, follow: 0.35, tell: 'boughL', damage: 26, box: CLAW, impact: { ring: 2.0, crack: 1.4, dust: 12, shake: 0.1 } },
               { startup: 1.2, active: 0.18, follow: 0.4, still: true, noParry: true, tell: 'boughL', sigil: 2.4, box: MARK, impact: { ring: 3.0, crack: 0.8, dust: 10, shake: 0.12 } }], recovery: 1.65,
        damage: 40, heavy: true, poise: 60, knock: 8, lunge: 0, range: 6.2, minRange: 1.5, box: MARK },
      // The Wrack (pass 149): the right bough cocked high over its shoulder, chopped down across; the left claw rakes up after
      // it. Parry both. Stay hugging its trunk and the roots rise; back off and it goes into the roots after you.
      { id: 'wrack', name: 'The Wrack', anim: 'chop', pose: 'treeWrack', tracking: { rate: 2.4, commit: 0.65 }, markers: glint(0, 1),
        hits: [{ startup: 0.95, active: 0.16, follow: 0.25, tell: 'boughR', hold: { at: 0.55, time: [0.2, 0.5], chance: 0.35 }, box: BOUGH, impact: { ring: 2.4, crack: 1.4, dust: 12, shake: 0.1 } },
               { startup: 0.55, active: 0.16, follow: 0.35, tell: 'boughL', damage: 26, box: LASH }], recovery: 1.6,
        followUps: [{ attack: 'rootsRise', if: 'near', chance: 0.45 }, { attack: 'intoTheRoots', if: 'far', chance: 0.4 }],
        damage: 34, poise: 55, knock: 8, lunge: 0, range: 5.4, box: BOUGH },
      // The Bramble Sweep (pass 149): crouched, crown bowed at your feet, both boughs dragged out low on its right; swept along
      // the floor across before it. Jump it, or parry.
      { id: 'brambleSweep', name: 'The Bramble Sweep', anim: 'sweep', pose: 'treeBrambleSweep', tracking: { rate: 2.2, commit: 0.6 }, markers: glint(0), chance: 0.8,
        hits: [{ startup: 1.0, active: 0.18, follow: 0.4, tell: 'boughR', hold: { at: 0.6, time: [0.2, 0.55], chance: 0.4 } }], recovery: 1.7,
        damage: 30, poise: 50, knock: 6, lunge: 0, range: 5.6, box: SWEEP },
      // The Reaching Bough (pass 149): the right bough drawn straight back, the left claw pointed at you; driven straight
      // out, as far as a spear. Parry it, or roll in under it. What it has for you at mid range.
      { id: 'reachingBough', name: 'The Reaching Bough', anim: 'thrust', pose: 'treeReaching', tracking: { rate: 2.6, commit: 0.7 }, markers: glint(0), minRange: 3.5, chance: 0.7,
        hits: [{ startup: 1.0, active: 0.16, follow: 0.4, tell: 'boughR', hold: { at: 0.6, time: [0.2, 0.6], chance: 0.4 } }], recovery: 1.6,
        damage: 32, poise: 50, knock: 8, lunge: 0, range: 8.2, box: REACH },
      // The Thorns: leaning back, boughs low and spread; its crown flings a fan of thorns. At range.
      { id: 'thornVolley', name: 'Thorns', anim: 'overhead', pose: 'treeThorns', noParry: true, tracking: { rate: 3.0, commit: 0.85 }, minRange: 6, chance: 0.45,
        projectile: THORNS, hits: [{ startup: 1.0, active: 0.05, follow: 0.3, tell: 'crown' }], recovery: 1.2,
        damage: 14, poise: 15, knock: 3, lunge: 0, range: 24, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 3.6 } },
      // The Roots Rise: hugging itself, crouched; the roots burst up all round it. Roll through, or be away.
      { id: 'rootsRise', name: 'The Roots Rise', anim: 'stomp', pose: 'treeRootsRise', noParry: true, rollOnly: true, tracking: { rate: 1.2, commit: 0.4 }, chance: 0.6,
        hits: [{ startup: 1.25, active: 0.4, follow: 0.4, tell: 'crown', box: RING(0.6, 6.0, 1.6, 0.4, 1.6), impact: { ring: 4.0, crack: 2.4, dust: 22, shake: 0.16 } }], recovery: 1.8,
        damage: 34, poise: 50, knock: 9, lunge: 0, range: 4.0, box: RING(0.6, 6.0, 1.6, 0.4, 1.6) },
      // Into the Roots: boughs up together, it sinks; the floor heaves and runs after you, stops, swells, and it comes up
      // through it (step off the swelling, or roll as it breaks), its boughs flung wide, and brings them down on you (parry).
      { id: 'intoTheRoots', name: 'Into the Roots', anim: 'chop', pose: 'treeIntoRoots', tracking: { rate: 2.0, commit: 0.3 }, minRange: 4.5, chance: 0.45, markers: glint(1),
        hits: [{ startup: 2.6, active: 0.2, follow: 0.3, tell: 'crown', noParry: true, burrow: { from: 0.18, lock: 0.72, speed: 11, turn: 2.4 }, impact: { ring: 4.2, crack: 2.6, dust: 28, shake: 0.2 } },
               RISE_FALL], recovery: 2.2,
        damage: 46, heavy: true, poise: 80, knock: 10, lunge: 0, range: 22, box: RISE },
      // The Turning Bough: behind it, a look over its right side; the bough comes round.
      { id: 'turningBough', name: 'The Turning Bough', anim: 'sweep', pose: 'treeTurning', when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 4,
        hits: [{ startup: 0.75, active: 0.16, follow: 0.3, tell: 'boughR' }], recovery: 1.35,
        damage: 26, poise: 40, knock: 8, lunge: 0, range: 4.6, box: TURN },
      // Drinking where it can feel it: it goes under, sooner, and faster.
      { id: 'risingPunish', name: 'Into the Roots', anim: 'chop', pose: 'treeIntoRoots', when: 'healing', tracking: { rate: 2.4, commit: 0.3 }, chance: 3, markers: glint(1),
        hits: [{ startup: 1.9, active: 0.2, follow: 0.3, tell: 'crown', noParry: true, burrow: { from: 0.15, lock: 0.6, speed: 13, turn: 3.0 }, impact: { ring: 4.2, crack: 2.6, dust: 28, shake: 0.2 } },
               RISE_FALL], recovery: 2.0,
        damage: 40, heavy: true, poise: 70, knock: 10, lunge: 0, range: 20, box: RISE },
      // ---- ablaze --------------------------------------------------------------------------------------------------------
      // Uprooted (the phase opener): its claws in the floor, it tears itself free; a ring of burning earth all round. It
      // cannot be hurt through it (as every boss's change).
      { id: 'uprooted', name: 'Uprooted', anim: 'stomp', pose: 'treeUprooted', noParry: true, rollOnly: true, invulnerable: true, tracking: { rate: 1.6, commit: 0.5 }, chance: 0.1,
        hits: [{ startup: 1.8, active: 0.5, follow: 0.4, tell: 'crown', box: RING(0.8, 9.0, 1.6, 0.55, 1.4), impact: { ring: 5.0, crack: 3.0, dust: 30, shake: 0.22 } }], recovery: 1.95,
        damage: 32, poise: 50, knock: 9, lunge: 0, range: 8, box: RING(0.8, 9.0, 1.6, 0.55, 1.4) },
      // The Burning Lash: the lash with a stride into each blow, and a third, both boughs down from high on its left.
      { id: 'burningLash', name: 'The Burning Lash', anim: 'sweep', pose: 'treeBurningLash', tracking: { rate: 2.6, commit: 0.65 }, markers: glint(0, 1, 2),
        hits: [{ startup: 0.95, active: 0.16, follow: 0.35, tell: 'boughR', step: { from: 0.2, speed: 3.5, side: 0 } },
               { startup: 0.55, active: 0.16, follow: 0.35, tell: 'boughL', step: { from: 0.1, speed: 3.5, side: 0 } },
               { startup: 0.75, active: 0.16, follow: 0.4, tell: 'boughL', damage: 40, box: BOUGH, impact: { ring: 3.0, crack: 2.0, dust: 18, shake: 0.14 } }], recovery: 1.95,
        followUps: [{ attack: 'turningBough', if: 'behind', chance: 0.4 }],
        damage: 30, poise: 50, knock: 7, lunge: 1.0, range: 5.4, box: LASH },
      // The Charge: low, boughs forward like antlers; it runs at you on its roots, and its boughs meet you (parry them, or
      // roll aside, late).
      { id: 'rootCharge', name: 'The Charge', anim: 'thrust', pose: 'treeCharge', tracking: { rate: 2.6, commit: 0.7 }, minRange: 5, chance: 0.4, markers: glint(0),
        dash: { speed: 11, from: 0.45 }, hits: [{ startup: 1.2, active: 0.2, follow: 0.4, tell: 'boughR', impact: { ring: 2.4, crack: 0.8, dust: 18, shake: 0.12 } }], recovery: 2.1,
        damage: 40, heavy: true, poise: 70, knock: 10, lunge: 0, range: 14, box: RAM },
      // The Great Kindling: its breast opened to the sky; a ring of fire, and a wider one after it. Roll each.
      { id: 'greatKindling', name: 'The Great Kindling', anim: 'stomp', pose: 'treeGreatKindling', noParry: true, rollOnly: true, tracking: { rate: 1.4, commit: 0.4 }, chance: 0.35,
        hits: [{ startup: 1.6, active: 0.45, follow: 0.35, tell: 'crown', box: RING(0.8, 7.0, 1.6, 0.45, 1.6), impact: { ring: 4.4, crack: 2.0, dust: 20, shake: 0.16 } },
               { startup: 0.85, active: 0.55, follow: 0.4, tell: 'crown', box: RING(2.5, 11.0, 1.6, 0.55, 1.6), impact: { ring: 6.0, crack: 2.4, dust: 26, shake: 0.2 } }], recovery: 2.25,
        damage: 36, heavy: true, poise: 60, knock: 9, lunge: 0, range: 9, box: RING(0.8, 7.0, 1.6, 0.45, 1.6) },
      // Deep Roots: it goes under, comes up through the swelling, goes under again, and comes up with its boughs down on you.
      { id: 'deepRoots', name: 'Deep Roots', anim: 'chop', pose: 'treeDeepRoots', tracking: { rate: 2.0, commit: 0.3 }, minRange: 4.5, chance: 0.4, markers: glint(2),
        hits: [{ startup: 2.2, active: 0.2, follow: 0.45, tell: 'crown', noParry: true, burrow: { from: 0.2, lock: 0.68, speed: 12, turn: 2.4 }, impact: { ring: 4.2, crack: 2.6, dust: 28, shake: 0.2 } },
               { startup: 1.8, active: 0.2, follow: 0.3, tell: 'crown', noParry: true, burrow: { from: 0.25, lock: 0.62, speed: 12, turn: 2.6 }, impact: { ring: 4.2, crack: 2.6, dust: 28, shake: 0.2 } },
               RISE_FALL], recovery: 2.5,
        damage: 40, heavy: true, poise: 70, knock: 10, lunge: 0, range: 22, box: RISE },
      // The Falling Tree (pass 149, its signature ablaze): reared up tall, boughs flung wide, crown back; it throws the whole
      // of itself down full length before it, and where it fell the floor burns. Get out of its line.
      { id: 'fallingTree', name: 'The Falling Tree', anim: 'chop', pose: 'treeFallingTree', noParry: true, rollOnly: true, tracking: { rate: 2.0, commit: 0.55 }, minRange: 2.5, chance: 0.35,
        hits: [{ startup: 1.7, active: 0.2, follow: 0.7, tell: 'crown', hold: { at: 0.6, time: [0.2, 0.5], chance: 0.4 },
                 fire: { at: [[3.2, 0], [5.4, 0], [7.6, 0]], r: 1.3, time: 5, dps: 14 }, impact: { ring: 5.0, crack: 3.0, dust: 30, shake: 0.24 } }], recovery: 2.4,
        damage: 48, heavy: true, poise: 90, knock: 11, lunge: 0, range: 8.5, box: TRUNK },
    ],
  };
  ENEMY_DEFS.push(TREE); ENEMY_BY_ID[TREE.id] = TREE;
}

// The Rootbound (Level 13; STORY.md 10i): thralls grown into the wood, and gone into it gladly. They sink into the roots
// and rise where you stand, throw thorns of fire and mark the floor to burn. Rough: the Golden Zealot's moves
// (ZEALOT_MOVES, js/data/move-sources.js) on the Hollow Soldier's Blender figure, its skin and clothes gone to bark.
{
  const Z = ZEALOT_MOVES, NAMES = { gzHammer: ['rootLash', 'Lashing Branch'], gzSpear: ['rootThorn', 'Ember Thorn'],
    gzBlink: ['rootRise', 'Up from the Roots'], gzRune: ['rootMark', 'The Burning Mark'] };
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
