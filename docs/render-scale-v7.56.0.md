# Native resolution on every preset (v7.56.0)

Aleix, 2026-11-13: "It is crucial that the quality preset never gets a lower than 100% render scale setting, it looks
incredibly bad, optimize it another way."

## The rule

`qualityDraw(q, dpr)` (`js/visuals.js`) is the one place that decides what a preset draws on a screen of pixel ratio
`dpr`. `visuals.resize` and the Auto graphics test (`js/quality-benchmark.js`) both use it.

- `ratio`: always `dpr`. The scene is drawn at the screen's own resolution on Low, High and Ultra, and Auto's test
  measures each preset at that size. The old keys `maxPixelRatio` (Low 1, High 1.5, Ultra 2) and `renderScale` are gone.
- `soft`: the share of the drawn size the soft buffers use (bloom in `visuals.resize`; the AO / light buffers in
  `js/ultra-post.js`). They stop growing at the preset's `softRatio` (Low 1, High 1, Ultra 2): blurred buffers look the
  same at a lower density.
- `msaa`: the post target's samples, `denseMsaa` when `dpr >= CONFIG.VISUALS.denseScreen` (2), else `msaa`. High 4
  below 2x, 0 from 2x; Ultra 4 everywhere; Low 0.
- Low's `lights`: 4 to 3 (two stage lights and the effect light), about a tenth off Low's frame.
- `js/boot.js` watches `(resolution: Ndppx)` so moving to a screen of another scale redraws at the new ratio.

## Measurements

RTX 5060, headless Edge, GPU time per frame (timer queries, median of 60 frames), `.scratch/render-scale.cjs`.
A 2x screen at 1920x1080 CSS pixels (3840x2160 drawn), before and after run alternately (three rounds each for all
presets, two more for the final High), the best round of each:

| Preset | Level | Before: drawn size, ms | After: drawn size, ms |
|---|---|---|---|
| Low | Long Hall | 1920x1080, 0.99 | 3840x2160, 1.48 |
| Low | Burning Town | 1920x1080, 0.88 | 3840x2160, 1.38 |
| Low | Final Castle | 1920x1080, 1.49 | 3840x2160, 2.15 |
| Low | King's Blade | 1920x1080, 0.23 | 3840x2160, 0.72 |
| High | Long Hall | 2880x1620, 6.21 | 3840x2160, 6.65 |
| High | Burning Town | 2880x1620, 5.76 | 3840x2160, 5.77 |
| High | Final Castle | 2880x1620, 4.65 | 3840x2160, 4.78 |
| High | King's Blade | 2880x1620, 3.36 | 3840x2160, 2.70 |
| Ultra | (control: unchanged at 2x) | 3840x2160, 7.85 / 7.36 / 6.33 / 5.98 | 3840x2160, 8.70 / 8.12 / 7.07 / 6.26 |

- High is back to its old cost at four times the pixels of a 1x screen (within the run-to-run noise, about 10%).
- Low cannot win back four times the pixels from lights alone: it costs about half a millisecond more here. That is
  the price of the rule; Low has no post-processing or MSAA left to trade.
- On a 1x screen nothing changes but Low's one light. At 1.5x (Windows 150%) High was already native and stays at
  4x MSAA; Low draws 2.25 times its old pixels.

Close-ups at 2x, before and after, all three presets: `docs/scorecard/render-scale-closeups-2x.jpg`. Low before is
visibly blocky (1280x720 stretched to 2560x1440), High before soft (1920x1080 stretched); after, both are as sharp as
Ultra.

## What did not pay

Per-pass timings at 4K (`.scratch/pass-probe.cjs`): the scene pass is fill-bound (2.7 to 4.6 ms on Long Hall from
1.78 times the pixels). Fewer lights on High, PCF instead of soft PCF shadows, one-read surfaces and a 512 shadow map
all stayed inside the noise. Dropping MSAA on dense screens and the flame glows were the two consistent wins; the
glows stay, because they are part of the look.
