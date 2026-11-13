# Backlog

The loop's cuts and finds (`.claude/iterate.md`); the order of work is `PLAN.md`.

- Kit parts no model uses since v7.28.0/v7.29.0: `quiver`, `archerHarness`, `cowl`, `fittedDoublet`, `wolfMuzzle`,
  `beastEars`, `furClumps`, and since v7.30.0 `wispHat`, `wispBeard`, `wispMantle`, `wispSleeve`, `wispRobe`, `wispTassels`
  and since v7.31.0 `scionMask`, `scionLimbs`, and since v7.32.0 `eyePatch`, `openCollar`, `featherMantle`, `waistSash`,
  `borderedSkirt`, `boot`, and since v7.33.0 `crystalCluster` (kit-identity.js, kit-premium.js, kit-realms.js,
  bodykit.js). Remove once stage 1 is done, with any others left unused.
- The `beastFur` texture projects as vertical streaks that read like wood grain on the Beastman, and is brown where its
  brief says grey. A texture pass (Claude-only) after stage 1.
- Models over budget seen in the load warnings: seren 3,544, ashenWarrior 7,226, omenkin 8,562 (enemy budget 3,000).
  All three belong to the old second road and leave at the swap (`PLAN.md` stage 3), so they get no Blender pass.
- `boss-only` (Node check) failed once with "boss activates after the grace period" and passed on the rerun, with and
  without the v7.34.0 change: flaky (pass 2, 2026-11-13).
- Bots fight bosses worse alone than in v7.12.1's record: Ser Quill beat the Bell Warden and Margit 6/6 then
  (`.scratch/bot-duel-v7.12.1-final.json`), 0/6 now (`docs/scorecard/boss-duels-1-bot.txt`, pass 5). Bots fill The
  Calling's empty slots (`PLAN.md` stage 2, item 3): find which change since v7.13.0 did it before then. With group
  scaling (pass 6) three bots beat the Lands' bosses only 13/48 (`docs/scorecard/boss-duels-3-bots-grouped.txt`), so a
  run with bot fill-ins needs this fixed, then `CONFIG.group` checked again.
- Group scaling counts everyone in the run, but the Lands road's solo companion Finn (Story mode) doesn't make a boss
  scale; if a companion should, it's a `setGroup` call where companions spawn (pass 6).
- The title cards' eyebrow labels ("PLAY WITH FRIENDS", "PLAY ALONE") and the HUD's "CONTROLS" label break Aleix's
  no-eyebrow rule (`docs/scorecard/menu-title-desktop.jpg`, pass 5).
- Level 4, the Tower, opens on a bare, dim stone hall where the wanderer reads as a dark shape; Level 6's snow is a flat
  white that washes out the ground and the controls panel (`docs/scorecard/level-the-tower.jpg`, `level-the-church.jpg`).
- Radagon is unbeaten by one bot or three (0/6 each, `docs/scorecard/boss-duels-*.txt`): check by hand whether a group
  of people can beat it before The Calling offers it.
