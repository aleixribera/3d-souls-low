'use strict';
// ============================================================================
// 9d. The Ultra preset, effects (quality.ultra): sparks, blood, souls, auras, smoke, rock chunks, impact lights,
// flares, weapon ribbons and procedural fire
// ============================================================================
// Drawing only: it listens to combat events and reads bodies each frame (a render hook), never changing the fight.
// Every pool is built once at load and drawn once by visuals.warmUp (pooledFx), so nothing compiles mid-fight.
// Off (any preset but Ultra) it spawns nothing, and the old trails and flame cones show again.
const ultraFx = (() => {
  const U = VIS.ultra, H = U.hits, on = () => ultraPost.on();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), col = new THREE.Color(), col2 = new THREE.Color();
  const FOG_UNIFORMS = () => ({ uFogC: { value: new THREE.Color() }, uFogD: FOG_D });
  const fogged = [];   // materials whose fog colour follows the level's (non-additive pools)
  const groundBelow = (x, y, z) => { const g = world ? world.groundAt(x, z, y + 0.4) : 0; return g > -Infinity ? g : y - 30; };
  const chest = b => ({ x: b.x, y: b.y + b.height * 0.6, z: b.z });
  const isBoss = e => !!(e.boss || e.baseDef.phases || e.baseDef.posture);
  // js/ultra-boss.js plugs in here: a boss's colour of the moment, its blade ribbon, and whether it draws a ground blow itself.
  const hooks = { aura: null, trail: null, impact: null, bolt: null };
  const auraColor = e => (hooks.aura && hooks.aura(e)) ?? U.auraColors[e.baseDef.id] ?? U.aura.color;

  // ---- streaks: sparks (additive, HDR) and blood drops (opaque), stretched along their flight -------------------------
  // A streak: position, velocity, life / max, width w, stretch str (s of flight behind it), gravity gr, drag, bounce off
  // `ground`, colour r g b; `cool` dims and reddens it as it dies, `shrink` thins it.
  function makeStreaks(max, additive) {
    const pos = new Float32Array(max * 12), tint = new Float32Array(max * 16), uv = new Float32Array(max * 8), idx = new Uint32Array(max * 6);
    for (let i = 0; i < max; i++) {
      uv.set([0, 0, 0, 1, 1, 0, 1, 1], i * 8);
      const a = i * 4; idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('tint', new THREE.BufferAttribute(tint, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: FOG_UNIFORMS(), transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec4 tint; varying vec4 vT; varying vec2 vUv; varying float vD;
void main() { vT = tint; vUv = uv; vec4 mv = viewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uFogC; uniform float uFogD; varying vec4 vT; varying vec2 vUv; varying float vD;
void main() {
  float across = 1.0 - abs(vUv.y * 2.0 - 1.0), a = smoothstep(0.0, 0.7, across) * mix(0.2, 1.0, vUv.x) * vT.a;
  float f = uFogD * vD, fog = 1.0 - exp(-f * f);
  ${additive ? 'gl_FragColor = vec4(vT.rgb * (1.0 - fog), a);' : 'gl_FragColor = vec4(mix(vT.rgb, uFogC, fog), a);'}
}` });
    if (!additive) fogged.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 3; scene.add(mesh); pooledFx.push(mesh);
    const list = [];
    return {
      mesh,
      spawn(p) { if (list.length >= max) list.shift(); list.push(p); return p; },
      clear() { list.length = 0; mesh.visible = false; },
      count: () => list.length,
      update(dt, cam, land) {
        let n = 0;
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.life -= dt;
          if (p.life <= 0) { list.splice(i, 1); continue; }
          const drag = Math.exp(-p.drag * dt);
          p.vx *= drag; p.vz *= drag; p.vy = p.vy * drag - p.gr * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.y < p.ground) {
            if (p.bounce > 0 && p.vy < -1.5) { p.y = p.ground; p.vy *= -p.bounce; p.vx *= 0.55; p.vz *= 0.55; p.bounce *= 0.6; }
            else { if (land) land(p); list.splice(i, 1); continue; }
          }
          // the quad: from a tail behind it (along its velocity) to its head, turned to face the camera
          const st = p.str, tx = p.x - p.vx * st, ty = p.y - p.vy * st, tz = p.z - p.vz * st;
          let dx = p.x - tx, dy = p.y - ty, dz = p.z - tz;
          const len = Math.hypot(dx, dy, dz);
          if (len < p.w * 2) { const k = len > 1e-5 ? p.w * 2 / len : 0; dx = len > 1e-5 ? dx * k : p.w * 2; dy *= k; dz *= k; }
          const cx = p.x - cam.x, cy = p.y - cam.y, cz = p.z - cam.z;
          let sx = dy * cz - dz * cy, sy = dz * cx - dx * cz, sz = dx * cy - dy * cx;
          const sl = Math.hypot(sx, sy, sz) || 1, w = p.w * (p.shrink ? 0.4 + 0.6 * p.life / p.max : 1);
          sx *= w / sl; sy *= w / sl; sz *= w / sl;
          const hx = tx + dx, hy = ty + dy, hz = tz + dz, o = n * 12;
          pos[o] = tx - sx; pos[o + 1] = ty - sy; pos[o + 2] = tz - sz;
          pos[o + 3] = tx + sx; pos[o + 4] = ty + sy; pos[o + 5] = tz + sz;
          pos[o + 6] = hx - sx; pos[o + 7] = hy - sy; pos[o + 8] = hz - sz;
          pos[o + 9] = hx + sx; pos[o + 10] = hy + sy; pos[o + 11] = hz + sz;
          const f = p.life / p.max, a = p.fade ? f : Math.min(1, f * 2.5), b = p.cool ? 0.35 + 0.65 * f : 1;
          for (let k = 0; k < 4; k++) tint.set([p.r * b, p.g * b * (p.cool ? f : 1), p.b * b * (p.cool ? f * f : 1), a], n * 16 + k * 4);
          n++;
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.tint.needsUpdate = true;
        geo.setDrawRange(0, n * 6); mesh.visible = n > 0;
      },
    };
  }
  const sparks = makeStreaks(U.sparks.max, true), drops = makeStreaks(U.blood.max, false);

  // ---- points: motes (additive glow) and puffs (soft smoke, dust and blood mist) -----------------------------------------
  function puffTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), rnd = seeded(91);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 6.28, d = rnd() * 30, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, r = 18 + rnd() * 26;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  }
  function makePoints(max, additive, maxPx, tex) {
    const pos = new Float32Array(max * 3), tint = new Float32Array(max * 4), size = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('tint', new THREE.BufferAttribute(tint, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: PT_SCALE, uMaxPx: { value: maxPx }, uTex: { value: tex || null }, ...FOG_UNIFORMS() },
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec4 tint; attribute float size; uniform float uScale, uMaxPx; varying vec4 vT; varying float vD;
void main() { vT = tint; vec4 mv = viewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv;
  gl_PointSize = min(size * uScale / max(vD, 0.1), uMaxPx); }`,
      fragmentShader: `uniform sampler2D uTex; uniform vec3 uFogC; uniform float uFogD; varying vec4 vT; varying float vD;
void main() {
  float f = uFogD * vD, fog = 1.0 - exp(-f * f);
  ${additive
    ? 'float r = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - r), 2.2) * vT.a; if (a < 0.003) discard; gl_FragColor = vec4(vT.rgb * (1.0 - fog * 0.85), a);'
    : 'float a = texture2D(uTex, gl_PointCoord).a * vT.a * 2.2; if (a < 0.003) discard; gl_FragColor = vec4(mix(vT.rgb, uFogC, fog), min(a, 1.0));'}
}` });
    if (!additive) fogged.push(mat);
    const mesh = new THREE.Points(geo, mat);
    mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = additive ? 4 : 2; scene.add(mesh); pooledFx.push(mesh);
    const list = [];
    return {
      mesh,
      spawn(p) { if (list.length >= max) list.shift(); list.push(p); return p; },
      clear() { list.length = 0; mesh.visible = false; },
      count: () => list.length,
      update(dt) {
        let n = 0;
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.life -= dt;
          if (p.life <= 0) { list.splice(i, 1); continue; }
          const drag = Math.exp(-p.drag * dt);
          p.vx *= drag; p.vy = p.vy * drag + (p.lift || 0) * dt; p.vz *= drag;
          if (p.swirl) {   // turn round a vertical axis through (cx, cz)
            const a = p.swirl * dt, ox = p.x - p.cx, oz = p.z - p.cz, c = Math.cos(a), s = Math.sin(a);
            p.x = p.cx + ox * c - oz * s; p.z = p.cz + ox * s + oz * c;
          }
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          const f = 1 - p.life / p.max, inA = Math.min(1, f / (p.fadeIn || 0.08)), a = inA * (1 - f) * (p.pulse ? 0.75 + 0.25 * Math.sin(p.life * p.pulse) : 1);
          pos[n * 3] = p.x; pos[n * 3 + 1] = p.y; pos[n * 3 + 2] = p.z;
          tint[n * 4] = p.r; tint[n * 4 + 1] = p.g; tint[n * 4 + 2] = p.b; tint[n * 4 + 3] = a * (p.a ?? 1);
          size[n] = lerp(p.s0, p.s1 ?? p.s0, p.grow ? Math.sqrt(f) : f);
          n++;
        }
        for (const k of ['position', 'tint', 'size']) geo.attributes[k].needsUpdate = true;
        geo.setDrawRange(0, n); mesh.visible = n > 0;
      },
    };
  }
  const motes = makePoints(U.motes.max, true, U.motes.maxPx), puffs = makePoints(U.puffs.max, false, 900, puffTexture());

  // ---- rock chunks: lit, shadowed stones thrown out by slams ---------------------------------------------------------------
  // Stone (rock shards) and wood (splinters, for barricades); one instanced mesh each.
  const chunkMeshes = { stone: new THREE.InstancedMesh(rockGeometry(seeded(17), 0), MAT.edge, U.chunks.max),
                        wood: new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.5, 2.2), MAT.log, U.chunks.max) };
  for (const m of Object.values(chunkMeshes)) { m.count = 0; m.frustumCulled = false; m.visible = false; scene.add(m); pooledFx.push(m); }   // warmed up with the rest
  const chunks = [], o3 = new THREE.Object3D();
  function updateChunks(dt) {
    const n = { stone: 0, wood: 0 };
    for (let i = chunks.length - 1; i >= 0; i--) {
      const c = chunks[i];
      c.age += dt;
      if (c.age > U.chunks.life) { chunks.splice(i, 1); continue; }
      if (!c.rest) {
        c.vy -= CONFIG.gravity * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rx += c.spin * dt; c.ry += c.spin * 0.7 * dt;
        if (c.y < c.ground + c.s * 0.4) { c.y = c.ground + c.s * 0.4; if (c.vy < -2) { c.vy *= -0.3; c.vx *= 0.5; c.vz *= 0.5; c.spin *= 0.5; } else c.rest = true; }
      }
      o3.position.set(c.x, c.y, c.z); o3.rotation.set(c.rx, c.ry, 0);
      o3.scale.setScalar(c.s * clamp((U.chunks.life - c.age) / 0.6, 0, 1)); o3.updateMatrix();
      chunkMeshes[c.kind].setMatrixAt(n[c.kind]++, o3.matrix);
    }
    for (const [k, m] of Object.entries(chunkMeshes)) { m.count = n[k]; m.instanceMatrix.needsUpdate = true; m.visible = n[k] > 0; }
  }

  // ---- impact lights, star flares and glowing ground marks -----------------------------------------------------------------
  const flashes = Array.from({ length: U.flash.lights }, () => {
    const l = new THREE.PointLight(0xffffff, 0, U.flash.range, 1.4); l.userData.flash = true; ultraPost.own(l); return l;
  });
  function starTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.08, 'rgba(255,255,255,0.8)'); grd.addColorStop(0.3, 'rgba(255,255,255,0.12)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    g.globalCompositeOperation = 'lighter';
    for (const [a, len, w] of [[0, 128, 5], [Math.PI / 2, 128, 5], [Math.PI / 4, 70, 3], [-Math.PI / 4, 70, 3]]) {
      g.save(); g.translate(128, 128); g.rotate(a);
      const s = g.createLinearGradient(-len, 0, len, 0);
      s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(0.5, 'rgba(255,255,255,0.9)'); s.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = s; g.beginPath(); g.ellipse(0, 0, len, w, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    return new THREE.CanvasTexture(c);
  }
  const STAR = starTexture();
  const flares = Array.from({ length: U.flares.max }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: STAR, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, fog: false }));
    s.visible = false; s.renderOrder = 12; scene.add(s); pooledFx.push(s);
    return { s, age: Infinity, size: 1, time: U.flares.time, spin: 0 };
  });
  const glowMat = () => new THREE.MeshBasicMaterial({ map: GLOW_TEX, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false,
    polygonOffset: true, polygonOffsetFactor: -3 });
  const marks = Array.from({ length: 8 }, () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), glowMat());
    m.visible = false; m.renderOrder = 2; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity, life: 1, size: 1, peak: 1 };
  });
  let cursor = 0;
  const pick = list => list.reduce((a, b) => (b.age ?? -b.intensity) > (a.age ?? -a.intensity) ? b : a);   // the oldest (or dimmest)

  // ---- weapon ribbons -----------------------------------------------------------------------------------------------------
  const T = U.trails, SEG = (T.samples - 1) * T.sub + 1;
  function makeRibbon() {
    const pos = new Float32Array(SEG * 6), aT = new Float32Array(SEG * 2), aS = new Float32Array(SEG * 2), idx = [];
    for (let i = 0; i < SEG; i++) { aS[i * 2] = 0; aS[i * 2 + 1] = 1; }
    for (let i = 0; i < SEG - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1)); geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: T.opacity } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'attribute float aT; attribute float aS; varying float vT; varying float vS; void main() { vT = aT; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vT; varying float vS;
