# Hale and Harrow, the Castellans

The seventh boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them): two bosses
fought as a pair. Data: `js/data/bosses/castellans.js` (boss ids `hale`, `harrow`; models `castellanHale`,
`castellanHarrow`); model: `tools/blender/castellans.py`. Status: pass 139, the tells, in-between keys and the `bars-1` round done (below); awaiting
Aleix's fight.

## Moveset audit (pass 138): rework

Against the system's bars (`system.md` section 0). Each sister is a boss of her own (her own bar and her own half of the
suit), so each is held to the bars:
- **8 to 12 attacks of her own: missed.** Hale had 7 (with the Haft's Heel behind her), Harrow 6. All their own (their own
  `hale*` and `harrow*` key poses since v7.62.0, no move sources, no other boss's names). Pass 138: Hale gets the Hewing,
  Harrow Elbow and Knee and the Heel from Heaven: 8 each.
- **3 or 4 combos: meets.** Hale: the Beard's Hook (and the Heel behind it), the Wall Turns, the Helm's Salute into the
  Hook, now the Hewing. Harrow: Stamp the Stones, Knuckle and Heel, the Falling Weight, now Elbow and Knee. And the
  pair's calls: Harrow's stamps bring Hale's cleave down where you land; Hale's turns send Harrow sliding in.
- **One or two signature moments a phase: meets.** Together: the calls, one sister's blow answered by the other's. Alone:
  Her Sister's Half (she kneels by her sister and rises in the whole suit).
- **`noParry` on a quarter at most: missed.** 6 of 15 (the Wall Turns, Off the Rampart, Stamp the Stones, the Falling
  Weight, the Greave Slide, Her Sister's Half): 40 %; Harrow alone 3 of 6. Pass 138: Off the Rampart's axe and the Falling
  Weight's knees are parried on landing (the Falling Weight's ring stays roll only, a hit's `noParry`), and the Wall
  Turns' first turn is parried (the second is not). Now Hale's fight 3 of 16, Harrow's 4 of 17 (the whole phase's
  Gauntlet's Hold, a grab, counts).
- **A real phase two: missed.** Alone, she took every move of both halves with shorter breaths between: the same fight
  faster, and its one new string, Both Halves, was the halves' own poses chained. Pass 138: the whole castellan is a fight
  of its own: the pair's calls answered by one body with no gap (her stamps bring her own cleave down where you land;
  back off from her turns and she comes down knees first), and what only the whole suit can do: Vault the Haft and the
  Gauntlet's Hold. The fists' moves she can't make with the axe in them (the Hammer, Knuckle and Heel, Elbow and Knee,
  the Greave Slide) and the axe's long-range ones (the Salute, Off the Rampart, Salt Wind) stay with the pair.
- **Every wind-up her own: meets on paper.** Crown Cleave (the axe behind her head, held) is the one to watch beside the
  Captain's, the Warden's and Ostrey's held overheads: the `bars-1` round decides it.
