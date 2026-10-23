# Lobby redesign (v7.10.1)

Visual redesign of every multiplayer surface. Behaviour, element ids, focus and controller navigation, and reduced-motion handling are unchanged; the player's vitals and boss bars are untouched.

- **Shared tokens:** `--mp-gold`, `--mp-ink`, `--mp-muted`, `--mp-line`, `--mp-good`, `--mp-bad`, … declared on `#publicLobby`, `#onlineParty`, `#onlineLeaderboard`, `#onlineSpectator` and `.online-name` (styles injected by `js/multiplayer.js`).
- **Lobby:** rounded card with a gold top rule, connection pill, status strip, and two framed sections: *Adventure* (custom select arrow, summary with a gold rule, primary gold action) and *Your party* (count chip, avatar-initial rows, LEADER badge, highlighted self row). In a run, Restart / Next / Return sit under a *Party controls* label; *Return everyone to lobby* and *Leave lobby* are tinted as leaving actions. Keybinds in Controls render as keycaps.
- **Party panel:** framed card; each player has a status dot (alive / fallen / loading), uppercase status, fallen names struck through; teammate meters align under the name.
- **Nameplates:** framed pill with a pointer tail.
- **Damage leaderboard:** rows are cards; ranks 1–3 get gold / silver / bronze medals (`data-rank`), the damage cell fills by share of the top total (`--share`), your row is highlighted.
- **Spectator bar:** rounded glass bar, pulsing SPECTATING dot (static with reduced motion), round arrow buttons, pill toggle.
- **TEAM WIPED:** bosses defeated shown as a pill; *Returning to lobby…* has a small spinner (static with reduced motion).

Checks: node `tests/boss-only.cjs`, `tests/multiplayer.cjs`, `tests/damage-leaderboard.cjs`, `tests/lobby-continuity.cjs`, and the in-game suite.
