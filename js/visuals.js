'use strict';
// ============================================================================
// 9b. Visuals: surfaces, mood, post-processing, atmosphere and dressing (rendering only)
// ============================================================================
// Everything in this section only draws. It reads positions and state, reacts to events (see
// registerVisualListeners) and never changes combat, AI, collision or level layout: dressing has no
// collision and stays clear of gates, doorways, alcove openings and bonfires. Numbers live in
// CONFIG.VISUALS; per-level looks are optional `atmosphere` fields, checked at load by checkVisualData.
const VIS = CONFIG.VISUALS;
const vTime = { value: 0 };                                  // shared shader clock (s)
const SURF = { moss: { value: 1 }, grime: { value: 1 } };    // per-level weathering multipliers
const RIM = { color: { value: new THREE.Color() }, strength: { value: VIS.rim.strength } };
const PT_SCALE = { value: 500 };                             // point sprites: pixels per metre at 1 m away
const FOG_D = { value: 0.02 };                               // current fog density, for custom shaders
const COLOR_OUT = '#include <tonemapping_fragment>\n#include <colorspace_fragment>';
const ATMOSPHERE_KEYS = ['background', 'fog', 'fogDensity', 'moon', 'ambient', 'hemi', 'exposure', 'ash', 'dust', 'rim',
  'grade', 'surface', 'shafts', 'banners', 'debris', 'sky', 'silhouettes', 'grass', 'landmark', 'embers'];

// Optional look fields, checked at load (called from validateData).
function checkVisualData(need, num) {
  const isCol = v => Number.isInteger(v) && v >= 0 && v <= 0xffffff;
  const tri = v => Array.isArray(v) && v.length === 3 && v.every(num);
  const amount = (v, max = 2) => num(v) && v >= 0 && v <= max;
  const Q = VIS.quality;
  need(Q && Q.high && Q.low, 'CONFIG.VISUALS.quality needs "high" and "low" presets.');
  if (Q && Q.high) for (const [n, q] of Object.entries(Q)) {   // every preset lists the same keys
    for (const k of Object.keys(Q.high)) need(k in q, `CONFIG.VISUALS.quality.${n} is missing "${k}".`);
    for (const k of Object.keys(q)) need(k in Q.high, `CONFIG.VISUALS.quality.${n}: unknown key "${k}" (not in "high").`);
  }
  for (const [n, q] of Object.entries(Q || {}))
    need(num(q.renderScale) && q.renderScale > 0.25 && q.renderScale <= 1 && num(q.bloomScale) && q.bloomScale > 0 && q.bloomScale <= 1 && Number.isInteger(q.lights) && q.lights >= 1
      && typeof q.antialias === 'boolean' && typeof q.simpleSurfaces === 'boolean' && typeof q.glows === 'boolean' && typeof q.ultra === 'boolean'
      && Number.isInteger(q.msaa) && q.msaa >= 0 && num(q.particles) && q.particles >= 0 && num(q.embers) && q.embers >= 0,
      `CONFIG.VISUALS.quality.${n}: renderScale (0.25..1], bloomScale (0..1], lights (whole, >= 1), msaa (whole, >= 0), particles and embers (>= 0), antialias, simpleSurfaces, glows and ultra (true / false).`);
  need(VIS.defaultQuality in Q, `CONFIG.VISUALS.defaultQuality "${VIS.defaultQuality}" is not a quality preset.`);
  for (const [m, kind] of Object.entries(VIS.surfaces.materials))
    need(m in MAT && kind in VIS.surfaces.kinds, `CONFIG.VISUALS.surfaces.materials: "${m}" -> "${kind}" names an unknown material or kind.`);
  for (const [k, K] of Object.entries(VIS.surfaces.kinds))
    need(K.side in VIS.surfaces.patterns && K.top in VIS.surfaces.patterns, `CONFIG.VISUALS.surfaces.kinds.${k}: unknown pattern.`);
  for (const L of [...ALL_LEVELS, ARENA]) {
    const A = L.atmosphere, w = `Level "${L.id}" atmosphere`;
    if (!A) continue;
    for (const k of Object.keys(A)) need(ATMOSPHERE_KEYS.includes(k), `${w}: unknown field "${k}" (known: ${ATMOSPHERE_KEYS.join(', ')}).`);
    for (const k of ['background', 'fog', 'rim']) if (k in A) need(isCol(A[k]), `${w}: ${k} must be a colour such as 0x1a2b3c.`);
    if ('fogDensity' in A) need(amount(A.fogDensity, 0.2), `${w}: fogDensity must be between 0 and 0.2.`);
    if ('exposure' in A) need(num(A.exposure) && A.exposure > 0.2 && A.exposure < 3, `${w}: exposure must be between 0.2 and 3.`);
    for (const k of ['ash', 'dust', 'debris', 'grass', 'embers']) if (k in A) need(amount(A[k]), `${w}: ${k} must be a number from 0 to 2.`);
    if ('landmark' in A) need(A.landmark && num(A.landmark.x) && num(A.landmark.z) && num(A.landmark.height) && A.landmark.height > 0
      && num(A.landmark.width) && A.landmark.width > 0 && (!('y' in A.landmark) || num(A.landmark.y)),
      `${w}: landmark needs x, z, height and width (numbers; height and width above 0), and y if given.`);
    if ('hemi' in A) need(A.hemi && isCol(A.hemi.sky) && isCol(A.hemi.ground) && amount(A.hemi.intensity, 5), `${w}: hemi needs sky and ground colours and an intensity (0..5).`);
    if ('grade' in A) {
      for (const k of ['shadowTint', 'highlightTint']) if (k in A.grade) need(tri(A.grade[k]), `${w}: grade.${k} must be [r, g, b].`);
      for (const k of ['saturation', 'contrast']) if (k in A.grade) need(amount(A.grade[k]), `${w}: grade.${k} must be a number from 0 to 2.`);
    }
    if ('surface' in A) for (const k of ['moss', 'grime']) if (k in A.surface) need(amount(A.surface[k]), `${w}: surface.${k} must be a number from 0 to 2.`);
    if ('shafts' in A) {
      const S = A.shafts;
      need(S && isCol(S.color) && amount(S.opacity, 1), `${w}: shafts need a colour and an opacity (0..1).`);
      need(S && (L.layout === 'hall' ? num(S.every) && S.every >= 4 : L.layout === 'rooms' ? S.rooms === true : false),
        `${w}: shafts need "every" (metres, at least 4) in a hall level or "rooms: true" in a room level.`);
    }
    if ('banners' in A) need(Array.isArray(A.banners) && A.banners.length > 0 && A.banners.every(isCol), `${w}: banners must be a list of colours.`);
    if ('sky' in A) need(A.sky && isCol(A.sky.zenith) && isCol(A.sky.sun) && tri(A.sky.sunDir), `${w}: sky needs zenith and sun colours and sunDir [x, y, z].`);
    if ('silhouettes' in A) need(Number.isInteger(A.silhouettes) && A.silhouettes >= 0 && A.silhouettes <= VIS.silhouettes.radii.length,
      `${w}: silhouettes must be a whole number from 0 to ${VIS.silhouettes.radii.length}.`);
  }
  for (const d of [...ENEMY_DEFS, ...TRAINING_DEFS, { id: 'player', visual: PLAYER_DEF.look.visual }]) {
    const V = d.visual, w = `Enemy "${d.id}" visual`;
    if (!V) continue;
    if ('skin' in V) need(isCol(V.skin), `${w}: skin must be a colour.`);
    for (const k of ['metal', 'skinMetal', 'roughness']) if (k in V) need(amount(V[k], 1), `${w}: ${k} must be between 0 and 1.`);
    if ('rim' in V) need(amount(V.rim), `${w}: rim must be between 0 and 2.`);
    if ('bareArms' in V) need(typeof V.bareArms === 'boolean', `${w}: bareArms must be true or false.`);
    if ('cloak' in V) need(typeof V.cloak === 'boolean', `${w}: cloak must be true or false.`);
    if ('embers' in V) need(typeof V.embers === 'boolean' && WEAPONS[d.weapon] && !!WEAPONS[d.weapon].head,
      `${w}: embers must be true or false, on a weapon with a head to glow (such as the halberd).`);
  }
}

// ---- deterministic randomness and tileable noise -------------------------------------------------
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const strSeed = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const between = (rnd, [a, b]) => a + (b - a) * rnd();
// Fractal value noise; x, y in lattice cells, repeating every `period` cells (so textures tile).
function makeNoise(seed) {
  const hash = (x, y) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const value = (x, y, p) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = ease(x - ix), fy = ease(y - iy), m = v => ((v % p) + p) % p;
    return lerp(lerp(hash(m(ix), m(iy)), hash(m(ix + 1), m(iy)), fx), lerp(hash(m(ix), m(iy + 1)), hash(m(ix + 1), m(iy + 1)), fx), fy);
  };
  return (x, y, period, octaves) => {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let o = 0; o < octaves; o++) { s += value(x * f, y * f, period * f) * amp; n += amp; amp *= 0.5; f *= 2; }
    return s / n;
  };
}

