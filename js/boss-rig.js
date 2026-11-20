'use strict';
// ============================================================================
// Boss v2 Arbitrary Skinned Rig & Hybrid Clip Animator
// ============================================================================
// Drives real Blender armatures with 4-bone smooth vertex skinning (THREE.SkinnedMesh)
// and quantized Blender animation clips + hybrid JS additive pose overrides.
// Coexists cleanly with legacy humanoid `Rig` (v1 bosses are untouched).

const _v2Q0 = new THREE.Quaternion(), _v2Q1 = new THREE.Quaternion(), _v2Qt = new THREE.Quaternion();
const _v2V0 = new THREE.Vector3(), _v2V1 = new THREE.Vector3(), _v2Vt = new THREE.Vector3();
const _v2Eu = new THREE.Euler();

function sampleTrackQuat(tr, t, out) {
  const ts = tr.times, vs = tr.values, n = ts.length;
  if (n === 1 || t <= ts[0]) { out.set(vs[0], vs[1], vs[2], vs[3]).normalize(); return; }
  if (t >= ts[n - 1]) { const o = (n - 1) * 4; out.set(vs[o], vs[o + 1], vs[o + 2], vs[o + 3]).normalize(); return; }
  let hi = 1;
  while (hi < n - 1 && ts[hi] < t) hi++;
  const lo = hi - 1, f = (t - ts[lo]) / Math.max(1e-5, ts[hi] - ts[lo]);
  _v2Q0.set(vs[lo * 4], vs[lo * 4 + 1], vs[lo * 4 + 2], vs[lo * 4 + 3]);
  _v2Q1.set(vs[hi * 4], vs[hi * 4 + 1], vs[hi * 4 + 2], vs[hi * 4 + 3]);
  out.slerpQuaternions(_v2Q0, _v2Q1, f);
}

function sampleTrackVec3(tr, t, out) {
  const ts = tr.times, vs = tr.values, n = ts.length;
  if (n === 1 || t <= ts[0]) { out.set(vs[0], vs[1], vs[2]); return; }
  if (t >= ts[n - 1]) { const o = (n - 1) * 3; out.set(vs[o], vs[o + 1], vs[o + 2]); return; }
  let hi = 1;
  while (hi < n - 1 && ts[hi] < t) hi++;
  const lo = hi - 1, f = (t - ts[lo]) / Math.max(1e-5, ts[hi] - ts[lo]);
  _v2V0.set(vs[lo * 3], vs[lo * 3 + 1], vs[lo * 3 + 2]);
  _v2V1.set(vs[hi * 3], vs[hi * 3 + 1], vs[hi * 3 + 2]);
  out.lerpVectors(_v2V0, _v2V1, f);
}

