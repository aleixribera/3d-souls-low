'use strict';
// Exercise the actual early HTML guard and boot completion with deterministic timers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.env.STARTUP_ROOT || path.join(__dirname, '..'));
const html = fs.readFileSync(path.join(root, 'combat-arena-3d.html'), 'utf8');
const boot = fs.readFileSync(path.join(root, 'js/boot.js'), 'utf8');
const guard = html.match(/<script>\s*([\s\S]*?window\.__bootError[\s\S]*?)<\/script>/)[1];
function fixture(available = true) {
  const classes = new Set(['hidden']), message = { textContent: '' }, timers = new Map(), listeners = new Map();
  const box = { querySelector: () => message, classList: {
    add: c => classes.add(c), remove: c => classes.delete(c),
    toggle: (c, on) => on ? classes.add(c) : classes.delete(c),
  } };
  const context = vm.createContext({
    document: { readyState: available ? 'complete' : 'loading', getElementById: () => available ? box : null,
      addEventListener: (name, fn) => { const list = listeners.get(name) || []; list.push(fn); listeners.set(name, list); } },
    setTimeout: (fn, ms) => { timers.set(1, fn); assert.equal(ms, 10000); return 1; },
    clearTimeout: id => timers.delete(id),
    addEventListener: (name, fn) => listeners.set(name, [fn]),
    KIT: { prewarm() {} },
  });
  context.window = context;
  vm.runInContext(guard, context);
  return { context, classes, message, timers,
    timeout() { const fn = timers.get(1); timers.delete(1); if (fn) fn(); },
    ready() { vm.runInContext(boot.slice(boot.indexOf('window.__arenaReady = true;')), context); },
    domReady() { available = true; context.document.readyState = 'complete'; for (const fn of listeners.get('DOMContentLoaded') || []) fn(); },
  };
}
const delayed = fixture(); delayed.timeout();
if (process.argv.includes('--baseline')) {
  delayed.ready();
  assert.equal(delayed.context.__arenaReady, true);
  assert.equal(delayed.classes.has('hidden'), false);
  assert.equal(delayed.context.__bootShown, true);
  console.log('REPRODUCED: 10-second timeout leaves fatal overlay after successful boot');
} else {
  assert.match(delayed.message.textContent, /Still loading/);
  assert.equal(delayed.context.__bootShown, undefined, 'slow status must not stop the dev-script loader');
  delayed.ready();
  assert.equal(delayed.classes.has('hidden'), true);
  assert.equal(delayed.message.textContent, '');
  const fast = fixture(); fast.ready();
  assert.equal(fast.timers.size, 0, 'successful startup cancels timeout');
  fast.timeout(); assert.equal(fast.classes.has('hidden'), true);
  const failed = fixture(); failed.timeout(); failed.context.__bootError('Missing asset');
  failed.context.__bootError('Later error'); failed.ready();
  assert.equal(failed.message.textContent, 'Missing asset', 'first real error replaces slow status and survives completion');
  assert.equal(failed.classes.has('hidden'), false);
  assert.equal(failed.classes.has('loading'), false);
  const early = fixture(false); early.timeout(); early.ready(); early.domReady();
  assert.equal(early.classes.has('hidden'), true, 'queued DOM-ready render cannot resurrect slow status');
  const earlyError = fixture(false); earlyError.context.__bootError('Early failure'); earlyError.domReady();
  assert.equal(earlyError.message.textContent, 'Early failure');
  assert.equal(earlyError.classes.has('hidden'), false);
  assert.equal(earlyError.timers.size, 0);
  console.log('PASS: slow recovery, fast boot, error precedence/persistence, and DOM-ready races');
}
