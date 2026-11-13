'use strict';
// The image builds from git: every path the Dockerfile copies is tracked. (The server is updated by the homelab's
// `hl`, docs/container-updates.md; the game ships no updater.)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
// Every path the image copies is in git: a checkout without it fails the build (v7.19.0 once removed the last asset).
// Skipped outside a git checkout (remote-test's mirror copy has no .git).
let tracked = null;
try { tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n'); } catch { console.log('Deployment: not a git checkout, image sources not checked.'); }
if (tracked) for (const [, sources] of fs.readFileSync('Dockerfile', 'utf8').matchAll(/^COPY\s+(.+)\s+\S+\s*$/gm))
  for (const from of sources.split(/\s+/).filter(s => !s.startsWith('--')))
    assert.ok(tracked.some(t => from.includes('*') ? t.startsWith(from.slice(0, from.indexOf('*'))) : t === from || t.startsWith(from + '/')), `Dockerfile copies ${from}, which git does not track`);
if (tracked) console.log('Deployment: every image source is tracked.');
