# Bloodthirst

| | |
| --- | --- |
| Id | `bloodthirst` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `streak`: `hits` of your blows land in a row without you losing health |
| Origin | Kept from js/data/abilities.js: the same perk, text and numbers; each blow of the streak is now shown |

## Card

**{hits} hits unhurt: heal {heal}.** (5 words, 22 chars)

- Icon (48×48 line drawing): five small dots in an arc curling inward into a heart-shaped drop.
- Hover loop (1.8 s): a small figure hits a boss five times (one blue dot pops off per hit, 0.15 s apart, 0.8 s), the five dots spiral into the figure (0.4 s), a soft blue ring at its feet; hold, fade.

## Idea

A clean streak drinks back health: the reward for playing well rather than for a flask. Each blow of the streak shows its mote, so the player can see the count and play for the fifth hit, and a blow taken scatters the motes and resets it.

## Data

```js
{ id: 'bloodthirst', name: 'Bloodthirst', rarity: 'rare',
  text: '{hits} hits unhurt: heal {heal}.',
  perk: { when: 'streak', then: 'heal' },
  levels: [
    { hits: 5, heal: 0.08 },
    { hits: 5, heal: 0.11 },
    { hits: 5, heal: 0.14 },
  ] },
```

Numbers: a good player lands 40-80 blows a fight with 6-12 clean streaks of five, healing 50-100% of the bar at level I and up to 1.7 bars at level III over a whole fight, but only while not being hit: the heal follows good play and never saves a bad stretch. A flask heals about 40%.

## Engine work

- None for the rule: `streak/heal` exists (abilityLanded).
- New event for the count: abilityLanded emits `abilityPerk` with `perk: 'streak/step'` and `n` (1 to `hits` - 1) for each blow of the streak, and abilityHurt emits `perk: 'streak/lost'` when it resets a streak above 0. js/ability-fx.js keeps the motes on 5 pooled meshes.

## Multiplayer

Health is the client's own: the browser counts the streak and heals its own body. Only the holder heals; nothing reaches a teammate.

## Effect

Layered, timed from each landed blow of the streak (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Mote | A hard-edged diamond mote torn off the hit point, a blue shell with a thin red thread in its core, flying to orbit the player's chest at 0.6 m | `#8fb8dc` shell, `#a8303a` thread, `#0e1218` ink |
| last hit, 0.00-0.40 | Spiral | All motes spiral inward into the chest and vanish | as above |
| last hit, 0.35 | Ring | A soft-edged heal ring at the feet, 0.5 to 1.6 m | `#8fb8dc` to transparent |
| reset | Scatter | Held motes fall to the floor and fade over 0.3 s | `#8fb8dc` |

Budget (Rare class): 6 pooled meshes (5 motes, 1 ring) + 14 heal flakes on the last hit (8 on Normal), no effect light, no ribbon, no impact frame. Peak 0.4 s. Reduced motion: the motes orbit without bobbing.

## Sound

`abilityHeal` (kept) on the last hit. New `abilityMote` per blow of the streak: a short glassy tick (sine 1.2 kHz with a 2.76 partial, 60 ms), its pitch rising one step per mote so the fifth sounds near.

## Camera

No camera kick: a heal never moves the view. No `powers` entry.

## Images

- `img/bloodthirst-1.webp`: five glowing motes torn from a boss by consecutive sword hits spiralling back into the swordsman, cool blue with a thread of red.
