# Thunderclap

| | |
| --- | --- |
| Id | `thunderclap` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) and the target within the clap's reach |
| Origin | New |

## Card

**A clap of thunder blasts the front.** (7 words, 35 chars)

- Icon (48×48 line drawing): a round shield seen edge-on with three concentric arcs spreading out from it to the right.
- Hover loop (1.6 s): a small figure slams the flat of its sword on its shield (0.25 s), hard rings of sound blast out in a cone and the boss rocks back, dust blown flat (0.6 s); fade.

## Idea

Slam the flat of the blade on the shield: a cone of visible sound blasts everything in front. Instant and close: the strike to fire point-blank into a boss's recovery, or into two bosses closing in at once.

## Data

```js
{ id: 'thunderclap', name: 'Thunderclap', rarity: 'rare', key: 'strike',
  text: 'A clap of thunder blasts the front.',
  power: { when: 'press', then: 'clap' },
  levels: [
    { charge: 15, damage: 70, reach: 7 },
    { charge: 14, damage: 90, reach: 7.5 },
    { charge: 13, damage: 110, reach: 8 },
  ] },
```

Numbers: 4.7, 6.4 and 8.5 damage a point on one boss, the least of the strikes, because it lands at once on every enemy in a cone of `reach` m and CONFIG.abilities.clap.angle (70°) in front: no travel, no delay, no aim beyond facing.

## Engine work

- New power `press/clap`: ['charge', 'damage', 'reach'] in ABILITY_POWERS. The holder turns to the press target; it needs the target within `reach`, else the key does not fire and keeps its charge. It wounds every enemy within `reach` and inside `clap.angle` of that facing, at once.
- `validate.js`: CONFIG.abilities.clap { angle above 0, up to 180 }.

## Multiplayer

The browser claims the press; the server checks the charge and the range and resolves the cone from its own copy of the holder's position against its own enemies. Enemies only: the clap pushes nothing and no one; a teammate in the cone sees the rings pass through them. Every browser draws it.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.08 | Clap | A white flat star where the blade meets the shield, 0.6 m | `#f2f6fa` |
| 0.03-0.45 | Rings | 4 hard concentric sound arcs leaving the shield one after another, each a flat 2-tone band with ink edges, spreading to `reach` within the cone | `#cfe2f2` face, `#8fb8dc` edge, `#0e1218` ink |
| 0.03-0.20 | Shock cone | A flat white cone of air, short-lived, inside the first arc | `#f2f6fa` 50% |
| 0.05-0.50 | Dust | 24 hard dust flakes blown flat along the floor away from the player | `#6e6a62`, `#cfe2f2` |

Budget (Rare class): 6 pooled meshes (clap star, 4 arcs, shock cone) + 24 particles (13 on Normal), 1 effect light (pale blue, 0.2 s, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.45 s. The arcs go 50% translucent within 1 m of a boss's weapon. Reduced motion: no camera shake (the kick stays).

## Sound

`abilityClap` (new, in `js/data/audio.js`): a transient of a huge flat metal clap (white noise high-passed at 1.5 kHz, 15 ms, heavily driven, with a sine 700 Hz ring), a body of a rolling thunder rumble (brown noise low-passed 400 to 120 Hz, 0.8 s, driven), a tail of a long room echo (the reverb send high, 1 s).

## Camera

`CONFIG.camera.feel.powers.clap = [2.0, 0.08]`: a widening with a small dip at the clap.

## Images

- `img/thunderclap-1.webp`: the swordsman slamming the flat of the sword onto a round shield, a cone of hard concentric pale blue sound arcs blasting toward a boss, dust blown flat.
