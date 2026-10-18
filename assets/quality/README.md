# Tutorial quality previews

Real in-game captures of Godrick and the player in the ruined duel arena, using Low, High and Ultra respectively. Captured at 960 × 720, reduced to 800 × 600 WebP. No artistic retouching or artificial degradation of Low.

Each preset was loaded in a fresh browser context (including its MSAA configuration), with random seed 12345, paused simulation and 30 render frames. Player: (-2, 0, 2); Godrick: (1.5, 0, 0); camera: (-7, 4.5, 9), looking at (0, 2, 0). Captured using v7.2 on Edge. Layout labels identify the preset differences; settings remain adjustable later in Options.

These static images avoid running three live scenes on the quality picker, particularly on low-end laptops.

The tutorial picker marks the measured Auto recommendation, independently of the highlighted or saved manual choice. It reuses a current-session result at the same viewport and pixel ratio, or measures once when needed. Choosing a card saves that explicit preset before preparing tutorial models; backing out changes neither graphics nor story saves. Mouse, arrows/WASD, D-pad and left stick share the normal menu controls.

Validation: `node tests/quality-picker.cjs` covers both tutorial entry paths, three loaded previews, the measured recommendation, four viewport sizes, keyboard and controller input, persistence, cancellation and skipping the tutorial.
