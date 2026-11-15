# Bone Archer

| | |
| --- | --- |
| Id | `bone-archer` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (17, 16, 15 points) |
| Origin | New |

## Card

**A bone archer shoots the boss for {time}.** (8 words, 36 chars)

- Icon (48×48 line drawing): a hooded skull over a tall bow drawn to full, one long arrow line flying off to the right.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a tall skeleton climbs out of the floor at the card's far edge (0.4 s), draws its great bow and looses three arrows of blue light that streak into the boss (1.0 s); fade.

## Idea

A skeleton archer climbs out of the floor at range and looses glowing arrows into the boss. It barely draws the boss's eye, so it stays out of the fight and lives its whole time: the summon for players who want steady damage without moving the boss around, and the one that shows the arena's scale, its arrows streaking across the whole room.

## Data

```js
{ id: 'bone-archer', name: 'Bone Archer', rarity: 'rare', key: 'summon',
  text: 'A bone archer shoots the boss for {time}.',
  power: { when: 'press', then: 'archer' },
  levels: [
    { charge: 17, time: 9, every: 0.9, damage: 14, draw: 0.5 },
    { charge: 16, time: 10, every: 0.85, damage: 16, draw: 0.6 },
    { charge: 15, time: 11, every: 0.8, damage: 18, draw: 0.7 },
  ] },
```

Numbers: after its 0.7 s arrival it looses about 9, 11 and 13 arrows: about 125, 170 and 230 damage a call, with the hound, at a lower charge because it protects almost nothing: 0.5-0.7 s of the boss's attention, a glance. 17 points at 1-1.4 a second is an archer every 12-17 s.

## Engine work

- New power `press/archer` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'damage', 'draw']`); `archer` joins `SUMMONS`, `SUMMON_STRIKERS` and `ON_ENEMY`.
- `CONFIG.abilities.summons.archer: { gap: 8, flank: 0.9, speed: 6, height: 2.1, reach: 20, rises: true, shot: 40 }`: it rises where it will stand, 8 m off the boss's side away from its holder, and shoots from there. The same `shot` delay as the Lantern Spirit's: each arrow wounds the boss when it arrives (distance / `shot` s after the loose).
- Its decoy while it draws is its own place, so the boss turns toward it for half a second without crossing the room.
- Drawing (js/summon-figures.js): a figure kind `archer` with its `model`, `solid: true` (lit bone), `floor: true` (it climbs out of the floor), a `guard` pose (bow low, an arrow nocked) and a `cry` pose (bow raised to the sky), and one move of its own key poses no enemy uses, `archerLoose` (draw to the cheek, loose, follow through).
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/bone_archer.py`, packed to `js/baked/bone-archer.js` (`'bone-archer': { sources: ['bone_archer'] }`).
- Look: a tall, narrow skeleton in a torn, hooded mantle that hangs to its knees in strips, a dark skull under the hood with two blue points for eyes, long finger bones, and a great bow taller than itself, of dark wood and bone, its string a line of light. A quiver of arrows of light on its back. Nothing like the game's enemy bowman.
- Height: 2.1 m; the bow 2.2 m.
- Material: the figures' summon shader, lit: bone pale and cold (`#cfe4f2` dimmed), the mantle ink-dark (`#0b0d12`), blue rims (`#8fb8dc`) on the bone edges, eyes, string and arrows white-hot (`#f2f6fa`). Slots: `bone`, `cloth`, `wood`, `light` (glows).
- Rig: one rigid mesh per game bone of js/rig.js's skeleton, the mantle on the cape bones; about 3,000 triangles.
- Animations: arrive (a hand claws up out of the floor, then it climbs out to its full height, 0.7 s), idle (bow low, a slow turn to track the boss), strike (`archerLoose`), draw (bow raised to the sky, 0.6 s), leave (it sinks back into the floor, crumbling from the hood down, 0.7 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the archer: it places it, shoots for it and draws the boss's eye with it for `draw` s (0.5-0.7 s) after it arrives; it can't be hurt, and an attack begun on it ends on it. Its arrows fly to the boss only and pass through players: no collision, no push, no heal. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each loose (t = s):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.70 | Climb | A crack of blue light opens in the floor; a hand, then the skeleton climbs out; 12 stone chips | `#8fb8dc` crack, `#cfe4f2` bone, `#9a958c` chips |
| s-0.25-s | Draw | The string pulled to the cheek; the arrow's head brightens | `#f2f6fa` |
| s-arrival | Arrow | A thin arrow of light with a hard white streak behind it, 3 m long, across the room | `#f2f6fa` core, `#8fb8dc` edge |
| arrival | Strike | A flat four-point star where it hits and 5 sparks | `#f2f6fa`, `#8fb8dc` |
| draw | Raise | Bow raised; its string flares | `#f2f6fa` |
| `time`-+0.7 | Sink | It crumbles and sinks into the crack, which closes | `#9a958c` |

Budget (Rare summon class): the model + 3 pooled meshes (floor crack, arrow, hit star) + 1 ribbon (the arrow's streak) + 12 chips at the climb and 5 sparks a hit (at most 24 alive; 13 on Normal), 1 effect light while striking (blue-white, on the bow, 0.15 s a loose, intensity × 0.65 on Normal), no impact frame. Peak 0.1 s a hit; an arrow every 0.8-0.9 s, under 3 Hz. Reduced motion: the arrow's streak is shorter (1.5 m). The arrows fly at the boss's body, so they cross the room but never over a player's view for long (0.2 s).

## Sound

`abilityArcher` (new, in `js/data/audio.js`) on the call: a transient of stone cracking (white noise band-passed at 2 kHz, 30 ms), a body of bones and grit climbing (brown noise low-passed at 500 Hz with a dry rattle of short clicks, 0.6 s), a tail of a low wooden creak (sawtooth 90 Hz band-passed at 400 Hz, 0.4 s). `abilityArrow` on each loose: a string's thrum (sine 196 Hz plucked, 0.2 s) and a whistle (band-passed noise sweeping 4 to 2 kHz, 0.2 s); on the hit a dull thock (brown noise, 50 ms) at the boss.

## Camera

`CONFIG.camera.feel.powers.archer = [0.8, 0.02]` as it climbs out; no kick an arrow.

## Images

- `img/bone-archer-1.webp`: a tall skeleton archer in a torn hood rising from the floor at the edge of the arena, drawing a great bow and loosing arrows of blue light at a boss.
