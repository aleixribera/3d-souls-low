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
