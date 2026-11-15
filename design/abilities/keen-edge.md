# Keen Edge

| | |
| --- | --- |
| Id | `keen-edge` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Mods (a plain number) |
| Trigger | None: always on (no `when`; raises the `damage` mod) |
| Origin | Kept from js/data/abilities.js: same numbers and text; gains `plain: true` and the edge glint. |

## Card

**{damage} more damage.** (3 words, 14 chars; level I reads "8% more damage.")

- Icon (48×48 line drawing): keep the current `ABILITY_ICONS['keen-edge']`, a sword on the diagonal with a small plus beside it.
- Hover loop (1.4 s): one stroke: a blade sweeps across the card (0.3 s), a thin white line races along its edge (0.2 s); hold, fade.

## Idea

The plain damage pick, kept because a run needs one honest number. Every other common asks you to do something; this one only asks you to keep swinging. Its touch is that you can see it: the blade's edge catches a hair-thin white glint on every swing, and at level IV a faint bone-ink streak trails it, so a friend watching can tell your blade is the sharper one.

## Data

```js
{ id: 'keen-edge', name: 'Keen Edge', rarity: 'common', plain: true,
  text: '{damage} more damage.', mods: true,
  levels: [{ damage: 0.08 }, { damage: 0.16 }, { damage: 0.24 }, { damage: 0.32 }] },
```

Numbers: a fight is about 40-60 landed blows (light 16, full heavy about 61, counter about 40), so 1600-3200 damage solo. Level I adds about 130-250 a fight; level IV about 500-1000. This is the yardstick every other common is measured against: about 100-250 damage a fight, or the same worth in safety, at level I.

## Engine work

- None for the number: `damage` is an existing `ABILITY_MODS` key, applied in `abilityStrike`.
- New field `plain: true` (shared by the eight plain commons): the offer draws a plain common at `CONFIG.abilities.plainWeight` (0.5) of a common's weight, so plain numbers come up less often (PLAN item 6). `validate.js`: `plain` is only `true`, and only on a `mods` common.
- The glint: drawing only, on the existing `attackPhase` event (`phase: 'active'`) for the local player's attacks, its brightness read from `kit.mods.damage`.

## Multiplayer

Unchanged: the server already sums the holder's `damage` mod into their blows. The glint is drawn by every browser on that player's blade (it reads their kit, which each browser has). It touches no teammate.

## Effect

Layered, timed from each attack's active frame (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Glint | A hair-thin white line runs along the blade edge from hilt to tip, on the existing blade-trail mesh (a brighter edge row in its texture, no new mesh) | `#f4f1e8` core, `#cfc8b6` edge |
| 0.00-0.18 | Run | The line's bright point slides hilt to tip; brightness 0.4 / 0.55 / 0.7 / 0.85 by level | as above |
| 0.05-0.35 (level IV only) | Streak | A faint bone-ink after-streak, one flat stroke behind the swing's arc, tapering, dark ink outline | `#cfc8b6` body, `#16130f` outline |

Budget (Common class): 1 pooled mesh (the streak; the glint lives on the existing trail), 0 particles, no light, no ribbon, no impact frame. Peak 0.18 s. Reduced motion: no change needed (no flash; the line is steady, not flickering).

## Sound

None. It plays on every swing, where a sound would be noise; the swing's own sound carries it.

## Camera

No camera kick: commons never take one.

## Images

- `img/keen-edge-1.webp`: the swordsman mid-swing, a razor-thin white glint racing along the edge of the blade, a faint bone-coloured ink streak trailing it.
