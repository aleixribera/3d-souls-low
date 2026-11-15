# Mire Serpent

| | |
| --- | --- |
| Id | `mire-serpent` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (20, 18, 16 points) |
| Origin | New |

## Card

**A serpent coils round the boss for {time}.** (8 words, 37 chars)

- Icon (48×48 line drawing): a long eel-like body spiralling up round an upright pillar shape, its finned head raised beside the top.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a black pool opens under the boss (0.2 s); a serpent of black water rises out of it and coils up round the boss's body (0.5 s); it squeezes in slow pulses, its spines flaring blue, while the boss keeps moving with it (0.8 s); fade.

## Idea

A long serpent of black water rises from a pool under the boss and coils round its body, crushing it in slow pulses. The boss still moves and fights; the serpent rides with it, squeezing, and its raised head draws the boss's eye. It is the summon you can't lose track of: wherever the boss goes, the coils go too, and every pulse is visible damage.

## Data

```js
{ id: 'mire-serpent', name: 'Mire Serpent', rarity: 'rare', key: 'summon',
  text: 'A serpent coils round the boss for {time}.',
  power: { when: 'press', then: 'serpent' },
  levels: [
    { charge: 20, time: 6, every: 0.5, damage: 9, draw: 2 },
    { charge: 18, time: 7, every: 0.5, damage: 10, draw: 2.3 },
    { charge: 16, time: 8, every: 0.5, damage: 11, draw: 2.6 },
  ] },
```

Numbers: after its 0.7 s arrival it squeezes twice a second: about 10, 12 and 14 squeezes, so about 95, 125 and 160 damage a call, below the hound for the same charge, paid back by the surest damage of any summon (it can't be outrun or left behind) and 2-2.6 s of the boss's attention. 20 points at 1-1.4 a second is a serpent every 14-20 s.

## Engine work

- New power `press/serpent` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'damage', 'draw']`); `serpent` joins `SUMMONS`, `SUMMON_STRIKERS` and `ON_ENEMY`.
- `CONFIG.abilities.summons.serpent: { gap: 0.8, flank: 1.2, speed: 40, height: 1.6, reach: 3, rises: true, coil: true }`: a new `coil` flag keeps it on its enemy. Its body is drawn round the enemy's own place each frame; its place in the engine (where its head stands, and its decoy while it draws) is `gap` m off the enemy's side at `flank`, followed at `speed` so it never falls behind. The squeezes never stop or slow the boss: it moves, turns and attacks as usual.
- Drawing: a new `js/summon-coil.js`: the body as a chain of rigid segments laid along a helix round the enemy (radius the enemy's `radius` + 0.2 m, three turns rising to 60% of its `height`), the head on its own pivot.
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/mire_serpent.py`, packed to `js/baked/mire-serpent.js` (`'mire-serpent': { sources: ['mire_serpent'] }`).
- Look: a long eel-like serpent of black water, smooth and glossy, with a ridge of tall, thin, hard-edged spines down its back and two long fin-frills behind its head; a blunt, eyeless head with a wide mouth and one row of needle teeth; its spines and fin edges glow blue.
- Size: about 6 m long, 0.35 m thick at its widest; its head rises to 2.6 m.
- Material: the summon fresnel shader: an ink-dark glossy body (`#0b0d12`, with a cold specular band so it reads as wet), blue rims and spines (`#8fb8dc`), the spine tips and teeth white-hot (`#f2f6fa`).
- Rig: twelve body segments plus head and jaw, each a rigid piece placed along the helix by the drawing code (no skeleton); about 2,400 triangles in all.
- Animations: arrive (a black pool opens under the boss, and the serpent rises from it and winds up the boss's body from the feet, 0.7 s), idle (the coils slide slowly round the body; the head sways beside the boss), strike (a squeeze: the coils tighten 10% and the spines flare, 0.2 s, then ease), draw (the head rears up in front of the boss with its mouth open and frills spread, 1 s), leave (the coils unwind downward and pour back into the pool as water, which closes, 0.7 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the serpent: it places it, squeezes for it and draws the boss's eye with its head for `draw` s (2-2.6 s) after it arrives; it can't be hurt, and an attack begun on it ends on it. It is wrapped round the boss only, with no collision: it never blocks, pushes or heals a teammate, and teammates strike the boss through its coils. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each squeeze (t = h):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Pool | A flat black pool opens on the floor under the boss, 1 m wider than it, hard edge, blue rim | `#0b0d12` pool, `#8fb8dc` rim |
| 0.20-0.70 | Rise | The serpent rises from it and winds up the body; 14 water droplets thrown off | `#0b0d12` body, `#8fb8dc` spines, `#f2f6fa` droplets |
| h-h+0.20 | Squeeze | The coils tighten; the spines flare white-blue along their length; 4 droplets squeezed out | `#f2f6fa` spine tips, `#8fb8dc` |
| draw | Rear | The head rears with frills spread; a ring of blue light round its neck | `#8fb8dc` |
| `time`-+0.7 | Leave | The coils unwind and pour back into the pool, which shrinks and closes | `#0b0d12` to transparent |

Budget (Rare summon class): the model (the segments drawn as one instanced mesh) + 2 pooled meshes (the pool decal, the neck ring) + 14 droplets at the rise and 4 a squeeze (at most 30 alive; 17 on Normal), 1 effect light while striking: a low steady blue glow from the spines, never pulsed per squeeze (two a second is safe, but a steady light reads better). No ribbon, no impact frame. Reduced motion: the spines brighten without the flare. The coils stay below the boss's shoulders, never over its arms or weapon, so every wind-up stays readable.

## Sound

`abilitySerpent` (new, in `js/data/audio.js`) on the call: a transient of a deep plunge (sine 70 Hz with a 2.4 partial, 2 ms attack, 0.3 s), a body of water rising and pouring (band-passed noise sweeping 300 Hz to 1.2 kHz, 0.6 s, with a gurgle of 8 Hz amplitude wobble), a tail of a low wet hiss (pink noise high-passed at 2 kHz, 0.5 s). `abilityCoil` on each squeeze: a creak of pressure (sawtooth 65 Hz, low-passed at 250 Hz, 0.15 s) at low gain, every other squeeze only, so it reads as a slow pulse. On the draw a long hiss from the open mouth (white noise band-passed at 5 kHz, 0.8 s).

## Camera

`CONFIG.camera.feel.powers.serpent = [1.6, 0.06]` as it rises; no kick a squeeze; `draw = [1.2, 0.03]` on the rear.

## Images

- `img/mire-serpent-1.webp`: a long eel-like serpent of black water with glowing blue spines rising from a pool and coiling around a boss's body.