// ---- procedural surface textures -------------------------------------------------------------------
// One RGB texture per pattern: R = albedo detail (per-slab shade x fine noise), G = joints and cracks,
// B = large blotches (where moss, grime and rust gather). Built once at load.
function makeSurfaceTexture(name) {
  const P = VIS.surfaces.patterns[name], N = P.rows ? VIS.surfaces.texSize : VIS.surfaces.texSize / 2, px = N / 512;
  const rnd = seeded(strSeed(name)), fbm = makeNoise(strSeed(name) & 0xffff);
  const jc = document.createElement('canvas'); jc.width = jc.height = N;
  const g = jc.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.lineCap = 'round';
  const shade = new Float32Array(N * N).fill(1);
  const line = (x0, y0, x1, y1) => {   // drawn 9 times so it wraps across the tile edges
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.beginPath(); g.moveTo(x0 + ox, y0 + oy); g.lineTo(x1 + ox, y1 + oy); g.stroke(); }
  };
  if (P.rows) {   // courses of blocks or flagstones: each slab its own shade, joints drawn soft then sharp
    for (let y0 = 0; y0 < N;) {
      let h = Math.round(between(rnd, P.rows) * N);
      if (N - y0 - h < P.rows[0] * N * 0.6) h = N - y0;
      const start = rnd() * N, cuts = [];
      for (let x = start; x < start + N - P.slab[0] * N * 0.5; x += between(rnd, P.slab) * N) cuts.push(x % N);
      cuts.sort((a, b) => a - b);
      const vals = cuts.map(() => between(rnd, P.shade)), tilt = cuts.map(() => (rnd() - 0.5) * 6 * px);
      for (const [w, a] of [[P.joint * 4, 0.22], [P.joint, 0.9]]) {
        g.lineWidth = w * px; g.strokeStyle = `rgba(255,255,255,${a})`;
        line(0, y0, N, y0);
        cuts.forEach((cx, i) => line(cx, y0, cx + tilt[i], y0 + h));
      }
      for (let x = 0; x < N; x++) {
        let i = 0; while (i < cuts.length && cuts[i] <= x) i++;
        const v = vals[(i + cuts.length - 1) % cuts.length];   // before the first cut: the slab that wraps round
        for (let y = y0; y < y0 + h; y++) shade[y * N + x] = v;
      }
      y0 += h;
    }
  }
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  const branch = (x, y, ang, len, w) => {
    if (len < 6 * px || w < 0.5) return;
    g.lineWidth = w;
    for (let i = 0; i < 4; i++) {
      ang += (rnd() - 0.5) * 0.9;
      const nx = x + Math.cos(ang) * len / 4, ny = y + Math.sin(ang) * len / 4;
      line(x, y, nx, ny); x = nx; y = ny;
    }
    branch(x, y, ang + (rnd() - 0.5) * 1.2, len * 0.6, w * 0.7);
    if (rnd() < 0.4) branch(x, y, ang + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.6), len * 0.45, w * 0.6);
  };
  for (let i = 0; i < P.cracks; i++) branch(rnd() * N, rnd() * N, rnd() * Math.PI * 2, (40 + rnd() * 70) * px, 1.8 * px);
  for (let i = 0; i < (P.streaks || 0); i++) {   // metal: faint vertical runs (rust streaks, scratches)
    g.lineWidth = (0.5 + rnd() * 1.5) * px; g.strokeStyle = `rgba(255,255,255,${0.1 + rnd() * 0.25})`;
    const x = rnd() * N, y = rnd() * N; line(x, y, x + (rnd() - 0.5) * 4 * px, y + (20 + rnd() * 120) * px);
  }
  const jd = g.getImageData(0, 0, N, N).data, out = document.createElement('canvas'); out.width = out.height = N;
  const og = out.getContext('2d'), img = og.createImageData(N, N), d = img.data, F = P.freq;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = y * N + x;
    const fine = fbm(u * F, v * F, F, 4), blot = fbm(u * 3 + 7, v * 3 + 11, 3, 3);
    d[i * 4] = clamp((0.3 + fine) * shade[i], 0, 1) * 255;
    d[i * 4 + 1] = jd[i * 4]; d[i * 4 + 2] = blot * 255; d[i * 4 + 3] = 255;
  }
  og.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}
const SURF_TEX = Object.fromEntries(Object.keys(VIS.surfaces.patterns).map(k => [k, makeSurfaceTexture(k)]));

// ---- weathered materials -----------------------------------------------------------------------------
// Patches a MeshStandardMaterial: the surface texture is projected in world space from three sides
// (so every box, any size, tiles evenly), with cracks, grime pooled near the floor, moss in damp
// blotches, rust on metal, and roughness that varies with the detail. Works on instanced meshes too.
const WEATHER_VERT = `#include <begin_vertex>
  vec4 wPos4 = vec4(transformed, 1.0); vec3 wNrm3 = objectNormal;
  #ifdef USE_INSTANCING
    wPos4 = instanceMatrix * wPos4; wNrm3 = mat3(instanceMatrix) * wNrm3;
  #endif
  vWPos = (modelMatrix * wPos4).xyz; vWNrm = normalize(mat3(modelMatrix) * wNrm3);`;
const WEATHER_HEAD = `varying vec3 vWPos; varying vec3 vWNrm;
uniform sampler2D wSide, wTop;
uniform float wScaleSide, wScaleTop, wGrimeH, wMossAmt, wCrack, wRough, wRustAmt, wDetailAmt, wLevelMoss, wLevelGrime, wRelief;
uniform vec2 wReliefFade;
uniform vec3 wGrime, wMoss, wRust;
vec3 wTri() {
#ifdef W_SIMPLE
  vec3 a = abs(vWNrm);   // low quality: one read, from the side the surface faces most
  if (a.y >= a.x && a.y >= a.z) return texture2D(wTop, vWPos.xz * wScaleTop).rgb;
  return texture2D(wSide, (a.x > a.z ? vWPos.zy : vWPos.xy) * wScaleSide).rgb;
#else
  vec3 n = pow(abs(normalize(vWNrm)), vec3(6.0)); n /= n.x + n.y + n.z;
  return texture2D(wSide, vWPos.zy * wScaleSide).rgb * n.x + texture2D(wTop, vWPos.xz * wScaleTop).rgb * n.y
       + texture2D(wSide, vWPos.xy * wScaleSide).rgb * n.z;
#endif
}
`;
// Weathered materials, so a quality change can rebuild them with the cheap or the full surface (simpleSurfaces).
const WEATHERED = [];
const WEATHER_MODE = { simple: false };
const WEATHER_FRAG = `vec3 wT = wTri(); float wD = wT.r, wC = wT.g, wB = wT.b;
  float wUp = smoothstep(0.5, 0.95, normalize(vWNrm).y);
  diffuseColor.rgb *= mix(1.0, 0.45 + wD * 1.1, wDetailAmt);
  diffuseColor.rgb *= 1.0 - wC * wCrack;
  float wLow = (1.0 - smoothstep(0.0, wGrimeH, vWPos.y)) * (1.0 - wUp);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * wGrime, clamp(wLow * (0.55 + 0.6 * wB) * wLevelGrime, 0.0, 1.0));
  float wMossM = clamp(smoothstep(0.56, 0.8, wB + wLow * 0.22 + wC * 0.12 + wUp * 0.04) * wMossAmt * wLevelMoss, 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, wMoss * (0.55 + 0.7 * wD), wMossM);
  float wRustM = smoothstep(0.45, 0.8, wB + wC * 0.3) * wRustAmt;
  diffuseColor.rgb = mix(diffuseColor.rgb, wRust * (0.5 + 0.8 * wD), wRustM);`;
// Relief (not with simpleSurfaces): joints and cracks sink and the paler stone stands, so light rakes across them. The
// height's screen-space slope tilts the normal (as three's bump map does), fading out with distance before it can shimmer.
const WEATHER_RELIEF = `#include <normal_fragment_maps>
#ifndef W_SIMPLE
  if (wRelief > 0.0) {
    float wHt = wD * 0.12 - wC;
    float wFade = 1.0 - smoothstep(wReliefFade.x, wReliefFade.y, length(vViewPosition));
    vec2 wDH = vec2(dFdx(wHt), dFdy(wHt)) * wRelief * wFade;
    vec3 wSX = dFdx(-vViewPosition), wSY = dFdy(-vViewPosition), wR1 = cross(wSY, normal), wR2 = cross(normal, wSX);
    float wDet = dot(wSX, wR1) * faceDirection;
    normal = normalize(abs(wDet) * normal - sign(wDet) * (wDH.x * wR1 + wDH.y * wR2));
  }
#endif`;
function weather(mat, kindName) {
  if (mat.userData.weathered) return mat;
  const K = VIS.surfaces.kinds[kindName];
  mat.userData.weathered = kindName;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {
      wSide: { value: SURF_TEX[K.side] }, wTop: { value: SURF_TEX[K.top] },
      wScaleSide: { value: 1 / K.tileSide }, wScaleTop: { value: 1 / K.tileTop }, wDetailAmt: { value: K.detail },
      wCrack: { value: K.crack }, wGrime: { value: new THREE.Color(K.grimeColor) }, wGrimeH: { value: K.grimeHeight },
      wMoss: { value: new THREE.Color(K.mossColor) }, wMossAmt: { value: K.moss }, wRough: { value: K.roughVar },
      wRust: { value: new THREE.Color(K.rustColor) }, wRustAmt: { value: K.rust }, wLevelMoss: SURF.moss, wLevelGrime: SURF.grime,
      wRelief: { value: K.relief || 0 }, wReliefFade: { value: new THREE.Vector2(...VIS.surfaces.reliefFade) },
    });
    sh.vertexShader = 'varying vec3 vWPos; varying vec3 vWNrm;\n' + sh.vertexShader.replace('#include <begin_vertex>', WEATHER_VERT);
    sh.fragmentShader = (WEATHER_MODE.simple ? '#define W_SIMPLE\n' : '') + WEATHER_HEAD + sh.fragmentShader
      .replace('#include <map_fragment>', WEATHER_FRAG)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(roughness + (0.5 - wD) * wRough + wRustM * 0.25, 0.05, 1.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * (1.0 - wRustM) * (0.7 + 0.6 * wD);')
      .replace('#include <normal_fragment_maps>', WEATHER_RELIEF);
  };
  mat.customProgramCacheKey = () => WEATHER_MODE.simple ? 'weatherSimple' : 'weather';
  mat.needsUpdate = true;
  WEATHERED.push(mat);
  return mat;
}
for (const [m, kind] of Object.entries(VIS.surfaces.materials)) if (MAT[m] && VIS.surfaces.kinds[kind]) weather(MAT[m], kind);

// Faint rim light on characters, coloured by the level, so silhouettes read against fog.
function addRim(mat, mul = 1) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.rimColor = RIM.color; sh.uniforms.rimStrength = RIM.strength; sh.uniforms.rimMul = { value: mul };
    const chunk = sh.fragmentShader.includes('#include <opaque_fragment>') ? '#include <opaque_fragment>' : '#include <output_fragment>';
    sh.fragmentShader = 'uniform vec3 rimColor; uniform float rimStrength; uniform float rimMul;\n' + sh.fragmentShader.replace(chunk,
      `outgoingLight += rimColor * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), ${VIS.rim.power.toFixed(2)}) * rimStrength * rimMul;\n${chunk}`);
  };
  mat.customProgramCacheKey = () => 'rim';
  return mat;
}
// A character's colours: cloth or armour desaturated toward grey, a separate skin / helmet material.
function rigLook(color, visual = {}) {
  const E = VIS.enemy, hsl = {}, body = new THREE.Color(color);
  body.getHSL(hsl); body.setHSL(hsl.h, hsl.s * (1 - E.desaturate), hsl.l);
  return { body, dark: body.clone().multiplyScalar(E.darkMul), skin: new THREE.Color(visual.skin ?? E.skin),
           rough: visual.roughness ?? 0.65, metal: visual.metal ?? 0.05,
           skinRough: visual.skinMetal ? 0.55 : E.skinRoughness, skinMetal: visual.skinMetal ?? 0,
           bareArms: !!visual.bareArms, rim: visual.rim ?? 1 };
}

