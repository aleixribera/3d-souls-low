# Audit repairs

A repair run Aleix started and stopped on 2026-11-16; v7.139.0 shipped part of it.
Starting revision: cd8eb507d2a045747bd042c7c1386f344526a39b (v7.138.0).
What is left below is backlog, not orders: the Friday pause and the plan stand.

## Owner scope

- Online Boss Rush first; offline only when the lobby cannot be used (reject audit 3's solo shortcut).
- No Story construction, techniques, levels or enemy content (audit 6 excluded).
- No new ability/crate economy or unfinished systems (audit 8 design excluded).
- No boss movement, skill, ability or attack redesign (audit 5/9 design excluded).
- Existing mechanics, saves, loading, screens, menus and runtime errors are in scope.
- Run passes directly, with targeted tests, real runtime proof and review before shipping.

## Repair order and acceptance

1. Counter contract (audit 1): every valid deflect/perfect dodge opens light counter; landed counter stops the string for about 0.5 s; heavy stays heavy; third counter finishes. Prove local/shared simulation and party claims.
2. Startup/entry (2/3): recoverable slow loading, local pinned dependencies, safe deferred assets; online first and usable failure fallback. Prove delayed load and blocked CDN.
3. Results (4): one finalization path and exactly-once earned rewards through reconnect; no free abandon reward before a win.
4. Replays (10): pause/resume recording with retained run; real final result; safe older-recording handling.
5. Runtime/persistence (5/7/8/9): reproduced bugs only; safe stale-checkpoint recovery, no level migrations/content redesign without evidence.
6. Performance (11): measure loading/fight costs and fix evidenced bottlenecks; native resolution stays. Laptop 60 fps remains unverified unless measured on that hardware.
7. Release protection (12): focused browser smoke coverage for entry, offers, reconnect and rewards; correct misleading markers and stale documentation.

Each pass: reproduce -> fix -> targeted checks + runtime proof -> review -> ship.
No whole local test suite; CI runs broad checks. No unrelated design work after this repair queue.

## Evidence and handoff

- Baseline: audit supplied by Aleix (2026-11-16, v7.138.0). Findings are leads to reproduce, not proof of a fix.
- Model-change commit: documentation only; game behavior unchanged.
- Pass 105, counters: targeted simulation checks cover first/middle/last deflects, the interruption, the third-counter finisher, and simultaneous contact. The first review exposed an interrupted hit that could still land in the same step. A regression check now covers it. Final review and browser proof are pending.
- Startup: the guard shows a recoverable slow-load message and clears it when the title is ready. Node regression reproduced the baseline failure and passes with the fix. Edge could not write its launch profile, and the Three.js download failed. Local dependencies and deferred asset work remain open.
- Checkpoints: moved bonfires use their current spawn. Removed bonfires fall back to the chapter start while retaining progress. The focused save fixture passes.
- Run results and replays: returning to the lobby yields a summary. A reconnecting participant can recover it for up to ten minutes. Restarting after a fight win settles the old run first. The replay stays live during an empty lobby, skips idle snapshots and resumes with a full frame. The 65-second reconnect fixture checks the gap, final result and delivery to a returning participant.
- Startup payload: the ordinary title skips the 61,456-byte replay viewer. The replay page still loads it before boot. The 1,691,810-byte snow church model and the pinned CDN dependency remain on the startup path.
- Release checks: CI and container publishing share a browser smoke workflow for startup recovery, Story saves, solo fallback, online Rush, and reconnect. The bonus-card label now appears only when a swift kill actually increases the offer. The run summary retains the kill's time and Swift result.
- Working tree only. Six focused Node checks and deployment source checks passed. Edge exited with a profile write error, real-socket tests received localhost `EACCES`, the pinned Three.js download could not resolve its host, and SSH to the uni laptop was denied. Browser proof, local Three.js, the remaining asset deferral, and laptop performance verification are still open. Git metadata is read-only.
