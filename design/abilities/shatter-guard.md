# Shatter Guard

| | |
| --- | --- |
| Id | `shatter-guard` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered power (no key) |
| Trigger | `crack` (new): a counter of the holder's cracks an enemy's guard (a crack, not the Finishing Blow itself) |
| Origin | New |

## Card

**Crack a guard: its shards cut the boss.** (8 words, 39 chars)

- Icon (48×48 line drawing): a curved guard plate with a jagged crack through it and three small triangular shards curving back toward it.
- Hover loop (1.6 s): a cut lands on a plate (0.2 s), a crack runs across it (0.2 s), three shards burst off and curve back into it (0.4 s); hold, fade.

## Idea

Each counter that cracks the boss's guard throws shards of that guard back into it. The cracks are the road to the Finishing Blow, but today they are a tint and a count; this makes them physical, a guard you can see breaking, and pays each one a little on the way.

## Data

```js
{ id: 'shatter-guard', name: 'Shatter Guard', rarity: 'common',
  text: 'Crack a guard: its shards cut the boss.',
  power: { when: 'crack', then: 'shards' },
  levels: [{ damage: 22 }, { damage: 28 }, { damage: 34 }, { damage: 40 }] },
```

Numbers: two cracks come before each Finishing Blow, so of 4-8 counters a fight about 3-5 are cracks: about 65-110 more at level I and 120-200 at level IV, in line with the other effect commons. No cooldown: counters space it.

## Engine work

- New `when: 'crack'`: fired when the holder's counter adds a crack to an enemy's guard (the `guardCrack` event with `by` the holder and `cracks` rising, from `crackGuard`); not when the cracks fade or a Finishing Blow spends them. `ctx`: `{ enemy }`.
- New `then: 'shards'`: `damage` to that enemy as a power's blow, 0.12 s after the crack so the shards are seen to land (a `running` entry with one strike, as Echo Step's). Add it to `ON_ENEMY`. `ABILITY_POWERS['crack/shards'] = ['damage']`.
- A power's blow is never a counter, so the shards never add a crack of their own.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

The server counts the cracks and grants the Finishing Blow (`Simulation.hit`), so it sees each crack itself: no claim. It triggers `crack` for the striker whose counter cracked it. It hits that enemy only. Everyone sees the shards.

## Effect

Layered, timed from the crack (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Mark | A short jagged crack decal on the enemy's body where the counter landed (one sprite), hard dark lines with a white inner edge | `#16130f` lines, `#f4f1e8` inner edge |
| 0.00-0.12 | Burst | 12 glassy shards (flat triangles, one bright face, one shaded, hard edges) burst out of the mark 0.6-1 m | `#f4f1e8` bright face, `#cfc8b6` edge, `#8c877b` shade |
| 0.12-0.30 | Return | They curve back and drive into the body at the mark, vanishing as they enter | as above |
| 0.20-0.45 | Fade | The mark fades | to transparent |

Budget (Common class): 1 pooled mesh (the crack sprite), 12 particles (7 on Normal), no light, no ribbon, no impact frame. Peak 0.12 s at the burst. Reduced motion: no change needed (no flash).

## Sound

`abilityShatter` (new, in `js/data/audio.js`): a glass-break transient (noise band-passed at 3-8 kHz, 30 ms), a body of tinkling shards (6 sine blips at random pitches in 2-4 kHz over 0.25 s), a short tail (verb 0.35). Under the counter's own hit sound, vel 0.5.

## Camera

No camera kick: commons never take one (the counter already has its own).

## Images

- `img/shatter-guard-1.webp`: a counter slash cracking the guard of an armoured boss, glassy white shards bursting off the crack and curving back into it.
