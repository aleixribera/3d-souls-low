# Plan

The order of work under `VISION.md`, written by the director from the grilling with Aleix on 2026-11-20. The loop
reads it every pass and doesn't edit it: cuts and finds go to `BACKLOG.md`, asks to "Needs Aleix" in `STATE.md`. Older plans: git history.

## How the work runs

- **One pass at a time** until items 1 to 3 are done; then **two tracks** in parallel (`.claude/iterate.md`):
  track 1 bosses, track 2 abilities and crates. The tracks touch different files.
- The bar is the vision's: AAA feel, runs on a toaster, anime action against fair, cunning bosses.
- **Balance is the loop's** (Aleix, 2026-11-20: "current numbers are not final"): every number in the game and in
  this plan (damage, health, timings, windows, odds, the starter set's counts, the difficulty curve) is a starting
  point. A pass may change one its step needs, with evidence in the commit; the full retune is the last item,
  to the targets Aleix set there.
- Work done outside the loop (other tools, other models) is a draft like any other: the loop reads it into `STATE.md`
  and judges it like its own. Nothing reaches players without green CI.

## Now

Done: the frames folder and reference set, green CI with a green-only container, the out-of-loop cuts and the
counters (items 1-3, passes 104-110). Their text: git history.

## Track 1: bosses

### 4. The art style exploration

One scene, the player against the Pillager Captain in a small arena, built in four styles: (a) cel-shaded anime (light
bands, ink outlines, flat bold colour), (b) stylized dark (strong silhouettes, painted textures, soft light),
(c) painterly (brush-stroke textures and light), (d) today's look as the control. Real Blender models, free tools only,
each at 60 fps on the Normal preset and 100% render scale. The chosen style becomes the whole game's: player and
bosses first, then enemies, then levels, gradually.
Check: desktop screenshots and a 10-second clip per style, side by side in `docs/style/`, and the frame time of each on
Normal; then Aleix's pick under "Needs Aleix" (his taste, not a judge's).

### 5. The boss creation system, proven on the Pillager Captain

A repeatable way to make a boss: a one-page design (idea and backstory from `STORY.md`, silhouette, 8 to 12 attacks
with 3 or 4 combos, one or two signature moments a phase, a real phase-two change) → Blender model in the chosen style
→ animation → effects → data in `js/data/bosses/` → in game. It replaces the Hollis bar and the old boss rules in
`.claude/feedback.md` 2026-11-14 (Aleix: remove previous quality bars).
- Animation is the weak link today (hand-keyed in script looks stiff): use free tools where they help (video-to-motion
  from reference clips, free motion libraries, a reusable rig and pose library). Paid or account-based services only
  with Aleix's yes, per service, with its price.
- Effects rule (VISION): nothing covers the boss during a wind-up; big effects on impact, signature moments and the
  phase change. Every attack told and dodgeable on its tell; every string breaks on a counter (item 3); `noParry` on a
  quarter of attacks at most.
- References: any souls-like or action game whose combat fits ours (Sekiro, Lies of P, Stellar Blade, Devil May Cry,
  Elden Ring and others); ideas only, never their names or looks. Clips stay in `.scratch/`, never committed.
- **The judge:** a blind judge sees clips of our boss beside reference-game clips, unlabelled, and names the single
  biggest giveaway; fix it, judge again, scores logged per round. **Aleix fights it** before it is called final
  ("awaiting Aleix" in `STATE.md` until then).
Check: the Captain judged and awaiting Aleix; then **a second boss built through the system with no new engine code,
from one-page design to playable in about three passes**. That second boss proves the system.

### 6. The whole roster through the system

In the order players meet them: Pillager Captain, Bell Warden, the Gaol Giant, Aldric, the Antlered Hunger, Ostrey,
Hale and Harrow, the Ringer, Hollis, Oswin, Agathe, the Kindling Tree, the King's Blade, then Gemini. One boss a pass
or two. The borrowed Elden Ring move sources (`godfrey.js`, `godrick.js`, `maliketh.js`, `radagon.js`,
`crucible-knight.js`, `js/data/move-sources.js`) retire as their users get moves of their own. New bosses come after
the roster.
Check per boss: item 5's judge and Aleix's fight.

## Track 2: abilities and crates (Aleix, 2026-11-20)

### 7. Crates unlock abilities; each player picks their active pool

- **No collectibles:** the crate cosmetics (weapon looks and the rest in `js/data/crates.js`) leave the game; the
  Collection page becomes the abilities page. Story's flask finds stay (progression).
- **Starter set:** 6 commons, 4 rares (one each on Strike, Guard and Summon, one triggered), 2 legendaries (one
  Ultimate, one triggered). The loop picks which (a `Call:` line). The starter count per rarity is the minimum each
  player keeps active.
- **Crates:** one per level, opened on the end-of-run screen as now; each unlocks one ability the player doesn't own,
  never a duplicate. Odds about 70% common, 25% rare, 5% legendary, re-weighted toward rarities with abilities left.
  When everything is owned, the crate screen says the collection is complete. The crate roll stays the vision's
  spectacle.
