'use strict';
// ============================================================================
// Spectral weapons (v5.3): golden weapons conjured for one attack (Margit's holy dagger, hammer and sword)
// ============================================================================
// An enemy attack with `spectral: '<id>'` (an id of SPECTRAL_WEAPONS) shows that weapon in the weapon hand from the start
// of its wind-up to the end of its follow-through, fading in and out (CONFIG.elden.spectral), with a warm light: the cue
// that the blow is holy and cannot be parried. Drawing only: the hitbox is the attack's own box, as for every attack.
// Each builder returns { geos, look }: geometry along +z from the hand, like KIT_WEAPONS (js/bodykit.js), in metres at
// scale 1, and `look`: 'holy' (marbled golden light, the holyLight texture) or 'prism' (a pale blade with a shifting sheen).
// An optional `bone` (v5.5) mounts it on that rig bone instead of the weapon hand: the Crucible Knight's wings and tails.
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
  // Morgott's golden spear (v5.5): a long shaft and a broad leaf head, held and thrown.
  spear() {
    return { look: 'holy', geos: [new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6).rotateX(Math.PI / 2).translate(0, 0, 0.7),
      new THREE.ConeGeometry(0.09, 0.55, 4).scale(1, 1, 0.3).rotateX(Math.PI / 2).translate(0, 0, 2.15)] };
  },
  // Aspect of the Crucible: Wings (v5.5): two fans of long golden feathers spreading up and out from the shoulder blades.
  wings() {
    const geos = [];
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
      const a = 0.25 + i * 0.2, len = 0.75 + Math.sin(i / 6 * Math.PI) * 0.45 + (6 - i) * 0.05;
      const f = new THREE.ConeGeometry(0.07, len, 4, 1).scale(1, 1, 0.25).translate(0, len / 2, 0);
      f.rotateZ(-s * a); f.rotateY(s * 0.35); f.translate(s * 0.1, 0.5, -0.24);
      geos.push(f);
    }
    return { look: 'holy', bone: 'chest', geos };
  },
  // Aspect of the Crucible: Tail (v5.5): a scaled golden tail from the small of the back, sweeping low behind him.
  tail() { return { look: 'holy', bone: 'spin', geos: crucibleTail(1) }; },
  // The double sweep's second tail: the same, about two and a half times as long.
  tailGreat() { return { look: 'holy', bone: 'spin', geos: crucibleTail(2.5) }; },
};
// A tapering chain of segments curving back and down, `k` times the base length (about 1.3 m at scale 1).
function crucibleTail(k) {
  const geos = [], n = 9;
  let x = 0, y = -0.05, z = -0.18, a = 0.5;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), len = 0.16 * k, r = 0.085 * (1 - t * 0.8);
    const seg = new THREE.CylinderGeometry(r * 0.8, r, len, 6).translate(0, len / 2, 0).rotateX(-Math.PI / 2 - a);
    seg.translate(x, y, z); geos.push(seg);
    z -= Math.cos(a) * len; y -= Math.sin(a) * len * 0.5; x += Math.sin(t * 2.4) * 0.02 * k; a = Math.max(-0.2, a - 0.12);
  }
  return geos;
}

const spectral = (() => {
  const S = CONFIG.elden.spectral, geos = {};
  const shape = id => geos[id] || (geos[id] = SPECTRAL_WEAPONS[id]());
  // 'holy': the marbled holyLight texture lights itself; 'prism': a pale blade whose sheen hue drifts (render, below).
  const material = look => {
    const tex = TEXLIB.get('holyLight', { size: 256 }).map;
    if (look === 'rot')   // v5.9 (Malenia): scarlet rot, a translucent crimson glow (her phantoms and the Aeonia bloom)
      return new THREE.MeshStandardMaterial({ color: 0xc02030, emissive: 0xff2a3a, emissiveIntensity: 1.2, roughness: 0.6, side: THREE.DoubleSide,
        transparent: true, opacity: 0, depthWrite: false });
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
    light.userData.legacyEffectLight = true; light.visible = false;   // shared effect-light pool
    R.mats.push(mat);   // disposed with its rig, rather than retained after every retry
    for (const geo of W.geos) geo.userData.shared = true;
    g.userData = { mat, light, k: 0, warmUp: true }; g.visible = false;
    (W.bone ? R.bones[W.bone] : R.weapon).add(g);
    return (set[id] = g);
  }
  // Every frame: the drawn attack's weapon fades in through the wind-up and strike, the rest fade out. Its groups live
  // in the rig (freed with it), so nothing is kept per body here; the clock is the shared effect clock.
  function render(game) {
    const dt = effectSlots.dt(), now = effectSlots.time() * 1000;
    for (const e of game.enemies) {
      const want = e.alive() && e.attack && e.attack.spectral && (e.state === ES.WINDUP || e.state === ES.ACTIVE) ? e.attack.spectral : null;
      if (want) weaponFor(e, want);
      const set = e.rig.spectral;
      if (set) for (const id in set) {
        const g = set[id], u = g.userData, on = id === want;
        u.k = clamp01(u.k + (on ? dt / S.fadeIn : -dt / S.fadeOut));
        g.visible = u.k > 0; u.mat.opacity = u.k; u.light.intensity = u.k * S.light;
        if (on && id === 'sword') u.mat.emissive.setHSL((now / 1600) % 1, 0.7, 0.45);   // the prism sheen drifts through the hues
      }
    }
  }
  return {
    attach() { Game.renderHooks.push(render); },
    prepare(enemies) {
      for (const e of enemies) for (const a of e.baseDef.attacks) if (a.spectral) weaponFor(e, a.spectral);
    },
    // A thrown golden dagger (a projectile's `look: 'dagger'`), pointing along +z of the bolt.
    thrownDagger() {
      const W = shape('dagger'), g = new THREE.Group(), mat = material(W.look); mat.opacity = 1;
      for (const geo of W.geos) g.add(new THREE.Mesh(geo, mat));
      g.position.z = -0.35; g.scale.setScalar(1.3);
      return g;
    },
  };
})();
