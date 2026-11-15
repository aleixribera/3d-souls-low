# Thousand Blades

| | |
| --- | --- |
| Id | `thousand-blades` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `parry`: a deflect (10 s cooldown) |
| Origin | Kept from `js/data/abilities.js`. Changed: one level (4.5 s, a sword every 0.15 s for 6: the old level II); the swords stay planted and finish in a standing ring, with one impact frame as the sky opens. |

## Card

**Deflect: swords rain on the boss for {time}.** (8 words, 39 chars)

- Icon (48×48 line drawing): five sword silhouettes falling point-down at slight angles, two already standing in a ground line.
- Hover loop (1.8 s): a small figure deflects a blow, a spark (0.2 s); the sky over the boss opens, the brighter frame (0.1 s); swords fall in streaks and stick in the boss and the floor (1.0 s); a ring of planted swords glows and fades (0.5 s).

## Idea

A deflect opens the sky: ghost copies of your own sword rain down on the boss for four and a half seconds and stand where they land, until a ring of them circles it. The deflect is the moveset's most precise moment; this makes every good one a storm of steel, and it builds as you keep deflecting, every ten seconds.

## Data

```js
{ id: 'thousand-blades', name: 'Thousand Blades', rarity: 'legendary',
  text: 'Deflect: swords rain on the boss for {time}.',
  power: { when: 'parry', then: 'blades' },
  levels: [
    { time: 4.5, every: 0.15, damage: 6, cooldown: 10 },
  ] },
```

Numbers: 4.5 / 0.15 = 30 swords of 6 = 180 a deflect, every 10 s at most. Deflects come every few seconds against an aggressive boss, so it fires about every 10-12 s: 15-18 damage a second on top of the holder's own, about 1300-1600 over a 90 s fight for a player who deflects well. Strong, and earned by the hardest timing in the game.

## Engine work

- `parry/blades` exists, unchanged: a `running` entry on the deflected enemy, a sword every `every` s for `time` s.
- Drawing (`js/ability-fx.js` `blades`): swords now stay planted where they land (in the boss's body for 0.6 s, then dropping to the floor beside it) and the last ten stand in a ring, all within the pooled count below.
- The ghost sword is the holder's own sword model (the player's weapon, already a Blender model), drawn with the ghost shader as one instanced mesh (32 instances), so the rain is one draw call.

## Multiplayer

The server sees the deflect itself and resolves the swords on its own enemy. Enemies only; a sword falling near a teammate passes through them and never plants in their path (planted swords have no collision and fade when a player stands within 1 m). One holder per team.

## Effect

Timed from the deflect (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.15 | Anticipation | The deflect's own spark and hit-stop; a ring of light marks opens in the air 12 m over the boss | `#e59a5c` marks |
| 0.15 | Peak (the sky opens) | The ring tears open into a disc of white light; the first three swords appear in it. **The impact frame** | `#fff3dc` disc, `#e59a5c` rim |
| 0.15-4.65 | Rain | A sword every 0.15 s falls point-down in a hard white streak with an ember edge, at a slight random angle, sticks in the boss or the floor with 6 sparks and a small dust puff; ghost swords are flat-shaded, white core, ember edge, black ink outline | `#fff3dc` streak, `#e59a5c` edge, `#0b0b0f` ink |
| 3.00-4.65 | Ring | The last ten land in a ring round the boss's feet and stand, glowing | `#e59a5c` |
| 4.65-5.40 | Fade | The disc closes; the planted swords glow white along their edges and fade from the hilt down | `#fff3dc` to transparent |

Budget (Legendary class): 4 pooled meshes (sky ring, light disc, instanced ghost swords (32), dust card sheet) + 30 × 6 sparks spread over 4.5 s (never more than 36 alive) + 20 dust = 56 particles alive at most (31 on Normal), 1 effect light (the disc over the boss, steady, never pulsing per sword; × 0.65 on Normal), no ribbon, 1 impact frame at t = 0.15. Peak 0.5 s at the opening, then the rain at aura weight. Swords never fall across the boss's weapon during a wind-up (they land on its far side and back). Reduced motion: the impact frame becomes a 30% darken, no shake, streaks drawn without motion stretch.

## Sound

`abilityBlades` kept (a choir of steel rising as the sky opens) and `abilityBlade` for each sword (a ring of steel and a thud), its pitch varied by the existing jitter. New: at the ring's closing, a single low steel chord (sine partials at 196, 294 and 392 Hz, 1.4 s) under the last sword.

## Camera

`CONFIG.camera.feel.powers.blades = [-1.4, 0.04]` kept, at the opening only. No kick per sword.

## Images

- `img/thousand-blades-1.webp`: dozens of ember-edged ghost swords raining point-down from the sky onto a boss after a deflect, streaks of light, swords stuck in the floor.
- `img/thousand-blades-2.webp`: a ring of ghost swords stuck in the floor around the boss, glowing and fading.
