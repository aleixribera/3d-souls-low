# Heaven's Lance

| | |
| --- | --- |
| Id | `heavens-lance` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (40 points) |
| Origin | New |

## Card

**A pillar of light pins the boss for {time}.** (9 words, 38 chars)

- Icon (48×48 line drawing): a tall narrow column falling from a gap in two cloud strokes onto a small ring on the ground.
- Hover loop (1.6 s): key cap "4" lights (0.2 s); a small figure points the blade up (0.2 s); a hole opens above a boss silhouette and a column drops onto it, one brighter frame (0.2 s); the boss stands black inside the column, burning ticks along its edge (0.8 s); the column thins to a line, fade (0.2 s).

## Idea

Point the blade at the sky and a pillar of white-gold light lances down onto the boss and holds it where it stands for two seconds, burning. Its gift is the pin: a boss that can't step, lunge or leap for two seconds, while it burns, is a boss you can read and punish. It still swings in place, with its own tells, so the pin opens a window rather than closing the fight.

## Data

```js
{ id: 'heavens-lance', name: "Heaven's Lance", rarity: 'legendary', key: 'ultimate',
  text: 'A pillar of light pins the boss for {time}.',
  power: { when: 'press', then: 'beam' },
  levels: [
    { charge: 40, time: 2, every: 0.2, damage: 30 },
  ] },
```

Numbers: 2 / 0.2 = 10 burns of 30 = 300 for 40 points, 7.5 a point, a little under the dragon's 8.4; the pin pays the rest (two seconds of a boss that can't close or escape, worth a full light string and a heavy, about 60-90 more). About 600-900 a fight with the pin's openings. On the bar.

## Engine work

- New `press/beam`: `['charge', 'time', 'every', 'damage']`, in `ON_ENEMY`; a `running` entry like `blades`, first burn 0.2 s after the column lands (t = 0.55), then every `every` s.
- **The pin** (new, shared with Frozen Lotus): the struck enemy's `rooted` timer is set to `time`. A rooted enemy can't move, lunge, leap or be pushed; it turns at half speed and its attacks run in place with their own tells (a lunge's step is skipped, its blow still swings). A boss that can't be held now (between phases, through a Finishing Blow) burns but isn't pinned.
- **Hold rest** (shared by every hold: pin, freeze, kneel): after any hold on an enemy ends, it can't be held again for `CONFIG.abilities.holdRest` = 3 s; the damage still lands. This keeps a party of four control legendaries from chaining a boss still.
- `validate.js`: `beam` needs its four numbers; `time / every` a whole number.

## Multiplayer

The server resolves it on the press's target and runs the pin on its own enemy (the server owns the boss's movement). A teammate inside the column is untouched and sees the light pass through them; the pin never touches a player. One holder per team.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Anticipation | Upper-body pose: the blade pointed straight up, the off hand on the pommel. The world dims 20%. A thin line of light climbs from the blade tip into the sky | `#fff6d8` line |
| 0.15-0.35 | Sigil | A ring of hard-edged light marks forms on the floor round the boss (its radius + 1 m), drawn clockwise in 0.2 s | `#e59a5c` ring, `#fff6d8` marks |
| 0.25-0.35 | Opening | The clouds over the boss part in a ragged hole; a white-gold disc shows inside | `#fff6d8`, `#e8c46a` rim |
| 0.35 | Peak (the lance lands) | A column 3 m wide drops from the hole to the floor in one frame: white-gold core, ember edges, a black ink outline; a shock ring at its foot, 30 sharp sparks. **The impact frame** | `#fff6d8` core, `#e59a5c` edge, `#0b0b0f` ink |
| 0.35-2.35 | Hold | The column stands; the boss is a black silhouette inside it; ash swirls up the column's edge; each burn sends a ring of 6 sparks up the column (the core holds steady: 5 burns a second must never pulse the light); the column goes 35% translucent within 2 m of the boss's weapon while it winds up | `#fff6d8`, `#e59a5c` sparks, `#5a5550` ash |
| 2.35-2.80 | Fade | The column thins to a line from the edges in and is drawn back up into the hole, which closes; the sigil cools and breaks into flakes | `#e59a5c` to transparent |

Budget (Legendary class): 7 pooled meshes (sky line, sigil ring, cloud hole disc, column, column inner core, shock ring, ash spiral sheet) + 30 + 10 × 6 + 40 ash = 130 particles at most (72 on Normal), 2 effect lights (the landing's flash; the column's foot, steady; × 0.65 on Normal), no ribbon, 1 impact frame at t = 0.35. Peak 2.0 s. Reduced motion: the impact frame becomes a 30% darken, no shake, the column fades in over 0.3 s instead of dropping.

## Sound

New `abilityLance`: a rising choir tone (sine partials at 1, 1.5 and 2 over 440 Hz, swelling 0.3 s) during the anticipation; at the landing a hard crack (high-passed white noise, 25 ms) over a deep boom (sine 50 to 30 Hz, 0.8 s); the hold is a steady roar of light (band-passed pink noise at 1.8 kHz with a slow tremolo, 2 s) with a sizzle tick on each burn (white noise 6 kHz, 30 ms). Tail: the tone falling a fifth as the column lifts.

## Camera

`CONFIG.camera.feel.powers.beam = [-2.8, 0.1]` at the landing (the view tightens on the pinned boss). No kick on the burns.

## Images

- `img/heavens-lance-1.webp`: a colossal pillar of white-gold light with ember orange edges lancing down from a hole in the dark clouds onto a boss, a glowing ring on the ground, the swordsman pointing the blade skyward.
- `img/heavens-lance-2.webp`: the boss silhouetted black inside a column of blinding white-gold light, ash swirling around the column.
