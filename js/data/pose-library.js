'use strict';
// The pose library (pass 111, docs/bosses/system.md "Animation"): motions captured from real people on video and fitted
// onto the game's one skeleton (every model shares it: js/bodykit.js boneSpec), kept as in-between keys any attack can
// use by name: a key pose's hit names it as one phase's `via` (`via: { windup: 'haftOverheadRaise' }`, js/attack-anim.js).
// The keys are `rel: true`: the shape of the motion (where the hips turn first, the dip before the rise, the arc of the
// arms), added onto the attack's own authored key poses, so one capture serves any boss of the same build and weapon.
//
// Made with tools/motion: clip-landmarks.py (the clip to 3D points), fit-poses.cjs (onto a model's rig, with a sheet to
// check it against the clip), via-keys.cjs (a stretch of it as keys). Each entry says where it came from; the clips
// stay in .scratch/motion, never committed (PLAN.md item 5: ideas from references, never their look).
// Entry: { from: '<the clip and the stretch>', keys: [{ t, rel: true, <channel>: [x, y, z] or number }] }.
const POSE_LIBRARY = {
  // A two-handed haft raised overhead from a low guard: the hips and chest wind back to the weapon side and the head
  // drops as the arms come up, then the body squares to the target as the haft passes over the head.
  // Halberd solo drill (YouTube Scg7txNV-jc) 4.2 to 5.0 s, mirrored onto a right-sided body; the Pillager Captain's fit.
  haftOverheadRaise: {
    from: 'halberd solo drill, Scg7txNV-jc 4.2-5.0 s, mirrored (pillagerCaptain)',
    keys: [
      { t: 0.25, rel: true, crouch: -0.01, spin: [-0.15, -0.24, -0.09], chest: [0.1, -0.28, 0.09], head: [0.22, 0.01, 0], armR: [0.68, 0.08, -0.41], elbowR: [-0.53, 0, 0] },
      { t: 0.5, rel: true, crouch: -0.01, spin: [-0.12, -0.33, -0.1], chest: [0.1, -0.39, 0.05], head: [0.03, -0.11, 0], armR: [0.41, 0.29, -1.22], elbowR: [-0.39, 0, 0] },
      { t: 0.75, rel: true, crouch: -0.02, spin: [-0.15, -0.31, -0.1], chest: [0.01, -0.19, -0.06], head: [0.15, -0.28, 0], armR: [-0.67, 0.1, -0.05], elbowR: [0.16, 0, 0] },
    ],
  },
};
