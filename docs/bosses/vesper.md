# Gemini, Neon High

The fourteenth and last boss of the roster through the system (`system.md`; PLAN item 6). Boss Rush's one contrast boss,
not in Story. Data: `js/data/bosses/vesper.js` (boss id `vesper`, model `paleMeridian`); model: `tools/blender/vesper.py`;
prisms: `js/astral-prisms.js`. Status: pass 153, the audit, the restyle and one `bars-1` round (below); awaiting Aleix's fight.

## Moveset audit (pass 153): restyle, with one string given its own opening

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of her own: met.** Built for her outside the loop (v7.140, kept by PLAN item 2): her own `vesper*` key
  poses, no move sources, no other boss's names. Eight in the first phase, eleven past half; Meridian Line is listed
  twice (once, faster, as the punish when you drink).
- **3 or 4 combos: met.** The Crescent Draw (two), the Astrolabe Waltz (three), Step Through Glass (two), the Lunar
  Tempest (four), Eclipse Crossfire (the prisms, then the plunge); get behind her and the Waning Turn follows a string.
- **One or two signature moments a phase: met.** The first: Alignment, every prism she planted locking its sightline
  and firing at once (and a counter shattering them all). Past half: the Eclipse Opens, and Eclipse Crossfire.
- **A real phase two: met.** A new rule (she blinks through the glass, and the prisms fire in crossfire before she
  plunges), four new moves, the eclipse on her rings and blade, faster and closer.
- **`noParry` on a quarter at most: met.** Only the Eclipse Opens (1 of 12); the prisms' lances are rolled, not marked.
- **Every wind-up her own: one shared, fixed.** The Lunar Tempest opened from the Waltz's pose (poised across her
  shoulders) and ended on its overhead, so the two read as one string with a blow added. It now opens sunk low in a
  lunge with the glaive trailed back behind her heel, sweeps up from low, and ends on a rising cut (the moon rises).
- **The body check: 8 of 20 flagged, now 0 of 20.** Most stopped dead at the strike (`NO OVERSHOOT`); Step Through
  Glass's and the Tempest's backhands carried no weight. Every follow-through now carries her a fifth past the blow,
  and every hit has in-between keys (as the King's Blade's).
- **The tell: missed, fixed.** No `edgeTell`: a wind-up lit a red glow behind her body. Now the crescent's own edge
  carries it, and the crescents are banded as steel in cel.

So the verdict is a restyle: the moves are hers and meet the bars; what failed was one string's opening, the body and the tell.

## Idea

The watcher of the glass observatory who measured the sky long after the stars went out. Fighting her is about the
arena she builds: every string plants a prism, and the longer you leave them the more of the sky aims at you; deflect
and counter her to break them all.

## Silhouette

Tall and severe, a porcelain-silver mask, two astrolabe rings turning behind her shoulders, a long indigo coat, and a
twin-crescent glaive longer than she is. From far off: the rings and the crescent above her head.

## Moveset

The meridian:
- **The Crescent Draw**: the glaive laid low and wide to her right, sometimes held; a rising crescent across, then a
  spinning reverse cleave that leaves a prism (parry both).
- **Meridian Line**: the glaive levelled back at her right hip like a needle, held; a long lunge (parry). Also her punish
  when you drink in her sight, faster.
- **Astrolabe Waltz**: poised diagonally across her shoulders; forehand, stepping backhand, overhead cleave (parry all three).
- **Zenith Fall**: drawn back at shoulder height, the crescent in full view, held; a heavy cleave (parry).
- **Sow the Glass**: crouched, a sweeping flourish as she vaults back, planting two prisms (parry).
- **Alignment**: with two or more prisms up, the glaive planted upright and her open hand raised; every prism tracks you,
  locks with a chime and fires (roll across the lines).
- **Waning Turn**: behind her, a glance over her left shoulder, then the crescent comes round (parry).

The eclipse (past half):
- **The Eclipse Opens**: the change; doubled over her sternum dial, then arms flung wide: a ring of light runs out and
  three prisms rise (roll).
- **Step Through Glass**: the glaive vertical before her mask; she blinks through the glass to you and cuts twice (parry).
- **Eclipse Crossfire**: her hand raised, every prism fires, then she leaps and plunges (roll the lances, parry the plunge).
- **Lunar Tempest**: sunk low, the glaive trailed back behind her heel; a low rising sweep, a backhand, a spinning
  reverse cleave, then the moon rises, a cut straight up that plants two prisms (parry all four).
- Kept from the meridian: everything but Alignment.

## Signature moments

- **Alignment** (the meridian): the sky she built aims at you all at once; a counter before it shatters every prism.
- **The Eclipse Opens and Eclipse Crossfire** (the eclipse): the arena lit violet, prisms firing across it and her plunge
  out of the crossfire.

## Phase two

At 52 %, the Eclipse Opens (she cannot be hurt through it). Her rings and blade flare violet, she closes faster
(`approach`, `speed`) and swings sooner (`cooldown`); she blinks, and the prisms fire in crossfire before a plunge.

## Effects

Lunar light (`BOSS_FX.vesper`, element `lunar`; `eclipse` past half), prism bursts on her heavy blows, and since pass 153
a thin trail at the crescent's edge. Tells: a glaive blow's wind-up on the crescent (`edgeTell`, pass 153), the prism
commands on her raised hand (`tells.hand`).

## Animation

Key poses in `ATTACK_POSES.vesper*`, two-handed (`haft` IK). Since pass 153 every follow-through carries a fifth past the
strike and every hit has its in-between keys (`via`, all `rel`), from each hit's own poses. `node tools/body-check.cjs
vesper`: 20 hits, 0 flagged.

## `bars-1` round (pass 153)

Thirteen cel strips blind: five of hers (the Crescent Draw, the Astrolabe Waltz, Zenith Fall, Step Through Glass, the
Lunar Tempest), three of the King's Blade (its round, which pass 152 left out: the Ember Leaps, the Shield Burns, the
Crown's Weight), beside Ostrey's Burning Drop, the Ringer's stamp, the Regent's Pavane, Oswin's Sworn Fist and Agathe's
Gale Reap. Her biggest problem: a cyan (Zenith Fall) or violet (the Tempest) gather glow over the crescent through the
wind-up, read as a roll against the red edge tell. Her parried heavies now gather nothing; the edge tell is the one
colour. The judge also read her strings as sharing a "cloak spin": that is the turn inside each string's blows, not a
wind-up; the openings are the low draw, the shoulder poise, the needle, the mirror guard and the heel trail. Rechecked on
the strips (`docs/scorecard/now/gemini-*.jpg`, clip `gemini.mp4`). The round's biggest problem overall was the King's
Blade's: the Ember Leaps' fire hid it whole for half a second as it landed; it now lands in a shatter of ice and embers
(`kings-blade.md`).
