# Combat Arena 3D

A Souls-like in the browser, alone or with friends online.

## Play

- In the browser: https://aleixribera.github.io/3d-souls-low/ (single player), or open `combat-arena-3d.html` from
  a checkout. Nothing to install.
- **Story** is the one road: Ashmere, then over the pass into Thrale. It saves itself at every bonfire you rest at.
  **Play Online** joins the public lobby on a server (below). The title menu also lets you fight any enemy, boss or
  level on its own.
- Fight like a Souls game: watch the wind-up, roll through or parry the strike, punish the recovery, mind your
  stamina. Bonfires refill your health and flasks and are your checkpoints.

| Action | Keys | Gamepad |
|---|---|---|
| Move / camera | WASD / mouse | Left / right stick |
| Light / heavy attack (light on a kneeling enemy: execute) | J or left mouse / K or right mouse | RB / RT |
| Roll / jump | Shift / Space | B / A |
| Block (hold) / parry | L or C / E | LB / LT |
| Lock on / switch target | Q / Tab | R3 / flick the right stick |
| Rest at a bonfire / drink a flask / talk | F / G / T | Y / X / D-pad right |
| Pause and options / help | Escape / F1 | Menu / — |

## Host

- **On this PC, with the lobby:** Node 22.8 or newer, then `npm run setup` once and `npm run serve`. It prints the
  address to open.
- **On a server:** the published image `ghcr.io/aleixribera/3d-souls-low:latest`. Copy `compose.yaml` to the server
  and run `docker compose up -d`; the game listens on `127.0.0.1:3080` (set `GAME_PORT` and `MAX_PLAYERS` in `.env`).
  Put an HTTPS proxy in front of it for friends. Aleix's homelab setup: `docs/homelab-multiplayer.md` and
  `docs/container-updates.md`.

For developers: `AGENTS.md`.
