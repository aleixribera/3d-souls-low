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
    # Query the running image, not a new host dependency or a public URL.
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
if docker compose up -d --no-deps --wait --wait-timeout 90 souls; then
  echo 'Game image is current and healthy.'
else
  echo 'New image failed its health check.' >&2
  if [[ -n "$previous" ]]; then
    echo 'Restoring the previous local image.' >&2
    GAME_IMAGE="$previous" docker compose up -d --no-deps --pull never --wait --wait-timeout 90 souls
  fi
  exit 1
fi
