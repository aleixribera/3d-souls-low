# The Seven

| | |
| --- | --- |
| Id | `the-seven` |
| Rarity | Story (scarf crimson `#b3262e`, oath gold `#e8c46a`), 1 level, never offered in a pick |
| Kind | Key 3, Summon, kept for good |
| Trigger | `press`: key 3 with its charge full (24 points) |
| Origin | New |
| Given | Chapter 6, The Church in the Pass, the painted faces |

## Card

**The Seven rise and strike the boss.** (7 words, 35 chars)

- Icon (48×48 line drawing): seven small hooded shapes in a ring seen from above, each a plain oval face with two dots, one open hand drawn at the ring's centre.
- Hover loop (2.0 s): the key cap "3" lights crimson (0.2 s); seven hooded figures rise in a ring round a boss silhouette (0.4 s); they strike one after another, a gold ring off each palm, going round the circle (0.8 s); all seven raise their palms, then strike together, the brighter frame (0.3 s); they fade upward (0.3 s).

## Idea

In the log church in the pass, the founders painted their own faces on the wall. Pressed, seven tall hooded figures of gold light rise in a ring round the boss, each wearing one of those flat painted faces, and strike it with open hands one after another, going round the circle, then raise their palms together and strike all at once. They carry no weapons: an open hand was their oath. It is the biggest summon in the game, a ring of seven, and its last beat is a moment the whole party sees coming.

## Where it's given

The first time the player walks before the church wall where the seven faces are painted, the faces turn, slowly, to follow them, and a faint gold light rises in their painted eyes. The key 3 cap lights crimson with the ability's name, already full, as the player passes the last face. Nothing pauses, the camera stays free and no one speaks; the faces keep watching the player for as long as they stay in the church, and go still when they leave.

## Data

```js
{ id: 'the-seven', name: 'The Seven', rarity: 'story', key: 'summon',
  story: { chapter: 6, place: 'The Church in the Pass, the painted faces' },
  text: 'The Seven rise and strike the boss.',
  power: { when: 'press', then: 'seven' },
  levels: [
    { charge: 24, time: 9, every: 1, damage: 24, draw: 3 },
  ] },
```

