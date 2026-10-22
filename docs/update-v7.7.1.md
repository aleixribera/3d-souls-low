# Update your homelab to v7.7.1

Your game is on the **separate Ubuntu server** at `100.95.233.56`. The host port is **3080**, the container's internal port is **3000**, and your public link remains:

**https://aleix.tailfef0f7.ts.net:8443/**

This release fixes accumulating enemy playback delay, excessive server simulation cost, large repeated snapshots, gates that never visibly rise, and barricades that never fall. It also repairs hunting behavior around obstacles and keeps remote player animations from restarting on duplicate samples. Personal movement, parries and dodges still resolve on your own screen.

Update between sessions: replacing the container ends the current lobby run. Everyone must reload afterward.

## 1. Connect from Windows

Open PowerShell on your gaming PC:

```powershell
ssh aleix@100.95.233.56
```

Run **all remaining commands on Ubuntu**, inside that SSH session. This assumes you used `~/containers/combat-arena` from the original guide. If you installed elsewhere, change that directory in the first command.

## 2. Back up your current installation

```bash
cd ~/containers/combat-arena
umask 077
backup="$HOME/combat-arena-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar --exclude='./server/node_modules' --exclude='./.git' -czf "$backup" .
printf 'Backup saved to: %s\n' "$backup"
```

Keep the printed backup path for rollback. It includes your `.env`, so keep it private. Your currently running container keeps working while you download and build the replacement.

## 3. Download the published release

```bash
curl -fL --retry 3 -o "$HOME/combat-arena-v7.7.1.tar.gz" https://github.com/aleixribera/3d-souls-low/archive/refs/tags/v7.7.1.tar.gz
tar -xzf "$HOME/combat-arena-v7.7.1.tar.gz" --strip-components=1 -C "$HOME/containers/combat-arena"
cd ~/containers/combat-arena
```

If downloading fails, stop here and keep the current container running. The release archive contains no `.env`, so extraction preserves your settings. This method works with your original archive installation; `git pull` does not work inside an archive-only directory.

## 4. Keep your host port at 3080

This updates only `GAME_PORT` and leaves settings such as `MAX_PLAYERS` intact:

```bash
touch .env
if grep -q '^GAME_PORT=' .env; then
  sed -i 's/^GAME_PORT=.*/GAME_PORT=3080/' .env
else
  printf '\nGAME_PORT=3080\n' >> .env
fi
docker compose config --quiet
```

The resulting port mapping is `127.0.0.1:3080:3000`. Leave the Dockerfile's internal port at 3000.

## 5. Build and replace just the game container

```bash
docker compose build --pull souls
docker compose up -d --no-deps souls
docker compose ps
curl -fsS -w '\n' http://127.0.0.1:3080/healthz
docker compose logs --tail=50 souls
```

Use `sudo docker compose ...` if your server normally needs sudo. If the build fails, keep the existing container running and inspect the error before proceeding.

The health response must include:

```json
{"ok":true,"players":0,"version":"v7.7.1"}
```

`players` may be higher if someone has already connected. The logs should say `Combat Arena v7.7.1` and `port 3000`: that log refers to the internal container port.

## 6. Verify the existing public link

```bash
sudo tailscale funnel status
curl -fsS -w '\n' https://aleix.tailfef0f7.ts.net:8443/healthz
```

Funnel should already send HTTPS port **8443** to **http://127.0.0.1:3080**. Leave an existing correct mapping alone. If this game's 8443 target is wrong, update only that mapping:

```bash
sudo tailscale funnel --bg --https=8443 http://127.0.0.1:3080
```

Do not reset all Serve/Funnel mappings; your other services may use them. [Official Funnel CLI reference](https://tailscale.com/docs/reference/tailscale-cli/funnel)

Open **https://aleix.tailfef0f7.ts.net:8443/** and press **Ctrl+F5**. Everyone should see **v7.7.1** in the menu before choosing **Join public lobby**. An older tab will be refused until it reloads. Check public reachability on a phone using mobile data with Tailscale disconnected.

There is no new domain, router rule or GitHub Pages change needed for this update.

## 7. Check latency while playing

The party HUD now distinguishes **ping** from **playback**. Ping is a round trip over your current connection. Playback is how far the slowest displayed enemy is behind the latest received server frame; it excludes network travel time.

On Ubuntu, while your friends are fighting:

```bash
curl -fsS -w '\n' http://127.0.0.1:3080/api/lobby
docker stats --no-stream
```

The lobby response includes `metrics`:

| Field | Meaning |
| --- | --- |
| `hz` | Simulation steps per second; should stay near 60 during play. Zero is normal in an empty lobby. |
| `tickMs` | Recent 95th percentile simulation tick cost. It should stay comfortably below 16.7 ms. |
| `websocketBytesPerSecond` | Total server WebSocket output after negotiated compression. |
| `bytesPerSecond` | JSON payload before WebSocket compression. |
| `bufferedBytes` | Largest outstanding send queue among players. Sustained growth indicates a slow route or overload. |

For client details, open your normal game link, join, press F12 and inspect `__arena.multiplayer.info` in the browser console. It includes ping, playback delay and server metrics. No developer URL is needed.

The empty live route measured on 22 October 2026 was **1–2 ms** over the private tailnet and **50–52 ms** through the public Funnel relay from the development PC. These are not measurements of your friends' loaded sessions. This patch removes avoidable game delay and traffic; a friend's underlying network round trip still depends on their route, Wi-Fi and your upload connection. Funnel has relay bandwidth limits. [Funnel requirements and limitations](https://tailscale.com/docs/features/tailscale-funnel)

If ping remains 200–300 ms while `hz` stays near 60 and `bufferedBytes` stays small, the remaining delay is on the connection path. Compare a wired connection and a private tailnet connection before changing game timing. If `hz` falls or the queue grows, capture the lobby metrics and container CPU output during the fight.

## Roll back if needed

Use the exact backup path printed in step 2. Extract it over this game's directory and rebuild the game service:

```bash
cd ~/containers/combat-arena
tar -xzf "$backup" -C .
docker compose build souls
docker compose up -d --no-deps souls
```

The `$backup` variable exists only in the original SSH session. In a new session, first assign `backup` to the printed absolute path. Your backup restores `.env` too. Everyone must reload again. The Funnel link stays the same.
