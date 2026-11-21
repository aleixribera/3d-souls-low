# Iterate: Combat Arena 3D

Model: opus, effort medium
Skill synced: 6acf5c4
Parts: judge (panel: `docs/scorecard/panel/`), review (weekly, from 2026-11-20), incidents (the game is played online).

## Vision and plan

- `VISION.md`, `PLAN.md`; `STORY.md` is the story: part one is what is in the game (every in-game text agrees with it),
  part two where it is going. The director writes it with Aleix; a pass moves a piece into part one when it ships.
- Two tracks at once (when `PLAN.md` says so): each pass in its own worktree, by `docs/two-tracks.md`.
- Stop point (Aleix, 2026-11-21): when `PLAN.md` items 5 to 8 are done (all 14 bosses through the boss system, the
  whole ability pool built), the pass that finishes the last of them writes the pause line in `STATE.md` "Now"; the
  "Later" items wait for Aleix and the director. "Through the system" means a rework where a boss misses the
  system's bars (own moves, combos, signature moments, a real phase two), not just a restyle (Aleix, 2026-11-21).
- No per-release or per-model docs: the commit message holds the details, and the in-game changelog
  (`js/data/changelog.js`) is the one changelog. A model's notes are its `tools/blender/<name>.py` header.
- Third-party assets: logged in the header of the file that uses it.

## Build

No build step. A model:

```
blender -b --factory-startup -P tools/blender/run_asset.py -- <stem> --export
node tools/pack-baked.cjs <stem>
```

- Blender 5.2 is on PATH, always headless (`-b`). The figure helpers are `tools/blender/figure_lib.py`.
- The template is the closest finished figure (`rogue.py` for hooded Hollowed, `knight.py` / `warden.py` for plate).
- The preview sheet lands in `tools/blender/out/previews/<stem>.png`. Register the set in `tools/pack-baked.cjs` and the
  file in `GAME_FILES` (after the other `baked/*.js`).

## Test

- Validation runs at load (`js/validate.js`). `npm run test:node` covers data and server checks (fast).
- In-page tests by name: `node tests/solo-browser.cjs "<filter>"`; test files: `node tests/run-all.cjs <file>`.
- The full suite runs on CI (four shards plus `browser-smoke`) on every push, never locally.

## See it working

- Serve: `python -m http.server 8123 --bind 127.0.0.1`, open
  `combat-arena-3d.html#dev`, then `MODELLAB.open('<modelId>')` (F9): front, back, side and silhouette.
- A drawing that reads simulation state the snapshot lacks (`abilityPowers`) gets an online path, and its in-page test
  empties the page's copy (why: Ash Husk's ring showed only in Practice, pass 137's review, retro 140).
- **Current frames:** `docs/scorecard/now/`. `node tools/now-frames.cjs [lobby|rush|crate]` retakes the lobby
  (desktop, phone), a Boss Rush fight and a crate roll; `node tools/scorecard-frames.cjs docs/scorecard/now fights`
  every boss fighting in Practice.
- **References for judges:** `.scratch/ref-clips` (never committed); the panel's lineup and prompt are
  `docs/scorecard/panel/` (`lineup.py`, `prompt.txt`).
- **Boss judge:** `docs/bosses/system.md` section 6; after each round `node tools/boss-judge.cjs` (plot, `FLAT`).
  Before filming a boss's strips, `node tools/body-check.cjs <bossId>` clears every hit (why: "only the weapon
  travels" was the judges' giveaway in 6 of 10 rounds, one round each, and the key poses show it in a second, retro 130).

## Ship and release

- Commit to `main` and push; CI runs on the push.
- A release whenever a pass ships something players notice: `node tools/release.cjs "<title>" "<text>"` (AGENTS.md
  "Release"), commit, push, tag `v*`, push the tag, check that the container workflow started.
- Don't wait on CI after your push; the next pass reads what players get with `node tools/live-check.cjs` (its `BROKEN` line is step 2's Broken).
- After many tests were added or removed, or when one shard runs far longer than the others, refresh the shard
  weights from a green run: `node tools/shard-weights.cjs`, and commit `tests/shard-weights.json`.

## Feedback

Aleix's messages to a pass, and `.claude/feedback.md` (append-only; each entry dated). Commit new entries in step 1.
Replays: `node tools/replays.cjs` in step 1 appends Aleix's new replay notes (pinned at moments of recorded
multiplayer runs) to `.claude/feedback.md` and prints the last week's run summaries (what downs players, which boss
attacks land most, picks, time per fight): read it when choosing balance or boss work.