void main() {
  float fade = pow(clamp(1.0 - vT, 0.0, 1.0), 1.7);
  float body = smoothstep(0.0, 0.55, vS) * (0.3 + 0.7 * vS), edge = smoothstep(0.82, 1.0, vS) * 1.6;
  float a = (body + edge) * fade * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * (1.0 + edge * fade), a);
}` });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 5; scene.add(mesh); pooledFx.push(mesh);
    const pts = [];   // { b, t, time } newest first
    const cr = (p0, p1, p2, p3, t, out) => {
      const t2 = t * t, t3 = t2 * t;
      return out.set(
        0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3));
    };
    return {
      mesh, owner: null,
      update(active, rig, now, color, boost) {
        if (active) {
          rig.weapon.updateWorldMatrix(true, false);
          const m = rig.weapon.matrixWorld;
          pts.unshift({ b: new THREE.Vector3(0, 0, 0.25).applyMatrix4(m), t: new THREE.Vector3(0, 0, 1.2).applyMatrix4(m), time: now });
          if (pts.length > T.samples) pts.pop();
        }
        while (pts.length && now - pts[pts.length - 1].time > T.life) pts.pop();
        if (pts.length < 2) { mesh.visible = false; return pts.length > 0; }
        mat.uniforms.uColor.value.set(color).multiplyScalar(boost);
        let n = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
          for (let s = 0; s < T.sub && n < SEG - 1; s++) {
            const t = s / T.sub;
            cr(p0.b, p1.b, p2.b, p3.b, t, v1); cr(p0.t, p1.t, p2.t, p3.t, t, v2);
            pos.set([v1.x, v1.y, v1.z, v2.x, v2.y, v2.z], n * 6);
            const age = clamp((now - lerp(p1.time, p2.time, t)) / T.life, 0, 1); aT[n * 2] = aT[n * 2 + 1] = age;
            n++;
          }
        }
        const last = pts[pts.length - 1];
        pos.set([last.b.x, last.b.y, last.b.z, last.t.x, last.t.y, last.t.z], n * 6); aT[n * 2] = aT[n * 2 + 1] = 1; n++;
        geo.attributes.position.needsUpdate = true; geo.attributes.aT.needsUpdate = true;
        geo.setDrawRange(0, (n - 1) * 6); mesh.visible = true;
        return true;
      },
      clear() { pts.length = 0; mesh.visible = false; },
    };
  }
  const ribbons = Array.from({ length: T.max }, makeRibbon), ribbonOf = new Map();
  function trailColor(b) {
    if (b === Game.player) return [T.player, T.playerBoost];
    const a = b.attack, own = hooks.trail && hooks.trail(b);
    if (a && a.rollOnly) return [T.rollOnly, T.enemyBoost * 1.2];
    if (own) return own;
    return [U.trailColors[b.baseDef.id] ?? T.enemy, T.enemyBoost];
  }

  // ---- procedural fire on torches, braziers and bonfires --------------------------------------------------------------------
  const F = U.fire;
  const fireMat = seed => new THREE.ShaderMaterial({
    uniforms: { uTime: vTime, uSeed: { value: seed }, uCore: { value: new THREE.Color(F.core).multiplyScalar(F.boost) },
                uMid: { value: new THREE.Color(F.mid).multiplyScalar(F.boost * 0.8) }, uEdge: { value: new THREE.Color(F.edge).multiplyScalar(F.boost * 0.6) },
                uW: { value: 1 }, uH: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uW, uH; varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float sx = length(modelMatrix[0].xyz), sy = length(modelMatrix[1].xyz);
  vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); r = normalize(vec3(r.x, 0.0, r.z) + 1e-5);
  vec3 w = c + r * position.x * sx * uW + vec3(0.0, 1.0, 0.0) * position.y * sy * uH;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`,
    fragmentShader: `uniform float uTime, uSeed; uniform vec3 uCore, uMid, uEdge; varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += n2(p) * a; p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec2 uv = vUv; float t = uTime * 1.7 + uSeed;
  float n = fbm(vec2(uv.x * 3.2 + uSeed, uv.y * 2.4 - t));
  float x = (uv.x - 0.5) * 2.0 + (n - 0.5) * 0.55 * uv.y;
  float width = mix(0.85, 0.06, pow(uv.y, 0.75));
  float shape = (1.0 - smoothstep(0.0, 1.0, abs(x) / width)) * smoothstep(0.0, 0.07, uv.y);
  float k = clamp(shape * (0.55 + 0.9 * n) - uv.y * 0.42, 0.0, 1.0);
  vec3 c = mix(uEdge, uMid, smoothstep(0.08, 0.4, k)); c = mix(c, uCore, smoothstep(0.4, 0.78, k));
  float a = smoothstep(0.03, 0.3, k);
  if (a < 0.003) discard;
  gl_FragColor = vec4(c, a);
}` });
  const fireGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  function dressFires() {
    for (const f of flames) {
      if (!f.ultraFire) {
        const P = f.mesh.geometry.parameters || { radius: 0.28, height: 0.95 }, m = new THREE.Mesh(fireGeo, fireMat(Math.random() * 40));
        m.material.uniforms.uW.value = P.radius * 2 * F.width; m.material.uniforms.uH.value = P.height * F.height;
        m.position.y = -P.height * 0.42; m.frustumCulled = false; m.renderOrder = 3;
        f.mesh.add(m); f.ultraFire = m;
      }
      f.ultraFire.visible = on(); f.mesh.material.visible = !on();
    }
  }

  // ---- spawners -------------------------------------------------------------------------------------------------------------
  const unit = () => { const u = rand(-1, 1), a = rand(0, Math.PI * 2), r = Math.sqrt(1 - u * u); return [Math.cos(a) * r, u, Math.sin(a) * r]; };
  // n sparks from `at`; `dir` biases them (a unit [x, y, z]) by `bias` 0..1.
  function sparkBurst(at, n, kind = 'clash', dir = null, bias = 0, speed = 1) {
    const S = U.sparks, [hot, cool] = S.colors[kind] || S.colors.clash, ground = groundBelow(at.x, at.y, at.z);
    for (let i = 0; i < n; i++) {
      const u = unit(), d = dir ? [lerp(u[0], dir[0], bias), lerp(u[1], dir[1], bias) + 0.25, lerp(u[2], dir[2], bias)] : [u[0], u[1] * 0.8 + 0.35, u[2]];
      const l = Math.hypot(...d) || 1, s = between(Math.random, S.speed) * speed * rand(0.5, 1);
      col.set(hot).lerp(col2.set(cool), Math.random()).multiplyScalar(S.boost * rand(0.6, 1.3));
      const life = between(Math.random, S.life);
      sparks.spawn({ x: at.x, y: at.y, z: at.z, vx: d[0] / l * s, vy: d[1] / l * s, vz: d[2] / l * s, life, max: life, w: S.width * rand(0.6, 1.3),
                     str: S.stretch, gr: S.gravity, drag: S.drag, bounce: S.bounce, ground, r: col.r, g: col.g, b: col.b, cool: true, fade: false, shrink: true });
    }
  }
  function bloodSpray(at, dir, n, size = 1, color = U.blood.color) {
    const B = U.blood, ground = groundBelow(at.x, at.y, at.z);
    for (let i = 0; i < n; i++) {
      const u = unit(), d = [dir[0] * 1.1 + u[0] * 0.55, dir[1] + 0.45 + u[1] * 0.4, dir[2] * 1.1 + u[2] * 0.55], l = Math.hypot(...d) || 1;
      const s = between(Math.random, B.speed) * rand(0.4, 1) * Math.sqrt(size), life = between(Math.random, B.life);
      col.set(color).lerp(col2.set(B.dark), Math.random() * 0.6);
      drops.spawn({ x: at.x + rand(-0.05, 0.05), y: at.y, z: at.z + rand(-0.05, 0.05), vx: d[0] / l * s, vy: d[1] / l * s, vz: d[2] / l * s, life, max: life,
                    w: B.width * rand(0.5, 1.4) * Math.sqrt(size), str: B.stretch, gr: B.gravity, drag: 0.6, bounce: 0, ground, splat: Math.random() < B.splats,
                    r: col.r, g: col.g, b: col.b, fade: false, cool: false, shrink: false });
    }
    for (let i = 0; i < B.mist * size; i++) puff(at.x, at.y, at.z, B.mistColor, 0.5 * size, 1.4 * size, 0.7, [dir[0] * 1.5, 0.6, dir[2] * 1.5], 0.55);
  }
  function puff(x, y, z, color, s0, s1, life, vel = null, a = 0.5) {
    const v = vel || [rand(-0.6, 0.6), rand(0.2, 0.8), rand(-0.6, 0.6)];
    col.set(color);
    puffs.spawn({ x, y, z, vx: v[0] + rand(-0.3, 0.3), vy: v[1], vz: v[2] + rand(-0.3, 0.3), drag: 2.2, lift: 0.15, life: life * rand(0.8, 1.2), max: life,
                  s0, s1, grow: true, r: col.r, g: col.g, b: col.b, a, fadeIn: 0.15 });
  }
  function dustRing(x, y, z, n, radius, color = U.puffs.dust, s = 1) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + rand(-0.2, 0.2), sp = rand(1.5, 3.5) * Math.sqrt(radius);
      puff(x + Math.cos(a) * radius * 0.3, y + 0.15, z + Math.sin(a) * radius * 0.3, color, 0.5 * s, U.puffs.size[1] * s, U.puffs.life, [Math.cos(a) * sp, rand(0.2, 0.7), Math.sin(a) * sp], 0.42);
    }
  }
  // Glowing motes: n of them round `at` (within `r` m), drifting up (`lift`), optionally swirling round it.
  function moteBurst(at, n, color, { r = 0.4, speed = 1.5, lift = 0.6, life = [0.8, 1.8], size = 1, swirl = 0, up = 0.6, drag = 1.2, boost = 2.2, pulse = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const u = unit(), s = speed * rand(0.3, 1), L = between(Math.random, life);
      col.set(color).multiplyScalar(boost * rand(0.7, 1.3));
      motes.spawn({ x: at.x + u[0] * r * Math.random(), y: at.y + u[1] * r * Math.random(), z: at.z + u[2] * r * Math.random(),
                    vx: u[0] * s, vy: u[1] * s * 0.6 + up * s, vz: u[2] * s, drag, lift, life: L, max: L, s0: U.motes.size * size * rand(0.6, 1.4),
                    s1: U.motes.size * size * 0.3, r: col.r, g: col.g, b: col.b, swirl: swirl * rand(0.6, 1.4), cx: at.x, cz: at.z, fadeIn: 0.1, pulse });
    }
  }
  function flashAt(at, color, intensity, range = U.flash.range) {
    const l = pick(flashes);
    l.position.set(at.x, at.y + 0.3, at.z); l.color.set(color); l.intensity = Math.max(l.intensity, intensity); l.distance = range;
  }
  function flare(at, color, size, time = U.flares.time) {
    const f = flares[cursor++ % flares.length];
    f.age = 0; f.size = size; f.time = time; f.spin = rand(-0.4, 0.4);
    f.s.position.set(at.x, at.y, at.z); f.s.material.color.set(color).multiplyScalar(2.5); f.s.material.rotation = rand(0, Math.PI); f.s.visible = true;
  }
  function mark(x, y, z, color, size, life = 1.2, peak = 1) {
    const m = pick(marks);
    m.age = 0; m.life = life; m.size = size; m.peak = peak; m.m.position.set(x, y + 0.05, z); m.m.material.color.set(color); m.m.visible = true;
  }
  function chunkBurst(x, y, z, n, speed = 1, kind = 'stone') {
    const C = U.chunks, ground = groundBelow(x, y, z);
    for (let i = 0; i < n; i++) {
      if (chunks.length >= C.max) chunks.shift();
      const a = rand(0, Math.PI * 2), s = between(Math.random, C.speed) * speed * rand(0.4, 1);
      chunks.push({ x: x + Math.cos(a) * 0.3, y: y + 0.1, z: z + Math.sin(a) * 0.3, vx: Math.cos(a) * s * 0.6, vy: s * rand(0.6, 1.2), vz: Math.sin(a) * s * 0.6,
                    s: between(Math.random, C.size), rx: rand(0, 6), ry: rand(0, 6), spin: rand(-12, 12), ground, age: rand(0, 0.4), rest: false, kind });
    }
  }
  const dirOf = (from, to) => {   // flat unit direction; a blow with no attacker (a trap, a test) goes back along the target's facing
    if (!from || !to) { const b = to || from; return b ? [-Math.sin(b.yaw || 0), 0, -Math.cos(b.yaw || 0)] : [1, 0, 0]; }
    const dx = to.x - from.x, dz = to.z - from.z, l = Math.hypot(dx, dz) || 1; return [dx / l, 0, dz / l];
  };
  const scaleOf = b => (b.baseDef ? b.baseDef.scale || 1 : 1);

  // ---- events ---------------------------------------------------------------------------------------------------------------
  // Listeners run inside combat steps: a drawing slip is reported once and never stops the fight.
  const when = (type, fn) => events.on(type, d => {
    if (!on()) return;
    try { fn(d); } catch (e) { warnOnce(`Ultra effect for "${type}" failed: ${e.message}`); }
  });
  when('strike', d => {
    const dmg = d.strike.damage || 10, k = clamp((dmg - H.light) / (H.heavy - H.light), 0, 1), at = d.at, toPlayer = d.target === Game.player;
    const dir = dirOf(d.attacker, d.target);
    if (d.blocked) {   // steel on steel: sparks off the guard, an orange flash
      sparkBurst(at, Math.round(26 + 50 * k), 'clash', [-dir[0], 0.3, -dir[2]], 0.35, 0.8 + 0.5 * k);
      flare(at, 0xffd890, 1.4 + 1.6 * k); flashAt(at, 0xffa040, 5 + 10 * k, 6 + 4 * k);
      puff(at.x, at.y, at.z, U.puffs.dust, 0.3, 1.0, 0.6, null, 0.25);
      if (k > 0.5) ultraPost.wave(at, 0.5 * k, 0.6);
      ultraPost.pulse({ ca: 0.25 + 0.35 * k });
      return;
    }
    if (d.target.training) { bloodSpray(at, dir, Math.round(lerp(...H.drops, k) * 0.6), 0.8, U.blood.sawdust); sparkBurst(at, 6, 'ember', dir, 0.5, 0.6); return; }
    bloodSpray(at, dir, Math.round(lerp(...H.drops, k) * (d.strike.riposte ? 1.8 : 1)), 0.7 + 0.8 * k);
    flare(at, toPlayer ? 0xff8070 : 0xfff0d8, 0.7 + 1.1 * k, 0.16);
    if (d.attacker && d.attacker === Game.player && d.target.baseDef && (d.target.baseDef.visual || {}).metal > 0.4) sparkBurst(at, 10, 'clash', dir, 0.4, 0.7);
    if (toPlayer) {
      const hurt = clamp(dmg / Game.player.maxHp * 2.4, 0.3, 1);
      ultraPost.pulse({ hurt, ca: 0.4 + 0.6 * k, flash: 0.05 + 0.1 * k, color: 0x7a0a04 });
      if (dmg >= H.wave) ultraPost.wave(at, 0.8 * k + 0.3, 0.9);
    } else {
      if (dmg >= H.wave || d.strike.riposte) ultraPost.wave(at, 0.5 + 0.6 * k, 0.8);
      if (dmg >= H.punch || d.strike.riposte) ultraPost.pulse({ punch: 0.35 + 0.4 * k, ca: 0.5, at });
      if (d.strike.riposte) flashAt(at, 0xff3020, 9, 7);
    }
  });
  when('parry', d => {
    const e = d.target, p = Game.player, ec = chest(e), pc = chest(p), at = { x: lerp(pc.x, ec.x, 0.4), y: lerp(pc.y, ec.y, 0.4) + 0.1, z: lerp(pc.z, ec.z, 0.4) };
    sparkBurst(at, 120, 'parry', null, 0, 1.25);
    flare(at, 0xfff2c8, 2.4, 0.4); flashAt(at, 0xffe0a0, 18, 11);
    moteBurst(at, 40, 0xffe2a0, { r: 0.3, speed: 4, lift: 0.3, life: [0.4, 1.0], size: 0.8, up: 0.2 });
    ultraPost.wave(at, 1.3, 1.1); ultraPost.pulse({ ca: 0.9, punch: 0.3, at, flash: 0.12, color: 0xfff0c8 });
  });
  when('postureBreak', d => {
    const e = d.enemy, at = { x: e.x, y: e.y + e.height * 0.65, z: e.z };
    sparkBurst(at, 90, 'gold', [0, 1, 0], 0.4, 1.1);
    moteBurst(at, 60, 0xffc860, { r: e.radius, speed: 3, lift: 0.8, life: [0.8, 1.6], size: 1.2 });
    flare(at, 0xffd070, 3.5, 0.4); flashAt(at, 0xffb040, 14, 10);
    mark(e.x, e.y, e.z, 0xffa030, 3 * scaleOf(e), 1.2, 0.9);
    ultraPost.wave(at, 1.1, 1.2); ultraPost.pulse({ ca: 0.7, punch: 0.25, at });
  });
  when('execution', d => {
    const dir = dirOf(d.at, d.exit);
    bloodSpray(d.exit, dir, 70, 1.6); bloodSpray(d.at, [-dir[0], 0, -dir[2]], 30, 1.1);
    sparkBurst(d.exit, 40, 'ember', dir, 0.6, 1.1);
    flashAt(d.at, 0xff2a14, 16, 9); flare(d.at, 0xff9070, 2.6, 0.3);
    ultraPost.wave(d.at, 1.4, 1.2); ultraPost.pulse({ punch: 0.8, ca: 1, at: d.at, flash: 0.1, color: 0x5a0000 });
  });
  when('executionPull', d => {
    const e = d.enemy, at = chest(e), dir = dirOf(e, Game.player);
    bloodSpray(at, dir, 55, 1.4); flashAt(at, 0xff3018, 8, 7);
    ultraPost.pulse({ punch: 0.4, ca: 0.6, at });
  });
  when('enemyDeath', d => {
    const e = d.enemy;
    if (e.training) return;
    const c = chest(e), color = auraColor(e);
    if (isBoss(e)) {   // the great soul leaves: a spiralling column, a blinding flash, the air bends
      moteBurst(c, 420, color, { r: e.radius * 1.2, speed: 2.5, lift: 2.4, life: [1.6, 3.6], size: 1.6, swirl: 2.2, up: 1.2, drag: 0.6 });
      moteBurst(c, 120, 0xffffff, { r: 0.5, speed: 7, lift: 0.4, life: [0.5, 1.2], size: 1.0, up: 0.3 });
      sparkBurst(c, 90, 'gold', [0, 1, 0], 0.3, 1.3);
      flashAt(c, color, 30, 18); flare(c, color, 7, 0.8);
      mark(e.x, e.y, e.z, color, 7 * scaleOf(e), 3, 1);
      dustRing(e.x, e.y, e.z, 18, 2.5, U.puffs.dust, 1.6);
      ultraPost.wave(c, 2.2, 2.2); ultraPost.pulse({ punch: 0.7, ca: 1, at: c, flash: 0.35, color });
    } else {
      moteBurst(c, 70, 0xd8e4ff, { r: e.radius, speed: 1.2, lift: 1.6, life: [1.0, 2.2], size: 1.0, swirl: 1.4, up: 0.8, drag: 0.8 });
      flashAt(c, 0xc8d8ff, 5, 6);
    }
  });
  when('playerDeath', d => {
    const c = chest(d.player);
    bloodSpray(c, [0, 0.2, 0], 50, 1.4);
    moteBurst(c, 70, 0x8a1010, { r: 0.4, speed: 1, lift: 1.0, life: [1.2, 2.4], size: 1.2, swirl: 1.2, boost: 1.4 });
    ultraPost.pulse({ hurt: 1, ca: 1, punch: 0.4, at: c });
  });
  when('bossPhase', d => {
    const e = d.enemy, c = chest(e), color = auraColor(e);
    moteBurst(c, 300, color, { r: e.radius, speed: 6, lift: 1.4, life: [1.0, 2.6], size: 1.4, swirl: 1.6, up: 0.4, drag: 1.0 });
    sparkBurst(c, 70, e.def.ignite ? 'ember' : 'gold', null, 0, 1.4);
    flashAt(c, color, 26, 16); flare(c, color, 6, 0.7);
    mark(e.x, e.y, e.z, color, 8 * scaleOf(e), 2.5, 1);
    dustRing(e.x, e.y, e.z, 20, 3, U.puffs.dust, 1.8);
    ultraPost.wave(c, 2, 2); ultraPost.pulse({ punch: 0.6, ca: 1, flash: 0.3, color, at: c });
  });
  when('alert', d => moteBurst({ x: d.enemy.x, y: d.enemy.y + d.enemy.height + 0.3, z: d.enemy.z }, 14, 0xff6a30, { r: 0.15, speed: 1.6, lift: 0.4, life: [0.4, 0.8], size: 0.8 }));
  burstOverride = () => on();   // Ultra draws its own sparks, blood and motes: the old box bursts stay out
  when('bossRetreat', d => dustRing(d.enemy.x, d.enemy.y, d.enemy.z, 14, 2, U.puffs.dust, 1.4));
  when('bossLeap', d => { dustRing(d.enemy.x, d.enemy.y, d.enemy.z, 10, 1.6, U.puffs.dust, 1.2); chunkBurst(d.enemy.x, d.enemy.y, d.enemy.z, 6, 0.6); });
  when('impact', d => {
    if (hooks.impact && hooks.impact(d)) return;   // a boss's blow: drawn in its own element (js/ultra-boss.js)
    const s = d.fx.ring || 1, e = d.enemy, boss = e && isBoss(e), color = e ? auraColor(e) : 0xffb070;
    chunkBurst(d.x, d.y, d.z, Math.round(5 + 4 * s), 0.6 + 0.25 * s);
    dustRing(d.x, d.y, d.z, Math.round(8 + 3 * s), s, U.puffs.dust, 0.8 + 0.25 * s);
    sparkBurst({ x: d.x, y: d.y + 0.15, z: d.z }, Math.round(10 * s), boss ? 'ember' : 'clash', [0, 1, 0], 0.5, 0.8);
    if (boss) { mark(d.x, d.y, d.z, color, s * 2.2, 1.1, 0.8); flashAt({ x: d.x, y: d.y + 0.5, z: d.z }, color, 4 + 3 * s, 4 + 2 * s); }
    if (s >= 1.5) { ultraPost.wave({ x: d.x, y: d.y + 0.3, z: d.z }, Math.min(1.6, s / 2.5), Math.min(2, s / 2)); ultraPost.pulse({ ca: 0.4 }); }
  });
  when('land', d => {   // the player's plunging attack: the floor cracks under the blade
    const s = d.fx.ring || 1.5;
    chunkBurst(d.x, d.y, d.z, Math.round(8 + 3 * s), 0.6 + 0.2 * s); dustRing(d.x, d.y, d.z, 14, s, U.puffs.dust, 1 + 0.15 * s);
    sparkBurst({ x: d.x, y: d.y + 0.1, z: d.z }, 26, 'clash', [0, 1, 0], 0.5, 0.9);
    mark(d.x, d.y, d.z, 0xffb070, s * 1.6, 0.8, 0.6); flashAt({ x: d.x, y: d.y + 0.5, z: d.z }, 0xffc890, 6, 6);
    ultraPost.wave({ x: d.x, y: d.y + 0.2, z: d.z }, 1, 1.2); ultraPost.pulse({ ca: 0.4 });
  });
  when('fallDamage', d => dustRing(d.body.x, d.body.y, d.body.z, 9, 1, U.puffs.dust, 0.9));
  when('boltStopped', d => { sparkBurst(d.bolt, 14, 'clash', null, 0, 0.6); puff(d.bolt.x, d.bolt.y, d.bolt.z, U.puffs.dust, 0.2, 0.7, 0.6, null, 0.3); });
  when('enemyBlink', d => {
    const c = chest(d.enemy);
    moteBurst(c, 70, 0xffe0a0, { r: d.enemy.radius, speed: 3.5, lift: 0.8, life: [0.5, 1.2], size: 1.1 });
    flashAt(c, 0xffd890, 12, 10); ultraPost.wave(c, 0.8, 1);
  });
  when('lifesteal', d => {   // the stolen life flows from the player to her
    const p = chest(Game.player), e = chest(d.enemy), n = 16;
    for (let i = 0; i < n; i++) {
      const t = rand(0.2, 0.9), life = rand(0.35, 0.6);
      col.set(0xff2a1a).multiplyScalar(2.4);
      motes.spawn({ x: p.x + rand(-0.2, 0.2), y: p.y + rand(-0.3, 0.3), z: p.z + rand(-0.2, 0.2), vx: (e.x - p.x) / life * t, vy: (e.y - p.y) / life * t + rand(0, 1),
                    vz: (e.z - p.z) / life * t, drag: 0.3, lift: 0, life, max: life, s0: U.motes.size * 1.3, s1: U.motes.size * 0.5, r: col.r, g: col.g, b: col.b, fadeIn: 0.15 });
    }
  });
  when('destinedDeath', d => { moteBurst(chest(d.body), 40, 0xff1010, { r: 0.4, speed: 1.5, lift: 0.5, life: [0.6, 1.4], size: 1, boost: 1.6 }); ultraPost.pulse({ hurt: 0.6, ca: 0.5 }); });
  when('rest', d => {
    const b = d.bonfire, y = groundBelow(b.x, (b.y || 0) + 1, b.z);
    moteBurst({ x: b.x, y: y + 0.5, z: b.z }, 90, 0xff8a30, { r: 0.4, speed: 1.4, lift: 1.8, life: [1.2, 2.6], size: 0.9, swirl: 1.2, up: 1 });
    flashAt({ x: b.x, y: y + 1.2, z: b.z }, 0xff9a40, 14, 12);
  });
  // World actions: a barricade bursts into splinters; a portcullis grinds up its posts (sparks while it lifts, see below)
  when('gateOpened', d => {
    const g = d.gate, y = g.y || 0, z = g.z ?? 0;
    if (g.style === 'barricade') {
      chunkBurst(g.x, y + 0.6, z, 16, 0.9, 'wood'); chunkBurst(g.x, y + 0.4, z, 6, 0.6);
      dustRing(g.x, y, z, 16, 2, U.puffs.dust, 1.5); ultraPost.wave({ x: g.x, y: y + 1, z }, 0.7, 1.2);
    } else { dustRing(g.x, y, z, 10, 1.2, U.puffs.dust, 1); grinding.push({ g, t: 0 }); }
  });
  // A trap: dust spits up through the cracks as it warns; when it gives way the floor rains down in a cloud of dust.
  when('trapWarning', d => {
    const c = d.trap.collapse;
    for (let i = 0; i < 10; i++) { const x = rand(c[0], c[1]), z = rand(c[2], c[3]); puff(x, d.trap.y + 0.05, z, U.puffs.dust, 0.2, 1.1, 1.2, [0, rand(0.8, 1.8), 0], 0.35); }
    chunkBurst((c[0] + c[1]) / 2, d.trap.y, (c[2] + c[3]) / 2, 6, 0.3);
  });
  when('trapSprung', d => {
    const c = d.trap.collapse, cx = (c[0] + c[1]) / 2, cz = (c[2] + c[3]) / 2, y = d.trap.y;
    for (let i = 0; i < 24; i++) {
      if (chunks.length >= U.chunks.max) chunks.shift();
      chunks.push({ x: rand(c[0], c[1]), y: y - 0.1, z: rand(c[2], c[3]), vx: rand(-1, 1), vy: rand(-2, 1), vz: rand(-1, 1), s: between(Math.random, U.chunks.size) * 1.5,
                    rx: rand(0, 6), ry: rand(0, 6), spin: rand(-6, 6), ground: groundBelow(cx, y - 0.5, cz), age: 0, rest: false, kind: 'stone' });
    }
    for (let i = 0; i < 16; i++) puff(rand(c[0], c[1]), y + 0.2, rand(c[2], c[3]), U.puffs.dust, 0.6, 2.6, 1.8, [rand(-1, 1), rand(0.3, 1.5), rand(-1, 1)], 0.45);
    ultraPost.wave({ x: cx, y: y + 0.5, z: cz }, 1, 1.6); ultraPost.pulse({ ca: 0.5 });
  });
  const grinding = [];

  // ---- each frame ------------------------------------------------------------------------------------------------------------
  let last = performance.now(), wasOn = false;
  const bodyFx = new WeakMap();   // per body: aura and dust timers, last state
  function frameUpdate(game, placed) {
    const now = performance.now(), real = Game.manualClock ? 1 / 60 : Math.min(0.1, (now - last) / 1000); last = now;   // stepped by hand (tests): one 60th a frame
    const active = on();
    if (active !== wasOn) {   // switching away from Ultra: everything of ours goes, the old trails and cones come back
      wasOn = active;
      if (!active) { for (const p of [sparks, drops, motes, puffs]) p.clear(); chunks.length = 0; for (const r of ribbons) r.clear(); ribbonOf.clear(); for (const f of flashes) f.intensity = 0; }
      dressFires();
    }
    if (!active) { updateChunks(0); for (const f of flares) f.s.visible = false; for (const m of marks) m.m.visible = false; return; }
    const dt = game.hitstop > 0 ? real * 0.12 : real;   // a blow's hit-pause freezes the flying sparks and drops too
    const fogC = scene.fog ? scene.fog.color : col.set(0);
    for (const m of fogged) m.uniforms.uFogC.value.copy(fogC);
    const cam = camera.position;
    if (flames.some(f => !f.ultraFire)) dressFires();
    // the old ribbons and cones stay hidden; ours follow every blade that can hit
    swordTrail.mesh.visible = false;
    for (const t of impactFx.trails.values()) t.mesh.visible = false;
    for (const [b] of placed) {
      const isP = b === game.player;
      const act = isP ? (b.state === PS.JUMP_ATTACK || (b.state === PS.ATTACK && !!b.hitbox)) : b.state === ES.ACTIVE && !!b.hitbox && !b.asleep;
      let r = ribbonOf.get(b);
      if (!r && act) { r = ribbons.find(x => !x.owner); if (r) { r.owner = b; ribbonOf.set(b, r); } }
      if (r) { const [c, k] = trailColor(b); if (!r.update(act, b.rig, now / 1000, c, k)) { r.owner = null; ribbonOf.delete(b); } }
    }
    // living bosses: an aura of motes; burning phases shed embers; big bodies kick up dust; dying bodies crumble to ash
    for (const [b] of placed) {
      if (b.asleep || !b.rig.root.visible) continue;
      let F2 = bodyFx.get(b);
      if (!F2) bodyFx.set(b, F2 = { aura: 0, ember: 0, step: 0, ash: 0, state: null });
      const isP = b === game.player, sc = isP ? 1 : scaleOf(b);
      if (!isP && b.alive() && isBoss(b)) {
        const A = U.aura, c = auraColor(b);
        F2.aura += A.rate * dt * sc;
        for (; F2.aura >= 1; F2.aura--) {
          const a = rand(0, Math.PI * 2), r = b.radius * rand(0.6, 1.6);
          moteBurst({ x: b.x + Math.cos(a) * r, y: b.y + rand(0.1, b.height), z: b.z + Math.sin(a) * r }, 1, c,
            { r: 0, speed: 0.3, lift: 0.35, life: [1.2, 2.4], size: A.size * Math.sqrt(sc), boost: 1.5, pulse: 7 });
        }
        if (b.def.ignite) {
          F2.ember += A.igniteRate * dt * sc;
          for (; F2.ember >= 1; F2.ember--) {
            const a = rand(0, Math.PI * 2), r = b.radius * rand(0.2, 1.1);
            moteBurst({ x: b.x + Math.cos(a) * r, y: b.y + rand(0, b.height * 0.8), z: b.z + Math.sin(a) * r }, 1, A.ember,
              { r: 0, speed: 0.8, lift: 2.6, life: [0.6, 1.4], size: 0.7, boost: 2.6, up: 1 });
          }
        }
      }
      // crumbling: a dissolving (or fading) body sheds ash and embers
      if (!b.alive() && b.rig.alphaK < 0.985 && b.rig.alphaK > 0.03) {
        F2.ash += 70 * dt * Math.sqrt(sc);
        for (; F2.ash >= 1; F2.ash--) {
          const a = rand(0, Math.PI * 2), r = b.radius * rand(0, 1);
          moteBurst({ x: b.x + Math.cos(a) * r, y: b.y + rand(0, b.height * 0.7), z: b.z + Math.sin(a) * r }, 1, Math.random() < 0.5 ? 0xff7a30 : 0x8a8478,
            { r: 0, speed: 0.4, lift: 1.4, life: [0.8, 1.8], size: 0.6, boost: 1.6, up: 0.8 });
        }
      }
      // dust: big bodies at speed, and the player's roll
      const speed = Math.hypot(b.vx || 0, b.vz || 0), grounded = Math.abs(b.y - groundBelow(b.x, b.y, b.z)) < 0.12;
      const D = U.stepDust;
      if (grounded && ((sc >= D.from && speed > D.speed) || (isP && b.state === PS.ROLL))) {
        F2.step -= dt;
        if (F2.step <= 0) { F2.step = D.every * (isP ? 0.6 : 1); puff(b.x + rand(-0.2, 0.2), b.y + 0.1, b.z + rand(-0.2, 0.2), U.puffs.dust, 0.3 * sc, 1.1 * sc, 0.9, null, 0.28); }
      }
      if (isP && b.state === PS.ROLL && F2.state !== PS.ROLL && grounded) for (let i = 0; i < 4; i++) puff(b.x, b.y + 0.1, b.z, U.puffs.dust, 0.3, 1.2, 0.9, null, 0.3);
      F2.state = b.state;
    }
    // a lifting portcullis grinds sparks out of its posts, at the height its bottom bar has reached
    for (let i = grinding.length - 1; i >= 0; i--) {
      const G = grinding[i], g = (world.gates || []).find(w => w.id === G.g.id) || G.g;
      G.t += dt;
      if (G.t > 4 || (g.lift !== undefined && g.lift >= 1)) { grinding.splice(i, 1); continue; }
      const k = g.lift ?? Math.min(1, G.t / 1.5), y = (g.y || 0) + k * (g.liftHeight || 3), w = (g.box ? Math.max(g.box.x1 - g.box.x0, g.box.z1 - g.box.z0) : (def => def ? def.halfZ * 2 : 6)(game.level)) / 2;
      const alongX = g.box && g.box.x1 - g.box.x0 > g.box.z1 - g.box.z0;
      for (const sgn of [-1, 1]) if (Math.random() < 0.6) {
        const at = alongX ? { x: g.x + sgn * w, y, z: g.z ?? 0 } : { x: g.x, y, z: (g.z ?? 0) + sgn * w };
        sparkBurst(at, 2, 'clash', [0, -1, 0], 0.4, 0.45);
      }
    }
    // a bonfire lit by a won zone flares up as it catches
    for (const f of (stage && stage.bonfireFires) || []) {
      if (f.group.visible && f.ultraLit === false) {
        const b = f.bonfire, y = groundBelow(b.x, (b.y || 0) + 1, b.z);
        moteBurst({ x: b.x, y: y + 0.4, z: b.z }, 140, 0xff8a30, { r: 0.4, speed: 2.4, lift: 2.4, life: [1.2, 2.6], size: 1.1, swirl: 1.8, up: 1.3 });
        flashAt({ x: b.x, y: y + 1.2, z: b.z }, 0xff9a40, 18, 14); flare({ x: b.x, y: y + 0.8, z: b.z }, 0xffc070, 2.4, 0.5);
        ultraPost.wave({ x: b.x, y: y + 0.8, z: b.z }, 0.8, 1.4);
      }
      f.ultraLit = f.group.visible;
    }
    // bolts in flight leave glowing motes
    for (const bolt of projectiles.live()) if (!(hooks.bolt && hooks.bolt(bolt))) moteBurst(bolt, 1, CONFIG.projectile.glow, { r: 0.05, speed: 0.2, lift: 0, life: [0.2, 0.4], size: 0.6, boost: 2, up: 0 });
    sparks.update(dt, cam); motes.update(dt); puffs.update(dt); updateChunks(dt);
    drops.update(dt, cam, p => { if (p.splat) visuals.blood({ x: p.x, y: p.ground + 0.05, z: p.z }, rand(0.25, 0.6), false); });
    for (const l of flashes) l.intensity *= Math.exp(-U.flash.decay * real);
    for (const f of flares) {
      if (!f.s.visible) continue;
      f.age += real; const p = f.age / f.time;
      if (p >= 1) { f.s.visible = false; continue; }
      f.s.scale.setScalar(f.size * (0.6 + 0.6 * Math.sqrt(p))); f.s.material.opacity = (1 - p) * (1 - p); f.s.material.rotation += f.spin * real;
    }
    for (const m of marks) {
      if (!m.m.visible) continue;
      m.age += real; const p = m.age / m.life;
      if (p >= 1) { m.m.visible = false; continue; }
      m.m.scale.set(m.size * (0.7 + 0.5 * p), 1, m.size * (0.7 + 0.5 * p)); m.m.material.opacity = m.peak * (1 - p) * (1 - p);
    }
  }
  Game.renderHooks.push(frameUpdate);

  return {
    on, hooks, isBoss, chest, dirOf, groundBelow, auraColor,
    sparkBurst, bloodSpray, moteBurst, puff, dustRing, flashAt, flare, mark, chunkBurst, motes, sparks, drops, fireMat, fireGeo,
    info: () => ({ sparks: sparks.count(), drops: drops.count(), motes: motes.count(), puffs: puffs.count(), chunks: chunks.length,
                   ribbons: ribbons.filter(r => r.owner).length, flashes: flashes.map(l => l.intensity),
                   fires: flames.filter(f => f.ultraFire && f.ultraFire.visible).length }),
    // For tuning in the console: spark, blood and soul bursts at the player's chest.
    test(kind = 'parry') { const c = chest(Game.player); if (kind === 'blood') bloodSpray(c, [1, 0, 0], 40, 1.2); else if (kind === 'souls') moteBurst(c, 200, 0xffd27a, { swirl: 2, lift: 2 }); else sparkBurst(c, 120, kind); },
  };
})();
