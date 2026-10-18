# HIGH graphics review

18 October 2026 · current v6.2 source · report and proposals only

## Assessment

HIGH is a working middle preset, but its identity is uneven: it uses LOW's model detail and legacy combat effects alongside ULTRA's base scenery density, eight stage lights, richer surface shading and HDR post-processing. ULTRA then adds its lighting system, anatomy/detail and modern effects as one large switch.

HIGH has already inherited the shared v6.1/v6.2 optimizations. Indexed model buffers, used-material filtering, packed/shared texture maps, faster procedural baking, rigid skinning, the living-character dissolve optimization, pre-game actor/effect preparation, deferred disposal within the load, stable script URLs and the shorter additional loading-card hold apply here too. Its preset definition being unchanged does not mean its implementation missed those improvements.

## Current comparison

| Feature | LOW | HIGH | ULTRA |
| --- | --- | --- | --- |
| Render scale | 100% | 100% | 100% |
| Pixel-ratio cap | 1 | 1.5 | 2 |
| Scene MSAA | None | 4 samples, hardware permitting | 4 samples, hardware permitting |
| HDR post-processing | Direct render | Bloom, output/tone mapping, colour grade | HIGH path plus Ultra lighting/composite |
| Bloom | Off | Configured half-size input | Same base setting as HIGH |
| Grade/vignette/grain | Off | On; grain 0.03 | On; grain 0.015 |
| Stage point-light budget | 4 | 8 | 8, plus its fixed impact light |
| Weathered world surfaces | Dominant-axis texture projection, no relief | Three-axis blending and nearby relief | Same base surface shader as HIGH |
| Flame halos / floor light pools | Hidden | Visible | Visible, plus procedural fire and volumetric lighting |
| Ambient particle / grass fraction | 25% | 100% | 100% |
| Bonfire ember fraction | 50% | 100% | 100% |
| Decorative shafts / falling debris | Disabled | Enabled where the level requests them | Enabled, plus shadow-aware moon shafts |
| Model geometry multipliers | 1 | 1 | Enemy 1.25; player/boss 1.6; sculpted core anatomy |
| Model textures | Native 256/512px | Same native sizes | Same native sizes |
| Real-time moon shadow | No; character blob shadows remain | No; character blob shadows remain | One 2048px moon map |
| Screen-space ambient occlusion | Off | Off | Half-resolution, 12 samples |
| Volumetric point lighting | Off | Off | Up to four fog lights; 12-step moon shafts |
| Level-derived metal environment reflections | Off | Off | On |
| Combat particles / trails | Legacy bursts and trails | Same legacy system | Pooled streaks/blood, ribbons, elemental impacts, auras and refraction |
| Required enemies, phases and attack assets prepared before play | Yes | Yes | Yes |
| Warm-up rendering | Tiny viewport | Full post-processing path at the current size | Full Ultra path at the current size |
| Menu model preparation | Player-focused | All model definitions | All model definitions at Ultra detail |

The particle fraction above describes ambient fields, smoke and decorative density. It does not mean LOW quarters every combat burst. The stage-light budget also excludes legacy boss-effect lights on LOW/HIGH.

All presets use `renderScale: 1`; their different pixel-ratio caps still change render size on high-DPI displays. For a **1280 × 720 CSS viewport**:

| Display pixel ratio | LOW buffer | HIGH buffer | ULTRA buffer |
| --- | --- | --- | --- |
| 1 | 1280 × 720 | 1280 × 720 | 1280 × 720 |
| 2 | 1280 × 720 | 1920 × 1080 | 2560 × 1440 |

At display ratio 2, HIGH renders 2.25 times LOW's scene pixels, before MSAA, extra surface work and post-processing. That is a pixel-count comparison, not a claim that the entire frame costs 2.25 times as much.

The bloom implementation halves the configured bloom size internally again: its first blur target is quarter scene width/height at the current `bloomScale: 0.5`. Bloom is already comparatively conservative.

## Specific issues

1. **HIGH's hero geometry is identical to LOW's.** Shared premium kit remakes are present in both, but HIGH has no intermediate model-detail choice. The current anatomy decision is also tied to geometry multiplier being greater than 1, so increasing detail is not a purely gradual subdivision change.
2. **Modern effects are coupled to the expensive Ultra renderer.** `ultraFx` and `ultraBoss` both use `ultraPost.on()`. Giving HIGH modern sparks or elemental impact visuals currently also enables shadows, AO, volumetrics, reflections and the Ultra model setting. Merely setting `high.ultra = true` would erase the intended separation.
3. **HIGH's loading path still renders at full size.** It prepares all required actors/effects correctly, but does not get LOW's tiny-viewport warm-up. Menus also work through unselected model definitions, which can compete with promptly starting a selected level.
4. **Its grain is stronger than ULTRA's.** The 0.03 versus 0.015 setting is a visible style mismatch, not a meaningful performance optimization.
5. **Auto's benchmark does not represent HIGH's complete cost.** Integrated GPUs are capped at HIGH, not guaranteed HIGH: the shader benchmark can still select LOW. That benchmark exercises a full-screen shader, rather than actual skinned characters, stage lights, HDR targets and MSAA.
6. **Legacy effect lights merit combat profiling.** HIGH retains the per-effect lights in spectral weapons, flame jets and sigils. Their group visibility can change the active light count. Geometry being ready does not alone prove every resulting shader/light combination has no first-use cost.

## Fresh measurements

