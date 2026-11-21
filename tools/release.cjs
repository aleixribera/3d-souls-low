// One command for a release (AGENTS.md "Release"): the next minor version in all six spots and the players'
// changelog entry, written safely (an apostrophe in the text needs no hand escaping) and checked, then committed alone
// and tagged. Only the push is left: it prints the command.
//   node tools/release.cjs "<title>" "<text>" ["<trailer line>" ...]   after `git rebase origin/main`
// Trailer lines (Co-Authored-By: ...) end the commit message. The commit holds these files only, whatever else is
// staged, and the tag goes only on that commit: when the commit fails (the caps hook), the files go back as they were
// and nothing is tagged (why: pass 165's release commit was refused and its tag landed on the commit before; pass
// 166's subject began with a BOM from a PowerShell message file; retro 170).
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const [title, text, ...trailers] = process.argv.slice(2);
const lineBreak = /\r\n?|\n/g;
if (!title?.trim() || !text?.trim() || /[\r\n]/.test(title)) {
  console.error('usage: node tools/release.cjs "<title>" "<text>" ["<trailer line>" ...]   (a title on one line; neither empty)');
  process.exit(2);
}
// A BOM or another invisible control character would land in the commit subject or the players' changelog.
const hidden = /[\uFEFF\u00AD\u200B-\u200F\u2028\u2029\u2060-\u2064\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;
for (const [name, v] of [['title', title], ['text', text], ...trailers.map(t => ['trailer', t])]) {
  if (hidden.test(v)) { console.error(`release: the ${name} holds a BOM or a control character; retype it`); process.exit(2); }
}
// Every argument after the text is a trailer line: an unquoted text would otherwise end up as trailers.
const bad = trailers.find(t => !/^[A-Za-z][\w-]*: \S[^\r\n]*$/.test(t));
if (bad !== undefined) { console.error(`release: "${bad}" is not a trailer line (Name: value); quote the text`); process.exit(2); }
const git = (...a) => execFileSync('git', ['-c', 'tag.gpgSign=false', ...a], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const file = rel => path.join(root, rel);
const read = rel => fs.readFileSync(file(rel), 'utf8');
const edits = new Map();   // every file is changed in memory first, so a failed check writes nothing
const edit = (rel, from, to) => {
  const before = edits.get(rel) ?? read(rel), after = before.replace(from, () => to);   // a function: `$&` in text stays literal
  if (after === before) throw new Error(`${rel}: nothing matched ${from}`);
  edits.set(rel, after);
};

const current = /const VERSION = 'v(\d+)\.(\d+)\.(\d+)'/.exec(read('js/config.js'));
if (!current) throw new Error('js/config.js: no VERSION');
const was = `${current[1]}.${current[2]}.${current[3]}`, next = `${current[1]}.${+current[2] + 1}.0`;
const q = s => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(lineBreak, ' ')}'`;

edit('js/config.js', `const VERSION = 'v${was}'`, `const VERSION = 'v${next}'`);
edit('combat-arena-3d.html', `const LOAD_STAMP = '${was}'`, `const LOAD_STAMP = '${next}'`);
for (const pkg of ['package.json', 'server/package.json']) edit(pkg, `"version": "${was}"`, `"version": "${next}"`);
// The lock's own version, at the top and under packages[""]: what `npm install --package-lock-only` changes for a bump.
for (const lock of ['package-lock.json', 'server/package-lock.json']) {
  const json = JSON.parse(read(lock));
  if (json.version !== was || json.packages[''].version !== was) throw new Error(`${lock}: version is not ${was}`);
  json.version = next; json.packages[''].version = next;
  edits.set(lock, JSON.stringify(json, null, 2) + '\n');
}
edit('js/data/changelog.js', /^const CHANGELOG = \[\n/m,
  `const CHANGELOG = [\n  { version: 'v${next}', title: ${q(title)}, text: ${q(text)} },\n`);

// Check before writing: the changelog parses and its first entry is this release, word for word.
const ctx = vm.createContext({});
vm.runInContext(`${edits.get('js/data/changelog.js')}\nthis.out = CHANGELOG[0];`, ctx);
const first = ctx.out;
if (first.version !== `v${next}` || first.title !== title || first.text !== text.replace(lineBreak, ' ')) throw new Error('the changelog entry did not read back as written');

// The files must hold nothing uncommitted (it would ride along in the release commit), and the tag must be new.
const files = [...edits.keys()];
const dirty = git('status', '--porcelain', '--', ...files);
if (dirty) throw new Error(`uncommitted changes in the release's files; commit or drop them first:\n${dirty}`);
if (git('tag', '--list', `v${next}`)) throw new Error(`the tag v${next} already exists here: git tag -d v${next}, or rebase onto main`);

const originals = new Map(files.map(rel => [rel, read(rel)]));
for (const [rel, body] of edits) fs.writeFileSync(file(rel), body);
const message = [`v${next}: ${title}`, ...(trailers.length ? ['', ...trailers] : [])].join('\n') + '\n';
try {
  execFileSync('git', ['commit', '--only', '-F', '-', '--', ...files], { cwd: root, input: message, stdio: ['pipe', 'inherit', 'inherit'] });
} catch {
  for (const [rel, body] of originals) fs.writeFileSync(file(rel), body);
  console.error(`release: the commit failed (above); the files are back at v${was} and nothing is tagged`);
  process.exit(1);
}
const sha = git('rev-parse', '--short', 'HEAD');
try { git('tag', `v${next}`); } catch (e) {
  console.error(`release: committed ${sha} but the tag failed (${e.stderr || e.message}): run git tag v${next} yourself`);
  process.exit(1);
}
console.log(`v${was} -> v${next}: committed ${sha} and tagged v${next}. Push both at once:
  git push --atomic origin HEAD:main v${next}
Rejected: git tag -d v${next} && git reset --keep HEAD~1, rebase onto origin/main, and run this again.`);
