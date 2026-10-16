'use strict';
// Developer-only model viewer (open the game with #dev, press F9 or run MODELLAB.open('hollowSoldier')).
// Four views of one model: front, back, side and a black silhouette against the sky (the silhouette test).
// Left / right buttons switch model; "walk" runs the walk cycle so attachments can be checked in motion.
const MODELLAB = {};
if (DEV) (() => {
  let lab = null;
  const VIEWS = [{ name: 'front', pos: [0, 1.0, 6.4] }, { name: 'back', pos: [0, 1.0, -6.4] }, { name: 'side (weapon arm)', pos: [-6.4, 1.0, 0] },
                 { name: 'silhouette, 3/4 from behind', pos: [-4.6, 0.9, -4.6], sil: true }];
  function open(id) {
    if (lab) return;
    const ids = Object.keys(MODEL_DEFS);
    const root = document.createElement('div'); root.dataset.cursor = '';   // keeps the pointer over the lab
    root.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0d0c0f;color:#cfc8b8;font:12px/1.3 monospace;';
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    const bar = document.createElement('div'); bar.style.cssText = 'position:absolute;top:8px;left:8px;right:8px;display:flex;gap:8px;align-items:center;z-index:2;';
    const btn = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:12px monospace;padding:4px 10px;background:#2a2620;color:#e0d8c4;border:1px solid #4a4438;cursor:pointer;'; b.onclick = f; bar.appendChild(b); return b; };
    const info = document.createElement('span');
    lab = { root, canvas, ids, index: Math.max(0, ids.indexOf(id)), mode: 0, modes: [], tt: 0, raf: 0, info, t: 0, last: performance.now(), labels: [] };
    btn('< prev', () => switchTo(-1)); btn('next >', () => switchTo(1));
    const w = btn('anim: idle', () => { lab.mode = (lab.mode + 1) % lab.modes.length; lab.tt = 0; w.textContent = 'anim: ' + lab.modes[lab.mode].name; });
    lab.modeBtn = w;
    const vb = btn('variant: none', () => { lab.variant = lab.variant ? null : 'elite'; vb.textContent = 'variant: ' + (lab.variant ?? 'none'); load(); });
    btn('close (F9)', close); bar.appendChild(info);
    root.append(canvas, bar); document.body.appendChild(root);
    lab.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    lab.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    lab.scene = new THREE.Scene();
    lab.sky = new THREE.Color(0x6b5d50); lab.dark = new THREE.Color(0x14120f);
    lab.scene.add(new THREE.HemisphereLight(0xb8b4c0, 0x2a2218, 1.0));
    const key = new THREE.DirectionalLight(0xffd9b0, 2.4); key.position.set(-3, 5, 4); lab.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7a8ab0, 1.2); rim.position.set(3, 3, -4); lab.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), new THREE.MeshStandardMaterial({ color: 0x24201a, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; lab.scene.add(floor); lab.floor = floor;
    lab.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    lab.onResize = () => lab.renderer.setSize(innerWidth, innerHeight, false); window.addEventListener('resize', lab.onResize); lab.onResize();
    VIEWS.forEach(v => { const d = document.createElement('div'); d.textContent = v.name; d.style.cssText = 'position:absolute;bottom:10px;transform:translateX(-50%);color:#8a8472;pointer-events:none;'; root.appendChild(d); lab.labels.push(d); });
    lab.labels.forEach((d, i) => { d.style.left = ((i + 0.5) / 4 * 100) + '%'; });
    load(); loop();
  }
  function load() {
    if (lab.rig) { lab.scene.remove(lab.rig.root); lab.rig.dispose(); }
    const id = lab.ids[lab.index], M = KIT.resolve(id), t0 = performance.now();
    // A real enemy of this model, driven through its own pose code, so what you see is what the game shows.
    const def = ENEMY_DEFS.find(d => d.model === id);
    lab.enemy = def ? new Enemy(def, { x: 0, z: 0, yaw: 0, behavior: 'arena', variant: lab.variant }) : null;
    lab.player = !def && PLAYER_DEF.look.model === id ? new Player(PLAYER_DEF, 0, 0, 0) : null;
    lab.rig = lab.enemy ? lab.enemy.rig : lab.player ? lab.player.rig : new Rig({ scale: 1, bulk: 1, color: 0x888888, weapon: 'sword', model: id, variant: lab.variant });
    lab.modes = [{ name: 'idle', type: 'idle' }, { name: 'walk', type: 'walk' }];
    if (def) {
      for (const a of def.attacks) lab.modes.push({ name: a.name, type: 'attack', a });
      lab.modes.push({ name: 'hurt', type: 'hurt' }, { name: 'stagger', type: 'stagger' }, { name: 'parried', type: 'parried' }, { name: 'death', type: 'dead' });
    }
    if (lab.player) {
      const A = PLAYER_DEF.moveset.attacks;
      lab.modes.push({ name: 'light attack', type: 'pattack', a: A.light }, { name: 'heavy attack', type: 'pattack', a: A.heavy }, { name: 'block', type: 'pstate', s: PS.BLOCK },
        { name: 'parry', type: 'pstate', s: PS.PARRY, len: CONFIG.parry.time + 0.5 }, { name: 'roll', type: 'pstate', s: PS.ROLL, len: CONFIG.player.rollTime + 0.5 },
        { name: 'hurt', type: 'pstate', s: PS.HURT, len: CONFIG.player.hurtTime + 0.6 }, { name: 'stagger', type: 'pstate', s: PS.STAGGER, len: CONFIG.player.staggerTime + 0.6 },
        { name: 'death', type: 'pstate', s: PS.DEAD, len: CONFIG.player.deathFade + 0.8 });
    }
    lab.mode = 0; lab.tt = 0; lab.modeBtn.textContent = 'anim: idle';
    lab.scene.add(lab.rig.root); lab.rig.shadow.visible = false;
    lab.rig.place(0, 0, 0, 0);
    const I = lab.rig.modelInfo;
    lab.info.textContent = `${id}${lab.variant ? ' [' + lab.variant + ']' : ''} (${M.faction}) - ${I.tris} triangles (budget ${MODEL_SETTINGS.triBudget[M.budget]}), ${I.meshes} meshes - built in ${(performance.now() - t0).toFixed(0)} ms - ${TEXLIB.count()} textures cached`;
  }
  const switchTo = d => { lab.index = (lab.index + d + lab.ids.length) % lab.ids.length; load(); };
  // Puts the enemy into the state a mode names and poses it, looping the mode's timeline.
  function simulate(e, m, dt, now) {
    const d = e.def; if (!lab.frozen) lab.tt += dt; e.vx = e.vz = 0; e.recoil = 0; e.attack = null; e.hitIndex = 0;
    let tt = lab.tt;
    switch (m.type) {
      case 'walk': e.state = ES.CHASE; e.vz = d.speed; e.walkPhase += d.speed * dt * 2.6 / d.scale; break;
      case 'attack': {
        const a = m.a; e.attack = a; let t = tt % (a.hits.reduce((s, h) => s + h.startup + h.active, 0) + a.recovery + 0.8);
        e.state = ES.RECOVER; tt = t;
        for (let i = 0; i < a.hits.length; i++) {
          const h = a.hits[i]; e.hitIndex = i;
          if (t < h.startup) { e.state = ES.WINDUP; tt = t; break; }
          t -= h.startup;
          if (t < h.active) { e.state = ES.ACTIVE; tt = t; break; }
          t -= h.active; tt = t;
        }
        break;
      }
      case 'hurt': e.state = ES.HURT; tt = tt % (d.flinchTime + 0.8); break;
      case 'stagger': e.state = ES.STAGGER; tt = tt % (d.staggerTime + 0.6); break;
      case 'parried': e.state = ES.PARRIED; tt = tt % (d.parriedTime + 0.6); break;
      case 'dead': e.state = ES.DEAD; tt = tt % (CONFIG.enemy.deathFade + 0.8); break;
      default: e.state = ES.IDLE;
    }
    e.pose(tt, { t: now, dt, yaw: 0, px: 0, pz: 5 });
  }
  function simulatePlayer(p, m, dt, now) {
    if (!lab.frozen) lab.tt += dt;
    p.vx = p.vz = 0; p.kx = p.kz = 0; p.attack = null; p.stunTime = 1; let tt = lab.tt;
    switch (m.type) {
      case 'pattack': {
        const a = m.a; p.attack = a; p.state = PS.ATTACK;
        tt = tt % (a.hits.reduce((s, h) => s + h.startup + h.active, 0) + a.recovery + 0.6); break;
      }
      case 'pstate':
        p.state = m.s; tt = tt % (m.len ?? 1.5); p.stunTime = m.s === PS.STAGGER ? CONFIG.player.staggerTime : CONFIG.player.hurtTime;
        if (m.s === PS.BLOCK) p.vz = 2;
        if (m.s === PS.ROLL) p.vz = CONFIG.player.rollSpeed;
        break;
      case 'walk': p.state = PS.WALK; p.vz = 3.2; p.walkPhase += 3.2 * dt * 2.6; break;
      default: p.state = PS.IDLE;
    }
    p.pose(tt, { t: now, dt, yaw: 0, px: 0, pz: 5 });
  }
  const sprites = () => { const out = []; lab.scene.traverse(o => { if (o.isSprite) out.push(o); }); return out; };
  const black = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
  function loop() {
    lab.raf = requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(0.1, (now - lab.last) / 1000); lab.last = now; lab.t += dt;
    const r = lab.rig, e = lab.enemy, m = lab.modes[lab.mode];
    if (e) simulate(e, m, dt, now / 1000); else if (lab.player) simulatePlayer(lab.player, m, dt, now / 1000); else r.reset();
    const R = lab.renderer, W = innerWidth, H = innerHeight, w = W / 4;
    R.setScissorTest(true);
    VIEWS.forEach((v, i) => {
      R.setViewport(i * w, 0, w, H); R.setScissor(i * w, 0, w, H);
      lab.camera.aspect = w / H; const k = Math.max(1, lab.rig.root.scale.y); lab.camera.position.set(v.pos[0] * k, (v.pos[1] - 0.2) * k + 0.2, v.pos[2] * k); lab.camera.lookAt(0, (v.sil ? 0.9 : 0.95) * k, 0); lab.camera.updateProjectionMatrix();
      lab.scene.background = v.sil ? lab.sky : lab.dark; lab.scene.overrideMaterial = v.sil ? black : null; lab.floor.visible = !v.sil;
      const hide = v.sil ? sprites() : [];   // glows and auras are not part of the silhouette
      hide.forEach(o => { o.userData.was = o.visible; o.visible = false; });
      R.render(lab.scene, lab.camera);
      hide.forEach(o => { o.visible = o.userData.was; });
    });
    lab.scene.overrideMaterial = null;
  }
  function close() {
    if (!lab) return;
    cancelAnimationFrame(lab.raf); window.removeEventListener('resize', lab.onResize);
    lab.scene.remove(lab.rig.root); lab.rig.dispose(); lab.renderer.dispose(); lab.root.remove(); lab = null;
  }
  // Debug: MODELLAB.pose('Sword Swing', 0.5) freezes that mode at that time (s into its loop); MODELLAB.pose() unfreezes.
  MODELLAB.pose = (name, tt = 0) => { if (!lab) return; lab.frozen = !!name; if (name) { lab.mode = Math.max(0, lab.modes.findIndex(m => m.name === name)); lab.tt = tt; lab.modeBtn.textContent = 'anim: ' + name; } };
  MODELLAB.state = () => lab;
  MODELLAB.open = id => open(id); MODELLAB.close = close; MODELLAB.toggle = () => lab ? close() : open();
  window.addEventListener('keydown', ev => { if (ev.code === 'F9') { ev.preventDefault(); MODELLAB.toggle(); } });
})();