- **Loadout panel:** opened from the lobby without leaving it, and from Boss Rush alone's start; abilities by rarity,
  each on or off, the minimum per rarity enforced; locked while a run is on. Card offers come only from the player's
  own active pool. The server checks it (rule 7).
- **Everyone resets** to the starter set (Aleix): the save version bumps and the changelog says so.
- Abilities not built yet appear once built; the starter set is drawn from abilities in the game.
Check: a fresh profile owns exactly the starter set; a crate unlocks a new ability and never a duplicate (tested over
the whole pool); the panel enforces the minimum and locks during a run, on desktop and phone width; an online run
offers only active abilities; screenshots of the panel and a crate opening.

### 8. The ability pool

Build `design/abilities/` (110 abilities and Story's four) in the batches of its `BUILD-ORDER.md`, one batch a pass,
to its `STYLE.md` and bars. Concept images there are references; the abilities' own art follows the chosen style
(item 4). Card text: trigger and effect only (AGENTS.md rule 10).
Check per batch: each ability fired in Practice with its effect and sound, its card text validated, an online fight
with it held.

## Later, in brief

In this order once the tracks above are through or idle: Boss Rush alone shown only when the lobby can't be reached,
or through a hidden button, the lobby the default (VISION, 2026-11-21); the style carried to enemies and levels; Story chapters 7 to
14 out of rough form; the showcase's finale as the Finishing Blow (`js/showcase.js`); the Boss Rush curve as settled
(no wall, ever: slowly harder every fight); the Finishing Blow's look (judge's last gaps in `STATE.md`).


### Last: one balance pass for the whole game (Aleix, 2026-11-21)

Once every ability is built, the roster reworked, the player finished and the style set; until then passes tune only
what their own step needs. Scope: every number that changes play (player stats and damage, bosses and enemies, the
Rush run, abilities, card and crate odds), not what the vision fixes nor anything only drawn.
- **Alone:** tuned for one player, nothing changes when friends join (VISION). The bots set the targets
  (`tools/rush-curve.cjs`, `bot-fights.cjs`, `story-curve.cjs`); replays and Aleix's play confirm. First fix
  `rush-curve.cjs runs` with `KIT=strong` (crashes on `payload`, 2026-11-21).
- **Rush, median fight reached:** a new player (the unskilled bot) 4-6; skilled with no good kit 12-15; skilled with
  two or more legendaries 25-30, under 5% past 40. On 2026-11-21: 5, 8, unmeasured; Aleix alone reached 27-29.
- **Story:** a new player beats a chapter boss in 2-4 tries, a skilled one in 1-2; foes kill only the careless.
- **Fights:** one boss 45-90 s, a pair under 2 min. A full-health player falls to 3-4 clean boss hits early in a run,
  2 late: combos kill, single hits don't. Full health and flasks each fight. The first death ends a solo run; only an
  ability may give a second life.
- **Attacking pays.** Today it is a wait-to-deflect game: the Finishing Blow (about 14% of a bar) dwarfs plain hits
  (0.5-1%) (Aleix). Plain hits rise, the Finishing Blow comes down, a counter is about 2-3x a light hit; counters and
  Finishing Blows make about a third of a skilled player's damage.
- **Rarities:** a common is a stat felt over a fight (+10-15%); a rare a technique noticed every fight; a legendary is
  OP and noticeable: it takes over the fight when it fires (10-20% of a mid-run boss's bar), two make a run feel broken
  in a fun way, and the curve rises to meet them (pass 73's nerf overturned). In a great kit late in a run, abilities
  deal about half the damage.
- **Odds:** cards keep 3% legendary and Crowned's guarantee. Crates 70/25/5, a legendary within the first 3 crates and
  never more than 10 apart. Starter set 6/4/2.
- **Windows stay** (dash 0.3 s, deflect about 0.35 s); the counter's reel may grow to about 0.6 s. Movement and attack
  speed up to +15% where a judge reads the clips as more anime; bosses keep up through the curve, never narrower windows.
- **Then:** Aleix plays 3 solo Rush runs, a friend new to the genre 2 solo runs and a Story chapter boss, all recorded;
  a second round fixes what those runs show against these targets.
Check, written to `docs/balance/`: the three Rush medians inside their targets (60 runs each); `bot-fights` fight times
inside 45-90 s; a bot pressing every opening kills faster than one that only waits to deflect; each legendary's share
of a mid-run fight's damage; the crate odds tested over the whole pool; then "awaiting Aleix's playtest" in `STATE.md`.
## Scorecard rows

What a 5 means, for the judge (`SCORECARD.md`):
- **Boss:** a blind judge can't tell our boss clip from a reference game's on combat readability and spectacle.
- **Feel:** a fight clip reads as anime action: sharp poses, weight on hits, counters landing clean.
- **Look:** the chosen style, consistent across player, boss and arena in one frame.
- **Speed:** 60 fps on Normal at 100% render scale on integrated graphics, every effect on.
- **Crates:** a crate opening a judge would watch twice.
- **Menus:** the loadout panel and lobby pass the design-audit rule book at desktop and phone width.
