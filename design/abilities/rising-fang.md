# Rising Fang

| | |
| --- | --- |
| Id | `rising-fang` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) |
| Origin | New |

## Card

**A rising slash throws up blue fire.** (7 words, 35 chars)

- Icon (48×48 line drawing): a tall curved fang shape rising from a flat ground line, with a short slash stroke at its base.
- Hover loop (1.6 s): a small figure slashes low to high (0.3 s), a line of fire runs along the floor to the boss (0.2 s) and a tall curved fang of blue flame erupts up through it (0.4 s), embers falling; fade.

## Idea

An upward slash from the ground tears a fang-shaped pillar of blue fire up through the boss. Where Fire Burst closes on the boss at once, the fang runs along the floor and erupts a beat later: a stronger hit for a strike you time to the boss's stillness.

## Data

```js
{ id: 'rising-fang', name: 'Rising Fang', rarity: 'rare', key: 'strike',
  text: 'A rising slash throws up blue fire.',
  power: { when: 'press', then: 'risingFire' },
  levels: [
    { charge: 15, damage: 85 },
    { charge: 14, damage: 105 },
    { charge: 13, damage: 125 },
  ] },
```

Numbers: 5.7, 7.5 and 9.6 damage a point, a little above Fire Burst because the fang erupts CONFIG.abilities.risingFire.delay (0.25 s) after the press at the spot the target stood, and hits only what is still within `radius` (1.5 m) of it: a boss mid-leap can step out of it. Two bosses standing together are both hit.

## Engine work

- New power `press/risingFire`: ['charge', 'damage'] in ABILITY_POWERS. On the press it marks the target's spot; after `risingFire.delay` it wounds every enemy within `risingFire.radius` of that spot (a running entry, as `pyre`).
- `validate.js`: CONFIG.abilities.risingFire { delay from 0 to 0.5, radius above 0 }.

## Multiplayer

The browser claims the press; the server checks the charge and resolves the fang at the marked spot against its own enemies. Enemies only. Every browser draws it.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.15 | Slash | A low-to-high slash arc off the blade, ink-edged | `#f2f6fa` core, `#8fb8dc` edge, `#0e1218` ink |
| 0.05-0.25 | Run | A thin line of blue fire racing along the floor from the player to the spot | `#8fb8dc`, `#f2f6fa` core |
| 0.25-0.45 | Fang | A tall curved fang of flame, 4 m high, erupting up through the spot, hard-edged tongues, white core, blue edge, dark inner lines | `#f2f6fa` core, `#8fb8dc` edge, `#2c5f8a` inner lines, `#0e1218` ink |
| 0.45-0.90 | Embers | 24 hard flakes falling from the fang's tip as it thins and sinks | `#cfe2f2`, `#8fb8dc` |
| 0.30-1.00 | Scorch | A flat scorched crack on the floor at the spot | `#2c3a48` |

Budget (Rare class): 4 pooled meshes (slash arc, floor line, fang, scorch decal) + 24 particles (13 on Normal), 1 effect light (blue-white, 0.4 s, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.45 s. The fang goes 50% translucent within 1 m of the boss's weapon. Reduced motion: no change needed (no flash).

## Sound

`abilityFang` (new, in `js/data/audio.js`): a transient of a sharp upward slice (white noise band-passed 2-5 kHz rising, 40 ms), a short crackle as the fire runs (noise 3 kHz grains, 0.2 s), then a body of a roaring eruption (brown noise low-passed 900 to 300 Hz, 0.5 s, driven) with a low thump (sine 65 Hz, 0.25 s) at t = 0.25, and a tail of hissing embers (0.4 s).

## Camera

`CONFIG.camera.feel.powers.risingFire = [1.6, 0.05]`: a small widening as the fang erupts.

## Images

- `img/rising-fang-1.webp`: the swordsman in a low-to-high rising slash, a tall curved fang-shaped pillar of blue flame erupting up through the boss.
