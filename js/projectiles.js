'use strict';
// ============================================================================
// 7b. Projectiles
// ============================================================================
// An enemy attack with `projectile: { speed, gravity, size }` fires a bolt as its strike goes active, instead
// of opening a hitbox. A bolt flies along the archer's facing with a slight arc solved to meet the player's
// chest at the distance they were when it left the string, so a late sidestep or a roll still beats it.
// Walls, ledges, floors, roofs and closed gates stop it (rails don't: what can be seen over can be shot over).
// It hits the player through Player.takeHit like any strike: a block from the front takes it at block rates,
// the roll's invulnerability lets it pass, and it can never be parried. A fixed pool, oldest reused first.
const projectiles = (() => {
  const P = CONFIG.projectile, pool = [];
  const shaftGeo = new THREE.BoxGeometry(0.035, 0.035, P.length), headGeo = new THREE.ConeGeometry(0.045, 0.14, 6).rotateX(Math.PI / 2);
  const shaftMat = new THREE.MeshStandardMaterial({ color: P.color, roughness: 0.8 });
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.glow).multiplyScalar(2) });   // a glint, readable at range
  for (let i = 0; i < P.max; i++) {
    const mesh = new THREE.Group();
    mesh.add(new THREE.Mesh(shaftGeo, shaftMat));
    const head = new THREE.Mesh(headGeo, headMat); head.position.z = P.length / 2 + 0.06; mesh.add(head);
    mesh.visible = false; scene.add(mesh);
    pool.push({ mesh, live: false, x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0, g: 0, size: 0, age: 0, owner: null, strike: null, passed: false });
  }
  let cursor = 0;
  const v = new THREE.Vector3();

  // Is the segment from (x, y, z) by (dx, dy, dz) stopped by the world? Returns the fraction where, or Infinity.
  function stop(x, y, z, dx, dy, dz) {
    let f = Infinity;
    if (world.solids) {
      for (const s of world.solids) if (!s.low) f = Math.min(f, segBox3(x, y, z, dx, dy, dz, s));
      for (const s of world.slabs) f = Math.min(f, segBox3(x, y, z, dx, dy, dz, s));
      for (const g of world.gates) if (!g.open) f = Math.min(f, segBox3(x, y, z, dx, dy, dz, g.box));
      return f;
    }
    // Flat layouts: the floor, the outer walls and closed gate planes.
    const W = world, ex = x + dx, ez = z + dz;
    if (y + dy < 0) f = Math.min(f, y / -dy);
    if (ex < W.minX || ex > W.maxX || Math.abs(ez) > W.halfZ + (W.alcoves.length ? 3 : 0)) f = Math.min(f, 1);
    for (const g of W.gates) if (!g.open && (x - g.x) * (ex - g.x) < 0) f = Math.min(f, (g.x - x) / dx);
    return f;
  }
  // Fraction along the segment where it passes within `reach` of body b's upright axis (inside its height), or null.
  function meets(b, x, y, z, dx, dy, dz, reach) {
    const l2 = dx * dx + dz * dz;
    const t = l2 > 1e-9 ? clamp(((b.x - x) * dx + (b.z - z) * dz) / l2, 0, 1) : 0;
    const cx = x + dx * t - b.x, cz = z + dz * t - b.z, cy = y + dy * t;
    return cx * cx + cz * cz <= reach * reach && cy >= b.y && cy <= b.y + b.height ? t : null;
  }

  return {
    // Loose a bolt from `owner` (an enemy mid-attack) at the target body.
    fire(owner, attack, target) {
      const A = attack.projectile, b = pool[cursor++ % pool.length], s = Math.sin(owner.yaw), c = Math.cos(owner.yaw);
      b.x = b.px = owner.x + s * owner.radius * 1.2; b.z = b.pz = owner.z + c * owner.radius * 1.2;
      b.y = b.py = owner.y + owner.height * P.muzzle;
      // Distance along the facing to the target, and the vertical speed that meets its chest there.
      const along = Math.max(1, (target.x - b.x) * s + (target.z - b.z) * c), t = along / A.speed;
      const dy = target.y + target.height * P.aimAt - b.y;
      b.vx = s * A.speed; b.vz = c * A.speed; b.vy = dy / t + 0.5 * A.gravity * t;
      b.g = A.gravity; b.size = A.size; b.age = 0; b.owner = owner; b.strike = makeStrike(attack); b.passed = false; b.live = true;
      // `look: 'slash'` (v4.3.1): a crescent of cutting light flung from a blade instead of an arrow (Aldric's Ash Wave).
      const slash = A.look === 'slash';
      if (slash && !b.slash) {
        const geo = new THREE.RingGeometry(0.75, 1, 24, 1, 0, Math.PI);
        b.slash = new THREE.Group();
        for (const [r, op, col] of [[1, 0.95, 0xffd8a0], [1.15, 0.5, 0xff6a20]]) {
          const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
          m.scale.setScalar(r); b.slash.add(m);
        }
        b.mesh.add(b.slash);
      }
      if (b.slash) { b.slash.visible = slash; if (slash) b.slash.scale.setScalar(A.size * 2.4); }
      for (const c of b.mesh.children) if (c !== b.slash) c.visible = !slash;
      if (!b.glow) {   // a soft glint on the head so a bolt reads in the dark (made on first use: glowSprite lives in visuals)
        b.glow = glowSprite(P.glow, 1.4, P.glowSize, 0.7, 0.6); b.glow.position.z = P.length / 2 + 0.06; b.mesh.add(b.glow);
      }
      b.mesh.visible = true;
      events.emit('shot', { enemy: owner, bolt: b });
      return b;
    },
    // One fixed step: fly, then stop at the world or strike the player (whichever comes first along the step).
    update(game, dt) {
      const p = game.player;
      for (const b of pool) {
        if (!b.live) continue;
        b.px = b.x; b.py = b.y; b.pz = b.z;
        b.vy -= b.g * dt;
        const dx = b.vx * dt, dy = b.vy * dt, dz = b.vz * dt;
        b.age += dt;
        const wall = stop(b.x, b.y, b.z, dx, dy, dz);
        const hitT = p.alive() && !b.passed ? meets(p, b.x, b.y, b.z, dx, dy, dz, p.radius + b.size) : null;
        if (hitT !== null && hitT <= wall) {
          const at = { x: b.x + dx * hitT, y: b.y + dy * hitT, z: b.z + dz * hitT };
          if (p.invulnerable()) { b.passed = true; events.emit('dodge', { attacker: b.owner, strike: b.strike, projectile: true }); }   // rolled through: it flies on
          else {
            const res = p.takeHit(b.strike, { x: b.x, z: b.z });   // from where the bolt came: blocks need it in front
            game.hitstop = Math.max(game.hitstop, res.blocked ? CONFIG.block.hitstop : b.strike.hitstop);
            events.emit('strike', { strike: b.strike, attacker: b.owner, target: p, at, blocked: res.blocked, projectile: true });
            this.kill(b); continue;
          }
        }
        if (wall <= 1) { b.x += dx * wall; b.y += dy * wall; b.z += dz * wall; events.emit('boltStopped', { bolt: b }); this.kill(b); continue; }
        b.x += dx; b.y += dy; b.z += dz;
        if (b.age > P.life || b.y < world.killY) this.kill(b);
      }
    },
    kill(b) { b.live = false; b.mesh.visible = false; },
    // Draw each bolt between its last two positions, pointing along its flight.
    render(alpha) {
      for (const b of pool) {
        if (!b.live) continue;
        b.mesh.position.set(lerp(b.px, b.x, alpha), lerp(b.py, b.y, alpha), lerp(b.pz, b.z, alpha));
        b.mesh.lookAt(v.set(b.mesh.position.x + b.vx, b.mesh.position.y + b.vy, b.mesh.position.z + b.vz));
      }
    },
    clear() { for (const b of pool) this.kill(b); },
    live() { return pool.filter(b => b.live); },
  };
})();
