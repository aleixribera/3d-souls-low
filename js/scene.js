'use strict';
// ============================================================================
// 4. Scene setup
// ============================================================================
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07060a, 0.022);
const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 200);
const moonLight = new THREE.DirectionalLight(0xffffff, 1);
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(moonLight, ambientLight);
function applyAtmosphere(def) {
  const A = { ...DEFAULT_ATMOSPHERE, ...(def.atmosphere || {}) };
  scene.background = new THREE.Color(A.background);
  scene.fog.color.set(A.fog); scene.fog.density = A.fogDensity;
  moonLight.color.set(A.moon.color); moonLight.intensity = A.moon.intensity; moonLight.position.set(...A.moon.position);
  ambientLight.color.set(A.ambient.color); ambientLight.intensity = A.ambient.intensity;
}

const flames = [];   // { group, mesh, light, base, color, seed } flickered every frame
// Lights. In a level with `cull`, a light is only a source: it is collected here instead of joining the
// scene, and a fixed pool of real lights follows the nearest sources each frame (visuals.render), so the
// light count never changes and shaders never recompile. Flicker and pulses still set the sources.
let lightSink = null;
function addLight(group, light) { if (lightSink) lightSink.push(light); else group.add(light); }
const dust = [];     // { group, points, origin, seeds } drifting motes near light sources

const MAT = {
  stone: new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.95 }),
  edge: new THREE.MeshStandardMaterial({ color: 0x5a5650, roughness: 0.95 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x45413d, roughness: 0.9 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 1 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0x0c0b0d, roughness: 1 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x3b3a3c, roughness: 0.6, metalness: 0.5 }),
  log: new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1 }),
  bonfireSword: new THREE.MeshStandardMaterial({ color: 0x55504a, metalness: 0.6, roughness: 0.5 }),
};
const addBox = (group, w, h, d, mat, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); group.add(m); return m;
};
// Floor with a lighter border strip marking the playable limit, and faint grid seams. Shared by every layout.
function addFloor(G, cx, cz, sizeX, sizeZ, border, grid) {
  addBox(G, sizeX, 0.5, sizeZ, MAT.stone, cx, -0.25, cz);
  const x0 = cx - sizeX / 2, x1 = cx + sizeX / 2, z0 = cz - sizeZ / 2, z1 = cz + sizeZ / 2;
  addBox(G, sizeX, 0.02, border, MAT.edge, cx, 0.01, z1 - border / 2);
  addBox(G, sizeX, 0.02, border, MAT.edge, cx, 0.01, z0 + border / 2);
  addBox(G, border, 0.02, sizeZ - border * 2, MAT.edge, x1 - border / 2, 0.01, cz);
  addBox(G, border, 0.02, sizeZ - border * 2, MAT.edge, x0 + border / 2, 0.01, cz);
  for (let x = x0 + grid; x < x1 - 0.01; x += grid) addBox(G, 0.06, 0.012, sizeZ - border * 2, MAT.dark, x, 0.006, cz);
  for (let z = z0 + grid; z < z1 - 0.01; z += grid) addBox(G, sizeX - border * 2, 0.012, 0.06, MAT.dark, cx, 0.006, z);
}
function addDust(group, x, y, z, spread, count) {
  const pos = new Float32Array(count * 3), seeds = [];
  for (let i = 0; i < count; i++) seeds.push({ x: rand(-spread, spread), y: rand(-1, 1.6), z: rand(-spread, spread), s: rand(0, 100), v: rand(0.15, 0.4) });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.035, transparent: true, opacity: 0.4, depthWrite: false }));
  group.add(points);
  dust.push({ group, points, origin: { x, y, z }, seeds });
}
function addFlame(group, x, y, z, size, light, color = 0xffa040) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.28 * size, 0.95 * size, 7),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, fog: false }));
  mesh.position.set(x, y, z); group.add(mesh);
  if (light) addLight(group, light);
  flames.push({ group, mesh, light, base: light ? light.intensity : 0, color: light ? light.color.clone() : null, seed: rand(0, 50) });
}
function addBonfire(group, x, z, intensity, y = 0) {
  for (let i = 0; i < 5; i++) {
    const log = addBox(group, 0.14, 0.14, 0.95, MAT.log, x, y + 0.12, z);
    log.rotation.y = i * Math.PI / 2.5; log.rotation.x = 0.25;
  }
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.08, 14), MAT.dark);
  ash.position.set(x, y + 0.04, z); group.add(ash);
  addBox(group, 0.05, 1.3, 0.09, MAT.bonfireSword, x, y + 0.7, z).rotation.z = 0.18;
  const light = new THREE.PointLight(0xff8a3c, intensity, 0, 1.0);
  light.position.set(x, y + 1.4, z);
  addFlame(group, x, y + 0.62, z, 1, light);
  addDust(group, x, y + 1.4, z, 2.2, 16);
}
// Iron portcullis spanning the hall at x; returns the group that lifts.
function buildPortcullis(group, x, width, height) {
  const g = new THREE.Group(); g.position.x = x;
  const barGeo = new THREE.BoxGeometry(0.12, height, 0.12);
  for (let z = -width / 2 + 0.25; z <= width / 2 - 0.2; z += 0.5) {
    const b = new THREE.Mesh(barGeo, MAT.iron); b.position.set(0, height / 2, z); g.add(b);
  }
  const railGeo = new THREE.BoxGeometry(0.14, 0.12, width);
  for (let y = 0.6; y < height; y += 1.1) { const r = new THREE.Mesh(railGeo, MAT.iron); r.position.set(0, y, 0); g.add(r); }
  group.add(g); return g;
}

