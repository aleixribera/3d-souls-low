'use strict';
// ============================================================================
// 9c. The Ultra preset: moon shadows, ambient occlusion, volumetric light, metal reflections and shockwaves.
// ============================================================================
// Drawing only, like section 9b: it reads the scene, the camera and the player's position and never changes the game.
// Plugged into visuals through its hooks (quality, stage, beforeDraw, afterDraw, resize); off, it costs nothing.
//
// Each Ultra frame:   one moon shadow map -> scene (HDR, MSAA)
//   -> a depth + normal pre-pass at `ao.scale` of the screen (no glows, sprites or particles)  ->  light buffer:
//      ambient occlusion (alpha) + in-scattered light (rgb: every near point light, analytically; the moon, ray-marched
//      through its shadow map on open-sky levels)  ->  depth-aware blur  ->  composite (shockwaves bend the image)
//   -> bloom -> tone mapping -> grade (also flash and hurt feedback; no extra lens pass).
const ultraPost = (() => {
  const U = VIS.ultra, S = U.shadows, SC = U.scatter, MAXL = SC.lights, MAXW = U.waves.max;
  const quality = () => visuals.quality();
  const budget = () => VIS.cinematic[quality().label.toLowerCase()];
  let on = false, W = 1, H = 1, moonBase = null, open = false, envTex = null, lastDef = null, sweeps = 0;
  const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();
  const sunUp = new THREE.Vector3(), sunRight = new THREE.Vector3(), sunUp2 = new THREE.Vector3(), sunCenter = new THREE.Vector3();

  // ---- lights ------------------------------------------------------------------------------------------------------
  // The moon's shadowed share: a second directional light that follows the player (its map covers `moonBox` m round them).
  const sun = new THREE.DirectionalLight(0xffffff, 0);
  sun.castShadow = true; sun.userData.ultra = true;
  sun.shadow.mapSize.set(S.moonMap, S.moonMap);
  Object.assign(sun.shadow.camera, { left: -S.moonBox, right: S.moonBox, top: S.moonBox, bottom: -S.moonBox, near: 1, far: S.moonDist * 2 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = S.bias; sun.shadow.normalBias = S.normalBias; sun.shadow.radius = S.radius;
  const owned = [sun, sun.target];   // js/ultra-fx.js adds its fixed impact light

  // ---- render targets ----------------------------------------------------------------------------------------------
  const rt = (w, h, opts = {}) => new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, ...opts });
  let gbuf = null, lightA = null, lightB = null;
  const visRT = rt(MAXL, 1);   // one texel per light: how much of it is in view (not behind a wall)
  function makeTargets() {
    for (const t of [gbuf, lightA, lightB]) if (t) { t.dispose(); if (t.depthTexture) t.depthTexture.dispose(); }
    const hw = Math.max(1, Math.round(W * budget().aoScale)), hh = Math.max(1, Math.round(H * budget().aoScale));
    gbuf = rt(hw, hh, { depthBuffer: true, depthTexture: new THREE.DepthTexture(hw, hh) });
    lightA = rt(hw, hh, { type: THREE.HalfFloatType }); lightB = rt(hw, hh, { type: THREE.HalfFloatType });
    for (const m of [lightMat, blurMat, visMat]) { m.uniforms.tDepth.value = gbuf.depthTexture; }
    lightMat.uniforms.tNormal.value = gbuf.texture;
    lightMat.uniforms.uRes.value.set(hw, hh);
    compMat.uniforms.tLight.value = lightA.texture;
    compMat.uniforms.tDepth.value = gbuf.depthTexture;
  }

  // ---- shaders -----------------------------------------------------------------------------------------------------
  const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const VIEW_POS = `vec3 viewPos(vec2 uv) {
    float d = texture2D(tDepth, uv).x;
    vec4 q = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return q.xyz / q.w;
  }`;
  const lightArrays = () => ({
    uLPos: { value: Array.from({ length: MAXL }, () => new THREE.Vector3()) },
    uLCol: { value: Array.from({ length: MAXL }, () => new THREE.Vector3()) },
    uLRange: { value: new Float32Array(MAXL) }, uLCount: { value: 0 },
  });
  // Which lights are in view: 9 depth taps round each light's spot on screen.
  const visMat = new THREE.ShaderMaterial({
    defines: { MAXL },
    uniforms: { tDepth: { value: null }, uProj: { value: camera.projectionMatrix }, uInvProj: { value: camera.projectionMatrixInverse },
                uOff: { value: SC.offscreen }, uAspect: { value: 1 }, ...lightArrays() },
    vertexShader: QUAD_VERT,
    fragmentShader: `uniform sampler2D tDepth; uniform mat4 uProj, uInvProj; uniform float uOff, uAspect;
uniform vec3 uLPos[MAXL]; uniform int uLCount;
${VIEW_POS}
void main() {
  int i = int(gl_FragCoord.x); float v = 0.0;
  if (i < uLCount) {
    vec3 lp = uLPos[i];
    vec4 c = uProj * vec4(lp, 1.0); vec2 uv = c.xy / c.w * 0.5 + 0.5;
    if (lp.z > -0.2 || uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) v = uOff;
    else {
      float r = clamp(0.3 / -lp.z, 0.004, 0.05);
      for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
        vec2 s = clamp(uv + vec2(float(x), float(y) * uAspect) * r, 0.001, 0.999);
        v += step(viewPos(s).z, lp.z + 0.7);
      }
      v /= 9.0;
    }
  }
  gl_FragColor = vec4(v, 0.0, 0.0, 1.0);
}` });
  // Ambient occlusion (alpha) and in-scattered light (rgb), at reduced size.
  const lightMat = new THREE.ShaderMaterial({
    defines: { MAXL, AO_SAMPLES: U.ao.samples, MOON_STEPS: SC.moonSteps },
    uniforms: { tDepth: { value: null }, tNormal: { value: null }, tVis: { value: visRT.texture }, tShadow: { value: null },
                uProj: { value: camera.projectionMatrix }, uInvProj: { value: camera.projectionMatrixInverse }, uInvView: { value: camera.matrixWorld },
                uShadowMat: { value: sun.shadow.matrix }, uRes: { value: new THREE.Vector2(1, 1) },
                uAoRadius: { value: U.ao.radius }, uAoBias: { value: U.ao.bias }, uMinH: { value: SC.minH }, uMaxDist: { value: SC.maxDist },
                uFog: { value: 0.02 }, uMoonOn: { value: 0 }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonCol: { value: new THREE.Vector3() },
                uMoonDist: { value: SC.moonDist }, uMoonG: { value: SC.moonG }, ...lightArrays() },
    vertexShader: QUAD_VERT,
    fragmentShader: `#include <packing>
uniform sampler2D tDepth, tNormal, tVis, tShadow;
uniform mat4 uProj, uInvProj, uInvView, uShadowMat; uniform vec2 uRes;
uniform float uAoRadius, uAoBias, uMinH, uMaxDist, uFog, uMoonOn, uMoonDist, uMoonG;
uniform vec3 uMoonDir, uMoonCol;
uniform vec3 uLPos[MAXL]; uniform vec3 uLCol[MAXL]; uniform float uLRange[MAXL]; uniform int uLCount;
varying vec2 vUv;
${VIEW_POS}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  float d = texture2D(tDepth, vUv).x;
  vec3 P = viewPos(vUv);
  bool sky = d > 0.99999;
  vec3 dir = normalize(P);
  float L = sky ? uMaxDist : min(length(P), uMaxDist);
  // ambient occlusion: a cosine-weighted spiral of taps in the hemisphere round the normal
  float ao = 1.0;
  if (!sky) {
    vec3 N = normalize(texture2D(tNormal, vUv).xyz * 2.0 - 1.0);
    float a0 = ign(gl_FragCoord.xy) * 6.2831853;
    vec3 rv = vec3(cos(a0), sin(a0), 0.37);
    vec3 T = normalize(rv - N * dot(rv, N)), B = cross(N, T);
    float occ = 0.0, rad = uAoRadius * clamp(-P.z / 3.0, 0.35, 1.0);
    for (int i = 0; i < AO_SAMPLES; i++) {
      float f = (float(i) + 0.5) / float(AO_SAMPLES), ph = float(i) * 2.3999632;
      vec3 k = vec3(cos(ph) * sqrt(f), sin(ph) * sqrt(f), sqrt(1.0 - f));
      vec3 Sp = P + (T * k.x + B * k.y + N * k.z) * rad * mix(0.12, 1.0, f * f);
      vec4 o = uProj * vec4(Sp, 1.0); vec2 suv = o.xy / o.w * 0.5 + 0.5;
      if (suv.x < 0.0 || suv.y < 0.0 || suv.x > 1.0 || suv.y > 1.0) continue;
      float sz = viewPos(suv).z;
      float range = smoothstep(0.0, 1.0, rad / max(abs(P.z - sz), 1e-3));
      occ += step(Sp.z + uAoBias, sz) * range;
    }
    ao = 1.0 - occ / float(AO_SAMPLES);
  }
  // point lights in the fog: the inverse-square glow integrated along the view ray, inside each light's reach
  vec3 sc = vec3(0.0);
  for (int i = 0; i < MAXL; i++) {
    if (i >= uLCount) break;
    vec3 lp = uLPos[i]; float R = uLRange[i];
    float tc = dot(lp, dir), h = max(length(lp - dir * tc), uMinH);
    if (h >= R) continue;
    float hl = sqrt(R * R - h * h), t0 = max(0.0, tc - hl), t1 = min(L, tc + hl);
    if (t1 <= t0) continue;
    float I = (atan((t1 - tc) / h) - atan((t0 - tc) / h)) / h, w = 1.0 - h / R;
    float vis = texture2D(tVis, vec2((float(i) + 0.5) / float(MAXL), 0.5)).r;
    sc += uLCol[i] * I * w * w * vis;
  }
  // the moon through its shadow map (open sky only): light shafts between pillars, walls and towers
  if (uMoonOn > 0.0) {
    float tMax = min(L, uMoonDist), j = ign(gl_FragCoord.xy + 31.7), lit = 0.0;
    for (int i = 0; i < MOON_STEPS; i++) {
      float t = (float(i) + j) / float(MOON_STEPS) * tMax;
      vec4 s4 = uShadowMat * (uInvView * vec4(dir * t, 1.0)); vec3 s = s4.xyz / s4.w;
      float inside = step(0.0, s.x) * step(s.x, 1.0) * step(0.0, s.y) * step(s.y, 1.0) * step(s.z, 1.0);
      float l = mix(1.0, step(s.z - 0.002, unpackRGBAToDepth(texture2D(tShadow, s.xy))), inside);
      float fk = uFog * t;
      lit += l * exp(-fk * fk);
    }
    lit *= tMax / float(MOON_STEPS);
    float g = uMoonG, ct = dot(dir, uMoonDir);
    sc += uMoonCol * lit * (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * ct, 1.5) * 0.0796;
  }
  gl_FragColor = vec4(sc, ao);
}` });
  // Depth-aware blur, run once across and once down.
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tLight: { value: null }, tDepth: { value: null }, uDir: { value: new THREE.Vector2() }, uInvProj: { value: camera.projectionMatrixInverse } },
    vertexShader: QUAD_VERT,
    fragmentShader: `uniform sampler2D tLight, tDepth; uniform vec2 uDir; uniform mat4 uInvProj; varying vec2 vUv;
${VIEW_POS}
void main() {
  float z0 = viewPos(vUv).z, s = max(-z0 * 0.04, 0.06);
  vec4 sum = vec4(0.0); float ws = 0.0;
  for (int i = -4; i <= 4; i++) {
    vec2 uv = vUv + uDir * float(i);
    float w = exp(-float(i * i) * 0.18) * exp(-abs(viewPos(uv).z - z0) / s);
    sum += texture2D(tLight, uv) * w; ws += w;
  }
  gl_FragColor = sum / max(ws, 1e-4);
}` });
  // Composite: the shockwaves bend the image, then occlusion darkens it (not what glows) and the scattered light adds.
  const compMat = new THREE.ShaderMaterial({
    defines: { MAXW },
    uniforms: { tDiffuse: { value: null }, tLight: { value: null }, tDepth: { value: null },
                uInvProj: { value: camera.projectionMatrixInverse }, uInvView: { value: camera.matrixWorld },
                uMist: { value: 0 }, uMistColor: { value: new THREE.Color() }, uMistBase: { value: 0 },
                uAoStr: { value: U.ao.strength }, uAoPow: { value: U.ao.power },
                uBright: { value: new THREE.Vector2(...U.ao.keepBright) }, uAspect: { value: 1 }, uWaveW: { value: U.waves.width },
                uWaves: { value: Array.from({ length: MAXW }, () => new THREE.Vector4()) } },
    vertexShader: QUAD_VERT,
    fragmentShader: `uniform sampler2D tDiffuse, tLight, tDepth; uniform float uAoStr, uAoPow, uAspect, uWaveW; uniform vec2 uBright;
uniform mat4 uInvProj, uInvView; uniform float uMist, uMistBase; uniform vec3 uMistColor;
uniform vec4 uWaves[MAXW]; varying vec2 vUv;
${VIEW_POS}
void main() {
  vec2 uv = vUv;
  for (int i = 0; i < MAXW; i++) {
    vec4 w = uWaves[i];
    if (w.w <= 0.0) continue;
    vec2 d = (vUv - w.xy) * vec2(uAspect, 1.0); float r = length(d), x = (r - w.z) / uWaveW;
    uv -= d / max(r, 1e-4) / vec2(uAspect, 1.0) * w.w * x * exp(-x * x);
  }
  vec3 c = texture2D(tDiffuse, uv).rgb; vec4 l = texture2D(tLight, uv);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c *= mix(1.0, pow(clamp(l.a, 0.0, 1.0), uAoPow), uAoStr * (1.0 - smoothstep(uBright.x, uBright.y, lum)));
  // Analytically integrate a ground-hugging exponential layer along the ray.
  // The existing depth buffer stops it at walls, bodies and floors; no extra pass.
  vec3 p = viewPos(uv), wp = (uInvView * vec4(p, 1.0)).xyz;
  float h0 = max(uInvView[3].y - uMistBase, 0.0) / ${VIS.cinematic.mist.height};
  float h1 = max(wp.y - uMistBase, 0.0) / ${VIS.cinematic.mist.height};
  float dh = h1 - h0;
  float integral = abs(dh) < 0.001 ? exp(-h0) : (exp(-h0) - exp(-h1)) / dh;
  float mist = min(${VIS.cinematic.mist.max}, 1.0 - exp(-uMist * min(length(p), ${VIS.cinematic.mist.distance.toFixed(1)}) * integral));
  gl_FragColor = vec4(mix(c + l.rgb, uMistColor, mist), 1.0);
}` });
  const quad = new FullScreenQuad(null);
  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); quad.render(renderer); };

  // ---- the depth pre-pass: what it leaves out (glows, sprites, particles, swaying grass and banners) ---------------
  const normalMat = new THREE.MeshNormalMaterial();
  let noDepth = [], extraLights = [];
  const sceneRoots = [];   // rigs and pooled effects attach at the scene root; compare references, not only their count
  const rootCounts = [];   // projectile looks / glows can also be added inside their pooled root
  const hidden = [], clearColor = new THREE.Color();
  const lit = m => m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial);
  function sweep() {   // only when scene membership changes or a stage / quality change explicitly requests it
    sweeps++;
    noDepth = []; extraLights = [];
    reflected.clear();
    sceneRoots.length = rootCounts.length = 0;
    for (const o of scene.children) { sceneRoots.push(o); rootCounts.push(o.children.length); }
    const stageLights = new Set(visuals.lights());
    scene.traverse(o => {
      if (o.isPointLight) { if (!o.userData.ultra && !stageLights.has(o)) extraLights.push(o); return; }
      if (!(o.isMesh || o.isPoints || o.isSprite || o.isLine)) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (o.isSprite || o.isPoints || o.isLine || o.userData.noDepth || !m || (m.transparent && !m.depthWrite) || m.blending === THREE.AdditiveBlending) {
        noDepth.push(o); return;
      }
      if (!lit(m)) return;
      o.userData.ultraShadow = true;
      o.receiveShadow = quality().shadows;
      o.castShadow = quality().shadows && m !== MAT.ceiling && !(o.isInstancedMesh && m.side === THREE.DoubleSide && !m.alphaTest);
      reflect(m);
    });
  }
  // Metal reflections: the level's environment on every metallic material (armour, weapons, iron).
  const reflected = new Set();
  function reflect(m) {
    if (!quality().reflections || !m.isMeshStandardMaterial || (!m.userData.weathered && m.metalness < U.env.metalFrom) || !envTex) return;
    reflected.add(m);
    if (m.envMap === envTex) return;
    if (!m.envMap) m.needsUpdate = true;
    m.envMap = envTex; m.envMapIntensity = m.userData.weathered ? VIS.cinematic.surface.environment : U.env.intensity;
  }
  function unreflect() { for (const m of reflected) { m.envMap = null; m.needsUpdate = true; } reflected.clear(); }
  // The environment: a dim sphere of the level's fog and moonlight, with warm fire low round the horizon (and the sun).
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envTarget = null;
  function buildEnv(def) {
    const A = { ...DEFAULT_ATMOSPHERE, ...(def.atmosphere || {}) }, fog = new THREE.Color(A.fog), moon = new THREE.Color(A.moon.color).multiplyScalar(A.moon.intensity * 0.35);
    const sky = A.sky || null, sunDir = new THREE.Vector3(...(sky ? sky.sunDir : [0.4, 0.15, -0.6])).normalize();
    const mat = new THREE.ShaderMaterial({ side: THREE.BackSide,
      uniforms: { uTop: { value: fog.clone().multiplyScalar(1.4).add(moon) }, uHor: { value: fog.clone().multiplyScalar(2.2).addScalar(0.04) },
                  uBot: { value: fog.clone().multiplyScalar(0.35) }, uFire: { value: new THREE.Color(U.env.fire).multiplyScalar(1.6) },
                  uSun: { value: new THREE.Color(sky ? sky.sun : U.env.fire).multiplyScalar(sky ? 6 : 1.5) }, uSunDir: { value: sunDir } },
      vertexShader: 'varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uTop, uHor, uBot, uFire, uSun, uSunDir; varying vec3 vD;
void main() {
  vec3 d = normalize(vD);
  vec3 c = d.y > 0.0 ? mix(uHor, uTop, smoothstep(0.0, 0.7, d.y)) : mix(uHor, uBot, smoothstep(0.0, 0.4, -d.y));
  float az = atan(d.z, d.x);
  c += uFire * pow(max(0.0, sin(az * 3.0 + 0.7)), 10.0) * exp(-abs(d.y + 0.05) * 7.0);
  c += uSun * (pow(max(dot(d, uSunDir), 0.0), 40.0) + 0.15 * pow(max(dot(d, uSunDir), 0.0), 4.0));
  gl_FragColor = vec4(c, 1.0);
}` });
    const envScene = new THREE.Scene(), ball = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), mat);
    envScene.add(ball);
    const next = pmrem.fromScene(envScene, 0, 0.1, 50);
    ball.geometry.dispose(); mat.dispose();
    if (envTarget) envTarget.dispose();
    envTarget = next; envTex = next.texture;
    for (const m of reflected) m.envMap = envTex;
  }

  // ---- screen pulses: shockwaves, flash, hurt ----------------------------------------------------------------------------
  const waves = [];   // { x, y, z, age, k, size }
  const pulse = { flash: 0, hurt: 0, flashColor: new THREE.Color(1, 1, 1) };

  // ---- the light pass, after the scene render ------------------------------------------------------------------------
  class UltraLightPass extends Pass {
    constructor() { super(); this.needsSwap = true; }
    render(r, writeBuffer, readBuffer) {
      // 1. depth + normals, without what glows or sways; a dissolving body leaves no occlusion behind
      hidden.length = 0;
      for (const o of noDepth) if (o.visible) { o.visible = false; hidden.push(o); }
      for (const e of Game.enemies) if (e.rig.root.visible && e.rig.alphaK < 0.99) { e.rig.root.visible = false; hidden.push(e.rig.root); }
      const bg = scene.background, override = scene.overrideMaterial, clearA = r.getClearAlpha();
      r.getClearColor(clearColor);
      scene.background = null; scene.overrideMaterial = normalMat;
      try { r.setRenderTarget(gbuf); r.setClearColor(0x8080ff, 1); r.clear(); r.render(scene, camera); }
      finally {
        scene.overrideMaterial = override; scene.background = bg; r.setClearColor(clearColor, clearA);
        for (const o of hidden) o.visible = true;
      }
      // 2. light visibility, 3. occlusion + scattered light, 4. blur, 5. composite
      if (quality().volumetrics) pass(visMat, visRT);
      pass(lightMat, lightA);
      blurMat.uniforms.tLight.value = lightA.texture; blurMat.uniforms.uDir.value.set(1 / lightA.width, 0); pass(blurMat, lightB);
      blurMat.uniforms.tLight.value = lightB.texture; blurMat.uniforms.uDir.value.set(0, 1 / lightA.height); pass(blurMat, lightA);
      compMat.uniforms.tDiffuse.value = readBuffer.texture;
      pass(compMat, this.renderToScreen ? null : writeBuffer);
    }
  }
  const lightPass = new UltraLightPass();
  lightPass.enabled = false;
  visuals.composer.insertPass(lightPass, 1);   // right after the scene render, before bloom

  // ---- per frame ------------------------------------------------------------------------------------------------------
  const lightList = [], lightSlots = [];   // lightSlots: reused records, so a frame allocates nothing
  const byScore = (a, b) => b.score - a.score;
  function consider(l, k) {
    if (!l.visible || !(l.intensity > 0)) return;
    for (let a = l.parent; a; a = a.parent) if (!a.visible) return;
    l.getWorldPosition(v3);
    const R = Math.min(l.distance > 0 ? l.distance : 14, 16) * SC.reach, d2 = v3.distanceToSquared(camera.position);
    if (d2 > (R + SC.maxDist) ** 2) return;
    const L = lightSlots[lightList.length] || (lightSlots[lightList.length] = { x: 0, y: 0, z: 0, R: 0, col: null, I: 0, score: 0 });
    L.x = v3.x; L.y = v3.y; L.z = v3.z; L.R = R; L.col = l.color; L.I = l.intensity * k; L.score = l.intensity * R * R / (d2 + 4);
    lightList.push(L);
  }
  // The lights glowing in the fog this frame: the stage's lit ones and any effect lights, the most striking first.
  function gatherLights() {
    lightList.length = 0;
    const k = SC.light * (scene.fog ? scene.fog.density : SC.fogRef) / SC.fogRef;
    for (const l of visuals.lights()) consider(l, k);
    for (const l of extraLights) consider(l, k);
    for (const l of owned) if (l.isPointLight && l.userData.flash) consider(l, k);
    lightList.sort(byScore);
    const n = quality().volumetrics ? Math.min(MAXL, lightList.length) : 0, view = camera.matrixWorldInverse;
    for (const M of [lightMat, visMat]) M.uniforms.uLCount.value = n;
    for (let i = 0; i < n; i++) {
      const L = lightList[i];
      v3.set(L.x, L.y, L.z).applyMatrix4(view);
      lightMat.uniforms.uLPos.value[i].copy(v3); visMat.uniforms.uLPos.value[i].copy(v3);
      lightMat.uniforms.uLCol.value[i].set(L.col.r * L.I, L.col.g * L.I, L.col.b * L.I);
      lightMat.uniforms.uLRange.value[i] = L.R;
    }
  }
  // The moon's shadowed share follows the player, snapped to whole shadow texels so its edges never crawl.
  function placeSun() {
    if (moonBase === null) moonBase = moonLight.intensity;
    const share = open ? S.share.open : S.share.roofed;
    sun.color.copy(moonLight.color); sun.intensity = moonBase * share; moonLight.intensity = moonBase * (1 - share);
    const p = Game.player || camera.position, dir = v3b.copy(moonLight.position).normalize();
    const texel = 2 * S.moonBox / sun.shadow.mapSize.x, up = Math.abs(dir.y) > 0.99 ? sunUp.set(1, 0, 0) : sunUp.set(0, 1, 0);
    const right = sunRight.crossVectors(up, dir).normalize(), up2 = sunUp2.crossVectors(dir, right);
    const c = sunCenter.set(p.x, p.y + 1, p.z);
    const a = Math.round(c.dot(right) / texel) * texel, b = Math.round(c.dot(up2) / texel) * texel, f = c.dot(dir);
    c.copy(right).multiplyScalar(a).addScaledVector(up2, b).addScaledVector(dir, f);
    sun.target.position.copy(c); sun.position.copy(c).addScaledVector(dir, S.moonDist);
    sun.target.updateMatrixWorld();
  }
  function decay(dt) {
    const D = U.lens.decay;
    pulse.flash = Math.max(0, pulse.flash - pulse.flash * D.flash * dt - 0.01 * dt);
    pulse.hurt = Math.max(0, pulse.hurt - pulse.hurt * D.hurt * dt - 0.01 * dt);
    const L = visuals.passes.grade.uniforms;
    L.uFlash.value = pulse.flash; L.uFlashCol.value.copy(pulse.flashColor); L.uHurt.value = Math.max(pulse.hurt, visuals.lowHealth() * 0.35);
    // shockwaves: each frame re-projected, so they stay on the spot they started from (dropped once motion is reduced)
    const Wv = U.waves, list = compMat.uniforms.uWaves.value;
    if (waves.length && reducedMotion()) waves.length = 0;
    for (let i = waves.length - 1; i >= 0; i--) if ((waves[i].age += dt) >= Wv.time) waves.splice(i, 1);
    for (let i = 0; i < MAXW; i++) {
      const w = waves[i];
      if (!w) { list[i].set(0, 0, 0, 0); continue; }
      v3.set(w.x, w.y, w.z).project(camera);
      const p = w.age / Wv.time;
      if (v3.z > 1) { list[i].set(0, 0, 0, 0); continue; }
      list[i].set(v3.x * 0.5 + 0.5, v3.y * 0.5 + 0.5, Wv.size * w.size * (0.08 + 0.92 * Math.sqrt(p)), Wv.strength * w.k * (1 - p) * (1 - p));
    }
  }

  function setQuality(q) {
    const b = budget();
    if (q.shadows && sun.shadow.mapSize.x !== b.shadowMap) {
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      sun.shadow.mapSize.set(b.shadowMap, b.shadowMap);
    }
    if (lightMat.defines.AO_SAMPLES !== b.aoSamples) {
      lightMat.defines.AO_SAMPLES = b.aoSamples; lightMat.needsUpdate = true;
    }
    on = q.ao || q.volumetrics || q.refraction;
    lightPass.enabled = on;
    lightMat.uniforms.uAoRadius.value = q.ao ? U.ao.radius : 0;
    // Clear previous Ultra scattering when switching to High in the same scene.
    if (!q.volumetrics) lightMat.uniforms.uLCount.value = 0;
    compMat.uniforms.uAoStr.value = q.ao ? U.ao.strength : 0;
    waves.length = 0;
    pulse.flash = pulse.hurt = 0;
    visuals.passes.grade.uniforms.uFlash.value = visuals.passes.grade.uniforms.uHurt.value = 0;
    renderer.shadowMap.enabled = q.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = !q.shadows;
    RIM.strength.value = VIS.rim.strength * (q.shadows ? U.rim : 1);
    for (const l of owned) { if (l.isPointLight ? q.combatFx : q.shadows) scene.add(l); else scene.remove(l); }
    if (!q.shadows) { if (moonBase !== null) moonLight.intensity = moonBase; for (const e of [...(Game.enemies || []), ...Game.allies()]) if (e && e.rig) e.rig.shadow.material.opacity = 0.45 * e.rig.alphaK; }
    if (!q.reflections) unreflect();
    const aniso = q.shadows ? renderer.capabilities.getMaxAnisotropy() : Math.min(8, renderer.capabilities.getMaxAnisotropy());
    for (const t of Object.values(SURF_TEX)) { t.anisotropy = aniso; t.needsUpdate = true; }
    scene.traverse(o => {
      if (o.userData.legacyEffectLight) o.visible = false;
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) m.needsUpdate = true;
    });   // shadows in or out of every shader
    if (q.reflections && lastDef && !envTex) buildEnv(lastDef);
    sweep();
  }

  visuals.hooks.quality.push(setQuality);
  visuals.hooks.resize.push((w, h) => {
    W = w; H = h;
    if (on) makeTargets();
    else if (gbuf) {
      for (const t of [gbuf, lightA, lightB]) { t.dispose(); if (t.depthTexture) t.depthTexture.dispose(); }
      gbuf = lightA = lightB = null;
    }
    compMat.uniforms.uAspect.value = visMat.uniforms.uAspect.value = w / h;
  });
  visuals.hooks.stage.push(def => {
    moonBase = moonLight.intensity; open = !!(def.atmosphere && def.atmosphere.sky);
    if (lastDef !== def) { if (envTarget) envTarget.dispose(); envTarget = envTex = null; }
    lastDef = def;
    reflected.clear();   // release materials belonging to disposed stages and rigs
    if (quality().reflections && !envTex) buildEnv(def);
    sweep();
    waves.length = 0;
  });
  visuals.hooks.beforeDraw.push(() => {
    const dt = effectSlots.real(), q = quality();
    if (!on && !q.reflections && !q.shadows && !q.combatFx) return;
    if (q.reflections && !envTex && lastDef) buildEnv(lastDef);
    let changed = sceneRoots.length !== scene.children.length;
    for (let i = 0; !changed && i < sceneRoots.length; i++) { const o = scene.children[i]; changed = o !== sceneRoots[i] || o.children.length !== rootCounts[i]; }
    // Spectral weapons attach inside a rig. Track that small socket too so new glows / lights are classified once.
    const allies = Game.allies();
    for (let i = 0, n = allies.length + Game.enemies.length; i < n; i++) {
      const b = i < allies.length ? allies[i] : Game.enemies[i - allies.length];
      if (!b || !b.rig) continue;
      const R = b.rig, count = R.weapon.children.length;
      if (R.ultraWeaponChildren !== count) { R.ultraWeaponChildren = count; changed = true; }
    }
    if (changed) sweep();
    if (q.combatFx) decay(dt);
    if (!q.shadows && !on) return;
    if (q.shadows) placeSun();
    if (q.volumetrics) gatherLights();
    // dissolving bodies cast no shadow (the shadow pass cannot see the dissolve); the blob shadow keeps a little contact
    for (let i = 0, n = allies.length + Game.enemies.length; i < n; i++) {
      const b = i < allies.length ? allies[i] : Game.enemies[i - allies.length];
      if (!b || !b.rig) continue;
      const R = b.rig, castNow = R.alphaK > 0.99;
      if (R.ultraCast !== castNow) { R.root.traverse(o => { if (o.isMesh && o.userData.ultraShadow) o.castShadow = q.shadows && castNow; }); R.ultraCast = castNow; }
      R.shadow.material.opacity = 0.45 * R.alphaK * (q.shadows ? S.blob : 1);
    }
    // the moon's rays: on open-sky levels, through its shadow map
    const L = lightMat.uniforms, map = sun.shadow.map;
    compMat.uniforms.uMist.value = open ? budget().mist : 0;
    compMat.uniforms.uMistColor.value.copy(scene.fog.color).multiplyScalar(1.35);
    compMat.uniforms.uMistBase.value = lastDef?.spawn?.y || 0;
    L.uMoonOn.value = q.volumetrics && q.shadows && open && map ? 1 : 0;
    if (map) L.tShadow.value = map.texture;
    L.uMoonDir.value.copy(moonLight.position).normalize().transformDirection(camera.matrixWorldInverse);
    const mk = SC.moon * (scene.fog ? scene.fog.density : SC.fogRef) / SC.fogRef * moonBase;
    L.uMoonCol.value.set(sun.color.r * mk, sun.color.g * mk, sun.color.b * mk);
    L.uFog.value = scene.fog ? scene.fog.density : 0;
    renderer.shadowMap.needsUpdate = q.shadows;
  });

  return {
    on: () => on,
    // A light of js/ultra-fx.js: in the scene only while Ultra is on (`flash` lights also glow in the fog).
    own(light) { light.userData.ultra = true; owned.push(light); if (quality().combatFx) scene.add(light); },
    // A shockwave from world point p: k its strength (1 = a heavy blow), size its reach on screen. None with reduced motion.
    wave(p, k = 1, size = 1) { if (!quality().refraction || reducedMotion()) return; waves.push({ x: p.x, y: p.y, z: p.z, age: 0, k, size }); if (waves.length > MAXW) waves.shift(); },
    // A full-screen flash (of `color`) and / or hurt vignette, 0..1. Reduced motion keeps a subtle share of each.
    pulse({ flash = 0, color = 0xffffff, hurt = 0 } = {}) {
      if (!quality().combatFx) return;
      if (reducedMotion()) { flash *= VIS.reducedMotion.flash; hurt *= VIS.reducedMotion.hurt; }
      pulse.hurt = Math.min(1, Math.max(pulse.hurt, hurt));
      if (flash > pulse.flash) { pulse.flash = flash; pulse.flashColor.set(color); }
    },
    // Tests: whether an object is kept out of the depth / normal pre-pass (glows, particles, lightning).
    excluded: o => noDepth.includes(o),
    info: () => ({ on, lights: lightList.length, noDepth: noDepth.length, reflected: reflected.size, waves: waves.length,
                   shadowSize: sun.shadow.mapSize.x, aoSamples: lightMat.defines.AO_SAMPLES,
                   scatteringLights: lightMat.uniforms.uLCount.value, bufferSize: gbuf ? [gbuf.width, gbuf.height] : null,
                   sweeps, sun: quality().shadows ? sun.intensity : 0, shadows: renderer.shadowMap.enabled,
                   ao: quality().ao, volumetrics: quality().volumetrics, reflections: quality().reflections }),
  };
})();
