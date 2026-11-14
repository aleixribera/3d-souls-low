// One command for a release's files (AGENTS.md "Release"): the next minor version in all six spots and the players'
// changelog entry, written safely (an apostrophe in the text needs no hand escaping), then checked.
//   node tools/release.cjs "<title>" "<text>"     after `git rebase origin/main`, so the version is the next one
// It edits files only. Then: commit, `git push origin HEAD:main`, `git tag vX.Y.Z`, `git push origin vX.Y.Z`.
// If the push is rejected: `git reset --keep HEAD~1`, rebase again and run this again.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const [title, text] = process.argv.slice(2);
const lineBreak = /\r\n?|\n/g;
if (!title?.trim() || !text?.trim() || process.argv.length > 4 || /[\r\n]/.test(title)) {
  console.error('usage: node tools/release.cjs "<title>" "<text>"   (a title on one line; neither empty)'); process.exit(2);
}

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

for (const [rel, body] of edits) fs.writeFileSync(file(rel), body);
console.log(`v${was} -> v${next}: ${[...edits.keys()].join(', ')}`);
