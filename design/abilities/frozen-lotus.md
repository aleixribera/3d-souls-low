# Frozen Lotus

| | |
| --- | --- |
| Id | `frozen-lotus` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (42 points) |
| Origin | New |

## Card

**Ice spears the boss for {time}.** (6 words, 26 chars)

- Icon (48×48 line drawing): a lotus of six pointed petals seen from the side, two petals stabbing up taller than the rest.
- Hover loop (2.0 s): key cap "4" lights (0.2 s); a frost ring spreads under a boss silhouette (0.3 s); a lotus opens under it and petals spear up through it one by one, one brighter frame on the first (0.9 s); the flower shatters into shards (0.4 s); fade.

## Idea

An enormous lotus of ice blooms under the boss, and its petals spear up through it one after another for three seconds, holding it where it stands; then the whole flower shatters. It is the slow, beautiful Ultimate: a long pin and a steady burn, the boss framed in a flower of ice while you work round it. Ember light caught in the ice keeps it in the legendary colour.

## Data

```js
{ id: 'frozen-lotus', name: 'Frozen Lotus', rarity: 'legendary', key: 'ultimate',
  text: 'Ice spears the boss for {time}.',
  power: { when: 'press', then: 'iceLotus' },
  levels: [
    { charge: 42, time: 3, every: 0.3, damage: 36 },
  ] },
```

Numbers: 3 / 0.3 = 10 petals of 36 = 360 for 42 points, 8.6 a point, on the dragon's floor; the pin is 3 s (the longest in the pool), worth a light string and a heavy finisher or a free heal, about 80-100 more. About 720-1080 a fight plus the pin's openings.

## Engine work

- New `press/iceLotus`: `['charge', 'time', 'every', 'damage']`, in `ON_ENEMY`; a `running` entry like `blades`, first petal 0.45 s after the press, then every `every` s.
- The pin (shared with Heaven's Lance): the target's `rooted` timer set to `time` from the first petal; it can't move, lunge, leap or be pushed, turns at half speed, and its attacks swing in place with their own tells. The shared hold rest (`CONFIG.abilities.holdRest`, 3 s) applies.
- The lotus: a Blender model, `tools/blender/ice_lotus.py`: a flower 7 m across of twelve faceted petals in two rings, each petal its own bone so it can spear up (a 4 m thrust) and fall back; a translucent ice material with ember-lit facet edges. Baked to `js/baked/`.
- `validate.js`: `iceLotus` needs its four numbers; `time / every` a whole number.

## Multiplayer

The server resolves the petals and runs the pin on its own enemy. Enemies only; a teammate standing on the flower is untouched and sees petals pass through them. One holder per team.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Anticipation | Upper-body pose: the blade's point lowered to the floor, the off hand flat over it; the world dims 20%; a line of frost runs from the point to the boss | `#cfe8f5` frost |
| 0.20-0.45 | Bloom | A frost ring spreads under the boss, then the lotus opens out of it, petals unfolding flat; frost fog rolls off its edges | `#cfe8f5` ice, `#5f8fb0` depth, `#e59a5c` facet edges, `#0b0b0f` ink |
| 0.45 | Peak (first petal) | The first inner petal spears up through the boss, 4 m; a burst of 20 ice shards. **The impact frame** | `#ffffff` core, `#cfe8f5`, `#e59a5c` edges |
| 0.75-3.15 | Petals | Every 0.3 s another petal spears up from a new angle and the last one sinks back, so three stand at once; each throws 8 shards and catches ember light | as above |
| 3.15-3.55 | Shatter | The whole flower cracks along its facets and bursts into glittering shards, the ember light refracting through them | `#ffffff`, `#cfe8f5`, `#e59a5c` glints |
| 3.55-4.20 | Fade | Shards fall and melt to a dark wet ring; the fog thins | `#5f8fb0` to transparent |

Budget (Legendary class): 6 pooled meshes (frost line, frost ring, lotus model, fog sheet, shatter shard sheet, wet ring) + 20 + 10 × 8 + 50 shatter shards = 150 particles at most over the effect, never more than 110 alive at once (61 on Normal), 2 effect lights (cold blue inside the flower, ember on the petal facets; × 0.65 on Normal), no ribbon, 1 impact frame at t = 0.45. Peak 2.7 s (0.45-3.15). The petals stand behind and beside the boss; a petal never rises in front of its weapon during a wind-up (the petal angle skips that side). Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

New `abilityLotus`: a creaking freeze as it blooms (band-passed noise 2-6 kHz with sharp crackles, 0.3 s) and a glassy bell chord (sine partials at 1, 2.76 and 5.4 over 880 Hz, 1.5 s decay); each petal a sharp ice spike (white noise at 4 kHz, 20 ms, over a short low crunch at 180 Hz, 80 ms), pitch rising a semitone each; the shatter a cascade of glass (many short high bandpassed clicks over 0.5 s) and a deep crack (sine 60 Hz, 0.3 s).

## Camera

`CONFIG.camera.feel.powers.iceLotus = [-2.2, 0.06]` at the first petal, and `lotusBreak = [1.4, 0.04]` at the shatter. No kick on the petals between.

## Images

- `img/frozen-lotus-1.webp`: an enormous translucent ice lotus with ember-lit edges blooming under a boss, its petals spearing up through it one after another, frost fog.
- `img/frozen-lotus-2.webp`: the ice lotus shattering into thousands of glittering shards around the boss, ember light refracting.
