# Hot Iron

| | |
| --- | --- |
| Id | `hot-iron` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered power (no key) |
| Trigger | `fullHeavy`: a fully charged heavy lands on an enemy, unblocked |
| Origin | New |

## Card

**Full heavy: molten sparks spray the boss.** (7 words, 41 chars)

- Icon (48×48 line drawing): a sword pointing down onto a short ground line, a fan of five short spark strokes spraying up from the point.
- Hover loop (1.8 s): a small figure holds a raised blade while a bar fills (0.8 s), brings it down (0.15 s), a fan of short strokes sprays from the impact and falls (0.4 s); hold, fade.

## Idea

A fully charged heavy that lands sprays a fan of molten drops into the boss. The full charge is a commitment (0.8 s held in front of a boss); this makes it feel hot and pays it a little more. It shares its trigger with Storm King, so a legendary later stacks on it rather than replacing it.

## Data

```js
{ id: 'hot-iron', name: 'Hot Iron', rarity: 'common',
  text: 'Full heavy: molten sparks spray the boss.',
  power: { when: 'fullHeavy', then: 'molten' },
  levels: [{ damage: 16 }, { damage: 21 }, { damage: 26 }, { damage: 31 }] },
```

Numbers: a full heavy does about 61 (36 × 1.7), so level I adds a quarter and level IV half. Full heavies land 4-8 times a fight: about 65-130 more at level I and 125-250 at level IV. No cooldown: the charge itself spaces it.

## Engine work

- Reuses `when: 'fullHeavy'` (Storm King's: a fully charged heavy that lands).
- New `then: 'molten'`: `damage` to that enemy as a power's blow (the `flare`/`spark` case in `fire`). Add it to `ON_ENEMY`. `ABILITY_POWERS['fullHeavy/molten'] = ['damage']`. Named `molten`, not `sparks`, to stay clear of Static Edge's `spark`.
- Drawing: a new `sparks` case in ability-fx.js, at the impact point.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

The server already triggers `fullHeavy` from the landed hit (Storm King, `Simulation.hit`), so no claim. It hits that enemy only. Everyone sees the spray.

## Effect

Layered, timed from the heavy's hit frame (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Burst | A small flat hard-edged star at the impact point (0.5 m), white-hot core, bone edge | `#fff4dc` core, `#cfc8b6` edge |
| 0.00-0.45 | Fan | 20 molten drops as short line sparks (streaks, not dots) in a 70° fan from the impact, toward the boss and up, falling under gravity, each cooling from yellow-white to dark red along its life | `#fff4dc` to `#e0a050` to `#7a1e14`, `#16130f` tail tip |
| 0.10-0.25 | Fade | The star fades | to transparent |
| 0.30-0.55 | Cool | The last drops land and go out | `#7a1e14` to transparent |

Budget (Common class): 1 pooled mesh (the star), 20 particles (11 on Normal), no light, no ribbon, no impact frame. Peak 0.1 s; the fan lands by 0.55 s. Reduced motion: no change needed (no flash).

## Sound

`abilitySizzle` (new, in `js/data/audio.js`): a hiss transient (band-passed noise at 4-7 kHz, 20 ms), a body of spitting sizzle (short noise grains at 2-5 kHz over 0.35 s, falling in rate), no tail. Under the heavy's own impact, vel 0.55.

## Camera

No camera kick: commons never take one (the full heavy has its own).

## Images

- `img/hot-iron-1.webp`: a fully charged overhead sword blow landing on a boss, a fan of molten streak sparks spraying from the impact, glowing orange cooling to dark red.
