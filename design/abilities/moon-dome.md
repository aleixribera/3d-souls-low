# Moon Dome

| | |
| --- | --- |
| Id | `moon-dome` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (16, 15, 14 points) |
| Origin | New |

## Card

**A dome stops shots and blasts for {time}.** (8 words, 36 chars)

- Icon (48×48 line drawing): a half circle over a floor line with two thin crescent arcs inside it, three short arrows breaking against its outside.
- Hover loop (1.8 s): the key 2 square lights (0.2 s); a pale dome rises over a small figure (0.3 s); a volley of shots and a ring of fire hit it and break in ripples on its skin (0.9 s) while the figure inside stands untouched; the dome fades; fade.

## Idea

A pale dome of moonlight rises where you stand and holds for a few seconds: shots and area blasts from outside break on its skin. It is the answer to the bosses that rain projectiles or flood the floor with fire, and the guard's one co-op shelter: a friend who steps in with you is covered too. It never stops a blow from a boss that walks inside, so it is a place to stand, not a wall to hide behind.

## Data

```js
{ id: 'moon-dome', name: 'Moon Dome', rarity: 'rare', key: 'guard',
  text: 'A dome stops shots and blasts for {time}.',
  perk: { when: 'press', then: 'dome' },
  levels: [
    { charge: 16, time: 4, radius: 3 },
    { charge: 15, time: 4.5, radius: 3.2 },
    { charge: 14, time: 5, radius: 3.4 },
  ] },
```

Numbers: 4-5 s covers one shot volley or one area pattern; bosses mix those with melee, so the dome blanks a third to a half of what a ranged phase throws. 16 points at 1-1.4 a second is a dome every 12-16 s, rarer than the single-blow guards because it can cover a friend. A radius of 3-3.4 m holds the holder and one or two friends standing close.

## Engine work

- New perk `press/dome` in `ABILITY_PERKS` (`['charge', 'time', 'radius']`). Though a perk, it is placed in the world: on the press the dome is fixed at the holder's feet (it does not follow them) for `time` s.
- A shared list of live domes (`{ holder, x, y, z, radius, until }`, a fixed pool of 4, one a player) that the combat code reads.
- A shot (js/projectiles.js) whose path crosses a dome's surface from outside stops there (the `boltStopped` event, drawn as a ripple).
- An area hit (an attack box at least `CONFIG.aggro.areaWidth` m wide, a ring, an `impact`, a wall of fire or a ground area mark) does not land on a body inside a dome when the hit's origin (its owner's body, or the impact's centre) is outside that dome. Melee blows from an enemy body, inside or outside, land as normal.
- `validate.js`: `press/dome` needs `charge`, `time`, `radius`.

## Multiplayer

The press is claimed like every press, and the server tells every browser (a dome is the one guard perk shared with the party): `abilityPerk` with `perk: 'press/dome'`, the holder, its place, `radius` and `time`. Each browser drops the area hits on its own body that the dome covers (each client owns its health); the server, which owns the shots, stops them at the dome's skin so every screen sees the same ripple. The shared benefit, its size stated: a teammate standing inside the dome's 3-3.4 m radius gets the same shelter from shots and area blasts for the dome's 4-5 s, nothing more (no heal, no buff, no stop to melee). The dome never moves, slows or pushes anyone and has no collision: bodies walk in and out freely. Domes from two players don't stack on a body; being inside one is enough.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Rise | A half-sphere of pale light grows up from a ring on the floor to `radius`; its skin is flat, 2-tone, with four thin crescent-moon lines drawn on it in brush ink, a hard bright rim where it meets the floor | `#cfe4f2` skin at 20%, `#8fb8dc` rim and crescents, `#0b0d12` ink |
| 0.30-`time` | Hold | The crescents turn slowly round the dome; 12 slow motes rise inside it | `#8fb8dc`, `#f2f6fa` motes |
| each stop | Ripple | A flat ring of hard ripples spreads from where a shot or blast meets the skin, 1.4 m across, with 6 white spark streaks | `#f2f6fa` ring, `#8fb8dc` edge |
| last 0.6 s | Wane | The skin thins, the crescents fade one by one so its end is readable | to `#8fb8dc` at 10% |
| `time`-+0.3 | Set | The dome sinks into its floor ring and goes | to transparent |

Budget (Rare class): 4 pooled meshes (dome, crescent sheet, floor ring, ripple ring) + 12 motes and 6 streaks a ripple (at most 40 alive; 22 on Normal), 1 effect light (blue, low, steady while it holds, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.3 s; it holds `time`. The skin is translucent, so a boss's wind-up behind it stays readable. Reduced motion: ripples spread without the spark streaks.

## Sound

`abilityDome` (new, in `js/data/audio.js`): a rising glass swell (sine 392 Hz with 1.5 and 2.01 partials, 0.3 s attack, 1 s), a body of a soft held chord under it (sine 196 Hz, held `time` s at low gain), a tail as it sets (the chord falling a fifth, 0.4 s). Each ripple: a muffled thud (brown noise low-passed at 250 Hz, 0.15 s) and a short shimmer (sine 1318 Hz, 0.3 s), at most 4 a second.

## Camera

No new entry: a dome is not a hit; the perk kick (`perkFov`) plays for the holder on the press.

## Images

- `img/moon-dome-1.webp`: a half-sphere dome of pale blue moonlight with thin crescent lines around the swordsman, a boss's fiery blast breaking against it in ripples.
