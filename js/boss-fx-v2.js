'use strict';
// ============================================================================
// Boss v2 Modular Cue-Driven FX & Synced World Hazard Renderer (Shader-Driven)
// ============================================================================
// Pooled, zero-allocation-per-frame GLSL shaders for Boss v2 `bossCue` events,
// multi-bone anime ribbon smears, and first-class `BossHazards` (fissure, novaZone, beamAnchor).
// Matches area-marks.js / ultra-boss.js quality; respects Normal/Ultra budgets & reducedMotion().

const BossFxV2 = (() => {
  const registry = new Map();
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const isCalm = () => typeof reducedMotion === 'function' && reducedMotion();
  const density = () => {
    try { return VIS.fxBudgets[visuals.quality().fxBudget].density; } catch { return 0.7; }
  };

  // ---- 1. GLSL Shaders for World Hazards (no flat solid circles or sticks!) -----------------------------------------
  const quadVert = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

  // Crisp area-mark style novaZone: thin sharp perimeter showing exact hitbox edge, subtle fill wave, fiery eruption ring
  const novaFrag = `uniform vec3 uColor, uCore; uniform float uFill, uActive, uFade, uTime; varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.02) discard;
  float edge = 1.0 - smoothstep(0.0, 0.065, abs(r - 0.96));
  float innerFill = smoothstep(uFill + 0.04, uFill - 0.08, r) * (1.0 - smoothstep(0.96, 1.0, r));
  float wave = exp(-pow((r - uFill) * 14.0, 2.0)) * (1.0 - uActive);
  float erupt = uActive * (exp(-pow((r - 0.72) * 5.0, 2.0)) * 0.9 + (1.0 - smoothstep(0.0, 0.95, r)) * 0.45);
  float noise = 0.8 + 0.2 * sin(atan(p.y, p.x) * 12.0 + uTime * 6.0);
  float a = (edge * 0.85 + innerFill * 0.14 + wave * 0.55 + erupt * noise) * uFade;
  if (a < 0.005) discard;
  vec3 col = mix(uColor, uCore, clamp(edge * 0.65 + wave * 0.8 + erupt * 0.7, 0.0, 1.0));
  gl_FragColor = vec4(col * (1.1 + 0.7 * uActive), a);
}`;

  // Jagged magma ground fissure: crisp rectangular hitbox edge + glowing branching lava crack core
  const fissureFrag = `uniform vec3 uColor, uCore; uniform float uFill, uActive, uFade, uTime; varying vec2 vUv;
void main() {
  float x = abs(vUv.x - 0.5) * 2.0;
  float z = vUv.y;
  float jag = sin(z * 26.0 + uTime * 2.0) * 0.08 + sin(z * 58.0) * 0.04;
  float crack = exp(-pow((vUv.x - 0.5 + jag) * (10.0 - 5.0 * uActive), 2.0));
  float border = max(1.0 - smoothstep(0.0, 0.10, abs(x - 0.94)), 1.0 - smoothstep(0.0, 0.04, min(z, 1.0 - z)));
  float sweep = smoothstep(uFill + 0.05, uFill - 0.08, z);
  float a = (border * 0.55 + crack * (0.45 + 0.65 * uActive) * sweep + 0.10 * sweep) * uFade;
  if (a < 0.005) discard;
  vec3 col = mix(uColor, uCore, clamp(crack * 0.85 + uActive * 0.35, 0.0, 1.0));
  gl_FragColor = vec4(col * (1.1 + 0.8 * uActive), a);
}`;

  // Rising turbulent fire curtain on fissure eruption
  const curtainFrag = `uniform vec3 uColor, uCore; uniform float uActive, uFade, uTime; varying vec2 vUv;
void main() {
  float h = vUv.y;
  float w = 0.5 + 0.5 * sin(vUv.x * 24.0 - uTime * 9.0 + h * 6.0);
  float w2 = 0.5 + 0.5 * sin(vUv.x * 46.0 + uTime * 13.0 - h * 10.0);
  float flame = smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(0.35 + 0.45 * w, 1.0, h));
  float a = flame * (0.45 + 0.55 * w2) * uActive * uFade;
  if (a < 0.005) discard;
  gl_FragColor = vec4(mix(uColor, uCore, (1.0 - h) * 0.75 + w2 * 0.25) * 1.5, a);
}`;

  // Volumetric scrolling beam shader (crisp thin laser sightline -> roaring plasma beam)
  const beamVert = 'varying vec2 vUv; varying vec3 vN, vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }';
  const beamFrag = `uniform vec3 uColor, uCore; uniform float uActive, uLocked, uFade, uTime; varying vec2 vUv; varying vec3 vN, vV;
void main() {
  float fres = pow(max(0.0001, abs(dot(vN, vV))), 1.3);
  float scroll = 0.72 + 0.28 * sin(vUv.y * 32.0 - uTime * 22.0 + vUv.x * 12.0);
  float endFade = smoothstep(0.0, 0.03, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
  float a = fres * scroll * endFade * (uActive > 0.5 ? 0.92 : (0.35 + 0.45 * uLocked)) * uFade;
  if (a < 0.005) discard;
  vec3 col = mix(uColor, uCore, clamp(fres * 0.8 + uLocked * 0.3, 0.0, 1.0));
  gl_FragColor = vec4(col * (1.2 + 0.9 * uActive), a);
}`;

  // Tapered anime smear ribbon shader
  const ribbonFrag = `uniform vec3 uColor, uCore; uniform float uOpacity; varying vec2 vUv;
void main() {
  float along = clamp(1.0 - vUv.x, 0.0001, 1.0);
  float across = clamp(1.0 - abs(vUv.y * 2.0 - 1.0), 0.0001, 1.0);
  float a = pow(along, 1.4) * pow(across, 0.7) * uOpacity;
  if (a < 0.005) discard;
  vec3 col = mix(uColor, uCore, clamp(along * 0.6 + across * 0.4, 0.0, 1.0));
  gl_FragColor = vec4(col * 1.6, a);
}`;

  // ---- 2. Pooled World Hazard Meshes --------------------------------------------------------------------------------
  const MAX_HAZARDS = 16;
  const fissureGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0.05, 0.5);
  const wallGeo = new THREE.PlaneGeometry(1, 2.5).translate(0, 1.25, 0.5);
  const novaGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const beamGeo = new THREE.CylinderGeometry(0.45, 0.45, 1, 16, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const spireGeo = new THREE.OctahedronGeometry(0.36, 0);
  const spireCoreGeo = new THREE.OctahedronGeometry(0.20, 0);

  const hazardPool = Array.from({ length: MAX_HAZARDS }, () => {
    const group = new THREE.Group();
    group.visible = false;

    const novaMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: novaFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(0xff5214) }, uCore: { value: new THREE.Color(0xfff0b0) }, uFill: { value: 0 }, uActive: { value: 0 }, uFade: { value: 1 }, uTime: { value: 0 } },
    });
    const fissureMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: fissureFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(0xff4a10) }, uCore: { value: new THREE.Color(0xffe89c) }, uFill: { value: 0 }, uActive: { value: 0 }, uFade: { value: 1 }, uTime: { value: 0 } },
    });
    const curtainMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: curtainFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(0xff4e12) }, uCore: { value: new THREE.Color(0xfff2b8) }, uActive: { value: 0 }, uFade: { value: 1 }, uTime: { value: 0 } },
    });
    const beamMat = new THREE.ShaderMaterial({
      vertexShader: beamVert, fragmentShader: beamFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(0xff5a18) }, uCore: { value: new THREE.Color(0xfff6cc) }, uActive: { value: 0 }, uLocked: { value: 0 }, uFade: { value: 1 }, uTime: { value: 0 } },
    });
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x1a161c, roughness: 0.4, metalness: 0.55, emissive: 0x3a1004 });
    const spireCoreMat = new THREE.MeshBasicMaterial({ color: 0xffaa38, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });

    const nova = new THREE.Mesh(novaGeo, novaMat); nova.position.y = 0.05; nova.renderOrder = 3;
    const fissure = new THREE.Mesh(fissureGeo, fissureMat); fissure.renderOrder = 3;
    const wallA = new THREE.Mesh(wallGeo, curtainMat); wallA.renderOrder = 4;
    const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.y = 1.05; beam.renderOrder = 5;
    const spire = new THREE.Mesh(spireGeo, spireMat); spire.position.y = 1.15; spire.scale.set(0.85, 1.55, 0.85);
    const spireCore = new THREE.Mesh(spireCoreGeo, spireCoreMat); spireCore.position.y = 1.15; spireCore.scale.set(1.1, 1.8, 1.1);

    group.add(nova, fissure, wallA, beam, spire, spireCore);
    scene.add(group);
    if (typeof pooledFx !== 'undefined') pooledFx.push(nova, fissure, wallA, beam, spire, spireCore);
    return { group, nova, novaMat, fissure, fissureMat, wallA, curtainMat, beam, beamMat, spire, spireCore, spireCoreMat };
  });

  // ---- 3. Pooled Multi-Bone Anime Ribbon Smears (ShaderMaterial) ----------------------------------------------------
  const MAX_RIBBONS = 6, RIBBON_SEGS = 12;
  const activeRibbons = Array.from({ length: MAX_RIBBONS }, () => {
    const pos = new Float32Array((RIBBON_SEGS + 1) * 6);
    const uv = new Float32Array((RIBBON_SEGS + 1) * 4);
    const idx = [];
    for (let i = 0; i <= RIBBON_SEGS; i++) {
      const u = i / RIBBON_SEGS;
      uv[i * 4] = u; uv[i * 4 + 1] = 0;
      uv[i * 4 + 2] = u; uv[i * 4 + 3] = 1;
    }
    for (let i = 0; i < RIBBON_SEGS; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: ribbonFrag, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(0xff5e18) }, uCore: { value: new THREE.Color(0xfff4c4) }, uOpacity: { value: 0 } },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    scene.add(mesh);
    if (typeof pooledFx !== 'undefined') pooledFx.push(mesh);
    const pts = Array.from({ length: RIBBON_SEGS + 1 }, () => new THREE.Vector3());
    return { mesh, geo, mat, pts, owner: null, socket: null, age: 99, life: 0.35, width: 0.55 };
  });

  function startRibbon(enemy, socket, { color = 0xff6218, life = 0.35, width = 0.55 } = {}) {
    if (!enemy || !enemy.rig || !enemy.rig.isSkinnedV2) return;
    const r = activeRibbons.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
    r.owner = enemy;
    r.socket = socket;
    r.age = 0;
    r.life = life;
    r.width = width;
    r.mat.uniforms.uColor.value.setHex(color);
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
      for (let i = RIBBON_SEGS; i > 0; i--) r.pts[i].copy(r.pts[i - 1]);
      r.owner.rig.socketWorldPos(r.socket, r.pts[0]);

      const arr = r.geo.attributes.position.array;
      const fade = 1 - clamp(r.age / r.life, 0, 1);
      r.mat.uniforms.uOpacity.value = fade * (isCalm() ? 0.45 : 0.88);
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

  let fxClock = 0;
  function updateHazards(dt) {
    fxClock += dt;
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

      slot.nova.visible = slot.fissure.visible = slot.wallA.visible = slot.beam.visible = slot.spire.visible = slot.spireCore.visible = false;

      if (h.kind === 'fissure') {
        slot.fissure.visible = true;
        slot.fissure.scale.set(h.radius * 2, 1, h.length);
        const u = slot.fissureMat.uniforms;
        u.uFill.value = telP; u.uActive.value = inAct ? 1 : 0; u.uFade.value = fadeOut; u.uTime.value = fxClock;
        if (!inTel) {
          slot.wallA.visible = true;
          slot.wallA.scale.set(h.radius * 1.4, inAct ? (0.7 + 0.65 * Math.sin(actP * Math.PI)) : 0.45 * fadeOut, h.length);
          const cu = slot.curtainMat.uniforms;
          cu.uActive.value = inAct ? 1 : 0.45; cu.uFade.value = fadeOut; cu.uTime.value = fxClock;
        }
      } else if (h.kind === 'beamAnchor') {
        slot.spire.visible = slot.spireCore.visible = slot.beam.visible = true;
        slot.spire.rotation.y += dt * 2.4;
        slot.spireCore.rotation.y -= dt * 3.8;
        const dx = h.tx - h.x, dz = h.tz - h.z;
        const dist = Math.max(0.5, Math.hypot(dx, dz));
        slot.group.rotation.y = Math.atan2(dx, dz);
        const locked = telP >= (h.lockAt ?? 0.65);
        const bw = inTel ? (locked ? 0.12 : 0.06) : (inAct ? h.radius * (0.95 + 0.35 * Math.sin(actP * Math.PI)) : h.radius * 0.4 * fadeOut);
        slot.beam.scale.set(bw, bw, dist);
        const bu = slot.beamMat.uniforms;
        bu.uActive.value = inAct ? 1 : 0; bu.uLocked.value = locked ? 1 : 0; bu.uFade.value = fadeOut; bu.uTime.value = fxClock;
        slot.spireCoreMat.opacity = (locked || inAct ? 0.95 : 0.55) * fadeOut;
      } else {
        // novaZone
        slot.nova.visible = true;
        slot.nova.scale.setScalar(h.radius);
        const nu = slot.novaMat.uniforms;
        nu.uFill.value = telP; nu.uActive.value = inAct ? 1 : 0; nu.uFade.value = fadeOut; nu.uTime.value = fxClock;
      }
    }
  }

  // ---- 4. Built-in Cue Handlers + Per-Boss Registry -----------------------------------------------------------------
  function burstAt(pos, color = 0xff6218, count = 14) {
    if (typeof ultraFx !== 'undefined' && ultraFx.on && ultraFx.on()) {
      const n = Math.max(4, Math.round(count * density()));
      ultraFx.moteBurst(pos, n, color, { r: 0.45, speed: 3.4, lift: 1.9, life: [0.3, 0.65], size: 1.25, boost: 2.3, up: 0.8 });
    }
  }

  function onCue(d) {
    const e = d.enemy, c = d.cue;
    if (!e || !c) return;
    if (c.ribbon && e.rig && e.rig.isSkinnedV2) {
      const sockets = Array.isArray(c.socket) ? c.socket : [c.socket || e.rig.modelDef.primarySocket];
      for (const s of sockets) startRibbon(e, s, c.ribbon);
    }
    if (c.burst && e.rig && e.rig.isSkinnedV2) {
      const sockets = Array.isArray(c.socket) ? c.socket : [c.socket || e.rig.modelDef.primarySocket];
      for (const s of sockets) {
        e.rig.socketWorldPos(s, v1);
        burstAt(v1, c.burst.color ?? 0xff6218, c.burst.count ?? 16);
      }
    }
    if (c.shake && typeof Game !== 'undefined' && !isCalm()) {
      Game.shake = Math.max(Game.shake || 0, 0.22);
      Game.shakeDur = 0.22;
      Game.shakeAmp = Math.max(Game.shakeAmp || 0, c.shake);
    }
    if (c.sound && typeof audio !== 'undefined' && audio.play) {
      try { audio.play(c.sound, c.vel ?? 0.8); } catch {}
    }
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
      burstAt(v2, hazard.style === 'cinder' ? 0xff4810 : 0xff7a20, 22);
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
