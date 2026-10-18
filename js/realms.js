'use strict';
// ============================================================================
// Realms (v7.0): the set pieces of the Lands Between (drawing only)
// ============================================================================
// A level may carry a `realm` (js/levels/lands/*.js): the things that make each land its own, all drawn and none touched.
//   tree      { kind: 'golden' | 'burnt' | 'haligtree', x, z, y?, height, width }: a colossal tree on the horizon (the
//             Erdtree aglow, the Erdtree burnt to a black husk with embers in its bark, the pale Haligtree)
//   stars     { count?, color?, band?: [colour, colour] }: a night sky of stars and a band of coloured mist (the Evergaol)
//   lightning { every: [s, s], color }: bolts far off in the sky, a flash of light over the land and thunder after it
//   weather   [{ kind: 'rain' | 'snow' | 'leaves' | 'motes' | 'spores' | 'ash' | 'petals', amount (0..2), color?, colors? }]:
//             falling or drifting things in a box round the camera; under a roof they fade (rain does not fall indoors)
//   clouds    { y, color, light }: a sea of cloud below the level (Farum Azula, the Haligtree's heights)
//   floaters  { kind: 'rock' | 'ruin', count, at: [x, z], radius: [r0, r1], y: [y0, y1], color }: ruins adrift far off
//   dragon    { at: [x, z], radius, y, speed, color }: a dragon circling far out in the sky
//   halos     [{ x, y, z, r, color, tilt? }]: rings of golden light hung in the air
//   runes     [{ x, y?, z, r, color }]: glowing rune circles on a floor
//   pools     [{ rect, y?, kind: 'rot' | 'gold' | 'water' }]: liquid over a floor (a rot hazard draws its own pool)
//   roots     [{ pts: [[x, y, z], ...], r, color? }]: giant roots or branches (scenery: keep them off the walkways)
//   blooms    [{ x, y?, z, r, count? }]: scarlet rot flowers scattered on a floor
//   beams     colour: a pillar of grace light over every bonfire, seen from afar (the way on)
//   pillars   [{ x, z, y0, y1, r, color }]: colossal columns on the horizon
//   grounds   [{ kind: 'earth' | 'snow' | 'bark' | 'goldbark' | 'palebark' | 'ash', rooms: [ids] }]: a natural surface laid
//             over those rooms' floors (earth and grass on a heath, the grain of a branch, snow, ash with embers in it); it
//             leaves out trap floors, and sits under blood and cracks
// Tuning: CONFIG.VISUALS.realms. Quality: particle counts follow the preset's `particles` (more on Ultra), floaters,
// stars and the tree's crown follow it too; no light is added but one ambient flash, so no shader ever recompiles.
const REALM_KEYS = ['tree', 'stars', 'lightning', 'weather', 'clouds', 'floaters', 'dragon', 'halos', 'runes', 'pools', 'roots', 'blooms', 'beams', 'pillars', 'grounds'];
const REALM_GROUNDS = ['earth', 'snow', 'bark', 'goldbark', 'palebark', 'ash'];
const REALM_WEATHER = ['rain', 'snow', 'leaves', 'motes', 'spores', 'ash', 'petals'];
const REALM_TREES = ['golden', 'burnt', 'haligtree'];
const REALM_POOLS = ['rot', 'gold', 'water'];

// Checked at load (validateData): the shape of every level's realm.
function checkRealmData(need, num) {
  const isCol = v => Number.isInteger(v) && v >= 0 && v <= 0xffffff, pair = v => Array.isArray(v) && v.length === 2 && v.every(num);
  const tri = v => Array.isArray(v) && v.length === 3 && v.every(num), rect = r => Array.isArray(r) && r.length === 4 && r.every(num) && r[0] < r[1] && r[2] < r[3];
  for (const kind of REALM_TREES) {
    const T = CONFIG.VISUALS.realms.tree[kind];
    need(T && ['glow', 'glowAmt', 'vein', 'haze'].every(k => num(T[k]) && T[k] >= 0),
      `CONFIG.VISUALS.realms.tree.${kind}: glow, glowAmt, vein and haze must be finite nonnegative numbers.`);
  }
  for (const L of ALL_LEVELS) {
    const R = L.realm, w = `Level "${L.id}" realm`;
    if (!R) continue;
    for (const k of Object.keys(R)) need(REALM_KEYS.includes(k), `${w}: unknown field "${k}" (known: ${REALM_KEYS.join(', ')}).`);
    if (R.tree) need(REALM_TREES.includes(R.tree.kind) && num(R.tree.x) && num(R.tree.z) && num(R.tree.height) && num(R.tree.width) && (!('y' in R.tree) || num(R.tree.y)),
      `${w}: tree needs kind (${REALM_TREES.join(', ')}), x, z, height and width.`);
    if (R.stars) need((!('count' in R.stars) || Number.isInteger(R.stars.count)) && (!('color' in R.stars) || isCol(R.stars.color)) && (!('band' in R.stars) || (Array.isArray(R.stars.band) && R.stars.band.every(isCol))),
      `${w}: stars take a count, a colour and a band of colours.`);
    if (R.lightning) need(pair(R.lightning.every) && R.lightning.every[0] > 0 && R.lightning.every[0] <= R.lightning.every[1] && isCol(R.lightning.color), `${w}: lightning needs every [s, s] and a colour.`);
    if (R.weather) need(Array.isArray(R.weather) && R.weather.every(W => W && REALM_WEATHER.includes(W.kind) && num(W.amount) && W.amount > 0 && W.amount <= 2
      && (!('color' in W) || isCol(W.color)) && (!('colors' in W) || (Array.isArray(W.colors) && W.colors.length && W.colors.every(isCol)))),
      `${w}: weather is a list of { kind (${REALM_WEATHER.join(', ')}), amount (0..2], color?, colors? }.`);
    if (R.clouds) need(num(R.clouds.y) && isCol(R.clouds.color) && isCol(R.clouds.light), `${w}: clouds need y, color and light.`);
    if (R.floaters) need(['rock', 'ruin'].includes(R.floaters.kind) && Number.isInteger(R.floaters.count) && pair(R.floaters.at) && pair(R.floaters.radius) && pair(R.floaters.y) && isCol(R.floaters.color),
      `${w}: floaters need kind (rock, ruin), count, at, radius, y and color.`);
    if (R.dragon) need(pair(R.dragon.at) && num(R.dragon.radius) && num(R.dragon.y) && num(R.dragon.speed) && isCol(R.dragon.color), `${w}: dragon needs at, radius, y, speed and color.`);
    for (const H of R.halos || []) need(num(H.x) && num(H.y) && num(H.z) && num(H.r) && isCol(H.color), `${w}: a halo needs x, y, z, r and a colour.`);
    for (const U of R.runes || []) need(num(U.x) && num(U.z) && num(U.r) && isCol(U.color), `${w}: a rune needs x, z, r and a colour.`);
    for (const P of R.pools || []) need(rect(P.rect) && REALM_POOLS.includes(P.kind), `${w}: a pool needs a rect and a kind (${REALM_POOLS.join(', ')}).`);
    for (const T of R.roots || []) need(Array.isArray(T.pts) && T.pts.length >= 2 && T.pts.every(tri) && num(T.r) && T.r > 0, `${w}: a root needs pts ([x, y, z] x 2+) and r.`);
    for (const B of R.blooms || []) need(num(B.x) && num(B.z) && num(B.r), `${w}: blooms need x, z and r.`);
    if ('beams' in R) need(isCol(R.beams), `${w}: beams is a colour.`);
    for (const P of R.pillars || []) need(num(P.x) && num(P.z) && num(P.y0) && num(P.y1) && P.y1 > P.y0 && num(P.r) && isCol(P.color), `${w}: a pillar needs x, z, y0 < y1, r and a colour.`);
    for (const G of R.grounds || []) need(G && REALM_GROUNDS.includes(G.kind) && Array.isArray(G.rooms) && G.rooms.every(id => (L.rooms || []).some(r => r.id === id)),
      `${w}: a ground needs a kind (${REALM_GROUNDS.join(', ')}) and rooms of the level.`);
  }
}

