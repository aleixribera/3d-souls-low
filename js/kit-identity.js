'use strict';
// Opt-in character fittings. Geometry is baked into the existing indexed, skinned
// material batches; these parts allocate nothing during animation or combat.
{
  const { xf, lathe, plate, deform, uvScale } = KIT.helpers;
  const V3 = THREE.Vector3, TAU = Math.PI * 2;
  const P = {};
  const trim = (slot, geo) => ({ slot, geo });
  const rivet = (x, y, z, r = 0.008) => xf(new THREE.SphereGeometry(r, 6, 4), x, y, z);
  const cord = (points, r = 0.008, segments = 12) => new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map(p => new V3(...p))), segments, r, 4, false);
  const ring = (r, y, depth = 1, thickness = 0.009) =>
    xf(KIT_GEO.Torus(r, thickness, 4, 16), 0, y, 0, Math.PI / 2, 0, 0, 1, 1, depth);

  // A fitted cuirass with a real neck/shoulder slope, waist and overlapping lower
  // plate. The flutes are cast into the surface, not a cloud of separate ornaments.
  P.castCuirass = (o, M) => {
    const k = M.proportions.torsoW / 0.24, depth = M.proportions.torsoD / M.proportions.torsoW;
    const profile = [[0.19, -0.035], [0.185, 0.04], [0.19, 0.12], [0.215, 0.23],
      [0.26, 0.35], [0.29, 0.46], [0.275, 0.51], [0.23, 0.555], [0.15, 0.6], [0.11, 0.63]];
    const body = lathe(profile.map(([r, y]) => [r * k, y]), 24, depth);
    deform(body, v => {
      const a = Math.atan2(v.x, v.z / depth), f = 1 + (o.flute ?? 0.035) * Math.cos(a * 12);
      v.x *= f; v.z *= f;
      if (v.z > 0) v.z += 0.025 * Math.max(0, 1 - Math.abs(v.x) / (0.08 * k));
    });
    const out = [uvScale(body, 1.3, 1.2), trim(o.trim, ring(0.11 * k, 0.63, depth)),
      trim(o.trim, ring(0.193 * k, -0.035, depth))];
    // Raised V-shaped borders follow the curved breast and leave a quiet centre.
    for (const s of [-1, 1]) {
      out.push(trim(o.trim, cord([[s * 0.23 * k, 0.52, 0.13 * k], [s * 0.18 * k, 0.4, 0.18 * k],
        [s * 0.09 * k, 0.31, 0.19 * k], [0, 0.27, 0.18 * k]], 0.008)));
      for (const y of [0.13, 0.23, 0.34]) out.push(trim(o.trim, rivet(s * 0.12 * k, y, 0.16 * k)));
    }
    const belly = plate([[-0.13 * k, 0.08], [0, 0.035], [0.13 * k, 0.08], [0.15 * k, 0.19], [0, 0.245], [-0.15 * k, 0.19]], 0.012, 0.004);
    deform(belly, v => { v.z += 0.145 * k - Math.abs(v.x) * 0.18; });
    out.push(belly);
    return out;
  };

  // The bellkeeper wears a cast bell with a recessed barred opening. The face is
  // dark inside; small eyes belong behind that opening rather than on its surface.
  P.carillonHelm = o => {
    const s = o.size ?? 1, out = [];
    const crown = lathe([[0.18, 0.13], [0.16, 0.23], [0.115, 0.32], [0.065, 0.37], [0, 0.38]], 20);
    const skirt = KIT_GEO.Lathe([[0.235, -0.06], [0.21, -0.02], [0.182, 0.12], [0.18, 0.14]].map(p => new THREE.Vector2(...p)), 20, 0.55, TAU - 1.1);
    out.push(crown, skirt, trim(o.trim, ring(0.181, 0.135)), trim(o.trim, ring(0.235, -0.06)));
    out.push(trim(o.dark, xf(new THREE.BoxGeometry(0.19, 0.13, 0.014), 0, 0.045, 0.126)));
    for (const x of [-0.078, -0.039, 0, 0.039, 0.078]) out.push(trim(o.trim,
      xf(new THREE.BoxGeometry(0.012, 0.145, 0.018), x, 0.04, 0.173 - Math.abs(x) * 0.2)));
    // Crown suspension loop and four casting ribs.
    out.push(trim(o.trim, xf(KIT_GEO.Torus(0.042, 0.012, 5, 12), 0, 0.415, 0)));
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      out.push(trim(o.trim, cord([[Math.sin(a) * 0.165, 0.22, Math.cos(a) * 0.165],
        [Math.sin(a) * 0.115, 0.32, Math.cos(a) * 0.115], [Math.sin(a) * 0.05, 0.375, Math.cos(a) * 0.05]], 0.009)));
    }
    for (const g of out) (g.geo ?? g).scale(s, s, s);
    return out;
  };
  P.carillonSkirt = o => {
    const g = lathe([[0.35, -0.46], [0.32, -0.42], [0.275, -0.29], [0.225, -0.1], [0.21, 0.015]], 24, 0.78);
    deform(g, v => { const a = Math.atan2(v.x, v.z / 0.78), f = 1 + 0.035 * Math.cos(a * 12); v.x *= f; v.z *= f; });
    return [uvScale(g, 1.7, 0.9), trim(o.trim, ring(0.35, -0.46, 0.78, 0.015)),
      trim(o.trim, ring(0.324, -0.415, 0.78)), trim(o.trim, ring(0.216, 0.015, 0.78))];
  };
  // Shackles read as hardware: two thick bands, a hinge, a fastening block and a
  // hanging ring. Used at the king's wrists and the bellkeeper's ankles.
  P.manacle = o => {
    const r = o.r ?? 0.075, y = -(o.at ?? 0.22);
    return [lathe([[r, y - 0.045], [r + 0.012, y - 0.04], [r + 0.012, y + 0.04], [r, y + 0.045]], 12),
      trim(o.trim, xf(new THREE.BoxGeometry(0.04, 0.055, 0.025), 0, y, r + 0.014)),
      trim(o.trim, xf(KIT_GEO.Torus(0.03, 0.009, 4, 10), 0, y - 0.07, r + 0.02))];
  };
  P.gaolerCrown = o => {
    const out = [], r = 0.165;
    out.push(ring(r, 0.265, 0.85, 0.016), ring(r, 0.3, 0.85, 0.009));
    for (let i = 0; i < 7; i++) {
      const a = i * TAU / 7, x = Math.sin(a) * r, z = Math.cos(a) * r * 0.85;
      const tine = plate([[-0.025, 0], [-0.019, 0.075], [0, i % 2 ? 0.12 : 0.15], [0.019, 0.075], [0.025, 0]], 0.012, 0.004);
      out.push(xf(tine, x, 0.29, z, 0, a, 0));
      out.push(trim(o.iron, xf(KIT_GEO.Torus(0.026, 0.007, 4, 8), x, 0.275, z, 0, a, 0, 0.8, 1.2, 1)));
    }
    return out;
  };
  // A heavy lock at the breast, with a keyhole made of dark inset geometry.
  P.oathLock = o => [
    xf(plate([[-0.048, -0.05], [0.048, -0.05], [0.055, 0.035], [0, 0.065], [-0.055, 0.035]], 0.018, 0.005), 0, 0.37, o.z ?? 0.235),
    trim(o.dark, xf(new THREE.SphereGeometry(0.012, 8, 4), 0, 0.382, (o.z ?? 0.235) + 0.024, 0, 0, 0, 1, 1, 0.25)),
    trim(o.dark, xf(new THREE.BoxGeometry(0.011, 0.024, 0.004), 0, 0.363, (o.z ?? 0.235) + 0.026)),
  ];
  // A bolted pavise: curved planks, a steel centre spine and battered metal rim.
  // All dimensions match the old shield's gameplay footprint; no collision edits.
  P.bulwarkShield = o => {
    const w = o.w ?? 0.8, h = o.h ?? 1.15, out = [], rim = o.metal;
    const outline = [[-w * 0.47, -h * 0.47], [w * 0.47, -h * 0.47], [w * 0.5, h * 0.26],
      [w * 0.35, h * 0.5], [-w * 0.35, h * 0.5], [-w * 0.5, h * 0.26]];
    const bend = g => deform(g, v => { v.z += 0.065 * (1 - (v.x / (w * 0.52)) ** 2); });
    out.push(bend(plate(outline, 0.035, 0.008)));
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      out.push(trim(rim, cord([[a[0], a[1], 0.04], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.05], [b[0], b[1], 0.04]], 0.022, 3)));
    }
    for (const x of [-0.27, 0.27]) for (const y of [-0.4, -0.16, 0.1, 0.34]) out.push(trim(rim, rivet(x, y, 0.09, 0.014)));
    out.push(trim(rim, xf(plate([[-0.033, -h * 0.44], [0.033, -h * 0.44], [0.055, h * 0.41], [-0.055, h * 0.41]], 0.02, 0.005), 0, 0, 0.095)));
    for (const s of [-1, 1]) out.push(trim(o.paint, bend(xf(plate([[s * 0.07, -0.03], [s * 0.31, 0.16], [s * 0.31, 0.24], [s * 0.07, 0.05]], 0.005, 0.001), 0, 0, 0.04))));
    const at = o.at ?? [0.08, -0.12, 0.22];
    for (const g of out) (g.geo ?? g).translate(...at);
    return out;
  };
  // Tailored, cloth-covered torso, deliberately narrow for the duelist and archer.
  P.fittedDoublet = (o, M) => {
    const k = M.proportions.torsoW / 0.18, z = M.proportions.torsoD / M.proportions.torsoW;
    const prof = [[0.19, -0.04], [0.17, 0.04], [0.18, 0.18], [0.22, 0.35], [0.245, 0.47], [0.21, 0.53], [0.12, 0.61]];
    const body = lathe(prof.map(([r, y]) => [r * k, y]), 16, z);
    const out = [uvScale(body, 1.5, 1.2), lathe([[0.12 * k, 0.58], [0.1 * k, 0.67], [0.108 * k, 0.68]], 12, z)];
    for (const y of [0.12, 0.22, 0.32, 0.42, 0.51]) out.push(trim(o.trim, rivet(0, y, (y < 0.25 ? 0.18 : 0.23) * k * z + 0.008, 0.007)));
    return out;
  };
  P.archerHarness = o => {
    const front = plate([[-0.19, 0.07], [-0.14, 0.04], [0.22, 0.52], [0.17, 0.55]], 0.012, 0.002);
    deform(front, v => { v.z += 0.135 - Math.abs(v.x) * 0.12 + Math.sin(v.y * 4) * 0.022; });
    return [front, trim(o.metal, xf(plate([[-0.023, -0.03], [0.023, -0.03], [0.023, 0.03], [-0.023, 0.03]], 0.008, 0.002), 0.025, 0.32, 0.165, 0, 0, -0.6))];
  };
  Object.assign(KIT.parts, P);
}
