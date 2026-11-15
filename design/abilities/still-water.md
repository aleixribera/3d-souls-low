# Still Water

| | |
| --- | --- |
| Id | `still-water` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (16, 15, 14 points) |
| Origin | New |

## Card

**A pool heals {heal} over {time}.** (6 words, 22 chars)

- Icon (48×48 line drawing): a flat ellipse on a floor line with two inner rings and a small droplet falling into its centre.
- Hover loop (1.8 s): the key 2 square lights (0.2 s); a mirror-still pool spreads from a small figure's feet (0.3 s); slow rings cross it while the figure's bar climbs steadily (1.0 s); a second figure steps in at the edge and its bar climbs a little; fade.

## Idea

A pool of still water spreads on the floor; standing in it heals you over a few seconds, and a friend who steps in heals a little too. It is the slow, generous heal: more than Mending in total, but it asks you to hold your ground in one place while the boss is still swinging, so it rewards pressing it in a boss's quiet moment.

## Data

```js
{ id: 'still-water', name: 'Still Water', rarity: 'rare', key: 'guard',
  text: 'A pool heals {heal} over {time}.',
  perk: { when: 'press', then: 'pool' },
  levels: [
    { charge: 16, time: 5, heal: 0.25, radius: 2.5 },
    { charge: 15, time: 5, heal: 0.3, radius: 2.7 },
    { charge: 14, time: 5, heal: 0.35, radius: 2.9 },
  ] },
```

Numbers: 25-35% of the bar over 5 s is 30-42 health, a little more than Mending's 24-36 at a slightly higher charge, but only for the time spent inside a 2.5-2.9 m circle. 16 points at 1-1.4 a second is a pool every 12-16 s. A teammate inside heals at a third of the rate (`CONFIG.abilities.shared.pool` 0.33): at most 8-12% of their own bar over the 5 s.

## Engine work

- New perk `press/pool` in `ABILITY_PERKS` (`['charge', 'time', 'heal', 'radius']`). Though a perk, it is placed in the world: on the press the pool is fixed at the holder's feet for `time` s (it does not follow them).
- A shared list of live pools (`{ holder, x, y, z, radius, rate, until }`, a fixed pool of 4, one a player). Each step, a body standing inside one (within `radius` m and its floor's height) heals `heal / time` of its bar per s (its holder) or `× CONFIG.abilities.shared.pool` of that (anyone else). Stepping out pauses the heal; the time runs on. Two pools on one body never add: the best one counts.
- `CONFIG.abilities.shared: { pool: 0.33 }`.
- `validate.js`: `press/pool` needs `charge`, `time`, `heal` (a share, at most 1), `radius`; `shared.pool` from 0 to 1.

## Multiplayer

The press is claimed like every press, and the server tells every browser the pool's place, `radius`, rate and `time` (`abilityPerk` `perk: 'press/pool'`, the shared guard perk). Each browser heals its own body while it stands inside (each client owns its health), and the server checks that heal against the pools it knows. The shared benefit, its size stated: a teammate inside heals one third of the holder's rate, 8-12% of their bar over 5 s at most, and nothing else. The pool has no collision and never slows, pushes or moves anyone.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.35 | Spread | A flat disc of water spreads from the feet to `radius` with a hard foam-white rim and an ink outline; its face is a dark mirror holding a dim reflection of the sky, blue light glowing up from under it | `#0b1a2a` face, `#8fb8dc` glow, `#f2f6fa` rim, `#0b0d12` outline |
| 0.35-`time` | Still | Slow hard rings spread across it from the centre, one every 0.8 s; each body inside sends small rings from its feet as it moves | `#8fb8dc` rings |
| 0.35-`time` | Rise | 2 droplets a second rise from it round each body healing, falling back as small splashes | `#f2f6fa` |
| last 0.8 s | Ebb | The rim thins and the glow sinks so the end is readable | to `#2c5f8a` |
| `time`-+0.4 | Dry | The disc shrinks to its centre and goes | to transparent |

Budget (Rare class): 3 pooled meshes (disc, ring sheet, rim) + droplets (at most 20 alive with four bodies inside; 11 on Normal), 1 effect light (blue, low, steady from under the pool, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.35 s; it holds `time`. The disc is a decal drawn on the floor, cheap at any size. Reduced motion: the rings spread at half speed.

## Sound

`abilityPool` (new, in `js/data/audio.js`): a transient of one drop falling into still water (sine 1200 Hz gliding down to 600 Hz in 40 ms, plus a 60 ms band-passed noise splash at 2 kHz), a body of a soft held water tone (sine 330 Hz with a 1.5 partial, low gain, held while the holder is inside), a tail as it dries (the tone fading over 0.4 s). Each ring a faint drip (sine 900 Hz, 0.1 s, very low).

## Camera

No new entry: a heal is not a hit; the perk kick plays on the press.

## Images

- `img/still-water-1.webp`: a mirror-still circle of glowing blue water spreading on a dark stone floor around the swordsman, slow rings, a reflection of the sky in it.
