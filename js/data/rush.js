// ============================================================================
// Endless Boss Rush (pass 65, PLAN.md track B item 5): which bosses open a run, and the modifiers later fights carry.
// The draw and its rules (how many opening fights, Crowned every few, two at once, how many modifiers) are
// CONFIG.endless; the server draws each fight (server/simulation.js `calling`).
// ============================================================================
// `opening`: the bosses the first fights draw from, a newcomer's first bosses (Ashmere's, the story's first road).
// After those fights every boss can come.
// `modifiers`: each has an `id`, the `name` shown under the boss's bar, the fight `from` which it may be
// drawn, and what it changes on the fight's bosses. None adds damage or health: only their speed.
//   pace:  their whole pace (CONFIG.pace): recoveries, rests, follow-ups, wind-ups past the base, times this.
//   rest:  the rests between their attacks run this many times faster.
//   chain: their follow-ups come as if their pace were this many times higher (longer strings).
const RUSH = {
  opening: ['giant', 'pillagerCaptain', 'bellWarden', 'antlered'],
  modifiers: [
    { id: 'quickened', name: 'Quickened', from: 4, pace: 1.12 },
    { id: 'restless', name: 'Restless', from: 4, rest: 1.5 },
    { id: 'unbroken', name: 'Unbroken', from: 6, chain: 1.8 },
  ],
};
const RUSH_MODIFIER_BY_ID = Object.fromEntries(RUSH.modifiers.map(m => [m.id, m]));
