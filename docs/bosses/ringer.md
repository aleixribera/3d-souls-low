# The Ringer of Thrale

The eighth boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/ringer.js` (boss id `ringer`, model `ringerOfThrale`); model: `tools/blender/ringer.py`. Status: pass 142,
the audit, the parries, the body check, the cel tells and in-between keys, one `bars-1` round (below); awaiting Aleix's fight.

## Moveset audit (pass 142): restyle, plus parries and the body check

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of her own: meets.** 11 moves made for her in pass 42 (her own `ringer*` key poses, no move sources,
  no other boss's names): 7 inside her circle (Calling Across the Ring comes sooner at someone drinking), 4 more over
  the line. The Hour Struck and the Fetter Stamp change in phase two (a second blow), counted once.
- **3 or 4 combos: meets.** Change Ringing (low, then high; the Backstroke if you got behind), the Clapper Drive (jab,
  then the drive, held), the Fetter Stamp flowing into the Rising Toll or the Hour Struck (over the line, into the
  Peal), the Peal (four blows), the Nine Tailors (four knells).
- **One or two signature moments a phase: meets.** Chained: her circle on the floor (`tether`), and Calling Across the
  Ring, the knell sent 20 m along the stones at whoever stands off. Over the line: Over the Line itself (she steps over
  for the first time and the great knell runs to the walls) and the Nine Tailors, counted out on her knees.
- **A real phase two: meets.** At half her strength the circle is gone: she follows you anywhere, comes sooner, leaps
  out of the ring at range, and four new moves come; the Hour Struck and the Fetter Stamp gain a second knell.
- **`noParry` on a quarter at most: missed.** 8 of 15 entries (53 %): the Fetter Stamp twice, the Backstroke, both calls,
  Over the Line, the Nine Tailors, Out of the Ring. Pass 142 gives every blow that is the clapper's or the fettered
  foot's a parry and keeps only the knell after it roll-or-jump (a hit's `noParry`): the Backstroke, Over the Line's and
  Out of the Ring's ball, the Fetter Stamp's foot. Left roll-only: the two calls and the Nine Tailors, knells and nothing
  else. Chained 2 of 8, over the line 3 of 12: a quarter each. The Hour Struck's second knell and the Peal's last were
  parriable rings; now jumped like every knell.
- **Every wind-up her own: meets on paper.** The clapper is somewhere different in each: hung down her back (the Hour),
  trailing low at her left (Change Ringing), hanging between her feet (the Rising Toll), along her right side (the
  Drive), held upright before her bowed face (the Call), upright with her knee drawn up (the Stamp), slung over her
  shoulder in a crouch (Out of the Ring), across her like a staff (the Peal), on her knees (the Nine Tailors). The
  `bars-1` round decides it.
- **The body check: missed, fixed in pass 142.** `node tools/body-check.cjs ringer`: 16 of 26 hits flagged (most blows
  into the floor stopped dead on the strike; the knells after Over the Line and Out of the Ring carried no weight; Out of
  the Ring's ball was all arm). Now 0 of 28.

So she keeps her moves; the work is the parries and the body, then the look, the animation and the judge.

## Idea

The bellwright's daughter who rang Thrale's bell without leave the night the Seven came, and was shut in the great
ring of the Night Gaol for it, the bell's clapper chained to her wrist (STORY.md, part one, chapter 9). Her chain is long
broken; she does not know it. **Fighting her is about her circle:** inside it she is close and heavy, and standing off
is no safety, because she calls across the ring; past half her strength she steps over the line, and the hours ring.

## Silhouette

A gaunt, stooped woman (1.85x) in a scold's bridle with a small bell on its crown, a sackcloth shift and a foundry apron,
fetters at wrists and ankles, a broken chain hanging from her left; the long clapper of Thrale's bell in her right hand,
its heavy ball worn bright. From 20 m: the bridle's bell and the long shaft with the ball.

## Moveset (11 attacks, 15 entries; 5 strings)

| Attack | Tell (her own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| The Hour Struck | the ball lifted until it hangs down her back, her head bowed under it; held | parry on its fall, or step aside | rolling early |
| Change Ringing | the clapper trailing low at her left, turned away | parry or jump low, then parry high | rolling once |
| The Rising Toll | stooped low, the ball between her feet, her eyes up at you | parry, or roll late | standing close |
| The Clapper Drive | side-on, the shaft along her right side, her left hand guiding it | parry, parry (the drive held) | keeping just out of reach |
| The Fetter Stamp | the clapper upright, her left knee drawn up high | parry the foot, then jump the ring | standing close |
| The Backstroke | a look over her right shoulder, the clapper raised before her left | parry or roll | standing behind |
| Calling Across the Ring | the clapper upright before her bowed face, as if listening; held | jump or roll the knell | standing off; drinking at range (sooner) |
| Over the Line (opener) | the clapper high in her right hand, her left arm flung wide, her face lifted | parry the ball, jump the great knell | standing near at the change |
| The Nine Tailors | she kneels; the clapper lifted upright, three times, then over her head | jump each knell on the beat | standing off |
| The Peal | the clapper held across her like a staff, both fists wide | parry three, jump the last knell | rolling after the first |
| Out of the Ring | a deep crouch, the clapper slung over her right shoulder; the leap | parry the landing, jump the knell | keeping your distance |

Strings, every one broken by a counter (PLAN item 3): Change Ringing, the Clapper Drive, the Fetter Stamp, the Peal and
the Nine Tailors; the Hour Struck, Over the Line and Out of the Ring each end in a knell.

## Signature moments

- **Chained:** her circle, and Calling Across the Ring past its edge.
- **Over the line:** Over the Line, the great knell to the walls; the Nine Tailors on her knees.

## Phase two

At half her strength she steps over the line: no circle, sooner and closer, Out of the Ring at range, the Peal and the
Nine Tailors, and a second knell on the Hour Struck and the Fetter Stamp.

## Effects

Old iron while she is chained, the pale toll of a bell over the line (`BOSS_FX.ringer`, knells drawn by
`js/ring-waves.js`). The wind-up's tell sits on what strikes (`edgeTell`, pass 142): the ball's bright band (`struck`,
banded as steel in cel), or the fettered foot she stamps with (`tells.footL`, `footR`); a heavy's halo grows there and
her body keeps its own colour. The swing's ribbon is a thin arc at the ball, its head smeared on the last frames.

## Animation

Key poses per hit (`ringer*` in the data file, clapper angles as `pitch`), and in-between keys (pass 142, all `rel`,
generated from each hit's own poses as the castellans'): a last hand's breadth of wind, her hips and chest lead while
the ball trails and whips through, her weight sinks on after a blow into the floor. Strips (`STYLE=cel`):
`docs/scorecard/now/ringer-*.jpg`; clip `ringer-cel.mp4`.

`bars-1` round (pass 142, 8 strips blind, three bosses' beside four of hers): its biggest problem was hers: the Hour
Struck, Change Ringing and the Backstroke looked alike for their first third (the clapper still at rest, then level),
so the wind-ups were told apart late. Her wind-ups were eased in slowly (`inOutSine`); now each reaches its own pose
fast and then gathers (`outCubic`), and they part by the second frame (rechecked). Left for later, the engine's, not
hers: a ground area mark is drawn orange-red, close to the parry red, and its fill sits over her legs while the Fetter
Stamp's ring is marked (`BACKLOG.md`).
