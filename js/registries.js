'use strict';
// ============================================================================
// 2c. Registries: animations, weapons, idle styles
// ============================================================================
// Each name used in the data must exist here; validateData() checks, and lookups warn and fall back.
function lookup(registry, name, what, fallback) {
  if (name in registry) return registry[name];
  warnOnce(`Unknown ${what} "${name}", using "${fallback}".`);
  return registry[fallback];
}

// Attack animations: (rig, phase, p 0..1 through the phase, dir = mirror for alternating swings).
const ANIMS = {
  sweep(r, phase, p, dir) {
    const { armR, spin, tip, weapon } = r;
    if (phase === PHASE.STARTUP) { armR.rotation.x = lerp(-0.4, -1.7, ease(p)); spin.rotation.y = dir * lerp(0, -1.1, ease(p)); weapon.rotation.x = lerp(0.5, -0.1, ease(p)); }
    else if (phase === PHASE.ACTIVE) { armR.rotation.x = -1.5; spin.rotation.y = dir * lerp(-1.1, 1.2, p); tip.rotation.x = 0.12; weapon.rotation.x = lerp(-0.1, 0.9, p); }
    else { armR.rotation.x = lerp(-1.5, -0.4, ease(p)); spin.rotation.y = dir * lerp(1.2, 0, ease(p)); tip.rotation.x = lerp(0.12, 0, p); weapon.rotation.x = lerp(0.9, 0.5, ease(p)); }
  },
  overhead(r, phase, p) {
    const { armR, tip, weapon } = r;
    if (phase === PHASE.STARTUP) { armR.rotation.x = lerp(-0.4, -3.2, ease(p)); tip.rotation.x = lerp(0, -0.2, ease(p)); weapon.rotation.x = lerp(0.5, 0.1, ease(p)); }
    else if (phase === PHASE.ACTIVE) { armR.rotation.x = lerp(-3.2, -0.7, p); tip.rotation.x = lerp(-0.2, 0.3, p); weapon.rotation.x = lerp(0.1, 0.8, p); }
    else { armR.rotation.x = lerp(-0.7, -0.4, ease(p)); tip.rotation.x = lerp(0.3, 0, ease(p)); weapon.rotation.x = lerp(0.8, 0.5, ease(p)); }
  },
  stab(r, phase, p) {
    const { armR, spin, tip, weapon } = r;
    if (phase === PHASE.STARTUP) { armR.rotation.x = lerp(-0.4, -1.0, ease(p)); spin.rotation.y = lerp(0, -0.8, ease(p)); weapon.rotation.x = lerp(0.5, 1.5, ease(p)); }
    else if (phase === PHASE.ACTIVE) { armR.rotation.x = -1.5; spin.rotation.y = lerp(-0.8, 0.6, p); tip.rotation.x = 0.25; weapon.rotation.x = 1.5; }
    else { armR.rotation.x = lerp(-1.5, -0.4, ease(p)); spin.rotation.y = lerp(0.6, 0, ease(p)); tip.rotation.x = lerp(0.25, 0, p); weapon.rotation.x = lerp(1.5, 0.5, ease(p)); }
  },
  bash(r, phase, p) {
    const { armL, spin, tip } = r;
    if (phase === PHASE.STARTUP) { armL.rotation.x = lerp(-0.1, -1.4, ease(p)); spin.rotation.y = lerp(0, 0.7, ease(p)); tip.rotation.x = lerp(0, -0.1, p); }
    else if (phase === PHASE.ACTIVE) { armL.rotation.x = -1.5; spin.rotation.y = lerp(0.7, -0.6, p); tip.rotation.x = lerp(-0.1, 0.35, p); }
    else { armL.rotation.x = lerp(-1.5, -0.1, ease(p)); spin.rotation.y = lerp(-0.6, 0, ease(p)); tip.rotation.x = lerp(0.35, 0, ease(p)); }
  },
  // Bow: the bow arm comes up level and the stance turns side-on while the string hand draws back; the release
  // snaps the hand open.
  draw(r, phase, p) {
    const { armR, armL, spin, weapon, head } = r;
    if (phase === PHASE.STARTUP) {
      const k = ease(clamp(p * 1.7, 0, 1)), d = ease(clamp((p - 0.25) / 0.75, 0, 1));
      armR.rotation.x = lerp(-0.4, -1.55, k); weapon.rotation.x = lerp(0.5, 0, k); spin.rotation.y = lerp(0, 0.35, k);
      armL.rotation.x = lerp(-0.1, lerp(-1.5, -1.0, d), k); armL.rotation.z = lerp(0, -0.75, k); head.rotation.y = 0.3 * k;
    } else if (phase === PHASE.ACTIVE) {
      armR.rotation.x = -1.55; weapon.rotation.x = 0; spin.rotation.y = 0.35; head.rotation.y = 0.3;
      armL.rotation.x = lerp(-1.0, -0.6, ease(p)); armL.rotation.z = lerp(-0.75, -0.2, ease(p));
    } else {
      const k = ease(p);
      armR.rotation.x = lerp(-1.55, -0.4, k); weapon.rotation.x = lerp(0, 0.5, k); spin.rotation.y = lerp(0.35, 0, k);
      armL.rotation.x = lerp(-0.6, -0.1, k); armL.rotation.z = lerp(-0.2, 0, k); head.rotation.y = 0.3 * (1 - k);
    }
  },
  // Two-handed push: both arms gathered in with a crouch, then driven forward with the whole body behind them.
  shove(r, phase, p) {
    const { armR, armL, tip } = r;
    if (phase === PHASE.STARTUP) {
      const k = ease(p);
      armR.rotation.x = armL.rotation.x = lerp(-0.4, -0.75, k); armR.rotation.z = 0.35 * k; armL.rotation.z = -0.35 * k;
      tip.rotation.x = -0.16 * k; r.crouch(0.2 * k);
    } else if (phase === PHASE.ACTIVE) {
      armR.rotation.x = armL.rotation.x = lerp(-0.75, -1.6, ease(clamp(p * 2, 0, 1))); tip.rotation.x = lerp(-0.16, 0.34, p);
    } else {
      const k = ease(p);
      armR.rotation.x = armL.rotation.x = lerp(-1.6, -0.3, k); tip.rotation.x = lerp(0.34, 0, k);
    }
  },
  // A quick front kick with the right leg.
  kick(r, phase, p) {
    const { legR, kneeR, tip, armL } = r;
    if (phase === PHASE.STARTUP) { const k = ease(p); legR.rotation.x = -0.9 * k; kneeR.rotation.x = 1.5 * k; tip.rotation.x = -0.12 * k; armL.rotation.x = -0.1 - 0.5 * k; }
    else if (phase === PHASE.ACTIVE) { legR.rotation.x = lerp(-0.9, -1.4, p); kneeR.rotation.x = lerp(1.5, 0.1, ease(clamp(p * 2, 0, 1))); tip.rotation.x = -0.2; armL.rotation.x = -0.6; }
    else { const k = ease(p); legR.rotation.x = lerp(-1.4, 0, k); kneeR.rotation.x = lerp(0.1, 0, k); tip.rotation.x = lerp(-0.2, 0, k); armL.rotation.x = lerp(-0.6, -0.1, k); }
  },
  stomp(r, phase, p) {
    const { armR, armL, tip, legL, kneeL } = r;
    if (phase === PHASE.STARTUP) { legL.rotation.x = lerp(0, -1.5, ease(p)); kneeL.rotation.x = lerp(0, 1.3, ease(p)); tip.rotation.x = lerp(0, -0.16, ease(p)); armR.rotation.x = lerp(-0.4, -2.6, ease(p)); armL.rotation.x = lerp(-0.1, -2.6, ease(p)); }
    else if (phase === PHASE.ACTIVE) { legL.rotation.x = lerp(-1.5, 0, p); kneeL.rotation.x = lerp(1.3, 0, p); tip.rotation.x = lerp(-0.16, 0.2, p); armR.rotation.x = armL.rotation.x = lerp(-2.6, -0.6, p); }
    else { tip.rotation.x = lerp(0.2, 0, ease(p)); armR.rotation.x = lerp(-0.6, -0.4, p); armL.rotation.x = lerp(-0.6, -0.1, p); }
  },
};

