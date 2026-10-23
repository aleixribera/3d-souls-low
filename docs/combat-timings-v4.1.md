# Combat timing changes

## v7.12.2 — Radagon: Elden Shattering (2026-10-23)

| Field | Old | New |
| --- | --- | --- |
| Final (fourth) hit startup | 0.06 s | 0.50 s |
| Third impact to final shockwave opening | 0.32 s | 0.76 s |

The third hit still has 0.16 s active and 0.10 s follow-through. Adding 0.44 s before the expanding shockwave lets the player's 0.62 s roll finish before a second dodge is needed. Hitbox duration, damage, reach, tracking and final recovery keep their existing values.

Regression: `Radagon: Elden Shattering leaves time to roll the last slam and shockwave separately` drives two real roll inputs, checks both collision hitboxes report a dodge, and verifies no damage. The test fails with the old timing.
