'use strict';
// ============================================================================
// Boss v2 Modular Cue-Driven FX & Synced World Hazard Renderer
// ============================================================================
// Pooled, zero-allocation-per-frame rendering for Boss v2 `bossCue` events,
// multi-bone anime ribbon smears, and first-class `BossHazards`.
// Respects Normal/Ultra budgets, reducedMotion(), and < 3 Hz flash rules.

const BossFxV2 = (() => {
  const registry = new Map();
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const isCalm = () => typeof reducedMotion === 'function' && reducedMotion();
  const density = () => {
    try { return VIS.fxBudgets[visuals.quality().fxBudget].density; } catch { return 0.7; }
  };

  // ---- 1. Pooled World Hazard Meshes (fissure, novaZone, beamAnchor) ------------------------------------------------
  const MAX_HAZARDS = 16;
  const fissureGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0.05, 0.5);
  const wallGeo = new THREE.PlaneGeometry(1, 2.4).translate(0, 1.2, 0.5);
  const discGeo = new THREE.RingGeometry(0.08, 1, 32).rotateX(-Math.PI / 2);
  const fillGeo = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
  const beamGeo = new THREE.CylinderGeometry(0.32, 0.32, 1, 12, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const spireGeo = new THREE.OctahedronGeometry(0.42, 0);

  const hazardPool = Array.from({ length: MAX_HAZARDS }, () => {
    const group = new THREE.Group();
    group.visible = false;
    const matTel = new THREE.MeshBasicMaterial({ color: 0xff5a18, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const matHot = new THREE.MeshBasicMaterial({ color: 0xffe49c, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const fissure = new THREE.Mesh(fissureGeo, matTel);
    const wallA = new THREE.Mesh(wallGeo, matHot);
    const wallB = new THREE.Mesh(wallGeo, matHot); wallB.rotation.y = Math.PI * 0.5;
    const ring = new THREE.Mesh(discGeo, matTel); ring.position.y = 0.06;
    const fill = new THREE.Mesh(fillGeo, matHot); fill.position.y = 0.05;
    const beam = new THREE.Mesh(beamGeo, matHot); beam.position.y = 1.0;
    const spire = new THREE.Mesh(spireGeo, matHot); spire.position.y = 1.2;
    group.add(fissure, wallA, wallB, ring, fill, beam, spire);
    scene.add(group);
    if (typeof pooledFx !== 'undefined') pooledFx.push(fissure, wallA, wallB, ring, fill, beam, spire);
    return { group, matTel, matHot, fissure, wallA, wallB, ring, fill, beam, spire };
  });

  // ---- 2. Pooled Multi-Bone Anime Ribbon Smears ---------------------------------------------------------------------
  const MAX_RIBBONS = 6, RIBBON_SEGS = 12;
  const activeRibbons = Array.from({ length: MAX_RIBBONS }, () => {
    const pos = new Float32Array((RIBBON_SEGS + 1) * 6);
    const idx = [];
    for (let i = 0; i < RIBBON_SEGS; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff7828, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    scene.add(mesh);
    if (typeof pooledFx !== 'undefined') pooledFx.push(mesh);
    const pts = Array.from({ length: RIBBON_SEGS + 1 }, () => new THREE.Vector3());
    return { mesh, geo, mat, pts, owner: null, socket: null, age: 99, life: 0.35, width: 0.55, count: 0 };
  });

  function startRibbon(enemy, socket, { color = 0xff7828, life = 0.35, width = 0.55 } = {}) {
    if (!enemy || !enemy.rig || !enemy.rig.isSkinnedV2) return;
    const r = activeRibbons.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
    r.owner = enemy;
    r.socket = socket;
    r.age = 0;
    r.life = life;
    r.width = width;
    r.count = 0;
    r.mat.color.setHex(color);
    r.mesh.visible = true;
    enemy.rig.socketWorldPos(socket, v0);
    for (let i = 0; i <= RIBBON_SEGS; i++) r.pts[i].copy(v0);
  }

  function updateRibbons(dt) {
    for (const r of activeRibbons) {
      if (!r.mesh.visible) continue;
      r.age += dt;
      if (r.age >= r.life || !r.owner || !r.owner.rig || r.owner.state === ES.DEAD) {
        r.mesh.visible = false;
        continue;
      }
      // Shift trail points back and sample new socket position
      for (let i = RIBBON_SEGS; i > 0; i--) r.pts[i].copy(r.pts[i - 1]);
      r.owner.rig.socketWorldPos(r.socket, r.pts[0]);
      r.count = Math.min(RIBBON_SEGS + 1, r.count + 1);

      const arr = r.geo.attributes.position.array;
      const fade = 1 - clamp(r.age / r.life, 0, 1);
      r.mat.opacity = fade * (isCalm() ? 0.45 : 0.82);
      for (let i = 0; i <= RIBBON_SEGS; i++) {
        const p = r.pts[i];
        const taper = (1 - i / RIBBON_SEGS) * r.width * 0.5;
        const o = i * 6;
        arr[o]     = p.x; arr[o + 1] = p.y + taper; arr[o + 2] = p.z;
        arr[o + 3] = p.x; arr[o + 4] = p.y - taper; arr[o + 5] = p.z;
      }
      r.geo.attributes.position.needsUpdate = true;
    }
  }

  function updateHazards(dt) {
    const all = typeof BossHazards !== 'undefined' ? BossHazards.all : [];
    for (let i = 0; i < MAX_HAZARDS; i++) {
      const slot = hazardPool[i];
      const h = all[i];
      if (!h) { slot.group.visible = false; continue; }
      slot.group.visible = true;
      slot.group.position.set(h.x, h.y, h.z);
      slot.group.rotation.set(0, h.yaw, 0);

      const inTel = h.age < h.telegraph;
      const inAct = h.age >= h.telegraph && h.age < h.telegraph + h.active;
      const telP = clamp(h.age / Math.max(0.05, h.telegraph), 0, 1);
      const actP = inAct ? clamp((h.age - h.telegraph) / Math.max(0.05, h.active), 0, 1) : 0;
      const fadeOut = h.age > h.telegraph + h.active
        ? 1 - clamp((h.age - h.telegraph - h.active) / Math.max(0.05, h.duration - h.telegraph - h.active), 0, 1)
        : 1;

      const isCinder = h.style === 'cinder';
      slot.matTel.color.setHex(isCinder ? 0xff4210 : 0xff7a28);
      slot.matHot.color.setHex(isCinder ? 0xfff0a8 : 0xffc864);

      slot.fissure.visible = slot.wallA.visible = slot.wallB.visible = false;
      slot.ring.visible = slot.fill.visible = slot.beam.visible = slot.spire.visible = false;

      if (h.kind === 'fissure') {
        slot.fissure.visible = true;
        slot.fissure.scale.set(h.radius * 2, 1, h.length);
        slot.matTel.opacity = inTel ? (0.28 + 0.52 * telP) : (0.65 * fadeOut);
        if (!inTel) {
          slot.wallA.visible = true;
          slot.wallA.scale.set(h.radius * 1.4, (inAct ? (0.6 + 0.7 * Math.sin(actP * Math.PI)) : 0.45 * fadeOut), h.length);
          slot.wallA.rotation.y = 0;
          slot.matHot.opacity = inAct ? 0.9 : 0.4 * fadeOut;
        }
      } else if (h.kind === 'beamAnchor') {
        slot.spire.visible = true;
        slot.spire.rotation.y += dt * 3.5;
        slot.beam.visible = true;
        const dx = h.tx - h.x, dz = h.tz - h.z;
        const dist = Math.max(0.5, Math.hypot(dx, dz));
        slot.group.rotation.y = Math.atan2(dx, dz);
        if (inTel) {
          const locked = telP >= 0.7;
          slot.beam.scale.set(locked ? 0.28 : 0.14, locked ? 0.28 : 0.14, dist);
          slot.matHot.opacity = locked ? 0.85 : 0.35 + 0.3 * telP;
        } else {
          const w = inAct ? h.radius * (1.2 + 0.4 * Math.sin(actP * Math.PI)) : h.radius * 0.5 * fadeOut;
          slot.beam.scale.set(w, w, dist);
          slot.matHot.opacity = inAct ? 0.95 : 0.45 * fadeOut;
        }
      } else {
        // novaZone
        slot.ring.visible = true;
        slot.ring.scale.setScalar(h.radius);
        slot.matTel.opacity = inTel ? (0.35 + 0.55 * telP) : 0.55 * fadeOut;
        slot.fill.visible = true;
        slot.fill.scale.setScalar(inTel ? h.radius * telP : h.radius * (1 + 0.18 * actP));
        slot.matHot.opacity = inTel ? (0.15 + 0.35 * telP) : (inAct ? 0.88 : 0.35 * fadeOut);
      }
    }
  }

  // ---- 3. Built-in Cue Handlers + Per-Boss Registry -----------------------------------------------------------------
  function burstAt(pos, color = 0xff7828, count = 14) {
    if (typeof ultraFx !== 'undefined' && ultraFx.on && ultraFx.on()) {
      const n = Math.max(4, Math.round(count * density()));
      ultraFx.moteBurst(pos, n, color, { r: 0.45, speed: 3.2, lift: 1.8, life: [0.3, 0.65], size: 1.2, boost: 2.2, up: 0.8 });
    }
  }

  function onCue(d) {
    const e = d.enemy, c = d.cue;
    if (!e || !c) return;
    // Built-in generic cue actions
    if (c.ribbon && e.rig && e.rig.isSkinnedV2) {
      const sockets = Array.isArray(c.socket) ? c.socket : [c.socket || e.rig.modelDef.primarySocket];
      for (const s of sockets) startRibbon(e, s, c.ribbon);
    }
    if (c.burst && e.rig && e.rig.isSkinnedV2) {
      e.rig.socketWorldPos(c.socket || e.rig.modelDef.primarySocket, v1);
      burstAt(v1, c.burst.color ?? 0xff7828, c.burst.count ?? 16);
    }
    if (c.shake && typeof Game !== 'undefined' && !isCalm()) {
      Game.shake = Math.max(Game.shake || 0, 0.22);
      Game.shakeDur = 0.22;
      Game.shakeAmp = Math.max(Game.shakeAmp || 0, c.shake);
    }
    if (c.sound && typeof audio !== 'undefined' && audio.play) {
      try { audio.play(c.sound, c.vel ?? 0.8); } catch {}
    }
    // Per-boss custom FX handler
    const handler = e.baseDef && registry.get(e.baseDef.id);
    if (handler && typeof handler.onCue === 'function') handler.onCue(d, { burstAt, startRibbon, v0, v1, v2, isCalm, density });
  }

  function register(bossId, handlers) { registry.set(bossId, handlers); }
  if (typeof BOSS_V2_FX !== 'undefined') {
    for (const [id, h] of Object.entries(BOSS_V2_FX)) registry.set(id, h);
  }

  if (typeof events !== 'undefined') {
    events.on('bossCue', onCue);
    events.on('hazardErupt', ({ hazard }) => {
      v2.set(hazard.x, hazard.y + 0.5, hazard.z);
      burstAt(v2, hazard.style === 'cinder' ? 0xff4810 : 0xff8a28, 18);
    });
  }

  let lastRenderT = 0;
  if (typeof Game !== 'undefined' && Array.isArray(Game.renderHooks)) {
    Game.renderHooks.push((game) => {
      const now = performance.now() * 0.001;
      const dt = game && game.mode === 'pause' ? 0 : Math.min(0.05, Math.max(0, lastRenderT ? now - lastRenderT : 1 / 60));
      lastRenderT = now;
      updateRibbons(dt);
      updateHazards(dt);
    });
  }

  return { register, startRibbon, burstAt };
})();
