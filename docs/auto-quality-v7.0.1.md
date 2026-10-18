# Auto graphics adjustment — v7.0.1

Auto previously allowed generic integrated graphics to reach High with a shader result up to 24 ms per pass. That was too generous for a low-end laptop, especially once High's MSAA, post-processing, scenery and high-DPI rendering were included.

The selector now requires more headroom:

| Signal | Previous policy | New policy |
| --- | --- | --- |
| High benchmark ceiling | 24 ms | 8 ms, adjusted for High's pixel load |
| Ultra benchmark ceiling | 7 ms | 3 ms, adjusted for Ultra's pixel load |
| Benchmark sampling | One round of six passes | Slowest of three rounds of six passes |
| Older/generic integrated GPU | Up to High | Low |
| Modern integrated GPU (Iris Xe/Plus, Arc Graphics, Radeon 680M/780M/880M/890M/8060S, Apple M) | Generic family cap | At most High, subject to timing |
| Unknown renderer | Up to Ultra | At most High |
| Failed benchmark | Could fall back to High | Low |
| Reported logical CPU threads | Ignored | Fewer than 6: Low; fewer than 8: no Ultra |
| Reported device memory | Ignored | Less than 8 GB: Low |

Software rendering and small touch devices remain capped at Low. Hardware hints are optional: missing CPU or memory values do not count as low specifications. Systems already capped at Low skip the shader benchmark.

Each candidate's timing is multiplied by its actual pixel count relative to a 1280×720 reference, with a minimum multiplier of 1. This uses the candidate's render scale and pixel-ratio cap. For example, at 1280×720 CSS pixels and display ratio 2, High's factor is 2.25 and Ultra's is 4. Smaller windows cannot bypass the minimum benchmark requirements.

This is a conservative heuristic, not a measured FPS guarantee. A shader test still cannot capture every skinned character, crowded scene or boss effect. The thresholds intentionally leave more room for that work. Manual graphics selections remain available and never get overwritten; an existing Auto selection uses the new policy on reload.

The GPU patterns, hardware limits, timing thresholds and reference size live in `CONFIG.VISUALS.autoQuality`. `autoQuality.recommend(sample)` exposes the pure policy for deterministic regression tests. No combat, terrain, movement or save format changed.

Validation covers older laptop GPU names, CPU/RAM limits, modern integrated GPUs, stricter timing thresholds, both pixel-ratio costs, larger viewports, unknown/failed renderer results, unavailable hardware hints and manual overrides. Validation passed: 257/257 browser tests with Auto enabled, plus 8/8 isolated first-launch fixtures (`node tests/autoquality.cjs`). The fixtures verify that fresh and existing Auto settings choose Low on older integrated laptops, limited hardware skips the benchmark, failed timings choose Low, and manual choices are preserved.
