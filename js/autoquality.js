'use strict';
// ============================================================================
// First launch: pick the graphics preset this machine should start on
// ============================================================================
// Runs once, before the settings are applied, only when no graphics choice was ever saved. Two signals:
//   - the GPU's name (WEBGL_debug_renderer_info): software renderers and phones cap at Low, integrated chips at High;
//   - a short off-screen benchmark: a heavy full-screen shader drawn a few times, timed to the finish.
// The faster of what the name allows and what the benchmark earns wins. The title screen then says which preset was
// applied and that it can be changed in Options. Tuning: CONFIG.VISUALS.autoQuality.
const autoQuality = (() => {
  const A = CONFIG.VISUALS.autoQuality, ORDER = ['low', 'high', 'ultra'];
  let note = null;
  const savedGraphics = () => {
    try { return 'graphics' in JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return true; }   // no storage: leave the default
  };
  function gpuName() {
    try {
      const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
    } catch (e) { return ''; }
  }
  // The highest preset a GPU of this name should get.
  function capFor(name) {
    const touch = (navigator.maxTouchPoints || 0) > 1 && Math.min(screen.width, screen.height) < 820;
    if (touch || new RegExp(A.software).test(name)) return 'low';
    if (new RegExp(A.strong).test(name)) return 'ultra';
    if (new RegExp(A.integrated).test(name)) return 'high';
    return 'ultra';   // unknown or a discrete card: the benchmark decides
  }
  // ms per pass of a heavy shader over a `size` px target (the finish forced by reading one pixel back).
  function bench() {
    const T = new THREE.WebGLRenderTarget(A.size, A.size, { depthBuffer: false });
    const quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform float uT; varying vec2 vUv;
void main() {
  vec3 c = vec3(vUv, uT);
  for (int i = 0; i < ${A.loops}; i++) c = fract(sin(c.yzx * 12.9898 + c.zxy * 78.233 + float(i)) * 43758.5453) * 0.999 + c * 0.001;
  gl_FragColor = vec4(c, 1.0);
}` }));
    const px = new Uint8Array(4), run = n => { for (let i = 0; i < n; i++) { quad.material.uniforms.uT.value = i; renderer.setRenderTarget(T); quad.render(renderer); } renderer.readRenderTargetPixels(T, 0, 0, 1, 1, px); };
    try {
      run(1);   // compile and warm up
      const t0 = performance.now(); run(A.passes);
      return (performance.now() - t0) / A.passes;
    } finally { renderer.setRenderTarget(null); quad.material.dispose(); quad.dispose(); T.dispose(); }
  }
  let detected = null;
  // The preset this machine should run (worked out once per page load: the GPU's name and a short benchmark).
  function detect() {
    if (detected) return detected;
    const name = gpuName(), cap = capFor(name);
    let ms = Infinity;
    try { ms = bench(); } catch (e) { /* no benchmark: the name alone decides */ }
    const earned = ms <= A.ultraMs ? 'ultra' : ms <= A.highMs ? 'high' : 'low';
    detected = { pick: ORDER[Math.min(ORDER.indexOf(cap), ms === Infinity ? ORDER.indexOf(cap === 'ultra' ? 'high' : cap) : ORDER.indexOf(earned))], ms, name, cap };
    return detected;
  }
  return {
    // Called by boot.js before applySettings(). On the first launch (no graphics choice saved) the setting becomes
    // Auto and the title screen says what it picked; returns that preset, or null when the player already chose.
    firstRun() {
      if (savedGraphics()) return null;
      settings.graphics = 'auto'; saveSettings();
      note = { ...detect() };
      return note.pick;
    },
    // The preset to draw with: the saved one, or the detected one for Auto (and for an unknown saved name).
    effective: () => settings.graphics in CONFIG.VISUALS.quality ? settings.graphics : detect().pick,
    // The Graphics option's choices, in order, and how each is named ("Auto (Ultra)").
    choices: () => ['auto', ...Object.keys(CONFIG.VISUALS.quality)],
    label: name => name === 'auto' ? `Auto (${CONFIG.VISUALS.quality[detect().pick].label})` : (CONFIG.VISUALS.quality[name] || CONFIG.VISUALS.quality[CONFIG.VISUALS.defaultQuality]).label,
    // The title screen's line about it (shown once, fading out on its own).
    show() {
      if (!note || note.shown) return;
      note.shown = true;
      const el = document.createElement('div');
      el.id = 'qualityNote';
      el.textContent = A.message.replace('{preset}', `Auto (${CONFIG.VISUALS.quality[note.pick].label})`);
      document.body.appendChild(el);
      setTimeout(() => el.classList.add('out'), A.showTime * 1000);
      setTimeout(() => el.remove(), (A.showTime + 1.5) * 1000);
    },
    result: () => note,
  };
})();
