# Old Ostrey, the Porter

The sixth boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/ostrey.js` (boss id `ostrey`, model `oldOstrey`); model: `tools/blender/ostrey.py`. Status: pass 135,
the moveset audit (below) and the body check (8 hits fixed). Next: a parry on the Burning Drop's landing, then the cel
look (his wind-up today washes his body and the whole bar blue or red: the tell goes to the bar's edge), in-between keys
and the `bars-1` judge.

## Moveset audit (pass 135): restyle, plus a parry and the body check

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of his own: meets.** 13 moves made for him in v7.58.0 (his own `ostrey*` key poses, no move
  sources): 8 as the porter (the Lantern Coal is the Coals, sooner, at someone drinking), 5 more with the lantern open.
- **3 or 4 combos: meets.** Bar Drive (jab, then the drive), Three Knocks, Low, Then High, and Ember Rain; the Lantern
  Opened and the Burning Drop each end in a fire ring. Bar the Way branches into Three Knocks, the Drive into the Lantern
  Swing.
- **One or two signature moments a phase: meets.** The porter: the Gate Drop, held plumb as long as he likes, and if you
  back off while it is up he lowers his head and shoulders the gate at you instead. The lantern opened: the Lantern
  Opened itself (the fire out of the coal the Seven paid him with) and the Ember's Breath.
- **`noParry` on a quarter at most: missed by one.** 4 of 14 (Shoulder the Gate, the Lantern Opened, the Ember's Breath,
  the Burning Drop): 29 %. The Burning Drop's blow is the bar's, dropped from the air: next pass gives its landing a
  parry and keeps its fire ring roll only (a hit-level `noParry`, as the Hunger's learned pound), 3 of 14.
- **A real phase two: meets.** At 55 % he opens the lantern: he burns (`ignite`), comes sooner and closer, and five moves
  of fire come (the ring, the breath, the leap, the rain, the two-height sweep).
- **Every wind-up his own: meets on paper.** Each tell is the lantern somewhere different (high for the sweep, at his
  chest for the drop, out ahead for the drive, low and back for the coals, out to the side for the knocks). No name is
  another boss's. The Gate Drop (raised plumb, held) is the one to watch beside the Captain's and the Warden's held
  overheads: the `bars-1` round decides it.
- **The body check: missed, fixed in pass 135.** `node tools/body-check.cjs ostrey`: 8 of 27 hits flagged (Shoulder the
  Gate and the Lantern Opened stopped dead on the strike; the Ember's Breath's six puffs carried no weight). Now his
  weight carries on through both, and each breath out is a heave; 0 flagged.

So he keeps his moves; the work is the Burning Drop's parry, then the look, the animation and the judge.

## Idea

The porter who let the Seven through, the night they carried the Ember out (STORY.md, part one, chapter 7). They paid his
toll with a coal of the Ember, and it has burned in his lantern since; he keeps the gate the harder for having opened it
once. **Fighting him is about the gate:** he bars the way low, drops the gate from above and makes you wait for it, and
punishes the player who stands off with coals and a charge. Hurt past bearing, he opens the lantern.

## Silhouette

A giant porter (2.1x) in the gate-wardens' plate: a round helm barred like a portcullis, a hood and a torn mantle, an
iron gate-bar held in his right hand, and a caged lantern hanging plumb from his left fist. From 20 m: the long bar and
the lit lantern.

## Moveset (14 attacks; 6 strings)

| Attack | Tell (his own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| Bar the Way | crouched, the bar trailing at his right, the lantern lifted high | parry, or roll through it | standing in front |
| The Gate Drop | upright, the bar raised plumb overhead, the lantern drawn in to his chest; held | parry on its fall | rolling early |
| Bar Drive | side-on, the lantern held out ahead to sight along, the bar drawn back level at the hip | parry, parry | keeping just out of reach |
| Three Knocks | the bar laid back over his shoulder, the lantern held out to the side; the third higher, held | parry three | rolling after the second |
| Shoulder the Gate | head down, both arms forward, the bar across his chest | step aside or roll | backing off from the Gate Drop |
| Lantern Coals | the lantern swung low and back past his hip | block, sidestep | standing off |
| Lantern Coal | the same, sooner, one coal | sidestep | drinking at range |
| Butt of the Bar | a look over his right shoulder, the bar raised before him | parry or roll | standing behind |
| Lantern Swing | the lantern wound back past his left hip | parry or roll | standing at his left |
| The Lantern Opened (opener) | the lantern held up overhead, his face turned up to it | roll, then jump or roll the ring | standing near at the change |
| Low, Then High | the lantern carried low before him, the bar trailing | parry or roll low, then high | rolling once |
| The Ember's Breath | the lantern drawn in to his chest, his head bowed over it | get to his side or back | standing before him |
| The Burning Drop | a deep crouch, the bar plumb and the lantern swung back; the leap | roll, then the ring | keeping your distance |
| Ember Rain | the lantern whirled up over his head | sidestep, twice | standing off |

Strings, every one broken by a counter (PLAN item 3): Bar Drive, Three Knocks, Low, Then High, Ember Rain, the Lantern
Opened and the Burning Drop.

## Signature moments

- **The porter:** the Gate Drop, held; back off and it becomes Shoulder the Gate.
- **The lantern opened:** the Lantern Opened, the fire out of the Seven's coal; the Ember's Breath across his front.

## Phase two

At 55 % he opens the lantern: he burns, comes sooner and closer, and the fire moves come. The bar's moves stay.

## Effects

Iron on iron and coals from his lantern (`BOSS_FX.ostrey`, element steel); fire once the lantern is open (`burn` glow
slots drawn only while he burns). The wind-up's tell moves to the bar's edge (`edgeTell`) with the cel pass.

## Animation

Key poses per hit (`ostrey*` in the data file); in-between keys and strips come with the cel pass, after the body check.
