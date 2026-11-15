# Scarlet Draw

| | |
| --- | --- |
| Id | `scarlet-draw` |
| Rarity | Story (scarf crimson `#b3262e`, oath gold `#e8c46a`), 1 level, never offered in a pick |
| Kind | Key 1, Strike, kept for good |
| Trigger | `press`: key 1 with its charge full (14 points) |
| Origin | New |
| Given | Chapter 2, The Sunken Keep, the Seven's oath hall |

## Card

**Your scarf lashes out as a blade.** (7 words, 33 chars)

- Icon (48×48 line drawing): a hooded head and shoulders in profile, the scarf's tail streaming forward from the neck in one long S-curve that ends in a blade point.
- Hover loop (1.8 s): the key cap "1" lights crimson (0.2 s); a small figure stands still and its scarf lifts in a wind from nowhere (0.4 s); the scarf unrolls forward in an S-curve through a boss silhouette, a gold edge along it (0.3 s); the cut line hangs crimson, then opens, the brighter frame (0.2 s); the scarf curls back to the neck (0.7 s).

## Idea

The prisoner's red scarf is the one thing they woke with, and in the hall where kings swore the Oath it turns out to know something its wearer doesn't: pressed, it streams out twelve metres as a crimson ribbon blade edged in gold, draws through everything in front in one flowing S-curve, and curls back. The hands keep the sword and the shield; the scarf does the cutting. It is the first gift of the road and the plainest key-1 strike in the game, made strange by where it comes from.

## Where it's given

The first time the player crosses into the oath hall of the Sunken Keep, a wind with no source moves through the hall and lifts the red scarf, and the key 1 cap lights crimson with the ability's name under it, already full. Nothing pauses, the camera stays the player's, and no one speaks: the scarf settles and the player walks on into whatever waits in the hall. The hall's fight is the first place to press it. A player who has been here before (a load or a second run of the story) already holds it, and the wind still moves the scarf as they enter.

## Data

```js
{ id: 'scarlet-draw', name: 'Scarlet Draw', rarity: 'story', key: 'strike',
  story: { chapter: 2, place: "The Sunken Keep, the Seven's oath hall" },
  text: 'Your scarf lashes out as a blade.',
  power: { when: 'press', then: 'scarfBlade' },
  levels: [
    { charge: 14, damage: 120, reach: 12 },
  ] },
```

