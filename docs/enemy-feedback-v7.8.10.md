# v7.8.10 — Enemy Glow Recovery

Multiplayer bypasses `Enemy.update` to play the server-owned enemy stream. It
previously reduced only the local hit tint: posture-break `crack` and hit `recoil`
never expired. A local posture break or execution cue could therefore leave the
Giant Skeleton, or any other enemy using those effects, glowing after recovery.

`Enemy.updateFeedback(dt)` now owns all three existing countdowns. Solo calls it
from the same place in its update as before. Multiplayer calls it once per fixed
step for every enemy, before checking for playback samples or a locally held
execution. No combat, damage, attack timing, protocol, or material tuning changes.
Execution-ready and weapon-warning glows still follow their existing state rules;
intentional phase and model glows are unchanged.

Regression: `node tests/enemy-feedback-browser.cjs` checks actual body materials
for all 37 regular enemies, story bosses, Elden Ring bosses and training dummies
on both update paths, normal-state weapon halos, repeated hit flashes, and the
streamed boss execution hold. It runs at Low because the tint reset is shared by
all graphics presets.

Release checks also include `tests/multiplayer-browser.cjs` (delayed co-op and the
full solo suite), `tests/fullscreen.cjs`, `tests/autoquality.cjs`,
`tests/multiplayer.cjs` and `tests/net-timing.cjs`.
