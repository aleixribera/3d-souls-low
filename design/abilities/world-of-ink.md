# World of Ink

| | |
| --- | --- |
| Id | `world-of-ink` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (44 points) |
| Origin | New |

## Card

**For {time}, every hit lands twice in ink.** (8 words, 36 chars)

- Icon (48×48 line drawing): an open hand, palm out, inside a single broken brush circle.
- Hover loop (2.0 s): key cap "4" lights (0.2 s); a small figure opens its hand and a brush circle sweeps round the card (0.4 s), the card face turning to ink on paper, one brighter frame as the circle closes; three quick cuts, each followed a beat later by an ember brush stroke on the same line (1.0 s); the paper bleeds back to dark (0.4 s).

## Idea

A domain. You open your hand and the arena turns into an ink painting with the boss inside it: for six seconds every blow you land is painted again a beat later by a brush you never hold. It does nothing on its own; it makes your next six seconds count double, so it rewards the player who casts it right before a deflect, a counter string or a Finishing Blow. Its spectacle is the world itself changing colour.

## Data

```js
{ id: 'world-of-ink', name: 'World of Ink', rarity: 'legendary', key: 'ultimate',
  text: 'For {time}, every hit lands twice in ink.',
  power: { when: 'press', then: 'inkWorld' },
  levels: [
    { charge: 44, time: 8, share: 1 },
  ] },
```

Numbers: it is worth `share` of what the holder lands in `time`. A skilled player lands 25-40 damage a second in an open window, so 8 s × 30 × 1 = about 240, and a counter (about 42) or a Finishing Blow (480 on a boss) inside it lifts a well-timed cast to 400-700: on the dragon's floor of 8.4 a point for an ordinary cast, far over it for a timed one. That is the point: it is the Ultimate that rewards planning the window.

## Engine work

- New `press/inkWorld`: `['charge', 'time', 'share']`, a timer on the holder's perk clocks (`ink`, like `moon`), not on an enemy (it fires with no enemy in range).
- While it runs, every blow the holder lands (unblocked, the Finishing Blow's cuts included) is echoed on the same enemy 0.25 s later for `share` of its damage, through `abilityPowers`' `running` list like the twin's echo (`wound`, a power's blow: it never counts toward `hits`, a counter or a crack, and sets off no power).
- The ink circle (the ensō) is drawn at the boss's position at the press, radius `CONFIG.abilities.powers.inkWorld.radius` = 14 m; it is the look only: the echo works anywhere.
- The world grade: a new uniform on the output pass that lerps the scene toward ink (luminance mapped to black ink and paper white) inside the ensō for the local camera, with ember, the holder's red scarf and the boss's tells left in colour (the tells' materials skip the grade).
- `validate.js`: `inkWorld` needs `time`, `share` (a share).

## Multiplayer

The server runs the echo for the holder only: teammates' blows are never echoed, and a teammate is never touched. The grade is drawn for the holder at full strength and for teammates inside the ensō at half, so their reads stay clear (no slowing, moving or covering a friend's fight). One holder per team.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.40 | Anticipation | Upper-body pose: the off hand raised, palm open toward the boss, held. The world dims 20% | `#e59a5c` palm glow |
| 0.20-0.60 | Brush wave | A wave of ink-wash rolls out from the palm across the floor to the boss; colour drains behind it | `#0b0b0f` wave edge, `#e9e4d8` paper behind |
| 0.45-0.70 | Ensō | A giant brushed ink circle draws itself round the boss in one stroke, 14 m across, dry-brush gaps in it, an ember bleed on its inner edge | `#0b0b0f` stroke, `#e59a5c` bleed |
| 0.70 | Peak (the circle closes) | The stroke meets its start; the whole view snaps to ink inside the circle. **The impact frame** | `#0b0b0f` / `#e9e4d8` |
| 0.70-6.70 | The painting | Inside the circle the arena is ink on paper (2 tones and a mid-grey wash), falling ash turns to black ink flecks; the holder's scarf, the boss's wind-ups and every ember stay in colour | `#0b0b0f`, `#8a8478`, `#e9e4d8`; ember `#e59a5c` |
| each hit | Brush echo | 0.25 s after each of the holder's blows a flat ember brush stroke paints the same cut line, thick in the middle, dry at the ends, then a small black splatter | `#e59a5c` stroke, `#fff3dc` core, `#0b0b0f` splatter |
| 6.70-7.20 | Fade | The circle's ink runs and drips downward, the colour bleeds back from the edge inward | to the scene's own colours |

Budget (Legendary class for the opening, aura class after): opening 5 pooled meshes (brush wave, ensō ring, palm glow, splatter sheet, stroke pool head) + 40 ink flecks (22 on Normal), 1 effect light (palm), no ribbon, 1 impact frame at t = 0.70, peak 0.7 s. The 6 s hold is an aura: 4 meshes (ensō, 3 pooled echo strokes reused round-robin), 30 ink flecks (17 on Normal), no light (the ember strokes are the brightest thing in the painting), no flash. The grade is one uniform, no extra pass. Boss tells: the boss's weapon and wind-up glows are never graded, so nothing is hidden. Reduced motion: the impact frame becomes a 30% darken, no shake, and the grade fades in over 0.3 s instead of snapping.

## Sound

New `abilityInk`: a wet brush swipe (pink noise, band-pass 1.2 to 4 kHz over 0.3 s) at the palm, a deep paper thump at the closing (sine 60 to 35 Hz, 0.4 s, plus a dry tear of white noise 20 ms), and a tail where the world's sound goes muffled (the sfx bus low-passed to 2.2 kHz for the 6 s, restored over 0.4 s). Each echo: `abilityInkStroke`, a short brush flick (band-passed noise 2.5 kHz, 80 ms) and a low ink tap (110 Hz, 50 ms).

## Camera

`CONFIG.camera.feel.powers.inkWorld = [-2.6, 0.06]` at the closing (the view pulls in as the world turns), and each echo uses `echo = [-0.6, 0.02]`. Nothing else.

## Images

- `img/world-of-ink-1.webp`: a whole battle arena turned into a black ink-wash painting on pale paper inside a giant brushed ink circle, the boss trapped inside, ember orange brush strokes painting each sword hit.
- `img/world-of-ink-2.webp`: the moment the world turns to ink: a wave of ink-wash spreading from the swordsman's open hand across the arena, colour draining from everything.
