'use strict';
// Procedural texture recipes (built by js/textures.js, nothing is downloaded).
//   kind     which surface pattern to draw: rust, steel, leather, cloth, tattered, bone, skin, bark, stone, ash, fur, holy, quilt, spectral, plate, mail, scales, feathers
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
  ultraMax: 1024,     // upper limit for explicit detail overrides; Ultra uses the native 256/512px model textures
  anisotropy: 4,
  decayStep: 0.1,     // decay is rounded to this so near-equal requests share one texture
  scratchLength: [10, 48],
  cavityReach: 2,     // px: how far the crease / edge test looks
  surfaceCacheBytes: 4 * 1024 * 1024, // bounded CPU cache of untinted surfaces, shared by colour variants
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
  // The Shield Warden (v5.5, after the reference art): pitted dark charcoal steel with bright worn edges, a fire-and-soot
  // greatshield face with mossy corrosion at the base, and tarnished warm silver-brass filigree for the shield frame.
  { id: 'wardenPlate', kind: 'plate', base: 0x222428, alt: 0x62666e, accent: 0x4a301e, rough: [0.25, 0.65], metal: 0.65, bump: 1.4, scratch: 95, stain: 0x121210, cavity: 0.9, contrast: 0.85 },
  { id: 'wardenBrass', kind: 'steel', base: 0x7a6c58, alt: 0xb8a88e, accent: 0x3e2c1a, rough: [0.25, 0.58], metal: 0.65, bump: 1.1, scratch: 55, stain: 0x241c12, contrast: 0.75 },
  { id: 'wardenShield', kind: 'rust', base: 0x2a1812, alt: 0x9e3a18, accent: 0xd86820, rough: [0.4, 0.88], metal: 0.35, bump: 1.6, scratch: 45, stain: 0x1c2618, contrast: 0.9 },
  // The Rogue (v5.5): blue-black scale leggings and sleeves, dark worn leather, a charcoal hood, blackened steel greaves.
  { id: 'rogueScales', kind: 'scales', base: 0x1a1f2a, alt: 0x4c566a, accent: 0x07080b, rough: [0.35, 0.7], metal: 0.45, bump: 1.6, scratch: 20, stain: 0x0c0e12, cavity: 0.8, contrast: 1.1 },
  { id: 'rogueLeather', kind: 'leather', base: 0x3a2e22, alt: 0x5e4a32, accent: 0x15100b, rough: [0.55, 0.9], metal: 0, bump: 1.4, scratch: 30, stain: 0x1a130c, cavity: 0.8 },
  { id: 'rogueHood', kind: 'cloth', base: 0x2a2a2c, alt: 0x3e3e42, accent: 0x141416, rough: [0.85, 1], metal: 0, bump: 0.9, scratch: 4, stain: 0x101012, cavity: 0.6, contrast: 0.5 },
  { id: 'rogueSteel', kind: 'steel', base: 0x55585e, alt: 0x8a8d94, accent: 0x2a2620, rough: [0.3, 0.7], metal: 0.55, bump: 1.1, scratch: 80, stain: 0x18161a, contrast: 0.8 },
  // The Giant Skeleton (v5.5): pale translucent bone, cold grey shadow, bright white veins running along it.
  { id: 'spectralBone', kind: 'spectral', base: 0x9ca2aa, alt: 0xc8ccd2, accent: 0xffffff, rough: [0.35, 0.7], metal: 0, bump: 1.2, scratch: 4, stain: 0x5a606a, cavity: 0.5, contrast: 1.0 },
  // The Executioner (v5.5, after the reference art): overlapping silver-grey feather scales with warm amber highlights,
  // warm ruddy skin, olive-tan embroidered skirt cloth, blood-stained dark iron for the greataxe blade and crimson-corded haft.
  { id: 'execPlumage', kind: 'feathers', base: 0x484644, alt: 0x9e988e, accent: 0x1c1815, rough: [0.32, 0.72], metal: 0.5, bump: 1.7, scratch: 28, stain: 0x2a1c14, cavity: 0.85, contrast: 1.0 },
  { id: 'execSkin', kind: 'skin', base: 0xb87654, alt: 0xd4926e, accent: 0x7a3e28, rough: [0.45, 0.7], metal: 0, bump: 0.55, scratch: 6, stain: 0x4a2418, cavity: 0.25 },
  { id: 'execSkirt', kind: 'cloth', base: 0x5e5238, alt: 0x827452, accent: 0x2e2618, rough: [0.8, 0.98], metal: 0, bump: 1.0, scratch: 6, stain: 0x241d12, cavity: 0.6, contrast: 0.65 },
  { id: 'execTrim', kind: 'cloth', base: 0x96865c, alt: 0xc2b282, accent: 0x4a3e24, rough: [0.65, 0.9], metal: 0.15, bump: 1.3, scratch: 4, stain: 0x362c18, cavity: 0.7, contrast: 0.85, scale: 2 },
  { id: 'execBlade', kind: 'rust', base: 0x38363a, alt: 0x78747a, accent: 0x6e2218, rough: [0.3, 0.78], metal: 0.6, bump: 1.5, scratch: 85, stain: 0x22100e, cavity: 0.85, contrast: 0.9 },
  { id: 'ashSoot', kind: 'ash', base: 0x1e1c1b, alt: 0x4a4745, accent: 0xe0701a, rough: [0.8, 1], metal: 0, bump: 0.7, scratch: 4, stain: 0x0c0b0a , cavity: 0.6 },
  // The Ashen Lancer (v5.5, after the reference art): coarse dark charcoal-brown woven burlap shroud, tattered frayed
  // cloth rags, aged yellowing-ivory bone with dark joint grime, and tarnished silver-grey glaive steel with rust.
  { id: 'lancerBurlap', kind: 'cloth', base: 0x201a16, alt: 0x3a3028, accent: 0x0e0b09, rough: [0.88, 1], metal: 0, bump: 1.5, scratch: 12, stain: 0x0d0a08, cavity: 0.85, contrast: 0.9, scale: 2 },
  { id: 'lancerRags', kind: 'tattered', base: 0x1e1814, alt: 0x362c24, accent: 0x0c0907, rough: [0.9, 1], metal: 0, bump: 1.3, scratch: 10, stain: 0x0a0806, cavity: 0.8, contrast: 0.85 },
  { id: 'lancerBone', kind: 'bone', base: 0xb6a482, alt: 0xd8c8a6, accent: 0x281e15, rough: [0.42, 0.82], metal: 0, bump: 1.15, scratch: 18, stain: 0x3a2c1e, cavity: 0.88, contrast: 0.95 },
  { id: 'glaiveSteel', kind: 'steel', base: 0x686a6e, alt: 0xa6aab0, accent: 0x4a2c18, rough: [0.26, 0.68], metal: 0.68, bump: 1.25, scratch: 95, stain: 0x2a1a10, cavity: 0.75, contrast: 0.88 },
  // The Gargoyle (v5.5, after the reference art): dark soot-stained obsidian/basalt stone with specular worn edges,
  // deep carved stone relief with black crevices, layered stone wing feathers, and verdigris-patinated dark bronze brow filigree.
  { id: 'gargoyleStone', kind: 'stone', base: 0x1e1c1a, alt: 0x423e3a, accent: 0x0a0908, rough: [0.38, 0.82], metal: 0.28, bump: 1.5, scratch: 26, stain: 0x0c0b0a, cavity: 0.9, contrast: 0.95 },
  { id: 'gargoyleCarved', kind: 'plate', base: 0x1a1816, alt: 0x3e3a36, accent: 0x080706, rough: [0.35, 0.78], metal: 0.32, bump: 1.6, scratch: 32, stain: 0x0a0908, cavity: 0.95, contrast: 1.0 },
  { id: 'gargoyleWing', kind: 'feathers', base: 0x181615, alt: 0x3a3632, accent: 0x080706, rough: [0.42, 0.86], metal: 0.22, bump: 1.8, scratch: 18, stain: 0x090807, cavity: 0.92, contrast: 1.05 },
  { id: 'gargoyleBronze', kind: 'rust', base: 0x242822, alt: 0x46584c, accent: 0x527868, rough: [0.35, 0.75], metal: 0.45, bump: 1.4, scratch: 22, stain: 0x121614, cavity: 0.85, contrast: 0.9 },
  // The Toll Wisp (v5.5, after the reference art): deep espresso-black weathered felt hat, warm chestnut-brown shoulder
  // mantle and laced sleeves, cream-gold damask brocade front robe, burnt-amber embroidered trim, and dark olive-charcoal outer coat.
  { id: 'wispHat', kind: 'leather', base: 0x18120e, alt: 0x2e2218, accent: 0x090604, rough: [0.75, 0.96], metal: 0, bump: 1.15, scratch: 14, stain: 0x080604, cavity: 0.85, contrast: 0.85 },
  { id: 'wispMantle', kind: 'cloth', base: 0x3a2012, alt: 0x62381e, accent: 0x1a0d06, rough: [0.78, 0.96], metal: 0, bump: 1.2, scratch: 10, stain: 0x160a05, cavity: 0.8, contrast: 0.85 },
  { id: 'wispBrocade', kind: 'holy', base: 0x7a5c2e, alt: 0xd4b678, accent: 0x3a220c, rough: [0.55, 0.88], metal: 0.12, bump: 1.4, scratch: 8, stain: 0x281808, cavity: 0.85, contrast: 0.95, scale: 2 },
  { id: 'wispTrim', kind: 'cloth', base: 0x683612, alt: 0xc47e24, accent: 0x2a1206, rough: [0.5, 0.85], metal: 0.2, bump: 1.45, scratch: 6, stain: 0x1e0c04, cavity: 0.85, contrast: 0.95, scale: 2 },
  { id: 'wispCoat', kind: 'cloth', base: 0x1a1c16, alt: 0x32362a, accent: 0x0b0c09, rough: [0.82, 0.98], metal: 0, bump: 1.1, scratch: 8, stain: 0x0c0b08, cavity: 0.8, contrast: 0.8 },
  // The Empty Sentinel (v5.5, after the reference art): antique burnished gold/brass plate, deeply embossed arabesque
  // gold filigree, warm amber-bronze chainmail, weathered ash-white surcoat cloth with dark geometric border embroidery
  // and a tattered hem, and honed silver-gold halberd steel.
  { id: 'sentinelBrass', kind: 'plate', base: 0x685024, alt: 0xc8a456, accent: 0x34240e, rough: [0.24, 0.58], metal: 0.72, bump: 1.25, scratch: 48, stain: 0x24180a, cavity: 0.85, contrast: 0.85 },
  { id: 'sentinelFiligree', kind: 'feathers', base: 0x58401a, alt: 0xd8b660, accent: 0x241808, rough: [0.22, 0.56], metal: 0.76, bump: 1.65, scratch: 32, stain: 0x201408, cavity: 0.92, contrast: 0.98, scale: 2 },
  { id: 'sentinelMail', kind: 'mail', base: 0x462e12, alt: 0x9c7230, accent: 0x221406, rough: [0.36, 0.74], metal: 0.62, bump: 1.45, scratch: 12, stain: 0x1a0e05 },
  { id: 'sentinelCloth', kind: 'cloth', base: 0x8a8d92, alt: 0xc8ccd2, accent: 0x46484c, rough: [0.82, 0.98], metal: 0, bump: 0.95, scratch: 6, stain: 0x34322e, cavity: 0.65, contrast: 0.65 },
  { id: 'sentinelRags', kind: 'tattered', base: 0x82858a, alt: 0xbec2c8, accent: 0x383a3e, rough: [0.85, 1], metal: 0, bump: 1.0, scratch: 6, stain: 0x2c2a26, alpha: true, cavity: 0.7 },
  { id: 'sentinelTrim', kind: 'cloth', base: 0x282522, alt: 0x767068, accent: 0x12100e, rough: [0.78, 0.96], metal: 0, bump: 1.35, scratch: 4, stain: 0x161412, cavity: 0.85, contrast: 0.95, scale: 3 },
  { id: 'sentinelSteel', kind: 'steel', base: 0x88867e, alt: 0xc8c4b8, accent: 0x5c4824, rough: [0.22, 0.55], metal: 0.74, bump: 1.0, scratch: 60, stain: 0x282014, contrast: 0.75 },
];


