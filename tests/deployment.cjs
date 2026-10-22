'use strict';
// Execute the updater with a Docker stub: protect active sessions, never replace
// on pull failure, and restore the old image after a failed health check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
if (process.platform === 'win32' && !fs.existsSync(bash)) throw new Error('Install Git Bash to run deployment fixtures on Windows.');
const root = path.resolve('.scratch/deployment-' + randomUUID());
fs.mkdirSync(path.join(root, 'deploy'), { recursive: true });
fs.copyFileSync('deploy/update.sh', path.join(root, 'deploy/update.sh'));
const stub = path.join(root, 'stub.sh');
fs.writeFileSync(stub, `
flock() { return 0; }
docker() {
  printf 'image=%s docker %s\\n' "\$GAME_IMAGE" "\$*" >> "\$TEST_LOG"
  case "\$*" in
    'compose ps --all --quiet souls') [[ "\$MOCK_EXISTS" == 1 ]] && printf 'container-id\\n'; return 0 ;;
    'inspect --format {{.Image}} container-id') printf 'sha256:old\\n' ;;
    'inspect --format {{.State.Running}} container-id') printf 'true\\n' ;;
    'compose exec -T souls node -e '*) printf '%s\\n' "\$MOCK_PLAYERS" ;;
    'compose pull souls') [[ "\$MOCK_PULL_FAIL" != 1 ]] ;;
    'compose up '*) [[ "\$GAME_IMAGE" == sha256:old || "\$MOCK_UP_FAIL" != 1 ]] ;;
    *) echo 'Unexpected Docker invocation' >&2; return 1 ;;
  esac
}
`);
execFileSync(bash, ['-n', 'deploy/update.sh'], { stdio: 'pipe' });
function run(name, values = {}) {
  const log = path.join(root, name + '.log');
  const env = { ...process.env, BASH_ENV: stub.replaceAll('\\', '/'), TEST_LOG: log.replaceAll('\\', '/'),
    GAME_IMAGE: '', MOCK_EXISTS: '1', MOCK_PLAYERS: '0', MOCK_PULL_FAIL: '0', MOCK_UP_FAIL: '0', ...values };
  const r = spawnSync(bash, ['deploy/update.sh'], { cwd: root, env, encoding: 'utf8' });
  if (r.error) throw r.error;
  return { ...r, calls: fs.readFileSync(log, 'utf8') };
}
let r = run('busy', { MOCK_PLAYERS: '3' });
assert.equal(r.status, 0, r.stderr); assert.ok(!r.calls.includes('compose pull'), 'connected players defer the update');
r = run('idle'); assert.equal(r.status, 0, r.stderr); assert.ok(r.calls.includes('compose pull souls')); assert.ok(r.calls.includes('--wait --wait-timeout 90 souls'));
r = run('fresh', { MOCK_EXISTS: '0' }); assert.equal(r.status, 0, r.stderr); assert.ok(!r.calls.includes('compose exec')); assert.ok(r.calls.includes('compose up'));
r = run('pull-fails', { MOCK_PULL_FAIL: '1' }); assert.notEqual(r.status, 0); assert.ok(!r.calls.includes('compose up'), 'failed pull keeps the running container');
r = run('unhealthy', { MOCK_UP_FAIL: '1' }); assert.notEqual(r.status, 0); assert.ok(r.calls.includes('image=sha256:old docker compose up -d --no-deps --pull never'), 'failed health check restores the previous local image');
r = run('unknown-players', { MOCK_PLAYERS: 'unavailable' }); assert.notEqual(r.status, 0); assert.ok(!r.calls.includes('compose pull'), 'unknown lobby state cannot interrupt play');
console.log('Deployment: busy/idle/fresh lobby, pull failure, health rollback and unknown state passed.');
