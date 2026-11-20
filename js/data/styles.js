'use strict';
// The art style exploration (PLAN.md item 4): the same scene drawn four ways, for Aleix to pick one. A style is chosen
// when the page loads, with `?style=<id>` (combat-arena-3d.html?style=cel#dev); without it the game draws as always.
// Drawing only (js/style-lab.js): the models stay the Blender ones, nothing in the simulation changes.
//   shade: how lit surfaces take their light. 'bands': cel bands, each light level snapped to the nearest step of
//     `bands` (`at`: the light where a band starts, `level`: the light it draws; light above `keep` stays as it is, so
//     glows still glow); 'soft': a soft shoulder (light / (light + knee) * (1 + knee)), lifted shadows; null: unchanged.
//   flat: textures flattened toward their average colour: read at mip `bias` above the sharp one, `keep` of the sharp read
//     left in (null: unchanged).
//   post: the screen pass after the scene (null: none), at `prepass` of the screen for its depth and normals.
//     ink: outlines where depth jumps (`depth`: relative jump) or surfaces fold (`fold`: 1 - cos of the angle), `width`
//       px wide, `color` multiplying what they cross, gone by `fade` m away. sat: saturation (1 unchanged).
//     haze: the distance (`from`..`to` m) fading to a flat `color` at `amount`: far shapes flatten, near ones stand out.
//     rim: a back light round near shapes (`color`, `power`, within `near` m).
//     brush: a Kuwahara filter of `radius` px (flat patches of colour with sharp edges, like paint), its sample point
//       wobbled by `wobble` px of low noise (stroke direction); `canvas`: the strength of a canvas weave.
//     exposure: the light multiplied (1 unchanged). tint: [r, g, b] the shadows take (coloured shadows).
const STYLE_DEFS = [
  { id: 'control', name: "Today's look", shade: null, post: null },
  { id: 'cel', name: 'Cel-shaded anime', shade: 'bands',
    bands: { at: [0, 0.1, 0.38], level: [0.4, 0.8, 1.25], keep: 1.6, soft: 0.03 }, flat: { bias: 6, keep: 0.15 },
    post: { prepass: 1, ink: { depth: 0.04, fold: 0.35, width: 1.6, color: 0.05, fade: 45 }, exposure: 1.4, tint: [0.8, 0.78, 1.0], sat: 1.4 } },
  { id: 'dark', name: 'Stylized dark', shade: 'soft', knee: 0.45, flat: { bias: 3, keep: 0.35 },
    post: { prepass: 0.5, haze: { from: 14, to: 42, color: [0.2, 0.17, 0.15], amount: 0.85 },
            rim: { color: [1.0, 0.6, 0.3], power: 3, strength: 0.45, near: 16 }, brush: { radius: 2, wobble: 0, canvas: 0 }, exposure: 0.9, sat: 0.6 } },
  { id: 'paint', name: 'Painterly', shade: 'soft', knee: 1.0, flat: { bias: 3, keep: 0.4 },
    post: { prepass: 0.5, ink: { depth: 0.08, width: 2, color: 0.5, fade: 30 }, brush: { radius: 5, wobble: 3, canvas: 0.05 }, exposure: 1.4, tint: [0.78, 0.8, 1.0], sat: 1.25 } },
];
