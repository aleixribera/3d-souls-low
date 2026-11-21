# Mother Agathe, the Rending Hand

The eleventh boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/agathe.js` (boss id `agathe`, model `motherAgathe`); model: `tools/blender/agathe.py`. Status: pass 146,
the audit; pass 148, the parries, the body check, the cel tells, in-between keys and one `bars-1` round (below);
awaiting Aleix's fight.

## Moveset audit (pass 146): restyle, plus parries and the body check

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of her own: meets.** Made for her in pass 48 (her own `agathe*` key poses, no move sources, no other
  boss's names): 8 as the abbess (the Crook again, sooner, at someone drinking), 11 in the storm (Rend the Earth and the
  Cornerstone give way to Lightning Down the Furrow, the Storm Knows Its Own, the Gale Reap, the Hook from the Storm).
  Her Rending Brothers (the Beastman's moves renamed) called their line of shockwaves "Rend the Earth" too; since pass
  148 theirs is "The Floor Torn Open".
- **3 or 4 combos: meets.** The Reaping Draw (reap, then the draw at your knees; get behind and the Turning Hook comes),
  the Crook (reach, held, then the haul), the Correction (three raps; stay close and Hook and Haul follows), Hook and
  Haul; in the storm also Lightning Down the Furrow, the Storm Knows Its Own (three bolts), the Gale Reap.
- **One or two signature moments a phase: meets, thinly in the first.** The abbess: the Cornerstone, a slab of the
  abbey torn up and hurled (22 %, from 6 m). The storm: the Storm Comes, and the bolts that follow you and hold still.
- **A real phase two: meets.** The storm at her back: a new rule (the storm falls where you stand: step off its mark),
  four new moves, the hook seamed with lightning.
- **`noParry` on a quarter at most: missed badly, fixed in pass 148.** The abbess had 3 of 9 roll-only, the storm 6 of
  12. Now every blow of the hook or its iron shoe takes a parry, and only what runs along the floor or falls from the
  sky is rolled, jumped or stepped off (a hit's `noParry`): Rend the Earth and Lightning Down the Furrow split into the
  hook's blow before her (parried) and the furrow's line after (rolled); the Gale Reap's two reaps are parried; the Hook
  from the Storm's landing is parried and the storm then strikes the planted hook, a ring along the floor (jumped).
  Roll-only left: the abbess 2 of 9 (Torn Stones, the Cornerstone, both thrown), the storm 3 of 12 (the Storm Comes,
  Torn Stones, the Storm Knows Its Own).
- **Every wind-up her own: on paper** (eight distinct poses named in the data file's header); the `bars-1` round decides.
- **The body check: missed, fixed in pass 148.** `node tools/body-check.cjs agathe`: 18 of 24 hits flagged (no overshoot
  past nearly every strike; the Cornerstone and the Hook from the Storm arm only). Now 0 of 27: every follow-through
  carries her on past the blow, the Cornerstone turns into its haul and uncoils through the throw, and she arches back
  aloft before the Hook from the Storm.

So she keeps her moves; the work was the parries and the body, then the look, the animation and the judge.

## Idea

The abbess who held the knife when Thrale's monks tried to cut the Ember out of the earth and tore the hill loose into
the storm (STORY.md, part one, chapter 12). She did not let go, and she still does not. **Fighting her is about reach:**
her great hook covers the whole floor around her, so you live inside its curve or well outside it; past half her
strength the storm comes at her back, and standing still anywhere is the mistake.

## Silhouette

A gaunt, stooped old woman (1.95x) in a white coif under a black veil that falls into a long torn mantle, a storm-grey
scapular, wide bell sleeves; the great hook, an ash haft taller than a man with a crescent blade as long as an arm. From
20 m: the hook's crescent over her head like a shepherd's crook, and the mantle.

## Moveset (13 moves over two phases, 14 entries; 6 strings)

| Attack | Tell (her own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| The Reaping Draw | the hook laid out far to her right, low, her eyes over her left shoulder; held | parry the reap, parry or jump the draw | rolling once |
| The Crook | the haft levelled straight at you at shoulder height, held | parry the reach and the haul, or roll toward her | standing off at mid range; drinking (sooner) |
| The Correction | the haft turned butt-first across her breast like a staff (the tell on the iron shoe) | parry three raps | staying close |
| Hook and Haul | the hook trailing behind her right heel, her head bowed to your feet | jump or parry the ankle reap, parry the chop | rolling early |
| Rend the Earth | the hook raised high on her left, her left foot stamped out | parry the hook, then roll or jump the line | standing in front at range |
| Torn Stones | crouched, the hook dragged behind her left through the rubble | sidestep the fan | standing off |
| The Cornerstone | the hook driven into the floor, both hands hauling back on it | sidestep the slab | standing far off |
| The Turning Hook | the haft hugged upright, a look over her right shoulder | parry or roll | standing behind |
| The Storm Comes (opener) | the hook lifted to the sky in both hands, crouched under it | jump or roll the ring | standing near at the change |
| The Storm Knows Its Own | the hook up in her right hand alone, her left palm open to the clouds | step off each mark | standing still |
| Lightning Down the Furrow | as Rend the Earth, then the hook pointed at you | parry the hook, roll the line, step off the bolt | standing in front at range |
| The Gale Reap | the hook wound round behind her back, her back to you | parry both reaps, or roll and jump | crowding her back |
| The Hook from the Storm | a deep crouch, the hook trailing; the spring | parry the landing or roll it late, jump the ring | keeping your distance |

Strings, every one broken by a counter (PLAN item 3): the Reaping Draw (into the Turning Hook behind her), the Crook,
the Correction (into Hook and Haul), Hook and Haul; in the storm Lightning Down the Furrow and the Gale Reap.

## Signature moments

- **The abbess:** the Cornerstone, a slab of the abbey torn up and hurled.
- **The storm:** the Storm Comes, and the Storm Knows Its Own, three marks that follow you, hold still and are struck.

## Phase two

At half her strength the storm comes at her back: lightning seams the hook and the sign on her breast, and the storm
falls where you stand (a hit's `bolt`): a mark follows you, holds still and is struck. Four new moves (the Storm Knows
Its Own, Lightning Down the Furrow, the Gale Reap, the Hook from the Storm); Rend the Earth and the Cornerstone go.

## Effects

The hook's steel and the torn earth as the abbess, the storm's once it comes (`BOSS_FX.agathe`). The wind-up's tell sits
on what strikes (`edgeTell`, pass 148): the crescent (`steel`, banded as steel in cel), or the iron shoe at the butt for
the Correction's raps (`tells.shoe`); a heavy's halo grows there and her body keeps its own colour. The swing's ribbon
is a thin arc at the crescent, its head smeared on the last frames.

## Animation

Key poses per hit (`agathe*` in the data file; the haft's angle as `haft: [pitch, yaw, roll]`), and in-between keys
(pass 148, all `rel`, generated from each hit's own poses as the Ringer's and Oswin's): a last hand's breadth of wind,
her hips and chest lead while the hook trails and whips through, her weight goes on after the blow. Every wind-up
reaches its own pose fast and then gathers (`outCubic`). Strips (`STYLE=cel`): `docs/scorecard/now/agathe-*.jpg`; clip
`agathe-cel.mp4`.

`bars-1` round (pass 148, 9 cel strips blind, four of hers beside five bosses already through): every one of her
wind-ups reads, her body uncovered, the tell red on the crescent or the shoe. Its biggest problem was hers: the Gale
Reap, Rend the Earth and the Hook from the Storm open on the same frame (the guard at rest, the crescent over her head);
rechecked: they part by the second frame (haft levelled behind her, raised on her left, a crouch), as every boss's strip
starts from its guard. The Hook from the Storm turns from red (parry the landing) to blue (jump the ring) as the storm
strikes, which the judge read as unclear on the strip; in play the ring is its own blue tell after the landing, as the
Ringer's Out of the Ring. The diff review: Rend the Earth's blow is now chosen only from where it reaches (6 m, a step
in), and its line falls where the blow was aimed (`still`).
