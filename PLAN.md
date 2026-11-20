# Plan

The order of work under `VISION.md`, written by the director from the grilling with Aleix on 2026-11-20. The loop
reads it every pass and doesn't edit it: cuts and finds go to `BACKLOG.md`, asks to "Needs Aleix" in `STATE.md`. The
plan before this one (to commit 9eed9bf) is in git history; what it held that still matters is folded in below.

## How the work runs

- **One pass at a time** until items 1 to 3 are done; then **two tracks** in parallel (`.claude/iterate.md`):
  track 1 bosses, track 2 abilities and crates. The tracks touch different files.
- The bar is the vision's: AAA feel, runs on a toaster, anime action against fair, cunning bosses.
- **Balance is the loop's** (Aleix, 2026-11-20: "current numbers are not final"): every number in the game and in
  this plan (damage, health, timings, windows, odds, the starter set's counts, the difficulty curve) is a starting
  point. Any pass may change one, with its evidence (bot runs, replays, a judge, Aleix's feedback) in the commit.
- Work done outside the loop (other tools, other models) is a draft like any other: the loop reads it into `STATE.md`
  and judges it like its own. Nothing reaches players without green CI.

## Now

### Process first (review 2026-11-20)

The review found no current-frames folder (333 files in `docs/scorecard/`, newest from before the pause) and no
reference set: its blind panel had to cut references from `.scratch/ref-clips` videos by hand. Without both, no
judge can score PLAN 4-5 the same way twice. In the pass that does item 1 or 2, at no extra pass:
- `.claude/iterate.md` names the current folder (`docs/scorecard/now/`, one latest frame per screen, retaken by any
  pass that changes the screen) and the reference set (`.scratch/ref-clips`, never committed) with the panel's lineup and prompt
  (`docs/scorecard/panel/`).
- Seed `now/` from what exists (a Boss Rush fight, the lobby desktop and phone, a crate roll) after item 2's cuts.
Check: the loop file names both; `now/` holds a frame per screen dated after item 2.

### 1. Main green, and nothing ships red

CI has failed on every push since v7.151 (textures `astralSilver`, "Ultra models" `shoulderX`, "Ultra performance",
"High effects: delayed boss decorations"), yet the container workflow published each version.
- Fix the failures (much of it may go with item 2's cuts; order them as is cheapest).
- The container publishes only from a commit whose CI run is green.
- Rewrite the changelog entries v7.140 to v7.160 in players' words (VISION: plain English): no "GLSL", "bind
  matrices", "spark-allocation".
- Hosting: players play on the home server. `PLAY-LINK.txt` points at its public address; GitHub Pages retires (the
  workflow off, the page gone or redirecting). Code, CI and the container build stay on GitHub.
Check: a green CI run on `main`; a red test blocks the container job (shown on a branch); `PLAY-LINK.txt` opens the
game; the old Pages address no longer serves the game.

### 2. Cut most of the out-of-loop work (Aleix, 2026-11-20)

Built 2026-11-19/20 with other model providers, "with varying satisfaction".
- **Cut:** the "extreme VFX" revamps v7.141 to v7.155 (each boss back to its effects before them; the shared "Extreme
  Boss VFX engine" goes unless something kept needs it) and Boss v2 with Veyra, the Ashwing (v7.158, v7.159:
  `js/boss-v2.js`, `js/boss-fx-v2.js`, `ashwing`, its Blender file, the `v2`/`skinnedV2` fields and their checks,
  AGENTS.md's Boss v2 paragraph). Aleix disliked v2's model, animation, moveset and effects; the world fit was fine.
  Engine ideas from it may be reused by item 4 on their merits, never kept by default.
- **Keep:** the `/souls/` serving fixes (v7.156, v7.157); all of v7.160 (no intro pause, enemies wait until you move,
  ability cards highlight then Confirm, no cap on legendaries, shorter phase transitions); Gemini, Neon High in its
  v7.140 form, which the loop may restyle and rename freely as Boss Rush's one contrast boss (Aleix: "make all changes
  you want to it").
Check: the 15 bosses fight in Practice with their pre-revamp effects and no console error; Veyra and v2 absent from
code, data and validation; v7.160's behaviours still there (in-page tests); Gemini in Boss Rush.

### 3. Counters never overlap the boss's string (Aleix, 2026-11-15)

From his Weekly Run (replay `2026-11-15-891a9aff71`): 11 of 20 deflects opened no counter, 24 of 62 counters landed
mid-string.
1. A counter breaks the string, every string, no exceptions. The boss reels about half a second (room for the
   follow-up, not a free combo), then attacks at its usual pace; the string's remaining blows never come. One crack per
   string follows, so the `rest` rule goes.
2. Every deflect opens the counter, like a perfect dodge; the last-blow-only rule goes.
3. The Finishing Blow stays the third counter (two cracks, then the blow).
4. One cue when a counter opens, the same after a dodge or a deflect: a flash on the player's weapon and a short sound;
   nothing when it doesn't.
5. The light counter is the only counter, its damage raised to about today's heavy counter (36). A heavy in the window
   is a normal heavy. The rising-cut `counterHeavy` goes, and the bot, showcase and texts follow.
Check: in-page tests for each rule; a bot run where no counter lands during a string and every deflect opens one; a
clip of the cue.

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

In this order once the tracks above are through or idle: the style carried to enemies and levels; Story chapters 7 to
14 out of rough form; the showcase's finale as the Finishing Blow (`js/showcase.js`); the Boss Rush curve as settled
(no wall, ever: slowly harder every fight); the Finishing Blow's look (judge's last gaps in `STATE.md`).

## Scorecard rows

What a 5 means, for the judge (`SCORECARD.md`):
- **Boss:** a blind judge can't tell our boss clip from a reference game's on combat readability and spectacle.
- **Feel:** a fight clip reads as anime action: sharp poses, weight on hits, counters landing clean.
- **Look:** the chosen style, consistent across player, boss and arena in one frame.
- **Speed:** 60 fps on Normal at 100% render scale on integrated graphics, every effect on.
- **Crates:** a crate opening a judge would watch twice.
- **Menus:** the loadout panel and lobby pass the design-audit rule book at desktop and phone width.
