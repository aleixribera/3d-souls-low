// ============================================================================
// Endless Boss Rush (pass 65, PLAN.md track B item 5): which bosses open a run, and the modifiers later fights carry.
// The draw and its rules (how many opening fights, Crowned every few, two at once, how many modifiers) are
// CONFIG.endless; the server draws each fight (server/simulation.js `calling`).
// ============================================================================
// `opening`: the bosses the first fights (CONFIG.endless.opening) draw from, the warm-up's: the easiest to learn on, by
// the skilled test bot alone (tools/rush-curve.cjs bosses, pass 73: the fewest falls and the least health taken).
// After those fights every boss can come.
// `warmHealth`: a warm-up boss's share of its own health in the warm-up (CONFIG.pace.warm), so a skilled player with no
// abilities beats each in about a minute (PLAN.md item 11).
// `health`: a boss's share of its own health in every Boss Rush fight, for the few the skilled test bot alone falls to
// far more than the rest at the same pace (tools/rush-curve.cjs bosses and runs, pass 73). Story and Practice keep it whole.
// `modifiers`: each has an `id`, the `name` shown under the boss's bar, the fight `from` which it may be
// drawn, and what it changes on the fight's bosses. None adds damage or health: only their speed.
//   pace:  their whole pace (CONFIG.pace): recoveries, rests, follow-ups, wind-ups past the base, times this.
//   rest:  the rests between their attacks run this many times faster.
//   chain: their follow-ups come as if their pace were this many times higher (longer strings).
const RUSH = {
  opening: ['giant', 'pillagerCaptain', 'antlered', 'hollis', 'hale'],
  warmHealth: { giant: 0.85, pillagerCaptain: 0.85, antlered: 0.55, hollis: 0.55, hale: 0.85 },
  health: { bellWarden: 0.75, oswin: 0.85, ostrey: 0.85, varn: 0.9 },
  modifiers: [
    { id: 'quickened', name: 'Quickened', from: 4, pace: 1.12 },
    { id: 'restless', name: 'Restless', from: 4, rest: 1.5 },
    { id: 'unbroken', name: 'Unbroken', from: 6, chain: 1.8 },
  ],
};
const RUSH_MODIFIER_BY_ID = Object.fromEntries(RUSH.modifiers.map(m => [m.id, m]));