- **The body check: missed, fixed in pass 138.** 12 of 23 hits stopped dead on the strike or carried no weight (the
  stamps, the jab and hook, the landings, the slide, the kneel's rise, the second turn); now 0 of 35.

So it was a rework: three moves, three parries, a phase two of its own, and the body check.

## Idea

Twin sisters who split the one suit of armour that came back gilded from Aurel (STORY.md, part one, chapter 8): Hale
took the helm, the breastplate and the axe; Harrow the gauntlets, the greaves and the weight. **Fighting them is about
the call and the answer:** one sister's blow sends you where the other's lands. When one falls, the other kneels by her,
rises in the whole suit, and does alone what took two.

## Silhouette

Two tall (1.75x) figures in sea-grey surcoats with a white bar. Hale: the helm with its wave crest, broad gilt
spaulders, a ragged cape and the long bearded axe. Harrow: bare-headed with one long braid, the great gilt gauntlets
held up before her face and the greaves. From 20 m: the axe against the fists.

## Moveset

Hale, the axe (8):

| Attack | Tell (her own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| Crown Cleave | the axe raised high behind her head in both hands, back arched; held | parry on its fall | rolling early |
| The Beard's Hook | the axe wound low behind her right hip, head down | parry, parry (or roll to her left) | standing at her right |
| The Helm's Salute | the haft upright before her face, still | parry the spike, a long step out | keeping just out of reach |
| The Wall Turns | the axe yoked across her shoulders, wound to her left | parry the first turn, roll the second | crowding her |
| The Hewing | the haft choked short over her left shoulder, the head behind her ear, left foot forward | parry, parry (the second may wait) | rolling after the first |
| Off the Rampart | a deep crouch, the axe trailing low behind her; the leap | parry the axe on landing | standing off |
| Salt Wind | the axe held out flat at her right, her head turned to it | block, sidestep | standing off |
| The Haft's Heel | a look over her right shoulder, the haft slid through her hands | parry or roll | standing behind |

Harrow, fists and greaves (8):

| Attack | Tell (her own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| Stamp the Stones | a knee raised high, arms out for balance; held | jump or roll the rings | standing close |
| Hammer of Both Hands | both fists locked over her left shoulder; held | parry | rolling early |
| Knuckle and Heel | fists at her chin, upright | parry three | backing off after one |
| Elbow and Knee | ducked low, her left shoulder at you, fists by her ears, the right elbow cocked high | parry, parry | standing in close |
| The Heel from Heaven | turned half away, arms low and wide; her leg swung up high and held | parry on its fall | rolling early |
| The Falling Weight | a sprinter's crouch, arms swung back; the leap | parry the knees, then jump or roll the ring | standing off |
| Greave Slide | a run-up, fists pumping | jump it | backing away |
| Back Heel | a glance down past her hip | parry or roll | standing behind |

The whole castellan, alone (13; she keeps the axe and the greaves):

| Attack | Tell | Answer | Punishes |
| --- | --- | --- | --- |
| Her Sister's Half (opener) | kneeling by her sister, head bowed, a long while | jump or roll the ring as she rises | standing near |
| Both Halves | sunk low and side-on, the axe upright at her right shoulder | parry, jump or roll the ring, roll the third | rolling once |
| Vault the Haft | the axe head driven into the stones before her, both hands on the haft, knees bent | roll out (or jump) the wheel of greaves, parry the axe wrenched up | standing close |
| The Gauntlet's Hold | sunk low, the axe drawn back low in her right hand, the left gauntlet open and reaching | roll it; caught, struggle | standing in front |
| Stamp the Stones, then Crown Cleave | the stamps' raised knee | jump the rings, then parry the cleave where you land | landing near her |
| The Wall Turns, then the Falling Weight | the turns' yoke | parry, roll, then parry her knees | backing off |

and Crown Cleave, the Hewing, the Beard's Hook, the Heel from Heaven, the Falling Weight, the Haft's Heel and the Back
Heel as above.

Strings, every one broken by a counter (PLAN item 3): Hale's Beard's Hook, the Wall Turns and the Hewing; Harrow's
stamps, Knuckle and Heel, Elbow and Knee and the Falling Weight; alone, Both Halves, Vault the Haft and the two calls
answered.

## Signature moments

- **Together:** the call and the answer: Harrow's stamps put you in the air and Hale's cleave comes down where you land;
  Hale's turns drive you back and Harrow slides in at your feet.
- **Alone:** Her Sister's Half, the kneel and the rise in the whole suit; Vault the Haft, round the planted axe on both
  greaves.

## Phase two

Not a second bar: when one sister falls, the other takes up the whole suit on what is left of her own bar (an `alone`
phase). She does both halves' answers herself, with no gap, and the two moves only the whole suit can make; she comes
sooner and closer.

## Effects

Salt and iron (`BOSS_FX`, element steel): stone rings from the stamps and the landings, a gilt burst as the hidden half
appears (`revealBurst`), the salt wind's slash. The wind-up's halo (pass 139) sits on what strikes, never over the body:
the axe's head (`edgeTell`; Harrow's axe waits hidden until the whole phase, which `js/validate.js` holds), or a named
part per hit (`tell`: a gauntlet, the right elbow or knee, a greave's toe, the haft's butt). A heavy grows that halo
instead of washing her orange (`tellsGrow`).

## Animation

Key poses per hit (`hale*`, `harrow*`, `castellan*` in the data file); the Heel from Heaven turns away before the leg
rises (an in-between key). Every follow-through carries on past the strike (`tools/body-check.cjs`, pass 138). Pass
139: every hit gets in-between keys (`via`, generated from its own poses at the end of the key-poses block: the wind-up
settles, the hips lead the strike, the follow-through carries; hand-written ones on the Wall Turns, the Falling Weight and
the Heel win), checked by `tests/pose-via.cjs`; the Heel from Heaven's toe now reaches her helm, in front of her. Clip
(cel): `docs/scorecard/now/castellans-cel.mp4`.

## `bars-1` round (pass 139)

Four castellan strips (the Heel, Crown Cleave, the Hewing, Knuckle and Heel) shuffled blind among Aldric's, Ostrey's,
the Captain's, the Warden's, the Giant's and the Hunger's. Shared wind-up: none (only the first frame, the same idle).
Body readable: yes, past the phase's entry burst (filming). Parry or roll: missed twice. Crown Cleave's halo was
hidden behind her (the axe hung down her back), and the gauntlets' halos were specks. Fixed: the axe now stands up
over her helm, its halo in view through the whole wind-up from the player's camera, and the part halos are half as
large again (0.45 to 0.65-0.7). Rechecked in cel strips (`castellans-crown.jpg`, `castellans-knuckle.jpg`).
