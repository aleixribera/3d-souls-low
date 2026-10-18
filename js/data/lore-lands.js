'use strict';
// Lore of the Lands Between (v7.0): Seren's words, the messages and tablets, the wordless scenes and the second road's
// ending. Same format as js/data/lore.js (read by js/lore.js); every line here must agree with LORE.md, Part II.
// Seren is `LORE.cast.seren`: each of her places names her with `who`; from the ashen capital on she is a `spirit`.
LORE.cast = { ...(LORE.cast || {}), seren: { id: 'seren', name: 'Seren, the Grace-Bearer', model: 'seren', scale: 0.96, bulk: 0.92, halo: 0xffe0a0 } };
LORE.endings = { ...(LORE.endings || {}),
  // The Haligtree's ending (js/finale.js), before the credits (LORE.md, II.6).
  haligtree: [
    'Malenia sinks to her knees in the lake, and the scarlet blossoms close, one by one.',
    'The last Great Rune is warm in your hand. Around it the others turn, and find their places.',
    'At the foot of the burnt Erdtree, a lantern\'s light gathers the shards into a ring of gold.',
    'The Elden Ring is whole. The throne is yours, Tarnished, if you will sit.',
    'Somewhere, a maiden\'s lantern is lit again.',
  ],
};
Object.assign(LORE.levels, {
  stormhill: {
    npcs: [{ who: 'seren', x: 2.0, z: -2.6, yaw: 1.2, pose: 'stand', bonfire: 'storm-chapel',
      lines: [
        'So grace has called you back. I wondered which of you it would choose.',
        'I am Seren. I carry what is left of the grace, in this lantern, and I can see where it points.',
        'The Elden Ring was broken. Its shards, the Great Runes, went to the demigods, and the demigods went to war, and then to madness.',
        'Gather the runes, mend the Ring, and sit the Elden Throne. That is what grace wants of you. Of all of you.',
        'The road begins at Stormveil. Its gate is kept by an Omen, a cursed thing with gold in its hands. He has turned back every Tarnished before you.',
        'Wherever you see the light rise from a site of grace, I will have been there. Rest at each one. You will need them.',
        'Go on. I cannot fight for you. I can only show you the way.',
      ],
      idle: 'The gate is east, past the heath and the gorge. Mind the cliff path.' }],
    inscriptions: [
      { id: 'storm-tablet', x: 10, z: 8.85, yaw: Math.PI, mount: 'wall', label: 'Chapel tablet',
        lines: ['"Here the Tarnished waited for the call of grace. Few were called. Fewer came back."'] },
      { id: 'storm-msg-heath', x: 33.5, z: 2.5, yaw: Math.PI / 2, mount: 'floor', label: 'Message', lines: ['"Omen ahead. Patience."'] },
      { id: 'storm-msg-bridge', x: 230, y: 8, z: -1.5, yaw: Math.PI / 2, mount: 'floor', label: 'Message', lines: ['"His swings wait. Do not."'] },
    ],
    scenes: [
      { kind: 'candle', x: 0.9, z: -1.6 }, { kind: 'candle', x: 1.2, z: -3.9 },
      { kind: 'corpse', pose: 'seated', x: 106.5, z: 7.2, yaw: Math.PI }, { kind: 'corpse', pose: 'lying', x: 120, z: -6.5, yaw: 0.6 },
      { kind: 'corpse', pose: 'seated', x: 1.0, z: 2.5, yaw: Math.PI / 2 },
      { kind: 'corpse', pose: 'lying', x: 58, z: -3, yaw: 1.2 },
      { kind: 'corpse', pose: 'reaching', x: 211, y: 8, z: -1.6, yaw: Math.PI / 2 },
    ],
  },
  stormveil: {
    npcs: [{ who: 'seren', x: 13.6, z: 4.3, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'veil-gate',
      lines: [
        'You passed the Omen. I did not think anyone would, truly.',
        'Godrick holds the castle. He sews the limbs of the fallen onto his own body, and thinks it makes him greater.',
        'He has a Great Rune, his grandmother\'s. He has never earned it.',
        'The main gate is barred. Take the side passage, along the cliffs. Things wait on the walls there.',
        'And on the rampart the sea is very close. Do not let anything push you to it.',
      ],
      idle: 'The side passage is south of the yard. The sea is louder than it looks.' }],
    inscriptions: [
      { id: 'veil-msg', x: 33, z: -17, yaw: 0, mount: 'floor', label: 'Message', lines: ['"Look up."'] },
      { id: 'veil-plaque', x: 128.15, z: 50, yaw: Math.PI / 2, mount: 'wall', label: 'Bloodstained plaque',
        lines: ['"Lord Godrick, by the grace of the grafts, the Golden Lineage made whole."', 'Scratched below: "made of us."'] },
    ],
    scenes: [
      { kind: 'candle', x: 14.6, z: 5.4 },
      { kind: 'chains', x: 150.6, z: 44, yaw: -Math.PI / 2 }, { kind: 'chains', x: 129.4, z: 54, yaw: Math.PI / 2 },
      { kind: 'corpse', pose: 'lying', x: 136, z: 41, yaw: 0.4 }, { kind: 'corpse', pose: 'seated', x: 151, z: 56.5, yaw: -Math.PI / 2 },
      { kind: 'corpse', pose: 'lying', x: 64, z: -26.5, yaw: 2.6 },
    ],
  },
  evergaol: {
    npcs: [{ who: 'seren', x: 3.5, z: 4.5, yaw: 2.4, pose: 'stand', bonfire: 'gaol-landing',
      lines: [
        'This is an evergaol: a prison made of a piece of sky. The Golden Order sealed what it feared in places like this.',
        'There is a knight here, of the Crucible, from before the Order. The old life still runs in him. It shows as gold, as wings, as a tail.',
        'He guards a second rune. With two, the capital\'s gate will open to you.',
        'The bridges have no rail, and under them there is only sky. Do not look down too long.',
        'I am sorry I cannot carry your sword. I can only carry the light.',
      ],
      idle: 'The knight waits in the great ring, beyond the last cell.' }],
    inscriptions: [
      { id: 'gaol-seal', x: 11, z: 4.5, yaw: -Math.PI / 2, mount: 'floor', label: 'Evergaol seal',
        lines: ['"Sealed by the Golden Order: a knight of the Crucible, who would not kneel. Let the stars keep him."'] },
      { id: 'gaol-msg', x: 102.5, y: 6, z: 3, yaw: 0, mount: 'floor', label: 'Message', lines: ['"Ahead, a tail. Then wings."'] },
    ],
    scenes: [
      { kind: 'candle', x: 1.6, z: 5.6 },
      { kind: 'shackles', x: 32, z: -8.4 }, { kind: 'shackles', x: 92.4, y: 6, z: 8.2 }, { kind: 'shackles', x: 96, y: 12, z: 74.2 },
      { kind: 'corpse', pose: 'seated', x: 48.2, z: 8.4, yaw: -Math.PI / 2 },
    ],
  },
  leyndell: {
    npcs: [{ who: 'seren', x: 13.6, z: 4.5, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'ley-gate',
      lines: [
        'Leyndell. The golden city. I was born under that tree, though you would not guess it.',
        'Morgott keeps it now: an Omen, like the one at Stormveil. Those horned things were his brothers.',
        'He is the last who still defends the Erdtree. He does it out of love, I think. That is the cruelest part.',
        'When he falls, the tree will close itself in thorns. It does not want anyone to reach the throne.',
        'There is only one way through thorns like those. Fire. I have known that for a long time.',
        'Do not worry for me. Go.',
      ],
      idle: 'The throne is north, at the foot of the tree, past the plaza and the great root.' }],
    inscriptions: [
      { id: 'ley-msg', x: 30, z: -2.5, yaw: Math.PI / 2, mount: 'floor', label: 'Message', lines: ['"Gold, everywhere. Still, knights."'] },
      { id: 'ley-throne', x: 152.15, y: 10, z: 50, yaw: Math.PI / 2, mount: 'wall', label: 'Throne inscription',
        lines: ['"The Elden Throne, at the foot of the Erdtree. None but the Lord shall sit."'] },
    ],
    scenes: [
      { kind: 'candle', x: 14.6, z: 5.5 }, { kind: 'sacks', x: 72, z: 16.5, yaw: 0.4 }, { kind: 'crates', x: 107, z: -17.2, yaw: 0.2 },
      { kind: 'corpse', pose: 'lying', x: 118, z: 2.4, yaw: 2.2 },
    ],
  },
  'ashen-capital': {
    npcs: [{ who: 'seren', spirit: true, x: 11.6, z: 3.6, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'ash-gate',
      lines: [
        'You are still here. Good. I hoped you would be.',
        'I gave the Erdtree my flame, as I always knew I would. It burned. The city burned with it.',
        'What you see is only grace now. It is enough to light the way, I think.',
        'But the fire woke someone. The first Elden Lord, Godfrey, has come back to the throne he left long ago.',
        'Beware the market lane. The fire ate the ground beneath it.',
      ],
      idle: 'The throne is north of the plaza. He is waiting for you there.' }],
    inscriptions: [
      { id: 'ash-msg', x: 40, z: -2, yaw: Math.PI / 2, mount: 'floor', label: 'Message', lines: ['"The lane ahead. No way round."'] },
      { id: 'ash-epitaph', x: 96, z: -41.85, yaw: 0, mount: 'wall', label: 'Epitaph', lines: ['"Here burned the capital, that the way might open. Forgive us."'] },
    ],
    scenes: [
      { kind: 'corpse', pose: 'lying', x: 26, z: 3, yaw: 0.9 }, { kind: 'corpse', pose: 'seated', x: 52, z: -5.2, yaw: 0 },
      { kind: 'corpse', pose: 'lying', x: 95, z: -38, yaw: 2.2 }, { kind: 'candle', x: 97.5, z: -41.2 },
    ],
  },
  'farum-azula': {
    npcs: [{ who: 'seren', spirit: true, x: 3.5, z: 4.5, yaw: 2.4, pose: 'stand', bonfire: 'farum-arrival',
      lines: [
        'This is Farum Azula, the city of the dragons. It has been falling apart, very slowly, since before the Order.',
        'The throne\'s doors are sealed with Death itself. Destined Death, which the Order locked away.',
        'Its keeper is Maliketh, the Black Blade, the queen\'s shadow. He will not give it up.',
        'Free it, and nothing will stand between you and the throne.',
        'The floors here are old. The colonnade will not hold you. Fall, and fight, and climb.',
      ],
      idle: 'The great bridge is at the top of the spire. He waits on it.' }],
    inscriptions: [
      { id: 'farum-msg', x: 82.5, y: 8, z: -2, yaw: Math.PI / 2, mount: 'floor', label: 'Message', lines: ['"The floor is lying."'] },
      { id: 'farum-script', x: 144, y: 8, z: 3.85, yaw: Math.PI, mount: 'wall', label: 'Dragon script',
        lines: ['Weathered marks you cannot read, and one you can: a sword over a closed eye.'] },
    ],
    scenes: [
      { kind: 'corpse', pose: 'seated', x: 13, z: -6.4, yaw: Math.PI }, { kind: 'corpse', pose: 'lying', x: 236, y: 16, z: 5, yaw: 1.6 },
      { kind: 'candle', x: 233.5, y: 16, z: -7.2 },
    ],
  },
  erdtree: {
    npcs: [{ who: 'seren', spirit: true, x: 3.5, z: 5.5, yaw: 2.4, pose: 'stand', bonfire: 'tree-hollow',
      lines: [
        'We are inside the tree. Even burnt, its heart still shines.',
        'At the foot of the throne stands Radagon. He was the queen\'s husband, and he was the queen. The Order made them one.',
        'He is the Golden Order\'s body, and the Order will not let the Ring be made anew without a fight.',
        'His zealots vanish and appear where you stand. When the floor glows beneath you, move.',
      ],
      idle: 'Marika\'s hall is east, past the chapel of the Order.' }],
    inscriptions: [
      { id: 'tree-msg', x: 12, z: -2.5, yaw: Math.PI / 2, mount: 'floor', label: 'Message', lines: ['"When the floor glows, move."'] },
      { id: 'tree-tablet', x: 92.5, y: 16, z: 94, yaw: Math.PI / 2, mount: 'floor', label: 'Golden tablet',
        lines: ['"The Golden Order is eternal. All that lives returns to the Erdtree."'] },
    ],
    scenes: [
      { kind: 'candle', x: 1.8, z: 6.8 }, { kind: 'candle', x: 152.5, y: 16, z: 76.8 },
      { kind: 'corpse', pose: 'seated', x: 113, y: 8, z: 52.8, yaw: Math.PI },
    ],
  },
  haligtree: {
    npcs: [{ who: 'seren', spirit: true, x: 3.5, y: 24, z: 4.5, yaw: 2.4, pose: 'stand', bonfire: 'halig-ledge',
      lines: [
        'The Ring will not mend. One shard is missing, the last.',
        'Malenia took it here, to the Haligtree, her brother\'s tree. She has never lost a fight.',
        'Below the boughs the scarlet rot has taken everything. Do not stand in it. It eats.',
        'Her knights still keep her, in gold and crimson. Every blow they land feeds them a little.',
        'When it is done, bring the rune to me. I will be there. I promise.',
      ],
      idle: 'She waits by the lake, below the rot.' },
      { who: 'seren', spirit: true, x: 189.5, z: -37.4, yaw: -2.4, pose: 'stand', bonfire: 'halig-lake', after: 'zone-court',
        lines: [
          'She is beyond the fog. I can feel the rot from here.',
          'Whatever happens, the light came this far with you. That was not nothing.',
        ],
        idle: 'Go on. I will wait.' }],
    inscriptions: [
      { id: 'halig-msg', x: 11, y: 24, z: -2, yaw: Math.PI / 2, mount: 'floor', label: 'Message', lines: ['"Do not let them land a blow. They drink it."'] },
      { id: 'halig-tablet', x: 88.15, z: -46, yaw: Math.PI / 2, mount: 'wall', label: 'Elphael inscription',
        lines: ['"Here all are welcome, the cursed and the cast out. So swore Miquella."'] },
      { id: 'halig-msg-2', x: 196, z: -44, yaw: Math.PI / 2, mount: 'floor', label: 'Message', lines: ['"Her dance. Run from the first; roll the rest."'] },
    ],
    scenes: [
      { kind: 'candle', x: 1.8, y: 24, z: 5.6 }, { kind: 'candle', x: 91, z: -53.2 },
      { kind: 'corpse', pose: 'lying', x: 118, z: -44, yaw: 2.4 }, { kind: 'corpse', pose: 'seated', x: 199, z: -36.8, yaw: Math.PI },
    ],
  },
});
