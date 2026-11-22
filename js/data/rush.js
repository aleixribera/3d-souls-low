// ============================================================================
// Endless Boss Rush (pass 65, PLAN.md track B item 5): bosses' Boss Rush health shares, and the modifiers later fights
// carry. The draw and its rules (Crowned every few, two at once, how many modifiers) are CONFIG.endless; the server
// draws each fight (js/lobby-sim.js `calling`): every fight from every boss (Aleix, 2026-11-21: "just random bosses
// always, not easier artificially"; the warm-up's own five easier bosses at part health opened every run alike).
// ============================================================================
// `health`: a boss's share of its own health in every Boss Rush fight, for the few the skilled test bot alone falls to
// far more than the rest at the same pace (tools/rush-curve.cjs bosses and runs, pass 73). Story and Practice keep it whole.
// `modifiers`: each has an `id`, the `name` shown under the boss's bar, the fight `from` which it may be
// drawn, and what it changes on the fight's bosses. None adds damage or health: only their speed.
//   pace:  their whole pace (CONFIG.pace): recoveries, rests, follow-ups, wind-ups past the base, times this.
//   rest:  the rests between their attacks run this many times faster.
//   chain: their follow-ups come as if their pace were this many times higher (longer strings).
const RUSH = {
  health: { bellWarden: 0.75, oswin: 0.85, ostrey: 0.85, varn: 0.9 },
  modifiers: [
    { id: 'quickened', name: 'Faster', from: 4, pace: 1.12 },
    { id: 'restless', name: 'Fewer pauses', from: 4, rest: 1.5 },
    { id: 'unbroken', name: 'Longer combos', from: 6, chain: 1.8 },
  ],
};
const RUSH_MODIFIER_BY_ID = Object.fromEntries(RUSH.modifiers.map(m => [m.id, m]));
