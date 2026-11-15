# Ember Mail

| | |
| --- | --- |
| Id | `ember-mail` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (15, 14, 13 points) |
| Origin | New |

## Card

**Ember armour takes {hits} blows for you.** (7 words, 35 chars)

- Icon (48×48 line drawing): three overlapping curved plates over a shoulder line, the top one cracked with a small chip flying off.
- Hover loop (1.8 s): the key 2 square lights (0.2 s); glowing plates fly in and lock onto a small figure (0.3 s); a boss blow lands and one layer of plates shatters off while the figure doesn't flinch (0.5 s); a second blow takes the next layer (0.5 s); fade.

## Idea

Spectral plates of blue-hot embers lock onto you and take the next blows whole, cracking off one layer at a time. It is the plainest guard: no timing at all, just a buffer for the moment you know you will be caught, and every blow it takes shows on your body as a shattering plate.

## Data

```js
{ id: 'ember-mail', name: 'Ember Mail', rarity: 'rare', key: 'guard',
  text: 'Ember armour takes {hits} blows for you.',
  perk: { when: 'press', then: 'armour' },
  levels: [
    { charge: 15, hits: 1, time: 8 },
    { charge: 14, hits: 2, time: 8 },
    { charge: 13, hits: 2, time: 10 },
  ] },
```

Numbers: one blow taken whole is worth about 34 health (the median boss blow on a 120 bar) and up to 70 on a big one, close to Mending's 24-36 at about the same charge. Level II's second blow doubles it; level III keeps two and holds 10 s so the armour is rarely wasted. 15 points at 1-1.4 a second is armour every 11-15 s; 8-10 s means it is usually spent before the next press, so it never stacks.

## Engine work

- New perk `press/armour` in `ABILITY_PERKS` (`['charge', 'hits', 'time']`), with `plates` (blows left) and `mail` (s left) in `abilityPerkState`; `abilityClocks` counts `mail` down and clears `plates` at 0. A new press sets both afresh (no stacking).
- `Player.takeHit`: while `perk.plates > 0`, a landing blow does nothing to the body (no damage, knock or flinch; a counter window stays open), and `perk.plates` drops by one with an `abilityPerk` `perk: 'press/armour'` and `left`. Any blow counts (deflectable or not, area hits and shots included) except a grab (`seize`, `pull`), which breaks every plate at once and takes the holder as usual. A fall, a burn over time and a `destined` drain are not blows.
- `validate.js`: `press/armour` needs `charge`, `hits` (a whole number), `time`.

## Multiplayer

The armour is its holder's own defence: the browser takes the blow on its plates (the client owns its health) and tells the server it took no damage as it already does. The server knows the press and the level, so it accepts at most `hits` blows taken whole within `time` s. Holder only; the plates never cover a teammate.

## Effect

Layered, timed from the press (t = 0) and from each blow taken (t = h):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.25 | Lock | Flat curved plates (two pauldrons, a breastplate, two vambraces) fly in from 1 m out and lock onto the body with a hard snap; each plate is 2-tone, a white-hot seam down its middle, blue edges, ink outline | `#2c5f8a` plate, `#8fb8dc` edge, `#f2f6fa` seam, `#0b0d12` outline |
| 0.25-`time` | Hold | Plates glow steadily; 8 ember flakes rise off them each second; level II-III show two layers, the outer one larger | `#8fb8dc` flakes |
| h | Crack | The outer layer cracks white in one frame | `#f2f6fa` |
| h+0.02-h+0.40 | Shatter | Its plates burst outward into 12 flat shards and 10 embers, flung away from the blow | `#8fb8dc` shards, `#f2f6fa` embers |
| last 1.0 s | Dim | Unspent plates dim and flicker slowly (1 Hz) so their end is readable | `#2c5f8a` |
| `time`-+0.3 | Fall | Unspent plates loosen and fall to ash | to transparent |

Budget (Rare class): 5 pooled meshes (a plate set drawn as one mesh per layer, two layers; a shard sheet; a crack sheet; a flake emitter) + 22 particles a shatter and 8 flakes a second (at most 40 alive; 22 on Normal), 1 effect light (blue, 0.2 s a shatter, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.4 s a shatter. Reduced motion: the last-second flicker becomes a steady dim.

## Sound

`abilityMail` (new, in `js/data/audio.js`): on the press three quick metal locks (white noise band-passed at 3.5 kHz, 10 ms each, 60 ms apart) over a body of a low ember roar (brown noise low-passed at 400 Hz, 0.5 s); on each shatter a transient clang (sine 520 Hz with a 2.76 partial, 2 ms attack, 0.3 s), a crackle of embers (white noise high-passed at 4 kHz, short grains, 0.3 s), a tail of falling metal (band-passed noise at 1.5 kHz, 0.4 s).

## Camera

No new entry: js/camera-feel.js treats a blow taken by the plates as a blocked one (the hurt push × `blockMul`), and the perk kick plays on the press.

## Images

- `img/ember-mail-1.webp`: spectral armour plates of glowing blue embers locking onto the swordsman, one plate shattering off as a boss blow lands.
