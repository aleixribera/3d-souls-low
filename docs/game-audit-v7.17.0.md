# Whole-game audit — v7.17.0, Steadier Battles

The audit covered both campaigns and their routes, all enemy/boss definitions, solo companions, duels, boss teams, public multiplayer, input/focus recovery, menus, saves, and Low/High/Ultra rendering. Existing unfinished Finn fixes are included in this release.

## Findings and changes

| Area | Finding | Change |
| --- | --- | --- |
| Following | The full baseline suite passed 280/282 checks. Two Lands traversal checks crashed when an exhausted route was reused and its missing first waypoint reached collision sampling. | Retire empty routes and replan safely. A focused regression consumes the final waypoint, moves the leader and resumes following. |
| Camera | Numerically stepping springs at the render rate changed their response with frame rate. A previous character's impulse could survive a restart. | Use the exact critically damped solution and the supplied frame delta. Clear spring position, velocity, goals and previous action when the player changes. Avoid rebuilding an unchanged projection matrix. |
| Shared feedback | Finn's parries, executions and jump-attack landings shook the human's camera. His flask and dodge sounds played at the human's position. | Add the landing event's owner and respect event ownership in feedback. Keep local combat feedback on the human; preserve visible world effects and positional ally sounds. |
| Burst rendering | Up to 180 individual meshes/materials were traversed and drawn separately for legacy bursts and body-dissolve embers. | One reusable instanced cube pool, with individual colours, fades and back-to-front ordering. Upload only live instances. Prepare the shader during loading and restore the instance count after warm-up. Clear the batch on actor replacement. |
| Realm lifetime | Delayed thunder read the current realm rather than the realm that scheduled it. It could sound in a different level; leaving the realm could also invalidate its random generator. | Capture its original realm and volume, cancel its timers on disposal, and reject stale callbacks. Keep sound failures isolated. |
| Ambient work | Floating ruins allocated fresh matrix, quaternion, Euler and vector objects every frame. | Reuse a stage-owned transform. |
| Readability | The help hint became very faint during play; Finn's label lacked a contrasting backing. Enemy tags admitted points closer than the camera's near plane. | Increase hint/name contrast with restrained dark backing and reject near-plane tags. |
| Comfort | Core HUD animations ignored the operating system's reduced-motion preference. | Replace animated warnings with steady warning colours and keep toasts visible for their normal lifetime. |
| Existing Finn changes | Standalone Lands levels omitted Finn and a fallen companion required a human rest or respawn. | Resolve the companion from the level's owning campaign. Return him at the current checkpoint after 4.8 seconds, fully restored, while the human lives. Preserve campaign-save isolation and excluded modes. |

Combat damage, stamina costs, attack timings, collisions, campaign order and save format are unchanged. Lore remains canonical in `LORE.md`; the included Finn description agrees with his return behavior.

## Reproducible measurements

`node tests/polish-browser.cjs` compares camera spring state after the same half-second impulse at 30, 60 and 144 Hz; every spring coordinate agrees within 1e-9. The test also confirms the simulation camera remains unchanged and a new character clears the effect.

For the same 100 visible cubes in the same Low-preset scene, the test renders both separate reference meshes and the new batch: **100 particle submissions become 1**, saving 99 draw calls. Per-particle colour, fade, expiry, pool saturation, restart cleanup and first-use shader preparation are verified. This is a rendering-submission reduction, not a claim of a universal FPS gain.

Visual captures were reviewed at 1280 × 720 across Long Hall, Stormhill, Farum Azula and Malenia on Low, High and Ultra. Existing browser checks exercise all normal maps and definitions, seven menu viewport sizes, quality transitions, onboarding, controller and multiplayer UI. Local timing samples are diagnostic; concurrent workloads and browser/GPU scheduling make them unsuitable for universal frame-rate claims.

## Validation

The dedicated audit regression also covers companion feedback/audio ownership, exhausted-route recovery, stale thunder callbacks and reduced-motion warnings/toasts. Release validation uses the full solo browser suite plus the existing companion, bot/follow, boss-team, networking/lobby, experience, onboarding, fullscreen and Auto checks. Detailed release results are recorded after the final run.
