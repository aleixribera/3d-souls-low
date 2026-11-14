'use strict';
// ============================================================================
// The Antlered Hunger (v7.20; its own fight since pass 77), the boss of Level 6, js/levels/the-church.js (STORY.md 10b)
// ============================================================================
// The hunger the Ember left behind, gone back over the mountains to the Seven's first church to wear a starving stag. It
// never tries the same thing twice over, because the hunger learned that from a king, and it learns still: every move of
// its own that you escape (rolled, parried, stepped out of: any that ends without landing a blow) it learns (an attack's
// `learns`, Enemy.learn), and from then on that move comes as its learned form, made to catch the way you got out: a
// third rake held back for your roll, a hook back the other way, a second fall, a charge that turns, a kick that wheels
// into a sweep, a leap that leaps again. An ember collar lights round its antlers for each one (the model's `marks`,
// js/finale.js), from the skull out to the tips, and embers stream off them through a learned move's wind-up. Break its
// guard (a posture break, or an execution) and it forgets them all: the collars go dark together, and every move is
// plain again. So the fight is a race: the longer you only dodge, the more of you it knows; press it, parry it, break it.
// At half its health it throws back its skull and roars (a ring of force through the floor, jumped or rolled), and goes
// on starving: it leaps on you from afar and tears at you four times running.
//
// Every wind-up is its own, and glows on what strikes (a claw, the antlers or a hind foot: the model's `tells`). Rearing
// back with the right claw high beside its skull, its body turned right (the rake; the left mirrors it); its skull
// dipped low and turned to its left, the antlers raking the floor (the hook); up on its hind legs, both claws high, the
// skull looking down at you (the hammerfall); its head down and its right fist pawing back along the floor (the charge);
// its weight thrown on its fists and its hind legs drawn up under it, the skull low looking back between its forelegs
// (the kick, only at someone behind it). Starving: its skull thrown back and its arms flung wide (the roar); both fists
// flung up over its skull as it springs (the leap); and a run of rakes, right, left, right, then its right claw straight up over its
// skull, chopped down one-handed (the frenzy). A learned form's added blow has its own wind-up too: both claws drawn back low and wide at its
// sides (the held third rake, scissored shut at waist height), the skull dipped to its right (the hook back), the rear
// again (the second fall), a quick crouch round on its haunches (the turn), the right claw thrown out wide (the wheel),
// the pounce again (the second leap). Every roll-only blow strikes in its own shape: fists driven into the floor with its
// rump thrown up (the leap), a straight-down pound, squatting upright with its skull and antlers held high (the hammerfall), head down with the antlers levelled and its arms swept back (the charge),
// both hind legs straight out behind (the kick).

// ---- its figure: built in Blender (tools/blender/antlered_beast.py), one piece per bone ---------------------------------
{
  const hide = { tex: 'beastHide', tint: 0xffffff, decay: 0.6, size: 512 };
  const mark = { glow: 0xff7a28 };   // pass 77: the ember collars round its antlers, one lit for each move it has learned
  const bonesOf = {
    spin: ['hide'], chest: ['hide', 'quill'], neck: ['hide', 'quill'], head: ['bone', 'quill', 'bone.2', 'mark1', 'mark2', 'mark3', 'mark4', 'mark5', 'mark6'],
    armL: ['hide', 'quill'], elbowL: ['hide', 'bone'], legL: ['hide'], kneeL: ['hide', 'bone'],
    armR: ['hide', 'quill'], elbowR: ['hide', 'bone'], legR: ['hide'], kneeR: ['hide', 'bone'],
  };
  MODEL_DEFS.antleredHunger = {
    faction: 'hunger', budget: 'boss', fit: 1, limbSides: 8, rim: 0.4,
    proportions: { shoulderX: 0.4, torsoW: 0.3, torsoD: 0.22, armR: 0.07, legR: 0.09, headR: 0.13, handR: 0.08, footLen: 0.4 },
    limbs: { armL: { len: 1.35 }, armR: { len: 1.35 } },
    posture: { chest: [0.72, 0, 0], neck: [0.1, 0, 0], head: [-0.62, 0, 0], armL: [-0.55, 0, -0.14], armR: [-0.55, 0, 0.14], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0] },
    materials: { hide, quill: { tex: 'beastQuill', tint: 0xffffff, decay: 0.5, rim: 0.15 }, bone: { tex: 'bone', tint: 0xd8cdb4, decay: 0.55, rim: 0.5 }, eye: { glow: 0xff5a20 },
      mark1: mark, mark2: mark, mark3: mark, mark4: mark, mark5: mark, mark6: mark },
    marks: ['mark1', 'mark2', 'mark3', 'mark4', 'mark5', 'mark6'],
    body: { torso: null, pelvis: null, arms: null, legs: null, head: null, neck: 'hide', hands: null, feet: null },
    bones: {},
    parts: Object.entries(bonesOf).flatMap(([bone, list]) => list.map(s => ({ use: 'baked', mesh: `${bone}__${s}`, bone, slot: s.split('.')[0] }))),
    // Where a blow that is not the right fist's shows its wind-up glow (a hit's `tell`): each claw, the antlers, a hind foot.
    tells: { clawR: { bone: 'elbowR', at: [0, -0.72, 0.14], size: 0.5 }, clawL: { bone: 'elbowL', at: [0, -0.72, 0.14], size: 0.5 },
      antlers: { bone: 'head', at: [0, 0.5, -0.02], size: 0.45 }, hind: { bone: 'kneeR', at: [0, -0.42, 0.22], size: 0.5 } },
    eyes: { color: 0xff5a20, size: 0.022, spread: 0.1, at: [0, 0.1, 0.28] },
    anim: { idle: { breathRate: 1.1, breath: 0.03, headDrift: 0.08, sway: 0.03, twitch: 0.02 }, walk: { twist: 0.2, roll: 0.08, headNod: 0.07, elbow: 0.3, drag: 0.1 },
            flinch: { head: 0.35, chest: 0.35, arms: 0.35 }, death: { buckle: 1.2, slump: 1 } },
  };
}

