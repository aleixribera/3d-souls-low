'use strict';
// ============================================================================
// Scenery (v7.20): a level drawn from Blender models instead of the room builder (drawing only)
// ============================================================================
// A level's `scenery` (with `unseen` rooms, which keep their collision and lose their boxes):
//   meshes     baked mesh names (js/baked/*.js), each `<set>__<slot>`; the slot names its material
//   instances  { kind: [mesh, ...] }: props repeated at BAKED_PLACES[kind], [x, y, z, yaw, scale]
//   materials  { slot: { tex, tint, decay, tile } | { ground, tile } | { glow } | { color, sky?, emissive? } | { painted } }
//              (`tile`: metres to a repeat; `sky`: beyond the fog, for far mountains)
//   far        the camera's far plane in this level
//   tracks     { rooms }: bodies leave prints in the floors of those rooms
//   veil       { x, y: [y0, y1], z: [z0, z1], color }: a dark doorway, gone once the camera is inside (`atmosphere.interior`)
// Also runs `atmosphere.interior`: the look eases to its indoor end while the camera is in one of its rooms.
// Tuning: CONFIG.VISUALS.scenery. Quality: the props' share follows the preset (`density`).
const scenery = (() => {
  const C = CONFIG.VISUALS.scenery;
  let st = null;
  const place = new THREE.Object3D(), TAU = Math.PI * 2;
  const PAINTERS = {
    // The church's painted walls: 6 x 2 cells of 256 x 512. Ten saints, then a carpet and a coffered ceiling.
    icons(ctx) {
      const rnd = seeded(strSeed('icons')), R = ['#6a1f18', '#2a3a62', '#3a4a30', '#70501e', '#4a2038', '#26444a'];
      const saint = (x, y) => {
        const g = ctx.createLinearGradient(x, y, x, y + 512); g.addColorStop(0, '#b58a3e'); g.addColorStop(1, '#6e4c20');
        ctx.fillStyle = g; ctx.fillRect(x, y, 256, 512);
        ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 10; ctx.strokeRect(x + 12, y + 12, 232, 488);
        ctx.strokeStyle = '#e0bc68'; ctx.lineWidth = 3; ctx.strokeRect(x + 20, y + 20, 216, 472);
        const cx = x + 128, hy = y + 120 + rnd() * 16, robe = R[Math.floor(rnd() * R.length)];
        ctx.fillStyle = '#e8c86c'; ctx.beginPath(); ctx.arc(cx, hy, 62, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#7a4e18'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = robe; ctx.beginPath(); ctx.moveTo(cx - 34, hy + 52); ctx.lineTo(cx - 92, y + 470); ctx.lineTo(cx + 92, y + 470); ctx.lineTo(cx + 34, hy + 52); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(232,200,108,0.55)'; ctx.lineWidth = 3;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 10, hy + 60); ctx.lineTo(cx + i * 30, y + 468); ctx.stroke(); }
        ctx.fillStyle = '#c29a70'; ctx.beginPath(); ctx.ellipse(cx, hy, 28, 37, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rnd() < 0.5 ? '#3a2a1c' : '#8a8078'; ctx.beginPath(); ctx.ellipse(cx, hy + 26, 24, 26, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#1a120c'; ctx.fillRect(cx - 14, hy - 6, 9, 3); ctx.fillRect(cx + 5, hy - 6, 9, 3);
        ctx.fillStyle = '#c29a70'; ctx.fillRect(cx - 12, y + 268, 24, 34);
        ctx.fillStyle = '#e0c070'; ctx.fillRect(cx + 22, y + 250, 8, 120); ctx.fillRect(cx + 4, y + 282, 44, 8);
      };
      for (let row = 0; row < 2; row++) for (let col = 0; col < 6; col++) if (!(row === 1 && col >= 4)) saint(col * 256, row * 512);
      ctx.fillStyle = '#5e1712'; ctx.fillRect(1024, 512, 256, 512);       // the carpet
      ctx.strokeStyle = '#c09040'; ctx.lineWidth = 8; ctx.strokeRect(1040, 512, 224, 512);
      ctx.fillStyle = '#26180f'; ctx.fillRect(1056, 512, 192, 512);
      for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(1152, 560 + i * 104); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#7a1e16'; ctx.fillRect(-52, -52, 104, 104); ctx.fillStyle = '#c09040'; ctx.fillRect(-20, -20, 40, 40); ctx.restore(); }
      ctx.fillStyle = '#1e2838'; ctx.fillRect(1280, 512, 256, 512);       // the ceiling: night blue, stars in gilt
      ctx.fillStyle = '#d8b060';
      for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(1280 + rnd() * 256, 512 + rnd() * 512, 2 + rnd() * 3, 0, TAU); ctx.fill(); }
      const id = ctx.getImageData(0, 0, 1536, 1024), d = id.data;   // age: blotches and grain
      for (let i = 0; i < d.length; i += 4) { const k = 0.8 + 0.2 * Math.sin((i >> 2) % 1536 * 0.021) * Math.cos(((i >> 2) / 1536 | 0) * 0.017) - rnd() * 0.08; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
      ctx.putImageData(id, 0, 0);
    },
  };
  // Textures outlive a stage (disposeStageObject keeps them all), so each is drawn once and shared by every visit.
  const canvases = {};
  function paintedMap(kind) {
    if (canvases[kind]) return canvases[kind];
    const cv = document.createElement('canvas'); cv.width = 1536; cv.height = 1024;
    PAINTERS[kind](cv.getContext('2d', { willReadFrequently: true }));
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return canvases[kind] = t;
  }
  function printMap() {
    if (canvases.print) return canvases.print;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const ctx = cv.getContext('2d'), g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.65, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    return canvases.print = new THREE.CanvasTexture(cv);
  }
  function painted(kind) {
    const t = paintedMap(kind);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: C.paintGlow });
  }
  function materialFor(spec) {
    if (spec.glow !== undefined) return new THREE.MeshBasicMaterial({ color: spec.glow, fog: false });
    if (spec.painted) return painted(spec.painted);
    if (spec.ground) {
      const m = realms.groundMaterial(spec.ground).clone();
      m.userData.realmShared = false; m.color.set(spec.tint ?? 0xffffff); if (spec.bump) { m.bumpMap = m.map; m.bumpScale = spec.bump; }
      return m;
    }
    if (spec.tex) return TEXLIB.material(spec.tex, { tint: spec.tint ?? 0xffffff, decay: spec.decay ?? 0.5, size: spec.size ?? 256 }).clone();
    return new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.95, fog: !spec.sky, emissive: spec.emissive ?? 0x000000 });
  }
  const cloned = mat => { mat.userData.shared = false; return mat; };
  function build(def, built) {
    st = null;
    const S = def.scenery;
    if (!S) return;
    const G = new THREE.Group(), mats = {}, TR = terrainFor(def), flat = new Set(S.plan || []), distant = new Set(S.distant || []);
    built.group.add(G);
    const mat = slot => mats[slot] || (mats[slot] = cloned(materialFor(S.materials[slot])));
    const geo = name => { const spec = S.materials[name.split('__')[1]]; return bakedGeometry(name, { tile: spec.tile ?? 1, plan: flat.has(name) }); };
    for (const name of S.meshes) {
      const m = new THREE.Mesh(geo(name), mat(name.split('__')[1]));
      m.frustumCulled = false; m.castShadow = !flat.has(name) && !distant.has(name); m.receiveShadow = !distant.has(name);
      G.add(m);
    }
    const props = [];
    for (const [kind, names] of Object.entries(S.instances || {})) {
      const list = BAKED_PLACES[kind];
      for (const name of names) {
        const im = new THREE.InstancedMesh(geo(name), mat(name.split('__')[1]), list.length);
        list.forEach(([x, y, z, yaw, s], i) => {
          place.position.set(x, y, z); place.rotation.set(0, yaw, 0); place.scale.setScalar(s); place.updateMatrix();
          im.setMatrixAt(i, place.matrix);
        });
        im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.receiveShadow = true;
        G.add(im); props.push({ im, n: list.length, thin: (S.thin || []).includes(kind) });
      }
    }
    camera.far = Math.max(camera.far, S.far); camera.updateProjectionMatrix();
    // A dark doorway seen from outside: the daylight that fills the look out here would light the interior through its walls.
    const veil = S.veil ? new THREE.Mesh(new THREE.PlaneGeometry(S.veil.z[1] - S.veil.z[0], S.veil.y[1] - S.veil.y[0]), new THREE.MeshBasicMaterial({ color: S.veil.color, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide })) : null;
    if (veil) { veil.rotation.y = Math.PI / 2; veil.position.set(S.veil.x, (S.veil.y[0] + S.veil.y[1]) / 2, (S.veil.z[0] + S.veil.z[1]) / 2); veil.frustumCulled = false; G.add(veil); }
    st = { def, G, props, TR, k: 0, veil, bumped: Object.keys(mats).filter(k => S.materials[k].bump).map(k => mats[k]), inside: (def.atmosphere.interior || { rooms: [] }).rooms.map(id => TR.regions.find(R => R.id === id).rect), tracks: S.tracks ? buildTracks(S.tracks, TR, G) : null };
    fit(visuals.quality ? visuals.quality() : null);
  }
  const fit = q => {
    if (!st || !q) return;
    const d = C.density[q.label.toLowerCase()] ?? 1;
    for (const p of st.props) p.im.count = p.thin ? Math.ceil(p.n * d) : p.n;
    for (const m of st.bumped) {
      const want = q.simpleSurfaces ? null : m.map;   // Low keeps its one texture read
      if (m.bumpMap !== want) { m.bumpMap = want; m.needsUpdate = true; }
    }
  };
  // ---- prints in the snow: a ring of quads, the oldest reused ------------------------------------------------------------
  function buildTracks(T, TR, G) {
    const K = C.tracks;
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: K.color, alphaMap: printMap(), transparent: true, opacity: K.opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), K.count);
    m.frustumCulled = false; m.count = 0; m.renderOrder = -0.3; G.add(m);
    return { m, next: 0, rects: T.rooms.map(id => TR.regions.find(R => R.id === id).rect), walkers: new WeakMap() };
  }
  const inAny = (rects, x, z) => { for (let i = 0; i < rects.length; i++) if (inRect(rects[i], x, z)) return true; return false; };
  function stepTracks(t, body, size) {
    const K = C.tracks, x = body.x, z = body.z;
    if (!inAny(t.rects, x, z)) return;
    let w = t.walkers.get(body);
    if (!w) { w = { x, z, side: 1 }; t.walkers.set(body, w); return; }
    const dx = x - w.x, dz = z - w.z;
    if (dx * dx + dz * dz < (K.stride * size) * (K.stride * size)) return;
    const y = st.TR.floorY(x, z, body.y);
    w.x = x; w.z = z; w.side = -w.side;
    if (!Number.isFinite(y) || Math.abs(body.y - y) > K.airborne) return;
    const yaw = Math.atan2(dx, dz);
    place.position.set(x + Math.cos(yaw) * K.spread * size * w.side, y + K.lift, z - Math.sin(yaw) * K.spread * size * w.side);
    place.rotation.set(0, yaw, 0); place.scale.set(K.size[0] * size, 1, K.size[1] * size); place.updateMatrix();
    t.m.setMatrixAt(t.next, place.matrix); t.m.instanceMatrix.needsUpdate = true;
    t.next = (t.next + 1) % K.count; t.m.count = Math.max(t.m.count, t.next || K.count);
  }
  function beforeDraw() {
    if (!st || !stage || stage.id !== st.def.id) return;
    const c = camera.position, p = Game.player, dt = Math.min(0.05, effectSlots.real()), inside = inAny(st.inside, c.x, c.z) || !!p && inAny(st.inside, p.x, p.z);   // the player in the doorway counts, the camera still out in the yard behind them
    if (st.inside.length) {
      st.k += ((inside ? 1 : 0) - st.k) * (1 - Math.exp(-dt * C.interiorRate));
      visuals.setInterior(st.k < 0.002 ? 0 : st.k > 0.998 ? 1 : st.k);
      if (st.veil) { st.veil.material.opacity = 1 - st.k; st.veil.visible = st.k < 0.998; }
    }
    if (st.tracks && Game.player && Game.mode === 'play') {
      stepTracks(st.tracks, Game.player, 1);
      for (const e of Game.enemies) if (e.alive()) stepTracks(st.tracks, e, e.def.scale ?? 1);
    }
  }
  visuals.hooks.stage.push(build);
  visuals.hooks.quality.push(fit);
  visuals.hooks.beforeDraw.push(beforeDraw);
  return { get state() { return st; }, painters: Object.keys(PAINTERS) };
})();
