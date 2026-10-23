# DOUBLE BOSSES (v7.9.0)

The public lobby's Challenge group now lists BOSS ONLY and DOUBLE BOSSES. DOUBLE BOSSES visits the same 12-boss catalog in the same order, two bosses at a time: bosses 1 and 2 together, then 3 and 4, and so on (six encounters). Both bosses share the Enemies arena, standing `ARENA.pairSpacing` (7 m) apart, at full health with their normal phases.

Everything else matches BOSS ONLY: the server waits for the whole party to load, then holds both bosses for `bossLoadGrace`; an encounter is won only once both bosses are dead; progression waits for `bossVictoryDelay` and the damage leaderboard; every encounter refills players; fallen players spectate; a team wipe ends the run (the TEAM WIPED screen counts individual bosses defeated). Restart begins the current run from its first encounter.

A party that defeats the last BOSS ONLY boss is no longer returned to the lobby: it starts DOUBLE BOSSES directly, with that run's own opening ceremony. Completing DOUBLE BOSSES returns the party to the lobby.

Runs are data in `ArenaNet.config.gauntlets` (`js/net-protocol.js`): `{ name, size, then }`. The session carries `gauntlet: { id, name, boss, partner, number, total, defeated, bosses, next }` and the session's `partner` boss id. Solo duels are unaffected (`partner` defaults to none).

Checks: `node tests/boss-only.cjs` (redirect, pairs, both-dead completion), plus the multiplayer, campaign, leaderboard, continuity, arena-wipe suites and the in-game suite.

## v7.10.0: TRIPLE and QUAD BOSSES

Two more runs: TRIPLE BOSSES (`boss-triples`, four encounters of three) and QUAD BOSSES (`boss-quads`, three encounters of four). Survived runs now chain BOSS ONLY → DOUBLE → TRIPLE → QUAD BOSSES, each with its own opening; finishing QUAD returns to the lobby. `session.partner` became `session.partners` (a list), and groups stand in a line `ARENA.groupSpacing` (7 m) apart, squeezed to fit `ARENA.groupWidth` (20 m).
