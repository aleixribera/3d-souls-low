'use strict';
// ============================================================================
// Spectral weapons (v5.3): golden weapons conjured for one attack (Margit's holy dagger, hammer and sword)
// ============================================================================
// An enemy attack with `spectral: '<id>'` (an id of SPECTRAL_WEAPONS) shows that weapon in the weapon hand from the start
// of its wind-up to the end of its follow-through, fading in and out (CONFIG.elden.spectral), with a warm light: the cue
// that the blow is holy and cannot be parried. Drawing only: the hitbox is the attack's own box, as for every attack.
// Each builder returns geometry along +z from the hand, like KIT_WEAPONS (js/bodykit.js), in metres at scale 1.
const SPECTRAL_WEAPONS = {
  dagger() {
    return [new THREE.BoxGeometry(0.05, 0.012, 0.5).translate(0, 0, 0.35), new THREE.BoxGeometry(0.16, 0.03, 0.03).translate(0, 0, 0.08)];
  },
  hammer() {
    return [new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6).rotateX(Math.PI / 2).translate(0, 0, 0.6),
            new THREE.BoxGeometry(0.34, 0.34, 0.62).rotateY(Math.PI / 2).translate(0, 0, 1.38),
            new THREE.ConeGeometry(0.1, 0.22, 4).rotateZ(-Math.PI / 2).translate(0.38, 0, 1.38)];
  },
  sword() {
    return [new THREE.BoxGeometry(0.09, 0.02, 1.35).translate(0, 0, 0.82), new THREE.ConeGeometry(0.045, 0.16, 4).rotateX(Math.PI / 2).translate(0, 0, 1.57),
            new THREE.BoxGeometry(0.34, 0.05, 0.05).translate(0, 0, 0.12)];
  },
};

const spectral = (() => {
  const S = CONFIG.elden.spectral, geos = {};
  const shape = id => geos[id] || (geos[id] = SPECTRAL_WEAPONS[id]());
  const material = () => new THREE.MeshStandardMaterial({ color: S.color, emissive: S.glow, emissiveIntensity: S.emissive, metalness: 0.6, roughness: 0.3,
    transparent: true, opacity: 0, depthWrite: false });
  // The weapon hand's set for one body: a group per weapon id, made on first use.
  function weaponFor(e, id) {
    const R = e.rig, set = R.spectral || (R.spectral = {});
    if (set[id]) return set[id];
    const g = new THREE.Group(), mat = material();
    for (const geo of shape(id)) g.add(new THREE.Mesh(geo, mat));
    const light = new THREE.PointLight(S.glow, 0, S.lightRange); light.position.z = 0.8; g.add(light);
    g.userData = { mat, light, k: 0 }; g.visible = false;
    R.weapon.add(g);
    return (set[id] = g);
  }
  let last = performance.now();
  // Every frame: the drawn attack's weapon fades in through the wind-up and strike, the rest fade out.
  function render(game) {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    for (const e of game.enemies) {
      const want = e.alive() && e.attack && e.attack.spectral && (e.state === ES.WINDUP || e.state === ES.ACTIVE) ? e.attack.spectral : null;
      if (want) weaponFor(e, want);
      for (const [id, g] of Object.entries(e.rig.spectral || {})) {
        const u = g.userData, on = id === want;
        u.k = clamp01(u.k + (on ? dt / S.fadeIn : -dt / S.fadeOut));
        g.visible = u.k > 0; u.mat.opacity = u.k; u.light.intensity = u.k * S.light;
      }
    }
  }
  return {
    attach() { Game.renderHooks.push(render); },
    // A thrown golden dagger (a projectile's `look: 'dagger'`), pointing along +z of the bolt.
    thrownDagger() {
      const g = new THREE.Group(), mat = material(); mat.opacity = 1;
      for (const geo of shape('dagger')) g.add(new THREE.Mesh(geo, mat));
      g.position.z = -0.35; g.scale.setScalar(1.3);
      return g;
    },
  };
})();
