# Great Wave

| | |
| --- | --- |
| Id | `great-wave` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (42 points) |
| Origin | New |

## Card

**A wave crashes over all in front.** (7 words, 33 chars)

- Icon (48×48 line drawing): a tall wave crest curling over to the right with three foam claws on its lip, a tiny figure at its foot.
- Hover loop (1.8 s): key cap "4" lights (0.2 s); a small figure raises the blade like a conductor (0.3 s); a wave rises behind it, taller than the card's boss silhouette, foam claws curling (0.6 s); it crashes forward, the brighter frame on the crash (0.2 s); spray and a flat foam sheet run out, fade (0.5 s).

## Idea

The blade raised like a conductor's: a painted wave taller than the boss rises behind you, curls over in foam claws and crashes down on everything in front of you. It is Riptide's water grown into the biggest single shape in the pool, and it rewards positioning: line up the boss, or both bosses, in the sixteen metres ahead and bring the sea down on them.

## Data

```js
{ id: 'great-wave', name: 'Great Wave', rarity: 'legendary', key: 'ultimate',
  text: 'A wave crashes over all in front.',
  power: { when: 'press', then: 'greatWave' },
  levels: [
    { charge: 42, damage: 340, width: 10, reach: 16 },
  ] },
```

Numbers: 340 for 42 points is 8.1 a point on one boss, on the dragon's floor; a 10 × 16 m area makes it 680 on two bosses and clears adds. 680-1020 a fight on one boss.

## Engine work

- New `press/greatWave`: `['charge', 'damage', 'width', 'reach']`. Not in `ON_ENEMY`: it fires with no enemy, along the holder's facing, or toward the target if there is one.
- The hit is a box `width` wide and `reach` long from the holder's position at the press, aimed at the press; every enemy in it takes `damage` once at the crash (t = 0.95). The `wave` resolver (Riptide, Tidal Arc) already hits a line `reach` × `width`: reuse it with a delay.
- The wave: a Blender model, `tools/blender/great_wave.py`: one curling crest 12 m wide and 9 m tall in flat bands (deep body, mid band, foam lip with five claw shapes), with a shape key from rising (low, leaning back) to curled (lip over) to crashed (flat); the effect drives the shape key and slides it forward. Baked to `js/baked/`.
- `validate.js`: `greatWave` needs its four numbers.

## Multiplayer

The server resolves the box from the press claim's position and aim, at the crash. The wave hits enemies only and never pushes anyone; a teammate in front sees it crash through them. One holder per team.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Anticipation | Upper-body pose: the blade raised high in one hand, the other hand open behind; the world dims 20%; water beads lift off the floor round the feet and hang | `#8fb8dc` beads, `#e59a5c` blade glow |
| 0.20-0.70 | Rise | The wave rises out of the floor behind the holder, 9 m tall, leaning back; flat painted bands with black ink lines between them; ember light glints on its face from the blade | `#1f2a5c` body, `#2c5f8a` band, `#f2f6fa` foam, `#e59a5c` glints, `#0b0b0f` ink |
| 0.70-0.95 | Curl | It surges forward over the holder and the lip curls over in five foam claws; spray streaks fly off the lip | `#f2f6fa` claws, `#e59a5c` lit spray |
| 0.95 | Peak (the crash) | The lip comes down across the whole box; a flat foam sheet slams out to the box's edges; 40 spray streaks thrown up. **The impact frame** | `#f2f6fa` sheet, `#e59a5c` spray |
| 0.95-1.60 | Run | The water runs on to the far end of the box as a low foam line, ember-lit spray falling in arcs | `#2c5f8a`, `#f2f6fa`, `#e59a5c` |
| 1.60-2.30 | Fade | The foam sheet breaks into flat rings and drains into the floor; a wet sheen on the stone that fades | `#8fb8dc` to transparent |

Budget (Legendary class): 7 pooled meshes (wave model, foam sheet, foam rings ×2, spray card sheet, blade glow, wet sheen decal) + 24 beads + 40 spray + 30 droplets = 94 particles (52 on Normal), 2 effect lights (one on the wave's face from the blade, one at the crash; × 0.65 on Normal), no ribbon, 1 impact frame at t = 0.95. Peak 0.65 s. The wave is opaque only behind the boss; in front of a boss winding up it goes 35% translucent within 2 m of the weapon. Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

New `abilityGreatWave`: a deep inhale of water as it rises (brown noise, low-pass rising 200 to 900 Hz over 0.7 s, slow swell), a hiss of spray off the lip (high-passed noise at 5 kHz, 0.25 s), the crash (`abilityBlast`'s transient with a band-passed noise body at 600 Hz, 1.2 s) and a long tail of water running away (pink noise, band-pass falling 1.2 kHz to 300 Hz, 1 s). `abilityWave`'s slap layered on the crash ties it to Riptide.

## Camera

`CONFIG.camera.feel.powers.greatWave = [3.6, 0.2]` at the crash (wide and heavy). Nothing during the rise; the camera stays the player's, so a wave rising behind them reads from their own view.

## Images

- `img/great-wave-1.webp`: a towering painted-style wave of deep indigo water with white foam claws and ember-lit spray rising behind the swordsman and curling over a boss.
- `img/great-wave-2.webp`: the great wave crashing down on the boss, foam claws and spray filling the frame.
