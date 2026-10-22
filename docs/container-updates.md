# Quick container updates on your homelab

Stack: **`/opt/homelab/stacks/combat-arena`** on the separate Ubuntu server. Host port: **3080**. Public URL: **https://aleix.tailfef0f7.ts.net:8443/**.

The old Compose file built source locally. The new one pulls the published image **`ghcr.io/aleixribera/3d-souls-low:latest`**. Each stable release tag builds and checks the actual container in GitHub Actions, then publishes `latest`, a version tag and a commit tag. There is no source download or Node installation needed on Ubuntu.

## Switch your existing stack once

SSH from Windows:

```powershell
ssh aleix@100.95.233.56
```

Run this on **Ubuntu**, between game sessions:

```bash
cd /opt/homelab/stacks/combat-arena
docker pull ghcr.io/aleixribera/3d-souls-low:latest
cp -a compose.yaml compose.before-images.yaml
curl -fL --retry 3 https://raw.githubusercontent.com/aleixribera/3d-souls-low/main/compose.yaml -o compose.yaml.next
docker compose -f compose.yaml.next config --quiet
mv compose.yaml.next compose.yaml
docker compose pull && docker compose up -d
curl -fsS -w '\n' http://127.0.0.1:3080/healthz
```

Stop if a command fails. Pulling first verifies registry access before changing the existing Compose file. The download preserves `.env`; port 3080 is the default. Use your usual `sudo` for Docker if needed. Your Funnel mapping stays as it is. Everyone should reload after an update.

GitHub initially creates container packages as private. If the first pull returns `denied`, the owner must once open [this package](https://github.com/users/aleixribera/packages/container/3d-souls-low), choose **Package settings → Change visibility → Public**, then retry. Public container pulls require no GitHub login or token. [GitHub Container Registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

## Every future manual update

```bash
cd /opt/homelab/stacks/combat-arena
docker compose pull && docker compose up -d
```

That downloads the latest published release and replaces the container if its image changed. There is no need to find a version number, copy source files, rebuild or run `git pull`. Replacing the container ends an active online run, so use this direct command between sessions. Docker does not periodically execute it by itself. [Compose pull reference](https://docs.docker.com/reference/cli/docker/compose/pull/)

## Optional: enable automatic updates

This checks every **15 minutes**. If anyone is connected, it defers until a later check. If the download fails, the current container keeps running. If the new container fails its health check, the updater attempts to restore the previous local image. The idle check is best effort; avoid joining during the brief replacement itself.

Run once on Ubuntu after switching to the image:

```bash
cd /opt/homelab/stacks/combat-arena
mkdir -p deploy
curl -fL --retry 3 https://raw.githubusercontent.com/aleixribera/3d-souls-low/main/deploy/update.sh -o deploy/update.sh
curl -fL --retry 3 https://raw.githubusercontent.com/aleixribera/3d-souls-low/main/deploy/combat-arena-update.service -o deploy/combat-arena-update.service
curl -fL --retry 3 https://raw.githubusercontent.com/aleixribera/3d-souls-low/main/deploy/combat-arena-update.timer -o deploy/combat-arena-update.timer
sudo cp deploy/combat-arena-update.service /etc/systemd/system/combat-arena-update.service
sudo cp deploy/combat-arena-update.timer /etc/systemd/system/combat-arena-update.timer
sudo systemctl daemon-reload
sudo systemctl enable --now combat-arena-update.timer
```

The unit paths already use **`/opt/homelab/stacks/combat-arena`**. No placeholders need replacing. The timer survives Ubuntu restarts. Check it with:

```bash
systemctl list-timers combat-arena-update.timer
journalctl -u combat-arena-update.service -n 40 --no-pager
```

To check now using the same idle/health protections:

```bash
sudo systemctl start combat-arena-update.service
```

To disable unattended checks and keep manual updates:

```bash
sudo systemctl disable --now combat-arena-update.timer
```

The timer updates only this game service. It does not update your other homelab containers or change Tailscale.

## Pin a release or roll back

Set `GAME_IMAGE` in `.env` to a published version, for example:

```dotenv
GAME_IMAGE=ghcr.io/aleixribera/3d-souls-low:v7.7.2
```

Then run the same pull/up command. Remove that line to follow `latest` again. A pinned image stays pinned even while the timer runs. The older v7.7.1 source release predates image publishing; use `compose.before-images.yaml` for that source-based rollback.

Developers who want to build locally can use:

```bash
docker compose -f compose.yaml -f compose.source.yaml up -d --build
```

That override is for a full source checkout, not needed for normal homelab operation.
