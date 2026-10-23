# Bot combat rhythm and jump defence (v7.13.0)

## Rhythm and personality

Companions alternate between pressure, flanking, baiting and short retreats. A large theoretical safety window no longer discards the chosen movement plan. Flanking includes time to reposition before stepping in; baiting maintains space until another plan or a concrete opening takes over.

| Companion | Ordinary attack burst | Regrouping pause | Character |
| --- | --- | --- | --- |
| Ser Quill | 1–3 swings | 0.9–1.6 s | Balanced pressure and flanking |
| Maren the Bold | 2–4 swings | 0.65–1.25 s | Shorter pauses and stronger pressure |
| Old Tobin | 1–2 swings | 1.1–1.9 s | More baiting and measured counters |

Bursts count attacks actually started by the Player body. Each combo extension gets one decision per swing; a declined chain is not retried every fixed step. Profile-specific decision intervals pace neutral attack choices.

Ripostes, broken/staggered opponents, substantial recoveries and safe finishing opportunities override ordinary restraint. A brief pursuit commitment lets the bot close in and use an opening after spotting it, provided the safety window remains sufficient. Immediate threats still take precedence. The existing bounded standoff fallback prevents indefinite waiting, and full-arena acquisition still finds distant surviving opponents.

## Defence

- **Parries:** `CONFIG.bot.parryChanceScale = 0.1`, giving effective eligible-blow preferences of **5.5% Quill, 3% Maren and 8% Tobin**. This is one tenth of the previous preferences.
- **Space:** where the wind-up and geometry allow it, a bot walks out of the projected box along a clear path. It stops once clear and waits for the strike to close. Tracking, insufficient room or a late escape trigger a roll fallback.
- **Rolls:** retain the existing weighted direction variety and geometric escape checks.
- **Jumps:** occasionally chosen for low or ground-only hits. Eligibility comes from the box height, current floor offset, jump velocity, gravity, full active duration and ring arrival. Closely following hits, possible quick branches, tall attacks, gap closers and projectiles veto a jump. Nearby opponents and flying projectiles are checked both when planning and when taking off. The bot needs stamina, a grounded free state and sufficiently low horizontal speed.

A defensive jump presses the ordinary jump input. Player physics and vertical hitbox overlap determine whether it clears the attack; no invulnerability or damage exception is added. The normal player stats, stamina, damage, collision and combat-credit paths are shared with humans.

Reaction notice varies over 0.08–0.18 seconds. All choices continue to read move data rather than enemy ids.

## Data and code

- `js/data/bots.js`: validated tactic `commitAt` and profile `burst`, `reset`, `think`, `evade`, `jumpDodge` fields.
- `CONFIG.bot`: parry multiplier, tempo thresholds, spacing margins and jump-clearance tuning.
- `js/bot.js`: stateful rhythm, per-swing combo choices, walking escapes and `jumpLead` prediction; supplies normal Player inputs.
- `js/validate.js`: validates the new configuration fields at browser initialization.

## Verification

`tests/bot-behavior.cjs` covers the original 72 standoff cases, whole-arena reacquisition, visible retreat/re-engagement, baiting despite safe windows, key-opening aggression and pursuit, once-per-swing combo decisions, bounded walking escape, stamina and threat precedence.

It also samples 6,000 eligible parry opportunities (98/2000 Quill, 63/2000 Maren, 163/2000 Tobin with the fixed test seed), checks physical jump clearance and no damage against a real stomp, rejects tall attacks/quick follow-ups/projectiles/overlapping threats, and exercises both jumps and rolls over 40 low attacks per profile.

Release checks include all profiles against all bosses using `tests/bot-duel.cjs all 6 600 <profile>`, bot integration and browser checks, boss-run progression, boss-vs-boss, fullscreen, Auto and the full solo browser suite.

Measured release sample: 216 boss duels completed without a timeout; the longest neutral lull was 6.1 s. The solo browser suite passed 282/282 tests, and bot integration retained 30/30 Giant Skeleton wins while using the new rhythm. The spectator browser check waits for both human death poses to arrive before asserting that the bot is watched.
