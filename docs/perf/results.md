# Perf results

One row per measured build. The gauntlet (`docs/perf/README.md`): Normal preset, headed on the Fedora laptop's Intel
RPL-P iGPU, 1920x1080 fullscreen, vsync on, every presented frame counted after the loading screen. Only builds
that pass the visual check count. Numbers from 6e9b7ac to e4b4ded drew wrong (the player's body missing, and later the
AO buffer at 32x32), so they were thrown out on 22 November 2026.

## Gauntlet, whole run (about 2 min of play)

| date | build | visual | avg fps | 1% low | 0.1% low | worst frame | frames over 33 ms | load avg (1 min) |
|---|---|---|---|---|---|---|---|---|
| 2026-11-22 | main 92d6558 | pass | 59.2 | 25.2 | 4.8 | 733 ms | 21 | 5.39 |
| 2026-11-22 | branch 25bc84c (main merged) | pass | 59.8 | 46.9 | 21.8 | 67 ms | 15 | 2.00 |

## By part (1% low / 0.1% low / worst frame)

| part | main 92d6558 | branch 25bc84c |
|---|---|---|
| Final Castle, entered | 30 / 30 / 33 ms | 59.9 / 59.9 / 17 ms |
| Final Castle, 40 s with a death and respawn | 27.6 / 6.3 / 233 ms | 47.8 / 20 / 50 ms |
| Burning town, entered | 60 / 60 / 17 ms | 59.5 / 59.5 / 17 ms |
| Burning town, 20 s | 51.2 / 30 / 33 ms | 59.5 / 59.5 / 17 ms |
| Boss Rush, four players, 40 s | 49.4 / 24 / 50 ms | 53 / 29.9 / 33 ms |
| Showcase, to the end | 11.7 / 1.8 / 733 ms | 35.1 / 17.2 / 67 ms |

## Not a locked 60 yet: what is left

- **The laptop itself misses a frame every 10-40 s.** A near-empty WebGL page (`tools/.probe/idle-frames.cjs`, same
  browser flags, fullscreen) drops single frames to 33 ms at whole multiples of 10 s (9.8, 39.8, 49.8 s into a 65 s run).
  Main shows the same rhythm. Of the branch's 15 frames over 33 ms, 5 fall on that 10 s beat
  (Boss Rush 2.4 / 12.4 / 22.4 s, the castle 3.5 / 13.5 s). The game can't remove these. Candidates to try on the
  machine: the eDP panel's self refresh (PSR, `i915.enable_psr=0`, needs root), and Firefox and btop being open
  during runs.
- **The showcase's first frames and its cuts:** 4 frames at 2.5-2.7 s, 67 ms at 10.0 s, 50 ms at 17.5 s. They have no
  new shader programs, so the next suspects are geometry uploads and the cut's scene swap.
- **The castle's respawn:** one 50 ms frame when the whole cast is rebuilt (28.9 s), and one at 5.4 s.
