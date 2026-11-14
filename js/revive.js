'use strict';
// Revive, drawn (CONFIG.revive; the server decides it in server/simulation.js reviveStep). Each fallen teammate's
// ember where they fell: sparks rising from it, and a ring on the ground at the reach a reviver stands in, filling round
// as the revive runs; the cue over the bottom of the screen ("Reviving Ash", "Bram is reviving you"); a burst when they
// rise. Drawing only: the list comes from the server's frames (js/multiplayer.js sets it) and nothing here changes the
// game. A fixed pool of slots, built once; nothing is allocated per frame.
const revive = (() => {
  const V = VIS.revive, R = CONFIG.revive, SLOTS = 6, SIZE = R.range + 0.35;
  let list = [], self = null, slots = null, drawn = false, cue = null, cueText = null, cueFill = null, shownText = '', shownFill = -1;
  const ringVertex = `varying vec2 vUv; varying float vDepth;
    void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const ringFragment = `uniform float uProgress, uTime, uFog; uniform vec3 uColor, uHot; varying vec2 vUv; varying float vDepth;
    void main() {
      vec2 p = (vUv - 0.5) * ${(2 * SIZE).toFixed(3)};
      float r = length(p), reach = ${R.range.toFixed(3)};
      float rim = smoothstep(${V.ring.toFixed(3)}, 0., abs(r - reach));
      float arc = atan(p.x, -p.y) / 6.2831853 + 0.5;
      float fill = step(arc, uProgress) * smoothstep(${(V.ring * 2.2).toFixed(3)}, 0., abs(r - reach + 0.05)) * step(0.001, uProgress);
      float heart = exp(-r * r * 9.) * (0.8 + 0.2 * sin(uTime * 4.3)) + exp(-r * r * 1.4) * 0.18;
      float fog = exp(-uFog * uFog * vDepth * vDepth);
      float a = (rim * 0.32 + fill + heart) * fog;
      if (a < 0.003) discard;
      gl_FragColor = vec4(mix(uColor, uHot, clamp(fill + heart * 0.6, 0., 1.)) * (1. + fill * 0.6), min(1., a));
    }`;
  const sparkVertex = `attribute float aPhase; uniform float uTime, uSpeed, uScale; varying float vAlpha, vDepth;
    void main() {
      float t = fract(uTime * uSpeed / ${V.life.toFixed(3)} + aPhase);
      float turn = aPhase * 37.7 + t * 2.4, wide = 0.12 + 0.3 * fract(aPhase * 7.31) * (1. - t);
      vec3 p = position + vec3(cos(turn) * wide, t * ${V.rise.toFixed(3)}, sin(turn) * wide);
      vec4 mv = modelViewMatrix * vec4(p, 1.); vDepth = -mv.z;
      vAlpha = sin(t * 3.14159265) * (1. - t * 0.5);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = min(${V.maxPx.toFixed(1)}, ${V.size.toFixed(3)} * uScale / max(0.1, vDepth));
    }`;
  const sparkFragment = `uniform vec3 uColor; uniform float uFog; varying float vAlpha, vDepth;
    void main() { float r = length(gl_PointCoord - 0.5) * 2.;
      float a = (pow(max(0., 1. - r), 2.) * 0.6 + exp(-r * r * 40.)) * vAlpha * exp(-uFog * uFog * vDepth * vDepth);
      if (a < 0.003) discard; gl_FragColor = vec4(uColor * (1.2 + exp(-r * r * 40.)), a); }`;
  function build() {
    const ringGeo = new THREE.PlaneGeometry(2 * SIZE, 2 * SIZE).rotateX(-Math.PI / 2);
    const phases = new Float32Array(V.sparks), pos = new Float32Array(V.sparks * 3);
    for (let i = 0; i < V.sparks; i++) phases[i] = i / V.sparks + Math.sin(i * 12.9898) * 0.5;
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sparkGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    slots = [];
    for (let i = 0; i < SLOTS; i++) {
      const group = new THREE.Group(); group.visible = false; group.renderOrder = 3;
      const ring = new THREE.Mesh(ringGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uProgress: { value: 0 }, uTime: vTime, uFog: FOG_D, uColor: { value: new THREE.Color(V.color) }, uHot: { value: new THREE.Color(V.hot) } },
        vertexShader: ringVertex, fragmentShader: ringFragment }));
      ring.position.y = 0.04; ring.frustumCulled = false; ring.renderOrder = 3;
      const sparks = new THREE.Points(sparkGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: vTime, uSpeed: { value: 1 }, uScale: { value: 1 }, uFog: FOG_D, uColor: { value: new THREE.Color(V.color) } },
        vertexShader: sparkVertex, fragmentShader: sparkFragment }));
      sparks.frustumCulled = false; sparks.renderOrder = 3;
      group.add(ring, sparks); scene.add(group);
      slots.push({ group, ring: ring.material.uniforms, sparks: sparks.material.uniforms, shown: 0, id: null });
    }
  }
  // The cue sits with the other prompts at the bottom centre (js/hud.js's anchor).
  function makeCue() {
    const anchor = document.getElementById('aBC'); if (!anchor) return;
    cue = document.createElement('div'); cue.id = 'reviveCue'; cue.setAttribute('role', 'status');
    cueText = document.createElement('span'); cueText.className = 'revive-text';
    const bar = document.createElement('span'); bar.className = 'revive-bar'; bar.setAttribute('aria-hidden', 'true');
    cueFill = document.createElement('i'); bar.appendChild(cueFill); cue.append(cueText, bar);
    anchor.insertBefore(cue, document.getElementById('prompt'));
    const style = document.createElement('style');
    style.textContent = `#reviveCue{display:flex;flex-direction:column;align-items:center;gap:6px;min-height:0;font-size:15px;letter-spacing:2px;color:#f0c891;
      text-shadow:0 0 6px #000;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;white-space:nowrap;pointer-events:none}
      #reviveCue.show{opacity:1;transform:none;margin-bottom:6px}
      #reviveCue .revive-bar{display:block;width:180px;height:3px;background:#00000080;box-shadow:0 0 0 1px #6b3a1a80}
      #reviveCue .revive-bar i{display:block;height:100%;background:#ffb060;box-shadow:0 0 8px #ff7a32;transform-origin:left;transform:scaleX(0)}
      #reviveCue.near .revive-bar{visibility:hidden}
      @media(prefers-reduced-motion:reduce){#reviveCue{transition:none}}`;
    document.head.appendChild(style);
  }
  // From each frame (js/multiplayer.js): the embers with their cue lines, and this player's id.
  function set(embers, me) { list = embers; self = me; }
  function hide() { drawn = false; if (slots) for (const s of slots) { s.group.visible = false; s.id = null; } setCue('', -1, false); }
  function clear() { list = []; hide(); }
  function setCue(text, fill, near) {
    if (!cue) makeCue(); if (!cue) return;
    if (text !== shownText) { shownText = text; cueText.textContent = text; cue.classList.toggle('show', !!text); }
    cue.classList.toggle('near', near);
    if (fill >= 0 && Math.abs(fill - shownFill) > 0.004) { shownFill = fill; cueFill.style.transform = `scaleX(${fill.toFixed(3)})`; }
  }
  // When a teammate rises: a burst of embers where they stood up.
  function burst(x, y, z) {
    spawnBurst({ x, y: y + 0.6, z }, { color: V.color, count: Math.round(reducedMotion() ? V.burst / 3 : V.burst), speed: V.burstSpeed });
  }
  Game.renderHooks.push(function reviveEmbers(game) {
    const on = typeof multiplayer !== 'undefined' && multiplayer.active() && game.mode === 'play' && list.length > 0;
    if (!on) { if (drawn || shownText) hide(); return; }
    if (!slots) build();
    drawn = true;
    const dt = game.renderDt || 0, p = game.player, scale = renderer.domElement.height / 2 / Math.tan(camera.fov * Math.PI / 360);
    let text = '', fill = -1, near = false, best = Infinity;
    for (let i = 0; i < SLOTS; i++) {
      const s = slots[i], m = list[i];
      if (!m) { s.group.visible = false; s.id = null; continue; }
      if (s.id !== m.id) { s.id = m.id; s.shown = m.t; }
      // The server's progress arrives a few times a second: ease toward it, drop at once when it starts over.
      s.shown = m.t < s.shown - 0.05 ? m.t : s.shown + (m.t - s.shown) * Math.min(1, dt * 12);
      s.group.visible = true; s.group.position.set(m.x, m.y, m.z);
      s.ring.uProgress.value = s.shown; s.sparks.uSpeed.value = m.by ? V.fast : 1; s.sparks.uScale.value = scale;
      // The cue: who is reviving you; you reviving someone; or the nearest ember within `near` m to stand on.
      if (m.id === self && m.by) { text = m.saved; fill = s.shown; best = -2; }
      else if (p && p.alive() && m.by === self && best > -1) { text = m.reviving; fill = s.shown; best = -1; }
      else if (p && p.alive() && !m.by && best >= 0) {
        const d = Math.hypot(p.x - m.x, p.z - m.z);
        if (d < V.near && d < best) { best = d; text = m.standIn; fill = 0; }
      }
    }
    near = best >= 0 && !!text;
    setCue(text, fill, near);
  });
  return { set, clear, burst };
})();
