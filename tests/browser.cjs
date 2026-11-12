'use strict';
// Every browser test gets Playwright from here, so its browser runs at the lowest priority (tests/low-priority.cjs).
// Edge's processes inherit the idle class from this one, but on Windows Chromium raises its GPU process (above normal)
// and its renderers (normal) as it starts them. So from the first launch, one watcher (itself at idle priority) puts
// every Edge process this test started back to Idle every three seconds, and stops with this process. Chromium sets a
// priority only when it starts a process, so a lowered one stays lowered. Local Windows runs only; CI is unchanged.
require('./low-priority.cjs');
const { spawn } = require('node:child_process');
const playwright = require('playwright');

const lowered = process.platform === 'win32' && !process.env.CI && process.env.ARENA_TEST_PRIORITY !== 'normal';
const WATCH = owner => `
while (Get-Process -Id ${owner} -ErrorAction SilentlyContinue) {
  $all = @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe' OR Name='chrome.exe'" -Property ProcessId, ParentProcessId)
  $tree = @($all | Where-Object { $_.ParentProcessId -eq ${owner} } | ForEach-Object { $_.ProcessId }); $grew = $tree.Count -gt 0
  while ($grew) { $grew = $false; foreach ($p in $all) { if ($tree -contains $p.ParentProcessId -and $tree -notcontains $p.ProcessId) { $tree += $p.ProcessId; $grew = $true } } }
  foreach ($id in $tree) { try { $q = Get-Process -Id $id -ErrorAction Stop; if ($q.PriorityClass -ne 'Idle') { $q.PriorityClass = 'Idle' } } catch {} }
  Start-Sleep -Seconds 3
}`;
let watcher = null;
function watch() {
  if (watcher) return;
  watcher = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', WATCH(process.pid)], { stdio: 'ignore', windowsHide: true });
  watcher.unref();
  process.once('exit', () => { try { watcher.kill(); } catch (e) { /* gone */ } });
}
if (lowered) {
  const launch = playwright.chromium.launch.bind(playwright.chromium);
  playwright.chromium.launch = async (...args) => { const browser = await launch(...args); watch(); return browser; };
}
module.exports = playwright;
