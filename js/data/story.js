'use strict';
// Story mode (v4.4; two roads since v7.0): each campaign as content. js/story.js plays them; this is only their text and order.
//   id, name, short    the campaign's id (its save slot is CONFIG.story.saveKeys[id]), its menu line and a short tag (dev jumps)
//   menuTitle, menuSub its own menu screen's title and subtitle; description: the line under it in the Story menu
//   tutorial           the level played with Tutorial: On, or null (New goes straight to chapter 1)
//   chapters           the campaign in order, each a level id with the title shown over its loading screen and one line
//     linking it to the last. Optional `loadout: { <item id>: { min, max } }` clamps a carried item's capacity on that
//     chapter (for a level built around a fixed kit).
//   done               the notice on the STORY COMPLETE screen; credits: who walked beside you and who stood in the way
// Adding a level to a campaign: write the level as usual (js/levels/, data/levels.js), then add a chapter where it falls.
// The order here, not the levels' `next`, drives the campaign. Every line here must agree with LORE.md.
const STORY = {
  id: 'ashmere', name: 'Ashmere: The Gaoler King', short: 'Ashmere', menuTitle: 'ASHMERE', menuSub: 'THE GAOLER KING',
  description: 'Start here. Five levels, from the prison to the king.',
  tutorial: { level: 'tutorial', title: 'THE TRAINING HALL', line: 'Before the road, learn the blade.' },
  chapters: [
    { level: 'long-hall', title: 'THE LONG HALL', line: 'You wake in the Gaoler King\'s cells, in the old hall of judgment. The hall beyond is long, and not empty.' },
    { level: 'sunken-keep', title: 'THE SUNKEN KEEP', line: 'Below the hall the founders\' first keep sinks into the dark. He keeps his prisoners there now, and its wardens hold the doors.' },
    { level: 'burning-town', title: 'THE BURNING TOWN', line: 'Out of the keep at last, into Corvel, the river town of bells, burning.' },
    { level: 'the-tower', title: 'THE TOWER', line: 'Above the ashes, on its cliff, the founders\' watchtower keeps the Bell of Waking.' },
    { level: 'final-castle', title: 'THE FINAL CASTLE', line: 'The bell is rung. By the old law, King Aldric must come out of his gates and answer.' },
  ],
  done: 'The ash has stopped falling. The road is walked.',
  credits: { companion: 'Ysolde of Corvel', foes: ['The Pillager Captain', 'The Bell Warden', 'Aldric, the Gaoler King', 'Aldric, the Ember-Crowned'] },
  // What a new story starts with beyond the player's own kit (PLAYER_DEF). Future currencies, upgrades and equipment
  // go here and in js/story.js (captureProgress / applyProgress); unknown fields in an old save are kept, never read.
  progress: { currency: 0, equipment: {}, upgrades: {} },
};
// The second road (v7.0): the Lands Between, one land for each boss of the Elden Ring Bosses mode, in that order. Harder
// than Ashmere from its first step; every land grants more flasks (the levels' `flasks`). LORE.md, part II.
const LANDS_STORY = {
  id: 'lands', name: 'The Lands Between: The Elden Throne', short: 'Lands', menuTitle: 'THE LANDS BETWEEN', menuSub: 'THE ELDEN THRONE',
  description: 'Harder. Eight levels, each with an Elden Ring boss.',
  tutorial: { level: 'tutorial', title: 'THE TRAINING HALL', line: 'Before the road, learn the blade.' },
  chapters: [
    { level: 'stormhill', title: 'STORMHILL', line: 'The Elden Ring lies shattered, and the demigods who took its shards have gone mad with them. Grace has called you back from death, Tarnished. The road to the throne begins at Stormveil, and the Fell Omen keeps its gate.' },
    { level: 'stormveil', title: 'STORMVEIL CASTLE', line: 'Past the Omen stands the castle of Godrick the Grafted, who sews the limbs of the fallen onto his own body, and keeps a Great Rune he never earned.' },
    { level: 'evergaol', title: 'THE STORMHILL EVERGAOL', line: 'One Great Rune will not open the capital. The second lies sealed in an evergaol, a prison of stars, with the last knight of the Crucible set to guard it for ever.' },
    { level: 'leyndell', title: 'LEYNDELL, ROYAL CAPITAL', line: 'Two runes, and the capital\'s gate opens. Under the Erdtree the golden city waits, and its last defender: Morgott, the Omen King.' },
    { level: 'ashen-capital', title: 'LEYNDELL, ASHEN CAPITAL', line: 'The Erdtree\'s thorns would let no one in, so Seren gave it her flame. The tree burned, and the city with it. In the ash, the first Elden Lord has come home to his throne.' },
    { level: 'farum-azula', title: 'CRUMBLING FARUM AZULA', line: 'The ash has cleared the way, but the throne\'s doors hold: Death itself is sealed behind them. Its keeper, the Black Blade, waits in Farum Azula, the dragons\' city torn loose from time.' },
    { level: 'erdtree', title: 'THE ELDEN THRONE', line: 'Destined Death is free. Inside the burnt Erdtree, at the foot of the throne, the Golden Order still has a body, and its name is Radagon.' },
    { level: 'haligtree', title: 'THE HALIGTREE', line: 'The Ring will not mend: one shard is missing. Malenia, Blade of Miquella, carried it to the Haligtree in the frozen north, where the scarlet rot blooms.' },
  ],
  done: 'The Elden Ring is whole. Somewhere, a maiden\'s lantern is lit again.',
  credits: { companion: 'Seren, the Grace-Bearer', foes: ['Margit, the Fell Omen', 'Godrick the Grafted', 'The Crucible Knight', 'Morgott, the Omen King',
    'Godfrey, First Elden Lord', 'Maliketh, the Black Blade', 'Radagon of the Golden Order', 'Malenia, Blade of Miquella'] },
  progress: { currency: 0, equipment: {}, upgrades: {} },
};
const STORIES = [STORY, LANDS_STORY];
