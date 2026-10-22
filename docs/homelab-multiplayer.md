# Public co-op lobby on your Ubuntu server

This deployment runs on **your separate Ubuntu home server**, not your Windows gaming PC. The existing Tailscale address `100.95.233.56` is useful for copying files and SSH. Players will use the public HTTPS address printed by Tailscale Funnel.

The game and the single lobby run together in one Docker Compose service. Browsers automatically connect to that same address over WebSocket. There is no IP or server name to put in JavaScript.

## Updating your existing server

Your running game uses **host port 3080** and **https://aleix.tailfef0f7.ts.net:8443/**. Follow [the v7.7.1 update guide](update-v7.7.1.md), which preserves your settings and existing Funnel mapping. The steps below are for a fresh installation.

## 1. Connect to Ubuntu from your Windows PC

From PowerShell:

```powershell
ssh aleix@100.95.233.56
```

Tailscale must be connected on your PC to reach this private address. Use your usual SSH method if different.

## 2. Install the published release on Ubuntu

Run these commands in the SSH session on your **separate Ubuntu server**. Use a new directory for a fresh installation:

```bash
mkdir -p ~/containers/combat-arena
curl -fL --retry 3 -o ~/combat-arena-v7.7.1.tar.gz https://github.com/aleixribera/3d-souls-low/archive/refs/tags/v7.7.1.tar.gz
tar -xzf ~/combat-arena-v7.7.1.tar.gz --strip-components=1 -C ~/containers/combat-arena
cd ~/containers/combat-arena
printf 'GAME_PORT=3080\nMAX_PLAYERS=16\n' > .env
docker compose up -d --build
docker compose ps
curl -fsS -w '\n' http://127.0.0.1:3080/healthz
```

The health response includes `"ok":true` and `"version":"v7.7.1"`. Use `sudo docker compose ...` if your normal Docker setup requires sudo. Node is included in the image; Ubuntu does not need a separate Node installation.

The service binds to **127.0.0.1:3080** on Ubuntu and uses **3000 inside the container**. Keep that distinction in your proxy configuration. If you choose another host port, set `GAME_PORT` in `.env` and use it in health checks and Funnel's target.

The default capacity is 16, configurable from 2 through 64 with `MAX_PLAYERS`. That is a connection limit, not a measured capacity promise. Every browser renders its own world; the server runs shared enemy simulation. Test with your friends and actual upload connection before raising it.

## 3. Publish a public HTTPS link with Tailscale Funnel

