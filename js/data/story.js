'use strict';
// Story mode (v4.4): the whole game as one campaign. js/story.js plays it; this is only its content.
//   tutorial: the level offered (Yes / No) before the first chapter.
//   chapters: the campaign in order, each a level id with the title shown over its loading screen and one line
//     linking it to the last. Optional `loadout: { <item id>: { min, max } }` clamps a carried item's capacity on that
//     chapter (for a level built around a fixed kit); none needs it today.
// Adding a level to Story mode: write the level as usual (js/levels/, LEVELS in data/levels.js), then add a chapter
// here where it falls. The order here, not the levels' `next`, drives the campaign.
const STORY = {
  tutorial: { level: 'tutorial', title: 'THE TRAINING HALL', line: 'Before the road, learn the blade.' },
  chapters: [
    { level: 'long-hall', title: 'THE LONG HALL', line: 'You wake in the Gaoler King\'s cells. The hall beyond is long, and not empty.' },
    { level: 'sunken-keep', title: 'THE SUNKEN KEEP', line: 'Below the hall his old keep sinks into the dark. Its wardens still hold the doors.' },
    { level: 'burning-town', title: 'THE BURNING TOWN', line: 'Out of the keep at last, into a town his men have put to the torch.' },
    { level: 'the-tower', title: 'THE TOWER', line: 'Above the ashes, on its cliff, the Tower keeps the bell that calls him.' },
    { level: 'final-castle', title: 'THE FINAL CASTLE', line: 'The bell is rung. Before his gates, the Gaoler King comes out to answer.' },
  ],
  // What a new story starts with beyond the player's own kit (PLAYER_DEF). Future currencies, upgrades and equipment
  // go here and in js/story.js (captureProgress / applyProgress); unknown fields in an old save are kept, never read.
  progress: { currency: 0, equipment: {}, upgrades: {} },
};