// Layout builders: each returns { group, gates: [{ id, x, mesh, liftHeight }] } in the order of the level's gated list.
function buildArena(A) {
  const G = new THREE.Group(), R = A.pillarRing;
  addFloor(G, 0, 0, A.halfX * 2, A.halfZ * 2, A.border, A.grid);
  const t = A.wallThickness, h = A.wallHeight;
  addBox(G, A.halfX * 2 + t * 2, h, t, MAT.wall, 0, h / 2, A.halfZ + t / 2);
  addBox(G, A.halfX * 2 + t * 2, h, t, MAT.wall, 0, h / 2, -A.halfZ - t / 2);
  addBox(G, t, h, A.halfZ * 2, MAT.wall, A.halfX + t / 2, h / 2, 0);
  addBox(G, t, h, A.halfZ * 2, MAT.wall, -A.halfX - t / 2, h / 2, 0);
  addBox(G, A.outerGround, 0.5, A.outerGround, MAT.dark, 0, -0.3, 0);
  const pillar = (x, z, ph) => {
    addBox(G, R.base, 0.5, R.base, MAT.wall, x, 0.25, z);
    addBox(G, R.size, ph, R.size, MAT.wall, x, ph / 2, z);
    addBox(G, R.base, 0.5, R.base, MAT.wall, x, ph + 0.25, z);
  };
  const px = A.halfX + R.inset, pz = A.halfZ + R.inset;
  for (let x = -px; x <= px + 0.1; x += (px * 2) / 5) { pillar(x, -pz, 8 + Math.abs(x) % 3); pillar(x, pz, 7 + Math.abs(x * 1.7) % 4); }
  for (let z = -pz + 6.6; z < pz - 1; z += 6.6) { pillar(-px, z, 9); pillar(px, z, 6.5 + Math.abs(z) % 3); }
  for (const b of A.bonfires) addBonfire(G, b.x, b.z, A.bonfireLight);
  return { group: G, gates: [] };
}
function buildHall(L) {
  const S = { ...HALL_STYLE, ...(L.style || {}) };
  const G = new THREE.Group(), gates = [];
  const len = L.length, hz = L.halfZ, wh = L.wallHeight, aw = L.alcoveWidth / 2, ah = S.alcoveHeight;
  addBox(G, len + 2, 0.5, (hz + L.alcoveDepth + 1) * 2, MAT.stone, len / 2, -0.25, 0);   // floor under the alcoves too
  addFloor(G, len / 2, 0, len, hz * 2, S.border, S.grid);
  addBox(G, len, 0.012, 0.06, MAT.dark, len / 2, 0.006, 0);
  // Side walls, broken by alcoves.
  for (const side of [1, -1]) {
    const gaps = L.alcoves.filter(a => a.side === side).map(a => [a.x - aw, a.x + aw]).sort((a, b) => a[0] - b[0]);
    let from = -1;
    for (const [g0, g1] of [...gaps, [len + 1, len + 1]]) {
      if (g0 > from) addBox(G, g0 - from, wh, 1, MAT.wall, (from + g0) / 2, wh / 2, side * (hz + 0.5));
      from = g1;
    }
    for (const [g0, g1] of gaps) {
      const d = L.alcoveDepth;
      addBox(G, g1 - g0 + 2, ah, 1, MAT.wall, (g0 + g1) / 2, ah / 2, side * (hz + d + 0.5));
      addBox(G, 1, ah, d, MAT.wall, g0 - 0.5, ah / 2, side * (hz + d / 2));
      addBox(G, 1, ah, d, MAT.wall, g1 + 0.5, ah / 2, side * (hz + d / 2));
      addBox(G, g1 - g0 + 2, 0.3, d + 1, MAT.ceiling, (g0 + g1) / 2, ah, side * (hz + d / 2));
      addBox(G, g1 - g0, wh - ah, 1, MAT.wall, (g0 + g1) / 2, ah + (wh - ah) / 2, side * (hz + 0.5));
    }
  }
  addBox(G, 1, wh, hz * 2 + 2, MAT.wall, -0.5, wh / 2, 0);
  addBox(G, 1, wh, hz * 2 + 2, MAT.wall, len + 0.5, wh / 2, 0);
  addBox(G, len + 2, 0.5, hz * 2 + 2, MAT.ceiling, len / 2, wh + 0.25, 0);
  // Thin pillars along both walls for rhythm (decorative, no collision).
  const nearGap = x => L.alcoves.some(a => Math.abs(a.x - x) < aw + 1) || L.gated.some(g => Math.abs(g.gateX - x) < 1.5);
  for (let x = S.pillarStart; x < len - 1; x += S.pillarEvery) {
    for (const side of [1, -1]) {
      if (nearGap(x)) continue;
      addBox(G, S.pillarSize, wh, S.pillarSize, MAT.wall, x, wh / 2, side * (hz - 0.25));
      addBox(G, 0.75, 0.3, 0.75, MAT.dark, x, 0.15, side * (hz - 0.25));
      addBox(G, 0.75, 0.3, 0.75, MAT.dark, x, wh - 0.6, side * (hz - 0.25));
    }
  }
  // Gates: lintel in the wall above, portcullis below. Each gate object is built from its zone.
  for (const g of L.gated) {
    addBox(G, 1.2, wh - L.gateHeight, hz * 2, MAT.wall, g.gateX, L.gateHeight + (wh - L.gateHeight) / 2, 0);
    gates.push({ id: g.id, x: g.gateX, mesh: buildPortcullis(G, g.gateX, hz * 2, L.gateHeight),
                 liftHeight: L.gateHeight - CONFIG.level.gateLiftGap });
  }
  // Far end: solid wall with a closed exit gate.
  addBox(G, 0.4, S.exitGate.height + 0.2, S.exitGate.width + 0.6, MAT.ceiling, len - 0.05, (S.exitGate.height + 0.2) / 2, 0);
  buildPortcullis(G, len - 0.3, S.exitGate.width, S.exitGate.height);
  for (const b of L.bonfires) addBonfire(G, b.x, b.z, S.bonfireLight);
  const T = S.torch;
  for (const t of L.torches) {
    const z = t.side * (hz - 0.15);
    addBox(G, 0.12, 0.5, 0.12, MAT.iron, t.x, T.mountHeight, z);
    const light = new THREE.PointLight(T.color, T.intensity, T.range, 1.0);
    light.position.set(t.x, T.lightHeight, t.side * (hz - 0.7));
    addFlame(G, t.x, T.flameHeight, z, T.flameSize, light);
    addDust(G, t.x, T.mountHeight, t.side * (hz - 1.6), 1.6, 10);
  }
  return { group: G, gates };
}
// Room-style levels (js/terrain.js): each room gets its own floor, wall and light colours, at its own height.
// Floors are slabs (with holes for pits), roofed rooms get a ceiling, ramps are a slope or a flight of steps.
// The terrain's solids (walls, rails, ledge faces, lintels, posts, blocks) are drawn where they collide.
function buildRooms(L) {
  const G = new THREE.Group(), gates = [], C = CONFIG.rooms, H = CONFIG.height, TR = terrainFor(L);
  const mats = new Map();
  const matsFor = src => {
    if (!mats.has(src)) mats.set(src, {
      floor: new THREE.MeshStandardMaterial({ color: src.floor ?? 0x3a3733, roughness: 0.95 }),
      wall: new THREE.MeshStandardMaterial({ color: src.wall ?? 0x4a453e, roughness: 0.9 }),
    });
    return mats.get(src);
  };
  const boxOf = (b, mat, shrinkTop = 0) =>
    addBox(G, b.x1 - b.x0, b.y1 - b.y0 - shrinkTop, b.z1 - b.z0, mat, (b.x0 + b.x1) / 2, (b.y0 + b.y1 - shrinkTop) / 2, (b.z0 + b.z1) / 2);
  for (const R of TR.regions) {
    const room = R.src, [x0, x1, z0, z1] = R.rect, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, M = matsFor(room);
    if (R.kind === 'ramp') { buildRamp(G, R, M.floor); continue; }
    const y = R.lo;
    for (const p of rectMinus(R.rect, R.pits)) boxOf({ x0: p[0], x1: p[1], z0: p[2], z1: p[3], y0: y - H.slab, y1: y }, M.floor);
    const seams = [];   // faint grid seams, clipped around pits
    for (let x = x0 + 4; x < x1 - 0.01; x += 4) seams.push([x - 0.03, x + 0.03, z0, z1]);
    for (let z = z0 + 4; z < z1 - 0.01; z += 4) seams.push([x0, x1, z - 0.03, z + 0.03]);
    for (const sm of seams) for (const p of rectMinus(sm, R.pits)) boxOf({ x0: p[0], x1: p[1], z0: p[2], z1: p[3], y0: y, y1: y + 0.012 }, MAT.dark);
    if (!R.open) addBox(G, w, H.slab, d, MAT.ceiling, cx, R.top + H.slab / 2, cz);
    if (room.light !== undefined) {
      const light = new THREE.PointLight(room.light, room.dim ? C.dimLight : C.roomLight, Math.max(w, d) * 1.3, 1.0);
      light.position.set(cx, y + Math.min(R.height, L.wallHeight) - 1.5, cz); addLight(G, light);
    }
    for (const [lx, lz] of room.lamps || []) {   // a brazier whose fire lights the room around it
      addBox(G, 0.5, 1.0, 0.5, MAT.iron, lx, y + 0.5, lz);
      addBox(G, 0.8, 0.15, 0.8, MAT.iron, lx, y + 1.05, lz);
      const light = new THREE.PointLight(new THREE.Color(room.light ?? 0xffa060).lerp(new THREE.Color(0xffa040), 0.5), C.lampLight, C.lampRange, 1.0);
      light.position.set(lx, y + 2.2, lz);
      addFlame(G, lx, y + 1.45, lz, C.brazierSize, light);
    }
    for (const [px, pz] of room.pillars || []) {
      const s = C.pillarSize, h = R.height;
      addBox(G, s, h, s, M.wall, px, y + h / 2, pz);
      addBox(G, s + 0.4, 0.4, s + 0.4, MAT.dark, px, y + 0.2, pz);
      addBox(G, s + 0.4, 0.4, s + 0.4, MAT.dark, px, y + h - 0.5, pz);
    }
    for (const [bx, bz] of room.braziers || []) {
      addBox(G, 0.5, 1.0, 0.5, MAT.iron, bx, y + 0.5, bz);
      addBox(G, 0.8, 0.15, 0.8, MAT.iron, bx, y + 1.05, bz);
      addFlame(G, bx, y + 1.45, bz, C.brazierSize, null, new THREE.Color(room.light ?? 0xffa060).lerp(new THREE.Color(0xffffff), 0.35).getHex());
    }
  }
  for (const s of TR.solids) {
    if (s.kind === 'pillar') continue;   // drawn with their bases above
    const M = matsFor(s.region ? s.region.src : s.block);
    if (s.kind === 'face') boxOf(s, M.wall, 0.02);   // just under the floor above, so the two never flicker
    else boxOf(s, M.wall);
    if (s.kind === 'rail') addBox(G, s.x1 - s.x0 + 0.08, 0.08, s.z1 - s.z0 + 0.08, MAT.edge, (s.x0 + s.x1) / 2, s.y1 + 0.04, (s.z0 + s.z1) / 2);
  }
  // Gates: a lintel above, a portcullis below; the closed portcullis is a solid box across the doorway.
  const t = L.gateThickness, gh = L.gateHeight;
  for (const z of L.gated) {
    const g = z.gate, alongX = g.along === 'x', gy = TR.floorY(g.x, g.z, g.y), wh = gateHeadroom(TR, g.x, g.z, gy);
    if (wh > gh) addBox(G, alongX ? g.width : 1.2, wh - gh, alongX ? 1.2 : g.width, MAT.wall, g.x, gy + gh + (wh - gh) / 2, g.z);
    const mesh = buildPortcullis(G, g.x, g.width, gh);
    mesh.position.set(g.x, gy, g.z); if (alongX) mesh.rotation.y = Math.PI / 2;
    const box = alongX ? { x0: g.x - g.width / 2, x1: g.x + g.width / 2, z0: g.z - t / 2, z1: g.z + t / 2, y0: gy, y1: gy + gh }
                       : { x0: g.x - t / 2, x1: g.x + t / 2, z0: g.z - g.width / 2, z1: g.z + g.width / 2, y0: gy, y1: gy + gh };
    gates.push({ id: z.id, x: g.x, z: g.z, y: gy, box, mesh, liftHeight: gh - CONFIG.level.gateLiftGap });
  }
  for (const b of L.bonfires) addBonfire(G, b.x, b.z, HALL_STYLE.bonfireLight, TR.floorY(b.x, b.z, b.y));
  return { group: G, gates, solids: TR.solids, slabs: TR.slabs, terrain: TR };
}
// Headroom over a gate: the lowest of the regions whose floor it stands on.
function gateHeadroom(TR, x, z, y) {
  const hs = TR.regions.filter(R => inRect(R.rect, x, z) && Math.abs(R.floorAt(x, z) - y) < 0.05).map(R => R.height);
  return hs.length ? Math.min(...hs) : CONFIG.height.rail;
}
// A ramp: a sloped slab, or (stairs) a flight of steps; either way it collides as a smooth slope.
function buildRamp(G, R, mat) {
  const H = CONFIG.height, [x0, x1, z0, z1] = R.rect, ax = R.axis === 'x';
  const a0 = ax ? x0 : z0, a1 = ax ? x1 : z1, len = a1 - a0, width = ax ? z1 - z0 : x1 - x0, mid = ax ? (z0 + z1) / 2 : (x0 + x1) / 2;
  const f = s => ax ? R.floorAt(s) : R.floorAt(0, s), base = R.lo - H.slab;
  const block = (s0, s1, top) => {   // a box across the ramp from s0 to s1 along it, from the base up to `top`
    const h = top - base, c = (s0 + s1) / 2;
    if (h <= 0.02) return;
    if (ax) addBox(G, s1 - s0, h, width, mat, c, base + h / 2, mid); else addBox(G, width, h, s1 - s0, mat, mid, base + h / 2, c);
  };
  if (R.src.stairs) {   // each step reaches the slope's height at its middle, plus half a step
    const n = Math.max(1, Math.round((R.hi - R.lo) / H.stairStep)), run = len / n, half = (R.hi - R.lo) / n / 2;
    for (let i = 0; i < n; i++) block(a0 + i * run, a0 + (i + 1) * run, f(a0 + (i + 0.5) * run) + half);
    return;
  }
  const rise = f(a1) - f(a0), slope = Math.hypot(len, rise);
  const m = ax ? addBox(G, slope, H.slab, width, mat, (a0 + a1) / 2, (f(a0) + f(a1)) / 2 - H.slab / 2, mid)
               : addBox(G, width, H.slab, slope, mat, mid, (f(a0) + f(a1)) / 2 - H.slab / 2, (a0 + a1) / 2);
  if (ax) m.rotation.z = Math.atan2(rise, len); else m.rotation.x = -Math.atan2(rise, len);
  // A stepped wedge underneath, so the slope never shows daylight from the side.
  for (let s = a0; s < a1 - 1e-6; s += H.segment) { const s1 = Math.min(a1, s + H.segment); block(s, s1, Math.min(f(s), f(s1)) - H.slab * 0.6); }
}
const BUILDERS = { arena: buildArena, hall: buildHall, rooms: buildRooms };

