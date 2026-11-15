# Black Star

| | |
| --- | --- |
| Id | `black-star` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (44 points) |
| Origin | New |

## Card

**Holds the boss for {time}, then implodes.** (7 words, 36 chars)

- Icon (48×48 line drawing): a solid black disc ringed by one thin bent circle, four short inward strokes round it.
- Hover loop (1.8 s): key cap "4" lights (0.2 s); a small figure throws from an open palm, a dot flying to the boss (0.3 s); the dot swells into a black sphere with an ember corona, the boss stuck inside, ash spiralling in (0.8 s); it collapses to a point, the brighter frame (0.1 s); a ring of lines, fade (0.4 s).

## Idea

A tiny black sun forms in your palm and is thrown at the boss. It swells, holds the boss still in its pull for a breath and a half while ash and grit spiral in, then collapses into a point with a deafening silence and a white flash. It is the Ultimate of patience: the hold is the window, the implosion the payoff, and anything small nearby is dragged in with it.

## Data

```js
{ id: 'black-star', name: 'Black Star', rarity: 'legendary', key: 'ultimate',
  text: 'Holds the boss for {time}, then implodes.',
  power: { when: 'press', then: 'blackStar' },
  levels: [
    { charge: 44, time: 1.5, damage: 320, radius: 5 },
  ] },
```

Numbers: 320 for 44 points is 7.3 a point; the 1.5 s hold is the difference (a boss that can't swing for 1.5 s is a free light string, about 60-80, and a moment to heal). 320 on every enemy within 5 m, so more on two bosses. About 640-960 a fight on one boss with the hold's hits. On the bar.

## Engine work

- New `press/blackStar`: `['charge', 'time', 'damage', 'radius']`, in `ON_ENEMY`.
- The star travels 0.35 s from the palm to the target's centre and stays where it reached. On arrival every enemy within `radius` m is held: its `frozen` timer (Time Rift's: no step, no blow, no hitbox) set to `time`; ordinary enemies within `radius` are also drawn toward the centre at 3 m/s (bosses are held in place). At `time` after arrival it implodes: `damage` to every enemy within `radius`.
- The shared hold rest (`CONFIG.abilities.holdRest`, see Heaven's Lance): a boss held in the last 3 s still takes the implosion but isn't held again. A boss that can't be held now takes the damage only.
- `validate.js`: `blackStar` needs its four numbers.

## Multiplayer

The server resolves the hold and the implosion on its own enemies from the press claim. Enemies only: the star never pulls, slows or hurts a player; a teammate inside it sees the sphere around them, drawn 50% translucent for them. One holder per team.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Anticipation | Upper-body pose: the off arm out, palm up; a black point forms over the palm with a thin ember ring; the light round the holder bends toward it; the world dims 20% | `#0b0b0f` point, `#e59a5c` ring |
| 0.30-0.65 | Throw | The point flies to the boss on a slight arc, a bent-light trail behind it | `#ece6ff` trail |
| 0.65-0.85 | Swell | It swells to a black sphere `radius` × 0.6 across, a hard ember corona round it, a ring of bent light (a refraction ring sampling the frame behind) tilted across it; the boss stops dead inside | `#0b0b0f` sphere, `#e59a5c` corona, `#ece6ff` ring |
| 0.85-2.15 | Pull | Ash, grit and floor chips spiral in along curved streaks; the corona flickers; the boss is a dark shape inside, its edges ember-lit | `#5a5550` ash, `#e59a5c` streaks |
| 2.15 | Peak (implosion) | The sphere collapses to a point in 3 frames, then a white flash and a ring of shock lines out to `radius`. **The impact frame** | `#fff3dc` flash, `#0b0b0f` lines |
| 2.15-2.90 | Fade | A hollow ring of ember sparks hangs where it was, then falls; a dark scorch circle on the floor cools | `#e59a5c` to `#2a1a12` |

Budget (Legendary class): 7 pooled meshes (palm point, throw trail, sphere, corona, refraction ring, shock-line sheet, scorch disc) + 60 spiral streaks + 30 sparks = 90 particles (50 on Normal), 2 effect lights (the corona, a cold dim light that darkens rather than lights; the implosion flash; × 0.65 on Normal), 1 ribbon (the throw trail), 1 impact frame at t = 2.15. Peak 1.5 s (0.65-2.15). The held boss can't attack, so nothing covers a tell. Reduced motion: the impact frame becomes a 30% darken, no shake, the refraction ring holds still.

## Sound

New `abilityBlackStar`: a low suck of air into the palm (pink noise, band-pass falling 3 kHz to 200 Hz, 0.35 s); during the pull a deep drone that bends downward (sine 55 Hz falling to 38 Hz, with a slow FM wobble) and grit ticks; at the implosion **silence**: every sfx bus ducked to 10% for 0.25 s, then a single soft thump (sine 40 Hz, 0.3 s) and the room's sound returning with a reversed-reverb swell.

## Camera

`CONFIG.camera.feel.powers.blackStar = [-3, 0.04]` at the implosion (the view sucked in), and `starPull = [-1, 0]` at 0.9 and 1.5 s through the pull (kicks only, under 0.4 s each).

## Images

- `img/black-star-1.webp`: a black sphere with an ember orange corona and a ring of bent light swallowing a boss, ash and debris spiralling inward, the swordsman with an outstretched palm.
- `img/black-star-2.webp`: the implosion of a black star: a white flash collapsing to a point over the arena, shockwave lines.
