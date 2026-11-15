# Tempest

| | |
| --- | --- |
| Id | `tempest` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (42 points) |
| Origin | New |

## Card

**A storm whirls round the boss for {time}.** (8 words, 36 chars)

- Icon (48×48 line drawing): a funnel of three stacked spiral strokes narrowing to the ground, a short bolt zigzag inside it.
- Hover loop (2.0 s): key cap "4" lights (0.2 s); a small figure spins the blade overhead (0.3 s); wind lines wrap a boss silhouette and build into a funnel, the brighter frame as the first bolt cracks inside (0.4 s); the funnel spins, rain streaks, two more bolt ticks while the figure cuts inside the calm eye (0.8 s); the funnel lifts apart, fade (0.3 s).

## Idea

A cyclone of wind, rain and ember lightning spins up round the boss and shreds it for five seconds, and you fight inside the eye, where it is calm. It is the long Ultimate: not one big hit but a storm that makes the next five seconds of your own fighting louder and brighter. It hits everything within six metres of the boss, so a second boss or adds caught in it are shredded too.

## Data

```js
{ id: 'tempest', name: 'Tempest', rarity: 'legendary', key: 'ultimate',
  text: 'A storm whirls round the boss for {time}.',
  power: { when: 'press', then: 'tempest' },
  levels: [
    { charge: 42, time: 5, every: 0.25, damage: 18, radius: 6 },
  ] },
```

Numbers: 5 / 0.25 = 20 ticks of 18 = 360 for 42 points, 8.6 a point on one boss, on the dragon's floor; a 6 m radius round the boss doubles it on two bosses close together. Its strength is that the holder keeps fighting through it (the storm adds about 72 a second on top of their own 30). About 720-1080 a fight on one boss.

## Engine work

- New `press/tempest`: `['charge', 'time', 'every', 'damage', 'radius']`, in `ON_ENEMY`; a `running` entry centred on the target that follows it (the storm's centre eases toward the target's position at up to 8 m/s, so it stays round the boss as it moves).
- First tick 0.5 s after the press, then every `every` s for `time` s: `damage` to every enemy within `radius` m of the centre.
- The wind never pushes, slows or blinds a player: it is drawing only for bodies.
- `validate.js`: `tempest` needs its five numbers; `time / every` a whole number.

## Multiplayer

The server resolves it on its own enemies from the press claim and moves the storm's centre with the boss. Enemies only. A teammate standing in the funnel's wall sees it 50% translucent round them and is never touched. One holder per team.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Anticipation | Upper-body pose: the blade spun once overhead and held up; the world dims 20%; the falling ash turns and starts to circle the boss | `#5a5550` ash |
| 0.20-0.50 | Build | Wind bands wrap the boss from the floor up, three flat spiral sheets in two tones, black ink edges; rain streaks start slanting round | `#2a3040` bands, `#8a93a6` light band, `#0b0b0f` ink, `#cfd6e2` rain |
| 0.50 | Peak (the first bolt) | The funnel closes overhead, 14 m tall, and a jagged ember-edged bolt cracks down its middle onto the boss; 24 sharp sparks. **The impact frame** | `#ece6ff` bolt core, `#e59a5c` edge |
| 0.50-5.50 | Storm | The funnel spins (bands scroll upward); every tick a white wind streak cuts across the wall (a shape, never a light flash); every fourth tick (once a second) a short ember bolt between the bands, the only flash; rain streaks and torn ash fly round; inside the eye (round the holder if they stand in it) the air is still and the ash hangs | as above |
| 5.50-6.20 | Fade | The funnel lifts off the floor and unwinds upward into thin bands that tear and vanish; the rain falls straight for a beat and stops | `#8a93a6` to transparent |

Budget (Legendary class for the opening, then the hold): opening 6 pooled meshes (3 spiral sheets, cap disc, bolt mesh, eye-calm ash ring) + 24 sparks + 60 rain + 40 ash = 124 particles (68 on Normal), 2 effect lights (the bolt; a cold flicker inside the wall, × 0.65 on Normal), no ribbon, 1 impact frame at t = 0.50, peak 0.5-2.0 s. From 2.0 to 5.5 s the hold drops to its long-aura size: 4 meshes (2 spiral sheets, bolt, ash ring), 30 rain streaks (17 on Normal), 1 light for the small bolts, no flash beyond those (every 1 s at most, so under the 3 Hz bound). The wall goes 35% translucent within 2 m of the boss's weapon while it winds up. Reduced motion: the impact frame becomes a 30% darken, no shake, the small bolts glow instead of flashing.

## Sound

New `abilityTempest`: a wind rising to a howl (pink noise, band-pass sweeping 300 Hz to 1.4 kHz over 0.5 s, then a steady whistling band at 900 Hz with a slow wobble for 5 s, fading), rain hiss (high-passed noise at 6 kHz, low gain, 5 s), the first bolt `abilityThunder` at full, the small bolts `abilityThunder` at gain 0.4 and pitch up a fifth. Tail: the howl falling away upward (band rising to 3 kHz while fading, 0.7 s).

## Camera

`CONFIG.camera.feel.powers.tempest = [2.2, 0.08]` at the first bolt; the small bolts use the existing `spark = [-0.8, 0.02]`. Kicks only.

## Images

- `img/tempest-1.webp`: a tall funnel of dark wind with ember-lit lightning and rain streaks spinning around a boss, the swordsman fighting inside the calm eye.
- `img/tempest-2.webp`: aerial view of the storm funnel over the arena, lightning flashing inside it.