// The geometry of the current level. Built when the level starts and torn down when another one does.
let stage = null;
function loadStage(def) {
  if (stage && stage.id === def.id) return stage;
  if (stage) {
    scene.remove(stage.group);
    stage.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isMesh && o.material && !Object.values(MAT).includes(o.material)) o.material.dispose(); });
    for (let i = flames.length - 1; i >= 0; i--) if (flames[i].group === stage.group) flames.splice(i, 1);
    for (let i = dust.length - 1; i >= 0; i--) if (dust[i].group === stage.group) dust.splice(i, 1);
  }
  lightSink = def.cull ? [] : null;
  const built = BUILDERS[def.layout](def);
  if (lightSink) {   // culled level: the sources stay out of the scene; a fixed pool of real lights stands in
    built.lightSources = lightSink;
    built.lightPool = Array.from({ length: CONFIG.cull.maxLights }, () => { const l = new THREE.PointLight(0xffffff, 0, 1, 1); built.group.add(l); return l; });
  }
  lightSink = null;
  scene.add(built.group);
  applyAtmosphere(def);
  visuals.dressStage(def, built);   // rendering-only dressing and per-level look (section 9b)
  stage = { id: def.id, ...built };
  return stage;
}

// Walkable space for the current level. Every layout answers the same height questions: groundAt(x, z, y)
// (the floor a body there stands on), ceilingAt(x, z, y), floorY(x, z, y) for placements, and killY (pits).
// Hall and arena levels are flat: the floor is y = 0 everywhere.
function makeWorld(def, st) {
  const flat = { groundAt: () => 0, floorY: () => 0, killY: -Infinity };
  if (def.layout === 'arena')
    return { ...flat, minX: -def.halfX, maxX: def.halfX, halfZ: def.halfZ, ceilingAt: () => Infinity, alcoves: [], gates: [], gateThickness: 0, bonfires: def.bonfires };
  if (def.layout === 'rooms') {   // `solids`: walls, rails, ledges and pillars; closed gates are added to them where needed
    const T = st.terrain;
    return { rooms: def.rooms, regions: T.regions, solids: st.solids, slabs: st.slabs, bonfires: def.bonfires,
             groundAt: T.groundAt, ceilingAt: T.ceilingAt, floorY: T.floorY, killY: T.killY,
             gates: st.gates.map(g => ({ ...g, open: false, lift: 0 })) };
  }
  return { ...flat, minX: 0, maxX: def.length, halfZ: def.halfZ, ceilingAt: () => def.wallHeight, gateThickness: def.gateThickness, bonfires: def.bonfires,
           gates: st.gates.map(g => ({ ...g, y: 0, open: false, lift: 0 })),
           alcoves: def.alcoves.map(a => ({ x0: a.x - def.alcoveWidth / 2, x1: a.x + def.alcoveWidth / 2, side: a.side, depth: def.alcoveDepth })) };
}
let world = null;
