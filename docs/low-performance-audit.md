# LOW performance and loading

18 October 2026. LOW now uses `renderScale: 1` instead of `0.75`, retaining its one-pixel-ratio cap. At a 1280 × 720 viewport this restores 1280 × 720 rendering from 960 × 540: 78% more pixels. Its existing model detail, texture sizes, lights, vegetation and particle counts are preserved.

## Changes

- Reuse untinted procedural surfaces across colour variants. The CPU cache is capped at 4 MiB in each baking context. Noise interpolation skips unnecessary modulo operations and reuses integer corner calculations. Colours, roughness, height and alpha remain byte-identical to the previous baker.
- Pack height into red and roughness into green of one shared texture, the channels Three.js actually reads. Different tints share this map. No texture downsampling or lossy compression is involved.
- KIT vertices have weights `1,0,0,0`. Their material shaders fetch one bone matrix instead of four. Living characters skip death-dissolve noise; the dissolve still runs during death.
- LOW warms the default framebuffer through a 32 × 32 viewport, retaining the normal output shaders. All actors, distant enemies, hidden boss phases and required projectile pool slots are still drawn/uploaded before loading ends. The full viewport and visibility are restored afterward.
- Spectral weapons, flame jets, sigils, death spheres and projectile looks are prepared on every preset. Previously some of this preparation was Ultra-only or happened on the first shot.
- Keep unused post-processing targets tiny on LOW and release Ultra depth/lighting targets when switching away. LOW menu preparation concentrates on the player instead of constructing every unselected boss. The complete selected level cast is still built synchronously before gameplay.
- Count level construction toward the loading card's existing hold instead of adding another 1.4 seconds afterward. Long loads keep a 0.1-second ready hold and the existing fade. Story chapter title timing is preserved.
- Use a stable release stamp for scripts instead of invalidating every script URL on every page refresh. Bump `LOAD_STAMP` for a release.

## Measurements

Edge, RTX 5060, DPR 1, 1280 × 720. These are development-machine measurements, **not an integrated-GPU performance guarantee**. The old implementation was also tested with its render scale forced to 1 for an equal-resolution comparison. Each run starts with fresh in-memory caches and visits the listed scenes in order; later scenes reuse textures from earlier scenes. Construction timings exclude the loading-card hold/fade and downloads.

| Scene | Previous construction, native | Updated construction, native | Previous / updated texture objects |
| --- | ---: | ---: | ---: |
| Long Hall | 4,422 ms | 3,995 ms | 153 / 103 |
| Sunken Keep | 251 ms | 216 ms | 172 / 113 |
| Burning Town | 2,013 ms | 1,533 ms | 281 / 177 |
| Final Castle | 4,958 ms | 3,923 ms | 595 / 350 |
| Margit | 1,868 ms | 1,274 ms | 586 / 329 |
| Godrick | 1,265 ms | 1,611 ms | 625 / 347 |
| Radagon | 678 ms | 1,217 ms | 643 / 355 |
| Maliketh | 781 ms | 677 ms | 667 / 368 |
| Malenia | 733 ms | 736 ms | 697 / 382 |

The original 75% preset was measured separately: Burning Town took 2,078 ms and Final Castle 5,339 ms. The updated full-resolution loads took 1,533 ms and 3,923 ms, about 26–27% faster in that comparison, before the reduction in additional loading-card wait.

Texture object counts fall by roughly 33–45% across these scenes. These counts are not a VRAM measurement. The updated run retains more effect geometry and shader programs at startup because those effects are now prepared before combat. Godrick and Radagon therefore have longer construction times, despite cheaper texture baking. Retries remain about 10–47 ms of construction, with more preparation than previously.

Equal-resolution median GPU samples are broadly comparable and mixed: Long Hall 4.13 → 3.71 ms, Final Castle 3.80 → 3.70 ms, Godrick 2.90 → 3.17 ms. No general FPS improvement is claimed from this discrete-GPU sample. Native resolution increases raster work relative to the old 75% preset; memory sharing and simpler character shaders target the cost elsewhere without reducing quality.

Raw results are in [low-performance-results.json](low-performance-results.json).

## Verification

- v6.2 release validation: the complete browser suite passes 230/230 checks with the final story boss balance and native-resolution LOW preset. All 162 texture fingerprints also match exactly. The final browser report is saved in `.scratch/story-boss-final/tests.json`.
- Full browser suite: 227/227 checks passed before concurrent story additions. With those additions, the later run passed 226/227; its Bell Warden range-selection check also fails with the original rendering/loading code plus the story edits. The LOW-specific checks pass. The failure and both runs are recorded in the JSON; story combat was left to its concurrent edit.
- 162 baseline texture fingerprints match exactly, covering every recipe, multiple tints/decays, transparent fabrics and native-size samples. Repeated samples check that cached source data is not mutated.
- Browser checks cover native LOW resolution, dormant render targets, all model skin weights, packed texture channels, full level enemy creation, boss effects ready at load completion, and a complete projectile barrage without new texture baking or geometry uploads.
- Gameplay captures were inspected at full resolution. No enemies or attack effects were moved into a background gameplay-loading queue.

## Reproduce

With Node, Playwright and Edge available:

```text
node tests/textures.cjs
node tests/performance.cjs <output-directory> LOW
node tests/performance.cjs <output-directory> ALL
```

Set `AUDIT_QUALITY=low` to skip automatic preset detection during the audit. `AUDIT_ROOT` can select a preserved baseline source tree; `AUDIT_NATIVE=1` forces that baseline's LOW render scale to 1. The runner writes loading/GPU/CPU measurements, browser errors and screenshots. It adds no runtime dependency to the game.
