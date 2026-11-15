# Light Step

| | |
| --- | --- |
| Id | `light-step` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Mods (a plain number) |
| Trigger | None: always on (no `when`; raises the `dashRefill` mod) |
| Origin | Kept from js/data/abilities.js: same numbers and text; gains `plain: true`, the refill chime and the heel feather. |

## Card

**Dashes refill {dashRefill} faster.** (4 words, 23 chars; level I reads "Dashes refill 12% faster.")

- Icon (48×48 line drawing): keep the current `ABILITY_ICONS['light-step']`, a feather with two speed strokes.
- Hover loop (1.5 s): one stroke: three short bars, the last one empty (0.2 s), it refills (0.5 s) and a small feather stroke flicks off below it (0.3 s); hold, fade.

## Idea

Faster dash refill: the newcomer's favourite, because every dash is a mistake you get to undo. Three charges come back one at a time over 1.3 s each; this makes the wait shorter. Its touch tells you the moment a charge is back without looking at the HUD: a soft chime, and a single feather of bone ink flicks off the heel.

## Data

```js
{ id: 'light-step', name: 'Light Step', rarity: 'common', plain: true,
  text: 'Dashes refill {dashRefill} faster.', mods: true,
  levels: [{ dashRefill: 0.12 }, { dashRefill: 0.24 }, { dashRefill: 0.36 }, { dashRefill: 0.48 }] },
```

Numbers: a charge comes back in 1.3 s; level I makes it 1.16 s, level IV 0.88 s. Under pressure that is about one extra dash 11 s at level I and about every 3 s at level IV. It never adds a fourth charge, so it softens mistakes without making the dash endless (Last Breath, a rare, does that).

## Engine work

- None for the number: `dashRefill` is an existing `ABILITY_MODS` key (`Player` refill, js/player.js).
- `plain: true`: the shared rule (offer weight, validate.js check), as Keen Edge.
- The chime and feather: the `Player` emits a new `dashReady` event `{ body }` when `dashes` crosses a whole number upward (drawing and audio listen; it never changes state). Played only while the holder has the mod, so a plain player's dash stays silent.

## Multiplayer

Unchanged: each client owns its own movement and dash charges. The feather is drawn by every browser from the holder's pose (it reads their kit); the chime is the holder's alone. It touches no teammate.

## Effect

Layered, timed from each `dashReady` (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Feather | One flat ink-feather stroke flicks from the back heel, a curved blade of ink with a white spine, dark outline | `#cfc8b6` body, `#f4f1e8` spine, `#16130f` outline |
| 0.00-0.30 | Flick | It lifts 0.4 m back and up, turning half a turn, scaling 1.0 to 0.6 | as above |
| 0.20-0.45 | Fade | It fades out | to transparent |

Budget (Common class): 1 pooled mesh (a small pool of 3 feathers so three charges never wait), 0 particles, no light, no ribbon, no impact frame. Peak 0.3 s. Reduced motion: the feather fades in place without turning.

## Sound

`abilityChime` (new, in `js/data/audio.js`): a soft transient tick (high-passed noise at 6 kHz, 10 ms), a body of a small chime (sine 1320 Hz with a 2.76× partial, decaying 0.15 s), no tail. Quiet (vel 0.35), the holder's only. A charge returns at most once every 0.88 s, so it never rings as a run.

## Camera

No camera kick: commons never take one.

## Images

- `img/light-step-1.webp`: the swordsman landing from a dash, three slim white bars of light at their feet refilling, a single ink-brush feather flicking off the heel.
