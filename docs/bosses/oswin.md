# Oswin, the First Crown

The tenth boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/oswin.js` (boss id `oswin`, model `oswinFirstCrown`); model: `tools/blender/oswin.py`. Status: pass 145,
the audit and the rework (below); the `bars-1` round (pass 2) and Aleix's fight to come.

## Moveset audit (pass 145): rework

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of his own: one short crowned, fixed.** His moves were made for him in pass 47 (his own `oswin*` key
  poses, no move sources, no other boss's names), but crowned he had 7 (with the leap again when you drink). Pass 145
  adds **the Royal Progress**: 9 crowned, 10 uncrowned.
- **3 or 4 combos: meets.** Threefold Reign, the Sceptre's Reach, the Tread's branch into Threefold or the Headsman, Long
  Live the King; Fists of the Ember, the First Hunger. Pass 145's two new strings branch: the Royal Progress (back off and
  the sceptre reaches; get behind and he turns), Empty Reign (stay close and he takes hold of you; back off and the Sworn
  Fist comes).
- **One or two signature moments a phase: meets.** Crowned: the cracks that stay open, and Long Live the King standing
  every one of them up as a wall of fire. Uncrowned: the Crown Cast Down and the First Hunger.
- **A real phase two: meets.** The axe is cast down (a cross of seams), the Ember takes his hands, and a new rule: he
  grabs.
- **`noParry` on a quarter at most: missed badly, fixed.** Crowned 5 of 8 could not be parried (the Tread, Threefold
  Reign, both Leaps, Long Live the King); uncrowned 7 of 9 (the change, both Holds, Ground Breaker, the Lunging Grasp,
  Twin Tread, the First Hunger). The fight was mostly rolling the floor. Pass 145: Threefold Reign's three blows, the
  Leap's axe on landing, Ground Breaker's and the First Hunger's hands onto you are parried (their ring and their fire
  stay roll or step, a hit's `noParry` or `erupt`); the Lunging Grasp, the second Hold and Twin Tread go. Now 2 of 9
  (the Tread, Long Live the King) and 2 of 10 (the change, the Hold).
- **Every wind-up his own: meets on paper** (the in-page `Aurel in Ash` test holds no two alike); the `bars-1` round
  decides it.
- **The body check: missed, fixed.** `node tools/body-check.cjs oswin`: 19 of 25 hits flagged (every slam stopped dead on
  the strike; the leaps and the holds all arm). Now 0 of 31.

So it was a rework: four new moves (the Royal Progress, Empty Reign, the Sworn Fist, the Open Hand), three gone, six
parries, tells on what strikes, and the body check.

## Idea

The first king of Thrale the Ember ever wore, laid beneath the throne with the crown still on him, risen when the hunger,
refused, burned the city it could not keep (STORY.md, part one, chapter 11). The throne court is his grave and it does
not hold. **Fighting him is about the floor:** every stamp and every blow of the axe cracks it open and the crack stays,
so you choose where he breaks it; when he calls on the throne every crack burns. Past the worst of his hurt he fights as
the man he was before the crown: bare-handed, burning, close.

## Silhouette

A huge old king (2.2x), stooped with age and the head still high: the First Crown's seven flame tines fused to his brow,
a white mane and beard, round bronze pauldrons, the king's mantle burned nearly black with its hem still smouldering, and
the Crown's Axe, a great bearded crescent on a long gold-bound haft. From 20 m: the crown's tines and the axe's crescent;
uncrowned, the burning hands.

## Moveset

Crowned, the axe (9):

| Attack | Tell (his own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| The King's Tread | the right knee lifted high, the axe upright at his side | jump or roll the crack | standing in line ahead of him |
| The Headsman's Fall | up on his toes, the axe straight up over his head; held | parry on its fall, step off its crack | rolling early |
| Threefold Reign | wound back level at his right hip, turned away | parry three | rolling after the first |
| The Sceptre's Reach | the axe reversed at his shoulder, its crowned butt at you | parry the butt, parry the head rising | backing straight off |
| The King's Leap | a deep crouch, the axe trailing low behind him; the leap | parry the axe as it lands, then off its cracks | standing off, drinking |
| The Royal Progress | his left hand raised palm out, the axe dragged at his right, its bit on the floor | parry, parry, jump the crack | rolling after the first |
| The Turn | a look over his left shoulder, the axe on it | parry or roll | standing behind |
| Long Live the King | the haft stood on its head before him | step off every open crack | standing on his cracks |

Uncrowned, the hands (10):

| Attack | Tell | Answer | Punishes |
| --- | --- | --- | --- |
| The Crown Cast Down (opener) | the axe high over his head, held a full breath | roll the ring | standing near at the change |
| The King's Hold | both arms spread wide, hands open, rearing | roll it; caught, struggle | standing in front |
| Fists of the Ember | fists drawn to his chin, hunched | parry three | rolling once |
| Empty Reign | both hands clasped at his left shoulder where the haft lay, head bowed to them | parry, parry; then roll the hold or parry the fist | staying close after it |
| Ground Breaker | both hands clasped high, leaning back | parry the hands, jump the ring | standing near |
| The Sworn Fist | a runner's crouch, the right fist drawn back by his ear | parry | standing off, drinking |
| The Open Hand | his burning hand low behind him, open, the other on his heart; it may wait | parry the palm | rolling early |
| The First Hunger | on one knee, both hands raised | parry the hands, then step off every open crack, twice | standing on his cracks |
| The Backhand | a look over his left shoulder, the right fist cocked across his chest | parry or roll | standing behind |

Strings, every one broken by a counter (PLAN item 3): Threefold Reign, the Sceptre's Reach, the Royal Progress, the
Tread's branch, Long Live the King; Fists of the Ember, Empty Reign, Ground Breaker, the First Hunger.

## Signature moments

- **Crowned:** the cracks that stay open; Long Live the King, every one of them a wall of fire.
- **Uncrowned:** the Crown Cast Down, the axe hurled into the floor and a cross of cracks from it; the First Hunger, the
  floor burned twice from his knees.

## Phase two

At 40 % he casts the axe down and the Ember takes his hands: closer and sooner, a new rule (he grabs; only a roll gets
clear), his fists and palms in place of the axe, Empty Reign (his hands still swinging the axe that is gone) and the
First Hunger.

## Effects

Earth and ember (`BOSS_FX.oswin`, fire once uncrowned): the cracks drawn by `js/ember-seams.js`, quakes and shatters on
impact. The wind-up's tell (pass 145) sits on what strikes: the axe's bit (`edgeTell`, banded as steel in cel), or a hit's
`tell`, a burning fist or the foot thrown down; with the axe cast down every blow names its own. A heavy grows that halo
instead of washing him orange (`tellsGrow`). The axe's ribbon is a thin arc at the bit, its head smeared.

## Animation

Key poses per hit (`oswin*` in the data file, haft angles as `pitch`). Pass 145: every follow-through carries a fifth
again of the blow's lean, bend and turn past the strike (`carry`), the leap and the hold rear up before they fall, and
every hit gets in-between keys from its own poses (all `rel`, as the Regent's) with `outCubic` wind-ups. Strips
(`STYLE=cel`): `docs/scorecard/now/oswin-*.jpg`; clip `oswin-cel.mp4`.
