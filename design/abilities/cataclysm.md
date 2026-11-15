# Cataclysm

| | |
| --- | --- |
| Id | `cataclysm` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (42 points) |
| Origin | Kept from `js/data/abilities.js`. Changed: one level; 300 damage at radius 8 (was 180 at 7 and 240 at 8), charge 42 (was 40 and 36); the blast now lands after a ring of cracks instead of at once, and it gets its own look (it drew Meteor Fall's burst). |

## Card

**A blast hits all within {radius}.** (6 words, 26 chars)

- Icon (48×48 line drawing): a sword driven point-down into a short ground line, four crack lines running out from it, a half-dome arc over it.
- Hover loop (1.6 s): key cap "4" lights (0.2 s); a small figure drives the blade into the ground (0.3 s); ember cracks race out in a ring (0.4 s); a dome swells and bursts, the one brighter frame (0.2 s); slabs fall, fade (0.5 s).

## Idea

The one Ultimate that answers a crowd. The blade goes into the floor, ember cracks race out round you, and a dome of white fire rises and bursts. Every enemy within eight metres takes it, so it is the pick for the fights with two bosses and for the boss that calls its adds; against one boss it is a big, honest hit you have to be close to land.

## Data

```js
{ id: 'cataclysm', name: 'Cataclysm', rarity: 'legendary', key: 'ultimate',
  text: 'A blast hits all within {radius}.',
  power: { when: 'press', then: 'blast' },
  levels: [
    { charge: 42, radius: 8, damage: 360 },
  ] },
```

Numbers: 360 a cast for 42 points is 8.6 a point against one boss, on the dragon's floor of 8.4; against two bosses it is 720. It asks the holder to stand within 8 m, inside the boss's reach. Two or three casts a fight: 720-1080 on one boss, double that on two.

## Engine work

- `press/blast` exists (round the holder). New: the blast lands `CONFIG.abilities.powers.cataclysm.lead` = 0.45 s after the press (the cracks' run), centred where the holder stood at the press, so the cracks show the whole reach before it lands, as the bosses' own area attacks must (PLAN rework item 4).
- `js/ability-fx.js`: its own drawing for `power === 'cataclysm'` (Meteor Fall keeps the column-and-crater look).
- The floor slabs: one Blender model (`tools/blender/cataclysm_slabs.py`, six broken flagstones in one mesh with a bone each, baked to `js/baked/`), thrown and dropped by the effect.

## Multiplayer

The server resolves it at its `lead` from the press claim's position (checked against the body it knows, within its usual slack). It hits enemies only; a teammate inside the ring is untouched and sees the dome pass through them. No shared buff.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Anticipation | Upper-body pose: both hands on the hilt, the blade driven point-down into the floor. The world dims 20% | `#e59a5c` blade glow |
| 0.10-0.45 | Cracks | Eight jagged crack decals race out from the blade to the full 8 m radius, ember edges, white-hot cores; a thin ring traces the edge at the end | `#fff3dc` core, `#e59a5c` edge, `#0b0b0f` ink |
| 0.30-0.45 | Swell | A flat-shaded dome rises out of the cracks to 3 m high, 2 tones: white-hot top, ember skirt, a black ink outline | `#fff3dc`, `#e59a5c`, `#0b0b0f` |
| 0.45 | Peak (burst) | The dome bursts: a hard shock ring runs out to 8 m in 0.2 s; 40 sharp ember shards and 6 slabs thrown up. **The impact frame** | `#fff3dc` ring, `#e59a5c` shards |
| 0.45-1.10 | Slabs | Six floor slabs arc up 2-4 m and fall back with small dust bursts; 30 ember motes rise | `#4a4440` slabs, `#e59a5c` motes |
| 0.60-1.60 | Fade | The cracks cool from ember to dull red to black; a low heat shimmer over the ring | `#e59a5c` to `#7a1f12` to `#2a1a12` |

Budget (Legendary class): 13 pooled meshes (crack decal sheet, edge ring, dome, shock ring, slab model with 6 bones counted as 6, blade glow, heat plane, dust card ×2) + 40 + 30 + 24 dust = 94 particles (52 on Normal), 2 effect lights (the swell, the burst; × 0.65 on Normal), no ribbon, 1 impact frame at t = 0.45. Peak 0.65 s. Reduced motion: the impact frame becomes a 30% darken, no shake, the cracks fade in rather than race.

## Sound

`abilityBlast` kept as the burst (at t = 0.45). New `abilityCrack` before it: a grinding stone crack (brown noise, band-pass 300 to 900 Hz, sharp clicks every 40 ms, 0.4 s) from t = 0.05, and a rising sub (sine 30 to 55 Hz, 0.4 s) so the burst lands on a swell. Tail: falling slabs, three short thuds (low-pass noise 200 Hz, 60 ms each) at 0.8, 0.95 and 1.05 s.

## Camera

`CONFIG.camera.feel.powers.blast = [4, 0.24]` kept for the burst (a wide kick and a dip). Nothing during the cracks; the camera stays the player's.

## Images

- `img/cataclysm-1.webp`: the swordsman driving the blade into the ground as glowing ember cracks race outward in a ring and a white-hot dome of fire swells and bursts around a boss.
- `img/cataclysm-2.webp`: aerial view of a ring-shaped shockwave of ember fire bursting outward over a dark arena, floor slabs thrown up.
