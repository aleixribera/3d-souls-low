# Attack timings before the v4.2 animation revamp (rollback record)

Seconds, from `js/data/player.js` and `js/data/enemies.js` at v4.1 (commit 231683a).
`startup` = wind-up, `active` = hitbox on, `recovery` = after the last hit. Multi-hit attacks list each hit.
Enemies also stop turning at 70% of the wind-up (`CONFIG.enemy.windupTrack`), except attacks with `track`,
which keep turning through wind-up AND active.

| Owner | Attack | Hits (startup / active) | Recovery | Track |
|---|---|---|---|---|
| Player | light | 0.22 / 0.12 | 0.34 | - |
| Player | heavy | 0.56 / 0.16 | 0.64 | - |
| Player | jumpLight | 0.12 / until landing | 0.42 | - |
| Player | jumpHeavy | 0.30 / until landing | 0.70 | - |
| Hollow | swing | 0.62 / 0.14 | 0.65 | 2.2 |
| Hollow | overhead | 1.00 / 0.14 | 1.05 | 2.2 |
| Knight | slam | 1.40 / 0.18 | 1.35 | 1.2 |
| Knight | bash | 0.50 / 0.12 | 0.70 | 1.2 |
| Rogue | stab | 0.38 / 0.10 | 0.45 | 4 |
| Rogue | doubleSlash | 0.42 / 0.09, 0.26 / 0.09 | 0.62 | 4 |
| Giant | sweep | 1.65 / 0.24 | 1.55 | 0.8 |
| Giant | stomp | 1.30 / 0.20 | 1.25 | 0.8 |
| Warden | wardenSwing | 0.75 / 0.14 | 0.80 | 1.5 |
| Warden | wardenBash | 0.55 / 0.12 | 0.75 | 1.5 |
| Lancer | lancerDash | 0.90 / 0.16 (dash from 45%) | 0.85 | 2.0 |
| Lancer | lancerJab | 0.45 / 0.10 | 0.80 | 2.0 |
| Lancer | lancerCharged | 1.35 / 0.18 | 1.10 | 2.0 |
| Executioner | execChop | 1.35 / 0.18 | 1.30 | track 2.0 |
| Executioner | execSpin | 1.25 / 0.40 | 1.20 | 1.0 |
| Duelist | duelistCombo | 0.50 / 0.10, 0.28 / 0.10 | 0.60 | track 4.0 |
| Duelist | duelistDash | 0.70 / 0.12 (dash from 40%) | 0.70 | 3.5 |
| Bowman | bowShot | 1.10 / 0.10 | 0.70 | 2.4 |
| Bowman | bowKick | 0.40 / 0.12 | 0.50 | 2.4 |
| Shover | shoverShove | 1.30 / 0.16 | 0.90 | 1.4 |
| Shover | shoverBash | 0.55 / 0.12 | 0.75 | 1.4 |
| Pillager Captain | captainThrust | 1.00 / 0.16 (dash from 45%) | 1.00 | 1.6 |
| Pillager Captain | captainCombo | 0.70 / 0.14, 0.42 / 0.14, 0.55 / 0.16 | 0.90 | track 2.6 |
| Pillager Captain | captainOverhead | 1.40 / 0.20 | 1.30 | 1.6 |
| Bell Warden | bellSweep | 1.20 / 0.24 | 1.20 | track 1.6 |
| Bell Warden | bellSlam | 1.50 / 0.20 | 1.40 | 1.2 |
| Bell Warden | bellShove | 1.30 / 0.18 | 1.00 | 1.2 |
| Bell Warden | bellCharge | 1.10 / 0.30 (dash from 40%) | 1.10 | 1.2 |
| Dummies | trainingSwing / dodgeSwing | 1.30 / 0.16 | 0.90 | - |

Global: parry window opens 0.12 s before active, closes 0.03 s into it (`CONFIG.parry`), press armed 0.10 s.
Player lunge starts at 55% of the wind-up. Input buffer 0.2 s; roll queue 1.2 s.

## Changes since
| Version | Attack | Old | New |
|---|---|---|---|
| 4.2 phase 1 | Player light | 0.22 / 0.12, recovery 0.34 (0.68 s) | wind-up 0.30 / active 0.10 / follow 0.14, recovery 0.26 (0.80 s) |
| 4.2 phase 2 | Player heavy | 0.56 / 0.16, recovery 0.64 (1.36 s) | 0.62 / 0.14 / follow 0.22, recovery 0.50 (1.48 s); + hold-to-charge up to 0.9 s |
| 4.2 phase 2 | Player light2, light3 (new) | - | 0.26 / 0.10 / 0.14, rec 0.28; 0.38 / 0.12 / 0.18, rec 0.36 |
| 4.2 phase 4 | Hollow swing | 0.62 / 0.14, recovery 0.65 (1.41 s); turns for 70% of wind-up | 0.75 / 0.12 / follow 0.18, recovery 0.55 (1.60 s); tracks 3.0 rad/s, commits at 70% |
| 4.2 phase 4 | Hollow overhead | 1.00 / 0.14, recovery 1.05 (2.19 s) | 1.15 / 0.14 / follow 0.26, recovery 0.90 (2.45 s); tracks 2.4 rad/s, commits at 65% |
| 4.2 buffer | Input | roll queued 1.2 s from any busy state; attacks queued 0.5 s | one slot, latest press wins, kept only within 0.4 s of the cancel point (+0.1 s grace) |
| 4.2 phases 5-6 | All other enemies and bosses | the table above | new wind-up / active / follow / recovery, tracking and holds in js/data/enemies.js; follow-through added, recoveries shortened by about that much |
| 4.2 phase 7 | Player walk | accel 34, decel 28 | accel 26, decel 22 |
| 4.2.1 | Player jumpHeavy | damage 52, poise 60, posture 24, cost 42, landing 0.70 (x0.85 on a hit), box 2.2 x 2.6, a "heavy" for meters | damage 42, poise 50, posture 20, cost 46, landing 0.85 (no hit discount), box 1.7 x 2.1, counts as light for meters |
| 4.2.1 | Stagger / guard / posture | Knight 60/45, Executioner 45/28, guard 50/34, posture chainMul 1.5, parry 38/28/34 | 50/38, 40/24, 42/29, chainMul 1.35, parry 32/24/29 |
| 4.2.3 | Ashen Lancer pacing | cooldown [0.7, 1.54]; chances dash 0.3, jab 0.9, charged 0.22; approach 0.3 | cooldown [0.1, 0.4] (x4 with other enemies fighting); dash 2.5, jab 0.35, charged 1.0; approach 0.12 |
