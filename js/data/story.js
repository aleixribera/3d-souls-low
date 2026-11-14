'use strict';
// Story mode (v4.4): each campaign as content (one road since v7.54.0). js/story.js plays them; this is only their text and order.
//   id, name, short    the campaign's id (its save slot is CONFIG.story.saveKeys[id]), its menu line and a short tag (dev jumps)
//   menuTitle, menuSub its own menu screen's title and subtitle; description: the line under it in the Story menu
//   chapters           the campaign in order, each a level id with the title shown over its loading screen and one line
//     linking it to the last. Optional `loadout: { <item id>: { min, max } }` clamps a carried item's capacity on that
//     chapter (for a level built around a fixed kit). Optional `might: { pace, health, damage }` (pass 79): its bosses'
//     own strength, over the road's climb (CONFIG.story.road, roadMight in js/game-level.js).
//   done               the notice on the STORY COMPLETE screen; credits: who walked beside you and who stood in the way
//   goesOn             optional: while the road's last chapter has no `ending` (its later chapters not built yet), the
//                      notice on the THE ROAD GOES ON screen that follows that chapter
// Adding a level to a campaign: write the level as usual (js/levels/, data/levels.js), then add a chapter where it falls.
// The order here, not the levels' `next`, drives the campaign. Every line here must agree with STORY.md.
const STORY = {
  id: 'ashmere', name: 'Ashmere: The Gaoler King', short: 'Ashmere', lobbyName: 'Story (Ashmere)', menuTitle: 'ASHMERE', menuSub: 'THE GAOLER KING',
  description: 'Start here. From the prison to the king, and over the pass. The controls are taught on the way.',
  chapters: [
    { level: 'long-hall', title: 'THE LONG HALL', line: 'You wake in the Gaoler King\'s cells, in the old hall of judgment. The hall beyond is long, and not empty.' },
    { level: 'sunken-keep', title: 'THE SUNKEN KEEP', line: 'Below the hall the founders\' first keep sinks into the dark. He keeps his prisoners there now, and its wardens hold the doors.' },
    { level: 'burning-town', title: 'THE BURNING TOWN', line: 'Out of the keep at last, into Corvel, the river town of bells, burning.' },
    { level: 'the-tower', title: 'THE TOWER', line: 'Above the ashes, on its cliff, the founders\' watchtower keeps the Bell of Waking.' },
    { level: 'final-castle', title: 'THE FINAL CASTLE', line: 'The bell is rung. By the old law, King Aldric must come out of his gates and answer.' },
    { level: 'the-church', title: 'THE CHURCH IN THE PASS', line: 'The king is ash, and still the ash falls. Something left him as he died, and went up into the mountains.' },
    { level: 'windward-moor', title: 'THE WINDWARD MOOR', line: 'Over the pass lies the country the Seven never named to their children. Its gate is still kept.' },
    { level: 'saltgrave', title: 'SALTGRAVE', line: 'Two castellans hold Saltgrave for a crown that does not answer. They have held it a very long time.',
      might: { pace: 0.75, health: 0.65, damage: 0.8 } },   // two at once: the climb alone left a newcomer 1 win in 4 (tools/story-curve.cjs)
    { level: 'night-gaol', title: 'THE NIGHT GAOL', line: 'Thrale too had a bell. The one who rang it was never let out.' },
    { level: 'aurel', title: 'AUREL, THE GILDED CITY', line: 'Aurel is gold, and fed, and smiling. Its regent will be glad to see you.' },
    { level: 'aurel-in-ash', title: 'AUREL IN ASH', line: 'A city that will not be kept is burned. You have seen this done before, though you do not remember it.' },
    { level: 'torn-abbey', title: 'THE TORN ABBEY', line: 'The monks of Thrale tried once to cut the hunger out of the earth. The earth came with it.' },
    { level: 'ember-root', title: 'THE ROOT OF THE EMBER', line: 'Under everything, the Ember is a root, and the root is still growing.' },
    { level: 'still-mere', title: 'THE STILL MERE', line: 'There is one water in Thrale that never burned. Carry it down. Something wearing your face is waiting.' },
  ],
  done: 'The ash has stopped falling. The road is walked.',
  credits: { companion: 'Ysolde of Corvel', foes: ['The Pillager Captain', 'The Bell Warden', 'Aldric, the Gaoler King', 'Aldric, the Ember-Crowned', 'The Antlered Hunger', 'Old Ostrey, the Porter', 'Hale and Harrow, the Castellans', 'The Ringer of Thrale', 'The Regent Hollis', 'Oswin, the First Crown', 'Mother Agathe, the Rending Hand', 'The Kindling Tree', 'The King\'s Blade'] },
  // What a new story starts with beyond the player's own kit (PLAYER_DEF). Future currencies, upgrades and equipment
  // go here and in js/story.js (captureProgress / applyProgress); unknown fields in an old save are kept, never read.
  progress: { currency: 0, equipment: {}, upgrades: {} },
};
const STORIES = [STORY];
