# Overcharge

| | |
| --- | --- |
| Id | `overcharge` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `ready`: one of your number keys is full and you keep earning points without pressing it |
| Origin | New |

## Card

**A full key overcharges: up to {damage} stronger.** (8 words, 41 chars)

- Icon (48×48 line drawing): a square key cap with a jagged rim of short zigzags breaking out of its edge.
- Hover loop (2.0 s): a small key cap fills (0.4 s), keeps filling past full while a blue crackling rim grows round it (0.8 s), then fires and the technique comes out larger, ringed in blue arcs (0.5 s); fade.

## Idea

A full key keeps charging past full, and its technique comes out stronger the longer you hold it. Risk for size: holding a strike or an ultimate through a dangerous stretch of the fight, then spending it big at the opening.

## Data

```js
{ id: 'overcharge', name: 'Overcharge', rarity: 'rare',
  text: 'A full key overcharges: up to {damage} stronger.',
  perk: { when: 'ready', then: 'overcharge' },
  levels: [
    { damage: 0.3 },
    { damage: 0.45 },
    { damage: 0.6 },
  ] },
```

Numbers: points earned past full fill an overcharge of the same size as the key's own `charge` (a 14-point key overcharges fully at 28 points, about another 14 s of good play). The technique fires × (1 + `damage` × the share filled): at most +30-60%. Waiting a whole second charge for +60% is roughly even with firing twice, so the gain is choosing the moment, not raw damage.

## Engine work

- New perk `ready/overcharge`: ['damage'] in ABILITY_PERKS. abilityGain lets a full key's count run on up to twice its `charge` when the kit holds it (`st.charge[key]` up to 2 × `charge`).
- A press takes the share past full, `over = (count - charge) / charge`, and raises the fired level's numbers: `damage` and `heal` by × (1 + `damage` × over); a summon's `damage` a blow. Times, reaches and radii stay as they are. The raised numbers are a copy made once per press (not per frame).
- The HUD key cap draws the overcharge as a second ring round the cap.

## Multiplayer

The server already counts each key's charge from the claims it accepted; it counts the overcharge the same way, and a press's raise uses its own count (with CONFIG.abilities.press.slack as for any press). Only the holder's techniques are raised.

## Effect

Layered, timed from the key going past full (t = 0) and the press (p):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0 to full | Rim | The HUD key cap grows a crackling outer rim of short blue zigzags, one more for each fifth of the overcharge | `#8fb8dc`, `#f2f6fa` core |
| 0 to p | Hand | 2-3 small blue arcs crawling round the sword hand, more as it fills | `#8fb8dc`, `#f2f6fa` |
| p, 0.00-0.40 | Release | 4 hard blue arcs ringing the technique's own effect at its start, scaling with the share | `#8fb8dc` edge, `#f2f6fa` core, `#0e1218` ink |

Budget (Rare class): 2 pooled meshes (hand arcs, release arcs) + 12 sparks at the release (7 on Normal), no effect light (the technique has its own), no ribbon, no impact frame. Peak 0.4 s, on top of the technique's own budget. Reduced motion: the arcs hold still instead of crawling.

## Sound

`abilityOvercharge` (new, in `js/data/audio.js`): a quiet electric hum under the full key (saw 110 Hz low-passed at 600 Hz, gain rising with the share), and on the press a transient of a sharp crack (white noise high-passed at 4 kHz, 20 ms, driven) laid over the technique's own sound.

## Camera

No new kick: the technique fired has its own `powers` entry; the overcharge adds nothing to it.

## Images

- `img/overcharge-1.webp`: the swordsman holding a glowing technique back, crackling blue arcs building around their sword hand, energy overflowing.
