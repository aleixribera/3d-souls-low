'use strict';
// Procedural texture recipes (built by js/textures.js, nothing is downloaded).
//   kind     which surface pattern to draw: rust, steel, leather, cloth, tattered, bone, skin, bark, stone, ash
//   base/alt the two main colours the pattern mixes between; accent: rust, moss, cracks, veins, embers...
//   rough    [min, max] roughness (worn metal edges go shinier, grime and rust go rougher)
//   metal    metalness; bump: bump strength; scale: pattern density multiplier (whole numbers keep it tileable)
//   scratch  scratches drawn at full decay; stain: colour of the grime that gathers as decay grows
//   cavity   how strongly grime / edge wear follow the surface relief (default 1; fine-grained skin and cloth want less)
//   contrast how strongly the relief shades the colour (default 1; woven cloth wants less)
//   alpha    true = the texture has ragged see-through edges (capes, hanging strips); use alphaTest
// A texture is asked for with a tint (colour multiplier, hue kept) and a decay (0 maintained .. 1 ruined).
const TEXTURE_SETTINGS = {
  size: 256,          // default size; enemies 256, player / bosses up to maxSize
  maxSize: 512,
  anisotropy: 4,
  decayStep: 0.1,     // decay is rounded to this so near-equal requests share one texture
  scratchLength: [10, 48],
  cavityReach: 2,     // px: how far the crease / edge test looks
};
const TEXTURE_DEFS = [
  { id: 'rustedIron', kind: 'rust', base: 0x4a4540, alt: 0x6a625a, accent: 0x8a4a22, rough: [0.45, 0.95], metal: 0.3, bump: 1.4, scratch: 30, stain: 0x2a1c12 },
  { id: 'dentedSteel', kind: 'steel', base: 0x7d8189, alt: 0x9ca0a6, accent: 0x6a4a30, rough: [0.3, 0.7], metal: 0.4, bump: 0.9, scratch: 90, stain: 0x2c2823, contrast: 0.5 },
  { id: 'crackedLeather', kind: 'leather', base: 0x5a4030, alt: 0x6e5038, accent: 0x1c1410, rough: [0.6, 0.9], metal: 0, bump: 1.2, scratch: 24, stain: 0x20180f , cavity: 0.7 },
  { id: 'rottenCloth', kind: 'cloth', base: 0x6a6254, alt: 0x7e7664, accent: 0x3a352c, rough: [0.85, 1], metal: 0, bump: 0.8, scratch: 6, stain: 0x2c2820 , cavity: 0.5, contrast: 0.45 },
  { id: 'tatteredFabric', kind: 'tattered', base: 0x6a5a58, alt: 0x80706a, accent: 0x3a302c, rough: [0.85, 1], metal: 0, bump: 0.8, scratch: 4, stain: 0x2c2420, alpha: true , cavity: 0.5 },
  { id: 'bone', kind: 'bone', base: 0xb8ae94, alt: 0xd0c8b0, accent: 0x4a4030, rough: [0.55, 0.85], metal: 0, bump: 1.0, scratch: 16, stain: 0x6a5a38 },
  { id: 'paleSkin', kind: 'skin', base: 0xb4aa9c, alt: 0xc6bcae, accent: 0x7a8590, rough: [0.5, 0.7], metal: 0, bump: 0.5, scratch: 6, stain: 0x4a3c44 , cavity: 0.2 },
  { id: 'barkMoss', kind: 'bark', base: 0x3e3228, alt: 0x54463a, accent: 0x56633a, rough: [0.8, 1], metal: 0, bump: 2.0, scratch: 0, stain: 0x1a1612 },
  { id: 'stone', kind: 'stone', base: 0x6e6c68, alt: 0x8a8780, accent: 0x66704a, rough: [0.75, 1], metal: 0, bump: 1.4, scratch: 8, stain: 0x26241f },
  { id: 'ashSoot', kind: 'ash', base: 0x1e1c1b, alt: 0x4a4745, accent: 0xe0701a, rough: [0.8, 1], metal: 0, bump: 0.7, scratch: 4, stain: 0x0c0b0a , cavity: 0.6 },
];
