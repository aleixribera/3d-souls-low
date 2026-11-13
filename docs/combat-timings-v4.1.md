# Combat timing changes

## v7.12.2 — Radagon: Elden Shattering (2026-10-23)

| Field | Old | New |
| --- | --- | --- |
| Final (fourth) hit startup | 0.06 s | 0.50 s |
| Third impact to final shockwave opening | 0.32 s | 0.76 s |

The third hit still has 0.16 s active and 0.10 s follow-through. Adding 0.44 s before the expanding shockwave lets the player's 0.62 s roll finish before a second dodge is needed. Hitbox duration, damage, reach, tracking and final recovery keep their existing values.

Regression: `Radagon: Elden Shattering leaves time to roll the last slam and shockwave separately` drives two real roll inputs, checks both collision hitboxes report a dodge, and verifies no damage. The test fails with the old timing.


## v7.51.1 — Leap landings and their rings (2026-11-13)

The ring's startup after a leap's landing; the landing itself is unchanged. The rule (`CONFIG.enemy.ringAfterLanding`,
0.14 s past `player.rollTime`, so 0.76 s from the landing's opening to the ring's) is now checked at load.

| Attack (copies) | Old | New | Landing to ring |
| --- | --- | --- | --- |
| Godrick: Flaming Leap Slam | 0.05 s | 0.40 s | 0.41 s -> 0.76 s |
| Godfrey: Jumping Axe Dive (Oswin: The King's Leap) | 0.05 s | 0.45 s | 0.36 s -> 0.76 s |
| Margit: Hammer Leap Slam (Ostrey: Burning Gate Drop) | 0.05 s | 0.30 s | 0.51 s -> 0.76 s |
| Margit: Hammer Opener's ring (Ostrey: The Lantern Catches) | 0.05 s | 0.10 s | 0.71 s -> 0.76 s |
| Morgott: Golden Hammer Leaping Slam (Hollis: Gilt Hammer, Leaping) | 0.05 s | 0.30 s | 0.51 s -> 0.76 s |
| The Antlered Hunger: The Fall | 0.05 s | 0.30 s | 0.51 s -> 0.76 s |

Each of these rings, and Radagon's two, now has its own `impact` (a ground ring, dust, a small shake), drawn when it
opens; the landing's ring had faded by then.

Regression: `Bosses: every leap landing and the ring after it can be rolled one after the other` (real roll inputs, every
boss; fails with the old timing).

## v7.50.1 — Radagon: Gold Breaker (2026-11-13)

| Field | Old | New |
| --- | --- | --- |
| Shockwave (second hit) startup | 0.08 s | 0.40 s |
| Landing to shockwave opening | 0.44 s | 0.76 s |

The landing keeps 0.16 s active and 0.20 s follow-through. As with the Elden Shattering, the 0.62 s roll through the landing now ends before the expanding wave needs a second dodge. Damage, reach, tracking and recovery are unchanged. The Kindling Tree's Heartwood Breaks copies it. Three bots took 986 damage from the wave in six fights before, 64 after (`docs/scorecard/radagon-gold-breaker.txt`).

Regression: `Radagon: the Gold Breaker leaves time to roll the landing and its shockwave separately` (real roll inputs; fails with the old timing).


## v7.16.0 — Phase changes during executions

A health-threshold phase check could run during `ES.EXECUTED`, changing the boss phase before the critical animation finished. It now waits until the execution releases the boss. Nonlethal threshold changes run on the following enemy update; lethal hits still resolve death or the next full bar when the critical finishes. This applies to human and companion executions. Attack startup, active, follow and recovery durations are unchanged. Regression: `tests/companion-browser.cjs` checks both a mid-bar transition and a new full bar through Finn's real execution.
