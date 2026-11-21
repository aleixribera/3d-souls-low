'use strict';
// ============================================================================
// The bird summons, drawn (pass 144, design/abilities batch 11): the Thunder Hawk and the Night Owl. Drawing only: where
// they circle, the hawk's dives and the owl's marks are the engine's (js/abilities.js); this listens to their
// `abilityPower` events, the server's for everyone online.
// ============================================================================
// Each is its own Blender model (tools/blender/thunder_hawk.py, js/baked/thunder-hawk.js; tools/blender/night_owl.py,
// js/baked/night-owl.js): one rigid piece per joint, hung here on pivots (BIRD_JOINTS, each script's JOINT) and moved by
// hand, drawn in the beasts' cel shader (js/summon-beasts.js `cel`): ink bands under a hard blue rim, an ink outline.
// Both circle `alt` m over the place the engine keeps them at (summonStep: its `orbit` turns it round the boss). The hawk
// glides with its lightning wings spread; at each strike's `flight` word it folds them and stoops on the boss, the
// thunderclap landing with the engine's `land` word (a star of light, a scorch ring), and climbs back. The owl beats its
// wings slowly; each mark (its `strike`) lights its eyes and hangs a rune on the boss's back, pulsing under 1 Hz until it
// lapses (`markLife`) or a blow bursts it (`owlBurst`, from the engine's abilityOwlLanded). Four of each in the pool (one
// a player), made at attach; nothing allocated per frame. Tuning: VIS.abilityFx.hawk / .owl.
// The joints (absolute rest places, game axes, nose +z, wings along x) and each one's parent: the Blender scripts' numbers.
const BIRD_JOINTS = {
  hawk: {
    body: [[0, 0, 0], null], head: [[0, 0.04, 0.2], 'body'], tail: [[0, 0, -0.17], 'body'],
    wingLu: [[0.07, 0.03, 0.03], 'body'], wingLl: [[0.45, 0.03, 0], 'wingLu'], wingRu: [[-0.07, 0.03, 0.03], 'body'], wingRl: [[-0.45, 0.03, 0], 'wingRu'],
  },
  owl: {
    body: [[0, 0, 0], null], head: [[0, 0.06, 0.17], 'body'], tail: [[0, -0.01, -0.16], 'body'],
    wingLu: [[0.08, 0.03, 0.02], 'body'], wingLl: [[0.42, 0.03, 0], 'wingLu'], wingRu: [[-0.08, 0.03, 0.02], 'body'], wingRl: [[-0.42, 0.03, 0], 'wingRu'],
  },
};
const BIRD_PREFIX = { hawk: 'hawk:', owl: 'owl:' };
const BIRD_EYES = { hawk: [[0.035, 0.07, 0.27], [-0.035, 0.07, 0.27]], owl: [] };   // the owl's eyes are its model's `eye` slot
const summonBirds = (() => {
  const KINDS = Object.keys(BIRD_JOINTS), birds = [];
  const geos = {};
  function parts(kind) {
    if (!geos[kind]) {
      geos[kind] = [];
      const pre = BIRD_PREFIX[kind];
      for (const name of Object.keys(BAKED)) {
        if (!name.startsWith(pre)) continue;
        const [part, slot] = name.slice(pre.length).split('__');
        geos[kind].push([part, slot.split('.')[0], bakedGeometry(name)]);
      }
    }
    return geos[kind];
  }
  const EYE = new THREE.SphereGeometry(0.018, 8, 6);
  function make(kind) {
    const F = VIS.abilityFx[kind], J = BIRD_JOINTS[kind], C = summonBeasts.cel(F);
    const bar = F.bar !== undefined ? C.tone(F.bar, F.barLit) : C.dark;
    const root = new THREE.Group(), pivots = {};
    root.rotation.order = 'YXZ';
    for (const [name, [at, parent]] of Object.entries(J)) {
      const g = new THREE.Group(), from = parent ? J[parent][0] : [0, 0, 0];
      g.position.set(at[0] - from[0], at[1] - from[1], at[2] - from[2]);
      pivots[name] = g;
    }
    for (const [name, [, parent]] of Object.entries(J)) (parent ? pivots[parent] : root).add(pivots[name]);
    for (const [part, slot, geo] of parts(kind)) {
      const at = J[part][0], mat = slot === F.light ? C.bright : slot === 'bar' ? bar : C.dark;
      for (const m of [new THREE.Mesh(geo, mat), new THREE.Mesh(geo, C.outline)]) {
        m.position.set(-at[0], -at[1], -at[2]); m.castShadow = m.receiveShadow = false;
        pivots[part].add(m);
      }
    }
    const eyes = new THREE.MeshBasicMaterial({ color: F.eye, toneMapped: false }), head = J.head[0];
    for (const e of BIRD_EYES[kind]) { const m = new THREE.Mesh(EYE, eyes); m.position.set(e[0] - head[0], e[1] - head[1], e[2] - head[2]); pivots.head.add(m); }
    root.scale.setScalar(F.size);
    root.traverse(o => { o.userData.warmUp = true; });
    root.visible = false; scene.add(root);
    return { kind, F, J, root, pivots, shared: C.shared, body: null, enemy: null, enemies: null, x: 0, z: 0, yaw: 0, age: 0, left: 0, time: 1, gone: false,
      px: 0, py: 0, pz: 0, fx: 0, fy: 0, fz: 0, dive: Infinity, flight: 1, climb: Infinity, heading: 0, bank: 0, pitch: 0, flap: 0, glow: 0, mote: 0 };
  }
  // ---- Marks: the hawk's star of light, the owl's runes (pooled, shared) -------------------------------------------------
  let TEX = null;
  function tex() {
    if (TEX) return TEX;
    const canvas = (w, h, draw) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    const INK = '#0b0d12', BLUE = '#8fb8dc', CORE = '#f2f6fa';
    const star = (g, m, n, r0, r1) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r0 : r1; g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); } g.closePath(); };
    TEX = {
      star: canvas(128, 128, (g, w) => {   // a hard eight-point star: ink edge, blue, a white core
        const m = w / 2;
        star(g, m, 8, m * 0.3, m * 0.98); g.fillStyle = INK; g.fill();
        star(g, m, 8, m * 0.24, m * 0.84); g.fillStyle = BLUE; g.fill();
        star(g, m, 8, m * 0.14, m * 0.55); g.fillStyle = CORE; g.fill();
      }),
      rune: canvas(128, 128, (g, w) => {   // an owl's eye in a ring: two strokes of white over blue, an ink edge
        const m = w / 2;
        for (const [lw, c] of [[14, INK], [8, BLUE], [3, CORE]]) {
          g.lineWidth = lw; g.strokeStyle = c; g.lineCap = 'round';
          g.beginPath(); g.arc(m, m, m * 0.72, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.moveTo(m * 0.45, m); g.quadraticCurveTo(m, m * 0.45, m * 1.55, m); g.quadraticCurveTo(m, m * 1.55, m * 0.45, m); g.stroke();
          g.beginPath(); g.moveTo(m, m * 0.2); g.lineTo(m, m * 0.42); g.moveTo(m, m * 1.58); g.lineTo(m, m * 1.8); g.stroke();
        }
        g.fillStyle = CORE; g.beginPath(); g.arc(m, m, m * 0.13, 0, Math.PI * 2); g.fill();
      }),
    };
    return TEX;
  }
  const STARS = 6, stars = [], RUNES = 8, runes = [];
  let starAt = 0;
  function sprite(map) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    s.renderOrder = 14; s.visible = false; scene.add(s); pooledFx.push(s); return s;
  }
  function makeMarks() {
    for (let i = 0; i < STARS; i++) stars.push({ s: sprite(tex().star), age: Infinity, life: 0.4, size: 1 });
    for (let i = 0; i < RUNES; i++) runes.push({ s: sprite(tex().rune), e: null, age: Infinity, left: 0, burst: Infinity });
  }
  function starAtPoint(p, size, life) {
    const q = stars[starAt++ % STARS];
    q.age = 0; q.life = life; q.size = size; q.s.position.set(p.x, p.y, p.z); q.s.material.rotation = Math.random() * 0.8; q.s.visible = true;
  }
  const runeOn = e => runes.find(q => q.e === e && q.age !== Infinity);
  // Where a rune hangs: on enemy `e`'s back, at `up` of its height.
  function runePlace(q) {
    const e = q.e, F = VIS.abilityFx.owl, r = (e.radius || 1) * 0.9, s = Math.sin(e.yaw || 0), c = Math.cos(e.yaw || 0);
    q.s.position.set(e.x - s * r, e.y + (e.height || 1.8) * F.runeUp, e.z - c * r);
  }
  function ageMarks(dt, now) {
    const still = reducedMotion(), F = VIS.abilityFx.owl;
    for (const q of stars) {
      if (q.age === Infinity) continue;
      q.age += dt; const p = q.age / q.life;
      if (p >= 1) { q.age = Infinity; q.s.visible = false; continue; }
      q.s.scale.setScalar(q.size * (p < 0.15 ? 0.5 + p / 0.15 * 0.5 : 1)); q.s.material.opacity = p > 0.5 ? 1 - (p - 0.5) / 0.5 : 1;
    }
    for (const q of runes) {
      if (q.age === Infinity) continue;
      q.age += dt;
      const gone = !q.e || !q.e.alive() || !Game.enemies.includes(q.e);
      if (q.burst !== Infinity) {   // a blow burst it: it swells and is gone in `burstTime`
        q.burst += dt; const p = q.burst / F.burstTime;
        if (p >= 1 || gone) { q.age = Infinity; q.e = null; q.s.visible = false; continue; }
        runePlace(q); q.s.scale.setScalar(F.rune * (1 + p * 1.2)); q.s.material.opacity = 1 - p;
        continue;
      }
      if ((q.left -= dt) <= 0 || gone) { q.age = Infinity; q.e = null; q.s.visible = false; continue; }
      runePlace(q);
      // Up in 0.15 s, then a slow pulse (F.pulse Hz, under 1; held still in reduced motion), fading over its last 0.4 s.
      const pulse = still ? 1 : 1 + 0.1 * Math.sin(now * Math.PI * 2 * F.pulse);
      q.s.scale.setScalar(F.rune * Math.min(1, q.age / 0.15) * pulse);
      q.s.material.opacity = Math.min(1, q.left / 0.4);
    }
  }
  const at = { x: 0, y: 0, z: 0 };
  const near = (x, z) => Game.player && Math.hypot(Game.player.x - x, Game.player.z - z) < VIS.abilityFx.near;
  const light = (p, color, k, range) => effectLighting.flash(p, color, k * (reducedMotion() ? 0.5 : 1), range);
  const mine = d => birds.find(q => q.kind === d.then && q.body && q.body === d.body);
  function ground(x, z, y) { const g = world.groundAt(x, z, y + 0.5); return Number.isFinite(g) ? g : y; }
  function foe(h, b) {
    if (h.enemy && h.enemy.alive() && Game.enemies.includes(h.enemy)) return h.enemy;
    let best = CONFIG.abilities.summons.near, e = null;
    for (const o of Game.enemies) if (o.alive()) { const dd = Math.hypot(o.x - b.x, o.z - b.z); if (dd < best) { best = dd; e = o; } }
    return (h.enemy = e);
  }
  function call(d) {
    let h = mine(d);
    const F = VIS.abilityFx[d.then], body = d.body, renew = !!h && h.left > F.fade;
    h = h || birds.find(q => q.kind === d.then && !q.body) || birds.filter(q => q.kind === d.then).reduce((a, b) => (a.left < b.left ? a : b));
    h.body = body; h.enemy = d.enemy || null; h.left = d.v.time; h.enemies = Game.enemies;
    if (renew) { h.time = d.v.time + F.rise; h.gone = false; return; }   // up already: it stays up
    h.time = d.v.time; h.gone = false; h.age = 0; h.dive = h.climb = Infinity; h.glow = 0; h.bank = h.pitch = 0;
    const from = body || d;
    h.x = from.x; h.z = from.z; h.yaw = h.heading = body ? body.yaw || 0 : 0;
    // It bursts up off its holder's shoulder in a puff of ink and light.
    h.px = from.x; h.py = (from.y || 0) + 1.5; h.pz = from.z;
    at.x = h.px; at.y = h.py; at.z = h.pz;
    spawnBurst(at, F.burst); ultraFx.moteBurst(at, 18, F.color, { r: 0.4, speed: 1.2, lift: 2, life: [0.5, 1.1], up: 1 }); light(at, F.color, 5, 8);
  }
  // The hawk stoops (the engine's `flight` s until the blow lands): from where it is, onto the boss's chest.
  function stoop(d) {
    const h = mine(d);
    if (!h) return;
    if (d.enemy) h.enemy = d.enemy;
    h.dive = 0; h.flight = Math.max(0.05, d.flight); h.climb = Infinity; h.fx = h.px; h.fy = h.py; h.fz = h.pz;
  }
  // The dive's blow lands: a star of light on the boss, a scorch ring at its feet, a thunderclap's flash.
  function clap(d) {
    const h = mine(d), e = d.enemy;
    if (h) { h.dive = Infinity; h.climb = 0; h.fx = h.px; h.fy = h.py; h.fz = h.pz; h.glow = 1; }
    if (!e) return;
    const F = VIS.abilityFx.hawk;
    at.x = e.x; at.y = e.y + Math.min(1.4, (e.height || 1.8) * 0.55); at.z = e.z;
    starAtPoint(at, F.star, 0.4);
    ultraFx.sparkBurst(at, 16, 'lunar', [0, 1, 0], 0.7, 0.7); spawnBurst(at, F.hitBurst); light(at, F.color, 7, 10);
    groundFx.ring(e.x, e.z, F.scorch, F.color, 0.8, e.y);
    if (near(e.x, e.z)) Game.addShake(F.shake[0], F.shake[1]);
  }
  // The owl marks: its eyes flare and a rune hangs on the boss's back for `markLife` s (renewed if one is there).
  function mark(d) {
    const h = mine(d), e = d.enemy;
    if (h) h.glow = 1;
    if (!e) return;
    const F = VIS.abilityFx.owl, q = runeOn(e) || runes.find(r => r.age === Infinity) || runes.reduce((a, b) => (a.left < b.left ? a : b));
    const fresh = q.e !== e || q.burst !== Infinity;
    q.e = e; q.left = CONFIG.abilities.summons.owl.markLife; q.burst = Infinity; if (fresh) q.age = 0;
    q.s.material.opacity = 1; q.s.visible = true; runePlace(q);
    ultraFx.moteBurst(q.s.position, 8, F.color, { r: 0.25, speed: 0.8, lift: 0.6, life: [0.3, 0.7] });
  }
  // A blow burst the mark: the rune swells and breaks in a ring of light.
  function burst(d) {
    const e = d.enemy, q = e && runeOn(e), F = VIS.abilityFx.owl;
    if (!e) return;
    if (q) { q.burst = 0; runePlace(q); at.x = q.s.position.x; at.y = q.s.position.y; at.z = q.s.position.z; }
    else { at.x = e.x; at.y = e.y + (e.height || 1.8) * F.runeUp; at.z = e.z; }
    ultraFx.sparkBurst(at, 12, 'lunar', [0, 1, 0], 0.6, 0.6); ultraFx.flare(at, F.color, 1.6); light(at, F.color, 5, 7);
    groundFx.ring(e.x, e.z, F.burstRing, F.color, 0.7, e.y);
  }
  const ease = t => t * t * (3 - 2 * t);
  // The wings: a glide's slow sway, a beat's flap, folded back in a stoop. Forward is +z, a left wing along +x.
  function wings(h, beat, amp, fold) {
    const P = h.pivots, s = Math.sin(h.flap), lag = Math.sin(h.flap - 0.9);
    const up = s * amp * beat, low = lag * amp * 0.7 * beat;
    P.wingLu.rotation.set(0, fold * 1.1, up + fold * 0.5); P.wingRu.rotation.set(0, -fold * 1.1, -up - fold * 0.5);
    P.wingLl.rotation.set(0, fold * 1.4, low + fold * 0.3); P.wingRl.rotation.set(0, -fold * 1.4, -low - fold * 0.3);
    P.tail.rotation.x = -0.1 + fold * 0.2 + s * 0.05 * beat;
  }
  function draw() {
    const dt = effectSlots.dt(), now = effectSlots.time(), K = CONFIG.abilities.summons;
    ageMarks(dt, now);
    for (const h of birds) {
      if (!h.body) continue;
      const F = h.F, b = h.body, alive = b.alive ? b.alive() : true, S = K[h.kind];
      if (alive) h.left -= dt; else h.left = Math.min(h.left, F.fade);
      if (h.left <= 0 || h.enemies !== Game.enemies) { h.body = null; h.root.visible = false; continue; }   // a new fight ends it too
      const e = foe(h, b);
      h.age += dt;
      summonStep(h, e, alive ? b : null, dt);   // the place it circles over, by the engine's rule
      const cy = ground(h.x, h.z, e ? e.y : b.y) + S.alt;
      const x0 = h.px, y0 = h.py, z0 = h.pz;
      let beat = 1, fold = 0;
      if (h.dive !== Infinity && e) {   // stooping: faster and faster onto the boss's chest, wings folded
        h.dive += dt; const p = Math.min(1, h.dive / h.flight), k = p * p;
        const tx = e.x, ty = e.y + Math.min(1.4, (e.height || 1.8) * 0.55), tz = e.z;
        h.px = h.fx + (tx - h.fx) * k; h.py = h.fy + (ty - h.fy) * k; h.pz = h.fz + (tz - h.fz) * k;
        fold = Math.min(1, p * 3); beat = 0;
        if (p >= 1 && h.dive > h.flight + 0.3) { h.dive = Infinity; h.climb = 0; h.fx = h.px; h.fy = h.py; h.fz = h.pz; }   // its land word lost: climb anyway
      } else if (h.climb !== Infinity) {   // climbing back to its circle, beating hard
        h.climb += dt; const p = Math.min(1, h.climb / F.climb), k = ease(p);
        h.px = h.fx + (h.x - h.fx) * k; h.py = h.fy + (cy - h.fy) * k; h.pz = h.fz + (h.z - h.fz) * k;
        beat = 1.6; if (p >= 1) h.climb = Infinity;
      } else {   // circling: eases toward its place (rising off its holder at first)
        const k = 1 - Math.exp(-(h.age < F.rise ? 3 : 6) * dt);
        h.px += (h.x - h.px) * k; h.py += (cy - h.py) * k; h.pz += (h.z - h.pz) * k;
        beat = h.age < F.rise ? 1.6 : F.glide;
      }
      // Heading along its flight; banked into the turn; pitched down a stoop, up a climb.
      const vx = (h.px - x0) / Math.max(dt, 1e-4), vy = (h.py - y0) / Math.max(dt, 1e-4), vz = (h.pz - z0) / Math.max(dt, 1e-4), sp = Math.hypot(vx, vz);
      const was = h.heading;
      if (sp > 0.3) h.heading = was + angDiff(Math.atan2(vx, vz), was) * (1 - Math.exp(-F.turn * dt));
      const turn = angDiff(h.heading, was) / Math.max(dt, 1e-4);
      h.bank += (clamp(-turn * 0.35, -0.7, 0.7) - h.bank) * (1 - Math.exp(-5 * dt));
      h.pitch += (clamp(-Math.atan2(vy, Math.max(sp, 0.5)), -1.3, 1.3) - h.pitch) * (1 - Math.exp(-8 * dt));
      h.flap += dt * F.flap * Math.PI * 2 * (beat > 1 ? 1.5 : 1);
      wings(h, beat, F.wing, fold);
      h.pivots.head.rotation.x = -h.pitch * 0.4; h.pivots.head.rotation.y = reducedMotion() ? 0 : Math.sin(now * 0.7 + h.x) * 0.25;
      h.root.position.set(h.px, h.py + (reducedMotion() ? 0 : Math.sin(now * 1.3 + h.z) * 0.08), h.pz);
      h.root.rotation.set(h.pitch, h.heading, h.bank);
      // Forming from the tail up as it bursts off its holder; burning away from the head down.
      const rising = clamp01(h.age / F.rise), fading = clamp01(h.left / F.fade), u = h.shared, span = 0.7 * F.size;
      u.uFrom.value = 1; u.uCut.value = fading < 1 ? h.py - span * 0.5 + span * fading : rising < 1 ? h.py - span * 0.5 + span * rising : h.py + 99;
      h.glow = Math.max(0, h.glow - dt / F.glowTime);
      u.uTime.value = now; u.uBoost.value = 1 + h.glow * F.glowBoost;
      if (fading < 1 && !h.gone) { h.gone = true; at.x = h.px; at.y = h.py; at.z = h.pz; ultraFx.moteBurst(at, 20, F.color, { r: 0.4, speed: 0.9, lift: 1.5, life: [0.5, 1.1], up: 1 }); }
      if ((h.mote -= dt) <= 0) { h.mote = F.motes; at.x = h.px; at.y = h.py; at.z = h.pz; ultraFx.moteBurst(at, 1, F.color, MOTES); }
      h.root.visible = true;
    }
  }
  const MOTES = { r: 0.3, speed: 0.2, lift: -0.4, life: [0.4, 0.9], up: 0, size: 0.7 };
  events.on('abilityPower', d => {
    if (d.then === 'owlBurst') { burst(d); return; }
    if (!BIRD_JOINTS[d.then]) return;
    if (d.then === 'hawk' && d.land) clap(d);
    else if (d.then === 'hawk' && d.flight) stoop(d);
    else if (d.then === 'owl' && d.strike) mark(d);
    else if (d.draw) { const h = mine(d); if (h) { h.glow = 1; at.x = h.px; at.y = h.py; at.z = h.pz; ultraFx.flare(at, h.F.color, 2); } }
    else if (!d.strike) call(d);
  });
  function clear() {
    for (const h of birds) { h.body = null; h.root.visible = false; }
    for (const q of stars) { q.age = Infinity; q.s.visible = false; }
    for (const q of runes) { q.age = Infinity; q.e = null; q.s.visible = false; }
  }
  return {
    attach() {
      if (!birds.length) { makeMarks(); for (const k of KINDS) for (let i = 0; i < 4; i++) birds.push(make(k)); }
      Game.renderHooks.push(draw); visuals.hooks.stage.push(clear);
    },
    clear, info: () => ({ birds: birds.filter(h => h.body).map(h => ({ kind: h.kind, x: h.px, y: h.py, z: h.pz, diving: h.dive !== Infinity, climbing: h.climb !== Infinity })),
      runes: runes.filter(q => q.age !== Infinity).length, bursting: runes.filter(q => q.burst !== Infinity).length }),
  };
})();
