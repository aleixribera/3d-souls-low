# Ultra performance and loading audit

18 October 2026 · v6.1 · implemented changes

Ultra keeps moon shadows, ambient occlusion, volumetric lighting, reflections, procedural fire, weapon ribbons and the elemental boss effects. The changes remove expensive duplication and excess sampling, rather than changing combat or simplifying the game's art direction.

## What changed and why

| Finding | Change | Visual tradeoff |
| --- | --- | --- |
| Two nearby point lights each required a six-face shadow map every frame. | Remove torch cube shadows; retain a directional moon shadow and contact shadows. | Fires still illuminate the scene, but no longer cast separate moving shadows. |
| A 4096px moon shadow covered the same local area as a 2048px map could. | Use a 2048px map with the existing stabilized projection and soft filtering. | Slightly softer shadow edges. One quarter of the shadow texels. |
| Full-resolution bloom and 8× MSAA increased render-target work. | Half-resolution bloom, 4× MSAA; retain native scene resolution and the 2× pixel-ratio cap. | Softer glow; less edge supersampling. No resolution reduction. |
| The lens pass read the full screen repeatedly, including four sharpening taps when sharpening was zero, and up to 36 colour-channel reads for radial blur. | Remove chromatic aberration, sharpening taps and radial blur. Fold flashes and hurt feedback into the existing colour grade. | Cleaner edges and less screen blur; camera motion and shockwaves remain. |
| Geometry subdivision grew quadratically on simple curved parts. | Enemy multiplier 1.8 → 1.25; player/boss 2.6 → 1.6. | Modestly less rounding up close. Sculpted anatomy, model parts, cloth and silhouettes remain. |
| Model merging expanded shared vertices into three independent vertices per triangle. | Preserve indices, bone weights, normals and UVs while merging. | None: the same triangles use less vertex data and repeated skinning. Applies to all presets. |
| Doubled model textures added four times the pixels per recipe, often on very small visible parts. | Use native 256/512px model textures. Skip unused material slots. | Less extreme close-up texture resolution; the recipes and surface detail remain. |
| 12 stage lights, three impact lights and dynamically appearing legacy boss lights increased lighting cost and shader variants. | Eight stage lights, one fixed impact light; hide overlapping legacy attack lights on Ultra. | Less simultaneous lighting from minor sources. Boss glows, fire and impact lighting remain. High restores its legacy lights. |
| AO and fog sampling were generous. | AO 16 → 12 samples; fog lights 8 → 4; moon ray steps 20 → 12. | Slightly coarser indirect effects, still depth-aware blurred. |
| Ambient particles exceeded the original pools' capacity. | Return ambient particle and ember multipliers to 1. | Less background clutter; combat burst counts remain. |
| Whole-scene classification ran every fourth frame. | Refresh when scene roots, root children or weapon sockets change, or on stage/quality changes. | None. New actors and nested projectile/spectral effects are still classified. |
| Particle updates uploaded full-capacity buffers and allocated temporary colour/vector arrays. | Upload live ranges only; skip empty uploads; reuse ribbon samples; remove expired particles in constant time. | None intended. |
| Old trails still updated underneath Ultra ribbons; effects retained references after transitions/respawns. | Stop duplicate trail generation; clear effect ownership and reclaim stale ribbons/glows; release stale reflection references. | None. |

## Loading work

The loader now prepares enemies **after they exist**, before play begins. It temporarily draws every skinned mesh, including distant characters and hidden boss phases, to upload geometry and textures. Ultra also prepares spectral weapons, flame jets, holy sigils and death spheres there. Visibility is restored after preparation.

Old actors leave the scene immediately during a reset, but their materials remain alive until replacement actors finish warming up. This preserves reusable shader programs instead of evicting them immediately before the same shaders are needed again. Old actors are disposed within that same load, including on errors. Static shader compilation is reused when the stage and quality remain the same; new actors are still drawn and prepared on each load.

Background prewarming no longer queues every model's textures immediately or continues superseded geometry jobs after a quality change. It prepares only used slots for each model. Indexed geometry and the smaller native textures reduce both generation and upload work. These savings do not come from shortening the title card or moving required character preparation into combat.

## Measurements

The accompanying `performance-results.json` contains the raw comparison data. Hardware: NVIDIA GeForce RTX 5060, Microsoft Edge headless, ANGLE Direct3D 11. Render benchmarks use a 1280×720 viewport at device scale 2: **2560×1440 actual rendering in both versions**. Forty-eight measured frames follow a short warm-up; the simulation uses its manual clock and a seeded random source.

Rendering results below count all shadow, scene and post-processing submissions. CPU time measures the render call, not total simulation time. GPU queries measure GPU rendering separately; CPU and GPU times must not be added together or converted directly into claimed FPS.

| Scene | Draw calls, before → after | Triangles (millions), before → after | CPU median / p95 ms, before → after | GPU median ms, before → after |
| --- | ---: | ---: | ---: | ---: |
| Tutorial | 319 → 121 | 0.620 → 0.094 | 3.3 / 4.1 → 1.4 / 2.4 | 7.3 → 6.3 |
| Long Hall | 957 → 592 | 1.599 → 0.485 | 7.3 / 11.0 → 3.7 / 4.5 | 8.7 → 6.0 |
| Sunken Keep | 823 → 503 | 1.513 → 0.438 | 6.4 / 7.7 → 2.7 / 3.6 | 7.0 → 6.5 |
| Burning Town | 868 → 497 | 2.761 → 0.605 | 5.4 / 7.7 → 3.2 / 4.1 | 7.2 → 6.7 |
| Tower | 1100 → 737 | 1.584 → 0.424 | 7.4 / 9.2 → 3.7 / 4.6 | 7.9 → 6.8 |
| Final Castle | 798 → 683 | 1.942 → 0.558 | 7.3 / 11.1 → 4.8 / 7.0 | 7.7 → 6.6 |
| Godrick | 272 → 153 | 0.928 → 0.229 | 2.3 / 3.3 → 1.5 / 2.1 | 6.1 → 6.2 |
| Malenia | 221 → 144 | 0.509 → 0.180 | 2.2 / 3.0 → 1.5 / 1.9 | 5.8 → 6.2 |

