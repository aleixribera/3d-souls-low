'use strict';
// ============================================================================
// First launch: pick the graphics preset this machine should start on
// ============================================================================
// Two presets for players: Normal (everyone; 60 fps on integrated graphics) and Ultra. Auto measures a detached 3D
// scene at Ultra's actual resolution on a GPU that might carry it; anything that doesn't prove Ultra plays Normal.
// Integrated chips, phones and software renderers start on Normal without a test. Runs once per page when Auto is
// needed; a manually saved preset never runs the benchmark or gets overwritten.
const autoQuality = (() => {
  const A = CONFIG.VISUALS.autoQuality, Q = CONFIG.VISUALS.quality;
  let note = null;
  const savedGraphics = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      return !!saved && ['auto', ...Object.keys(Q), ...Object.keys(OLD_GRAPHICS)].includes(saved.graphics);
    } catch (e) { return false; }   // unreadable options still get a safe measured preset
  };
  function gpuName() {
    try {
      const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
    } catch (e) { return ''; }
  }
  // The highest preset a GPU of this name should get: Ultra only for one that may carry it (and then must prove it).
  function capFor(name, { touch }) {
    if (touch || new RegExp(A.software).test(name)) return 'normal';
    if (new RegExp(A.strong).test(name) || new RegExp(A.capableIntegrated).test(name)) return 'ultra';
    if (new RegExp(A.integrated).test(name)) return 'normal';
    return 'ultra';   // masked/unrecognized adapters must prove themselves in the same actual-frame test
  }
  // Compare Ultra's measured native-resolution frame cost with its budget; no shader-to-resolution extrapolation.
  function recommend({ name = '', frames = {}, width = A.referenceWidth, height = A.referenceHeight,
                       pixelRatio = 1, cores = 0, memory = 0, touch = false } = {}) {
    name = String(name).toLowerCase();
    const cap = capFor(name, { touch, cores, memory });
    const cost = preset => typeof frames[preset] === 'number' ? frames[preset] : frames[preset]?.ms;
    const passes = preset => Number.isFinite(cost(preset)) && cost(preset) >= 0 && cost(preset) <= A.frameMs[preset];
    let pick = 'normal', reason = 'hardware-normal';
    if (cap === 'ultra' && passes('ultra')) { pick = 'ultra'; reason = 'measured-ultra'; }
    else if (cap === 'ultra') reason = Number.isFinite(cost('ultra')) ? 'ultra-over-budget' : 'ultra-test-failed';
    return { pick, name, cap, frames, reason, ms: cost(pick), width, height, pixelRatio, cores, memory };
  }
  let detected = null;
  // The preset this machine should run (worked out once per page load: the GPU's name and a short benchmark).
  function detect() {
    if (detected) return detected;
    const name = gpuName();
    const device = { name, width: window.innerWidth, height: window.innerHeight, pixelRatio: window.devicePixelRatio || 1,
      cores: navigator.hardwareConcurrency || 0, memory: navigator.deviceMemory || 0,
      touch: (navigator.maxTouchPoints || 0) > 1 && Math.min(screen.width, screen.height) < A.phoneWidth };
    const frames = {}, errors = {};
    const cap = capFor(name, device);
    if (cap === 'ultra') {
      try { frames.ultra = qualityBenchmark.measure('ultra', device); }
      catch (e) { errors.ultra = String(e.message || e); }
    }
    detected = { ...recommend({ ...device, frames }), errors, version: VERSION, checkedAt: Date.now(), benchmarked: cap === 'ultra' };
    return detected;
  }
  return {
    recommend,
    summary() {
      const r = detected;
      if (!r) return 'Select to run a fresh 3D graphics test and apply Auto.';
      const detail = r.frames.ultra ? `Ultra: ${r.frames.ultra.ms.toFixed(1)} ms/frame (budget ${A.frameMs.ultra} ms)` : '';
      const why = { 'hardware-normal': 'Normal suits this graphics chip', 'measured-ultra': 'Ultra passed the 3D test',
        'ultra-over-budget': 'Ultra exceeded the frame budget', 'ultra-test-failed': 'Ultra test could not complete' }[r.reason];
      return `Detected GPU: ${r.name || 'unavailable'}. ${why}.${detail ? ' ' + detail + '.' : ''} Select to test again and apply Auto.`;
    },
    recheck() { detected = null; return detect(); },
    // Called by boot.js before applySettings(). On the first launch (no graphics choice saved) the setting becomes
    // Auto and the title screen says what it picked; returns that preset, or null when the player already chose.
    firstRun() {
      if (savedGraphics()) return null;
      settings.graphics = 'auto'; saveSettings();
      note = { ...detect() };
      return note.pick;
    },
    // The preset to draw with: the saved one (the tests' hidden `bare` included), or the detected one for Auto.
    effective: () => settings.graphics in Q ? settings.graphics : detect().pick,
    // The Graphics option's choices, in order, and how each is named ("Auto (Ultra)"); hidden presets are not offered.
    choices: () => ['auto', ...Object.keys(Q).filter(k => !Q[k].hidden)],
    label: name => name === 'auto' ? `Auto (${Q[detect().pick].label})` : (Q[name] || Q[CONFIG.VISUALS.defaultQuality]).label,
    // The title screen's line about it (shown once, fading out on its own).
    show() {
      if (!note || note.shown) return;
      note.shown = true;
      const el = document.createElement('div');
      el.id = 'qualityNote';
      el.textContent = A.message.replace('{preset}', `Auto (${Q[note.pick].label})`);
      document.body.appendChild(el);
      setTimeout(() => el.classList.add('out'), A.showTime * 1000);
      setTimeout(() => el.remove(), (A.showTime + 1.5) * 1000);
    },
    // Available for saved Auto as well as first launch. Results live only in this page, never in localStorage.
    result: () => detected,
  };
})();
