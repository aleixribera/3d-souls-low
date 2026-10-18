'use strict';
// ============================================================================
// Kit parts of the Lands Between (v7.0): the eight new enemies and Seren
// ============================================================================
// Same contract as KIT_PARTS in js/bodykit.js: (options, model) -> geometries (or { slot, geo }) in the frame of the bone
// they hang on. Built from the kit's helpers and KIT_GEO, so at Ultra detail every round surface takes more segments on
// its own; tiny fittings stay low-poly. The models that use them are in js/data/lands-enemies.js. Added as this file loads.
{
  const { xf, uvScale, hash3, roughen, deform, lathe, plate, sphere } = KIT.helpers;
  const V3 = THREE.Vector3, TAU = Math.PI * 2, P = {};
  const bump = (t, at, w) => Math.exp(-(((t - at) / w) ** 2));
  const stud = r => new THREE.SphereGeometry(r, 6, 4);
  // A tube swept along a curve, its radius r(t) (as kit-premium's sweep: three's winding, front faces outward).
  function sweep(curve, rFn, tubular, radial, ovalA = 1) {
    tubular = Math.max(4, Math.round(tubular * KIT_GEO.get())); radial = Math.max(4, Math.round(radial * KIT_GEO.get()));
    const fr = curve.computeFrenetFrames(tubular, false), pos = [], nrm = [], uv = [], idx = [], p = new V3(), n = new V3();
    for (let i = 0; i <= tubular; i++) {
      const t = i / tubular, c = curve.getPointAt(t), r = rFn(t), N = fr.normals[i], B = fr.binormals[i];
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * TAU, ca = -Math.cos(a), sa = Math.sin(a);
        n.set(N.x * ca + B.x * sa * ovalA, N.y * ca + B.y * sa * ovalA, N.z * ca + B.z * sa * ovalA);
        p.copy(c).addScaledVector(n, r); n.normalize();
        pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z); uv.push(j / radial, t);
      }
    }
    for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  const curve = (pts, type = 'centripetal') => new THREE.CatmullRomCurve3(pts.map(p => p instanceof V3 ? p : new V3(...p)), false, type);
  // Point a geometry built along +y at `dir` and move it to `at`.
  const aim = (geo, dir, at) => { geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir.clone().normalize())); return geo.translate(at.x, at.y, at.z); };
  const tag = (list, slot) => slot ? list.map(geo => ({ slot, geo })) : list;

  // ---- the Omenkin (Stormhill): growths of horn bursting from the back and shoulders --------------------------------
  // Chest frame. `count` curved horns rooted over the shoulder blades and along the spine, each bending up and back and
  // tapering to a point, ridged, in clusters (the Omen's curse grows out of the bone).
  P.boneGrowths = o => {
    const s = o.size ?? 1, out = [], n = o.count ?? 9, seed = o.seed ?? 3;
    for (let i = 0; i < n; i++) {
      const h = k => hash3(i, k, 3, seed), side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      const root = new V3(side * (0.06 + 0.16 * h(1)) * s, (0.58 - row * 0.09 + 0.04 * h(2)) * s, (-0.12 - 0.06 * h(3)) * s);
      const len = (0.16 + 0.22 * (1 - row / n) + 0.1 * h(4)) * s, bend = 0.4 + 0.5 * h(5);
      const dir = new V3(side * (0.35 + 0.4 * h(6)), 0.8, -0.55 - 0.3 * h(7)).normalize();
      const mid = root.clone().addScaledVector(dir, len * 0.55).add(new V3(0, len * 0.12 * bend, -len * 0.1)), tip = root.clone().addScaledVector(dir, len).add(new V3(side * len * 0.15, -len * 0.18 * bend, -len * 0.22));
      out.push(roughen(sweep(curve([root, mid, tip]), t => (0.032 + 0.018 * h(8)) * s * (1 - 0.92 * t) * (1 + 0.12 * Math.sin(t * 46)), 14, 7), 0.002 * s, 40 + i));
      out.push(roughen(xf(sphere(0.045 * s, 7, 5), root.x, root.y, root.z, 0, 0, 0, 1, 0.8, 1), 0.01 * s, 60 + i));   // the swollen root
    }
    return out.map(g => uvScale(g, 1, 2));
  };

  // ---- the Grafted Scion (Stormveil): a gold mask and extra arms, each gripping a blade -------------------------------
  // Head frame: a smooth gold face mask, blank but for two narrow eye slits and a mouth seam, a raised brow ridge, and a
  // crown of thin rays fanned round its top like a halo of knives.
  P.scionMask = o => {
    const s = o.size ?? 1, mask = [], dark = [], rays = [];
    const face = KIT_GEO.Sphere(0.14 * s, 18, 12, -1.25, 2.5, 0.35, 1.55);
    xf(face, 0, 0.1 * s, 0.012 * s, 0, 0, 0, 0.92, 1.18, 1.05);
    deform(face, v => { if (v.z > 0) v.z += (0.05 * s - Math.min(0.05 * s, Math.abs(v.x))) * 0.35; });   // a soft nose ridge
    mask.push(uvScale(face, 2, 2));
    mask.push(xf(KIT_GEO.Torus(0.13 * s, 0.009 * s, 4, 16, 2.6), 0, 0.16 * s, 0.02 * s, Math.PI / 2 - 0.15, 0, -Math.PI / 2 + 0.25));   // the brow ridge
    for (const sd of [-1, 1]) dark.push(xf(new THREE.BoxGeometry(0.05 * s, 0.009 * s, 0.03 * s), sd * 0.045 * s, 0.13 * s, 0.135 * s, 0, sd * 0.3, sd * -0.12));   // eye slits
    dark.push(xf(new THREE.BoxGeometry(0.05 * s, 0.005 * s, 0.02 * s), 0, 0.045 * s, 0.14 * s));   // the mouth seam
    const n = o.rays ?? 11;
    for (let i = 0; i < n; i++) {
      const a = -1.2 + 2.4 * i / (n - 1), len = (0.16 + 0.1 * Math.cos(a * 1.3)) * s;
      const ray = KIT_GEO.Cone(0.012 * s, len, 4); ray.translate(0, len / 2, 0);
      rays.push(xf(ray, Math.sin(a) * 0.12 * s, 0.2 * s + Math.cos(a) * 0.05 * s, -0.04 * s, -0.25, 0, -a * 0.9));
    }
    return [...tag(mask, o.slot), ...tag(dark, o.dark ?? o.slot), ...tag(rays, o.rays_slot ?? o.slot)];
  };
  // Chest frame. Each entry of `arms` is [root, elbow, hand] as for graftedArms, plus a blade gripped in the hand and held
  // out along the forearm's line (`blade` m long): corded pale limbs, a stitched socket, a narrow notched blade.
  P.scionLimbs = o => {
    const flesh = [], steel = [], r = o.r ?? 0.034, L = o.blade ?? 0.6;
    o.arms.forEach(([root, elbow, hand], ai) => {
      const R = new V3(...root), E = new V3(...elbow), Hd = new V3(...hand);
      const c = curve([R, R.clone().lerp(E, 0.5).add(new V3(0, 0.02, 0)), E, E.clone().lerp(Hd, 0.5), Hd]);
      flesh.push(roughen(sweep(c, t => r * (1.2 - 0.55 * t + 0.25 * bump(t, 0.25, 0.1) + 0.25 * bump(t, 0.5, 0.05) - 0.1 * bump(t, 0.95, 0.05)), 20, 8, 0.85), r * 0.06, 70 + ai));
      flesh.push(roughen(xf(sphere(r * 1.6, 8, 6), R.x, R.y, R.z), r * 0.3, 80 + ai));   // the socket
      const d0 = c.getTangentAt(0.03), seam = KIT_GEO.Torus(r * 1.4, r * 0.1, 4, 12);
      seam.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), d0)); flesh.push(seam.translate(R.x + d0.x * r * 0.6, R.y + d0.y * r * 0.6, R.z + d0.z * r * 0.6));
      const dir = c.getTangentAt(1), fist = roughen(xf(sphere(r * 1.25, 8, 6), Hd.x, Hd.y, Hd.z, 0, 0, 0, 1, 1.15, 1), r * 0.1, 90 + ai);
      flesh.push(fist);
      // The blade: a flat, slightly curved strip from a small guard, a notch near its point.
      const side = new V3().crossVectors(dir, new V3(0, 1, 0)); if (side.lengthSq() < 0.01) side.set(1, 0, 0); side.normalize();
      const blade = new THREE.BoxGeometry(0.012, L, 0.05, 1, 10, 1); blade.translate(0, L / 2, 0);
      deform(blade, v => { const t = v.y / L; v.z += Math.sin(t * Math.PI) * 0.03 + (t > 0.92 ? -(t - 0.92) * 0.25 : 0); v.z *= t > 0.85 ? 1 - (t - 0.85) * 4 : 1; });
      const guard = new THREE.BoxGeometry(0.02, 0.016, 0.11);
      steel.push(aim(uvScale(blade, 0.3, 2), dir, Hd.clone().addScaledVector(dir, r)), aim(guard, dir, Hd.clone().addScaledVector(dir, r * 0.8)));
    });
    return [...tag(flesh.map(g => uvScale(g, 1.5, 1)), o.slot), ...tag(steel, o.blades ?? o.slot)];
  };

  // ---- the Crucible Squire (the Evergaol): amber growths of the Crucible ------------------------------------------------
  // A cluster of glowing amber crystal shards at `at` (any frame), fanned along `dir`: the primal life of the Crucible
  // breaking out through the bronze.
  P.crystalCluster = o => {
    const s = o.size ?? 1, at = new V3(...(o.at ?? [0, 0, 0])), base = new V3(...(o.dir ?? [0, 1, 0])).normalize(), out = [], n = o.count ?? 6;
    for (let i = 0; i < n; i++) {
      const h = k => hash3(i, k, 7, o.seed ?? 5), len = (0.08 + 0.12 * h(1)) * s, w = (0.018 + 0.016 * h(2)) * s;
      const shard = new THREE.OctahedronGeometry(1, 0); shard.scale(w, len / 2, w * 0.8); shard.translate(0, len / 2, 0);
      const d = base.clone().add(new V3((h(3) - 0.5) * 1.1, (h(4) - 0.3) * 0.6, (h(5) - 0.5) * 1.1)).normalize();
      out.push(aim(shard, d, at.clone().add(new V3((h(6) - 0.5) * 0.06 * s, 0, (h(7) - 0.5) * 0.06 * s))));
    }
    return out;
  };

  // ---- the Leyndell Knight (the capital): a plumed helm and the Erdtree on the breast ------------------------------------
  // Head frame: a tall rounded close-helm with a narrow sight, a raised gilt band and comb, and a great plume of white
  // feathers arcing up from the crown and back over the shoulders (`plume` slot).
  P.plumedHelm = o => {
    const s = o.size ?? 1, helm = [], trim = [], plume = [], dark = [];
    const g = lathe([[0.122, -0.04], [0.14, 0.02], [0.148, 0.09], [0.146, 0.17], [0.13, 0.24], [0.1, 0.29], [0.05, 0.315], [0, 0.32]].map(([r, y]) => [r * s, y * s]), 16, 1.08);
    deform(g, v => { if (v.z > 0) v.z += (0.08 * s - Math.min(0.08 * s, Math.abs(v.x))) * 0.3; });   // a gentle prow
    helm.push(uvScale(roughen(g, 0.0015 * s, 141), 2.5, 1.5));
    trim.push(xf(KIT_GEO.Torus(0.149 * s, 0.01 * s, 4, 18), 0, 0.13 * s, 0, Math.PI / 2, 0, 0, 1, 1.08, 1));   // the brow band
    trim.push(xf(KIT_GEO.Torus(0.142 * s, 0.008 * s, 4, 18), 0, 0.02 * s, 0, Math.PI / 2, 0, 0, 1, 1.08, 1));
    trim.push(xf(new THREE.BoxGeometry(0.016 * s, 0.03 * s, 0.32 * s), 0, 0.31 * s, -0.01 * s, -0.12, 0, 0));   // the comb
    dark.push(xf(new THREE.BoxGeometry(0.15 * s, 0.012 * s, 0.03 * s), 0, 0.105 * s, 0.155 * s));   // the sight
    for (let i = 0; i < 4; i++) dark.push(xf(new THREE.BoxGeometry(0.005 * s, 0.024 * s, 0.01 * s), (-0.045 + i * 0.03) * s, 0.055 * s, 0.158 * s));
    const n = o.feathers ?? 7;
    for (let i = 0; i < n; i++) {
      const sp = (i / (n - 1) - 0.5) * 0.5, L = (0.55 + 0.25 * Math.cos(sp * 3)) * s;
      const root = new V3(sp * 0.08 * s, 0.31 * s, -0.02 * s);
      const c = curve([root, root.clone().add(new V3(sp * 0.2 * s, 0.18 * s, -0.12 * s)), root.clone().add(new V3(sp * 0.35 * s, 0.12 * s, -L * 0.6)),
        root.clone().add(new V3(sp * 0.45 * s, -0.12 * s, -L))]);
      plume.push(sweep(c, t => 0.03 * s * (0.4 + 1.2 * Math.sin(Math.PI * Math.min(1, t * 1.1))) * (1 - 0.3 * t), 12, 5, 0.35));
    }
    return [...tag(helm, o.slot), ...tag(trim, o.trim ?? o.slot), ...tag(plume, o.plume ?? o.slot), ...tag(dark, o.dark ?? o.slot)];
  };
  // Chest frame (or any): the Erdtree in raised gold: a trunk rising from roots, boughs and a round crown, on a disc.
  P.erdtreeEmblem = o => {
    const s = o.size ?? 1, at = new V3(...(o.at ?? [0, 0.36, 0.2])), out = [];
    const disc = xf(KIT_GEO.Cylinder(0.08 * s, 0.08 * s, 0.008 * s, 20), 0, 0, 0, Math.PI / 2, 0, 0); out.push(disc);
    out.push(xf(KIT_GEO.Torus(0.08 * s, 0.006 * s, 4, 24), 0, 0, 0.004 * s));
    const trunk = sweep(curve([[0, -0.07 * s, 0.006 * s], [0, -0.01 * s, 0.008 * s], [0, 0.03 * s, 0.008 * s]]), t => 0.008 * s * (1.4 - 0.6 * t), 6, 5); out.push(trunk);
    for (const sd of [-1, 1]) {
      out.push(sweep(curve([[0, 0.01 * s, 0.008 * s], [sd * 0.025 * s, 0.035 * s, 0.009 * s], [sd * 0.05 * s, 0.045 * s, 0.009 * s]]), t => 0.005 * s * (1 - 0.6 * t), 6, 4));
      out.push(sweep(curve([[0, -0.06 * s, 0.007 * s], [sd * 0.03 * s, -0.07 * s, 0.008 * s], [sd * 0.055 * s, -0.062 * s, 0.008 * s]]), t => 0.004 * s * (1 - 0.6 * t), 6, 4));   // roots
    }
    out.push(xf(KIT_GEO.Sphere(0.045 * s, 12, 6, 0, TAU, 0, Math.PI / 2), 0, 0.03 * s, 0.006 * s, Math.PI / 2, 0, 0, 1.2, 0.35, 0.8));   // the crown
    return out.map(g => g.translate(at.x, at.y, at.z));
  };

  // ---- the Ashen Warrior (the ashen capital): a lion's head worn as a hood -------------------------------------------------
  // Head frame: the upper skull and muzzle of a great lion over the brow (its eye sockets dark, its fangs hanging over the
  // warrior's eyes), its mane fringed round the face and its pelt falling over the back of the neck.
  P.lionPelt = o => {
    const s = o.size ?? 1, hide = [], fur = [], bone = [], dark = [];
    const skull = KIT_GEO.Sphere(0.17 * s, 16, 10, 0, TAU, 0, Math.PI * 0.55);
    xf(skull, 0, 0.14 * s, -0.01 * s, -0.15, 0, 0, 1.05, 0.85, 1.25); roughen(skull, 0.004 * s, 151); hide.push(skull);
    const muzzle = lathe([[0.075, 0], [0.085, 0.05], [0.07, 0.1], [0.045, 0.13], [0, 0.135]].map(([r, y]) => [r * s, y * s]), 12, 0.75);
    hide.push(roughen(xf(muzzle, 0, 0.22 * s, 0.12 * s, Math.PI / 2 - 0.35, 0, 0, 1, 1, 1), 0.003 * s, 152));
    hide.push(xf(sphere(0.03 * s, 8, 6), 0, 0.235 * s, 0.25 * s, 0, 0, 0, 1.3, 0.8, 1));   // the nose
    for (const sd of [-1, 1]) {
      dark.push(xf(sphere(0.024 * s, 8, 6), sd * 0.065 * s, 0.24 * s, 0.13 * s, 0, 0, 0, 1.2, 0.7, 1));   // empty eye sockets
      const fang = KIT_GEO.Cone(0.012 * s, 0.075 * s, 6); fang.rotateX(Math.PI); bone.push(xf(fang, sd * 0.04 * s, 0.155 * s, 0.215 * s, -0.25, 0, 0));
      const ear = KIT_GEO.Cone(0.035 * s, 0.07 * s, 6); hide.push(xf(ear, sd * 0.11 * s, 0.3 * s, -0.02 * s, -0.2, 0, -sd * 0.5, 1, 1, 0.5));
    }
    const n = o.count ?? 34;
    for (let i = 0; i < n; i++) {   // the mane: clumps fringing the face and spilling down the neck and shoulders
      const h = k => hash3(i, k, 11, o.seed ?? 7), a = (i / n) * TAU, ring = 0.15 + 0.04 * h(1), y = (0.1 + 0.1 * Math.sin(a)) * s;
      const root = new V3(Math.sin(a) * ring * s, y + 0.06 * s, Math.cos(a) * ring * s * 0.95 - 0.04 * s);
      const len = (0.14 + 0.16 * h(2) + (Math.cos(a) < 0 ? 0.18 : 0)) * s, dir = new V3(Math.sin(a) * 0.7, -0.8, Math.cos(a) * 0.5 - (Math.cos(a) < 0 ? 0.7 : 0)).normalize();
      const clump = KIT_GEO.Cone((0.045 + 0.025 * h(3)) * s, len, 5); clump.translate(0, len / 2, 0);
      fur.push(aim(clump, dir, root));
    }
    return [...tag(hide, o.slot), ...tag(fur, o.fur ?? o.slot), ...tag(bone, o.fangs ?? o.slot), ...tag(dark, o.dark ?? o.slot)];
  };

  // ---- the Beastman of Farum Azula: tall ears and fur clumps ---------------------------------------------------------------
  P.beastEars = o => {
    const s = o.size ?? 1, out = [];
    for (const sd of [-1, 1]) {
      const ear = KIT_GEO.Cone(0.05 * s, 0.17 * s, 8, 3); ear.translate(0, 0.085 * s, 0);
      deform(ear, v => { v.z *= 0.45; v.z -= (v.y / (0.17 * s)) ** 2 * 0.05 * s; });   // flattened, bent back at the tip
      out.push(roughen(xf(ear, sd * 0.09 * s, 0.2 * s, -0.03 * s, -0.35, sd * 0.2, -sd * 0.42), 0.003 * s, 160 + sd));
    }
    return out;
  };
  // Any frame: `count` clumps of matted fur over a band (`from`..`to` [x, y, z] corners), lying along `lay`.
  P.furClumps = o => {
    const s = o.size ?? 1, A = new V3(...o.from), B = new V3(...o.to), lay = new V3(...(o.lay ?? [0, -1, -0.3])).normalize(), out = [], n = o.count ?? 24;
    for (let i = 0; i < n; i++) {
      const h = k => hash3(i, k, 13, o.seed ?? 9), at = new V3(A.x + (B.x - A.x) * h(1), A.y + (B.y - A.y) * h(2), A.z + (B.z - A.z) * h(3));
      const len = (o.len ?? 0.16) * (0.6 + 0.8 * h(4)) * s, clump = KIT_GEO.Cone((0.03 + 0.02 * h(5)) * s, len, 5);
      clump.translate(0, len / 2, 0);
      out.push(aim(clump, lay.clone().add(new V3((h(6) - 0.5) * 0.6, 0, (h(7) - 0.5) * 0.6)).normalize(), at));
    }
    return out;
  };

  // ---- the Golden Zealot (the Erdtree): a mitre and a halo of the Golden Order ----------------------------------------------
  P.goldMitre = o => {
    const s = o.size ?? 1, cloth = [], gold = [];
    const g = lathe([[0.135, 0.06], [0.142, 0.12], [0.13, 0.22], [0.1, 0.34], [0.05, 0.44], [0, 0.48]].map(([r, y]) => [r * s, y * s]), 16, 0.82);
    deform(g, v => { const t = v.y / (0.48 * s); v.z *= 1 - 0.25 * t; });
    cloth.push(uvScale(g, 2, 2));
    gold.push(xf(KIT_GEO.Torus(0.14 * s, 0.012 * s, 4, 18), 0, 0.075 * s, 0, Math.PI / 2, 0, 0, 1, 0.82, 1));
    gold.push(xf(new THREE.BoxGeometry(0.02 * s, 0.4 * s, 0.012 * s), 0, 0.26 * s, 0.112 * s, -0.17, 0, 0));   // the front band
    gold.push(xf(new THREE.BoxGeometry(0.16 * s, 0.018 * s, 0.012 * s), 0, 0.2 * s, 0.12 * s, -0.17, 0, 0));
    for (const sd of [-1, 1]) cloth.push(xf(new THREE.PlaneGeometry(0.05 * s, 0.32 * s, 1, 4), sd * 0.06 * s, -0.08 * s, -0.12 * s, 0.15, 0, sd * 0.05));   // lappets behind
    return [...tag(cloth, o.slot), ...tag(gold, o.gold ?? o.slot)];
  };
  // Head frame (or any): a ring of light behind the head, thin spokes to a small inner ring (glow slot).
  P.haloRing = o => {
    const s = o.size ?? 1, at = new V3(...(o.at ?? [0, 0.18, -0.2])), out = [];
    out.push(xf(KIT_GEO.Torus(0.28 * s, 0.012 * s, 4, 40), 0, 0, 0));
    out.push(xf(KIT_GEO.Torus(0.12 * s, 0.008 * s, 4, 28), 0, 0, 0));
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, sp = new THREE.BoxGeometry(0.008 * s, 0.16 * s, 0.006 * s); sp.translate(0, 0.2 * s, 0); out.push(xf(sp, 0, 0, 0, 0, 0, a)); }
    return out.map(g => xf(g, at.x, at.y, at.z, o.tilt ?? 0.15, 0, 0));
  };

  // ---- the Cleanrot Knight (the Haligtree): a tall conical gold helm with a crimson tassel ------------------------------------
  P.cleanrotHelm = o => {
    const s = o.size ?? 1, gold = [], tassel = [], dark = [];
    const g = lathe([[0.13, -0.05], [0.145, 0.03], [0.148, 0.1], [0.13, 0.2], [0.095, 0.32], [0.055, 0.44], [0.022, 0.55], [0.008, 0.6], [0, 0.61]].map(([r, y]) => [r * s, y * s]), 18, 1.04);
    gold.push(uvScale(roughen(g, 0.0015 * s, 171), 2, 2.5));
    for (const [y, r] of [[0.1, 0.149], [0.2, 0.132], [0.32, 0.097], [0.44, 0.057]]) gold.push(xf(KIT_GEO.Torus(r * s, 0.008 * s, 4, 20), 0, y * s, 0, Math.PI / 2, 0, 0, 1, 1.04, 1));   // the stacked ridges
    dark.push(xf(KIT_GEO.Cylinder(0.149 * s, 0.149 * s, 0.014 * s, 20, 1, true, -0.9, 1.8), 0, 0.135 * s, 0, 0, 0, 0, 1, 1, 1.05));   // the sight, round the front
    gold.push(xf(KIT_GEO.Sphere(0.02 * s, 8, 6), 0, 0.615 * s, 0));   // the finial
    const c = curve([[0, 0.6 * s, 0], [0, 0.66 * s, -0.08 * s], [0, 0.5 * s, -0.24 * s], [0.02 * s, 0.22 * s, -0.3 * s], [0.03 * s, -0.12 * s, -0.3 * s], [0.02 * s, -0.42 * s, -0.26 * s]]);
    tassel.push(sweep(c, t => 0.03 * s * (0.5 + t) * (1 - 0.3 * bump(t, 1, 0.1)), 26, 7, 0.4));
    for (let i = 0; i < 7; i++) {   // the tassel frays into strands at its end
      const q = c.getPointAt(0.82 + i * 0.02), len = (0.12 + 0.05 * hash3(i, 1, 2, 3)) * s, str = KIT_GEO.Cone(0.008 * s, len, 4);
      str.rotateX(Math.PI); tassel.push(str.translate(q.x + (i - 3) * 0.008 * s, q.y - len / 2, q.z));
    }
    return [...tag(gold, o.slot), ...tag(tassel, o.tassel ?? o.slot), ...tag(dark, o.dark ?? o.slot)];
  };
  // Any frame: small clusters of scarlet rot blossoms grown on the armour (glow slot), at each point of `at`.
  P.rotBlooms = o => {
    const out = [], s = o.size ?? 1;
    (o.at || []).forEach(([x, y, z], k) => {
      for (let i = 0; i < 5; i++) {
        const h = j => hash3(i, j, k, 17), petal = KIT_GEO.Sphere(0.018 * s, 6, 4); petal.scale(1, 0.45, 1.6);
        out.push(xf(petal, x + (h(1) - 0.5) * 0.04 * s, y + (h(2) - 0.5) * 0.03 * s, z + 0.01 * s, h(3) * 3, h(4) * 6, 0));
      }
    });
    return out;
  };

  // ---- Seren, the Grace-Bearer: the lantern she carries ---------------------------------------------------------------------
  // Forearm frame (elbowL): a small iron lantern hung below the hand on a ring: a cage of four bars round a pane of
  // light (`glow` slot), a domed cap and its ring.
  P.lantern = o => {
    const s = o.size ?? 1, y0 = -(o.at ?? 0.36) - 0.08 * s, iron = [], light = [];
    iron.push(xf(KIT_GEO.Torus(0.02 * s, 0.004 * s, 3, 10), 0, y0 + 0.07 * s, 0.02 * s));
    iron.push(xf(KIT_GEO.Cone(0.05 * s, 0.04 * s, 10), 0, y0 + 0.03 * s, 0.02 * s));
    iron.push(xf(KIT_GEO.Cylinder(0.045 * s, 0.05 * s, 0.012 * s, 10), 0, y0 - 0.1 * s, 0.02 * s));
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; iron.push(xf(new THREE.BoxGeometry(0.006 * s, 0.12 * s, 0.006 * s), Math.sin(a) * 0.042 * s, y0 - 0.04 * s, 0.02 * s + Math.cos(a) * 0.042 * s)); }
    light.push(xf(KIT_GEO.Cylinder(0.034 * s, 0.038 * s, 0.1 * s, 10), 0, y0 - 0.04 * s, 0.02 * s));
    return [...tag(iron, o.slot), ...tag(light, o.glow ?? o.slot)];
  };

  // ---- the Beastman's head: a wolfish muzzle, nose, jaw and fangs (head frame) ------------------------------------------------
  P.wolfMuzzle = o => {
    const s = o.size ?? 1, hide = [], dark = [], bone = [];
    const snout = lathe([[0.075, 0], [0.07, 0.06], [0.058, 0.13], [0.04, 0.19], [0.025, 0.215], [0, 0.22]].map(([r, y]) => [r * s, y * s]), 10, 0.72);
    hide.push(roughen(xf(snout, 0, 0.075 * s, 0.07 * s, Math.PI / 2 - 0.12, 0, 0, 1, 1, 1), 0.003 * s, 181));
    const jaw = lathe([[0.05, 0], [0.045, 0.08], [0.03, 0.15], [0, 0.17]].map(([r, y]) => [r * s, y * s]), 8, 0.5);
    hide.push(xf(jaw, 0, 0.02 * s, 0.08 * s, Math.PI / 2 + 0.22, 0, 0));
    dark.push(xf(sphere(0.024 * s, 8, 6), 0, 0.12 * s, 0.285 * s, 0, 0, 0, 1.3, 0.9, 1));   // the nose
    for (const sd of [-1, 1]) {
      const fang = KIT_GEO.Cone(0.009 * s, 0.05 * s, 5); fang.rotateX(Math.PI);
      bone.push(xf(fang, sd * 0.03 * s, 0.035 * s, 0.24 * s, -0.2, 0, 0));
      const brow = sphere(0.035 * s, 8, 5); hide.push(xf(brow, sd * 0.05 * s, 0.13 * s, 0.1 * s, 0, 0, 0, 1.2, 0.6, 1));
    }
    return [...tag(hide, o.slot), ...tag(dark, o.dark ?? o.slot), ...tag(bone, o.fangs ?? o.slot)];
  };
  // ---- the Ashen Warrior: fire still alive under the ash, in veins over the body (chest frame, glow slot) ------------------
  // `count` jagged veins wandering over the torso's surface, front and back, branching once each.
  const TORSO = [[0.15, -0.06], [0.168, 0.05], [0.21, 0.22], [0.26, 0.4], [0.29, 0.5], [0.2, 0.575], [0.07, 0.625]];
  const torsoR = y => {
    for (let i = 0; i < TORSO.length - 1; i++) { const [r0, y0] = TORSO[i], [r1, y1] = TORSO[i + 1]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
    return y < TORSO[0][1] ? TORSO[0][0] : TORSO[TORSO.length - 1][0];
  };
  P.emberVeins = (o, M) => {
    const tw = M.proportions.torsoW / 0.2, oz = M.proportions.torsoD / M.proportions.torsoW, out = [], n = o.count ?? 10, lift = (o.lift ?? 0.022);
    const onBody = (a, y) => { const R = torsoR(y) * tw * (1 + (o.bulk ?? 0.08)) + lift; return new V3(Math.sin(a) * R, y, Math.cos(a) * R * oz); };
    for (let i = 0; i < n; i++) {
      const h = k => hash3(i, k, 19, o.seed ?? 3); let a = h(1) * TAU, y = 0.05 + 0.45 * h(2);
      const pts = [];
      for (let j = 0; j < 6; j++) { pts.push(onBody(a, y)); a += (h(10 + j) - 0.5) * 0.5; y += 0.03 + 0.04 * h(20 + j); if (y > 0.56) break; }
      if (pts.length < 3) continue;
      out.push(sweep(curve(pts, 'catmullrom'), t => 0.006 * (1 - 0.6 * t) + 0.002, 10, 4));
    }
    return out;
  };
  Object.assign(KIT.parts, P);

  // ---- weapons (along +z from the hand) ------------------------------------------------------------------------------------
  const W = {};
  // The Golden Zealot's hammer: a long gilded haft, banded, a small ornate block of gold with flared faces and a spike.
  W.zealotHammer = () => {
    const haft = uvScale(xf(KIT_GEO.Cylinder(0.022, 0.026, 1.25, 10), 0, 0, 0.36, Math.PI / 2, 0, 0), 1, 3);
    const bands = [0.0, 0.25, 0.75, 0.92].map(z => xf(KIT_GEO.Torus(0.028, 0.006, 4, 12), 0, 0, z));
    const head = lathe([[0.06, -0.15], [0.085, -0.13], [0.085, -0.1], [0.07, -0.08], [0.07, 0.08], [0.085, 0.1], [0.085, 0.13], [0.06, 0.15]], 12);
    xf(head, 0, 0, 1.0, 0, 0, Math.PI / 2);
    const collar = xf(KIT_GEO.Cylinder(0.04, 0.05, 0.08, 10), 0, 0, 0.93, Math.PI / 2, 0, 0);
    const spike = xf(KIT_GEO.Cone(0.03, 0.14, 8), 0, 0, 1.13, Math.PI / 2, 0, 0);
    const pommel = xf(sphere(0.035, 8, 6), 0, 0, -0.28);
    return { blade: [uvScale(head, 2, 1), spike], grip: [haft], guard: [...bands, collar, pommel] };
  };
  // The Cleanrot Knight's spear: a long slender shaft, gold rings, a leaf-shaped head and a hooked side-blade under it.
  W.cleanrotSpear = () => {
    const shaft = uvScale(xf(KIT_GEO.Cylinder(0.018, 0.02, 2.3, 8), 0, 0, 0.55, Math.PI / 2, 0, 0), 1, 5);
    const rings = [-0.5, 1.45, 1.62].map(z => xf(KIT_GEO.Torus(0.024, 0.006, 4, 10), 0, 0, z));
    const head = new THREE.BoxGeometry(0.012, 0.06, 0.42, 1, 4, 8); head.translate(0, 0, 0.21);
    deform(head, v => { const t = v.z / 0.42, w = Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - 0.3 * t); v.y *= w + 0.08; });
    xf(head, 0, 0, 1.68);
    const hook = new THREE.BoxGeometry(0.01, 0.12, 0.045, 1, 6, 1); hook.translate(0, 0.06, 0);
    deform(hook, v => { const t = v.y / 0.12; v.z += t * t * 0.06; });
    xf(hook, 0, 0.012, 1.6, 0, 0, 0);
    const butt = xf(KIT_GEO.Cone(0.022, 0.1, 6), 0, 0, -0.62, -Math.PI / 2, 0, 0);
    return { blade: [uvScale(head, 0.4, 2), hook], grip: [shaft], guard: [...rings, butt] };
  };
  Object.assign(KIT.weapons, W);
}
