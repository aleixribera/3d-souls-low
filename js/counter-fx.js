'use strict';
// ============================================================================
// The counter, impossible to miss (pass 95, PLAN.md "Next, small" 2; ANIM_SETTINGS.counterFx)
// ============================================================================
// Aleix never noticed the counter window, even when he opened it. So when one opens (a perfect dodge, or a deflect
// that leaves the foe open: the `counterOpen` event), besides its bright ring of sound (js/audio.js), the beat of slow
// motion (js/dodge-moment.js) and the blade's flare and trail (js/player-pose.js, js/ultra-fx.js):
// - the screen's edges dim for as long as the window lasts (online too, where the world never slows);
// - the foe flashes an open mark at its chest;
// - the blade throws a burst of light as it flares.
// And the counter itself, a signature move: where an attack with `cut` lands as a riposte, a thin bright line is drawn
// across the foe, and `cut.open` s later it opens: it widens, flares and sheds sparks (the flash step's cut opening
// behind the body, the rising cut's wide arc). Drawing only: it listens to events and reads bodies on a render hook,
// with pooled sprites made at load, so nothing is allocated per frame and the fight never changes. A cut and a mark age
// in real time, so the cut opens on its beat whatever the hit-pause. Reduced motion: fewer sparks.
const counterFx = (() => {
  const S = () => ANIM_SETTINGS.counterFx;
  // A soft-edged horizontal streak (a cut line), a crescent (a cut arc) and a four-point star (the open mark), drawn once.
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  let LINE = null, ARC = null, STAR = null;
  function textures() {
    if (LINE) return;
    LINE = canvasTex(256, 32, (g, w, h) => {
      const along = g.createLinearGradient(0, 0, w, 0);
      along.addColorStop(0, 'rgba(255,255,255,0)'); along.addColorStop(0.18, 'rgba(255,255,255,0.9)'); along.addColorStop(0.5, 'rgba(255,255,255,1)');
      along.addColorStop(0.82, 'rgba(255,255,255,0.9)'); along.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = along; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      const across = g.createLinearGradient(0, 0, 0, h);
      across.addColorStop(0, 'rgba(0,0,0,0)'); across.addColorStop(0.42, 'rgba(0,0,0,0.85)'); across.addColorStop(0.5, 'rgba(0,0,0,1)');
      across.addColorStop(0.58, 'rgba(0,0,0,0.85)'); across.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = across; g.fillRect(0, 0, w, h);
    });
    ARC = canvasTex(256, 256, (g, w, h) => {   // a crescent: thick in the middle, tapering to points
      g.translate(w / 2, h * 0.78);
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.ellipse(0, 0, w * 0.46, h * 0.62, 0, Math.PI * 1.08, Math.PI * 1.92);
        g.ellipse(0, h * 0.06, w * 0.42, h * (0.5 + i * 0.02), 0, Math.PI * 1.92, Math.PI * 1.08, true); g.closePath();
        g.fillStyle = `rgba(255,255,255,${[0.25, 0.5, 1][i]})`; g.filter = `blur(${[6, 3, 0][i]}px)`; g.fill();
      }
    });
    STAR = canvasTex(128, 128, (g, w) => {
      const m = w / 2, glow = g.createRadialGradient(m, m, 0, m, m, m);
      glow.addColorStop(0, 'rgba(255,255,255,1)'); glow.addColorStop(0.12, 'rgba(255,255,255,0.7)'); glow.addColorStop(0.35, 'rgba(255,255,255,0.1)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = glow; g.fillRect(0, 0, w, w);
      g.globalCompositeOperation = 'lighter';
      for (const [a, len, th] of [[0, m, 3.5], [Math.PI / 2, m, 3.5], [Math.PI / 4, m * 0.45, 2], [-Math.PI / 4, m * 0.45, 2]]) {
        g.save(); g.translate(m, m); g.rotate(a);
        const s = g.createLinearGradient(-len, 0, len, 0);
        s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(0.5, 'rgba(255,255,255,1)'); s.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = s; g.beginPath(); g.ellipse(0, 0, len, th, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    });
  }
  const sprite = (map, order) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, fog: false }));
    s.visible = false; s.renderOrder = order; scene.add(s); pooledFx.push(s); return s;
  };
  const cuts = [], marks = [];
  let last = null;   // the cut drawn last: { age, rot, ... }
  let made = false, aura = null, ring = null, auraK = 0;
  const auraColor = new THREE.Color();
  function make() {
    if (made) return;
    made = true; textures();
    for (let i = 0; i < 4; i++) cuts.push({ s: sprite(LINE, 13), age: Infinity, open: 0, kind: 'line', x: 0, y: 0, z: 0, rot: 0, sparked: false });
    for (let i = 0; i < 2; i++) marks.push({ s: sprite(STAR, 13), age: Infinity, foe: null });
    // Pass 97: the window's sign on the body, for all of it: a cold halo round the figure (the body hides its middle, so
    // it reads as light around the silhouette) and a ring on the floor that closes in as the window runs out.
    aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    aura.visible = false; aura.renderOrder = 12; scene.add(aura); pooledFx.push(aura);
    ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 12; scene.add(ring); pooledFx.push(ring);
  }
  // The halo and ring follow the body while a window is open (k: 1 as it opens, 0 as it shuts); a slow breath under
  // 3 Hz, steady with reduced motion. The body itself takes a faint cold light too (over the pose's own tint).
  function drawAura(p, open, left, real, t) {
    const A = S().aura;
    auraK = open ? Math.min(1, auraK + real / A.in) : Math.max(0, auraK - real / A.out);
    const show = auraK > 0.002 && p && p.rig;
    aura.visible = ring.visible = !!show;
    if (!show) return;
    const r = p.rig, q = r.root.position, breath = reducedMotion() ? 1 : 1 + A.breath * Math.sin(t * Math.PI * 2 * A.pulse);
    const k = auraK * (A.min + (1 - A.min) * left) * breath, h = p.height || 1.8;
    aura.position.set(q.x, q.y + h * 0.5, q.z); aura.scale.set(A.size * 0.7, A.size, 1);
    aura.material.color.setHex(A.color).multiplyScalar(A.boost * k);
    ring.position.set(q.x, (r.shadow ? r.shadow.position.y : q.y) + 0.04, q.z);
    const R = lerp(A.ring.to, A.ring.from, left);   // the band is a fixed share of the radius: it thins as it closes
    ring.scale.set(R, R, 1); ring.material.color.setHex(A.ring.color).multiplyScalar(auraK * (0.85 + 0.15 * left));
    if (r.bodyMats) { auraColor.setHex(A.color).multiplyScalar(A.body * k); for (const m of r.bodyMats) m.emissive.add(auraColor); }
  }
  // ---- the window opens ----
  const v = new THREE.Vector3(), up = new THREE.Vector3(), spot = { x: 0, y: 0, z: 0 };
  let dimEl = null, dim = 0, shownDim = '', full = 0;
  events.on('counterOpen', d => {
    if (d.player !== Game.player) return;
    make();
    full = d.time;
    const M = marks.find(m => m.age === Infinity) || marks[0];
    if (d.foe && d.foe.alive && d.foe.alive()) { M.foe = d.foe; M.age = 0; M.s.material.color.setHex(S().mark.color); M.s.visible = true; }
    const r = d.player.rig;
    if (r && r.weapon && typeof ultraFx !== 'undefined' && ultraFx.on()) {
      r.weapon.updateWorldMatrix(true, false); v.set(0, 0, 0.8).applyMatrix4(r.weapon.matrixWorld);
      ultraFx.flashAt(v, ANIM_SETTINGS.counterGlow.color, 4, 5);
      ultraFx.flare(v, ANIM_SETTINGS.counterGlow.color, 1.6, 0.35);
    }
  });
  // ---- the counter lands: its cut ----
  events.on('strike', d => {
    const p = d.attacker, a = p && p.attack;
    if (d.blocked || !(p instanceof Player) || !a || !a.cut || a.id !== d.strike.attackId || !d.strike.riposte || !d.target) return;
    make();
    const C = cuts.find(c => c.age === Infinity) || cuts.reduce((x, y) => (y.age > x.age ? y : x));
    const t = d.target, at = d.at || { x: t.x, y: t.y + t.height * 0.6, z: t.z };
    C.x = at.x; C.y = at.y; C.z = at.z; C.age = 0; C.open = a.cut.open; C.kind = a.cut.kind; C.sparked = false;
    C.rot = a.cut.kind === 'arc' ? 0.5 : -S().cut.tilt * (Math.random() < 0.5 ? 1 : -0.6);
    C.s.material.map = a.cut.kind === 'arc' ? ARC : LINE; C.s.material.needsUpdate = true;
    C.s.material.color.setHex(S().cut.color); C.s.material.rotation = C.rot; C.s.visible = true;
    C.big = Math.max(1, (t.radius || 0.5) / 0.6) ** 0.5;
    last = C;   // Cold Riposte's crust lies along it (js/ability-touch.js)
    if (typeof ultraFx !== 'undefined' && ultraFx.on()) {
      ultraFx.sparkBurst(at, reducedMotion() ? 14 : 34, 'storm');
      ultraFx.flashAt(at, S().cut.color, 5, 6);
    } else spawnBurst(at, { color: S().cut.color, count: reducedMotion() ? 10 : 24, speed: 7 });
  });
  // Opening: sparks along the line, and a second light.
  function burst(C) {
    const K = S().cut, n = C.kind === 'arc' ? K.arcSparks : K.sparks, len = K.length * C.big * (C.kind === 'arc' ? 0.8 : 1);
    v.set(1, 0, 0).applyQuaternion(camera.quaternion);   // the line runs across the screen at its tilt
    up.set(0, 1, 0).applyQuaternion(camera.quaternion); const c = Math.cos(C.rot), s = Math.sin(C.rot);
    const dx = v.x * c + up.x * s, dy = v.y * c + up.y * s, dz = v.z * c + up.z * s;
    const fx = typeof ultraFx !== 'undefined' && ultraFx.on();
    for (let i = 0; i < 5; i++) {
      const k = (i / 4 - 0.5) * len * 0.8; spot.x = C.x + dx * k; spot.y = C.y + dy * k; spot.z = C.z + dz * k;
      if (fx) ultraFx.sparkBurst(spot, Math.round(n / 5 * (reducedMotion() ? 0.4 : 1)), 'parry');
      else spawnBurst(spot, { color: K.color, count: reducedMotion() ? 2 : 5, speed: 6 });
    }
    spot.x = C.x; spot.y = C.y; spot.z = C.z;
    if (fx) ultraFx.flashAt(spot, K.color, 6, 7);
  }
  function render(game) {
    const real = effectSlots.real(), K = S();
    // the edges of the screen dim while the window is open
    const p = game.player;
    if (!dimEl) dimEl = document.getElementById('counterDim');
    const want = p && p.alive() && p.riposte > 0 && game.mode === 'play' ? K.dim.peak * (0.45 + 0.55 * clamp(p.riposte / (full || 1), 0, 1)) : 0;
    dim = want > dim ? Math.min(want, dim + real / K.dim.in * K.dim.peak) : Math.max(want, dim - real / K.dim.out * K.dim.peak);
    if (dimEl && (dim > 0 || shownDim !== '0')) { const o = dim > 0 ? dim.toFixed(3) : '0'; if (shownDim !== o) dimEl.style.opacity = shownDim = o; }
    if (!made) return;
    const open = !!p && p.alive() && p.riposte > 0 && game.mode === 'play';
    drawAura(p, open, open ? clamp(p.riposte / (full || p.riposte), 0, 1) : 0, real, performance.now() / 1000);
    for (const M of marks) {
      if (M.age === Infinity) continue;
      M.age += real;
      const k = M.age / K.mark.time;
      if (k >= 1 || !M.foe || !M.foe.rig) { M.age = Infinity; M.s.visible = false; M.foe = null; continue; }
      const pop = Math.min(1, M.age / 0.06), size = K.mark.size * Math.sqrt(Math.max(1, (M.foe.radius || 0.5) / 0.6)) * (0.4 + 0.6 * pop) * (1 + 0.25 * k);
      const q = M.foe.rig.root.position;
      M.s.position.set(q.x, q.y + M.foe.height * 0.62, q.z); M.s.scale.set(size, size, 1);
      M.s.material.rotation = k * 0.6; M.s.material.opacity = (1 - k) * (1 - k);
    }
    for (const C of cuts) {
      if (C.age === Infinity) continue;
      C.age += real;
      const len = K.cut.length * C.big, after = C.age - C.open;
      if (after > K.cut.show) { C.age = Infinity; C.s.visible = false; continue; }
      if (after >= 0 && !C.sparked) { C.sparked = true; burst(C); }
      let w, bright, l;
      if (after < 0) { l = len * Math.min(1, C.age / 0.05); w = K.cut.thin; bright = 1; }   // drawn, then held thin
      else {
        const o = Math.min(1, after / 0.06), f = after / K.cut.show;
        l = len * (1 + 0.15 * o); w = lerp(K.cut.thin, K.cut.wide, o) * (1 - 0.6 * f); bright = (1 + 0.6 * o) * (1 - f) * (1 - f);
      }
      if (C.kind === 'arc') { C.s.scale.set(l * 1.1, l * 0.55 * (after < 0 ? 0.9 : 1 + 0.25 * Math.min(1, after / 0.06)), 1); C.s.material.opacity = Math.min(1, bright * (after < 0 ? 0.7 : 1)); }
      else { C.s.scale.set(l, w * 8, 1); C.s.material.opacity = Math.min(1, bright); }
      C.s.material.color.setHex(K.cut.color).multiplyScalar(Math.max(1, bright));
      C.s.position.set(C.x, C.y, C.z);
    }
  }
  function clear() {
    for (const C of cuts) { C.age = Infinity; C.s.visible = false; }
    for (const M of marks) { M.age = Infinity; M.s.visible = false; M.foe = null; }
    auraK = 0; if (aura) aura.visible = ring.visible = false;
    dim = 0; if (dimEl) dimEl.style.opacity = shownDim = '0';
  }
  return {
    attach() { make(); Game.renderHooks.push(render); visuals.hooks.stage.push(clear); },
    clear,
    get lastCut() { return last; },
    // tests: what shows now
    get state() { return { dim, cuts: cuts.filter(c => c.age !== Infinity).map(c => ({ kind: c.kind, age: c.age, open: c.age >= c.open, w: c.s.scale.y })),
                           marks: marks.filter(m => m.age !== Infinity).length, aura: aura && aura.visible ? auraK : 0,
                           ring: ring && ring.visible ? ring.scale.x : 0 }; },
  };
})();
