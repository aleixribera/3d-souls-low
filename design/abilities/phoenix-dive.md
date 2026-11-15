# Phoenix Dive

| | |
| --- | --- |
| Id | `phoenix-dive` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (42 points) |
| Origin | New |

## Card

**Dive through the boss {strikes} times in fire.** (8 words, 38 chars)

- Icon (48×48 line drawing): a bird's spread wings and long tail drawn in three strokes, diving down-left, a small X behind it.
- Hover loop (1.8 s): key cap "4" lights (0.2 s); a small figure crouches and bursts into a bird of flame (0.2 s); three dives through a boss silhouette from three sides, each leaving a fire line, the lines crossing into a star, one brighter frame on the third (0.9 s); the figure lands in a held pose as the star burns (0.5 s).

## Idea

The Ultimate that is you. You burst into a great bird of fire and dive through the boss three times from three angles, untouchable while you fly, then land in a held pose as the crossed trails burn behind you. It is the Finishing Blow's flash steps grown into a technique: the body itself becomes the effect. It also gets you out of trouble, because you can't be hit while you are a bird.

## Data

```js
{ id: 'phoenix-dive', name: 'Phoenix Dive', rarity: 'legendary', key: 'ultimate',
  text: 'Dive through the boss {strikes} times in fire.',
  power: { when: 'press', then: 'phoenix' },
  levels: [
    { charge: 42, strikes: 3, damage: 120 },
  ] },
```

Numbers: 3 × 120 = 360 for 42 points, 8.6 a point, on the dragon's floor of 8.4, plus a 1.55 s untouchable (a cast in the middle of a boss combo dodges the rest of it). 720-1080 a fight.

## Engine work

- New `press/phoenix`: `['charge', 'strikes', 'damage']`, in `ON_ENEMY`.
- The dive is the holder's own movement, like the Finishing Blow's flash steps (`js/finisher.js`): `strikes` dives, each 0.3 s, through the target's body from three angles 120° apart (`CONFIG.abilities.powers.phoenix`: `rise` 4 m, `past` 3 m beyond the far edge, `gap` 0.12 s between dives), driven as a velocity so the body physics keeps it out of walls and off edges. Each dive's pass through the body lands `damage` on the target and every enemy within 1.5 m of the path.
- The holder is untouchable from the burst to the landing (0.25-1.8 s) and for `grace` 0.2 s after; the Ultimate's key pose replaces the run, the camera stays theirs; at the end, control is back at once, as after a Finishing Blow.
- The player's body is hidden during the dives and the phoenix model drawn in its place.
- `validate.js`: `phoenix` needs `strikes` (whole) and `damage`.

## Multiplayer

The client owns its own movement, so it moves its body along the dives from the server-confirmed press, and claims each pass; the server checks each against the path it worked out from the same target (range and timing) and resolves the damage. The holder's untouchable time is checked like a dodge's. Teammates in the path are untouched; the bird passes through them. One holder per team.

## Model

The phoenix is a Blender model, `tools/blender/phoenix.py`: a firebird about 5 m from beak to tail tip, 6 m wingspan, flat-shaded hard planes (a swept head, two wings of four long feather blades each, a tail of five streamers 3 m long), its own bones (wing root, wing tip, tail ×3). Material: the effect shader, white-hot core faces, ember outer faces, a black ink rim. Animations: `burst` (unfolding from a ball, 0.2 s), `dive` (wings swept back, tail streaming), `turn` (a wing beat up and over, 0.12 s), `fold` (into the player's landing, 0.15 s). Baked to `js/baked/`; one in the pool, warmed at load.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.25 | Anticipation | A crouch on the spot, blade held low behind; ember feathers flicker up off the scarf and shoulders; the world dims 20% | `#e59a5c` feathers |
| 0.25-0.45 | Burst | The body vanishes in a ball of white fire that unfolds into the phoenix, rising 4 m; 24 burning feathers scatter | `#fff3dc` core, `#e59a5c` wings, `#0b0b0f` ink |
| 0.45-0.75 | Dive 1 | It dives through the boss: a fire trail ribbon 1.5 m wide along the path, a burst of 16 sparks at the pass | `#e59a5c` trail, `#fff3dc` core |
| 0.87-1.17 | Dive 2 | A wing beat up and over, then through from 120° round; its trail crosses the first | as above |
| 1.29-1.59 | Dive 3 (peak) | The third pass; the three trails form a burning star through the boss. **The impact frame** on the third pass | as above |
| 1.59-1.80 | Landing | The bird folds into the player in a held pose 3 m past the boss, back turned, blade out to the side; a shock ring at the feet | `#e59a5c` ring |
| 1.80-3.00 | Burn | The three trails hang in the air and burn down from their ends inward; feathers drift down and go out | `#e59a5c` to `#7a1f12` to transparent |

Budget (Legendary class): 8 pooled meshes (the phoenix model, burst sphere, 3 trail sheets, shock ring, landing ring, blade glow) + 24 feathers + 3 × 16 sparks + 30 embers = 102 particles (56 on Normal), 2 effect lights (one riding the bird, steady, so the passes light the arena as it moves and never strobe; one for the third pass and the landing; × 0.65 on Normal), 2 ribbons (the bird's two tail streamers' trail), 1 impact frame at t = 1.29. Peak 1.35 s (0.45-1.80). Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

New `abilityPhoenix`: a fire whoosh as it bursts (pink noise, band-pass 400 to 1800 Hz, 0.3 s) with a bird's high cry (a saw at 1.6 kHz bending to 2.4 kHz and back, 0.25 s, heavy reverb); each dive a roaring pass-by (low-passed noise sweeping 300 to 1200 Hz and back, a fast pan from one side to the other, 0.3 s) with a crackle at the pass; the third pass adds `abilityBlast`'s transient. The landing: a soft fire thump and embers ticking.

## Camera

`CONFIG.camera.feel.powers.phoenix = [3.2, 0.1]` at the burst; each pass uses `strike = [-1.8, 0.06]`. The camera follows the holder's body through the dives as it follows any move (it never cuts or orbits).

## Images

- `img/phoenix-dive-1.webp`: the swordsman transformed into a great ember orange firebird with a white-hot core and long tail feathers diving through a boss, earlier fiery trails crossing in the air.
- `img/phoenix-dive-2.webp`: the swordsman landing in a held pose with burning feathers drifting down while three crossing fire trails burn across the boss behind them.
