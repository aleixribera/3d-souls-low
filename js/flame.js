'use strict';
// ============================================================================
// Flame breath and grafted parts (v5.4, Godrick the Grafted): drawing only
// ============================================================================
// An enemy attack with `breath: { len, width, from? }` shows a jet of fire from the off hand (the dragon head) out to
// the far end of its hit's box, from the first strike of hit `from` (default 0) until its recovery; through the first
// wind-up the jet is not drawn (the arm raising is the telegraph). The hitbox is the attack's own box, as for every attack, and the
// jet is aimed along it, so what burns is what is drawn.
// A phase's `reveal: ['<slot>']` shows those material slots of the model (hidden by its `hidden`), from the moment the
// phase's opener (an `invulnerable` attack, the arm chop) strikes, with a burst of fire. A phase's `conceal: ['<slot>' | 'weapon']`
// hides them the same way (v5.5, Godfrey casting off Serosh, his armour and his axe), with a burst of dust.
const flame = (() => {
  const F = CONFIG.elden.flame, V3 = THREE.Vector3, from = new V3(), to = new V3(), dir = new V3(), Z = new V3(0, 0, 1);
  const coneGeo = (r, len) => new THREE.ConeGeometry(r, len, 12, 1, true).rotateX(-Math.PI / 2).translate(0, 0, len / 2);
  const UNIT = coneGeo(0.5, 1), jets = [];   // every jet made, with its owner (dropped once the owner leaves the game)
  function jetFor(e) {
    const R = e.rig;
    if (R.flameJet) return R.flameJet;
    const g = new THREE.Group(), layers = [];
    for (const [color, op, w] of [[F.outer, F.opacity * 0.55, 1], [F.color, F.opacity, 0.7], [F.core, F.opacity, 0.35]]) {
      const m = new THREE.Mesh(UNIT, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.userData = { op, w }; g.add(m); layers.push(m);
    }
    const light = new THREE.PointLight(F.color, 0, F.lightRange); g.add(light);
    light.userData.legacyEffectLight = true; light.visible = !visuals.quality().combatFx;
    g.userData.warmUp = true;
    g.visible = false; scene.add(g);
    jets.push({ e, g });
    return (R.flameJet = { g, layers, light, k: 0 });
  }
  const burningNow = e => {
    const a = e.attack, B = a && a.breath;
    if (!B || !e.alive()) return false;
    if (e.state === ES.ACTIVE) return e.hitIndex >= (B.from ?? 0);
    return e.state === ES.WINDUP && e.hitIndex > (B.from ?? 0);
  };
  function clean(enemies) {
    for (let i = jets.length - 1; i >= 0; i--) if (!enemies.includes(jets[i].e)) {
      scene.remove(jets[i].g); for (const m of jets[i].g.children) if (m.material) m.material.dispose(); jets.splice(i, 1);
    }
  }
  let last = performance.now();
  function render(game) {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000), t = now / 1000; last = now;
    clean(game.enemies);
    for (const e of game.enemies) {
      const R = e.rig; if (!R) continue;
      // Grafted parts: hidden until the phase that reveals them has struck its opener.
      const reveal = e.def.reveal;
      if (reveal && R.slotMeshes) {
        const opening = e.attack && e.attack.invulnerable && e.state === ES.WINDUP && e.hitIndex === 0;
        if (!opening && !R.revealed) {
          R.revealed = true;
          for (const sl of reveal) if (R.slotMeshes[sl]) R.slotMeshes[sl].visible = true;
          if (R.elbowL) { R.elbowL.getWorldPosition(from); spawnBurst({ x: from.x, y: from.y, z: from.z }, F.revealBurst); }
        }
      }
      // Cast-off parts (a phase's `conceal`, v5.5): hidden once its invulnerable opener has begun and struck ('weapon' = the weapon).
      const conceal = e.def.conceal;
      if (conceal && !R.concealed) {
        const opening = e.attack && e.attack.invulnerable && e.state === ES.WINDUP && e.hitIndex === 0;
        if (!opening && !e.opener) {   // not while a phase-1 attack still runs (the opener waits for it)
          R.concealed = true;
          for (const sl of conceal) {
            if (sl === 'weapon') { for (const m of R.weaponMeshes || []) m.visible = false; if (R.glint) R.glint.sprite.visible = false; }
            else if (R.slotMeshes && R.slotMeshes[sl]) R.slotMeshes[sl].visible = false;
          }
          if (R.chest) { R.chest.getWorldPosition(from); spawnBurst({ x: from.x, y: from.y, z: from.z }, F.concealBurst); }
        }
      }
      const a = e.attack, on = burningNow(e);
      if (!on && !R.flameJet) continue;
      const J = jetFor(e);
      J.k = clamp01(J.k + (on ? dt / F.fadeIn : -dt / F.fadeOut));
      J.g.visible = J.k > 0;
      if (!J.g.visible || !a || !a.breath) continue;
      // From the dragon's mouth (the off hand) to the far end of the hit's box.
      const box = a.hits[e.hitIndex].box || a.box, s = Math.sin(e.yaw), c = Math.cos(e.yaw);
      if (R.elbowL) R.elbowL.getWorldPosition(from); else from.set(e.x + s, e.y + 1.4, e.z + c);
      to.set(e.x + s * (box.fwd + box.d / 2), e.y + box.y * 0.6, e.z + c * (box.fwd + box.d / 2));
      dir.subVectors(to, from); const len = Math.max(0.5, Math.min(a.breath.len, dir.length()));
      J.g.position.copy(from); J.g.quaternion.setFromUnitVectors(Z, dir.normalize());
      for (const [i, m] of J.layers.entries()) {
        const f = 1 + F.flicker * Math.sin(t * (23 + i * 7) + i * 2);
        m.scale.set(a.breath.width * m.userData.w * f, a.breath.width * m.userData.w * f, len * (0.92 + 0.08 * f));
        m.material.opacity = m.userData.op * J.k;
      }
      J.light.position.set(0, 0, len * 0.5); J.light.intensity = F.light * J.k;
      if (on && Math.random() < F.embers * dt) {
        const k = Math.random();
        spawnBurst({ x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k), z: lerp(from.z, to.z, k) }, F.emberBurst);
      }
    }
  }
  return {
    attach() { Game.renderHooks.push(render); },
    prepare(enemies) { clean(enemies); for (const e of enemies) if (e.baseDef.attacks.some(a => a.breath)) jetFor(e); },
  };
})();
