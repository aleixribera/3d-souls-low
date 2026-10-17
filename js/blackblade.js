'use strict';
// ============================================================================
// The Black Blade (v5.8, Maliketh): drawing only
// ============================================================================
// An enemy attack with `sphere: { fwd, r }` shows the Destined Death sphere: a ball of spinning crimson cuts centred `fwd`
// m ahead of the owner, from its first strike to the end of its last follow-through. The hitboxes are the attack's own
// boxes (centred there too), so what shreds is what is drawn.
// A hit with `line: true` throws bursts along its box as the strike opens (the line blast, the claw's shockwaves): gold for
// a `destined` attack, stone otherwise. A Destined Death hit on the player bleeds crimson off them.
// The robe shed: a phase's `reveal` shows the new slots (js/flame.js); its `conceal` slots are hidden here at the same
// moment (once the invulnerable opener strikes), with a burst of torn cloth. js/flame.js may hide them too: harmless.
// No lights are added (a new light recompiles every shader).
const blackBlade = (() => {
  Object.assign(KIT.parts, MALIKETH_PARTS);   // his blades and muzzle (js/data/bosses/maliketh.js)
  const B = CONFIG.elden.blackBlade, spheres = [], at = new THREE.Vector3();
  function sphereFor(e) {
    const R = e.rig;
    if (R.deathSphere) return R.deathSphere;
    const g = new THREE.Group(), shells = [];
    for (const [color, r, op] of [[B.color, 1, B.opacity * 0.6], [B.core, 0.72, B.opacity], [B.color, 0.45, B.opacity]]) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending }));
      m.userData = { r, op }; g.add(m); shells.push(m);
    }
    g.visible = false; scene.add(g);
    spheres.push({ e, g });
    return (R.deathSphere = { g, shells, k: 0 });
  }
  const shredding = e => e.alive() && e.attack && e.attack.sphere && (e.state === ES.ACTIVE || (e.state === ES.WINDUP && e.hitIndex > 0));
  let last = performance.now();
  function render(game) {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000), t = now / 1000; last = now;
    for (let i = spheres.length - 1; i >= 0; i--) if (!game.enemies.includes(spheres[i].e)) {
      scene.remove(spheres[i].g); for (const m of spheres[i].g.children) if (m.material) { m.material.dispose(); m.geometry.dispose(); }
      spheres.splice(i, 1);
    }
    for (const e of game.enemies) {
      const R = e.rig; if (!R) continue;
      const conceal = e.def.conceal;
      if (conceal && R.slotMeshes && !R.shed && !(e.attack && e.attack.invulnerable && e.state === ES.WINDUP && e.hitIndex === 0)) {
        R.shed = true;
        for (const sl of conceal) if (R.slotMeshes[sl]) R.slotMeshes[sl].visible = false;
        if (R.chest) { R.chest.getWorldPosition(at); spawnBurst({ x: at.x, y: at.y, z: at.z }, B.shed); }
      }
      const on = shredding(e);
      if (!on && !R.deathSphere) continue;
      const S = sphereFor(e);
      S.k = clamp01(S.k + dt * (on ? 8 : -3));
      S.g.visible = S.k > 0;
      if (!S.g.visible) continue;
      const sp = (e.attack && e.attack.sphere) || S.last; if (!sp) continue;
      S.last = sp;
      S.g.position.set(e.x + Math.sin(e.yaw) * sp.fwd, e.y + sp.r * 0.6, e.z + Math.cos(e.yaw) * sp.fwd);
      for (const [i, m] of S.shells.entries()) {
        const f = 1 + 0.08 * Math.sin(t * (31 + i * 11));
        m.scale.setScalar(sp.r * m.userData.r * f * (0.6 + 0.4 * S.k));
        m.rotation.set(t * B.spin * (i % 2 ? -1 : 1), t * B.spin * 0.7, t * B.spin * 0.4 * i);
        m.material.opacity = m.userData.op * S.k;
      }
    }
  }
  function attach() {
    Game.renderHooks.push(render);
    events.on('attackPhase', d => {
      const e = d.actor, a = d.attack, hit = a && a.hits && a.hits[d.hitIndex];
      if (!hit || !hit.line || d.phase !== PHASE.ACTIVE || !e || e.isPlayer) return;
      const box = hit.box || a.box, s = Math.sin(e.yaw), c = Math.cos(e.yaw), n = B.line.bursts;
      for (let i = 0; i < n; i++) {
        const f = box.fwd - box.d / 2 + box.d * (i + 0.5) / n;
        spawnBurst({ x: e.x + s * f, y: e.y + 0.3, z: e.z + c * f }, a.destined ? B.line.burst : B.line.rock);
      }
    });
    events.on('destinedDeath', d => spawnBurst({ x: d.body.x, y: d.body.y + d.body.height * 0.6, z: d.body.z }, B.doom));
  }
  return { attach };
})();
