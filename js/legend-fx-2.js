'use strict';
// ============================================================================
// Legendaries II (design/abilities BUILD-ORDER batch 14): drawing only
// ============================================================================
// The cel look of the other legendaries (STYLE.md): flat hard-edged shapes in two or three tones inside a black ink
// outline, ember orange for the legendary, few big sharp particles. Everything is drawn from `abilityPower` (the
// server's word online, so a teammate's look the same as your own), pooled and made at load; nothing allocates per frame.
//   Hundred Suns     six blades of sun fire burst out of the finished enemy in a star (the impact frame), burn, and shrink
//                    back into it.
//   Thunder God Step the dash is a jagged white-violet line in ink: your own body gone for the dash's untouchable instant
//                    and the line growing where you go; a teammate's line drawn whole as their dash ends. A clap at both
//                    ends, a cut on each enemy it crossed (the impact frame on a boss, at most one each `lineFrame` s), a
//                    scorch on the floor that cools.
//   Fourfold         a ring of ember gathers at the holder's waist as the Ultimate fires; it tears into three threads that
//                    wind up round them as the keys refill, and they flare (the HUD's caps: js/hud.js).
//   Shade Host       each clone is the shade clone model (tools/blender/shade_clone.py) in flat ink under an ember rim, posed
//                    by its holder's own pose: it rises where the dodge was, its eyes open (an ink ring; the impact frame for
//                    a host's first), flash-steps to its place round the enemy dropping ink, cuts an ink slash with each
//                    echo, and sinks into an ink blot when its time is up.
// Tuning: VIS.abilityFx.legends2. Sounds: js/audio.js. Camera: js/camera-feel.js.
const legendFx2 = (() => {
  const K = () => VIS.abilityFx.legends2;
  const INK = '#0b0b0f', EMBER = '#e59a5c', CORE = '#fff6d8', CREAM = '#fff3dc', VIOLET = '#8f7cf0', PALEV = '#ece6ff';
  const C_INK = 0x0b0b0f, C_EMBER = 0xe59a5c, C_CORE = 0xfff6d8, C_VIOLET = 0x8f7cf0, C_PALEV = 0xece6ff, C_CHAR = 0x2a1a12;
  const rnd = (() => { let s = 1543; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const clamp01 = x => Math.max(0, Math.min(1, x));
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const inked = (g, path, fill, ink, edge = null, rim = 0) => {
    path(); g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill();
    if (edge) { path(); g.lineWidth = rim; g.strokeStyle = edge; g.stroke(); }
  };
  let BLADE, STAR, CLAP, CUT, SCORCH, BLOT, SLASH, RING, INKRING, DROP;
  function textures() {
    // A sun blade, root at the left, point at the right: ink outline, ember body, a white-gold core.
    BLADE = canvasTex(512, 128, (g, w, h) => {
      inked(g, () => poly(g, [[6, h * 0.1], [w * 0.55, h * 0.3], [w - 6, h * 0.5], [w * 0.55, h * 0.7], [6, h * 0.9]]), EMBER, 10);
      g.fillStyle = CORE; poly(g, [[10, h * 0.3], [w * 0.5, h * 0.42], [w * 0.88, h * 0.5], [w * 0.5, h * 0.58], [10, h * 0.7]]); g.fill();
    });
    STAR = canvasTex(256, 256, (g, w) => {   // the star's glow on the floor: six points, ember inside ink
      const m = w / 2, pts = [];
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = m * (i % 2 ? 0.22 : 0.96); pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); }
      g.globalAlpha = 0.85; inked(g, () => poly(g, pts), EMBER, 6); g.globalAlpha = 1;
      g.fillStyle = CORE; g.beginPath(); g.arc(m, m, m * 0.16, 0, Math.PI * 2); g.fill();
    });
    CLAP = canvasTex(128, 128, (g, w) => {   // a flat star burst of eight hard shards
      const m = w / 2, pts = [];
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = m * (i % 2 ? 0.24 : 0.94); pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); }
      inked(g, () => poly(g, pts), CREAM, 6, EMBER, 2.5);
    });
    CUT = canvasTex(256, 64, (g, w, h) => {   // a hanging cut: a thin lens, white with an ember edge
      inked(g, () => { g.beginPath(); g.moveTo(4, h / 2); g.quadraticCurveTo(w / 2, h * 0.12, w - 4, h / 2); g.quadraticCurveTo(w / 2, h * 0.88, 4, h / 2); g.closePath(); }, CREAM, 6, EMBER, 2);
    });
    SCORCH = canvasTex(256, 32, (g, w, h) => {   // the line burnt into the floor: a ragged dark strip
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, h / 2);
      for (let i = 0; i <= 16; i++) g.lineTo(w * i / 16, h * (0.3 + 0.12 * Math.sin(i * 2.7)));
      for (let i = 16; i >= 0; i--) g.lineTo(w * i / 16, h * (0.7 - 0.12 * Math.cos(i * 3.1)));
      g.closePath(); g.fill();
    });
    BLOT = canvasTex(128, 128, (g, w) => {   // an ink splash soaking into the floor
      const m = w / 2, pts = [];
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = m * (0.5 + 0.42 * ((i * 7) % 5) / 4); pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); }
      g.fillStyle = INK; poly(g, pts); g.fill();
      g.strokeStyle = EMBER; g.lineWidth = 2; g.beginPath(); g.arc(m, m, m * 0.3, 0, Math.PI * 2); g.stroke();
    });
    SLASH = canvasTex(256, 256, (g, w) => {   // an ink crescent with an ember cut line on its inner edge
      const h = w / 2;
      g.beginPath(); g.arc(h, h * 1.5, h * 1.05, Math.PI * 1.22, Math.PI * 1.78); g.arc(h, h * 1.62, h * 0.98, Math.PI * 1.74, Math.PI * 1.26, true); g.closePath();
      g.fillStyle = INK; g.fill();
      g.strokeStyle = EMBER; g.lineWidth = 4; g.beginPath(); g.arc(h, h * 1.62, h * 0.98, Math.PI * 1.27, Math.PI * 1.73); g.stroke();
    });
    const ring = (fill, edge) => canvasTex(128, 128, (g, w) => {
      const m = w / 2;
      for (const [r, th, c] of [[0.86, 12, INK], [0.86, 6, fill], [0.8, 2, edge]]) { g.beginPath(); g.arc(m, m, m * r, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); }
    });
    RING = ring(EMBER, CREAM); INKRING = ring(INK, EMBER);
    DROP = canvasTex(32, 32, (g, w, h) => { poly(g, [[w * 0.1, h * 0.55], [w * 0.5, h * 0.1], [w * 0.9, h * 0.4], [w * 0.45, h * 0.9]]); g.fillStyle = '#fff'; g.fill(); });
  }
  const mat = (map, opts = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, ...opts });
  const mesh = (geo, material, order = 12) => {
    const m = new THREE.Mesh(geo, material); m.visible = false; m.renderOrder = order; m.frustumCulled = false; m.userData.warmUp = true; scene.add(m); pooledFx.push(m); return m;
  };
  const sprite = (map, order = 14) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false }));
    s.visible = false; s.renderOrder = order; s.userData.warmUp = true; scene.add(s); pooledFx.push(s); return s;
  };
  const light = (at, color, k, range) => effectLighting.flash(at, color, k * (reducedMotion() ? 0.5 : 1), range);
  const density = () => (CONFIG.VISUALS.fxBudgets[visuals.quality().fxBudget] || { density: 1 }).density;
  const chestOf = (b, out) => { out.x = b.x; out.y = b.y + (b.height || 1.8) * 0.6; out.z = b.z; return out; };
  function free(list) {
    let old = list[0];
    for (const q of list) { if (q.age === Infinity) return q; if (q.age > old.age) old = q; }
    return old;
  }

  // ---- A camera-facing ribbon through `n` points, in layers (ink widest, then the colours inside it) ---------------
  // Its points are set by its owner; each frame it turns its width to the camera. `from`..`to` (0..1) is the part shown.
  const view = new THREE.Vector3();
  function ribbon(n, layers) {
    const pts = new Float32Array(n * 3), meshes = layers.map(([color, order]) => {
      const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 6), idx = [];
      for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
      return mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }), order);
    });
    return { n, pts, meshes, widths: layers.map(l => l[2]), from: 0, to: 1, opacity: 1 };
  }
  function drawRibbon(r, scale = 1) {
    const n = r.n, P = r.pts, lo = r.from * (n - 1), hi = r.to * (n - 1);
    for (let k = 0; k < r.meshes.length; k++) {
      const m = r.meshes[k], pos = m.geometry.attributes.position.array, w = r.widths[k] * scale * 0.5;
      for (let i = 0; i < n; i++) {
        const t = Math.max(lo, Math.min(hi, i)), i0 = Math.floor(t), i1 = Math.min(n - 1, i0 + 1), f = t - i0;
        const x = P[i0 * 3] + (P[i1 * 3] - P[i0 * 3]) * f, y = P[i0 * 3 + 1] + (P[i1 * 3 + 1] - P[i0 * 3 + 1]) * f, z = P[i0 * 3 + 2] + (P[i1 * 3 + 2] - P[i0 * 3 + 2]) * f;
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        let dx = P[b * 3] - P[a * 3], dy = P[b * 3 + 1] - P[a * 3 + 1], dz = P[b * 3 + 2] - P[a * 3 + 2];
        view.set(camera.position.x - x, camera.position.y - y, camera.position.z - z);
        let sx = dy * view.z - dz * view.y, sy = dz * view.x - dx * view.z, sz = dx * view.y - dy * view.x;
        const l = Math.hypot(sx, sy, sz) || 1; sx *= w / l; sy *= w / l; sz *= w / l;
        pos[i * 6] = x - sx; pos[i * 6 + 1] = y - sy; pos[i * 6 + 2] = z - sz; pos[i * 6 + 3] = x + sx; pos[i * 6 + 4] = y + sy; pos[i * 6 + 5] = z + sz;
      }
      m.geometry.attributes.position.needsUpdate = true;
      m.material.opacity = r.opacity; m.visible = r.to > r.from && r.opacity > 0;
    }
  }
  const hideRibbon = r => { for (const m of r.meshes) m.visible = false; };

  // ---- Pools ----------------------------------------------------------------------------------------------------
  const DROPS = 64, LINE_PTS = 12, THREAD_PTS = 14, CLONES = 12;   // three clones for each of four players
  let made = false;
  const suns = [], lines = [], scorches = [], claps = [], cuts = [], rings = [], threads = [], clones = [], slashes = [], blots = [], pulses = [], drops = [];
  function make() {
    if (made) return;
    made = true; textures();
    const floor = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blade = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0), plane = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 2; i++) {
      suns.push({ blades: Array.from({ length: 6 }, () => mesh(blade, mat(BLADE), 13)), star: mesh(floor, mat(STAR), 4), age: Infinity, x: 0, y: 0, z: 0, r0: 1, a0: 0, n: 6 });
      lines.push({ r: ribbon(LINE_PTS, [[C_INK, 12, K().lineInk], [C_VIOLET, 13, K().line], [C_PALEV, 14, K().line * 0.4]]), age: Infinity, live: null, hid: false,
        fx: 0, fz: 0, tx: 0, tz: 0, y: 0, jag: new Float32Array(LINE_PTS * 2), done: false });
      scorches.push({ m: mesh(floor, mat(SCORCH, { color: C_EMBER }), 3), age: Infinity });
      rings.push({ m: mesh(floor, mat(RING), 12), b: null, age: Infinity });
      threads.push({ rs: Array.from({ length: 3 }, () => ribbon(THREAD_PTS, [[C_INK, 12, 0.16], [C_EMBER, 13, 0.1], [C_CORE, 14, 0.04]])), b: null, age: Infinity });
      blots.push({ m: mesh(floor, mat(BLOT), 3), age: Infinity });
    }
    for (let i = 0; i < 4; i++) claps.push({ s: sprite(CLAP, 15), age: Infinity, size: 1 });
    for (let i = 0; i < 6; i++) cuts.push({ s: sprite(CUT, 15), age: Infinity, opened: false });
    for (let i = 0; i < 6; i++) slashes.push({ m: mesh(plane, mat(SLASH), 14), age: Infinity });
    for (let i = 0; i < 6; i++) pulses.push({ m: mesh(floor, mat(INKRING), 4), age: Infinity, r1: 2 });
    for (let i = 0; i < DROPS; i++) drops.push({ s: sprite(DROP, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grav: 0 });
    for (let i = 0; i < CLONES; i++) clones.push(makeClone());
  }
  function throwDrops(x, y, z, n, color, speed, up, grav, life) {
    const total = Math.max(1, Math.round(n * density()));
    for (let i = 0; i < total; i++) {
      const f = free(drops), a = rnd() * Math.PI * 2, s = speed * (0.4 + 0.6 * rnd());
      f.age = 0; f.life = life * (0.6 + 0.4 * rnd()); f.x = x; f.y = y; f.z = z; f.vx = Math.cos(a) * s; f.vz = Math.sin(a) * s; f.vy = up * (0.5 + rnd()); f.grav = grav;
      f.s.material.color.setHex(color); f.s.material.opacity = 1; f.s.scale.setScalar(0.12 + 0.1 * rnd()); f.s.position.set(x, y, z); f.s.visible = true;
    }
  }
  function clap(x, y, z, size) { const c = free(claps); c.age = 0; c.size = size; c.s.position.set(x, y, z); c.s.material.rotation = rnd() * 6.28; c.s.visible = true; }
  function pulse(x, y, z, r1) { const p = free(pulses); p.age = 0; p.r1 = r1; p.m.position.set(x, y + 0.04, z); p.m.visible = true; }

  // ---- Hundred Suns ---------------------------------------------------------------------------------------------
  const at = { x: 0, y: 0, z: 0 };
  function sunsBurst(d, e) {
    const q = free(suns), b = d.body, x = e ? e.x : d.x, z = e ? e.z : d.z, y = e ? e.y : d.y;
    q.age = 0; q.x = x; q.y = y; q.z = z; q.r0 = e ? e.radius || 1 : 1; q.a0 = b ? Math.atan2(b.z - z, b.x - x) : 0;
    q.n = Math.min(6, (d.v && d.v.strikes) || 6);
    const cuts3 = CONFIG.finisher.steps, len = CONFIG.abilities.suns.length;
    q.blades.forEach((m, k) => {
      const a = q.a0 + Math.floor(k / 2) % cuts3 * Math.PI / cuts3 + (k % 2 ? Math.PI : 0);
      m.position.set(x + Math.cos(a) * q.r0, y + 0.15, z + Math.sin(a) * q.r0); m.rotation.set(0, -a, 0.12);
      m.scale.set(0.01, K().sunHeight, 1); m.material.opacity = 1; m.visible = k < q.n;
    });
    q.star.position.set(x, y + 0.05, z); q.star.scale.setScalar(2 * (q.r0 + len)); q.star.material.opacity = 0.9; q.star.visible = true;
    at.x = x; at.y = y + 1; at.z = z;
    impactFrame.hit(x, z);
    ultraFx.sparkBurst(at, 40, 'gold', [0, 1, 0], 0.2, 1.3); ultraFx.moteBurst(at, 40, C_EMBER, { r: 1.2, speed: 1, lift: 3, life: [0.8, 1.6], up: 1 });
    light(at, C_EMBER, 12, 14); light(at, C_CORE, 6, 8);
  }
  function drawSuns(real) {
    const R = K(), len = CONFIG.abilities.suns.length, calm = reducedMotion();
    for (const q of suns) {
      if (q.age === Infinity) continue;
      q.age += real;
      const t = q.age, end = R.sunOpen + R.sunBurn + R.sunFade;
      if (t > end) { q.age = Infinity; for (const m of q.blades) m.visible = false; q.star.visible = false; continue; }
      const open = 1 - (1 - clamp01(t / R.sunOpen)) ** 3, shrink = clamp01((t - R.sunOpen - R.sunBurn) / R.sunFade);
      for (let k = 0; k < q.n; k++) {
        const m = q.blades[k], flick = calm ? 1 : 1 + 0.06 * Math.sin(t * 40 + k * 1.7);
        m.scale.set(Math.max(0.01, len * open * (1 - shrink)), R.sunHeight * flick * (1 - 0.5 * shrink), 1);
        m.material.opacity = 1 - shrink * shrink;
      }
      q.star.material.opacity = 0.9 * (1 - shrink); q.star.scale.setScalar(2 * (q.r0 + len * open * (1 - shrink)));
    }
  }

  // ---- Thunder God Step -----------------------------------------------------------------------------------------
  let lastFrame = -Infinity;
  const ownsStep = b => b && b.kit && b.kit.powers && b.kit.powers.some(pw => pw.then === 'lightningDash');
  function jag(q) { for (let i = 0; i < LINE_PTS; i++) { const inner = i > 0 && i < LINE_PTS - 1; q.jag[i * 2] = inner ? (rnd() - 0.5) * 0.7 : 0; q.jag[i * 2 + 1] = inner ? (rnd() - 0.5) * 0.4 : 0; } }
  function setLine(q, fx, fz, tx, tz, y) {
    const dx = tx - fx, dz = tz - fz, l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l, P = q.r.pts;
    for (let i = 0; i < LINE_PTS; i++) {
      const t = i / (LINE_PTS - 1), j = q.jag[i * 2] * Math.min(1, l / 3);
      P[i * 3] = fx + dx * t + px * j; P[i * 3 + 1] = y + q.jag[i * 2 + 1]; P[i * 3 + 2] = fz + dz * t + pz * j;
    }
  }
  function dashStarts(d) {   // your own dash: the body gone, a line growing where it goes (the server's word finishes it)
    const p = d.player;
    if (p !== Game.player || !ownsStep(p) || !p.rig) return;
    const q = free(lines);
    restore(q);
    q.age = 0; q.live = p; q.done = false; q.fx = p.x; q.fz = p.z; q.y = p.y + K().lineUp; jag(q);
    q.hid = p.rig.root.visible; if (q.hid) p.rig.root.visible = false;
    at.x = p.x; at.y = p.y + 0.2; at.z = p.z; ultraFx.sparkBurst(at, 4, 'ember', [0, 1, 0], 0.5, 0.6);
  }
  function dashLine(d) {   // the server's word: the whole path, whether it cut and what
    if (!d.path) return;
    const F = d.path.from, T = d.path.to, y = (d.body ? d.body.y : d.y) + K().lineUp;
    let q = lines.find(l => l.live && l.live === d.body && !l.done && l.age < 1.2);
    if (!q) { q = free(lines); q.age = 0; q.live = null; jag(q); }
    q.done = true; q.fx = F.x; q.fz = F.z; q.tx = T.x; q.tz = T.z; q.y = y; q.age = Math.min(q.age, K().lineHold * 0.5);
    setLine(q, F.x, F.z, T.x, T.z, y); q.r.from = 0; q.r.to = 1; q.r.opacity = 1;
    clap(F.x, y, F.z, 0.9); clap(T.x, y, T.z, 1.2);
    at.x = T.x; at.y = y - 0.6; at.z = T.z; ultraFx.sparkBurst(at, 8, 'ember', [0, 1, 0], 0.4, 0.9);
    const len = Math.hypot(T.x - F.x, T.z - F.z), s = free(scorches);
    s.age = 0; s.m.position.set((F.x + T.x) / 2, y - K().lineUp + 0.03, (F.z + T.z) / 2); s.m.rotation.set(0, -Math.atan2(T.z - F.z, T.x - F.x), 0);
    s.m.scale.set(Math.max(0.5, len), 1, 0.45); s.m.material.color.setHex(C_EMBER); s.m.material.opacity = 0.9; s.m.visible = true;
    at.y = y; light(at, C_VIOLET, 3, 6);
    const now = effectSlots.time();
    if (d.boss && !d.idle && now - lastFrame >= K().lineFrame) { lastFrame = now; impactFrame.hit(T.x, T.z); }
  }
  function dashCut(d, e) {   // a crossed enemy: a cut line hangs on its body, opening a beat later
    const c = free(cuts); chestOf(e, at);
    c.age = 0; c.opened = false; c.s.position.set(at.x, at.y, at.z); c.s.material.rotation = (rnd() - 0.5) * 1.2; c.s.scale.set(0.1, 0.1, 1); c.s.visible = true;
  }
  function drawLines(real) {
    const R = K(), iframes = CONFIG.player.rollIFrames;
    for (const q of lines) {
      if (q.age === Infinity) continue;
      q.age += real;
      const p = q.live;
      if (!q.done && p) {   // growing with your dash
        if (q.age > iframes + 0.4) { q.age = Infinity; restore(q); hideRibbon(q.r); continue; }   // no word came: just the dash
        setLine(q, q.fx, q.fz, p.x, p.z, q.y); q.r.from = 0; q.r.to = 1; q.r.opacity = 1;
      }
      if (q.hid && (q.age > iframes || q.done)) restore(q);
      else if (q.hid && p && p.rig) p.rig.root.visible = false;   // kept gone through the dash's untouchable instant
      if (q.done) {
        const burn = clamp01((q.age - R.lineHold) / R.lineBurn);
        if (burn >= 1) { q.age = Infinity; q.live = null; hideRibbon(q.r); continue; }
        q.r.from = burn * 0.5; q.r.to = 1 - burn * 0.5;
      }
      drawRibbon(q.r);
    }
    for (const s of scorches) {
      if (s.age === Infinity) continue;
      s.age += real;
      const k = clamp01(s.age / R.scorch);
      if (k >= 1) { s.age = Infinity; s.m.visible = false; continue; }
      s.m.material.color.setHex(C_EMBER).lerp(charColor, clamp01(k * 3)); s.m.material.opacity = 0.9 * (1 - k * k);
    }
    for (const c of cuts) {
      if (c.age === Infinity) continue;
      c.age += real;
      if (c.age > 0.5) { c.age = Infinity; c.s.visible = false; continue; }
      const open = clamp01((c.age - 0.06) / 0.08);
      if (open > 0 && !c.opened) { c.opened = true; const p = c.s.position; at.x = p.x; at.y = p.y; at.z = p.z; ultraFx.sparkBurst(at, 10, 'ember', null, 0, 1); }
      c.s.scale.set(1.6, 0.1 + 0.3 * open, 1); c.s.material.opacity = 1 - clamp01((c.age - 0.3) / 0.2);
    }
  }
  const charColor = new THREE.Color(C_CHAR);
  function restore(q) { if (q.hid && q.live && q.live.rig) q.live.rig.root.visible = !q.live.rig.vanishHid; q.hid = false; }   // Vanishing Step keeps it gone

  // ---- Fourfold -------------------------------------------------------------------------------------------------
  function waistRing(d) {
    const b = d.body;
    if (!b) return;
    const q = free(rings); q.b = b; q.age = 0; q.m.visible = true;
  }
  function refill(d) {
    const b = d.body;
    if (!b) return;
    const q = free(threads); q.b = b; q.age = 0;
    chestOf(b, at); ultraFx.flare(at, C_EMBER, 1.8); ultraFx.sparkBurst(at, 18, 'ember', [0, 1, 0], 0.3, 0.8);
  }
  function drawFourfold(real) {
    const R = K();
    for (const q of rings) {   // gathers at the waist as the Ultimate fires, closing in until the threads tear out of it
      if (q.age === Infinity) continue;
      q.age += real;
      const b = q.b, k = q.age / (CONFIG.abilities.refill.delay);
      if (!b || k > 1.1) { q.age = Infinity; q.b = null; q.m.visible = false; continue; }
      q.m.position.set(b.x, b.y + R.waist, b.z); q.m.scale.setScalar(R.waistRing * (1.4 - 0.6 * clamp01(k))); q.m.material.opacity = clamp01(k * 5) * (1 - clamp01((k - 0.9) * 5));
    }
    for (const q of threads) {   // three threads winding up round the holder, sinking in at the top
      if (q.age === Infinity) continue;
      q.age += real;
      const b = q.b, k = q.age / R.threads, life = 1 + 0.6;
      if (!b || k > life) { q.age = Infinity; q.b = null; for (const r of q.rs) hideRibbon(r); continue; }
      for (let j = 0; j < 3; j++) {
        const r = q.rs[j], P = r.pts, a0 = j * Math.PI * 2 / 3 + q.age * 3;
        for (let i = 0; i < THREAD_PTS; i++) {
          const t = i / (THREAD_PTS - 1), a = a0 + t * Math.PI * 1.6, rad = 0.55 * (1 - 0.5 * t);
          P[i * 3] = b.x + Math.cos(a) * rad; P[i * 3 + 1] = b.y + R.waist + t * 0.7; P[i * 3 + 2] = b.z + Math.sin(a) * rad;
        }
        r.from = clamp01(k - 0.6); r.to = clamp01(k * 1.5); r.opacity = 1 - clamp01((k - 1) / 0.6);
        drawRibbon(r);
      }
    }
  }

  // ---- Shade Host -----------------------------------------------------------------------------------------------
  // The ink figure: each slot flat in its own tone, lit in two bands, a hard ember rim inside a black ink edge; its eyes
  // ember. `uCut`/`uFrom`: rising out of the floor (from the feet up) or sinking (from the head down).
  const inkVertex = `
    #include <common>
    #include <skinning_pars_vertex>
    varying vec3 vN; varying vec3 vV; varying float vY;
    void main() {
      #include <skinbase_vertex>
      #include <beginnormal_vertex>
      #include <skinnormal_vertex>
      #include <begin_vertex>
      #include <skinning_vertex>
      vec4 world = modelMatrix * vec4(transformed, 1.0), mv = viewMatrix * world;
      vN = normalize(normalMatrix * objectNormal); vV = -mv.xyz; vY = world.y;
      gl_Position = projectionMatrix * mv;
    }`;
  const inkFragment = `
    uniform vec3 uRim; uniform vec3 uInk; uniform vec3 uStone; uniform float uGlow; uniform float uCut; uniform float uFrom; uniform float uBoost;
    varying vec3 vN; varying vec3 vV; varying float vY;
    void main() {
      if ((vY - uCut) * uFrom > 0.0) discard;
      vec3 n = normalize(vN);
      float facing = abs(dot(n, normalize(vV)));
      float lit = step(0.25, dot(n, normalize(vec3(-0.35, 0.8, 0.5))));
      vec3 c = uStone * mix(0.8, 1.6, lit);
      c = mix(c, uRim * uBoost, step(facing, 0.3));
      c = mix(c, uInk, step(facing, 0.1));
      c = mix(c, uRim * 1.4, uGlow);
      gl_FragColor = vec4(c, 1.0);
    }`;
  const SHADE_SLOTS = { ink: 0x16151b, split: 0x4a4850, blade: 0x1c1b22, strap: 0x16151b, iron: 0x16151b };
  function makeClone() {
    const rig = new Rig({ ...PLAYER_DEF.look, model: 'shadeClone' });
    const u = { uRim: { value: new THREE.Color(C_EMBER) }, uInk: { value: new THREE.Color(C_INK) }, uCut: { value: 0 }, uFrom: { value: 1 }, uBoost: { value: 1 } };
    const material = (stone, glow) => new THREE.ShaderMaterial({ uniforms: { ...u, uStone: { value: new THREE.Color(stone) }, uGlow: { value: glow ? 1 : 0 } },
      vertexShader: inkVertex, fragmentShader: inkFragment });
    const plain = material(SHADE_SLOTS.ink, false), bySlot = new Map();
    for (const meshes of [rig.slotMeshes, rig.weaponSlotMeshes]) for (const slot in meshes || {}) bySlot.set(meshes[slot], material(SHADE_SLOTS[slot] ?? SHADE_SLOTS.ink, slot === 'eye'));
    rig.root.traverse(o => {
      o.userData.warmUp = true;
      if (o.isMesh) { o.material = bySlot.get(o) || plain; o.castShadow = o.receiveShadow = false; }
      else if (o.isSprite || o.isPoints) o.visible = false;
    });
    rig.root.visible = rig.shadow.visible = false;   // warmed with every character mesh (visuals.warmUp)
    return { rig, u, body: null, slot: 0, until: 0, age: Infinity, x: 0, y: 0, z: 0, yaw: 0, enemy: null, first: false, opened: false, gone: false, boost: 0, step: { kind: 'shadeClone', flank: 0, x: 0, z: 0, yaw: 0 }, drip: 0, enemies: null };
  }
  function cloneCall(d) {
    const b = d.body, v = d.v || {};
    if (!b || !b.rig) return;
    const now = effectSlots.time(), most = Math.max(1, Math.min(3, v.most || 3)), mine = clones.filter(c => c.body === b && c.age !== Infinity && !c.gone);
    let c;
    if (mine.length >= most) c = mine.reduce((a, q) => (a.until <= q.until ? a : q));
    else {
      let slot = 0; while (mine.some(q => q.slot === slot)) slot++;
      c = clones.find(q => q.age === Infinity) || clones.reduce((a, q) => (a.until <= q.until ? a : q));
      c.slot = slot; c.body = b; c.age = 0; c.opened = false; c.x = b.x; c.z = b.z; c.y = b.y; c.yaw = b.yaw || 0; c.boost = 0; c.first = !!d.first;
      c.step.flank = CONFIG.abilities.summons.shadeClone.flanks[slot % CONFIG.abilities.summons.shadeClone.flanks.length];
    }
    c.gone = false; c.until = now + (v.time || 6); c.enemy = d.enemy || null; c.enemies = Game.enemies;
  }
  function cloneStrike(d, e) {
    const c = clones.find(q => q.body === d.body && q.slot === d.clone && q.age !== Infinity);
    if (c) c.boost = 1;
    const from = c || d.body || e, dx = from.x - e.x, dz = from.z - e.z, l = Math.hypot(dx, dz) || 1, r = (e.radius || 1) * 0.8;
    chestOf(e, at); at.x = e.x + dx / l * r; at.z = e.z + dz / l * r;
    const s = free(slashes); s.age = 0; s.m.position.set(at.x, at.y, at.z); s.m.rotation.set(0, Math.atan2(dx, dz), (rnd() - 0.5) * 1.8); s.m.visible = true;
    ultraFx.sparkBurst(at, 8, 'ember', [dx / l, 0.2, dz / l], 0.5, 0.8);
  }
  const posed = { t: 0, dt: 0, yaw: 0, px: 0, pz: 0 };
  function foeOf(c) {
    if (c.enemy && c.enemy.alive() && Game.enemies.includes(c.enemy)) return c.enemy;
    let best = CONFIG.abilities.summons.near, foe = null; const b = c.body;
    for (const e of Game.enemies) if (e.alive()) { const dd = Math.hypot(e.x - b.x, e.z - b.z); if (dd < best) { best = dd; foe = e; } }
    return (c.enemy = foe);
  }
  function drawClones(real) {
    const R = K(), now = effectSlots.time(), height = 2.1;
    for (const c of clones) {
      if (c.age === Infinity) continue;
      c.age += real;
      const b = c.body, left = c.until - now;
      if (!b || !b.rig || c.enemies !== Game.enemies || left < -R.sink) { c.age = Infinity; c.body = null; c.rig.root.visible = false; continue; }   // gone, or a new fight
      if (b.alive && !b.alive() && left > 0) { c.until = now; continue; }   // its holder down: it sinks at once
      if (left <= 0 && !c.gone) { c.gone = true; const m = free(blots); m.age = 0; m.m.position.set(c.x, c.y + 0.03, c.z); m.m.visible = true; throwDrops(c.x, c.y + 0.8, c.z, 12, C_INK, 2.2, 2, 9, 0.6); }
      const foe = foeOf(c);
      c.step.x = c.x; c.step.z = c.z; c.step.yaw = c.yaw;
      if (c.age > R.eyes) summonStep(c.step, foe, b, real);
      const moved = Math.hypot(c.step.x - c.x, c.step.z - c.z);
      c.x = c.step.x; c.z = c.step.z; c.yaw = c.step.yaw;
      const g = world.groundAt(c.x, c.z, b.y + 0.5); c.y = Number.isFinite(g) ? g : b.y;
      if (moved > 0.08 && (c.drip -= real) <= 0) { c.drip = 0.03; throwDrops(c.x, c.y + 0.9, c.z, 1, C_INK, 0.6, 0.4, 6, 0.4); }   // the flash-step's smear of ink
      if (c.age >= R.eyes && !c.opened) {   // its eyes open: an ink ring at its feet; a host's first gets the impact frame
        c.opened = true; pulse(c.x, c.y, c.z, 2.2); throwDrops(c.x, c.y + 0.2, c.z, 14, C_INK, 3, 1.2, 9, 0.5);
        at.x = c.x; at.y = c.y + 1.7; at.z = c.z; light(at, C_EMBER, 4, 5);
        if (c.first) impactFrame.hit(c.x, c.z);
      }
      const rise = clamp01(c.age / R.eyes), sink = clamp01(-left / R.sink);
      if (left < 0) { c.u.uFrom.value = -1; c.u.uCut.value = c.y + height * (1 - sink); }
      else { c.u.uFrom.value = 1; c.u.uCut.value = c.y - 0.1 + (height + 0.2) * rise; }
      c.boost = Math.max(0, c.boost - real / 0.25); c.u.uBoost.value = 1 + c.boost;
      c.rig.root.visible = true;
      c.rig.place(c.x, c.y, c.z, c.yaw, -Infinity);
      const real0 = b.rig; b.rig = c.rig;
      posed.t = now; posed.dt = real; posed.yaw = c.yaw; posed.px = foe ? foe.x : b.x; posed.pz = foe ? foe.z : b.z;
      try { b.pose(b.stateTime, posed); } finally { b.rig = real0; }
      c.rig.shadow.visible = false; if (c.rig.warnGlow) c.rig.warnGlow.visible = false;
    }
    for (const s of slashes) {
      if (s.age === Infinity) continue;
      s.age += real;
      const k = s.age / R.slashLife;
      if (k >= 1) { s.age = Infinity; s.m.visible = false; continue; }
      s.m.material.opacity = 1 - k * k; s.m.scale.setScalar(R.slash * (1 + 0.25 * k));
    }
    for (const m of blots) {
      if (m.age === Infinity) continue;
      m.age += real;
      if (m.age > 1.4) { m.age = Infinity; m.m.visible = false; continue; }
      m.m.scale.setScalar(1.6 * (0.6 + 0.4 * clamp01(m.age / 0.15))); m.m.material.opacity = 1 - clamp01((m.age - 0.6) / 0.8);
    }
  }

  // ---- Shared bits: claps, pulses, drops --------------------------------------------------------------------------
  function drawBits(real) {
    for (const c of claps) {
      if (c.age === Infinity) continue;
      c.age += real;
      if (c.age > 0.18) { c.age = Infinity; c.s.visible = false; continue; }
      c.s.scale.setScalar(c.size * (0.5 + 0.5 * clamp01(c.age / 0.04))); c.s.material.opacity = 1 - clamp01((c.age - 0.09) / 0.09);
    }
    for (const p of pulses) {
      if (p.age === Infinity) continue;
      p.age += real;
      const t = p.age / 0.4;
      if (t >= 1) { p.age = Infinity; p.m.visible = false; continue; }
      p.m.scale.setScalar(Math.max(0.05, p.r1 * (1 - (1 - t) ** 2))); p.m.material.opacity = 1 - clamp01((t - 0.5) / 0.5);
    }
    for (const f of drops) {
      if (f.age === Infinity) continue;
      f.age += real;
      if (f.age > f.life) { f.age = Infinity; f.s.visible = false; continue; }
      const dt = Math.min(real, 0.05);
      f.vy -= f.grav * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      f.s.position.set(f.x, f.y, f.z); f.s.material.opacity = 1 - clamp01((f.age / f.life - 0.6) / 0.4);
    }
  }
  function render() {
    if (!made) return;
    const real = effectSlots.real();
    drawSuns(real); drawLines(real); drawFourfold(real); drawClones(real); drawBits(real);
  }
  function clear() {
    if (!made) return;
    for (const q of suns) { q.age = Infinity; for (const m of q.blades) m.visible = false; q.star.visible = false; }
    for (const q of lines) { restore(q); q.age = Infinity; q.live = null; hideRibbon(q.r); }
    for (const q of threads) { q.age = Infinity; q.b = null; for (const r of q.rs) hideRibbon(r); }
    for (const q of rings) { q.age = Infinity; q.b = null; q.m.visible = false; }
    for (const c of clones) { c.age = Infinity; c.body = null; c.rig.root.visible = false; }
    for (const q of [...scorches, ...slashes, ...blots, ...pulses]) { q.age = Infinity; q.m.visible = false; }
    for (const q of [...claps, ...cuts, ...drops]) { q.age = Infinity; q.s.visible = false; }
  }
  function power(d) {
    const e = d.enemy;
    switch (d.then) {
      case 'sunLines': sunsBurst(d, e); break;
      case 'lightningDash': if (d.strike) { if (e) dashCut(d, e); } else dashLine(d); break;
      case 'refillKeys': if (d.strike) refill(d); else waistRing(d); break;
      case 'shadeClone': if (d.strike) { if (e) cloneStrike(d, e); } else cloneCall(d); break;
    }
  }
  const POWERS = new Set(['sunLines', 'lightningDash', 'refillKeys', 'shadeClone']);
  const on = list => list.filter(q => q.age !== Infinity).length;
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.clear.push(clear);
      events.on('abilityPower', d => { if (POWERS.has(d.then)) power(d); });
      events.on('dash', dashStarts);
    },
    clear,
    // tests: what shows now
    get state() {
      if (!made) return {};
      return { suns: on(suns), blades: suns.reduce((n, q) => n + q.blades.filter(m => m.visible).length, 0), lines: lines.filter(q => q.r.meshes[0].visible).length,
        live: lines.filter(q => q.age !== Infinity && q.live && !q.done).length, hidden: lines.filter(q => q.hid).length, scorches: on(scorches), cuts: on(cuts),
        rings: on(rings), threads: on(threads), clones: clones.filter(c => c.rig.root.visible).length, slashes: on(slashes), blots: on(blots), drops: on(drops) };
    },
  };
})();
