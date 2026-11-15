# Sky Blade

| | |
| --- | --- |
| Id | `sky-blade` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (46 points) |
| Origin | New |

## Card

**A sword as tall as a tower falls.** (8 words, 33 chars)

- Icon (48×48 line drawing): a long sword point-down filling the icon's height, its point just touching a small boss circle, two cloud strokes at its hilt.
- Hover loop (1.8 s): key cap "4" lights (0.2 s); a small figure points up (0.2 s); the outline of a huge sword forms in the clouds over the boss, filling with ember light (0.6 s); it drops in one frame, the brighter frame on the impact (0.1 s); a crater ring and the planted sword, hold, fade (0.7 s).

## Idea

A shape in the clouds: a sword the size of a tower forms point-down above the boss, fills with ember-gold light, and drops into it, shaking the whole arena, and stays planted there a moment like a grave marker. The heaviest single blow in the pool, and the most theatrical: the whole party looks up when it forms.

## Data

```js
{ id: 'sky-blade', name: 'Sky Blade', rarity: 'legendary', key: 'ultimate',
  text: 'A sword as tall as a tower falls.',
  power: { when: 'press', then: 'skyBlade' },
  levels: [
    { charge: 46, damage: 380 },
  ] },
```

Numbers: 380 in one blow for 46 points, 8.3 a point, on the dragon's 8.4; the impact also hits every enemy within 3 m of the point. About 760-1140 a fight. On the bar.

## Engine work

- New `press/skyBlade`: `['charge', 'damage']`, in `ON_ENEMY`.
- The sword forms over the target and tracks it until the drop, so it can't miss its target; it lands at t = 1.1: `damage` to the target and to every enemy within `CONFIG.abilities.powers.skyBlade.radius` = 3 m of the point. If the target is gone before the drop, it falls where it was.
- The sword is a Blender model, `tools/blender/sky_blade.py`: a plain greatsword 30 m long (blade 24 m), dark steel with a broad fuller, a simple cross guard and a ring pommel, its edges and fuller lit by an emissive map. No resemblance to any known sword; plain and heavy. Baked to `js/baked/`.
- `validate.js`: `skyBlade` needs `damage`.

## Multiplayer

The server resolves it from the press claim on its own target at the drop. Enemies only: a teammate under the point is untouched and the planted sword is drawn translucent for anyone within 2 m of it (nothing blocks a friend's view or path; it has no collision). One holder per team.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Anticipation | Upper-body pose: the blade raised point-up, arm straight; the world dims 20%; a thin ember line runs from the tip into the clouds | `#e59a5c` line |
| 0.25-0.85 | Forming | High over the boss the sword's outline draws itself in the clouds in black ink, then fills from the hilt down with ember-gold light; its shadow lands on the boss and the floor as a long dark line, a ring at the point marks the reach | `#0b0b0f` outline, `#e8c46a` to `#e59a5c` fill, `#fff3dc` edges |
| 0.85-1.10 | Wind-up | The sword lifts a few metres (anticipation), glows white along the edges; the ash in the air is pulled upward | `#fff3dc` |
| 1.10 | Peak (impact) | It drops in one frame and is planted; a crater burst, a hard shock ring to 8 m, 40 stone chips and 30 sparks. **The impact frame** | `#fff3dc` core, `#e59a5c` ring, `#4a4440` chips |
| 1.10-2.20 | Planted | It stands in the crater, its light cooling from the point up; embers drift off its edges; cracks round the crater glow | `#e59a5c` to `#7a1f12` |
| 2.20-2.80 | Fade | It dissolves upward into ember flakes; the crater's glow goes out and leaves a dark scorch | `#e59a5c` to `#2a1a12` |

Budget (Legendary class): 7 pooled meshes (tip line, sword model, sword shadow decal, reach ring, shock ring, crater decal, crater crack glow) + 40 chips + 30 sparks + 40 embers = 110 particles (61 on Normal), 2 effect lights (the forming sword over the boss, steady; the impact; × 0.65 on Normal), no ribbon, 1 impact frame at t = 1.10. Peak 1.35 s (0.85-2.20). The planted sword is beside the boss's body, never in front of its weapon; it goes 35% translucent within 2 m of a weapon winding up. Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

New `abilitySkyBlade`: a low rising hum as it forms (sine 45 Hz with partials at 2 and 3, swelling over 0.6 s, a slow metal shimmer at 2.4 kHz on top); a whistle of air as it falls (band-pass sweeping 3 kHz down to 600 Hz in 0.2 s); the impact `abilityBlast` at full with an extra metal ring (sine partials at 220, 487 and 912 Hz, 1.8 s decay) and a long sub (sine 38 Hz to 22 Hz, 1 s). Tail: rubble settling.

## Camera

`CONFIG.camera.feel.powers.skyBlade = [4.6, 0.26]` at the impact (the heaviest dip of the Ultimates, under the Bell's), nothing during the forming.

## Images

- `img/sky-blade-1.webp`: a colossal sword of ember-gold light and dark steel as tall as a tower falling point-down from the clouds onto a boss, the swordsman pointing upward.
- `img/sky-blade-2.webp`: the giant sword planted in the arena floor after impact, a crater and shock ring, the boss crushed at its foot, ember light.
