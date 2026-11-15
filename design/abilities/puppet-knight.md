# Puppet Knight

| | |
| --- | --- |
| Id | `puppet-knight` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (20, 18, 16 points) |
| Origin | New |

## Card

**A puppet knight fights the boss for {time}.** (8 words, 38 chars)

- Icon (48×48 line drawing): a jointed knight figure with round joints, five thin string lines running up from its head, hands and knees to a small cross bar at the top.
- Hover loop (1.8 s): the key 3 square lights and a small figure raises its fingers (0.2 s); a wooden knight drops from above on glowing strings and lands in a crouch (0.4 s); it chops at the boss twice in jerky snapping poses, the strings pulling taut each time (1.0 s); fade.

## Idea

A wooden knight marionette drops from above on glowing strings that run up into the dark and down to your raised fingers, and fights the boss in jerky, snapping blows. You see it fight on its strings, as if you were working it. It is the summon that holds the boss longest among the strikers, a sturdy decoy with an unsettling, theatrical way of moving that no enemy shares.

## Data

```js
{ id: 'puppet-knight', name: 'Puppet Knight', rarity: 'rare', key: 'summon',
  text: 'A puppet knight fights the boss for {time}.',
  power: { when: 'press', then: 'puppet' },
  levels: [
    { charge: 20, time: 10, every: 1.3, damage: 20, draw: 3 },
    { charge: 18, time: 11, every: 1.2, damage: 24, draw: 3.5 },
    { charge: 16, time: 12, every: 1.1, damage: 28, draw: 4 },
  ] },
```

Numbers: after its 0.7 s arrival it strikes about 7, 8 and 10 times: about 140, 195 and 280 damage a call, the top of the rare summons with the hound and the Ronin Shade, and 3-4 s of the boss's attention. 20 points at 1-1.4 a second is a knight every 14-20 s, so at level III it is out more than half the fight.

## Engine work

- New power `press/puppet` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'damage', 'draw']`); `puppet` joins `SUMMONS`, `SUMMON_STRIKERS` and `ON_ENEMY`.
- `CONFIG.abilities.summons.puppet: { gap: 1.2, flank: 1, speed: 7, height: 2, reach: 1.8, rises: true, drop: 6 }`: it arrives where it will stand (`rises`), dropping from `drop` m above in the arrival time instead of climbing out of the floor.
- Drawing (js/summon-figures.js): a figure kind `puppet` with its `model`, `solid: true` (lit wood), a `guard` pose (sword up, limbs hanging slack) and a `cry` pose (arms flung wide, head lolled back), and two `moves` of its own key poses no enemy uses, `puppetChop` (an overhead chop) and `puppetSpin` (a full-body turning cut). Its poses are snapped through with an overshoot and settle (a new `snap` easing on the figure), so it moves like a marionette. Five string lines (one `LineSegments` mesh) run from its head, hands and knees up 12 m into the dark; while it arrives a sixth line runs down to the holder's hand.
- Large summons fade to 40% when they stand between a viewer's camera and the boss (drawing only, per browser), so no friend loses a boss's wind-up behind it.
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/puppet_knight.py`, packed to `js/baked/puppet-knight.js` (`'puppet-knight': { sources: ['puppet_knight'] }`).
- Look: a life-size marionette of a knight carved in dark wood, ball joints showing at the shoulders, elbows, hips and knees, a cracked great helm with a narrow visor slit, a carved surcoat with chipped paint, a wooden sword with a nicked edge and a small round wooden buckler. Brass screw-eyes at the head, hands and knees where the strings tie on. No crest or emblem.
- Height: 2.0 m.
- Material: the figures' summon shader, lit: dark-stained wood (`#2a2118`, near ink) for the limbs and armour, the ball joints and screw-eyes glowing blue (`#8fb8dc`), the helm's crack and visor slit white-hot (`#f2f6fa`). Slots: `wood`, `paint`, `joint` (glows), `crack` (glows).
- Rig: one rigid mesh per game bone of js/rig.js's skeleton (a marionette is already rigid parts); about 3,200 triangles.
- Animations: arrive (it drops from 6 m on taut strings and lands in a crouch with a wooden clatter, 0.7 s), idle (it hangs slightly off the floor, limbs swaying on slack strings), strike (`puppetChop`, `puppetSpin`, the strings jerking taut on each), draw (arms flung wide and head lolled back, 1 s), leave (the strings go slack one by one and snap upward; it collapses into a heap of parts, which sinks into its shadow, 0.8 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the knight: it places it, strikes for it and draws the boss's eye with it for `draw` s (3-4 s) after it arrives; it can't be hurt, and an attack begun on it ends on it. Its strings run to the sky and, only while it arrives, to its own holder's hand; they never touch, link or slow a teammate, and have no collision. The knight never blocks, pushes or heals a teammate. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each blow (t = h):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Strings | Five lines of light draw down out of the dark above the boss's flank; a sixth runs from the holder's raised fingers up to the same point | `#8fb8dc` lines, `#f2f6fa` cores |
| 0.20-0.70 | Drop | The knight drops on them and lands in a crouch; a ring of dust and 10 wood splinters | `#2a2118` wood, `#9a958c` dust |
| 0.70-1.20 | Thread | The line to the holder's hand fades to nothing; the five to the sky stay at 60% | to transparent |
| h-h+0.12 | Blow | A flat arc follows its sword, 2 m, ink outline, a hard white core; the strings flash taut | `#f2f6fa` core, `#8fb8dc` edge, `#0b0d12` outline |
| h+0.12-h+0.40 | Hang | 6 sparks and 3 wood chips at the contact | `#8fb8dc`, `#2a2118` |
| `time`-+0.8 | Collapse | Strings slacken and snap away upward; the heap sinks | to transparent |

Budget (Rare summon class): the model + 3 pooled meshes (the string lines as one `LineSegments`, the blow arc, the dust ring) + 10 splinters at the landing and 9 a blow (at most 30 alive; 17 on Normal), 1 effect light while striking (blue, on its joints, 0.15 s a blow, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.12 s a blow; one every 1.1-1.3 s, under 3 Hz. Reduced motion: the strings don't flash taut. The strings are thin (2 px at most) and stand clear of the boss's body, so they never cover a wind-up.

## Sound

`abilityPuppet` (new, in `js/data/audio.js`) on the call: a transient of strings snapping taut (a plucked sine at 330 Hz with a fast glide up a fifth, 0.1 s), a body of a wooden clatter as it lands (8 short knocks band-passed at 800 Hz over 0.2 s), a tail of a slow creak of wood (sawtooth 110 Hz band-passed at 500 Hz, 0.5 s). `abilityPuppetBlow` on each blow: the strings' twang (sine 440 Hz plucked, 0.15 s) and a hard wooden thwack (band-passed noise at 1.2 kHz, 40 ms, with a 120 Hz thump).

## Camera

`CONFIG.camera.feel.powers.puppet = [1.4, 0.05]` as it lands; no kick a blow; `draw = [1.2, 0.03]` on the cry.

## Images

- `img/puppet-knight-1.webp`: a jointed wooden knight marionette with a cracked helm fighting a boss, glowing blue strings running from its joints up into the dark and to the swordsman's raised fingers.
