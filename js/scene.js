'use strict';
// ============================================================================
// 4. Scene setup
// ============================================================================
const canvas = document.getElementById('view');
// The canvas's MSAA cannot change after this, so it follows the graphics setting saved when the page loads.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: (CONFIG.VISUALS.quality[settings.graphics] || CONFIG.VISUALS.quality[CONFIG.VISUALS.defaultQuality]).antialias });
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
// `fire`: a group of its own for the flame and its glow, so a bonfire that is not lit yet (`litBy`) can hide them.
function addBonfire(group, x, z, intensity, y = 0, fire = group) {
  for (let i = 0; i < 5; i++) {
    const log = addBox(group, 0.14, 0.14, 0.95, MAT.log, x, y + 0.12, z);
    log.rotation.y = i * Math.PI / 2.5; log.rotation.x = 0.25;
  }
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.08, 14), MAT.dark);
  ash.position.set(x, y + 0.04, z); group.add(ash);
  addBox(group, 0.05, 1.3, 0.09, MAT.bonfireSword, x, y + 0.7, z).rotation.z = 0.18;
  const light = new THREE.PointLight(0xff8a3c, intensity, 0, 1.0);
  light.position.set(x, y + 1.4, z);
  addLight(group, light);
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.95, 7), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, fog: false }));
  mesh.position.set(x, y + 0.62, z); fire.add(mesh);
  const flame = { group, mesh, light, base: intensity, color: light.color.clone(), seed: rand(0, 50) };
  flames.push(flame);
  addDust(fire, x, y + 1.4, z, 2.2, 16);
  return flame;
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
  // Freestanding braziers (optional `braziers: [{ x, z }]`): an iron bowl on a stand whose fire lights the hall round it.
  const C = CONFIG.rooms;
  for (const b of L.braziers || []) {
    addBox(G, 0.5, 1.0, 0.5, MAT.iron, b.x, 0.5, b.z);
    addBox(G, 0.8, 0.15, 0.8, MAT.iron, b.x, 1.05, b.z);
    const light = new THREE.PointLight(0xffa050, C.lampLight, C.lampRange, 1.0);
    light.position.set(b.x, 2.2, b.z);
    addFlame(G, b.x, 1.45, b.z, C.brazierSize, light);
  }
  return { group: G, gates };
}
// Room-style levels (js/terrain.js): each room gets its own floor, wall and light colours, at its own height.
// Floors are slabs (with holes for pits), roofed rooms get a ceiling, ramps are a slope or a flight of steps.
// The terrain's solids (walls, rails, ledge faces, lintels, posts, blocks) are drawn where they collide.
// A trap's collapse area is drawn apart from its floor (buildTrapFloor), so that it can drop away.
function buildRooms(L) {
  const G = new THREE.Group(), gates = [], C = CONFIG.rooms, H = CONFIG.height, TR = terrainFor(L);
  const traps = (L.traps || []).map(t => ({ ...t, region: trapRoom(TR, t) }));
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
    const y = R.lo, cutOut = [...R.pits, ...traps.filter(t => t.region === R).map(t => t.collapse)];
    for (const p of rectMinus(R.rect, cutOut)) boxOf({ x0: p[0], x1: p[1], z0: p[2], z1: p[3], y0: y - H.slab, y1: y }, M.floor);
    for (const sm of floorSeams(R)) for (const p of rectMinus(sm, cutOut)) boxOf({ x0: p[0], x1: p[1], z0: p[2], z1: p[3], y0: y, y1: y + 0.012 }, MAT.dark);
    for (const p of R.roof) addBox(G, p[1] - p[0], H.slab, p[3] - p[2], MAT.ceiling, (p[0] + p[1]) / 2, R.top + H.slab / 2, (p[2] + p[3]) / 2);
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
  // The parts of a wall inside a house (not one of the house's own rooms) aren't drawn: the house stands there instead.
  const houses = (L.houses || []).map(H => ({ r: H.rect, top: houseBase(H, TR.regions) + H.eaves + 0.5, own: H.rooms || [] }));
  const shown = s => {
    if (!houses.length || !(s.kind === 'wall' || s.kind === 'post' || s.kind === 'lintel')) return [s];
    const hiding = houses.filter(h => s.y1 <= h.top && !(s.region && h.own.includes(s.region.id))).map(h => h.r);
    return rectMinus([s.x0, s.x1, s.z0, s.z1], hiding).filter(p => p[1] - p[0] > 0.02 && p[3] - p[2] > 0.02)
      .map(p => ({ ...s, x0: p[0], x1: p[1], z0: p[2], z1: p[3] }));
  };
  for (const whole of TR.solids) {
    if (whole.kind === 'pillar' || whole.kind === 'prop' || whole.kind === 'house') continue;   // pillars above; props, houses: js/town.js
    const M = matsFor(whole.region ? whole.region.src : whole.block);
    for (const s of shown(whole)) {
      if (s.kind === 'face') boxOf(s, M.wall, 0.02);   // just under the floor above, so the two never flicker
      else boxOf(s, M.wall);
      if (s.kind === 'rail') addBox(G, s.x1 - s.x0 + 0.08, 0.08, s.z1 - s.z0 + 0.08, MAT.edge, (s.x0 + s.x1) / 2, s.y1 + 0.04, (s.z0 + s.z1) / 2);
      // In a town (a level with houses), the walls of open rooms are town walls: a coping along the top.
      if (houses.length && s.kind === 'wall' && s.region && s.region.open)
        addBox(G, s.x1 - s.x0 + 0.2, 0.22, s.z1 - s.z0 + 0.2, MAT.edge, (s.x0 + s.x1) / 2, s.y1 + 0.11, (s.z0 + s.z1) / 2);
    }
  }
  // Gates: a lintel above, a portcullis below; the closed portcullis is a solid box across the doorway.
  // Zone gates lift when their zone is won; shortcut gates (`shortcuts`, with `opensFrom`) from their far side;
  // sealed gates (`sealed`) never. A gate with `style: 'barricade'` is a heap of carts, beams and stakes instead
  // (`CONFIG.rooms.barricade.depth` m deep, no lintel): it works the same, but topples away from its zone as it opens.
  const t = L.gateThickness, gh = L.gateHeight;
  for (const z of gatedEntries(L)) {
    const g = z.gate, alongX = g.along === 'x', gy = TR.floorY(g.x, g.z, g.y), wh = gateHeadroom(TR, g.x, g.z, gy);
    const barricade = g.style === 'barricade', th = barricade ? C.barricade.depth : t;
    if (!barricade && wh > gh && !L.clearGates) addBox(G, alongX ? g.width : 1.2, wh - gh, alongX ? 1.2 : g.width, MAT.wall, g.x, gy + gh + (wh - gh) / 2, g.z);
    const mesh = barricade ? buildBarricade(G, g.width, gh, th, strSeed(z.id)) : buildPortcullis(G, g.x, g.width, gh);
    mesh.position.set(g.x, gy, g.z); if (alongX) mesh.rotation.y = Math.PI / 2;
    const box = alongX ? { x0: g.x - g.width / 2, x1: g.x + g.width / 2, z0: g.z - th / 2, z1: g.z + th / 2, y0: gy, y1: gy + gh }
                       : { x0: g.x - th / 2, x1: g.x + th / 2, z0: g.z - g.width / 2, z1: g.z + g.width / 2, y0: gy, y1: gy + gh };
    // Away from the zone: the side of the gate its trigger is not on, in the gate's own x (rotation.y turns +x to -z).
    let fall = 0;
    if (barricade && z.trigger) {
      const r = Array.isArray(z.trigger[0]) ? z.trigger[0] : z.trigger, cx = (r[0] + r[1]) / 2, cz = (r[2] + r[3]) / 2;
      fall = alongX ? -Math.sign(g.z - cz) || 1 : Math.sign(g.x - cx) || 1;
    }
    gates.push({ id: z.id, x: g.x, z: g.z, y: gy, box, mesh, liftHeight: gh - CONFIG.level.gateLiftGap, opensFrom: z.opensFrom || null,
                 style: barricade ? 'barricade' : 'portcullis', fall, clear: !!L.clearGates });
  }
  const bonfireFires = [];   // bonfires lit later (`litBy`): their flames, hidden until then (Game.render)
  for (const b of L.bonfires) {
    const fire = b.litBy ? new THREE.Group() : G;
    if (b.litBy) G.add(fire);
    const flame = addBonfire(G, b.x, b.z, HALL_STYLE.bonfireLight, TR.floorY(b.x, b.z, b.y), fire);
    if (b.litBy) bonfireFires.push({ bonfire: b, group: fire, flame, base: flame.base });
  }
  if (L.props) buildProps(G, L, TR);   // js/town.js
  const town = { smoke: [] };
  if (L.houses) buildHouses(G, L, TR, town);
  const trapFloors = traps.map(tr => buildTrapFloor(G, tr, matsFor(tr.region.src).floor, TR));
  return { group: G, gates, traps: trapFloors, solids: TR.solids, slabs: TR.slabs, terrain: TR, smoke: town.smoke, bonfireFires };
}
// A room's faint floor seams, every 4 m.
function floorSeams(R) {
  const [x0, x1, z0, z1] = R.rect, seams = [];
  for (let x = x0 + 4; x < x1 - 0.01; x += 4) seams.push([x - 0.03, x + 0.03, z0, z1]);
  for (let z = z0 + 4; z < z1 - 0.01; z += 4) seams.push([x0, x1, z - 0.03, z + 0.03]);
  return seams;
}
// A trap's collapse area: floor pieces of their own (with the room's seams, and the cracks of its warning, hidden until
// then), kept out of the merged level geometry so they can drop away when it springs (placeTrap). Each piece knows
// how far it falls to the floor below, and its `order` (0..1) outward from the trigger: cracks and the drop spread so.
function buildTrapFloor(G, t, mat, TR) {
  const F = CONFIG.fx.trap, H = CONFIG.height, R = t.region, [x0, x1, z0, z1] = t.collapse, y = R.lo, seams = floorSeams(R);
  const nx = Math.max(1, Math.round((x1 - x0) / F.piece)), nz = Math.max(1, Math.round((z1 - z0) / F.piece));
  const tx = (t.trigger[0] + t.trigger[1]) / 2, tz = (t.trigger[2] + t.trigger[3]) / 2;
  const group = new THREE.Group(), pieces = [];
  G.add(group);
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const r = [lerp(x0, x1, i / nx), lerp(x0, x1, (i + 1) / nx), lerp(z0, z1, k / nz), lerp(z0, z1, (k + 1) / nz)];
    const cx = (r[0] + r[1]) / 2, cz = (r[2] + r[3]) / 2, w = r[1] - r[0], d = r[3] - r[2];
    const mesh = addBox(group, w, H.slab, d, mat, cx, y - H.slab / 2, cz);
    for (const sm of seams) {
      const q = rectAnd(sm, r);
      if (q) addBox(mesh, q[1] - q[0], 0.012, q[3] - q[2], MAT.dark, (q[0] + q[1]) / 2 - cx, H.slab / 2 + 0.006, (q[2] + q[3]) / 2 - cz);
    }
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x050403, alphaMap: CRACK_TEX,
      transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    crack.rotation.set(-Math.PI / 2, 0, rand(0, Math.PI * 2)); crack.position.y = H.slab / 2 + 0.02; mesh.add(crack);
    pieces.push({ mesh, crack, y: y - H.slab / 2, depth: y - TR.floorY(cx, cz, y - H.slab - 0.01), spin: [rand(-1, 1) * F.spin, rand(-1, 1) * F.spin],
                  order: Math.hypot(cx - tx, cz - tz) });
  }
  const far = Math.max(...pieces.map(c => c.order)) || 1;
  for (const c of pieces) c.order /= far;
  return { id: t.id, collapse: t.collapse, trigger: t.trigger, warning: t.warning, y, region: R, group, pieces };
}
// Draw a trap as it stands: whole until it is set off, cracks spreading over it through the warning, then each piece
// drops (one after another, outward) and is gone once it reaches the floor below.
function placeTrap(t) {
  const F = CONFIG.fx.trap, g = CONFIG.gravity;
  const warn = t.state === 'set' ? 0 : t.state === 'warning' && t.warning > 0 ? t.timer / t.warning : 1;
  for (const c of t.pieces) {
    const s = t.state === 'sprung' ? Math.max(0, t.dropTime - c.order * F.dropSpread) : 0, fall = 0.5 * g * s * s;
    c.mesh.visible = fall < c.depth;
    c.mesh.position.y = c.y - fall;
    c.mesh.rotation.set(c.spin[0] * s, 0, c.spin[1] * s);
    c.crack.material.opacity = F.crackOpacity * clamp((warn - c.order * F.crackSpread) / (1 - F.crackSpread), 0, 1);
  }
}
// A gate as it stands (`lift` 0 shut .. 1 open): a portcullis rises; a barricade tips over away from its zone and sinks
// out of sight as it lands.
function placeGate(g) {
  const k = ease(g.lift);
  // `clearGates` levels (v4.3.1): no wall over the doorway, and an open portcullis rises right out of sight, so neither hides the fight.
  if (g.style !== 'barricade') { g.mesh.position.y = g.y + k * (g.clear ? g.liftHeight * 3 : g.liftHeight); g.mesh.visible = !g.clear || g.lift < 1; return; }
  const B = CONFIG.rooms.barricade;
  g.mesh.rotation.z = -g.fall * k * B.topple;
  g.mesh.position.y = g.y - clamp((g.lift - B.sinkFrom) / (1 - B.sinkFrom), 0, 1) * B.sink;
  g.mesh.visible = g.lift < 1;
}
// Every entry of a room level with a gate: its zones, shortcuts and sealed gates.
const gatedEntries = L => [...L.gated, ...(L.shortcuts || []), ...(L.sealed || [])];
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
    for (let i = dust.length - 1; i >= 0; i--) if (dust[i].group === stage.group || dust[i].group.parent === stage.group) dust.splice(i, 1);
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
const STEER_PROPS = new Set(['prop']), STEER_ALL = new Set(['prop', 'house', 'pillar', 'block']);
function makeWorld(def, st) {
  const flat = { groundAt: () => 0, floorY: () => 0, killY: -Infinity, traps: [], hazards: [] };
  if (def.layout === 'arena')
    return { ...flat, minX: -def.halfX, maxX: def.halfX, halfZ: def.halfZ, ceilingAt: () => Infinity, alcoves: [], gates: [], gateThickness: 0, bonfires: def.bonfires };
  if (def.layout === 'rooms') {   // `solids`: walls, rails, ledges and pillars; closed gates are added to them where needed
    const T = st.terrain, holes = [];   // floors opened since the level started (sprung traps)
    return { rooms: def.rooms, regions: T.regions, solids: st.solids, slabs: st.slabs, bonfires: def.bonfires,
             hasProps: (def.props || []).length > 0 || !!def.steer,
             // What chasing and homing enemies walk round (js/character.js): props; with the level's `steer` (v7.0) also
             // houses, pillars and blocks, so nothing presses into a ruin between it and the player.
             steerKinds: def.steer ? STEER_ALL : STEER_PROPS,
             groundAt: (x, z, y) => groundIn(T.regions, x, z, y, holes), ceilingAt: (x, z, y) => ceilingIn(T.regions, x, z, y, holes),
             floorY: (x, z, y = Infinity) => groundIn(T.regions, x, z, y, holes), killY: T.killY,
             gates: st.gates.map(g => ({ ...g, open: false, lift: 0 })),
             // state: 'set' | 'warning' | 'sprung'; timer: into the warning (s); dropTime: since it sprang (s)
             traps: st.traps.map(t => ({ ...t, state: 'set', timer: 0, dropTime: 0 })),
             // Hazard floors (v7.0): a rect on the floor at y that hurts while stood in; timer: s since the last tick
             hazards: (def.hazards || []).map(h => ({ ...h, y: h.y ?? 0, timer: 0 })),
             // A hole opens in a floor for good: bodies fall through it, and sight, bolts and the camera pass.
             openHole(region, rect) {
               holes.push({ region, rect });
               this.slabs = this.slabs.flatMap(s => s.kind !== 'floor' || s.region !== region ? [s]
                 : rectMinus([s.x0, s.x1, s.z0, s.z1], [rect]).map(q => ({ ...s, x0: q[0], x1: q[1], z0: q[2], z1: q[3] })));
             } };
  }
  return { ...flat, minX: 0, maxX: def.length, halfZ: def.halfZ, ceilingAt: () => def.wallHeight, gateThickness: def.gateThickness, bonfires: def.bonfires,
           gates: st.gates.map(g => ({ ...g, y: 0, open: false, lift: 0 })),
           alcoves: def.alcoves.map(a => ({ x0: a.x - def.alcoveWidth / 2, x1: a.x + def.alcoveWidth / 2, side: a.side, depth: def.alcoveDepth })) };
}
let world = null;
