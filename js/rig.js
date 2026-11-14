'use strict';
const WARN_COLOR = new THREE.Color(0xff3a1a);
const ROLL_ONLY_COLOR = new THREE.Color(CONFIG.VISUALS.rollOnlyGlow.color);   // wind-up of any attack that cannot be parried
const HURT_COLOR = new THREE.Color(0xff1010);
const HIT_COLOR = new THREE.Color(0xffffff);
const CRACK_COLOR = new THREE.Color(0xffc060);
const EXEC_CUE_COLOR = new THREE.Color(0xff3a20);   // a kneeling enemy the player can execute (js/execution.js)
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const shadowGeo = new THREE.CircleGeometry(1, 20);

// Humanoid built from primitives. Local +Z is forward; the weapon arm is on -X.
const HIP = 0.95, LEG_SEG = 0.45;   // hip pivot height; thigh and shin length
// Scratch for Rig.holdHaft (one body at a time; nothing allocated per frame).
const HAFT_TMP = { v: new THREE.Vector3(), h: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3(), p: new THREE.Vector3(),
  n: new THREE.Vector3(), f: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), qt: new THREE.Quaternion(),
  qh: new THREE.Quaternion(), eu: new THREE.Euler() };
const POLE_L = new THREE.Vector3(0.55, -1, -0.35).normalize();   // where an elbow points when its hand is on a haft: out, down, a little back
const POLE_R = new THREE.Vector3(-0.55, -1, -0.35).normalize();
const quarterTurn = t => t > Math.PI / 2 ? t - Math.PI : t < -Math.PI / 2 ? t + Math.PI : t;   // a fist holds a haft either way round
const Y_AXIS = new THREE.Vector3(0, 1, 0);
class Rig {
  constructor({ scale, bulk, color, weapon, weaponColor, offhand, visual, model, variant }) {
    this.fit = 1; this.alphaK = 1;
    if (model) buildModelRig(this, model, variant);   // a character with a model definition (js/data/models.js)
    else {
    const W = lookup(WEAPONS, weapon, 'weapon', 'sword');
    // Look (section 9b): desaturated cloth or armour, a pale skin / helmet material, a faint rim light.
    const L = rigLook(color, visual);
    const body = addRim(new THREE.MeshStandardMaterial({ color: L.body, roughness: L.rough, metalness: L.metal, transparent: true }), L.rim);
    const dark = addRim(new THREE.MeshStandardMaterial({ color: L.dark, roughness: Math.min(1, L.rough + 0.15), metalness: L.metal * 0.5, transparent: true }), L.rim);
    const skin = addRim(new THREE.MeshStandardMaterial({ color: L.skin, roughness: L.skinRough, metalness: L.skinMetal, transparent: true }), L.rim);
    this.weaponBase = new THREE.Color(weaponColor ?? W.color);
    this.weaponMat = new THREE.MeshStandardMaterial({ color: this.weaponBase, roughness: 0.4, metalness: 0.2, transparent: true });
    this.bodyMats = [body, dark, skin];
    this.mats = [body, dark, skin, this.weaponMat];
    const part = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
    const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    this.root = new THREE.Group();
    this.tip = pivot(this.root, 0, 0, 0);          // tips over at the feet
    this.spin = pivot(this.tip, 0, HIP, 0);        // twists / tumbles at the hips
    part(this.spin, new THREE.BoxGeometry(0.56, 0.72, 0.32), body, 0, 0.32, 0);
    part(this.spin, new THREE.BoxGeometry(0.5, 0.14, 0.3), dark, 0, -0.05, 0);
    this.head = pivot(this.spin, 0, 0.72, 0);
    part(this.head, new THREE.SphereGeometry(0.17, 14, 10), skin, 0, 0.12, 0);
    this.legL = pivot(this.spin, 0.15, -0.05, 0);
    this.legR = pivot(this.spin, -0.15, -0.05, 0);
    // Thigh + shin with a knee, so lowering the hips bends the legs instead of sinking the feet.
    this.kneeL = pivot(this.legL, 0, -LEG_SEG, 0);
    this.kneeR = pivot(this.legR, 0, -LEG_SEG, 0);
    for (const leg of [this.legL, this.legR]) part(leg, new THREE.BoxGeometry(0.2, LEG_SEG + 0.02, 0.22), dark, 0, -LEG_SEG / 2, 0);
    for (const knee of [this.kneeL, this.kneeR]) part(knee, new THREE.BoxGeometry(0.18, LEG_SEG + 0.02, 0.2), dark, 0, -LEG_SEG / 2, 0);
    this.armL = pivot(this.spin, 0.37, 0.6, 0);
    this.armR = pivot(this.spin, -0.37, 0.6, 0);
    for (const arm of [this.armL, this.armR]) part(arm, new THREE.BoxGeometry(0.16, 0.62, 0.16), L.bareArms ? skin : body, 0, -0.31, 0);
    this.weapon = pivot(this.armR, 0, -0.6, 0);
    W.build((geo, mat, x, y, z) => part(this.weapon, geo, mat, x, y, z), this.weaponMat, dark);
    this.warnGlow = makeWarnGlow(); this.weapon.add(this.warnGlow);   // wind-up halo, readable through any fog
    this.shieldGlow = null; this.tellGlows = null;   // a model with a `shieldTell` or `tells` (js/bodykit.js): the same halo on its shield, claw or foot
    if (visual && visual.embers) this.embers = addWeaponEmbers(this.weapon, W);   // section 9b
    if (visual && visual.cloak) part(this.spin, new THREE.BoxGeometry(0.6, 1.15, 0.05), dark, 0, 0.05, -0.19);   // a cloak down the back
    if (offhand) {
      const O = lookup(OFFHANDS, offhand, 'off-hand', 'shield');
      const mat = new THREE.MeshStandardMaterial({ color: O.color, roughness: 0.5, metalness: 0.4, transparent: true });
      this.mats.push(mat);
      O.build((geo, m, x, y, z) => part(this.armL, geo, m, x, y, z), mat);
    }
    }
    this.root.scale.set(scale * bulk, scale * this.fit, scale * bulk);
    this.shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadowRadius = 0.55 * scale * bulk;
    // Visual-only state: weapon lag spring, the yaw seen last frame, idle blend weight.
    this.lag = 0; this.lagPitch = 0; this.lastYaw = null; this.idleW = 1;
    this.leanF = 0; this.leanS = 0; this.leanFwd = null; this.leanYaw = null;   // weightLean's smoothed lean
    scene.add(this.root, this.shadow);
  }
  reset() {
    this.tip.rotation.set(0, 0, 0);
    this.spin.rotation.set(0, 0, 0); this.spin.scale.setScalar(1); this.spin.position.set(0, HIP, 0);
    this.head.rotation.set(0, 0, 0);
    if (this.neck) this.neck.rotation.set(0, 0, 0);   // the animator adds to it each frame (breath, nod): without this it winds up
    this.legL.rotation.set(0, 0, 0); this.legR.rotation.set(0, 0, 0);
    this.kneeL.rotation.x = this.kneeR.rotation.x = 0; this.crouchDrop = 0;
    this.armL.rotation.set(-0.1, 0, 0); this.armR.rotation.set(-0.4, 0, 0);
    this.weapon.rotation.set(0.5, 0, 0);
    if (this.rest) for (const [bone, r] of this.rest) bone.rotation.set(r[0], r[1], r[2]);   // a model's resting posture
    if (this.grip) { const G = this.grip; this.haftNow[0] = G.rest[0]; this.haftNow[1] = G.rest[1]; this.haftNow[2] = G.rest[2]; this.gripW = 0; }
  }
  walk(phase, amount) {
    const s = Math.sin(phase) * amount;
    this.legL.rotation.x = s; this.legR.rotation.x = -s; this.armL.rotation.x = -0.1 - s * 0.6;
    // Knee lifts on the leg that is swinging through.
    const lift = Math.sin(phase - 1.2) * amount * 1.4;
    this.kneeL.rotation.x = Math.max(0, lift); this.kneeR.rotation.x = Math.max(0, -lift);
  }
  // Lower the hips by `drop` while keeping both feet on the floor: thighs tilt forward, knees bend.
  // Repeated calls stack as one deeper crouch, not as two bends on top of each other.
  crouch(drop) {
    if (drop <= 0) return;
    const bend = d => Math.acos(clamp(1 - d / (2 * LEG_SEG), -1, 1));
    const a = bend(this.crouchDrop + drop) - bend(this.crouchDrop);
    this.crouchDrop += drop;
    this.spin.position.y -= drop;
    this.legL.rotation.x -= a; this.legR.rotation.x -= a;
    this.kneeL.rotation.x += 2 * a; this.kneeR.rotation.x += 2 * a;
  }
  // Tilt the torso at the hips without moving the feet.
  lean(a) { this.spin.rotation.x += a; this.legL.rotation.x -= a; this.legR.rotation.x -= a; }
  // One knee down: left foot planted ahead, right knee on the floor. k: 0..1.
  kneel(k) {
    this.spin.position.y = HIP - 0.45 * k;
    this.legL.rotation.x = -1.45 * k; this.kneeL.rotation.x = 1.45 * k;
    this.legR.rotation.x = 0.05 * k; this.kneeR.rotation.x = 1.5 * k;
  }
  // Moving with weight (visual only): the body tips forward as it speeds up, back as it brakes, and leans into turns.
  weightLean(vx, vz, yaw, dt) {
    if (!(dt > 0)) return;
    const W = ANIM_SETTINGS.weight, fwd = vx * Math.sin(yaw) + vz * Math.cos(yaw);
    const acc = this.leanFwd === null ? 0 : (fwd - this.leanFwd) / dt, turn = this.leanYaw === null ? 0 : angDiff(yaw, this.leanYaw) / dt;
    this.leanFwd = fwd; this.leanYaw = yaw;
    const k = 1 - Math.exp(-W.rate * dt);
    this.leanF += (clamp(acc * W.accel + fwd * W.speed, -W.max, W.max) - this.leanF) * k;
    this.leanS += (clamp(turn * Math.abs(fwd) * W.turn, -W.max, W.max) - this.leanS) * k;
    this.tip.rotation.x += this.leanF; this.tip.rotation.z += this.leanS;
  }
  // Weapon trails the body's turning and movement slightly (visual only).
  applyLag(yaw, speed, dt) {
    if (this.lastYaw === null || dt <= 0) { this.lastYaw = yaw; return; }
    const angVel = angDiff(yaw, this.lastYaw) / dt;
    this.lastYaw = yaw;
    const k = 1 - Math.exp(-10 * dt);
    this.lag += (clamp(-angVel * 0.07, -0.45, 0.45) - this.lag) * k;
    this.lagPitch += (clamp(speed * 0.035, 0, 0.25) - this.lagPitch) * k;
    this.weapon.rotation.y += this.lag; this.weapon.rotation.x += this.lagPitch;
  }
  // A two-handed haft (a model's `grip`, pass 53). The key poses say where the haft points, in the chest's heading
  // (haftNow: pitch, 0 level ahead and -1.57 straight up; yaw, + to the body's left; roll, the head's turn round the haft),
  // not as a weapon-bone angle on the end of the arm. The haft lies where the right fist holds it; if the left hand
  // could not reach it there, the right fist brings it in toward her (a reach of its own); the left hand closes on it at
  // the place nearest the left shoulder (within grip.span, never on the right fist: hands slide along a haft); each
  // forearm turns so its fist closes round the haft. w: how much of all this applies (0 leaves the pose as drawn);
  // gripW (the key poses' `grip`) how much the left hand holds on. Visual only; allocates nothing.
  holdHaft(w) {
    this.weapon.position.copy(this.gripWrist);
    if (!(w > 0.001)) return;
    const T = HAFT_TMP, G = this.grip, H = this.haftNow, gw = this.gripW * w;
    this.root.updateMatrixWorld(true);
    const me = this.chest.matrixWorld.elements, heading = Math.atan2(me[8], me[10]);   // where the chest faces
    T.eu.set(H[0], heading + H[1], H[2], 'YXZ'); T.qh.setFromEuler(T.eu);             // the haft in the world
    this.chest.getWorldQuaternion(T.q2).invert();
    T.n.set(0, 0, 1).applyQuaternion(T.qh).applyQuaternion(T.q2);                       // ... its direction, in the chest's frame
    const b = this.elbowL.position.length() + G.fist, reach = (this.elbowL.position.length() + b) * 0.96;
    if (gw > 0.001) {   // the right fist brings the haft in to where the left hand can reach it
      this.weapon.getWorldPosition(T.f); this.chest.worldToLocal(T.f);
      const z = this.gripPlace(T.f, this.armL.position);
      T.p.copy(T.f).addScaledVector(T.n, z).sub(this.armL.position);                    // the left shoulder to its place on the haft
      const far = T.p.length();
      if (far > reach) {
        T.f.addScaledVector(T.p, -(far - reach) / far);
        this.reachArm(this.armR, this.elbowR, this.weapon.position.length(), T.f, POLE_R, gw); this.elbowR.updateMatrixWorld(true);
      }
    }
    // The right fist turns round the forearm (at most a quarter turn either way) so its grip lines up with the haft.
    this.elbowR.getWorldQuaternion(T.q2); T.v.set(0, 0, 1).applyQuaternion(T.qh).applyQuaternion(T.q2.invert());
    T.qt.setFromAxisAngle(Y_AXIS, quarterTurn(Math.atan2(T.v.x, T.v.z)) * w); this.elbowR.quaternion.multiply(T.qt); this.elbowR.updateMatrixWorld(true);
    this.elbowR.getWorldQuaternion(T.q2); T.q2.invert().multiply(T.qh);
    this.weapon.quaternion.slerp(T.q2, w);
    // ... and the haft runs through the middle of the fist, whichever way it is turned (the baked haft lies grip.y off the wrist).
    const wl = this.gripWrist.length();
    T.d.set(0, G.y, 0).applyQuaternion(this.weapon.quaternion);
    T.e.copy(this.gripWrist).multiplyScalar((wl + G.fist) / wl).sub(T.d);
    this.weapon.position.lerp(T.e, w); this.weapon.updateMatrixWorld(true);
    if (gw < 0.001) return;
    // The left hand: its place on the haft, in the chest's frame, and a shoulder-elbow-palm reach to it.
    this.weapon.getWorldPosition(T.f); this.chest.worldToLocal(T.f);
    this.gripZ = this.gripPlace(T.f, this.armL.position);
    T.h.set(0, G.y, this.gripZ); this.weapon.localToWorld(T.h); this.chest.worldToLocal(T.h);
    const bend = this.reachArm(this.armL, this.elbowL, b, T.h, POLE_L, gw);
    // The left fist turns round the forearm, as the right, so the haft runs through it.
    T.v.copy(T.n).applyQuaternion(T.q2.copy(T.q).invert()).applyAxisAngle(T.e.set(1, 0, 0), bend);   // the haft, in the forearm's frame before its turn
    const r = this.elbowL.rotation; r.y = lerp(r.y, quarterTurn(Math.atan2(T.v.x, T.v.z)), gw);
  }
  // Where the left hand holds the haft: along it from the right fist (at f, chest frame; direction HAFT_TMP.n), the place
  // nearest the left shoulder s, within grip.span and at least grip.gap from the fist.
  gripPlace(f, s) {
    const G = this.grip;
    let z = clamp(HAFT_TMP.e.copy(s).sub(f).dot(HAFT_TMP.n), G.span[0], G.span[1]);
    if (Math.abs(z) < G.gap) z = z < 0 && G.span[0] < -G.gap ? -G.gap : G.gap;
    return z;
  }
  // A two-bone reach (chest frame): turns `arm` and bends `elbow` (about x) so the point `len` down the forearm lies at
  // `target`, the elbow toward `pole`; w of the way from the pose as drawn. Leaves the arm's turn in HAFT_TMP.q; returns the bend.
  reachArm(arm, elbow, len, target, pole, w) {
    const T = HAFT_TMP, a = elbow.position.length(), b = len;
    T.d.copy(target).sub(arm.position);
    const dist = clamp(T.d.length(), Math.abs(a - b) + 1e-3, (a + b) * 0.999);
    const bend = Math.PI - Math.acos(clamp((a * a + b * b - dist * dist) / (2 * a * b), -1, 1));
    T.v.set(0, -a - b * Math.cos(bend), b * Math.sin(bend)).normalize();                 // the end, so bent, in the arm's frame
    T.d.normalize(); T.q.setFromUnitVectors(T.v, T.d);
    T.e.set(0, -1, 0).applyQuaternion(T.q); T.e.addScaledVector(T.d, -T.e.dot(T.d));   // the elbow ...
    T.v.copy(pole).addScaledVector(T.d, -pole.dot(T.d));                                 // ... turned round the reach to the pole
    if (T.e.lengthSq() > 1e-6 && T.v.lengthSq() > 1e-6) {
      T.qt.setFromAxisAngle(T.d, Math.atan2(T.d.dot(T.p.crossVectors(T.e, T.v)), T.e.dot(T.v))); T.q.premultiply(T.qt);
    }
    arm.quaternion.slerp(T.q, w);
    const r = elbow.rotation; r.set(lerp(r.x, -bend, w), r.y * (1 - w), r.z * (1 - w));
    return bend;
  }
  setTint(color, k) { for (const m of this.bodyMats) m.emissive.copy(color).multiplyScalar(k); }
  // tell: the blow coming is another part's (a hit's `tell`: 'shield', or a name in the model's `tells`), so the halo
  // shows there instead of on the weapon, and the weapon stays dark.
  setWarning(k, color = WARN_COLOR, tell = null) {
    const S = tell && this.tellGlows ? this.tellGlows[tell] || null : null, kw = S ? 0 : k;
    this.weaponMat.color.copy(this.weaponBase).lerp(color, kw);
    this.weaponMat.emissive.copy(color).multiplyScalar(kw * 1.6);
    if (this.weaponGlow) this.weaponMat.emissive.add(this.weaponGlow);   // a glowing blade look (js/crate-screen.js)
    const G = color === WARN_COLOR ? CONFIG.VISUALS.windupGlow : CONFIG.VISUALS.rollOnlyGlow;
    this.warnGlow.material.color.setHex(G.color).multiplyScalar(G.boost);
    if (this.tellGlows) for (const n in this.tellGlows) {
      const g = this.tellGlows[n]; g.material.color.copy(this.warnGlow.material.color);
      g.visible = g === S && k > 0.002; g.material.opacity = g === S ? k * CONFIG.VISUALS.windupGlow.opacity : 0;
    }
    this.setGlow(kw);
  }
  setFlash(k) {
    this.weaponMat.color.copy(this.weaponBase).lerp(HIT_COLOR, clamp(k, 0, 1));
    this.weaponMat.emissive.copy(HIT_COLOR).multiplyScalar(k * 2.5);
    if (this.weaponGlow) this.weaponMat.emissive.add(this.weaponGlow);
    this.setGlow(0);
    if (this.tellGlows) for (const n in this.tellGlows) this.tellGlows[n].visible = false;
  }
  setGlow(k) { this.warnGlow.visible = k > 0.002; this.warnGlow.material.opacity = k * CONFIG.VISUALS.windupGlow.opacity; }
  setOpacity(a) {
    this.alphaK = a;
    if (this.dissolve) { this.dissolve.value = 1 - a; for (const m of this.fadeMats) m.opacity = a; }   // a modelled body breaks up into ash instead of fading
    else for (const m of this.mats) m.opacity = a;
    if (this.glows) for (const g of this.glows) g.mat.opacity = g.base * a;
    this.shadow.material.opacity = 0.45 * a;
    if (this.embers) this.embers.visible = a > 0.5;   // a dying weapon's embers go out
  }
  // ground: the floor under the body (its shadow lies there and shrinks with height); -Infinity over a pit.
  place(x, y, z, yaw, ground = 0) {
    this.root.position.set(x, y, z); this.root.rotation.y = yaw;
    this.shadow.visible = ground > -Infinity;
    const s = this.shadowRadius * clamp(1 - (y - ground) * 0.25, 0.4, 1);
    this.shadow.position.set(x, ground + 0.03, z); this.shadow.scale.set(s, s, 1);
  }
  dispose() {
    scene.remove(this.root, this.shadow);
    this.root.traverse(o => { if (o.isMesh && !o.geometry.userData.shared) o.geometry.dispose(); });
    for (const m of this.mats) m.dispose();
    this.shadow.material.dispose(); this.warnGlow.material.dispose(); if (this.tellGlows) for (const n in this.tellGlows) this.tellGlows[n].material.dispose();
    if (this.glows) for (const g of this.glows) g.mat.dispose();
    if (this.skeleton) this.skeleton.dispose();
    if (this.glint) this.glint.sprite.material.dispose();
    if (this.aura) this.aura.sprite.material.dispose();
    if (this.modelEntry) { KIT.release(this.modelEntry); this.modelEntry = null; }   // its model cache entry (js/bodykit.js)
  }
}
