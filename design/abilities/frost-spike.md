# Frost Spike

| | |
| --- | --- |
| Id | `frost-spike` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) |
| Origin | New |

## Card

**A line of ice spikes erupts forward.** (7 words, 36 chars)

- Icon (48×48 line drawing): a row of four jagged spikes along a ground line, each taller than the last, rising to the right.
- Hover loop (1.6 s): a small figure stabs its sword into the floor (0.3 s), a line of ice spikes races out, each bigger than the last, and bursts up through the boss (0.6 s); frost rolls off; fade.

## Idea

Stab the ground: a line of ice spikes races out and bursts up through the boss. The longest reach of the strikes after Wind Blade, it travels along the floor, so it reads as a line the player aims, and it hits everything it passes.

## Data

```js
{ id: 'frost-spike', name: 'Frost Spike', rarity: 'rare', key: 'strike',
  text: 'A line of ice spikes erupts forward.',
  power: { when: 'press', then: 'spikes' },
  levels: [
    { charge: 15, damage: 75, reach: 12 },
    { charge: 14, damage: 95, reach: 13 },
    { charge: 13, damage: 115, reach: 14 },
  ] },
```

Numbers: 5, 6.8 and 8.8 damage a point on one boss, every enemy along the line hit once. One point cheaper than Wind Blade for a narrower line (CONFIG.abilities.spikes.width, 1.2 m either side) that travels at `speed` (24 m/s), so a far target is hit up to 0.5 s after the press.

## Engine work

- New power `press/spikes`: ['charge', 'damage', 'reach'] in ABILITY_POWERS. A line from the holder toward the press target, `reach` long, `spikes.width` either side; its front advances at `spikes.speed` and wounds each enemy once as it reaches it (a running entry).
- `validate.js`: CONFIG.abilities.spikes { width above 0, speed above 0 }.

## Multiplayer

The browser claims the press; the server checks the charge and runs the line from its own copy of the holder's position against its own enemies. Enemies only: a teammate on the line sees the spikes rise through them. Every browser draws it.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.10 | Stab | A small frost ring cracking out where the blade meets the floor | `#cfe2f2`, `#8fb8dc` edge |
| 0.05 to reach / speed | Spikes | 7 jagged crystal spikes erupting in turn along the line, 0.6 m to 2.4 m tall, each faceted in 2 tones with ink edges | `#cfe2f2` face, `#8fb8dc` edge, `#f2f6fa` core, `#0e1218` ink |
| with each spike | Shards | 4 hard ice shards thrown up at its base | `#f2f6fa` |
| +0.3 to +1.2 | Melt | The spikes sink back into the floor, the last one first | to transparent |
| 0.10-1.20 | Frost | 2 flat frost puffs rolling low along the line | `#cfe2f2` 40% |

Budget (Rare class): 8 pooled meshes (7 spikes, 1 frost ring; the puffs as particles) + 28 shards and 2 puffs (17 on Normal), 1 effect light (pale blue, moving with the front, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.6 s at 14 m. Spikes under a boss go 50% translucent within 1 m of its weapon. Reduced motion: no change needed (no flash).

## Sound

`abilityFrost` (new, in `js/data/audio.js`): a transient of a hard ice crack (white noise high-passed at 3.5 kHz, 20 ms, driven), a body of a crunching run (a crack grain every spike, each lower: sine 900 Hz down to 500 Hz with noise), a tail of a cold glassy shimmer (sine 2.4 kHz with partials, 0.6 s).

## Camera

`CONFIG.camera.feel.powers.spikes = [-1.2, 0.04]`: a small pull in with the stab.

## Images

- `img/frost-spike-1.webp`: the swordsman stabbing the sword into the ground, a racing line of jagged pale blue ice spikes erupting toward and through a boss, frost mist.
