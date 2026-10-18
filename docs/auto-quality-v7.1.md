# Measured Auto graphics — v7.1

The previous selector timed an unrelated full-screen shader, multiplied its score by pixel count, and used browser-reported CPU threads/RAM as hard gates. Those signals could deny Ultra on a capable dedicated GPU without measuring a game-like frame. Masked or unrecognized GPU names were also permanently capped at High.

Auto now renders a detached 3D scene with real player, enemy and boss models, native textures, 72 scenery props, eight lights, particles, HDR, four-sample MSAA, bloom and metal reflections. The Ultra candidate also renders a 2048px moon shadow and representative depth/normal and screen-light work. It uses the candidate’s actual viewport/render scale/pixel-ratio cap; the result is never multiplied by pixels afterward.

The benchmark warms shaders, textures and framebuffers first. It then times five batches of four frames, synchronizing GPU completion at each batch, and uses the median batch cost per frame. One scheduling/readback stall therefore does not dictate the recommendation. A 14 ms rendering budget leaves headroom relative to a 60 Hz frame interval; this is a representative render test, not a guarantee for every crowded level or combat encounter. Its screen lighting approximates Ultra’s workload rather than reproducing every production lighting calculation, and simulation/AI are not benchmarked.

Known weak/software renderers still start on Low; modern integrated families can earn High. Dedicated GPUs and unrecognized/masked adapters must pass the measured test to earn Ultra. Browser CPU-thread and memory hints are retained for diagnostics but do not cap the result. If Ultra is too slow or fails, High is measured separately; if neither passes, Low is selected. Manual selections remain authoritative.

The test constructs no Player/Enemy actors, starts no level and writes no story/save state. Temporary rigs are removed and disposed, and the renderer’s target, viewport, scissor, clear state and shadow settings are restored. Results remain in memory. Options → Check graphics again displays the detected adapter, per-preset times/budgets and decision reason, including failures.

Final local headless Edge test on an RTX 5060 at a 1920×1080 CSS viewport and display ratio 2 (3840×2160 Ultra buffer) selected **Ultra**. Median cost was **3.825 ms/frame**, with batch results 3.45 / 3.475 / 3.825 / 4.225 / 8.85 ms/frame; the median rejected the isolated slower batch. This is the reflection-inclusive workload.

Validation: 264/264 game tests passed. Final targeted validation passed all six Auto tests (including successful and failed renderer cleanup), plus 13/13 first-launch fixtures. Fixtures cover a fast RTX with limited CPU/RAM hints, a fast masked adapter, real High fallback, both presets over budget, hardware Low, explicit rechecks and manual settings. Release/cache-key equality is checked too.

Reproduce the browser measurements with the existing optional Playwright/Edge runner: `AUDIT_DPR=2 node tests/performance.cjs <output-directory> AUTO`. It records the detected GPU, actual per-preset sizes, frame batches, errors and recommendation reason in `auto.json`. The runner remains outside the game runtime.

The repeatable final audit selected Ultra at both 2560×1440 and 3840×2160 render sizes, measuring approximately 2.2 and 2.1 ms/frame respectively on this run. Each measured Ultra frame issued 502 draws and 276,126 triangles across its passes. Differences across runs reflect clocks, driver scheduling and cache warm-up; these values are not whole-game FPS. Raw samples, dimensions and decision reasons are in [auto-quality-v7.1-results.json](auto-quality-v7.1-results.json).
