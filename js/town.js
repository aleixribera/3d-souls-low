'use strict';
// ============================================================================
// 9c. Town pieces: houses, props, barricade gates, street clutter (rendering only)
// ============================================================================
// Builds what a room level's town data looks like. Collision comes from the data (js/terrain.js and
// js/data/props.js), never from these meshes; static meshes are merged per material with the rest of the level.
const TOWN_MAT = (() => {
  const std = (color, kind, extra = {}) => weather(new THREE.MeshStandardMaterial({ color, roughness: 0.92, ...extra }), kind);
  const plain = (color, extra = {}) => {   // not weathered (cloth, water, glass)
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra }); m.userData.weathered = 'none'; return m;
  };
  return {
    plaster: std(0xb3a588, 'plaster'), timber: std(0x3a291c, 'wood'), wood: std(0x5c4430, 'wood'), stone: std(0x8a8072, 'stone'),
    roof: std(0x6a382a, 'roof'), char: std(0x1c1714, 'wood'), soot: std(0x2a2420, 'plaster'),
    cloth: plain(0x7e3424), clothB: plain(0x8e7438), sack: plain(0x8a7a5a), water: plain(0x1a262c, { roughness: 0.12, metalness: 0.35 }),
    windowDark: std(0x0e0b0a, 'wood'),
    windowLit: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb468).multiplyScalar(1.5) }),   // lamplight behind the glass
    fire: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6a20).multiplyScalar(2.6) }),        // bright enough for bloom
  };
})();

// A box in group g (centre x, y, z), turned by ry about y (and rx, rz if given).
function townBox(g, w, h, d, mat, x, y, z, ry = 0, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
}
function townCyl(g, rTop, rBottom, h, segs, mat, x, y, z, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segs), mat);
  m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m;
}
function barrel(g, x, y, z, tipped = false) {
  const b = townCyl(g, 0.3, 0.3, 0.8, 10, TOWN_MAT.wood, x, y + (tipped ? 0.3 : 0.4), z, tipped ? Math.PI / 2 : 0);
  for (const k of [-0.25, 0.25]) townCyl(b, 0.315, 0.315, 0.05, 10, MAT.iron, 0, k, 0);
}

