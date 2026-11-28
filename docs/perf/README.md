# Performance benchmark

`tools/perf-bench.cjs` drives the game the same way every run, on a real GPU, and writes one JSON per run. It measures
what a player feels first: load times, then stutter (1% / 0.1% lows, hitches), then average frame rate. The frame-rate
survey of every level in Firefox is a separate tool (`tools/bench/`).

Run it on the Fedora laptop when it is quiet (`remote-test --status`; the load average goes in the table):

    remote-test --pull .scratch/perf -- node tools/perf-bench.cjs --label <name> --gc

It writes `.scratch/perf/<name>.json` and prints the headline numbers. `--only load,transitions,play,shots,profile`
picks parts; `--size 1920x1080` and `--quality ultra` are the defaults (the living-room TV's resolution, the top preset).
Every run checks the WebGL renderer string: it must name the laptop's Intel GPU, never SwiftShader or llvmpipe.

## What it measures

- **load**: three cold loads (a fresh browser context, empty cache) at full speed, three over a throttled link
  (40 ms round trip, 50 Mbit/s: a friend at home), and three warm loads (the same context again, everything cached).
  Each from navigation to the title's first drawn frame, with the phases between: HTML, Three.js loaded, every game
  script fetched, all scripts run (`ready`), first frame; the requests, bytes and longest main-thread task.
  The page is served by the game's own server (`server/index.cjs`: gzip, immutable versioned scripts), over HTTP/1.1
  on localhost. Players come in through Tailscale Funnel (HTTPS, HTTP/2), so the throttled numbers overstate the cost
  of many small requests.
- **transitions**: from the title through the game's own loading screen into a big area (the Final Castle), the
  Church in the Pass, a boss duel (the King's Blade), the big area again (a repeat visit), and Boss Rush alone (lobby,
  then the run). For each: the build's main-thread time, the time until playable, the shader programs and textures on
  the GPU, and every frame of the first 4 s after the screen lifts.
- **play**: real-time play with every frame timed: the title (the hub) for 10 s; the Final Castle walked forward for
  25 s with the camera swept left and right; the showcase (three Boss Rush bosses at a late run's pace, abilities and
  ultimates, a seeded scripted fight, two fades between fights). Frames are not capped (`--disable-gpu-vsync
  --disable-frame-rate-limit`), so a frame's time is its own cost.
- **shots**: fixed scenes on a hand-stepped clock and a seeded random, the same camera each run, saved as PNGs for
  before/after comparison.
- **profile** (on request): a sampled CPU profile of a warm load and of two builds, the top functions by self and
  total time. This is what decided the order of the fixes.

## The gauntlet: is it a locked 60?

Aleix's bar (22 November 2026): a locked 60 fps on the Fedora laptop's integrated graphics (Intel RPL-P) through a
demanding benchmark, at 1080p, with no visual cut. **Locked 60 = the 1% low at or above 60 fps over the whole
gauntlet (99% of frames within 16.7 ms), the 0.1% low close to it, and no frame over 33 ms after loading.** The
gauntlet is that benchmark. Do not shorten it, lighten it or drop a part to pass it.

    remote-test --pull .scratch/perf -- bash tools/perf-headed.sh --label <name> --only gauntlet --quality normal --spikes

It runs headed, fullscreen on the laptop's own display (eDP, 1920x1080 at 60 Hz, device scale 1, Chrome's ANGLE on
OpenGL ES; Vulkan does not start a headed window on Wayland), so every frame is a real presented frame with vsync on.
`perf-headed.sh` wakes the screen, keeps it awake for the run and prints the load average. The preset is Normal:
what Auto picks for this GPU, and the preset meant to hold 60 on integrated graphics. In order, without a pause:

1. **The busiest area**: the Final Castle (47 placements, the most enemies of any level), entered through the
   game's loading screen, then 40 s fought through: W held, a light attack every 0.45 s, a heavy every 2.1 s, the
   camera swept left and right, the player unkillable until the death at 24 s, then the death sequence, the respawn
   at the bonfire (the whole cast rebuilt) and on.
2. **Fire everywhere**: the burning town, entered the same way, fought through for 20 s.
3. **Boss Rush, four players**: the lobby, the run started, three of the lobby's own bot players added (real
   co-op bodies, frames from the server), 40 s locked on the boss and attacking.
4. **The showcase**: three late-run bosses with abilities, ultimates and two cuts between grounds, started as the
   title's Tutorial starts it (its setup under the loading screen), to the end (at most 120 s).

Frames while the game's loading screen is up are not counted (the screen is the wait); everything after it lifts
is, including the first sight of every effect and boss. `--spikes` writes a CPU profile of each part
(`<name>-<part>.cpuprofile`, opens in DevTools) and, per frame over 25 ms, what ran.

## The visual check: numbers count only from a build that draws right

A perf change that draws less is not a perf win. On 22 November 2026, two of my changes broke the picture while the
numbers improved: the player's body was not drawn (a matrix walk skipped skinned meshes' bind matrices), and the
ambient-occlusion buffer was shrunk to 32x32 (a render target clone shares its texture image), drawing dark slabs over
everything. Every number from those builds was thrown out, and the gauntlet now checks the picture first.

`--only gauntlet` (or `shots`) takes six fixed shots: three levels, a fight, two showcase moments. Each one is
hand-stepped, with the game clock, the wall clock (`performance.now`, which sway, flicker and shader time read) and
`Math.random` all seeded. three.js object uuids draw from a separate stream, so a build that makes one object more or
fewer doesn't shift the fight's randomness. Each shot is compared with `docs/perf/baseline/<quality>/<name>.jpg` at
960x540: the mean difference over the frame, and the worst 32x32 block's. A shot over either limit fails the run
(exit 4, "VISUAL CHECK FAILED") and writes `compare-<name>.jpg` next to the shots: baseline, this build, and a heat map
with the blocks over the limit in red. Look at it.

Calibration (Normal, headed on the laptop, mean / worst block):

| build | worst shot | verdict |
|---|---|---|
| main against its own baseline | 2.69 / 7.0 | pass |
| the fixed build | 2.69 / 8.2 | pass |
| player body not drawn (e4b4ded) | castle 2.66 / 26.5, church 4.99 / 162.9 | all six fail |
| AO buffer at 32x32 | mean 15-23 on every shot | all fail |

The limits are a mean of 4 and a worst block of 15: about twice the noise, about half the smallest real fault.
A deliberate visual change makes a new baseline: `--only shots --save-baseline` on the new build, after looking at
every shot. Commit the baseline in the same change.

## The numbers

- **1% low / 0.1% low**: the average frame rate of the slowest 1% / 0.1% of frames.
- **hitches per minute**: frames over 33 ms (a missed frame at 30 fps) and over 50 ms. A hitch is attributed to a new
  shader program, a new texture or new geometry on the GPU in its frame (or the next), else "none" (script, GC).
- **GC** (`--gc`): main-thread garbage-collection pauses from a Chromium trace of each play scene: count, total, longest.

Results, one row per change: [results.md](results.md).
