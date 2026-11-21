'use strict';
// ============================================================================
// The rares' perks drawn (design/abilities, BUILD-ORDER batch 4): drawing only
// ============================================================================
// The eleven kept rares, in the cel look (pass 108) and the rares' blue ink (STYLE.md): flat hard-edged shapes in two or
// three tones of blue with a dark ink outline, few big sharp particles, no light. The holder's own cues (`abilityPerk`
// is told to the holder's screen); the two rare powers (Counterflame, Static Edge) everyone's. Every mesh and sprite is
// pooled and made at load; each ages in real time (it runs through hit-pause). Tuning: VIS.abilityFx.rare. Sounds:
// js/audio.js ABILITY_PERK_SOUNDS.
//   Counterstep   a blue ribbon round the boss from the dodge to the landing, blue copies on the way (js/afterimage.js),
//                 a ring and flakes where it lands.
//   Vengeance     a dark flame sheath on the blade while the answer waits, dimming at its end; a big blue star as it lands.
//   Bloodthirst   a mote orbits the chest for each blow of the streak; at the last they spiral in and a ring heals; a
//                 hurt scatters them to the floor.
//   Last Breath   in its band: a cold breath every `breath` s, blue dash copies, flakes off each dash's start.
//   Opportunist   a cracked guard glows blue (js/finisher-fx.js); each blow on it throws blue splinters and a chip.
//   Bastion       the block arms it: a ring bursts off the guard and the blade hums pale blue until the heavy.
//   Patience      the blade's edge lit an even pale blue while the blow waits; it lands as one long brush stroke.
//   Counterflame  five blue flame tongues bursting off the boss, embers rising.
//   Static Edge   a short zigzag bolt from the blade tip into the boss, a star and sparks.
//   Grave Feast   droplets of blue light from the boss into the chest, flakes rising, a ring.
//   Iron Mercy    a cross glint at the deflect sinks into the chest, a small ring and flakes.
const rareFx = (() => {
  const K = () => VIS.abilityFx.rare;
  const INK = '#0e1218', BLUE = '#8fb8dc', CORE = '#f2f6fa', PALE = '#cfe2f2', DEEP = '#2c5f8a', BODY = '#1a2a3c';
  const C_BLUE = 0x8fb8dc, C_CORE = 0xf2f6fa, C_PALE = 0xcfe2f2, C_INK = 0x0e1218;
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rnd = (() => { let s = 41; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();   // the same drawings every load
  const inked = (g, path, fill, edge, ink = 7, rim = 2.5) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    path(); g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill();
    if (edge) { path(); g.lineWidth = rim; g.strokeStyle = edge; g.stroke(); }
  };
  const starPath = (g, m, inner, mid, outer) => () => {
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? m * inner : (i % 4 ? m * mid : m * outer); const x = m + Math.cos(a) * r, y = m + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath();
  };
  let STAR, CROSS, CHIP, RING, FLAKE, ZIG, TONGUE, STROKE, RIBBON, SHEATH, EDGE, MOTE, PUFF;
  function textures() {
    STAR = canvasTex(128, 128, (g, w) => {   // a hard four-point star: ink, blue points, a white core
      inked(g, starPath(g, w / 2, 0.16, 0.5, 0.92), BLUE, CORE, 8, 2);
      g.beginPath(); g.arc(w / 2, w / 2, w * 0.1, 0, Math.PI * 2); g.fillStyle = CORE; g.fill();
    });
    CROSS = canvasTex(128, 128, (g, w) => {   // Iron Mercy's cross glint: four equal points, white inside a blue edge
      inked(g, starPath(g, w / 2, 0.12, 0.9, 0.9), CORE, BLUE, 8, 3);
    });
    CHIP = canvasTex(128, 64, (g, w, h) => {   // a crack's flash: a jagged white line, ink under it
      const pts = [[4, h * 0.6], [w * 0.22, h * 0.35], [w * 0.4, h * 0.62], [w * 0.6, h * 0.3], [w * 0.78, h * 0.55], [w - 4, h * 0.4]];
      for (const [th, c] of [[13, INK], [7, BLUE], [3, CORE]]) { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts) g.lineTo(...p); g.lineWidth = th; g.strokeStyle = c; g.lineJoin = 'miter'; g.stroke(); }
    });
    RING = canvasTex(256, 256, (g, w) => {   // a flat ring: ink under blue, a white core
      const m = w / 2, arc = (th, c) => { g.beginPath(); g.arc(m, m, m * 0.8, 0, Math.PI * 2); g.lineWidth = th; g.strokeStyle = c; g.stroke(); };
      arc(20, INK); arc(12, BLUE); arc(4, CORE);
    });
    FLAKE = canvasTex(32, 32, (g, w, h) => {   // a hard shard (tinted per use)
      g.beginPath(); g.moveTo(w * 0.1, h * 0.55); g.lineTo(w * 0.5, h * 0.1); g.lineTo(w * 0.9, h * 0.4); g.lineTo(w * 0.45, h * 0.9); g.closePath(); g.fillStyle = '#fff'; g.fill();
    });
    ZIG = canvasTex(512, 64, (g, w, h) => {   // a zigzag bolt along the strip: ink, blue, white core
      const pts = [[4, h / 2]];
      for (let x = 30, up = true; x < w - 20; x += 24 + rnd() * 20, up = !up) pts.push([x, h / 2 + (up ? -1 : 1) * (8 + rnd() * 12)]);
      pts.push([w - 4, h / 2]);
      const line = (width, color) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts) g.lineTo(...p); g.lineWidth = width; g.strokeStyle = color; g.stroke(); };
      g.lineJoin = 'miter'; g.lineCap = 'round';
      line(15, INK); line(9, BLUE); line(3.5, CORE);
    });
    TONGUE = canvasTex(256, 128, (g, w, h) => {   // one flame tongue, base left: white-hot core, blue edge, deep blue inner lines
      const path = () => { g.beginPath(); g.moveTo(8, h * 0.62); g.bezierCurveTo(w * 0.35, h * 0.95, w * 0.75, h * 0.85, w * 0.9, h * 0.45);
        g.quadraticCurveTo(w * 0.98, h * 0.2, w * 0.86, h * 0.06); g.quadraticCurveTo(w * 0.8, h * 0.4, w * 0.6, h * 0.5);
        g.bezierCurveTo(w * 0.4, h * 0.58, w * 0.2, h * 0.5, 8, h * 0.62); g.closePath(); };
      inked(g, path, CORE, BLUE, 8, 4);
      g.strokeStyle = DEEP; g.lineWidth = 3.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(w * 0.25, h * 0.66); g.bezierCurveTo(w * 0.5, h * 0.78, w * 0.72, h * 0.7, w * 0.83, h * 0.42); g.stroke();
    });
    STROKE = canvasTex(512, 64, (g, w, h) => {   // one thick brush stroke, tapering to a dry-brush tail
      const body = (k, c) => { g.beginPath(); g.moveTo(w * 0.02, h / 2); g.quadraticCurveTo(w * 0.2, h / 2 - h * 0.42 * k, w * 0.55, h / 2 - h * 0.3 * k);
        g.lineTo(w * 0.98, h / 2); g.lineTo(w * 0.55, h / 2 + h * 0.3 * k); g.quadraticCurveTo(w * 0.2, h / 2 + h * 0.42 * k, w * 0.02, h / 2); g.closePath(); g.fillStyle = c; g.fill(); };
      body(1, INK); body(0.78, BLUE); body(0.3, CORE);
      g.globalCompositeOperation = 'destination-out';   // the dry brush: gaps in the tail
      for (let i = 0; i < 9; i++) { g.fillRect(w * (0.62 + rnd() * 0.36), h * (0.3 + rnd() * 0.4), 10 + rnd() * 30, 1.5 + rnd() * 2); }
      g.globalCompositeOperation = 'source-over';
    });
    RIBBON = canvasTex(64, 64, (g, w, h) => {   // across a ribbon: ink edges, blue, a white core line
      g.fillStyle = INK; g.fillRect(0, 0, w, h);
      g.fillStyle = BLUE; g.fillRect(0, h * 0.14, w, h * 0.72);
      g.fillStyle = CORE; g.fillRect(0, h * 0.42, w, h * 0.16);
    });
    SHEATH = canvasTex(256, 64, (g, w, h) => {   // flame tongues licking up the blade (base left, tip right): dark body, blue edge
      for (let i = 0; i < 7; i++) {
        const x = i * w / 7 + rnd() * 8, l = w * (0.16 + rnd() * 0.08), up = i % 2 ? -1 : 1, path = () => { g.beginPath(); g.moveTo(x, h / 2 + up * h * 0.2);
          g.quadraticCurveTo(x + l * 0.5, h / 2 + up * h * 0.48, x + l, h / 2 + up * h * 0.1); g.quadraticCurveTo(x + l * 0.4, h / 2, x, h / 2 - up * h * 0.1); g.closePath(); };
        inked(g, path, BODY, BLUE, 5, 2.5);
      }
    });
    EDGE = canvasTex(64, 32, (g, w, h) => {   // a lit edge: pale blue band, a white hairline, soft ends across
      g.fillStyle = INK; g.fillRect(0, h * 0.2, w, h * 0.6);
      g.fillStyle = PALE; g.fillRect(0, h * 0.28, w, h * 0.44);
      g.fillStyle = CORE; g.fillRect(0, h * 0.46, w, h * 0.08);
    });
    MOTE = canvasTex(64, 64, (g, w) => {   // Bloodthirst's mote: an inked blue diamond with a red thread in its core
      const m = w / 2, path = () => { g.beginPath(); g.moveTo(m, 4); g.lineTo(w - 12, m); g.lineTo(m, w - 4); g.lineTo(12, m); g.closePath(); };
      inked(g, path, BLUE, CORE, 6, 2);
      g.strokeStyle = '#a8303a'; g.lineWidth = 3; g.beginPath(); g.moveTo(m, 16); g.lineTo(m, w - 16); g.stroke();
    });
    PUFF = canvasTex(64, 64, (g, w) => {   // a flat puff of cold breath, two tones
      const path = () => { g.beginPath(); g.arc(w * 0.35, w * 0.6, w * 0.2, 0, Math.PI * 2); g.arc(w * 0.6, w * 0.45, w * 0.24, 0, Math.PI * 2); g.arc(w * 0.72, w * 0.66, w * 0.16, 0, Math.PI * 2); };
      g.fillStyle = BLUE; path(); g.fill();
      g.save(); g.translate(-3, -3); g.fillStyle = PALE; path(); g.fill(); g.restore();
    });
  }
  const mat = (map, opts = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, ...opts });
  const sprite = (map, order = 13) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false }));
    s.visible = false; s.renderOrder = order; scene.add(s); pooledFx.push(s); return s;
  };
  const mesh = (geo, material, order = 12) => {
    const m = new THREE.Mesh(geo, material); m.visible = false; m.renderOrder = order; m.frustumCulled = false; scene.add(m); pooledFx.push(m); return m;
  };

  // ---- Pools ---------------------------------------------------------------------------------------------------------
  // pops: a sprite that pops open and fades, optionally sinking into a body's chest; rings; flakes; tongues; one each of
  // the bolt, the ribbon, the stroke, the blade light and the breath; Bloodthirst's motes.
  const RIB = 24;   // the ribbon's segments
  let made = false, bolt, ribbon, stroke, blade, puff;
  const pops = [], rings = [], flakes = [], tongues = [], motes = [];
  const spiral = { age: Infinity, n: 0, a: 0 };
  const breath = { next: 0 };
  function make() {
    if (made) return;
    made = true; textures();
    for (let i = 0; i < 5; i++) pops.push({ s: sprite(STAR, 14), age: Infinity, life: 0.25, size: 1, x: 0, y: 0, z: 0, rot: 0, sink: null, sinkAt: 0 });
    const disc = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < 3; i++) rings.push({ m: mesh(disc, mat(RING), 3), age: Infinity, life: 1, from: 1, to: 2, flakes: 0, x: 0, y: 0, z: 0 });
    for (let i = 0; i < 40; i++) flakes.push({ s: sprite(FLAKE, 13), age: Infinity, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, size: 0.1, grav: 0 });
    for (let i = 0; i < 5; i++) { const s = sprite(TONGUE, 14); s.center.set(0, 0.5); tongues.push({ s, age: Infinity, rot: 0, x: 0, y: 0, z: 0 }); }
    for (let i = 0; i < 6; i++) motes.push(sprite(MOTE, 14));
    {   // a strip along +x of two crossed planes, so it reads from any side
      const g = new THREE.Group(), strip = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0), m = mat(ZIG);
      const a = new THREE.Mesh(strip, m), b = new THREE.Mesh(strip, m); b.rotation.x = Math.PI / 2;
      for (const q of [a, b]) { q.renderOrder = 14; q.frustumCulled = false; g.add(q); }
      g.visible = false; scene.add(g); g.userData.warmUp = true;
      bolt = { g, m, age: Infinity, life: 0.14 };
    }
    {   // Counterstep's ribbon: a band standing round the boss, rebuilt (its buffer rewritten) at each step
      const geo = new THREE.BufferGeometry(), pos = new Float32Array((RIB + 1) * 2 * 3), uv = new Float32Array((RIB + 1) * 2 * 2), idx = [];
      for (let i = 0; i <= RIB; i++) { uv.set([i / RIB, 0, i / RIB, 1], i * 4); if (i < RIB) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
      ribbon = { m: mesh(geo, mat(RIBBON), 13), pos, age: Infinity };
    }
    stroke = { s: sprite(STROKE, 14), age: Infinity, x: 0, y: 0, z: 0, rot: 0 };
    {   // the blade's light: two crossed planes along the blade (the weapon's local z, 0.25 to 1.25 m), set from its pivot.
      // Drawn over the holder's own body (no depth test), so it reads from behind them, where the blade is out of sight.
      const g = new THREE.Group(), geo = new THREE.PlaneGeometry(1, 1).rotateY(-Math.PI / 2).translate(0, 0, 0.75), m = mat(EDGE, { depthTest: false });   // its u along the blade
      const a = new THREE.Mesh(geo, m), b = new THREE.Mesh(geo, m); b.rotation.z = Math.PI / 2;
      for (const q of [a, b]) { q.renderOrder = 15; q.frustumCulled = false; g.add(q); }
      g.visible = false; scene.add(g); g.userData.warmUp = true;
      blade = { g, a, b, m, map: null };
    }
    puff = { s: sprite(PUFF, 13), age: Infinity, x: 0, y: 0, z: 0 };
  }
  const freeFlake = () => flakes.find(f => f.age === Infinity) || flakes.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
  function throwFlakes(x, y, z, n, color, opt) {
    const many = Math.max(1, Math.round(n * (CONFIG.VISUALS.fxBudgets[visuals.quality().fxBudget] || { density: 1 }).density));
    for (let i = 0; i < many; i++) {
      const f = freeFlake(), a = rnd() * Math.PI * 2, sp = opt.speed * (0.5 + rnd() * 0.6);
      f.age = 0; f.life = opt.life * (0.75 + rnd() * 0.5); f.x = x; f.y = y; f.z = z;
      f.vx = Math.cos(a) * sp; f.vz = Math.sin(a) * sp; f.vy = (opt.up || 0) * (0.5 + rnd());
      f.spin = (rnd() - 0.5) * 12; f.size = opt.size * (0.7 + rnd() * 0.6); f.grav = opt.grav;
      f.s.material.color.setHex(color[i % color.length]); f.s.material.opacity = 1; f.s.material.rotation = rnd() * 6.3;
      f.s.position.set(x, y, z); f.s.scale.setScalar(f.size); f.s.visible = true;
    }
  }
  const BLUES = [C_BLUE, C_CORE, C_INK], PALES = [C_PALE, C_CORE], BLUE1 = [C_BLUE];
  const FALL = { speed: 2.4, up: 0.8, grav: 6, size: 0.1, life: 0.4 }, RISE = { speed: 0.6, up: 1.4, grav: -0.6, size: 0.08, life: 0.6 };
  const DROP = { speed: 0.4, up: 0, grav: 8, size: 0.1, life: 0.3 };
  // A sprite popping at (x, y, z), `size` m, gone at `life` s; with `sink` (a body), it travels into its chest from `sinkAt` s.
  function pop(map, x, y, z, size, life, sink = null, sinkAt = 0) {
    const p = pops.find(q => q.age === Infinity) || pops.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
    p.age = 0; p.life = life; p.size = size; p.x = x; p.y = y; p.z = z; p.rot = (rnd() - 0.5) * 0.5; p.sink = sink; p.sinkAt = sinkAt;
    p.s.material.map = map; p.s.material.opacity = 1; p.s.position.set(x, y, z); p.s.scale.setScalar(size * 0.5); p.s.visible = true;
  }
  // A flat ring at (x, y, z), `from` to `to` m across over `life` s, after `wait` s; `flakes` thrown out as it starts.
  function ring(x, y, z, from, to, life, wait = 0, n = 0) {
    const r = rings.find(q => q.age === Infinity) || rings.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
    r.age = -wait; r.life = life; r.from = from; r.to = reducedMotion() ? from + (to - from) * 0.6 : to; r.x = x; r.y = y + 0.05; r.z = z; r.flakes = n;
    r.m.material.opacity = 0; r.m.position.set(r.x, r.y, r.z); r.m.scale.set(from, 1, from); r.m.visible = wait <= 0;
  }
  const spot = { x: 0, y: 0, z: 0 };
  const chest = (b, h = 0.6) => { spot.x = b.x; spot.y = b.y + (b.height || 1.8) * h; spot.z = b.z; return spot; };
  // A point on the enemy's body facing (x, z), at `h` of its height.
  function flank(e, x, z, h) {
    const dx = x - e.x, dz = z - e.z, l = Math.hypot(dx, dz) || 1, r = (e.radius || 0.6) * 0.85;
    spot.x = e.x + dx / l * r; spot.y = e.y + (e.height || 1.8) * h; spot.z = e.z + dz / l * r; return spot;
  }
  const tip = new THREE.Vector3(), dir = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
  // The blade's tip of `b`'s rig (its chest, without one).
  function bladeTip(b) {
    const w = b && b.rig && b.rig.weapon;
    if (!w) { const c = chest(b, 0.55); return tip.set(c.x, c.y, c.z); }
    w.updateWorldMatrix(true, false); return tip.set(0, 0, 1.2).applyMatrix4(w.matrixWorld);
  }

  // ---- The cues --------------------------------------------------------------------------------------------------------
  function step(d) {   // Counterstep: a ribbon round the boss from where the dodge was to where it lands
    const e = d.target, R = K();
    if (!e || !d.from || !d.to) return;
    const a0 = Math.atan2(d.from.x - e.x, d.from.z - e.z), a1 = Math.atan2(d.to.x - e.x, d.to.z - e.z), turn = angDiff(a1, a0);
    const r0 = Math.hypot(d.from.x - e.x, d.from.z - e.z), r1 = Math.hypot(d.to.x - e.x, d.to.z - e.z);
    for (let i = 0; i <= RIB; i++) {
      const k = i / RIB, s = k * k * (3 - 2 * k), a = a0 + turn * s, r = lerp(r0, r1, s), x = e.x + Math.sin(a) * r, z = e.z + Math.cos(a) * r, y = lerp(d.from.y, d.to.y, k) + 0.9;
      ribbon.pos.set([x, y - R.band / 2, z, x, y + R.band / 2, z], i * 6);
    }
    ribbon.m.geometry.attributes.position.needsUpdate = true;
    ribbon.m.geometry.setDrawRange(0, 0); ribbon.age = 0; ribbon.m.material.opacity = 1; ribbon.m.visible = true;
    ring(d.to.x, d.to.y, d.to.z, 0.6, 1.5, 0.35, R.land, R.flakes);
  }
  function perk(d) {
    const b = d.body, R = K();
    if (!b || b !== Game.player || COMMON_PERKS.has(d.perk)) return;
    switch (d.perk) {
      case 'dodge/flashBehind': step(d); break;
      case 'hurt/armed': { const c = chest(b, 0.92); pop(STAR, c.x, c.y, c.z, 0.25, 0.2); break; }   // the eye's glint under the hood
      case 'empower': {   // Vengeance answered
        const e = d.target; if (!e) break;
        const at = flank(e, b.x, b.z, 0.55); pop(STAR, at.x, at.y, at.z, R.answer, 0.3);
        throwFlakes(at.x, at.y, at.z, 12, BLUES, FALL);
        break;
      }
      case 'streak/heal': spiral.age = 0; spiral.n = Math.min(motes.length, Math.max(1, ((b.kit.perks['streak/heal'] || {}).hits || 2) - 1)); break;
      case 'streak/lost': for (const m of motes) if (m.visible) throwFlakes(m.position.x, m.position.y, m.position.z, 1, BLUE1, DROP); break;   // the held motes fall
      case 'low/freeDash': breath.next = 0; break;
      case 'cracked/damage': {   // Opportunist
        const e = d.target; if (!e) break;
        const at = flank(e, b.x, b.z, 0.55); pop(CHIP, at.x, at.y, at.z, R.chip, 0.12);
        throwFlakes(at.x, at.y, at.z, 8, BLUES, FALL);
        break;
      }
      case 'block/armed': {   // Bastion: a ring bursts off the guard
        ring(b.x, b.y, b.z, 0.4, 1.2 * 1.6, 0.3);
        const c = chest(b, 0.6); throwFlakes(c.x, c.y, c.z, 6, PALES, FALL);
        break;
      }
      case 'unhurt/empower': {   // Patience: one long brush stroke through the boss
        const e = d.target; if (!e) break;
        const at = flank(e, b.x, b.z, 0.55);
        stroke.age = 0; stroke.x = at.x; stroke.y = at.y; stroke.z = at.z; stroke.rot = (rnd() - 0.5) * 0.7;
        stroke.s.material.rotation = stroke.rot; stroke.s.material.opacity = 1; stroke.s.visible = true;
        throwFlakes(at.x, at.y, at.z, 10, [C_INK], FALL);
        break;
      }
      case 'finisher/heal': {   // Grave Feast: droplets from the boss into the chest
        const e = d.target;
        if (e) { const f = flank(e, b.x, b.z, 0.55); for (let i = 0; i < 3; i++) pop(STAR, f.x + (rnd() - 0.5) * 0.5, f.y + (rnd() - 0.5) * 0.5, f.z + (rnd() - 0.5) * 0.5, 0.35, R.feed + 0.05, b, 0); }
        ring(b.x, b.y, b.z, R.ring.from, 2, R.ring.life, 0.45);
        throwFlakes(b.x, b.y + 0.6, b.z, 20, PALES, RISE);   // round the holder (chest's spot was taken by the flank)
        break;
      }
      case 'parry/heal': {   // Iron Mercy: a cross glint in the deflect sinks into the chest
        const e = d.target, f = e ? flank(e, b.x, b.z, 0.6) : chest(b, 0.7);
        pop(CROSS, f.x, f.y, f.z, R.glint, 0.45, b, 0.15);
        ring(b.x, b.y, b.z, 0.4, 1.3, 0.3, 0.4);
        const c = chest(b, 0.6); throwFlakes(c.x, c.y, c.z, 8, PALES, RISE);
        break;
      }
    }
  }
  function power(d) {
    const e = d.enemy, R = K();
    if (!e) return;
    if (d.power === 'counterflame') {   // five tongues bursting off the boss
      const b = d.body || e, at = flank(e, b.x, b.z, 0.55);
      for (let i = 0; i < tongues.length; i++) {
        const t = tongues[i]; t.age = 0; t.x = at.x; t.y = at.y; t.z = at.z; t.rot = i * Math.PI * 2 / tongues.length + (rnd() - 0.5) * 0.4;
        t.s.material.rotation = t.rot; t.s.material.opacity = 1; t.s.visible = true;
      }
      throwFlakes(at.x, at.y, at.z, 12, PALES, RISE);
    } else if (d.power === 'static-edge') {   // a bolt from the blade tip to the boss, a star and sparks
      const from = bladeTip(d.body), at = flank(e, from.x, from.z, 0.55);
      dir.set(at.x - from.x, at.y - from.y, at.z - from.z);
      const len = dir.length(); if (!(len > 0.05)) return;
      bolt.g.position.copy(from); bolt.g.quaternion.setFromUnitVectors(X, dir.multiplyScalar(1 / len)); bolt.g.scale.set(len, 0.35, 0.35);
      bolt.age = 0; bolt.m.opacity = 1; bolt.g.visible = true;
      pop(STAR, at.x, at.y, at.z, R.star, 0.2);
      throwFlakes(at.x, at.y, at.z, 10, PALES, FALL);
    }
  }

  // ---- Drawing -----------------------------------------------------------------------------------------------------------
  const pivotQ = new THREE.Quaternion(), pivotS = new THREE.Vector3();
  function render(game) {
    if (!made) return;
    const real = effectSlots.real(), R = K(), calm = reducedMotion(), p = game && game.player, live = !!(p && p.alive && p.alive() && game.mode === 'play');
    // the blade's light, from the perk clocks: Vengeance's flame over Bastion's hum over Patience's still edge
    const P = live && p.kit ? p.kit.perks : null, st = live ? p.perk : null, w = live && p.rig && p.rig.weapon;
    let map = null, k = 0;
    if (P && st && w) {
      if (P['hurt/empower'] && st.vengeance > 0) { map = SHEATH; k = Math.min(1, st.vengeance / R.dim); }
      else if (P['block/charge'] && st.bastion > 0) { map = EDGE; k = Math.min(1, st.bastion / R.dim); }
      else if (P['unhurt/empower'] && st.calm >= P['unhurt/empower'].after) { map = EDGE; k = 1; }
    }
    if (map) {
      if (blade.map !== map) { blade.map = map; blade.m.map = map; blade.m.needsUpdate = true; }
      w.updateWorldMatrix(true, false); w.matrixWorld.decompose(blade.g.position, pivotQ, pivotS); blade.g.quaternion.copy(pivotQ);
      blade.a.scale.y = blade.b.scale.y = R.width * (map === SHEATH ? 2.2 : 1);
      blade.m.opacity = 0.35 + 0.65 * k; blade.g.visible = true;
    } else blade.g.visible = false;
    // Bloodthirst's motes: one per blow of the streak, orbiting the chest; spiralling in at its end
    const streak = P && st && P['streak/heal'] ? st.streak : 0, t = effectSlots.time ? effectSlots.time() : 0;
    let shown = 0;
    if (spiral.age !== Infinity) {
      spiral.age += real;
      if (spiral.age > R.spiral || !live) { spiral.age = Infinity; if (live) ring(p.x, p.y, p.z, R.ring.from, R.ring.to, R.ring.life); }
      else shown = spiral.n;
    }
    if (!shown) shown = Math.min(streak, motes.length);
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      if (i >= shown || !live) { m.visible = false; continue; }
      const inK = spiral.age !== Infinity ? spiral.age / R.spiral : 0, r = R.orbit * (1 - inK), a = (calm ? 0 : t * R.spin * (1 + 2 * inK)) + i * Math.PI * 2 / Math.max(1, shown);
      const c = chest(p, 0.6);
      m.position.set(c.x + Math.sin(a) * r, c.y + Math.sin(a * 2) * 0.08, c.z + Math.cos(a) * r); m.scale.setScalar(0.22 * (1 - 0.6 * inK)); m.visible = true;
    }
    // Last Breath's band: a cold breath every `breath` s
    const B = P && P['low/freeDash'];
    if (B && p.hp <= p.maxHp * B.below && (breath.next -= real) <= 0) {
      breath.next = R.breath; const c = chest(p, 0.95);
      puff.age = 0; puff.x = c.x; puff.y = c.y; puff.z = c.z; puff.s.visible = true;
    }
    if (puff.age !== Infinity) {
      puff.age += real;
      if (puff.age > R.puff) { puff.age = Infinity; puff.s.visible = false; }
      else { const q = puff.age / R.puff; puff.s.position.set(puff.x, puff.y + q * 0.35, puff.z); puff.s.scale.setScalar(0.25 + q * 0.25); puff.s.material.opacity = 1 - q * q; }
    }
    if (ribbon.age !== Infinity) {   // draws itself round the boss, then thins away
      ribbon.age += real;
      if (ribbon.age > R.ribbonLife) { ribbon.age = Infinity; ribbon.m.visible = false; }
      else {
        const n = calm ? RIB : Math.ceil(RIB * Math.min(1, ribbon.age / R.draw));
        ribbon.m.geometry.setDrawRange(0, n * 6); ribbon.m.material.opacity = 1 - clamp01((ribbon.age - R.draw) / (R.ribbonLife - R.draw));
      }
    }
    if (bolt.age !== Infinity) { bolt.age += real; if (bolt.age > bolt.life) { bolt.age = Infinity; bolt.g.visible = false; } else bolt.m.opacity = 1 - clamp01((bolt.age - 0.08) / 0.06); }
    if (stroke.age !== Infinity) {   // laid in 0.1 s, held, then thins and fades
      stroke.age += real;
      const L = R.strokeLife;
      if (stroke.age > L) { stroke.age = Infinity; stroke.s.visible = false; }
      else {
        const lay = calm ? 1 : Math.min(1, stroke.age / 0.1), out = clamp01((stroke.age - 0.25) / (L - 0.25));
        stroke.s.position.set(stroke.x, stroke.y, stroke.z); stroke.s.scale.set(R.stroke * lay, 0.5 * (1 - 0.6 * out), 1); stroke.s.material.opacity = 1 - out;
      }
    }
    for (const q of tongues) {   // burst out, curl up 1.2x, shrink to their roots
      if (q.age === Infinity) continue;
      q.age += real;
      const L = R.flameLife;
      if (q.age > L) { q.age = Infinity; q.s.visible = false; continue; }
      const grow = calm ? 1 : Math.min(1, q.age / 0.06), out = clamp01((q.age - 0.3) / (L - 0.3)), lick = 1 + 0.2 * clamp01((q.age - 0.05) / 0.3);
      q.s.position.set(q.x, q.y, q.z); q.s.scale.set(R.tongue * grow * lick * (1 - out), R.tongue * 0.45 * (1 - 0.5 * out), 1);
      q.s.material.rotation = q.rot + (calm ? 0 : 0.25 * lick - 0.25);
    }
    for (const q of pops) {
      if (q.age === Infinity) continue;
      q.age += real;
      if (q.age > q.life) { q.age = Infinity; q.s.visible = false; q.sink = null; continue; }
      const popK = Math.min(1, q.age / 0.04), out = clamp01((q.age - q.life * 0.5) / (q.life * 0.5));
      let x = q.x, y = q.y, z = q.z, size = q.size * (0.5 + 0.5 * popK);
      if (q.sink && q.age > q.sinkAt) {   // travels into the body's chest, shrinking
        const s = clamp01((q.age - q.sinkAt) / (q.life - q.sinkAt)), e = s * s * (3 - 2 * s), c = chest(q.sink, 0.6);
        x = lerp(q.x, c.x, e); y = lerp(q.y, c.y, e); z = lerp(q.z, c.z, e); size *= 1 - 0.7 * e;
        q.s.material.opacity = 1;
      } else q.s.material.opacity = q.sink ? 1 : 1 - out;
      q.s.position.set(x, y, z); q.s.scale.setScalar(size); q.s.material.rotation = q.rot + (calm ? 0 : q.age * 1.5);
    }
    for (const r of rings) {
      if (r.age === Infinity) continue;
      r.age += real;
      if (r.age < 0) continue;
      if (!r.m.visible) { r.m.visible = true; if (r.flakes) throwFlakes(r.x, r.y + 0.1, r.z, r.flakes, PALES, FALL); }
      if (r.age > r.life) { r.age = Infinity; r.m.visible = false; continue; }
      const q = r.age / r.life, s = lerp(r.from, r.to, 1 - (1 - q) * (1 - q));
      r.m.scale.set(s, 1, s); r.m.material.opacity = 1 - q * q;
    }
    for (const f of flakes) {
      if (f.age === Infinity) continue;
      f.age += real;
      if (f.age > f.life) { f.age = Infinity; f.s.visible = false; continue; }
      const dt = Math.min(real, 0.05);
      f.vy -= f.grav * dt; f.vx *= 1 - 1.5 * dt; f.vz *= 1 - 1.5 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      f.s.position.set(f.x, f.y, f.z); f.s.material.rotation += f.spin * dt;
      f.s.material.opacity = 1 - clamp01((f.age / f.life - 0.6) / 0.4);
    }
  }
  function clear() {
    if (!made) return;
    for (const q of [...pops, ...tongues, stroke, puff]) { q.age = Infinity; q.s.visible = false; }
    for (const q of pops) q.sink = null;
    for (const r of rings) { r.age = Infinity; r.m.visible = false; }
    for (const f of flakes) { f.age = Infinity; f.s.visible = false; }
    for (const m of motes) m.visible = false;
    ribbon.age = Infinity; ribbon.m.visible = false; bolt.age = Infinity; bolt.g.visible = false; blade.g.visible = false;
    spiral.age = Infinity; breath.next = 0;
  }
  // Blue dash copies (js/afterimage.js): Counterstep's step, and every dash in Last Breath's band.
  function tint(p) {
    if (!p || !p.kit) return null;
    const B = p.kit.perks['low/freeDash'];
    return p.blink || (B && p.hp <= p.maxHp * B.below) ? K().afterimage : null;
  }
  return {
    attach() {
      make(); Game.renderHooks.push(render); visuals.hooks.stage.push(clear);
      afterimage.hooks.tint = tint;
      events.on('abilityPerk', perk);
      events.on('abilityPower', d => { if (d.power === 'counterflame' || d.power === 'static-edge') power(d); });
      events.on('dash', d => {   // Last Breath: flakes kicked off each dash's start
        const p = d.player, B = p && p === Game.player && p.kit && p.kit.perks['low/freeDash'];
        if (B && p.hp <= p.maxHp * B.below) throwFlakes(p.x, p.y + 0.1, p.z, 6, PALES, FALL);
      });
    },
    clear,
    // tests: what shows now
    get state() {
      if (!made) return {};
      return { pops: pops.filter(q => q.age !== Infinity).length, rings: rings.filter(r => r.age !== Infinity).length, flakes: flakes.filter(f => f.age !== Infinity).length,
        tongues: tongues.filter(q => q.age !== Infinity).length, motes: motes.filter(m => m.visible).length, ribbon: ribbon.age !== Infinity, bolt: bolt.age !== Infinity,
        stroke: stroke.age !== Infinity, breath: puff.age !== Infinity, blade: blade.g.visible ? (blade.map === SHEATH ? 'flame' : 'edge') : null };
    },
  };
})();