// Each look builds a prop in its own space (x across, z forward, y up from its floor), matching its boxes in PROP_KINDS.
const PROP_LOOKS = {
  fountain(g) {
    const M = TOWN_MAT;
    townCyl(g, 2.15, 2.25, 0.85, 8, M.stone, 0, 0.425, 0);
    townCyl(g, 2.25, 2.25, 0.12, 8, M.stone, 0, 0.88, 0);
    townCyl(g, 1.95, 1.95, 0.04, 8, M.water, 0, 0.72, 0);
    townCyl(g, 0.32, 0.42, 2.2, 8, M.stone, 0, 1.1, 0);
    townCyl(g, 0.85, 0.3, 0.35, 8, M.stone, 0, 2.1, 0);
    townCyl(g, 0.12, 0.2, 0.5, 6, M.stone, 0, 2.5, 0);
  },
  well(g) {
    const M = TOWN_MAT;
    townCyl(g, 0.95, 0.95, 0.95, 10, M.stone, 0, 0.475, 0);
    townCyl(g, 0.72, 0.72, 0.02, 10, MAT.dark, 0, 0.96, 0);
    for (const s of [-1, 1]) townBox(g, 0.14, 2.3, 0.14, M.timber, s * 0.82, 1.15, 0);
    townBox(g, 1.9, 0.12, 0.12, M.timber, 0, 2.05, 0);
    for (const s of [-1, 1]) townBox(g, 2.1, 0.06, 0.8, M.roof, 0, 2.38, s * 0.32, 0, s * 0.55);
    townCyl(g, 0.16, 0.13, 0.25, 8, M.wood, 0.3, 1.6, 0);
  },
  cart(g) {
    const M = TOWN_MAT;
    townBox(g, 2.6, 0.12, 1.3, M.wood, 0, 0.82, 0);
    for (const s of [-1, 1]) { townBox(g, 2.6, 0.38, 0.06, M.wood, 0, 1.05, s * 0.62); townBox(g, 0.06, 0.38, 1.3, M.wood, s * 1.27, 1.05, 0); }
    for (const sx of [-0.75, 0.75]) for (const sz of [-0.72, 0.72]) {
      const w = townCyl(g, 0.52, 0.52, 0.1, 12, M.timber, sx, 0.52, sz, Math.PI / 2);
      townCyl(w, 0.14, 0.14, 0.14, 8, MAT.iron, 0, 0, 0);
    }
    for (const s of [-0.35, 0.35]) townBox(g, 1.6, 0.08, 0.08, M.timber, 2.0, 0.75, s, 0, 0, -0.18);
    townBox(g, 0.7, 0.45, 0.5, M.sack, -0.6, 1.12, 0.2, 0.3); townBox(g, 0.6, 0.4, 0.45, M.sack, 0.3, 1.1, -0.25, -0.2);
  },
  stall(g) {
    const M = TOWN_MAT;
    townBox(g, 3.0, 1.05, 0.8, M.wood, 0, 0.525, 0.35);
    townBox(g, 3.0, 2.5, 0.26, M.wood, 0, 1.25, -0.62);
    for (const s of [-1, 1]) townBox(g, 0.12, 2.15, 0.12, M.timber, s * 1.42, 1.075, 0.7);
    townBox(g, 3.2, 0.05, 1.8, M.cloth, 0, 2.32, 0.08, 0, -0.17);
    for (let i = 0; i < 5; i++) townBox(g, 0.42, 0.06, 1.82, M.clothB, -1.2 + i * 0.6, 2.335, 0.08, 0, -0.17);
    for (let i = 0; i < 4; i++) townBox(g, 0.4, 0.22, 0.3, i % 2 ? M.sack : M.clothB, -1.05 + i * 0.7, 1.16, 0.38, i * 0.4);
  },
  brokenStall(g) {
    const M = TOWN_MAT;
    townBox(g, 3.0, 0.5, 0.8, M.wood, 0, 0.25, 0.3, 0.1, 0, 0.12);
    townBox(g, 2.6, 0.18, 1.2, M.wood, 0.1, 0.55, -0.3, -0.15, 0.5);
    townBox(g, 2.4, 0.05, 1.5, M.cloth, -0.2, 0.08, 0.1, 0.4);
    for (const [x, r] of [[-1.2, 0.9], [1.1, -0.7]]) townBox(g, 0.12, 1.8, 0.12, M.timber, x, 0.3, -0.5, r, 1.4);
    barrel(g, 1.0, 0, 0.5, true);
  },
  crates(g) {
    const M = TOWN_MAT;
    townBox(g, 0.85, 0.85, 0.85, M.wood, -0.42, 0.425, -0.42, 0.1); townBox(g, 0.85, 0.85, 0.85, M.wood, 0.42, 0.425, -0.4, -0.05);
    townBox(g, 0.8, 0.8, 0.8, M.wood, 0.4, 0.4, 0.42, 0.2); townBox(g, 0.82, 0.82, 0.82, M.wood, -0.38, 0.41, 0.4);
    townBox(g, 0.8, 0.8, 0.8, M.wood, -0.2, 1.25, -0.2, 0.3); townBox(g, 0.7, 0.65, 0.7, M.wood, 0.35, 1.18, 0.35, -0.2);
  },
  heap(g) {
    const M = TOWN_MAT;
    townBox(g, 2.4, 1.1, 0.12, M.wood, -0.3, 0.6, 0.1, 0.05, 0, 0.12);   // a cart bed on its side
    for (const s of [-1, 1]) townCyl(g, 0.5, 0.5, 0.1, 12, M.timber, -0.6 + s * 0.8, 0.9, -0.15, 0, 0);
    townBox(g, 3.4, 0.18, 0.18, M.timber, 0.1, 0.55, -0.35, 0.25, 0, 0.3);
    townBox(g, 3.0, 0.16, 0.16, M.timber, 0.2, 0.35, 0.45, -0.3, 0, -0.2);
    barrel(g, 1.25, 0, 0.2); barrel(g, 1.45, 0, -0.35, true);
    for (const s of [-0.5, 0.3]) townBox(g, 0.1, 1.4, 0.1, M.char, s, 0.7, 0.55, 0, 0.5, 0.2);
  },
};

