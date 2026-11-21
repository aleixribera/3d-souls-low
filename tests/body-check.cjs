'use strict';
// The body check (retro 130, tools/body-check.cjs): the body carries the blow, not only the weapon arm.
// - Aldric (pass 130) has no flagged hit: every follow-through carries him on past the strike;
// - the check still catches the stiffness it was built for: a hit whose follow-through is its strike's pose is flagged.
const assert = require('node:assert/strict');
const { check } = require('../tools/body-check.cjs');

const res = check(['varn']);
const flagged = res.varn.filter(r => r.flags.length);
assert.deepEqual(flagged.map(r => `${r.attack}#${r.hit}: ${r.flags.join(', ')}`), [], 'Aldric: no hit flagged');
assert.ok(res.varn.length >= 20, 'Aldric\'s keyed attacks are all measured');

// The Two Cuts as pass 128 left them: the follow-through held on the strike's pose.
const { check: again } = require('../tools/body-check.cjs');
const stiff = again(['varn'], G => {
  const P = G.ATTACK_POSES.aldricTwoCuts;
  G.ATTACK_POSES.aldricTwoCuts = { ...P, hits: P.hits.map(h => ({ ...h, follow: h.strike })) };
});
const cuts = stiff.varn.filter(r => r.attack === 'varnCleave');
assert.ok(cuts.length === 2 && cuts.every(r => r.flags.includes('NO OVERSHOOT')), 'a follow-through held on the strike is flagged');
console.log(`body-check: Aldric ${res.varn.length} hits clean; the held follow-through flagged`);
