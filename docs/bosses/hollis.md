# The Regent Hollis

The ninth boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/hollis.js` (boss id `hollis`, model `regentHollis`); model: `tools/blender/hollis.py`. Status: pass 143,
the audit, a new string, a parry, the body check, the cel tells and in-between keys, one `bars-1` round (below); awaiting
Aleix's fight.

## Moveset audit (pass 143): restyle, plus a string, a parry and the body check

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of his own: meets.** 11 moves made for him in pass 44 (his own `hollis*` key poses, no move sources,
  Morgott's moves gone, no other boss's names): the Courtesy (answered with an X when hungry), the Salute (sooner at
  someone drinking), Taking Your Measure, the Long Table, the Judgement, the Turning Cloak, Largesse; hungry, the Gilt
  Cracks, Called Home, Ravenous and the Feast.
- **3 or 4 combos: one short in his first phase, fixed in pass 143.** Across the fight there were four strings (Taking
  Your Measure, the Courtesy answered, Ravenous, Called Home), but three of them are hungry only: gracious, every move but
  Taking Your Measure was one cut and its gilt echo. Pass 143 adds **the Pavane**, three measures and the bow's hanging
  line, with a branch (back off after it and the Salute's thrust answers; get behind him and the Turning Cloak does).
- **One or two signature moments a phase: meets.** Gracious: the gilt echo itself (every cut hangs in gold leaf and
  cuts again where it hangs; parry the man, step out of the gilt) and Largesse (gold leaf closing round you where you
  stand off). Hungry: the Gilt Cracks, and Called Home, the hanging line drawn home to him through you.
- **A real phase two: meets.** Past the worst of his hurt the gilt cracks: the echoes hang as embers, a new rule (a
  line called home cuts through the space between it and him), four new moves (the Gilt Cracks, Called Home, Ravenous,
  the Feast) and the Courtesy answered as an X.
- **`noParry` on a quarter at most: missed in phase two, fixed in pass 143.** Gracious 2 of 8 (the Long Table at the
  knees, Largesse); hungry 4 of 12 (those two, the Gilt Cracks, the Feast). The Feast's blade driven into the floor is
  the sword's own blow: now parried, its gilt still stepped out of. Now 2 of 9 and 3 of 13.
- **Every wind-up his own: meets on paper.** The bow with the sword low at his right (the Courtesy), the blade upright
  before his face (the Salute), wound back level at his hip (Measure), a deep coil with the point on the floor (the Long
  Table), both hands high behind his head (the Judgement), the look over his shoulder (the Turning Cloak), the hand
  drawn to his breast (Largesse), the hand offered palm down with the sword trailing behind him (the Pavane); hungry,
  the mask clutched, hunched and looking up, the sword point-down in both hands, the open hand held out. The `bars-1`
  round decides it.
- **The body check: missed, fixed in pass 143.** `node tools/body-check.cjs hollis`: 11 of 30 hits flagged (Ravenous's
  cuts and the Feast stopped dead on the strike, Largesse's gesture carried no weight, Called Home's leap and pull
  ended where they struck). Now 0 of 34.

So he keeps his moves, gains the Pavane, and the Feast is parried; then the look, the animation and the judge.

## Idea

The steward the hunger left to keep Aurel fed when it went over the mountains (STORY.md, part one, chapter 10): gilded,
gracious, cruel. Aurel lays its faces in gold leaf, and so did he, and the gilt remembers what he does with it.
**Fighting him is about the line a cut leaves:** parry the man, step out of the gilt, and know which cut will come
again; past half his strength the gilt cracks and the lines come home to him through you.

## Silhouette

A tall, upright courtier (1.9x) in a gold-leaf mask with a thin smile, a regent's fillet, a standing crimson collar over a
fur roll, layered gilt pauldrons and a crimson mantle to the floor; the Sword of State, long and bright, its point low
before his right foot. From 20 m: the mantle's long fall, the high collar and the long straight blade.

## Moveset (12 attacks, 14 entries; 5 strings)

| Attack | Tell (his own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| The Courtesy | a bow, the sword low at his right; held | parry the rising cut, step out of its line | rolling early into the echo |
| The Salute | heels together, the blade upright before his face; held | parry the thrust, sidestep its echo | backing straight off |
| Taking Your Measure | the sword wound back level at his hip, eyes over his shoulder | parry, parry, step out | keeping just out of reach |
| The Pavane | his left hand offered palm down, the sword trailing behind his hip | parry three, step out of the bow's line | rolling after the first |
| The Long Table | a deep coil, the point on the floor behind his heel | jump or roll each sweep | standing close |
| The Judgement | both hands high, the blade behind his head; held | parry on its fall, step out of the echo | rolling early |
| The Turning Cloak | a look over his shoulder | parry or roll | standing behind |
| Largesse | the sword stood on its point, his hand drawn to his breast | leave the gold before his fingers curl | standing off |
| The Gilt Cracks (opener) | the mask clutched in his left hand, doubled over | roll the burst | standing near at the change |
| Called Home | his open hand held out, palm up, the blade high behind | parry, then get out of the line sideways | standing in line with him |
| Ravenous | hunched low, looking up, the point scraping the floor | parry four, step out | rolling once |
| The Feast | the sword raised point-down in both hands; the leap | parry the blade, leave the gilt round him | keeping your distance |

Strings, every one broken by a counter (PLAN item 3): Taking Your Measure, the Pavane, the Courtesy answered, Ravenous and
Called Home; every cut that hangs is a beat after its own.

## Signature moments

- **Gracious:** the gilt echo, every cut again where it hung; Largesse closing round you.
- **Hungry:** the Gilt Cracks; Called Home, the line drawn through you back to him.

## Phase two

At 55 % the gilt cracks: embers instead of gold, sooner and closer, his lines called home through you, Ravenous, the Feast,
and the Courtesy answered as an X.

## Effects

Gold leaf and the light off it, fire once the gilt cracks (`BOSS_FX.hollis`; the hanging cuts drawn by `js/gilt-echo.js`).
The wind-up's tell sits on the Sword of State's edge near its point (`edgeTell`, pass 143, banded as steel in cel); a
heavy's halo grows there and his gilt keeps its colour. The swing's ribbon is a thin arc at the edge, its head smeared on
the last frames.

## Animation

Key poses per hit (`hollis*` in the data file, blade angles as `pitch`), and in-between keys (pass 143, all `rel`, from
each hit's own poses as the Ringer's): a last hand's breadth of wind, his hips and chest lead while the blade trails and
whips through, his weight goes on after it. Every wind-up reaches its pose fast and then gathers (`outCubic`). Strips
(`STYLE=cel`): `docs/scorecard/now/hollis-*.jpg`; clip `hollis-cel.mp4`.

`bars-1` round (pass 143, 7 strips blind, three of his beside four bosses' already through): every wind-up his own and
told red, but its biggest problem was his: the crimson mantle stood out behind him as a board and covered his body
through the Pavane's turn and bow. A long cloak strip now takes `plumb` (`anim.cloth`, js/animator.js: that share of the
body's forward bend taken back off it, so it hangs down a bowed back) with a lower outward `max` and half the sideways
swing; the Pavane winds only part way round before the turn (rechecked). Left: from the side camera the mantle still
fills the frame for a beat after his first cut, while his back is turned (`BACKLOG.md`).
