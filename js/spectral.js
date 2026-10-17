'use strict';
// ============================================================================
// Spectral weapons (v5.3): golden weapons conjured for one attack (Margit's holy dagger, hammer and sword)
// ============================================================================
// An enemy attack with `spectral: '<id>'` (an id of SPECTRAL_WEAPONS) shows that weapon in the weapon hand from the start
// of its wind-up to the end of its follow-through, fading in and out (CONFIG.elden.spectral), with a warm light: the cue
// that the blow is holy and cannot be parried. Drawing only: the hitbox is the attack's own box, as for every attack.
// Each builder returns { geos, look }: geometry along +z from the hand, like KIT_WEAPONS (js/bodykit.js), in metres at
// scale 1, and `look`: 'holy' (marbled golden light, the holyLight texture) or 'prism' (a pale blade with a shifting sheen).
const SPECTRAL_WEAPONS = {
  dagger() {
    return { look: 'holy', geos: [new THREE.BoxGeometry(0.05, 0.012, 0.5).translate(0, 0, 0.35), new THREE.BoxGeometry(0.16, 0.03, 0.03).translate(0, 0, 0.08)] };
  },
  // A great hammer of light: a long haft with knobbed ends, a heavy squared head wider than his shoulders.
  hammer() {
    const head = new THREE.BoxGeometry(0.62, 0.48, 0.5, 2, 2, 2);
    const pos = head.attributes.position;   // rounded, slightly bellied block
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const k = 1 + 0.12 * (1 - Math.abs(x) / 0.31); pos.setXYZ(i, x, y * k, z * k); }
    head.computeVertexNormals(); head.rotateY(Math.PI / 2).translate(0, 0, 1.5);
    return { look: 'holy', geos: [new THREE.CylinderGeometry(0.045, 0.05, 1.5, 7).rotateX(Math.PI / 2).translate(0, 0, 0.6),
      new THREE.SphereGeometry(0.08, 7, 5).translate(0, 0, -0.16), new THREE.SphereGeometry(0.075, 7, 5).translate(0, 0, 0.3),
      new THREE.CylinderGeometry(0.07, 0.07, 0.1, 7).rotateX(Math.PI / 2).translate(0, 0, 1.22), head] };
  },
  // A long, faintly curved blade of shimmering light.
  sword() {
    const blade = new THREE.BoxGeometry(0.1, 0.018, 1.9, 1, 1, 10), pos = blade.attributes.position;
    for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i), t = (z + 0.95) / 1.9; pos.setX(i, pos.getX(i) * (1 - 0.6 * t) + t * t * 0.18); }
    blade.computeVertexNormals(); blade.translate(0, 0, 1.08);
    return { look: 'prism', geos: [blade, new THREE.BoxGeometry(0.3, 0.05, 0.05).translate(0, 0, 0.12), new THREE.CylinderGeometry(0.025, 0.025, 0.24, 6).rotateX(Math.PI / 2)] };
  },
};

const spectral = (() => {
  const S = CONFIG.elden.spectral, geos = {};
  const shape = id => geos[id] || (geos[id] = SPECTRAL_WEAPONS[id]());
  // 'holy': the marbled holyLight texture lights itself; 'prism': a pale blade whose sheen hue drifts (render, below).
  const material = look => {
    const tex = TEXLIB.get('holyLight', { size: 256 }).map;
    return look === 'prism'
      ? new THREE.MeshStandardMaterial({ color: 0xe8e4f0, emissive: 0xb090ff, emissiveIntensity: 0.9, metalness: 0.9, roughness: 0.15, transparent: true, opacity: 0, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color: S.color, map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: S.emissive, metalness: 0.3, roughness: 0.35,
          transparent: true, opacity: 0, depthWrite: false });
  };
  // The weapon hand's set for one body: a group per weapon id, made on first use.
  function weaponFor(e, id) {
    const R = e.rig, set = R.spectral || (R.spectral = {});
    if (set[id]) return set[id];
    const g = new THREE.Group(), W = shape(id), mat = material(W.look);
    for (const geo of W.geos) g.add(new THREE.Mesh(geo, mat));
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
        if (on && id === 'sword') u.mat.emissive.setHSL((now / 1600) % 1, 0.7, 0.45);   // the prism sheen drifts through the hues
      }
    }
  }
  return {
    attach() { Game.renderHooks.push(render); },
    // A thrown golden dagger (a projectile's `look: 'dagger'`), pointing along +z of the bolt.
    thrownDagger() {
      const W = shape('dagger'), g = new THREE.Group(), mat = material(W.look); mat.opacity = 1;
      for (const geo of W.geos) g.add(new THREE.Mesh(geo, mat));
      g.position.z = -0.35; g.scale.setScalar(1.3);
      return g;
    },
  };
})();
