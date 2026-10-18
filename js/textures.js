'use strict';
// ============================================================================
// Procedural texture library (canvas-generated, cached by name + tint + decay + size)
// ============================================================================
// TEXLIB.get('rustedIron', { tint: 0x8a8a90, decay: 0.7, size: 256 }) -> { map, rough, bump, def }
// TEXLIB.material('bone', { tint, decay, size, repeat: [2, 1] })       -> a shared MeshStandardMaterial
// Recipes live in js/data/textures.js. Every texture is generated once; asking again returns the same object.
// Layers: base pattern, grime gathering in creases, worn edges, scratches, stains, tint. Decay scales all of it.
// The baking core: pure maths (no DOM, no three.js), so the same code also runs in a Web Worker built from its source
// (TEXLIB.prefetch). bake() fills float layers; pack() turns them into the RGBA pixels of the colour, roughness and bump maps.
function TEXCORE_FACTORY(S, seeded) {
  const TAU = Math.PI * 2;
  // ---- tileable value noise with separate periods per axis (so streaks and ridges can be stretched) ----
  const hash = value => {
    let h = value | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const wrap = (a, p) => ((a % p) + p) % p;
  const vnoise = (x, y, px, py, s) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    // Grid samples already lie inside their period; only warped coordinates need modulo. Each axis and seed
    // contributes to two corners, so calculate those integer products once rather than four times.
    const x0 = ix >= 0 && ix < px ? ix : wrap(ix, px), x1 = x0 + 1 === px ? 0 : x0 + 1;
    const y0 = iy >= 0 && iy < py ? iy : wrap(iy, py), y1 = y0 + 1 === py ? 0 : y0 + 1;
    const ax = Math.imul(x0, 374761393), bx = Math.imul(x1, 374761393), ay = Math.imul(y0, 668265263), by = Math.imul(y1, 668265263), seed = Math.imul(s, 1442695041);
    const a = hash(ax + ay + seed), b = hash(bx + ay + seed), c = hash(ax + by + seed), d = hash(bx + by + seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  // u, v in 0..1; fx, fy whole numbers of lattice cells across the texture; result 0..1.
  const fbm = (u, v, fx, fy, oct, s = 0) => {
    let sum = 0, amp = 0.5, norm = 0, f = 1;
    for (let o = 0; o < oct; o++) { sum += vnoise(u * fx * f, v * fy * f, fx * f, fy * f, s + o * 17) * amp; norm += amp; amp *= 0.5; f *= 2; }
    return sum / norm;
  };
  const ridge = (n) => 1 - Math.abs(2 * n - 1);   // 1 along the zero-crossings of the noise: thin winding lines
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const rgb = hex => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

  // ---- surface patterns -------------------------------------------------------------------------------
  // Each fills out = { h: height 0..1, mix: base->alt, acc: 0..1 accent weight, a: alpha 0..1 } for a pixel.
  // k is the density multiplier from the recipe (whole numbers so the texture still tiles).
  const PATTERNS = {
    rust(u, v, k, decay, out) {
      const thr = 0.62 - 0.3 * decay, blot = fbm(u, v, 4 * k, 4 * k, 4, 3), pit = fbm(u, v, 32 * k, 32 * k, 2, 5);
      out.acc = sstep(thr, thr + 0.12, blot) * (0.55 + 0.45 * pit);
      out.mix = fbm(u, v, 14 * k, 14 * k, 3, 7);
      out.h = fbm(u, v, 6 * k, 6 * k, 5, 1) * 0.7 + pit * 0.3 * out.acc + 0.15 * (1 - out.acc);
    },
    steel(u, v, k, decay, out) {
      const dent = fbm(u, v, 3, 3, 3, 1), fine = fbm(u, v, 24 * k, 24 * k, 2, 2), streak = fbm(u, v, 2, 48 * k, 2, 3);
      out.h = dent * 0.55 + fine * 0.15 + streak * 0.3; out.mix = streak;
      out.acc = sstep(0.78 - decay * 0.25, 0.92, fbm(u, v, 10 * k, 10 * k, 3, 4)) * decay;
    },
    leather(u, v, k, decay, out) {
      const grain = fbm(u, v, 40 * k, 40 * k, 2, 1), big = fbm(u, v, 5 * k, 5 * k, 3, 2);
      const thr = 0.97 - 0.04 * decay, crack = sstep(thr, thr + 0.025, ridge(fbm(u, v, 6 * k, 6 * k, 4, 3)));
      out.h = grain * 0.4 + big * 0.3 + (1 - crack) * 0.3; out.mix = big; out.acc = crack;
    },
    // A fine, uneven weave (threads wander and thicken), drape folds running down the cloth, slubbed fibres and worn
    // patches; the weave stays faint so it reads as texture, never as a grid of dots.
    cloth(u, v, k, decay, out) {
      const T = 96 * k, jit = (fbm(u, v, 12 * k, 12 * k, 2, 8) - 0.5) * 0.9;
      const wx = 0.5 + 0.5 * Math.sin((u * T + jit) * TAU), wy = 0.5 + 0.5 * Math.sin((v * T - jit) * TAU);
      const over = (Math.floor(u * T + jit) + Math.floor(v * T - jit)) & 1, weave = over ? wx * 0.65 + wy * 0.35 : wy * 0.65 + wx * 0.35;
      const fold = ridge(fbm(u, v, 3 * k, 1 * k, 4, 13)), slub = fbm(u, v, 4 * k, 64 * k, 2, 14), wear = fbm(u, v, 6 * k, 6 * k, 4, 15);
      out.h = weave * 0.22 + fold * 0.42 + slub * 0.18 + (1 - sstep(0.55, 0.8, wear) * decay) * 0.18;
      const fray = fbm(u, v, 5 * k, 5 * k, 4, 4);
      out.mix = fbm(u, v, 10 * k, 10 * k, 3, 5) * 0.55 + fold * 0.25 + slub * 0.2;
      out.acc = sstep(0.6 - 0.25 * decay, 0.82 - 0.2 * decay, fray) * 0.8;
    },
    tattered(u, v, k, decay, out) {
      PATTERNS.cloth(u, v, k, decay, out);
      // v here is the canvas row (0 = top, the hem is at the bottom): ragged hem, vertical tears, holes.
      const rag = fbm(u, 0, 14, 1, 3, 11), tear = fbm(u, 0, 22, 1, 2, 12), depth = 0.1 + 0.34 * decay;
      let edge = 1 - depth * (0.35 + rag * 1.3);
      if (tear < 0.34 + 0.12 * decay) edge -= depth * 0.9 * sstep(0.55, 1, v);   // shredded strips
      const hole = fbm(u, v, 7, 7, 3, 9) > 0.8 - 0.14 * decay ? 0 : 1;
      out.a = v < edge ? hole : 0;
      if (v > edge - 0.03) out.acc = Math.max(out.acc, 0.9);   // scorched / frayed rim
    },
    bone(u, v, k, decay, out) {
      const streak = fbm(u, v, 3 * k, 16 * k, 3, 1), pore = fbm(u, v, 48 * k, 48 * k, 2, 2);
      const thr = 0.97 - 0.04 * decay, crack = sstep(thr, thr + 0.025, ridge(fbm(u, v, 5 * k, 5 * k, 4, 3)));
      out.h = streak * 0.4 + pore * 0.3 + (1 - crack) * 0.3; out.mix = streak;
      out.acc = Math.max(crack, sstep(0.72, 0.92, pore) * 0.55);
    },
    skin(u, v, k, decay, out) {
      const blotch = fbm(u, v, 4 * k, 4 * k, 3, 1), pore = fbm(u, v, 60 * k, 60 * k, 2, 2);
      const vein = sstep(0.88, 0.97, ridge(fbm(u, v, 7 * k, 7 * k, 3, 3))) * (0.35 + 0.4 * decay);
      out.h = pore * 0.5 + blotch * 0.2 + 0.3; out.mix = blotch; out.acc = vein;
    },
    bark(u, v, k, decay, out) {
      const r = ridge(fbm(u, v, 10 * k, 2 * k, 4, 1)), groove = sstep(0.8, 0.96, r);
      const m = fbm(u, v, 5 * k, 3 * k, 4, 6), thr = 0.72 - 0.3 * decay;
      out.h = (1 - groove * 0.85) * 0.8 + fbm(u, v, 24 * k, 8 * k, 2, 2) * 0.2;
      out.mix = fbm(u, v, 12 * k, 12 * k, 3, 3);
      out.acc = sstep(thr, thr + 0.1, m) * (0.4 + 0.6 * out.h);
      out.dark = groove;
    },
    stone(u, v, k, decay, out) {
      const grain = fbm(u, v, 24 * k, 24 * k, 2, 1), mass = fbm(u, v, 3 * k, 3 * k, 4, 2);
      const thr = 0.965 - 0.04 * decay, crack = sstep(thr, thr + 0.025, ridge(fbm(u, v, 4 * k, 4 * k, 5, 3)));
      out.h = mass * 0.5 + grain * 0.2 + (1 - crack) * 0.3; out.mix = mass;
      out.acc = Math.max(sstep(0.7 - 0.25 * decay, 0.9, fbm(u, v, 9 * k, 9 * k, 3, 4)) * 0.6, 0);
      out.dark = crack;
    },
    // Matted fur (v5.3, Margit's tail): long strands along v in clumps, darker roots between them.
    fur(u, v, k, decay, out) {
      const strand = fbm(u, v, 64 * k, 4 * k, 3, 1), clump = fbm(u, v, 9 * k, 3 * k, 3, 2);
      out.h = strand * 0.6 + clump * 0.4; out.mix = clump * 0.7 + strand * 0.3;
      out.acc = sstep(0.62 - 0.2 * decay, 0.85, fbm(u, v, 6 * k, 6 * k, 3, 4)) * 0.6;   // dried blood and grime
    },
    // Holy light (v5.3, the spectral weapons): bright marbled gold, swirling veins of white.
    holy(u, v, k, decay, out) {
      const swirl = fbm(u + fbm(u, v, 3 * k, 3 * k, 3, 7) * 0.4, v, 5 * k, 5 * k, 4, 8);
      out.h = swirl; out.mix = swirl; out.acc = sstep(0.9, 0.98, ridge(fbm(u, v, 6 * k, 6 * k, 4, 9)));
    },
    // Quilted padding (v5.5, the Hollow Soldier's gambeson): rows of stitched puffs, dark seams, grime in the stitches.
    quilt(u, v, k, decay, out) {
      const cu = (u * 10 * k) % 1, cv = (v * 12 * k) % 1;
      const puff = Math.pow(Math.sin(Math.PI * cu) * Math.sin(Math.PI * cv), 0.45), lump = fbm(u, v, 20 * k, 20 * k, 2, 2);
      out.h = puff * 0.8 + lump * 0.2; out.mix = fbm(u, v, 6 * k, 6 * k, 3, 5) * 0.6 + puff * 0.4;
      out.acc = Math.max(1 - sstep(0.0, 0.35, puff), sstep(0.7 - 0.2 * decay, 0.9, fbm(u, v, 5 * k, 5 * k, 3, 4)) * 0.5);
    },
    // Worn plate armour (Undead Knight): painterly mottled steel, soft hammer dents, rows of rivets along the edges.
    plate(u, v, k, decay, out) {
      const mott = fbm(u, v, 5 * k, 5 * k, 4, 1), dent = fbm(u, v, 9 * k, 9 * k, 2, 2), fine = fbm(u, v, 40 * k, 40 * k, 2, 3);
      const rv = Math.min(v * 2 * k % 1, 1 - v * 2 * k % 1), ru = (u * 8 * k) % 1, rw = v * 2 * k % 1, d = Math.hypot((ru - 0.5) / 8, (rw - 0.05) / 2) * 8;
      const rivet = rw < 0.1 ? 1 - sstep(0.06, 0.12, d) : 0;
      out.h = 0.45 + dent * 0.3 + fine * 0.1 + rivet * 0.5;
      out.mix = mott * 0.8 + fine * 0.2;
      out.acc = sstep(0.7 - 0.2 * decay, 0.9, fbm(u, v, 8 * k, 8 * k, 3, 4)) * decay * 0.8;
      out.dark = (1 - sstep(0.0, 0.012, rv)) * 0.5;   // the seam between plates
    },
    // Riveted chainmail: staggered rows of small rings, dark gaps between them.
    mail(u, v, k, decay, out) {
      const R = 28 * k, row = Math.floor(v * R), cu = (u * R + (row & 1) * 0.5) % 1, cv = v * R % 1;
      const ring = 1 - Math.abs(Math.hypot(cu - 0.5, cv - 0.5) - 0.3) / 0.12;
      out.h = Math.max(0, ring); out.mix = fbm(u, v, 6 * k, 6 * k, 3, 5);
      out.acc = sstep(0.65 - 0.2 * decay, 0.85, fbm(u, v, 5 * k, 5 * k, 3, 4)) * decay;
      out.dark = 1 - sstep(0, 0.4, ring);
    },
    // Overlapping scales (v5.5, the Rogue's leggings and sleeves): offset rows of rounded scales, dark gaps between.
    scales(u, v, k, decay, out) {
      const rows = 12 * k, ry = v * rows, row = Math.floor(ry), cu = (u * 9 * k + (row % 2) * 0.5) % 1, cv = ry % 1;
      const dome = Math.max(0, 1 - Math.hypot((cu - 0.5) * 2, cv * 1.15)), h = Math.pow(dome, 0.55);
      out.h = h * 0.85 + fbm(u, v, 30 * k, 30 * k, 2, 2) * 0.15; out.mix = h * 0.6 + fbm(u, v, 6 * k, 6 * k, 3, 5) * 0.4;
      out.acc = Math.max(1 - sstep(0.0, 0.18, h), sstep(0.75 - 0.2 * decay, 0.92, fbm(u, v, 5 * k, 5 * k, 3, 4)) * 0.4);
    },
    // Overlapping pointed plumage / leaf-scales (v5.5, the Executioner's feathered hauberk): diamond-tipped vanes with a
    // central quill ridge and diagonal barb striations, dark crevices between the tips.
    feathers(u, v, k, decay, out) {
      const rows = 10 * k, cols = 8 * k, ry = v * rows, row = Math.floor(ry), cu = (u * cols + (row & 1) * 0.5) % 1, cv = ry % 1;
      const dx = Math.abs(cu - 0.5) * 2, w = 1 - Math.pow(cv, 0.75) * 0.88, inside = Math.max(0, 1 - dx / Math.max(0.08, w));
      const quill = Math.max(0, 1 - dx * 6.5) * (1 - cv * 0.65);
      const barbs = 0.5 + 0.5 * Math.sin((dx * 16 - cv * 12) * Math.PI);
      const vane = Math.pow(inside, 0.45) * (0.78 + 0.22 * barbs) + quill * 0.28;
      out.h = Math.min(1, vane * 0.85 + fbm(u, v, 16 * k, 16 * k, 2, 3) * 0.15);
      out.mix = Math.min(1, quill * 0.55 + Math.pow(inside, 0.7) * 0.45 * fbm(u, v, 6 * k, 6 * k, 3, 5));
      out.acc = Math.max(1 - sstep(0.0, 0.22, inside), sstep(0.72 - 0.2 * decay, 0.9, fbm(u, v, 5 * k, 5 * k, 3, 4)) * 0.45);
      out.dark = (1 - sstep(0.0, 0.18, inside)) * 0.7;
    },
    // Spectral bone (v5.5, the Giant Skeleton): long streaks, mottled shadow, and bright veins of light along the grain.
    spectral(u, v, k, decay, out) {
      const streak = fbm(u, v, 3 * k, 14 * k, 4, 1), mottle = fbm(u, v, 6 * k, 6 * k, 3, 6);
      const vein = Math.max(sstep(0.95, 0.985, ridge(fbm(u, v, 3 * k, 8 * k, 4, 3))), sstep(0.965, 0.99, ridge(fbm(u, v, 8 * k, 4 * k, 3, 8))) * 0.7);
      out.h = streak * 0.5 + mottle * 0.3 + vein * 0.2; out.mix = streak * 0.7 + mottle * 0.3; out.acc = vein;
    },
    ash(u, v, k, decay, out) {
      const streak = fbm(u, v, 6 * k, 2 * k, 4, 1), grain = fbm(u, v, 32 * k, 32 * k, 2, 2);
      out.h = streak * 0.5 + grain * 0.5; out.mix = streak * 0.9;
      out.acc = sstep(0.93, 0.99, fbm(u, v, 40 * k, 40 * k, 2, 3)) * sstep(0.35, 1, decay);   // ember specks in ruined soot
    },
  };

  // ---- baking ---------------------------------------------------------------------------------------------
  const surfaces = new Map();
  let surfaceBytes = 0;
  function surface(def, size, decay, seed) {
    const key = `${def.id}|${size}|${decay}|${seed}`;
    if (surfaces.has(key)) {
      const hit = surfaces.get(key); surfaces.delete(key); surfaces.set(key, hit); return hit;
    }
    const n = size * size, pat = PATTERNS[def.kind], k = def.scale || 1;
    // Keep colour at JS precision until tinting: the original baker rounded to float32 AFTER multiplying by tint.
    const H = new Float32Array(n), C = new Float64Array(n * 3), R = new Float32Array(n), A = def.alpha ? new Float32Array(n).fill(1) : null;
    const base = rgb(def.base), alt = rgb(def.alt), acc = rgb(def.accent), stain = rgb(def.stain ?? 0x201a14);
    const out = { h: 0, mix: 0, acc: 0, a: 1, dark: 0 };
    const [r0, r1] = def.rough, dim = 1 - decay * 0.18;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x, u = x / size, v = y / size;
      out.dark = 0; out.a = 1; out.acc = 0;
      pat(u, v, k, decay, out);
      const mix = out.mix, a = out.acc;
      const shade = (1 + (out.h - 0.5) * 0.4 * (def.contrast ?? 1)) * (1 - out.dark * 0.45);
      // Stains and grime blotches: more, darker and wider with decay.
      const sn = fbm(u, v, 3, 3, 3, seed + 99), thr = 0.95 - decay * 0.42;
      const sw = sstep(thr - 0.09, thr + 0.09, sn) * decay * 0.7;
      for (let c = 0; c < 3; c++) {
        let col = base[c] + (alt[c] - base[c]) * mix;
        col += (acc[c] - col) * a;
        col *= shade * dim;
        col += (stain[c] - col) * sw;
        C[i * 3 + c] = col;
      }
      H[i] = out.h * (1 - sw * 0.2); R[i] = r0 + (r1 - r0) * Math.min(1, mix * 0.35 + a * 0.6 + (1 - out.h) * 0.25 + sw * 0.4);
      if (A) A[i] = out.a;
    }
    const result = { size, H, C, R, A }, bytes = H.byteLength + C.byteLength + R.byteLength + (A ? A.byteLength : 0);
    const limit = S.surfaceCacheBytes || 0;
    if (bytes <= limit) {
      while (surfaceBytes + bytes > limit && surfaces.size) {
        const oldest = surfaces.keys().next().value, old = surfaces.get(oldest);
        surfaceBytes -= old.H.byteLength + old.C.byteLength + old.R.byteLength + (old.A ? old.A.byteLength : 0);
        surfaces.delete(oldest);
      }
      surfaces.set(key, result); surfaceBytes += bytes;
    }
    return result;
  }
  function bake(def, size, tint, decay, seed) {
    const src = surface(def, size, decay, seed), n = size * size;
    const H = src.H, A = src.A, R = src.R.slice(), C = new Float32Array(n * 3);
    const tn = rgb(tint), tm = Math.max(tn[0], tn[1], tn[2]) || 1, tr = tn[0] / tm, tg = tn[1] / tm, tb = tn[2] / tm;
    for (let i = 0; i < n; i++) {
      C[i * 3] = src.C[i * 3] * tr; C[i * 3 + 1] = src.C[i * 3 + 1] * tg; C[i * 3 + 2] = src.C[i * 3 + 2] * tb;
    }
    // Grime in creases, wear on edges: compare each height with the average of its neighbours.
    const rch = S.cavityReach, cvk = def.cavity ?? 1, metal = def.metal > 0 ? 1 : 0.45;
    const grimeK = 5 * cvk * (0.25 + 0.65 * decay), wearK = 4.5 * cvk * (1 - decay * 0.55) * metal;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x, xm = (x - rch + size) % size, xp = (x + rch) % size, ym = (y - rch + size) % size, yp = (y + rch) % size;
      const cav = H[i] - (H[y * size + xm] + H[y * size + xp] + H[ym * size + x] + H[yp * size + x]) * 0.25;
      if (cav < 0) {
        const g = 1 - Math.min(0.75, -cav * grimeK * 4);
        C[i * 3] *= g; C[i * 3 + 1] *= g; C[i * 3 + 2] *= g; R[i] = Math.min(1, R[i] + -cav * 2);
      } else {
        const w = Math.min(1, cav * wearK * 4) * 32;
        C[i * 3] += w; C[i * 3 + 1] += w; C[i * 3 + 2] += w; R[i] = Math.max(0.05, R[i] - cav * wearK * 1.5 * metal);
      }
    }
    // Scratches: short light lines (shinier too), more of them the more ruined.
    const rnd = seeded(seed + 5), count = Math.round(def.scratch * (0.12 + decay)), [l0, l1] = S.scratchLength;
    for (let s = 0; s < count; s++) {
      let px = rnd() * size, py = rnd() * size;
      const ang = rnd() * Math.PI, len = l0 + rnd() * (l1 - l0), dx = Math.cos(ang) * 0.8, dy = Math.sin(ang) * 0.8, amt = 14 + rnd() * 26;
      for (let t = 0; t < len / 0.8; t++, px += dx, py += dy) {
        const i = (wrap(Math.floor(py), size)) * size + wrap(Math.floor(px), size);
        C[i * 3] += amt; C[i * 3 + 1] += amt; C[i * 3 + 2] += amt; R[i] = Math.max(0.05, R[i] - 0.15 * metal);
      }
    }
    return { size, C, R, H, A };
  }

  const byte = x => x < 0 ? 0 : x > 255 ? 255 : x | 0;
  function pack(b) {
    const size = b.size, n = size * size, map = new Uint8ClampedArray(n * 4), rough = new Uint8ClampedArray(n * 4), bump = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      map[i * 4] = byte(b.C[i * 3]); map[i * 4 + 1] = byte(b.C[i * 3 + 1]); map[i * 4 + 2] = byte(b.C[i * 3 + 2]); map[i * 4 + 3] = b.A ? (b.A[i] > 0.5 ? 255 : 0) : 255;
      const r = byte(b.R[i] * 255), h = byte(b.H[i] * 255);
      rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = r; rough[i * 4 + 3] = 255;
      bump[i * 4] = bump[i * 4 + 1] = bump[i * 4 + 2] = h; bump[i * 4 + 3] = 255;
    }
    return { size, map, rough, bump };
  }
  return { bake, pack };
}
const TEXLIB = (() => {
  const S = TEXTURE_SETTINGS, CORE = TEXCORE_FACTORY(S, seeded);
  const DEFS = Object.fromEntries(TEXTURE_DEFS.map(d => [d.id, d]));
  const cache = new Map(), matCache = new Map(), surfaceMaps = new Map();
  const stats = { textures: 0, ms: 0, last: [] };

  const canvasOf = (size, px) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    c.getContext('2d').putImageData(new ImageData(px, size, size), 0, 0); return c;
  };
  const texOf = (canvas, srgb) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = S.anisotropy;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const decayKey = d => Math.round(clamp(d, 0, 1) / S.decayStep) * S.decayStep;
  const keyOf = (name, tint, d, size) => `${name}|${tint.toString(16)}|${d.toFixed(2)}|${size}`;
  // A finished entry from packed pixels (made here or in the worker).
  const store = (key, name, tint, d, size, P, ms) => {
    // Roughness (green) and bump height (red) have identical UVs and never depend on tint. One shared map retains
    // the original bytes in the channels Three reads, replacing two RGBA textures for EVERY colour variant.
    const surfaceKey = `${name}|${d.toFixed(2)}|${size}`;
    let packed = surfaceMaps.get(surfaceKey);
    if (!packed) {
      for (let i = 0; i < P.rough.length; i += 4) P.rough[i] = P.bump[i];
      packed = texOf(canvasOf(size, P.rough), false); surfaceMaps.set(surfaceKey, packed);
    }
    const entry = { name, tint, decay: d, size, map: texOf(canvasOf(size, P.map), true), rough: packed,
                    bump: packed, def: DEFS[name] };
    cache.set(key, entry); stats.textures++; stats.ms += ms; stats.last.push(`${key} ${ms.toFixed(0)}ms`);
    return entry;
  };
  const check = (name, size) => {
    if (!DEFS[name]) throw new Error(`Unknown texture "${name}". Known: ${Object.keys(DEFS).join(', ')}.`);
    const max = Math.max(S.maxSize, S.ultraMax || 0);
    if (size > max) throw new Error(`Texture "${name}" asked for size ${size}; the limit is ${max}.`);
  };

  function get(name, { tint = 0xffffff, decay = 0.5, size = S.size } = {}) {
    check(name, size);
    const d = decayKey(decay), key = keyOf(name, tint, d, size);
    const entry = cache.get(key);
    if (entry) return entry;
    const t0 = performance.now();   // not baked yet (or still in the worker): baked here and now
    return store(key, name, tint, d, size, CORE.pack(CORE.bake(DEFS[name], size, tint, d, strSeed(name))), performance.now() - t0);
  }

  // Background baking: a Web Worker built from the core's own source (so it also works from a file:// page) bakes
  // textures off the main thread; the menus stay smooth while every model's textures get ready. Without workers,
  // prefetch does nothing and get() bakes on demand.
  let worker = null, busy = new Set();
  try {
    const src = `const TEXTURE_SETTINGS = ${JSON.stringify(S)}; const TEXTURE_DEFS = ${JSON.stringify(TEXTURE_DEFS)};
const seeded = ${seeded.toString()}; const strSeed = ${strSeed.toString()};
const CORE = (${TEXCORE_FACTORY.toString()})(TEXTURE_SETTINGS, seeded), DEFS = Object.fromEntries(TEXTURE_DEFS.map(d => [d.id, d]));
onmessage = e => { const { key, name, tint, d, size } = e.data, t0 = performance.now();
  const P = CORE.pack(CORE.bake(DEFS[name], size, tint, d, strSeed(name)));
  postMessage({ key, name, tint, d, size, P, ms: performance.now() - t0 }, [P.map.buffer, P.rough.buffer, P.bump.buffer]); };`;
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    worker.onmessage = e => { const m = e.data; busy.delete(m.key); if (!cache.has(m.key)) store(m.key, m.name, m.tint, m.d, m.size, m.P, m.ms); };
    worker.onerror = () => { worker = null; };
  } catch (e) { worker = null; }
  function prefetch(name, { tint = 0xffffff, decay = 0.5, size = S.size } = {}) {
    if (!worker) return false;
    check(name, size);
    const d = decayKey(decay), key = keyOf(name, tint, d, size);
    if (cache.has(key) || busy.has(key)) return true;
    busy.add(key); worker.postMessage({ key, name, tint, d, size });
    return true;
  }

  // A shared material for a recipe. `repeat` tiles the texture over the surface (e.g. [2, 1] around a sphere).
  function material(name, opts = {}) {
    const key = `${name}|${(opts.tint ?? 0xffffff).toString(16)}|${decayKey(opts.decay ?? 0.5).toFixed(2)}|${opts.size ?? S.size}|${(opts.repeat || [1, 1]).join('x')}`;
    let m = matCache.get(key);
    if (m) return m;
    const t = get(name, opts), rep = opts.repeat || [1, 1];
    const tile = tex => { if (rep[0] === 1 && rep[1] === 1) return tex; const c = tex.clone(); c.repeat.set(rep[0], rep[1]); c.needsUpdate = true; return c; };
    m = new THREE.MeshStandardMaterial({
      map: tile(t.map), roughnessMap: tile(t.rough), roughness: 1, metalness: t.def.metal,
      bumpMap: tile(t.bump), bumpScale: t.def.bump * 0.02,
      alphaTest: t.def.alpha ? 0.5 : 0, side: t.def.alpha ? THREE.DoubleSide : THREE.FrontSide,
    });
    matCache.set(key, m);
    return m;
  }

  return { names: TEXTURE_DEFS.map(d => d.id), defs: DEFS, get, prefetch, material, stats, count: () => cache.size, pending: () => busy.size };
})();
