# Riskier companions — v7.13.1

Companions now take short, deliberate chances instead of treating every exchange as a survival puzzle. They remain ordinary players: attacks, rolls, stamina, collisions, healing and damage use the existing combat system.

A bot occasionally commits to a greedy exchange for 1.3–2.1 seconds. During it, the bot closes in, may fit an extra light/combo or heavy into a shorter opening, keeps less stamina in reserve, and can finish its swing through its target's wind-up instead of cancelling into a dodge. A hit ends that exchange. It still responds to another attacker or an incoming projectile. The decision is sampled once every 2.5–4 seconds when close and able to act. Flanking, baiting, regrouping, jumping and safe defence still appear between these bursts.

| Companion | Greedy exchange chance | Forward gamble among chosen rolls |
| --- | ---: | ---: |
| Ser Quill | 45% | 40% |
| Maren the Bold | 65% | 60% |
| Old Tobin | 30% | 30% |

Against ordinary shaped attacks, forward gambles choose a straight or diagonal inward roll. Rings, breaths and spheres retain their appropriate directional responses. They accept contact with the opponent's body and a landing inside the attack's reach. Some rolls start earlier, which can expose the end of the roll to a lingering hitbox. Walls and floor edges still veto ordinary directional candidates; a blocked forward path falls back to an escape. No extra i-frames are granted. The earlier parry reduction and physically checked jump dodges remain.

After 12 seconds without a living human ally, the companions shorten regrouping/patience and add 25 percentage points to their greed and forward preferences. Living bot allies do not suppress this pressure. A returning living human restores the ordinary preferences. There is no forced death, health drain or boss-specific timer.

Tuning is in CONFIG.bot.risk and the profiles' greed/forward/dodge data. Schemas validate probabilities, timings and direction references at load.

## Checks

- Bot behavior regression: 72 boss/profile/health initiative cases, tracking/reacquisition, tempo, stamina, rare parries, real jump clearance, partner/projectile defence, and new real-combat trade/roll regressions. The same wide sweep punished 5/32 forward gambles and 0/32 ordinary escapes with fixed bot seeds. A greedy light dealt damage and was then punished; the ordinary defensive response avoided the same sweep.
- All 12 bosses × three personalities × six trials: 216 completed solo fights, no timeout, longest fight 202 seconds and longest neutral lull 5.7 seconds in this sample. Group average resolution times ranged from 26 to 115 seconds; harder bosses usually defeated the lone companion. These are randomized headless samples, not guaranteed win rates or fight limits.
- The server integration keeps roster, authority, spectator camera, damage credit and wipe checks. Its 30 Giant Skeleton trials now require useful contribution and resolution within three minutes rather than near-perfect solo wins.

- Browser bot spectating, boss-vs-boss regression, boss-only flow, fullscreen and all 17 Auto graphics fixtures passed. The full solo browser suite passed 282/282 checks. The server integration's sampled Giant Skeleton record was 28/30 wins; its contribution and three-minute resolution requirements passed.

VERSION / LOAD_STAMP: v7.13.1 / 7.13.1.
