# Headsman

| | |
| --- | --- |
| Id | `headsman` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Mods (a plain number) |
| Trigger | None: always on (no `when`; raises the `finisher` mod, read on the holder's Finishing Blow) |
| Origin | Kept from js/data/abilities.js: same numbers and text; gains `plain: true` and the black brush stroke. |

## Card

**Finishing Blow: {finisher} more damage.** (5 words, 30 chars; level I reads "Finishing Blow: 15% more damage.")

- Icon (48×48 line drawing): keep the current `ABILITY_ICONS['headsman']`, a long-handled axe.
- Hover loop (1.8 s): one stroke: three short cut lines appear across a shape (0.6 s), one thick brush stroke sweeps behind them (0.2 s), the cuts open (0.2 s); hold, fade.

## Idea

The Finishing Blow hits harder. It is the moment a fight is built toward (two cracks, then the third counter), so making it bigger rewards a player who plays for it. Its touch lives inside that moment: in the frozen frame where the cuts open, one thick black calligraphy stroke crosses behind them, as if the strike signed its name.

## Data

```js
{ id: 'headsman', name: 'Headsman', rarity: 'common', plain: true,
  text: 'Finishing Blow: {finisher} more damage.', mods: true,
  levels: [{ finisher: 0.15 }, { finisher: 0.3 }, { finisher: 0.45 }, { finisher: 0.6 }] },
```

Numbers: a Finishing Blow on a boss does 480 (capped at half its current bar before this mod), 1-3 a fight solo. Level I adds about 70-220 a fight, level IV about 290-860. Level IV is the strongest plain common on paper, but only for a player who lands the third counter; in a party the Blow goes to whoever lands it, so it pays only its holder's.

## Engine work

- None for the number: `finisher` is an existing `ABILITY_MODS` key (`finisher.damageFor`, js/finisher.js; the server's too).
- `plain: true`: the shared rule (offer weight, validate.js check), as Keen Edge.
- The stroke: drawing only, on the existing `finisher` event (the cuts open) when its `player` holds the mod.

## Multiplayer

Unchanged: the server grants the Blow and computes its damage with the striker's kit. The stroke is drawn by every browser on that player's Blow (it reads their kit). It touches no teammate.

## Effect

Layered, timed from the cuts opening (t = 0, the `finisher` event; the world is in hitstop for its first 0.14 s):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Stroke | One thick flat brush stroke, 4 m long and 0.5 m wide, on a camera-facing plane just behind the foe, across the cut lines at about 30°; dry-brush texture with split bristle ends, a thin bone rim on its leading edge | `#16130f` body, `#4a4740` dry streaks, `#cfc8b6` rim |
| 0.00-0.08 | Sweep | It wipes on along its length (a mask moving end to end) | as above |
| 0.08-0.20 | Hold | Held through the hitstop | as above |
| 0.20-0.50 | Fade | It fades from its tail to its head | to transparent |

Budget (Common class): 1 pooled mesh (the stroke plane), 0 particles, no light, no ribbon, no impact frame (a dark stroke behind the foe, not a screen inversion). Peak 0.2 s. Reduced motion: no sweep; it appears whole and fades.

## Sound

`abilityInk` (new, in `js/data/audio.js`): a body of a wet brush swish (band-passed noise sweeping 1.5 kHz to 500 Hz over 0.18 s), a transient of a low thud at its end (sine 70 Hz, 60 ms), no tail (the Blow's own `cutOpen` carries the room). Quiet (vel 0.5), under the Blow's sounds.

## Camera

No camera kick: commons never take one (the Finishing Blow has its own push).

## Images

- `img/headsman-1.webp`: a frozen moment of a multi-cut flash step through a boss, many white cut lines hanging in the air, one thick black calligraphy brush stroke behind them.
