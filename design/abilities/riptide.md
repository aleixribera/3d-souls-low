# Riptide

| | |
| --- | --- |
| Id | `riptide` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `counter`: a counter lands (the hit in the window after a perfect dodge or a last-blow deflect) |
| Origin | New |

## Card

**Counter: a wave follows the cut.** (6 words, 32 chars)

- Icon (48×48 line drawing): a curved blade stroke with a wave crest curling off its end.
- Hover loop (1.6 s): a small figure sidesteps a falling blow (the perfect dodge, 0.4 s), swings back (0.2 s), and a blue crest rolls off the end of the swing and runs across the card (0.6 s); hold, fade.

## Idea

The counter is the skill the whole fight turns on. Riptide makes it reach: the cut drags a wave of water through its arc and on for eight metres, so a counter landed on one boss also hits the second boss behind it, and a counter thrown from the edge of the window still connects. It rewards the players who learned the counter with a spectacle that grows with their skill, and it never fires on its own.

## Data

```js
{ id: 'riptide', name: 'Riptide', rarity: 'rare',
  text: 'Counter: a wave follows the cut.',
  power: { when: 'counter', then: 'wave' },
  levels: [
    { damage: 40, reach: 8, width: 2 },
    { damage: 55, reach: 9, width: 2.2 },
    { damage: 70, reach: 10, width: 2.4 },
  ] },
```

Numbers: a counter does about 2.6× a light hit (about 42); level I adds about one more counter's worth. Counters land 4-8 times a fight, so about 160-560 damage a fight at levels I-III against bosses of 1600-3500 health: a solid rare, below a legendary.

## Engine work

- New power `when: 'counter'` already exists (Pyre uses it). New `then: 'wave'`: a line hit from the player along the counter's swing direction, `reach` long and `width` wide either side, once per enemy. The same `wave` resolver serves Tidal Arc (key 1), so build them in the same pass.
- `validate.js`: `wave` needs `damage`, `reach`, `width`.

## Multiplayer

The server resolves the wave from the client's counter claim (it already range-checks counters): it hits enemies only, never teammates; a teammate standing in the line sees the wave pass through them. No shared effect.

## Effect

Layered, timed from the counter's hit frame (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Crest | A flat crescent of water mesh following the blade's arc, swept from the hilt, 2-tone (deep blue body, white foam claws on the leading edge), dark ink outline | `#2c5f8a` body, `#8fb8dc` edge, `#f2f6fa` foam |
| 0.05-0.40 | Run | The crest leaves the blade and slides along the ground to `reach`, scaling up 1.3×, foam claws curling forward | as above |
| 0.10-0.45 | Spray | 18 hard-edged droplet streaks thrown up from the crest's base, falling in arcs | `#f2f6fa` |
| 0.40-0.70 | Break | The crest collapses into a flat foam ring at its end point and fades | `#8fb8dc` to transparent |

Budget (Rare class): 2 pooled meshes (crest, foam ring) + 18 particles (10 on Normal), 1 effect light (blue, 0.4 s, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.4 s. Reduced motion: no change needed (no flash).

## Sound

`abilityWave` (new, in `js/data/audio.js`): a sharp water slap transient (filtered noise burst, 2-4 kHz, 30 ms), a body of rushing water (band-passed noise sweeping 600 to 300 Hz over 0.4 s), a tail of a soft hiss (0.3 s). Played at the crest's start; the break adds a small low thud (90 Hz, 80 ms).

## Camera

No camera kick: the counter already has one. `CONFIG.camera.feel.powers.wave = [0.8, 0]`, used only when it hits two or more enemies.

## Images

- `img/riptide-1.webp`: the counter slash followed by the painted-style water crescent crashing through the boss.
