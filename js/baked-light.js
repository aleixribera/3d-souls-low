'use strict';
// ============================================================================
// 9d. Baked light: a level's fixed lights and the moon's shadow, baked once into a light volume
// ============================================================================
// Drawing only, like section 9b: it reads the stage and never changes the game.
//
// When a stage is dressed, every fixed point light of the level (room fills, lamps, torches, braziers, bonfires,
// burning windows) is baked into a grid of `cell` m cells over the level. Each light's reach is tested against the
// level's walls, floors, roofs, houses and blocks (its terrain), cell by cell outward from the light, so a wall casts
// a shadow and a closed room keeps its light in. The moon's visibility (open sky or under a roof, in a house's shadow)
// is swept through the same grid. Two small 3D textures hold the result:
//   A: rgb the light's colour (encoded, `encode`), a the moon's visibility;   B: xyz the light's main direction.
// Every lit material (level, characters, effects) reads them at its surface: the main direction lights it as one more
// light through the material's own shading (diffuse and highlight), the rest of the light as soft fill, and on a preset
// without a moon shadow map the moon is dimmed where the grid says it is hidden.
// A preset with `baked` lights the level from the volume: no pooled point light is drawn (the effect lights stay) and,
// without `shadows`, no moon shadow map. A bonfire lit later (`litBy`) is added to the volume when it lights.
const bakedLight = (() => {
  const B = VIS.baked;
  // ---- the shaders: every lit material reads the volume where it defines BAKED_LIGHT --------------------------------
  const U = {
    bkA: { value: null }, bkB: { value: null }, bkOrigin: { value: new THREE.Vector3() }, bkInvSize: { value: new THREE.Vector3(1, 1, 1) },
    bkMoonOn: { value: 0 }, bkGain: { value: 1 },
  };
  const C = THREE.ShaderChunk;
  C.common += `
#ifdef BAKED_LIGHT
varying vec3 vBkW;
#endif`;
  C.worldpos_vertex += `
#ifdef BAKED_LIGHT
{ vec4 bkP = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  bkP = batchingMatrix * bkP;
#endif
#ifdef USE_INSTANCING
  bkP = instanceMatrix * bkP;
#endif
  vBkW = ( modelMatrix * bkP ).xyz; }
#endif`;
  C.lights_pars_begin += `
#ifdef BAKED_LIGHT
uniform highp sampler3D bkA, bkB;
uniform vec3 bkOrigin, bkInvSize;
uniform float bkMoonOn, bkGain;
#endif`;
  // Sampled half a cell off the surface (so a wall reads the air in front of it, not the wall), then decoded.
  const SAMPLE = `
#ifdef BAKED_LIGHT
  vec3 bkUv = ( vBkW + inverseTransformDirection( normal, viewMatrix ) * ${B.offset.toFixed(3)} - bkOrigin ) * bkInvSize;
  vec4 bkTa = texture( bkA, bkUv );
  vec3 bkE = bkTa.rgb * bkTa.rgb;
  vec3 bkCol = ${B.encode.toFixed(3)} * bkE / max( 1.0 - bkE, 0.02 ) * bkGain;
  vec3 bkD = texture( bkB, bkUv ).xyz * 2.0 - 1.0;
  float bkS = clamp( length( bkD ), 0.0, 1.0 );
  float bkMoon = mix( 1.0, bkTa.a, bkMoonOn );
#endif
`;
  const DIRECT = `
#if defined( BAKED_LIGHT ) && defined( RE_Direct )
  if ( bkS > 0.002 ) {
    directLight.direction = normalize( ( viewMatrix * vec4( bkD, 0.0 ) ).xyz );
    directLight.color = bkCol * bkS;
    directLight.visible = true;
    RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  }
#endif
#if defined( RE_IndirectDiffuse )`;
  const begin = C.lights_fragment_begin;
  const patched = (SAMPLE + begin)
    .replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight );\n#ifdef BAKED_LIGHT\n\t\tdirectLight.color *= bkMoon;\n#endif')
    .replace('#if defined( RE_IndirectDiffuse )\n\tvec3 iblIrradiance', DIRECT + '\n\tvec3 iblIrradiance')
    .replace('vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );',
      `vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );\n#ifdef BAKED_LIGHT\n\tirradiance += bkCol * ( 1.0 - bkS ) * ${B.fill.toFixed(3)};\n#endif`);
  if (patched === SAMPLE + begin || !patched.includes('bkMoon;') || !patched.includes('bkS > 0.002') || !patched.includes('( 1.0 - bkS )'))
    throw new Error('baked light: three.js lights chunk changed; js/baked-light.js needs updating');
  C.lights_fragment_begin = patched;

  // ---- the volume ---------------------------------------------------------------------------------------------------
  let vol = null;   // { nx, ny, nz, cell, ox, oy, oz, solid, rgb, dir, moon, texA, texB, def, baked: Map(light -> intensity) }
  const lum = c => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  // The boxes that stop light, per layout (each { x0, x1, y0, y1, z0, z1 }), and the volume's bounds.
  function occluders(def, built) {
    if (def.layout === 'rooms') {
      const T = terrainFor(def), boxes = [...T.solids.filter(b => !b.low && b.kind !== 'prop'), ...T.slabs.map(b => b.kind === 'roof' ? { ...b, roof: true } : b)];
      const R = T.regions;
      const lo = Math.min(...R.map(r => r.lo)) - 1, hi = Math.max(...R.map(r => r.top), ...boxes.map(b => b.y1)) + 1;
      return { boxes, x0: Math.min(...R.map(r => r.rect[0])) - 2, x1: Math.max(...R.map(r => r.rect[1])) + 2,
               z0: Math.min(...R.map(r => r.rect[2])) - 2, z1: Math.max(...R.map(r => r.rect[3])) + 2, y0: lo, y1: hi };
    }
    if (def.layout === 'hall') {
      const S = { ...HALL_STYLE, ...(def.style || {}) }, L = def, hz = L.halfZ, wh = L.wallHeight, d = L.alcoveDepth, aw = L.alcoveWidth / 2;
      const zMax = hz + d + 1, boxes = [
        { x0: -2, x1: L.length + 2, y0: -2, y1: 0, z0: -zMax, z1: zMax },            // floor
        { x0: -2, x1: L.length + 2, y0: wh, y1: wh + 1, z0: -zMax, z1: zMax, roof: true },   // ceiling
        { x0: -2, x1: 0, y0: 0, y1: wh, z0: -zMax, z1: zMax }, { x0: L.length, x1: L.length + 2, y0: 0, y1: wh, z0: -zMax, z1: zMax },
      ];
      for (const side of [1, -1]) {   // the side walls, broken by the alcoves (each roofed at the alcove's height)
        const gaps = L.alcoves.filter(a => a.side === side).map(a => [a.x - aw, a.x + aw]).sort((a, b) => a[0] - b[0]);
        let from = -2;
        const zs = side > 0 ? [hz, zMax] : [-zMax, -hz];
        for (const [g0, g1] of [...gaps, [L.length + 2, L.length + 2]]) { if (g0 > from) boxes.push({ x0: from, x1: g0, y0: 0, y1: wh, z0: zs[0], z1: zs[1] }); from = g1; }
        for (const [g0, g1] of gaps) {
          boxes.push({ x0: g0, x1: g1, y0: S.alcoveHeight, y1: wh, z0: zs[0], z1: zs[1] });   // the wall over the opening
          boxes.push(side > 0 ? { x0: g0, x1: g1, y0: 0, y1: wh, z0: hz + d, z1: zMax } : { x0: g0, x1: g1, y0: 0, y1: wh, z0: -zMax, z1: -hz - d });
        }
      }
      return { boxes, x0: -2, x1: L.length + 2, z0: -zMax, z1: zMax, y0: -1, y1: wh + 1 };
    }
    const A = def, t = A.wallThickness || 1, h = A.wallHeight || 6;   // arena: a walled yard under the sky
    return { boxes: [{ x0: -A.halfX - 8, x1: A.halfX + 8, y0: -2, y1: 0, z0: -A.halfZ - 8, z1: A.halfZ + 8 },
      { x0: -A.halfX - t, x1: -A.halfX, y0: 0, y1: h, z0: -A.halfZ - t, z1: A.halfZ + t }, { x0: A.halfX, x1: A.halfX + t, y0: 0, y1: h, z0: -A.halfZ - t, z1: A.halfZ + t },
      { x0: -A.halfX, x1: A.halfX, y0: 0, y1: h, z0: -A.halfZ - t, z1: -A.halfZ }, { x0: -A.halfX, x1: A.halfX, y0: 0, y1: h, z0: A.halfZ, z1: A.halfZ + t }],
      x0: -A.halfX - 3, x1: A.halfX + 3, z0: -A.halfZ - 3, z1: A.halfZ + 3, y0: -1, y1: h + 4 };
  }
  // The fixed point lights of a stage: a culled level's sources, or every point light in its group but the pool's.
  function stageLights(built) {
    if (built.lightSources) return built.lightSources.slice();
    const out = [], pool = new Set(built.lightPool || []);
    built.group.traverse(o => { if (o.isPointLight && !pool.has(o)) out.push(o); });
    return out;
  }

  // Offsets of a cell from the light's cell, nearest first, each with the point two cells back toward the light
  // (its floor cell and fractions): a cell sees the light as well as that point does (read from cells already done).
  // The cells the ray crosses in between (0.5, 1 and 1.5 cells back, never the light's own) are checked as well, so
  // a wall one cell thick still stops the light (`ck`: up to three offsets, `cn` of them).
  let offsets = null, offsetsR = 0;
  function offsetTable(R) {
    if (offsets && offsetsR >= R) return offsets;
    const list = [];
    for (let z = -R; z <= R; z++) for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, y, z); if (d <= R + 0.5) list.push([x, y, z, d]);
    }
    list.sort((a, b) => a[3] - b[3]);
    const n = list.length, o = { n, x: new Int8Array(n), y: new Int8Array(n), z: new Int8Array(n), d: new Float32Array(n),
      bx: new Int8Array(n), by: new Int8Array(n), bz: new Int8Array(n), fx: new Float32Array(n), fy: new Float32Array(n), fz: new Float32Array(n),
      cn: new Uint8Array(n), ck: new Int8Array(n * 9) };
    list.forEach(([x, y, z, d], i) => {
      o.x[i] = x; o.y[i] = y; o.z[i] = z; o.d[i] = d;
      for (const t of [0.5, 1, 1.5]) {
        if (t > d - 0.4) break;
        const k = (d - t) / d, cx = Math.round(x * k), cy = Math.round(y * k), cz = Math.round(z * k);
        if ((cx === 0 && cy === 0 && cz === 0) || (cx === x && cy === y && cz === z)) continue;
        const c = o.cn[i]++; o.ck[i * 9 + c * 3] = cx; o.ck[i * 9 + c * 3 + 1] = cy; o.ck[i * 9 + c * 3 + 2] = cz;
      }
      if (d <= 2) return;
      const k = (d - 2) / d, px = x * k, py = y * k, pz = z * k, fx = Math.floor(px), fy = Math.floor(py), fz = Math.floor(pz);
      o.bx[i] = fx; o.by[i] = fy; o.bz[i] = fz; o.fx[i] = px - fx; o.fy[i] = py - fy; o.fz[i] = pz - fz;
    });
    offsets = o; offsetsR = R;
    return o;
  }

  function crossesSolid(V, O, i, cx, cy, cz) {
    for (let c = 0, b = i * 9; c < O.cn[i]; c++, b += 3) {
      const x = cx + O.ck[b], y = cy + O.ck[b + 1], z = cz + O.ck[b + 2];
      if (x >= 0 && y >= 0 && z >= 0 && x < V.nx && y < V.ny && z < V.nz && V.solid[(z * V.ny + y) * V.nx + x]) return true;
    }
    return false;
  }
  // Add (sign 1) or remove (sign -1) one light's share of the volume.
  let local = new Float32Array(0);
  function addLight(V, light, intensity, sign) {
    if (!(intensity > 0)) return;
    const { nx, ny, nz, cell, solid, rgb, dir } = V;
    const p = V.pos.get(light), range = light.distance > 0 ? Math.min(light.distance, B.range) : B.openRange;
    const R = Math.min(B.maxCells, Math.ceil(range / cell)), O = offsetTable(R), side = 2 * R + 1, side2 = side * side;
    if (local.length < side2 * side) local = new Float32Array(side2 * side);
    const cx = Math.round((p.x - V.ox) / cell - 0.5), cy = Math.round((p.y - V.oy) / cell - 0.5), cz = Math.round((p.z - V.oz) / cell - 0.5);
    const cr = light.color.r * intensity * sign, cg = light.color.g * intensity * sign, cb = light.color.b * intensity * sign;
    const L = lum(light.color) * intensity * sign, decay = light.decay, cut = light.distance > 0 ? light.distance : range;
    const at = (x, y, z) => local[(z + R) * side2 + (y + R) * side + x + R];
    for (let i = 0; i < O.n && O.d[i] <= R + 0.5; i++) {
      const ox = O.x[i], oy = O.y[i], oz = O.z[i], gx = cx + ox, gy = cy + oy, gz = cz + oz;
      const inside = gx >= 0 && gy >= 0 && gz >= 0 && gx < nx && gy < ny && gz < nz, g = inside ? (gz * ny + gy) * nx + gx : -1;
      let v;
      if (i === 0) v = 1;
      else if (inside && solid[g]) v = 0;
      else if (crossesSolid(V, O, i, cx, cy, cz)) v = 0;
      else if (O.d[i] <= 2) v = 1;
      else {
        const bx = O.bx[i], by = O.by[i], bz = O.bz[i], fx = O.fx[i], fy = O.fy[i], fz = O.fz[i];
        const a = at(bx, by, bz) * (1 - fx) + at(bx + 1, by, bz) * fx, b = at(bx, by + 1, bz) * (1 - fx) + at(bx + 1, by + 1, bz) * fx;
        const c = at(bx, by, bz + 1) * (1 - fx) + at(bx + 1, by, bz + 1) * fx, d = at(bx, by + 1, bz + 1) * (1 - fx) + at(bx + 1, by + 1, bz + 1) * fx;
        v = (a * (1 - fy) + b * fy) * (1 - fz) + (c * (1 - fy) + d * fy) * fz;
      }
      local[(oz + R) * side2 + (oy + R) * side + ox + R] = v;
      if (!inside || v <= 0.001) continue;
      const wx = V.ox + (gx + 0.5) * cell, wy = V.oy + (gy + 0.5) * cell, wz = V.oz + (gz + 0.5) * cell;
      const dx = p.x - wx, dy = p.y - wy, dz = p.z - wz, dist = Math.max(Math.hypot(dx, dy, dz), 0.05);
      const q = dist / cut, win = q >= 1 ? 0 : (1 - q * q * q * q) ** 2;
      if (win <= 0) continue;
      const k = v * win / Math.max(dist ** decay, 0.01), j = g * 3;
      rgb[j] += cr * k; rgb[j + 1] += cg * k; rgb[j + 2] += cb * k;
      const kd = L * k / dist; dir[j] += dx * kd; dir[j + 1] += dy * kd; dir[j + 2] += dz * kd;
    }
  }
  // The moon's visibility: swept slice by slice from the moon's side, each cell as visible as the point one cell
  // nearer the moon (bilinear in the slice before it); beyond the grid is open sky.
  function sweepMoon(V, toMoon) {
    const { nx, ny, nz, solid, moon } = V, n = [nx, ny, nz], d = [toMoon.x, toMoon.y, toMoon.z];
    const ax = [0, 1, 2].reduce((m, a) => Math.abs(d[a]) > Math.abs(d[m]) ? a : m, 0), s = Math.sign(d[ax]) || 1;
    const step = d.map(v => v / Math.abs(d[ax])), [u, w] = [0, 1, 2].filter(a => a !== ax);
    const idx = c => (c[2] * ny + c[1]) * nx + c[0], c = [0, 0, 0], q = [0, 0, 0];
    const vis = (i, j, slice) => {   // the visibility at cell (u = i, w = j) of a slice already swept; outside it, sky
      if (i < 0 || j < 0 || i >= n[u] || j >= n[w]) return 1;
      q[ax] = slice; q[u] = i; q[w] = j; return moon[idx(q)];
    };
    for (let t = 0; t < n[ax]; t++) {
      const a = s > 0 ? n[ax] - 1 - t : t, up = a + s;
      for (let j = 0; j < n[w]; j++) for (let i = 0; i < n[u]; i++) {
        c[ax] = a; c[u] = i; c[w] = j;
        const g = idx(c);
        if (solid[g] === 1) { moon[g] = 0; continue; }
        if (up < 0 || up >= n[ax]) { moon[g] = 1; continue; }
        const pu = i + step[u], pw = j + step[w], iu = Math.floor(pu), iw = Math.floor(pw), fu = pu - iu, fw = pw - iw;
        moon[g] = (vis(iu, iw, up) * (1 - fu) + vis(iu + 1, iw, up) * fu) * (1 - fw) + (vis(iu, iw + 1, up) * (1 - fu) + vis(iu + 1, iw + 1, up) * fu) * fw;
      }
    }
  }
  // Encode into the two RGBA8 textures (rgb: sqrt(c / (c + encode)), so dim light keeps its precision).
  // A solid cell takes the mean of its open neighbours, so a surface's sample, which blends the cells round it, does
  // not darken where it leans into the wall or floor behind it.
  const cellRgb = new Float32Array(3), cellDir = new Float32Array(3);
  function cellValue(V, g) {
    const { nx, ny, nz, solid, rgb, dir, moon } = V;
    cellRgb.fill(0); cellDir.fill(0);
    if (!solid[g]) {
      for (let c = 0; c < 3; c++) { cellRgb[c] = rgb[g * 3 + c]; cellDir[c] = dir[g * 3 + c]; }
      return moon[g];
    }
    const x = g % nx, y = Math.floor(g / nx) % ny, z = Math.floor(g / (nx * ny));
    let n = 0, m = 0;
    for (let s = 0; s < 6; s++) {
      const a = s >> 1, d = s & 1 ? 1 : -1, X = x + (a === 0 ? d : 0), Y = y + (a === 1 ? d : 0), Z = z + (a === 2 ? d : 0);
      if (X < 0 || Y < 0 || Z < 0 || X >= nx || Y >= ny || Z >= nz) continue;
      const h = (Z * ny + Y) * nx + X;
      if (solid[h]) continue;
      for (let c = 0; c < 3; c++) { cellRgb[c] += rgb[h * 3 + c]; cellDir[c] += dir[h * 3 + c]; }
      m += moon[h]; n++;
    }
    if (!n) return 0;
    for (let c = 0; c < 3; c++) { cellRgb[c] /= n; cellDir[c] /= n; }
    return m / n;
  }
  function upload(V) {
    const N = V.nx * V.ny * V.nz, a = V.texA.image.data, b = V.texB.image.data, K = B.encode;
    for (let g = 0, k = 0; g < N; g++, k += 4) {
      const moon = cellValue(V, g);
      for (let c = 0; c < 3; c++) { const x = Math.max(0, cellRgb[c]); a[k + c] = Math.round(255 * Math.sqrt(x / (x + K))); }
      a[k + 3] = Math.round(255 * moon);
      const l = Math.max(1e-6, 0.2126 * Math.max(0, cellRgb[0]) + 0.7152 * Math.max(0, cellRgb[1]) + 0.0722 * Math.max(0, cellRgb[2]));
      for (let c = 0; c < 3; c++) b[k + c] = Math.round(255 * (0.5 + 0.5 * clamp(cellDir[c] / l, -1, 1)));
      b[k + 3] = 255;
    }
    V.texA.needsUpdate = V.texB.needsUpdate = true;
  }
  function tex(V) {
    const t = new THREE.Data3DTexture(new Uint8Array(V.nx * V.ny * V.nz * 4), V.nx, V.ny, V.nz);
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
    t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
    t.unpackAlignment = 1;
    return t;
  }

  function bake(def, built) {
    const t0 = performance.now();
    drop();
    const O = occluders(def, built);
    let cell = B.cell, nx, ny, nz;
    for (;;) {   // a coarser grid on a very large level, so the volume stays within `maxVolume` cells
      nx = Math.ceil((O.x1 - O.x0) / cell); ny = Math.ceil((O.y1 - O.y0) / cell); nz = Math.ceil((O.z1 - O.z0) / cell);
      if (nx * ny * nz <= B.maxVolume) break;
      cell *= 1.25;
    }
    const N = nx * ny * nz, V = { nx, ny, nz, cell, ox: O.x0, oy: O.y0, oz: O.z0, solid: new Uint8Array(N),
      rgb: new Float32Array(N * 3), dir: new Float32Array(N * 3), moon: new Float32Array(N), def, baked: new Map(), pos: new Map(), ms: 0 };
    // A cell is solid when its centre lies in a box grown by `pad` (so thin walls and slabs still stop light): 1 stops
    // every light, 2 (a roof or ceiling) only the point lights. Roofs cast no moon shadow, as they never did in the
    // moon's shadow map (MAT.ceiling casts none): a roofed room keeps its share of the moon (moonScale).
    const P = B.pad;
    for (const b of O.boxes) {
      const i0 = Math.max(0, Math.ceil((b.x0 - P - V.ox) / cell - 0.5)), i1 = Math.min(nx - 1, Math.floor((b.x1 + P - V.ox) / cell - 0.5));
      const j0 = Math.max(0, Math.ceil((b.y0 - P - V.oy) / cell - 0.5)), j1 = Math.min(ny - 1, Math.floor((b.y1 + P - V.oy) / cell - 0.5));
      const k0 = Math.max(0, Math.ceil((b.z0 - P - V.oz) / cell - 0.5)), k1 = Math.min(nz - 1, Math.floor((b.z1 + P - V.oz) / cell - 0.5));
      const f = b.roof ? 2 : 1;
      for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const g = (k * ny + j) * nx + i; if (V.solid[g] !== 1) V.solid[g] = f; }
    }
    sweepMoon(V, moonLight.position.clone().normalize());
    const lights = stageLights(built);
    for (const l of lights) { V.pos.set(l, l.getWorldPosition(new THREE.Vector3())); V.baked.set(l, l.intensity); addLight(V, l, l.intensity, 1); }
    V.texA = tex(V); V.texB = tex(V);
    upload(V);
    vol = V;
    U.bkA.value = V.texA; U.bkB.value = V.texB;
    U.bkOrigin.value.set(V.ox, V.oy, V.oz); U.bkInvSize.value.set(1 / (nx * cell), 1 / (ny * cell), 1 / (nz * cell));
    V.lights = lights.length; V.ms = Math.round(performance.now() - t0);
  }
  function drop() {
    if (!vol) return;
    vol.texA.dispose(); vol.texB.dispose(); vol = null;
    U.bkA.value = U.bkB.value = null;
  }

  // ---- materials ----------------------------------------------------------------------------------------------------
  // A lit material reads the volume while a baked preset is on: BAKED_LIGHT in its defines (a separate program) and
  // the shared uniforms added when it compiles. The material's own program key is kept.
  const active = () => !!vol && !!visuals.quality().baked;
  function prepare(m) {
    if (!(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return;
    if (m.userData.bkWrap !== m.onBeforeCompile) {
      const own = m.onBeforeCompile, ownKey = Object.prototype.hasOwnProperty.call(m, 'customProgramCacheKey') ? m.customProgramCacheKey : null;
      // The uniforms always: three reuses a key's last uniforms when the define comes back.
      const wrap = function (sh, r) { own.call(this, sh, r); Object.assign(sh.uniforms, U); };
      m.onBeforeCompile = wrap; m.userData.bkWrap = wrap;
      m.customProgramCacheKey = ownKey ? function () { return ownKey.call(this); } : () => own.toString();
      m.needsUpdate = true;
    }
    const want = active(), has = !!(m.defines && 'BAKED_LIGHT' in m.defines);
    if (want === has) return;
    if (want) { m.defines = { ...(m.defines || {}), BAKED_LIGHT: '' }; }
    else { const d = { ...m.defines }; delete d.BAKED_LIGHT; m.defines = d; }
    m.needsUpdate = true;
  }

  // ---- hooks --------------------------------------------------------------------------------------------------------
  let last = null;   // the stage last dressed, baked or not
  visuals.hooks.stage.push((def, built) => {
    last = { def, built };
    try { if (visuals.quality().baked) bake(def, built); else drop(); }
    catch (e) { console.error('baked light:', e); drop(); }
  });
  visuals.hooks.quality.push(q => {
    if (!q.baked) { drop(); return; }
    if (!vol && last && stage && stage.group === last.built.group) {   // a baked preset chosen in a level: bake it now
      try { bake(last.def, last.built); } catch (e) { console.error('baked light:', e); drop(); }
    }
  });
  visuals.hooks.beforeDraw.push(q => {
    U.bkMoonOn.value = vol && !q.shadows ? 1 : 0;
    if (!vol || !stage) return;
    let changed = false;   // a bonfire lit later (`litBy`): its light joins the volume when it lights, leaves if it goes out
    if (stage.bonfireFires) for (const f of stage.bonfireFires) {
      const l = f.flame.light, want = f.flame.base > 0 ? f.base : 0, had = vol.baked.get(l) || 0;
      if (!l || want === had) continue;
      if (!vol.pos.has(l)) vol.pos.set(l, l.getWorldPosition(new THREE.Vector3()));
      addLight(vol, l, had, -1); addLight(vol, l, want, 1); vol.baked.set(l, want); changed = true;
    }
    if (changed) upload(vol);
  });

  return {
    active, prepare,
    // Tests and tools: what was baked, and the decoded light and moon at a world point (nearest cell).
    info: () => vol ? { cells: [vol.nx, vol.ny, vol.nz], cell: vol.cell, lights: vol.lights, ms: vol.ms, active: active() } : null,
    at(x, y, z) {
      if (!vol) return null;
      const V = vol, i = Math.floor((x - V.ox) / V.cell), j = Math.floor((y - V.oy) / V.cell), k = Math.floor((z - V.oz) / V.cell);
      if (i < 0 || j < 0 || k < 0 || i >= V.nx || j >= V.ny || k >= V.nz) return null;
      const g = (k * V.ny + j) * V.nx + i;
      return { light: lum({ r: V.rgb[g * 3], g: V.rgb[g * 3 + 1], b: V.rgb[g * 3 + 2] }), moon: V.moon[g], solid: !!V.solid[g] };
    },
  };
})();
