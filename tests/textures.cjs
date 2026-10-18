// Exact colour, roughness, height and alpha regression against the pre-optimization baker.
// node tests/textures.cjs (no browser or third-party packages needed)
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const visual = fs.readFileSync(path.join(root, 'js/visuals.js'), 'utf8');
const source = fs.readFileSync(process.argv[2] || path.join(root, 'js/textures.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(visual.slice(visual.indexOf('function seeded('), visual.indexOf('const between =')) +
  fs.readFileSync(path.join(root, 'js/data/textures.js'), 'utf8') +
  source.slice(source.indexOf('function TEXCORE_FACTORY('), source.indexOf('const TEXLIB =')) +
  ';this.core = TEXCORE_FACTORY(TEXTURE_SETTINGS, seeded); this.defs = TEXTURE_DEFS; this.seed = strSeed;', context);
const fixture = path.join(__dirname, 'texture-fingerprints.json');
const expected = process.argv[2] ? {} : JSON.parse(fs.readFileSync(fixture));
const actual = {}, start = performance.now();
for (const def of context.defs) {
  for (const [size, tint, decay] of [[64, 0xffffff, 0.5], [64, 0x6a374f, 0.5], [64, 0x142a30, 0.8], [64, 0xffffff, 0.5],
    ...(['rottenCloth', 'rustedIron', 'tatteredFabric'].includes(def.id) ? [[256, 0x7a4b29, 0.6]] : [])]) {
    const result = context.core.pack(context.core.bake(def, size, tint, decay, context.seed(def.id)));
    const key = `${def.id}|${size}|${tint}|${decay}`;
    const hash = createHash('sha256');
    for (const name of ['map', 'rough', 'bump']) hash.update(result[name]);
    actual[key] = hash.digest('hex');
    if (!process.argv[2]) assert.equal(actual[key], expected[key], key);
  }
}
if (process.argv[2]) fs.writeFileSync(fixture, JSON.stringify(actual, null, 2) + '\n');
else assert.deepEqual(Object.keys(actual), Object.keys(expected));
console.log(`${Object.keys(actual).length} texture fingerprints ${process.argv[2] ? 'recorded' : 'match exactly'} in ${Math.round(performance.now() - start)} ms`);
