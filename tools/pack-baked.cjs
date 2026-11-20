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
  'agathe': { sources: ['agathe'] },
  'kindling-tree': { sources: ['kindling_tree'] },
  'kings-blade': { sources: ['kings_blade'] },
  'vesper': { sources: ['vesper'] },
  'hound': { sources: ['hound'] },
  'guardian': { sources: ['guardian'] },
  'lancer-of-ash': { sources: ['lancer_of_ash'] },
  'ashwing': { sources: ['ashwing'], skinned: true },
};

function readGlb(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const jsonLen = b.readUInt32LE(12), json = JSON.parse(b.toString('utf8', 20, 20 + jsonLen));
  return { json, bin: b.subarray(20 + jsonLen + 8) };
}
const COMPONENT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
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
function packSkinnedMesh(glb, prim, slot) {
  const out = pack(glb, prim);
  out.slot = slot;
  const jIdx = prim.attributes.JOINTS_0, wIdx = prim.attributes.WEIGHTS_0;
  if (jIdx !== undefined && wIdx !== undefined) {
    const joints = accessor(glb, jIdx), weights = accessor(glb, wIdx), n = out.n;
    const j8 = new Uint8Array(n * 4), w8 = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      let sum = 0;
      for (let k = 0; k < 4; k++) { j8[o + k] = joints[o + k] & 255; sum += weights[o + k]; }
      if (sum > 1e-6) {
        let rem = 255, best = 0;
        for (let k = 0; k < 4; k++) {
          const q = Math.round((weights[o + k] / sum) * 255);
          w8[o + k] = q; rem -= q;
          if (weights[o + k] > weights[o + best]) best = k;
        }
        w8[o + best] = Math.max(0, Math.min(255, w8[o + best] + rem));
      } else { w8[o] = 255; }
    }
    out.j = b64(j8); out.w = b64(w8);
  }
  return out;
}
function packSkinnedRig(glb, stem) {
  const { json } = glb;
  if (!json.skins || !json.skins.length) throw new Error(`${stem}: skinned export requires an armature/skin in GLB`);
  const skin = json.skins[0], joints = skin.joints;
  const nodeToBone = new Map(joints.map((ni, bi) => [ni, bi]));
  const parentOf = new Map();
  for (let ni = 0; ni < json.nodes.length; ni++) {
    for (const ch of json.nodes[ni].children || []) parentOf.set(ch, ni);
  }
  const ibmRaw = skin.inverseBindMatrices !== undefined ? accessor(glb, skin.inverseBindMatrices) : null;
  const bones = joints.map((ni, bi) => {
    const nd = json.nodes[ni], pNi = parentOf.get(ni);
    const parent = pNi !== undefined && nodeToBone.has(pNi) ? nodeToBone.get(pNi) : -1;
    const b = { name: nd.name, parent };
    if (nd.translation) b.p = nd.translation.map(round);
    if (nd.rotation) b.r = nd.rotation.map(round);
    if (nd.scale && nd.scale.some(v => Math.abs(v - 1) > 1e-4)) b.s = nd.scale.map(round);
    if (ibmRaw) b.ibm = Array.from(ibmRaw.subarray(bi * 16, bi * 16 + 16), round);
    return b;
  });
  const meshes = [];
  for (const node of json.nodes) {
    if (node.mesh === undefined) continue;
    const mesh = json.meshes[node.mesh];
    glb.keepUv = true;
    for (let pi = 0; pi < mesh.primitives.length; pi++) {
      const prim = mesh.primitives[pi];
      const matName = prim.material !== undefined && json.materials?.[prim.material]?.name
        ? json.materials[prim.material].name : (node.name.includes('__') ? node.name.split('__').pop() : 'body');
      const slot = matName.split('.')[0];
      meshes.push(packSkinnedMesh(glb, prim, slot));
    }
  }
  const clips = {};
  for (const anim of json.animations || []) {
    const tracks = [];
    let duration = 0;
    for (const ch of anim.channels || []) {
      const bi = nodeToBone.get(ch.target.node);
      if (bi === undefined) continue;
      const pathName = ch.target.path;
      if (pathName !== 'rotation' && pathName !== 'translation' && pathName !== 'scale') continue;
      const samp = anim.samplers[ch.sampler];
      const times = accessor(glb, samp.input), vals = accessor(glb, samp.output);
      const count = times.length;
      if (!count) continue;
      duration = Math.max(duration, times[count - 1]);
      const tMs = new Uint16Array(count);
      for (let i = 0; i < count; i++) tMs[i] = Math.min(65535, Math.round(times[i] * 1000));
      if (pathName === 'rotation') {
        const q16 = new Int16Array(count * 4);
        for (let i = 0; i < count * 4; i++) q16[i] = Math.max(-32767, Math.min(32767, Math.round(vals[i] * 32767)));
        tracks.push({ b: bi, k: 'r', t: b64(tMs), v: b64(q16) });
      } else {
        let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < count * 3; i++) { const c = i % 3; min[c] = Math.min(min[c], vals[i]); max[c] = Math.max(max[c], vals[i]); }
        const span = max.map((v, c) => Math.max(v - min[c], 1e-6));
        const v16 = new Int16Array(count * 3);
        for (let i = 0; i < count * 3; i++) { const c = i % 3; v16[i] = Math.round((vals[i] - min[c]) / span[c] * 65534 - 32767); }
        tracks.push({ b: bi, k: pathName === 'translation' ? 'p' : 's', t: b64(tMs), min: min.map(round), span: span.map(round), v: b64(v16) });
      }
    }
    clips[anim.name] = { duration: round(duration), tracks };
  }
  return { bones, meshes, clips };
}
function packFile(file, { sources, places, skinned }) {
  if (skinned) {
    const rigs = {};
    for (const stem of sources) {
      const glb = readGlb(path.join(SRC, `${stem}.glb`));
      rigs[stem] = packSkinnedRig(glb, stem);
    }
    const body = Object.entries(rigs).map(([k, r]) => `  ${JSON.stringify(k)}: ${JSON.stringify(r)},`).join('\n');
    const text = `'use strict';\n// Generated by tools/pack-baked.cjs (skinned v2) from tools/blender/out/: do not edit. Decoded by js/baked.js.\nvar BAKED_RIGS = BAKED_RIGS || {};\nObject.assign(BAKED_RIGS, {\n${body}\n});\n`;
    const out = path.join(ROOT, 'js/baked', `${file}.js`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    const totalClips = Object.values(rigs).reduce((s, r) => s + Object.keys(r.clips).length, 0);
    const totalBones = Object.values(rigs).reduce((s, r) => s + r.bones.length, 0);
    console.log(`${path.relative(ROOT, out)}: ${(text.length / 1024).toFixed(1)} KB, ${totalBones} bones, ${totalClips} clips (skinned v2)`);
    return;
  }
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
