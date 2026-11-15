# Quick Draught

| | |
| --- | --- |
| Id | `quick-draught` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Mods (a plain number) |
| Trigger | None: always on (no `when`; raises the `flaskSpeed` mod) |
| Origin | Kept from js/data/abilities.js: same numbers and text; gains `plain: true`, the flask flare and the gulp. |

## Card

**Drink flasks {flaskSpeed} faster.** (4 words, 22 chars; level I reads "Drink flasks 20% faster.")

- Icon (48×48 line drawing): keep the current `ABILITY_ICONS['quick-draught']`, a round flask with three speed lines on its left.
- Hover loop (1.3 s): one stroke: a flask tips up (0.3 s), its level drops in one quick step (0.2 s), a short smear line beside it (0.2 s); hold, fade.

## Idea

Faster flasks, kept small on purpose (Aleix: flask picks made runs too easy). A flask is drunk on the move in 0.95 s and a landed blow cuts it short, so drinking faster is drinking safer: less time slowed, fewer flasks wasted. Its touch: the flask flares warm amber for an instant and a quick gulp, so the faster drink reads as a decision, not a slower animation played fast.

## Data

```js
{ id: 'quick-draught', name: 'Quick Draught', rarity: 'common', plain: true,
  text: 'Drink flasks {flaskSpeed} faster.', mods: true,
  levels: [{ flaskSpeed: 0.2 }, { flaskSpeed: 0.35 }, { flaskSpeed: 0.5 }, { flaskSpeed: 0.6 }] },
```

Numbers: a drink takes 0.95 s; level I makes it 0.79 s, level IV 0.59 s. The heal (45) is unchanged, so it never adds health, only shortens the window a boss can punish. The levels grow by less each step (20, 15, 15, 10) so level IV stays above half the drink time.

## Engine work

- None for the number: `flaskSpeed` is an existing `ABILITY_MODS` key (`Player.drinkRate`).
- `plain: true`: the shared rule (offer weight, validate.js check), as Keen Edge.
- The flare: drawing only, on the existing `itemUsed` event for the flask when the user holds the mod.

## Multiplayer

Unchanged: each client owns its own drinking; the server sees the drinking pose (`PS.USE_ITEM`) as before. The flare is drawn by every browser on that player's flask. It touches no teammate.

## Effect

Layered, timed from the drink's start (t = 0, `itemUsed`):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.12 | Flare | A small hard-edged four-point glint sprite on the flask in the off hand (the flask has no glow of its own today), held 0.06 s, then fading | `#e8b56a` warm amber body, `#f4f1e8` core |
| 0.00-0.25 | Smear | One bone-ink motion smear arcs round the flask from hip to mouth, a flat curved stroke with a dark outline | `#cfc8b6` body, `#16130f` outline |

Budget (Common class): 2 pooled meshes (the glint sprite, the smear), 0 particles, no light, no ribbon, no impact frame. Peak 0.25 s. Reduced motion: no change needed (one glint a drink, far under 3 Hz).

## Sound

`abilityGulp` (new, in `js/data/audio.js`): a soft low transient (sine 160 Hz, 40 ms), a body of one quick swallow (band-passed noise 400 to 700 Hz, 0.12 s), no tail. Played 0.05 s after the existing `flask` sound, the holder's only.

## Camera

No camera kick: commons never take one.

## Images

- `img/quick-draught-1.webp`: the swordsman drinking from a small glowing amber flask while running, a quick bone-ink motion smear around the flask.
