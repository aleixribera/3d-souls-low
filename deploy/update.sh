#!/usr/bin/env bash
# Run from the stack directory (manually or via the optional systemd timer).
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
exec 9>.combat-arena-update.lock
flock -n 9 || exit 0

container="$(docker compose ps --all --quiet souls)"
previous=''
if [[ -n "$container" ]]; then
  previous="$(docker inspect --format '{{.Image}}' "$container")"
  running="$(docker inspect --format '{{.State.Running}}' "$container")"
  if [[ "$running" == true ]]; then
    # Query the running image, not a new host dependency or a public URL. `players` counts
    # joined players only; sockets still joining hold no slot and do not defer an update.
    players="$(docker compose exec -T souls node -e '
      fetch("http://127.0.0.1:3000/api/lobby", { signal: AbortSignal.timeout(5000) })
        .then(r => { if (!r.ok) throw new Error("Lobby unavailable"); return r.json(); })
        .then(s => { if (!Number.isInteger(s.players) || s.players < 0) throw new Error("Invalid player count"); console.log(s.players); })
        .catch(e => { console.error(e.message); process.exit(1); });
    ')"
    if [[ ! "$players" =~ ^[0-9]+$ ]]; then
      echo 'Could not confirm that the lobby is empty; leaving it running.' >&2
      exit 1
    fi
    if (( players > 0 )); then
      echo "Update deferred: $players player(s) connected."
      exit 0
    fi
  fi
fi

# A failed pull leaves the current container running. Compose only replaces it
# when its image changed; unchanged checks do not interrupt the service.
docker compose pull souls
# An image that already failed its health check is skipped until `latest` moves on,
# so the timer does not redeploy the same broken release every 15 minutes.
rejected_file=.combat-arena-update.rejected
candidate="$(docker image inspect --format '{{.Id}}' "$(docker compose config --images souls 2>/dev/null | head -n 1)" 2>/dev/null || true)"
if [[ -n "$candidate" && -n "$previous" && -f "$rejected_file" && "$(<"$rejected_file")" == "$candidate" ]]; then
  echo "Skipping $candidate: it failed its health check before. Waiting for a newer release."
  exit 0
fi
if docker compose up -d --no-deps --wait --wait-timeout 90 souls; then
  rm -f -- "$rejected_file"
  echo 'Game image is current and healthy.'
else
  echo 'New image failed its health check.' >&2
  if [[ -n "$candidate" && "$candidate" != "$previous" ]]; then printf '%s
' "$candidate" > "$rejected_file"; fi
  if [[ -n "$previous" ]]; then
    echo 'Restoring the previous local image.' >&2
    GAME_IMAGE="$previous" docker compose up -d --no-deps --pull never --wait --wait-timeout 90 souls
  fi
  exit 1
fi
