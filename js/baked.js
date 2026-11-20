'use strict';
// ============================================================================
// Baked meshes (v7.20): models built in Blender, packed by tools/pack-baked.cjs into js/baked/*.js
// ============================================================================
// bakedGeometry(name, { tile, plan }) decodes one into an indexed geometry the kit and the stage can use. Blender's UVs are
// dropped (except a mesh painted from an atlas): the game's tiling textures go on by projecting each triangle along its
// main axis, `tile` metres to a repeat. `plan`: a single projection from above, keeping the mesh's own indices (terrain).
function bakedBytes(text) {
  const bin = atob(text), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
function bakedGeometry(name, { tile = 1, plan = false } = {}) {
  const B = BAKED[name], n = B.n, raw = new Int16Array(bakedBytes(B.p)), nor = new Int8Array(bakedBytes(B.q));
  const index = B.wide ? new Uint32Array(bakedBytes(B.i)) : new Uint16Array(bakedBytes(B.i));
  const pos = new Float32Array(n * 3), normal = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) {
    const k = i % 3;
    pos[i] = B.min[k] + (raw[i] + 32767) / 65534 * B.span[k]; normal[i] = nor[i] / 127;
  }
  const g = new THREE.BufferGeometry();
  if (B.t || plan) {
    const uv = new Float32Array(n * 2);
    if (B.t) { const t = new Uint16Array(bakedBytes(B.t)); for (let i = 0; i < n * 2; i++) uv[i] = t[i] / 65535; }
    else for (let i = 0; i < n; i++) { uv[i * 2] = pos[i * 3] / tile; uv[i * 2 + 1] = pos[i * 3 + 2] / tile; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(index, 1));
    return g;
  }
  // One projection per triangle, along its main axis. A corner is the same vertex projected the same way wherever it
  // recurs (its uv is a function of its position and the axis), so triangles that share a vertex and an axis share it
  // (v7.30.0); before, every triangle had its own three corners.
  const m = index.length, AXES = [[2, 1], [0, 2], [0, 1]], slot = new Int32Array(n * 3).fill(-1);
  const p2 = new Float32Array(m * 3), n2 = new Float32Array(m * 3), uv = new Float32Array(m * 2), seq = m > 65535 ? new Uint32Array(m) : new Uint16Array(m);
  let used = 0;
  for (let t = 0; t < m; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const fx = Math.abs(uy * vz - uz * vy), fy = Math.abs(uz * vx - ux * vz), fz = Math.abs(ux * vy - uy * vx);
    const axis = fx >= fy && fx >= fz ? 0 : fy >= fz ? 1 : 2, s = AXES[axis];
    for (let k = 0; k < 3; k++) {
      const i = index[t + k], key = i * 3 + axis;
      if (slot[key] < 0) {
        const v = i * 3, o = slot[key] = used++;
        p2[o * 3] = pos[v]; p2[o * 3 + 1] = pos[v + 1]; p2[o * 3 + 2] = pos[v + 2];
        n2[o * 3] = normal[v]; n2[o * 3 + 1] = normal[v + 1]; n2[o * 3 + 2] = normal[v + 2];
        uv[o * 2] = pos[v + s[0]] / tile; uv[o * 2 + 1] = pos[v + s[1]] / tile;
      }
      seq[t + k] = slot[key];
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(p2.slice(0, used * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(n2.slice(0, used * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv.slice(0, used * 2), 2)); g.setIndex(new THREE.BufferAttribute(seq, 1));
  return g;
}
// A kit part: `mesh`, modelled at the rig's rest pose in one piece per bone, moved into its bone's frame.
KIT.parts.baked = (o, M, bind) => {
  const g = bakedGeometry(o.mesh, { tile: o.tile ?? 0.5 }), rest = new THREE.Vector3().setFromMatrixPosition(bind[o.bone]);
  g.translate(-rest.x, -rest.y, -rest.z);
  return [g];
};
// Boss v2 skinned mesh & animation clip decoder (tools/pack-baked.cjs `skinned: true`).
// Decodes 4-bone smooth vertex skinning (`skinIndex`, `skinWeight`) and quantized animation clips once per rig id.
const BAKED_RIG_CACHE = new Map();
function decodeBakedSkinnedMesh(B, tile = 0.5) {
  const n = B.n, raw = new Int16Array(bakedBytes(B.p)), nor = new Int8Array(bakedBytes(B.q));
  const index = B.wide ? new Uint32Array(bakedBytes(B.i)) : new Uint16Array(bakedBytes(B.i));
  const pos = new Float32Array(n * 3), normal = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let i = 0; i < n * 3; i++) {
    const k = i % 3;
    pos[i] = B.min[k] + (raw[i] + 32767) / 65534 * B.span[k];
    normal[i] = nor[i] / 127;
  }
  if (B.t) {
    const t = new Uint16Array(bakedBytes(B.t));
    for (let i = 0; i < n * 2; i++) uv[i] = t[i] / 65535;
  } else {
    for (let i = 0; i < n; i++) {
      const nx = Math.abs(normal[i * 3]), ny = Math.abs(normal[i * 3 + 1]), nz = Math.abs(normal[i * 3 + 2]);
      if (nx >= ny && nx >= nz) { uv[i * 2] = pos[i * 3 + 2] / tile; uv[i * 2 + 1] = pos[i * 3 + 1] / tile; }
      else if (ny >= nz) { uv[i * 2] = pos[i * 3] / tile; uv[i * 2 + 1] = pos[i * 3 + 2] / tile; }
      else { uv[i * 2] = pos[i * 3] / tile; uv[i * 2 + 1] = pos[i * 3 + 1] / tile; }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (B.j && B.w) {
    const j8 = new Uint8Array(bakedBytes(B.j)), w8 = new Uint8Array(bakedBytes(B.w));
    const skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) { skinIndex[i] = j8[i]; skinWeight[i] = w8[i] / 255; }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  }
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}
function decodeBakedRig(id, tile = 0.5) {
  if (BAKED_RIG_CACHE.has(id)) return BAKED_RIG_CACHE.get(id);
  const raw = typeof BAKED_RIGS !== 'undefined' && BAKED_RIGS[id];
  if (!raw) throw new Error(`Unknown baked skinned rig "${id}".`);
  const meshes = raw.meshes.map(m => ({ slot: m.slot, geo: decodeBakedSkinnedMesh(m, tile) }));
  const clips = {};
  for (const [name, c] of Object.entries(raw.clips || {})) {
    clips[name] = {
      duration: c.duration,
      tracks: c.tracks.map(tr => {
        const tMs = new Uint16Array(bakedBytes(tr.t)), times = new Float32Array(tMs.length);
        for (let i = 0; i < tMs.length; i++) times[i] = tMs[i] / 1000;
        const v16 = new Int16Array(bakedBytes(tr.v));
        const values = new Float32Array(v16.length);
        if (tr.k === 'r') {
          for (let i = 0; i < v16.length; i++) values[i] = v16[i] / 32767;
        } else {
          for (let i = 0; i < v16.length; i++) {
            const cIdx = i % 3;
            values[i] = tr.min[cIdx] + (v16[i] + 32767) / 65534 * tr.span[cIdx];
          }
        }
        return { bone: tr.b, kind: tr.k, times, values };
      }),
    };
  }
  const out = { bones: raw.bones, meshes, clips };
  BAKED_RIG_CACHE.set(id, out);
  return out;
}
