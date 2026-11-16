# Audit repairs

Model change: **Opus 5.5 -> Astra**, authorized by Aleix on 2026-11-16.
Starting revision: cd8eb507d2a045747bd042c7c1386f344526a39b (v7.138.0).
Astra owns implementation, verification and shipping. This is a repair run, not a design pass.
Aleix resumed work now, superseding the Friday pause and counter hold.

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
- Pass 105: counter repair in progress.
