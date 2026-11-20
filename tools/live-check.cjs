// Step 1's look at "Broken" in one command: the version players are served at PLAY-LINK.txt beside main's, and the
// newest CI and container runs with their failed jobs. Read-only; needs `gh` signed in.
//   node tools/live-check.cjs
// Why: players stayed on v7.159.0 (the cut Veyra included) through three releases held by red CI, and no pass saw it
// (retro 110).
'use strict';
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const versionOf = src => /const VERSION = '(v[\d.]+)'/.exec(src)?.[1] ?? '?';

(async () => {
  const link = fs.readFileSync(path.join(root, 'PLAY-LINK.txt'), 'utf8').trim();
  const repo = versionOf(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8'));
  let live;
  try {
    const res = await fetch(new URL('js/config.js', link.endsWith('/') ? link : link + '/'), { signal: AbortSignal.timeout(15000) });
    live = res.ok ? versionOf(await res.text()) : `HTTP ${res.status}`;
  } catch (e) { live = `unreachable (${e.message})`; }
  console.log(`${link}\n  players get ${live}; this checkout is ${repo}${live === repo ? '' : '   <- behind'}`);

  const gh = args => execFileSync('gh', args, { cwd: root, encoding: 'utf8' });
  for (const wf of ['ci.yaml', 'container.yaml']) {
    let runs;
    try { runs = JSON.parse(gh(['run', 'list', '-w', wf, '-L', '3', '--json', 'databaseId,displayTitle,status,conclusion,headBranch'])); }
    catch (e) { console.log(`${wf}: gh failed (${e.message.split('\n')[0]})`); continue; }
    console.log(wf);
    for (const r of runs) {
      let failed = '';
      if (r.conclusion === 'failure') {
        try {
          const jobs = JSON.parse(gh(['run', 'view', String(r.databaseId), '--json', 'jobs'])).jobs;
          failed = ' failed: ' + jobs.filter(j => j.conclusion === 'failure').map(j => j.name).join(', ');
        } catch { /* the line still shows the run */ }
      }
      console.log(`  ${r.databaseId} ${r.headBranch} ${r.conclusion || r.status}${failed} | ${r.displayTitle.slice(0, 70)}`);
    }
  }
})();
