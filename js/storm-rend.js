'use strict';
// ============================================================================
// Storm and rend (pass 48, Mother Agathe, the Rending Hand): what her hook holds of you, and the storm at her back
// (drawing only)
// ============================================================================
// - The pieces: each piece of your bar her hook has torn away (Player.rend) hangs on the hook's inner curve, a coal of
//   your own red, and flies to it from your chest as it is torn; each blow you land on her flies one back to you
//   (Player.reclaim). A wound that closes drops what it held as ash. Only your own pieces: what she holds of you.
// - The bolts: a hit's `bolt` (Enemy.noteBolt) shows its mark on the floor where it will fall, a ring that follows you
//   and then holds still (brighter, tighter: step off it), and strikes as a jagged column of light from the clouds.
// - The storm: a phase's `storm` shows the model's `storm` slots (the seam of lightning along the hook, the sign on her
//   breast) and throws sparks off the hook.
// With reducedMotion() no flicker. One InstancedMesh each for marks, bolt segments and pieces; nothing allocated per frame.
const stormRend = (() => {
  const C = VIS.stormRend, POOL = 6, SEG = C.segs;
  const flat = new THREE.RingGeometry(0.82, 1, 40); flat.rotateX(-Math.PI / 2);
  const add = o => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, ...o });
  const marks = new THREE.InstancedMesh(flat, add({ polygonOffset: true, polygonOffsetFactor: -3, side: THREE.DoubleSide }), POOL * 2);
  // A bolt segment: a soft vertical strip, white at its spine, drawn into a canvas once.
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 4;
    const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 32, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.42, 'rgba(255,255,255,0.5)'); grd.addColorStop(0.5, 'rgba(255,255,255,1)');
    grd.addColorStop(0.58, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 32, 4);
    return new THREE.CanvasTexture(c);
  })();
  const segGeo = new THREE.PlaneGeometry(1, 1); segGeo.translate(0, 0.5, 0);   // stands on its lower end
  const bolts = new THREE.InstancedMesh(segGeo, add({ map: tex, side: THREE.DoubleSide }), POOL * SEG * 2);
  const pieceGeo = new THREE.OctahedronGeometry(1, 0); pieceGeo.scale(0.75, 1.25, 0.75);
  const pieces = new THREE.InstancedMesh(pieceGeo, add({}), 12);
  const black = new THREE.Color(0, 0, 0);
  for (const m of [marks, bolts, pieces]) {
    for (let i = 0; i < m.count; i++) m.setColorAt(i, black);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false; m.visible = false; m.renderOrder = 2; scene.add(m); pooledFx.push(m);
  }
  const dummy = new THREE.Object3D(), col = new THREE.Color(), markCol = new THREE.Color(C.markColor), boltCol = new THREE.Color(C.boltColor);
  const pieceCol = new THREE.Color(C.pieceColor), backCol = new THREE.Color(C.backColor);
  const v = new THREE.Vector3(), w = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1), MARKS = POOL * 2, BOLTS = POOL * SEG * 2, PIECES = 12;
  const SPARK = { color: C.stormColor, count: 2, speed: 2.4 }, STRIKE = { color: C.boltColor, count: 18, speed: 7 }, ASH = { color: 0x5a5450, count: 6, speed: 1.2 };
  const RED = { color: C.pieceColor, count: 10, speed: 3.5 }, BACK = { color: C.backColor, count: 8, speed: 2.5 };
  // Where piece k (0..) hangs on the hook: along the crescent's inner curve, in the weapon bone's frame (tools/blender/agathe.py).
  const HANG = [[0, 0.16, 1.6], [0, 0.26, 1.76], [0, 0.2, 1.95], [0, 0.08, 2.0]];
  function hookPoint(e, k, out) {
    const h = HANG[Math.min(k, HANG.length - 1)];
    if (!e.rig || !e.rig.weapon) return out.set(e.x, e.y + 2.5, e.z);
    return e.rig.weapon.localToWorld(out.set(h[0], h[1], h[2]));
  }
  const chestOf = (b, out) => out.set(b.x, b.y + (b.height || 1.8) * 0.6, b.z);
  // Pieces in flight: { body, enemy, k, t, back } (to the hook, or `back` to you).
  const flights = Array.from({ length: 8 }, () => ({ on: false, body: null, enemy: null, k: 0, t: 0, back: false }));
  function fly(body, enemy, k, back) {
    const f = flights.find(f => !f.on) || flights[0];
    f.on = true; f.body = body; f.enemy = enemy; f.k = k; f.t = 0; f.back = back;
  }
  const mine = d => d.body === Game.player;
  events.on('rend', d => { if (!mine(d)) return; spawnBurst(chestOf(d.body, v), RED); fly(d.body, d.enemy, d.piece - 1, false); });
  events.on('reclaim', d => {
    if (!mine(d) || !d.enemy) return;
    for (let i = 0; i < d.pieces; i++) fly(d.body, d.enemy, d.left + i, true);
  });
  events.on('rentClosed', d => { if (mine(d) && d.enemy && d.enemy.rig) for (let i = 0; i < d.pieces; i++) spawnBurst(hookPoint(d.enemy, i, v), ASH); });

  const struck = new WeakMap();   // enemy -> the bolt key last struck (one burst and shake per bolt)
  const MARK_R = [1, 0.35], MARK_K = [1, 0.6], BOLT_W = [1, 2.5], BOLT_K = [1.0, 0.16];   // the mark's two rings; the bolt's core and glow
  function commit(m, n) { m.count = n; m.visible = n > 0; if (n) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; } }
  function render(game) {
    const dt = effectSlots.dt(), now = effectSlots.time(), calm = typeof reducedMotion === 'function' && reducedMotion();
    let mi = 0, bi = 0, pi = 0;
    for (const e of game.enemies) {
      // The storm at her back: the storm slots, and sparks off the hook.
      const storm = !!(e.def && e.def.storm) && e.alive();
      if (e.rig && e.rig.stormMeshes) {
        for (const m of e.rig.stormMeshes) m.visible = storm;
        if (storm && !e.asleep && !calm && Math.random() < 6 * dt) spawnBurst(hookPoint(e, Math.floor(Math.random() * 3), v), SPARK);
      }
      // The bolt: its mark through the wind-up, its column as it strikes.
      const B = e.bolt, a = e.alive() ? e.attack : null, h = a && a.hits[e.hitIndex];
      if (!B || !h || !h.bolt || B.key !== e.attackNo * 64 + e.hitIndex || mi >= MARKS - 1) continue;
      if (e.state === ES.WINDUP) {
        const t = clamp(e.stateTime / h.startup, 0, 1), flick = calm ? 1 : 0.85 + 0.15 * Math.sin(e.stateTime * 15);   // under 3 Hz
        const r = C.mark / 2 * (B.locked ? 1 - 0.25 * t : 1.15);
        for (let L = 0; L < 2; L++) {
          const s = r * MARK_R[L], k = MARK_K[L];
          dummy.position.set(B.x, B.y + 0.05, B.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(s, 1, s); dummy.updateMatrix();
          marks.setMatrixAt(mi, dummy.matrix); marks.setColorAt(mi, col.copy(markCol).multiplyScalar((0.25 + (B.locked ? 1.2 : 0.5) * t) * k * flick)); mi++;
        }
      } else if (e.state === ES.ACTIVE && e.stateTime < C.flash + h.active) {
        const key = e.attackNo * 64 + e.hitIndex;
        if (struck.get(e) !== key) {
          struck.set(e, key);
          spawnBurst(v.set(B.x, B.y + 0.3, B.z), STRIKE);
          if (Math.hypot(Game.player.x - B.x, Game.player.z - B.z) < 14) Game.addShake(0.18, 0.07);
        }
        const life = 1 - clamp(e.stateTime / (C.flash + h.active), 0, 1);
        let x0 = B.x, y0 = B.y, z0 = B.z, seed = key * 13.7 + (calm ? 0 : Math.floor(e.stateTime * 30));
        for (let i = 0; i < SEG && bi < BOLTS - 1; i++) {   // up the column, each joint knocked aside a little
          const top = (i + 1) / SEG, j = i + 1 < SEG ? C.jag * Math.min(1, top * 2) : 0;
          const x1 = B.x + Math.sin(seed + i * 2.3) * j, z1 = B.z + Math.cos(seed * 1.3 + i * 1.7) * j, y1 = B.y + C.height * top;
          d.set(x1 - x0, y1 - y0, z1 - z0); const len = d.length(); d.multiplyScalar(1 / len);
          // The strip along this piece of the column, turned about it to face the camera.
          dummy.position.set(x0, y0, z0); dummy.quaternion.setFromUnitVectors(UP, d);
          n.copy(FWD).applyQuaternion(dummy.quaternion); c.copy(camera.position).sub(dummy.position); c.addScaledVector(d, -c.dot(d)).normalize();
          dummy.rotateY(Math.atan2(w.copy(n).cross(c).dot(d), n.dot(c)));
          for (let L = 0; L < 2; L++) {
            const k = BOLT_K[L];
            dummy.scale.set(C.width * BOLT_W[L], len, 1); dummy.updateMatrix();
            bolts.setMatrixAt(bi, dummy.matrix); bolts.setColorAt(bi, col.copy(boltCol).multiplyScalar(k * life)); bi++;
          }
          x0 = x1; y0 = y1; z0 = z1;
        }
        dummy.position.set(B.x, B.y + 0.05, B.z); dummy.quaternion.identity(); dummy.scale.set(C.mark * 0.6, 1, C.mark * 0.6); dummy.updateMatrix();
        marks.setMatrixAt(mi, dummy.matrix); marks.setColorAt(mi, col.copy(boltCol).multiplyScalar(0.9 * life)); mi++;
      }
    }
    // The pieces: what her hook holds of you, and those on their way.
    const p = Game.player, by = p && p.rentBy;
    let inFlight = 0;
    for (const f of flights) if (f.on && !f.back && f.body === p) inFlight++;
    if (by && by.rig && by.alive()) {
      const held = Math.max(0, p.rent - inFlight);
      for (let k = 0; k < held && pi < PIECES; k++) {
        hookPoint(by, k, v);
        const pulse = calm ? 1 : 0.8 + 0.2 * Math.sin(now * 7 + k * 2);   // about 1 Hz
        dummy.position.copy(v); dummy.position.y -= 0.12; dummy.rotation.set(0, now * 1.2 + k, 0); dummy.scale.setScalar(C.piece * (by.def.scale || 1) * 0.5);
        dummy.updateMatrix(); pieces.setMatrixAt(pi, dummy.matrix); pieces.setColorAt(pi, col.copy(pieceCol).multiplyScalar(1.6 * pulse)); pi++;
      }
    }
    for (const f of flights) {
      if (!f.on || pi >= PIECES) continue;
      f.t += dt / C.fly;
      if (f.t >= 1 || !f.enemy || !f.enemy.rig) {
        f.on = false;
        if (f.back && f.body) spawnBurst(chestOf(f.body, v), BACK);
        continue;
      }
      hookPoint(f.enemy, f.k, v); chestOf(f.body, w);
      const s = f.back ? f.t : 1 - f.t, e = s * s * (3 - 2 * s);   // eased along the way, arcing up
      dummy.position.set(w.x + (v.x - w.x) * e, w.y + (v.y - w.y) * e + Math.sin(e * Math.PI) * 1.2, w.z + (v.z - w.z) * e);
      dummy.rotation.set(0, f.t * 8, 0); dummy.scale.setScalar(C.piece * 1.2);
      dummy.updateMatrix(); pieces.setMatrixAt(pi, dummy.matrix); pieces.setColorAt(pi, col.copy(f.back ? backCol : pieceCol).multiplyScalar(2)); pi++;
    }
    commit(marks, mi); commit(bolts, bi); commit(pieces, pi);
  }
  Game.renderHooks.push(render);
  return { live: () => ({ marks: marks.visible ? marks.count : 0, bolts: bolts.visible ? bolts.count : 0, pieces: pieces.visible ? pieces.count : 0 }) };
})();
