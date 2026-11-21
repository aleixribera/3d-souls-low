'use strict';
// ============================================================================
// Dash afterimages (pass 91, PLAN.md item 3c, track A; ANIM_SETTINGS.afterimage)
// ============================================================================
// The player's dash leaves pale copies of the body behind it, one every `gap` m of travel, each frozen in the pose it
// was in and fading over `life` s (the anime and Stellar Blade dash). A perfect dodge leaves brighter, longer ones.
// Drawing only: a render hook reads where the body is and copies its bones onto pooled figures made at load (warmed
// with the other bodies), so nothing is allocated per frame and no game state changes. Reduced motion: one per dash.
const afterimage = (() => {
  const pool = [], hooks = { tint: null };
  let wasDash = false, wasFlash = false, fresh = false, stepArmed = false, stepping = false, made = 0, lastX = 0, lastZ = 0, dodgeArmed = false, perfect = false;
  function makePool() {
    if (pool.length) return;
    for (let i = 0; i < ANIM_SETTINGS.afterimage.pool; i++) {
      const rig = new Rig(PLAYER_DEF.look);
      const mat = rigidSkinning(ghostMaterial());
      rig.root.traverse(o => {
        if (o.isSkinnedMesh) { o.material = mat; o.castShadow = o.receiveShadow = false; o.renderOrder = 2; }
        else if (o.isMesh || o.isSprite || o.isPoints || o.isLine) o.visible = false;   // eyes, glows, glints: the body alone
      });
      rig.root.visible = rig.shadow.visible = false;
      pool.push({ rig, mat, age: 0, life: 1, peak: 0 });
    }
  }
  // A pale figure lit at its edges (a rim, the energy outline of an anime afterimage) and faint across its middle, so a
  // copy over another, or over the body, never turns into a solid white shape.
  function ghostMaterial() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    mat.onBeforeCompile = sh => {
      if (!sh.vertexShader.includes('#include <project_vertex>') || !sh.fragmentShader.includes('#include <opaque_fragment>')) return;
      sh.vertexShader = 'varying vec3 vGhostN, vGhostV;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_SKINNING
          vGhostN = transformedNormal;
        #else
          vGhostN = normalMatrix * objectNormal;
        #endif
        vGhostV = -mvPosition.xyz;`);
      sh.fragmentShader = 'varying vec3 vGhostN, vGhostV;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `float ghostRim = 1.0 - abs(dot(normalize(vGhostN), normalize(vGhostV)));
        diffuseColor.a *= ${ANIM_SETTINGS.afterimage.core.toFixed(3)} + ${(1 - ANIM_SETTINGS.afterimage.core).toFixed(3)} * ghostRim * ghostRim;
        #include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => 'afterimageRim';
    return mat;
  }
  // Freeze one copy of the player's body where it stands now (the oldest copy is reused when all are showing).
  function spawn(src, style) {
    let g = pool[0];
    for (const q of pool) { if (!q.rig.root.visible) { g = q; break; } if (q.age / q.life > g.age / g.life) g = q; }
    const a = src.skeleton.bones, b = g.rig.skeleton && g.rig.skeleton.bones;
    if (!b || a.length !== b.length) return;
    g.rig.root.position.copy(src.root.position); g.rig.root.quaternion.copy(src.root.quaternion); g.rig.root.scale.copy(src.root.scale);
    for (let i = 0; i < a.length; i++) { b[i].position.copy(a[i].position); b[i].quaternion.copy(a[i].quaternion); b[i].scale.copy(a[i].scale); }
    const tint = hooks.tint && hooks.tint(Game.player);   // a rare's blue copies (js/rare-fx.js)
    g.mat.color.setHex(tint ?? style.color); g.peak = style.opacity * (reducedMotion() ? 0.7 : 1);
    g.age = 0; g.life = style.life; g.mat.opacity = 0; g.rig.root.visible = true;
  }
  // Never in the way of the body: a copy still inside it fades in as the body leaves (so the dash's first frames show the
  // body, not a copy), and a copy nearer the camera than the body that covers it on screen (a dash straight away from
  // the camera) stays faint, `inLine` of its brightness. Covering: the two chests closer in view angle than the two
  // bodies' sizes (`cover` m each) at their distances.
  const toG = new THREE.Vector3(), toP = new THREE.Vector3();
  function near(g, r) {
    if (!r || !r.root) return 1;
    const A = ANIM_SETTINGS.afterimage, C = A.clear, at = g.rig.root.position, body = r.root.position;
    const out = clamp((Math.hypot(at.x - body.x, at.z - body.z) - C[0]) / (C[1] - C[0]), 0, 1);
    toG.set(at.x, at.y + 1, at.z).sub(camera.position); toP.set(body.x, body.y + 1, body.z).sub(camera.position);
    const dG = toG.length(), dP = toP.length();
    if (dG < 1e-3 || dP < 1e-3 || dG >= dP) return out;   // behind the body: the body hides it where they overlap
    const apart = toG.angleTo(toP) / (A.cover / dG + A.cover / dP);   // under 1: on screen they overlap
    return out * lerp(A.inLine, 1, clamp(apart * 2 - 1, 0, 1));
  }
  function render(game) {
    if (!pool.length) return;
    const dt = effectSlots.dt(), A = ANIM_SETTINGS.afterimage, p = game.player, r = p && p.rig;
    for (const g of pool) {
      if (!g.rig.root.visible) continue;
      g.age += dt;
      const k = 1 - g.age / g.life;
      if (k <= 0) { g.rig.root.visible = false; continue; }
      g.mat.opacity = g.peak * k * k * near(g, r);
    }
    // A counter's flash step (pass 95: the body `phasing` through the foe) leaves copies too, the plain ones: the bright
    // ones bloom over the foe the step passes through.
    const flash = !!(r && r.skeleton && p.phasing && game.mode === 'play');
    const dash = flash || !!(r && r.skeleton && p.state === PS.ROLL && game.mode === 'play');
    if (dash) {
      const x = r.root.position.x, z = r.root.position.z, cap = reducedMotion() ? 1 : stepping ? A.finisher.perStep : A.perDash[visuals.quality().fxBudget] ?? A.perDash.normal;
      if (!wasDash || fresh || (flash && !wasFlash)) { made = 0; perfect = false; stepping = stepArmed; stepArmed = false; fresh = false; if (flash) { spawn(r, stepping ? A.finisher : A); made++; lastX = x; lastZ = z; } }
      if (dodgeArmed) { dodgeArmed = false; perfect = true; spawn(r, A.dodge); made++; lastX = x; lastZ = z; }
      else if (made < cap && (made === 0 ? p.stateTime >= ANIM_SETTINGS.dash.rise : Math.hypot(x - lastX, z - lastZ) >= A.gap)) {   // the first once the lunge is struck
        spawn(r, perfect ? A.dodge : stepping ? A.finisher : A); made++; lastX = x; lastZ = z;
      }
    }
    if (!dash) dodgeArmed = stepping = false;
    wasDash = dash; wasFlash = flash;
  }
  function clear() { for (const g of pool) g.rig.root.visible = false; wasDash = wasFlash = fresh = dodgeArmed = stepArmed = false; }
  return {
    attach() {
      makePool();
      Game.renderHooks.push(render);
      visuals.hooks.stage.push(clear);
      events.on('dash', d => { if (d.player === Game.player) fresh = true; });   // a dash straight out of the last one starts afresh
      // Pass 103: each flash step of a Finishing Blow starts afresh with the bright copies, a trail of them through the foe
      events.on('finisherStep', d => { if (d.player === Game.player) { fresh = true; stepArmed = true; } });
      events.on('dodge', d => { if (d.player === Game.player && d.player.state === PS.ROLL) dodgeArmed = true; });
    },
    clear, hooks,
    get showing() { let n = 0; for (const g of pool) if (g.rig.root.visible) n++; return n; },
  };
})();
