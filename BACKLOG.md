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
- After 2026-11-28: drop the Finishing Blow's unpicked looks (`ANIM_SETTINGS.finisherFx.looks`), or ship the one Aleix
  picks instead of `ink` (pass 171).
- A pressed ability the server refuses spends the client's charge with no refund.
- Server claim gaps (harmless among friends): flask use (`useItem`) is not checked; a parry claim during a gilt echo
  is not rejected; a bolt inside a parryable attack is checked with `canParryAttack`, not `canParryHit`.
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

- Cut (pass 174): the strong kit's Rush median is 24 with 7% of runs past fight 40 (target 25-30, under 5%);
  `CONFIG.endless.mightBlows` trades one for the other. Wants blows or pace that grow later in a run for a strong kit
  (`docs/balance/README.md`).
- Cut (pass 174): the Bell Warden's opening sweeps beat the skilled bot in half its fights at fight 6; Agathe runs
  98 s there (target 45-90).
- Cut (pass 174): Story's ordinary foes ("they kill only the careless") are not measured by `tools/story-curve.cjs`.
- The Boss Rush curve (PLAN "Later"): fights run 68-160 s at 1x; one swift-kill par for every boss
  (`CONFIG.swift.late`) favours quick bosses: a par from each boss's own health would even it. Bots never hold a heavy
  to full charge, so charge abilities are unmeasured by `tools/rush-curve.cjs`.
- Crowned fights: no own final phase, no arena change; modifiers are pace-only.
- Weekly: the end screen doesn't say where the run placed; a mid-week release changes that week's run.
- Story's four (pass 159) left out: the scarf's hide swap on the wanderer, the painted faces turning to the player,
  Ysolde's ringing scene for the Bell, frozen ash in the kneel, the two tolls' rings at different gaps. A gift whose
  place was walked past in an existing save is not given until a jump or a new game.
- Blessings aren't shown anywhere during a fight.
- Two players' summons of one kind stand in the same spot.
- Legendaries I (pass 151) left out of their design pages: Gale Crescent's tally on the blade; Time Rift's white-violet
  recolour and grey world; Thousand Blades' sky ring and planted last ten; Pyre's flame tongues; Meteor's held beat
  at the jump's top; the Ember Twin's floor-crack rise and `abilityTwinFade`; the crown's sky darkening.

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
- Hollis's mantle (pass 143, `bars-1`): from the side camera it still fills the frame for a beat after the Pavane's first
  cut and through Ravenous's turns, his back turned; the game camera sees him. A shorter or split mantle on the model.
- Oswin's mantle (pass 145): it still turns as one board through the Royal Progress's turn from the side camera; a
  split mantle, as Hollis's. Pass 146 (`bars-1`): the same through Empty Reign's wind-up and after the Sworn Fist.
- Deferred from item 8 batch 1 (pass 109): Iron Blood veins, Quick Draught smear, the level-IV streak, card hover
  loops (design/abilities/BUILD-ORDER.md).
- Pass 148's `bars-1` round (Agathe's) saw two older bosses' wind-ups covered: the Regent's Feast washes his whole body
  red and then a fire burst whites it out; the castellans' Hewing opens on a white flash over the body. Check against
  Oswin's fix (pass 146, `js/effect-lighting.js`).
