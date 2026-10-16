'use strict';
const WARN_COLOR = new THREE.Color(0xff3a1a);
const ROLL_ONLY_COLOR = new THREE.Color(CONFIG.VISUALS.rollOnlyGlow.color);   // wind-up of an attack that cannot be blocked or parried
const HURT_COLOR = new THREE.Color(0xff1010);
const HIT_COLOR = new THREE.Color(0xffffff);
const CRACK_COLOR = new THREE.Color(0xffc060);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const shadowGeo = new THREE.CircleGeometry(1, 20);

// Humanoid built from primitives. Local +Z is forward; the weapon arm is on -X.
const HIP = 0.95, LEG_SEG = 0.45;   // hip pivot height; thigh and shin length
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
    scene.add(this.root, this.shadow);
  }
  reset() {
    this.tip.rotation.set(0, 0, 0);
    this.spin.rotation.set(0, 0, 0); this.spin.scale.setScalar(1); this.spin.position.set(0, HIP, 0);
    this.head.rotation.set(0, 0, 0);
    this.legL.rotation.set(0, 0, 0); this.legR.rotation.set(0, 0, 0);
    this.kneeL.rotation.x = this.kneeR.rotation.x = 0; this.crouchDrop = 0;
    this.armL.rotation.set(-0.1, 0, 0); this.armR.rotation.set(-0.4, 0, 0);
    this.weapon.rotation.set(0.5, 0, 0);
    if (this.rest) for (const [bone, r] of this.rest) bone.rotation.set(r[0], r[1], r[2]);   // a model's resting posture
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
  setTint(color, k) { for (const m of this.bodyMats) m.emissive.copy(color).multiplyScalar(k); }
  setWarning(k, color = WARN_COLOR) {
    this.weaponMat.color.copy(this.weaponBase).lerp(color, k);
    this.weaponMat.emissive.copy(color).multiplyScalar(k * 1.6);
    const G = color === WARN_COLOR ? CONFIG.VISUALS.windupGlow : CONFIG.VISUALS.rollOnlyGlow;
    this.warnGlow.material.color.setHex(G.color).multiplyScalar(G.boost);
    this.setGlow(k);
  }
  setFlash(k) {
    this.weaponMat.color.copy(this.weaponBase).lerp(HIT_COLOR, clamp(k, 0, 1));
    this.weaponMat.emissive.copy(HIT_COLOR).multiplyScalar(k * 2.5);
    this.setGlow(0);
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
    this.shadow.material.dispose(); this.warnGlow.material.dispose();
    if (this.glows) for (const g of this.glows) g.mat.dispose();
    if (this.skeleton) this.skeleton.dispose();
    if (this.glint) this.glint.sprite.material.dispose();
    if (this.aura) this.aura.sprite.material.dispose();
  }
}