// A barricade gate: a heap of an overturned cart, stacked beams, barrels and stakes pointing both ways, `width` m across
// (the gate's own z), `height` tall and `depth` deep (its x), standing on its base line so it can tip over (placeGate).
function buildBarricade(G, width, height, depth, seed) {
  const g = new THREE.Group(), rnd = seeded(seed), M = TOWN_MAT, w = width / 2;
  const cz = (rnd() - 0.5) * width * 0.3;
  townBox(g, depth * 0.7, height * 0.78, width * 0.42, M.wood, 0, height * 0.39, cz, 0, 0.06);   // the cart bed, on its side
  for (const s of [-1, 1]) townCyl(g, 0.55, 0.55, 0.12, 12, M.timber, depth * 0.38, height * 0.55, cz + s * width * 0.13, 0, Math.PI / 2);
  for (let y = 0.35; y < height - 0.2; y += 0.7 + rnd() * 0.2)   // beams across, none quite level
    townBox(g, 0.24, 0.24, width * (0.9 + rnd() * 0.12), M.timber, (rnd() - 0.5) * depth * 0.5, y, (rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.1);
  for (let z = -w + 0.5; z < w - 0.3; z += 0.8 + rnd() * 0.4) {   // stakes, sharpened toward both sides
    const side = rnd() < 0.5 ? 1 : -1;
    townBox(g, 2.2, 0.13, 0.13, M.wood, side * 0.45, 0.9 + rnd() * height * 0.4, z, (rnd() - 0.5) * 0.3, 0, side * (0.45 + rnd() * 0.25));
  }
  for (const s of [-1, 1]) {
    townCyl(g, 0.3, 0.3, 0.8, 10, M.wood, (rnd() - 0.5) * depth * 0.4, 0.4, s * (w - 0.45));
    townCyl(g, 0.3, 0.3, 0.8, 10, M.wood, (rnd() - 0.5) * depth * 0.3, 1.2, s * (w - 0.5));
  }
  townBox(g, 0.1, height * 0.9, 1.1, M.wood, -depth * 0.3, height * 0.45, -cz * 0.5, 0, 0.25, 0.15);   // a door torn off its hinges
  G.add(g);
  return g;
}

// ---- houses -------------------------------------------------------------------------------------------------
// A gable end: a triangular prism, base `w` along x, apex `h` above its base, `d` deep along z, centred on x and z and
// standing on y = 0. Indexed and with uvs, so it merges with the rest of the level.
function gableGeometry(w, h, d) {
  const hw = w / 2, hd = d / 2, pos = [], nrm = [], uv = [], idx = [];
  const face = (pts, n) => {
    const i0 = pos.length / 3;
    for (const p of pts) { pos.push(...p); nrm.push(...n); uv.push(p[0] + p[2], p[1]); }
    for (let k = 1; k + 1 < pts.length; k++) idx.push(i0, i0 + k, i0 + k + 1);
  };
  const s = Math.hypot(hw, h), nx = h / s, ny = hw / s;
  face([[-hw, 0, hd], [hw, 0, hd], [0, h, hd]], [0, 0, 1]);
  face([[hw, 0, -hd], [-hw, 0, -hd], [0, h, -hd]], [0, 0, -1]);
  face([[hw, 0, hd], [hw, 0, -hd], [0, h, -hd], [0, h, hd]], [nx, ny, 0]);
  face([[-hw, 0, -hd], [-hw, 0, hd], [0, h, hd], [0, h, -hd]], [-nx, ny, 0]);
  face([[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]], [0, -1, 0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
const SIDES = ['n', 's', 'e', 'w'];
// The sides of a house that look onto walkable space (a region it faces lies across that side for at least 1 m), each
// with the highest floor it looks onto there (where its doors and windows start).
function houseFronts(H, regions) {
  const f = CONFIG.houses.face, r = H.rect, out = new Map(), add = (k, R) => out.set(k, Math.max(out.get(k) ?? -Infinity, R.lo));
  for (const R of houseFaces(H, regions)) {
    const q = R.rect;
    if (q[2] < r[3] + f && q[3] > r[3] - 0.01 && Math.min(q[1], r[1]) - Math.max(q[0], r[0]) >= 1) add('n', R);
    if (q[3] > r[2] - f && q[2] < r[2] + 0.01 && Math.min(q[1], r[1]) - Math.max(q[0], r[0]) >= 1) add('s', R);
    if (q[0] < r[1] + f && q[1] > r[1] - 0.01 && Math.min(q[3], r[3]) - Math.max(q[2], r[2]) >= 1) add('e', R);
    if (q[1] > r[0] - f && q[0] < r[0] + 0.01 && Math.min(q[3], r[3]) - Math.max(q[2], r[2]) >= 1) add('w', R);
    if (q[0] <= r[0] && q[1] >= r[1] && q[2] <= r[2] && q[3] >= r[3]) SIDES.forEach(k => add(k, R));   // standing free in it
  }
  return out;
}
// Edge `k` of rect r as a frame to draw on, facing out of the rect (`dir` 1) or into it (-1): points along it (a), at
// height y, `off` m from the edge that way; `ry` turns a box so its local z points that way.
function edgeFrame(r, k, dir = 1) {
  const E = EDGES[k], at = r[E.at], a0 = r[E.lo], a1 = r[E.hi], alongX = E.along === 'x', out = E.out * dir;
  const pt = (a, y, off) => alongX ? [a, y, at + out * off] : [at + out * off, y, a];
  const ry = alongX ? (out > 0 ? 0 : Math.PI) : (out > 0 ? Math.PI / 2 : -Math.PI / 2);
  return { k, a0, a1, len: a1 - a0, pt, ry, alongX, out };
}
const houseSide = (r, k) => edgeFrame(r, k, 1);   // a house's side, facing out of it
// A box on a house side: `w` along it, `h` tall, `d` deep (out from the wall), its centre at a, y and `off` m out.
function sideBox(g, S, w, h, d, mat, a, y, off, tilt = 0) {
  const [x, , z] = S.pt(a, y, off), m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(0, S.ry, 0); if (tilt) m.rotateZ(tilt); g.add(m); return m;
}

// Every house of a room level (js/terrain.js gives their mass): stone below, timber-framed plaster above jutting out
// over the street, windows lit or dark, doors, a tiled gable roof with a chimney; a tower in stone under a spire.
// `burning` houses have fire in their upper windows, a flame and a real light (a culled light source), and smoke
// (`out.smoke`, emitters drawn by the visuals); `ruined` ones are blackened, roof half gone.
function buildHouses(G, L, TR, out) {
  for (const H of L.houses) buildHouse(G, H, TR, seeded(strSeed(`${L.id}:${H.rect.join(',')}`)), out, L.bonfires);
}
function buildHouse(G, H, TR, rnd, out, bonfires) {
  const V = VIS.town, M = TOWN_MAT, r = H.rect, y = houseBase(H, TR.regions), eaves = y + H.eaves, gr = 0.03;
  const fronts = houseFronts(H, TR.regions), stone = !!H.stone || H.kind === 'tower', inner = TR.regions.filter(R => (H.rooms || []).includes(R.id));
  const burnt = !!(H.burning || H.ruined), upperMat = burnt ? M.soot : M.plaster, wallMat = stone ? (burnt ? M.soot : M.stone) : upperMat;
  const groundTop = stone ? eaves : Math.min(eaves - 2, y + V.groundFloor), jet = k => !stone && fronts.has(k) ? V.jetty : 0;
  const cx = (r[0] + r[1]) / 2, cz = (r[2] + r[3]) / 2, T = CONFIG.rooms.wallThickness;
  // The mass, in height bands: the stone ground storey, then the upper storeys, out over the street on its fronts (a
  // piece grows only where it reaches the house's sides). An enterable house leaves room for each of its rooms over
  // that room's height, along with the room's own walls (which show inside and out); round a stair inside, the house's
  // walls stay, hiding the stair's stepped side walls.
  const body = (p, y0, y1, mat, jets) => {
    if (y1 - y0 < 0.05) return;
    const grow = (i, k) => Math.abs(p[i] - r[i]) < 1e-6 ? gr + (jets ? jet(k) : 0) : 0;
    const q = [p[0] - grow(0, 'w'), p[1] + grow(1, 'e'), p[2] - grow(2, 's'), p[3] + grow(3, 'n')];
    townBox(G, q[1] - q[0], y1 - y0, q[3] - q[2], mat, (q[0] + q[1]) / 2, (y0 + y1) / 2, (q[2] + q[3]) / 2);
  };
  const grown = (q, m) => [q[0] - m, q[1] + m, q[2] - m, q[3] + m];
  const holes = inner.map(R => R.kind === 'ramp' ? { r: grown(R.rect, 0.03), y0: R.lo - CONFIG.height.slab, y1: R.hi + R.height }
                                                 : { r: grown(R.rect, T - 0.03), y0: R.lo - CONFIG.height.slab, y1: R.top });
  const cuts = [...new Set([y - 0.6, groundTop, eaves, ...holes.flatMap(h => [h.y0, h.y1])])].filter(v => v >= y - 0.6 && v <= eaves).sort((a, b) => a - b);
  for (let i = 0; i + 1 < cuts.length; i++) {
    const b0 = cuts[i], b1 = cuts[i + 1], mid = (b0 + b1) / 2, upper = b0 >= groundTop - 1e-6;
    for (const p of rectMinus(r, holes.filter(h => h.y0 < mid && h.y1 > mid).map(h => h.r))) body(p, b0, b1, upper || stone ? wallMat : M.stone, upper);
  }
  // Fronts: framing, windows, doors.
  const doors = [];   // spans of an enterable house's openings on each side: no wall drawn there
  for (const R of inner) for (const k of SIDES) {
    const E = EDGES[k];
    if (Math.abs(R.rect[E.at] - r[E.at]) < 0.05) doors.push({ k, a0: R.rect[E.lo], a1: R.rect[E.hi], lo: R.lo, top: R.kind === 'ramp' ? R.hi + R.height : R.top });
  }
  const windowMat = upper => H.burning && upper ? (rnd() < V.fireWindows ? M.fire : M.windowDark) : burnt ? M.windowDark
    : rnd() < (H.lit ?? V.lit) ? M.windowLit : M.windowDark;
  const fires = [];
  for (const [k, sideFloor] of fronts) {
    const S = houseSide(r, k), j = jet(k) + gr, n = Math.max(1, Math.round(S.len / V.post)), bay = S.len / n, sf = Math.max(y, sideFloor);
    const [j0, j1] = S.alongX ? [jet('w'), jet('e')] : [jet('s'), jet('n')];   // the corners jut out too
    if (stone) {   // a stone front: a string course, tall windows in rows, a great door
      for (let yy = sf + V.stoneStorey; yy < eaves - 0.5; yy += V.stoneStorey) sideBox(G, S, S.len + 0.1, 0.22, 0.16, M.stone, (S.a0 + S.a1) / 2, yy, gr + 0.08);
      const nw = Math.max(1, Math.floor(S.len / 3.2));
      for (let yy = sf + V.stoneStorey + (H.kind === 'tower' ? 1 : 0.3); yy + 1.9 < eaves - (H.kind === 'tower' ? 3.4 : 0.4); yy += V.stoneStorey)
        for (let i = 0; i < nw; i++) sideBox(G, S, 0.85, 1.7, 0.1, windowMat(true), S.a0 + (i + 0.5) * S.len / nw, yy + 0.85, gr + 0.05);
    } else {   // timber framing over the upper storeys: rails at each floor, posts, braces at the ends
      const bands = [];
      for (let yy = Math.max(groundTop, sf + V.groundFloor); yy < eaves - 0.6; yy += V.storey) bands.push([yy, Math.min(eaves, yy + V.storey)]);
      if (bands.length) bands[bands.length - 1][1] = eaves;
      for (const [b0, b1] of bands) {
        sideBox(G, S, S.len + j0 + j1 + 0.1, 0.2, 0.14, M.timber, (S.a0 + S.a1 + j1 - j0) / 2, b0 + 0.1, j + 0.06);
        for (let i = 0; i <= n; i++) sideBox(G, S, 0.17, b1 - b0, 0.13, M.timber, S.a0 + i * bay + (i === 0 ? 0.08 : i === n ? -0.08 : 0), (b0 + b1) / 2, j + 0.06);
        for (const i of [0, n - 1]) if (bay > 0.8) sideBox(G, S, Math.hypot(bay, b1 - b0 - 0.2) - 0.1, 0.14, 0.11, M.timber,
          S.a0 + (i + 0.5) * bay, (b0 + b1) / 2 + 0.05, j + 0.05, (i === 0 ? 1 : -1) * Math.atan2(b1 - b0 - 0.2, bay));
        if (b1 - b0 > 2) for (let i = 1; i < n - 1; i++) if (rnd() < V.windows) {
          const m = windowMat(true), wy = b0 + Math.min(1.35, (b1 - b0) * 0.55);
          sideBox(G, S, Math.min(0.8, bay * 0.6), 1.0, 0.1, m, S.a0 + (i + 0.5) * bay, wy, j + 0.05);
          sideBox(G, S, Math.min(1.0, bay * 0.75), 0.1, 0.22, M.timber, S.a0 + (i + 0.5) * bay, wy - 0.56, j + 0.1);
          if (m === M.fire) fires.push({ S, a: S.a0 + (i + 0.5) * bay, y: wy, off: j + 0.25 });
        }
      }
      sideBox(G, S, S.len + j0 + j1 + 0.1, 0.24, 0.18, M.timber, (S.a0 + S.a1 + j1 - j0) / 2, eaves - 0.12, j + 0.08);
    }
    // The ground storey: a door or two and a small window, or the frame round an enterable house's real opening.
    const open = doors.filter(d => d.k === k);
    for (const d of open) {
      for (const a of [d.a0 - 0.12, d.a1 + 0.12]) sideBox(G, S, 0.24, d.top - d.lo, 0.2, M.timber, a, (d.lo + d.top) / 2, gr + 0.1);
      sideBox(G, S, d.a1 - d.a0 + 0.6, 0.28, 0.22, M.timber, (d.a0 + d.a1) / 2, d.top + 0.1, gr + 0.1);
    }
    if (!open.length && !inner.length && S.len >= 3 && sf < groundTop - 1.5) {
      const nd = S.len >= 9 ? 2 : 1;
      for (let i = 0; i < nd; i++) {
        const a = S.a0 + S.len * (i + 0.5) / nd + (rnd() - 0.5) * Math.min(2, S.len * 0.2);
        const dh = stone ? 3.0 : 2.3, dw = stone ? 1.7 : 1.15;
        sideBox(G, S, dw, dh, 0.12, M.timber, a, sf + dh / 2, gr + 0.05);
        sideBox(G, S, dw + 0.4, 0.3, 0.2, stone ? M.stone : M.timber, a, sf + dh + 0.12, gr + 0.08);
        if (!stone && S.len >= 5) sideBox(G, S, 0.7, 0.6, 0.1, windowMat(false), a + (a > (S.a0 + S.a1) / 2 ? -2 : 2), sf + 1.7, gr + 0.05);
      }
    }
  }
  // Roof.
  if (H.kind === 'tower') {
    const w = r[1] - r[0], d = r[3] - r[2], rad = Math.hypot(w, d) / 2 + V.overhang * 0.8, h = houseRoof(H);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 4), M.roof);
    cone.position.set(cx, eaves + h / 2, cz); cone.rotation.y = Math.PI / 4; cone.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); G.add(cone);
    townBox(G, w + 0.5, 0.4, d + 0.5, M.stone, cx, eaves + 0.1, cz);
    townBox(G, 0.12, 1.6, 0.12, MAT.iron, cx, eaves + h + 0.7, cz);
    for (const k of SIDES) {   // the belfry: dark openings under the spire
      const S = houseSide(r, k), nb = Math.max(1, Math.floor(S.len / 2.2));
      for (let i = 0; i < nb; i++) sideBox(G, S, 0.95, 2.4, 0.08, M.windowDark, S.a0 + (i + 0.5) * S.len / nb, eaves - 1.9, gr + 0.04);
    }
  } else {
    const alongX = H.ridge === 'x', len = alongX ? r[1] - r[0] : r[3] - r[2], dep = alongX ? r[3] - r[2] : r[1] - r[0];
    const ov = V.overhang, rise = houseRoof(H), pitch = CONFIG.houses.pitch, g = new THREE.Group();
    g.position.set(cx, eaves, cz); g.rotation.y = alongX ? 0 : Math.PI / 2;
    const half = dep / 2 + ov, a = Math.atan2(rise + ov * pitch, half), slope = Math.hypot(half, rise + ov * pitch);
    const missing = H.ruined ? (rnd() < 0.5 ? -1 : 1) : 0;
    for (const s of [-1, 1]) {
      if (s === missing) {   // a ruin: the rafters stand bare on one side
        for (let x = -len / 2 + 0.3; x < len / 2 - 0.2; x += 0.9) if (rnd() < 0.75)
          townBox(g, 0.14, 0.18, slope * (0.6 + rnd() * 0.4), M.char, x, (rise - ov * pitch) / 2, s * half / 2, 0, s > 0 ? a : -a);
        continue;
      }
      townBox(g, len + 2 * ov, 0.24, slope, M.roof, 0, (rise - ov * pitch) / 2 + 0.12, s * half / 2, 0, s > 0 ? a : -a);
    }
    for (const s of [-1, 1]) {
      if (H.ruined && s === missing) continue;
      const gab = new THREE.Mesh(gableGeometry(dep, rise, 0.3), stone ? wallMat : upperMat);
      gab.position.set(s * (len / 2 - 0.15 + gr + jet(alongX ? (s > 0 ? 'e' : 'w') : (s > 0 ? 'n' : 's'))), 0, 0); gab.rotation.y = Math.PI / 2; g.add(gab);
    }
    if (!missing) townBox(g, len + 2 * ov, 0.2, 0.28, M.timber, 0, rise + 0.16, 0);
    const chx = (rnd() - 0.5) * len * 0.5, chs = rnd() < 0.5 ? -1 : 1;
    if (!H.ruined) townBox(g, 0.75, rise * 0.55 + 1.3, 0.75, M.stone, chx, rise * 0.45 + (rise * 0.55 + 1.3) / 2, chs * dep * 0.18);
    G.add(g);
  }
  // Inside an enterable house's roofed rooms: beams under the ceiling and, in a room big enough, a table with benches
  // near its middle (unless a bonfire is there). Rendering only, like all dressing.
  for (const R of inner) {
    if (R.kind !== 'room' || R.open) continue;
    const [x0, x1, z0, z1] = R.rect, w = x1 - x0, d = z1 - z0, alongX = w < d, span = alongX ? w : d;
    for (let a = (alongX ? z0 : x0) + 0.8; a < (alongX ? z1 : x1) - 0.5; a += V.beam)
      alongX ? townBox(G, span, 0.22, 0.2, M.timber, (x0 + x1) / 2, R.top - 0.11, a) : townBox(G, 0.2, 0.22, span, M.timber, a, R.top - 0.11, (z0 + z1) / 2);
    const tx = (x0 + x1) / 2 + (rnd() - 0.5) * w * 0.2, tz = (z0 + z1) / 2 + (rnd() - 0.5) * d * 0.2;
    if (w * d < V.table.area || bonfires.some(b => Math.hypot(b.x - tx, b.z - tz) < V.table.clear)) continue;
    const g = new THREE.Group(); g.position.set(tx, R.lo, tz); g.rotation.y = alongX ? Math.PI / 2 : 0;
    townBox(g, 2.4, 0.1, 0.9, M.wood, 0, 0.78, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) townBox(g, 0.1, 0.75, 0.1, M.timber, sx * 1.05, 0.38, sz * 0.35);
    for (const sz of [-1, 1]) townBox(g, 2.2, 0.08, 0.32, M.wood, 0, 0.45, sz * 0.8);
    G.add(g);
  }
  // Fire: flames out of the burning windows, one of them lighting the street; smoke over the roof.
  const top = eaves + houseRoof(H);
  if (H.burning) {
    fires.sort(() => rnd() - 0.5).slice(0, V.fire.flames).forEach((f, i) => {
      const [x, , z] = f.S.pt(f.a, f.y, f.off);
      let light = null;
      if (i === 0) {
        const F = V.fireLight, [lx, , lz] = f.S.pt(f.a, f.y, f.off + 2);
        light = new THREE.PointLight(F.color, F.intensity, F.range, 1); light.position.set(lx, f.y + 0.5, lz);
      }
      addFlame(G, x, f.y + 0.35, z, V.fire.windowFlame, light, 0xff7a30);
    });
    addFlame(G, cx + (rnd() - 0.5) * 2, top - 0.2, cz + (rnd() - 0.5) * 2, V.fire.roofFlame, null, 0xff8a40);
  }
  if (H.burning || H.ruined) out.smoke.push({ x: cx, y: top, z: cz, k: H.burning ? 1 : V.fire.ruinSmoke });   // a ruin still smoulders
}

// ---- street clutter -----------------------------------------------------------------------------------------
// Along the walls of a town's open rooms (where the house fronts are): barrels, crates and sacks at their foot, hanging
// signs and lanterns on iron brackets above. Rendering only: none of it collides. Kept clear of wall ends (doorways),
// gates, bonfires and fires (clearOf), props and ramps.
function dressTownStreets(G, L, TR, rnd, clearOf) {
  const V = VIS.town, M = TOWN_MAT, glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(V.lanternColor).multiplyScalar(2) });
  const near = (x, z, m) => TR.solids.some(s => s.kind === 'prop' && x > s.x0 - m && x < s.x1 + m && z > s.z0 - m && z < s.z1 + m)
    || (L.ramps || []).some(r => x > r.rect[0] - m && x < r.rect[1] + m && z > r.rect[2] - m && z < r.rect[3] + m);
  for (const w of TR.solids) {
    if (w.kind !== 'wall' || !w.region || w.region.kind !== 'room' || !w.region.open) continue;
    // The wall stands outside its room's edge `w.edge`; its face toward the room is that edge.
    const F = edgeFrame(w.region.rect, w.edge, -1), y = w.region.lo, a0 = F.alongX ? w.x0 : w.z0, a1 = F.alongX ? w.x1 : w.z1;
    if (a1 - a0 < 3) continue;
    const put = (a, off, build) => {
      const [x, , z] = F.pt(a, y, off);
      if (!clearOf(x, z, V.clutterClear.flames) || near(x, z, V.clutterClear.props)) return;
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = F.ry; build(g); G.add(g);
    };
    for (let a = a0 + 1 + rnd() * 2; a < a1 - 1; a += between(rnd, V.clutter)) {
      const kind = rnd();
      put(a, 0.45, g => {
        if (kind < 0.35) { barrel(g, 0, 0, 0); if (rnd() < 0.5) barrel(g, 0.65, 0, 0.05); }
        else if (kind < 0.65) { townBox(g, 0.7, 0.7, 0.7, M.wood, 0, 0.35, 0, rnd() * 0.4); if (rnd() < 0.4) townBox(g, 0.55, 0.55, 0.55, M.wood, 0.05, 0.98, 0, rnd()); }
        else if (kind < 0.85) for (let i = 0; i < 3; i++) townBox(g, 0.55, 0.32, 0.4, M.sack, (i - 1) * 0.45, 0.16, (rnd() - 0.5) * 0.2, rnd() - 0.5);
        else { townBox(g, 1.6, 0.1, 0.5, M.wood, 0, 0.45, 0); for (const s of [-0.65, 0.65]) townBox(g, 0.08, 0.45, 0.4, M.wood, s, 0.22, 0); }   // a bench
      });
    }
    for (let a = a0 + V.sign * (0.3 + rnd() * 0.5); a < a1 - 1; a += V.sign * (0.8 + rnd() * 0.4)) put(a, 0, g => {   // a sign over a door
      townBox(g, 0.06, 0.06, 1.1, MAT.iron, 0, 3.6, 0.6);
      townBox(g, 0.06, 0.06, 0.5, MAT.iron, 0, 3.4, 0.35, 0, 0.7);
      townBox(g, 0.06, 0.7, 0.9, M.wood, 0, 3.15, 0.75);
    });
    for (let a = a0 + V.lantern * (0.4 + rnd() * 0.4); a < a1 - 1; a += V.lantern * (0.8 + rnd() * 0.4)) put(a, 0, g => {   // a lantern
      townBox(g, 0.06, 0.06, 0.55, MAT.iron, 0, 3.0, 0.3);
      townBox(g, 0.22, 0.32, 0.22, MAT.iron, 0, 2.78, 0.55);
      townBox(g, 0.15, 0.22, 0.15, glowMat, 0, 2.78, 0.55);
      const glow = glowSprite(V.lanternColor, 1, 1.4, 0.5, 0.6); glow.position.set(0, 2.78, 0.55); g.add(glow);
    });
  }
}

// Every prop of a room level, on the floor under it.
function buildProps(G, L, TR) {
  for (const P of L.props) {
    const y = TR.floorY(P.x, P.z, P.y);
    if (!Number.isFinite(y)) continue;
    const g = new THREE.Group(); g.position.set(P.x, y, P.z); g.rotation.y = P.yaw || 0;
    PROP_LOOKS[P.kind](g);
    G.add(g);
  }
}