// ---- glows ----------------------------------------------------------------------------------------------
function makeGlowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.22, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.13)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const GLOW_TEX = makeGlowTexture();
// Additive glows fade toward black in fog (ordinary fog would add the fog colour). pierce < 1 reaches further.
function fadeInFog(mat, pierce) {
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>',
      `#ifdef USE_FOG\n  float fogK = ${pierce.toFixed(3)} * fogDensity * vFogDepth; gl_FragColor.rgb *= exp(-fogK * fogK);\n#endif`);
  };
  mat.customProgramCacheKey = () => 'fadeFog' + pierce;
  return mat;
}
// pierce: null = ignores fog entirely.
function glowSprite(color, boost, size, opacity, pierce) {
  const m = new THREE.SpriteMaterial({ map: GLOW_TEX, color: new THREE.Color(color).multiplyScalar(boost), blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, opacity, fog: pierce !== null });
  if (pierce !== null) fadeInFog(m, pierce);
  const s = new THREE.Sprite(m); s.scale.setScalar(size);
  return s;
}
// The wind-up telegraph halo on a blade (driven by Rig.setWarning). Ignores fog so it reads in every level.
// Embers on a weapon (an enemy's visual `embers`): a flickering warm glow at its head and a glowing edge.
function addWeaponEmbers(weapon, W) {
  const E = VIS.weaponEmbers, g = new THREE.Group(), glow = glowSprite(E.color, E.boost, E.size, E.opacity, E.pierce);
  glow.position.set(...W.head); g.add(glow);
  const seed = Math.random() * 10;
  glow.onBeforeRender = () => { glow.scale.setScalar(E.size * (1 + 0.18 * Math.sin(vTime.value * 11 + seed) + 0.1 * Math.sin(vTime.value * 23.7 + seed))); };
  if (W.edge) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(...W.edge.size), new THREE.MeshBasicMaterial({ color: new THREE.Color(E.color).multiplyScalar(E.edge) }));
    edge.position.set(...W.edge.at); g.add(edge);
  }
  weapon.add(g);
  return g;
}
function makeWarnGlow() {
  const G = VIS.windupGlow, s = glowSprite(G.color, G.boost, G.size, 0, null);
  s.position.set(0, 0, G.along); s.visible = false;
  return s;
}

// ---- shaders for particles, shafts, sky and the final grade ----------------------------------------------
const ASH_VERT = `attribute vec4 seed;
uniform float uTime, uScale, uSize, uDustRatio, uMaxPx; uniform vec3 uCam, uBox;
varying float vA; varying float vDust;
void main() {
  float dust = step(seed.w, uDustRatio);
  vec3 fall = vec3(uTime * 0.22 + sin(uTime * 0.13 + seed.x * 20.0) * 1.5, -uTime * (0.25 + 0.35 * seed.y), cos(uTime * 0.11 + seed.z * 17.0) * 1.5);
  vec3 hover = vec3(sin(uTime * 0.21 + seed.y * 30.0) * 0.8, sin(uTime * 0.17 + seed.x * 40.0) * 0.5 + uTime * 0.03, cos(uTime * 0.19 + seed.z * 25.0) * 0.8);
  vec3 p = position * uBox + mix(fall, hover, dust);
  vec3 w = uCam + (fract((p - uCam) / uBox) - 0.5) * uBox;   // wraps in a box around the camera
  vec4 mv = viewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  vA = smoothstep(0.4, 1.6, d) * (1.0 - smoothstep(uBox.x * 0.25, uBox.x * 0.5, length(w.xz - uCam.xz)));
  vDust = dust;
  gl_PointSize = min(uSize * (0.5 + seed.y) * mix(1.0, 0.6, dust) * uScale / max(d, 0.1), uMaxPx);
}`;
const ASH_FRAG = `uniform vec3 uAsh, uDustC; uniform float uOpacity; varying float vA; varying float vDust;
void main() {
  float a = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5)) * vA * uOpacity * mix(0.7, 1.0, vDust);
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(uAsh, uDustC, vDust), a);
  ${COLOR_OUT}
}`;
const EMBER_VERT = `attribute vec4 seed;
uniform float uTime, uScale, uFlare, uRise; uniform vec3 uBase; varying float vA;
void main() {
  float life = fract(uTime * (0.25 + 0.3 * seed.x) + seed.y);
  float ang = seed.z * 6.2832 + uTime * (0.5 + seed.x);
  float rad = (0.1 + life * (0.3 + seed.w * 0.5)) * (1.0 + uFlare);
  vec3 p = uBase + vec3(cos(ang) * rad, life * uRise * (0.5 + seed.w * 0.7) * (1.0 + uFlare * 0.7), sin(ang) * rad);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = smoothstep(0.0, 0.06, life) * (1.0 - life) * (1.0 + uFlare);
  gl_PointSize = (0.045 + 0.04 * seed.x) * (1.0 - 0.5 * life) * uScale / max(-mv.z, 0.1);
}`;
const EMBER_FRAG = `uniform vec3 uColor; varying float vA;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
  ${COLOR_OUT}
}`;
const SHAFT_VERT = `varying float vY; varying vec3 vN; varying vec3 vV;
void main() {
  vY = position.y;
  vec4 mv = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  vN = normalize((viewMatrix * modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
  gl_Position = projectionMatrix * mv;
}`;
const SHAFT_FRAG = `uniform vec3 uColor; uniform float uOpacity, uTime, uFogD; uniform vec2 uNear;
varying float vY; varying vec3 vN; varying vec3 vV;
void main() {
  float dist = length(vV);
  float edge = pow(abs(dot(normalize(vN), vV / dist)), 1.5);            // soft edges, bright core
  float vert = smoothstep(0.0, 0.25, vY) * (0.55 + 0.45 * vY) * smoothstep(1.0, 0.92, vY);
  float drift = 0.85 + 0.15 * sin(uTime * 0.6 + vY * 5.0 + vV.x * 0.1);
  float fogK = uFogD * dist * 0.7;
  float a = edge * vert * drift * smoothstep(uNear.x, uNear.y, dist) * exp(-fogK * fogK) * uOpacity;
  gl_FragColor = vec4(uColor * a, 1.0);
  ${COLOR_OUT}
}`;
const SKY_VERT = `varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAG = `uniform vec3 uZen, uHor, uSun, uSunDir; varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 c = mix(uHor, uZen, smoothstep(0.02, 0.6, d.y));
  float s = max(dot(d, uSunDir), 0.0);
  c += uSun * (pow(s, 5.0) * 0.35 + pow(s, 48.0) * 0.9 + pow(s, 900.0) * 6.0) * smoothstep(-0.1, 0.05, d.y);
  gl_FragColor = vec4(c, 1.0);
  ${COLOR_OUT}
}`;
// The far castle (atmosphere `landmark`): a dark mass hazed toward the horizon, its edges lit by the sun behind it.
const LANDMARK_VERT = `varying vec3 vN; varying vec3 vW;
void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const LANDMARK_FRAG = `uniform vec3 uDark, uHaze, uSun, uSunDir; uniform float uHazeAmt, uRim, uRimPow; varying vec3 vN; varying vec3 vW;
void main() {
  vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
  float rim = pow(1.0 - abs(dot(n, v)), uRimPow) * (0.35 + 0.65 * max(dot(n, normalize(uSunDir)), 0.0));
  float low = 1.0 - smoothstep(0.0, 60.0, vW.y);   // the foot of its hill sinks into the haze
  vec3 c = mix(uDark, uHaze, clamp(uHazeAmt + low * 0.35, 0.0, 1.0)) + uSun * rim * uRim;
  gl_FragColor = vec4(c, 1.0);
  ${COLOR_OUT}
}`;
// Smoke over burning houses: soft puffs rising from each column's base, growing and drifting downwind, lit by the
// fire at the bottom. `position` is the column's base; seed: phase, speed, swirl angle, size.
const SMOKE_VERT = `attribute vec4 seed; attribute float strength;
uniform float uTime, uScale, uRise, uSize0, uSize1, uSpeed; uniform vec3 uWind; varying float vA; varying float vH;
void main() {
  float life = fract(uTime * uSpeed * (0.8 + 0.4 * seed.y) + seed.x), h = life * uRise;
  float a = seed.z * 6.2832 + uTime * 0.2;
  vec3 p = position + uWind * h + vec3(cos(a), 0.0, sin(a)) * (0.3 + life * 2.6) + vec3(0.0, h, 0.0);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = mix(uSize0, uSize1, life) * (0.7 + 0.6 * seed.w) * uScale / max(-mv.z, 0.5);
  vA = smoothstep(0.0, 0.08, life) * (1.0 - life) * strength; vH = life;
}`;
const SMOKE_FRAG = `uniform vec3 uColor, uLight; uniform float uOpacity; varying float vA; varying float vH;
void main() {
  float a = smoothstep(0.5, 0.12, length(gl_PointCoord - 0.5)) * vA * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(uLight, uColor, smoothstep(0.0, 0.3, vH)), a);
  ${COLOR_OUT}
}`;
// Embers in the air (atmosphere `embers`): glowing sparks rising and swirling in a box that follows the camera.
const EMBER_FIELD_VERT = `attribute vec4 seed;
uniform float uTime, uScale, uSize, uMaxPx; uniform vec3 uCam, uBox; varying float vA;
void main() {
  vec3 rise = vec3(sin(uTime * 0.7 + seed.x * 30.0) * 0.7 + uTime * 0.4, uTime * (0.5 + 0.9 * seed.y), cos(uTime * 0.5 + seed.z * 20.0) * 0.7);
  vec3 w = uCam + (fract((position * uBox + rise - uCam) / uBox) - 0.5) * uBox;
  vec4 mv = viewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z, flick = 0.5 + 0.5 * sin(uTime * (3.0 + seed.w * 7.0) + seed.x * 40.0);
  vA = flick * smoothstep(0.3, 1.2, d) * (1.0 - smoothstep(uBox.x * 0.25, uBox.x * 0.5, length(w.xz - uCam.xz)));
  gl_PointSize = min(uSize * (0.5 + seed.y) * uScale / max(d, 0.1), uMaxPx);
}`;
const EMBER_FIELD_FRAG = `uniform vec3 uColor; varying float vA;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * a, 1.0);
  ${COLOR_OUT}
}`;
// After tone mapping: saturation, split-tone, contrast, vignette (stronger and redder at low health), grain.
const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null }, uShadow: { value: new THREE.Vector3(1, 1, 1) }, uHigh: { value: new THREE.Vector3(1, 1, 1) },
    uSat: { value: 1 }, uContrast: { value: 1 }, uVig: { value: 0 }, uVigSoft: { value: 0.5 }, uGrain: { value: 0 },
    uTime: { value: 0 }, uLow: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uShadow, uHigh;
