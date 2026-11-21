# The Pillager Captain, Torch of Corvel

The first boss through the system (`system.md`). Data: `js/data/bosses/pillager-captain.js`; model:
`tools/blender/captain.py`. Status: design and animation pipeline done (pass 111); the cel model (pass 118: black plate, flared pauldrons, soft joints; pass 121: the bill in banded steel, a smear on every swing). Pass 132: every follow-through carries the body on past the strike (`tools/body-check.cjs`, none flagged). Awaiting Aleix.

## Idea

The Ashbound's commander, the king's own soldier who burned Corvel and holds its square (STORY.md, the Ashbound). He
burns what he takes. **Fighting him is about distance he decides:** his bill reaches further than your sword, its hook
pulls you in to where he wants you, and once lit he fills his own court with fire, so the floor you can stand on
shrinks. You win by taking the space back: rolling through the reach, parrying the cuts, stepping out of the flames.

## Silhouette

A broad, tall soldier (1.45x) with a cloak, and a bill longer than he is: the long haft and the cleaver-and-hook head
read from any distance and tell you where his reach ends. Cel style: flat bold blacks of the armour, the bill's edge the
only bright metal, the rags under the head the one warm colour until they burn.

## Moveset (10 attacks; 4 strings)

| Attack | Tell (his own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| Dashing Thrust | haft levelled at the hip, drawn back | parry | backing off |
| Three Cuts | bill raised over his right shoulder | parry each | mashing |
| Overhead Cleave | bill heaved behind his head, back arched, held | roll | greed after a combo |
| The Hook, then the Chop | bill laid out low on his right, hook toward you | roll the hook; parry the chop | standing at mid range |
| The Reaping Wheel | wound right round, back half to you | roll, then roll or jump the low return | circling him |
| The Furrow | crouched, blade dragged behind him | roll or jump the line; parry the rising cut | backing off in a line |
| Haft Back | haft gripped short, a look over his shoulder | step away | standing behind him |
| Thrust (punish) | the thrust, sooner | don't drink in his sight | healing |
| Kindling (lit opener) | bill raised to the sky, rags catching | jump or roll the ring | standing close at the change |
| The Firebrand (lit) | bill swung back low on his right, burning | roll the sweep; parry the thrust | rolling forward |

Strings, every one broken by a counter (PLAN item 3): **Three Cuts into Haft Back** (if you got behind him);
**the Hook into the Chop** (the drag decides where the chop lands); **the Reaping Wheel**, out and back low; **the
Firebrand**, sweep then thrust through the flames. Unparryable: the Wheel and Kindling (2 of 10), plus the Cleave
(roll only).

## Signature moments

- **Cold: the Hook.** The one boss that pulls you in instead of knocking you away; every player remembers the first
  drag.
- **Lit: Kindling.** At half his strength he raises the bill to the sky, the rags catch, and he drives it into the
  floor: a ring of fire runs out and fires stand round him.

## Phase two

The bill burns and the fight's rule changes: wherever the burning bill lands, fire stays on the floor and burns
(`fire` on the hit). The cuts, the Cleave and the Furrow leave fire (Three Burning Cuts, the Burning Cleave, the
Burning Furrow); the Firebrand is new. He comes closer and keeps
coming (approach 0.75, kite 0.05): the court gets smaller every exchange.

## Effects

Big on impact (the Cleave's crack and dust, the Furrow's line of broken floor), on Kindling and on the phase change
(the `revealBurst`). **Found by round 0 of the judge:** during the Cleave's wind-up the whole body is tinted orange
(the heavy tell) and a blue glow covers his hands and the haft; both hide the pose the player reads. Pass 113: the tell is on
the bill's edge (`edgeTell`); his body keeps its own colour.

## Animation

Key poses per hit in the data file. The Cleave's wind-up uses the pose library's `haftOverheadRaise` (captured from a
halberd drill: the hips and chest wind back first and the head drops as the arms rise). Pass 113: the strike has
in-between keys (a last deeper arch before release; the chest and hips drive down first while the arms trail, then
whip through) and the follow-through carries his weight past the blow before the wrench. Next: the same capture for
the Three Cuts' heave.
