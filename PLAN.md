# Plan

The order of work under `VISION.md`, written by the director from the grilling with Aleix on 2026-11-20. The loop
reads it every pass and doesn't edit it: cuts and finds go to `BACKLOG.md`, asks to "Needs Aleix" in `STATE.md`. Older plans: git history.

## How the work runs

- **One pass at a time** until items 1 to 3 are done; then **two tracks** in parallel (`.claude/iterate.md`):
  track 1 bosses then the phone, track 2 abilities and crates. The tracks touch different files.
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

## Track 1: bosses, then the phone

Done: the art style (cel, Aleix's pick, default since v7.205.0), the boss creation system (pass 111 on) and the whole
roster through it, Gemini last (pass 153); bosses await Aleix's fight. Their text: git history. A new boss follows the
system: a one-page design, Blender model, animation (free tools; paid only with Aleix's yes), effects that never cover
a wind-up, a blind judge against reference-game clips, Aleix's fight last.

### 9. Fully playable on the phone, from the same link (Aleix, 2026-11-21)

"Make it feel and play good." Every mode on the phone, landscape only: Story, Boss Rush online in the same lobby as PC
players, Boss Rush alone, Practice, crates, the loadout panel and every menu.
- **Controls** (mobile action-game standard): a floating stick on the left half; a right thumb cluster with light,
  heavy, dodge and deflect, the four ability keys in an arc; drag the right half for the camera; tap a foe to lock
  on. The same lock-on and aim help the PC has, the same windows and damage. A gamepad paired to the phone works.
- **Installable app:** the home-screen launch (manifest, icon, splash) is full screen with no browser bar, respects
  the notch and home bar, keeps audio working, and a first phone visit shows an "Add to Home Screen" hint.
- **Speed:** 60 fps on Normal on Aleix's iPhone 15 Pro; 60 fps on Low on a 2021 mid-range Android, 30 at worst on
  older. Render scale 100% of CSS pixels, sharpness capped at 2x (VISION).
- **Real-device numbers:** live debugging an iPhone needs a Mac, so the game, on a phone, sends frame rate, the
  preset and errors to the home server while it plays; the loop reads them like replays. Emulation (Playwright WebKit
  and Chromium at iPhone and Android sizes, touch on) covers the rest.
Check: every mode played through in emulation with touch only (frames in `docs/scorecard/now/phone-*`, the console
clean); the design-audit rule book passes the touch HUD and menus at phone landscape; a gamepad works; then Aleix
plays on his iPhone from the home screen, and his device's numbers in the server meet the speed line. Until he has,
"awaiting Aleix" in `STATE.md`.

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
