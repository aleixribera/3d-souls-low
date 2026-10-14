'use strict';
// ============================================================================
// 9. Particles, dust, markers and debug volumes (tints live on Rig)
// ============================================================================
const particles = [];
const particleGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
for (let i = 0; i < CONFIG.fx.particleCount; i++) {
  const mesh = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ transparent: true, fog: false }));
  mesh.visible = false; scene.add(mesh);
  particles.push({ mesh, life: 0, vx: 0, vy: 0, vz: 0 });
}
let particleCursor = 0;
// burst: { color, count, speed } from CONFIG.fx.bursts
function spawnBurst(pos, burst) {
  for (let i = 0; i < burst.count; i++) {
    const p = particles[particleCursor++ % particles.length];
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u), s = burst.speed * rand(0.35, 1);
    p.vx = Math.cos(a) * r * s; p.vy = u * s + 1.5; p.vz = Math.sin(a) * r * s;
    p.life = CONFIG.fx.particleLife * rand(0.6, 1);
    p.mesh.position.set(pos.x, pos.y, pos.z); p.mesh.material.color.set(burst.color); p.mesh.visible = true;
  }
}
function updateParticles(dt) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.mesh.visible = false; continue; }
    p.vy -= CONFIG.fx.particleGravity * dt;
    p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
    p.mesh.rotation.x += dt * 9; p.mesh.rotation.y += dt * 7;
    p.mesh.material.opacity = clamp(p.life / CONFIG.fx.particleLife * 1.6, 0, 1);
  }
}
function updateDust(t) {
  for (const d of dust) {
    const pos = d.points.geometry.attributes.position.array;
    d.seeds.forEach((s, i) => {
      const k = t * s.v + s.s;
      pos[i * 3] = d.origin.x + s.x + Math.sin(k * 0.7) * 0.5;
      pos[i * 3 + 1] = d.origin.y + s.y + Math.sin(k * 0.45) * 0.4;
      pos[i * 3 + 2] = d.origin.z + s.z + Math.cos(k * 0.6) * 0.5;
    });
    d.points.geometry.attributes.position.needsUpdate = true;
  }
}

// Ground pound: shockwave ring, crack decal and dust, all from fixed pools (oldest reused first).
// Flat unlit meshes, no lights or shadows; purely visual.
function makeCrackTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.strokeStyle = '#fff'; g.lineCap = 'round';
  const branch = (x, y, ang, len, w) => {
    if (len < 8 || w < 0.6) return;
    let px = x, py = y;
    g.lineWidth = w; g.beginPath(); g.moveTo(px, py);
    for (let i = 0; i < 4; i++) { ang += rand(-0.45, 0.45); px += Math.cos(ang) * len / 4; py += Math.sin(ang) * len / 4; g.lineTo(px, py); }
    g.stroke();
    branch(px, py, ang + rand(-0.6, 0.6), len * 0.6, w * 0.65);
    if (Math.random() < 0.5) branch(px, py, ang + rand(0.5, 1.1) * (Math.random() < 0.5 ? -1 : 1), len * 0.45, w * 0.55);
  };
  for (let i = 0; i < 7; i++) branch(128, 128, i / 7 * Math.PI * 2 + rand(-0.3, 0.3), rand(55, 85), 4);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 9, 0, Math.PI * 2); g.fill();
  return new THREE.CanvasTexture(c);
}
const groundFx = (() => {
  const G = CONFIG.groundPound;
  const flat = (geo, mat, y) => {
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.visible = false; m.renderOrder = 1;
    scene.add(m); return m;
  };
  const ringGeo = new THREE.RingGeometry(0.9, 1, 48), crackGeo = new THREE.PlaneGeometry(2, 2), crackTex = makeCrackTexture();
  const dustGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const rings = Array.from({ length: G.maxRings }, () => ({ age: Infinity, size: 1,
    mesh: flat(ringGeo, new THREE.MeshBasicMaterial({ color: 0xe8dcc0, transparent: true, depthWrite: false, side: THREE.DoubleSide }), 0.04) }));
  const cracks = Array.from({ length: G.maxCracks }, () => ({ age: Infinity,
    mesh: flat(crackGeo, new THREE.MeshBasicMaterial({ color: 0x050403, alphaMap: crackTex, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2 }), 0.02) }));
  const dusts = Array.from({ length: G.maxDust }, () => {
    const mesh = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: 0x8c8270, transparent: true, depthWrite: false }));
    mesh.visible = false; scene.add(mesh);
    return { mesh, age: Infinity, vx: 0, vy: 0, vz: 0 };
  });
  const cursor = { ring: 0, crack: 0, dust: 0 };
  const next = (pool, key) => pool[cursor[key]++ % pool.length];   // round-robin = oldest first
  return {
    spawn(x, z, fx) {
      const r = next(rings, 'ring'); r.age = 0; r.size = fx.ring; r.mesh.position.x = x; r.mesh.position.z = z; r.mesh.visible = true;
      const c = next(cracks, 'crack'); c.age = 0; c.mesh.position.x = x; c.mesh.position.z = z;
      c.mesh.scale.set(fx.crack, fx.crack, 1); c.mesh.rotation.z = rand(0, Math.PI * 2); c.mesh.visible = true;
      for (let i = 0; i < fx.dust; i++) {
        const d = next(dusts, 'dust'), a = rand(0, Math.PI * 2), s = rand(0.6, 1.6) * Math.sqrt(fx.ring);
        d.age = 0; d.vx = Math.cos(a) * s; d.vz = Math.sin(a) * s; d.vy = rand(0.6, 1.5);
        d.mesh.position.set(x + Math.cos(a) * 0.3, 0.1, z + Math.sin(a) * 0.3); d.mesh.visible = true;
      }
    },
    update(dt) {
      for (const r of rings) {
        if (!r.mesh.visible) continue;
        r.age += dt; const p = r.age / G.ringTime;
        if (p >= 1) { r.mesh.visible = false; continue; }
        const s = r.size * (0.25 + 0.75 * ease(p) + p * 0.1);
        r.mesh.scale.set(s, s, 1); r.mesh.material.opacity = 0.5 * (1 - p) * (1 - p);
      }
      for (const c of cracks) {
        if (!c.mesh.visible) continue;
        c.age += dt;
        if (c.age >= G.crackTime) { c.mesh.visible = false; continue; }
        c.mesh.material.opacity = 0.85 * clamp((G.crackTime - c.age) / G.crackFade, 0, 1);
      }
      for (const d of dusts) {
        if (!d.mesh.visible) continue;
        d.age += dt; const p = d.age / G.dustLife;
        if (p >= 1) { d.mesh.visible = false; continue; }
        const drag = Math.exp(-3 * dt);
        d.vx *= drag; d.vz *= drag; d.vy *= Math.exp(-1.5 * dt);
        d.mesh.position.x += d.vx * dt; d.mesh.position.y += d.vy * dt; d.mesh.position.z += d.vz * dt;
        d.mesh.scale.setScalar(1 + p * 1.6); d.mesh.material.opacity = 0.3 * (1 - p);
      }
    },
    clear() { for (const o of [...rings, ...cracks, ...dusts]) o.mesh.visible = false; },
  };
})();

