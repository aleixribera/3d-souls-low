# Grave Hound

| | |
| --- | --- |
| Id | `grave-hound` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (20, 18, 16 points) |
| Origin | Kept from js/data/abilities.js: numbers and text unchanged; the green grave-fire becomes black ink and blue fire, the hide shows its ribs, it leaps out of its holder's shadow instead of a fire pool, and its bites leave blue tooth marks. |

## Card

**A hound hunts the boss for {time}.** (7 words, 29 chars)

- Icon (48×48 line drawing): a lean hound's head and forelegs in mid-leap, ribs drawn as three curved lines, one eye a dot.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a hound leaps up out of a small figure's shadow (0.3 s), runs to the boss's flank and bites twice, each bite leaving a blue mark (1.0 s); it throws its head back in a howl and the boss turns to it; fade.

## Idea

A gaunt spectral hound of the grave leaps out of your shadow and hunts the boss's flank, biting again and again, and howls to turn the boss on itself for a moment. The summon that is all pace: fast, low, always moving round the boss, the companion that makes a solo fight feel like a pack hunt.

## Data

```js
{ id: 'grave-hound', name: 'Grave Hound', rarity: 'rare', key: 'summon',
  text: 'A hound hunts the boss for {time}.',
  power: { when: 'press', then: 'hound' },
  levels: [
    { charge: 20, time: 8, every: 1.2, damage: 16, draw: 2 },
    { charge: 18, time: 10, every: 1.1, damage: 20, draw: 2.5 },
    { charge: 16, time: 12, every: 1, damage: 24, draw: 3 },
  ] },
```

Numbers: after its 0.7 s arrival it bites about 6, 8 and 11 times at levels I-III: about 100, 170 and 265 damage a call, plus 2-3 s of the boss's attention. 20 points at 1-1.4 a second is a hound every 14-20 s, so it is out about half the fight at level III. Unchanged from the shipped entry; it is the summons' measuring stick.

## Engine work

- None for the rule: `press/hound` is in `ABILITY_POWERS`, `hound` in `SUMMONS` and `SUMMON_STRIKERS`, and `CONFIG.abilities.summons.hound` places it.
- Drawing (js/summon-hound.js): the arrival rises from an ink pool in the holder's shadow, not a fire pool; the colours in `VIS.abilityFx.hound` change to the rare palette below; each bite leaves a tooth-mark decal on the boss; the shader's `bone` term draws the ribs brighter.
- Summon pools are built when a player in the run takes the ability (at the pick screen, between fights) and warmed then, never mid-fight; four of a kind at most (one a player).

### Model

- Kept: `tools/blender/hound.py`, packed to `js/baked/hound.js` (`node tools/pack-baked.cjs hound`). Reworked in place: the hide over the ribcage is cut away into five rib bars with gaps between them, the spine shows as a ridge of knuckles, the tail ends in a ragged ink brush tip.
- Look: a lean, long-legged grave hound, all ribs and sinew, its body of black brush ink with blue fire licking along its back and edges, two blue eyes. Nothing like any enemy's dog.
- Height: 1.0 m at the shoulder, 1.6 m nose to tail.
- Material: the summon fresnel shader as now: an ink-dark body (`#0b0d12`, `body` 0.22), bright blue rims (`#8fb8dc`, `rim` 2.6), ribs and teeth in a brighter `bone` term (`#cfe4f2`), eyes and the fire along the spine in white-hot `#f2f6fa`.
- Rig: one rigid piece per joint on pivots (`HOUND_JOINTS`), as now; about 2,500 triangles.
- Animations (all moved by hand in js/summon-hound.js): arrive (it claws up out of the shadow pool and lands at a run, 0.55 s), idle (a low prowl round the boss), run (a gallop above 5 m/s), strike (a lunge with the jaws snapping 30% of the way in, 0.42 s), draw (its head thrown back in a 1.1 s howl), leave (it burns away from the head down, 0.7 s, ash and blue motes falling). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away (its drawn boss is freed). The server owns the hound: it places it, bites for it, and once it has arrived lets it draw the boss's eye for `draw` s (2-3 s), the boss fighting it instead of anyone; it can't be hurt, and an attack begun on it ends on it. It never blocks, pushes or heals a teammate: it has no collision with players and teammates' bodies and blows pass through it. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each bite (t = b):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.55 | Arrive | An ink pool spreads in the holder's shadow; the hound claws up out of it and leaps, blue fire catching along its spine; 12 ink drops fly | `#0b0d12` pool, `#8fb8dc` fire, `#f2f6fa` eyes |
| 0.55-`time` | Hunt | It runs to the boss's flank and prowls; blue fire streams back off its spine and tail; 1 mote every 0.09 s | `#8fb8dc` |
| b-b+0.15 | Bite | A lunge; on the snap a crescent of white tooth-marks stamps onto the boss at the bite point, and 8 hard blue sparks spray | `#f2f6fa` marks, `#8fb8dc` sparks |
| b+0.15-b+1.0 | Marks | The tooth-marks fade on the boss | to transparent |
| draw | Howl | Its head thrown back; a thin ring of blue light rises off it | `#8fb8dc` |
| `time`-+0.7 | Leave | It burns away from the head down, ash and blue motes falling | `#9a958c`, `#8fb8dc` |

Budget (Rare summon class): the model + 3 pooled meshes (ink pool, tooth-mark decal, howl ring) + 24 particles at the arrival and 8 a bite (at most 40 alive; 22 on Normal), 1 effect light while striking (blue, 0.2 s a bite, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.15 s a bite. Bites come at most once a second, under 3 Hz. Reduced motion: no change needed.

## Sound

Unchanged: `abilityHound` on the call (a breath of cold fire, a growl, a far bell), `abilityBite` on each bite (the jaws' clack, a tearing snarl, a thump), `abilityHowl` on the draw (a long rising cry over cold wind). The arrival's fire layer is band-passed higher (900 Hz to 2.6 kHz) to sound colder.

## Camera

Unchanged: `CONFIG.camera.feel.powers.hound = [1.4, 0.05]` on the call, `bite = [-0.5, 0.02]` on each bite, `draw = [1.2, 0.03]` on the howl.

## Images

- `img/grave-hound-1.webp`: a lean spectral hound of black ink and blue fire leaping out of the swordsman's shadow toward a boss, ribs showing, eyes glowing blue.
