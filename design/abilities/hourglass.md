# Hourglass

| | |
| --- | --- |
| Id | `hourglass` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (18, 17, 16 points) |
| Origin | New |

## Card

**Rewind place and health to {time} ago.** (7 words, 33 chars)

- Icon (48×48 line drawing): a curved path line ending in a small figure, an arrow running back along it, three short tick marks across the path like a clock's.
- Hover loop (1.8 s): a small figure runs a curve and takes a blow, its bar dropping (0.6 s); the key 2 square lights (0.2 s); the figure snaps back along its path through a line of blue afterimages, tick marks clicking past (0.4 s), and its bar refills to where it was (0.2 s); fade.

## Idea

Time unwinds for you alone. You snap back along your own path to where you stood a few seconds ago, with the health you had then. It is the undo button for a mistake you have already made, the only guard you press after the blow lands, and the most expensive one, because it can erase a whole bad exchange.

## Data

```js
{ id: 'hourglass', name: 'Hourglass', rarity: 'rare', key: 'guard',
  text: 'Rewind place and health to {time} ago.',
  perk: { when: 'press', then: 'rewind' },
  levels: [
    { charge: 18, time: 3 },
    { charge: 17, time: 3.5 },
    { charge: 16, time: 4 },
  ] },
```

Numbers: in 3-4 s a careless player takes one or two blows, so a rewind gives back 34-70 health on a median boss (28-58% of the bar), more than Mending's 20-30% but only after a bad exchange; after a clean one it gives nothing but the reposition. 18 points at 1-1.4 a second is a rewind every 13-18 s, the slowest guard to fill. Rewinding never lowers health: the holder keeps the higher of now and then, so a rewind after a heal costs nothing.

## Engine work

- New perk `press/rewind` in `ABILITY_PERKS` (`['charge', 'time']`).
- The holder's body records its trail: a fixed ring buffer of `{ x, y, z, yaw, hp }` every 0.1 s, `CONFIG.abilities.rewind.slots` (41) entries made at load, enough for 4 s. Nothing is allocated per step.
- On the press: the body slides back along the recorded trail to the entry `time` s old over `CONFIG.abilities.rewind.glide` (0.35 s), untouchable while it slides (as a dash's i-frames) and not steering; then its health is the higher of now and the entry's. Dash charges, the flasks and the other keys' charge are not rewound.
- It can't be pressed in a grip (`PS.HELD`), during a Finishing Blow, or while dead. A trail entry over a pit or off the floor's edge is skipped for the nearest earlier safe one.
- `validate.js`: `press/rewind` needs `charge`, `time`; `CONFIG.abilities.rewind` `slots` a whole number covering the longest `time` at 0.1 s, `glide` above 0.

## Multiplayer

The rewind is its holder's own movement and health (the client owns both). The server range-checks it: the place rewound to must be within its slack of a pose it saw from that holder `time` s ago, and the health restored at most the highest health it accepted from them in that window. The server's targeting sees the holder at their new place. Holder only: it never moves, rewinds or touches a teammate.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.05 | Catch | A flat ribbon traces the recorded path on the floor in one stroke, ink-edged, with a tick mark across it every 0.5 s of path | `#8fb8dc` ribbon, `#f2f6fa` ticks, `#0b0d12` ink |
| 0.05-0.40 | Rewind | The body slides back along it; 5 afterimages, flat-shaded copies of the holder in the poses they held, appear along the path in reverse order and fade one by one as it passes them | `#8fb8dc` at 50%, `#f2f6fa` rim |
| 0.05-0.40 | Hands | A thin clock hand sweeps backwards once round a faint dial on the floor at the start point | `#f2f6fa` |
| 0.40 | Arrive | A hard ring on the floor at the arrival point; the health bar refills with a blue sweep from its right end | `#8fb8dc` |
| 0.40-0.90 | Fade | The ribbon fades from the start point to the arrival point | to transparent |

Budget (Rare class): the ribbon (1) + 5 afterimages (pooled copies of the player figure, drawn flat, one set a player) + 2 pooled meshes (dial, arrival ring) + 12 tick particles (7 on Normal), 1 effect light (blue, 0.4 s, intensity × 0.65 on Normal), no impact frame. Peak 0.4 s. Reduced motion: the afterimages appear together and fade, not in sequence.

## Sound

`abilityRewind` (new, in `js/data/audio.js`): a transient of a clock's tick played backwards (a short noise click with a reversed envelope, 30 ms), a body of the fight's sound drawn backwards (band-passed noise sweeping down from 3 kHz to 400 Hz over 0.35 s, with four soft ticks at 1.2 kHz along it), a tail of a low bell landing (sine 196 Hz with a 2.4 partial, 0.8 s).

## Camera

`CONFIG.camera.feel.powers.rewind = [-1, 0.03]`: a small pull in on arrival. The view follows the body as it slides (it is the holder's own movement), never cutting.

## Images

- `img/hourglass-1.webp`: the swordsman snapping backward along their recent path, a ribbon of blue afterimages running in reverse with clock-hand tick marks.
