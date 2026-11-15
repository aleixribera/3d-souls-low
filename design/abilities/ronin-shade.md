# Ronin Shade

| | |
| --- | --- |
| Id | `ronin-shade` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (20, 18, 16 points) |
| Origin | New |

## Card

**A ghost swordsman duels the boss for {time}.** (8 words, 39 chars)

- Icon (48×48 line drawing): a wide flat hat over a cloaked figure's outline, a long blade held across its body.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a translucent swordsman in a wide hat walks in beside a small figure, fading in (0.4 s); the boss swings at it and it deflects with a spark (0.4 s), then cuts twice in sharp held poses (0.6 s); fade.

## Idea

A wandering ghost swordsman in a wide straw hat steps in beside you and duels the boss, meeting its first blow with a deflect and a spark and answering with clean, held cuts. It is the summon that fights the way the player fights: a mirror of the game's own deflect-and-counter duel, and the longest hold on the boss's attention among the strikers.

## Data

```js
{ id: 'ronin-shade', name: 'Ronin Shade', rarity: 'rare', key: 'summon',
  text: 'A ghost swordsman duels the boss for {time}.',
  power: { when: 'press', then: 'ronin' },
  levels: [
    { charge: 20, time: 9, every: 1.4, damage: 22, draw: 3 },
    { charge: 18, time: 10, every: 1.3, damage: 26, draw: 3.5 },
    { charge: 16, time: 11, every: 1.2, damage: 30, draw: 4 },
  ] },
```

Numbers: after its 0.7 s arrival it cuts about 6, 7 and 8 times: about 130, 180 and 250 damage a call, close to the hound, plus 3-4 s of the boss's attention, the most of the strikers with the puppet knight and the bear. 20 points at 1-1.4 a second is a shade every 14-20 s.

## Engine work

- New power `press/ronin` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'damage', 'draw']`); `ronin` joins `SUMMONS`, `SUMMON_STRIKERS` and `ON_ENEMY`.
- `CONFIG.abilities.summons.ronin: { gap: 1.2, flank: 0.6, speed: 11, height: 1.8, reach: 2 }`: it walks in from beside its holder.
- Drawing (js/summon-figures.js): a figure kind `ronin` in `VIS.abilityFx` with its `model`, a ghost shader (`solid: false`), its `guard` pose (blade low, hand on the hilt) and `cry` pose (blade raised level at the boss), and two `moves` of its own key poses no enemy uses: `roninDraw` (a rising draw cut) and `roninCross` (a turning cross cut), taken in turn by the blow's number.
- The first attack the boss lands on its decoy while it draws plays a deflect pose and spark on the shade (drawing only; the decoy can't be hurt anyway).
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/ronin_shade.py`, packed to `js/baked/ronin-shade.js` (`'ronin-shade': { sources: ['ronin_shade'] }`).
- Look: a lean wandering swordsman in a wide, shallow straw hat that hides the face, a tattered cloak to the shins over a plain wrapped coat, straw sandals, one long single-edged blade and its scabbard. No crest, no hood, no scarf (so it is never mistaken for the player) and nothing an enemy wears.
- Height: 1.8 m; the hat 1.0 m across; the blade 1.1 m.
- Material: the figures' ghost shader: an ink-dark body (`#0b0d12` at 60% opacity) bright at its edges in blue (`#8fb8dc`), the blade's edge and the hat's rim white-hot (`#f2f6fa`). Slots: `cloth`, `straw`, `steel` (glows).
- Rig: one rigid mesh per game bone of js/rig.js's skeleton, so the figures' key poses drive it; the cloak in two halves on the cape bones; about 3,000 triangles.
- Animations: arrive (walks in from 3 m off, fading in from the feet up over 0.5 s, hat last), idle (blade low, a slow sway of the cloak), strike (`roninDraw`, `roninCross`, each with a held follow-through pose), draw (blade raised level at the boss, 1 s), leave (a short bow, then it dissolves from the hat down into falling blue flakes, 0.7 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the shade: it places it, cuts for it and draws the boss's eye with it for `draw` s (3-4 s) after it arrives; it can't be hurt, and an attack begun on it ends on it. It stands off the boss's flank, with no collision, and never blocks, pushes or heals a teammate. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each cut (t = h):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.50 | Arrive | It fades in from the feet up as it walks, a thin white line climbing it; 10 blue flakes fall off it | `#8fb8dc` edges, `#f2f6fa` line |
| h-h+0.12 | Cut | One hard flat arc follows the blade, 2.4 m long, white core, blue edge, ink outline; the shade holds the pose after it | `#f2f6fa` core, `#8fb8dc` edge, `#0b0d12` outline |
| h+0.12-h+0.50 | Hang | The arc hangs, then thins and fades; 6 sparks at the contact | `#8fb8dc` |
| draw | Spark | On the first blow it takes, a flat four-point deflect star and 8 sparks at its blade | `#f2f6fa`, `#8fb8dc` |
| `time`-+0.7 | Leave | Bow, then it dissolves from the hat down into flakes | `#8fb8dc` to transparent |

Budget (Rare summon class): the model + 2 pooled meshes (cut arc, deflect star) + 1 ribbon (the blade's trail) + 10 flakes at arrival and 6-8 sparks a cut (at most 30 alive; 17 on Normal), 1 effect light while striking (blue-white, 0.15 s a cut, intensity × 0.65 on Normal), no impact frame. Peak 0.12 s a cut; a cut every 1.2-1.4 s, under 3 Hz. Reduced motion: the arc's hang is held still. The shade stands off the boss's flank, so its arcs cross the boss's body, not its weapon's wind-up.

## Sound

`abilityRonin` (new, in `js/data/audio.js`) on the call: a transient of a single wooden sandal step (a short knock, band-passed at 600 Hz, 20 ms), a body of wind through cloth (pink noise band-passed at 500 Hz, 0.6 s), a tail of a thin ringing blade (sine 1175 Hz with a 2.76 partial, 1 s). `abilityRoninCut` on each cut: a fast swish (band-passed noise sweeping 2-6 kHz, 60 ms) and a clean ring (sine 880 Hz, 0.3 s). On the draw's deflect: the normal deflect clang, pitched down 3 semitones.

## Camera

`CONFIG.camera.feel.powers.ronin = [1.4, 0.04]` as it arrives; no kick a cut; `draw = [1.2, 0.03]` on the deflect.

## Images

- `img/ronin-shade-1.webp`: a translucent blue ghost swordsman in a wide straw hat and tattered cloak deflecting a boss blow with sparks, the player swordsman beside.
