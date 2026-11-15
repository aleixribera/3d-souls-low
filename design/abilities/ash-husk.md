# Ash Husk

| | |
| --- | --- |
| Id | `ash-husk` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (13, 12, 11 points) |
| Origin | New |

## Card

**Leave a husk that explodes when struck.** (7 words, 39 chars)

- Icon (48×48 line drawing): a standing figure outline drawn in broken dashes, a second solid figure stepping away behind it, a burst of short lines on the dashed one.
- Hover loop (1.8 s): the key 2 square lights (0.2 s); a small figure slips a step back and leaves a grey copy of itself (0.3 s); a boss blow falls on the copy (0.4 s); the copy bursts in a blue-cored blast that throws the boss back (0.5 s); fade.

## Idea

The substitution trick. You slip a step back and leave a husk of ash standing in your guard pose; the boss's next blow goes into it and the husk blows up in its face. It turns a blow you would have had to dodge into damage, and its timing is the same skill as a dodge: press it as the wind-up ends.

## Data

```js
{ id: 'ash-husk', name: 'Ash Husk', rarity: 'rare', key: 'guard',
  text: 'Leave a husk that explodes when struck.',
  power: { when: 'press', then: 'husk' },
  levels: [
    { charge: 13, time: 3, damage: 40 },
    { charge: 12, time: 3, damage: 55 },
    { charge: 11, time: 3, damage: 70 },
  ] },
```

Numbers: one avoided blow (median 34 of 120 health) plus 40-70 damage, about one or two counters' worth (a counter is about 42). Fire Burst on key 1 does 70-110 with no defence in it; the husk trades raw damage for the avoided blow. 13 points at 1-1.4 a second is a husk every 9-13 s. A husk the boss never strikes within 3 s crumbles harmlessly, so a press thrown at nothing costs its charge.

## Engine work

- New power `press/husk` in `ABILITY_POWERS` (`['charge', 'time', 'damage']`), resolved where the enemies are (`abilityPowers`).
- On the press: the holder takes a short backstep (`CONFIG.abilities.husk.step` 1.6 m over 0.2 s, its own movement, the same motion as a dash's start with no i-frames), and the engine places a husk at the spot they left: `{ holder, x, y, z, yaw, until, decoy }`, one per holder (a new press replaces it).
- The husk is a decoy like a summon's: `abilityPowers.decoy(e)` also returns a husk, so the targeted enemy's next attack begun within `time` s is aimed at it, and a blow already in flight at the holder's old place meets it. It draws one attack only, then lets go.
- Any enemy hitbox that overlaps the husk (`radius` 0.5 m, height 1.8 m) bursts it: `wound` every enemy within `CONFIG.abilities.husk.radius` (2.5 m) for `damage`, emitted as `abilityPower` `then: 'husk'` with `burst: true`.
- The husk is not a summon: it does not take the summon slot and a summon out keeps its place.
- `validate.js`: `press/husk` needs `charge`, `time`, `damage`; `CONFIG.abilities.husk` `step`, `radius` above 0.
- Drawing: the husk copies its holder's figure (js/rig.js's figure, posed as they were at the press, the way the Ember Twin is drawn), in an ash shader. Not a summon, so no Blender model of its own.

## Multiplayer

The press is claimed like every press; the server places the husk where it accepted the holder to be (range-checked against its last pose) and runs the decoy and the burst, since it owns the boss. The husk has no collision: teammates walk and strike through it, and their blows never burst it. Only the boss's blows do. It never draws the boss off a teammate it is already attacking mid-swing.

## Effect

Layered, timed from the press (t = 0) and from the blow on the husk (t = h):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Slip | The holder steps back; a brush smear of ash streaks between the two places | `#9a958c` smear, `#0b0d12` ink edge |
| 0.00-0.25 | Set | The husk greys from the feet up: a matte ash statue of the holder in their guard pose, cracked with thin blue seams | `#9a958c` ash, `#2a2827` char, `#8fb8dc` seams |
| 0.25-3.00 | Wait | Ash flakes drift off its shoulders; its seams glow brighter in the last 0.5 s | `#9a958c`, `#8fb8dc` |
| h | Burst | The husk bursts: a white-cored blue shell of flat shards, 2.5 m across, inside a cloud of hard-edged ash chunks | `#f2f6fa` core, `#8fb8dc` edge, `#9a958c` chunks |
| h-h+0.6 | Fall | 20 ash chunks and 10 blue sparks fall; a scorch ring stays on the floor and fades | `#2a2827` scorch, `#8fb8dc` sparks |
| 3.00-3.50 | Crumble | Unstruck, it collapses into a cone of ash from the head down and fades | `#9a958c` to transparent |

Budget (Rare class): the husk figure (pooled, one a player) + 3 pooled meshes (smear, burst shell, scorch ring) + 30 particles (17 on Normal), 1 effect light (blue, 0.35 s at the burst, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.35 s. Reduced motion: no change needed.

## Sound

`abilityHusk` (new, in `js/data/audio.js`): on the press a dry rustle of ash (pink noise band-passed 1.2-3 kHz, 0.25 s) with a soft stone settle (brown noise low-passed at 300 Hz, 0.2 s); on the burst a transient crack (white noise band-passed at 3 kHz, 20 ms), a body of a blue-fire whoomp (sawtooth 70 Hz gliding to 45 Hz, driven, 0.35 s), a tail of ash raining (pink noise high-passed at 2 kHz, 0.6 s, falling).

## Camera

`CONFIG.camera.feel.powers.husk = [1.6, 0.05]`: on the burst only, a small outward kick.

## Images

- `img/ash-husk-1.webp`: a grey ash statue of the swordsman left standing in a guard pose being struck by a boss and bursting in a blue-cored ash explosion, the real swordsman stepping aside.
