// ============================================================================
// Levels and crates (PLAN.md item 7): playing Boss Rush earns levels, kept per browser; each level gives one crate,
// opened on the end-of-run screen or on the Abilities page with a roll. A crate unlocks one ability the player doesn't
// own. Each player keeps an active pool of the abilities they own, and Boss Rush offers cards only from it. The store
// is js/progress.js, the roll and the Abilities page js/crate-screen.js; the server checks the pool (js/lobby-sim.js
// setGear).
// ============================================================================
// `xp`: what a run earns. `fight` for each fight won, `crowned` more for a Crowned one, `minute` for each minute played,
//   at least `least` for any run that ended (a run lost at once still counts as playing).
// `level`: the xp from one level to the next: `first`, then `step` more each level, never above `most`.
// `odds`: a crate's rarity, drawn by weight among the rarities that still hold an ability you don't own.
// `roll`: the strip: `tiles` in it, the ability at `land`, `time` s to spin down (`still` s with reduced motion).
// `starter`: the abilities every player owns from the start (ids of ABILITIES); never in a crate. How many of each
//   rarity it holds is the least a player keeps active (CRATE_MIN).
// `save`: the store's version (js/progress.js). A store from another version keeps its xp, crates and name; its
//   abilities go back to the starter set (v2, PLAN.md item 7: everyone resets to the starter set, Aleix).
// Call (pass 107), the starter set. Commons: health, damage, the deflect and counter windows, dashes and flasks. Rares:
// Fire Burst (Strike), Mending (Guard), Grave Hound (Summon), Counterstep (a perfect dodge sets up a riposte).
// Legendaries: Thunder Call (Ultimate) and Time Rift (a perfect dodge freezes the boss): both reward the timing the
// game is built on.
const CRATES = {
  xp: { fight: 100, crowned: 150, minute: 15, least: 50 },
  level: { first: 250, step: 100, most: 1500 },
  odds: { common: 70, rare: 25, legendary: 5 },
  roll: { tiles: 46, land: 40, time: 6.2, still: 1.2 },
  save: 2,
  starter: ['keen-edge', 'iron-blood', 'breaker', 'keen-eye', 'light-step', 'quick-draught',
    'fire-burst', 'mending', 'grave-hound', 'counterstep',
    'thunder-call', 'time-rift'],
};
// How many of each rarity a player keeps active: the starter set's count of it.
const CRATE_MIN = Object.fromEntries(['common', 'rare', 'legendary'].map(r => [r, CRATES.starter.filter(id => ABILITY_BY_ID[id]?.rarity === r).length]));
// An active pool made safe, as the server and the browser both read it: known abilities only, each once, and at least
// CRATE_MIN of each rarity; null if it isn't one.
function cratePool(list) {
  if (!Array.isArray(list)) return null;
  const ids = [...new Set(list.slice(0, ABILITIES.length * 2).filter(id => typeof id === 'string' && Object.hasOwn(ABILITY_BY_ID, id)))];
  for (const [r, n] of Object.entries(CRATE_MIN)) if (ids.filter(id => ABILITY_BY_ID[id].rarity === r).length < n) return null;
  return ids;
}
