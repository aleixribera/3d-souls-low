# Iterate: Combat Arena 3D

The loop file for the `iterate` skill. Where it differs from the skill, this file wins.

## Vision

- `VISION.md`: what the game is, in Aleix's words. Wins over everything, this file included.
- `.claude/feedback.md`: Aleix's bugs, complaints and ideas. They come first.
- `~/.claude/CLAUDE.md`: Aleix's standing rules (real Blender models, Claude-only textures, no stock-AI UI, ship without asking).
- Everything else agents wrote (`AGENTS.md`, `STORY.md`, docs, notes) is a draft, not a rule.

## Plan

`PLAN.md` (written by the director chat): the order of work, two tracks run in parallel (two passes at a time, each in
its own worktree), and each item's check. Cuts and finds go to `BACKLOG.md`.

## Notes

The shared files, all at the repo root unless named otherwise. A pass orients from these. Aleix is the owner; the
director is a separate chat that sets the direction with him and builds nothing.

| File | Holds | Writer |
|---|---|---|
| `VISION.md` | What the game is, its areas and stages. Wins over everything. | Aleix (the director with his OK) |
| `PLAN.md` | The order of work, each item's acceptance check, the answers to "Needs Aleix". | The director |
| `STORY.md` | The story: part one is what is in the game (every in-game text agrees with it), part two where it is going. | The director with Aleix; a pass moves a piece into part one when it ships |
| `STATE.md` | Now, what works, broken, queued runs, `wip/` branches, Needs Aleix. Cap 8,000 characters. | The loop |
| `BACKLOG.md` | Work the loop cut, found or deferred, for the director to promote. | The loop |
| `.claude/feedback.md` | Aleix's bugs, complaints and ideas, append-only and dated. | Aleix; the loop marks the pass that took one |

Other notes:
- No per-release or per-model docs: the commit message holds the details, and the in-game changelog
  (`js/data/changelog.js`) is the one changelog. A model's notes are its `tools/blender/<name>.py` header.
- Third-party assets: none so far; any would be logged in the header of the file that uses it.

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
- A release whenever a pass ships something players notice (`PLAN.md`): the four version spots (AGENTS.md
  "Release"), `npm install --package-lock-only` at root and `server/`, one entry in `js/data/changelog.js`, then tag
  `v*` and push the tag. Check the container workflow started.

## Two passes at a time

`PLAN.md` runs two tracks at once, so the loop chat keeps two passes running, each in its own git worktree
(`isolation: "worktree"`). Never more than two. Feedback and clean-up go first and may take either slot.

- `STATE.md` "Now" has one line per slot. Edit only your own line and your own rows elsewhere. Pull right before you
  commit it.
- **Worktree setup:** `node_modules` isn't checked in. Junction it from the main checkout:
  `cmd /c mklink /J node_modules C:\Users\Aleix\Documents\CLAUDE\3d-souls-low\node_modules`, and the same for
  `server\node_modules`. The capture scripts live in the main checkout's `.scratch/`; copy the ones you need into your
  worktree's `.scratch/`. Serve on a free port (8124 or 8125), not 8123.
- **One browser at a time, across both passes.** This covers screenshots and browser tests (`solo-browser.cjs`, the
  `*-browser.cjs` tests). Before opening Edge, take the lock:
  `mkdir C:\Users\Aleix\Documents\CLAUDE\3d-souls-low\.scratch\browser.lock`, then write your pass number into
  `owner.txt` inside it. If `mkdir` fails, the other pass holds it: wait with `Monitor` until the folder is gone. A
  lock older than 30 minutes is stale, so take it. Remove the folder as soon as Edge is closed.
- **Ship:** commit on your worktree branch. Then `git fetch` and `git rebase origin/main`. If the incoming commits
  touch what you changed, re-run your tests. Bump the version only now (the next one after `origin/main`'s
  `VERSION`), push with `git push origin HEAD:main`, and then tag. If the push is rejected, rebase again and bump again.
  At the end your work is on `main`; leave the worktree itself to the loop chat.
- **Loop chat, removing a finished worktree:** first unlink the junctions with `cmd /c rmdir <wt>\node_modules` and
  `<wt>\server\node_modules`. Never let a recursive delete follow them into the main checkout. Then run
  `git worktree remove --force <wt>` and delete its branch.

## Feedback

Aleix's messages to a pass, and `.claude/feedback.md` (append-only; each entry dated). Commit new entries in step 1.

## Machine rules

- Tests at idle priority (the runners do it). Never `ARENA_SOFTWARE_GL=1` locally.
- One browser at a time, closed right after its round of screenshots; pause the game while it is open.
- Stop the dev server before handing over.
- Blender runs headless (`-b`); no windows.
