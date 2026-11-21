'use strict';
// ============================================================================
// Camera feel: small springy camera motions that answer the player's actions (drawing only)
// ============================================================================
// A swing nudges the view forward, a roll widens it a little and dips, a blow taken knocks it away from the attacker
// with a slight roll, a parry or a heavy hit punches in, landings dip, moving sideways leans the horizon a hair, a
// legendary ability's power hits the view as hard as it looks, a rare's less.
// It offsets the drawn camera after Game.render places it, so it never touches Game.cam, aim or movement. Every
// motion is a critically damped spring (CONFIG.camera.feel), never a shake. Off with the "Camera motion" option.
const cameraFeel = (() => {
  const F = CONFIG.camera.feel, w = F.omega, keys = ['x', 'y', 'z', 'roll', 'fov'];
  const pos = { x: 0, y: 0, z: 0, roll: 0, fov: 0 }, vel = { x: 0, y: 0, z: 0, roll: 0, fov: 0 }, goal = { x: 0, y: 0, z: 0, roll: 0, fov: 0 };
  const right = new THREE.Vector3(), up = new THREE.Vector3(), fwd = new THREE.Vector3();
  let prevState = null, owner = null, wasOn = true;
  const enabled = () => settings.cameraMotion !== false;
  // An impulse that peaks near `amount` (a critically damped spring kicked at rest peaks at v0 / (w e)).
  const kick = (k, amount) => { if (enabled()) vel[k] += amount * w * Math.E; };
  // A world direction in the camera's own frame (right, forward), flattened.
  const local = (dx, dz) => { const l = Math.hypot(dx, dz) || 1; return [(dx * right.x + dz * right.z) / l, (dx * fwd.x + dz * fwd.z) / l]; };
  const isPlayer = b => b && b === Game.player;
  const heavy = a => a && (a.feel === 'heavy' || a.charge);   // charged heavies, or attacks that opt in (jumpHeavy)

  // A counter (a riposte's blow, pass 92): its swing kicks like a heavy's and the view punches in as it starts.
  const counter = b => !!(b && b.payload && b.payload.riposte);
  events.on('attackPhase', d => {
    if (!isPlayer(d.actor) || d.phase !== PHASE.ACTIVE) return;
    const C = counter(d.actor), H = heavy(d.attack) || C;
    kick('z', H ? F.heavy : F.swing);
    kick('roll', (d.hitIndex % 2 ? -1 : 1) * F.swingRoll * (H ? 1.6 : 1));
    if (H) kick('y', -F.heavyDip);
    if (C) kick('fov', F.counterFov);
    if (d.attack.flashStep) kick('z', F.flashPush);   // a flash step: the view surges after the body (pass 95)
  });
  events.on('strike', d => {
    if (isPlayer(d.target) && d.rooted) kick('fov', F.hurtFov * 0.5);   // Iron Root: planted, the view stays with the body
    else if (isPlayer(d.target)) {   // knocked away from the blow
      const k = clamp((d.strike.damage || 10) / F.hurtRef, 0.3, 1.4) * (d.blocked || d.plated ? F.blockMul : 1);
      const [lx, lz] = d.attacker ? local(d.target.x - d.attacker.x, d.target.z - d.attacker.z) : [0, -1];
      kick('x', lx * F.hurtPush * k); kick('z', lz * F.hurtPush * k);
      kick('roll', (lx >= 0 ? -1 : 1) * F.hurtRoll * k); kick('fov', F.hurtFov * k);
    } else if (isPlayer(d.attacker) && !d.blocked) {   // a heavy, a finisher or a counter landing punches in (pass 92), and any big blow
      const big = d.strike.riposte || (d.strike.charge > 0) || heavy(d.attacker.attack);
      if (d.strike.riposte) {   // a counter landing (pass 95): a hard punch in and a swing of the view with the cut
        const a = d.attacker.attack, rising = a && a.cut && a.cut.kind === 'arc';
        kick('fov', F.counterHitFov); kick('roll', (rising ? 1 : -1) * F.counterRoll);
        if (rising) kick('y', F.counterSwing); else kick('x', F.counterSwing);
      } else if (big || (d.strike.damage || 0) >= F.punchFrom) kick('fov', big ? F.heavyHitFov : F.hitFov);
      if (big) kick('y', -F.heavyDip * 0.6);
    }
  });
  events.on('parry', d => { if (d.player && !isPlayer(d.player)) return; kick('fov', F.parryFov); kick('z', F.parryPush); });
  events.on('postureBreak', () => kick('fov', F.breakFov));
  events.on('execution', d => { if (!d.player || isPlayer(d.player)) kick('fov', F.executeFov); });
  events.on('land', d => { if (!d.player || isPlayer(d.player)) kick('y', -F.landDip * 1.5); });
  events.on('fallDamage', d => { if (isPlayer(d.body)) kick('y', -F.landDip * 1.3); });
  events.on('bossPhase', () => kick('fov', F.phaseFov));
  events.on('seized', d => { if (isPlayer(d.body)) { kick('fov', F.hurtFov); kick('y', F.landDip * 2); } });   // a boss's hand closing on you (pass 72)
  events.on('struggle', d => { if (isPlayer(d.body)) kick('roll', (Math.random() < 0.5 ? -1 : 1) * F.hurtRoll); });
  // A power: in full for its holder, less the further off it is for everyone else. A bolt's, a twin's or a striking summon's
  // blow kicks as itself (`strike`, `echo`, `bite`), a summon drawing the boss as `draw`.
  const LATE_KICK = { stitch: 1, iai: 2 };
  events.on('abilityPower', d => {
    if (ABILITY_BY_ID[d.power] && ABILITY_BY_ID[d.power].rarity === 'common') return;   // commons never move the camera
    if (d.end || d.flight || (d.then === 'flurry' && d.strike)) return;   // a fireball kicks where it lands, not as it flies   // a flurry's thrusts are too many to kick; a cut-short power is still
    // Shadow Stitch kicks at its first spike, Quick Draw at its split, never at the press (the stance is still).
    const late = LATE_KICK[d.then];
    if (late !== undefined && (d.strike || 0) !== late) return;
    // Batch 11: no kick a peck, an arrow or an owl's mark (too many, or too quiet); a hawk's dive kicks as it lands (`stoop`).
    if (d.strike && (d.then === 'crows' || d.then === 'archer' || d.then === 'owl' || (d.then === 'hawk' && !d.land))) return;
    // Batch 12: no kick a ronin's cut, a squeeze, a puppet's blow or a mantis's cut; a bear's swipe kicks as it lands
    // (`maul`); a ronin kicks as `draw` on its deflect (`parry`), not as it starts drawing.
    if (d.strike && (d.then === 'ronin' || d.then === 'serpent' || d.then === 'puppet' || d.then === 'mantis' || (d.then === 'bear' && !d.land))) return;
    if (d.draw && d.then === 'ronin') return;
    // Batch 13: the crown's ring bolts kick as `spark`, its last as the crown closing (`boltCrown`); the cage kicks as it
    // closes (its call), never a cut; Storm King's call is the heavy's own kick.
    if (d.then === 'bladeCage' && d.strike) return;
    if (d.then === 'boltCrown') {
      if (!d.strike) return;
      const C = F.powers[d.v && d.strike >= d.v.strikes ? 'boltCrown' : 'spark'], p = Game.player, k = !p ? 0 : isPlayer(d.body) ? 1 : clamp(1 - Math.hypot(p.x - d.x, p.z - d.z) / F.powerNear, 0, 1);
      if (k > 0) { kick('fov', C[0] * k); kick('y', -C[1] * k); }
      return;
    }
    // Batch 14: Fourfold never kicks (the Ultimate is the moment); a lightning line kicks only when it cut a boss; a shade
    // host kicks at its first clone only, and its clones' blows never (three would shake the view).
    if (d.then === 'refillKeys' || (d.then === 'lightningDash' && (d.strike || !d.boss)) || (d.then === 'shadeClone' && (d.strike || !d.first))) return;
    const P = F.powers[late !== undefined ? d.then : d.draw || d.parry ? 'draw' : d.then === 'hawk' && d.land ? 'stoop' : d.then === 'bear' && d.land ? 'maul' : d.strike ? (d.then === 'twin' || d.then === 'ghostBlade' ? 'echo' : SUMMON_STRIKERS.has(d.then) ? 'bite' : 'strike') : d.then], p = Game.player;
    if (!P || !p) return;
    const k = isPlayer(d.body) ? 1 : clamp(1 - Math.hypot(p.x - d.x, p.z - d.z) / F.powerNear, 0, 1);
    if (k > 0) { kick('fov', P[0] * k); kick('y', -P[1] * k); }
  });
  events.on('abilityPerk', d => {
    if (!isPlayer(d.body)) return;
    if (d.saved) { const P = F.powers.undying; kick('fov', P[0]); kick('y', -P[1]); return; }   // Unbroken holding a killing blow: wide, with the kneel
    if (!COMMON_PERKS.has(d.perk) && !RARE_QUIET_PERKS.has(d.perk)) kick('fov', F.perkFov);
  });   // a rare acting: a small punch in (a common is drawn alone)

  Game.renderHooks.unshift((game) => {   // first of the hooks: effects drawn after it see the moved camera
    const dt = game.renderDt;
    const p = game.player;
    if (owner !== p) {
      owner = p; prevState = p && p.state;
      for (const k of keys) pos[k] = vel[k] = goal[k] = 0;
    }
    if (typeof multiplayer !== 'undefined' && multiplayer.spectating) {
      // The shared camera already includes its owner's effects. Clear personal
      // springs so an old kick cannot resume after the next team attempt.
      for (const k of keys) pos[k] = vel[k] = goal[k] = 0;
      prevState = p && p.state;
      wasOn = false;
      return;
    }
    if (!enabled()) {
      if (wasOn) { for (const k of keys) pos[k] = vel[k] = goal[k] = 0; camera.fov = CONFIG.camera.fov; camera.updateProjectionMatrix(); wasOn = false; }
      prevState = p && p.state;
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
    const decay = Math.exp(-w * dt);
    for (const k of keys) {   // exact critically damped solution: the same response at every display rate
      const offset = pos[k] - goal[k], impulse = vel[k] + w * offset;
      pos[k] = goal[k] + (offset + impulse * dt) * decay;
      vel[k] = (vel[k] - w * impulse * dt) * decay;
    }
    camera.position.addScaledVector(right, pos.x).addScaledVector(up, pos.y).addScaledVector(fwd, pos.z);
    camera.rotateZ(clamp(pos.roll, -F.maxRoll, F.maxRoll));
    const fov = CONFIG.camera.fov + clamp(pos.fov, -F.maxFov, F.maxFov);
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
  });
  return { state: () => ({ ...pos }) };
})();
