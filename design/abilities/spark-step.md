# Spark Step

| | |
| --- | --- |
| Id | `spark-step` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered power (no key) |
| Trigger | `dashPast` (new): a dash that passes close by or through an enemy's body and carries on past it |
| Origin | New |

## Card

**Dash past the boss: a spark cuts it.** (8 words, 36 chars)

- Icon (48×48 line drawing): a zigzag line running across the box, with a small four-point star where it crosses a circle.
- Hover loop (1.4 s): a small figure dashes past a circle (0.3 s), a zigzag line draws itself along the path behind it (0.2 s) and snaps into a star on the circle (0.1 s); hold, fade.

## Idea

Dashing close past or through the boss leaves a crackling line on the ground that snaps shut on it. The safe dash goes away from the boss; this rewards the brave one, through its legs or round its flank, which is also how you get behind it for a counter. Each such dash becomes a small hit, so a player who moves well deals damage just by moving.

## Data

```js
{ id: 'spark-step', name: 'Spark Step', rarity: 'common',
  text: 'Dash past the boss: a spark cuts it.',
  power: { when: 'dashPast', then: 'spark' },
  levels: [
    { damage: 10, cooldown: 1 },
    { damage: 13, cooldown: 1 },
    { damage: 16, cooldown: 1 },
    { damage: 19, cooldown: 1 },
  ] },
```

Numbers: a light hit is 16, so a spark is about two thirds of one. A player who dashes past the boss 8-15 times a fight (the 1 s cooldown stops dash-spam inside a flurry) deals about 80-150 more at level I and 150-285 at level IV: level with Keen Edge, but only for the dashes that take the risk.

## Engine work

- New `when: 'dashPast'`: fired once at the end of a dash whose path (the segment from where it began to where it ended) came within `CONFIG.abilities.commons.pastGap` (1.2 m) of a live enemy's body edge, with the closest point strictly between the ends (it went past, not into). `ctx`: `{ enemy, from: { x, z }, to: { x, z } }`, the nearest such enemy. A dash that passes nothing fires nothing and spends no cooldown.
- Reuses `then: 'spark'` (Static Edge's resolver: `damage` to that enemy, as a power's blow). `ABILITY_POWERS['dashPast/spark'] = ['damage', 'cooldown']`.
- Drawing: ability-fx.js's `spark` today draws Static Edge's short blue bolt. A `spark` event with a `path` (copied from `ctx.from/to` into the `abilityPower` event) is drawn as the zigzag along it, in the colour of the ability's rarity (`picked[rarity]`), never by its id.
- Shared by the effect commons: validate.js's kind rule becomes "`mods` only on a common, `perk` on a common or a rare, `power` on any rarity"; camera-feel.js skips `abilityPerk`/`abilityPower` events whose ability is a common.
- `validate.js`: `dashPast/spark` needs `damage` and `cooldown` (the existing plan check).

## Multiplayer

A person's dash is theirs, so `dashPast` joins `ABILITY_CLAIMS`: the browser claims it with the enemy and the path; the server checks the player's poses showed a dash in the last 0.5 s, that the claimed path starts and ends within 1.5 m of those poses, and that the enemy's body was within `pastGap` + 0.5 m of it, then resolves the spark. It hits enemies only; a teammate on the path sees the line pass through them. Everyone sees the line.

## Effect

Layered, timed from the dash's end (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Line | A flat zigzag strip on the ground along the dash path (a ground-hugging quad stretched start to end, zigzag texture, 0.25 m wide), hard white core, bone edge, dark ink outline | `#f4f1e8` core, `#cfc8b6` edge, `#16130f` outline |
| 0.00-0.08 | Draw | It draws itself from the start of the path to its end | as above |
| 0.08-0.14 | Snap | At the point nearest the enemy, a small four-point star (0.6 m) snaps open on the enemy's flank at waist height | `#f4f1e8` core, `#cfc8b6` points |
| 0.08-0.30 | Sparks | 12 short hard spark streaks thrown off the star | `#f4f1e8` heads, `#8c877b` tails |
| 0.20-0.50 | Fade | Line and star fade, the line from its start | to transparent |

Budget (Common class): 2 pooled meshes (the line strip, the star sprite), 12 particles (7 on Normal), no light, no ribbon, no impact frame. Peak 0.14 s. Reduced motion: the line appears whole instead of drawing on; no other flash to soften. At most one a second (the cooldown).

## Sound

Reuse `abilitySpark` (Static Edge's: a hard high crack, a short FM buzz, a fizz) at pitch 1.15 and vel 0.6, played at the snap: the same sound family, lighter, so a rare's spark still sounds bigger.

## Camera

No camera kick: commons never take one. The existing `powers.spark` entry is Static Edge's; camera-feel.js skips it for a common's spark.

## Images

- `img/spark-step-1.webp`: the swordsman dashing past a towering boss in a blur, a crackling zigzag line of bone-white electricity drawn along the dash path snapping on the boss.
