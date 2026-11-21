'use strict';
// tools/release.cjs in a throwaway repo holding only its files: it commits the bump alone, tags that commit, refuses a
// BOM, and when the commit is refused (the caps hook) puts the files back and tags nothing (retro 170: pass 165's tag
// landed on the commit before its refused release commit; pass 166's subject began with a BOM).
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const FILES = ['tools/release.cjs', 'js/config.js', 'combat-arena-3d.html', 'package.json', 'server/package.json',
  'package-lock.json', 'server/package-lock.json', 'js/data/changelog.js', 'STATE.md'];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-test-'));
// No inherited GIT_DIR and the like (a hook's environment would aim every command at the real repo), the test's own
// hooks folder, and no signing.
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_/.test(k)));
Object.assign(env, { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t',
  GIT_CONFIG_COUNT: '3', GIT_CONFIG_KEY_0: 'core.hooksPath', GIT_CONFIG_VALUE_0: '.git/hooks',
  GIT_CONFIG_KEY_1: 'commit.gpgSign', GIT_CONFIG_VALUE_1: 'false', GIT_CONFIG_KEY_2: 'tag.gpgSign', GIT_CONFIG_VALUE_2: 'false' });
const git = (...a) => execFileSync('git', a, { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const release = (...a) => spawnSync(process.execPath, ['tools/release.cjs', ...a], { cwd: dir, env, encoding: 'utf8' });
const hook = body => {
  fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.git', 'hooks', 'pre-commit'), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
};
const version = () => /const VERSION = 'v([\d.]+)'/.exec(fs.readFileSync(path.join(dir, 'js/config.js'), 'utf8'))[1];

try {
  git('init', '-q');
  for (const f of FILES) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(root, f), path.join(dir, f));
  }
  git('add', '-A'); git('commit', '-qm', 'base');
  const was = version(), [maj, min] = was.split('.'), next = `${maj}.${+min + 1}.0`;

  // A BOM in the title, or an unquoted text spilling into trailers: refused before anything is written.
  let r = release(String.fromCharCode(0xFEFF) + 'Title', 'Text');
  assert.equal(r.status, 2, r.stderr);
  r = release('Title', 'Some', 'new', 'text');
  assert.equal(r.status, 2, r.stderr);
  assert.equal(git('status', '--porcelain'), '');

  // The commit is refused: every file is back, no tag, and the staged note is still staged.
  hook('exit 1');
  fs.appendFileSync(path.join(dir, 'STATE.md'), 'a note\n'); git('add', 'STATE.md');
  r = release('Title', 'Text');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(version(), was);
  assert.equal(git('tag', '--list'), '');
  assert.equal(git('status', '--porcelain'), 'M  STATE.md');

  // The commit goes through: the six files alone, tagged, the subject plain and the trailer last.
  hook('exit 0');
  r = release('Title', "It's text", 'Co-Authored-By: X <x@x>');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(version(), next);
  assert.equal(git('tag', '--points-at', 'HEAD'), `v${next}`);
  assert.equal(git('log', '-1', '--format=%B'), `v${next}: Title\n\nCo-Authored-By: X <x@x>`);
  assert.deepEqual(git('show', '--name-only', '--format=', 'HEAD').split('\n').sort(),
    ['combat-arena-3d.html', 'js/config.js', 'js/data/changelog.js', 'package-lock.json', 'package.json',
      'server/package-lock.json', 'server/package.json']);
  assert.equal(git('status', '--porcelain'), 'M  STATE.md');
  assert.match(r.stdout, new RegExp(`git push --atomic origin HEAD:main v${next}`));

  // Again with the tag already there (an unpushed release): refused, nothing written.
  git('reset', '-q', '--keep', 'HEAD~1');
  r = release('Title', 'Text');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(version(), was);
  console.log('release: 4 checks passed');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
