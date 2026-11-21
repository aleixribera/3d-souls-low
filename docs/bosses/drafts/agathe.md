# Mother Agathe, the Rending Hand

The eleventh boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/agathe.js` (boss id `agathe`, model `motherAgathe`); model: `tools/blender/agathe.py`. Status: pass 146,
the audit (below); the parries, the body check, the cel tells, in-between keys and the `bars-1` round to come. A draft
here until her body check is clean: a page in `docs/bosses/` puts her under `tests/body-check.cjs` and
`tests/boss-pages.cjs` (every heading of `pillager-captain.md`, every attack named), so the next pass moves it up then.

## Moveset audit (pass 146): restyle, plus parries and the body check

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of her own: meets.** Made for her in pass 48 (her own `agathe*` key poses, no move sources, no other
  boss's names): 8 as the abbess (the Crook again, sooner, at someone drinking), 11 in the storm (Rend the Earth and the
  Cornerstone give way to Lightning Down the Furrow, the Storm Knows Its Own, the Gale Reap, the Hook from the Storm).
  One snag: her Rending Brothers (the Beastman's moves, `js/data/move-sources.js`, renamed) call their line of
  shockwaves "Rend the Earth" too; the brothers' move takes another name in the restyle.
- **3 or 4 combos: meets.** The Reaping Draw (reap, then the draw at your knees; get behind and the Turning Hook comes),
  the Crook (reach, held, then the haul), the Correction (three raps; stay close and Hook and Haul follows), Hook and
  Haul; in the storm also Lightning Down the Furrow, the Storm Knows Its Own (three bolts), the Gale Reap.
- **One or two signature moments a phase: meets, thinly in the first.** The abbess: the Cornerstone, a slab of the
  abbey torn up and hurled (22 %, from 6 m). The storm: the Storm Comes, and the bolts that follow you and hold still.
- **A real phase two: meets.** The storm at her back: a new rule (the storm falls where you stand: step off its mark),
  four new moves, the hook seamed with lightning.
- **`noParry` on a quarter at most: missed badly.** The abbess 3 of 9 (Rend the Earth, Torn Stones, the Cornerstone);
  the storm 6 of 12 (the Storm Comes, Lightning Down the Furrow, Torn Stones, the Storm Knows Its Own, the Gale Reap,
  the Hook from the Storm). The Gale Reap and the Hook from the Storm are the hook's blows: they take a parry (the
  landing's ring and the furrow's line stay a roll or a jump, a hit's `noParry`); Rend the Earth's blade before its line
  could too.
- **Every wind-up her own: on paper** (eight distinct poses named in the data file's header); the `bars-1` round decides.
- **The body check: missed.** `node tools/body-check.cjs agathe`: 18 of 24 hits flagged (no overshoot past nearly every
  strike; the Cornerstone and the Hook from the Storm arm only).

So a restyle, not a rework: every bar but the parries and the body is met by moves of her own. Next pass: the parries,
the body check (`carry`, in-between keys), the tells on the hook's bit in cel, the brothers' move renamed, strips and
the `bars-1` round.
