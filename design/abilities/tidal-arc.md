# Tidal Arc

| | |
| --- | --- |
| Id | `tidal-arc` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) |
| Origin | New |

## Card

**A wave crashes through all in front.** (7 words, 36 chars)

- Icon (48×48 line drawing): a breaking wave crest curling over to the right, three claw strokes of foam on its lip.
- Hover loop (1.8 s): a small figure sweeps the blade wide (0.3 s), a painted wave rises out of the swing, curls over and crashes forward across two bosses (0.8 s); hold, fade.

## Idea

A wide sweep draws a whole breaking wave out of the blade and it crashes over everything in front. Shorter than Wind Blade but twice as wide: the strike for bosses that stand side by side and for a boss too wide to miss.

## Data

```js
{ id: 'tidal-arc', name: 'Tidal Arc', rarity: 'rare', key: 'strike',
  text: 'A wave crashes through all in front.',
  power: { when: 'press', then: 'wave' },
  levels: [
    { charge: 16, damage: 80, reach: 10, width: 3 },
    { charge: 15, damage: 100, reach: 11, width: 3.2 },
    { charge: 14, damage: 120, reach: 12, width: 3.4 },
  ] },
```

Numbers: the same damage and charge as Wind Blade (5-8.6 damage a point on one boss), traded reach (10-12 m against 12-16) for width (3-3.4 m against 1.4-1.8). The two are a choice of shape, not of power.

## Engine work

- New `then: 'wave'`: a line hit from the holder, `reach` long and `width` wide either side, once per enemy. Its direction: toward the press target. The same resolver serves Riptide (`counter/wave`, along the counter's swing), so build them in the same pass.
- New power `press/wave`: ['charge', 'damage', 'reach', 'width'] in ABILITY_POWERS; `wave` joins ON_ENEMY for the press (it needs a target to aim at).
- `validate.js`: `wave` needs `damage`, `reach`, `width` (from ABILITY_POWERS).

## Multiplayer

The browser claims the press; the server checks the charge and resolves the line from its own copy of the holder's position against its own enemies. Enemies only: a teammate in the wave sees it pass through them. Every browser draws it.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.15 | Sweep | A wide flat slash arc off the blade, ink-edged | `#f2f6fa` core, `#8fb8dc` edge, `#0e1218` ink |
| 0.10-0.30 | Rise | A painted wave, 3 m tall and `width` × 2 wide, rising out of the arc, 2-tone deep blue body, white foam claws curling over its lip, ink outlines | `#2c5f8a` body, `#8fb8dc` edge, `#f2f6fa` foam, `#0e1218` ink |
| 0.30-0.60 | Crash | The wave runs forward to `reach` and curls over, the crest crashing down | as above |
| 0.35-0.80 | Spray | 30 hard-edged droplet streaks thrown up from the crash line | `#f2f6fa`, `#cfe2f2` |
| 0.60-1.00 | Foam | A flat foam sheet on the floor at the end, breaking into rings and fading | `#8fb8dc` to transparent |

Budget (Rare class): 3 pooled meshes (sweep arc, wave, foam sheet) + 30 particles (17 on Normal), 1 effect light (blue, 0.6 s, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.6 s. The crest goes 50% translucent within 1 m of a boss's weapon. Reduced motion: no change needed (no flash).

## Sound

`abilityWave` (Riptide's, in `js/data/audio.js`), played fuller: the water slap transient, the body of rushing water sweeping 600 to 300 Hz over 0.5 s, and the break's low thud (90 Hz) at the crash, with a longer hiss tail (0.5 s).

## Camera

Shares Riptide's `CONFIG.camera.feel.powers.wave = [0.8, 0]`; the press always plays it (Riptide's counter only when it hits two or more enemies).

## Images

- `img/tidal-arc-1.webp`: the swordsman sweeping the blade wide as a painted-style breaking wave of deep blue water with white foam claws curls over and crashes down on a boss.
