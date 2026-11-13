'use strict';
// ============================================================================
// Ring waves (pass 42): a ring hitbox drawn where it is (drawing only)
// ============================================================================
// An enemy hit whose box has a `ring` (an expanding shockwave along the floor, js/combat.js Hitbox) is drawn as a band on
// the floor at the hitbox's own radius and width, frame by frame, on every preset: what you see coming is what hits. Its
// outer edge is the brighter one (the side that reaches you first). After the hitbox closes the band fades out in
// `VIS.ringWave.fade` s. One pooled flat mesh per live ring (`pool` of them); no lights, nothing allocated per frame.
const ringWaves = (() => {
  const C = VIS.ringWave;
  const frag = `uniform vec3 uColor; uniform float uOpacity, uR, uW, uExtent; varying vec2 vP;
void main() {
  float d = length(vP) * uExtent, x = (d - uR) / max(uW, 0.01);        // -1 at the band's inner edge, +1 at its outer
  if (abs(x) > 1.15) discard;
  float band = 1.0 - smoothstep(0.85, 1.15, abs(x));
  float crest = exp(-(x - 0.8) * (x - 0.8) * 18.0);                    // the leading edge
  float a = (band * (0.35 + 0.35 * smoothstep(-1.0, 1.0, x)) + crest * 0.6) * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * (0.85 + 0.6 * crest), a);
}`;
  const vert = 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const geo = new THREE.PlaneGeometry(2, 2);
  const pool = Array.from({ length: C.pool }, () => {
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2,
      uniforms: { uColor: { value: new THREE.Color(C.color) }, uOpacity: { value: 0 }, uR: { value: 1 }, uW: { value: 0.5 }, uExtent: { value: 1 } } });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, hb: null, fade: 0, seen: 0 };
  });
  const place = (S, x, y, z, r, w, k) => {
    const U = S.m.material.uniforms, ext = r + w + 0.3;
    U.uR.value = r; U.uW.value = w; U.uExtent.value = ext; U.uOpacity.value = C.opacity * k;
    S.m.scale.set(ext, ext, 1); S.m.position.set(x, y + 0.05, z); S.m.visible = true;
  };
  let frame = 0;
  function render(game) {
    const dt = effectSlots.dt(); frame++;
    // Live rings: each follows its hitbox (stamped with this frame).
    for (const e of game.enemies) {
      const hb = e.hitbox;
      if (!hb || !hb.box.ring || e.state !== ES.ACTIVE || !e.alive()) continue;
      let S = null;
      for (const s of pool) if (s.hb === hb) { S = s; break; }
      if (!S) {   // a new ring: a free mesh, else the faintest fading one (never a live one)
        for (const s of pool) if (!s.hb && (!S || !s.m.visible || (S.m.visible && s.fade < S.fade))) S = s;
        if (!S) continue;
        S.hb = hb;
      }
      const B = hb.box, R = B.ring, r = lerp(R.from, R.to, clamp(e.stateTime / R.time, 0, 1));
      S.fade = C.fade; S.seen = frame;
      place(S, e.x + Math.sin(e.yaw) * B.fwd, e.y, e.z + Math.cos(e.yaw) * B.fwd, r, R.width / 2, 1);
    }
    // The rest fade where they ended: a closed hitbox, or an enemy gone from the level (a reload, a level change).
    for (const S of pool) {
      if (!S.m.visible || S.seen === frame) continue;
      S.hb = null; S.fade -= dt;
      if (S.fade <= 0) { S.m.visible = false; continue; }
      const U = S.m.material.uniforms, k = S.fade / C.fade;
      U.uOpacity.value = C.opacity * k * k; U.uR.value += dt * 2;
      const ext = U.uR.value + U.uW.value + 0.3; U.uExtent.value = ext; S.m.scale.set(ext, ext, 1);
    }
  }
  Game.renderHooks.push(render);
  return { live: () => pool.filter(s => s.m.visible).map(s => ({ r: s.m.material.uniforms.uR.value, w: s.m.material.uniforms.uW.value, live: !!s.hb })) };
})();