class SkinnedBossRig {
  constructor(def) {
    this.isSkinnedV2 = true;
    this.def = def;
    this.modelDef = MODEL_DEFS[def.model];
    const M = this.modelDef;
    const baked = decodeBakedRig(M.rigId, M.tile ?? 0.5);
    this.baked = baked;
    this.scale = def.scale || 1;
    this.fit = 1;
    this.alphaK = 1;
    this.dissolve = { value: 0 };
    this.revealed = false;

    this.root = new THREE.Group();
    this.tip = new THREE.Group();
    this.root.add(this.tip);
    this.root.scale.setScalar(this.scale);

    // Build arbitrary bone hierarchy from Blender skin
    this.bones = {};
    this.boneList = [];
    this.restPos = [];
    this.restQuat = [];
    this.restScale = [];
    const invBinds = [];

    for (let i = 0; i < baked.bones.length; i++) {
      const bd = baked.bones[i];
      const bone = new THREE.Bone();
      bone.name = bd.name;
      if (bd.p) bone.position.set(bd.p[0], bd.p[1], bd.p[2]);
      if (bd.r) bone.quaternion.set(bd.r[0], bd.r[1], bd.r[2], bd.r[3]);
      if (bd.s) bone.scale.set(bd.s[0], bd.s[1], bd.s[2]);
      this.bones[bd.name] = bone;
      this.boneList.push(bone);
      this.restPos.push(bone.position.clone());
      this.restQuat.push(bone.quaternion.clone());
      this.restScale.push(bone.scale.clone());
      const m = new THREE.Matrix4();
      if (bd.ibm && bd.ibm.length === 16) m.fromArray(bd.ibm);
      invBinds.push(m);
    }
    for (let i = 0; i < baked.bones.length; i++) {
      const p = baked.bones[i].parent;
      if (p >= 0 && this.boneList[p]) this.boneList[p].add(this.boneList[i]);
      else this.tip.add(this.boneList[i]);
    }
    this.skeleton = new THREE.Skeleton(this.boneList, invBinds);
    this.spin = this.bones.pelvis || this.boneList[0] || this.tip;
    this.chest = this.bones.chest || this.spin;
    this.head = this.bones.head || this.chest;
    this.weapon = this.bones[M.primarySocket || 'foreR2'] || this.chest;

    // Build per-slot materials (cloned per instance so flashes/dissolve/phase reveals are independent)
    this.mats = [];
    this.bodyMats = [];
    this.slotMeshes = {};
    this.hiddenSlots = new Set(M.hidden || []);
    const matBySlot = {};
    for (const [slot, spec] of Object.entries(M.materials || {})) {
      let mat;
      if (spec.glow != null) {
        mat = new THREE.MeshBasicMaterial({
          color: spec.glow, transparent: true, opacity: 1,
          side: spec.double ? THREE.DoubleSide : THREE.FrontSide,
        });
      } else {
        const opts = {
          color: spec.color ?? spec.tint ?? 0x555555,
          roughness: spec.roughness ?? 0.6,
          metalness: spec.metalness ?? 0.15,
          transparent: true,
          side: spec.double ? THREE.DoubleSide : THREE.FrontSide,
        };
        if (spec.tex && typeof TEXLIB !== 'undefined' && TEXLIB.get) {
          const tex = TEXLIB.get(spec.tex, { tint: spec.tint ?? 0xffffff, decay: spec.decay ?? 0.55, size: spec.size });
          if (tex && tex.map) { opts.map = tex.map; opts.color = 0xffffff; }
          if (tex && tex.rough) { opts.roughnessMap = tex.rough; opts.roughness = 1; }
          if (tex && tex.bump) { opts.bumpMap = tex.bump; opts.bumpScale = (tex.def?.bump || 1) * 0.025; }
        }
        mat = new THREE.MeshStandardMaterial(opts);
        addDissolve(mat, spec.rim ?? M.rim ?? 0.45, this.dissolve);
      }
      mat.userData.baseColor = mat.color.clone();
      mat.userData.baseEmissive = mat.emissive ? mat.emissive.clone() : null;
      matBySlot[slot] = mat;
      this.mats.push(mat);
      if (spec.glow == null) this.bodyMats.push(mat);
    }

    this.skinnedMeshes = [];
    for (const part of baked.meshes) {
      const mat = matBySlot[part.slot] || this.mats[0] || new THREE.MeshStandardMaterial({ color: 0x555555 });
      const sm = new THREE.SkinnedMesh(part.geo, mat);
      sm.castShadow = true;
      sm.receiveShadow = false;
      sm.frustumCulled = false;
      this.tip.add(sm);
      sm.bind(this.skeleton, new THREE.Matrix4());
      if (this.hiddenSlots.has(part.slot)) sm.visible = false;
      this.skinnedMeshes.push(sm);
      (this.slotMeshes[part.slot] || (this.slotMeshes[part.slot] = [])).push(sm);
    }

    // Named socket tell-glows (attach warning/parry glows to any bone!)
    this.tellGlows = {};
    this.tellGlowList = [];
    for (const [sockName, cfg] of Object.entries(M.sockets || {})) {
      const bone = this.bones[cfg.bone || sockName];
      if (!bone) continue;
      const g = makeWarnGlow();
      if (cfg.at) g.position.set(cfg.at[0], cfg.at[1], cfg.at[2]);
      g.userData.baseSize = cfg.size || 0.7;
      g.visible = false;
      bone.add(g);
      this.tellGlows[sockName] = g;
      this.tellGlowList.push(g);
    }
    this.warnGlow = this.tellGlows[M.primarySocket] || Object.values(this.tellGlows)[0] || makeWarnGlow();
    if (!this.warnGlow.parent) this.weapon.add(this.warnGlow);

    this.shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.48, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadowRadius = (M.shadowRadius || 1.65) * this.scale;
    scene.add(this.root, this.shadow);

    // Hybrid Clip Animator state
    this.curClip = 'idle';
    this.curTime = 0;
    this.prevClip = null;
    this.prevTime = 0;
    this.blendT = 1;
    this.blendDur = 0.16;
    this._alt = 0;
    this._prevQuats = this.boneList.map(b => b.quaternion.clone());
    this._prevPos = this.boneList.map(b => b.position.clone());
  }

