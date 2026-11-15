# Colossus

| | |
| --- | --- |
| Id | `colossus` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (46 points) |
| Origin | New |

## Card

**A giant of embers swings its sword once.** (8 words, 40 chars)

- Icon (48×48 line drawing): a huge armoured shoulder and helm outline behind a tiny figure, one long sword line sweeping across the bottom.
- Hover loop (2.0 s): key cap "4" lights (0.2 s); a small figure takes a stance and a giant outline rises behind it in the same stance (0.6 s); both raise their blades (0.3 s); the giant's sword sweeps across the card through the boss, the brighter frame on the hit (0.3 s); the giant crumbles to embers, fade (0.6 s).

## Idea

A warrior of embers twenty metres tall rises out of the floor behind you, takes your stance, and swings one enormous sword through the boss. It is the shadow behind the hero made real: you and it move as one for a breath, then it is gone. One swing, the widest arc in the pool, everything in front of you within fourteen metres.

## Data

```js
{ id: 'colossus', name: 'Colossus', rarity: 'legendary', key: 'ultimate',
  text: 'A giant of embers swings its sword once.',
  power: { when: 'press', then: 'colossus' },
  levels: [
    { charge: 46, damage: 340, reach: 14 },
  ] },
```

Numbers: 340 in one blow for 46 points, 7.4 a point on one boss, a little under the dragon's 8.4; the swing is a 150° arc 14 m deep, so two bosses take 680 and every add in front is cleared. About 680-1000 a fight. On the bar with the area: the 150° arc is worth the gap on one boss.

## Engine work

- New `press/colossus`: `['charge', 'damage', 'reach']`. Not in `ON_ENEMY`: aimed at the target, or the holder's facing with none.
- The swing lands at t = 1.15: `damage` to every enemy whose body is within `reach` m of the holder's position at the press and within `CONFIG.abilities.powers.colossus.arc` = 150° of the aim. The arc is shown on the floor from t = 0.5 (the giant's shadow), so it reads like a told attack.
- The giant is a Blender model (below), its pose driven by the holder's own cast pose and a swing clip of its own.
- `validate.js`: `colossus` needs `damage`, `reach`.

## Multiplayer

The server resolves the arc from the press claim's position and aim at the swing. Enemies only; the giant's sword passes through teammates. Every browser draws the giant (it is the biggest shape in the pool and the party should see it), at full strength within `powerNear` and 50% translucent beyond. One holder per team.

## Model

`tools/blender/colossus.py`: an armoured giant drawn as a shell of molten seams over dark ash plates, 20 m tall when standing (it rises only to the waist out of the floor, so about 12 m shows), a closed helm with two hollow glowing eye slits, a long sword of fire 16 m long. Hard planes, no fine detail (it is seen huge and briefly): about 3k triangles, a skin of 18 bones (spine ×3, arms, hands, helm, sword). Material: the effect shader with an emissive seam map (white-hot seams, ember edges) and ash-black plates with a black ink rim. Animations: `rise` (out of the floor to the waist, 0.5 s), `stance` (mirrors the holder's cast pose), `swing` (a two-handed horizontal cut, wind-up 0.3 s, strike 0.15 s, follow-through 0.3 s), `crumble` (plates fall away as embers, 0.7 s). Baked to `js/baked/`, one in the pool, warmed at load. Seen in the game, not only in previews, before it ships.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Anticipation | Upper-body pose: a wide two-handed stance, blade back over the shoulder; the world dims 20%; the floor behind the holder cracks in a long seam | `#e59a5c` seam |
| 0.20-0.70 | Rise | The giant rises out of the seam to its waist, plates shedding ash, eye slits lighting last | `#2a2420` plates, `#fff3dc` seams, `#e59a5c` edges, `#0b0b0f` ink |
| 0.50-0.85 | Mirror | It takes the holder's stance; its fire sword ignites from hilt to tip; its shadow lays the arc on the floor | `#e59a5c` sword, `#fff3dc` core |
| 0.85-1.15 | Wind-up | Both blades go back together; ember motes stream off the giant | `#e59a5c` |
| 1.15 | Peak (the swing) | The sword sweeps the arc in 0.15 s: a flat smear 14 m long across the arc, white-hot core, ember edge, black ink outline; 40 sparks off the boss. **The impact frame** | `#fff3dc`, `#e59a5c`, `#0b0b0f` |
| 1.15-1.45 | Follow-through | The giant holds the end of the swing; the smear hangs and burns down; the holder holds the same pose | `#e59a5c` |
| 1.45-2.15 | Crumble | Plates fall away from the helm down as glowing embers and ash; the floor seam closes | `#e59a5c` to `#5a5550` |

Budget (Legendary class): 6 pooled meshes (giant model, its fire sword, swing smear, floor arc, floor seam, eye glow) + 40 sparks + 60 embers + 30 ash = 130 particles (72 on Normal), 2 effect lights (the giant's chest seams, the swing; × 0.65 on Normal), 1 ribbon (the sword tip's trail), 1 impact frame at t = 1.15. Peak 0.65 s (0.85-1.45). The giant stands behind the holder and goes 35% translucent where it overlaps a boss winding up. Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

New `abilityColossus`: the rise is a grinding of stone and a furnace roar (brown noise, low-pass 150 to 600 Hz, 0.5 s, plus a crackling fire layer); the wind-up a huge breath in (filtered noise rising 200 to 1 kHz, 0.3 s); the swing a deep whoosh (band-passed noise sweeping 120 to 900 Hz in 0.15 s, panned across) into `abilityBlast`'s transient; the crumble a long fall of embers (crackles over a decaying low rumble, 0.7 s).

## Camera

`CONFIG.camera.feel.powers.colossus = [4.4, 0.18]` at the swing (one of the widest kicks, under Sky Blade's and the Bell's). `colossusRise = [1.2, 0]` at the rise. The camera stays behind the player; the giant is seen rising over their shoulder from their own view.

## Images

- `img/colossus-1.webp`: a twenty-metre giant warrior made of molten ember lines and dark ash rising behind the swordsman and swinging an enormous fire sword through a boss.
- `img/colossus-2.webp`: low angle of the ember giant mirroring the swordsman's stance, both blades raised, the boss tiny before it.
