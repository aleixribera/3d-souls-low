// Fullscreen policy and failure paths, without needing a browser.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const listeners = {}, docListeners = {};
let requests = 0, exits = 0;
const document = {
  fullscreenElement: null,
  documentElement: { async requestFullscreen() { requests++; document.fullscreenElement = document.documentElement; } },
  async exitFullscreen() { exits++; document.fullscreenElement = null; },
  addEventListener(type, fn) { docListeners[type] = fn; },
};
const context = vm.createContext({ document, window: { addEventListener(type, fn) { listeners[type] = fn; } }, Game: { screen: 'main' } });
// Exercise boot's standalone fullscreen prelude without starting the renderer or registering combat listeners.
const boot = fs.readFileSync(require('node:path').join(__dirname, '../js/boot.js'), 'utf8');
const preludeEnd = boot.indexOf('// Event listeners:');
assert.ok(preludeEnd > 0, 'fullscreen stays in the existing boot script before game initialization');
vm.runInContext(boot.slice(0, preludeEnd), context);
const policy = vm.runInContext('fullscreen', context);
(async () => {
  for (const ev of [
    { type: 'pointerdown', button: 0, isTrusted: false },
    { type: 'pointerdown', button: 3, isTrusted: true },
    { type: 'keydown', code: 'Escape', isTrusted: true },
    { type: 'keydown', code: 'F11', isTrusted: true },
    { type: 'keydown', code: 'ControlLeft', isTrusted: true },
    { type: 'keydown', code: 'KeyR', ctrlKey: true, isTrusted: true },
  ]) policy.auto(ev);
  assert.equal(requests, 0, 'synthetic events, side buttons, browser shortcuts and exiting do not enter fullscreen');
  listeners.pointerdown({ type: 'pointerdown', button: 0, isTrusted: true });
  await Promise.resolve();
  assert.equal(requests, 1, 'first real click enters fullscreen');
  await document.exitFullscreen();
  listeners.keydown({ type: 'keydown', code: 'Enter', isTrusted: true });
  assert.equal(requests, 1, 'leaving fullscreen is respected for this visit');
  await policy.toggle(); await policy.toggle();
  assert.equal(requests, 2); assert.equal(exits, 2, 'Options can still enter and exit');
  document.documentElement.requestFullscreen = () => Promise.reject(new Error('Permission denied'));
  await policy.enter(); await policy.toggle();
  document.documentElement.requestFullscreen = () => { throw new Error('Unsupported'); };
  await policy.enter();
  delete document.documentElement.requestFullscreen;
  await policy.enter();
  policy.attempted = false;
  document.documentElement.requestFullscreen = async () => { requests++; };
  listeners.keydown({ type: 'keydown', code: 'Enter', isTrusted: true });
  assert.equal(requests, 3, 'keyboard-only first interaction also requests fullscreen');
  console.log('Fullscreen: click, keyboard, Escape, explicit toggle, unsupported and refused requests passed.');
})().catch(err => { console.error(err); process.exitCode = 1; });
