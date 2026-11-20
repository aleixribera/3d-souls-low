'use strict';
// ============================================================================
// The art style exploration (PLAN.md item 4): one of STYLE_DEFS (js/data/styles.js), chosen when the page loads with
// `?style=<id>`. Without it (every player's page) this file does nothing.
// ============================================================================
// Drawing only: it reads the scene and the camera and never changes the game. Two parts:
//   shade  every lit material's light (standard, lambert, phong) reshaped where three.js writes the pixel
//          (ShaderChunk.opaque_fragment, patched before the first shader compiles): cel bands, or a soft shoulder.
//   post   a screen pass after the scene (and the Normal/Ultra light pass), before bloom and the grade: a depth + normal
//          pre-pass of the solid scene, then ink lines, distance haze, a rim light and a Kuwahara brush, as the style asks.
const styleLab = (() => {
  const id = (() => { try { return new URLSearchParams(location.search).get('style'); } catch (e) { return null; } })();
  const S = STYLE_DEFS.find(s => s.id === id) || null;
  const lab = { style: S ? S.id : null, def: S, frames: 0, hidden: 0, skipped: [] };
  if (!S) return lab;
  const f = v => (Number.isInteger(v) ? v.toFixed(1) : String(v));
  const v3 = a => `vec3(${a.map(f).join(', ')})`;

  // ---- shade --------------------------------------------------------------------------------------------------------
  // `light`: what the surface's own colour was multiplied by (all lights, specular and glow in), per channel; `L` its
  // strongest channel. The new level replaces L and keeps the light's hue.
  if (S.shade) {
    let level;
    if (S.shade === 'bands') {
      const B = S.bands;
      level = `float b = ${f(B.level[0])};\n` + B.at.slice(1).map((a, i) =>
        `  b = mix(b, ${f(B.level[i + 1])}, smoothstep(${f(a - B.soft)}, ${f(a + B.soft)}, L));`).join('\n') +
        `\n  b = mix(b, L, smoothstep(${f(B.keep)}, ${f(B.keep + 0.3)}, L));   // glows stay glows`;
    } else level = `float b = L / (L + ${f(S.knee)}) * ${f(1 + S.knee)};`;
    THREE.ShaderChunk.common += `
vec3 artShade(vec3 o, vec3 albedo) {
  vec3 light = o / max(albedo, vec3(0.04));
  float L = max(max(light.r, light.g), light.b);
  ${level}
  return o * (b / max(L, 1e-4));
}
`;
    THREE.ShaderChunk.opaque_fragment = `#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
outgoingLight = artShade(outgoingLight, diffuseColor.rgb);
#endif
` + THREE.ShaderChunk.opaque_fragment;
  }
  // Flat colour: a lit surface's texture read from a small mip (its average colour round the point), with `keep` of
  // the sharp read left in, so grime and noise in the game's textures stop breaking up flat areas. The weathered stone
  // (js/visuals.js WEATHER_FRAG) draws its grain itself and keeps `keep` of it (ART_DETAIL).
  if (S.flat) {
    const read = 'texture2D( map, vMapUv )';
    if (!THREE.ShaderChunk.map_fragment.includes(read)) throw new Error('style-lab: three.js map_fragment changed');
    THREE.ShaderChunk.map_fragment = THREE.ShaderChunk.map_fragment.replace(read, `artMap( ${read}, texture2D( map, vMapUv, ${f(S.flat.bias)} ) )`);
    THREE.ShaderChunk.common += `
#define ART_DETAIL ${f(S.flat.keep)}
vec4 artMap(vec4 sharp, vec4 blurred) {
#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
  return mix(blurred, sharp, ${f(S.flat.keep)});
#else
  return sharp;
#endif
}
`;
  }
  if (!S.post) return lab;

  // ---- post ---------------------------------------------------------------------------------------------------------
  const P = S.post, defines = {};
  if (P.ink) Object.assign(defines, { INK: '', INK_DEPTH: f(P.ink.depth), INK_WIDTH: f(P.ink.width), INK_COLOR: f(P.ink.color), INK_FADE: f(P.ink.fade) });
  if (P.ink && P.ink.fold) Object.assign(defines, { INK_FOLD: f(P.ink.fold) });
  if (P.haze) Object.assign(defines, { HAZE: '', HAZE_FROM: f(P.haze.from), HAZE_TO: f(P.haze.to), HAZE_COLOR: v3(P.haze.color), HAZE_AMOUNT: f(P.haze.amount) });
  if (P.rim) Object.assign(defines, { RIM: '', RIM_COLOR: v3(P.rim.color), RIM_POWER: f(P.rim.power), RIM_STRENGTH: f(P.rim.strength), RIM_NEAR: f(P.rim.near) });
  if (P.brush) Object.assign(defines, { BRUSH: '', BRUSH_R: String(P.brush.radius), BRUSH_WOBBLE: f(P.brush.wobble), BRUSH_CANVAS: f(P.brush.canvas) });
  if (P.tint) defines.TINT = v3(P.tint);
  defines.SAT = f(P.sat ?? 1); defines.EXPOSURE = f(P.exposure ?? 1);
  const mat = new THREE.ShaderMaterial({
    defines, depthTest: false, depthWrite: false,
    uniforms: { tColor: { value: null }, tDepth: { value: null }, tNormal: { value: null }, uPx: { value: new THREE.Vector2() },
                uGPx: { value: new THREE.Vector2() }, uNear: { value: 0.1 }, uFar: { value: 200 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tColor, tDepth, tNormal; uniform vec2 uPx, uGPx; uniform float uNear, uFar; varying vec2 vUv;
// 1 / view depth, which is affine in the depth buffer's value: flat on a plane, so its second difference finds edges.
float invZ(vec2 uv) { float d = texture2D(tDepth, uv).x; return (uFar - d * (uFar - uNear)) / (uNear * uFar); }
vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), u = fract(p); u = u * u * (3.0 - 2.0 * u);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
#ifdef BRUSH
// Kuwahara: the mean of whichever of the four corner windows round the pixel varies least (by compressed luminance).
vec3 brush(vec2 uv) {
  vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
  vec4 s = vec4(0.0), q = vec4(0.0);
  for (int j = -BRUSH_R; j <= BRUSH_R; j++) for (int i = -BRUSH_R; i <= BRUSH_R; i++) {
    vec3 c = texture2D(tColor, uv + vec2(float(i), float(j)) * uPx).rgb;
    float l = dot(c / (1.0 + c), vec3(0.299, 0.587, 0.114));
    if (i <= 0 && j <= 0) { m0 += c; s.x += l; q.x += l * l; }
    if (i >= 0 && j <= 0) { m1 += c; s.y += l; q.y += l * l; }
    if (i <= 0 && j >= 0) { m2 += c; s.z += l; q.z += l * l; }
    if (i >= 0 && j >= 0) { m3 += c; s.w += l; q.w += l * l; }
  }
  float n = float((BRUSH_R + 1) * (BRUSH_R + 1));
  vec4 v = q / n - (s / n) * (s / n);
  vec3 c = m0; float best = v.x;
  if (v.y < best) { best = v.y; c = m1; }
  if (v.z < best) { best = v.z; c = m2; }
  if (v.w < best) { c = m3; }
  return c / n;
}
#endif
void main() {
  vec2 uv = vUv;
#ifdef BRUSH
  vec2 px = uv / uPx;
  uv += (vec2(noise(px / 23.0), noise(px / 23.0 + 17.3)) - 0.5) * BRUSH_WOBBLE * uPx;
  vec3 c = brush(uv);
  c *= 1.0 + (noise(px / 7.0) - 0.5) * BRUSH_CANVAS * 2.0 + (noise(vec2(px.x / 3.0, px.y / 40.0)) - 0.5) * BRUSH_CANVAS;   // canvas
#else
  vec3 c = texture2D(tColor, uv).rgb;
#endif
  float w0 = invZ(vUv), z = 1.0 / w0;
#ifdef HAZE
  c = mix(c, HAZE_COLOR, smoothstep(HAZE_FROM, HAZE_TO, z) * HAZE_AMOUNT);
#endif
#ifdef RIM
  vec3 nr = nrm(vUv);   // edge-on surfaces that stand up (not the floor), near
  float rim = pow(1.0 - clamp(nr.z, 0.0, 1.0), RIM_POWER) * (1.0 - smoothstep(0.35, 0.75, nr.y)) * (1.0 - smoothstep(RIM_NEAR * 0.7, RIM_NEAR, z));
  c += RIM_COLOR * rim * RIM_STRENGTH;
#endif
#ifdef INK
  vec2 o = uGPx * INK_WIDTH;
  float e = max(abs(invZ(vUv - vec2(o.x, 0.0)) + invZ(vUv + vec2(o.x, 0.0)) - 2.0 * w0),
                abs(invZ(vUv - vec2(0.0, o.y)) + invZ(vUv + vec2(0.0, o.y)) - 2.0 * w0)) / w0;
  float ink = smoothstep(INK_DEPTH, INK_DEPTH * 2.0, e);
#ifdef INK_FOLD
  vec3 n0 = nrm(vUv);
  float fold = max(max(1.0 - dot(n0, nrm(vUv - vec2(o.x, 0.0))), 1.0 - dot(n0, nrm(vUv + vec2(o.x, 0.0)))),
                   max(1.0 - dot(n0, nrm(vUv - vec2(0.0, o.y))), 1.0 - dot(n0, nrm(vUv + vec2(0.0, o.y)))));
  ink = max(ink, smoothstep(INK_FOLD, INK_FOLD * 1.5, fold));
#endif
  c = mix(c, c * INK_COLOR, ink * (1.0 - smoothstep(INK_FADE * 0.6, INK_FADE, z)));
#endif
  c *= EXPOSURE;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
#ifdef TINT
  c *= mix(TINT, vec3(1.0), smoothstep(0.0, 0.2, l / (1.0 + l)));   // coloured shadows
#endif
  c = max(mix(vec3(l), c, SAT), 0.0);
  gl_FragColor = vec4(c, 1.0);
}`,
  });
  const quad = new FullScreenQuad(mat);
  const normalMat = new THREE.MeshNormalMaterial();
  const clearColor = new THREE.Color(), flatNormal = new THREE.Color().setRGB(0.5, 0.5, 1, THREE.LinearSRGBColorSpace);   // (0, 0, 1): facing the camera
  let gbuf = null;
  // What the pre-pass leaves out: glows, particles, sprites, lines, and anything that writes no depth or shows through.
  // Unlike js/ultra-post.js it keeps solid `noDepth` meshes (a realm's floor): an edge or the haze needs every surface.
  // Found again every 20 frames into the same array, since effects come and go.
  const skip = [], hidden = [];
  let since = Infinity;
  const consider = o => {
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
    if (o.isSprite || o.isPoints || o.isLine || !m || m.depthWrite === false
        || (m.transparent && m.opacity < 0.99) || m.blending === THREE.AdditiveBlending) skip.push(o);
  };
  class StylePass extends Pass {
    constructor() { super(); this.needsSwap = true; }
    render(r, writeBuffer, readBuffer) {
      const w = Math.max(1, Math.round(readBuffer.width * P.prepass)), h = Math.max(1, Math.round(readBuffer.height * P.prepass));
      if (!gbuf || gbuf.width !== w || gbuf.height !== h) {
        if (gbuf) { gbuf.depthTexture.dispose(); gbuf.dispose(); }
        gbuf = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true, depthTexture: new THREE.DepthTexture(w, h) });
        mat.uniforms.tDepth.value = gbuf.depthTexture; mat.uniforms.tNormal.value = gbuf.texture;
      }
      if (++since > 20) { since = 0; skip.length = 0; scene.traverse(consider); }
      hidden.length = 0;
      for (const o of skip) if (o.visible) { o.visible = false; hidden.push(o); }
      const bg = scene.background, override = scene.overrideMaterial, clearA = r.getClearAlpha();
      r.getClearColor(clearColor);
      scene.background = null; scene.overrideMaterial = normalMat;
      try { r.setRenderTarget(gbuf); r.setClearColor(flatNormal, 1); r.clear(); r.render(scene, camera); }
      finally {
        scene.overrideMaterial = override; scene.background = bg; r.setClearColor(clearColor, clearA);
        for (const o of hidden) o.visible = true;
      }
      lab.hidden = hidden.length; lab.frames++; lab.skipped = skip;
      const U = mat.uniforms;
      U.tColor.value = readBuffer.texture; U.uPx.value.set(1 / readBuffer.width, 1 / readBuffer.height); U.uGPx.value.set(1 / w, 1 / h);
      U.uNear.value = camera.near; U.uFar.value = camera.far;
      r.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      quad.render(r);
    }
  }
  // After the scene and the light pass (js/ultra-post.js puts it at 1), before bloom and the grade.
  const passes = visuals.composer.passes, at = passes.findIndex(p => p === visuals.passes.bloom);
  visuals.composer.insertPass(new StylePass(), at < 0 ? 1 : at);
  return lab;
})();
