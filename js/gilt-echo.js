'use strict';
// ============================================================================
// Gilt echoes (pass 44, the Regent Hollis): the cut that hangs in the air (drawing only)
// ============================================================================
// A hit with an `echo` (js/enemy.js makeHitbox) cuts again along a line his blade left in the air. From the moment the
// earlier cut (`echo.of`) strikes until the echo does, that line hangs there as leaves of gold (or embers: the phase's
// `echoColor`) and a bright seam, exactly where its hitbox will be; in the echo's last `warn` s the leaves tremble and the
// seam brightens (the tell), and as it strikes the seam flares and the leaves are flung off the cut. Interrupted (a parry,
// a stagger, a death) they only fall. Shapes (`echo.line`): `sweep` an arc across the box at its height (slanted by
// `tilt`), `chop` a falling arc along it, `thrust` a straight line down its middle, `field` leaves through all of it.
// Pooled: `pool` slots, each one InstancedMesh of leaves and one of seam motes; nothing allocated per frame.
const giltEcho = (() => {
  const C = VIS.giltEcho, N = C.flakes, M = C.seam;
  const leafGeo = new THREE.PlaneGeometry(C.size, C.size * 0.7), moteGeo = new THREE.PlaneGeometry(C.size * 1.6, C.size * 0.22);
  const dummy = new THREE.Object3D(), basis = new THREE.Matrix4(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0), P = { x: 0, y: 0, z: 0 }, Q = { x: 0, y: 0, z: 0 }, BURST = { color: C.color, count: 6, speed: 3.5 };
  const tint = new THREE.Color();
  const pool = Array.from({ length: C.pool }, (_, k) => {
    // Leaves: white, coloured per leaf (setColorAt) so each one glints as it turns: dark gold edge-on, bright face-on.
    const leafMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const moteMat = new THREE.MeshBasicMaterial({ color: C.color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false });
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, N), motes = new THREE.InstancedMesh(moteGeo, moteMat, M);
    for (let i = 0; i < N; i++) leaves.setColorAt(i, tint.set(C.color));   // makes its colour buffer now, not mid-fight
    leaves.instanceColor.setUsage(THREE.DynamicDrawUsage);
    for (const m of [leaves, motes]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.visible = false; m.renderOrder = 3; scene.add(m); pooledFx.push(m); }
    // Per leaf: where on the line (t), its scatter off it (u, v, w), spin phase and rate, and its flight once cut or dropped.
    const L = { t: new Float32Array(N), u: new Float32Array(N), v: new Float32Array(N), w: new Float32Array(N), ph: new Float32Array(N), sp: new Float32Array(N),
      x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N), vx: new Float32Array(N), vy: new Float32Array(N), vz: new Float32Array(N) };
    return { leaves, motes, L, enemy: null, no: -1, hit: -1, seen: 0, state: 'off', fade: 0, flare: 0, age: 0, big: 1, warn: 0, seed: k + 1,
      color: new THREE.Color(C.color), cx: 0, cy: 0, cz: 0, yaw: 0, box: null, echo: null };
  });
  const echoes = new WeakMap();   // attack -> the indices of its echo hits
  const echoesOf = a => {
    let list = echoes.get(a);
    if (!list) { list = []; a.hits.forEach((h, i) => { if (h.echo) list.push(i); }); echoes.set(a, list); }
    return list;
  };
  let rng = 1;
  const rnd = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; };
  // A point on slot S's line at t (0..1) in the box's own frame, written to `out` in the world (its frame at x, y, z, yaw).
  function along(S, t, out) {
    const B = S.box, E = S.echo;
    let lx = 0, ly = B.y, lz = B.fwd;
    if (E.line === 'sweep') { lx = (t - 0.5) * B.w; lz = B.fwd - B.d * 0.2 + B.d * 0.4 * (1 - (2 * t - 1) ** 2); ly = B.y + Math.tan(E.tilt || 0) * lx; }
    else if (E.line === 'chop') { lz = B.fwd - B.d / 2 + B.d * t; ly = lerp(B.y + B.h / 2, 0.15, t ** 1.4); }
    else if (E.line === 'thrust') lz = B.fwd - B.d / 2 + B.d * t;
    const s = Math.sin(S.yaw), c = Math.cos(S.yaw);
    out.x = S.cx + lz * s - lx * c; out.y = S.cy + ly; out.z = S.cz + lz * c + lx * s;
    return out;
  }
  function start(S, e, j) {
    const a = e.attack, h = a.hits[j];
    S.enemy = e; S.no = e.attackNo; S.hit = j; S.state = 'hang'; S.age = 0; S.flare = 0; S.box = h.box || a.box; S.echo = h.echo;
    S.color.set(e.def.echoColor ?? C.color);
    S.motes.material.color.copy(S.color).multiplyScalar(C.boost);
    rng = (S.seed * 7919 + j * 104729 + (e.attackNo | 0) * 31) % 2147483647 || 1;
    const field = S.echo.line === 'field', L = S.L, B = S.box;
    for (let i = 0; i < N; i++) {
      L.t[i] = field ? rnd() : (i + rnd()) / N;
      L.u[i] = field ? (rnd() - 0.5) * B.w : (rnd() - 0.5) * 0.3;
      L.v[i] = field ? (rnd() - 0.5) * B.h * 0.7 : (rnd() - 0.5) * 0.18;
      L.w[i] = field ? (rnd() - 0.5) * B.d : (rnd() - 0.5) * 0.3;
      L.ph[i] = rnd() * 6.28; L.sp[i] = 1.5 + rnd() * 2.5;
    }
    S.big = field ? C.fieldSize : 1;
    S.leaves.visible = true; S.motes.visible = !field;
  }
  // Where leaf i hangs now (written to P): on the line, or (a field) anywhere in the box.
  function leafAt(S, i, t) {
    const L = S.L, B = S.box;
    if (S.echo.line === 'field') {
      const s = Math.sin(S.yaw), c = Math.cos(S.yaw), lz = B.fwd + L.w[i], lx = L.u[i];
      P.x = S.cx + lz * s - lx * c; P.y = S.cy + B.y + L.v[i]; P.z = S.cz + lz * c + lx * s;
    } else { along(S, L.t[i], P); P.x += L.u[i] * Math.cos(S.yaw); P.z -= L.u[i] * Math.sin(S.yaw); P.y += L.v[i]; P.x += L.w[i] * Math.sin(S.yaw) * 0.3; P.z += L.w[i] * Math.cos(S.yaw) * 0.3; }
    // a slow drift and bob while it hangs; drawn closer to the line as the moment comes
    const k = 1 - t;
    P.y += Math.sin(S.age * 1.3 + L.ph[i]) * 0.04 * k;
    return P;
  }
  // Leaf colour as it turns (phase sp): edge-on it is the gilt's shadow, face-on it catches the light (`glint`).
  const glint = (S, sp) => { const k = Math.abs(Math.sin(sp * 1.3)); return tint.copy(S.color).multiplyScalar(C.dark + (C.glint - C.dark) * k * k * k); };
  let frame = 0;
  function render(game) {
    const dt = effectSlots.dt(); frame++;
    const calm = typeof reducedMotion === 'function' && reducedMotion();
    for (const e of game.enemies) {
      const a = e.attack;
      if (!a || !e.alive() || (e.state !== ES.WINDUP && e.state !== ES.ACTIVE) || !e.cutOf) continue;
      for (const j of echoesOf(a)) {
        const h = a.hits[j], cut = e.cutOf(h.echo.of);
        if (!cut || j < e.hitIndex || (j === e.hitIndex && e.state === ES.ACTIVE && e.stateTime > h.active + (h.follow || 0))) continue;
        let S = null;
        for (const s of pool) if (s.enemy === e && s.no === e.attackNo && s.hit === j && s.state !== 'off') { S = s; break; }
        if (!S) {
          for (const s of pool) if (s.state === 'off' || (s.state === 'fall' && (!S || S.state === 'fall' && s.fade < S.fade))) S = s;
          if (!S) continue;
          start(S, e, j);
        }
        S.seen = frame;
        const cutting = j === e.hitIndex && e.state === ES.ACTIVE;
        const left = j === e.hitIndex && e.state === ES.WINDUP ? h.startup - e.stateTime : Infinity;
        // its frame: where the cut was; drawn home to him over the strike with `home`
        const k = cutting && h.echo.home ? clamp(e.stateTime / Math.max(0.01, h.active), 0, 1) : 0;
        S.cx = lerp(cut.x, e.x, k); S.cy = lerp(cut.y, e.y, k); S.cz = lerp(cut.z, e.z, k); S.yaw = cut.yaw;
        S.warn = clamp(1 - left / C.warn, 0, 1);
        if (cutting && S.state === 'hang') { S.state = 'cut'; S.flare = 1; }
      }
    }
    for (const S of pool) {
      if (S.state === 'off') continue;
      const L = S.L, gone = S.seen !== frame;
      if (gone && (S.state === 'hang' || S.state === 'cut')) {   // struck (it was cutting) or interrupted: let the leaves go
        const struck = S.state === 'cut';
        for (let i = 0; i < N; i++) {
          leafAt(S, i, 1);
          L.x[i] = P.x; L.y[i] = P.y; L.z[i] = P.z;
          const out = struck ? C.fling * (0.4 + rnd()) : 0.3;
          L.vx[i] = (rnd() - 0.5) * out + Math.sin(S.yaw) * out * 0.5; L.vz[i] = (rnd() - 0.5) * out + Math.cos(S.yaw) * out * 0.5; L.vy[i] = struck ? rnd() * 1.6 : 0;
        }
        if (struck && !calm) { BURST.color = S.color.getHex(); for (let b = 1; b <= 3; b++) { along(S, b / 4, Q); spawnBurst(Q, BURST); } }
        S.state = 'fall'; S.fade = C.fade;
      }
      S.age += dt;
      let leafOpacity, moteOpacity;
      if (S.state === 'fall') {
        S.fade -= dt;
        if (S.fade <= 0) { S.state = 'off'; S.enemy = null; S.leaves.visible = S.motes.visible = false; continue; }
        const f = S.fade / C.fade;
        S.flare = Math.max(0, S.flare - dt * 4);
        leafOpacity = C.opacity * f; moteOpacity = C.seamOpacity * Math.max(f * 0.4, S.flare);
        for (let i = 0; i < N; i++) {
          L.vy[i] -= C.fall * dt; L.vx[i] *= 1 - dt * 1.5; L.vz[i] *= 1 - dt * 1.5;
          L.x[i] += L.vx[i] * dt; L.y[i] += L.vy[i] * dt * 0.5; L.z[i] += L.vz[i] * dt;
          const sp = S.age * L.sp[i] * 2 + L.ph[i];
          dummy.position.set(L.x[i], L.y[i], L.z[i]); dummy.rotation.set(sp, sp * 0.7, L.ph[i]); dummy.scale.setScalar(S.big);
          dummy.updateMatrix(); S.leaves.setMatrixAt(i, dummy.matrix); S.leaves.setColorAt(i, glint(S, sp));
        }
      } else {
        const w = S.warn || 0, cutting = S.state === 'cut';
        const tremble = calm ? 0 : w * w * 0.05 + (cutting ? 0.03 : 0);
        leafOpacity = C.opacity * Math.min(1, S.age / 0.15);
        moteOpacity = C.seamOpacity * (0.35 + 0.65 * w) * Math.min(1, S.age / 0.1);
        if (cutting) { S.flare = 1; moteOpacity = C.seamOpacity * 1.6; }
        for (let i = 0; i < N; i++) {
          leafAt(S, i, w);
          const sp = S.age * L.sp[i] * (1 + w * 3) + L.ph[i];
          dummy.position.set(P.x + Math.sin(sp * 7) * tremble, P.y + Math.cos(sp * 9) * tremble, P.z + Math.sin(sp * 5) * tremble);
          dummy.rotation.set(Math.sin(sp) * 1.2, sp * 0.5, L.ph[i]); dummy.scale.setScalar(S.big);
          dummy.updateMatrix(); S.leaves.setMatrixAt(i, dummy.matrix); S.leaves.setColorAt(i, glint(S, sp));
        }
      }
      S.leaves.instanceMatrix.needsUpdate = true; S.leaves.instanceColor.needsUpdate = true; S.leaves.material.opacity = leafOpacity;
      if (S.motes.visible) {   // the seam: motes along the line, each laid along it
        for (let m = 0; m < M; m++) {
          const t = (m + 0.5) / M;
          along(S, Math.max(0, t - 0.01), Q); vA.set(Q.x, Q.y, Q.z); along(S, Math.min(1, t + 0.01), Q); vB.set(Q.x, Q.y, Q.z);
          vB.sub(vA); if (vB.lengthSq() < 1e-8) vB.set(1, 0, 0); vB.normalize();
          vC.crossVectors(vB, UP); if (vC.lengthSq() < 1e-6) vC.set(0, 0, 1); vC.normalize();
          const roll = Math.sin(m * 2.3 + S.age * 3);
          vA.crossVectors(vC, vB).multiplyScalar(roll).addScaledVector(vC, Math.cos(m * 2.3 + S.age * 3)).normalize();
          vC.crossVectors(vB, vA);
          basis.makeBasis(vB, vA, vC);
          along(S, t, Q);
          dummy.position.set(Q.x, Q.y, Q.z); dummy.quaternion.setFromRotationMatrix(basis);
          dummy.scale.set(1 + S.flare * 1.5, 1 + S.flare, 1);
          dummy.updateMatrix(); S.motes.setMatrixAt(m, dummy.matrix);
        }
        S.motes.instanceMatrix.needsUpdate = true; S.motes.material.opacity = moteOpacity;
      }
    }
  }
  Game.renderHooks.push(render);
  return { live: () => pool.filter(s => s.state !== 'off').map(s => ({ state: s.state, hit: s.hit, line: s.echo && s.echo.line, at: [s.cx, s.cz].map(v => +v.toFixed(2)) })) };
})();
