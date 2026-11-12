# Iterate: Combat Arena 3D

The loop file for the `iterate` skill. Where it differs from the skill, this file wins.

## Vision

- `AGENTS.md`: the project guide, architectural rules and invariants.
- `LORE.md`: the story. Every look, name and line agrees with it.
- `~/.claude/CLAUDE.md`: Aleix's standing rules (real Blender models, Claude-only textures, no stock-AI UI, ship without asking).
- `VISION.md` replaces the first two as the vision once it exists.

## Plan

`PLAN.md` (written by the director chat): the order of work and each item's acceptance check. Cuts and finds go to
`BACKLOG.md`.

## Notes

- `STATE.md` (repo root): Now, what works, broken, `wip/` branches, Needs Aleix. Cap 8,000 characters.
- Per model: `docs/<name>-model-v<version>.md` (what it is, slots, triangles, rebuild command), one line in
  `docs/CHANGELOG.md`, a section in `docs/feature-history.md`, a row in the AGENTS.md "Where things live" table.
- Third-party assets: none so far; any would be logged in the model's doc.

## Build

No build step. A model:

```
blender -b --factory-startup -P tools/blender/run_asset.py -- <stem> --export
node tools/pack-baked.cjs <stem>
```

- Blender 5.2 is on PATH. The figure helpers are `tools/blender/figure_lib.py`.
- The template is the closest finished figure (`rogue.py` for hooded Hollowed, `knight.py` / `warden.py` for plate).
- The preview sheet lands in `tools/blender/out/previews/<stem>.png`. Register the set in `tools/pack-baked.cjs` and the
  file in `GAME_FILES` (after the other `baked/*.js`).

## Test

- Validation runs at load (`js/validate.js`). `npm run test:node` covers data and server checks (fast).
- In-page tests by name: `node tests/solo-browser.cjs "<filter>"` (e.g. `Ultra models`, the enemy's name).
- The full suite runs on CI (four shards) on every push. Don't run it locally.

## See it working

- Serve: `python -m http.server 8123 --bind 127.0.0.1` (or `.claude/launch.json` "static"), open
  `combat-arena-3d.html#dev`, then `MODELLAB.open('<modelId>')` (F9): front, back, side and silhouette.
- If the built-in browser refuses localhost, drive headless Edge over CDP (`--headless=new --use-angle=swiftshader`,
  fresh `--user-data-dir`) and `Page.captureScreenshot`. Close Edge right after.
- Check it in a level too: a frame with the enemy in play (e.g. Level 2 or 3 for the bowman).

## Ship and release

- Commit to `main` and push; CI runs on the push. Stage only this pass's files.
- Every finished model is a minor release (v7.N.0), as v7.21–v7.27 were: the four version spots (AGENTS.md
  "Releasing"), `npm install --package-lock-only` at root and `server/`, the changelogs, then tag `v*` and push the tag.
  Check the container workflow started.

## Feedback

Aleix's messages to a pass, and `.claude/feedback.md` (append-only; each entry dated). Commit new entries in step 1.

## Machine rules

- Tests at idle priority (the runners do it). Never `ARENA_SOFTWARE_GL=1` locally.
- One browser at a time, closed right after its round of screenshots; pause the game while it is open.
- Stop the dev server before handing over.
- Blender runs headless (`-b`); no windows.