// ---- key poses (js/data/attack-poses.js format; added to its hunch: chest .72 forward, arms hanging before it) ----------
{
  // The same key pose for the other side: left and right swapped, every turn and roll the other way.
  const SWAP = { armL: 'armR', armR: 'armL', elbowL: 'elbowR', elbowR: 'elbowL', legL: 'legR', legR: 'legL', kneeL: 'kneeR', kneeR: 'kneeL' };
  const mirror = P => Object.fromEntries(Object.entries(P).map(([k, v]) => [SWAP[k] || k, Array.isArray(v) ? [v[0], -v[1], -v[2]] : v]));
  const claw = { windup: 'inOutCubic', active: 'outCubic', follow: 'outQuad', recovery: 'inOutCubic' };   // a swipe: drawn, then torn through
  const heavy = { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' };   // a weight that gathers, then falls

  // Claw Rake: rearing back with the right claw raised high beside its skull, its body turned right, the left fist planted;
  // torn down and across before it to its left. Then the left, the same the other way.
  const rakeRUp = { crouch: 0.12, lean: -0.05, legL: [-0.3, 0, 0], legR: [0.3, 0, 0], spin: [0, -0.55, 0], chest: [-0.35, -0.25, 0], neck: [0, 0.35, 0], head: [0.1, 0.35, 0],
    armR: [-2.0, 0, -0.9], elbowR: [-1.3, 0, 0], armL: [0.15, 0, 0.2], elbowL: [0.2, 0, 0] };
  const rakeRDown = { crouch: 0.22, lean: 0.2, legL: [-0.5, 0, 0], legR: [0.35, 0, 0], spin: [0, 0.5, 0], chest: [0.15, 0.3, 0], neck: [0, -0.3, 0], head: [0, -0.3, 0],
    armR: [0.0, 0, 0.9], elbowR: [0.1, 0, 0], armL: [0.2, 0, 0.3], elbowL: [0.1, 0, 0] };
  const rakeRFollow = { ...rakeRDown, crouch: 0.25, spin: [0, 0.65, 0], armR: [0.25, 0, 1.0] };
  const rakeLUp = mirror(rakeRUp), rakeLDown = mirror(rakeRDown), rakeLFollow = mirror(rakeRFollow);
  const RAKE_R = { windup: rakeRUp, strike: rakeRDown, follow: rakeRFollow }, RAKE_L = { windup: rakeLUp, strike: rakeLDown, follow: rakeLFollow };
  ATTACK_POSES.hungerRake = { ease: claw, lag: { elbowR: 0.06, elbowL: 0.06 }, hits: [RAKE_R, RAKE_L] };
  // Learned: a third, held back for your roll. Both claws drawn back low and wide at its sides, its chest thrown open;
  // held; scissored shut across before it at waist height.
  const scissorUp = { crouch: 0.3, lean: -0.1, legL: [-0.45, 0, 0], kneeL: [0.3, 0, 0], legR: [0.4, 0, 0], kneeR: [0.3, 0, 0], chest: [-0.35, 0, 0], neck: [0.1, 0, 0], head: [0.2, 0, 0],
    armR: [0.45, 0, -1.35], elbowR: [-0.5, 0, 0], armL: [0.45, 0, 1.35], elbowL: [-0.5, 0, 0] };
  const scissorDown = { crouch: 0.3, lean: 0.3, legL: [-0.6, 0, 0], legR: [0.4, 0, 0], chest: [0.25, 0, 0], neck: [0, 0, 0], head: [-0.05, 0, 0],
    armR: [-1.35, 0, 0.75], elbowR: [-0.1, 0, 0], armL: [-1.35, 0, -0.75], elbowL: [-0.1, 0, 0] };
  const SCISSOR = { windup: scissorUp, strike: scissorDown, follow: { ...scissorDown, crouch: 0.34 } };
  ATTACK_POSES.hungerRakeLearned = { ease: claw, lag: { elbowR: 0.06, elbowL: 0.06 }, hits: [RAKE_R, RAKE_L, SCISSOR] };

  // Antler Hook: its skull dipped low and turned to its left, the antler tines raking the floor, its weight back on its
  // haunches; heaved up and across to its right, the antlers sweeping up through you.
  const hookLow = { crouch: 0.35, lean: 0.1, legL: [-0.4, 0, 0], kneeL: [0.3, 0, 0], legR: [0.4, 0, 0], kneeR: [0.3, 0, 0], spin: [0, 0.45, 0], chest: [0.2, 0.25, 0.15],
    neck: [0.45, 0.35, 0.25], head: [0.4, 0.25, 0.55], armL: [0.1, 0, 0.45], elbowL: [0.1, 0, 0], armR: [0.0, 0, -0.2], elbowR: [-0.2, 0, 0] };
  const hookUp = { crouch: 0.15, lean: 0.05, legL: [-0.45, 0, 0], legR: [0.3, 0, 0], spin: [0, -0.55, 0], chest: [-0.45, -0.3, -0.1], neck: [-0.35, -0.45, -0.2],
    head: [-0.45, -0.4, -0.55], armL: [-0.7, 0, 0.5], elbowL: [-0.4, 0, 0], armR: [-0.4, 0, -0.6], elbowR: [-0.4, 0, 0] };
  const HOOK = { windup: hookLow, strike: hookUp, follow: { ...hookUp, spin: [0, -0.7, 0], chest: [-0.55, -0.35, -0.1] } };
  ATTACK_POSES.hungerHook = { ease: { ...heavy, active: 'outCubic' }, lag: { head: 0.05, neck: 0.03 }, hits: [HOOK] };
  // Learned: the skull dipped to its right at once, and hooked back up across to its left.
  const hookBackUp = mirror(hookUp);
  ATTACK_POSES.hungerHookLearned = { ease: { ...heavy, active: 'outCubic' }, lag: { head: 0.05, neck: 0.03 },
    hits: [HOOK, { windup: mirror(hookLow), strike: hookBackUp, follow: { ...hookBackUp, spin: [0, 0.7, 0] } }] };

  // Hammerfall: up on its hind legs, both claws high over it, the skull bowed to look down at you; pounded straight down
  // before it, squatting upright, its skull and antlers held high over its fists (the Fall sprawls; this does not).
  const rear = { crouch: 0.0, lean: -0.4, legL: [-0.25, 0, 0], legR: [0.2, 0, 0], chest: [-1.05, 0, 0], neck: [-0.15, 0, 0], head: [0.75, 0, 0],
    armL: [-2.4, 0, 0.45], elbowL: [-0.8, 0, 0], armR: [-2.4, 0, -0.45], elbowR: [-0.8, 0, 0] };
  const crash = { crouch: 0.3, lean: 0.75, legL: [0.15, 0, 0.05], kneeL: [0.2, 0, 0], legR: [0.35, 0, -0.05], kneeR: [0.2, 0, 0], chest: [0.35, 0, 0], neck: [-0.35, 0, 0], head: [-0.25, 0, 0],
    armL: [-1.45, 0, 0.12], elbowL: [0.05, 0, 0], armR: [-1.45, 0, -0.12], elbowR: [0.05, 0, 0] };
  const pound = { crouch: 0.5, lean: 0.12, legL: [-0.7, 0, 0.2], kneeL: [0.9, 0, 0], legR: [-0.7, 0, -0.2], kneeR: [0.9, 0, 0], chest: [0.15, 0, 0], neck: [0.05, 0, 0], head: [-0.25, 0, 0],
    armL: [-0.55, 0, 0.08], elbowL: [0.1, 0, 0], armR: [-0.55, 0, -0.08], elbowR: [0.1, 0, 0] };
  const POUND = { windup: rear, strike: pound, follow: { ...pound, crouch: 0.56, head: [-0.15, 0, 0] } };
  ATTACK_POSES.hungerHammer = { ease: heavy, hits: [POUND] };
  // Learned: up again at once, a stride on, and down again with the floor jumping round it.
  ATTACK_POSES.hungerHammerLearned = { ease: heavy, hits: [POUND, { windup: { ...rear, lean: -0.3, chest: [-0.9, 0, 0] }, strike: { ...pound, crouch: 0.56 }, follow: { ...pound, crouch: 0.6 } }] };

  // Antler Charge: its head down, the antlers levelled at you, its hind legs bunched and its right fist pawing back along
  // the floor; it runs you down.
  const paw = { crouch: 0.4, lean: 0.25, legL: [-0.6, 0, 0], kneeL: [0.6, 0, 0], legR: [0.5, 0, 0], kneeR: [0.5, 0, 0], chest: [0.25, 0, 0], neck: [0.55, 0, 0], head: [0.45, 0, 0],
    armL: [-0.2, 0, 0.2], elbowL: [0.2, 0, 0], armR: [0.7, 0, -0.15], elbowR: [-0.2, 0, 0] };
  const ram = { crouch: 0.25, lean: 0.4, legL: [-0.95, 0, 0], kneeL: [0.35, 0, 0], legR: [0.95, 0, 0], kneeR: [0.5, 0, 0], chest: [0.2, 0, 0], neck: [0.45, 0, 0], head: [0.3, 0, 0],
    armL: [0.75, 0, 0.3], elbowL: [-0.7, 0, 0], armR: [0.75, 0, -0.3], elbowR: [-0.7, 0, 0] };
  const RAM = { windup: paw, strike: ram, follow: { ...ram, lean: 0.35 } };
  ATTACK_POSES.hungerCharge = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [RAM] };
  // Learned: past you it drops low on its haunches, swings round and comes again.
  const turned = { ...paw, crouch: 0.5, armR: [-0.2, 0, -0.2], armL: [0.6, 0, 0.15], spin: [0, 0.3, 0] };
  ATTACK_POSES.hungerChargeLearned = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [RAM, { windup: turned, strike: ram, follow: { ...ram, lean: 0.35 } }] };

  // Hind Kick: its weight thrown onto its fists, its hind legs drawn up under it, the skull low looking back between its
  // forelegs; both hind legs kicked out behind it.
  const tucked = { crouch: 0.3, lean: 0.3, legL: [-0.9, 0, 0.1], kneeL: [1.2, 0, 0], legR: [-0.9, 0, -0.1], kneeR: [1.2, 0, 0], chest: [0.35, 0, 0], neck: [0.5, 0, 0], head: [0.9, 0, 0],
    armL: [-0.6, 0, 0.25], elbowL: [0.2, 0, 0], armR: [-0.6, 0, -0.25], elbowR: [0.2, 0, 0] };
  const kicked = { crouch: 0.4, lean: 0.7, legL: [2.6, 0, 0.12], kneeL: [-0.15, 0, 0], legR: [2.6, 0, -0.12], kneeR: [-0.15, 0, 0], chest: [0.45, 0, 0], neck: [-0.1, 0, 0], head: [-0.2, 0, 0],
    armL: [-1.25, 0, 0.3], elbowL: [0.05, 0, 0], armR: [-1.25, 0, -0.3], elbowR: [0.05, 0, 0] };
  const KICK = { windup: tucked, strike: kicked, follow: { ...kicked, lean: 0.5 } };
  ATTACK_POSES.hungerKick = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { kneeL: 0.05, kneeR: 0.05 }, hits: [KICK] };
  // Learned: down off the kick it throws its right claw out wide and wheels a whole turn round.
  const wheelOut = { crouch: 0.25, lean: 0.1, spin: [0, -1.1, 0], chest: [0, -0.3, 0], neck: [0, 0.5, 0], head: [0, 0.5, 0], armR: [-1.2, 0, -1.2], elbowR: [0, 0, 0],
    armL: [-0.5, 0, 0.8], elbowL: [-0.3, 0, 0] };
  const wheeled = { ...wheelOut, crouch: 0.3, spin: [0, 5.2, 0], chest: [0, 0.3, 0], neck: [0, -0.2, 0], head: [0, -0.2, 0] };
  ATTACK_POSES.hungerKickLearned = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, lag: { kneeL: 0.05, kneeR: 0.05 },
    hits: [KICK, { windup: wheelOut, strike: wheeled, follow: { ...wheeled, spin: [0, 5.7, 0] } }] };

  // ---- starving (second phase) ----
  // The Roar: its skull thrown back and its arms flung wide; the scream, crouched, the skull thrust at you.
  const throwBack = { crouch: 0.15, lean: -0.2, legL: [-0.3, 0, 0], legR: [0.25, 0, 0], chest: [-0.75, 0, 0], neck: [-0.6, 0, 0], head: [-0.5, 0, 0],
    armL: [-0.7, 0, 1.1], elbowL: [-0.4, 0, 0], armR: [-0.7, 0, -1.1], elbowR: [-0.4, 0, 0] };
  const screamed = { crouch: 0.35, lean: 0.1, legL: [-0.55, 0, -0.15], legR: [0.45, 0, 0.15], chest: [0.15, 0, 0], neck: [0.5, 0, 0], head: [0.35, 0, 0],
    armL: [-0.2, 0, 1.3], elbowL: [0, 0, 0], armR: [-0.2, 0, -1.3], elbowR: [0, 0, 0] };
  ATTACK_POSES.hungerRoar = { ease: { windup: 'inOutSine', active: 'outExpo', follow: 'outQuad', recovery: 'inOutCubic' }, hits: [{ windup: throwBack, strike: screamed, follow: screamed }] };

  // The Fall: it springs (`leap`) with both fists flung up over its skull and its hind legs tucked under it, a pounce through
  // the air; down on you fists first, and the floor jumps round it.
  const pounce = { crouch: 0.1, lean: -0.15, legL: [-1.2, 0, 0.1], kneeL: [1.5, 0, 0], legR: [-1.1, 0, -0.1], kneeR: [1.5, 0, 0], chest: [-0.5, 0, 0], neck: [0.1, 0, 0], head: [0.5, 0, 0],
    armL: [-2.6, 0, 0.35], elbowL: [-0.5, 0, 0], armR: [-2.6, 0, -0.35], elbowR: [-0.5, 0, 0] };
  const landed = { crouch: 0.48, lean: 0.45, legL: [-0.8, 0, 0], kneeL: [0.6, 0, 0], legR: [0.4, 0, 0], kneeR: [0.3, 0, 0], chest: [0.35, 0, 0], neck: [-0.1, 0, 0], head: [0, 0, 0],
    armL: [-0.95, 0, 0.35], elbowL: [0.2, 0, 0], armR: [-0.95, 0, -0.35], elbowR: [0.2, 0, 0] };
  const pressed = { ...landed, crouch: 0.55, chest: [0.45, 0, 0] };
  const LAND = { windup: pounce, strike: crash, follow: { ...crash, crouch: 0.36 } }, SHOCK = { windup: { ...crash, crouch: 0.36 }, strike: pressed, follow: pressed };
  ATTACK_POSES.hungerLeap = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [LAND, SHOCK] };
  // Learned: landed, it springs again at once and pounces on after you.
  ATTACK_POSES.hungerLeapLearned = { ease: { windup: 'inOutSine', active: 'inQuad', follow: 'outCubic', recovery: 'inOutCubic' }, hits: [LAND, LAND, SHOCK] };

  // Starving Frenzy: right, left, right, each a stride on, and then its own finisher: the right claw straight up over its
  // skull, its body wound back to the right and the left fist planted; chopped down before it one-handed.
  const chopUp = { crouch: 0.1, lean: -0.25, legL: [-0.35, 0, 0], legR: [0.3, 0, 0], spin: [0, -0.4, 0], chest: [-0.7, -0.2, 0], neck: [-0.1, 0.2, 0], head: [0.4, 0.2, 0],
    armR: [-2.9, 0, -0.15], elbowR: [-0.25, 0, 0], armL: [-0.35, 0, 0.35], elbowL: [0.2, 0, 0] };
  const chopDown = { crouch: 0.38, lean: 0.45, legL: [-0.7, 0, 0], kneeL: [0.4, 0, 0], legR: [0.45, 0, 0], kneeR: [0.3, 0, 0], spin: [0, 0.25, 0], chest: [0.45, 0.15, 0], neck: [0.1, -0.1, 0], head: [0.1, -0.1, 0],
    armR: [-0.85, 0, 0.1], elbowR: [0.05, 0, 0], armL: [-0.35, 0, 0.45], elbowL: [0.2, 0, 0] };
  const CHOP = { windup: chopUp, strike: chopDown, follow: { ...chopDown, crouch: 0.44, armR: [-0.6, 0, 0.15] } };
  ATTACK_POSES.hungerFrenzy = { ease: claw, lag: { elbowR: 0.06, elbowL: 0.06 }, hits: [RAKE_R, RAKE_L, RAKE_R, CHOP] };
}