uniform float uSat, uContrast, uVig, uVigSoft, uGrain, uTime, uLow; uniform vec2 uRes; varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float red = smoothstep(0.25, 0.6, c.r - max(c.g, c.b));   // the red wind-up telegraph keeps full saturation
  c = mix(vec3(l), c, mix(uSat, 1.0, red));
  c *= mix(uShadow, uHigh, smoothstep(0.05, 0.75, l));
  c = max((c - 0.5) * uContrast + 0.5, 0.0);
  vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float v = smoothstep(1.0 - uVigSoft, 1.15, length(q) / 0.85);
  c *= 1.0 - v * clamp(uVig + uLow * 0.35, 0.0, 1.0);
  c = mix(c, c * vec3(1.0, 0.35, 0.3), v * uLow * 0.7);
  c += (hash(vUv * uRes + fract(uTime * 7.13) * 91.7) - 0.5) * uGrain;
  gl_FragColor = vec4(c, 1.0);
}`,
};

// ---- geometry helpers for dressing -----------------------------------------------------------------------
function rockGeometry(rnd, detail) {
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, detail).deleteAttribute('normal').deleteAttribute('uv'));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.72 + rnd() * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); }
  const flat = g.toNonIndexed(); flat.computeVertexNormals();   // faceted, chipped stone
  return flat;
}
// A rib across the hall's vault: a tube along a flattened half-ellipse in the ZY plane, lightly warped.
function archGeometry(halfSpan, rise, tube) {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI; pts.push(new THREE.Vector3(0, Math.sin(a) * rise, Math.cos(a) * halfSpan)); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, tube, 6, false);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.18 * Math.sin(z * 3.1 + y * 1.7) * Math.cos(z * 1.3 - y * 2.9);
    p.setXYZ(i, x * k, y + (k - 1) * 0.1, z);
  }
  g.computeVertexNormals();
  return g;
}
function rubbleCluster(out, rnd, x, z, ax, az, nx, nz, y = 0) {   // (ax, az): along the wall; (nx, nz): into the room; y: floor
  const R = VIS.rubble, n = 1 + Math.floor(rnd() * R.cluster);
  for (let i = 0; i < n; i++) {
    const along = (rnd() - 0.5) * 1.2, inward = rnd() * rnd() * 0.7, s = between(rnd, R.size) * (1 - inward * 0.6);
    out.push({ x: x + ax * along + nx * inward, y, z: z + az * along + nz * inward, s, ry: rnd() * 6.28, rx: (rnd() - 0.5) * 0.6, w: 0.8 + rnd() * 0.6 });
  }
}
function rubbleMesh(rocks, rnd) {
  const m = new THREE.InstancedMesh(rockGeometry(rnd, 1), MAT.edge, rocks.length), o = new THREE.Object3D();
  rocks.forEach((r, i) => {
    o.position.set(r.x, r.y + r.s * 0.25, r.z); o.rotation.set(r.rx, r.ry, 0); o.scale.set(r.s * r.w, r.s, r.s); o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  });
  m.computeBoundingSphere();
  return m;
}
function makeBannerTexture() {
  const W = 128, H = 384, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), rnd = seeded(77);
  g.fillStyle = '#d8d2c8'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.08})`; g.fillRect(rnd() * W, 0, 1 + rnd() * 3, H); }   // weave, stains
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(20,14,8,0.6)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,240,200,0.35)'; g.lineWidth = 5;   // a faded sigil
  g.beginPath(); g.arc(W / 2, H * 0.3, 28, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(W / 2, H * 0.3 - 44); g.lineTo(W / 2, H * 0.3 + 64); g.moveTo(W / 2 - 22, H * 0.3 + 22); g.lineTo(W / 2 + 22, H * 0.3 + 22); g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, 6, H); g.fillRect(W - 6, 0, 6, H);
  g.globalCompositeOperation = 'destination-out';   // frayed hem and moth holes
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x < W; x += 4 + rnd() * 10) g.lineTo(x, H - 30 - rnd() * 90);
  g.lineTo(W, H - 40); g.lineTo(W, H); g.closePath(); g.fill();
  for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(rnd() * W, H * 0.3 + rnd() * H * 0.55, 3 + rnd() * 8, 4 + rnd() * 13, rnd() * 3, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function bannerMesh(list, colors) {
  const B = VIS.banners;
  const mat = new THREE.MeshStandardMaterial({ map: makeBannerTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 });
  mat.onBeforeCompile = sh => {   // a slow sway that grows toward the hem
    Object.assign(sh.uniforms, { uTime: vTime, uSway: { value: B.sway }, uSpeed: { value: B.swaySpeed }, uH: { value: B.height } });
    sh.vertexShader = 'uniform float uTime, uSway, uSpeed, uH;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float bPh = 0.0;
      #ifdef USE_INSTANCING
        bPh = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 1.3;
      #endif
      float bW = clamp(0.5 - position.y / uH, 0.0, 1.0);
      transformed.z += sin(uTime * uSpeed + position.y * 1.6 + bPh) * uSway * (0.2 + bW * bW * 1.6);
      transformed.x += sin(uTime * uSpeed * 0.63 + position.y * 2.4 + bPh) * uSway * 0.35 * bW;`);
  };
  mat.customProgramCacheKey = () => 'banner';
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(B.width, B.height, 4, 12), mat, list.length), o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((b, i) => {
    o.position.set(b.x, b.y, b.z); o.rotation.set(0, b.ry, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    m.setColorAt(i, c.set(colors[i % colors.length]));
  });
  m.userData.noDepth = true; m.computeBoundingSphere();
  return m;
}
function shaftMesh(list, S) {
  const V = VIS.shafts, geo = new THREE.CylinderGeometry(V.topRatio, 1, 1, 24, 1, true).translate(0, 0.5, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(S.color) }, uOpacity: { value: S.opacity }, uTime: vTime, uFogD: FOG_D,
                uNear: { value: new THREE.Vector2(...V.nearFade) } },
    vertexShader: SHAFT_VERT, fragmentShader: SHAFT_FRAG, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D();
  list.forEach((s, i) => {
    o.position.set(s.x, s.y || 0, s.z); o.rotation.set(s.tx, 0, s.tz); o.scale.set(s.r, s.h, s.r); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
  });
  m.computeBoundingSphere();
  return m;
}
function poolMesh(pools) {   // warm (or pale) pools of light on the floor
  const mat = fadeInFog(new THREE.MeshBasicMaterial({ map: GLOW_TEX, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), 1);
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, pools.length), o = new THREE.Object3D(), c = new THREE.Color();
  pools.forEach((p, i) => {
    o.position.set(p.x, (p.y || 0) + 0.03, p.z); o.scale.set(p.r * 2, 1, p.r * 2); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    m.setColorAt(i, c.copy(p.color).multiplyScalar(p.k));
  });
  m.renderOrder = 1; m.computeBoundingSphere();
  return m;
}
// spot(): a place for one clump, [x, y, z], or null to try again. size scales every clump.
function grassMesh(rnd, count, spot, size = 1) {
  const Gs = VIS.grass, parts = [];
  for (let i = 0; i < 7; i++) {   // one clump: a few leaning blades
    const h = Gs.height * (0.5 + rnd() * 0.7), w = 0.05 + rnd() * 0.04, a = rnd() * Math.PI;
    const ox = (rnd() - 0.5) * 0.35, oz = (rnd() - 0.5) * 0.35, lean = (rnd() - 0.5) * 0.3, cx = Math.cos(a) * w, cz = Math.sin(a) * w;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([ox - cx, 0, oz - cz, ox + cx, 0, oz + cz, ox + lean, h, oz + lean * 0.5], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    parts.push(g);
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = vTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float gPh = 0.0;
      #ifdef USE_INSTANCING
        gPh = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
      #endif
      transformed.x += sin(uTime * 1.4 + gPh) * 0.12 * position.y; transformed.z += cos(uTime * 1.1 + gPh * 1.3) * 0.08 * position.y;`);
  };
  mat.customProgramCacheKey = () => 'grass';
  const m = new THREE.InstancedMesh(mergeGeometries(parts), mat, count), o = new THREE.Object3D(), c = new THREE.Color();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 20; tries++) {
    const at = spot();
    if (!at) continue;
    o.position.set(at[0], at[1], at[2]); o.rotation.set(0, rnd() * 6.28, 0); o.scale.setScalar((0.7 + rnd() * 0.8) * size); o.updateMatrix();
    m.setMatrixAt(n, o.matrix);
    m.setColorAt(n, c.set(Gs.color).offsetHSL((rnd() - 0.5) * 0.04, (rnd() - 0.5) * 0.15, (rnd() - 0.5) * 0.12));
    n++;
  }
  m.count = n; m.userData.max = n; m.userData.noDepth = true; m.computeBoundingSphere();
  return m;
}
// Distant ruins: towers with broken tops, wall runs and lone arches, merged into one mesh per layer.
function silhouetteGeometry(rnd, radius) {
  const parts = [];
  const box = (w, h, d, x, y, z, ry) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateY(ry); g.translate(x, y, z); parts.push(g); };
  const n = Math.round(radius / 6);
  for (let i = 0; i < n; i++) {
    const a = (i + rnd() * 0.6) / n * Math.PI * 2, r = radius * (0.9 + rnd() * 0.2), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const tan = -a - Math.PI / 2, tx = -Math.sin(a), tz = Math.cos(a), kind = rnd();
    if (kind < 0.35) {
      const h = 14 + rnd() * radius * 0.25, w = 4 + rnd() * 5;
      box(w, h, w, x, h / 2 - 2, z, tan);
      for (let k = 0; k < 3; k++) box(w * 0.3, 2 + rnd() * 4, w * 0.3, x + (rnd() - 0.5) * w * 0.6, h - 0.5, z + (rnd() - 0.5) * w * 0.6, tan);
    } else if (kind < 0.7) {
      const len = 10 + rnd() * 14, h = 5 + rnd() * 8;
      box(len, h, 2, x, h / 2 - 2, z, tan);
      for (let k = 0; k < 4; k++) box(1.5, 1.5 + rnd() * 3, 2, x + tx * (rnd() - 0.5) * len, h - 2 + 0.7, z + tz * (rnd() - 0.5) * len, tan);
    } else {
      const h = 9 + rnd() * 7, span = 6 + rnd() * 5, h2 = h * (0.5 + rnd() * 0.5);
      box(1.6, h, 1.6, x - tx * span / 2, h / 2 - 2, z - tz * span / 2, tan);
      box(1.6, h2, 1.6, x + tx * span / 2, h2 / 2 - 2, z + tz * span / 2, tan);
      if (h2 > h * 0.8) box(span + 1.6, 1.4, 1.6, x, h - 2, z, tan);
    }
  }
  return mergeGeometries(parts);
}
// The far castle, `w` wide and `h` tall, standing on y = 0: a hill, a ring of curtain walls and round towers with
// conical roofs, a great keep and, rising over all of it, one tall tower under a spire. Merged into one geometry.
function landmarkGeometry(rnd, w, h) {
  const parts = [], add = (g, x, y, z, ry = 0) => { g.rotateY(ry); g.translate(x, y, z); parts.push(g); };
  const hill = h * 0.24, wall = h * 0.16, ring = w * 0.27;
  add(new THREE.CylinderGeometry(w * 0.34, w * 0.62, hill, 9), 0, hill / 2, 0);
  const n = 7;
  for (let i = 0; i < n; i++) {   // curtain walls between round towers
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, x0 = Math.cos(a0) * ring, z0 = Math.sin(a0) * ring;
    const x1 = Math.cos(a1) * ring, z1 = Math.sin(a1) * ring, len = Math.hypot(x1 - x0, z1 - z0);
    add(new THREE.BoxGeometry(len, wall, w * 0.025), (x0 + x1) / 2, hill + wall / 2, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0));
    for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(len * 0.06, wall * 0.12, w * 0.03), lerp(x0, x1, (k + 0.5) / 6), hill + wall * 1.06, lerp(z0, z1, (k + 0.5) / 6), -Math.atan2(z1 - z0, x1 - x0));
    const th = wall * (1.5 + rnd() * 0.5), tr = w * 0.035;
    add(new THREE.CylinderGeometry(tr, tr * 1.1, th, 10), x0, hill + th / 2, z0);
    add(new THREE.ConeGeometry(tr * 1.3, th * 0.45, 10), x0, hill + th + th * 0.22, z0);
  }
  const kh = h * 0.42, kw = w * 0.2;   // the keep, with towers at its corners
  add(new THREE.BoxGeometry(kw, kh, kw * 0.8), 0, hill + kh / 2, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const th = kh * (1.1 + rnd() * 0.15);
    add(new THREE.BoxGeometry(w * 0.045, th, w * 0.045), sx * kw / 2, hill + th / 2, sz * kw * 0.4);
    add(new THREE.ConeGeometry(w * 0.04, th * 0.25, 4), sx * kw / 2, hill + th + th * 0.12, sz * kw * 0.4, Math.PI / 4);
  }
  const tt = h - hill - h * 0.14, tw = w * 0.07;   // the great tower and its spire reach the full height
  add(new THREE.BoxGeometry(tw, tt, tw), kw * 0.15, hill + tt / 2, -kw * 0.1);
  add(new THREE.ConeGeometry(tw * 0.8, h * 0.14, 4), kw * 0.15, hill + tt + h * 0.07, -kw * 0.1, Math.PI / 4);
  return mergeGeometries(parts.map(g => g.index ? g : g.toNonIndexed()).map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; }));
}
function smokeMesh(columns) {
  const S = VIS.smoke, n = columns.length * S.puffs, pos = new Float32Array(n * 3), seed = new Float32Array(n * 4), strength = new Float32Array(n);
  for (let i = 0; i < S.puffs; i++) columns.forEach((c, j) => {   // puff-major, so a shorter draw range thins every column alike
    const v = i * columns.length + j;
    pos.set([c.x, c.y, c.z], v * 3); seed.set([Math.random(), Math.random(), Math.random(), Math.random()], v * 4); strength[v] = c.k;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  geo.setAttribute('strength', new THREE.BufferAttribute(strength, 1));
  const m = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uTime: vTime, uScale: PT_SCALE, uRise: { value: S.rise }, uSize0: { value: S.size[0] }, uSize1: { value: S.size[1] },
                uSpeed: { value: S.speed }, uWind: { value: new THREE.Vector3(...S.wind) }, uColor: { value: new THREE.Color(S.color) },
                uLight: { value: new THREE.Color(S.light) }, uOpacity: { value: S.opacity } },
    vertexShader: SMOKE_VERT, fragmentShader: SMOKE_FRAG, transparent: true, depthWrite: false }));
  m.frustumCulled = false; m.renderOrder = 2; m.userData.columns = columns.length;
  return m;
}
function makeBloodTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), rnd = seeded(31);
  const blob = (x, y, r, a) => {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(70,4,4,${a})`); grd.addColorStop(0.7, `rgba(52,3,3,${a * 0.9})`); grd.addColorStop(1, 'rgba(40,2,2,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  blob(64, 64, 28, 0.95);
  for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, d = 16 + rnd() * 32; blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 3 + rnd() * 8, 0.9); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- pooled effects that outlive a stage ------------------------------------------------------------------
// Buffers are sized for the preset that draws the most (Ultra); a preset draws a share of them (quality.particles).
const MOST = key => Math.max(1, ...Object.values(VIS.quality).map(q => q[key]));
function makeAsh() {   // ash (falls) and dust motes (hover) in a box that follows the camera; animated on the GPU
  const P = VIS.particles, n = Math.ceil(P.max * MOST('particles')), pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
  for (let i = 0; i < pos.length; i++) pos[i] = Math.random();
  for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: vTime, uScale: PT_SCALE, uSize: { value: P.size }, uMaxPx: { value: P.maxPx }, uDustRatio: { value: 0 }, uCam: { value: new THREE.Vector3() },
                uBox: { value: new THREE.Vector3(...P.box) }, uAsh: { value: new THREE.Color(P.ashColor) },
                uDustC: { value: new THREE.Color(P.dustColor) }, uOpacity: { value: P.opacity } },
    vertexShader: ASH_VERT, fragmentShader: ASH_FRAG, transparent: true, depthWrite: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  return pts;
}
function makeEmberField() {   // glowing sparks rising round the camera (atmosphere `embers`); animated on the GPU
  const E = VIS.embers, n = Math.ceil(E.max * MOST('particles')), pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
  for (let i = 0; i < pos.length; i++) pos[i] = Math.random();
  for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uTime: vTime, uScale: PT_SCALE, uSize: { value: E.size }, uMaxPx: { value: E.maxPx }, uCam: { value: new THREE.Vector3() },
                uBox: { value: new THREE.Vector3(...E.box) }, uColor: { value: new THREE.Color(E.color).multiplyScalar(E.boost) } },
    vertexShader: EMBER_FIELD_VERT, fragmentShader: EMBER_FIELD_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false; pts.visible = false; scene.add(pts);
  return pts;
}
function makeBloodDecals() {
  const B = VIS.blood, tex = makeBloodTexture(), geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const pool = Array.from({ length: B.decals }, () => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.3,
      polygonOffset: true, polygonOffsetFactor: -4 }));
    m.visible = false; m.renderOrder = 1; scene.add(m); pooledFx.push(m);
    return { m, age: Infinity };
  });
  let cursor = 0;
  return {
    clear() { for (const d of pool) { d.m.visible = false; d.age = Infinity; } },
    splat(x, z, size, y = 0) {   // oldest reused first; y: the floor
      const d = pool[cursor++ % pool.length];
      d.age = 0; d.m.position.set(x, y + 0.035 + (cursor % 7) * 0.0015, z); d.m.rotation.y = rand(0, Math.PI * 2);
      d.m.scale.set(size, 1, size * rand(0.7, 1.25)); d.m.visible = true;
    },
    update(dt) {
      for (const d of pool) {
        if (!d.m.visible) continue;
        d.age += dt;
        if (d.age > B.life) { d.m.visible = false; continue; }
        d.m.material.opacity = 0.9 * clamp((B.life - d.age) / B.fade, 0, 1);
      }
    },
  };
}
function makeDebris() {   // small stones falling from the ceiling (and from lifting gates); visual only
  const D = VIS.debris, mesh = new THREE.InstancedMesh(rockGeometry(seeded(5), 0), MAT.edge, D.max);
  mesh.count = 0; mesh.frustumCulled = false; scene.add(mesh);
  const items = [], o = new THREE.Object3D(), g = CONFIG.fx.particleGravity;
  return {
    clear() { items.length = 0; mesh.count = 0; },
    drop(x, y, z, s, ground = 0) {   // ground: the floor it lands on
      if (items.length >= D.max) items.shift();
      items.push({ x, y, z, ground, vy: 0, s, rx: rand(0, 6), ry: rand(0, 6), spin: rand(-6, 6), rest: 0 });
    },
    update(dt) {
      let n = 0;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i], floor = it.ground + it.s * 0.3;
        if (it.rest > 0 || it.y <= floor) {
          if (it.rest === 0 && it.vy < -2.5) { it.vy *= -0.25; it.y = floor; it.spin *= 0.5; }   // one small bounce
          else { it.vy = 0; it.y = floor; it.rest += dt; }
        }
        if (it.rest === 0) { it.vy -= g * dt; it.y += it.vy * dt; it.rx += it.spin * dt; }
        if (it.rest > 4) { items.splice(i, 1); continue; }
        o.position.set(it.x, it.y, it.z); o.rotation.set(it.rx, it.ry, 0);
        o.scale.setScalar(it.s * clamp(4 - it.rest, 0, 1)); o.updateMatrix();
        mesh.setMatrixAt(n++, o.matrix);
      }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// Culled levels: give the fixed pool of real lights to the light sources nearest the player (copying position,
// colour, range and the intensity flicker set this frame). A light fades out over `fadeBand` m before the
// nearest-N cut-off, so a light swapping out never pops.
function poolLights(st, p, used = st.lightPool.length) {   // used: how many of the pool are lit (quality.lights)
  const C = CONFIG.cull, pool = st.lightPool.slice(0, used), near = [];
  for (const l of st.lightSources) {
    const d = Math.hypot(l.position.x - p.x, l.position.y - p.y, l.position.z - p.z);
    if (d < C.lightRange && l.intensity > 0) near.push({ d, l });
  }
  near.sort((a, b) => a.d - b.d);
  const cut = near.length > pool.length ? Math.min(C.lightRange, near[pool.length].d) : C.lightRange;
  pool.forEach((q, i) => {
    const n = near[i];
    if (!n) { q.intensity = 0; return; }
    q.position.copy(n.l.position); q.color.copy(n.l.color); q.distance = n.l.distance; q.decay = n.l.decay;
    q.intensity = n.l.intensity * clamp((cut - n.d) / C.fadeBand, 0, 1);
  });
}

// The floor under a dressing item in level d (flat layouts: 0). Used while the stage is built, before `world` exists.
function floorOf(d, x, z, y) {
  if (d.layout !== 'rooms') return 0;
  const g = terrainFor(d).floorY(x, z, y);
  return Number.isFinite(g) ? g : 0;
}

// ---- the visuals controller --------------------------------------------------------------------------------
const visuals = (() => {
  const Q = VIS.quality;
  const hemi = new THREE.HemisphereLight(0x000000, 0x000000, 0); scene.add(hemi);
  // High: scene -> bloom -> tone mapping + sRGB -> grade, vignette and grain. Low: one plain render.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Q.high.msaa }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), VIS.bloom.strength, VIS.bloom.radius, VIS.bloom.threshold);
  const grade = new ShaderPass(GRADE_SHADER);
  composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(grade);
  const ash = makeAsh(), embers = makeEmberField(), decals = makeBloodDecals(), debris = makeDebris();
  let quality = Q[VIS.defaultQuality], def = null, A = {}, st = { bonfires: [], glows: [], lights: [] }, lowHp = 0, debrisTimer = 0;
  // Extensions (the Ultra preset, js/ultra-post.js): called on a quality change, after a stage is dressed, around each draw
  // and on a resize (with the drawn size in pixels).
  const hooks = { quality: [], stage: [], beforeDraw: [], afterDraw: [], resize: [] };

  function applyCounts() {
    const P = VIS.particles, a = A.ash || 0, d = A.dust || 0, amount = Math.min(1, a + d);
    ash.geometry.setDrawRange(0, Math.round(P.max * amount * quality.particles));
    ash.material.uniforms.uDustRatio.value = a + d > 0 ? d / (a + d) : 0;
    ash.visible = amount > 0;
    const ne = Math.round(VIS.embers.max * Math.min(1, (A.embers || 0) / 2) * quality.particles);
    embers.geometry.setDrawRange(0, ne); embers.visible = ne > 0; embers.userData.count = ne;
    if (st.smoke) st.smoke.geometry.setDrawRange(0, Math.max(1, Math.round(VIS.smoke.puffs * quality.particles)) * st.smoke.userData.columns);
    for (const b of st.bonfires) b.embers.geometry.setDrawRange(0, Math.round(VIS.bonfire.embers * quality.embers));
    if (st.shafts) st.shafts.visible = quality.shafts;
    if (st.grass) st.grass.count = Math.round(st.grass.userData.max * quality.grass);
    for (const g of st.glows) g.visible = quality.glows;
    if (WEATHER_MODE.simple !== quality.simpleSurfaces) {   // rebuild the stone shaders once
      WEATHER_MODE.simple = quality.simpleSurfaces;
      for (const m of WEATHERED) m.needsUpdate = true;
    }
    limitLights(true);
  }
  // Only the quality.lights nearest point lights are on; the number lit stays fixed, so shaders never recompile.
  // A culled level's pool is already nearest first (poolLights); an unculled level's lights are sorted here.
  function limitLights(all = false) {
    const L = st.lights, n = Math.min(quality.lights, L.length);
    if (n >= L.length) { if (all) for (const l of L) l.visible = true; return; }
    if (st.pooled) { L.forEach((l, i) => { l.visible = i < n; }); return; }
    const at = Game.player || camera.position, d = l => (l.position.x - at.x) ** 2 + (l.position.y - at.y) ** 2 + (l.position.z - at.z) ** 2;
    L.slice().sort((a, b) => d(a) - d(b)).forEach((l, i) => { l.visible = i < n; });
  }
  // Per-level look on top of applyAtmosphere (fog, moon, ambient): exposure, fill, rim, grade, weathering.
  function applyLook() {
    renderer.toneMappingExposure = A.exposure ?? VIS.exposure;
    const H = A.hemi || VIS.hemi;
    hemi.color.set(H.sky); hemi.groundColor.set(H.ground); hemi.intensity = H.intensity;
    if (A.rim !== undefined) RIM.color.value.set(A.rim);
    else RIM.color.value.copy(scene.fog.color).lerp(new THREE.Color(0xffffff), VIS.rim.mixWhite);
    const G = { ...VIS.grade, ...(A.grade || {}) }, u = grade.uniforms;
    u.uShadow.value.fromArray(G.shadowTint); u.uHigh.value.fromArray(G.highlightTint);
    u.uSat.value = G.saturation; u.uContrast.value = G.contrast;
    SURF.moss.value = A.surface && A.surface.moss !== undefined ? A.surface.moss : 1;
    SURF.grime.value = A.surface && A.surface.grime !== undefined ? A.surface.grime : 1;
    FOG_D.value = scene.fog.density;
    applyCounts();
  }

  function dressFlames(G, d, pools) {
    const F = VIS.flameGlow, P = VIS.pools;
    for (const f of flames) {
      if (f.group !== G) continue;
      const base = f.mesh.material.color.clone(), h = f.mesh.geometry.parameters.height;
      f.mesh.material.color.multiplyScalar(F.hdr);   // brighter than white, so bloom catches it
      const glow = glowSprite(base, 1, h * F.size, F.opacity, F.pierce);
      glow.position.copy(f.mesh.position); glow.position.y += h * 0.15; G.add(glow); st.glows.push(glow);
      if ((d.bonfires || []).some(b => Math.hypot(b.x - f.mesh.position.x, b.z - f.mesh.position.z) < 0.5)) continue;   // bonfires: own pool
      const src = f.light ? f.light.position : f.mesh.position, kind = f.light ? P.torch : P.brazier;
      pools.push({ x: src.x, y: floorOf(d, src.x, src.z, src.y), z: src.z, r: kind.radius, color: f.light ? f.light.color : base, k: kind.k });
    }
  }
  function dressBonfire(G, b, pools) {
    const B = VIS.bonfire, y = floorOf(def, b.x, b.z, b.y);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(B.coreSize, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(B.coreColor).multiplyScalar(B.coreBoost) }));
    core.position.set(b.x, y + 0.16, b.z); G.add(core);
    const n = Math.ceil(B.embers * MOST('embers')), seeds = new Float32Array(n * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
    const embers = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { uTime: vTime, uScale: PT_SCALE, uFlare: { value: 0 }, uRise: { value: B.rise },
                  uBase: { value: new THREE.Vector3(b.x, y + 0.35, b.z) }, uColor: { value: new THREE.Color(B.emberColor).multiplyScalar(2.5) } },
      vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    embers.frustumCulled = false; G.add(embers);
    const f = flames.find(f => f.group === G && f.light && Math.hypot(f.light.position.x - b.x, f.light.position.z - b.z) < 0.1);
    pools.push({ x: b.x, y, z: b.z, r: VIS.pools.bonfire.radius, color: new THREE.Color(B.coreColor), k: VIS.pools.bonfire.k });
    return { b, core, embers, light: f ? f.light : null, flare: 0, coreColor: core.material.color.clone() };
  }
  function dressHall(G, L, rnd, pools) {
    const S = { ...HALL_STYLE, ...(L.style || {}) }, hz = L.halfZ, wh = L.wallHeight, aw = L.alcoveWidth / 2;
    const nearGap = x => L.alcoves.some(a => Math.abs(a.x - x) < aw + 1) || L.gated.some(g => Math.abs(g.gateX - x) < 1.5);   // buildHall's pillar rule
    const atOpening = (x, side, m) => L.alcoves.some(a => a.side === side && Math.abs(a.x - x) < aw + m);
    const clearOf = (x, z, r) => !L.gated.some(g => Math.abs(g.gateX - x) < r) && !L.bonfires.some(b => Math.hypot(b.x - x, b.z - z) < r + 0.8)
      && Math.hypot(x - L.start.x, z - L.start.z) > 2.5;
    const rocks = [];
    for (const side of [1, -1]) for (let x = 1.2; x < L.length - 1.2; x += between(rnd, VIS.rubble.spacing)) {
      const z = side * (L.halfZ - 0.25);
      if (atOpening(x, side, 0.6) || !clearOf(x, z, 1.6)) continue;
      rubbleCluster(rocks, rnd, x, z, 1, 0, 0, -side);
    }
    if (rocks.length) G.add(rubbleMesh(rocks, rnd));
    // Ribs across the vault, springing from every n-th pillar pair.
    const pillars = [];
    for (let x = S.pillarStart; x < L.length - 1; x += S.pillarEvery) if (!nearGap(x)) pillars.push(x);
    const Ar = VIS.arches, spring = wh - Ar.spring, ribs = pillars.filter((_, i) => i % Ar.every === 0);
    if (ribs.length && spring > 2) {
      const m = new THREE.InstancedMesh(archGeometry(hz - 0.25, Ar.spring - 0.35, Ar.tube), MAT.wall, ribs.length), o = new THREE.Object3D();
      ribs.forEach((x, i) => { o.position.set(x, spring, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
      m.computeBoundingSphere(); G.add(m);
    }
    // Banners between pillars, alternating sides, clear of torches, gates and alcoves.
    const B = VIS.banners, banners = [];
    let k = 0;
    for (let i = 0; i + 1 < pillars.length; i++) {
      if (pillars[i + 1] - pillars[i] > S.pillarEvery + 0.1 || i % B.every) continue;
      const x = (pillars[i] + pillars[i + 1]) / 2, side = k++ % 2 ? 1 : -1;
      if (L.torches.some(t => t.side === side && Math.abs(t.x - x) < 2) || atOpening(x, side, 1) || !clearOf(x, side * hz, 1.5)) continue;
      banners.push({ x, y: wh - B.topGap - B.height / 2, z: side * (hz - 0.15), ry: side > 0 ? Math.PI : 0 });
    }
    if (banners.length) G.add(bannerMesh(banners, A.banners || B.colors));
    if (A.shafts) {
      const list = [];
      for (let x = A.shafts.every / 2; x < L.length - 2; x += A.shafts.every) {
        const sx = L.gated.some(g => Math.abs(g.gateX - x) < 3) ? x + 4 : x;
        list.push({ x: sx, z: (rnd() - 0.5) * hz * 0.9, h: wh, r: VIS.shafts.radius * (0.8 + rnd() * 0.5), tx: 0, tz: (rnd() - 0.5) * VIS.shafts.tilt * 2 });
      }
      addShafts(G, list, pools);
    }
  }
  // Every gate of a room level, and whether (x, z) on the floor at y can drop away (a trap's collapse area).
  const allGates = L => gatedEntries(L).map(z => z.gate);
  const onTrap = (L, x, z, y) => (L.traps || []).some(t => inRect(t.collapse, x, z) && trapRoom(terrainFor(L), t).lo === y);
  function dressRooms(G, L, rnd, pools) {
    const eps = 1e-6, rocks = [], faces = new Map(), gates = allGates(L), TR = terrainFor(L);
    const clearOf = (x, z, r) => !gates.some(g => Math.hypot(g.x - x, g.z - z) < g.width / 2 + r)
      && !L.bonfires.some(b => Math.hypot(b.x - x, b.z - z) < r + 0.8)
      && !L.rooms.some(R => (R.braziers || []).some(([bx, bz]) => Math.hypot(bx - x, bz - z) < r));
    // Rubble and banners along full walls of rooms (not ramps, rails or ledge faces), on that room's floor.
    for (const w of TR.solids) {
      if (w.kind !== 'wall' || !w.region || w.region.kind !== 'room') continue;
      const lx = w.x1 - w.x0, lz = w.z1 - w.z0, r = w.region.rect, y = w.region.lo;
      if (Math.max(lx, lz) < 1.5) continue;
      const alongX = w.edge === 'n' || w.edge === 's', hi = w.edge === 'n' || w.edge === 'e';
      const f = alongX ? { alongX, at: hi ? r[3] : r[2], n: hi ? -1 : 1, a0: w.x0, a1: w.x1 }
                       : { alongX, at: hi ? r[1] : r[0], n: hi ? -1 : 1, a0: w.z0, a1: w.z1 };
      const pt = (a, off) => alongX ? [a, f.at + f.n * off] : [f.at + f.n * off, a];
      for (let a = f.a0 + 0.6; a < f.a1 - 0.6; a += between(rnd, VIS.rubble.spacing)) {
        const [x, z] = pt(a, 0.25);
        if (!clearOf(x, z, 1.4) || inPit(w.region, x, z) || onTrap(L, x, z, y)) continue;
        rubbleCluster(rocks, rnd, x, z, alongX ? 1 : 0, alongX ? 0 : 1, alongX ? 0 : f.n, alongX ? f.n : 0, y);
      }
      if (!faces.has(w.region)) faces.set(w.region, []);
      faces.get(w.region).push({ ...f, pt, len: f.a1 - f.a0, y, top: w.y1 });
    }
    if (rocks.length) G.add(rubbleMesh(rocks, rnd));
    const B = VIS.banners, banners = [], shafts = [];
    for (const [R, list] of faces) {
      if (R.src.dim) continue;
      for (const f of list.sort((a, b) => b.len - a.len).slice(0, 2)) {
        if (f.len < 4 || f.top - f.y < B.height + B.topGap + 1) continue;
        const [x, z] = f.pt((f.a0 + f.a1) / 2, L.houses ? VIS.town.bannerOut : 0.15);   // in a town, clear of the jutting upper storeys
        if (!clearOf(x, z, 1.2)) continue;
        const ry = f.alongX ? (f.n > 0 ? 0 : Math.PI) : (f.n > 0 ? Math.PI / 2 : -Math.PI / 2);   // face into the room
        banners.push({ x, y: f.top - B.topGap - B.height / 2, z, ry });
      }
    }
    // Light shafts through the roof of each lit, roofed room.
    if (A.shafts) for (const R of TR.regions) {
      if (R.kind !== 'room' || R.open || R.src.dim) continue;
      const [x0, x1, z0, z1] = R.rect, w = x1 - x0, d = z1 - z0;
      shafts.push({ x: (x0 + x1) / 2 + (rnd() - 0.5) * w * 0.3, y: R.lo, z: (z0 + z1) / 2 + (rnd() - 0.5) * d * 0.3, h: R.height,
                    r: clamp(Math.min(w, d) * 0.12, 1.2, 2.4), tx: (rnd() - 0.5) * VIS.shafts.tilt * 2, tz: (rnd() - 0.5) * VIS.shafts.tilt * 2 });
    }
    if (banners.length) G.add(bannerMesh(banners, A.banners || B.colors));
    if (shafts.length) addShafts(G, shafts, pools);
    if (L.houses) dressTownStreets(G, L, TR, rnd, clearOf);   // js/town.js
  }
  function dressArena(G, Ar, rnd) {
    const rocks = [], hx = Ar.halfX, hz = Ar.halfZ;
    const fire = (x, z) => Ar.bonfires.some(b => Math.hypot(b.x - x, b.z - z) < 2.4);
    for (const s of [1, -1]) {
      for (let x = -hx + 1; x < hx - 1; x += between(rnd, VIS.rubble.spacing)) if (!fire(x, s * (hz - 0.25))) rubbleCluster(rocks, rnd, x, s * (hz - 0.25), 1, 0, 0, -s);
      for (let z = -hz + 1; z < hz - 1; z += between(rnd, VIS.rubble.spacing)) rubbleCluster(rocks, rnd, s * (hx - 0.25), z, 0, 1, -s, 0);
    }
    if (rocks.length) G.add(rubbleMesh(rocks, rnd));
    if (A.grass) {
      const R = Ar.pillarRing, px = hx + R.inset, pz = hz + R.inset, E = VIS.grass.extent;
      const avoid = (x, z) => (Math.abs(x) < hx + 1.6 && Math.abs(z) < hz + 1.6) || (Math.abs(Math.abs(x) - px) < R.base && Math.abs(z) < pz + R.base)
          || (Math.abs(Math.abs(z) - pz) < R.base && Math.abs(x) < px + R.base);
      st.grass = grassMesh(rnd, Math.round(VIS.grass.count * A.grass),
        () => { const x = (rnd() * 2 - 1) * E, z = (rnd() * 2 - 1) * E; return avoid(x, z) ? null : [x, -0.05, z]; });
      G.add(st.grass);
    }
  }
  // Grass on the open rooms that ask for it (`grass: true`), spread by area, clear of edges, pits, gates and fires.
  function addRoomGrass(G, L, rnd, open) {
    const rooms = open.filter(R => R.src.grass), m = VIS.grass.margin;
    const area = R => (R.rect[1] - R.rect[0] - 2 * m) * (R.rect[3] - R.rect[2] - 2 * m);
    const total = rooms.reduce((a, R) => a + Math.max(0, area(R)), 0);
    if (!total) return;
    const count = Math.min(VIS.grass.maxRoom, Math.round(total * VIS.grass.perSquareMetre * A.grass)), gates = allGates(L);
    const near = (x, z) => gates.some(g => Math.hypot(g.x - x, g.z - z) < g.width / 2 + 1.5) || L.bonfires.some(b => Math.hypot(b.x - x, b.z - z) < 2.2)
      || (L.ramps || []).some(r => x > r.rect[0] - 1 && x < r.rect[1] + 1 && z > r.rect[2] - 1 && z < r.rect[3] + 1);
    st.grass = grassMesh(rnd, count, () => {
      let pick = rnd() * total, R = rooms[0];
      for (const r of rooms) { pick -= Math.max(0, area(r)); if (pick <= 0) { R = r; break; } }
      const x = R.rect[0] + m + rnd() * (R.rect[1] - R.rect[0] - 2 * m), z = R.rect[2] + m + rnd() * (R.rect[3] - R.rect[2] - 2 * m);
      if (inPit(R, x, z) || near(x, z) || onTrap(L, x, z, R.lo) || (R.src.pillars || []).some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.4)) return null;
      return [x, R.lo - 0.05, z];
    }, VIS.grass.roomSize);
    G.add(st.grass);
  }
  // The far castle, dark against the sky, its edges lit by the sun behind it; the camera's far plane reaches it.
  function addLandmark(G, Lm, rnd) {
    const V = VIS.landmark, sky = A.sky || {};
    const m = new THREE.Mesh(landmarkGeometry(rnd, Lm.width, Lm.height), new THREE.ShaderMaterial({
      uniforms: { uDark: { value: new THREE.Color(V.dark) }, uHaze: { value: scene.fog.color.clone() }, uHazeAmt: { value: V.haze },
                  uSun: { value: new THREE.Color(sky.sun ?? 0xffa060) }, uSunDir: { value: new THREE.Vector3(...(sky.sunDir || [0, 1, 0])) },
                  uRim: { value: V.rim }, uRimPow: { value: V.rimPower } },
      vertexShader: LANDMARK_VERT, fragmentShader: LANDMARK_FRAG }));
    m.position.set(Lm.x, Lm.y ?? 0, Lm.z);
    m.rotation.y = Math.atan2(-Lm.x, -Lm.z);   // its front toward the level
    G.add(m);
    const reach = Math.hypot(Lm.x, Lm.z) + Lm.width + VIS.landmark.margin;
    camera.far = Math.max(camera.far, reach); camera.updateProjectionMatrix();
    return m;
  }
  function addShafts(G, list, pools) {
    st.shafts = shaftMesh(list, A.shafts); G.add(st.shafts);
    for (const s of list) pools.push({ x: s.x, y: s.y || 0, z: s.z, r: s.r * 1.5, color: new THREE.Color(A.shafts.color), k: VIS.pools.shaft.k * A.shafts.opacity * 5 });
  }
  function addSky(G, S) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(170, 32, 16), new THREE.ShaderMaterial({
      uniforms: { uZen: { value: new THREE.Color(S.zenith) }, uHor: { value: scene.fog.color.clone() }, uSun: { value: new THREE.Color(S.sun) },
                  uSunDir: { value: new THREE.Vector3(...S.sunDir).normalize() } },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false }));
    m.renderOrder = -1; m.frustumCulled = false; G.add(m);
    return m;
  }
  // Rings of distant ruins around (cx, cz), each pushed out by `extra` m (a room level's own size).
  function addSilhouettes(G, rnd, layers, cx = 0, cz = 0, extra = 0) {
    const S = VIS.silhouettes, dark = new THREE.Color(S.dark);
    for (let i = 0; i < layers; i++) {
      const m = new THREE.Mesh(silhouetteGeometry(rnd, S.radii[i] + extra), new THREE.MeshBasicMaterial({ color: scene.fog.color.clone().lerp(dark, S.mix[i]), fog: false }));
      m.position.set(cx, 0, cz); G.add(m);
    }
  }
  // Static level boxes (walls, floor seams, pillars, logs...) merged into one mesh per material: hundreds
  // of draw calls become a handful. Collision never used these meshes (it reads the level data), and
  // moving parts (gates, flames, bonfire cores) are left alone.
  function mergeStatic(G, keep) {
    G.updateMatrixWorld(true);
    const byMat = new Map(), merged = [];
    G.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || keep.has(o) || !o.geometry.index || !o.geometry.attributes.uv) return;
      for (let a = o.parent; a && a !== G; a = a.parent) if (keep.has(a)) return;
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(o);
    });
    for (const [mat, list] of byMat) {
      if (list.length < 2) continue;
      const geos = list.map(o => {
        const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
        return g;
      });
      const geo = mergeGeometries(geos);
      geos.forEach(g => g.dispose());
      if (!geo) continue;
      for (const o of list) { o.parent.remove(o); o.geometry.dispose(); }
      merged.push(new THREE.Mesh(geo, mat));
    }
    for (const m of merged) G.add(m);
  }
  // A gate lifts (or topples) as one piece: merge its parts in the gate's own space, one mesh per material.
  function mergeGate(g) {
    const byMat = new Map();
    for (const o of g.children) if (o.isMesh && o.geometry.index && o.geometry.attributes.uv) {
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(o);
    }
    for (const [mat, list] of byMat) {
      if (list.length < 2) continue;
      const geos = list.map(o => {
        o.updateMatrix(); const q = o.geometry.clone().applyMatrix4(o.matrix);
        for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k);
        return q;
      });
      const geo = mergeGeometries(geos);
      geos.forEach(q => q.dispose());
      if (!geo) continue;
      for (const o of list) { g.remove(o); o.geometry.dispose(); }
      g.add(new THREE.Mesh(geo, mat));
    }
  }
  function insideLevel(x, z) {
    if (def.layout === 'rooms') return insideRooms(def.rooms, x, z, 0.4);
    if (def.layout === 'hall') return x > 0.5 && x < def.length - 0.5 && Math.abs(z) < def.halfZ - 0.3;
    return false;
  }

  return {
    hooks, composer, passes: { bloom, grade },
    quality: () => quality,
    lowHealth: () => lowHp,
    lights: () => st.lights,   // the point lights quality.lights limits (visible ones are lit this frame)
    look: () => A,
    decals,
    qualityLabel: name => (Q[name] || Q[VIS.defaultQuality]).label,
    nextQuality(name, d) { const k = Object.keys(Q), i = Math.max(0, k.indexOf(name)); return k[(i + d + k.length * 2) % k.length]; },
    setQuality(name) {
      quality = Q[name] || Q[VIS.defaultQuality];
      bloom.enabled = quality.bloom;
      const samples = Math.min(quality.msaa, renderer.capabilities.maxSamples || 4);   // the post target's MSAA
      for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples !== samples) { rt.samples = samples; rt.dispose(); }
      for (const h of hooks.quality) h(quality);
      grade.uniforms.uVig.value = quality.vignette ? VIS.vignette.strength : 0;
      grade.uniforms.uVigSoft.value = VIS.vignette.softness;
      grade.uniforms.uGrain.value = quality.grain ? (quality.ultra ? VIS.grain.ultra : VIS.grain.amount) : 0;
      this.resize(window.innerWidth, window.innerHeight);
      applyCounts();
      if (stage && Game.player && Game.mode !== 'menu') this.warmUp(Game.cam);   // each quality draws through its own path, with its own shaders (from the title: at the next start)
      if (Game.mode === 'pause' && stage) this.draw();   // show the change behind the options menu
    },
    // Draw every pooled effect once, fully transparent and in front of the camera (cam: { pos, look }), so that its
    // shader is ready before play starts rather than compiled the moment a first hit, block or landing shows it.
    warmUp(cam) {
      camera.position.copy(cam.pos); camera.lookAt(cam.look); camera.updateMatrixWorld();
      const at = new THREE.Vector3(0, 0, -3).applyMatrix4(camera.matrixWorld);
      const saved = pooledFx.map(m => [m, m.visible, m.position.clone(), m.material.opacity]);
      for (const m of pooledFx) { m.visible = true; m.position.copy(at); m.material.opacity = 0; }
      this.draw();
      for (const [m, visible, pos, opacity] of saved) { m.visible = visible; m.position.copy(pos); m.material.opacity = opacity; }
    },
    resize(w, h) {
      w = Math.max(1, w); h = Math.max(1, h);
      const pr = Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio) * quality.renderScale;
      renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
      composer.setPixelRatio(pr); composer.setSize(w, h);
      bloom.setSize(Math.max(1, Math.round(w * pr * quality.bloomScale)), Math.max(1, Math.round(h * pr * quality.bloomScale)));   // a soft glow: drawn smaller
      grade.uniforms.uRes.value.set(w * pr, h * pr);
      PT_SCALE.value = h * pr / (2 * Math.tan(THREE.MathUtils.degToRad(CONFIG.camera.fov) / 2));
      for (const f of hooks.resize) f(Math.round(w * pr), Math.round(h * pr));
    },
    // Called once per stage build (loadStage), after applyAtmosphere. Everything added goes in the stage group.
    dressStage(d, built) {
      def = d; A = d.atmosphere || {}; st = { bonfires: [], glows: [], lights: [] };
      decals.clear(); debris.clear();
      const G = built.group, rnd = seeded(strSeed(d.id)), pools = [];
      G.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) weather(o.material, 'stone'); });   // room materials
      dressFlames(G, d, pools);
      for (const b of d.bonfires || []) st.bonfires.push(dressBonfire(G, b, pools));
      if (d.layout === 'hall') dressHall(G, d, rnd, pools);
      else if (d.layout === 'rooms') dressRooms(G, d, rnd, pools);
      else dressArena(G, d, rnd);
      // Room levels: the sky, distant ruins and grass belong to open rooms, so a level without any shows none.
      const rooms = d.layout === 'rooms', open = rooms ? terrainFor(d).regions.filter(R => R.kind === 'room' && R.open) : [];
      camera.far = VIS.farPlane; camera.updateProjectionMatrix();
      if (A.sky && (!rooms || open.length)) st.sky = addSky(G, A.sky);
      if (A.silhouettes && !rooms) addSilhouettes(G, rnd, A.silhouettes);
      if (A.silhouettes && open.length) {
        const all = terrainFor(d).regions.map(R => R.rect), x0 = Math.min(...all.map(r => r[0])), x1 = Math.max(...all.map(r => r[1]));
        const z0 = Math.min(...all.map(r => r[2])), z1 = Math.max(...all.map(r => r[3])), extra = Math.hypot(x1 - x0, z1 - z0) / 2 * VIS.silhouettes.roomSpread;
        addSilhouettes(G, rnd, A.silhouettes, (x0 + x1) / 2, (z0 + z1) / 2, extra);
        camera.far = Math.max(VIS.farPlane, (extra + VIS.silhouettes.radii[A.silhouettes - 1]) * 2 + 20); camera.updateProjectionMatrix();
      }
      if (A.grass && open.length) addRoomGrass(G, d, rnd, open);
      if (A.landmark) st.landmark = addLandmark(G, A.landmark, rnd);
      if (built.smoke && built.smoke.length) { st.smoke = smokeMesh(built.smoke); G.add(st.smoke); }
      if (pools.length) { const m = poolMesh(pools); G.add(m); st.glows.push(m); }
      st.lights = built.lightPool || []; st.pooled = !!built.lightPool;   // the lights quality.lights limits: the pool, or every light of an unculled level
      if (!built.lightPool) G.traverse(o => { if (o.isPointLight) st.lights.push(o); });
      for (const g of built.gates) mergeGate(g.mesh);
      mergeStatic(G, new Set([...built.gates.map(g => g.mesh), ...(built.traps || []).map(t => t.group), ...flames.filter(f => f.group === G).map(f => f.mesh),
                              ...st.bonfires.map(b => b.core), ...(st.sky ? [st.sky] : []), ...(st.landmark ? [st.landmark] : [])]));
      applyLook();
      for (const h of hooks.stage) h(d, built);
    },
    render(game, t, dt) {
      vTime.value = t;
      ash.material.uniforms.uCam.value.copy(camera.position);
      embers.material.uniforms.uCam.value.copy(camera.position);
      if (st.sky) st.sky.position.copy(camera.position);
      const B = VIS.bonfire;
      for (const f of st.bonfires) {   // slow breathing glow; a soft flare after resting
        f.flare = Math.max(0, f.flare - dt / B.flareTime);
        const fl = ease(f.flare), pulse = 1 + Math.sin(t * Math.PI * 2 / B.pulsePeriod + f.b.x) * B.pulse;
        if (f.light) f.light.intensity *= pulse * (1 + fl * B.flareLight);   // the flame flicker set it fresh this frame
        f.core.scale.setScalar(pulse * (1 + fl * B.flareCore)); f.core.scale.y *= 0.6;
        f.core.material.color.copy(f.coreColor).multiplyScalar(pulse * (1 + fl));
        f.embers.material.uniforms.uFlare.value = fl;
      }
      decals.update(dt);
      const D = VIS.debris, p = game.player;
      if (A.debris && quality.debris && p && p.alive() && def.layout !== 'arena') {
        debrisTimer -= dt;
        if (debrisTimer <= 0) {
          debrisTimer = D.interval / A.debris * rand(0.5, 1.5);
          const a = rand(0, Math.PI * 2), r = rand(2, D.radius), x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
          const roof = world.ceilingAt(x, z, p.y + 1), ground = world.groundAt(x, z, p.y + 1);   // none under open sky
          if (insideLevel(x, z) && roof < Infinity && ground > -Infinity) for (let i = 0, n = 1 + Math.floor(rand(0, 3)); i < n; i++)
            debris.drop(x + rand(-0.4, 0.4), roof - 0.3, z + rand(-0.4, 0.4), rand(0.05, 0.14), ground);
        }
      }
      debris.update(dt);
      if (stage && stage.lightPool && p) poolLights(stage, p, Math.min(quality.lights, stage.lightPool.length));
      limitLights();
      const V = VIS.vignette, want = p && p.alive() ? clamp((V.lowHealthAt - p.hp / p.maxHp) / V.lowHealthAt, 0, 1) : 0;
      lowHp += (want - lowHp) * (1 - Math.exp(-V.lowHealthRate * dt));
      this.draw();
    },
    draw() {
      for (const h of hooks.beforeDraw) h(quality);
      if (!quality.post) renderer.render(scene, camera);
      else {
        grade.uniforms.uTime.value = vTime.value; grade.uniforms.uLow.value = quality.vignette ? lowHp : 0;
        composer.render();
      }
      for (const h of hooks.afterDraw) h(quality);
    },
    // Event reactions (registerVisualListeners).
    blood(at, size, burst = true) {
      const B = VIS.blood;
      if (burst) spawnBurst(at, B.burst);
      const x = at.x + rand(-B.spread, B.spread), z = at.z + rand(-B.spread, B.spread), ground = world.groundAt(x, z, at.y);
      if (ground > -Infinity) decals.splat(x, z, between(Math.random, B.size) * size, ground);
    },
    flare(bonfire) { const f = st.bonfires.find(f => f.b === bonfire); if (f) f.flare = 1; },
    // What the current stage draws, for tests and tuning.
    info() {
      let lights = 0;
      scene.traverse(o => { if (o.isPointLight && !o.userData.ultra) lights++; });   // the Ultra preset's own lights not counted
      const grassAt = [], m4 = new THREE.Matrix4(), v = new THREE.Vector3();
      if (st.grass) for (let i = 0; i < st.grass.userData.max; i++) { st.grass.getMatrixAt(i, m4); grassAt.push(v.setFromMatrixPosition(m4).toArray()); }
      return { sky: !!st.sky, grass: st.grass ? st.grass.count : 0, grassAt, pointLights: lights, far: camera.far,
               landmark: !!st.landmark, smoke: st.smoke ? st.smoke.userData.columns : 0, embers: embers.visible ? embers.userData.count : 0,
               pool: stage && stage.lightPool ? stage.lightPool.map(l => l.intensity) : null };
    },
    gateDust(g) {
      if (!quality.debris || !def || def.layout === 'arena') return;
      for (let i = 0; i < VIS.debris.gateBurst; i++) {
        const x = g.box ? rand(g.box.x0, g.box.x1) : g.x + rand(-0.3, 0.3), z = g.box ? rand(g.box.z0, g.box.z1) : rand(-def.halfZ, def.halfZ) * 0.9;
        debris.drop(x, (g.y || 0) + def.gateHeight + rand(0, 1.2), z, rand(0.05, 0.12), g.y || 0);
      }
    },
  };
})();

// Visual reactions to game events. Read-only: they never touch combat state.
function registerVisualListeners() {
  const chest = b => ({ x: b.x, y: b.y + b.height * 0.55, z: b.z });
  events.on('strike', d => { if (!d.blocked && !d.target.training) visuals.blood(d.at, 1); });
  events.on('enemyDeath', d => { if (!d.enemy.training) visuals.blood({ x: d.enemy.x, y: d.enemy.y + 0.2, z: d.enemy.z }, VIS.blood.deathSize, false); });
  events.on('playerDeath', d => visuals.blood(chest(d.player), VIS.blood.deathSize));
  events.on('rest', d => visuals.flare(d.bonfire));
  events.on('gateOpened', d => visuals.gateDust(d.gate));
  events.on('perilous', d => groundFx.ring(d.enemy.x, d.enemy.z, VIS.rollOnlyGlow.ring * d.enemy.def.scale, VIS.rollOnlyGlow.color, VIS.rollOnlyGlow.opacity, d.enemy.y));
}
