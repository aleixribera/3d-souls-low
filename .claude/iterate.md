# Iterate: Combat Arena 3D

The loop file for the `iterate` skill. Where it differs from the skill, this file wins.

## Truth file

- `AGENTS.md`: the project guide, architectural rules and invariants.
- `LORE.md`: the story. Every look, name and line agrees with it.
- `~/.claude/CLAUDE.md`: Aleix's standing rules (real Blender models, Claude-only textures, no stock-AI UI, ship without asking).

## Order of work

Stage 1, **every character a Blender model** (the line of work since v7.21.0). One character per pass, by how often the
player meets it (placements across `js/levels/`, counted with `enemy: '<id>'`):

1. ~~Wanderer, Hollow Soldier, Ashen Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden~~ (v7.21–v7.27)
2. Rampart Bowman (`rampartBowman`: bowman 11 + castleBowman 12)
3. Beastman of Farum Azula (`beastman`, 13)
4. Toll Wisp (`tollWisp`, 12)
5. Grafted Scion (`graftedScion`, 9)
6. Ash Executioner (`ashExecutioner`, 7), Crucible Squire (`crucibleSquire`, 7)
7. Iron Shover, Omenkin, Leyndell Knight, Gargoyle (6 each)
8. Empty Sentinel, Golden Zealot, Ashen Warrior (5); Varn, Cleanrot Knight (4)
9. Then the Ashmere bosses, then the Elden Ring bosses (`MODEL_DEFS` in `models-bosses.js`, `data/bosses/*.js`; budget 14,000).

A model counts as done when it is a baked piece per bone, inside its budget, its look follows LORE.md and its old brief
(the comment on its `MODEL_DEFS` entry), and it is checked in the model lab and in a level. After stage 1: the weakest
area by Aleix's feedback.

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
