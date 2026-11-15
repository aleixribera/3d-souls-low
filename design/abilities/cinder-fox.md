# Cinder Fox

| | |
| --- | --- |
| Id | `cinder-fox` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (16, 15, 14 points) |
| Origin | New |

## Card

**A fire fox circles the boss for {time}.** (8 words, 34 chars)

- Icon (48×48 line drawing): a small running fox with one long sweeping tail, drawn on a circle that its tail continues.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a fox of blue-white flame darts out (0.3 s) and runs rings round the boss's legs, slashing as it passes, a ring of flame left on the floor (1.1 s); the boss turns to snap at it; fade.

## Idea

A quick fox of blue fire runs rings round the boss, slashing at its legs as it passes and leaving a ring of flame on the floor behind it. It is the cheapest summon and the busiest to watch: it never stands still, so it is always visible, and it draws the boss's eye only for a moment.

## Data

```js
{ id: 'cinder-fox', name: 'Cinder Fox', rarity: 'rare', key: 'summon',
  text: 'A fire fox circles the boss for {time}.',
  power: { when: 'press', then: 'fox' },
  levels: [
    { charge: 16, time: 8, every: 1, damage: 12, draw: 1 },
    { charge: 15, time: 9, every: 0.9, damage: 14, draw: 1.2 },
    { charge: 14, time: 10, every: 0.8, damage: 16, draw: 1.4 },
  ] },
```

Numbers: after its 0.7 s arrival it slashes about 7, 9 and 11 times: about 85, 125 and 180 damage a call, the lowest of the strikers, at the lowest charge (16-14 points, a fox every 11-16 s at 1-1.4 points a second), with 1-1.4 s of the boss's attention. It is the summon a player can have out most of the fight.

## Engine work

- New power `press/fox` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'damage', 'draw']`); `fox` joins `SUMMONS`, `SUMMON_STRIKERS` and `ON_ENEMY`.
- `CONFIG.abilities.summons.fox: { gap: 1.4, flank: 0, speed: 12, height: 0.6, reach: 1.6, orbit: 2.2 }`: a new `orbit` (rad/s) turns its `flank` round the enemy with the summon's own clock (`flank + orbit × (clock - called)`), so it circles the boss, and every client, working it out from the same clock, puts it in the same place.
- The flame ring is drawing only: it does no damage of its own and blocks no one.
- Drawing: a beast like the hound (js/summon-hound.js grows into a shared `js/summon-beasts.js` for rigid-joint animals: the hound, the fox, the bear, the hawk, the owl).
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/cinder_fox.py`, packed to `js/baked/cinder-fox.js` (`'cinder-fox': { sources: ['cinder_fox'] }`).
- Look: a small, sleek fox, long-legged and narrow, large pointed ears, one long sweeping tail longer than its body that breaks into flame tongues at its tip; its body an ink-dark core under a shell of blue-white flame shapes, hard-edged like cut paper.
- Size: 0.55 m at the shoulder, 1.5 m nose to tail tip.
- Material: the summon fresnel shader: ink-dark core (`#0b0d12`, `body` 0.25), flame-tongue edges blue (`#8fb8dc`, a high `rim`), the tail tip and eyes white-hot (`#f2f6fa`), a fast `flicker`.
- Rig: one rigid piece per joint on pivots, like the hound (body, neck, head, jaw, four legs in two parts, three tail segments); about 1,800 triangles.
- Animations: arrive (it darts out from behind the holder's legs in a burst of flame, 0.4 s), idle (it never idles: a running loop round the boss), run (a fast bounding gait, the tail streaming flat), strike (a passing slash at the boss's legs, head low, 0.25 s, without stopping), draw (it skids, turns and yips at the boss, 0.8 s), leave (it runs off one last lap, then burns down from the head into a scatter of embers, 0.6 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the fox: it places and circles it, slashes for it and draws the boss's eye with it for `draw` s (1-1.4 s) after it arrives; it can't be hurt, and an attack begun on it ends on it. It runs through players' feet without touching them: no collision, no push, no heal. The flame ring is only drawn. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each slash (t = h):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.40 | Dart | A burst of flat flame tongues at the holder's heel and the fox shoots out of it toward the boss | `#8fb8dc` tongues, `#f2f6fa` core |
| 0.40-`time` | Ring | As it laps the boss it lays a flat ring of hard flame tongues on the floor, 0.3 m wide, which burns 1.5 s behind it and fades; ink-dark scorch under it | `#8fb8dc` flames, `#f2f6fa` tips, `#2a2827` scorch |
| h-h+0.15 | Slash | A short flat claw arc of three white lines at the boss's leg, 6 sparks | `#f2f6fa` lines, `#8fb8dc` sparks |
| draw | Yip | It skids; a puff of flame from its open mouth | `#8fb8dc` |
| `time`-+0.6 | Leave | It burns down from the head into embers that drift up | `#8fb8dc` to transparent |

Budget (Rare summon class): the model + 3 pooled meshes (flame ring segments as one strip, claw arc, scorch decal) + 1 ribbon (its tail's flame trail) + 20 embers on the dart and 6 sparks a slash (at most 36 alive; 20 on Normal), 1 effect light while striking (blue, low, following the fox), no impact frame. Peak 0.15 s a slash; about one a second, under 3 Hz. Reduced motion: the flame ring's tongues hold still. The ring stays on the floor round the boss's feet, never over its weapon.

## Sound

`abilityFox` (new, in `js/data/audio.js`) on the call: a transient of a flame catching (band-passed noise at 2.5 kHz, 25 ms), a body of a quick run of light paws over a soft fire roar (pink noise band-passed at 700 Hz, 0.5 s, with four ticks), a tail of a short high yip (sine 1400 Hz gliding to 1900 Hz, 0.12 s). `abilityFoxSlash` on each slash: a flick of flame (band-passed noise at 3 kHz, 50 ms) and a light tear (sawtooth 220 Hz, 0.08 s). The flame ring a low steady crackle at low gain while it burns.

## Camera

`CONFIG.camera.feel.powers.fox = [1, 0.03]` as it arrives; no kick a slash; `draw = [1.2, 0.03]` on the yip.

## Images

- `img/cinder-fox-1.webp`: a small sleek fox made of blue-white flame with a single long tail running a burning ring around a boss's legs.
