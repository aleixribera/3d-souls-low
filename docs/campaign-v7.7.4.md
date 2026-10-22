# v7.7.4 — The full campaign together

The public lobby selects **The Lands Between: The Elden Throne · Full campaign (8 chapters)** by default. Join the lobby and press **Start together**. The party starts in Stormhill and follows the existing story through Stormveil, the Evergaol, Leyndell, the Ashen Capital, Farum Azula, the Elden Throne and the Haligtree.

Winning a chapter automatically sends everyone into the next chapter after the same completion delay used by solo Story mode. The HUD shows the current chapter and total. Loading screens use the campaign's existing chapter titles and story lines. The final chapter plays its own ending and credits, then returns each player to the lobby.

The leader can restart the current chapter, advance a completed chapter immediately, choose another campaign, select an individual level or opponent, and return the party to the lobby. Late joiners enter the current chapter at the shared checkpoint. The final chapter stays complete rather than looping into a different campaign.

Co-op progress belongs to the running server session; it does not overwrite anyone's solo saves or solo completion flags. Restarting the container ends the current run.

## Update your home server

Run on Ubuntu, between sessions:

```bash
cd /opt/homelab/stacks/combat-arena
docker compose pull && docker compose up -d
curl -fsS -w '\n' http://127.0.0.1:3080/healthz
```

The health response should report **v7.7.4**. Everyone should reload the game at **https://aleix.tailfef0f7.ts.net:8443/**. The existing port and Funnel mapping stay the same. If you still have the older source-building Compose file, follow the one-time switch in [container updates](container-updates.md).

## Verification

- `node tests/multiplayer-campaign.cjs`: all eight chapter IDs/order, default campaign, completion checks, automatic party transition, restart, late join, leader authority and final completion over real WebSockets.
- `tests/campaign-browser.cjs` (Playwright/Edge): two browsers play through all eight maps, chapter cards, automatic first transition, canonical ending, late join at the ending, return to lobby, and unchanged solo saves/completion flags.
- Existing network timing, multiplayer, leader inactivity, fullscreen, Auto quality and multiplayer browser regressions.
- Full solo browser suite: the existing GPU-dependent Auto quality benchmark issue is tracked in [v7.7.1 notes](multiplayer-v7.7.1.md); its isolated fixture passes.

Tagged releases also run the campaign transport test and the actual Docker HTTP/WebSocket smoke check before publishing `latest`.
