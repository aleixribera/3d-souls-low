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

## The numbers

- **1% low / 0.1% low**: the average frame rate of the slowest 1% / 0.1% of frames.
- **hitches per minute**: frames over 33 ms (a missed frame at 30 fps) and over 50 ms. A hitch is attributed to a new
  shader program, a new texture or new geometry on the GPU in its frame (or the next), else "none" (script, GC).
- **GC** (`--gc`): main-thread garbage-collection pauses from a Chromium trace of each play scene: count, total, longest.

Results, one row per change: [results.md](results.md).
