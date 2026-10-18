'use strict';
// ============================================================================
// First launch: pick the graphics preset this machine should start on
// ============================================================================
// Auto measures a detached 3D scene at each candidate preset's actual resolution. Older integrated chips start on
// Low; dedicated GPUs qualify by measured frames rather than browser CPU hints or extrapolated shader scores.
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
  function capFor(name, { touch }) {
    if (touch || new RegExp(A.software).test(name)) return 'low';
    if (new RegExp(A.strong).test(name)) return 'ultra';
    if (new RegExp(A.capableIntegrated).test(name)) return 'high';
    if (new RegExp(A.integrated).test(name)) return 'low';
    return 'ultra';   // masked/unrecognized adapters must prove themselves in the same actual-frame test
  }
  // Compare measured native-resolution frame costs directly; no shader-to-resolution extrapolation.
  function recommend({ name = '', frames = {}, width = A.referenceWidth, height = A.referenceHeight,
                       pixelRatio = 1, cores = 0, memory = 0, touch = false } = {}) {
    name = String(name).toLowerCase();
    const cap = capFor(name, { touch, cores, memory });
    const cost = preset => typeof frames[preset] === 'number' ? frames[preset] : frames[preset]?.ms;
    const passes = preset => Number.isFinite(cost(preset)) && cost(preset) >= 0 && cost(preset) <= A.frameMs[preset];
    let pick = 'low', reason = 'hardware-low';
    if (cap === 'ultra' && passes('ultra')) { pick = 'ultra'; reason = 'measured-ultra'; }
    else if (ORDER.indexOf(cap) >= ORDER.indexOf('high') && passes('high')) {
      pick = 'high'; reason = cap === 'high' ? 'hardware-high' : Number.isFinite(cost('ultra')) ? 'ultra-over-budget' : 'ultra-test-failed';
    } else if (cap !== 'low') reason = Number.isFinite(cost('high')) ? 'high-over-budget' : 'test-failed';
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
    for (const preset of cap === 'ultra' ? ['ultra', 'high'] : cap === 'high' ? ['high'] : []) {
      try { frames[preset] = qualityBenchmark.measure(preset, device); }
      catch (e) { errors[preset] = String(e.message || e); }
      if (preset === 'ultra' && Number.isFinite(frames.ultra?.ms) && frames.ultra.ms <= A.frameMs.ultra) break;
    }
    detected = { ...recommend({ ...device, frames }), errors, version: VERSION, checkedAt: Date.now(), benchmarked: cap !== 'low' };
    return detected;
  }
  return {
    recommend,
    summary() {
      const r = detected;
      if (!r) return 'Select to run a fresh 3D graphics test and apply Auto.';
      const detail = ['ultra', 'high'].filter(k => r.frames[k]).map(k => `${CONFIG.VISUALS.quality[k].label}: ${r.frames[k].ms.toFixed(1)} ms/frame (budget ${A.frameMs[k]} ms)`).join('; ');
      const why = { 'hardware-low': 'Conservative hardware limit', 'hardware-high': 'Integrated GPU is limited to High',
        'measured-ultra': 'Ultra passed the 3D test', 'ultra-over-budget': 'Ultra exceeded the frame budget',
        'ultra-test-failed': 'Ultra test could not complete', 'high-over-budget': 'High exceeded the frame budget', 'test-failed': 'Graphics test could not complete' }[r.reason];
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