// Sword trail during a jump attack: a ribbon through the blade's recent base/tip positions.
const swordTrail = (() => {
  const N = 12, pos = new Float32Array(N * 6), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const idx = [];
  for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.3,
    side: THREE.DoubleSide, depthWrite: false }));
  mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh);
  const pts = [];
  return {
    update(active, rig) {
      if (active) {
        rig.root.updateMatrixWorld(true);
        pts.unshift([rig.weapon.localToWorld(new THREE.Vector3(0, 0, 0.25)), rig.weapon.localToWorld(new THREE.Vector3(0, 0, 1.2))]);
        if (pts.length > N) pts.pop();
      } else if (pts.length) pts.pop();   // fade out by shortening
      pts.forEach(([a, b], i) => { pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); });
      geo.attributes.position.needsUpdate = true;
      geo.setDrawRange(0, Math.max(0, pts.length - 1) * 6);
      mesh.visible = pts.length > 1;
    },
    clear() { pts.length = 0; mesh.visible = false; },
  };
})();

// Lock-on marker: a small bright diamond above the target.
const lockMarker = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0),
  new THREE.MeshBasicMaterial({ color: 0xfff0c8, fog: false, depthTest: false, transparent: true, opacity: 0.9 }));
lockMarker.renderOrder = 11; lockMarker.visible = false; scene.add(lockMarker);

const boxEdges = new THREE.EdgesGeometry(UNIT_BOX);
const makeWire = color => {
  const l = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color, fog: false, depthTest: false }));
  l.visible = false; l.renderOrder = 10; scene.add(l); return l;
};
const debug = { bodies: [], hits: [] };
function updateDebug(game, show, placed) {
  let nb = 0, nh = 0;
  const body = (b, pos) => {
    const w = debug.bodies[nb] || (debug.bodies[nb] = makeWire(0x40ff60)); nb++;
    w.visible = true; w.position.set(pos.x, pos.y + b.height / 2, pos.z); w.scale.set(b.radius * 2, b.height, b.radius * 2);
  };
  const hit = (hb, color) => {
    const w = debug.hits[nh] || (debug.hits[nh] = makeWire(0xffffff)); nh++;
    const c = hb.center();
    w.material.color.set(color); w.visible = true;
    w.position.set(c.x, c.y, c.z); w.rotation.y = hb.owner.yaw; w.scale.set(hb.box.w, hb.box.h, hb.box.d);
  };
  if (show) {
    for (const [b, pos] of placed) if (b.alive()) body(b, pos);
    if (game.player.hitbox) hit(game.player.hitbox, 0xfff040);
    for (const e of game.enemies) if (e.hitbox) hit(e.hitbox, 0xff3030);
  }
  for (let i = nb; i < debug.bodies.length; i++) debug.bodies[i].visible = false;
  for (let i = nh; i < debug.hits.length; i++) debug.hits[i].visible = false;
}