You do **not** need your WAN IP, router port forwarding, or CGNAT details for this approach. Friends do not need Tailscale. Funnel publishes just this local web service through a public HTTPS URL. [Tailscale's public sharing guide](https://tailscale.com/docs/use-cases/application-testing/share-local-dev-server-with-internet)

First inspect the server's existing mappings so you do not replace another service:

```bash
tailscale version
tailscale status
sudo tailscale serve status
sudo tailscale funnel status
```

The following example uses HTTPS port **8443** to leave port 443 available for other services. If 8443 is already assigned, use another available Funnel port (443 or 10000). Start the proxy:

```bash
sudo tailscale funnel --bg --https=8443 http://127.0.0.1:3080
sudo tailscale funnel status
```

If Funnel is not enabled, the command provides a link. Open that link, sign in as the tailnet owner/admin, and approve Funnel. MagicDNS, HTTPS certificates, and the Funnel policy permission must be enabled. The CLI walks through these requirements. `--bg` keeps this mapping active after logout and across normal daemon/device restarts. [Funnel setup and limitations](https://tailscale.com/docs/features/tailscale-funnel), [CLI reference](https://tailscale.com/docs/reference/tailscale-cli/funnel)

The output gives the **actual link**, for example:

```text
https://aleix.tailfef0f7.ts.net:8443/
```

Use the address it prints, not the example above and not `100.95.233.56`. Open it from a phone on mobile data with Tailscale disconnected to verify that it is public. DNS/certificate setup can take a few minutes initially. Share this HTTPS link with your friends.

Funnel uses your existing machine's `*.ts.net` name and has relay bandwidth limits. It does not let you attach an arbitrary custom domain. A future `souls.example.com` deployment would use a different proxy/domain arrangement; it is not needed for the public Tailscale link. [Funnel requirements and limitations](https://tailscale.com/docs/features/tailscale-funnel)

If you need to find the server's exact Tailscale DNS name independently:

```bash
tailscale status --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))'
```

## 4. Play together

1. Everyone opens the public link and chooses **Join public lobby** on the main menu.
2. Enter a name. The first player to join is the leader.
3. The leader chooses a level or arena opponent and clicks **Start together**.
4. Others can join while a level is running. They appear at the shared checkpoint with the current enemies, health bars, gates and traps.
5. Escape opens a menu with **Lobby controls**. The leader can change levels, restart, advance a completed level, return the group to the lobby, remove a player, or transfer leadership. If the leader disconnects, another connected player takes over automatically.

Opening a menu does not pause an online fight. Personal death respawns only that player with full health/flasks. It does not reset enemies or undo group progress. Resting heals the resting player and updates the group's respawn checkpoint; it does not refill enemy health. There is no friendly fire or player body blocking. The tutorial map is available for shared exploration; its solo guided lesson sequence remains a solo feature.

The lobby state is in memory. Returning everyone to the lobby, the last player leaving, or restarting the container ends that online run. Offline campaign saves remain separate in each browser. Co-op does not overwrite them.

## 5. Move away from GitHub Pages

Once the public link works, use it as the game's link/bookmark. The home server now serves both the game files and the lobby. GitHub can continue to hold the source code.

To unpublish the old Pages site, open the [repository](https://github.com/aleixribera/3d-souls-low), then **Settings → Pages → Unpublish site**. If Pages is built by a GitHub Actions workflow, disable that publishing workflow as well so a later push does not republish it. [GitHub's unpublishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site)

Do not set a GitHub Pages custom domain to a `100.x` Tailscale IP. Funnel already provides the working public HTTPS address.

Browser saves belong to their website's address. Existing solo saves on the GitHub Pages address do not automatically appear on the new address. Keep the old site available while you finish any run you want to retain; multiplayer uses its own session and does not require those saves.

## Operation and updates

From `~/containers/combat-arena` on Ubuntu:

```bash
docker compose logs --tail=100 -f souls
docker compose restart souls
docker compose down
docker compose up -d --build
```

The last two commands stop/start the deployment and end any current online session. Do updates between sessions. After an update, everyone should reload the page. The lobby rejects pages from a different build.

For the existing archive installation, follow [the v7.7.1 update guide](update-v7.7.1.md). It downloads the tagged GitHub release, backs up the current directory and rebuilds just this service. Do not run `git pull` inside the archive-only directory; it is not a checkout.

To turn off **only this** public proxy, keeping unrelated Tailscale services intact:

```bash
sudo tailscale funnel --https=8443 off
```

To troubleshoot: check the local health endpoint first, then `docker compose logs --tail=100 souls`, then `sudo tailscale funnel status`. If the local health endpoint works but the public link does not, check Funnel approval, HTTPS/MagicDNS, and that the Funnel target port matches `GAME_PORT`. If the lobby says the game updated, reload the page. Test public reachability from outside your tailnet.

## Combat and latency contract

The server simulates enemies at 60 Hz using the same attack, AI, placement and terrain code as solo play. It selects enemy targets and attacks, resolves shared health/posture/phase changes, reserves executions, and advances gates/traps. It sends regular snapshots plus every attack-state transition over one WebSocket per player.

Each player simulates their own movement, health, stamina, rolls, blocks and parries immediately. Their client tests attacks against the enemy shown on their own screen. The server does not send a later packet that reverses a successful dodge or removes personal health. Local parries immediately suppress that displayed strike and report its attack ID to the server. A delayed parry of an older move never cancels a newer, unrelated attack.

Enemy presentation targets one snapshot (about 33 ms), plus actual network travel time. Each enemy has an independent clock: it holds through unavailable attack data and recovers idle/recovery delay without skipping attack telegraphs. A connection that falls too far behind must rejoin. Other players are interpolated, so their actions appear later than their own controls. Shared boss bars and state changes also require network travel time. Network latency still exists; the contract is immediate personal control and defense, not simultaneous screens or zero network latency.

This is a cooperative trust model: personal movement/defense claims come from clients, while damage amounts come from game data on the server. It is not competitive anti-cheat. Boss HP and attack timings are unchanged from solo play, so extra players make fights easier. The public lobby has no accounts or access code; anyone with the link may join.

## Validation

```bash
npm --prefix server ci
node tests/net-timing.cjs
node tests/multiplayer.cjs
node tests/network-load.cjs
node tests/fullscreen.cjs
node tests/autoquality.cjs
```

`tests/multiplayer-browser.cjs` additionally uses Playwright/Edge to exercise several browsers, delayed WebSocket messages and the complete browser suite. `tests/multiplayer.cjs` covers all level/opponent simulations and the actual HTTP/WebSocket server. Docker itself must be available on the host to build and verify the container.
