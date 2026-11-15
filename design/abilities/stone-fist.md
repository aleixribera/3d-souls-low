# Stone Fist

| | |
| --- | --- |
| Id | `stone-fist` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) |
| Origin | New |

## Card

**A stone fist erupts under the boss.** (7 words, 35 chars)

- Icon (48×48 line drawing): a closed fist rising out of a broken ground line, two crack strokes either side.
- Hover loop (1.8 s): a small figure punches the floor (0.3 s), cracks run to the boss and glow (0.3 s), a giant stone fist punches up under it, rubble flying (0.4 s); hold, fade.

## Idea

Slam the fist down and a giant fist of rock punches up out of the floor under the boss. The heaviest single hit of the strikes and the longest charge: the cracks under the boss show it coming for a beat, so it lands best on a boss committed to an attack.

## Data

```js
{ id: 'stone-fist', name: 'Stone Fist', rarity: 'rare', key: 'strike',
  text: 'A stone fist erupts under the boss.',
  power: { when: 'press', then: 'fist' },
  levels: [
    { charge: 17, damage: 100 },
    { charge: 16, damage: 125 },
    { charge: 15, damage: 150 },
  ] },
```

Numbers: 5.9, 7.8 and 10 damage a point, in one big blow. The fist rises CONFIG.abilities.fist.delay (0.3 s) after the press at the spot the target stood and hits what is within `fist.radius` (1.8 m) of it; a boss that leaps away in that beat is missed.

## Engine work

- New power `press/fist`: ['charge', 'damage'] in ABILITY_POWERS. On the press it marks the target's spot; after `fist.delay` it wounds every enemy within `fist.radius` of it (a running entry), as one power blow (poise equal to its damage, as every power's).
- `validate.js`: CONFIG.abilities.fist { delay from 0 to 0.6, radius above 0 }.

## Multiplayer

The browser claims the press; the server checks the charge and resolves the fist at the marked spot against its own enemies. Enemies only: a teammate at the spot sees the fist rise through them. Every browser draws it.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.10 | Punch | The player's fist meeting the floor; a small ring of dust | `#6e6a62` |
| 0.05-0.30 | Cracks | Hard-edged cracks racing from the player to the spot and starring out under the boss, glowing blue from inside | `#8fb8dc` glow, `#0e1218` ink |
| 0.30-0.45 | Fist | A huge rough stone fist, 3 m tall, punching up through the floor slabs, blue light in its knuckle cracks | `#5a5650` stone, `#8e897e` lit faces, `#8fb8dc` cracks, `#0e1218` ink |
| 0.30-0.80 | Rubble | 6 slab chunks and 20 hard grit flakes thrown out | `#6e6a62`, `#8e897e` |
| 0.70-1.20 | Sink | The fist crumbles back into the floor, cracks fading last | to transparent |

Budget (Rare class): 4 pooled meshes (the fist, crack decal, dust ring, the 6 chunks as one instanced mesh) + 20 particles (11 on Normal), 1 effect light (blue, 0.4 s from the cracks, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.5 s. The fist goes 50% translucent within 1 m of the boss's weapon. Reduced motion: no camera shake (the dip stays).

## Sound

`abilityFist` (new, in `js/data/audio.js`): a transient of a fist on stone (sine 90 Hz to 45 Hz, 0.15 s, driven), a body of stone grinding as the cracks run (brown noise low-passed 600 to 250 Hz, 0.3 s), then at t = 0.3 a deep boom (sine 50 Hz to 30 Hz, 0.5 s, driven) with a crash of rubble (brown and pink noise, 0.5 s), a tail of falling grit (white noise high-passed at 2 kHz, sparse grains, 0.5 s).

## Camera

`CONFIG.camera.feel.powers.fist = [2.4, 0.12]`: a widening with a dip as the fist rises; within `powerNear` only.

## Images

- `img/stone-fist-1.webp`: a giant rough stone fist with blue glowing cracks bursting up out of the arena floor under a boss, rubble flying, the swordsman punching the ground.
