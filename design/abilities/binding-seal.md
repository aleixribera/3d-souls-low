# Binding Seal

| | |
| --- | --- |
| Id | `binding-seal` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (16, 15, 14 points) |
| Origin | New |

## Card

**Seal the boss's next attack.** (5 words, 28 chars)

- Icon (48×48 line drawing): a long narrow paper strip with three brush marks on it, its lower end curling into a small flame.
- Hover loop (1.8 s): the key 2 square lights (0.2 s); a strip of paper flies from a small figure and sticks to a boss (0.3 s); the boss winds up its blow in full (0.5 s); the strip burns away and the blow sputters out into smoke before it lands (0.5 s); fade.

## Idea

Slap a paper seal of light onto the boss. Its next attack shows its whole wind-up, then fizzles out at the moment it should land, and the boss stands there open. The tell is never hidden, so it teaches as it protects: the player sees the attack they would have had to answer, and gets the opening instead.

## Data

```js
{ id: 'binding-seal', name: 'Binding Seal', rarity: 'rare', key: 'guard',
  text: "Seal the boss's next attack.",
  power: { when: 'press', then: 'seal' },
  levels: [
    { charge: 16, time: 6 },
    { charge: 15, time: 7 },
    { charge: 14, time: 8 },
  ] },
```

Numbers: bosses start an attack every 1.6-5.6 s, so a seal of 6-8 s almost always catches one. One attack sealed is a whole combo not thrown (one to five blows, 34 each on a median boss) plus a recovery the party can punish. 16 points at 1-1.4 a second is a seal every 12-16 s, as dear as the dome, because it covers everyone the boss would have hit.

## Engine work

- New power `press/seal` in `ABILITY_POWERS` (`['charge', 'time']`), on the press target (`pressTarget`).
- The enemy gets `sealed` (s left) and its holder. The next attack it begins while sealed plays its wind-up as normal (the tell, sound and every warning shape), then at its first active frame no hitbox is made for any of its hits, no impact, shot or area mark is spawned, and the enemy plays the attack's recovery `CONFIG.abilities.seal.recover` (0.4 s) longer. `sealed` goes to 0. Emitted as `abilityPower` `then: 'seal'` with `sputter: true`.
- One seal on an enemy at a time: a press on a sealed enemy renews `sealed` to the new `time` (nothing stacks). A seal still on when its time runs out falls off unused.
- The sputter counts as nothing for the Finishing Blow or posture (it isn't a hit), and it never ends a phase change or a scripted move (a boss's arrival, a phase transition): those are not attacks.
- `validate.js`: `press/seal` needs `charge`, `time`; `CONFIG.abilities.seal.recover` 0 or more.

## Multiplayer

The server owns the boss, so it applies the seal from the accepted press and runs the sputter; every browser draws it from the `abilityPower` events. The seal is on the boss, not on any teammate: it stops the sealed attack whoever it was aimed at, which helps the party without moving, slowing or linking anyone. With several holders in a party, one seal a boss at a time keeps it from chaining.

## Effect

Layered, timed from the press (t = 0) and from the sealed attack's wind-up (t = w) and active frame (t = a):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Throw | A long paper strip, 0.25 × 1.4 m, flies from the holder's hand in a flat arc and slaps onto the boss's chest or back (whichever side faces the holder, never the weapon arm) | `#f2f6fa` paper, `#8fb8dc` edge, `#0b0d12` brush marks |
| 0.20-`time` | Hold | The strip clings and flutters; its three brush marks glow faintly | `#8fb8dc` marks |
| w-a | Burn | The strip burns away from its lower end over the wind-up: a hard white-blue flame front with ink-black curl behind it. The boss's wind-up is never covered: the strip stays on the torso and is under 1.5 m long | `#f2f6fa` flame, `#8fb8dc` edge, `#0b0d12` curl |
| a-a+0.5 | Sputter | At the weapon, where the blow would land, a puff of grey smoke and 10 ink flakes; the weapon's own trail is cut short | `#9a958c` smoke, `#0b0d12` flakes |
| a+0.5 | Open | A thin blue ring on the floor round the boss for its stretched recovery | `#8fb8dc` |

Budget (Rare class): 3 pooled meshes (strip, smoke sheet, floor ring) + 10 flakes and 8 burn embers (18 particles; 10 on Normal), 1 effect light (blue, 0.3 s at the sputter, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.5 s. The boss's undeflectable wind-up glows blue too (`rollOnlyGlow`), so the seal leads with white paper and keeps its blue to thin edges, off the weapon. Reduced motion: no change needed.

## Sound

`abilitySeal` (new, in `js/data/audio.js`): on the press a sharp paper slap (white noise band-passed at 2.5 kHz, 15 ms) and a short bright chime (sine 1318 Hz, 0.4 s); as the strip burns a quiet crackle (high-passed noise grains, the wind-up's length); on the sputter a transient of a fizzle (band-passed noise sweeping 3 kHz down to 300 Hz in 0.25 s), a body of a dull puff (brown noise, 0.2 s), and no hit sound.

## Camera

`CONFIG.camera.feel.powers.seal = [0.8, 0]`: a small widening on the sputter, so the open boss reads.

## Images

- `img/binding-seal-1.webp`: a long strip of glowing blue paper seal with brush marks stuck on a boss mid wind-up, burning away as the attack fizzles.
