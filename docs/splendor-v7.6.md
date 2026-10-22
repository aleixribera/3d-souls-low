# v7.6 — Splendor

Rendering overhaul for the existing procedural art style. Combat, terrain,
collision, campaign content and save formats are unchanged.

## Presentation

- Animated, layered cloud formations with illuminated edges replace the flat
  sky gradient. All layers sample one shared, mipmapped 256-square noise map
  baked once at startup.
- Depth-limited ground mist integrates an exponential height layer along each
  camera ray. It uses the existing depth/composite pass and respects surfaces.
- Weathered stone has mineral variation, recessed joints, irregular flagstones,
  broad patches of wear and damp polished areas. High and Ultra reflect the
  cached level environment on weathered surfaces as well as metal.
- Stone relief is shallower to reduce jagged, shimmering joints. Redundant
  geometric floor grids are disabled; borders, trap warnings and floor collision
  remain intact.
- Grass uses curved tapered blades with darker roots and lighter tips, still
  instanced in one draw and animated in the vertex shader.
- More selective bloom, gentler vignette and finer grain retain texture detail
  and the visibility of combat cues.

## Presets

| Feature | Low | High | Ultra |
|---|---|---|---|
| Cloud layers | 1 | 3 | 5 |
| Moon shadow map | Off | 1024 | 2048 |
| Ambient occlusion | Off | 8 taps, 35% resolution | 16 taps, 50% resolution |
| Ground mist | Off | Light | Full |
| Surface environment reflection | Off | On | On |
| Volumetric light, refraction, procedural ambient fire | Off | Off | On |
| Surface sampling | Single projection | Three projections + broad weathering | Three projections + broad weathering |

Low retains native resolution, four pooled local lights, reduced scenery counts,
no post-processing and no depth/normal targets. Its material color improvements
reuse the packed surface sample. The cloud texture is shared across presets.
No per-frame lights, geometry or texture bakes were added.

High's Auto benchmark now uses its actual shadow-map size, AO scale and tap
budget. Switching Ultra → High clears volumetric light uniforms. Switching to
Low disposes screen-lighting targets and removes environment reflections.

All new tuning is in `CONFIG.VISUALS.cinematic`, checked during initialization.
`ultraPost.info()` exposes shadow size, AO sample count, scattering light count
and buffer dimensions for preset-transition regression checks.

## Validation

Release checks and measured results are recorded in `splendor-results.json`.
Measurements use Edge on the available RTX 5060 at 1280 × 720; they are GPU
render times, not an integrated-GPU frame-rate guarantee.
