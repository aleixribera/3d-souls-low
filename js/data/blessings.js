// ============================================================================
// The Calling's blessings (v7.35.0): one is chosen between fights and kept for the run (CONFIG.blessings).
// `boon` is the Player field it adds to; its size is CONFIG.blessings.boons[boon]. In `text`, {pct} is that size as a
// percentage, {n} as a whole number and {hp} CONFIG.blessings.riseHp as a percentage (blessingText, js/player.js).
// ============================================================================
const BLESSINGS = [
  { id: 'whetted-edge', name: 'Whetted Edge', boon: 'damage', text: 'Your blows deal {pct} more damage.' },
  { id: 'spare-draught', name: 'Spare Draught', boon: 'flasks', text: '{n} more flask, full at every fight.' },
  { id: 'second-wind', name: 'Second Wind', boon: 'stamina', text: 'Stamina refills {pct} faster.' },
  { id: 'keen-ear', name: 'Keen Ear', boon: 'parry', text: 'Your parry window is {pct} wider.' },
  { id: 'rise-again', name: 'Rise Again', boon: 'rise', text: 'Once a fight, rise where you fell, with {hp} health.' },
];
const BLESSING_BY_ID = Object.fromEntries(BLESSINGS.map(b => [b.id, b]));