// ---- the boss -----------------------------------------------------------------------------------------------------------
{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const RAKE = { w: 4.6, h: 2.6, d: 3.6, fwd: 2.0, y: 1.4 };
  const SCISSOR = { w: 5.2, h: 2.6, d: 3.8, fwd: 2.2, y: 1.3 };
  const HOOK = { w: 5.4, h: 3.0, d: 3.4, fwd: 1.8, y: 1.6 };
  const HAMMER = { w: 3.0, h: 3.2, d: 4.2, fwd: 2.4, y: 1.2 };
  const RAM = { w: 3.2, h: 2.6, d: 4.0, fwd: 2.2, y: 1.4 };
  const KICK = { w: 3.6, h: 1.8, d: 3.4, fwd: -2.3, y: 0.9 };   // behind it
  const WHEEL = { w: 7.0, h: 2.0, d: 7.0, fwd: 0, y: 1.0 };
  const LANDING = { w: 5.0, h: 2.6, d: 5.0, fwd: 0.8, y: 1.0 };
  const RING = (to, time = 0.18) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from: 1, to, width: 1.6, time } });   // along the floor: jump it or roll it
  const SHATTER = { ring: 3.4, crack: 1.8, dust: 16, shake: 0.14 };

  // ---- what it knows from the start ----
  // Claw Rake: right, then left. Parry both. Learned: a third with both claws, held back for your roll (parry it).
  const rake = { id: 'rake', name: 'Claw Rake', anim: 'sweep', pose: 'hungerRake', tracking: { rate: 3.0, commit: 0.65 }, markers: glint(0, 1), learns: 'rakeLearned',
    hits: [{ startup: 0.75, active: 0.14, follow: 0.4, tell: 'clawR' }, { startup: 0.5, active: 0.14, follow: 0.35, tell: 'clawL' }], recovery: 1.3,
    followUps: [{ attack: 'slam', if: 'far', chance: 0.19 }],
    damage: 26, poise: 45, knock: 6, lunge: 2.2, range: 4.2, box: RAKE };
  const rakeLearned = { ...JSON.parse(JSON.stringify(rake)), id: 'rakeLearned', name: 'Claw Rake, Learned', pose: 'hungerRakeLearned', learned: true, learns: undefined, markers: glint(0, 1, 2),
    hits: [...rake.hits.map(h => ({ ...h })), { startup: 0.95, active: 0.15, follow: 0.45, tell: 'clawR', damage: 34, box: SCISSOR, hold: { at: 0.55, time: [0.25, 0.55], chance: 1 } }],
    recovery: 1.5 };
  delete rakeLearned.learns;
  // Antler Hook: the skull dipped low to its left; heaved up and across. Roll it. Learned: hooked straight back the other way.
  const hook = { id: 'hook', name: 'Antler Hook', anim: 'sweep', pose: 'hungerHook', tracking: { rate: 2.4, commit: 0.6 }, noParry: true, rollOnly: true, learns: 'hookLearned', chance: 0.7,
    hits: [{ startup: 1.0, active: 0.16, follow: 0.45, tell: 'antlers' }], recovery: 1.4,
    damage: 32, poise: 60, knock: 9, lunge: 1.4, range: 3.8, box: HOOK };
  const hookLearned = { ...hook, id: 'hookLearned', name: 'Antler Hook, Learned', pose: 'hungerHookLearned', learned: true, learns: undefined,
    hits: [{ ...hook.hits[0], follow: 0.2 }, { startup: 0.6, active: 0.16, follow: 0.5, tell: 'antlers', damage: 30 }], recovery: 1.5 };
  delete hookLearned.learns;
  // Hammerfall: up on its hind legs, both claws high; held; down onto its fists. Roll it. Learned: up again and down again
  // a stride on, the floor jumping round it (jump that, or roll it).
  const slam = { id: 'slam', name: 'Hammerfall', anim: 'chop', pose: 'hungerHammer', tracking: { rate: 2.2, commit: 0.55 }, noParry: true, rollOnly: true, learns: 'slamLearned', chance: 0.6,
    hits: [{ startup: 1.25, active: 0.14, follow: 0.5, tell: 'clawR', hold: { at: 0.6, time: [0.2, 0.6], chance: 0.5 }, impact: SHATTER }], recovery: 2.0,
    damage: 44, poise: 80, knock: 9, lunge: 1.4, range: 3.8, box: HAMMER };
  const slamLearned = { ...slam, id: 'slamLearned', name: 'Hammerfall, Learned', pose: 'hungerHammerLearned', learned: true, learns: undefined,
    hits: [{ ...slam.hits[0], follow: 0.2 }, { startup: 0.85, active: 0.18, follow: 0.6, tell: 'clawR', step: { from: 0.2, speed: 4, side: 0 }, damage: 30, box: RING(6.5, 0.2), impact: { ring: 4.2, crack: 1.4, dust: 18, shake: 0.16 } }],
    recovery: 2.0 };
  delete slamLearned.learns;
  // Antler Charge: its head down, a fist pawing back; it runs you down. Step aside or roll. Learned: past you it turns on
  // its haunches and comes again.
  const charge = { id: 'charge', name: 'Antler Charge', anim: 'thrust', pose: 'hungerCharge', tracking: { rate: 2.4, commit: 0.6 }, noParry: true, rollOnly: true, learns: 'chargeLearned', minRange: 5, chance: 0.45,
    dash: { speed: 13, from: 0.5 }, hits: [{ startup: 1.05, active: 0.16, follow: 0.45, tell: 'antlers' }], recovery: 1.7,
    damage: 40, poise: 70, knock: 10, lunge: 2.6, range: 15, box: RAM };
  const chargeLearned = { ...charge, id: 'chargeLearned', name: 'Antler Charge, Learned', pose: 'hungerChargeLearned', learned: true, learns: undefined,
    hits: [{ ...charge.hits[0], follow: 0.25 }, { startup: 0.85, active: 0.16, follow: 0.5, tell: 'antlers', damage: 36, step: { from: 0.4, speed: 12, side: 0 } }], recovery: 1.8 };
  delete chargeLearned.learns;
  // Hind Kick: only at someone behind it. Its weight on its fists, its hind legs drawn up; both kicked out behind. Roll it.
  // Learned: off the kick it wheels a whole turn round with its right claw out (roll that too, or be out of reach).
  const hindKick = { id: 'hindKick', name: 'Hind Kick', anim: 'stomp', pose: 'hungerKick', noParry: true, rollOnly: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, learns: 'hindKickLearned', chance: 1.6,
    hits: [{ startup: 0.75, active: 0.14, follow: 0.35, tell: 'hind' }], recovery: 1.3,
    damage: 30, poise: 50, knock: 10, lunge: 0, range: 4.2, box: KICK };
  const hindKickLearned = { ...hindKick, id: 'hindKickLearned', name: 'Hind Kick, Learned', pose: 'hungerKickLearned', learned: true, learns: undefined, when: undefined,
    hits: [{ ...hindKick.hits[0], follow: 0.15 }, { startup: 0.5, active: 0.16, follow: 0.4, tell: 'clawR', damage: 26, box: WHEEL }], recovery: 1.5 };
  delete hindKickLearned.learns; delete hindKickLearned.when;

  // ---- starving: the second half of its health ----
  // The Roar (the phase opener): its skull thrown back, its arms flung wide; a ring of force through the floor. Jump it or
  // roll it. The change itself hurts nobody.
  const roar = { id: 'roar', name: 'The Roar', anim: 'overhead', pose: 'hungerRoar', noParry: true, rollOnly: true, tracking: { rate: 1.6, commit: 0.4 }, minRange: 0.1, chance: 0.2,
    hits: [{ startup: 1.3, active: 0.18, follow: 0.5, tell: 'antlers', box: RING(10), impact: { ring: 4.0, crack: 0, dust: 14, shake: 0.22 } }], recovery: 1.62,
    damage: 24, poise: 60, knock: 8, lunge: 0, range: 8, box: RING(10) };
  // The Fall: crouched on its haunches; over the pillars and down on you, the floor jumping round it. Roll it. Learned: it
  // leaps on after you once more before the floor jumps.
  const LAND_HIT = { startup: 1.4, active: 0.16, follow: 0.7, tell: 'clawR', leap: { from: 0.4, max: 15, short: 1.4 }, impact: { ring: 6.0, crack: 2.8, dust: 26, shake: 0.2 } };
  const SHOCK_HIT = { startup: 0.3, active: 0.18, follow: 0.5, tell: 'clawR', box: { ...RING(8), ring: { from: 1.5, to: 8, width: 1.6, time: 0.18 } }, impact: { ring: 4.5, crack: 0, dust: 14, shake: 0.12 } };
  const leap = { id: 'leap', name: 'The Fall', anim: 'chop', pose: 'hungerLeap', noParry: true, rollOnly: true, tracking: { rate: 2.4, commit: 0.5 }, minRange: 5, chance: 0.5, learns: 'leapLearned',
    hits: [LAND_HIT, SHOCK_HIT], recovery: 2.7, damage: 50, poise: 90, knock: 10, lunge: 0, range: 16, box: LANDING };
  const leapLearned = { ...leap, id: 'leapLearned', name: 'The Fall, Learned', pose: 'hungerLeapLearned', learned: true, learns: undefined,
    hits: [{ ...LAND_HIT, follow: 0.3 }, { startup: 0.8, active: 0.16, follow: 0.6, tell: 'clawR', leap: { from: 0.3, max: 10, short: 1.2 }, damage: 40, impact: { ring: 5.0, crack: 2.2, dust: 22, shake: 0.18 } }, SHOCK_HIT],
    recovery: 2.7 };
  delete leapLearned.learns;
  // Starving Frenzy: right, left, right, a stride into each (parry them), then both fists down (roll that).
  const frenzy = { id: 'frenzy', name: 'Starving Frenzy', anim: 'sweep', pose: 'hungerFrenzy', tracking: { rate: 3.0, commit: 0.7 }, markers: glint(0, 1, 2), chance: 0.5,
    hits: [{ startup: 0.65, active: 0.13, follow: 0.3, tell: 'clawR', step: { from: 0.3, speed: 3, side: 0 } }, { startup: 0.42, active: 0.13, follow: 0.3, tell: 'clawL', step: { from: 0.2, speed: 3, side: 0 } },
           { startup: 0.45, active: 0.13, follow: 0.35, tell: 'clawR', step: { from: 0.2, speed: 3, side: 0 } },
           { startup: 0.9, active: 0.15, follow: 0.5, tell: 'clawR', noParry: true, damage: 40, box: HAMMER, hold: { at: 0.5, time: [0.15, 0.45], chance: 0.4 }, impact: SHATTER }],
    recovery: 1.9, damage: 22, poise: 35, knock: 4, lunge: 2.4, range: 4.0, box: RAKE };

  const ANTLERED_HUNGER = {
    id: 'antlered', model: 'antleredHunger', name: 'The Antlered Hunger',
    description: 'The hunger the Ember left behind, wearing a starving stag. Every move of its own you escape, it learns, and comes again changed: its antlers light for each one. Break its guard and it forgets them all. It strikes what stands before it; behind it, mind its kick.',
    scale: 2.3, bulk: 1.2, radius: 0.95, color: 0x4a3626, weapon: 'none', idle: 'sway', noRepeat: 2,
    visual: { skin: 0x5a4632, roughness: 0.85, rim: 0.5 },
    hp: 2600, poise: 240, speed: 3.1, turnRate: 3.4, trackRate: 1.9, approach: 0.8, kite: 0.02,
    cooldown: [0.9, 1.98], flinchTime: 0, staggerTime: 1.4, parriedTime: 1.8, deathFade: 7,
    posture: { max: 98, parry: 45, chainGap: 1.8, chainMul: 1.35, decay: 4.5, breakTime: 3.2, hitstop: 0.22 },
    defaultPhases: ['stalk', 'gorge'],
    phases: {
      stalk: { hp: 2600, attacks: ['rake', 'hook', 'slam', 'charge', 'hindKick'] },
      gorge: { at: 0.5, opener: 'roar', cooldown: [0.54, 1.44], approach: 1.1, speed: 3.5, trackRate: 2.3, attacks: ['rake', 'hook', 'slam', 'charge', 'leap', 'roar', 'frenzy', 'hindKick'] },
    },
    attacks: [rake, rakeLearned, hook, hookLearned, slam, slamLearned, charge, chargeLearned, hindKick, hindKickLearned, roar, leap, leapLearned, frenzy],
  };
  ENEMY_DEFS.push(ANTLERED_HUNGER); ENEMY_BY_ID[ANTLERED_HUNGER.id] = ANTLERED_HUNGER;
}
