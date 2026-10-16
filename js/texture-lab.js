'use strict';
// Developer-only texture viewer (open the game with #dev, press F8 or run TEXLIB.lab()).
// Rows are textures, columns are decay 0 / 0.5 / 1 and a tinted, half-ruined sample. Remove this file when the revamp ships.
if (DEV) (() => {
  const COLS = [{ label: 'decay 0 (kept)', decay: 0 }, { label: 'decay 0.5', decay: 0.5 }, { label: 'decay 1 (ruined)', decay: 1 },
                { label: 'tinted, decay 0.6', decay: 0.6, tint: true }];
  const TINTS = [0x9aa87a, 0xb08a70, 0x8a9ab0, 0xa89a6a];
  const PER_PAGE = 5, GAP = 2.3;
  let lab = null;

  function build(page, size) {
    const names = TEXLIB.names.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d0c0f);
    scene.add(new THREE.HemisphereLight(0xaab4c8, 0x2a221a, 0.9));
    const sun = new THREE.DirectionalLight(0xffe0b8, 2.4); sun.position.set(-4, 5, 6); scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6a7a9a, 0.8); fill.position.set(5, -1, 3); scene.add(fill);
    const items = [], t0 = performance.now();
    names.forEach((name, r) => COLS.forEach((c, i) => {
      const flat = TEXLIB.defs[name].alpha;
      const mat = TEXLIB.material(name, { decay: c.decay, tint: c.tint ? TINTS[(page * PER_PAGE + r) % TINTS.length] : 0xffffff, size, repeat: flat ? [1, 1] : [2, 1] });
      const mesh = new THREE.Mesh(flat ? new THREE.PlaneGeometry(1.7, 1.9) : new THREE.SphereGeometry(0.95, 48, 32), mat);
      mesh.position.set((i - (COLS.length - 1) / 2) * GAP, ((PER_PAGE - 1) / 2 - r) * GAP, 0);
      scene.add(mesh); items.push({ mesh, flat, name, col: i, r });
    }));
    return { scene, items, names, ms: performance.now() - t0 };
  }

  function open() {
    if (lab) return;
    const root = document.createElement('div'); root.dataset.cursor = '';   // keeps the pointer over the lab
    root.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0d0c0f;color:#cfc8b8;font:12px/1.3 monospace;';
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    const bar = document.createElement('div'); bar.style.cssText = 'position:absolute;top:8px;left:8px;right:8px;display:flex;gap:8px;align-items:center;z-index:2;';
    const btn = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:12px monospace;padding:4px 10px;background:#2a2620;color:#e0d8c4;border:1px solid #4a4438;cursor:pointer;'; b.onclick = f; bar.appendChild(b); return b; };
    const info = document.createElement('span');
    lab = { root, canvas, page: 0, size: 256, labels: [], raf: 0, info, last: performance.now() };
    btn('< prev', () => go(-1)); btn('next >', () => go(1));
    const sizeBtn = btn('256 px', () => { lab.size = lab.size === 256 ? 512 : 256; sizeBtn.textContent = lab.size + ' px'; rebuild(); });
    btn('close (F8)', close); bar.appendChild(info);
    root.append(canvas, bar); document.body.appendChild(root);
    lab.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    lab.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    lab.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    lab.onResize = () => resize(); window.addEventListener('resize', lab.onResize);
    rebuild(); loop();
  }
  const go = d => { const pages = Math.ceil(TEXLIB.names.length / PER_PAGE); lab.page = (lab.page + d + pages) % pages; rebuild(); };
  function rebuild() {
    for (const l of lab.labels) l.remove(); lab.labels = [];
    lab.built = build(lab.page, lab.size);
    const mk = (text, bold) => { const d = document.createElement('div'); d.textContent = text; d.style.cssText = `position:absolute;white-space:nowrap;transform:translateX(-50%);pointer-events:none;color:${bold ? '#f0e8d0' : '#8a8472'};`; lab.root.appendChild(d); lab.labels.push(d); return d; };
    lab.rowLabels = lab.built.names.map(n => mk(`${n}  (${TEXLIB.defs[n].kind})`, true));
    lab.colLabels = COLS.map(c => mk(c.label, false));
    lab.info.textContent = `page ${lab.page + 1}/${Math.ceil(TEXLIB.names.length / PER_PAGE)} - built in ${lab.built.ms.toFixed(0)} ms - ${TEXLIB.count()} textures cached, ${TEXLIB.stats.ms.toFixed(0)} ms total`;
    resize();
  }
  function resize() {
    const w = innerWidth, h = innerHeight, cam = lab.camera;
    lab.renderer.setSize(w, h, false); cam.aspect = w / h;
    const halfH = (PER_PAGE * GAP) / 2 + 0.6, halfW = (COLS.length * GAP) / 2 + 0.3, t = Math.tan(cam.fov * Math.PI / 360);
    cam.position.set(0, -0.15, Math.max(halfH / t, halfW / t / cam.aspect) * 1.02); cam.lookAt(0, -0.15, 0); cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const v = new THREE.Vector3(), place = (el, x, y) => { v.set(x, y, 0).project(cam); el.style.left = ((v.x + 1) / 2 * w) + 'px'; el.style.top = ((1 - v.y) / 2 * h) + 'px'; };
    lab.rowLabels.forEach((el, r) => { place(el, -(COLS.length / 2) * GAP - 0.1, ((PER_PAGE - 1) / 2 - r) * GAP); el.style.transform = 'translate(-100%, -50%)'; });
    lab.colLabels.forEach((el, i) => { place(el, (i - (COLS.length - 1) / 2) * GAP, ((PER_PAGE - 1) / 2) * GAP + 1.55); el.style.top = '40px'; });
  }
  function loop() {
    lab.raf = requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(0.1, (now - lab.last) / 1000); lab.last = now;
    for (const it of lab.built.items) it.mesh.rotation.y = it.flat ? Math.sin(now / 1500) * 0.5 : it.mesh.rotation.y + dt * 0.45;
    lab.renderer.render(lab.built.scene, lab.camera);
  }
  function close() {
    if (!lab) return;
    cancelAnimationFrame(lab.raf); window.removeEventListener('resize', lab.onResize);
    lab.renderer.dispose(); lab.root.remove(); lab = null;
  }
  TEXLIB.lab = () => lab ? close() : open();
  window.addEventListener('keydown', ev => { if (ev.code === 'F8') { ev.preventDefault(); TEXLIB.lab(); } });
})();
