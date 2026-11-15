# Ash Bear

| | |
| --- | --- |
| Id | `ash-bear` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (22, 20, 18 points) |
| Origin | New |

## Card

**An ash bear mauls the boss for {time}.** (8 words, 33 chars)

- Icon (48×48 line drawing): a bear reared on its hind legs, one forepaw raised with three claw lines, the outline broken into plates.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a mound of ash heaves up beside the boss and a huge bear rises out of it (0.5 s); it rears and brings both paws down in one heavy swipe, ash trailing from its claws (0.8 s); it roars; fade.

## Idea

A huge bear of packed grey ash and embers rises beside the boss, rears up and mauls it with slow, heavy swipes. It is the summon of weight: few blows, each the size of a heavy attack, each one a moment, and a body big enough that the boss has to turn and face it. It costs the most charge of any summon.

## Data

```js
{ id: 'ash-bear', name: 'Ash Bear', rarity: 'rare', key: 'summon',
  text: 'An ash bear mauls the boss for {time}.',
  power: { when: 'press', then: 'bear' },
  levels: [
    { charge: 22, time: 8, every: 2, damage: 36, draw: 3 },
    { charge: 20, time: 9, every: 1.9, damage: 42, draw: 3.5 },
    { charge: 18, time: 10, every: 1.8, damage: 48, draw: 4 },
  ] },
```

Numbers: after its 0.7 s arrival it swipes about 4, 4 and 5 times: about 130, 170 and 240 damage a call, in the summons' middle, but in blows of 36-48 (a heavy's size) that add real posture and help toward a Finishing Blow, with 3-4 s of the boss's attention. 22 points at 1-1.4 a second is a bear every 16-22 s, the dearest summon.

## Engine work

- New power `press/bear` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'damage', 'draw']`); `bear` joins `SUMMONS`, `SUMMON_STRIKERS` and `ON_ENEMY`.
- `CONFIG.abilities.summons.bear: { gap: 1.4, flank: 1.3, speed: 6, height: 2.4, reach: 2.2, rises: true }`: it rises where it will stand, on the boss's far side away from its holder, so it never stands between the holder and the boss.
- Drawing: a beast in `js/summon-beasts.js` (shared with the hound, the fox, the hawk and the owl). Large summons fade to 40% when they stand between a viewer's camera and the boss (drawing only, per browser), so no friend loses a boss's wind-up behind it.
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/ash_bear.py`, packed to `js/baked/ash-bear.js` (`'ash-bear': { sources: ['ash_bear'] }`).
- Look: a massive bear of packed grey ash, its hide made of thick overlapping plates like cracked cooling slag, blue embers glowing in the seams between them; a heavy head with a short muzzle and small blue eyes; long black claws that shed ash. Its shoulders hump high; its outline is broken into plates so it reads as made, not alive.
- Height: 1.6 m at the shoulder on all fours, 3.2 m reared.
- Material: the summon shader, lit: ash plates (`#9a958c`) over a charred ink-dark body showing in the seams (`#2a2827`), the seams' embers blue (`#8fb8dc`) with white-hot cores (`#f2f6fa`), claws ink (`#0b0d12`). Slots: `ash`, `char`, `ember` (glows).
- Rig: rigid pieces on pivots (body front and back, neck, head, jaw, four legs in two parts each), so it can rear by turning the back body piece; about 3,800 triangles.
- Animations (by hand): arrive (a mound of ash heaves up and the bear rises out of it, shaking ash off, 0.7 s), idle (a heavy sway on all fours, head low, breathing embers), strike (it rears to 3.2 m over 0.6 s and brings both forepaws down in one swipe, 0.2 s, then drops back to all fours), draw (it rears and roars at the boss, 1 s), leave (it slumps and collapses into a heap of ash that blows away in a gust, 0.8 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the bear: it places it, swipes for it and draws the boss's eye with it for `draw` s (3-4 s) after it arrives; it can't be hurt, and an attack begun on it ends on it. It stands on the boss's far side with no collision: it never blocks, pushes or heals a teammate, and fades for any player whose view of the boss it would cover. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each swipe's landing (t = h; its wind-up, the rear, starts 0.6 s before):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.70 | Rise | A mound of ash heaves up and breaks; the bear rises out of it shedding ash in hard flakes; its seams light up blue from the feet | `#9a958c` ash, `#8fb8dc` seams |
| h-0.6-h | Rear | It rears; the seams brighten as it climbs | `#f2f6fa` seam cores |
| h-h+0.15 | Swipe | Two flat claw arcs of three thick lines each tear down through the boss, ink outlines, white cores; ash streams off its claws in a ribbon | `#f2f6fa` core, `#8fb8dc` edge, `#0b0d12` outline, `#9a958c` ribbon |
| h+0.15-h+0.6 | Fall | 16 ash chunks and 8 blue embers fall from the impact; a dust ring on the floor | `#9a958c`, `#8fb8dc` |
| draw | Roar | It rears and roars; a flat ring of ash pushes out from its feet (drawn only, it moves no one) | `#9a958c` |
| `time`-+0.8 | Leave | It collapses into ash that blows away | to transparent |

Budget (Rare summon class): the model + 3 pooled meshes (claw arcs, dust ring, ash mound) + 1 ribbon (the claws' ash) + 24 particles a swipe (at most 40 alive with the rise; 22 on Normal), 1 effect light while striking (blue, 0.25 s a swipe, intensity × 0.65 on Normal), no impact frame. Peak 0.15 s a swipe; one every 1.8-2 s. Reduced motion: no change needed (no flash).

## Sound

`abilityBear` (new, in `js/data/audio.js`) on the call: a transient of the ash mound cracking (brown noise burst low-passed at 400 Hz, 50 ms), a body of the bear rising, a deep growl (sawtooth 55 Hz gliding to 70 Hz, low-passed at 300 Hz, driven, 0.7 s) over sliding ash (pink noise band-passed at 1 kHz, 0.6 s), a tail of embers crackling (white noise grains high-passed at 4 kHz, 0.5 s). `abilityMaul` on each swipe: a whoosh as it rears (band-passed noise sweeping 300 Hz to 1 kHz, 0.5 s), then a heavy impact (sine 70 Hz dropping to 40 Hz, driven, 0.3 s, and a tearing crunch of band-passed noise at 1.5 kHz, 0.1 s). `abilityRoar` on the draw: the growl, louder and longer (1 s), with a rising top (sawtooth 140 Hz gliding to 190 Hz).

## Camera

`CONFIG.camera.feel.powers.bear = [2, 0.08]` as it rises; `maul = [-0.8, 0.03]` on each swipe; `draw = [1.2, 0.03]` on the roar.

## Images

- `img/ash-bear-1.webp`: a massive bear made of packed grey ash with blue embers glowing between its plates rearing up and mauling a boss, ash trailing from its claws.
