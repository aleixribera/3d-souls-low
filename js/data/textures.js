'use strict';
// Procedural texture recipes (built by js/textures.js, nothing is downloaded).
//   kind     which surface pattern to draw: rust, steel, leather, cloth, tattered, bone, skin, bark, stone, ash, fur, holy, quilt, spectral, plate, mail
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
  // Margit, the Fell Omen (v5.3): burlap robes faded red-brown, rags torn to strips, grey wrinkled skin, a matted tail, horn.
  { id: 'margitBurlap', kind: 'cloth', base: 0x6a4a34, alt: 0x8a6444, accent: 0x3a2418, rough: [0.85, 1], metal: 0, bump: 1.1, scratch: 4, stain: 0x2a1a12, cavity: 0.6, contrast: 0.6, scale: 3 },
  { id: 'margitRags', kind: 'tattered', base: 0x5a2a22, alt: 0x7a4030, accent: 0x2a1410, rough: [0.85, 1], metal: 0, bump: 1.0, scratch: 4, stain: 0x1e100c, alpha: true, cavity: 0.6 },
  { id: 'margitSkin', kind: 'skin', base: 0x8e8a86, alt: 0xa49e98, accent: 0x5a5460, rough: [0.55, 0.8], metal: 0, bump: 1.1, scratch: 8, stain: 0x3a3438, cavity: 0.5 },
  { id: 'margitFur', kind: 'fur', base: 0x4a3c30, alt: 0x7a6a56, accent: 0x5a2a1e, rough: [0.85, 1], metal: 0, bump: 1.6, scratch: 0, stain: 0x1a140e },
  { id: 'margitHorn', kind: 'bone', base: 0xa07a5a, alt: 0xc8a888, accent: 0x5a3a28, rough: [0.5, 0.8], metal: 0, bump: 1.3, scratch: 20, stain: 0x5a3a2a },
  { id: 'holyLight', kind: 'holy', base: 0xd8b860, alt: 0xfff4d0, accent: 0xffffff, rough: [0.2, 0.4], metal: 0, bump: 0.3, scratch: 0, stain: 0xb08a40 },
  // The Hollow Soldier (v5.5): a quilted padded gambeson (stitched puffs), and rotted brown skin.
  { id: 'quiltedGambeson', kind: 'quilt', base: 0x5e5230, alt: 0x7e6e3e, accent: 0x2a2416, rough: [0.85, 1], metal: 0, bump: 1.8, scratch: 4, stain: 0x2a2214, cavity: 0.8, contrast: 1.1 },
  { id: 'rotSkin', kind: 'skin', base: 0x6a4e36, alt: 0x8a6a48, accent: 0x3a2418, rough: [0.55, 0.85], metal: 0, bump: 1.0, scratch: 8, stain: 0x2a1a10, cavity: 0.5 },
  // The Undead Knight (after the reference art): mottled grey plate with rivets, dark mail, worn brown trousers.
  { id: 'knightPlate', kind: 'plate', base: 0x4c4e52, alt: 0x9a9ca0, accent: 0x5a3e2a, rough: [0.28, 0.62], metal: 0.55, bump: 1.1, scratch: 70, stain: 0x26241f, contrast: 0.7 },
  { id: 'knightMail', kind: 'mail', base: 0x2a2a2c, alt: 0x5e5e62, accent: 0x4a3422, rough: [0.4, 0.8], metal: 0.5, bump: 1.4, scratch: 10, stain: 0x18160f },
  // The Rogue (v5.5): blue-black scale leggings and sleeves, dark worn leather, a charcoal hood, blackened steel greaves.
  { id: 'rogueScales', kind: 'scales', base: 0x1a1f2a, alt: 0x4c566a, accent: 0x07080b, rough: [0.35, 0.7], metal: 0.45, bump: 1.6, scratch: 20, stain: 0x0c0e12, cavity: 0.8, contrast: 1.1 },
  { id: 'rogueLeather', kind: 'leather', base: 0x3a2e22, alt: 0x5e4a32, accent: 0x15100b, rough: [0.55, 0.9], metal: 0, bump: 1.4, scratch: 30, stain: 0x1a130c, cavity: 0.8 },
  { id: 'rogueHood', kind: 'cloth', base: 0x2a2a2c, alt: 0x3e3e42, accent: 0x141416, rough: [0.85, 1], metal: 0, bump: 0.9, scratch: 4, stain: 0x101012, cavity: 0.6, contrast: 0.5 },
  { id: 'rogueSteel', kind: 'steel', base: 0x55585e, alt: 0x8a8d94, accent: 0x2a2620, rough: [0.3, 0.7], metal: 0.55, bump: 1.1, scratch: 80, stain: 0x18161a, contrast: 0.8 },
  // The Giant Skeleton (v5.5): pale translucent bone, cold grey shadow, bright white veins running along it.
  { id: 'spectralBone', kind: 'spectral', base: 0x9ca2aa, alt: 0xc8ccd2, accent: 0xffffff, rough: [0.35, 0.7], metal: 0, bump: 1.2, scratch: 4, stain: 0x5a606a, cavity: 0.5, contrast: 1.0 },
  { id: 'ashSoot', kind: 'ash', base: 0x1e1c1b, alt: 0x4a4745, accent: 0xe0701a, rough: [0.8, 1], metal: 0, bump: 0.7, scratch: 4, stain: 0x0c0b0a , cavity: 0.6 },
];
