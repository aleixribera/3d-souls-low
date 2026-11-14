// ============================================================================
// Levels and crates (PLAN.md track B item 7): playing Boss Rush earns levels, kept per browser; each level gives one
// crate, opened on the end-of-run screen or in the Collection with a roll. What a crate can hold is below; the store
// is js/progress.js, the roll and the Collection js/crate-screen.js. The server reads only which rewards exist (the
// blade look a player wears, the crate abilities they may be offered): a crate never changes a fight's numbers beyond
// putting one more ability in that player's pool.
// ============================================================================
// `xp`: what a run earns. `boss` for each boss beaten, `crowned` more for a Crowned one, `minute` for each minute played,
//   at least `least` for any run that ended (a run lost at once still counts as playing).
// `level`: the xp from one level to the next: `first`, then `step` more each level, never above `most`.
// `odds`: a crate's rarity, drawn by weight among the rarities that still hold a reward you don't own.
// `roll`: the strip: `tiles` in it, the reward at `land`, `time` s to spin down (`still` s with reduced motion).
// `rewards`: every reward. `kind` 'look' (a blade look: its `tint` over the steel, its `metal`ness (the steel's own
//   is 0.4), `rough`: the steel's roughness times this (1 as forged), and a `glow` with its strength `glowK`) or 'ability' (the `ability` it unlocks, one of ABILITIES with `crate: true`).
//   `start: true` is owned from the first day and never in a crate. A reward's rarity is its own, or its ability's.
//   A `text` follows the abilities' rule (AGENTS.md rule 10): only what it is, in the fewest plain words.
const CRATES = {
  xp: { boss: 100, crowned: 150, minute: 15, least: 50 },
  level: { first: 250, step: 100, most: 1500 },
  odds: { common: 70, rare: 25, legendary: 5 },
  roll: { tiles: 46, land: 40, time: 6.2, still: 1.2 },
  rewards: [
    { id: 'old-steel', kind: 'look', rarity: 'common', start: true, name: 'Old Steel', text: 'Nicked grey steel.', tint: 0xffffff, metal: 0.4, rough: 1 },
    { id: 'blackened-iron', kind: 'look', rarity: 'common', name: 'Blackened Iron', text: 'Dark, unpolished iron.', tint: 0x55595f, metal: 0.5, rough: 1.15 },
    { id: 'bronze-edge', kind: 'look', rarity: 'common', name: 'Bronze Edge', text: 'Warm bronze, hard edge.', tint: 0xd8a462, metal: 0.7, rough: 0.8 },
    { id: 'rust-eaten', kind: 'look', rarity: 'common', name: 'Rust-Eaten', text: 'Red with rust, tip to guard.', tint: 0xb06a46, metal: 0.2, rough: 1.35 },
    { id: 'pale-silver', kind: 'look', rarity: 'common', name: 'Pale Silver', text: 'Bright, freshly honed silver.', tint: 0xf4f8ff, metal: 0.75, rough: 0.55 },
    { id: 'ash-and-bone', kind: 'look', rarity: 'rare', name: 'Ash and Bone', text: 'Old bone, dusted with ash.', tint: 0xeadfc2, metal: 0.05, rough: 1.3 },
    { id: 'ember-forged', kind: 'look', rarity: 'rare', name: 'Ember-Forged', text: 'The edge glows like a coal.', tint: 0x6a4a3e, glow: 0xff5a1a, glowK: 0.55, metal: 0.45, rough: 1 },
    { id: 'moonlit', kind: 'look', rarity: 'rare', name: 'Moonlit', text: 'Cold steel with a faint blue light.', tint: 0xb8c8ff, glow: 0x4a78ff, glowK: 0.35, metal: 0.7, rough: 0.6 },
    { id: 'gilded', kind: 'look', rarity: 'legendary', name: 'Gilded', text: 'Gold over steel.', tint: 0xffd27a, glow: 0xb07818, glowK: 0.22, metal: 0.9, rough: 0.55 },
    { id: 'bloodsteel', kind: 'look', rarity: 'legendary', name: 'Bloodsteel', text: 'Dark red steel that glows.', tint: 0x8a2a24, glow: 0xd01a14, glowK: 0.3, metal: 0.6, rough: 0.75 },
    { id: 'grave-feast', kind: 'ability', ability: 'grave-feast' },
    { id: 'iron-mercy', kind: 'ability', ability: 'iron-mercy' },
  ],
};
const CRATE_BY_ID = Object.fromEntries(CRATES.rewards.map(r => [r.id, r]));
// A reward's rarity, name and text: a crate ability's are the ability's own.
const crateRarity = r => r.kind === 'ability' ? ABILITY_BY_ID[r.ability]?.rarity : r.rarity;
const crateName = r => r.kind === 'ability' ? ABILITY_BY_ID[r.ability]?.name : r.name;
// The crate abilities a list of owned reward ids unlocks (what a browser tells the server).
const crateAbilities = owned => owned.map(id => CRATE_BY_ID[id]).filter(r => r && r.kind === 'ability').map(r => r.ability);
