# The Antlered Hunger

The fifth boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/antlered-hunger.js` (boss id `antlered`, model `antleredHunger`); model: `tools/blender/antlered_beast.py`.
Status: pass 132, the moveset audit (below), and every follow-through carries it on past the strike
(`tools/body-check.cjs`: 11 hits flagged before, none after). Pass 133: the parries and a name of its own (below), and
its cel look's first step: a heavy wind-up grows the halo on what strikes instead of washing its hide orange
(`tellsGrow`). Next: the cel look (hide, quills, antlers in cel bands), in-between keys, then the `bars-1` judge.

## Moveset audit (pass 132): restyle, plus three parries and a name

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of its own: meets.** 8 moves made for it in pass 77 (its own `hunger*` key poses, no move sources),
  each with a learned form (6) that comes once you escape the plain one: 14 in all.
- **3 or 4 combos: meets.** The Claw Rake and the Starving Frenzy, and every learned form is a string made to catch
  the way you got out (the held third rake, the hook back, the second fall, the turn, the wheel, the second leap).
  Before it has learned anything, the stalking half has only the Rake: the learning is the string-maker, by design.
- **One or two signature moments a phase: meets.** Stalking: its antlers lighting, one collar for each move it learns,
  and all going dark on a Finishing Blow. Starving: the Roar and the Fall.
- **`noParry` on a quarter at most: missed in pass 132 (5 of 8: the Hammerfall, the Antler Charge, the Hind Kick, the Roar, the
  Fall; 9 of 14 with the learned forms); met in pass 133 (2 of 8).** Its claws, antlers and hooves are its weapons, and the fight's answer is
  "press it, parry it, break it", yet most of it can only be rolled. Pass 133: the Rearing Pound (both fists), the Antler
  Charge (the antlers) and the Hind Kick (the hooves) take a parry, with every blow of their learned forms but the
  floor ring; the Roar and the Fall stay roll only. A kick behind it is parried from behind (`parryTiming` measures an
  attack's reach either way).
- **A real phase two: meets.** It roars, comes faster and closer, leaps on you from afar (distance stops being safe)
  and tears at you four times running; it keeps learning.
- **Every wind-up its own: meets; one name was not.** Each tell is its own beast's pose, but "Hammerfall" was the Bell
  Warden's "The Hammerfall" (VISION: no two bosses share attacks). Pass 133: the Rearing Pound.
- **The body check: met now.** 11 of 27 hits stopped dead on the strike (the rear-up's pound, the kick, the roar, the
  landing); pass 132 carries each on.

So it keeps its moves and its rule; the work was three parries and a name (pass 133), then the look, the animation and the judge.

## Idea

The hunger the Ember left behind, gone back over the mountains to the Seven's first church to wear a starving stag
(STORY.md, part one, chapter 6). It never tries the same thing twice over, because the hunger learned that from a king.
**Fighting it is a race:** every move of its own you escape, it learns, and comes again changed to catch you the way you
got out; the longer you only dodge, the more of you it knows. Press it, parry it, break its guard, and it forgets.

## Silhouette

A starving stag grown huge (2.3x), up on two legs or down on its fists: a skull for a face under a wide rack of antlers,
quills along its back, long clawed forelimbs. From 20 m: the antlers, and the ember collars lit round them.

## Moveset (14 attacks; 8 strings)

| Attack | Tell (its own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| Claw Rake | rearing back, the right claw high beside its skull, body turned right; then the left | parry, parry | standing in reach |
| Claw Rake, Learned | the Rake, then both claws drawn back low and wide; held | parry three | rolling after the second |
| Antler Hook | the skull dipped low to its left, antlers raking the floor | parry or roll | standing at its side |
| Antler Hook, Learned | the Hook, then the skull dipped to its right | parry or roll, twice | rolling the way the hook went |
| Rearing Pound | up on its hind legs, both claws high, the skull looking down; held | parry or roll | greed after a string |
| Rearing Pound, Learned | the rear again, a stride on; the floor jumps round it | parry or roll, then jump or roll | rolling only once |
| Antler Charge | its head down, the right fist pawing back along the floor | parry, step aside or roll | keeping your distance |
| Antler Charge, Learned | past you it turns on its haunches | parry, step aside or roll, twice | stopping after the first |
| Hind Kick | its weight on its fists, hind legs drawn up, the skull looking back between its forelegs | parry or roll | standing behind it |
| Hind Kick, Learned | the kick, then the right claw thrown out wide | parry or roll, or be out of reach | staying behind it |
| The Roar (starving opener) | its skull thrown back, its arms flung wide | jump or roll | standing anywhere near at the change |
| The Fall (starving) | crouched on its haunches, both fists flung up as it springs | roll, then jump or roll the floor | keeping your distance |
| The Fall, Learned (starving) | the pounce again | roll, roll, then the floor | rolling only once |
| Starving Frenzy (starving) | rakes right, left, right, then the right claw straight up over its skull | parry three, roll the chop | mashing |

Strings, every one broken by a counter (PLAN item 3): the Claw Rake, the Starving Frenzy, and the six learned forms.

## Signature moments

- **Stalking:** an ember collar lights round its antlers for each move it learns, skull out to the tips, and embers
  stream off them through a learned move's wind-up; a Finishing Blow puts them all out at once.
- **Starving:** the Roar, a ring of force through the floor; the Fall, over the pillars and down on you.

## Phase two

At half its health it roars and starves: it comes faster and closer (`gorge`), leaps on you from afar, and tears at you
four times running. What it has learned stays learned.

## Effects

The ember collars and their embers (`marks`, `js/finale.js`); impacts on the pound, the landings and the roar (each hit's
`impact`); the wind-up's glow on what strikes (the model's `tells`: a claw, the antlers or a hind foot), grown through
a heavy's wind-up there and never washed over its hide (`tellsGrow`, pass 133: it has no weapon for an `edgeTell`).

## Animation

Key poses per hit (`hunger*` in the data file), its learned forms built from the plain ones; pass 132 carries every
follow-through on past the strike (`followOn`, `js/data/pose-library.js`). In-between keys and strips come with the cel
pass.
