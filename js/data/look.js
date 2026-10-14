'use strict';
// Look of a level: lights and fog. Levels can override any part.
const DEFAULT_ATMOSPHERE = {
  background: 0x07060a, fog: 0x07060a, fogDensity: 0.022,
  moon: { color: 0x9daad0, intensity: 2.2, position: [-6, 14, 8] },
  ambient: { color: 0x555a70, intensity: 1.3 },   // faint fill so silhouettes stay readable
};
// Building numbers for hall-style levels. Levels can override any of them in `style`.
const HALL_STYLE = {
  border: 0.6, grid: 4, pillarStart: 5, pillarEvery: 7, pillarSize: 0.5, alcoveHeight: 3.2,
  exitGate: { width: 4, height: 3.8 },
  torch: { mountHeight: 2.6, lightHeight: 3.2, flameHeight: 3.05, color: 0xff7a30, intensity: 4.5, range: 26, flameSize: 0.45 },
  bonfireLight: 10,
};
