# Balance pass (PLAN "Last")

Two passes: 173 and 174 (the last). Every number here comes from the bots (`tools/rush-curve.cjs`,
`tools/story-curve.cjs`: Node, headless), not from play. Next: Aleix's playtest (below). Pass 168's notes:
`docs/scorecard/now/rush-curve.md`.

## Where it stands (pass 174)

| The plan's check | Target | Measured | |
|---|---|---|---|
| Rush median, new player (default bot), 60 runs | 4-6 | 6 (1-11) | met |
| Rush median, skilled, no kit, 60 runs | 12-15 | 12 (5-26) | met |
| Rush median, skilled, strong kit, 60 runs | 25-30, under 5% past 40 | 24 (5-41), 4 of 60 past 40 (7%) | cut: closest stand-in |
| One boss fight, skilled, fight 6 (`bosses 2 6`) | 45-90 s | 72 s; per boss 46-98 s | met but Agathe (98 s) |
| Pressing every opening kills faster than waiting to deflect | faster | 65 s against 72 s | met |
| Counters and Finishing Blows, skilled | about a third | 31% (16% + 15%) | met |
| Each legendary's share | 10-20% of a mid-run bar when it fires | below | met for the four weak ones |
| Crate odds over the whole pool | 70/25/5, a legendary by crate 3, gaps at most 10 | `tests/crates.cjs` (pass 173) | met |
| Story, new player (default bot), 13 chapter bosses x 8 | 2-4 tries | 48% won (about 2 tries) | met |
| Story, skilled | 1-2 tries | 84% won (about 1.2 tries) | met |

The dash (0.3 s) and deflect (~0.35 s) windows are untouched.

## What changed (pass 174)

| Knob | Was | Now | Where |
|---|---|---|---|
| The bot takes an open counter | only within sword reach, when its whole swing fit before the next blow | from 80% of the flash step's range, when its blow lands first (a landed counter ends the string) | `js/bot.js`, `CONFIG.bot.counterReach` |
| Bosses' blows in Boss Rush | x1.25 | x1.25 x (1 + 0.25 x the party's might): no kit, no change | `CONFIG.endless.mightBlows`, `setRushFight` |
| Swift par after the warm-up | 100 s | 80 s | `CONFIG.swift.late` |
| Ember Twin | 12 s, 0.55 of each blow | 20 s, 0.75 | `js/data/abilities.js` |
| Thunder God Step | 30 a cut | 120 | `js/data/abilities.js` |
| Shade Host | 6 s, 0.35 | 8 s, 0.6 | `js/data/abilities.js` |
| Story road, bosses | health 0.75-1, blows 0.85-1.1 | health 0.9-1.1, blows 1.25-1.6 | `CONFIG.story.road` |
| Saltgrave's pair; Ember Root's tree | 0.65 health, 0.8 blows; the road's | 0.75, 0.9; blows 1.25 | `js/data/story.js` `might` |
| Camera shake from a player's blow | by its damage | by its damage / 1.9 (a light cut stays steady) | `CONFIG.fx.strikeShake.player` |

Why the bot: it opened 4.8 counters a minute and landed 1.8 (`SPLIT=1` now also counts deflects, openings, counters,
dodges, dashes and drinks a minute). A skilled player takes those openings; the bot let them go because it waited
until the whole counter fit before the boss's next blow, though a landed counter ends the string. Now it lands 4.2 a
minute. That alone brought fight 6 from 92 s to 72 s, counters and Finishing Blows from 15% to 31%, and the skilled
median from 10 to 12, without a game number changed. The default bot (more slips) gained less: 5 to 6.

Why `mightBlows`: with the bot taking its counters, the strong kit reached the 40-fight cap in 38 runs of 60 (median
41). "The curve rises to meet them" (PLAN): a boss hits harder by a quarter for each point of might the party holds
(`kitMight`: a common 0.03 a level, a rare 0.06, a legendary 0.18; the strong kit holds 0.7 by fight 10, 1.35 by 20).
24-run sweep: 0.2 gave a median of 27 with 17% past 40, 0.3 gave 24 with 4%, 0.5 gave 16. Online, the session carries
the multiplier (`session.blows`), so every browser's bosses strike as hard as the server's.

## Fights, skilled, fight 6 (`SKILLED=1 SPLIT=1 node tools/rush-curve.cjs bosses 2 6`)

| | win time | plain | counter | Finishing Blow | counters a minute |
|---|---|---|---|---|---|
| pass 173 end | 92 s (26 of 30 won) | 85% | 9% | 6% | 1.8 |
| counter 3x, reel 0.6, Finishing Blow 14 (tried, not kept) | 87 s (24 of 30) | 79% | 11% | 10% | 2.2 |
| pass 174 | 72 s (25 of 30) | 69% | 16% | 15% | 4.2 |

