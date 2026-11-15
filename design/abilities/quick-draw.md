# Quick Draw

| | |
| --- | --- |
| Id | `quick-draw` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points); the cut comes after a held sheathed stance |
| Origin | New |

## Card

**Sheathe, then one cut splits all in front.** (8 words, 42 chars)

- Icon (48×48 line drawing): a sheathed sword lying flat, one long straight line running from its hilt across the whole icon.
- Hover loop (2.0 s): a small figure sheathes and crouches still (0.5 s), a single straight blue-white line appears across the whole card through the boss (0.1 s), a beat of stillness (0.35 s), the line splits open with a hard blue flare (0.3 s); fade.

## Idea

A held sheathed stance, a single horizontal draw too fast to see, and a beat later the line across the world opens. The strike of stillness: the player stands exposed for half a second for the biggest hit of key 1, and the delayed cut is the game's signature.

## Data

```js
{ id: 'quick-draw', name: 'Quick Draw', rarity: 'rare', key: 'strike',
  text: 'Sheathe, then one cut splits all in front.',
  power: { when: 'press', then: 'iai' },
  levels: [
    { charge: 18, damage: 120, reach: 10 },
    { charge: 17, damage: 145, reach: 11 },
    { charge: 16, damage: 170, reach: 12 },
  ] },
```

Numbers: 6.7, 8.5 and 10.6 damage a point to every enemy on the line, the most of the line strikes, paid for by the longest charge (16-18 points) and CONFIG.abilities.iai.stance (0.5 s) standing still in front of the boss. Enemies on the line at the draw take the cut `iai.beat` (0.35 s) later wherever they have moved: the line is drawn on them.

## Engine work

- New power `press/iai`: ['charge', 'damage', 'reach'] in ABILITY_POWERS. The press starts the stance (a key pose; the holder can't move or attack); a dash or a blow taken in it cancels it and the key keeps its charge (claimed as `iaiCancel`). At the end of the stance, the draw: every enemy within `iai.width` (1.2 m) either side of a line `reach` long from the holder toward the press target is marked; `iai.beat` later each marked enemy still alive is wounded once (running entries).
- `validate.js`: CONFIG.abilities.iai { stance above 0, beat from 0 to 0.6, width above 0 }.

## Multiplayer

The browser claims the press (and the cancel); the server checks the charge, marks the line at the draw from its own copy of the holder's position and its own enemies, and wounds them after the beat. The stance holds only the holder. Enemies only: a teammate on the line sees it cross them and open harmlessly. Every browser draws it.

## Effect

Layered, timed from the press (t = 0); the draw is at d = 0.5 s:

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.50 | Stance | The player crouched still, hand on the hilt; 6 slow-falling ash flakes stop in the air round them | `#cfe2f2` |
| d | Line | One perfectly straight blue-white line across the scene, `reach` long, at chest height, hairline-thin with a white core | `#f2f6fa` core, `#8fb8dc` edge |
| d to d + 0.35 | Beat | Stillness; the line hangs, every marked enemy wearing a thin blue line across its body | as above |
| d + 0.35 | Split | The line splits open along its length into two hard edges with a short flare along it (a local flare on the line, not a screen flash) | `#f2f6fa`, `#8fb8dc`, `#0e1218` ink |
| d + 0.35 to + 0.80 | Shards | 30 hard blue-white shards thrown off the line's length; the two edges fade | `#cfe2f2` to transparent |

Budget (Rare class): 3 pooled meshes (the line, its split edges, the body cut lines as one mesh) + 36 particles (20 on Normal), 1 effect light (white-blue, 0.25 s at the split, × 0.65 on Normal), no ribbon, no impact frame (the split is a flare on the line only). Peak 0.8 s from the draw. Reduced motion: the split's flare is replaced by a 30% brighter line with no flare.

## Sound

`abilityIai` (new, in `js/data/audio.js`): in the stance, a soft scrape of the blade in the sheath (band-passed noise 2-5 kHz, 0.3 s) and then near silence; at the draw a transient of a single razor-thin whistle (sine 4 kHz with noise, 40 ms); at the split a body of a deep cleaving slash (noise band-passed 600 Hz to 3 kHz, 0.15 s, driven) over a low boom (sine 55 Hz, 0.4 s), a tail of a long ringing note (sine 880 Hz with a 2.76 partial, 1.0 s).

## Camera

`CONFIG.camera.feel.powers.iai = [-2.2, 0.05]`: a firm pull in at the split.

## Images

- `img/quick-draw-1.webp`: the swordsman frozen just after a lightning-fast sword draw, a single perfectly straight blue-white line across the whole scene through the boss, about to split.
