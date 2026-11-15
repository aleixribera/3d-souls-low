// Writes gallery/data.json for the gallery page: the pool, each spec's markdown, the docs, the images on disk
// and the full-quality originals' asset URLs (gallery/assets.json, written as originals are uploaded).
// Prints the `files` list to publish alongside gallery/index.html (root: design/abilities).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '');
const { pool } = JSON.parse(read('pool.json'));
const webps = fs.readdirSync(path.join(ROOT, 'img')).filter((f) => f.endsWith('.webp')).sort();
let assets = {};
try { assets = JSON.parse(read('gallery/assets.json') || '{}'); } catch (e) { assets = {}; }

const imgsFor = (id) => webps.filter((f) => new RegExp(`^${id}-\\d\\.webp$`).test(f)).map((f) => f.replace('.webp', ''));
const out = {
  built: new Date().toISOString().slice(0, 10),
  pool: pool.map((a) => ({ ...a, md: read(`${a.id}.md`), imgs: imgsFor(a.id) })),
  docs: {
    about: read('README.md'), style: read('STYLE.md'), cuts: read('CUTS.md'), 'build-order': read('BUILD-ORDER.md'),
  },
  styleImgs: imgsFor('style'),
  assets,
};
fs.mkdirSync(path.join(ROOT, 'gallery'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'gallery', 'data.json'), JSON.stringify(out));
const specs = out.pool.filter((a) => a.md).length;
const shown = out.pool.filter((a) => a.imgs.length).length;
console.error(`data.json: ${out.pool.length} abilities, ${specs} specs, ${shown} with images, ${webps.length} webp, ${Object.keys(assets).length} originals uploaded`);
console.log(JSON.stringify([{ path: 'gallery/data.json' }, ...webps.map((f) => ({ path: `img/${f}` }))]));
