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
  // One projection per triangle needs its own three corners.
  const m = index.length, p2 = new Float32Array(m * 3), n2 = new Float32Array(m * 3), uv = new Float32Array(m * 2), seq = m > 65535 ? new Uint32Array(m) : new Uint16Array(m);
  for (let t = 0; t < m; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const fx = Math.abs(uy * vz - uz * vy), fy = Math.abs(uz * vx - ux * vz), fz = Math.abs(ux * vy - uy * vx);
    const s = fx >= fy && fx >= fz ? [2, 1] : fy >= fz ? [0, 2] : [0, 1];
    for (let k = 0; k < 3; k++) {
      const v = index[t + k] * 3, o = t + k; seq[o] = o;
      p2[o * 3] = pos[v]; p2[o * 3 + 1] = pos[v + 1]; p2[o * 3 + 2] = pos[v + 2];
      n2[o * 3] = normal[v]; n2[o * 3 + 1] = normal[v + 1]; n2[o * 3 + 2] = normal[v + 2];
      uv[o * 2] = pos[v + s[0]] / tile; uv[o * 2 + 1] = pos[v + s[1]] / tile;
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(p2, 3)); g.setAttribute('normal', new THREE.BufferAttribute(n2, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(seq, 1));
  return g;
}
// A kit part: `mesh`, modelled at the rig's rest pose in one piece per bone, moved into its bone's frame.
KIT.parts.baked = (o, M, bind) => {
  const g = bakedGeometry(o.mesh, { tile: o.tile ?? 0.5 }), rest = new THREE.Vector3().setFromMatrixPosition(bind[o.bone]);
  g.translate(-rest.x, -rest.y, -rest.z);
  return [g];
};
