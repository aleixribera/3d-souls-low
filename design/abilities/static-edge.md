# Static Edge

| | |
| --- | --- |
| Id | `static-edge` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `hits`: every `hits`th blow of yours that lands (unblocked) |
| Origin | Kept from js/data/abilities.js: the same power, text and numbers; the bolt now jumps from the blade instead of falling from above, and the count shows on the blade |

## Card

**Every {hits}th hit: a spark strikes the boss.** (8 words, 40 chars)

- Icon (48×48 line drawing): a blade with three short zigzag ticks along its edge and a zigzag bolt leaving its tip.
- Hover loop (1.6 s): a small figure hits a boss four times, the blade gaining one blue crackle each hit (0.8 s), the fifth hit throws a short zigzag bolt into the boss with a star (0.3 s); fade.

## Idea

The blade gathers static as it hits. The crackle on the edge grows with each blow, so the player sees the bolt coming, and every few hits a short hard bolt jumps to the boss. A plain, steady reward for keeping up pressure.

## Data

```js
{ id: 'static-edge', name: 'Static Edge', rarity: 'rare',
  text: 'Every {hits}th hit: a spark strikes the boss.',
  power: { when: 'hits', then: 'spark' },
  levels: [
    { hits: 5, damage: 30 },
    { hits: 4, damage: 34 },
    { hits: 4, damage: 44 },
  ] },
```

Numbers: 6 extra damage a blow at level I (30 / 5), 8.5 at II, 11 at III, about +40-70% on a light hit. A player landing 50-80 blows a fight adds 300-880. A strong rare, but it asks for blows that land, and its own sparks never count toward the next.

## Engine work

- None for the rule: `hits/spark` exists.
- New: the count is shown. The engine's count lives in abilityPowers (`counts`), where the enemies are owned; the browser keeps its own count of its holder's landed blows for the look only (js/ability-fx.js reads it), reset on each `spark` event. The bolt is drawn from the holder's blade tip to the enemy's chest (CONFIG.VISUALS.abilityFx `spark`: `from: 'blade'` in place of `height`).

## Multiplayer

The server counts the holder's landed blows and resolves the spark on the shared enemy (as today); enemies only. The browser's crackle count is only a look and is set right by each spark event.

## Effect

Layered, timed from the spark (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| each blow | Crackle | One more short jagged line crawling on the blade (1 to `hits` - 1), flickering at 2 Hz | `#8fb8dc`, `#f2f6fa` core |
| 0.00-0.12 | Bolt | A short hard zigzag bolt from the blade tip to the boss, 2-tone, ink edge | `#f2f6fa` core, `#8fb8dc` edge, `#0e1218` ink |
| 0.02-0.20 | Star | A four-pointed impact star on the boss, 0.9 m | `#f2f6fa`, `#8fb8dc` |
| 0.02-0.30 | Sparks | 10 hard spark streaks off the star | `#cfe2f2` |

Budget (Rare class): 3 pooled meshes (blade crackle, bolt, star) + 10 particles (6 on Normal), 1 effect light (blue-white, 0.15 s, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.2 s. Reduced motion: the crackle holds still instead of flickering.

## Sound

`abilitySpark` (kept): the sharp electric snap and crackle. A faint rising crackle tick (noise 5 kHz, 20 ms, one step higher per blow) as the count builds.

## Camera

Kept: `CONFIG.camera.feel.powers.spark = [-0.8, 0.02]`.

## Images

- `img/static-edge-1.webp`: blue static crawling along a sword in mid-combo, a short jagged bolt leaping from the blade into the boss with a star-shaped impact.
