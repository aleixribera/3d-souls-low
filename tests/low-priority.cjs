'use strict';
// Test runs stay out of the way of whatever else Aleix's Windows PC is doing (games included): the process drops to the
// lowest priority (IDLE_PRIORITY_CLASS) before it starts anything, and every child it starts afterwards (Edge and its
// GPU and renderer processes, node children of run-all.cjs) inherits that. CI runners and the Linux test laptop
// (remote-test, its own systemd slice shared with other projects' runs) keep normal priority: at nice 19 there, the
// in-page suite starved behind the other runs (the duel regression took 1075 s against 79 s at normal priority).
// ARENA_TEST_PRIORITY=normal keeps normal priority on Windows too (e.g. to time frames); =low lowers it anywhere.
const os = require('node:os');
const want = process.env.ARENA_TEST_PRIORITY || (process.platform === 'win32' && !process.env.CI ? 'low' : 'normal');
if (want === 'low') {
  try { os.setPriority(os.constants.priority.PRIORITY_LOW); } catch (e) { /* not permitted: run as is */ }
}
