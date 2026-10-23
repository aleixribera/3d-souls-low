'use strict';
// The duel arena (Enemies menu).
const ARENA = {
  id: 'arena', layout: 'arena', name: 'Arena',
  halfX: 18, halfZ: 13, wallHeight: 1.3, wallThickness: 0.9, border: 0.7, grid: 4, outerGround: 160,
  pillarRing: { inset: 3.5, base: 1.9, size: 1.4 }, bonfireLight: 11,
  // A dying sun over open ruins: warm haze, a sky, layered silhouettes and dry grass beyond the walls.
  atmosphere: { background: 0x6b5a48, fog: 0x6e5d4a, fogDensity: 0.017,
                moon: { color: 0xffc58a, intensity: 2.3, position: [-18, 9, -12] },
                ambient: { color: 0x5a5560, intensity: 1.05 },
                hemi: { sky: 0xb8a690, ground: 0x2a2418, intensity: 0.55 },
                exposure: 1.0, ash: 0.7, dust: 0.25, rim: 0xffd6a0, grade: { saturation: 0.78 },
                surface: { moss: 0.45, grime: 1 },
                sky: { zenith: 0x34323a, sun: 0xffa860, sunDir: [-0.75, 0.2, -0.55] }, silhouettes: 3, grass: 1 },
  playerStart: { x: -6, z: 0, yaw: Math.PI / 2 }, enemyStart: { x: 6, z: 0, yaw: -Math.PI / 2 },
  groupSpacing: 7, groupWidth: 20,   // m between opponents fought together, and the widest their line may be
  bonfires: [{ id: 'arena-fire', x: 0, z: -10.8 }],
  help: '',
};
