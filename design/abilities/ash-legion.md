# Ash Legion

| | |
| --- | --- |
| Id | `ash-legion` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (44 points) |
| Origin | New |

## Card

**A phantom army charges through the boss.** (7 words, 40 chars)

- Icon (48×48 line drawing): three spear points slanting forward in a row over two horse heads, speed lines behind.
- Hover loop (1.8 s): key cap "4" lights (0.2 s); a small figure sweeps the blade forward (0.2 s); grey riders and spearmen rise from the floor behind it (0.3 s) and charge across the card through a boss silhouette, spear points lit, the brighter frame as the front rank hits (0.8 s); dust settles, fade (0.3 s).

## Idea

Behind you an army of ash rises out of the floor, riders and spearmen with ember eyes, and charges straight through the boss in a two-and-a-half-second stampede. It is the summon made into a technique: not one ally but a flood of them, here for one charge and gone. The boss reels in the middle of the flood while you follow the charge in.

## Data

```js
{ id: 'ash-legion', name: 'Ash Legion', rarity: 'legendary', key: 'ultimate',
  text: 'A phantom army charges through the boss.',
  power: { when: 'press', then: 'legion' },
  levels: [
    { charge: 44, time: 2.5, every: 0.1, damage: 15 },
  ] },
```

Numbers: 2.5 / 0.1 = 25 blows of 15 = 375 for 44 points, 8.5 a point on one boss, on the dragon's floor; the lane hits every enemy in it, so 750 on two bosses lined up and adds trampled. About 750-1100 a fight on one boss.

## Engine work

- New `press/legion`: `['charge', 'time', 'every', 'damage']`. Aimed at the target or along the holder's facing.
- The lane: from 6 m behind the holder's position at the press, through the target and on, `CONFIG.abilities.powers.legion` `length` 26 m, `width` 6 m. From t = 0.55, every `every` s for `time` s, every enemy in the lane takes `damage` (a power's blow: never a counter, never counted for `hits`).
- The figures: two Blender models, `tools/blender/ash_rider.py` (a hooded rider on a lean horse with a lance, about 3 m tall) and `tools/blender/ash_spearman.py` (a hooded spearman mid-stride with a long spear, 2 m), each with a two-frame gallop or stride baked as shape keys, drawn as two instanced meshes (8 riders, 10 spearmen) so the army is two draw calls. Ash-grey flat material with ember eye and spear-point emissive, a black ink rim. Baked to `js/baked/`.
- `validate.js`: `legion` needs its four numbers.

## Multiplayer

The server resolves the lane from the press claim's position and aim. Enemies only: the army passes through teammates and never pushes or hides them (riders are drawn 50% translucent for a teammate inside the lane). One holder per team.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Anticipation | Upper-body pose: the blade swept forward and held level, like an order to charge; the world dims 20%; ash lifts off the floor behind the holder in a wide band | `#5a5550` ash |
| 0.20-0.55 | Rise | Ranks of ash figures rise out of the floor behind the holder, eyes lighting ember one by one, spear points last | `#6a645e` figures, `#e59a5c` eyes and points, `#0b0b0f` ink |
| 0.55 | Peak (the charge hits) | The front rank reaches the boss; spear points flare white-hot; a burst of 30 ember sparks and a shock of dust. **The impact frame** | `#fff3dc` points, `#e59a5c` sparks |
| 0.55-3.05 | Stampede | The ranks pour through the boss and on, each figure fading to ash as it passes the lane's end; a dust wall moves with them; spear points leave short ember streaks; the boss staggers in the flood (the drawing only) | `#6a645e`, `#e59a5c` streaks, `#5a5550` dust |
| 3.05-3.70 | Fade | The last rank breaks into ash and drifts down; the dust settles in a long trail on the floor | `#5a5550` to transparent |

Budget (Legendary class, the opening, then held to it): 6 pooled meshes (2 instanced figure meshes, dust wall sheet, spark sheet, floor trail decal, ash band) + 30 sparks + 60 ash + 40 spear streaks = 130 particles (72 on Normal), 2 effect lights (the front rank's spear points, moving with it; the hit; × 0.65 on Normal), no ribbon, 1 impact frame at t = 0.55. Peak 2.5 s (0.55-3.05). Figures in front of a boss winding up go 35% translucent within 2 m of its weapon, so the tell is never hidden. Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

New `abilityLegion`: a war horn far off (saw at 110 Hz with a slow attack and band-pass at 700 Hz, 0.6 s) as they rise; the stampede a rolling thunder of hooves (low-passed noise at 300 Hz amplitude-gated at 9 Hz, 2.5 s) with armour rattle (band-passed clicks at 3 kHz) and a ghostly shout (pink noise formant at 600 and 1100 Hz, 0.8 s); the hit a heavy clash of spear points (`abilityBlade`'s ring, three at once); tail: ash wind (pink noise at 800 Hz falling, 0.6 s).

## Camera

`CONFIG.camera.feel.powers.legion = [2.8, 0.12]` at the front rank's hit, and `legionRumble = [0.8, 0.02]` at 1.3 and 2.1 s for the rumble. Kicks only; the camera stays the player's.

## Images

- `img/ash-legion-1.webp`: a phantom army of grey ash riders and spearmen with ember eyes charging past the swordsman straight through a boss in a stampede of ash and dust.
- `img/ash-legion-2.webp`: close on ash cavalry passing through the boss, spear points glowing ember orange, the boss staggered in the middle of the flood.
