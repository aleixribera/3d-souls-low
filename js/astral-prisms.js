'use strict';
// ============================================================================
// Astral prisms & converging light-lances (drawing only, Normal & Ultra presets)
// ============================================================================
// A hit with `prism` (js/enemy.js notePrisms) plants floating crystal diamonds in the arena: each has a solid dark-silver
// faceted astral cage framing an incandescent cyan/violet core, two counter-rotating meridian rings, a vertical thread,
// and a floor anchor ring so its position reads crisply against any backdrop. When an attack with `prismFire` winds up,
// every active prism projects a razor-thin laser sightline toward its target; once locked (notePrismAim), it snaps bright
// and rigid so the player can step or dash cleanly through the geometry. On strike, each locked line fires a razor-sharp
// prismatic light-lance (saturated cyan/violet outer beam + pinpoint white-hot core) while its source prism flashes and
// dissolves so beam origins and dodge lanes stay 100% legible without bloom washout.
// Pooled InstancedMeshes; nothing allocated per frame; reducedMotion() respected; flashes under 3 Hz.
const astralPrisms = (() => {
  const C = VIS.astralPrisms, POOL = C.pool;
  const MAX_SHELL = POOL * 2, MAX_CRYSTAL = POOL * 2, MAX_HALO = POOL * 3, MAX_FLOOR = POOL * 2, MAX_BEAM = POOL * 6;
  const addMat = o => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, ...o });

  // Soft linear beam gradient across U (0..1 = beam width): razor core fading smoothly to transparent edges.
  const beamTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 4;
    const g = cv.getContext('2d'), grd = g.createLinearGradient(0, 0, 32, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.22, 'rgba(255,255,255,0.34)');
    grd.addColorStop(0.45, 'rgba(255,255,255,0.9)'); grd.addColorStop(0.5, 'rgba(255,255,255,1)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.9)'); grd.addColorStop(0.78, 'rgba(255,255,255,0.34)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 32, 4);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  })();

  // Pooled geometries: faceted crystal octahedron, dark wireframe/frame cage, thin astrolabe ring, floor ring, crossed beam.
  const crystalGeo = new THREE.OctahedronGeometry(1, 0);
  const haloGeo = new THREE.RingGeometry(0.84, 1.0, 32);
  const floorGeo = new THREE.RingGeometry(0.74, 1.0, 32); floorGeo.rotateX(-Math.PI / 2);
  // Explicit crossed-plane beam along +Z (0..1): U is always across width (-0.5..+0.5) on BOTH quads.
  const beamGeo = (() => {
    const pos = new Float32Array([
      -0.5, 0, 0,   0.5, 0, 0,  -0.5, 0, 1,   0.5, 0, 1,   // horizontal quad (width X, length +Z)
      0, -0.5, 0,   0, 0.5, 0,   0, -0.5, 1,  0, 0.5, 1,   // vertical quad (width Y, length +Z)
    ]);
    const uv = new Float32Array([
      0, 0,  1, 0,  0, 1,  1, 1,
      0, 0,  1, 0,  0, 1,  1, 1,
    ]);
    const idx = new Uint16Array([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5]);
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  })();

  // Solid dark-indigo metallic outer prism facets so floating prisms read as crisp physical astral artifacts, not flat glare.
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.24, flatShading: true });
  const shells = new THREE.InstancedMesh(crystalGeo, shellMat, MAX_SHELL);
  const crystals = new THREE.InstancedMesh(crystalGeo, addMat(), MAX_CRYSTAL);
  const halos = new THREE.InstancedMesh(haloGeo, addMat(), MAX_HALO);
  const floors = new THREE.InstancedMesh(floorGeo, addMat({ polygonOffset: true, polygonOffsetFactor: -3 }), MAX_FLOOR);
  const beams = new THREE.InstancedMesh(beamGeo, addMat({ map: beamTex }), MAX_BEAM);

  const black = new THREE.Color(0, 0, 0);
  for (const m of [shells, crystals, halos, floors, beams]) {
    for (let i = 0; i < m.count; i++) m.setColorAt(i, black);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false; m.visible = false; m.renderOrder = m === shells ? 2 : 3;
    scene.add(m); pooledFx.push(m);
  }

  const dummy = new THREE.Object3D(), col = new THREE.Color(), tmp = new THREE.Color();
  const baseCol = new THREE.Color(C.color), coreCol = new THREE.Color(C.core);
  const eclCol = new THREE.Color(C.eclipseColor), eclCore = new THREE.Color(C.eclipseCore);
  const shellBase = new THREE.Color(0x1a284c), shellEcl = new THREE.Color(0x28184a);
  const BURST = { color: C.color, count: 14, speed: 5.5 }, P = { x: 0, y: 0, z: 0 };

  // Active fading lance beams (fired lines that linger briefly with their source prism flashing cleanly at the origin).
  const fired = Array.from({ length: POOL }, () => ({ on: false, age: 0, life: C.flash + C.fade,
    x0: 0, z0: 0, x1: 0, z1: 0, y: 0, fy: 1.55, eclipse: false }));
  const firedKeys = new WeakMap();

  function addFired(L, eclipse) {
    let slot = fired.find(f => !f.on) || fired.reduce((a, b) => (b.age > a.age ? b : a));
    slot.on = true; slot.age = 0; slot.life = C.flash + C.fade;
    slot.x0 = L.x0; slot.z0 = L.z0; slot.x1 = L.x1; slot.z1 = L.z1;
    slot.y = L.y; slot.fy = L.fy ?? (L.y + 1.55); slot.eclipse = eclipse;
  }

  // Listen for prism planting & counter-shatter bursts.
  events.on('prismPlant', d => {
    if (!d || !d.at) return;
    const ecl = !!(d.enemy && d.enemy.rig && d.enemy.rig.revealed);
    BURST.color = ecl ? C.eclipseColor : C.color; BURST.count = 12; BURST.speed = 4.6;
    spawnBurst(d.at, BURST);
  });
  events.on('prismShatter', d => {
    if (!d || !Array.isArray(d.list)) return;
    const ecl = !!(d.enemy && d.enemy.rig && d.enemy.rig.revealed);
    BURST.color = ecl ? C.eclipseCore : C.core; BURST.count = 18; BURST.speed = 6.8;
    for (const p of d.list) spawnBurst(p, BURST);
  });

  function commit(m, n) {
    m.count = n; m.visible = n > 0;
    if (n) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  }

  function pushBeam(bi, x0, y, z0, x1, z1, width, c) {
    if (bi >= MAX_BEAM) return bi;
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
    if (len < 0.05) return bi;
    dummy.position.set(x0, y, z0);
    dummy.rotation.set(0, Math.atan2(dx, dz), 0);
    dummy.scale.set(width, width, len);
    dummy.updateMatrix();
    beams.setMatrixAt(bi, dummy.matrix); beams.setColorAt(bi, c);
    return bi + 1;
  }

  function pushTether(bi, x, y0, y1, z, width, c) {
    if (bi >= MAX_BEAM || y1 - y0 < 0.05) return bi;
    dummy.position.set(x, y0, z);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.set(width, width, y1 - y0);
    dummy.updateMatrix();
    beams.setMatrixAt(bi, dummy.matrix); beams.setColorAt(bi, c);
    return bi + 1;
  }

  function render(game) {
    const dt = effectSlots.dt(), t = effectSlots.time();
    const calm = typeof reducedMotion === 'function' && reducedMotion();
    let si = 0, ci = 0, hi = 0, fi = 0, bi = 0;

    for (const e of game.enemies) {
      if (!e.alive()) continue;
      const ecl = !!(e.rig && e.rig.revealed);
      const a = e.attack, h = a && a.hits[e.hitIndex];
      const aiming = !!(h && h.prismFire && e.state === ES.WINDUP);
      const firedNow = !!(h && h.prismFire && (e.state === ES.ACTIVE || e.state === ES.FOLLOW));
      const tell = aiming ? clamp(e.stateTime / Math.max(0.05, h.startup), 0, 1) : 0;

      // Capture newly fired prism beams once per hit so their visual lance flashes & fades smoothly.
      if (firedNow && e.prismBeams && e.prismBeams.length) {
        const key = e.attackNo * 64 + e.hitIndex;
        if (firedKeys.get(e) !== key) {
          firedKeys.set(e, key);
          for (const L of e.prismBeams) {
            addFired(L, ecl);
            if (!calm) {
              BURST.color = ecl ? C.eclipseColor : C.color; BURST.count = 12; BURST.speed = 6.2;
              P.x = L.x0; P.y = L.fy ?? (L.y + 1.55); P.z = L.z0; spawnBurst(P, BURST);
            }
          }
          if (Game.player && Math.hypot(Game.player.x - e.x, Game.player.z - e.z) < 22) Game.addShake(0.2, 0.08);
        }
      }

      if (!e.prisms || !e.prisms.length) continue;
      const tint = ecl ? eclCol : baseCol, hot = ecl ? eclCore : coreCol, cage = ecl ? shellEcl : shellBase;

      for (const pr of e.prisms) {
        if (ci + 1 >= MAX_CRYSTAL || fi >= MAX_FLOOR) break;
        const born = clamp(pr.age / C.spawn, 0, 1);
        const sPop = born < 1 ? 1 - (1 - born) * (1 - born) : 1;
        const bob = calm ? 0 : Math.sin(t * 2.2 + pr.no * 1.7) * C.bob;
        const py = pr.fy + bob;
        const spin = (calm ? 0.35 : 1) * (t * C.spin + pr.no * 1.3) * (aiming ? 2.1 : 1);
        const pulse = aiming ? 0.85 + 0.45 * tell : 0.72 + 0.14 * Math.sin(t * 2.0 + pr.no);

        // Dark-silver metallic sculpted facet body framing the glowing core (gives solid silhouette contrast!)
        if (si < MAX_SHELL) {
          dummy.position.set(pr.x, py, pr.z);
          dummy.rotation.set(0.14 * Math.sin(spin * 0.6), spin + Math.PI * 0.25, 0.12 * Math.cos(spin * 0.5));
          dummy.scale.set(C.crystalR * 0.92 * sPop, C.crystalH * 0.88 * sPop, C.crystalR * 0.92 * sPop);
          dummy.updateMatrix();
          shells.setMatrixAt(si, dummy.matrix);
          shells.setColorAt(si, cage); si++;
        }

        // Translucent glowing crystal aura + crisp bright inner core diamond.
        dummy.position.set(pr.x, py, pr.z);
        dummy.rotation.set(0.14 * Math.sin(spin * 0.6), spin, 0.12 * Math.cos(spin * 0.5));
        dummy.scale.set(C.crystalR * 1.06 * sPop, C.crystalH * 1.04 * sPop, C.crystalR * 1.06 * sPop);
        dummy.updateMatrix();
        crystals.setMatrixAt(ci, dummy.matrix);
        crystals.setColorAt(ci, col.copy(tint).multiplyScalar(pulse * 0.65)); ci++;

        dummy.scale.set(C.crystalR * 0.46 * sPop, C.crystalH * 0.52 * sPop, C.crystalR * 0.46 * sPop);
        dummy.updateMatrix();
        crystals.setMatrixAt(ci, dummy.matrix);
        crystals.setColorAt(ci, col.copy(hot).multiplyScalar(pulse * 1.1)); ci++;

        // Two counter-rotating meridian rings framing the crystal (echoing Vesper's astrolabe).
        if (hi + 1 < MAX_HALO) {
          dummy.position.set(pr.x, py, pr.z);
          dummy.rotation.set(Math.PI * 0.34 + 0.22 * Math.sin(spin * 0.5), spin * 0.95, spin * 0.35);
          dummy.scale.setScalar(C.ringR * sPop * (1 + 0.14 * tell));
          dummy.updateMatrix();
          halos.setMatrixAt(hi, dummy.matrix);
          halos.setColorAt(hi, col.copy(tint).lerp(hot, tell * 0.4).multiplyScalar(0.72 + 0.48 * tell)); hi++;

          dummy.rotation.set(-Math.PI * 0.38, -spin * 1.3, Math.PI * 0.25 + spin * 0.45);
          dummy.scale.setScalar(C.ringR * 0.72 * sPop * (1 + 0.08 * tell));
          dummy.updateMatrix();
          halos.setMatrixAt(hi, dummy.matrix);
          halos.setColorAt(hi, col.copy(hot).multiplyScalar(0.55 + 0.45 * tell)); hi++;
        }

        // Crisp ground anchor ring + slender vertical light thread connecting floor to crystal.
        dummy.position.set(pr.x, pr.y + 0.05, pr.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(C.floorR * sPop * (pr.locked ? 0.86 : 1));
        dummy.updateMatrix();
        floors.setMatrixAt(fi, dummy.matrix);
        floors.setColorAt(fi, col.copy(tint).lerp(hot, pr.locked ? 0.5 : 0.08).multiplyScalar(0.52 + 0.55 * tell)); fi++;

        bi = pushTether(bi, pr.x, pr.y + 0.04, py - C.crystalH * 0.4 * sPop, pr.z,
          0.09 * sPop, col.copy(tint).multiplyScalar(0.45 + 0.35 * tell));

        // Razor-clean sightline laser during prismFire wind-up: soft tracking -> crisp locked lane!
        if (aiming && pr.aimKey === e.attackNo * 64 + e.hitIndex) {
          const locked = !!pr.locked;
          const w = locked ? C.lockW * (1 + 0.1 * tell) : C.aimW;
          const intensity = locked ? (0.58 + 0.28 * tell) : (0.36 + 0.18 * tell);
          col.copy(tint).lerp(hot, locked ? 0.38 : 0.1).multiplyScalar(intensity);
          bi = pushBeam(bi, pr.x, py, pr.z, pr.aimX, pr.aimZ, w, col);
          if (locked) bi = pushBeam(bi, pr.x, py, pr.z, pr.aimX, pr.aimZ, w * 0.3, tmp.copy(hot).multiplyScalar(intensity * 0.85));
          tmp.copy(tint).lerp(hot, locked ? 0.25 : 0).multiplyScalar(intensity * 0.32);
          bi = pushBeam(bi, pr.x, pr.y + 0.08, pr.z, pr.aimX, pr.aimZ, w * 1.15, tmp);
        }
      }
    }

    // Fired anime light-lances: razor-sharp cyan/violet outer beam + pinpoint white-hot core + visible firing prism anchor!
    for (const f of fired) {
      if (!f.on) continue;
      f.age += dt;
      if (f.age >= f.life) { f.on = false; continue; }
      const k = f.age < C.flash ? 1 : Math.max(0, 1 - (f.age - C.flash) / C.fade);
      const shrink = 0.45 + 0.55 * k;
      const tint = f.eclipse ? eclCol : baseCol, hot = f.eclipse ? eclCore : coreCol, cage = f.eclipse ? shellEcl : shellBase;

      // Render the firing prism crystal & expanding meridian ring right at the beam's origin so beam sources stay legible!
      if (si < MAX_SHELL) {
        dummy.position.set(f.x0, f.fy, f.z0);
        dummy.rotation.set(0.1, t * 4.5, 0.1);
        dummy.scale.set(C.crystalR * 0.9 * k, C.crystalH * 0.85 * k, C.crystalR * 0.9 * k);
        dummy.updateMatrix();
        shells.setMatrixAt(si, dummy.matrix); shells.setColorAt(si, cage); si++;
      }
      if (hi < MAX_HALO) {
        dummy.position.set(f.x0, f.fy, f.z0);
        dummy.rotation.set(Math.PI * 0.35, t * 3.2, 0.4);
        dummy.scale.setScalar(C.ringR * (1.05 + 0.45 * (1 - k)));
        dummy.updateMatrix();
        halos.setMatrixAt(hi, dummy.matrix); halos.setColorAt(hi, col.copy(tint).multiplyScalar(0.85 * k)); hi++;
      }
      if (fi < MAX_FLOOR) {
        dummy.position.set(f.x0, f.y + 0.05, f.z0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(C.floorR * (0.95 + 0.25 * (1 - k)));
        dummy.updateMatrix();
        floors.setMatrixAt(fi, dummy.matrix); floors.setColorAt(fi, col.copy(tint).multiplyScalar(0.65 * k)); fi++;
      }

      bi = pushBeam(bi, f.x0, f.fy, f.z0, f.x1, f.z1, C.beamW * shrink, col.copy(tint).multiplyScalar(0.62 * k));
      bi = pushBeam(bi, f.x0, f.fy, f.z0, f.x1, f.z1, C.coreW * shrink, col.copy(hot).multiplyScalar(1.12 * k));
      bi = pushBeam(bi, f.x0, f.y + 0.1, f.z0, f.x1, f.z1, C.beamW * 0.65 * shrink, col.copy(tint).multiplyScalar(0.24 * k));
    }

    commit(shells, si); commit(crystals, ci); commit(halos, hi); commit(floors, fi); commit(beams, bi);
  }

  Game.renderHooks.push(render);
  return {
    live: () => ({ shells: shells.visible ? shells.count : 0, crystals: crystals.visible ? crystals.count : 0,
      halos: halos.visible ? halos.count : 0, beams: beams.visible ? beams.count : 0, fired: fired.filter(f => f.on).length }),
    clear: () => { for (const f of fired) f.on = false; commit(shells, 0); commit(crystals, 0); commit(halos, 0); commit(floors, 0); commit(beams, 0); },
  };
})();
