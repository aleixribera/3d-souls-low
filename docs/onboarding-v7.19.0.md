# Friendlier start (v7.19.0)

Friends who opened the WhatsApp link did not always see that everyone was in the public lobby: one started a solo Story run by mistake. Newcomers also never learned the game's moves; in the lobby they ran at the boss and spammed attack. This release changes the first minute of play.

## The title screen: online first

- **Two large cards, then one row.** PLAY ONLINE ("Join your friends in the public lobby") comes first, then STORY ("Play alone"). 1v1 Arena, Levels and Options sit in a compact row underneath. The order is fixed; it never depends on the network.
- **A live badge on the online card.** While the title shows, `multiplayer.peek()` reads `/api/lobby` every `CONFIG.titleLobby.interval` seconds (8):
  - "3 playing now · Ashmere · The Long Hall": players are in, with an ember dot that pulses (still under reduced motion).
  - "Nobody inside yet. Start a run, then share this link."
  - "The lobby is not answering right now.": the card dims.
  - "Online play is on the home server link.": a copy with no lobby (`file:` or a static host). Polling stops.
- **Default focus.** The online card is chosen when the lobby answers, otherwise Story. A reply never moves the selection once the player has touched the menu.
- **One link.** Nothing new to share: the card's aria-label still contains "Join public lobby", so the same link and the same button serve everyone.
- **Server.** `/api/lobby` gains `playing`: the current run's name from `sim.describe(session)` ("Ashmere · The Long Hall", "Boss Only", "Duel: Hollow Soldier") while anyone is in, otherwise `null`. `players` still counts joined players only.
- **Lobby panel copy.** The kicker reads "PLAYING ONLINE · EVERYONE ON THIS LINK". Guests read "You're in, with N other players. X leads: they choose the adventure and start it for everyone." While waiting: "Waiting for X to start…", or that a named run is underway.
- **Story screen.** No Tutorial toggle. Ashmere: "The controls are taught on the way." Lands: "Best after Ashmere."

## Lessons: the controls, taught inside the levels

The Training Hall (`js/levels/tutorial.js`, `js/data/tutorial.js`, the quality picker before it) is gone. Its room survives as the developer level **Test: Training Room** (`test-training`), which the tests use as flat, quiet ground.

**Data** (`js/data/lessons.js`). `LESSONS` is keyed by id. Each lesson has:

- a `title`;
- `keys`: action ids drawn as keycaps from the live bindings, or round A/B/X/Y face buttons on a controller;
- `text()`;
- completion by `on(type, data, scratch, game)` from any event and/or a polled `check(game, scratch)`;
- optionally `urgent`, which takes over from a calmer card.

**Levels opt in** with `lessons: [{ lesson, when }]`. `when` is one trigger from `LESSON_TRIGGERS`:

| Trigger | Fires when |
|---|---|
| `x` | the player passes x |
| `zone` | the player stands in that zone's fight; read from the player's position, so it works online |
| `near` | the player is near that bonfire |
| `enemy` | a foe of that kind is in sight |
| `glint` | a red or blue wind-up is in sight |
| `kneel` | a foe kneels |
| `group` | locked on with n foes in sight |
| `hurt` | health is below a fraction and a flask is left |
| `after` | another lesson is done |

`validateLessons` checks every reference at load.

| Level | Lessons |
|---|---|
| 1 The Long Hall | move, roll, jump, lock, light, red glint, heavy (charged), jump attack, heal, break the stance, execute, parry, bonfire (with an arrow over it), switch target, roll into it (timing hints) |
| 2 The Sunken Keep | shields (the first Shield Warden) |
| 3 The Burning Town | blue glint (the first Lancer thrust) |
| Stormhill | catch-up: move, roll, lock, attack, red and blue glints, heal, bonfire |

**Engine** (`js/lessons.js`, presentation layer). It only listens to events and reads the game, never pauses, and is not loaded by the server. One card shows at a time:

- An urgent card takes over, and the calmer one comes back after it.
- Otherwise the newest waiting card shows first, so after a backlog the card matches where the player stands.
- A card unanswered for `CONFIG.lessons.show` seconds steps aside without being learned.

**Learned lessons** are kept per player under `combatArena.lessons`, with every access wrapped in try/catch. A move made before its card would show counts as learned, so a player who knows the game sees almost nothing. Options has **Lessons: On/Off** and **Show lessons again**.

**Where cards show:** Story, Levels and the lobby's shared Story runs. Duels and gauntlets have none. Cards wait during menus, loading, death, executions and help. On levels with lessons, the 30-second CONTROLS panel and the healing tip step aside.

**Look.** The card is a smoked plate with a gilt hairline and corner ticks, its title in small caps between two rules. It holds engraved keycaps and one line of text, with an italic hint underneath. It rises in, and a ✓ seal stamps on completion. Under `reducedMotion()` (Camera motion Off or the OS preference) it only fades. It fits at 320 px.

**Saves.** An Ashmere save made in the Training Hall (`level: 'tutorial'`) migrates in `check()` to chapter 1 with no bonfire. No save-version bump.

## Checks

- `tests/suite.js`:
  - the `Lessons` tests: data, trigger order, shadow learning, urgent take-over, timeout, on/off produce the same simulation, the option, the rest arrow, the HEAVY and ROLL INTO IT hints;
  - Story migration and the new title order;
  - the training-dummy tests now in `test-training`.
- `tests/suite-lands.js`: menus and Story entry without the toggle.
- `tests/lobby-peek-browser.cjs` (new): the title badge count and run name, online-first focus, polling only on the title, offline dimming and the phone layout.
- `tests/multiplayer-campaign.cjs`: `/api/lobby` `playing`.
- `tests/onboarding.cjs`: lesson card layouts on keyboard and pad at 1280, 640 and 375 px.
