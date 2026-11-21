'use strict';
// The body check (retro 130, tools/body-check.cjs): the body carries the blow, not only the weapon arm.
// - every boss through the system has no flagged hit: every follow-through carries the body on past the strike (Aldric
//   pass 130; the Captain, the Bell Warden, the Giant and the Antlered Hunger pass 132);
// - the check still catches the stiffness it was built for: a hit whose follow-through is its strike's pose is flagged.
const assert = require('node:assert/strict');
const { check } = require('../tools/body-check.cjs');

const res = check();
for (const id of ['varn', 'pillagerCaptain', 'bellWarden', 'giant', 'antlered', 'ringer', 'hollis', 'oswin', 'agathe', 'kindlingTree', 'kingsBlade', 'vesper']) assert.ok(res[id] && res[id].length >= 15, `${id}: its keyed attacks are all measured`);
for (const [id, rows] of Object.entries(res))
  assert.deepEqual(rows.filter(r => r.flags.length).map(r => `${r.attack}#${r.hit}: ${r.flags.join(', ')}`), [], `${id}: no hit flagged`);

// The Two Cuts as pass 128 left them: the follow-through held on the strike's pose.
const { check: again } = require('../tools/body-check.cjs');
const stiff = again(['varn'], G => {
  const P = G.ATTACK_POSES.aldricTwoCuts;
  G.ATTACK_POSES.aldricTwoCuts = { ...P, hits: P.hits.map(h => ({ ...h, follow: h.strike })) };
});
const cuts = stiff.varn.filter(r => r.attack === 'varnCleave');
assert.ok(cuts.length === 2 && cuts.every(r => r.flags.includes('NO OVERSHOOT')), 'a follow-through held on the strike is flagged');
console.log(`body-check: ${Object.entries(res).map(([id, r]) => `${id} ${r.length}`).join(', ')} hits clean; the held follow-through flagged`);
