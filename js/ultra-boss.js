'use strict';
// ============================================================================
// 9e. Boss effects (Normal & Ultra presets): each boss's power drawn in its element (js/data/boss-fx.js)
// ============================================================================
// Drawing only. Built on js/ultra-fx.js (motes, sparks, drops, puffs, chunks, impact lights, flares) and
// js/ultra-post.js (shockwaves, lens pulses), plus pooled 3D geometry primitives (curved anime slash crescents,
// Fresnel shock domes, procedural ground fracture/rune glyphs, erupting 3D spires, and jagged 3D energy arcs).
// Every pool is built once at load and warmed up via pooledFx; nothing is allocated per frame in hot paths.
// Normal preset scales particle/spire/arc counts by VIS.fxBudgets.normal.density (0.55) and skips secondary echo
// layers so it looks spectacular while staying fast on integrated graphics. Screen flashes stay under 3 Hz and
// respect reducedMotion().
const ultraBoss = (() => {
  const U = VIS.ultra, BB = U.boss, fx = ultraFx, on = () => fx.on();
  const isUltra = () => visuals.quality().ultra;
  const density = () => VIS.fxBudgets[visuals.quality().fxBudget].density;
  const calm = () => typeof reducedMotion === 'function' && reducedMotion();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const col = new THREE.Color(), col2 = new THREE.Color(), dummy = new THREE.Object3D();
  const UP = new THREE.Vector3(0, 1, 0), tmpDir = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
  const PUFF_VEL = [0, 0, 0], UP_DIR = [0, 1, 0];
  const STEEL = FX_ELEMENTS.steel;
  let generation = 0;
  function later(fn, ms) {
    const owner = generation;
    setTimeout(() => { if (owner === generation && on()) fn(); }, ms);
  }

  // ---- what a boss looks like right now (phase + attack + per-hit overrides) ----------------------------------------------
  function look(e, hitIndex = null) {
    if (!e || !e.baseDef) return null;
    const spec = BOSS_FX[e.baseDef.id];
    if (!spec && !fx.isBoss(e)) return null;
    const a = spec && spec.attacks && e.attack ? spec.attacks[e.attack.id] : null;
    const hi = hitIndex !== null ? hitIndex : (e.hitIndex || 0);
    const h = a && a.hits ? a.hits[hi] || null : null;
    const name = (h && h.element) || (a && a.element) || (spec && spec.phases && spec.phases[e.def?.phaseId]) || (spec ? spec.element : 'steel');
    return { spec, a, h, name, el: FX_ELEMENTS[name] || STEEL, scale: e.baseDef.scale || 1 };
  }
  const pickProp = (L, key) => (L.h && L.h[key] !== undefined ? L.h[key] : L.a && L.a[key] !== undefined ? L.a[key] : null);
  fx.hooks.aura = e => {
    const L = look(e);
    if (!L || !L.spec) return null;
    if (L.a && L.a.aura) return L.a.aura;
    return L.spec.phases && L.spec.phases[e.def?.phaseId] && L.spec.phases[e.def?.phaseId] !== L.spec.element ? L.el.mote : L.spec.aura ?? L.el.mote;
  };
  fx.hooks.trail = b => { const L = look(b); return L ? [L.el.trail, U.trails.enemyBoost * BB.trailBoost] : null; };
  fx.hooks.bolt = bolt => {
    const L = look(bolt.owner);
    if (!L) return false;
    fx.moteBurst(bolt, 2, L.el.mote, { r: 0.08, speed: 0.3, lift: 0, life: [0.25, 0.5], size: 0.9, boost: 2.4, up: 0 });
    if (Math.random() < 0.4) fx.sparkBurst(bolt, 1, L.el.sparks, null, 0, 0.3);
    return true;
  };
  fx.hooks.impact = d => {
    const L = look(d.enemy);
    if (!L) return false;
    const kind = pickProp(L, 'impact') || L.el.impact;
    IMPACT[kind](d.x, d.y, d.z, d.fx.ring || 1, L, d.enemy);
    triggerExtras(d.x, d.y, d.z, d.fx.ring || 1, L, d.enemy, true);
    return true;
  };

  // ---- resolve the actual striking point (supports `tell` bones: claw, footL, footR, shield, etc.) ------------------------
  const tip = (e, z, out) => { e.rig.weapon.updateWorldMatrix(true, false); return out.set(0, 0, z).applyMatrix4(e.rig.weapon.matrixWorld); };
  function strikePoint(e, h, out, z = 1.0) {
    if (h && h.tell && e.rig && e.rig.tellGlows && e.rig.tellGlows[h.tell]) {
      e.rig.tellGlows[h.tell].updateWorldMatrix(true, false);
      return e.rig.tellGlows[h.tell].getWorldPosition(out);
    }
    return tip(e, z, out);
  }

  // ---- pooled ground rings, pillars, ground fires, weapon glows -----------------------------------------------------------
  const ringMat = () => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 }, uWidth: { value: 0.1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity, uWidth; varying vec2 vP;
void main() {
  float r = length(vP), x = (r - 1.0) / max(uWidth, 0.01);
  float band = exp(-x * x * 2.5) + 0.05 * smoothstep(0.0, 1.0, r) * step(r, 1.0);
  float a = band * uOpacity; if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * (0.7 + 0.8 * exp(-x * x * 8.0)), a);
}` });
  const ringGeo = new THREE.PlaneGeometry(2.4, 2.4);
  const rings = Array.from({ length: BB.rings }, () => {
    const m = new THREE.Mesh(ringGeo, ringMat());
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity, time: 1, r0: 0, r1: 1, width: 0.5, peak: 1 };
  });
  function groundRing(x, y, z, r0, r1, time, color, width = BB.ringWidth, peak = 1) {
    const R = rings.reduce((a, b) => b.age / b.time > a.age / a.time ? b : a);
    Object.assign(R, { age: 0, time, r0, r1, width, peak });
    R.m.position.set(x, y + 0.06, z); R.m.material.uniforms.uColor.value.set(color).multiplyScalar(1.6); R.m.visible = true;
  }

  const pillarMat = () => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uCore: { value: new THREE.Color() }, uOpacity: { value: 0 }, uTime: vTime },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uColor, uCore; uniform float uOpacity, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
  float h = vUv.y, streak = 0.72 + 0.28 * sin(vUv.x * 40.0 + h * 9.0 - uTime * 14.0);
  float a = edge * edge * streak * (1.0 - smoothstep(0.35, 1.0, h)) * smoothstep(0.0, 0.04, h) * uOpacity * 0.62;
  if (a < 0.003) discard;
  gl_FragColor = vec4(mix(uColor, uCore, edge * edge) * 1.6, a);
}` });
  const pillarGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true).translate(0, 0.5, 0);
  const pillars = Array.from({ length: BB.pillars }, () => {
    const m = new THREE.Mesh(pillarGeo, pillarMat());
    m.visible = false; m.renderOrder = 4; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity, r: 1, h: 1 };
  });
  function pillar(x, y, z, r, h, el) {
    const P = pillars.reduce((a, b) => b.age > a.age ? b : a);
    P.age = 0; P.r = r; P.h = h; P.m.position.set(x, y, z);
    P.m.material.uniforms.uColor.value.set(el.glow); P.m.material.uniforms.uCore.value.set(el.core); P.m.visible = true;
  }

  const fires = Array.from({ length: BB.fires }, () => {
    const m = new THREE.Mesh(fx.fireGeo, fx.fireMat(Math.random() * 40));
    m.visible = false; m.renderOrder = 3; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity, life: 1, size: 1 };
  });
  function groundFire(x, y, z, size, life = between(Math.random, BB.fireTime), tint = null) {
    const F = fires.reduce((a, b) => b.age / b.life > a.age / a.life ? b : a);
    F.age = 0; F.life = life; F.size = size; F.m.position.set(x, y, z); F.m.visible = true;
    const u = F.m.material.uniforms, Fc = U.fire;
    u.uW.value = 0.9; u.uH.value = 1.6;
    u.uCore.value.set(tint ? tint.core : Fc.core).multiplyScalar(Fc.boost); u.uMid.value.set(tint ? tint.glow : Fc.mid).multiplyScalar(Fc.boost * 0.8);
    u.uEdge.value.set(tint ? tint.glow : Fc.edge).multiplyScalar(Fc.boost * 0.5);
  }

  const glows = new Map(), glowPool = Array.from({ length: 8 }, () => {
    const s = glowSprite(0xffffff, 1, 1, 0, null); s.visible = false; s.renderOrder = 6; scene.add(s); pooledFx.push(s); return s;
  });

  // ---- 1. Pooled 3D anime slash crescents (sweep, backhand, chop, claw, wheel, thrust, uppercut, cross) -------------------
  function buildCrescentGeo(arcSpan, innerR, outerR, segs, cup = 0.14) {
    const pos = new Float32Array((segs + 1) * 6), uv = new Float32Array((segs + 1) * 4), idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, ang = (t - 0.5) * arcSpan;
      const taper = Math.sin(t * Math.PI);   // pinched razor tips at both ends
      const rIn = lerp(outerR * 0.96, innerR, Math.pow(taper, 0.72));
      const rOut = outerR * (0.94 + 0.08 * taper);
      const s = Math.sin(ang), c = Math.cos(ang), yCup = cup * taper;
      const o = i * 6;
      pos[o]     = s * rIn;  pos[o + 1] = -yCup * 0.45; pos[o + 2] = c * rIn;
      pos[o + 3] = s * rOut; pos[o + 4] =  yCup;        pos[o + 5] = c * rOut;
      uv[i * 4] = t; uv[i * 4 + 1] = 0; uv[i * 4 + 2] = t; uv[i * 4 + 3] = 1;
      if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  const SLASH_GEO = buildCrescentGeo(Math.PI * 0.92, 0.42, 1.0, 28, 0.16);
  const WHEEL_GEO = buildCrescentGeo(Math.PI * 1.85, 0.48, 1.0, 40, 0.12);
  const THRUST_GEO = (() => {   // piercing conical shock-sheath along +Z (u along length 0..1, v peaked near outer tip)
    const g = new THREE.CylinderGeometry(0.06, 0.72, 2.4, 20, 1, true);
    g.rotateX(Math.PI / 2); g.translate(0, 0, 1.2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const len = uv.getY(i);   // 0 at base, 1 at spear tip
      uv.setXY(i, len, 0.52 + 0.45 * len);
    }
    return g;
  })();
  const slashMat = () => new THREE.ShaderMaterial({
    uniforms: { uCore: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSmoke: { value: new THREE.Color() },
                uHasSmoke: { value: 0 }, uOpacity: { value: 0 }, uProg: { value: 0 }, uDir: { value: 1 }, uSlim: { value: 0 }, uTime: vTime },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uCore, uGlow, uSmoke; uniform float uHasSmoke, uOpacity, uProg, uDir, uSlim, uTime; varying vec2 vUv;
void main() {
  float u = uDir > 0.0 ? vUv.x : 1.0 - vUv.x;
  float v = vUv.y;
  float head = clamp(uProg * 1.55, 0.0, 1.25);
  float tail = clamp((uProg - 0.16) * 1.28, 0.0, 1.0);
  float along = smoothstep(tail - 0.18, tail + 0.12, u) * (1.0 - smoothstep(head - 0.06, head + 0.04, u));
  float ends = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x));
  float wisp = 0.72 + 0.28 * sin(u * 26.0 - uTime * 22.0 + v * 7.0) * cos(u * 13.0 + v * 4.0);
  float vStart = mix(0.0, 0.56, uSlim);
  float body = smoothstep(vStart, vStart + 0.34, v) * (0.22 + 0.78 * v) * wisp;
  float rim = smoothstep(mix(0.78, 0.84, uSlim), 0.97, v) * (1.0 - smoothstep(0.94, 1.0, v)) * 2.1;
  float coreEdge = smoothstep(0.86, 0.96, v);
  float a = (body * 0.58 + rim) * along * ends * uOpacity;
  if (a < 0.004) discard;
  vec3 c = mix(uGlow, uCore, clamp(coreEdge * 0.82 + rim * 0.14, 0.0, 1.0));
  if (uHasSmoke > 0.5) c = mix(uSmoke * 1.4, c, smoothstep(0.08, 0.65, v));
  gl_FragColor = vec4(c * (1.0 + 0.65 * coreEdge), a);
}` });
  const slashes = Array.from({ length: BB.slashes }, () => {
    const m = new THREE.Mesh(SLASH_GEO, slashMat());
    m.visible = false; m.renderOrder = 5; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity, time: BB.slashTime, s0: 1, s1: 1, sy: 1, spin: 0, dir: 1, peak: 1, vx: 0, vz: 0 };
  });
  function spawnOneSlash(x, y, z, yaw, rx, rz, scale, el, { geo = SLASH_GEO, dir = 1, time = BB.slashTime, spin = 0, peak = 0.95, sy = 1, push = 0, slim = 0, color = null } = {}) {
    const S = slashes.reduce((a, b) => b.age / b.time > a.age / a.time ? b : a);
    S.age = 0; S.time = time; S.s0 = scale * 0.78; S.s1 = scale * 1.18; S.sy = sy; S.spin = spin; S.dir = dir; S.peak = peak;
    S.vx = Math.sin(yaw) * push; S.vz = Math.cos(yaw) * push;
    S.m.geometry = geo;
    S.m.position.set(x, y, z);
    S.m.rotation.order = 'YXZ';
    S.m.rotation.set(rx, yaw, rz);
    const u = S.m.material.uniforms;
    u.uCore.value.set(el.core).multiplyScalar(1.22);
    u.uGlow.value.set(color ?? el.glow).multiplyScalar(1.28);
    u.uSmoke.value.set(el.smoke ?? 0x000000);
    u.uHasSmoke.value = el.smoke !== undefined ? 1 : 0;
    u.uDir.value = dir; u.uSlim.value = slim; u.uProg.value = 0; u.uOpacity.value = peak;
    S.m.visible = true;
  }
  function slashArc(e, spec, el) {
    const cfg = typeof spec === 'string' ? { kind: spec } : spec;
    const sc = (cfg.scale || 1.1) * Math.max(1, (e.baseDef?.scale || 1) * 1.05);
    const y = e.y + (cfg.y ?? (e.height || 2) * 0.45);
    const tilt = cfg.tilt || 0, yaw = e.yaw, k = cfg.kind, colOvr = cfg.color ?? null;
    const echo = isUltra() && !calm();
    if (k === 'sweep' || k === 'backhand') {
      const dir = k === 'sweep' ? 1 : -1;
      spawnOneSlash(e.x, y, e.z, yaw, 0.05, tilt, sc, el, { dir, spin: dir * 1.35, peak: 0.95, color: colOvr });
      if (echo) spawnOneSlash(e.x, y + 0.08, e.z, yaw, 0.08, tilt * 1.25, sc * 1.16, el, { dir, spin: dir * 1.5, time: BB.slashTime * 1.18, peak: 0.48, color: colOvr });
    } else if (k === 'chop' || k === 'uppercut') {
      const dir = k === 'chop' ? -1 : 1;
      const fx0 = e.x + Math.sin(yaw) * sc * 0.35, fz0 = e.z + Math.cos(yaw) * sc * 0.35;
      spawnOneSlash(fx0, y, fz0, yaw, 0, Math.PI * 0.5 + tilt, sc, el, { dir, spin: 0, peak: 0.98, time: BB.slashTime * 1.05, color: colOvr });
      if (echo) spawnOneSlash(fx0, y, fz0, yaw, 0, Math.PI * 0.5 + tilt + 0.14, sc * 1.14, el, { dir, peak: 0.48, time: BB.slashTime * 1.22, color: colOvr });
    } else if (k === 'claw') {
      const offsets = isUltra() ? [-0.55, 0, 0.55] : [-0.36, 0.36];
      const sx = Math.cos(yaw), sz = -Math.sin(yaw);
      for (let i = 0; i < offsets.length; i++) {
        const off = offsets[i] * Math.sqrt(e.baseDef?.scale || 1);
        const fan = offsets[i] * 0.24;
        spawnOneSlash(e.x + sx * off * 0.55, y + off * 0.85, e.z + sz * off * 0.55, yaw, 0.08, 0.44 + tilt + fan, sc * (0.94 + 0.06 * (i === 1 ? 1 : 0)), el,
          { dir: -1, spin: -1.15, slim: 1, peak: i === 1 || !isUltra() ? 0.94 : 0.78, time: BB.slashTime * 0.95, color: colOvr });
      }
    } else if (k === 'wheel') {
      spawnOneSlash(e.x, y, e.z, yaw, 0.06, tilt, sc, el, { geo: WHEEL_GEO, dir: 1, spin: 5.2, time: BB.slashTime * 1.25, peak: 0.92, color: colOvr });
      if (echo) spawnOneSlash(e.x, y + 0.22, e.z, yaw + 1.1, -0.06, -tilt, sc * 1.14, el, { geo: WHEEL_GEO, dir: 1, spin: 6.2, time: BB.slashTime * 1.38, peak: 0.46, color: colOvr });
    } else if (k === 'thrust') {
      spawnOneSlash(e.x + Math.sin(yaw) * 0.6, y, e.z + Math.cos(yaw) * 0.6, yaw, 0, 0, sc * 0.85, el,
        { geo: THRUST_GEO, dir: 1, time: BB.slashTime * 0.9, peak: 0.95, push: 5.5, color: colOvr });
      if (echo) spawnOneSlash(e.x + Math.sin(yaw) * 0.9, y, e.z + Math.cos(yaw) * 0.9, yaw, 0, 0.4, sc * 0.65, el,
        { geo: THRUST_GEO, dir: 1, time: BB.slashTime * 1.1, peak: 0.52, push: 7.5, color: colOvr });
    } else if (k === 'cross') {
      spawnOneSlash(e.x, y, e.z, yaw, 0.04,  0.58 + tilt, sc, el, { dir:  1, spin:  1.1, peak: 0.92, color: colOvr });
      spawnOneSlash(e.x, y, e.z, yaw, 0.04, -0.58 + tilt, sc, el, { dir: -1, spin: -1.1, peak: 0.92, color: colOvr });
    }
  }

  // ---- 2. Pooled Fresnel shock domes (impact blasts, stomps, roars, phase transitions) ------------------------------------
  const domeGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const domeMat = () => new THREE.ShaderMaterial({
    uniforms: { uCore: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uOpacity: { value: 0 }, uProg: { value: 0 }, uTime: vTime },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vL; void main() { vL = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uCore, uGlow; uniform float uOpacity, uProg, uTime; varying vec3 vN; varying vec3 vV; varying vec3 vL;
void main() {
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  float fresnel = pow(max(0.0, 1.0 - ndv), 2.2);
  float ang = atan(vL.z, vL.x);
  float ribs = 0.72 + 0.28 * sin(ang * 12.0 + vL.y * 5.0 - uTime * 8.0);
  float band = exp(-pow((vL.y - uProg * 0.92) * 5.5, 2.0)) * 0.85;
  float base = smoothstep(0.0, 0.14, vL.y);
  float a = (fresnel * ribs * 0.88 + band * 0.55) * base * uOpacity;
  if (a < 0.004) discard;
  vec3 c = mix(uGlow, uCore, clamp(fresnel * 0.75 + band * 0.5, 0.0, 1.0));
  gl_FragColor = vec4(c * 1.45, a);
}` });
  const domes = Array.from({ length: BB.domes }, () => {
    const m = new THREE.Mesh(domeGeo, domeMat());
    m.visible = false; m.renderOrder = 4; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity, time: BB.domeTime, r: 4, h: 3, peak: 0.85 };
  });
  function shockDome(x, y, z, radius, height, el, time = BB.domeTime, peak = 0.82) {
    const D = domes.reduce((a, b) => b.age / b.time > a.age / a.time ? b : a);
    D.age = 0; D.time = time; D.r = radius; D.h = height || radius * 0.62; D.peak = peak;
    D.m.position.set(x, y + 0.02, z);
    const u = D.m.material.uniforms;
    u.uCore.value.set(el.core).multiplyScalar(1.3);
    u.uGlow.value.set(el.glow).multiplyScalar(1.45);
    u.uProg.value = 0; u.uOpacity.value = peak;
    D.m.visible = true;
  }

  // ---- 3. Pooled procedural ground fracture & rune glyphs (shatter, toll, arcane, vortex, rend) ---------------------------
  const GLYPH_ID = { shatter: 0, toll: 1, arcane: 2, vortex: 3, rend: 4 };
  const glyphGeo = new THREE.PlaneGeometry(2, 2);
  const glyphMat = () => new THREE.ShaderMaterial({
    uniforms: { uCore: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uOpacity: { value: 0 },
                uStyle: { value: 0 }, uProg: { value: 0 }, uSeed: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -3,
    vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uCore, uGlow; uniform float uOpacity, uStyle, uProg, uSeed; varying vec2 vP;
void main() {
  float r = length(vP);
  if (r > 1.0) discard;
  float a0 = atan(vP.y, vP.x) + uSeed;
  float reveal = smoothstep(r - 0.14, r + 0.04, clamp(uProg * 5.2, 0.0, 1.2));
  float outerFade = 1.0 - smoothstep(0.74, 1.0, r);
  float pat = 0.0, hot = 0.0;
  if (uStyle < 0.5) {   // shatter: jagged radial cracks glowing molten/elemental from beneath
    float jag = sin(r * 16.0 + uSeed * 3.0) * 0.14 + sin(r * 31.0 - uSeed * 5.0) * 0.06;
    float rays = abs(sin((a0 + jag) * 5.0));
    float crack = (1.0 - smoothstep(0.0, 0.16 / max(0.28, r), rays)) * smoothstep(0.06, 0.2, r);
    float sub = (1.0 - smoothstep(0.0, 0.1 / max(0.35, r), abs(sin((a0 - jag * 1.4) * 9.0 + 1.1)))) * smoothstep(0.28, 0.5, r) * 0.65;
    float rim = exp(-pow((r - 0.78) * 14.0, 2.0)) * 0.55;
    pat = max(max(crack, sub), rim) * outerFade;
    hot = smoothstep(0.55, 1.0, crack) * (1.0 - r * 0.6);
  } else if (uStyle < 1.5) {   // toll: concentric harmonic bell waves & resonance nodes
    float rings = pow(max(0.0, 0.5 + 0.5 * cos(r * 25.13 - uProg * 6.0)), 4.0);
    float nodes = 0.6 + 0.4 * cos(a0 * 8.0);
    pat = rings * nodes * smoothstep(0.08, 0.25, r) * outerFade;
    hot = rings * rings * 0.7;
  } else if (uStyle < 2.5) {   // arcane: geometric astrolabe rings + 8-point star
    float c1 = exp(-pow((r - 0.88) * 28.0, 2.0));
    float c2 = exp(-pow((r - 0.56) * 26.0, 2.0));
    float star = 1.0 - smoothstep(0.0, 0.09 / max(0.25, r), abs(sin(a0 * 4.0)));
    pat = max(max(c1, c2 * 0.85), star * step(r, 0.88) * 0.65) * outerFade;
    hot = max(c1, star * 0.5);
  } else if (uStyle < 3.5) {   // vortex: swirling cyclone spiral arms
    float sp = pow(max(0.0, 0.5 + 0.5 * sin(a0 * 4.0 + r * 12.0 - uProg * 8.0)), 3.0);
    pat = sp * smoothstep(0.05, 0.3, r) * outerFade;
    hot = sp * (1.0 - r * 0.5) * 0.65;
  } else {   // rend: parallel jagged claw / root gouges
    float s1 = exp(-pow((vP.x - sin(vP.y * 6.0 + uSeed) * 0.08) * 16.0, 2.0));
    float s2 = exp(-pow((vP.x - 0.34 - sin(vP.y * 5.0) * 0.06) * 18.0, 2.0));
    float s3 = exp(-pow((vP.x + 0.34 + sin(vP.y * 5.0) * 0.06) * 18.0, 2.0));
    pat = max(s1, max(s2, s3) * 0.8) * (1.0 - smoothstep(0.62, 0.96, abs(vP.y))) * outerFade;
    hot = s1 * 0.8;
  }
  float a = pat * reveal * uOpacity;
  if (a < 0.004) discard;
  vec3 c = mix(uGlow, uCore, clamp(hot, 0.0, 1.0));
  gl_FragColor = vec4(c * (1.15 + 0.75 * hot), a);
}` });
  const glyphs = Array.from({ length: BB.glyphs }, () => {
    const m = new THREE.Mesh(glyphGeo, glyphMat());
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity, time: BB.glyphTime, peak: 0.9, spin: 0 };
  });
  function groundGlyph(x, y, z, radius, style, el, { time = BB.glyphTime, peak = 0.9, yaw = 0, spin = 0 } = {}) {
    const G = glyphs.reduce((a, b) => b.age / b.time > a.age / a.time ? b : a);
    G.age = 0; G.time = time; G.peak = peak; G.spin = spin;
    G.m.position.set(x, y + 0.045, z);
    G.m.rotation.set(-Math.PI / 2, 0, yaw);
    G.m.scale.setScalar(radius);
    const u = G.m.material.uniforms;
    u.uCore.value.set(el.core).multiplyScalar(1.3);
    u.uGlow.value.set(el.glow).multiplyScalar(1.45);
    u.uStyle.value = GLYPH_ID[style] ?? 0;
    u.uSeed.value = rand(0, 6.28);
    u.uProg.value = 0; u.uOpacity.value = peak;
    G.m.visible = true;
  }

  // ---- 4. Pooled 3D erupting spires (2 InstancedMeshes: jagged sculpted faceted shard + glowing base/vein aura) -----------
  const SPIRE_COLORS = { bone: 0x6c7280, stone: 0x3c3834, flame: 0x201310, ice: 0x3b6c9a, iron: 0x363c46, thorn: 0x2c180e, gold: 0x9c7424, prism: 0x1a244c };
  const spireGeo = (() => {   // sculpted craggy 5-sided shard with asymmetric tapered facets (no smooth plastic cones)
    const g = new THREE.CylinderGeometry(0.02, 0.44, 2.3, 5, 3, false);
    g.translate(0, 1.15, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = y / 2.3;
      const kink = Math.sin(h * Math.PI) * 0.14;
      const pinch = 1 + (h > 0.25 && h < 0.7 ? -0.18 * Math.sin((h - 0.25) * 7) : 0);
      const asym = 1 + 0.22 * Math.sin(Math.atan2(z, x) * 2.0 + h * 3.1);
      p.setXYZ(i, x * pinch * asym + kink, y, z * pinch * asym - kink * 0.5);
    }
    g.computeVertexNormals();
    return g;
  })();
  const spireBodies = new THREE.InstancedMesh(spireGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0.22, flatShading: true }), BB.spires);
  const spireCores = new THREE.InstancedMesh(spireGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), BB.spires);
  const black = new THREE.Color(0, 0, 0);
  for (const m of [spireBodies, spireCores]) {
    for (let i = 0; i < BB.spires; i++) m.setColorAt(i, black);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false; m.visible = false; m.userData.noDepth = true; m.renderOrder = m === spireBodies ? 2 : 3;
    scene.add(m); pooledFx.push(m);
  }
  const spires = Array.from({ length: BB.spires }, () => ({ on: false, age: 0, life: BB.spireTime, x: 0, y: 0, z: 0,
    rx: 0, ry: 0, rz: 0, w: 0.4, h: 2, bodyCol: new THREE.Color(), glowCol: new THREE.Color() }));
  let spireCursor = 0;
  function spireBurst(x, y, z, count, radius, height, style, el) {
    const n = Math.max(2, Math.round(count * density()));
    const bodyHex = SPIRE_COLORS[style] ?? SPIRE_COLORS.stone;
    for (let i = 0; i < n; i++) {
      const S = spires[spireCursor++ % BB.spires];
      const ang = (i / n) * Math.PI * 2 + rand(-0.22, 0.22);
      const rr = radius * rand(0.58, 1.12);
      S.on = true; S.age = 0; S.life = BB.spireTime * rand(0.82, 1.22);
      S.x = x + Math.cos(ang) * rr; S.y = y - 0.15; S.z = z + Math.sin(ang) * rr;
      const tilt = rand(0.22, 0.52);
      S.ry = -ang + Math.PI * 0.5; S.rx = tilt; S.rz = rand(-0.14, 0.14);
      S.w = rand(0.55, 1.15) * (0.38 + height * 0.16);
      S.h = height * rand(0.65, 1.25) * 0.48;
      S.bodyCol.setHex(bodyHex); S.glowCol.set(el.glow).lerp(col2.set(el.core), rand(0.15, 0.45));
    }
  }

  // ---- 5. Pooled 3D jagged energy arcs (1 InstancedMesh of crossed glow strips) -------------------------------------------
  const ARC_SEGS = BB.arcSegs, MAX_ARC_INST = BB.arcs * ARC_SEGS;
  const arcTex = (() => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 4;
    const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 32, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.32, 'rgba(255,255,255,0.45)');
    grd.addColorStop(0.5, 'rgba(255,255,255,1)'); grd.addColorStop(0.68, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 32, 4);
    return new THREE.CanvasTexture(c);
  })();
  const arcGeo = (() => {   // crossed vertical quads along +Y (0..1), visible from every camera angle
    const pos = new Float32Array([
      -0.5, 0, 0,   0.5, 0, 0,  -0.5, 1, 0,   0.5, 1, 0,
       0, 0, -0.5,  0, 0, 0.5,   0, 1, -0.5,  0, 1, 0.5,
    ]);
    const uv = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1]);
    const idx = new Uint16Array([0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  })();
  const arcMesh = new THREE.InstancedMesh(arcGeo, new THREE.MeshBasicMaterial({
    color: 0xffffff, map: arcTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false
  }), MAX_ARC_INST);
  for (let i = 0; i < MAX_ARC_INST; i++) arcMesh.setColorAt(i, black);
  arcMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); arcMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  arcMesh.frustumCulled = false; arcMesh.visible = false; arcMesh.renderOrder = 5;
  scene.add(arcMesh); pooledFx.push(arcMesh);
  const arcs = Array.from({ length: BB.arcs }, () => ({
    on: false, age: 0, life: BB.arcTime, width: 0.14,
    pts: Array.from({ length: ARC_SEGS + 1 }, () => new THREE.Vector3()),
    coreCol: new THREE.Color(), glowCol: new THREE.Color(),
  }));
  let arcCursor = 0;
  function spawnArc(x0, y0, z0, x1, y1, z1, el, width = 0.14, life = BB.arcTime, jag = 0.35) {
    if (!on() || calm()) return;
    const A = arcs[arcCursor++ % BB.arcs];
    A.on = true; A.age = 0; A.life = life * rand(0.75, 1.25); A.width = width;
    A.coreCol.set(el.core).multiplyScalar(1.8); A.glowCol.set(el.glow).multiplyScalar(1.3);
    for (let i = 0; i <= ARC_SEGS; i++) {
      const t = i / ARC_SEGS, end = Math.sin(t * Math.PI);
      A.pts[i].set(
        lerp(x0, x1, t) + (i && i < ARC_SEGS ? rand(-jag, jag) * end : 0),
        lerp(y0, y1, t) + (i && i < ARC_SEGS ? rand(-jag * 0.7, jag * 0.9) * end : 0),
        lerp(z0, z1, t) + (i && i < ARC_SEGS ? rand(-jag, jag) * end : 0));
    }
  }
  function arcSpray(cx, cy, cz, count, radius, height, el, width = 0.15) {
    if (!on() || calm()) return;
    const n = Math.max(1, Math.round(count * density()));
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), r = radius * rand(0.45, 1.15);
      spawnArc(cx, cy + rand(0.1, 0.7), cz, cx + Math.cos(a) * r, cy + rand(0.15, height), cz + Math.sin(a) * r, el, width, BB.arcTime * rand(0.85, 1.35), 0.32 + radius * 0.08);
    }
  }

  // ---- per-attack / per-hit extra spectacle dispatcher --------------------------------------------------------------------
  function triggerExtras(x, y, z, s, L, e, fromImpact) {
    const dome = pickProp(L, 'dome');
    if (dome && fromImpact) shockDome(x, y, z, dome.radius, dome.height, L.el, dome.time || BB.domeTime);
    const sp = pickProp(L, 'spires');
    if (sp && fromImpact) spireBurst(x, y, z, sp.count, sp.radius, sp.height, sp.style || 'stone', L.el);
    const gl = pickProp(L, 'glyph');
    if (gl && fromImpact) groundGlyph(x, y, z, Math.max(2.6, s * 1.45), gl, L.el, { yaw: e ? e.yaw : 0 });
    const ac = pickProp(L, 'arcs');
    if (ac && fromImpact) arcSpray(x, y + 0.3, z, ac, Math.max(2.2, s * 1.1), 2.4 + s * 0.4, L.el);
  }

  // ---- ground impacts, one per kind ---------------------------------------------------------------------------------------
  const P = (x, y, z) => ({ x, y, z });
  const base = (x, y, z, s, L, chunks = 1) => {
    fx.chunkBurst(x, y, z, Math.round((5 + 4 * s) * chunks), 0.6 + 0.25 * s);
    fx.dustRing(x, y, z, Math.round(8 + 3 * s), s, U.puffs.dust, 0.8 + 0.25 * s);
    if (s >= 1.4) ultraPost.wave(P(x, y + 0.3, z), Math.min(1.7, s / 2.3), Math.min(2.2, s / 1.8));
  };
  const IMPACT = {
    quake(x, y, z, s, L) {
      base(x, y, z, s, L);
      fx.sparkBurst(P(x, y + 0.15, z), Math.round(12 * s), L.el.sparks, [0, 1, 0], 0.5, 0.8);
      fx.mark(x, y, z, L.el.glow, s * 1.8, 0.9, 0.6); fx.flashAt(P(x, y + 0.6, z), L.el.glow, 4 + 3 * s, 4 + 2 * s);
    },
    shatter(x, y, z, s, L) {
      base(x, y, z, s, L, 1.9);
      fx.sparkBurst(P(x, y + 0.15, z), Math.round(30 * s), L.el.sparks, [0, 1, 0], 0.35, 1.15);
      fx.moteBurst(P(x, y + 0.35, z), Math.round(36 + 18 * s), L.el.mote, { r: s * 0.55, speed: 3.2, lift: 2.2, life: [0.6, 1.4], size: 1.05, up: 1.2 });
      fx.mark(x, y, z, L.el.glow, s * 2.7, 1.7, 1); fx.flare(P(x, y + 0.45, z), L.el.core, 1.8 + s * 0.65, 0.32);
      fx.flashAt(P(x, y + 0.6, z), L.el.glow, 9 + 4 * s, 7 + 2 * s);
      groundRing(x, y, z, 0.3, s * 1.75, 0.48, L.el.glow, 0.38, 0.9);
      if (isUltra() && s >= 2.2) later(() => groundRing(x, y, z, 0.2, s * 1.35, 0.36, L.el.core, 0.24, 0.7), 85);
      if (L.el.smoke !== undefined) {
        const sn = Math.round(4 + s);
        for (let i = 0; i < sn; i++) {
          const a = rand(0, Math.PI * 2), sp = rand(1.2, 3.2);
          PUFF_VEL[0] = Math.cos(a) * sp; PUFF_VEL[1] = rand(0.4, 1.1); PUFF_VEL[2] = Math.sin(a) * sp;
          fx.puff(x, y + rand(0.2, 0.9), z, L.el.smoke, 0.55, 1.9 + s * 0.35, 1.2, PUFF_VEL, 0.48);
        }
      }
    },
    pillar(x, y, z, s, L) {
      base(x, y, z, s, L, 0.6);
      const Pl = BB.pillar;
      pillar(x, y, z, Pl.radius * (0.6 + 0.3 * s), Pl.height * (0.7 + 0.15 * s), L.el);
      fx.moteBurst(P(x, y + 0.3, z), Math.round(50 + 25 * s), L.el.mote, { r: s * 0.7, speed: 2.5, lift: 3, life: [0.8, 1.8], size: 1.2, swirl: 1.5, up: 1.4 });
      fx.sparkBurst(P(x, y + 0.2, z), Math.round(30 * s), L.el.sparks, [0, 1, 0], 0.6, 1.2);
      fx.flare(P(x, y + 1, z), L.el.core, 2.4 + 0.6 * s, 0.45); fx.flashAt(P(x, y + 1.5, z), L.el.glow, 14 + 4 * s, 10 + 2 * s);
      fx.mark(x, y, z, L.el.glow, s * 2.4, 1.6, 1);
      groundRing(x, y, z, 0.2, s * 1.8, 0.55, L.el.glow, 0.4, 1);
      ultraPost.pulse({ flash: 0.06, color: L.el.core });
    },
    blaze(x, y, z, s, L) {
      base(x, y, z, s, L, 0.8);
      const n = Math.max(4, Math.round((6 + 4 * s) * density())), r = 0.6 + s * 0.58;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rand(-0.2, 0.2), rr = r * rand(0.6, 1.1); groundFire(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, rand(0.85, 1.45) * (0.7 + 0.2 * s), undefined, L.el); }
      groundFire(x, y, z, 1.7 + 0.3 * s, 1.25, L.el);
      fx.moteBurst(P(x, y + 0.3, z), Math.round(68 + 22 * s), L.el.mote, { r, speed: 2.4, lift: 3.5, life: [0.7, 1.7], size: 0.88, swirl: 1.2, up: 1.4 });
      fx.sparkBurst(P(x, y + 0.2, z), Math.round(34 * s), L.el.sparks, [0, 1, 0], 0.5, 1.2);
      fx.flashAt(P(x, y + 0.8, z), L.el.glow, 15 + 4 * s, 10 + 2 * s); fx.mark(x, y, z, L.el.glow, s * 2.7, 1.9, 1);
      groundRing(x, y, z, 0.2, r * 1.75, 0.52, L.el.glow, 0.48, 0.95);
      if (isUltra()) later(() => groundRing(x, y, z, 0.15, r * 1.3, 0.4, L.el.core, 0.28, 0.75), 95);
    },
    geyser(x, y, z, s, L) {
      base(x, y, z, s, L, 0.5);
      const n = 3 + Math.round(s);
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), rr = rand(0, s * 0.6);
        fx.bloodSpray(P(x + Math.cos(a) * rr, y + 0.1, z + Math.sin(a) * rr), [0, 2.2, 0], 22, 1.6, L.el.glow);
      }
      fx.moteBurst(P(x, y + 0.5, z), Math.round(50 + 20 * s), L.el.mote, { r: s * 0.6, speed: 2.5, lift: 1.4, life: [0.6, 1.4], size: 1.1, up: 1.2, boost: 2.6 });
      fx.flashAt(P(x, y + 1, z), L.el.glow, 12 + 4 * s, 8 + 2 * s); fx.mark(x, y, z, L.el.glow, s * 2.2, 1.6, 0.9);
      groundRing(x, y, z, 0.2, s * 1.5, 0.5, L.el.glow, 0.45, 1);
    },
    bloom(x, y, z, s, L) {
      base(x, y, z, s, L, 0.4);
      for (let i = 0; i < 6 + 2 * s; i++) { const a = rand(0, Math.PI * 2), sp = rand(0.8, 2.4) * Math.sqrt(s); fx.puff(x, y + rand(0.2, 1.2), z, 0xb02414, 0.8, 2.6 + s, 1.8, [Math.cos(a) * sp, rand(0.3, 1), Math.sin(a) * sp], 0.42); }
      fx.moteBurst(P(x, y + 0.6, z), Math.round(90 + 30 * s), L.el.mote, { r: s * 0.8, speed: 2.2, lift: 0.9, life: [1.2, 2.6], size: 1.2, swirl: 0.8, up: 0.6, drag: 1.4 });
      fx.flare(P(x, y + 0.8, z), L.el.core, 2 + 0.5 * s, 0.4); fx.flashAt(P(x, y + 1, z), L.el.glow, 12 + 4 * s, 9 + 2 * s);
      fx.mark(x, y, z, L.el.glow, s * 3, 2.2, 1); groundRing(x, y, z, 0.3, s * 1.8, 0.7, L.el.glow, 0.6, 0.9);
    },
    void(x, y, z, s, L) {
      base(x, y, z, s, L, 1.2);
      for (let i = 0; i < 6 + 2 * s; i++) { const a = rand(0, Math.PI * 2), sp = rand(1, 3) * Math.sqrt(s); fx.puff(x, y + rand(0.2, 1), z, L.el.smoke || 0x100606, 0.6, 2.2 + s * 0.5, 1.4, [Math.cos(a) * sp, rand(0.4, 1.2), Math.sin(a) * sp], 0.6); }
      fx.sparkBurst(P(x, y + 0.3, z), Math.round(40 * s), L.el.sparks, [0, 1, 0], 0.4, 1.3);
      fx.flare(P(x, y + 0.6, z), L.el.core, 2 + 0.6 * s, 0.35); fx.flashAt(P(x, y + 1, z), L.el.glow, 14 + 5 * s, 9 + 2 * s);
      fx.mark(x, y, z, L.el.glow, s * 2.4, 1.6, 1); groundRing(x, y, z, 0.2, s * 1.7, 0.4, L.el.core, 0.35, 1);
    },
    gale(x, y, z, s, L) {
      base(x, y, z, s, L, 0.8);
      fx.moteBurst(P(x, y + 0.4, z), Math.round(90 + 30 * s), L.el.mote, { r: s * 0.5, speed: 5, lift: 1.2, life: [0.6, 1.4], size: 0.8, swirl: 5, up: 0.5, drag: 1.8, boost: 1.8 });
      fx.dustRing(x, y, z, Math.round(14 + 4 * s), s * 1.4, U.puffs.dust, 1.1 + 0.2 * s);
      fx.sparkBurst(P(x, y + 0.2, z), Math.round(18 * s), L.el.sparks, null, 0, 1.2);
      groundRing(x, y, z, 0.3, s * 2, 0.5, L.el.glow, 0.5, 0.8); fx.flashAt(P(x, y + 1, z), L.el.glow, 6 + 3 * s, 8);
    },
    roar(x, y, z, s, L, e) {
      const c = e ? fx.chest(e) : P(x, y + 1.5, z);
      base(x, y, z, s, L, 1.4);
      ultraPost.wave(c, 2, 2.4); later(() => ultraPost.wave(c, 1.4, 3), 140);
      fx.dustRing(x, y, z, 28, s * 1.8, U.puffs.dust, 1.6);
      groundRing(x, y, z, 0.5, s * 2.6, 0.7, L.el.glow, 0.7, 0.9);
    },
    toll(x, y, z, s, L) {
      base(x, y, z, s, L, 0.55);
      const el = L.el, nRings = isUltra() ? 3 : 2;
      for (let i = 0; i < nRings; i++) later(() => groundRing(x, y, z, 0.3, s * (1.45 + i * 0.65), 0.78 + i * 0.14, i === 1 ? el.core : el.glow, 0.42, 1 - i * 0.2), i * 120);
      fx.moteBurst(P(x, y + 0.5, z), Math.round(62 + 16 * s), el.mote, { r: s * 0.55, speed: 3.4, lift: 0.9, life: [0.65, 1.5], size: 1.0, swirl: 1.8 });
      fx.sparkBurst(P(x, y + 0.35, z), Math.round(22 * s), el.sparks, [0, 1, 0], 0.4, 1.05);
      fx.flare(P(x, y + 0.8, z), el.core, 1.8 + 0.45 * s, 0.3);
      fx.mark(x, y, z, el.glow, s * 2.5, 1.6, 0.95);
      ultraPost.wave(P(x, y + 1, z), Math.min(1.8, 1.1 + s * 0.2), Math.min(2.4, 1.6 + s * 0.2));
      fx.flashAt(P(x, y + 1, z), el.glow, 12 + 2 * s, 11);
    },
    prism(x, y, z, s, L) {
      base(x, y, z, s, L, 0.65);
      groundRing(x, y, z, 0.25, s * 1.9, 0.52, L.el.glow, 0.32, 1);
      later(() => groundRing(x, y, z, 0.15, s * 1.35, 0.42, L.el.core, 0.22, 0.9), 90);
      if (s >= 1.8) {
        const Pl = BB.pillar, rad = 3.2;
        for (let i = 0; i < 3; i++) {
          const a = i / 3 * Math.PI * 2 + 0.52;
          pillar(x + Math.cos(a) * rad, y, z + Math.sin(a) * rad, Pl.radius * 0.26, Pl.height * 0.85, L.el);
        }
      }
      fx.moteBurst(P(x, y + 0.4, z), Math.round(55 + 22 * s), L.el.mote, { r: s * 0.65, speed: 3.2, lift: 2.8, life: [0.65, 1.5], size: 1.0, swirl: 2.6, up: 1.3, boost: 2.2 });
      fx.sparkBurst(P(x, y + 0.25, z), Math.round(28 * s), L.el.sparks, [0, 1, 0], 0.5, 1.25);
      fx.flare(P(x, y + 0.25, z), L.el.core, 1.05 + 0.25 * s, 0.24);
      fx.flashAt(P(x, y + 1.0, z), L.el.glow, 11 + 3 * s, 9 + 2 * s);
      fx.mark(x, y, z, L.el.glow, s * 2.2, 1.5, 0.95);
      ultraPost.wave(P(x, y + 0.5, z), Math.min(1.6, 0.8 + s * 0.3), Math.min(2.2, 1.2 + s * 0.35));
    },
  };

  // ---- attack & phase events ----------------------------------------------------------------------------------------------
  const windupKind = (L, a, h) => {
    const w = pickProp(L, 'windup');
    if (w === 'none') return null;
    if (w) return w;
    return (h.damage || a.damage || 0) >= BB.heavy || !!(h.hold || h.leap || h.sigil || (h.box || a.box || {}).ring || h.impact || a.impact) ? 'gather' : null;
  };
  const when = (type, fn) => events.on(type, d => { if (!on()) return; try { fn(d); } catch (e) { warnOnce(`Ultra boss effect for "${type}" failed: ${e.message}`); } });
  when('attackPhase', d => {
    const e = d.actor;
    if (d.phase !== PHASE.ACTIVE || !e || e === Game.player) return;
    const L = look(e, d.hitIndex);
    if (!L) return;
    const a = d.attack, h = a.hits[d.hitIndex] || a.hits[0], box = h.box || a.box, y = e.y;
    if (box && box.ring) {
      const R = box.ring, t = R.time || 0.2;
      const n = fx.count('ring', Math.round(24 + R.to * 6));
      for (let i = 0; i < n; i++) {
        const ang = i / n * Math.PI * 2, sp = (R.to - R.from) / t * rand(0.5, 0.9), life = t * rand(1.2, 2);
        col.set(L.el.mote).multiplyScalar(2.4);
        fx.motes.spawn({ x: e.x + Math.sin(ang) * R.from, y: y + 0.25, z: e.z + Math.cos(ang) * R.from, vx: Math.sin(ang) * sp, vy: rand(0.4, 1.4), vz: Math.cos(ang) * sp,
                         drag: 2, lift: 0.4, life, max: life, s0: U.motes.size * 1.4, s1: U.motes.size * 0.4, r: col.r, g: col.g, b: col.b, fadeIn: 0.05 });
      }
      if (R.to >= 5) ultraPost.wave(fx.chest(e), Math.min(1.6, R.to / 7), Math.min(2.5, R.to / 4));
    }
    const sl = pickProp(L, 'slash');
    if (sl) slashArc(e, sl, L.el);
    // Attacks without a ground impact can still unleash domes, glyphs, spires or arcs right on active strike.
    const hasImpact = !!(h.impact || a.impact);
    if (!hasImpact) {
      const dome = pickProp(L, 'dome');
      if (dome) shockDome(e.x, y, e.z, dome.radius, dome.height, L.el, dome.time || BB.domeTime);
      const gl = pickProp(L, 'glyph');
      if (gl) groundGlyph(e.x, y, e.z, Math.max(2.6, L.scale * 1.7), gl, L.el, { yaw: e.yaw });
      const sp = pickProp(L, 'spires');
      if (sp) spireBurst(e.x, y, e.z, sp.count, sp.radius, sp.height, sp.style || 'stone', L.el);
      const ac = pickProp(L, 'arcs');
      if (ac) { strikePoint(e, h, v1, 1.1); arcSpray(v1.x, v1.y, v1.z, ac, 1.8 * Math.sqrt(L.scale), 1.8, L.el, 0.12); }
    }
    if (windupKind(L, a, h) && !a.projectile) {
      strikePoint(e, h, v1, 1.1);
      fx.sparkBurst(v1, 16, L.el.sparks, null, 0, 0.95);
      fx.flare(v1, L.el.core, 1.3 * Math.sqrt(L.scale), 0.24);
      ultraPost.wave(v1, 0.35, 0.5);
    }
    const g = glows.get(e); if (g) { g.visible = false; glowPool.push(g); glows.delete(e); }
  });
  when('bossPhase', d => {
    const e = d.enemy, L = look(e);
    if (!L || !L.spec || !L.spec.phaseFx) return;
    const pf = L.spec.phaseFx, x = e.x, y = e.y, z = e.z;
    if (pf.dome) {
      shockDome(x, y, z, pf.dome.radius, pf.dome.height, L.el, pf.dome.time || 0.6, 0.92);
      if (isUltra() && !calm()) later(() => shockDome(x, y, z, pf.dome.radius * 1.28, (pf.dome.height || pf.dome.radius * 0.6) * 1.15, L.el, 0.55, 0.6), 140);
    }
    if (pf.spires) spireBurst(x, y, z, pf.spires.count, pf.spires.radius, pf.spires.height, pf.spires.style || 'stone', L.el);
    if (pf.pillar) pillar(x, y, z, pf.pillar.radius, pf.pillar.height, L.el);
    if (pf.glyph) groundGlyph(x, y, z, pf.dome ? pf.dome.radius * 0.85 : 5.2, pf.glyph, L.el, { time: 2.8, peak: 1.0, yaw: e.yaw });
    if (pf.arcs) arcSpray(x, y + 0.6, z, pf.arcs, pf.dome ? pf.dome.radius * 0.6 : 3.5, 4.2, L.el, 0.18);
    if (pf.rings) {
      const n = isUltra() ? pf.rings : Math.max(1, pf.rings - 1);
      for (let i = 0; i < n; i++) later(() => groundRing(x, y, z, 0.4, (pf.dome ? pf.dome.radius : 6) * (0.85 + i * 0.28), 0.65 + i * 0.12, i % 2 ? L.el.core : L.el.glow, 0.55, 0.95 - i * 0.18), i * 110);
    }
  });
  when('shot', d => { const L = look(d.enemy); if (L) { fx.moteBurst(d.bolt, 16, L.el.mote, { r: 0.1, speed: 2, lift: 0.2, life: [0.2, 0.5], size: 0.9 }); fx.flashAt(d.bolt, L.el.glow, 5, 5); } });
  when('bossLeap', d => {
    const e = d.enemy, L = look(e);
    if (!L) return;
    fx.moteBurst(fx.chest(e), 46, L.el.mote, { r: e.radius, speed: 2.4, lift: 0.6, life: [0.5, 1.1], size: 1.1 });
    groundRing(e.x, e.y, e.z, 0.3, e.radius * 2.6, 0.42, L.el.glow, 0.35, 0.75);
  });

  // ---- ambient boss presence (per-boss / per-phase living aura, density-scaled) -------------------------------------------
  const ambAcc = new WeakMap();
  const AMB_MOTE = { r: 0.6, speed: 0.6, lift: 1.4, life: [0.8, 1.7], size: 0.95, swirl: 1.2, up: 0.9, drag: 1.1, boost: 2.3 };
  function updateAmbient(e, L, dt) {
    const spec = L.spec;
    if (!spec) return;
    const amb = (spec.phaseAmbient && spec.phaseAmbient[e.def?.phaseId]) || spec.ambient;
    if (!amb) return;
    const dens = density();
    if (dens <= 0) return;
    let acc = ambAcc.get(e);
    if (!acc) ambAcc.set(e, acc = { mote: 0, puff: 0, arc: 0 });
    const sc = Math.sqrt(L.scale), rad = amb.radius || e.radius * 1.4, h = amb.height || (e.height || 2.4);
    const cMain = amb.color ?? L.el.mote, cSec = amb.secondary ?? L.el.smoke ?? L.el.glow;
    const rate = (amb.rate || 24) * dens * (calm() ? 0.45 : 1);
    acc.mote += rate * dt;
    if (amb.kind === 'grave') {   // cold ascending soul wisps from ribcage + low drifting grave-mist around ankles
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.15, rad), life = rand(0.9, 1.8);
        col.set(cMain).multiplyScalar(2.1 * rand(0.75, 1.25));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.25, h * 0.72), z: e.z + Math.sin(a) * rr,
          vx: rand(-0.25, 0.25), vy: rand(0.4, 1.1), vz: rand(-0.25, 0.25), drag: 1.1, lift: 0.9,
          life, max: life, s0: U.motes.size * 1.1 * sc, s1: U.motes.size * 0.25,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : 1.1, cx: e.x, cz: e.z, fadeIn: 0.2 });
      }
      acc.puff += 3.8 * dt;
      while (acc.puff >= 1) {
        acc.puff -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.35, rad * 1.15);
        PUFF_VEL[0] = Math.cos(a) * 0.45; PUFF_VEL[1] = rand(0.15, 0.45); PUFF_VEL[2] = Math.sin(a) * 0.45;
        fx.puff(e.x + Math.cos(a) * rr, e.y + rand(0.15, 0.65), e.z + Math.sin(a) * rr, cSec, 0.55 * sc, 1.65 * sc, 1.45, PUFF_VEL, 0.34);
      }
    } else if (amb.kind === 'furnace') {   // raging pit-furnace embers pouring out of ribs + dark soot eddies + internal crackle
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.1, rad * 0.95), life = rand(0.65, 1.45);
        col.set(Math.random() < 0.28 ? cSec : cMain).multiplyScalar(2.8 * rand(0.8, 1.3));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.55, h * 0.8), z: e.z + Math.sin(a) * rr,
          vx: Math.cos(a) * rand(0.3, 1.1), vy: rand(1.0, 2.4), vz: Math.sin(a) * rand(0.3, 1.1), drag: 0.9, lift: 1.8,
          life, max: life, s0: U.motes.size * 1.2 * sc, s1: U.motes.size * 0.25,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : 2.1, cx: e.x, cz: e.z, fadeIn: 0.12 });
      }
      acc.puff += 4.6 * dt;
      while (acc.puff >= 1) {
        acc.puff -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.25, rad * 0.9);
        PUFF_VEL[0] = Math.cos(a) * 0.65; PUFF_VEL[1] = rand(0.6, 1.3); PUFF_VEL[2] = Math.sin(a) * 0.65;
        fx.puff(e.x + Math.cos(a) * rr, e.y + rand(0.6, h * 0.72), e.z + Math.sin(a) * rr, L.el.smoke || 0x1c120e, 0.48 * sc, 1.55 * sc, 1.15, PUFF_VEL, 0.42);
      }
      acc.arc += (isUltra() ? 2.4 : 1.1) * dt;
      if (acc.arc >= 1) {
        acc.arc -= 1;
        const a1 = rand(0, Math.PI * 2), a2 = a1 + rand(1.1, 2.6), rr = e.radius * 0.65;
        spawnArc(e.x + Math.cos(a1) * rr, e.y + h * rand(0.35, 0.68), e.z + Math.sin(a1) * rr,
          e.x + Math.cos(a2) * rr, e.y + h * rand(0.45, 0.82), e.z + Math.sin(a2) * rr, L.el, 0.1, 0.2, 0.25);
      }
    } else if (amb.kind === 'arson') {   // billowing black pitch-tar smoke & blistering arson embers off the lit billhook
      const lit = e.def?.ignite === 'weapon' || e.def?.ignite === true;
      if (lit && e.rig && e.rig.weapon) tip(e, 0.95, v3); else v3.set(e.x, e.y + h * 0.55, e.z);
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.06, lit ? 0.45 : rad), life = rand(0.55, 1.35);
        col.set(Math.random() < 0.25 ? L.el.core : cMain).multiplyScalar((lit ? 2.9 : 1.8) * rand(0.8, 1.3));
        fx.motes.spawn({ x: v3.x + Math.cos(a) * rr, y: v3.y + rand(-0.25, 0.35), z: v3.z + Math.sin(a) * rr,
          vx: Math.cos(a) * rand(0.2, 0.9), vy: rand(0.8, lit ? 2.4 : 1.1), vz: Math.sin(a) * rand(0.2, 0.9), drag: 0.9, lift: lit ? 1.8 : 0.7,
          life, max: life, s0: U.motes.size * (lit ? 1.15 : 0.85) * sc, s1: U.motes.size * 0.2,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (lit ? 1.6 : 0.6), cx: v3.x, cz: v3.z, fadeIn: 0.1 });
      }
      acc.puff += (lit ? 5.5 : 1.8) * dt;
      while (acc.puff >= 1) {
        acc.puff -= 1;
        PUFF_VEL[0] = rand(-0.35, 0.35); PUFF_VEL[1] = rand(0.7, 1.5); PUFF_VEL[2] = rand(-0.35, 0.35);
        fx.puff(v3.x + rand(-0.2, 0.2), v3.y + 0.15, v3.z + rand(-0.2, 0.2), cSec, 0.36 * sc, 1.35 * sc, 1.1, PUFF_VEL, lit ? 0.52 : 0.28);
      }
      if (lit && !calm() && Math.random() < 6 * dt) fx.sparkBurst(v3, 1, L.el.sparks, UP_DIR, 0.3, 0.45);
    } else if (amb.kind === 'bronze') {   // resonant harmonic soundwave pulses & rising emerald-mint motes around the bell
      const res = e.def && e.def.resonance ? clamp((e.resonance || 0) / Math.max(1, e.def.resonance.max), 0, 1) : 0;
      const woken = (amb.rate || 0) >= 35;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.25, rad), life = rand(0.8, 1.65);
        col.set(Math.random() < 0.35 ? L.el.core : cMain).multiplyScalar((2.1 + res * 1.1) * rand(0.8, 1.25));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.25, h * 0.85), z: e.z + Math.sin(a) * rr,
          vx: Math.cos(a) * (0.25 + res * 0.6), vy: rand(0.5, 1.3), vz: Math.sin(a) * (0.25 + res * 0.6), drag: 1.0, lift: 0.8,
          life, max: life, s0: U.motes.size * (0.95 + res * 0.4) * sc, s1: U.motes.size * 0.2,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (1.2 + res * 1.6), cx: e.x, cz: e.z, fadeIn: 0.18 });
      }
      // Slow breathing harmonic ring at feet (< 1 Hz, calm-friendly) + resonance arcs when woken or humming high
      acc.puff += (woken ? 0.85 : 0.45 + res * 0.5) * dt;
      if (acc.puff >= 1) {
        acc.puff -= 1;
        groundRing(e.x, e.y, e.z, e.radius * 0.9, e.radius * (2.6 + res * 1.2), 1.1, cSec, 0.26, 0.38 + res * 0.35);
      }
      if ((woken || res > 0.45) && !calm()) {
        acc.arc += (isUltra() ? 2.6 : 1.2) * (0.6 + res) * dt;
        if (acc.arc >= 1) {
          acc.arc -= 1;
          tip(e, 0.9, v3);
          const a = rand(0, Math.PI * 2), rr = 0.75 * sc;
          spawnArc(v3.x, v3.y, v3.z, v3.x + Math.cos(a) * rr, v3.y + rand(-0.4, 0.6), v3.z + Math.sin(a) * rr, L.el, 0.1, 0.2, 0.22);
        }
      }
    } else if (amb.kind === 'emberCrown') {   // royal Undying Ember rising off the shackle crown & cracked cuirass
      const burning = !!e.def?.ignite;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.15, burning ? rad : rad * 0.75), life = rand(0.7, 1.55);
        col.set(Math.random() < 0.3 ? cSec : cMain).multiplyScalar((burning ? 2.9 : 2.1) * rand(0.8, 1.3));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(burning ? 0.3 : 0.6, h * 0.96), z: e.z + Math.sin(a) * rr,
          vx: Math.cos(a) * rand(0.2, 0.8), vy: rand(0.9, burning ? 2.6 : 1.4), vz: Math.sin(a) * rand(0.2, 0.8), drag: 0.95, lift: burning ? 1.9 : 0.9,
          life, max: life, s0: U.motes.size * (burning ? 1.2 : 0.9) * sc, s1: U.motes.size * 0.2,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (burning ? 2.3 : 0.9), cx: e.x, cz: e.z, fadeIn: 0.14 });
      }
      if (burning) {
        acc.puff += 4.2 * dt;
        while (acc.puff >= 1) {
          acc.puff -= 1;
          const a = rand(0, Math.PI * 2), rr = rand(0.2, rad * 0.85);
          PUFF_VEL[0] = Math.cos(a) * 0.5; PUFF_VEL[1] = rand(0.8, 1.5); PUFF_VEL[2] = Math.sin(a) * 0.5;
          fx.puff(e.x + Math.cos(a) * rr, e.y + rand(0.5, h * 0.8), e.z + Math.sin(a) * rr, L.el.smoke || 0x160a08, 0.45 * sc, 1.45 * sc, 1.2, PUFF_VEL, 0.42);
        }
        acc.arc += (isUltra() ? 2.8 : 1.3) * dt;
        if (acc.arc >= 1) {
          acc.arc -= 1;
          tip(e, rand(0.3, 1.2), v3);
          const a = rand(0, Math.PI * 2), rr = 0.7 * sc;
          spawnArc(v3.x, v3.y, v3.z, v3.x + Math.cos(a) * rr, v3.y + rand(-0.3, 0.8), v3.z + Math.sin(a) * rr, L.el, 0.11, 0.2, 0.24);
        }
      }
    } else if (amb.kind === 'feral') {   // blood-ember hunger wisps, stalking dark mist, and crackling antler streaks
      const starving = (amb.rate || 0) >= 40;
      const marks = e.learned ? Math.min(6, e.learned.length ?? e.learned.size ?? 0) / 6 : 0;
      const heat = starving ? 1 : 0.35 + marks * 0.65;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.18, rad), life = rand(0.65, 1.45);
        col.set(starving && Math.random() < 0.3 ? cSec : cMain).multiplyScalar((2.0 + heat * 1.1) * rand(0.8, 1.25));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.35, h * 0.92), z: e.z + Math.sin(a) * rr,
          vx: Math.cos(a) * (0.3 + heat * 0.7), vy: rand(0.6, 1.6 + heat * 0.9), vz: Math.sin(a) * (0.3 + heat * 0.7),
          drag: 0.95, lift: 1.0 + heat * 0.8, life, max: life,
          s0: U.motes.size * (0.95 + heat * 0.3) * sc, s1: U.motes.size * 0.2,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (1.1 + heat * 1.5), cx: e.x, cz: e.z, fadeIn: 0.14 });
      }
      acc.puff += (starving ? 4.4 : 2.6) * dt;
      while (acc.puff >= 1) {
        acc.puff -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.3, rad * 1.1);
        PUFF_VEL[0] = Math.cos(a) * 0.55; PUFF_VEL[1] = rand(0.2, 0.7); PUFF_VEL[2] = Math.sin(a) * 0.55;
        fx.puff(e.x + Math.cos(a) * rr, e.y + rand(0.2, 0.85), e.z + Math.sin(a) * rr, L.el.smoke || 0x180906, 0.5 * sc, 1.55 * sc, 1.2, PUFF_VEL, starving ? 0.44 : 0.32);
      }
      if ((starving || marks > 0.15) && !calm()) {
        acc.arc += (isUltra() ? 2.8 : 1.3) * (0.5 + heat * 0.7) * dt;
        if (acc.arc >= 1) {
          acc.arc -= 1;
          const ant = e.rig && e.rig.tellGlows && e.rig.tellGlows.antlers;
          if (ant) ant.getWorldPosition(v3); else v3.set(e.x, e.y + h * 0.82, e.z);
          const a = rand(0, Math.PI * 2), rr = 0.85 * sc;
          spawnArc(v3.x, v3.y, v3.z, v3.x + Math.cos(a) * rr, v3.y + rand(-0.2, 0.8), v3.z + Math.sin(a) * rr, L.el, 0.1, 0.22, 0.24);
        }
      }
    } else if (amb.kind === 'lantern') {   // warm coals & rising fire streaming directly off a swinging lantern bone
      const open = !!e.def?.ignite;
      const bone = e.rig && e.rig.bones && e.rig.bones.lantern;
      if (bone) bone.getWorldPosition(v3); else v3.set(e.x, e.y + h * 0.55, e.z);
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.06, open ? 0.55 : 0.28), life = rand(0.6, 1.45);
        col.set(Math.random() < 0.28 ? L.el.core : cMain).multiplyScalar((open ? 3.0 : 2.1) * rand(0.8, 1.3));
        fx.motes.spawn({ x: v3.x + Math.cos(a) * rr, y: v3.y + rand(-0.25, 0.25), z: v3.z + Math.sin(a) * rr,
          vx: Math.cos(a) * rand(0.15, open ? 1.0 : 0.45), vy: rand(0.7, open ? 2.5 : 1.3), vz: Math.sin(a) * rand(0.15, open ? 1.0 : 0.45),
          drag: 0.9, lift: open ? 1.8 : 0.85, life, max: life,
          s0: U.motes.size * (open ? 1.2 : 0.85) * sc, s1: U.motes.size * 0.2,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (open ? 2.0 : 0.8), cx: v3.x, cz: v3.z, fadeIn: 0.12 });
      }
      acc.puff += (open ? 4.8 : 1.6) * dt;
      while (acc.puff >= 1) {
        acc.puff -= 1;
        PUFF_VEL[0] = rand(-0.3, 0.3); PUFF_VEL[1] = rand(0.75, 1.5); PUFF_VEL[2] = rand(-0.3, 0.3);
        fx.puff(v3.x + rand(-0.18, 0.18), v3.y + 0.1, v3.z + rand(-0.18, 0.18), cSec, 0.32 * sc, 1.25 * sc, 1.1, PUFF_VEL, open ? 0.46 : 0.24);
      }
      if (open && !calm()) {
        acc.arc += (isUltra() ? 2.4 : 1.1) * dt;
        if (acc.arc >= 1) {
          acc.arc -= 1;
          tip(e, 0.8, v2);
          spawnArc(v3.x, v3.y, v3.z, v2.x, v2.y, v2.z, L.el, 0.1, 0.22, 0.22);
        }
      }
    } else if (amb.kind === 'tempest') {   // orbiting sea-gale vortex motes, pale salt spray, and tempest-gold axe arcs
      const whole = (amb.rate || 0) >= 40;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.45, rad * 1.15), life = rand(0.65, 1.4);
        col.set(whole && Math.random() < 0.35 ? cSec : cMain).multiplyScalar((whole ? 2.6 : 2.1) * rand(0.8, 1.25));
        const tx = -Math.sin(a) * (1.8 + (whole ? 0.9 : 0)), tz = Math.cos(a) * (1.8 + (whole ? 0.9 : 0));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.2, h * 0.9), z: e.z + Math.sin(a) * rr,
          vx: tx, vy: rand(0.35, 1.1), vz: tz, drag: 0.7, lift: 0.6, life, max: life,
          s0: U.motes.size * (whole ? 1.15 : 0.9) * sc, s1: U.motes.size * 0.2,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (whole ? 3.2 : 2.4), cx: e.x, cz: e.z, fadeIn: 0.14 });
      }
      acc.puff += (whole ? 3.4 : 2.2) * dt;
      while (acc.puff >= 1) {
        acc.puff -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.5, rad * 1.2);
        PUFF_VEL[0] = -Math.sin(a) * 1.1; PUFF_VEL[1] = rand(0.15, 0.5); PUFF_VEL[2] = Math.cos(a) * 1.1;
        fx.puff(e.x + Math.cos(a) * rr, e.y + rand(0.15, 0.75), e.z + Math.sin(a) * rr, L.el.smoke || 0x1a2630, 0.45 * sc, 1.45 * sc, 1.15, PUFF_VEL, 0.3);
      }
      if (whole && !calm()) {
        acc.arc += (isUltra() ? 2.4 : 1.1) * dt;
        if (acc.arc >= 1) {
          acc.arc -= 1;
          tip(e, rand(0.4, 1.1), v3);
          const a = rand(0, Math.PI * 2), rr = 0.75 * sc;
          spawnArc(v3.x, v3.y, v3.z, v3.x + Math.cos(a) * rr, v3.y + rand(-0.3, 0.7), v3.z + Math.sin(a) * rr, L.el, 0.1, 0.2, 0.22);
        }
      }
    } else if (amb.kind === 'seismic') {   // levitating basalt grit, ground tremor rings, and reunited gilt arcs
      const whole = (amb.rate || 0) >= 40;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.25, rad * 1.1), life = rand(0.7, 1.5);
        col.set(whole && Math.random() < 0.3 ? cSec : cMain).multiplyScalar((whole ? 2.5 : 1.9) * rand(0.8, 1.2));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.08, 0.9), z: e.z + Math.sin(a) * rr,
          vx: Math.cos(a) * 0.25, vy: rand(0.65, 1.6), vz: Math.sin(a) * 0.25, drag: 1.2, lift: 0.4, life, max: life,
          s0: U.motes.size * (whole ? 1.1 : 0.9) * sc, s1: U.motes.size * 0.25,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (whole ? 1.8 : 0.5), cx: e.x, cz: e.z, fadeIn: 0.14 });
      }
      acc.puff += (whole ? 0.8 : 0.55) * dt;
      if (acc.puff >= 1) {
        acc.puff -= 1;
        groundRing(e.x, e.y, e.z, e.radius * 0.85, e.radius * (2.6 + (whole ? 0.9 : 0)), 1.0, cMain, 0.24, 0.38);
      }
      if (whole && !calm()) {
        acc.arc += (isUltra() ? 2.2 : 1.0) * dt;
        if (acc.arc >= 1) {
          acc.arc -= 1;
          const a = rand(0, Math.PI * 2), rr = e.radius * 1.1;
          spawnArc(e.x, e.y + 0.3, e.z, e.x + Math.cos(a) * rr, e.y + rand(0.4, 1.6), e.z + Math.sin(a) * rr, L.el, 0.1, 0.2, 0.22);
        }
      }
    } else if (amb.kind === 'chains') {   // cold spectral gaol-iron motes, chime ripples, and unchained indigo-silver arcs
      const unchained = (amb.rate || 0) >= 40;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.2, rad), life = rand(0.8, 1.7);
        col.set(Math.random() < 0.3 ? L.el.core : cMain).multiplyScalar((unchained ? 2.6 : 1.9) * rand(0.8, 1.25));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.25, h * 0.9), z: e.z + Math.sin(a) * rr,
          vx: Math.cos(a) * 0.2, vy: rand(0.45, 1.25), vz: Math.sin(a) * 0.2, drag: 1.0, lift: 0.75, life, max: life,
          s0: U.motes.size * (unchained ? 1.1 : 0.85) * sc, s1: U.motes.size * 0.2,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (unchained ? 2.1 : 1.0), cx: e.x, cz: e.z, fadeIn: 0.18 });
      }
      acc.puff += (unchained ? 0.9 : 0.5) * dt;
      if (acc.puff >= 1) {
        acc.puff -= 1;
        groundRing(e.x, e.y, e.z, e.radius * 0.9, e.radius * (2.8 + (unchained ? 1.1 : 0)), 1.15, cSec, 0.22, unchained ? 0.55 : 0.34);
      }
      if (unchained && !calm()) {
        acc.arc += (isUltra() ? 2.6 : 1.2) * dt;
        if (acc.arc >= 1) {
          acc.arc -= 1;
          tip(e, 0.95, v3);
          const a = rand(0, Math.PI * 2), rr = 0.8 * sc;
          spawnArc(v3.x, v3.y, v3.z, v3.x + Math.cos(a) * rr, v3.y + rand(-0.35, 0.65), v3.z + Math.sin(a) * rr, L.el, 0.1, 0.2, 0.24);
        }
      }
    } else if (amb.kind === 'gilt') {   // shimmering drifting gold-leaf flakes; cracked into molten embers & arcs in Phase 2
      const cracked = !!e.def?.ignite;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.25, rad * 1.15), life = rand(0.9, 1.85);
        col.set(Math.random() < 0.35 ? cSec : cMain).multiplyScalar((cracked ? 2.8 : 2.3) * rand(0.8, 1.3));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.2, h * 0.95), z: e.z + Math.sin(a) * rr,
          vx: Math.cos(a) * (cracked ? 0.65 : 0.18), vy: cracked ? rand(0.8, 2.2) : rand(0.15, 0.65),
          vz: Math.sin(a) * (cracked ? 0.65 : 0.18), drag: cracked ? 0.95 : 1.5, lift: cracked ? 1.5 : 0.3,
          life, max: life, s0: U.motes.size * (cracked ? 1.15 : 0.9) * sc, s1: U.motes.size * 0.22,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (cracked ? 2.2 : 0.9), cx: e.x, cz: e.z, fadeIn: 0.18 });
      }
      if (cracked) {
        acc.puff += 3.6 * dt;
        while (acc.puff >= 1) {
          acc.puff -= 1;
          const a = rand(0, Math.PI * 2), rr = rand(0.25, rad * 0.85);
          PUFF_VEL[0] = Math.cos(a) * 0.45; PUFF_VEL[1] = rand(0.7, 1.4); PUFF_VEL[2] = Math.sin(a) * 0.45;
          fx.puff(e.x + Math.cos(a) * rr, e.y + rand(0.45, h * 0.78), e.z + Math.sin(a) * rr, L.el.smoke || 0x1a0e08, 0.4 * sc, 1.35 * sc, 1.15, PUFF_VEL, 0.38);
        }
        if (!calm()) {
          acc.arc += (isUltra() ? 2.6 : 1.2) * dt;
          if (acc.arc >= 1) {
            acc.arc -= 1;
            tip(e, rand(0.4, 1.1), v3);
            const a = rand(0, Math.PI * 2), rr = 0.75 * sc;
            spawnArc(v3.x, v3.y, v3.z, v3.x + Math.cos(a) * rr, v3.y + rand(-0.3, 0.75), v3.z + Math.sin(a) * rr, L.el, 0.1, 0.2, 0.22);
          }
        }
      }
    } else if (amb.kind === 'seams') {   // rising volcanic ash-embers & magma crackle between bare uncrowned hands
      const magma = !!e.def?.ignite;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.2, rad), life = rand(0.65, 1.5);
        col.set(magma && Math.random() < 0.3 ? cSec : cMain).multiplyScalar((magma ? 3.0 : 2.1) * rand(0.8, 1.3));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.15, h * 0.92), z: e.z + Math.sin(a) * rr,
          vx: Math.cos(a) * (magma ? 0.85 : 0.3), vy: rand(0.9, magma ? 2.8 : 1.5), vz: Math.sin(a) * (magma ? 0.85 : 0.3),
          drag: 0.9, lift: magma ? 2.0 : 1.0, life, max: life,
          s0: U.motes.size * (magma ? 1.25 : 0.95) * sc, s1: U.motes.size * 0.22,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (magma ? 2.4 : 1.0), cx: e.x, cz: e.z, fadeIn: 0.12 });
      }
      acc.puff += (magma ? 4.8 : 2.4) * dt;
      while (acc.puff >= 1) {
        acc.puff -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.25, rad * 0.95);
        PUFF_VEL[0] = Math.cos(a) * 0.55; PUFF_VEL[1] = rand(0.6, 1.4); PUFF_VEL[2] = Math.sin(a) * 0.55;
        fx.puff(e.x + Math.cos(a) * rr, e.y + rand(0.25, h * 0.72), e.z + Math.sin(a) * rr, L.el.smoke || 0x1a120e, 0.48 * sc, 1.55 * sc, 1.2, PUFF_VEL, magma ? 0.45 : 0.3);
      }
      if (magma && !calm()) {
        acc.arc += (isUltra() ? 3.0 : 1.4) * dt;
        if (acc.arc >= 1) {
          acc.arc -= 1;
          const bL = e.rig && e.rig.bones && e.rig.bones.elbowL, bR = e.rig && e.rig.bones && e.rig.bones.elbowR;
          if (bL && bR) { bL.getWorldPosition(v2); bR.getWorldPosition(v3); spawnArc(v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, L.el, 0.12, 0.22, 0.26); }
        }
      }
    } else if (amb.kind === 'storm') {   // electric static arcs leaping off the hook & high-speed storm vortex motes
      const electrified = !!e.def?.storm;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.35, rad * 1.15), life = rand(0.6, 1.35);
        col.set(electrified && Math.random() < 0.35 ? L.el.core : cMain).multiplyScalar((electrified ? 2.8 : 1.8) * rand(0.8, 1.3));
        const tx = -Math.sin(a) * (electrified ? 2.4 : 0.9), tz = Math.cos(a) * (electrified ? 2.4 : 0.9);
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.25, h * 0.95), z: e.z + Math.sin(a) * rr,
          vx: tx, vy: rand(0.4, electrified ? 1.6 : 0.8), vz: tz, drag: 0.75, lift: 0.6, life, max: life,
          s0: U.motes.size * (electrified ? 1.15 : 0.85) * sc, s1: U.motes.size * 0.2,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (electrified ? 3.4 : 1.2), cx: e.x, cz: e.z, fadeIn: 0.12 });
      }
      if (electrified) {
        acc.puff += 3.8 * dt;
        while (acc.puff >= 1) {
          acc.puff -= 1;
          const a = rand(0, Math.PI * 2), rr = rand(0.45, rad * 1.2);
          PUFF_VEL[0] = -Math.sin(a) * 1.2; PUFF_VEL[1] = rand(0.25, 0.75); PUFF_VEL[2] = Math.cos(a) * 1.2;
          fx.puff(e.x + Math.cos(a) * rr, e.y + rand(0.2, 0.9), e.z + Math.sin(a) * rr, cSec, 0.45 * sc, 1.5 * sc, 1.1, PUFF_VEL, 0.36);
        }
        if (!calm()) {
          acc.arc += (isUltra() ? 3.8 : 1.7) * dt;
          if (acc.arc >= 1) {
            acc.arc -= 1;
            tip(e, rand(0.2, 1.15), v3);
            const a = rand(0, Math.PI * 2), rr = 0.95 * sc;
            spawnArc(v3.x, v3.y, v3.z, v3.x + Math.cos(a) * rr, v3.y + rand(-0.4, 0.9), v3.z + Math.sin(a) * rr, L.el, 0.11, 0.22, 0.28);
          }
        }
      }
    } else if (amb.kind === 'roots') {   // drifting bark-spores & charred forest-ash; raging wildfire canopy & sap arcs in Phase 2
      const ablaze = !!e.def?.ignite;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.3, rad * 1.1), life = rand(0.75, 1.7);
        col.set(ablaze && Math.random() < 0.3 ? cSec : cMain).multiplyScalar((ablaze ? 2.9 : 2.1) * rand(0.8, 1.3));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.25, h * 0.95), z: e.z + Math.sin(a) * rr,
          vx: Math.cos(a) * (ablaze ? 0.85 : 0.25), vy: rand(0.7, ablaze ? 2.8 : 1.3), vz: Math.sin(a) * (ablaze ? 0.85 : 0.25),
          drag: 0.95, lift: ablaze ? 1.9 : 0.85, life, max: life,
          s0: U.motes.size * (ablaze ? 1.3 : 1.0) * sc, s1: U.motes.size * 0.25,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (ablaze ? 2.2 : 1.0), cx: e.x, cz: e.z, fadeIn: 0.15 });
      }
      acc.puff += (ablaze ? 4.8 : 2.2) * dt;
      while (acc.puff >= 1) {
        acc.puff -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.35, rad);
        PUFF_VEL[0] = Math.cos(a) * 0.5; PUFF_VEL[1] = rand(0.55, 1.4); PUFF_VEL[2] = Math.sin(a) * 0.5;
        fx.puff(e.x + Math.cos(a) * rr, e.y + rand(0.3, h * 0.78), e.z + Math.sin(a) * rr, L.el.smoke || 0x1c120c, 0.52 * sc, 1.7 * sc, 1.3, PUFF_VEL, ablaze ? 0.46 : 0.28);
      }
      if (ablaze && !calm()) {
        acc.arc += (isUltra() ? 2.8 : 1.3) * dt;
        if (acc.arc >= 1) {
          acc.arc -= 1;
          const a1 = rand(0, Math.PI * 2), a2 = a1 + rand(1.0, 2.4), rr = e.radius * 1.1;
          spawnArc(e.x + Math.cos(a1) * rr, e.y + h * rand(0.45, 0.85), e.z + Math.sin(a1) * rr,
            e.x + Math.cos(a2) * rr, e.y + h * rand(0.5, 0.92), e.z + Math.sin(a2) * rr, L.el, 0.12, 0.22, 0.28);
        }
      }
    } else if (amb.kind === 'blade') {   // honed oath-steel blade glints; Ember-Worn torch-fire & sword-to-shield arcs in Phase 2
      const torch = !!e.def?.ignite;
      if (e.rig && e.rig.weapon) tip(e, 0.8, v3); else v3.set(e.x, e.y + h * 0.55, e.z);
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.08, torch ? 0.5 : rad * 0.8), life = rand(0.6, 1.4);
        col.set(torch && Math.random() < 0.3 ? cSec : cMain).multiplyScalar((torch ? 2.9 : 2.1) * rand(0.8, 1.3));
        const ox = torch ? v3.x : e.x, oy = torch ? v3.y : e.y + rand(0.3, h * 0.85), oz = torch ? v3.z : e.z;
        fx.motes.spawn({ x: ox + Math.cos(a) * rr, y: oy + rand(-0.2, 0.3), z: oz + Math.sin(a) * rr,
          vx: Math.cos(a) * (torch ? 0.8 : 0.25), vy: rand(0.5, torch ? 2.4 : 1.1), vz: Math.sin(a) * (torch ? 0.8 : 0.25),
          drag: 0.9, lift: torch ? 1.7 : 0.6, life, max: life,
          s0: U.motes.size * (torch ? 1.15 : 0.8) * sc, s1: U.motes.size * 0.18,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (torch ? 2.1 : 0.8), cx: e.x, cz: e.z, fadeIn: 0.12 });
      }
      if (torch) {
        acc.puff += 4.0 * dt;
        while (acc.puff >= 1) {
          acc.puff -= 1;
          PUFF_VEL[0] = rand(-0.35, 0.35); PUFF_VEL[1] = rand(0.75, 1.45); PUFF_VEL[2] = rand(-0.35, 0.35);
          fx.puff(v3.x + rand(-0.18, 0.18), v3.y + 0.1, v3.z + rand(-0.18, 0.18), L.el.smoke || 0x160a08, 0.34 * sc, 1.25 * sc, 1.05, PUFF_VEL, 0.44);
        }
        if (!calm()) {
          acc.arc += (isUltra() ? 2.8 : 1.3) * dt;
          if (acc.arc >= 1) {
            acc.arc -= 1;
            const sh = e.rig && e.rig.tellGlows && e.rig.tellGlows.shield;
            if (sh) sh.getWorldPosition(v2); else v2.set(e.x, e.y + h * 0.55, e.z);
            spawnArc(v3.x, v3.y, v3.z, v2.x, v2.y, v2.z, L.el, 0.1, 0.2, 0.22);
          }
        }
      }
    } else if (amb.kind === 'celestial') {   // inclined starlight orbital rings, eclipse mist, and cosmic glaive arcs
      const eclipsed = (amb.rate || 0) >= 45;
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.55, rad * 1.15), life = rand(0.75, 1.6);
        const tilt = Math.sin(a) * 0.55;
        col.set(Math.random() < 0.3 ? L.el.core : cMain).multiplyScalar((eclipsed ? 2.8 : 2.3) * rand(0.8, 1.3));
        const tx = -Math.sin(a) * (eclipsed ? 2.2 : 1.3), tz = Math.cos(a) * (eclipsed ? 2.2 : 1.3);
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + h * 0.55 + tilt + rand(-0.25, 0.25), z: e.z + Math.sin(a) * rr,
          vx: tx, vy: rand(0.1, 0.65), vz: tz, drag: 0.85, lift: 0.35, life, max: life,
          s0: U.motes.size * (eclipsed ? 1.15 : 0.9) * sc, s1: U.motes.size * 0.18,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : (eclipsed ? 3.0 : 2.0), cx: e.x, cz: e.z, fadeIn: 0.14 });
      }
      if (eclipsed) {
        acc.puff += 3.6 * dt;
        while (acc.puff >= 1) {
          acc.puff -= 1;
          const a = rand(0, Math.PI * 2), rr = rand(0.35, rad * 1.05);
          PUFF_VEL[0] = -Math.sin(a) * 0.9; PUFF_VEL[1] = rand(0.2, 0.75); PUFF_VEL[2] = Math.cos(a) * 0.9;
          fx.puff(e.x + Math.cos(a) * rr, e.y + rand(0.35, h * 0.8), e.z + Math.sin(a) * rr, cSec, 0.42 * sc, 1.45 * sc, 1.15, PUFF_VEL, 0.38);
        }
        if (!calm()) {
          acc.arc += (isUltra() ? 3.2 : 1.5) * dt;
          if (acc.arc >= 1) {
            acc.arc -= 1;
            tip(e, rand(0.25, 1.1), v3);
            const a = rand(0, Math.PI * 2), rr = 0.85 * sc;
            spawnArc(v3.x, v3.y, v3.z, v3.x + Math.cos(a) * rr, v3.y + rand(-0.35, 0.8), v3.z + Math.sin(a) * rr, L.el, 0.1, 0.22, 0.25);
          }
        }
      }
    } else {   // generic ambient fallback for any upcoming kind (motes.spawn directly avoids double density scaling)
      while (acc.mote >= 1) {
        acc.mote -= 1;
        const a = rand(0, Math.PI * 2), rr = rand(0.15, rad * 0.8), life = rand(0.8, 1.6);
        col.set(cMain).multiplyScalar(2.3 * rand(0.75, 1.25));
        fx.motes.spawn({ x: e.x + Math.cos(a) * rr, y: e.y + rand(0.25, h * 0.8), z: e.z + Math.sin(a) * rr,
          vx: rand(-0.3, 0.3), vy: rand(0.5, 1.3), vz: rand(-0.3, 0.3), drag: 1.1, lift: 1.0,
          life, max: life, s0: U.motes.size * sc, s1: U.motes.size * 0.25,
          r: col.r, g: col.g, b: col.b, swirl: calm() ? 0 : 1.2, cx: e.x, cz: e.z, fadeIn: 0.15 });
      }
    }
  }

  // ---- each frame: ambient, windup gather/vortex/crackle, shedding, leaps, pooled shapes ---------------------------------
  const rate = new WeakMap(), windupKey = new WeakMap();
  const SHED = { r: 0.05, speed: 0.6, lift: 0.3, life: [0.3, 0.7], size: 0.8, boost: 2.2, up: 0.2 };
  const LEAP = { r: 1, speed: 0.4, lift: 0, life: [0.4, 0.8], size: 1.1, up: 0 };
  const BREATH = { r: 0.2, speed: 1.2, lift: 2, life: [0.4, 0.9], size: 1.2, up: 1 };
  function clearEffects() {
    generation++;
    for (const g of glows.values()) { g.visible = false; glowPool.push(g); }
    glows.clear();
    for (const pool of [rings, pillars, fires, slashes, domes, glyphs]) for (const o of pool) { o.m.visible = false; o.age = Infinity; }
    for (const s of spires) s.on = false;
    for (const a of arcs) a.on = false;
    spireBodies.visible = spireCores.visible = arcMesh.visible = false;
    spireBodies.count = spireCores.count = arcMesh.count = 0;
  }
  visuals.hooks.stage.push(clearEffects);
  visuals.hooks.quality.push(clearEffects);
  Game.renderHooks.push(game => {
    const dt = effectSlots.real(), effDt = effectSlots.dt();
    if (!on()) return;
    for (const [e, g] of glows) if (!game.enemies.includes(e) || !e.alive()) { g.visible = false; glowPool.push(g); glows.delete(e); }
    const dens = density();
    for (const e of game.enemies) {
      if (!e.alive() || e.asleep || !e.rig.root.visible) continue;
      const L = look(e);
      if (!L) continue;
      updateAmbient(e, L, effDt);
      if (!e.attack) {
        const g = glows.get(e); if (g) { g.visible = false; glowPool.push(g); glows.delete(e); }
        continue;
      }
      const a = e.attack, h = a.hits[e.hitIndex] || a.hits[0], sc = Math.sqrt(L.scale);
      const wKind = windupKind(L, a, h);
      let acc = rate.get(e) || 0;
      if (e.state === ES.WINDUP && wKind) {
        const k = clamp(e.stateTime / Math.max(0.1, h.startup), 0, 1);
        strikePoint(e, h, v1, 1.0);
        const mult = wKind === 'vortex' ? 1.55 : wKind === 'crackle' ? 1.2 : 1.0;
        acc += BB.gather * mult * dt * sc * (0.4 + k) * dens;
        for (; acc >= 1; acc--) {
          const ux = rand(-1, 1), uy = rand(-0.6, 1), uz = rand(-1, 1), l = Math.hypot(ux, uy, uz) || 1;
          const r = rand(1.0, 2.0) * L.scale * 0.82, life = rand(0.24, 0.44);
          const sx = v1.x + ux / l * r, sy = v1.y + uy / l * r, sz = v1.z + uz / l * r;
          col.set(L.el.mote).multiplyScalar(2.7);
          fx.motes.spawn({ x: sx, y: sy, z: sz, vx: (v1.x - sx) / life, vy: (v1.y - sy) / life, vz: (v1.z - sz) / life, drag: 0, lift: 0, life, max: life,
                           s0: U.motes.size * 1.15 * sc, s1: U.motes.size * 0.3, r: col.r, g: col.g, b: col.b,
                           swirl: wKind === 'vortex' && !calm() ? 4.2 : 0, cx: v1.x, cz: v1.z, fadeIn: 0.25 });
        }
        // Vortex wind-ups pulse a gathering ground ring once per hit; crackle & holds spark 3D energy arcs along the striking limb.
        const wKey = e.attackNo * 64 + e.hitIndex;
        if (wKind === 'vortex' && windupKey.get(e) !== wKey) {
          windupKey.set(e, wKey);
          groundRing(e.x, e.y, e.z, e.radius * 2.5, 0.35, Math.min(0.85, h.startup * 0.75), L.el.glow, 0.36, 0.72);
        }
        if ((wKind === 'crackle' || (wKind === 'vortex' && k > 0.45)) && !calm() && Math.random() < (isUltra() ? 9 : 4.5) * dt) {
          const r = 0.75 * sc;
          spawnArc(v1.x + rand(-r, r), v1.y + rand(-r * 0.5, r), v1.z + rand(-r, r), v1.x, v1.y, v1.z, L.el, 0.1, 0.18, 0.22);
        }
        let g = glows.get(e);
        if (!g && glowPool.length) { g = glowPool.pop(); glows.set(e, g); }
        if (g) { g.visible = true; g.position.copy(v1); g.material.color.set(L.el.glow).multiplyScalar(2.1); g.material.opacity = 0.28 + 0.68 * k; g.scale.setScalar((0.42 + k * BB.gatherGlow) * sc); }
      } else {
        const g = glows.get(e); if (g) { g.visible = false; glowPool.push(g); glows.delete(e); }
      }
      if (e.state === ES.ACTIVE || (e.state === ES.WINDUP && a.spectral)) {
        const n = e.state === ES.ACTIVE ? BB.shed : 1;
        SHED.size = 0.85 * sc;
        for (let i = 0; i < n; i++) {
          strikePoint(e, h, v1, rand(0.35, 1.25));
          fx.moteBurst(v1, 1, L.el.mote, SHED);
        }
        if (e.state === ES.ACTIVE && Math.random() < 0.55) fx.sparkBurst(strikePoint(e, h, v1, 1.2), 1, L.el.sparks, null, 0, 0.55);
        if (L.el.smoke && e.state === ES.ACTIVE && Math.random() < 0.6) {
          PUFF_VEL[0] = 0; PUFF_VEL[1] = 0.3; PUFF_VEL[2] = 0;
          fx.puff(strikePoint(e, h, v1, rand(0.4, 1.2)).x, v1.y, v1.z, L.el.smoke, 0.28, 0.95, 0.7, PUFF_VEL, 0.52);
        }
      }
      if (e.leaping) {
        const c = fx.chest(e);
        LEAP.r = e.radius; LEAP.size = 1.15 * sc;
        fx.moteBurst(c, 4, L.el.mote, LEAP);
        if (Math.random() < 0.55) fx.sparkBurst(c, 1, L.el.sparks, [0, -1, 0], 0.5, 0.45);
        if (L.el.smoke && Math.random() < 0.45) {
          PUFF_VEL[0] = 0; PUFF_VEL[1] = 0.2; PUFF_VEL[2] = 0;
          fx.puff(c.x, c.y, c.z, L.el.smoke, 0.4, 1.4, 0.75, PUFF_VEL, 0.42);
        }
      }
      if (a.breath && e.state === ES.ACTIVE) {
        const B = a.breath, s = Math.sin(e.yaw), c = Math.cos(e.yaw);
        for (let i = 0; i < 4; i++) {
          const t = rand(0.5, B.len), w = (Math.random() - 0.5) * B.width * (t / B.len);
          v2.set(e.x + s * t + c * w, e.y + rand(0.3, 1.6), e.z + c * t - s * w);
          fx.moteBurst(v2, 1, FX_ELEMENTS.fire.mote, BREATH);
        }
        if (Math.random() < 0.35) {
          PUFF_VEL[0] = s; PUFF_VEL[1] = 1; PUFF_VEL[2] = c;
          fx.puff(e.x + s * B.len * 0.6, e.y + 1.4, e.z + c * B.len * 0.6, U.puffs.smoke, 0.8, 2.4, 1.2, PUFF_VEL, 0.35);
        }
      }
      if (a.sphere && (e.state === ES.WINDUP || e.state === ES.ACTIVE)) {
        const S = a.sphere, cx = e.x + Math.sin(e.yaw) * S.fwd, cz = e.z + Math.cos(e.yaw) * S.fwd, cy = e.y + 1.2;
        const n = fx.count('sphere', 3);
        for (let i = 0; i < n; i++) {
          const ang = rand(0, Math.PI * 2), r = S.r * rand(0.9, 1.4), life = rand(0.4, 0.7), sx = cx + Math.cos(ang) * r, sz = cz + Math.sin(ang) * r, sy = cy + rand(-1, 1.2);
          col.set(L.el.mote).multiplyScalar(2.2);
          fx.motes.spawn({ x: sx, y: sy, z: sz, vx: (cx - sx) / life, vy: (cy - sy) / life, vz: (cz - sz) / life, drag: 0, lift: 0, life, max: life,
                           s0: U.motes.size * 1.2, s1: U.motes.size * 0.3, r: col.r, g: col.g, b: col.b, swirl: 3, cx, cz, fadeIn: 0.2 });
        }
      }
      rate.set(e, acc);
    }
    // ---- update pooled meshes ----
    for (const R of rings) {
      if (!R.m.visible) continue;
      R.age += dt; const p = R.age / R.time;
      if (p >= 1) { R.m.visible = false; continue; }
      const r = lerp(R.r0, R.r1, 1 - (1 - p) * (1 - p)), u = R.m.material.uniforms;
      R.m.scale.setScalar(Math.max(0.05, r)); u.uWidth.value = R.width / Math.max(0.3, r); u.uOpacity.value = R.peak * (1 - p);
    }
    for (const Pl of pillars) {
      if (!Pl.m.visible) continue;
      Pl.age += dt; const p = Pl.age / BB.pillar.time;
      if (p >= 1) { Pl.m.visible = false; continue; }
      Pl.m.scale.set(Pl.r * (1 - 0.6 * p), Pl.h * Math.min(1, p * 6), Pl.r * (1 - 0.6 * p));
      Pl.m.material.uniforms.uOpacity.value = p < 0.1 ? 1 : (1 - p) / 0.9;
    }
    for (const F of fires) {
      if (!F.m.visible) continue;
      F.age += dt; const p = F.age / F.life;
      if (p >= 1) { F.m.visible = false; continue; }
      F.m.scale.setScalar(F.size * Math.min(1, p * 8) * (1 - p * p));
    }
    for (const S of slashes) {
      if (!S.m.visible) continue;
      S.age += effDt; const p = S.age / S.time;
      if (p >= 1) { S.m.visible = false; continue; }
      const easeOut = 1 - (1 - p) * (1 - p), sc = lerp(S.s0, S.s1, easeOut);
      S.m.scale.set(sc, sc * S.sy, sc);
      S.m.rotation.y += S.spin * effDt;
      S.m.position.x += S.vx * effDt; S.m.position.z += S.vz * effDt;
      const u = S.m.material.uniforms;
      u.uProg.value = p; u.uOpacity.value = S.peak * (1 - p * p);
    }
    for (const D of domes) {
      if (!D.m.visible) continue;
      D.age += effDt; const p = D.age / D.time;
      if (p >= 1) { D.m.visible = false; continue; }
      const e3 = 1 - Math.pow(1 - p, 3);
      D.m.scale.set(Math.max(0.1, D.r * e3), Math.max(0.1, D.h * e3), Math.max(0.1, D.r * e3));
      const u = D.m.material.uniforms;
      u.uProg.value = p; u.uOpacity.value = D.peak * (1 - p) * (1 - p * 0.35);
    }
    for (const G of glyphs) {
      if (!G.m.visible) continue;
      G.age += effDt; const p = G.age / G.time;
      if (p >= 1) { G.m.visible = false; continue; }
      if (G.spin) G.m.rotation.z += G.spin * effDt;
      const u = G.m.material.uniforms;
      u.uProg.value = p; u.uOpacity.value = G.peak * (p < 0.12 ? p / 0.12 : Math.pow(1 - (p - 0.12) / 0.88, 1.4));
    }
    // ---- update InstancedMesh spires ----
    let si = 0;
    for (const S of spires) {
      if (!S.on) continue;
      S.age += effDt;
      if (S.age >= S.life) { S.on = false; continue; }
      const p = S.age / S.life;
      const rise = p < 0.12 ? 1 - Math.pow(1 - p / 0.12, 3) : p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
      const glow = p < 0.15 ? 1.4 : Math.max(0, 1 - (p - 0.15) / 0.65);
      dummy.position.set(S.x, S.y - (1 - rise) * S.h * 1.4, S.z);
      dummy.rotation.set(S.rx, S.ry, S.rz, 'YXZ');
      dummy.scale.set(S.w * (0.7 + 0.3 * rise), Math.max(0.01, S.h * rise), S.w * (0.7 + 0.3 * rise));
      dummy.updateMatrix();
      spireBodies.setMatrixAt(si, dummy.matrix); spireBodies.setColorAt(si, S.bodyCol);
      dummy.scale.set(S.w * 1.18 * (0.7 + 0.3 * rise), Math.max(0.01, S.h * rise * 0.56), S.w * 1.18 * (0.7 + 0.3 * rise));
      dummy.updateMatrix();
      spireCores.setMatrixAt(si, dummy.matrix); spireCores.setColorAt(si, col.copy(S.glowCol).multiplyScalar(glow * 0.85));
      si++;
    }
    spireBodies.count = spireCores.count = si;
    spireBodies.visible = spireCores.visible = si > 0;
    if (si) {
      spireBodies.instanceMatrix.needsUpdate = spireBodies.instanceColor.needsUpdate = true;
      spireCores.instanceMatrix.needsUpdate = spireCores.instanceColor.needsUpdate = true;
    }
    // ---- update InstancedMesh jagged energy arcs ----
    let ai = 0;
    for (const A of arcs) {
      if (!A.on) continue;
      A.age += dt;
      if (A.age >= A.life) { A.on = false; continue; }
      const f = 1 - A.age / A.life;
      col.copy(A.glowCol).lerp(A.coreCol, f).multiplyScalar(f * 1.4);
      for (let i = 0; i < ARC_SEGS && ai < MAX_ARC_INST; i++) {
        const p0 = A.pts[i], p1 = A.pts[i + 1];
        tmpDir.subVectors(p1, p0);
        const len = tmpDir.length();
        if (len < 0.01) continue;
        tmpDir.multiplyScalar(1 / len);
        tmpQ.setFromUnitVectors(UP, tmpDir);
        dummy.position.copy(p0);
        dummy.quaternion.copy(tmpQ);
        const w = A.width * (0.45 + 0.55 * f) * (1 - 0.35 * (i / ARC_SEGS));
        dummy.scale.set(w, len, w);
        dummy.updateMatrix();
        arcMesh.setMatrixAt(ai, dummy.matrix);
        arcMesh.setColorAt(ai, col);
        ai++;
      }
    }
    arcMesh.count = ai; arcMesh.visible = ai > 0;
    if (ai) { arcMesh.instanceMatrix.needsUpdate = arcMesh.instanceColor.needsUpdate = true; }
  });

  return { look, groundRing, pillar, groundFire, slashArc, shockDome, groundGlyph, spireBurst, spawnArc, arcSpray, IMPACT,
           info: () => ({
             rings: rings.filter(r => r.m.visible).length,
             pillars: pillars.filter(p => p.m.visible).length,
             fires: fires.filter(f => f.m.visible).length,
             glows: glows.size,
             slashes: slashes.filter(s => s.m.visible).length,
             domes: domes.filter(d => d.m.visible).length,
             glyphs: glyphs.filter(g => g.m.visible).length,
             spires: spireBodies.visible ? spireBodies.count : 0,
             arcs: arcMesh.visible ? arcMesh.count : 0,
           }) };
})();
