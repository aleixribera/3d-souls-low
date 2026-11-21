# Backlog

The loop's cuts and finds (`.claude/iterate.md`); the order of work is `PLAN.md`. Cut to the 2026-11-20 plan by the
review (`reports/2026-11-20.md`): every boss is rebuilt through the boss system (PLAN 5-6), the art style is chosen
anew (PLAN 4) and crates unlock abilities (PLAN 7), so each old boss's, model's and crate's leftovers went. Git keeps
them (`git show 88f1abd:BACKLOG.md`).

## Combat and online (bugs and finds)

- Dead references to posture and executions since the Finishing Blow (pass 100): `camera-feel.js`, `animator.js`
  (ES.BROKEN), `lessons.js`, `data/lessons.js`, `levels/long-hall.js` (the lessons `stance` and `execute` wait on
  events that never come), `rig.js`, `world-hints.js`, `tests/onboarding.cjs`. Clear them with PLAN 3.
- A client never learns its boss's pace (`session.pace` sent, unused): the parry lead (`parryTiming`) shrinks with
  `tellRate()` to 0.072 s at fight 40. Set `Enemy.pace` from the session, or count the lead in real time.
- A pressed ability the server refuses spends the client's charge with no refund.
- Server claim gaps (harmless among friends): flask use (`useItem`) is not checked; a parry claim during a gilt echo
  is not rejected; a bolt inside a parryable attack is checked with `canParryAttack`, not `canParryHit`.
- Online, a ward or Waiting Blade claim against a sealed attack (Binding Seal) is not refused by the server (pass 137).
- Online, a blow that hit a teammate while its target perfect-dodged still gives the boss the long recovery.
- 92 of 197 boss attacks can't be deflected (area hits, leaps); PLAN 5's "`noParry` on a quarter at most" applies
  per boss as each is rebuilt (per-hit `noParry` exists).
- Ground area marks (`CONFIG.VISUALS.areaMark`, `js/area-marks.js`) are orange-red, close to the parry tell's red, and their fill
  sits over a boss's legs in cel (the `bars-1` judge, pass 142, on the Ringer's Fetter Stamp): a colour of their own.
- `startFight('dummy')` under `Game.manualClock` turns positions to NaN (no `speed`, starts in chase).
- A test that empties `Game.enemies` without `sim.clearEnemies()` leaves figures for later tests; a runner check
  would catch it.
- Flaky: `abilities` Node check (`tests/abilities.cjs:572`, run 43632565109); `lobby-polish-browser` preset switch.

## Boss Rush and Story

- The Boss Rush curve (PLAN "Later"): fights run 68-160 s at 1x; one swift-kill par for every boss
  (`CONFIG.swift.late`) favours quick bosses: a par from each boss's own health would even it. Bots never hold a heavy
  to full charge, so charge abilities are unmeasured by `tools/rush-curve.cjs`.
- Crowned fights: no own final phase, no arena change; modifiers are pace-only.
- Weekly: the end screen doesn't say where the run placed; a mid-week release changes that week's run.
- Story's four key abilities (VISION): pass 89's draft, not built: a level's `abilityFinds` beside `flaskFinds`
  (Wind Blade, Mending, Grave Hound, Thunder Call at four places on the road).
- Blessings aren't shown anywhere during a fight.
- Two players' summons of one kind stand in the same spot.

## UI

- Eyebrow labels break Aleix's rule: the title cards' "PLAY WITH FRIENDS" / "PLAY ALONE", the HUD's "CONTROLS".
- The always-on controls panel was named a giveaway by 4 of 5 judges (review 2026-11-20): hide it after the first
  fights.
- The run intro (`#runIntroScreen`) keeps its own look (glowing crest, drifting embers) outside the one type system.

## Speed

- Touch devices go straight to Low at native resolution: untested on a phone; next lever a cheaper Low material.
- High on weak GPUs: flame glows and light pools are the other steady cost; fewer, tighter quads.

## Clean-up

- Kit parts no model uses (kit-identity.js, kit-premium.js, bodykit.js): `quiver`, `archerHarness`, `cowl`,
  `wispHat` and the rest listed in `git show 88f1abd:BACKLOG.md`.
- Opt-in mechanics no content uses: `lifesteal`, hazard floors, flame `breath`.
- Branches not adopted: `wip/p101-dash-clip`, `wip/p102-dash-lunge`, `wip/p102-deflect-keys` (unjudged),
  `wip/blessing-tall-cards`.
- Deferred from item 8 batch 1 (pass 109): Iron Blood veins, Quick Draught smear, the level-IV streak, card hover
  loops (design/abilities/BUILD-ORDER.md).
