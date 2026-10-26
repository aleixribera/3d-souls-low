'use strict';
// ============================================================================
// Holy light (v5.7, Radagon of the Golden Order): drawing only
// ============================================================================
// A teleport (a hit's `blink`, js/enemy.js) hides the body while it rushes unseen and flashes gold where it leaves and
// where it appears (event `enemyBlink`). A hit's `sigil: r` draws a golden rune of radius r on the floor where its box
// lands, from the start of its wind-up, brightening toward the strike, then a pillar of light as it erupts. The hitbox is
// the hit's own box, as for every attack: the rune only shows where it already is. Tuning: CONFIG.elden.holy.
const holy = (() => {
  const H = CONFIG.elden.holy, flashes = [];
  const add = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  // Shared geometry (unit radius, flat on the floor): two rings, the Elden Ring's crossing arcs and a vertical stroke.
  const flat = g => g.rotateX(-Math.PI / 2);
  const RING = flat(new THREE.RingGeometry(0.86, 1, 40));
  const RUNE = (() => {
    const parts = [flat(new THREE.RingGeometry(0.6, 0.66, 32)), flat(new THREE.PlaneGeometry(0.05, 1.5)),
      flat(new THREE.RingGeometry(0.34, 0.39, 24, 1, 0, Math.PI)).translate(0, 0, 0.12), flat(new THREE.RingGeometry(0.34, 0.39, 24, 1, Math.PI, Math.PI)).translate(0, 0, -0.22),
      flat(new THREE.PlaneGeometry(1.1, 0.04)).translate(0, 0, 0.38), flat(new THREE.RingGeometry(0.92, 1, 40))];
    return mergeGeos(parts);
  })();
  const PILLAR = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true).translate(0, 0.5, 0);
  function mergeGeos(list) {   // plain merge of non-indexed copies (flat runes only, built once)
    const pos = [];
    for (const g of list) { const n = g.toNonIndexed(), a = n.attributes.position.array; for (let i = 0; i < a.length; i++) pos.push(a[i]); }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return out;
  }

  // ---- teleport flashes: a small reused pool of floor rings ----
  function flash(x, y, z) {
    let f = flashes.find(f => f.t >= H.ringTime);
    if (!f) { f = { mesh: new THREE.Mesh(RING, add(H.color)), t: 0 }; scene.add(f.mesh); flashes.push(f); }
    f.t = 0; f.mesh.position.set(x, y + 0.05, z); f.mesh.visible = true;
    spawnBurst({ x, y: y + 1.6, z }, H.burst);
  }
  events.on('enemyBlink', d => { const e = d.enemy; flash(e.x, e.y, e.z); });

  // ---- sigils: one per enemy that uses them, made on first need (js/effect-slots.js), freed once it leaves the game ----
  const sigils = effectSlots.slots((S, e) => {
    scene.remove(S.g); for (const m of S.g.children) if (m.material) m.material.dispose();
    if (e.rig && e.rig.holySigil === S) e.rig.holySigil = null;
  });
  function sigilFor(e) {
    if (e.rig.holySigil) return e.rig.holySigil;
    return (e.rig.holySigil = sigils.acquire(e, makeSigil));
  }
  function makeSigil() {
    const g = new THREE.Group(), rune = new THREE.Mesh(RUNE, add(H.color)), pillar = new THREE.Mesh(PILLAR, add(H.core));
    const light = new THREE.PointLight(H.color, 0, H.lightRange); light.position.y = 1;
    light.userData.legacyEffectLight = true; light.visible = false;   // shared effect-light pool
    g.userData.warmUp = true;
    g.add(rune, pillar, light); g.visible = false; scene.add(g);
    return { g, rune, pillar, light, at: null, k: 0 };
  }

  function render(game) {
    const dt = effectSlots.dt(), now = effectSlots.time() * 1000;   // the shared effect clock (ms, for the rune's shimmer)
    for (const f of flashes) if (f.mesh.visible) {
      f.t += dt; const k = Math.min(1, f.t / H.ringTime), s = 0.4 + k * H.ring;
      f.mesh.scale.set(s, 1, s); f.mesh.material.opacity = 0.9 * (1 - k); f.mesh.visible = k < 1;
    }
    sigils.sweep(game.enemies);
    for (const e of game.enemies) {
      const R = e.rig;
      // Unseen while it rushes (restored the frame it reappears).
      const hide = e.blinkLeft > 0;
      if (hide) { R.root.visible = R.shadow.visible = false; R.holyHidden = true; }
      else if (R.holyHidden) { R.root.visible = true; R.holyHidden = false; }
      const a = e.attack, hit = a && e.alive() && (e.state === ES.WINDUP || e.state === ES.ACTIVE) ? a.hits[e.hitIndex] : null;
      if (!(hit && hit.sigil) && !R.holySigil) continue;
      const S = sigilFor(e);
      if (hit && hit.sigil) {
        if (S.at !== hit || !S.g.visible) {   // the rune is etched where the hit's box will land, then stays put
          const box = hit.box || a.box, s = Math.sin(e.yaw), c = Math.cos(e.yaw), f = box.ring ? 0 : box.fwd;
          S.g.position.set(e.x + s * f, e.y + 0.04, e.z + c * f); S.g.scale.set(hit.sigil, 1, hit.sigil); S.at = hit;
        }
        S.g.visible = true; S.k = 1;
        const wind = e.state === ES.WINDUP ? clamp01(e.stateTime / hit.startup) : 1;
        S.rune.material.opacity = lerp(H.sigilBase, H.sigilPeak, wind * wind) * (0.9 + 0.1 * Math.sin(now / 60));
        S.rune.rotation.y += dt * 0.6;
        S.pillar.visible = e.state === ES.ACTIVE; S.pillar.scale.set(0.55, H.pillar / hit.sigil, 0.55);
        S.pillar.material.opacity = 0.7; S.light.intensity = H.light * (0.3 + wind);
      } else if (S.g.visible) {   // the strike is over: the pillar fades
        S.k = Math.max(0, S.k - dt / H.pillarTime);
        S.rune.material.opacity = H.sigilPeak * S.k; S.pillar.material.opacity = 0.7 * S.k; S.light.intensity = H.light * S.k;
        if (S.k <= 0) { S.g.visible = false; S.at = null; }
      }
    }
  }
  return {
    attach() { Game.renderHooks.push(render); },
    prepare(enemies) { sigils.sweep(enemies); for (const e of enemies) if (e.baseDef.attacks.some(a => a.hits.some(h => h.sigil))) sigilFor(e); },
  };
})();
