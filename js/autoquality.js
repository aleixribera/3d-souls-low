'use strict';
// ============================================================================
// First launch: pick the graphics preset this machine should start on
// ============================================================================
// Auto combines GPU family, available CPU/RAM hints and a synchronized shader benchmark. Older integrated chips
// start on Low. High and Ultra need stricter timings, adjusted for their real resolution and pixel-density caps.
// Runs once per page when Auto is needed; a manually saved preset never runs the benchmark or gets overwritten.
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
  function capFor(name, { touch, cores, memory }) {
    if (touch || new RegExp(A.software).test(name)) return 'low';
    if ((cores > 0 && cores < A.minHighCores) || (memory > 0 && memory < A.minHighMemory)) return 'low';
    if (new RegExp(A.strong).test(name)) return cores > 0 && cores < A.minUltraCores ? 'high' : 'ultra';
    if (new RegExp(A.capableIntegrated).test(name)) return 'high';
    if (new RegExp(A.integrated).test(name)) return 'low';
    return 'high';   // an unknown renderer must not earn Ultra from a synthetic shader alone
  }
  // Pure policy, also used by regression tests; absent browser hardware hints do not imply weak hardware.
  function recommend({ name = '', ms = Infinity, width = A.referenceWidth, height = A.referenceHeight,
                       pixelRatio = 1, cores = 0, memory = 0, touch = false } = {}) {
    name = String(name).toLowerCase();
    const cap = capFor(name, { touch, cores, memory });
    const cost = preset => {
      const q = CONFIG.VISUALS.quality[preset], ratio = Math.min(Math.max(1, pixelRatio), q.maxPixelRatio) * q.renderScale;
      const pixels = Math.max(1, width) * Math.max(1, height) * ratio * ratio;
      return ms * Math.max(1, pixels / (A.referenceWidth * A.referenceHeight));
    };
    let pick = 'low';
    if (Number.isFinite(ms) && ms >= 0) {
      if (cap === 'ultra' && cost('ultra') <= A.ultraMs) pick = 'ultra';
      else if (ORDER.indexOf(cap) >= ORDER.indexOf('high') && cost('high') <= A.highMs) pick = 'high';
    }
    return { pick, ms, name, cap, adjustedMs: cost(pick), width, height, pixelRatio, cores, memory };
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
      let slowest = 0;
      for (let round = 0; round < A.rounds; round++) {
        const t0 = performance.now(); run(A.passes);
        slowest = Math.max(slowest, (performance.now() - t0) / A.passes);
      }
      return slowest;   // one unusually fast round must not recommend a preset the laptop cannot sustain
    } finally { renderer.setRenderTarget(null); quad.material.dispose(); quad.dispose(); T.dispose(); }
  }
  let detected = null;
  // The preset this machine should run (worked out once per page load: the GPU's name and a short benchmark).
  function detect() {
    if (detected) return detected;
    const name = gpuName();
    const device = { name, width: window.innerWidth, height: window.innerHeight, pixelRatio: window.devicePixelRatio || 1,
      cores: navigator.hardwareConcurrency || 0, memory: navigator.deviceMemory || 0,
      touch: (navigator.maxTouchPoints || 0) > 1 && Math.min(screen.width, screen.height) < A.phoneWidth };
    let ms = Infinity, benchmarked = false;
    if (capFor(name, device) !== 'low') {
      benchmarked = true;
      try { ms = bench(); } catch (e) { /* failed timing: safely recommend Low */ }
    }
    detected = { ...recommend({ ...device, ms }), version: VERSION, checkedAt: Date.now(), benchmarked };
    return detected;
  }
  return {
    recommend,
    recheck() { detected = null; return detect(); },
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
    // Available for saved Auto as well as first launch. Results live only in this page, never in localStorage.
    result: () => detected,
  };
})();
