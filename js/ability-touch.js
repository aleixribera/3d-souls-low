'use strict';
// ============================================================================
// The plain commons' small touches (design/abilities, BUILD-ORDER batch 1): drawing only
// ============================================================================
// The eight plain commons are bare numbers; each gets one small thing to see, on its holder only (the local player),
// so a friend can tell what the number is doing. Every touch is a pooled sprite made at load, aged in real time (it
// runs through hit-pause), and listens to events or reads bodies; nothing changes the fight. Tuning:
// VIS.abilityFx.touch. Sounds: js/audio.js (abilityClank, abilityChime, abilityGulp, abilityFrost, abilityInk).
//   Keen Edge      a white glint runs hilt to tip along the blade as each swing goes active, brighter by level.
//   Iron Blood     the health bar's iron frame (js/hud.js); bone sparks off the forearm when it is picked.
//   Light Step     an ink feather flicks off the heel each time a dash charge comes back (`dashReady`).
//   Quick Draught  an amber glint on the flask as the drink starts.
//   Breaker        the counter glow turns bone white for the time it added (js/player-pose.js).
//   Keen Eye       a thin ring at the feet as a blow enters the deflect window (one every `ring.gap` s at most).
//   Cold Riposte   a frost crust along the counter's cut, shedding flakes.
//   Headsman       a black brush stroke behind the foe as the Finishing Blow's cuts open.
const abilityTouch = (() => {
  const T = () => VIS.abilityFx.touch;
  const mods = p => (p && p.kit && p.kit.mods) || null;
  const mine = p => !!p && p === Game.player;
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rnd = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();   // the same drawings every load
  let STAR = null, FEATHER = null, CRUST = null, STROKE = null;
  function textures() {
    STAR = canvasTex(64, 64, (g, w) => {   // a hard four-point glint
      const m = w / 2; g.fillStyle = '#fff';
      for (const [a, len, th] of [[0, m, 3], [Math.PI / 2, m, 3], [Math.PI / 4, m * 0.4, 1.6], [-Math.PI / 4, m * 0.4, 1.6]]) {
        g.save(); g.translate(m, m); g.rotate(a); g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, -th); g.lineTo(len, 0); g.lineTo(0, th); g.closePath(); g.fill(); g.restore();
      }
      g.beginPath(); g.arc(m, m, 4, 0, Math.PI * 2); g.fill();
    });
    FEATHER = canvasTex(128, 64, (g, w, h) => {   // a curved blade of ink: dark outline, bone body, white spine
      const blade = () => { g.beginPath(); g.moveTo(6, h * 0.62); g.quadraticCurveTo(w * 0.45, h * 0.02, w - 6, h * 0.3); g.quadraticCurveTo(w * 0.5, h * 0.46, 6, h * 0.62); g.closePath(); };
      g.lineJoin = 'round'; blade(); g.fillStyle = '#cfc8b6'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#16130f'; g.stroke();
      g.beginPath(); g.moveTo(14, h * 0.58); g.quadraticCurveTo(w * 0.5, h * 0.2, w - 14, h * 0.31); g.lineWidth = 2.5; g.strokeStyle = '#f4f1e8'; g.stroke();
    });
    CRUST = canvasTex(256, 48, (g, w, h) => {   // a saw-toothed strip of flat crystals, an ink edge round it
      const m = h / 2, pts = [];
      for (let x = 8; x <= w - 8; x += 9) { const end = Math.min(x, w - x) / 40, k = Math.min(1, end); pts.push([x, m - (6 + rnd() * 14) * k]); }
      const low = pts.map(([x]) => [x, m + (4 + rnd() * 10) * Math.min(1, Math.min(x, w - x) / 40)]).reverse();
      g.beginPath(); g.moveTo(4, m); for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(w - 4, m); for (const [x, y] of low) g.lineTo(x, y); g.closePath();
      g.lineJoin = 'miter'; g.lineWidth = 5; g.strokeStyle = '#16130f'; g.stroke(); g.fillStyle = '#e8ecea'; g.fill();
      g.lineWidth = 1.5; g.strokeStyle = '#cfc8b6'; g.stroke();
    });
    STROKE = canvasTex(512, 64, (g, w, h) => {   // one dry brush stroke: split bristle ends, a bone rim on its leading edge
      for (let i = 0; i < 26; i++) {
        const y = h * (0.16 + 0.68 * i / 25), start = 6 + rnd() * 40, end = w - 6 - rnd() * 70, th = 2 + rnd() * 3.5;
        g.strokeStyle = rnd() < 0.18 ? '#4a4740' : '#16130f'; g.lineWidth = th; g.lineCap = 'round';
        g.beginPath(); g.moveTo(start, y + (rnd() - 0.5) * 3); g.quadraticCurveTo(w * 0.5, y + (rnd() - 0.5) * 6, end, y + (rnd() - 0.5) * 4); g.stroke();
      }
      g.strokeStyle = '#cfc8b6'; g.lineWidth = 2; g.beginPath(); g.moveTo(30, h * 0.13); g.lineTo(w - 50, h * 0.13); g.stroke();
    });
  }
  // `over`: drawn over the bodies (a glint on the blade, the crust on a cut inside the foe); else hidden behind them.
  const sprite = (map, additive, over, order = 13) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: !over, fog: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    s.visible = false; s.renderOrder = order; scene.add(s); pooledFx.push(s); return s;
  };
  const glints = [], feathers = [], flares = [], crusts = [], strokes = [];
  let made = false;
  function make() {
    if (made) return;
    made = true; textures();
    for (let i = 0; i < 2; i++) glints.push({ s: sprite(STAR, true, true), age: Infinity, body: null, k: 0 });
    for (let i = 0; i < 3; i++) feathers.push({ s: sprite(FEATHER, false, false), age: Infinity, x: 0, y: 0, z: 0, bx: 0, bz: 0, spin: 1 });
    for (let i = 0; i < 2; i++) flares.push({ s: sprite(STAR, true, true), age: Infinity, body: null });
    for (let i = 0; i < 2; i++) crusts.push({ s: sprite(CRUST, false, true, 14), age: Infinity, len: 1, flaked: false, x: 0, y: 0, z: 0 });
    strokes.push({ s: sprite(STROKE, false, false, 11), age: Infinity, len: 4 });
    for (const S of strokes) S.s.center.set(0, 0.5);   // it wipes on from its tail
  }
  const oldest = list => list.find(q => q.age === Infinity) || list.reduce((a, b) => (b.age > a.age ? b : a));
  const v = new THREE.Vector3(), hand = new THREE.Vector3(), side = new THREE.Vector3();
  const spot = { x: 0, y: 0, z: 0 };
  // Sparks where combat effects are on (High and up); the Low burst otherwise.
  function sparks(at, n, kind, color) {
    if (typeof ultraFx !== 'undefined' && ultraFx.on()) ultraFx.sparkBurst(at, n, kind, null, 0, 0.6);
    else spawnBurst(at, { color, count: Math.max(2, Math.round(n / 2)), speed: 4 });
  }
  const many = n => Math.round(n * (reducedMotion() ? 0.5 : 1));

  // ---- Keen Edge: the glint along the blade, as each swing goes active ----
  events.on('attackPhase', d => {
    const p = d.actor, m = mods(p);
    if (!mine(p) || !m || !(m.damage > 0) || d.phase !== PHASE.ACTIVE || !p.rig || !p.rig.blade) return;
    make();
    const G = oldest(glints), L = T().edge;
    G.age = 0; G.body = p; G.k = L.bright[Math.min(L.bright.length - 1, Math.max(0, Math.round(m.damage / L.step) - 1))];
  });
  // ---- Iron Blood: bone sparks off the forearm, the moment it is picked ----
  events.on('abilityPicked', d => {
    const p = Game.player;
    if (d.id !== 'iron-blood' || !p || !p.rig) return;
    p.rig.armL.updateWorldMatrix(true, false); hand.set(0, -0.35, 0).applyMatrix4(p.rig.armL.matrixWorld);
    sparks(hand, many(T().iron.sparks), 'bone', T().iron.color);
  });
  // ---- Light Step: a feather off the heel for each charge back ----
  events.on('dashReady', d => {
    const p = d.body, m = mods(p);
    if (!mine(p) || !m || !(m.dashRefill > 0)) return;
    make();
    const F = oldest(feathers), fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    F.age = 0; F.bx = -fx; F.bz = -fz; F.x = p.x - fx * 0.2; F.y = p.y + 0.18; F.z = p.z - fz * 0.2; F.spin = Math.random() < 0.5 ? 1 : -1;
    F.s.material.rotation = 0; F.s.material.opacity = 1; F.s.visible = true;
  });
  // ---- Quick Draught: the flask's glint as the drink starts ----
  events.on('itemUsed', d => {
    const p = d.player, m = mods(p);
    if (d.item !== 'flask' || !mine(p) || !m || !(m.flaskSpeed > 0) || !p.rig) return;
    make();
    const Q = oldest(flares); Q.age = 0; Q.body = p;
    Q.s.material.color.setHex(T().flask.color).multiplyScalar(2); Q.s.visible = true;
  });
  // ---- Cold Riposte: the crust on the counter's cut ----
  events.on('strike', d => {
    const p = d.attacker, m = mods(p);
    if (d.blocked || !mine(p) || !m || !(m.riposte > 0) || !d.strike || !d.strike.riposte || !d.target) return;
    make();
    const C = oldest(crusts), t = d.target, at = d.at || { x: t.x, y: t.y + t.height * 0.6, z: t.z };
    const cut = counterFx.lastCut, own = cut && cut.age === 0;   // counter-fx draws its cut first, on the same event
    C.age = 0; C.flaked = false; C.x = at.x; C.y = at.y; C.z = at.z;
    C.len = T().frost.length * Math.max(1, (t.radius || 0.5) / 0.6) ** 0.5 * (own ? 1 : 0.6);
    C.s.material.rotation = own ? cut.rot : (Math.random() - 0.5) * 1.2;
    C.s.material.opacity = 1; C.s.visible = true;
  });
  // ---- Headsman: the brush stroke behind the foe ----
  events.on('finisher', d => {
    const p = d.player, m = mods(p);
    if (!mine(p) || !m || !(m.finisher > 0) || !d.enemy) return;
    make();
    const S = strokes[0], H = T().ink, e = d.enemy;
    v.set(0, 0, -1).applyQuaternion(camera.quaternion); v.y = 0; v.normalize();   // away from the camera, behind the foe
    const back = (e.radius || 0.6) + 0.4; side.set(1, 0, 0).applyQuaternion(camera.quaternion);
    S.s.position.set(d.at.x + v.x * back - side.x * H.length * 0.5, d.at.y, d.at.z + v.z * back - side.z * H.length * 0.5);
    S.age = 0; S.len = H.length * Math.max(1, (e.radius || 0.6) / 0.8) ** 0.5;
    S.s.material.rotation = H.tilt; S.s.material.opacity = 1; S.s.visible = true;
  });

  // ---- Keen Eye: a ring as a blow enters the deflect window ----
  let ringWait = 0, ringKey = -1, ringFoe = null;
  function keenEye(game, real) {
    ringWait -= real;
    const p = game.player, m = mods(p);
    if (!p || !m || !(m.parryWindow > 0) || !p.alive() || game.mode !== 'play') return;
    let foe = null, key = -1;
    for (const e of game.enemies) {
      if (!e.alive() || !e.attack) continue;
      let t = null;
      try { t = parryTiming(p, e, 0); } catch (_) { t = null; }
      if (t !== null) { foe = e; key = blowKey(e); break; }
    }
    if (!foe || (foe === ringFoe && key === ringKey)) return;
    ringFoe = foe; ringKey = key;
    if (ringWait > 0) return;
    const R = T().ring; ringWait = R.gap;
    groundFx.ring(p.x, p.z, R.radius, R.color, R.peak, p.y);
  }

  function render(game) {
    const real = effectSlots.real(), K = T(), calm = reducedMotion();
    keenEye(game, real);
    if (!made) return;
    for (const G of glints) {   // hilt to tip in `run` s, then gone in `fade`
      if (G.age === Infinity) continue;
      G.age += real;
      const E = K.edge, r = G.body && G.body.rig, b = r && r.blade;
      if (G.age > E.run + E.fade || !b || G.body !== game.player) { G.age = Infinity; G.s.visible = false; continue; }
      const k = Math.min(1, G.age / E.run), out = Math.max(0, (G.age - E.run) / E.fade);
      r.weapon.updateWorldMatrix(true, false);
      v.set(b.x, b.y, lerp(b.z0 + (b.z1 - b.z0) * 0.12, b.z1, k)).applyMatrix4(r.weapon.matrixWorld);
      G.s.position.copy(v); G.s.scale.setScalar(E.size * (1 - 0.4 * out));
      G.s.material.color.setHex(E.color).multiplyScalar(1 + 2 * G.k); G.s.material.opacity = G.k * (1 - out); G.s.visible = true;
    }
    for (const F of feathers) {
      if (F.age === Infinity) continue;
      F.age += real;
      const L = K.feather;
      if (F.age > L.life) { F.age = Infinity; F.s.visible = false; continue; }
      const k = Math.min(1, F.age / L.flick), out = clamp01((F.age - L.fadeAt) / (L.life - L.fadeAt));
      const go = calm ? 0 : L.lift * k;
      F.s.position.set(F.x + F.bx * go, F.y + go * 0.8, F.z + F.bz * go);
      const sc = L.size * (calm ? 1 : 1 - 0.4 * k); F.s.scale.set(sc, sc * 0.5, 1);
      F.s.material.rotation = calm ? 0 : F.spin * Math.PI * k; F.s.material.opacity = 1 - out;
    }
    for (const Q of flares) {
      if (Q.age === Infinity) continue;
      Q.age += real;
      const L = K.flask, r = Q.body && Q.body.rig;
      if (Q.age > L.hold + L.fade || !r) { Q.age = Infinity; Q.s.visible = false; continue; }
      r.armL.updateWorldMatrix(true, false); hand.set(0, -0.62, 0.05).applyMatrix4(r.armL.matrixWorld);
      const out = Math.max(0, (Q.age - L.hold) / L.fade);
      Q.s.position.copy(hand); Q.s.scale.setScalar(L.size * (1 - 0.5 * out)); Q.s.material.opacity = 1 - out;
    }
    for (const C of crusts) {
      if (C.age === Infinity) continue;
      C.age += real;
      const L = K.frost;
      if (C.age > L.life) { C.age = Infinity; C.s.visible = false; continue; }
      if (!C.flaked && C.age >= L.flakeAt) { C.flaked = true; spot.x = C.x; spot.y = C.y; spot.z = C.z; sparks(spot, many(L.flakes), 'frost', L.color); }
      const grow = clamp01((C.age - 0.02) / L.grow), out = clamp01((C.age - L.fadeAt) / (L.life - L.fadeAt));
      C.s.position.set(C.x, C.y, C.z); C.s.scale.set(C.len * (0.15 + 0.85 * grow), C.len * 0.19, 1); C.s.material.opacity = 1 - out;
    }
    for (const S of strokes) {
      if (S.age === Infinity) continue;
      S.age += real;
      const L = K.ink;
      if (S.age > L.life) { S.age = Infinity; S.s.visible = false; continue; }
      const wipe = calm ? 1 : clamp01(S.age / L.sweep), out = clamp01((S.age - L.fadeAt) / (L.life - L.fadeAt));
      S.s.scale.set(S.len * wipe, L.width, 1); S.s.material.opacity = 1 - out;
    }
  }
  function clear() {
    for (const list of [glints, feathers, flares, crusts, strokes]) for (const q of list) { q.age = Infinity; q.s.visible = false; }
    ringFoe = null; ringKey = -1; ringWait = 0;
  }
  return {
    attach() { make(); Game.renderHooks.push(render); visuals.hooks.clear.push(clear); },
    clear,
    // tests: what shows now
    get state() {
      const on = list => list.filter(q => q.age !== Infinity).length;
      return { glints: on(glints), feathers: on(feathers), flares: on(flares), crusts: on(crusts), strokes: on(strokes), ringKey };
    },
  };
})();
