# Boss vs Boss — v7.12.0

Open **1v1 Arena → Boss vs Boss**. Each team has an **Add boss** button and six slots. Choose any of the twelve bosses; multiple copies are allowed. Select a roster entry to remove that copy. Start requires at least one boss on each team.

The match is watched through an automatic overhead camera. Blue and orange team rosters show each boss's current health and phase name; matching overhead bars identify fighters. Pause offers team editing through Back to Menu. Restart replays the match. After one team falls, the result offers Rematch, Edit teams and Arena menu.

## Combat

- Each fighter is an existing `Enemy`, retaining its definition, attack selection, four-phase animation, hitboxes, leap and dash movement, shields, posture, health bars and phase transitions.
- A boss selects an opposing living boss and retains it until it dies. It then selects the closest surviving opponent. Crowd timing and surrounding slots are grouped by that actual target.
- Melee hitboxes strike opposing bodies once per swing. Allied bodies and the hidden player cannot be damaged. Opposing swings that open together can trade.
- Bolts use swept collision and hit the first opposing body before a wall. Allies and invulnerable bosses are transparent. Standard strike events drive feedback, and Malenia heals from connected blows.
- Refilling or seamless boss phases remain alive. Victory is decided only when a team has no living bosses. It clears outstanding attacks and projectiles before the result menu.
- The team builder is retained separately from the frozen match roster, so retries reproduce the match. Duplicate copies have unique placement keys.

## Files and verification

Team identity and the larger arena are in `js/data/boss-battle.js`. Flow and the spectator presentation are in `js/boss-battle.js`; tuning is in `CONFIG.bossBattle`. Shared strike resolution is in `js/combat.js`; projectile targeting is opt-in for `Game.kind === 'bossBattle'`. The existing solo and online combat paths retain their behavior.

`node tests/boss-battle-browser.cjs` exercises actual menu actions, twelve-boss combat, duplicate removal, team limits, responsive layout, retargeting, melee and projectile damage, ally immunity, lifesteal, phase safety, victory, rematch and return to a normal duel. Existing checks: `node tests/solo-browser.cjs`, `node tests/boss-only.cjs`, and `node tests/experience.cjs`.
