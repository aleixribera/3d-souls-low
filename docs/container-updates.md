# How the server updates

The game runs on the home server as the published image `ghcr.io/aleixribera/3d-souls-low:latest`, in the stack
`/opt/homelab/stacks/combat-arena` (host port 3080, public at https://aleix.tailfef0f7.ts.net:8443/).

- **Publishing:** pushing a `v*` tag runs `.github/workflows/container.yaml`, which tests the image and publishes
  `latest` plus the version tag.
- **Updating:** the homelab's own tool, `hl` (`hl-games.timer`), pulls `latest` every 3 minutes while the lobby is
  empty and holds it while anyone is in. Its settings live in the homelab project (`homelab.toml`,
  `[stacks.combat-arena]`, `update = "when-empty"`, which reads `/api/lobby`). The game ships no updater of its own.
- **The weekly board:** the server keeps it in `BOARD_FILE` (`/data/weekly-board.json`); the stack mounts
  `/opt/homelab/data/combat-arena` there, so updates keep it.
- **Players:** a page left open on an older build shows "New version — Reload" on the title and in pause.
- **By hand**, on the server: `cd /opt/homelab/stacks/combat-arena && docker compose pull && docker compose up -d`.
- **Pin or roll back:** set `GAME_IMAGE=ghcr.io/aleixribera/3d-souls-low:v<version>` in the stack's `.env`, then pull
  and up; remove the line to follow `latest` again.
- **Build from source** (a full checkout): `docker compose -f compose.yaml -f compose.source.yaml up -d --build`.
