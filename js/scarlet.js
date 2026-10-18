'use strict';
// ============================================================================
// Scarlet rot (v5.9, Malenia): drawing only
// ============================================================================
// Adds her kit parts and katana (js/data/bosses/malenia.js) to the body kit, and her two spectral shapes to
// SPECTRAL_WEAPONS (drawn by js/spectral.js): `phantom`, a scarlet ghost blade, and `aeonia`, the scarlet flower that
// blooms round her hips through the Scarlet Aeonia (its hitboxes are the attack's own rings, sized to the petals).
// Listens to `lifesteal` (js/enemy.js): a crimson burst at her chest each time a blow of hers heals her.
const scarlet = (() => {
  Object.assign(KIT.parts, MALENIA_PARTS);
  Object.assign(KIT.weapons, MALENIA_WEAPONS);
  Object.assign(SPECTRAL_WEAPONS, {
    phantom() {
      return { look: 'rot', geos: [new THREE.BoxGeometry(0.06, 0.014, 1.6).translate(0, 0, 0.95), KIT_GEO.Sphere(0.12, 6, 4).scale(1, 1.6, 1).translate(0, 0.1, 0)] };
    },
    // A ring of long petals opening outward along the floor (spin frame; ~4.4 m across at her scale).
    aeonia() {
      const geos = [];
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, p = KIT_GEO.Circle(1, 8).scale(0.55, 1.8, 1).translate(0, 1.9, 0);
        p.rotateX(-Math.PI / 2 + 0.25); p.rotateY(a); p.translate(0, -0.85, 0);
        geos.push(p);
      }
      geos.push(KIT_GEO.Sphere(0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, -0.85, 0));
      return { look: 'rot', bone: 'spin', geos };
    },
  });
  const C = CONFIG.elden.scarlet, at = new THREE.Vector3();
  return {
    attach() {
      events.on('lifesteal', ({ enemy }) => {
        const R = enemy.rig;
        if (R && R.chest) R.chest.getWorldPosition(at); else at.set(enemy.x, enemy.y + 1.4, enemy.z);
        spawnBurst({ x: at.x, y: at.y, z: at.z }, C.stealBurst);
      });
    },
  };
})();
