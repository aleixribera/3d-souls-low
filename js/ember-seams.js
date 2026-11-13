'use strict';
// ============================================================================
// Ember seams (pass 47, Oswin, the First Crown): the floor he cracks open (drawing only)
// ============================================================================
// A hit with a `seam` (js/enemy.js noteSeams) cracks the floor along a line ahead of him, and the crack stays open,
// glowing with the Ember beneath, exactly where its wall of fire will stand. It runs open from his end in `open` s. When
// an attack with an `erupt` hit winds up, every open seam brightens and spits sparks through the wind-up (the tell); as
// it strikes, a wall of fire stands up along each one, burns `burn` s and fades. A seam that erupts without `keep`, or
// is pushed out by a newer one (CONFIG.seams.max), closes over `close` s. With reducedMotion() no flicker and no sparks.
// One InstancedMesh for every crack (a bright core and a dim halo per segment) and one for every flame; nothing
// allocated per frame.
const emberSeams = (() => {
  const C = VIS.emberSeams, N = C.crack, F = C.flames, POOL = C.pool;
  const flat = new THREE.PlaneGeometry(1, 1); flat.rotateX(-Math.PI / 2);   // lies on the floor, x along, z across
  const crackMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    polygonOffset: true, polygonOffsetFactor: -3 });
  const cracks = new THREE.InstancedMesh(flat, crackMat, POOL * N * 2);
  // A flame: a soft tongue, white at its root, drawn into a canvas once.
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d'), grd = g.createRadialGradient(32, 104, 2, 32, 84, 60);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.65)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(58, 50, 64, 92, 32, 126); g.bezierCurveTo(0, 92, 6, 50, 32, 2); g.fill();
    return new THREE.CanvasTexture(c);
  })();
  const flameGeo = new THREE.PlaneGeometry(1, 1); flameGeo.translate(0, 0.5, 0);   // stands on its root
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide, fog: false });
  const flames = new THREE.InstancedMesh(flameGeo, flameMat, POOL * F);
  const black = new THREE.Color(0, 0, 0);
  for (const m of [cracks, flames]) {
    for (let i = 0; i < m.count; i++) m.setColorAt(i, black);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false; m.visible = false; m.renderOrder = 2; scene.add(m); pooledFx.push(m);
  }
  const dummy = new THREE.Object3D(), col = new THREE.Color(), dim = new THREE.Color(), base = new THREE.Color(C.color), hot = new THREE.Color(C.hot), fire = new THREE.Color(C.fire);
  const SPARK = { color: C.hot, count: 3, speed: 2.2 }, BURST = { color: C.fire, count: 8, speed: 5 }, P = { x: 0, y: 0, z: 0 };
  // Per slot: its seam's line, the jag of its crack (offset across the line per point), its flames' places and sizes.
  const slots = Array.from({ length: POOL }, (_, k) => ({ enemy: null, no: -1, state: 'off', age: 0, t: 0, warn: 0, seen: 0, eruptKey: -1, after: 'off',
    x0: 0, z0: 0, x1: 0, z1: 0, y: 0, jag: new Float32Array(N + 1), ft: new Float32Array(F), fh: new Float32Array(F), fp: new Float32Array(F), spark: 0, seed: k + 1 }));
  let rng = 1;
  const rnd = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; };
  function open(S, e, L) {
    S.enemy = e; S.no = L.no; S.state = 'open'; S.age = 0; S.t = 0; S.warn = 0; S.eruptKey = -1;
    S.x0 = L.x0; S.z0 = L.z0; S.x1 = L.x1; S.z1 = L.z1; S.y = L.y;
    rng = (L.no * 7919 + S.seed * 104729) % 2147483647 || 1;
    for (let i = 0; i <= N; i++) { const end = Math.min(i, N - i) / (N / 2); S.jag[i] = (rnd() - 0.5) * 2 * C.jag * Math.min(1, end * 2.5); }
    for (let j = 0; j < F; j++) { S.ft[j] = (j + 0.2 + rnd() * 0.6) / F; S.fh[j] = 0.65 + rnd() * 0.5; S.fp[j] = rnd() * 6.28; }
  }
  // Point i of slot S's crack (written to P).
  function at(S, i) {
    const t = i / N, dx = S.x1 - S.x0, dz = S.z1 - S.z0, l = Math.hypot(dx, dz) || 1;
    P.x = S.x0 + dx * t - dz / l * S.jag[i]; P.z = S.z0 + dz * t + dx / l * S.jag[i]; P.y = S.y + 0.04;
    return P;
  }
  // One flat segment of a crack from (ax, az) toward P, `shown` of it, `mul` times the crack's width.
  function seg(i, ax, az, shown, len, yaw, w, mul, c, y) {
    dummy.position.set(ax + (P.x - ax) * shown / 2, y, az + (P.z - az) * shown / 2);
    dummy.rotation.set(0, yaw, 0); dummy.scale.set(Math.max(0.001, len + w * 0.5), 1, shown > 0 ? w * mul : 0.001);
    dummy.updateMatrix(); cracks.setMatrixAt(i, dummy.matrix); cracks.setColorAt(i, c);
    return i + 1;
  }
  function finish(m, n, any) {
    m.count = n; m.visible = any && n > 0;
    if (n) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  }
  let frame = 0;
  function render(game) {
    const dt = effectSlots.dt(); frame++;
    const calm = typeof reducedMotion === 'function' && reducedMotion();
    let any = false;
    for (const e of game.enemies) {
      if (!e.seams || !e.alive() || (!e.seams.length && !e.erupting)) continue;   // dead (on a client too): his seams close
      const a = e.alive() ? e.attack : null, h = a && a.hits[e.hitIndex];
      const telling = h && h.erupt && e.state === ES.WINDUP ? clamp(e.stateTime / h.startup, 0, 1) : 0;
      const bursting = h && h.erupt && e.state === ES.ACTIVE ? e.attackNo * 64 + e.hitIndex : -1;
      for (const L of e.seams) {
        let S = null;
        for (const s of slots) if (s.enemy === e && s.no === L.no && s.state !== 'off') { S = s; break; }
        if (!S) {
          for (const s of slots) if (s.state === 'off' || (s.state === 'close' && (!S || (S.state === 'close' && s.t > S.t)))) S = s;
          if (!S) continue;
          open(S, e, L);
        }
        S.seen = frame; S.warn = e.alive() ? telling : 0;
      }
      if (bursting >= 0 && e.erupting) for (const L of e.erupting) for (const S of slots) {
        if (S.enemy !== e || S.no !== L.no || S.state === 'off' || S.eruptKey === bursting) continue;
        S.eruptKey = bursting; S.state = 'erupt'; S.t = 0; S.warn = 0; S.after = S.seen === frame ? 'open' : 'close';
        if (!calm) for (let b = 1; b <= 3; b++) { at(S, Math.round(N * b / 4)); spawnBurst(P, BURST); }
      }
    }
    let ci = 0, fi = 0;
    for (const S of slots) {
      if (S.state === 'off') continue;
      S.age += dt;
      const gone = S.seen !== frame;
      if (S.state === 'open' && gone) { S.state = 'close'; S.t = 0; }
      let glow, tone = 0, reveal = Math.min(1, S.age / C.open), flame = 0;
      if (S.state === 'erupt') {
        S.t += dt;
        const T = C.burn + C.fade;
        flame = S.t < 0.1 ? S.t / 0.1 : S.t < C.burn ? 1 : Math.max(0, 1 - (S.t - C.burn) / C.fade);
        glow = C.tell * (0.4 + 0.6 * flame); tone = flame;
        if (S.t >= T) {
          if (S.after === 'open' && !gone) { S.state = 'open'; S.t = 0; }
          else { S.state = 'close'; S.t = 0; }
        }
      } else if (S.state === 'close') {
        S.t += dt;
        const k = 1 - S.t / C.close;
        if (k <= 0) { S.state = 'off'; S.enemy = null; continue; }
        glow = C.rest * k;
      } else {
        const w = S.warn, flick = calm ? 0 : Math.sin(S.age * 23 + S.seed) * 0.12 * w + Math.sin(S.age * 2.1 + S.seed) * 0.06;
        glow = C.rest + (C.tell - C.rest) * w * w + flick; tone = w;
        if (w > 0.2 && !calm && (S.spark -= dt) <= 0) { S.spark = 0.22 - 0.12 * w; at(S, 1 + Math.floor(rnd() * (N - 1))); spawnBurst(P, SPARK); }
      }
      any = true;
      col.copy(base).lerp(hot, tone).multiplyScalar(Math.max(0, glow));
      for (let i = 0; i < N; i++) {   // the crack: a bright core and a dim halo per segment, run open from his end
        at(S, i); const ax = P.x, az = P.z; at(S, i + 1);
        const shown = clamp(reveal * N - i, 0, 1), len = Math.hypot(P.x - ax, P.z - az) * shown;
        const yaw = Math.atan2(-(P.z - az), P.x - ax), w = C.width * (0.6 + 0.4 * Math.sin(i * 1.7 + S.seed));
        ci = seg(ci, ax, az, shown, len, yaw, w, 1, col, S.y + 0.035);
        ci = seg(ci, ax, az, shown, len, yaw, w, 3.2, dim.copy(col).multiplyScalar(0.28), S.y + 0.03);
      }
      if (flame > 0) {   // the wall of fire: flames along the seam, turned to the camera
        const cy = Math.atan2(camera.position.x - (S.x0 + S.x1) / 2, camera.position.z - (S.z0 + S.z1) / 2);
        for (let j = 0; j < F; j++) {
          const t = S.ft[j], x = S.x0 + (S.x1 - S.x0) * t, z = S.z0 + (S.z1 - S.z0) * t;
          const lick = calm ? 1 : 0.85 + 0.15 * Math.sin(S.t * 18 + S.fp[j]);
          dummy.position.set(x, S.y, z); dummy.rotation.set(0, cy, 0);
          dummy.scale.set(C.flameW * (0.8 + 0.3 * flame), C.flameH * S.fh[j] * flame * lick, 1);
          dummy.updateMatrix(); flames.setMatrixAt(fi, dummy.matrix); flames.setColorAt(fi, col.copy(fire).lerp(hot, 0.3 * (1 - flame)).multiplyScalar(1.4 * flame)); fi++;
        }
      }
    }
    finish(cracks, ci, any); finish(flames, fi, any);
  }
  Game.renderHooks.push(render);
  return { live: () => slots.filter(s => s.state !== 'off').map(s => ({ state: s.state, no: s.no, warn: +s.warn.toFixed(2) })) };
})();