The clearest measured gains are CPU render time and geometry submission. GPU gains are smaller: the sampled boss arenas were approximately unchanged or slightly slower in median GPU time, despite much less geometry. Headless scheduling and GPU clocks affect these short samples; these results do not establish an FPS gain for every scene.


Loading measures synchronous level/duel construction and warm-up in one fresh browser session, visiting the same levels and opponents in the same order. Shared assets can be warm from earlier visits. These are **first-visit build times in that sequence**, not isolated cold-process timings for every row. The fixed title-card hold/fade, CDN download and browser startup are excluded.

| First visit | Before (s) | After (s) | Less build time |
| --- | ---: | ---: | ---: |
| Tutorial | 9.91 | 3.52 | 64% |
| Long Hall | 10.17 | 1.84 | 82% |
| Sunken Keep | 0.96 | 0.46 | 52% |
| Burning Town | 11.63 | 1.94 | 83% |
| Tower | 3.62 | 1.29 | 64% |
| Final Castle | 15.28 | 5.44 | 64% |
| Margit | 4.69 | 1.46 | 69% |
| Godrick | 4.45 | 1.22 | 73% |
| Crucible Knight | 1.92 | 0.56 | 71% |
| Morgott | 3.53 | 0.96 | 73% |
| Godfrey | 2.93 | 0.81 | 72% |
| Maliketh | 2.86 | 0.80 | 72% |
| Radagon | 2.56 | 0.66 | 74% |
| Malenia | 2.61 | 0.78 | 70% |


Repeat-load timings are included in the raw data. Some reloads can take longer than before because the old warm-up omitted enemies and hidden phases; the new one prepares them before play. This is an intentional tradeoff against first-encounter stalls, not an across-the-board reload speed claim.

### Model geometry

These are actual model triangle counts, independent of the number of rendering passes. The comparison uses identical model designs with the old and new subdivision settings. Indexed merging additionally reduces duplicated vertices; it does not itself remove triangles.

| Model | Old Ultra triangles | New Ultra triangles | Reduction |
| --- | ---: | ---: | ---: |
| hollowSoldier | 13,516 | 8,200 | 39% |
| undeadKnight | 20,208 | 12,856 | 36% |
| ashExecutioner | 22,410 | 13,992 | 38% |
| giantSkeleton | 73,794 | 27,684 | 62% |
| margit | 47,676 | 21,086 | 56% |
| godrick | 81,466 | 33,981 | 58% |
| malenia | 35,003 | 16,763 | 52% |


Close-up front, back, side and silhouette comparisons were inspected for all seven models above. Gameplay views were checked for the tutorial, all five campaign levels, Godrick and Malenia. The most visible intentional differences are fewer fire-cast shadows, softer bloom/shadows and reduced rounding at extreme close range.

## Verification and limits

- The full browser regression suite passes **222/222** checks, including combat, movement, campaign, saving, bosses, quality switching and the new performance/loading checks.
- Added checks cover stable-scene scan counts, first-draw shadow preparation for new actors, absence of cube shadows, live particle upload ranges, mass particle expiry, effect cleanup, model index/attribute validity, integrated flash/hurt feedback, and preparation of boss effects before attacks.
- Loading was exercised for every menu level, regular enemy duel and all eight Elden Ring bosses. Browser error logs were checked.
- The gameplay benchmarks sample the initial part of each level and short duel sequences. They do not certify every camera position or the worst possible late-phase effect storm. GPU timings and loading times vary with clocks, driver caches and other applications; no fixed FPS guarantee is implied.
- Full character pre-upload makes more assets resident immediately. Object counts are not a VRAM measurement, and no measured VRAM saving is claimed.
- Fixed-step combat, AI, hitboxes, stamina, damage, enemy placements, checkpoints and story content were left intact. Existing user edits in the premium kit and boss model definitions were preserved.

## Retained costs and future profiling targets

The depth/normal prepass, AO, moon shadows, metal environment and elemental effects remain because they make a clear visual contribution. Procedural geometry/texture caches remain so levels do not regenerate shared assets on every visit.

Static level meshes are merged by material, so a large merged mesh can submit geometry well outside the camera's view. Spatially partitioning those batches is a possible next optimization, but raises draw counts and should be profiled along a complete traversal before adoption. Boss particle counts were kept to preserve their identity; the existing pools are bounded and now upload only their live data. Procedural fire still uses per-flame meshes; instancing it is another possible tradeoff if a fire-heavy scene becomes the measured bottleneck. These are remaining candidates, not measured gains in this pass.

## Reproducing the audit

`tests/performance.cjs` is an optional development tool requiring Node, Playwright and Microsoft Edge. It adds no game runtime dependency and uses a temporary browser profile. Run it from the repository root, with Playwright available through Node's module path:

```text
node tests/performance.cjs <output-directory>            # rendering, GPU queries and screenshots
node tests/performance.cjs <output-directory> LOADING    # every level/enemy, first and repeat
node tests/performance.cjs <output-directory> MODELS     # close-up old/new detail comparisons
node tests/performance.cjs <output-directory> ALL        # full regression suite
```

Set `AUDIT_DPR=2` for the rendering comparison above. `AUDIT_ROOT` can point at a preserved source snapshot for a baseline. Output contains JSON measurements and screenshots; keep generated captures outside the source tree.
