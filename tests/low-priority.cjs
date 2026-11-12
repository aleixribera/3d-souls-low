'use strict';
// Test runs stay out of the way of whatever else this PC is doing (games included): the process drops to the lowest
// priority (IDLE_PRIORITY_CLASS on Windows, nice 19 elsewhere) before it starts anything, and every child it starts
// afterwards (Edge and its GPU and renderer processes, node children of run-all.cjs) inherits that. CI runners are
// not shared, so they keep normal priority; ARENA_TEST_PRIORITY=normal does the same locally (e.g. to time frames).
const os = require('node:os');
if (!process.env.CI && process.env.ARENA_TEST_PRIORITY !== 'normal') {
  try { os.setPriority(os.constants.priority.PRIORITY_LOW); } catch (e) { /* not permitted: run as is */ }
}
