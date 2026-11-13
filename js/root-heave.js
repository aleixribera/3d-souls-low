'use strict';
// ============================================================================
// The root's heave (pass 50, the Kindling Tree): a hit's `burrow` drawn (drawing only)
// ============================================================================
// Through the wind-up's first `from` the figure sinks into the floor (VIS.rootHeave.depth of its height); from there it
// is gone, shadow and all, and the floor heaves where it runs: clods of root and earth shoved up behind it, embers in the
// split, and a ring on the floor round it as wide as it will rise. Until `lock` the ring is dim and the heave moves; then it
// holds still, the ring burns bright and the clods swell over it. As the hit strikes the figure comes up through it in
// `rise` s, throwing earth and embers. The position is the enemy's own (Enemy.update moves it under the floor), so in a
// joined game the heave follows the server's tree. With reducedMotion() the ring does not pulse. Pooled InstancedMeshes;
// nothing allocated per frame.
const rootHeave = (() => {
  const C = VIS.rootHeave, CLODS = 72, RINGS = 6;
  const clodGeo = new THREE.IcosahedronGeometry(1, 0); clodGeo.scale(1, 0.6, 1);
  const clods = new THREE.InstancedMesh(clodGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }), CLODS);
  const flat = new THREE.RingGeometry(0.86, 1, 48); flat.rotateX(-Math.PI / 2);
  const disc = new THREE.CircleGeometry(1, 24); disc.rotateX(-Math.PI / 2);
  const add = o => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    polygonOffset: true, polygonOffsetFactor: -3, side: THREE.DoubleSide, ...o });
  const rings = new THREE.InstancedMesh(flat, add({}), RINGS);
  const glows = new THREE.InstancedMesh(disc, add({}), CLODS);   // the embers in the split under each clod
  const black = new THREE.Color(0, 0, 0);
  for (const m of [clods, rings, glows]) {
    for (let i = 0; i < m.count; i++) m.setColorAt(i, black);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false; m.visible = false; scene.add(m); pooledFx.push(m);
  }
  clods.renderOrder = 1; rings.renderOrder = 2; glows.renderOrder = 2;
  const dummy = new THREE.Object3D(), col = new THREE.Color(), earth = new THREE.Color(C.clodColor), ember = new THREE.Color(C.glowColor), ringCol = new THREE.Color(C.ring);
  const v = new THREE.Vector3();
  const RISE_EARTH = { color: C.clodColor, count: 26, speed: 6 }, RISE_EMBER = { color: C.glowColor, count: 18, speed: 5 };
  // Clods shoved up along the heave's way: { x, y, z, t, s, r } (t: age in s; s: size; r: turn).
  const trail = Array.from({ length: CLODS }, () => ({ on: false, x: 0, y: 0, z: 0, t: 0, s: 1, r: 0 }));
  let next = 0;
  function shove(x, y, z, s) {
    const c = trail[next]; next = (next + 1) % CLODS;
    c.on = true; c.x = x; c.y = y; c.z = z; c.t = 0; c.s = s; c.r = Math.random() * 6.28;
  }
  const last = new WeakMap();   // enemy -> { x, z, key, risen }: where it last shoved a clod, and the hit it rose from
  const smooth = k => k * k * (3 - 2 * k);
  function ringAt(i, at, floor, rad, k) {
    dummy.position.set(at.x, floor + 0.05, at.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(rad, 1, rad); dummy.updateMatrix();
    rings.setMatrixAt(i, dummy.matrix); rings.setColorAt(i, col.copy(ringCol).multiplyScalar(k));
  }
  function commit(m, n) { m.count = n; m.visible = n > 0; if (n) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; } }

  function render(game) {
    const dt = effectSlots.dt(), now = effectSlots.time(), calm = typeof reducedMotion === 'function' && reducedMotion();
    let ri = 0;
    for (const e of game.enemies) {
      const R = e.rig; if (!R) continue;
      const a = e.alive() ? e.attack : null, h = a && (e.state === ES.WINDUP || e.state === ES.ACTIVE) ? a.hits[e.hitIndex] : null;
      const B = h && h.burrow, key = e.attackNo * 64 + e.hitIndex, height = e.height || 2, floor = R.root.position.y;
      let sink = 0, under = false;
      if (B && e.state === ES.WINDUP) {
        const t = e.stateTime / h.startup;
        sink = smooth(clamp01(t / B.from)); under = t >= B.from;
        if (under) {
          // The heave: a clod every `step` m it runs, and a mound over it that swells once it holds still.
          const s = (e.def.scale || 1) / 2.5, L = last.get(e), locked = t >= B.lock;
          if (!L || L.key !== key) last.set(e, { x: R.root.position.x, z: R.root.position.z, key, risen: false });
          else if (Math.hypot(R.root.position.x - L.x, R.root.position.z - L.z) >= C.step * s * 2.5) {
            shove(R.root.position.x + (Math.random() - 0.5) * 0.8 * s, floor, R.root.position.z + (Math.random() - 0.5) * 0.8 * s, C.clod * s * (0.7 + Math.random() * 0.6));
            L.x = R.root.position.x; L.z = R.root.position.z;
          }
          const box = h.box || a.box, r = box.ring.to + box.ring.width / 2;   // as far as the rise reaches (js/combat.js)
          const hold = locked ? clamp01((t - B.lock) / (1 - B.lock)) : 0;
          const pulse = calm ? 1 : 0.8 + 0.2 * Math.sin(now * Math.PI * 4);   // 2 Hz
          if (ri < RINGS - 1) {
            ringAt(ri++, R.root.position, floor, r, locked ? (0.7 + 0.8 * hold) * pulse : 0.3);
            ringAt(ri++, R.root.position, floor, r * (locked ? 0.55 : 0.4), locked ? 0.5 * hold : 0.12);
          }
          if (locked && !calm && Math.random() < 20 * dt) shove(R.root.position.x + (Math.random() - 0.5) * r * 0.9, floor, R.root.position.z + (Math.random() - 0.5) * r * 0.9, C.clod * s * (0.5 + hold));
        }
      } else if (B && e.state === ES.ACTIVE) {
        sink = 1 - smooth(clamp01(e.stateTime / C.rise));
        const L = last.get(e);
        if (L && L.key === key && !L.risen) {   // once per rise: the floor breaks
          L.risen = true; v.set(R.root.position.x, floor + 0.4, R.root.position.z);
          spawnBurst(v, RISE_EARTH); spawnBurst(v, RISE_EMBER);
        }
      }
      if (sink > 0) R.root.position.y = floor - C.depth * height * sink;
      if (under) { R.root.visible = R.shadow.visible = false; R.heaveHidden = true; }
      else if (R.heaveHidden) { R.root.visible = true; R.heaveHidden = false; }   // the shadow is placed afresh every frame (Rig.place)
    }
    // The clods: shoved up out of the floor, settling, and sinking back; embers in the split under each while it is fresh.
    let ci = 0;
    for (const c of trail) {
      if (!c.on) continue;
      c.t += dt;
      if (c.t >= C.life) { c.on = false; continue; }
      const k = c.t / C.life, up = Math.min(1, c.t / 0.18), down = k > 0.6 ? (k - 0.6) / 0.4 : 0;
      dummy.position.set(c.x, c.y + c.s * (0.3 * up - 0.9 * down), c.z); dummy.rotation.set(0.3, c.r, 0.2); dummy.scale.setScalar(c.s * (0.6 + 0.4 * up)); dummy.updateMatrix();
      clods.setMatrixAt(ci, dummy.matrix); clods.setColorAt(ci, col.copy(earth));
      dummy.position.set(c.x, c.y + 0.04, c.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(c.s * 1.5); dummy.updateMatrix();
      glows.setMatrixAt(ci, dummy.matrix); glows.setColorAt(ci, col.copy(ember).multiplyScalar(0.8 * (1 - k) * (1 - k)));
      ci++;
    }
    commit(clods, ci); commit(glows, ci); commit(rings, ri);
  }
  Game.renderHooks.push(render);
  return { live: () => ({ clods: clods.visible ? clods.count : 0, rings: rings.visible ? rings.count : 0 }) };
})();