Numbers: 120 a press for 14 points is 8.6 a point, just over the legendary floor (Thunder Call's 8.4), and every enemy in the 12 m band takes it, not only the boss. Key 1 fills about every 14 s, so six presses in a 90 s fight: about 720 on a boss of 1600-3500 health, a quarter to a third of its bar. Strong enough to turn a fight, never to end one, which is the bar Story's four share.

## Engine work

- New `press/scarfBlade`: `['charge', 'damage', 'reach']`, in `ON_ENEMY` (aimed at the locked enemy, else the nearest within `CONFIG.abilities.press.range`; with none, straight ahead).
- The hit is a band `reach` m long and `CONFIG.abilities.powers.scarfBlade.width` = 1.6 m wide from the holder toward the target (the S-curve is the look; the band is straight), resolved as the line opens, 0.55 s after the press: `damage` to every enemy in it as a power's blow (it never counts toward `hits`, a counter or a crack, and sets off no power). The same line hit as Riptide's and Tidal Arc's `wave`.
- New rarity `story` (`CONFIG.abilities.rarity.story = { levels: 1, weight: 0 }`): never offered in a pick, never in Boss Rush. A story ability carries `story: { chapter, place }` and is given by its level (below). `validate.js`: a `story` ability names one key and a `story` with a chapter and a place, and its key has no other story ability; the key rule ("key ultimate is a legendary's, strike, guard and summon a rare's") and the power rule ("a rare or a legendary") both let a `story` ability through, and the offer-count check skips `story` (it is never offered).
- Given: a level opts in with `giveAbility: { id: 'scarlet-draw', trigger: [x0, x1, z0, z1] }` (the oath hall's entrance), run by `Game.updateLevel` like a flask find: the first time the player is inside the rectangle, the ability goes to the story save's owned list (`CONFIG.story.saveVersion` bumps for the new field) with its key's charge full, and the HUD's key cap plays its light-up. No pause, no camera, no input taken.
- Drawing: the ribbon blade is anchored at the scarf's knot on the player model; the scarf's tail mesh hides while the ribbon is out and shows again as it curls back.

## Multiplayer

The press is checked by the server as every press is (its own charge count, range); the server resolves the band on its own enemies. Enemies only: the ribbon passes through a teammate. Played together, every player in the party is given the scarf's gift when they first enter the hall, each their own, so the four keys stay per player. The wind and the scarf lifting are drawn only for the player it lifts.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.40 | Anticipation | The holder keeps moving; the scarf lifts and streams forward on a wind no one else feels; a few grey ash flakes around the holder blow the same way; the world dims 20% | `#b3262e` scarf, `#5a5550` ash |
| 0.40-0.55 | Release | The scarf unrolls into a ribbon blade 12 m long in a flowing S-curve through the target, flat crimson with a hard oath-gold edge and a black ink outline, its tip a blade point; a thin gold speed line follows the tip | `#b3262e` body, `#e8c46a` edge, `#0b0b0f` ink |
| 0.40-0.55 | Cut line | Where the ribbon passed, a straight cut line hangs in the air through every enemy in the band, glowing crimson | `#b3262e` line, `#fff3dc` core |
| 0.55 | Peak (the line opens) | The line opens; every enemy in the band takes the cut; 30 crimson and gold shards burst along it like torn cloth. **The impact frame**, two-tone ink and white with the crimson kept | `#fff3dc`, `#b3262e`, `#e8c46a` |
| 0.55-1.40 | Return | The ribbon curls back along its own S in a long flowing arc and winds onto the neck; gold threads drift off its edge | `#b3262e`, `#e8c46a` threads |
| 1.40-2.00 | Fade | The threads and shards fade; the scarf hangs still | to transparent |

Budget (Story class): 5 pooled meshes (the ribbon, cut line, shard sheet, speed line, the scarf tail's hide swap) + 30 shards + 20 gold threads + 12 ash = 62 particles (34 on Normal), 1 effect light (crimson-gold along the ribbon, steady through its 1 s out; × 0.65 on Normal), 2 ribbons (the blade and its gold speed line), 1 impact frame at t = 0.55. Peak 0.15 s. The ribbon crosses the boss at chest height and is 35% translucent within 2 m of the boss's weapon during a wind-up. Reduced motion: the impact frame becomes a 30% darken, no shake, the speed line holds still.

## Sound

New `abilityScarf`: during the anticipation a rising wind with cloth flutter in it (band-passed noise 400 Hz to 2 kHz rising over 0.4 s, amplitude-modulated at 14 Hz); at the release a long cloth whip (noise sweep 3 kHz to 600 Hz, 0.15 s) with a thin steel ring on top (sine partials at 1760 and 2640 Hz, 0.3 s); at the opening a tearing cut (white noise high-passed at 2 kHz, 40 ms) over a soft low thud (sine 80 Hz, 0.2 s). Tail: the wind dropping away (0.6 s).

## Camera

`CONFIG.camera.feel.powers.scarfBlade = [-1.6, 0.05]` at the opening. The press itself never moves the view.

## Images

- `img/scarlet-draw-1.webp`: the swordsman's red scarf unrolling into a twelve-metre crimson ribbon blade edged with ember gold, cutting through a boss in a flowing S-curve, in an ancient sunken hall.
- `img/scarlet-draw-2.webp`: close on the red scarf lifting in a wind from nowhere in a dark stone oath hall, the prisoner's face hidden.
- `img/scarlet-draw-3.webp`: the crimson ribbon blade wrapping around the boss in a spiral before tightening into the cut.
