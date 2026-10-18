'use strict';
// ============================================================================
// Body kit: geometry helpers, reusable parts, weapons and the model builder
// ============================================================================
// buildModelRig(rig, id) dresses a Rig from MODEL_DEFS[id] (js/data/models.js). The skeleton is fixed so every
// existing animation keeps working untouched:
//   root > tip > spin (hips) > chest > neck > head          legL/legR (hips) > kneeL/kneeR
//                     chest > armL/armR (shoulders) > elbowL/elbowR > weapon (right hand)
// plus any extra `bones` a definition adds (hanging cloth), reachable as rig.bones[name].
// Geometry is built once per model id (shared by every enemy of that type); materials are cloned per rig because
// each body flashes, glows and fades on its own, but they share the cached textures.
// Death dissolve: the body breaks up into ash with a glowing ember edge as `uniform.value` goes 0 -> 1. Noise comes
// from the mesh-local position, so it needs no extra data. Built on addRim (js/visuals.js).
const DISSOLVE_NOISE = `
float dHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float dissolveNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dHash(i), dHash(i + vec3(1,0,0)), f.x), mix(dHash(i + vec3(0,1,0)), dHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(dHash(i + vec3(0,0,1)), dHash(i + vec3(1,0,1)), f.x), mix(dHash(i + vec3(0,1,1)), dHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;
function addDissolve(mat, rim, uniform) {
  addRim(mat, rim);
  const rimPatch = mat.onBeforeCompile;
  mat.onBeforeCompile = sh => {
    rimPatch(sh);
    sh.uniforms.uDissolve = uniform;
    sh.vertexShader = 'varying vec3 vDPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vDPos = position;');
    sh.fragmentShader = 'uniform float uDissolve; varying vec3 vDPos;\n' + DISSOLVE_NOISE + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n float dThr = uDissolve * 1.2 - 0.1; float dn = 1.0; if (uDissolve > 0.001) { dn = dissolveNoise(vDPos * 14.0); if (dn < dThr) discard; }')
      .replace('#include <opaque_fragment>', 'if (uDissolve > 0.001) outgoingLight += vec3(1.6, 0.55, 0.12) * smoothstep(dThr + 0.1, dThr, dn) * 2.2;\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'rimDissolve2';
  return mat;
}
// KIT binds every vertex rigidly to one bone (weight 1,0,0,0). Skip the three unused bone-texture fetches,
// preserving the same geometry, pose and lighting. Other rigs and Three's shadow materials keep their own shaders.
function rigidSkinning(mat) {
  const patch = mat.onBeforeCompile, key = mat.customProgramCacheKey.bind(mat);
  mat.onBeforeCompile = sh => {
    patch(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <skinbase_vertex>', `
      #ifdef USE_SKINNING
        mat4 boneMatX = getBoneMatrix(skinIndex.x);
        mat4 boneMatY = mat4(0.0), boneMatZ = mat4(0.0), boneMatW = mat4(0.0);
      #endif`);
  };
  const baseKey = key(); mat.customProgramCacheKey = () => baseKey + '|rigidSkin';
  return mat;
}
// Model detail (the Ultra preset): while a model is built, every round primitive takes `k` times its segments, so limbs,
// rims, horns and tubes come out smooth. KIT.setDetail picks k; each detail level has its own cache (bodies spawned
// after a change use it). Also used by parts defined in data (Malenia's, Maliketh's), which build inside modelParts.
const KIT_GEO = (() => {
  let k = 1;
  const s = (n, min = 3) => Math.max(min, Math.round(n * k));
  return {
    set(mult) { k = mult; }, get: () => k,
    Sphere: (r, w = 32, h = 16, ...rest) => new THREE.SphereGeometry(r, s(w), s(h, 2), ...rest),
    Cylinder: (rt, rb, h, rs = 32, hs = 1, ...rest) => new THREE.CylinderGeometry(rt, rb, h, s(rs), hs, ...rest),
    Cone: (r, h, rs = 32, hs = 1, ...rest) => new THREE.ConeGeometry(r, h, s(rs), hs, ...rest),
    Torus: (r, t, rs = 12, ts = 48, arc) => new THREE.TorusGeometry(r, t, s(rs), s(ts), arc),
    Lathe: (pts, seg = 12, ...rest) => new THREE.LatheGeometry(pts, s(seg), ...rest),
    Tube: (path, ts = 64, r = 1, rs = 8, closed = false) => new THREE.TubeGeometry(path, s(ts), r, s(rs), closed),
    Circle: (r, seg = 32, ...rest) => new THREE.CircleGeometry(r, s(seg), ...rest),
    Ring: (ri, ro, ts = 32, ...rest) => new THREE.RingGeometry(ri, ro, s(ts), ...rest),
  };
})();
const KIT = (() => {
  const TAU = Math.PI * 2, V3 = THREE.Vector3, V2 = THREE.Vector2, MS = MODEL_SETTINGS;
  const modelCache = new Map();
  let limbSides = MS.limbSides;   // radial segments of limbs for the model being built
  let detail = { geo: 1, tex: 1 };   // KIT.setDetail: segment and texture-size multipliers for models built from now on
  const texSize = spec => Math.min(TEXTURE_SETTINGS.ultraMax, Math.round((spec.size ?? MS.texSize) * detail.tex));

  // ---- geometry helpers ------------------------------------------------------------------------------------
  const xf = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
    geo.applyMatrix4(new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz)));
    return geo;
  };
  const uvScale = (geo, su, sv = su) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; };
  const hash3 = (a, b, c, s) => {
    let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2147483647) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
  };
  // Dents and uneven edges: every vertex at the same spot moves the same way, so seams never open.
  const roughen = (geo, amt, seed = 1) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.round(x * 300), b = Math.round(y * 300), c = Math.round(z * 300);
      p.setXYZ(i, x + hash3(a, b, c, seed) * amt, y + hash3(a, b, c, seed + 1) * amt, z + hash3(a, b, c, seed + 2) * amt);
    }
    return geo;
  };
  const deform = (geo, fn) => { const p = geo.attributes.position, v = new V3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z); } return geo; };
  // A solid of revolution: profile [[radius, y]] listed bottom to top; ovalZ squashes depth.
  const lathe = (profile, seg, ovalZ = 1) => xf(KIT_GEO.Lathe(profile.map(([r, y]) => new V2(r, y)), seg), 0, 0, 0, 0, 0, 0, 1, 1, ovalZ);
  // A limb hanging down from its joint: profile [[t 0..1 along the length, radius]].
  const limb = (len, prof, thick = 1, ovalZ = 0.92) =>
    uvScale(lathe(prof.slice().reverse().map(([t, r]) => [r * thick, -t * len]), limbSides, ovalZ), 1.4, len / MS.texMeters);
  const shape = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; };
  const plate = (pts, depth, bevel) => {
    const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 3 });
    return uvScale(g, 1 / MS.texMeters);
  };
  // Preserve each part's indices: expanding every triangle duplicated vertex data and skinning work for no visual gain.
  const mergeGeos = list => {
    let n = 0, indices = 0;
    for (const g of list) { n += g.attributes.position.count; indices += g.index ? g.index.count : g.attributes.position.count; }
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) {
      const ref = list.find(g => g.attributes[name]);
      if (!ref) continue;
      const size = ref.attributes[name].itemSize, arr = new ref.attributes[name].array.constructor(n * size); let o = 0;
      for (const g of list) { if (g.attributes[name]) arr.set(g.attributes[name].array, o * size); o += g.attributes.position.count; }
      out.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    const idx = n > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
    let vertex = 0, at = 0;
    for (const g of list) {
      const count = g.index ? g.index.count : g.attributes.position.count;
      for (let i = 0; i < count; i++) idx[at++] = vertex + (g.index ? g.index.getX(i) : i);
      vertex += g.attributes.position.count;
    }
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    for (const g of list) g.dispose();
    return out;
  };
  const sphere = (r, w, h) => uvScale(KIT_GEO.Sphere(r, w, h), 2, 1);
  const tube = (r0, r1, len, seg = 6, open = false) => uvScale(KIT_GEO.Cylinder(r0, r1, len, seg, 1, open), 1.2, len / MS.texMeters);

  // ---- core body pieces (built from the definition's proportions) ----------------------------------------
  const sideOf = bone => bone.endsWith('L') ? 'L' : 'R';
  const limbTweak = (M, bone) => ({ len: 1, thick: 1, ...(M.limbs && M.limbs[bone]) });
  // Sculpted anatomy (detail.anatomy): the same bones and outer envelope (armour still fits), but sculpted:
  // muscled limbs (deltoid, biceps, forearm, quadriceps, calf), caps over the joints instead of balls, fists with
  // fingers closed round the grip, a torso with chest and shoulder blades, boots with a heel.
  function ultraBody(M) {
    const P = M.proportions, B = M.body, out = [];
    const add = (bone, slot, geo) => { if (slot) out.push({ bone, slot, geo }); };
    const tw = P.torsoW / 0.2, oz = P.torsoD / P.torsoW;
    // a muscle: radial bulge of `amt` (fraction) toward +z (front) or -z (back), centred at t (0..1 down the limb)
    const bulge = (geo, len, t0, t1, amt, front = 1, side = 0) => deform(geo, v => {
      const t = -v.y / len; if (t < t0 || t > t1) return;
      const k = Math.sin((t - t0) / (t1 - t0) * Math.PI), r = Math.hypot(v.x, v.z) || 1, dir = (v.z * front + v.x * side) / r;
      if (dir > 0) { const m = 1 + amt * k * dir; v.x *= m; v.z *= m; }
    });
    if (B.pelvis) add('spin', B.pelvis, uvScale(lathe([[0.1, -0.1], [0.14, -0.085], [0.165, -0.05], [0.178, -0.01], [0.18, 0.02], [0.172, 0.06], [0.16, 0.08]].map(([r, y]) => [r * tw, y]), 10, oz * 1.1), 1.5, 1));
    if (B.torso) {
      const g = lathe([[0.15, -0.06], [0.158, 0.0], [0.168, 0.05], [0.188, 0.14], [0.21, 0.22], [0.238, 0.31], [0.26, 0.4], [0.28, 0.46], [0.286, 0.5],
                       [0.276, 0.535], [0.25, 0.565], [0.21, 0.59], [0.16, 0.612], [0.11, 0.632], [0.08, 0.65]].map(([r, y]) => [r * tw, y]), 12, oz);   // sloped shoulders (v6.0)
      deform(g, v => {
        const ax = Math.abs(v.x) / tw;
        if (v.z > 0 && v.y > 0.33 && v.y < 0.52 && ax > 0.03 && ax < 0.22) v.z *= 1 + 0.06 * Math.sin((v.y - 0.33) / 0.19 * Math.PI) * Math.sin((ax - 0.03) / 0.19 * Math.PI);   // the chest
        if (v.z < 0) { v.z *= 0.94; if (ax < 0.035) v.z *= 0.96; if (v.y > 0.36 && v.y < 0.52 && ax > 0.06 && ax < 0.2) v.z *= 1.04; }   // flatter back, spine groove, shoulder blades
        if (v.y > 0.05 && v.y < 0.24) { const k = 1 - 0.04 * Math.sin((v.y - 0.05) / 0.19 * Math.PI); v.x *= k; }   // the waist
      });
      add('chest', B.torso, uvScale(g, 1.8, 1.2));
    }
    add('neck', B.neck, tube(P.headR * 0.4, P.headR * 0.5, 0.17, 10));
    const skull = deform(sphere(P.headR, 14, 10), v => {
      if (v.y < 0) { const k = 1 - 0.38 * (-v.y / P.headR); v.x *= k; v.z *= k; v.z += v.y * 0.1; }
      if (v.z > 0) v.z *= 0.9; v.y *= 1.08;
      if (v.z > P.headR * 0.5 && Math.abs(v.y) < P.headR * 0.25 && Math.abs(v.x) > P.headR * 0.15 && Math.abs(v.x) < P.headR * 0.55) v.z -= P.headR * 0.06;   // eye sockets
    });
    if (B.head) {
      add('head', B.head, xf(skull, 0, P.headR * 0.9, 0.01));
      add('head', B.head, xf(sphere(P.headR * 0.9, 8, 4), 0, P.headR * 1.25, P.headR * 0.45, 0, 0, 0, 1, 0.22, 0.4));   // heavy brow
      add('head', B.head, xf(KIT_GEO.Cone(P.headR * 0.13, P.headR * 0.42, 6), 0, P.headR * 0.85, P.headR * 0.92, 1.35, 0, 0, 1, 1, 0.8));   // the nose
      for (const sx of [-1, 1]) add('head', B.head, xf(sphere(P.headR * 0.22, 6, 4), sx * P.headR * 0.95, P.headR * 0.9, -P.headR * 0.05, 0, 0, 0, 0.35, 1, 0.7));   // ears
    }
    for (const bone of ['armL', 'armR']) {
      const t = limbTweak(M, bone), len = 0.3 * t.len, s = P.armR / 0.052, k = s * t.thick;
      const up = limb(len, [[0, 0.058], [0.08, 0.064], [0.22, 0.063], [0.42, 0.058], [0.6, 0.054], [0.78, 0.048], [0.92, 0.045], [1, 0.044]], k);
      bulge(up, len, 0.3, 0.8, 0.12, 1); bulge(up, len, 0.15, 0.6, 0.06, -1);   // biceps, triceps
      add(bone, B.arms, up);
      add(bone, B.arms, xf(sphere(0.064 * k, 10, 6), 0, 0.005, 0, 0, 0, 0, 1.08, 0.92, 1));   // the deltoid cap
      const el = 'elbow' + sideOf(bone);
      const fore = limb(len, [[0, 0.046], [0.1, 0.05], [0.28, 0.049], [0.5, 0.044], [0.75, 0.036], [0.9, 0.032], [1, 0.03]], k);
      bulge(fore, len, 0.05, 0.5, 0.08, 1, sideOf(bone) === 'L' ? 1 : -1);   // the forearm's muscle, toward the thumb
      add(el, B.arms, fore);
      add(el, B.arms, xf(sphere(0.042 * k, 8, 5), 0, 0, -0.012 * k, 0, 0, 0, 0.9, 0.8, 0.9));   // the elbow
      // the fist: a palm and four fingers closed round a grip along z, a thumb across them
      const h = P.handR, hy = -len - 0.03;
      add(el, B.hands, xf(sphere(h, 10, 6), 0, hy, 0.01, 0, 0, 0, 0.78, 1.05, 0.95));
      for (let i = 0; i < 4; i++) {
        const z = 0.01 + (i - 1.5) * h * 0.46, fr = h * (0.42 - Math.abs(i - 1.2) * 0.04);
        add(el, B.hands, xf(KIT_GEO.Torus(fr, h * 0.19, 6, 8, Math.PI * 1.25), 0.002, hy - h * 0.62, z, 0, 0, Math.PI * 0.62));
      }
      add(el, B.hands, xf(KIT_GEO.Cylinder(h * 0.19, h * 0.16, h * 0.9, 6), h * 0.32 * (sideOf(bone) === 'L' ? 1 : -1), hy - h * 0.55, 0.01 + h * 0.5, 0.5, 0, Math.PI / 2));
    }
    for (const bone of ['legL', 'legR']) {
      const t = limbTweak(M, bone), s = P.legR / 0.07, knee = 'knee' + sideOf(bone), k = s * t.thick;
      const thigh = limb(LEG_SEG, [[0, 0.078], [0.12, 0.081], [0.35, 0.077], [0.6, 0.068], [0.85, 0.058], [1, 0.054]], k, 1);
      bulge(thigh, LEG_SEG, 0.15, 0.85, 0.07, 1);   // quadriceps
      add(bone, B.legs, thigh);
      const shin = limb(LEG_SEG, [[0, 0.054], [0.1, 0.059], [0.28, 0.061], [0.5, 0.052], [0.75, 0.042], [0.9, 0.038], [1, 0.037]], k, 1);
      bulge(shin, LEG_SEG, 0.08, 0.55, 0.16, -1);   // the calf
      add(knee, B.legs, shin);
      add(knee, B.legs, xf(sphere(0.035 * k, 8, 6), 0, -0.005, 0.045 * k, 0, 0, 0, 1, 1.15, 0.6));   // the kneecap
      const L = P.footLen;
      const foot = new THREE.ExtrudeGeometry(shape([[-0.075, 0], [L - 0.08, 0], [L - 0.035, 0.02], [L - 0.05, 0.045], [L - 0.13, 0.078], [-0.03, 0.1], [-0.075, 0.07]]),
        { depth: 0.11, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.014, bevelSegments: 3, curveSegments: 4 });
      xf(foot, 0, 0, -0.055, 0, 0, 0); foot.rotateY(-Math.PI / 2); xf(foot, 0, -LEG_SEG - 0.0, 0);
      add(knee, B.feet, uvScale(foot, 1 / MS.texMeters));
      add(knee, B.feet, xf(KIT_GEO.Cylinder(0.04 * k, 0.045 * k, 0.03, 10), 0, -LEG_SEG + 0.015, -0.04, 0, 0, 0, 1, 1, 0.9));   // the heel
    }
    return out;
  }
  function bodyParts(M) {
    if (anatomy) return ultraBody(M);
    const P = M.proportions, B = M.body, out = [];
    const add = (bone, slot, geo) => out.push({ bone, slot, geo });
    const tw = P.torsoW / 0.2, oz = P.torsoD / P.torsoW;
    if (B.pelvis) add('spin', B.pelvis, uvScale(lathe([[0.1, -0.1], [0.17, -0.06], [0.18, 0.02], [0.16, 0.08]].map(([r, y]) => [r * tw, y]), 8, oz * 1.1), 1.5, 1));
    if (B.torso) add('chest', B.torso, uvScale(lathe([[0.15, -0.06], [0.17, 0.05], [0.21, 0.22], [0.26, 0.4], [0.286, 0.5], [0.25, 0.565], [0.17, 0.605], [0.08, 0.64]].map(([r, y]) => [r * tw, y]), 8, oz), 1.8, 1.2));   // sloped shoulders (v6.0)
    add('neck', B.neck, tube(P.headR * 0.4, P.headR * 0.46, 0.17, 6));
    xf(out[out.length - 1].geo, 0, 0.0, 0);
    // Skull: the lower half narrows to a jaw; the face is flatter than the back of the head.
    const skull = deform(sphere(P.headR, 10, 7), v => {
      if (v.y < 0) { const k = 1 - 0.38 * (-v.y / P.headR); v.x *= k; v.z *= k; v.z += v.y * 0.1; }
      if (v.z > 0) v.z *= 0.9; v.y *= 1.08;
    });
    if (B.head) {
      add('head', B.head, xf(skull, 0, P.headR * 0.9, 0.01));
      add('head', B.head, xf(sphere(P.headR * 0.9, 6, 3), 0, P.headR * 1.25, P.headR * 0.45, 0, 0, 0, 1, 0.22, 0.4));   // heavy brow
    }
    for (const bone of ['armL', 'armR']) {
      const t = limbTweak(M, bone), len = 0.3 * t.len, s = P.armR / 0.052;
      add(bone, B.arms, limb(len, [[0, 0.058], [0.2, 0.063], [0.7, 0.05], [1, 0.044]], s * t.thick));
      add(bone, B.arms, sphere(0.062 * s * t.thick, 6, 4));
      const el = 'elbow' + sideOf(bone);
      add(el, B.arms, limb(len, [[0, 0.045], [0.25, 0.046], [0.8, 0.036], [1, 0.032]], s * t.thick));
      add(el, B.hands, xf(sphere(P.handR, 6, 4), 0, -len - 0.03, 0.01, 0, 0, 0, 0.9, 1.15, 0.8));
    }
    for (const bone of ['legL', 'legR']) {
      const t = limbTweak(M, bone), s = P.legR / 0.07, knee = 'knee' + sideOf(bone);
      add(bone, B.legs, limb(LEG_SEG, [[0, 0.078], [0.3, 0.074], [1, 0.054]], s * t.thick, 1));
      add(knee, B.legs, limb(LEG_SEG, [[0, 0.054], [0.25, 0.058], [0.7, 0.045], [1, 0.037]], s * t.thick, 1));
      const L = P.footLen;
      const foot = new THREE.ExtrudeGeometry(shape([[-0.07, 0], [L - 0.08, 0], [L - 0.04, 0.035], [L - 0.12, 0.075], [-0.06, 0.1]]),
        { depth: 0.11, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 2 });
      xf(foot, 0, 0, -0.055, 0, 0, 0); foot.rotateY(-Math.PI / 2); xf(foot, 0, -LEG_SEG - 0.0, 0);
      add(knee, B.feet, uvScale(foot, 1 / MS.texMeters));
    }
    return out;
  }

  // ---- accessories: name -> (options, model) => geometry list, in the bone's own frame ------------------------
  // The Hollow Soldier's gambeson profile [[radius, y]] (chest frame), shared by the coat and the straps laid on it.
  const GAMBESON = [[0.2, -0.08], [0.25, 0.22], [0.295, 0.4], [0.32, 0.5], [0.255, 0.57], [0.13, 0.625], [0.115, 0.66]];
  const KIT_PARTS = {
    // A ragged tunic around the waist: uneven hem.
    tunic(o) {
      const g = lathe([[0.19, -0.2], [0.2, -0.1], [0.19, 0.0], [0.18, 0.07]], 8, 0.7);
      deform(g, v => { if (v.y < -0.05) v.y -= (hash3(Math.round(v.x * 90), Math.round(v.z * 90), 3, 5) + 0.5) * 0.14; });
      return [uvScale(g, 2, 1.2)];
    },
    // Vertebrae pushing through the skin of a hunched back.
    spineBumps() {
      return [0.08, 0.2, 0.32, 0.44].map((y, i) => {
        const s = 1 - Math.abs(i - 1.2) * 0.12, c = KIT_GEO.Cone(0.03 * s, 0.075 * s, 5);
        return xf(c, hash3(i, 1, 1, 9) * 0.03, y, -0.125 - i * 0.004, -Math.PI / 2 + 0.25, 0, 0);
      });
    },
    // A rag hood pulled low: open at the face, a tail hanging behind.
    hood(o) {
      const g = KIT_GEO.Sphere(0.158 * (o.size ?? 1), 10, 6, Math.PI / 2 + 0.75 - (o.close ?? 0), TAU - 1.5 + 2 * (o.close ?? 0), 0, 2.25), tail = o.tail ?? 1;
      deform(g, v => { if (v.z < 0 && v.y < 0.08) { v.z -= (0.08 - v.y) * 0.9 * tail; v.y -= (-v.z) * 0.15 * tail; } if (v.y > 0.1) v.z += (v.y - 0.1) * 0.35; });
      xf(g, 0, 0.115, 0.0, 0.2, 0, 0, 1.0, 1.05, 1.05); roughen(g, 0.012, 21);
      return [uvScale(g, 2, 1)];
    },
    // A dented shoulder dome, strapped on one side only.
    pauldron(o) {
      const g = KIT_GEO.Sphere(0.115 * (o.size ?? 1), 8, 4, 0, TAU, 0, Math.PI / 2);
      const sd = o.side ?? 1; xf(g, 0.035 * sd, 0.035, 0, 0, 0, -0.38 * sd, 1.1, 0.7, 1.0); roughen(g, 0.014, 5);
      return [uvScale(g, 3, 1.5)];
    },
    // Half a breastplate: a curved, buckled plate across one side of the chest.
    breastHalf(o) {
      const s = o.side ?? 1, g = plate([[-0.08, 0], [0.09, 0.015], [0.1, 0.22], [0.03, 0.29], [-0.07, 0.24]], 0.014, 0.007);
      deform(g, v => { v.z -= v.x * v.x * 3.2; });
      xf(g, s * 0.1, 0.1, 0.095, 0.12, s * 0.35, s * 0.1); roughen(g, 0.01, 8);
      return [g];
    },
    belt() { return [uvScale(xf(KIT_GEO.Torus(0.185, 0.022, 3, 10), 0, 0.045, 0, Math.PI / 2, 0, 0.08, 1, 1, 0.72), 6, 1)]; },
    pouch(o) { return [xf(plate([[-0.045, 0], [0.045, 0], [0.05, 0.1], [-0.05, 0.1]], 0.05, 0.012), o.x ?? 0, -0.05, o.z ?? 0.1, 0.1, -0.5, 0.1)]; },
    // Bandage rings spiralling along a limb (from..to metres below the bone origin).
    wraps(o) {
      const n = o.count ?? 4, step = (o.to - o.from) / n, out = [];
      for (let i = 0; i < n; i++) {
        const r = o.radius * (1.18 - 0.18 * i / n), g = tube(r, r * 0.97, step * 1.7, 7, true);
        out.push(uvScale(xf(g, 0, -(o.from + step * (i + 0.5)), 0, hash3(i, 2, 4, 1) * 0.5, 0, hash3(i, 3, 4, 1) * 0.5), 1, 0.4));
      }
      return out;
    },
    // A strip of hanging cloth: top at the bone, ragged and narrowing toward the hem.
    clothStrip(o) {
      const g = new THREE.PlaneGeometry(o.w, o.len, 1, 2);
      deform(g, v => {
        const t = (o.len / 2 - v.y) / o.len; v.x *= 1 - 0.35 * t; v.z += t * t * 0.05;
        if (t > 0.9) v.y += hash3(Math.round(v.x * 80), 1, 1, o.seed ?? 1) * 0.1 - 0.02;
        v.y -= o.len / 2;
      });
      return [uvScale(xf(g, o.dx ?? 0, 0, o.dz ?? 0, 0, o.turn ?? 0, 0), 1, 1)];
    },
    // A leather jerkin over the torso.
    jerkin(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      return [uvScale(lathe([[0.185, -0.02], [0.195, 0.05], [0.235, 0.22], [0.28, 0.4], [0.31, 0.5], [0.25, 0.565]].map(([r, y]) => [r * tw, y]), 8, oz), 1.8, 1.2)];
    },
    // A flared skirt of mail plates, uneven at the hem.
    mailSkirt() {
      const g = lathe([[0.19, 0.02], [0.2, -0.1], [0.235, -0.24], [0.245, -0.3]], 8, 0.8);
      deform(g, v => { if (v.y < -0.2) v.y -= (hash3(Math.round(v.x * 90), Math.round(v.z * 90), 4, 6) + 0.5) * 0.08; });
      return [uvScale(g, 2.5, 1)];
    },
    // A scarf around the neck.
    scarf() { return [uvScale(xf(KIT_GEO.Torus(0.085, 0.03, 4, 9), 0, 0.02, 0.0, Math.PI / 2, 0, 0.1, 1, 1, 0.9), 4, 1)]; },
    // One hanging section of a cape: top and bottom widths, length, curved to wrap round the shoulders. The hem
    // section keeps its 0..1 texture so the ragged edge of a tattered texture lands at the bottom.
    capeSegment(o) {
      const g = new THREE.PlaneGeometry(1, 1, 4, 2);
      deform(g, v => {
        const t = 0.5 - v.y, w = o.w0 + (o.w1 - o.w0) * t;
        v.x *= w; v.z = (v.x * v.x) * (o.bow ?? 1.4); v.y = -t * o.len;
        if (o.ragged && t > 0.97) v.y -= (hash3(Math.round(v.x * 60), 2, 2, o.seed ?? 1) + 0.5) * 0.07;
      });
      return [o.ragged ? g : uvScale(g, o.w0 / MS.texMeters, o.len / MS.texMeters)];
    },
    // A round shield slung on the back, face out: wooden dish, iron rim and boss.
    shieldBack(o) { return KIT_PARTS.roundShield({ at: [0, 0.3, -0.34], rot: [-Math.PI / 2, 0, 0.18], r: 0.21, face: 'wood', metal: 'iron' }); },
    // A round shield: dish, rim and boss, axis along +y before `rot` turns it; `at` places it in the bone's frame.
    roundShield(o) {
      const k = (o.r ?? 0.21) / 0.21, dish = lathe([[0, -0.02], [0.2, -0.02], [0.213, 0.0], [0.2, 0.02], [0.065, 0.04], [0.05, 0.075], [0, 0.082]].map(([r, y]) => [r * k, y]), 10);
      const rim = xf(KIT_GEO.Torus(0.208 * k, 0.013, 3, 14), 0, 0.0, 0, Math.PI / 2, 0, 0);
      const boss = lathe([[0, 0.03], [0.062, 0.035], [0.05, 0.075], [0, 0.088]], 7);
      const place = g => xf(g, ...o.at, ...o.rot);
      roughen(dish, 0.01, 12);
      return [{ slot: o.face, geo: place(uvScale(dish, 2, 1)) }, { slot: o.metal, geo: place(rim) }, { slot: o.metal, geo: place(boss) }];
    },
    // A tall kite shield on the left forearm, face forward: board (slot), iron boss and strap (`metal`).
    kiteShield(o) {
      const w = o.w ?? 0.6, h = o.h ?? 0.95, d = 0.05, at = o.at ?? [0.04, -0.16, 0.19];
      const board = plate([[-w / 2, h * 0.5], [w / 2, h * 0.5], [w / 2, h * 0.15], [w * 0.3, -h * 0.25], [0, -h * 0.5], [-w * 0.3, -h * 0.25], [-w / 2, h * 0.15]], d, 0.012);
      roughen(board, 0.008, 14);
      const boss = xf(lathe([[0, 0], [0.075, 0], [0.058, 0.045], [0, 0.058]], 7), 0, h * 0.1, d + 0.01, Math.PI / 2, 0, 0);
      const strap = plate([[-0.03, h * 0.46], [0.03, h * 0.46], [0.03, -h * 0.3], [-0.03, -h * 0.3]], 0.012, 0.005);
      xf(strap, 0, 0, d + 0.012);
      return [board, boss, strap].map((g, i) => ({ slot: i ? o.metal : o.slot, geo: xf(g, ...at) }));
    },
    // Helmets: a great helm (barrel), optionally with a crest fin or a flat top. Eyes glow in the slit.
    greatHelm(o) {
      const s = o.size ?? 1, top = o.flat ? [[0.15, 0.13], [0.15, 0.18], [0, 0.185]] : [[0.14, 0.2], [0.1, 0.245], [0, 0.26]];
      const g = lathe([[0.12, -0.03], [0.15, 0.05], ...top].map(([r, y]) => [r * s, y * s]), 9);
      roughen(g, 0.012, 31);
      const out = [uvScale(g, 3, 1), uvScale(xf(KIT_GEO.Torus(0.152 * s, 0.012, 3, 7, Math.PI), 0, 0.105 * s, 0.0, Math.PI / 2, 0, 0), 4, 1)];
      if (o.crest) {
        const fin = plate([[-0.14, 0], [0.14, 0], [0.1, o.crest * 0.55], [-0.02, o.crest], [-0.12, o.crest * 0.6]], 0.02, 0.006);
        fin.rotateY(-Math.PI / 2); xf(fin, 0.01, 0.235 * s, 0.0); out.push(fin);
      }
      if (o.nose) out.push(xf(plate([[-0.02, 0], [0.02, 0], [0.025, -0.11], [-0.025, -0.11]], 0.012, 0.004), 0, 0.12 * s, 0.15 * s));
      return out;
    },
    // A rounded close helm (Undead Knight): a domed skull, a brow ridge over the eye slit, a beaked visor below it,
    // and a broad flared gorget sitting on the shoulders. Eyes glow in the slit (y ≈ 0.16 × size).
    closeHelm(o) {
      const s = o.size ?? 1;
      const dome = lathe([[0.125, 0.12], [0.148, 0.16], [0.147, 0.21], [0.125, 0.26], [0.075, 0.293], [0, 0.302]].map(([r, y]) => [r * s, y * s]), 8, 1.06);
      const skull = lathe([[0.13, -0.04], [0.14, 0.02], [0.145, 0.12]].map(([r, y]) => [r * s, y * s]), 8, 1.0);
      const visor = deform(sphere(0.1 * s, 8, 5), v => { if (v.z > 0) v.z *= 1 + 0.35 * Math.max(0, 1 - Math.abs(v.x) / (0.07 * s)); });
      xf(visor, 0, 0.08 * s, 0.03 * s, 0, 0, 0, 1.35, 0.95, 1.12);
      const brow = xf(KIT_GEO.Torus(0.15 * s, 0.014 * s, 3, 9, Math.PI), 0, 0.165 * s, 0, Math.PI / 2, 0, 0, 1, 1.08, 1);
      const comb = xf(plate([[-0.13, 0], [0.13, 0], [0.1, 0.03], [-0.12, 0.03]], 0.014, 0.004), 0, 0.28 * s, 0.0, 0, Math.PI / 2, 0, s);
      const gorget = lathe([[0.25, -0.2], [0.23, -0.15], [0.18, -0.09], [0.145, -0.04]].map(([r, y]) => [r * s, y * s]), 8, 0.9);
      for (const g of [dome, skull, visor, gorget]) roughen(g, 0.006, 33);
      return [uvScale(dome, 3, 1), uvScale(skull, 3, 1), uvScale(visor, 2, 1), brow, comb, uvScale(gorget, 3, 1)];
    },
    // A swelling, rounded breastplate with a waist plackart (Undead Knight).
    breastplate(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      const g = lathe([[0.2, -0.04], [0.215, 0.07], [0.26, 0.2], [0.3, 0.34], [0.322, 0.45], [0.29, 0.53], [0.2, 0.6]].map(([r, y]) => [r * tw, y]), 9, oz * 1.12);
      deform(g, v => { if (v.z > 0) v.z += 0.03 * Math.max(0, 1 - Math.abs(v.x) / (0.12 * tw)) * Math.sin(Math.PI * Math.min(1, Math.max(0, (v.y + 0.04) / 0.64))); });   // a soft centre ridge
      const plackart = lathe([[0.225, 0.0], [0.24, 0.07], [0.235, 0.14]].map(([r, y]) => [r * tw, y]), 9, oz * 1.15);
      return [uvScale(roughen(g, 0.006, 41), 2, 1.2), uvScale(plackart, 2, 0.5)];
    },
    // A great rounded pauldron in three lames: a big dome and two curved plates below it (side: 1 left, -1 right).
    roundPauldron(o) {
      const s = o.size ?? 1, sd = o.side ?? 1, out = [];
      const dome = KIT_GEO.Sphere(0.12 * s, 8, 4, 0, TAU, 0, Math.PI * 0.58);   // dips past the equator: it hugs the shoulder
      xf(dome, 0.015 * sd * s, -0.005 * s, 0, 0, 0, -0.42 * sd, 1.05, 1.0, 1.1); out.push(uvScale(roughen(dome, 0.008, 5), 3, 1.5));
      for (let i = 0; i < 2; i++) {   // two lames down the outside of the upper arm
        const r = 0.098 * s * (1 - i * 0.08), g = KIT_GEO.Cylinder(r, r * 1.06, 0.055 * s, 7, 1, true, sd > 0 ? 0.25 : Math.PI + 0.25, 2.6);
        out.push(uvScale(xf(g, 0.03 * sd * s, (-0.055 - i * 0.045) * s, 0, 0, 0, -0.18 * sd, 1, 1, 1.05), 2, 0.5));
      }
      return out;
    },
    // Straight plate bands down a limb (vambrace, greave, gauntlet cuff), with an optional cop at the joint.
    plateBands(o) {
      const n = o.count ?? 3, step = (o.to - o.from) / n, out = [];
      for (let i = 0; i < n; i++) {
        const r = o.radius * (1 + (o.flare ?? 0) * i / Math.max(1, n - 1));
        out.push(uvScale(xf(tube(r, r * 1.06, step * 1.05, 7, true), 0, -(o.from + step * (i + 0.5)), 0), 1, 0.4));
      }
      if (o.cop) out.push(xf(sphere(o.cop, 6, 4), 0, 0, 0.02, 0, 0, 0, 1, 1, 1.05));
      return out;
    },
    // Banded tassets on the hips: curved lames over each thigh and the seat; the front is open over the trousers.
    tassets(o, M) {
      const tw = M.proportions.torsoW / 0.2, out = [];
      for (const [mid, span] of [[1.0, 1.35], [-1.0, 1.35], [Math.PI, 1.9]])
        for (let i = 0; i < 3; i++) {
          const r = (0.2 + i * 0.022) * tw, g = KIT_GEO.Cylinder(r, r + 0.02 * tw, 0.11, 6, 1, true, mid - span / 2, span);
          out.push(uvScale(xf(g, 0, -0.02 - i * 0.095, 0, 0, 0, 0, 1, 1, 0.82), 2, 0.5));
        }
      out.push(uvScale(xf(KIT_GEO.Torus(0.2 * tw, 0.024, 3, 12), 0, 0.05, 0, Math.PI / 2, 0, 0, 1, 1, 0.8), 6, 1));   // the fauld at the waist
      return out;
    },
    // A cloth peak on top of a hood (executioner, lancer): leans back.
    hoodPeak(o) { return [uvScale(xf(KIT_GEO.Cone(0.14 * (o.size ?? 1), 0.34 * (o.height ?? 1), 7, 1, true), 0, 0.3, -0.04, -0.35, 0, 0), 2, 1)]; },
    // A quiver on the back with arrows poking out.
    quiver(o) {
      const out = [{ slot: 'leather', geo: uvScale(xf(tube(0.055, 0.045, 0.5, 6), -0.1, 0.28, -0.22, 0.2, 0, 0.35), 1, 1) }];
      for (let i = 0; i < 3; i++) out.push({ slot: 'wood', geo: xf(KIT_GEO.Cone(0.016, 0.07, 4), -0.1 + i * 0.03 - 0.03 + 0.1 * 0.35 * 0, 0.58 + i * 0.02, -0.28 - 0.0, 0.2, 0, 0.35 + i * 0.12) });
      return out;
    },
    // A feathered cap: a shallow dome tilted over one eye, a long plume trailing behind.
    featherCap(o) {
      const cap = xf(KIT_GEO.Sphere(0.135, 8, 4, 0, TAU, 0, 1.25), 0, 0.13, 0, 0.15, 0, -0.15);
      const plume = xf(KIT_GEO.Cone(0.02, 0.4, 4), -0.13, 0.27, -0.1, 0.7, 0, 0.9);
      return [{ slot: o.slot, geo: uvScale(cap, 2, 1) }, { slot: o.plumeSlot, geo: plume }];
    },
    // A long beast's tail from the base of the spine, curving back and down to the floor, tapering in two lengths (Margit).
    tail(o) {
      const s = o.size ?? 1, V = (x, y, z) => new V3(x * s, y * s, z * s);
      const a = KIT_GEO.Tube(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, -0.12, -0.22), V(0.02, -0.36, -0.42), V(0.05, -0.62, -0.55)]), 8, 0.075 * s, 6, false);
      const b = KIT_GEO.Tube(new THREE.CatmullRomCurve3([V(0.05, -0.6, -0.54), V(0.09, -0.86, -0.6), V(0.16, -1.02, -0.48), V(0.24, -1.08, -0.3)]), 8, 0.045 * s, 5, false);
      const tip = xf(KIT_GEO.Cone(0.045 * s, 0.2 * s, 5), 0.29 * s, -1.08 * s, -0.2 * s, Math.PI / 2, 0, 0);
      return [uvScale(a, 3, 1), uvScale(b, 3, 1), tip];
    },
    // Grafted limbs (Godrick, v5.4): extra arms sprouting from the back and flanks, in the chest's frame. Each entry of
    // `arms` is [root, elbow, hand] points; a lumpy socket at the root, two tapering bones and a clawed hand.
    graftedArms(o) {
      const out = [], q = new THREE.Quaternion(), up = new V3(0, 1, 0);
      const seg = (a, b, r0, r1) => {
        const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), g = tube(r1, r0, d.length(), 5);
        g.applyQuaternion(q.setFromUnitVectors(up, d.normalize())); const m = A.add(B).multiplyScalar(0.5); return g.translate(m.x, m.y, m.z);
      };
      // `hand` (m): a broad palm with four long hooked claws (Godrick's grafts); without it, three short fingers.
      for (const [root, elbow, hand] of o.arms) {
        const r = o.r ?? 0.05, H = o.hand ?? 0;
        out.push(roughen(xf(sphere(r * 1.6, 6, 4), ...root), r * 0.4, 13));
        out.push(roughen(seg(root, elbow, r, r * 0.85), r * 0.15, 17), xf(sphere(r * 0.95, 5, 4), ...elbow), seg(elbow, hand, r * 0.85, r * 0.6));
        const h = new V3(...hand), dir = h.clone().sub(new V3(...elbow)).normalize();
        const side = new V3().crossVectors(dir, up).normalize(); if (side.lengthSq() < 0.1) side.set(1, 0, 0);
        if (H) {
          out.push(roughen(xf(sphere(H * 0.45, 6, 4), h.x, h.y, h.z, 0, 0, 0, 1.2, 1, 0.7), H * 0.06, 23));
          for (let i = -1.5; i <= 1.5; i++) {
            const base = h.clone().add(side.clone().multiplyScalar(i * H * 0.22)).add(dir.clone().multiplyScalar(H * 0.3));
            const mid = base.clone().add(dir.clone().multiplyScalar(H * 0.55)).add(side.clone().multiplyScalar(i * H * 0.12));
            const tip = mid.clone().add(dir.clone().multiplyScalar(H * 0.35)).add(new V3(0, -H * 0.3, 0));
            out.push(seg(base.toArray(), mid.toArray(), r * 0.32, r * 0.26), seg(mid.toArray(), tip.toArray(), r * 0.26, r * 0.04));
          }
          continue;
        }
        for (let i = -1; i <= 1; i++) {
          const tip = h.clone().add(dir.clone().multiplyScalar(0.12)).add(new V3(i * 0.04, 0, i * 0.03));
          out.push(seg(hand, tip.toArray(), r * 0.35, r * 0.12));
        }
      }
      return out.map(geo => uvScale(geo, 1.5, 1));
    },
    // A grafted dragon's head on the end of the left forearm (Godrick's second phase), jaws along the arm (-y): skull,
    // snout, open lower jaw, teeth, swept horns (all `o.slot`) and glowing eyes and a fire-lit throat (`o.glow`).
    dragonHead(o) {
      const s = o.size ?? 1, Y = -0.3 * s, out = [];
      const skull = roughen(xf(sphere(0.13 * s, 8, 6), 0, Y - 0.08 * s, 0.02 * s, 0, 0, 0, 1, 1.25, 0.9), 0.02 * s, 7);
      const snout = roughen(xf(new THREE.BoxGeometry(0.15 * s, 0.26 * s, 0.11 * s), 0, Y - 0.3 * s, 0.05 * s, 0.25, 0, 0), 0.015 * s, 9);
      const jaw = xf(new THREE.BoxGeometry(0.12 * s, 0.24 * s, 0.05 * s), 0, Y - 0.27 * s, -0.08 * s, -0.45, 0, 0);
      out.push(skull, snout, jaw);
      for (let i = -2; i <= 2; i++) out.push(xf(KIT_GEO.Cone(0.012 * s, 0.05 * s, 3), i * 0.028 * s, Y - 0.38 * s, 0.0, 0, 0, Math.PI));
      for (const sd of [-1, 1]) {
        const horn = KIT_GEO.Cone(0.035 * s, 0.32 * s, 5, 3);
        deform(horn, v => { const t = (v.y + 0.16 * s) / (0.32 * s); v.z += t * t * 0.12 * s; });
        out.push(xf(horn, sd * 0.08 * s, Y + 0.08 * s, 0.07 * s, -0.5, 0, sd * 0.35));
      }
      const glow = [xf(sphere(0.022 * s, 5, 3), -0.06 * s, Y - 0.18 * s, 0.1 * s), xf(sphere(0.022 * s, 5, 3), 0.06 * s, Y - 0.18 * s, 0.1 * s),
                    xf(sphere(0.05 * s, 6, 4), 0, Y - 0.36 * s, -0.02 * s, 0, 0, 0, 1, 0.6, 1)];
      return [...out.map(geo => ({ slot: o.slot, geo: uvScale(geo, 2, 1) })), ...glow.map(geo => ({ slot: o.glow, geo }))];
    },
    // A crown of twisted horn tendrils rising from the brow and temples (Margit): `count` curling spikes round the head.
    hornCrown(o) {
      const s = o.size ?? 1, n = o.count ?? 9, out = [];
      for (let i = 0; i < n; i++) {
        const a = -1.5 + 3.0 * i / (n - 1), len = (0.16 + 0.1 * hash3(i, 2, 3, 41)) * s;
        const g = KIT_GEO.Cone(0.03 * s, len, 5, 3);
        deform(g, v => { const t = (v.y + len / 2) / len; v.z += t * t * 0.08 * s; v.x += Math.sin(t * 5 + i) * 0.015 * s; });
        xf(g, Math.sin(a) * 0.13 * s, 0.17 * s + len * 0.4, Math.cos(a) * 0.1 * s, -0.35, 0, -Math.sin(a) * 0.55);
        out.push(roughen(g, 0.006, 40 + i));
      }
      out.push(roughen(xf(KIT_GEO.Torus(0.135 * s, 0.022 * s, 4, 12, Math.PI * 1.3), 0, 0.17 * s, 0.01, Math.PI / 2, 0, Math.PI * 0.85), 0.008, 49));
      return out;
    },
    // A ram's spiral horn of growth on the back of a shoulder (Margit): a tube coiling out flat, tapering.
    ramHorn(o) {
      const s = o.size ?? 1, sd = o.side ?? 1, pts = [];
      for (let i = 0; i <= 16; i++) { const t = i / 16, a = t * Math.PI * 3.2, r = (0.17 - 0.12 * t) * s; pts.push(new V3(sd * (0.02 + t * 0.05) * s, Math.cos(a) * r, -Math.sin(a) * r - 0.05 * s)); }
      const g = KIT_GEO.Tube(new THREE.CatmullRomCurve3(pts), 32, 0.045 * s, 6, false);
      const ribs = [];
      for (let i = 1; i < 12; i++) { const p = pts[i]; ribs.push(xf(KIT_GEO.Torus((0.05 - i * 0.002) * s, 0.008 * s, 3, 7), p.x, p.y, p.z, 0, Math.PI / 2, 0)); }
      return [uvScale(g, 4, 1), ...ribs];
    },
    // A thick furred tail curling round from the spine up toward the shoulder (Margit), with tufts along it.
    furTail(o) {
      const s = o.size ?? 1, sd = o.side ?? 1, V = (x, y, z) => new V3(x * s * sd, y * s, z * s);
      const curve = new THREE.CatmullRomCurve3([V(0, 0, -0.05), V(0.1, -0.2, -0.32), V(0.38, -0.32, -0.5), V(0.62, -0.1, -0.5), V(0.7, 0.25, -0.38), V(0.62, 0.55, -0.25), V(0.48, 0.72, -0.18)]);
      const g = new THREE.TubeGeometry(curve, 24, 0.13 * s, 8, false);   // fixed counts: the taper below walks its rings
      const pos = g.attributes.position, c = new V3();   // taper toward the tip
      for (let i = 0; i < pos.count; i++) {
        const t = Math.floor(i / 9) / 24, p = curve.getPointAt(clamp01(t)), k = 1 - 0.65 * t;
        c.fromBufferAttribute(pos, i).sub(p).multiplyScalar(k).add(p); pos.setXYZ(i, c.x, c.y, c.z);
      }
      g.computeVertexNormals();
      const tufts = [];
      for (let i = 0; i < 14; i++) {
        const t = 0.05 + 0.9 * i / 13, p = curve.getPointAt(t), tan = curve.getTangentAt(t), r = 0.13 * s * (1 - 0.65 * t);
        const cone = KIT_GEO.Cone(0.05 * s, 0.16 * s, 4); cone.rotateZ(Math.PI / 2 * (i % 2 ? 1 : -1)); cone.translate((i % 2 ? -1 : 1) * r, 0, 0);
        cone.lookAt(tan); cone.translate(p.x, p.y, p.z); tufts.push(cone);
      }
      return [uvScale(roughen(g, 0.02, 53), 2, 4), ...tufts];
    },
    // A long robe from the waist to the floor (Margit): flared, hanging in folds, its hem torn ragged; `len` m long.
    robeSkirt(o) {
      const L = o.len ?? 0.95, r0 = o.top ?? 0.22, r1 = o.hem ?? 0.42;
      const g = lathe([[r0, 0.04], [r0 + 0.02, -L * 0.25], [r0 + (r1 - r0) * 0.6, -L * 0.6], [r1, -L * 0.9], [r1 + 0.02, -L]], 16, o.oval ?? 0.85);
      deform(g, v => {
        const a = Math.atan2(v.z, v.x), t = clamp01(-v.y / L), fold = Math.sin(a * 9 + (o.seed ?? 0)) * 0.035 * t;
        v.x += Math.cos(a) * fold; v.z += Math.sin(a) * fold;
        if (t > 0.85) v.y -= (hash3(Math.round(a * 20), 3, 7, o.seed ?? 1) + 0.5) * 0.09 * t;
      });
      return [uvScale(roughen(g, 0.01, 61), 4, 2)];
    },
    // A hunched mound of back and shoulders under the cloth (Margit): a lumpy dome over the upper back.
    hunch(o) {
      const s = o.size ?? 1, g = sphere(0.3 * s, 10, 7);
      xf(g, 0, o.y ?? 0.42, o.z ?? -0.08, 0, 0, 0, 1.15, 0.85, 0.95); roughen(g, 0.025, 67);
      return [uvScale(g, 3, 2)];
    },
    // A loose cloth sleeve round a bone (upper arm): a flared tube, torn at the cuff.
    sleeve(o) {
      const L = o.len ?? 0.36, g = lathe([[o.r0 ?? 0.09, o.y0 ?? 0.02], [o.r1 ?? 0.13, -L]], o.seg ?? 9);
      deform(g, v => { if (v.y < -L * 0.8) v.y -= (hash3(Math.round(v.x * 70), Math.round(v.z * 70), 5, o.seed ?? 2) + 0.5) * 0.08; });
      return [uvScale(g, 2, 1.5)];
    },
    // A knotted rope sash across the body with two hanging ends (Margit's cord).
    ropeSash(o) {
      const s = o.size ?? 1, band = xf(KIT_GEO.Torus(0.24 * s, 0.018, 4, 14), 0, o.y ?? 0.05, 0, Math.PI / 2 + 0.25, 0, 0.2, 1, 1, 0.8);
      const ends = [-1, 1].map(i => xf(tube(0.016, 0.012, 0.42, 4), 0.06 * i, (o.y ?? 0.05) - 0.24, 0.2, 0.15, 0, i * 0.1));
      return [band, ...ends, xf(sphere(0.04, 5, 4), 0, (o.y ?? 0.05) - 0.02, 0.2)];
    },
    // A low gold circlet round the brow (head frame), a ring of short points on top (Godrick).
    circlet(o) {
      const r = o.r ?? 0.14, y = o.y ?? 0.2, out = [xf(KIT_GEO.Torus(r, 0.016, 4, 14), 0, y, 0.01, Math.PI / 2 + 0.12, 0, 0, 1, 1, 1)];
      out.push(xf(KIT_GEO.Cylinder(r * 1.02, r * 1.05, 0.05, 14, 1, true), 0, y + 0.02, 0.01, 0.12, 0, 0));
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; out.push(xf(KIT_GEO.Cone(0.016, 0.07, 4), Math.sin(a) * r, y + 0.07, Math.cos(a) * r + 0.01, 0.12, 0, 0)); }
      return out.map(g => uvScale(g, 3, 1));
    },
    // A wild mane of white hair: `count` tapering locks bursting out round the back, sides and top of the head.
    mane(o) {
      const n = o.count ?? 16, L = o.len ?? 0.4, out = [];
      for (let i = 0; i < n; i++) {
        const a = -2.0 + (i / (n - 1)) * 4.0, up = -1.05 + 0.5 * (hash3(i, 7, 3, 2) + 0.5), len = L * (0.7 + 0.6 * (hash3(i, 1, 9, 4) + 0.5));   // a = 0: straight back
        const g = plate([[-0.09, 0], [0.09, 0], [0.05, len * 0.6], [0, len]], 0.008, 0.003);
        deform(g, v => { const t = v.y / len; v.z += t * t * 0.14; v.x += Math.sin(t * 3 + i) * 0.03; });   // each lock curls down at the end
        xf(g, 0, 0, 0, -Math.PI / 2 + up, 0, 0);   // lie the lock backward (-z), tilted by `up`
        g.rotateY(a); xf(g, -Math.sin(a) * 0.09, 0.14 + 0.04 * Math.cos(i * 1.7), -Math.cos(a) * 0.09 - 0.02);
        out.push(g);
      }
      return out.map(g => uvScale(g, 1, 2));
    },
    // A round gold medallion pinned on the chest (chest frame).
    medallion(o) {
      const [x, y, z] = o.at ?? [0.12, 0.45, 0.2], r = o.r ?? 0.07;
      return [xf(KIT_GEO.Cylinder(r, r, 0.02, 12), x, y, z, Math.PI / 2, 0, 0), xf(KIT_GEO.Torus(r * 0.75, 0.01, 3, 12), x, y, z + 0.012),
              ...[0, 1, 2, 3].map(i => xf(new THREE.BoxGeometry(0.012, r * 1.5, 0.012), x, y, z + 0.014, 0, 0, i * Math.PI / 4))];
    },
    // Radagon's Elden Ring sigil (v5.7): a glowing rune burned into the chest (chest frame), the Ring's crossing arcs
    // over a vertical stroke and a crossbar, a hair proud of the skin; `glow` slot, `size` scales it.
    eldenRune(o) {
      const s = o.size ?? 1, [x, y, z] = o.at ?? [0.04, 0.4, 0.22], arc = (r, a0, a1, cy) => xf(KIT_GEO.Torus(r * s, 0.008 * s, 3, 16, a1 - a0), x, y + cy * s, z, 0, 0, a0);
      return [arc(0.1, 0.3, Math.PI * 2 - 0.3, 0.02), arc(0.065, Math.PI * 0.1, Math.PI * 1.1, 0.07), arc(0.065, Math.PI * 1.1, Math.PI * 2.1, -0.04),
              xf(new THREE.BoxGeometry(0.012 * s, 0.34 * s, 0.01), x, y - 0.03 * s, z), xf(new THREE.BoxGeometry(0.16 * s, 0.01 * s, 0.01), x, y + 0.1 * s, z),
              ...[-1, 1].map(k => xf(new THREE.BoxGeometry(0.008 * s, 0.09 * s, 0.01), x + k * 0.03 * s, y - 0.17 * s, z, 0, 0, k * 0.5))];
    },
    // The gold border of a cape section: two bands (`trim` m wide) down its edges, curved exactly as capeSegment,
    // a hair behind its outer face. Same fields as capeSegment.
    capeTrim(o) {
      const out = [], tw = o.trim ?? 0.05;
      for (const s of [-1, 1]) {
        const g = new THREE.PlaneGeometry(1, 1, 1, 2);
        deform(g, v => {
          const t = 0.5 - v.y, w = o.w0 + (o.w1 - o.w0) * t, x = s * (w / 2 - tw * (v.x + 0.5));
          v.x = x; v.z = x * x * (o.bow ?? 1.4) - 0.008; v.y = -t * o.len;
        });
        out.push(uvScale(g, 1, o.len / MS.texMeters));
      }
      return out;
    },
    // A parrying dagger in the left hand (blade forward), in the forearm's frame.
    dagger(o) {
      const blade = plate([[0.05, -0.022], [0.4, -0.02], [0.52, 0], [0.4, 0.02], [0.05, 0.022]], 0.012, 0.004);
      blade.rotateY(-Math.PI / 2); xf(blade, 0.006, -0.32, 0.0);
      const guard = xf(tube(0.012, 0.012, 0.2, 4), 0, -0.32, 0.05, 0, 0, Math.PI / 2);
      return [{ slot: o.slot, geo: blade }, { slot: o.guardSlot ?? 'iron', geo: xf(guard, 0, 0, 0) }];
    },
    // A rib cage on a hunched spine: `full` ribs wrap all the way round on one side, `broken` stop short on the other
    // (`whole: true`: both sides wrap round).
    ribcage(o) {
      const out = [], full = o.full ?? 6, broken = o.broken ?? 3, n = Math.max(full, broken), sp = o.spine ?? 0.12;
      for (let i = 0; i < n; i++) {
        const y = 0.06 + i * 0.075, rad = (0.2 + 0.07 * Math.sin(i / (n - 1) * Math.PI)) * (o.size ?? 1);
        for (const side of [1, -1]) {
          const len = side === 1 || o.whole ? Math.PI * 0.78 : (i < broken ? Math.PI * (0.35 + 0.1 * (i % 2)) : 0);
          if (side === 1 && i >= full) continue;
          if (len <= 0) continue;
          const g = KIT_GEO.Torus(rad, 0.017, 3, 7, len);
          // The torus arc starts at +x, curving toward +y; lay it flat and swing it so it starts at the spine (back) and
          // curves forward round a chest centred `rad` in front of it. The other side is the same arc turned over
          // (rotateZ(PI) mirrors x; the tube is round, so it stays the right way out). Ribs droop toward the front.
          g.rotateX(Math.PI / 2); g.rotateY(Math.PI / 2); xf(g, 0, 0, rad, 0, 0, 0, 1, 1, 0.8);
          if (side === -1) g.rotateZ(Math.PI);
          deform(g, v => { v.y -= Math.max(0, v.z) * 0.35; });
          xf(g, 0, y, -sp);
          out.push(g);
        }
      }
      for (let i = 0; i < 8; i++) out.push(xf(sphere(0.034 - i * 0.001, 5, 3), 0, 0.02 + i * 0.075, -sp - 0.0 - Math.sin(i * 0.25) * 0.02, 0, 0, 0, 1.2, 0.9, 1));
      out.push(xf(tube(0.02, 0.02, 0.62, 4), 0, 0.3, -sp, 0, 0, 0));
      return out.map(geo => ({ slot: o.slot, geo: uvScale(geo, 2, 1) }));
    },
    // A big skull's face: dark sockets, nose hole, teeth, a cracked jaw hanging open, a crack across the brow.
    skullFace(o, M) {
      const r = M.proportions.headR, out = [];
      for (const s of [-1, 1]) out.push({ slot: o.void, geo: xf(sphere(r * 0.24, 6, 4), s * r * 0.42, r * 1.05, r * 0.76, 0, 0, 0, 1, 1.15, 0.8) });
      out.push({ slot: o.void, geo: xf(KIT_GEO.Cone(r * 0.1, r * 0.3, 3), 0, r * 0.7, r * 0.9, Math.PI, 0, 0) });
      out.push({ slot: o.void, geo: xf(xf(plate([[-0.01, 0], [0.01, 0], [0.012, r * 0.9], [-0.012, r * 0.9]], 0.01, 0.002), 0, 0, 0), r * 0.15, r * 1.05, r * 0.98, 0, 0, -0.5) });
      const teeth = [];
      for (let i = -3; i <= 3; i++) teeth.push(xf(KIT_GEO.Cone(r * 0.04, r * 0.16, 3), i * r * 0.1, r * 0.46, r * 0.86 - Math.abs(i) * r * 0.03, Math.PI, 0, 0));
      const jaw = deform(sphere(r * 0.8, 8, 4), v => { if (v.y > 0) v.y *= 0.05; v.z += 0.2 * r; });
      xf(jaw, 0, r * 0.35, 0, 0.35, 0, 0.1, 0.9, 0.55, 0.9); roughen(jaw, 0.012, 41);
      for (let i = -3; i <= 3; i++) teeth.push(xf(KIT_GEO.Cone(r * 0.035, r * 0.12, 3), i * r * 0.1, r * 0.02, r * 0.95 - Math.abs(i) * r * 0.03, 0.35, 0, 0));
      return [...out, ...teeth.map(geo => ({ slot: o.slot, geo })), { slot: o.slot, geo: jaw }];
    },
    // Knuckles and joints: lumps of bone at the given points of the bone's frame.
    knobs(o) { return o.at.map(([x, y, z, r]) => roughen(xf(sphere(r, 6, 4), x, y, z), r * 0.25, 51)); },
    // Fingers: bony cones fanning out of a hand (in the forearm's frame).
    fingers(o) {
      const out = [];
      for (let i = -1; i <= 1; i++) out.push(xf(KIT_GEO.Cone(o.r ?? 0.012, o.len ?? 0.14, 4), i * (o.spread ?? 0.03), -(o.at ?? 0.34) - (o.len ?? 0.14) / 2, 0.012, Math.PI + 0.25, 0, i * 0.18));
      return out;
    },
    // Curved horns on a helmet.
    horns(o) {
      const out = [];
      for (const s of [-1, 1]) {
        const g = KIT_GEO.Cone(0.06 * (o.size ?? 1), 0.38 * (o.size ?? 1), 5, 3);
        deform(g, v => { const t = (v.y + 0.19 * (o.size ?? 1)) / (0.38 * (o.size ?? 1)); v.x += t * t * 0.28 * s * (o.size ?? 1); v.z += t * 0.04; });
        xf(g, s * 0.16 * (o.size ?? 1), 0.26, 0.0, 0, 0, -s * 0.4);
        out.push(g);
      }
      return out;
    },
    // The Crucible Knight's helm (v5.5): a tall closed bucket with a vertical slit, a crest spike on the brow, a flat
    // cross-guard over the crown and two broad horns sweeping out and up like a lyre (`metal` slot for the horns).
    crucibleHelm(o) {
      const s = o.size ?? 1, out = [];
      const body = lathe([[0.12, -0.06], [0.142, 0.02], [0.15, 0.16], [0.14, 0.27], [0.1, 0.31], [0, 0.32]].map(([r, y]) => [r * s, y * s]), 9, 1.05);
      deform(body, v => { if (v.z > 0.05 * s) v.z += (0.13 * s - Math.min(0.13 * s, Math.abs(v.x))) * 0.3; });   // a prow down the face
      roughen(body, 0.005, 61);
      out.push({ slot: o.slot, geo: uvScale(body, 3, 1) });
      const ribs = [-0.05, 0, 0.05].map(x => xf(new THREE.BoxGeometry(0.014 * s, 0.24 * s, 0.02 * s), x * s, 0.13 * s, 0.17 * s));
      const brow = xf(KIT_GEO.Torus(0.152 * s, 0.012 * s, 3, 9, Math.PI * 1.1), 0, 0.2 * s, 0.006 * s, Math.PI / 2, 0, -0.1, 1, 1.08, 1);
      const cross = xf(new THREE.BoxGeometry(0.3 * s, 0.035 * s, 0.07 * s), 0, 0.33 * s, 0.02 * s);
      const crest = xf(KIT_GEO.Cone(0.025 * s, 0.32 * s, 4), 0, 0.46 * s, 0.03 * s);
      for (const g of [...ribs, brow, cross, crest]) out.push({ slot: o.metal ?? o.slot, geo: g });
      for (const sd of [-1, 1]) {
        const h = KIT_GEO.Cylinder(0.012 * s, 0.05 * s, 0.5 * s, 6, 8).translate(0, 0.25 * s, 0);
        deform(h, v => { const t = v.y / (0.5 * s); v.x += sd * Math.sin(t * 2.2) * 0.22 * s; v.z -= t * t * 0.06 * s; v.y -= Math.max(0, t - 0.6) * 0.08 * s; });
        xf(h, sd * 0.13 * s, 0.24 * s, -0.01 * s, 0, 0, -sd * 0.25);
        roughen(h, 0.004, 17);
        out.push({ slot: o.metal ?? o.slot, geo: h });
      }
      return out;
    },
    // A large oval shield on the left forearm, face forward and dished: board (`slot`), rim and boss (`metal`); swirling
    // raised ribs over its face (the Crucible's tree and vortex reliefs). `w`, `h` in metres.
    ovalShield(o) {
      const w = o.w ?? 0.7, h = o.h ?? 1.0, at = o.at ?? [0.06, -0.2, 0.22], seg = 18, pts = [];
      for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2; pts.push([Math.cos(a) * w / 2, Math.sin(a) * h / 2]); }
      const dish = g => deform(g, v => { v.z -= ((v.x / (w / 2)) ** 2 + (v.y / (h / 2)) ** 2) * 0.07; });
      const board = dish(plate(pts, 0.04, 0.012)); roughen(board, 0.006, 23);
      const rim = dish(xf(KIT_GEO.Torus(0.5, 0.022, 3, seg * 2), 0, 0, 0.03, 0, 0, 0, w, h, 1));
      const boss = xf(lathe([[0, 0], [0.07, 0], [0.055, 0.05], [0, 0.065]], 8), 0, 0.05, 0.05, Math.PI / 2, 0, 0);
      const ribs = [];
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, r = new THREE.BoxGeometry(0.022, 0.32, 0.018, 1, 4, 1);
        deform(r, v => { v.x += Math.sin((v.y / 0.32 + 0.5) * 2.4) * 0.06; });
        ribs.push(dish(xf(r, Math.sin(a) * w * 0.22, Math.cos(a) * h * 0.22 + 0.03, 0.05, 0, 0, -a)));
      }
      return [board, rim, boss, ...ribs].map((g, i) => ({ slot: i ? o.metal : o.slot, geo: xf(g, ...at) }));
    },
    // Spikes on a shoulder: cones fanning up and out.
    spikes(o) {
      return (o.at ?? [[0.06, 0.1, 0.0], [0.1, 0.06, 0.07], [0.1, 0.06, -0.07]]).map(([x, y, z]) => {
        const sd = o.side ?? 1;
        return xf(KIT_GEO.Cone(0.03, 0.14 * (o.size ?? 1), 4), x * sd, y, z, 0, 0, -0.9 * sd);
      });
    },
    // A chain of links sagging between two points of the bone's frame.
    chain(o) {
      const out = [], n = o.links ?? 10, a = new V3(...o.from), b = new V3(...o.to);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * (o.sag ?? 0.06);
        const g = KIT_GEO.Torus(0.022, 0.006, 3, 5); g.scale(1, 1.4, 1);
        out.push(xf(g, p.x, p.y, p.z, 0, i % 2 ? Math.PI / 2 : 0, 0));
      }
      return out;
    },
    // A helm shaped like a bell, with a loop on top.
    bellHelm(o) {
      const s = o.size ?? 1;
      const g = lathe([[0.2, -0.04], [0.185, 0.02], [0.15, 0.12], [0.115, 0.21], [0.07, 0.27], [0.0, 0.295]].map(([r, y]) => [r * s, y * s]), 10);
      roughen(g, 0.01, 61);
      return [uvScale(g, 3, 1), xf(KIT_GEO.Torus(0.04 * s, 0.012, 3, 6), 0, 0.33 * s, 0, 0, Math.PI / 2, 0), uvScale(xf(KIT_GEO.Torus(0.2 * s, 0.014, 3, 10), 0, -0.035 * s, 0, Math.PI / 2, 0, 0), 4, 1)];
    },
    // A skirt flaring out like a bell.
    bellSkirt() {
      const g = lathe([[0.31, -0.5], [0.28, -0.4], [0.23, -0.22], [0.2, -0.06], [0.2, 0.05]], 10, 0.85);
      roughen(g, 0.012, 71);
      return [uvScale(g, 3, 1), uvScale(xf(KIT_GEO.Torus(0.31, 0.02, 3, 10), 0, -0.5, 0, Math.PI / 2, 0, 0, 1, 1, 0.85), 4, 1)];
    },
    // ---- the Hollow Soldier (v5.5) ----
    // A padded gambeson over the torso (chest frame), a little bulkier than the body, high collar.
    gambeson(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      return [uvScale(lathe(GAMBESON.map(([r, y]) => [r * tw, y]), 8, oz), 1.8, 1.2)];
    },
    // Its quilted skirt to mid-thigh (spin frame), a band of mail peeking under the hem when `mail` names a slot.
    quiltSkirt(o, M) {
      const tw = M.proportions.torsoW / 0.2, h = o.hem ?? -0.27;
      const g = lathe([[0.245, h], [0.225, -0.12], [0.205, 0.0], [0.195, 0.1]].map(([r, y]) => [r * tw, y]), 8, 0.78);
      deform(g, v => { if (v.y < h + 0.05) v.y += hash3(Math.round(v.x * 60), Math.round(v.z * 60), 7, 3) * 0.04; });
      const out = [uvScale(g, 2, 0.8)];
      if (o.mail) out.push({ slot: o.mail, geo: uvScale(lathe([[0.25 * tw, h - 0.06], [0.245 * tw, h + 0.03]], 8, 0.8), 3, 0.3) });
      return out;
    },
    // Two leather straps crossed over the chest, laid on the gambeson's front (chest frame).
    crossStraps(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      const rAt = y => { const P = GAMBESON; for (let i = 1; i < P.length; i++) if (y <= P[i][1]) { const t = (y - P[i - 1][1]) / (P[i][1] - P[i - 1][1]); return (P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t) * tw; } return P[P.length - 1][0] * tw; };
      return [-1, 1].map(s => {
        const a = new V2(-0.19 * s, 0.53), b = new V2(0.16 * s, 0.1), d = b.clone().sub(a), len = d.length();
        const g = new THREE.BoxGeometry(len, o.w ?? 0.045, 0.014, 4, 1, 1);
        xf(g, (a.x + b.x) / 2, (a.y + b.y) / 2, 0, 0, 0, Math.atan2(d.y, d.x));
        deform(g, v => { const r = rAt(v.y), x = Math.min(Math.abs(v.x), r * 0.97); v.z += r * oz * Math.sqrt(1 - (x / r) ** 2) + 0.012 + (s > 0 ? 0.006 : 0); });
        return uvScale(g, 1.5, 0.3);
      });
    },
    // A big square pouch with a flap at the front hip (spin frame).
    satchel(o) {
      const x = o.x ?? 0.13, z = o.z ?? 0.17;
      const bag = xf(plate([[-0.065, 0], [0.065, 0], [0.07, 0.13], [-0.07, 0.13]], 0.055, 0.014), x, -0.2, z - 0.03, 0.08, 0.35, 0.05);
      const flap = xf(new THREE.BoxGeometry(0.15, 0.075, 0.012), x + 0.02, -0.1, z + 0.045, -0.25, 0.35, 0.05);
      return [bag, flap];
    },
    // A morion helmet (head frame): a dome with a raised crest and a brim swept up at front and back.
    morion(o, M) {
      const s = (o.size ?? 1) * M.proportions.headR / 0.118;
      const dome = lathe([[0.152, 0.14], [0.145, 0.21], [0.1, 0.285], [0.0, 0.305]].map(([r, y]) => [r * s, y * s]), 8);
      const brim = lathe([[0.15 * s, 0.142 * s], [0.2 * s, 0.15 * s]], 8);
      deform(brim, v => { const f = (v.z * v.z) / (v.x * v.x + v.z * v.z + 1e-6); v.y += 0.09 * f * Math.hypot(v.x, v.z) / 0.2; if (v.z > 0.1) v.z *= 1.15; });
      const comb = xf(KIT_GEO.Sphere(0.13 * s, 6, 2, 0, TAU, 0, Math.PI / 2), 0, 0.245 * s, 0, 0, 0, 0, 0.05, 0.55, 1);
      roughen(dome, 0.008, 81); roughen(brim, 0.008, 82);
      return [uvScale(xf(dome, 0, -0.01, -0.005), 3, 1), uvScale(xf(brim, 0, -0.01, -0.005), 3, 1), comb];
    },
    // A round iron cop over the knee (knee frame).
    kneeCop(o) {
      const r = o.r ?? 0.068, cup = KIT_GEO.Sphere(r, 6, 3, 0, TAU, 0, Math.PI / 2);
      xf(cup, 0, -0.01, 0.045, Math.PI / 2, 0, 0, 1, 0.7, 1.15); roughen(cup, 0.006, 83);
      return [uvScale(cup, 2, 1)];
    },
    // A boot shaft up the shin with a loose turned-down cuff (knee frame).
    boot(o) {
      const shaft = tube(0.06, 0.056, 0.22, 6, true); xf(shaft, 0, -0.34, 0);
      const cuff = lathe([[0.066, -0.26], [0.08, -0.215], [0.084, -0.17]], 6); roughen(cuff, 0.008, 84);
      return [shaft, uvScale(cuff, 2, 0.5)];
    },
    // A broken arrow still stuck in the back
    // A cloth wrap over the lower face with eye sockets left dark: the face is hidden but readable.
    faceWrap(o, M) {
      const r = M.proportions.headR, band = uvScale(xf(tube(r * 0.97, r * 0.9, 0.085, 8, true), 0, r * 0.62, 0.012, 0.12, 0, 0, 1, 1, 1.05), 2, 0.5);
      const eye = s => xf(sphere(0.02, 5, 3), s * r * 0.4, r * 1.12, r * 0.84, 0, 0, 0, 1.3, 0.8, 0.6);
      return [band, { slot: 'leather', geo: eye(-1) }, { slot: 'leather', geo: eye(1) }];
    },
    // ---- the Rogue (v5.5) ----
    // A strap round the torso at height y (chest frame), its buckle at the front in `buckle`'s slot.
    strap(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW, r = (o.r ?? 0.22) * tw;
      const band = uvScale(xf(KIT_GEO.Torus(r, 0.016, 3, 12), 0, o.y, 0, Math.PI / 2, 0, o.tilt ?? 0, 1, 1, oz), 6, 1);
      const buckle = xf(plate([[-0.025, -0.022], [0.025, -0.022], [0.025, 0.022], [-0.025, 0.022]], 0.008, 0.004), o.bx ?? 0.05, o.y, r * oz + 0.004);
      return [band, { slot: o.buckle, geo: buckle }];
    },
    // A small flask on the belt.
    flask(o) { return [xf(lathe([[0, 0], [0.03, 0], [0.036, 0.02], [0.03, 0.07], [0.016, 0.09], [0.018, 0.115], [0, 0.115]], 6), o.x ?? 0.2, -0.04, o.z ?? 0.06, 0.1, 0, -0.12)]; },
    // A broken arrow still stuck in the back: the shaft, and fletching at the end.
    arrowBroken() {
      const dir = new V3(0.15, 0.55, -0.82).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir);
      const shaft = tube(0.009, 0.009, 0.4, 4), vane = new THREE.PlaneGeometry(0.05, 0.1);
      const place = (g, along) => { g.applyQuaternion(q); g.translate(0.07 + dir.x * along, 0.28 + dir.y * along, -0.12 + dir.z * along); return g; };
      return [place(shaft, 0.2), place(xf(vane, 0, 0.14, 0), 0.2), place(xf(vane.clone(), 0, 0.14, 0, 0, Math.PI / 2, 0), 0.2)];
    },
    // ---- the Shield Warden (v5.5, after the reference art) ----
    // A cylindrical flat-topped greathelm with a sharp central vertical nasal bar, a horizontal eye-slit band, and
    // vertical breathing bars down the face.
    towerHelm(o) {
      const s = o.size ?? 1;
      const body = lathe([[0.125, -0.05], [0.145, 0.03], [0.148, 0.16], [0.144, 0.27], [0.135, 0.285], [0, 0.29]].map(([r, y]) => [r * s, y * s]), 8, 1.05);
      deform(body, v => { if (v.z > 0.04 * s) v.z += (0.14 * s - Math.min(0.14 * s, Math.abs(v.x))) * 0.22; });   // slight prow down the front
      roughen(body, 0.006, 35);
      const crownRim = xf(KIT_GEO.Torus(0.143 * s, 0.011 * s, 3, 8), 0, 0.275 * s, 0.005 * s, Math.PI / 2, 0, 0, 1, 1.06, 1);
      const brow = xf(KIT_GEO.Torus(0.152 * s, 0.013 * s, 3, 7, Math.PI * 1.05), 0, 0.172 * s, 0.006 * s, Math.PI / 2, 0, -0.08, 1, 1.08, 1);
      const cheekBand = xf(KIT_GEO.Torus(0.15 * s, 0.01 * s, 3, 7, Math.PI * 1.05), 0, 0.132 * s, 0.006 * s, Math.PI / 2, 0, -0.08, 1, 1.08, 1);
      const nasal = xf(new THREE.BoxGeometry(0.022 * s, 0.32 * s, 0.026 * s), 0, 0.125 * s, 0.165 * s);
      const bars = [-2.5, -1.2, 1.2, 2.5].map(i => {
        const a = i * 0.22;
        return xf(new THREE.BoxGeometry(0.011 * s, 0.15 * s, 0.014 * s), Math.sin(a) * 0.145 * s, 0.055 * s, Math.cos(a) * 0.156 * s, 0, a, 0);
      });
      return [uvScale(body, 3, 1), crownRim, brow, cheekBand, nasal, ...bars];
    },
    // High spiked/crenellated collar and shoulder plates rising around the helm, plus a V-shaped plackart ridge on the chest.
    neckGuard(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW, out = [];
      const collar = lathe([[0.22 * tw, 0.52], [0.18 * tw, 0.59], [0.16 * tw, 0.65]].map(([r, y]) => [r, y]), 7, oz * 1.05);
      out.push(uvScale(collar, 2, 0.5));
      // Spiked vertical fins rising from the right shoulder guard and left high bevors
      for (const [x, y, z, h, rz, ry] of [
        [-0.24, 0.62, 0.04, 0.19, 0.22, 0.15], [-0.27, 0.6, -0.03, 0.22, 0.32, 0], [-0.23, 0.58, -0.1, 0.17, 0.25, -0.2],
        [0.2, 0.6, 0.05, 0.15, -0.2, -0.15], [0.22, 0.59, -0.04, 0.16, -0.25, 0.1],
      ]) {
        const fin = xf(KIT_GEO.Cone(0.032, h, 4), x * tw, y + h * 0.45, z, 0, ry, rz);
        out.push(fin);
      }
      // Diagonal overlapping chest bevel straps (V-shaped cuirass ribs)
      for (const s of [-1, 1]) {
        out.push(uvScale(xf(new THREE.BoxGeometry(0.24 * tw, 0.032, 0.022), s * 0.09 * tw, 0.37, 0.175 * tw * oz, 0.15, -s * 0.35, -s * 0.52), 1, 0.3));
        out.push(uvScale(xf(new THREE.BoxGeometry(0.22 * tw, 0.028, 0.02), s * 0.08 * tw, 0.26, 0.165 * tw * oz, 0.12, -s * 0.35, -s * 0.48), 1, 0.3));
      }
      return out;
    },
    // Heavy bulbous groin/codpiece plate at the front of the fauld, with waist belt bands above it (spin frame).
    codpiece(o, M) {
      const tw = M.proportions.torsoW / 0.2;
      const pouch = deform(sphere(0.11, 6, 4), v => { if (v.y < 0) v.x *= 0.78; v.z *= 0.85; });
      xf(pouch, 0, -0.13, 0.165 * tw, 0.15, 0, 0, 0.92, 1.35, 0.9); roughen(pouch, 0.006, 44);
      const belt2 = uvScale(xf(KIT_GEO.Torus(0.205 * tw, 0.016, 3, 8), 0, 0.01, 0, Math.PI / 2, 0, -0.06, 1, 1, 0.82), 5, 1);
      return [uvScale(pouch, 1.5, 1.5), belt2];
    },
    // A towering, ornate rectangular greatshield with horned top corners, curved inward like a pavilion, and raised
    // gothic X-rib and arch filigree over a fire-and-soot recessed face. Held on `elbowL`.
    greatshield(o) {
      const w = o.w ?? 0.74, h = o.h ?? 1.48, d = 0.038, at = o.at ?? [0.08, -0.22, 0.22], rot = o.rot ?? [0, 0, 0];
      const hw = w / 2, hh = h / 2;
      const bow = g => deform(g, v => {
        const nx = v.x / hw, ny = v.y / hh;
        // Concave top edge between two sweeping horn tips; gentle taper near the bottom
        if (ny > 0.68) v.y += (nx * nx * 0.14 - 0.05) * h * ((ny - 0.68) / 0.32);
        if (ny < -0.55) v.x *= 1 - 0.14 * ((-0.55 - ny) / 0.45);
        v.z -= (nx * nx) * 0.095;   // curve the shield face around the bearer
      });
      // Main recessed panel (`o.slot`: fiery rusted iron)
      const board = plate([
        [-hw, hh * 0.96], [0, hh * 0.85], [hw, hh * 0.96],
        [hw * 0.98, -hh * 0.65], [hw * 0.78, -hh * 0.96], [0, -hh], [-hw * 0.78, -hh * 0.96], [-hw * 0.98, -hh * 0.65],
      ], d, 0.01);
      bow(board); roughen(board, 0.006, 91);

      const trim = [];
      // Outer heavy frame rails (left, right, horned top arch, bottom bevel)
      const railL = xf(new THREE.BoxGeometry(0.055, h * 0.96, d + 0.026, 1, 3, 1), -hw + 0.022, -0.01 * h, d * 0.5);
      const railR = xf(new THREE.BoxGeometry(0.055, h * 0.96, d + 0.026, 1, 3, 1), hw - 0.022, -0.01 * h, d * 0.5);
      const railT = xf(new THREE.BoxGeometry(w * 1.02, 0.055, d + 0.028, 4, 1, 1), 0, hh * 0.88, d * 0.5);
      const railB = xf(new THREE.BoxGeometry(w * 0.84, 0.05, d + 0.024, 3, 1, 1), 0, -hh * 0.96, d * 0.5);
      // Inner secondary border rails
      const inL = xf(new THREE.BoxGeometry(0.026, h * 0.84, 0.022, 1, 2, 1), -hw * 0.78, -0.02 * h, d + 0.008);
      const inR = xf(new THREE.BoxGeometry(0.026, h * 0.84, 0.022, 1, 2, 1), hw * 0.78, -0.02 * h, d + 0.008);
      const inT = xf(new THREE.BoxGeometry(w * 0.78, 0.032, 0.022, 3, 1, 1), 0, hh * 0.75, d + 0.008);
      trim.push(railL, railR, railT, railB, inL, inR, inT);

      // Swept top horn tips on the upper corners
      for (const s of [-1, 1]) {
        const horn = KIT_GEO.Cone(0.042, 0.18, 4);
        xf(horn, s * (hw + 0.01), hh * 1.01, -0.08, -0.15, 0, -s * 0.38);
        trim.push(horn);
      }

      // Central vertical spine and X-shaped gothic tracery ribs meeting at a central boss
      const spine = xf(new THREE.BoxGeometry(0.034, h * 0.86, 0.026, 1, 2, 1), 0, -0.02 * h, d + 0.012);
      trim.push(spine);
      for (const s of [-1, 1]) {
        // Upper sweeping curve from top inner corner to center boss
        const upRib = new THREE.BoxGeometry(0.032, h * 0.46, 0.024, 1, 3, 1);
        deform(upRib, v => { v.x += s * (v.y / (h * 0.23)) * (hw * 0.34); });
        xf(upRib, s * hw * 0.34, hh * 0.32, d + 0.012);
        // Lower gothic arch rib from center boss down to bottom corners
        const dnRib = new THREE.BoxGeometry(0.032, h * 0.56, 0.024, 1, 3, 1);
        deform(dnRib, v => { const t = (0.5 - v.y / (h * 0.56)); v.x += s * Math.pow(clamp01(t), 0.75) * (hw * 0.66); });
        xf(dnRib, 0, -hh * 0.36, d + 0.012);
        // Inner lower lancet arch rib
        const inArch = new THREE.BoxGeometry(0.024, h * 0.46, 0.02, 1, 3, 1);
        deform(inArch, v => { const t = (0.5 - v.y / (h * 0.46)); v.x += s * Math.pow(clamp01(t), 0.8) * (hw * 0.32); });
        xf(inArch, 0, -hh * 0.44, d + 0.01);
        trim.push(upRib, dnRib, inArch);
      }
      for (const g of trim) bow(g);

      // Ornate central cross-boss and side clasps at waist height
      const cy = hh * 0.08;
      const boss = xf(lathe([[0, 0], [0.068, 0], [0.052, 0.038], [0, 0.052]], 6), 0, cy, d + 0.015, Math.PI / 2, 0, 0);
      const crossH = xf(new THREE.BoxGeometry(w * 0.86, 0.036, 0.026, 3, 1, 1), 0, cy, d + 0.008); bow(crossH);
      const claspL = xf(new THREE.BoxGeometry(0.08, 0.07, 0.038), -hw * 0.85, cy, d - 0.04);
      const claspR = xf(new THREE.BoxGeometry(0.08, 0.07, 0.038), hw * 0.85, cy, d - 0.04);
      trim.push(boss, crossH, claspL, claspR);

      const place = g => xf(g, at[0], at[1], at[2], rot[0], rot[1], rot[2]);
      return [
        { slot: o.slot, geo: place(uvScale(board, 1.5, 2.2)) },
        ...trim.map(g => ({ slot: o.metal, geo: place(uvScale(g, 1.5, 1.5)) })),
      ];
    },
    // ---- the Executioner (v5.5, after the reference art) ----
    // Swept-back auburn hair with a widow's peak, sideburns and a short knotted ponytail at the nape (head frame).
    sweptHair(o, M) {
      const r = M.proportions.headR * (o.size ?? 1), out = [];
      const cap = deform(KIT_GEO.Sphere(r * 1.07, 9, 6, 0.55, TAU - 1.1, 0, 2.05), v => {
        if (v.z > 0) v.y += 0.025 * Math.max(0, 1 - Math.abs(v.x) / (r * 0.45));   // widow's peak hairline
        if (v.z < 0) { v.z -= 0.03 * (1 - v.y / r); v.y -= 0.015; }
        v.x += Math.sin(v.y * 28 + v.z * 18) * 0.005;
      });
      out.push(uvScale(xf(cap, 0, r * 0.94, -0.008), 2, 1.5));
      for (let i = -2; i <= 2; i++) {   // swept-back crown ridges
        const ridge = xf(KIT_GEO.Cone(0.024 * (1 - Math.abs(i) * 0.1), 0.16, 4), i * 0.028, r * 1.72 - Math.abs(i) * 0.015, 0.01, -1.25, 0, -i * 0.18);
        out.push(uvScale(ridge, 1, 1));
      }
      const tail = xf(KIT_GEO.Cone(0.036, 0.18, 5), 0, r * 0.55, -r * 1.05, 2.6, 0, 0);
      out.push(uvScale(tail, 1, 1));
      return out;
    },
    // A diagonal strap and dark eye patch across one eye, plus sculpted nose bridge and brow (head frame).
    eyePatch(o, M) {
      const r = M.proportions.headR, sd = o.side ?? 1;
      const strap = uvScale(xf(KIT_GEO.Torus(r * 0.99, 0.011, 3, 12), 0, r * 1.04, 0.008, Math.PI / 2 - 0.14, 0.34 * sd, 0, 1.01, 0.94, 1), 3, 0.5);
      const patch = xf(sphere(0.028, 6, 4), sd * r * 0.36, r * 0.98, r * 0.85, 0.1, sd * 0.3, -0.22 * sd, 1.25, 0.82, 0.45);
      const nose = xf(KIT_GEO.Cone(0.018, 0.058, 4), 0, r * 0.86, r * 0.95, 0.32, Math.PI / 4, 0);
      const brow = xf(new THREE.BoxGeometry(0.044, 0.012, 0.018), -sd * r * 0.36, r * 1.12, r * 0.88, 0, -sd * 0.2, sd * 0.12);
      return [strap, patch, { slot: o.skin ?? 'skin', geo: nose }, { slot: o.hair ?? 'hair', geo: brow }];
    },
    // An upturned, V-notched collar around the neck (chest frame), framing the throat above the feathered hauberk.
    openCollar(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      const g = KIT_GEO.Cylinder(0.21 * tw, 0.175 * tw, 0.11, 10, 1, true, 0.45, TAU - 0.9);
      g.rotateY(Math.PI);   // leave the V-opening at the front (+z)
      deform(g, v => { if (v.z > 0) v.y -= 0.03 * (v.z / (0.2 * tw)); });
      return [uvScale(xf(g, 0, 0.585, -0.01, 0.08, 0, 0, 1, 1, oz * 1.05), 3, 0.6)];
    },
    // Layered leaf-shaped feather scales cascading down the chest, shoulders and hips: each scale is a pointed diamond
    // vane with a raised spine, overlapping the row below it.
    featherMantle(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW, out = [];
      const rows = o.rows ?? [
        { y: 0.49, r: 0.305, n: 8, w: 0.072, h: 0.16, tilt: 0.26 },
        { y: 0.35, r: 0.28, n: 8, w: 0.07, h: 0.165, tilt: 0.2 },
        { y: 0.21, r: 0.25, n: 7, w: 0.068, h: 0.155, tilt: 0.16 },
      ];
      for (let ri = 0; ri < rows.length; ri++) {
        const R = rows[ri];
        for (let i = 0; i < R.n; i++) {
          const a = ((i + (ri & 1) * 0.5) / R.n) * TAU, sn = Math.sin(a), cs = Math.cos(a);
          const x = sn * R.r * tw, z = cs * R.r * tw * oz, yaw = Math.atan2(sn, cs / oz);
          const vane = KIT_GEO.Cone(R.w, R.h, 4, 1);
          vane.translate(0, -R.h * 0.45, 0); vane.rotateX(Math.PI); vane.scale(1, 1, 0.24);
          out.push(uvScale(xf(vane, x, R.y + hash3(i, ri, 2, 19) * 0.012, z, R.tilt, yaw, hash3(i, ri, 5, 23) * 0.12), 0.7, 0.7));
        }
      }
      return out;
    },
    // A wide multi-band cummerbund sash wrapped round the waist, with a diagonal baldric strap and hanging cord tassels.
    waistSash(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW, out = [], cords = [];
      for (let i = 0; i < 4; i++) {
        const y = 0.01 + i * 0.032, r = (0.205 + i * 0.006) * tw;
        out.push(uvScale(xf(KIT_GEO.Torus(r, 0.018, 3, 12), 0, y, 0, Math.PI / 2 + (i % 2 ? 0.04 : -0.03), 0, i * 0.2, 1, 1, oz * 0.96), 5, 0.6));
      }
      // Diagonal leather strap cutting down from the chest across the sash, plus hanging cord loops at the right hip.
      const strap = uvScale(xf(KIT_GEO.Torus(0.22 * tw, 0.014, 3, 12), 0, 0.08, 0.005, Math.PI / 2 + 0.34, 0, -0.28, 1.02, 1, oz * 0.98), 5, 0.5);
      cords.push(strap);
      for (let i = 0; i < 3; i++) {
        cords.push(xf(tube(0.009, 0.006, 0.26 - i * 0.03, 4), (0.15 + i * 0.025) * tw, -0.11, (0.12 - i * 0.02) * tw * oz, 0.08, 0, 0.12 - i * 0.06));
      }
      return [...out.map(geo => ({ slot: o.slot, geo })), ...cords.map(geo => ({ slot: o.cord ?? o.slot, geo }))];
    },
    // An A-line skirt to above the knees with a broad embroidered bottom border and two vertical front trim bands (spin frame).
    borderedSkirt(o, M) {
      const tw = M.proportions.torsoW / 0.2, h0 = o.top ?? -0.02, h1 = o.hem ?? -0.44, bh = o.border ?? 0.095;
      const body = uvScale(lathe([[0.275 * tw, h1 + bh], [0.25 * tw, (h0 + h1) * 0.5], [0.205 * tw, h0]], 12, 0.78), 3, 1.2);
      const hem = uvScale(lathe([[0.288 * tw, h1], [0.278 * tw, h1 + bh + 0.008]], 12, 0.79), 5, 0.6);
      const strips = [-1, 1].map(s => {
        const g = new THREE.PlaneGeometry(0.052, (h0 - (h1 + bh)) + 0.02, 1, 3);
        deform(g, v => {
          const y = (h0 + h1 + bh) * 0.5 + v.y, t = (h0 - y) / (h0 - h1);
          const r = (0.205 + 0.073 * t) * tw, x = s * 0.095 * tw + v.x;
          v.x = x; v.y = y; v.z = Math.sqrt(Math.max(0, r * r - x * x)) * 0.79 + 0.008;
        });
        return uvScale(g, 0.5, 2);
      });
      return [{ slot: o.slot, geo: body }, { slot: o.trim ?? o.slot, geo: hem }, ...strips.map(geo => ({ slot: o.trim ?? o.slot, geo }))];
    },
    // ---- the Ashen Lancer (v5.5, after the reference art) ----
    // A compact skeletal skull and face under a coarse woven burlap hood (`o.hood`): cranium, brow ridge, open jaw,
    // dark eye sockets and nasal cavity (`o.void`), upper and lower teeth, and a deep draped hood with a rear tail —
    // all in ~220 triangles so a normal enemy can wear it with body.head = null and stay well inside the 1,500 budget.
    skeletalSkull(o, M) {
      const r = M.proportions.headR, out = [];
      // Cranium and upper face
      const cranium = deform(sphere(r, 5, 4), v => {
        if (v.y < 0) { const k = 1 - 0.35 * (-v.y / r); v.x *= k; v.z *= k; }
        if (v.z > 0) v.z *= 0.92;
        v.y *= 1.06;
      });
      xf(cranium, 0, r * 0.92, 0.008); roughen(cranium, 0.006, 37);
      // Heavy brow ridge and lower jaw
      const brow = xf(new THREE.BoxGeometry(r * 1.38, r * 0.22, r * 0.55), 0, r * 1.18, r * 0.65, 0.12, 0, 0);
      const jaw = deform(sphere(r * 0.68, 4, 3), v => { if (v.y > 0) v.y *= 0.15; v.z += 0.16 * r; });
      xf(jaw, 0, r * 0.34, 0.01, 0.28, 0, 0, 0.88, 0.55, 0.9);
      out.push({ slot: o.slot, geo: cranium }, { slot: o.slot, geo: brow }, { slot: o.slot, geo: jaw });
      // Dark eye sockets, nasal cavity, and diagonal brow crack
      for (const s of [-1, 1]) {
        out.push({ slot: o.void, geo: xf(sphere(r * 0.24, 4, 3), s * r * 0.38, r * 0.98, r * 0.78, 0, 0, 0, 1.05, 1.1, 0.7) });
      }
      out.push({ slot: o.void, geo: xf(KIT_GEO.Cone(r * 0.11, r * 0.28, 3), 0, r * 0.72, r * 0.9, Math.PI, 0, 0) });
      out.push({ slot: o.void, geo: xf(new THREE.BoxGeometry(0.012, r * 0.55, 0.014), r * 0.16, r * 1.15, r * 0.92, 0, 0, -0.45) });
      // Upper and lower teeth
      for (let i = -1.5; i <= 1.5; i++) {
        out.push({ slot: o.slot, geo: xf(KIT_GEO.Cone(r * 0.044, r * 0.15, 3), i * r * 0.16, r * 0.46, r * 0.86 - Math.abs(i) * r * 0.03, Math.PI, 0, 0) });
        out.push({ slot: o.slot, geo: xf(KIT_GEO.Cone(r * 0.04, r * 0.12, 3), i * r * 0.15, r * 0.12, r * 0.88 - Math.abs(i) * r * 0.03, 0.25, 0, 0) });
      }
      if (o.hood) {
        const hs = o.hoodSize ?? 1.14, close = o.close ?? 0.35, tail = o.tail ?? 0.42;
        const hood = KIT_GEO.Sphere(0.158 * hs, 7, 4, Math.PI / 2 + 0.75 - close, TAU - 1.5 + 2 * close, 0, 2.25);
        deform(hood, v => {
          if (v.z < 0 && v.y < 0.08) { v.z -= (0.08 - v.y) * 0.9 * tail; v.y -= (-v.z) * 0.15 * tail; }
          if (v.y > 0.1) v.z += (v.y - 0.1) * 0.35;
        });
        xf(hood, 0, 0.115, 0.0, 0.2, 0, 0, 1.02, 1.06, 1.06); roughen(hood, 0.012, 21);
        out.push({ slot: o.hood, geo: uvScale(hood, 2, 1) });
      }
      return out;
    },
    // A wide, ragged burlap shroud/poncho draped over the shoulders and chest (chest frame), parting in a V down
    // the front to expose the skeletal ribcage and spine underneath, with a twisted dark reddish-brown neck cord.
    shroud(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      // Open-front mantle cylinder from y = -0.05 up to the shoulders (y = 0.58).
      const mantle = KIT_GEO.Cylinder(0.245 * tw, 0.305 * tw, 0.62, 6, 2, true, 0.26, TAU - 0.52);
      deform(mantle, v => {
        const t = (0.31 - v.y) / 0.62;   // 0 at shoulders, 1 at lower hem
        if (v.z > 0) {
          const vGap = t < 0.7 ? (1 - t * 0.85) * 0.055 * tw : (t - 0.7) * 0.14 * tw;
          v.x += Math.sign(v.x || 1) * vGap;
          if (t > 0.65 && Math.abs(v.x) < 0.2 * tw) v.y -= 0.09 * (t - 0.65);
        }
        // Drape wide over both shoulders like a seamless poncho covering the upper arms (sx ≈ ±0.31)
        if (t < 0.6) v.x *= 1 + (0.6 - t) * 1.05;
        if (t > 0.7) v.y += hash3(Math.round(v.x * 40), Math.round(v.z * 40), 5, 19) * 0.065;   // ragged uneven hem
        v.x += hash3(Math.round(v.y * 30), Math.round(v.z * 30), 2, 23) * 0.012;
      });
      xf(mantle, 0, 0.26, -0.008, 0.04, 0, 0, 1, 1, oz * 1.2);
      // Shoulder cowl wrapping around the upper shoulders and neck base, curving down over the shoulder joints
      const cowl = KIT_GEO.Cylinder(0.145 * tw, 0.34 * tw, 0.19, 6, 1, true, 0.44, TAU - 0.88);
      deform(cowl, v => {
        if (v.y < 0) {
          v.x *= 1.24;   // flare wide over the left and right shoulder caps
          v.y -= Math.abs(v.x) * 0.16;   // droop down over the outer shoulders
          if (v.z < 0) v.z *= 0.62;   // hug the upper back cleanly so it never pokes out behind
        }
        if (v.z > 0) v.y -= 0.035 * (v.z / (0.22 * tw));
        v.y += hash3(Math.round(v.x * 50), Math.round(v.z * 50), 3, 29) * 0.012;
      });
      xf(cowl, 0, 0.525, -0.005, 0.03, 0, 0, 1, 1, oz * 1.08);
      // Twisted dark reddish-brown rope/cloth collar around the neck opening
      const cord = uvScale(xf(KIT_GEO.Torus(0.145 * tw, 0.028, 3, 5), 0, 0.56, 0.018, Math.PI / 2 + 0.22, 0, 0, 1.08, 1, oz * 1.14), 4, 1);
      const out = [{ slot: o.slot, geo: uvScale(mantle, 2.2, 1.4) }, { slot: o.slot, geo: uvScale(cowl, 2.2, 0.8) }];
      if (o.collar) out.push({ slot: o.collar, geo: cord });
      if (o.ribs) {
        // Dark hollow chest cavity behind the ribs, plus prominent bleached sternum and 4 pairs of downward-curving ribs
        const voidCore = xf(tube(0.135 * tw, 0.115 * tw, 0.48, 4, true), 0, 0.28, -0.01, 0, 0, 0, 1, 1, oz * 0.78);
        if (o.void) out.push({ slot: o.void, geo: voidCore });
        const bones = [
          // Central sternum/spine column
          xf(new THREE.BoxGeometry(0.024, 0.42, 0.022), 0, 0.28, 0.092 * tw * oz, -0.03, 0, 0),
        ];
        for (let i = 0; i < 4; i++) {
          const y = 0.14 + i * 0.09, w = (0.135 + 0.03 * Math.sin((i / 3) * Math.PI)) * tw;
          for (const s of [-1, 1]) {
            const rib = new THREE.BoxGeometry(w, 0.02, 0.02, 1, 1, 1);
            bones.push(xf(rib, s * w * 0.46, y, 0.088 * tw * oz, 0.12, s * 0.35, s * 0.22));
          }
        }
        for (const geo of bones) out.push({ slot: o.ribs, geo: uvScale(geo, 1, 1) });
      }
      return out;
    },
    // ---- the Gargoyle (v5.5, after the reference art) ----
    // A snarling stone demon/hound head with an ornate verdigris-patinated brow crown, deep dark eye/nostril cavities,
    // a wide-open roaring maw with stone fangs, and carved cheek/neck scroll ridges (~156 tris).
    gargoyleHead(o, M) {
      const r = M.proportions.headR, out = [], voidGeos = [], bronzeGeos = [], toothGeos = [];
      // Broad sculpted cranium and wide temple flares
      const cranium = deform(sphere(r * 1.05, 5, 3), v => {
        if (v.y < 0) v.y *= 0.35;
        if (v.z > 0) v.z *= 0.85;
        v.x *= 1.16;
      });
      xf(cranium, 0, r * 0.96, -0.01); roughen(cranium, 0.008, 71);
      out.push(cranium);
      // Forward-jutting beast snout / upper muzzle
      const snout = deform(new THREE.BoxGeometry(r * 1.15, r * 0.62, r * 1.1), v => {
        if (v.z > 0) { v.x *= 0.82; v.y *= 0.88; }
      });
      xf(snout, 0, r * 0.72, r * 0.56, 0.14, 0, 0); roughen(snout, 0.006, 73);
      out.push(snout);
      // Wide-open roaring lower jaw hanging down with a squared chin block
      const jaw = deform(new THREE.BoxGeometry(r * 0.88, r * 0.42, r * 1.05), v => {
        if (v.z > 0) v.x *= 0.78;
      });
      xf(jaw, 0, r * 0.06, r * 0.48, 0.48, 0, 0); roughen(jaw, 0.006, 75);
      out.push(jaw);
      // Deep black interior mouth cavity, eye sockets, and nostrils
      voidGeos.push(xf(new THREE.BoxGeometry(r * 0.72, r * 0.48, r * 0.78), 0, r * 0.38, r * 0.52, 0.22, 0, 0));
      for (const s of [-1, 1]) {
        voidGeos.push(xf(new THREE.BoxGeometry(r * 0.34, r * 0.26, r * 0.22), s * r * 0.38, r * 0.94, r * 0.78, 0.1, s * 0.2, -s * 0.15));
        voidGeos.push(xf(KIT_GEO.Cone(r * 0.11, r * 0.16, 3), s * r * 0.22, r * 0.76, r * 1.06, -Math.PI / 2, 0, 0));
      }
      // Upper and lower fangs + side teeth (open-bottom cones)
      for (const s of [-1, 1]) {
        toothGeos.push(xf(KIT_GEO.Cone(r * 0.065, r * 0.24, 3, 1, true), s * r * 0.28, r * 0.44, r * 0.92, Math.PI + 0.1, 0, 0));
        toothGeos.push(xf(KIT_GEO.Cone(r * 0.045, r * 0.15, 3, 1, true), s * r * 0.11, r * 0.48, r * 0.96, Math.PI + 0.1, 0, 0));
        toothGeos.push(xf(KIT_GEO.Cone(r * 0.058, r * 0.2, 3, 1, true), s * r * 0.24, r * 0.12, r * 0.86, 0.35, 0, 0));
      }
      // Ornate verdigris-patinated brow band and crest scrolls across the forehead and temples
      const browArc = xf(KIT_GEO.Torus(r * 0.96, r * 0.12, 3, 4, Math.PI * 0.88), 0, r * 1.12, r * 0.14, Math.PI / 2 - 0.22, 0, Math.PI * 0.06, 1.08, 0.85, 1);
      const centerCrest = xf(new THREE.BoxGeometry(r * 0.32, r * 0.34, r * 0.24), 0, r * 1.24, r * 0.86, -0.2, Math.PI / 4, 0);
      bronzeGeos.push(browArc, centerCrest);
      for (const s of [-1, 1]) {
        // Swept ear/temple horn scroll and engraved neck-shoulder relief band
        const horn = xf(KIT_GEO.Cone(r * 0.16, r * 0.52, 4, 1, true), s * r * 0.88, r * 1.08, r * 0.12, -0.55, 0, -s * 0.55);
        const cheek = xf(new THREE.BoxGeometry(r * 0.22, r * 0.48, r * 0.36), s * r * 0.62, r * 0.56, r * 0.42, 0.2, s * 0.35, -s * 0.18);
        out.push(horn, cheek);
      }
      return [
        ...out.map(geo => ({ slot: o.slot, geo: uvScale(geo, 1.8, 1.8) })),
        ...bronzeGeos.map(geo => ({ slot: o.bronze ?? o.slot, geo: uvScale(geo, 2, 1) })),
        ...voidGeos.map(geo => ({ slot: o.void ?? o.slot, geo })),
        ...toothGeos.map(geo => ({ slot: o.teeth ?? o.slot, geo })),
      ];
    },
    // Sculpted gargoyle chest and abdomen armor relief: carved pectoral scrolls, central sternum medallion, and
    // verdigris-patinated collarbone relief bands (chest frame, ~140 tris).
    gargoyleChest(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW, out = [], trim = [];
      // Muscular carved upper chest cuirass with shoulder trapezius ridges
      const chest = lathe([[0.17, -0.02], [0.19, 0.12], [0.25, 0.28], [0.305, 0.44], [0.27, 0.56], [0.18, 0.63]].map(([r, y]) => [r * tw, y]), 6, oz * 1.12);
      roughen(chest, 0.007, 77); out.push(uvScale(chest, 2, 1.4));
      // Raised carved scroll bands across the pectorals and collarbones, plus central medallion relief
      for (const s of [-1, 1]) {
        // Collarbone verdigris-patinated relief band running from neck to shoulder
        trim.push(uvScale(xf(new THREE.BoxGeometry(0.24 * tw, 0.042, 0.038), s * 0.14 * tw, 0.54, 0.13 * tw * oz, 0.25, -s * 0.38, -s * 0.32), 1.5, 0.5));
        // Pectoral scroll ridge
        out.push(uvScale(xf(KIT_GEO.Torus(0.095 * tw, 0.022, 3, 4, Math.PI * 1.25), s * 0.11 * tw, 0.39, 0.185 * tw * oz, 0.12, s * 0.28, s > 0 ? -0.4 : 1.2), 2, 0.5));
        // Rib / abdominal V-chevrons
        out.push(uvScale(xf(new THREE.BoxGeometry(0.18 * tw, 0.028, 0.026), s * 0.08 * tw, 0.22, 0.165 * tw * oz, 0.1, -s * 0.32, -s * 0.45), 1, 0.4));
      }
      // Central sternum rosette / whorl relief
      trim.push(xf(KIT_GEO.Torus(0.055 * tw, 0.018, 3, 4), 0, 0.29, 0.195 * tw * oz, 0.08, 0, 0));
      return [
        ...out.map(geo => ({ slot: o.slot, geo })),
        ...trim.map(geo => ({ slot: o.trim ?? o.slot, geo })),
      ];
    },
    // Carved pelvic/abdominal shield apron (spin frame, ~46 tris).
    gargoylePelvis(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW, out = [];
      // Ornate V-pointed abdomen and groin shield plate with raised scroll rim
      const apron = new THREE.ExtrudeGeometry(shape([
        [-0.14 * tw, 0.12], [0.14 * tw, 0.12], [0.16 * tw, -0.02],
        [0.09 * tw, -0.18], [0, -0.28], [-0.09 * tw, -0.18], [-0.16 * tw, -0.02],
      ]), { depth: 0.032, bevelEnabled: false, curveSegments: 1 });
      deform(apron, v => { v.z += (0.04 - Math.abs(v.x) * 0.22); });
      xf(apron, 0, 0.0, 0.135 * tw * oz, 0.08, 0, 0);
      out.push(uvScale(apron, 1.5, 1.5));
      for (const s of [-1, 1]) {
        out.push(uvScale(xf(new THREE.BoxGeometry(0.09 * tw, 0.028, 0.024), s * 0.055 * tw, -0.02, 0.175 * tw * oz, 0.08, s * 0.2, -s * 0.45), 1, 0.5));
      }
      return out.map(geo => ({ slot: o.slot, geo }));
    },
    // Massive gothic bat-cum-feathered stone wing (wingL / wingR frame, `side`: 1 left, -1 right, ~260 tris per wing).
    // Combines an inward-curling spiral scroll hook near the shoulder, a thick sweeping leading-edge stone spar rising
    // to a hooked wingtip horn, a scalloped outer webbing blade with branching rib veins, and two inner tiers of
    // carved stone feathers fanning along the wing root.
    gargoyleWing(o) {
      const sd = o.side ?? 1, s = o.size ?? 1, stone = [], wing = [];
      // 1. Thick curved upper wing arm rising from the back and sweeping out to the main wing wrist joint
      const armCurve = new THREE.CatmullRomCurve3([
        new V3(0, 0, 0),
        new V3(sd * 0.22 * s, 0.26 * s, -0.05 * s),
        new V3(sd * 0.52 * s, 0.62 * s, -0.08 * s),
        new V3(sd * 0.92 * s, 0.98 * s, -0.06 * s),
        new V3(sd * 1.42 * s, 1.18 * s, -0.02 * s),
      ]);
      const spar = new THREE.TubeGeometry(armCurve, 5, 0.055 * s, 4, false);   // fixed counts: the taper below walks its rings
      const sparPos = spar.attributes.position, tmp = new V3();
      for (let i = 0; i < sparPos.count; i++) {
        const t = Math.min(1, Math.floor(i / 5) / 5), p = armCurve.getPointAt(t), k = 1.25 - 0.65 * t;
        tmp.fromBufferAttribute(sparPos, i).sub(p).multiplyScalar(k).add(p);
        sparPos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
      spar.computeVertexNormals();
      stone.push(uvScale(roughen(spar, 0.008, 81), 3, 1));

      // 2. Iconic inward-curling rams-horn / volute hook at the inner upper wing edge (framing the head)
      const hookPts = [
        [0.18, 0.22, -0.04, 0.055],
        [0.14, 0.44, -0.03, 0.048],
        [0.05, 0.54, -0.02, 0.040],
        [-0.03, 0.46, -0.01, 0.032],
        [-0.01, 0.36, -0.01, 0.022],
      ];
      for (let i = 0; i < hookPts.length - 1; i++) {
        const [x0, y0, z0, r0] = hookPts[i], [x1, y1, z1, r1] = hookPts[i + 1];
        const dx = (x1 - x0) * sd * s, dy = (y1 - y0) * s, dz = (z1 - z0) * s, len = Math.hypot(dx, dy, dz);
        const seg = tube(r1 * s, r0 * s, len * 1.12, 4, true);
        const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), new V3(dx, dy, dz).normalize());
        seg.applyQuaternion(q);
        seg.translate((x0 + x1) * 0.5 * sd * s, (y0 + y1) * 0.5 * s, (z0 + z1) * 0.5 * s);
        stone.push(uvScale(seg, 1, 1));
      }

      // 3. Outer upturned claw horn at the wingtip apex (x = 1.44, y = 1.2)
      const tipHorn = KIT_GEO.Cone(0.038 * s, 0.24 * s, 4, 1, true);
      xf(tipHorn, sd * 1.44 * s, 1.3 * s, -0.01 * s, 0.1, 0, sd * 0.18);
      stone.push(uvScale(tipHorn, 1, 1));

      // 4. Broad gothic wing membrane / blade with scalloped trailing notches and deep relief
      const webPts = [
        [0.12, 0.04],
        [0.24, 0.28],
        [0.54, 0.64],
        [0.94, 0.99],
        [1.43, 1.18],
        [1.46, 0.94],
        [1.24, 0.72],
        [1.14, 0.44],
        [0.94, 0.18],
        [0.74, -0.06],
        [0.52, -0.24],
        [0.30, -0.26],
        [0.14, -0.14],
      ].map(([x, y]) => [x * sd * s, y * s]);
      const web = new THREE.ExtrudeGeometry(shape(webPts), { depth: 0.022 * s, bevelEnabled: false, curveSegments: 1 });
      deform(web, v => {
        const span = Math.abs(v.x) / (1.45 * s);
        v.z -= 0.011 * s + Math.sin(span * Math.PI) * 0.09 * s;
      });
      wing.push(uvScale(roughen(web, 0.006, 83), 2.5, 2.5));

      // 5. Branching skeletal stone ribs/veins fanning across the outer wing blade from the leading spar to the scalloped edge
      const ribs = [
        [[0.52, 0.60], [1.38, 0.95], 0.026],
        [[0.48, 0.54], [1.22, 0.72], 0.025],
        [[0.42, 0.44], [1.12, 0.44], 0.024],
        [[0.36, 0.34], [0.92, 0.18], 0.022],
        [[0.28, 0.22], [0.72, -0.05], 0.020],
        // Cross-vein struts between the main ribs for the stone lattice look
        [[0.88, 0.86], [0.94, 0.60], 0.016],
        [[0.78, 0.58], [0.80, 0.32], 0.015],
        [[0.64, 0.32], [0.62, 0.08], 0.014],
      ];
      for (const [[x0, y0], [x1, y1], r] of ribs) {
        const dx = (x1 - x0) * sd * s, dy = (y1 - y0) * s, len = Math.hypot(dx, dy);
        const midX = (x0 + x1) * 0.5, span = midX / 1.45, z = -Math.sin(span * Math.PI) * 0.09 * s;
        const bar = xf(tube(r * s * 0.7, r * s * 0.9, len, 3, true), midX * sd * s, (y0 + y1) * 0.5 * s, z, 0, 0, Math.atan2(dy, dx) - Math.PI / 2);
        stone.push(uvScale(bar, 1.5, 0.5));
      }

      // 6. Tiered rows of carved stone covert feathers along the inner half of the wing
      const feathers = [
        // Upper row of stout stone covert plates along the leading spar
        [0.28, 0.34, 0.22, -0.55], [0.38, 0.48, 0.24, -0.62], [0.50, 0.62, 0.25, -0.68],
        [0.64, 0.75, 0.25, -0.74], [0.78, 0.87, 0.24, -0.80],
        // Middle fan of layered stone feathers
        [0.24, 0.14, 0.28, -0.95], [0.35, 0.26, 0.30, -0.92], [0.47, 0.38, 0.32, -0.88],
        [0.60, 0.50, 0.32, -0.85], [0.73, 0.62, 0.30, -0.82],
        // Lower trailing stone pinions along the inner wing root
        [0.20, -0.06, 0.28, -1.35], [0.32, -0.08, 0.32, -1.22], [0.46, -0.06, 0.34, -1.12],
        [0.60, 0.02, 0.34, -1.04],
      ];
      for (const [fx, fy, flen, fang] of feathers) {
        const span = fx / 1.45, fz = -Math.sin(span * Math.PI) * 0.085 * s;
        const vane = KIT_GEO.Cone(0.058 * s, flen * s, 4, 1, true);
        vane.scale(1, 1, 0.38);
        xf(vane, fx * sd * s, fy * s, fz, 0, 0, sd * fang);
        wing.push(uvScale(vane, 0.8, 1.2));
      }
      return [
        ...stone.map(geo => ({ slot: o.slot, geo })),
        ...wing.map(geo => ({ slot: o.wing ?? o.slot, geo })),
      ];
    },
    // Long stone claws and sculpted forearm plates on the gargoyle's hands (elbowL / elbowR frame, `side`: 1 left, -1 right, ~38 tris).
    gargoyleClaws(o, M) {
      const sd = o.side ?? 1, len = 0.3 * (M.limbs?.armL?.len ?? 1), out = [];
      // Sculpted forearm ridge and pointed elbow spur
      out.push(uvScale(xf(KIT_GEO.Cone(0.032, 0.14, 4, 1, true), sd * 0.025, 0.03, -0.045, -2.4, 0, -sd * 0.2), 1, 1));
      out.push(uvScale(xf(new THREE.BoxGeometry(0.055, len * 0.78, 0.068), sd * 0.015, -len * 0.44, 0.01, 0, 0, 0), 1, 1.5));
      // Four long curved talons fanning from the hand + inner thumb talon
      for (let i = -1.5; i <= 1.5; i++) {
        const claw = KIT_GEO.Cone(0.016, 0.19, 3, 1, true);
        deform(claw, v => { if (v.y > 0) v.z -= 0.045; });
        xf(claw, i * 0.022, -len - 0.11, 0.02 - Math.abs(i) * 0.006, Math.PI + 0.18, 0, i * 0.14);
        out.push(claw);
      }
      const thumb = KIT_GEO.Cone(0.016, 0.14, 3, 1, true);
      xf(thumb, -sd * 0.048, -len - 0.06, 0.038, Math.PI - 0.25, 0, -sd * 0.45);
      out.push(thumb);
      return out.map(geo => ({ slot: o.slot, geo }));
    },
    // Raptor-like 4-taloned stone feet and sculpted shin/knee armor (kneeL / kneeR frame, ~44 tris).
    gargoyleFoot(o) {
      const out = [];
      // Pointed stone knee cop and shin crest
      const knee = xf(KIT_GEO.Cone(0.058, 0.16, 4, 1, true), 0, 0.01, 0.055, 1.25, 0, 0);
      const shin = xf(new THREE.BoxGeometry(0.078, 0.32, 0.095), 0, -0.2, 0.022, -0.05, 0, 0);
      out.push(uvScale(knee, 1, 1), uvScale(shin, 1, 1.5));
      // Broad 4-toed talon foot gripping the ground at y = -LEG_SEG (-0.45)
      for (let i = -1.5; i <= 1.5; i++) {
        const a = i * 0.22;
        const talon = KIT_GEO.Cone(0.028, 0.22, 3, 1, true);
        xf(talon, Math.sin(a) * 0.055, -LEG_SEG + 0.02, 0.12 + Math.cos(a) * 0.02, Math.PI / 2 + 0.18, a, 0);
        out.push(uvScale(talon, 1, 1));
      }
      return out.map(geo => ({ slot: o.slot, geo }));
    },
    // Short stone tail hanging down between the legs behind the pelvis (spin frame, ~14 tris).
    gargoyleTail(o) {
      const a = xf(tube(0.038, 0.026, 0.28, 4, true), 0, -0.18, -0.14, 0.18, 0, 0);
      const b = xf(KIT_GEO.Cone(0.028, 0.22, 3, 1, true), 0, -0.4, -0.17, Math.PI - 0.1, 0, 0);
      return [uvScale(a, 1, 1.5), uvScale(b, 1, 1)];
    },
    // ---- the Toll Wisp (v5.5, after the reference art) ----
    // An enormous wide-brimmed dark felt wizard hat (`o.slot`) with an undulating drooped brim, a patterned outer brim
    // border band (`o.brimTrim`), a dark underside (`o.void`), a tall slouching pointed crown whose tip hooks to the
    // left (+x, viewer's right), and a double-coiled pale twisted rope hatband (`o.rope`) with frayed hanging tassels (~210 tris).
    wispHat(o) {
      const s = o.size ?? 1, hat = [], rope = [], trim = [], dark = [];
      const brimWave = (x, z, r) => {
        const a = Math.atan2(z, x), u = clamp((r - 0.14 * s) / (0.42 * s), 0, 1);
        return (-0.052 * u * u + Math.sin(a * 2 + 0.4) * 0.016 * u - Math.cos(a - 0.3) * 0.012 * u) * s;
      };
      // Wide drooped brim (radius 0.55 m = 1.1 m across) with upper and lower faces
      const brim = lathe([
        [0.13, 0.135], [0.25, 0.142], [0.39, 0.136], [0.50, 0.124], [0.555, 0.112],
        [0.50, 0.114], [0.37, 0.124], [0.23, 0.13], [0.13, 0.125],
      ].map(([r, y]) => [r * s, y * s]), 12, 0.94);
      deform(brim, v => { v.y += brimWave(v.x, v.z, Math.hypot(v.x, v.z)); });
      xf(brim, 0, 0.01 * s, 0.01 * s, 0.05, 0, -0.04); roughen(brim, 0.005, 101);
      hat.push(uvScale(brim, 3, 3));

      // Decorative lighter geometric border band along the upper outer rim of the brim
      const brimBand = lathe([[0.43 * s, 0.133 * s], [0.535 * s, 0.118 * s]], 12, 0.94);
      deform(brimBand, v => { v.y += brimWave(v.x, v.z, Math.hypot(v.x, v.z)) + 0.004 * s; });
      xf(brimBand, 0, 0.01 * s, 0.01 * s, 0.05, 0, -0.04);
      trim.push(uvScale(brimBand, 6, 1));

      // Deep dark underside disc beneath the crown and inner brim so the face below sits in shadow
      const under = lathe([[0.0, 0.122 * s], [0.34 * s, 0.118 * s]], 8, 0.94);
      under.rotateX(Math.PI); xf(under, 0, 0.245 * s, 0.01 * s, 0.05, 0, -0.04);
      dark.push(under);

      // Tall slouching conical crown that bends backward and to the left (+x, viewer's right) into a hooked tip
      const crown = KIT_GEO.Cylinder(0.012 * s, 0.175 * s, 0.56 * s, 8, 5, true);
      deform(crown, v => {
        const t = clamp((v.y + 0.28 * s) / (0.56 * s), 0, 1);   // 0 at base, 1 at tip
        // Taper with a soft mid-crown bulge and crease folds
        const k = t < 0.55 ? 1 + 0.08 * Math.sin((t / 0.55) * Math.PI) : 1 - (t - 0.55) * 0.35;
        v.x *= k; v.z *= k * 0.94;
        // Slouch curve: sweeps up, then bends strongly toward +x (viewer's right) and -z, hooking down at the tip
        v.x += (t * t * 0.19 + Math.max(0, t - 0.65) ** 2 * 0.65) * s;
        v.z -= (t * t * 0.09 + Math.max(0, t - 0.6) ** 2 * 0.22) * s;
        v.y = (0.135 + t * 0.48 - Math.max(0, t - 0.68) ** 2 * 1.15) * s;
      });
      xf(crown, 0, 0.01 * s, 0.01 * s, 0.05, 0, -0.04); roughen(crown, 0.008, 103);
      hat.push(uvScale(crown, 2, 2));

      // Double-coiled pale twisted rope hatband around the crown base + knot and frayed hanging tassel on +x
      for (let i = 0; i < 2; i++) {
        const coil = xf(KIT_GEO.Torus((0.168 - i * 0.006) * s, 0.015 * s, 3, 8), 0.005 * s, (0.165 + i * 0.024) * s, 0.008 * s, Math.PI / 2 + 0.06, 0, -0.08 + i * 0.05, 1, 0.95, 1);
        rope.push(uvScale(coil, 5, 1));
      }
      rope.push(xf(sphere(0.024 * s, 4, 3), 0.135 * s, 0.172 * s, 0.088 * s));
      // Two frayed rope ends trailing from the knot across the front-left brim (+x) and hanging down
      rope.push(uvScale(xf(tube(0.012 * s, 0.008 * s, 0.22 * s, 4, true), 0.195 * s, 0.095 * s, 0.125 * s, 0.35, 0, 0.58), 1, 2));
      rope.push(uvScale(xf(tube(0.011 * s, 0.007 * s, 0.19 * s, 4, true), 0.175 * s, 0.088 * s, 0.142 * s, 0.45, 0, 0.42), 1, 2));

      return [
        ...hat.map(geo => ({ slot: o.slot, geo })),
        ...trim.map(geo => ({ slot: o.brimTrim ?? o.rope ?? o.slot, geo })),
        ...rope.map(geo => ({ slot: o.rope ?? o.slot, geo })),
        ...dark.map(geo => ({ slot: o.void ?? o.slot, geo })),
      ];
    },
    // Shadowed upper head inside the hat brim (`o.void`) and a thick, wavy white beard (`o.slot`) tumbling out from
    // beneath the brim shadow over the jaw and throat (head frame, ~110 tris).
    wispBeard(o, M) {
      const r = M.proportions.headR, beard = [];
      // Dark shadowed upper face/head under the wide brim
      const shadowHead = xf(sphere(r * 0.92, 5, 4), 0, r * 0.92, 0.0, 0, 0, 0, 0.95, 1.0, 0.92);
      // Full sculpted central beard volume beneath the brim
      const mass = deform(sphere(r * 0.78, 5, 4), v => {
        if (v.y < 0) { v.x *= 0.85; v.y *= 1.35; v.z += (-v.y) * 0.18; }
        if (v.z < 0) v.z *= 0.45;
      });
      xf(mass, 0, r * 0.32, r * 0.58, 0.12, 0, 0, 1.08, 1.15, 0.85); roughen(mass, 0.008, 107);
      beard.push(uvScale(mass, 2, 2));
      // Wavy cascading beard locks fanning across the front and sides of the chin down onto the upper chest
      for (let i = -3; i <= 3; i++) {
        const u = i / 3, len = (0.21 - Math.abs(u) * 0.045);
        const lock = KIT_GEO.Cone(0.028 * (1 - Math.abs(u) * 0.18), len, 4, 1, true);
        deform(lock, v => {
          const t = (len * 0.5 - v.y) / len;
          v.z += t * t * 0.028; v.x += Math.sin(t * 4 + i) * 0.008;
        });
        xf(lock, u * 0.078, r * 0.18 - len * 0.35 + Math.abs(u) * 0.02, r * 0.78 - u * u * 0.035, Math.PI - 0.18, u * 0.25, -u * 0.12);
        beard.push(uvScale(lock, 1, 2));
      }
      return [
        { slot: o.void ?? o.slot, geo: shadowHead },
        ...beard.map(geo => ({ slot: o.slot, geo })),
      ];
    },
    // Torso dressing for the Toll Wisp (chest frame, ~220 tris): golden-ochre brocade surcoat with a central vertical
    // rust-amber strip and dark side lapels, a draped chestnut-brown shoulder capelet/cowl with a knotted scarf/cravat
    // on the right chest (-x, viewer's left), flared sage-green shoulder caps peeking out under the capelet with gold
    // trim, and a diagonal brown leather baldric strap with metal buckles.
    wispMantle(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      const mantle = [], brocade = [], trim = [], coat = [], ep = [], leather = [], buckle = [], rope = [];

      // 1. Torso brocade surcoat + dark outer coat sides + central vertical amber strip
      const torso = lathe([[0.185, -0.03], [0.20, 0.10], [0.23, 0.26], [0.265, 0.42], [0.24, 0.54]].map(([r, y]) => [r * tw, y]), 8, oz * 1.08);
      brocade.push(uvScale(torso, 2, 1.5));
      const cStripe = xf(new THREE.BoxGeometry(0.062, 0.44, 0.022), 0, 0.20, 0.215 * tw * oz, -0.06, 0, 0);
      trim.push(uvScale(cStripe, 0.6, 2));
      for (const s of [-1, 1]) {
        // Raised amber lapel borders framing the central chest panel
        trim.push(uvScale(xf(new THREE.BoxGeometry(0.022, 0.38, 0.02), s * 0.085 * tw, 0.20, 0.20 * tw * oz, -0.05, s * 0.18, -s * 0.06), 0.4, 2));
        // Dark outer coat side panels flanking the ribs
        coat.push(uvScale(xf(new THREE.BoxGeometry(0.08 * tw, 0.42, 0.22 * tw * oz), s * 0.205 * tw, 0.20, -0.01, 0, 0, -s * 0.08), 1, 1.5));
      }

      // 2. Draped warm-brown shoulder capelet / cowl covering the upper chest, shoulders, and upper back
      const cowl = KIT_GEO.Cylinder(0.155 * tw, 0.345 * tw, 0.27, 9, 2, true);
      deform(cowl, v => {
        const t = (0.135 - v.y) / 0.27;   // 0 at neck, 1 at shoulder hem
        const a = Math.atan2(v.z, v.x);
        v.x *= 1 + t * 0.18;
        v.z *= oz * (1.08 + t * 0.12);
        // Asymmetric V-dip at the front chest and organic wavy hem
        if (v.z > 0 && t > 0.4) v.y -= 0.045 * (v.z / (0.28 * tw)) * t;
        if (t > 0.7) v.y += Math.sin(a * 5 + 0.8) * 0.018;
      });
      xf(cowl, 0, 0.485, -0.005, 0.04, 0, 0); roughen(cowl, 0.006, 109);
      mantle.push(uvScale(cowl, 2.5, 1.2));

      // 3. Knotted brown cloth scarf / cravat on the right collar/chest (-x, viewer's left) with cord tie & 2 hanging tails
      const kx = -0.095 * tw, ky = 0.46, kz = 0.175 * tw * oz;
      mantle.push(uvScale(xf(sphere(0.042, 5, 4), kx, ky, kz, 0, 0, 0, 1.15, 0.95, 0.85), 1, 1));
      rope.push(uvScale(xf(KIT_GEO.Torus(0.038, 0.01, 3, 6), kx, ky + 0.01, kz, 0.3, 0.2, -0.3), 3, 1));
      // Two pointed brown cloth tails hanging down from the knot over the upper right chest
      const tailA = KIT_GEO.Cone(0.048, 0.24, 4, 1, true);
      tailA.scale(1, 1, 0.42); xf(tailA, kx - 0.018, ky - 0.11, kz + 0.012, Math.PI - 0.12, 0.15, -0.14);
      const tailB = KIT_GEO.Cone(0.042, 0.27, 4, 1, true);
      tailB.scale(1, 1, 0.38); xf(tailB, kx + 0.022, ky - 0.13, kz + 0.016, Math.PI - 0.15, -0.1, 0.08);
      mantle.push(uvScale(tailA, 1, 1.5), uvScale(tailB, 1, 1.5));

      // 4. Sage-green / pale-olive shoulder caps peeking out from beneath the brown capelet on both shoulders
      for (const s of [-1, 1]) {
        const cap = KIT_GEO.Cylinder(0.095, 0.132, 0.12, 6, 1, true, s > 0 ? -0.35 : Math.PI - 1.25, 1.6);
        xf(cap, s * 0.255 * tw, 0.43, 0.0, 0, 0, -s * 0.28, 1, 1, 0.92);
        ep.push(uvScale(cap, 1.5, 0.8));
        const rim = KIT_GEO.Torus(0.13, 0.01, 3, 6, 1.55);
        xf(rim, s * 0.27 * tw, 0.375, 0.0, Math.PI / 2, -s * 0.28, s > 0 ? -0.78 : Math.PI - 0.78, 1, 0.92, 1);
        trim.push(uvScale(rim, 3, 1));
      }

      // 5. Diagonal brown leather baldric strap across the chest (+x left shoulder to -x right ribs) with two buckles
      const strap = new THREE.BoxGeometry(0.42 * tw, 0.038, 0.018, 4, 1, 1);
      xf(strap, 0.01 * tw, 0.41, 0, 0, 0, 0.68);
      deform(strap, v => {
        const x = Math.min(0.22 * tw, Math.abs(v.x));
        v.z += Math.sqrt(Math.max(0.005, (0.24 * tw) ** 2 - x * x)) * oz + 0.022;
      });
      leather.push(uvScale(strap, 2, 0.4));
      for (const [bx, by] of [[0.08, 0.46], [-0.04, 0.37]]) {
        const bz = Math.sqrt(Math.max(0.005, (0.24 * tw) ** 2 - (bx * tw) ** 2)) * oz + 0.028;
        buckle.push(xf(new THREE.BoxGeometry(0.028, 0.046, 0.012), bx * tw, by, bz, 0, bx * 0.5, 0.68));
      }

      return [
        ...mantle.map(geo => ({ slot: o.slot, geo })),
        ...brocade.map(geo => ({ slot: o.brocade ?? o.slot, geo })),
        ...trim.map(geo => ({ slot: o.trim ?? o.slot, geo })),
        ...coat.map(geo => ({ slot: o.coat ?? o.slot, geo })),
        ...ep.map(geo => ({ slot: o.epaulette ?? o.slot, geo })),
        ...leather.map(geo => ({ slot: o.leather ?? o.slot, geo })),
        ...buckle.map(geo => ({ slot: o.buckle ?? o.slot, geo })),
        ...rope.map(geo => ({ slot: o.rope ?? o.slot, geo })),
      ];
    },
    // Wide, loose brown sorcerer sleeves (`o.slot`) with crisscross pale X-lacing stitches (`o.lace`) down the outer
    // seam, and on the forearm (`upper: false`) a wide flared bell cuff bordered by a bright golden-ochre embroidered
    // cuff band (`o.trim`) and dark inner sleeve hollow (`o.void`).
    wispSleeve(o) {
      const sd = o.side ?? 1, sleeve = [], lace = [], trim = [], dark = [];
      if (o.upper) {
        const g = lathe([[0.076, 0.03], [0.095, -0.14], [0.112, -0.30]], 6, 0.95);
        roughen(g, 0.004, 111); sleeve.push(uvScale(g, 2, 1.4));
        for (let i = 0; i < 2; i++) {
          const y = -0.11 - i * 0.09, r = 0.096 + i * 0.008;
          for (const s of [-1, 1]) lace.push(xf(new THREE.BoxGeometry(0.008, 0.058, 0.008), sd * r, y, 0.008, s * 0.62, 0, -sd * 0.08));
        }
      } else {
        // Flared bell forearm sleeve from elbow (0.02) down to wrist cuff (-0.31)
        const g = lathe([[0.086, 0.02], [0.102, -0.12], [0.126, -0.24], [0.138, -0.31]], 7, 0.92);
        roughen(g, 0.005, 113); sleeve.push(uvScale(g, 2, 1.5));
        // Golden-ochre embroidered cuff band around the flared wrist
        const cuff = lathe([[0.126, -0.235], [0.141, -0.308]], 7, 0.93);
        trim.push(uvScale(cuff, 3, 0.6));
        // Dark hollow inside the wide cuff mouth
        const mouth = lathe([[0.035, -0.302], [0.132, -0.305]], 6, 0.92);
        dark.push(mouth);
        // Prominent row of 4 crisscross X-lacing stitches running down the outer sleeve seam
        for (let i = 0; i < 4; i++) {
          const y = -0.045 - i * 0.055, r = 0.094 + i * 0.009;
          for (const s of [-1, 1]) lace.push(xf(new THREE.BoxGeometry(0.008, 0.052, 0.008), sd * r, y, 0.01, s * 0.65, 0, -sd * 0.1));
        }
      }
      return [
        ...sleeve.map(geo => ({ slot: o.slot, geo })),
        ...trim.map(geo => ({ slot: o.trim ?? o.slot, geo })),
        ...lace.map(geo => ({ slot: o.lace ?? o.slot, geo })),
        ...dark.map(geo => ({ slot: o.void ?? o.slot, geo })),
      ];
    },
    // Full-length layered sorcerer robe (spin frame, ~250 tris): dark charcoal-olive outer coat skirt with deep folds
    // and frayed under-hem (`o.coat`), broad cream-gold damask brocade front apron (`o.brocade`), wide golden-amber
    // embroidered bottom border and central vertical stripe (`o.trim`), 4-coil twisted pale rope waist girdle (`o.rope`),
    // and an angled brown leather waist belt with metal buckle, hanging strap tongue, and left hip satchel (`o.leather`, `o.buckle`).
    wispRobe(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      const coat = [], brocade = [], trim = [], rope = [], leather = [], buckle = [];
      const L = o.len ?? 0.83, r0 = (o.top ?? 0.205) * tw, r1 = (o.hem ?? 0.385) * tw, ov = 0.82;
      const foldAt = (a, t) => Math.sin(a * 8 + 0.5) * 0.018 * t;

      // 1. Full-length dark outer coat skirt with vertical pleats and dark frayed under-skirt rim at the bottom
      const outer = lathe([
        [r0, 0.04], [r0 + (r1 - r0) * 0.28, -L * 0.28],
        [r0 + (r1 - r0) * 0.64, -L * 0.62], [r1, -L],
      ], 12, ov);
      deform(outer, v => {
        const a = Math.atan2(v.z, v.x), t = clamp01(-v.y / L), f = foldAt(a, t);
        v.x += Math.cos(a) * f; v.z += Math.sin(a) * f;
      });
      coat.push(uvScale(outer, 3.5, 2.2));
      const underHem = lathe([[r1 * 0.96, -L + 0.01], [r1 * 0.99, -L - 0.038]], 10, ov);
      coat.push(uvScale(underHem, 4, 0.4));

      // 2. Broad cream-gold damask brocade front apron spanning the front of the skirt (framed on the sides by the dark coat)
      const span = 1.9, mid = Math.PI / 2;   // CylinderGeometry theta = 0 is +Z, wait: in Three.js CylinderGeometry, theta = 0 is +Z!
      // In Three.js CylinderGeometry(rTop, rBot, height, seg, hSeg, open, thetaStart, thetaLength):
      // x = r * sin(theta), z = r * cos(theta). So theta = 0 is +Z (front)! Front arc is thetaStart = -span/2, thetaLength = span.
      const apronH = L * 0.84;
      const apron = KIT_GEO.Cylinder(r0 + 0.008, r0 + (r1 - r0) * 0.84 + 0.008, apronH, 8, 3, true, -span / 2, span);
      xf(apron, 0, -apronH / 2 + 0.01, 0, 0, 0, 0, 1, 1, ov);
      deform(apron, v => {
        const a = Math.atan2(v.z, v.x), t = clamp01(-v.y / L), f = foldAt(a, t);
        v.x += Math.cos(a) * f; v.z += Math.sin(a) * f + 0.004;
      });
      brocade.push(uvScale(apron, 2.2, 2.0));

      // 3. Wide ornate golden-amber bottom border band across the lower front apron + central vertical amber stripe
      const bTop = -apronH + 0.01, bBot = -L - 0.002, bH = bTop - bBot;
      const border = KIT_GEO.Cylinder(r0 + (r1 - r0) * 0.83 + 0.011, r1 + 0.011, bH, 8, 1, true, -span * 0.51, span * 1.02);
      xf(border, 0, (bTop + bBot) / 2, 0, 0, 0, 0, 1, 1, ov);
      deform(border, v => {
        const a = Math.atan2(v.z, v.x), t = clamp01(-v.y / L), f = foldAt(a, t);
        v.x += Math.cos(a) * f; v.z += Math.sin(a) * f + 0.005;
      });
      trim.push(uvScale(border, 3, 0.7));

      // Central vertical rust-amber brocade strip bisecting the front skirt from waist to bottom border
      const vStrip = new THREE.PlaneGeometry(0.068, L, 1, 4);
      deform(vStrip, v => {
        const y = -L / 2 + v.y, t = clamp01(-y / L), r = (r0 + (r1 - r0) * t) * ov + 0.016;
        v.y = y; v.z = r;
      });
      trim.push(uvScale(vStrip, 0.6, 2.5));

      // 4. Multi-coiled pale twisted rope waist girdle (4 coils) + front-right knot
      for (let i = 0; i < 4; i++) {
        const y = 0.0 + i * 0.025, r = (0.21 + (i % 2) * 0.005) * tw;
        const coil = xf(KIT_GEO.Torus(r, 0.017, 3, 10), 0, y, 0.004, Math.PI / 2 + (i % 2 ? 0.04 : -0.03), 0, i * 0.15, 1, 1, ov * 1.02);
        rope.push(uvScale(coil, 5, 0.8));
      }
      rope.push(uvScale(xf(sphere(0.038, 5, 4), -0.055 * tw, 0.03, r0 * ov + 0.022, 0, 0, 0, 1.15, 1.1, 0.85), 1, 1));

      // 5. Angled brown leather belt below the rope sash, front metal buckle, hanging strap tongue, and left hip satchel (+x)
      const belt = xf(KIT_GEO.Torus(0.218 * tw, 0.016, 3, 10), 0, -0.03, 0.004, Math.PI / 2 + 0.18, 0, -0.18, 1.02, 1, ov * 1.02);
      leather.push(uvScale(belt, 5, 0.8));
      const fz = r0 * ov + 0.018;
      buckle.push(xf(new THREE.BoxGeometry(0.042, 0.036, 0.016), 0.025 * tw, -0.035, fz + 0.008, 0, 0.1, -0.18));
      // Hanging leather strap end with metal chape tip
      leather.push(uvScale(xf(new THREE.BoxGeometry(0.032, 0.19, 0.012), 0.075 * tw, -0.13, fz + 0.006, 0.06, 0.22, -0.06), 0.5, 1));
      buckle.push(xf(new THREE.BoxGeometry(0.034, 0.028, 0.014), 0.082 * tw, -0.22, fz + 0.012, 0.06, 0.22, -0.06));
      // Moulded brown leather pouch/satchel at the left hip (+x, viewer's right)
      const px = 0.225 * tw, py = -0.13, pz = 0.05;
      leather.push(uvScale(xf(new THREE.BoxGeometry(0.065, 0.16, 0.13), px, py, pz, 0.08, 0.25, -0.12), 1, 1));
      leather.push(uvScale(xf(new THREE.BoxGeometry(0.072, 0.065, 0.138), px + 0.004, py + 0.055, pz, 0.08, 0.25, -0.16), 1, 0.6));

      return [
        ...coat.map(geo => ({ slot: o.coat ?? o.slot, geo })),
        ...brocade.map(geo => ({ slot: o.brocade ?? o.slot, geo })),
        ...trim.map(geo => ({ slot: o.trim ?? o.slot, geo })),
        ...rope.map(geo => ({ slot: o.rope ?? o.slot, geo })),
        ...leather.map(geo => ({ slot: o.leather ?? o.slot, geo })),
        ...buckle.map(geo => ({ slot: o.buckle ?? o.slot, geo })),
      ];
    },
    // Long braided rope loops and hanging tassels dangling from the front waist knot (tasselF bone frame, ~44 tris).
    wispTassels(o) {
      const out = [];
      // Two bow loops at the knot
      for (const s of [-1, 1]) {
        out.push(uvScale(xf(KIT_GEO.Torus(0.038, 0.01, 3, 5), s * 0.028, -0.03, 0.008, 0.15, s * 0.25, s * 0.4, 0.75, 1.35, 0.8), 2, 1));
      }
      // Two long hanging braided cords with tasseled ends reaching to knee level
      for (const [dx, len, rz] of [[-0.018, 0.44, 0.04], [0.02, 0.50, -0.03]]) {
        out.push(uvScale(xf(tube(0.012, 0.009, len, 4, true), dx, -len / 2 - 0.01, 0.006, 0.04, 0, rz), 1, 3));
        out.push(uvScale(xf(KIT_GEO.Cone(0.022, 0.075, 4, 1, true), dx - rz * len * 0.5, -len - 0.035, 0.02, 0.05, 0, rz), 1, 1));
      }
      return out.map(geo => ({ slot: o.slot, geo }));
    },
    // ---- the Giant Sentinel (v5.5, after the reference art) ----
    // A tall, narrow smooth ovoid close-helm (`o.slot`) over a wide ringed golden gorget, with a sharp vertical central
    // faceplate keel/ridge (`o.filigree`), a raised crown crest comb and short dark bronze plume/tuft on top (`o.plume`),
    // and two vertical columns of dark breathing/sight perforations (`o.void`) flanking the central ridge (~134 tris).
    sentinelHelm(o) {
      const s = o.size ?? 1, plate = [], fili = [], dark = [], plume = [];
      // Wide ringed golden gorget at the base of the neck/collar
      const gorget = lathe([[0.165 * s, -0.045 * s], [0.145 * s, 0.005 * s], [0.125 * s, 0.04 * s]], 7, 1.04);
      const gorgetRim = xf(KIT_GEO.Torus(0.158 * s, 0.012 * s, 3, 7), 0, -0.025 * s, 0.004 * s, Math.PI / 2 + 0.06, 0, 0, 1, 1.04, 1);
      plate.push(uvScale(gorget, 2.5, 0.8), uvScale(gorgetRim, 4, 1));

      // Tall narrow ovoid close-helm dome with a slight prow along the front centerline
      const helm = lathe([
        [0.118, 0.02], [0.130, 0.09], [0.132, 0.18], [0.122, 0.27], [0.092, 0.34], [0.0, 0.375],
      ].map(([r, y]) => [r * s, y * s]), 8, 1.16);
      deform(helm, v => {
        v.x *= 0.84;   // narrow, elongated lateral profile
        if (v.z > 0) v.z += (0.11 * s - Math.min(0.11 * s, Math.abs(v.x))) * 0.26;   // forward prow keel
      });
      roughen(helm, 0.003, 121);
      plate.push(uvScale(helm, 2.5, 1.5));

      // Sharp vertical central keel ridge running up the faceplate and over the crown
      const keel = xf(new THREE.BoxGeometry(0.018 * s, 0.30 * s, 0.032 * s), 0, 0.185 * s, 0.156 * s, -0.05, 0, 0);
      const comb = xf(new THREE.BoxGeometry(0.022 * s, 0.055 * s, 0.18 * s), 0, 0.365 * s, 0.01 * s, -0.08, 0, 0);
      fili.push(uvScale(keel, 0.5, 2), uvScale(comb, 1, 1));

      // Short dark bronze plume / crest tuft rising from the rear-top of the crown comb
      const tuftA = xf(KIT_GEO.Cone(0.026 * s, 0.12 * s, 4, 1, true), 0, 0.405 * s, -0.035 * s, -0.55, 0, 0);
      const tuftB = xf(KIT_GEO.Cone(0.022 * s, 0.10 * s, 4, 1, true), 0, 0.39 * s, -0.065 * s, -0.85, 0, 0);
      plume.push(uvScale(tuftA, 1, 1), uvScale(tuftB, 1, 1));

      // Two vertical columns of 3 dark breathing/sight perforations flanking the central faceplate ridge
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const y = (0.115 + i * 0.044) * s;
          dark.push(xf(new THREE.BoxGeometry(0.016 * s, 0.018 * s, 0.016 * s), side * 0.032 * s, y, 0.152 * s, 0, side * 0.22, 0));
        }
      }
      return [
        ...plate.map(geo => ({ slot: o.slot, geo })),
        ...fili.map(geo => ({ slot: o.filigree ?? o.slot, geo })),
        ...plume.map(geo => ({ slot: o.plume ?? o.filigree ?? o.slot, geo })),
        ...dark.map(geo => ({ slot: o.void ?? o.slot, geo })),
      ];
    },
    // Heavy golden-brass breastplate (`o.slot`) with an embossed arabesque filigree upper chest (`o.filigree`), raised
    // collar rim, and three horizontal articulated waist lames (fauld) visible on the exposed left side (chest frame, ~142 tris).
    sentinelCuirass(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      const plate = [], fili = [];
      // Broad barrelled golden cuirass shell
      const body = lathe([
        [0.195, 0.02], [0.205, 0.15], [0.245, 0.30], [0.275, 0.46], [0.235, 0.57], [0.175, 0.62],
      ].map(([r, y]) => [r * tw, y]), 8, oz * 1.08);
      deform(body, v => {
        if (v.z > 0 && v.y > 0.22 && v.y < 0.52) v.z += 0.022 * Math.sin(((v.y - 0.22) / 0.30) * Math.PI);
      });
      roughen(body, 0.004, 123);
      plate.push(uvScale(body, 2.5, 1.5));

      // Ornate filigree upper pectoral overlay panel (visible on the exposed left chest +x and upper back)
      const plackart = KIT_GEO.Cylinder(0.242 * tw, 0.278 * tw, 0.24, 7, 1, true, -0.2, Math.PI * 1.35);
      xf(plackart, 0, 0.43, 0.005, 0.03, 0, 0, 1.01, 1, oz * 1.10);
      fili.push(uvScale(plackart, 2.5, 1.2));

      // Raised golden collar rim and 3 horizontal molded waist lames (fauld rings) around the lower torso
      const collar = xf(KIT_GEO.Torus(0.18 * tw, 0.015, 3, 7), 0, 0.59, 0.006, Math.PI / 2 + 0.08, 0, 0, 1, 1, oz * 1.06);
      plate.push(uvScale(collar, 4, 1));
      for (let i = 0; i < 3; i++) {
        const y = 0.02 + i * 0.055, r = (0.202 + i * 0.008) * tw;
        const lame = xf(KIT_GEO.Torus(r, 0.015, 3, 7), 0, y, 0.003, Math.PI / 2 + 0.03, 0, 0, 1, 1, oz * 1.08);
        plate.push(uvScale(lame, 4, 0.8));
      }
      return [
        ...plate.map(geo => ({ slot: o.slot, geo })),
        ...fili.map(geo => ({ slot: o.filigree ?? o.slot, geo })),
      ];
    },
    // Signature pale ash-white diagonal surcoat drape / sash (`o.slot`) hanging from the right shoulder/collar (-x, viewer's left)
    // diagonally across the chest and back to the left hip (+x), bordered along both edges by double dark geometric
    // embroidered bands (`o.trim`) (chest frame, ~108 tris).
    sentinelSash(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      const cloth = [], trim = [];
      const rAt = y => {
        const t = Math.min(1, Math.max(0, y / 0.58));
        return (0.205 + 0.075 * Math.sin(t * Math.PI * 0.85)) * tw;
      };
      // Build front (+1) and back (-1) diagonal draped panels + double dark border strips along both edges
      for (const sideZ of [1, -1]) {
        const panel = new THREE.PlaneGeometry(0.23 * tw, 0.68, 3, 4);
        deform(panel, v => {
          const u = (0.34 - v.y) / 0.68;   // 0 at right shoulder (-x), 1 at left hip (+x)
          const cx = (-0.13 + u * 0.23) * tw;
          const cy = 0.58 - u * 0.62;
          const x = cx + v.x * (0.92 + u * 0.18);
          const r = rAt(cy), xClamped = Math.min(Math.abs(x), r * 0.96);
          const zSurf = Math.sqrt(Math.max(0.004, r * r - xClamped * xClamped)) * oz * 1.12;
          const fold = Math.sin((v.x / (0.115 * tw)) * Math.PI * 1.5 + u * 2.2) * 0.009;
          v.x = x;
          v.y = cy;
          v.z = sideZ * (zSurf + 0.018 + fold);
        });
        cloth.push(uvScale(panel, 1.5, 2.2));

        // Double dark embroidered border band along both diagonal edges of the sash
        for (const edge of [-1, 1]) {
          const border = new THREE.PlaneGeometry(0.036 * tw, 0.68, 1, 4);
          deform(border, v => {
            const u = (0.34 - v.y) / 0.68;
            const cx = (-0.13 + u * 0.23) * tw;
            const cy = 0.58 - u * 0.62;
            const x = cx + (edge * 0.092 * tw + v.x) * (0.92 + u * 0.18);
            const r = rAt(cy), xClamped = Math.min(Math.abs(x), r * 0.96);
            const zSurf = Math.sqrt(Math.max(0.004, r * r - xClamped * xClamped)) * oz * 1.12;
            v.x = x;
            v.y = cy;
            v.z = sideZ * (zSurf + 0.024);
          });
          trim.push(uvScale(border, 0.5, 2.5));
        }
      }
      // Shoulder drape cap bridging the front and back panels over the right collarbone/shoulder (-x)
      const cap = KIT_GEO.Cylinder(0.115 * tw, 0.135 * tw, 0.18 * tw, 5, 1, true, -Math.PI * 0.45, Math.PI * 0.9);
      cap.rotateZ(Math.PI / 2);
      xf(cap, -0.125 * tw, 0.535, 0, 0, 0, -0.18, 1, 0.85, oz * 1.15);
      cloth.push(uvScale(cap, 1, 1));

      return [
        ...cloth.map(geo => ({ slot: o.slot, geo })),
        ...trim.map(geo => ({ slot: o.trim ?? o.slot, geo })),
      ];
    },
    // Lower hanging portion of the Sentinel's white surcoat sash (`sashF` / `sashB` bones): a vertical pleated panel
    // (`o.slot`) bordered on both edges by double dark geometric stripes (`o.trim`) and ending in deeply jagged,
    // frayed tatters (`o.rags`) hanging to the knees (~52 tris per panel).
    sentinelSashHem(o) {
      const w = o.w ?? 0.26, len = o.len ?? 0.64, bodyH = len * 0.68, ragH = len * 0.38;
      const sd = o.back ? -1 : 1, seed = o.seed ?? 1;
      const cloth = [], trim = [], rags = [];

      // Upper woven white cloth panel with vertical pleat folds
      const panel = new THREE.PlaneGeometry(w, bodyH, 3, 3);
      deform(panel, v => {
        const t = (bodyH * 0.5 - v.y) / bodyH;
        v.x *= 1 + t * 0.08;
        v.y -= bodyH * 0.5;
        v.z += sd * (Math.sin(t * Math.PI) * 0.022 + Math.cos((v.x / w) * Math.PI * 3) * 0.008);
      });
      cloth.push(uvScale(panel, 1.4, 1.8));

      // Double dark geometric border bands along the left and right edges
      for (const edge of [-1, 1]) {
        const border = new THREE.PlaneGeometry(0.044, bodyH + ragH * 0.35, 1, 3);
        const bh = bodyH + ragH * 0.35;
        deform(border, v => {
          const t = (bh * 0.5 - v.y) / bh;
          v.x = (edge * (w * 0.5 - 0.026) + v.x) * (1 + t * 0.08);
          v.y -= bh * 0.5;
          v.z += sd * (Math.sin(Math.min(1, t) * Math.PI) * 0.022 + 0.006);
        });
        trim.push(uvScale(border, 0.5, 2.2));
      }

      // Deeply jagged, frayed tattered bottom hem (`o.rags` alpha-tested + jagged geometry spikes)
      const hem = new THREE.PlaneGeometry(w * 1.06, ragH, 4, 2);
      deform(hem, v => {
        const t = (ragH * 0.5 - v.y) / ragH;
        const col = Math.round((v.x / (w * 1.06) + 0.5) * 4);
        const jag = (col % 2 === 0 ? 0.09 : -0.06) + hash3(col, seed, 3, 17) * 0.05;
        v.y = -bodyH + 0.03 - t * (ragH + jag);
        v.x *= 1 + t * 0.06;
        v.z += sd * (0.012 * (1 - t) + hash3(col, Math.round(t * 4), seed, 23) * 0.015);
      });
      rags.push(uvScale(hem, 1.5, 1.0));

      return [
        ...cloth.map(geo => ({ slot: o.slot, geo })),
        ...trim.map(geo => ({ slot: o.trim ?? o.slot, geo })),
        ...rags.map(geo => ({ slot: o.rags ?? o.slot, geo })),
      ];
    },
    // Wide, horizontally flared golden pauldron (`o.slot`) with an upturned outer lip, embossed scrollwork top panel
    // (`o.filigree`), raised rim, and two articulated upper-arm rerebrace lames underneath (armL / armR frame, ~68 tris).
    sentinelPauldron(o) {
      const s = o.size ?? 1, sd = o.side ?? 1, plate = [], fili = [];
      // Main flared shoulder guard dome with upturned outer wing lip
      const dome = KIT_GEO.Sphere(0.155 * s, 7, 4, 0, TAU, 0, Math.PI * 0.56);
      deform(dome, v => {
        const out = v.x * sd;
        if (out > 0) {
          v.x += sd * (out / (0.155 * s)) * 0.065 * s;
          if (out > 0.095 * s) v.y += (out - 0.095 * s) * 0.58;   // upturned outer lip/rim
        }
        v.z *= 1.08;
      });
      xf(dome, sd * 0.038 * s, 0.025 * s, 0, 0, 0, -sd * 0.24);
      roughen(dome, 0.004, 127 + sd);
      plate.push(uvScale(dome, 2, 1.2));

      // Embossed filigree top crest panel over the pauldron dome
      const crest = KIT_GEO.Sphere(0.142 * s, 6, 3, 0, TAU, 0.08, Math.PI * 0.42);
      deform(crest, v => {
        const out = v.x * sd;
        if (out > 0) v.x += sd * (out / (0.142 * s)) * 0.055 * s;
        v.z *= 1.09;
      });
      xf(crest, sd * 0.04 * s, 0.032 * s, 0, 0, 0, -sd * 0.24);
      fili.push(uvScale(crest, 2, 1.2));

      // Two articulated golden rerebrace lames wrapping the upper arm below the pauldron
      for (let i = 0; i < 2; i++) {
        const y = -0.10 - i * 0.075, r = (0.092 - i * 0.005) * s;
        plate.push(uvScale(xf(tube(r * 0.94, r, 0.062, 6, true), sd * 0.008, y, 0, 0, 0, -sd * 0.06), 2, 0.6));
      }
      return [
        ...plate.map(geo => ({ slot: o.slot, geo })),
        ...fili.map(geo => ({ slot: o.filigree ?? o.slot, geo })),
      ];
    },
    // Ornate golden elbow couter (`o.slot`), contoured filigree vambrace (`o.filigree`), flared wrist cuff ring, and
    // articulated golden finger/knuckle plates (elbowL / elbowR frame, ~68 tris).
    sentinelGauntlet(o, M) {
      const sd = o.side ?? 1, len = 0.3 * (M.limbs?.armL?.len ?? 1), plate = [], fili = [];
      // Heavy projecting elbow cop (couter) with side flange
      const couter = xf(KIT_GEO.Sphere(0.078, 6, 3, 0, TAU, 0, Math.PI * 0.55), sd * 0.018, 0.01, -0.025, -Math.PI * 0.48, 0, -sd * 0.25, 1.05, 1.15, 0.9);
      plate.push(uvScale(couter, 1.5, 1));
      // Contoured barrelled filigree vambrace enclosing the forearm
      const vam = lathe([[0.064, -len * 0.88], [0.076, -len * 0.48], [0.072, -len * 0.12]], 6, 1.04);
      fili.push(uvScale(vam, 2, 1.4));
      // Raised golden upper and wrist cuff rings + articulated knuckle guard plate over the hand
      plate.push(uvScale(xf(KIT_GEO.Torus(0.075, 0.011, 3, 6), 0, -len * 0.14, 0, Math.PI / 2, 0, 0), 3, 1));
      plate.push(uvScale(xf(KIT_GEO.Torus(0.068, 0.012, 3, 6), 0, -len * 0.86, 0, Math.PI / 2, 0, 0), 3, 1));
      const handPlate = xf(new THREE.BoxGeometry(0.082, 0.095, 0.045), sd * 0.008, -len - 0.035, 0.018, 0.12, 0, -sd * 0.08);
      plate.push(uvScale(handPlate, 1, 1));
      return [
        ...plate.map(geo => ({ slot: o.slot, geo })),
        ...fili.map(geo => ({ slot: o.filigree ?? o.slot, geo })),
      ];
    },
    // Curved golden hip and upper-thigh tasset plates (`o.slot`) with embossed filigree centers (`o.filigree`) and a
    // molded golden waist belt ring over the bronze chainmail breeches (spin frame, ~68 tris).
    sentinelTassets(o, M) {
      const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW;
      const plate = [], fili = [];
      // Heavy molded golden waist belt ring
      plate.push(uvScale(xf(KIT_GEO.Torus(0.212 * tw, 0.02, 3, 8), 0, 0.01, 0, Math.PI / 2, 0, 0, 1, 1, oz * 1.06), 5, 1));
      // Left and right curved thigh tasset shields hanging from the fauld over the outer hips
      for (const s of [-1, 1]) {
        const shield = KIT_GEO.Cylinder(0.115 * tw, 0.145 * tw, 0.28, 5, 2, true, -0.68, 1.36);
        deform(shield, v => {
          const t = (0.14 - v.y) / 0.28;
          if (t > 0.65) v.x *= 1 - (t - 0.65) * 0.55;   // pointed lower tasset tip
        });
        xf(shield, s * 0.115 * tw, -0.15, 0.01, 0.06, s * Math.PI * 0.42, -s * 0.14);
        plate.push(uvScale(shield, 1.5, 1.5));

        const inset = KIT_GEO.Cylinder(0.095 * tw, 0.12 * tw, 0.21, 4, 1, true, -0.52, 1.04);
        xf(inset, s * 0.122 * tw, -0.145, 0.012, 0.06, s * Math.PI * 0.42, -s * 0.14);
        fili.push(uvScale(inset, 1.5, 1.2));
      }
      return [
        ...plate.map(geo => ({ slot: o.slot, geo })),
        ...fili.map(geo => ({ slot: o.filigree ?? o.slot, geo })),
      ];
    },
    // Complete lower-leg armor for the Giant Sentinel (kneeL / kneeR frame, ~108 tris): domed filigree knee cop (`poleyn`),
    // angled V-chevron upper-shin rim studded with raised rivets, tall contoured arabesque-engraved golden greave
    // (`schynbald`) flaring over the ankle with side bosses, and segmented laminar golden sabatons over the foot.
    sentinelGreave(o) {
      const sd = o.side ?? 1, plate = [], fili = [];
      // 1. Domed golden knee cop (poleyn) with raised central ridge and side wing boss
      const poleyn = KIT_GEO.Sphere(0.092, 6, 4, 0, TAU, 0, Math.PI * 0.55);
      deform(poleyn, v => {
        v.z *= 1.18;
        if (Math.abs(v.x) < 0.025) v.z += 0.016;   // central vertical knee keel
      });
      xf(poleyn, 0, 0.015, 0.032, Math.PI / 2 - 0.08, 0, 0, 0.96, 1, 0.92);
      fili.push(uvScale(poleyn, 1.8, 1.4));

      // 2. Angled V-chevron upper-shin border rim below the knee cop + 3 raised golden rivets
      const chevRim = KIT_GEO.Torus(0.092, 0.013, 3, 6, Math.PI * 1.15);
      deform(chevRim, v => { if (v.y > 0) v.z -= (v.y / 0.092) * 0.038; });
      xf(chevRim, 0, -0.065, 0.008, Math.PI / 2 + 0.18, 0, -Math.PI * 0.075);
      plate.push(uvScale(chevRim, 3, 1));
      for (const rx of [-0.048, 0, 0.048]) {
        const ry = -0.068 - (0.048 - Math.abs(rx)) * 0.45, rz = Math.sqrt(Math.max(0.002, 0.098 ** 2 - rx * rx));
        plate.push(xf(sphere(0.011, 4, 3), rx, ry, rz));
      }

      // 3. Tall contoured shin greave (schynbald) with arabesque filigree engraving and sharp front shin keel
      const shin = lathe([
        [0.086, -0.41], [0.074, -0.33], [0.082, -0.20], [0.092, -0.07],
      ], 7, 1.10);
      deform(shin, v => {
        if (v.z > 0 && Math.abs(v.x) < 0.03) v.z += 0.014;   // front shin ridge
      });
      fili.push(uvScale(shin, 2.2, 1.8));

      // Flared lower ankle rim and side ankle bosses
      const ankleRim = xf(KIT_GEO.Torus(0.086, 0.012, 3, 7), 0, -0.405, 0.006, Math.PI / 2 + 0.08, 0, 0, 1, 1.08, 1);
      const ankleBoss = xf(sphere(0.022, 4, 3), sd * 0.082, -0.39, 0.0, 0, 0, 0, 0.7, 1, 1);
      plate.push(uvScale(ankleRim, 3, 1), ankleBoss);

      // 4. Segmented laminar golden sabaton plates overlapping down the top of the foot
      for (let i = 0; i < 3; i++) {
        const fz = 0.055 + i * 0.065, fy = -LEG_SEG + 0.052 - i * 0.011, fw = 0.105 - i * 0.01;
        const lame = xf(new THREE.BoxGeometry(fw, 0.036, 0.068), 0, fy, fz, 0.22, 0, 0);
        plate.push(uvScale(lame, 1, 0.6));
      }
      return [
        ...plate.map(geo => ({ slot: o.slot, geo })),
        ...fili.map(geo => ({ slot: o.filigree ?? o.slot, geo })),
      ];
    },
  };


  // ---- weapons: name -> { blade: [geo], grip: [geo], guard: [geo] }, blade pointing +z from the hand --------------
  const KIT_WEAPONS = {
    // The Giant Sentinel's ornate golden/steel halberd (v5.5, after the reference art): a long spiral-fluted golden-brass
    // polearm shaft with an engraved square block and cylindrical ferrule at the butt end, tiered golden socket collars,
    // an ornate golden filigree inner axe mount, a sweeping crescent steel axe blade with a hooked lower beard, a rear
    // fluke spike, and a tall diamond-section top spear point (~162 tris).
    sentinelHalberd() {
      const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => xf(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
      // Long golden-brass shaft extending behind the hand (-0.92) to the head socket (1.58)
      const shaft = uvScale(xf(tube(0.028, 0.025, 2.50, 5, true), 0, 0, 0.33, Math.PI / 2, 0, 0), 1, 5);
      // Helical/spiral grip rings along the shaft + ornate square engraved block and cylindrical ferrule at the butt end
      const gripRings = [-0.45, -0.15, 0.18, 0.52, 0.86, 1.18].map((z, i) =>
        xf(KIT_GEO.Torus(0.031, 0.006, 3, 5), 0, 0, z, 0.22 * (i % 2 ? 1 : -1), 0, 0)
      );
      const buttBlock = uvScale(box(0.068, 0.068, 0.14, 0, 0, -0.78), 1, 1);
      const buttRing = xf(tube(0.042, 0.042, 0.028, 5, true), 0, 0, -0.69, Math.PI / 2, 0, 0);
      const buttFerrule = xf(tube(0.024, 0.028, 0.15, 5, true), 0, 0, -0.92, Math.PI / 2, 0, 0);

      // Ornate golden head socket with tiered rings and an engraved filigree inner axe-plate mount
      const socket = uvScale(xf(tube(0.044, 0.034, 0.34, 5, true), 0, 0, 1.48, Math.PI / 2, 0, 0), 1, 1.5);
      const sockRingA = xf(tube(0.052, 0.052, 0.03, 5, true), 0, 0, 1.32, Math.PI / 2, 0, 0);
      const sockRingB = xf(tube(0.050, 0.050, 0.03, 5, true), 0, 0, 1.64, Math.PI / 2, 0, 0);
      const axeMount = uvScale(box(0.026, 0.16, 0.28, 0, -0.09, 1.48), 1, 1);

      // Sweeping crescent axe blade (`blade` slot) with a deep hooked lower beard and curved cutting edge
      const axeProf = [
        [1.18, -0.34, -0.22],
        [1.28, -0.44, -0.15],
        [1.44, -0.48, -0.05],
        [1.60, -0.45, -0.04],
        [1.74, -0.36, -0.08],
        [1.82, -0.22, -0.14],
      ];
      const axe = new THREE.BoxGeometry(0.022, 1, 1, 1, 2, axeProf.length - 1);
      deform(axe, v => {
        const u = Math.min(1, Math.max(0, v.z + 0.5)) * (axeProf.length - 1), i = Math.min(axeProf.length - 2, Math.floor(u)), f = u - i;
        const z = axeProf[i][0] + (axeProf[i + 1][0] - axeProf[i][0]) * f;
        const yBot = axeProf[i][1] + (axeProf[i + 1][1] - axeProf[i][1]) * f;
        const yTop = axeProf[i][2] + (axeProf[i + 1][2] - axeProf[i][2]) * f;
        const ty = v.y + 0.5;   // 0 at outer crescent edge, 1 at inner beard/socket edge
        v.z = z;
        v.y = yBot + (yTop - yBot) * ty;
        v.x *= ty < 0.2 ? 0.18 : ty > 0.85 ? 0.75 : 1.0;
      });
      roughen(axe, 0.002, 131);

      // Rear upward-swept fluke beak (+y) and tall diamond-section top spear spike (+z)
      const fluke = xf(KIT_GEO.Cone(0.028, 0.22, 4, 1, true), 0, 0.13, 1.48, -0.28, Math.PI / 4, 0);
      const spearSpike = xf(KIT_GEO.Cone(0.038, 0.58, 4, 1, true), 0, 0, 1.94, Math.PI / 2, Math.PI / 4, 0);
      spearSpike.scale(0.55, 1.0, 1.0);

      return {
        blade: [uvScale(axe, 0.8, 0.8), fluke, spearSpike],
        grip: [shaft, ...gripRings, buttFerrule],
        guard: [buttBlock, buttRing, socket, sockRingA, sockRingB, axeMount],
      };
    },
    // The Ashen Lancer's giant curved glaive (v5.5, after the reference art): a long dark wooden polearm shaft with a
    // ringed iron butt-cap at the rear, cord bindings and tattered cloth streamers below the socket, and a long
    // sweeping single-edged curved blade with three circular perforations near the base and crusty rust along the spine.
    glaive() {
      const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => xf(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
      // Long dark wooden polearm shaft extending well behind the hand (-0.82) to the socket (1.48)
      const shaft = roughen(uvScale(xf(tube(0.025, 0.022, 2.3, 4, true), 0, 0, 0.33, Math.PI / 2, 0, 0), 1, 4), 0.003, 61);
      // Rear iron butt-cap ferrule and two raised collar rings, plus forward socket collar
      const buttCap = xf(tube(0.029, 0.023, 0.16, 4, true), 0, 0, -0.76, Math.PI / 2, 0, 0);
      const buttRingA = xf(tube(0.035, 0.035, 0.02, 4, true), 0, 0, -0.68, Math.PI / 2, 0, 0);
      const buttRingB = xf(tube(0.033, 0.033, 0.02, 4, true), 0, 0, -0.78, Math.PI / 2, 0, 0);
      const socket = xf(tube(0.038, 0.029, 0.22, 4, true), 0, 0, 1.4, Math.PI / 2, 0, 0);
      const sockRing = xf(tube(0.043, 0.043, 0.024, 4, true), 0, 0, 1.31, Math.PI / 2, 0, 0);
      // Cord bindings along the upper shaft and tattered cloth ribbons hanging underneath (-y)
      const wraps = [0.94, 1.16].map((z, i) => xf(tube(0.032, 0.03, 0.12, 4, true), 0, 0, z, Math.PI / 2 + (i % 2) * 0.06, 0, 0));
      const streamerA = deform(new THREE.PlaneGeometry(0.058, 0.36, 1, 1), v => {
        const t = 0.18 - v.y;
        v.z -= t * 0.22; v.x *= 1 - t * 1.25;
      });
      const streamerB = deform(new THREE.PlaneGeometry(0.046, 0.27, 1, 1), v => {
        const t = 0.135 - v.y;
        v.z -= t * 0.16; v.x *= 1 - t * 1.4;
      });
      xf(streamerA, 0.01, -0.16, 1.18, 0.12, 0.15, 0);
      xf(streamerB, -0.01, -0.13, 1.04, 0.08, -0.15, 0);
      // Sweeping single-edged curved glaive blade: wide angled heel at base (z=1.44), curving upward to a sharp point (z=2.62).
      const prof = [
        [1.44, -0.02, 0.018],
        [1.50, -0.115, 0.024],
        [1.76, -0.12, 0.03],
        [2.12, -0.075, 0.045],
        [2.42, 0.015, 0.082],
        [2.62, 0.135, 0.135],
      ];
      const blade = new THREE.BoxGeometry(0.016, 1, 1, 1, 2, prof.length - 1);
      deform(blade, v => {
        const u = clamp01(v.z + 0.5) * (prof.length - 1), i = Math.min(prof.length - 2, Math.floor(u)), f = u - i;
        const z = prof[i][0] + (prof[i + 1][0] - prof[i][0]) * f;
        const yBot = prof[i][1] + (prof[i + 1][1] - prof[i][1]) * f;
        const yTop = prof[i][2] + (prof[i + 1][2] - prof[i][2]) * f;
        const ty = v.y + 0.5;   // 0 at cutting edge (bottom), 1 at spine (top)
        v.z = z;
        v.y = yBot + (yTop - yBot) * ty;
        const edgePinch = ty < 0.15 ? 0.18 : ty > 0.85 ? 0.75 : 1.0;
        const tipPinch = u > prof.length - 1.3 ? 0.25 : 1.0;
        v.x *= edgePinch * tipPinch;
      });
      roughen(blade, 0.002, 63);
      // Rough brown rust encrustation along the lower spine and three dark circular perforations in a triangle cluster near the heel
      const rustSpine = roughen(box(0.02, 0.042, 0.54, 0, -0.01, 1.76, -0.05, 0, 0), 0.006, 67);
      const holes = [[1.54, -0.058], [1.61, -0.032], [1.63, -0.078]].map(([z, y]) =>
        box(0.024, 0.024, 0.024, 0, y, z, Math.PI / 4, 0, 0)
      );
      return {
        blade: [uvScale(blade, 0.8, 0.8)],
        rust: [uvScale(rustSpine, 1, 1)],
        hole: holes,
        grip: [shaft],
        guard: [buttCap, buttRingA, buttRingB, socket, sockRing],
        wrap: [...wraps, streamerA, streamerB],
      };
    },
    // A club made of one fused thigh bone: a long shaft, a great knuckled end, vertebra spikes.
    boneClub() {
      const shaft = uvScale(xf(KIT_GEO.Cylinder(0.06, 0.1, 1.1, 6), 0, 0, 0.45, Math.PI / 2, 0, 0), 1, 2);
      const head = roughen(xf(sphere(0.3, 8, 6), 0, 0, 1.2, 0, 0, 0, 1, 1, 1.25), 0.05, 77);
      const knobs = [xf(sphere(0.16, 6, 4), 0.2, 0.12, 1.0), xf(sphere(0.15, 6, 4), -0.2, 0.1, 1.15), xf(sphere(0.13, 6, 4), 0.0, -0.22, 1.05)];
      const spikes = [[0.22, 0.2, 1.3, 0.6], [-0.22, 0.2, 1.35, -0.6], [0, 0.32, 1.1, 0], [0.1, -0.3, 1.3, 3]].map(([x, y, z, a]) => xf(KIT_GEO.Cone(0.05, 0.22, 4), x, y, z, 0, 0, a));
      return { blade: [head, ...knobs, ...spikes], grip: [shaft], guard: [roughen(xf(sphere(0.09, 5, 4), 0, 0, -0.12), 0.02, 79)] };
    },
    // A halberd: a long haft, an axe blade with a hooked beak behind and a spike on top.
    halberd() {
      const haft = xf(tube(0.03, 0.03, 2.5, 5), 0, 0, 0.55, Math.PI / 2, 0, 0);
      const axe = plate([[1.4, 0.0], [1.85, -0.02], [1.95, -0.3], [1.72, -0.56], [1.4, -0.4]], 0.035, 0.008);
      const hook = plate([[1.45, 0.02], [1.6, 0.26], [1.5, 0.3], [1.36, 0.1]], 0.03, 0.006);
      for (const g of [axe, hook]) { g.rotateY(-Math.PI / 2); xf(g, 0.017, 0, 0); roughen(g, 0.006, 83); }
      return { grip: [haft], blade: [axe, hook, xf(KIT_GEO.Cone(0.05, 0.5, 4), 0, 0, 2.05, Math.PI / 2, 0, 0)], guard: [xf(tube(0.05, 0.045, 0.14, 5), 0, 0, 1.4, Math.PI / 2, 0, 0)] };
    },
    // A temple bell swung like a maul: crown on the haft, the mouth leading the blow, a lip of iron, a clapper inside.
    bellMaul() {
      const bell = lathe([[0, 0], [0.14, 0.03], [0.22, 0.15], [0.3, 0.35], [0.4, 0.55], [0.5, 0.7], [0.53, 0.76]], 10);
      roughen(bell, 0.012, 91); xf(bell, 0, 0, 1.2, Math.PI / 2, 0, 0);
      const lip = xf(KIT_GEO.Torus(0.53, 0.035, 3, 10), 0, 0, 1.96, 0, 0, 0);
      const clapper = xf(sphere(0.12, 6, 4), 0, 0, 1.75);
      const haft = xf(tube(0.05, 0.05, 1.5, 6), 0, 0, 0.55, Math.PI / 2, 0, 0);
      return { blade: [bell], guard: [lip, clapper], grip: [haft] };
    },
    // A long gnarled walking cane (Margit): a knotted shaft, an iron ferrule at the striking end, a crook at the hand.
    cane() {
      const shaft = roughen(xf(tube(0.03, 0.022, 1.75, 6), 0, 0, 0.62, Math.PI / 2, 0, 0), 0.006, 31);
      const knots = [0.25, 0.7, 1.1].map((z, i) => xf(sphere(0.04, 5, 4), 0, 0, z, 0, 0, 0, 1, 1, 1.5 + i * 0.2));
      const ferrule = xf(KIT_GEO.Cone(0.03, 0.16, 5), 0, 0, 1.56, Math.PI / 2, 0, 0);
      const crook = deform(tube(0.032, 0.03, 0.3, 5), v => { v.z -= v.y * v.y * 2.4; }); xf(crook, 0, 0.05, -0.32, Math.PI / 2, 0, 0);
      return { grip: [shaft, ...knots], blade: [ferrule], guard: [crook] };
    },
    // Marika's Hammer (v5.7, Radagon): a long haft of stacked, knotted stone, a rough rock head set crosswise at the end,
    // a blunt spike behind it and a golden band where head meets haft.
    marikaHammer() {
      const haft = roughen(xf(tube(0.04, 0.034, 1.5, 6), 0, 0, 0.5, Math.PI / 2, 0, 0), 0.008, 41);
      const knots = [-0.1, 0.22, 0.52, 0.8, 1.05].map((z, i) => roughen(xf(sphere(0.06, 6, 4), 0, 0, z, 0, i, 0, 1, 1, 1.3), 0.012, 50 + i));
      const head = roughen(xf(new THREE.BoxGeometry(0.42, 0.2, 0.22, 3, 2, 2), 0, 0, 1.36), 0.025, 77);
      const face = roughen(xf(sphere(0.13, 6, 4), 0.21, 0, 1.36, 0, 0, 0, 0.6, 1, 1), 0.02, 78);
      const spike = xf(KIT_GEO.Cone(0.07, 0.24, 5), -0.32, 0, 1.36, 0, 0, Math.PI / 2);
      const band = xf(KIT_GEO.Torus(0.06, 0.02, 4, 10), 0, 0, 1.2);
      return { blade: [head, face, spike], grip: [haft, ...knots], guard: [band] };
    },
    // A heavy two-handed sword: broad blade, long grip.
    greatSword() {
      const blade = plate([[0.1, -0.075], [1.35, -0.072], [1.5, -0.03], [1.58, 0], [1.5, 0.03], [1.35, 0.072], [0.1, 0.075]], 0.035, 0.008);
      blade.rotateY(-Math.PI / 2); blade.translate(0.017, 0, 0); roughen(blade, 0.005, 17);
      const grip = uvScale(xf(KIT_GEO.Cylinder(0.026, 0.03, 0.3, 6), 0, 0, -0.06, Math.PI / 2, 0, 0), 1, 1);
      const guard = deform(tube(0.02, 0.02, 0.5, 5), v => { v.z += v.y * v.y * 1.6; }); xf(guard, 0, 0, 0.1);
      return { blade: [blade], grip: [grip], guard: [guard, xf(sphere(0.045, 5, 4), 0, 0, -0.25)] };
    },
    // The Undead Knight's greatsword: a broad straight blade that swells and hooks upward into a cleaver tip, a
    // straight bar guard with square ends, a long two-hand grip and a square pommel.
    knightGreatsword() {
      const blade = plate([[0.12, -0.075], [1.05, -0.08], [1.38, -0.055], [1.6, 0.03], [1.68, 0.17], [1.56, 0.12], [1.36, 0.095], [1.05, 0.08], [0.12, 0.072]], 0.034, 0.008);
      blade.rotateY(-Math.PI / 2); blade.translate(0.017, 0, 0); roughen(blade, 0.004, 18);
      const ricasso = xf(new THREE.BoxGeometry(0.05, 0.12, 0.08), 0, 0, 0.14);
      const bar = xf(new THREE.BoxGeometry(0.05, 0.4, 0.05), 0, 0, 0.08), ends = [-1, 1].map(s => xf(new THREE.BoxGeometry(0.07, 0.05, 0.08), 0, s * 0.2, 0.08));
      const grip = uvScale(xf(KIT_GEO.Cylinder(0.026, 0.028, 0.42, 6), 0, 0, -0.14, Math.PI / 2, 0, 0), 1, 1);
      const pommel = xf(new THREE.BoxGeometry(0.075, 0.075, 0.06), 0, 0, -0.38), cap = xf(sphere(0.03, 5, 4), 0, 0, -0.42);
      return { blade: [uvScale(blade, 0.6, 0.6)], grip: [grip], guard: [ricasso, bar, ...ends, pommel, cap] };
    },
    // The Shield Warden's greatsword: a long slender straight blade, a wide swept crossguard with parrying rings, a
    // long red-brown leather-wrapped two-handed grip, and a faceted bulbous iron pommel.
    wardenGreatsword() {
      const blade = plate([[0.12, -0.042], [1.45, -0.035], [1.68, -0.015], [1.78, 0], [1.68, 0.015], [1.45, 0.035], [0.12, 0.042]], 0.022, 0.006);
      blade.rotateY(-Math.PI / 2); blade.translate(0.011, 0, 0); roughen(blade, 0.003, 21);
      const ricasso = xf(new THREE.BoxGeometry(0.038, 0.095, 0.14), 0, 0, 0.16);
      const guard = deform(tube(0.018, 0.016, 0.48, 5), v => { v.z += v.y * v.y * 1.4; }); xf(guard, 0, 0, 0.09);
      const FlukeL = xf(KIT_GEO.Cone(0.02, 0.08, 4), 0, 0.16, 0.18, 0.6, 0, -0.4);
      const FlukeR = xf(KIT_GEO.Cone(0.02, 0.08, 4), 0, -0.16, 0.18, -0.6, 0, 0.4);
      const grip = uvScale(xf(KIT_GEO.Cylinder(0.024, 0.027, 0.46, 6), 0, 0, -0.15, Math.PI / 2, 0, 0), 1, 2);
      const ring = xf(KIT_GEO.Torus(0.03, 0.008, 3, 6), 0, 0, -0.14);
      const pommel = xf(lathe([[0, -0.09], [0.048, -0.055], [0.052, -0.02], [0.028, 0.01]], 6), 0, 0, -0.38, Math.PI / 2, 0, 0);
      return { blade: [uvScale(blade, 0.6, 0.6)], grip: [grip], guard: [ricasso, guard, FlukeL, FlukeR, ring, pommel] };
    },
    // A long ash-wood spear, gripped a third of the way up, with a leaf head.
    spear() {
      const shaft = xf(tube(0.022, 0.022, 2.35, 5), 0, 0, 0.45, Math.PI / 2, 0, 0);
      const head = plate([[1.62, -0.02], [1.75, -0.075], [1.97, 0], [1.75, 0.075], [1.62, 0.02]], 0.018, 0.005); head.rotateY(-Math.PI / 2); xf(head, 0.009, 0, 0);
      return { grip: [shaft], blade: [head], guard: [xf(tube(0.034, 0.03, 0.1, 5), 0, 0, 1.62, Math.PI / 2, 0, 0)] };
    },
    // A greataxe: long haft, a broad bearded crescent of iron and a spike on top.
    // Godrick's great axe: a long gilded haft, two broad crescent bits back to back round an ornate square block, a
    // spike on top and a heavy square pommel.
    twinAxe() {
      const haft = xf(tube(0.034, 0.03, 1.62, 6), 0, 0, 0.56, Math.PI / 2, 0, 0);
      const pts = [[0.86, 0.05], [0.95, 0.1], [0.8, 0.28], [0.73, 0.42], [0.88, 0.5], [1.05, 0.54], [1.22, 0.5], [1.37, 0.42], [1.3, 0.28], [1.15, 0.1], [1.24, 0.05]];   // a convex crescent edge
      const bits = [1, -1].map(s => { const g = plate(pts.map(([z, y]) => [z, y * s]), 0.035, 0.01); g.rotateY(-Math.PI / 2); xf(g, 0.018, 0, 0); return roughen(g, 0.008, 27 + s); });
      const block = xf(new THREE.BoxGeometry(0.13, 0.15, 0.2), 0, 0, 1.05), boss = xf(KIT_GEO.Cylinder(0.05, 0.05, 0.16, 8), 0, 0, 1.05, 0, 0, Math.PI / 2);
      const spike = xf(KIT_GEO.Cone(0.04, 0.24, 4), 0, 0, 1.48, Math.PI / 2, 0, 0);
      const pommel = xf(new THREE.BoxGeometry(0.09, 0.09, 0.12), 0, 0, -0.3), collars = [0.8, 1.3, -0.18].map(z => xf(tube(0.048, 0.048, 0.05, 6), 0, 0, z, Math.PI / 2, 0, 0));
      return { blade: [...bits.map(g => uvScale(g, 0.5, 0.5)), spike], grip: [haft], guard: [block, boss, pommel, ...collars] };
    },
    greatAxe() {
      const haft = xf(tube(0.036, 0.036, 1.75, 5), 0, 0, 0.62, Math.PI / 2, 0, 0);
      const head = plate([[1.05, 0.16], [1.4, 0.18], [1.52, -0.05], [1.56, -0.45], [1.3, -0.52], [1.08, -0.28]], 0.05, 0.01);
      head.rotateY(-Math.PI / 2); xf(head, 0.025, 0, 0); roughen(head, 0.008, 19);
      return { grip: [haft], blade: [head, xf(KIT_GEO.Cone(0.04, 0.2, 4), 0, 0, 1.58, Math.PI / 2, 0, 0)], guard: [xf(tube(0.05, 0.045, 0.12, 5), 0, 0, 1.06, Math.PI / 2, 0, 0)] };
    },
    // The Executioner's greataxe (v5.5, after the reference art): a long gnarled haft wrapped in red-stained bindings
    // with a swollen bone pommel, a massive flared cleaver head with a concave top arch and deep bearded toe, a rear
    // fluke spike, and blood-red cloth ribbons hanging from the socket.
    executionerAxe() {
      const haft = roughen(xf(tube(0.034, 0.028, 1.88, 6), 0, 0, 0.62, Math.PI / 2, 0, 0), 0.005, 91);
      const pommel = roughen(xf(sphere(0.058, 6, 4), 0, -0.01, -0.32, 0, 0, 0, 0.9, 1.1, 1.45), 0.008, 93);
      const wraps = [-0.18, 0.08, 0.35, 0.65, 0.92].map((z, i) => xf(tube(0.038, 0.036, 0.09, 6), 0, 0, z, Math.PI / 2 + (i % 2) * 0.08, 0, 0));
      const head = plate([
        [0.98, -0.04], [1.28, -0.04], [1.48, -0.14], [1.66, -0.34], [1.74, -0.58],
        [1.56, -0.66], [1.28, -0.65], [1.02, -0.58], [0.88, -0.44], [0.94, -0.22],
      ], 0.038, 0.009);
      head.rotateY(-Math.PI / 2); xf(head, 0.019, 0, 0); roughen(head, 0.007, 95);
      const fluke = xf(KIT_GEO.Cone(0.028, 0.28, 4), 0, 0.14, 1.24, -0.45, 0, 0);
      const socket = xf(tube(0.052, 0.046, 0.28, 6), 0, 0, 1.12, Math.PI / 2, 0, 0);
      const tasselA = deform(new THREE.PlaneGeometry(0.065, 0.34, 1, 3), v => { v.z += (0.17 - v.y) * 0.18; v.x *= 1 - (0.17 - v.y) * 1.4; });
      const tasselB = deform(new THREE.PlaneGeometry(0.055, 0.28, 1, 3), v => { v.z -= (0.14 - v.y) * 0.15; v.x *= 1 - (0.14 - v.y) * 1.5; });
      xf(tasselA, 0.02, 0.06, 0.96, 0.35, 0.2, 0); xf(tasselB, -0.02, 0.05, 1.04, -0.25, -0.2, 0);
      return {
        blade: [uvScale(head, 0.55, 0.55), fluke],
        grip: [haft, pommel],
        guard: [socket],
        wrap: [...wraps, tasselA, tasselB],
      };
    },
    // A short bow held upright when aimed: limbs along z, the belly away from the archer (-y), the string at +y.
    bow() {
      const pts = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1].map(s => new V3(0, 0.17 - 0.22 * (1 - s * s), s * 0.52));
      const limb = KIT_GEO.Tube(new THREE.CatmullRomCurve3(pts), 10, 0.016, 4, false);
      const string = xf(tube(0.004, 0.004, 1.04, 3), 0, 0.17, 0, Math.PI / 2, 0, 0);
      return { limb: [uvScale(limb, 6, 2), xf(tube(0.03, 0.03, 0.14, 5), 0, -0.05, 0, Math.PI / 2, 0, 0)], string: [string] };
    },
    // A thin dueling blade with a cup guard.
    rapier() {
      const blade = plate([[0.12, -0.02], [1.35, -0.013], [1.45, 0], [1.35, 0.013], [0.12, 0.02]], 0.012, 0.004);
      blade.rotateY(-Math.PI / 2); blade.translate(0.006, 0, 0);
      const cup = xf(KIT_GEO.Sphere(0.075, 7, 3, 0, TAU, 0, Math.PI / 2), 0, 0, 0.1, Math.PI / 2, 0, 0);
      const quill = xf(tube(0.011, 0.011, 0.3, 4), 0, 0, 0.1, 0, 0, Math.PI / 2);
      return { blade: [blade], grip: [uvScale(xf(KIT_GEO.Cylinder(0.02, 0.022, 0.2, 5), 0, 0, -0.03, Math.PI / 2, 0, 0), 1, 1)], guard: [cup, quill, xf(sphere(0.03, 5, 4), 0, 0, -0.14)] };
    },
    // A curved, hooked knife: short, quick, cruel.
    curvedKnife() {
      const blade = plate([[0.1, -0.04], [0.6, -0.05], [0.88, -0.03], [1.0, 0.03], [0.74, 0.0], [0.1, 0.04]], 0.016, 0.005);
      blade.rotateY(-Math.PI / 2); blade.translate(0.008, 0, 0);
      deform(blade, v => { v.x += Math.max(0, v.z - 0.1) ** 2 * 0.22; });
      const grip = uvScale(xf(KIT_GEO.Cylinder(0.022, 0.024, 0.2, 5), 0, 0, -0.01, Math.PI / 2, 0, 0), 1, 1);
      return { blade: [blade], grip: [grip], guard: [xf(tube(0.014, 0.014, 0.16, 4), 0, 0, 0.09, 0, 0, Math.PI / 2)] };
    },
    // A broad iron scimitar (the Rogue) widening toward a curved tip.
    scimitar() {
      const bend = v => { v.x += Math.max(0, v.z - 0.1) ** 2 * 0.3; };
      const blade = plate([[0.1, -0.034], [0.5, -0.048], [0.78, -0.074], [0.95, -0.045], [1.02, 0.02], [0.86, 0.036], [0.5, 0.04], [0.1, 0.034]], 0.014, 0.005);
      blade.rotateY(-Math.PI / 2); blade.translate(0.007, 0, 0); deform(blade, bend); roughen(blade, 0.003, 17);
      const grip = uvScale(xf(KIT_GEO.Cylinder(0.021, 0.024, 0.2, 5), 0, 0, -0.01, Math.PI / 2, 0, 0), 1, 1);
      return { blade: [blade], grip: [grip], guard: [xf(tube(0.015, 0.015, 0.14, 4), 0, 0, 0.09, 0, 0, Math.PI / 2), xf(sphere(0.026, 5, 4), 0, 0, -0.12)] };
    },
    // A worn arming sword: straight, leather-wrapped grip, plain crossguard.
    wandererSword() {
      const blade = plate([[0.1, -0.045], [1.0, -0.044], [1.1, -0.022], [1.17, 0.0], [1.1, 0.022], [1.0, 0.044], [0.1, 0.045]], 0.02, 0.006);
      blade.rotateY(-Math.PI / 2); blade.translate(0.01, 0, 0); roughen(blade, 0.003, 9);
      const grip = uvScale(xf(KIT_GEO.Cylinder(0.022, 0.025, 0.22, 6), 0, 0, -0.02, Math.PI / 2, 0, 0), 1, 1);
      const guard = xf(tube(0.017, 0.017, 0.3, 5), 0, 0, 0.09, 0, 0, 0.04);
      return { blade: [blade], grip: [grip], guard: [guard, xf(sphere(0.034, 5, 4), 0, 0, -0.14)] };
    },
    // A notched, bent, rust-eaten sword: long enough to read its swing at a glance.
    ruinedSword() {
      const blade = plate([[0.1, -0.05], [0.55, -0.052], [0.59, -0.04], [0.62, -0.053], [1.0, -0.048], [1.12, -0.012], [1.16, 0.03], [1.02, 0.05],
        [0.68, 0.052], [0.64, 0.04], [0.6, 0.054], [0.1, 0.05]], 0.022, 0.006);
      blade.rotateY(-Math.PI / 2); blade.translate(0.011, 0, 0);
      deform(blade, v => { v.x += Math.max(0, v.z - 0.1) ** 2 * 0.035; }); roughen(blade, 0.004, 4);
      const grip = uvScale(xf(KIT_GEO.Cylinder(0.022, 0.026, 0.22, 6), 0, 0, -0.02, Math.PI / 2, 0, 0), 1, 1);
      const guard = deform(tube(0.017, 0.017, 0.3, 5), v => { v.z += v.y * v.y * 2.4; });
      xf(guard, 0, 0, 0.09);
      return { blade: [blade], grip: [grip], guard: [guard, xf(sphere(0.035, 5, 4), 0, 0, -0.14)] };
    },
  };

  // ---- definitions: `extends` lets a model start from another one -----------------------------------------------------
  // Anything the child lists replaces the parent's entry; `proportions` and `anim` are merged key by key instead.
  const resolved = new Map();
  function resolve(id) {
    if (resolved.has(id)) return resolved.get(id);
    const raw = MODEL_DEFS[id];
    if (!raw) throw new Error(`Unknown model "${id}". Known: ${Object.keys(MODEL_DEFS).join(', ')}.`);
    let M = raw;
    if (raw.extends) {
      const B = resolve(raw.extends);
      M = { ...B, ...raw, proportions: { ...B.proportions, ...raw.proportions }, anim: { ...B.anim, ...raw.anim } };
      if (raw.eyes) M.eyes = { ...B.eyes, ...raw.eyes };
    }
    resolved.set(id, M);
    return M;
  }

  // A variant (MODEL_VARIANTS in js/data/models.js) reworks a resolved model: darker, more worn materials, extra armour
  // parts on the first metal slot it has, brighter eyes, an aura. Opt-in per placement: { enemy, variant: 'elite' }.
  const variantCache = new Map();
  function resolveVariant(id, variant) {
    const base = resolve(id);
    if (!variant) return base;
    const key = id + '|' + variant;
    if (variantCache.has(key)) return variantCache.get(key);
    const V = MODEL_VARIANTS[variant];
    if (!V) throw new Error(`Unknown model variant "${variant}". Known: ${Object.keys(MODEL_VARIANTS).join(', ')}.`);
    const materials = {};
    for (const [slot, spec] of Object.entries(base.materials)) {
      if ('glow' in spec) { materials[slot] = { ...spec, glow: new THREE.Color(spec.glow).multiplyScalar(V.eyeBoost).getHex() }; continue; }
      const c = new THREE.Color(spec.tint ?? 0xffffff).multiplyScalar(V.darken);
      materials[slot] = { ...spec, tint: c.getHex(), decay: Math.min(1, (spec.decay ?? 0.5) + V.decayAdd) };
    }
    const metal = V.metalSlots.find(s => s in base.materials);
    const parts = metal ? [...base.parts, ...V.parts.map(p => ({ ...p, slot: metal }))] : base.parts;
    const M = { ...base, materials, parts, fit: (base.fit ?? 1) * V.scale, aura: { ...V.aura, color: V.aura.color ?? base.eyes?.color ?? 0xffffff }, variant };
    variantCache.set(key, M);
    return M;
  }

  // ---- the builder ------------------------------------------------------------------------------------------------
  // Parts of one model, grouped for merging: one entry per (bone, slot). Built once per model id.
  // The skeleton of a model: [{ name, parent, at }], parents first. Fixed shape (see the header); extras come from M.bones.
  function boneSpec(M) {
    const sx = M.proportions.shoulderX ?? 0.31, la = limbTweak(M, 'armL').len, ra = limbTweak(M, 'armR').len;
    const spec = [
      { name: 'tip', parent: null, at: [0, 0, 0] }, { name: 'spin', parent: 'tip', at: [0, HIP, 0] }, { name: 'chest', parent: 'spin', at: [0, 0.05, 0] },
      { name: 'neck', parent: 'chest', at: [0, 0.62, 0] }, { name: 'head', parent: 'neck', at: [0, 0.07, 0] },
      { name: 'legL', parent: 'spin', at: [0.15, -0.05, 0] }, { name: 'legR', parent: 'spin', at: [-0.15, -0.05, 0] },
      { name: 'kneeL', parent: 'legL', at: [0, -LEG_SEG, 0] }, { name: 'kneeR', parent: 'legR', at: [0, -LEG_SEG, 0] },
      { name: 'armL', parent: 'chest', at: [sx, 0.55, 0] }, { name: 'armR', parent: 'chest', at: [-sx, 0.55, 0] },
      { name: 'elbowL', parent: 'armL', at: [0, -0.3 * la, 0] }, { name: 'elbowR', parent: 'armR', at: [0, -0.3 * ra, 0] },
      { name: 'weapon', parent: 'elbowR', at: [0, -0.3 * ra, 0] },
    ];
    for (const [name, b] of Object.entries(M.bones || {})) spec.push({ name, parent: b.parent, at: b.at });
    return spec;
  }

  // Everything one model is made of, built once per id (and variant) and shared by every body of that type: the
  // parts are moved into the skeleton's rest pose and merged into ONE geometry per material, each vertex bound to
  // the bone its part hangs from. So a body costs a handful of draw calls, however many pieces it has.
  let anatomy = false;
  let geoK = 1;   // the segment multiplier of the model being built (detail.geo, by its budget class)
  function modelParts(id, variant) {
    const g = typeof detail.geo === 'object' ? detail.geo[resolve(id).budget] ?? 1 : detail.geo;
    const sculpted = detail.anatomy ?? (g > 1);
    const ckey = (variant ? id + '|' + variant : id) + '@' + g + (sculpted ? '|anatomy' : '|base');
    let m = modelCache.get(ckey);
    if (m) return m;
    KIT_GEO.set(g); geoK = g; anatomy = sculpted;
    try { m = buildParts(id, variant, ckey); } finally { KIT_GEO.set(1); geoK = 1; anatomy = false; }
    return m;
  }
  function buildParts(id, variant, ckey) {
    let m;
    const M = resolveVariant(id, variant), groups = new Map();
    limbSides = M.limbSides ?? MS.limbSides;
    const spec = boneSpec(M), index = {}, bind = {};
    spec.forEach((b, i) => { index[b.name] = i; const t = new THREE.Matrix4().makeTranslation(...b.at); bind[b.name] = b.parent ? bind[b.parent].clone().multiply(t) : t; });
    const weaponBox = new THREE.Box3();
    // The weapon's pieces merge apart from the body's, even where they share a material slot, so the weapon gets its
    // own material: its wind-up glow and hit flash light the weapon only, never the armour.
    const push = (bone, slot, geo, weapon = false) => {
      if (bone === 'weapon') { geo.computeBoundingBox(); weaponBox.union(geo.boundingBox); }
      geo.applyMatrix4(bind[bone]);
      const n = geo.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = index[bone]; sw[i * 4] = 1; }
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      const key = weapon ? 'weapon:' + slot : slot;
      (groups.get(key) || groups.set(key, { slot, weapon, list: [] }).get(key)).list.push(geo);
    };
    for (const p of bodyParts(M)) push(p.bone, p.slot, p.geo);
    for (const o of M.parts) for (const g of KIT_PARTS[o.use](o, M)) { if (g.geo) push(o.bone, g.slot, g.geo); else push(o.bone, o.slot, g); }
    if (M.weapon) {
      const W = KIT_WEAPONS[M.weapon.use]();
      for (const key of Object.keys(W)) for (const g of W[key]) push('weapon', M.weapon.slots[key], g, true);
    }
    const parts = []; let tris = 0;
    for (const { slot, weapon, list } of groups.values()) {
      const geo = mergeGeos(list); geo.userData.shared = true;
      geo.boundingSphere = new THREE.Sphere(new V3(0, 1, 0), 3.4);   // generous: a swung weapon must not be culled with its body
      parts.push({ slot, weapon, geo }); tris += geo.index.count / 3;
    }
    const budget = MS.triBudget[M.budget] * (variant ? 1.25 : 1) * geoK * geoK;   // a stronger variant may carry a quarter more; Ultra's detail its square
    if (tris > budget && geoK === 1) console.warn(`Model "${id}" has ${Math.round(tris)} triangles; the ${M.budget} budget is ${budget}.`);
    m = { parts, tris: Math.round(tris), meshes: parts.length, spec, weaponBox: weaponBox.isEmpty() ? null : weaponBox };
    modelCache.set(ckey, m);
    return m;
  }

  function checkModel(id, M) {   // fail fast: broken references are named at load
    const bad = msg => { throw new Error(`Model "${id}": ${msg}`); };
    for (const slot of Object.values(M.body)) if (slot && !(slot in M.materials)) bad(`body uses material slot "${slot}" that is not defined.`);
    for (const o of M.parts) {
      if (!(o.use in KIT_PARTS)) bad(`unknown part "${o.use}".`);
      if (!(o.slot in M.materials)) bad(`part "${o.use}" uses unknown material slot "${o.slot}".`);
      if (o.bone && !['spin', 'chest', 'neck', 'head', 'armL', 'armR', 'elbowL', 'elbowR', 'legL', 'legR', 'kneeL', 'kneeR', 'weapon'].includes(o.bone) && !(M.bones && o.bone in M.bones)) bad(`part "${o.use}" is on unknown bone "${o.bone}".`);
    }
    if (M.weapon) {
      if (!(M.weapon.use in KIT_WEAPONS)) bad(`unknown weapon "${M.weapon.use}".`);
      for (const slot of Object.values(M.weapon.slots)) if (!(slot in M.materials)) bad(`weapon uses unknown material slot "${slot}".`);
    }
    for (const [k, v] of Object.entries(M.materials)) if (!('glow' in v) && !(v.tex in TEXLIB.defs)) bad(`material "${k}" uses unknown texture "${v.tex}".`);
  }

  function buildModelRig(rig, id, variant) {
    const M = resolveVariant(id, variant);
    checkModel(id, M);
    const built = modelParts(id, variant), rim = M.rim ?? 1, P = M.proportions;
    rig.dissolve = { value: 0 };   // death: the body breaks up into ash (see addDissolve)
    // Materials: cloned per rig (own flash and fade), sharing the cached textures.
    const mats = {}, weaponMats = {};
    rig.bodyMats = []; rig.mats = []; rig.glows = []; rig.fadeMats = [];
    const makeMat = spec => {
      let m;
      if ('glow' in spec) m = new THREE.MeshBasicMaterial({ color: new THREE.Color(spec.glow).multiplyScalar(1.6), transparent: true });
      else {
        m = TEXLIB.material(spec.tex, { tint: spec.tint, decay: spec.decay, size: texSize(spec) }).clone();
        m.side = spec.double ? THREE.DoubleSide : THREE.FrontSide; addDissolve(m, rim, rig.dissolve);
      }
      rigidSkinning(m); rig.mats.push(m);
      if ('glow' in spec) rig.fadeMats.push(m);   // eyes are plain materials: they fade instead of dissolving
      return m;
    };
    const usedSlots = new Set(built.parts.map(p => p.slot));
    if (M.eyes) usedSlots.add('eye');
    for (const [slot, spec] of Object.entries(M.materials)) {
      if (!usedSlots.has(slot)) continue;   // unused inherited slots need no textures or material clones
      mats[slot] = makeMat(spec);
      if (!('glow' in spec)) rig.bodyMats.push(mats[slot]);   // hit tint: the body, never the weapon
    }
    // The weapon's own copies of its slots' materials (see modelParts).
    if (M.weapon) for (const slot of new Set(Object.values(M.weapon.slots))) weaponMats[slot] = makeMat(M.materials[slot]);
    rig.weaponMat = M.weapon ? weaponMats[M.weapon.slots.blade ?? Object.values(M.weapon.slots)[0]] : new THREE.MeshStandardMaterial();
    if (!M.weapon) rig.mats.push(rig.weaponMat);
    rig.weaponBase = new THREE.Color(0xffffff);
    // Bones (THREE.Bone, one skeleton per body) and the shared skinned geometry: one mesh per material.
    rig.root = new THREE.Group();
    rig.bones = {}; const list = [];
    for (const b of built.spec) {
      const bone = new THREE.Bone(); bone.position.set(...b.at);
      (b.parent ? rig.bones[b.parent] : rig.root).add(bone); rig.bones[b.name] = bone; list.push(bone);
    }
    for (const n of ['tip', 'spin', 'chest', 'neck', 'head', 'legL', 'legR', 'kneeL', 'kneeR', 'armL', 'armR', 'elbowL', 'elbowR', 'weapon']) rig[n] = rig.bones[n];
    rig.root.updateMatrixWorld(true);
    rig.skeleton = new THREE.Skeleton(list);
    for (const p of built.parts) {
      const mesh = new THREE.SkinnedMesh(p.geo, (p.weapon ? weaponMats : mats)[p.slot]);
      rig.root.add(mesh); mesh.bind(rig.skeleton, new THREE.Matrix4());
      mesh.boundingSphere = p.geo.boundingSphere;
      if (!p.weapon) (rig.slotMeshes || (rig.slotMeshes = {}))[p.slot] = mesh;
      else (rig.weaponMeshes || (rig.weaponMeshes = [])).push(mesh);   // hidden by a phase's `conceal: ['weapon']` (js/flame.js)
      if (!p.weapon && M.hidden && M.hidden.includes(p.slot)) mesh.visible = false;   // shown later by the boss (js/flame.js, a phase's `reveal`)
    }
    // Eyes: tiny emissive points plus a faint halo that reads through fog.
    if (M.eyes) {
      const E = M.eyes, em = mats.eye, eg = sphere(E.size, 5, 3); eg.userData.shared = true;
      for (const s of [-1, 1]) { const e = new THREE.Mesh(eg, em); e.position.set(s * E.spread, E.at[1], E.at[2]); rig.head.add(e); }
      const halo = glowSprite(E.color, 1.2, 0.22, 0.45, 0.6); halo.position.set(0, E.at[1], E.at[2] + 0.02); rig.head.add(halo);
      rig.glows.push({ mat: halo.material, base: 0.45 });
    }
    if (M.embers) rig.embers = addWeaponEmbers(rig.weapon, M.embers);   // glow at the weapon head / along its edge
    rig.fit = M.fit ?? 1;
    rig.rest = Object.entries(M.posture || {}).map(([b, r]) => [rig.bones[b], r]);
    rig.warnGlow = makeWarnGlow(); rig.weapon.add(rig.warnGlow);
    // A glint of light that flashes along the weapon as a strike begins (driven by the animator): at the far end of the
    // weapon's own geometry, so every weapon gets one without data.
    const box = built.weaponBox;
    if (box) {
      const len = box.max.z - box.min.z, sprite = glowSprite(0xfff2d0, 2.0, 0.5 + 0.18 * len, 0, null);
      sprite.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.min.z + len * 0.78); sprite.visible = false;
      rig.weapon.add(sprite); rig.glint = { sprite, size: 0.5 + 0.18 * len };
    }
    if (M.aura) {   // a faint aura marks a stronger variant
      const a = glowSprite(M.aura.color, 1.0, M.aura.size, M.aura.opacity, 0.7); a.position.set(0, 0.25, 0); rig.chest.add(a);
      rig.aura = { sprite: a, base: M.aura.opacity };
    }
    if (M.anim) rig.anim = new ModelAnimator(rig, M.anim);
    rig.modelInfo = { id, variant: variant ?? null, tris: built.tris, meshes: built.meshes };
  }

  // Prepare the player while menus are up. The selected level's complete cast is built before gameplay;
  // unselected models never compete with starting it. No geometry or texture streaming during play.
  let prewarmGeneration = 0;
  function prewarm() {
    const generation = ++prewarmGeneration;   // a new quality replaces pending work for the old detail
    const jobs = [];
    const ids = [PLAYER_DEF.look.model];
    for (const id of ids) {
      jobs.push(() => {
        const M = resolve(id), built = modelParts(id), slots = new Set(built.parts.map(p => p.slot));
        for (const slot of slots) {
          const spec = M.materials[slot];
          if (!spec.tex) continue;
          const opts = { tint: spec.tint, decay: spec.decay, size: texSize(spec) };
          if (!TEXLIB.prefetch(spec.tex, opts)) TEXLIB.get(spec.tex, opts);
        }
      });
    }
    const step = () => {
      if (generation !== prewarmGeneration || !jobs.length) return;
      if (typeof Game !== 'undefined' && Game.mode === 'play') { setTimeout(step, 1500); return; }
      try { jobs.shift()(); } catch (e) { console.warn('prewarm:', e); }
      if (typeof requestIdleCallback === 'function') requestIdleCallback(step, { timeout: 400 }); else setTimeout(step, 40);   // only between frames
    };
    setTimeout(step, 800);
  }

  // Detail of models built from now on: geo/tex multipliers and explicit anatomy. Omitted anatomy retains the old API.
  const setDetail = d => { const was = JSON.stringify(detail); detail = { geo: d.geo ?? 1, tex: d.tex ?? 1, anatomy: d.anatomy }; if (JSON.stringify(detail) !== was) prewarm(); };   // the new detail baked in the background
  // The geometry helpers, for parts defined outside the kit (js/kit-premium.js).
  const helpers = { xf, uvScale, hash3, roughen, deform, lathe, limb, shape, plate, sphere, tube, texMeters: MS.texMeters };
  return { buildModelRig, modelParts, resolve, resolveVariant, prewarm, setDetail, detail: () => detail, parts: KIT_PARTS, weapons: KIT_WEAPONS, cache: modelCache, helpers };
})();
const buildModelRig = KIT.buildModelRig;
