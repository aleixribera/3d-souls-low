'use strict';
// ============================================================================
// The fog gate's look (pass 169, the Story levels redone): a boss's door drawn as fog, not a slab of light
// ============================================================================
// Drawing only: js/finale.js owns the gate (open, sealed, won) and calls these. Before, it was one flat additive plane
// that read as a white wall of light (docs/story/audit.md). Now it is CONFIG.finale.fogGate.layers sheets of drifting,
// domain-warped noise spread through the doorway's depth, normal-blended so the room behind is faintly seen through the
// thin parts, soft at the sides and top and thickest at the floor. Its colour is the level's sealed gate's `fogColor`,
// or a pale grey taken toward the level's moon light, so it sits in each chapter's light. When the zone is won it thins
// away over `fade` s instead of blinking out. Nothing is allocated per frame.
const fogGate = (() => {
  const VERT = `
    varying vec2 vUv;
    varying float vFace;
    void main() {
      vUv = uv;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vFace = abs(dot(normalize(cameraPosition - w.xyz), normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0))));
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = `
    uniform float uTime, uOpacity, uSeed;
    uniform vec2 uSize;
    uniform vec3 uColor;
    varying vec2 vUv;
    varying float vFace;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
    void main() {
      vec2 p = vUv * uSize * 0.55 + uSeed * 7.3;
      float t = uTime;
      vec2 q = vec2(fbm(p + vec2(0.0, -t * 0.18)), fbm(p + vec2(5.2, 1.3) + vec2(t * 0.11, 0.0)));
      float n = fbm(p + 1.8 * q + vec2(t * 0.07, -t * 0.32));
      float sides = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
      float top = smoothstep(1.0, 0.62, vUv.y), floor_ = mix(1.0, 0.7, vUv.y);
      float dens = smoothstep(0.32, 0.74, n) * 0.85 + 0.15;
      float face = smoothstep(0.08, 0.55, vFace);   // edge-on, a sheet thins away: the depth of the layers carries it
      float a = uOpacity * sides * top * floor_ * dens * face;
      vec3 c = uColor * mix(0.72, 1.12, smoothstep(0.35, 0.85, n));
      gl_FragColor = vec4(c, a);
    }`;
  // gate: a world gate (its `box`, x, y, z); color: a hex; returns what update() takes.
  function build(group, gate, color) {
    const F = CONFIG.finale.fogGate, b = gate.box, alongX = b.x1 - b.x0 > b.z1 - b.z0;
    const w = (alongX ? b.x1 - b.x0 : b.z1 - b.z0) + F.overlap, h = b.y1 - b.y0 + F.rise;
    const out = { group: new THREE.Group(), mats: [], k: 1, seen: false };
    for (let i = 0; i < F.layers; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uOpacity: { value: F.opacity }, uSeed: { value: i * 1.37 }, uSize: { value: new THREE.Vector2(w, h) },
                    uColor: { value: new THREE.Color(color) } },
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), off = F.layers > 1 ? (i / (F.layers - 1) - 0.5) * F.depth : 0;
      m.position.set(alongX ? 0 : off, h / 2, alongX ? off : 0); if (!alongX) m.rotation.y = Math.PI / 2;
      m.renderOrder = 2; out.group.add(m); out.mats.push(mat);
    }
    out.group.position.set(gate.x, b.y0, gate.z);
    group.add(out.group);
    return out;
  }
  // The colour a level's fog gate takes: its sealed gate's `fogColor`, or the base grey toward its moon light.
  function colorFor(level, entry) {
    const F = CONFIG.finale.fogGate, A = level.atmosphere || {};
    if (entry.fogColor !== undefined) return entry.fogColor;
    const c = new THREE.Color(F.color);
    if (A.moon && A.moon.color !== undefined) c.lerp(new THREE.Color(A.moon.color), F.tintMoon);
    return c.getHex();
  }
  // Each drawn frame: shown while the fight is still to be won; thins away over `fade` s once it is.
  function update(f, shown, t, dt) {
    const F = CONFIG.finale.fogGate;
    f.k = !f.seen ? (shown ? 1 : 0) : shown ? 1 : Math.max(0, f.k - dt / F.fade);   // a load past a won fight starts with none
    f.seen = true;
    f.group.visible = f.k > 0;
    if (!f.group.visible) return;
    for (const m of f.mats) { m.uniforms.uTime.value = t; m.uniforms.uOpacity.value = F.opacity * f.k * (0.92 + 0.08 * Math.sin(t * 1.3 + m.uniforms.uSeed.value)); }
  }
  return { build, colorFor, update };
})();
