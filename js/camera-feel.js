'use strict';
// ============================================================================
// Camera feel: small springy camera motions that answer the player's actions (drawing only)
// ============================================================================
// A swing nudges the view forward, a roll widens it a little and dips, a blow taken knocks it away from the attacker
// with a slight roll, a parry or a heavy hit punches in, landings dip, moving sideways leans the horizon a hair.
// It offsets the drawn camera after Game.render places it, so it never touches Game.cam, aim or movement. Every
// motion is a critically damped spring (CONFIG.camera.feel), never a shake. Off with the "Camera motion" option.
const cameraFeel = (() => {
  const F = CONFIG.camera.feel, w = F.omega, keys = ['x', 'y', 'z', 'roll', 'fov'];
  const pos = { x: 0, y: 0, z: 0, roll: 0, fov: 0 }, vel = { x: 0, y: 0, z: 0, roll: 0, fov: 0 }, goal = { x: 0, y: 0, z: 0, roll: 0, fov: 0 };
  const right = new THREE.Vector3(), up = new THREE.Vector3(), fwd = new THREE.Vector3();
  let last = performance.now(), prevState = null, wasOn = true;
  const enabled = () => settings.cameraMotion !== false;
  // An impulse that peaks near `amount` (a critically damped spring kicked at rest peaks at v0 / (w e)).
  const kick = (k, amount) => { if (enabled()) vel[k] += amount * w * Math.E; };
  // A world direction in the camera's own frame (right, forward), flattened.
  const local = (dx, dz) => { const l = Math.hypot(dx, dz) || 1; return [(dx * right.x + dz * right.z) / l, (dx * fwd.x + dz * fwd.z) / l]; };
  const isPlayer = b => b && b === Game.player;
  const heavy = a => a && (a.id === 'heavy' || a.id === 'jumpHeavy' || a.charge);

  events.on('attackPhase', d => {
    if (!isPlayer(d.actor) || d.phase !== PHASE.ACTIVE) return;
    const H = heavy(d.attack);
    kick('z', H ? F.heavy : F.swing);
    kick('roll', (d.hitIndex % 2 ? -1 : 1) * F.swingRoll * (H ? 1.6 : 1));
    if (H) kick('y', -F.heavyDip);
  });
  events.on('strike', d => {
    if (isPlayer(d.target)) {   // knocked away from the blow
      const k = clamp((d.strike.damage || 10) / F.hurtRef, 0.3, 1.4) * (d.blocked ? F.blockMul : 1);
      const [lx, lz] = d.attacker ? local(d.target.x - d.attacker.x, d.target.z - d.attacker.z) : [0, -1];
      kick('x', lx * F.hurtPush * k); kick('z', lz * F.hurtPush * k);
      kick('roll', (lx >= 0 ? -1 : 1) * F.hurtRoll * k); kick('fov', F.hurtFov * k);
    } else if (isPlayer(d.attacker) && !d.blocked && (d.strike.damage || 0) >= F.punchFrom) kick('fov', F.hitFov);
  });
  events.on('parry', d => { if (d.player && !isPlayer(d.player)) return; kick('fov', F.parryFov); kick('z', F.parryPush); });
  events.on('postureBreak', () => kick('fov', F.breakFov));
  events.on('execution', d => { if (!d.player || isPlayer(d.player)) kick('fov', F.executeFov); });
  events.on('land', () => kick('y', -F.landDip * 1.5));
  events.on('fallDamage', d => { if (isPlayer(d.body)) kick('y', -F.landDip * 1.3); });
  events.on('bossPhase', () => kick('fov', F.phaseFov));

  Game.renderHooks.unshift((game) => {   // first of the hooks: effects drawn after it see the moved camera
    const now = performance.now(), dt = Game.manualClock ? 1 / 60 : Math.min(0.05, (now - last) / 1000); last = now;
    const p = game.player;
    if (typeof multiplayer !== 'undefined' && multiplayer.spectating) {
      // The shared camera already includes its owner's effects. Clear personal
      // springs so an old kick cannot resume after the next team attempt.
      for (const k of keys) pos[k] = vel[k] = 0;
      wasOn = false;
      return;
    }
    if (!enabled()) {
      if (wasOn) { for (const k of keys) pos[k] = vel[k] = 0; camera.fov = CONFIG.camera.fov; camera.updateProjectionMatrix(); wasOn = false; }
      return;
    }
    wasOn = true;
    right.set(1, 0, 0).applyQuaternion(camera.quaternion); up.set(0, 1, 0).applyQuaternion(camera.quaternion); fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    // state changes: a roll begins (wider, lower), a fall ends (a small dip)
    if (p && p.state !== prevState) {
      if (p.state === PS.ROLL) { kick('fov', F.rollFov); kick('y', -F.rollDip); }
      if ((prevState === PS.FALL || prevState === PS.JUMP) && p.state !== PS.JUMP_ATTACK) kick('y', -F.landDip * 0.5);
      prevState = p.state;
    }
    // held motions: moving sideways leans the horizon, moving at all opens the view a touch
    if (p && p.alive()) {
      const [lx, lz] = local(p.vx, p.vz), sp = Math.hypot(p.vx, p.vz), k = clamp(sp / F.moveRef, 0, 1);
      goal.roll = -lx * k * F.strafeRoll; goal.fov = k * F.moveFov * Math.max(0, lz * 0.5 + 0.5);
    } else goal.roll = goal.fov = 0;
    for (const k of keys) {   // critically damped springs toward their goals
      const a = w * w * (goal[k] - pos[k]) - 2 * w * vel[k];
      vel[k] += a * dt; pos[k] += vel[k] * dt;
    }
    camera.position.addScaledVector(right, pos.x).addScaledVector(up, pos.y).addScaledVector(fwd, pos.z);
    camera.rotateZ(clamp(pos.roll, -F.maxRoll, F.maxRoll));
    camera.fov = CONFIG.camera.fov + clamp(pos.fov, -F.maxFov, F.maxFov); camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return { state: () => ({ ...pos }) };
})();
