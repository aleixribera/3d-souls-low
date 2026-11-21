# The Boss Rush curve, settled (pass 168)

PLAN "Later": the Boss Rush curve as settled, with no wall ever, and slowly harder every fight. Plot: `rush-curve.png` (made by
`python tools/rush-curve-plot.py <dumps> docs/scorecard/now/rush-curve.png`).

## What the data showed

- **Aleix's recorded runs** (`node tools/replays.cjs --days 30`, 10 finished solo runs): 7 of the 10 ended in a pair
  fight (fights 9, 9, 14, 14, 19, 29 and 29). He fell in 7 of 24 pair fights (29%) but only 3 of 139 single fights (2%).
  Pairs were the wall.
- **The bots** (`tools/rush-curve.cjs runs`, 24 runs each). The default bot (new player) fell at fight 5 in 10 of 19
  runs, against 2 of 21 at fight 4. Fight 5 is where health went from the warm-up share to whole, and the boss pool
  opens. With a strong kit, the skilled bot hit a wall at fights 13-15 (pace x2.3-2.8). With no kit, it hit one at fights
  11-12.
- **A crash:** `rush-curve.cjs runs` crashed on `p.hitbox.payload` (the plan's "KIT=strong crashes"). Any kit could
  trigger it: a Finishing Blow began on the first of two bosses that one blow hit. The same crash could happen in a real
  pair fight.

## What changed

| | Before | After |
|---|---|---|
| Pairs | both bosses attack at will; `pairRest` 0.35 | the two take turns: neither starts an attack while the other winds up or strikes (`CONFIG.endless.pairTurns`, `js/crowd.js`); `pairRest` 0.5 |
| Pace | x1.64 at fight 10, x2.81 at 15, x4.05 at 20, +0.25 a fight | x1.19 at 10, x1.60 at 15, x2.50 at 20, +0.30 a fight, x8.4 at 40; never more than 11% above the fight before (`CONFIG.pace` rise 0.165, steady 20) |
| Health after the warm-up | whole from fight 5 | 0.7, 0.8, 0.9 at fights 5-7, then whole (`CONFIG.endless.settle`) |
| Modifiers | the 1st at fight 8, 2nd at 14, 3rd at 20 | the 1st at fight 8, 2nd at 16, 3rd at 26 (`CONFIG.endless.mods`) |
| Finishing Blow on one of a pair | crash | the blow ends there (`js/combat.js`) |

## Before and after

All runs are alone, 24 per row. A row's "after" is the shipped config; "before" is the old curve with the crash fix.
At this sample size a median moves by about ±1 on noise alone.

| Player (the bot) | Target median | Before | After | Past 15 | Past 20 | Past 40 |
|---|---|---|---|---|---|---|
| New player (default bot) | 4-6 | 5 (mean 5.6) | **6** (5.9) | 0 | 0 | 0 |
| Skilled, no good kit (`SKILLED=1`) | 12-15 | 9 (9.2) | **11** (11.8) | 0.04 → 0.25 | 0 | 0 |
| Skilled, two legendaries (`SKILLED=1 KIT=strong`) | 25-30, under 5% past 40 | 17 (17.0) | **23** (23.2) | 0.54 → 0.92 | 0.25 → 0.75 | 0 (longest 34) |

How often the bot falls, fights 5 on:

| | Pair fights before | Pair fights after | Single fights before | Single fights after |
|---|---|---|---|---|
| Skilled, no kit | 4/14 (29%) | 5/28 (18%) | 20/110 (18%) | 19/159 (12%) |
| Skilled, strong kit | 4/53 (8%) | 1/82 (1%) | 20/260 (8%) | 23/379 (6%) |

- **Pairs:** at fight 11, the skilled bot alone fell in 28% of pair fights without turns and 8% with them (`pairs`
  mode). A rest of 0.6 brought that back to 21%, so 0.5 sits a little above the single fights next to it: a step up,
  not a wall. The bot reads both bosses at all times. A player whose camera sits on one gains more from turns than the
  bot does.
- **Fight 5:** the default bot fell there in 7 of 19 runs, down from 10 of 19.
- **No wall left in the curve itself:** every fight is a little faster than the one before (`tests/boss-pace.cjs`).
  For a strong kit, the chance of falling now climbs from about 5% a fight in the teens to 20-40% a fight past 21. Before,
  it jumped at fight 13.

## What is left, and why it is not the curve

The skilled bot's medians sit just under their targets: 11 against 12-15 with no kit, 23 against 25-30 with a strong
kit. Four curves (A to D below) all left both medians where they were (11 and 22-23), so pace is no longer what ends
these runs. The bot's fights run 150-185 s against the plan's 45-90 s. Its long fights mean more blows to survive, and the
"Last" balance pass ("Attacking pays": plain hits rise) is where that gets fixed. Re-measure these three rows after it.

## Candidates tried (24 runs each, `SKILLED=1`)

| Candidate | No kit | Strong kit |
|---|---|---|
| Before (rise 0.55, steady 11, no turns) | 9 | 17 |
| A: rise 0.4, steady 13, turns | 11 | - |
| B: rise 0.165, steady 20, turns, `pairRest` 0.35 | 11 | 23 |
| C: rise 0.12, steady 22, turns, `pairRest` 0.5 | 11 | 22 |
| D: B with `pairRest` 0.5, mods 8/16/26 | 11 | 22 |
| **Shipped: D with `settle` 0.7/0.8/0.9** | **11** | **23** |

Bot fall rate per boss, fights 5 on (72 runs, no kit): Vesper 42% and Agathe 30%, against 0-25% for the rest. Those
deaths came almost all in fights with modifiers. In `bosses` mode at x1.25 without modifiers, each fell in only 1 of 16
fights, so no boss gets a health share yet.

Tools: `SHARES='{"vesper":0.7}'` (new) merges into `RUSH.health`. A worker that dies now fails the run instead of
hanging it.
