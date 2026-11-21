# Balance pass (PLAN "Last")

Pass 173 is pass 1 of ~2. Every number here comes from `tools/rush-curve.cjs` (Node, headless, bots), not from play.
Pass 168's notes: `docs/scorecard/now/rush-curve.md`.

## What changed (pass 173)

| Knob | Was | Now | Where |
|---|---|---|---|
| Every player blow | light 16, heavy 36, ... | x1.9 (light 30, heavy 68) | `js/data/player.js` |
| Counter | 16 x 2.25 = 36 (2.25 lights) | 30 x 2.75 = 82 (2.75 lights) | `js/data/player.js` `counter` |
| Finishing Blow on a boss | bossMul 20 (480, ~15% of a bar) | bossMul 11 (264, ~8%) | `CONFIG.finisher.damage` |
| Boss blows | x1 | x1.25 (`Enemy.damageMul`) | `CONFIG.enemy.bossDamage` |
| Rush pace rise | 0.165, warm to 0.85 | 0.2, warm from 0.9 | `CONFIG.pace` |
| Endless settle | 0.7 / 0.8 / 0.9 | none | `CONFIG.endless.settle` |
| Crates | pure 70/25/5 draw | a legendary by crate 3, then at most 10 apart | `CRATES.pity`, `js/progress.js` |

The dash (0.3 s) and deflect (~0.35 s) windows are untouched.

## The check, item by item

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

## Left for pass 2

- Skilled no-kit median 10 -> 12-15 without moving the other two: look at what kills skilled runs at fights 1-6
  (bosses that one-shot a deflecting bot) rather than global damage.
- Fight length: six bosses over 90 s at fight 6 for the skilled bot; mid-run fights over 90 s too.
- The Finishing Blow on an ordinary foe is still 90, now three light blows.
- Counters plus Finishing Blow toward a third of the damage.
- Weak legendaries: ember-twin, thunder-god-step, shade-host, hundred-suns.
- Swift (`CONFIG.swift`): the bot is swift in 44-76% of fights from fight 5 on; par may need to come down.
- Story tries (`tools/story-curve.cjs`) not measured this pass.

## Tools

`tools/rush-curve.cjs` now splits a fight's boss damage by source (`SPLIT=1` per boss; TOTAL line always) and takes
trial overrides without editing code: `HITS=1.5`, `FINISHER='{"bossMul":12}'`, `ENEMY='{"bossDamage":1.2}'`,
`BOTCFG='{...}'`, `BOT='{...}'`, `WARM='{...}'`. `SKILLED=1` now also deflects at its profile's rate
(`CONFIG.bot.parryChanceScale` 1).
