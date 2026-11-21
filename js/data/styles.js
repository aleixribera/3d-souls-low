'use strict';
// The art style exploration (PLAN.md item 4): the same scene drawn four ways, for Aleix to pick one. A style is chosen
// when the page loads, with `?style=<id>` (combat-arena-3d.html?style=cel#dev); without it the game draws as always.
// Drawing only (js/style-lab.js): the models stay the Blender ones, nothing in the simulation changes.
//   shade: how lit surfaces take their light. 'bands': cel bands, each light level snapped to the nearest step of
//     `bands` (`at`: the light where a band starts, `level`: the light it draws; light above `keep` stays as it is, so
//     glows still glow); 'soft': a soft shoulder (light / (light + knee) * (1 + knee)), lifted shadows; null: unchanged.
//   body (pass 118, with 'bands'): the bands a modelled body takes instead, `at` and `level` as above, and no `keep` (its
//     glows are emissive, added after the bands): the scene's full light on a dark body passed for a glow, and the
//     Captain's black plate drew white.
//   steel (pass 121, with 'bands'): how a modelled body's `steel: true` slots take light (a blade): the diffuse light
//     alone in bands (`at`, `level`, `soft`, darker than a body's), and the specular light as one hard glint: white at
//     `glintLevel` where it passes `glint`. In body bands a light steel blade drew flat white, a paper cutout beside the
//     banded plate (boss judge round 5).
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
//   hitFlash: the white hit flash on a struck body, that much of today's (1 unchanged). tintFromSkin: a modelled body's
//     tints (the hit flash among them) take its own texture's colours (its emissive map is its map): the flash brightens
//     the body in its own colours. A plain white flash on these dark textures was the brightest thing on screen, and the
//     struck boss went flat white in every frame of his abilities (Aleix, pass 114).
const STYLE_DEFS = [
  { id: 'control', name: "Today's look", shade: null, post: null },
  { id: 'cel', name: 'Cel-shaded anime', shade: 'bands', hitFlash: 0.6, tintFromSkin: true,
    bands: { at: [0, 0.1, 0.38], level: [0.4, 0.8, 1.25], keep: 1.6, soft: 0.03 }, body: { at: [0, 0.5, 1.4, 3.2], level: [0.5, 1.1, 1.9, 3.0], soft: 0.06 },
    steel: { at: [0, 0.45, 1.3], level: [0.22, 0.45, 0.75], soft: 0.03, glint: 0.15, glintLevel: 1.2 },
    flat: { bias: 6, keep: 0.15 },
    post: { prepass: 1, ink: { depth: 0.04, fold: 0.35, width: 1.6, color: 0.05, fade: 45 }, exposure: 1.4, tint: [0.8, 0.78, 1.0], sat: 1.4 } },
  { id: 'dark', name: 'Stylized dark', shade: 'soft', knee: 0.45, flat: { bias: 3, keep: 0.35 },
    post: { prepass: 0.5, haze: { from: 14, to: 42, color: [0.2, 0.17, 0.15], amount: 0.85 },
            rim: { color: [1.0, 0.6, 0.3], power: 3, strength: 0.45, near: 16 }, brush: { radius: 2, wobble: 0, canvas: 0 }, exposure: 0.9, sat: 0.6 } },
  { id: 'paint', name: 'Painterly', shade: 'soft', knee: 1.0, flat: { bias: 3, keep: 0.4 },
    post: { prepass: 0.5, ink: { depth: 0.08, width: 2, color: 0.5, fade: 30 }, brush: { radius: 5, wobble: 3, canvas: 0.05 }, exposure: 1.4, tint: [0.78, 0.8, 1.0], sat: 1.25 } },
];
