# v7.4 — Guiding Light

Warm, sparse pockets of golden motes lead from bonfire to bonfire in all thirteen campaign levels with multiple bonfires. Each pocket stays in place: motes appear at its rear, drift forward with a small curl and rise, then fade. They fade near the player and at a distance, use normal depth testing, and disappear with a collapsed floor. Only the current leg is shown, advancing when the player reaches a lit bonfire or rests; checkpoint spawns restore the outgoing leg. Duels and test rooms have no trail.

Routes are plain data in `js/data/bonfire-guidance.js`, using bonfire ids and `[x, y, z]` polylines. Doorways, ramps, overlapping floors and scripted drops are accounted for. The drop routes have separate upper and lower paths; they never interpolate through a floor. Closed shortcuts are excluded. `validateBonfireGuidance()` checks references, shapes, tuning and control-point floors at startup. The browser tests also sample every segment against floors and solids.

`js/bonfire-guidance.js` draws the trail as one point mesh per level. Positions and directions upload once; a shader animates each mote within its pocket. There is no runtime path search, texture download, geometry subdivision or per-mote light. Low draws five motes per pocket; High and Ultra draw nine. Tuning lives in `CONFIG.VISUALS.guidance`.

`js/effect-lighting.js` shares one shadowless local light on Low and two on High/Ultra between moving magical weapons, breath, spheres, runes, projectiles and brief flashes. Nearby strong sources have priority and keep their light slot while moving. Slots lend their capacity back to ambient sources when idle. Per-effect legacy lights stay hidden on every preset. The shared slots are reserved from the existing preset budget: culled stages retain eight local-light objects in total, including the shared slots. High/Ultra's existing single impact light is unchanged.

Storms now combine a restrained ambient fill with one persistent, shadowless directional flash, producing diffuse shading and highlights on the world and character materials. Indoor cover still dims the flash. No light is created per strike or per frame; no extra shadow map, post-processing pass or lighting texture is added. Shadowless local lights use short ranges rather than expensive cube-map occlusion. All light tuning lives in `CONFIG.VISUALS.effectLight`.

The light combo now deals 24 damage per hit (72 total for 48 stamina), up from 18 per hit. A tapped heavy stays at 53 damage for 40 stamina. Execution multipliers are adjusted to preserve 90 damage against normal enemies and 324 against bosses, still capped at half a boss bar. Attack timings, stamina costs, poise and posture damage are unchanged.

The visual systems only read game state. Movement, saves and story text are unchanged. The release cache stamp and menu version are `7.4` / `v7.4`.

Validation: **280/280 browser tests passed**, including the six `Guiding light` regressions and execution-damage checks. All 13 Auto fixtures, fullscreen checks, onboarding and quality-picker browser checks passed. Local visual captures cover all presets, storm lightning and Margit, Godrick, Radagon, Maliketh and Malenia.