// Weapons (right hand) and off-hand items: a default colour and a builder (part, material) -> meshes.
const WEAPONS = {
  sword: { color: 0x9aa0a8, build(part, mat, dark) {
    part(new THREE.BoxGeometry(0.045, 0.1, 1.15), mat, 0, 0, 0.62);
    part(new THREE.BoxGeometry(0.3, 0.06, 0.06), dark, 0, 0, 0.06);
  } },
  club: { color: 0x9a927c, build(part, mat) {
    part(new THREE.BoxGeometry(0.13, 0.13, 1.1), mat, 0, 0, 0.5);
    part(new THREE.BoxGeometry(0.3, 0.3, 0.6), mat, 0, 0, 1.2);
  } },
  bow: { color: 0x6a5238, build(part, mat, dark) {   // a short bow held upright when aimed; the string toward the archer
    part(new THREE.BoxGeometry(0.07, 0.08, 0.17), dark, 0, 0, 0);
    part(new THREE.BoxGeometry(0.045, 0.05, 0.52).rotateX(-0.35), mat, 0, 0.08, 0.29);
    part(new THREE.BoxGeometry(0.045, 0.05, 0.52).rotateX(0.35), mat, 0, 0.08, -0.29);
    part(new THREE.BoxGeometry(0.012, 0.012, 1.04), dark, 0, 0.17, 0);
  } },
  none: { color: 0x9aa0a8, build() {} },
};
const OFFHANDS = {
  shield: { color: 0x5b5f66, build(part, mat) {
    part(new THREE.BoxGeometry(0.09, 0.78, 0.56), mat, 0.07, -0.42, 0.1);
    part(new THREE.BoxGeometry(0.03, 0.2, 0.2), mat, 0.13, -0.42, 0.1);
  } },
  kite: { color: 0x7a6a48, build(part, mat) {   // tall shield faced forward on the left forearm
    part(new THREE.BoxGeometry(0.6, 0.95, 0.07), mat, 0.04, -0.46, 0.19);
    part(new THREE.BoxGeometry(0.66, 0.08, 0.09), mat, 0.04, 0.0, 0.19);
    part(new THREE.BoxGeometry(0.16, 0.16, 0.07), mat, 0.04, -0.42, 0.25);
  } },
};

