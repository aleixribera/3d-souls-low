# The Kindling Tree

The twelfth boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/kindling-tree.js` (boss id `kindlingTree`, model `kindlingTree`); model: `tools/blender/kindling_tree.py`.
Status: pass 149, the audit and the rework (below); pass 152, the `bars-1` round and its fixes (below); awaiting Aleix's fight.

## Moveset audit (pass 149): rework

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of its own: one short rooted, fixed.** Its moves were made for it in pass 50 (its own `tree*` key
  poses, no move sources, no other boss's names), but rooted it had 7 (with Into the Roots again when you drink), and
  two of them did nothing at mid range but roll. Pass 149 adds **the Wrack**, **the Bramble Sweep** and **the Reaching
  Bough**: 10 rooted, 11 ablaze.
- **3 or 4 combos: short rooted, fixed.** Rooted it had the Lash (into the Turning Bough behind it) and the Kindling
  Mark, neither branching on more than one place. Now the Lash also branches far (the Thorns follow you), the Wrack is a
  string of its own that branches near (the Roots Rise) and far (Into the Roots), and Into the Roots ends on a blow.
  Ablaze: the Burning Lash, the Wrack, Deep Roots, the Great Kindling.
- **One or two signature moments a phase: met thinly ablaze, added.** Rooted: Into the Roots, the floor heaving after
  you. Ablaze it had Uprooted and the Great Kindling; pass 149 adds **the Falling Tree**: it throws the whole of itself
  down on you, and the floor burns where it fell.
- **A real phase two: meets.** It tears its roots out of the floor and walks; it burns; new moves.
- **`noParry` on a quarter at most: missed badly, fixed.** Rooted 5 of 8 could not be parried (the Kindling Mark, the
  Thorns, the Roots Rise, both Into the Roots); ablaze 8 of 11. The fight was mostly rolling. Now every blow of a bough
  or a claw is parried, and only what comes up from the roots, burns on the floor, flies from its crown or is the whole
  tree falling is rolled: the Kindling Mark's claw is parried (its mark stepped off), Into the Roots, Deep Roots and the
  drinker's punish rise (rolled) and then bring both boughs down on you (parried), the Charge's boughs meet you
  (parried). Roll-only: rooted 2 of 11 (the Thorns, the Roots Rise), ablaze 3 of 12 (Uprooted, the Great Kindling,
  the Falling Tree). Ablaze the Thorns and the Roots Rise leave its list (it walks to you now); the Roots Rise still
  follows the Wrack when you hug its trunk.
- **Every wind-up its own: on paper** (the in-page `Ember Root` test holds no two alike); the `bars-1` round decides.
- **The body check: missed, fixed.** `node tools/body-check.cjs kindlingTree`: 15 of 19 hits flagged (nearly every blow
  stopped dead on the strike; Into the Roots, the Roots Rise and the Great Kindling arm only). Now 0 of 27.

## Idea

The Ember's own root, given limbs, where it began (STORY.md, part one, chapter 13). It has no face; the coal in its
breast is what looks at you. **Fighting it is about where you stand:** rooted, it cannot come to you, so every distance
has its answer: hug its trunk and the roots rise, stand at its boughs' reach and they lash, sweep and wrack, stand off
and its bough reaches like a spear, its crown flings thorns and it goes into the roots after you. At 60 % it catches,
tears itself free and comes for you, and at the end throws the whole of itself down.

## Silhouette

An enormous twisted trunk of living red-gold wood (2.5x) on buttress roots, two gnarled boughs for arms ending in
thorned splays, a bare crown with a few ember leaves; the hollow in its breast with the coal. From 20 m: the crown
and the boughs; ablaze, the seams of fire.

## Moveset

Rooted (10, and Into the Roots again at a drinker):

| Attack | Tell (its own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| The Lash | the right bough wound across to its left | parry both, or under its trunk | standing at its reach |
| The Falling Bough | both boughs high and back; held | parry, or roll aside | rolling early |
| The Kindling Mark | the left claw drawn into the hollow of its breast | parry the claw, step off the mark | staying where it struck |
| The Wrack | the right bough cocked high over its shoulder, the left claw out low | parry both | rolling after the first |
| The Bramble Sweep | crouched, crown bowed at your feet, both boughs out low on its right | jump it, or parry | rolling into it |
| The Reaching Bough | the right bough drawn straight back, the left claw pointed at you | parry, or roll in under it | standing off at mid range |
| Thorns | leaning back, boughs low and spread, the crown shaking | sidestep the fan | standing far off |
| The Roots Rise | hugging itself, crouched | roll through, or be away | hugging its trunk |
| Into the Roots | bowed, both boughs straight up as it sinks | step off the swelling, then parry the boughs | standing still far off; drinking (sooner) |
| The Turning Bough | a look over its right side, the bough raised behind | parry or roll | standing behind |

Ablaze (11 and the punish; also the Wrack, the Falling Bough, the Kindling Mark, the Bramble Sweep, the Turning Bough):

| Attack | Tell (its own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| Uprooted (opener) | crouched, its claws in the floor, tearing | roll the ring | standing near at the change |
| The Burning Lash | as the Lash, with a stride into each blow; a third from high on its left | parry three | rolling after the first |
| The Charge | low, boughs forward like antlers | parry the boughs as they meet you, or roll late | standing off |
| The Great Kindling | crown thrown back, its breast opened | roll two rings of fire | standing near |
| Deep Roots | as Into the Roots, under twice | step off, step off, parry the boughs | standing still |
| The Falling Tree | reared up tall, boughs flung wide, crown back | get out of its line; the floor burns there after | standing in front |

Strings, every one broken by a counter (PLAN item 3): the Lash (behind: the Turning Bough; far: the Thorns), the Wrack
(near: the Roots Rise; far: Into the Roots), the Kindling Mark, Into the Roots; ablaze also the Burning Lash, the
Great Kindling, Deep Roots.

## Signature moments

- **Rooted:** Into the Roots, the floor heaving after you, stopping, swelling, and the tree coming up through it.
- **Ablaze:** Uprooted, the tree tearing itself out of the floor; the Falling Tree, the whole of it thrown down on you
  and the floor left burning in its line.

## Phase two

At 60 % it catches (`ignite`): seams of fire climb its trunk and its crown burns, it tears its roots out of the floor
and walks, and four moves are its own (the Burning Lash, the Charge, the Great Kindling, the Falling Tree, and Deep
Roots twice under). The Thorns and the Roots Rise drop from its list; it comes to you instead.

## Effects

Wood and earth rooted, fire ablaze (`BOSS_FX.kindlingTree`); the heave drawn by `js/root-heave.js`, the Falling Tree's
fires by the ground-fire system (a hit's `fire`). The wind-up's tell sits on what strikes (pass 149, `tells`,
`tellsGrow`): the thorned splay at the end of either bough, or its crown for what comes up from the roots and what falls
from it; a heavy grows that halo instead of washing the trunk.

## Animation

Key poses per hit (`tree*` in the data file). Pass 149: every follow-through carries a fifth again of the blow's lean,
bend and turn past the strike (`carry`, as Oswin's and Agathe's); a blow that neither drops nor leans settles its trunk
through the follow; in-between keys from each hit's own poses (all `rel`), every wind-up reaching its pose fast
(`outCubic`). Strips (`STYLE=cel`): `docs/scorecard/now/kindling-tree-*.jpg`; clip `kindling-tree.mp4`.

## `bars-1` round (pass 152)

Thirteen cel strips blind (seven of its moves: the Lash, the Falling Bough, the Kindling Mark, the Wrack, the Bramble Sweep,
the Reaching Bough, the Falling Tree, beside the Ringer's stamp, the castellans' Crown Cleave, Agathe's Gale Reap,
Oswin's Sworn Fist, the Regent's Pavane and the Hunger's Pound). Its biggest problem was the tree's: its whole trunk
washed fire-red through the Kindling Mark, the Thorns and the Falling Tree, so a parry and a roll looked alike. The
cause was the shared effect light and the heavy's gather glow, both placed on the weapon node, which a tree with no
weapon still has, unseen, by its hand: lit from there, the trunk took the light, and the gather glow hung in the air
beside it. Now a body with `weapon: 'none'` lights only as a blow lands, from the part that strikes (`js/effect-lighting.js`,
as Oswin's cast-off axe), gathers nothing in a wind-up (its grown halo is the tell), and sheds its sparks from the part
that strikes (`js/ultra-boss.js`). Second: the Reaching Bough read as the Wrack (one bough up, one out); its wind-up is
now coiled low, the bough drawn back level and the claw levelled at you, one line through the body like a spear.
Rechecked on the strips (`docs/scorecard/now/kindling-tree-*.jpg`). Left: every strip opens on the guard with the right
splay's halo low by its roots (the first frame of every boss's strip is its guard); the Bramble Sweep's floor line reads
as a hazard to the judge while it is red (a parry), which is the pending call on whether it should be jump-only.
