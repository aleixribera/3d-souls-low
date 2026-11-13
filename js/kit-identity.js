'use strict';
// Opt-in character fittings. Geometry is baked into the existing indexed, skinned
// material batches; these parts allocate nothing during animation or combat.
{
  const { xf, lathe, plate, deform, uvScale } = KIT.helpers;
  const V3 = THREE.Vector3;
  const P = {};
  const trim = (slot, geo) => ({ slot, geo });
  const rivet = (x, y, z, r = 0.008) => xf(new THREE.SphereGeometry(r, 6, 4), x, y, z);
  const cord = (points, r = 0.008, segments = 12) => new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map(p => new V3(...p))), segments, r, 4, false);

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
