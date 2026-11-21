# Two tracks at once

Read by a pass that runs in a worktree, when `PLAN.md` runs two tracks (moved from `.claude/iterate.md`, retro 105).


`PLAN.md` runs two tracks at once, so the loop chat keeps two passes running, each in its own git worktree
(`isolation: "worktree"`). Never more than two. Feedback and clean-up go first and may take either slot.

- `STATE.md` "Now" has one line per slot. Edit only your own line and your own rows elsewhere. Pull right before you
  commit it.
- **Worktree setup:** `node_modules` isn't checked in. Junction it from the main checkout:
  `cmd /c mklink /J node_modules C:\Users\Aleix\Documents\CLAUDE\3d-souls-low\node_modules`, and the same for
  `server\node_modules`. The capture scripts live in the main checkout's `.scratch/`; copy the ones you need into your
  worktree's `.scratch/`. Serve on a free port (8124 or 8125), not 8123.
- **One browser at a time, across both passes.** This covers screenshots and browser tests (`solo-browser.cjs`, the
  `*-browser.cjs` tests, `tools/ability-clips.cjs`). Use the script, never `mkdir`/`rm` on the lock folder by hand:
  `node tools/browser-lock.cjs run <pass> -- node tests/solo-browser.cjs "<filter>"` waits for the lock, runs the
  command and releases it, even on failure. To hold it across several commands: `take <pass>` (a 20-minute lease a
  keeper process beats for; `renew <pass>` extends it), then `release <pass>` once Edge is closed. Wait on it with a
  foreground command (it polls itself), not by ending your turn. It takes over a lock only when its holder's
  process is gone and its heartbeat stopped a minute ago, and it never breaks a lock without a heartbeat (why: pass
  108 deleted another pass's lock and pass 118 overwrote pass 117's under a bare 30-minute age rule, fixed in
  pass 119). `node tools/browser-lock.cjs status` shows who holds it.
- **Ship:** commit on your worktree branch. Then `git fetch` and `git rebase origin/main`. If the incoming commits
  touch the same files, re-run your tests. Bump the version only now (`node tools/release.cjs`), push with
  `git push origin HEAD:main`, and then tag. If the push is rejected, drop the bump commit, rebase, and run it again.
  At the end your work is on `main`; leave the worktree itself to the loop chat.
- **Loop chat, removing a finished worktree:** first unlink the junctions with `cmd /c rmdir <wt>\node_modules` and
  `<wt>\server\node_modules`. Never let a recursive delete follow them into the main checkout. Then run
  `git worktree remove --force <wt>` and delete its branch.

