#!/usr/bin/env node
// Used by .github/workflows/container.yaml so an older tag never takes :latest back from a newer one (pass 150).
//   docker buildx imagetools inspect <image> --format '{{json .Image}}' | node tools/image-version.cjs
//     prints the image's org.opencontainers.image.version label, or nothing.
//   node tools/image-version.cjs --newer <a> <b>   exits 0 when version a is newer than b (vX.Y.Z), else 1.
'use strict';

function parse(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v).trim());
  return m ? m.slice(1).map(Number) : null;
}

function newer(a, b) {
  const x = parse(a), y = parse(b);
  if (!x || !y) return false;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

// One image config ({ config: { Labels } }) or a map of platform to config (a multi-platform index).
function labelVersion(json) {
  const configs = json && json.config ? [json] : Object.values(json || {});
  for (const c of configs) {
    const v = c && c.config && c.config.Labels && c.config.Labels['org.opencontainers.image.version'];
    if (v) return v;
  }
  return '';
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--newer') process.exit(newer(args[1], args[2]) ? 0 : 1);
  let s = '';
  process.stdin.on('data', (d) => { s += d; }).on('end', () => {
    let v = '';
    try { v = labelVersion(JSON.parse(s)); } catch { v = ''; }
    if (v) console.log(v);
  });
}

module.exports = { newer, labelVersion, parse };
