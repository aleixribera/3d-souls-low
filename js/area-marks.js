'use strict';
// ============================================================================
// Area marks (pass 93): a ground area attack's whole reach on the floor from the start of its wind-up (drawing only)
// ============================================================================
// Every ground area hit (areaHit in js/enemy.js, CONFIG.area) shows where it will land before it lands: an expanding
// ring's whole band from its first to its last radius, a round burst's disc, a box's own rectangle. The mark appears as
// the wind-up starts (a later blow's as the one before it strikes), fills from the body outward as the strike nears,
// its edge brightens once the body has stopped turning, and it stays over the strike and fades `fade` s after. What
// the floor shows is what hits (js/combat.js Hitbox.overlaps, the same frame). A burrow is marked by its own heave
// (js/root-heave.js). One pooled flat mesh per live mark (`pool` of them); no lights, nothing allocated per frame.
const areaMarks = (() => {
  const C = VIS.areaMark;
  const frag = `uniform vec3 uColor; uniform float uOpacity, uShape, uIn, uOut, uHW, uHD, uFill, uLock;
uniform vec2 uC, uF; varying vec2 vW;
void main() {
  vec2 d = vW - uC;
  float lz = dot(d, uF), lx = dot(d, vec2(-uF.y, uF.x)), r = length(d), sd, g;
  if (uShape < 0.5) { sd = max(uIn - r, r - uOut); g = (r - uIn) / max(uOut - uIn, 0.01); }       // a ring's band
  else if (uShape < 1.5) { sd = r - uOut; g = r / max(uOut, 0.01); }                              // a round burst
  else { vec2 q = abs(vec2(lx, lz)) - vec2(uHW, uHD); sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); g = (lz + uHD) / max(2.0 * uHD, 0.01); }
  if (sd > 0.12) discard;
  float edge = 1.0 - smoothstep(0.0, 0.12, abs(sd));                                             // the line round it
  float inside = 1.0 - smoothstep(-0.02, 0.02, sd);
  float filled = inside * (1.0 - smoothstep(uFill - 0.02, uFill + 0.02, g));                      // the fill toward the strike
  float a = (edge * (0.55 + 0.4 * uLock) + inside * 0.1 + filled * 0.22) * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * (0.9 + 0.5 * edge * uLock), a);
}`;
  const vert = 'varying vec2 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const geo = new THREE.PlaneGeometry(2, 2);
  const pool = Array.from({ length: C.pool }, () => {
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2,
      uniforms: { uColor: { value: new THREE.Color(C.color) }, uOpacity: { value: 0 }, uShape: { value: 0 }, uIn: { value: 0 }, uOut: { value: 1 },
        uHW: { value: 1 }, uHD: { value: 1 }, uFill: { value: 0 }, uLock: { value: 0 }, uC: { value: new THREE.Vector2() }, uF: { value: new THREE.Vector2(0, 1) } } });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; m.frustumCulled = false; scene.add(m); pooledFx.push(m);
    return { m, e: null, a: null, i: -1, fade: 0, seen: 0 };
  });
  let frame = 0;
  // Show hit `i` of enemy `e`'s attack `a`, `fill` (0 to 1) of the way to its strike, its edge bright when `lock`.
  function show(e, a, i, fill, lock) {
    let S = null;
    for (const s of pool) if (s.e === e && s.a === a && s.i === i) { S = s; break; }
    if (!S) {   // a new mark: a free mesh, else the faintest fading one (never one still live; a full pool waits a frame)
      for (const s of pool) if (!s.e && (!S || !s.m.visible || (S.m.visible && s.fade < S.fade))) S = s;
      if (!S) return;
      S.e = e; S.a = a; S.i = i;
    }
    const h = a.hits[i], B = h.box || a.box, U = S.m.material.uniforms, sn = Math.sin(e.yaw), cs = Math.cos(e.yaw);
    const cx = e.x + sn * B.fwd, cz = e.z + cs * B.fwd, A = areaShape(a, h), ext = A.outer;   // the shape it hits (js/enemy.js)
    U.uShape.value = A.shape === 'ring' ? 0 : A.shape === 'round' ? 1 : 2; U.uIn.value = A.inner; U.uOut.value = A.outer; U.uHW.value = A.hw; U.uHD.value = A.hd;
    U.uC.value.set(cx, cz); U.uF.value.set(sn, cs); U.uFill.value = fill; U.uLock.value = lock ? 1 : 0; U.uOpacity.value = C.opacity;
    S.m.scale.set(ext + 0.2, ext + 0.2, 1); S.m.position.set(cx, e.y + 0.04, cz); S.m.visible = true;
    S.fade = C.fade; S.seen = frame;
  }
  const marked = (a, i) => i < a.hits.length && !a.hits[i].burrow && areaHit(a, i);
  function render(game) {
    const dt = effectSlots.dt(); frame++;
    for (const e of game.enemies) {
      const a = e.attack;
      if (!a || !a.hits || !e.alive() || (e.state !== ES.WINDUP && e.state !== ES.ACTIVE)) continue;
      const i = e.hitIndex, h = a.hits[i], prev = a.hits[i - 1];
      if (e.state === ES.WINDUP) {
        if (marked(a, i)) {
          const lead = prev ? prev.active + (prev.follow || 0) : 0;
          show(e, a, i, (lead + e.stateTime) / (lead + h.startup), !e.isTracking());
        }
      } else {
        if (marked(a, i) && e.stateTime < h.active) show(e, a, i, 1, true);   // over the strike itself
        if (marked(a, i + 1)) {   // the next blow's reach, from this one's strike
          const n = a.hits[i + 1];
          show(e, a, i + 1, e.stateTime / (h.active + (h.follow || 0) + n.startup), false);
        }
      }
    }
    // The rest fade where they ended: a struck mark, a cancelled wind-up, an enemy gone from the level.
    for (const S of pool) {
      if (!S.m.visible || S.seen === frame) continue;
      S.e = null; S.a = null; S.i = -1; S.fade -= dt;
      if (S.fade <= 0) { S.m.visible = false; continue; }
      const k = S.fade / C.fade;
      S.m.material.uniforms.uOpacity.value = C.opacity * k * k;
    }
  }
  Game.renderHooks.push(render);
  // For the tests: each mark on the floor now (its shape, outer reach, fill and whether its body has stopped turning).
  return { live: () => pool.filter(s => s.m.visible).map(s => { const U = s.m.material.uniforms; return { shape: ['ring', 'round', 'box'][U.uShape.value], out: U.uOut.value, hw: U.uHW.value, hd: U.uHD.value, fill: U.uFill.value, lock: !!U.uLock.value, live: !!s.e }; }) };
})();