The review exercised 24 combinations: four scenes, three presets and two display pixel ratios. Each used a 1280 × 720 CSS viewport, a fresh browser context per preset/ratio, the normal level culling after 12 simulation steps, eight settling renders and 48 sampled renders. The initial camera view was held during sampling. GPU values below are median GPU query durations, not whole-frame times or measured FPS. Hardware was an RTX 5060 in headless Edge; these results do not establish integrated-GPU performance or late-phase combat costs. All cases completed without browser errors.

| Scene | LOW GPU ms, DPR 1 | HIGH GPU ms, DPR 1 | ULTRA GPU ms, DPR 1 |
| --- | ---: | ---: | ---: |
| Long Hall | 3.54 | 4.40 | 4.67 |
| Burning Town | 3.59 | 4.03 | 5.30 |
| Final Castle | 3.78 | 4.65 | 5.26 |
| Godrick | 2.94 | 3.60 | 4.35 |

At equal 1280 × 720 buffers, HIGH used roughly 13–24% more GPU time than LOW in these sampled initial views. ULTRA used roughly 6–31% more than HIGH. The latter also incurs more scene submissions and CPU work: in the Final Castle view, total draw calls across all passes were 331 / 393 / 683 for LOW / HIGH / ULTRA.

| Scene | LOW GPU ms, DPR 2 | HIGH GPU ms, DPR 2 | ULTRA GPU ms, DPR 2 |
| --- | ---: | ---: | ---: |
| Long Hall | 3.76 | 4.89 | 5.79 |
| Burning Town | 3.56 | 4.56 | 6.79 |
| Final Castle | 3.98 | 5.27 | 6.77 |
| Godrick | 2.57 | 3.97 | 6.31 |

At display ratio 2 the buffers differ as described above; these rows measure the actual presets, not equal resolution. Driver clocks, program caches and fixed rendering costs also influence the timings, so pixel-count ratios should not be used as frame-time multipliers.

The player model was **10,018 triangles on both LOW and HIGH**, and **24,084 on ULTRA**. The measured HIGH/ULTRA first bloom blur targets were 320 × 180 at DPR 1, confirming that bloom is already downsampled considerably. HIGH's main target was full scene size with four MSAA samples.

Raw GPU/CPU measurements, render sizes, draw calls, model detail, target sizes, construction times and errors are saved in [high-quality-results.json](high-quality-results.json). Construction numbers are observations of this sequential run; cross-preset driver cache reuse means they are not a controlled cold-loading ranking.

## Recommended direction

Make HIGH the balanced preset with the current art style and modern combat feedback, while keeping the expensive scene-lighting features exclusive to ULTRA.

### First: preserve the current appearance and remove overhead

- Keep `renderScale: 1`, the existing eight stage lights, full surfaces, full scenery, native texture sizes, half-size bloom and 4-sample scene MSAA.
- Give HIGH a small warm-up render path that still uploads every required actor, hidden phase and attack asset and prepares the actual post-processing shaders before gameplay. Avoid temporarily resizing the live full-size pipeline repeatedly just to warm it.
- Prepare the player and selected content while menus/loading are visible, rather than every unselected boss. Complete all selected-level preparation before play; do not introduce gameplay streaming.
- Investigate combining output/tone mapping and the final grade into one full-screen pass, preserving their current colour-space order. Also investigate restricting MSAA storage/resolves to the scene stage rather than multisampling downstream post targets.

### Second: give HIGH a visible identity between the other presets

- Decouple `modelDetail`, `combatFx`, `proceduralFire`, `reflections`, `shadows`, `ao` and `volumetrics` from the single `ultra` flag. Each preset should choose these independently.
- Trial player/boss geometry at **1.25**, ordinary enemies at **1.0**, textures at **1.0**. This is an unmeasured starting point, not an asserted optimal setting. Separate anatomy choice from subdivision so the result can be reviewed deliberately. Keep ULTRA's current 1.6 player/boss detail above it.
- Bring modern pooled sparks, blood, weapon ribbons and elemental attack identity to HIGH with lower particle/ribbon/impact-light budgets than ULTRA. Keep attack shapes, timings and warning visibility intact; reduce decorative density and lingering particles first. Procedural fire can be trialled independently because many overlapping flames can still be expensive.
- Trial ULTRA's cached per-level metal environment on HIGH while leaving real-time shadows, AO, volumetric lighting and screen-space shockwave refraction off. The environment can improve armour/weapon readability without those extra scene passes, but it still needs a GPU measurement.
- Match HIGH's grain to ULTRA's **0.015**, or make grain an independent user preference.

### Resolution and targeting

Retain the current 1.5 pixel-ratio cap for a first pass that preserves existing HIGH sharpness. Offer a separate resolution/pixel-density control if a cheaper HIGH option is desired. Setting that cap to 1 on high-DPI screens would save substantial raster work, but visibly reduces supersampling; it should be an explicit tradeoff, not described as a free optimization or hidden dynamic resolution drop.

After the above changes, calibrate Auto using a short representative rendered scene and test demanding boss effects, not only idle views. A 60 FPS target can guide the work, but needs validation on the intended midrange and integrated GPUs; an RTX benchmark cannot establish that target for them.

## Source locations

- `js/config.js`: preset values, grain, Ultra feature tuning.
- `js/visuals.js`: base HDR pipeline, world surface shaders, warm-up and resize.
- `js/bodykit.js`: geometry/anatomy selection, rigid skinning and menu prewarm.
- `js/textures.js`: shared packed maps and procedural baking.
- `js/ultra-post.js`: shadow/AO/volumetric/reflection controller and model-detail switching.
- `js/ultra-fx.js`, `js/ultra-boss.js`: modern effects gated on the Ultra renderer.
- `js/autoquality.js`: preset detection and GPU-name caps.

No graphics preset or game runtime code was changed for this review.
