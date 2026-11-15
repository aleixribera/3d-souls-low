# Petal Cut

| | |
| --- | --- |
| Id | `petal-cut` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered power (no key) |
| Trigger | `dashStrike` (new): a dash attack (the light or heavy a dash turns into) lands on an enemy, unblocked |
| Origin | New |

## Card

**Dash attack: the cut opens again a beat later.** (9 words, 46 chars)

- Icon (48×48 line drawing): a straight cut line across the box with a short dash arrow behind it, splitting open in the middle with three small petal shapes.
- Hover loop (1.6 s): a figure dashes through a shape (0.3 s), a thin line stays across it (0.35 s, still), then splits open and three petals drift off (0.4 s); hold, fade.

## Idea

The dash attack's cut line hangs in the air and opens a second time a beat later: the delayed cut, the signature of the game's blade techniques, in miniature. It makes the dash attack, the fastest way in, worth a little more, and it teaches the look the bigger techniques use (a line that hangs, then opens), so the counter's and the Finishing Blow's cuts read at once.

## Data

```js
{ id: 'petal-cut', name: 'Petal Cut', rarity: 'common',
  text: 'Dash attack: the cut opens again a beat later.',
  power: { when: 'dashStrike', then: 'lateCut' },
  levels: [{ damage: 12 }, { damage: 15 }, { damage: 18 }, { damage: 21 }] },
```

Numbers: a dash light does 22 and a dash heavy 34, so the late cut adds about half of a dash light at level I. Dash attacks land 6-12 times a fight: about 70-145 more at level I and 125-250 at level IV. No cooldown: the dash spaces it.

## Engine work

- New `when: 'dashStrike'`: a blow of one of the moveset's dash attacks (`PLAYER_DEF.moveset.dash`, the pair `dashAttackFrom` already chooses between) lands unblocked. `ctx`: `{ enemy, strike }`.
- New `then: 'lateCut'`: `CONFIG.abilities.commons.lateCut` (0.35 s) later, `damage` to that enemy if it is still alive and can be hurt, as a power's blow. A `running` entry (one strike, `next` = the delay), like a twin's echo. Add it to `ON_ENEMY`. `ABILITY_POWERS['dashStrike/lateCut'] = ['damage']`.
- Drawing: js/counter-fx.js already hangs a thin line where a counter with `cut` lands and opens it `cut.open` s later. A new `lateCut` case in ability-fx.js uses the same pooled cut sprites: the line at the dash attack's hit, opened on the late cut's own `abilityPower` event (the `strike` event, so the opening is drawn when the damage lands).
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

The server sees every landed blow with its attack id, so no claim: in `Simulation.hit`, a landed dash attack triggers `dashStrike` for the striker; the server runs the delay and resolves the late cut. It hits that enemy only. Everyone sees the line and its opening.

## Effect

Layered, timed from the dash attack's hit (t = 0); the late cut lands at t = 0.35:

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Line | A thin straight cut line across the enemy along the thrust (1.6 m, 2 cm), hard white core, bone edge, held perfectly still in the air | `#f4f1e8` core, `#cfc8b6` edge |
| 0.00-0.35 | Hang | Held, a faint dark ink shadow line beside it | `#16130f` shadow |
| 0.35-0.45 | Open | The line splits open into a narrow lens (0.12 m wide at its middle), brighter for 0.05 s | `#f4f1e8`, `#cfc8b6` edge |
| 0.35-0.60 | Petals | 6 pale flat petals (hard-edged, two-tone) slip out of the opening and drift down, turning | `#ece6d8` face, `#8c877b` shade side |
| 0.45-0.60 | Fade | The lens closes and fades | to transparent |

Budget (Common class): 1 pooled mesh (the cut sprite, counter-fx.js's pool), 6 particles (3 on Normal), no light, no ribbon, no impact frame. Peak 0.1 s at the opening. Reduced motion: no brightening at the opening; the line widens and fades.

## Sound

Reuse `cutOpen` (the counter's cut opening) at pitch 1.3 and vel 0.45, played at the opening: the same family as the bigger delayed cuts, smaller.

## Camera

No camera kick: commons never take one.

## Images

- `img/petal-cut-1.webp`: the swordsman finishing a dash attack past a boss, a thin cut line hanging in the air behind them splitting open with a few pale petals.
