# Iron Blood

| | |
| --- | --- |
| Id | `iron-blood` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Mods (a plain number) |
| Trigger | None: always on (no `when`; raises the `maxHp` mod) |
| Origin | Kept from js/data/abilities.js: trimmed from 10/20/30/40% to 8/16/24/32%; gains `plain: true`, the iron rim and the clank. |

## Card

**{maxHp} more health.** (3 words, 14 chars; level I reads "8% more health.")

- Icon (48×48 line drawing): keep the current `ABILITY_ICONS['iron-blood']`, a heart with a plus inside.
- Hover loop (1.4 s): one stroke: a short bar fills left to right (0.4 s), a second, darker line closes round it as a rim (0.3 s); hold, fade.

## Idea

More health, the safest pick for a friend still learning the bosses. It was trimmed a little because health picks carried runs further than damage picks did (PLAN item 11). Its touch marks the moment you take it: dark iron veins show under the skin of the forearm for a breath with a heavy clank, and from then on your health bar wears a dark iron rim, so you and your friends can see who is the sturdy one.

## Data

```js
{ id: 'iron-blood', name: 'Iron Blood', rarity: 'common', plain: true,
  text: '{maxHp} more health.', mods: true,
  levels: [{ maxHp: 0.08 }, { maxHp: 0.16 }, { maxHp: 0.24 }, { maxHp: 0.32 }] },
```

Numbers: the bar is 120, so level I is about 10 more health and level IV about 38. A boss blow is mostly 20-40, so level I is a third of a blow and level IV about one more blow survived a life. Flask heals stay flat (45), so the larger bar also means each flask covers less of it: the trim keeps it from out-carrying Keen Edge.

## Engine work

- None for the number: `maxHp` is an existing `ABILITY_MODS` key (the server's `maxHpOf` already reads it).
- `plain: true`: see the shared rule (offer weight `CONFIG.abilities.plainWeight`, validate.js check), as Keen Edge.
- The rim: the HUD health bar draws a 2 px dark iron frame while `kit.mods.maxHp > 0`, thicker by level (1-4 px). HUD only.
- The veins: drawing only, on the existing `abilityPicked` event when its id is this one.

## Multiplayer

Unchanged: each client owns its own health and the server reads the bar from the kit. The rim shows on the holder's own bar; the veins are drawn only in the holder's browser (the pick happens between fights). It touches no teammate.

## Effect

Layered, timed from the pick (t = 0, the `abilityPicked` event, after the pick screen closes):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.50 | Veins | A branching vein decal on the player's forearm (one pooled decal plane on the arm bone), drawn in flat dark strokes, growing outward from the wrist | `#4a4740` veins, `#16130f` outline |
| 0.05-0.30 | Sparks | 6 short bone-white spark streaks off the forearm, falling | `#f4f1e8` |
| 0.50-1.00 | Cool | The veins fade back to skin | `#4a4740` to transparent |
| from 0.00 | Rim | The health bar gains its iron frame (HUD, held for the run) | `#4a4740` frame, `#8c877b` top highlight |

Budget (Common class): 1 pooled mesh (the decal), 6 particles (3 on Normal), no light, no ribbon, no impact frame. Peak 0.5 s. Reduced motion: no change needed (no flash).

## Sound

`abilityClank` (new, in `js/data/audio.js`; Grit reuses it): a metallic transient (band-passed noise at 1.2 kHz, 25 ms, driven), a body of a low iron ring (sine 180 Hz with a 2.76× partial, decaying over 0.35 s), a short tail (verb 0.3). Played once at the pick, 0.1 s after `abilityPick`.

## Camera

No camera kick: commons never take one.

## Images

- `img/iron-blood-1.webp`: close on the swordsman's gauntleted forearm, dark iron-grey veins spreading under the skin like cooling metal, bone-white sparks.
