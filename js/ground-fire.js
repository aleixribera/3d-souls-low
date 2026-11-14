'use strict';
// ============================================================================
// Fires on the floor (pass 63, the Pillager Captain): what his burning bill leaves behind (drawing only)
// ============================================================================
// A hit with a `fire` (js/enemy.js noteFires) leaves fires burning where it lands; burnInFires (js/enemy.js) hurts whoever
// stands in one. Each is drawn as a glowing scorch on the floor and a ring of flames turned to the camera: the flames
// flare up over `flare` s (low and dim until the fire has caught and hurts: CONFIG.groundFire.kindle) and die down over
// the last `fade` s of its time. A boss whose weapon alone burns (`ignite: 'weapon'`) also gets a knot of the same flames
// licking up from his weapon's ember point (the model's `embers.head`) while it burns, so a burning hit reads before it
// lands. With reducedMotion() the flames do not lick. One InstancedMesh for every scorch and one for every flame; nothing
// allocated per frame.
const groundFire = (() => {
  const C = VIS.groundFire, N = C.flames, POOL = C.pool;
  const disc = (() => {   // the scorch: a soft round glow, drawn into a canvas once
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const tongue = (() => {   // a flame: a thin tongue with a sharp tip, hot at its root, thinning out to nothing at the top
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d'), grd = g.createRadialGradient(32, 108, 1, 32, 96, 40);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0.25)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(34, 0); g.bezierCurveTo(40, 40, 58, 80, 46, 112); g.quadraticCurveTo(32, 128, 18, 112);
    g.bezierCurveTo(6, 84, 26, 50, 34, 0); g.fill();
    g.globalCompositeOperation = 'destination-in';   // fade up the tongue
    const up = g.createLinearGradient(0, 0, 0, 128); up.addColorStop(0, 'rgba(255,255,255,0)'); up.addColorStop(0.55, 'rgba(255,255,255,0.8)'); up.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = up; g.fillRect(0, 0, 64, 128);
    return new THREE.CanvasTexture(c);
  })();
  const flat = new THREE.PlaneGeometry(2, 2); flat.rotateX(-Math.PI / 2);   // lies on the floor, `r` = 1
  const scorchMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: disc, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    polygonOffset: true, polygonOffsetFactor: -3 });
  const scorches = new THREE.InstancedMesh(flat, scorchMat, POOL);
  const flameGeo = new THREE.PlaneGeometry(1, 1); flameGeo.translate(0, 0.5, 0);   // stands on its root
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: tongue, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide, fog: false });
  const BILL = C.bill.flames, BILLS = 4;   // a weapon's flames, for up to four burning weapons at once
  const flames = new THREE.InstancedMesh(flameGeo, flameMat, POOL * N + BILLS * BILL);
  const black = new THREE.Color(0, 0, 0);
  for (const m of [scorches, flames]) {
    for (let i = 0; i < m.count; i++) m.setColorAt(i, black);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false; m.visible = false; m.renderOrder = 2; scene.add(m); pooledFx.push(m);
  }
  const dummy = new THREE.Object3D(), at = new THREE.Vector3(), col = new THREE.Color(), fire = new THREE.Color(C.fire), hot = new THREE.Color(C.hot), scorch = new THREE.Color(C.scorch);
  const G = CONFIG.groundFire;
  function finish(m, n) {
    m.count = n; m.visible = n > 0;
    if (n) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  }
  function render(game) {
    const calm = typeof reducedMotion === 'function' && reducedMotion(), t = performance.now() / 1000;
    let si = 0, fi = 0, bills = 0;
    for (const e of game.enemies) {
      const em = e.def.ignite === 'weapon' && e.rig && e.rig.embers;
      if (em && em.visible && em.children.length && e.alive() && bills < BILLS) {   // the burning weapon: flames off its head
        bills++; em.children[0].getWorldPosition(at);
        const sc = e.def.scale || 1, cy = Math.atan2(camera.position.x - at.x, camera.position.z - at.z);
        for (let j = 0; j < BILL; j++) {
          const a = (j / BILL) * 6.283, rr = j === 0 ? 0 : C.bill.spread * sc;
          const lick = calm ? 1 : 0.7 + 0.3 * Math.sin(t * (11 + j * 1.3) + j * 2.1);
          dummy.position.set(at.x + Math.cos(a) * rr, at.y - C.bill.drop * sc, at.z + Math.sin(a) * rr); dummy.rotation.set(0, cy, 0);
          dummy.scale.set(C.bill.w * sc, C.bill.h * sc * (j === 0 ? 1.2 : 0.75) * lick, 1);
          dummy.updateMatrix(); flames.setMatrixAt(fi, dummy.matrix);
          flames.setColorAt(fi, col.copy(fire).lerp(hot, j === 0 ? 0.5 : 0.2).multiplyScalar(C.bill.bright)); fi++;
        }
      }
      if (!e.fires || !e.fires.length || !e.alive()) continue;
      for (const f of e.fires) {
        if (si >= POOL) break;
        // up: flaring over `flare` s, held low until it has caught; down: the last `fade` s of its time
        const caught = f.age >= G.kindle, up = Math.min(1, f.age / C.flare) * (caught ? 1 : 0.55), down = clamp((f.time - f.age) / C.fade, 0, 1), k = up * down;
        if (k <= 0) continue;
        dummy.position.set(f.x, f.y + 0.03, f.z); dummy.rotation.set(0, (f.no * 1.7) % 6.28, 0); dummy.scale.set(f.r * 1.25, 1, f.r * 1.25);
        dummy.updateMatrix(); scorches.setMatrixAt(si, dummy.matrix); scorches.setColorAt(si, col.copy(scorch).multiplyScalar(C.glow * k)); si++;
        const cy = Math.atan2(camera.position.x - f.x, camera.position.z - f.z);
        for (let j = 0; j < N; j++) {   // a ring of flames, the middle one tallest; each its own lick
          const a = (j / N) * 6.283 + f.no * 0.9, rr = j === 0 ? 0 : f.r * (0.45 + 0.25 * ((j * 7 + f.no) % 3) / 2);
          const lick = calm ? 1 : 0.8 + 0.2 * Math.sin(t * (9 + j) + f.no * 2.3 + j * 1.9);
          const h = C.flameH * f.r * (j === 0 ? 1.15 : 0.6 + 0.12 * ((j + f.no) % 4)) * k * lick;
          dummy.position.set(f.x + Math.cos(a) * rr, f.y, f.z + Math.sin(a) * rr); dummy.rotation.set(0, cy, 0);
          dummy.scale.set(C.flameW * f.r * (0.8 + 0.3 * k), Math.max(0.001, h), 1);
          dummy.updateMatrix(); flames.setMatrixAt(fi, dummy.matrix);
          flames.setColorAt(fi, col.copy(fire).lerp(hot, j === 0 ? 0.45 : 0.15).multiplyScalar((caught ? 0.95 : 0.55) * k)); fi++;
        }
      }
    }
    finish(scorches, si); finish(flames, fi);
  }
  Game.renderHooks.push(render);
  return { live: () => { let n = 0; for (const e of Game.enemies) n += (e.fires && e.alive()) ? e.fires.length : 0; return n; } };
})();
