'use strict';
// ============================================================================
// Binding circles (pass 42): a phase's `tether` drawn on the floor (drawing only)
// ============================================================================
// An enemy whose phase has a `tether` (js/enemy.js keepTether: it cannot go further than that from its home) shows the
// line it cannot cross: a ring of iron-blue links on the floor round its home, fading in as the fight starts. When the
// tether goes (the next phase has none: the Ringer steps over the line) the circle flashes and breaks, dust thrown up
// along it, and fades out; it fades too if the enemy dies. One slot per enemy (js/effect-slots.js), no lights.
const tethers = (() => {
  const C = VIS.tether;
  const frag = `uniform vec3 uColor; uniform float uOpacity, uR, uW, uExtent, uLinks, uBreak; varying vec2 vP;
void main() {
  float d = length(vP) * uExtent, x = (d - uR) / uW;
  if (abs(x) > 3.0) discard;
  float ang = atan(vP.y, vP.x) / 6.28318 * uLinks, f = fract(ang);
  float link = smoothstep(0.0, 0.12, f) * (1.0 - smoothstep(0.78, 0.9, f));    // a link, then a gap
  float line = (1.0 - smoothstep(0.55, 1.0, abs(x))) * (0.45 + 0.55 * link);
  float glow = exp(-x * x * 0.6) * 0.25;                                        // a faint halo either side
  float broken = 1.0 - uBreak * step(0.5, fract(ang * 0.37 + 0.2));             // breaking: every other run of links goes first
  float a = (line + glow) * broken * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * (1.0 + 0.6 * line), a);
}`;
  const vert = 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const geo = new THREE.PlaneGeometry(2, 2);
  const slots = effectSlots.slots(S => { scene.remove(S.m); S.m.material.dispose(); });
  const mesh = () => {
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
      uniforms: { uColor: { value: new THREE.Color(C.color) }, uOpacity: { value: 0 }, uR: { value: 1 }, uW: { value: C.width / 2 }, uExtent: { value: 1 },
                  uLinks: { value: C.links }, uBreak: { value: 0 } } }));
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 1; m.frustumCulled = false; scene.add(m);
    return m;
  };
  pooledFx.push(mesh());   // never shown: drawn once by the warm-up, so the slots' shared shader is compiled before play
  const make = () => ({ m: mesh(), k: 0, r: 0, held: false, flash: 0 });
  function breakAt(e, S) {   // the line breaks: a flash, and dust thrown up along it
    S.flash = 1;
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      groundFx.puff(e.home.x + Math.sin(a) * S.r, e.home.z + Math.cos(a) * S.r, C.dust, e.home.y, 0.8);
    }
  }
  function render(game) {
    const dt = effectSlots.dt();
    slots.sweep(game.enemies);
    for (const e of game.enemies) {
      const r = e.def && e.def.tether, held = !!r && e.alive();
      let S = slots.get(e);
      if (!S) { if (!held || !e.home) continue; S = slots.acquire(e, make); }
      if (held) S.r = r;
      if (S.held && !held && e.alive()) breakAt(e, S);
      S.held = held;
      S.k = clamp01(S.k + dt / (held ? C.fadeIn : -C.fadeOut));
      S.flash = Math.max(0, S.flash - dt * 1.5);
      S.m.visible = S.k > 0;
      if (!S.m.visible) continue;
      const U = S.m.material.uniforms, ext = S.r + C.width * 4;
      U.uR.value = S.r; U.uExtent.value = ext; U.uOpacity.value = C.opacity * S.k * (1 + C.flash * S.flash);
      U.uBreak.value = held ? 0 : 1 - S.k;
      S.m.scale.set(ext, ext, 1); S.m.position.set(e.home.x, e.home.y + 0.045, e.home.z);
    }
  }
  Game.renderHooks.push(render);
  return { of: e => { const S = slots.get(e); return S ? { r: S.r, k: S.k, held: S.held, visible: S.m.visible } : null; } };
})();
