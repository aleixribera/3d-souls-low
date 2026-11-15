# Gale Crescent

| | |
| --- | --- |
| Id | `gale-crescent` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `hits`: every 8th blow the holder lands |
| Origin | Kept from `js/data/abilities.js`. Changed: no longer a single wind blade flying through the boss (that is the rare Wind Blade's): a cage of wind crescents spinning round the boss for 2 s; `then: 'bladeCage'` (was `gale`); one level, every 8th hit, 10 cuts of 12. |

## Card

**Every {hits}th hit: blades whirl round the boss.** (8 words, 43 chars)

- Icon (48×48 line drawing): a tall cylinder drawn as four stacked crescents leaning the same way, a small circle inside.
- Hover loop (1.6 s): a small figure lands quick hits, a tally of eight ticks filling under it (0.6 s); on the eighth, crescents spin up round the boss silhouette in a tight cylinder, the brighter frame as it closes (0.2 s); it spins and shreds (0.6 s); it bursts outward, fade (0.2 s).

## Idea

Every eighth blow you land, a cage of wind crescents spins up round the boss and shreds it for two seconds with a whistling howl. It makes the steady rhythm of light strings pay off in a burst you can see coming (the tally on the blade), and it rewards keeping the pressure on instead of waiting for one big moment.

## Data

```js
{ id: 'gale-crescent', name: 'Gale Crescent', rarity: 'legendary',
  text: 'Every {hits}th hit: blades whirl round the boss.',
  power: { when: 'hits', then: 'bladeCage' },
  levels: [
    { hits: 8, time: 2, every: 0.2, damage: 12 },
  ] },
```

Numbers: 2 / 0.2 = 10 cuts of 12 = 120 a cage, every 8 landed blows. A skilled player lands about one blow a second against a boss that doesn't flinch, so a cage every 8-10 s: 12-15 a second on top of their own, about 1000-1300 over a 90 s fight. It also hits anything else inside the cage. Steady and strong, not a single swing that ends a fight.

## Engine work

- New `hits/bladeCage`: `['hits', 'time', 'every', 'damage']`, in `ON_ENEMY`; `hits/gale` goes from the legendaries (the rare Wind Blade keeps `press/gale`).
- A `running` entry on the struck enemy that follows it: first cut 0.2 s after the 8th blow, then every `every` s for `time` s, `damage` to every enemy within `e.radius + 1.2` m of its centre. A second cage on the same enemy while one runs starts it afresh (no stacking).
- The tally: the blade shows the count toward the next cage (a thin ember line along the fuller, one segment a blow), drawn for the holder only.
- `validate.js`: `bladeCage` needs its four numbers; `hits` whole.

## Multiplayer

The server counts the holder's landed blows itself and resolves the cage on its own enemies. Enemies only; a teammate inside the cage's radius is untouched and sees the crescents pass through them. One holder per team.

## Effect

Timed from the 8th blow (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| before | Tally | A thin ember line along the holder's fuller fills a segment with each landed blow | `#e59a5c` |
| 0.00-0.20 | Anticipation | The 8th blow's hit-stop; the falling ash round the boss snaps sideways; a pale ring forms at its feet | `#e8eef4` ring |
| 0.20 | Peak (the cage closes) | Twelve pale crescents with ember edges spin up from the ring into a tight cylinder as tall as the boss in 0.1 s; black ink lines on their inner edges. **The impact frame** | `#e8eef4` crescent, `#e59a5c` edge, `#0b0b0f` ink |
| 0.20-2.20 | Spin | The cylinder spins fast (crescents scroll round and climb); each cut throws 4 sharp white slivers outward; ash streaks wind round it | `#e8eef4`, `#e59a5c`, `#5a5550` |
| 2.20-2.60 | Burst | The crescents fly outward in every direction, flatten and fade 3 m out | `#e59a5c` to transparent |

Budget (Legendary class): 4 pooled meshes (floor ring, crescent instanced mesh (12), tally line, burst sheet) + 10 × 4 slivers + 30 ash = 70 particles (39 on Normal), 1 effect light (inside the cage, steady; × 0.65 on Normal), 1 ribbon (the top crescent's trail), 1 impact frame at t = 0.20. Peak 2.0 s. The crescents are 60% translucent on the side facing the holder, so the boss's wind-ups read through the cage. Reduced motion: the impact frame becomes a 30% darken, no shake, the spin slows to half.

## Sound

`abilityGale` reworked into `abilityCage`: a quick rising whoosh as it closes (band-passed noise sweeping 500 Hz to 2.5 kHz in 0.1 s), a whistling vortex for the 2 s (a narrow band at 1.4 kHz with a fast tremolo, plus a lower band at 600 Hz), a soft slicing tick each cut (high-passed noise 30 ms); the burst a short outward gust.

## Camera

`CONFIG.camera.feel.powers.bladeCage = [-1.6, 0.03]` at the closing. The old `gale = [-2.4, 0.05]` stays for the rare Wind Blade.

## Images

- `img/gale-crescent-1.webp`: a tight cylinder of many pale wind crescents with ember edges spinning around a boss like a cage, a whistling vortex.
- `img/gale-crescent-2.webp`: top-down view of the crescent cage spinning round the boss.
