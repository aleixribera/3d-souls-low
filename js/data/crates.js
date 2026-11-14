// ============================================================================
// Levels and crates (pass 70, PLAN.md track B item 7): playing earns levels, kept per browser; each level gives one
// crate, opened on the end of a run (or in the Collection) with a roll. What a crate can hold is below; the store, the
// roll and the screens are js/progress.js. The server reads only which rewards exist (a look a player wears, a crate
// ability they hold): what a browser owns is its own business, and a crate never changes a fight's numbers beyond
// putting one more ability in the pool.
// ============================================================================
// `xp`: what a run earns. `boss` for each boss beaten, `crowned` more for a Crowned one, `minute` for each minute played,
//   at least `least` for any run that ended (a run lost at once still counts as playing).
// `level`: the xp from one level to the next: `first`, then `step` more each level, never above `most`.
// `odds`: a crate's rarity, drawn by weight among the rarities that still hold a reward you don't own.
// `roll`: the strip: `tiles` in it, the reward at `land`, `time` s to spin down (`still` s with reduced motion).
// `rewards`: every reward. `kind` 'look' (a weapon look: the blade's `tint`, and a `glow` with its `glowK`, and its
//   `metal` and `rough`) or 'ability' (the `ability` it unlocks, one of ABILITIES with `crate: true`). `start: true`
//   is owned from the first day and never in a crate. A reward's rarity is its own, or its ability's.
const CRATES = {
  xp: { boss: 100, crowned: 150, minute: 15, least: 50 },
  level: { first: 250, step: 100, most: 1500 },
  odds: { common: 70, rare: 25, legendary: 5 },
  roll: { tiles: 46, land: 40, time: 6.2, still: 1.2 },
  rewards: [
    { id: 'old-steel', kind: 'look', rarity: 'common', start: true, name: 'Old Steel', text: 'The blade you set out with, nicked and grey.',
      tint: 0xffffff, metal: 0.55, rough: 0.5 },
    { id: 'blackened-iron', kind: 'look', rarity: 'common', name: 'Blackened Iron', text: 'A blade dark from the forge, never polished.',
      tint: 0x55595f, metal: 0.7, rough: 0.55 },
    { id: 'bronze-edge', kind: 'look', rarity: 'common', name: 'Bronze Edge', text: 'Warm, soft-looking metal with a hard edge.',
      tint: 0xd8a462, metal: 0.8, rough: 0.4 },
    { id: 'rust-eaten', kind: 'look', rarity: 'common', name: 'Rust-Eaten', text: 'Red with rust from tip to guard. It still cuts.',
      tint: 0xb06a46, metal: 0.35, rough: 0.8 },
    { id: 'pale-silver', kind: 'look', rarity: 'common', name: 'Pale Silver', text: 'Bright, cold and freshly honed.',
      tint: 0xf4f8ff, metal: 0.9, rough: 0.22 },
    { id: 'ash-and-bone', kind: 'look', rarity: 'rare', name: 'Ash and Bone', text: 'A blade the colour of old bone, dusted with ash.',
      tint: 0xeadfc2, metal: 0.15, rough: 0.75 },
    { id: 'ember-forged', kind: 'look', rarity: 'rare', name: 'Ember-Forged', text: 'Still hot from the forge: the edge glows like a coal.',
      tint: 0x6a4a3e, glow: 0xff5a1a, glowK: 0.55, metal: 0.6, rough: 0.5 },
    { id: 'moonlit', kind: 'look', rarity: 'rare', name: 'Moonlit', text: 'Cold steel that holds a faint blue light.',
      tint: 0xb8c8ff, glow: 0x4a78ff, glowK: 0.35, metal: 0.85, rough: 0.3 },
    { id: 'gilded', kind: 'look', rarity: 'legendary', name: 'Gilded', text: 'Gold over steel, the blade of a crowned knight.',
      tint: 0xffd27a, glow: 0xb07818, glowK: 0.22, metal: 1, rough: 0.25 },
    { id: 'bloodsteel', kind: 'look', rarity: 'legendary', name: 'Bloodsteel', text: 'Dark red steel that glows where it has drunk.',
      tint: 0x8a2a24, glow: 0xd01a14, glowK: 0.5, metal: 0.8, rough: 0.35 },
    { id: 'grave-feast', kind: 'ability', ability: 'grave-feast' },
    { id: 'iron-mercy', kind: 'ability', ability: 'iron-mercy' },
  ],
};
const CRATE_BY_ID = Object.fromEntries(CRATES.rewards.map(r => [r.id, r]));
// A crate ability's reward: its name, text and rarity are the ability's own.
const crateRarity = r => r.kind === 'ability' ? ABILITY_BY_ID[r.ability]?.rarity : r.rarity;