  reset() {
    for (let i = 0; i < this.boneList.length; i++) {
      this.boneList[i].position.copy(this.restPos[i]);
      this.boneList[i].quaternion.copy(this.restQuat[i]);
      this.boneList[i].scale.copy(this.restScale[i]);
    }
    this.tip.position.set(0, 0, 0);
    this.tip.rotation.set(0, 0, 0);
  }

  place(x, y, z, yaw, ground = 0) {
    const alt = this._alt || 0;
    this.root.position.set(x, y + alt, z);
    this.root.rotation.y = yaw;
    this.shadow.visible = ground > -Infinity;
    const h = (y + alt) - ground;
    const s = this.shadowRadius * clamp(1 - h * 0.12, 0.45, 1.1);
    this.shadow.position.set(x, ground + 0.03, z);
    this.shadow.scale.set(s, s, 1);
    this.shadow.material.opacity = 0.48 * clamp(1 - h * 0.14, 0.18, 1) * this.alphaK;
  }

  setPose(x, y, z, yaw, altitude = 0) {
    this._alt = altitude;
    this.place(x, y, z, yaw, y);
  }

  setReveal(show) {
    if (this.revealed === show) return;
    this.revealed = show;
    for (const slot of this.hiddenSlots) {
      for (const m of this.slotMeshes[slot] || []) m.visible = show;
    }
  }

  setTint(color, k) { this.flash(color, k); }
  setWarning() {}
  setFlash() {}
  setGlow() {}
  setOpacity(a) { this.setAlpha(a); }
  applyLag() {}
  weightLean() {}
  settle() {}

  flash(color, k) {
    for (const m of this.bodyMats) {
      if (!m.emissive) continue;
      if (k > 0.01) m.emissive.copy(color).multiplyScalar(k);
      else if (m.userData.baseEmissive) m.emissive.copy(m.userData.baseEmissive);
      else m.emissive.setHex(0x000000);
    }
  }

  setAlpha(a) {
    this.alphaK = a;
    for (const m of this.mats) m.opacity = a;
  }

  socketWorldPos(name, out) {
    const cfg = this.modelDef.sockets && this.modelDef.sockets[name];
    const bone = this.bones[(cfg && cfg.bone) || name] || this.weapon;
    this.root.updateMatrixWorld(true);
    if (cfg && cfg.at) out.set(cfg.at[0], cfg.at[1], cfg.at[2]).applyMatrix4(bone.matrixWorld);
    else bone.getWorldPosition(out);
    return out;
  }

  _switchClip(name, blend = 0.16) {
    if (this.curClip === name || !this.baked.clips[name]) return;
    for (let i = 0; i < this.boneList.length; i++) {
      this._prevQuats[i].copy(this.boneList[i].quaternion);
      this._prevPos[i].copy(this.boneList[i].position);
    }
    this.prevClip = this.curClip;
    this.prevTime = this.curTime;
    this.curClip = name;
    this.curTime = 0;
    this.blendDur = Math.max(0.04, blend);
    this.blendT = 0;
  }

