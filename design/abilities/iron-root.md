# Iron Root

| | |
| --- | --- |
| Id | `iron-root` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (13, 12, 11 points) |
| Origin | New |

## Card

**For {time}, nothing staggers you; take {cut} less.** (8 words, 41 chars)

- Icon (48×48 line drawing): two feet planted on a floor line, three branching root lines spreading down and out from them.
- Hover loop (1.8 s): the key 2 square lights (0.2 s); dark roots crack out across the floor from a small figure's feet (0.3 s); the figure keeps swinging while two boss blows land on it without a flinch, each with a small number (1.0 s); the roots withdraw; fade.

## Idea

Iron roots grow from your feet into the floor and your body takes a steel sheen: for a few seconds you trade blows with the boss without flinching and take less from each. It is the aggressive guard, for the player who would rather finish their string than dodge out of it, and it pairs with heavies, whose long swings are what a flinch usually costs.

## Data

```js
{ id: 'iron-root', name: 'Iron Root', rarity: 'rare', key: 'guard',
  text: 'For {time}, nothing staggers you; take {cut} less.',
  perk: { when: 'press', then: 'root' },
  levels: [
    { charge: 13, time: 4, cut: 0.3 },
    { charge: 12, time: 4.5, cut: 0.35 },
    { charge: 11, time: 5, cut: 0.4 },
  ] },
```

Numbers: in 4-5 s a boss lands one to three blows on a player who stands and trades; 30-40% off each is about 10-14 health a median blow, 20-40 health a press. The bigger value is not flinching: a heavy string (up to 56 a blow) finishes instead of being cut off, about one or two extra heavies' worth of damage. 13 points at 1-1.4 a second is a press every 9-13 s, cheaper than the guards that take a whole blow.

## Engine work

- New perk `press/root` in `ABILITY_PERKS` (`['charge', 'time', 'cut']`), with `root` (s left) and `rootV` in `abilityPerkState`; `abilityClocks` counts it down.
- `Player.takeHit`: while `perk.root > 0`, damage is × (1 - `cut`) (after the block's cut, if blocking), knock is 0, and neither `PS.HURT` nor `PS.STAGGER` is set: the body keeps whatever it was doing, a drink included. Grabs (`seize`, `pull`) still take the holder: they are the boss's answer to someone standing still.
- `cut` is a share of the blow: add it to `ABILITY_SHARES` (at most 1) so `validate.js` holds it below 1, and the card shows it as a percentage.
- `validate.js`: `press/root` needs `charge`, `time`, `cut`.

## Multiplayer

The roots are their holder's own defence (the client owns its health and its flinch). The server needs nothing new beyond accepting the press: the client reports its own health as it already does. Holder only; the roots are drawn on the floor but have no collision and never slow a teammate who walks over them.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Grow | Flat dark iron roots crack out across the floor from the feet, 2.4 m across, hard-edged and branching, each with a thin glowing vein down its middle; a few stone chips kick up | `#2a2827` roots, `#8fb8dc` veins, `#0b0d12` ink edges |
| 0.00-0.20 | Sheen | A steel sheen sweeps up the body from the feet: a flat bright band of rim light | `#cfe4f2` |
| 0.30-`time` | Hold | The roots stay round the feet; when the holder moves more than 1 m the old roots sink and new ones crack out under them (0.2 s). Each blow taken sends a pulse of blue down the veins into the floor | `#8fb8dc` pulse |
| each blow | Bite | 6 grey stone chips jump from the floor and the body doesn't move; a short hard white spark at the contact | `#9a958c`, `#f2f6fa` |
| last 0.6 s | Wane | The veins dim from the tips inward | to `#2c5f8a` |
| `time`-+0.3 | Withdraw | The roots pull back into the feet and the sheen fades | to transparent |

Budget (Rare class): 3 pooled meshes (root decal, vein overlay, sheen band) + 6 chips a blow and 8 at the grow (at most 30 alive; 17 on Normal), 1 effect light (blue, low, 0.3 s at the grow, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.3 s. Reduced motion: no change needed.

## Sound

`abilityRoot` (new, in `js/data/audio.js`): a transient of stone cracking (white noise band-passed at 2 kHz, 30 ms), a body of iron groaning into the floor (sawtooth 55 Hz gliding to 46 Hz, low-passed at 300 Hz, driven, 0.6 s), a tail of a deep ring (sine 147 Hz with a 2.01 partial, 1 s). Each blow taken adds a dull iron thud under the normal hit sound (sine 80 Hz, 0.15 s).

## Camera

No new entry: the perk kick plays on the press, and while rooted the hurt push is skipped (no knock), so the view stays planted with the body.

## Images

- `img/iron-root-1.webp`: dark iron roots with glowing blue veins spreading from the swordsman's feet across the stone floor as they trade blows with a boss without flinching.
