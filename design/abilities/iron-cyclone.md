# Iron Cyclone

| | |
| --- | --- |
| Id | `iron-cyclone` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `comboHeavy`: the heavy that ends a light string (`finisher1`, `finisher2` or `finisher3` in the moveset) reaches its blow |
| Origin | New |

## Card

**Heavy finisher: you spin a ring of steel.** (8 words, 41 chars)

- Icon (48×48 line drawing): a flat ellipse ring of short blade strokes round a small centre dot, with two speed lines.
- Hover loop (1.6 s): a small figure swings two lights (0.5 s), ends with a heavy, and a flat ring of blue-steel blades whips round it at waist height (0.5 s); hold, fade.

## Idea

The heavy that ends a light string throws a ring of steel ribbons round you. It rewards finishing the string with a heavy rather than drifting off it, and it hits everything close: a second boss, or a boss whose body is wider than the blade.

## Data

```js
{ id: 'iron-cyclone', name: 'Iron Cyclone', rarity: 'rare',
  text: 'Heavy finisher: you spin a ring of steel.',
  power: { when: 'comboHeavy', then: 'cyclone' },
  levels: [
    { damage: 50, radius: 3, cooldown: 4 },
    { damage: 65, radius: 3.3, cooldown: 4 },
    { damage: 80, radius: 3.6, cooldown: 4 },
  ] },
```

Numbers: a string ended with a heavy takes at least 1.5 s and leaves the player committed; a good player does it 8-12 times a fight, and the 4 s cooldown lets about 6-9 of those spin, so 300-450 at level I and up to 720 at level III, to each enemy in the ring. Strong steady damage, paid for in risk: the heavy finisher is the slowest, most punishable blow of the string.

## Engine work

- New power `comboHeavy/cyclone`: ['damage', 'radius', 'cooldown'] in ABILITY_POWERS; `cooldown` is seconds before it can spin again. New `when: 'comboHeavy'`: the player reports it (abilityReport) at the first active frame of a heavy reached from a light string (an attack listed in a light attack's `next.heavy`), whether or not the blow lands.
- `cyclone` wounds every enemy within `radius` m of the holder, once each.
- `validate.js`: `cyclone` needs `damage`, `radius` (from ABILITY_POWERS); CONFIG.abilities.cyclone { gap above 0 }.

## Multiplayer

A whiffed swing isn't seen by the server, so `comboHeavy` joins ABILITY_CLAIMS. The server rate-checks the claim (no closer than CONFIG.abilities.cyclone.gap, 1.2 s, the shortest string) and resolves the ring from the holder's position against its own enemies. Enemies only: a teammate inside the ring sees it pass through them.

## Effect

Layered, timed from the heavy's blow (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Ring | A flat ring of 8 blue-steel ribbon blades at waist height round the player, hard-edged, 2-tone, ink edge | `#5f86a8` steel, `#8fb8dc` edge, `#f2f6fa` glint, `#0e1218` ink |
| 0.00-0.35 | Spin | The ring whips round once and widens to `radius`, its blades leaning with the spin | as above |
| 0.00-0.30 | Speed lines | 12 short straight streaks flung tangent off the ring | `#cfe2f2` |
| 0.30-0.55 | Out | The blades thin to lines and vanish; a faint ring of dust settles on the floor | `#8fb8dc` to transparent |

Budget (Rare class): 2 pooled meshes (the blade ring, a floor dust ring) + 12 particles (7 on Normal), 1 effect light (steel blue, 0.25 s, × 0.65 on Normal), 1 ribbon (the ring's trail), no impact frame. Peak 0.35 s. Translucent within 1 m of a boss's weapon. Reduced motion: the speed lines hold still.

## Sound

`abilityCyclone` (new, in `js/data/audio.js`): a transient of a steel ring-out (sine 1.1 kHz with partials 2.4 and 3.9, 0.3 s), a body of a whirling whoosh (band-passed noise sweeping 600 to 2000 Hz and back over 0.35 s), a tail of a low hum (saw 90 Hz low-passed, 0.25 s). Played at the heavy's blow.

## Camera

`CONFIG.camera.feel.powers.cyclone = [1.2, 0.04]`: a small widening as the ring flies out.

## Images

- `img/iron-cyclone-1.webp`: the swordsman spinning at the end of a combo, a flat ring of blue-steel ribbon blades whipping around them, speed lines.
