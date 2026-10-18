'use strict';
// ============================================================================
// Premium kit parts (v6.0): the remade models' armour, cloth and weapons
// ============================================================================
// Same contract as KIT_PARTS / KIT_WEAPONS in js/bodykit.js: (options, model) -> geometries (or { slot, geo }) in the frame
// of the bone they hang on; weapons along +z from the hand. Built from the kit's helpers and KIT_GEO, so at Ultra
// detail every round surface takes more segments on its own. Added to the kit as this file loads.
{
  const { xf, uvScale, hash3, roughen, deform, lathe, shape, plate, sphere, tube, texMeters } = KIT.helpers;
  const V2 = THREE.Vector2, V3 = THREE.Vector3, TAU = Math.PI * 2;
  const P = {}, W = {};
  const tw = M => M.proportions.torsoW / 0.2, oz = M => M.proportions.torsoD / M.proportions.torsoW;
  // A profile [[radius, y]] sampled every `step` m (linear between its points), for smooth, finely stepped lathes.
  const resample = (prof, step) => {
    const out = [];
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[i + 1], n = Math.max(1, Math.ceil(Math.abs(y1 - y0) / step));
      for (let k = 0; k < n; k++) { const t = k / n; out.push([r0 + (r1 - r0) * t, y0 + (y1 - y0) * t]); }
    }
    out.push(prof[prof.length - 1]);
    return out;
  };
  // A partial solid of revolution (front: phi 0 is +z), squashed in depth by `ovalZ`.
  const sector = (prof, seg, phi0, phiLen, ovalZ = 1) =>
    xf(KIT_GEO.Lathe(prof.map(([r, y]) => new V2(r, y)), seg, phi0, phiLen), 0, 0, 0, 0, 0, 0, 1, 1, ovalZ);
  const angle = v => Math.atan2(v.x, v.z);
  // Tiny fittings (rivets, studs) stay low-poly at any detail: their shape never shows.
  const stud = r => new THREE.SphereGeometry(r, 6, 4);
  // The torso's own profile (chest frame), as in the body kit, so armour is laid just over it.
  const TORSO = [[0.15, -0.06], [0.168, 0.05], [0.21, 0.22], [0.26, 0.4], [0.29, 0.5], [0.2, 0.575], [0.07, 0.625]];
  const over = (prof, add) => prof.map(([r, y]) => [r + add, y]);
  // The torso's radius at height y (chest frame, before the model's width and depth).
  const torsoR = y => {
    for (let i = 0; i < TORSO.length - 1; i++) { const [r0, y0] = TORSO[i], [r1, y1] = TORSO[i + 1]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
    return y < TORSO[0][1] ? TORSO[0][0] : TORSO[TORSO.length - 1][0];
  };
  // A strap hugging the torso (chest frame): round it at height y0, tilted by `tilt` (m up at the left side, down at the
  // right), `lift` m off the surface, of tube radius `r`; `arc` limits it to part of the way round (rad, centred on `mid`).
  const torsoStrap = (M, y0, tilt, lift, r, arc = TAU, mid = 0) => {
    const k = tw(M), z = oz(M), pts = [], n = 40, closed = arc >= TAU - 1e-6;
    for (let i = 0; i < (closed ? n : n + 1); i++) {
      const a = mid - arc / 2 + arc * i / n, y = y0 + Math.sin(a) * tilt, R = torsoR(y) * k + lift;
      pts.push(new V3(Math.sin(a) * R, y, Math.cos(a) * R * z));
    }
    return KIT_GEO.Tube(new THREE.CatmullRomCurve3(pts, closed), 26, r, 4, closed);
  };

  // ---- the wanderer (the player) ---------------------------------------------------------------------------------------
  // A quilted gambeson: stitched in horizontal bands and vertical channels, a seam down the front, a standing collar.
  P.gambeson = (o, M) => {
    const k = tw(M), prof = resample([[0.19, -0.04], [0.2, 0.05], [0.235, 0.22], [0.285, 0.4], [0.312, 0.5], [0.268, 0.553], [0.17, 0.598], [0.128, 0.618]], 0.022);
    const g = lathe(prof.map(([r, y]) => [r * k, y]), 12, oz(M));
    deform(g, v => {
      const a = angle(v), band = Math.abs(Math.sin(v.y * Math.PI / 0.075)), chan = Math.pow(Math.abs(Math.cos(a * 7)), 6);
      const m = 1 + 0.02 * Math.pow(band, 0.6) - 0.016 * chan * (v.y > 0.02 && v.y < 0.5 ? 1 : 0);
      v.x *= m; v.z *= m;
      if (v.z > 0 && Math.abs(v.x) < 0.012) v.z -= 0.006;   // the front seam
    });
    const collar = lathe([[0.122 * k, 0.6], [0.118 * k, 0.65], [0.126 * k, 0.69], [0.12 * k, 0.695]], 12, 0.9);
    return [uvScale(g, 1.8, 1.4), uvScale(collar, 2, 0.5)];
  };
  // A boiled-leather cuirass over it: front and back plates with a raised keel, edges rolled, buckled straps at the sides.
  P.cuirass = (o, M) => {
    const k = tw(M), z = oz(M), prof = resample(over(TORSO.slice(1, 5), 0.03).map(([r, y]) => [r * k, y]), 0.03).filter(([, y]) => y >= 0.12 && y <= 0.52);
    const front = sector(prof, 8, -1.05, 2.1, z), back = sector(prof, 8, Math.PI - 0.95, 1.9, z);
    deform(front, v => { v.z += 0.014 * Math.max(0, 1 - Math.abs(v.x) / 0.05); });   // the keel
    const rim = y => torsoStrap(M, y, 0, 0.034, 0.008, 2.1, 0);
    const straps = [0.24, 0.38].flatMap(y => [-1, 1].map(s => {
      const r = (0.26 + (y - 0.24) * 0.3) * k + 0.03;
      return xf(new THREE.BoxGeometry(0.018, 0.03, 0.11), s * r, y, -0.01, 0, 0, 0);
    }));
    const buckles = [0.24, 0.38].flatMap(y => [-1, 1].map(s => xf(plate([[-0.016, -0.02], [0.016, -0.02], [0.016, 0.02], [-0.016, 0.02]], 0.006, 0.003),
      s * (0.26 + (y - 0.24) * 0.3) * k + s * 0.032, y, 0.035, 0, s * Math.PI / 2, 0)));
    return [uvScale(front, 1.6, 1.2), uvScale(back, 1.6, 1.2), rim(0.5), rim(0.14),
            ...straps.map(geo => ({ slot: o.strap ?? o.slot, geo })), ...buckles.map(geo => ({ slot: o.metal, geo }))];
  };
  // The coat's skirt: a long back panel from the waist (spin frame), split at the sides, ragged at the hem.
  P.coatBack = o => {
    const len = o.len ?? 0.56, g = KIT_GEO.Cylinder(0.205, 0.275, len, 14, 6, true, Math.PI - (o.span ?? 1.0), (o.span ?? 1.0) * 2);
    g.translate(0, -len / 2 + 0.03, 0);
    deform(g, v => {
      const t = (0.03 - v.y) / len, a = angle(v);
      const fold = Math.sin(a * 9 + hash3(1, 2, 3, o.seed ?? 3)) * 0.012 * t; const r = Math.hypot(v.x, v.z) + fold; v.x = Math.sin(a) * r; v.z = Math.cos(a) * r;
      if (t > 0.96) v.y -= (hash3(Math.round(a * 30), 5, 5, o.seed ?? 3) + 0.5) * 0.06;
    });
    return [uvScale(g, 2, len / texMeters)];
  };
  // A front tasset of the coat on a thigh (leg frame), so it swings with the leg: front and outer side.
  P.coatTasset = o => {
    const s = o.side ?? 1, len = o.len ?? 0.34, g = KIT_GEO.Cylinder(0.098, 0.13, len, 8, 4, true, s > 0 ? -0.25 : -1.65, 1.9);
    g.translate(0, -len / 2 + 0.03, 0);
    deform(g, v => { const t = (0.03 - v.y) / len; if (t > 0.95) v.y -= (hash3(Math.round(v.x * 80), Math.round(v.z * 80), 7, o.seed ?? 5) + 0.5) * 0.05; });
    return [uvScale(g, 1.2, len / texMeters)];
  };
  // A layered pauldron (arm frame): a domed cap, three overlapping lames down the outside of the arm, rivets, a strap.
  P.layeredPauldron = o => {
    const s = o.side ?? 1, k = o.size ?? 1, out = [];
    const dome = KIT_GEO.Sphere(0.105 * k, 10, 5, 0, TAU, 0, Math.PI / 2);
    xf(dome, 0.028 * s * k, 0.03 * k, 0, 0, 0, -0.32 * s, 1.15, 0.72, 1.05); roughen(dome, 0.004, 31);
    out.push(uvScale(dome, 3, 1.5));
    for (let i = 0; i < 3; i++) {
      const r = (0.098 + i * 0.012) * k, y = (-0.005 - i * 0.045) * k, mid = s > 0 ? Math.PI / 2 : -Math.PI / 2, span = 2.3 - i * 0.15;
      const lame = KIT_GEO.Cylinder(r, r + 0.012 * k, 0.055 * k, 8, 1, true, mid - span / 2, span);
      xf(lame, 0.018 * s * k, y, 0, 0, 0, -0.12 * s);
      out.push(uvScale(lame, 2, 0.4));
      out.push(xf(KIT_GEO.Torus(r + 0.012 * k, 0.005 * k, 3, 8, span), 0.018 * s * k, y - 0.027 * k, 0, Math.PI / 2, 0, mid - span / 2 - Math.PI / 2 * 0));
      for (const a of [-0.7, 0.7]) out.push({ slot: o.rivet ?? o.slot, geo: xf(stud(0.007 * k), Math.sin(mid + a) * (r + 0.004) + 0.018 * s * k, y + 0.012 * k, Math.cos(mid + a) * (r + 0.004)) });
    }
    return out;
  };
  // A vambrace on the forearm (elbow frame): a tapered leather sleeve, two straps, a flared cuff at the wrist.
  P.vambrace = o => {
    const k = o.size ?? 1, sleeve = lathe(resample([[0.046, -0.29], [0.05, -0.27], [0.052, -0.2], [0.056, -0.1], [0.054, -0.06]], 0.02).map(([r, y]) => [r * k, y]), 10, 0.92);
    const cuff = lathe([[0.05 * k, -0.31], [0.06 * k, -0.29], [0.052 * k, -0.26]], 10, 0.9);
    const straps = [-0.12, -0.22].map(y => xf(KIT_GEO.Torus(0.057 * k, 0.006, 3, 10), 0, y, 0, Math.PI / 2, 0, 0, 1, 1, 0.92));
    return [uvScale(sleeve, 1.4, 0.8), uvScale(cuff, 1.4, 0.3), ...straps.map(geo => ({ slot: o.strap ?? o.slot, geo }))];
  };
  // A tall boot over the shin (knee frame): the shaft, its top folded down into a cuff, two buckled straps.
  P.tallBoot = o => {
    const k = o.size ?? 1, shaft = lathe(resample([[0.046, -0.45], [0.05, -0.38], [0.058, -0.24], [0.066, -0.14], [0.066, -0.1]], 0.02).map(([r, y]) => [r * k, y]), 10, 1);
    const cuff = lathe([[0.066 * k, -0.11], [0.078 * k, -0.105], [0.082 * k, -0.06], [0.074 * k, -0.045], [0.066 * k, -0.05]], 12, 1);
    deform(cuff, v => { v.y += hash3(Math.round(v.x * 200), Math.round(v.z * 200), 1, 9) * 0.008; });
    const straps = [-0.3, -0.39].map(y => xf(KIT_GEO.Torus((y < -0.35 ? 0.05 : 0.056) * k, 0.006, 3, 10), 0, y, 0, Math.PI / 2, 0, 0));
    const buckles = [-0.3, -0.39].map(y => xf(new THREE.BoxGeometry(0.018, 0.02, 0.008), (y < -0.35 ? 0.05 : 0.056) * k, y, 0.012));
    return [uvScale(shaft, 1.4, 1), uvScale(cuff, 1.6, 0.4), ...straps.map(geo => ({ slot: o.strap ?? o.slot, geo })), ...buckles.map(geo => ({ slot: o.metal ?? o.slot, geo }))];
  };
  // A deep cowl (head frame): falls in folds onto the shoulders, a soft peak over the brow, open at the face.
  P.cowl = (o, M) => {
    const r = M.proportions.headR * (o.size ?? 1.06), g = KIT_GEO.Sphere(r * 1.3, 14, 9, Math.PI / 2 + 0.85, TAU - 1.7, 0, 2.35);
    deform(g, v => {
      if (v.y < 0) { v.x *= 1 + (-v.y) * 1.2; v.z *= 1 + (-v.y) * 0.9; v.z -= (-v.y) * 0.25; }   // flares out over the shoulders
      if (v.y > r * 0.7) v.z += (v.y - r * 0.7) * 0.5;   // the peak leans forward
      const a = angle(v), f = Math.sin(a * 6) * 0.006 * Math.max(0, -v.y / r + 0.3); v.x += Math.sin(a) * f; v.z += Math.cos(a) * f;
    });
    xf(g, 0, r * 0.95, -0.005); roughen(g, 0.005, 23);
    return [uvScale(g, 2.2, 1.2)];
  };
  // A short shoulder mantle (chest frame): flares from the collar over the shoulders, open at the front, ragged hem.
  P.mantle = (o, M) => {
    const k = tw(M), prof = [[0.36 * k, 0.4], [0.335 * k, 0.47], [0.29 * k, 0.53], [0.21 * k, 0.585], [0.135 * k, 0.625]];
    const g = sector(resample(prof, 0.02), 18, 0.6, TAU - 1.2, oz(M) * 1.15);
    deform(g, v => {
      const a = angle(v), r = Math.hypot(v.x, v.z), f = 1 + Math.sin(a * 8 + 1) * 0.025 * Math.max(0, (0.5 - v.y) * 6); v.x *= f; v.z *= f;
      if (v.y < 0.42) v.y -= (hash3(Math.round(a * 40), 3, 3, o.seed ?? 8) + 0.5) * 0.05;
    });
    return [uvScale(g, 2.4, 0.8)];
  };
  // A thick scarf wound twice round the neck (neck frame), lumpy where it folds, a knot at the side.
  P.woundScarf = o => {
    const a = KIT_GEO.Torus(0.088, 0.03, 6, 12), b = KIT_GEO.Torus(0.094, 0.026, 6, 12);
    for (const g of [a, b]) deform(g, v => { const ang = Math.atan2(v.y, v.x), f = 1 + Math.sin(ang * 5) * 0.08; v.x *= f; v.y *= f; });
    xf(a, 0, 0.02, 0, Math.PI / 2, 0, 0.12, 1, 1, 0.9); xf(b, 0, 0.065, 0.004, Math.PI / 2 - 0.1, 0, -0.08, 1, 1, 0.88);
    const knot = xf(sphere(0.032, 8, 6), 0.075, 0.03, 0.05, 0, 0, 0, 1, 0.8, 1);
    return [uvScale(a, 4, 1), uvScale(b, 4, 1), knot];
  };
  // A round shield slung on the back (chest frame): radial planks, an iron rim with rivets, a flanged boss, two straps.
  P.plankShield = o => {
    const r = o.r ?? 0.24, out = [];
    const dish = lathe([[0, -0.022], [r * 0.95, -0.02], [r, -0.002], [r * 0.95, 0.018], [r * 0.32, 0.034], [0, 0.04]], 16);
    deform(dish, v => { const a = Math.atan2(v.z, v.x), plank = Math.pow(Math.abs(Math.cos(a * 4.5)), 40); if (v.y > 0) v.y -= plank * 0.004; });
    roughen(dish, 0.004, 41);
    out.push({ slot: o.face, geo: uvScale(dish, 2, 1) });
    out.push({ slot: o.metal, geo: xf(KIT_GEO.Torus(r - 0.004, 0.012, 4, 20), 0, 0.004, 0, Math.PI / 2, 0, 0) });
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; out.push({ slot: o.metal, geo: xf(stud(0.008), Math.cos(a) * (r - 0.02), 0.022, Math.sin(a) * (r - 0.02)) }); }
    out.push({ slot: o.metal, geo: lathe([[0, 0.03], [0.075, 0.032], [0.07, 0.04], [0.055, 0.075], [0.03, 0.095], [0, 0.1]], 10) });
    for (const d of [-0.09, 0.09]) out.push({ slot: o.strap ?? o.face, geo: xf(new THREE.BoxGeometry(0.03, 0.012, r * 1.9), d, 0.042, 0) });
    const place = x => { xf(x.geo, ...(o.at ?? [0, 0.3, -0.34]), ...(o.rot ?? [-Math.PI / 2, 0, 0.18])); return x; };
    return out.map(place);
  };
  // A bandolier strap across the body (chest frame) with a dagger sheathed on it.
  P.bandolier = (o, M) => {
    const k = tw(M), band = torsoStrap(M, 0.3, 0.17, 0.028, 0.011);
    const sheath = xf(lathe([[0.01, -0.2], [0.022, -0.16], [0.024, 0], [0.026, 0.02]], 8, 0.5), -0.16 * k, 0.2, 0.17, 0.2, 0, 0.7);
    const hilt = xf(tube(0.011, 0.011, 0.09, 6), -0.178 * k, 0.255, 0.182, 0.2, 0, 0.7);
    return [band, sheath, { slot: o.metal ?? o.slot, geo: hilt }];
  };

  // The wanderer's longsword: a bevelled blade with a ricasso, curled quillons, a wrapped grip and a wheel pommel.
  W.wandererLongsword = () => {
    const outline = shape([[0.12, -0.04], [0.2, -0.042], [1.0, -0.038], [1.12, -0.02], [1.2, 0], [1.12, 0.02], [1.0, 0.038], [0.2, 0.042], [0.12, 0.04]]);
    const blade = new THREE.ExtrudeGeometry(outline, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 });
    blade.translate(0, 0, -0.003); blade.rotateY(-Math.PI / 2); roughen(blade, 0.0015, 11);
    const fullerL = [-1, 1].map(sd => xf(new THREE.BoxGeometry(0.002, 0.012, 0.62), sd * 0.0075, 0, 0.55));
    const guardCurve = new THREE.CatmullRomCurve3([new V3(0, -0.17, 0.12), new V3(0, -0.15, 0.1), new V3(0, -0.06, 0.09), new V3(0, 0, 0.09), new V3(0, 0.06, 0.09), new V3(0, 0.15, 0.1), new V3(0, 0.17, 0.12)]);
    const guard = KIT_GEO.Tube(guardCurve, 16, 0.012, 5, false);
    const block = xf(new THREE.BoxGeometry(0.034, 0.05, 0.04), 0, 0, 0.09);
    const grip = uvScale(xf(KIT_GEO.Cylinder(0.019, 0.021, 0.21, 10), 0, 0, -0.02, Math.PI / 2, 0, 0), 1, 1);
    const wraps = [0, 1, 2, 3, 4].map(i => xf(new THREE.TorusGeometry(0.021, 0.004, 3, 10), 0, 0, -0.1 + i * 0.04, 0, 0, i * 0.3));
    const pommel = xf(lathe([[0, -0.03], [0.03, -0.025], [0.038, 0], [0.03, 0.025], [0, 0.03]], 14), 0, 0, -0.15, Math.PI / 2, 0, 0);
    return { blade: [blade, ...fullerL], grip: [grip, ...wraps], guard: [guard, block, pommel] };
  };

  // ---- organic limbs ------------------------------------------------------------------------------------------------------
  // A tube swept along a curve whose radius varies along it (rFn: t 0..1 -> m), rings `radial` round, `tubular` along.
  // ovalA squashes each ring across the curve's binormal (a flatter limb).
  function sweep(curve, rFn, tubular, radial, ovalA = 1) {
    tubular = Math.max(4, Math.round(tubular * KIT_GEO.get())); radial = Math.max(4, Math.round(radial * KIT_GEO.get()));
    const fr = curve.computeFrenetFrames(tubular, false), pos = [], nrm = [], uv = [], idx = [], p = new V3(), n = new V3();
    for (let i = 0; i <= tubular; i++) {
      const t = i / tubular, c = curve.getPointAt(t), r = rFn(t), N = fr.normals[i], B = fr.binormals[i];
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * TAU, ca = -Math.cos(a), sa = Math.sin(a);   // as three's TubeGeometry walks a ring (front faces outward)
        n.set(N.x * ca + B.x * sa * ovalA, N.y * ca + B.y * sa * ovalA, N.z * ca + B.z * sa * ovalA);
        p.copy(c).addScaledVector(n, r); n.normalize();
        pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z); uv.push(j / radial, t);
      }
    }
    for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  const bump = (t, at, w) => Math.exp(-(((t - at) / w) ** 2));
  // Grafted limbs (Godrick), remade: each entry of `arms` is [root, elbow, hand] in the bone's frame. One continuous
  // swept limb (a shoulder mass, biceps, a knobbed elbow, a corded forearm, a thin wrist), a lumpy socket with a stitched
  // graft seam where it was sewn on, and a hand: a broad palm, knuckles, four jointed fingers ending in hooked claws
  // (`hand` m long; without it, three short fingers).
  P.graftedArms = o => {
    const out = [], r = o.r ?? 0.05, H = o.hand ?? 0, up = new V3(0, 1, 0);
    o.arms.forEach(([root, elbow, hand], ai) => {
      const R = new V3(...root), E = new V3(...elbow), Hd = new V3(...hand);
      const mid1 = R.clone().lerp(E, 0.5).add(new V3(0, 0.03, 0)), mid2 = E.clone().lerp(Hd, 0.5);
      const curve = new THREE.CatmullRomCurve3([R, mid1, E, mid2, Hd], false, 'centripetal');
      const rFn = t => r * (1.25 - 0.6 * t + 0.28 * bump(t, 0.22, 0.12) + 0.22 * bump(t, 0.5, 0.05) + 0.16 * bump(t, 0.68, 0.1) - 0.12 * bump(t, 0.95, 0.06));
      out.push(roughen(sweep(curve, rFn, 22, 9, 0.85), r * 0.06, 17 + ai));
      out.push(roughen(xf(sphere(r * 1.55, 9, 7), R.x, R.y, R.z, 0, 0, 0, 1.1, 0.9, 1), r * 0.35, 13 + ai));   // the socket
      const dir0 = curve.getTangentAt(0.02);
      const seam = KIT_GEO.Torus(r * 1.35, r * 0.09, 4, 14); seam.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), dir0));
      out.push(roughen(seam.translate(R.x + dir0.x * r * 0.5, R.y + dir0.y * r * 0.5, R.z + dir0.z * r * 0.5), r * 0.08, 19 + ai));
      const dir = curve.getTangentAt(1), side = new V3().crossVectors(dir, up).normalize();
      if (side.lengthSq() < 0.1) side.set(1, 0, 0);
      const down = new V3().crossVectors(side, dir).normalize();
      if (!H) {
        for (let i = -1; i <= 1; i++) {
          const tip = Hd.clone().addScaledVector(dir, 0.12).addScaledVector(side, i * 0.04);
          out.push(sweep(new THREE.LineCurve3(Hd.clone(), tip), t => r * (0.35 - 0.23 * t), 4, 5));
        }
        return;
      }
      const palm = roughen(xf(sphere(H * 0.36, 9, 6), 0, 0, 0, 0, 0, 0, 1.25, 0.55, 1.05), H * 0.03, 23 + ai);
      palm.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), down)); palm.translate(...Hd.clone().addScaledVector(dir, H * 0.12).toArray());
      out.push(palm);
      for (let i = -1.5; i <= 1.5; i++) {
        const base = Hd.clone().addScaledVector(side, i * H * 0.2).addScaledVector(dir, H * 0.32);
        const k1 = base.clone().addScaledVector(dir, H * 0.34).addScaledVector(side, i * H * 0.06).addScaledVector(down, H * 0.06);
        const k2 = k1.clone().addScaledVector(dir, H * 0.26).addScaledVector(down, H * 0.2);
        const tip = k2.clone().addScaledVector(dir, H * 0.08).addScaledVector(down, H * 0.24).addScaledVector(dir, -H * 0.04);
        const fc = new THREE.CatmullRomCurve3([base, k1, k2, tip], false, 'centripetal');
        out.push(sweep(fc, t => r * (0.3 - 0.06 * t + 0.05 * bump(t, 0.36, 0.06) + 0.04 * bump(t, 0.68, 0.06)) * (t > 0.8 ? 1 - (t - 0.8) * 4.2 : 1), 12, 6));
        out.push(xf(new THREE.SphereGeometry(r * 0.33, 6, 4), base.x, base.y, base.z));   // the knuckle
      }
    });
    return out.map(geo => uvScale(geo, 1.5, 1));
  };

  // A sculpted bare torso (chest frame; replaces the body's torso: give the model `body.torso: null`): rounded trapezius
  // and shoulders, pectorals over a crease, the sternum, a grid of abdominals either side of the linea alba, a V-taper
  // through the lats, shoulder blades and a spine groove down the back. `bulk` (1) thickens the muscle.
  P.muscleTorso = (o, M) => {
    const k = tw(M), z = oz(M), m = o.bulk ?? 1;
    const prof = resample([[0.15, -0.06], [0.162, 0.02], [0.17, 0.08], [0.18, 0.16], [0.2, 0.24], [0.236, 0.32], [0.268, 0.4], [0.29, 0.46], [0.298, 0.5],
                           [0.29, 0.535], [0.265, 0.565], [0.225, 0.59], [0.17, 0.612], [0.115, 0.632], [0.085, 0.65]], 0.016);
    const g = lathe(prof.map(([r, y]) => [r * k, y]), 26, z);
    const G = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
    deform(g, v => {
      const r = Math.hypot(v.x, v.z / z) || 1e-6, x = v.x / k, y = v.y;
      let d = 0;
      if (v.z > 0) {   // the front
        d += 0.034 * m * (G(x, y, 0.1, 0.43, 0.075, 0.06) + G(x, y, -0.1, 0.43, 0.075, 0.06));   // pectorals
        d -= 0.012 * G(x, y, 0.1, 0.355, 0.08, 0.012) + 0.012 * G(x, y, -0.1, 0.355, 0.08, 0.012);   // the crease beneath
        d -= 0.009 * Math.exp(-((x / 0.014) ** 2)) * (y > 0.08 && y < 0.5 ? 1 : 0);   // sternum and linea alba
        for (const ay of [0.285, 0.215, 0.145]) for (const ax of [0.045, -0.045]) d += 0.011 * m * G(x, y, ax, ay, 0.032, 0.03);   // abdominals
        d += 0.008 * m * (G(x, y, 0.16, 0.24, 0.03, 0.08) + G(x, y, -0.16, 0.24, 0.03, 0.08));   // obliques
      } else {   // the back
        d -= 0.012 * Math.exp(-((x / 0.018) ** 2)) * (y > 0.05 ? 1 : 0);   // the spine groove
        d += 0.016 * m * (G(x, y, 0.11, 0.46, 0.06, 0.06) + G(x, y, -0.11, 0.46, 0.06, 0.06));   // shoulder blades
      }
      d += 0.018 * m * (G(Math.abs(x), y, 0.22, 0.38, 0.05, 0.1)) * (Math.abs(v.x) > Math.abs(v.z) ? 1 : 0.4);   // the lats' V
      const s = 1 + d / (r || 1); v.x *= s; v.z *= s;
    });
    g.computeVertexNormals();
    return [uvScale(g, 1.8, 1.2)];
  };

  // ---- the shared torso shell: every jerkin, coat and breastplate is laid over the same anatomy ------------------------
  // Sloped trapezius shoulders (no flat shelf), a fuller chest, a flatter back and a waist, `add` m out from the body.
  const SHELL = [[0.152, -0.06], [0.165, 0.02], [0.172, 0.08], [0.182, 0.16], [0.202, 0.24], [0.236, 0.32], [0.266, 0.4], [0.286, 0.46], [0.292, 0.5],
                 [0.282, 0.535], [0.255, 0.565], [0.215, 0.59], [0.165, 0.612], [0.115, 0.632], [0.085, 0.65]];
  const shellR = y => {
    for (let i = 0; i < SHELL.length - 1; i++) { const [r0, y0] = SHELL[i], [r1, y1] = SHELL[i + 1]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
    return y < SHELL[0][1] ? SHELL[0][0] : SHELL[SHELL.length - 1][0];
  };
  const shape3 = (v, k) => {   // chest forward, back flatter, a hint of shoulder blades
    if (v.z > 0 && v.y > 0.26 && v.y < 0.54) v.z *= 1 + 0.05 * Math.sin((v.y - 0.26) / 0.28 * Math.PI);
    if (v.z < 0) { v.z *= 0.95; if (v.y > 0.38 && v.y < 0.54 && Math.abs(v.x) / k > 0.05 && Math.abs(v.x) / k < 0.2) v.z *= 1.035; }
  };
  function shell(M, add, from = -0.06, to = 0.65, seg = 12, phi0 = 0, phiLen = TAU) {
    const k = tw(M), prof = resample(SHELL, 0.018).filter(([, y]) => y >= from - 1e-6 && y <= to + 1e-6).map(([r, y]) => [r * k + add, y]);
    const g = phiLen >= TAU ? lathe(prof, seg, oz(M)) : sector(prof, seg, phi0, phiLen, oz(M));
    deform(g, v => shape3(v, k));
    return g;
  }
  // A leather jerkin, remade on the shell: stitched seams down the front and sides and over the shoulders, a flared hem,
  // a standing collar band.
  P.jerkin = (o, M) => {
    const k = tw(M), g = shell(M, 0.02, -0.03, 0.6, 12);
    deform(g, v => {
      const a = angle(v), seam = Math.max(Math.exp(-((a / 0.05) ** 2)), Math.exp(-(((Math.abs(a) - Math.PI / 2) / 0.05) ** 2)));
      const m = 1 - 0.012 * seam; v.x *= m; v.z *= m;
      if (v.y < 0.03) { const f = 1 + (0.03 - v.y) * 0.9; v.x *= f; v.z *= f; }   // the hem flares
    });
    const collar = lathe([[0.122 * k, 0.6], [0.12 * k, 0.645], [0.128 * k, 0.665]], 12, 0.9);
    const hem = torsoStrapShell(M, 0.0, 0, 0.03, 0.009);
    return [uvScale(roughen(g, 0.003, 41), 1.8, 1.2), uvScale(collar, 2, 0.4), hem];
  };
  // A strap round the shell (like torsoStrap, on the new anatomy).
  function torsoStrapShell(M, y0, tilt, lift, r, arc = TAU, mid = 0) {
    const k = tw(M), z = oz(M), pts = [], n = 40, closed = arc >= TAU - 1e-6;
    for (let i = 0; i < (closed ? n : n + 1); i++) {
      const a = mid - arc / 2 + arc * i / n, y = y0 + Math.sin(a) * tilt, R = shellR(y) * k + lift, v = new V3(Math.sin(a) * R, y, Math.cos(a) * R * z);
      shape3(v, k); pts.push(v);
    }
    return KIT_GEO.Tube(new THREE.CatmullRomCurve3(pts, closed), 26, r, 4, closed);
  }
  // A plate cuirass, remade: a full breastplate with a sharp medial ridge and a flared, rolled lower edge, a backplate,
  // rolled rims round the neck, a plackart over the belly and three fauld lames below the waist, riveted.
  P.breastplate = (o, M) => {
    if (o.slim) return slimCuirass(o, M);
    const k = tw(M), z = oz(M), out = [];
    const front = shell(M, 0.04, 0.0, 0.57, 10, -1.25, 2.5), back = shell(M, 0.036, 0.02, 0.58, 10, Math.PI - 1.15, 2.3);
    deform(front, v => {
      v.z += 0.026 * Math.max(0, 1 - Math.abs(v.x) / (0.07 * k)) * Math.sin(Math.PI * clamp((v.y - 0.0) / 0.6, 0, 1));   // the ridge
      if (v.y < 0.06) { const f = 1 + (0.06 - v.y) * 1.2; v.x *= f; v.z *= f; }   // flared at the waist
    });
    out.push(uvScale(roughen(front, 0.003, 41), 2, 1.2), uvScale(back, 2, 1.2));
    out.push(torsoStrapShell(M, 0.57, 0, 0.044, 0.011, 2.4, 0), torsoStrapShell(M, 0.01, 0, 0.055, 0.012, 2.5, 0));   // rolled rims
    const plackart = shell(M, 0.05, 0.04, 0.22, 10, -0.75, 1.5);
    deform(plackart, v => { v.z += 0.018 * Math.max(0, 1 - Math.abs(v.x) / (0.06 * k)); });
    out.push(uvScale(plackart, 1.6, 0.6));
    for (let i = 0; i < 3; i++) {   // the fauld: lames hanging from the waist, each a little wider
      const y0 = -0.03 - i * 0.055, r = (0.205 + i * 0.012) * k + 0.04;
      out.push(uvScale(sector([[r, y0 - 0.07], [r - 0.006, y0]], 10, -1.5, 3.0, z * 1.05), 2, 0.4));
    }
    for (const sd of [-1, 1]) for (const y of [0.12, 0.3, 0.46]) {   // rivets down either side of the ridge
      const R = shellR(y) * k + 0.044, a = sd * 0.9, v = new V3(Math.sin(a) * R, y, Math.cos(a) * R * z); shape3(v, k);
      out.push({ slot: o.rivet ?? o.slot, geo: xf(stud(0.008), v.x, v.y, v.z) });
    }
    return out;
  };

  // ---- the shared parts, remade (same options and placement as the kit's originals, so every model gains) ---------------
  const n = k => Math.max(2, Math.round(k * KIT_GEO.get()));   // a segment count that grows with the detail
  // A hanging strip of cloth: folds across it, billowing toward a torn, notched hem, narrowing as it falls.
  P.clothStrip = o => {
    const g = new THREE.PlaneGeometry(o.w, o.len, n(3), n(6)), seed = o.seed ?? 1;
    deform(g, v => {
      const t = (o.len / 2 - v.y) / o.len, u = v.x / o.w;
      v.x *= 1 - 0.32 * t;
      v.z += Math.sin(u * Math.PI * 3 + seed) * 0.012 * (0.3 + t) + t * t * 0.06;
      if (t > 0.86) v.y += (hash3(Math.round(u * 9), 1, 1, seed) * 0.12 - 0.03) * (t - 0.86) / 0.14;
      v.y -= o.len / 2;
    });
    return [uvScale(xf(g, o.dx ?? 0, 0, o.dz ?? 0, 0, o.turn ?? 0, 0), 1, 1)];
  };
  // One hanging section of a cape: as before (widths, length, bow round the shoulders, ragged hem), now with folds.
  P.capeSegment = o => {
    const g = new THREE.PlaneGeometry(1, 1, n(8), n(4)), seed = o.seed ?? 2;
    deform(g, v => {
      const t = 0.5 - v.y, w = o.w0 + (o.w1 - o.w0) * t, u = v.x;
      v.x *= w; v.z = (v.x * v.x) * (o.bow ?? 1.4) + Math.sin(u * 13 + seed) * 0.014 * (0.4 + t) ; v.y = -t * o.len;
      if (o.ragged && t > 0.9) v.y -= (hash3(Math.round(v.x * 60), 2, 2, o.seed ?? 1) + 0.5) * 0.08 * (t - 0.9) * 10;
    });
    return [o.ragged ? g : uvScale(g, o.w0 / texMeters, o.len / texMeters)];
  };
  // Bandages: one strip wound in a spiral down the limb (from..to m below the bone), lumpy, its end left loose.
  P.wraps = o => {
    const turns = (o.count ?? 4) * 1.15, segs = n(Math.round(turns * 14)), hw = (o.to - o.from) / turns * 0.62, pos = [], nrm = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, a = t * turns * TAU, r = o.radius * (1.15 - 0.15 * t) * (1 + 0.04 * Math.sin(a * 2.3 + (o.seed ?? 0))), y = -(o.from + (o.to - o.from) * t);
      const c = Math.cos(a), s = Math.sin(a), tilt = (o.to - o.from) / turns * 0.35;
      pos.push(c * r, y + hw + tilt * 0.5, s * r, c * r, y - hw + tilt * 0.5, s * r); nrm.push(c, 0, s, c, 0, s); uv.push(t * turns, 1, t * turns, 0);
      if (i < segs) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }   // front faces outward
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return [roughen(g, o.radius * 0.04, 61)];
  };
  // Plate bands down a limb: lames with rolled lower edges, each overlapping the next, a rivet either side; a fan cop.
  P.plateBands = o => {
    const cnt = o.count ?? 3, step = (o.to - o.from) / cnt, out = [];
    for (let i = 0; i < cnt; i++) {
      const r = o.radius * (1 + (o.flare ?? 0) * i / Math.max(1, cnt - 1)), top = -(o.from + step * i) + step * 0.04;
      out.push(uvScale(lathe([[r * 0.99, top], [r * 1.03, top - step * 0.7], [r * 1.08, top - step * 0.98], [r * 1.05, top - step * 1.08]], 9), 1, 0.4));
      for (const sd of [-1, 1]) out.push(xf(stud(r * 0.09), sd * r * 1.05, top - step * 0.5, 0));
    }
    if (o.cop) {
      const c = o.cop, cup = KIT_GEO.Sphere(c, 10, 5, 0, TAU, 0, Math.PI / 2); xf(cup, 0, 0, 0.02, Math.PI / 2, 0, 0, 1, 0.75, 1.05);
      const wing = lathe([[c * 1.5, -0.004], [c * 1.25, 0.006], [c * 0.9, 0.008]], 10); xf(wing, 0, 0, 0.012, Math.PI / 2, 0, 0, 1, 1, 0.6);
      out.push(roughen(cup, c * 0.05, 71), wing, xf(stud(c * 0.18), 0, 0, 0.02 + c * 0.78));
    }
    return out;
  };
  // A dented shoulder piece (was a single dome): a domed cap over two overlapping lames, a rolled rim, three rivets.
  P.pauldron = o => {
    const s = o.size ?? 1, sd = o.side ?? 1, out = [], r = 0.115 * s;
    const dome = KIT_GEO.Sphere(r, 10, 5, 0, TAU, 0, Math.PI / 2); xf(dome, 0.035 * sd, 0.035, 0, 0, 0, -0.38 * sd, 1.1, 0.7, 1.0); roughen(dome, 0.01 * s, 5);
    out.push(uvScale(dome, 3, 1.5));
    const mid = sd > 0 ? Math.PI / 2 : -Math.PI / 2;
    for (let i = 0; i < 2; i++) {
      const rr = r * (0.92 + i * 0.1), span = 2.2 - i * 0.2;
      out.push(uvScale(xf(KIT_GEO.Cylinder(rr, rr + 0.012 * s, 0.05 * s, 8, 1, true, mid - span / 2, span), 0.03 * sd, -0.01 - i * 0.042 * s, 0, 0, 0, -0.14 * sd), 2, 0.4));
    }
    out.push(xf(KIT_GEO.Torus(r * 1.02, 0.007 * s, 3, 10, 2.4), 0.035 * sd, 0.012, 0, Math.PI / 2, 0, mid - 1.2));
    for (const a of [-0.6, 0, 0.6]) out.push(xf(stud(0.008 * s), 0.035 * sd + Math.sin(mid + a) * r * 0.95, 0.04, Math.cos(mid + a) * r * 0.9));
    return out;
  };
  // A belt: a flat strap following the hips, a square buckle and its tongue at the front, a rivet each side.
  P.belt = () => {
    const pts = [], R = 0.188, z = 0.74;
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; pts.push(new V3(Math.sin(a) * R, 0.045, Math.cos(a) * R * z)); }
    const strap = sweep(new THREE.CatmullRomCurve3(pts, true), () => 0.02, 30, 4, 0.35);
    const buckle = xf(KIT_GEO.Torus(0.024, 0.005, 3, 4), 0, 0.045, R * z + 0.008, 0, 0, Math.PI / 4, 1, 1, 1);
    const tongue = xf(new THREE.BoxGeometry(0.004, 0.034, 0.004), 0, 0.045, R * z + 0.012);
    return [uvScale(strap, 6, 1), buckle, tongue, ...[-1, 1].map(sd => xf(stud(0.006), sd * R * 0.7, 0.045, R * z * 0.72))];
  };
  // A boot shaft up the shin with a turned-down cuff (knee frame), shaped to the calf, a strap at the ankle.
  P.boot = () => {
    const shaft = lathe(resample([[0.05, -0.45], [0.054, -0.4], [0.06, -0.32], [0.062, -0.24]], 0.02), 10);
    const cuff = lathe([[0.064, -0.26], [0.078, -0.235], [0.084, -0.19], [0.078, -0.17], [0.066, -0.172]], 10); roughen(cuff, 0.006, 84);
    const strap = xf(KIT_GEO.Torus(0.055, 0.006, 3, 10), 0, -0.4, 0, Math.PI / 2, 0, 0);
    return [uvScale(shaft, 1.4, 1), uvScale(cuff, 2, 0.5), strap];
  };
  // A loose cloth sleeve round the upper arm: flared, folded, torn at the cuff.
  P.sleeve = o => {
    const L = o.len ?? 0.36, r0 = o.r0 ?? 0.09, r1 = o.r1 ?? 0.13;
    const g = lathe(resample([[r0, o.y0 ?? 0.02], [r0 * 1.04, -L * 0.3], [(r0 + r1) / 2, -L * 0.65], [r1, -L]], 0.03), o.seg ?? 12);
    deform(g, v => {
      const a = angle(v), t = clamp(-v.y / L, 0, 1), f = 1 + Math.sin(a * 6 + (o.seed ?? 2)) * 0.05 * t; v.x *= f; v.z *= f;
      if (v.y < -L * 0.8) v.y -= (hash3(Math.round(v.x * 70), Math.round(v.z * 70), 5, o.seed ?? 2) + 0.5) * 0.09;
    });
    return [uvScale(g, 2, 1.5)];
  };
  // Fingers: three long curved bony fingers out of a hand (forearm frame), jointed and tapering to a point.
  P.fingers = o => {
    const out = [], len = o.len ?? 0.14, r = o.r ?? 0.012, at = o.at ?? 0.34;
    for (let i = -1; i <= 1; i++) {
      const x = i * (o.spread ?? 0.03), base = new V3(x, -at, 0.012), a = new V3(x * 1.2, -at - len * 0.45, 0.03), b = new V3(x * 1.3, -at - len * 0.8, 0.05), tip = new V3(x * 1.35, -at - len, 0.085);
      out.push(sweep(new THREE.CatmullRomCurve3([base, a, b, tip]), t => r * (1 - 0.8 * t) * (1 + 0.25 * bump(t, 0.45, 0.06) + 0.2 * bump(t, 0.8, 0.05)), 10, 5));
    }
    return out;
  };
  // A rag hood pulled low, as before, smoother and falling in folds.
  P.hood = o => {
    const g = KIT_GEO.Sphere(0.158 * (o.size ?? 1), 16, 10, Math.PI / 2 + 0.75 - (o.close ?? 0), TAU - 1.5 + 2 * (o.close ?? 0), 0, 2.25), tail = o.tail ?? 1;
    deform(g, v => {
      if (v.z < 0 && v.y < 0.08) { v.z -= (0.08 - v.y) * 0.9 * tail; v.y -= (-v.z) * 0.15 * tail; }
      if (v.y > 0.1) v.z += (v.y - 0.1) * 0.35;
      const a = angle(v), f = 1 + Math.sin(a * 7) * 0.035 * Math.max(0, 0.06 - v.y) * 8; v.x *= f; v.z *= f;
    });
    xf(g, 0, 0.115, 0.0, 0.2, 0, 0, 1.0, 1.05, 1.05); roughen(g, 0.008, 21);
    return [uvScale(g, 2, 1)];
  };
  // A ragged tunic round the waist: fuller, folded, its hem torn in long uneven tongues.
  P.tunic = () => {
    const g = lathe(resample([[0.19, -0.22], [0.2, -0.12], [0.195, -0.02], [0.18, 0.07]], 0.025), 14, 0.7);
    deform(g, v => {
      const a = angle(v), t = clamp(-v.y / 0.22, 0, 1), f = 1 + Math.sin(a * 8) * 0.04 * t; v.x *= f; v.z *= f;
      if (v.y < -0.06) v.y -= (hash3(Math.round(a * 12), 3, 3, 5) + 0.5) * 0.16 * t;
    });
    return [uvScale(g, 2, 1.2)];
  };
  // A round knee cop with a fan-shaped wing (knee frame).
  P.kneeCop = o => {
    const r = o.r ?? 0.068, cup = KIT_GEO.Sphere(r, 10, 5, 0, TAU, 0, Math.PI / 2);
    xf(cup, 0, -0.01, 0.045, Math.PI / 2, 0, 0, 1, 0.7, 1.15); roughen(cup, 0.004, 83);
    const wing = lathe([[r * 1.45, -0.004], [r * 1.2, 0.008], [r * 0.8, 0.01]], 12); xf(wing, 0, -0.01, 0.04, Math.PI / 2, 0, 0, 1, 1, 0.55);
    return [uvScale(cup, 2, 1), wing, xf(stud(r * 0.16), 0, -0.01, 0.045 + r * 0.8)];
  };
  // The great helm, remade: a barrel with a raised brow band, a dark eye slit (the eyes glow through it), breaths
  // pierced down the right cheek, rivets round the crown; optional crest fin and nasal as before.
  P.greatHelm = o => {
    const s = o.size ?? 1, top = o.flat ? [[0.15, 0.13], [0.152, 0.18], [0.12, 0.188], [0, 0.19]] : [[0.142, 0.2], [0.11, 0.24], [0.06, 0.258], [0, 0.262]];
    const g = lathe(resample([[0.12, -0.03], [0.142, 0.02], [0.15, 0.06], [0.151, 0.12], ...top].map(([r, y]) => [r * s, y * s]), 0.02 * s), 14);
    deform(g, v => { if (v.z > 0.04 * s) v.z += (0.15 * s - Math.min(0.15 * s, Math.abs(v.x))) * 0.12; });   // a slight prow
    roughen(g, 0.004 * s, 31);
    const out = [uvScale(g, 3, 1)];
    out.push(uvScale(xf(KIT_GEO.Torus(0.155 * s, 0.011 * s, 4, 12, Math.PI * 1.1), 0, 0.125 * s, 0, Math.PI / 2, 0, -0.05 * Math.PI), 4, 1));   // brow band
    out.push(xf(KIT_GEO.Torus(0.153 * s, 0.009 * s, 4, 12, Math.PI * 1.1), 0, 0.085 * s, 0, Math.PI / 2, 0, -0.05 * Math.PI));   // cheek band
    for (let i = 0; i < 5; i++) out.push(xf(new THREE.BoxGeometry(0.006 * s, 0.022 * s, 0.01 * s), -0.06 * s - (i % 2) * 0.02 * s, 0.05 * s - Math.floor(i / 2) * 0.03 * s, 0.148 * s, 0, -0.35, 0));   // breaths
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; out.push(xf(stud(0.006 * s), Math.sin(a) * 0.152 * s, 0.165 * s, Math.cos(a) * 0.152 * s)); }
    if (o.crest) {
      const fin = plate([[-0.14, 0], [0.14, 0], [0.1, o.crest * 0.55], [-0.02, o.crest], [-0.12, o.crest * 0.6]], 0.02, 0.006);
      fin.rotateY(-Math.PI / 2); xf(fin, 0.01, 0.235 * s, 0.0); out.push(fin);
    }
    if (o.nose) out.push(xf(plate([[-0.02, 0], [0.02, 0], [0.025, -0.11], [-0.025, -0.11]], 0.012, 0.004), 0, 0.12 * s, 0.15 * s));
    return out;
  };

  // ---- bones (the Giant Skeleton, remade) -----------------------------------------------------------------------------
  // A long bone hanging from its joint (len m, shaft radius r): a waisted shaft between flared ends, a rounded head at
  // the top, two condyles at the foot. `pair`: two thinner bones side by side (radius and ulna, tibia and fibula).
  P.longBone = o => {
    const len = o.len, r = o.r, out = [], shaft = (x, rr) => sweep(new THREE.LineCurve3(new V3(x, 0, 0), new V3(x * 0.8, -len, 0.004)),
      t => rr * (0.55 + 0.12 * t + 0.85 * bump(t, 0.0, 0.11) + 0.8 * bump(t, 1.0, 0.1)), 14, 8);
    if (o.pair) { out.push(roughen(shaft(r * 0.55, r * 0.72), r * 0.04, 3), roughen(shaft(-r * 0.6, r * 0.55), r * 0.04, 4)); }
    else out.push(roughen(shaft(0, r), r * 0.05, 5));
    if (!o.pair) out.push(roughen(xf(sphere(r * 1.18, 10, 8), 0, r * 0.15, 0), r * 0.06, 6));   // the head of the bone
    for (const sd of [-1, 1]) out.push(roughen(xf(sphere(r * 0.72, 9, 7), sd * r * 0.62, -len, 0.01, 0, 0, 0, 1, 0.85, 1.05), r * 0.05, 7 + sd));   // condyles
    return out.map(g => uvScale(g, 1, 2));
  };
  // A bony hand at the end of the forearm (elbow frame, `at` m down): a knot of wrist bones, four metacarpals fanning to
  // the knuckles, fingers in three joints curling under, a thumb.
  P.boneHand = o => {
    const s = o.size ?? 1, y0 = -(o.at ?? 0.34), out = [roughen(xf(sphere(0.045 * s, 9, 7), 0, y0, 0.01, 0, 0, 0, 1.2, 0.8, 1), 0.006 * s, 9)];
    for (let i = -1.5; i <= 1.5; i++) {
      const w = new V3(i * 0.012 * s, y0 - 0.02 * s, 0.012 * s), k = new V3(i * 0.03 * s, y0 - 0.11 * s, 0.02 * s);
      const f1 = k.clone().add(new V3(i * 0.006 * s, -0.06 * s, 0.022 * s)), f2 = f1.clone().add(new V3(0, -0.04 * s, 0.04 * s)), tip = f2.clone().add(new V3(0, -0.005 * s, 0.035 * s));
      out.push(sweep(new THREE.LineCurve3(w, k), t => 0.0085 * s * (1 + 0.6 * bump(t, 1, 0.15)), 6, 5));
      out.push(sweep(new THREE.CatmullRomCurve3([k, f1, f2, tip], false, 'centripetal'), t => 0.008 * s * (1 - 0.5 * t + 0.4 * bump(t, 0.33, 0.07) + 0.3 * bump(t, 0.66, 0.07)), 12, 5));
    }
    const th0 = new V3(0.025 * s, y0 - 0.03 * s, 0.02 * s);
    out.push(sweep(new THREE.CatmullRomCurve3([th0, th0.clone().add(new V3(0.03 * s, -0.035 * s, 0.03 * s)), th0.clone().add(new V3(0.03 * s, -0.07 * s, 0.07 * s))]), t => 0.009 * s * (1 - 0.5 * t), 10, 5));
    return out;
  };
  // A bony foot under the shin (knee frame): heel and ankle bones, metatarsals running forward to splayed toes.
  P.boneFoot = o => {
    const s = o.size ?? 1, y0 = -LEG_SEG, out = [roughen(xf(sphere(0.05 * s, 9, 7), 0, y0 - 0.01, -0.02, 0, 0, 0, 0.9, 0.8, 1.3), 0.006 * s, 12)];
    for (let i = -1.5; i <= 1.5; i++) {
      const a = new V3(i * 0.014 * s, y0 - 0.02 * s, 0.03 * s), b = new V3(i * 0.026 * s, y0 - 0.06 * s, 0.14 * s), c = b.clone().add(new V3(i * 0.006 * s, -0.01 * s, 0.06 * s));
      out.push(sweep(new THREE.CatmullRomCurve3([a, b, c]), t => 0.011 * s * (1 - 0.45 * t + 0.4 * bump(t, 0.6, 0.08)), 10, 5));
    }
    return out;
  };
  // A pelvis (spin frame): two flaring ilium wings, the sacrum behind, the pubic arch in front.
  P.bonePelvis = o => {
    const s = o.size ?? 1, out = [];
    for (const sd of [-1, 1]) {
      const wing = KIT_GEO.Sphere(0.13 * s, 12, 8, sd > 0 ? -0.4 : Math.PI - 1.4, 1.8, 0.6, 1.3);
      out.push(roughen(xf(wing, sd * 0.07 * s, 0.02, -0.01, 0, 0, sd * 0.25, 1, 1.1, 0.75), 0.006 * s, 13 + sd));
    }
    out.push(roughen(xf(KIT_GEO.Cone(0.07 * s, 0.2 * s, 8), 0, -0.02, -0.09 * s, Math.PI, 0, 0, 1, 1, 0.6), 0.006, 15));   // the sacrum
    out.push(xf(KIT_GEO.Torus(0.085 * s, 0.018 * s, 6, 12, Math.PI), 0, -0.07, 0.04 * s, 0, 0, Math.PI));   // the pubic arch
    return out;
  };
  // Neck vertebrae (neck frame): a column of knobs, each with a spine behind.
  P.boneNeck = o => {
    const s = o.size ?? 1, out = [];
    for (let i = 0; i < (o.count ?? 5); i++) {
      const y = i * 0.04 * s;
      out.push(roughen(xf(KIT_GEO.Cylinder(0.03 * s, 0.032 * s, 0.026 * s, 8), 0, y, 0), 0.003 * s, 20 + i), xf(KIT_GEO.Cone(0.012 * s, 0.05 * s, 5), 0, y, -0.04 * s, -Math.PI / 2 - 0.3, 0, 0));
    }
    return out;
  };

  // A fitted cuirass (`slim: true`, Malenia): close to the body, a shaped bust, a waist pinched like a corset, a light
  // ridge, gilt rims at the neck and waist, a short flared lip over the hips.
  function slimCuirass(o, M) {
    const k = tw(M), z = oz(M), G = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
    const front = shell(M, 0.016, 0.0, 0.57, 12, -1.3, 2.6), back = shell(M, 0.014, 0.02, 0.58, 12, Math.PI - 1.2, 2.4);
    for (const g of [front, back]) deform(g, v => {
      const x = v.x / k, y = v.y;
      if (y > 0.06 && y < 0.3) { const w = 1 - 0.1 * Math.sin((y - 0.06) / 0.24 * Math.PI); v.x *= w; v.z *= w; }   // the waist
      if (v.z > 0) {
        v.z += 0.024 * (G(x, y, 0.085, 0.42, 0.06, 0.06) + G(x, y, -0.085, 0.42, 0.06, 0.06));
        v.z += 0.008 * Math.max(0, 1 - Math.abs(x) / 0.03) * (y < 0.36 ? 1 : 0);   // a light ridge below the bust
      }
      if (y < 0.05) { const f = 1 + (0.05 - y) * 1.6; v.x *= f; v.z *= f; }   // the lip over the hips
    });
    return [uvScale(roughen(front, 0.002, 41), 2, 1.2), uvScale(back, 2, 1.2),
            { slot: o.trim ?? o.slot, geo: torsoStrapShell(M, 0.56, 0, 0.02, 0.008, 2.5, 0) }, { slot: o.trim ?? o.slot, geo: torsoStrapShell(M, 0.02, 0, 0.03, 0.009, 2.6, 0) }];
  }
  // A great round pauldron, remade: a domed cap with a raised medial ridge and a rolled rim, three overlapping lames
  // down the outside of the arm, rivets on each.
  P.roundPauldron = o => {
    const s = o.size ?? 1, sd = o.side ?? 1, out = [], mid = sd > 0 ? Math.PI / 2 : -Math.PI / 2;
    const dome = KIT_GEO.Sphere(0.12 * s, 12, 6, 0, TAU, 0, Math.PI * 0.58);
    deform(dome, v => { const a = Math.atan2(v.x, v.z); if (v.y > 0) v.y += 0.012 * s * Math.exp(-(((a - mid) / 0.25) ** 2)); });
    xf(dome, 0.015 * sd * s, -0.005 * s, 0, 0, 0, -0.42 * sd, 1.05, 1.0, 1.1); out.push(uvScale(roughen(dome, 0.004, 5), 3, 1.5));
    out.push(xf(KIT_GEO.Torus(0.12 * s * 1.06, 0.008 * s, 3, 12, 2.8), 0.015 * sd * s, -0.04 * s, 0, Math.PI / 2, 0, mid - 1.4));
    for (let i = 0; i < 3; i++) {
      const r = 0.1 * s * (1 - i * 0.06), g = KIT_GEO.Cylinder(r, r * 1.07, 0.05 * s, 9, 1, true, mid - 1.25, 2.5);
      out.push(uvScale(xf(g, 0.03 * sd * s, (-0.06 - i * 0.04) * s, 0, 0, 0, -0.18 * sd), 2, 0.5));
      for (const a of [-0.8, 0.8]) out.push(xf(stud(0.007 * s), 0.03 * sd * s + Math.sin(mid + a) * r * 1.02, (-0.045 - i * 0.04) * s, Math.cos(mid + a) * r * 1.02));
    }
    return out;
  };

  // Margit's tail, remade: a thick matted tail swept round from the spine and up his side, tapering to a tip, wrapped
  // in clumps of fur that lie back along it all the way round.
  P.furTail = o => {
    const s = o.size ?? 1, sd = o.side ?? 1, V = (x, y, z) => new V3(x * s * sd, y * s, z * s);
    const curve = new THREE.CatmullRomCurve3([V(0, 0, -0.05), V(0.1, -0.2, -0.32), V(0.38, -0.32, -0.5), V(0.62, -0.1, -0.5), V(0.7, 0.25, -0.38), V(0.62, 0.55, -0.25), V(0.48, 0.72, -0.18)]);
    const R = t => 0.125 * s * (1 - 0.7 * t) * (1 + 0.08 * Math.sin(t * 40));
    const out = [uvScale(roughen(sweep(curve, R, 26, 9), 0.018 * s, 53), 2, 4)];
    for (let i = 0; i < 46; i++) {
      const t = 0.04 + 0.92 * (i / 45), p = curve.getPointAt(t), tan = curve.getTangentAt(t), a = i * 2.4;
      const side = new V3().crossVectors(tan, new V3(0, 1, 0)).normalize(), up = new V3().crossVectors(side, tan).normalize();
      const n = side.multiplyScalar(Math.cos(a)).add(up.multiplyScalar(Math.sin(a))), r = R(t);
      const len = (0.1 + 0.08 * hash3(i, 1, 2, 3)) * s * (1 - 0.4 * t), clump = new THREE.ConeGeometry(0.035 * s * (1 - 0.5 * t), len, 5);
      clump.translate(0, len / 2, 0);
      const dir = n.clone().multiplyScalar(0.55).addScaledVector(tan, -0.85).normalize();   // lying back along the tail
      clump.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir));
      out.push(clump.translate(p.x + n.x * r * 0.8, p.y + n.y * r * 0.8, p.z + n.z * r * 0.8));
    }
    return out;
  };

  Object.assign(KIT.parts, P);
  Object.assign(KIT.weapons, W);
}