  _applyClip(clipName, time, blendW) {
    const clip = this.baked.clips[clipName];
    if (!clip) return;
    const t = clamp(time, 0, clip.duration);
    // Start from rest pose
    for (let i = 0; i < this.boneList.length; i++) {
      this.boneList[i].position.copy(this.restPos[i]);
      this.boneList[i].quaternion.copy(this.restQuat[i]);
    }
    for (const tr of clip.tracks) {
      const b = this.boneList[tr.bone];
      if (!b) continue;
      if (tr.kind === 'r') {
        sampleTrackQuat(tr, t, _v2Qt);
        b.quaternion.copy(_v2Qt);
      } else if (tr.kind === 'p') {
        sampleTrackVec3(tr, t, _v2Vt);
        b.position.copy(_v2Vt);
      }
    }
    if (blendW < 1) {
      for (let i = 0; i < this.boneList.length; i++) {
        this.boneList[i].quaternion.slerpQuaternions(this._prevQuats[i], this.boneList[i].quaternion, blendW);
        this.boneList[i].position.lerpVectors(this._prevPos[i], this.boneList[i].position, blendW);
      }
    }
  }

  // Called once per render frame by Enemy.draw()
  updateAnimation(e, dt, target) {
    const alt = e.v2 ? e.v2.altitude : 0;
    const stance = e.v2 ? e.v2.stance : 'ground';
    const clips = this.baked.clips;

    // 1. Choose clip & compute phase-locked time
    let wantClip = stance === 'airborne' && clips.hover ? 'hover' : 'idle';
    let loop = true;
    let mappedTime = null;

    if (e.state === ES.DEAD) {
      wantClip = clips.death ? 'death' : 'idle';
      loop = false;
      mappedTime = Math.min(e.stateTime, clips[wantClip]?.duration || 1);
    } else if (e.state === ES.STAGGER || e.state === ES.PARRIED || e.state === ES.EXECUTED) {
      wantClip = clips.stagger ? 'stagger' : 'idle';
      loop = false;
      mappedTime = Math.min(e.stateTime * 1.1, clips[wantClip]?.duration || 0.8);
    } else if (e.state === ES.WINDUP || e.state === ES.ACTIVE || e.state === ES.RECOVER) {
      const atk = e.attack;
      const hit = atk && atk.hits && atk.hits[e.hitIndex || 0];
      const clipKey = (hit && hit.clip) || (atk && atk.clip);
      if (clipKey && clips[clipKey]) {
        wantClip = clipKey;
        loop = false;
        const dur = clips[wantClip].duration || 1;
        const marks = (hit && hit.clipMarks) || atk.clipMarks || { windup: 0.45, active: 0.68, recover: 1.0 };
        if (e.state === ES.WINDUP && hit) {
          const p = clamp(e.stateTime / Math.max(0.05, hit.startup), 0, 1);
          mappedTime = lerp(0, dur * marks.windup, p);
        } else if (e.state === ES.ACTIVE && hit) {
          const p = clamp(e.stateTime / Math.max(0.05, hit.active + (hit.follow || 0)), 0, 1);
          mappedTime = lerp(dur * marks.windup, dur * marks.active, p);
        } else {
          const p = clamp(e.stateTime / Math.max(0.05, atk.recovery || 0.5), 0, 1);
          mappedTime = lerp(dur * marks.active, dur * marks.recover, p);
        }
      }
    } else if (e.state === ES.CHASE || e.state === ES.RETREAT) {
      const speed = Math.hypot(e.vx || 0, e.vz || 0);
      if (stance === 'airborne' && clips.hover) wantClip = 'hover';
      else if (speed > 0.35 && clips.prowl) wantClip = 'prowl';
      else wantClip = 'idle';
    }

    this._switchClip(wantClip, e.state === ES.ACTIVE ? 0.06 : 0.15);
    if (this.blendT < 1) this.blendT = Math.min(1, this.blendT + dt / this.blendDur);

    if (mappedTime !== null) {
      this.curTime = mappedTime;
    } else {
      const dur = clips[this.curClip]?.duration || 1;
      const rate = (e.state === ES.CHASE && wantClip === 'prowl') ? clamp(Math.hypot(e.vx || 0, e.vz || 0) / 3.2, 0.7, 1.8) : 1;
      this.curTime = loop ? (this.curTime + dt * rate) % dur : Math.min(dur, this.curTime + dt);
    }

    const bw = this.blendT * this.blendT * (3 - 2 * this.blendT);
    this._applyClip(this.curClip, this.curTime, bw);

    // 2. Hybrid JS additive pose layer: subtle head/neck tracking toward target + phase-2 wing flare
    if (target && e.state !== ES.DEAD && this.bones.neck1 && this.bones.head) {
      const toTarget = Math.atan2(target.x - e.x, target.z - e.z);
      const rel = clamp(angDiff(toTarget, e.yaw), -0.85, 0.85);
      _v2Eu.set(0, rel * 0.35, 0);
      _v2Qt.setFromEuler(_v2Eu);
      this.bones.neck1.quaternion.multiply(_v2Qt);
      _v2Eu.set(0, rel * 0.45, 0);
      _v2Qt.setFromEuler(_v2Eu);
      this.bones.head.quaternion.multiply(_v2Qt);
    }
    // Phase 2 visual reveal (e.g. blazing cinder wing blades)
    const isP2 = e.phase > 0;
    this.setReveal(isP2);

    // 3. Per-socket wind-up / parry tell glows (cached array, zero allocs)
    for (let i = 0; i < this.tellGlowList.length; i++) this.tellGlowList[i].visible = false;
    if (e.state === ES.WINDUP && e.attack) {
      const hit = e.attack.hits && e.attack.hits[e.hitIndex || 0];
      const sock = (hit && hit.tell) || e.attack.tell || this.modelDef.primarySocket;
      const g = this.tellGlows[sock] || this.warnGlow;
      if (g) {
        const p = hit ? clamp(e.stateTime / Math.max(0.05, hit.startup), 0, 1) : 0.5;
        const unparry = !!(e.attack.rollOnly || e.attack.noParry);
        g.visible = p > 0.15;
        g.material.color.copy(unparry ? ROLL_ONLY_COLOR : WARN_COLOR);
        g.material.opacity = clamp((p - 0.15) * 1.15, 0, 0.92);
        const sz = (g.userData.baseSize || 0.7) * (0.65 + 0.75 * p);
        g.scale.setScalar(sz);
      }
    }

    // 4. Hit flash (reads Enemy.tint) & dissolve
    if (e.tint > 0.01) this.flash(HIT_COLOR, Math.min(1, e.tint * 0.8));
    else this.flash(HIT_COLOR, 0);
    if (e.state === ES.DEAD && e.stateTime > 1.2) {
      this.dissolve.value = clamp((e.stateTime - 1.2) / 1.8, 0, 1);
    } else {
      this.dissolve.value = 0;
    }

    // Apply Boss v2 altitude on top of the interpolated position set by Character.render -> rig.place()
    const prevAlt = this._alt || 0;
    this._alt = alt;
    if (Math.abs(alt - prevAlt) > 1e-4) this.root.position.y += (alt - prevAlt);
  }

  dispose() {
    scene.remove(this.root, this.shadow);
    for (const m of this.mats) m.dispose();
    this.shadow.material.dispose();
    if (this.warnGlow && this.warnGlow.material) this.warnGlow.material.dispose();
    for (const g of Object.values(this.tellGlows)) if (g && g !== this.warnGlow && g.material) g.material.dispose();
    if (this.skeleton) this.skeleton.dispose();
  }
}
