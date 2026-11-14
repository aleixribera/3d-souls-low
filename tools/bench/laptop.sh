#!/usr/bin/env bash
# Measures this checkout's frame rate on Aleix's laptop (PLAN.md track A item 3), from the PC (Git Bash):
#   tools/bench/laptop.sh <out.json> [QUALITIES=normal,ultra] [OPTS json]   (SIZE=1920x1080 by default)
# Copies the game (the working tree's js/, assets/, page, tools/bench/) to ~/3d-souls-bench/<stamp> on the laptop,
# serves it on 127.0.0.1:8130 there, runs tools/bench/laptop-bench.mjs inside `lt run 3d-souls-low` (one test at a
# time across projects; exit 76 = on battery, no measurement), copies the JSON back and removes the copy.
# REAL=1 is passed through (a real full-screen window on the desktop instead of a headless Mutter).
set -euo pipefail
out=${1:?out.json}; qualities=${2:-normal,ultra}; opts=${3:-'{}'}
host=${LAPTOP:-uni-laptop}; SIZE=${SIZE:-1920x1080}
root=$(cd "$(dirname "$0")/../.." && pwd)
stamp=$(date +%Y%m%d-%H%M%S)-$$
dir="3d-souls-bench/$stamp"
cd "$root"
tar -czf - combat-arena-3d.html index.html assets js tools/bench | ssh -o BatchMode=yes "$host" "mkdir -p ~/$dir && tar -xzf - -C ~/$dir"
printf '%s' "$opts" | ssh -o BatchMode=yes "$host" "cat > ~/$dir/opts.json"
set +e
ssh -o BatchMode=yes "$host" "cd ~/$dir && ~/laptop-test/lt run 3d-souls-low sh -c '
  python3 -m http.server 8130 --bind 127.0.0.1 >/dev/null 2>&1 & srv=\$!
  sleep 1
  REAL=${REAL:-} QUALITIES=$qualities OPTS_FILE=opts.json node tools/bench/laptop-bench.mjs http://127.0.0.1:8130/combat-arena-3d.html#dev result.json ${SIZE%x*} ${SIZE#*x}
  code=\$?; kill \$srv; exit \$code'"
code=$?
set -e
scp -q -o BatchMode=yes "$host:~/$dir/result.json" "$out" 2>/dev/null || echo "no result.json"
ssh -o BatchMode=yes "$host" "rm -rf ~/$dir"
exit $code
