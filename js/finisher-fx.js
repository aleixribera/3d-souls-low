'use strict';
// ============================================================================
// The Finishing Blow's look (pass 103, PLAN.md "Next, small" 2; ANIM_SETTINGS.finisherFx)
// ============================================================================
// Drawing only (rule 5): it listens to the Finishing Blow's events (js/finisher.js) and reads bodies on a render hook,
// with sprites and meshes made at load, so nothing is allocated per frame and the fight never changes.
// - Guard cracks: each counter that cracks a guard (guardCrack) breaks a glowing crack open on the foe's body, a bigger
//   one and a second for the next counter, breathing slowly. They hold until the
//   Finishing Blow bursts them, or crumble if the foe goes home.
// - The blow, on the striker's screen (finisherStart .. finisherEnd): time stops (the world drains of colour but its
//   reds, the edges close in, drifting dust hangs, the foe holds the pose it was caught in, its cracks flare white);
//   each flash step (finisherStep) leaves a streak of light along its path and a thin cut across the foe; as the cuts
//   open (finisher) every line opens at once in one burst (a star of light, sparks, a shockwave, the colour back with
//   a kick), the camera punches in after its slow swing, and the striker holds the closing pose
//   (ATTACK_POSES.finisherStrike).
// Reduced motion: no swing or punch, steady cracks, fewer sparks, no flash as time stops. Flashes: one as time stops,
// one as the cuts open, half a second apart (under 3 Hz).
// Looks (pass 171): ANIM_SETTINGS.finisherFx.look is the one players get; `?finisher=<id>` picks another of its `looks`
// for that page (Aleix compares them). A look is the base values with its own laid over, section by section.
const finisherFx = (() => {
  const asked = (() => { try { return new URLSearchParams(location.search).get('finisher'); } catch (e) { return null; } })();
  let lookId = null, merged = null;
  function setLook(id) {
    const B = ANIM_SETTINGS.finisherFx, L = B.looks || {};
    lookId = id && L[id] ? id : L[B.look] ? B.look : null;
    const over = (lookId && L[lookId]) || {};
    merged = {};
    for (const k of Object.keys(B)) {
      if (k === 'looks') continue;
      const v = B[k];
      merged[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...v, ...(over[k] || {}) } : v;
    }
    if (made) inkBlend();
    return lookId;
  }
  const S = () => merged || (setLook(asked), merged);
  const fxOn = () => typeof ultraFx !== 'undefined' && ultraFx.on();
  const outBack = x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  // A crack: jagged arms branching out from a hot point, glowing at their edges, fading toward their tips. Seeded, so
  // every load draws the same three.
  function crackTex(seed) {
    return canvasTex(256, 256, (g, w) => {
      let s = seed;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, m = w / 2, lines = [];
      const arm = (x, y, a, len, width, depth) => {
        const n = 5 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) {
          a += (rnd() - 0.5) * 1.0;
          const nx = x + Math.cos(a) * len / n, ny = y + Math.sin(a) * len / n;
          lines.push([x, y, nx, ny, width * (1 - 0.75 * i / n)]);
          if (depth < 2 && rnd() < 0.4) arm(nx, ny, a + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.7), len * 0.45, width * 0.6, depth + 1);
          x = nx; y = ny;
        }
      };
      // three or four arms, uneven round the point (a crack, not a star): one long split and shorter ones off it
      const arms = 3 + Math.floor(rnd() * 2), a0 = rnd() * Math.PI * 2;
      for (let i = 0; i < arms; i++) arm(m, m, a0 + (i / arms) * Math.PI * 2 + (rnd() - 0.5) * 1.2, m * (i ? 0.45 + rnd() * 0.3 : 0.92), i ? 3.2 : 4.2, 0);
      g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = '#fff';
      for (const [blur, alpha, wide] of [[6, 0.35, 2.2], [0, 1, 0.75]]) {
        g.shadowBlur = blur; g.strokeStyle = `rgba(255,255,255,${alpha})`;
        for (const [x0, y0, x1, y1, lw] of lines) { g.lineWidth = lw * wide; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
      }
      g.shadowBlur = 0;
      const hot = g.createRadialGradient(m, m, 0, m, m, m * 0.1);
      hot.addColorStop(0, 'rgba(255,255,255,1)'); hot.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = hot; g.fillRect(0, 0, w, w);
      g.globalCompositeOperation = 'destination-in';   // the tips fade out
      const fade = g.createRadialGradient(m, m, m * 0.2, m, m, m);
      fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.6, 'rgba(0,0,0,0.75)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fade; g.fillRect(0, 0, w, w);
    });
  }
  let CRACKS = null, LINE = null, STREAK = null, STAR = null, BLADE = null;
  function textures() {
    if (LINE) return;
    CRACKS = [crackTex(7919), crackTex(104729), crackTex(1299709)];
    LINE = canvasTex(256, 32, (g, w, h) => {   // a cut: bright through its middle, soft at its ends and edges
      const along = g.createLinearGradient(0, 0, w, 0);
      along.addColorStop(0, 'rgba(255,255,255,0)'); along.addColorStop(0.15, 'rgba(255,255,255,0.9)'); along.addColorStop(0.5, 'rgba(255,255,255,1)');
      along.addColorStop(0.85, 'rgba(255,255,255,0.9)'); along.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = along; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      const across = g.createLinearGradient(0, 0, 0, h);
      across.addColorStop(0, 'rgba(0,0,0,0)'); across.addColorStop(0.4, 'rgba(0,0,0,0.8)'); across.addColorStop(0.5, 'rgba(0,0,0,1)');
      across.addColorStop(0.6, 'rgba(0,0,0,0.8)'); across.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = across; g.fillRect(0, 0, w, h);
    });
    BLADE = canvasTex(512, 32, (g, w, h) => {   // an ink look's cut (pass 171): a hard-edged stroke, widest a third along, sharp at both tips
      const m = h / 2;
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(2, m);
      g.quadraticCurveTo(w * 0.3, m - h * 0.62, w - 2, m); g.quadraticCurveTo(w * 0.3, m + h * 0.62, 2, m); g.fill();
    });
    STREAK = canvasTex(256, 64, (g, w, h) => {   // a flash step's blur: faint where it left, hot where it arrived
      const along = g.createLinearGradient(0, 0, w, 0);
      along.addColorStop(0, 'rgba(255,255,255,0)'); along.addColorStop(0.55, 'rgba(255,255,255,0.45)'); along.addColorStop(0.9, 'rgba(255,255,255,1)');
      along.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = along; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      const across = g.createLinearGradient(0, 0, 0, h);
      across.addColorStop(0, 'rgba(0,0,0,0)'); across.addColorStop(0.3, 'rgba(0,0,0,0.35)'); across.addColorStop(0.5, 'rgba(0,0,0,1)');
      across.addColorStop(0.7, 'rgba(0,0,0,0.35)'); across.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = across; g.fillRect(0, 0, w, h);
    });
    STAR = canvasTex(256, 256, (g, w) => {   // the burst: a hot core and long rays
      const m = w / 2, glow = g.createRadialGradient(m, m, 0, m, m, m);
      glow.addColorStop(0, 'rgba(255,255,255,1)'); glow.addColorStop(0.1, 'rgba(255,255,255,0.75)'); glow.addColorStop(0.3, 'rgba(255,255,255,0.12)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = glow; g.fillRect(0, 0, w, w);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const len = i % 2 ? m * 0.55 : m, th = i % 2 ? 2.5 : 5;
        g.save(); g.translate(m, m); g.rotate(i * Math.PI / 4 + 0.2);
        const s = g.createLinearGradient(-len, 0, len, 0);
        s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(0.5, 'rgba(255,255,255,1)'); s.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = s; g.beginPath(); g.ellipse(0, 0, len, th, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    });
  }
  const sprite = (map, order, depthTest) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest, fog: false }));
    s.visible = false; s.renderOrder = order; scene.add(s); pooledFx.push(s); return s;
  };

  // ---- pools ----
  const sets = [], cuts = [], streaks = [];
  let made = false, star = null;
  function make() {
    if (made) return;
    made = true; textures();
    // A crack set per cracked foe: up to three cracks on its body.
    for (let i = 0; i < 4; i++) sets.push({ foe: null, s: [0, 1, 2].map(j => sprite(CRACKS[j], 11, true)), level: 0, shown: [0, 0, 0], pop: [9, 9, 9], since: 0, gone: Infinity, flare: 0, burst: Infinity });
    for (let i = 0; i < 4; i++) cuts.push({ core: sprite(LINE, 14, false), glow: sprite(LINE, 13, false), age: Infinity, rot: 0, h: 0.6, side: 0, len: 2 });
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: STREAK, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.visible = false; m.renderOrder = 12; scene.add(m); pooledFx.push(m);
      streaks.push({ m, age: Infinity, fx: 0, fz: 0, tx: 0, tz: 0, y: 0 });
    }
    star = { s: sprite(STAR, 15, false), age: Infinity, x: 0, y: 0, z: 0, size: 1 };
    inkBlend();
  }
  // An ink look's cuts: the wide stroke drawn over the world in its dark colour, the core still light.
  function inkBlend() {
    const ink = S().cut.ink > 0, b = ink ? THREE.NormalBlending : THREE.AdditiveBlending;
    for (const C of cuts) {
      C.glow.material.blending = b;
      for (const sp of [C.core, C.glow]) { sp.material.map = ink ? BLADE : LINE; sp.material.needsUpdate = true; }
    }
  }

  // ---- the blow's state (the striker's own screen) ----
  const blow = { on: false, p: null, e: null, t: 0, open: Infinity, freeze: 0, kick: 0, sign: 1, swingK: 0, spread: 1 };
  const view = { swing: 0, punch: 0 };   // read by the camera (js/game-view.js)
  const mine = p => !!p && p === Game.player;

  // The foe stops in the pose it was caught in: its joints as last drawn, kept on its rig until the blow ends. The list
  // of joints is built once per rig.
  const JOINTS = ['tip', 'spin', 'chest', 'neck', 'head', 'armL', 'armR', 'elbowL', 'elbowR', 'legL', 'legR', 'kneeL', 'kneeR', 'weapon'];
  function joints(r) {
    if (r.freezeList) return r.freezeList;
    const list = [], add = o => { if (o && o.rotation && !list.includes(o)) list.push(o); };
    for (const k of JOINTS) add(r[k]);
    if (r.bones) for (const k of Object.keys(r.bones)) add(r.bones[k]);
    r.freezeList = list; r.freezeRot = new Float32Array(list.length * 3); r.freezeSpin = new Float32Array(6);
    return list;
  }
  function snapshot(r) {
    if (!r || !r.spin) return;
    const list = joints(r), R = r.freezeRot, P = r.freezeSpin;
    for (let i = 0; i < list.length; i++) { const o = list[i].rotation; R[i * 3] = o.x; R[i * 3 + 1] = o.y; R[i * 3 + 2] = o.z; }
    P[0] = r.spin.position.x; P[1] = r.spin.position.y; P[2] = r.spin.position.z; P[3] = r.spin.scale.x; P[4] = r.spin.scale.y; P[5] = r.spin.scale.z;
    r.frozen = true;
  }
  // From the held foe's pose (js/finisher.js executedPose): true when it was put back as it stopped (this blow's
  // snapshot: another player's blow online, with no snapshot here, keeps the stand-in pose).
  function hold(r, e) {
    if (!r || !r.frozen || !r.freezeList || !e.exec || r.frozenExec !== e.exec) return false;
    const list = r.freezeList, R = r.freezeRot, P = r.freezeSpin;
    for (let i = 0; i < list.length; i++) list[i].rotation.set(R[i * 3], R[i * 3 + 1], R[i * 3 + 2]);
    r.spin.position.set(P[0], P[1], P[2]); r.spin.scale.set(P[3], P[4], P[5]);
    return true;
  }

  // ---- events ----
  const at = { x: 0, y: 0, z: 0 };
  const chestOf = e => { at.x = e.x; at.y = e.y + (e.height || 1.8) * 0.6; at.z = e.z; return at; };
  events.on('guardCrack', d => {
    const e = d.enemy;
    if (!e) return;
    make();
    let set = sets.find(q => q.foe === e);
    if (!(d.cracks > 0)) { if (set && set.level > 0) { set.level = 0; set.gone = 0; } return; }
    if (!set) {
      set = sets.find(q => !q.foe) || sets.reduce((x, y) => (y.since > x.since ? y : x));
      set.foe = e; set.level = 0; set.gone = Infinity; set.burst = Infinity; set.flare = 0;
      for (let i = 0; i < 3; i++) { set.shown[i] = 0; set.pop[i] = 9; set.s[i].visible = false; }
    }
    const was = set.level;
    set.level = Math.min(3, d.cracks); set.since = 0; set.gone = Infinity;
    for (let i = was; i < Math.min(3, set.level + (set.level >= 2 ? 1 : 0)); i++) set.pop[i] = 0;   // the second crack opens two more
    const c = chestOf(e), mineToo = !d.by || d.by === Game.player;
    if (fxOn()) ultraFx.flare(c, S().crack.hot, 1.6 + 0.8 * d.cracks, 0.25);   // js/ultra-fx.js bursts the sparks
    else spawnBurst(c, CONFIG.fx.bursts.guardCrack);
    if (mineToo) Game.addShake(CONFIG.fx.guardCrackShake.time, CONFIG.fx.guardCrackShake.amp * d.cracks);
  });
  events.on('finisherStart', d => {
    const e = d.enemy;
    if (e && e.rig) { snapshot(e.rig); e.rig.frozenExec = e.exec; }   // the foe stops as it stood
    if (!mine(d.player)) return;
    make();
    blow.on = true; blow.p = d.player; blow.e = e; blow.t = 0; blow.open = Infinity; blow.swingK = 0;
    blow.cutTime = d.time || 0.5;
    blow.sign = Math.sin(angDiff(Math.atan2(e.x - d.player.x, e.z - d.player.z), Game.cam.yaw)) >= 0 ? -1 : 1;
    const set = sets.find(q => q.foe === e);
    if (set) set.flare = 1;
    for (const C of cuts) { C.age = Infinity; C.core.visible = C.glow.visible = false; }
    const F = S().freeze;
    if (F.flash > 0 && !reducedMotion() && typeof ultraPost !== 'undefined') ultraPost.pulse({ flash: F.flash, color: F.flashColor });
    if (fxOn()) ultraPost.wave(chestOf(e), 1.4, 0.9);
  });
  events.on('finisherStep', d => {
    if (!mine(d.player) || !blow.on) return;
    const K = S(), i = d.i % streaks.length, St = streaks[i], e = blow.e;
    St.fx = d.from.x; St.fz = d.from.z; St.tx = d.to.x; St.tz = d.to.z; St.y = d.player.y + 1.0; St.age = 0; St.m.visible = true;
    // the cut this step leaves across the foe: each at its own height and slant, so the three cross
    const C = cuts[d.i % cuts.length], T = K.cut.tilts;
    C.age = -K.cut.delay; C.rot = T[d.i % T.length]; C.h = K.cut.heights[d.i % K.cut.heights.length]; C.side = (d.i % 2 ? -1 : 1) * 0.08;
    C.len = K.cut.length * Math.sqrt(Math.max(1, (e.radius || 0.5) / 0.6)) * ((e.height || 1.8) / 1.8) ** 0.5;
    if (fxOn()) { ultraFx.sparkBurst(chestOf(e), reducedMotion() ? 6 : 16, 'parry', null, 0, 1.2); if (d.i === 0 && !reducedMotion() && K.burst.light > 0) ultraFx.flashAt(at, K.cut.ink ? K.cut.color : K.cut.glow, 5, 6); }
    else spawnBurst({ x: d.to.x, y: d.player.y + 1, z: d.to.z }, CONFIG.finisher.bursts.step);
  });
  events.on('finisher', d => {
    const e = d.enemy, K = S(), calm = reducedMotion();
    if (!mine(d.player)) {   // another player's blow, seen from outside: its burst only
      if (fxOn()) { ultraFx.sparkBurst(d.at, calm ? 20 : 60, K.burst.kind); ultraFx.flare(d.at, K.burst.color, 3, 0.3); }
      else spawnBurst(d.at, CONFIG.finisher.bursts.exit);
      return;
    }
    make();
    blow.open = 0;
    star.age = 0; star.x = d.at.x; star.y = d.at.y; star.z = d.at.z; star.size = K.burst.size * Math.max(1, (e.radius || 0.5) / 0.6) ** 0.25; star.s.visible = true;
    for (const C of cuts) if (C.age !== Infinity && C.age < 0) C.age = 0;   // a step's cut not yet drawn shows at once
    const set = sets.find(q => q.foe === e);
    if (set) set.burst = 0;
    if (fxOn()) {
      const n = calm ? 0.35 : 1;
      ultraFx.sparkBurst(d.at, Math.round(K.burst.sparks * n), K.burst.kind, null, 0, 1.5);
      ultraFx.sparkBurst(d.at, Math.round(K.burst.sparks * 0.5 * n), 'ember', [0, 1, 0], 0.3, 1.2);
      ultraFx.moteBurst(d.at, Math.round(40 * n), K.burst.color, { r: e.radius || 0.5, speed: 3, lift: 1, life: [0.6, 1.4], size: 1.2 });
      if (K.burst.light > 0) ultraFx.flashAt(d.at, K.burst.color, K.burst.light, 10);
      ultraFx.mark(e.x, e.y, e.z, K.burst.color, 3.5 * Math.max(1, (e.radius || 0.5) / 0.6), 1.0, 1);
      ultraPost.wave(d.at, 2.0, 1.6);
      if (K.burst.flash > 0) ultraPost.pulse({ flash: K.burst.flash, color: K.burst.flashColor });
    } else { spawnBurst(d.at, CONFIG.finisher.bursts.enter); spawnBurst(d.exit, CONFIG.finisher.bursts.exit); }
    Game.addShake(CONFIG.finisher.shake.time, CONFIG.finisher.shake.amp);
  });
  events.on('finisherEnd', d => {
    if (d.enemy && d.enemy.rig) d.enemy.rig.frozen = false;
    if (!mine(d.player)) return;
    blow.on = false; blow.p = blow.e = null;
    if (view.swing && !Game.lock && Game.cam) { Game.cam.yaw += view.swing; view.swing = 0; blow.swingK = 0; }
    if (d.abandoned) { blow.open = Infinity; for (const C of cuts) { C.age = Infinity; C.core.visible = C.glow.visible = false; } }
  });

  // ---- drawing ----
  const v = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), toCam = new THREE.Vector3(), dir = new THREE.Vector3(),
    yAx = new THREE.Vector3(), chest = new THREE.Vector3(), m4 = new THREE.Matrix4(), col = new THREE.Color(), col2 = new THREE.Color();
  let baseSat = 1, baseVig = 0, graded = false, slowed = false;
  const baseShadow = new THREE.Vector3(1, 1, 1), baseHigh = new THREE.Vector3(1, 1, 1), tintK = new THREE.Vector3(1, 1, 1);
  function chestPoint(e, out) {
    const r = e.rig, b = r && ((r.bones && r.bones.chest) || r.chest || r.spin);
    if (b) { b.updateWorldMatrix(true, false); out.setFromMatrixPosition(b.matrixWorld); }
    else out.set(e.x, e.y + (e.height || 1.8) * 0.6, e.z);
    return out;
  }
  const PLACES = [[0, 0], [0.32, -0.2], [-0.28, 0.16]];   // each crack's spot on the body: across, up (shares of its height)
  function drawCracks(real, t) {
    const K = S().crack, calm = reducedMotion();
    // Opportunist's holder sees cracks in the rares' blue (rare-fx), everyone else in the crack's amber.
    const tone = Game.player && Game.player.kit && Game.player.kit.perks['cracked/damage'] ? VIS.abilityFx.rare.crack : K.color;
    for (const set of sets) {
      const e = set.foe;
      if (!e) continue;
      const alive = e.alive && e.alive() && e.rig && e.rig.root.visible;
      if (set.level > 0 && (!alive || !(e.cracks > 0)) && set.burst === Infinity && set.gone === Infinity) set.gone = 0;   // gone with no event (a death, a reset)
      if (set.burst !== Infinity) set.burst += real;
      if (set.gone !== Infinity) set.gone += real;
      set.since += real;
      const outK = set.burst !== Infinity ? 1 - set.burst / K.burstTime : set.gone !== Infinity ? 1 - set.gone / K.out : 1;
      if (outK <= 0 || !e.rig) { set.foe = null; set.level = 0; for (const s of set.s) s.visible = false; continue; }
      const h = e.height || 1.8, big = h / 1.8, radius = e.radius || 0.5;
      chestPoint(e, chest);
      toCam.copy(camera.position).sub(chest).normalize();
      right.set(1, 0, 0).applyQuaternion(camera.quaternion); up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      const breath = calm ? 1 : 1 + K.breath * Math.sin(t * Math.PI * 2 * K.pulse);
      set.flare = Math.max(0, set.flare - real * 0.6);
      const want = set.burst !== Infinity ? 3 : set.gone !== Infinity ? 3 : Math.min(3, set.level + (set.level >= 2 ? 1 : 0));
      for (let i = 0; i < 3; i++) {
        const s = set.s[i];
        if (i >= want) { s.visible = false; continue; }
        set.pop[i] += real;
        const pop = set.pop[i], grow = pop < K.pop ? outBack(clamp(pop / K.pop, 0, 1)) : 1, hot = Math.exp(-pop * 6);
        const P = PLACES[i], lvl = i === 0 ? 0.75 + 0.25 * Math.min(set.level, 2) : 0.7;
        const size = K.size * big * lvl * grow * (set.burst !== Infinity ? 1 + 0.9 * (1 - outK) : 1);
        v.copy(toCam).multiplyScalar(radius * K.depth).add(chest).addScaledVector(right, P[0] * radius * 1.6).addScaledVector(up, P[1] * h * 0.5);
        s.position.copy(v); s.scale.set(size, size, 1); s.material.rotation = i * 2.1 + 0.4;
        col.setHex(tone).lerp(col2.setHex(K.hot), Math.min(1, hot + set.flare));
        const bright = K.boost * breath * (1 + 1.6 * hot + 0.8 * set.flare) * outK;
        s.material.color.copy(col).multiplyScalar(bright); s.material.opacity = Math.min(1, outK * 1.2);
        s.visible = true;
      }
    }
  }
  function drawCuts(real) {
    const K = S().cut, opened = blow.open !== Infinity;
    for (const C of cuts) {
      if (C.age === Infinity) continue;
      C.age += real;
      if (C.age < 0) { C.core.visible = C.glow.visible = false; continue; }
      const e = blow.e || null;
      if (e && e.rig && C.age < 1e3) chestPoint(e, v).setY(e.y + (e.height || 1.8) * C.h);
      else if (!e && !opened) { C.age = Infinity; C.core.visible = C.glow.visible = false; continue; }
      const after = opened ? blow.open : -1;
      let len, w, bright;
      if (after < 0) { len = C.len * Math.min(1, C.age / 0.05); w = K.thin; bright = K.held + (1 - K.held) * Math.exp(-C.age * 14); }   // drawn, then held thin and dim
      else {
        const o = Math.min(1, after / 0.05), f = after / K.show;
        if (f >= 1) { C.age = Infinity; C.core.visible = C.glow.visible = false; continue; }
        len = C.len * (1 + 0.3 * o); w = lerp(K.thin, K.wide, o) * (1 - 0.5 * f); bright = (1 + 0.8 * o) * (1 - f) * (1 - f);
      }
      if (e) { C.x = v.x; C.y = v.y; C.z = v.z; }
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      // an ink cut: a dark stroke round a red core that never blooms white (pass 171)
      if (K.ink > 0) { placeCut(C, C.core, len * 0.96, w * 0.45, 1, K.color, Math.min(1, bright)); placeCut(C, C.glow, len, w, 1.1, K.glow, Math.min(1, bright * 1.6) * K.ink); }
      else { placeCut(C, C.core, len, w, 1, K.color, bright * 1.4); placeCut(C, C.glow, len, w, 2.6, K.glow, bright * 0.8); }
    }
  }
  function placeCut(C, s, len, w, wide, hex, bright) {
    s.position.set(C.x + right.x * C.side, C.y, C.z + right.z * C.side);
    s.scale.set(len, w * 8 * wide, 1); s.material.rotation = C.rot;
    s.material.color.setHex(hex).multiplyScalar(Math.max(1, bright)); s.material.opacity = Math.min(1, bright);
    s.visible = true;
  }
  function drawStreaks(real) {
    const K = S().streak, opened = blow.open !== Infinity;
    for (const St of streaks) {
      if (St.age === Infinity) continue;
      St.age += real;
      let k;
      if (!opened && blow.on) k = St.age < 0.04 ? St.age / 0.04 : Math.max(K.held, 1 - (St.age - 0.04) / K.life);   // held faint until the cuts open
      else k = (opened ? Math.max(0, K.held - blow.open / 0.2) : 1 - St.age / K.life);
      if (k <= 0) { St.age = Infinity; St.m.visible = false; continue; }
      dir.set(St.tx - St.fx, 0, St.tz - St.fz);
      const len = dir.length();
      if (len < 0.05) { St.m.visible = false; continue; }
      dir.multiplyScalar(1 / len);
      v.set((St.fx + St.tx) / 2, St.y, (St.fz + St.tz) / 2);
      toCam.copy(camera.position).sub(v); toCam.addScaledVector(dir, -toCam.dot(dir));
      if (toCam.lengthSq() < 1e-6) toCam.set(0, 1, 0);
      toCam.normalize(); yAx.crossVectors(toCam, dir);
      m4.makeBasis(dir, yAx, toCam); St.m.quaternion.setFromRotationMatrix(m4);
      St.m.position.copy(v); St.m.scale.set(len * 1.1, K.width, 1);
      St.m.material.color.setHex(K.color).multiplyScalar(1.2 * k); St.m.material.opacity = Math.min(1, k * 1.2);
      St.m.visible = true;
    }
  }
  function drawStar(real) {
    if (star.age === Infinity) return;
    star.age += real;
    const K = S().burst, f = star.age / K.time;
    if (f >= 1) { star.age = Infinity; star.s.visible = false; return; }
    const g = Math.min(1, star.age / 0.06), size = star.size * (0.35 + 0.65 * EASE.outCubic(g)) * (1 + 0.2 * f);
    star.s.position.set(star.x, star.y, star.z); star.s.scale.set(size, size, 1); star.s.material.rotation = 0.25 * f;
    star.s.material.color.setHex(K.color).lerp(col2.setHex(0xffffff), Math.min(1, K.white / 0.7 * (1 - g * 0.7))).multiplyScalar(1.3 * (1 - f) * (1 - f));
    star.s.visible = true;
  }
  // The stopped world: colour drained but for its reds, the edges closed in, the dust held; the colour comes back with
  // a kick as the cuts open. The grade's own values are kept and put back exactly.
  function drawGrade(game, real) {
    const F = S().freeze, u = visuals.passes && visuals.passes.grade && visuals.passes.grade.uniforms;
    const stopped = blow.on && blow.open === Infinity;
    blow.freeze = stopped ? Math.min(1, blow.freeze + real / F.in) : Math.max(0, blow.freeze - real / F.out);
    blow.kick = blow.open !== Infinity ? F.kick * Math.exp(-blow.open * 6) : 0;
    if (stopped && !reducedMotion()) { game.drawSlow = Math.min(game.drawSlow || 1, F.hold); slowed = true; }
    else if (slowed) { game.drawSlow = 1; slowed = false; }
    if (!u) return;
    if (blow.freeze <= 0 && blow.kick < 0.002) {
      if (graded) restoreGrade(u, true);
      baseSat = u.uSat.value; baseVig = u.uVig.value; baseShadow.copy(u.uShadow.value); baseHigh.copy(u.uHigh.value);
      return;
    }
    graded = true;
    const k = EASE.outCubic(blow.freeze), dim = 1 - (stopped ? F.dark * k : 0);
    u.uSat.value = baseSat * (1 - (1 - F.sat) * k) * (1 + blow.kick);
    u.uVig.value = baseVig + F.vignette * k;
    const T = F.tint, tk = stopped ? k : 0;   // the stopped world's tint, gone at once as the cuts open, with the dark
    tintK.set(1 + (T[0] - 1) * tk, 1 + (T[1] - 1) * tk, 1 + (T[2] - 1) * tk).multiplyScalar(dim);
    u.uShadow.value.copy(baseShadow).multiply(tintK); u.uHigh.value.copy(baseHigh).multiply(tintK);
  }
  function restoreGrade(u, all) {   // a new stage's look sets saturation and tints anew: then only the vignette goes back
    if (all) { u.uSat.value = baseSat; u.uShadow.value.copy(baseShadow); u.uHigh.value.copy(baseHigh); }
    u.uVig.value = baseVig;
    graded = false;
  }
  function drawCamera(real) {
    const K = S().camera, calm = reducedMotion() || (typeof settings !== 'undefined' && settings.cameraMotion === false);
    if (blow.open !== Infinity) blow.open += real;
    if (blow.on) {
      blow.t += real;
      blow.swingK = Math.min(1, blow.swingK + real / Math.max(0.05, blow.cutTime || 0.5));
    } else blow.swingK = Math.max(0, blow.swingK - real / K.back);
    view.swing = calm ? 0 : blow.sign * K.swing * EASE.inOutCubic(blow.swingK);
    view.punch = calm || blow.open === Infinity ? 0 : K.punch * Math.exp(-blow.open * K.punchRate) * Math.min(1, blow.open / 0.03 + 0.2);
    if (blow.open > 3) blow.open = Infinity;
  }
  function render(game) {
    if (!made) return;
    const real = effectSlots.real(), t = performance.now() / 1000;
    drawCamera(real);
    drawGrade(game, real);
    drawCracks(real, t);
    drawStreaks(real);
    drawCuts(real);
    drawStar(real);
  }
  function clear() {
    for (const set of sets) { set.foe = null; set.level = 0; for (const s of set.s) s.visible = false; }
    for (const C of cuts) { C.age = Infinity; C.core.visible = C.glow.visible = false; }
    for (const St of streaks) { St.age = Infinity; St.m.visible = false; }
    if (star) { star.age = Infinity; star.s.visible = false; }
    blow.on = false; blow.p = blow.e = null; blow.open = Infinity; blow.freeze = blow.kick = blow.swingK = 0;
    view.swing = view.punch = 0;
    if (slowed) { Game.drawSlow = 1; slowed = false; }
    const u = typeof visuals !== 'undefined' && visuals.passes && visuals.passes.grade && visuals.passes.grade.uniforms;
    if (graded && u) restoreGrade(u, false);   // the stage's own look is set anew as it loads
    graded = false;
  }
  return {
    attach() { make(); Game.renderHooks.push(render); visuals.hooks.clear.push(clear); },
    clear, hold, view, setLook, settings: () => S(),
    get look() { S(); return lookId; },
    get grading() { return graded; },   // the freeze owns the grade now (js/visuals.js atmosphere.areas waits)
    // tests: what shows now
    get state() {
      return { cracks: sets.filter(q => q.foe).map(q => ({ level: q.level, shown: q.s.filter(s => s.visible).length })),
               cuts: cuts.filter(c => c.core.visible).length, streaks: streaks.filter(s => s.m.visible).length, star: !!(star && star.s.visible),
               freeze: blow.freeze, swing: view.swing, punch: view.punch };
    },
  };
})();
