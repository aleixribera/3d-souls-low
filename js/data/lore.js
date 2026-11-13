'use strict';
// Lore (v5.1): the NPC, the inscriptions and the wordless scenes of each level. js/lore.js plays them; this is only
// their content. Every line here must agree with LORE.md (the story's source of truth): change the story there first.
//   npc         who the recurring NPC is: name on the subtitles, model (js/data/models.js), size
//   levels      per level id:
//     (y: the floor height, 0 if left out; give it on any upper floor)
//     npcs        [{ x, y?, z, yaw, pose: 'stand'|'sit', solid?: [x0, x1, z0, z1], bars?, after?: '<zone id>',
//                   bonfire?: '<id>' (dev jumps), lines: [...], idle: '...' }]: each place she waits; `after`: only
//                 once that zone is won.
//                 `solid`: a rect the player cannot enter, `bars` [x0, z0, x1, z1]: iron bars drawn along a line (a cell);
//                 `idle`: said when the player comes
//                 back after hearing the dialogue. One press of Talk plays every line as subtitles.
//     inscriptions [{ id, x, y?, z, yaw, mount: 'wall'|'floor'|'none', label, lines: [...] }]
//     scenes      [{ kind, x, y?, z, yaw?, ... }]: drawn only, near the player (see SCENE kinds in js/lore.js)
//   The cell of Level 1 is an alcove of its own in js/levels/long-hall.js ('cell-8').
// Adding a dialogue or inscription: write it in LORE.md, then add it here under its level. Lore never blocks progress.
// The scene kinds js/lore.js can draw (each one a builder there).
const LORE_SCENES = ['corpse', 'shackles', 'barricade', 'candle', 'sacks', 'crates', 'bell', 'hearth', 'chair', 'rope', 'chains', 'portrait', 'crown', 'statue'];
const LORE = {
  // The cards after Aldric's death (js/finale.js; LORE.md, section 9): the end of Act I, not of the story. The Ember
  // leaves him, and the road goes on to the Church in the Pass. A level's own cards go in LORE.endings[<level id>].
  ending: [
    'Aldric, the Ember-Crowned, is ash. The Ember gutters in the cinders where he stood. It does not go out.',
    'Something goes up out of it, like heat over a summer road, through the broken windows and away toward the mountains.',
    'The bell that called him out tolls once more, by no one\'s hand, and then falls silent.',
    'His keys lie in the ash: every cell of the Long Hall and the Sunken Keep. No one will be thrown into that dark again.',
    'And over Ashmere, the ash goes on falling.',
  ],
  // The story's own ending (LORE.md, section 9b): the King's Blade's death on the Still Mere, then the credits.
  endings: {
    'still-mere': [
      'The King\'s Blade kneels in the shallows. The red scarf comes loose, and floats.',
      'You wade out with the Ember and hold it under. It does not fight you. The ice closes over it.',
      'Over Thrale the storm breaks. Over the mountains, over Ashmere, the ash stops falling.',
      'Finn stays at the water\'s edge. He does not say the name he knows.',
      'Down by the river, someone is ringing something small.',
    ],
  },
  npc: { id: 'ysolde', name: 'Ysolde of Corvel', model: 'ysolde', scale: 0.96, bulk: 0.94 },
  levels: {
    'long-hall': {
      npcs: [{ x: 8, z: 2.8, yaw: Math.PI, pose: 'stand', solid: [6.5, 9.5, 1.45, 8.6], bars: [[6.6, 1.55, 9.4, 1.55], [6.6, 1.55, 6.6, 5.95], [9.4, 1.55, 9.4, 5.95]],
        lines: [
          'Ah. You\'re awake. I\'d begun to think you never would.',
          'They carried you in a fortnight past. You didn\'t stir, not once. Most who come in that way never do.',
          'I am Ysolde. Of Corvel, down by the river, if Corvel still stands.',
          'Your door. It\'s open. Mine is not. That is either luck or someone\'s mercy, and there\'s little enough mercy in this place.',
          'The hall runs long, and the things in it are not men any more. Not all the way.',
          'They were prisoners once. The king\'s fire takes what it wants of a soul, and leaves the rest to walk.',
          'That scarf you wear... no. Never mind. Red was a common enough colour, once.',
          'Go on. If you find the keys, think of me. And if you don\'t... well. Go on regardless.',
        ],
        idle: 'Still here. The bars haven\'t grown any kinder.' }],
      inscriptions: [
        { id: 'l1-tally', x: 13, z: -5.9, yaw: 0, mount: 'wall', label: 'Scratched wall',
          lines: ['"Forty days. Then I stopped counting. Then I started again, for the child in the next cell."', '"She has stopped answering."'] },
        { id: 'l1-plaque', x: 135, z: 5.9, yaw: Math.PI, mount: 'wall', label: 'Worn plaque',
          lines: ['"Walk this hall with an open hand."', '— the Seven'] },
      ],
      scenes: [
        { kind: 'corpse', pose: 'seated', x: 0.9, z: 4.4, yaw: Math.PI / 2 },
        { kind: 'shackles', x: 1.4, z: 3.1 }, { kind: 'shackles', x: 8.9, z: 8.0 },
        { kind: 'corpse', pose: 'reaching', x: 166.5, z: -4.6, yaw: Math.PI / 2 },
      ],
    },
    'sunken-keep': {
      npcs: [{ x: 84.5, z: 38.3, yaw: -0.76, pose: 'stand',
        lines: [
          'You found the keys, then. Or something found me. Either way, I\'m out, and I\'m not going back.',
          'Do you know what this place was? Before the cells? It was the founders\' keep. Their first stone.',
          'Kings swore their oath down here. "The crown is held, not owned." My grandmother could say it in her sleep.',
          'And now the same king keeps us in it, like grain in a barn, against a hungry winter.',
          'The wardens down here weren\'t always his. They swore to guard the oath, not the gaoler. I think some of them still remember. It makes them no gentler.',
          'I passed a door barred from the inside. There were people behind it. They held it as long as they could.',
          'You fight like someone taught you. Properly taught. Not like a farmer with a stolen sword.',
          '...Forgive me. I talk when I\'m frightened. Go ahead. I\'ll follow when it\'s quiet.',
        ],
        idle: 'Quiet now. Quiet is a good sound, down here.' }],
      inscriptions: [
        { id: 'l2-shrine', x: 72, z: 46.85, yaw: Math.PI, mount: 'wall', label: 'Founders\' shrine',
          lines: ['"Here the Seven swore it: no one of us shall rule alone."', '"The crown is held, not owned."'] },
        { id: 'l2-door', x: 12.2, z: 7.85, yaw: Math.PI, mount: 'wall', label: 'Barred door',
          lines: ['"We held the door."', '"Tell them in Corvel we held the door."'] },
      ],
      scenes: [
        { kind: 'barricade', x: 10, z: 7.9, yaw: Math.PI },
        { kind: 'corpse', pose: 'seated', x: 9, z: 7.1, yaw: Math.PI },
        { kind: 'corpse', pose: 'lying', x: 11, z: 6.4, yaw: 2.4 },
        { kind: 'corpse', pose: 'lying', x: 36.2, z: -9.6, yaw: 0.4 }, { kind: 'candle', x: 37.2, z: -10.2 },
      ],
    },
    'burning-town': {
      npcs: [{ x: 42.6, y: 8, z: 55.3, yaw: -1.2, pose: 'sit',
        lines: [
          'This was the Lantern and Last. My father drank here every feast-day. He sang badly and was proud of it.',
          'Corvel. They called the ones who did this invaders. Men from over the mountains, they said.',
          'But I saw their boots. Ashmere\'s boots. Ashmere\'s buckles. Our own army, with the colours torn off.',
          'A year before the fire, the king sent his champion here with a torch, to make an example of us.',
          'The champion stood at the gate a long while. Then set the torch down in the road and walked away from it.',
          'We lived another year, because of that. One whole year. I\'ve never decided if that was a gift or a cruelty.',
          'They took the champion to the castle in chains. No one in Corvel ever learned their name. We only knew the red they wore.',
          'I\'m going to sit here a while. By the fire that isn\'t burning anything. Go on. The gate\'s at the top of the town.',
        ],
        idle: 'My father\'s chair. I won\'t sit in it. I\'ll just keep it company.' }],
      inscriptions: [
        { id: 'l3-church', x: 88, y: 12, z: 79.85, yaw: Math.PI, mount: 'wall', label: 'Parish stone',
          lines: ['"Corvel, town of bells."', '"Cast for the tower by the hands of this parish, in the founders\' faith."'] },
        { id: 'l3-sign', x: 13, z: -3.85, yaw: 0, mount: 'wall', label: 'Charred notice',
          lines: ['"By order of the crown: all who shelter the disloyal shall be counted among them."'] },
      ],
      scenes: [
        { kind: 'hearth', x: 40.6, y: 8, z: 54.45, yaw: 0 }, { kind: 'chair', x: 38.8, y: 8, z: 55.3, yaw: -0.5 },
        { kind: 'sacks', x: 76.5, z: -10.5, yaw: 0.3 }, { kind: 'crates', x: 78.4, z: -9.4, yaw: -0.2 }, { kind: 'bell', x: 74.8, z: -10.9 },
        { kind: 'corpse', pose: 'lying', x: 41.5, z: -3.2, yaw: 1.2 }, { kind: 'corpse', pose: 'child', x: 41.9, z: -3.4, yaw: 1.4 },
      ],
    },
    'the-tower': {
      npcs: [{ x: 29.7, z: 2.3, yaw: 2.72, pose: 'stand', bonfire: 'tower-bait',
        lines: [
          'There it is. The watchtower. My family cast bells for it for six generations.',
          'Not the great one, though. No living hand made the great one.',
          'The founders melted their own crowns to cast it. "Who rings me calls the crown to answer." That\'s what\'s written on its stone.',
          'One toll, and every seal on the castle breaks, and the king must come out and face whoever rang. That is the old law.',
          'That\'s why he took the tower. Not to use the bell. To make sure no one ever could.',
          'It\'s been rung once before, you know. Long ago, before even my grandmother\'s grandmother. No one remembers who rang it, or which king came out. Only that the bell has had a crack ever since.',
          'The ringers are still up there. What\'s left of them. Don\'t let their little bells frighten you. They were kind, once.',
          'Ring it. Please. I\'d do it myself, but I think it needs someone who has already said no to him once.',
        ],
        idle: 'I\'ll be here. Listening. I\'d know that bell\'s voice anywhere.' }],
      inscriptions: [
        { id: 'l4-stone', x: 14, z: -8.85, yaw: 0, mount: 'wall', label: 'Founding stone',
          lines: ['"Who rings me calls the crown to answer."', '"Let the crown come out."'] },
        { id: 'l4-ringer', x: 40, y: -4, z: -21.85, yaw: 0, mount: 'wall', label: 'A ringer\'s carving',
          lines: ['"We were told to stop ringing. We were told why."', '"We kept the rope oiled anyway."'] },
      ],
      scenes: [
        { kind: 'corpse', pose: 'seated', x: 7.2, z: 8.2, yaw: Math.PI }, { kind: 'rope', x: 7.6, z: 7.6, top: 7.5 },
        { kind: 'chains', x: 100, y: 22, z: -13.2 }, { kind: 'chains', x: 104, y: 22, z: -13.2 },
      ],
    },
    'final-castle': {
      npcs: [{ x: 94.6, z: 6.4, yaw: -2.49, pose: 'stand', after: 'zone-field', bonfire: 'castle-gate',
        lines: [
          'You saw him. Out there on the field. You saw what he has become.',
          'He came out because the bell made him. The old law still holds him, a little. Enough to drag him to his own gate.',
          'And he ran from you. I didn\'t think he could still be afraid of anything but dying.',
          'I came up the cliff road behind you. I wasn\'t brave. I only couldn\'t bear to wait below and not know.',
          'His castle is above us now. Gargoyles on the walls, and the old guard still at their posts. Empty, some of them. Only the armour, keeping its watch.',
          'There\'s a chapel inside. My grandmother prayed in it once, when the castle still opened its doors to the river towns.',
          'Rest here. Then go up. I\'ll find my own way, and I\'ll find you again before the end.',
        ],
        idle: 'Rest. The fire here is honest, at least.' },
      { x: 313.2, y: 24, z: 4.8, yaw: 3.0, pose: 'sit', bonfire: 'castle-throne',
        lines: [
          'You came through all of it. I followed the quiet you left behind you.',
          'In the chapel. Did you see the statue? The one with its face struck off?',
          'A hood. A round shield. Someone painted the scarf red, after.',
          'I never saw the champion\'s face at Corvel. Only the red, and the torch lying in the road.',
          'I won\'t ask. I don\'t think you could tell me if I did. I think he made sure of that.',
          'He\'s in there. What\'s left of him. He was a good king, once. My father said so. I\'d like to believe it, for my father\'s sake.',
          'The fire is his now, all of it. When it goes out, I think it goes out everywhere. I think the ash will stop.',
          'Whatever you were, you are the one who came back. That\'s enough for me.',
          'Go on, then. And when it\'s done... come down to the river. I\'ll be the one ringing something small.',
        ],
        idle: 'Go on. I\'m not going anywhere. Not any more.' }],
      inscriptions: [
        { id: 'l5-plinth', x: 206, z: 5.3, yaw: Math.PI, mount: 'none', label: 'Statue plinth',
          lines: ['(The name has been chiselled away.)', '"...the King\'s Blade, who kept the river towns. By the king\'s own love."'] },
        { id: 'l5-portraits', x: 234, z: 9.85, yaw: Math.PI, mount: 'wall', label: 'Gilded plaque',
          lines: ['"Aldric, sixth of his name, who swore the Oath of the Open Hand."', 'Scratched beneath it: "and forgot it."'] },
        { id: 'l5-seal', x: 316.5, y: 24, z: 5.85, yaw: Math.PI, mount: 'wall', label: 'Carving over the seal',
          lines: ['"The hunger wears a king."', '— carved over the seal, by the Seven'] },
      ],
      scenes: [
        { kind: 'statue', x: 206, z: 6.1, yaw: Math.PI },
        { kind: 'portrait', x: 222, z: 9.9, yaw: Math.PI }, { kind: 'portrait', x: 228, z: 9.9, yaw: Math.PI },
        { kind: 'portrait', x: 240, z: 9.9, yaw: Math.PI }, { kind: 'portrait', x: 246, z: 9.9, yaw: Math.PI, kept: true },
        { kind: 'crown', x: 318.2, y: 24, z: -4.6 },
      ],
    },
    'the-church': {
      npcs: [{ x: 8, z: -11, yaw: -0.57, pose: 'stand', bonfire: 'pass-wood',
        lines: [
          'You didn\'t come down to the river. So I came up after you.',
          'I rang, by the water, the way I said I would. The ash kept falling on the bell.',
          'My grandmother sang of the Seven coming over these mountains, carrying something wrapped in a cloak. The song never says what.',
          'They stopped at a church in the snow, and painted their own faces on its wall, so they would know each other after.',
          'Whatever left him when he fell, it came this way. Up, into the cold. As if it knows the road.',
          'I\'ll keep the fire. Go on up.',
        ],
        idle: 'The snow is clean here. I had forgotten snow could be.' }],
      inscriptions: [
        { id: 'l6-cross', x: 80.8, y: 6, z: -18.4, yaw: 0, mount: 'none', label: 'Bent iron cross',
          lines: ['"Those who stopped here on the way over. We came on without them."'] },
        { id: 'l6-door', x: 116.6, y: 6, z: 2.4, yaw: Math.PI / 2, mount: 'none', label: 'Over the church door',
          lines: ['"Seven came through. Leave it open behind you."'] },
        { id: 'l6-icon', x: 168.6, y: 6, z: 0, yaw: Math.PI / 2, mount: 'none', label: 'Below the last icon',
          lines: ['"We held it. We did not own it."', '— the Seven'] },
      ],
      scenes: [{ kind: 'corpse', x: 62, y: 3.6, z: 6, yaw: 1.1 }, { kind: 'corpse', x: 104, y: 6, z: -19, yaw: 2.6 }],
    },
    // Chapter 7 (v7.38.0; LORE.md 10c): Thrale's border.
    'windward-moor': {
      npcs: [{ x: 8, z: -1.2, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'moor-shrine',
        lines: [
          'Over the top, and down the other side. My grandmother\'s song had a line for this: the heath where the wind lives.',
          'There are people out on the moor. They walk together, close, after one who carries a lantern. They don\'t look at anything.',
          'I called to one of them. She smiled at me. She didn\'t stop.',
          'The song says the Seven came out of this country by night, and a man at the gate let them through. It doesn\'t say what it cost him.',
          'There\'s a gate at the far end, on a bridge over the gorge. Something stands in it, very tall, with a light.',
          'I\'ll keep the fire. I\'ve got good at it.',
        ],
        idle: 'The wind never stops here. I think it has been blowing since they left.' }],
      inscriptions: [
        { id: 'l7-stone', x: 10, z: 8.85, yaw: Math.PI, mount: 'wall', label: 'Border stone',
          lines: ['"Here the king\'s peace begins. Go softly, and follow the light."'] },
        { id: 'l7-milestone', x: 33.5, z: 2.5, yaw: Math.PI / 2, mount: 'floor', label: 'Milestone', lines: ['"Aurel, nine days. Keep to the lantern."'] },
        { id: 'l7-bridge', x: 230, y: 8, z: -1.5, yaw: Math.PI / 2, mount: 'floor', label: 'Cut in the bridge stones',
          lines: ['"The porter keeps the gate until the king sends word."', 'Scratched beneath it: "No word came."'] },
      ],
      scenes: [
        { kind: 'candle', x: 0.9, z: -1.6 }, { kind: 'candle', x: 1.2, z: -3.9 },
        { kind: 'corpse', pose: 'seated', x: 106.5, z: 7.2, yaw: Math.PI }, { kind: 'corpse', pose: 'lying', x: 120, z: -6.5, yaw: 0.6 },
        { kind: 'corpse', pose: 'lying', x: 58, z: -3, yaw: 1.2 },
        { kind: 'corpse', pose: 'reaching', x: 211, y: 8, z: -1.6, yaw: Math.PI / 2 },
      ],
    },
    // Chapter 8 (v7.40.0; LORE.md 10d): Thrale's border fortress.
    saltgrave: {
      npcs: [{ x: 7, z: 2.5, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'salt-gate',
        lines: [
          'The great gate is barred from inside. Whoever holds this place does not want it come at.',
          'There\'s a way round, along the cliffs. The sea is a long way down, and very loud.',
          'The song has two sisters in it, at Saltgrave. One suit of armour between them, and never both asleep at once.',
          'The knights on the walls are white with salt. One of them saluted me. Then it remembered what it was for.',
          'They kneel every evening, the song says, facing Aurel, and wait to be told they may stop.',
          'Go round. I\'ll keep the fire.',
        ],
        idle: 'You can taste the sea in the rain. I had never seen the sea.' }],
      inscriptions: [
        { id: 'l8-gate', x: 9, z: 5.85, yaw: Math.PI, mount: 'wall', label: 'Notice on the gatehouse wall',
          lines: ['"Shut by the castellans\' order, until the king rides in."'] },
        { id: 'l8-hall', x: 141.5, z: 36, yaw: 0, mount: 'floor', label: 'Cut in the hall\'s threshold',
          lines: ['"Here the garrison of Saltgrave knelt to the crown. Here it kneels."'] },
        { id: 'l8-stair', x: 141.5, y: 10, z: 91.5, yaw: 0, mount: 'floor', label: 'Cut in the top stair',
          lines: ['"Hale keeps the helm, Harrow the greaves. Between them, one castellan."'] },
      ],
      scenes: [
        { kind: 'candle', x: 1.2, z: -2 }, { kind: 'candle', x: 1.4, z: 2.2 },
        // The hall of kneeling statues: the garrison in stone, three to a side, heads bowed.
        ...[43, 48, 53].flatMap(z => [{ kind: 'statue', of: 'saltKnight', pose: 'kneel', x: 130.2, z, yaw: Math.PI / 2 },
                                      { kind: 'statue', of: 'saltKnight', pose: 'kneel', x: 149.8, z, yaw: -Math.PI / 2 }]),
        { kind: 'corpse', pose: 'seated', x: 30.8, z: -27.2, yaw: 0 }, { kind: 'corpse', pose: 'lying', x: 112, y: 8, z: -26.5, yaw: 1.4 },
        { kind: 'corpse', pose: 'reaching', x: 138.3, y: 10, z: 92.2, yaw: 0 },
      ],
    },
    // Chapter 9 (v7.42.0; LORE.md 10e): Thrale's gaol among the stars.
    'night-gaol': {
      npcs: [{ x: 8, z: -1.2, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'night-landing',
        lines: [
          'There is no ground under this place. Only the sky, and the cells hung in it like lanterns.',
          'The song says Thrale had a bell too, once. Someone rang it without leave, and they shut her up here for it.',
          'The prisoners still wear their chains. The doors fell open long ago. Nobody came to tell them.',
          'Mind the bridges. There is nothing at the sides of them, not even wind.',
          'My father used to say you can tell a bellwright by the hands. I should like to see hers.',
          'Go on. I\'ll keep the fire. It\'s the only warm thing up here.',
        ],
        idle: 'The stars are very close here. I keep wanting to reach one down.' }],
      inscriptions: [
        { id: 'l9-seal', x: 11, z: 4.5, yaw: -Math.PI / 2, mount: 'floor', label: 'Seal on the landing',
          lines: ['"Rang without leave. Kept without end."'] },
        { id: 'l9-cell', x: 92.4, y: 6, z: -6.5, yaw: -Math.PI / 2, mount: 'floor', label: 'Scratched in a cell\'s floor',
          lines: ['"The door is open. Where would we go?"'] },
        { id: 'l9-ring', x: 138.6, y: 12, z: 67.5, yaw: Math.PI / 2, mount: 'floor', label: 'Cut before the great ring',
          lines: ['"Here is kept the Ringer of Thrale, until the crown forgives."', 'Someone has scratched beneath it: "It forgot."'] },
      ],
      scenes: [
        { kind: 'candle', x: 1.6, z: 5.6 },
        { kind: 'shackles', x: 33.5, z: -7 }, { kind: 'shackles', x: 91, y: 6, z: 7 }, { kind: 'shackles', x: 97.5, y: 12, z: 73 },
        { kind: 'shackles', x: 176, y: 12, z: 85.2 },   // the ring's wall-iron, long open; she drags the rest of her chain
        { kind: 'corpse', pose: 'seated', x: 48.2, z: 6.8, yaw: -Math.PI / 2 },
      ],
    },
    // Chapter 10 (v7.44.0; LORE.md 10f): Thrale's capital, still gold.
    aurel: {
      npcs: [{ x: 11.5, z: -1.2, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'aurel-gate',
        lines: [
          'Aurel. My mother sang it as a word for gold. I thought it was only a word.',
          'They are all smiling. Every one of them. Nobody here has been hungry in a very long time.',
          'Don\'t let them come close. The gold is on their hands, and so are the knives.',
          'The song has a steward in it, left to keep the city until the king came home. The king never came. He kept it anyway.',
          'Something grows up out of the chasm, under the throne. It is warm to stand near. I didn\'t like it.',
          'Go on. I\'ll keep the fire. I\'d rather they didn\'t look at me.',
        ],
        idle: 'Everything here is gilded. Even the bread, I think.' }],
      inscriptions: [
        { id: 'l10-gate', x: 11, z: 4.5, yaw: -Math.PI / 2, mount: 'floor', label: 'Cut in the city gate\'s floor',
          lines: ['"Aurel keeps. Aurel is kept."'] },
        { id: 'l10-fountain', x: 86, z: -4.5, yaw: -Math.PI / 2, mount: 'floor', label: 'On the fountain\'s step',
          lines: ['"In Aurel none go hungry."'] },
        { id: 'l10-throne', x: 152.15, y: 10, z: 50, yaw: Math.PI / 2, mount: 'wall', label: 'Over the throne gate',
          lines: ['"Hollis, steward of the crown, keeps the city until the king comes home."'] },
      ],
      scenes: [
        { kind: 'candle', x: 14.6, z: 5.5 }, { kind: 'sacks', x: 72, z: 16.5, yaw: 0.4 }, { kind: 'crates', x: 107, z: -17.2, yaw: 0.2 },
        { kind: 'corpse', pose: 'lying', x: 118, z: 2.4, yaw: 2.2 },   // the one at the stair's foot who stopped smiling
      ],
    },
    // Chapter 11 (v7.46.0; LORE.md 10g): the same city, burning.
    'aurel-in-ash': {
      npcs: [{ x: 10, z: -1.2, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'cinder-gate',
        lines: [
          'It is the same city. I know that street. I walked it yesterday, and it was gold.',
          'The steward is dead, and the city would not be kept without him. So it burns.',
          'There were people in those streets. They are still walking. Don\'t look at their faces.',
          'The song says the first crown was laid under the throne with the king still wearing it. It never says what he waits for.',
          'Corvel burned like this. I watched it from a castle window. You watch it as though you had seen it before.',
          'Go on. I\'ll keep the fire. It is the only one here that is ours.',
        ],
        idle: 'The ash is warm. It is still falling.' }],
      inscriptions: [
        { id: 'l11-gate', x: 6, z: 3.2, yaw: -Math.PI / 2, mount: 'floor', label: 'Under the ash, in the gate\'s floor',
          lines: ['"Aurel keeps. Aurel is kept."', 'Someone has written beneath it in soot: "What it cannot keep, it burns."'] },
        { id: 'l11-yard', x: 96, z: -41.85, yaw: 0, mount: 'wall', label: 'On a lintel in the burnt yard',
          lines: ['"Oswin, first of the crowned, sleeps beneath the throne until Thrale has need of him."'] },
        { id: 'l11-throne', x: 189.85, y: 10, z: 17, yaw: -Math.PI / 2, mount: 'wall', label: 'On the throne court\'s wall',
          lines: ['"Long live the king. Long live the king. Long live the king."'] },
      ],
      scenes: [
        { kind: 'candle', x: 13, z: 3.8 }, { kind: 'corpse', pose: 'lying', x: 26, z: 3, yaw: 0.9 },
        { kind: 'corpse', pose: 'seated', x: 52, z: -5.2, yaw: 0 }, { kind: 'candle', x: 97.5, z: -41.2 },
      ],
    },
    // Chapter 12 (v7.48.0; LORE.md 10h): the abbey torn loose into the storm.
    'torn-abbey': {
      npcs: [{ x: 8, z: -1.2, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'abbey-landing',
        lines: [
          'This was an abbey. The song calls it the house that held the knife. I thought the knife was a way of speaking.',
          'They meant to cut it out of the earth, the thing the Seven would carry away. The earth would not let it go. It came up with it.',
          'The hill has been falling ever since, very slowly. Mind the floors. They are older than the storm.',
          'The brothers are still here, and still have their hooks. I don\'t think they know any more what they are cutting.',
          'The abbess held the knife. The song never says she put it down.',
          'Go on. I\'ll keep the fire. Something is pulling at these stones from underneath.',
        ],
        idle: 'The storm never moves off. It has sat on this hill since the hill came loose.' }],
      inscriptions: [
        { id: 'l12-colonnade', x: 82.5, y: 8, z: -2, yaw: Math.PI / 2, mount: 'floor', label: 'Cut in the colonnade\'s floor',
          lines: ['"Cut it out, and Thrale is whole."'] },
        { id: 'l12-terrace', x: 144, y: 8, z: 3.85, yaw: Math.PI, mount: 'wall', label: 'On the terrace wall',
          lines: ['"The root goes down further than the hill. Cut deeper."', 'Beneath it, in another hand: "Mother, it is coming up with us."'] },
        { id: 'l12-nave', x: 240, y: 16, z: 1.5, yaw: -Math.PI / 2, mount: 'floor', label: 'In the nave landing\'s floor',
          lines: ['"Agathe, abbess, who held the knife. She did not let go."'] },
      ],
      scenes: [
        { kind: 'corpse', pose: 'seated', x: 13, z: -6.4, yaw: Math.PI }, { kind: 'corpse', pose: 'lying', x: 236, y: 16, z: 5, yaw: 1.6 },
        { kind: 'candle', x: 233.5, y: 16, z: -7.2 },
      ],
    },
    // Chapter 13 (v7.50.0; LORE.md 10i): inside the Ember's first growth.
    'ember-root': {
      npcs: [{ x: 8, z: -1.2, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'root-first',
        lines: [
          'The song stops at the abbey. After it there is one word, under. I think this is under.',
          'The wood is warm. Put your hand to it and it beats, a little, like something asleep.',
          'The ones grown into the walls were people once. The wood took them in, and I don\'t think they fought it.',
          'It was never a fire. A fire is only what a root looks like when it is burning.',
          'If the root dies, what it holds goes cold. I don\'t know how much it holds. Go on anyway.',
          'I\'ll keep the fire. It is the only one down here that isn\'t hungry.',
        ],
        idle: 'The little bell is cast. I\'ll ring it when there is water to ring it over.' }],
      inscriptions: [
        { id: 'l13-ember', x: 47, z: 4, yaw: Math.PI / 2, mount: 'floor', label: 'Cut in the ember hollow\'s floor',
          lines: ['"Seven came down with lamps. Seven went up. They carried one coal more than they brought."'] },
        { id: 'l13-amber', x: 110, y: 8, z: 46, yaw: Math.PI, mount: 'floor', label: 'In the amber hollow\'s floor',
          lines: ['"Let no one of us carry it alone."', 'Beneath it, in another hand: "We took it so that no one would."'] },
        { id: 'l13-last', x: 160, y: 16, z: 88, yaw: -Math.PI / 2, mount: 'floor', label: 'In the last hollow\'s floor',
          lines: ['"It was a root before it was a king. It will be a root after."'] },
      ],
      scenes: [
        { kind: 'corpse', pose: 'seated', x: 13, z: -6.4, yaw: Math.PI }, { kind: 'corpse', pose: 'lying', x: 158, y: 16, z: 80, yaw: 1.6 },
        { kind: 'candle', x: 152.5, y: 16, z: 90.5 },
      ],
    },
    // Chapter 14 (v7.51.0; LORE.md 10j): the one water in Thrale that never burned.
    'still-mere': {
      npcs: [{ x: 8, y: 24, z: -1.2, yaw: -Math.PI / 2, pose: 'stand', bonfire: 'mere-bough',
        lines: [
          'The songs end here. The last verse is only a lake, and a tree with no colour in it.',
          'Nothing has ever burned here. Feel the cold. It is the first clean thing in Thrale.',
          'You carry it, don\'t you. I can see the light through your fingers. It is smaller than I thought.',
          'Someone waits on the ice. I saw them from the bough. They stand the way you stand.',
          'Whatever it wears, it is not you. You were only ever lent to it.',
          'Go down. When it is done, I\'ll ring the bell over the water.',
        ],
        idle: 'The bell is cold in my hands. Good. Let it be cold.' }],
      inscriptions: [
        { id: 'l14-fork', x: 51, y: 24, z: 4, yaw: Math.PI / 2, mount: 'floor', label: 'Cut in the bough fork\'s bark',
          lines: ['"Here the fire came, and went no further."'] },
        { id: 'l14-yard', x: 96, z: -42.5, yaw: Math.PI, mount: 'floor', label: 'In the shore yard\'s stones',
          lines: ['"We walked into the water so it would have nothing left to hold."', 'Beneath it, in another hand: "It is cold. It is clean. Come in."'] },
        { id: 'l14-shore', x: 194, z: -54, yaw: -Math.PI / 2, mount: 'floor', label: 'In the shore\'s stones',
          lines: ['"What the fire took, it keeps. What it keeps, it wears."'] },
      ],
      scenes: [
        { kind: 'corpse', pose: 'seated', x: 13, y: 24, z: -6.4, yaw: Math.PI }, { kind: 'corpse', pose: 'lying', x: 192, z: -38, yaw: 1.6 },
        { kind: 'candle', x: 187.5, z: -56.5 },
      ],
    },
  },
};