// Idle personalities, blended in by weight w (0..1). t is a per-enemy time with its own seed and tempo.
const IDLE_STYLES = {
  guard(r, t, w) {   // stands guard, shifts weight, now and then checks its weapon
    const shift = Math.sin(t * 0.9);
    r.spin.position.x += shift * 0.045 * w; r.tip.rotation.z += shift * 0.03 * w;
    r.legL.rotation.z += Math.max(0, shift) * 0.08 * w; r.legR.rotation.z -= Math.max(0, -shift) * 0.08 * w;
    const check = ease(Math.sin(t * 0.21) * 4 - 3);
    r.armR.rotation.x += -0.9 * check * w; r.weapon.rotation.z += 0.8 * check * w; r.head.rotation.x += 0.35 * check * w;
  },
  still(r, t, w) {   // heavy and still, slow breathing
    const breath = Math.sin(t * 1.1);
    r.spin.scale.y *= 1 + breath * 0.018 * w; r.spin.scale.x *= 1 + breath * 0.012 * w;
    r.tip.rotation.z += Math.sin(t * 0.3) * 0.008 * w;
  },
  twitch(r, t, w) {   // crouched, restless feet, sudden twitches, small pacing circle (visual offset only)
    const step = Math.sin(t * 4) * 0.12 * w;
    r.legL.rotation.x += step; r.legR.rotation.x -= step;
    r.crouch(0.16 * w); r.tip.rotation.x += 0.12 * w;
    const tw = Math.pow(Math.max(0, Math.sin(t * 2.3)), 12);
    r.head.rotation.y += Math.sin(t * 17) * 0.25 * tw * w; r.armR.rotation.x -= 0.4 * tw * w;
    r.root.position.x += Math.cos(t * 0.8) * 0.22 * w; r.root.position.z += Math.sin(t * 0.8) * 0.22 * w;
  },
  sway(r, t, w) {   // slow sway, club resting on the ground and dragging
    r.tip.rotation.z += Math.sin(t * 0.45) * 0.04 * w; r.tip.rotation.x += Math.sin(t * 0.31) * 0.025 * w;
    r.armR.rotation.x = lerp(r.armR.rotation.x, -0.05, w);
    r.weapon.rotation.x = lerp(r.weapon.rotation.x, 1.25, w);
    r.weapon.rotation.y += Math.sin(t * 0.45) * 0.12 * w;
  },
  none() {},
};
