# Thunder Hawk

| | |
| --- | --- |
| Id | `thunder-hawk` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (18, 17, 16 points) |
| Origin | New |

## Card

**A thunder hawk dives on the boss for {time}.** (9 words, 39 chars)

- Icon (48×48 line drawing): a hawk in a steep dive, wings swept back into a narrow V, a jagged bolt line running from its tail up off the top edge.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a hawk of lightning bursts up from a small figure's raised arm and circles high (0.4 s); it stoops onto the boss along a bolt and climbs again, twice (1.0 s); fade.

## Idea

A hawk of crackling lightning circles high above the boss and stoops on it again and again, each dive a bolt from the sky. It is the summon of big single hits: slow, heavy, readable, each strike its own small moment of light and thunder, and the hawk is always visible above the fight.

## Data

```js
{ id: 'thunder-hawk', name: 'Thunder Hawk', rarity: 'rare', key: 'summon',
  text: 'A thunder hawk dives on the boss for {time}.',
  power: { when: 'press', then: 'hawk' },
  levels: [
    { charge: 18, time: 8, every: 1.6, damage: 26, draw: 1 },
    { charge: 17, time: 9, every: 1.5, damage: 30, draw: 1.2 },
    { charge: 16, time: 10, every: 1.4, damage: 34, draw: 1.4 },
  ] },
```

Numbers: after its 0.7 s arrival it dives about 4, 5 and 6 times: about 105, 150 and 205 damage a call, near the hound, in fewer, bigger hits (26-34 each, near a heavy's 30-56), which each add more posture than a peck or a bite. 1-1.4 s of the boss's attention. 18 points at 1-1.4 a second is a hawk every 13-18 s.

## Engine work

- New power `press/hawk` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'damage', 'draw']`); `hawk` joins `SUMMONS`, `SUMMON_STRIKERS` and `ON_ENEMY`.
- `CONFIG.abilities.summons.hawk: { gap: 1, flank: -0.8, speed: 18, height: 0.8, reach: 2, alt: 7, orbit: 1.2, dive: 0.35 }`: it circles `alt` m above its place round the boss (`orbit` rad/s, the same rule as the Cinder Fox's), and each strike is a dive of `dive` s from there to the boss; the engine's strike lands at the dive's end, so the reach check uses its place on the ground, not its height. Its decoy while it draws is the dive point beside the boss, 1 m up.
- Drawing: a beast in `js/summon-beasts.js` (shared with the hound and the fox).
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/thunder_hawk.py`, packed to `js/baked/thunder-hawk.js` (`'thunder-hawk': { sources: ['thunder_hawk'] }`).
- Look: a large hawk with long, fingered primaries and a hooked beak, its body an ink-dark silhouette and its feathers drawn as branching lightning lines along every wing edge and down the tail; two blue eyes. The wings' lightning lines are what read at a distance.
- Size: 0.6 m beak to tail, 1.8 m wingspan.
- Material: the summon fresnel shader: ink-dark body (`#0b0d12`), the lightning lines an emissive blue (`#8fb8dc`) with white-hot cores (`#f2f6fa`), a sharp `flicker` on the lines only (never the whole bird, never faster than 3 Hz in brightness).
- Rig: rigid pieces on pivots (body, head, two wings in two parts each, tail fan); about 1,500 triangles.
- Animations (by hand): arrive (it bursts up from the holder's raised arm in a short bolt and climbs to circling height, 0.6 s), idle (a soaring circle with slow wing beats, head turned to the boss), strike (it folds its wings into a V and stoops along a straight line to the boss, 0.35 s, then flares its wings and climbs back over 0.5 s), draw (it pulls up hard right in front of the boss with a scream, wings spread, 0.8 s), leave (it climbs into the dark and thins into a last fork of lightning that fades, 0.6 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the hawk: it places and circles it, strikes for it and draws the boss's eye with it for `draw` s (1-1.4 s) after it arrives; it can't be hurt, and an attack begun on it ends on it. It flies above everyone and dives on the boss only, with no collision: it never blocks, pushes or heals a teammate. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each dive's start (t = d; it lands at d + 0.35):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.60 | Rise | A short jagged bolt up from the holder's raised arm; the hawk climbs out of its end | `#f2f6fa` bolt, `#8fb8dc` lines |
| 0.60-`time` | Circle | It circles high; 1 small spark falls off its wingtips every 0.2 s | `#8fb8dc` |
| d-d+0.35 | Stoop | It dives with wings swept back; a jagged bolt ribbon draws itself behind it from the sky to the boss; radial speed lines round it | `#f2f6fa` core, `#8fb8dc` edge, `#0b0d12` speed lines |
| d+0.35 | Strike | A flat starburst of short forked lines on the boss, 1.6 m, and a scorch ring on the floor under it; 12 sparks | `#f2f6fa`, `#8fb8dc`, `#2a2827` scorch |
| d+0.35-d+0.8 | Fade | The bolt ribbon flickers once and fades | to transparent |
| `time`-+0.6 | Leave | It climbs and thins into a fork of light | `#8fb8dc` to transparent |

Budget (Rare summon class): the model + 3 pooled meshes (starburst, scorch ring, speed-line sheet) + 1 ribbon (the bolt) + 12 sparks a strike and 5 a second circling (at most 30 alive; 17 on Normal), 1 effect light while striking (blue-white, 0.2 s a strike, intensity × 0.65 on Normal), no impact frame. Peak 0.1 s a strike; one every 1.4-1.6 s, under 1 Hz, and the bolt's flicker is one pulse, never a strobe. Reduced motion: the bolt's flicker is a single fade, the speed lines hold still. The strike lands on the boss's head and back, coming from above, never across its weapon's wind-up.

## Sound

`abilityHawk` (new, in `js/data/audio.js`) on the call: a transient of a crack of static (white noise band-passed at 5 kHz, 15 ms), a body of wings and a hawk's scream (sawtooth 1800 Hz gliding to 1300 Hz, band-passed at 2.2 kHz, 0.4 s), a tail of a far roll of thunder (brown noise low-passed at 200 Hz, 1 s). `abilityStoop` on each dive: a rising wind whistle over the 0.35 s (band-passed noise sweeping 1 to 4 kHz), then the strike's thunderclap (white noise burst 10 ms, a 60 Hz thump driven, 0.3 s), a shorter cousin of `abilityThunder`.

## Camera

`CONFIG.camera.feel.powers.hawk = [1.2, 0.04]` as it arrives; `stoop = [-0.6, 0.02]` on each strike; `draw = [1.2, 0.03]` on the pull-up.

## Images

- `img/thunder-hawk-1.webp`: a hawk made of crackling blue-white lightning diving with wings swept back onto a boss, a bolt trail from the sky to the impact.
