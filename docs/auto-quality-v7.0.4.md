# Desktop Auto calibration — v7.0.4

The v7.0.1 Ultra cutoff was too strict once combined with resolution scaling. The selector recognized the RTX 5060 correctly but could still reject Ultra on a high-density display.

Reproduced in local headless Edge on the RTX 5060, with 12 reported logical CPU threads and 32 GB reported memory: a 1920×1080 CSS viewport at display ratio 2 produced a 0.35 ms shader result. Ultra's 3840×2160 buffer is nine times the reference pixel count, so its adjusted cost was 3.15 ms, just above the 3 ms cutoff. Auto selected High. This was a selector calibration error, rather than failure to identify the GPU.

Ultra's adjusted benchmark ceiling is now 7 ms. Only the existing recognized strong GPU families can reach it. High still requires 8 ms or better; older integrated GPUs and limited CPU/RAM still choose Low; modern integrated and unknown GPUs remain capped at High. Resolution scaling, three-round timing, benchmark-failure fallback and manual overrides are unchanged.

Regression coverage includes the RTX 5060 at 1080p, 1440p, native 4K and a 1080p viewport at display ratio 2. It also checks that the same fast synthetic result cannot grant Ultra to integrated or unknown hardware and that slower strong-GPU results still fall back to High.

After the correction, the same local GPU/viewport/display-ratio setup measured 0.483 ms per shader pass (4.35 ms after pixel scaling) and selected **Auto (Ultra)**. All four Auto policy tests and eight first-launch fixtures passed. These are selector checks, not an FPS guarantee for every combat scene.
