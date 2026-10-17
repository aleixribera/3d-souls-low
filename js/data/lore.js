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
  // The ending cards (js/finale.js), one after another before the credits (LORE.md, section 9).
  ending: [
    'Aldric, the Ember-Crowned, is ash. The Ember gutters in the cinders where he stood, and goes out.',
    'The bell that called him out tolls once more, by no one\'s hand, and then falls silent.',
    'His keys lie in the ash: every cell of the Long Hall and the Sunken Keep. No one will be thrown into that dark again.',
    'And over Ashmere, for the first time in years, the ash stops falling.',
    'Down by the river, someone is ringing something small.',
  ],
  npc: { id: 'ysolde', name: 'Ysolde of Corvel', model: 'ysolde', scale: 0.96, bulk: 0.94 },
  levels: {
    'long-hall': {
      npcs: [{ x: 8, z: 7.2, yaw: Math.PI, pose: 'stand', solid: [6.5, 9.5, 5.85, 8.6], bars: [6.6, 5.95, 9.4, 5.95],
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
  },
};
