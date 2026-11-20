"""Blind panel lineup: copies our frames and reference frames to neutral names, shuffled per judge.
Usage: python lineup.py <raw-dir> <out-dir> <judges>. Files in raw-dir starting 'o-' are ours, 'r' references.
Writes <out-dir>/j<n>/<letter>.jpg and <out-dir>/key.txt (never shown to judges)."""
import os, random, shutil, sys
raw, out, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
files = sorted(f for f in os.listdir(raw) if f.endswith('.jpg'))
key = []
for j in range(1, n + 1):
    order = files[:]; random.Random(j * 7919).shuffle(order)
    d = os.path.join(out, f'j{j}'); os.makedirs(d, exist_ok=True)
    for i, f in enumerate(order):
        name = chr(65 + i) + '.jpg'; shutil.copy(os.path.join(raw, f), os.path.join(d, name))
        key.append(f'j{j} {name} {f}')
open(os.path.join(out, 'key.txt'), 'w').write('\n'.join(key) + '\n')
