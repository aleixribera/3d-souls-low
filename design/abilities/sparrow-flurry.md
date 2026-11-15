# Sparrow Flurry

| | |
| --- | --- |
| Id | `sparrow-flurry` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) and the target within the flurry's reach |
| Origin | New |

## Card

**A flurry of {hits} thrusts.** (5 words, 22 chars)

- Icon (48×48 line drawing): a fan of seven short straight thrust lines spreading from one point, like an open wing.
- Hover loop (1.6 s): a small key cap is pressed (0.2 s), the figure plants its feet and a fan of blue thrust lines blurs out in front of it into the boss (1.0 s); hold, fade.

## Idea

The blade blurs into a hundred-arm flurry of thrusts for one second, standing your ground in front of the boss. The strike for the brave: it asks you to stay in range and commit, and a dash gets you out at the cost of the thrusts left.

## Data

```js
{ id: 'sparrow-flurry', name: 'Sparrow Flurry', rarity: 'rare', key: 'strike',
  text: 'A flurry of {hits} thrusts.',
  power: { when: 'press', then: 'flurry' },
  levels: [
    { charge: 15, hits: 10, damage: 9 },
    { charge: 14, hits: 12, damage: 10 },
    { charge: 13, hits: 14, damage: 10 },
  ] },
```

Numbers: 90, 120 and 140 if every thrust lands, over CONFIG.abilities.flurry.time (1 s): 6, 8.6 and 10.8 damage a point, the most of any strike because the holder stands rooted in front of the boss for that second. A boss blow or a dash out cuts it short.

## Engine work

- New power `press/flurry`: ['charge', 'hits', 'damage'] in ABILITY_POWERS. It needs the press target within CONFIG.abilities.flurry.reach (3.5 m); else the key does not fire and keeps its charge. It runs like `blades`: `hits` thrusts spread evenly over `flurry.time`, each wounding the target if it is still within `reach` of the holder.
- The holder plays a flurry pose (a new key pose in js/data/attack-poses.js) and is held in place for `flurry.time`; a dash cancels it and the remaining thrusts are dropped (a `flurryEnd` claim). A blow taken cancels it too.
- `validate.js`: CONFIG.abilities.flurry { reach above 0, time above 0 }.

## Multiplayer

The browser claims the press (and the cancel); the server checks the charge and the range, runs the thrusts on its own enemy and stops them at the cancel. The rooting is the holder's own movement. Enemies only. Every browser draws it.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-1.00 | Fan | A fan of straight thrust lines spreading 60° in front of the player, each drawn in 0.05 s and gone in 0.15 s, ink-edged, a wing shape | `#cfe2f2` line, `#8fb8dc` edge, `#0e1218` ink |
| 0.00-1.00 | Tips | 4 flat blade-tip afterimages held at the fan's end at once, re-placed with each thrust | `#f2f6fa`, `#8fb8dc` |
| each thrust | Spark | 2 hard sparks at the hit point | `#f2f6fa` |
| 1.00-1.25 | Out | The fan's last lines fade outward | `#8fb8dc` to transparent |

Budget (Rare class): 6 pooled meshes (5 thrust-line strips reused in turn, the 4 tips as one mesh) + up to 28 sparks (16 on Normal), 1 effect light (blue, held for the flurry, × 0.65 on Normal), no ribbon, no impact frame. Peak 1.0 s. Reduced motion: the fan's lines hold longer and draw fewer at a time (no flicker).

## Sound

`abilityFlurry` (new, in `js/data/audio.js`): a fast roll of short whistles (white noise band-passed at 3-4 kHz, 25 ms grains, one per thrust), a body of a steady rushing air (pink noise 800-1600 Hz, 1 s), and a tail of a final sharp sting (sine 1.6 kHz, 0.2 s). Each thrust that lands adds a soft tick under the roll.

## Camera

`CONFIG.camera.feel.powers.flurry = [-0.8, 0.02]`: a small pull in at the start; the thrusts themselves add nothing.

## Images

- `img/sparrow-flurry-1.webp`: the swordsman unleashing a blur of countless rapid sword thrusts, dozens of blue thrust-line afterimages fanning out like wings against a boss.
