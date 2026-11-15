# Bastion

| | |
| --- | --- |
| Id | `bastion` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `block`: you block a blow with the shield |
| Origin | Kept from js/data/abilities.js: the same perk, text and numbers; the gold cue becomes blue and shows the charge travelling |

## Card

**Block: next heavy in {window} is fully charged.** (8 words, 40 chars)

- Icon (48×48 line drawing): a round shield with a zigzag line running from its rim up to a sword's hilt.
- Hover loop (1.8 s): a small figure blocks a blow on its shield (0.3 s), a blue line runs up the arm into the blade (0.3 s), the blade hums blue (0.4 s), the figure swings a heavy at once and it lands full (0.4 s); fade.

## Idea

A blocked blow's force goes into the blade: block, then answer with a full heavy at once instead of holding the charge in the boss's face. It gives the shield, which the deflect outshines, a reason to be raised.

## Data

```js
{ id: 'bastion', name: 'Bastion', rarity: 'rare',
  text: 'Block: next heavy in {window} is fully charged.',
  perk: { when: 'block', then: 'charge' },
  levels: [
    { window: 3 },
    { window: 4 },
    { window: 5 },
  ] },
```

Numbers: a full heavy does 56 against a tapped heavy's 30, so each block answered is +26 and a pressed key point more (a full charge counts as a skill blow). A shield player blocks 10-20 blows a fight and answers maybe half: about +130-260 a fight, plus the safety of never holding a charge in front of the boss.

## Engine work

- None for the rule: `block/charge` exists (`perk.bastion`).
- New look: the `abilityPerk` cue for `block/charge` changes from the gold spark burst to the blue shock below, and js/ability-fx.js draws the blade hum while `perk.bastion > 0` on the local player (reading the clock, no allocation).

## Multiplayer

The block is the client's own defence; the charged heavy is the client's own attack, its damage checked by the server like any full heavy. Only the holder is changed.

## Effect

Layered, timed from the block (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Shock | A hard-edged blue ring bursting off the shield face, 1.2 m | `#8fb8dc` edge, `#f2f6fa` core |
| 0.05-0.30 | Run | A jagged blue line crawling from the shield along the arm to the hilt and up the blade | `#8fb8dc`, `#0e1218` ink |
| 0.30-window | Hum | The blade edge lit pale blue with a thin white core line; 2 flakes a second off its tip | `#cfe2f2`, `#f2f6fa` |
| heavy | Release | The hum snaps off into the heavy's normal full-charge flash | (the heavy's own) |

Budget (Rare class): 3 pooled meshes (shock ring, arm line, blade edge) + 8 sparks at the shock (5 on Normal) and the hum's flakes, no effect light, no ribbon, no impact frame. Peak 0.3 s. Reduced motion: no change needed (no flash).

## Sound

`abilityCharge` (kept): the steel scrape up to a ring, now timed to the run (t = 0.05-0.3). A soft high hum (sine 740 Hz, gain 0.04) loops quietly under the window and stops on the heavy.

## Camera

No new kick: the block already pushes the view. The shared `perkFov` (-0.9) plays as the blade lights; no `powers` entry.

## Images

- `img/bastion-1.webp`: the swordsman blocking with a round shield, a blue shockwave running from the shield up the arm into the sword, which hums with charged light.