Numbers: nine beats, one every `every` s: beats 1-7 each founder in turn (7 × 24 = 168), beat 8 they gather (no blow: the party's cue), beat 9 all together, one blow of `damage` × `CONFIG.abilities.powers.seven.together` (3) = 72. So 240 a press for 24 points, 10 a point, plus the first 3 s of the boss's attention drawn off the holder (a free string, about 60-90). Key 3 fills every 20-25 s: three or four presses a fight, 720-960 on the boss plus the draws. Over the floor (8.4), never a fight won by it.

## Engine work

- New `press/seven`: `['charge', 'time', 'every', 'damage', 'draw']`, a summon of a new kind, `seven`, in `ON_ENEMY`. It is the holder's one summon while out (the slot rule: another kind's call waits).
- Seven figures, not one body: they stand in a ring `CONFIG.abilities.summons.seven = { gap: 2.4, count: 7, height: 2.6, rises: true }` round the enemy's body, evenly spaced, the first opposite the holder; they rise where they stand (no run) and turn with the enemy, keeping the ring.
- Beats: beat n falls at 0.6 s (the pose) + `CONFIG.abilities.summons.arrive` + (n - 1) × `every` after the press (1.3 s, 2.3 s, ... 9.3 s); beat n ≤ `count` is founder n striking (`damage`, a power's blow: it never counts toward `hits`, a counter or a crack, and sets off no power); beat `count` + 1 is the gather; beat `count` + 2 is the together blow (`damage` × `together`). `time` must equal `every` × (`count` + 2); `validate.js` checks it, and that `draw` ≤ `time`.
- Draw: for `draw` s the enemy fights the founder it faces (the decoy rule the twin's draw uses), a body of `height` m.
- Given by the level as Scarlet Draw is: `giveAbility: { id: 'the-seven', trigger: [...] }` along the painted wall (`js/levels/the-church.js`); the faces' turning is a lore `scene` that plays for the player near it.
- `validate.js`: `seven` needs every number above, `damage` and `draw` set.

## Multiplayer

The press is checked by the server as every press is; it raises the ring and resolves every beat and the draw on its own enemy. Founders strike enemies only, have no collision with players and revive no one; the draw only takes the boss's attention for 3 s, which spares whichever player it was on. Played together, each player is given it at the wall and holds their own ring; two rings on one boss stand at different `gap`s (2.4 and 3.4 m) so they never stand inside each other.

## Model

`tools/blender/seven_founder.py`: one figure, used seven times. A tall hooded figure 2.6 m high in a long plain robe that ends in a ragged hem instead of feet, both hands bare and open, no weapon. The face is a flat oval panel set in the hood, painted in a simple folk style: round eyes, straight brows, a line for a mouth, two red cheek marks; the seven faces differ only by small marks (a beard line, a braid, a scar, a lined brow, round spectacles of paint, a younger face, an older one), all on one 7-tile face atlas chosen per figure. About 1.5k triangles. Material: the robe is emissive oath gold with dark ink fold lines and a crimson lining showing at the hood and sleeves; the face panel is unlit painted wood colour so it reads as paint, not light. Rig: root, spine, head and two arms (upper, fore, hand), the same bones on all seven. Animations: `rise` (up out of the floor from the hem, a seam of gold climbing, 0.7 s), `idle` (a slow hover, the hem rippling), `strike` (one open palm thrust, 0.35 s), `gather` (both palms raised high, 0.8 s), `together` (both palms driven in, 0.3 s), `fade` (dissolving upward into gold motes from the hem, 0.8 s). Baked to `js/baked/`; fourteen in the pool (two rings), warmed at load. Seen in the game round a boss before it ships.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.60 | Anticipation | Upper-body pose: the holder's off hand raised, palm open toward the boss, held; seven small gold marks light in a ring on the floor round the boss, one after another; the world dims 20% | `#e8c46a` marks |
| 0.60-1.30 | Rise | The seven founders rise from their marks, hem first, a seam of gold climbing each; their painted faces come up last, already turned to the boss | `#e8c46a` robe, `#b3262e` lining, `#0b0b0f` ink folds |
| 1.30-7.30 | In turn | Every second one founder strikes, going round the ring: an open palm thrust and a flat gold shock ring off the palm into the boss, 10 hard sparks, the struck founder's face lit a moment | `#e8c46a` ring, `#fff3dc` sparks |
| 8.30 | Gather | All seven raise both palms; a thin gold line joins their hands round the ring and tightens | `#e8c46a` line |
| 9.30 | Peak (together) | All seven palms drive in; seven shock rings converge on the boss and meet in one gold burst of 40 shards. **The impact frame**, ink and white with gold and crimson kept | `#fff3dc` burst, `#e8c46a` rings, `#b3262e` shard edges |
| 9.30-10.30 | Fade | The founders dissolve upward into gold motes, faces last | `#e8c46a` to transparent |

Budget (Story class): 7 founder models + 5 pooled meshes (floor mark ring, shock ring reused, gather line, burst, seam card) = 12 meshes, 10 sparks a strike + 40 at the burst + 50 motes at the fade = 100 particles alive at most (55 on Normal), 2 effect lights (a steady warm light at the ring's centre for the whole 9 s, never pulsing per strike; the burst's; × 0.65 on Normal), 1 ribbon (the gather line), 1 impact frame at t = 9.30. Peak 0.3 s at the burst; the in-turn strikes are one a second, at summon weight. The founders stand 2.4 m off the boss's body, and any founder within 1.5 m of its weapon during a wind-up goes 50% translucent. Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

New `abilitySeven`: the rise is a low choir drone (sine partials at 98, 147 and 196 Hz, swelling 0.7 s) with a wooden creak under it (a short low-passed noise grain, 0.2 s). Each strike in turn is a hand clap (white noise burst, band-passed at 1.2 kHz, 30 ms) over a soft frame-drum hit (sine 90 to 60 Hz, 0.2 s) and one note of a rising seven-note scale (196, 220, 247, 262, 294, 330, 370 Hz, 0.5 s each), so the ring plays a climbing tune. The gather holds the seventh note; the together blow is all seven notes at once as a chord with a heavy clap and a deep boom (sine 50 to 32 Hz, 0.8 s). Tail: the chord fading with long reverb (2 s).

## Camera

`CONFIG.camera.feel.powers.seven = [3.0, 0.12]` at the together blow; `draw = [1.2, 0.03]` kept at the rise. No kick for the strikes in turn.

## Images

- `img/the-seven-1.webp`: seven tall hooded figures with flat painted folk-art faces and robes of ember-gold light rising in a ring around a boss in the snow, raising open palms.
- `img/the-seven-2.webp`: a dark log church in a snowy mountain pass with seven painted faces on its wall, faintly glowing.
- `img/the-seven-3.webp`: the Seven striking all together, seven golden open-hand shock rings converging on the boss.
