# v7.3 — Clearer Combat

- Tutorial instructions live in `js/data/tutorial.js`. Fifteen short lessons teach targeting before attacking; charging, jump attacks and executions show their next action only when relevant. The target-switch lesson begins locked on. The zoom lesson and all player zoom controls/help entries are removed; camera framing stays at the existing default.
- Stamina regeneration: 36 → 43.2 per second (×1.2). Stamina delays, exhaustion delays, attack timings, recovery times, costs and AI cooldowns are unchanged.
- Rising enemies receive the usual poise damage, flinches and stagger/guard meter buildup. Hitting a dormant enemy wakes it and applies that same reaction immediately. Boss posture and airborne leap protections retain their normal rules.
- Jump light: damage 22 → 28, poise 26 → 34, boss posture 9 → 14. Jump heavy: damage 59 → 74, poise 50 → 70, boss posture 20 → 30. Every normal and training stagger/guard meter recognizes `jumpHeavy` as a heavy hit; jump lights retain light meter buildup.
- Aldric's Judgement Leap (field/throne and knell) and Burning Ascent's landing hit use ground-only, 0.6 m high impact boxes. Being airborne clears the landing impact. Burning Ascent's initial rising slash stays a full-height hit.
- `canParryAttack` supplies the same attack-wide decision to combat, warning colors and parry-marker validation. Red means parryable; blue means `noParry`, `rollOnly` or projectile. Some blue attacks remain blockable. The Giant Skeleton, the other Ashmere bosses and all eight Elden Ring bosses are covered by the same rule.

Verification: the browser suite includes `Combat clarity` regressions for every boss strike's actual parry eligibility and both weapon/halo colors, rising enemy hit reactions, every guard/stagger meter, real jumps over Aldric's landing boxes, stamina recovery, contextual execution prompts and removal of zoom input. Existing combat, story, terrain and movement tests remain in the full suite.
