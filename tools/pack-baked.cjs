'use strict';
// Packs Blender exports into scripts the game can load from file:// (no fetch, no build step):
//   node tools/pack-baked.cjs [file ...]      (default: every file in FILES)
// reads tools/blender/out/*.glb and writes one js/baked/<file>.js per entry of FILES: every mesh quantised (positions
// int16 in its own bounds, normals int8, indices uint16 or uint32) as base64, one entry per glTF object name, added to
// the shared BAKED table; snow-church.js also carries the prop placements of snow_land.places.json. js/baked.js decodes
// them. The server never loads these files (they are not under data/ or levels/).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'tools/blender/out');
// Each output file and the Blender scripts (tools/blender/<stem>.py) whose exports it holds.
const FILES = {
  'snow-church': { sources: ['antlered_beast', 'church', 'snow_land'], places: 'snow_land.places.json' },
  'wanderer': { sources: ['wanderer'] },
  'hollow': { sources: ['hollow'] },
  'lancer': { sources: ['lancer'] },
  'knight': { sources: ['knight'] },
  'rogue': { sources: ['rogue'] },
  'duelist': { sources: ['duelist'] },
  'warden': { sources: ['warden'] },
  'bowman': { sources: ['bowman'] },
  'wisp': { sources: ['wisp'] },
  'executioner': { sources: ['executioner'] },
  'shover': { sources: ['shover'] },
  'gargoyle': { sources: ['gargoyle'] },
  'sentinel': { sources: ['sentinel'] },
  'captain': { sources: ['captain'] },
  'bellwarden': { sources: ['bellwarden'] },
  'giant': { sources: ['giant'] },
  'aldric': { sources: ['aldric'] },
  'ostrey': { sources: ['ostrey'] },
  'castellans': { sources: ['castellans'] },
  'ringer': { sources: ['ringer'] },
  'hollis': { sources: ['hollis'] },
  'oswin': { sources: ['oswin'] },
};

function readGlb(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const jsonLen = b.readUInt32LE(12), json = JSON.parse(b.toString('utf8', 20, 20 + jsonLen));
  return { json, bin: b.subarray(20 + jsonLen + 8) };
}
const COMPONENT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function accessor({ json, bin }, i) {
  const a = json.accessors[i], v = json.bufferViews[a.bufferView], T = COMPONENT[a.componentType], n = a.count * SIZE[a.type];
  const at = (v.byteOffset || 0) + (a.byteOffset || 0), out = new T(n), step = T.BYTES_PER_ELEMENT;
  const view = new DataView(bin.buffer, bin.byteOffset + at, n * step);
  for (let k = 0; k < n; k++) out[k] = step === 4 ? (T === Float32Array ? view.getFloat32(k * 4, true) : view.getUint32(k * 4, true)) : step === 2 ? view.getUint16(k * 2, true) : view.getUint8(k);
  return out;
}
const b64 = typed => Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength).toString('base64');
const round = v => Math.round(v * 1e4) / 1e4;
function pack(glb, prim) {
  const pos = accessor(glb, prim.attributes.POSITION), nor = accessor(glb, prim.attributes.NORMAL), idx = accessor(glb, prim.indices);
  const n = pos.length / 3, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n * 3; i++) { const k = i % 3; min[k] = Math.min(min[k], pos[i]); max[k] = Math.max(max[k], pos[i]); }
  const span = max.map((v, k) => Math.max(v - min[k], 1e-6)), p = new Int16Array(n * 3), q = new Int8Array(n * 3);
  for (let i = 0; i < n * 3; i++) { const k = i % 3; p[i] = Math.round((pos[i] - min[k]) / span[k] * 65534 - 32767); q[i] = Math.round(nor[i] * 127); }
  const out = { min: min.map(round), span: span.map(round), n, p: b64(p), q: b64(q) };
  out.i = b64(n > 65535 ? Uint32Array.from(idx) : Uint16Array.from(idx)); out.wide = n > 65535 ? 1 : undefined;
  const uvName = prim.attributes.TEXCOORD_0;
  if (uvName !== undefined && glb.keepUv) {
    const uv = accessor(glb, uvName), t = new Uint16Array(n * 2);
    // glTF's v runs down the image; 0..65535 over the unit square
    for (let i = 0; i < n; i++) { t[i * 2] = Math.round(uv[i * 2] * 65535); t[i * 2 + 1] = Math.round((1 - uv[i * 2 + 1]) * 65535); }
    out.t = b64(t);
  }
  return out;
}
function packFile(file, { sources, places }) {
  const meshes = {};
  for (const stem of sources) {
    const glb = readGlb(path.join(SRC, `${stem}.glb`));
    for (const node of glb.json.nodes) {
      if (node.mesh === undefined) continue;
      if (node.translation || node.rotation || node.scale) throw new Error(`${stem}/${node.name}: transforms must be applied before export`);
      const prims = glb.json.meshes[node.mesh].primitives;
      if (prims.length !== 1) throw new Error(`${stem}/${node.name}: one material per object`);
      glb.keepUv = node.name === 'church__icons';
      if (node.name in meshes) throw new Error(`${stem}/${node.name}: a mesh of that name is already in ${file}`);
      meshes[node.name] = pack(glb, prims[0]);
    }
  }
  // All files fill one BAKED table, so a name another file already packed would silently replace that mesh.
  for (const other of Object.keys(FILES)) {
    const at = path.join(ROOT, 'js/baked', `${other}.js`);
    if (other === file || !fs.existsSync(at)) continue;
    for (const [, name] of fs.readFileSync(at, 'utf8').matchAll(/^ {2}"([^"]+)": \{/gm))
      if (name in meshes) throw new Error(`${file}: mesh "${name}" is already packed in js/baked/${other}.js`);
  }
  const body = Object.entries(meshes).map(([k, m]) => `  ${JSON.stringify(k)}: ${JSON.stringify(m)},`).join('\n');
  // Several files fill one table, so it is a `var` (declared again by each) and never a `const`.
  let text = `'use strict';\n// Generated by tools/pack-baked.cjs from tools/blender/out/: do not edit. Decoded by js/baked.js.\nvar BAKED = BAKED || {};\nObject.assign(BAKED, {\n${body}\n});\n`;
  if (places) text += `const BAKED_PLACES = ${JSON.stringify(JSON.parse(fs.readFileSync(path.join(SRC, places), 'utf8')))};\n`;
  const out = path.join(ROOT, 'js/baked', `${file}.js`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  console.log(`${path.relative(ROOT, out)}: ${(text.length / 1024 / 1024).toFixed(2)} MB, ${Object.keys(meshes).length} meshes`);
}
const pick = process.argv.slice(2);
for (const name of pick.length ? pick : Object.keys(FILES)) {
  if (!FILES[name]) throw new Error(`Unknown baked file "${name}". Known: ${Object.keys(FILES).join(', ')}.`);
  packFile(name, FILES[name]);
}