const realms = (() => {
  const C = CONFIG.VISUALS.realms, V3 = THREE.Vector3;
  const uTime = { value: 0 }, uCam = { value: new V3() };
  let st = null;   // { def, group, parts: [...], flash, bolts, timer, ... } for the stage being drawn

  // ---- shared shader pieces -----------------------------------------------------------------------------------------
  // Far scenery (the tree, columns, cliffs): its own haze toward the fog colour (scene fog would swallow it whole), its
  // rim lit by the sun, and a glow channel (`glow` attribute) that breathes slowly: the Erdtree's light, the embers in a
  // burnt trunk.
  const FAR_VERT = `attribute vec3 color; attribute float glow; varying vec3 vC; varying vec3 vW; varying vec3 vN; varying float vG;
void main() { vC = color; vG = glow; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w; }`;
  const FAR_FRAG = `uniform vec3 uHaze, uSun, uSunDir, uGlowC; uniform float uHazeAmt, uGlow, uTime, uRim; varying vec3 vC; varying vec3 vW; varying vec3 vN; varying float vG;
void main() {
  vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
  float rim = pow(clamp(1.0 - abs(dot(n, v)), 0.0, 1.0), 2.4), sun = max(dot(n, normalize(uSunDir)), 0.0);
  float pulse = 0.75 + 0.25 * sin(uTime * 0.5 + vW.y * 0.015 + vW.x * 0.01);
  vec3 c = vC * (0.32 + 0.68 * sun) + uSun * rim * uRim + uGlowC * vG * uGlow * pulse;
  float low = 1.0 - smoothstep(0.0, 140.0, vW.y);
  c = mix(c, uHaze, clamp(uHazeAmt + low * 0.3, 0.0, 0.92) * (1.0 - vG * 0.55));
  gl_FragColor = vec4(c, 1.0);
  ${COLOR_OUT}
}`;
  // Weather: instanced quads wrapped in a box round the camera; rain stands up, everything else faces the camera and turns.
  const WX_VERT = `attribute vec4 seed; attribute vec3 tint;
uniform float uTime, uFall, uSway, uSpin, uRain, uGrow; uniform vec2 uSize; uniform vec3 uCam, uBox, uWind;
varying vec2 vUv; varying float vA; varying vec3 vTint; varying float vS;
void main() {
  vec3 base = (seed.xyz - 0.5) * uBox;
  float t = uTime * (0.7 + 0.6 * seed.w);
  vec3 drift = vec3(sin(uTime * 0.7 + seed.w * 40.0) * uSway, -t * uFall + sin(uTime * 0.5 + seed.x * 20.0) * uSway * 0.4, cos(uTime * 0.6 + seed.y * 30.0) * uSway) + uWind * uTime;
  vec3 w = uCam + (fract((base + drift - uCam) / uBox) - 0.5) * uBox;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  if (uRain > 0.5) { vec3 tc = normalize(vec3(cameraPosition.x - w.x, 0.0, cameraPosition.z - w.z)); right = normalize(cross(vec3(0.0, 1.0, 0.0), tc)); up = normalize(vec3(uWind.x * 0.05, 1.0, uWind.z * 0.05)); }
  float a = uSpin * (uTime * (seed.w - 0.5) * 2.0 + seed.x * 6.28);
  vec2 q = position.xy * uSize * (0.6 + 0.8 * seed.w) * (1.0 + uGrow * sin(uTime * 2.0 + seed.y * 30.0) * 0.3);
  if (uRain < 0.5) q = vec2(q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a));
  vec3 p = w + right * q.x + up * q.y;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  vA = smoothstep(0.5, 2.0, d) * (1.0 - smoothstep(uBox.x * 0.3, uBox.x * 0.5, length(w.xz - uCam.xz)));
  vUv = position.xy + 0.5; vTint = tint; vS = seed.w;
}`;
  const WX_FRAG = `uniform float uOpacity, uShape, uCover, uFlash; varying vec2 vUv; varying float vA; varying vec3 vTint; varying float vS;
void main() {
  vec2 c = vUv - 0.5; float a;
  if (uShape < 0.5) a = smoothstep(0.5, 0.0, abs(c.x) * 2.0) * smoothstep(0.5, 0.2, abs(c.y));                       // rain: a streak
  else if (uShape < 1.5) a = smoothstep(0.5, 0.12, length(c));                                                         // snow, motes, spores, ash: a soft dot
  else { vec2 l = vec2(c.x * 2.2, c.y); a = smoothstep(0.5, 0.42, length(l)) * (0.75 + 0.25 * smoothstep(0.04, 0.0, abs(c.x))); }   // a leaf or petal
  a *= vA * uOpacity * (1.0 - uCover);
  if (a < 0.004) discard;
  gl_FragColor = vec4(vTint * (1.0 + uFlash), a);
  ${COLOR_OUT}
}`;
  // A sea of cloud below: two drifting layers of soft noise, lit on their tops toward the sun.
  const CLOUD_VERT = `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const CLOUD_FRAG = `uniform vec3 uColor, uLight, uHaze; uniform float uTime, uScale, uOpacity, uFlash; uniform vec2 uCenter; varying vec3 vW;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += n(p) * a; p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec2 p = vW.xz * uScale + vec2(uTime * 0.012, uTime * 0.005);
  float d = fbm(p), d2 = fbm(p * 1.7 + 4.0 + uTime * 0.01);
  float cov = smoothstep(0.32, 0.72, d * 0.7 + d2 * 0.4);
  vec3 c = mix(uColor, uLight * (1.0 + uFlash * 2.0), smoothstep(0.45, 0.9, d2));
  float r = length(vW.xz - uCenter);
  c = mix(c, uHaze, smoothstep(250.0, 900.0, r));
  gl_FragColor = vec4(c, cov * uOpacity * (1.0 - smoothstep(700.0, 1100.0, r)));
  ${COLOR_OUT}
}`;
  // A rune circle on the floor: two rings, a ring of glyph ticks between them, and spokes that turn slowly.
  const RUNE_FRAG = `uniform vec3 uColor; uniform float uTime, uOpacity; varying vec2 vUv;
void main() {
  vec2 c = vUv * 2.0 - 1.0; float r = length(c), a = atan(c.y, c.x);
  float ring = smoothstep(0.03, 0.0, abs(r - 0.94)) + smoothstep(0.02, 0.0, abs(r - 0.72)) * 0.8 + smoothstep(0.015, 0.0, abs(r - 0.3)) * 0.6;
  float ticks = step(0.76, r) * step(r, 0.9) * step(0.55, fract(a * 24.0 / 6.2832 + uTime * 0.05)) * step(fract(a * 24.0 / 6.2832 * 3.0), 0.7) * 0.55;
  float spokes = smoothstep(0.02, 0.0, abs(sin(a * 3.0 + uTime * 0.2))) * step(0.3, r) * step(r, 0.72) * 0.35;
  float pulse = 0.7 + 0.3 * sin(uTime * 1.3);
  float k = (ring + ticks + spokes) * pulse * step(r, 1.0);
  gl_FragColor = vec4(uColor * k * uOpacity, 1.0);
  ${COLOR_OUT}
}`;
  const UV_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  // Liquid: the scarlet rot (a deep red surface with bright blooms slowly swelling and breaking), molten gold, dark water.
  const POOL_VERT = `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const POOL_FRAG = `uniform vec3 uDeep, uBright; uniform float uTime, uKind; varying vec3 vW;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
void main() {
  vec2 p = vW.xz * 0.35;
  float a = n(p + vec2(uTime * 0.07, uTime * 0.03)), b = n(p * 2.3 - vec2(uTime * 0.05, -uTime * 0.08));
  float spots = smoothstep(0.62, 0.9, n(p * 1.3 + vec2(0.0, uTime * 0.02)) * 0.7 + b * 0.5);
  vec3 c = mix(uDeep, uBright, spots * (0.6 + 0.4 * sin(uTime * 1.7 + a * 9.0)));
  c += uBright * 0.15 * smoothstep(0.5, 0.95, a);
  gl_FragColor = vec4(c, 0.92);
  ${COLOR_OUT}
}`;
  // A pillar of grace over a bonfire: soft, brightest at its foot, gone high up, a slow shimmer climbing it.
  const BEAM_VERT = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz;
  vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
  const BEAM_FRAG = `uniform vec3 uColor; uniform float uTime, uOpacity; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.0);
  float up = (1.0 - vUv.y) * smoothstep(0.0, 0.04, vUv.y);
  float sh = 0.75 + 0.25 * sin(vUv.y * 40.0 - uTime * 2.0);
  float d = length(vV), near = smoothstep(4.0, 14.0, d);
  gl_FragColor = vec4(uColor * edge * up * sh * near * uOpacity, 1.0);
  ${COLOR_OUT}
}`;
  // The stars: points on a dome round the camera that twinkle, and a band of soft coloured mist across the sky.
  const STAR_VERT = `attribute vec4 seed; uniform float uTime, uScale, uR; uniform vec3 uCam; varying float vA; varying float vT;
void main() {
  vec3 w = uCam + position * uR;
  vec4 mv = viewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.6 + 0.4 * sin(uTime * (1.0 + seed.x * 3.0) + seed.y * 40.0);
  vA = tw * smoothstep(-0.05, 0.15, position.y) * (0.4 + seed.z * 0.6); vT = seed.w;
  gl_PointSize = (1.0 + seed.z * 2.2 + seed.w * 18.0) * uScale;
}`;
  const STAR_FRAG = `uniform vec3 uColor, uBandA, uBandB; varying float vA; varying float vT;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.5, 0.0, d);
  vec3 c = vT > 0.01 ? mix(uBandA, uBandB, fract(vT * 7.0)) * core * 0.18 : uColor * core * (core > 0.5 ? 1.6 : 1.0);
  gl_FragColor = vec4(c * vA, 1.0);
  ${COLOR_OUT}
}`;

  const quality = () => visuals.quality();
  const qPart = () => { const q = quality(); return q.particles * (q.ultra ? C.ultraBoost : 1); };   // particle share for this preset
  const qMore = () => { const q = quality(); return q.ultra ? C.ultraBoost : q.post ? 1 : C.lowShare; };   // scenery share
  const add = (o, noDepth = true) => { if (noDepth) o.userData.noDepth = true; st.group.add(o); return o; };

  // ---- geometry helpers -----------------------------------------------------------------------------------------------
  // A tube swept along a curve, its radius r(t) tapering: positions, normals, and a colour and glow per vertex.
  function sweepTube(curve, r, seg, radial, col, glow) {
    const frames = curve.computeFrenetFrames(seg, false), pos = [], nor = [], colA = [], glA = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, p = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i], R = r(t);
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * Math.PI * 2, nx = Math.cos(a) * N.x + Math.sin(a) * B.x, ny = Math.cos(a) * N.y + Math.sin(a) * B.y, nz = Math.cos(a) * N.z + Math.sin(a) * B.z;
        pos.push(p.x + nx * R, p.y + ny * R, p.z + nz * R); nor.push(nx, ny, nz);
        const c = typeof col === 'function' ? col(t, a) : col; colA.push(c.r, c.g, c.b); glA.push(typeof glow === 'function' ? glow(t, a) : glow);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3)); g.setAttribute('glow', new THREE.Float32BufferAttribute(glA, 1)); g.setIndex(idx);
    return g;
  }
  // A lumpy blob (a cloud of leaves, a boulder): an icosahedron pushed about by noise, coloured and glowing.
  function blob(rnd, x, y, z, s, sy, col, glow, detail = 1) {
    const ico = new THREE.IcosahedronGeometry(1, detail), g = ico.index ? ico.toNonIndexed() : ico, p = g.attributes.position;
    g.deleteAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), k = 0.78 + 0.32 * Math.abs(Math.sin(vx * 3.1 + vy * 2.3 + vz * 4.7 + x * 0.01));
      p.setXYZ(i, x + vx * s * k, y + vy * sy * k, z + vz * s * k);
    }
    g.computeVertexNormals();
    const n = p.count, c = new Float32Array(n * 3), gl = new Float32Array(n);
    for (let i = 0; i < n; i++) { const k = 0.85 + 0.3 * rnd(); c[i * 3] = col.r * k; c[i * 3 + 1] = col.g * k; c[i * 3 + 2] = col.b * k; gl[i] = glow * (0.7 + 0.6 * rnd()); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('glow', new THREE.BufferAttribute(gl, 1));
    return g;
  }
  const farMaterial = (glowColor, glow, hazeAmt) => {
    const A = visuals.look(), sky = A.sky || {};
    return new THREE.ShaderMaterial({
      uniforms: { uHaze: { value: scene.fog.color.clone() }, uSun: { value: new THREE.Color(sky.sun ?? 0xffc080) }, uSunDir: { value: new V3(...(sky.sunDir || [0.3, 0.6, 0.4])) },
                  uGlowC: { value: new THREE.Color(glowColor) }, uHazeAmt: { value: hazeAmt }, uGlow: { value: glow }, uTime, uRim: { value: C.tree.rim } },
      vertexShader: FAR_VERT, fragmentShader: FAR_FRAG, fog: false });
  };
  const reach = d => { if (camera.far < d) { camera.far = d; camera.updateProjectionMatrix(); } };

  // ---- the colossal tree ------------------------------------------------------------------------------------------------
  function buildTree(T, rnd) {
    const K = C.tree[T.kind], H = T.height, W = T.width, y0 = T.y ?? 0, geos = [], more = qMore();
    const bark = new THREE.Color(K.bark), crown = new THREE.Color(K.crown), crown2 = new THREE.Color(K.crown2);
    // The trunk: strands that twist up out of splayed roots and part into the great boughs.
    const strands = 7, top = H * K.trunk;
    for (let s = 0; s < strands; s++) {
      const a0 = s / strands * Math.PI * 2, tw = (rnd() - 0.5) * 1.6, pts = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8, spread = W * (0.32 * Math.pow(1 - t, 3) + 0.05 + 0.02 * Math.sin(t * 9 + s)), a = a0 + tw * t;
        pts.push(new V3(Math.cos(a) * spread, y0 - 40 + (top + 40) * t, Math.sin(a) * spread));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      geos.push(sweepTube(curve, t => W * (0.07 - 0.03 * t) * (1 + 0.5 * Math.pow(1 - t, 4)), 28, 7, bark, (t, a) => K.vein * (Math.sin(t * 40 + a * 3 + s) > 0.85 ? 1 : 0.15)));
    }
    // The boughs, and on them the crown.
    const boughs = Math.round(K.boughs * Math.min(1, more));
    for (let b = 0; b < boughs; b++) {
      const a = b / boughs * Math.PI * 2 + rnd() * 0.4, lift = 0.35 + rnd() * 0.5, len = W * (0.45 + rnd() * 0.45), from = top * (0.82 + rnd() * 0.16);
      const p0 = new V3(Math.cos(a) * W * 0.04, y0 + from, Math.sin(a) * W * 0.04);
      const p1 = new V3(Math.cos(a) * len * 0.45, y0 + from + len * lift * 0.6, Math.sin(a) * len * 0.45);
      const p2 = new V3(Math.cos(a + 0.2) * len, y0 + from + len * lift + (K.droop ? -len * 0.25 : 0), Math.sin(a + 0.2) * len);
      const curve = new THREE.CatmullRomCurve3([p0, p1, p2]);
      geos.push(sweepTube(curve, t => W * 0.03 * (1 - 0.8 * t), 12, 5, bark, K.vein * 0.3));
      if (K.crownBlobs) {
        const n = Math.round(K.crownBlobs * more);
        for (let i = 0; i < n; i++) {
          const t = 0.55 + rnd() * 0.45, q = curve.getPointAt(t), s = W * (0.09 + rnd() * 0.12);
          geos.push(blob(rnd, q.x + (rnd() - 0.5) * s * 2, q.y + (rnd() - 0.2) * s * 1.2, q.z + (rnd() - 0.5) * s * 2, s, s * 0.7, rnd() < K.mix ? crown2 : crown, K.glow, more > 1 ? 2 : 1));
        }
      } else if (K.embers) {   // the burnt tree: broken stubs glowing where the fire still lives in the wood
        const n = Math.round(K.embers * more);
        for (let i = 0; i < n; i++) { const q = curve.getPointAt(0.3 + rnd() * 0.7), s = W * (0.012 + rnd() * 0.02); geos.push(blob(rnd, q.x, q.y, q.z, s, s, new THREE.Color(K.emberColor), 1, 0)); }
      }
    }
    // A cap of crown over the top, so the tree reads as one great dome from far away.
    if (K.crownBlobs) for (let i = 0; i < Math.round(K.cap * more); i++) {
      const a = rnd() * Math.PI * 2, r = W * 0.55 * Math.sqrt(rnd()), s = W * (0.12 + rnd() * 0.12);
      geos.push(blob(rnd, Math.cos(a) * r, y0 + top + W * (0.32 + 0.25 * (1 - r / W)) + rnd() * W * 0.1, Math.sin(a) * r, s, s * 0.6, rnd() < K.mix ? crown2 : crown, K.glow, more > 1 ? 2 : 1));
    }
    const geo = THREE_ADDONS.mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g));
    for (const g of geos) g.dispose();
    const mesh = new THREE.Mesh(geo, farMaterial(K.glowColor, K.glowAmt, K.haze));
    mesh.position.set(T.x, 0, T.z); mesh.frustumCulled = false;
    add(mesh, true);
    reach(Math.hypot(T.x, T.z) + W + H * 0.5);
    // Its light on the sky: a vast soft glow behind the crown.
    if (K.halo) { const h = glowSprite(K.glowColor, 1, W * 2.6, K.halo, null); h.material.fog = false; h.position.set(T.x, y0 + top + W * 0.3, T.z); add(h); }
    return mesh;
  }

  // ---- far columns ---------------------------------------------------------------------------------------------------
  function buildPillars(list, rnd) {
    const geos = list.map(P => {
      const col = new THREE.Color(P.color), curve = new THREE.LineCurve3(new V3(P.x, P.y0, P.z), new V3(P.x, P.y1, P.z));
      return sweepTube(curve, t => P.r * (1 + 0.15 * Math.sin(t * 30)), 16, 10, col, 0);
    });
    const mesh = new THREE.Mesh(THREE_ADDONS.mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)), farMaterial(0xffffff, 0, C.pillarHaze));
    for (const g of geos) g.dispose();
    mesh.frustumCulled = false; add(mesh, true);
    for (const P of list) reach(Math.hypot(P.x, P.z) + 60);
  }

  // ---- stars --------------------------------------------------------------------------------------------------------
  function buildStars(S, rnd) {
    const n = Math.round((S.count ?? C.stars.count) * qMore()), band = S.band ? Math.round(C.stars.band * qMore()) : 0;
    const pos = new Float32Array((n + band) * 3), seed = new Float32Array((n + band) * 4);
    for (let i = 0; i < n + band; i++) {
      let x, y, z;
      if (i < n) { do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + y * y + z * z > 1 || y < -0.05); }
      else { const a = rnd() * Math.PI * 2, off = (rnd() - 0.5) * 0.35; x = Math.cos(a); y = 0.35 + Math.sin(a) * 0.5 + off; z = Math.sin(a) * 0.8 + off; }   // a tilted band
      const l = Math.hypot(x, y, z) || 1;
      pos.set([x / l, y / l, z / l], i * 3);
      seed.set([rnd(), rnd(), rnd(), i < n ? 0 : 0.05 + rnd() * 0.95], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
    const band2 = S.band || [0x6040a0, 0x204080];
    const m = new THREE.ShaderMaterial({ uniforms: { uTime, uCam, uR: { value: C.stars.radius }, uScale: { value: 1 }, uColor: { value: new THREE.Color(S.color ?? 0xdde6ff) },
      uBandA: { value: new THREE.Color(band2[0]) }, uBandB: { value: new THREE.Color(band2[1 % band2.length]) } },
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = -0.5;
    add(pts);
    st.stars = pts;
  }

  // ---- weather --------------------------------------------------------------------------------------------------------
  function buildWeather(W, rnd) {
    const K = C.weather[W.kind], max = Math.round(K.count * W.amount * C.ultraBoost), shown = Math.round(K.count * W.amount * qPart());
    const quad = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = quad.index; g.setAttribute('position', quad.attributes.position);
    const seed = new Float32Array(max * 4), tint = new Float32Array(max * 3), cols = (W.colors || [W.color ?? K.color]).map(c => new THREE.Color(c));
    for (let i = 0; i < max; i++) { seed.set([rnd(), rnd(), rnd(), rnd()], i * 4); const c = cols[Math.floor(rnd() * cols.length)], k = 0.8 + rnd() * 0.4; tint.set([c.r * k, c.g * k, c.b * k], i * 3); }
    g.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 4)); g.setAttribute('tint', new THREE.InstancedBufferAttribute(tint, 3));
    g.instanceCount = shown;
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime, uCam, uBox: { value: new V3(...K.box) }, uSize: { value: new THREE.Vector2(...K.size) }, uFall: { value: K.fall }, uSway: { value: K.sway },
                  uSpin: { value: K.spin }, uRain: { value: W.kind === 'rain' ? 1 : 0 }, uGrow: { value: K.grow || 0 }, uWind: { value: new V3(...(K.wind || [0, 0, 0])) },
                  uOpacity: { value: K.opacity }, uShape: { value: K.shape }, uCover: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: WX_VERT, fragmentShader: WX_FRAG, transparent: true, depthWrite: false, fog: false,
      blending: K.additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
    add(mesh);
    st.weather.push({ mesh, W, K, max });
  }

  // ---- clouds below -------------------------------------------------------------------------------------------------
  function buildClouds(Cl) {
    const mk = (y, scale, op) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.ShaderMaterial({
        uniforms: { uTime, uColor: { value: new THREE.Color(Cl.color) }, uLight: { value: new THREE.Color(Cl.light) }, uHaze: { value: scene.fog.color.clone() },
                    uScale: { value: scale }, uOpacity: { value: op }, uFlash: { value: 0 }, uCenter: { value: new THREE.Vector2() } },
        vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.y = y; m.frustumCulled = false; m.renderOrder = -0.4;
      return add(m);
    };
    st.clouds = [mk(Cl.y, C.clouds.scale, C.clouds.opacity), ...(qMore() >= 1 ? [mk(Cl.y + C.clouds.gap, C.clouds.scale * 1.6, C.clouds.opacity * 0.6)] : [])];
    reach(900);
  }

  // ---- floating ruins ------------------------------------------------------------------------------------------------
  function buildFloaters(F, rnd) {
    const n = Math.max(1, Math.round(F.count * qMore()));
    let geo;
    if (F.kind === 'rock') { geo = new THREE.DodecahedronGeometry(1, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.75 + 0.35 * Math.abs(Math.sin(p.getX(i) * 4 + p.getY(i) * 3 + p.getZ(i) * 5)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * (p.getY(i) < 0 ? 1.6 : 0.8), p.getZ(i) * k); } }
    else {   // a broken stretch of building: a floor slab, a stump of wall and two columns, a rock root under it
      const parts = [new THREE.BoxGeometry(2, 0.3, 1.4).translate(0, 0, 0), new THREE.BoxGeometry(0.3, 1.2, 1.4).translate(-0.85, 0.75, 0),
        new THREE.CylinderGeometry(0.12, 0.14, 1.6, 8).translate(0.4, 0.95, 0.45), new THREE.CylinderGeometry(0.12, 0.14, 1.1, 8).translate(0.4, 0.7, -0.45),
        new THREE.ConeGeometry(0.9, 1.6, 7).rotateX(Math.PI).translate(0, -0.95, 0)];
      geo = THREE_ADDONS.mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g)); for (const g of parts) g.dispose();
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, fog: false });
    const mesh = new THREE.InstancedMesh(geo, mat, n), haze = scene.fog.color, base = new THREE.Color(F.color), col = new THREE.Color();
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = F.radius[0] + (F.radius[1] - F.radius[0]) * rnd(), x = F.at[0] + Math.cos(a) * r, z = F.at[1] + Math.sin(a) * r;
      const s = (F.kind === 'rock' ? 4 : 5) + rnd() * (F.kind === 'rock' ? 22 : 9), y = F.y[0] + (F.y[1] - F.y[0]) * rnd();
      list.push({ x, y, z, s, ry: rnd() * 6.28, rz: (rnd() - 0.5) * 0.4, ph: rnd() * 6.28, sp: 0.05 + rnd() * 0.12 });
      mesh.setColorAt(i, col.copy(base).lerp(haze, clamp(r / (F.radius[1] * 1.3), 0.15, 0.8)));
    }
    mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = false;
    add(mesh, false);
    st.floaters = { mesh, list };
    reach(F.radius[1] + Math.hypot(...F.at) + 50);
  }

  // ---- the dragon -----------------------------------------------------------------------------------------------------
  function buildDragon(D) {
    const g = new THREE.Group(), col = new THREE.Color(D.color).lerp(scene.fog.color, 0.25), mat = new THREE.MeshBasicMaterial({ color: col, fog: false, side: THREE.DoubleSide });
    const part = (geo, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    part(new THREE.SphereGeometry(1, 10, 6).scale(1.1, 1, 3.6), 0, 0, 0);                                         // body
    part(new THREE.CylinderGeometry(0.3, 0.7, 4, 6).rotateX(Math.PI / 2 - 0.4), 0, 0.9, 4.2);                     // neck
    part(new THREE.ConeGeometry(0.55, 2.2, 6).rotateX(Math.PI / 2), 0, 1.7, 6.6);                                // head
    part(new THREE.ConeGeometry(0.6, 9, 6).rotateX(-Math.PI / 2), 0, 0, -7.5);                                    // tail
    const wing = s => {   // a membrane: bones fanned from the shoulder, skin between them
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(9 * s, 2.5); shape.lineTo(13 * s, -0.5); shape.lineTo(9 * s, -2.8); shape.lineTo(5 * s, -3.6); shape.lineTo(1.5 * s, -2.8); shape.lineTo(0, -1.2);
      const geo = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), w = new THREE.Group(), m = new THREE.Mesh(geo, mat); w.add(m); w.position.set(0, 0.4, 1.2); g.add(w); return w;
    };
    const L = wing(1), R = wing(-1);
    g.scale.setScalar(C.dragon.scale);
    add(g);
    st.dragon = { g, L, R, D, a: 0 };
    reach(Math.hypot(...D.at) + D.radius + 60);
  }

  // ---- halos, runes, beams --------------------------------------------------------------------------------------------
  function buildHalos(list) {
    st.halos = list.map(H => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(H.r, H.r * C.halo.thick, 6, Math.max(48, Math.round(H.r * 6))),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(H.color).multiplyScalar(C.halo.boost), transparent: true, opacity: C.halo.opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.position.set(H.x, H.y, H.z); m.rotation.x = Math.PI / 2 + (H.tilt || 0); add(m);
      reach(Math.hypot(H.x, H.z) + H.r + 40);
      return { m, H };
    });
  }
  function buildRunes(list, floorY) {
    st.runes = list.map(U => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(U.r * 2, U.r * 2), new THREE.ShaderMaterial({
        uniforms: { uTime, uColor: { value: new THREE.Color(U.color) }, uOpacity: { value: C.rune.opacity } }, vertexShader: UV_VERT, fragmentShader: RUNE_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(U.x, floorY(U.x, U.z, U.y) + 0.04, U.z); add(m);
      return m;
    });
  }
  function buildBeams(color, def, floorY) {
    for (const b of def.bonfires || []) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(C.beam.r0, C.beam.r1, C.beam.height, 14, 1, true), new THREE.ShaderMaterial({
        uniforms: { uTime, uColor: { value: new THREE.Color(color) }, uOpacity: { value: C.beam.opacity } }, vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
      m.position.set(b.x, floorY(b.x, b.z, b.y) + C.beam.height / 2, b.z); m.renderOrder = 2; add(m);
      st.beams.push({ m, b });
    }
  }

  // ---- pools, roots, blooms -------------------------------------------------------------------------------------------
  function buildPools(list, floorY) {
    for (const P of list) {
      const K = C.pool[P.kind], w = P.rect[1] - P.rect[0], d = P.rect[3] - P.rect[2], cx = (P.rect[0] + P.rect[1]) / 2, cz = (P.rect[2] + P.rect[3]) / 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShaderMaterial({
        uniforms: { uTime, uDeep: { value: new THREE.Color(K.deep) }, uBright: { value: new THREE.Color(K.bright) }, uKind: { value: 0 } },
        vertexShader: POOL_VERT, fragmentShader: POOL_FRAG, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(cx, floorY(cx, cz, P.y) + C.pool.lift, cz); m.renderOrder = 1; add(m);
      if (K.glow && quality().glows) { const gl = glowSprite(K.bright, 1, Math.max(w, d) * 1.1, K.glow, null); gl.position.set(cx, m.position.y + 0.6, cz); add(gl); }
    }
  }
  function buildRoots(list) {
    const mat = TEXLIB.material('barkMoss', { tint: 0xffffff, decay: 0.4, size: 256 }).clone();
    for (const T of list) {
      const curve = new THREE.CatmullRomCurve3(T.pts.map(p => new V3(...p))), len = curve.getLength();
      const geo = new THREE.TubeGeometry(curve, Math.max(12, Math.round(len / 2)), T.r, 9, false);
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 3, uv.getY(i) * 2);
      const m = new THREE.Mesh(geo, T.color !== undefined ? (() => { const q = mat.clone(); q.color.setHex(T.color); return q; })() : mat);
      add(m, false);
      void p;
    }
  }
  function buildBlooms(list, rnd, floorY) {
    const n = list.reduce((s, B) => s + Math.round((B.count ?? C.bloom.count) * (quality().post ? 1 : 0.6)), 0);
    if (!n) return;
    // A scarlet flower: five petals cupped round a bright heart on a short stem.
    const parts = [new THREE.CylinderGeometry(0.012, 0.016, 0.2, 4).translate(0, 0.1, 0), new THREE.SphereGeometry(0.035, 6, 4).translate(0, 0.21, 0)];
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; parts.push(new THREE.SphereGeometry(0.07, 6, 4).scale(1, 0.3, 0.55).rotateX(-0.5).translate(0, 0.21, 0.07).rotateY(a)); }
    const geo = THREE_ADDONS.mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g)); for (const g of parts) g.dispose();
    const mat = new THREE.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xc01810, emissiveIntensity: 0.9, roughness: 0.6 });
    const mesh = new THREE.InstancedMesh(geo, mat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3(), p = new V3();
    let i = 0;
    for (const B of list) for (let k = 0, c = Math.round((B.count ?? C.bloom.count) * (quality().post ? 1 : 0.6)); k < c; k++) {
      const a = rnd() * Math.PI * 2, r = B.r * Math.sqrt(rnd()), x = B.x + Math.cos(a) * r, z = B.z + Math.sin(a) * r, y = floorY(x, z, B.y);
      p.set(x, Number.isFinite(y) ? y : -999, z); q.setFromAxisAngle(new V3(0, 1, 0), rnd() * 6.28); s.setScalar(0.7 + rnd() * 1.1);
      mesh.setMatrixAt(i++, m4.compose(p, q, s));
    }
    mesh.instanceMatrix.needsUpdate = true;
    add(mesh, false);
  }

  // ---- natural ground over the floors ---------------------------------------------------------------------------------------
  // A tiling surface per kind, painted once from value noise (cached for the session): soil and grass, snow, bark grain,
  // ash with embers (an emissive map, so the embers glow without a light).
  const groundTex = new Map();
  function groundMaterial(kind) {
    if (groundTex.has(kind)) return groundTex.get(kind);
    const K = C.ground[kind], N = K.size, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N), fbm = makeNoise(strSeed(kind) & 0xffff);
    const em = K.ember ? document.createElement('canvas') : null, ectx = em && (em.width = em.height = N, em.getContext('2d')), eimg = ectx && ectx.createImageData(N, N);
    const base = new THREE.Color(K.base), alt = new THREE.Color(K.alt), acc = new THREE.Color(K.accent), c = new THREE.Color();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N * 8, v = y / N * 8;
      let a = fbm(u, v, 8, 5), b = fbm(u * 2.3 + 7, v * 2.3 + 3, 8 * 2.3, 4);
      if (K.grain) { a = fbm(u * 0.35, v * 3, 8 * 0.35, 4) * 0.75 + 0.28 * Math.abs(Math.sin((v + fbm(u * 0.5, v, 4, 3) * 1.1) * K.grain)); }
      c.copy(base).lerp(alt, smooth(clamp((a - 0.42) * 3, 0, 1))).lerp(acc, smooth(clamp((b - 0.62) * 4, 0, 1)) * K.accentMix);
      const k = 0.85 + 0.3 * fbm(u * 6, v * 6, 48, 2), i = (y * N + x) * 4;
      img.data[i] = clamp(c.r * k, 0, 1) * 255; img.data[i + 1] = clamp(c.g * k, 0, 1) * 255; img.data[i + 2] = clamp(c.b * k, 0, 1) * 255; img.data[i + 3] = 255;
      if (eimg) { const e = Math.max(0, fbm(u * 4 + 11, v * 4 + 5, 32, 3) - 0.66) * 8 * (b > 0.5 ? 1 : 0.3); eimg.data[i] = 255 * Math.min(1, e); eimg.data[i + 1] = 110 * Math.min(1, e); eimg.data[i + 2] = 30 * Math.min(1, e); eimg.data[i + 3] = 255; }
    }
    ctx.putImageData(img, 0, 0); if (ectx) ectx.putImageData(eimg, 0, 0);
    const tex = t => { const q = new THREE.CanvasTexture(t); q.wrapS = q.wrapT = THREE.RepeatWrapping; q.colorSpace = THREE.SRGBColorSpace; q.anisotropy = 4; return q; };
    const m = new THREE.MeshStandardMaterial({ map: tex(cv), roughness: K.rough, metalness: 0, emissive: em ? 0xffffff : 0x000000, emissiveMap: em ? tex(em) : null,
      emissiveIntensity: em ? K.ember : 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    m.userData.realmShared = true;
    groundTex.set(kind, m);
    return m;
  }
  const smooth = t => t * t * (3 - 2 * t);
  function buildGrounds(list, def) {
    const TR = terrainFor(def), traps = (def.traps || []).map(t => t.collapse);
    for (const G of list) {
      const mat = groundMaterial(G.kind), tile = C.ground[G.kind].tile;
      for (const id of G.rooms) {
        const R = TR.regions.find(q => q.id === id);
        if (!R || R.kind !== 'room') continue;
        const along = (R.rect[3] - R.rect[2]) > (R.rect[1] - R.rect[0]);   // grain runs the long way
        for (const p of rectMinus(R.rect, [...R.pits, ...traps.filter(c => rectAnd(c, R.rect))])) {
          const w = p[1] - p[0], d = p[3] - p[2], g = new THREE.PlaneGeometry(w, d);
          const uv = g.attributes.uv;
          for (let i = 0; i < uv.count; i++) {
            const x = p[0] + uv.getX(i) * w, z = p[3] - uv.getY(i) * d;
            uv.setXY(i, (along ? z : x) / tile, (along ? x : z) / tile);
          }
          const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.set((p[0] + p[1]) / 2, R.lo + C.ground.lift, (p[2] + p[3]) / 2);
          m.receiveShadow = true; add(m, false);
        }
      }
    }
  }

  // ---- lightning --------------------------------------------------------------------------------------------------------
  function buildBolt(rnd) {
    const pts = [], segs = 14, a = rnd() * Math.PI * 2, dist = C.lightning.dist * (0.8 + rnd() * 0.4), h = C.lightning.height;
    let x = 0, z = 0;
    for (let i = 0; i <= segs; i++) { pts.push(new V3(x, h * (1 - i / segs), z)); x += (rnd() - 0.5) * 14; z += (rnd() - 0.5) * 6; }
    const geo = sweepTube(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), t => C.lightning.width * (1 - 0.6 * t), 40, 4, new THREE.Color(1, 1, 1), 1);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(st.def.realm.lightning.color).multiplyScalar(C.lightning.boost), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false;
    m.position.set(uCam.value.x + Math.cos(a) * dist, uCam.value.y - 20, uCam.value.z + Math.sin(a) * dist);
    const glow = glowSprite(st.def.realm.lightning.color, 1, C.lightning.glow, 0, null); glow.material.fog = false; glow.position.set(0, h * 0.75, 0); m.add(glow);
    add(m);
    return { m, glow, t: 0 };
  }

  // ---- building and clearing -------------------------------------------------------------------------------------------
  function clear() {
    if (!st) return;
    if (st.group.parent) st.group.parent.remove(st.group);
    st.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!m.userData.realmShared) m.dispose(); }); });
    if (st.flash) scene.remove(st.flash);
    st = null;
  }
  function build(def, built) {
    clear();
    const R = def.realm;
    if (!R) return;
    const rnd = seeded(strSeed(def.id + '/realm')), TR = terrainFor(def);
    const floorY = (x, z, y) => { const f = TR.floorY(x, z, y ?? Infinity); return Number.isFinite(f) ? f : (y ?? 0); };
    st = { def, built, group: new THREE.Group(), weather: [], beams: [], bolts: [], timer: 2 + rnd() * 3, flashK: 0, cover: 0, rnd };
    built.group.add(st.group);
    try {
      if (R.tree) st.tree = buildTree(R.tree, rnd);
      if (R.pillars) buildPillars(R.pillars, rnd);
      if (R.stars) buildStars(R.stars, rnd);
      for (const W of R.weather || []) buildWeather(W, rnd);
      if (R.clouds) buildClouds(R.clouds);
      if (R.floaters) buildFloaters(R.floaters, rnd);
      if (R.dragon) buildDragon(R.dragon);
      if (R.halos) buildHalos(R.halos);
      if (R.runes) buildRunes(R.runes, floorY);
      if (R.beams !== undefined) buildBeams(R.beams, def, floorY);
      const pools = [...(R.pools || []), ...(def.hazards || []).filter(h => h.kind === 'rot').map(h => ({ rect: h.rect, y: h.y, kind: 'rot' }))];
      if (pools.length) buildPools(pools, floorY);
      if (R.roots) buildRoots(R.roots);
      if (R.blooms) buildBlooms(R.blooms, rnd, floorY);
      if (R.grounds) buildGrounds(R.grounds, def);
      if (R.lightning) { st.flash = new THREE.AmbientLight(R.lightning.color, 0); scene.add(st.flash); }   // ambient light is summed: no shader changes
    } catch (err) { warnOnce(`Realm of "${def.id}" could not be fully drawn: ${err.message}`); }
  }

  // ---- every frame ------------------------------------------------------------------------------------------------------
  function render(game) {
    if (!st || st.def !== game.level) return;
    const dt = clamp(vTime.value - uTime.value, 0, 0.05), R = st.def.realm, p = game.player;
    uTime.value = vTime.value; uCam.value.copy(camera.position);
    // Under a roof the weather fades out (and comes back on stepping out); the lightning's flash is dimmer indoors.
    const roofed = world && world.ceilingAt && world.ceilingAt(camera.position.x, camera.position.z, camera.position.y) < Infinity;
    st.cover += ((roofed ? 1 : 0) - st.cover) * (1 - Math.exp(-dt * C.coverRate));
    // Lightning: at random within `every`, a bolt far off, the land lit for a heartbeat, the thunder after it.
    if (R.lightning && game.mode !== 'menu') {
      st.timer -= dt;
      if (st.timer <= 0) {
        st.timer = R.lightning.every[0] + st.rnd() * (R.lightning.every[1] - R.lightning.every[0]);
        st.bolts.push(buildBolt(st.rnd)); st.flashK = 1;
        const delay = 0.3 + st.rnd() * 1.4;
        setTimeout(() => { try { audio.play('thunder', { vel: 0.6 + st.rnd() * 0.4 }); } catch (e) { /* sound never breaks the game */ } }, delay * 1000);
      }
      st.flashK = Math.max(0, st.flashK - dt * C.lightning.decay);
      const f = st.flashK * (st.flashK > 0.55 || Math.sin(vTime.value * 60) > 0 ? 1 : 0.4);   // a double flicker
      if (st.flash) st.flash.intensity = f * C.lightning.light * (1 - st.cover * 0.7);
      for (const b of st.bolts) { b.t += dt; const k = Math.max(0, 1 - b.t / C.lightning.life); b.m.material.opacity = k * (b.t < 0.08 || b.t > 0.14 ? 1 : 0.3); b.glow.material.opacity = k * 0.6; }
      for (const b of st.bolts.filter(b => b.t >= C.lightning.life)) { st.group.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); b.glow.material.dispose(); }
      st.bolts = st.bolts.filter(b => b.t < C.lightning.life);
    }
    for (const w of st.weather) {
      const u = w.mesh.material.uniforms;
      u.uCover.value = w.W.kind === 'motes' || w.W.kind === 'spores' ? st.cover * 0.5 : st.cover;
      u.uFlash.value = st.flashK * 0.8;
    }
    if (st.clouds) for (const c of st.clouds) { c.material.uniforms.uFlash.value = st.flashK; c.material.uniforms.uCenter.value.set(camera.position.x, camera.position.z); c.position.x = camera.position.x; c.position.z = camera.position.z; }
    if (st.floaters) {   // drifting slowly, each bobbing on its own time
      const { mesh, list } = st.floaters, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new V3(), v = new V3();
      list.forEach((f, i) => { e.set(0, f.ry + uTime.value * f.sp * 0.2, f.rz); q.setFromEuler(e); s.setScalar(f.s); v.set(f.x, f.y + Math.sin(uTime.value * f.sp + f.ph) * f.s * 0.12, f.z); mesh.setMatrixAt(i, m4.compose(v, q, s)); });
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (st.dragon) {   // round and round, high up, its wings beating slowly, gliding now and then
      const d = st.dragon, D = d.D;
      d.a += dt * D.speed / D.radius;
      const x = D.at[0] + Math.cos(d.a) * D.radius, z = D.at[1] + Math.sin(d.a) * D.radius, y = D.y + Math.sin(d.a * 3) * 12;
      d.g.position.set(x, y, z); d.g.rotation.y = -d.a; d.g.rotation.z = -0.25;
      const beat = Math.sin(uTime.value * 1.6) * (0.5 + 0.5 * Math.max(0, Math.sin(uTime.value * 0.2))) * 0.6;
      d.L.rotation.z = beat; d.R.rotation.z = -beat;
    }
    if (st.halos) for (const h of st.halos) { h.m.rotation.z = uTime.value * C.halo.spin * (h.H.r > 20 ? 0.3 : 1); h.m.material.opacity = C.halo.opacity * (0.8 + 0.2 * Math.sin(uTime.value * 0.7 + h.H.x)); }
    // Grace beams fade near their bonfire (the fire itself is the light up close) and stay for those far off.
    for (const b of st.beams) b.m.visible = !p || Math.hypot(p.x - b.b.x, p.z - b.b.z) > C.beam.hideNear;
  }

  // The rot eating at the player's feet (a hazard's tick): a puff of dust and spores round them.
  events.on('hazard', d => { try { const p = d.player; groundFx.puff(p.x, p.z, C.hazardPuff, p.y, 0.5); } catch (e) { /* drawing never breaks the game */ } });
  visuals.hooks.stage.push((def, built) => build(def, built));
  visuals.hooks.quality.push(() => { if (st && stage) build(st.def, st.built); });   // counts and detail follow the preset
  Game.renderHooks.push(render);
  return {
    // What the current stage draws, for tests and tuning.
    info() {
      if (!st) return null;
      return { tree: !!st.tree, stars: st.stars ? st.stars.geometry.attributes.position.count : 0, weather: st.weather.map(w => ({ kind: w.W.kind, shown: w.mesh.geometry.instanceCount, max: w.max })),
               clouds: st.clouds ? st.clouds.length : 0, floaters: st.floaters ? st.floaters.list.length : 0, dragon: !!st.dragon, halos: (st.halos || []).length,
               runes: (st.runes || []).length, beams: st.beams.length, flash: !!st.flash, cover: st.cover, objects: st.group.children.length };
    },
    strike() { if (st && st.def.realm.lightning) st.timer = 0; },   // dev and tests: the next frame throws a bolt
    get state() { return st; },
  };
})();
