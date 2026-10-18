"use strict";
// A detached render-only test scene. No actors enter Game, combat, terrain or story state.
const AUTO_QUALITY_SCENE = {
  actors: [
    { model: 'wanderer', scale: 1, bulk: 1, x: 0, z: 3 },
    { model: 'godrick', scale: 2.1, bulk: 1, x: 0, z: -2 },
    { model: 'hollowSoldier', scale: 1, bulk: 1, x: -4, z: 0 },
    { model: 'hollowSoldier', scale: 1, bulk: 1, x: 4, z: 0 },
    { model: 'hollowSoldier', scale: 1, bulk: 1, x: -3, z: -5 },
    { model: 'hollowSoldier', scale: 1, bulk: 1, x: 3, z: -5 },
  ],
  floor: { color: 0x443c34, roughness: 0.85 },
  props: { color: 0x78694e, roughness: 0.55, metalness: 0.35 },
};
