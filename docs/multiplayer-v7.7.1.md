# v7.7.1 — Smoother co-op

Update the existing Ubuntu installation with [these exact commands](update-v7.7.1.md). Public HTTPS remains `https://aleix.tailfef0f7.ts.net:8443/`, forwarding to host port 3080 and container port 3000.

## Causes and fixes

- **Server overload:** contextified VM globals made repeated shared collision/AI helper calls expensive. The isolated headless VM now uses an ordinary global, with hot numeric built-ins bound lexically. It still loads the same classic game scripts and simulates at 1/60 s. Node 22.8 or newer is required; the Docker image uses Node 24.
- **Accumulating playback delay:** the previous global playback clock permanently lost time after packet underruns. Each enemy now has its own timeline. It can recover idle/recovery delay, but stops at unseen wind-ups and plays wind-ups, active hitboxes, phase transitions, retreats and executions at normal speed. One enemy no longer holds back every other enemy or world progression. No attack timings or damage values changed.
- **Excessive traffic:** protocol 2 sends an initial full state followed by changes keyed by stable IDs, with periodic snapshots at 30 Hz plus critical state transitions. Only wire values are rounded to 0.001. WebSocket compression reduces relay traffic. New sessions/late joins reset their own baselines; the decoder retains immutable prior snapshots.
- **Gates and barricades:** authoritative open state now advances each client's gate animation on every fixed step. Portcullises rise, barricades topple/sink/disappear, shortcuts share their state, and late joins see already-open passages. Shared gate/trap progress is applied when received, independently of enemy presentation delay.
- **AI and remote poses:** a hunting enemy is no longer woken back into chase every step. Each player's fight has its own crowd timing and surrounding positions, so attacks in a distant fight do not slow another player's enemies. Remote rigs consume only fresh player poses, avoiding repeated attack animation resets. Boss transition events received while executing are held until that player's animation ends.
- **Diagnostics:** the HUD labels round-trip ping and queued playback separately. `/api/lobby` and the developer client info expose tick rate, tick time, compressed output and pending send queues. `/healthz` identifies the release.

## Measurements

On 22 October 2026 the empty deployed v7.7 route measured 1–2 ms WebSocket round trips over the private tailnet and 50–52 ms when forced through its public Funnel relay. DNS on the development PC normally selects the private Tailscale address, so the public probe explicitly resolved the relay through public DNS. No live lobby was joined or changed. This does not measure three friends playing or establish their individual routes.

A local three-player castle workload exposed simulation saturation before the VM correction: recent 95th percentile ticks reached roughly 19–23 ms and outbound queues grew toward the disconnect threshold. The final six-second sample ran at 60 Hz with a 1.59 ms recent 95th percentile tick, 3.72 ms local application ping at the 95th percentile and no send backlog. Compressed output was 104 KB/s total versus 990 KB/s for a full-snapshot comparison on the same workload, about 89% less. Attack choices are random, so exact figures vary. These are development-PC measurements, not Ubuntu capacity promises; `tests/network-load.cjs` reproduces the workload.

The fixed 150 ms presentation target is replaced with a one-snapshot target (about 33 ms). The actual delay varies with delivery jitter and the need to preserve complete attack cues. Local input/health/defense still never waits for or gets rolled back by the server. Internet round-trip time remains real, and Funnel still has relay bandwidth limits.

## Validation

```bash
npm --prefix server ci
node tests/net-timing.cjs
node tests/multiplayer.cjs
node tests/network-load.cjs
node tests/fullscreen.cjs
node tests/autoquality.cjs
```

With Playwright and Edge available, run `node tests/multiplayer-browser.cjs` for the multiplayer checks and full solo suite. The multiplayer checks include three clients, 150 ms delayed incoming messages, local parry/dodge outcomes, shared damage, execution ownership/phase safety, individual death, leader controls, visible rising gates, falling barricades, shortcuts and late joins after gates open. Headless checks cover all 19 levels, 33 opponents, shared trap collision and 16 transport clients. Timing tests cover 50 seconds of jitter/stalls, independent clocks, complete attack cues, compression and delta/baseline round trips.

The existing full-suite Auto renderer-restoration failure is also reproducible with multiplayer removed; its isolated check passes. Docker is unavailable on the development PC, so the container build and the changed live version must be verified on Ubuntu with the update guide.