Per boss (pass 174): Hale and Harrow 49 s, Ostrey 56, Kindling Tree 60, Giant 61, Hollis 71, King's Blade 77,
Antlered 79, Ringer 79, Pillager Captain 83, Vesper 84, Oswin 86, Agathe 98; Varn won 0 of 2. The Bell Warden beats
the bot at 29 s in 2 of 2 at this seed (2 of 4 over four): its opening sweeps (`BY=2`: wardenSweep#0). The counter's
worth (2.75 lights) and the Finishing Blow (~8% of a bar) stay as pass 173 left them: raising them moved the shares
less than the bot taking its openings did.

Pressing against waiting (fight 6, skilled, every boss, 2 fights each): `BOT='{"aggression":1,"greed":1,"patience":1}'`
wins in 65 s (22 of 30 won), `BOT='{"aggression":0.1,"greed":0,"patience":3}'` in 72 s (29 of 30). Pressing kills
faster and falls more.

## Rush medians, 60 runs each

| Player | target | pass 173 | pass 174 | range | past 40 |
|---|---|---|---|---|---|
| new (default bot) | 4-6 | 5 | 6 | 1-11 | 0 |
| skilled, no kit | 12-15 | 10 | 12 | 5-26 | 0 |
| skilled, strong kit | 25-30, under 5% past 40 | 27 | 24 | 5-41 | 4 of 60 (7%) |

Mid-run fights (skilled, no kit): 44 s (fights 1-4), 80 s (5-10), 82 s (11-15), 66 s (16-20). The default bot is swift
(under par) in a third of its fights after the warm-up (0.38); the skilled one in two thirds or more.

## Legendaries (each alone, skilled, fight 10: Agathe, Giant, Hollis, Varn, 2 fights each)

Its share of the fight's damage:

| Legendary | pass 173 | pass 174 | note |
|---|---|---|---|
| Ember Twin | 3% | 1% at its old numbers | the skilled bot drinks 0.1 flasks a minute; one drink now calls 20 s at 0.75 of every blow, about 17% of a mid-run bar (was 8%) |
| Thunder God Step | 6% | 11% | |
| Shade Host | 7% | 15% | |
| Hundred Suns | 8% | 12% | unchanged: the bot lands more Finishing Blows |
| Meteor Fall (for scale) | 26% | 21% | |

The rest were 14-26% in pass 173. Storm King reads 0 (the bot never holds a full charge); Blood Moon, Fourfold and
Time Rift deal no damage of their own.

## Story (`node tools/story-curve.cjs 8`; `SKILLED=1` is new)

Each chapter boss alone, 8 tries, at its chapter's place on the road with its flasks:

| | pass 173's game | pass 174, new | pass 174, skilled |
|---|---|---|---|
| all 13 | 73% won (1.4 tries) | 48% (2.1 tries) | 84% (1.2 tries) |
| hardest | Ostrey 25% | Hale and Harrow 13% at 1.05 blows (58% of 12 at the kept 0.9) | Oswin 63% |
| easiest | five at 100% | Pillager Captain 100% (chapter 3) | five at 100% |

## Cut (pass 174), in `BACKLOG.md`

- The strong kit: median 24 and 7% past 40 at `mightBlows` 0.25 (target 25-30, under 5%). One multiplier trades the
  two: 0.2 gave a median of 27 with 17% past 40 (24 runs). Meeting both wants blows (or pace) that grow later in a
  run for a strong kit, not only with its might.
- The Bell Warden's opening sweeps beat the skilled bot in half its fights at fight 6.
- Agathe runs 98 s at fight 6 (target 45-90).
- Story foes ("they kill only the careless") were not measured.

## Playtest (next: awaiting Aleix)

Aleix plays 3 solo Rush runs; a friend new to the genre plays 2 solo Rush runs and one Story chapter boss; all
recorded (the replays: `node tools/replays.cjs`). A second round fixes what those runs show against these targets.

## Pass 173 (1 of 2): what changed

| Knob | Was | Now | Where |
|---|---|---|---|
| Every player blow | light 16, heavy 36, ... | x1.9 (light 30, heavy 68) | `js/data/player.js` |
| Counter | 16 x 2.25 = 36 (2.25 lights) | 30 x 2.75 = 82 (2.75 lights) | `js/data/player.js` `counter` |
| Finishing Blow on a boss | bossMul 20 (480, ~15% of a bar) | bossMul 11 (264, ~8%) | `CONFIG.finisher.damage` |
| Boss blows | x1 | x1.25 (`Enemy.damageMul`) | `CONFIG.enemy.bossDamage` |
| Rush pace rise | 0.165, warm to 0.85 | 0.2, warm from 0.9 | `CONFIG.pace` |
| Endless settle | 0.7 / 0.8 / 0.9 | none | `CONFIG.endless.settle` |
| Crates | pure 70/25/5 draw | a legendary by crate 3, then at most 10 apart | `CRATES.pity`, `js/progress.js` |

## Pass 173: the check, item by item

1. **`rush-curve.cjs runs` with `KIT=strong`**: works (pass 168 fixed `js/combat.js`); 60 runs below.
2. **Attacking pays.** Skilled bot, fight 6, every boss (`SKILLED=1 node tools/rush-curve.cjs bosses 2 6`):

   | | win time | plain | counter | Finishing Blow |
   |---|---|---|---|---|
   | before | 136 s | 74% | 6% | 20% |
   | after, before `bossDamage` | 79 s | 80% | | 20% together |
   | after, final | 92 s (26 of 30 won) | 85% | 9% | 6% |

   A counter is 2.75 lights. Two fights per boss: the 79 -> 92 s step is inside this sample's noise. A bot that presses (`BOT='{"aggression":1,"greed":1,"patience":1}'`) wins in 78 s, one
   that waits for openings in 98 s: pressing kills faster. Counters plus Finishing Blow are ~20-25% of a fight, not
   yet "about a third".
3. **Fight length 45-90 s.** Fight 6, skilled, final config: 92 s on average, per boss 55-119 s; Vesper 119,
   Agathe 114, Hollis 111, Oswin 111, Ringer 106, Antlered 100 are over (the Bell Warden killed the bot twice). In whole runs the bot's win time is 50 s (fights 1-4), ~103 s (5-10), ~115 s (11-15) for a
   skilled bot without kit and 85-97 s with the strong kit. Aleix's own replays (`node tools/replays.cjs --days 30`)
   are 2-2.5x quicker than the skilled bot, so his fights land at ~30-50 s.
4. **Rush medians, 60 runs each** (`node tools/rush-curve.cjs runs 60`, `SKILLED=1`, `KIT=strong`):

   | Player | target | median | range | past 40 |
   |---|---|---|---|---|
   | new (default bot) | 4-6 | 5 | 1-14 | 0 |
   | skilled, no kit | 12-15 | **10** | 1-24 | 0 |
   | skilled, strong kit | 25-30 | 27 | 1-41 | 3 of 60 (5%) |

   Skilled without kit is short: 16 of 60 runs fall by fight 6 (three at fight 1). Raising boss damage hurts the new
   player and the skilled one together; lowering it lifts the new player past 6 (24-run sweep: bossDamage 1.2 gave
   7/12/24, 1.3 gave 6/11/22, 1.25 with warm to 1.0 gave 6/12/30). Noise at 24 runs was +-2 on the skilled median.
5. **Legendary shares** (each legendary alone, skilled, fight 10, four bosses; its share of the damage):
   meteor-fall 26%, phoenix-dive 22, thunder-call 21, frozen-lotus 21, cataclysm / tempest / great-wave 20,
   heavens-lance / sky-blade / ash-legion 18, gale-crescent / black-star / severance / colossus 17,
   thousand-blades 15, pyre 14, world-of-ink 11, hundred-suns 8, shade-host 7, thunder-god-step 6, ember-twin 3.
   Storm-king reads 0 (the bot never holds a full charge); blood-moon, fourfold and time-rift deal no damage of their
   own. Measured before `bossDamage`, which does not touch them.
6. **Crate odds**: `tests/crates.cjs` over 200 fresh collections: the first legendary in crates 1-3, the longest gap
   10, the first 20 crates 63% common / 24% rare / 13% legendary (the pity lifts the early legendary share above 5%;
   the long-run draw is still 70/25/5). Starter shares unchanged (6/4/2).

## Tools

`tools/rush-curve.cjs` splits a fight's boss damage by source (`SPLIT=1` per boss; TOTAL line always) and takes
trial overrides without editing code: `HITS=1.5`, `FINISHER='{"bossMul":12}'`, `ENEMY='{"bossDamage":1.2}'`,
`BOTCFG='{...}'`, `BOT='{...}'`, `WARM='{...}'`. `SKILLED=1` now also deflects at its profile's rate
(`CONFIG.bot.parryChanceScale` 1).
Pass 174 adds `COUNTER=`, `PARRY=` and the per-minute counts to `SPLIT=1`, and `SKILLED=1` to `tools/story-curve.cjs`.
