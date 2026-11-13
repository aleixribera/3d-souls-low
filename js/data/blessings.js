// ============================================================================
// Boss Rush's blessings (v7.35.0): one is chosen between fights and kept for the run (CONFIG.blessings).
// `boon` is the Player field it adds to; its size is CONFIG.blessings.boons[boon], once per time it was taken (its
// level). In `text`, {pct} is that size as a percentage, {n} as a whole number, {s} an "s" when {n} is not 1, and {hp}
// CONFIG.blessings.riseHp as a percentage (blessingParts, js/player.js). `rarity` is one of CONFIG.blessings.rarities
// (the pick's colour; drawing only until rarity weights the offer). `icon` is the pick card's drawing: SVG path data
// on a 48 x 48 grid, drawn as a thin line in the rarity's colour (js/multiplayer.js).
// ============================================================================
const BLESSINGS = [
  { id: 'whetted-edge', name: 'Whetted Edge', boon: 'damage', rarity: 'common', text: 'Your blows deal {pct} more damage.',
    icon: 'M41 7 L39 13 L20 32 L16 28 L35 9 Z M13 25 L23 35 M18 30 L10 38 M7 36 L12 41 M33 21 L37 22 M29 25 L32 27 M36 16 L40 15' },
  { id: 'spare-draught', name: 'Spare Draught', boon: 'flasks', rarity: 'common', text: 'Carry {n} more flask{s}, full at every fight.',
    icon: 'M19 6 L29 6 M21 6 L21 16 C13 19 10 26 12 32 C14 39 19 42 24 42 C29 42 34 39 36 32 C38 26 35 19 27 16 L27 6 M13 29 C19 26 28 32 35 28' },
  { id: 'second-wind', name: 'Second Wind', boon: 'stamina', rarity: 'common', text: 'Stamina refills {pct} faster.',
    icon: 'M6 18 L27 18 C33 18 35 12 31 9 C28 7 24 9 25 13 M6 26 L35 26 C41 26 43 32 39 35 C36 38 31 36 32 32 M6 34 L20 34' },
  { id: 'keen-ear', name: 'Keen Ear', boon: 'parry', rarity: 'common', text: 'Your parry window is {pct} wider.',
    icon: 'M8 24 A7 7 0 1 0 22 24 A7 7 0 1 0 8 24 Z M27 16 Q32 24 27 32 M32 12 Q39 24 32 36 M37 8 Q46 24 37 40' },
  { id: 'rise-again', name: 'Rise Again', boon: 'rise', rarity: 'common', text: 'Rise where you fell, with {hp} health, {n} time{s} a fight.',
    icon: 'M24 42 C16 42 13 35 17 28 C19 32 21 32 21 29 C21 23 25 20 27 15 C30 21 34 26 32 34 C31 39 28 42 24 42 Z M24 4 L17 11 M24 4 L31 11' },
];
const BLESSING_BY_ID = Object.fromEntries(BLESSINGS.map(b => [b.id, b]));
