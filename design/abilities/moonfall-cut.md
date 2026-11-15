# Moonfall Cut

| | |
| --- | --- |
| Id | `moonfall-cut` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `land`: a light jump attack (`action: 'light'`) comes down; at most once every `cooldown` s |
| Origin | New |

## Card

**Light jump attack: a moon crescent cuts down.** (8 words, 45 chars)

- Icon (48×48 line drawing): a tall crescent moon standing upright with a downward slash line through its inner curve.
- Hover loop (1.6 s): a small figure jumps and swings at the top (0.5 s), a tall pale crescent forms behind it (0.2 s) and falls with the cut through the boss (0.3 s); hold, fade.

## Idea

At the top of a light jump attack a pale crescent moon forms behind you and falls with the cut. The light jump attack, now a quick poke, becomes a move worth jumping for, and the crescent gives the cut the reach to hit a tall boss's body.

## Data

```js
{ id: 'moonfall-cut', name: 'Moonfall Cut', rarity: 'rare',
  text: 'Light jump attack: a moon crescent cuts down.',
  power: { when: 'land', then: 'crescent', action: 'light' },
  levels: [
    { damage: 45, cooldown: 4 },
    { damage: 60, cooldown: 4 },
    { damage: 75, cooldown: 4 },
  ] },
```

Numbers: one crescent every 4 s at most. A player jumping in when the boss is open does it perhaps 6-12 times a fight: 270-900, with the cooldown keeping a jump-spammer to 15 a minute. About 2.8× a light hit at level I, like a counter, because the jump attack is a risk (the player is in the air).

## Engine work

- New power `land/crescent`: ['damage', 'cooldown'] in ABILITY_POWERS. `land` is already claimed with its `action` (Meteor Fall uses `heavy`). `crescent` wounds every enemy in a short line ahead of the holder, CONFIG.abilities.crescent { reach: 3.5, width: 1.2 } m, along the holder's facing at the landing.
- `validate.js`: CONFIG.abilities.crescent { reach above 0, width above 0 }.

## Multiplayer

The browser claims the landing (`land`, already in ABILITY_CLAIMS); the server range-checks it and resolves the crescent against its own enemies. Enemies only. Every browser draws it.

## Effect

Layered, timed from the landing (t = 0); the crescent forms at the jump's apex (about t = -0.25):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| -0.25 to 0.00 | Form | A tall flat crescent, 3 m high, appearing behind the player in the air, pale face, blue edge, ink outline | `#e6eef6` face, `#8fb8dc` edge, `#0e1218` ink |
| 0.00-0.12 | Fall | The crescent drops with the blade through the space ahead, its lower tip cutting a line in the floor | as above |
| 0.05-0.40 | Floor cut | A straight glowing cut line on the floor, `reach` long, fading | `#8fb8dc`, `#f2f6fa` core |
| 0.05-0.35 | Shards | 14 hard pale flakes thrown up either side of the cut | `#cfe2f2` |

Budget (Rare class): 2 pooled meshes (crescent, floor cut decal) + 14 particles (8 on Normal), 1 effect light (pale blue, 0.3 s, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.4 s. Translucent where it crosses a boss's weapon. Reduced motion: no change needed (no flash).

## Sound

`abilityMoonfall` (new, in `js/data/audio.js`): a transient of a hard clean slice (white noise band-passed at 4 kHz, 25 ms), a body of a falling glassy tone (sine 1.4 kHz gliding to 700 Hz over 0.15 s with a 2.4 partial), a tail of a low ground thud (sine 70 Hz, 0.2 s) and a soft shimmer (0.3 s).

## Camera

`CONFIG.camera.feel.powers.crescent = [-1.4, 0.06]`: a short pull in with a small dip as it falls.

## Images

- `img/moonfall-cut-1.webp`: the swordsman in the air at the top of a jump, a tall pale blue crescent moon blade forming behind them and slicing down onto a boss.
