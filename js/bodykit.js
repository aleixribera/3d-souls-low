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
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n float dThr = uDissolve * 1.2 - 0.1; float dn = dissolveNoise(vDPos * 14.0); if (uDissolve > 0.001 && dn < dThr) discard;')
      .replace('#include <opaque_fragment>', 'if (uDissolve > 0.001) outgoingLight += vec3(1.6, 0.55, 0.12) * smoothstep(dThr + 0.1, dThr, dn) * 2.2;\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'rimDissolve';
  return mat;
}
const KIT = (() => {
  const TAU = Math.PI * 2, V3 = THREE.Vector3, V2 = THREE.Vector2, MS = MODEL_SETTINGS;
  const modelCache = new Map();
  let limbSides = MS.limbSides;   // radial segments of limbs for the model being built

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
  const lathe = (profile, seg, ovalZ = 1) => xf(new THREE.LatheGeometry(profile.map(([r, y]) => new V2(r, y)), seg), 0, 0, 0, 0, 0, 0, 1, 1, ovalZ);
  // A limb hanging down from its joint: profile [[t 0..1 along the length, radius]].
  const limb = (len, prof, thick = 1, ovalZ = 0.92) =>
    uvScale(lathe(prof.slice().reverse().map(([t, r]) => [r * thick, -t * len]), limbSides, ovalZ), 1.4, len / MS.texMeters);
  const shape = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; };
  const plate = (pts, depth, bevel) => {
    const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 3 });
    return uvScale(g, 1 / MS.texMeters);
  };
  // Merges geometries into one (non-indexed). Carries position, normal, uv and, when present, skinIndex / skinWeight.
  const mergeGeos = list => {
    const gs = list.map(g => g.index ? g.toNonIndexed() : g);
    let n = 0; for (const g of gs) n += g.attributes.position.count;
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) {
      const ref = gs.find(g => g.attributes[name]);
      if (!ref) continue;
      const size = ref.attributes[name].itemSize, arr = new ref.attributes[name].array.constructor(n * size); let o = 0;
      for (const g of gs) { if (g.attributes[name]) arr.set(g.attributes[name].array, o * size); o += g.attributes.position.count; }
      out.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    for (const g of list) g.dispose();
    return out;
  };
  const sphere = (r, w, h) => uvScale(new THREE.SphereGeometry(r, w, h), 2, 1);
  const tube = (r0, r1, len, seg = 6, open = false) => uvScale(new THREE.CylinderGeometry(r0, r1, len, seg, 1, open), 1.2, len / MS.texMeters);

  // ---- core body pieces (built from the definition's proportions) ----------------------------------------
  const sideOf = bone => bone.endsWith('L') ? 'L' : 'R';
  const limbTweak = (M, bone) => ({ len: 1, thick: 1, ...(M.limbs && M.limbs[bone]) });
  function bodyParts(M) {
    const P = M.proportions, B = M.body, out = [];
    const add = (bone, slot, geo) => out.push({ bone, slot, geo });
    const tw = P.torsoW / 0.2, oz = P.torsoD / P.torsoW;
    if (B.pelvis) add('spin', B.pelvis, uvScale(lathe([[0.1, -0.1], [0.17, -0.06], [0.18, 0.02], [0.16, 0.08]].map(([r, y]) => [r * tw, y]), 8, oz * 1.1), 1.5, 1));
    if (B.torso) add('chest', B.torso, uvScale(lathe([[0.15, -0.06], [0.17, 0.05], [0.21, 0.22], [0.26, 0.4], [0.29, 0.5], [0.2, 0.575], [0.07, 0.625]].map(([r, y]) => [r * tw, y]), 8, oz), 1.8, 1.2));
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
        const s = 1 - Math.abs(i - 1.2) * 0.12, c = new THREE.ConeGeometry(0.03 * s, 0.075 * s, 5);
        return xf(c, hash3(i, 1, 1, 9) * 0.03, y, -0.125 - i * 0.004, -Math.PI / 2 + 0.25, 0, 0);
      });
    },
    // A rag hood pulled low: open at the face, a tail hanging behind.
    hood(o) {
      const g = new THREE.SphereGeometry(0.158 * (o.size ?? 1), 10, 6, Math.PI / 2 + 0.75 - (o.close ?? 0), TAU - 1.5 + 2 * (o.close ?? 0), 0, 2.25), tail = o.tail ?? 1;
      deform(g, v => { if (v.z < 0 && v.y < 0.08) { v.z -= (0.08 - v.y) * 0.9 * tail; v.y -= (-v.z) * 0.15 * tail; } if (v.y > 0.1) v.z += (v.y - 0.1) * 0.35; });
      xf(g, 0, 0.115, 0.0, 0.2, 0, 0, 1.0, 1.05, 1.05); roughen(g, 0.012, 21);
      return [uvScale(g, 2, 1)];
    },
    // A dented shoulder dome, strapped on one side only.
    pauldron(o) {
      const g = new THREE.SphereGeometry(0.115 * (o.size ?? 1), 8, 4, 0, TAU, 0, Math.PI / 2);
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
    belt() { return [uvScale(xf(new THREE.TorusGeometry(0.185, 0.022, 3, 10), 0, 0.045, 0, Math.PI / 2, 0, 0.08, 1, 1, 0.72), 6, 1)]; },
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
    scarf() { return [uvScale(xf(new THREE.TorusGeometry(0.085, 0.03, 4, 9), 0, 0.02, 0.0, Math.PI / 2, 0, 0.1, 1, 1, 0.9), 4, 1)]; },
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
      const rim = xf(new THREE.TorusGeometry(0.208 * k, 0.013, 3, 14), 0, 0.0, 0, Math.PI / 2, 0, 0);
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
      const out = [uvScale(g, 3, 1), uvScale(xf(new THREE.TorusGeometry(0.152 * s, 0.012, 3, 7, Math.PI), 0, 0.105 * s, 0.0, Math.PI / 2, 0, 0), 4, 1)];
      if (o.crest) {
        const fin = plate([[-0.14, 0], [0.14, 0], [0.1, o.crest * 0.55], [-0.02, o.crest], [-0.12, o.crest * 0.6]], 0.02, 0.006);
        fin.rotateY(-Math.PI / 2); xf(fin, 0.01, 0.235 * s, 0.0); out.push(fin);
      }
      if (o.nose) out.push(xf(plate([[-0.02, 0], [0.02, 0], [0.025, -0.11], [-0.025, -0.11]], 0.012, 0.004), 0, 0.12 * s, 0.15 * s));
      return out;
    },
    // A cloth peak on top of a hood (executioner, lancer): leans back.
    hoodPeak(o) { return [uvScale(xf(new THREE.ConeGeometry(0.14 * (o.size ?? 1), 0.34 * (o.height ?? 1), 7, 1, true), 0, 0.3, -0.04, -0.35, 0, 0), 2, 1)]; },
    // A quiver on the back with arrows poking out.
    quiver(o) {
      const out = [{ slot: 'leather', geo: uvScale(xf(tube(0.055, 0.045, 0.5, 6), -0.1, 0.28, -0.22, 0.2, 0, 0.35), 1, 1) }];
      for (let i = 0; i < 3; i++) out.push({ slot: 'wood', geo: xf(new THREE.ConeGeometry(0.016, 0.07, 4), -0.1 + i * 0.03 - 0.03 + 0.1 * 0.35 * 0, 0.58 + i * 0.02, -0.28 - 0.0, 0.2, 0, 0.35 + i * 0.12) });
      return out;
    },
    // A feathered cap: a shallow dome tilted over one eye, a long plume trailing behind.
    featherCap(o) {
      const cap = xf(new THREE.SphereGeometry(0.135, 8, 4, 0, TAU, 0, 1.25), 0, 0.13, 0, 0.15, 0, -0.15);
      const plume = xf(new THREE.ConeGeometry(0.02, 0.4, 4), -0.13, 0.27, -0.1, 0.7, 0, 0.9);
      return [{ slot: o.slot, geo: uvScale(cap, 2, 1) }, { slot: o.plumeSlot, geo: plume }];
    },
    // A long beast's tail from the base of the spine, curving back and down to the floor, tapering in two lengths (Margit).
    tail(o) {
      const s = o.size ?? 1, V = (x, y, z) => new V3(x * s, y * s, z * s);
      const a = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, -0.12, -0.22), V(0.02, -0.36, -0.42), V(0.05, -0.62, -0.55)]), 8, 0.075 * s, 6, false);
      const b = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.05, -0.6, -0.54), V(0.09, -0.86, -0.6), V(0.16, -1.02, -0.48), V(0.24, -1.08, -0.3)]), 8, 0.045 * s, 5, false);
      const tip = xf(new THREE.ConeGeometry(0.045 * s, 0.2 * s, 5), 0.29 * s, -1.08 * s, -0.2 * s, Math.PI / 2, 0, 0);
      return [uvScale(a, 3, 1), uvScale(b, 3, 1), tip];
    },
    // A parrying dagger in the left hand (blade forward), in the forearm's frame.
    dagger(o) {
      const blade = plate([[0.05, -0.022], [0.4, -0.02], [0.52, 0], [0.4, 0.02], [0.05, 0.022]], 0.012, 0.004);
      blade.rotateY(-Math.PI / 2); xf(blade, 0.006, -0.32, 0.0);
      const guard = xf(tube(0.012, 0.012, 0.2, 4), 0, -0.32, 0.05, 0, 0, Math.PI / 2);
      return [{ slot: o.slot, geo: blade }, { slot: o.guardSlot ?? 'iron', geo: xf(guard, 0, 0, 0) }];
    },
    // A rib cage on a hunched spine: `full` ribs wrap all the way round on one side, `broken` stop short on the other.
    ribcage(o) {
      const out = [], full = o.full ?? 6, broken = o.broken ?? 3, n = Math.max(full, broken), sp = o.spine ?? 0.12;
      for (let i = 0; i < n; i++) {
        const y = 0.06 + i * 0.075, rad = (0.2 + 0.07 * Math.sin(i / (n - 1) * Math.PI)) * (o.size ?? 1);
        for (const side of [1, -1]) {
          const len = side === 1 ? Math.PI * 0.78 : (i < broken ? Math.PI * (0.35 + 0.1 * (i % 2)) : 0);
          if (side === 1 && i >= full) continue;
          if (len <= 0) continue;
          const g = new THREE.TorusGeometry(rad, 0.017, 3, 7, len);
          // The torus arc starts at +x, curving toward +y; lay it flat and swing it so it starts at the spine (back).
          g.rotateX(Math.PI / 2); g.rotateY(side === 1 ? Math.PI / 2 : -Math.PI / 2 - len + Math.PI); xf(g, 0, y, -sp + rad * 0.0, 0, 0, 0, 1, 1, 0.8);
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
      out.push({ slot: o.void, geo: xf(new THREE.ConeGeometry(r * 0.1, r * 0.3, 3), 0, r * 0.7, r * 0.9, Math.PI, 0, 0) });
      out.push({ slot: o.void, geo: xf(xf(plate([[-0.01, 0], [0.01, 0], [0.012, r * 0.9], [-0.012, r * 0.9]], 0.01, 0.002), 0, 0, 0), r * 0.15, r * 1.05, r * 0.98, 0, 0, -0.5) });
      const teeth = [];
      for (let i = -3; i <= 3; i++) teeth.push(xf(new THREE.ConeGeometry(r * 0.04, r * 0.16, 3), i * r * 0.1, r * 0.46, r * 0.86 - Math.abs(i) * r * 0.03, Math.PI, 0, 0));
      const jaw = deform(sphere(r * 0.8, 8, 4), v => { if (v.y > 0) v.y *= 0.05; v.z += 0.2 * r; });
      xf(jaw, 0, r * 0.35, 0, 0.35, 0, 0.1, 0.9, 0.55, 0.9); roughen(jaw, 0.012, 41);
      for (let i = -3; i <= 3; i++) teeth.push(xf(new THREE.ConeGeometry(r * 0.035, r * 0.12, 3), i * r * 0.1, r * 0.02, r * 0.95 - Math.abs(i) * r * 0.03, 0.35, 0, 0));
      return [...out, ...teeth.map(geo => ({ slot: o.slot, geo })), { slot: o.slot, geo: jaw }];
    },
    // Knuckles and joints: lumps of bone at the given points of the bone's frame.
    knobs(o) { return o.at.map(([x, y, z, r]) => roughen(xf(sphere(r, 6, 4), x, y, z), r * 0.25, 51)); },
    // Fingers: bony cones fanning out of a hand (in the forearm's frame).
    fingers(o) {
      const out = [];
      for (let i = -1; i <= 1; i++) out.push(xf(new THREE.ConeGeometry(o.r ?? 0.012, o.len ?? 0.14, 4), i * (o.spread ?? 0.03), -(o.at ?? 0.34) - (o.len ?? 0.14) / 2, 0.012, Math.PI + 0.25, 0, i * 0.18));
      return out;
    },
    // Curved horns on a helmet.
    horns(o) {
      const out = [];
      for (const s of [-1, 1]) {
        const g = new THREE.ConeGeometry(0.06 * (o.size ?? 1), 0.38 * (o.size ?? 1), 5, 3);
        deform(g, v => { const t = (v.y + 0.19 * (o.size ?? 1)) / (0.38 * (o.size ?? 1)); v.x += t * t * 0.28 * s * (o.size ?? 1); v.z += t * 0.04; });
        xf(g, s * 0.16 * (o.size ?? 1), 0.26, 0.0, 0, 0, -s * 0.4);
        out.push(g);
      }
      return out;
    },
    // Spikes on a shoulder: cones fanning up and out.
    spikes(o) {
      return (o.at ?? [[0.06, 0.1, 0.0], [0.1, 0.06, 0.07], [0.1, 0.06, -0.07]]).map(([x, y, z]) => {
        const sd = o.side ?? 1;
        return xf(new THREE.ConeGeometry(0.03, 0.14 * (o.size ?? 1), 4), x * sd, y, z, 0, 0, -0.9 * sd);
      });
    },
    // A chain of links sagging between two points of the bone's frame.
    chain(o) {
      const out = [], n = o.links ?? 10, a = new V3(...o.from), b = new V3(...o.to);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * (o.sag ?? 0.06);
        const g = new THREE.TorusGeometry(0.022, 0.006, 3, 5); g.scale(1, 1.4, 1);
        out.push(xf(g, p.x, p.y, p.z, 0, i % 2 ? Math.PI / 2 : 0, 0));
      }
      return out;
    },
    // A helm shaped like a bell, with a loop on top.
    bellHelm(o) {
      const s = o.size ?? 1;
      const g = lathe([[0.2, -0.04], [0.185, 0.02], [0.15, 0.12], [0.115, 0.21], [0.07, 0.27], [0.0, 0.295]].map(([r, y]) => [r * s, y * s]), 10);
      roughen(g, 0.01, 61);
      return [uvScale(g, 3, 1), xf(new THREE.TorusGeometry(0.04 * s, 0.012, 3, 6), 0, 0.33 * s, 0, 0, Math.PI / 2, 0), uvScale(xf(new THREE.TorusGeometry(0.2 * s, 0.014, 3, 10), 0, -0.035 * s, 0, Math.PI / 2, 0, 0), 4, 1)];
    },
    // A skirt flaring out like a bell.
    bellSkirt() {
      const g = lathe([[0.31, -0.5], [0.28, -0.4], [0.23, -0.22], [0.2, -0.06], [0.2, 0.05]], 10, 0.85);
      roughen(g, 0.012, 71);
      return [uvScale(g, 3, 1), uvScale(xf(new THREE.TorusGeometry(0.31, 0.02, 3, 10), 0, -0.5, 0, Math.PI / 2, 0, 0, 1, 1, 0.85), 4, 1)];
    },
    // A broken arrow still stuck in the back
    // A cloth wrap over the lower face with eye sockets left dark: the face is hidden but readable.
    faceWrap(o, M) {
      const r = M.proportions.headR, band = uvScale(xf(tube(r * 0.97, r * 0.9, 0.085, 8, true), 0, r * 0.62, 0.012, 0.12, 0, 0, 1, 1, 1.05), 2, 0.5);
      const eye = s => xf(sphere(0.02, 5, 3), s * r * 0.4, r * 1.12, r * 0.84, 0, 0, 0, 1.3, 0.8, 0.6);
      return [band, { slot: 'leather', geo: eye(-1) }, { slot: 'leather', geo: eye(1) }];
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
  };

  // ---- weapons: name -> { blade: [geo], grip: [geo], guard: [geo] }, blade pointing +z from the hand --------------
  const KIT_WEAPONS = {
    // A club made of one fused thigh bone: a long shaft, a great knuckled end, vertebra spikes.
    boneClub() {
      const shaft = uvScale(xf(new THREE.CylinderGeometry(0.06, 0.1, 1.1, 6), 0, 0, 0.45, Math.PI / 2, 0, 0), 1, 2);
      const head = roughen(xf(sphere(0.3, 8, 6), 0, 0, 1.2, 0, 0, 0, 1, 1, 1.25), 0.05, 77);
      const knobs = [xf(sphere(0.16, 6, 4), 0.2, 0.12, 1.0), xf(sphere(0.15, 6, 4), -0.2, 0.1, 1.15), xf(sphere(0.13, 6, 4), 0.0, -0.22, 1.05)];
      const spikes = [[0.22, 0.2, 1.3, 0.6], [-0.22, 0.2, 1.35, -0.6], [0, 0.32, 1.1, 0], [0.1, -0.3, 1.3, 3]].map(([x, y, z, a]) => xf(new THREE.ConeGeometry(0.05, 0.22, 4), x, y, z, 0, 0, a));
      return { blade: [head, ...knobs, ...spikes], grip: [shaft], guard: [roughen(xf(sphere(0.09, 5, 4), 0, 0, -0.12), 0.02, 79)] };
    },
    // A halberd: a long haft, an axe blade with a hooked beak behind and a spike on top.
    halberd() {
      const haft = xf(tube(0.03, 0.03, 2.5, 5), 0, 0, 0.55, Math.PI / 2, 0, 0);
      const axe = plate([[1.4, 0.0], [1.85, -0.02], [1.95, -0.3], [1.72, -0.56], [1.4, -0.4]], 0.035, 0.008);
      const hook = plate([[1.45, 0.02], [1.6, 0.26], [1.5, 0.3], [1.36, 0.1]], 0.03, 0.006);
      for (const g of [axe, hook]) { g.rotateY(-Math.PI / 2); xf(g, 0.017, 0, 0); roughen(g, 0.006, 83); }
      return { grip: [haft], blade: [axe, hook, xf(new THREE.ConeGeometry(0.05, 0.5, 4), 0, 0, 2.05, Math.PI / 2, 0, 0)], guard: [xf(tube(0.05, 0.045, 0.14, 5), 0, 0, 1.4, Math.PI / 2, 0, 0)] };
    },
    // A temple bell swung like a maul: crown on the haft, the mouth leading the blow, a lip of iron, a clapper inside.
    bellMaul() {
      const bell = lathe([[0, 0], [0.14, 0.03], [0.22, 0.15], [0.3, 0.35], [0.4, 0.55], [0.5, 0.7], [0.53, 0.76]], 10);
      roughen(bell, 0.012, 91); xf(bell, 0, 0, 1.2, Math.PI / 2, 0, 0);
      const lip = xf(new THREE.TorusGeometry(0.53, 0.035, 3, 10), 0, 0, 1.96, 0, 0, 0);
      const clapper = xf(sphere(0.12, 6, 4), 0, 0, 1.75);
      const haft = xf(tube(0.05, 0.05, 1.5, 6), 0, 0, 0.55, Math.PI / 2, 0, 0);
      return { blade: [bell], guard: [lip, clapper], grip: [haft] };
    },
    // A long gnarled walking cane (Margit): a knotted shaft, an iron ferrule at the striking end, a crook at the hand.
    cane() {
      const shaft = roughen(xf(tube(0.03, 0.022, 1.75, 6), 0, 0, 0.62, Math.PI / 2, 0, 0), 0.006, 31);
      const knots = [0.25, 0.7, 1.1].map((z, i) => xf(sphere(0.04, 5, 4), 0, 0, z, 0, 0, 0, 1, 1, 1.5 + i * 0.2));
      const ferrule = xf(new THREE.ConeGeometry(0.03, 0.16, 5), 0, 0, 1.56, Math.PI / 2, 0, 0);
      const crook = deform(tube(0.032, 0.03, 0.3, 5), v => { v.z -= v.y * v.y * 2.4; }); xf(crook, 0, 0.05, -0.32, Math.PI / 2, 0, 0);
      return { grip: [shaft, ...knots], blade: [ferrule], guard: [crook] };
    },
    // A heavy two-handed sword: broad blade, long grip.
    greatSword() {
      const blade = plate([[0.1, -0.075], [1.35, -0.072], [1.5, -0.03], [1.58, 0], [1.5, 0.03], [1.35, 0.072], [0.1, 0.075]], 0.035, 0.008);
      blade.rotateY(-Math.PI / 2); blade.translate(0.017, 0, 0); roughen(blade, 0.005, 17);
      const grip = uvScale(xf(new THREE.CylinderGeometry(0.026, 0.03, 0.3, 6), 0, 0, -0.06, Math.PI / 2, 0, 0), 1, 1);
      const guard = deform(tube(0.02, 0.02, 0.5, 5), v => { v.z += v.y * v.y * 1.6; }); xf(guard, 0, 0, 0.1);
      return { blade: [blade], grip: [grip], guard: [guard, xf(sphere(0.045, 5, 4), 0, 0, -0.25)] };
    },
    // A long ash-wood spear, gripped a third of the way up, with a leaf head.
    spear() {
      const shaft = xf(tube(0.022, 0.022, 2.35, 5), 0, 0, 0.45, Math.PI / 2, 0, 0);
      const head = plate([[1.62, -0.02], [1.75, -0.075], [1.97, 0], [1.75, 0.075], [1.62, 0.02]], 0.018, 0.005); head.rotateY(-Math.PI / 2); xf(head, 0.009, 0, 0);
      return { grip: [shaft], blade: [head], guard: [xf(tube(0.034, 0.03, 0.1, 5), 0, 0, 1.62, Math.PI / 2, 0, 0)] };
    },
    // A greataxe: long haft, a broad bearded crescent of iron and a spike on top.
    greatAxe() {
      const haft = xf(tube(0.036, 0.036, 1.75, 5), 0, 0, 0.62, Math.PI / 2, 0, 0);
      const head = plate([[1.05, 0.16], [1.4, 0.18], [1.52, -0.05], [1.56, -0.45], [1.3, -0.52], [1.08, -0.28]], 0.05, 0.01);
      head.rotateY(-Math.PI / 2); xf(head, 0.025, 0, 0); roughen(head, 0.008, 19);
      return { grip: [haft], blade: [head, xf(new THREE.ConeGeometry(0.04, 0.2, 4), 0, 0, 1.58, Math.PI / 2, 0, 0)], guard: [xf(tube(0.05, 0.045, 0.12, 5), 0, 0, 1.06, Math.PI / 2, 0, 0)] };
    },
    // A short bow held upright when aimed: limbs along z, the belly away from the archer (-y), the string at +y.
    bow() {
      const pts = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1].map(s => new V3(0, 0.17 - 0.22 * (1 - s * s), s * 0.52));
      const limb = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.016, 4, false);
      const string = xf(tube(0.004, 0.004, 1.04, 3), 0, 0.17, 0, Math.PI / 2, 0, 0);
      return { limb: [uvScale(limb, 6, 2), xf(tube(0.03, 0.03, 0.14, 5), 0, -0.05, 0, Math.PI / 2, 0, 0)], string: [string] };
    },
    // A thin dueling blade with a cup guard.
    rapier() {
      const blade = plate([[0.12, -0.02], [1.35, -0.013], [1.45, 0], [1.35, 0.013], [0.12, 0.02]], 0.012, 0.004);
      blade.rotateY(-Math.PI / 2); blade.translate(0.006, 0, 0);
      const cup = xf(new THREE.SphereGeometry(0.075, 7, 3, 0, TAU, 0, Math.PI / 2), 0, 0, 0.1, Math.PI / 2, 0, 0);
      const quill = xf(tube(0.011, 0.011, 0.3, 4), 0, 0, 0.1, 0, 0, Math.PI / 2);
      return { blade: [blade], grip: [uvScale(xf(new THREE.CylinderGeometry(0.02, 0.022, 0.2, 5), 0, 0, -0.03, Math.PI / 2, 0, 0), 1, 1)], guard: [cup, quill, xf(sphere(0.03, 5, 4), 0, 0, -0.14)] };
    },
    // A curved, hooked knife: short, quick, cruel.
    curvedKnife() {
      const blade = plate([[0.1, -0.04], [0.6, -0.05], [0.88, -0.03], [1.0, 0.03], [0.74, 0.0], [0.1, 0.04]], 0.016, 0.005);
      blade.rotateY(-Math.PI / 2); blade.translate(0.008, 0, 0);
      deform(blade, v => { v.x += Math.max(0, v.z - 0.1) ** 2 * 0.22; });
      const grip = uvScale(xf(new THREE.CylinderGeometry(0.022, 0.024, 0.2, 5), 0, 0, -0.01, Math.PI / 2, 0, 0), 1, 1);
      return { blade: [blade], grip: [grip], guard: [xf(tube(0.014, 0.014, 0.16, 4), 0, 0, 0.09, 0, 0, Math.PI / 2)] };
    },
    // A worn arming sword: straight, leather-wrapped grip, plain crossguard.
    wandererSword() {
      const blade = plate([[0.1, -0.045], [1.0, -0.044], [1.1, -0.022], [1.17, 0.0], [1.1, 0.022], [1.0, 0.044], [0.1, 0.045]], 0.02, 0.006);
      blade.rotateY(-Math.PI / 2); blade.translate(0.01, 0, 0); roughen(blade, 0.003, 9);
      const grip = uvScale(xf(new THREE.CylinderGeometry(0.022, 0.025, 0.22, 6), 0, 0, -0.02, Math.PI / 2, 0, 0), 1, 1);
      const guard = xf(tube(0.017, 0.017, 0.3, 5), 0, 0, 0.09, 0, 0, 0.04);
      return { blade: [blade], grip: [grip], guard: [guard, xf(sphere(0.034, 5, 4), 0, 0, -0.14)] };
    },
    // A notched, bent, rust-eaten sword: long enough to read its swing at a glance.
    ruinedSword() {
      const blade = plate([[0.1, -0.05], [0.55, -0.052], [0.59, -0.04], [0.62, -0.053], [1.0, -0.048], [1.12, -0.012], [1.16, 0.03], [1.02, 0.05],
        [0.68, 0.052], [0.64, 0.04], [0.6, 0.054], [0.1, 0.05]], 0.022, 0.006);
      blade.rotateY(-Math.PI / 2); blade.translate(0.011, 0, 0);
      deform(blade, v => { v.x += Math.max(0, v.z - 0.1) ** 2 * 0.035; }); roughen(blade, 0.004, 4);
      const grip = uvScale(xf(new THREE.CylinderGeometry(0.022, 0.026, 0.22, 6), 0, 0, -0.02, Math.PI / 2, 0, 0), 1, 1);
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
  function modelParts(id, variant) {
    const ckey = variant ? id + '|' + variant : id;
    let m = modelCache.get(ckey);
    if (m) return m;
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
      parts.push({ slot, weapon, geo }); tris += geo.attributes.position.count / 3;
    }
    const budget = MS.triBudget[M.budget] * (variant ? 1.25 : 1);   // a stronger variant may carry a quarter more
    if (tris > budget) console.warn(`Model "${id}" has ${Math.round(tris)} triangles; the ${M.budget} budget is ${budget}.`);
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
        m = TEXLIB.material(spec.tex, { tint: spec.tint, decay: spec.decay, size: spec.size ?? MS.texSize }).clone();
        m.side = spec.double ? THREE.DoubleSide : THREE.FrontSide; addDissolve(m, rim, rig.dissolve);
      }
      rig.mats.push(m);
      if ('glow' in spec) rig.fadeMats.push(m);   // eyes are plain materials: they fade instead of dissolving
      return m;
    };
    for (const [slot, spec] of Object.entries(M.materials)) {
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

  // Bakes every model's textures and geometry a little at a time while the menus are up, so a fight or level never
  // stalls to generate them. Pauses during play; whatever is not ready yet is simply built on demand.
  function prewarm() {
    const jobs = [];
    for (const id of Object.keys(MODEL_DEFS)) {
      const M = resolve(id);
      for (const spec of Object.values(M.materials)) if (spec.tex) jobs.push(() => TEXLIB.get(spec.tex, { tint: spec.tint, decay: spec.decay, size: spec.size ?? MS.texSize }));
      jobs.push(() => modelParts(id));
    }
    const step = () => {
      if (!jobs.length) return;
      if (typeof Game !== 'undefined' && Game.mode === 'play') { setTimeout(step, 1500); return; }
      try { jobs.shift()(); } catch (e) { console.warn('prewarm:', e); }
      setTimeout(step, 40);
    };
    setTimeout(step, 800);
  }

  return { buildModelRig, modelParts, resolve, resolveVariant, prewarm, parts: KIT_PARTS, weapons: KIT_WEAPONS, cache: modelCache };
})();
const buildModelRig = KIT.buildModelRig;
