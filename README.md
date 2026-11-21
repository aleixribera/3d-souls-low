# Combat Arena 3D

Fast, anime-style action with Souls-like bosses, in the browser: a story alone, or an endless Boss Rush with friends.

## Play

- In the browser: https://aleix.tailfef0f7.ts.net/souls/ (the home server: alone or online), or open `combat-arena-3d.html` from
  a checkout. Nothing to install. Plays with keyboard and mouse, keyboard alone, or a controller (PlayStation or Xbox).
- **Boss Rush** joins the public lobby, where friends fight boss after boss together, each harder than the last. Between
  fights everyone picks an ability; playing earns levels, and each level a crate that unlocks a new ability. It runs
  alone too when the lobby can't be reached.
- **Story** is the one road, alone: Ashmere, then over the pass into Thrale. It saves at every bonfire you rest at.
- **Practice** fights any enemy or boss (one, several, or two teams of bosses) or plays any level on its own.
- Read the wind-up, dodge or deflect the blow, punish the opening, and use your four abilities. Bonfires refill your
  health and flasks and are your checkpoints.

| Action | Keys | Controller (PlayStation / Xbox) |
|---|---|---|
| Move / camera | WASD / mouse | Left / right stick |
| Light / heavy attack (hold to charge) | J or left mouse / K or right mouse | R1 / R2 (RB / RT) |
| Dodge / jump | Shift / Space | ◯ / ✕ (B / A) |
| Block (hold) / deflect (tap as the blow lands) | L / L | L1 / L2 (LB / LT) |
| Abilities | 1 2 3 4 | D-pad |
| Lock on / switch target | Q / Tab | R3 (RS) / flick the right stick |
| Flask / interact (rest, talk, read) | E / F | ☐ / △ (X / Y) |
| Pause / restart / help | Escape / R / F1 | Options / Share (Menu / View) / none |

Your keys can be changed on the Controls screen. Menus: arrows or D-pad to move, Enter or ✕ to choose, Escape or ◯ to go back.

## Host

- **On this PC, with the lobby:** Node 22.8 or newer, then `npm run setup` once and `npm run serve`. It prints the
  address to open.
- **On a server:** the published image `ghcr.io/aleixribera/3d-souls-low:latest`. Copy `compose.yaml` to the server
  and run `docker compose up -d`; the game listens on `127.0.0.1:3080` (set `GAME_PORT` and `MAX_PLAYERS` in `.env`).
  Put an HTTPS proxy in front of it for friends. Aleix's homelab setup: `docs/homelab-multiplayer.md` and
  `docs/container-updates.md`.

For developers: `AGENTS.md`.
